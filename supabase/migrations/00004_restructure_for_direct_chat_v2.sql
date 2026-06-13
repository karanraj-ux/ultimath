-- Drop old tables that are no longer needed
DROP TABLE IF EXISTS persona_memories CASCADE;
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS personas CASCADE;

-- Recreate messages table with simplified structure
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  model text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contacts table for friends/anonymous
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('friend', 'anonymous')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create image_generations table
CREATE TABLE image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text NOT NULL,
  provider text NOT NULL DEFAULT 'nano_banana',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Update api_keys table to support more models
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_check;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_provider_check 
  CHECK (provider IN ('openai', 'gemini', 'groq', 'claude', 'nano_banana'));

-- Add model_name column to api_keys for specific model configurations
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS model_name text;

-- Create indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_image_generations_conversation ON image_generations(conversation_id);

-- Add foreign key for messages
ALTER TABLE messages ADD CONSTRAINT messages_conversation_fk 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo)
CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on image_generations" ON image_generations FOR ALL USING (true) WITH CHECK (true);