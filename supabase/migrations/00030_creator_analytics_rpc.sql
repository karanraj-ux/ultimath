CREATE OR REPLACE FUNCTION public.get_creator_analytics(p_creator_id uuid, p_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1) * interval '1 day',
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day_date
  ),
  creator_personas AS (
    SELECT id FROM public.personas WHERE creator_id = p_creator_id
  ),
  daily_stats AS (
    SELECT
      d.day_date,
      COUNT(CASE WHEN ps.event_type = 'view' THEN 1 END) AS views,
      COUNT(CASE WHEN ps.event_type = 'chat_start' THEN 1 END) AS chats,
      COUNT(CASE WHEN ps.event_type = 'message_sent' THEN 1 END) AS messages
    FROM date_series d
    LEFT JOIN public.persona_stats ps
      ON ps.created_at::date = d.day_date
      AND ps.persona_id IN (SELECT id FROM creator_personas)
    GROUP BY d.day_date
  )
  SELECT json_agg(
    json_build_object(
      'date', to_char(day_date, 'YYYY-MM-DD'),
      'views', views,
      'chats', chats,
      'messages', messages
    ) ORDER BY day_date ASC
  ) INTO v_result
  FROM daily_stats;

  -- Return empty array instead of null if no data
  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;