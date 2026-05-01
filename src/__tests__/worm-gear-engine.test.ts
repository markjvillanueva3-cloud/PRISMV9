/**
 * WormGearEngine — Unit Tests
 * @milestone FORGE-ENGINES-B48
 */
import { describe, it, expect } from "vitest";
import { wormGearEngine } from "../engines/WormGearEngine.js";

describe("WormGearEngine", () => {
  it("gear ratio = teeth/threads", () => {
    const r = wormGearEngine.calculate({
      num_worm_threads: 2, num_wheel_teeth: 60,
    });
    expect(r.gear_ratio.value).toBe(30);
  });

  it("efficiency between 0 and 100%", () => {
    const r = wormGearEngine.calculate({});
    expect(r.efficiency.value).toBeGreaterThan(0);
    expect(r.efficiency.value).toBeLessThan(100);
  });

  it("more threads increases efficiency", () => {
    const single = wormGearEngine.calculate({ num_worm_threads: 1 });
    const quad = wormGearEngine.calculate({ num_worm_threads: 4 });
    expect(quad.efficiency.value).toBeGreaterThan(
      single.efficiency.value
    );
  });

  it("output speed = input/ratio", () => {
    const r = wormGearEngine.calculate({
      num_worm_threads: 1, num_wheel_teeth: 40,
      worm_speed_rpm: 1500,
    });
    expect(r.output_speed.value).toBeCloseTo(37.5, 0);
  });

  it("output torque > 0", () => {
    const r = wormGearEngine.calculate({});
    expect(r.output_torque.value).toBeGreaterThan(0);
  });

  it("lead angle > 0", () => {
    const r = wormGearEngine.calculate({});
    expect(r.lead_angle.value).toBeGreaterThan(0);
  });

  it("heat generated > 0", () => {
    const r = wormGearEngine.calculate({});
    expect(r.heat_generated.value).toBeGreaterThan(0);
  });

  it("single thread more likely self-locking", () => {
    const single = wormGearEngine.calculate({
      num_worm_threads: 1, friction_coefficient: 0.08,
    });
    const quad = wormGearEngine.calculate({
      num_worm_threads: 4, friction_coefficient: 0.08,
    });
    expect(single.self_locking.value).toBeGreaterThanOrEqual(
      quad.self_locking.value
    );
  });

  it("thermal power limit > 0", () => {
    const r = wormGearEngine.calculate({});
    expect(r.thermal_power_limit.value).toBeGreaterThan(0);
  });

  it("warns low efficiency", () => {
    const r = wormGearEngine.calculate({
      num_worm_threads: 1, friction_coefficient: 0.30,
    });
    expect(r.warnings.some(w => w.includes("fficiency") || w.includes("heat"))).toBe(true);
  });
});
