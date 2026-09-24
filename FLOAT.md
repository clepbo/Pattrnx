# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Milestone 3 (Understand): complete, in review.** M1 and M2 merged (PRs #1, #6).

Built in M3:
- Goal health engine (BR-6) with reasons, and the 4-week plan-vs-reality strip on
  the goal page. Health badges on the goals list and Today ("Active goals").
- Pattern engine: 7 detectors plus the plan → abandon → re-plan loop (ARCHITECTURE
  §8.3), confidence with split-half consistency plus significance tests
  (Bonferroni over each detector's family, §8.4), templates + `wordingGuard` (BR-1).
- Behaviour fixtures (8 planted personas, noise, new user). Calibration test
  `pnpm test:robustness`: 2.3% of noise users see any pattern, and planted patterns
  are found in 28–30 of 30 seeds.
- `patterns` table + lifecycle (candidate → presented → acknowledged/dismissed →
  resolved), feedback and "don't show again" (BR-9), detection claim and dirty flag.
- Patterns page with per-detector evidence tables, "Pattern to watch" on Today, and
  a "still learning" state before 21 days of history.
- Tests: 176 unit (+8 calibration), 78 pgTAP, 5 integration, 17 e2e.

## Next up: Milestone 4 (intervene and learn)

1. Interventions catalog (§8.5) → suggested experiment per visible pattern.
2. Experiments: table, engine (§8.7, BR-7, BR-8), start/abandon/evaluate/confirm UI,
   active experiments on Today and goals.
3. Weekly review (F13): snapshot generation, reflection, usefulness score, pattern
   feedback inline, suggested intervention.
4. Data export and account deletion (F15), Sentry with scrubbing, security review
   using the `Security-review.md` skill, and a beta-readiness pass.

## Recent decisions

- Detection needs a significance test on top of n/effect thresholds (noise
  fixtures showed about 6% false positives without it). Two-proportion tests are
  continuity-corrected; share tests use the exact binomial tail.
- Breaking point is a per-streak-position miss-rate test, not "runs cluster around
  the mode" (which fires on memoryless noise).
- A compare-and-set claim replaces the advisory lock (PostgREST = one transaction per call).
- Dirty-flag triggers are `security definer` so Supabase Auth account deletion works.
- Plain inserts don't re-trigger detection. New data is picked up by the daily run.

## Open questions blocking work

None block Milestone 4. Q1 (hosting region) must be answered before the
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
