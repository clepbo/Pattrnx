-- Table privileges are explicit (migration 20260928090000). Hosted Supabase projects no
-- longer grant defaults, but the local stack does, so a table that relies on them works
-- here and fails in production. Default grants include TRUNCATE; explicit ones never do.
begin;
select plan(8);

select is_empty(
  $$ select table_name::text from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('authenticated', 'service_role')
       and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER') $$,
  'every public table has explicit grants (no default TRUNCATE/REFERENCES/TRIGGER left)'
);

select is_empty(
  $$ select table_name::text from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' $$,
  'anon has no table privileges'
);

select is_empty(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not has_table_privilege('authenticated', c.oid, 'select') $$,
  'authenticated can read every public table (RLS limits the rows)'
);

select table_privs_are('public', 'goals', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'a user-owned table: full DML for authenticated');
select table_privs_are('public', 'profiles', 'authenticated', array['SELECT'],
  'profiles: select only at table level');
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'timezone', 'update')
    and not has_column_privilege('authenticated', 'public.profiles', 'id', 'update'),
  'profiles: only the listed columns are updatable'
);
select table_privs_are('public', 'rate_limits', 'authenticated', array['SELECT'],
  'rate_limits: read-only for users');
select table_privs_are('public', 'goals', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'service_role has DML');

select * from finish();
rollback;
