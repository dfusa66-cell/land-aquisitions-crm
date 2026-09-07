import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAffiliateIncome,
  computeNetProfit,
  DIEGO_PNL_DEFAULTS,
  looksUnderContract,
  metricsFromFormData,
  normalizeBusinessMetrics,
  parseProfitHint,
  projectedPipelineProfit
} from "./business-metrics";

describe("Diego P&L defaults", () => {
  it("nets to the dictated all-time business profit", () => {
    assert.equal(DIEGO_PNL_DEFAULTS.landProfitClosed, 182000);
    assert.equal(DIEGO_PNL_DEFAULTS.scAffiliateIncome, 7000);
    assert.equal(DIEGO_PNL_DEFAULTS.landPortalAffiliateIncome, 11090);
    assert.equal(DIEGO_PNL_DEFAULTS.coachingIncome, 25000);
    assert.equal(DIEGO_PNL_DEFAULTS.marketingSpend, 18000);
    assert.equal(DIEGO_PNL_DEFAULTS.netProfitAllTime, 207090);
    assert.equal(DIEGO_PNL_DEFAULTS.pipelineProjectedProfit, 26000);
    assert.equal(
      computeNetProfit({
        landProfitClosed: 182000,
        coachingIncome: 25000,
        scAffiliateIncome: 7000,
        landPortalAffiliateIncome: 11090,
        marketingSpend: 18000
      }),
      207090
    );
  });
});

describe("computeAffiliateIncome", () => {
  it("prefers SC + Land Portal line items over a stale combined total", () => {
    assert.equal(
      computeAffiliateIncome({
        affiliateIncome: 1,
        scAffiliateIncome: 7000,
        landPortalAffiliateIncome: 11090
      }),
      18090
    );
  });
});

describe("normalizeBusinessMetrics", () => {
  it("fills Diego defaults and keeps an explicit net override", () => {
    const metrics = normalizeBusinessMetrics({
      landProfitClosed: 200000,
      coachingIncome: 0,
      scAffiliateIncome: 0,
      landPortalAffiliateIncome: 0,
      marketingSpend: 10000,
      netProfitAllTime: 123456
    });
    assert.equal(metrics.affiliateIncome, 18090);
    assert.equal(metrics.netProfitAllTime, 123456);
    assert.equal(metrics.periodLabel, "Aug 2025–Sep 2026");
  });
});

describe("metricsFromFormData", () => {
  it("recomputes net from line items when net is blank", () => {
    const form = new FormData();
    form.set("landProfitClosed", "182000");
    form.set("scAffiliateIncome", "7000");
    form.set("landPortalAffiliateIncome", "11090");
    form.set("coachingIncome", "25000");
    form.set("marketingSpend", "18000");
    const metrics = metricsFromFormData(form);
    assert.equal(metrics.affiliateIncome, 18090);
    assert.equal(metrics.netProfitAllTime, 207090);
  });
});

describe("projected pipeline profit", () => {
  it("reads a note amount when under contract and actualProfit is null", () => {
    assert.equal(parseProfitHint("UNDER_CONTRACT actualProfit null but notes ~$26,000"), 26000);
    assert.equal(looksUnderContract({ pipelineStage: "LEAD_SC", nextAction: "UNDER_CONTRACT — waiting on title" }), true);
    assert.equal(
      projectedPipelineProfit([
        {
          pipelineStage: "READY_TO_CLOSE",
          actualProfit: null,
          profit: null,
          nextAction: "UNDER_CONTRACT projected $26,000"
        }
      ]),
      26000
    );
  });

  it("falls back to the stored 26k projection when nothing is under contract", () => {
    assert.equal(
      projectedPipelineProfit([{ pipelineStage: "LEAD_SC", actualProfit: null, profit: 9000 }]),
      26000
    );
  });
});
