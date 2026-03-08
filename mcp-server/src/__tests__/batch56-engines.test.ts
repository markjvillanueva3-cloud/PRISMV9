/**
 * Batch 56 — TubeForming, FlyingShear, ThermalExpansionJoint
 * @milestone FORGE-ENGINES-BATCH56
 */
import { describe, it, expect } from "vitest";
import { tubeFormingEngine } from "../engines/TubeFormingEngine.js";
import { flyingShearEngine } from "../engines/FlyingShearEngine.js";
import { thermalExpansionJointEngine } from "../engines/ThermalExpansionJointEngine.js";

describe("TubeFormingEngine", () => {
  const base = {
    outer_diameter_mm: 50, wall_thickness_mm: 2,
    bend_radius_mm: 100, bend_angle_deg: 90,
  };

  it("bending force > 0", () => {
    expect(tubeFormingEngine.calculate(base).bending_force_kN.value).toBeGreaterThan(0);
  });
  it("wall thinning > 0", () => {
    expect(tubeFormingEngine.calculate(base).wall_thinning_pct.value).toBeGreaterThan(0);
  });
  it("tighter bend = more thinning", () => {
    const loose = tubeFormingEngine.calculate({ ...base, bend_radius_mm: 200 });
    const tight = tubeFormingEngine.calculate({ ...base, bend_radius_mm: 60 });
    expect(tight.wall_thinning_pct.value).toBeGreaterThan(loose.wall_thinning_pct.value);
  });
  it("springback > 0", () => {
    expect(tubeFormingEngine.calculate(base).springback_angle_deg.value).toBeGreaterThan(0);
  });
  it("d_ratio > 0", () => {
    expect(tubeFormingEngine.calculate(base).d_ratio.value).toBeGreaterThan(0);
  });
  it("min wall < original wall", () => {
    expect(tubeFormingEngine.calculate(base).min_wall_mm.value).toBeLessThan(2);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(tubeFormingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FlyingShearEngine", () => {
  const base = {
    strip_width_mm: 300, strip_thickness_mm: 3,
    line_speed_m_min: 60, cut_length_mm: 1000,
  };

  it("shear force > 0", () => {
    expect(flyingShearEngine.calculate(base).shear_force_kN.value).toBeGreaterThan(0);
  });
  it("cuts per min matches speed/length", () => {
    const r = flyingShearEngine.calculate(base);
    expect(r.cuts_per_min.value).toBeCloseTo(60, 0);
  });
  it("thicker strip needs more force", () => {
    const thin = flyingShearEngine.calculate({ ...base, strip_thickness_mm: 1 });
    const thick = flyingShearEngine.calculate({ ...base, strip_thickness_mm: 6 });
    expect(thick.shear_force_kN.value).toBeGreaterThan(thin.shear_force_kN.value);
  });
  it("motor power > 0", () => {
    expect(flyingShearEngine.calculate(base).motor_power_kW.value).toBeGreaterThan(0);
  });
  it("blade life > 0", () => {
    expect(flyingShearEngine.calculate(base).blade_life_cuts.value).toBeGreaterThan(0);
  });
  it("sync window > 0", () => {
    expect(flyingShearEngine.calculate(base).synchronization_window_ms.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(flyingShearEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThermalExpansionJointEngine", () => {
  const base = {
    pipe_od_mm: 200, pipe_length_m: 50,
    temp_min_C: -10, temp_max_C: 200,
  };

  it("thermal expansion > 0", () => {
    expect(thermalExpansionJointEngine.calculate(base).thermal_expansion_mm.value).toBeGreaterThan(0);
  });
  it("required movement > expansion", () => {
    const r = thermalExpansionJointEngine.calculate(base);
    expect(r.required_movement_mm.value).toBeGreaterThan(r.thermal_expansion_mm.value);
  });
  it("higher temp range = more expansion", () => {
    const lo = thermalExpansionJointEngine.calculate({ ...base, temp_max_C: 100 });
    const hi = thermalExpansionJointEngine.calculate({ ...base, temp_max_C: 400 });
    expect(hi.thermal_expansion_mm.value).toBeGreaterThan(lo.thermal_expansion_mm.value);
  });
  it("anchor force > 0", () => {
    expect(thermalExpansionJointEngine.calculate(base).anchor_force_kN.value).toBeGreaterThan(0);
  });
  it("convolutions ≥ 1", () => {
    expect(thermalExpansionJointEngine.calculate(base).num_convolutions.value).toBeGreaterThanOrEqual(1);
  });
  it("cycle life > 0", () => {
    expect(thermalExpansionJointEngine.calculate(base).cycle_life.value).toBeGreaterThan(0);
  });
  it("pressure thrust > 0", () => {
    expect(thermalExpansionJointEngine.calculate(base).pressure_thrust_kN.value).toBeGreaterThan(0);
  });
  it("guide spacing > 0", () => {
    expect(thermalExpansionJointEngine.calculate(base).guide_spacing_m.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thermalExpansionJointEngine.calculate(base).recommendations)).toBe(true);
  });
});
