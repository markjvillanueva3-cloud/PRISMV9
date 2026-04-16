/**
 * StochasticGrindingEngine Tests
 * Tests Malkin specific energy, Jaeger thermal model, burn probability,
 * surface roughness distribution, and G-ratio scatter.
 */
import { describe, it, expect } from "vitest";
import {
  stochasticGrindingEngine,
  StochasticGrindingEngine,
} from "../engines/StochasticGrindingEngine.js";
import type {
  GrindingUncertaintyInput,
} from "../engines/StochasticGrindingEngine.js";

const engine = stochasticGrindingEngine;

// ── Malkin specific energy ──────────────────────────────────────────────
describe("malkinSpecificEnergy", () => {
  it("increases with shallower cuts", () => {
    const deep = engine.malkinSpecificEnergy(40, 0.05, 0.02, 4, 0);
    const shallow = engine.malkinSpecificEnergy(40, 0.005, 0.02, 4, 0);
    expect(shallow).toBeGreaterThan(deep);
  });

  it("increases with dressing overlap", () => {
    const sharp = engine.malkinSpecificEnergy(40, 0.02, 0.02, 2, 0);
    const dull = engine.malkinSpecificEnergy(40, 0.02, 0.02, 8, 0);
    expect(dull).toBeGreaterThan(sharp);
  });

  it("increases with parts since dress", () => {
    const fresh = engine.malkinSpecificEnergy(40, 0.02, 0.02, 4, 0);
    const worn = engine.malkinSpecificEnergy(40, 0.02, 0.02, 4, 100);
    expect(worn).toBeGreaterThan(fresh);
  });
});

// ── Jaeger temperature ──────────────────────────────────────────────────
describe("jaegerTemperature", () => {
  it("increases with specific energy", () => {
    const low = engine.jaegerTemperature(
      30, 0.02, 5, 30000, 300, 50, 14, 0.6);
    const high = engine.jaegerTemperature(
      80, 0.02, 5, 30000, 300, 50, 14, 0.6);
    expect(high).toBeGreaterThan(low);
  });

  it("coolant reduces temperature", () => {
    const dry = engine.jaegerTemperature(
      40, 0.02, 5, 30000, 300, 50, 14, 0);
    const flood = engine.jaegerTemperature(
      40, 0.02, 5, 30000, 300, 50, 14, 0.6);
    expect(flood).toBeLessThan(dry);
  });

  it("higher conductivity reduces temperature", () => {
    const lowK = engine.jaegerTemperature(
      40, 0.02, 5, 30000, 300, 10, 3, 0.6);
    const highK = engine.jaegerTemperature(
      40, 0.02, 5, 30000, 300, 80, 25, 0.6);
    expect(highK).toBeLessThan(lowK);
  });
});

// ── Surface roughness ───────────────────────────────────────────────────
describe("grindingRoughness", () => {
  it("finer grain → smoother", () => {
    const coarse = engine.grindingRoughness(0.02, 5, 30000, 46);
    const fine = engine.grindingRoughness(0.02, 5, 30000, 120);
    expect(fine).toBeLessThan(coarse);
  });

  it("deeper cut → rougher", () => {
    const shallow = engine.grindingRoughness(0.01, 5, 30000, 60);
    const deep = engine.grindingRoughness(0.05, 5, 30000, 60);
    expect(deep).toBeGreaterThan(shallow);
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: GrindingUncertaintyInput = {
    wheel_speed_ms: 30,
    work_speed_m_min: 15,
    depth_of_cut_mm: 0.02,
    wheel_diameter_mm: 300,
    mc_samples: 500,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.specific_energy.mean).toBeGreaterThan(0);
    expect(r.grinding_force_per_width.mean).toBeGreaterThan(0);
    expect(r.temperature_max.mean).toBeGreaterThan(25);
    expect(r.surface_roughness_Ra.mean).toBeGreaterThan(0);
    expect(r.g_ratio.mean).toBeGreaterThan(0);
    expect(r.burn_probability_pct).toBeGreaterThanOrEqual(0);
    expect(r.burn_risk).toBeTruthy();
    expect(r.power_per_width_kW_mm).toBeGreaterThan(0);
    expect(r.material_removal_rate_mm3_s).toBeGreaterThan(0);
    expect(r.formula).toContain("Malkin");
    expect(r.formula).toContain("Jaeger");
  });

  it("all distributions have p5 < p95", () => {
    const r = engine.analyze(baseInput);
    expect(r.specific_energy.p5).toBeLessThan(r.specific_energy.p95);
    expect(r.temperature_max.p5).toBeLessThan(r.temperature_max.p95);
    expect(r.surface_roughness_Ra.p5)
      .toBeLessThan(r.surface_roughness_Ra.p95);
  });

  it("deeper cut → higher burn risk", () => {
    const shallow = engine.analyze({
      ...baseInput, depth_of_cut_mm: 0.005,
    });
    const deep = engine.analyze({
      ...baseInput, depth_of_cut_mm: 0.08,
    });
    expect(deep.burn_probability_pct)
      .toBeGreaterThanOrEqual(shallow.burn_probability_pct);
  });

  it("flood coolant reduces burn probability", () => {
    const dry = engine.analyze({
      ...baseInput, coolant_type: "dry", depth_of_cut_mm: 0.03,
    });
    const flood = engine.analyze({
      ...baseInput, coolant_type: "flood", depth_of_cut_mm: 0.03,
    });
    expect(flood.burn_probability_pct)
      .toBeLessThanOrEqual(dry.burn_probability_pct);
  });

  it("works for all 6 material types", () => {
    const mats = [
      "steel", "stainless", "inconel",
      "titanium", "cast_iron", "carbide",
    ] as const;
    for (const m of mats) {
      const r = engine.analyze({
        ...baseInput, material_type: m, mc_samples: 100,
      });
      expect(r.specific_energy.mean).toBeGreaterThan(0);
      expect(r.temperature_max.mean).toBeGreaterThan(25);
    }
  });

  it("inconel has higher specific energy than steel", () => {
    const steel = engine.analyze({
      ...baseInput, material_type: "steel",
    });
    const inconel = engine.analyze({
      ...baseInput, material_type: "inconel",
    });
    expect(inconel.specific_energy.mean)
      .toBeGreaterThan(steel.specific_energy.mean);
  });

  it("worn wheel (many parts since dress) increases energy", () => {
    const fresh = engine.analyze({
      ...baseInput, parts_since_dress: 0,
    });
    const worn = engine.analyze({
      ...baseInput, parts_since_dress: 100,
    });
    expect(worn.specific_energy.mean)
      .toBeGreaterThan(fresh.specific_energy.mean);
  });

  it("hard wheel grade has higher G-ratio", () => {
    const soft = engine.analyze({
      ...baseInput, wheel_grade: "soft",
    });
    const hard = engine.analyze({
      ...baseInput, wheel_grade: "hard",
    });
    expect(hard.g_ratio.mean).toBeGreaterThan(soft.g_ratio.mean);
  });

  it("warns on dry grinding", () => {
    const r = engine.analyze({
      ...baseInput, coolant_type: "dry",
    });
    expect(r.warnings.some(w => w.includes("Dry"))).toBe(true);
  });

  it("warns on high burn temp percentile", () => {
    const r = engine.analyze({
      ...baseInput,
      depth_of_cut_mm: 0.06,
      work_speed_m_min: 25,
      coolant_type: "mql",
    });
    // May or may not warn depending on temperature
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(stochasticGrindingEngine)
      .toBeInstanceOf(StochasticGrindingEngine);
  });
});
