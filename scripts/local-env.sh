#!/usr/bin/env bash
# Prints app env vars for the running local Supabase stack.
# Usage: pnpm env:local            (writes .env.local)
#        scripts/local-env.sh >> "$GITHUB_ENV"   (CI)
set -euo pipefail

pnpm exec supabase status -o env 2>/dev/null | sed -n -E \
  -e 's/^API_URL="?([^"]*)"?$/NEXT_PUBLIC_SUPABASE_URL=\1/p' \
  -e 's/^ANON_KEY="?([^"]*)"?$/NEXT_PUBLIC_SUPABASE_ANON_KEY=\1/p' \
  -e 's/^SERVICE_ROLE_KEY="?([^"]*)"?$/SUPABASE_SERVICE_ROLE_KEY=\1/p' \
  -e 's/^MAILPIT_URL="?([^"]*)"?$/MAILPIT_URL=\1/p'
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
