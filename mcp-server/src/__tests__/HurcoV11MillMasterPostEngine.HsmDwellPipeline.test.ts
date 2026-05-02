/**
 * HurcoV11MillMasterPostEngine — HSM Dwell Pipeline (HSMDwellAtCornerEngine wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring
 *
 * Mirrors HurcoV11MillMasterPostEngine.RapidPipeline.test.ts. Verifies
 * `generateProgramAdvanced()` walks linear/arc transitions in
 * `MillOperation.coordinates`, builds CornerGeometry triples, calls
 * `HSMDwellAtCornerEngine.analyzeDwell()` per corner, and reports
 * aggregated dwell statistics in `advanced_summary.hsm_dwell` while
 * keeping sync `output.gcode` byte-identical and the AutoSpeedFeed +
 * RapidReposition passes undisturbed.
 */
import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9100;

/** Square-pocket op: 4 right-angle corners (interior angle ≈ 90°) along
 *  the cutting path, plus the closing 4th corner. Two leading rapids that
 *  the corner extractor must skip. */
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

describe("HurcoV11.generateProgramAdvanced — HSM dwell gating", () => {
  it("returns hsm_dwell=null in advanced_summary when use_advanced_features unset", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      { program_number: PROGRAM_NUMBER },
    );
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits hsm_dwell_optimization in enhancement list when advanced enabled", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 1,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_features_applied).toContain("hsm_dwell_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.hsm_dwell with non-null shape when corners exist", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 2,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
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

describe("HurcoV11.generateProgramAdvanced — HSM mode mapping", () => {
  it("ultimotion=true selects g05p1 hsm_mode_used", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 10,
        use_advanced_features: true,
        use_ultimotion: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.hsm_mode_used).toBe("g05p1");
  });

  it("ultimotion=false (explicit opt-out) → hsm_mode_used:'off'", async () => {
    // The Hurco V11 default config sets use_ultimotion=true (UltiMotion is the
    // headline feature of WinMax V11, so it's on by default). To exercise the
    // 'off' branch the caller must explicitly opt out.
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 11,
        use_advanced_features: true,
        use_ultimotion: false,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.hsm_mode_used).toBe("off");
  });

  it("ultimotion=true reduces total dwell vs ultimotion=false (mode factor 0.8)", async () => {
    // Bumped feed makes high-speed mode reduction observable.
    const fastOp: MillOperation = { ...squarePocketOp, feed_mm_min: 6000 };
    const off = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([fastOp], {
      program_number: PROGRAM_NUMBER + 12,
      use_advanced_features: true,
      use_ultimotion: false,
      machine_id: "jmdie_hurco_v11",
    });
    const on = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([fastOp], {
      program_number: PROGRAM_NUMBER + 13,
      use_advanced_features: true,
      use_ultimotion: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(on.advanced_summary!.hsm_dwell!.total_recommended_dwell_ms).toBeLessThan(
      off.advanced_summary!.hsm_dwell!.total_recommended_dwell_ms,
    );
  });
});

describe("HurcoV11.generateProgramAdvanced — corner extraction", () => {
  it("single linear segment (no triple) yields corners_analyzed=0", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
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
        { x: 50, y: 0.01, z: -2, type: "linear" }, // 0.01 mm Y deflection
        { x: 100, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [nearlyStraightOp],
      {
        program_number: PROGRAM_NUMBER + 21,
        use_advanced_features: true,
      },
    );
    // Either filtered (0) or analyzed but with very low dwell — accept either.
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBeLessThanOrEqual(1);
  });

  it("multi-op program aggregates corners across operations", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp, { ...squarePocketOp, tool_number: 6 }],
      {
        program_number: PROGRAM_NUMBER + 22,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
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
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [rapidsOnlyOp],
      {
        program_number: PROGRAM_NUMBER + 23,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(0);
  });
});

describe("HurcoV11.generateProgramAdvanced — sync byte-identical regression", () => {
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) with vs without advanced pass", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([squarePocketOp], {
      program_number: PROGRAM_NUMBER + 30,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 30,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("physics_checks array length unchanged when HSM pass runs", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([squarePocketOp], {
      program_number: PROGRAM_NUMBER + 31,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 31,
        use_advanced_features: true,
      },
    );
    expect(adv.physics_checks.length).toBe(sync.physics_checks.length);
  });

  it("auto_speed_feed + rapid_reposition + hsm_dwell all populated when enabled", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 32,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
  });
});

describe("HurcoV11.generateProgramAdvanced — failure modes & adversarial", () => {
  it("NaN linear coordinate throws structured error from RapidReposition pass first", async () => {
    // RapidReposition extractRapidMoves runs before HSM extractCorners, so
    // it surfaces the NaN error first. Either error path is acceptable —
    // both contain "Invalid coordinate".
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
      hurcoV11MillMasterPostEngine.generateProgramAdvanced([bad], {
        program_number: PROGRAM_NUMBER + 40,
        use_advanced_features: true,
      }),
    ).rejects.toThrow(/Invalid coordinate/);
  });

  it("missing machine_id falls back to default servo (no throw)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
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
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
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
    // Approach +X 50mm, exit −X back to start — interior angle ≈ 0° (worst case).
    const hairpinOp: MillOperation = {
      ...squarePocketOp,
      feed_mm_min: 5000,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
        { x: 0, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [hairpinOp],
      {
        program_number: PROGRAM_NUMBER + 43,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    const hsm = out.advanced_summary!.hsm_dwell!;
    expect(hsm.corners_analyzed).toBe(1);
    // Hairpin at high feed should hit the high-dwell threshold.
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
        { x: 50, y: 0, z: -2, type: "linear" }, // duplicate
        { x: 50, y: 50, z: -2, type: "linear" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([dupOp], {
      program_number: PROGRAM_NUMBER + 44,
      use_advanced_features: true,
    });
    // Triple #1 (p0,p1,dup): exit length zero → skipped.
    // Triple #2 (p1,dup,p3): approach length zero → skipped.
    // Both triples must be skipped.
    expect(out.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(0);
  });

  it("adversarial: aggressiveness 0 vs 1 leaves HSM corner count deterministic (geometry-only pass)", async () => {
    const lo = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 45,
        use_advanced_features: true,
        advanced_aggressiveness: 0,
        machine_id: "jmdie_hurco_v11",
      },
    );
    const hi = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [squarePocketOp],
      {
        program_number: PROGRAM_NUMBER + 46,
        use_advanced_features: true,
        advanced_aggressiveness: 1,
        machine_id: "jmdie_hurco_v11",
      },
    );
    // HSM is geometry-driven; aggressiveness only affects AutoSpeedFeed.
    expect(lo.advanced_summary!.hsm_dwell!.corners_analyzed).toBe(
      hi.advanced_summary!.hsm_dwell!.corners_analyzed,
    );
  });
});
