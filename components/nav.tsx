"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, Columns3, MapPin, Settings, CheckCircle2 } from "lucide-react";
import { MobileNav } from "@/components/leads/main-sidebar";

const items = [
  ["Dashboard", "/", LayoutDashboard],
  ["Agente pipeline", "/agent", Bot],
  ["Pipeline", "/leads?view=pipeline", Columns3],
  ["Deals", "/leads", MapPin],
  ["Ready to close", "/leads?group=ready_to_close&view=pipeline", CheckCircle2],
  ["Settings", "/settings", Settings]
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/8 bg-white/95 px-5 py-7 backdrop-blur lg:block">
      <div className="mb-9 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-grove text-sm font-bold text-white shadow-sm ring-1 ring-black/5">DF</div>
        <div>
          <div className="text-sm font-semibold leading-tight tracking-tight">Sell Your Land to Diego</div>
          <div className="text-[11px] text-slate-500">Vacant land flipping CRM</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname === href || (href.startsWith("/agent") && pathname.startsWith("/agent"));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-field text-grove" : "text-slate-600 hover:bg-field hover:text-ink"
              }`}
            >
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen lg:pl-64">
      <AppNav />
      <MobileNav />
      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
