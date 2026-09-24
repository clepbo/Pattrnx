-- Milestone 4: experiments, weekly reviews, rate limits; template values on patterns.

-- ---------------------------------------------------------------------------
-- patterns: keep the template values so interventions can be built from stored rows
-- ---------------------------------------------------------------------------

alter table public.patterns
  add column vars jsonb not null default '{}'::jsonb check (jsonb_typeof(vars) = 'object');

-- ---------------------------------------------------------------------------
-- experiments (PRD F14, ARCHITECTURE.md §4.3, §8.7)
-- ---------------------------------------------------------------------------

create type public.intervention_category as enum (
  'reduce', 'reschedule', 'sequence', 'replace', 'remove_friction',
  'add_friction', 'environment', 'accountability', 'strategy_change', 'goal_recalibration'
);
create type public.experiment_metric as enum ('task_completion_rate', 'active_days', 'activity_minutes', 'activity_quantity');
create type public.metric_direction as enum ('increase', 'decrease');
create type public.experiment_status as enum ('active', 'completed', 'abandoned');
create type public.experiment_outcome as enum ('improved', 'no_change', 'worsened', 'inconclusive');

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid,
  pattern_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  hypothesis text not null check (char_length(btrim(hypothesis)) between 1 and 500),
  intervention_category public.intervention_category not null,
  intervention_description text not null check (char_length(btrim(intervention_description)) between 1 and 1000),
  metric public.experiment_metric not null,
  -- {routineId?, goalId?, activityTypeId?}; empty = all tasks (completion rate only).
  metric_subject jsonb not null default '{}'::jsonb check (jsonb_typeof(metric_subject) = 'object'),
  direction public.metric_direction not null,
  start_date date not null,
  end_date date not null,
  baseline_start date not null,
  baseline_end date not null,
  baseline_value numeric,
  baseline_observed_days integer not null default 0 check (baseline_observed_days >= 0),
  result_value numeric,
  result_observed_days integer check (result_observed_days is null or result_observed_days >= 0),
  suggested_outcome public.experiment_outcome,
  outcome public.experiment_outcome,
  status public.experiment_status not null default 'active',
  reflection text check (reflection is null or char_length(reflection) <= 2000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiments_id_user_id_key unique (id, user_id),
  -- BR-7: 7–42 days, inclusive.
  constraint experiments_duration_check check (end_date - start_date + 1 between 7 and 42),
  -- The baseline is the equal-length window right before the start (FR-9).
  constraint experiments_baseline_check check (
    baseline_end = start_date - 1 and baseline_end - baseline_start = end_date - start_date
  ),
  constraint experiments_activity_subject_check check (
    metric = 'task_completion_rate' or metric_subject ? 'activityTypeId'
  ),
  constraint experiments_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id),
  constraint experiments_pattern_fkey foreign key (pattern_id, user_id)
    references public.patterns (id, user_id) on delete set null (pattern_id)
);

-- BR-7: at most one active experiment per goal…
create unique index experiments_one_active_per_goal on public.experiments (goal_id) where status = 'active';
create index experiments_user_id_status_idx on public.experiments (user_id, status);
create index experiments_pattern_id_idx on public.experiments (pattern_id, user_id);

-- …and at most two per user.
create function public.experiments_enforce_active_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and (
    select count(*) from public.experiments e
    where e.user_id = new.user_id and e.status = 'active' and e.id <> new.id
  ) >= 2 then
    raise exception 'at most two active experiments' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger experiments_enforce_active_limit
  before insert or update of status on public.experiments
  for each row execute function public.experiments_enforce_active_limit();

create trigger experiments_set_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reviews: weekly snapshot (PRD F13). Immutable except reflection/usefulness/viewed_at.
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period text not null default 'week' check (period = 'week'),
  period_start date not null,
  period_end date not null check (period_end = period_start + 6),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  engine_version integer not null,
  generated_at timestamptz not null default now(),
  viewed_at timestamptz,
  reflection text check (reflection is null or char_length(reflection) <= 4000),
  usefulness smallint check (usefulness is null or usefulness between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_user_id_period_start_key unique (user_id, period, period_start)
);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rate_limits: fixed-window counters (export now; AI quota later, ARCHITECTURE.md §10)
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  action text not null check (char_length(action) between 1 and 40),
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, action, window_start)
);

/**
 * Counts one hit for (current user, action) in the action's current fixed window
 * and returns whether it's within that action's limit. Limits are defined here,
 * never by the caller: a caller-supplied window would let users clear their own
 * counters (security review finding SR-1). Atomic under concurrency (upsert).
 * Security definer: users can't write rate_limits directly.
 */
create function public.hit_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_hits integer;
  window_length interval;
  bucket timestamptz;
  hits integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  case p_action
    when 'export' then max_hits := 5; window_length := interval '1 hour';
    else raise exception 'unknown rate-limited action: %', p_action using errcode = 'invalid_parameter_value';
  end case;

  bucket := to_timestamp(floor(extract(epoch from now()) / extract(epoch from window_length)) * extract(epoch from window_length));
  insert into public.rate_limits (user_id, action, window_start, count)
  values (auth.uid(), p_action, bucket, 1)
  on conflict (user_id, action, window_start) do update set count = public.rate_limits.count + 1
  returning count into hits;
  delete from public.rate_limits where user_id = auth.uid() and action = p_action and window_start < bucket;
  return hits <= max_hits;
end;
$$;

revoke execute on function public.hit_rate_limit(text) from public, anon;
grant execute on function public.hit_rate_limit(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Size caps on client-writable JSON (security review SR-4): users can reach these
-- columns through the API directly, so bound them. 64 KB is far above real use.
-- ---------------------------------------------------------------------------

alter table public.reviews add constraint reviews_content_size_check check (pg_column_size(content) <= 65536);
alter table public.experiments add constraint experiments_metric_subject_size_check check (pg_column_size(metric_subject) <= 1024);
alter table public.patterns
  add constraint patterns_json_size_check check (
    pg_column_size(evidence) <= 65536 and pg_column_size(subject) <= 4096 and pg_column_size(vars) <= 8192
  );
alter table public.activity_types
  add constraint activity_types_quick_log_defaults_size_check check (pg_column_size(quick_log_defaults) <= 1024);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['experiments', 'reviews', 'rate_limits'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- Counters are written only through hit_rate_limit; users can't reset their own.
revoke insert, update, delete on public.rate_limits from authenticated;
grant insert, update, delete on public.rate_limits to service_role;
