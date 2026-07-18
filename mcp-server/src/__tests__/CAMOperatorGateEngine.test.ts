/**
 * CAMOperatorGateEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-OPERATOR-GATE
 */
import { describe, it, expect } from "vitest";
import { CAMOperatorGateEngine } from "../engines/CAMOperatorGateEngine.js";
import type { GateItem } from "../engines/CAMOperatorGateEngine.js";

const engine = new CAMOperatorGateEngine();

const ALL_PASS: Record<GateItem, boolean> = {
  wcs_set: true,
  tool_offsets_loaded: true,
  stock_clamped: true,
  doors_closed: true,
  coolant_ready: true,
  spindle_warm: true,
  program_reviewed: true,
  dry_run_done: true,
  first_part_inspected: true,
  tool_breakage_check: true,
  e_stop_reachable: true,
  tool_wear_within_limits: true,
};

describe("CAMOperatorGateEngine", () => {

  it("all items PASS → gate passes with S(x)=1.0", () => {
    const r = engine.evaluate({ items: ALL_PASS });
    expect(r.passed).toBe(true);
    expect(r.sxScore).toBeCloseTo(1.0, 3);
    expect(r.blockingFailures.length).toBe(0);
  });

  it("single blocking failure (wcs_set) → gate blocks, S(x)=0.80", () => {
    const items = { ...ALL_PASS, wcs_set: false };
    const r = engine.evaluate({ items });
    expect(r.passed).toBe(false);
    expect(r.sxScore).toBeCloseTo(0.80, 3);
    expect(r.blockingFailures).toContain("wcs_set");
  });

  it("missing item treated as FAIL", () => {
    const items: Partial<Record<GateItem, boolean>> = { ...ALL_PASS };
    delete items.wcs_set;
    const r = engine.evaluate({ items });
    expect(r.blockingFailures).toContain("wcs_set");
  });

  it("warn_high failure only → 0.05 penalty (still passes threshold)", () => {
    const items = { ...ALL_PASS, coolant_ready: false };
    const r = engine.evaluate({ items });
    expect(r.sxScore).toBeCloseTo(0.95, 3);
    // Below 0.98 shop_floor → fails the threshold, NOT blocking
    expect(r.passed).toBe(false);
    expect(r.warnFailures).toContain("coolant_ready");
    expect(r.blockingFailures.length).toBe(0);
  });

  it("warn_low failure only → 0.02 penalty, still passes (S(x)=0.98)", () => {
    const items = { ...ALL_PASS, spindle_warm: false };
    const r = engine.evaluate({ items });
    expect(r.sxScore).toBeCloseTo(0.98, 3);
    expect(r.passed).toBe(true);
    expect(r.warnFailures).toContain("spindle_warm");
  });

  it("doors_closed is BLOCKING (safety critical)", () => {
    const items = { ...ALL_PASS, doors_closed: false };
    const r = engine.evaluate({ items });
    expect(r.passed).toBe(false);
    expect(r.blockingFailures).toContain("doors_closed");
  });

  it("e_stop_reachable is BLOCKING", () => {
    const items = { ...ALL_PASS, e_stop_reachable: false };
    const r = engine.evaluate({ items });
    expect(r.blockingFailures).toContain("e_stop_reachable");
  });

  it("multiple blocking failures stack penalties", () => {
    const items = { ...ALL_PASS, wcs_set: false, doors_closed: false };
    const r = engine.evaluate({ items });
    expect(r.sxScore).toBeCloseTo(0.60, 3);
    expect(r.blockingFailures.length).toBe(2);
  });

  it("S(x) clamped to >=0 for catastrophic checklist (every blocking failure)", () => {
    const items: Record<GateItem, boolean> = { ...ALL_PASS };
    for (const k of Object.keys(items) as GateItem[]) items[k] = false;
    const r = engine.evaluate({ items });
    expect(r.sxScore).toBeGreaterThanOrEqual(0);
    expect(r.passed).toBe(false);
  });

  it("acknowledgedBlocks list records but does NOT clear blocks", () => {
    const items = { ...ALL_PASS, wcs_set: false };
    const r = engine.evaluate({ items, acknowledgedBlocks: ["wcs_set"] });
    expect(r.passed).toBe(false);
    expect(r.acknowledgedButStillBlocked).toContain("wcs_set");
  });

  it("items() returns all 12 items with severity assignments", () => {
    const items = engine.items();
    expect(items.length).toBe(12);
    expect(items.find((i) => i.item === "wcs_set")?.severity).toBe("block");
    expect(items.find((i) => i.item === "coolant_ready")?.severity).toBe("warn_high");
    expect(items.find((i) => i.item === "spindle_warm")?.severity).toBe("warn_low");
  });

  it("threshold() returns shop_floor 0.98", () => {
    expect(engine.threshold()).toBe(0.98);
  });

  it("blocking severity outranks warn (single blocking fails even with warn pass)", () => {
    const items = { ...ALL_PASS, wcs_set: false, coolant_ready: true };
    const r = engine.evaluate({ items });
    expect(r.passed).toBe(false);
    expect(r.blockingFailures.length).toBe(1);
  });

  it("rationale string is informative for PASS + BLOCK + threshold-FAIL", () => {
    const pass = engine.evaluate({ items: ALL_PASS });
    expect(pass.rationale).toMatch(/ready to cut/i);

    const block = engine.evaluate({ items: { ...ALL_PASS, wcs_set: false } });
    expect(block.rationale).toMatch(/blocking|wcs_set/i);

    const threshFail = engine.evaluate({ items: { ...ALL_PASS, coolant_ready: false } });
    expect(threshFail.rationale).toMatch(/below|gate/i);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes evaluate + items + threshold", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("evaluate");
    expect(names).toContain("items");
    expect(names).toContain("threshold");
  });
});
