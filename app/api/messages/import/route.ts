import { NextResponse } from "next/server";
import { importSmarterContactMessages } from "@/lib/import-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SmarterContact thread sync for the Grok / browser agent.
 *
 * POST /api/messages/import
 * Header: X-CRM-API-KEY: $CRM_IMPORT_API_KEY
 * Body: JSON array of { phone, content, direction, timestamp, source?, apn? }
 *
 * Upserts Message rows by (leadId, content, direction, timestamp).
 * Matches leads by normalized phone or APN. Creates a Lead SC stub if unknown.
 * Does not send SMS and does not auto-run AI — open the deal and Refresh analysis.
 */
export async function POST(request: Request) {
  const expected = process.env.CRM_IMPORT_API_KEY;
  if (!expected || request.headers.get("X-CRM-API-KEY") !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = await request.json();
    const result = await importSmarterContactMessages(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
  }
}
