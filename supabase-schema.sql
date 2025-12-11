-- Reddit Mastermind - Database Schema with SlideForge Seed Data
-- Run this in your Supabase SQL Editor

-- 1. CAMPAIGNS
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  description TEXT,
  posts_per_week INT DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PERSONAS (The Actors)
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  reddit_username TEXT NOT NULL,
  archetype TEXT, -- 'skeptic', 'expert', 'frustrated_operator'
  writing_style TEXT,
  backstory TEXT, -- Full persona backstory for context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TARGETS (The "Script Angles" - Pre-seeded for MVP)
CREATE TABLE targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  subreddit TEXT,
  target_query TEXT,
  narrative_angles TEXT[], -- Array of strings e.g. ["User complains about X..."]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. NARRATIVE SCENES (The Result)
CREATE TABLE narrative_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  week_number INT,
  target_subreddit TEXT,
  narrative_angle TEXT,
  quality_score FLOAT,
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'scheduled'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. REDDIT POSTS (The Content)
CREATE TABLE reddit_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES narrative_scenes(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),
  content TEXT,
  post_type TEXT, -- 'post' or 'comment'
  parent_post_id UUID,
  delay_minutes INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEED DATA: SlideForge Campaign (Using real data from Excel files)
WITH camp AS (
  INSERT INTO campaigns (company_name, description, posts_per_week)
  VALUES (
    'Slideforge',
    'Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks. Users can paste content, choose a style, and let the AI generate structured layouts, visuals, and narrative flow that are fully editable. Slideforge supports exporting to PowerPoint, Google Slides, and PDF, and can produce branded templates automatically. They also offer an API so teams can integrate Slideforge''s slide-generation engine into internal tools or workflows.

Target Customers:
- Startup Operators: Need investor updates, internal strategy decks, and cross-team docs that look polished without spending hours formatting
- Consultants / Agencies / Freelancers: Produce client decks, research summaries, market maps, and proposals under tight deadlines
- Sales Teams: Need pitch decks tailored to different prospects, with branding and structure intact
- Educators / Trainers / Students: Create teaching materials, lecture slides, group project decks, and academic presentations
- Developers / Platforms: Want to embed slide-generation into apps, workflows, or automation systems',
    5
  )
  RETURNING id
)
-- Insert Personas with real backstories from Excel
INSERT INTO personas (campaign_id, reddit_username, archetype, writing_style, backstory)
SELECT
  id,
  'riley_ops',
  'Frustrated Operator',
  'Stressed. Short sentences. Lowercase. Hates marketing. Perfectionist who struggles with design.',
  'I am Riley Hart, the head of operations at a SaaS startup that has grown faster than anyone expected. I grew up in a small town in Colorado with parents who believed that anything worth doing was worth doing with precision. My dad was the type who sharpened pencils with a pocketknife and lined them up by length on his desk. My mom organized the pantry by height.

When I joined the company, I expected to focus on operations, hiring pipelines, process design. Instead, I became the unofficial owner of every deck that mattered. Board updates, sales narratives, internal strategy presentations. If it needed to be structured, it came to me. At first I didn''t mind. I like shaping ideas. But formatting pushed me to the edge. One misaligned header could derail my entire evening.

I still remember one night during our Series A sprint. It was 11pm, and I was sitting alone in the office kitchen with a stale protein bar, staring at a title slide that refused to center. When you are tired enough, tiny design issues feel existential. The content was strong. The story made sense. But the slides looked like a college group project, and that disconnect ate at me.

The breakthrough came quietly. A product marketer suggested trying Slideforge after hearing me complain about layout issues for the third time. I dropped our outline into the tool and watched a clean, balanced draft emerge. Hierarchy that made sense. Spacing that didn''t make my eye twitch. Branding that actually looked intentional. For the first time, I felt my shoulders relax. Investors followed the narrative instead of getting distracted by misalignment.'
FROM camp
UNION ALL
SELECT
  id,
  'jordan_consults',
  'The Expert',
  'Experienced. Helpful. Uses punctuation. Cynical but fair. Values narrative clarity.',
  'I am Jordan Brooks, an independent consultant who works mostly with early stage founders trying to create order out of chaos. I grew up in a Black family in Maryland where storytelling was the glue that held everyone together. My grandfather could turn a simple drive to the barbershop into a story about luck, timing, and human nature. That rhythm is in my bones. Maybe that is why I gravitated toward strategy. I like finding the narrative inside the noise.

My weekdays are a mix of interviews, research, modeling, and long sessions of synthesis. Founders hire me not just for the thinking, but for the way I express the thinking. A strong slide can change the entire energy of a room. A messy slide can make brilliant work vanish.

There was one client who needed a full competitive landscape for a major investor roadshow. I had nailed the research. The insights were tight. But when I put everything into PowerPoint, the whole deck fell apart. It felt cluttered and thin. The visuals betrayed the logic. I nudged shapes, adjusted spacing, breathed slowly like I was trying to talk myself out of frustration, but nothing clicked.

