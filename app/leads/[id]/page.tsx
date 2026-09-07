import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { Shell } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import { PIPELINE_LABELS, PIPELINE_STAGES, resolvePipelineStage } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { dealProfit, offer40, offer50, resolvePurchasePrice, underwritingBreakdown } from "@/lib/underwriting";
import { markSent, replyFeedback, updateLead } from "./actions";

const statuses = ["HOT", "WARM", "FOLLOW_UP", "COLD", "DNC", "WRONG_NUMBER"];

export default async function LeadDetail({ params }: { params: { id: string } }) {
  await requireUser();
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: [{ timestamp: "asc" }, { createdAt: "asc" }] },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      suggestedReplies: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  if (!lead) return null;
  const analysis = lead.analyses[0];
  const suggestion = lead.suggestedReplies[0];
  const pipelineStage = resolvePipelineStage(lead);
  const purchase = resolvePurchasePrice(lead);
  const breakdown = underwritingBreakdown({
    arv: lead.arvMid,
    purchasePrice: purchase,
    droneCost: lead.droneCost
  });
  const profit = dealProfit(lead);

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-moss">Land deal</p>
          <h1 className="text-2xl font-semibold">{sellerDisplayName(lead)}</h1>
          <p className="text-sm text-slate-500">
            {[lead.county, lead.state].filter(Boolean).join(", ") || "County TBD"} · {lead.acres ?? "—"} acres · APN {lead.apn ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={pipelineStage} />
          <span className="text-sm font-semibold text-moss">{formatMoney(profit, "Needs ARV")}</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Seller ask" value={formatMoney(lead.askingPrice)} />
        <SummaryCard label="Mid ARV" value={formatMoney(lead.arvMid)} />
        <SummaryCard label="40% / 50% offer" value={`${formatMoney(offer40(lead.arvMid))} · ${formatMoney(offer50(lead.arvMid))}`} />
        <SummaryCard label="Est. profit" value={formatMoney(profit)} highlight />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(360px,1fr)_320px]">
        <form action={updateLead.bind(null, lead.id)} className="space-y-4">
          <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Contact & parcel</h2>
            {[
              ["firstName", "Contact first name", lead.firstName],
              ["lastName", "Last name", lead.lastName],
              ["phone", "Phone", lead.phone],
              ["apn", "APN", lead.apn],
              ["acres", "Acres", lead.acres],
              ["county", "County", lead.county],
              ["state", "State", lead.state]
            ].map(([name, label, value]) => (
              <Field key={String(name)} name={String(name)} label={String(label)} defaultValue={value?.toString() ?? ""} />
            ))}
            <label className="mb-3 block text-xs font-semibold text-slate-500">
              Pipeline stage
              <select name="pipelineStage" defaultValue={pipelineStage} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal text-ink">
                {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{PIPELINE_LABELS[stage]}</option>)}
              </select>
            </label>
            <label className="mb-3 block text-xs font-semibold text-slate-500">
              AI temperature
              <select name="status" defaultValue={lead.status} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal text-ink">
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-semibold">Underwriting</h2>
            <p className="mb-3 text-xs text-slate-500">Profit = mid ARV − purchase − drone ($150–250) − brokerless ($150) − 3% buyer&apos;s agent − $1k buy closing − $1k sell closing.</p>
            <Field name="askingPrice" label="Seller ask" defaultValue={lead.askingPrice?.toString() ?? ""} />
            <Field name="landPortalUrl" label="Land Portal deep link" defaultValue={lead.landPortalUrl ?? ""} placeholder="https://www.landportal.com/..." />
            <Field name="lpEstimate" label="Land Portal estimate" defaultValue={lead.lpEstimate?.toString() ?? ""} />
            <div className="grid grid-cols-3 gap-2">
              <Field name="arvWorst" label="ARV worst" defaultValue={lead.arvWorst?.toString() ?? ""} />
              <Field name="arvMid" label="ARV mid" defaultValue={lead.arvMid?.toString() ?? ""} />
              <Field name="arvBest" label="ARV best" defaultValue={lead.arvBest?.toString() ?? ""} />
            </div>
            <Field name="purchasePrice" label="Purchase / offer used for profit" defaultValue={lead.purchasePrice?.toString() ?? ""} placeholder="Defaults to 50% of mid ARV" />
            <Field name="droneCost" label="Drone ($150–250)" defaultValue={lead.droneCost?.toString() ?? "200"} />
            <Field name="actualProfit" label="Actual profit (optional override)" defaultValue={lead.actualProfit?.toString() ?? ""} />

            <div className="mt-2 rounded-lg bg-field p-3 text-sm">
              <div className="font-semibold text-moss">Computed offers</div>
              <div className="mt-1 flex justify-between"><span>40% of mid ARV</span><b>{formatMoney(offer40(lead.arvMid))}</b></div>
              <div className="flex justify-between"><span>50% of mid ARV</span><b>{formatMoney(offer50(lead.arvMid))}</b></div>
              <div className="mt-2 border-t border-black/10 pt-2 text-xs text-slate-600">
                <div className="flex justify-between"><span>ARV</span><span>{formatMoney(breakdown.arv)}</span></div>
                <div className="flex justify-between"><span>Purchase</span><span>{formatMoney(breakdown.purchase)}</span></div>
                <div className="flex justify-between"><span>Drone</span><span>{formatMoney(breakdown.drone)}</span></div>
                <div className="flex justify-between"><span>Brokerless</span><span>{formatMoney(breakdown.brokerless)}</span></div>
                <div className="flex justify-between"><span>Buyer&apos;s agent 3%</span><span>{formatMoney(breakdown.buyerAgent)}</span></div>
                <div className="flex justify-between"><span>Buy + sell closing</span><span>{formatMoney((breakdown.buyClosing ?? 0) + (breakdown.sellClosing ?? 0))}</span></div>
                <div className="mt-1 flex justify-between font-semibold text-ink"><span>Estimated profit</span><span>{formatMoney(breakdown.profit)}</span></div>
              </div>
            </div>
            {lead.landPortalUrl && (
              <a href={lead.landPortalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-moss">
                Open Land Portal <ExternalLink size={14} />
              </a>
            )}
          </section>

          <section className="rounded-xl border border-dashed border-moss/30 bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-semibold">Agent underwriting pack</h2>
            <p className="mb-3 text-xs text-slate-500">
              Stub for a later agent: push comps, ARV support, and a Land Portal snapshot into this deal. Paste a pack URL or notes for now.
            </p>
            <Field name="underwritingPackUrl" label="Pack URL" defaultValue={lead.underwritingPackUrl ?? ""} placeholder="https://..." />
            <label className="mb-3 block text-xs font-semibold text-slate-500">
              Pack notes
              <textarea name="underwritingPackNote" defaultValue={lead.underwritingPackNote ?? ""} className="mt-1 h-20 w-full rounded border px-3 py-2 text-sm font-normal text-ink" />
            </label>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Legacy guardrails</h2>
            {[
              ["estimatedMarketValue", "Market value", lead.estimatedMarketValue],
              ["targetPurchasePrice", "Target price", lead.targetPurchasePrice],
              ["startingOffer", "Starting offer", lead.startingOffer],
              ["mao", "MAO", lead.mao],
              ["absoluteMaxPrice", "Absolute max price", lead.absoluteMaxPrice]
            ].map(([name, label, value]) => (
              <Field key={String(name)} name={String(name)} label={String(label)} defaultValue={value?.toString() ?? ""} />
            ))}
          </section>
          <button className="w-full rounded bg-moss px-4 py-2 text-sm font-semibold text-white">Save deal</button>
        </form>

        <section className="flex min-h-[650px] flex-col rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b px-4 py-3 font-semibold">Conversation</div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-field/50 p-4">
            {lead.messages.map((message) => (
              <div key={message.id} className={message.direction === "SENT" ? "ml-auto max-w-[78%]" : "mr-auto max-w-[78%]"}>
                <div className={`rounded px-4 py-3 text-sm ${message.direction === "SENT" ? "bg-moss text-white" : "bg-white text-ink shadow-sm"}`}>
                  <div className="mb-1 text-xs opacity-70">{message.direction === "SENT" ? "Diego" : "Seller"}</div>
                  {message.content}
                </div>
                <div className="mt-1 text-xs text-slate-500">{message.timestamp?.toLocaleString() ?? ""}</div>
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <label className="text-xs font-semibold text-slate-500">AI Suggested Reply</label>
            <textarea defaultValue={suggestion?.aiSuggestedReply ?? ""} className="mt-1 h-24 w-full rounded border px-3 py-2 text-sm" />
            <form action={suggestion ? markSent.bind(null, suggestion.id, lead.id) : undefined} className="mt-2 flex flex-wrap gap-2">
              <input name="actualReply" placeholder="Paste Diego's actual sent reply" className="min-w-64 flex-1 rounded border px-3 py-2 text-sm" />
              <button type="button" className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"><Copy size={15} /> Copy Reply</button>
              <button className="rounded bg-ink px-3 py-2 text-sm font-semibold text-white">Mark as Sent</button>
            </form>
          </div>
        </section>

        <aside className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">AI Deal Brain</h2>
          {analysis?.requiresHumanAttention && (
            <div className="mb-3 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={18} /> Human review required before using this reply.
            </div>
          )}
          <div className="mb-3 rounded bg-ink p-4 text-white">
            <div className="text-sm opacity-70">Lead Score</div>
            <div className="text-3xl font-semibold">{lead.leadScore} / 100</div>
          </div>
          <div className="mb-4 rounded border border-moss/20 bg-field p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">AI Description</div>
            <div className="mt-1 text-sm leading-6">{lead.aiSummary ?? "No AI description has been generated yet."}</div>
          </div>
          {[
            ["Classification", lead.status],
            ["Seller Interest", lead.sellerInterest],
            ["Motivation", lead.motivation],
            ["Sentiment", lead.sentiment],
            ["Asking Price", lead.askingPrice ? formatMoney(lead.askingPrice) : "-"],
            ["Negotiation Stage", lead.negotiationStage],
            ["Next Action", lead.nextAction],
            ["AI Notes", analysis?.reasoningSummary]
          ].map(([label, value]) => (
            <div key={label} className="mb-3">
              <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
              <div className="text-sm">{value ?? "-"}</div>
            </div>
          ))}
          {suggestion && (
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Shadow Mode Feedback</div>
              <div className="flex gap-2">
                {(["CORRECT", "ALMOST", "WRONG"] as const).map((value) => (
                  <form key={value} action={replyFeedback.bind(null, suggestion.id, lead.id, value)}>
                    <button className="rounded border px-3 py-1.5 text-xs font-semibold hover:bg-field">{value}</button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block text-xs font-semibold text-slate-500">
      {label}
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal text-ink" />
    </label>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? "border-moss/20 bg-field" : "border-black/10 bg-white"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? "text-moss" : ""}`}>{value}</div>
    </div>
  );
}
