# AGENTS.md — Instructions for AI Coding Agents

This is the **canonical** instruction file for any AI agent working in this
repository. `CLAUDE.md` imports it. `FLOAT.md` holds current working state and
defers to this file for every rule. If they conflict, this file wins.

## 0. Read first

1. `ARCHITECTURE_ESSENTIALS.md`: always, before any change.
2. `ARCHITECTURE.md`: the section relevant to your change (schema §4, API §5,
   engines §8, security §10).
3. `PRD.md`: the feature (F-number) and business rules (BR-n) you're touching.
4. `FLOAT.md`: current phase, recent decisions, known gaps.

`Docs/architecture.md` is the original product blueprint. Use it for product
intent. Where it differs from `ARCHITECTURE.md`, follow `ARCHITECTURE.md` (see its
§19).

## 1. General behavior

- Understand the architecture and inspect the relevant files before modifying
  them.
- Follow existing patterns. If none exists, follow this file and
  `ARCHITECTURE.md`.
- Keep changes focused on the requirement. Don't refactor unrelated code in the
  same change.
- Avoid unnecessary complexity. Preserve existing behavior unless the change is
  meant to alter it.
- Update the docs in the same change when you alter an architectural decision,
  schema, business rule or folder boundary: `ARCHITECTURE.md`, and
  `ARCHITECTURE_ESSENTIALS.md` if it's listed there, plus an ADR in
  `Docs/decisions/`.
- Update `FLOAT.md` at the end of a working session: what changed, what's next,
  and open issues.

## 2. Coding principles (in priority order)

1. Correctness
2. Simplicity
3. Maintainability
4. Security
5. Consistency
6. User experience

## 3. Hard rules

- **Engines are pure.** Nothing in `src/server/engines/**` imports from
  `src/server/db`, `src/server/services`, `next/*`, `@supabase/*`, or reads the
  clock, env or randomness. `today` comes in via the snapshot.
- **Layering:** `app`/`features` → `services` → (`db`, `engines`). Client
  components never import `src/server/**`.
- **Authorization is RLS.** Every new table ships in the same migration with
  `user_id uuid not null default auth.uid()` (FK → `auth.users on delete
  cascade`), RLS enabled, four `to authenticated` policies using
  `(select auth.uid()) = user_id`, `revoke all … from anon`, a `unique (id,
  user_id)` constraint, and cross-user pgTAP tests. References to other
  user-owned rows use composite FKs `(x_id, user_id)`. Follow
  `supabase/migrations/20260924120000_foundation.sql`.
- **Service role** is only imported from `src/server/db/admin.ts`, and only by
  `/api/cron/*` and account deletion.
- **Validate every input** with Zod in the action/handler. Never trust ids from the
  client beyond RLS.
- **BR-1 wording:** user-facing pattern and experiment text comes from
  `engines/language` templates and passes `wordingGuard`. Never write causal or
  character claims ("because you…", "you are…", "causes").
- **Dates:** use `src/lib/dates` helpers. Never `new Date().getDay()` or similar
  for user-facing day logic. Local dates come from the user's timezone.
- **Money:** `numeric` in DB, and `src/lib/money` for formatting. Never float
  arithmetic for display rounding.
- **No behavioral content in logs** (notes, titles, amounts, moods). Log ids and
  outcomes only.
