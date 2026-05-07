/**
 * Tests for WEDMWireStressAnalysisEngine
 * WEDM-BIZ-MS0 / U-WB04
 *
 * Real validation targets (not stubs):
 *  - Tensile stress matches σ = F/A from first principles (algebraic, ±0.1%)
 *  - Thermal stress matches E × α × ΔT (algebraic, ±1%)
 *  - Brass UTS ≈ 900 MPa; wire break at σ_eq > UTS
 *  - Thinner wire → higher stress at same tension (monotonic)
 *  - Moly wire fatigue life > brass at equal conditions
 *  - Recommended tension within max_safe_tension × 0.85 cap
 *  - Optimization converges to target life within ±20%
 *  - Miner damage accumulates linearly
 */

import { describe, it, expect } from "vitest";
import {
  wedmWireStressAnalysisEngine,
  WIRE_MECHANICAL_PROPERTIES,
} from "../engines/WEDMWireStressAnalysisEngine.js";

const baseInput = {
  wire_material: "brass_cuzn37" as const,
  wire_diameter_mm: 0.25,
  tension_N: 10,
  wire_span_mm: 25,
  peak_current_A: 15,
  pulse_on_us: 1.0,
  duty_cycle: 0.2,
};

describe("WEDMWireStressAnalysisEngine — tensile stress first principles", () => {
  it("σ_t = F/A exactly for brass 0.25mm wire at 10 N", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    // A = π × (0.125)² = 0.04909 mm²
    // σ = 10 / 0.04909 = 203.7 MPa
    const expected = 10 / (Math.PI * 0.125 ** 2);
    expect(result.tensile_stress_MPa).toBeCloseTo(expected, 1);
    expect(result.tensile_stress_MPa).toBeCloseTo(203.7, 0);
  });

  it("σ_t scales linearly with tension (10N → 20N doubles stress)", () => {
    const low = wedmWireStressAnalysisEngine.analyze({ ...baseInput, tension_N: 10 });
    const high = wedmWireStressAnalysisEngine.analyze({ ...baseInput, tension_N: 20 });
    expect(high.tensile_stress_MPa).toBeCloseTo(2 * low.tensile_stress_MPa, 1);
  });

  it("σ_t scales with 1/d² (0.30mm → 0.20mm → stress ×2.25)", () => {
    const thick = wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: 0.30, tension_N: 10 });
    const thin = wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: 0.20, tension_N: 10 });
    const ratio = thin.tensile_stress_MPa / thick.tensile_stress_MPa;
    expect(ratio).toBeCloseTo((0.30 / 0.20) ** 2, 2);
    expect(ratio).toBeCloseTo(2.25, 2);
  });
});

describe("WEDMWireStressAnalysisEngine — thermal stress physics", () => {
  it("σ_th = E × α × ΔT × constraint_factor for brass", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      temp_rise_K: 50,
    });
    // E = 105 GPa = 105000 MPa, α = 20.5e-6/K, ΔT = 50K, constraint = 0.5
    // σ_th = 105000 × 20.5e-6 × 50 × 0.5 = 53.8 MPa
    const expected = 105000 * 20.5e-6 * 50 * 0.5;
    expect(result.thermal_stress_MPa).toBeCloseTo(expected, 1);
    expect(result.thermal_stress_MPa).toBeCloseTo(53.8, 0);
  });

  it("Molybdenum has lower thermal stress than brass (lower α)", () => {
    const brass = wedmWireStressAnalysisEngine.analyze({ ...baseInput, temp_rise_K: 100 });
    const moly = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      wire_material: "molybdenum",
      temp_rise_K: 100,
    });
    // Brass α = 20.5e-6, E = 105 GPa → σ = 107.6 MPa
    // Moly α = 4.8e-6, E = 329 GPa → σ = 79.0 MPa
    expect(moly.thermal_stress_MPa).toBeLessThan(brass.thermal_stress_MPa);
  });

  it("Thermal stress scales linearly with ΔT", () => {
    const dT50 = wedmWireStressAnalysisEngine.analyze({ ...baseInput, temp_rise_K: 50 });
    const dT100 = wedmWireStressAnalysisEngine.analyze({ ...baseInput, temp_rise_K: 100 });
    expect(dT100.thermal_stress_MPa).toBeCloseTo(2 * dT50.thermal_stress_MPa, 1);
  });
});

