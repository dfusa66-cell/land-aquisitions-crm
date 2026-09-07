"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isNextRedirectError } from "@/lib/db-errors";
import { updateLeadWithSchemaFallback } from "@/lib/leads-query";
import { isPipelineStage } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export async function updatePipelineStage(id: string, stage: string) {
  await requireUser();
  if (!isPipelineStage(stage)) return;
  try {
    let closedAt: Date | null = null;
    try {
      const current = await prisma.lead.findUnique({ where: { id }, select: { closedAt: true } });
      closedAt = stage === "CERRADO" ? current?.closedAt ?? new Date() : stage === "DEAD" ? current?.closedAt ?? null : null;
    } catch {
      closedAt = stage === "CERRADO" ? new Date() : null;
    }
    await updateLeadWithSchemaFallback(id, { pipelineStage: stage, closedAt });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("[updatePipelineStage]", error);
    return;
  }
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}
