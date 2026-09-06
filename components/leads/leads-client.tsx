"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Phone, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { LeadScoreBadge } from "@/components/leads/lead-score-badge";
import { MainSidebar } from "@/components/leads/main-sidebar";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import { PIPELINE_LABELS, type PipelineStage } from "@/lib/pipeline";

export type LeadCardData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acres: number | null;
  county: string | null;
  state: string | null;
  apn: string | null;
  status: string;
  pipelineStage: PipelineStage;
  leadScore: number;
  askingPrice: number | null;
  landPortalUrl: string | null;
  lpEstimate: number | null;
  arvMid: number | null;
  offer40: number | null;
  offer50: number | null;
  estimatedProfit: number | null;
  motivation: string | null;
  aiSummary: string | null;
  nextAction: string | null;
  followUpDate: string | null;
  updatedAt: string;
  createdAt: string;
  lastMessage: { content: string; direction: string; timestamp: string | null } | null;
  requiresHumanAttention: boolean;
  hasSuggestedReply: boolean;
};

type ViewMode = "pipeline" | "cards" | "list";
type SortMode = "ai_priority" | "newest" | "highest_profit" | "highest_asking" | "recently_active";

const groupLabels = [
  ["all", "All deals"],
  ["active", "Active pipeline"],
  ["lead_sc", "Lead SC"],
  ["precio_ask", "Precio/Ask"],
  ["underwritten", "Underwritten"],
  ["oferta_enviada", "Oferta enviada"],
  ["negociacion", "Negociación"],
  ["ready_to_close", "Ready to close"],
  ["closed", "Cerrado"],
  ["dead", "Dead"],
  ["new_replies", "New replies"],
  ["hot", "Hot (AI)"]
] as const;

const stageByGroup: Record<string, PipelineStage> = {
  lead_sc: "LEAD_SC",
  precio_ask: "PRECIO_ASK",
  underwritten: "UNDERWRITTEN",
  oferta_enviada: "OFERTA_ENVIADA",
  negociacion: "NEGOCIACION",
  ready_to_close: "READY_TO_CLOSE",
  closed: "CERRADO",
  cerrado: "CERRADO",
  dead: "DEAD"
};

const sortLabels: [SortMode, string][] = [
  ["ai_priority", "AI priority"],
  ["newest", "Newest first"],
  ["highest_profit", "Highest profit"],
  ["highest_asking", "Highest ask"],
  ["recently_active", "Recently active"]
];

function matchesGroup(lead: LeadCardData, group: string) {
  if (group === "all") return true;
  if (group === "active") return lead.pipelineStage !== "CERRADO" && lead.pipelineStage !== "DEAD";
  if (group === "new_replies") return lead.lastMessage?.direction === "RECEIVED";
  if (group === "hot") return lead.status === "HOT";
  const stage = stageByGroup[group];
  return stage ? lead.pipelineStage === stage : true;
}

