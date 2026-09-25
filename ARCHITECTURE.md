# Pattrnx — Technical Architecture

**Version:** 1.0 (post architecture review)
**Status:** Awaiting approval. This is the technical source of truth.
**Quick reference:** `ARCHITECTURE_ESSENTIALS.md`
**Product requirements:** `PRD.md`
**Product blueprint (origin):** `Docs/architecture.md`
**Review record:** `Docs/KICKOFF_REVIEW.md`

When this document and the blueprint disagree, this document wins. §19 lists
every intentional deviation from the blueprint.

---

## 1. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) everywhere | One language across UI, server and engines. Engines are unit-testable pure TS. |
| Framework | Next.js (current stable, App Router), React Server Components, Server Actions | Server-rendered by default, few client bundles, and mutations without a hand-written REST layer. The blueprint recommends it. |
| Styling/UI | Tailwind CSS + shadcn/ui (copied-in components on Radix primitives) | Accessible primitives without a heavy component dependency. The components are owned code. |
| Database | PostgreSQL via Supabase | Relational fits the domain model. Row-Level Security gives database-level tenant isolation. |
| Auth | Supabase Auth (email+password, magic link) via `@supabase/ssr` cookies | Same platform as the DB. `auth.uid()` drives RLS directly. |
| Data access | `@supabase/supabase-js` with generated types, and SQL for non-trivial reads (Postgres functions/views) | No ORM layer to keep in sync with RLS. Queries run as the user, so RLS always applies. |
| Migrations | Supabase CLI SQL migrations (`supabase/migrations`) | Plain SQL is reviewable and covers RLS policies, functions and constraints. |
| Validation | Zod | One schema validates server-action input and infers TS types. |
| Dates/timezones | `date-fns` + `@date-fns/tz` | Local-date maths across user timezones is central to every engine. |
| Charts | Hand-written SVG components (bars, weekday heatmap, plan-vs-reality strip) | The MVP needs 3 simple charts. Revisit a library when the P2 visualizations arrive. |
| Background work | None required for correctness. Optional Vercel Cron → protected route handler | See §7. Lazy, on-demand computation avoids queue infrastructure. |
| AI (P2) | Provider adapter in `src/server/ai`. Default: Anthropic Claude via official SDK, model id from env | Off by default. The MVP doesn't depend on it. |
| Hosting | Vercel (app, functions in London `lhr1`) + Supabase Cloud (DB/Auth, London `eu-west-2`) | Managed, low-ops, with preview deployments per PR. Region per Q1 (ADR 0001). |
| Monitoring | Vercel logs + structured JSON logging. Sentry, server errors only, scrubbed (`src/instrumentation.ts`, ADR 0001) | Enough for the beta. No behavioral content in logs. |
| Testing | Vitest (unit/integration), Playwright (e2e), Supabase local stack for RLS/integration | See §12. |
| CI/CD | GitHub Actions: typecheck, lint, unit, integration (local Supabase), e2e smoke. Vercel deploys | See §15. |
| Package manager | pnpm | Fast, strict dependency resolution. |

Deliberately **not** used in the MVP: a separate backend service, a message queue,
a separate analytics store, Redis, an ORM, a state-management library, a charting
library, a graph database. §18 records the reasoning for each.

## 2. System Architecture

A **modular monolith**: one Next.js application, one Postgres database.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Browser (mobile-first responsive)                                │
│   Server-rendered pages + small client islands (log sheet, forms)│
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTPS (RSC payloads, Server Actions, route handlers)
┌───────────────▼──────────────────────────────────────────────────┐
│ Next.js app (Vercel)                                             │
│                                                                  │
│  src/app        routes, layouts, route handlers (cron, export)   │
│  src/features   per-feature UI + server actions (thin)           │
│  src/server                                                      │
│    services/    orchestration: load → engine → persist          │
│    engines/     PURE functions: feasibility, progress, patterns, │
│                 loops, experiments, interventions catalog        │
│    db/          Supabase clients (user-scoped, service-role)     │
│    ai/          (P2) LLM adapter, prompt builders, guardrails    │
└───────────────┬──────────────────────────────────────────────────┘
                │ PostgREST / SQL over TLS, as the signed-in user
┌───────────────▼──────────────────────────────────────────────────┐
│ Supabase                                                         │
│   Postgres: domain tables, RLS policies, SQL functions/views     │
│   Auth: users, sessions, email                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Layering rules

```text
app / features  →  services  →  engines (pure)
                       ↓
                      db
```

- **Engines** import nothing from `db`, `services`, Next.js or Supabase. Input is
  plain typed data, output is plain typed data. This is the most important
  boundary in the codebase: it makes the intelligence layer testable, deterministic
  and portable to a worker later.
- **Services** are the only code that both reads/writes the DB and calls engines.
- **Server actions and route handlers** authenticate, validate input with Zod,
  call one service function, and map the result to UI state. No business logic.
- **Client components** never import from `src/server`.

### 2.2 The feedback loop mapped to components

| Blueprint loop stage | Where it lives |
|---|---|
| Define / Plan | `features/goals`, `features/routines`, feasibility engine |
| Execute / Observe | `features/today`, `features/activities`, `tasks`, `activities`, `daily_checkins` tables |
| Analyze | `engines/progress`, `engines/patterns/*`, `engines/loops` |
| Intervene | `engines/interventions` (catalog), `features/reviews` |
| Experiment / Learn | `engines/experiments`, `features/experiments` |
| Adapt | Routine/goal edits and the recalibration flow (J5) |

## 3. Application Structure

