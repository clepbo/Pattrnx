# Pattrnx — Security Review (Milestone 4, pre-beta)

**Date:** 2026-09-24
**Scope:** the whole application on the Milestone 4 branch: Next.js app, server
actions and route handlers, Supabase schema, RLS, SQL functions, auth flows,
configuration, dependencies and CI.
**Method:** the `Security-review.md` skill (clepbo/Claude-skills-prompts):
attacker simulation, STRIDE, OWASP Top 10, ASVS L1 spot checks, and the required
security controls. Findings were checked against the running local stack, not just
by reading code (§ Evidence).
**Not in scope:** hosted Supabase and Vercel configuration (no production project
exists yet; see NOT VERIFIED).

---

## Executive Summary

Pattrnx is in good shape for a closed beta. Tenant isolation is enforced in
Postgres (RLS on every table, composite `(id, user_id)` foreign keys, anon revoked)
and backed by automated cross-user tests at three levels (pgTAP, API integration,
e2e). The database, not the UI, is the real validation boundary, because users can
call the Supabase API directly with their own token. Direct-API probes confirmed
the database rejects out-of-range values, forged derived fields, writes to
protected columns, and anonymous RPC calls.

The review found **two Medium and two Low issues, all fixed and verified in this
change**:
- a rate-limit bypass (SR-1)
- account deletion without a recent sign-in (SR-2)
- cross-site-triggerable exports (SR-3)
- unbounded client-writable JSON (SR-4)

Two Low issues remain open by design (SR-5, SR-6), with mitigations planned.
Nothing Critical or High was found.

## Overall Risk

**Low.** No open Critical, High or Medium findings. The remaining risks are
self-only (a user affecting their own data) or depend on production settings that
must be configured when the hosted project is created.

---

## Findings

### [MEDIUM] SR-1: Export rate limit could be reset by the user — FIXED

- **Category:** OWASP A04 Insecure Design / API4 Unrestricted Resource Consumption; STRIDE: Denial of Service
- **Location:** `supabase/migrations/20260927090000_intervene_and_learn.sql`, `hit_rate_limit`
- **Description:** the first version took `p_max` and `p_window` from the caller and deleted the caller's older windows. Any signed-in user can call RPCs directly.
- **Attack scenario:** call `hit_rate_limit('export', 100, '1 second')` through the Supabase API. The function deletes the user's current hourly bucket, so the next export is allowed again. Repeat to export without limit.
- **Impact:** bypasses the export limit (server load, and bulk data egress from a hijacked session).
- **Likelihood:** Medium. **Severity:** Medium.
- **Evidence:** probe in a rolled-back transaction: hits under a limit of 1 per hour returned `t, f`, then the one-second call returned `t`, then the hourly call returned `t` again.
- **Fix:** the signature is now `hit_rate_limit(p_action text)`. Limits live inside the function, and unknown actions raise. Users still can't write `rate_limits` directly.
- **Verification:** pgTAP checks that the 6th export in an hour is refused and that unknown actions raise. A direct-API probe of the old signature returns `PGRST202`. The e2e export test gets 429 on the 6th request.

### [MEDIUM] SR-2: Account deletion with only a session — FIXED

- **Category:** OWASP A07 Identification & Authentication Failures; ASVS V2 re-authentication for sensitive operations; STRIDE: Tampering
- **Location:** `src/server/services/account.ts`, `deleteAccountAction`
- **Description:** deletion needed an active session and a typed "DELETE", but no proof of recent authentication. Sessions last up to 90 days.
- **Attack scenario:** someone using an unlocked device, or holding a stolen session cookie, erases the account and all its data, which can't be recovered.
- **Impact:** irreversible loss of the user's data. **Likelihood:** Low. **Severity:** Medium (irreversible).
- **Fix:** deletion now requires a sign-in within the last 15 minutes (`signedInRecently`). Otherwise the form asks the user to sign in again, with a link back to Settings.
- **Verification:** unit tests for the window. The e2e deletion test still passes right after sign-in.

### [LOW] SR-3: Cross-site requests could trigger exports — FIXED

