/**
 * Batch 99 — VacuumCasting, CentrifugalCasting, ThinFilmDeposition
 * @milestone FORGE-ENGINES-BATCH99
 */
import { describe, it, expect } from "vitest";
import { vacuumCastingEngine } from "../engines/VacuumCastingEngine.js";
import { centrifugalCastingEngine } from "../engines/CentrifugalCastingEngine.js";
import { thinFilmDepositionEngine } from "../engines/ThinFilmDepositionEngine.js";

describe("VacuumCastingEngine", () => {
  const base = { part_mass_kg: 5 };
  it("fill time > 0", () => {
    expect(vacuumCastingEngine.calculate(base).fill_time_s.value).toBeGreaterThan(0);
  });
  it("solidification time > 0", () => {
    expect(vacuumCastingEngine.calculate(base).solidification_time_s.value).toBeGreaterThan(0);
  });
  it("degassing efficiency > 90% under vacuum", () => {
    expect(vacuumCastingEngine.calculate(base).degassing_efficiency_pct.value).toBeGreaterThan(90);
  });
  it("porosity < 5%", () => {
    expect(vacuumCastingEngine.calculate(base).porosity_pct.value).toBeLessThan(5);
  });
  it("higher vacuum → lower porosity", () => {
    const p10 = vacuumCastingEngine.calculate({ ...base, vacuum_level_mbar: 10 }).porosity_pct.value;
    const p001 = vacuumCastingEngine.calculate({ ...base, vacuum_level_mbar: 0.01 }).porosity_pct.value;
    expect(p001).toBeLessThan(p10);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(vacuumCastingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CentrifugalCastingEngine", () => {
  const base = { outer_diameter_mm: 300 };
  it("rotation speed > 0", () => {
    expect(centrifugalCastingEngine.calculate(base).rotation_speed_rpm.value).toBeGreaterThan(0);
  });
  it("G-force > 50", () => {
    expect(centrifugalCastingEngine.calculate(base).G_force.value).toBeGreaterThan(50);
  });
  it("larger diameter → lower RPM for same G", () => {
    const rpm200 = centrifugalCastingEngine.calculate({ ...base, outer_diameter_mm: 200 }).rotation_speed_rpm.value;
    const rpm600 = centrifugalCastingEngine.calculate({ ...base, outer_diameter_mm: 600 }).rotation_speed_rpm.value;
    expect(rpm600).toBeLessThan(rpm200);
  });
  it("yield > 80%", () => {
    expect(centrifugalCastingEngine.calculate(base).yield_pct.value).toBeGreaterThan(80);
  });
  it("wall uniformity > 80%", () => {
    expect(centrifugalCastingEngine.calculate(base).wall_uniformity_pct.value).toBeGreaterThan(80);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(centrifugalCastingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThinFilmDepositionEngine", () => {
  const base = { target_thickness_nm: 100 };
  it("deposition rate > 0", () => {
    expect(thinFilmDepositionEngine.calculate(base).deposition_rate_nm_min.value).toBeGreaterThan(0);
  });
  it("process time > 0", () => {
    expect(thinFilmDepositionEngine.calculate(base).process_time_min.value).toBeGreaterThan(0);
  });
  it("ALD has best step coverage", () => {
    const pvd = thinFilmDepositionEngine.calculate({ ...base, method: "PVD_sputter" }).step_coverage_pct.value;
    const ald = thinFilmDepositionEngine.calculate({ ...base, method: "ALD" }).step_coverage_pct.value;
    expect(ald).toBeGreaterThan(pvd);
  });
  it("uniformity > 80%", () => {
    expect(thinFilmDepositionEngine.calculate(base).uniformity_pct.value).toBeGreaterThan(80);
  });
  it("roughness > 0", () => {
    expect(thinFilmDepositionEngine.calculate(base).roughness_nm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thinFilmDepositionEngine.calculate(base).recommendations)).toBe(true);
  });
});