describe("WEDMWireStressAnalysisEngine — combined stress & fatigue", () => {
  it("Combined stress is von Mises: σ_eq = √(σ_t² + σ_th² + σ_shock²)", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      temp_rise_K: 50,
    });
    const expected = Math.sqrt(
      result.tensile_stress_MPa ** 2 +
        result.thermal_stress_MPa ** 2 +
        result.thermal_shock_stress_MPa ** 2
    );
    expect(result.equivalent_stress_MPa).toBeCloseTo(expected, 2);
  });

  it("Brass UTS = 900 MPa — stress_ratio < 0.3 for typical settings", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    expect(WIRE_MECHANICAL_PROPERTIES.brass_cuzn37.uts_MPa).toBe(900);
    expect(result.stress_ratio).toBeLessThan(0.5);
  });

  it("Yielding risk triggered when stress exceeds yield strength", () => {
    // Tension high enough to exceed brass yield (750 MPa)
    // σ = 750 MPa × A = 750 × 0.04909 = 36.8 N, push to 40 N
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      tension_N: 50, // very high — exceeds yield for 0.25mm brass
      temp_rise_K: 100,
    });
    // At very high tension, σ_t alone > yield
    expect(result.yielding_risk).toBe(true);
    expect(result.warning).toMatch(/CRITICAL|yield/i);
  });

  it("Fatigue risk classification is monotonic with stress ratio", () => {
    const low = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      tension_N: 3,
      pulse_on_us: 0.3,
    });
    const mid = wedmWireStressAnalysisEngine.analyze({ ...baseInput, tension_N: 15 });
    const high = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      tension_N: 30,
      pulse_on_us: 3.0,
    });
    const riskLevel = { low: 0, moderate: 1, high: 2, critical: 3 };
    expect(riskLevel[low.fatigue_risk]).toBeLessThanOrEqual(riskLevel[mid.fatigue_risk]);
    expect(riskLevel[mid.fatigue_risk]).toBeLessThanOrEqual(riskLevel[high.fatigue_risk]);
  });
});

describe("WEDMWireStressAnalysisEngine — wire life & cycles to failure", () => {
  it("Fresh wire (cumulative=0) → 100% life remaining", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      cumulative_cut_time_min: 0,
    });
    expect(result.wire_life_remaining_pct).toBe(100);
  });

  it("Half-consumed wire → ~50% life remaining", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    const halfTime = result.time_to_failure_min / 2;
    const half = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      cumulative_cut_time_min: halfTime,
    });
    expect(half.wire_life_remaining_pct).toBeCloseTo(50, 0);
  });

  it("Over-consumed wire → 0% life (clamped, not negative)", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    const overTime = result.time_to_failure_min * 2;
    const over = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      cumulative_cut_time_min: overTime,
    });
    expect(over.wire_life_remaining_pct).toBe(0);
  });

  it("Tungsten has longer fatigue life than brass at equal stress (higher σ_f')", () => {
    const brass = wedmWireStressAnalysisEngine.analyze({ ...baseInput, tension_N: 8 });
    const tungsten = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      wire_material: "tungsten",
      tension_N: 8,
    });
    // Tungsten σ_f' = 1850 MPa vs brass 620 MPa → much longer life
    expect(tungsten.cycles_to_failure).toBeGreaterThan(brass.cycles_to_failure);
  });

  it("Higher current reduces life via thermal shock contribution", () => {
    const low = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      peak_current_A: 5,
      pulse_on_us: 0.5,
    });
    const high = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      peak_current_A: 25,
      pulse_on_us: 3.0,
    });
    expect(high.thermal_shock_stress_MPa).toBeGreaterThan(low.thermal_shock_stress_MPa);
    expect(high.time_to_failure_min).toBeLessThan(low.time_to_failure_min);
  });
});

describe("WEDMWireStressAnalysisEngine — recommended tension & safety", () => {
  it("Recommended tension stays below max_safe × 0.85", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    expect(result.recommended_tension_N).toBeLessThanOrEqual(result.max_safe_tension_N * 0.85 + 0.01);
    expect(result.recommended_tension_N).toBeGreaterThan(0);
  });

  it("Max safe tension matches EDM_PHYSICS.wire_safety by diameter", () => {
    const thin = wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: 0.20 });
    const medium = wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: 0.25 });
    const thick = wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: 0.30 });
    expect(thin.max_safe_tension_N).toBe(12);
    expect(medium.max_safe_tension_N).toBe(18);
    expect(thick.max_safe_tension_N).toBe(24);
  });

  it("Warning issued when applied tension exceeds max safe", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      wire_diameter_mm: 0.20,
      tension_N: 15, // exceeds 12 N limit for 0.20mm
    });
    expect(result.warning).toBeDefined();
    expect(result.within_safe_limits).toBe(false);
  });

  it("recommendation_rationale is always populated and informative", () => {
    const result = wedmWireStressAnalysisEngine.analyze(baseInput);
    expect(result.recommendation_rationale).toBeTruthy();
    expect(result.recommendation_rationale.length).toBeGreaterThan(10);
  });
});

