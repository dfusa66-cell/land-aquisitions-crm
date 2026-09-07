import { prisma } from "@/lib/prisma";
import { formatDbError, isMissingColumnError } from "@/lib/db-errors";

export const LEGACY_LEAD_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  acres: true,
  county: true,
  state: true,
  apn: true,
  status: true,
  leadScore: true,
  askingPrice: true,
  estimatedMarketValue: true,
  targetPurchasePrice: true,
  startingOffer: true,
  mao: true,
  absoluteMaxPrice: true,
  motivation: true,
  sellerInterest: true,
  sentiment: true,
  negotiationStage: true,
  aiSummary: true,
  nextAction: true,
  followUpDate: true,
  createdAt: true,
  updatedAt: true
} as const;

export const LAND_LEAD_DEFAULTS = {
  pipelineStage: "LEAD_SC" as string | null,
  landPortalUrl: null as string | null,
  lpEstimate: null as number | null,
  arvMid: null as number | null,
  arvBest: null as number | null,
  arvWorst: null as number | null,
  droneCost: null as number | null,
  purchasePrice: null as number | null,
  actualProfit: null as number | null,
  closedAt: null as Date | null,
  underwritingPackNote: null as string | null,
  underwritingPackUrl: null as string | null
};

export type LandLeadDefaults = typeof LAND_LEAD_DEFAULTS;

export function applyLandLeadDefaults<T extends Record<string, unknown>>(lead: T): T & LandLeadDefaults {
  return { ...LAND_LEAD_DEFAULTS, ...lead };
}

export function pickLegacyLeadData<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => key in LEGACY_LEAD_SELECT)) as Partial<T>;
}

export type SafeLoad<T> = {
  data: T;
  schemaDrift: boolean;
  dbError: string | null;
};

async function safeQuery<T>(primary: () => Promise<T>, fallback: () => Promise<T>, empty: T): Promise<SafeLoad<T>> {
  try {
    return { data: await primary(), schemaDrift: false, dbError: null };
  } catch (error) {
    if (isMissingColumnError(error)) {
      try {
        return { data: await fallback(), schemaDrift: true, dbError: null };
      } catch (fallbackError) {
        console.error("[leads-query] schema fallback failed", fallbackError);
        return { data: empty, schemaDrift: true, dbError: formatDbError(fallbackError) };
      }
    }
    console.error("[leads-query]", error);
    return { data: empty, schemaDrift: false, dbError: formatDbError(error) };
  }
}

const dashboardInclude = {
  messages: { orderBy: { timestamp: "desc" as const }, take: 1 }
};

const listInclude = {
  messages: { orderBy: [{ timestamp: "desc" as const }, { createdAt: "desc" as const }], take: 1 },
  analyses: { orderBy: { createdAt: "desc" as const }, take: 1 },
  suggestedReplies: { orderBy: { createdAt: "desc" as const }, take: 1 }
};

const workspaceInclude = {
  messages: { orderBy: [{ timestamp: "asc" as const }, { createdAt: "asc" as const }] },
  analyses: { orderBy: { createdAt: "desc" as const }, take: 1 },
  suggestedReplies: { orderBy: { createdAt: "desc" as const }, take: 1 }
};

export async function loadDashboardLeads() {
  return safeQuery(
    () => prisma.lead.findMany({ include: dashboardInclude, orderBy: { updatedAt: "desc" } }),
    async () => {
      const rows = await prisma.lead.findMany({
        select: { ...LEGACY_LEAD_SELECT, messages: dashboardInclude.messages },
        orderBy: { updatedAt: "desc" }
      });
      return rows.map((row) => applyLandLeadDefaults(row));
    },
    []
  );
}

export async function loadLeadsList() {
  return safeQuery(
    () => prisma.lead.findMany({ include: listInclude, orderBy: [{ updatedAt: "desc" }] }),
    async () => {
      const rows = await prisma.lead.findMany({
        select: { ...LEGACY_LEAD_SELECT, ...listInclude },
        orderBy: [{ updatedAt: "desc" }]
      });
      return rows.map((row) => applyLandLeadDefaults(row));
    },
    []
  );
}

export async function loadLeadWorkspace(id: string) {
  return safeQuery(
    () => prisma.lead.findUnique({ where: { id }, include: workspaceInclude }),
    async () => {
      const row = await prisma.lead.findUnique({
        where: { id },
        select: { ...LEGACY_LEAD_SELECT, ...workspaceInclude }
      });
      return row ? applyLandLeadDefaults(row) : null;
    },
    null
  );
}

export async function updateLeadWithSchemaFallback(id: string, data: Record<string, unknown>) {
  try {
    return await prisma.lead.update({ where: { id }, data: data as never });
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return prisma.lead.update({ where: { id }, data: pickLegacyLeadData(data) as never });
  }
}
