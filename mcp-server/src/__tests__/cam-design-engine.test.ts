/**
 * CamDesignEngine — Unit Tests
 * @milestone FORGE-ENGINES-B46
 */
import { describe, it, expect } from "vitest";
import { camDesignEngine } from "../engines/CamDesignEngine.js";

describe("CamDesignEngine", () => {
  it("max velocity > 0", () => {
    const r = camDesignEngine.calculate({});
    expect(r.max_velocity.value).toBeGreaterThan(0);
  });

  it("max acceleration > 0", () => {
    const r = camDesignEngine.calculate({});
    expect(r.max_acceleration.value).toBeGreaterThan(0);
  });

  it("higher RPM increases velocity", () => {
    const slow = camDesignEngine.calculate({ cam_speed_rpm: 300 });
    const fast = camDesignEngine.calculate({ cam_speed_rpm: 1200 });
    expect(fast.max_velocity.value).toBeGreaterThan(
      slow.max_velocity.value
    );
  });

  it("more lift increases velocity", () => {
    const lo = camDesignEngine.calculate({ lift_mm: 10 });
    const hi = camDesignEngine.calculate({ lift_mm: 40 });
    expect(hi.max_velocity.value).toBeGreaterThan(
      lo.max_velocity.value
    );
  });

  it("pressure angle > 0", () => {
    const r = camDesignEngine.calculate({});
    expect(r.max_pressure_angle.value).toBeGreaterThan(0);
  });

  it("larger base radius reduces pressure angle", () => {
    const small = camDesignEngine.calculate({ base_radius_mm: 20 });
    const large = camDesignEngine.calculate({ base_radius_mm: 80 });
    expect(large.max_pressure_angle.value).toBeLessThan(
      small.max_pressure_angle.value
    );
  });

  it("spring force = preload + rate × lift", () => {
    const r = camDesignEngine.calculate({
      spring_preload_n: 100,
      spring_rate_n_mm: 5,
      lift_mm: 20,
    });
    expect(r.required_spring_force.value).toBe(200);
  });

  it("follower jump speed > 0", () => {
    const r = camDesignEngine.calculate({});
    expect(r.follower_jump_speed.value).toBeGreaterThan(0);
  });

  it("cam shaft torque > 0", () => {
    const r = camDesignEngine.calculate({});
    expect(r.cam_shaft_torque.value).toBeGreaterThan(0);
  });

  it("warns high pressure angle", () => {
    const r = camDesignEngine.calculate({
      base_radius_mm: 15,
      lift_mm: 30,
      rise_angle_deg: 60,
    });
    expect(r.warnings.some(w => w.includes("ressure angle"))).toBe(true);
  });
});
