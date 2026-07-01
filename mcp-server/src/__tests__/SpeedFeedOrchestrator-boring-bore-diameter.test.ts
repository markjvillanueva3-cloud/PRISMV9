/**
 * SpeedFeedOrchestrator BORING bore-diameter fix (U-SFC-ORCH-BORE-DIAMETER, slot:oscar 2026-06-21).
 *
 * For boring, the surface speed Vc is set by the BORE diameter (the hole being enlarged), so
 * rpm = 1000*Vc/(pi*D_bore). The orchestrator previously used the workpiece OD for boring (the
 * CAVEAT left by U-SFC-ORCH-TURNING). This follow-on adds an optional bore_diameter_mm input and
 * uses it for boring ops, falling back to the workpiece OD (then the tool D) when absent.
 *
 * ADDITIVE: with NO bore_diameter_mm the result is byte-identical to the prior behavior (workpiece-OD
 * fallback) -- so existing callers are unchanged; the new input only takes effect when provided.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

const compute = (input: Record<string, unknown>) => {
  const r = speedFeedOrchestratorEngine.compute(input as never) as unknown as {
    value?: Record<string, number>;
  } & Record<string, number>;
  return (r.value ?? r) as Record<string, number>;
};
const bore = (overrides: Record<string, unknown>) =>
  compute({
    material: "steel",
    iso_group: "P",
    operation: "boring",
    cut_type: "roughing",
    tool_diameter_mm: 10,
    flutes: 1,
    axial_depth_mm: 1,
    ...overrides,
  });

describe("SpeedFeedOrchestrator boring uses the BORE diameter (U-SFC-ORCH-BORE-DIAMETER)", () => {
  it("boring rpm is computed from bore_diameter_mm: rpm == 1000*Vc/(pi*D_bore)", () => {
    const r = bore({ bore_diameter_mm: 30, workpiece_diameter_mm: 80 });
    const expectedRpm = (1000 * r.cutting_speed_mpm) / (Math.PI * 30);
    // within 3% (rounding) -- proves rpm derives from the 30mm bore, not the 80mm OD or 10mm tool
    expect(Math.abs(r.spindle_rpm - expectedRpm) / expectedRpm).toBeLessThan(0.03);
  });

  it("boring falls back to the workpiece OD when no bore diameter is given (prior behavior, unchanged)", () => {
    const r = bore({ workpiece_diameter_mm: 60 });
    const expectedRpm = (1000 * r.cutting_speed_mpm) / (Math.PI * 60);
    expect(Math.abs(r.spindle_rpm - expectedRpm) / expectedRpm).toBeLessThan(0.03);
  });

  it("a smaller bore yields a higher rpm than the workpiece-OD fallback (the bore drives rpm)", () => {
    const small = bore({ bore_diameter_mm: 30, workpiece_diameter_mm: 80 });
    const odFallback = bore({ workpiece_diameter_mm: 80 });
    expect(small.spindle_rpm).toBeGreaterThan(odFallback.spindle_rpm);
  });

  it("bore_diameter_mm is ignored for non-boring ops (turning still uses the workpiece OD)", () => {
    const turn = compute({
      material: "steel",
      iso_group: "P",
      operation: "turning",
      cut_type: "roughing",
      tool_diameter_mm: 0.8,
      flutes: 1,
      axial_depth_mm: 2,
      workpiece_diameter_mm: 50,
      bore_diameter_mm: 10,
    });
    const expectedRpm = (1000 * turn.cutting_speed_mpm) / (Math.PI * 50);
    expect(Math.abs(turn.spindle_rpm - expectedRpm) / expectedRpm).toBeLessThan(0.03);
  });

  it("boring Vc is physically plausible, not the collapsed ~1-2 m/min tool-diameter bug", () => {
    const r = bore({ bore_diameter_mm: 30 });
    expect(r.cutting_speed_mpm).toBeGreaterThan(10);
    expect(r.cutting_speed_mpm).toBeLessThan(500);
  });
});
