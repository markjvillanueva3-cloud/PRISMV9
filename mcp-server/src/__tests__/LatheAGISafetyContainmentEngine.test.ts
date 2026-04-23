/**
 * LatheAGISafetyContainmentEngine tests — U-LTH61
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LatheAGISafetyContainmentEngine } from "../engines/LatheAGISafetyContainmentEngine.js";

function makeEngine() {
  return new LatheAGISafetyContainmentEngine();
}

describe("LatheAGISafetyContainmentEngine — physics envelope", () => {
  it("Vc above hard max for P blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "P", vc_m_min: 800, fz_mm: 0.3, ap_mm: 2 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "vc_above_hard_max")).toBe(true);
  });

  it("Vc below hard min for S blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "S", vc_m_min: 1, fz_mm: 0.2, ap_mm: 1 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "vc_below_hard_min")).toBe(true);
  });

  it("Vc in soft zone emits warning, does not block", () => {
    const engine = makeEngine();
    // P max_soft=400 max_hard=600 — Vc=450 is soft warning
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "P", vc_m_min: 450, fz_mm: 0.3, ap_mm: 2 },
    });
    expect(r.passed).toBe(true);
    expect(r.warning_count).toBeGreaterThanOrEqual(1);
    expect(r.checks.some((c) => c.check_id === "vc_above_soft_max")).toBe(true);
  });

  it("fz above hard max blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "P", vc_m_min: 180, fz_mm: 1.0, ap_mm: 2 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "fz_above_hard_max")).toBe(true);
  });

  it("non-positive fz blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "P", vc_m_min: 180, fz_mm: 0, ap_mm: 2 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "fz_nonpositive")).toBe(true);
  });

  it("Kienzle Fc exceeding spindle torque blocks", () => {
    const engine = makeEngine();
    // S iso (kc1.1=2800): ap=10, fz=0.4 → Fc ≈ 2800 * 10 * 0.4^0.73 ≈ 14000 N > 5000
    const r = engine.check({
      category: "physics",
      speed_feed: { iso_group: "S", vc_m_min: 80, fz_mm: 0.4, ap_mm: 10 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "cutting_force_exceeds_spindle")).toBe(true);
  });
});

describe("LatheAGISafetyContainmentEngine — economics", () => {
  it("negative margin blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "economics",
      quote: { unit_price_usd: 50, total_direct_cost_usd: 600, quantity: 10 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "margin_negative")).toBe(true);
  });

  it("margin below 10% emits soft warning", () => {
    const engine = makeEngine();
    // 100 × 10 - 920 = 80 over 1000 = 8% margin
    const r = engine.check({
      category: "economics",
      quote: { unit_price_usd: 100, total_direct_cost_usd: 920, quantity: 10 },
    });
    expect(r.passed).toBe(true);
    expect(r.checks.some((c) => c.check_id === "margin_below_floor")).toBe(true);
  });

  it("margin ≥ 10% passes clean", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "economics",
      quote: { unit_price_usd: 100, total_direct_cost_usd: 700, quantity: 10 },
    });
    expect(r.passed).toBe(true);
    expect(r.warning_count).toBe(0);
  });

  it("zero unit price blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "economics",
      quote: { unit_price_usd: 0, total_direct_cost_usd: 100, quantity: 10 },
    });
    expect(r.passed).toBe(false);
  });
});

describe("LatheAGISafetyContainmentEngine — capacity", () => {
  it("schedule exceeding capacity blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "capacity",
      schedule: { total_busy_min: 20000, fleet_capacity_hours: 100 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "schedule_exceeds_capacity")).toBe(true);
  });

  it("schedule at 95% emits soft warning", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "capacity",
      schedule: { total_busy_min: 95 * 60, fleet_capacity_hours: 100 },
    });
    expect(r.passed).toBe(true);
    expect(r.checks.some((c) => c.check_id === "schedule_near_capacity")).toBe(true);
  });

  it("schedule within 90% passes clean", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "capacity",
      schedule: { total_busy_min: 60 * 60, fleet_capacity_hours: 100 },
    });
    expect(r.passed).toBe(true);
    expect(r.warning_count).toBe(0);
  });
});

describe("LatheAGISafetyContainmentEngine — kinematic", () => {
  it("required live_tool on non-live-tool machine blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "kinematic",
      kinematic: { requires_live_tool: true, machine_has_live_tool: false },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "live_tool_missing")).toBe(true);
  });

  it("required sub_spindle missing blocks", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "kinematic",
      kinematic: { requires_sub_spindle: true, machine_has_sub_spindle: false },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some((c) => c.check_id === "sub_spindle_missing")).toBe(true);
  });

  it("all flags match → passes", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "kinematic",
      kinematic: {
        requires_live_tool: true, machine_has_live_tool: true,
        requires_sub_spindle: true, machine_has_sub_spindle: true,
        requires_y_axis: false, machine_has_y_axis: false,
      },
    });
    expect(r.passed).toBe(true);
    expect(r.checks).toHaveLength(0);
  });
});

describe("LatheAGISafetyContainmentEngine — all-category composite", () => {
  it("combines physics + economics + capacity + kinematic in one call", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "all",
      speed_feed: { iso_group: "P", vc_m_min: 180, fz_mm: 0.3, ap_mm: 2 },
      quote: { unit_price_usd: 100, total_direct_cost_usd: 700, quantity: 10 },
      schedule: { total_busy_min: 30 * 60, fleet_capacity_hours: 100 },
      kinematic: { requires_live_tool: false, machine_has_live_tool: false },
    });
    expect(r.passed).toBe(true);
    expect(r.trace.length).toBeGreaterThanOrEqual(5);
  });

  it("adversarial inputs all fail correctly", () => {
    const engine = makeEngine();
    const r = engine.check({
      category: "all",
      speed_feed: { iso_group: "P", vc_m_min: 2000, fz_mm: 5, ap_mm: 20 },
      quote: { unit_price_usd: 10, total_direct_cost_usd: 500, quantity: 10 },
      schedule: { total_busy_min: 100_000, fleet_capacity_hours: 100 },
      kinematic: { requires_live_tool: true, machine_has_live_tool: false },
    });
    expect(r.passed).toBe(false);
    expect(r.blocking_count).toBeGreaterThanOrEqual(4);
  });
});

describe("LatheAGISafetyContainmentEngine — dispatcher wiring", () => {
  it("lathe_agi_safety_check action wired with handler + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_agi_safety_check"');
    expect(src).toMatch(/case "lathe_agi_safety_check"/);
    expect(src).toContain('"../../engines/LatheAGISafetyContainmentEngine.js"');
    expect(src).toContain('case "latheAGISafety"');
  });
});
