import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDbError,
  isMissingColumnError,
  isNextInternalError,
  isNextRedirectError,
  sanitizeDbMessage
} from "./db-errors";

describe("isNextRedirectError", () => {
  it("detects Next.js redirect digests", () => {
    assert.equal(isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/;307;" }), true);
    assert.equal(isNextRedirectError(new Error("boom")), false);
  });

  it("does not swallow Next.js dynamic-rendering signals", () => {
    assert.equal(isNextInternalError({ digest: "DYNAMIC_SERVER_USAGE" }), true);
    assert.equal(isNextInternalError({ digest: "NEXT_NOT_FOUND" }), true);
  });
});

describe("isMissingColumnError", () => {
  it("detects Prisma P2021/P2022 and Postgres missing-column text", () => {
    assert.equal(isMissingColumnError({ code: "P2022", message: "column missing" }), true);
    assert.equal(isMissingColumnError({ code: "P2021" }), true);
    assert.equal(
      isMissingColumnError(new Error("The column `Lead.pipelineStage` does not exist in the current database.")),
      true
    );
    assert.equal(isMissingColumnError(new Error("connection refused")), false);
  });
});

describe("formatDbError", () => {
  it("explains schema drift and sanitizes URLs", () => {
    assert.match(formatDbError({ code: "P2022", message: "x" }), /pnpm db:push:postgres/);
    assert.match(formatDbError({ code: "P2021" }), /BusinessMetrics/);
    assert.match(formatDbError({ code: "P1001" }), /DATABASE_URL/);
    assert.equal(
      sanitizeDbMessage("bad postgresql://user:secret@host:5432/db?sslmode=require"),
      "bad postgresql://***"
    );
  });
});
