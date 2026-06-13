-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'groq', 'claude')),
  key_encrypted TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personas table
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  personality_profile TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  emotional_state TEXT DEFAULT 'neutral' CHECK (emotional_state IN ('happy', 'angry', 'sad', 'neutral', 'excited', 'frustrated', 'trusting', 'suspicious')),
  ai_model TEXT NOT NULL CHECK (ai_model IN ('openai', 'gemini', 'groq', 'claude')),
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  persona_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'persona')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('text', 'image', 'gif', 'sticker', 'meme')),
  media_url TEXT,
  emotional_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona Memories table (links personas to memories with analysis)
CREATE TABLE persona_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id, memory_id)
);

-- Create indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_groups_user_id ON groups(user_id);
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_persona_memories_persona_id ON persona_memories(persona_id);

-- Function to generate unique 6-digit group code
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM groups WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;