```text
.
├── PRD.md  ARCHITECTURE.md  ARCHITECTURE_ESSENTIALS.md  AGENTS.md  FLOAT.md  CLAUDE.md
├── Docs/
│   ├── architecture.md          product blueprint (origin document; not edited)
│   ├── KICKOFF_REVIEW.md        stress test, risks, edge cases, readiness checklist
│   └── decisions/               ADRs for decisions made after kickoff
├── src/
│   ├── app/
│   │   ├── (marketing)/         landing page (public)
│   │   ├── (auth)/              login, signup, forgot/reset password, check-email
│   │   ├── auth/confirm/        route handler for every auth email link (token_hash → session)
│   │   ├── (app)/               authenticated shell
│   │   │   ├── today/
│   │   │   ├── goals/           list, [goalId] (health, milestones, actions)
│   │   │   ├── routines/
│   │   │   ├── log/             activity history + activity types
│   │   │   ├── patterns/
│   │   │   ├── experiments/
│   │   │   ├── reviews/         [periodStart]
│   │   │   ├── onboarding/
│   │   │   └── settings/        profile, life areas, data (export/delete)
│   │   └── api/
│   │       ├── cron/weekly/     optional pre-generation (CRON_SECRET)
│   │       ├── export/          JSON export (user session)
│   │       └── health/          liveness
│   ├── features/<feature>/
│   │   ├── components/          feature UI
│   │   ├── actions.ts           server actions ('use server'), thin
│   │   └── schemas.ts           Zod input schemas
│   ├── components/ui/           shared primitives (shadcn/ui), charts/
│   ├── server/
│   │   ├── db/                  client factories, generated types (database.types.ts),
│   │   │                        database.ts (typed overrides; import `Database` from here)
│   │   ├── services/            one module per aggregate (goals, tasks, patterns, …)
│   │   ├── engines/             pure domain logic, colocated *.test.ts
│   │   │   ├── feasibility/
│   │   │   ├── progress/
│   │   │   ├── patterns/        one file per detector + confidence.ts + registry.ts
│   │   │   ├── loops/
│   │   │   ├── experiments/
│   │   │   ├── interventions/   static catalog
│   │   │   └── language/        summary templates + wording guard
│   │   ├── ai/                  (P2)
│   │   └── auth/                getUser / requireUser, route groups, CSP builder
│   ├── lib/                     framework-agnostic utilities (dates, env, redirects, result types)
│   ├── types/                   shared domain types (engine I/O)
│   └── proxy.ts                 Next 16 "proxy" (formerly middleware): CSP nonce, session refresh, auth redirects
├── supabase/
│   ├── config.toml
│   ├── migrations/              timestamped SQL, the only way the schema changes
│   ├── seed.sql                 local dev seed (demo user)
│   ├── templates/               auth email templates (links point at /auth/confirm)
│   └── tests/database/          pgTAP tests (RLS, triggers, constraints)
├── tests/
│   ├── e2e/                     Playwright journeys J1–J6
│   ├── integration/             services and API paths against local Supabase
│   ├── support/                 local Supabase + Mailpit helpers for tests
│   └── fixtures/behavior/       synthetic behavior datasets for engine tests
├── scripts/                     dev/CI helpers (local-env.sh)
└── .github/                     CI workflow, Dependabot
```

## 4. Data Architecture

### 4.1 Principles

1. **Every user-owned row has `user_id uuid not null references auth.users on
   delete cascade`.** RLS policy on every table: `user_id = auth.uid()` for
   select/insert/update/delete. Deleting the auth user deletes everything (F15).
   Table privileges are explicit per table and role (no reliance on Supabase's
   default grants, which hosted projects dropped in 2026): `authenticated` and
   `service_role` get only the DML the app uses, `anon` gets nothing
   (`20260928090000_explicit_grants.sql`, checked by `grants.test.sql`).
