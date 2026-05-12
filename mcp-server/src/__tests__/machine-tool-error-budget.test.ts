/**
 * MachineToolErrorBudgetEngine Tests
 * Tests Abbe amplification, thermal growth, RSS/worst-case combination,
 * and 21-error model budget allocation per ISO 230.
 */
import { describe, it, expect } from "vitest";
import {
  machineToolErrorBudgetEngine,
  MachineToolErrorBudgetEngine,
} from "../engines/MachineToolErrorBudgetEngine.js";
import type { ErrorBudgetInput, AxisError } from "../engines/MachineToolErrorBudgetEngine.js";

const engine = machineToolErrorBudgetEngine;

// ── Abbe amplification ──────────────────────────────────────────────────
describe("abbeAmplification", () => {
  it("returns scale error when no angular error", () => {
    expect(engine.abbeAmplification(5, 0, 200)).toBe(5);
  });

  it("adds Abbe offset contribution", () => {
    // 5µm + 200mm × 10µrad/1000 = 5 + 2 = 7µm
    expect(engine.abbeAmplification(5, 10, 200)).toBeCloseTo(7, 5);
  });

  it("larger offset amplifies more", () => {
    const short = engine.abbeAmplification(5, 10, 100);
    const long = engine.abbeAmplification(5, 10, 300);
    expect(long).toBeGreaterThan(short);
  });
});

// ── Thermal growth ──────────────────────────────────────────────────────
describe("thermalGrowth", () => {
  it("zero growth at zero ΔT", () => {
    expect(engine.thermalGrowth(500, 0)).toBe(0);
  });

  it("steel 500mm × 1°C ≈ 5.85µm", () => {
    const delta = engine.thermalGrowth(500, 1);
    expect(delta).toBeCloseTo(5.85, 1);
  });

  it("scales linearly with length", () => {
    const d1 = engine.thermalGrowth(200, 2);
    const d2 = engine.thermalGrowth(400, 2);
    expect(d2).toBeCloseTo(d1 * 2, 5);
  });

  it("scales linearly with temperature", () => {
    const d1 = engine.thermalGrowth(500, 1);
    const d2 = engine.thermalGrowth(500, 3);
    expect(d2).toBeCloseTo(d1 * 3, 5);
  });

  it("accepts custom CTE", () => {
    // Aluminum: α ≈ 23 µm/m/°C
    const delta = engine.thermalGrowth(500, 1, 23);
    expect(delta).toBeCloseTo(11.5, 1);
  });
});

// ── RSS combination ─────────────────────────────────────────────────────
describe("rssCombine", () => {
  it("returns 0 for empty array", () => {
    expect(engine.rssCombine([])).toBe(0);
  });

  it("returns single value for one element", () => {
    expect(engine.rssCombine([5])).toBeCloseTo(5, 8);
  });

  it("3-4-5 triangle: √(9+16) = 5", () => {
    expect(engine.rssCombine([3, 4])).toBeCloseTo(5, 8);
  });

  it("is always ≤ worst case", () => {
    const vals = [3, 4, 5, 2, 1];
    expect(engine.rssCombine(vals)).toBeLessThanOrEqual(engine.worstCaseCombine(vals));
  });
});

// ── Worst case combination ──────────────────────────────────────────────
describe("worstCaseCombine", () => {
  it("sums absolute values", () => {
    expect(engine.worstCaseCombine([3, 4, 5])).toBe(12);
  });

  it("handles negative values", () => {
    expect(engine.worstCaseCombine([-3, 4, -5])).toBe(12);
  });
});

