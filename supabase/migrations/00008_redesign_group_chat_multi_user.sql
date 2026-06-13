-- Drop old group-related tables and recreate with new schema
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Groups table: Multi-user discussion rooms with ONE AI assistant
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  join_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  
  -- AI Configuration
  ai_model text NOT NULL DEFAULT 'gpt-4o-mini',
  ai_persona_name text NOT NULL DEFAULT 'Assistant',
  ai_system_prompt text NOT NULL,
  ai_prompt_core_personality text,
  ai_prompt_contextual_behavior text,
  ai_prompt_knowledge_domain text,
  ai_prompt_interaction_style text,
  ai_prompt_memory_integration text,
  ai_prompt_emotional_response text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group members: Users who have joined the group
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  display_name text NOT NULL,
  is_anonymous boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group messages: Messages from users and AI
CREATE TABLE group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id uuid, -- NULL for anonymous users
  sender_name text NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'ai')),
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id, created_at);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_groups_join_code ON groups(join_code);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;

-- RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Groups: Anyone can read, authenticated users can create
CREATE POLICY "Anyone can read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creators can update their groups" ON groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Creators can delete their groups" ON groups FOR DELETE USING (created_by = auth.uid());

-- Group members: Anyone can read, anyone can join
CREATE POLICY "Anyone can read group members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join groups" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- Group messages: Anyone can read and send messages
CREATE POLICY "Anyone can read group messages" ON group_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON group_messages FOR INSERT WITH CHECK (true);