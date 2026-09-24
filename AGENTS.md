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
  `user_id` (FK → `auth.users on delete cascade`), RLS enabled, four policies, and
  a pgTAP cross-user test.
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
  applied migration. Regenerate `src/server/db/database.types.ts` after.
- Don't use `dangerouslySetInnerHTML`, and don't build dynamic SQL from input.

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
6. Run `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm test:integration`
   and `supabase test db` when the DB is touched.
7. Verify existing behavior is intact. Update docs and `FLOAT.md`.

## 9. Definition of done

- Typecheck, lint, unit, integration and RLS tests pass. E2E smoke passes for
  touched journeys.
- New tables have RLS and pgTAP tests. New detectors have fixture tests,
  including the noise fixture.
- No new dependency without justification. No secrets committed.
- Docs updated if architecture, schema or rules changed.