- **Category:** OWASP A01 (CSRF); STRIDE: Denial of Service
- **Location:** `src/app/api/export/route.ts`
- **Description:** session cookies are `SameSite=Lax`, which browsers send on top-level cross-site GET navigations.
- **Attack scenario:** a malicious page navigates the victim to `/api/export` five times. The victim gets unexpected downloads and loses their export quota for the hour. No data reaches the attacker (the download goes to the victim).
- **Fix:** requests with `Sec-Fetch-Site: cross-site` are refused with 403.
- **Verification:** e2e asserts 403 for a cross-site request and 200 for same-origin.

### [LOW] SR-4: Unbounded JSON in client-writable columns — FIXED

- **Category:** API4 Unrestricted Resource Consumption; STRIDE: Denial of Service
- **Location:** `reviews.content`, `patterns.evidence/subject/vars`, `experiments.metric_subject`, `activity_types.quick_log_defaults`
- **Description:** these columns are written by services that run as the user, so users can also write them directly. There was no size bound.
- **Evidence:** a 2 MB `reviews.content` insert through the API was accepted.
- **Fix:** `pg_column_size` checks (64 KB for large documents, 1–8 KB for small ones).
- **Verification:** pgTAP rejects an oversized review. The direct-API probe now returns `23514`.

### [LOW] SR-5: Derived tables are client-writable (self only) — OPEN, accepted for beta

- **Category:** OWASP A04 Insecure Design; STRIDE: Tampering (self)
- **Location:** `patterns`, `reviews`, `profiles.patterns_dirty` / `patterns_checked_at`, `claim_pattern_detection(p_max_age)`
- **Description:** derived data is written by services running as the user (by design, so RLS always applies). So a user can insert or modify their own patterns and reviews, or force detection on every request.
- **Impact:** self-only. A user can mislead only themselves, or raise compute cost for their own requests (detection is bounded to 90 days and under 2 s). RLS prevents any cross-user effect.
- **Recommendation (P3):** move derived-data writes into `security definer` RPCs that validate the payload, and revoke direct insert/update on `patterns` and `reviews` from `authenticated`. Rate-limit `claim_pattern_detection` if abuse appears.

### [LOW] SR-6: Email-link tokens are verified on GET — OPEN

- **Category:** OWASP A07; availability of the auth flow
- **Location:** `src/app/auth/confirm/route.ts`
- **Description:** some email security scanners prefetch links, which consumes one-time tokens before the user clicks.
- **Impact:** "link didn't work" for some users. No security impact: the token is consumed, not leaked.
- **Recommendation (P3):** if beta users report it, show a confirm button that POSTs the token instead of verifying on GET (noted in `FLOAT.md`).

### Informational

- **SR-7: no app-level write quotas.** Server actions and direct PostgREST writes aren't rate-limited per user, so a user could inflate their own tables. Supabase platform limits apply. Add per-user write quotas via `hit_rate_limit` if abuse appears.
- **SR-8: no error monitoring yet** (OWASP A09). Structured logs exist, with no user content. Add Sentry with `beforeSend` scrubbing before public beta (ARCHITECTURE §10).
- **SR-9: CSP allows `style-src 'unsafe-inline'`.** A documented trade-off: React renders SSR `style` attributes. Scripts are nonce-restricted with `strict-dynamic`.
- **SR-10: export doesn't require a recent sign-in.** Accepted: someone holding a session can already read all the same data in the UI. SR-3 and the rate limit bound automated abuse.
- **SR-11 (fixed): `shadcn` moved from dependencies to devDependencies.** It's only needed at build time for CSS.

---

## Required Security Controls

