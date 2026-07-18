/**
 * U-FE-DISPATCH-BOARD-REWIRE + oee-six-losses second-pass rewire (slot:sierra).
 *
 * The /erp/dispatch-board and /erp/oee-six-losses routes were first-pass 501'd (U-FE-ROUTE-P0-ZERO),
 * then rewired to the REAL existing actions they were missing:
 *   - /erp/dispatch-board   -> prism_business:dispatch_get_all_queues (MachineDispatchEngine.getAllQueues)
 *   - /erp/oee-six-losses   -> prism_business:oee_calculate (OEECalculatorEngine.calculate -> six_big_losses)
 *
 * The route->action wiring is enforced by fe-route-contract-gate.test.ts (audit, 0 P0). This file verifies
 * the DATA those endpoints return is real, with reference values / algebraic invariants (R9) -- not stubs.
 */
import { describe, it, expect } from "vitest";
import { oeeCalculatorEngine } from "../engines/OEECalculatorEngine.js";
import { machineDispatchEngine } from "../engines/MachineDispatchEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";
import { nonConformanceAndCorrectiveActionEngine } from "../engines/NonConformanceAndCorrectiveActionEngine.js";

describe("oee-six-losses endpoint data (OEECalculatorEngine.calculate -> six_big_losses)", () => {
  // Reference shift: 480 min planned, 30 planned downtime, 50 unplanned, 350 produced / 340 good (10 rejects).
  const refInput = {
    planned_production_time_min: 480,
    actual_run_time_min: 400,
    planned_downtime_min: 30,
    unplanned_downtime_min: 50,
    ideal_cycle_time_sec: 60,
    actual_cycle_time_sec: 68,
    total_parts_produced: 350,
    good_parts: 340,
  };

  it("splits unplanned downtime into the breakdowns(60%)/setup(40%) availability losses", () => {
    const r = oeeCalculatorEngine.calculate(refInput);
    // Engine: breakdowns = unplanned*0.6, setup_adjustment = unplanned*0.4 (rounded to 0.1 min).
    expect(r.six_big_losses.breakdowns_min).toBeCloseTo(30, 1);     // 50 * 0.6
    expect(r.six_big_losses.setup_adjustment_min).toBeCloseTo(20, 1); // 50 * 0.4
    // Algebraic invariant: the two availability losses partition the unplanned downtime.
    expect(r.six_big_losses.breakdowns_min + r.six_big_losses.setup_adjustment_min)
      .toBeCloseTo(refInput.unplanned_downtime_min, 1);
  });

  it("splits rejects into startup(20%)/production quality losses that sum to total rejects", () => {
    const r = oeeCalculatorEngine.calculate(refInput);
    const totalRejects = refInput.total_parts_produced - refInput.good_parts; // 10
    expect(r.six_big_losses.startup_rejects).toBe(2);       // round(10 * 0.2)
    expect(r.six_big_losses.production_rejects).toBe(8);    // 10 - 2
    expect(r.six_big_losses.startup_rejects + r.six_big_losses.production_rejects).toBe(totalRejects);
  });

  it("returns OEE component percentages in valid range with OEE = A*P*Q", () => {
    const r = oeeCalculatorEngine.calculate(refInput);
    for (const pct of [r.availability_pct, r.performance_pct, r.quality_pct, r.oee_pct]) {
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
    // quality = good/total (standard OEE): 340/350 = 97.14%.
    expect(r.quality_pct).toBeCloseTo(97.14, 1);
    // OEE is the product of the three components (within rounding).
    const product = (r.availability_pct / 100) * (r.performance_pct / 100) * (r.quality_pct / 100) * 100;
    expect(r.oee_pct).toBeCloseTo(product, 0);
  });

  it("exposes all six big losses (no missing TPM loss category)", () => {
    const l = oeeCalculatorEngine.calculate(refInput).six_big_losses;
    for (const k of ["breakdowns_min", "setup_adjustment_min", "minor_stops_min", "reduced_speed_min", "startup_rejects", "production_rejects"]) {
      expect(typeof (l as Record<string, number>)[k]).toBe("number");
    }
  });
});

describe("dispatch-board endpoint data (MachineDispatchEngine.getAllQueues -> PlanningBoard)", () => {
  it("returns a planning board with machines, a numeric total, and an ISO timestamp", () => {
    const board = machineDispatchEngine.getAllQueues();
    expect(Array.isArray(board.machines)).toBe(true);
    expect(typeof board.total_queued_jobs).toBe("number");
    expect(board.total_queued_jobs).toBeGreaterThanOrEqual(0);
    // timestamp is a parseable ISO string.
    expect(Number.isNaN(Date.parse(board.timestamp))).toBe(false);
  });

  it("reflects a queued job in the board total (whole-shop view, not per-machine)", () => {
    const before = machineDispatchEngine.getAllQueues().total_queued_jobs;
    machineDispatchEngine.queueJob({
      machine_id: "VMC-TEST-01",
      job_id: "JOB-DISPATCH-BOARD-TEST",
      priority: "normal",
      estimated_duration_min: 45,
    } as Parameters<typeof machineDispatchEngine.queueJob>[0]);
    const after = machineDispatchEngine.getAllQueues();
    expect(after.total_queued_jobs).toBe(before + 1);
    expect(after.machines.some((m) => m.machine_id === "VMC-TEST-01")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// root_cause_list -- NEW prism_business action. Round-tripped THROUGH the real
// dispatcher (the SUT = the real registerBusinessDispatcher switch + the real
// NCCA engine; nothing under test is mocked -- we only CAPTURE the tool handler
// the dispatcher registers so we can invoke it). Coverage per comprehensive-build.
// ---------------------------------------------------------------------------
function businessHandler() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const toolCapture = { tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; } };
  registerBusinessDispatcher(toolCapture as unknown as Parameters<typeof registerBusinessDispatcher>[0]);
  if (!handler) throw new Error("prism_business tool not registered");
  return handler;
}
function extractText(res: unknown): string {
  const r = res as { content?: Array<{ text?: string }>; text?: string };
  if (r?.content?.[0]?.text) return r.content[0].text;
  if (r?.text) return r.text;
  throw new Error("unexpected dispatcher response shape: " + JSON.stringify(res).slice(0, 200));
}
async function callBusiness(action: string, params: Record<string, unknown> = {}) {
  const res = await businessHandler()({ action, params });
  return JSON.parse(extractText(res)) as { success?: boolean; data: { count: number; root_causes: Array<Record<string, unknown>> } };
}
function seedRootCauseNC(rootCause: string, source: "internal_audit" | "customer_complaint" = "internal_audit"): string {
  const nc = nonConformanceAndCorrectiveActionEngine.recordNC({
    source, severity: "major",
    description: "Test NC seeded for root_cause_list coverage",
    reported_by_employee_id: "EMP-RC-TEST",
  });
  nonConformanceAndCorrectiveActionEngine.recordContainment({
    ncr_id: nc.id, team_members: ["EMP-RC-TEST"],
    problem_definition: "Containment problem definition for the seeded NC",
    containment_action: "Quarantined the affected lot and flagged downstream ops",
  });
  nonConformanceAndCorrectiveActionEngine.recordRootCause({ ncr_id: nc.id, root_cause: rootCause });
  return nc.id;
}

describe("root_cause_list (NEW prism_business action, real dispatcher round-trip)", () => {
  it("happy: returns the NC's recorded d4_root_cause mapped to the root-cause shape", async () => {
    const id = seedRootCauseNC("Spindle bearing wear caused the dimensional drift on op 30");
    const out = await callBusiness("root_cause_list");
    const hit = out.data.root_causes.find((r) => r.ncr_id === id);
    expect(hit?.ncr_id).toBe(id);
    expect(hit?.root_cause).toBe("Spindle bearing wear caused the dimensional drift on op 30");
    expect(hit?.status).toBe("in_root_cause");
    expect(Number.isNaN(Date.parse(String(hit?.recorded_at)))).toBe(false);
    expect(out.data.count).toBe(out.data.root_causes.length);
  });

  it("failure mode -- EXCLUDES an open NC with no root cause; every returned row HAS one", async () => {
    const openNc = nonConformanceAndCorrectiveActionEngine.recordNC({
      source: "internal_audit", severity: "minor",
      description: "Open NC with no root cause recorded yet",
      reported_by_employee_id: "EMP-RC-TEST",
    });
    const out = await callBusiness("root_cause_list");
    expect(out.data.root_causes.some((r) => r.ncr_id === openNc.id)).toBe(false);
    expect(out.data.root_causes.every((r) => typeof r.root_cause === "string" && (r.root_cause as string).length >= 10)).toBe(true);
  });

  it("failure mode -- status filter narrows the set (seeded NCs are in_root_cause, not closed)", async () => {
    seedRootCauseNC("Coolant concentration below spec for the 17-4PH lot");
    const all = await callBusiness("root_cause_list");
    const closedOnly = await callBusiness("root_cause_list", { status: "closed" });
    expect(closedOnly.data.count).toBeLessThan(all.data.count);
    expect(closedOnly.data.root_causes.every((r) => r.status === "closed")).toBe(true);
  });

  it("adversarial: no params -> still returns the seeded root cause, count invariant holds", async () => {
    const id = seedRootCauseNC("Fixture clamp slipped under load on the second op");
    const out = await callBusiness("root_cause_list", {});
    expect(out.data.root_causes.some((r) => r.ncr_id === id)).toBe(true);
    expect(out.data.count).toBe(out.data.root_causes.length);
  });

  it("adversarial: unknown source filter -> empty result, no crash", async () => {
    const out = await callBusiness("root_cause_list", { source: "no_such_source_xyz" });
    expect(out.data.count).toBe(0);
    expect(out.data.root_causes).toEqual([]);
  });
});
