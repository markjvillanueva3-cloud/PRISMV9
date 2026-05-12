/**
 * Batch 103 — VibratoryFeeder, PneumaticConveying, ElectrostaticPrecipitator
 * @milestone FORGE-ENGINES-BATCH103
 */
import { describe, it, expect } from "vitest";
import { vibratoryFeederEngine } from "../engines/VibratoryFeederEngine.js";
import { pneumaticConveyingEngine } from "../engines/PneumaticConveyingEngine.js";
import { electrostaticPrecipitatorEngine } from "../engines/ElectrostaticPrecipitatorEngine.js";

describe("VibratoryFeederEngine", () => {
  const base = { part_mass_g: 5 };
  it("feed rate > 0", () => {
    expect(vibratoryFeederEngine.calculate(base).feed_rate_parts_min.value).toBeGreaterThan(0);
  });
  it("throw factor > 0", () => {
    expect(vibratoryFeederEngine.calculate(base).throw_factor.value).toBeGreaterThan(0);
  });
  it("higher amplitude → higher velocity", () => {
    const v03 = vibratoryFeederEngine.calculate({ ...base, amplitude_mm: 0.3 }).conveying_velocity_mm_s.value;
    const v10 = vibratoryFeederEngine.calculate({ ...base, amplitude_mm: 1.0 }).conveying_velocity_mm_s.value;
    expect(v10).toBeGreaterThan(v03);
  });
  it("spherical parts best orientation", () => {
    const sph = vibratoryFeederEngine.calculate({ ...base, part_shape: "spherical" }).orientation_efficiency_pct.value;
    const irr = vibratoryFeederEngine.calculate({ ...base, part_shape: "irregular" }).orientation_efficiency_pct.value;
    expect(sph).toBeGreaterThan(irr);
  });
  it("power > 0", () => {
    expect(vibratoryFeederEngine.calculate(base).power_W.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(vibratoryFeederEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PneumaticConveyingEngine", () => {
  const base = { capacity_tph: 10 };
  it("air velocity > 0", () => {
    expect(pneumaticConveyingEngine.calculate(base).air_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("pressure drop > 0", () => {
    expect(pneumaticConveyingEngine.calculate(base).pressure_drop_bar.value).toBeGreaterThan(0);
  });
  it("dilute phase faster than dense phase", () => {
    const dil = pneumaticConveyingEngine.calculate({ ...base, mode: "dilute_phase" }).air_velocity_m_s.value;
    const den = pneumaticConveyingEngine.calculate({ ...base, mode: "dense_phase" }).air_velocity_m_s.value;
    expect(dil).toBeGreaterThan(den);
  });
  it("pipe diameter > 0", () => {
    expect(pneumaticConveyingEngine.calculate(base).pipe_diameter_mm.value).toBeGreaterThan(0);
  });
  it("power > 0", () => {
    expect(pneumaticConveyingEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(pneumaticConveyingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ElectrostaticPrecipitatorEngine", () => {
  const base = { gas_flow_m3_s: 50 };
  it("efficiency > 90%", () => {
    expect(electrostaticPrecipitatorEngine.calculate(base).collection_efficiency_pct.value).toBeGreaterThan(90);
  });
  it("more fields → higher efficiency", () => {
    const e2 = electrostaticPrecipitatorEngine.calculate({ ...base, number_of_fields: 2 }).collection_efficiency_pct.value;
    const e5 = electrostaticPrecipitatorEngine.calculate({ ...base, number_of_fields: 5 }).collection_efficiency_pct.value;
    expect(e5).toBeGreaterThanOrEqual(e2);
  });
  it("plate area > 0", () => {
    expect(electrostaticPrecipitatorEngine.calculate(base).plate_area_m2.value).toBeGreaterThan(0);
  });
  it("pressure drop very low (< 500 Pa)", () => {
    expect(electrostaticPrecipitatorEngine.calculate(base).pressure_drop_Pa.value).toBeLessThan(500);
  });
  it("outlet loading < inlet", () => {
    const r = electrostaticPrecipitatorEngine.calculate({ ...base, inlet_loading_g_m3: 10 });
    expect(r.outlet_loading_mg_m3.value).toBeLessThan(10000); // 10 g/m3 = 10000 mg/m3
  });
  it("recommendations is array", () => {
    expect(Array.isArray(electrostaticPrecipitatorEngine.calculate(base).recommendations)).toBe(true);
  });
});
