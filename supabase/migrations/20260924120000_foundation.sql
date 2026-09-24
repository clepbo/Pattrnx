-- Milestone 1 foundation: profiles, life areas, activity types, activities, daily check-ins.
-- See ARCHITECTURE.md §4. Every user-owned table:
--   * has user_id → auth.users on delete cascade (default auth.uid())
--   * has RLS enabled with four own-row policies for `authenticated`
--   * grants nothing to `anon`
--   * exposes unique (id, user_id) so children can use composite FKs that
--     can never point at another user's row

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.activity_polarity as enum ('desired', 'undesired', 'neutral');
create type public.activity_source as enum ('manual', 'task', 'import');

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- IANA names only (rejects abbreviations and POSIX offsets that `at time zone` would accept).
create function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select tz is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

create function public.are_valid_tags(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(tags) <= 10
     and coalesce((select bool_and(char_length(t) between 1 and 40) from unnest(tags) as t), true);
$$;

-- Check constraints run these as the writing role; nobody needs them over the API anonymously.
revoke execute on function public.is_valid_timezone(text), public.are_valid_tags(text[]) from public, anon;
grant execute on function public.is_valid_timezone(text), public.are_valid_tags(text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, created by trigger)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  timezone text not null default 'UTC' check (public.is_valid_timezone(timezone)),
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  ai_processing_consent boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No insert/delete policies: rows are created by handle_new_user and removed by the auth.users cascade.

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, timezone, currency, week_starts_on, ai_processing_consent, onboarding_completed_at)
  on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_tz text := new.raw_user_meta_data ->> 'timezone';
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    left(requested_name, 80),
    case when public.is_valid_timezone(requested_tz) then requested_tz else 'UTC' end
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- life_areas
-- ---------------------------------------------------------------------------

create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint life_areas_id_user_id_key unique (id, user_id)
);

create unique index life_areas_user_id_name_key on public.life_areas (user_id, lower(name));

create trigger life_areas_set_updated_at
  before update on public.life_areas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_types
-- ---------------------------------------------------------------------------

create table public.activity_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  life_area_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  default_unit text check (default_unit is null or char_length(default_unit) between 1 and 20),
  polarity public.activity_polarity not null default 'neutral',
  is_quick_log boolean not null default false,
  quick_log_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(quick_log_defaults) = 'object'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_types_id_user_id_key unique (id, user_id),
  constraint activity_types_life_area_fkey foreign key (life_area_id, user_id)
    references public.life_areas (id, user_id) on delete restrict
);

create unique index activity_types_user_id_name_key on public.activity_types (user_id, lower(name));
create index activity_types_life_area_id_idx on public.activity_types (life_area_id, user_id);

create trigger activity_types_set_updated_at
  before update on public.activity_types
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activities (the event log)
-- local_date, local_hour and life_area_id are derived by trigger and are
-- never recomputed when the user later changes timezone (TD-11).
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_type_id uuid not null,
  life_area_id uuid not null,
  occurred_at timestamptz not null default now() check (occurred_at >= '2000-01-01T00:00:00Z'),
  local_date date not null,
  local_hour smallint not null check (local_hour between 0 and 23),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 1440),
  quantity numeric check (quantity is null or abs(quantity) < 1e12),
  unit text check (unit is null or char_length(unit) between 1 and 20),
  energy_level smallint check (energy_level is null or energy_level between 1 and 5),
  mood smallint check (mood is null or mood between 1 and 5),
  tags text[] not null default '{}' check (public.are_valid_tags(tags)),
  note text check (note is null or char_length(note) <= 2000),
  source public.activity_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_id_user_id_key unique (id, user_id),
  constraint activities_activity_type_fkey foreign key (activity_type_id, user_id)
    references public.activity_types (id, user_id) on delete restrict,
  constraint activities_life_area_fkey foreign key (life_area_id, user_id)
    references public.life_areas (id, user_id) on delete restrict
);

create index activities_user_id_local_date_idx on public.activities (user_id, local_date);
create index activities_user_id_type_local_date_idx on public.activities (user_id, activity_type_id, local_date);
create index activities_life_area_id_idx on public.activities (life_area_id, user_id);

create function public.activities_derive_fields()
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
    tz := coalesce(tz, 'UTC');
    new.local_date := (new.occurred_at at time zone tz)::date;
    new.local_hour := extract(hour from new.occurred_at at time zone tz)::smallint;
  else
    -- Derived columns are not client-writable.
    new.local_date := old.local_date;
    new.local_hour := old.local_hour;
  end if;

  if tg_op = 'INSERT' or new.activity_type_id is distinct from old.activity_type_id then
    select t.life_area_id into new.life_area_id
    from public.activity_types t
    where t.id = new.activity_type_id and t.user_id = new.user_id;

    if new.life_area_id is null then
      raise exception 'activity type not found' using errcode = 'foreign_key_violation';
    end if;
  else
    new.life_area_id := old.life_area_id;
  end if;

  return new;
end;
$$;

create trigger activities_derive_fields
  before insert or update on public.activities
  for each row execute function public.activities_derive_fields();

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_checkins
-- ---------------------------------------------------------------------------

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_date date not null,
  sleep_hours numeric(3, 1) check (sleep_hours is null or sleep_hours between 0 and 24),
  energy smallint check (energy is null or energy between 1 and 5),
  mood smallint check (mood is null or mood between 1 and 5),
  stress smallint check (stress is null or stress between 1 and 5),
  workload smallint check (workload is null or workload between 1 and 5),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_checkins_user_id_local_date_key unique (user_id, local_date)
);

create trigger daily_checkins_set_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security for user-owned tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['life_areas', 'activity_types', 'activities', 'daily_checkins'] loop
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
