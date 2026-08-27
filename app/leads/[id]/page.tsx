import { AlertTriangle, Copy } from "lucide-react";
import { Shell } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{lead.firstName} {lead.lastName}</h1>
          <p className="text-sm text-slate-500">{lead.county}, {lead.state} | APN {lead.apn}</p>
        </div>
        <StatusBadge status={lead.status} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(360px,1fr)_340px]">
        <form action={updateLead.bind(null, lead.id)} className="rounded border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Property & Seller</h2>
          {[
            ["firstName", "First name", lead.firstName],
            ["lastName", "Last name", lead.lastName],
            ["phone", "Phone", lead.phone],
            ["apn", "APN", lead.apn],
            ["acres", "Acres", lead.acres],
            ["county", "County", lead.county],
            ["state", "State", lead.state],
            ["askingPrice", "Asking price", lead.askingPrice],
            ["estimatedMarketValue", "Market value", lead.estimatedMarketValue],
            ["targetPurchasePrice", "Target price", lead.targetPurchasePrice],
            ["startingOffer", "Starting offer", lead.startingOffer],
            ["mao", "MAO", lead.mao],
            ["absoluteMaxPrice", "Absolute max price", lead.absoluteMaxPrice]
          ].map(([name, label, value]) => (
            <label key={name} className="mb-3 block text-xs font-semibold text-slate-500">
              {label}
              <input name={name as string} defaultValue={value?.toString() ?? ""} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal text-ink" />
            </label>
          ))}
          <label className="mb-3 block text-xs font-semibold text-slate-500">
            Lead status
            <select name="status" defaultValue={lead.status} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal text-ink">
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button className="w-full rounded bg-moss px-4 py-2 text-sm font-semibold text-white">Save changes</button>
        </form>

        <section className="flex min-h-[650px] flex-col rounded border border-black/10 bg-white shadow-sm">
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

        <aside className="rounded border border-black/10 bg-white p-4 shadow-sm">
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
            ["Asking Price", lead.askingPrice ? `$${lead.askingPrice.toLocaleString()}` : "-"],
            ["Negotiation Stage", lead.negotiationStage],
            ["AI Summary", lead.aiSummary],
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
