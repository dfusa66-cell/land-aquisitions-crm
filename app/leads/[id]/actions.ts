"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeLead } from "@/lib/ai";
import { negotiationRulesFromSettings, rescoreLeadFromMessages } from "@/lib/apply-analysis";
import { requireUser } from "@/lib/auth";
import { isNextRedirectError } from "@/lib/db-errors";
import { upsertLeadMessage } from "@/lib/import-messages";
import { parseMoney } from "@/lib/lead-utils";
import { updateLeadWithSchemaFallback } from "@/lib/leads-query";
import { isPipelineStage } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { clampDroneCost } from "@/lib/underwriting";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function updateLead(id: string, formData: FormData) {
  await requireUser();
  const status = String(formData.get("status") ?? "WARM");
  const pipelineStage = String(formData.get("pipelineStage") ?? "LEAD_SC");
  let current: { closedAt: Date | null; pipelineStage: string | null } | null = null;
  try {
    current = await prisma.lead.findUnique({ where: { id }, select: { closedAt: true, pipelineStage: true } });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    try {
      const legacy = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
      current = legacy ? { closedAt: null, pipelineStage: null } : null;
    } catch {
      current = null;
    }
  }
  const nextStage = isPipelineStage(pipelineStage) ? pipelineStage : current?.pipelineStage ?? "LEAD_SC";
  const drone = parseMoney(formData.get("droneCost"));

  await updateLeadWithSchemaFallback(id, {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
    apn: text(formData, "apn"),
    acres: parseMoney(formData.get("acres")),
    county: text(formData, "county"),
    state: text(formData, "state"),
    askingPrice: parseMoney(formData.get("askingPrice")),
    estimatedMarketValue: parseMoney(formData.get("estimatedMarketValue")),
    targetPurchasePrice: parseMoney(formData.get("targetPurchasePrice")),
    startingOffer: parseMoney(formData.get("startingOffer")),
    mao: parseMoney(formData.get("mao")),
    absoluteMaxPrice: parseMoney(formData.get("absoluteMaxPrice")),
    status,
    pipelineStage: nextStage,
    landPortalUrl: text(formData, "landPortalUrl"),
    lpEstimate: parseMoney(formData.get("lpEstimate")),
    arvMid: parseMoney(formData.get("arvMid")),
    arvBest: parseMoney(formData.get("arvBest")),
    arvWorst: parseMoney(formData.get("arvWorst")),
    droneCost: drone == null ? null : clampDroneCost(drone),
    purchasePrice: parseMoney(formData.get("purchasePrice")),
    actualProfit: parseMoney(formData.get("actualProfit")),
    underwritingPackNote: text(formData, "underwritingPackNote"),
    underwritingPackUrl: text(formData, "underwritingPackUrl"),
    closedAt:
      nextStage === "CERRADO"
        ? current?.closedAt ?? new Date()
        : nextStage === "DEAD"
          ? current?.closedAt ?? null
          : null
  });
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function replyFeedback(id: string, leadId: string, feedback: "CORRECT" | "ALMOST" | "WRONG") {
  await requireUser();
  await prisma.suggestedReply.update({ where: { id }, data: { feedback } });
  revalidatePath(`/leads/${leadId}`);
}

export async function markSent(id: string | null, leadId: string, formData: FormData) {
  await requireUser();
  const reply = String(formData.get("actualReply") ?? formData.get("draft") ?? "").trim();
  if (!reply) return;

  // Records the outbound SMS in the CRM thread only. Does not call SmarterContact.
  await upsertLeadMessage(leadId, {
    content: reply,
    direction: "SENT",
    timestamp: new Date(),
    source: "CRM (marked sent)"
  });

  if (id) {
    await prisma.suggestedReply.update({
      where: { id },
      data: { actualReply: reply, markedSentAt: new Date() }
    });
  } else {
    await prisma.suggestedReply.create({
      data: { leadId, aiSuggestedReply: reply, actualReply: reply, markedSentAt: new Date() }
    });
  }
  revalidatePath(`/leads/${leadId}`);
}

export async function recordDraftCopied(leadId: string, suggestionId: string | null) {
  await requireUser();
  if (suggestionId) {
    await prisma.suggestedReply.update({ where: { id: suggestionId }, data: { copiedAt: new Date() } });
  }
  revalidatePath(`/leads/${leadId}`);
}

export async function prepareDraft(leadId: string): Promise<{ draft: string; suggestionId: string | null; engine: "saved" | "rules" | "openai" }> {
  await requireUser();
  const latest = await prisma.suggestedReply.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" }
  });
  if (latest?.aiSuggestedReply) {
    return { draft: latest.aiSuggestedReply, suggestionId: latest.id, engine: "saved" };
  }

  const analysis = await prisma.aIAnalysis.findFirst({ where: { leadId }, orderBy: { createdAt: "desc" } });
  if (analysis?.suggestedReply) {
    const created = await prisma.suggestedReply.create({ data: { leadId, aiSuggestedReply: analysis.suggestedReply } });
    return { draft: analysis.suggestedReply, suggestionId: created.id, engine: "saved" };
  }

  const [settings, messages] = await Promise.all([
    prisma.negotiationSettings.findUnique({ where: { id: "default" } }),
    prisma.message.findMany({ where: { leadId }, orderBy: [{ timestamp: "asc" }, { createdAt: "asc" }] })
  ]);
  const result = await analyzeLead(messages, negotiationRulesFromSettings(settings));
  const draft = result.suggested_reply || "Gotcha. Do you have a number in mind?";
  const created = await prisma.suggestedReply.create({ data: { leadId, aiSuggestedReply: draft } });
  return { draft, suggestionId: created.id, engine: process.env.OPENAI_API_KEY ? "openai" : "rules" };
}

export async function refreshAnalysis(leadId: string) {
  await requireUser();
  await rescoreLeadFromMessages(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function notFoundRedirect() {
  redirect("/leads");
}
