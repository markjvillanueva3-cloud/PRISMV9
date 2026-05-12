/**
 * Batch 76 — Nozzle, Ejector, Diffuser
 * @milestone FORGE-ENGINES-BATCH76
 */
import { describe, it, expect } from "vitest";
import { nozzleEngine } from "../engines/NozzleEngine.js";
import { ejectorEngine } from "../engines/EjectorEngine.js";
import { diffuserEngine } from "../engines/DiffuserEngine.js";

describe("NozzleEngine", () => {
  const base = { inlet_pressure_bar: 5, back_pressure_bar: 1, inlet_temperature_K: 300, throat_diameter_mm: 20 };
  it("mass flow > 0", () => {
    expect(nozzleEngine.calculate(base).mass_flow_kg_s.value).toBeGreaterThan(0);
  });
  it("choked at high pressure ratio", () => {
    expect(nozzleEngine.calculate(base).is_choked.value).toBe(1);
  });
  it("not choked at low pressure ratio", () => {
    expect(nozzleEngine.calculate({ ...base, back_pressure_bar: 4.5 }).is_choked.value).toBe(0);
  });
  it("exit velocity > 0", () => {
    expect(nozzleEngine.calculate(base).exit_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("CD nozzle gives supersonic exit", () => {
    const r = nozzleEngine.calculate({ ...base, nozzle_type: "converging_diverging", exit_diameter_mm: 30 });
    expect(r.exit_mach.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(nozzleEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("EjectorEngine", () => {
  const base = { motive_pressure_bar: 10, suction_pressure_bar: 1, discharge_pressure_bar: 3 };
  it("entrainment ratio > 0", () => {
    expect(ejectorEngine.calculate(base).entrainment_ratio.value).toBeGreaterThan(0);
  });
  it("compression ratio = Pd/Ps", () => {
    expect(ejectorEngine.calculate(base).compression_ratio.value).toBeCloseTo(3, 1);
  });
  it("suction flow > 0", () => {
    expect(ejectorEngine.calculate(base).suction_flow_kg_s.value).toBeGreaterThan(0);
  });
  it("higher motive pressure = higher entrainment", () => {
    const lo = ejectorEngine.calculate({ ...base, motive_pressure_bar: 5 }).entrainment_ratio.value;
    const hi = ejectorEngine.calculate({ ...base, motive_pressure_bar: 20 }).entrainment_ratio.value;
    expect(hi).toBeGreaterThan(lo);
  });
  it("nozzle area > 0", () => {
    expect(ejectorEngine.calculate(base).nozzle_area_mm2.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ejectorEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("DiffuserEngine", () => {
  const base = { inlet_diameter_mm: 100, outlet_diameter_mm: 200, length_mm: 500, inlet_velocity_m_s: 30 };
  it("area ratio > 1", () => {
    expect(diffuserEngine.calculate(base).area_ratio.value).toBeGreaterThan(1);
  });
  it("outlet velocity < inlet velocity", () => {
    expect(diffuserEngine.calculate(base).outlet_velocity_m_s.value).toBeLessThan(30);
  });
  it("pressure recovery > 0", () => {
    expect(diffuserEngine.calculate(base).pressure_recovery_Pa.value).toBeGreaterThan(0);
  });
  it("actual Cp < ideal Cp", () => {
    const r = diffuserEngine.calculate(base);
    expect(r.actual_cp.value).toBeLessThan(r.ideal_cp.value);
  });
  it("shallow angle has higher efficiency", () => {
    const shallow = diffuserEngine.calculate({ ...base, length_mm: 1500 }).diffuser_efficiency_pct.value;
    const steep = diffuserEngine.calculate({ ...base, length_mm: 100 }).diffuser_efficiency_pct.value;
    expect(shallow).toBeGreaterThan(steep);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(diffuserEngine.calculate(base).recommendations)).toBe(true);
  });
});
