/**
 * Batch 66 — GearPump, VacuumPump, AirCompressor
 * @milestone FORGE-ENGINES-BATCH66
 */
import { describe, it, expect } from "vitest";
import { gearPumpEngine } from "../engines/GearPumpEngine.js";
import { vacuumPumpEngine } from "../engines/VacuumPumpEngine.js";
import { airCompressorEngine } from "../engines/AirCompressorEngine.js";

describe("GearPumpEngine", () => {
  const base = { flow_rate_L_min: 20 };
  it("displacement > 0", () => {
    expect(gearPumpEngine.calculate(base).displacement_cc_rev.value).toBeGreaterThan(0);
  });
  it("power > 0", () => {
    expect(gearPumpEngine.calculate(base).input_power_kW.value).toBeGreaterThan(0);
  });
  it("volumetric efficiency > 70%", () => {
    expect(gearPumpEngine.calculate(base).volumetric_efficiency_pct.value).toBeGreaterThan(70);
  });
  it("more flow = more displacement", () => {
    const lo = gearPumpEngine.calculate({ ...base, flow_rate_L_min: 5 });
    const hi = gearPumpEngine.calculate({ ...base, flow_rate_L_min: 100 });
    expect(hi.displacement_cc_rev.value).toBeGreaterThan(lo.displacement_cc_rev.value);
  });
  it("higher pressure = more power", () => {
    const lo = gearPumpEngine.calculate({ ...base, discharge_pressure_bar: 50 });
    const hi = gearPumpEngine.calculate({ ...base, discharge_pressure_bar: 200 });
    expect(hi.input_power_kW.value).toBeGreaterThan(lo.input_power_kW.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(gearPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("VacuumPumpEngine", () => {
  const base = { chamber_volume_L: 100, target_pressure_mbar: 0.1 };
  it("pumping speed > 0", () => {
    expect(vacuumPumpEngine.calculate(base).pumping_speed_L_s.value).toBeGreaterThan(0);
  });
  it("pumpdown time > 0", () => {
    expect(vacuumPumpEngine.calculate(base).pumpdown_time_min.value).toBeGreaterThan(0);
  });
  it("larger chamber = longer pumpdown", () => {
    const small = vacuumPumpEngine.calculate({ ...base, chamber_volume_L: 10 });
    const big = vacuumPumpEngine.calculate({ ...base, chamber_volume_L: 1000 });
    expect(big.pumpdown_time_min.value).toBeGreaterThan(small.pumpdown_time_min.value);
  });
  it("pressure ratio > 1", () => {
    expect(vacuumPumpEngine.calculate(base).pressure_ratio.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(vacuumPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AirCompressorEngine", () => {
  const base = { air_demand_m3_min: 2 };
  it("shaft power > 0", () => {
    expect(airCompressorEngine.calculate(base).shaft_power_kW.value).toBeGreaterThan(0);
  });
  it("motor power ≥ shaft power", () => {
    const r = airCompressorEngine.calculate(base);
    expect(r.motor_power_kW.value).toBeGreaterThanOrEqual(r.shaft_power_kW.value);
  });
  it("specific power > 0", () => {
    expect(airCompressorEngine.calculate(base).specific_power_kW_m3_min.value).toBeGreaterThan(0);
  });
  it("discharge temp > inlet temp", () => {
    expect(airCompressorEngine.calculate(base).discharge_temp_C.value).toBeGreaterThan(20);
  });
  it("higher pressure = more power", () => {
    const lo = airCompressorEngine.calculate({ ...base, discharge_pressure_bar: 3 });
    const hi = airCompressorEngine.calculate({ ...base, discharge_pressure_bar: 12 });
    expect(hi.shaft_power_kW.value).toBeGreaterThan(lo.shaft_power_kW.value);
  });
  it("receiver volume > 0", () => {
    expect(airCompressorEngine.calculate(base).receiver_volume_L.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(airCompressorEngine.calculate(base).recommendations)).toBe(true);
  });
});
