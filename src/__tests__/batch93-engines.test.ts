/**
 * Batch 93 — QuenchingProcess, Carburizing, NitridingProcess
 * @milestone FORGE-ENGINES-BATCH93
 */
import { describe, it, expect } from "vitest";
import { quenchingProcessEngine } from "../engines/QuenchingProcessEngine.js";
import { carburizingEngine } from "../engines/CarburizingEngine.js";
import { nitridingProcessEngine } from "../engines/NitridingProcessEngine.js";

describe("QuenchingProcessEngine", () => {
  const base = { part_diameter_mm: 30, steel: "4140" as const };
  it("surface hardness > core hardness", () => {
    const r = quenchingProcessEngine.calculate(base);
    expect(r.surface_hardness_HRC.value).toBeGreaterThan(r.core_hardness_HRC.value);
  });
  it("water quench harder than oil", () => {
    const oil = quenchingProcessEngine.calculate({ ...base, quenchant: "oil" }).surface_hardness_HRC.value;
    const water = quenchingProcessEngine.calculate({ ...base, quenchant: "water" }).surface_hardness_HRC.value;
    expect(water).toBeGreaterThanOrEqual(oil);
  });
  it("Grossmann H > 0", () => {
    expect(quenchingProcessEngine.calculate(base).grossmann_H_value.value).toBeGreaterThan(0);
  });
  it("crack risk between 0-10", () => {
    const cr = quenchingProcessEngine.calculate(base).crack_risk_index.value;
    expect(cr).toBeGreaterThanOrEqual(0);
    expect(cr).toBeLessThanOrEqual(10);
  });
  it("cooling rate > 0", () => {
    expect(quenchingProcessEngine.calculate(base).cooling_rate_surface_C_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(quenchingProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CarburizingEngine", () => {
  const base = { target_case_depth_mm: 1.0 };
  it("total time > 0", () => {
    expect(carburizingEngine.calculate(base).total_time_h.value).toBeGreaterThan(0);
  });
  it("surface carbon > initial carbon", () => {
    expect(carburizingEngine.calculate(base).surface_carbon_pct.value).toBeGreaterThan(0.20);
  });
  it("deeper case → longer time", () => {
    const t05 = carburizingEngine.calculate({ ...base, target_case_depth_mm: 0.5 }).total_time_h.value;
    const t20 = carburizingEngine.calculate({ ...base, target_case_depth_mm: 2.0 }).total_time_h.value;
    expect(t20).toBeGreaterThan(t05);
  });
  it("surface hardness > core hardness", () => {
    const r = carburizingEngine.calculate(base);
    expect(r.surface_hardness_HRC.value).toBeGreaterThan(r.core_hardness_HRC.value);
  });
  it("diffusion coefficient > 0", () => {
    expect(carburizingEngine.calculate(base).diffusion_coefficient_m2_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(carburizingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("NitridingProcessEngine", () => {
  const base = { target_case_depth_mm: 0.3 };
  it("surface hardness > 400 HV", () => {
    expect(nitridingProcessEngine.calculate(base).surface_hardness_HV.value).toBeGreaterThan(400);
  });
  it("compound layer > 0 when wanted", () => {
    expect(nitridingProcessEngine.calculate(base).compound_layer_um.value).toBeGreaterThan(0);
  });
  it("plasma faster than gas", () => {
    const gas = nitridingProcessEngine.calculate({ ...base, method: "gas" }).total_time_h.value;
    const plasma = nitridingProcessEngine.calculate({ ...base, method: "plasma_ion" }).total_time_h.value;
    expect(plasma).toBeLessThan(gas);
  });
  it("distortion is low (< 100 μm)", () => {
    expect(nitridingProcessEngine.calculate(base).distortion_um.value).toBeLessThan(100);
  });
  it("nitrogen surface > 0", () => {
    expect(nitridingProcessEngine.calculate(base).nitrogen_surface_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(nitridingProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});
