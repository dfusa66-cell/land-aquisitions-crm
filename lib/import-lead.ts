import { prisma } from "@/lib/prisma";
import { analyzeLead, toLeadStatus } from "@/lib/ai";
import { normalizeDirection, normalizePhone, parseDate, parseMoney, splitZapierField } from "@/lib/lead-utils";
import { nextPipelineStageOnImport } from "@/lib/pipeline";

type ImportPayload = Record<string, unknown>;

function read(payload: ImportPayload, key: string) {
  return payload[key] ?? payload[key.replaceAll(" ", "_")] ?? payload[key.replaceAll(" ", "")];
}

export async function importLead(payload: ImportPayload) {
  const phone = normalizePhone(String(read(payload, "Phone Number") ?? ""));
  const apn = String(read(payload, "APN") ?? "").trim() || null;
  if (!phone && !apn) throw new Error("Phone Number or APN is required.");

  const contents = splitZapierField(read(payload, "Message History Content"));
  const directions = splitZapierField(read(payload, "Message History Direction"));
  const dates = splitZapierField(read(payload, "Message History Date"));
  if (contents.length !== directions.length) throw new Error("Message content and direction counts must match.");

  const lead = await prisma.lead.upsert({
    where: phone ? { phone } : { apn: apn ?? "" },
    create: {
      firstName: String(read(payload, "First Name") ?? "").trim() || null,
      lastName: String(read(payload, "Last Name") ?? "").trim() || null,
      phone,
      acres: parseMoney(read(payload, "Parcel Acres")),
      county: String(read(payload, "Parcel County") ?? "").trim() || null,
      state: String(read(payload, "Parcel State") ?? "").trim() || null,
      apn
    },
    update: {
      firstName: String(read(payload, "First Name") ?? "").trim() || undefined,
      lastName: String(read(payload, "Last Name") ?? "").trim() || undefined,
      acres: parseMoney(read(payload, "Parcel Acres")) ?? undefined,
      county: String(read(payload, "Parcel County") ?? "").trim() || undefined,
      state: String(read(payload, "Parcel State") ?? "").trim() || undefined,
      apn: apn ?? undefined
    }
  });

  for (let index = 0; index < contents.length; index += 1) {
    const content = contents[index];
    if (!content) continue;
    const timestamp = parseDate(dates[index]) ?? new Date(0);
    await prisma.message.upsert({
      where: {
        leadId_content_direction_timestamp: {
          leadId: lead.id,
          content,
          direction: normalizeDirection(directions[index] ?? ""),
          timestamp
        }
      },
      update: {},
      create: {
        leadId: lead.id,
        content,
        direction: normalizeDirection(directions[index] ?? ""),
        timestamp,
        source: "SmarterContact"
      }
    });
  }

  const settings = await prisma.negotiationSettings.findUnique({ where: { id: "default" } });
  const messages = await prisma.message.findMany({ where: { leadId: lead.id }, orderBy: [{ timestamp: "asc" }, { createdAt: "asc" }] });
  const analysis = await analyzeLead(messages, settings ? Object.values(settings).join("\n") : "");
  const status = toLeadStatus(analysis.classification);
  const pipelineStage = nextPipelineStageOnImport({
    status,
    askingPrice: analysis.asking_price,
    existingStage: lead.pipelineStage
  });

  await prisma.aIAnalysis.create({
    data: {
      leadId: lead.id,
      classification: status,
      leadScore: analysis.lead_score,
      sellerInterest: analysis.seller_interest,
      motivation: analysis.motivation,
      sentiment: analysis.sentiment,
      askingPrice: analysis.asking_price,
      negotiationStage: analysis.negotiation_stage,
      summary: analysis.summary,
      nextAction: analysis.next_action,
      suggestedReply: analysis.suggested_reply,
      followUpDate: analysis.follow_up_date ? new Date(analysis.follow_up_date) : null,
      requiresHumanAttention: analysis.requires_human_attention,
      reasoningSummary: analysis.reasoning_summary,
      rawJson: JSON.stringify(analysis)
    }
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status,
      leadScore: analysis.lead_score,
      askingPrice: analysis.asking_price,
      sellerInterest: analysis.seller_interest,
      motivation: analysis.motivation,
      sentiment: analysis.sentiment,
      negotiationStage: analysis.negotiation_stage,
      aiSummary: analysis.summary,
      nextAction: analysis.next_action,
      followUpDate: analysis.follow_up_date ? new Date(analysis.follow_up_date) : null,
      pipelineStage
    }
  });

  if (analysis.suggested_reply) {
    await prisma.suggestedReply.create({ data: { leadId: lead.id, aiSuggestedReply: analysis.suggested_reply } });
  }
  if (status === "FOLLOW_UP" && analysis.follow_up_date) {
    await prisma.followUp.create({ data: { leadId: lead.id, dueAt: new Date(analysis.follow_up_date), note: analysis.next_action } });
  }

  return prisma.lead.findUnique({ where: { id: lead.id }, include: { messages: true, analyses: { orderBy: { createdAt: "desc" }, take: 1 } } });
}
