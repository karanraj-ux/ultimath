CREATE TABLE public.shared_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    views_count INTEGER NOT NULL DEFAULT 0,
    chats_count INTEGER NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE public.shared_tools ENABLE ROW LEVEL SECURITY;

-- Creator can manage their own shared tools
CREATE POLICY "Creators can manage their own shared tools"
    ON public.shared_tools
    FOR ALL
    TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Anyone can read active shared tools
CREATE POLICY "Anyone can read active shared tools"
    ON public.shared_tools
    FOR SELECT
    TO public
    USING (is_active = true);

-- Add a public view to easily fetch the tool + persona info together safely
CREATE VIEW public.public_tool_details AS
    SELECT 
        st.share_token,
        st.is_active,
        st.creator_id,
        p.id as persona_id,
        p.name as persona_name,
        p.description as persona_description,
        p.emoji_avatar as persona_avatar,
        p.ai_model as persona_model
    FROM public.shared_tools st
    JOIN public.personas p ON st.persona_id = p.id
    WHERE st.is_active = true;

GRANT SELECT ON public.public_tool_details TO public;
GRANT SELECT ON public.public_tool_details TO anon;
GRANT SELECT ON public.public_tool_details TO authenticated;
