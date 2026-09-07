import { DbStatusBanner } from "@/components/db-status-banner";
import { Shell } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { loadBusinessMetrics } from "@/lib/business-metrics";
import { formatDbError } from "@/lib/db-errors";
import { formatMoney } from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";
import { saveBusinessMetrics, saveSettings } from "./actions";

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
  const metricsResult = await loadBusinessMetrics();
  const metrics = metricsResult.data;

  return (
    <Shell>
      <DbStatusBanner schemaDrift={metricsResult.schemaDrift} dbError={dbError ?? metricsResult.dbError} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">Sell Your Land to Diego</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Business P&amp;L feeds the green Profit total card. SMS negotiation rules stay here for later agents that push underwriting packs into a deal.
      </p>

      <form action={saveBusinessMetrics} className="mb-6 grid gap-4 rounded-3xl border border-moss/15 bg-white p-6 shadow-[0_12px_30px_-24px_rgba(23,32,38,0.45)]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Business P&amp;L</h2>
          <p className="mt-1 text-sm text-slate-500">
            Durable totals for the dashboard. Seeded from Diego&apos;s Aug 2025–Sep 2026 numbers. Potential profit uses the fallback here when no under-contract / bought deal is in the CRM. Possible profit is always live in-work mid ARV math.
          </p>
          <p className="mt-2 text-sm font-medium text-grove">
            Current net {formatMoney(metrics.netProfitAllTime)} · {metrics.note}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField name="netProfitAllTime" label="Net profit (negocio)" defaultValue={metrics.netProfitAllTime} />
          <Field name="note" label="Note / period" defaultValue={metrics.note} />
          <MoneyField name="landProfitClosed" label="Closed land profit" defaultValue={metrics.landProfitClosed} />
          <MoneyField name="coachingIncome" label="Coaching income" defaultValue={metrics.coachingIncome} />
          <MoneyField name="scAffiliateIncome" label="SC affiliate" defaultValue={metrics.scAffiliateIncome} />
          <MoneyField name="landPortalAffiliateIncome" label="Land Portal affiliate" defaultValue={metrics.landPortalAffiliateIncome} />
          <MoneyField name="affiliateIncome" label="Affiliate income (combined)" defaultValue={metrics.affiliateIncome} />
          <MoneyField name="marketingSpend" label="Marketing spend" defaultValue={metrics.marketingSpend} />
          <MoneyField
            name="pipelineProjected"
            label="Potential profit fallback (under contract / bought)"
            defaultValue={metrics.pipelineProjected}
          />
        </div>
        <button className="w-fit rounded-xl bg-grove px-4 py-2.5 text-sm font-semibold text-white shadow-sm">Save business P&amp;L</button>
      </form>

      <form action={saveSettings} className="grid gap-4 rounded-3xl border border-black/8 bg-white p-6 shadow-[0_12px_30px_-24px_rgba(23,32,38,0.45)]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Negotiation rules</h2>
          <p className="mt-1 text-sm text-slate-500">Used by later SMS / underwriting-pack agents.</p>
        </div>
        {Object.entries(defaults).map(([key, fallback]) => (
          <label key={key} className="block text-sm font-semibold">
            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            <textarea name={key} defaultValue={(settings as Record<string, string> | null)?.[key] ?? fallback} className="mt-2 h-28 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal" />
          </label>
        ))}
        <button className="w-fit rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-white shadow-sm">Save settings</button>
      </form>
    </Shell>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal" />
    </label>
  );
}

function MoneyField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input name={name} type="number" step="1" defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal" />
    </label>
  );
}
