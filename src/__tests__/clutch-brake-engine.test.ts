/**
 * ClutchBrakeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B36
 */
import { describe, it, expect } from "vitest";
import { clutchBrakeEngine } from "../engines/ClutchBrakeEngine.js";

describe("ClutchBrakeEngine", () => {
  it("torque capacity > 0 with defaults", () => {
    const r = clutchBrakeEngine.calculate({});
    expect(r.torque_capacity.value).toBeGreaterThan(0);
  });

  it("more friction surfaces increase torque", () => {
    const two = clutchBrakeEngine.calculate({ num_friction_surfaces: 2 });
    const four = clutchBrakeEngine.calculate({ num_friction_surfaces: 4 });
    expect(four.torque_capacity.value).toBeGreaterThan(
      two.torque_capacity.value
    );
  });

  it("higher friction coeff increases torque", () => {
    const low = clutchBrakeEngine.calculate({ friction_coeff: 0.2 });
    const high = clutchBrakeEngine.calculate({ friction_coeff: 0.5 });
    expect(high.torque_capacity.value).toBeGreaterThan(
      low.torque_capacity.value
    );
  });

  it("larger radius increases torque", () => {
    const small = clutchBrakeEngine.calculate({
      outer_radius_mm: 100,
      inner_radius_mm: 60,
    });
    const large = clutchBrakeEngine.calculate({
      outer_radius_mm: 200,
      inner_radius_mm: 120,
    });
    expect(large.torque_capacity.value).toBeGreaterThan(
      small.torque_capacity.value
    );
  });

  it("heat generated increases with RPM", () => {
    const slow = clutchBrakeEngine.calculate({ initial_rpm: 500 });
    const fast = clutchBrakeEngine.calculate({ initial_rpm: 3000 });
    expect(fast.heat_generated.value).toBeGreaterThan(
      slow.heat_generated.value
    );
  });

  it("stopping time decreases with more torque", () => {
    const weak = clutchBrakeEngine.calculate({ friction_coeff: 0.15 });
    const strong = clutchBrakeEngine.calculate({ friction_coeff: 0.50 });
    expect(strong.stopping_time.value).toBeLessThan(weak.stopping_time.value);
  });

  it("sintered material allows higher pressure than organic", () => {
    const org = clutchBrakeEngine.calculate({ friction_material: "organic" });
    const sin = clutchBrakeEngine.calculate({ friction_material: "sintered" });
    // sintered derives higher force from higher max pressure → more torque
    expect(sin.torque_capacity.value).toBeGreaterThan(
      org.torque_capacity.value
    );
  });

  it("warns excessive contact pressure", () => {
    const r = clutchBrakeEngine.calculate({
      actuating_force_n: 50000,
      outer_radius_mm: 80,
      inner_radius_mm: 60,
      friction_material: "organic",
    });
    expect(r.warnings.some(w => w.includes("pressure"))).toBe(true);
  });

  it("wear life > 0", () => {
    const r = clutchBrakeEngine.calculate({});
    expect(r.wear_life.value).toBeGreaterThan(0);
  });

  it("mean radius between inner and outer", () => {
    const r = clutchBrakeEngine.calculate({
      outer_radius_mm: 150,
      inner_radius_mm: 80,
    });
    expect(r.mean_radius.value).toBeGreaterThan(80);
    expect(r.mean_radius.value).toBeLessThan(150);
  });
});
