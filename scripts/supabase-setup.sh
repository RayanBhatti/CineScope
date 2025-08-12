#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ Supabase CLI not found. Install it: https://supabase.com/docs/guides/local-development/cli/getting-started"; exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql not found. Install PostgreSQL client."; exit 1
fi

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF}"
: "${DATABASE_URL:?Set DATABASE_URL}"

echo "🔗 Linking local repo to Supabase project ${SUPABASE_PROJECT_REF}..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "⏫ Pushing migrations..."
supabase db push

echo "🌱 Seeding data..."
psql "$DATABASE_URL" -f cinescope/supabase/seed.sql

echo "✅ Done!"
