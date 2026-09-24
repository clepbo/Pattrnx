# Pattrnx

A personal behavioral intelligence and goal-execution system. You state what you
want and how you plan to get there, log what you actually do, and Pattrnx shows
the patterns in the gap between them and helps you run small experiments to
change them.

> **Observe → Understand → Intervene → Experiment → Adapt**

## Status

**Milestone 3 (Understand) in review.** Goal health, the plan-vs-reality strip,
statistically calibrated pattern and loop detection with inspectable evidence and
feedback. See `FLOAT.md` for what's next.

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
| [`Docs/architecture.md`](Docs/architecture.md) | Original product blueprint |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres,
Auth, RLS) · Zod · Vitest · Playwright · Vercel. See `ARCHITECTURE.md` §1.
