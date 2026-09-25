# 0001 — Hosting platform and region

- Status: accepted
- Date: 2026-09-25

## Context

PRD Q1 asked for the launch market, which decides the hosting region and the
privacy law to follow. The beta is Nigeria-first. Supabase has no African region.
The architecture already assumed Vercel (app) and Supabase Cloud (database, auth),
but didn't fix a region or error monitoring (security review SR-8).

Every page is rendered on the server and makes several database calls, so the
distance between the app's server code and the database matters more than the
distance from the user to the server.

## Decision

- **Vercel** hosts the app, with serverless functions pinned to **London (`lhr1`)**
  in `vercel.json`. Pro plan, because Hobby is for non-commercial use.
- **Supabase** production and staging projects in **London (`eu-west-2`)**.
  Previews use staging. Production is on Supabase Pro (backups, no pausing).
- **Migrations** are applied by a manual GitHub workflow (`deploy-db.yml`), with a
  required reviewer on the `production` environment. It never seeds.
- **Sentry** (`@sentry/nextjs`) reports **server errors only**, off unless
  `SENTRY_DSN` is set. It's configured to collect no user data, and `beforeSend`
  scrubs events again. Sentry organization in the EU data region.
- The privacy notice is written to NDPA 2023 (including the cross-border transfer
  to the UK) and GDPR.

## Alternatives considered

- **Vercel's default region (Washington, `iad1`)**: each page's database calls
  would cross the Atlantic. Rejected.
- **Supabase in Frankfurt (`eu-central-1`)**: similar latency from Lagos. London
  has the better-established connectivity to West Africa, and the UK has an
  adequacy decision from the EU.
- **Self-hosting in Africa (e.g. a Lagos or Johannesburg VPS with self-hosted
  Supabase)**: keeps data local, but we'd run Postgres, auth, backups and TLS
  ourselves. Too much operational load for a beta. Revisit if a Supabase African
  region appears or regulation requires local storage.
- **Netlify, Cloudflare, or Render for the app**: workable, but Vercel supports new
  Next.js releases first and gives preview deployments per PR with no setup.
- **Browser Sentry SDK**: catches client-side errors, but adds bundle weight, a CSP
  `connect-src` entry, and more ways to leak typed content. Deferred; most logic
  runs on the server.

## Consequences

- Fixed monthly cost for the beta (Vercel Pro + Supabase Pro), roughly $45/month
  at current list prices, plus an email provider's free tier.
- Personal data is stored in the UK. The privacy notice must say so and name the
  transfer mechanism.
- Client-side (browser) errors aren't reported. Add the browser SDK if beta users
  report blank screens that don't appear in server errors.
- Source maps aren't uploaded to Sentry yet, so stack traces show built file
  names. Add `withSentryConfig` with an auth token if that slows debugging.