// ── Effective error ─────────────────────────────────────────────────────
describe("effectiveError", () => {
  it("linear error passes through", () => {
    const { value_um, abbe_amplified } = engine.effectiveError(
      { axis: "X", error_type: "straightness_h", value_um: 3 }, 500,
    );
    expect(value_um).toBe(3);
    expect(abbe_amplified).toBe(false);
  });

  it("angular error with Abbe offset is amplified", () => {
    const { value_um, abbe_amplified } = engine.effectiveError(
      { axis: "X", error_type: "pitch", value_um: 10, abbe_offset_mm: 200 }, 500,
    );
    // 200 × 10 / 1000 = 2µm
    expect(value_um).toBeCloseTo(2, 5);
    expect(abbe_amplified).toBe(true);
  });

  it("angular error without Abbe uses work volume", () => {
    const { value_um } = engine.effectiveError(
      { axis: "X", error_type: "roll", value_um: 8 }, 500,
    );
    // 500 × 8 / 1000 = 4µm
    expect(value_um).toBeCloseTo(4, 5);
  });

  it("squareness scales with work volume", () => {
    const { value_um } = engine.effectiveError(
      { axis: "X", error_type: "squareness", value_um: 10 }, 500,
    );
    expect(value_um).toBeCloseTo(5, 5);
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: ErrorBudgetInput = {
    machine_type: "vmc",
    target_tolerance_um: 25,
  };

  it("returns complete result structure", () => {
    const result = engine.analyze(baseInput);
    expect(result.rss_total_um).toBeGreaterThan(0);
    expect(result.worst_case_total_um).toBeGreaterThan(result.rss_total_um);
    expect(result.contributors.length).toBeGreaterThan(0);
    expect(result.top_3_contributors).toHaveLength(3);
    expect(typeof result.meets_tolerance).toBe("boolean");
    expect(result.formula).toContain("21-error");
    expect(result.formula).toContain("Abbe");
    expect(result.formula).toContain("RSS");
  });

  it("RSS ≤ worst case always", () => {
    const result = engine.analyze(baseInput);
    expect(result.rss_total_um).toBeLessThanOrEqual(result.worst_case_total_um);
  });

  it("contributor percentages sum to ~100%", () => {
    const result = engine.analyze(baseInput);
    const totalPct = result.contributors.reduce((s, c) => s + c.pct_of_total, 0);
    expect(totalPct).toBeGreaterThan(90); // may not be exactly 100 due to rounding
    expect(totalPct).toBeLessThan(110);
  });

  it("contributors sorted by magnitude", () => {
    const result = engine.analyze(baseInput);
    for (let i = 1; i < result.contributors.length; i++) {
      expect(result.contributors[i].contribution_um)
        .toBeLessThanOrEqual(result.contributors[i - 1].contribution_um);
    }
  });

  it("tight tolerance fails budget", () => {
    const result = engine.analyze({ ...baseInput, target_tolerance_um: 2 });
    expect(result.meets_tolerance).toBe(false);
    expect(result.tolerance_margin_um).toBeLessThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("loose tolerance passes budget", () => {
    const result = engine.analyze({ ...baseInput, target_tolerance_um: 100 });
    expect(result.meets_tolerance).toBe(true);
    expect(result.tolerance_margin_um).toBeGreaterThan(0);
  });

  it("thermal growth increases total error", () => {
    const noThermal = engine.analyze({ ...baseInput, delta_T_C: 0 });
    const withThermal = engine.analyze({ ...baseInput, delta_T_C: 5 });
    expect(withThermal.rss_total_um).toBeGreaterThan(noThermal.rss_total_um);
    expect(withThermal.thermal_contribution_um).toBeGreaterThan(0);
  });

  it("warns on large temperature differential", () => {
    const result = engine.analyze({ ...baseInput, delta_T_C: 5 });
    expect(result.warnings.some(w => w.includes("Temperature"))).toBe(true);
  });

  it("grinder has tighter errors than 5-axis", () => {
    const grinder = engine.analyze({ machine_type: "grinder", target_tolerance_um: 50 });
    const fiveAxis = engine.analyze({ machine_type: "5axis", target_tolerance_um: 50 });
    expect(grinder.rss_total_um).toBeLessThan(fiveAxis.rss_total_um);
  });

  it("works with all 5 machine types", () => {
    const types = ["vmc", "hmc", "lathe", "5axis", "grinder"] as const;
    for (const mt of types) {
      const result = engine.analyze({ machine_type: mt, target_tolerance_um: 50 });
      expect(result.rss_total_um).toBeGreaterThan(0);
      expect(result.contributors.length).toBeGreaterThan(0);
    }
  });

  it("custom errors override defaults", () => {
    const customErrors: AxisError[] = [
      { axis: "X", error_type: "positioning", value_um: 10 },
      { axis: "Y", error_type: "positioning", value_um: 10 },
    ];
    const result = engine.analyze({
      errors: customErrors, target_tolerance_um: 50,
    });
    expect(result.contributors.length).toBe(2);
    expect(result.rss_total_um).toBeCloseTo(Math.sqrt(200), 0);
  });

  it("budget utilization is percentage of tolerance", () => {
    const result = engine.analyze({ ...baseInput, target_tolerance_um: 50 });
    expect(result.budget_utilization_pct).toBeCloseTo(
      (result.rss_total_um / 50) * 100, 0,
    );
  });

  it("zero thermal contribution when ΔT = 0", () => {
    const result = engine.analyze({ ...baseInput, delta_T_C: 0 });
    expect(result.thermal_contribution_um).toBe(0);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(machineToolErrorBudgetEngine).toBeInstanceOf(MachineToolErrorBudgetEngine);
  });
});
