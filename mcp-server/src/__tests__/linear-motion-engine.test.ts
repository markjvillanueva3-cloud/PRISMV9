/**
 * LinearMotionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B39
 */
import { describe, it, expect } from "vitest";
import { linearMotionEngine } from "../engines/LinearMotionEngine.js";

describe("LinearMotionEngine", () => {
  it("motor torque > 0 with defaults", () => {
    const r = linearMotionEngine.calculate({});
    expect(r.motor_torque.value).toBeGreaterThan(0);
  });

  it("higher thrust needs more torque", () => {
    const low = linearMotionEngine.calculate({ thrust_force_n: 100 });
    const high = linearMotionEngine.calculate({ thrust_force_n: 2000 });
    expect(high.motor_torque.value).toBeGreaterThan(low.motor_torque.value);
  });

  it("larger lead increases torque but reduces RPM", () => {
    const small = linearMotionEngine.calculate({ screw_lead_mm: 5 });
    const large = linearMotionEngine.calculate({ screw_lead_mm: 20 });
    expect(large.motor_torque.value).toBeGreaterThan(
      small.motor_torque.value
    );
    expect(large.motor_rpm.value).toBeLessThan(small.motor_rpm.value);
  });

  it("vertical orientation adds gravity force", () => {
    const horiz = linearMotionEngine.calculate({ orientation: "horizontal" });
    const vert = linearMotionEngine.calculate({ orientation: "vertical" });
    expect(vert.motor_torque.value).toBeGreaterThan(
      horiz.motor_torque.value
    );
  });

  it("critical speed > 0", () => {
    const r = linearMotionEngine.calculate({});
    expect(r.critical_speed.value).toBeGreaterThan(0);
  });

  it("buckling load > 0", () => {
    const r = linearMotionEngine.calculate({});
    expect(r.buckling_load.value).toBeGreaterThan(0);
  });

  it("fixed-fixed has higher critical speed than fixed-free", () => {
    const ff = linearMotionEngine.calculate({ mounting: "fixed_fixed" });
    const ffr = linearMotionEngine.calculate({ mounting: "fixed_free" });
    expect(ff.critical_speed.value).toBeGreaterThan(
      ffr.critical_speed.value
    );
  });

  it("screw life > 0", () => {
    const r = linearMotionEngine.calculate({});
    expect(r.screw_life_hours.value).toBeGreaterThan(0);
  });

  it("positioning time > 0", () => {
    const r = linearMotionEngine.calculate({});
    expect(r.positioning_time.value).toBeGreaterThan(0);
  });

  it("warns vertical axis brake", () => {
    const r = linearMotionEngine.calculate({ orientation: "vertical" });
    expect(r.warnings.some(w => w.includes("brake"))).toBe(true);
  });
});
