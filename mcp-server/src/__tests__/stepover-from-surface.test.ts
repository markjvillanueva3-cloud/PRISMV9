/**
 * StepoverOptimizationEngine.optimizeFromSurface -- CURVATURE-SOURCE WIRING (U-CURVATURE-WIRE).
 *
 * Proves the previously-dormant chain: CutterContactEngine.evaluateSurface (real geometric
 * principal curvatures) -> StepoverOptimizationEngine per-point kappa2 -> curvature-adaptive
 * stepover. Before this wiring the optimizer's per-point kappa2 could only be hand-supplied.
 *
 * Reference values are derived from FIRST PRINCIPLES in each test (never magic numbers):
 *   effR = 1/(1/R_tool - kappa_cross);  ae = 2*sqrt(2*effR*h)   [Choi & Jerard, 1998]
 * so a test fails if the geometry->curvature->stepover path is broken anywhere.
 */
import { describe, it, expect, vi } from "vitest";
import { stepoverOptimizationEngine } from "../engines/StepoverOptimizationEngine.js";
import { registerMachineSetupDispatcher } from "../tools/dispatchers/machineSetupDispatcher.js";

const BALL = { type: "ball" as const, diameter_mm: 6 }; // toolR = 3 mm
const TOOL_R = 3;
const H = 0.01; // target scallop (mm)
const ORIGIN = { x: 0, y: 0, z: 0 };
const Z_AXIS = { x: 0, y: 0, z: 1 };

/** ae = 2*sqrt(2*effR*h), effR = 1/(1/R_tool - kappaCross) -- the flat case is kappaCross=0. */
function expectedStepover(kappaCross: number): number {
  const effR = Math.abs(kappaCross) < 1e-10 ? TOOL_R : 1 / (1 / TOOL_R - kappaCross);
  return 2 * Math.sqrt(2 * effR * H);
}

