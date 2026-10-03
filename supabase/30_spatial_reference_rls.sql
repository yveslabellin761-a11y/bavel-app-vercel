DO $$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
    RAISE EXCEPTION
      'PostGIS spatial_ref_sys is still in public; move PostGIS to extensions before marking this repair applied.';
  END IF;

  IF to_regclass('extensions.spatial_ref_sys') IS NULL THEN
    RAISE EXCEPTION
      'PostGIS spatial_ref_sys was not found in extensions; verify the extension installation before marking this repair applied.';
  END IF;

  IF has_table_privilege('anon', 'extensions.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('anon', 'extensions.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('anon', 'extensions.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('anon', 'extensions.spatial_ref_sys', 'TRUNCATE')
    OR has_table_privilege('anon', 'extensions.spatial_ref_sys', 'REFERENCES')
    OR has_table_privilege('anon', 'extensions.spatial_ref_sys', 'TRIGGER')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'REFERENCES')
    OR has_table_privilege('authenticated', 'extensions.spatial_ref_sys', 'TRIGGER') THEN
    RAISE EXCEPTION
      'Client roles still have write privileges on extensions.spatial_ref_sys.';
  END IF;
END;
$$;
