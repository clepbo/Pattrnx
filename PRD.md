# Pattrnx — Product Requirements Document

**Version:** 1.0 (post architecture review)
**Status:** Awaiting approval. No implementation has started.
**Source:** `Docs/architecture.md` (product blueprint v0.1)
**Related:** `ARCHITECTURE.md`, `ARCHITECTURE_ESSENTIALS.md`, `Docs/KICKOFF_REVIEW.md`

Labels used in this document:

- `ASSUMPTION` — a decision made to unblock planning. Change it if it's wrong.
- `OPEN QUESTION` — needs a human decision. All are collected in §17.

---

## 1. Product Overview

Pattrnx is a personal behavioral intelligence and goal-execution system.
A user states what they want (goals), how they intend to get there (strategy,
milestones, routines), and records what they actually do (activities, task
completions, a short daily check-in). Pattrnx compares intention, plan and
reality. It detects recurring patterns in the gap between them, shows the
evidence, and helps the user run small, time-boxed experiments to change
those patterns.

Pattrnx is not a journal, habit tracker, task manager or AI chatbot, although
it borrows from each. Its differentiator is the loop:

```text
Observe → Understand → Intervene → Experiment → Adapt
```

## 2. Problem Statement

People who set goals usually track them with a mix of to-do lists, habit
streaks and good intentions. These tools record *whether* something happened.
They do not explain *why* progress stalls, and they do not surface the
recurring behavior (overplanning, abandoning after a missed day, spending
after stressful weeks) that keeps producing the same result. Users then restart
with a new plan, which often repeats the old failure.

The problem Pattrnx addresses:

> Users cannot see the relationship between what they intend, what they
> actually do, and what keeps repeating. Without that evidence they can't make
> small, targeted changes.

## 3. Core Hypothesis (what the MVP must validate)

> People make better progress toward meaningful goals when they can see the
> relationship between their intentions, actual behaviors, recurring patterns,
> and outcomes, and can run small experiments to change those patterns.

Every MVP feature must support testing this hypothesis. Features that don't
support it are out of scope (§13).

## 4. Goals

| # | Product goal | Measure (see §15) |
|---|---|---|
| G1 | Users can turn an intention into a plan grounded in a feasibility check | ≥ 70% of created goals have ≥ 1 milestone and ≥ 1 routine or action within 7 days |
| G2 | Logging is low-friction enough to produce usable data | Median quick-log time ≤ 10 s; ≥ 50% of activated users log on ≥ 4 days/week in weeks 2–4 |
| G3 | Users discover patterns they consider accurate | ≥ 50% of pattern feedback is "Accurate" or "Partially accurate" |
| G4 | Users act on patterns | ≥ 25% of users who see a moderate+ confidence pattern start an experiment |
| G5 | Experiments get finished | ≥ 50% of started experiments reach their end date (completed, not abandoned) |
| G6 | Execution improves | Median goal execution rate (done ÷ planned tasks) in weeks 5–8 exceeds weeks 1–4 for retained users |

`ASSUMPTION` — the targets are starting points for a closed beta and should be
revisited after the first cohort.

## 5. Target Users

### Primary: the self-directed improver

- Aged roughly 22–40, working or studying, with 1–3 concrete personal goals
  (career transition, savings target, fitness, learning).
- Has tried habit trackers, planners or journaling and abandoned them.
- Wants to know *why* they stall, not just to be reminded.
- Mostly on a phone during the day, sometimes on a laptop for planning.

### Secondary (later, not designed for in MVP)

- Coaches or accountability partners who want visibility into a client's
  execution. This needs sharing and permissions, which are out of scope.

`ASSUMPTION` — the blueprint's examples use ₦ and Nigerian context. The launch
market is taken to be Nigeria-first but not Nigeria-only: currency and timezone
are per-user settings. `OPEN QUESTION Q1`.

### User needs

1. Fast capture of what happened, without feeling like data entry.
2. An honest read on whether a goal is realistic at the current pace.
3. Evidence-backed explanations, never judgments about character.
4. A small, concrete next step instead of generic motivation.
5. Control over personal data: see it, export it, delete it.

