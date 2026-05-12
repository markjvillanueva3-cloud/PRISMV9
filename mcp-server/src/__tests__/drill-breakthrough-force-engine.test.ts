/**
 * DrillBreakthroughForceEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { drillBreakthroughForceEngine } from "../engines/DrillBreakthroughForceEngine.js";

describe("DrillBreakthroughForceEngine", () => {
  const base = {
    drill_diameter_mm: 10,
    point_angle_deg: 118,
    feed_mm_rev: 0.15,
    spindle_rpm: 2000,
    workpiece_thickness_mm: 20,
    is_through_hole: true,
  };

  it("steady state thrust > 0", () => {
    const r = drillBreakthroughForceEngine.calculate(base);
    expect(r.steady_state_thrust_N.value).toBeGreaterThan(0);
  });

  it("steady state torque > 0", () => {
    const r = drillBreakthroughForceEngine.calculate(base);
    expect(r.steady_state_torque_Nm.value).toBeGreaterThan(0);
  });

  it("peak breakthrough thrust > 0", () => {
    const r = drillBreakthroughForceEngine.calculate(base);
    expect(r.peak_breakthrough_thrust_N.value).toBeGreaterThan(0);
  });

  it("larger drill increases thrust", () => {
    const small = drillBreakthroughForceEngine.calculate({ ...base, drill_diameter_mm: 5 });
    const large = drillBreakthroughForceEngine.calculate({ ...base, drill_diameter_mm: 20 });
    expect(large.steady_state_thrust_N.value).toBeGreaterThan(
      small.steady_state_thrust_N.value
    );
  });

  it("recommended exit feed > 0", () => {
    const r = drillBreakthroughForceEngine.calculate(base);
    expect(r.recommended_exit_feed_mm_rev.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = drillBreakthroughForceEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
