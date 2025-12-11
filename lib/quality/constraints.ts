import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ValidationResult {
  passed: boolean;
  violations: string[];
}

export async function validateSceneConstraints(
  sceneScript: any,
  subreddit: string,
  campaignId: string
): Promise<ValidationResult> {
  const violations: string[] = [];

  // Handle both script object and direct array
  const script = Array.isArray(sceneScript) ? sceneScript : sceneScript.script || [];

  // 1. Turn Limit Check (Don't let threads drag on)
  if (script.length > 5) {
    violations.push(`Thread too long (${script.length} comments). Max is 5.`);
  }

  // 2. Persona Cooldown Check (Prevent spamming)
  // Check if any actor posted in this subreddit in the last 24h
  const actors = new Set(script.map((s: any) => s.actor));

  for (const actor of Array.from(actors)) {
    // Find the persona ID
    const { data: persona } = await supabase
      .from("personas")
      .select("id")
      .eq("reddit_username", actor)
      .single();

    if (persona) {
      // Check last 24h posts in this subreddit
      const { data: recentScenes } = await supabase
        .from("narrative_scenes")
        .select(`
          id,
          created_at,
          reddit_posts!inner(persona_id)
        `)
        .eq("campaign_id", campaignId)
        .eq("target_subreddit", subreddit)
        .eq("reddit_posts.persona_id", persona.id)
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentScenes && recentScenes.length > 0) {
        const hoursAgo = Math.floor((Date.now() - new Date(recentScenes[0].created_at).getTime()) / (1000 * 60 * 60));
        violations.push(`Persona ${actor} posted in ${subreddit} ${hoursAgo}h ago (24h cooldown required).`);
      }
    }
  }

  // 3. Duplicate Actor Check (A -> A pattern - self-replies)
  for (let i = 1; i < script.length; i++) {
    if (script[i].actor === script[i-1].actor) {
      violations.push(`Actor ${script[i].actor} replied to themselves at index ${i}.`);
    }
  }

  // 4. Same Persona Back-and-Forth Check (A->B->A->B->A pattern)
  if (script.length >= 4) {
    for (let i = 3; i < script.length; i++) {
      const actor1 = script[i-3].actor;
      const actor2 = script[i-2].actor;
      const actor3 = script[i-1].actor;
      const actor4 = script[i].actor;

      if (actor1 === actor3 && actor2 === actor4 && actor1 !== actor2) {
        violations.push(`Awkward back-and-forth detected: ${actor1} <-> ${actor2} repeated pattern.`);
        break; // Only report once
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
}
