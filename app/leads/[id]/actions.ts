"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMoney } from "@/lib/lead-utils";

export async function updateLead(id: string, formData: FormData) {
  await prisma.lead.update({
    where: { id },
    data: {
      firstName: String(formData.get("firstName") ?? "") || null,
      lastName: String(formData.get("lastName") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      apn: String(formData.get("apn") ?? "") || null,
      acres: parseMoney(formData.get("acres")),
      county: String(formData.get("county") ?? "") || null,
      state: String(formData.get("state") ?? "") || null,
      askingPrice: parseMoney(formData.get("askingPrice")),
      estimatedMarketValue: parseMoney(formData.get("estimatedMarketValue")),
      targetPurchasePrice: parseMoney(formData.get("targetPurchasePrice")),
      startingOffer: parseMoney(formData.get("startingOffer")),
      mao: parseMoney(formData.get("mao")),
      absoluteMaxPrice: parseMoney(formData.get("absoluteMaxPrice")),
      status: String(formData.get("status")) as any
    }
  });
  revalidatePath(`/leads/${id}`);
}

export async function replyFeedback(id: string, leadId: string, feedback: "CORRECT" | "ALMOST" | "WRONG") {
  await prisma.suggestedReply.update({ where: { id }, data: { feedback } });
  revalidatePath(`/leads/${leadId}`);
}

export async function markSent(id: string, leadId: string, formData: FormData) {
  await prisma.suggestedReply.update({
    where: { id },
    data: { actualReply: String(formData.get("actualReply") ?? ""), markedSentAt: new Date() }
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function notFoundRedirect() {
  redirect("/leads");
}
