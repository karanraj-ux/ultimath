
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns void
language sql
security definer
as $$
  insert into public.user_credits (user_id, balance, total_earned, updated_at)
  values (p_user_id, p_amount, p_amount, now())
  on conflict (user_id) do update
    set balance      = user_credits.balance      + p_amount,
        total_earned = user_credits.total_earned  + p_amount,
        updated_at   = now();
$$;
