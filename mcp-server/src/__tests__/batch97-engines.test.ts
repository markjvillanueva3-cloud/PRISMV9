/**
 * Batch 97 — Electrospinning, FreezeDrying, PlasmaCutting
 * @milestone FORGE-ENGINES-BATCH97
 */
import { describe, it, expect } from "vitest";
import { electrospinningEngine } from "../engines/ElectrospinningEngine.js";
import { freezeDryingEngine } from "../engines/FreezeDryingEngine.js";
import { plasmaCuttingEngine } from "../engines/PlasmaCuttingEngine.js";

describe("ElectrospinningEngine", () => {
  const base = { voltage_kV: 15 };
  it("fiber diameter > 0", () => {
    expect(electrospinningEngine.calculate(base).fiber_diameter_nm.value).toBeGreaterThan(0);
  });
  it("electric field > 0", () => {
    expect(electrospinningEngine.calculate(base).electric_field_kV_cm.value).toBeGreaterThan(0);
  });
  it("higher voltage → thinner fibers", () => {
    const d10 = electrospinningEngine.calculate({ ...base, voltage_kV: 10 }).fiber_diameter_nm.value;
    const d25 = electrospinningEngine.calculate({ ...base, voltage_kV: 25 }).fiber_diameter_nm.value;
    expect(d25).toBeLessThan(d10);
  });
  it("production rate > 0", () => {
    expect(electrospinningEngine.calculate(base).production_rate_g_h.value).toBeGreaterThan(0);
  });
  it("specific surface area > 0", () => {
    expect(electrospinningEngine.calculate(base).specific_surface_area_m2_g.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(electrospinningEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FreezeDryingEngine", () => {
  const base = { product: "pharmaceutical" as const };
  it("total cycle > 0", () => {
    expect(freezeDryingEngine.calculate(base).total_cycle_h.value).toBeGreaterThan(0);
  });
  it("primary > secondary drying", () => {
    const r = freezeDryingEngine.calculate(base);
    expect(r.primary_drying_h.value).toBeGreaterThan(r.secondary_drying_h.value);
  });
  it("sublimation rate > 0", () => {
    expect(freezeDryingEngine.calculate(base).sublimation_rate_g_h.value).toBeGreaterThan(0);
  });
  it("residual moisture < 5%", () => {
    expect(freezeDryingEngine.calculate(base).residual_moisture_pct.value).toBeLessThan(5);
  });
  it("condenser load > 0", () => {
    expect(freezeDryingEngine.calculate(base).condenser_load_kg.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(freezeDryingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PlasmaCuttingEngine", () => {
  const base = { material_thickness_mm: 12 };
  it("cutting speed > 0", () => {
    expect(plasmaCuttingEngine.calculate(base).cutting_speed_mm_min.value).toBeGreaterThan(0);
  });
  it("kerf width > 0", () => {
    expect(plasmaCuttingEngine.calculate(base).kerf_width_mm.value).toBeGreaterThan(0);
  });
  it("thicker material → slower cut", () => {
    const s6 = plasmaCuttingEngine.calculate({ ...base, material_thickness_mm: 6 }).cutting_speed_mm_min.value;
    const s25 = plasmaCuttingEngine.calculate({ ...base, material_thickness_mm: 25 }).cutting_speed_mm_min.value;
    expect(s25).toBeLessThan(s6);
  });
  it("power > 0", () => {
    expect(plasmaCuttingEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("HAZ width > 0", () => {
    expect(plasmaCuttingEngine.calculate(base).HAZ_width_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(plasmaCuttingEngine.calculate(base).recommendations)).toBe(true);
  });
});
