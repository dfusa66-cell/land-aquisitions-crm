import Link from "next/link";
import { BarChart3, Flame, LayoutDashboard, ListChecks, Settings, Users } from "lucide-react";

const items = [
  ["Dashboard", "/", LayoutDashboard],
  ["Leads", "/leads", Users],
  ["Hot Leads", "/leads?status=HOT", Flame],
  ["Follow Ups", "/leads?status=FOLLOW_UP", ListChecks],
  ["Settings", "/settings", Settings]
] as const;

export function AppNav() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/10 bg-white px-5 py-6 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-moss text-white"><BarChart3 size={20} /></div>
        <div>
          <div className="font-semibold">Acquisition CRM</div>
          <div className="text-xs text-slate-500">Shadow Mode V1</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map(([label, href, Icon]) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-field">
            <Icon size={17} /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen lg:pl-64">
      <AppNav />
      <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
