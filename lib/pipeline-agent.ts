import OpenAI from "openai";
import { formatMoney, sellerDisplayName } from "@/lib/lead-utils";
import {
  ACTIVE_PIPELINE_STAGES,
  PIPELINE_LABELS,
  PIPELINE_STAGES,
  resolvePipelineStage,
  type PipelineStage
} from "@/lib/pipeline";
import { dealProfit, offer40, offer50 } from "@/lib/underwriting";

export type LeadForAgent = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  acres?: number | null;
  county?: string | null;
  state?: string | null;
  apn?: string | null;
  status: string;
  leadScore?: number | null;
  askingPrice?: number | null;
  pipelineStage?: string | null;
  arvMid?: number | null;
  purchasePrice?: number | null;
  droneCost?: number | null;
  actualProfit?: number | null;
  nextAction?: string | null;
  followUpDate?: Date | string | null;
  closedAt?: Date | string | null;
  updatedAt: Date | string;
};

export type AgentDeal = {
  id: string;
  name: string;
  phone: string | null;
  acres: number | null;
  county: string | null;
  state: string | null;
  apn: string | null;
  status: string;
  pipelineStage: PipelineStage;
  pipelineLabel: string;
  leadScore: number;
  askingPrice: number | null;
  arvMid: number | null;
  offer40: number | null;
  offer50: number | null;
  profit: number | null;
  nextAction: string | null;
  followUpDate: string | null;
  closedAt: string | null;
  updatedAt: string;
};

export type PipelineSnapshot = {
  generatedAt: string;
  monthStart: string;
  totals: {
    all: number;
    active: number;
    closedThisMonth: number;
    closedAll: number;
    dead: number;
    hot: number;
    offersOut: number;
    readyToClose: number;
    needPriceOrUw: number;
    negotiation: number;
    underwritten: number;
    followUp: number;
  };
  countsByStage: Record<PipelineStage, number>;
  potentialProfit: number;
  closedProfitThisMonth: number;
  deals: AgentDeal[];
};

export type AgentIntent =
  | "overview"
  | "counts_by_stage"
  | "hot"
  | "offers_out"
  | "ready_to_close"
  | "closed_profit"
  | "potential_profit"
  | "negotiation"
  | "need_price"
  | "underwritten"
  | "dead"
  | "follow_up"
  | "active"
  | "lookup"
  | "help";

export type AgentCitation = {
  id: string;
  name: string;
  href: string;
  stage: string;
};

export type AgentAnswer = {
  text: string;
  intent: AgentIntent;
  language: "es" | "en";
  engine: "rules" | "openai";
  citations: AgentCitation[];
};

export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIso(value: Date | string | null | undefined) {
  const date = asDate(value);
  return date ? date.toISOString() : null;
}

export function toAgentDeal(lead: LeadForAgent): AgentDeal {
  const pipelineStage = resolvePipelineStage(lead);
  return {
    id: lead.id,
    name: sellerDisplayName(lead),
    phone: lead.phone ?? null,
    acres: lead.acres ?? null,
    county: lead.county ?? null,
    state: lead.state ?? null,
    apn: lead.apn ?? null,
    status: lead.status,
    pipelineStage,
    pipelineLabel: PIPELINE_LABELS[pipelineStage],
    leadScore: lead.leadScore ?? 0,
    askingPrice: lead.askingPrice ?? null,
    arvMid: lead.arvMid ?? null,
    offer40: offer40(lead.arvMid),
    offer50: offer50(lead.arvMid),
    profit: dealProfit(lead),
    nextAction: lead.nextAction ?? null,
    followUpDate: toIso(lead.followUpDate),
    closedAt: toIso(lead.closedAt),
    updatedAt: toIso(lead.updatedAt) ?? new Date().toISOString()
  };
}

