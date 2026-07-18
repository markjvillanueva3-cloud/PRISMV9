/**
 * GrindingSurfaceFinishEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { grindingSurfaceFinishEngine } from "../engines/GrindingSurfaceFinishEngine.js";

describe("GrindingSurfaceFinishEngine", () => {
  const base = {
    wheel_diameter_mm: 200,
    wheel_speed_m_s: 30,
    work_speed_m_min: 15,
    depth_of_cut_mm: 0.02,
    width_of_cut_mm: 20,
    grinding_mode: "surface" as const,
  };

  it("predicted Ra > 0", () => {
    const r = grindingSurfaceFinishEngine.calculate(base);
    expect(r.predicted_Ra_um.value).toBeGreaterThan(0);
  });

  it("predicted Rz > Ra", () => {
    const r = grindingSurfaceFinishEngine.calculate(base);
    expect(r.predicted_Rz_um.value).toBeGreaterThan(
      r.predicted_Ra_um.value
    );
  });

  it("kinematic roughness > 0", () => {
    const r = grindingSurfaceFinishEngine.calculate(base);
    expect(r.kinematic_roughness_um.value).toBeGreaterThan(0);
  });

  it("slower work speed gives better finish", () => {
    const fast = grindingSurfaceFinishEngine.calculate({ ...base, work_speed_m_min: 30 });
    const slow = grindingSurfaceFinishEngine.calculate({ ...base, work_speed_m_min: 5 });
    expect(slow.predicted_Ra_um.value).toBeLessThan(
      fast.predicted_Ra_um.value
    );
  });

  it("recommendations is array", () => {
    const r = grindingSurfaceFinishEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(r.recommendations.some((rec) => rec.includes("[Playbook"))).toBe(true);
  });
});
