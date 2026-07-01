/**
 * UltimateSpeedFeedEngine TURNING correctness guard (slot:oscar, 2026-06-21).
 *
 * Encodes the turning-physics INTENT that the production orchestrator VIOLATES
 * (reference_oscar_orchestrator_turning_broken_2026_06_21): for turning, cutting speed Vc is set
 * by the WORKPIECE diameter, so spindle rpm = 1000*Vc/(pi*D_workpiece) and MUST scale INVERSELY
 * with the workpiece diameter at a fixed Vc. SpeedFeedOrchestratorEngine computes rpm/Vc from the
 * TOOL diameter (SpeedFeedOrchestratorEngine.ts:2574) -> turning Vc collapses to ~1-2 m/min.
 *
 * WHY this test exists (R9): the existing orchestrator turning tests
 * (speed-feed-orchestrator-dedicated.test.ts:112-150) only assert RELATIVE behavior (cache
 * monotonicity, rpm clamp, safety-pass) -- never that the turning Vc is physically correct from
 * the workpiece diameter -- so a 60x Vc error passed CI. This guards the convergence TARGET
 * (UltimateSpeedFeedEngine, which IS correct) so its turning support cannot silently regress.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const turn = (dia: number, cut: "roughing" | "finishing" = "roughing") =>
  ultimateSpeedFeedEngine.calculate({
    material: "steel", iso_group: "P", operation: "turning", cut_type: cut,
    workpiece_diameter_mm: dia, tool_diameter_mm: 0.8, axial_depth_mm: 3, flutes: 1,
  } as never);

describe("UltimateSpeedFeedEngine turning correctness (workpiece-diameter Vc)", () => {
  it("computes a physically plausible turning Vc from the material (NOT a collapsed ~1-2 m/min)", () => {
    const r = turn(50);
    const vc = r.cutting_speed.value;
    // P_turning_roughing table is vc [120,185,245]; a correct result sits in a sane carbide-steel
    // turning band. The orchestrator's broken value (~1.8) would FAIL this hard.
    expect(vc).toBeGreaterThan(50);
    expect(vc).toBeLessThan(400);
  });

  it("rpm is self-consistent with the WORKPIECE diameter: rpm == 1000*Vc/(pi*D)", () => {
    const r = turn(50);
    const vc = r.cutting_speed.value;
    const rpm = r.spindle_rpm.value;
    const expectedRpm = (1000 * vc) / (Math.PI * 50);
    // within 2% (rounding / gear snapping) -- proves Vc is derived from the 50mm workpiece, not the 0.8mm tool
    expect(Math.abs(rpm - expectedRpm) / expectedRpm).toBeLessThan(0.02);
  });

  it("rpm scales INVERSELY with workpiece diameter at a fixed material Vc (the turning intent)", () => {
    const r50 = turn(50);
    const r100 = turn(100);
    // same material/op -> same target Vc; doubling the workpiece diameter halves the rpm.
    expect(r50.cutting_speed.value).toBeCloseTo(r100.cutting_speed.value, 1);
    const ratio = r50.spindle_rpm.value / r100.spindle_rpm.value;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it("does NOT collapse Vc when the tool_diameter is tiny (the orchestrator's failure mode)", () => {
    // a 0.4mm nose on a 30mm part: a tool-diameter-driven calc would collapse Vc; the engine must not.
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum", iso_group: "N", operation: "turning", cut_type: "finishing",
      workpiece_diameter_mm: 30, tool_diameter_mm: 0.4, axial_depth_mm: 0.5, flutes: 1,
    } as never);
    expect(r.cutting_speed.value).toBeGreaterThan(100); // aluminum turning Vc is high, never ~1 m/min
  });
});
