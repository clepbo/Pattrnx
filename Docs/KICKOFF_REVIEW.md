# Pattrnx — Kickoff Architecture Review

A record of the architectural stress test (kickoff Phase 8) run on the initial
proposal derived from `Docs/architecture.md`. Every finding below has already
been folded into `PRD.md` and `ARCHITECTURE.md` (Phase 9). This file explains
**why** they look the way they do.

---

## 1. What could break

| # | Failure point | Consequence | Resolution in the docs |
|---|---|---|---|
| B1 | Qualitative goals ("become a better Product Designer") have no number, so outcome progress and feasibility are uncomputable | The feasibility engine, a headline feature, silently returns nonsense | Added `measurement_type` (cumulative / level / milestone). Milestone goals measure by milestone completion vs time elapsed (ARCH §8.1) |
| B2 | Activities as free-text titles ("gym", "Gym", "workout") can't be aggregated | Pattern detection finds nothing, or duplicates patterns | Required `activity_types` with polarity. Inline creation keeps friction low (TD-7) |
| B3 | Timezones: day-of-week and "yesterday" patterns computed in UTC shift late-evening activity to the wrong day | Wrong weekday patterns. Missed tasks at midnight UTC | Per-user timezone. `local_date`/`local_hour` stored at write (TD-11). All date logic goes through `src/lib/dates` |
| B4 | "Missed" stored as a status needs a nightly job, and fails if the job fails | Plan-vs-reality wrong after any job outage | Missed is derived (BR-4). No job needed |
| B5 | Two recurrence systems (recurring actions + routines) disagree on what's planned | Double-counted or missing planned tasks | Recurrence only in routines (TD-8). Unique `(routine_id, scheduled_date)` |
| B6 | Pattern evidence referencing activities that are later edited or deleted | Insight shows evidence that no longer exists | `stale` flag, recompute, and the review "data changed" notice (ARCH §8.6) |
| B7 | Concurrent detection/review runs (two tabs, cron + visit) | Duplicate patterns/reviews | Unique fingerprints and `(user, period, start)`, upserts, advisory lock (ARCH §7) |
| B8 | Experiments compared over windows of different lengths or data density | Misleading "improved" results | One `metricValue` function, per-day normalization, equal-length baseline, BR-8 inconclusive rule |
| B9 | Supabase default email sender rate limits | Sign-ups fail during beta invites | Custom SMTP before beta (ARCH §17) |

## 2. Edge cases

