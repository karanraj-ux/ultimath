-- Phase 3: persona usage stats table
CREATE TABLE persona_stats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id  uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('view', 'chat_start', 'message_sent')),
  session_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast lookups per persona
CREATE INDEX persona_stats_persona_id_idx ON persona_stats (persona_id);
CREATE INDEX persona_stats_event_type_idx ON persona_stats (persona_id, event_type);

-- Derived view for creator dashboard
CREATE VIEW persona_stat_summary AS
SELECT
  p.id AS persona_id,
  p.name,
  p.emoji_avatar,
  p.is_public,
  p.created_at,
  COUNT(CASE WHEN ps.event_type = 'view'         THEN 1 END) AS total_views,
  COUNT(CASE WHEN ps.event_type = 'chat_start'   THEN 1 END) AS total_chats,
  COUNT(CASE WHEN ps.event_type = 'message_sent' THEN 1 END) AS total_messages,
  COUNT(DISTINCT ps.session_id)                               AS unique_visitors
FROM personas p
LEFT JOIN persona_stats ps ON ps.persona_id = p.id
GROUP BY p.id, p.name, p.emoji_avatar, p.is_public, p.created_at;

-- Add personality_traits jsonb column for sliders
ALTER TABLE personas ADD COLUMN IF NOT EXISTS personality_traits jsonb DEFAULT '{}'::jsonb;

-- RLS: open read on persona_stats for dashboard queries
ALTER TABLE persona_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert stats"
  ON persona_stats FOR INSERT WITH CHECK (true);

CREATE POLICY "anyone can read stats"
  ON persona_stats FOR SELECT USING (true);
