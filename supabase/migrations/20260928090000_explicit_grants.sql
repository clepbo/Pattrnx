-- Explicit table privileges for the Data API roles, and profiles for early accounts.
--
-- Supabase projects created from 2026-05-30 no longer grant anon, authenticated and
-- service_role access to new public tables by default (existing projects follow on
-- 2026-10-30), while the local stack still does. Earlier migrations relied on those
-- defaults for every table except profiles, so a hosted project couldn't read them.
-- This makes each table's privileges explicit and identical everywhere: start from
-- nothing, then grant only what the app uses. RLS still decides which rows.
-- supabase/tests/database/grants.test.sql fails if a table keeps default grants.

do $$
declare
  t text;
begin
  foreach t in array array[
    'life_areas', 'activity_types', 'activities', 'daily_checkins',
    'goals', 'goal_strategies', 'milestones', 'actions', 'routines', 'routine_steps',
    'tasks', 'outcomes', 'patterns', 'experiments', 'reviews'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated, service_role', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end;
$$;

-- profiles: rows come from handle_new_user; users read theirs and update these columns.
revoke all on public.profiles from anon, authenticated, service_role;
grant select on public.profiles to authenticated;
grant update (
  display_name, timezone, currency, week_starts_on, ai_processing_consent,
  onboarding_completed_at, patterns_checked_at, patterns_dirty
) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- rate_limits: users can read their counters; only hit_rate_limit changes them (SR-1).
revoke all on public.rate_limits from anon, authenticated, service_role;
grant select on public.rate_limits to authenticated;
grant select, insert, update, delete on public.rate_limits to service_role;

-- Accounts created before handle_new_user existed have no profile, and every signed-in
-- page needs one. Same defaults as the trigger.
insert into public.profiles (id, display_name, timezone)
select
  u.id,
  left(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), 80),
  case when public.is_valid_timezone(u.raw_user_meta_data ->> 'timezone')
    then u.raw_user_meta_data ->> 'timezone' else 'UTC' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
