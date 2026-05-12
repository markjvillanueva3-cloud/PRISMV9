/**
 * CalibratedSimulationEngine tests — calibration + safety + uncertainty
 */
import { describe, it, expect } from "vitest";
import { CalibratedSimulationEngine } from "../engines/CalibratedSimulationEngine.js";

const BASE_INPUT = {
  cutting_speed_m_min: 150,
  feed_mm_rev: 0.2,
  depth_of_cut_mm: 3,
  width_of_cut_mm: 6,
  tool_diameter_mm: 12,
  tool_length_mm: 50,
  tool_flutes: 4,
  material: "steel",
  mc_samples: 200,
};

describe("CalibratedSimulationEngine", () => {
  it("produces force with uncertainty bounds", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate(BASE_INPUT);
    expect(r.force_N).toBeGreaterThan(0);
    expect(r.force_uncertainty.ci95_low).toBeLessThan(r.force_N);
    expect(r.force_uncertainty.ci95_high).toBeGreaterThan(r.force_N);
    expect(r.force_uncertainty.samples).toBe(200);
  });

  it("calibration narrows uncertainty", () => {
    const uncal = new CalibratedSimulationEngine();
    const cal = new CalibratedSimulationEngine();
    cal.setCalibration("steel", {
      kc11_correction: 1.05,
      source: "shop_calibrated",
      confidence: 0.9,
    });
    const r1 = uncal.simulate({ ...BASE_INPUT, mc_samples: 500 });
    const r2 = cal.simulate({ ...BASE_INPUT, mc_samples: 500 });
    // Calibrated should have narrower CI
    const span1 = r1.force_uncertainty.ci95_high - r1.force_uncertainty.ci95_low;
    const span2 = r2.force_uncertainty.ci95_high - r2.force_uncertainty.ci95_low;
    expect(span2).toBeLessThan(span1);
  });

  it("calibrated accuracy is 5% vs 15% default", () => {
    const uncal = new CalibratedSimulationEngine();
    const cal = new CalibratedSimulationEngine();
    cal.setCalibration("steel", { source: "shop_calibrated" });
    expect(uncal.simulate(BASE_INPUT).accuracy_estimate_pct).toBe(15);
    expect(cal.simulate(BASE_INPUT).accuracy_estimate_pct).toBe(5);
  });

  it("tool life uncertainty has CI95", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate(BASE_INPUT);
    expect(r.tool_life_min).toBeGreaterThan(0);
    expect(r.life_uncertainty.ci95_low).toBeGreaterThan(0);
    expect(r.life_uncertainty.ci95_high).toBeGreaterThan(r.life_uncertainty.ci95_low);
  });

  it("temperature uncertainty computed", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate(BASE_INPUT);
    expect(r.temperature_C).toBeGreaterThan(20);
    expect(r.temp_uncertainty.mean).toBeGreaterThan(20);
  });

  it("safety flags raised for extreme conditions", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate({
      ...BASE_INPUT,
      depth_of_cut_mm: 15,
      width_of_cut_mm: 25,
      tool_diameter_mm: 6,
      tool_length_mm: 100,
      material: "inconel",
      force_limit_N: 1000,
    });
    expect(r.safety_flags.length).toBeGreaterThan(0);
    expect(r.is_provably_safe).toBe(false);
  });

  it("safe conditions are provably safe", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate({
      ...BASE_INPUT,
      depth_of_cut_mm: 0.5,
      width_of_cut_mm: 2,
      material: "aluminum",
      force_limit_N: 10000,
    });
    expect(r.is_provably_safe).toBe(true);
    expect(r.safety_score).toBeGreaterThan(0.8);
  });

  it("kc11 correction changes force", () => {
    const low = new CalibratedSimulationEngine();
    low.setCalibration("steel", { kc11_correction: 0.8 });
    const high = new CalibratedSimulationEngine();
    high.setCalibration("steel", { kc11_correction: 1.2 });
    const rLow = low.simulate(BASE_INPUT);
    const rHigh = high.simulate(BASE_INPUT);
    expect(rHigh.force_N).toBeGreaterThan(rLow.force_N);
  });

  it("taylor correction changes tool life", () => {
    const low = new CalibratedSimulationEngine();
    low.setCalibration("steel", { taylor_C_correction: 0.7 });
    const high = new CalibratedSimulationEngine();
    high.setCalibration("steel", { taylor_C_correction: 1.5 });
    expect(high.simulate(BASE_INPUT).tool_life_min)
      .toBeGreaterThan(low.simulate(BASE_INPUT).tool_life_min);
  });

  it("surface finish computed", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate(BASE_INPUT);
    expect(r.surface_finish_Ra_um).toBeGreaterThan(0);
  });

  it("p_exceed_limit is probability 0-1", () => {
    const engine = new CalibratedSimulationEngine();
    const r = engine.simulate(BASE_INPUT);
    expect(r.force_uncertainty.p_exceed_limit).toBeGreaterThanOrEqual(0);
    expect(r.force_uncertainty.p_exceed_limit).toBeLessThanOrEqual(1);
  });
});
