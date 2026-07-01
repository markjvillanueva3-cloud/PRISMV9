/**
 * SpeedFeedOrchestratorEngine TURNING workpiece-diameter fix (U-SFC-ORCH-TURNING, slot:oscar 2026-06-21).
 *
 * Encodes the turning-physics INTENT the orchestrator previously violated: for lathe operations the
 * surface speed Vc is set by the WORKPIECE outer diameter, so rpm = 1000*Vc/(pi*D_workpiece). The
 * orchestrator used the TOOL diameter for the rpm/Vc relationship (the milling-centric core-physics
 * step), collapsing turning Vc to ~1-2 m/min -- a P0 live bug (reference_oscar_orchestrator_turning_broken_2026_06_21).
 * The fix introduces `rpmDiameter` = workpiece_diameter_mm for lathe ops in the 6 in-compute rpm/Vc
 * conversion sites.
 *
 * WHY this test exists (R9): the prior orchestrator turning tests
 * (speed-feed-orchestrator-dedicated.test.ts:112-150) set tool_diameter_mm but NO workpiece_diameter_mm
 * and asserted only relative behavior (cache/clamp/safety) -- never the absolute turning Vc -- so a 60x
 * Vc error passed CI. These asserts FAIL if the bug returns (turning Vc collapses or rpm decouples from
 * the workpiece diameter).
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

const compute = (input: Record<string, unknown>) => {
  const r = speedFeedOrchestratorEngine.compute(input as never) as unknown as { value?: Record<string, number> } & Record<string, number>;
  return (r.value ?? r) as Record<string, number>;
};
const turn = (material: string, iso_group: string, workpiece_diameter_mm: number, cut_type = "roughing") =>
  compute({ material, iso_group, operation: "turning", cut_type, workpiece_diameter_mm, tool_diameter_mm: 0.8, axial_depth_mm: 2, flutes: 1 });

describe("SpeedFeedOrchestrator turning uses the WORKPIECE diameter (U-SFC-ORCH-TURNING)", () => {
  it("turning Vc is physically plausible, NOT the collapsed ~1-2 m/min tool-diameter bug", () => {
    const r = turn("steel", "P", 50);
    // pre-fix this returned ~1.8 m/min (Vc from the 0.8mm tool nose). A real turning Vc is >10.
    expect(r.cutting_speed_mpm).toBeGreaterThan(10);
    expect(r.cutting_speed_mpm).toBeLessThan(500);
  });

  it("rpm is self-consistent with the WORKPIECE diameter: rpm == 1000*Vc/(pi*D_workpiece)", () => {
    const r = turn("steel", "P", 50);
    const expectedRpm = (1000 * r.cutting_speed_mpm) / (Math.PI * 50);
    // within 3% (rounding) -- proves Vc/rpm derive from the 50mm workpiece, not the 0.8mm tool
    expect(Math.abs(r.spindle_rpm - expectedRpm) / expectedRpm).toBeLessThan(0.03);
  });

  it("rpm drops for a larger workpiece diameter (inverse Vc=pi*D*rpm relationship)", () => {
    const small = turn("steel", "P", 40);
    const large = turn("steel", "P", 100);
    // bigger bar -> lower rpm at a comparable surface speed; pre-fix (tool-dia) both ignored the workpiece.
    expect(small.spindle_rpm).toBeGreaterThan(large.spindle_rpm);
  });

  it("a missing workpiece_diameter falls back safely (no NaN/Infinity, no throw)", () => {
    const r = compute({ material: "steel", iso_group: "P", operation: "turning", cut_type: "roughing", tool_diameter_mm: 12, flutes: 1, axial_depth_mm: 2 });
    expect(Number.isFinite(r.cutting_speed_mpm)).toBe(true);
    expect(Number.isFinite(r.spindle_rpm)).toBe(true);
    expect(r.spindle_rpm).toBeGreaterThan(0);
  });

  it("MILLING is unchanged by the turning fix (turning-scoped) — steel mill rough Vc in-band ~200", () => {
    // Re-baselined 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): prior ~80 was the deflection-Vc-collapse
    // artifact; the lever fix keeps this deflection-limited mill cut at the in-band Vc=200 (P band 110-250).
    const m = compute({ material: "steel", iso_group: "P", operation: "milling", cut_type: "roughing", tool_diameter_mm: 10, flutes: 4, axial_depth_mm: 3, radial_depth_mm: 5 });
    expect(m.cutting_speed_mpm).toBeCloseTo(200, 0);
  });
});
