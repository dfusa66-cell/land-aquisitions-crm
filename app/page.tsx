import Link from "next/link";
import { Shell } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { DbStatusBanner } from "@/components/db-status-banner";
import { requireUser } from "@/lib/auth";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import { loadDashboardLeads } from "@/lib/leads-query";
import { ACTIVE_PIPELINE_STAGES, PIPELINE_LABELS, PIPELINE_STAGES, resolvePipelineStage } from "@/lib/pipeline";
import { dealProfit, offer40, offer50 } from "@/lib/underwriting";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default async function Dashboard() {
  await requireUser();
  const { data: leads, schemaDrift, dbError } = await loadDashboardLeads();

  const decorated = leads.map((lead) => {
    const pipelineStage = resolvePipelineStage(lead);
    const profit = dealProfit(lead);
    return { ...lead, pipelineStage, profit };
  });

  const monthStart = startOfMonth();
  const active = decorated.filter((lead) => ACTIVE_PIPELINE_STAGES.includes(lead.pipelineStage));
  const closedThisMonth = decorated.filter((lead) => {
    if (lead.pipelineStage !== "CERRADO") return false;
    const closedOn = lead.closedAt ?? lead.updatedAt;
    return closedOn >= monthStart;
  });
  const potentialProfit = active.reduce((sum, lead) => sum + (lead.profit ?? 0), 0);
  const closedProfit = closedThisMonth.reduce((sum, lead) => sum + (lead.profit ?? 0), 0);
  const ready = decorated.filter((lead) => lead.pipelineStage === "READY_TO_CLOSE");
  const needsAsk = decorated.filter((lead) => lead.pipelineStage === "LEAD_SC" || lead.pipelineStage === "PRECIO_ASK");

  return (
    <Shell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-moss">Sell Your Land to Diego</p>
        <h1 className="text-3xl font-semibold">Land flipping desk</h1>
        <p className="text-sm text-slate-500">Potential profit is open-pipeline mid ARV minus purchase, drone, brokerless, 3% buyer&apos;s agent, and both closings.</p>
      </div>
      <DbStatusBanner schemaDrift={schemaDrift} dbError={dbError} />

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-moss/20 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Potential profit</div>
          <div className="mt-2 text-4xl font-semibold text-moss">{formatMoney(potentialProfit)}</div>
          <p className="mt-2 text-sm text-slate-500">{active.length} active deals · uses mid ARV and purchase or 50% offer</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-ink p-5 text-white shadow-sm">
          <div className="text-sm text-white/70">Closed profit this month</div>
          <div className="mt-2 text-4xl font-semibold">{formatMoney(closedProfit)}</div>
          <p className="mt-2 text-sm text-white/60">{closedThisMonth.length} cerrado deal{closedThisMonth.length === 1 ? "" : "s"} since {monthStart.toLocaleDateString()}</p>
        </article>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Active pipeline" value={active.length} href="/leads?group=active&view=pipeline" />
        <Stat label="Need price / UW" value={needsAsk.length} href="/leads?group=precio_ask&view=pipeline" />
        <Stat label="Ready to close" value={ready.length} href="/leads?group=ready_to_close&view=pipeline" />
      </section>

      <section className="mt-6 overflow-x-auto">
        <div className="mb-3 text-sm font-semibold">Pipeline snapshot</div>
        <div className="flex min-w-max gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const count = decorated.filter((lead) => lead.pipelineStage === stage).length;
            return (
              <Link
                key={stage}
                href={`/leads?group=${stage === "CERRADO" ? "closed" : stage.toLowerCase()}&view=pipeline`}
                className="min-w-32 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm hover:border-moss/40"
              >
                <div className="text-xs text-slate-500">{PIPELINE_LABELS[stage]}</div>
                <div className="mt-1 text-2xl font-semibold">{count}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="border-b px-4 py-3 font-semibold">Recent land deals</div>
        <div className="divide-y">
          {decorated.slice(0, 8).map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-field">
              <StatusBadge status={lead.pipelineStage} />
              <span className="font-medium">{sellerDisplayName(lead)}</span>
              <span className="text-sm text-slate-500">{lead.county}, {lead.state} · {lead.acres ?? "—"} ac · APN {lead.apn ?? "—"}</span>
              <span className="text-sm text-slate-600">Ask {formatMoney(lead.askingPrice)} · 50% {formatMoney(offer50(lead.arvMid))} · 40% {formatMoney(offer40(lead.arvMid))}</span>
              <span className="ml-auto text-sm font-semibold text-moss">{formatMoney(lead.profit, "Needs ARV")}</span>
            </Link>
          ))}
          {decorated.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-500">No deals yet. Import a SmarterContact lead or seed local demo data.</div>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm hover:border-moss/40">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Link>
  );
}
