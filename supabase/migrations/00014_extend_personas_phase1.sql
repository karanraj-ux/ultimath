
-- Add Phase 1 persona fields
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'friendly'
    CHECK (tone IN ('friendly','professional','blunt','playful','socratic')),
  ADD COLUMN IF NOT EXISTS emoji_avatar text DEFAULT '🤖',
  ADD COLUMN IF NOT EXISTS knowledge_domain text DEFAULT '',
  ADD COLUMN IF NOT EXISTS memory_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Public read policy (share by link, no auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'personas' AND policyname = 'public_read_personas'
  ) THEN
    ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "public_read_personas" ON public.personas
      FOR SELECT USING (is_public = true);
    CREATE POLICY "anon_insert_personas" ON public.personas
      FOR INSERT WITH CHECK (true);
    CREATE POLICY "anon_update_personas" ON public.personas
      FOR UPDATE USING (true);
    CREATE POLICY "anon_delete_personas" ON public.personas
      FOR DELETE USING (true);
  END IF;
END $$;
