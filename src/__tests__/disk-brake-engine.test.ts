/**
 * DiskBrakeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B48
 */
import { describe, it, expect } from "vitest";
import { diskBrakeEngine } from "../engines/DiskBrakeEngine.js";

describe("DiskBrakeEngine", () => {
  it("braking torque > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.braking_torque.value).toBeGreaterThan(0);
  });

  it("kinetic energy > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.kinetic_energy.value).toBeGreaterThan(0);
  });

  it("higher speed increases KE", () => {
    const slow = diskBrakeEngine.calculate({ initial_speed_kmh: 50 });
    const fast = diskBrakeEngine.calculate({ initial_speed_kmh: 200 });
    expect(fast.kinetic_energy.value).toBeGreaterThan(
      slow.kinetic_energy.value
    );
  });

  it("higher clamp force increases torque", () => {
    const lo = diskBrakeEngine.calculate({ clamp_force_n: 5000 });
    const hi = diskBrakeEngine.calculate({ clamp_force_n: 30000 });
    expect(hi.braking_torque.value).toBeGreaterThan(
      lo.braking_torque.value
    );
  });

  it("stopping distance > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.stopping_distance.value).toBeGreaterThan(0);
  });

  it("stopping time > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.stopping_time.value).toBeGreaterThan(0);
  });

  it("disc temp rise > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.disc_temp_rise.value).toBeGreaterThan(0);
  });

  it("carbon ceramic has higher thermal capacity", () => {
    const iron = diskBrakeEngine.calculate({ disc_material: "cast_iron" });
    const cc = diskBrakeEngine.calculate({ disc_material: "carbon_ceramic" });
    expect(cc.thermal_capacity.value).toBeGreaterThan(
      iron.thermal_capacity.value
    );
  });

  it("deceleration > 0", () => {
    const r = diskBrakeEngine.calculate({});
    expect(r.deceleration.value).toBeGreaterThan(0);
  });

  it("warns high pad pressure", () => {
    const r = diskBrakeEngine.calculate({
      clamp_force_n: 40000, pad_area_cm2: 10,
    });
    expect(r.warnings.some(w => w.includes("ad pressure") || w.includes("wear"))).toBe(true);
  });
});
