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
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/10 bg-white px-5 py-6 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-moss text-white text-sm font-bold">DF</div>
        <div>
          <div className="font-semibold">Sell Your Land to Diego</div>
          <div className="text-xs text-slate-500">Vacant land flipping CRM</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname === href || (href.startsWith("/agent") && pathname.startsWith("/agent"));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm font-medium ${
                active ? "bg-field text-moss" : "text-slate-700 hover:bg-field"
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
      <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
