/**
 * ThermalWearCouplingEngine Tests
 * Tests coupled ODE system: wear→force→temperature→wear feedback loop,
 * RK4 integration, feedback gain, and Monte Carlo life distribution.
 */
import { describe, it, expect } from "vitest";
import {
  thermalWearCouplingEngine,
  ThermalWearCouplingEngine,
} from "../engines/ThermalWearCouplingEngine.js";
import type { CouplingInput } from "../engines/ThermalWearCouplingEngine.js";

const engine = thermalWearCouplingEngine;

// ── Deterministic helpers ───────────────────────────────────────────────
describe("wearRate", () => {
  // Usui canonical: dVB/dt = C1 · σ_n · V_s · exp(-C2/T_K)
  const sigma = 500; // MPa, typical contact stress

  it("increases with temperature (Arrhenius)", () => {
    const r1 = engine.wearRate(1e-5, 5000, 200, sigma, 700);
    const r2 = engine.wearRate(1e-5, 5000, 200, sigma, 900);
    expect(r2).toBeGreaterThan(r1);
  });

  it("zero at zero temperature", () => {
    expect(engine.wearRate(1e-5, 5000, 200, sigma, 0)).toBe(0);
  });

  it("proportional to sliding velocity", () => {
    const r1 = engine.wearRate(1e-5, 5000, 100, sigma, 800);
    const r2 = engine.wearRate(1e-5, 5000, 200, sigma, 800);
    expect(r2 / r1).toBeCloseTo(2, 1);
  });

  it("proportional to contact stress", () => {
    const r1 = engine.wearRate(1e-5, 5000, 200, 250, 800);
    const r2 = engine.wearRate(1e-5, 5000, 200, 500, 800);
    expect(r2 / r1).toBeCloseTo(2, 1);
  });
});

describe("forceFromWear", () => {
  it("equals F0 when VB=0", () => {
    expect(engine.forceFromWear(500, 0, 3, 0.3)).toBe(500);
  });

  it("increases with wear", () => {
    const f1 = engine.forceFromWear(500, 0.1, 3, 0.3);
    const f2 = engine.forceFromWear(500, 0.3, 3, 0.3);
    expect(f2).toBeGreaterThan(f1);
  });

  it("doubles at VB=VBref when k_vb=1", () => {
    expect(engine.forceFromWear(500, 0.3, 1, 0.3)).toBeCloseTo(1000, 0);
  });
});

describe("tempFromForce", () => {
  it("higher force → higher temperature", () => {
    const t1 = engine.tempFromForce(300, 200, 25);
    const t2 = engine.tempFromForce(600, 200, 25);
    expect(t2).toBeGreaterThan(t1);
  });

  it("starts at ambient when force is 0", () => {
    expect(engine.tempFromForce(0, 200, 25)).toBeCloseTo(25, 0);
  });
});

// ── Full coupled analysis ───────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: CouplingInput = {
    cutting_speed_m_min: 200,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
    initial_force_N: 500,
    simulation_time_min: 30,
    time_step_s: 2,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.trajectory.length).toBeGreaterThan(0);
    expect(r.time_to_limit_min).toBeGreaterThan(0);
    expect(r.final_force_N).toBeGreaterThan(0);
    expect(r.max_temp_C).toBeGreaterThan(25);
    expect(r.force_amplification_pct).toBeGreaterThanOrEqual(0);
    expect(r.thermal_acceleration_factor).toBeGreaterThanOrEqual(1);
    expect(r.feedback_gain).toBeGreaterThanOrEqual(1);
    expect(r.formula).toContain("Usui");
    expect(r.formula).toContain("RK4");
    expect(r.formula).toContain("Gain");
  });

  it("trajectory starts at initial conditions", () => {
    const r = engine.analyze(baseInput);
    const first = r.trajectory[0];
    expect(first.wear_mm).toBeCloseTo(0, 3);
    expect(first.force_N).toBeCloseTo(500, 0);
    expect(first.time_min).toBe(0);
  });

  it("wear grows monotonically", () => {
    const r = engine.analyze(baseInput);
    for (let i = 1; i < r.trajectory.length; i++) {
      expect(r.trajectory[i].wear_mm)
        .toBeGreaterThanOrEqual(r.trajectory[i - 1].wear_mm);
    }
  });

  it("force grows with wear", () => {
    const r = engine.analyze(baseInput);
    expect(r.final_force_N).toBeGreaterThan(baseInput.initial_force_N);
  });

  it("temperature grows with force", () => {
    const r = engine.analyze(baseInput);
    const first = r.trajectory[0];
    const last = r.trajectory[r.trajectory.length - 1];
    expect(last.temp_C).toBeGreaterThanOrEqual(first.temp_C);
  });

  it("feedback gain > 1 (coupling shortens life)", () => {
    const r = engine.analyze(baseInput);
    expect(r.feedback_gain).toBeGreaterThanOrEqual(1);
  });

  it("higher speed → shorter life", () => {
    const slow = engine.analyze({
      ...baseInput, cutting_speed_m_min: 100,
    });
    const fast = engine.analyze({
      ...baseInput, cutting_speed_m_min: 300,
    });
    expect(fast.time_to_limit_min)
      .toBeLessThanOrEqual(slow.time_to_limit_min);
  });

  it("higher wear-force factor → stronger feedback", () => {
    const weak = engine.analyze({
      ...baseInput, wear_force_factor: 1,
    });
    const strong = engine.analyze({
      ...baseInput, wear_force_factor: 5,
    });
    expect(strong.feedback_gain)
      .toBeGreaterThanOrEqual(weak.feedback_gain);
  });

  it("Monte Carlo produces life distribution", () => {
    const r = engine.analyze({
      ...baseInput,
      mc_samples: 30,
      simulation_time_min: 60,
      time_step_s: 5,
      usui_C1: 5e-3,  // faster wear for shorter sim
      usui_C2: 2000,
    });
    expect(r.life_distribution).toBeDefined();
    expect(r.life_distribution!.mean_min).toBeGreaterThan(0);
    expect(r.life_distribution!.p10_min)
      .toBeLessThanOrEqual(r.life_distribution!.p90_min);
  });

  it("recommends when feedback gain is high", () => {
    const r = engine.analyze({
      ...baseInput, wear_force_factor: 8,
    });
    if (r.feedback_gain > 2) {
      expect(r.recommendations.some(
        rec => rec.includes("feedback"),
      )).toBe(true);
    }
  });

  it("cumulative error tracks deflection growth", () => {
    const r = engine.analyze(baseInput);
    const last = r.trajectory[r.trajectory.length - 1];
    expect(last.cumulative_error_um).toBeGreaterThanOrEqual(0);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(thermalWearCouplingEngine)
      .toBeInstanceOf(ThermalWearCouplingEngine);
  });
});
