import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  answerWithRules,
  buildPipelineSnapshot,
  detectIntent,
  detectLanguage,
  retrieveDeals,
  type LeadForAgent
} from "./pipeline-agent";

const now = new Date("2026-09-07T12:00:00Z");

const leads: LeadForAgent[] = [
  {
    id: "marta",
    firstName: "Marta",
    lastName: "Reyes",
    county: "Valencia",
    state: "NM",
    apn: "101-22-003",
    acres: 40,
    status: "HOT",
    leadScore: 88,
    askingPrice: 35000,
    pipelineStage: "UNDERWRITTEN",
    arvMid: 90000,
    purchasePrice: 45000,
    droneCost: 200,
    updatedAt: now
  },
  {
    id: "caleb",
    firstName: "Caleb",
    lastName: "Moore",
    county: "Coconino",
    state: "AZ",
    apn: "300-44-812",
    acres: 10,
    status: "WARM",
    leadScore: 62,
    askingPrice: 28000,
    pipelineStage: "OFERTA_ENVIADA",
    arvMid: 56000,
    purchasePrice: 22400,
    droneCost: 175,
    updatedAt: now
  },
  {
    id: "omar",
    firstName: "Omar",
    lastName: "Hale",
    county: "Otero",
    state: "NM",
    status: "HOT",
    pipelineStage: "READY_TO_CLOSE",
    askingPrice: 22000,
    arvMid: 52000,
    purchasePrice: 26000,
    droneCost: 225,
    updatedAt: now
  },
  {
    id: "elena",
    firstName: "Elena",
    lastName: "Cruz",
    county: "Doña Ana",
    state: "NM",
    status: "HOT",
    pipelineStage: "CERRADO",
    askingPrice: 28000,
    arvMid: 72000,
    purchasePrice: 36000,
    droneCost: 200,
    closedAt: now,
    updatedAt: now
  },
  {
    id: "bruce",
    firstName: "Bruce",
    lastName: "Ng",
    county: "Nye",
    state: "NV",
    status: "DNC",
    pipelineStage: "DEAD",
    updatedAt: now
  }
];

describe("buildPipelineSnapshot", () => {
  it("counts live stages and grounded profit without inventing deals", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    assert.equal(snapshot.totals.all, 5);
    assert.equal(snapshot.totals.active, 3);
    assert.equal(snapshot.totals.hot, 3);
    assert.equal(snapshot.totals.offersOut, 1);
    assert.equal(snapshot.totals.readyToClose, 1);
    assert.equal(snapshot.totals.closedThisMonth, 1);
    assert.equal(snapshot.totals.dead, 1);
    assert.equal(snapshot.countsByStage.UNDERWRITTEN, 1);
    assert.equal(snapshot.closedProfitThisMonth, 31490);
    assert.equal(snapshot.deals.find((deal) => deal.id === "omar")?.profit, 22065);
    assert.equal(snapshot.potentialProfit, 39950 + 29595 + 22065);
    assert.deepEqual(
      snapshot.deals.map((deal) => deal.name).sort(),
      ["Bruce Ng", "Caleb Moore", "Elena Cruz", "Marta Reyes", "Omar Hale"]
    );
  });
});

describe("detectLanguage / detectIntent", () => {
  it("detects Spanish questions and pipeline intents", () => {
    assert.equal(detectLanguage("¿Cuántos deals hay por etapa?"), "es");
    assert.equal(detectLanguage("How many hot deals?"), "en");
    assert.equal(detectIntent("¿Cuántos deals hay por etapa?"), "counts_by_stage");
    assert.equal(detectIntent("ofertas enviadas"), "offers_out");
    assert.equal(detectIntent("ready to close"), "ready_to_close");
    assert.equal(detectIntent("ganancia cerrada este mes"), "closed_profit");
    assert.equal(detectIntent("ganancia potencial"), "potential_profit");
    assert.equal(detectIntent("deals calientes"), "hot");
  });
});

describe("answerWithRules", () => {
  it("answers stage counts from the snapshot only", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const answer = answerWithRules("¿Cuántos deals hay por etapa?", snapshot);
    assert.equal(answer.engine, "rules");
    assert.equal(answer.language, "es");
    assert.match(answer.text, /Underwritten: 1/);
    assert.match(answer.text, /Oferta enviada: 1/);
    assert.match(answer.text, /Ready to close: 1/);
    assert.match(answer.text, /Cerrado: 1/);
    assert.doesNotMatch(answer.text, /Invented|Fake Seller|Pat Seller/);
  });

  it("lists only real HOT deals", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const answer = answerWithRules("Which deals are hot?", snapshot);
    assert.match(answer.text, /Marta Reyes/);
    assert.match(answer.text, /Omar Hale/);
    assert.match(answer.text, /Elena Cruz/);
    assert.doesNotMatch(answer.text, /Caleb Moore/);
    assert.equal(answer.citations.every((item) => ["marta", "omar", "elena"].includes(item.id)), true);
  });

  it("reports offers out and ready to close from pipelineStage", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const offers = answerWithRules("ofertas enviadas", snapshot);
    assert.match(offers.text, /Caleb Moore/);
    assert.equal(offers.citations[0]?.id, "caleb");
    const ready = answerWithRules("quién está ready to close", snapshot);
    assert.match(ready.text, /Omar Hale/);
    assert.doesNotMatch(ready.text, /Marta Reyes/);
  });

  it("returns grounded closed profit for this month", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const answer = answerWithRules("ganancia cerrada este mes", snapshot);
    assert.match(answer.text, /\$31,490/);
    assert.match(answer.text, /Elena Cruz/);
  });

  it("looks up an existing seller and refuses unknown names", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const found = answerWithRules("Tell me about Marta in Valencia", snapshot);
    assert.equal(found.intent, "lookup");
    assert.match(found.text, /Marta Reyes/);
    assert.match(found.text, /Valencia/);
    const missing = answerWithRules("What about Pat Seller in Fake County?", snapshot);
    assert.doesNotMatch(missing.text, /Pat Seller/);
    assert.doesNotMatch(missing.text, /Rina Patel/);
    assert.match(missing.text, /could not find|No encontré/i);
  });

  it("retrieves by APN without inventing extra deals", () => {
    const snapshot = buildPipelineSnapshot(leads, now);
    const matches = retrieveDeals("APN 101-22-003", snapshot);
    assert.deepEqual(matches.map((deal) => deal.id), ["marta"]);
  });
});
