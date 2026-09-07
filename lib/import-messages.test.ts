import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractMessageSyncRows, leadMatchKey, parseMessageSyncBody } from "./import-messages";

describe("extractMessageSyncRows", () => {
  it("accepts a raw array for the Grok agent", () => {
    const rows = extractMessageSyncRows([{ phone: "505-555-0141", content: "Hi" }]);
    assert.equal(rows.length, 1);
  });

  it("accepts a { messages } wrapper", () => {
    const rows = extractMessageSyncRows({ messages: [{ phone: "505-555-0141", content: "Hi" }] });
    assert.equal(rows.length, 1);
  });

  it("accepts a single message object", () => {
    const rows = extractMessageSyncRows({ phone: "505-555-0141", content: "Hi" });
    assert.equal(rows.length, 1);
  });
});

describe("parseMessageSyncBody", () => {
  it("normalizes phone, direction, source, and timestamp", () => {
    const { items, errors } = parseMessageSyncBody([
      {
        phone: "505-555-0141",
        content: "Depends on the price.",
        direction: "received",
        timestamp: "2026-08-20T14:07:00Z",
        source: "SmarterContact"
      }
    ]);
    assert.equal(errors.length, 0);
    assert.equal(items.length, 1);
    assert.equal(items[0].phone, "+15055550141");
    assert.equal(items[0].direction, "RECEIVED");
    assert.equal(items[0].source, "SmarterContact");
    assert.equal(items[0].timestamp.toISOString(), "2026-08-20T14:07:00.000Z");
  });

  it("matches by APN when phone is missing", () => {
    const { items, errors } = parseMessageSyncBody({
      apn: "101-22-003",
      content: "Would you sell?",
      direction: "sent"
    });
    assert.equal(errors.length, 0);
    assert.equal(items[0].apn, "101-22-003");
    assert.equal(items[0].direction, "SENT");
    assert.equal(leadMatchKey(items[0]), "apn:101-22-003");
  });

  it("skips rows without content or a match key", () => {
    const { items, errors } = parseMessageSyncBody([
      { phone: "505-555-0141", content: "" },
      { content: "orphan SMS" },
      { phone: "505-555-0141", content: "ok" }
    ]);
    assert.equal(items.length, 1);
    assert.equal(errors.length, 2);
    assert.match(errors[0].error, /content/i);
    assert.match(errors[1].error, /phone or apn/i);
  });
});
