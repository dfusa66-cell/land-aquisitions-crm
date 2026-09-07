import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyLandLeadDefaults, pickLegacyLeadData } from "./leads-query";

describe("applyLandLeadDefaults", () => {
  it("fills land-pipeline fields when the hosted DB has not been pushed yet", () => {
    const lead = applyLandLeadDefaults({
      id: "lead_1",
      firstName: "Pat",
      status: "WARM",
      askingPrice: 40000
    });
    assert.equal(lead.pipelineStage, "LEAD_SC");
    assert.equal(lead.arvMid, null);
    assert.equal(lead.closedAt, null);
    assert.equal(lead.firstName, "Pat");
    assert.equal(lead.askingPrice, 40000);
  });

  it("does not overwrite values that already exist", () => {
    const lead = applyLandLeadDefaults({
      id: "lead_2",
      pipelineStage: "UNDERWRITTEN",
      arvMid: 120000
    });
    assert.equal(lead.pipelineStage, "UNDERWRITTEN");
    assert.equal(lead.arvMid, 120000);
  });
});

describe("pickLegacyLeadData", () => {
  it("drops land-pipeline columns so writes can succeed on an old schema", () => {
    const legacy = pickLegacyLeadData({
      firstName: "Pat",
      status: "HOT",
      pipelineStage: "PRECIO_ASK",
      arvMid: 90000
    });
    assert.deepEqual(legacy, { firstName: "Pat", status: "HOT" });
  });
});
