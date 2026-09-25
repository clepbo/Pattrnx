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
| Supabase | Just `pattrnx-production` on the Free plan; previews use it too | Pro plan (a separate staging project for previews is optional) |
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

The migration workflow (step 2) only targets `production`.

## 1. Supabase projects

One project, `pattrnx-production`, used by both the live site and pull-request
previews.

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
   - Site URL `https://your-domain` (while testing: your `vercel.app` URL).
   - Redirect URLs: `https://your-domain/**`, plus
     `https://*-<vercel-team>.vercel.app/**` so previews work too.
   - Emails always link to the Site URL. On a preview, sign in with a password.
8. **Organization → Security:** require MFA for everyone with dashboard access.

## 2. Apply the database schema

Migrations go through the manual **Deploy database migrations** GitHub workflow
(`.github/workflows/deploy-db.yml`). It targets the `production` project only and
never loads the demo seed.

### Where each secret comes from

| Secret | Where to get it | Looks like |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | A **personal access token**, not a project API key. Supabase dashboard → your avatar (top right) → **Account preferences** → **Access Tokens** (direct link: `https://supabase.com/dashboard/account/tokens`) → **Generate new token**, name it "GitHub migrations", copy it (shown once). | Starts with `sbp_` |
| `SUPABASE_PROJECT_REF` | Open your project → **Project Settings** → **General** → **Project ID**. It's also the part before `.supabase.co` in the project URL, and after `/project/` in the dashboard address bar. | ~20 lowercase letters, e.g. `abcdefghijklmnopqrst` |
| `SUPABASE_DB_PASSWORD` | The database password you chose when creating the project. If you've lost it: **Project Settings** → **Database** → **Reset database password**. | Whatever you set |

Common mistakes: using the `anon`, `publishable`, `service_role` or `secret` key as
the access token; pasting the full project URL instead of the ID; or copying a
trailing space or line break. The workflow's first step checks for these and says
which value is wrong.

### Steps

1. In GitHub: repo **Settings** → **Environments** → **New environment** → name it
   exactly `production`. Optionally add yourself as a **required reviewer**, so each
   run waits for your approval.
2. In that environment, under **Environment secrets** → **Add environment secret**,
   add the three secrets above. Use the names exactly as written. Put them in the
   environment, not in *Secrets and variables → Actions*.
3. **Actions** → **Deploy database migrations** → **Run workflow** (branch `main`),
   with *dry run* ticked. The log lists the migrations it would apply.
4. Run it again with *dry run* **unticked**. This is the run that changes the database.
   A dry run always finishes green and applies nothing; its summary says so. To
   check, run a dry run again afterwards: it should list no migrations.
5. Check: in Supabase's **Table Editor**, the tables exist and each shows **RLS
   enabled**.

GitHub never shows secret values again after saving, masks them in the logs (which
are public on a public repo), and doesn't give them to pull requests from forks.
Only people with write access can run the workflow. If you add collaborators later,
also limit the `production` environment to the `main` branch and protect `main`.

## 3. Vercel project

1. **Add New → Project →** import `clepbo/Pattrnx`. Vercel detects Next.js and pnpm.
   Keep the defaults (build `pnpm build`, Node 22+).
2. **Environment variables** (*Settings → Environment Variables*). Scope each one:

   Apply each to **Production and Preview** (same values). The three `NEXT_PUBLIC_`
   variables are meant to reach the browser: add them as a plain **Config**
   variable, not *Sensitive*/*Secret* (Vercel shows "Remove the public framework
   prefix…" if you mark them sensitive). The service-role key is the opposite: mark it
   **Sensitive**, and never give it a `NEXT_PUBLIC_` prefix.

   | Variable | Value | Where to find it |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase → Project Settings → Data API (or API) → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` or `publishable` key | Supabase → Project Settings → API Keys. Public by design; RLS protects data |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (while testing: your `vercel.app` URL) | Vercel → Settings → Domains |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` or `secret` key | Supabase → Project Settings → API Keys. Mark **Sensitive**. Used only for account deletion |
   | `SENTRY_DSN` | from step 4 (Production only) | Empty means Sentry is off |
   | `FEATURE_AI` | `false` | |

   `CRON_SECRET` isn't needed yet (no cron job is scheduled).
3. **Settings → Functions:** confirm the region shows **London (lhr1)**. It comes
   from `vercel.json`; if it shows Washington (`iad1`), set it here.
4. **Settings → Deployment Protection:** keep *Vercel Authentication* on for preview
   deployments, so only your team can open them.
5. **Settings → Domains:** add your domain and point DNS as instructed. HTTPS is
   automatic. The app already sends HSTS and the other security headers.
6. **Settings → Git:** production branch `main`. Every pull request gets a preview,
   using the same database. Previews can change real data, so keep Deployment
   Protection on.

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

1. Open a pull request. CI runs; Vercel builds a preview (same database).
2. **If it adds a migration:** run the workflow (dry run, then for real) **before
   merging**. Migrations must work with
   the currently deployed code (expand → migrate → contract, ARCHITECTURE §15).
3. Merge to `main`. Vercel deploys production.
4. Rolling back: Vercel → *Deployments* → promote the previous deployment. Schema
   changes are forward-only; fix them with a new migration.

Later, before real users: a separate staging Supabase project for previews keeps
test changes away from real data. It needs a `staging` option added back to the
workflow and separate Preview env vars in Vercel.

Backups: Supabase Pro takes daily backups. Turn on point-in-time recovery before
the public launch.