export function buildPipelineSnapshot(leads: LeadForAgent[], now = new Date()): PipelineSnapshot {
  const deals = leads.map(toAgentDeal);
  const monthStart = startOfMonth(now);
  const closedThisMonth = deals.filter((deal) => {
    if (deal.pipelineStage !== "CERRADO") return false;
    const closedOn = asDate(deal.closedAt) ?? asDate(deal.updatedAt);
    return closedOn != null && closedOn >= monthStart;
  });
  const active = deals.filter((deal) => ACTIVE_PIPELINE_STAGES.includes(deal.pipelineStage));
  const countsByStage = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, deals.filter((deal) => deal.pipelineStage === stage).length])) as Record<
    PipelineStage,
    number
  >;

  return {
    generatedAt: now.toISOString(),
    monthStart: monthStart.toISOString(),
    totals: {
      all: deals.length,
      active: active.length,
      closedThisMonth: closedThisMonth.length,
      closedAll: deals.filter((deal) => deal.pipelineStage === "CERRADO").length,
      dead: deals.filter((deal) => deal.pipelineStage === "DEAD").length,
      hot: deals.filter((deal) => deal.status === "HOT").length,
      offersOut: countsByStage.OFERTA_ENVIADA,
      readyToClose: countsByStage.READY_TO_CLOSE,
      needPriceOrUw: countsByStage.LEAD_SC + countsByStage.PRECIO_ASK,
      negotiation: countsByStage.NEGOCIACION,
      underwritten: countsByStage.UNDERWRITTEN,
      followUp: deals.filter((deal) => deal.status === "FOLLOW_UP" || Boolean(deal.followUpDate)).length
    },
    countsByStage,
    potentialProfit: active.reduce((sum, deal) => sum + (deal.profit ?? 0), 0),
    closedProfitThisMonth: closedThisMonth.reduce((sum, deal) => sum + (deal.profit ?? 0), 0),
    deals
  };
}

export function detectLanguage(question: string): "es" | "en" {
  if (/[áéíóúñ¿¡]/i.test(question)) return "es";
  if (
    /\b(cu[aá]ntos?|cu[aá]ntas?|ganancia|ganancias|cerrados?|ofertas?|listos?|calientes?|etapas?|negociaci[oó]n|muertos?|activos?|potencial|este mes|resumen|dime|qui[eé]nes?|hay|ayuda|c[oó]mo|est[aá]n|vendedor|vendedores)\b/i.test(
      question
    )
  ) {
    return "es";
  }
  return "en";
}

export function detectIntent(question: string): AgentIntent {
  const q = question.toLowerCase();
  if (/\b(help|ayuda|what can you|qu[eé] puedes|qu[eé] sabes)\b/i.test(q)) return "help";
  if (/\b(closed profit|ganancia(s)? (cerrad|este mes)|profit.*(month|cerrad)|cerrad.*(mes|profit)|how much.*(close|cerr))\b/i.test(q)) {
    return "closed_profit";
  }
  if (/\b(potential|ganancia potencial|open pipeline|profit.*(active|open)|activos?.*(ganancia|profit))\b/i.test(q)) {
    return "potential_profit";
  }
  if (/\b(ready to close|listos? (para )?cerrar|ready.?close)\b/i.test(q)) return "ready_to_close";
  if (/(offers?\s+(out|sent)|ofertas?\s+enviadas?)/i.test(q)) return "offers_out";
  if (/\b(hot|calientes?)\b/i.test(q)) return "hot";
  if (/\b(negociaci[oó]n|negotiat)\b/i.test(q)) return "negotiation";
  if (/\b(underwrit)\b/i.test(q)) return "underwritten";
  if (/\b(need (price|ask|uw|underwrit)|precio\/?ask|sin precio|need underwrit|faltan? (precio|arv))\b/i.test(q)) {
    return "need_price";
  }
  if (/\b(dead|muertos?|\bdnc\b|wrong number)\b/i.test(q)) return "dead";
  if (/\b(follow.?up|seguimiento)\b/i.test(q)) return "follow_up";
  if (/\b(by stage|por etapa|counts?|cu[aá]ntos?|cu[aá]ntas?|snapshot|resumen|overview|c[oó]mo (est[aá]|va)|pipeline)\b/i.test(q)) {
    return "counts_by_stage";
  }
  if (/\b(activos?|active pipeline|open deals)\b/i.test(q)) return "active";
  return "lookup";
}

function citationsFor(deals: AgentDeal[]): AgentCitation[] {
  return deals.slice(0, 8).map((deal) => ({
    id: deal.id,
    name: deal.name,
    href: `/leads/${deal.id}`,
    stage: deal.pipelineLabel
  }));
}

function formatDealLine(deal: AgentDeal, language: "es" | "en") {
  const place = [deal.county, deal.state].filter(Boolean).join(", ") || (language === "es" ? "ubicación TBD" : "location TBD");
  const acres = deal.acres != null ? `${deal.acres} ac` : null;
  const ask = language === "es" ? `Ask ${formatMoney(deal.askingPrice)}` : `Ask ${formatMoney(deal.askingPrice)}`;
  const profit = language === "es" ? `Profit ${formatMoney(deal.profit, "falta ARV")}` : `Profit ${formatMoney(deal.profit, "needs ARV")}`;
  return `• ${deal.name} · ${deal.pipelineLabel} · ${place}${acres ? ` · ${acres}` : ""} · ${ask} · ${profit}`;
}

