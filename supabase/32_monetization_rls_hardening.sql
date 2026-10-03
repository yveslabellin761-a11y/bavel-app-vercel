DO $$
DECLARE
  credits_kind "char";
  wallet_kind "char";
BEGIN
  SELECT c.relkind INTO credits_kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'credits';
  SELECT c.relkind INTO wallet_kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'user_credits';

  IF credits_kind IN ('r', 'p') THEN
    ALTER TABLE public.credits
      ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'freemium',
      ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
  ELSIF credits_kind IS NULL AND wallet_kind IN ('r', 'p') THEN
    EXECUTE 'CREATE VIEW public.credits WITH (security_invoker = true) AS SELECT id, user_id, balance, tier, premium_expires_at, updated_at FROM public.user_credits';
  ELSE
    RAISE EXCEPTION 'No supported credits wallet table exists';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mobile_money')),
  provider_reference TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  product_type TEXT NOT NULL CHECK (product_type IN ('credits', 'subscription', 'boost')),
  product_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON public.payment_orders(status);

CREATE TABLE IF NOT EXISTS public.credit_operations (
  user_id TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  operation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, reference_id)
);

DO $$
DECLARE
  target_table TEXT;
  existing_policy RECORD;
  relation_kind "char";
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'credits',
    'user_credits',
    'credit_operations',
    'transactions',
    'payments',
    'payment_orders',
    'subscriptions',
    'super_like_quotas',
    'user_inventory',
    'promo_code_redemptions',
    'auth_passkeys',
    'passkey_challenges',
    'verification_requests',
    'user_sanctions',
    'private_media_cleanup_queue'
  ]
  LOOP
    SELECT c.relkind INTO relation_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = target_table;

    IF relation_kind IN ('r', 'p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', target_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', target_table);

      FOR existing_policy IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = target_table
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, target_table);
      END LOOP;
    END IF;
    relation_kind := NULL;
  END LOOP;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
  relation_kind "char";
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'credits',
    'user_credits',
    'transactions',
    'payments',
    'payment_orders',
    'subscriptions',
    'super_like_quotas',
    'user_inventory',
    'promo_code_redemptions'
  ]
  LOOP
    SELECT c.relkind INTO relation_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = target_table;

    IF relation_kind IN ('r', 'p') AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'user_id'
    ) THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', target_table);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text)',
        target_table || '_read_own',
        target_table
      );
    END IF;
    relation_kind := NULL;
  END LOOP;
END;
$$;

DO $$
DECLARE
  relation_kind "char";
BEGIN
  SELECT c.relkind INTO relation_kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'credits';
  IF relation_kind = 'v' THEN
    GRANT SELECT ON TABLE public.credits TO authenticated;
  END IF;
END;
$$;

