/**
 * devDispatcher U-WIRE-BACKUP round-trip tests — BackupRestoreDrillEngine.
 *
 * Validates the 4 new read actions (backup_plan / backup_stats / backup_drill_compliance /
 * backup_assets) wire through prism_dev and that the engine's drill-cadence compliance +
 * attestation-aware posture behave per contract. Reference values read from the engine body
 * (DEFAULT_ASSETS: 5 assets — 3 tier-0 [BKUP-001/002/003], 2 tier-1; a fresh engine has zero
 * drills so every asset is overdue → tier-0-overdue → non_compliant, the safety-conscious default).
 *
 * Wired slot:papa 2026-06-11 /startup-papa /loop /goal (wire-unwired campaign, continues U-WIRE-DR).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-BACKUP
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BackupRestoreDrillEngine,
  backupRestoreDrillEngine,
  type BackupAsset,
  type BackupJob,
} from "../engines/BackupRestoreDrillEngine.js";

function asset(over: Partial<BackupAsset> = {}): BackupAsset {
  return {
    id: "TEST-1", category: "database", tier: "tier-1", name: "t", description: "t",
    rto_hours: 4, rpo_hours: 1, drill_cadence: "monthly", retention_days: 30,
    storage_locations: ["s3://x"], owner: "ops", ...over,
  };
}
function job(over: Partial<BackupJob> = {}): Omit<BackupJob, "job_id"> & { job_id?: string } {
  return {
    asset_id: "BKUP-001", started_at: 1, completed_at: 2, size_bytes: 100,
    payload_sha256: "a".repeat(64), storage_location: "s3://x", success: true, notes: "", ...over,
  };
}

describe("U-WIRE-BACKUP — default asset inventory (happy path, reference values)", () => {
  it("fresh engine registers the 5 default assets", () => {
    const e = new BackupRestoreDrillEngine();
    expect(e.getStats().assets_registered).toBe(5);
  });

  it("listAssets filters by tier (3 tier-0, 2 tier-1, 0 tier-2)", () => {
    const e = new BackupRestoreDrillEngine();
    expect(e.listAssets("tier-0").length).toBe(3);
    expect(e.listAssets("tier-1").length).toBe(2);
    expect(e.listAssets("tier-2").length).toBe(0);
  });

  it("listAssets filters by category (database → exactly BKUP-003)", () => {
    const e = new BackupRestoreDrillEngine();
    const r = e.listAssets(undefined, "database");
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("BKUP-003");
  });

  it("getDrillCompliance marks every never-drilled asset overdue", () => {
    const e = new BackupRestoreDrillEngine();
    const c = e.getDrillCompliance();
    expect(c.length).toBe(5);
    expect(c.every(x => x.band === "overdue")).toBe(true);
    expect(c.every(x => x.last_drill_at === null)).toBe(true);
  });
});

describe("U-WIRE-BACKUP — fresh posture is non_compliant (adversarial: untested tier-0 = critical)", () => {
  it("generatePlan on a fresh engine is non_compliant with a tier-0 critical recommendation", () => {
    const e = new BackupRestoreDrillEngine();
    const plan = e.generatePlan();
    expect(plan.overall).toBe("non_compliant");
    expect(plan.overdue_asset_ids.length).toBe(5);
    expect(plan.recommendations.some(r => /tier-0/i.test(r))).toBe(true);
  });

  it("getStats reports all 5 assets overdue, 0 drills run/passed", () => {
    const e = new BackupRestoreDrillEngine();
    const s = e.getStats();
    expect(s.assets_overdue).toBe(5);
    expect(s.drills_run).toBe(0);
    expect(s.drills_passed).toBe(0);
  });
});

describe("U-WIRE-BACKUP — fail-loud input validation (R12)", () => {
  it("registerAsset rejects an empty id", () => {
    const e = new BackupRestoreDrillEngine();
    expect(() => e.registerAsset(asset({ id: "" }))).toThrow(/asset\.id required/);
  });

  it("registerAsset rejects non-positive rto_hours", () => {
    const e = new BackupRestoreDrillEngine();
    expect(() => e.registerAsset(asset({ rto_hours: 0 }))).toThrow(/rto_hours must be positive/);
  });

  it("registerAsset rejects non-positive rpo_hours", () => {
    const e = new BackupRestoreDrillEngine();
    expect(() => e.registerAsset(asset({ rpo_hours: -1 }))).toThrow(/rpo_hours must be positive/);
  });

  it("recordBackup rejects an unknown asset (before any crypto)", () => {
    const e = new BackupRestoreDrillEngine();
    expect(() => e.recordBackup(job({ asset_id: "DOES-NOT-EXIST" }))).toThrow(/Unknown asset/);
  });

  it("recordBackup rejects a malformed payload_sha256 (adversarial: non-64-hex)", () => {
    const e = new BackupRestoreDrillEngine();
    expect(() => e.recordBackup(job({ payload_sha256: "not-a-real-hash" }))).toThrow(/payload_sha256 must be 64 hex/);
  });

  it("getAsset returns null (never throws) for an unknown id", () => {
    const e = new BackupRestoreDrillEngine();
    expect(e.getAsset("nope")).toBeNull();
  });
});

describe("U-WIRE-BACKUP — singleton parity", () => {
  it("the exported singleton (what the dispatcher imports) exposes the 5 default assets", () => {
    expect(backupRestoreDrillEngine.getStats().assets_registered).toBe(5);
  });
});

describe("U-WIRE-BACKUP — dispatcher wiring assertion (round-trip surface)", () => {
  const dispatcherSrc = fs.readFileSync(
    path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
    "utf8",
  );
  const schemaSrc = fs.readFileSync(
    path.resolve(__dirname, "../schemas/devActionSchemas.ts"),
    "utf8",
  );

  for (const action of ["backup_plan", "backup_stats", "backup_drill_compliance", "backup_assets"]) {
    it(`${action} is in the prism_dev action enum AND has a case AND a schema`, () => {
      // guards the MockMCPServer z.enum-bypass gap (CLAUDE.md): a missing enum entry would
      // pass in tests but 100% fail in production.
      expect(dispatcherSrc).toMatch(new RegExp(`"${action}"`));
      expect(dispatcherSrc).toMatch(new RegExp(`case "${action}":`));
      expect(schemaSrc).toMatch(new RegExp(`${action}:`));
    });
  }

  it("the dispatcher references the BackupRestoreDrillEngine", () => {
    expect(dispatcherSrc).toMatch(/BackupRestoreDrillEngine/);
  });
});
