import Link from "next/link";
import { Shell } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { DbStatusBanner } from "@/components/db-status-banner";
import { requireUser } from "@/lib/auth";
import { loadBusinessMetrics, projectedPipelineProfit } from "@/lib/business-metrics";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import { loadDashboardLeads } from "@/lib/leads-query";
import { ACTIVE_PIPELINE_STAGES, PIPELINE_LABELS, PIPELINE_STAGES, resolvePipelineStage } from "@/lib/pipeline";
import { dealProfit, offer40, offer50 } from "@/lib/underwriting";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default async function Dashboard() {
  await requireUser();
  const [{ data: leads, schemaDrift, dbError }, metricsResult] = await Promise.all([
    loadDashboardLeads(),
    loadBusinessMetrics()
  ]);
  const metrics = metricsResult.data;

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
  const pipelineProjected = projectedPipelineProfit(decorated, metrics.pipelineProjected);

  return (
    <Shell>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">Sell Your Land to Diego</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Sell Your Land to Diego CRM</h1>
      </div>
      <DbStatusBanner schemaDrift={schemaDrift || metricsResult.schemaDrift} dbError={dbError ?? metricsResult.dbError} />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="relative overflow-hidden rounded-3xl bg-grove px-6 py-6 text-white shadow-[0_18px_40px_-24px_rgba(23,50,36,0.75)] ring-1 ring-white/10 lg:col-span-1">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-8 h-28 w-28 rounded-full bg-black/10" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Profit total</div>
            <div className="mt-1 text-sm font-medium text-emerald-100">Net profit (negocio)</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{formatMoney(metrics.netProfitAllTime)}</div>
            <p className="mt-4 border-t border-white/15 pt-3 text-sm text-emerald-100">
              Pipeline projected <span className="font-semibold text-white">{formatMoney(pipelineProjected)}</span>
            </p>
          </div>
        </article>
        <article className="rounded-3xl border border-moss/15 bg-white p-6 shadow-[0_12px_30px_-24px_rgba(23,32,38,0.45)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Potential profit</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-moss">{formatMoney(potentialProfit)}</div>
          <p className="mt-3 text-sm leading-6 text-slate-500">{active.length} active deals · mid ARV and purchase or 50% offer</p>
        </article>
        <article className="rounded-3xl border border-black/10 bg-ink p-6 text-white shadow-[0_12px_30px_-20px_rgba(23,32,38,0.55)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Closed profit this month</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight">{formatMoney(closedProfit)}</div>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {closedThisMonth.length} cerrado deal{closedThisMonth.length === 1 ? "" : "s"} since {monthStart.toLocaleDateString()}
          </p>
        </article>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Active pipeline" value={active.length} href="/leads?group=active&view=pipeline" />
        <Stat label="Need price / UW" value={needsAsk.length} href="/leads?group=precio_ask&view=pipeline" />
        <Stat label="Ready to close" value={ready.length} href="/leads?group=ready_to_close&view=pipeline" />
      </section>

      <section className="mt-8">
        <div className="mb-3 text-sm font-semibold tracking-tight">Pipeline snapshot</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PIPELINE_STAGES.map((stage) => {
            const count = decorated.filter((lead) => lead.pipelineStage === stage).length;
            return (
              <Link
                key={stage}
                href={`/leads?group=${stage === "CERRADO" ? "closed" : stage.toLowerCase()}&view=pipeline`}
                className="min-w-32 rounded-2xl border border-black/8 bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.03] transition hover:border-moss/35 hover:shadow-md"
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{PIPELINE_LABELS[stage]}</div>
                <div className="mt-1.5 text-2xl font-semibold tracking-tight">{count}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_12px_30px_-24px_rgba(23,32,38,0.45)]">
        <div className="border-b border-black/5 px-5 py-3.5 text-sm font-semibold tracking-tight">Recent land deals</div>
        <div className="divide-y divide-black/5">
          {decorated.slice(0, 8).map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-field">
              <StatusBadge status={lead.pipelineStage} />
              <span className="font-medium">{sellerDisplayName(lead)}</span>
              <span className="text-sm text-slate-500">{lead.county}, {lead.state} · {lead.acres ?? "—"} ac · APN {lead.apn ?? "—"}</span>
              <span className="text-sm text-slate-600">Ask {formatMoney(lead.askingPrice)} · 50% {formatMoney(offer50(lead.arvMid))} · 40% {formatMoney(offer40(lead.arvMid))}</span>
              <span className="ml-auto text-sm font-semibold text-moss">{formatMoney(lead.profit, "Needs ARV")}</span>
            </Link>
          ))}
          {decorated.length === 0 && (
            <div className="px-5 py-10 text-sm text-slate-500">No deals yet. Import a SmarterContact lead or seed local demo data.</div>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition hover:border-moss/35 hover:shadow-md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </Link>
  );
}