describe("StepoverOptimizationEngine.optimizeFromSurface (curvature-source wiring)", () => {
  it("flat plane (kappa=0): reproduces the flat-surface stepover, curvature sampled as 0", () => {
    const r = stepoverOptimizationEngine.optimizeFromSurface({
      surface: { type: "plane", origin: ORIGIN, axis: Z_AXIS },
      cutter: BALL,
      target_scallop_mm: H,
      sample_uv: [{ u: 0.3, v: 0.7 }],
    });
    expect(r.cross_feed_source).toBe("kappa2");
    expect(r.sampled_points).toHaveLength(1);
    expect(r.sampled_points[0].kappa2).toBe(0);
    expect(r.sampled_points[0].cross_feed_kappa).toBe(0);
    expect(r.stepovers_mm[0]).toBeCloseTo(expectedStepover(0), 6); // 2*sqrt(2*3*0.01)
    // Achieved scallop is the EXACT cusp for the parabolic-approx stepover (ae=2*sqrt(2*R*h)),
    // so it sits ~0.17% above target (0.010017 vs 0.01) -- inside the compliance band, not exact.
    expect(r.scallop_heights_mm[0]).toBeCloseTo(H, 4);
    expect(r.scallop_heights_mm[0]).toBeLessThanOrEqual(H * 1.05);
  });

  it("sphere: real kappa2 = 1/R flows from geometry -> larger effective radius -> larger stepover than flat", () => {
    const R = 25;
    const r = stepoverOptimizationEngine.optimizeFromSurface({
      surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS, radius_mm: R },
      cutter: BALL,
      target_scallop_mm: H,
      sample_uv: [{ u: 0.5, v: 0.25 }],
    });
    // evaluateSurface(sphere) -> kappa1 = kappa2 = 1/R, so the optimizer must have received 1/25
    expect(r.sampled_points[0].kappa2).toBeCloseTo(1 / R, 10);
    const flat = expectedStepover(0);
    expect(r.stepovers_mm[0]).toBeGreaterThan(flat); // convex curvature widens stepover
    expect(r.stepovers_mm[0]).toBeCloseTo(expectedStepover(1 / R), 6);
  });

  it("torus: kappa2 VARIES with v -> per-point adaptive stepover driven by real geometry", () => {
    // torus evaluateSurface: kappa2 = cos(phi)/(majorR + minorR*cos(phi)), phi = v*2*pi.
    const majorR = 40, minorR = 10;
    const surface = { type: "torus" as const, origin: ORIGIN, axis: Z_AXIS, radius_mm: majorR, radius2_mm: minorR };
    // v=0 (phi=0): kappa2 = 1/(40+10) = +0.02 (convex)
    // v=0.25 (phi=pi/2): kappa2 = 0 (flat cross-section)
    // v=0.5 (phi=pi): kappa2 = -1/(40-10) = -1/30 (concave)
    const r = stepoverOptimizationEngine.optimizeFromSurface({
      surface,
      cutter: BALL,
      target_scallop_mm: H,
      sample_uv: [{ u: 0, v: 0 }, { u: 0, v: 0.25 }, { u: 0, v: 0.5 }],
    });
    expect(r.sampled_points[0].kappa2).toBeCloseTo(1 / 50, 10);
    expect(r.sampled_points[1].kappa2).toBeCloseTo(0, 10);
    expect(r.sampled_points[2].kappa2).toBeCloseTo(-1 / 30, 10);
    // Each stepover must equal the first-principles value for its OWN sampled curvature
    expect(r.stepovers_mm[0]).toBeCloseTo(expectedStepover(1 / 50), 6);
    expect(r.stepovers_mm[1]).toBeCloseTo(expectedStepover(0), 6);
    expect(r.stepovers_mm[2]).toBeCloseTo(expectedStepover(-1 / 30), 6);
    // Adaptive: convex > flat > concave (the whole point of curvature-adaptive stepover)
    expect(r.stepovers_mm[0]).toBeGreaterThan(r.stepovers_mm[1]);
    expect(r.stepovers_mm[1]).toBeGreaterThan(r.stepovers_mm[2]);
  });

  it('cross_feed_curvature="kappa1" selects the other principal (cylinder: kappa1=1/R, kappa2=0)', () => {
    const R = 20;
    const surface = { type: "cylinder" as const, origin: ORIGIN, axis: Z_AXIS, radius_mm: R };
    const withKappa2 = stepoverOptimizationEngine.optimizeFromSurface({ surface, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.25, v: 0.5 }] });
    const withKappa1 = stepoverOptimizationEngine.optimizeFromSurface({ surface, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.25, v: 0.5 }], cross_feed_curvature: "kappa1" });
    // cylinder: kappa2=0 (default -> flat stepover), kappa1=1/R (selecting it widens the stepover)
    expect(withKappa2.cross_feed_source).toBe("kappa2");
    expect(withKappa2.stepovers_mm[0]).toBeCloseTo(expectedStepover(0), 6);
    expect(withKappa1.cross_feed_source).toBe("kappa1");
    expect(withKappa1.sampled_points[0].cross_feed_kappa).toBeCloseTo(1 / R, 10);
    expect(withKappa1.stepovers_mm[0]).toBeCloseTo(expectedStepover(1 / R), 6);
    expect(withKappa1.stepovers_mm[0]).toBeGreaterThan(withKappa2.stepovers_mm[0]);
  });

  it("surface_angle_deg is reported as provenance only, NOT fed into the optimizer", () => {
    // Z-axis cylinder: normal is radial -> normal.z=0 -> surface_angle_deg = 90 (provenance).
    const cyl = stepoverOptimizationEngine.optimizeFromSurface({
      surface: { type: "cylinder", origin: ORIGIN, axis: Z_AXIS, radius_mm: 20 }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.1, v: 0.5 }],
    });
    expect(cyl.sampled_points[0].surface_angle_deg).toBeCloseTo(90, 6);
    // Z-axis plane: normal is +Z -> surface_angle_deg = 0 (provenance only). The bridge deliberately
    // does NOT feed surface_angle into optimizeStepover -- that engine's steep-wall branch is inverted
    // vs its own label (reduces on flat floors, not steep walls); a pre-existing latent bug flagged
    // separately, not wired here. So the stepover is the pure curvature result, un-halved.
    const plane = stepoverOptimizationEngine.optimizeFromSurface({ surface: { type: "plane", origin: ORIGIN, axis: Z_AXIS }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.2, v: 0.2 }] });
    expect(plane.sampled_points[0].surface_angle_deg).toBeCloseTo(0, 6);
    expect(plane.stepovers_mm[0]).toBeCloseTo(expectedStepover(0), 6); // NOT halved -- angle not fed
  });

  it("throws (fail-loud) on invalid inputs -- no silent flat/NaN escape", () => {
    const good = { surface: { type: "sphere" as const, origin: ORIGIN, axis: Z_AXIS, radius_mm: 25 }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.5, v: 0.5 }] };
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, target_scallop_mm: 0 })).toThrow(/target_scallop_mm/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, sample_uv: [] })).toThrow(/sample_uv/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "blob" as any, origin: ORIGIN, axis: Z_AXIS } })).toThrow(/unknown surface\.type/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, sample_uv: [{ u: Number.NaN, v: 0 }] })).toThrow(/finite/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, cross_feed_curvature: "kappa9" as any })).toThrow(/cross_feed_curvature/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "sphere", origin: { x: 0, y: 0, z: Number.NaN }, axis: Z_AXIS, radius_mm: 25 } })).toThrow(/finite/);
    // Curved surface missing its radius -> evaluateSurface would silently default it -> throw instead.
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS } })).toThrow(/radius_mm/);
    // radius 0 is NOT nullish (would give kappa=Infinity, not the default) -> must still throw.
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS, radius_mm: 0 } })).toThrow(/radius_mm/);
    // torus missing its minor radius; cone missing its half-angle.
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "torus", origin: ORIGIN, axis: Z_AXIS, radius_mm: 40 } })).toThrow(/radius2_mm/);
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "cone", origin: ORIGIN, axis: Z_AXIS, radius_mm: 30 } })).toThrow(/half_angle_deg/);
    // Degenerate zero axis -> would silently normalize to +Z inside evaluateSurface -> throw.
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "sphere", origin: ORIGIN, axis: { x: 0, y: 0, z: 0 }, radius_mm: 25 } })).toThrow(/axis/);
    // Self-intersecting torus (minor >= major) has singular cross-feed curvature -> reject upfront.
    expect(() => stepoverOptimizationEngine.optimizeFromSurface({ ...good, surface: { type: "torus", origin: ORIGIN, axis: Z_AXIS, radius_mm: 10, radius2_mm: 20 } })).toThrow(/major|self-intersecting/);
  });

  it("warns (does not silently saturate) when the cutter cannot follow a convex feature", () => {
    // sphere radius 2 mm, ball radius 3 mm: kappa2 = 1/2 = 0.5 >= 1/toolR = 1/3 -> tool too big.
    const r = stepoverOptimizationEngine.optimizeFromSurface({
      surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS, radius_mm: 2 }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.5, v: 0.5 }],
    });
    expect(r.sampled_points[0].kappa2).toBeCloseTo(0.5, 10);
    expect(r.warnings.some((w) => /cannot follow convex feature/i.test(w))).toBe(true);
    // effective radius saturates -> stepover clamps to the max (75% of a 6 mm cutter = 4.5 mm).
    expect(r.stepovers_mm[0]).toBeCloseTo(4.5, 6);
  });

  it("round-trips through prism_machine_setup:stepover_optimize_from_surface (R15 dispatcher wiring)", async () => {
    const mockTool = vi.fn();
    registerMachineSetupDispatcher({ tool: mockTool } as any);
    const handler = mockTool.mock.calls[0][3] as (a: { action: string; params?: any }) => Promise<any>;

    // action must be registered in the enum
    const actionEnum = (mockTool.mock.calls[0][2].action._def?.values ?? mockTool.mock.calls[0][2].action.options ?? []) as string[];
    expect(actionEnum).toContain("stepover_optimize_from_surface");

    const R = 25;
    const ok = await handler({
      action: "stepover_optimize_from_surface",
      params: { surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS, radius_mm: R }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0.5, v: 0.25 }] },
    });
    const data = JSON.parse(ok.content[0].text);
    expect(data.cross_feed_source).toBe("kappa2");
    expect(data.avg_stepover_mm).toBeCloseTo(expectedStepover(1 / R), 5); // curvature flowed through the dispatcher
    expect(data.avg_stepover_mm).toBeGreaterThan(expectedStepover(0));

    // Invalid surface.type is rejected by the schema -> no successful stepover result comes back.
    const bad = await handler({
      action: "stepover_optimize_from_surface",
      params: { surface: { type: "blob", origin: ORIGIN, axis: Z_AXIS }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0, v: 0 }] },
    });
    const badData = JSON.parse(bad.content[0].text);
    expect(badData.cross_feed_source).toBeUndefined();

    // Missing radius on a curved surface: the engine throws -> the dispatcher returns a loud error
    // (via its catch -> dispatcherError), not a fabricated stepover result.
    const noRadius = await handler({
      action: "stepover_optimize_from_surface",
      params: { surface: { type: "sphere", origin: ORIGIN, axis: Z_AXIS }, cutter: BALL, target_scallop_mm: H, sample_uv: [{ u: 0, v: 0 }] },
    });
    const noRadiusData = JSON.parse(noRadius.content[0].text);
    expect(noRadiusData.cross_feed_source).toBeUndefined();
    // Positively lock the loud-error contract: dispatcherError surfaces success:false + the message.
    expect(noRadiusData.success).toBe(false);
    expect(noRadiusData.error).toMatch(/radius_mm/i);
  });
});
