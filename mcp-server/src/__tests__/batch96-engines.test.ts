/**
 * Batch 96 — BalancingMachine, RocketNozzle, Thermoelectric
 * @milestone FORGE-ENGINES-BATCH96
 */
import { describe, it, expect } from "vitest";
import { balancingMachineEngine } from "../engines/BalancingMachineEngine.js";
import { rocketNozzleEngine } from "../engines/RocketNozzleEngine.js";
import { thermoelectricEngine } from "../engines/ThermoelectricEngine.js";

describe("BalancingMachineEngine", () => {
  const base = { rotor_mass_kg: 10, operating_speed_rpm: 3000 };
  it("permissible unbalance > 0", () => {
    expect(balancingMachineEngine.calculate(base).permissible_unbalance_g_mm.value).toBeGreaterThan(0);
  });
  it("tighter grade → less permissible unbalance", () => {
    const g63 = balancingMachineEngine.calculate({ ...base, grade: "G6.3" }).permissible_unbalance_g_mm.value;
    const g1 = balancingMachineEngine.calculate({ ...base, grade: "G1" }).permissible_unbalance_g_mm.value;
    expect(g1).toBeLessThan(g63);
  });
  it("correction mass > 0", () => {
    expect(balancingMachineEngine.calculate(base).correction_mass_g.value).toBeGreaterThan(0);
  });
  it("residual vibration < initial", () => {
    expect(balancingMachineEngine.calculate(base).residual_vibration_um.value).toBeLessThan(50);
  });
  it("num runs > 0", () => {
    expect(balancingMachineEngine.calculate(base).num_runs_required.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(balancingMachineEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("RocketNozzleEngine", () => {
  const base = { chamber_pressure_bar: 70, throat_diameter_mm: 50 };
  it("thrust > 0", () => {
    expect(rocketNozzleEngine.calculate(base).thrust_kN.value).toBeGreaterThan(0);
  });
  it("specific impulse > 200s", () => {
    expect(rocketNozzleEngine.calculate(base).specific_impulse_s.value).toBeGreaterThan(200);
  });
  it("exit Mach > 1 (supersonic)", () => {
    expect(rocketNozzleEngine.calculate(base).exit_mach_number.value).toBeGreaterThan(1);
  });
  it("higher chamber pressure → more thrust", () => {
    const t50 = rocketNozzleEngine.calculate({ ...base, chamber_pressure_bar: 50 }).thrust_kN.value;
    const t100 = rocketNozzleEngine.calculate({ ...base, chamber_pressure_bar: 100 }).thrust_kN.value;
    expect(t100).toBeGreaterThan(t50);
  });
  it("mass flow > 0", () => {
    expect(rocketNozzleEngine.calculate(base).mass_flow_kg_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rocketNozzleEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThermoelectricEngine", () => {
  const base = { hot_side_C: 200, cold_side_C: 30 };
  it("power output > 0 in generator mode", () => {
    expect(thermoelectricEngine.calculate(base).power_output_W.value).toBeGreaterThan(0);
  });
  it("efficiency > 0", () => {
    expect(thermoelectricEngine.calculate(base).efficiency_pct.value).toBeGreaterThan(0);
  });
  it("higher ΔT → more power", () => {
    const p100 = thermoelectricEngine.calculate({ ...base, hot_side_C: 100 }).power_output_W.value;
    const p300 = thermoelectricEngine.calculate({ ...base, hot_side_C: 300, material: "PbTe" }).power_output_W.value;
    expect(p300).toBeGreaterThan(p100);
  });
  it("ZT > 0", () => {
    expect(thermoelectricEngine.calculate(base).ZT_average.value).toBeGreaterThan(0);
  });
  it("cooler mode has COP > 0", () => {
    const r = thermoelectricEngine.calculate({ mode: "cooler", hot_side_C: 35, cold_side_C: 25, material: "BiTe" });
    expect(r.COP.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thermoelectricEngine.calculate(base).recommendations)).toBe(true);
  });
});
