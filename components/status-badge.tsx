import { clsx } from "clsx";
import { PIPELINE_LABELS, isPipelineStage } from "@/lib/pipeline";
import { toTitleStatus } from "@/lib/lead-utils";

const styles: Record<string, string> = {
  LEAD_SC: "bg-sky-50 text-sky-800 ring-sky-200",
  PRECIO_ASK: "bg-amber-50 text-amber-800 ring-amber-200",
  UNDERWRITTEN: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  OFERTA_ENVIADA: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  NEGOCIACION: "bg-orange-50 text-orange-800 ring-orange-200",
  READY_TO_CLOSE: "bg-teal-50 text-teal-800 ring-teal-200",
  CERRADO: "bg-moss/15 text-moss ring-moss/30",
  DEAD: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  HOT: "bg-red-100 text-red-700 ring-red-200",
  WARM: "bg-amber-100 text-amber-800 ring-amber-200",
  FOLLOW_UP: "bg-blue-100 text-blue-700 ring-blue-200",
  COLD: "bg-slate-100 text-slate-700 ring-slate-200",
  DNC: "bg-zinc-200 text-zinc-700 ring-zinc-300",
  WRONG_NUMBER: "bg-purple-100 text-purple-700 ring-purple-200"
};

export function StatusBadge({ status }: { status: string }) {
  const label = isPipelineStage(status) ? PIPELINE_LABELS[status] : toTitleStatus(status);
  return <span className={clsx("rounded px-2 py-1 text-xs font-semibold ring-1", styles[status] ?? styles.COLD)}>{label}</span>;
}
