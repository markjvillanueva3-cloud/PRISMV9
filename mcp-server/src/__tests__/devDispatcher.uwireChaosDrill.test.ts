/**
 * devDispatcher U-WIRE-CHAOS round-trip tests -- ChaosDrillSchedulerEngine.
 *
 * Validates the 4 new read actions (chaos_stats / chaos_scenarios /
 * chaos_executions / chaos_coverage) wire through prism_dev, beside the
 * DisasterRecovery + BackupRestoreDrill resilience surfaces. Reference values
 * are read from the engine's DEFAULT_SCENARIOS catalog (8 scenarios:
 * weekly 3 / monthly 3 / quarterly 2; severities low 2 / medium 1 / high 2 /
 * critical 3).
 *
 * Hermetic + REAL: the engine is fully in-memory (no disk), so tests drive the
 * exported singleton and normalize state with clearAll() in beforeEach -- no
 * mock of the SUT. Two layers: (1) engine behavioral incl. an execution
 * lifecycle that proves coverage/stats reflect real drill outcomes, and (2) a
 * live registerDevDispatcher() handler round-trip proving the action enum +
 * schema gate + switch route to the engine and back as JSON.
 *
 * Wired slot:papa 2026-06-11 /startup-papa /loop /goal (wire-unwired campaign,
 * continues the DR/Backup/KillSwitch/FeedbackCollector set).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-CHAOS
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { chaosDrillSchedulerEngine } from "../engines/ChaosDrillSchedulerEngine.js";

const NOW = 1_700_000_000_000;
const DAY = 24 * 3600 * 1000;

function freshCatalog() {
  chaosDrillSchedulerEngine.clearAll(); // reset to the 8 default scenarios, 0 executions
}

/** Schedule + run a CHAOS-DISP-LATENCY drill to a passing completion at `at`. */
function passDispLatency(at: number) {
  const e = chaosDrillSchedulerEngine.schedule({
    scenario_id: "CHAOS-DISP-LATENCY",
    scheduled_for: at,
    environment: "staging",
  });
  chaosDrillSchedulerEngine.startExecution(e.id, at);
  return chaosDrillSchedulerEngine.completeExecution({
    id: e.id,
    status: "passed",
    observed_blast_radius: { affected_tenants: 1, actual_duration_seconds: 100, rollback_invoked: false },
    now: at,
  });
}

describe("U-WIRE-CHAOS -- default catalog read surface (reference values)", () => {
  beforeEach(freshCatalog);

  it("getStats reports the 8 seeded scenarios grouped by cadence", () => {
    const s = chaosDrillSchedulerEngine.getStats();
    expect(s.scenarios_registered).toBe(8);
    expect(s.scenarios_by_cadence).toEqual({ weekly: 3, monthly: 3, quarterly: 2, ad_hoc: 0 });
    expect(s.executions_total).toBe(0);
    expect(s.pass_rate).toBe(1); // no executions -> vacuous 1
    expect(s.open_executions).toBe(0);
    expect(s.latest_execution_at).toBe(null);
  });

  it("listScenarios filters across cadence / severity / category (3 spanning axes)", () => {
    expect(chaosDrillSchedulerEngine.listScenarios().length).toBe(8);
    expect(chaosDrillSchedulerEngine.listScenarios({ cadence: "weekly" }).length).toBe(3);
    expect(chaosDrillSchedulerEngine.listScenarios({ cadence: "quarterly" }).length).toBe(2);
    expect(chaosDrillSchedulerEngine.listScenarios({ severity: "critical" }).length).toBe(3);
    expect(chaosDrillSchedulerEngine.listScenarios({ category: "dr_failover" }).length).toBe(1);
  });

  it("listScenarios with a valid-but-unused category returns empty (failure mode)", () => {
    expect(chaosDrillSchedulerEngine.listScenarios({ category: "capacity_saturation" }).length).toBe(0);
  });

  it("listExecutions is empty on a fresh catalog", () => {
    expect(chaosDrillSchedulerEngine.listExecutions().length).toBe(0);
  });

  it("coverage on a never-drilled catalog is at_risk (5 high/critical overdue)", () => {
    const cov = chaosDrillSchedulerEngine.generateCoverageReport(90, NOW);
    expect(cov.scenario_count).toBe(8);
    expect(cov.scenarios_with_recent_passing_drill).toBe(0);
    expect(cov.scenarios_overdue.length).toBe(8);
    expect(cov.overall_health).toBe("at_risk");
    expect(cov.findings.some((f) => /5 high\/critical/.test(f))).toBe(true);
  });
});

