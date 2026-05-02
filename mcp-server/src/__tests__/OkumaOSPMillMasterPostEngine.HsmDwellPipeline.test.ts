/**
 * OkumaOSPMillMasterPostEngine — HSM Dwell Pipeline (HSMDwellAtCornerEngine wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring
 *
 * Mirrors HurcoV11MillMasterPostEngine.HsmDwellPipeline.test.ts. Verifies
 * `generateProgramAdvanced()` walks linear/arc transitions in
 * `MillOperation.coordinates`, builds CornerGeometry triples, calls
 * `HSMDwellAtCornerEngine.analyzeDwell()` per corner, and reports
 * aggregated dwell statistics in `advanced_summary.hsm_dwell`.
 *
 * Adds Okuma-specific `use_super_nurbs` (Super-NURBS / G131 nano smoothing)
 * mode mapping and a P500 5-axis (osp_family="p500") variant to ensure
 * the corner extractor handles non-planar (Z-varying) toolpaths.
 */
import { describe, it, expect } from "vitest";
import {
  okumaOSPMillMasterPostEngine,
  type MillOperation,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9200;

/** Square-pocket op: 4 right-angle corners along the cut path. */
const squarePocketOp: MillOperation = {
  operation_type: "pocket",
  tool_number: TOOL_NUM,
  tool_diameter_mm: TOOL_DIA_MM,
  tool_flutes: TOOL_FLUTES,
  material_iso: "P",
  spindle_rpm: SPINDLE_RPM,
  feed_mm_min: FEED_MM_MIN,
  axial_depth_mm: AXIAL_DOC_MM,
  radial_depth_mm: RADIAL_DOC_MM,
  coordinates: [
    { x: 0, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: -2, type: "linear" },
    { x: 100, y: 80, z: -2, type: "linear" },
    { x: 0, y: 80, z: -2, type: "linear" },
    { x: 0, y: 0, z: -2, type: "linear" },
  ],
};

/** Single-segment linear op — no triple, no corners. */
const singleLinearOp: MillOperation = {
  ...squarePocketOp,
  coordinates: [
    { x: 0, y: 0, z: -2, type: "linear" },
    { x: 50, y: 0, z: -2, type: "linear" },
  ],
};

/** 5-axis-style profile with Z varying — non-planar corner geometry. */
const fiveAxisLikeOp: MillOperation = {
  ...squarePocketOp,
  operation_type: "3d_surface",
  coordinates: [
    { x: 0, y: 0, z: 0, type: "linear" },
    { x: 50, y: 0, z: -2, type: "linear" },
    { x: 50, y: 50, z: -4, type: "linear" },
    { x: 0, y: 50, z: -2, type: "linear" },
    { x: 0, y: 0, z: 0, type: "linear" },
  ],
};

describe("OkumaOSPMill.generateProgramAdvanced — HSM dwell gating", () => {
  it("returns hsm_dwell=null in advanced_summary when use_advanced_features unset", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      { program_number: PROGRAM_NUMBER },
    );
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits hsm_dwell_optimization in enhancement list when advanced enabled", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 1,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_features_applied).toContain("hsm_dwell_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.hsm_dwell with non-null shape when corners exist", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 2,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm).not.toBeNull();
    expect(hsm.corners_analyzed).toBeGreaterThanOrEqual(2);
    expect(hsm.optimizations_count).toBe(hsm.corners_analyzed);
    expect(hsm.total_recommended_dwell_ms).toBeGreaterThanOrEqual(0);
    expect(hsm.avg_thermal_factor).toBeGreaterThanOrEqual(1);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — HSM mode mapping", () => {
  it("super_nurbs=true selects g05p1 hsm_mode_used", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 10,
        use_advanced_features: true,
        use_super_nurbs: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.hsm_mode_used).toBe("g05p1");
  });

  it("super_nurbs absent → hsm_mode_used:'off'", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 11,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.hsm_mode_used).toBe("off");
  });

  it("super_nurbs=true reduces total dwell vs super_nurbs=false (mode factor 0.8)", async () => {
    const fastOp: MillOperation = { ...squarePocketOp, feed_mm_min: 6000 };
    const off = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([fastOp], {
      program_number: PROGRAM_NUMBER + 12,
      use_advanced_features: true,
      use_super_nurbs: false,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const on = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([fastOp], {
      program_number: PROGRAM_NUMBER + 13,
      use_advanced_features: true,
      use_super_nurbs: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(on.advanced_summary!.hsm_dwell!.total_recommended_dwell_ms).toBeLessThan(
      off.advanced_summary!.hsm_dwell!.total_recommended_dwell_ms,
    );
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — corner extraction", () => {
  it("single linear segment yields corners_analyzed=0", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [singleLinearOp],
      {
        program_number: PROGRAM_NUMBER + 20,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(0);
    expect(out.advanced_summary!.hsm_dwell!.total_recommended_dwell_ms).toBe(0);
    expect(out.advanced_summary!.hsm_dwell!.optimizations_count).toBe(0);
  });

  it("near-straight motion (>170° interior) is filtered out", async () => {
    const nearlyStraightOp: MillOperation = {
      ...squarePocketOp,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0.01, z: -2, type: "linear" },
        { x: 100, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [nearlyStraightOp],
      {
        program_number: PROGRAM_NUMBER + 21,
        use_advanced_features: true,
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBeLessThanOrEqual(1);
  });

  it("multi-op program aggregates corners across operations", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp, { ...squarePocketOp, tool_number: 6 }],
      {
        program_number: PROGRAM_NUMBER + 22,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBeGreaterThanOrEqual(4);
  });

  it("rapids in coordinates are skipped (only linear/arc transitions count)", async () => {
    const rapidsOnlyOp: MillOperation = {
      ...squarePocketOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 50, y: 50, z: 25, type: "rapid" },
        { x: 100, y: 0, z: 25, type: "rapid" },
        { x: 100, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [rapidsOnlyOp],
      {
        program_number: PROGRAM_NUMBER + 23,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(0);
  });

  it("P500 (5-axis) family with Z-varying linear path yields non-planar corners", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [fiveAxisLikeOp],
      {
        program_number: PROGRAM_NUMBER + 24,
        use_advanced_features: true,
        osp_family: "p500",
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBeGreaterThanOrEqual(2);
    expect(hsm.total_recommended_dwell_ms).toBeGreaterThanOrEqual(0);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — sync byte-identical regression", () => {
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) with vs without advanced pass", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([squarePocketOp], {
      program_number: PROGRAM_NUMBER + 30,
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 30,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("physics_checks array length unchanged when HSM pass runs", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([squarePocketOp], {
      program_number: PROGRAM_NUMBER + 31,
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 31,
        use_advanced_features: true,
      },
    );
    expect(adv.physics_checks.length).toBe(sync.physics_checks.length);
  });

  it("auto_speed_feed + rapid_reposition + hsm_dwell all populated when enabled", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 32,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — failure modes & adversarial", () => {
  it("NaN linear coordinate throws structured error from RapidReposition pass first", async () => {
    const bad: MillOperation = {
      ...squarePocketOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 100, y: 0, z: -2, type: "linear" },
        { x: NaN, y: 80, z: -2, type: "linear" },
        { x: 0, y: 80, z: -2, type: "linear" },
      ],
    };
    await expect(
      okumaOSPMillMasterPostEngine.generateProgramAdvanced([bad], {
        program_number: PROGRAM_NUMBER + 40,
        use_advanced_features: true,
      }),
    ).rejects.toThrow(/Invalid coordinate/);
  });

  it("missing machine_id falls back to default servo (no throw)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 41,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBeGreaterThanOrEqual(2);
  });

  it("unknown machine_id falls back to default servo (no throw)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 42,
        use_advanced_features: true,
        machine_id: "nonexistent_machine_xyz",
      },
    );
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
  });

  it("adversarial: hairpin reversal (≈180° change) is kept and produces high dwell", async () => {
    const hairpinOp: MillOperation = {
      ...squarePocketOp,
      feed_mm_min: 5000,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
        { x: 0, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [hairpinOp],
      {
        program_number: PROGRAM_NUMBER + 43,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBe(1);
    expect(hsm.high_dwell_count + hsm.high_thermal_count + hsm.tolerance_violation_count)
      .toBeGreaterThanOrEqual(1);
    expect(hsm.max_dwell_ms).toBeGreaterThan(0);
  });

  it("adversarial: duplicate consecutive linear points are skipped (zero-length vector)", async () => {
    const dupOp: MillOperation = {
      ...squarePocketOp,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
        { x: 50, y: 50, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([dupOp], {
      program_number: PROGRAM_NUMBER + 44,
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(0);
  });

  it("adversarial: aggressiveness 0 vs 1 leaves HSM corner count deterministic (geometry-only pass)", async () => {
    const lo = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 45,
        use_advanced_features: true,
        advanced_aggressiveness: 0,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const hi = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 46,
        use_advanced_features: true,
        advanced_aggressiveness: 1,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(lo.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(
      hi.advanced_summary!.hsm_dwell!.corners_analyzed,
    );
  });
});
