/**
 * StochasticEDMEngine Tests
 * Tests discharge energy variability, crater geometry, MRR distribution,
 * recast layer depth, electrode wear ratio, and short-circuit probability.
 */
import { describe, it, expect } from "vitest";
import {
  stochasticEDMEngine,
  StochasticEDMEngine,
} from "../engines/StochasticEDMEngine.js";
import type {
  EDMUncertaintyInput,
} from "../engines/StochasticEDMEngine.js";

const engine = stochasticEDMEngine;

// ── Deterministic helpers ───────────────────────────────────────────────
describe("craterDiameter", () => {
  it("increases with energy", () => {
    expect(engine.craterDiameter(10, 14))
      .toBeGreaterThan(engine.craterDiameter(1, 14));
  });

  it("increases with thermal diffusivity", () => {
    expect(engine.craterDiameter(5, 25))
      .toBeGreaterThan(engine.craterDiameter(5, 3));
  });

  it("positive for any positive energy", () => {
    expect(engine.craterDiameter(0.1, 14)).toBeGreaterThan(0);
  });
});

describe("recastDepth", () => {
  it("increases with pulse duration", () => {
    expect(engine.recastDepth(14, 100))
      .toBeGreaterThan(engine.recastDepth(14, 10));
  });

  it("increases with thermal diffusivity", () => {
    expect(engine.recastDepth(25, 50))
      .toBeGreaterThan(engine.recastDepth(3, 50));
  });

  it("scales as √(α·t)", () => {
    const d1 = engine.recastDepth(14, 25);
    const d2 = engine.recastDepth(14, 100);
    // t2/t1 = 4, so d2/d1 ≈ 2
    expect(d2 / d1).toBeCloseTo(2, 1);
  });
});

describe("edmRoughness", () => {
  it("increases with pulse energy", () => {
    expect(engine.edmRoughness(10, 50))
      .toBeGreaterThan(engine.edmRoughness(1, 50));
  });

  it("increases with pulse duration", () => {
    expect(engine.edmRoughness(5, 200))
      .toBeGreaterThan(engine.edmRoughness(5, 10));
  });
});

describe("shortCircuitProb", () => {
  it("zero when freshly dressed", () => {
    const p = engine.shortCircuitProb(0, 5);
    expect(p).toBeCloseTo(0, 1);
  });

  it("increases with parts since dress", () => {
    expect(engine.shortCircuitProb(100, 5))
      .toBeGreaterThan(engine.shortCircuitProb(10, 5));
  });

  it("higher flushing reduces probability", () => {
    expect(engine.shortCircuitProb(50, 10))
      .toBeLessThan(engine.shortCircuitProb(50, 1));
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: EDMUncertaintyInput = {
    pulse_energy_mJ: 5,
    pulse_on_us: 50,
    pulse_off_us: 25,
    gap_voltage_V: 60,
    peak_current_A: 15,
    mc_samples: 500,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.mrr_mm3_min.mean).toBeGreaterThan(0);
    expect(r.surface_roughness_Ra.mean).toBeGreaterThan(0);
    expect(r.recast_depth_um.mean).toBeGreaterThan(0);
    expect(r.electrode_wear_ratio.mean).toBeGreaterThan(0);
    expect(r.crater_diameter_um.mean).toBeGreaterThan(0);
    expect(r.short_circuit_probability_pct).toBeGreaterThanOrEqual(0);
    expect(r.process_efficiency_pct).toBeGreaterThan(0);
    expect(r.formula).toContain("crater");
    expect(r.formula).toContain("MRR");
    expect(r.formula).toContain("recast");
  });

  it("all distributions have p5 < p95", () => {
    const r = engine.analyze(baseInput);
    expect(r.mrr_mm3_min.p5).toBeLessThan(r.mrr_mm3_min.p95);
    expect(r.surface_roughness_Ra.p5)
      .toBeLessThan(r.surface_roughness_Ra.p95);
    expect(r.recast_depth_um.p5).toBeLessThan(r.recast_depth_um.p95);
  });

  it("higher pulse energy → rougher surface", () => {
    const low = engine.analyze({ ...baseInput, pulse_energy_mJ: 1 });
    const high = engine.analyze({ ...baseInput, pulse_energy_mJ: 20 });
    expect(high.surface_roughness_Ra.mean)
      .toBeGreaterThan(low.surface_roughness_Ra.mean);
  });

  it("graphite electrode has lower wear than copper", () => {
    const cu = engine.analyze({
      ...baseInput, electrode_material: "copper",
    });
    const gr = engine.analyze({
      ...baseInput, electrode_material: "graphite",
    });
    expect(gr.electrode_wear_ratio.mean)
      .toBeLessThan(cu.electrode_wear_ratio.mean);
  });

  it("works for all 5 material types", () => {
    const mats = [
      "steel", "carbide", "titanium", "inconel", "copper",
    ] as const;
    for (const m of mats) {
      const r = engine.analyze({
        ...baseInput, material: m, mc_samples: 100,
      });
      expect(r.mrr_mm3_min.mean).toBeGreaterThan(0);
    }
  });

  it("works for all EDM types", () => {
    const types = ["sinker", "wire", "micro"] as const;
    for (const t of types) {
      const r = engine.analyze({
        ...baseInput, edm_type: t, mc_samples: 100,
      });
      expect(r.mrr_mm3_min.mean).toBeGreaterThan(0);
    }
  });

  it("wire EDM has lower MRR than sinker", () => {
    const sinker = engine.analyze({
      ...baseInput, edm_type: "sinker",
    });
    const wire = engine.analyze({
      ...baseInput, edm_type: "wire",
    });
    expect(wire.mrr_mm3_min.mean)
      .toBeLessThan(sinker.mrr_mm3_min.mean);
  });

  it("warns on micro-EDM with high energy", () => {
    const r = engine.analyze({
      ...baseInput, edm_type: "micro", pulse_energy_mJ: 5,
    });
    expect(r.warnings.some(w => w.includes("micro-EDM"))).toBe(true);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(stochasticEDMEngine)
      .toBeInstanceOf(StochasticEDMEngine);
  });
});
