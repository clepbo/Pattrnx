# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Beta readiness.** The MVP (PRD §12) is built and merged: M1–M4 (PRs #1, #6, #7, #8).
Hosting is decided and codified (ADR 0001): Vercel functions and Supabase both in
London, a manual migration workflow, and scrubbed server-side Sentry (SR-8 fixed).
The hosted projects don't exist yet. The user creates them by following
`Docs/DEPLOYMENT.md`.

## Next up

1. User: set up hosting for testing per `Docs/DEPLOYMENT.md` → *Testing setup*: the
   default `vercel.app` URL, auth emails via personal Gmail SMTP (app password), and
   a single Supabase project on Free. Then run the smoke test. Before inviting beta
   users, switch to a domain, a proper email provider, Supabase Pro + staging, and
   Vercel Pro. Afterwards, update the
   NOT VERIFIED list in `Docs/SECURITY_REVIEW.md`.
2. Privacy notice and terms (NDPA 2023 + GDPR, including the UK data transfer).
   Needs the operator's legal name and contact details from the user.
3. Optional before beta: activity editing, check-in date picker, Today query
   consolidation (≤ 4 queries), SR-5 hardening (derived writes via RPC).
4. P2 features (F16/F17, AI) only after beta feedback.

## Recent decisions

- Q1 resolved: Nigeria-first, hosted in London (Vercel `lhr1`, Supabase `eu-west-2`).
- Sentry: server errors only, off unless `SENTRY_DSN` is set (so previews and CI
  send nothing). No browser SDK or source-map upload yet (ADR 0001 consequences).
- One Supabase project for the whole testing phase (user's choice); previews share
  it. `deploy-db.yml` targets `production` only and validates the secrets' format.
  Apply migrations before merging code that needs them.
- Experiments stay `active` past their end date until the user confirms.
- Reviews are generated lazily (no cron). `/api/cron/weekly` is still unbuilt, so
  `CRON_SECRET` isn't needed yet.

## Open questions blocking work

None blocking code. The beta waits on the user creating the hosted accounts.

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