export function LeadsClient({ leads }: { leads: LeadCardData[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlGroup = params.get("group") ?? "all";
  const urlView = (params.get("view") as ViewMode | null) ?? null;
  const [view, setView] = useState<ViewMode>(() => urlView ?? (typeof localStorage === "undefined" ? "pipeline" : ((localStorage.getItem("leadView") as ViewMode) || "pipeline")));
  const [sort, setSort] = useState<SortMode>("highest_profit");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(urlGroup);

  useEffect(() => {
    setGroup(urlGroup);
  }, [urlGroup]);

  useEffect(() => {
    if (urlView === "cards" || urlView === "list" || urlView === "pipeline") {
      setView(urlView);
      localStorage.setItem("leadView", urlView);
    }
  }, [urlView]);

  const counts = useMemo(() => Object.fromEntries(groupLabels.map(([key]) => [key, leads.filter((lead) => matchesGroup(lead, key)).length])), [leads]);
  const visible = useMemo(() => {
    const search = query.toLowerCase();
    return leads
      .filter((lead) => matchesGroup(lead, group))
      .filter((lead) => {
        const haystack = [sellerDisplayName(lead), lead.phone, lead.county, lead.state, lead.apn].join(" ").toLowerCase();
        return !search || haystack.includes(search);
      })
      .sort((a, b) => {
        if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "highest_profit") return (b.estimatedProfit ?? -Infinity) - (a.estimatedProfit ?? -Infinity);
        if (sort === "highest_asking") return (b.askingPrice ?? 0) - (a.askingPrice ?? 0);
        if (sort === "recently_active") return new Date(b.lastMessage?.timestamp ?? b.updatedAt).getTime() - new Date(a.lastMessage?.timestamp ?? a.updatedAt).getTime();
        return Number(b.lastMessage?.direction === "RECEIVED") - Number(a.lastMessage?.direction === "RECEIVED") || b.leadScore - a.leadScore;
      });
  }, [group, leads, query, sort]);

  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem("leadView", next);
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("view", next);
    router.replace(`/leads?${nextParams.toString()}`, { scroll: false });
  }

  function changeGroup(next: string) {
    setGroup(next);
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("group", next);
    nextParams.delete("status");
    router.replace(`/leads?${nextParams.toString()}`, { scroll: false });
  }

  const summary = [
    ["Active deals", "active", counts.active],
    ["Need underwriting", "precio_ask", counts.precio_ask],
    ["Offers out", "oferta_enviada", counts.oferta_enviada],
    ["Ready to close", "ready_to_close", counts.ready_to_close]
  ] as const;

  return (
    <main className="flex min-h-screen bg-[#f4f6f2] text-[#172026]">
      <MainSidebar />
      <aside className="hidden w-72 shrink-0 border-r border-black/10 bg-white p-5 xl:block">
        <div className="text-xs font-bold tracking-wide text-slate-500">LAND PIPELINE</div>
        <section className="mt-6">
          <div className="mb-2 text-xs font-bold tracking-wide text-slate-500">VIEW</div>
          <div className="grid grid-cols-3 rounded border bg-field p-1 text-xs font-semibold">
            {(["pipeline", "cards", "list"] as const).map((item) => (
              <button key={item} onClick={() => changeView(item)} className={`rounded px-2 py-2 ${view === item ? "bg-white shadow-sm" : "text-slate-500"}`}>
                {item === "pipeline" ? "BOARD" : item.toUpperCase()}
              </button>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <label className="mb-2 block text-xs font-bold tracking-wide text-slate-500">SORT</label>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="w-full rounded border px-3 py-2 text-sm">
            {sortLabels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </section>
        <section className="mt-6">
          <div className="mb-2 text-xs font-bold tracking-wide text-slate-500">STAGES</div>
          <div className="space-y-1">
            {groupLabels.map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeGroup(key)}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${group === key ? "bg-[#e8eee8] font-semibold text-[#193326]" : "text-slate-600 hover:bg-field"}`}
              >
                <span>{label}</span>
                <span className="text-xs text-slate-400">{counts[key] ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
      <section className="min-w-0 flex-1 p-4 sm:p-6">
        <header className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-moss">Sell Your Land to Diego</p>
              <h1 className="text-3xl font-semibold">Vacant land pipeline</h1>
              <p className="text-sm text-slate-500">{visible.length} deals · drag cards between stages or open a deal to underwrite</p>
            </div>
            <div className="flex rounded border bg-white p-1 text-xs font-semibold xl:hidden">
              {(["pipeline", "cards", "list"] as const).map((item) => (
                <button key={item} onClick={() => changeView(item)} className={`rounded px-3 py-2 ${view === item ? "bg-[#193326] text-white" : "text-slate-500"}`}>
                  {item === "pipeline" ? "BOARD" : item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search seller, phone, county, state, APN..."
              className="h-12 w-full rounded border border-black/10 bg-white pl-12 pr-4 text-sm shadow-sm"
            />
          </div>
        </header>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(([label, nextGroup, value]) => (
            <button key={label} onClick={() => changeGroup(nextGroup)} className="rounded-xl border border-black/10 bg-white p-4 text-left shadow-sm hover:border-[#193326]/40">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </button>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/20 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No land deals in this stage.</h2>
            <p className="mt-2 text-sm text-slate-500">
              SmarterContact / Zapier imports land in Lead SC. Add ARV and a Land Portal link to move into underwriting.
            </p>
          </div>
        )}
        {visible.length > 0 && view === "pipeline" && (
          <PipelineBoard
            leads={visible.map((lead) => ({
              id: lead.id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              acres: lead.acres,
              county: lead.county,
              state: lead.state,
              apn: lead.apn,
              askingPrice: lead.askingPrice,
              pipelineStage: lead.pipelineStage,
              landPortalUrl: lead.landPortalUrl,
              lpEstimate: lead.lpEstimate,
              estimatedProfit: lead.estimatedProfit,
              offer40: lead.offer40,
              offer50: lead.offer50
            }))}
          />
        )}
        {visible.length > 0 && view === "cards" && <LeadCardGrid leads={visible} />}
        {visible.length > 0 && view === "list" && <LeadList leads={visible} />}
      </section>
    </main>
  );
}

function LeadCardGrid({ leads }: { leads: LeadCardData[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadCardData }) {
  const last = lead.lastMessage;
  return (
    <Link href={`/leads/${lead.id}`} className="flex min-h-[420px] flex-col rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{sellerDisplayName(lead)}</h2>
          <p className="text-sm text-slate-500">{lead.county} County, {lead.state}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded border text-[#193326]"><Phone size={17} /></span>
          <LeadScoreBadge score={lead.leadScore} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={lead.pipelineStage} />
        {lead.apn && <span className="rounded border px-2 py-1 text-xs font-semibold text-slate-600">APN {lead.apn}</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Seller ask" value={formatMoney(lead.askingPrice)} />
        <Metric label="Est. profit" value={formatMoney(lead.estimatedProfit)} accent />
        <Metric label="Offer 40%" value={formatMoney(lead.offer40)} />
        <Metric label="Offer 50%" value={formatMoney(lead.offer50)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Info label="Acres" value={lead.acres?.toString() ?? "—"} />
        <Info label="LP estimate" value={formatMoney(lead.lpEstimate)} />
      </div>
      <div className="mt-4 rounded border border-black/10 p-3">
        <div className="text-xs font-bold tracking-wide text-slate-500">LAST MESSAGE</div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-700">
          <b>{last?.direction === "RECEIVED" ? "Seller" : "Diego"}:</b> {last?.content ?? "No messages yet."}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock size={13} /> {last?.timestamp ? new Date(last.timestamp).toLocaleDateString() : "—"}</div>
      </div>
    </Link>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded border p-3 ${accent ? "border-moss/20 bg-field" : "border-black/10"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${accent ? "text-moss" : ""}`}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function LeadList({ leads }: { leads: LeadCardData[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <div className="grid min-w-[1100px] grid-cols-[140px_160px_150px_110px_110px_110px_110px_1fr] border-b bg-field px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Stage</span>
        <span>Seller</span>
        <span>County / APN</span>
        <span>Ask</span>
        <span>40% offer</span>
        <span>50% offer</span>
        <span>Profit</span>
        <span>Next</span>
      </div>
      {leads.map((lead) => (
        <Link key={lead.id} href={`/leads/${lead.id}`} className="grid min-w-[1100px] grid-cols-[140px_160px_150px_110px_110px_110px_110px_1fr] items-center border-b px-4 py-3 text-sm hover:bg-field">
          <StatusBadge status={lead.pipelineStage} />
          <span>{sellerDisplayName(lead)}</span>
          <span className="truncate">{lead.county}, {lead.state}<br /><span className="text-xs text-slate-500">{lead.apn}</span></span>
          <span>{formatMoney(lead.askingPrice)}</span>
          <span>{formatMoney(lead.offer40)}</span>
          <span>{formatMoney(lead.offer50)}</span>
          <span className="font-semibold text-moss">{formatMoney(lead.estimatedProfit)}</span>
          <span className="truncate">{lead.nextAction ?? PIPELINE_LABELS[lead.pipelineStage]}</span>
        </Link>
      ))}
    </div>
  );
}