| Control | Status | Evidence |
|---|---|---|
| 1. Rate limiting | **Implemented** (auth, export); partial elsewhere (SR-7) | Supabase Auth built-in limits; `hit_rate_limit` (SR-1 fixed); e2e 429 |
| 2. Input sanitization / validation | **Implemented** | Zod on every action and route; DB check constraints on every column (direct-API probes rejected); React escaping; no `dangerouslySetInnerHTML` |
| 3. Password hashing | **Implemented** (Supabase Auth, bcrypt) | Min length 10 (`config.toml`); leaked-password check is a hosted setting: NOT VERIFIED |
| 4. Environment variables | **Implemented** | Zod-validated `publicEnv` / `serverEnv`; `.env*` ignored; GitGuardian on PRs; test keys come from the environment, never hard-coded |
| 5. CORS | **Implemented** (no cross-origin API) | Route handlers set no CORS headers; SR-3 blocks cross-site export |
| 6. SQL injection protection | **Implemented** | PostgREST parameterization; SQL functions use no dynamic SQL from input; one PostgREST `in` filter is built from engine-generated fingerprints (UUIDs and keys only) |
| 7. Session expiry | **Partially verified** | Refresh rotation and reuse detection on (`config.toml`); 30-day idle / 90-day absolute are hosted settings: NOT VERIFIED; sign-out revokes the local session; a password change signs out other sessions |
| 8. HTTPS everywhere | **Implemented** (on deploy) | HSTS with preload; `upgrade-insecure-requests` in the production CSP |
| 9. Security headers | **Implemented** | Per-request nonce CSP, `frame-ancestors 'none'`, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; e2e-asserted |
| 10. Dependency updates | **Implemented** | `pnpm audit --prod --audit-level high` in CI (currently 0 findings); Dependabot weekly |

## OWASP Top 10 Assessment

| Category | Assessment |
|---|---|
| A01 Broken Access Control | RLS on all 17 tables, composite FKs, pgTAP + API + e2e isolation tests. SR-3 fixed. **Strong** |
| A02 Security Misconfiguration | Headers and CSP strong. Hosted settings NOT VERIFIED (checklist in `FLOAT.md`) |
| A03 Supply Chain | Lockfile, audit gate, Dependabot, GitGuardian |
| A04 Cryptographic Failures | Delegated to Supabase (bcrypt, TLS). No custom crypto |
| A05 Injection | Parameterized throughout. No raw HTML |
| A06 Insecure Design | SR-1 fixed. SR-5 open (self-only) |
| A07 Authentication Failures | No account enumeration, email confirmation, magic links can't create accounts, open-redirect guard (tested). SR-2 fixed |
| A08 Integrity Failures | CI gates every PR. Migrations forward-only |
| A09 Logging & Alerting | Structured, content-free logs. No alerting yet (SR-8) |
| A10 Exceptional Conditions | Error boundaries. Detection failures never block pages. Expected errors are typed `ActionResult`s |

## ASVS (Level 1 spot checks)

- **V2 Authentication:** password length ✓, no enumeration ✓, re-authentication for deletion ✓ (SR-2). Breached-password check NOT VERIFIED.
- **V3 Session:** httpOnly/Secure/SameSite cookies via `@supabase/ssr` ✓, refresh rotation ✓, logout ✓.
- **V4 Access Control:** deny by default (RLS) ✓, IDOR resistance via RLS + composite FKs ✓.
- **V5 Validation:** server-side schema validation ✓, output encoding ✓.
- **V7 Errors & Logging:** generic user errors ✓, no sensitive data in logs ✓.
- **V8 Data Protection:** export ✓, deletion ✓, no third-party analytics ✓, no cache on exports ✓.
- **V14 Configuration:** headers ✓, secrets in environment ✓.

## STRIDE Assessment

| Threat | Assessment |
|---|---|
| Spoofing | Supabase Auth. Server verifies with `getUser()`. The proxy only refreshes sessions and redirects; authorization never trusts it |
| Tampering | RLS and constraints block cross-user writes. Self-tampering with derived data is possible (SR-5, accepted) |
| Repudiation | Single-user data. Timestamps on every row. No audit log (not needed at this stage) |
| Information disclosure | RLS; not-found for foreign IDs (no existence leak); export is same-origin only; no behavioural content in logs |
| Denial of service | Bounded detection windows, JSON size caps (SR-4), export limit (SR-1), Supabase Auth limits. SR-7 open (informational) |
| Elevation of privilege | Single role. Service-role client is lint-restricted to `account.ts` and cron. `security definer` functions pin `search_path` and act only on `auth.uid()` rows |

## API Security (OWASP API Top 10)

Two API surfaces exist: the app's server actions and route handlers, and the
Supabase API, which users can call directly.

