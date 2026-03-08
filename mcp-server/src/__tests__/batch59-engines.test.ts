/**
 * Batch 59 — CycloneSeparator, ScrewConveyor, BucketElevator
 * @milestone FORGE-ENGINES-BATCH59
 */
import { describe, it, expect } from "vitest";
import { cycloneSeparatorEngine } from "../engines/CycloneSeparatorEngine.js";
import { screwConveyorEngine } from "../engines/ScrewConveyorEngine.js";
import { bucketElevatorEngine } from "../engines/BucketElevatorEngine.js";

describe("CycloneSeparatorEngine", () => {
  const base = { gas_flow_m3_h: 5000 };
  it("cyclone diameter > 0", () => {
    expect(cycloneSeparatorEngine.calculate(base).cyclone_diameter_mm.value).toBeGreaterThan(0);
  });
  it("cut size d50 > 0", () => {
    expect(cycloneSeparatorEngine.calculate(base).cut_size_d50_um.value).toBeGreaterThan(0);
  });
  it("collection efficiency 0-100", () => {
    const e = cycloneSeparatorEngine.calculate(base).collection_efficiency_pct.value;
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThanOrEqual(100);
  });
  it("pressure drop > 0", () => {
    expect(cycloneSeparatorEngine.calculate(base).pressure_drop_Pa.value).toBeGreaterThan(0);
  });
  it("high-efficiency design has better collection", () => {
    const conv = cycloneSeparatorEngine.calculate({ ...base, cyclone_design: "conventional" });
    const he = cycloneSeparatorEngine.calculate({ ...base, cyclone_design: "high_efficiency" });
    expect(he.collection_efficiency_pct.value).toBeGreaterThanOrEqual(conv.collection_efficiency_pct.value);
  });
  it("more flow = larger cyclone", () => {
    const lo = cycloneSeparatorEngine.calculate({ ...base, gas_flow_m3_h: 1000 });
    const hi = cycloneSeparatorEngine.calculate({ ...base, gas_flow_m3_h: 20000 });
    expect(hi.cyclone_diameter_mm.value).toBeGreaterThan(lo.cyclone_diameter_mm.value);
  });
  it("stokes number > 0", () => {
    expect(cycloneSeparatorEngine.calculate(base).stokes_number.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(cycloneSeparatorEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ScrewConveyorEngine", () => {
  const base = { capacity_tph: 20, length_m: 10 };
  it("screw diameter > 0", () => {
    expect(screwConveyorEngine.calculate(base).screw_diameter_mm.value).toBeGreaterThan(0);
  });
  it("drive power > 0", () => {
    expect(screwConveyorEngine.calculate(base).drive_power_kW.value).toBeGreaterThan(0);
  });
  it("shaft torque > 0", () => {
    expect(screwConveyorEngine.calculate(base).shaft_torque_Nm.value).toBeGreaterThan(0);
  });
  it("critical speed > 0", () => {
    expect(screwConveyorEngine.calculate(base).critical_speed_rpm.value).toBeGreaterThan(0);
  });
  it("more capacity needs bigger screw or faster speed", () => {
    const lo = screwConveyorEngine.calculate({ ...base, capacity_tph: 5 });
    const hi = screwConveyorEngine.calculate({ ...base, capacity_tph: 100 });
    const loProd = lo.screw_diameter_mm.value * lo.screw_speed_rpm.value;
    const hiProd = hi.screw_diameter_mm.value * hi.screw_speed_rpm.value;
    expect(hiProd).toBeGreaterThan(loProd);
  });
  it("inclination reduces capacity factor", () => {
    const flat = screwConveyorEngine.calculate({ ...base, inclination_deg: 0 });
    const steep = screwConveyorEngine.calculate({ ...base, inclination_deg: 25 });
    expect(steep.inclination_factor.value).toBeLessThan(flat.inclination_factor.value);
  });
  it("longer conveyor needs more power", () => {
    const short = screwConveyorEngine.calculate({ ...base, length_m: 5 });
    const long = screwConveyorEngine.calculate({ ...base, length_m: 50 });
    expect(long.drive_power_kW.value).toBeGreaterThan(short.drive_power_kW.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(screwConveyorEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("BucketElevatorEngine", () => {
  const base = { capacity_tph: 50, lift_height_m: 20 };
  it("drive power > 0", () => {
    expect(bucketElevatorEngine.calculate(base).drive_power_kW.value).toBeGreaterThan(0);
  });
  it("belt speed > 0", () => {
    expect(bucketElevatorEngine.calculate(base).belt_speed_m_s.value).toBeGreaterThan(0);
  });
  it("bucket width > 0", () => {
    expect(bucketElevatorEngine.calculate(base).bucket_width_mm.value).toBeGreaterThan(0);
  });
  it("more lift = more power", () => {
    const lo = bucketElevatorEngine.calculate({ ...base, lift_height_m: 5 });
    const hi = bucketElevatorEngine.calculate({ ...base, lift_height_m: 50 });
    expect(hi.drive_power_kW.value).toBeGreaterThan(lo.drive_power_kW.value);
  });
  it("belt tension > 0", () => {
    expect(bucketElevatorEngine.calculate(base).belt_tension_kN.value).toBeGreaterThan(0);
  });
  it("head shaft torque > 0", () => {
    expect(bucketElevatorEngine.calculate(base).head_shaft_torque_Nm.value).toBeGreaterThan(0);
  });
  it("bucket fill ≤ 100%", () => {
    expect(bucketElevatorEngine.calculate(base).bucket_fill_pct.value).toBeLessThanOrEqual(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(bucketElevatorEngine.calculate(base).recommendations)).toBe(true);
  });
});
