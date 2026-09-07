"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { askPipelineAgent } from "@/app/agent/actions";
import { formatMoney } from "@/lib/lead-utils";
import { PIPELINE_LABELS, PIPELINE_STAGES } from "@/lib/pipeline";
import type { AgentAnswer, PipelineSnapshot } from "@/lib/pipeline-agent";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: AgentAnswer;
};

const SUGGESTIONS_ES = [
  "¿Cuántos deals hay por etapa?",
  "¿Cuáles están calientes?",
  "Ofertas enviadas",
  "Ready to close",
  "Ganancia cerrada este mes",
  "Ganancia potencial"
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PipelineAgentChat({
  snapshot,
  engineReady
}: {
  snapshot: PipelineSnapshot;
  engineReady: "rules" | "openai";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        snapshot.deals.length === 0
          ? "Hola Diego. Soy el Agente pipeline de Sell Your Land to Diego. Aún no hay leads en el CRM, así que no puedo inventar deals. Importa un lead o pregunta de nuevo cuando haya datos."
          : `Hola Diego. Soy el Agente pipeline de Sell Your Land to Diego. Hay ${snapshot.totals.all} deal${snapshot.totals.all === 1 ? "" : "s"} reales en el CRM. Pregúntame por etapas, HOT, ofertas enviadas, ready to close o profit. No invento vendedores.`
    }
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setError(null);
    setInput("");
    const userId = newId();
    setMessages((current) => [...current, { id: userId, role: "user", text: trimmed }]);
    startTransition(async () => {
      const result = await askPipelineAgent(trimmed);
      if ("error" in result) {
        setError(result.error);
        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            text: result.error
          }
        ]);
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "assistant",
          text: result.text,
          answer: result
        }
      ]);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Snapshot en vivo</div>
          <dl className="mt-3 space-y-2 text-sm">
            <Stat label="Activos" value={snapshot.totals.active} />
            <Stat label="HOT" value={snapshot.totals.hot} />
            <Stat label="Ofertas enviadas" value={snapshot.totals.offersOut} />
            <Stat label="Ready to close" value={snapshot.totals.readyToClose} />
            <Stat label="Ganancia potencial" value={formatMoney(snapshot.potentialProfit)} />
            <Stat label="Cerrado este mes" value={formatMoney(snapshot.closedProfitThisMonth)} />
          </dl>
        </section>
        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Por etapa</div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {PIPELINE_STAGES.map((stage) => (
              <li key={stage} className="flex items-center justify-between gap-3">
                <span className="text-slate-600">{PIPELINE_LABELS[stage]}</span>
                <span className="font-semibold">{snapshot.countsByStage[stage]}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-moss text-white">
              <Bot size={16} />
            </span>
            Agente pipeline
          </div>
          <span className="rounded-full bg-field px-3 py-1 text-xs font-semibold text-slate-600">
            {engineReady === "openai" ? "OpenAI + datos del CRM" : "Modo local · solo leads reales"}
          </span>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[42rem] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === "user" ? "bg-[#10241b] text-white" : "bg-field text-ink"
                }`}
              >
                {message.text}
                {message.answer?.citations.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.answer.citations.map((citation) => (
                      <Link
                        key={citation.id}
                        href={citation.href}
                        className="rounded-full border border-moss/20 bg-white px-2.5 py-1 text-xs font-semibold text-moss hover:border-moss/50"
                      >
                        {citation.name} · {citation.stage}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.answer?.engine ? (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                    <Sparkles size={11} />
                    {message.answer.engine === "openai" ? "Redactado con OpenAI sobre números del CRM" : "Respuesta anclada a Prisma / leads"}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} /> Consultando leads en vivo…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-black/10 px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS_ES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                disabled={pending}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-moss/40 hover:text-moss disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pregunta por tu pipeline… counts, HOT, ofertas, close, profit"
              className="h-12 flex-1 rounded-xl border border-black/10 px-4 text-sm shadow-sm outline-none focus:border-moss/50"
              maxLength={500}
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="grid h-12 w-12 place-items-center rounded-xl bg-moss text-white disabled:opacity-50"
              aria-label="Enviar pregunta"
            >
              {pending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
