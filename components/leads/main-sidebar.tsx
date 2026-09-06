"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Columns3,
  CircleOff,
  LayoutDashboard,
  MapPin,
  Settings,
  UserCircle
} from "lucide-react";

const nav = [
  ["Dashboard", "/", LayoutDashboard],
  ["Pipeline", "/leads?view=pipeline", Columns3],
  ["All deals", "/leads?group=all&view=pipeline", MapPin],
  ["Ready to close", "/leads?group=ready_to_close&view=pipeline", CheckCircle2],
  ["Closed / Dead", "/leads?group=closed&view=pipeline", CircleOff]
] as const;

export function MainSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const group = params.get("group");
  const view = params.get("view");

  return (
    <aside className={`hidden min-h-screen shrink-0 bg-[#10241b] text-white lg:flex lg:flex-col ${collapsed ? "w-20" : "w-64"}`}>
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <div>
            <div className="font-semibold leading-tight">Sell Your Land</div>
            <div className="text-xs text-white/55">to Diego</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="grid h-9 w-9 place-items-center rounded border border-white/10 text-white/75 hover:bg-white/10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map(([label, href, Icon]) => {
          const url = new URL(href, "http://local");
          const active =
            (href === "/" && pathname === "/") ||
            (href.startsWith("/leads") && pathname === "/leads" && (
              (url.searchParams.get("group") && url.searchParams.get("group") === group) ||
              (!url.searchParams.get("group") && href.includes("view=pipeline") && view === "pipeline" && !group) ||
              (href === "/leads?group=all&view=pipeline" && (group === "all" || (!group && view !== "pipeline")))
            ));
          return (
            <Link
              key={label}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium ${
                active ? "bg-white text-[#10241b]" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link href="/settings" className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10">
          <Settings size={18} /> {!collapsed && <span>Settings</span>}
        </Link>
        <div className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-white/75">
          <UserCircle size={18} /> {!collapsed && <span>Diego</span>}
        </div>
      </div>
    </aside>
  );
}
