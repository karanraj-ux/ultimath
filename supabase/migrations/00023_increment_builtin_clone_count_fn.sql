
CREATE OR REPLACE FUNCTION increment_builtin_clone_count(p_template_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO template_usage (template_id, clone_count, last_cloned_at)
  VALUES (p_template_id, 1, now())
  ON CONFLICT (template_id)
  DO UPDATE SET
    clone_count    = template_usage.clone_count + 1,
    last_cloned_at = now();
$$;
