"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCheck, Copy, MessageSquareText, Sparkles } from "lucide-react";
import { markSent, prepareDraft, recordDraftCopied } from "@/app/leads/[id]/actions";
import { formatPhoneDisplay } from "@/lib/lead-utils";

export type ThreadMessage = {
  id: string;
  content: string;
  direction: string;
  timestamp: string | null;
  source: string;
};

function dayLabel(iso: string | null) {
  if (!iso) return "Undated";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function groupMessages(messages: ThreadMessage[]) {
  const groups: { label: string; items: ThreadMessage[] }[] = [];
  for (const message of messages) {
    const label = dayLabel(message.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(message);
    else groups.push({ label, items: [message] });
  }
  return groups;
}

export function SmsThread({
  leadId,
  sellerName,
  phone,
  suggestedReply,
  suggestionId,
  markedSentAt,
  messages
}: {
  leadId: string;
  sellerName: string;
  phone: string | null;
  suggestedReply: string;
  suggestionId: string | null;
  markedSentAt: string | null;
  messages: ThreadMessage[];
}) {
  const [draft, setDraft] = useState(suggestedReply);
  const [suggestion, setSuggestion] = useState(suggestionId);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(markedSentAt ? "Last reply marked sent in the CRM. SmarterContact was not called." : null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupMessages(messages), [messages]);
  const displayPhone = formatPhoneDisplay(phone);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    setDraft(suggestedReply);
    setSuggestion(suggestionId);
  }, [suggestedReply, suggestionId]);

  function onPrepareDraft() {
    startTransition(async () => {
      setStatus(null);
      if (suggestedReply) {
        setDraft(suggestedReply);
        setStatus("Draft loaded from the latest AI suggestion.");
        return;
      }
      const result = await prepareDraft(leadId);
      setDraft(result.draft);
      setSuggestion(result.suggestionId);
      setStatus(result.engine === "saved" ? "Draft loaded from the latest analysis." : `Draft prepared (${result.engine === "openai" ? "OpenAI" : "rule-based"}).`);
    });
  }

  async function onCopy() {
    const text = draft.trim();
    if (!text) {
      setStatus("Write or prepare a draft first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setStatus("Copied. Paste into SmarterContact — the CRM does not send SMS.");
      if (suggestion) await recordDraftCopied(leadId, suggestion);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus("Could not copy. Select the draft and copy it manually.");
    }
  }

  return (
    <section className="flex min-h-[650px] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/10 bg-gradient-to-r from-grove to-moss px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">SmarterContact SMS</div>
            <h2 className="text-lg font-semibold leading-tight">{sellerName}</h2>
            <p className="text-sm text-white/80" data-sc-phone={phone ?? ""}>
              {displayPhone} · {messages.length} message{messages.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            Thread
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[#e8eee6] p-4">
        {messages.length === 0 ? (
          <div className="grid h-full min-h-[280px] place-items-center text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-moss shadow-sm">
                <MessageSquareText size={22} />
              </div>
              <p className="font-semibold">No SmarterContact messages yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Sync the SMS history with <code className="rounded bg-white px-1">POST /api/messages/import</code>, then it will show here like a phone thread.
              </p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex justify-center">
                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                  {group.label}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((message) => {
                  const sent = message.direction === "SENT";
                  return (
                    <div key={message.id} className={sent ? "ml-auto max-w-[82%]" : "mr-auto max-w-[82%]"}>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                          sent ? "rounded-br-md bg-moss text-white" : "rounded-bl-md bg-white text-ink"
                        }`}
                      >
                        <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${sent ? "text-white/70" : "text-slate-400"}`}>
                          {sent ? "Diego" : "Seller"}
                        </div>
                        {message.content}
                      </div>
                      <div className={`mt-1 flex items-center gap-2 text-[11px] text-slate-500 ${sent ? "justify-end" : ""}`}>
                        <span>{timeLabel(message.timestamp)}</span>
                        <span className="rounded-full bg-white/70 px-1.5 py-0.5">{message.source || "SmarterContact"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-black/10 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="sc-draft" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reply for SmarterContact
          </label>
          <span className="text-[11px] text-slate-400">CRM does not send SMS</span>
        </div>
        <textarea
          id="sc-draft"
          data-sc-draft
          data-sc-phone={phone ?? ""}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Prepare a draft, copy it, then paste into SmarterContact…"
          className="h-28 w-full rounded-xl border border-black/10 bg-field px-3 py-2 text-sm leading-6 text-ink outline-none ring-moss/30 focus:ring-2"
        />
        {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrepareDraft}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-moss/20 bg-field px-3 py-2 text-sm font-semibold text-grove hover:bg-moss/10 disabled:opacity-60"
          >
            <Sparkles size={15} /> Prepare draft
          </button>
          <button
            type="button"
            data-sc-copy
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-field"
          >
            <Copy size={15} /> {copied ? "Copied" : "Copy for SmarterContact"}
          </button>
          <form
            action={markSent.bind(null, suggestion, leadId)}
            onSubmit={() => setStatus("Marked sent in the CRM thread. Send still happens in SmarterContact.")}
          >
            <input type="hidden" name="draft" value={draft} />
            <button
              type="submit"
              data-sc-mark-sent
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink/90"
            >
              <CheckCheck size={15} /> Mark sent
            </button>
          </form>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          Agent hook: read <code>[data-sc-draft]</code> and paste in the SmarterContact browser. After Diego confirms the send, Mark sent (or re-import the outbound SMS).
        </p>
      </div>
    </section>
  );
}
