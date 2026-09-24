# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Milestone 4 (Intervene and learn): complete, in review.** M1–M3 merged (PRs #1, #6, #7).
With M4 the PRD's MVP scope (§12) is built, pending beta-readiness items below.

Built in M4:
- Experiments engine (§8.7, BR-8) and the interventions catalog (§8.5): every
  pattern type suggests a small experiment. Start from a pattern or from scratch,
  baseline measured at start, progress on Today, wrap-up with outcome + reflection,
  stop early. BR-7 limits enforced in the database.
- Weekly review (F13): snapshot generated on first visit after the week ends.
  Execution vs previous week, biggest improvement/concern, goal health, top 3
  patterns, one suggested experiment, experiments, reflection + usefulness score,
  "data changed" notice with refresh, and a Today banner until viewed.
- Insights area (Weekly review · Patterns · Experiments) with its own tab.
- Data (F15): JSON export (same-origin, 5/hour) and account deletion (typed
  confirmation + recent sign-in).
- Security review (`Docs/SECURITY_REVIEW.md`): 2 Medium and 2 Low findings fixed
  and tested (rate-limit reset, deletion re-auth, cross-site export, JSON size
  caps). Overall risk: Low. Scorecard 83.
- Tests: 198 unit (+8 calibration), 92 pgTAP, 5 integration, 21 e2e.

## Next up: beta readiness

1. Q1 (hosting region / privacy law) decision, then create the production Supabase
   project and apply the production checklist below. Re-verify the NOT VERIFIED
   items in the security review.
2. Sentry with PII scrubbing (SR-8). Vercel project and environments (§15).
3. Privacy notice and terms (NDPA/GDPR per Q1).
4. Optional before beta: activity editing, check-in date picker, Today query
   consolidation (≤ 4 queries), SR-5 hardening (derived writes via RPC).
5. P2 features (F16/F17, AI) only after beta feedback.

## Recent decisions

- Experiments stay `active` past their end date until the user confirms, so
  results always get reviewed. Results are stored at confirmation.
- Reviews are generated lazily (no cron needed yet). The optional cron in §7 is
  still unbuilt.
- Rate limits are defined inside `hit_rate_limit`, never by callers (SR-1).
- Account deletion requires a sign-in within 15 minutes (SR-2).

## Open questions blocking work

Q1 (hosting region / privacy law) now blocks the beta: it decides where the
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
