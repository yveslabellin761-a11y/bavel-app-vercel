CREATE OR REPLACE FUNCTION public.fulfill_payment_order(order_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.payment_orders%ROWTYPE;
  wallet_table TEXT;
  subscription_tier TEXT;
  duration_days INTEGER;
  wallet_rows_updated INTEGER;
BEGIN
  SELECT * INTO order_row
  FROM public.payment_orders
  WHERE provider_reference = order_reference
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF order_row.status = 'paid' THEN
    RETURN TRUE;
  END IF;
  IF order_row.status <> 'pending' THEN
    RETURN FALSE;
  END IF;
  IF order_row.product_type NOT IN ('credits', 'subscription') THEN
    RAISE EXCEPTION 'Unsupported payment product type';
  END IF;

  IF order_row.product_type = 'credits' AND order_row.credits <= 0 THEN
    RAISE EXCEPTION 'Invalid credit purchase order';
  END IF;
  IF order_row.product_type = 'subscription' AND order_row.credits <> 0 THEN
    RAISE EXCEPTION 'Subscription orders cannot grant credits';
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid', paid_at = NOW(), updated_at = NOW()
  WHERE id = order_row.id;

  PERFORM public.apply_credit_change(
    order_row.user_id, order_row.credits,
    'payment:' || order_row.provider_reference,
    CASE WHEN order_row.product_type = 'credits' THEN 'credit_purchase' ELSE 'subscription_purchase' END,
    order_row.amount, order_row.currency,
    'Paiement Bavel confirmé'
  );

  IF order_row.product_type = 'subscription' THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'credits' AND c.relkind IN ('r', 'p')
    ) THEN 'credits' ELSE 'user_credits' END
    INTO wallet_table;

    SELECT
      CASE
        WHEN order_row.product_id LIKE 'extra_%' THEN 'extra'
        WHEN order_row.product_id LIKE 'premium_%' THEN 'premium'
        ELSE NULL
      END,
      CASE order_row.product_id
        WHEN 'extra_1week' THEN 7
        WHEN 'extra_1month' THEN 30
        WHEN 'extra_3months' THEN 90
        WHEN 'extra_6months' THEN 180
        WHEN 'premium_1day' THEN 1
        WHEN 'premium_1week' THEN 7
        WHEN 'premium_1month' THEN 30
        WHEN 'premium_3months' THEN 90
        WHEN 'premium_6months' THEN 180
        WHEN 'premium_lifetime' THEN NULL
        ELSE -1
      END
    INTO subscription_tier, duration_days;

    IF subscription_tier IS NULL OR duration_days = -1 THEN
      RAISE EXCEPTION 'Unknown subscription product';
    END IF;

    EXECUTE format(
      'UPDATE public.%I
       SET tier = $1,
           premium_expires_at = CASE
             WHEN $2::integer IS NULL THEN NULL
             WHEN tier = ''premium'' AND premium_expires_at IS NULL THEN NULL
             ELSE GREATEST(COALESCE(premium_expires_at, NOW()), NOW()) + make_interval(days => $2)
           END,
           updated_at = NOW()
       WHERE user_id::text = $3',
      wallet_table
    ) USING subscription_tier, duration_days, order_row.user_id::text;
    GET DIAGNOSTICS wallet_rows_updated = ROW_COUNT;
    IF wallet_rows_updated = 0 THEN
      RAISE EXCEPTION 'Subscription wallet could not be updated';
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_user_quest(p_user_id UUID, p_quest_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_amount INTEGER;
  eligible BOOLEAN := FALSE;
  completion_inserted INTEGER;
  current_balance INTEGER;
  reason_text TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required';
  END IF;

  CASE p_quest_id
    WHEN 'quest_photos' THEN reward_amount := 30;
    WHEN 'quest_bio' THEN reward_amount := 20;
    WHEN 'quest_first_swipe' THEN reward_amount := 25;
    ELSE RAISE EXCEPTION 'Unknown quest';
  END CASE;

  IF p_quest_id = 'quest_photos' THEN
    SELECT cardinality(array_remove(COALESCE(photos, ARRAY[]::TEXT[]), '')) >= 3
    INTO eligible
    FROM public.profiles
    WHERE id = p_user_id;
    reason_text := 'Ajoutez au moins 3 photos à votre profil avant de réclamer cette récompense.';
  ELSIF p_quest_id = 'quest_bio' THEN
    SELECT char_length(btrim(COALESCE(bio, ''))) >= 20
    INTO eligible
    FROM public.profiles
    WHERE id = p_user_id;
    reason_text := 'Rédigez une bio d’au moins 20 caractères avant de réclamer cette récompense.';
  ELSE
    SELECT count(*) >= 10
    INTO eligible
    FROM public.swipes
    WHERE user_id = p_user_id;
    reason_text := 'Effectuez au moins 10 swipes avant de réclamer cette récompense.';
  END IF;

  IF eligible IS DISTINCT FROM TRUE THEN
    IF EXISTS (
      SELECT 1 FROM public.user_quests
      WHERE user_id = p_user_id AND quest_id = p_quest_id
    ) THEN
      current_balance := public.apply_credit_change(
        p_user_id, reward_amount, 'quest:' || p_quest_id, 'quest_reward',
        reward_amount, 'CREDITS', 'Récompense de quête'
      );
      RETURN jsonb_build_object(
        'eligible', TRUE, 'completed', TRUE, 'alreadyCompleted', TRUE, 'balance', current_balance
      );
    END IF;
    RETURN jsonb_build_object('eligible', FALSE, 'reason', reason_text);
  END IF;

  INSERT INTO public.user_quests (user_id, quest_id)
  VALUES (p_user_id, p_quest_id)
  ON CONFLICT (user_id, quest_id) DO NOTHING;
  GET DIAGNOSTICS completion_inserted = ROW_COUNT;

  current_balance := public.apply_credit_change(
    p_user_id,
    reward_amount,
    'quest:' || p_quest_id,
    'quest_reward',
    reward_amount,
    'CREDITS',
    'Récompense de quête'
  );

  RETURN jsonb_build_object(
    'eligible', TRUE,
    'completed', TRUE,
    'alreadyCompleted', completion_inserted = 0,
    'balance', current_balance
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_payment_order(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_order(TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.complete_user_quest(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_quest(UUID, TEXT) TO service_role;