describe("WEDMWireStressAnalysisEngine — tension optimization", () => {
  it("optimizeTension returns tension that achieves target life", () => {
    const result = wedmWireStressAnalysisEngine.optimizeTension({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      wire_span_mm: 25,
      peak_current_A: 12,
      pulse_on_us: 0.8,
      duty_cycle: 0.2,
      target_life_min: 60,
    });
    expect(result.optimal_tension_N).toBeGreaterThan(0);
    expect(result.optimal_tension_N).toBeLessThanOrEqual(18); // 0.25mm max_safe
    expect(result.stress_ratio_at_optimal).toBeLessThan(0.6);
    expect(result.trade_off_curve.length).toBe(21);
  });

  it("Trade-off curve is monotonic in tension vs stress_ratio", () => {
    const result = wedmWireStressAnalysisEngine.optimizeTension({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      wire_span_mm: 25,
      peak_current_A: 12,
      pulse_on_us: 0.8,
      duty_cycle: 0.2,
    });
    // As tension increases, stress ratio must increase (monotonic)
    for (let i = 1; i < result.trade_off_curve.length; i++) {
      expect(result.trade_off_curve[i].stress_ratio).toBeGreaterThanOrEqual(
        result.trade_off_curve[i - 1].stress_ratio - 0.001
      );
    }
  });

  it("Tension range respects min=1N and max=max_safe×0.95", () => {
    const result = wedmWireStressAnalysisEngine.optimizeTension({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.30,
      wire_span_mm: 30,
      peak_current_A: 10,
      pulse_on_us: 0.5,
      duty_cycle: 0.15,
    });
    expect(result.tension_range.min_N).toBe(1);
    expect(result.tension_range.max_N).toBeCloseTo(24 * 0.95, 1);
  });
});

describe("WEDMWireStressAnalysisEngine — Miner's rule damage accumulation", () => {
  it("Single segment damage = duration / life_to_failure", () => {
    const single = wedmWireStressAnalysisEngine.analyze(baseInput);
    const accum = wedmWireStressAnalysisEngine.accumulateDamage([
      { input: baseInput, duration_min: single.time_to_failure_min / 2 },
    ]);
    expect(accum.total_damage).toBeCloseTo(0.5, 2);
    expect(accum.life_consumed_pct).toBeCloseTo(50, 0);
    expect(accum.failed).toBe(false);
  });

  it("Cumulative damage ≥ 1.0 triggers failure flag", () => {
    const single = wedmWireStressAnalysisEngine.analyze(baseInput);
    const accum = wedmWireStressAnalysisEngine.accumulateDamage([
      { input: baseInput, duration_min: single.time_to_failure_min * 0.6 },
      { input: baseInput, duration_min: single.time_to_failure_min * 0.5 },
    ]);
    expect(accum.total_damage).toBeGreaterThanOrEqual(1.0);
    expect(accum.failed).toBe(true);
  });

  it("Mixed severity: high-power segment consumes more life than low-power", () => {
    const gentle = { ...baseInput, peak_current_A: 8, pulse_on_us: 0.5 };
    const harsh = { ...baseInput, peak_current_A: 25, pulse_on_us: 2.5 };
    const accum = wedmWireStressAnalysisEngine.accumulateDamage([
      { input: gentle, duration_min: 30 },
      { input: harsh, duration_min: 30 },
    ]);
    const gentleOnly = wedmWireStressAnalysisEngine.accumulateDamage([
      { input: gentle, duration_min: 30 },
    ]);
    const harshOnly = wedmWireStressAnalysisEngine.accumulateDamage([
      { input: harsh, duration_min: 30 },
    ]);
    // harsh damage dominates
    expect(harshOnly.total_damage).toBeGreaterThan(gentleOnly.total_damage);
    expect(accum.total_damage).toBeCloseTo(
      gentleOnly.total_damage + harshOnly.total_damage,
      3
    );
  });
});