| Area | Case | Handling |
|---|---|---|
| Empty states | New user with no goals, activities or patterns | Today shows onboarding CTA. Patterns show "still learning — N days to go". Review for week 1 shows execution only |
| Empty states | Goal with no deadline | Feasibility = Insufficient data, with a prompt to add a deadline |
| Invalid input | `target_value == baseline_value`; deadline before start; minimum > normal minutes; empty `days_of_week` | DB check constraints + Zod messages |
| Invalid input | Activity dated in the future or before 2000 | Rejected (+5 min clock-skew tolerance) |
| Invalid input | Negative quantity for spending | Allowed only if the activity type's unit permits negatives (refunds). Default: ≥ 0 |
| Direction | Level goal that should decrease (weight 90 → 80) | `direction = sign(target − baseline)` everywhere in the engines |
| Deadline passed | Goal past its deadline, not completed | Health shows "deadline passed". Recalibration flow offered. Feasibility not computed |
| Duplicates | Same routine task generated twice | Unique constraint + upsert |
| Duplicates | Double-tap on quick-log | Client disables the button until the action resolves. Action accepts a client-generated idempotency key (UUID) stored as the activity `id` |
| Duplicates | Same pattern detected repeatedly | Fingerprint upsert updates `last_detected_at` |
| Auth | Session expired mid-form | Action returns 401 → redirect to login with return URL. Quick-log draft kept in `sessionStorage` |
| Authorization | Guessing another user's goal id in a URL | RLS returns no row → `not-found` (no existence leak) |
| Authorization | Inserting an activity referencing another user's activity type | Composite `(id, user_id)` FKs reject it |
| Deleted resources | Goal deleted with active experiment | Experiment `goal_id` set null. Experiment continues on its own metric subject |
| Deleted resources | Routine archived mid-experiment on that routine | Experiment is evaluated on data up to archive. Marked inconclusive if < 5 days |
| Deleted resources | Life area with goals archived | Allowed. Goals keep it. Pickers hide it |
| Timezone change | User travels and changes timezone | Future rows use the new zone. History unchanged. Today recomputed in the new zone |
| DST | Days of 23/25 hours | Date maths on local dates, not hour offsets |
| Week start | User changes `week_starts_on` | Future reviews use the new start. Existing reviews unchanged |
| Partial ops | Task completion succeeds but activity insert fails | Both in one SQL function (transaction): `complete_task(task_id, variant)` |
| Partial ops | Account deletion partially fails | Delete auth user last. Cascades are atomic in Postgres. Retry-safe |
| Network | Flaky mobile connection while logging | Draft retained and retried. Optimistic UI only for task toggles |
| Large data | Power user logging 100+ activities/day | Snapshot bounded to 90 days (≈ 9k rows). Detector complexity O(n) or O(n log n). Quick-log rate limit 600/day |
| Unexpected behavior | User logs everything retroactively once a week | Detectors use `local_date`, not `created_at`. Timing detectors ignore `local_hour` for back-filled rows (created > 24 h after `occurred_at`) |
| Unexpected behavior | User completes every task without doing it ("gaming") | Out of scope to detect. The metrics are for the user's own learning |
| Security | Oversized notes or tags as a DoS vector | Length limits (note 2000, tag 40 × max 10) in Zod + DB checks |

## 3. Over-engineering removed

| Proposed (blueprint) | Replaced by | Saving |
|---|---|---|
| Event store + analytics store + event bus | Activities table as the event log | One datastore, no pipelines |
| Background job platform (Trigger.dev / Inngest / BullMQ) | Lazy, idempotent, on-demand computation + optional Vercel Cron | No infra, no retries, no dead letters to operate |
| 23 tables incl. `loops`, `loop_occurrences`, `pattern_occurrences`, `insights`, `interventions`, `experiment_metrics`, `activity_context`, `integrations`, `events` | 16 tables. Patterns unify loops + insight lifecycle. Interventions are a code catalog | Fewer migrations, one lifecycle |
| LLM in the MVP loop (decomposition, reflection, explanation, conversation) | Deterministic templates. AI at P2 behind consent | No model cost, no hallucination risk, testable |
| Multi-metric experiments | One primary metric | Honest analysis, simpler UI |
| Dedicated backend service | Next.js server actions + service layer | One deployable |
| Life graph, Sankey, thread visualizations | 3 hand-rolled SVG charts | No chart library |
| Monthly/quarterly/yearly reviews | Weekly only | Focus on the hypothesis |

## 4. Under-engineering fixed

| Gap in the initial proposal | Why it mattered | Fix |
|---|---|---|
| No measurement model for goals | Feasibility/progress undefined (B1) | `measurement_type`, `baseline_value`, planned pace, `outcomes` as readings |
| No timezone model | Wrong patterns (B3) | Profile timezone, `local_date`/`local_hour` |
| No activity taxonomy | Nothing to aggregate (B2) | `activity_types` with polarity |
| Vague confidence ("depends on observations…") | Weak correlations shown as truths | Explicit n / effect / split-half thresholds, ≥ moderate to show, ≤ 3 per review (ARCH §8.4) |
| No multiple-comparisons control | Many detectors × many subjects = spurious findings | Hypothesis space limited to planned/polar subjects, ranking cap, noise-fixture test |
| No enforcement of the cautious-language rule | One careless template breaks the core guardrail | `wordingGuard` + CI test over all templates |
| No cold-start design | Users see nothing for 3 weeks | Day-1 value from feasibility and plan-vs-reality. "Still learning" counter |
| No data-deletion or export mechanics | Privacy promise unfulfilled | Cascades, export route, integration test |
| No concurrency story for derived data | Duplicates (B7) | Unique keys, upserts, advisory locks |
| No privacy rules for logs and analytics | Sensitive data leakage | No behavioral content in logs, Sentry scrubbing, no third-party analytics |
| Experiment confounding | Two simultaneous interventions on one goal make results meaningless | BR-7 limits |

