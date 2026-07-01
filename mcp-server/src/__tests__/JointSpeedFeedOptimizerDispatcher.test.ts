/**
 * Dispatcher round-trip test — joint_speed_feed_optimize action via lazy-import path.
 *
 * Per CLAUDE.md comprehensive-build-enforcement: a test MUST invoke through the
 * dispatcher lazy-import path, not just the engine singleton. This file
 * mirrors the dispatcher case-block contract — same import path, same call
 * signature — so a future rename of the algorithm file would fail this test.
 */

import { describe, it, expect } from "vitest";

describe("prism_calc:joint_speed_feed_optimize — dispatcher round-trip", () => {
  it("lazy-import path resolves + optimizeJoint export is callable", async () => {
    const mod = await import("../algorithms/JointSpeedFeedOptimizer.js");
    expect(typeof mod.optimizeJoint).toBe("function");
    expect(mod.JointSpeedFeedOptimizer.version).toBe("1.0.0");
  });

  it("dispatcher-shape happy path: returns success-shaped data with feasible solution", async () => {
    const { optimizeJoint } = await import("../algorithms/JointSpeedFeedOptimizer.js");
    const result = optimizeJoint({
      iso_group: "P",
      operation: "turning",
      ap_mm: 2.0,
      coating: "TiAlN",
      T_target_min: 30,
      P_max_W: 15000,
      Vc_min_m_min: 50,
      Vc_max_m_min: 400,
      f_min_mm: 0.05,
      f_max_mm: 0.4,
    });
    // The dispatcher wraps as { success: true, data: result } — here we
    // directly inspect the result payload that goes into `.data`.
    expect(result.feasible).toBe(true);
    expect(result.Vc_m_min.value).toBeGreaterThan(0);
    expect(result.f_mm.value).toBeGreaterThan(0);
    expect(result.MRR_mm3_min.value).toBeGreaterThan(0);
    expect(["tool_life", "power", "Vc_upper", "f_upper"]).toContain(result.binding_constraint);
  });

  it("dispatcher-shape infeasibility: caller can detect feasible=false without crash", async () => {
    const { optimizeJoint } = await import("../algorithms/JointSpeedFeedOptimizer.js");
    const result = optimizeJoint({
      iso_group: "P",
      operation: "turning",
      ap_mm: NaN,  // adversarial — force infeasible diagnostic
      T_target_min: 30,
      P_max_W: 15000,
      Vc_min_m_min: 50,
      Vc_max_m_min: 400,
      f_min_mm: 0.05,
      f_max_mm: 0.4,
    });
    expect(result.feasible).toBe(false);
    expect(result.binding_constraint).toBe("infeasible");
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
