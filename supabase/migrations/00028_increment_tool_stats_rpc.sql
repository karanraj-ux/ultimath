CREATE OR REPLACE FUNCTION public.increment_tool_chats(p_token TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.shared_tools
  SET chats_count = chats_count + 1
  WHERE share_token = p_token;
$$;