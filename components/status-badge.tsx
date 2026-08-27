import { clsx } from "clsx";
import { toTitleStatus } from "@/lib/lead-utils";

const styles: Record<string, string> = {
  HOT: "bg-red-100 text-red-700 ring-red-200",
  WARM: "bg-amber-100 text-amber-800 ring-amber-200",
  FOLLOW_UP: "bg-blue-100 text-blue-700 ring-blue-200",
  COLD: "bg-slate-100 text-slate-700 ring-slate-200",
  DNC: "bg-zinc-200 text-zinc-700 ring-zinc-300",
  WRONG_NUMBER: "bg-purple-100 text-purple-700 ring-purple-200"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={clsx("rounded px-2 py-1 text-xs font-semibold ring-1", styles[status] ?? styles.COLD)}>{toTitleStatus(status)}</span>;
}
