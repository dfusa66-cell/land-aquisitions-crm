import { formatDbError, isMissingColumnError } from "@/lib/db-errors";
import { parseMoney } from "@/lib/lead-utils";
import type { SafeLoad } from "@/lib/leads-query";
import { prisma } from "@/lib/prisma";
import type { PipelineStage } from "@/lib/pipeline";

export const DIEGO_PNL_DEFAULTS = {
  netProfitAllTime: 207090,
  landProfitClosed: 182000,
  coachingIncome: 25000,
  affiliateIncome: 18090,
  scAffiliateIncome: 7000,
  landPortalAffiliateIncome: 11090,
  marketingSpend: 18000,
  pipelineProjected: 26000,
  note: "Aug 2025–Sep 2026",
  updatedAt: null as Date | null
};

export type BusinessMetricsValues = typeof DIEGO_PNL_DEFAULTS;

/** Inventory Diego is already in: bought, under contract, or about to sell. */
export const PROJECTED_PROFIT_STAGES: PipelineStage[] = ["READY_TO_CLOSE"];

export type ProfitLead = {
  pipelineStage?: string | null;
  actualProfit?: number | null;
  profit?: number | null;
  purchasePrice?: number | null;
  askingPrice?: number | null;
  arvMid?: number | null;
  nextAction?: string | null;
  underwritingPackNote?: string | null;
  aiSummary?: string | null;
};

export function computeAffiliateIncome(input: {
  affiliateIncome?: number | null;
  scAffiliateIncome?: number | null;
  landPortalAffiliateIncome?: number | null;
}) {
  const sc = input.scAffiliateIncome ?? 0;
  const portal = input.landPortalAffiliateIncome ?? 0;
  const fromSources = sc + portal;
  if (fromSources > 0) return fromSources;
  return input.affiliateIncome ?? 0;
}

export function computeNetProfit(input: {
  landProfitClosed?: number | null;
  coachingIncome?: number | null;
  affiliateIncome?: number | null;
  scAffiliateIncome?: number | null;
  landPortalAffiliateIncome?: number | null;
  marketingSpend?: number | null;
}) {
  const affiliate = computeAffiliateIncome(input);
  return (input.landProfitClosed ?? 0) + (input.coachingIncome ?? 0) + affiliate - (input.marketingSpend ?? 0);
}

export function parseProfitHint(...notes: Array<string | null | undefined>) {
  for (const note of notes) {
    if (!note) continue;
    const match = note.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*(?:k\b)?/i);
    if (!match) continue;
    const raw = match[1].replace(/,/g, "");
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (/k\b/i.test(match[0]) && value < 1000) return value * 1000;
    if (value >= 1000) return value;
  }
  return null;
}

export function looksUnderContract(lead: ProfitLead) {
  const stage = lead.pipelineStage;
  if (stage === "UNDER_CONTRACT" || (stage && PROJECTED_PROFIT_STAGES.includes(stage as PipelineStage))) {
    return true;
  }
  const blob = [lead.pipelineStage, lead.nextAction, lead.underwritingPackNote, lead.aiSummary].filter(Boolean).join(" ");
  return /under[_\s-]?contract|\balready bought\b|\bbought \/|\babout to sell\b/i.test(blob);
}

export function isPossiblePipelineDeal(lead: ProfitLead) {
  const stage = lead.pipelineStage;
  if (stage === "CERRADO" || stage === "DEAD") return false;
  return !looksUnderContract(lead);
}

/** Exit profit for inventory Diego already owns or has under contract. */
export function inventoryDealProfit(lead: ProfitLead) {
  if (lead.actualProfit != null && Number.isFinite(lead.actualProfit)) {
    return lead.actualProfit;
  }
  const hinted = parseProfitHint(lead.nextAction, lead.underwritingPackNote, lead.aiSummary);
  if (hinted != null) return hinted;
  if (lead.profit != null && Number.isFinite(lead.profit)) return lead.profit;
  const purchase = lead.purchasePrice;
  const sale = lead.askingPrice ?? lead.arvMid;
  if (purchase != null && Number.isFinite(purchase) && sale != null && Number.isFinite(sale)) {
    return sale - purchase;
  }
  return 0;
}

