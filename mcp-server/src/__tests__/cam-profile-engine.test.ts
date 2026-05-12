/**
 * CamProfileEngine — Unit Tests
 * @milestone FORGE-ENGINES-B32
 */
import { describe, it, expect } from "vitest";
import { camProfileEngine } from "../engines/CamProfileEngine.js";

describe("CamProfileEngine", () => {
  it("cycloidal has finite jerk", () => {
    const r = camProfileEngine.calculate({ motion_type: "cycloidal" });
    expect(r.max_jerk.value).toBeGreaterThan(0);
  });

  it("harmonic has infinite jerk (coded as -1)", () => {
    const r = camProfileEngine.calculate({ motion_type: "harmonic" });
    expect(r.max_jerk.value).toBe(-1);
    expect(r.max_jerk.unit).toBe("∞");
  });

  it("higher RPM increases velocity and acceleration", () => {
    const slow = camProfileEngine.calculate({ cam_rpm: 300 });
    const fast = camProfileEngine.calculate({ cam_rpm: 1200 });
    expect(fast.max_velocity.value).toBeGreaterThan(slow.max_velocity.value);
    expect(fast.max_acceleration.value).toBeGreaterThan(slow.max_acceleration.value);
  });

  it("larger base circle reduces pressure angle", () => {
    const small = camProfileEngine.calculate({ base_circle_mm: 30 });
    const large = camProfileEngine.calculate({ base_circle_mm: 100 });
    expect(large.max_pressure_angle.value).toBeLessThan(
      small.max_pressure_angle.value
    );
  });

  it("warns pressure angle > 30°", () => {
    const r = camProfileEngine.calculate({
      lift_mm: 30,
      base_circle_mm: 20,
      rise_angle_deg: 60,
    });
    expect(r.warnings.some(w => w.includes("30°"))).toBe(true);
  });

  it("more lift increases velocity", () => {
    const low = camProfileEngine.calculate({ lift_mm: 5 });
    const high = camProfileEngine.calculate({ lift_mm: 30 });
    expect(high.max_velocity.value).toBeGreaterThan(low.max_velocity.value);
  });

  it("contact stress > 0", () => {
    const r = camProfileEngine.calculate({});
    expect(r.max_contact_stress.value).toBeGreaterThan(0);
  });

  it("cycloidal gets higher motion quality than harmonic", () => {
    const cyc = camProfileEngine.calculate({ motion_type: "cycloidal" });
    const har = camProfileEngine.calculate({ motion_type: "harmonic" });
    expect(cyc.motion_quality.value).toBeGreaterThanOrEqual(
      har.motion_quality.value
    );
  });

  it("required spring force > 0", () => {
    const r = camProfileEngine.calculate({ follower_mass_kg: 2 });
    expect(r.required_spring_force.value).toBeGreaterThan(0);
  });

  it("feasible with reasonable parameters", () => {
    const r = camProfileEngine.calculate({
      lift_mm: 10,
      base_circle_mm: 60,
      rise_angle_deg: 120,
    });
    expect(r.cam_feasible.unit).toBe("PASS");
  });
});
