/**
 * Batch 72 — Welding, ScrollCompressor, CoriolisFlowMeter
 * @milestone FORGE-ENGINES-BATCH72
 */
import { describe, it, expect } from "vitest";
import { weldingEngine } from "../engines/WeldingEngine.js";
import { scrollCompressorEngine } from "../engines/ScrollCompressorEngine.js";
import { coriolisFlowMeterEngine } from "../engines/CoriolisFlowMeterEngine.js";

describe("WeldingEngine", () => {
  const base = { voltage_V: 25, current_A: 200, travel_speed_mm_min: 300, plate_thickness_mm: 12 };
  it("heat input > 0", () => {
    expect(weldingEngine.calculate(base).heat_input_kJ_mm.value).toBeGreaterThan(0);
  });
  it("GTAW lower efficiency than SAW", () => {
    const gtaw = weldingEngine.calculate({ ...base, process: "gtaw" }).thermal_efficiency.value;
    const saw = weldingEngine.calculate({ ...base, process: "saw" }).thermal_efficiency.value;
    expect(saw).toBeGreaterThan(gtaw);
  });
  it("cooling rate > 0", () => {
    expect(weldingEngine.calculate(base).cooling_rate_800_500_s.value).toBeGreaterThan(0);
  });
  it("HAZ width > 0", () => {
    expect(weldingEngine.calculate(base).haz_width_mm.value).toBeGreaterThan(0);
  });
  it("high CE requires preheat", () => {
    expect(weldingEngine.calculate({ ...base, carbon_equivalent: 0.55 }).preheat_required_C.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(weldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ScrollCompressorEngine", () => {
  const base = { suction_pressure_bar: 5, discharge_pressure_bar: 20, displacement_cc: 50 };
  it("pressure ratio = Pd/Ps", () => {
    expect(scrollCompressorEngine.calculate(base).pressure_ratio.value).toBeCloseTo(4, 1);
  });
  it("shaft power > 0", () => {
    expect(scrollCompressorEngine.calculate(base).shaft_power_kW.value).toBeGreaterThan(0);
  });
  it("COP > 1", () => {
    expect(scrollCompressorEngine.calculate(base).cop.value).toBeGreaterThan(1);
  });
  it("discharge temp > suction", () => {
    expect(scrollCompressorEngine.calculate(base).discharge_temp_C.value).toBeGreaterThan(10);
  });
  it("higher PR = lower isentropic efficiency", () => {
    const lo = scrollCompressorEngine.calculate({ ...base, discharge_pressure_bar: 10 });
    const hi = scrollCompressorEngine.calculate({ ...base, discharge_pressure_bar: 40 });
    expect(hi.isentropic_efficiency.value).toBeLessThanOrEqual(lo.isentropic_efficiency.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(scrollCompressorEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CoriolisFlowMeterEngine", () => {
  const base = { flow_rate_kg_h: 5000, pipe_diameter_mm: 50 };
  it("meter size > 0", () => {
    expect(coriolisFlowMeterEngine.calculate(base).meter_size_mm.value).toBeGreaterThan(0);
  });
  it("accuracy < 1%", () => {
    expect(coriolisFlowMeterEngine.calculate(base).mass_flow_accuracy_pct.value).toBeLessThan(1);
  });
  it("pressure drop > 0", () => {
    expect(coriolisFlowMeterEngine.calculate(base).pressure_drop_bar.value).toBeGreaterThan(0);
  });
  it("turndown ratio > 10", () => {
    expect(coriolisFlowMeterEngine.calculate(base).turndown_ratio.value).toBeGreaterThan(10);
  });
  it("larger flow = larger meter", () => {
    const lo = coriolisFlowMeterEngine.calculate({ ...base, flow_rate_kg_h: 100 });
    const hi = coriolisFlowMeterEngine.calculate({ ...base, flow_rate_kg_h: 100000 });
    expect(hi.meter_size_mm.value).toBeGreaterThanOrEqual(lo.meter_size_mm.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(coriolisFlowMeterEngine.calculate(base).recommendations)).toBe(true);
  });
});
