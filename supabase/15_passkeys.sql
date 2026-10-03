-- Production WebAuthn storage. Apply with the consolidated migration batch.
CREATE TABLE IF NOT EXISTS public.auth_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_type TEXT,
  backed_up BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL DEFAULT 'Clé d’accès',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_passkeys_user_id ON public.auth_passkeys(user_id);

CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  challenge TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expiry ON public.passkey_challenges(expires_at);
ALTER TABLE public.auth_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own passkeys" ON public.auth_passkeys;
CREATE POLICY "Users can manage own passkeys" ON public.auth_passkeys
  FOR SELECT USING (auth.uid() = user_id);

-- Challenge and credential mutations are performed by the authenticated server service role.
