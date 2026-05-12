/**
 * Batch 75 — RackPinion, LeadScrew, Propeller
 * @milestone FORGE-ENGINES-BATCH75
 */
import { describe, it, expect } from "vitest";
import { rackPinionEngine } from "../engines/RackPinionEngine.js";
import { leadScrewEngine } from "../engines/LeadScrewEngine.js";
import { propellerEngine } from "../engines/PropellerEngine.js";

describe("RackPinionEngine", () => {
  const base = { module_mm: 2, pinion_teeth: 20, transmitted_force_N: 1000 };
  it("pitch diameter = m × z", () => {
    expect(rackPinionEngine.calculate(base).pitch_diameter_mm.value).toBeCloseTo(40, 0);
  });
  it("linear speed > 0", () => {
    expect(rackPinionEngine.calculate(base).linear_speed_m_min.value).toBeGreaterThan(0);
  });
  it("bending stress > 0", () => {
    expect(rackPinionEngine.calculate(base).bending_stress_MPa.value).toBeGreaterThan(0);
  });
  it("higher quality = less backlash", () => {
    const q5 = rackPinionEngine.calculate({ ...base, quality: "Q5" as const }).backlash_mm.value;
    const q10 = rackPinionEngine.calculate({ ...base, quality: "Q10" as const }).backlash_mm.value;
    expect(q5).toBeLessThan(q10);
  });
  it("torque > 0", () => {
    expect(rackPinionEngine.calculate(base).required_torque_Nm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rackPinionEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("LeadScrewEngine", () => {
  const base = { major_diameter_mm: 20, lead_mm: 4, axial_load_N: 5000 };
  it("torque raise > 0", () => {
    expect(leadScrewEngine.calculate(base).torque_raise_Nm.value).toBeGreaterThan(0);
  });
  it("self-locking with high friction", () => {
    expect(leadScrewEngine.calculate({ ...base, friction_coefficient: 0.20 }).is_self_locking.value).toBe(1);
  });
  it("efficiency < 100%", () => {
    const eta = leadScrewEngine.calculate(base).efficiency_pct.value;
    expect(eta).toBeGreaterThan(0);
    expect(eta).toBeLessThan(100);
  });
  it("critical speed > 0", () => {
    expect(leadScrewEngine.calculate(base).critical_speed_rpm.value).toBeGreaterThan(0);
  });
  it("buckling load > 0", () => {
    expect(leadScrewEngine.calculate(base).buckling_load_N.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(leadScrewEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PropellerEngine", () => {
  const base = { diameter_mm: 500, pitch_mm: 400, speed_rpm: 5000 };
  it("static thrust > 0", () => {
    expect(propellerEngine.calculate(base).thrust_N.value).toBeGreaterThan(0);
  });
  it("advance ratio = 0 at static", () => {
    expect(propellerEngine.calculate(base).advance_ratio.value).toBe(0);
  });
  it("tip speed > 0", () => {
    expect(propellerEngine.calculate(base).tip_speed_m_s.value).toBeGreaterThan(0);
  });
  it("thrust decreases with advance velocity", () => {
    const stat = propellerEngine.calculate(base).thrust_N.value;
    const moving = propellerEngine.calculate({ ...base, advance_velocity_m_s: 20 }).thrust_N.value;
    expect(moving).toBeLessThan(stat);
  });
  it("power > 0", () => {
    expect(propellerEngine.calculate(base).power_W.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(propellerEngine.calculate(base).recommendations)).toBe(true);
  });
});
