import { DbStatusBanner } from "@/components/db-status-banner";
import { Shell } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { formatDbError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { saveSettings } from "./actions";

const defaults = {
  negotiationStyle: "Short, direct, respectful SMS. Sound like a real land investor, not a chatbot.",
  generalRules: "Qualify motivation, timeline, ownership, price expectations, and whether the seller has decision authority.",
  mustNeverSay: "Never claim property research was completed unless data exists. Never accept a price or create a binding agreement.",
  preferredQuestions: "Do you have a number in mind? Is that your bottom number? What made you consider selling?",
  offerStrategy: "Start below target purchase price, stay under MAO, and escalate any reply that appears to accept a seller price."
};

export default async function SettingsPage() {
  await requireUser();
  let settings = null;
  let dbError: string | null = null;
  try {
    settings = await prisma.negotiationSettings.findUnique({ where: { id: "default" } });
  } catch (error) {
    dbError = formatDbError(error);
  }
  return (
    <Shell>
      <DbStatusBanner dbError={dbError} />
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mb-5 text-sm text-slate-500">SMS negotiation rules stay here for later agents that push underwriting packs into a deal.</p>
      <form action={saveSettings} className="grid gap-4 rounded border border-black/10 bg-white p-5 shadow-sm">
        {Object.entries(defaults).map(([key, fallback]) => (
          <label key={key} className="block text-sm font-semibold">
            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            <textarea name={key} defaultValue={(settings as any)?.[key] ?? fallback} className="mt-2 h-28 w-full rounded border px-3 py-2 text-sm font-normal" />
          </label>
        ))}
        <button className="w-fit rounded bg-moss px-4 py-2 text-sm font-semibold text-white">Save settings</button>
      </form>
    </Shell>
  );
}
