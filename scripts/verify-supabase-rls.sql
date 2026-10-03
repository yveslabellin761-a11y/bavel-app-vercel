SELECT
  'public_table_rls_disabled' AS finding,
  schemaname || '.' || tablename AS object_name,
  NULL::text AS details
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity

UNION ALL

SELECT
  'unrestricted_anon_policy' AS finding,
  schemaname || '.' || tablename AS object_name,
  policyname || ' (' || cmd || ')' AS details
FROM pg_policies
WHERE schemaname = 'public'
  AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['anon']::name[])
  AND (
    coalesce(qual, '') ~* '^\s*\(?true\)?\s*$'
    OR coalesce(with_check, '') ~* '^\s*\(?true\)?\s*$'
  )

UNION ALL

SELECT
  'client_truncate_privilege' AS finding,
  table_schema || '.' || table_name AS object_name,
  grantee || ' has TRUNCATE' AS details
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  AND privilege_type = 'TRUNCATE'

UNION ALL

SELECT
  'spatial_ref_sys_client_write' AS finding,
  table_schema || '.' || table_name AS object_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS details
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'extensions')
  AND table_name = 'spatial_ref_sys'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
GROUP BY table_schema, table_name

ORDER BY finding, object_name, details;
