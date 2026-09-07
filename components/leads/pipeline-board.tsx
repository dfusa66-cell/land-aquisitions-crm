"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePipelineStage } from "@/app/leads/actions";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import { PIPELINE_HINTS, PIPELINE_LABELS, PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline";

export type PipelineCard = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acres: number | null;
  county: string | null;
  state: string | null;
  apn: string | null;
  askingPrice: number | null;
  pipelineStage: PipelineStage;
  landPortalUrl: string | null;
  lpEstimate: number | null;
  estimatedProfit: number | null;
  offer40: number | null;
  offer50: number | null;
};

export function PipelineBoard({ leads }: { leads: PipelineCard[] }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function move(id: string, stage: PipelineStage) {
    setSaving(id);
    await updatePipelineStage(id, stage);
    setSaving(null);
    setDragging(null);
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const column = leads.filter((lead) => lead.pipelineStage === stage);
        const columnProfit = column.reduce((sum, lead) => sum + (lead.estimatedProfit ?? 0), 0);
        return (
          <section
            key={stage}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/lead-id") || dragging;
              if (id) void move(id, stage);
            }}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-black/10 bg-white/80 p-3"
          >
            <header className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{PIPELINE_LABELS[stage]}</h3>
                <span className="rounded-full bg-field px-2 py-0.5 text-xs text-slate-600">{column.length}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{PIPELINE_HINTS[stage]}</p>
              {columnProfit !== 0 && (
                <p className="mt-1 text-xs font-medium text-moss">{formatMoney(columnProfit)} est.</p>
              )}
            </header>
            <div className="space-y-2">
              {column.map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(event) => {
                    setDragging(lead.id);
                    event.dataTransfer.setData("text/lead-id", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className={`rounded-lg border border-black/10 bg-white p-3 shadow-sm ${saving === lead.id ? "opacity-60" : ""}`}
                >
                  <Link href={`/leads/${lead.id}`} className="block">
                    <div className="font-semibold">{sellerDisplayName(lead)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[lead.county, lead.state].filter(Boolean).join(", ") || "No county"}
                      {lead.acres != null ? ` · ${lead.acres} ac` : ""}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ask {formatMoney(lead.askingPrice)}</span>
                      <span className={lead.estimatedProfit != null && lead.estimatedProfit < 0 ? "font-semibold text-clay" : "font-semibold text-moss"}>
                        {formatMoney(lead.estimatedProfit, "No UW")}
                      </span>
                    </div>
                    {(lead.offer40 != null || lead.offer50 != null) && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        40% {formatMoney(lead.offer40)} · 50% {formatMoney(lead.offer50)}
                      </div>
                    )}
                  </Link>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusBadge status={lead.pipelineStage} />
                    <select
                      aria-label={`Move ${sellerDisplayName(lead)}`}
                      value={lead.pipelineStage}
                      onChange={(event) => void move(lead.id, event.target.value as PipelineStage)}
                      className="max-w-[120px] rounded border bg-white px-1 py-1 text-[11px]"
                    >
                      {PIPELINE_STAGES.map((item) => (
                        <option key={item} value={item}>{PIPELINE_LABELS[item]}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
              {column.length === 0 && (
                <div className="rounded-lg border border-dashed border-black/10 px-3 py-6 text-center text-xs text-slate-400">
                  Drop a deal here
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