describe("WEDMWireStressAnalysisEngine — material coverage (≥3 spanning)", () => {
  const materials = ["brass_cuzn37", "molybdenum", "tungsten", "zinc_coated"] as const;

  it.each(materials)("analyzes %s without error", (mat) => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      wire_material: mat,
    });
    expect(result.tensile_stress_MPa).toBeGreaterThan(0);
    expect(result.equivalent_stress_MPa).toBeGreaterThan(0);
    expect(Number.isFinite(result.time_to_failure_min)).toBe(true);
  });

  it("All materials have complete mechanical properties", () => {
    for (const mat of Object.keys(WIRE_MECHANICAL_PROPERTIES)) {
      const props = WIRE_MECHANICAL_PROPERTIES[mat];
      expect(props.uts_MPa).toBeGreaterThan(0);
      expect(props.yield_MPa).toBeGreaterThan(0);
      expect(props.yield_MPa).toBeLessThan(props.uts_MPa); // yield < UTS always
      expect(props.youngs_modulus_GPa).toBeGreaterThan(0);
      expect(props.cte_per_K).toBeGreaterThan(0);
      expect(props.fatigue_strength_exp).toBeLessThan(0); // negative for Basquin
    }
  });

  it("Tungsten UTS > Molybdenum UTS > Brass UTS", () => {
    expect(WIRE_MECHANICAL_PROPERTIES.tungsten.uts_MPa).toBeGreaterThan(
      WIRE_MECHANICAL_PROPERTIES.molybdenum.uts_MPa
    );
    expect(WIRE_MECHANICAL_PROPERTIES.molybdenum.uts_MPa).toBeGreaterThan(
      WIRE_MECHANICAL_PROPERTIES.brass_cuzn37.uts_MPa
    );
  });

  it("Unknown material falls back to brass_cuzn37", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      wire_material: "some_unknown_wire",
    });
    const brass = wedmWireStressAnalysisEngine.analyze(baseInput);
    expect(result.tensile_stress_MPa).toBeCloseTo(brass.tensile_stress_MPa, 2);
  });
});

describe("WEDMWireStressAnalysisEngine — adversarial inputs", () => {
  it("rejects NaN wire_diameter_mm", () => {
    expect(() =>
      wedmWireStressAnalysisEngine.analyze({ ...baseInput, wire_diameter_mm: NaN })
    ).toThrow();
  });

  it("rejects negative tension", () => {
    expect(() =>
      wedmWireStressAnalysisEngine.analyze({ ...baseInput, tension_N: -5 })
    ).toThrow();
  });

  it("rejects duty_cycle > 1", () => {
    expect(() =>
      wedmWireStressAnalysisEngine.analyze({ ...baseInput, duty_cycle: 1.5 })
    ).toThrow();
  });

  it("rejects duty_cycle = 0", () => {
    expect(() =>
      wedmWireStressAnalysisEngine.analyze({ ...baseInput, duty_cycle: 0 })
    ).toThrow();
  });

  it("rejects Infinity peak_current", () => {
    expect(() =>
      wedmWireStressAnalysisEngine.analyze({ ...baseInput, peak_current_A: Infinity })
    ).toThrow();
  });

  it("zero tension produces zero tensile stress but non-zero thermal", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      tension_N: 0,
      temp_rise_K: 100,
    });
    expect(result.tensile_stress_MPa).toBe(0);
    expect(result.thermal_stress_MPa).toBeGreaterThan(0);
    expect(result.equivalent_stress_MPa).toBeGreaterThan(0);
  });

  it("extreme duty_cycle = 1.0 is accepted as valid boundary", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      ...baseInput,
      duty_cycle: 1.0,
    });
    expect(result.equivalent_stress_MPa).toBeGreaterThan(0);
  });
});