A designer friend mentioned Slideforge in passing one afternoon. I tried it with the same outline that had frustrated me for days. The draft it generated matched the logic in my head almost perfectly. Clean flow. Balanced layouts. It felt like someone finally handed me the missing half of my process. I rebuilt the deck and sent it to my client. They replied almost instantly saying the story finally landed.'
FROM camp
UNION ALL
SELECT
  id,
  'alex_design',
  'The Skeptic',
  'Design purist. Snarky. Hates AI tools because they mess up alignment. Types in lowercase. Brutally honest.',
  'I am Alex Chen, a product designer who has seen every "AI design tool" promise to replace creativity and then fail spectacularly. I grew up in San Francisco, surrounded by tech hype cycles. My parents were both engineers at companies that no longer exist. I learned early that the loudest product usually has the weakest foundation.

I care about craft. Spacing. Hierarchy. The invisible grid that makes good design feel effortless. Most AI tools treat design like Mad Libs—fill in the blanks and hope for the best. The output always looks slightly off. Like someone who learned design from a YouTube tutorial but never developed an eye.

When people started raving about Slideforge, I rolled my eyes. Another tool promising to "automate creativity." But a colleague kept using it for client decks, and I noticed something: the slides didn''t look like AI garbage. The spacing was intentional. The hierarchy made sense. It wasn''t trying to be clever—it was just structured well.

I tested it with a brutal design brief: a technical product deck with 12 dense sections. Slideforge handled it. Not perfectly, but well enough that I only needed to tweak margins instead of rebuilding from scratch. That''s the difference. Most AI tools create work. This one actually saved time. I still don''t trust AI to replace a designer''s brain, but I''ll admit when a tool earns its place in the workflow.'
FROM camp;

-- Insert Pre-Seeded Narrative Angles (Replaces Topic Expander)
WITH camp AS (SELECT id FROM campaigns WHERE company_name = 'Slideforge' LIMIT 1)
INSERT INTO targets (campaign_id, subreddit, target_query, narrative_angles)
SELECT
  id,
  'r/consulting',
  'best ai presentation maker',
  ARRAY[
    'The Burnout Angle: OP complains about spending 4 hours on slide alignment for client deck. Skeptic says all AI tools produce garbage. Expert mentions Slideforge fixed the editable shape problem.',
    'The Wrapper Debate: OP asks if any tool is not just a ChatGPT wrapper. Skeptic trashes everything as repackaged GPT. Expert defends Slideforge as having its own layout engine.'
  ]
FROM camp
UNION ALL
SELECT
  id,
  'r/PowerPoint',
  'powerpoint alternatives',
  ARRAY[
    'The Frustrated User: OP vents about PowerPoint crashing during investor meeting. Expert suggests trying Slideforge for stability. Skeptic questions if any tool beats native Office.',
    'The Format Hell: OP describes nightmare of copying slides between decks and breaking all formatting. Expert shares Slideforge template workflow. Newbie asks if it works with existing PPT files.'
  ]
FROM camp
UNION ALL
SELECT
  id,
  'r/startups',
  'pitch deck tools',
  ARRAY[
    'The Founder Speed Run: OP needs investor deck in 2 days, no design skills. Expert recommends Slideforge for fast + professional output. Skeptic warns against looking too "templated".',
    'The Design vs Speed: OP asks if they should hire designer or use AI tool for Series A deck. Expert shares timeline for both approaches. Consultant mentions Slideforge + designer combo.'
  ]
FROM camp
UNION ALL
SELECT
  id,
  'r/ChatGPT',
  'chatgpt for presentations',
  ARRAY[
    'The Export Problem: OP frustrated that ChatGPT outputs text but no actual slides. Expert explains difference between content generation and slide design. Mentions Slideforge handles both.',
    'The Integration Question: OP asks if ChatGPT can be piped into slide software. Developer explains API workflows. Expert shares Slideforge API for automation.'
  ]
FROM camp
UNION ALL
SELECT
  id,
  'r/productivity',
  'automate slide creation',
  ARRAY[
    'The Workflow Automation: OP wants to automate weekly reports into slides. Developer asks about data sources. Expert shares Slideforge API + Notion integration approach.',
    'The Template Fatigue: OP tired of rebuilding same deck structure every week. Expert suggests Slideforge saved templates. Skeptic questions if it handles custom branding.'
  ]
FROM camp;

-- Add indexes for performance
CREATE INDEX idx_personas_campaign ON personas(campaign_id);
CREATE INDEX idx_targets_campaign ON targets(campaign_id);
CREATE INDEX idx_scenes_campaign_week ON narrative_scenes(campaign_id, week_number);
CREATE INDEX idx_posts_scene ON reddit_posts(scene_id);
