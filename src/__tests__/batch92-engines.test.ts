/**
 * Batch 92 — MembraneFiltration, AbsorptionChiller, FurnaceHeating
 * @milestone FORGE-ENGINES-BATCH92
 */
import { describe, it, expect } from "vitest";
import { membraneFiltrationEngine } from "../engines/MembraneFiltrationEngine.js";
import { absorptionChillerEngine } from "../engines/AbsorptionChillerEngine.js";
import { furnaceHeatingEngine } from "../engines/FurnaceHeatingEngine.js";

describe("MembraneFiltrationEngine", () => {
  const base = { feed_flow_m3_h: 10 };
  it("permeate flux > 0", () => {
    expect(membraneFiltrationEngine.calculate(base).permeate_flux_LMH.value).toBeGreaterThan(0);
  });
  it("rejection > 90% for RO", () => {
    expect(membraneFiltrationEngine.calculate(base).rejection_pct.value).toBeGreaterThan(90);
  });
  it("higher pressure → higher flux", () => {
    const f10 = membraneFiltrationEngine.calculate({ ...base, transmembrane_pressure_bar: 10 }).permeate_flux_LMH.value;
    const f25 = membraneFiltrationEngine.calculate({ ...base, transmembrane_pressure_bar: 25 }).permeate_flux_LMH.value;
    expect(f25).toBeGreaterThan(f10);
  });
  it("energy > 0", () => {
    expect(membraneFiltrationEngine.calculate(base).energy_kWh_m3.value).toBeGreaterThan(0);
  });
  it("permeate quality < feed concentration", () => {
    expect(membraneFiltrationEngine.calculate(base).permeate_quality_mg_L.value).toBeLessThan(1000);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(membraneFiltrationEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AbsorptionChillerEngine", () => {
  const base = { cooling_capacity_kW: 500 };
  it("COP > 0", () => {
    expect(absorptionChillerEngine.calculate(base).COP.value).toBeGreaterThan(0);
  });
  it("COP < Carnot COP", () => {
    const r = absorptionChillerEngine.calculate(base);
    expect(r.COP.value).toBeLessThan(r.carnot_COP.value);
  });
  it("higher heat source → higher COP", () => {
    const cop80 = absorptionChillerEngine.calculate({ ...base, heat_source_temp_C: 80 }).COP.value;
    const cop150 = absorptionChillerEngine.calculate({ ...base, heat_source_temp_C: 150 }).COP.value;
    expect(cop150).toBeGreaterThan(cop80);
  });
  it("heat input > cooling capacity", () => {
    expect(absorptionChillerEngine.calculate(base).heat_input_kW.value).toBeGreaterThan(500);
  });
  it("pump power << cooling capacity", () => {
    expect(absorptionChillerEngine.calculate(base).pump_power_kW.value).toBeLessThan(50);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(absorptionChillerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FurnaceHeatingEngine", () => {
  const base = { target_temperature_C: 900, workpiece_mass_kg: 100 };
  it("heating time > 0", () => {
    expect(furnaceHeatingEngine.calculate(base).heating_time_min.value).toBeGreaterThan(0);
  });
  it("total cycle > heating time", () => {
    const r = furnaceHeatingEngine.calculate(base);
    expect(r.total_cycle_min.value).toBeGreaterThan(r.heating_time_min.value);
  });
  it("heavier workpiece → more heat", () => {
    const h50 = furnaceHeatingEngine.calculate({ ...base, workpiece_mass_kg: 50 }).heat_required_kWh.value;
    const h200 = furnaceHeatingEngine.calculate({ ...base, workpiece_mass_kg: 200 }).heat_required_kWh.value;
    expect(h200).toBeGreaterThan(h50);
  });
  it("efficiency between 0-100%", () => {
    const eff = furnaceHeatingEngine.calculate(base).thermal_efficiency_pct.value;
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThan(100);
  });
  it("wall loss > 0", () => {
    expect(furnaceHeatingEngine.calculate(base).wall_loss_kW.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(furnaceHeatingEngine.calculate(base).recommendations)).toBe(true);
  });
});
