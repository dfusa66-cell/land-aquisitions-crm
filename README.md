# Land Acquisition CRM

Private V1 CRM for importing SmarterContact lead conversations through Zapier, reconstructing SMS threads, analyzing seller intent, and prioritizing land acquisition follow-up.

## What Was Built

- Private login for a single user, structured so users can expand later.
- Dashboard with acquisition pipeline metrics and recent leads.
- Leads table with status filters, search, AI score sorting, AI description, last message, and next action.
- Lead detail workspace with editable seller, property, pricing, and guardrail fields.
- Chronological SMS conversation reconstruction using message direction by index.
- AI Deal Brain with lead classification, score, motivation, sentiment, summary, next action, warning flag, and suggested reply.
- Shadow Mode for AI suggested reply, Diego's actual reply, and feedback: correct, almost, wrong.
- Protected Zapier import endpoint at `POST /api/leads/import`.
- Prisma schema for `User`, `Lead`, `Message`, `AIAnalysis`, `FollowUp`, `SuggestedReply`, and `NegotiationSettings`.
- Optional demo seed data for local UI testing only.

## Project Structure

```text
app/
  api/leads/import/route.ts   Zapier import API
  leads/page.tsx              Leads table
  leads/[id]/page.tsx         Lead workspace
  login/page.tsx              Private login
  settings/page.tsx           Negotiation settings
components/
  nav.tsx                     App shell and navigation
  status-badge.tsx            Lead status badges
lib/
  ai.ts                       OpenAI analysis and local fallback
  auth.ts                     Cookie session helpers
  import-lead.ts              Import, dedupe, message reconstruction, analysis
  lead-utils.ts               Normalization helpers
  prisma.ts                   Prisma client
prisma/
  schema.prisma               Data model
  seed.ts                     Optional demo data seed
```

## Environment Variables

For local SQLite development, copy `.env.local.sqlite.example` to `.env`.

```text
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
SESSION_SECRET="replace-with-a-long-random-secret"
CRM_IMPORT_API_KEY="replace-with-a-zapier-webhook-secret"
OPENAI_API_KEY=""
```

For Vercel, use `.env.example` as the deploy-time variable checklist. Do not copy hosted production secrets into source files.

`OPENAI_API_KEY` is only used server-side. If it is blank, the app uses a local keyword fallback so import flows still work.

## Local Commands

```powershell
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

## Database Setup

Local development uses SQLite through Prisma:

```powershell
pnpm prisma generate
pnpm db:push
```

Only run demo seeding intentionally:

```powershell
pnpm db:seed:demo
```

Local development uses `prisma/schema.prisma`, which remains SQLite so the local app is not removed.

Vercel development deployment uses `prisma/schema.postgres.prisma`, which is PostgreSQL. Before deploying, create a hosted PostgreSQL database and set `DATABASE_URL` to that hosted connection string.

To push the schema to the hosted PostgreSQL database:

```powershell
pnpm db:push:postgres
```

Run that only when `DATABASE_URL` points to the hosted PostgreSQL database.

## Vercel Development Deployment

This app is prepared for Vercel with `vercel.json`.

Vercel build command:

```text
pnpm build:vercel
```

Vercel environment variables:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
APP_URL="https://your-vercel-app.vercel.app"
SESSION_SECRET="long-random-secret"
CRM_IMPORT_API_KEY="long-random-zapier-secret"
OPENAI_API_KEY=""
```

`CRM_IMPORT_API_KEY` belongs only in Vercel environment variables and Zapier's webhook header. Never commit the deployed key to source and never expose it in frontend code.

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

The three message-history fields can be arrays or comma-separated values. The CRM reconstructs the conversation by matching each message by array index. `sent` is Diego/the business and `received` is the seller.

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

- V1 does not send SMS.
- V1 does not connect directly to SmarterContact for outbound messaging.
- V1 does not negotiate autonomously.
- Offer guardrail fields exist, but enforcement is limited to AI suggested-reply warning detection.
- Authentication is intentionally simple for a private single-user MVP.

## Recommended Next Step

Connect a real OpenAI API key, import a small batch of actual SmarterContact/Zapier exports, and tune the negotiation settings using real seller reply patterns before adding one-click messaging.
