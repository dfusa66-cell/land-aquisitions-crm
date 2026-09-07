import { DbStatusBanner } from "@/components/db-status-banner";
import { LeadsClient } from "@/components/leads/leads-client";
import { requireUser } from "@/lib/auth";
import { loadLeadsList } from "@/lib/leads-query";
import { resolvePipelineStage } from "@/lib/pipeline";
import { dealProfit, offer40, offer50 } from "@/lib/underwriting";

export default async function LeadsPage() {
  await requireUser();
  const { data: leads, schemaDrift, dbError } = await loadLeadsList();

  return (
    <LeadsClient
      notice={<DbStatusBanner schemaDrift={schemaDrift} dbError={dbError} />}
      leads={leads.map((lead) => {
    const pipelineStage = resolvePipelineStage(lead);
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      acres: lead.acres,
      county: lead.county,
      state: lead.state,
      apn: lead.apn,
      status: lead.status,
      pipelineStage,
      leadScore: lead.leadScore,
      askingPrice: lead.askingPrice,
      landPortalUrl: lead.landPortalUrl,
      lpEstimate: lead.lpEstimate,
      arvMid: lead.arvMid,
      offer40: offer40(lead.arvMid),
      offer50: offer50(lead.arvMid),
      estimatedProfit: dealProfit(lead),
      motivation: lead.motivation,
      aiSummary: lead.aiSummary,
      nextAction: lead.nextAction,
      followUpDate: lead.followUpDate?.toISOString() ?? null,
      updatedAt: lead.updatedAt.toISOString(),
      createdAt: lead.createdAt.toISOString(),
      lastMessage: lead.messages[0] ? { content: lead.messages[0].content, direction: lead.messages[0].direction, timestamp: lead.messages[0].timestamp?.toISOString() ?? null } : null,
      requiresHumanAttention: lead.analyses[0]?.requiresHumanAttention ?? false,
      hasSuggestedReply: lead.suggestedReplies.length > 0
    };
  })}
    />
  );
}