- **API1/API3 (object and property level authorization):** RLS plus column grants on `profiles`.
- **API2 (authentication):** Supabase JWTs.
- **API4 (resource consumption):** SR-1, SR-4 fixed; SR-7 open.
- **API5 (function level authorization):** execute revoked from `anon` on every function.
- **API8 (misconfiguration):** see headers.
- **API10 (unsafe consumption):** no third-party APIs yet.

## Attack Surface

1. Public pages and auth flows (`/login`, `/signup`, `/forgot-password`, `/auth/confirm`)
2. Authenticated pages and server actions (every mutation)
3. `/api/export` (GET) and `/api/health`
4. The Supabase API (PostgREST + RPC) with the user's JWT: effectively a second API where the database is the only guard
5. Email links (confirmation, magic link, recovery)
6. CI/CD and dependencies

## Security Architecture

**Strengths:**
- Authorization in the database, tested at three layers.
- Pure engines with no I/O.
- Service role isolated by a lint rule.
- Nonce CSP.
- Derived fields computed by triggers, so they can't be forged.
- Every table added later is automatically checked for RLS, `user_id`, anon grants, and export coverage (pgTAP guards and the export test).

**Weaknesses:**
- Derived data is written with user rights (SR-5).
- Hosted configuration isn't codified. Auth templates and settings must be mirrored by hand (`FLOAT.md` checklist).

## Dependency Security

`pnpm audit --prod`: 0 known vulnerabilities (2026-09-24). CI fails on high or
above. Dependabot updates weekly. Runtime dependencies are minimal: Next, React,
Supabase clients, Zod, `@date-fns/tz`, and UI primitives.

## Secrets Review

No secrets in the repository. GitGuardian scans every PR, and it caught the local
Supabase demo JWTs in test helpers during Milestone 1: public local-only keys,
removed and scrubbed from history. `.env.local` is git-ignored. The service-role
key is read only in `src/server/env.ts` (server-only).

## Security Fixes Implemented in This Change

SR-1 (fixed-limit rate function), SR-2 (recent sign-in for deletion), SR-3
(cross-site export blocked), SR-4 (JSON size caps), SR-11 (dev dependency). Each
has an automated test (pgTAP, unit or e2e).

## Remaining Risks

SR-5, SR-6 (Low); SR-7, SR-8, SR-9, SR-10 (Informational); plus everything in
NOT VERIFIED.

## NOT VERIFIED

- Hosted Supabase settings: leaked-password protection, session timeouts, custom SMTP, email templates, redirect allow-list, MFA for operator dashboard access.
- Vercel settings: environment-variable scoping, preview protection.
- TLS configuration in production.
- Backups and PITR.
- Behaviour under real email security scanners (SR-6).

## Remediation Plan

- **P0 (immediate):** none.
- **P1 (high priority):** none.
- **P2 (before public beta):** Sentry with scrubbing (SR-8). Apply and verify the production settings checklist (NOT VERIFIED items).
- **P3 (hardening):** derived-data writes via validated RPCs (SR-5). POST confirmation for email links if reported (SR-6). Per-user write quotas if abuse appears (SR-7).

## Security Scorecard

```text
Authentication       85   Supabase Auth, no enumeration, re-auth for deletion; breached-password check not verified
Authorization        92   RLS everywhere, composite FKs, three layers of isolation tests; derived tables self-writable (SR-5)
Input Validation     90   Zod + DB constraints, verified by direct-API probes
API Security         82   RLS-guarded direct API, rate limit fixed; no general write quotas (SR-7)
Data Protection      85   Export/delete, no third-party analytics, content-free logs; at-rest encryption is the provider's
Session Security     80   Secure cookies, rotation; production timeouts not verified
Infrastructure       75   Strong headers/CSP; hosted configuration not yet codified or verified
Dependencies         90   Minimal runtime deps, audit gate, Dependabot
Secrets Management   90   Env-only, server-only key, GitGuardian
Logging & Monitoring 60   Structured, content-free logs; no alerting yet (SR-8)
Overall Security     83
```

Re-run this review at the end of each milestone, and before the production project
is created.
