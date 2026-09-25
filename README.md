# Pattrnx

A personal behavioral intelligence and goal-execution system. You state what you
want and how you plan to get there, log what you actually do, and Pattrnx shows
the patterns in the gap between them and helps you run small experiments to
change them.

> **Observe → Understand → Intervene → Experiment → Adapt**

## Status

**MVP built (Milestones 1–4 merged); preparing the beta.** The MVP scope is
built: goals with feasibility checks, routines, daily logging, goal health,
calibrated pattern detection, experiments, weekly reviews, and data export and
deletion. Next is beta readiness (`FLOAT.md`); hosting setup is in
`Docs/DEPLOYMENT.md`. Security review:
`Docs/SECURITY_REVIEW.md`.

## Local development

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
pnpm db:start        # local Supabase (Postgres, Auth, Mailpit)
pnpm env:local       # writes .env.local from the running stack
pnpm dev             # http://localhost:3000
```

Demo login: `demo@pattrnx.local` / `pattrnx-demo-123`. Sign-up and reset emails
arrive in Mailpit at http://127.0.0.1:54324.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:test`,
`pnpm test:integration`, `pnpm build && pnpm test:e2e`. The full list is in
`AGENTS.md` §9.

## Documents

| File | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product requirements, MVP scope, business rules, open questions |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical source of truth: stack, schema, APIs, engines, security |
| [`ARCHITECTURE_ESSENTIALS.md`](ARCHITECTURE_ESSENTIALS.md) | One-page quick reference |
| [`AGENTS.md`](AGENTS.md) | Canonical rules for AI coding agents (imported by `CLAUDE.md`) |
| [`FLOAT.md`](FLOAT.md) | Current working state and next steps |
| [`Docs/KICKOFF_REVIEW.md`](Docs/KICKOFF_REVIEW.md) | Stress test: risks, edge cases, simplifications, readiness checklist |
| [`Docs/SECURITY_REVIEW.md`](Docs/SECURITY_REVIEW.md) | Security review: findings, controls, scorecard, what's not verified |
| [`Docs/DEPLOYMENT.md`](Docs/DEPLOYMENT.md) | Hosting setup (Vercel + Supabase, London), shipping changes, smoke test |
| [`Docs/architecture.md`](Docs/architecture.md) | Original product blueprint |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres,
Auth, RLS) · Zod · Vitest · Playwright · Vercel. See `ARCHITECTURE.md` §1.
