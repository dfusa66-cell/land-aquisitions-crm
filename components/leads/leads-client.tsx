"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Filter, ListFilter, Phone, RotateCcw, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { LeadScoreBadge } from "@/components/leads/lead-score-badge";
import { MainSidebar } from "@/components/leads/main-sidebar";

type LeadCardData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acres: number | null;
  county: string | null;
  state: string | null;
  apn: string | null;
  status: string;
  leadScore: number;
  askingPrice: number | null;
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

type ViewMode = "cards" | "list" | "pipeline";
type SortMode =
  | "ai_priority"
  | "newest"
  | "oldest"
  | "highest_score"
  | "lowest_score"
  | "highest_asking"
  | "lowest_asking"
  | "recently_active";

const groupLabels = [
  ["all", "All Leads"],
  ["open", "Open Leads"],
  ["new_replies", "New Leads"],
  ["interested", "Interested"],
  ["negotiating", "Negotiating"],
  ["follow_up", "Follow Up"],
  ["hot", "Hot Leads"],
  ["offers", "Offers"],
  ["contracts", "Contract Needed"],
  ["under_contract", "Under Contract"],
  ["due_diligence", "Due Diligence"],
  ["closed", "Closed"],
  ["dead", "Dead"],
  ["dnc", "DNC"],
  ["wrong_number", "Wrong Number"]
] as const;

const sortLabels: [SortMode, string][] = [
  ["ai_priority", "AI Priority"],
  ["newest", "Newest First"],
  ["oldest", "Oldest First"],
  ["highest_score", "Highest Lead Score"],
  ["lowest_score", "Lowest Lead Score"],
  ["highest_asking", "Highest Asking Price"],
  ["lowest_asking", "Lowest Asking Price"],
  ["recently_active", "Recently Active"]
];

