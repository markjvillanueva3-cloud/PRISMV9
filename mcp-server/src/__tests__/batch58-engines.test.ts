/**
 * Batch 58 — PipeSizing, FlangeBolt, TankDesign
 * @milestone FORGE-ENGINES-BATCH58
 */
import { describe, it, expect } from "vitest";
import { pipeSizingEngine } from "../engines/PipeSizingEngine.js";
import { flangeBoltEngine } from "../engines/FlangeBoltEngine.js";
import { tankDesignEngine } from "../engines/TankDesignEngine.js";

describe("PipeSizingEngine", () => {
  const base = { flow_rate_m3_h: 50, pipe_length_m: 100 };
  it("nominal size > 0", () => {
    expect(pipeSizingEngine.calculate(base).nominal_size_mm.value).toBeGreaterThan(0);
  });
  it("velocity within limits", () => {
    const v = pipeSizingEngine.calculate(base).velocity_m_s.value;
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(4);
  });
  it("more flow needs bigger pipe", () => {
    const lo = pipeSizingEngine.calculate({ ...base, flow_rate_m3_h: 5 });
    const hi = pipeSizingEngine.calculate({ ...base, flow_rate_m3_h: 500 });
    expect(hi.nominal_size_mm.value).toBeGreaterThan(lo.nominal_size_mm.value);
  });
  it("pressure drop > 0", () => {
    expect(pipeSizingEngine.calculate(base).pressure_drop_bar.value).toBeGreaterThan(0);
  });
  it("Reynolds > 0", () => {
    expect(pipeSizingEngine.calculate(base).reynolds_number.value).toBeGreaterThan(0);
  });
  it("total loss ≥ straight + fittings", () => {
    const r = pipeSizingEngine.calculate(base);
    expect(r.total_loss_bar.value).toBeGreaterThanOrEqual(
      r.pressure_drop_bar.value + r.fitting_loss_bar.value - 0.001
    );
  });
  it("recommendations is array", () => {
    expect(Array.isArray(pipeSizingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FlangeBoltEngine", () => {
  const base = { pipe_od_mm: 200, design_pressure_bar: 40 };
  it("bolt load operating > 0", () => {
    expect(flangeBoltEngine.calculate(base).bolt_load_operating_kN.value).toBeGreaterThan(0);
  });
  it("bolt stress > 0", () => {
    expect(flangeBoltEngine.calculate(base).bolt_stress_MPa.value).toBeGreaterThan(0);
  });
  it("bolt torque > 0", () => {
    expect(flangeBoltEngine.calculate(base).bolt_torque_Nm.value).toBeGreaterThan(0);
  });
  it("higher pressure = higher bolt load", () => {
    const lo = flangeBoltEngine.calculate({ ...base, design_pressure_bar: 10 });
    const hi = flangeBoltEngine.calculate({ ...base, design_pressure_bar: 100 });
    expect(hi.bolt_load_operating_kN.value).toBeGreaterThan(lo.bolt_load_operating_kN.value);
  });
  it("num bolts ≥ 4", () => {
    expect(flangeBoltEngine.calculate(base).num_bolts.value).toBeGreaterThanOrEqual(4);
  });
  it("hydrostatic force > 0", () => {
    expect(flangeBoltEngine.calculate(base).hydrostatic_force_kN.value).toBeGreaterThan(0);
  });
  it("gasket stress > 0", () => {
    expect(flangeBoltEngine.calculate(base).gasket_stress_MPa.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(flangeBoltEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("TankDesignEngine", () => {
  const base = { diameter_mm: 2000, length_or_height_mm: 5000, design_pressure_bar: 10 };
  it("shell thickness > 0", () => {
    expect(tankDesignEngine.calculate(base).shell_thickness_mm.value).toBeGreaterThan(0);
  });
  it("MAWP ≥ design pressure", () => {
    const r = tankDesignEngine.calculate(base);
    expect(r.mawp_bar.value).toBeGreaterThanOrEqual(base.design_pressure_bar);
  });
  it("higher pressure needs thicker shell", () => {
    const lo = tankDesignEngine.calculate({ ...base, design_pressure_bar: 2 });
    const hi = tankDesignEngine.calculate({ ...base, design_pressure_bar: 50 });
    expect(hi.shell_thickness_mm.value).toBeGreaterThanOrEqual(lo.shell_thickness_mm.value);
  });
  it("volume > 0", () => {
    expect(tankDesignEngine.calculate(base).volume_m3.value).toBeGreaterThan(0);
  });
  it("weight > 0", () => {
    expect(tankDesignEngine.calculate(base).weight_kg.value).toBeGreaterThan(0);
  });
  it("hydrotest > MAWP", () => {
    const r = tankDesignEngine.calculate(base);
    expect(r.hydrotest_pressure_bar.value).toBeGreaterThan(r.mawp_bar.value);
  });
  it("hydrostatic head ≥ 0", () => {
    expect(tankDesignEngine.calculate(base).hydrostatic_head_bar.value).toBeGreaterThanOrEqual(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(tankDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});
