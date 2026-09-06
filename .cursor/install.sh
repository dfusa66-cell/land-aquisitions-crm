#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the Land Acquisition CRM.
# Prepares local env vars, installs dependencies, and seeds a local
# SQLite database with demo data so the app is usable end-to-end.
set -euo pipefail

cd "$(dirname "$0")/.."

# Local dev env vars (SQLite). Never overwrite an existing .env.
if [ ! -f .env ]; then
  cp .env.local.sqlite.example .env
fi

# Install exact locked dependencies.
pnpm install --frozen-lockfile

# Generate the Prisma client and sync the SQLite schema.
pnpm exec prisma generate
pnpm exec prisma db push --skip-generate

# Seed demo data. Seed logic upserts users/settings and dedupes leads
# by phone, so re-running is safe.
pnpm db:seed:demo