## 6. User Journeys

### J1 — Onboarding to first plan (first session, target ≤ 5 min)

```text
Sign up → set timezone & currency → pick life areas (defaults pre-selected)
→ create first goal (title, measurement type, baseline, target, deadline)
→ describe intended strategy (free-text list) + planned pace
→ feasibility check shown with its arithmetic
→ add 1–4 milestones → add a routine or one-off actions
→ land on Today
```

Acceptance: a new user can complete J1 without leaving the flow, and every
step except goal title can be skipped and revisited.

### J2 — Daily loop (target ≤ 60 s/day)

```text
Open Today → see today's tasks (routine + scheduled actions)
→ mark done / done-minimum / skip → optional 5-field daily check-in
→ quick-log anything unplanned (one tap for saved activity types)
→ see one "pattern to watch" if one applies today
```

### J3 — Weekly review

```text
New week begins → review for last week is generated on first visit
→ execution %, goal health per goal, deviations, up to 3 patterns with evidence
→ give feedback on each pattern → accept a suggested intervention → experiment starts
→ optional written reflection
```

### J4 — Experiment

```text
Start from a pattern (or manually) → hypothesis + intervention + metric pre-filled
→ baseline computed from the equal-length window before start
→ runs 7–42 days, visible on Today and on the goal
→ at end date: result vs baseline computed → user confirms outcome + reflection
→ optional: adapt the plan (e.g. change routine duration or days)
```

### J5 — Goal recalibration

```text
Goal shows "needs recalibration" → user opens goal health
→ sees required vs historical rate → picks: extend deadline / lower target /
  change planned pace / keep as is → change recorded with a note
```

### J6 — Data control

```text
Settings → export all data (JSON) → or delete account (typed confirmation)
→ all rows removed; sign-out everywhere
```

## 7. Features

Each feature lists purpose, behavior, requirements, dependencies and acceptance
criteria. Priority: **P0** = MVP launch blocker, **P1** = MVP, can slip one
iteration, **P2** = post-MVP.

### F1 — Account & preferences (P0)

- **Purpose:** identity, and the settings every calculation depends on.
- **Behavior:** email + password sign-up with email verification, and magic link
  sign-in. Profile: display name, timezone (auto-detected, editable), currency,
  first day of week, AI-processing consent (default off).
- **Requirements:** timezone must be set before any activity is logged, because
  every date calculation depends on it.
- **Dependencies:** Supabase Auth.
- **Acceptance:** unverified users can't access app routes. Changing timezone
  does not rewrite historical `local_date` values.

### F2 — Life areas (P0)

- **Purpose:** broad context for goals, activity types and cross-area analysis.
- **Behavior:** the 10 default areas from the blueprint are offered at onboarding.
  Users can rename, archive, reorder and add custom areas.
- **Requirements:** names unique per user (case-insensitive). An area with goals
  or activity types can be archived, not deleted.
- **Acceptance:** archived areas disappear from pickers but historical data still
  shows them.

### F3 — Goals with feasibility check (P0)

- **Purpose:** turn intention into a measurable, grounded target.
- **Behavior:** a goal has a title, life area, motivation, **measurement type**,
  baseline, target, unit, deadline, planned pace, priority and status. Three
  measurement types:
  - `cumulative` — progress adds up (money saved, pages written).
  - `level` — the latest reading counts (weight, typing speed). Can go up or down.
  - `milestone` — qualitative goals ("become employable as a Product Designer").
    Progress = milestones completed.
- On save, the feasibility engine compares required pace with planned pace (and,
  once enough data exists, historical pace) and shows the arithmetic.
