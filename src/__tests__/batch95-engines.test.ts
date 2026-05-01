/**
 * Batch 95 — ProgressiveCavityPump, AxialPistonPump, Thickener
 * @milestone FORGE-ENGINES-BATCH95
 */
import { describe, it, expect } from "vitest";
import { progressiveCavityPumpEngine } from "../engines/ProgressiveCavityPumpEngine.js";
import { axialPistonPumpEngine } from "../engines/AxialPistonPumpEngine.js";
import { thickenerEngine } from "../engines/ThickenerEngine.js";

describe("ProgressiveCavityPumpEngine", () => {
  const base = { rotor_diameter_mm: 50 };
  it("flow rate > 0", () => {
    expect(progressiveCavityPumpEngine.calculate(base).flow_rate_m3_h.value).toBeGreaterThan(0);
  });
  it("volumetric efficiency > 50%", () => {
    expect(progressiveCavityPumpEngine.calculate(base).volumetric_efficiency_pct.value).toBeGreaterThan(50);
  });
  it("more stages → higher max pressure", () => {
    const p2 = progressiveCavityPumpEngine.calculate({ ...base, num_stages: 2 }).max_pressure_bar.value;
    const p4 = progressiveCavityPumpEngine.calculate({ ...base, num_stages: 4 }).max_pressure_bar.value;
    expect(p4).toBeGreaterThan(p2);
  });
  it("power > 0", () => {
    expect(progressiveCavityPumpEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("displacement > 0", () => {
    expect(progressiveCavityPumpEngine.calculate(base).displacement_L_rev.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(progressiveCavityPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AxialPistonPumpEngine", () => {
  const base = { piston_diameter_mm: 15 };
  it("displacement > 0", () => {
    expect(axialPistonPumpEngine.calculate(base).displacement_cc_rev.value).toBeGreaterThan(0);
  });
  it("flow rate > 0", () => {
    expect(axialPistonPumpEngine.calculate(base).flow_rate_L_min.value).toBeGreaterThan(0);
  });
  it("volumetric efficiency > 85%", () => {
    expect(axialPistonPumpEngine.calculate(base).volumetric_efficiency_pct.value).toBeGreaterThan(85);
  });
  it("larger swashplate angle → more displacement", () => {
    const d10 = axialPistonPumpEngine.calculate({ ...base, swashplate_angle_deg: 10 }).displacement_cc_rev.value;
    const d20 = axialPistonPumpEngine.calculate({ ...base, swashplate_angle_deg: 20 }).displacement_cc_rev.value;
    expect(d20).toBeGreaterThan(d10);
  });
  it("input power > 0", () => {
    expect(axialPistonPumpEngine.calculate(base).input_power_kW.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(axialPistonPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThickenerEngine", () => {
  const base = { feed_rate_m3_h: 100, feed_solids_pct: 5 };
  it("diameter > 0", () => {
    expect(thickenerEngine.calculate(base).thickener_diameter_m.value).toBeGreaterThan(0);
  });
  it("area > 0", () => {
    expect(thickenerEngine.calculate(base).thickener_area_m2.value).toBeGreaterThan(0);
  });
  it("higher feed rate → larger thickener", () => {
    const a50 = thickenerEngine.calculate({ ...base, feed_rate_m3_h: 50 }).thickener_area_m2.value;
    const a200 = thickenerEngine.calculate({ ...base, feed_rate_m3_h: 200 }).thickener_area_m2.value;
    expect(a200).toBeGreaterThan(a50);
  });
  it("residence time > 0", () => {
    expect(thickenerEngine.calculate(base).residence_time_h.value).toBeGreaterThan(0);
  });
  it("underflow rate < feed rate", () => {
    expect(thickenerEngine.calculate(base).underflow_rate_m3_h.value).toBeLessThan(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thickenerEngine.calculate(base).recommendations)).toBe(true);
  });
});
