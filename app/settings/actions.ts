"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function saveSettings(formData: FormData) {
  await prisma.negotiationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      negotiationStyle: String(formData.get("negotiationStyle") ?? ""),
      generalRules: String(formData.get("generalRules") ?? ""),
      mustNeverSay: String(formData.get("mustNeverSay") ?? ""),
      preferredQuestions: String(formData.get("preferredQuestions") ?? ""),
      offerStrategy: String(formData.get("offerStrategy") ?? "")
    },
    update: {
      negotiationStyle: String(formData.get("negotiationStyle") ?? ""),
      generalRules: String(formData.get("generalRules") ?? ""),
      mustNeverSay: String(formData.get("mustNeverSay") ?? ""),
      preferredQuestions: String(formData.get("preferredQuestions") ?? ""),
      offerStrategy: String(formData.get("offerStrategy") ?? "")
    }
  });
  revalidatePath("/settings");
}
