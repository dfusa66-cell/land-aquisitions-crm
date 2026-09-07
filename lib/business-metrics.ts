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
  pipelineProjectedProfit: 26000,
  periodLabel: "Aug 2025–Sep 2026",
  updatedAt: null as Date | null
};

export type BusinessMetricsValues = typeof DIEGO_PNL_DEFAULTS;

export const PROJECTED_PROFIT_STAGES: PipelineStage[] = ["NEGOCIACION", "READY_TO_CLOSE"];

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

export function looksUnderContract(lead: {
  pipelineStage?: string | null;
  nextAction?: string | null;
  underwritingPackNote?: string | null;
  aiSummary?: string | null;
}) {
  if (lead.pipelineStage && PROJECTED_PROFIT_STAGES.includes(lead.pipelineStage as PipelineStage)) {
    return true;
  }
  const blob = [lead.pipelineStage, lead.nextAction, lead.underwritingPackNote, lead.aiSummary].filter(Boolean).join(" ");
  return /under[_\s-]?contract/i.test(blob);
}

export function projectedPipelineProfit(
  leads: Array<{
    pipelineStage?: string | null;
    actualProfit?: number | null;
    profit?: number | null;
    nextAction?: string | null;
    underwritingPackNote?: string | null;
    aiSummary?: string | null;
  }>,
  fallback = DIEGO_PNL_DEFAULTS.pipelineProjectedProfit
) {
  const matches = leads.filter(looksUnderContract);
  const sum = matches.reduce((total, lead) => {
    if (lead.actualProfit != null && Number.isFinite(lead.actualProfit)) {
      return total + lead.actualProfit;
    }
    const hinted = parseProfitHint(lead.nextAction, lead.underwritingPackNote, lead.aiSummary);
    if (hinted != null) return total + hinted;
    return total + (lead.profit ?? 0);
  }, 0);
  return sum > 0 ? sum : fallback;
}

export function normalizeBusinessMetrics(input: Partial<BusinessMetricsValues> | null | undefined): BusinessMetricsValues {
  const sc = input?.scAffiliateIncome ?? DIEGO_PNL_DEFAULTS.scAffiliateIncome;
  const portal = input?.landPortalAffiliateIncome ?? DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome;
  const affiliate = computeAffiliateIncome({
    affiliateIncome: input?.affiliateIncome ?? DIEGO_PNL_DEFAULTS.affiliateIncome,
    scAffiliateIncome: sc,
    landPortalAffiliateIncome: portal
  });
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
    pipelineProjectedProfit: input?.pipelineProjectedProfit ?? DIEGO_PNL_DEFAULTS.pipelineProjectedProfit,
    periodLabel: input?.periodLabel?.trim() || DIEGO_PNL_DEFAULTS.periodLabel,
    updatedAt: input?.updatedAt ?? null
  };
}

export function metricsFromFormData(formData: FormData): BusinessMetricsValues {
  const sc = parseMoney(formData.get("scAffiliateIncome")) ?? DIEGO_PNL_DEFAULTS.scAffiliateIncome;
  const portal = parseMoney(formData.get("landPortalAffiliateIncome")) ?? DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome;
  const affiliate =
    parseMoney(formData.get("affiliateIncome")) ??
    computeAffiliateIncome({ scAffiliateIncome: sc, landPortalAffiliateIncome: portal });
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

  return normalizeBusinessMetrics({
    netProfitAllTime: explicitNet ?? computedNet,
    landProfitClosed,
    coachingIncome,
    affiliateIncome: affiliate,
    scAffiliateIncome: sc,
    landPortalAffiliateIncome: portal,
    marketingSpend,
    pipelineProjectedProfit: parseMoney(formData.get("pipelineProjectedProfit")) ?? DIEGO_PNL_DEFAULTS.pipelineProjectedProfit,
    periodLabel: String(formData.get("periodLabel") ?? DIEGO_PNL_DEFAULTS.periodLabel)
  });
}

function persistableMetrics(input: BusinessMetricsValues) {
  const values = normalizeBusinessMetrics(input);
  return {
    netProfitAllTime: values.netProfitAllTime,
    landProfitClosed: values.landProfitClosed,
    coachingIncome: values.coachingIncome,
    affiliateIncome: values.affiliateIncome,
    scAffiliateIncome: values.scAffiliateIncome,
    landPortalAffiliateIncome: values.landPortalAffiliateIncome,
    marketingSpend: values.marketingSpend,
    pipelineProjectedProfit: values.pipelineProjectedProfit,
    periodLabel: values.periodLabel
  };
}

function toValues(row: {
  netProfitAllTime: number;
  landProfitClosed: number;
  coachingIncome: number;
  affiliateIncome: number;
  scAffiliateIncome: number;
  landPortalAffiliateIncome: number;
  marketingSpend: number;
  pipelineProjectedProfit: number;
  periodLabel: string;
  updatedAt: Date;
}): BusinessMetricsValues {
  return normalizeBusinessMetrics(row);
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
