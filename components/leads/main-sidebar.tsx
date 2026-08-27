"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Flame,
  Inbox,
  LayoutDashboard,
  Map,
  PieChart,
  Settings,
  UserCircle,
  Users
} from "lucide-react";

const nav = [
  ["Dashboard", "/", LayoutDashboard],
  ["Inbox", "/leads?group=new_replies", Inbox],
  ["Leads", "/leads", Users],
  ["Hot Leads", "/leads?group=hot", Flame],
  ["Follow Ups", "/leads?group=follow_up", CalendarDays],
  ["Offers", "/leads?group=offers", Briefcase],
  ["Contracts", "/leads?group=contracts", FileSignature],
  ["Deals", "/leads?group=closed", BarChart3],
  ["Deal Finder", "/leads?group=all", Map],
  ["Planner", "/leads?group=follow_up", CalendarDays],
  ["Analytics", "/leads?group=all", PieChart]
] as const;

export function MainSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`hidden min-h-screen shrink-0 bg-[#10241b] text-white lg:flex lg:flex-col ${collapsed ? "w-20" : "w-64"}`}>
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <div>
            <div className="font-semibold">Acquisition CRM</div>
            <div className="text-xs text-white/55">Land deals command center</div>
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
          const active = label === "Leads";
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
