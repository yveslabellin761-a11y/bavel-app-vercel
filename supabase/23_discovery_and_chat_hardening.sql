-- Public discovery responses are served by the application server with an
-- explicit field allowlist. Prevent direct clients from bypassing chat checks
-- or mutating message media and verification state.

CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  incognito_mode BOOLEAN NOT NULL DEFAULT false,
  show_online_status BOOLEAN NOT NULL DEFAULT true,
  show_distance BOOLEAN NOT NULL DEFAULT true,
  profile_paused BOOLEAN NOT NULL DEFAULT false,
  allow_calls BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_privacy_settings
  ADD COLUMN IF NOT EXISTS profile_paused BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "privacy settings own access" ON public.user_privacy_settings;
CREATE POLICY "privacy settings own access" ON public.user_privacy_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete their blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'blocker_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.blocks RENAME COLUMN blocker_id TO user_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'blocked_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'blocked_user_id'
  ) THEN
    ALTER TABLE public.blocks RENAME COLUMN blocked_id TO blocked_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'user_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name = 'blocked_user_id'
  ) THEN
    RAISE EXCEPTION 'Block relationships require canonical user_id and blocked_user_id columns.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocks
    WHERE user_id IS NULL
       OR blocked_user_id IS NULL
       OR user_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR blocked_user_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Block participants must be valid UUID profile IDs before hardening block policies.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocks AS block_row
    LEFT JOIN public.profiles AS blocker ON blocker.id = block_row.user_id::uuid
    LEFT JOIN public.profiles AS blocked ON blocked.id = block_row.blocked_user_id::uuid
    WHERE blocker.id IS NULL OR blocked.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Block participants must reference existing profiles before hardening block policies.';
  END IF;

  ALTER TABLE public.blocks
    ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
    ALTER COLUMN blocked_user_id TYPE UUID USING blocked_user_id::uuid,
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN blocked_user_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.blocks'::regclass AND conname = 'blocks_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.blocks
      ADD CONSTRAINT blocks_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.blocks'::regclass AND conname = 'blocks_blocked_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.blocks
      ADD CONSTRAINT blocks_blocked_user_id_profiles_fkey
      FOREIGN KEY (blocked_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = blocked_user_id);
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view non-suspended profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own_read" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.messages
    WHERE sender_id IS NULL
       OR receiver_id IS NULL
       OR sender_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR receiver_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Message participants must be valid UUID profile IDs before hardening chat policies.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.messages AS message_row
    LEFT JOIN public.profiles AS sender ON sender.id = message_row.sender_id::uuid
    LEFT JOIN public.profiles AS receiver ON receiver.id = message_row.receiver_id::uuid
    WHERE sender.id IS NULL OR receiver.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Message participants must reference existing profiles before hardening chat policies.';
  END IF;

  ALTER TABLE public.messages
    ALTER COLUMN sender_id TYPE UUID USING sender_id::uuid,
    ALTER COLUMN receiver_id TYPE UUID USING receiver_id::uuid,
    ALTER COLUMN sender_id SET NOT NULL,
    ALTER COLUMN receiver_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND conname = 'messages_sender_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_id_profiles_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND conname = 'messages_receiver_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_receiver_id_profiles_fkey
      FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE POLICY "messages_select_participants" ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.matches AS match_row
      WHERE match_row.id = match_id
        AND (
          (match_row.user_id = auth.uid() AND match_row.matched_user_id = receiver_id)
          OR (match_row.matched_user_id = auth.uid() AND match_row.user_id = receiver_id)
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocks AS block_row
      WHERE (block_row.user_id = sender_id AND block_row.blocked_user_id = receiver_id)
         OR (block_row.user_id = receiver_id AND block_row.blocked_user_id = sender_id)
    )
  );

CREATE POLICY "messages_update_own_read" ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND is_read IS TRUE);

REVOKE UPDATE ON TABLE public.messages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read) ON TABLE public.messages TO authenticated;

CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE
  USING (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_verified IS DISTINCT FROM false
       OR NEW.role IS DISTINCT FROM 'user'
       OR NEW.is_suspended IS DISTINCT FROM false
       OR NEW.tier IS DISTINCT FROM 'freemium' THEN
      RAISE EXCEPTION 'Privileged profile fields can only be changed by the server.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Privileged profile fields can only be changed by the server.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged_fields ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();
