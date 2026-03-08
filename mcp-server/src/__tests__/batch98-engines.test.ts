/**
 * Batch 98 — LaserWelding, FrictionStirWelding, EBWelding
 * @milestone FORGE-ENGINES-BATCH98
 */
import { describe, it, expect } from "vitest";
import { laserWeldingEngine } from "../engines/LaserWeldingEngine.js";
import { frictionStirWeldingEngine } from "../engines/FrictionStirWeldingEngine.js";
import { ebWeldingEngine } from "../engines/EBWeldingEngine.js";

describe("LaserWeldingEngine", () => {
  const base = { laser_power_kW: 4, material_thickness_mm: 5 };
  it("penetration > 0", () => {
    expect(laserWeldingEngine.calculate(base).penetration_depth_mm.value).toBeGreaterThan(0);
  });
  it("power density > 0", () => {
    expect(laserWeldingEngine.calculate(base).power_density_MW_cm2.value).toBeGreaterThan(0);
  });
  it("higher power → deeper penetration", () => {
    const d2 = laserWeldingEngine.calculate({ ...base, laser_power_kW: 2 }).penetration_depth_mm.value;
    const d8 = laserWeldingEngine.calculate({ ...base, laser_power_kW: 8 }).penetration_depth_mm.value;
    expect(d8).toBeGreaterThan(d2);
  });
  it("HAZ width > 0", () => {
    expect(laserWeldingEngine.calculate(base).HAZ_width_mm.value).toBeGreaterThan(0);
  });
  it("efficiency > 0", () => {
    expect(laserWeldingEngine.calculate(base).efficiency_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(laserWeldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FrictionStirWeldingEngine", () => {
  const base = { plate_thickness_mm: 6 };
  it("peak temperature > 0", () => {
    expect(frictionStirWeldingEngine.calculate(base).peak_temperature_C.value).toBeGreaterThan(0);
  });
  it("axial force > 0", () => {
    expect(frictionStirWeldingEngine.calculate(base).axial_force_kN.value).toBeGreaterThan(0);
  });
  it("higher RPM → higher temperature", () => {
    const t500 = frictionStirWeldingEngine.calculate({ ...base, rotation_speed_rpm: 500 }).peak_temperature_C.value;
    const t2000 = frictionStirWeldingEngine.calculate({ ...base, rotation_speed_rpm: 2000 }).peak_temperature_C.value;
    expect(t2000).toBeGreaterThan(t500);
  });
  it("torque > 0", () => {
    expect(frictionStirWeldingEngine.calculate(base).torque_Nm.value).toBeGreaterThan(0);
  });
  it("nugget width > 0", () => {
    expect(frictionStirWeldingEngine.calculate(base).weld_nugget_width_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(frictionStirWeldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("EBWeldingEngine", () => {
  const base = { beam_current_mA: 100, material_thickness_mm: 10 };
  it("beam power > 0", () => {
    expect(ebWeldingEngine.calculate(base).beam_power_kW.value).toBeGreaterThan(0);
  });
  it("penetration > 0", () => {
    expect(ebWeldingEngine.calculate(base).penetration_depth_mm.value).toBeGreaterThan(0);
  });
  it("higher current → deeper penetration", () => {
    const d50 = ebWeldingEngine.calculate({ ...base, beam_current_mA: 50 }).penetration_depth_mm.value;
    const d200 = ebWeldingEngine.calculate({ ...base, beam_current_mA: 200 }).penetration_depth_mm.value;
    expect(d200).toBeGreaterThan(d50);
  });
  it("aspect ratio > 1 (EB has deep narrow welds)", () => {
    expect(ebWeldingEngine.calculate(base).aspect_ratio.value).toBeGreaterThan(1);
  });
  it("vacuum level matches environment", () => {
    const hv = ebWeldingEngine.calculate({ ...base, environment: "high_vacuum" }).vacuum_level_mbar.value;
    const nv = ebWeldingEngine.calculate({ ...base, environment: "non_vacuum" }).vacuum_level_mbar.value;
    expect(nv).toBeGreaterThan(hv);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ebWeldingEngine.calculate(base).recommendations)).toBe(true);
  });
});