## 5. Risky assumptions to validate

| Assumption | How to validate | When |
|---|---|---|
| Users will log daily without integrations | Measure logging days/week in the beta cohort (PRD G2) | Weeks 1–4 of beta |
| 21 days is enough data for useful patterns | Fixture tests plus beta pattern-feedback accuracy (G3) | Beta weeks 3–6 |
| Initial thresholds are neither too noisy nor too strict | Track the shown-pattern rate and "Not accurate" rate per detector. Tune `thresholds.ts` | Continuous |
| Users understand "minimum version" routines | Share of done_minimum completions, plus usability sessions | Beta weeks 1–2 |
| Deterministic templates read as helpful, not robotic | Review usefulness score (PRD §15) | Beta |
| The Nigeria-first market is served by an EU-hosted DB | Legal review of NDPA 2023 cross-border transfer | Before production project creation (Q1) |
| Responsive web is enough without push notifications | Week-2 retention. Q5 | Beta |

## 6. Simplifications applied

- One recurrence mechanism (routines).
- One derived-insight table (patterns).
- One experiment metric.
- One processing model (lazy + idempotent) instead of real-time/daily/weekly jobs.
- No ORM. SQL functions for transactional multi-step writes (`complete_task`,
  `start_experiment`).
- No client state or data-fetching library. RSC + server actions + revalidation.

## 7. Architectural risks (summary)

1. **Pattern quality** is the product. If detectors are noisy, trust is lost fast.
   Mitigated by thresholds, fixtures, the feedback loop and display caps.
2. **Logging friction** decides whether there's any data. Mitigated by one-tap
   logging and auto-logging from task completion.
3. **Supabase coupling** for Auth + RLS. Acceptable: standard Postgres, portable
   SQL migrations.
4. **Lazy computation latency** on first load after a long gap. Budgeted at < 2 s,
   with the upgrade path documented (ARCH §7).
5. **Privacy and legal exposure** from sensitive self-reported data. Mitigated by
   minimization, RLS, no third-party analytics, export/delete, and a security
   review per milestone.

## 8. Open questions

See `PRD.md` §17 (Q1–Q8). Each has a default so work isn't blocked. Q1 (region /
privacy law) must be decided before production.

---

## Ready for Development Checklist

- [x] Product requirements are defined (`PRD.md` §7–§10)
- [x] MVP scope is clear (`PRD.md` §12)
- [x] Out-of-scope features are identified (`PRD.md` §13)
- [x] User journeys are understood (`PRD.md` §6, J1–J6)
- [x] Technical architecture is defined (`ARCHITECTURE.md` §1–§3)
- [x] Database models are defined (`ARCHITECTURE.md` §4)
- [x] Authentication/authorization is defined (`ARCHITECTURE.md` §6)
- [x] APIs/integrations are defined (`ARCHITECTURE.md` §5, §17)
- [x] Security considerations are addressed (`ARCHITECTURE.md` §10)
- [x] Testing strategy is defined (`ARCHITECTURE.md` §12)
- [x] Project structure is defined (`ARCHITECTURE.md` §3, scaffold in repo)
- [x] AI coding-agent instructions are defined (`AGENTS.md`, `FLOAT.md`, `CLAUDE.md`)
- [x] Major risks have been reviewed (this file §1, §5, §7)
- [x] Important edge cases have been considered (this file §2)
- [x] Over-engineering has been removed (this file §3)
- [x] Open questions are clearly identified (`PRD.md` §17)
- [x] Documentation is internally consistent (checked at kickoff)
- [ ] **Human approval of `PRD.md` and `ARCHITECTURE.md`**: implementation is blocked on this
