-- Milestone 2: goals, strategy, milestones, actions, routines, tasks, outcomes.
-- Conventions follow 20260924120000_foundation.sql (RLS, anon revoked, composite FKs).
-- Composite FKs whose referent can be deleted use `on delete set null (<col>)` so the
-- shared user_id column is never nulled.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.measurement_type as enum ('cumulative', 'level', 'milestone');
create type public.goal_status as enum ('draft', 'active', 'paused', 'completed', 'abandoned');
create type public.milestone_status as enum ('pending', 'in_progress', 'done', 'dropped');
create type public.action_status as enum ('open', 'done', 'dropped');
-- 'missed' is derived (BR-4): planned and scheduled before the user's local today.
create type public.task_status as enum ('planned', 'done', 'done_minimum', 'skipped');
create type public.task_source as enum ('manual', 'action', 'routine');
create type public.outcome_valence as enum ('positive', 'negative', 'neutral', 'unknown');
create type public.pace_period as enum ('day', 'week', 'month');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.are_valid_days_of_week(days smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(days) between 1 and 7
     and (select bool_and(d between 0 and 6) from unnest(days) as d)
     and (select count(distinct d) from unnest(days) as d) = cardinality(days);
$$;

revoke execute on function public.are_valid_days_of_week(smallint[]) from public, anon;
grant execute on function public.are_valid_days_of_week(smallint[]) to authenticated, service_role;

-- Keeps completed_at in step with a status column whose "finished" value is 'done'.
create function public.set_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status::text = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  life_area_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  motivation text check (motivation is null or char_length(motivation) <= 2000),
  measurement_type public.measurement_type not null,
  unit text check (unit is null or char_length(unit) between 1 and 20),
  baseline_value numeric check (baseline_value is null or abs(baseline_value) < 1e12),
  target_value numeric check (target_value is null or abs(target_value) < 1e12),
  current_state_text text check (current_state_text is null or char_length(current_state_text) <= 500),
  target_state_text text check (target_state_text is null or char_length(target_state_text) <= 500),
  start_date date not null,
  deadline date,
  planned_pace_amount numeric check (planned_pace_amount is null or (planned_pace_amount > 0 and planned_pace_amount < 1e12)),
  planned_pace_period public.pace_period,
  priority smallint not null default 2 check (priority between 1 and 3),
  status public.goal_status not null default 'active',
  status_changed_at timestamptz not null default now(),
  self_confidence smallint check (self_confidence is null or self_confidence between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_id_user_id_key unique (id, user_id),
  constraint goals_life_area_fkey foreign key (life_area_id, user_id)
    references public.life_areas (id, user_id) on delete restrict,
  constraint goals_measurement_check check (
    measurement_type = 'milestone'
    or (unit is not null and baseline_value is not null and target_value is not null and target_value <> baseline_value)
  ),
  constraint goals_pace_check check ((planned_pace_amount is null) = (planned_pace_period is null)),
  constraint goals_deadline_check check (deadline is null or deadline > start_date)
);

create index goals_user_id_status_idx on public.goals (user_id, status);
create index goals_life_area_id_idx on public.goals (life_area_id, user_id);

create function public.goals_track_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger goals_track_status_change
  before update on public.goals
  for each row execute function public.goals_track_status_change();

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goal_strategies
-- ---------------------------------------------------------------------------

create table public.goal_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  description text not null check (char_length(btrim(description)) between 1 and 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_strategies_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade
);

create index goal_strategies_goal_id_idx on public.goal_strategies (goal_id, user_id);

create trigger goal_strategies_set_updated_at
  before update on public.goal_strategies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  target_date date,
  sort_order integer not null default 0,
  status public.milestone_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_id_user_id_key unique (id, user_id),
  -- Lets actions require their milestone to belong to the same goal.
  constraint milestones_id_goal_id_user_id_key unique (id, goal_id, user_id),
  constraint milestones_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade
);

create index milestones_goal_id_idx on public.milestones (goal_id, user_id);

