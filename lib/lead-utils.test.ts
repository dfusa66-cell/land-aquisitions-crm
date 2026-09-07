import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPhoneDisplay, normalizeDirection, normalizePhone } from "./lead-utils";

describe("phone + direction helpers", () => {
  it("normalizes 10-digit US numbers", () => {
    assert.equal(normalizePhone("505-555-0141"), "+15055550141");
  });

  it("formats a display number for the SMS header", () => {
    assert.equal(formatPhoneDisplay("+15055550141"), "(505) 555-0141");
  });

  it("treats inbound aliases as RECEIVED", () => {
    assert.equal(normalizeDirection("inbound"), "RECEIVED");
    assert.equal(normalizeDirection("seller"), "RECEIVED");
    assert.equal(normalizeDirection("sent"), "SENT");
  });
});