- **Schema changes only via** a new file in `supabase/migrations/`. Never edit an
  applied migration. Run `pnpm db:types` after (CI fails on drift). Import
  `Database`/`Tables` from `@/server/db/database`, which corrects the generated
  types (e.g. trigger-derived columns aren't insertable).
- **Next.js 16:** request interception lives in `src/proxy.ts` (the renamed
  middleware). `params`/`searchParams`/`cookies()`/`headers()` are async. Check
  `node_modules/next/dist/docs/` before using an API from memory.
- **Forms:** client form components use `useActionState` with a server action
  returning `ActionResult` (see `src/features/auth`). Failures echo back
  non-secret values, because React resets forms after an action.
- Don't use `dangerouslySetInnerHTML`, and don't build dynamic SQL from input.
- **Pattern detectors:** every new or changed detector needs a planted persona in
  `tests/fixtures/behavior`, a template in `engines/language/templates.ts`, an
  evidence view in `features/patterns/components/pattern-evidence.tsx`, a
  `version` bump, and a passing `pnpm test:robustness`. Comparison detectors must
  report `z` and the size of their whole test family in `comparisons`.
- **The database is the validation boundary.** Users can call the Supabase API
  directly, so every rule must also be a DB constraint or live in a SQL function.
  JSON columns need a `pg_column_size` cap. Never let a client-callable function
  take limits or privileges from its arguments (see SR-1 in `Docs/SECURITY_REVIEW.md`).
- **Services build DB payloads explicitly.** Never pass a parsed form object straight
  to `.insert()` / `.update()`. Extra fields become unknown columns, and TypeScript
  doesn't catch it when the object is a variable.
- **New user-owned tables** must be added to `services/export-tables.ts` (a test
  fails otherwise).
- **Triggers on user tables** that touch other tables must work when Supabase Auth
  cascades an account deletion (it runs as `supabase_auth_admin`). Use
  `security definer` for those, and keep the integration deletion test passing.

## 4. Conventions

| Area | Convention |
|---|---|
| Files/folders | `kebab-case.ts(x)`. React components export `PascalCase`. One component per file |
| TS naming | `camelCase` variables/functions, `PascalCase` types, `SCREAMING_SNAKE` constants. No `any`, no non-null `!` without a comment |
| DB naming | `snake_case` plural tables, `snake_case` columns, `<table>_<cols>_key/idx` constraint names. Enums singular |
| DB row types | Use generated types from `database.types.ts` in services. Engines use their own camelCase input types (`src/types`), and services map rows → engine inputs |
| Features | `src/features/<feature>/{components/, actions.ts, schemas.ts}`. Actions are thin (§5.2 of ARCHITECTURE) |
| Server actions | Return `ActionResult<T>`. Never throw expected errors to the client. Call `revalidatePath`/`revalidateTag` after mutation |
| Services | One module per aggregate in `src/server/services`. Take `user` as the first param. Return `Result<T, DomainError>` |
| Engines | One folder per engine. Detectors implement `Detector`, are registered in `patterns/registry.ts`, and bump `version` when logic changes. All thresholds in `thresholds.ts` |
| Components | Server Components by default. Add `'use client'` only for interactivity. Build on `src/components/ui` primitives. Accessible labels are mandatory. Touch targets ≥ 44 px. Status is never shown by colour alone |
| Styling | Tailwind utilities + design tokens in `tailwind.config`. No inline style objects except dynamic chart geometry |
| Tests | Unit tests colocated as `*.test.ts`. Integration in `tests/integration`, e2e in `tests/e2e`, RLS in `supabase/tests`. Engines need tests for every branch, including insufficient-data paths |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), imperative, ≤ 72-char subject |

## 5. Dependencies

Don't add a dependency without a clear reason. First check whether the existing
stack (Next, React, Supabase, Zod, date-fns, Tailwind/shadcn) can do it reasonably.
If you add one, justify it in the PR description. If it's architectural (a
framework, ORM, queue, datastore, state library or chart library), write an ADR
and get approval first.

## 6. Architecture changes

Don't introduce new frameworks, architectural patterns, databases, infrastructure
or major dependencies without an ADR in `Docs/decisions/NNNN-title.md` (context,
decision, alternatives, consequences) and human approval.

## 7. Uncertainty

When a requirement is ambiguous: check the PRD, then the architecture, then the
existing code, and prefer established conventions. If the decision has
significant consequences (schema, business rule, privacy, user-facing wording
about behavior), stop and ask. Don't invent major requirements. Record your
assumption in `FLOAT.md` if you proceed on a minor one.

## 8. Workflow for every change

1. Identify the requirement (F-number / BR-n / issue).
2. Read the relevant code and docs.
3. Identify dependencies and affected tables, engines and pages.
4. Choose the smallest appropriate change.
5. Implement it, with tests: engine unit tests first where logic is involved.
6. Run `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm db:test`,
   `pnpm db:lint` and `pnpm test:integration` when the DB is touched, and
   `pnpm test:e2e` when a user journey is touched.
7. Verify existing behavior is intact. Update docs and `FLOAT.md`.

## 9. Commands

| Task | Command |
|---|---|
| First-time setup | `pnpm install && pnpm db:start && pnpm env:local` |
| Dev server | `pnpm dev` (demo login: `demo@pattrnx.local` / `pattrnx-demo-123`; emails in Mailpit at http://127.0.0.1:54324) |
| Typecheck / lint | `pnpm typecheck && pnpm lint` |
| Unit tests | `pnpm test` (`pnpm test:coverage` for coverage) |
| DB tests / lint | `pnpm db:test && pnpm db:lint` |
| Reset DB (migrations + seed) | `pnpm db:reset` |
| Regenerate DB types | `pnpm db:types` |
| Integration tests | `pnpm test:integration` (needs local Supabase) |
| E2E | `pnpm build && pnpm test:e2e` (needs local Supabase) |
| Pattern calibration | `pnpm test:robustness` (300 noise users + 30 seeds per persona; run after any detector or threshold change) |

## 10. Definition of done

- Typecheck, lint, unit, integration and RLS tests pass. E2E smoke passes for
  touched journeys.
- New tables have RLS and pgTAP tests. New detectors have fixture tests,
  including the noise fixture.
- No new dependency without justification. No secrets committed.
- Docs updated if architecture, schema or rules changed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
