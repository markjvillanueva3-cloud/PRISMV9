/**
 * Batch 89 — PowderCompaction, SinteringProcess, SprayDryer
 * @milestone FORGE-ENGINES-BATCH89
 */
import { describe, it, expect } from "vitest";
import { powderCompactionEngine } from "../engines/PowderCompactionEngine.js";
import { sinteringProcessEngine } from "../engines/SinteringProcessEngine.js";
import { sprayDryerEngine } from "../engines/SprayDryerEngine.js";

describe("PowderCompactionEngine", () => {
  const base = { part_diameter_mm: 20, part_height_mm: 15 };
  it("compaction pressure > 0", () => {
    expect(powderCompactionEngine.calculate(base).compaction_pressure_MPa.value).toBeGreaterThan(0);
  });
  it("higher density target → more pressure", () => {
    const p85 = powderCompactionEngine.calculate({ ...base, target_density_pct: 85 }).compaction_pressure_MPa.value;
    const p95 = powderCompactionEngine.calculate({ ...base, target_density_pct: 95 }).compaction_pressure_MPa.value;
    expect(p95).toBeGreaterThan(p85);
  });
  it("press force > 0", () => {
    expect(powderCompactionEngine.calculate(base).press_force_kN.value).toBeGreaterThan(0);
  });
  it("green density > 0", () => {
    expect(powderCompactionEngine.calculate(base).green_density_g_cm3.value).toBeGreaterThan(0);
  });
  it("fill depth > part height", () => {
    expect(powderCompactionEngine.calculate(base).fill_depth_mm.value).toBeGreaterThan(15);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(powderCompactionEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SinteringProcessEngine", () => {
  const base = { green_density_pct: 85, sintering_temperature_C: 1120 };
  it("final density > green density", () => {
    const r = sinteringProcessEngine.calculate(base);
    expect(r.final_density_pct.value).toBeGreaterThan(85);
  });
  it("linear shrinkage > 0", () => {
    expect(sinteringProcessEngine.calculate(base).linear_shrinkage_pct.value).toBeGreaterThan(0);
  });
  it("higher temperature → higher density", () => {
    const d1100 = sinteringProcessEngine.calculate({ ...base, sintering_temperature_C: 1100 }).final_density_pct.value;
    const d1200 = sinteringProcessEngine.calculate({ ...base, sintering_temperature_C: 1200 }).final_density_pct.value;
    expect(d1200).toBeGreaterThanOrEqual(d1100);
  });
  it("homologous temperature between 0 and 1", () => {
    const Th = sinteringProcessEngine.calculate(base).homologous_temperature.value;
    expect(Th).toBeGreaterThan(0);
    expect(Th).toBeLessThan(1);
  });
  it("cycle time > hold time", () => {
    expect(sinteringProcessEngine.calculate(base).total_cycle_time_min.value).toBeGreaterThan(30);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(sinteringProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SprayDryerEngine", () => {
  const base = { feed_rate_kg_h: 100, feed_solids_pct: 30, inlet_air_temp_C: 200 };
  it("evaporation rate > 0", () => {
    expect(sprayDryerEngine.calculate(base).evaporation_rate_kg_h.value).toBeGreaterThan(0);
  });
  it("product rate < feed rate", () => {
    expect(sprayDryerEngine.calculate(base).product_rate_kg_h.value).toBeLessThan(100);
  });
  it("thermal efficiency between 0-100%", () => {
    const eff = sprayDryerEngine.calculate(base).thermal_efficiency_pct.value;
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThan(100);
  });
  it("particle size > 0", () => {
    expect(sprayDryerEngine.calculate(base).particle_size_um.value).toBeGreaterThan(0);
  });
  it("higher feed solids → less evaporation", () => {
    const e30 = sprayDryerEngine.calculate(base).evaporation_rate_kg_h.value;
    const e50 = sprayDryerEngine.calculate({ ...base, feed_solids_pct: 50 }).evaporation_rate_kg_h.value;
    expect(e50).toBeLessThan(e30);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(sprayDryerEngine.calculate(base).recommendations)).toBe(true);
  });
});
