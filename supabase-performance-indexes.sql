-- Additional Performance Indexes for Production
-- Run these in Supabase SQL Editor after deploying

-- Optimize persona lookups by username (used in constraint validation)
CREATE INDEX IF NOT EXISTS idx_personas_username ON personas(reddit_username);

-- Optimize recent scene lookups (used in 24h cooldown check)
CREATE INDEX IF NOT EXISTS idx_scenes_created_at ON narrative_scenes(created_at DESC);

-- Optimize subreddit filtering (used in constraint validation)
CREATE INDEX IF NOT EXISTS idx_scenes_subreddit ON narrative_scenes(target_subreddit);

-- Composite index for persona cooldown queries
CREATE INDEX IF NOT EXISTS idx_scenes_campaign_subreddit_created
  ON narrative_scenes(campaign_id, target_subreddit, created_at DESC);

-- Optimize scheduled post queries (for future posting scheduler)
CREATE INDEX IF NOT EXISTS idx_posts_scheduled
  ON reddit_posts(scheduled_time)
  WHERE status = 'scheduled';

-- Optimize persona ID lookups in reddit_posts
CREATE INDEX IF NOT EXISTS idx_posts_persona ON reddit_posts(persona_id);
