/**
 * Batch 82 — RollingBearing, ScrewCompressor, ReciprocatingCompressor
 * @milestone FORGE-ENGINES-BATCH82
 */
import { describe, it, expect } from "vitest";
import { rollingBearingEngine } from "../engines/RollingBearingEngine.js";
import { screwCompressorEngine } from "../engines/ScrewCompressorEngine.js";
import { reciprocatingCompressorEngine } from "../engines/ReciprocatingCompressorEngine.js";

describe("RollingBearingEngine", () => {
  const base = { dynamic_capacity_kN: 50, radial_load_kN: 10, speed_rpm: 1500 };
  it("L10 life > 0", () => {
    expect(rollingBearingEngine.calculate(base).basic_life_hours.value).toBeGreaterThan(0);
  });
  it("higher load → shorter life", () => {
    const l10 = rollingBearingEngine.calculate(base).basic_life_hours.value;
    const l20 = rollingBearingEngine.calculate({ ...base, radial_load_kN: 20 }).basic_life_hours.value;
    expect(l20).toBeLessThan(l10);
  });
  it("higher C → longer life", () => {
    const l50 = rollingBearingEngine.calculate(base).basic_life_hours.value;
    const l100 = rollingBearingEngine.calculate({ ...base, dynamic_capacity_kN: 100 }).basic_life_hours.value;
    expect(l100).toBeGreaterThan(l50);
  });
  it("static safety factor > 0", () => {
    expect(rollingBearingEngine.calculate(base).static_safety_factor.value).toBeGreaterThan(0);
  });
  it("adjusted life ≥ 0", () => {
    expect(rollingBearingEngine.calculate(base).adjusted_life_hours.value).toBeGreaterThanOrEqual(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rollingBearingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ScrewCompressorEngine", () => {
  const base = { flow_rate_m3_min: 5, discharge_pressure_bar: 8 };
  it("actual power > isothermal power", () => {
    const r = screwCompressorEngine.calculate(base);
    expect(r.actual_power_kW.value).toBeGreaterThan(r.isothermal_power_kW.value);
  });
  it("higher pressure → more power", () => {
    const p8 = screwCompressorEngine.calculate(base).actual_power_kW.value;
    const p12 = screwCompressorEngine.calculate({ ...base, discharge_pressure_bar: 12 }).actual_power_kW.value;
    expect(p12).toBeGreaterThan(p8);
  });
  it("volumetric efficiency < 100%", () => {
    const eta = screwCompressorEngine.calculate(base).volumetric_efficiency_pct.value;
    expect(eta).toBeLessThan(100);
    expect(eta).toBeGreaterThan(50);
  });
  it("discharge temp > inlet temp", () => {
    expect(screwCompressorEngine.calculate(base).discharge_temperature_C.value).toBeGreaterThan(20);
  });
  it("isothermal efficiency < 100%", () => {
    expect(screwCompressorEngine.calculate(base).isothermal_efficiency_pct.value).toBeLessThan(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(screwCompressorEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ReciprocatingCompressorEngine", () => {
  const base = { bore_mm: 150, stroke_mm: 100, speed_rpm: 1000 };
  it("swept volume > 0", () => {
    expect(reciprocatingCompressorEngine.calculate(base).swept_volume_L.value).toBeGreaterThan(0);
  });
  it("double acting ≈ 2× flow", () => {
    const sa = reciprocatingCompressorEngine.calculate(base).actual_flow_m3_min.value;
    const da = reciprocatingCompressorEngine.calculate({ ...base, action: "double_acting" }).actual_flow_m3_min.value;
    expect(da / sa).toBeCloseTo(2, 0);
  });
  it("more stages → lower stage ratio", () => {
    const r1 = reciprocatingCompressorEngine.calculate(base).stage_pressure_ratio.value;
    const r2 = reciprocatingCompressorEngine.calculate({ ...base, num_stages: 2 }).stage_pressure_ratio.value;
    expect(r2).toBeLessThan(r1);
  });
  it("volumetric efficiency between 40-100%", () => {
    const eta = reciprocatingCompressorEngine.calculate(base).volumetric_efficiency_pct.value;
    expect(eta).toBeGreaterThan(40);
    expect(eta).toBeLessThan(100);
  });
  it("mean piston speed > 0", () => {
    expect(reciprocatingCompressorEngine.calculate(base).mean_piston_speed_m_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(reciprocatingCompressorEngine.calculate(base).recommendations)).toBe(true);
  });
});