create trigger milestones_set_completed_at
  before insert or update of status on public.milestones
  for each row execute function public.set_completed_at();

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- actions (one-off steps; recurrence lives only in routines, TD-8)
-- ---------------------------------------------------------------------------

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  milestone_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  activity_type_id uuid,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  sort_order integer not null default 0,
  status public.action_status not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_id_user_id_key unique (id, user_id),
  constraint actions_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint actions_milestone_fkey foreign key (milestone_id, goal_id, user_id)
    references public.milestones (id, goal_id, user_id) on delete set null (milestone_id),
  constraint actions_activity_type_fkey foreign key (activity_type_id, user_id)
    references public.activity_types (id, user_id) on delete restrict
);

create index actions_goal_id_idx on public.actions (goal_id, user_id);
create index actions_milestone_id_idx on public.actions (milestone_id, goal_id, user_id);
create index actions_activity_type_id_idx on public.actions (activity_type_id, user_id);

create trigger actions_set_completed_at
  before insert or update of status on public.actions
  for each row execute function public.set_completed_at();

create trigger actions_set_updated_at
  before update on public.actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- routines (the only recurrence mechanism) and routine_steps
-- The life area is the activity type's; it isn't stored twice.
-- ---------------------------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  goal_id uuid,
  activity_type_id uuid not null,
  days_of_week smallint[] not null check (public.are_valid_days_of_week(days_of_week)),
  preferred_time time,
  normal_minutes integer not null check (normal_minutes between 1 and 1440),
  minimum_minutes integer,
  fallback_description text check (fallback_description is null or char_length(fallback_description) <= 300),
  active_from date not null,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_id_user_id_key unique (id, user_id),
  constraint routines_minimum_check check (minimum_minutes is null or minimum_minutes between 1 and normal_minutes),
  constraint routines_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id),
  constraint routines_activity_type_fkey foreign key (activity_type_id, user_id)
    references public.activity_types (id, user_id) on delete restrict
);

create index routines_user_id_idx on public.routines (user_id) where archived_at is null;
create index routines_goal_id_idx on public.routines (goal_id, user_id);
create index routines_activity_type_id_idx on public.routines (activity_type_id, user_id);

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  minutes integer check (minutes is null or minutes between 1 and 1440),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_steps_routine_fkey foreign key (routine_id, user_id)
    references public.routines (id, user_id) on delete cascade
);

create index routine_steps_routine_id_idx on public.routine_steps (routine_id, user_id);

create trigger routine_steps_set_updated_at
  before update on public.routine_steps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks (planned instances; the "plan" side of plan vs reality)
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  source public.task_source not null,
  routine_id uuid,
  action_id uuid,
  goal_id uuid,
  -- Copied from the routine/action at creation; the activity logged on completion.
  activity_type_id uuid,
  scheduled_date date not null,
  scheduled_time time,
  planned_minutes integer check (planned_minutes is null or planned_minutes between 1 and 1440),
  minimum_minutes integer check (minimum_minutes is null or minimum_minutes between 1 and 1440),
  status public.task_status not null default 'planned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_id_user_id_key unique (id, user_id),
  -- Idempotent routine materialization (FR-3). NULL routine_ids never conflict.
  constraint tasks_routine_id_scheduled_date_key unique (routine_id, scheduled_date),
  -- An action is scheduled at most once; rescheduling moves the task.
  constraint tasks_action_id_key unique (action_id),
  constraint tasks_source_check check (
    (source = 'routine' and routine_id is not null and action_id is null)
    or (source = 'action' and action_id is not null and routine_id is null)
    or (source = 'manual' and routine_id is null and action_id is null)
  ),
  constraint tasks_routine_fkey foreign key (routine_id, user_id)
    references public.routines (id, user_id) on delete cascade,
  constraint tasks_action_fkey foreign key (action_id, user_id)
    references public.actions (id, user_id) on delete cascade,
  constraint tasks_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id),
  constraint tasks_activity_type_fkey foreign key (activity_type_id, user_id)
    references public.activity_types (id, user_id) on delete restrict
);

create index tasks_user_id_scheduled_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_user_id_goal_id_scheduled_date_idx on public.tasks (user_id, goal_id, scheduled_date);
create index tasks_activity_type_id_idx on public.tasks (activity_type_id, user_id);

create function public.tasks_set_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('done', 'done_minimum') then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.tasks_set_completed_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activities: link to goals and tasks
-- ---------------------------------------------------------------------------

