/**
 * Batch 71 — Venturi, OrificeFlowMeter, WaterHammer
 * @milestone FORGE-ENGINES-BATCH71
 */
import { describe, it, expect } from "vitest";
import { venturiEngine } from "../engines/VenturiEngine.js";
import { orificeFlowMeterEngine } from "../engines/OrificeFlowMeterEngine.js";
import { waterHammerEngine } from "../engines/WaterHammerEngine.js";

describe("VenturiEngine", () => {
  const base = { pipe_diameter_mm: 200, throat_diameter_mm: 100, flow_rate_m3_h: 50 };
  it("differential pressure > 0", () => {
    expect(venturiEngine.calculate(base).differential_pressure_Pa.value).toBeGreaterThan(0);
  });
  it("beta ratio = d/D", () => {
    expect(venturiEngine.calculate(base).beta_ratio.value).toBeCloseTo(0.5, 2);
  });
  it("Cd ≈ 0.995", () => {
    expect(venturiEngine.calculate(base).discharge_coefficient.value).toBeCloseTo(0.995, 2);
  });
  it("throat velocity > pipe velocity", () => {
    const r = venturiEngine.calculate(base);
    expect(r.throat_velocity_m_s.value).toBeGreaterThan(r.pipe_velocity_m_s.value);
  });
  it("permanent loss < 100%", () => {
    expect(venturiEngine.calculate(base).permanent_loss_pct.value).toBeLessThan(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(venturiEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("OrificeFlowMeterEngine", () => {
  const base = { pipe_diameter_mm: 200, orifice_diameter_mm: 100, flow_rate_m3_h: 50 };
  it("differential pressure > 0", () => {
    expect(orificeFlowMeterEngine.calculate(base).differential_pressure_Pa.value).toBeGreaterThan(0);
  });
  it("Cd ≈ 0.6", () => {
    const cd = orificeFlowMeterEngine.calculate(base).discharge_coefficient.value;
    expect(cd).toBeGreaterThan(0.55);
    expect(cd).toBeLessThan(0.65);
  });
  it("permanent loss > Venturi loss", () => {
    const orifice = orificeFlowMeterEngine.calculate(base).permanent_loss_pct.value;
    const venturi = venturiEngine.calculate({ pipe_diameter_mm: 200, throat_diameter_mm: 100, flow_rate_m3_h: 50 }).permanent_loss_pct.value;
    expect(orifice).toBeGreaterThan(venturi);
  });
  it("velocity approach factor > 1", () => {
    expect(orificeFlowMeterEngine.calculate(base).velocity_approach_factor.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(orificeFlowMeterEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("WaterHammerEngine", () => {
  const base = { pipe_diameter_mm: 300, wall_thickness_mm: 8, pipe_length_m: 1000, flow_velocity_m_s: 2 };
  it("pressure surge > 0", () => {
    expect(waterHammerEngine.calculate(base).pressure_surge_bar.value).toBeGreaterThan(0);
  });
  it("wave speed > 0", () => {
    expect(waterHammerEngine.calculate(base).wave_speed_m_s.value).toBeGreaterThan(0);
  });
  it("max pressure > steady state", () => {
    expect(waterHammerEngine.calculate(base).max_pressure_bar.value).toBeGreaterThan(5);
  });
  it("slow closure reduces surge", () => {
    const fast = waterHammerEngine.calculate({ ...base, valve_closure_time_s: 0.01 });
    const slow = waterHammerEngine.calculate({ ...base, valve_closure_time_s: 10 });
    expect(slow.pressure_surge_bar.value).toBeLessThan(fast.pressure_surge_bar.value);
  });
  it("PVC has slower wave speed than steel", () => {
    const steel = waterHammerEngine.calculate({ ...base, pipe_material: "steel" });
    const pvc = waterHammerEngine.calculate({ ...base, pipe_material: "pvc" });
    expect(pvc.wave_speed_m_s.value).toBeLessThan(steel.wave_speed_m_s.value);
  });
  it("hoop stress > 0", () => {
    expect(waterHammerEngine.calculate(base).pipe_hoop_stress_MPa.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(waterHammerEngine.calculate(base).recommendations)).toBe(true);
  });
});
