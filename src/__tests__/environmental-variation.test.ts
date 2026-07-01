/**
 * EnvironmentalVariationEngine Tests
 * Tests thermal expansion, differential CTE, diurnal cycles,
 * Cpk impact, and measurement window optimization.
 */
import { describe, it, expect } from "vitest";
import {
  environmentalVariationEngine,
  EnvironmentalVariationEngine,
} from "../engines/EnvironmentalVariationEngine.js";
import type {
  EnvironmentalInput,
} from "../engines/EnvironmentalVariationEngine.js";

const engine = environmentalVariationEngine;

// ── Thermal expansion ───────────────────────────────────────────────────
describe("thermalExpansion", () => {
  it("steel 500mm × 1°C ≈ 5.85µm", () => {
    expect(engine.thermalExpansion(11.7, 1, 500))
      .toBeCloseTo(5.85, 1);
  });

  it("zero at zero ΔT", () => {
    expect(engine.thermalExpansion(11.7, 0, 500)).toBe(0);
  });

  it("aluminum expands ~2× steel", () => {
    const steel = engine.thermalExpansion(11.7, 1, 500);
    const al = engine.thermalExpansion(23.1, 1, 500);
    expect(al / steel).toBeCloseTo(23.1 / 11.7, 1);
  });
});

// ── Differential expansion ──────────────────────────────────────────────
describe("differentialExpansion", () => {
  it("zero when CTEs match", () => {
    expect(engine.differentialExpansion(11.7, 11.7, 1, 500))
      .toBeCloseTo(0, 5);
  });

  it("positive when part CTE > machine CTE", () => {
    expect(engine.differentialExpansion(23, 10.5, 1, 500))
      .toBeGreaterThan(0);
  });

  it("negative when part CTE < machine CTE", () => {
    expect(engine.differentialExpansion(8, 10.5, 1, 500))
      .toBeLessThan(0);
  });
});

// ── Diurnal temperature ─────────────────────────────────────────────────
describe("diurnalTemp", () => {
  it("equals mean at t=6 (sunrise crossing)", () => {
    expect(engine.diurnalTemp(6, 22, 3))
      .toBeCloseTo(22, 5);
  });

  it("peak at t=12 (noon)", () => {
    const t12 = engine.diurnalTemp(12, 22, 3);
    expect(t12).toBeGreaterThan(22);
    expect(t12).toBeLessThanOrEqual(25);
  });

  it("minimum at t=0 (midnight)", () => {
    const t0 = engine.diurnalTemp(0, 22, 3);
    expect(t0).toBeLessThan(22);
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: EnvironmentalInput = {
    part_length_mm: 500,
    tolerance_mm: 0.05,
    simulation_hours: 24,
    mc_samples_per_hour: 10,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.hourly_states.length).toBe(24);
    expect(r.max_thermal_error_um).toBeGreaterThan(0);
    expect(r.rms_total_error_um).toBeGreaterThanOrEqual(0);
    expect(r.peak_to_peak_error_um).toBeGreaterThanOrEqual(0);
    expect(typeof r.cpk_without_env).toBe("number");
    expect(typeof r.cpk_with_env).toBe("number");
    expect(r.best_measurement_hour).toBeGreaterThanOrEqual(0);
    expect(r.formula).toContain("ΔL=α·ΔT·L");
    expect(r.formula).toContain("Cpk");
  });

  it("Cpk with environment ≤ Cpk without", () => {
    const r = engine.analyze(baseInput);
    expect(r.cpk_with_env).toBeLessThanOrEqual(r.cpk_without_env + 0.01);
  });

  it("climate control reduces error", () => {
    const uncontrolled = engine.analyze({
      ...baseInput, climate_controlled: false,
      temp_amplitude_C: 5,
    });
    const controlled = engine.analyze({
      ...baseInput, climate_controlled: true,
      temp_amplitude_C: 0.5,
    });
    expect(controlled.rms_total_error_um)
      .toBeLessThan(uncontrolled.rms_total_error_um);
  });

  it("larger part → larger thermal error", () => {
    const small = engine.analyze({
      ...baseInput, part_length_mm: 100,
    });
    const large = engine.analyze({
      ...baseInput, part_length_mm: 1000,
    });
    expect(large.max_thermal_error_um)
      .toBeGreaterThan(small.max_thermal_error_um);
  });

  it("aluminum part has larger differential error than steel", () => {
    const steel = engine.analyze({
      ...baseInput, part_cte_um_m_C: 11.7,
    });
    const al = engine.analyze({
      ...baseInput, part_cte_um_m_C: 23.1,
    });
    expect(al.max_differential_error_um)
      .toBeGreaterThan(steel.max_differential_error_um);
  });

  it("hourly states have valid temperatures", () => {
    const r = engine.analyze(baseInput);
    for (const s of r.hourly_states) {
      expect(s.temp_C).toBeGreaterThan(0);
      expect(s.humidity_pct).toBeGreaterThan(0);
      expect(s.humidity_pct).toBeLessThanOrEqual(100);
    }
  });

  it("compensation value scales with CTE mismatch", () => {
    const small = engine.analyze({
      ...baseInput, part_cte_um_m_C: 11,
      machine_cte_um_m_C: 10.5,
    });
    const large = engine.analyze({
      ...baseInput, part_cte_um_m_C: 23,
      machine_cte_um_m_C: 10.5,
    });
    expect(large.compensation_value_um_per_C)
      .toBeGreaterThan(small.compensation_value_um_per_C);
  });

  it("warns on large CTE mismatch", () => {
    const r = engine.analyze({
      ...baseInput, part_cte_um_m_C: 23,
      machine_cte_um_m_C: 10.5,
    });
    expect(r.warnings.some(w => w.includes("CTE mismatch"))).toBe(true);
  });

  it("best and worst hours are different", () => {
    const r = engine.analyze({
      ...baseInput, temp_amplitude_C: 5,
    });
    expect(r.best_measurement_hour)
      .not.toBe(r.worst_measurement_hour);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(environmentalVariationEngine)
      .toBeInstanceOf(EnvironmentalVariationEngine);
  });
});
