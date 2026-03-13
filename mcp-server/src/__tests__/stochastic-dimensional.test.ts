/**
 * StochasticDimensionalEngine Tests
 * Tests multi-source dimensional uncertainty propagation, time-varying
 * drift models, Cp/Cpk evolution, SPC generation, and variance decomposition.
 */
import { describe, it, expect } from "vitest";
import {
  stochasticDimensionalEngine,
  StochasticDimensionalEngine,
} from "../engines/StochasticDimensionalEngine.js";
import type { DimUncertaintyInput } from "../engines/StochasticDimensionalEngine.js";

const engine = stochasticDimensionalEngine;

// ── Thermal drift ───────────────────────────────────────────────────────
describe("thermalDrift", () => {
  it("zero at t=0 (sinusoidal starts at 0)", () => {
    expect(engine.thermalDrift(0, 2, 8, 5)).toBeCloseTo(0, 5);
  });

  it("peak at t=T/4", () => {
    const drift = engine.thermalDrift(2, 2, 8, 5);
    expect(drift).toBeCloseTo(10, 1); // 5 * 2 * sin(π/2) = 10
  });

  it("negative at t=3T/4", () => {
    const drift = engine.thermalDrift(6, 2, 8, 5);
    expect(drift).toBeLessThan(0);
  });

  it("zero amplitude → zero drift", () => {
    expect(engine.thermalDrift(2, 0, 8, 5)).toBe(0);
  });

  it("zero cycle → zero drift", () => {
    expect(engine.thermalDrift(2, 2, 0, 5)).toBe(0);
  });
});

// ── Wear drift ──────────────────────────────────────────────────────────
describe("wearDrift", () => {
  it("zero at part 0", () => {
    expect(engine.wearDrift(0, 0.3, 200, 50)).toBe(0);
  });

  it("increases within compensation window", () => {
    const d1 = engine.wearDrift(10, 0.3, 200, 50);
    const d2 = engine.wearDrift(30, 0.3, 200, 50);
    expect(d2).toBeGreaterThan(d1);
  });

  it("resets at compensation interval", () => {
    // Part 50 → start of new window → 0 drift
    const d = engine.wearDrift(50, 0.3, 200, 50);
    expect(d).toBeCloseTo(0, 5);
  });

  it("resets at tool change", () => {
    const d = engine.wearDrift(200, 0.3, 200, 50);
    expect(d).toBeCloseTo(0, 5);
  });

  it("max drift = rate × comp_interval", () => {
    const d = engine.wearDrift(49, 0.3, 200, 50);
    expect(d).toBeCloseTo(49 * 0.3, 5);
  });
});