function listDeals(deals: AgentDeal[], language: "es" | "en") {
  if (deals.length === 0) return language === "es" ? "Ningún deal en el CRM coincide." : "No matching deals in the CRM.";
  const shown = deals.slice(0, 8);
  const extra = deals.length > shown.length ? `\n${language === "es" ? `…y ${deals.length - shown.length} más en el CRM.` : `…and ${deals.length - shown.length} more in the CRM.`}` : "";
  return `${shown.map((deal) => formatDealLine(deal, language)).join("\n")}${extra}`;
}

function stageLines(snapshot: PipelineSnapshot) {
  return PIPELINE_STAGES.map((stage) => `• ${PIPELINE_LABELS[stage]}: ${snapshot.countsByStage[stage]}`).join("\n");
}

export function retrieveDeals(question: string, snapshot: PipelineSnapshot): AgentDeal[] {
  const tokens = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9+]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter(
      (token) =>
        !new Set([
          "the",
          "and",
          "for",
          "how",
          "what",
          "who",
          "many",
          "deal",
          "deals",
          "lead",
          "leads",
          "pipeline",
          "agente",
          "about",
          "tell",
          "dame",
          "dime",
          "cual",
          "cuales",
          "quien",
          "quienes",
          "hay",
          "con",
          "por",
          "una",
          "unos",
          "este",
          "esta",
          "mes",
          "land",
          "diego"
        ]).has(token)
    );

  if (tokens.length === 0) return [];

  const scored = snapshot.deals
    .map((deal) => {
      const haystack = [deal.name, deal.county, deal.state, deal.apn, deal.phone, deal.pipelineLabel, deal.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      return { deal, hits };
    })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.deal.leadScore - a.deal.leadScore);

  return scored.map((row) => row.deal);
}

