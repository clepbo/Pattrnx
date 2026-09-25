# Pattrnx — Deployment Runbook

How to stand up the hosted environments for the beta and ship changes to them.
Decision record: `Docs/decisions/0001-hosting-and-region.md`. Architecture:
`ARCHITECTURE.md` §15–17.

Dashboards change their labels over time. Where a menu path here doesn't match,
search the dashboard for the setting name.

## What you'll create

| Service | What | Plan | Region |
|---|---|---|---|
| Supabase | `pattrnx-production` project | Pro (daily backups, no pausing) | London (`eu-west-2`) |
| Supabase | `pattrnx-staging` project (previews) | Free is fine | London (`eu-west-2`) |
| Vercel | One project linked to `clepbo/Pattrnx` | Pro (Hobby is non-commercial only) | Functions in London (`lhr1`, set by `vercel.json`) |
| Sentry | One Next.js project | Free (Developer) is enough for the beta | Choose EU data storage when creating the organization |
| Email | Resend or Postmark, sending from your domain | Free tier covers a closed beta | Any |
| Domain | e.g. `pattrnx.app` | | |

Why London: Nigeria-first launch, and Supabase has no African region yet (PRD Q1).
The app's server code runs in the same city as the database, because every page
makes several database calls.

## Testing setup (current): personal Gmail, no custom domain

Until a domain is bought and real beta users are invited, the setup is smaller.
Where this section differs from the steps below, follow this section.

