
-- Add missing columns to agent_pipelines
ALTER TABLE agent_pipelines
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS emoji text DEFAULT '🔧',
  ADD COLUMN IF NOT EXISTS clone_count integer DEFAULT 0 NOT NULL;

-- template_ratings: anonymous star ratings for both builtin and user templates
CREATE TABLE template_ratings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      text NOT NULL,
  template_type    text NOT NULL CHECK (template_type IN ('builtin','user')),
  user_fingerprint text NOT NULL,
  rating           integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (template_id, user_fingerprint)
);

-- template_usage: clone counts for builtin templates
CREATE TABLE template_usage (
  template_id     text PRIMARY KEY,
  clone_count     integer DEFAULT 0 NOT NULL,
  last_cloned_at  timestamptz DEFAULT now()
);

-- Seed builtin template usage rows so they exist for upsert
INSERT INTO template_usage (template_id, clone_count)
VALUES
  ('research-report', 0),
  ('blog-post',       0),
  ('code-review',     0),
  ('market-analysis', 0),
  ('press-release',   0),
  ('bug-report-triage', 0);

-- RLS: anyone can read ratings/usage, authenticated can upsert ratings
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_read_all"   ON template_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_all" ON template_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "ratings_update_all" ON template_ratings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "usage_read_all"   ON template_usage FOR SELECT USING (true);
CREATE POLICY "usage_update_all" ON template_usage FOR UPDATE USING (true) WITH CHECK (true);