function answerForIntent(intent: AgentIntent, snapshot: PipelineSnapshot, language: "es" | "en", matches: AgentDeal[]): { text: string; citations: AgentCitation[] } {
  const t = snapshot.totals;
  const empty = snapshot.deals.length === 0;
  const emptyNote =
    language === "es"
      ? "No hay deals en el CRM todavía. Importa un lead de SmarterContact o corre `pnpm db:seed:demo` en local."
      : "There are no deals in the CRM yet. Import a SmarterContact lead or run `pnpm db:seed:demo` locally.";

  if (empty && intent !== "help") {
    return { text: emptyNote, citations: [] };
  }

  if (intent === "help") {
    const text =
      language === "es"
        ? "Soy el Agente pipeline de Sell Your Land to Diego. Pregúntame por conteos por etapa, deals HOT, ofertas enviadas, ready to close, negociación, dead, ganancia potencial o ganancia cerrada este mes. También puedo buscar un vendedor, condado o APN que ya exista en el CRM. No invento deals."
        : "I am the Sell Your Land to Diego pipeline agent. Ask for stage counts, HOT deals, offers out, ready to close, negotiation, dead, potential profit, or closed profit this month. I can also look up a seller, county, or APN that already exists in the CRM. I do not invent deals.";
    return { text, citations: [] };
  }

  if (intent === "counts_by_stage" || intent === "overview") {
    const text =
      language === "es"
        ? `Resumen del pipeline (datos reales del CRM, ${t.all} deal${t.all === 1 ? "" : "s"}):\n\n${stageLines(snapshot)}\n\nActivos: ${t.active} · HOT: ${t.hot} · Ofertas enviadas: ${t.offersOut} · Ready to close: ${t.readyToClose}\nGanancia potencial (pipeline abierto): ${formatMoney(snapshot.potentialProfit)}\nGanancia cerrada este mes (desde ${new Date(snapshot.monthStart).toLocaleDateString()}): ${formatMoney(snapshot.closedProfitThisMonth)} (${t.closedThisMonth} cerrado${t.closedThisMonth === 1 ? "" : "s"}).`
        : `Pipeline snapshot from live CRM leads (${t.all} deal${t.all === 1 ? "" : "s"}):\n\n${stageLines(snapshot)}\n\nActive: ${t.active} · HOT: ${t.hot} · Offers out: ${t.offersOut} · Ready to close: ${t.readyToClose}\nPotential profit (open pipeline): ${formatMoney(snapshot.potentialProfit)}\nClosed profit this month (since ${new Date(snapshot.monthStart).toLocaleDateString()}): ${formatMoney(snapshot.closedProfitThisMonth)} (${t.closedThisMonth} cerrado${t.closedThisMonth === 1 ? "" : "s"}).`;
    return { text, citations: citationsFor(snapshot.deals) };
  }

  const buckets: Record<Exclude<AgentIntent, "overview" | "counts_by_stage" | "help" | "lookup" | "closed_profit" | "potential_profit">, AgentDeal[]> = {
    hot: snapshot.deals.filter((deal) => deal.status === "HOT"),
    offers_out: snapshot.deals.filter((deal) => deal.pipelineStage === "OFERTA_ENVIADA"),
    ready_to_close: snapshot.deals.filter((deal) => deal.pipelineStage === "READY_TO_CLOSE"),
    negotiation: snapshot.deals.filter((deal) => deal.pipelineStage === "NEGOCIACION"),
    need_price: snapshot.deals.filter((deal) => deal.pipelineStage === "LEAD_SC" || deal.pipelineStage === "PRECIO_ASK"),
    underwritten: snapshot.deals.filter((deal) => deal.pipelineStage === "UNDERWRITTEN"),
    dead: snapshot.deals.filter((deal) => deal.pipelineStage === "DEAD"),
    follow_up: snapshot.deals.filter((deal) => deal.status === "FOLLOW_UP" || Boolean(deal.followUpDate)),
    active: snapshot.deals.filter((deal) => ACTIVE_PIPELINE_STAGES.includes(deal.pipelineStage))
  };

  if (intent === "closed_profit") {
    const closed = snapshot.deals.filter((deal) => {
      if (deal.pipelineStage !== "CERRADO") return false;
      const closedOn = asDate(deal.closedAt) ?? asDate(deal.updatedAt);
      return closedOn != null && closedOn >= new Date(snapshot.monthStart);
    });
    const text =
      language === "es"
        ? `Ganancia cerrada este mes: ${formatMoney(snapshot.closedProfitThisMonth)} · ${t.closedThisMonth} deal${t.closedThisMonth === 1 ? "" : "s"} desde ${new Date(snapshot.monthStart).toLocaleDateString()}.\n\n${listDeals(closed, language)}\n\nEstos números salen de actualProfit o de mid ARV − compra − drone − brokerless − 3% buyer’s agent − ambos closings.`
        : `Closed profit this month: ${formatMoney(snapshot.closedProfitThisMonth)} · ${t.closedThisMonth} deal${t.closedThisMonth === 1 ? "" : "s"} since ${new Date(snapshot.monthStart).toLocaleDateString()}.\n\n${listDeals(closed, language)}\n\nFigures use actualProfit when set, otherwise mid ARV minus purchase, drone, brokerless, 3% buyer’s agent, and both closings.`;
    return { text, citations: citationsFor(closed) };
  }

  if (intent === "potential_profit") {
    const active = buckets.active;
    const text =
      language === "es"
        ? `Ganancia potencial en pipeline abierto: ${formatMoney(snapshot.potentialProfit)} · ${t.active} deal${t.active === 1 ? "" : "s"} activos (no incluye Cerrado ni Dead).\n\n${listDeals(active, language)}`
        : `Potential profit in the open pipeline: ${formatMoney(snapshot.potentialProfit)} · ${t.active} active deal${t.active === 1 ? "" : "s"} (excludes Cerrado and Dead).\n\n${listDeals(active, language)}`;
    return { text, citations: citationsFor(active) };
  }

  if (intent !== "lookup") {
    const deals = buckets[intent];
    const labels: Record<typeof intent, [string, string]> = {
      hot: [`${t.hot} deal${t.hot === 1 ? "" : "s"} HOT (clasificación AI del CRM):`, `${t.hot} HOT deal${t.hot === 1 ? "" : "s"} (CRM AI status):`],
      offers_out: [`${t.offersOut} oferta${t.offersOut === 1 ? "" : "s"} enviada${t.offersOut === 1 ? "" : "s"}:`, `${t.offersOut} offer${t.offersOut === 1 ? "" : "s"} out:`],
      ready_to_close: [`${t.readyToClose} ready to close:`, `${t.readyToClose} ready to close:`],
      negotiation: [`${t.negotiation} en Negociación:`, `${t.negotiation} in Negociación:`],
      need_price: [`${t.needPriceOrUw} deal${t.needPriceOrUw === 1 ? "" : "s"} en Lead SC o Precio/Ask:`, `${t.needPriceOrUw} deal${t.needPriceOrUw === 1 ? "" : "s"} in Lead SC or Precio/Ask:`],
      underwritten: [`${t.underwritten} underwritten:`, `${t.underwritten} underwritten:`],
      dead: [`${t.dead} Dead (DNC, wrong number o no deal):`, `${t.dead} Dead (DNC, wrong number, or no deal):`],
      follow_up: [`${t.followUp} con follow-up / FOLLOW_UP:`, `${t.followUp} with follow-up / FOLLOW_UP:`],
      active: [`${t.active} deals activos:`, `${t.active} active deals:`]
    };
    const heading = language === "es" ? labels[intent][0] : labels[intent][1];
    return { text: `${heading}\n\n${listDeals(deals, language)}`, citations: citationsFor(deals) };
  }

  if (matches.length > 0) {
    const text =
      language === "es"
        ? `Encontré ${matches.length} deal${matches.length === 1 ? "" : "s"} en el CRM que coinciden:\n\n${listDeals(matches, language)}`
        : `Found ${matches.length} CRM deal${matches.length === 1 ? "" : "s"} that match:\n\n${listDeals(matches, language)}`;
    return { text, citations: citationsFor(matches) };
  }

  const text =
    language === "es"
      ? `No encontré ese vendedor, condado o APN en el CRM. Puedo responder solo con leads reales.\n\n${t.all} deals en total. Pregunta por etapas, HOT, ofertas enviadas, ready to close o ganancia.`
      : `I could not find that seller, county, or APN in the CRM. I only answer from real leads.\n\n${t.all} deals total. Ask about stages, HOT, offers out, ready to close, or profit.`;
  return { text, citations: [] };
}

