/**
 * ChaosDrillSchedulerEngine tests — U-LPR-OPS-CHAOS
 */

import { describe, it, expect, beforeEach } from "vitest";
import { chaosDrillSchedulerEngine } from "../../engines/ChaosDrillSchedulerEngine.js";

describe("ChaosDrillSchedulerEngine", () => {
  beforeEach(() => {
    chaosDrillSchedulerEngine.clearAll();
  });

  describe("default catalog", () => {
    it("seeds 8 default scenarios covering all critical categories", () => {
      const all = chaosDrillSchedulerEngine.listScenarios();
      expect(all.length).toBe(8);
      const categories = all.map(s => s.category).sort();
      expect(categories).toContain("dr_failover");
      expect(categories).toContain("tenant_isolation");
      expect(categories).toContain("attestation_tamper");
      expect(categories).toContain("audit_gap");
    });

    it("DR failover requires backup-tamper as prerequisite", () => {
      const dr = chaosDrillSchedulerEngine.getScenario("CHAOS-DR-FAILOVER");
      expect(dr?.prerequisite_scenario_ids).toContain("CHAOS-BACKUP-TAMPER");
    });

    it("critical scenarios restricted to staging only (no production without explicit change)", () => {
      const audit = chaosDrillSchedulerEngine.getScenario("CHAOS-AUDIT-GAP");
      expect(audit?.allowed_environments).toEqual(["staging"]);
    });
  });

  describe("registerScenario validation", () => {
    it("rejects scenario with empty allowed_environments", () => {
      expect(() =>
        chaosDrillSchedulerEngine.registerScenario({
          id: "BAD-EMPTY-ENV",
          category: "latency_injection",
          name: "bad",
          description: "bad",
          severity: "low",
          cadence: "weekly",
          allowed_environments: [],
          blast_radius: { max_tenants: 1, max_duration_seconds: 60, recoverable_without_human: true },
          rollback_action: "noop",
          linked_runbook: "noop",
          prerequisite_scenario_ids: [],
        })
      ).toThrow(/allow at least one environment/);
    });

    it("rejects non-positive duration cap", () => {
      expect(() =>
        chaosDrillSchedulerEngine.registerScenario({
          id: "BAD-DURATION",
          category: "latency_injection",
          name: "bad",
          description: "bad",
          severity: "low",
          cadence: "weekly",
          allowed_environments: ["staging"],
          blast_radius: { max_tenants: 1, max_duration_seconds: 0, recoverable_without_human: true },
          rollback_action: "noop",
          linked_runbook: "noop",
          prerequisite_scenario_ids: [],
        })
      ).toThrow(/max_duration_seconds/);
    });

    it("rejects self-referencing prerequisite", () => {
      expect(() =>
        chaosDrillSchedulerEngine.registerScenario({
          id: "SELF-REF",
          category: "latency_injection",
          name: "bad",
          description: "bad",
          severity: "low",
          cadence: "weekly",
          allowed_environments: ["staging"],
          blast_radius: { max_tenants: 1, max_duration_seconds: 60, recoverable_without_human: true },
          rollback_action: "noop",
          linked_runbook: "noop",
          prerequisite_scenario_ids: ["SELF-REF"],
        })
      ).toThrow(/cannot require itself/);
    });

    it("rejects unknown prerequisite id", () => {
      expect(() =>
        chaosDrillSchedulerEngine.registerScenario({
          id: "UNKNOWN-PREREQ",
          category: "latency_injection",
          name: "bad",
          description: "bad",
          severity: "low",
          cadence: "weekly",
          allowed_environments: ["staging"],
          blast_radius: { max_tenants: 1, max_duration_seconds: 60, recoverable_without_human: true },
          rollback_action: "noop",
          linked_runbook: "noop",
          prerequisite_scenario_ids: ["DOES-NOT-EXIST"],
        })
      ).toThrow(/Unknown prerequisite/);
    });
  });

  describe("schedule", () => {
    it("rejects scheduling in disallowed environment", () => {
      expect(() =>
        chaosDrillSchedulerEngine.schedule({
          scenario_id: "CHAOS-AUDIT-GAP",
          scheduled_for: Date.now() + 1000,
          environment: "production",
        })
      ).toThrow(/not allowed in production/);
    });

    it("blocks DR failover when backup-tamper prerequisite has not passed", () => {
      expect(() =>
        chaosDrillSchedulerEngine.schedule({
          scenario_id: "CHAOS-DR-FAILOVER",
          scheduled_for: Date.now() + 1000,
          environment: "staging",
        })
      ).toThrow(/Prerequisite not met: CHAOS-BACKUP-TAMPER/);
    });

    it("allows DR failover once prerequisite has a passing execution", () => {
      // Run backup tamper to passed
      const tamper = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-BACKUP-TAMPER",
        scheduled_for: Date.now() + 1000,
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(tamper.id);
      chaosDrillSchedulerEngine.completeExecution({
        id: tamper.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 90, rollback_invoked: false },
      });
      const dr = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DR-FAILOVER",
        scheduled_for: Date.now() + 2000,
        environment: "staging",
      });
      expect(dr.status).toBe("planned");
    });
  });

  describe("execution lifecycle", () => {
    it("planned → running → passed lifecycle", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: Date.now(),
        environment: "staging",
      });
      const started = chaosDrillSchedulerEngine.startExecution(e.id);
      expect(started.status).toBe("running");
      expect(started.started_at).not.toBeNull();
      const completed = chaosDrillSchedulerEngine.completeExecution({
        id: e.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 2, actual_duration_seconds: 200, rollback_invoked: false },
      });
      expect(completed.status).toBe("passed");
      expect(completed.findings.length).toBe(0);
    });

    it("cannot start an execution that is already running", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: Date.now(),
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(e.id);
      expect(() => chaosDrillSchedulerEngine.startExecution(e.id)).toThrow(/not planned/);
    });

    it("cannot complete an execution that hasn't started", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: Date.now(),
        environment: "staging",
      });
      expect(() =>
        chaosDrillSchedulerEngine.completeExecution({
          id: e.id,
          status: "passed",
          observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10, rollback_invoked: false },
        })
      ).toThrow(/not running/);
    });

    it("flags blast-radius overflow when observed tenants exceed cap", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY", // cap: 5 tenants, 300s
        scheduled_for: Date.now(),
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(e.id);
      const done = chaosDrillSchedulerEngine.completeExecution({
        id: e.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 9, actual_duration_seconds: 200, rollback_invoked: false },
      });
      expect(done.findings.some(f => f.includes("BLAST_RADIUS_EXCEEDED"))).toBe(true);
    });

    it("flags duration overflow when observed runtime exceeds cap", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY", // cap: 300s
        scheduled_for: Date.now(),
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(e.id);
      const done = chaosDrillSchedulerEngine.completeExecution({
        id: e.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 1, actual_duration_seconds: 999, rollback_invoked: false },
      });
      expect(done.findings.some(f => f.includes("DURATION_EXCEEDED"))).toBe(true);
    });
  });

  describe("coverage report", () => {
    it("reports healthy when all scenarios have recent passing drills", () => {
      const now = Date.now();
      for (const s of chaosDrillSchedulerEngine.listScenarios()) {
        // Walk around DR failover's prerequisite: do backup-tamper first
        if (s.id === "CHAOS-DR-FAILOVER") continue;
      }
      // Pass every non-DR scenario
      for (const s of chaosDrillSchedulerEngine.listScenarios()) {
        if (s.id === "CHAOS-DR-FAILOVER") continue;
        const env = s.allowed_environments[0];
        const e = chaosDrillSchedulerEngine.schedule({
          scenario_id: s.id,
          scheduled_for: now - 1000,
          environment: env,
        });
        chaosDrillSchedulerEngine.startExecution(e.id, now - 500);
        chaosDrillSchedulerEngine.completeExecution({
          id: e.id,
          status: "passed",
          observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10, rollback_invoked: false },
          now,
        });
      }
      // Now DR failover prerequisite is satisfied
      const drEnv = chaosDrillSchedulerEngine.getScenario("CHAOS-DR-FAILOVER")!.allowed_environments[0];
      const dr = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DR-FAILOVER",
        scheduled_for: now - 1000,
        environment: drEnv,
      });
      chaosDrillSchedulerEngine.startExecution(dr.id, now - 500);
      chaosDrillSchedulerEngine.completeExecution({
        id: dr.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10000, rollback_invoked: false },
        now,
      });

      const report = chaosDrillSchedulerEngine.generateCoverageReport(90, now);
      expect(report.overall_health).toBe("healthy");
      expect(report.scenarios_with_recent_passing_drill).toBe(report.scenario_count);
      expect(report.scenarios_overdue.length).toBe(0);
    });

    it("reports at_risk when a critical/high scenario is overdue", () => {
      // No executions → every weekly+monthly+quarterly scenario is overdue relative to never-passed reference.
      const report = chaosDrillSchedulerEngine.generateCoverageReport(90);
      expect(report.overall_health).toBe("at_risk");
      const overdueIds = report.scenarios_overdue.map(o => o.scenario_id);
      expect(overdueIds).toContain("CHAOS-AUDIT-GAP"); // critical severity
    });

    it("reports degraded when a scenario has a recent failure but no critical overdue", () => {
      const now = Date.now();
      // Pass every non-DR scenario
      for (const s of chaosDrillSchedulerEngine.listScenarios()) {
        if (s.id === "CHAOS-DR-FAILOVER") continue;
        const env = s.allowed_environments[0];
        const e = chaosDrillSchedulerEngine.schedule({
          scenario_id: s.id,
          scheduled_for: now - 1000,
          environment: env,
        });
        chaosDrillSchedulerEngine.startExecution(e.id, now - 500);
        chaosDrillSchedulerEngine.completeExecution({
          id: e.id,
          status: "passed",
          observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10, rollback_invoked: false },
          now,
        });
      }
      // Pass DR scenario
      const drEnv = chaosDrillSchedulerEngine.getScenario("CHAOS-DR-FAILOVER")!.allowed_environments[0];
      const dr = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DR-FAILOVER",
        scheduled_for: now - 1000,
        environment: drEnv,
      });
      chaosDrillSchedulerEngine.startExecution(dr.id, now - 500);
      chaosDrillSchedulerEngine.completeExecution({
        id: dr.id,
        status: "passed",
        observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10000, rollback_invoked: false },
        now,
      });
      // Now fail one low-severity scenario
      const e2 = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: now,
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(e2.id, now);
      chaosDrillSchedulerEngine.completeExecution({
        id: e2.id,
        status: "failed",
        observed_blast_radius: { affected_tenants: 1, actual_duration_seconds: 60, rollback_invoked: true },
        now: now + 1000,
      });

      const report = chaosDrillSchedulerEngine.generateCoverageReport(90, now + 2000);
      // Previous CHAOS-DISP-LATENCY pass still counts as recent, but there's a recent failure.
      expect(report.overall_health).toBe("degraded");
      expect(report.scenarios_with_recent_failure).toBe(1);
    });
  });

  describe("skip workflow", () => {
    it("skipping records reason and prevents restart", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: Date.now(),
        environment: "staging",
      });
      const skipped = chaosDrillSchedulerEngine.skipExecution(e.id, "on-call unavailable");
      expect(skipped.status).toBe("skipped");
      expect(skipped.findings.some(f => f.includes("on-call unavailable"))).toBe(true);
      expect(() => chaosDrillSchedulerEngine.startExecution(e.id)).toThrow(/not planned/);
    });
  });

  describe("stats", () => {
    it("computes pass_rate correctly over passed+failed only", () => {
      const now = Date.now();
      // 2 passes, 1 failure → 2/3 = 0.667
      for (let i = 0; i < 2; i++) {
        const e = chaosDrillSchedulerEngine.schedule({
          scenario_id: "CHAOS-DISP-LATENCY",
          scheduled_for: now + i,
          environment: "staging",
        });
        chaosDrillSchedulerEngine.startExecution(e.id);
        chaosDrillSchedulerEngine.completeExecution({
          id: e.id,
          status: "passed",
          observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10, rollback_invoked: false },
        });
      }
      const f = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: now + 100,
        environment: "staging",
      });
      chaosDrillSchedulerEngine.startExecution(f.id);
      chaosDrillSchedulerEngine.completeExecution({
        id: f.id,
        status: "failed",
        observed_blast_radius: { affected_tenants: 0, actual_duration_seconds: 10, rollback_invoked: true },
      });
      const stats = chaosDrillSchedulerEngine.getStats();
      expect(stats.executions_total).toBe(3);
      expect(stats.executions_passed).toBe(2);
      expect(stats.executions_failed).toBe(1);
      expect(stats.pass_rate).toBeCloseTo(2 / 3, 3);
    });

    it("pass_rate returns 1 when zero executions (no failures to count against)", () => {
      const stats = chaosDrillSchedulerEngine.getStats();
      expect(stats.pass_rate).toBe(1);
      expect(stats.executions_total).toBe(0);
      expect(stats.open_executions).toBe(0);
    });
  });

  describe("clearAll", () => {
    it("resets executions but preserves default scenario catalog", () => {
      const e = chaosDrillSchedulerEngine.schedule({
        scenario_id: "CHAOS-DISP-LATENCY",
        scheduled_for: Date.now(),
        environment: "staging",
      });
      const result = chaosDrillSchedulerEngine.clearAll();
      expect(result.executions_cleared).toBe(1);
      expect(chaosDrillSchedulerEngine.getExecution(e.id)).toBeNull();
      expect(chaosDrillSchedulerEngine.listScenarios().length).toBe(8); // defaults restored
    });
  });
});
