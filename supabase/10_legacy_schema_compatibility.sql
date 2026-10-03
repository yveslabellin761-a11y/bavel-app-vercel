-- Canonicalize legacy profile and match identities. Ambiguous profile duplicates
-- or dependent records abort the transaction rather than losing user data.

DO $$
DECLARE
  duplicate_profile RECORD;
  canonical_user_id TEXT;
  profile_count INTEGER;
  auth_user_count INTEGER;
  canonical_profile_count INTEGER;
  related_table RECORD;
  related_count BIGINT;
  counterpart_column TEXT;
  has_self_reference BOOLEAN;
  primary_key_name TEXT;
  primary_key_columns TEXT[];
  has_auth_identity_orphan BOOLEAN;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'public.profiles does not exist. Apply 01_base_schema.sql first.';
  END IF;

  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_inactivity_push_sent TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    FOR duplicate_profile IN
      SELECT legacy.user_id, legacy.email
      FROM public.profiles AS legacy
      WHERE legacy.email IS NOT NULL
        AND legacy.user_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1
          FROM public.profiles AS canonical
          JOIN auth.users AS auth_user ON auth_user.id::text = canonical.user_id::text
          WHERE lower(btrim(canonical.email)) = lower(btrim(legacy.email))
            AND lower(btrim(auth_user.email)) = lower(btrim(legacy.email))
        )
    LOOP
      SELECT count(*)
      INTO profile_count
      FROM public.profiles
      WHERE lower(btrim(email)) = lower(btrim(duplicate_profile.email));

      SELECT count(*)
      INTO auth_user_count
      FROM auth.users
      WHERE lower(btrim(email)) = lower(btrim(duplicate_profile.email));

      SELECT count(*), min(canonical.user_id::text)
      INTO canonical_profile_count, canonical_user_id
      FROM public.profiles AS canonical
      JOIN auth.users AS auth_user ON auth_user.id::text = canonical.user_id::text
      WHERE lower(btrim(canonical.email)) = lower(btrim(duplicate_profile.email))
        AND lower(btrim(auth_user.email)) = lower(btrim(duplicate_profile.email));

      IF profile_count <> 2 OR auth_user_count <> 1 OR canonical_profile_count <> 1 THEN
        RAISE EXCEPTION
          'Cannot safely remove a legacy duplicate profile: expected exactly two matching profiles and one canonical Auth identity.';
      END IF;

      IF to_regclass('public.matches') IS NOT NULL THEN
        FOR counterpart_column IN
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'matches'
            AND column_name IN ('profile_id', 'matched_user_id')
        LOOP
          EXECUTE format(
            'SELECT EXISTS (
               SELECT 1 FROM public.matches
               WHERE (user_id::text = $1 AND %1$I::text = $2)
                  OR (user_id::text = $2 AND %1$I::text = $1)
                  OR (user_id::text = $1 AND %1$I::text = $1)
             )',
            counterpart_column
          )
          INTO has_self_reference
          USING duplicate_profile.user_id::text, canonical_user_id;

          IF has_self_reference THEN
            RAISE EXCEPTION
              'Cannot safely deduplicate a profile with a self-referential match.';
          END IF;

          IF to_regclass('public.messages') IS NOT NULL AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'match_id'
          ) THEN
            EXECUTE format(
              'SELECT count(*)
               FROM public.messages AS child
               WHERE child.match_id::text IN (
                 SELECT duplicate.id::text
                 FROM public.matches AS duplicate
                 WHERE duplicate.user_id::text = $1
                    OR duplicate.%1$I::text = $1
               )',
              counterpart_column
            )
            INTO related_count
            USING duplicate_profile.user_id::text;

            IF related_count > 0 THEN
              RAISE EXCEPTION
                'Cannot safely deduplicate a profile whose duplicate matches contain messages.';
            END IF;
          END IF;

          EXECUTE format(
            'UPDATE public.matches AS keep
             SET created_at = LEAST(keep.created_at, duplicate.created_at)
             FROM public.matches AS duplicate
             WHERE duplicate.user_id::text = $1
               AND keep.user_id::text = $2
               AND duplicate.%1$I::text = keep.%1$I::text',
            counterpart_column
          )
          USING duplicate_profile.user_id::text, canonical_user_id;

          EXECUTE format(
            'UPDATE public.matches AS keep
             SET created_at = LEAST(keep.created_at, duplicate.created_at)
             FROM public.matches AS duplicate
             WHERE duplicate.%1$I::text = $1
               AND keep.%1$I::text = $2
               AND duplicate.user_id::text = keep.user_id::text',
            counterpart_column
          )
          USING duplicate_profile.user_id::text, canonical_user_id;

          EXECUTE format(
            'DELETE FROM public.matches AS duplicate
             WHERE duplicate.user_id::text = $1
               AND EXISTS (
                 SELECT 1 FROM public.matches AS keep
                 WHERE keep.user_id::text = $2
                   AND keep.%1$I::text = duplicate.%1$I::text
               )',
            counterpart_column
          )
          USING duplicate_profile.user_id::text, canonical_user_id;

          EXECUTE format(
            'DELETE FROM public.matches AS duplicate
             WHERE duplicate.%1$I::text = $1
               AND EXISTS (
                 SELECT 1 FROM public.matches AS keep
                 WHERE keep.%1$I::text = $2
                   AND keep.user_id::text = duplicate.user_id::text
               )',
            counterpart_column
          )
          USING duplicate_profile.user_id::text, canonical_user_id;

          EXECUTE format(
            'UPDATE public.matches SET %1$I = $1 WHERE %1$I::text = $2',
            counterpart_column
          )
          USING canonical_user_id, duplicate_profile.user_id::text;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'user_id'
        ) THEN
          UPDATE public.matches
          SET user_id = canonical_user_id
          WHERE user_id::text = duplicate_profile.user_id::text;
        END IF;
      END IF;

      IF to_regclass('public.likes') IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'likes' AND column_name = 'user_id'
         )
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'likes' AND column_name = 'target_id'
         ) THEN
        DELETE FROM public.likes
        WHERE (user_id::text = duplicate_profile.user_id::text AND target_id::text = canonical_user_id)
           OR (user_id::text = canonical_user_id AND target_id::text = duplicate_profile.user_id::text);

        UPDATE public.likes AS keep
        SET is_super_like = coalesce(keep.is_super_like, false) OR coalesce(duplicate.is_super_like, false),
            created_at = LEAST(keep.created_at, duplicate.created_at)
        FROM public.likes AS duplicate
        WHERE duplicate.user_id::text = duplicate_profile.user_id::text
          AND keep.user_id::text = canonical_user_id
          AND keep.target_id::text = duplicate.target_id::text;

        DELETE FROM public.likes AS duplicate
        WHERE duplicate.user_id::text = duplicate_profile.user_id::text
          AND EXISTS (
            SELECT 1 FROM public.likes AS keep
            WHERE keep.user_id::text = canonical_user_id
              AND keep.target_id::text = duplicate.target_id::text
          );

        UPDATE public.likes
        SET user_id = canonical_user_id
        WHERE user_id::text = duplicate_profile.user_id::text;

        UPDATE public.likes AS keep
        SET is_super_like = coalesce(keep.is_super_like, false) OR coalesce(duplicate.is_super_like, false),
            created_at = LEAST(keep.created_at, duplicate.created_at)
        FROM public.likes AS duplicate
        WHERE duplicate.target_id::text = duplicate_profile.user_id::text
          AND keep.target_id::text = canonical_user_id
          AND keep.user_id::text = duplicate.user_id::text;

        DELETE FROM public.likes AS duplicate
        WHERE duplicate.target_id::text = duplicate_profile.user_id::text
          AND EXISTS (
            SELECT 1 FROM public.likes AS keep
            WHERE keep.target_id::text = canonical_user_id
              AND keep.user_id::text = duplicate.user_id::text
          );

        UPDATE public.likes
        SET target_id = canonical_user_id
        WHERE target_id::text = duplicate_profile.user_id::text;
      END IF;

      FOR related_table IN
        SELECT DISTINCT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name NOT IN ('profiles', 'matches', 'likes')
          AND column_name IN (
            'user_id', 'profile_id', 'target_id', 'matched_user_id', 'sender_id',
            'receiver_id', 'reporter_id', 'reported_id', 'blocked_user_id',
            'visited_user_id', 'actor_id', 'owner_id', 'account_id',
            'created_by', 'updated_by', 'recipient_id', 'requester_id'
          )
      LOOP
        EXECUTE format(
          'SELECT count(*) FROM public.%I WHERE %I::text = $1',
          related_table.table_name,
          related_table.column_name
        )
        INTO related_count
        USING duplicate_profile.user_id::text;

        IF related_count > 0 THEN
          RAISE EXCEPTION
            'Cannot safely deduplicate a profile with unexpected references in %.%.',
            related_table.table_name,
            related_table.column_name;
        END IF;
      END LOOP;

      DELETE FROM public.profiles
      WHERE user_id::text = duplicate_profile.user_id::text;
    END LOOP;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    UPDATE public.profiles
    SET id = user_id::uuid
    WHERE id IS NULL
      AND user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id IS NULL) THEN
    RAISE EXCEPTION
      'Legacy profile rows remain without canonical UUID ids. Map them to auth.users before rerunning migration 10.';
  END IF;

  IF to_regclass('public.matches') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'user_id'
     ) THEN
    ALTER TABLE public.matches
      ADD COLUMN IF NOT EXISTS matched_user_id UUID;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'profile_id'
    ) THEN
      UPDATE public.matches
      SET matched_user_id = profile_id::uuid
      WHERE matched_user_id IS NULL
        AND profile_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = public.matches.profile_id::uuid
        );

      FOR related_table IN
        SELECT DISTINCT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name <> 'matches'
          AND column_name = 'match_id'
      LOOP
        IF related_table.table_name = 'messages' THEN
          EXECUTE format(
            'DELETE FROM public.%I
             WHERE match_id::text IN (
               SELECT id::text FROM public.matches WHERE matched_user_id IS NULL
             )',
            related_table.table_name
          );
          CONTINUE;
        END IF;

        EXECUTE format(
          'SELECT count(*)
           FROM public.%I
           WHERE match_id::text IN (
             SELECT id::text FROM public.matches WHERE matched_user_id IS NULL
           )',
          related_table.table_name
        )
        INTO related_count;

        IF related_count > 0 THEN
          RAISE EXCEPTION
            'Cannot remove unmappable legacy matches: dependent rows exist in public.%.',
            related_table.table_name;
        END IF;
      END LOOP;
      DELETE FROM public.matches WHERE matched_user_id IS NULL;
      DELETE FROM public.matches WHERE matched_user_id IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.matches
      GROUP BY user_id::text, matched_user_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION
        'Legacy matches contain duplicate canonical participant pairs; resolve them before continuing.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE user_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         OR matched_user_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Matches contain identities that cannot be converted to canonical UUIDs.';
    END IF;

    DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
    DROP POLICY IF EXISTS "Users can insert their own matches" ON public.matches;
    DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
    DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'matches'
        AND column_name = 'user_id' AND data_type <> 'uuid'
    ) THEN
      ALTER TABLE public.matches ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;
    ALTER TABLE public.matches
      ALTER COLUMN user_id SET NOT NULL,
      ALTER COLUMN matched_user_id SET NOT NULL;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_user_id_profile_id_key'
    ) THEN
      ALTER TABLE public.matches DROP CONSTRAINT matches_user_id_profile_id_key;
    END IF;

    CREATE POLICY "Users can view their own matches"
      ON public.matches FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

    CREATE POLICY "Users can insert their own matches"
      ON public.matches FOR INSERT
      WITH CHECK (auth.uid() = user_id OR auth.uid() = matched_user_id);

    CREATE POLICY "Users can update their own matches"
      ON public.matches FOR UPDATE
      USING (auth.uid() = user_id OR auth.uid() = matched_user_id)
      WITH CHECK (auth.uid() = user_id OR auth.uid() = matched_user_id);

    CREATE POLICY "Users can delete their own matches"
      ON public.matches FOR DELETE
      USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

    ALTER TABLE public.matches DROP COLUMN IF EXISTS profile_id;

    DROP INDEX IF EXISTS public.matches_user_matched_user_compat_unique;
    CREATE UNIQUE INDEX matches_user_matched_user_compat_unique
      ON public.matches (user_id, matched_user_id);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = 'public.matches'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confrelid = 'public.profiles'::regclass
        AND constraint_row.conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.matches'::regclass AND attname = 'matched_user_id'
        )]::smallint[]
    ) THEN
      ALTER TABLE public.matches
        ADD CONSTRAINT matches_matched_user_id_compat_fkey
        FOREIGN KEY (matched_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = 'public.matches'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confrelid = 'public.profiles'::regclass
        AND constraint_row.conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.matches'::regclass AND attname = 'user_id'
        )]::smallint[]
    ) THEN
      ALTER TABLE public.matches
        ADD CONSTRAINT matches_user_id_compat_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL
     AND to_regclass('public.matches') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'match_id'
     ) THEN
    DELETE FROM public.messages AS orphan
    WHERE NOT EXISTS (
      SELECT 1 FROM public.matches AS canonical
      WHERE canonical.id::text = orphan.match_id::text
    );

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages'
        AND column_name = 'match_id' AND data_type <> 'uuid'
    ) THEN
      ALTER TABLE public.messages ALTER COLUMN match_id TYPE UUID USING match_id::uuid;
    END IF;

    ALTER TABLE public.messages ALTER COLUMN match_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = 'public.messages'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confrelid = 'public.matches'::regclass
        AND constraint_row.conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.messages'::regclass AND attname = 'match_id'
        )]::smallint[]
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_match_id_compat_fkey
        FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = 'user'
  WHERE role IS NULL OR role NOT IN ('user', 'admin');

  ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_compat_unique
    ON public.profiles (id);

  CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_normalized_compat_unique
    ON public.profiles (lower(btrim(email)))
    WHERE email IS NOT NULL AND btrim(email) <> '';

  SELECT constraint_row.conname, array_agg(column_row.attname ORDER BY key_column.ordinality)
  INTO primary_key_name, primary_key_columns
  FROM pg_constraint AS constraint_row
  JOIN pg_class AS table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_namespace AS schema_row ON schema_row.oid = table_row.relnamespace
  JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, ordinality) ON true
  JOIN pg_attribute AS column_row
    ON column_row.attrelid = table_row.oid
   AND column_row.attnum = key_column.attnum
  WHERE schema_row.nspname = 'public'
    AND table_row.relname = 'profiles'
    AND constraint_row.contype = 'p'
  GROUP BY constraint_row.conname;

  IF primary_key_name IS NOT NULL AND primary_key_columns <> ARRAY['id'] THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', primary_key_name);
    primary_key_name := NULL;
  END IF;

  IF primary_key_name IS NULL THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_compat_primary_key PRIMARY KEY (id);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE auth_user.id IS NULL
  )
  INTO has_auth_identity_orphan;

  IF has_auth_identity_orphan THEN
    RAISE EXCEPTION
      'Profile IDs must map to auth.users before enforcing canonical profile identity.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.profiles'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND constraint_row.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.profiles'::regclass AND attname = 'id'
      )]::smallint[]
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_compat_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
  CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

  ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;
END $$;

COMMENT ON COLUMN public.profiles.id IS
  'Canonical Supabase auth.users identifier. Existing legacy rows must be backfilled before production use.';
