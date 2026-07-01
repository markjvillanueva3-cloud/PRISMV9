/**
 * CAMIntegrationEngine cycle-time estimate guard (slot:bravo 2026-06-19, ENGINE-AUDIT cost-sweep).
 *
 * `calculateRecommendation` hardcoded `estimatedVolume = 50 cm^3`, fabricating the returned
 * estimated_cycle_time_min. Fix: a documented DEFAULT_REMOVED_VOLUME_CM3 constant + an optional real
 * `op.parameters.material_volume_cm3`. cycle_time = volume/mrr, so a larger real removal volume
 * yields a longer cycle time. Round-tripped through the public camIntegration("cam_recommend") fn.
 */
import { describe, it, expect } from "vitest";

import { camIntegration } from "../engines/CAMIntegrationEngine.js";

function op(extraParams: Record<string, number> = {}) {
  return {
    id: "op1",
    name: "Rough pocket",
    type: "roughing",
    tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
    material: "4140 steel",
    parameters: { speed_rpm: 3000, feed_mmmin: 800, axial_depth_mm: 5, radial_depth_mm: 6, ...extraParams },
  };
}

function cycleTimeOf(operation: ReturnType<typeof op>): number {
  const res = camIntegration("cam_recommend", { operations: [operation] });
  return res.recommendations[0].estimated_cycle_time_min;
}

describe("CAMIntegrationEngine cycle-time volume fix", () => {
  it("a larger supplied removal volume yields a longer cycle time (the real value drives it)", () => {
    const small = cycleTimeOf(op({ material_volume_cm3: 50 }));
    const large = cycleTimeOf(op({ material_volume_cm3: 200 }));
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(small);
  });

  it("cycle time scales linearly with the supplied volume (200 vs 50 -> ~4x at fixed MRR)", () => {
    const v50 = cycleTimeOf(op({ material_volume_cm3: 50 }));
    const v200 = cycleTimeOf(op({ material_volume_cm3: 200 }));
    // MRR is fixed by feed/ap/ae (unchanged), so cycle_time is linear in volume. Rounded to 0.1 min.
    expect(v200).toBeCloseTo(4 * v50, 0);
  });

  it("omitting material_volume_cm3 uses the documented default (== explicit 50 cm^3)", () => {
    const def = cycleTimeOf(op());
    const fifty = cycleTimeOf(op({ material_volume_cm3: 50 }));
    expect(def).toBeCloseTo(fifty, 4);
  });

  it("a non-positive volume falls back to the default (no negative/NaN cycle time)", () => {
    const def = cycleTimeOf(op());
    for (const bad of [0, -10]) {
      const r = cycleTimeOf(op({ material_volume_cm3: bad }));
      expect(r).toBeCloseTo(def, 4);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
    }
  });
});
