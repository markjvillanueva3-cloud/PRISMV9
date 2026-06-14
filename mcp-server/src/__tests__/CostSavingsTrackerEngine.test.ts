/**
 * CostSavingsTrackerEngine.test.ts — the genuine engine-test gap in the quoting
 * galaxy (the 1 of 30 cost/quote engines with zero prior test coverage; the
 * other 9 "untested" are integration-covered). Verified 2026-06-09, slot:charlie.
 *
 * Asserts the deterministic savings formulas with REAL reference values computed
 * from the engine's own DEFAULT_COSTS (R9 — these fail if the business logic
 * drifts, not just if a field is present), the persistence round-trip across
 * instances, the cost-config override, the outcome-accuracy math, the reset
 * guard, and the exact error strings. Every instance uses an INJECTED temp store
 * path (the testability refactor this suite validates) so it never touches the
 * operator's real ~/.prism/savings.json. `calculate()` returns
 * Record<string, unknown>, so result fields are read directly — no `as any`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { CostSavingsTrackerEngine } from "../engines/CostSavingsTrackerEngine.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

function freshEngine(tag: string) {
  const storePath = join(tmpdir(), `prism-savings-test-${tag}-${process.pid}.json`);
  rmSync(storePath, { force: true });
  return { engine: new CostSavingsTrackerEngine({ storePath }), storePath };
}

describe("CostSavingsTrackerEngine — savings estimation formulas (deterministic)", () => {
  const { engine, storePath } = freshEngine("formulas");
  afterAll(() => { try { rmSync(storePath); } catch { /* ignore */ } });

  // Reference values derived from DEFAULT_COSTS: avgToolCost=25, hourlyRate=85,
  // avgCrashCost=500, avgPartCost=75, costPerKWh=0.12, avgSpindlePower=7.5.
  it("crash_prevention → avgCrashCost ($500)", () => {
    expect(engine.calculate("roi_log", { category: "crash_prevention" }).estimatedSavings).toBe(500);
  });
  it("scrap_avoidance → avgPartCost ($75)", () => {
    expect(engine.calculate("roi_log", { category: "scrap_avoidance" }).estimatedSavings).toBe(75);
  });
  it("utilization → hoursRecovered × hourlyRate (0.5 × 85 = 42.5)", () => {
    expect(engine.calculate("roi_log", { category: "utilization", hoursRecovered: 0.5 }).estimatedSavings).toBeCloseTo(42.5, 6);
  });
  it("cycle_time → (cycleMin × reduction%/100 / 60) × hourlyRate (10×0.12/60×85 = 1.7)", () => {
    expect(engine.calculate("roi_log", { category: "cycle_time", cycleTimeMinutes: 10, reductionPercent: 12 }).estimatedSavings).toBeCloseTo(1.7, 6);
  });
  it("tool_life → avgToolCost × extension%/100 (25 × 0.20 = 5)", () => {
    expect(engine.calculate("roi_log", { category: "tool_life", extensionPercent: 20 }).estimatedSavings).toBeCloseTo(5, 6);
  });
  it("energy → spindlePower × (savedMin/60) × costPerKWh (7.5×5/60×0.12 = 0.075)", () => {
    expect(engine.calculate("roi_log", { category: "energy", savedMinutes: 5 }).estimatedSavings).toBeCloseTo(0.075, 6);
  });
  it("explicit estimatedSavings param overrides the formula", () => {
    expect(engine.calculate("roi_log", { category: "cycle_time", estimatedSavings: 999.99 }).estimatedSavings).toBe(999.99);
  });
});

describe("CostSavingsTrackerEngine — persistence, config, outcome, guards", () => {
  it("round-trips events across instances sharing a store path (totals reload from disk)", () => {
    const storePath = join(tmpdir(), `prism-savings-roundtrip-${process.pid}.json`);
    rmSync(storePath, { force: true });
    const a = new CostSavingsTrackerEngine({ storePath });
    a.calculate("roi_log", { category: "crash_prevention" }); // $500
    a.calculate("roi_log", { category: "scrap_avoidance" });  // $75
    // A fresh instance with the SAME path must load the 2 persisted events.
    const b = new CostSavingsTrackerEngine({ storePath });
    const summary = b.calculate("roi_summary", { period: "month" });
    expect(summary.eventCount).toBe(2);
    expect(summary.totalSavings).toBe(575);
    rmSync(storePath, { force: true });
  });

  it("configureCosts changes subsequent estimates (avgCrashCost 500 → 1000)", () => {
    const { engine, storePath } = freshEngine("configure");
    engine.calculate("roi_configure_costs", { avgCrashCost: 1000 });
    expect(engine.calculate("roi_log", { category: "crash_prevention" }).estimatedSavings).toBe(1000);
    rmSync(storePath, { force: true });
  });

  it("logOutcome records actual-vs-estimated delta + accuracy % (est 75, actual 90)", () => {
    const { engine, storePath } = freshEngine("outcome");
    const logged = engine.calculate("roi_log", { category: "scrap_avoidance" }); // est 75
    const out = engine.calculate("roi_log_outcome", { eventId: String(logged.eventId), actualSavings: 90 });
    expect(out.estimated).toBe(75);
    expect(out.actual).toBe(90);
    expect(out.delta).toBe(15);
    expect(out.accuracy).toBe(120); // 90/75 × 100
    rmSync(storePath, { force: true });
  });

  it("logOutcome on a missing event id fails loud with the exact error (no silent no-op)", () => {
    const { engine, storePath } = freshEngine("outcome-miss");
    const out = engine.calculate("roi_log_outcome", { eventId: "nope", actualSavings: 1 });
    expect(out.error).toBe("Event nope not found");
    rmSync(storePath, { force: true });
  });

  it("resetPeriod without confirm warns + preserves data; with confirm archives it", () => {
    const { engine, storePath } = freshEngine("reset");
    engine.calculate("roi_log", { category: "crash_prevention" }); // $500
    const guarded = engine.calculate("roi_reset", {});
    expect(guarded.warning).toBe("This will archive current data. Pass confirm: true to proceed.");
    expect(guarded.currentEvents).toBe(1); // not wiped without confirm
    const done = engine.calculate("roi_reset", { confirm: true });
    expect(done.reset).toBe(true);
    expect(done.archivedEvents).toBe(1);
    expect(done.archivedSavings).toBe(500);
    rmSync(storePath, { force: true });
  });

  it("unknown action returns the exact structured error (never throws)", () => {
    const { engine, storePath } = freshEngine("unknown");
    expect(engine.calculate("bogus_action", {}).error).toBe("Unknown action: bogus_action");
    rmSync(storePath, { force: true });
  });
});
