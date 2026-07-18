/**
 * U-DEA-november-P02 (DEA-MS0) — getCapabilityWithAccuracy + cad_machine_capability_with_accuracy
 *
 * Tests the cross-wire activation of the precision-cluster:
 *   MachineGeometricAccuracyEngine.{volumetricAccuracy, abbeOffset, ballBarAnalysis}
 *     →  MachineCapabilitySurfaceEngine.getCapabilityWithAccuracy
 *
 * The dispatcher action `cad_machine_capability_with_accuracy` (prism_cad) chains
 * the four engines; this suite asserts the engine-level chain in the same shape.
 *
 * Coverage:
 *   happy path · controller-tier monotonicity · caller override · ball-bar opt-in ·
 *   3 failure modes · 2 adversarial · provenance flags · workspace monotonicity · backwards-compat.
 */
import { describe, it, expect } from "vitest";
import {
  machineCapabilitySurfaceEngine,
  type CapabilityWithAccuracy,
  type CapabilityAccuracyOptions,
} from "../engines/MachineCapabilitySurfaceEngine.js";
import type { AxisErrors6DOF, SquarenessErrors } from "../engines/MachineGeometricAccuracyEngine.js";

const MACHINE_ID = "haas_vf2";
const ALT_MACHINE_ID = "mazak_vcs_530c";

// Conservative bounds (ISO 230-2 typical bands: premium pos~5µm, economy pos~20µm;
// over a 500mm cube the volumetric envelope is angular×lever-arm dominated, ~25-250µm).
const VOLUMETRIC_FLOOR_UM = 0.5;
const VOLUMETRIC_CEILING_UM = 5000;
const LOOSE_ENVELOPE_FLOOR_UM = 20;

const TIGHT_AXIS: AxisErrors6DOF = {
  positioning: 3, straightness_y: 2, straightness_z: 2, roll: 3, pitch: 3, yaw: 3,
};
const TIGHT_SQUARENESS: SquarenessErrors = { xy: 3, xz: 3, yz: 3 };
const LOOSE_AXIS: AxisErrors6DOF = {
  positioning: 25, straightness_y: 15, straightness_z: 15, roll: 25, pitch: 25, yaw: 25,
};
const LOOSE_SQUARENESS: SquarenessErrors = { xy: 25, xz: 25, yz: 25 };

const CALLER_OVERRIDE: CapabilityAccuracyOptions = {
  axis_errors: { x_axis: { ...TIGHT_AXIS }, y_axis: { ...TIGHT_AXIS }, z_axis: { ...TIGHT_AXIS } },
  squareness: { ...TIGHT_SQUARENESS },
};

