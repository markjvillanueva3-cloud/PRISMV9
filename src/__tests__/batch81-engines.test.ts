/**
 * Batch 81 — RTD, CoatingThickness, Tribology
 * @milestone FORGE-ENGINES-BATCH81
 */
import { describe, it, expect } from "vitest";
import { rtdEngine } from "../engines/RTDEngine.js";
import { coatingThicknessEngine } from "../engines/CoatingThicknessEngine.js";
import { tribologyEngine } from "../engines/TribologyEngine.js";

describe("RTDEngine", () => {
  const base = { element: "Pt100" as const, measured_temperature_C: 100 };
  it("Pt100 at 100°C ≈ 138.5Ω", () => {
    const r = rtdEngine.calculate(base).resistance_ohm.value;
    expect(r).toBeGreaterThan(138);
    expect(r).toBeLessThan(139);
  });
  it("resistance → temperature roundtrip", () => {
    const R = rtdEngine.calculate(base).resistance_ohm.value;
    const T = rtdEngine.calculate({ element: "Pt100", measured_resistance_ohm: R }).temperature_C.value;
    expect(T).toBeCloseTo(100, 0);
  });
  it("Pt1000 sensitivity 10× Pt100", () => {
    const s100 = rtdEngine.calculate({ element: "Pt100" }).sensitivity_ohm_C.value;
    const s1000 = rtdEngine.calculate({ element: "Pt1000" }).sensitivity_ohm_C.value;
    expect(s1000).toBeCloseTo(s100 * 10, 1);
  });
  it("4-wire has zero wire error", () => {
    expect(rtdEngine.calculate({ ...base, wire_config: "4wire" }).wire_error_C.value).toBe(0);
  });
  it("2-wire error > 3-wire error", () => {
    const e2 = rtdEngine.calculate({ ...base, wire_config: "2wire" }).wire_error_C.value;
    const e3 = rtdEngine.calculate({ ...base, wire_config: "3wire" }).wire_error_C.value;
    expect(e2).toBeGreaterThan(e3);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rtdEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CoatingThicknessEngine", () => {
  const base = { coating_type: "zinc_plate" as const, target_thickness_um: 25 };
  it("corrosion life > 0", () => {
    expect(coatingThicknessEngine.calculate(base).corrosion_life_years.value).toBeGreaterThan(0);
  });
  it("thicker coating → longer life", () => {
    const l25 = coatingThicknessEngine.calculate({ ...base, target_thickness_um: 25 }).corrosion_life_years.value;
    const l50 = coatingThicknessEngine.calculate({ ...base, target_thickness_um: 50 }).corrosion_life_years.value;
    expect(l50).toBeGreaterThan(l25);
  });
  it("DLC hardness > zinc hardness", () => {
    const zn = coatingThicknessEngine.calculate(base).hardness_HV.value;
    const dlc = coatingThicknessEngine.calculate({ ...base, coating_type: "dlc" }).hardness_HV.value;
    expect(dlc).toBeGreaterThan(zn);
  });
  it("coating mass > 0", () => {
    expect(coatingThicknessEngine.calculate(base).coating_mass_g_m2.value).toBeGreaterThan(0);
  });
  it("harsher environment → shorter life", () => {
    const c2 = coatingThicknessEngine.calculate({ ...base, corrosion_class: "C2" }).corrosion_life_years.value;
    const c5 = coatingThicknessEngine.calculate({ ...base, corrosion_class: "C5" }).corrosion_life_years.value;
    expect(c2).toBeGreaterThan(c5);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(coatingThicknessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("TribologyEngine", () => {
  const base = { normal_force_N: 100, sliding_velocity_m_s: 1, contact_area_mm2: 100 };
  it("contact pressure = F/A", () => {
    expect(tribologyEngine.calculate(base).contact_pressure_MPa.value).toBe(1);
  });
  it("higher force → more wear", () => {
    const w1 = tribologyEngine.calculate(base).wear_volume_mm3.value;
    const w2 = tribologyEngine.calculate({ ...base, normal_force_N: 200 }).wear_volume_mm3.value;
    expect(w2).toBeGreaterThan(w1);
  });
  it("harder material → less wear", () => {
    const soft = tribologyEngine.calculate({ ...base, hardness_HV: 100 }).wear_volume_mm3.value;
    const hard = tribologyEngine.calculate({ ...base, hardness_HV: 400 }).wear_volume_mm3.value;
    expect(hard).toBeLessThan(soft);
  });
  it("PV = pressure × velocity", () => {
    const r = tribologyEngine.calculate(base);
    expect(r.pv_value_MPa_m_s.value).toBeCloseTo(r.contact_pressure_MPa.value * 1, 2);
  });
  it("lambda ratio > 0 with lubricant", () => {
    expect(tribologyEngine.calculate({ ...base, viscosity_Pa_s: 0.1 }).lambda_ratio.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(tribologyEngine.calculate(base).recommendations)).toBe(true);
  });
});