2. **Source vs derived.** Source tables (goals, routines, tasks, activities,
   check-ins, outcomes, experiments' user inputs) are the truth. Derived tables
   (`patterns`, `reviews`) can always be recomputed and may be deleted freely.
3. **Activities are the event log.** The blueprint's separate `events` table and
   analytics store are not needed at MVP scale (§19). Activities are append-mostly
   and timestamped.
4. **`local_date` is stored** on activities, tasks, outcomes and check-ins,
   computed from the user's timezone at write time. For activities a `before
   insert or update` trigger derives `local_date`, `local_hour` and `life_area_id`
   and ignores client-supplied values, so they can't be forged or drift. Changing timezone later doesn't
   retroactively move history (a "Tuesday" stays Tuesday).
5. **Enums are Postgres enums** where the set is closed and referenced by engine
   code. Adding a value is a migration plus an engine change.
6. `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not
   null default now()`, and `updated_at` maintained by a trigger on every mutable
   table.

### 4.2 Entity relationships

```text
auth.users 1─1 profiles
profiles   1─* life_areas 1─* goals 1─* goal_strategies
                          │         1─* milestones 1─* actions
                          │         1─* outcomes
                          1─* activity_types 1─* activities
profiles   1─* routines 1─* routine_steps
routines   1─* tasks        actions 1─* tasks        tasks 1─0..1 activities
profiles   1─* daily_checkins
profiles   1─* patterns 0..1─* experiments *─0..1 goals
profiles   1─* reviews
```

### 4.3 Schema

Types are Postgres. `user_id`, `id`, `created_at`, `updated_at` are omitted below
except where notable. The migrations are the executable definition.

#### Enums

```sql
create type measurement_type   as enum ('cumulative','level','milestone');
create type goal_status        as enum ('draft','active','paused','completed','abandoned');
create type milestone_status   as enum ('pending','in_progress','done','dropped');
create type action_status      as enum ('open','done','dropped');
create type task_status        as enum ('planned','done','done_minimum','skipped');   -- 'missed' is derived (BR-4)
create type task_source        as enum ('manual','action','routine');
create type activity_polarity  as enum ('desired','undesired','neutral');
create type activity_source    as enum ('manual','task','import');
create type outcome_valence    as enum ('positive','negative','neutral','unknown');
create type pace_period        as enum ('day','week','month');
create type pattern_kind       as enum ('frequency','deviation','timing','streak','breaking_point','sequence','loop');
create type pattern_confidence as enum ('low','moderate','high','very_high');
create type pattern_status     as enum ('candidate','presented','acknowledged','dismissed','resolved');
create type pattern_feedback   as enum ('accurate','partially_accurate','not_accurate');
create type intervention_category as enum ('reduce','reschedule','sequence','replace','remove_friction',
                                           'add_friction','environment','accountability','strategy_change','goal_recalibration');
create type experiment_metric  as enum ('task_completion_rate','active_days','activity_minutes','activity_quantity');
create type metric_direction   as enum ('increase','decrease');
create type experiment_status  as enum ('active','completed','abandoned');
create type experiment_outcome as enum ('improved','no_change','worsened','inconclusive');
```

#### profiles

| Column | Type | Notes |
|---|---|---|
| id | uuid PK → auth.users | 1:1, created by trigger on sign-up |
| display_name | text | |
| timezone | text not null default 'UTC' | IANA name. Validated against `pg_timezone_names` |
| currency | char(3) not null default 'NGN' | ISO 4217 |
| week_starts_on | smallint not null default 1 | 0=Sun … 6=Sat |
| ai_processing_consent | boolean not null default false | F16 gate |
| onboarding_completed_at | timestamptz | |

#### life_areas

`name text not null`, `color text`, `sort_order int`, `archived_at timestamptz`.
Unique `(user_id, lower(name))`.

#### goals

| Column | Type | Notes |
|---|---|---|
| life_area_id | uuid not null → life_areas **on delete restrict** | |
| title | text not null (1–120) | |
| description, motivation | text | |
| measurement_type | measurement_type not null | |
| unit | text | required unless `milestone` (check) |
| baseline_value | numeric | "current state" at start. Required unless `milestone` |
| target_value | numeric | required unless `milestone`. Must differ from baseline |
| current_state_text, target_state_text | text | qualitative descriptions (blueprint §6) |
| start_date | date not null default (local today) | |
| deadline | date | nullable. Check `deadline > start_date` |
| planned_pace_amount | numeric | user's stated pace, e.g. 150000 |
| planned_pace_period | pace_period | required iff amount set |
| priority | smallint not null default 2 | 1 high, 2 normal, 3 low |
| status | goal_status not null default 'active' | |
| self_confidence | smallint | 1–5, user-rated |
| status_changed_at | timestamptz | used by the plan-abandon loop detector |

Index `(user_id, status)`.

#### goal_strategies

`goal_id → goals on delete cascade`, `description text not null`, `sort_order int`.

#### milestones

`goal_id → goals cascade`, `title`, `description`, `target_date date`,
`sort_order`, `status milestone_status default 'pending'`, `completed_at`.

#### actions

`goal_id → goals cascade (not null)`, `milestone_id → milestones on delete set
null`, `title not null`, `activity_type_id → activity_types set null`,
`estimated_minutes int`, `status action_status default 'open'`, `completed_at`.
One-off only. Recurrence belongs to routines (§19).

#### routines

| Column | Type | Notes |
|---|---|---|
| name | text not null | |
| goal_id | uuid → goals set null | optional |
| activity_type_id | uuid not null → activity_types restrict | the activity created on completion. The routine's life area is its activity type's (not stored twice) |
| days_of_week | smallint[] not null | values 0–6, non-empty, no duplicates (check) |
| preferred_time | time | local |
| normal_minutes | int not null | > 0 |
| minimum_minutes | int | ≤ normal_minutes |
| fallback_description | text | "the minimum version" in words |
| active_from | date not null | |
| paused_at, archived_at | timestamptz | |

#### routine_steps

`routine_id → routines cascade`, `title not null`, `minutes int`, `sort_order`.
The MVP tracks completion at routine level, not per step.

#### tasks

| Column | Type | Notes |
|---|---|---|
| title | text not null | copied from routine/action at generation |
| source | task_source not null | |
| routine_id | uuid → routines cascade | |
| action_id | uuid → actions cascade | |
| goal_id | uuid → goals set null | denormalized for goal queries |
| activity_type_id | uuid → activity_types restrict | copied from the routine/action. What completion logs (none for manual tasks) |
| scheduled_date | date not null | user-local |
| scheduled_time | time | |
| planned_minutes | int | |
| minimum_minutes | int | copied from routine |
| status | task_status not null default 'planned' | |
| completed_at | timestamptz | |

Constraints: unique `(routine_id, scheduled_date)` (NULLs never conflict;
idempotent generation, FR-3). Unique `action_id` (an action is scheduled at most
once; rescheduling moves the task). Check: `source` matches exactly one of
`routine_id` / `action_id` / neither.

Status changes go through the SQL function `set_task_status(task_id, status)`
(invoker rights, so RLS applies). In one transaction it updates the task, replaces
its evidence activity (created for done/done_minimum when the task has an activity
type, and logged on the task's own day if completed late), and keeps the source
action's status in step. Future tasks can't be completed or skipped.
Indexes: `(user_id, scheduled_date)`, `(user_id, goal_id, scheduled_date)`.

#### activity_types

`name not null`, `life_area_id not null → life_areas restrict`, `default_unit
text`, `polarity activity_polarity not null default 'neutral'`, `is_quick_log bool
default false`, `quick_log_defaults jsonb` (e.g. `{"duration_min":30}`),
`archived_at`. Unique `(user_id, lower(name))`.

#### activities

| Column | Type | Notes |
|---|---|---|
| activity_type_id | uuid not null → activity_types restrict | |
| life_area_id | uuid not null | derived from the type by trigger |
| goal_id | uuid → goals set null | added with the goals migration (M2) |
| task_id | uuid → tasks **on delete cascade**, unique | FR-4: at most one activity per task. Added with the tasks migration (M2) |
| occurred_at | timestamptz not null default now() | ≤ now() + 5 min (enforced by trigger), ≥ 2000-01-01 |
| local_date | date not null | derived by trigger from profile tz |
| local_hour | smallint not null | 0–23, for timing detectors |
| duration_minutes | int | 0–1440 |
| quantity | numeric | e.g. money amount |
| unit | text | defaults from type |
| energy_level, mood | smallint | 1–5 |
| tags | text[] not null default '{}' | |
| note | text | ≤ 2000 chars. Never logged |
| source | activity_source not null default 'manual' | |

Indexes: `(user_id, local_date)`, `(user_id, activity_type_id, local_date)`.

#### daily_checkins

`local_date date not null`, `sleep_hours numeric(3,1)` (0–24), `energy`, `mood`,
`stress`, `workload` smallint 1–5, `note`. Unique `(user_id, local_date)`.

#### outcomes

`goal_id → goals cascade` (required), `activity_id → activities set null`,
`occurred_at`, `local_date` (derived by trigger, like activities), `value numeric` (the delta for cumulative goals, the reading for
level goals), `valence outcome_valence default 'unknown'`, `description`.
Index `(user_id, goal_id, local_date)`.

Goal current value: `cumulative` = baseline + Σ value. `level` = latest value by
`occurred_at`, else baseline. `milestone` = milestones done ÷ milestones not dropped.

#### patterns (derived)

| Column | Type | Notes |
|---|---|---|
| kind | pattern_kind not null | |
| detector_key | text not null | e.g. `timing.weekday` |
| detector_version | int not null | bump when logic changes |
| fingerprint | text not null | `detector_key:subject ids`, e.g. `timing.weekday:<routine>:3`. Unique `(user_id, fingerprint)` |
| subject | jsonb not null | `{activity_type_id?, routine_id?, goal_id?, life_area_id?}` |
| summary | text not null | rendered by the language module |
| evidence | jsonb not null | detector-specific, schema-versioned (§8.3) |
| observations | int not null | |
| effect_size | numeric | detector-specific, normalized 0–1 |
| confidence | pattern_confidence not null | |
| status | pattern_status not null default 'candidate' | lifecycle, F12 |
| feedback | pattern_feedback | |
| suppressed | boolean not null default false | "Don't show again" |
| window_start, window_end | date not null | |
| first_detected_at, last_detected_at, presented_at, feedback_at | timestamptz | |

`profiles.patterns_checked_at` and `profiles.patterns_dirty` decide when detection
re-runs (§7, §8.6).

Loops are patterns with `kind='loop'`. Their evidence holds the cycles.

#### experiments

| Column | Type | Notes |
|---|---|---|
| goal_id | uuid → goals set null | |
| pattern_id | uuid → patterns set null | origin, optional |
| title, hypothesis | text not null | |
| intervention_category | intervention_category not null | |
| intervention_description | text not null | |
| metric | experiment_metric not null | |
| metric_subject | jsonb not null | `{activity_type_id}` or `{routine_id}` or `{goal_id}` |
| direction | metric_direction not null | |
| start_date, end_date | date not null | 7–42 days (check) |
| baseline_start, baseline_end | date not null | equal-length window before start |
| baseline_value | numeric | computed at start |
| baseline_observed_days | int | |
| result_value | numeric | computed at end |
| result_observed_days | int | |
| suggested_outcome | experiment_outcome | engine |
| outcome | experiment_outcome | user-confirmed |
| status | experiment_status not null default 'active' | |
| reflection | text | |

BR-7 is enforced in the database: a partial unique index `(goal_id) where
status='active'`, and a trigger (`experiments_enforce_active_limit`) for at most two
active per user. Duration (7–42 days) and "the baseline is the equal-length window
right before the start" are check constraints. An experiment stays `active` past its
end date until the user confirms the outcome. The result is stored at confirmation.

#### reviews (derived snapshot)

`period text not null default 'week'`, `period_start date`, `period_end date`,
`content jsonb not null` (versioned snapshot), `engine_version int`,
`generated_at`, `viewed_at` (drives the "review ready" banner on Today),
`reflection text`, `usefulness smallint` (1–5, F13 metric). Unique `(user_id,
period, period_start)`. Content is capped at 64 KB (SR-4).

#### rate_limits

Fixed-window counters `(user_id, action, window_start, count)`. Written only by
`hit_rate_limit(p_action)`, which is `security definer` and defines each action's
limit itself (export: 5/hour). Callers can't pass a window or maximum (SR-1).

`patterns.vars` (M4) stores each pattern's template values, so interventions can
be built from stored rows. Client-writable JSON columns all carry
`pg_column_size` caps (SR-4).

### 4.4 Data ownership and lifecycle

- All data belongs to the user. There are no shared or cross-user tables in the
  MVP except static seed data (default life area names and the intervention
  catalog, both in code).
- Deleting a goal cascades to its strategies, milestones, actions, action tasks
  and outcomes. Activities keep existing (`goal_id` set null) because they happened
  regardless.
- Life areas and activity types are archived, never deleted, once referenced
  (`restrict` FKs).
- Deleting an activity marks overlapping patterns `stale` (§8.6).

## 5. API Architecture

### 5.1 Surfaces

| Surface | Used for | Auth |
|---|---|---|
| Server Components | All reads for pages (call services directly) | Session cookie → user-scoped Supabase client |
| Server Actions (`features/*/actions.ts`) | All UI mutations | Same. Next.js built-in Origin check (CSRF) |
| Route handler `GET /api/export` | JSON export download | Session |
| Route handler `POST /api/cron/weekly` | Optional review pre-generation | `Authorization: Bearer $CRON_SECRET`, service-role client, processes users in batches |
| Route handler `GET /api/health` | Uptime check | Public, no data |

The blueprint's REST resource list (§51) maps onto service modules
one-to-one (`services/goals.ts` ↔ `/goals`, etc.). When a native client arrives
(Q4), route handlers under `/api/v1/*` wrap the **same service functions**. No
logic moves.

### 5.2 Server action contract

```ts
// every action follows this shape
export async function createGoal(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();                 // 401 → redirect to login
  const parsed = createGoalSchema.safeParse(input); // 400 → field errors
  if (!parsed.success) return fail('validation', parsed.error.flatten());
  return goalsService.create(user, parsed.data);    // domain errors → typed failures
}

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: 'validation' | 'not_found' | 'conflict' | 'limit' | 'unexpected';
                          message: string; fields?: Record<string, string[]> } };
```

- Actions never throw to the client for expected failures. Unexpected errors are
  logged with a request id and returned as `unexpected` with a generic message.
- `revalidatePath` / `revalidateTag` after mutations. No client cache library.

### 5.3 Main service operations

| Service | Operations |
|---|---|
| profile | get, update (tz/currency/week start/consent), completeOnboarding |
| lifeAreas | list, create, rename, reorder, archive |
| goals | create (returns feasibility), update, setStatus, recalibrate, getHealth(goalId), list with health |
| strategy/milestones/actions | CRUD, reorder, scheduleAction(date) → task |
| routines | CRUD, pause/resume, archive, `ensureRoutineTasks(user)` (idempotent upsert over the generation window) |
| tasks | getDayPlan (today + previous 6 days), setTaskStatus via SQL `set_task_status` (FR-4), manual tasks |
| activityTypes | CRUD, archive, quick-log list |
| activities | log (client-generated UUID as idempotency key), update, delete, list(range) |
| checkins | upsert(localDate), get(range) |
| outcomes | log, list(goal) |
| patterns | detect(user) → upsert, listVisible, feedback, suppress |
| experiments | start (computes baseline), abandon, evaluate (on/after end date), confirm |
| reviews | getOrGenerate(user, weekStart), regenerate, saveReflection |
| data | export(user), deleteAccount(user) |

## 6. Authentication and Authorization

- **Authentication:** Supabase Auth. Email + password (min 10 chars, checked
  against the leaked-password list, a Supabase setting) with required email
  verification, and magic-link sign-in. Session in httpOnly, Secure, SameSite=Lax
  cookies via `@supabase/ssr`. `src/proxy.ts` (Next 16's renamed middleware) refreshes
  the session on each request with `auth.getClaims()` and handles auth redirects.
  Every auth email links to `/auth/confirm` (token_hash flow), which exchanges the
  token for a session cookie. Magic links never create accounts
  (`shouldCreateUser: false`), and sign-up, magic-link and reset responses are
  identical for known and unknown emails (no account enumeration).
- **Session policy:** access token 1 h, refresh token rotation on, reuse detection
  on. Inactivity timeout 30 days, absolute 90 days (Supabase session settings).
  Sign out = revoke refresh token. "Sign out everywhere" on password change and
  account deletion.
- **Roles:** a single `authenticated` user role. No admin UI. Operator access uses
  the Supabase dashboard with MFA, and is audited.
- **Authorization:** RLS is the enforcement point. Every table has four policies
  (`select/insert/update/delete`) with `user_id = auth.uid()`, and insert policies
  also check `with check (user_id = auth.uid())`. Cross-table FKs are validated by
  RLS too: inserting an activity with someone else's `activity_type_id` fails
  because the policy-filtered FK target isn't visible. To make this explicit,
  composite FKs `(id, user_id)` are used on all user-owned references.
- **Service role:** used only in `/api/cron/weekly` and `data.deleteAccount`.
  Imported only from `src/server/db/admin.ts`, which a lint rule forbids importing
  anywhere else.
- `requireUser()` uses `supabase.auth.getUser()` (server-verified), never
  `getSession()` from cookies alone.

## 7. Processing Strategy (sync, lazy, scheduled)

The blueprint layers processing into real-time / daily / weekly / monthly. The MVP
keeps that layering without a job system:

| Work | When | How |
|---|---|---|
| Task completion, activity logging, goal progress, feasibility, health | Request time | Direct SQL + pure engines. Cheap at single-user scale |
| Routine task materialization (today − 30 … today + 7) | On Today load and after routine edits | `routines.ensureRoutineTasks`, an idempotent upsert. Backfilling means days the user didn't open the app still count as planned (then missed, BR-4). Resuming a paused routine moves `active_from` to today so paused days are never backfilled. Editing a routine regenerates today's and future planned tasks only (`engines/schedule/occurrences.ts`) |
| Pattern detection | Lazy: on Patterns/Today/Review load when never run, `patterns_dirty`, or last run > 24 h. Bounded to 90 days (loops: 180) | `patterns.refreshPatterns(user)`, < 2 s budget |
| Weekly review | Lazy on first visit after the week ends. Optionally pre-generated by the daily cron for users whose local week just ended | `reviews.getOrGenerate`, protected by the unique constraint |
| Experiment evaluation | Lazy on load after `end_date` | `experiments.evaluate` |

Concurrency: detection starts with the SQL function `claim_pattern_detection()`, a
compare-and-set on the profile that returns true for exactly one caller while a
run is due. (An advisory lock can't work here: every PostgREST request is its own
transaction, so the lock would be released before the multi-call run.) Writes are
upserts on unique keys, so a lost race is harmless.

**When to add a queue** (Trigger.dev/Inngest, per the blueprint): integrations
arrive (Phase 4), per-user detection exceeds ~2 s, or notifications need scheduled
delivery. Because engines are pure and services are the only orchestrators, moving
`patterns.detect` into a worker is a relocation, not a rewrite.

## 8. Intelligence Layer (engines)

All engines are deterministic, pure and versioned (`ENGINE_VERSION` per module).
They receive a **UserSnapshot** built by the service:

```ts
interface UserSnapshot {
  today: LocalDate;               // in user tz
  weekStartsOn: 0|1|2|3|4|5|6;
  goals: GoalInput[];             // incl. milestones, outcomes, planned pace
  routines: RoutineInput[];
  tasks: TaskInput[];             // window, with derived status incl. 'missed'
  activities: ActivityInput[];    // window
  activityTypes: ActivityTypeInput[];
  checkins: CheckinInput[];       // window
  history: { firstActivityDate: LocalDate | null; goalStatusChanges: ...; routineLifecycle: ... };
}
```

### 8.1 Feasibility engine (`engines/feasibility`)

For `cumulative` and `level` goals with a deadline:

```text
direction      = sign(target − baseline)
remaining      = |target − current|
daysLeft       = deadline − today            (≤ 0 → "deadline passed" state)
requiredPace   = remaining / daysLeft        (normalized to the goal's pace period)
historicalPace = direction-adjusted progress over the last min(60, daysSinceStart) days,
                 only if ≥ 14 days since start AND ≥ 3 outcomes
paceUsed       = historicalPace ?? plannedPace ?? none
ratio          = paceUsed / requiredPace   → bands per BR-5
gap            = requiredPace − paceUsed
```

For `milestone` goals: `ratio = milestoneProgress / timeElapsedFraction`, needing
≥ 2 counted milestones and ≥ 25% of the time elapsed. Otherwise Insufficient data.

Beyond the BR-5 bands the engine also returns `target_reached` and
`deadline_passed`. Paces are expressed per the goal's planned-pace period (default:
month for numeric goals). Required pace per month uses calendar months, so the
blueprint example is exactly ₦266,667/month.

Output: `{ state, insufficientReason, period, current, remaining, daysLeft, ratio,
requiredPace, paceUsed, paceSource: 'historical'|'planned'|null, gap, adjustments }`.
The UI turns this into sentences in `features/goals/feasibility-copy.ts`. `adjustments`
are computed, not generic: the deadline that would make the current pace feasible,
the target reachable by the deadline at the current pace, and the pace increase
needed.

### 8.2 Progress & health engine (`engines/progress`)

- Outcome progress = (current − baseline) / (target − baseline), clamped to 0–1.
- Execution consistency = done (incl. done_minimum at weight 1) ÷ planned tasks for
  the goal over the last 28 days. Skipped counts as not done. Future tasks are
  excluded.
- Milestone progress, time elapsed.
- Health per BR-6, with a `primaryReason` code the UI maps to copy.
- Plan-vs-reality strip: per ISO week, planned count vs done count.

### 8.3 Pattern detectors (`engines/patterns`)

Each detector implements (`engines/patterns/types.ts`):

```ts
interface Detector {
  key: string; kind: PatternKind; version: number;
  minEffect: number;                                   // halves must reach half of it (§8.4)
  detect(s: PatternSnapshot): Candidate[];             // subject, observations, effectSize, z, comparisons, evidence, vars
  effectFor(s: PatternSnapshot, c: Candidate): number | null;  // same measure on a sub-window
  confidence?(c: Candidate): Confidence;               // loops: counted cycles, not a sample
}
```

The snapshot is built by `services/patterns.buildSnapshot`: 90 days of tasks,
activities and check-ins, plus 180 days of goal/routine lifecycle for loops. Only
*due* tasks count (earlier days, or today if finished). Activities logged over a
day after they happened are flagged `backfilled`, and their hour is ignored.

| Key | Kind | What it measures | Candidate when | Test |
|---|---|---|---|---|
| `frequency.sustainable_rate` | frequency | Pooled completion of a routine over 7-day blocks (Goal Reality Model, blueprint §22). Suggests a sustainable weekly count | ≥ 4 blocks, ≥ 2 planned/week, completion ≤ 70% | rule |
| `deviation.overplanning` | deviation | Completion on heavier vs lighter days, split at the planned-minutes cut that best balances the two groups | ≥ 20 days, ≥ 5 per group, ≥ 20 pp lower on heavy days | two-proportion |
| `timing.weekday` | timing | A routine's weakest weekday vs all its other weekdays | ≥ 3 sessions per weekday compared, ≥ 30 pp | two-proportion, family = every weekday of every routine |
| `timing.hour_band` | timing | Share of a desired type's entries in morning / afternoon / evening / night | ≥ 15 entries, one band ≥ 60% | exact binomial, family = bands × types |
| `breaking_point.run_end` | breaking_point | Miss rate at each position in a streak (the k-th session after k−1 done) vs the routine's overall miss rate. Memoryless noise has the same rate everywhere | position after ≥ 2 done, ≥ 6 sessions there, ≥ 30 pp above overall | exact binomial, family = every position of every routine |
| `sequence.checkin_conditioned` | sequence | Next-day completion after workload ≥ 4 or stress ≥ 4 (same day for sleep < 6 h) vs otherwise | ≥ 6 days each, ≥ 20 pp | two-proportion, family = 3 conditions |
| `sequence.activity_follows` | sequence | Share of type A entries followed by an undesired type B within 24 h vs the share of days with B | A ≥ 6, ≥ 4 follows, lift ≥ 1.5, ≥ 20 pp | exact binomial, family = all (A, B) pairs |
| `loop.plan_abandon_replan` | loop | A goal paused/abandoned (or routine paused/archived) followed by a new goal or routine in the same area, created from 7 days before to 30 days after | ≥ 2 cycles in 180 days (BR-3) | count: 2 moderate, 3 high, 4+ very high |

The blueprint's separate `streak.run_length` detector is folded into
`breaking_point.run_end`, whose evidence carries the per-position table.

### 8.4 Confidence scoring (`engines/patterns/confidence.ts`)

Confidence comes from the observation count `n`, `effectSize` (0–1), a
**significance test**, and **split-half consistency**. The detector's measure is
recomputed on each half of the window, and both halves must reach at least half
the detector's minimum effect.

```text
significant : z ≥ criticalZ(α / comparisons), α = 0.01 (Bonferroni over the detector's whole family)
very_high   : significant AND n ≥ 30 AND effect ≥ 0.35 AND consistent AND window ≥ 56 days
high        : significant AND n ≥ 16 AND effect ≥ 0.25 AND consistent
moderate    : significant AND n ≥ 8  AND effect ≥ 0.20
low         : otherwise (stored, never shown: BR-2)
```

The significance test is an addition to the kickoff design. Without it, the fixture
noise users surfaced chance findings. For example, the worst of seven random
weekdays often differs by 30 pp at about 13 observations each. Two-proportion tests
use Yates' continuity correction, and share-vs-expected tests use the exact
binomial tail. At small n, the normal approximation overstates evidence.

Further multiple-comparisons control: at most 3 patterns per review and 1 on Today,
ranked by `confidenceRank × effectSize`. All thresholds live in `thresholds.ts`.

**Calibration** (`pnpm test:robustness`, asserted): 7 of 300 structureless users
(2.3%, limit 3%) see any pattern. Each planted pattern is found in 28–30 of 30 seeds
(limit 90%). Re-run it after changing any threshold or detector.

### 8.5 Interventions catalog (`engines/interventions`)

A static, versioned map `detector_key → InterventionTemplate[]`. Each template
fills in an experiment draft: category, hypothesis template, intervention
description template, metric, subject, direction and default duration. Examples:

| Detector | Suggested experiment |
|---|---|
| `frequency.sustainable_rate` | *Reduce*: plan the routine on {actualRate} days for 21 days. Metric: task_completion_rate ↑ |
| `breaking_point.run_end` | *Reduce*: use the minimum version on day {breakDay} for 21 days. Metric: task_completion_rate ↑ |
| `timing.weekday` | *Reschedule*: move {routine} off {worstDay} for 14 days |
| `deviation.overplanning` | *Reduce*: cap planned minutes/day at {median} for 14 days |
| `sequence.checkin_conditioned` | *Reduce*: auto-switch to minimum version on high-workload days for 21 days |
| `sequence.activity_follows` | *Add friction / Replace*: plan an alternative after {A} for 14 days. Metric: activity_quantity of {B} ↓ |
| `loop.plan_abandon_replan` | *Goal recalibration*: keep the existing goal, halve its pace for 28 days, no new goals in {area} |

Implemented in `engines/interventions/catalog.ts` (one draft per detector, every
draft passes `wordingGuard`). No database table is needed. A suggestion pre-fills
`/experiments/new?patternId=…`, and the weekly review offers the top pattern's
suggestion.

### 8.6 Staleness and recomputation

- Editing or deleting an activity, task (status or date) or check-in sets
  `profiles.patterns_dirty` via triggers (`security definer`, because they also fire
  during Supabase Auth's account-deletion cascade). Plain inserts wait for the daily
  run.
- The next detection run re-evaluates everything. Patterns no longer detected move
  to `resolved`. Re-detected resolved ones return to `candidate`. Dismissed and
  suppressed fingerprints stay hidden (BR-9). Feedback persists by fingerprint.
- Reviews are snapshots and are never silently rewritten. The review page shows
  "data changed since this review was generated" when any source row in the period
  was updated after `generated_at`, with an explicit regenerate button.

### 8.7 Experiment engine (`engines/experiments`)

- `metricValue(snapshot, metric, subject, range)` is one function, used for both
  baseline and result (FR-9).
- `task_completion_rate`: done ÷ planned in range. `active_days`: days with ≥ 1
  activity of type. `activity_minutes` / `activity_quantity`: sum ÷ days in range
  (per-day rate, so windows compare fairly).
- An *observed day* is a day with any task or activity (evidence the user was
  tracking). Tasks from today that are still planned aren't counted as missed.
- Suggested outcome: inconclusive if either window has < 5 observed days (BR-8).
  Otherwise relative change in the desired direction ≥ 15% → improved, ≤ −15% →
  worsened, else no_change. The copy stays cautious ("during the experiment,
  completion was higher than before"), with no causal claims (BR-1).

### 8.8 Language module (`engines/language`)

- All user-facing pattern and review sentences come from templates keyed by
  `detector_key` and `confidence`. Phrasing gets more tentative at lower confidence.
- `wordingGuard(text)` rejects forbidden constructions (BR-1). A unit test runs
  every template with fixture values through the guard, so a template that breaks
  BR-1 fails CI.

## 9. AI Layer (P2 — designed now, built later)

- Sits **after** the engines (blueprint §40). The LLM receives a minimized JSON
  evidence bundle (pattern summaries, counts, dates, activity type names), never
  raw notes, and never has database or tool access to user data.
- Gated by `profiles.ai_processing_consent` and the `FEATURE_AI` env flag.
- Outputs are treated as untrusted: schema-validated (Zod), passed through
  `wordingGuard`, and rendered as plain text. On any failure, fall back to the
  deterministic template.
- Per-user daily quota (a Postgres counter table added with the feature) and a
  global spend cap.
- Provider behind an interface `LlmClient { complete(prompt, schema) }`. Model id
  comes from `AI_MODEL` env.
- Prompts are versioned in code, and every AI-generated text stores
  `{prompt_version, model}` for traceability.

## 10. Security

Baseline: OWASP ASVS Level 1 before closed beta, Level 2 items for auth/session
and data protection before public launch. Run the repo's security-review skill
(`clepbo/Claude-skills-prompts/Projects/Security-review.md`) at the end of each
milestone.

| Control | Implementation |
|---|---|
| Tenant isolation | RLS on every table (§6). pgTAP tests prove user A can't read/write user B's rows for every table |
| Input validation | Zod at every server action and route handler. DB check constraints as a second line |
| Injection | Supabase client/PostgREST parameterization only. SQL functions use parameters, never dynamic SQL built from input |
| XSS | React escaping. No `dangerouslySetInnerHTML`. User text rendered as text. Strict CSP |
| CSRF | Server Actions Origin check (built in). Route handlers that mutate require the session + same-origin check |
| Password hashing | Supabase Auth (bcrypt). Leaked-password protection enabled |
| Rate limiting | Supabase Auth built-in limits on sign-in/sign-up/OTP. Export limited to 5/hour/user by `hit_rate_limit('export')`, with limits defined in SQL. AI quota (P2) |
| Session | §6 policy. Secure, httpOnly, SameSite=Lax cookies |
| Secrets | Env vars only (Vercel/Supabase dashboards). `.env*` gitignored. Service role key server-only, import-restricted |
| Security headers | Per-request nonce CSP set in `src/proxy.ts` (`script-src 'nonce-…' 'strict-dynamic'`, connect-src self + Supabase origin). This makes every page dynamically rendered, which is acceptable for an authenticated app. `next.config` headers: HSTS, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, frame-ancestors 'none' |
| CORS | No cross-origin API in MVP. Route handlers don't set permissive CORS |
| Transport | HTTPS only (Vercel), HSTS. Supabase connections over TLS |
| Data protection | Encryption at rest (Supabase managed). No behavioral content in logs, errors or analytics. Sentry collects no user data (`dataCollection` off) and `beforeSend` (`server/observability/scrub.ts`) strips request data, query strings, breadcrumb payloads and stack locals |
| Dependencies | Renovate/Dependabot weekly, `pnpm audit` in CI (high+ fails), lockfile committed |
| Account deletion | Typed confirmation plus a sign-in within 15 minutes (SR-2), then service-role delete of the auth user → cascades. Verified by integration and e2e tests |
| Export | `/api/export`: same-origin only (`Sec-Fetch-Site`, SR-3), rate-limited, read through the user's RLS session. `services/export-tables.ts` is tested against the schema so new tables can't be left out |
| Security review | `Docs/SECURITY_REVIEW.md` (M4): findings, controls matrix, scorecard, NOT VERIFIED list. Re-run each milestone |
| Logging | Structured logs with request id, user id (uuid only), action name, outcome, latency. Never notes, titles, amounts or moods |

## 11. Error Handling

| Layer | Behavior |
|---|---|
| Engines | Never throw on data shape. Return `insufficient_data` states. Throw only on programmer error (invariant violations) |
| Services | Return `Result<T, DomainError>` for expected failures (`not_found`, `conflict`, `limit`, `validation`). Unexpected errors bubble up |
| Actions/handlers | Map to `ActionResult` (§5.2). Log unexpected errors with request id |
| UI | Inline field errors. Toast for recoverable failures. `error.tsx` boundaries per route segment. `not-found.tsx` for missing/foreign resources (RLS makes these indistinguishable, by design) |
| Derived work failures | Detection/review generation failures never block the page: show the last good data plus a "couldn't refresh" notice, and log |
| Offline/flaky network | Quick-log sheet keeps the unsent draft in `sessionStorage` and retries on reconnect. Full offline sync is out of scope |

## 12. Testing Strategy

### 12.1 Layers

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Engines | Vitest | Every detector, confidence, feasibility, progress, experiments, language guard | ≥ 90% line coverage, required in CI |
| Services (integration) | Vitest + local Supabase | Service functions against a real DB with RLS on | Required in CI |
| RLS | pgTAP (`supabase test db`) | For every table: cross-user select/insert/update/delete denied | Required in CI |
| Components | Vitest + Testing Library | Log sheet, task row, pattern card | Key components only |
| E2E | Playwright | Journeys J1–J6 on a seeded local stack | Smoke subset per PR, full nightly |
| Accessibility | `@axe-core/playwright` in e2e | Today, Log, Goal, Review pages | No serious/critical violations |

### 12.2 Behavioral fixtures

`tests/fixtures/behavior/` holds seeded generators for synthetic 90-day users,
each with one **planted** pattern: a Wednesday drop-off, a breaking point after 3
sessions, overplanning, lower completion after high-workload days, spending after
difficult meetings, an unsustainable weekly plan, evening-heavy work, and
plan-abandon-replan cycles. There is also a **noise** user with no structure, and a
new user under the history gate. Unit tests assert that each planted pattern is
found at ≥ moderate confidence, that 10 noise seeds show nothing, and that
personas don't trip each other's detectors. The opt-in calibration test (§8.4)
checks 300 noise users and 30 seeds per persona. This is how the "no weak correlations as
truth" requirement is tested.

## 13. Performance

- Single-user data volume is small: ~10–30 activities/day → < 3k rows per 90-day
  window. All engines run in memory on a snapshot loaded with ≤ 6 indexed queries.
- Today page: one RSC render, ≤ 4 queries, no client-side data fetching.
- Only the log sheet, forms and charts are client components.
- Budgets are in PRD §9. Measure with Vercel Speed Insights (no PII) before
  optimizing. No caching layer in the MVP.

## 14. Scalability

- 10k users × 30 activities/day ≈ 110M rows/year: comfortably Postgres with the
  listed indexes. Partitioning `activities` by month is the first lever past that.
- Lazy detection spreads load across user visits. The optional cron batches
  100 users per invocation.
- Scale-out path, in order: (1) move detection/review to a background worker,
  (2) read replica for analytics queries, (3) materialized weekly aggregates,
  (4) a separate analytics store only if cross-user analytics become a product need.

## 15. Deployment

| Environment | App | Database | Purpose |
|---|---|---|---|
| local | `pnpm dev` | `supabase start` (Docker) | Development, integration tests |
| preview | Vercel preview per PR | Production project while testing; a staging project before real users | Review |
| staging | Vercel `staging` branch | Supabase staging project | Pre-release, e2e nightly |
| production | Vercel `main` | Supabase production project, London | Users |

Regions (ADR 0001): Supabase `eu-west-2` (London), Vercel functions `lhr1` via
`vercel.json`. Setup steps and the smoke test are in `Docs/DEPLOYMENT.md`. Until a
staging project is added, previews use the production project (testing phase).

CI (`.github/workflows/ci.yml`) on every PR, in two parallel jobs:
(1) typecheck → lint → unit tests (under `TZ=America/Los_Angeles`, to catch
server-timezone bugs) → `pnpm audit`; (2) start local Supabase (migrations + seed)
→ `db lint` → pgTAP → generated-types drift check → integration → build →
Playwright.
Migrations are applied with `supabase db push` via the manual `deploy-db.yml`
workflow (`production` GitHub environment, optional reviewer approval; never
seeds). Apply them before merging the code that needs them. Migrations are
forward-only. Destructive changes follow expand → migrate → contract.

Backups: Supabase daily backups, plus PITR before public launch.

## 16. Configuration

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key (RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Cron + account deletion only |
| `NEXT_PUBLIC_SITE_URL` | public | Auth redirect URLs, CSP |
| `CRON_SECRET` | server only | Protects `/api/cron/*` |
| `SENTRY_DSN` | server (optional) | Server error reporting. Empty = off (local, CI, previews) |
| `FEATURE_AI` | server | `false` in MVP |
| `AI_PROVIDER_API_KEY`, `AI_MODEL` | server (P2) | LLM access |
| `MAILPIT_URL` | tests only | Local email inbox for e2e |

A typed `src/lib/env.ts` validates env with Zod on first use and fails fast on
anything missing or malformed. `pnpm env:local` writes `.env.local` from the
running local Supabase stack. `.env.example` lists every variable, with no values.

## 17. Integrations

MVP: none besides Supabase and email delivery. Before beta, configure custom SMTP
for Supabase Auth (Resend or Postmark) to avoid the default email rate limit.

The design keeps the door open: imported data lands as `activities` with
`source='import'` plus an `external_id` (added with the first integration, unique
per source) for dedupe.

## 18. Technical Decisions

| # | Decision | Reason | Alternatives | Trade-offs |
|---|---|---|---|---|
| TD-1 | Modular monolith on Next.js | One deployable, one language, fastest path to validating the hypothesis | Separate API (NestJS/FastAPI) + SPA | Coupled deploys. Mitigated by the service/engine boundary, which allows extraction later |
| TD-2 | Supabase (Postgres + Auth + RLS) | DB-level isolation for sensitive data, managed auth, fast setup. Recommended by the blueprint | Neon + Auth.js/Clerk; self-hosted Postgres | Vendor coupling. Mitigated because it's standard Postgres and SQL migrations are portable |
| TD-3 | No ORM, supabase-js + SQL functions | Queries run as the user, so RLS is never bypassed by accident. Fewer layers | Drizzle/Prisma over a direct connection | Direct connections bypass RLS unless roles are set per request. Less ergonomic complex queries, addressed with SQL functions/views |
| TD-4 | Deterministic engines, LLM optional (P2) | Guardrails (blueprint §42), testability, cost, and privacy. The hypothesis is about evidence, not prose | LLM-driven pattern discovery | Less fluent text. Templates need writing care |
| TD-5 | Lazy computation, no queue | No infra to operate. Always consistent. Idempotent upserts | Trigger.dev/Inngest/BullMQ now | First page load after a gap may take up to ~2 s. Add a queue at the triggers in §7 |
| TD-6 | Activities table as the event log | Same information as an event stream at MVP scale | Separate `events` table + analytics store | No generic event replay. Add an outbox if integrations need it |
| TD-7 | Activity types required | Aggregation needs normalized categories. Free text can't be pattern-mined | Free-text titles + NLP clustering | One extra concept for users. Mitigated with inline creation and starter sets |
| TD-8 | Recurrence only on routines | One recurrence mechanism. Single-step routines cover "exercise 5×/week" | Recurring actions + routines | Users must use routines for anything recurring. The UI presents a single-step routine as "repeat this" |
| TD-9 | Patterns + loops + insight lifecycle in one table | One lifecycle, one feedback path, one evidence model | Separate patterns/loops/insights/occurrences tables | Evidence lives in jsonb, not relational rows. Recomputable, so acceptable |
| TD-10 | Interventions as a code catalog | They're templates, not user data | `interventions` table | Changing a catalog needs a deploy, which is fine in the MVP |
| TD-11 | Store `local_date` at write | Stable history. Simple, indexable queries | Compute from `occurred_at` + current tz at read | Timezone moves don't re-bucket history, which is intended |
| TD-12 | Hand-rolled SVG charts | 3 simple charts. Keeps the bundle small and a11y controllable | Recharts/visx | Re-evaluate at the P2 visualizations |
| TD-13 | Mobile-first responsive web, no native app | Validates the hypothesis at the lowest cost | React Native/Expo now | No push notifications or offline. Revisit per Q4/Q5 |

## 19. Deviations from the Blueprint (`Docs/architecture.md`)

| Blueprint | This architecture | Why |
|---|---|---|
| §37 `events` table + §49 separate event/analytics store | Activities are the event log. No analytics store | TD-6. Over-engineering for MVP scale |
| §37 `interventions` table | Code catalog. Accepted suggestions become experiments | TD-10 |
| §37 `loops`, `loop_occurrences`, `pattern_occurrences`, `insights` | Merged into `patterns` (kind, evidence jsonb, lifecycle) | TD-9 |
| §37 `experiment_metrics` | One primary metric per experiment | Simpler analysis. Avoids fishing across metrics |
| §37 `activity_context` | Optional columns on activities + a `daily_checkins` table | Context is mostly per-day, not per-activity |
| §37 `integrations` | Not in MVP | PRD §13 |
| §10 tasks from actions *and* recurring actions | Recurrence only via routines | TD-8 |
| §24 strategy adherence, momentum | Deferred to P2 | Needs data the MVP doesn't collect |
| §50 background job platform | Lazy + optional cron | TD-5 |
| §41 AI responsibilities in the MVP | P2, behind consent and a flag | TD-4 |
| §13 activity `type` as free field | Required `activity_type_id` | TD-7 |
| §6 goal attributes | Added `measurement_type`, `baseline_value`, `planned_pace_*` | Feasibility is otherwise not computable |
| §11 routine life area | Taken from the routine's activity type | One source of truth |
| §14 outcomes optionally unlinked | `outcomes.goal_id` required | Outcomes are progress readings for a goal in the MVP |