describe("U-WIRE-CHAOS -- execution lifecycle reflected in reads (adversarial / boundary)", () => {
  beforeEach(freshCatalog);

  it("a passed drill increments executions_passed and keeps pass_rate at 1", () => {
    passDispLatency(NOW);
    const s = chaosDrillSchedulerEngine.getStats();
    expect(s.executions_total).toBe(1);
    expect(s.executions_passed).toBe(1);
    expect(s.executions_failed).toBe(0);
    expect(s.pass_rate).toBe(1);
    expect(s.open_executions).toBe(0);
    expect(s.latest_execution_at).toBe(NOW);
  });

  it("a pass WITHIN the weekly window clears that scenario's overdue status", () => {
    passDispLatency(NOW);
    const cov = chaosDrillSchedulerEngine.generateCoverageReport(90, NOW + DAY); // 1d < 7d weekly
    expect(cov.scenarios_overdue.some((c) => c.scenario_id === "CHAOS-DISP-LATENCY")).toBe(false);
    expect(cov.scenarios_with_recent_passing_drill).toBe(1);
    expect(cov.overall_health).toBe("at_risk"); // 5 critical/high still overdue
  });

  it("a pass BEYOND the weekly window goes overdue again (boundary: 10d - 7d = 3d)", () => {
    passDispLatency(NOW);
    const cov = chaosDrillSchedulerEngine.generateCoverageReport(90, NOW + 10 * DAY);
    const dl = cov.scenarios_overdue.find((c) => c.scenario_id === "CHAOS-DISP-LATENCY");
    expect(dl?.scenario_id).toBe("CHAOS-DISP-LATENCY");
    expect(dl?.days_overdue).toBe(3);
  });
});

describe("U-WIRE-CHAOS -- fail-loud guards (R12)", () => {
  beforeEach(freshCatalog);

  it("schedule rejects an unknown scenario", () => {
    expect(() =>
      chaosDrillSchedulerEngine.schedule({ scenario_id: "NOPE", scheduled_for: NOW, environment: "staging" }),
    ).toThrow(/Unknown scenario/);
  });

  it("schedule rejects a disallowed environment (DISP-LATENCY not allowed in production)", () => {
    expect(() =>
      chaosDrillSchedulerEngine.schedule({ scenario_id: "CHAOS-DISP-LATENCY", scheduled_for: NOW, environment: "production" }),
    ).toThrow(/not allowed in production/);
  });

  it("schedule enforces the prerequisite gate (DR-FAILOVER needs BACKUP-TAMPER passed)", () => {
    expect(() =>
      chaosDrillSchedulerEngine.schedule({ scenario_id: "CHAOS-DR-FAILOVER", scheduled_for: NOW, environment: "staging" }),
    ).toThrow(/prerequisite/i);
  });

  it("startExecution rejects an unknown execution id", () => {
    expect(() => chaosDrillSchedulerEngine.startExecution("nope", NOW)).toThrow(/Unknown execution/);
  });
});

describe("U-WIRE-CHAOS -- live dispatcher round-trip (prism_dev handler)", () => {
  let handler: (a: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;

  beforeAll(async () => {
    const { registerDevDispatcher } = await import("../tools/dispatchers/devDispatcher.js");
    // Capture the handler (last arg of server.tool) without depending on its arity.
    const server = { tool: (...args: unknown[]) => { handler = args[args.length - 1] as typeof handler; } };
    registerDevDispatcher(server);
  });
  beforeEach(freshCatalog);

  async function call(action: string, params?: Record<string, unknown>) {
    const res = await handler({ action, params });
    return JSON.parse(res.content[0].text) as Record<string, any>;
  }

  it("chaos_stats round-trips the seeded catalog through prism_dev", async () => {
    const out = await call("chaos_stats", {});
    expect(out.scenarios_registered).toBe(8);
    expect(out.scenarios_by_cadence.weekly).toBe(3);
  });

  it("chaos_scenarios round-trips + applies the cadence filter", async () => {
    expect((await call("chaos_scenarios", {})).scenarios.length).toBe(8);
    expect((await call("chaos_scenarios", { cadence: "weekly" })).scenarios.length).toBe(3);
  });

  it("chaos_coverage round-trips the at_risk report", async () => {
    const out = await call("chaos_coverage", {});
    expect(out.scenario_count).toBe(8);
    expect(out.overall_health).toBe("at_risk");
  });

  it("chaos_executions round-trips a scheduled execution (non-empty array survives slimResponse)", async () => {
    chaosDrillSchedulerEngine.schedule({ scenario_id: "CHAOS-DISP-LATENCY", scheduled_for: NOW, environment: "staging" });
    const out = await call("chaos_executions", {});
    expect(Array.isArray(out.executions)).toBe(true);
    expect(out.executions.length).toBe(1);
    expect(out.executions[0].scenario_id).toBe("CHAOS-DISP-LATENCY");
  });

  it("an unknown dev action returns not_implemented from the default branch", async () => {
    const out = await call("chaos_bogus", {});
    expect(out.error).toBe("not_implemented");
    expect(out.action).toBe("chaos_bogus");
  });
});
