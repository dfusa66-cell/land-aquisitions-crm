"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isPipelineStage } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export async function updatePipelineStage(id: string, stage: string) {
  await requireUser();
  if (!isPipelineStage(stage)) return;
  const current = await prisma.lead.findUnique({ where: { id }, select: { closedAt: true } });
  await prisma.lead.update({
    where: { id },
    data: {
      pipelineStage: stage,
      closedAt: stage === "CERRADO" ? current?.closedAt ?? new Date() : stage === "DEAD" ? current?.closedAt ?? null : null
    }
  });
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}
