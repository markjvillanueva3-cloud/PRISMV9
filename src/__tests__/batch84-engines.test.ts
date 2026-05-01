/**
 * Batch 84 — Blower, VanePump, DiaphragmPump
 * @milestone FORGE-ENGINES-BATCH84
 */
import { describe, it, expect } from "vitest";
import { blowerEngine } from "../engines/BlowerEngine.js";
import { vanePumpEngine } from "../engines/VanePumpEngine.js";
import { diaphragmPumpEngine } from "../engines/DiaphragmPumpEngine.js";

describe("BlowerEngine", () => {
  const base = { flow_rate_m3_s: 2, static_pressure_Pa: 2000 };
  it("motor power > shaft power > air power", () => {
    const r = blowerEngine.calculate(base);
    expect(r.motor_power_kW.value).toBeGreaterThan(r.shaft_power_kW.value);
    expect(r.shaft_power_kW.value).toBeGreaterThan(r.air_power_kW.value);
  });
  it("total pressure > static pressure", () => {
    const r = blowerEngine.calculate(base);
    expect(r.total_pressure_Pa.value).toBeGreaterThan(2000);
  });
  it("higher flow → more power", () => {
    const p2 = blowerEngine.calculate(base).motor_power_kW.value;
    const p4 = blowerEngine.calculate({ ...base, flow_rate_m3_s: 4 }).motor_power_kW.value;
    expect(p4).toBeGreaterThan(p2);
  });
  it("tip speed > 0", () => {
    expect(blowerEngine.calculate(base).tip_speed_m_s.value).toBeGreaterThan(0);
  });
  it("specific speed > 0", () => {
    expect(blowerEngine.calculate(base).specific_speed.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(blowerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("VanePumpEngine", () => {
  const base = { rotor_diameter_mm: 60, cam_ring_diameter_mm: 80, vane_width_mm: 30, speed_rpm: 1500 };
  it("flow rate > 0", () => {
    expect(vanePumpEngine.calculate(base).flow_rate_lpm.value).toBeGreaterThan(0);
  });
  it("actual flow < theoretical flow", () => {
    const r = vanePumpEngine.calculate(base);
    expect(r.flow_rate_lpm.value).toBeLessThan(r.theoretical_flow_lpm.value);
  });
  it("balanced type has 2× displacement", () => {
    const bal = vanePumpEngine.calculate({ ...base, pump_type: "balanced" }).displacement_cc_rev.value;
    const unbal = vanePumpEngine.calculate({ ...base, pump_type: "unbalanced" }).displacement_cc_rev.value;
    expect(bal / unbal).toBeCloseTo(2, 0);
  });
  it("overall efficiency between 50-100%", () => {
    const eta = vanePumpEngine.calculate(base).overall_efficiency_pct.value;
    expect(eta).toBeGreaterThan(50);
    expect(eta).toBeLessThan(100);
  });
  it("higher speed → more flow", () => {
    const q1500 = vanePumpEngine.calculate(base).flow_rate_lpm.value;
    const q3000 = vanePumpEngine.calculate({ ...base, speed_rpm: 3000 }).flow_rate_lpm.value;
    expect(q3000).toBeGreaterThan(q1500);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(vanePumpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("DiaphragmPumpEngine", () => {
  const base = { diaphragm_diameter_mm: 100, stroke_mm: 15, speed_spm: 100 };
  it("flow rate > 0", () => {
    expect(diaphragmPumpEngine.calculate(base).flow_rate_lpm.value).toBeGreaterThan(0);
  });
  it("duplex has lower pulsation than simplex", () => {
    const d2 = diaphragmPumpEngine.calculate({ ...base, num_diaphragms: 2 }).pulsation_pct.value;
    const d1 = diaphragmPumpEngine.calculate({ ...base, num_diaphragms: 1 }).pulsation_pct.value;
    expect(d2).toBeLessThan(d1);
  });
  it("higher pressure → more stress", () => {
    const s5 = diaphragmPumpEngine.calculate({ ...base, discharge_pressure_bar: 5 }).diaphragm_stress_MPa.value;
    const s10 = diaphragmPumpEngine.calculate({ ...base, discharge_pressure_bar: 10 }).diaphragm_stress_MPa.value;
    expect(s10).toBeGreaterThan(s5);
  });
  it("estimated life > 0", () => {
    expect(diaphragmPumpEngine.calculate(base).estimated_life_cycles.value).toBeGreaterThan(0);
  });
  it("displacement > 0", () => {
    expect(diaphragmPumpEngine.calculate(base).displacement_cc_stroke.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(diaphragmPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});
