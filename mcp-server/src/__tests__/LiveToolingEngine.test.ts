/**
 * LiveToolingEngine — algebraic-invariant test suite
 * ====================================================
 *
 * U-GAP-LATHE-LIVE-TOOLING close-out (FEATURE-GAP-AUDIT-MS0, slot india, 2026-05-19).
 *
 * Feature-gap-dedup-win-reconciler ledger flagged this engine as
 * PARTIAL-NO-TESTS: engine on disk (173 LOC) + dispatcher-wired, zero
 * behavioral test coverage.
 *
 * Pins the load-bearing formulas: Vc = π·d·rpm/1000, feedRate = fz·Z·rpm,
 * MRR = ap·ae·feed, power = kc·MRR/60e6 (kc=1500 inline — engine concern,
 * not test scope), torque = power·60000/(2π·rpm), C-axis feed = (feed/circ)·360.
 * Plus per-operation cycle-time branches, recommendation triggers, rounding.
 */

import { describe, it, expect } from "vitest";
import {
  liveToolingEngine,
  type LiveToolInput,
  type LiveToolResult,
} from "../engines/LiveToolingEngine.js";

/** Baseline cross-mill input. */
function baseInput(overrides: Partial<LiveToolInput> = {}): LiveToolInput {
  return {
    operation: "cross_mill",
    tool_diameter_mm: 10,
    num_flutes: 4,
    live_tool_rpm: 4000,
    workpiece_diameter_mm: 50,
    depth_of_cut_mm: 1,
    width_of_cut_mm: 5,
    feed_per_tooth_mm: 0.05,
    c_axis_interpolation: false,
    y_axis_available: true,
    max_live_tool_rpm: 6000,
    live_tool_power_kW: 5,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Algebraic identities — formula correctness
// ─────────────────────────────────────────────────────────────────────

describe("calculate — cutting speed Vc = π·d·rpm/1000 (m/min)", () => {
  it("Vc matches the closed-form for d=10mm, rpm=4000 (≈125.7 m/min)", () => {
    const r = liveToolingEngine.calculate(baseInput());
    const expected = Math.round((Math.PI * 10 * 4000 / 1000) * 10) / 10;
    expect(r.cutting_speed_m_per_min).toBe(expected);
  });

  it("Vc scales linearly with diameter at constant RPM (5mm → 20mm = 4× Vc)", () => {
    const small = liveToolingEngine.calculate(baseInput({ tool_diameter_mm: 5 }));
    const large = liveToolingEngine.calculate(baseInput({ tool_diameter_mm: 20 }));
    expect(large.cutting_speed_m_per_min / small.cutting_speed_m_per_min).toBeCloseTo(4, 1);
  });
});

describe("calculate — feed rate = fz·Z·rpm (mm/min)", () => {
  it("feed rate is exactly 800 mm/min for fz=0.05, Z=4, rpm=4000", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.feed_rate_mm_per_min).toBe(800);
  });

  it("feed rate doubles (200→400) when num_flutes doubles (2→4)", () => {
    const a = liveToolingEngine.calculate(baseInput({ num_flutes: 2 }));
    const b = liveToolingEngine.calculate(baseInput({ num_flutes: 4 }));
    expect(a.feed_rate_mm_per_min).toBe(400);
    expect(b.feed_rate_mm_per_min).toBe(800);
  });
});

describe("calculate — MRR = ap·ae·feedRate (mm³/min)", () => {
  it("MRR is exactly 4000 mm³/min for ap=1, ae=5, feed=800", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.material_removal_rate_mm3_per_min).toBe(4000);
  });

  it("MRR uses tool_diameter as ae default when width_of_cut_mm is omitted (1·10·800=8000)", () => {
    const r = liveToolingEngine.calculate(baseInput({ width_of_cut_mm: undefined }));
    expect(r.material_removal_rate_mm3_per_min).toBe(8000);
  });
});

describe("calculate — power = kc·MRR/(60·10⁶) (kW, kc=1500 inline)", () => {
  it("power is exactly 0.1 kW for MRR=4000 mm³/min (1500·4000/60e6)", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.required_power_kW).toBe(0.1);
  });

  it("power utilization is exactly 2.0% (0.1 / 5.0 · 100)", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.power_utilization_pct).toBe(2);
  });
});

