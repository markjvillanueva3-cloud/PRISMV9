/**
 * Batch 64 — InjectionMolding, BlowMolding, Thermoforming
 * @milestone FORGE-ENGINES-BATCH64
 */
import { describe, it, expect } from "vitest";
import { injectionMoldingEngine } from "../engines/InjectionMoldingEngine.js";
import { blowMoldingEngine } from "../engines/BlowMoldingEngine.js";
import { thermoformingEngine } from "../engines/ThermoformingEngine.js";

describe("InjectionMoldingEngine", () => {
  const base = { part_volume_cm3: 50, projected_area_cm2: 30 };
  it("clamp force > 0", () => {
    expect(injectionMoldingEngine.calculate(base).clamp_force_tonnes.value).toBeGreaterThan(0);
  });
  it("cycle time > cooling time", () => {
    const r = injectionMoldingEngine.calculate(base);
    expect(r.cycle_time_s.value).toBeGreaterThan(r.cooling_time_s.value);
  });
  it("part weight > 0", () => {
    expect(injectionMoldingEngine.calculate(base).part_weight_g.value).toBeGreaterThan(0);
  });
  it("more cavities = more clamp force", () => {
    const s1 = injectionMoldingEngine.calculate({ ...base, num_cavities: 1 });
    const s4 = injectionMoldingEngine.calculate({ ...base, num_cavities: 4 });
    expect(s4.clamp_force_tonnes.value).toBeGreaterThan(s1.clamp_force_tonnes.value);
  });
  it("thicker wall = longer cooling", () => {
    const thin = injectionMoldingEngine.calculate({ ...base, wall_thickness_mm: 1 });
    const thick = injectionMoldingEngine.calculate({ ...base, wall_thickness_mm: 5 });
    expect(thick.cooling_time_s.value).toBeGreaterThan(thin.cooling_time_s.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(injectionMoldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("BlowMoldingEngine", () => {
  const base = { container_volume_mL: 500, container_diameter_mm: 70, container_height_mm: 200 };
  it("blow ratio > 1", () => {
    expect(blowMoldingEngine.calculate(base).blow_ratio.value).toBeGreaterThan(1);
  });
  it("part weight > 0", () => {
    expect(blowMoldingEngine.calculate(base).part_weight_g.value).toBeGreaterThan(0);
  });
  it("cycle time > 0", () => {
    expect(blowMoldingEngine.calculate(base).cycle_time_s.value).toBeGreaterThan(0);
  });
  it("parison diameter < container diameter", () => {
    const r = blowMoldingEngine.calculate(base);
    expect(r.parison_diameter_mm.value).toBeLessThan(base.container_diameter_mm);
  });
  it("clamp force > 0", () => {
    expect(blowMoldingEngine.calculate(base).clamp_force_tonnes.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(blowMoldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThermoformingEngine", () => {
  const base = { part_length_mm: 300, part_width_mm: 200, part_depth_mm: 50 };
  it("draw ratio > 0", () => {
    expect(thermoformingEngine.calculate(base).draw_ratio.value).toBeGreaterThan(0);
  });
  it("min wall < sheet thickness", () => {
    const r = thermoformingEngine.calculate(base);
    expect(r.wall_thickness_min_mm.value).toBeLessThan(1.5);
  });
  it("forming force > 0", () => {
    expect(thermoformingEngine.calculate(base).forming_force_kN.value).toBeGreaterThan(0);
  });
  it("deeper part = higher draw ratio", () => {
    const shallow = thermoformingEngine.calculate({ ...base, part_depth_mm: 10 });
    const deep = thermoformingEngine.calculate({ ...base, part_depth_mm: 100 });
    expect(deep.draw_ratio.value).toBeGreaterThan(shallow.draw_ratio.value);
  });
  it("sheet utilization < 100%", () => {
    const r = thermoformingEngine.calculate(base);
    expect(r.sheet_utilization_pct.value).toBeLessThan(100);
    expect(r.sheet_utilization_pct.value).toBeGreaterThan(50);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thermoformingEngine.calculate(base).recommendations)).toBe(true);
  });
});