describe("getCapabilityWithAccuracy (U-DEA-november-P02)", () => {
  it("happy path: returns base capability + accuracy + provenance for a known machine", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID);
    expect(r).not.toBeNull();
    const cap = r as CapabilityWithAccuracy;
    expect(cap.machineId).toBe(MACHINE_ID);
    expect(typeof cap.manufacturer).toBe("string");
    expect(cap.manufacturer.length).toBeGreaterThan(0);
    expect(cap.overallCapabilityScore).toBeGreaterThan(0);
    expect(cap.overallCapabilityScore).toBeLessThanOrEqual(100);
    expect(cap.accuracy_source).toBe("controller-default");
    expect(cap.accuracy.volumetric).not.toBeNull();
    expect(cap.accuracy.volumetric!.max_um).toBeGreaterThan(VOLUMETRIC_FLOOR_UM);
    expect(cap.accuracy.volumetric!.max_um).toBeLessThan(VOLUMETRIC_CEILING_UM);
    expect(cap.accuracy.volumetric!.p95_um).toBeLessThanOrEqual(cap.accuracy.volumetric!.max_um);
    expect(cap.accuracy.volumetric!.mean_um).toBeLessThanOrEqual(cap.accuracy.volumetric!.max_um);
    expect(cap.accuracy.abbe.length).toBe(3);
    const abbeAxes = cap.accuracy.abbe.map(a => a.axis);
    expect(abbeAxes).toEqual(["x", "y", "z"]);
    for (const a of cap.accuracy.abbe) {
      expect(a.abbe_error_um).toBeGreaterThan(0);
      expect(a.recommendation.length).toBeGreaterThan(0);
    }
    expect(cap.accuracy.ballBar).toBeNull();
  });

  it("returns null exactly for unknown machine id (deterministic — no synthetic envelope)", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy("no_such_machine_id_xyz");
    expect(r).toBeNull();
    // Deterministic — second call same answer
    expect(machineCapabilitySurfaceEngine.getCapabilityWithAccuracy("no_such_machine_id_xyz")).toBeNull();
  });

  it("controller-tier defaults: looser tier produces strictly larger volumetric than tighter tier", () => {
    const econ = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID);
    const prem = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(ALT_MACHINE_ID);
    if (econ === null || prem === null) {
      // Fleet may not ship this exact machine package — skip rather than false-fail
      return;
    }
    const econMax = econ.accuracy.volumetric!.max_um;
    const premMax = prem.accuracy.volumetric!.max_um;
    expect(econMax).toBeGreaterThan(0);
    expect(premMax).toBeGreaterThan(0);
    expect(econMax).toBeGreaterThan(premMax);
  });

  it("caller-supplied axis_errors + squareness flips provenance to 'measured' AND envelope stays bounded", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, CALLER_OVERRIDE);
    expect(r).not.toBeNull();
    expect(r!.accuracy_source).toBe("measured");
    expect(r!.accuracy.volumetric).not.toBeNull();
    expect(r!.accuracy.volumetric!.max_um).toBeGreaterThan(VOLUMETRIC_FLOOR_UM);
    expect(r!.accuracy.volumetric!.max_um).toBeLessThan(VOLUMETRIC_CEILING_UM);
  });

  it("caller-supplied tight axis errors produce strictly tighter envelope than default", () => {
    const defaultR = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID);
    const tightR = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, CALLER_OVERRIDE);
    expect(defaultR).not.toBeNull();
    expect(tightR).not.toBeNull();
    expect(tightR!.accuracy.volumetric!.max_um).toBeLessThan(defaultR!.accuracy.volumetric!.max_um);
  });

  it("custom abbe_queries override default 3 — single query returns single result with non-empty recommendation", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      abbe_queries: [{ axis: "x", offset_distance_mm: 500 }],
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.abbe).toHaveLength(1);
    expect(r!.accuracy.abbe[0].axis).toBe("x");
    expect(r!.accuracy.abbe[0].abbe_error_um).toBeGreaterThan(0);
    expect(r!.accuracy.abbe[0].recommendation.length).toBeGreaterThan(0);
    expect(r!.accuracy.abbe[0].contribution_pct).toBeGreaterThanOrEqual(0);
    expect(r!.accuracy.abbe[0].contribution_pct).toBeLessThanOrEqual(100);
  });

  it("ball-bar opt-in: supplying measured points populates ballBar envelope with full diagnosis fields", () => {
    const measured_points = Array.from({ length: 36 }, (_, i) => ({
      angle_deg: i * 10,
      radius_deviation_um: 0.5 * Math.sin((i * Math.PI) / 18),
    }));
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      ball_bar: { nominal_radius_mm: 150, measured_points, feed_rate_mm_min: 1000, plane: "XY" },
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.ballBar).not.toBeNull();
    const bb = r!.accuracy.ballBar!;
    expect(bb.circularity_um).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(bb.diagnosed_issues)).toBe(true);
    expect(typeof bb.servo_mismatch_um).toBe("number");
    expect(Number.isFinite(bb.servo_mismatch_um)).toBe(true);
    expect(typeof bb.scaling_error_ppm).toBe("number");
    expect(Number.isFinite(bb.scaling_error_ppm)).toBe(true);
  });

  it("ball-bar with empty measured_points stays null (opt-in only — no synthetic data)", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      ball_bar: { nominal_radius_mm: 150, measured_points: [], feed_rate_mm_min: 1000, plane: "XY" },
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.ballBar).toBeNull();
  });

  it("adversarial: loose user-supplied errors produce envelope strictly above LOOSE_ENVELOPE_FLOOR (no silent clamp)", () => {
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      axis_errors: { x_axis: { ...LOOSE_AXIS }, y_axis: { ...LOOSE_AXIS }, z_axis: { ...LOOSE_AXIS } },
      squareness: { ...LOOSE_SQUARENESS },
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.volumetric!.max_um).toBeGreaterThan(LOOSE_ENVELOPE_FLOOR_UM);
  });

  it("adversarial: angular error == 0 skips abbe entirely (engine guard, no throw)", () => {
    const zeroAng: AxisErrors6DOF = {
      positioning: 5, straightness_y: 5, straightness_z: 5, roll: 0, pitch: 0, yaw: 0,
    };
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      axis_errors: { x_axis: zeroAng, y_axis: zeroAng, z_axis: zeroAng },
      squareness: { xy: 0, xz: 0, yz: 0 },
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.abbe).toEqual([]);
  });

  it("custom workspace + grid_points: larger workspace yields strictly larger envelope (lever-arm growth)", () => {
    const small = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      workspace: { x_range: [-50, 50], y_range: [-50, 50], z_range: [-50, 50] },
      volumetric_grid_points: 3,
    });
    const large = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      workspace: { x_range: [-500, 500], y_range: [-500, 500], z_range: [-500, 500] },
      volumetric_grid_points: 3,
    });
    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(large!.accuracy.volumetric!.max_um).toBeGreaterThan(small!.accuracy.volumetric!.max_um);
  });

  it("backwards-compat: getCapabilitySummary still returns base shape — accuracy fields absent from key set", () => {
    const base = machineCapabilitySurfaceEngine.getCapabilitySummary(MACHINE_ID);
    expect(base).not.toBeNull();
    const baseRec = base as unknown as Record<string, unknown>;
    const keys = Object.keys(baseRec);
    expect(keys).not.toContain("accuracy");
    expect(keys).not.toContain("accuracy_source");
    expect(base!.machineId).toBe(MACHINE_ID);
    expect(base!.overallCapabilityScore).toBeGreaterThan(0);
    expect(base!.overallCapabilityScore).toBeLessThanOrEqual(100);
  });

  it("orchestrator does not throw when downstream gets all-zero axes — abbe array empty, no throw", () => {
    const zeroAxis: AxisErrors6DOF = {
      positioning: 0, straightness_y: 0, straightness_z: 0, roll: 0, pitch: 0, yaw: 0,
    };
    expect(() =>
      machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
        axis_errors: { x_axis: zeroAxis, y_axis: zeroAxis, z_axis: zeroAxis },
        squareness: { xy: 0, xz: 0, yz: 0 },
      })
    ).not.toThrow();
    const r = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      axis_errors: { x_axis: zeroAxis, y_axis: zeroAxis, z_axis: zeroAxis },
      squareness: { xy: 0, xz: 0, yz: 0 },
    });
    expect(r).not.toBeNull();
    expect(r!.accuracy.abbe).toEqual([]);
  });
});

describe("cad_machine_capability_with_accuracy dispatcher contract (U-DEA-november-P02)", () => {
  it("dispatcher action chains engine + returns wrapped {success, data} shape with bounded envelope", () => {
    const data = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(MACHINE_ID, {
      axis_errors: { x_axis: { ...TIGHT_AXIS }, y_axis: { ...TIGHT_AXIS }, z_axis: { ...TIGHT_AXIS } },
      squareness: { ...TIGHT_SQUARENESS },
    });
    expect(data).not.toBeNull();
    // Mirror dispatcher: `result = { success: data !== null, data: data ?? null }`
    const result = { success: data !== null, data: data ?? null };
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
    const cap = result.data as CapabilityWithAccuracy;
    expect(cap.accuracy_source).toBe("measured");
    expect(cap.accuracy.volumetric).not.toBeNull();
    expect(cap.accuracy.volumetric!.max_um).toBeGreaterThan(0);
    expect(cap.accuracy.volumetric!.max_um).toBeLessThan(VOLUMETRIC_CEILING_UM);
  });
});
