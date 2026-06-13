CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- If no record exists, they effectively have 0 balance
    RETURN FALSE;
  END IF;

  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct
  UPDATE public.user_credits
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (p_user_id, -p_amount, p_reason);

  RETURN TRUE;
END;
$$;