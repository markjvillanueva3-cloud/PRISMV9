/**
 * Batch 91 — MagneticBearing, FlotationCell, Crystallization
 * @milestone FORGE-ENGINES-BATCH91
 */
import { describe, it, expect } from "vitest";
import { magneticBearingEngine } from "../engines/MagneticBearingEngine.js";
import { flotationCellEngine } from "../engines/FlotationCellEngine.js";
import { crystallizationEngine } from "../engines/CrystallizationEngine.js";

describe("MagneticBearingEngine", () => {
  const base = { rotor_mass_kg: 50, rotor_diameter_mm: 200, max_speed_rpm: 30000 };
  it("max force > 0", () => {
    expect(magneticBearingEngine.calculate(base).max_force_N.value).toBeGreaterThan(0);
  });
  it("force margin > 1", () => {
    expect(magneticBearingEngine.calculate(base).force_margin.value).toBeGreaterThan(1);
  });
  it("more current → more force", () => {
    const f5 = magneticBearingEngine.calculate({ ...base, max_current_A: 5 }).max_force_N.value;
    const f15 = magneticBearingEngine.calculate({ ...base, max_current_A: 15 }).max_force_N.value;
    expect(f15).toBeGreaterThan(f5);
  });
  it("critical speed > 0", () => {
    expect(magneticBearingEngine.calculate(base).critical_speed_rpm.value).toBeGreaterThan(0);
  });
  it("surface speed = πDN/60", () => {
    const v = magneticBearingEngine.calculate(base).rotor_surface_speed_m_s.value;
    expect(v).toBeCloseTo(Math.PI * 0.2 * 30000 / 60, 0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(magneticBearingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FlotationCellEngine", () => {
  const base = { feed_rate_tph: 100, feed_grade_pct: 2 };
  it("recovery > 0", () => {
    expect(flotationCellEngine.calculate(base).recovery_pct.value).toBeGreaterThan(0);
  });
  it("concentrate grade > feed grade", () => {
    expect(flotationCellEngine.calculate(base).concentrate_grade_pct.value).toBeGreaterThan(2);
  });
  it("more cells → higher recovery", () => {
    const r3 = flotationCellEngine.calculate({ ...base, num_cells: 3 }).recovery_pct.value;
    const r12 = flotationCellEngine.calculate({ ...base, num_cells: 12 }).recovery_pct.value;
    expect(r12).toBeGreaterThanOrEqual(r3);
  });
  it("enrichment ratio > 1", () => {
    expect(flotationCellEngine.calculate(base).enrichment_ratio.value).toBeGreaterThan(1);
  });
  it("power > 0", () => {
    expect(flotationCellEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(flotationCellEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CrystallizationEngine", () => {
  const base = { feed_concentration_g_L: 400, saturation_concentration_g_L: 360 };
  it("yield > 0", () => {
    expect(crystallizationEngine.calculate(base).yield_pct.value).toBeGreaterThan(0);
  });
  it("supersaturation > 1", () => {
    expect(crystallizationEngine.calculate(base).supersaturation_ratio.value).toBeGreaterThan(1);
  });
  it("higher feed conc → higher yield", () => {
    const y400 = crystallizationEngine.calculate(base).yield_pct.value;
    const y500 = crystallizationEngine.calculate({ ...base, feed_concentration_g_L: 500 }).yield_pct.value;
    expect(y500).toBeGreaterThan(y400);
  });
  it("crystal size > 0", () => {
    expect(crystallizationEngine.calculate(base).mean_crystal_size_um.value).toBeGreaterThan(0);
  });
  it("production > 0", () => {
    expect(crystallizationEngine.calculate(base).crystal_production_kg_h.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(crystallizationEngine.calculate(base).recommendations)).toBe(true);
  });
});
