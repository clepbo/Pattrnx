# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Milestone 1 (Foundation): complete.** Architecture approved 2026-09-24.

Built:
- Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui (radix-nova) app, pnpm.
- Supabase local stack config, migration `20260924120000_foundation.sql`:
  `profiles` (created by sign-up trigger), `life_areas`, `activity_types`,
  `activities` (trigger-derived `local_date`/`local_hour`/`life_area_id`),
  `daily_checkins`. RLS, anon revoked, composite FKs. pgTAP suite (34 tests).
- Auth: sign-up (captures browser timezone), email confirmation, password
  sign-in, magic link, forgot/reset password, sign-out. All email links go
  through `/auth/confirm`. `src/proxy.ts` handles CSP nonce, session refresh and
  redirects.
- `src/lib/dates` timezone/calendar helpers, `src/lib/env` validation,
  `safeNextPath` open-redirect guard, and architecture lint rules (engine purity,
  service-role import ban).
- Tests: unit (Vitest), integration (real Auth/PostgREST), e2e (Playwright incl.
  axe and CSP header checks). CI in `.github/workflows/ci.yml`. Dependabot.

## Next up: Milestone 2 (plan and execute)

1. Onboarding flow (J1): profile settings (timezone, currency, week start), pick
   default life areas, starter activity types per area.
2. Migration: `goals`, `goal_strategies`, `milestones`, `actions`, `routines`,
   `routine_steps`, `tasks`, `outcomes`, plus `activities.goal_id` / `task_id`
   and the `complete_task` SQL function.
3. Feasibility engine (`src/server/engines/feasibility`) with the blueprint ₦2M
   example as a test (PRD F3 acceptance).
4. Goal create/edit UI with the feasibility explanation. Milestones and actions.
5. Routines with idempotent `ensureTasks`. Today page lists tasks with
   done / done-minimum / skip.
6. Quick-log sheet and activity history. Daily check-in.

Then Milestone 3 (progress/health, pattern detectors + fixtures, feedback) and
Milestone 4 (weekly review, experiments, export/delete, security review, beta).

## Recent decisions

- 2026-09-24: `activities` derived columns come from a DB trigger, not the
  service (hardens TD-11). `src/server/db/database.ts` hides them from insert types.
- 2026-09-24: nonce-based CSP means every page renders dynamically.
- 2026-09-24: magic links never create accounts. Sign-up needs name + password.

## Open questions blocking work

None block Milestone 2. Q1 (hosting region) must be answered before the
production Supabase project is created. See `PRD.md` §17.

## Production setup checklist (when the hosted project is created)

Mirror `supabase/config.toml` in the dashboard, because hosted projects don't read it:
- Auth → email templates: confirmation, magic link and recovery from
  `supabase/templates/` (links must use `/auth/confirm?token_hash=…`).
- Auth → minimum password length 10. Leaked-password protection on (paid plan).
  Secure password change on. Email confirmations on.
- Site URL + redirect allow-list for the production domain.
- Custom SMTP (ARCHITECTURE §17). Session timeouts per ARCHITECTURE §6.
- Vercel env vars per `.env.example`.

## Known gaps / notes for the next agent

- Email security scanners that pre-fetch links can consume one-time tokens. If
  users report "link didn't work", switch `/auth/confirm` to a confirm-button
  page (a POST) instead of verifying on GET.
- `Docs/architecture.md` is the original blueprint. Don't edit it. Record
  deviations in `ARCHITECTURE.md` §19.
- Pattern thresholds in `ARCHITECTURE.md` §8.3–8.4 are initial guesses, to be
  tuned against fixtures and beta data.
- Button/input primitives were raised to 44 px height (touch targets). Keep that
  if shadcn components are re-added.
