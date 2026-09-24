-- Milestone 3: detected patterns (and loops) with their lifecycle and feedback.
-- Derived data (ARCHITECTURE.md §4.1): every row can be recomputed except the
-- user-authored feedback and suppression, which persist by fingerprint.

create type public.pattern_kind as enum ('frequency', 'deviation', 'timing', 'streak', 'breaking_point', 'sequence', 'loop');
create type public.pattern_confidence as enum ('low', 'moderate', 'high', 'very_high');
create type public.pattern_status as enum ('candidate', 'presented', 'acknowledged', 'dismissed', 'resolved');
create type public.pattern_feedback as enum ('accurate', 'partially_accurate', 'not_accurate');

create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.pattern_kind not null,
  detector_key text not null check (char_length(detector_key) between 1 and 80),
  detector_version integer not null check (detector_version > 0),
  fingerprint text not null check (char_length(fingerprint) between 1 and 300),
  subject jsonb not null default '{}'::jsonb check (jsonb_typeof(subject) = 'object'),
  summary text not null check (char_length(summary) between 1 and 1000),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  observations integer not null check (observations >= 0),
  effect_size numeric not null check (effect_size between 0 and 1),
  confidence public.pattern_confidence not null,
  status public.pattern_status not null default 'candidate',
  feedback public.pattern_feedback,
  feedback_at timestamptz,
  suppressed boolean not null default false,
  window_start date not null,
  window_end date not null check (window_end >= window_start),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  presented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patterns_id_user_id_key unique (id, user_id),
  constraint patterns_user_id_fingerprint_key unique (user_id, fingerprint)
);

create index patterns_user_id_status_idx on public.patterns (user_id, status);

create trigger patterns_set_updated_at
  before update on public.patterns
  for each row execute function public.set_updated_at();

alter table public.patterns enable row level security;
create policy patterns_select_own on public.patterns for select to authenticated using ((select auth.uid()) = user_id);
create policy patterns_insert_own on public.patterns for insert to authenticated with check ((select auth.uid()) = user_id);
create policy patterns_update_own on public.patterns for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy patterns_delete_own on public.patterns for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.patterns from anon;

-- ---------------------------------------------------------------------------
-- When detection re-runs (ARCHITECTURE.md §7, §8.6)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column patterns_checked_at timestamptz,
  -- Set when source data inside the analysis window is edited or deleted.
  add column patterns_dirty boolean not null default false;

grant update (patterns_checked_at, patterns_dirty) on public.profiles to authenticated;

-- Security definer: these triggers also fire when Supabase Auth (supabase_auth_admin)
-- cascades an account deletion, and that role can't update public.profiles.
-- It only ever sets a flag on the row owner's own profile.
create function public.mark_patterns_dirty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set patterns_dirty = true
  where id = coalesce(new.user_id, old.user_id) and not patterns_dirty;
  return null;
end;
$$;

revoke all on function public.mark_patterns_dirty() from public, anon, authenticated;

-- Edits and deletions invalidate evidence; plain inserts are picked up by the daily run.
create trigger activities_mark_patterns_dirty
  after update or delete on public.activities
  for each row execute function public.mark_patterns_dirty();
create trigger tasks_mark_patterns_dirty
  after update of status, scheduled_date or delete on public.tasks
  for each row execute function public.mark_patterns_dirty();
create trigger daily_checkins_mark_patterns_dirty
  after update or delete on public.daily_checkins
  for each row execute function public.mark_patterns_dirty();

/**
 * Compare-and-set claim for a detection run. Returns true for exactly one caller
 * when detection is due (never run, dirty, or last run older than p_max_age), and
 * records the run. PostgREST requests are single transactions, so an advisory
 * lock can't span the multi-call detection; this claim replaces it.
 */
create function public.claim_pattern_detection(p_max_age interval default interval '24 hours')
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  claimed boolean;
begin
  update public.profiles
  set patterns_checked_at = now(), patterns_dirty = false
  where id = auth.uid()
    and (patterns_checked_at is null or patterns_dirty or patterns_checked_at < now() - p_max_age)
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

revoke execute on function public.claim_pattern_detection(interval) from public, anon;
grant execute on function public.claim_pattern_detection(interval) to authenticated, service_role;
