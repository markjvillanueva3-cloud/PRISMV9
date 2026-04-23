/**
 * DisasterRecoveryEngine tests — U-LPR-OPS-DR
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  disasterRecoveryEngine,
  type DRDrillResult,
  type ReplicationStatus,
  type DRScenario,
} from "../../engines/DisasterRecoveryEngine.js";

describe("DisasterRecoveryEngine", () => {
  beforeEach(() => {
    disasterRecoveryEngine.clearAll();
  });

  it("registers 5 default scenarios on init", () => {
    const stats = disasterRecoveryEngine.getStats();
    expect(stats.scenarios_registered).toBe(5);
  });

  it("exposes RTO/RPO targets for all 3 tiers", () => {
    const targets = disasterRecoveryEngine.getRTORPOTargets();
    expect(targets).toHaveLength(3);
    const tier0 = targets.find(t => t.tier === "tier-0")!;
    expect(tier0.rto_hours).toBe(4);
    expect(tier0.rpo_hours).toBe(1);
    const tier1 = targets.find(t => t.tier === "tier-1")!;
    expect(tier1.rto_hours).toBe(8);
    expect(tier1.rpo_hours).toBe(4);
    const tier2 = targets.find(t => t.tier === "tier-2")!;
    expect(tier2.rto_hours).toBe(24);
    expect(tier2.rpo_hours).toBe(24);
  });

  it("lists scenarios filtered by tier", () => {
    const tier0 = disasterRecoveryEngine.listScenarios("tier-0");
    expect(tier0.length).toBeGreaterThanOrEqual(3);
    expect(tier0.every(s => s.tier === "tier-0")).toBe(true);
  });

  it("lists scenarios filtered by category", () => {
    const ransom = disasterRecoveryEngine.listScenarios(undefined, "ransomware");
    expect(ransom.length).toBe(1);
    expect(ransom[0].id).toBe("DR-003");
  });

  it("registers a new scenario", () => {
    const newScenario: DRScenario = {
      id: "DR-CUSTOM",
      category: "supply_chain",
      tier: "tier-2",
      name: "Supply chain disruption",
      description: "Upstream dependency unavailable",
      detection_signals: ["dependency_health_fail"],
      runbook_steps: ["1. Switch to fallback vendor"],
      estimated_recovery_minutes: 60,
      last_drilled_timestamp: null,
      last_drill_outcome: null,
    };
    const res = disasterRecoveryEngine.registerScenario(newScenario);
    expect(res.success).toBe(true);
    expect(disasterRecoveryEngine.getScenario("DR-CUSTOM")?.tier).toBe("tier-2");
  });

  it("records drill and enforces RTO compliance (tier-0 met within 4hr)", () => {
    const result: Omit<DRDrillResult, "rto_met" | "rpo_met"> = {
      scenario_id: "DR-001",
      drill_timestamp: Date.now(),
      outcome: "pass",
      actual_rto_minutes: 90,
      actual_rpo_minutes: 30,
      notes: "Clean drill",
      findings: [],
    };
    const drill = disasterRecoveryEngine.recordDrill(result);
    expect(drill.rto_met).toBe(true);
    expect(drill.rpo_met).toBe(true);
  });

  it("flags RTO miss when actual exceeds tier target", () => {
    const result: Omit<DRDrillResult, "rto_met" | "rpo_met"> = {
      scenario_id: "DR-001",
      drill_timestamp: Date.now(),
      outcome: "degraded",
      actual_rto_minutes: 300,
      actual_rpo_minutes: 30,
      notes: "Tier-0 RTO breach",
      findings: ["DNS failover slow"],
    };
    const drill = disasterRecoveryEngine.recordDrill(result);
    expect(drill.rto_met).toBe(false);
    expect(drill.rpo_met).toBe(true);
  });

  it("flags RPO miss when actual exceeds tier target", () => {
    const result: Omit<DRDrillResult, "rto_met" | "rpo_met"> = {
      scenario_id: "DR-002",
      drill_timestamp: Date.now(),
      outcome: "degraded",
      actual_rto_minutes: 60,
      actual_rpo_minutes: 120,
      notes: "Tier-0 RPO breach (data loss > 1hr)",
      findings: ["Replication lag"],
    };
    const drill = disasterRecoveryEngine.recordDrill(result);
    expect(drill.rto_met).toBe(true);
    expect(drill.rpo_met).toBe(false);
  });

  it("throws on unknown scenario", () => {
    expect(() =>
      disasterRecoveryEngine.recordDrill({
        scenario_id: "DR-UNKNOWN",
        drill_timestamp: Date.now(),
        outcome: "pass",
        actual_rto_minutes: 10,
        actual_rpo_minutes: 5,
        notes: "",
        findings: [],
      })
    ).toThrow(/Unknown scenario/);
  });

  it("updates replication and computes RPO compliance", () => {
    const good: Omit<ReplicationStatus, "rpo_compliant"> = {
      source: "primary-db",
      destination: "dr-db",
      lag_seconds: 120,
      last_sync_timestamp: Date.now(),
      healthy: true,
    };
    const res1 = disasterRecoveryEngine.updateReplication(good);
    expect(res1.rpo_compliant).toBe(true);

    const bad: Omit<ReplicationStatus, "rpo_compliant"> = {
      source: "primary-db",
      destination: "dr-db",
      lag_seconds: 7200,
      last_sync_timestamp: Date.now(),
      healthy: false,
    };
    const res2 = disasterRecoveryEngine.updateReplication(bad);
    expect(res2.rpo_compliant).toBe(false);
    expect(disasterRecoveryEngine.getReplications()).toHaveLength(1);
  });

  it("generates plan with at_risk status when scenarios untested", () => {
    const plan = disasterRecoveryEngine.generatePlan();
    expect(plan.overall_compliance).toBe("at_risk");
    expect(plan.untested_scenarios.length).toBe(5);
    expect(plan.recommendations.some(r => r.includes("90-day cadence"))).toBe(true);
  });

  it("generates plan with non_compliant status on replication breach", () => {
    disasterRecoveryEngine.updateReplication({
      source: "primary-db",
      destination: "dr-db",
      lag_seconds: 7200,
      last_sync_timestamp: Date.now(),
      healthy: false,
    });
    const plan = disasterRecoveryEngine.generatePlan();
    expect(plan.overall_compliance).toBe("non_compliant");
    expect(plan.recommendations.some(r => r.includes("RPO breach"))).toBe(true);
  });

  it("generates plan with non_compliant on failed drill", () => {
    disasterRecoveryEngine.recordDrill({
      scenario_id: "DR-001",
      drill_timestamp: Date.now(),
      outcome: "fail",
      actual_rto_minutes: 600,
      actual_rpo_minutes: 300,
      notes: "Failure",
      findings: ["bad"],
    });
    const plan = disasterRecoveryEngine.generatePlan();
    expect(plan.overall_compliance).toBe("non_compliant");
  });

  it("tracks stats across multiple drills", () => {
    const now = Date.now();
    disasterRecoveryEngine.recordDrill({
      scenario_id: "DR-001",
      drill_timestamp: now,
      outcome: "pass",
      actual_rto_minutes: 60,
      actual_rpo_minutes: 20,
      notes: "",
      findings: [],
    });
    disasterRecoveryEngine.recordDrill({
      scenario_id: "DR-002",
      drill_timestamp: now + 1000,
      outcome: "pass",
      actual_rto_minutes: 120,
      actual_rpo_minutes: 40,
      notes: "",
      findings: [],
    });
    const stats = disasterRecoveryEngine.getStats();
    expect(stats.drills_run).toBe(2);
    expect(stats.drills_passed).toBe(2);
    expect(stats.drills_failed).toBe(0);
    expect(stats.avg_rto_minutes).toBe(90);
    expect(stats.avg_rpo_minutes).toBe(30);
  });

  it("returns drill history with optional limit", () => {
    for (let i = 0; i < 5; i++) {
      disasterRecoveryEngine.recordDrill({
        scenario_id: "DR-001",
        drill_timestamp: Date.now() + i,
        outcome: "pass",
        actual_rto_minutes: 30,
        actual_rpo_minutes: 10,
        notes: "",
        findings: [],
      });
    }
    expect(disasterRecoveryEngine.getDrillHistory()).toHaveLength(5);
    expect(disasterRecoveryEngine.getDrillHistory(2)).toHaveLength(2);
  });

  it("clearAll resets state and re-seeds defaults", () => {
    disasterRecoveryEngine.recordDrill({
      scenario_id: "DR-001",
      drill_timestamp: Date.now(),
      outcome: "pass",
      actual_rto_minutes: 30,
      actual_rpo_minutes: 10,
      notes: "",
      findings: [],
    });
    const res = disasterRecoveryEngine.clearAll();
    expect(res.drills_cleared).toBe(1);
    const stats = disasterRecoveryEngine.getStats();
    expect(stats.drills_run).toBe(0);
    expect(stats.scenarios_registered).toBe(5);
  });
});
