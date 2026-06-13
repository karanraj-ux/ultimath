-- Shared chats table for public read-only conversation sharing
CREATE TABLE shared_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  views_count integer DEFAULT 0
);

CREATE INDEX idx_shared_chats_slug ON shared_chats(slug);
CREATE INDEX idx_shared_chats_conversation_id ON shared_chats(conversation_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shared_chats;

-- RLS Policies
ALTER TABLE shared_chats ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared chats
CREATE POLICY "Anyone can read shared chats" ON shared_chats FOR SELECT USING (true);

-- Authenticated users can create shared chats
CREATE POLICY "Authenticated users can create shared chats" ON shared_chats FOR INSERT TO authenticated WITH CHECK (true);

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug text;
  slug_exists boolean;
BEGIN
  LOOP
    -- Generate 8-character random slug
    new_slug := substring(md5(random()::text || clock_timestamp()::text) from 1 for 8);
    
    -- Check if slug exists
    SELECT EXISTS(SELECT 1 FROM shared_chats WHERE slug = new_slug) INTO slug_exists;
    
    -- Exit loop if slug is unique
    EXIT WHEN NOT slug_exists;
  END LOOP;
  
  RETURN new_slug;
END;
$$;