import Link from "next/link";
import { Shell } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  await requireUser();
  const [total, hot, warm, follow, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "HOT" } }),
    prisma.lead.count({ where: { status: "WARM" } }),
    prisma.lead.count({ where: { status: "FOLLOW_UP" } }),
    prisma.lead.findMany({ orderBy: [{ updatedAt: "desc" }], take: 6, include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } } })
  ]);
  const stats = [
    ["Total Leads", total],
    ["New Leads", total],
    ["Hot Leads", hot],
    ["Warm Leads", warm],
    ["Follow Ups", follow],
    ["Offers", 0],
    ["Contracts", 0],
    ["Closed Deals", 0]
  ];
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Prioritize seller replies from outbound land campaigns.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <section className="mt-6 rounded border border-black/10 bg-white shadow-sm">
        <div className="border-b px-4 py-3 font-semibold">Recent leads</div>
        <div className="divide-y">
          {recent.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-field">
              <StatusBadge status={lead.status} />
              <span className="font-medium">{lead.firstName} {lead.lastName}</span>
              <span className="text-sm text-slate-500">{lead.county}, {lead.state} | {lead.acres ?? "-"} acres</span>
              <span className="min-w-72 flex-1 text-sm text-slate-600">{lead.aiSummary ?? "No AI description yet."}</span>
              <span className="ml-auto text-sm text-slate-500">{lead.nextAction ?? "Review lead"}</span>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
