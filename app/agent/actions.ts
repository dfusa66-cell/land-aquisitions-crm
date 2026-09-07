"use server";

import { requireUser } from "@/lib/auth";
import { loadDashboardLeads } from "@/lib/leads-query";
import { answerPipelineQuestion, buildPipelineSnapshot, type AgentAnswer } from "@/lib/pipeline-agent";

export type AgentActionResult = AgentAnswer | { error: string };

export async function askPipelineAgent(question: string): Promise<AgentActionResult> {
  await requireUser();
  const trimmed = String(question ?? "").trim().slice(0, 500);
  if (!trimmed) {
    return { error: "Escribe una pregunta sobre el pipeline." };
  }

  const { data: leads, dbError } = await loadDashboardLeads();
  if (dbError) return { error: dbError };

  const snapshot = buildPipelineSnapshot(leads);
  return answerPipelineQuestion(trimmed, snapshot);
}
