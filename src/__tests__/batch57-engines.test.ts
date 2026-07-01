/**
 * Batch 57 — CoolingTower, SteamTurbine, ValveDesign
 * @milestone FORGE-ENGINES-BATCH57
 */
import { describe, it, expect } from "vitest";
import { coolingTowerEngine } from "../engines/CoolingTowerEngine.js";
import { steamTurbineEngine } from "../engines/SteamTurbineEngine.js";
import { valveDesignEngine } from "../engines/ValveDesignEngine.js";

describe("CoolingTowerEngine", () => {
  const base = {
    heat_load_kW: 500, hot_water_temp_C: 40, cold_water_temp_C: 30,
  };
  it("range matches input temps", () => {
    expect(coolingTowerEngine.calculate(base).range_C.value).toBe(10);
  });
  it("water flow > 0", () => {
    expect(coolingTowerEngine.calculate(base).water_flow_m3_h.value).toBeGreaterThan(0);
  });
  it("fan power > 0", () => {
    expect(coolingTowerEngine.calculate(base).fan_power_kW.value).toBeGreaterThan(0);
  });
  it("more heat needs more water", () => {
    const lo = coolingTowerEngine.calculate({ ...base, heat_load_kW: 100 });
    const hi = coolingTowerEngine.calculate({ ...base, heat_load_kW: 2000 });
    expect(hi.water_flow_m3_h.value).toBeGreaterThan(lo.water_flow_m3_h.value);
  });
  it("efficiency between 0-100", () => {
    const e = coolingTowerEngine.calculate(base).tower_efficiency_pct.value;
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThanOrEqual(100);
  });
  it("makeup water > 0", () => {
    expect(coolingTowerEngine.calculate(base).makeup_water_m3_h.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(coolingTowerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SteamTurbineEngine", () => {
  const base = {
    inlet_pressure_bar: 40, inlet_temp_C: 400,
    exhaust_pressure_bar: 0.1,
  };
  it("power output > 0", () => {
    expect(steamTurbineEngine.calculate(base).power_output_kW.value).toBeGreaterThan(0);
  });
  it("steam rate > 0", () => {
    expect(steamTurbineEngine.calculate(base).steam_rate_kg_kWh.value).toBeGreaterThan(0);
  });
  it("isentropic efficiency 60-95%", () => {
    const e = steamTurbineEngine.calculate(base).isentropic_efficiency_pct.value;
    expect(e).toBeGreaterThan(60);
    expect(e).toBeLessThan(95);
  });
  it("enthalpy drop > 0", () => {
    expect(steamTurbineEngine.calculate(base).enthalpy_drop_kJ_kg.value).toBeGreaterThan(0);
  });
  it("higher inlet temp = more power (same flow)", () => {
    const lo = steamTurbineEngine.calculate({
      ...base, inlet_temp_C: 300, steam_flow_kg_h: 5000,
    });
    const hi = steamTurbineEngine.calculate({
      ...base, inlet_temp_C: 500, steam_flow_kg_h: 5000,
    });
    expect(hi.power_output_kW.value).toBeGreaterThan(lo.power_output_kW.value);
  });
  it("exhaust wetness ≥ 0", () => {
    expect(steamTurbineEngine.calculate(base).exhaust_wetness_pct.value).toBeGreaterThanOrEqual(0);
  });
  it("heat rate > 0", () => {
    expect(steamTurbineEngine.calculate(base).heat_rate_kJ_kWh.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(steamTurbineEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ValveDesignEngine", () => {
  const base = {
    flow_rate_m3_h: 50, inlet_pressure_bar: 10, outlet_pressure_bar: 8,
  };
  it("Cv required > 0", () => {
    expect(valveDesignEngine.calculate(base).cv_required.value).toBeGreaterThan(0);
  });
  it("selected Cv ≥ required Cv", () => {
    const r = valveDesignEngine.calculate(base);
    expect(r.cv_selected.value).toBeGreaterThanOrEqual(r.cv_required.value);
  });
  it("valve size > 0", () => {
    expect(valveDesignEngine.calculate(base).valve_size_mm.value).toBeGreaterThan(0);
  });
  it("percent opening between 0-100", () => {
    const p = valveDesignEngine.calculate(base).percent_opening_pct.value;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(100);
  });
  it("more flow needs higher Cv", () => {
    const lo = valveDesignEngine.calculate({ ...base, flow_rate_m3_h: 10 });
    const hi = valveDesignEngine.calculate({ ...base, flow_rate_m3_h: 200 });
    expect(hi.cv_required.value).toBeGreaterThan(lo.cv_required.value);
  });
  it("cavitation index > 0", () => {
    expect(valveDesignEngine.calculate(base).cavitation_index.value).toBeGreaterThan(0);
  });
  it("velocity > 0", () => {
    expect(valveDesignEngine.calculate(base).velocity_m_s.value).toBeGreaterThan(0);
  });
  it("noise is finite", () => {
    expect(Number.isFinite(valveDesignEngine.calculate(base).noise_dBA.value)).toBe(true);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(valveDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});