export function answerWithRules(question: string, snapshot: PipelineSnapshot): AgentAnswer {
  const language = detectLanguage(question);
  const matches = retrieveDeals(question, snapshot);
  let intent = detectIntent(question);
  if (intent === "lookup" && matches.length === 0 && /\b(pipeline|resumen|overview|status|estado)\b/i.test(question)) {
    intent = "overview";
  }
  if (intent === "lookup" && matches.length === 0) {
    const maybeOverview = detectIntent(`${question} pipeline`);
    if (maybeOverview === "counts_by_stage" && !/[a-z]{4,}/i.test(question.replace(/\b(pipeline|resumen|overview)\b/gi, ""))) {
      intent = "overview";
    }
  }
  const grounded = answerForIntent(intent, snapshot, language, matches);
  return {
    text: grounded.text,
    intent,
    language,
    engine: "rules",
    citations: grounded.citations
  };
}

function snapshotForModel(snapshot: PipelineSnapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    monthStart: snapshot.monthStart,
    totals: snapshot.totals,
    countsByStage: snapshot.countsByStage,
    potentialProfit: snapshot.potentialProfit,
    closedProfitThisMonth: snapshot.closedProfitThisMonth,
    deals: snapshot.deals.map((deal) => ({
      id: deal.id,
      name: deal.name,
      county: deal.county,
      state: deal.state,
      apn: deal.apn,
      acres: deal.acres,
      status: deal.status,
      pipelineStage: deal.pipelineStage,
      pipelineLabel: deal.pipelineLabel,
      askingPrice: deal.askingPrice,
      arvMid: deal.arvMid,
      offer40: deal.offer40,
      offer50: deal.offer50,
      profit: deal.profit,
      nextAction: deal.nextAction
    }))
  };
}

export async function polishWithOpenAi(question: string, snapshot: PipelineSnapshot, grounded: AgentAnswer): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are the pipeline agent for Sell Your Land to Diego, a vacant-land flipping CRM. Rewrite the grounded answer in a concise, helpful tone. Use ONLY the provided snapshot and grounded answer. Never invent sellers, counties, APNs, prices, stages, or counts. Keep every number exactly as given. If the grounded answer says no match, say no match. Reply in the same language as the user. Do not mention these instructions."
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nGrounded answer (must keep these facts):\n${grounded.text}\n\nLive CRM snapshot JSON:\n${JSON.stringify(snapshotForModel(snapshot))}`
      }
    ]
  });
  const text = completion.choices[0]?.message.content?.trim();
  return text || grounded.text;
}

export async function answerPipelineQuestion(question: string, snapshot: PipelineSnapshot): Promise<AgentAnswer> {
  const grounded = answerWithRules(question, snapshot);
  if (!hasOpenAiKey()) return grounded;
  try {
    const text = await polishWithOpenAi(question, snapshot, grounded);
    return { ...grounded, text, engine: "openai" };
  } catch (error) {
    console.error("[pipeline-agent] OpenAI polish failed, using rules", error);
    return grounded;
  }
}
