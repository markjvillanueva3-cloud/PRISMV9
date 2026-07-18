/**
 * Batch 60 — DamperDesign, FilterPress, MixerAgitator
 * @milestone FORGE-ENGINES-BATCH60
 */
import { describe, it, expect } from "vitest";
import { damperDesignEngine } from "../engines/DamperDesignEngine.js";
import { filterPressEngine } from "../engines/FilterPressEngine.js";
import { mixerAgitatorEngine } from "../engines/MixerAgitatorEngine.js";

describe("DamperDesignEngine", () => {
  const base = { airflow_m3_h: 5000 };
  it("face velocity > 0", () => {
    expect(damperDesignEngine.calculate(base).face_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("pressure drop > 0", () => {
    expect(damperDesignEngine.calculate(base).pressure_drop_Pa.value).toBeGreaterThan(0);
  });
  it("authority between 0 and 1", () => {
    const a = damperDesignEngine.calculate(base).damper_authority.value;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(1);
  });
  it("actuator torque > 0", () => {
    expect(damperDesignEngine.calculate(base).actuator_torque_Nm.value).toBeGreaterThan(0);
  });
  it("more flow = larger damper", () => {
    const lo = damperDesignEngine.calculate({ ...base, airflow_m3_h: 500 });
    const hi = damperDesignEngine.calculate({ ...base, airflow_m3_h: 50000 });
    expect(hi.damper_width_mm.value).toBeGreaterThanOrEqual(lo.damper_width_mm.value);
  });
  it("leakage rate > 0", () => {
    expect(damperDesignEngine.calculate(base).leakage_rate_L_s_m2.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(damperDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FilterPressEngine", () => {
  const base = { slurry_flow_m3_h: 10 };
  it("filter area > 0", () => {
    expect(filterPressEngine.calculate(base).total_filter_area_m2.value).toBeGreaterThan(0);
  });
  it("number of plates > 0", () => {
    expect(filterPressEngine.calculate(base).number_of_plates.value).toBeGreaterThan(0);
  });
  it("cycle time > 0", () => {
    expect(filterPressEngine.calculate(base).cycle_time_min.value).toBeGreaterThan(0);
  });
  it("feed pump power > 0", () => {
    expect(filterPressEngine.calculate(base).feed_pump_kW.value).toBeGreaterThan(0);
  });
  it("more flow needs more plates", () => {
    const lo = filterPressEngine.calculate({ ...base, slurry_flow_m3_h: 2 });
    const hi = filterPressEngine.calculate({ ...base, slurry_flow_m3_h: 50 });
    expect(hi.number_of_plates.value).toBeGreaterThanOrEqual(lo.number_of_plates.value);
  });
  it("cake production > 0", () => {
    expect(filterPressEngine.calculate(base).cake_production_kg_h.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(filterPressEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("MixerAgitatorEngine", () => {
  const base = { tank_diameter_mm: 1000 };
  it("power > 0", () => {
    expect(mixerAgitatorEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("torque > 0", () => {
    expect(mixerAgitatorEngine.calculate(base).torque_Nm.value).toBeGreaterThan(0);
  });
  it("reynolds > 0", () => {
    expect(mixerAgitatorEngine.calculate(base).reynolds_number.value).toBeGreaterThan(0);
  });
  it("tip speed > 0", () => {
    expect(mixerAgitatorEngine.calculate(base).tip_speed_m_s.value).toBeGreaterThan(0);
  });
  it("mixing time > 0", () => {
    expect(mixerAgitatorEngine.calculate(base).mixing_time_s.value).toBeGreaterThan(0);
  });
  it("larger tank needs more power", () => {
    const lo = mixerAgitatorEngine.calculate({ ...base, tank_diameter_mm: 500 });
    const hi = mixerAgitatorEngine.calculate({ ...base, tank_diameter_mm: 3000 });
    expect(hi.power_kW.value).toBeGreaterThan(lo.power_kW.value);
  });
  it("high viscosity changes regime", () => {
    const water = mixerAgitatorEngine.calculate({ ...base, liquid_viscosity_cP: 1 });
    const thick = mixerAgitatorEngine.calculate({ ...base, liquid_viscosity_cP: 10000 });
    expect(thick.reynolds_number.value).toBeLessThan(water.reynolds_number.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(mixerAgitatorEngine.calculate(base).recommendations)).toBe(true);
  });
});
