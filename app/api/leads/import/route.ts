import { NextResponse } from "next/server";
import { importLead } from "@/lib/import-lead";

export async function POST(request: Request) {
  const expected = process.env.CRM_IMPORT_API_KEY;
  if (!expected || request.headers.get("X-CRM-API-KEY") !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = await request.json();
    const lead = await importLead(payload);
    return NextResponse.json({ ok: true, leadId: lead?.id, status: lead?.status, leadScore: lead?.leadScore });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
  }
}