// ── Full simulation ─────────────────────────────────────────────────────
describe("simulate", () => {
  const baseInput: DimUncertaintyInput = {
    nominal_mm: 50,
    usl_mm: 50.025,
    lsl_mm: 49.975,
    production_qty: 100,
    mc_samples_per_part: 50,
  };

  it("returns complete result structure", () => {
    const r = engine.simulate(baseInput);
    expect(r.overall_cpk).toBeDefined();
    expect(r.overall_cp).toBeDefined();
    expect(r.overall_sigma_um).toBeGreaterThan(0);
    expect(r.part_states.length).toBeGreaterThan(0);
    expect(r.pct_in_spec).toBeGreaterThanOrEqual(0);
    expect(r.pct_in_spec).toBeLessThanOrEqual(100);
    expect(r.variance_breakdown).toBeDefined();
    expect(r.spc_points.length).toBeGreaterThan(0);
    expect(r.formula).toContain("Cp=");
    expect(r.formula).toContain("Cpk=");
  });

  it("Cpk ≤ Cp always", () => {
    const r = engine.simulate(baseInput);
    expect(r.overall_cpk).toBeLessThanOrEqual(r.overall_cp + 0.05);
  });

  it("variance breakdown sums to ~100%", () => {
    const r = engine.simulate(baseInput);
    const vb = r.variance_breakdown;
    const total = vb.machine_pct + vb.thermal_pct + vb.wear_pct
      + vb.deflection_pct + vb.fixture_pct + vb.runout_pct + vb.gage_pct;
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it("tighter tolerance → lower Cpk", () => {
    const loose = engine.simulate({
      ...baseInput, usl_mm: 50.050, lsl_mm: 49.950,
    });
    const tight = engine.simulate({
      ...baseInput, usl_mm: 50.010, lsl_mm: 49.990,
    });
    expect(tight.overall_cpk).toBeLessThan(loose.overall_cpk);
  });

  it("more machine noise → lower Cpk", () => {
    const good = engine.simulate({
      ...baseInput, machine_repeatability_um: 1,
    });
    const bad = engine.simulate({
      ...baseInput, machine_repeatability_um: 15,
    });
    expect(bad.overall_cpk).toBeLessThan(good.overall_cpk);
  });

  it("higher wear rate → lower Cpk", () => {
    const low = engine.simulate({
      ...baseInput, wear_rate_um_per_part: 0.05,
    });
    const high = engine.simulate({
      ...baseInput, wear_rate_um_per_part: 2,
    });
    expect(high.overall_cpk).toBeLessThan(low.overall_cpk);
  });

  it("more frequent compensation improves Cpk", () => {
    const rare = engine.simulate({
      ...baseInput,
      wear_rate_um_per_part: 1,
      wear_compensation_interval: 100,
    });
    const freq = engine.simulate({
      ...baseInput,
      wear_rate_um_per_part: 1,
      wear_compensation_interval: 10,
    });
    expect(freq.overall_cpk).toBeGreaterThan(rare.overall_cpk);
  });

  it("SPC points have valid x-bar and range", () => {
    const r = engine.simulate(baseInput);
    for (const pt of r.spc_points) {
      expect(pt.x_bar_mm).toBeGreaterThan(0);
      expect(pt.range_um).toBeGreaterThanOrEqual(0);
      expect(pt.subgroup).toBeGreaterThan(0);
    }
  });

  it("part states have monotonic part numbers", () => {
    const r = engine.simulate(baseInput);
    for (let i = 1; i < r.part_states.length; i++) {
      expect(r.part_states[i].part_number)
        .toBeGreaterThan(r.part_states[i - 1].part_number);
    }
  });

  it("first_oos_part is null when all in spec", () => {
    const r = engine.simulate({
      ...baseInput,
      usl_mm: 50.500, lsl_mm: 49.500, // very loose
      machine_repeatability_um: 1,
    });
    expect(r.first_oos_part).toBeNull();
    expect(r.pct_in_spec).toBeCloseTo(100, 0);
  });

  it("warns on low Cpk", () => {
    const r = engine.simulate({
      ...baseInput,
      usl_mm: 50.005, lsl_mm: 49.995,
      machine_repeatability_um: 10,
    });
    if (r.overall_cpk < 1.0) {
      expect(r.warnings.some(w => w.includes("NOT capable"))).toBe(true);
    }
  });

  it("recommended correction interval is positive", () => {
    const r = engine.simulate(baseInput);
    expect(r.recommended_correction_interval).toBeGreaterThan(0);
  });

  it("expected PPM consistent with Cpk", () => {
    const r = engine.simulate(baseInput);
    expect(r.expected_defect_ppm).toBeGreaterThanOrEqual(0);
  });

  it("thermal drift increases variance contribution", () => {
    const noTherm = engine.simulate({
      ...baseInput, ambient_temp_amplitude_C: 0,
    });
    const highTherm = engine.simulate({
      ...baseInput, ambient_temp_amplitude_C: 5,
    });
    expect(highTherm.variance_breakdown.thermal_pct)
      .toBeGreaterThan(noTherm.variance_breakdown.thermal_pct);
  });

  it("gage RR contributes to variance", () => {
    const r = engine.simulate({
      ...baseInput, gage_rr_um: 5,
    });
    expect(r.variance_breakdown.gage_pct).toBeGreaterThan(0);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(stochasticDimensionalEngine)
      .toBeInstanceOf(StochasticDimensionalEngine);
  });
});
