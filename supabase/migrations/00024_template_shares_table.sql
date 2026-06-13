
CREATE TABLE template_shares (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   text        NOT NULL,
  template_type text        NOT NULL CHECK (template_type IN ('builtin', 'user')),
  share_token   text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  pipeline_id   uuid        REFERENCES agent_pipelines(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE template_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_shares_read_all"   ON template_shares FOR SELECT USING (true);
CREATE POLICY "template_shares_insert_all" ON template_shares FOR INSERT WITH CHECK (true);
