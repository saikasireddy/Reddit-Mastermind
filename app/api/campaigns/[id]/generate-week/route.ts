import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { draftConversation } from "@/lib/engines/conversation-drafter";
import { humanizeConversation } from "@/lib/engines/humanizer";
import { scoreConversation } from "@/lib/engines/quality-scorer";
import { validateSceneConstraints } from "@/lib/quality/constraints";

// Init Supabase with Service Role (Admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;

    // 1. Determine Week Number (Auto-Increment)
    // Find the highest week number currently in the DB
    const { data: latestScene } = await supabase
      .from("narrative_scenes")
      .select("week_number")
      .eq("campaign_id", campaignId)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    const currentWeek = (latestScene?.week_number || 0) + 1;

    // 2. Fetch Context
    const { data: campaign, error: campError } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    const { data: personas, error: personasError } = await supabase.from("personas").select("*").eq("campaign_id", campaignId);
    const { data: target } = await supabase.from("targets").select("*").eq("campaign_id", campaignId).single();

    if (!personas || personas.length < 2) return NextResponse.json({ error: "Need 2+ personas", debug: { campaignId, personas, personasError } }, { status: 400 });

    const angles = target?.narrative_angles || ["General discussion about tools"];

    // 3. Generate Scenes with Gating
    const validScenes = [];
    const rejectionLog: any[] = [];

    for (let i = 0; i < 2; i++) { // Generate 2 scenes per request
      const angle = angles[i % angles.length];

      try {
        // A. Draft
        const draft = await draftConversation(angle, personas, target?.subreddit || "r/productivity");

        // B. Validate Constraints (FAIL EARLY)
        const validation = await validateSceneConstraints(draft.script, target?.subreddit || "r/productivity", campaignId);
        if (!validation.passed) {
          console.warn(`❌ Constraint Violation [${angle}]:`, validation.violations);
          rejectionLog.push({ angle, reason: 'constraint_violation', violations: validation.violations });
          continue; // Skip this scene
        }

        // C. Humanize
        const finalScene = await humanizeConversation(draft.script, personas);

        // D. Score (FAIL LOW QUALITY)
        const realScore = await scoreConversation(finalScene, target?.subreddit || "r/productivity");

        if (realScore < 6) {
          console.warn(`❌ Low Quality Rejected [Score: ${realScore}]: ${angle}`);
          rejectionLog.push({ angle, reason: 'low_quality', score: realScore });
          continue; // Skip low quality
        }

        console.log(`✅ Scene Approved [Score: ${realScore}]: ${angle}`);

        validScenes.push({
          campaign_id: campaignId,
          week_number: currentWeek,
          target_subreddit: target?.subreddit || "r/productivity",
          narrative_angle: angle,
          quality_score: realScore,
          status: "draft",
          scheduled_at: new Date(Date.now() + 86400000 * (i + 1) + (currentWeek * 7 * 86400000)).toISOString(), // Future dating by week
          content_json: finalScene
        });

      } catch (error: any) {
        console.error(`Error generating scene for angle "${angle}":`, error);
        rejectionLog.push({ angle, reason: 'generation_error', error: error.message });
      }
    }

    // 4. Save Valid Scenes
    for (const scene of validScenes) {
      const { data: savedScene } = await supabase.from("narrative_scenes").insert({
        campaign_id: scene.campaign_id,
        week_number: scene.week_number,
        target_subreddit: scene.target_subreddit,
        narrative_angle: scene.narrative_angle,
        quality_score: scene.quality_score,
        status: scene.status,
        scheduled_at: scene.scheduled_at
      }).select().single();

      if (savedScene && scene.content_json?.script) {
        const posts = scene.content_json.script.map((turn: any, i: number) => ({
          scene_id: savedScene.id,
          persona_id: personas.find((p: any) => p.reddit_username === turn.actor)?.id,
          content: turn.text,
          post_type: i === 0 ? "post" : "comment",
          delay_minutes: (i * 15) + 5
        }));
        await supabase.from("reddit_posts").insert(posts);
      } else if (savedScene) {
        console.error("Scene missing script:", JSON.stringify(scene.content_json, null, 2));
      }
    }

    return NextResponse.json({
      success: true,
      week: currentWeek,
      scenes: validScenes.length,
      rejected: rejectionLog.length,
      rejectionReasons: rejectionLog
    });

  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
