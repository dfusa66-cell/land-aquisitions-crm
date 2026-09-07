import { analyzeLead, toLeadStatus, type LeadAnalysis } from "@/lib/ai";
import { updateLeadWithSchemaFallback } from "@/lib/leads-query";
import { nextPipelineStageOnImport } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export function negotiationRulesFromSettings(settings: { [key: string]: unknown } | null) {
  return settings ? Object.values(settings).join("\n") : "";
}

export async function persistLeadAnalysis(leadId: string, analysis: LeadAnalysis, existingStage?: string | null) {
  const status = toLeadStatus(analysis.classification);
  const pipelineStage = nextPipelineStageOnImport({
    status,
    askingPrice: analysis.asking_price,
    existingStage
  });

  await prisma.aIAnalysis.create({
    data: {
      leadId,
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

  await updateLeadWithSchemaFallback(leadId, {
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
  });

  if (analysis.suggested_reply) {
    await prisma.suggestedReply.create({ data: { leadId, aiSuggestedReply: analysis.suggested_reply } });
  }
  if (status === "FOLLOW_UP" && analysis.follow_up_date) {
    await prisma.followUp.create({ data: { leadId, dueAt: new Date(analysis.follow_up_date), note: analysis.next_action } });
  }

  return { status, pipelineStage, analysis };
}

export async function rescoreLeadFromMessages(leadId: string) {
  const [settings, messages, lead] = await Promise.all([
    prisma.negotiationSettings.findUnique({ where: { id: "default" } }),
    prisma.message.findMany({ where: { leadId }, orderBy: [{ timestamp: "asc" }, { createdAt: "asc" }] }),
    prisma.lead.findUnique({ where: { id: leadId }, select: { pipelineStage: true } })
  ]);
  const analysis = await analyzeLead(messages, negotiationRulesFromSettings(settings));
  return persistLeadAnalysis(leadId, analysis, lead?.pipelineStage ?? null);
}
