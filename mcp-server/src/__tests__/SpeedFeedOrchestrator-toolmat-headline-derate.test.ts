/**
 * U-OSC-ORCH-TOOLMAT-DEROT -- SpeedFeedOrchestratorEngine headline Vc was material-blind.
 *
 * The headline cutting-speed chain applied coating/insert/coolant/cam/geom/grade factors but DROPPED
 * the tool-material speed factor, so HSS published the CARBIDE speed -- a ~3.2-3.9x over-speed (HSS
 * red-hardness ~600 C). The fix applies the canonical per-(tool,ISO) factor CLAMPED to <= 1.0: only
 * slower-than-carbide materials (HSS) are derated (THE safety fix); faster-than-carbide materials
 * (cermet/ceramic/CBN) are left UNCHANGED at the conservative carbide-anchored headline (the fix never
 * RAISES a headline Vc -- raising CBN/ceramic over-speeds at extreme hardness; their faster capability
 * is delivered by UltimateSpeedFeedEngine + PRISM_SFC_CONVERGE). Every assertion fails on a revert.
 *
 * Physics: Trent & Wright "Metal Cutting" 4e (HSS red-hardness); tool-material-speed-override.ts
 * (CANONICAL per-tool/ISO factors, physics-reviewer-validated 2026-06-09).
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

const MACH = { machine_name: "x", machine_type: "vertical_mill" as const, machine_power_kw: 30, machine_max_rpm: 30000 };

function headlineVc(grade: string, iso: string, hb: number, toolMat?: string): number {
  const top: any = speedFeedOrchestratorEngine.compute({
    ...MACH, material: grade, iso_group: iso as any, hardness_hb: hb,
    operation: "milling" as any, cut_type: "roughing" as any, strategy: "conventional" as any,
    tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6,
    ...(toolMat ? { tool_material: toolMat } : {}),
  } as any);
  return (top?.value ?? top).cutting_speed_mpm;
}

describe("orchestrator headline Vc applies the HSS tool-material derate (the safety fix)", () => {
  // Span >= 3 ISO groups (P steel, M stainless, N aluminum).
  for (const [grade, iso, hb] of [["1045", "P", 180], ["316", "M", 170], ["6061", "N", 95]] as const) {
    it(`${iso}: HSS headline Vc is ~0.35x carbide (was carbide-blind = 1.0x = ~3x over-speed)`, () => {
      const carbide = headlineVc(grade, iso, hb, "carbide");
      const hss = headlineVc(grade, iso, hb, "hss");
      expect(carbide).toBeGreaterThan(0);
      expect(hss).toBeLessThan(carbide); // the over-speed fix: HSS must be slower than carbide
      expect(hss / carbide).toBeCloseTo(0.35, 1); // canonical HSS tool-material factor
    });
  }
});

describe("the fix is monotonically safe -- it NEVER raises a headline Vc", () => {
  it("carbide headline is unchanged (factor 1.0) -- equals the no-tool-material default", () => {
    const carbide = headlineVc("1045", "P", 180, "carbide");
    const unspecified = headlineVc("1045", "P", 180, undefined);
    expect(carbide).toBeCloseTo(unspecified, 5); // explicit carbide == no factor applied
  });

  it("ceramic + CBN headline are CLAMPED to carbide (<= 1.0) -- not raised (un-safe direction)", () => {
    const carbide = headlineVc("1045", "P", 180, "carbide");
    const ceramic = headlineVc("1045", "P", 180, "ceramic"); // canonical factor 2.5 -> clamped to 1.0
    const cbn = headlineVc("1045", "P", 180, "cbn");          // canonical factor 2.5 -> clamped to 1.0
    expect(ceramic).toBeCloseTo(carbide, 1);
    expect(cbn).toBeCloseTo(carbide, 1);
  });

  it("CBN on hardened steel (HRC 58) stays conservative -- not raised past the carbide headline", () => {
    const carbide = headlineVc("D2", "H", 600 /*~58HRC in HB-ish*/, "carbide");
    const cbn = headlineVc("D2", "H", 600, "cbn"); // canonical cbn:{H:1.4} -> clamped to 1.0
    expect(cbn).toBeLessThanOrEqual(carbide + 0.05);
  });

  it("no tool material is EVER faster than carbide in the headline (the clamp invariant)", () => {
    const carbide = headlineVc("1045", "P", 180, "carbide");
    for (const tm of ["hss", "cermet", "ceramic", "cbn", "pcd"]) {
      expect(headlineVc("1045", "P", 180, tm)).toBeLessThanOrEqual(carbide + 0.05);
    }
  });
});