export function inventoryLeads<T extends ProfitLead>(leads: T[]) {
  return leads.filter(looksUnderContract);
}

export function possiblePipelineLeads<T extends ProfitLead>(leads: T[]) {
  return leads.filter(isPossiblePipelineDeal);
}

export function projectedPipelineProfit(leads: ProfitLead[], fallback = DIEGO_PNL_DEFAULTS.pipelineProjected) {
  const sum = inventoryLeads(leads).reduce((total, lead) => total + inventoryDealProfit(lead), 0);
  return sum > 0 ? sum : fallback;
}

export function possiblePipelineProfit(leads: ProfitLead[]) {
  return possiblePipelineLeads(leads).reduce((total, lead) => total + (lead.profit ?? 0), 0);
}

function parseAffiliateSplit(note: string | null | undefined) {
  if (!note) return null;
  const sc = note.match(/SC(?:\s+affiliate)?[:\s]+\$?([0-9,]+)/i);
  const portal = note.match(/Land Portal(?:\s+affiliate)?[:\s]+\$?([0-9,]+)/i);
  if (!sc && !portal) return null;
  return {
    scAffiliateIncome: sc ? Number(sc[1].replace(/,/g, "")) : DIEGO_PNL_DEFAULTS.scAffiliateIncome,
    landPortalAffiliateIncome: portal ? Number(portal[1].replace(/,/g, "")) : DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome
  };
}

export function normalizeBusinessMetrics(input: Partial<BusinessMetricsValues> | null | undefined): BusinessMetricsValues {
  const fromNote = parseAffiliateSplit(input?.note);
  const sc = input?.scAffiliateIncome ?? fromNote?.scAffiliateIncome ?? DIEGO_PNL_DEFAULTS.scAffiliateIncome;
  const portal = input?.landPortalAffiliateIncome ?? fromNote?.landPortalAffiliateIncome ?? DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome;
  const affiliate = computeAffiliateIncome({
    affiliateIncome: input?.affiliateIncome ?? DIEGO_PNL_DEFAULTS.affiliateIncome,
    scAffiliateIncome: input?.scAffiliateIncome ?? fromNote?.scAffiliateIncome ?? null,
    landPortalAffiliateIncome: input?.landPortalAffiliateIncome ?? fromNote?.landPortalAffiliateIncome ?? null
  }) || (input?.affiliateIncome ?? DIEGO_PNL_DEFAULTS.affiliateIncome);
  const landProfitClosed = input?.landProfitClosed ?? DIEGO_PNL_DEFAULTS.landProfitClosed;
  const coachingIncome = input?.coachingIncome ?? DIEGO_PNL_DEFAULTS.coachingIncome;
  const marketingSpend = input?.marketingSpend ?? DIEGO_PNL_DEFAULTS.marketingSpend;
  const computedNet = computeNetProfit({
    landProfitClosed,
    coachingIncome,
    affiliateIncome: affiliate,
    marketingSpend
  });

  return {
    netProfitAllTime: input?.netProfitAllTime ?? computedNet,
    landProfitClosed,
    coachingIncome,
    affiliateIncome: affiliate,
    scAffiliateIncome: sc,
    landPortalAffiliateIncome: portal,
    marketingSpend,
    pipelineProjected: input?.pipelineProjected ?? DIEGO_PNL_DEFAULTS.pipelineProjected,
    note: input?.note?.trim() || DIEGO_PNL_DEFAULTS.note,
    updatedAt: input?.updatedAt ?? null
  };
}