function sellerName(lead: LeadCardData) {
  return `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "Unknown Seller";
}

function money(value: number | null) {
  return value ? `$${value.toLocaleString()}` : "Not provided";
}

function shortDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function relative(value: string | null) {
  if (!value) return "No timestamp";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function priorityLabel(score: number) {
  if (score >= 80) return "HIGH PRIORITY";
  if (score >= 60) return "MEDIUM PRIORITY";
  return "LOW PRIORITY";
}

function matchesGroup(lead: LeadCardData, group: string) {
  if (group === "all") return true;
  if (group === "open") return !["DNC", "WRONG_NUMBER", "COLD"].includes(lead.status);
  if (group === "new_replies") return lead.lastMessage?.direction === "RECEIVED";
  if (group === "interested") return ["HOT", "WARM"].includes(lead.status);
  if (group === "negotiating") return lead.askingPrice !== null || /negotiat|counter|price/i.test(lead.nextAction ?? "");
  if (group === "follow_up") return lead.status === "FOLLOW_UP";
  if (group === "hot") return lead.status === "HOT";
  if (group === "offers") return /offer|review asking|counter/i.test(lead.nextAction ?? "");
  if (group === "contracts") return /contract/i.test(lead.nextAction ?? "");
  if (group === "dead") return ["COLD", "DNC", "WRONG_NUMBER"].includes(lead.status);
  if (group === "dnc") return lead.status === "DNC";
  if (group === "wrong_number") return lead.status === "WRONG_NUMBER";
  return false;
}

export function LeadsClient({ leads }: { leads: LeadCardData[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlGroup = params.get("group") ?? (params.get("status") === "HOT" ? "hot" : params.get("status") === "FOLLOW_UP" ? "follow_up" : "all");
  const urlView = (params.get("view") as ViewMode | null) ?? null;
  const [view, setView] = useState<ViewMode>(() => urlView ?? (typeof localStorage === "undefined" ? "cards" : ((localStorage.getItem("leadView") as ViewMode) || "cards")));
  const [sort, setSort] = useState<SortMode>("ai_priority");
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
        const haystack = [sellerName(lead), lead.phone, lead.county, lead.state, lead.apn].join(" ").toLowerCase();
        return !search || haystack.includes(search);
      })
      .sort((a, b) => {
        if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === "highest_score") return b.leadScore - a.leadScore;
        if (sort === "lowest_score") return a.leadScore - b.leadScore;
        if (sort === "highest_asking") return (b.askingPrice ?? 0) - (a.askingPrice ?? 0);
        if (sort === "lowest_asking") return (a.askingPrice ?? Infinity) - (b.askingPrice ?? Infinity);
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
    ["New Replies", "new_replies", leads.filter((lead) => lead.lastMessage?.direction === "RECEIVED").length],
    ["Hot Leads", "hot", counts.hot],
    ["Follow Ups Today", "follow_up", counts.follow_up],
    ["Offers Needed", "offers", counts.offers]
  ] as const;

  return (
    <main className="flex min-h-screen bg-[#f4f6f2] text-[#172026]">
      <MainSidebar />
      <aside className="hidden w-72 shrink-0 border-r border-black/10 bg-white p-5 xl:block">
        <div className="text-xs font-bold tracking-wide text-slate-500">LEADS</div>
        <section className="mt-6">
          <div className="mb-2 text-xs font-bold tracking-wide text-slate-500">VIEW</div>
          <div className="grid grid-cols-3 rounded border bg-field p-1 text-xs font-semibold">
            {(["cards", "list", "pipeline"] as const).map((item) => (
              <button key={item} onClick={() => changeView(item)} className={`rounded px-2 py-2 ${view === item ? "bg-white shadow-sm" : "text-slate-500"}`}>
                {item.toUpperCase()}
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
          <div className="mb-2 text-xs font-bold tracking-wide text-slate-500">LEAD GROUPS</div>
          <div className="space-y-1">
            {groupLabels.map(([key, label], index) => (
              <button
                key={key}
                onClick={() => changeGroup(key)}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${index > 12 ? "mt-2 border-t pt-3" : ""} ${group === key ? "bg-[#e8eee8] font-semibold text-[#193326]" : "text-slate-600 hover:bg-field"}`}
              >
                <span>{label}</span>
                <span className="text-xs text-slate-400">{counts[key] ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500"><Filter size={14} /> FILTERS</div>
          {["Created Date", "State", "County", "Acreage", "Lead Score", "Asking Price", "Status", "Motivation", "Last Activity"].map((label) => (
            <button key={label} className="mb-2 flex w-full items-center justify-between rounded border px-3 py-2 text-sm text-slate-600">
              {label}<ListFilter size={14} />
            </button>
          ))}
          <button className="mt-2 w-full rounded border border-[#193326]/20 px-3 py-2 text-sm font-semibold text-[#193326]">Advanced Filters</button>
          <button onClick={() => { setGroup("all"); setQuery(""); setSort("ai_priority"); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-[#193326] px-3 py-2 text-sm font-semibold text-white">
            <RotateCcw size={14} /> Reset Filters
          </button>
        </section>
      </aside>
      <section className="min-w-0 flex-1 p-4 sm:p-6">
        <header className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">Leads</h1>
              <p className="text-sm text-slate-500">{visible.length} leads visible</p>
            </div>
            <div className="flex rounded border bg-white p-1 text-xs font-semibold xl:hidden">
              {(["cards", "list", "pipeline"] as const).map((item) => (
                <button key={item} onClick={() => changeView(item)} className={`rounded px-3 py-2 ${view === item ? "bg-[#193326] text-white" : "text-slate-500"}`}>
                  {item.toUpperCase()}
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
            <button key={label} onClick={() => changeGroup(nextGroup)} className="rounded border border-black/10 bg-white p-4 text-left shadow-sm hover:border-[#193326]/40">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </button>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="rounded border border-dashed border-black/20 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No leads imported yet.</h2>
            <p className="mt-2 text-sm text-slate-500">
              Real SmarterContact leads will appear here after Zapier posts to the CRM import endpoint.
            </p>
          </div>
        )}
        {visible.length > 0 && view === "cards" && <LeadCardGrid leads={visible} />}
        {visible.length > 0 && view === "list" && <LeadList leads={visible} />}
        {visible.length > 0 && view === "pipeline" && <LeadPipeline leads={visible} />}
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
  const tags = [
    lead.status === "HOT" && "HOT",
    last?.direction === "RECEIVED" && "NEW REPLY",
    lead.askingPrice && "PRICE PROVIDED",
    lead.requiresHumanAttention && "ACTION REQUIRED"
  ].filter(Boolean);

  return (
    <Link href={`/leads/${lead.id}`} className="flex min-h-[520px] flex-col rounded border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{sellerName(lead)}</h2>
          <p className="text-sm text-slate-500">{lead.county} County, {lead.state}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={`Call ${sellerName(lead)}`} className="grid h-10 w-10 place-items-center rounded border text-[#193326]">
            <Phone size={17} />
          </button>
          <LeadScoreBadge score={lead.leadScore} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={lead.status} />
        {tags.map((tag) => <span key={String(tag)} className="rounded border border-[#193326]/15 bg-[#eef4ee] px-2 py-1 text-xs font-semibold text-[#193326]">{tag}</span>)}
      </div>
      <div className="mt-4 rounded border border-[#d7dfd6] bg-[#f7faf6] p-4">
        <div className="text-xs font-bold tracking-wide text-slate-500">SELLER ASKING</div>
        <div className="mt-1 text-2xl font-semibold text-[#193326]">{money(lead.askingPrice)}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Info label="Acreage" value={lead.acres?.toFixed(2) ?? "-"} />
        <Info label="County" value={lead.county ?? "-"} />
        <Info label="State" value={lead.state ?? "-"} />
        <Info label="APN" value={lead.apn ?? "-"} />
      </div>
      <div className="mt-4 rounded border border-black/10 p-3">
        <div className="text-xs font-bold tracking-wide text-slate-500">AI LEAD ANALYSIS</div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-3xl font-bold text-[#193326]">{lead.leadScore}</span>
          <span className="rounded bg-[#193326] px-2 py-1 text-xs font-semibold text-white">{priorityLabel(lead.leadScore)}</span>
        </div>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{lead.aiSummary ?? "No AI description has been generated yet."}</p>
      </div>
      <div className="mt-4 rounded border border-black/10 p-3">
        <div className="text-xs font-bold tracking-wide text-slate-500">LAST MESSAGE</div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-700">
          <b>{last?.direction === "RECEIVED" ? "Seller" : "Diego"}:</b> {last?.content ?? "No messages yet."}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock size={13} /> {relative(last?.timestamp ?? null)}</div>
      </div>
      <div className="mt-auto pt-4">
        <div className="text-xs font-bold tracking-wide text-slate-500">NEXT ACTION</div>
        <div className={`mt-1 rounded px-3 py-2 text-sm font-semibold ${lead.requiresHumanAttention ? "bg-red-50 text-red-700" : "bg-field text-[#193326]"}`}>
          {lead.requiresHumanAttention ? "ACTION REQUIRED" : lead.nextAction ?? "Review lead"}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded border px-3 py-1.5 text-xs font-semibold">Open</span>
          <span className="rounded border px-3 py-1.5 text-xs font-semibold">Conversation</span>
          <span className="rounded border px-3 py-1.5 text-xs font-semibold">Call</span>
          {lead.hasSuggestedReply && <span className="rounded border border-[#193326]/20 px-3 py-1.5 text-xs font-semibold text-[#193326]">AI Reply</span>}
        </div>
      </div>
    </Link>
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
    <div className="overflow-x-auto rounded border bg-white">
      {leads.map((lead) => (
        <Link key={lead.id} href={`/leads/${lead.id}`} className="grid min-w-[1100px] grid-cols-[70px_110px_180px_170px_130px_1fr_190px] items-center border-b px-4 py-3 text-sm hover:bg-field">
          <b>{lead.leadScore}</b>
          <StatusBadge status={lead.status} />
          <span>{sellerName(lead)}</span>
          <span>{lead.county}, {lead.state}</span>
          <span>{money(lead.askingPrice)}</span>
          <span className="truncate">{lead.aiSummary}</span>
          <span className="truncate">{lead.nextAction}</span>
        </Link>
      ))}
    </div>
  );
}

function LeadPipeline({ leads }: { leads: LeadCardData[] }) {
  const columns = ["HOT", "WARM", "FOLLOW_UP", "COLD", "DNC", "WRONG_NUMBER"];
  return (
    <div className="grid gap-4 overflow-x-auto xl:grid-cols-3 2xl:grid-cols-6">
      {columns.map((status) => (
        <div key={status} className="min-w-64 rounded border bg-white p-3">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold"><span>{status.replace("_", " ")}</span><span>{leads.filter((lead) => lead.status === status).length}</span></div>
          <div className="space-y-2">
            {leads.filter((lead) => lead.status === status).map((lead) => (
              <Link href={`/leads/${lead.id}`} key={lead.id} className="block rounded border p-3 text-sm hover:bg-field">
                <div className="font-semibold">{sellerName(lead)}</div>
                <div className="text-xs text-slate-500">{money(lead.askingPrice)} | {lead.leadScore}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
