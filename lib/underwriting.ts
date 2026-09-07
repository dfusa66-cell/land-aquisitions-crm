export const BROKERLESS_FEE = 150;
export const BUY_CLOSING_COST = 1000;
export const SELL_CLOSING_COST = 1000;
export const BUYER_AGENT_RATE = 0.03;
export const DRONE_COST_MIN = 150;
export const DRONE_COST_MAX = 250;
export const DRONE_COST_DEFAULT = 200;

export function clampDroneCost(value: number | null | undefined) {
  const raw = value == null || Number.isNaN(value) ? DRONE_COST_DEFAULT : value;
  return Math.min(DRONE_COST_MAX, Math.max(DRONE_COST_MIN, raw));
}

export function offerFromArv(arvMid: number | null | undefined, percent: number) {
  if (arvMid == null || !Number.isFinite(arvMid)) return null;
  return arvMid * percent;
}

export function offer40(arvMid: number | null | undefined) {
  return offerFromArv(arvMid, 0.4);
}

export function offer50(arvMid: number | null | undefined) {
  return offerFromArv(arvMid, 0.5);
}

export function resolvePurchasePrice(input: {
  purchasePrice?: number | null;
  arvMid?: number | null;
}) {
  if (input.purchasePrice != null && Number.isFinite(input.purchasePrice)) {
    return input.purchasePrice;
  }
  return offer50(input.arvMid);
}

export function estimatedProfit(input: {
  arv?: number | null;
  purchasePrice?: number | null;
  droneCost?: number | null;
}) {
  const arv = input.arv;
  const purchase = input.purchasePrice;
  if (arv == null || purchase == null || !Number.isFinite(arv) || !Number.isFinite(purchase)) {
    return null;
  }
  const drone = clampDroneCost(input.droneCost);
  const buyerAgent = arv * BUYER_AGENT_RATE;
  return arv - purchase - drone - BROKERLESS_FEE - buyerAgent - BUY_CLOSING_COST - SELL_CLOSING_COST;
}

export function dealProfit(lead: {
  arvMid?: number | null;
  purchasePrice?: number | null;
  droneCost?: number | null;
  actualProfit?: number | null;
}) {
  if (lead.actualProfit != null && Number.isFinite(lead.actualProfit)) {
    return lead.actualProfit;
  }
  return estimatedProfit({
    arv: lead.arvMid,
    purchasePrice: resolvePurchasePrice(lead),
    droneCost: lead.droneCost
  });
}

export function underwritingBreakdown(input: {
  arv?: number | null;
  purchasePrice?: number | null;
  droneCost?: number | null;
}) {
  const arv = input.arv ?? null;
  const purchase = input.purchasePrice ?? null;
  const drone = clampDroneCost(input.droneCost);
  const buyerAgent = arv == null ? null : arv * BUYER_AGENT_RATE;
  return {
    arv,
    purchase,
    drone,
    brokerless: BROKERLESS_FEE,
    buyerAgent,
    buyClosing: BUY_CLOSING_COST,
    sellClosing: SELL_CLOSING_COST,
    profit: estimatedProfit(input)
  };
}
