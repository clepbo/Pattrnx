# Pattrnx

A personal behavioral intelligence and goal-execution system. You state what you
want and how you plan to get there, log what you actually do, and Pattrnx shows
the patterns in the gap between them and helps you run small experiments to
change them.

> **Observe → Understand → Intervene → Experiment → Adapt**

## Status

**Phase 0: kickoff complete, awaiting architecture approval.** There's no
application code yet, only planning documents and the folder scaffold.

## Documents

| File | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product requirements, MVP scope, business rules, open questions |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical source of truth: stack, schema, APIs, engines, security |
| [`ARCHITECTURE_ESSENTIALS.md`](ARCHITECTURE_ESSENTIALS.md) | One-page quick reference |
| [`AGENTS.md`](AGENTS.md) | Canonical rules for AI coding agents (imported by `CLAUDE.md`) |
| [`FLOAT.md`](FLOAT.md) | Current working state and next steps |
| [`Docs/KICKOFF_REVIEW.md`](Docs/KICKOFF_REVIEW.md) | Stress test: risks, edge cases, simplifications, readiness checklist |
| [`Docs/architecture.md`](Docs/architecture.md) | Original product blueprint |

## Planned stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres,
Auth, RLS) · Zod · Vitest · Playwright · Vercel. See `ARCHITECTURE.md` §1.
