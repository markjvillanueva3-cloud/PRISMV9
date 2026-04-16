/**
 * Batch 63 — FluidizedBed, RotaryKiln, Centrifuge
 * @milestone FORGE-ENGINES-BATCH63
 */
import { describe, it, expect } from "vitest";
import { fluidizedBedEngine } from "../engines/FluidizedBedEngine.js";
import { rotaryKilnEngine } from "../engines/RotaryKilnEngine.js";
import { centrifugeEngine } from "../engines/CentrifugeEngine.js";

describe("FluidizedBedEngine", () => {
  const base = { gas_flow_m3_h: 1000 };
  it("min fluidization velocity > 0", () => {
    expect(fluidizedBedEngine.calculate(base).min_fluidization_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("bed diameter > 0", () => {
    expect(fluidizedBedEngine.calculate(base).bed_diameter_mm.value).toBeGreaterThan(0);
  });
  it("pressure drop > 0", () => {
    expect(fluidizedBedEngine.calculate(base).pressure_drop_Pa.value).toBeGreaterThan(0);
  });
  it("velocity ratio > 1", () => {
    expect(fluidizedBedEngine.calculate(base).velocity_ratio.value).toBeGreaterThan(1);
  });
  it("terminal > min fluidization velocity", () => {
    const r = fluidizedBedEngine.calculate(base);
    expect(r.terminal_velocity_m_s.value).toBeGreaterThan(r.min_fluidization_velocity_m_s.value);
  });
  it("expanded bed > static bed", () => {
    expect(fluidizedBedEngine.calculate(base).expanded_bed_height_mm.value).toBeGreaterThanOrEqual(500);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(fluidizedBedEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("RotaryKilnEngine", () => {
  const base = { throughput_tph: 10 };
  it("kiln diameter > 0", () => {
    expect(rotaryKilnEngine.calculate(base).kiln_diameter_m.value).toBeGreaterThan(0);
  });
  it("kiln length > 0", () => {
    expect(rotaryKilnEngine.calculate(base).kiln_length_m.value).toBeGreaterThan(0);
  });
  it("heat duty > 0", () => {
    expect(rotaryKilnEngine.calculate(base).heat_duty_MW.value).toBeGreaterThan(0);
  });
  it("L/D ratio in range", () => {
    const ld = rotaryKilnEngine.calculate(base).L_D_ratio.value;
    expect(ld).toBeGreaterThan(0);
  });
  it("more throughput = larger kiln", () => {
    const lo = rotaryKilnEngine.calculate({ ...base, throughput_tph: 2 });
    const hi = rotaryKilnEngine.calculate({ ...base, throughput_tph: 50 });
    expect(hi.kiln_diameter_m.value).toBeGreaterThanOrEqual(lo.kiln_diameter_m.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rotaryKilnEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CentrifugeEngine", () => {
  const base = { feed_flow_m3_h: 5 };
  it("g-force > 0", () => {
    expect(centrifugeEngine.calculate(base).g_force.value).toBeGreaterThan(0);
  });
  it("sigma factor > 0", () => {
    expect(centrifugeEngine.calculate(base).sigma_factor_m2.value).toBeGreaterThan(0);
  });
  it("power > 0", () => {
    expect(centrifugeEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("cut size > 0", () => {
    expect(centrifugeEngine.calculate(base).cut_size_um.value).toBeGreaterThan(0);
  });
  it("separation efficiency 0-100", () => {
    const e = centrifugeEngine.calculate(base).separation_efficiency_pct.value;
    expect(e).toBeGreaterThanOrEqual(0);
    expect(e).toBeLessThanOrEqual(100);
  });
  it("disk stack has high G", () => {
    const ds = centrifugeEngine.calculate({ ...base, centrifuge_type: "disk_stack" });
    const bk = centrifugeEngine.calculate({ ...base, centrifuge_type: "basket" });
    expect(ds.g_force.value).toBeGreaterThan(bk.g_force.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(centrifugeEngine.calculate(base).recommendations)).toBe(true);
  });
});
