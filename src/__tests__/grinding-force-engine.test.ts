/**
 * GrindingForceEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { grindingForceEngine } from "../engines/GrindingForceEngine.js";

describe("GrindingForceEngine", () => {
  const base = {
    wheel_diameter_mm: 200,
    wheel_speed_m_s: 30,
    work_speed_m_min: 15,
    depth_of_cut_mm: 0.02,
    width_of_cut_mm: 20,
    grinding_mode: "surface" as const,
  };

  it("tangential force > 0", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.tangential_force_N.value).toBeGreaterThan(0);
  });

  it("normal force > tangential force", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.normal_force_N.value).toBeGreaterThan(
      r.tangential_force_N.value
    );
  });

  it("grinding power > 0", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.grinding_power_kW.value).toBeGreaterThan(0);
  });

  it("specific energy > 0", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.specific_energy_J_mm3.value).toBeGreaterThan(0);
  });

  it("MRR > 0", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.mrr_mm3_per_s.value).toBeGreaterThan(0);
  });

  it("includes playbook recommendations", () => {
    const r = grindingForceEngine.calculate(base);
    expect(r.recommendations.some((rec) => rec.includes("[Playbook"))).toBe(true);
  });

  it("deeper cut increases force", () => {
    const shallow = grindingForceEngine.calculate({ ...base, depth_of_cut_mm: 0.01 });
    const deep = grindingForceEngine.calculate({ ...base, depth_of_cut_mm: 0.05 });
    expect(deep.tangential_force_N.value).toBeGreaterThan(
      shallow.tangential_force_N.value
    );
  });
});