GRANT SELECT ON TABLE public.credit_operations TO service_role;
REVOKE ALL ON TABLE public.credit_operations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_credit_change(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference_id TEXT,
  p_operation_type TEXT,
  p_transaction_amount INTEGER,
  p_currency TEXT,
  p_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_table TEXT;
  wallet_user_id_type TEXT;
  transaction_user_id_type TEXT;
  next_balance INTEGER;
  operation_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL
    OR p_amount IS NULL
    OR abs(p_amount::BIGINT) > 1000000
    OR p_reference_id IS NULL
    OR length(p_reference_id) > 100
    OR p_operation_type IS NULL
    OR length(p_operation_type) > 50
    OR p_transaction_amount IS NULL
    OR p_currency IS NULL
    OR p_description IS NULL
    OR length(p_description) > 500 THEN
    RAISE EXCEPTION 'Invalid credit operation';
  END IF;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'credits' AND c.relkind IN ('r', 'p')
  ) THEN 'credits' ELSE 'user_credits' END
  INTO wallet_table;

  SELECT data_type INTO wallet_user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = wallet_table AND column_name = 'user_id';
  IF wallet_user_id_type IS NULL THEN
    RAISE EXCEPTION 'Credit wallet table is unavailable';
  END IF;

  INSERT INTO public.credit_operations (user_id, reference_id, amount, operation_type, description)
  VALUES (p_user_id::text, p_reference_id, p_amount, p_operation_type, p_description)
  ON CONFLICT (user_id, reference_id) DO NOTHING;
  GET DIAGNOSTICS operation_inserted = ROW_COUNT;

  IF operation_inserted = 0 THEN
    EXECUTE format('SELECT balance FROM public.%I WHERE user_id::text = $1', wallet_table)
      INTO next_balance USING p_user_id::text;
    RETURN COALESCE(next_balance, 0);
  END IF;

  IF p_amount >= 0 THEN
    IF wallet_user_id_type = 'text' THEN
      EXECUTE format(
        'INSERT INTO public.%I AS wallet (user_id, balance) VALUES ($1::text, $2) ON CONFLICT (user_id) DO UPDATE SET balance = wallet.balance + EXCLUDED.balance, updated_at = NOW() RETURNING balance',
        wallet_table, wallet_table
      ) INTO next_balance USING p_user_id, p_amount;
    ELSE
      EXECUTE format(
        'INSERT INTO public.%I AS wallet (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET balance = wallet.balance + EXCLUDED.balance, updated_at = NOW() RETURNING balance',
        wallet_table, wallet_table
      ) INTO next_balance USING p_user_id, p_amount;
    END IF;
  ELSE
    IF wallet_user_id_type = 'text' THEN
      EXECUTE format(
        'UPDATE public.%I SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1::text AND balance + $2 >= 0 RETURNING balance',
        wallet_table
      ) INTO next_balance USING p_user_id, p_amount;
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1 AND balance + $2 >= 0 RETURNING balance',
        wallet_table
      ) INTO next_balance USING p_user_id, p_amount;
    END IF;
  END IF;

  IF next_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits or wallet unavailable';
  END IF;

  SELECT data_type INTO transaction_user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_id';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'transaction_type'
  ) THEN
    IF transaction_user_id_type = 'text' THEN
      INSERT INTO public.transactions (user_id, amount, transaction_type, reference_id, description)
      VALUES (p_user_id::text, p_transaction_amount, p_operation_type, p_reference_id, p_description);
    ELSE
      INSERT INTO public.transactions (user_id, amount, transaction_type, reference_id, description)
      VALUES (p_user_id, p_transaction_amount, p_operation_type, p_reference_id, p_description);
    END IF;
  ELSE
    IF transaction_user_id_type = 'text' THEN
      INSERT INTO public.transactions (user_id, amount, currency, type, status, stripe_session_id)
      VALUES (p_user_id::text, p_transaction_amount, p_currency, p_operation_type, 'completed', p_reference_id);
    ELSE
      INSERT INTO public.transactions (user_id, amount, currency, type, status, stripe_session_id)
      VALUES (p_user_id, p_transaction_amount, p_currency, p_operation_type, 'completed', p_reference_id);
    END IF;
  END IF;

  RETURN next_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id TEXT,
  p_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 OR p_transaction_type NOT IN ('profile_boost', 'super_like_cost') THEN
    RAISE EXCEPTION 'Invalid credit debit';
  END IF;
  RETURN public.apply_credit_change(
    p_user_id, -p_amount, p_reference_id, p_transaction_type,
    -p_amount, 'CREDITS', COALESCE(p_description, 'Dépense de crédits')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id TEXT,
  p_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 OR p_transaction_type NOT IN ('ad_watch', 'daily_login', 'refund', 'admin_adjustment', 'credit_purchase') THEN
    RAISE EXCEPTION 'Invalid credit grant';
  END IF;
  RETURN public.apply_credit_change(
    p_user_id, p_amount, p_reference_id, p_transaction_type,
    p_amount, 'CREDITS', COALESCE(p_description, 'Crédits ajoutés')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference_id TEXT,
  p_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.apply_credit_change(
    p_user_id, p_amount, p_reference_id, 'admin_adjustment',
    p_amount, 'CREDITS', p_description
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_community_credits(
  p_amount INTEGER,
  p_reference_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id UUID;
  affected_users INTEGER := 0;
  operation_reference TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000
    OR p_reference_id IS NULL OR length(p_reference_id) > 60 THEN
    RAISE EXCEPTION 'Invalid community credit grant';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('community:' || p_reference_id, 0));
  FOR profile_id IN SELECT id FROM public.profiles LOOP
    operation_reference := p_reference_id || ':' || profile_id::text;
    IF NOT EXISTS (
      SELECT 1 FROM public.credit_operations
      WHERE user_id = profile_id::text AND reference_id = operation_reference
    ) THEN
      PERFORM public.apply_credit_change(
        profile_id, p_amount, operation_reference, 'admin_adjustment',
        p_amount, 'CREDITS', 'Bonus de crédits communautaire'
      );
      affected_users := affected_users + 1;
    END IF;
  END LOOP;
  RETURN affected_users;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_payment_order(order_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.payment_orders%ROWTYPE;
  wallet_table TEXT;
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

  UPDATE public.payment_orders
  SET status = 'paid', paid_at = NOW(), updated_at = NOW()
  WHERE id = order_row.id;

  PERFORM public.apply_credit_change(
    order_row.user_id, order_row.credits,
    'payment:' || order_row.provider_reference,
    'credit_purchase', order_row.amount, order_row.currency,
    'Paiement Bavel confirmé'
  );

  IF order_row.product_type = 'subscription' THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'credits' AND c.relkind IN ('r', 'p')
    ) THEN 'credits' ELSE 'user_credits' END
    INTO wallet_table;
    EXECUTE format(
      'UPDATE public.%I SET tier = $1, premium_expires_at = NOW() + INTERVAL ''30 days'', updated_at = NOW() WHERE user_id::text = $2',
      wallet_table
    ) USING COALESCE(NULLIF(order_row.product_id, ''), 'premium'), order_row.user_id::text;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_reference TEXT := COALESCE(p_reference_id, gen_random_uuid()::text);
  transaction_id UUID;
BEGIN
  PERFORM public.apply_credit_change(
    p_user_id,
    p_amount,
    operation_reference,
    p_type,
    p_amount,
    'CREDITS',
    COALESCE(p_description, 'Ajustement de crédits')
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'reference_id'
  ) THEN
    SELECT id INTO transaction_id
    FROM public.transactions
    WHERE user_id::text = p_user_id::text AND reference_id = operation_reference
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT id INTO transaction_id
    FROM public.transactions
    WHERE user_id::text = p_user_id::text AND stripe_session_id = operation_reference
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  IF transaction_id IS NULL THEN
    RAISE EXCEPTION 'Credit transaction record was not created';
  END IF;
  RETURN transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_credit_change(UUID, INTEGER, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_transaction(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_order(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_user_credits(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_user_credits(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_user_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_grant_community_credits(INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_change(UUID, INTEGER, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_transaction(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_order(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_user_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_user_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_community_credits(INTEGER, TEXT) TO service_role;
