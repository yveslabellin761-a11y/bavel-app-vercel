DO $$
DECLARE
  target_table RECORD;
BEGIN
  FOR target_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'spatial_ref_sys'
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
      target_table.schemaname,
      target_table.tablename
    );
  END LOOP;
END;
$$;
