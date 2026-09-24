# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Milestone 2 (Plan and execute): complete, in review.** Milestone 1 merged in PR #1.

Built in M2:
- Migration `20260925090000_plan_and_execute.sql`: goals, goal_strategies,
  milestones, actions, routines, routine_steps, tasks, outcomes;
  `activities.goal_id`/`task_id`; `set_task_status()` SQL function. pgTAP (32 more).
- Engines: feasibility (BR-5, blueprint ₦2M example), progress helpers, routine
  occurrences (30-day backfill, 7-day lookahead).
- Onboarding (J1): profile → life areas + starter activity types → first goal.
  The `(app)` layout sends un-onboarded users to `/onboarding`.
- Goals: create/edit, feasibility card with arithmetic and adjustments, progress
  readings, strategy, milestones, actions scheduled onto a day, status changes.
- Routines: CRUD with minimum version, pause/resume/archive, 4-week adherence count.
- Today: grouped tasks with Done / minimum / Skip / Undo, missed tasks from the
  last 6 days, manual tasks, one-tap quick log, daily check-in.
- Log: activity form (idempotent submits), 14-day history, activity type management.
- Settings: profile and life areas.
- Tests: 125 unit, 67 pgTAP, 5 integration, 14 e2e (full J1/J2 journey with axe).

## Next up: Milestone 3 (understand)

1. Progress & health engine (BR-6: stalled, needs recalibration, at risk…) and
   the plan-vs-reality strip on goals (F9).
2. Pattern detectors from ARCHITECTURE §8.3 with behaviour fixtures in
   `tests/fixtures/behavior/` (incl. the random-noise user), confidence scoring
   (§8.4), language templates + `wordingGuard` (§8.8).
3. `patterns` table + lifecycle + feedback/suppression (F12), Patterns page, and
   one "pattern to watch" on Today.
4. Loop detection (F11): plan → abandon → re-plan, routine breaking point.

Then Milestone 4: weekly review, experiments, export/delete, security review, beta.

## Recent decisions

- Routine tasks backfill up to 30 days so unopened days still count as planned.
  Resuming a routine resets `active_from` to today (paused days are never missed).
- FR-4 narrowed: only tasks with an activity type create an activity on completion.
- Forms with client state remount on each action result (`stateKey`) because
  React 19 resets forms after actions, which desyncs controlled inputs.
- Money-denominated activity types open the full log form instead of one-tap.

## Open questions blocking work

None block Milestone 3. Q1 (hosting region) must be answered before the
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
- Button/input/select primitives were raised to 44 px height (touch targets). Keep
  that if shadcn components are re-added.
- Today makes ~7 queries (ARCHITECTURE §13 budgets ≤ 4). Fine for now. Consolidate
  into one SQL function if p95 exceeds budget.
- Check-ins can be saved for the past 7 days server-side, but the UI only edits
  today's. Add a date picker if users ask.
- Activities can be deleted but not edited yet (delete + re-log).
