-- Payment orders and idempotent fulfillment ledger.
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
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON public.payment_orders(status);
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payment orders" ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fulfill_payment_order(order_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO order_row FROM payment_orders
  WHERE provider_reference = order_reference FOR UPDATE;
  IF NOT FOUND OR order_row.status = 'paid' THEN
    RETURN FOUND;
  END IF;
  UPDATE payment_orders SET status = 'paid', paid_at = NOW(), updated_at = NOW()
  WHERE id = order_row.id;
  INSERT INTO user_credits (user_id, balance)
  VALUES (order_row.user_id, order_row.credits)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance, updated_at = NOW();
  INSERT INTO transactions (user_id, amount, transaction_type, reference_id, description, metadata)
  VALUES (order_row.user_id, order_row.amount, 'credit_purchase', order_row.provider_reference,
          'Paiement Bavel confirmé', jsonb_build_object('provider', order_row.provider, 'currency', order_row.currency));
  IF order_row.product_type = 'subscription' THEN
    UPDATE user_credits
    SET tier = COALESCE(NULLIF(order_row.product_id, ''), 'premium'),
        premium_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE user_id = order_row.user_id;
  END IF;
  RETURN TRUE;
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
DECLARE
  current_balance INTEGER;
  next_balance INTEGER;
  existing_amount INTEGER;
BEGIN
  IF p_amount <= 0 OR p_transaction_type NOT IN ('profile_boost', 'super_like_cost') THEN
    RAISE EXCEPTION 'Invalid credit debit';
  END IF;
  SELECT amount INTO existing_amount
  FROM transactions
  WHERE user_id = p_user_id AND reference_id = p_reference_id
  LIMIT 1;
  IF FOUND THEN
    SELECT balance INTO current_balance FROM user_credits WHERE user_id = p_user_id;
    RETURN current_balance;
  END IF;
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  next_balance := current_balance - p_amount;
  UPDATE user_credits
  SET balance = next_balance, updated_at = NOW()
  WHERE user_id = p_user_id;
  INSERT INTO transactions (user_id, amount, transaction_type, reference_id, description)
  VALUES (p_user_id, -p_amount, p_transaction_type, p_reference_id, p_description);
  RETURN next_balance;
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
DECLARE
  next_balance INTEGER;
  existing_amount INTEGER;
BEGIN
  IF p_amount <= 0 OR p_transaction_type NOT IN ('ad_watch', 'daily_login', 'refund', 'admin_adjustment') THEN
    RAISE EXCEPTION 'Invalid credit grant';
  END IF;
  SELECT amount INTO existing_amount
  FROM transactions
  WHERE user_id = p_user_id AND reference_id = p_reference_id
  LIMIT 1;
  IF FOUND THEN
    SELECT balance INTO next_balance FROM user_credits WHERE user_id = p_user_id;
    RETURN next_balance;
  END IF;
  INSERT INTO user_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + EXCLUDED.balance, updated_at = NOW();
  SELECT balance INTO next_balance FROM user_credits WHERE user_id = p_user_id;
  INSERT INTO transactions (user_id, amount, transaction_type, reference_id, description)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_description);
  RETURN next_balance;
END;
$$;
