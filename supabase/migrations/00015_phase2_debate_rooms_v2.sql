
-- 1. Extend groups table for Phase 2
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS topic text DEFAULT '',
  ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'public'
    CHECK (room_type IN ('public','semi-private','private')),
  ADD COLUMN IF NOT EXISTS persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_link_enabled boolean NOT NULL DEFAULT true;

-- 2. Extend group_messages for anonymous/session identity
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS sender_session_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;

-- 3. Create verdicts table (immutable by design — no updated_at)
CREATE TABLE public.verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  verdict_text text NOT NULL,
  verdict_status text NOT NULL DEFAULT 'unverifiable'
    CHECK (verdict_status IN ('verified','disputed','unverifiable')),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_by text NOT NULL DEFAULT 'Anonymous',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable Realtime for verdicts only (group_messages already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.verdicts;

-- 5. Open RLS policies (no auth, fully public)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verdicts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='groups' AND policyname='public_read_groups') THEN
    CREATE POLICY "public_read_groups" ON public.groups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='groups' AND policyname='public_insert_groups') THEN
    CREATE POLICY "public_insert_groups" ON public.groups FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='groups' AND policyname='public_update_groups') THEN
    CREATE POLICY "public_update_groups" ON public.groups FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_messages' AND policyname='public_read_group_messages') THEN
    CREATE POLICY "public_read_group_messages" ON public.group_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_messages' AND policyname='public_insert_group_messages') THEN
    CREATE POLICY "public_insert_group_messages" ON public.group_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE POLICY "public_read_verdicts" ON public.verdicts FOR SELECT USING (true);
CREATE POLICY "public_insert_verdicts" ON public.verdicts FOR INSERT WITH CHECK (true);