| Item | Testing setup | Switch before inviting beta users |
|---|---|---|
| App URL | Vercel's default `https://<project>.vercel.app` (see *Settings → Domains* for the exact name) | Your own domain |
| Auth emails | Gmail SMTP from your personal Gmail (below) | An email provider sending from your domain |
| Supabase | Just `pattrnx-production` on the Free plan; previews use it too | Pro plan, plus a separate staging project for previews |
| Vercel | Hobby is fine for testing on your own | Pro (Hobby's terms are non-commercial only) |
| Service accounts | Signed up with your personal Gmail | Invite a business address and make it an owner |

Use the `vercel.app` URL everywhere this guide says `https://your-domain`:
Supabase's Site URL and redirect URL (`https://<project>.vercel.app/**`), and
Vercel's `NEXT_PUBLIC_SITE_URL`. Skip *Settings → Domains* in step 3. HTTPS works
the same.

**Gmail as the email sender** (Supabase *Authentication → Emails → SMTP*):

1. In your Google Account, turn on **2-Step Verification**, then create an **App
   password** (*Security → App passwords*, name it "Supabase"). Google shows a
   16-character password once. Never use your normal Gmail password here.
2. In Supabase, enable custom SMTP with:

   | Field | Value |
   |---|---|
   | Host | `smtp.gmail.com` |
   | Port | `587` |
   | Username | your full Gmail address |
   | Password | the 16-character app password (no spaces) |
   | Sender email | the same Gmail address (Gmail rewrites any other sender) |
   | Sender name | `Pattrnx` |

3. Under *Authentication → Rate Limits*, the email limit can stay low (e.g. 30/hour).
   Gmail allows about 500 emails a day, which is plenty for testing.

Things to know: every tester sees your personal address as the sender and can reply
to it, and some emails may land in spam. If the app password leaks, revoke it in
your Google Account; your Gmail password is unaffected.

With a single Supabase project, the migration workflow (step 2) needs only the
`production` GitHub environment; skip `staging`.

## 1. Supabase projects

Do this twice: `pattrnx-staging` first, then `pattrnx-production`.

1. **New project** → region **West EU (London)**. Generate a strong database
   password and store it in your password manager (it's needed in step 2).
2. Note the **project ref** (the `xxxx` in `https://xxxx.supabase.co`) and, under
   *Project Settings → API keys*, the **publishable/anon key** and the
   **secret/service-role key**. Either key style works with the app.
3. **Authentication → Sign In / Providers → Email:** email provider on, *Confirm
   email* on, *Secure password change* on, minimum password length **10**. On a
   paid plan, turn on *Leaked password protection*.
4. **Authentication → Sessions** (paid plan): inactivity timeout **30 days**, time-box
   **90 days**. Refresh-token rotation is on by default; leave it on.
5. **Authentication → Emails → Templates:** paste each file from
   `supabase/templates/` into its template, with these subjects:

   | Template | File | Subject |
   |---|---|---|
   | Confirm signup | `confirmation.html` | Confirm your Pattrnx account |
   | Magic link | `magic_link.html` | Your Pattrnx sign-in link |
   | Reset password | `recovery.html` | Reset your Pattrnx password |

   The links must stay in the `{{ .SiteURL }}/auth/confirm?token_hash=…` form.
6. **Authentication → Emails → SMTP:** while testing, use Gmail (see *Testing setup*).
   For the beta, enter your email provider's SMTP details and a
   sender like `Pattrnx <hello@your-domain>`. Without this, Supabase's shared sender
   is heavily rate-limited and not meant for real users. Verify the sending domain
   (SPF/DKIM) in the provider first.
7. **Authentication → URL Configuration:**
   - Production: Site URL `https://your-domain`. Redirect URLs `https://your-domain/**`.
   - Staging: Site URL = the URL you'll test email flows on (a staging domain, or
     your Vercel preview domain). Redirect URLs `https://*-<vercel-team>.vercel.app/**`.
     Emails sent from staging always link to the Site URL. On other previews, sign
     in with a password.
8. **Organization → Security:** require MFA for everyone with dashboard access.

## 2. Apply the database schema

Migrations go through the manual **Deploy database migrations** GitHub workflow
(`.github/workflows/deploy-db.yml`). It never loads the demo seed.

1. Create a Supabase **access token** (*Account → Access Tokens*).
2. In GitHub, go to *Settings → Environments* and create `staging` and `production`.
   On `production`, add yourself as a **required reviewer**. Add these secrets to
   each environment:

   | Secret | Value |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | The token from step 1 |
   | `SUPABASE_PROJECT_REF` | That environment's project ref |
   | `SUPABASE_DB_PASSWORD` | That environment's database password |

3. Open *Actions → Deploy database migrations → Run workflow*. Pick `staging` and leave
   *dry run* ticked: the log lists the migrations it would apply. Run it again with
   *dry run* unticked. Then do the same for `production` (it waits for your approval).
4. Check: in the Supabase *Table Editor*, every table shows **RLS enabled**.

## 3. Vercel project

1. **Add New → Project →** import `clepbo/Pattrnx`. Vercel detects Next.js and pnpm.
   Keep the defaults (build `pnpm build`, Node 22+).
2. **Environment variables** (*Settings → Environment Variables*). Scope each one:

   | Variable | Production | Preview | Notes |
   |---|---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | production project URL | staging project URL | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production publishable/anon key | staging key | Public by design; RLS protects data |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | staging Site URL | |
   | `SUPABASE_SERVICE_ROLE_KEY` | production secret key | staging secret key | Mark **Sensitive**. Used only for account deletion |
   | `SENTRY_DSN` | from step 4 | leave empty | Empty means Sentry is off |
   | `FEATURE_AI` | `false` | `false` | |

   `CRON_SECRET` isn't needed yet (no cron job is scheduled).
3. **Settings → Functions:** confirm the region shows **London (lhr1)**. It comes
   from `vercel.json`; if it shows Washington (`iad1`), set it here.
4. **Settings → Deployment Protection:** keep *Vercel Authentication* on for preview
   deployments, so only your team can open them.
5. **Settings → Domains:** add your domain and point DNS as instructed. HTTPS is
   automatic. The app already sends HSTS and the other security headers.
6. **Settings → Git:** production branch `main`. Every pull request gets a preview on
   the staging database.

## 4. Sentry (error tracking)

1. Create an organization, choosing **EU** data storage, then a **Next.js** project.
2. Copy the **DSN** into Vercel's `SENTRY_DSN` (Production only), then redeploy.
3. *Project Settings → Security & Privacy:* turn on *Data scrubber*, *Use default
   scrubbers* and *Prevent storing of IP addresses*.

What the app sends (`src/instrumentation.ts`, `src/server/observability/scrub.ts`):
server errors only, with the exception, stack, request method and path (never the
query string), release and environment. It never sends cookies, headers, request
bodies, local variables, IP addresses, emails or anything a user typed. No
tracing, session replay or browser SDK.

## 5. First-deploy smoke test

On the production domain:

- [ ] `https://your-domain/api/health` returns `{"status":"ok"}`.
- [ ] Sign up with a real address you can read. The email arrives from the configured sender, and the link opens
      `https://your-domain/auth/confirm…` and lands on onboarding.
- [ ] Magic link and password reset emails arrive and work.
- [ ] Create a goal and a routine, and log an activity; Today shows it.
- [ ] Settings → Data: the export downloads.
- [ ] Settings → Data: delete the test account. It disappears from *Supabase →
      Authentication → Users*.
- [ ] Browser dev tools → Network → any page: the response has
      `content-security-policy` with a nonce, and `strict-transport-security`.
- [ ] Sentry: when the first error arrives, check it shows the commit as its
      release, and has no query string, cookies or user details.
- [ ] Update the **NOT VERIFIED** list in `Docs/SECURITY_REVIEW.md`.

## Shipping changes after launch

1. Open a pull request. CI runs; Vercel builds a preview on the staging database.
2. **If it adds a migration:** run the workflow against `staging`, test the preview,
   then run it against `production` **before merging**. Migrations must work with
   the currently deployed code (expand → migrate → contract, ARCHITECTURE §15).
3. Merge to `main`. Vercel deploys production.
4. Rolling back: Vercel → *Deployments* → promote the previous deployment. Schema
   changes are forward-only; fix them with a new migration.

Backups: Supabase Pro takes daily backups. Turn on point-in-time recovery before
the public launch.
