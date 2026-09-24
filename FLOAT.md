# FLOAT.md — Working State

A **floating context** file: where the project is right now. It is not a rulebook.
All agent rules live in `AGENTS.md`, which wins in any conflict. Keep this file
short. Rewrite the sections below as they go stale, and don't keep appending
history.

## Current phase

**Phase 0: Kickoff complete, awaiting architecture approval.**
No application code exists yet. Only planning documents and the empty folder
scaffold are in the repo. Per the kickoff process, implementation starts only
after the human approves `PRD.md` and `ARCHITECTURE.md`.

## Next up (once approved)

Milestone 1, Foundation:

1. Initialize the Next.js + TypeScript + Tailwind + shadcn/ui app with pnpm, in the
   existing scaffold.
2. `supabase init`. First migration: enums, `profiles` (+ sign-up trigger),
   `life_areas`, `activity_types`, `activities`, `daily_checkins`, with RLS and
   pgTAP tests.
3. Auth pages, middleware, `requireUser`, env validation (`src/lib/env.ts`).
4. CI workflow (typecheck, lint, unit, local Supabase, pgTAP).
5. `src/lib/dates` with timezone helpers and tests.

Then Milestone 2 (goals, feasibility, milestones, actions, routines, tasks,
Today), Milestone 3 (progress/health, patterns, feedback), and Milestone 4 (weekly
review, experiments, export/delete, security review, beta).

## Recent decisions

- 2026-09-24: kickoff. The stack and all deviations from the blueprint are
  recorded in `ARCHITECTURE.md` §18–§19.

## Open questions blocking work

None block Milestone 1. Q1 (hosting region) must be answered before the
production Supabase project is created. See `PRD.md` §17.

## Known gaps / notes for the next agent

- `Docs/architecture.md` is the original blueprint. Don't edit it. Record
  deviations in `ARCHITECTURE.md` §19.
- Pattern thresholds in `ARCHITECTURE.md` §8.3–8.4 are initial guesses, to be
  tuned against fixtures and beta data.
