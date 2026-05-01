/**
 * Batch 105 — Electroplating, ThermalSpray, PhotochemicalEtching
 * @milestone FORGE-ENGINES-BATCH105
 */
import { describe, it, expect } from "vitest";
import { electroplatingEngine } from "../engines/ElectroplatingEngine.js";
import { thermalSprayEngine } from "../engines/ThermalSprayEngine.js";
import { photochemicalEtchingEngine } from "../engines/PhotochemicalEtchingEngine.js";

describe("ElectroplatingEngine", () => {
  const base = { surface_area_dm2: 10 };
  it("plating time > 0", () => {
    expect(electroplatingEngine.calculate(base).plating_time_min.value).toBeGreaterThan(0);
  });
  it("deposition rate > 0", () => {
    expect(electroplatingEngine.calculate(base).deposition_rate_um_min.value).toBeGreaterThan(0);
  });
  it("chrome lower efficiency than nickel", () => {
    const ni = electroplatingEngine.calculate({ ...base, metal: "nickel" }).current_efficiency_pct.value;
    const cr = electroplatingEngine.calculate({ ...base, metal: "chrome_hard" }).current_efficiency_pct.value;
    expect(cr).toBeLessThan(ni);
  });
  it("metal consumption > 0", () => {
    expect(electroplatingEngine.calculate(base).metal_consumption_g.value).toBeGreaterThan(0);
  });
  it("energy > 0", () => {
    expect(electroplatingEngine.calculate(base).energy_kWh.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(electroplatingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThermalSprayEngine", () => {
  const base = { target_thickness_um: 300 };
  it("particle velocity > 0", () => {
    expect(thermalSprayEngine.calculate(base).particle_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("HVOF faster particles than APS", () => {
    const hvof = thermalSprayEngine.calculate({ ...base, method: "HVOF" }).particle_velocity_m_s.value;
    const aps = thermalSprayEngine.calculate({ ...base, method: "APS" }).particle_velocity_m_s.value;
    expect(hvof).toBeGreaterThan(aps);
  });
  it("bond strength > 0", () => {
    expect(thermalSprayEngine.calculate(base).bond_strength_MPa.value).toBeGreaterThan(0);
  });
  it("porosity < 20%", () => {
    expect(thermalSprayEngine.calculate(base).porosity_pct.value).toBeLessThan(20);
  });
  it("coating hardness > 0", () => {
    expect(thermalSprayEngine.calculate(base).coating_hardness_HV.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thermalSprayEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PhotochemicalEtchingEngine", () => {
  const base = { material_thickness_mm: 0.5 };
  it("etch rate > 0", () => {
    expect(photochemicalEtchingEngine.calculate(base).etch_rate_um_min.value).toBeGreaterThan(0);
  });
  it("etch time > 0", () => {
    expect(photochemicalEtchingEngine.calculate(base).etch_time_min.value).toBeGreaterThan(0);
  });
  it("copper etches faster than titanium", () => {
    const cu = photochemicalEtchingEngine.calculate({ ...base, material: "copper" }).etch_rate_um_min.value;
    const ti = photochemicalEtchingEngine.calculate({ ...base, material: "titanium" }).etch_rate_um_min.value;
    expect(cu).toBeGreaterThan(ti);
  });
  it("undercut ratio > 0", () => {
    expect(photochemicalEtchingEngine.calculate(base).undercut_ratio.value).toBeGreaterThan(0);
  });
  it("tolerance > 0", () => {
    expect(photochemicalEtchingEngine.calculate(base).dimensional_tolerance_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(photochemicalEtchingEngine.calculate(base).recommendations)).toBe(true);
  });
});