- **Requirements:** `cumulative` and `level` goals require unit, baseline and
  target. A deadline is optional, but without one feasibility is always
  "Insufficient data". Users log progress readings as **outcomes** (e.g. "+₦80,000
  saved", "weight 81.4 kg").
- **Dependencies:** F2, feasibility engine.
- **Acceptance:** for the blueprint example (₦400k → ₦2M in 6 months, historical
  ₦80k/month) the engine reports required ₦266,667/month, gap ₦186,667/month,
  state "Currently unrealistic", and lists the four adjustments.

### F4 — Strategy, milestones and actions (P0)

- **Purpose:** decompose a goal into stages and concrete steps.
- **Behavior:** strategy is an ordered list of approach statements. Milestones are
  ordered stages with an optional target date. Actions are concrete one-off steps
  under a goal (optionally under a milestone) that can be scheduled onto a day,
  which creates a task.
- **Requirements:** marking all of a milestone's actions done suggests, but doesn't
  force, completing the milestone.
- **Acceptance:** a user can build the blueprint §48 tree (4 milestones, several
  actions) in under 5 minutes on desktop.

### F5 — Routines (P0)

- **Purpose:** recurring commitments, and the main source of "planned" data.
- **Behavior:** a routine has days of week, preferred time, **normal duration**,
  **minimum duration**, optional ordered steps, an optional goal and an activity
  type. Each scheduled day becomes a task. The user can complete it as normal,
  complete the minimum version, or skip it.
- **Requirements:** routine tasks are generated idempotently for today and the next
  7 days. Editing a routine changes future tasks only.
- **Acceptance:** a routine on Mon/Tue/Wed/Thu/Fri shows exactly one task on each
  of those days. Completing it creates exactly one activity.

### F6 — Today (P0)

- **Purpose:** the single daily screen. Must not become a dashboard.
- **Behavior:** lists today's tasks grouped as High priority / Maintenance /
  Optional (derived from goal priority), the daily check-in, quick-log buttons,
  at most one "pattern to watch", and active experiments.
- **Requirements:** first meaningful paint < 1.5 s on a mid-range phone over 4G.
- **Acceptance:** a user can complete a task in one tap, and a done-minimum in two.

### F7 — Activity logging (P0)

- **Purpose:** record what actually happened.
- **Behavior:** activities are instances of a user-defined **activity type** (e.g.
  "Portfolio work", "Entertainment spending", "Late-night scrolling"). Each type
  has a life area, default unit and **polarity** (desired / undesired / neutral).
  Types marked "quick log" become one-tap buttons. Optional fields: duration,
  quantity, energy, mood, tags, note, linked goal. Logging for past dates is
  allowed.
- **Requirements:** a type is required, because free-text titles can't be
  aggregated for pattern detection. New types can be created inline from the log
  sheet.
- **Acceptance:** a one-tap log creates an activity with `occurred_at = now` in
  ≤ 1 round trip. Edits and deletes invalidate derived pattern evidence (see
  ARCHITECTURE §8.6).

### F8 — Daily check-in (P0)

- **Purpose:** capture context (sleep, energy, mood, stress, workload), which
  patterns depend on.
- **Behavior:** five optional 1–5 sliders (sleep in hours), one per local day,
  editable for the past 7 days.
- **Acceptance:** skipping the check-in never blocks anything else.

### F9 — Goal progress & health (P0)

- **Purpose:** show planned vs actual, not only a percentage.
- **Behavior:** per goal: outcome progress, execution consistency (last 28 days),
  milestone progress, time elapsed, feasibility state, and a health state (§11,
  BR-6) with its primary reason. A plan-vs-reality strip shows the last 4 weeks of
  planned vs done tasks.
- **Deferred:** strategy adherence and momentum (blueprint §24) go to P2. Both
  need data the MVP doesn't collect.
- **Acceptance:** every number on the screen can be expanded to show how it was
  computed.

### F10 — Pattern detection (P0)

- **Purpose:** the core differentiator.
- **Behavior:** deterministic detectors (ARCHITECTURE §8.3) produce patterns of
  kind `frequency`, `deviation`, `timing`, `streak`/`breaking_point`, `sequence`
  and `loop`. Each has a confidence level, a templated plain-language summary using
  cautious wording, and inspectable evidence (counts, windows, the underlying
  days).
- **Requirements:** a pattern below "moderate" confidence is never shown to the
  user. At most 3 patterns per weekly review and 1 on Today. Detection needs at
  least 21 days of history. Before that the UI shows a "still learning" state
  with the number of days remaining.
- **Acceptance:** on the seeded fixture datasets (ARCHITECTURE §12.2) every
  planted pattern is detected, and no pattern is reported on the random-noise
  fixture.

### F11 — Loop detection (P1)

- **Purpose:** surface recurring cycles that return to an earlier state.
- **Behavior:** the MVP detects only two well-defined loops:
  1. **Plan → abandon → re-plan:** a goal or routine goes inactive for ≥ 14 days,
     and a new goal or routine is created in the same life area. At least 2 cycles
     within 180 days.
  2. **Routine breaking point:** runs of consecutive completions repeatedly end at
     the same day index (± 1). This drives the blueprint's "this is usually where
     this starts losing momentum" nudge.
- **Acceptance:** loop explanations show each cycle's dates.

### F12 — Pattern feedback & insight lifecycle (P0)

- **Behavior:** each shown pattern offers Accurate / Partially accurate / Not
  accurate / Don't show again. Status moves `candidate → presented →
  acknowledged | dismissed → resolved`. A dismissed or suppressed pattern (by
  fingerprint) is never shown again, even if it's re-detected.
- **Acceptance:** "Don't show again" survives re-detection.

### F13 — Weekly review (P0)

- **Behavior:** generated on the first visit after the user's local week ends (and
  optionally by a daily cron). Contents: execution %, goals progressing / at risk,
  largest positive change, largest concern, up to 3 patterns, 1 suggested
  intervention, active or finished experiments. The snapshot is stored so it
  doesn't change when later data changes, and the user can add a reflection.
- **Acceptance:** opening the review twice doesn't regenerate it. "Refresh"
  regenerates it explicitly.

### F14 — Experiments (P0)

- **Behavior:** fields: hypothesis, intervention category (the 10 blueprint
  categories), description, one primary metric (task completion rate, active days,
  minutes, or quantity of an activity type), desired direction, and a duration of
  7–42 days. The baseline is computed automatically from the equal-length window
  before start. At the end the engine reports the result and a suggested outcome
  (improved / no change / worsened / inconclusive); the user confirms and reflects.
- **Requirements:** at most 1 active experiment per goal and 2 per user, so
  experiments don't confound each other. Suggested interventions come from a
  catalog keyed by pattern type (ARCHITECTURE §8.5).
- **Acceptance:** an experiment with fewer than 5 observed days in either window
  concludes "inconclusive", whatever the numbers say.

### F15 — Data export & deletion (P0)

- **Behavior:** a JSON export of every row the user owns. Account deletion removes
  every row through cascades, plus the auth user.
- **Acceptance:** after deletion, no row with that `user_id` exists in any table
  (verified by an integration test).

### F16 — AI assistance (P2, behind a flag)

- Goal decomposition suggestions and plain-language polishing of review text.
  Requires explicit consent (F1). The LLM only ever receives structured, minimized
  evidence and never has database access (ARCHITECTURE §9). **The MVP ships and
  must be fully usable without it.**

### F17 — Natural-language logging (P2)

- "Spent 2 hours on my portfolio" → structured activity. Depends on F16.

## 8. Functional Requirements (summary)

| ID | Requirement |
|---|---|
| FR-1 | The system stores every user-owned record with an owner and enforces per-user isolation at the database layer. |
| FR-2 | The system derives `local_date` for every activity, task, check-in and outcome from the user's timezone at write time. |
| FR-3 | The system generates routine tasks idempotently (at most one per routine per local date). |
| FR-4 | Completing a task that has an activity type (all routine tasks, and actions that name one) creates exactly one linked activity. Un-completing or skipping deletes it. |
| FR-5 | The system computes feasibility, progress and health deterministically from stored data. The same inputs always give the same outputs. |
| FR-6 | The system runs pattern detection per user over a bounded window (default the last 90 days) and deduplicates by fingerprint. |
| FR-7 | Every pattern shown to a user carries confidence, summary, and evidence the user can open. |
| FR-8 | The system generates at most one weekly review per user per week, stored as an immutable snapshot (except the reflection). |
| FR-9 | The system computes experiment baselines and results from the same metric definition. |
| FR-10 | Users can export and delete all of their data. |

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Today and log interactions p95 < 300 ms server time. Pattern detection for one user over 90 days < 2 s. Weekly review generation < 5 s. |
| Security | RLS on every table. No service-role key in client code. OWASP ASVS L1 baseline before public beta (see ARCHITECTURE §10). |
| Privacy | Minimal collection. No third-party analytics receives behavioral content. AI processing is opt-in. Export and delete are self-service. |
| Accessibility | WCAG 2.2 AA: keyboard reachable, 44 px touch targets, and colour never the only carrier of status. |
| Reliability | Losing a background job must never lose user data. Derived data (patterns, reviews) must always be recomputable from source rows. |
| Maintainability | Engines are pure functions with ≥ 90% line coverage. Domain rules live in one place (`src/server/engines`). |
| Responsiveness | Mobile-first responsive web, usable at 360 px width. |
| Localization | Currency and number formatting per user locale. UI text English-only in MVP. |

## 10. Business Rules

| ID | Rule |
|---|---|
| BR-1 | Language about patterns is descriptive, never causal or about character. Allowed: "often occur together", "may be contributing", "consider testing". Forbidden unless an experiment supports it: "because", "causes", "you are". Enforced by template tests. |
| BR-2 | A pattern needs ≥ moderate confidence to be shown, and ≥ 21 days of user history to be computed. |
| BR-3 | A loop requires ≥ 2 complete cycles. |
| BR-4 | Missed = a planned task whose `scheduled_date` is before the user's local today and that isn't done, done-minimum or skipped. It is derived, not stored. |
| BR-5 | Feasibility bands (ratio = historical or planned pace ÷ required pace): ≥ 1.0 Appears feasible; 0.75–1.0 Feasible with adjustments; 0.4–0.75 At risk; < 0.4 Currently unrealistic. No deadline, or < 14 days of history with no planned pace → Insufficient data. |
| BR-6 | Goal health: **Stalled** if no linked activity or outcome in 14 days. Otherwise **Needs recalibration** if feasibility is Currently unrealistic. Otherwise **At risk** if feasibility is At risk or 28-day execution < 50%. Otherwise **Uncertain** if feasibility is Insufficient data. Otherwise **On track**. |
| BR-7 | At most 1 active experiment per goal and 2 per user. Duration 7–42 days. |
| BR-8 | An experiment with < 5 observed days in the baseline or experiment window is inconclusive. |
| BR-9 | A pattern the user dismissed or suppressed is never shown again for the same fingerprint. |
| BR-10 | The weekly review covers the user's local week, per their `week_starts_on` setting. |
| BR-11 | Health states and feasibility states describe the plan, not the person. The UI never uses the word "fail" about the user. |

## 11. User Stories (selected)

- As a user, I want to see whether my savings goal is realistic at my current pace
  so I can adjust it before I fall behind. (F3, F9)
- As a user, I want to finish a shorter version of my workout on a bad day so a
  missed day doesn't become an abandoned routine. (F5)
- As a user, I want to log "entertainment spending ₦20,000" in two taps so logging
  doesn't feel like bookkeeping. (F7)
- As a user, I want to know which weekday I usually drop a routine, and why the app
  thinks so, so I can plan around it. (F10)
- As a user, I want to mark a pattern as inaccurate so the app stops telling me
  things that aren't true. (F12)
- As a user, I want to test for 14 days whether 30-minute sessions work better
  than 2-hour ones, and see the result compared to before. (F14)
- As a user, I want to download or delete everything the app knows about me. (F15)

## 12. MVP Scope

F1–F10, F12–F15 at P0, and F11 at P1. Responsive web only.

## 13. Out of Scope for MVP

- Native mobile/desktop apps (the web app is mobile-first; see Q4)
- Integrations of any kind: calendar, health, bank, GitHub, screen time
- Financial account linking, health-device integrations
- AI coaching, chat interface, natural-language logging (F16/F17 are P2)
- Social features, sharing, coaches, public profiles
- Gamification (points, badges, leaderboards)
- Advanced visualization: life graph, Sankey, thread view. MVP has lists, simple
  bars, a weekday heatmap and a plan-vs-reality strip only.
- Monthly, quarterly and yearly reviews
- Cross-domain pattern mining beyond check-in-conditioned rates
- Strategy adherence and momentum metrics
- Push/email notifications (Q5)
- Multi-language UI

## 14. Future Opportunities

In the blueprint's phase order: monthly/yearly reviews and trajectory views;
adaptive Today planning; cross-domain patterns; calendar and CSV imports;
predictive "risk today" interventions; AI conversation over structured evidence;
native mobile app; coach sharing.

## 15. Success Metrics

The north star is **goal execution rate**: planned actions that actually happen.

Supporting metrics: pattern feedback accuracy rate, intervention adoption rate,
experiment completion rate, targeted-behavior change after experiments (metric
delta vs baseline), and a user-reported usefulness score after each weekly review
(1 question, 1–5).

Deliberately **not** optimized for: DAU, streak length, number of activities
logged.

`ASSUMPTION` — product analytics are computed from our own database (aggregate
queries), not from a third-party analytics SDK. This keeps behavioral content
private.

## 16. Assumptions

1. Nigeria-first launch, but currency and timezone are per-user.
2. English-only UI.
3. A closed beta of ~50–200 users precedes any public launch.
4. Users will define their own activity types. Onboarding suggests a starter set
   per selected life area.
5. Deterministic engines give enough value without an LLM to test the hypothesis.
6. A small team (1–2 developers plus AI coding agents) builds the MVP.
7. Email + password and magic link are enough authentication for the beta.
8. No regulated health or financial data is collected. Users enter amounts and
   moods manually, and nothing is linked to accounts or devices.

## 17. Open Questions

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Target launch market(s)? This drives hosting region and privacy law (Nigeria NDPA 2023, GDPR if EU users). | **Resolved 2026-09-25 (ADR 0001):** Nigeria-first. Supabase `eu-west-2` and Vercel `lhr1` (London) until an African region is available. Privacy notice written to NDPA + GDPR. |
| Q2 | LLM provider and budget for P2 AI features? | Defer. Anthropic Claude behind an adapter, off by default. |
| Q3 | Pricing/monetization (free beta, subscription)? It affects whether billing belongs in the architecture. | Free closed beta. No billing code. |
| Q4 | When is a native mobile app needed? The mobile screen runbook suggests Figma mobile designs are planned. | Mobile-first responsive web for MVP. Mobile designs can target the same screens. API boundaries kept clean for a later native client. |
| Q5 | Are reminders/notifications required for the MVP daily loop? | No. In-app only. Revisit if week-2 retention is low. |
| Q6 | Product name and domain: is "Pattrnx" final? | Use "Pattrnx" as the working name. |
| Q7 | Brand/visual design: existing Figma file or design system? | None assumed. Tailwind + shadcn/ui defaults with a small token set. |
| Q8 | Should Google sign-in be offered at launch? | No. Email-based only. |

## 18. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Users don't log consistently, so patterns never emerge | Core hypothesis untestable | One-tap logging, task completion auto-logs, "still learning" state, check-in optional |
| Detectors surface false or trivial patterns | Trust collapses | Confidence thresholds, ≤ 3 per review, feedback loop, fixture-based tests incl. a noise fixture |
| Feasibility feels judgmental | Users disengage | Descriptive states, visible arithmetic, BR-11 wording |
| Scope creep toward "life operating system" | MVP never ships | §13 is binding. Changes need a PRD update |
| Sensitive data exposure (mood, spending) | Severe trust and legal harm | RLS, minimization, no third-party analytics, export/delete, security review before beta |
| Cold start: 21 days before the first pattern | Early churn | Goal feasibility and plan-vs-reality are useful from day 1. The review shows execution and deviations from week 1 |
