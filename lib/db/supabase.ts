import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side client with service role (for admin operations)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Database query helpers
export async function getCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error) throw new Error(`Failed to fetch campaign: ${error.message}`);
  return data;
}

export async function getPersonas(campaignId: string) {
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) throw new Error(`Failed to fetch personas: ${error.message}`);
  return data;
}

export async function getTargets(campaignId: string) {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) throw new Error(`Failed to fetch targets: ${error.message}`);
  return data;
}

export async function saveScene(sceneData: {
  campaign_id: string;
  week_number: number;
  target_subreddit: string;
  narrative_angle: string;
  quality_score: number;
  status: string;
}) {
  const { data, error } = await supabase
    .from("narrative_scenes")
    .insert(sceneData)
    .select()
    .single();

  if (error) throw new Error(`Failed to save scene: ${error.message}`);
  return data;
}

export async function savePost(postData: {
  scene_id: string;
  persona_id: string;
  content: string;
  post_type: string;
  parent_post_id?: string | null;
  delay_minutes: number;
}) {
  const { data, error } = await supabase
    .from("reddit_posts")
    .insert(postData)
    .select()
    .single();

  if (error) throw new Error(`Failed to save post: ${error.message}`);
  return data;
}
