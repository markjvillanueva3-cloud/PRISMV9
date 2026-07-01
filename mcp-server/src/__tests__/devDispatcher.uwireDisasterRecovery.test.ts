/**
 * devDispatcher U-WIRE-DR round-trip tests — DisasterRecoveryEngine.
 *
 * Validates the 3 new read actions (dr_plan / dr_stats / dr_scenarios) wire through
 * prism_dev and that the engine's RTO/RPO evaluation + tier/category filtering behave
 * per its NIST SP 800-34 / ISO 22301 contract. Reference values are read from the
 * engine body (DEFAULT_SCENARIOS: 5 scenarios — 3 tier-0, 2 tier-1, 0 tier-2).
 *
 * Wired slot:papa 2026-06-11 /startup-papa /loop /goal (wire-unwired campaign, continues
 * the prior 9-engine uwire batch).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-DR
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DisasterRecoveryEngine,
  disasterRecoveryEngine,
  type DRDrillResult,
  type DRScenario,
} from "../engines/DisasterRecoveryEngine.js";

// Helper: a fully-formed drill input (engine adds rto_met/rpo_met).
function drill(over: Partial<Omit<DRDrillResult, "rto_met" | "rpo_met">> = {}): Omit<DRDrillResult, "rto_met" | "rpo_met"> {
  return {
    scenario_id: "DR-001",
    drill_timestamp: 1_700_000_000_000,
    outcome: "pass",
    actual_rto_minutes: 30,
    actual_rpo_minutes: 10,
    notes: "drill",
    findings: [],
    ...over,
  };
}

describe("U-WIRE-DR — default scenario inventory (happy path, reference values)", () => {
  it("fresh engine registers the 5 default scenarios", () => {
    const e = new DisasterRecoveryEngine();
    expect(e.getStats().scenarios_registered).toBe(5);
  });

  it("listScenarios filters by tier (3 tier-0, 2 tier-1, 0 tier-2)", () => {
    const e = new DisasterRecoveryEngine();
    expect(e.listScenarios("tier-0").length).toBe(3);
    expect(e.listScenarios("tier-1").length).toBe(2);
    expect(e.listScenarios("tier-2").length).toBe(0);
  });

  it("listScenarios filters by category (ransomware → exactly DR-003)", () => {
    const e = new DisasterRecoveryEngine();
    const r = e.listScenarios(undefined, "ransomware");
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("DR-003");
  });

  it("generatePlan on a fresh engine is at_risk (all 5 untested, no breaches)", () => {
    const e = new DisasterRecoveryEngine();
    const plan = e.generatePlan();
    expect(plan.overall_compliance).toBe("at_risk");
    expect(plan.untested_scenarios.length).toBe(5);
    expect(plan.rto_rpo_targets.length).toBe(3);
    expect(plan.recommendations.some(r => /tier-0/i.test(r))).toBe(true);
  });
});

describe("U-WIRE-DR — RTO/RPO boundary evaluation (adversarial)", () => {
  it("tier-0 rto exactly at the 240-min target is MET (<=)", () => {
    const e = new DisasterRecoveryEngine();
    const r = e.recordDrill(drill({ actual_rto_minutes: 240, actual_rpo_minutes: 60 }));
    expect(r.rto_met).toBe(true);
    expect(r.rpo_met).toBe(true);
  });

  it("tier-0 rto one minute over the target is NOT met", () => {
    const e = new DisasterRecoveryEngine();
    const r = e.recordDrill(drill({ actual_rto_minutes: 241 }));
    expect(r.rto_met).toBe(false);
  });

  it("outcome=pass but rto breached counts as FAILED in stats (not passed)", () => {
    const e = new DisasterRecoveryEngine();
    e.recordDrill(drill({ outcome: "pass", actual_rto_minutes: 999 }));
    const s = e.getStats();
    expect(s.drills_passed).toBe(0);
    expect(s.drills_failed).toBe(1);
  });

  it("replication lag at the 3600s RPO boundary is compliant; one second over is not", () => {
    const e = new DisasterRecoveryEngine();
    const ok = e.updateReplication({ source: "a", destination: "b", lag_seconds: 3600, last_sync_timestamp: 1, healthy: true });
    const bad = e.updateReplication({ source: "c", destination: "d", lag_seconds: 3601, last_sync_timestamp: 1, healthy: true });
    expect(ok.rpo_compliant).toBe(true);
    expect(bad.rpo_compliant).toBe(false);
  });

  it("a non-compliant replication flips the whole plan to non_compliant", () => {
    const e = new DisasterRecoveryEngine();
    e.updateReplication({ source: "c", destination: "d", lag_seconds: 7200, last_sync_timestamp: 1, healthy: true });
    expect(e.generatePlan().overall_compliance).toBe("non_compliant");
  });
});

describe("U-WIRE-DR — fail-loud input validation (R12)", () => {
  it("registerScenario rejects an empty id", () => {
    const e = new DisasterRecoveryEngine();
    const bad: DRScenario = {
      id: "", category: "human_error", tier: "tier-1", name: "x", description: "x",
      detection_signals: [], runbook_steps: [], estimated_recovery_minutes: 1,
      last_drilled_timestamp: null, last_drill_outcome: null,
    };
    expect(() => e.registerScenario(bad)).toThrow(/scenario\.id required/);
  });

  it("recordDrill rejects an unknown scenario", () => {
    const e = new DisasterRecoveryEngine();
    expect(() => e.recordDrill(drill({ scenario_id: "DR-DOES-NOT-EXIST" }))).toThrow(/Unknown scenario/);
  });

  it("getScenario returns null (never throws) for an unknown id", () => {
    const e = new DisasterRecoveryEngine();
    expect(e.getScenario("nope")).toBeNull();
  });
});

describe("U-WIRE-DR — singleton parity + isolation", () => {
  it("the exported singleton exposes the same default inventory", () => {
    // singleton is what the dispatcher imports; verify it is the same shape
    expect(disasterRecoveryEngine.getStats().scenarios_registered).toBe(5);
  });
});

describe("U-WIRE-DR — dispatcher wiring assertion (round-trip surface)", () => {
  const dispatcherSrc = fs.readFileSync(
    path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
    "utf8",
  );
  const schemaSrc = fs.readFileSync(
    path.resolve(__dirname, "../schemas/devActionSchemas.ts"),
    "utf8",
  );

  for (const action of ["dr_plan", "dr_stats", "dr_scenarios"]) {
    it(`${action} is in the prism_dev action enum AND has a case AND a schema`, () => {
      // enum entry — guards the MockMCPServer z.enum-bypass gap (CLAUDE.md): a missing
      // enum entry would 200 in tests but 100% fail in production.
      expect(dispatcherSrc).toMatch(new RegExp(`"${action}"`));
      expect(dispatcherSrc).toMatch(new RegExp(`case "${action}":`));
      expect(schemaSrc).toMatch(new RegExp(`${action}:`));
    });
  }

  it("the dispatcher references the DisasterRecoveryEngine", () => {
    expect(dispatcherSrc).toMatch(/DisasterRecoveryEngine/);
  });
});
