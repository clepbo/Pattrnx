# Pattrnx — Architecture Essentials

The quick reference. `ARCHITECTURE.md` is the full source of truth. If the two
disagree, `ARCHITECTURE.md` wins, and fix this file.

## What it is

A goal-execution and behavioral-pattern system. Users state goals and plans, log
what they actually do, and Pattrnx detects patterns in the gap between them and
helps them run small experiments. Loop: **Observe → Understand → Intervene →
Experiment → Adapt.**

## Stack

TypeScript (strict) · Next.js App Router (RSC + Server Actions) · Tailwind +
shadcn/ui · Supabase (Postgres + Auth + RLS) via `@supabase/ssr` / `supabase-js` ·
Zod · date-fns + @date-fns/tz · Vitest · Playwright · pgTAP · pnpm · Vercel ·
Sentry (server errors only, scrubbed). Hosted in London: Vercel `lhr1`, Supabase
`eu-west-2` (ADR 0001, `Docs/DEPLOYMENT.md`).
**No** ORM, queue, Redis, analytics store, state library or chart library in the MVP.

## Shape

Modular monolith. One Next.js app, one Postgres.

```text
app / features (thin: auth → Zod → one service call)
        ↓
server/services (load snapshot → call engines → persist)
        ↓                    ↓
server/db (Supabase)   server/engines (PURE, deterministic, no I/O)
```

## Core tables

`profiles` (timezone, currency, week_starts_on, ai consent) · `life_areas` ·
`goals` (measurement_type cumulative|level|milestone, baseline, target, deadline,
planned pace) · `goal_strategies` · `milestones` · `actions` (one-off) ·
`routines` (the only recurrence; normal + minimum minutes) · `routine_steps` ·
`tasks` (planned instances; status planned|done|done_minimum|skipped; **missed is
derived**; status only changes via SQL `set_task_status`, which also writes the evidence activity) · `activity_types` (polarity, quick-log) · `activities` (the event log;
`local_date`, `local_hour`) · `daily_checkins` · `outcomes` (progress readings) ·
`patterns` (derived; also loops; lifecycle + feedback + fingerprint) ·
`experiments` (one metric, baseline vs result; BR-7 limits in the DB) · `reviews`
(weekly snapshot, generated on first view) · `rate_limits` (via
`hit_rate_limit(action)` only).

Every user-owned row: `user_id → auth.users on delete cascade`, RLS
`user_id = auth.uid()` on all four operations.

## Auth

Supabase Auth: email+password (verified) + magic link. Cookie sessions via
`@supabase/ssr`, refreshed in `src/proxy.ts` (Next 16's middleware), which also sets
the per-request CSP nonce. Auth emails link to `/auth/confirm`. `requireUser()` uses `auth.getUser()`. One role. The service-role
client is imported **only** from `src/server/db/admin.ts`, used by the cron route
and account deletion.

## Surfaces

Server Components for reads. Server Actions for mutations, returning
`ActionResult<T>`. Route handlers: `/api/export`, `/api/cron/weekly` (Bearer
`CRON_SECRET`), `/api/health`.

## Processing

No job system. Routine tasks are materialized idempotently (today−30…+7) on page
load; resuming a routine restarts it today so paused days are never missed. Pattern detection runs lazily when > 24 h old or stale (90-day window,
< 2 s). The weekly review is generated on first visit after the week ends
(unique per week). `claim_pattern_detection()` (a compare-and-set on the profile) stops
double detection runs. Detectors are significance-tested and Bonferroni-corrected
(calibration: `pnpm test:robustness`).

## Critical business rules

- **BR-1:** never causal or character language about patterns without experiment
  support. Enforced by `wordingGuard` and a template test.
- **BR-2:** show a pattern only at ≥ moderate confidence and ≥ 21 days of history.
  Max 3 per review, 1 on Today.
- **BR-4:** missed = planned task before local today and not done, done-minimum or
  skipped (derived).
- **BR-5 feasibility bands** (pace ratio): ≥ 1 feasible · 0.75–1 with adjustments
  · 0.4–0.75 at risk · < 0.4 unrealistic · no deadline or no pace → insufficient
  data.
- **BR-6 health:** stalled (14 d no activity) → needs recalibration → at risk →
  uncertain → on track.
- **BR-7:** ≤ 1 active experiment per goal, ≤ 2 per user, 7–42 days. **BR-8:**
  < 5 observed days in either window → inconclusive.
- **BR-9:** dismissed or suppressed fingerprints never reappear.
- Store `local_date` at write time. Never re-bucket history on a timezone change.

## Folder map

```text
src/app/(app)/{today,goals,routines,log,patterns,experiments,reviews,onboarding,settings}
src/app/api/{export,cron/weekly,health}
src/features/<feature>/{components,actions.ts,schemas.ts}
src/server/{db,services,engines/{feasibility,progress,patterns,loops,experiments,interventions,language},ai,auth}
src/{components/ui,lib,types}   src/proxy.ts
supabase/{migrations,tests,seed.sql}   tests/{e2e,integration,fixtures/behavior}
```

## Security

Users can call the Supabase API directly with their own token, so **the database
is the validation boundary**: RLS plus check constraints on every column, and size
caps on JSON. Zod in actions is for UX. Account deletion needs a recent sign-in.
See `Docs/SECURITY_REVIEW.md`.

## Do not change casually (needs an ADR in `Docs/decisions/`)

1. The engines stay pure (no DB, Next or Supabase imports in `src/server/engines`).
2. RLS on every table. No service-role usage outside `admin.ts`.
3. Recurrence lives only in routines.
4. `patterns` is derived and recomputable. Never store user-authored data there
   except feedback and suppression.
5. Deterministic engines are the source of truth. The LLM (P2) only rephrases
   validated evidence.
6. Adding a dependency, framework, queue, datastore or ORM.
7. The schema changes only through `supabase/migrations`.
