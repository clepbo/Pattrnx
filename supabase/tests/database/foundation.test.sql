-- Foundation schema: RLS isolation, derived fields, constraints, cascades.
-- Run with `pnpm db:test` (supabase test db).
begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

-- ---------------------------------------------------------------------------
-- Structural guards (apply to every future table too)
-- ---------------------------------------------------------------------------

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'every public table has RLS enabled'
);

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'profiles'
       and not exists (select 1 from information_schema.columns col
                       where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'user_id') $$,
  'every public table except profiles has a user_id column'
);

select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public' $$,
  'anon has no privileges on any public table'
);

select ok(
  not has_function_privilege('anon', 'public.is_valid_timezone(text)', 'execute')
  and not has_function_privilege('anon', 'public.are_valid_tags(text[])', 'execute'),
  'anon cannot call helper functions over the API'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two users. Profiles are created by the auth trigger.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', '{"timezone": "Africa/Lagos", "display_name": "  Ada  "}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', '{"timezone": "Not/AZone"}');

select is((select timezone from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          'Africa/Lagos', 'profile trigger keeps a valid IANA timezone');
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          'Ada', 'profile trigger trims display name');
select is((select timezone from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
          'UTC', 'profile trigger falls back to UTC for an invalid timezone');

-- ---------------------------------------------------------------------------
-- User A creates data
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

insert into public.life_areas (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Career');
insert into public.activity_types (id, life_area_id, name, polarity)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Portfolio work', 'desired');
-- 23:30 UTC is 00:30 the next day in Lagos (UTC+1).
insert into public.activities (id, activity_type_id, occurred_at, duration_minutes)
  values ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-09-20T23:30:00Z', 45);
insert into public.daily_checkins (id, local_date, sleep_hours, workload)
  values ('aaaaaaaa-0000-0000-0000-000000000004', '2026-09-21', 6.5, 4);

select is((select user_id from public.life_areas where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          '11111111-1111-1111-1111-111111111111'::uuid, 'user_id defaults to auth.uid()');
select is((select local_date from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          '2026-09-21'::date, 'local_date derived in the user timezone');
select is((select local_hour from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          0::smallint, 'local_hour derived in the user timezone');
select is((select life_area_id from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'life_area_id derived from the activity type');

select throws_ok(
  $$ insert into public.activities (activity_type_id, occurred_at)
     values ('aaaaaaaa-0000-0000-0000-000000000002', now() + interval '1 hour') $$,
  '23514', 'occurred_at cannot be in the future', 'future activities are rejected'
);

update public.activities set local_date = '2000-01-01', local_hour = 5, note = 'edited'
  where id = 'aaaaaaaa-0000-0000-0000-000000000003';
select is((select local_date from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          '2026-09-21'::date, 'derived columns cannot be overwritten by the client');

select throws_ok(
  $$ insert into public.daily_checkins (local_date) values ('2026-09-21') $$,
  '23505', null, 'one check-in per user per local date'
);

select throws_ok(
  $$ insert into public.life_areas (name) values ('career') $$,
  '23505', null, 'life area names are unique per user, case-insensitive'
);

select throws_ok(
  $$ delete from public.life_areas where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23503', null, 'a referenced life area cannot be deleted'
);

select throws_ok(
  $$ update public.profiles set id = '33333333-3333-3333-3333-333333333333'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'profile id is not client-updatable'
);

select throws_ok(
  $$ insert into public.activities (activity_type_id, tags)
     values ('aaaaaaaa-0000-0000-0000-000000000002', array[repeat('x', 41)]) $$,
  '23514', null, 'tags longer than 40 characters are rejected'
);

-- Timezone change does not re-bucket history.
update public.profiles set timezone = 'America/New_York' where id = '11111111-1111-1111-1111-111111111111';
insert into public.activities (id, activity_type_id, occurred_at)
  values ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-09-20T23:30:00Z');
select is((select local_date from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          '2026-09-21'::date, 'existing activity keeps its local_date after a timezone change');
select is((select local_date from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000005'),
          '2026-09-20'::date, 'new activity uses the new timezone');

select throws_ok(
  $$ update public.profiles set timezone = 'EST5EDT+nonsense' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'invalid timezone rejected on profile update'
);

-- ---------------------------------------------------------------------------
-- User B cannot see or touch user A's data
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'B sees only their own profile');
select is((select count(*)::int from public.life_areas), 0, 'B cannot read A''s life areas');
select is((select count(*)::int from public.activity_types), 0, 'B cannot read A''s activity types');
select is((select count(*)::int from public.activities), 0, 'B cannot read A''s activities');
select is((select count(*)::int from public.daily_checkins), 0, 'B cannot read A''s check-ins');

update public.life_areas set name = 'Hacked';
update public.activities set note = 'hacked';
update public.profiles set display_name = 'Hacked' where id = '11111111-1111-1111-1111-111111111111';
delete from public.daily_checkins;
delete from public.activities;

select throws_ok(
  $$ insert into public.life_areas (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Injected') $$,
  '42501', null, 'B cannot insert rows owned by A'
);

select throws_ok(
  $$ insert into public.activities (activity_type_id) values ('aaaaaaaa-0000-0000-0000-000000000002') $$,
  '23503', null, 'B cannot log an activity against A''s activity type'
);

insert into public.life_areas (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Health');
select throws_ok(
  $$ insert into public.activity_types (life_area_id, name, user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Sneaky', '22222222-2222-2222-2222-222222222222') $$,
  '23503', null, 'composite FK blocks referencing A''s life area'
);

-- Back to A: nothing changed.
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is((select name from public.life_areas where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          'Career', 'B''s update did not affect A''s life area');
select is((select note from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
          'edited', 'B''s update did not affect A''s activity');
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          'Ada', 'B''s update did not affect A''s profile');
select is((select count(*)::int from public.activities), 2, 'B''s delete did not remove A''s activities');
select is((select count(*)::int from public.daily_checkins), 1, 'B''s delete did not remove A''s check-ins');

-- ---------------------------------------------------------------------------
-- Account deletion cascades everything
-- ---------------------------------------------------------------------------

reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from (
     select user_id from public.life_areas
     union all select user_id from public.activity_types
     union all select user_id from public.activities
     union all select user_id from public.daily_checkins
     union all select id from public.profiles
   ) rows where rows.user_id = '11111111-1111-1111-1111-111111111111'),
  0, 'deleting the auth user removes all of their rows'
);

select * from finish();
rollback;
