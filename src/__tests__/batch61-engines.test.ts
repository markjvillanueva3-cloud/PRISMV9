/**
 * Batch 61 — BoilerTube, Transformer, InductionHeating
 * @milestone FORGE-ENGINES-BATCH61
 */
import { describe, it, expect } from "vitest";
import { boilerTubeEngine } from "../engines/BoilerTubeEngine.js";
import { transformerEngine } from "../engines/TransformerEngine.js";
import { inductionHeatingEngine } from "../engines/InductionHeatingEngine.js";

describe("BoilerTubeEngine", () => {
  const base = { steam_capacity_kg_h: 5000 };
  it("tube thickness > 0", () => {
    expect(boilerTubeEngine.calculate(base).tube_thickness_mm.value).toBeGreaterThan(0);
  });
  it("number of tubes > 0", () => {
    expect(boilerTubeEngine.calculate(base).number_of_tubes.value).toBeGreaterThan(0);
  });
  it("heat duty > 0", () => {
    expect(boilerTubeEngine.calculate(base).heat_duty_MW.value).toBeGreaterThan(0);
  });
  it("LMTD > 0", () => {
    expect(boilerTubeEngine.calculate(base).lmtd_C.value).toBeGreaterThan(0);
  });
  it("more steam = more tubes", () => {
    const lo = boilerTubeEngine.calculate({ ...base, steam_capacity_kg_h: 1000 });
    const hi = boilerTubeEngine.calculate({ ...base, steam_capacity_kg_h: 20000 });
    expect(hi.number_of_tubes.value).toBeGreaterThan(lo.number_of_tubes.value);
  });
  it("heating surface > 0", () => {
    expect(boilerTubeEngine.calculate(base).heating_surface_m2.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(boilerTubeEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("TransformerEngine", () => {
  const base = { rated_power_kVA: 1000, primary_voltage_V: 13800, secondary_voltage_V: 480 };
  it("turns ratio matches voltage ratio", () => {
    const r = transformerEngine.calculate(base);
    expect(r.turns_ratio.value).toBeCloseTo(13800 / 480, 0);
  });
  it("efficiency > 90%", () => {
    expect(transformerEngine.calculate(base).efficiency_pct.value).toBeGreaterThan(90);
  });
  it("core loss > 0", () => {
    expect(transformerEngine.calculate(base).core_loss_W.value).toBeGreaterThan(0);
  });
  it("copper loss > 0", () => {
    expect(transformerEngine.calculate(base).copper_loss_W.value).toBeGreaterThan(0);
  });
  it("regulation > 0", () => {
    expect(transformerEngine.calculate(base).regulation_pct.value).toBeGreaterThan(0);
  });
  it("higher load = lower efficiency", () => {
    const full = transformerEngine.calculate({ ...base, load_pct: 100 });
    const over = transformerEngine.calculate({ ...base, load_pct: 150 });
    expect(over.efficiency_pct.value).toBeLessThan(full.efficiency_pct.value);
  });
  it("weight > 0", () => {
    expect(transformerEngine.calculate(base).weight_kg.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(transformerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("InductionHeatingEngine", () => {
  const base = { workpiece_diameter_mm: 50, workpiece_length_mm: 200, target_temp_C: 850 };
  it("power > 0", () => {
    expect(inductionHeatingEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("skin depth > 0", () => {
    expect(inductionHeatingEngine.calculate(base).skin_depth_mm.value).toBeGreaterThan(0);
  });
  it("frequency > 0", () => {
    expect(inductionHeatingEngine.calculate(base).frequency_kHz.value).toBeGreaterThan(0);
  });
  it("energy > 0", () => {
    expect(inductionHeatingEngine.calculate(base).energy_kWh.value).toBeGreaterThan(0);
  });
  it("higher temp needs more energy", () => {
    const lo = inductionHeatingEngine.calculate({ ...base, target_temp_C: 200 });
    const hi = inductionHeatingEngine.calculate({ ...base, target_temp_C: 1200 });
    expect(hi.energy_kWh.value).toBeGreaterThan(lo.energy_kWh.value);
  });
  it("smaller part = higher frequency", () => {
    const small = inductionHeatingEngine.calculate({ ...base, workpiece_diameter_mm: 10 });
    const big = inductionHeatingEngine.calculate({ ...base, workpiece_diameter_mm: 200 });
    expect(small.frequency_kHz.value).toBeGreaterThanOrEqual(big.frequency_kHz.value);
  });
  it("coil efficiency > 0", () => {
    expect(inductionHeatingEngine.calculate(base).coil_efficiency_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(inductionHeatingEngine.calculate(base).recommendations)).toBe(true);
  });
});
