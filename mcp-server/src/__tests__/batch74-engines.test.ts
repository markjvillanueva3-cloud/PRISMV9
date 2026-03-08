/**
 * Batch 74 — BoltedJoint, AdhesiveBonding, CathodicProtection
 * @milestone FORGE-ENGINES-BATCH74
 */
import { describe, it, expect } from "vitest";
import { boltedJointEngine } from "../engines/BoltedJointEngine.js";
import { adhesiveBondingEngine } from "../engines/AdhesiveBondingEngine.js";
import { cathodicProtectionEngine } from "../engines/CathodicProtectionEngine.js";

describe("BoltedJointEngine", () => {
  const base = { bolt_diameter_mm: 12, clamp_length_mm: 30, external_load_N: 10000 };
  it("preload > 0", () => {
    expect(boltedJointEngine.calculate(base).preload_N.value).toBeGreaterThan(0);
  });
  it("higher grade = higher preload", () => {
    const lo = boltedJointEngine.calculate({ ...base, bolt_grade: "4.8" as const }).preload_N.value;
    const hi = boltedJointEngine.calculate({ ...base, bolt_grade: "12.9" as const }).preload_N.value;
    expect(hi).toBeGreaterThan(lo);
  });
  it("bolt load > preload (loaded)", () => {
    expect(boltedJointEngine.calculate(base).bolt_load_N.value).toBeGreaterThan(
      boltedJointEngine.calculate(base).preload_N.value * 0.5
    );
  });
  it("tightening torque > 0", () => {
    expect(boltedJointEngine.calculate(base).tightening_torque_Nm.value).toBeGreaterThan(0);
  });
  it("safety factor > 1 for moderate load", () => {
    expect(boltedJointEngine.calculate(base).safety_factor_yield.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(boltedJointEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AdhesiveBondingEngine", () => {
  const base = { overlap_length_mm: 25, bond_width_mm: 25, adherend_thickness_mm: 2, applied_load_N: 5000 };
  it("average shear stress > 0", () => {
    expect(adhesiveBondingEngine.calculate(base).average_shear_stress_MPa.value).toBeGreaterThan(0);
  });
  it("peak > average (shear lag)", () => {
    const r = adhesiveBondingEngine.calculate(base);
    expect(r.peak_shear_stress_MPa.value).toBeGreaterThanOrEqual(r.average_shear_stress_MPa.value);
  });
  it("epoxy stronger than silicone", () => {
    const ep = adhesiveBondingEngine.calculate({ ...base, adhesive_type: "epoxy" as const }).shear_safety_factor.value;
    const si = adhesiveBondingEngine.calculate({ ...base, adhesive_type: "silicone" as const }).shear_safety_factor.value;
    expect(ep).toBeGreaterThan(si);
  });
  it("bond area = L × w", () => {
    expect(adhesiveBondingEngine.calculate(base).bond_area_mm2.value).toBe(625);
  });
  it("optimal overlap > 0", () => {
    expect(adhesiveBondingEngine.calculate(base).optimal_overlap_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(adhesiveBondingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CathodicProtectionEngine", () => {
  const base = { surface_area_m2: 500 };
  it("current required > 0", () => {
    expect(cathodicProtectionEngine.calculate(base).current_required_A.value).toBeGreaterThan(0);
  });
  it("num anodes > 0", () => {
    expect(cathodicProtectionEngine.calculate(base).num_anodes.value).toBeGreaterThan(0);
  });
  it("anode life ≥ design life", () => {
    expect(cathodicProtectionEngine.calculate(base).anode_life_years.value).toBeGreaterThanOrEqual(20);
  });
  it("more area = more current", () => {
    const lo = cathodicProtectionEngine.calculate({ ...base, surface_area_m2: 100 }).current_required_A.value;
    const hi = cathodicProtectionEngine.calculate({ ...base, surface_area_m2: 2000 }).current_required_A.value;
    expect(hi).toBeGreaterThan(lo);
  });
  it("driving voltage > 0", () => {
    expect(cathodicProtectionEngine.calculate(base).driving_voltage_V.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(cathodicProtectionEngine.calculate(base).recommendations)).toBe(true);
  });
});