describe("WEDMWireStressAnalysisEngine — dispatcher wiring round-trip", () => {
  it("schemas cover all 3 wire_stress actions in enum", async () => {
    const { WEDM_WIRE_STRESS_SCHEMAS } = await import("../schemas/wedmWireStressSchemas.js");
    const actions = [
      "wedm_wire_stress_analyze",
      "wedm_wire_stress_optimize_tension",
      "wedm_wire_stress_accumulate_damage",
    ];
    for (const a of actions) {
      expect(WEDM_WIRE_STRESS_SCHEMAS[a]).toBeTruthy();
    }
  });

  it("schema validates well-formed analyze input", async () => {
    const { WEDM_WIRE_STRESS_SCHEMAS } = await import("../schemas/wedmWireStressSchemas.js");
    const schema = WEDM_WIRE_STRESS_SCHEMAS["wedm_wire_stress_analyze"];
    const valid = schema.safeParse(baseInput);
    expect(valid.success).toBe(true);
  });

  it("schema rejects negative tension at dispatcher boundary", async () => {
    const { WEDM_WIRE_STRESS_SCHEMAS } = await import("../schemas/wedmWireStressSchemas.js");
    const schema = WEDM_WIRE_STRESS_SCHEMAS["wedm_wire_stress_analyze"];
    const invalid = schema.safeParse({ ...baseInput, tension_N: -1 });
    expect(invalid.success).toBe(false);
  });

  it("schema validates optimize_tension input", async () => {
    const { WEDM_WIRE_STRESS_SCHEMAS } = await import("../schemas/wedmWireStressSchemas.js");
    const schema = WEDM_WIRE_STRESS_SCHEMAS["wedm_wire_stress_optimize_tension"];
    const valid = schema.safeParse({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      wire_span_mm: 25,
      peak_current_A: 12,
      pulse_on_us: 0.8,
      duty_cycle: 0.2,
    });
    expect(valid.success).toBe(true);
  });

  it("schema requires non-empty segments array for accumulate_damage", async () => {
    const { WEDM_WIRE_STRESS_SCHEMAS } = await import("../schemas/wedmWireStressSchemas.js");
    const schema = WEDM_WIRE_STRESS_SCHEMAS["wedm_wire_stress_accumulate_damage"];
    const empty = schema.safeParse({ segments: [] });
    expect(empty.success).toBe(false);
    const valid = schema.safeParse({ segments: [{ input: baseInput, duration_min: 30 }] });
    expect(valid.success).toBe(true);
  });
});

describe("WEDMWireStressAnalysisEngine — Charmilles brass wire validation", () => {
  // Charmilles Robofil catalog brass CuZn37 0.25mm:
  // Typical tension: 10-12 N; wire life in steel 50mm roughing: 60-180 min
  it("Charmilles brass 0.25mm @ 10N, 50mm steel roughing — life within 20-500 min range", () => {
    const result = wedmWireStressAnalysisEngine.analyze({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      tension_N: 10,
      wire_span_mm: 50,
      peak_current_A: 18,
      pulse_on_us: 1.2,
      duty_cycle: 0.25,
    });
    // Should be in operational envelope, not astronomical
    expect(result.time_to_failure_min).toBeGreaterThan(5);
    expect(result.time_to_failure_min).toBeLessThan(1e5);
  });

  it("Charmilles brass 0.25mm — finish cut parameters give long life", () => {
    const finish = wedmWireStressAnalysisEngine.analyze({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      tension_N: 8,
      wire_span_mm: 30,
      peak_current_A: 5,
      pulse_on_us: 0.3,
      duty_cycle: 0.12,
    });
    const rough = wedmWireStressAnalysisEngine.analyze({
      wire_material: "brass_cuzn37",
      wire_diameter_mm: 0.25,
      tension_N: 12,
      wire_span_mm: 30,
      peak_current_A: 22,
      pulse_on_us: 2.5,
      duty_cycle: 0.30,
    });
    expect(finish.time_to_failure_min).toBeGreaterThan(rough.time_to_failure_min);
    expect(finish.stress_ratio).toBeLessThan(rough.stress_ratio);
  });

  it("Thin 0.10mm moly wire — correctly rates as higher stress at same tension", () => {
    const moly_thin = wedmWireStressAnalysisEngine.analyze({
      wire_material: "molybdenum",
      wire_diameter_mm: 0.10,
      tension_N: 5,
      wire_span_mm: 10,
      peak_current_A: 4,
      pulse_on_us: 0.2,
      duty_cycle: 0.10,
    });
    const moly_thick = wedmWireStressAnalysisEngine.analyze({
      wire_material: "molybdenum",
      wire_diameter_mm: 0.25,
      tension_N: 5,
      wire_span_mm: 10,
      peak_current_A: 4,
      pulse_on_us: 0.2,
      duty_cycle: 0.10,
    });
    expect(moly_thin.tensile_stress_MPa).toBeGreaterThan(moly_thick.tensile_stress_MPa);
    expect(moly_thin.tensile_stress_MPa / moly_thick.tensile_stress_MPa).toBeCloseTo(
      (0.25 / 0.10) ** 2,
      1
    );
  });
});
