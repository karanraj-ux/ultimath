-- Create personas table
CREATE TABLE IF NOT EXISTS personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  personality_profile text NOT NULL,
  system_prompt text NOT NULL,
  emotional_state text NOT NULL DEFAULT 'neutral',
  ai_model text NOT NULL,
  avatar_url text,
  is_public boolean DEFAULT false,
  prompt_core_personality text,
  prompt_contextual_behavior text,
  prompt_knowledge_domain text,
  prompt_interaction_style text,
  prompt_memory_integration text,
  prompt_emotional_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  persona_ids text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create group_messages table for group chat
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  sender_id text,
  sender_type text NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  emotional_state text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rename existing messages to solo_messages
ALTER TABLE messages RENAME TO solo_messages;

-- Update solo_messages structure if needed
ALTER TABLE solo_messages DROP COLUMN IF EXISTS topic;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS extension;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS payload;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS event;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS private;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS updated_at;
ALTER TABLE solo_messages DROP COLUMN IF EXISTS inserted_at;

-- Create memory_entries table
CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  persona_id uuid,
  group_id uuid,
  content text NOT NULL,
  context text,
  importance_score integer DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  core_personality text,
  contextual_behavior text,
  knowledge_domain text,
  interaction_style text,
  memory_integration text,
  emotional_response text,
  is_public boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_personas_created ON personas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_conversation ON memory_entries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_persona ON memory_entries(persona_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_group ON memory_entries(group_id);

-- Enable RLS
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow all on personas" ON personas;
DROP POLICY IF EXISTS "Allow all on groups" ON groups;
DROP POLICY IF EXISTS "Allow all on group_messages" ON group_messages;
DROP POLICY IF EXISTS "Allow all on memory_entries" ON memory_entries;
DROP POLICY IF EXISTS "Allow all on prompt_templates" ON prompt_templates;

CREATE POLICY "Allow all on personas" ON personas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on group_messages" ON group_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on memory_entries" ON memory_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prompt_templates" ON prompt_templates FOR ALL USING (true) WITH CHECK (true);