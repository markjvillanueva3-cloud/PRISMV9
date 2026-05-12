/**
 * TurningForceEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { turningForceEngine } from "../engines/TurningForceEngine.js";

describe("TurningForceEngine", () => {
  const base = {
    cutting_speed_m_min: 200,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
  };

  it("tangential force > 0", () => {
    const r = turningForceEngine.calculate(base);
    expect(r.tangential_force_Fc_N.value).toBeGreaterThan(0);
  });

  it("feed force > 0", () => {
    const r = turningForceEngine.calculate(base);
    expect(r.feed_force_Ff_N.value).toBeGreaterThan(0);
  });

  it("radial force > 0", () => {
    const r = turningForceEngine.calculate(base);
    expect(r.radial_force_Fp_N.value).toBeGreaterThan(0);
  });

  it("resultant > any component", () => {
    const r = turningForceEngine.calculate(base);
    expect(r.resultant_force_N.value).toBeGreaterThan(
      r.tangential_force_Fc_N.value
    );
  });

  it("cutting power > 0", () => {
    const r = turningForceEngine.calculate(base);
    expect(r.cutting_power_kW.value).toBeGreaterThan(0);
  });

  it("deeper cut increases tangential force", () => {
    const shallow = turningForceEngine.calculate({ ...base, depth_of_cut_mm: 0.5 });
    const deep = turningForceEngine.calculate({ ...base, depth_of_cut_mm: 5 });
    expect(deep.tangential_force_Fc_N.value).toBeGreaterThan(
      shallow.tangential_force_Fc_N.value
    );
  });
});
