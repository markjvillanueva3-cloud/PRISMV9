/**
 * Batch 83 — CapacitorBank, Impeller, HydraulicMotor
 * @milestone FORGE-ENGINES-BATCH83
 */
import { describe, it, expect } from "vitest";
import { capacitorBankEngine } from "../engines/CapacitorBankEngine.js";
import { impellerEngine } from "../engines/ImpellerEngine.js";
import { hydraulicMotorEngine } from "../engines/HydraulicMotorEngine.js";

describe("CapacitorBankEngine", () => {
  const base = { real_power_kW: 500, current_pf: 0.75, voltage_V: 480 };
  it("required kVAR > 0", () => {
    expect(capacitorBankEngine.calculate(base).required_kVAR.value).toBeGreaterThan(0);
  });
  it("apparent power after < before", () => {
    const r = capacitorBankEngine.calculate(base);
    expect(r.apparent_power_after_kVA.value).toBeLessThan(r.apparent_power_before_kVA.value);
  });
  it("worse PF → more kVAR needed", () => {
    const q75 = capacitorBankEngine.calculate(base).required_kVAR.value;
    const q60 = capacitorBankEngine.calculate({ ...base, current_pf: 0.60 }).required_kVAR.value;
    expect(q60).toBeGreaterThan(q75);
  });
  it("demand reduction > 0%", () => {
    expect(capacitorBankEngine.calculate(base).demand_reduction_pct.value).toBeGreaterThan(0);
  });
  it("capacitance > 0", () => {
    expect(capacitorBankEngine.calculate(base).capacitance_uF.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(capacitorBankEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ImpellerEngine", () => {
  const base = { flow_rate_m3_s: 0.05, head_m: 30, speed_rpm: 1450 };
  it("specific speed > 0", () => {
    expect(impellerEngine.calculate(base).specific_speed.value).toBeGreaterThan(0);
  });
  it("tip speed > 0", () => {
    expect(impellerEngine.calculate(base).tip_speed_m_s.value).toBeGreaterThan(0);
  });
  it("power > 0", () => {
    expect(impellerEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("higher head → more power", () => {
    const p30 = impellerEngine.calculate(base).power_kW.value;
    const p60 = impellerEngine.calculate({ ...base, head_m: 60 }).power_kW.value;
    expect(p60).toBeGreaterThan(p30);
  });
  it("slip factor between 0 and 1", () => {
    const sf = impellerEngine.calculate(base).slip_factor.value;
    expect(sf).toBeGreaterThan(0);
    expect(sf).toBeLessThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(impellerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("HydraulicMotorEngine", () => {
  const base = { displacement_cc_rev: 100, pressure_bar: 200, speed_rpm: 1500 };
  it("output power > 0", () => {
    expect(hydraulicMotorEngine.calculate(base).output_power_kW.value).toBeGreaterThan(0);
  });
  it("output power < input power", () => {
    const r = hydraulicMotorEngine.calculate(base);
    expect(r.output_power_kW.value).toBeLessThan(r.input_power_kW.value);
  });
  it("higher pressure → more torque", () => {
    const t200 = hydraulicMotorEngine.calculate(base).actual_torque_Nm.value;
    const t300 = hydraulicMotorEngine.calculate({ ...base, pressure_bar: 300 }).actual_torque_Nm.value;
    expect(t300).toBeGreaterThan(t200);
  });
  it("overall efficiency between 50-100%", () => {
    const eta = hydraulicMotorEngine.calculate(base).overall_efficiency_pct.value;
    expect(eta).toBeGreaterThan(50);
    expect(eta).toBeLessThan(100);
  });
  it("case drain > 0", () => {
    expect(hydraulicMotorEngine.calculate(base).case_drain_lpm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(hydraulicMotorEngine.calculate(base).recommendations)).toBe(true);
  });
});
