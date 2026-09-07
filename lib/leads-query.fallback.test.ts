import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { isMissingColumnError } from "./db-errors";
import { applyLandLeadDefaults, LEGACY_LEAD_SELECT } from "./leads-query";

describe("schema-behind fallback", () => {
  it("loads leads after pipelineStage is dropped from SQLite", async () => {
    const dir = mkdtempSync(join(tmpdir(), "landcrm-"));
    const dbPath = join(dir, "behind.db");
    copyFileSync(join(process.cwd(), "prisma", "dev.db"), dbPath);
    execFileSync("python3", [
      "-c",
      "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('DROP INDEX IF EXISTS Lead_pipelineStage_idx'); c.execute('ALTER TABLE Lead DROP COLUMN pipelineStage'); c.commit()",
      dbPath
    ]);

    const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
    await prisma.$executeRawUnsafe(
      "INSERT INTO Lead (id, firstName, lastName, county, state, status, leadScore, createdAt, updatedAt) VALUES ('lead_schema_drift', 'Schema', 'Drift', 'Park', 'CO', 'WARM', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    );

    let schemaDrift = false;
    let leads: Array<{ pipelineStage: string | null }> = [];
    try {
      leads = await prisma.lead.findMany();
    } catch (error) {
      assert.equal(isMissingColumnError(error), true);
      schemaDrift = true;
      const rows = await prisma.lead.findMany({ select: LEGACY_LEAD_SELECT });
      leads = rows.map((row) => applyLandLeadDefaults(row));
    }
    await prisma.$disconnect();

    assert.equal(schemaDrift, true);
    assert.ok(leads.length >= 1);
    for (const lead of leads) {
      assert.equal(lead.pipelineStage, "LEAD_SC");
    }
  });
});
