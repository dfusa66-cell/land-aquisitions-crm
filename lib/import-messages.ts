import { prisma } from "@/lib/prisma";
import { isMissingColumnError } from "@/lib/db-errors";
import { normalizeDirection, normalizePhone, parseDate } from "@/lib/lead-utils";

export type SyncMessageInput = {
  phone?: string | null;
  apn?: string | null;
  content?: string | null;
  direction?: string | null;
  timestamp?: string | Date | null;
  source?: string | null;
};

export type NormalizedSyncMessage = {
  phone: string | null;
  apn: string | null;
  content: string;
  direction: "SENT" | "RECEIVED";
  timestamp: Date;
  source: string;
};

export type SyncParseError = { index: number; error: string };

export type MessageSyncResult = {
  imported: number;
  skipped: number;
  createdLeads: number;
  leads: { id: string; phone: string | null; apn: string | null; upserted: number }[];
  errors: SyncParseError[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readField(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
    const spaced = key.replaceAll("_", " ");
    if (row[spaced] != null && row[spaced] !== "") return row[spaced];
  }
  return undefined;
}

export function extractMessageSyncRows(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const record = asRecord(body);
  if (!record) return [];
  if (Array.isArray(record.messages)) return record.messages;
  if (record.phone != null || record.apn != null || record.content != null) return [record];
  return [];
}

export function normalizeSyncMessage(raw: unknown, index: number): NormalizedSyncMessage | SyncParseError {
  const row = asRecord(raw);
  if (!row) return { index, error: "Each item must be a JSON object." };

  const content = String(readField(row, "content", "message", "body", "text") ?? "").trim();
  if (!content) return { index, error: "content is required." };

  const phone = normalizePhone(String(readField(row, "phone", "Phone Number", "phoneNumber") ?? ""));
  const apn = String(readField(row, "apn", "APN") ?? "").trim() || null;
  if (!phone && !apn) return { index, error: "phone or apn is required." };

  const timestampValue = readField(row, "timestamp", "date", "sentAt", "createdAt");
  const timestamp =
    timestampValue instanceof Date
      ? timestampValue
      : parseDate(timestampValue == null ? undefined : String(timestampValue)) ?? new Date(0);

  return {
    phone,
    apn,
    content,
    direction: normalizeDirection(String(readField(row, "direction") ?? "sent")),
    timestamp,
    source: String(readField(row, "source") ?? "SmarterContact").trim() || "SmarterContact"
  };
}

export function parseMessageSyncBody(body: unknown): { items: NormalizedSyncMessage[]; errors: SyncParseError[] } {
  const rows = extractMessageSyncRows(body);
  const items: NormalizedSyncMessage[] = [];
  const errors: SyncParseError[] = [];
  rows.forEach((row, index) => {
    const parsed = normalizeSyncMessage(row, index);
    if ("error" in parsed) {
      errors.push(parsed);
      return;
    }
    items.push(parsed);
  });
  return { items, errors };
}

export function leadMatchKey(item: Pick<NormalizedSyncMessage, "phone" | "apn">) {
  return item.phone ? `phone:${item.phone}` : `apn:${item.apn}`;
}

async function findOrCreateLead(phone: string | null, apn: string | null) {
  const data = { phone, apn };
  try {
    const existing = phone
      ? await prisma.lead.findUnique({ where: { phone } })
      : await prisma.lead.findUnique({ where: { apn: apn ?? "" } });
    if (existing) {
      const nextApn = apn && !existing.apn ? apn : undefined;
      const nextPhone = phone && !existing.phone ? phone : undefined;
      if (nextApn || nextPhone) {
        return prisma.lead.update({ where: { id: existing.id }, data: { apn: nextApn ?? existing.apn, phone: nextPhone ?? existing.phone } });
      }
      return existing;
    }
    return await prisma.lead.create({ data });
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    const existing = phone
      ? await prisma.lead.findUnique({ where: { phone }, select: { id: true, phone: true, apn: true } })
      : await prisma.lead.findUnique({ where: { apn: apn ?? "" }, select: { id: true, phone: true, apn: true } });
    if (existing) return existing;
    return prisma.lead.create({ data, select: { id: true, phone: true, apn: true } });
  }
}

export async function upsertLeadMessage(leadId: string, item: Pick<NormalizedSyncMessage, "content" | "direction" | "timestamp" | "source">) {
  await prisma.message.upsert({
    where: {
      leadId_content_direction_timestamp: {
        leadId,
        content: item.content,
        direction: item.direction,
        timestamp: item.timestamp
      }
    },
    update: { source: item.source },
    create: {
      leadId,
      content: item.content,
      direction: item.direction,
      timestamp: item.timestamp,
      source: item.source
    }
  });
}

/**
 * Agent / Grok sync path: upsert SMS rows onto leads matched by phone or APN.
 * Does not send SMS and does not re-run AI (Diego can Refresh analysis on the deal).
 */
export async function importSmarterContactMessages(body: unknown): Promise<MessageSyncResult> {
  const { items, errors } = parseMessageSyncBody(body);
  const grouped = new Map<string, NormalizedSyncMessage[]>();
  for (const item of items) {
    const key = leadMatchKey(item);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const leads: MessageSyncResult["leads"] = [];
  let createdLeads = 0;
  let imported = 0;

  for (const group of grouped.values()) {
    const phone = group.find((item) => item.phone)?.phone ?? null;
    const apn = group.find((item) => item.apn)?.apn ?? null;
    const before = phone
      ? await prisma.lead.findUnique({ where: { phone }, select: { id: true } }).catch(() => null)
      : apn
        ? await prisma.lead.findUnique({ where: { apn }, select: { id: true } }).catch(() => null)
        : null;
    const lead = await findOrCreateLead(phone, apn);
    if (!before) createdLeads += 1;
    for (const item of group) {
      await upsertLeadMessage(lead.id, item);
      imported += 1;
    }
    leads.push({ id: lead.id, phone: lead.phone ?? phone, apn: lead.apn ?? apn, upserted: group.length });
  }

  return { imported, skipped: errors.length, createdLeads, leads, errors };
}