alter table public.activities
  add column goal_id uuid,
  add column task_id uuid,
  add constraint activities_task_id_key unique (task_id),
  add constraint activities_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id),
  add constraint activities_task_fkey foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete cascade;

create index activities_goal_id_idx on public.activities (goal_id, user_id);

-- ---------------------------------------------------------------------------
-- outcomes (progress readings for a goal)
-- ---------------------------------------------------------------------------

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  activity_id uuid,
  occurred_at timestamptz not null default now() check (occurred_at >= '2000-01-01T00:00:00Z'),
  local_date date not null,
  -- cumulative goals: the amount added; level goals: the new reading.
  value numeric check (value is null or abs(value) < 1e12),
  valence public.outcome_valence not null default 'unknown',
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outcomes_value_or_description_check check (value is not null or description is not null),
  constraint outcomes_goal_fkey foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint outcomes_activity_fkey foreign key (activity_id, user_id)
    references public.activities (id, user_id) on delete set null (activity_id)
);

create index outcomes_user_id_goal_id_local_date_idx on public.outcomes (user_id, goal_id, local_date);
create index outcomes_activity_id_idx on public.outcomes (activity_id, user_id);

create function public.outcomes_derive_local_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tz text;
begin
  if tg_op = 'INSERT' or new.occurred_at is distinct from old.occurred_at then
    if new.occurred_at > now() + interval '5 minutes' then
      raise exception 'occurred_at cannot be in the future' using errcode = 'check_violation';
    end if;
    select p.timezone into tz from public.profiles p where p.id = new.user_id;
    new.local_date := (new.occurred_at at time zone coalesce(tz, 'UTC'))::date;
  else
    new.local_date := old.local_date;
  end if;
  return new;
end;
$$;

create trigger outcomes_derive_local_date
  before insert or update on public.outcomes
  for each row execute function public.outcomes_derive_local_date();

create trigger outcomes_set_updated_at
  before update on public.outcomes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'goals', 'goal_strategies', 'milestones', 'actions', 'routines', 'routine_steps', 'tasks', 'outcomes'
  ] loop
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

-- ---------------------------------------------------------------------------
-- set_task_status: the only way task completion changes (FR-4).
-- Runs as the caller, so RLS applies. In one transaction it updates the task,
-- replaces its evidence activity, and keeps the source action's status in step.
-- ---------------------------------------------------------------------------

create function public.set_task_status(p_task_id uuid, p_status public.task_status)
returns public.tasks
language plpgsql
set search_path = ''
as $$
declare
  t public.tasks;
  tz text;
  local_today date;
  minutes integer;
  logged_at timestamptz;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'task not found' using errcode = 'no_data_found';
  end if;

  select coalesce(p.timezone, 'UTC') into tz from public.profiles p where p.id = t.user_id;
  tz := coalesce(tz, 'UTC');
  local_today := (now() at time zone tz)::date;

  if p_status <> 'planned' and t.scheduled_date > local_today then
    raise exception 'future tasks cannot be completed or skipped' using errcode = 'check_violation';
  end if;

  delete from public.activities a where a.task_id = t.id;

  if p_status in ('done', 'done_minimum') and t.activity_type_id is not null then
    minutes := case when p_status = 'done_minimum' then coalesce(t.minimum_minutes, t.planned_minutes)
                    else t.planned_minutes end;
    -- Completing a past day's task logs it on that day (at its scheduled time, else midday).
    logged_at := case when t.scheduled_date = local_today then now()
                      else (t.scheduled_date + coalesce(t.scheduled_time, time '12:00')) at time zone tz end;
    insert into public.activities (user_id, activity_type_id, goal_id, task_id, occurred_at, duration_minutes, source)
    values (t.user_id, t.activity_type_id, t.goal_id, t.id, logged_at, minutes, 'task');
  end if;

  if t.action_id is not null then
    update public.actions
    set status = case when p_status in ('done', 'done_minimum') then 'done'::public.action_status
                      else 'open'::public.action_status end
    where id = t.action_id and status <> 'dropped';
  end if;

  update public.tasks set status = p_status where id = t.id returning * into t;
  return t;
end;
$$;

revoke execute on function public.set_task_status(uuid, public.task_status) from public, anon;
grant execute on function public.set_task_status(uuid, public.task_status) to authenticated, service_role;
