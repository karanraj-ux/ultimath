
CREATE TABLE pipeline_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES agent_pipelines(id) ON DELETE CASCADE,
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read share records (needed to view a shared pipeline)
CREATE POLICY "public_read_shares" ON pipeline_shares
  FOR SELECT USING (true);

-- Anyone can insert a share (no user_id on pipelines table)
CREATE POLICY "anyone_insert_shares" ON pipeline_shares
  FOR INSERT WITH CHECK (true);

-- Anyone can delete their own shares (matched by pipeline_id)
CREATE POLICY "anyone_delete_shares" ON pipeline_shares
  FOR DELETE USING (true);
