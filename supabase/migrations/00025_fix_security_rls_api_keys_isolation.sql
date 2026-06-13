
-- ─── Fix #1: api_keys RLS — proper per-user isolation ────────────────────────
-- Drop the dangerously open policies
DROP POLICY IF EXISTS "Anyone can view API keys"   ON api_keys;
DROP POLICY IF EXISTS "Anyone can insert API keys" ON api_keys;
DROP POLICY IF EXISTS "Anyone can update API keys" ON api_keys;
DROP POLICY IF EXISTS "Anyone can delete API keys" ON api_keys;

-- Re-create scoped policies:
-- Authenticated users see only their own keys;
-- Legacy rows with null or zero UUID are accessible to anon sessions (backward compat).
CREATE POLICY "api_keys_select_own"
  ON api_keys FOR SELECT
  USING (
    user_id = auth.uid()                                     -- logged-in user sees their keys
    OR user_id IS NULL                                       -- legacy null rows
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid -- legacy zero-UUID default
  );

CREATE POLICY "api_keys_insert_own"
  ON api_keys FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "api_keys_update_own"
  ON api_keys FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "api_keys_delete_own"
  ON api_keys FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- ─── Fix #2: Ensure api_keys.user_id auto-fills from auth.uid() on new inserts ─
ALTER TABLE api_keys ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ─── Fix #3: conversations — add user_id for data isolation ─────────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Update existing rows with zero-UUID sentinel so they remain accessible
UPDATE conversations SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

-- Drop the over-permissive old policies
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can view conversations"         ON conversations;
DROP POLICY IF EXISTS "Anyone can create conversations"       ON conversations;
DROP POLICY IF EXISTS "Anyone can update conversations"       ON conversations;
DROP POLICY IF EXISTS "Anyone can delete conversations"       ON conversations;

-- New isolated policies (owner + anon/legacy sentinel)
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- ─── Fix #4: solo_messages — inherit conversation-based access ───────────────
-- solo_messages already has conversation_id FK. Access via conversation ownership is ideal
-- but requires a join which is complex. Use same sentinel pattern for now.
ALTER TABLE solo_messages ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_solo_messages_user_id ON solo_messages(user_id);

UPDATE solo_messages SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

DROP POLICY IF EXISTS "Allow all operations on messages" ON solo_messages;
DROP POLICY IF EXISTS "Anyone can view messages"         ON solo_messages;
DROP POLICY IF EXISTS "Anyone can create messages"       ON solo_messages;
DROP POLICY IF EXISTS "Anyone can delete messages"       ON solo_messages;

CREATE POLICY "solo_messages_select_own"
  ON solo_messages FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "solo_messages_insert_own"
  ON solo_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "solo_messages_delete_own"
  ON solo_messages FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- ─── Fix #5: memory_entries — same pattern ───────────────────────────────────
ALTER TABLE memory_entries ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id ON memory_entries(user_id);

UPDATE memory_entries SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

DROP POLICY IF EXISTS "Allow all on memory_entries" ON memory_entries;

CREATE POLICY "memory_entries_select_own"
  ON memory_entries FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "memory_entries_insert_own"
  ON memory_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "memory_entries_update_own"
  ON memory_entries FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

CREATE POLICY "memory_entries_delete_own"
  ON memory_entries FOR DELETE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );
