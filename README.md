# Sell Your Land to Diego

Private CRM for vacant-land flipping. Import SmarterContact conversations through Zapier, underwrite parcels, and move deals through a land-specific pipeline.

Live: https://land-ai-crm-real.vercel.app/

## What this app does

- Private login for a single user (`diego@example.com` / `demo1234` locally).
- Dashboard with a green **Profit total** card (all-time business net profit from `BusinessMetrics` — label + number only, no `note` / affiliate breakdown), **Pipeline Profit** (under contract / bought — `pipelineProjected` or UC inventory exit), **Profit in the works** (in-work mid ARV speculation), and **closed profit this month**.
- **Agente pipeline** (`/agent`) — Spanish-friendly chat that answers from live Prisma leads (stage counts, HOT deals, ofertas enviadas, ready to close, closed profit). Optional OpenAI polish; rule-based + retrieval if `OPENAI_API_KEY` is blank.
- Kanban pipeline: Lead SC → Precio/Ask → Underwritten → Oferta enviada → Negociación → Ready to close → Cerrado / Dead.
- Deal workspace with contact, parcel, Land Portal, ARV, computed 40%/50% offers, and estimated profit.
- Chronological SMS reconstruction plus AI Deal Brain (OpenAI or local keyword fallback).
- Protected Zapier import at `POST /api/leads/import`.
- Stub fields for a later agent to push underwriting packs onto a deal.

## Land pipeline & underwriting

Each deal keeps the original AI temperature (`HOT`, `WARM`, …) and a separate `pipelineStage`.

Estimated profit:

```text
mid ARV
− purchase (or 50% of mid ARV if purchase is blank)
− drone ($150–$250, default $200)
− brokerless ($150)
− 3% buyer’s agent (of ARV)
− $1,000 buy closing
− $1,000 sell closing
```

Offers are always 40% and 50% of mid ARV. Optional `actualProfit` overrides the estimate on closed deals.

## Project Structure

```text
app/
  api/leads/import/route.ts   Zapier import API
  api/agent/route.ts          Authenticated pipeline-agent Q&A
  agent/page.tsx              Agente pipeline chat
  leads/page.tsx              Pipeline / cards / list
  leads/[id]/page.tsx         Deal workspace
  login/page.tsx              Private login
  settings/page.tsx           Business P&L + negotiation settings
components/
  nav.tsx                     App shell
  leads/pipeline-board.tsx    Kanban columns
lib/
  pipeline.ts                 Land stages
  underwriting.ts             Offer + profit math
  business-metrics.ts         All-time P&L defaults, load/save, projected pipeline profit
  ai.ts                       OpenAI analysis and local fallback
  pipeline-agent.ts           Grounded pipeline Q&A (rules + optional OpenAI)
  auth.ts                     Cookie session helpers
  import-lead.ts              Import, dedupe, analysis
prisma/
  schema.prisma               Local SQLite model
  schema.postgres.prisma      Vercel / Supabase model
```

## Environment Variables

Copy one of the example files. These are the only runtime variables the app reads.

| Variable | Required | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma. SQLite file locally, Postgres on Vercel/Supabase. |
| `APP_URL` | Recommended | Canonical site URL. |
| `SESSION_SECRET` | Yes in production | Reserved for hardening the cookie session. |
| `CRM_IMPORT_API_KEY` | Yes for Zapier | `X-CRM-API-KEY` on `POST /api/leads/import`. |
| `OPENAI_API_KEY` | Optional | Server-side lead analysis **and** Agente pipeline phrasing. Blank = keyword / rule-based fallback. Both features still use real CRM data. |

Local SQLite:

```text
cp .env.local.sqlite.example .env
```

```text
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
SESSION_SECRET="replace-with-a-long-random-secret"
CRM_IMPORT_API_KEY="replace-with-a-zapier-webhook-secret"
OPENAI_API_KEY=""
```

Vercel / Supabase: use `.env.example` as the deploy checklist. Set the same names in the Vercel project. Do not commit hosted secrets.

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
APP_URL="https://your-vercel-app.vercel.app"
SESSION_SECRET="long-random-secret"
CRM_IMPORT_API_KEY="long-random-zapier-secret"
OPENAI_API_KEY=""
```

`CRM_IMPORT_API_KEY` belongs only in Vercel and Zapier. `OPENAI_API_KEY` is server-side only.

After pulling schema changes, push columns to the hosted database. This is required after the vacant-land pipeline merge (`pipelineStage`, ARV, Land Portal, profit fields). Production already has `BusinessMetrics` (`netProfitAllTime`, `landProfitClosed`, `coachingIncome`, `affiliateIncome`, `marketingSpend`, `pipelineProjected`, `note`). Prisma mirrors those names — do not drop or recreate the table. If the table is missing locally, the Profit total card falls back to Diego's Aug 2025–Sep 2026 defaults.

```text
# Use the same DATABASE_URL as the Vercel production project (Supabase/Postgres).
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
pnpm db:push:postgres
```

That command is `prisma db push --schema=prisma/schema.postgres.prisma`. It is additive (new nullable/defaulted Lead columns + `pipelineStage` index + `BusinessMetrics`). It does not drop existing leads.

If sign-in shows a database error instead of the dashboard, the usual causes are:

1. Hosted schema is behind — run `pnpm db:push:postgres` with production `DATABASE_URL`.
2. Missing/invalid `DATABASE_URL` in the Vercel project.
3. Vercel build not using `pnpm build:vercel` (must generate the Postgres Prisma client, not SQLite).

## Local Commands

```text
pnpm install
pnpm prisma generate
pnpm db:push
pnpm dev
```

Then open `http://localhost:3000`.

Demo login:

```text
diego@example.com
demo1234
```

Optional demo parcels (includes underwriting + one closed deal):

```text
pnpm db:seed:demo
```

## Database Setup

Local development uses `prisma/schema.prisma` (SQLite) so the app runs without a hosted database.

Vercel uses `prisma/schema.postgres.prisma`. Create a Supabase/Postgres database, set `DATABASE_URL`, then push the schema **before or immediately after** deploying code that adds Lead columns:

```text
# Must be the production connection string from Vercel → Settings → Environment Variables
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
pnpm install
pnpm db:push:postgres
```

`db:push:postgres` is the only required migrate step for this repo (there is no `prisma/migrations` folder). Run it from any machine that can reach the hosted database. Do not run it against the local SQLite file.

If `/login` sign-in fails with a database message, or the dashboard shows a schema-behind banner, this command is the fix.

## Vercel Development Deployment

`vercel.json` sets the build command to:

```text
pnpm build:vercel
```

Auth, Zapier import, and the existing deploy path are unchanged. New land fields are additive Prisma columns.

## Zapier Webhook Configuration

Create a Zapier webhook action:

- Method: `POST`
- URL: `https://your-domain.com/api/leads/import`
- Header: `X-CRM-API-KEY: your CRM_IMPORT_API_KEY`
- Body type: JSON

Map these SmarterContact fields:

```text
First Name
Last Name
Phone Number
Parcel Acres
Parcel County
Parcel State
APN
Message History Content
Message History Direction
Message History Date
```

The three message-history fields can be arrays or comma-separated values. `sent` is Diego/the business and `received` is the seller. New imports land in **Lead SC**, move to **Precio/Ask** when a price appears, and **Dead** for DNC / wrong number. Re-imports do not rewind a deal that is already further along.

## Test Import

```powershell
$body = @{
  "First Name"="Test"
  "Last Name"="Seller"
  "Phone Number"="303-555-0190"
  "Parcel Acres"="12"
  "Parcel County"="Park"
  "Parcel State"="CO"
  "APN"="TEST-123"
  "Message History Content"=@("Hi, would you sell your 12 acres?","Maybe, depends what you can pay.")
  "Message History Direction"=@("sent","received")
  "Message History Date"=@("2026-08-27T12:00:00Z","2026-08-27T12:05:00Z")
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/leads/import" `
  -Headers @{ "X-CRM-API-KEY"="local-zapier-secret"; "Content-Type"="application/json" } `
  -Body $body
```

## Remaining Limitations

- V1 does not send SMS or talk to SmarterContact outbound.
- V1 does not negotiate autonomously.
- Underwriting-pack push from an agent is a stub (URL + notes on the deal).
- Authentication is a private single-user cookie session.

## Recommended Next Step

Connect a real OpenAI key, import a small SmarterContact batch, and have an agent push Land Portal / ARV packs into the deal stub.