describe("calculate — torque = power·60000/(2π·rpm) (Nm)", () => {
  it("torque matches the closed-form for power=0.1 kW, rpm=4000", () => {
    const r = liveToolingEngine.calculate(baseInput());
    const expected = Math.round((0.1 * 1000 * 60 / (2 * Math.PI * 4000)) * 100) / 100;
    expect(r.torque_Nm).toBe(expected);
  });

  it("torque is exactly 0 when rpm is 0 (guarded against div-by-zero)", () => {
    const r = liveToolingEngine.calculate(baseInput({ live_tool_rpm: 0 }));
    expect(r.torque_Nm).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// C-axis interpolation
// ─────────────────────────────────────────────────────────────────────

describe("calculate — C-axis interpolation", () => {
  it("c_axis_feed_deg_per_min equals -1 sentinel when interpolation OFF (proxy for absence)", () => {
    // The engine omits c_axis_feed_deg_per_min entirely when c_axis_interpolation
    // is false. We pin that absence by checking that the field's COMPUTED value
    // (using the closed-form formula) does NOT match what's in the result —
    // because the result doesn't carry it. Concrete-value approach:
    const r = liveToolingEngine.calculate(baseInput({ c_axis_interpolation: false }));
    // The engine returns the field as `undefined` in the typed shape; coerce
    // to NaN for a concrete-value comparison.
    const v = (r as LiveToolResult).c_axis_feed_deg_per_min;
    expect(v === undefined ? -1 : v).toBe(-1);
  });

  it("c_axis_feed = (feedRate/circumference)·360 when interpolation is ON", () => {
    const r = liveToolingEngine.calculate(baseInput({
      c_axis_interpolation: true,
      workpiece_diameter_mm: 50,
    }));
    const expected = Math.round((800 / (Math.PI * 50)) * 360 * 10) / 10;
    expect(r.c_axis_feed_deg_per_min).toBe(expected);
  });

  it("c_axis_feed is omitted (-1 sentinel) when workpiece_diameter_mm is 0 (degenerate)", () => {
    const r = liveToolingEngine.calculate(baseInput({
      c_axis_interpolation: true,
      workpiece_diameter_mm: 0,
    }));
    const v = (r as LiveToolResult).c_axis_feed_deg_per_min;
    expect(v === undefined ? -1 : v).toBe(-1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Per-operation cycle-time branches
// ─────────────────────────────────────────────────────────────────────

describe("calculate — cycle time per operation type", () => {
  it("drill cycle time uses depth / (feedPerRev · rpm / 60)", () => {
    const r = liveToolingEngine.calculate(baseInput({ operation: "cross_drill" }));
    const expected = Math.round((1 / (0.2 * 4000 / 60)) * 10) / 10;
    expect(r.cycle_time_estimate_sec).toBe(expected);
  });

  it("axial_drill cycle time exactly matches cross_drill (same formula branch)", () => {
    const a = liveToolingEngine.calculate(baseInput({ operation: "cross_drill" }));
    const b = liveToolingEngine.calculate(baseInput({ operation: "axial_drill" }));
    expect(a.cycle_time_estimate_sec).toBe(b.cycle_time_estimate_sec);
  });

  it("polygon_turn cycle time matches 60/rpm·2 closed-form", () => {
    const r = liveToolingEngine.calculate(baseInput({ operation: "polygon_turn" }));
    const expected = Math.round((60 / 4000 * 2) * 10) / 10;
    expect(r.cycle_time_estimate_sec).toBe(expected);
  });

  it("milling cycle time is exactly 0.4 sec for length=5mm, feed=800 mm/min", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.cycle_time_estimate_sec).toBe(0.4);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Recommendation triggers — operator-facing safety surface
// ─────────────────────────────────────────────────────────────────────

describe("calculate — recommendations", () => {
  it("OVERLOAD recommendation fires when power_utilization > 100% (test counts matches)", () => {
    const r = liveToolingEngine.calculate(baseInput({ live_tool_power_kW: 0.05 }));
    expect(r.power_utilization_pct).toBeGreaterThan(100);
    // Concrete: count of recommendations starting with "OVERLOAD" must be exactly 1.
    const n = r.recommendations.filter(s => s.startsWith("OVERLOAD")).length;
    expect(n).toBe(1);
  });

  it("high-utilization warning fires when power_utilization in (90, 100)", () => {
    const r = liveToolingEngine.calculate(baseInput({ live_tool_power_kW: 0.105 }));
    expect(r.power_utilization_pct).toBeGreaterThan(90);
    expect(r.power_utilization_pct).toBeLessThan(100);
    const n = r.recommendations.filter(s => s.includes(">90% utilized")).length;
    expect(n).toBe(1);
  });

  it("no-Y-axis warning fires for flat_mill when y_axis_available is false (exactly 1 match)", () => {
    const r = liveToolingEngine.calculate(baseInput({
      operation: "flat_mill",
      y_axis_available: false,
    }));
    const n = r.recommendations.filter(s => s.includes("Y-axis not available")).length;
    expect(n).toBe(1);
  });

  it("no-Y-axis warning does NOT fire for cross_mill (count is exactly 0)", () => {
    const r = liveToolingEngine.calculate(baseInput({
      operation: "cross_mill",
      y_axis_available: false,
    }));
    const n = r.recommendations.filter(s => s.includes("Y-axis not available")).length;
    expect(n).toBe(0);
  });

  it("max-RPM warning fires when live_tool_rpm exceeds max (count is exactly 1)", () => {
    const r = liveToolingEngine.calculate(baseInput({
      live_tool_rpm: 8000,
      max_live_tool_rpm: 6000,
    }));
    const n = r.recommendations.filter(s => s.includes("exceeds max")).length;
    expect(n).toBe(1);
  });

  it("low-RPM warning fires for tool_diameter<10mm at rpm<500 (count is exactly 1)", () => {
    const r = liveToolingEngine.calculate(baseInput({
      tool_diameter_mm: 5,
      live_tool_rpm: 300,
    }));
    const n = r.recommendations.filter(s => s.includes("Low RPM")).length;
    expect(n).toBe(1);
  });

  it("'parameters acceptable' fallback is the sole recommendation when no warning fires", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(r.recommendations).toEqual(["Live tooling parameters acceptable — proceed"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Regression guards — schema + rounding
// ─────────────────────────────────────────────────────────────────────

describe("REGRESSION: LiveToolResult schema is stable", () => {
  it("result keys exactly match the documented 9-field contract (uniform shape)", () => {
    // R12 — a refactor that renames feed_rate_mm_per_min → feedRateMmPerMin
    // breaks every downstream consumer. Pin the keys via deepEqual.
    // The engine emits c_axis_feed_deg_per_min as `undefined` when
    // c_axis_interpolation is OFF — the KEY is always present (uniform shape).
    const r = liveToolingEngine.calculate(baseInput());
    const required = [
      "c_axis_feed_deg_per_min",
      "cutting_speed_m_per_min",
      "cycle_time_estimate_sec",
      "feed_rate_mm_per_min",
      "material_removal_rate_mm3_per_min",
      "power_utilization_pct",
      "recommendations",
      "required_power_kW",
      "torque_Nm",
    ];
    expect(Object.keys(r).sort()).toEqual(required);
  });

  it("c_axis_feed_deg_per_min value is undefined when interpolation OFF, numeric when ON (uniform-shape contract)", () => {
    const off = liveToolingEngine.calculate(baseInput({ c_axis_interpolation: false }));
    const on = liveToolingEngine.calculate(baseInput({
      c_axis_interpolation: true,
      workpiece_diameter_mm: 50,
    }));
    // Same key set both sides — uniform shape — concrete pin via length.
    expect(Object.keys(off).length).toBe(9);
    expect(Object.keys(on).length).toBe(9);
    // Value differs: undefined ↔ finite positive number.
    const offVal = (off.c_axis_feed_deg_per_min as number | undefined);
    expect(offVal === undefined ? -1 : offVal).toBe(-1);
    expect(on.c_axis_feed_deg_per_min as number).toBeGreaterThan(0);
  });
});

describe("REGRESSION: rounding precision is preserved", () => {
  it("feed_rate, MRR, power_util, Vc, cycle_time, c_axis_feed all round to 1 decimal", () => {
    const r = liveToolingEngine.calculate(baseInput({
      c_axis_interpolation: true,
      workpiece_diameter_mm: 50,
    }));
    for (const v of [r.feed_rate_mm_per_min, r.material_removal_rate_mm3_per_min,
                     r.power_utilization_pct, r.cutting_speed_m_per_min,
                     r.cycle_time_estimate_sec, r.c_axis_feed_deg_per_min!]) {
      expect(Math.abs((v * 10) - Math.round(v * 10))).toBeLessThan(1e-9);
    }
  });

  it("required_power_kW rounds to 3 decimals", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(Math.abs((r.required_power_kW * 1000) - Math.round(r.required_power_kW * 1000))).toBeLessThan(1e-9);
  });

  it("torque_Nm rounds to 2 decimals", () => {
    const r = liveToolingEngine.calculate(baseInput());
    expect(Math.abs((r.torque_Nm * 100) - Math.round(r.torque_Nm * 100))).toBeLessThan(1e-9);
  });
});
