CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'Stripe Purchase')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  insert into public.user_credits (user_id, balance, total_earned, updated_at)
  values (p_user_id, p_amount, p_amount, now())
  on conflict (user_id) do update
    set balance      = user_credits.balance      + p_amount,
        total_earned = user_credits.total_earned  + p_amount,
        updated_at   = now();

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (p_user_id, p_amount, p_reason);
END;
$function$;