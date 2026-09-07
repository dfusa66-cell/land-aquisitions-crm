import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/lead-utils";
import { refreshAnalysis, replyFeedback } from "@/app/leads/[id]/actions";
import { PendingButton } from "@/components/leads/pending-button";

type Analysis = {
  id: string;
  classification: string;
  leadScore: number;
  sellerInterest: string;
  motivation: string;
  sentiment: string;
  askingPrice: number | null;
  negotiationStage: string;
  summary: string;
  nextAction: string;
  suggestedReply: string;
  requiresHumanAttention: boolean;
  reasoningSummary: string;
  createdAt: Date;
};

type Suggestion = {
  id: string;
  feedback: string | null;
  copiedAt: Date | null;
  markedSentAt: Date | null;
};

export function AiAnalysisPanel({
  leadId,
  leadScore,
  status,
  aiSummary,
  nextAction,
  motivation,
  sellerInterest,
  sentiment,
  askingPrice,
  negotiationStage,
  analysis,
  suggestion,
  hasOpenAi
}: {
  leadId: string;
  leadScore: number;
  status: string;
  aiSummary: string | null;
  nextAction: string | null;
  motivation: string | null;
  sellerInterest: string | null;
  sentiment: string | null;
  askingPrice: number | null;
  negotiationStage: string | null;
  analysis: Analysis | null;
  suggestion: Suggestion | null;
  hasOpenAi: boolean;
}) {
  const summary = analysis?.summary ?? aiSummary;
  const action = analysis?.nextAction ?? nextAction;
  const motive = analysis?.motivation ?? motivation;

  return (
    <aside className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI Deal Brain</h2>
          <p className="text-[11px] text-slate-500">
            {analysis
              ? `Latest analysis · ${analysis.createdAt.toLocaleString()}`
              : "No analysis row yet — refresh from the SMS thread."}
          </p>
        </div>
        <form action={refreshAnalysis.bind(null, leadId)}>
          <PendingButton
            pendingLabel="Scoring…"
            className="inline-flex items-center gap-1.5 rounded-lg border border-moss/20 bg-field px-3 py-1.5 text-xs font-semibold text-grove hover:bg-moss/10"
          >
            <RefreshCw size={13} /> Refresh analysis
          </PendingButton>
        </form>
      </div>

      {analysis?.requiresHumanAttention && (
        <div className="mb-3 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} /> Human review required before using this reply.
        </div>
      )}

      <div className="mb-3 rounded bg-ink p-4 text-white">
        <div className="text-sm opacity-70">Lead Score</div>
        <div className="text-3xl font-semibold">{leadScore} / 100</div>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
          {hasOpenAi ? "OpenAI when key is set" : "Rule-based fallback (no OPENAI_API_KEY)"}
        </div>
      </div>

      <div className="mb-4 rounded border border-moss/20 bg-field p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">AI summary</div>
        <div className="mt-1 text-sm leading-6">{summary ?? "No AI description has been generated yet."}</div>
      </div>

      {[
        ["Classification", analysis?.classification ?? status],
        ["Seller Interest", analysis?.sellerInterest ?? sellerInterest],
        ["Motivation", motive],
        ["Sentiment", analysis?.sentiment ?? sentiment],
        ["Asking Price", (analysis?.askingPrice ?? askingPrice) != null ? formatMoney(analysis?.askingPrice ?? askingPrice) : "-"],
        ["Negotiation Stage", analysis?.negotiationStage ?? negotiationStage],
        ["Next Action", action],
        ["AI Notes", analysis?.reasoningSummary]
      ].map(([label, value]) => (
        <div key={label} className="mb-3">
          <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
          <div className="text-sm">{value ?? "-"}</div>
        </div>
      ))}

      {suggestion && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Shadow Mode Feedback</div>
          <div className="flex gap-2">
            {(["CORRECT", "ALMOST", "WRONG"] as const).map((value) => (
              <form key={value} action={replyFeedback.bind(null, suggestion.id, leadId, value)}>
                <button className={`rounded border px-3 py-1.5 text-xs font-semibold hover:bg-field ${suggestion.feedback === value ? "border-moss bg-field text-grove" : ""}`}>
                  {value}
                </button>
              </form>
            ))}
          </div>
          {(suggestion.copiedAt || suggestion.markedSentAt) && (
            <p className="mt-2 text-[11px] text-slate-500">
              {suggestion.copiedAt ? `Copied ${suggestion.copiedAt.toLocaleString()}. ` : ""}
              {suggestion.markedSentAt ? `Marked sent ${suggestion.markedSentAt.toLocaleString()}.` : ""}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
