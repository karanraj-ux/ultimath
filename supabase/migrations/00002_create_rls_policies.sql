-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_memories ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION can_select_api_keys(key_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = key_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_modify_api_keys(key_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = key_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_select_personas(persona_user_id UUID, is_public BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = persona_user_id OR is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_modify_personas(persona_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = persona_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_select_groups(group_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = group_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_modify_groups(group_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = group_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_select_messages(msg_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM groups WHERE id = msg_group_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_insert_messages(msg_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM groups WHERE id = msg_group_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_select_memories(memory_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = memory_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_modify_memories(memory_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = memory_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- API Keys policies
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (can_select_api_keys(user_id));

CREATE POLICY "Users can insert their own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (can_modify_api_keys(user_id));

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (can_modify_api_keys(user_id));

CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (can_modify_api_keys(user_id));

-- Personas policies
CREATE POLICY "Users can view their own and public personas"
  ON personas FOR SELECT
  TO authenticated
  USING (can_select_personas(user_id, is_public));

CREATE POLICY "Users can insert their own personas"
  ON personas FOR INSERT
  TO authenticated
  WITH CHECK (can_modify_personas(user_id));

CREATE POLICY "Users can update their own personas"
  ON personas FOR UPDATE
  TO authenticated
  USING (can_modify_personas(user_id));

CREATE POLICY "Users can delete their own personas"
  ON personas FOR DELETE
  TO authenticated
  USING (can_modify_personas(user_id));

-- Groups policies
CREATE POLICY "Users can view their own groups"
  ON groups FOR SELECT
  TO authenticated
  USING (can_select_groups(user_id));

CREATE POLICY "Users can insert their own groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (can_modify_groups(user_id));

CREATE POLICY "Users can update their own groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (can_modify_groups(user_id));

CREATE POLICY "Users can delete their own groups"
  ON groups FOR DELETE
  TO authenticated
  USING (can_modify_groups(user_id));

-- Messages policies
CREATE POLICY "Users can view messages in their groups"
  ON messages FOR SELECT
  TO authenticated
  USING (can_select_messages(group_id));

CREATE POLICY "Users can insert messages in their groups"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (can_insert_messages(group_id));

-- Memories policies
CREATE POLICY "Users can view their own memories"
  ON memories FOR SELECT
  TO authenticated
  USING (can_select_memories(user_id));

CREATE POLICY "Users can insert their own memories"
  ON memories FOR INSERT
  TO authenticated
  WITH CHECK (can_modify_memories(user_id));

CREATE POLICY "Users can delete their own memories"
  ON memories FOR DELETE
  TO authenticated
  USING (can_modify_memories(user_id));

-- Persona Memories policies
CREATE POLICY "Users can view persona memories for their personas"
  ON persona_memories FOR SELECT
  TO authenticated
  USING (EXISTS(
    SELECT 1 FROM personas WHERE id = persona_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert persona memories for their personas"
  ON persona_memories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS(
    SELECT 1 FROM personas WHERE id = persona_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete persona memories for their personas"
  ON persona_memories FOR DELETE
  TO authenticated
  USING (EXISTS(
    SELECT 1 FROM personas WHERE id = persona_id AND user_id = auth.uid()
  ));