export function metricsFromFormData(formData: FormData): BusinessMetricsValues {
  const sc = parseMoney(formData.get("scAffiliateIncome")) ?? DIEGO_PNL_DEFAULTS.scAffiliateIncome;
  const portal = parseMoney(formData.get("landPortalAffiliateIncome")) ?? DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome;
  const affiliate =
    computeAffiliateIncome({ scAffiliateIncome: sc, landPortalAffiliateIncome: portal }) ||
    parseMoney(formData.get("affiliateIncome")) ||
    DIEGO_PNL_DEFAULTS.affiliateIncome;
  const landProfitClosed = parseMoney(formData.get("landProfitClosed")) ?? DIEGO_PNL_DEFAULTS.landProfitClosed;
  const coachingIncome = parseMoney(formData.get("coachingIncome")) ?? DIEGO_PNL_DEFAULTS.coachingIncome;
  const marketingSpend = parseMoney(formData.get("marketingSpend")) ?? DIEGO_PNL_DEFAULTS.marketingSpend;
  const computedNet = computeNetProfit({
    landProfitClosed,
    coachingIncome,
    affiliateIncome: affiliate,
    marketingSpend
  });
  const explicitNet = parseMoney(formData.get("netProfitAllTime"));
  const period = String(formData.get("note") ?? formData.get("periodLabel") ?? DIEGO_PNL_DEFAULTS.note);

  return normalizeBusinessMetrics({
    netProfitAllTime: explicitNet ?? computedNet,
    landProfitClosed,
    coachingIncome,
    affiliateIncome: affiliate,
    scAffiliateIncome: sc,
    landPortalAffiliateIncome: portal,
    marketingSpend,
    pipelineProjected: parseMoney(formData.get("pipelineProjected")) ?? parseMoney(formData.get("pipelineProjectedProfit")) ?? DIEGO_PNL_DEFAULTS.pipelineProjected,
    note: period
  });
}

function persistableMetrics(input: BusinessMetricsValues) {
  const values = normalizeBusinessMetrics(input);
  return {
    netProfitAllTime: values.netProfitAllTime,
    landProfitClosed: values.landProfitClosed,
    coachingIncome: values.coachingIncome,
    affiliateIncome: values.affiliateIncome,
    marketingSpend: values.marketingSpend,
    pipelineProjected: values.pipelineProjected,
    note: values.note
  };
}

function toValues(row: {
  netProfitAllTime: number;
  landProfitClosed: number;
  coachingIncome: number;
  affiliateIncome: number;
  marketingSpend: number;
  pipelineProjected: number | null;
  note: string | null;
  updatedAt: Date;
}): BusinessMetricsValues {
  return normalizeBusinessMetrics({
    ...row,
    pipelineProjected: row.pipelineProjected ?? DIEGO_PNL_DEFAULTS.pipelineProjected,
    note: row.note ?? DIEGO_PNL_DEFAULTS.note
  });
}

export async function loadBusinessMetrics(): Promise<SafeLoad<BusinessMetricsValues>> {
  try {
    const existing = await prisma.businessMetrics.findUnique({ where: { id: "default" } });
    if (existing) {
      return { data: toValues(existing), schemaDrift: false, dbError: null };
    }
    const created = await prisma.businessMetrics.create({
      data: { id: "default", ...persistableMetrics(DIEGO_PNL_DEFAULTS) }
    });
    return { data: toValues(created), schemaDrift: false, dbError: null };
  } catch (error) {
    if (isMissingColumnError(error)) {
      return { data: normalizeBusinessMetrics(DIEGO_PNL_DEFAULTS), schemaDrift: true, dbError: null };
    }
    console.error("[business-metrics]", error);
    return { data: normalizeBusinessMetrics(DIEGO_PNL_DEFAULTS), schemaDrift: false, dbError: formatDbError(error) };
  }
}

export async function saveBusinessMetricsValues(input: BusinessMetricsValues) {
  const values = persistableMetrics(input);
  return prisma.businessMetrics.upsert({
    where: { id: "default" },
    create: { id: "default", ...values },
    update: values
  });
}
