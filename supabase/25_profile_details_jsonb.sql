-- Profile details are a keyed object in the editor. Preserve legacy values while
-- converting the original text-array column to JSONB.

DO $$
DECLARE
  details_type TEXT;
BEGIN
  SELECT data_type
    INTO details_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'details';

  IF details_type IS NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
  ELSIF details_type <> 'jsonb' THEN
    ALTER TABLE public.profiles
      ALTER COLUMN details TYPE JSONB
      USING to_jsonb(details);
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN details SET DEFAULT '{}'::jsonb;
