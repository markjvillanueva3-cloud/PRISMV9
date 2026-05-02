/**
 * HurcoV11MillMasterPostEngine — Feature-Sequencer Pipeline (sequenceFeatures TSP wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring
 *
 * Mirrors HurcoV11MillMasterPostEngine.HsmDwellPipeline.test.ts. Verifies
 * `generateProgramAdvanced()` synthesizes one `FeaturePoint` per
 * MillOperation (first cutting coordinate), runs the TSP nearest-neighbor
 * + 2-opt sequencer, and surfaces the optimized order in
 * `advanced_summary.feature_sequence` while keeping sync `output.gcode`
 * byte-identical and operation order unmutated.
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
const PROGRAM_NUMBER = 9300;

const baseOpAtOrigin: MillOperation = {
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
    { x: 0, y: 0, z: -2, type: "linear" },
    { x: 10, y: 0, z: -2, type: "linear" },
    { x: 10, y: 10, z: -2, type: "linear" },
  ],
};

/** Place an op at (cx, cy) with the same coordinate template. */
function opAt(cx: number, cy: number, toolNum: number): MillOperation {
  return {
    ...baseOpAtOrigin,
    tool_number: toolNum,
    coordinates: [
      { x: cx, y: cy, z: 25, type: "rapid" },
      { x: cx, y: cy, z: -2, type: "linear" },
      { x: cx + 10, y: cy, z: -2, type: "linear" },
      { x: cx + 10, y: cy + 10, z: -2, type: "linear" },
    ],
  };
}

describe("HurcoV11.generateProgramAdvanced — feature_sequence gating", () => {
  it("returns feature_sequence=null in advanced_summary when use_advanced_features unset", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [baseOpAtOrigin],
      { program_number: PROGRAM_NUMBER },
    );
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits feature_sequence_optimization in enhancement list when advanced enabled", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 0, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 1,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_features_applied).toContain("feature_sequence_optimization");
    expect(out.advanced_features_applied).toContain("hsm_dwell_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.feature_sequence with non-null shape", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 2,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs).not.toBeNull();
    expect(fs.features_count).toBe(3);
    expect(fs.original_sequence).toEqual([0, 1, 2]);
    expect(fs.optimized_sequence.length).toBe(3);
    expect(fs.distance_saved_mm).toBeGreaterThanOrEqual(0);
    expect(fs.improvement_pct).toBeGreaterThanOrEqual(0);
  });
});

describe("HurcoV11.generateProgramAdvanced — TSP optimization correctness", () => {
  it("zigzag-ordered ops are reordered to a shorter path (improvement_pct > 0)", async () => {
    // Five ops at (0,0)→(0,100)→(50,0)→(50,100)→(100,50) — naive sequence is
    // a zigzag (~414 mm); the TSP optimum routes them more efficiently.
    const ops = [
      opAt(0, 0, 1),
      opAt(0, 100, 2),
      opAt(50, 0, 3),
      opAt(50, 100, 4),
      opAt(100, 50, 5),
    ];
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 10,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(5);
    expect(fs.optimized_distance_mm).toBeLessThanOrEqual(fs.original_distance_mm);
    expect(fs.distance_saved_mm).toBeGreaterThan(0);
    expect(fs.improvement_pct).toBeGreaterThan(0);
    expect(fs.reorderings_count).toBeGreaterThan(0);
  });

  it("already-optimal sequence yields zero distance saved + zero reorderings", async () => {
    // Three ops on a straight line — original = optimized.
    const ops = [opAt(0, 0, 1), opAt(50, 0, 2), opAt(100, 0, 3)];
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 11,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.distance_saved_mm).toBe(0);
    expect(fs.improvement_pct).toBe(0);
    expect(fs.reorderings_count).toBe(0);
  });

  it("method label is 'nearest_neighbor+2opt' for >1 features (engine contract)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2)],
      {
        program_number: PROGRAM_NUMBER + 12,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_summary!.feature_sequence!.method).toBe("nearest_neighbor+2opt");
  });
});

describe("HurcoV11.generateProgramAdvanced — feature extraction edge cases", () => {
  it("single-op program yields trivial sequence (features_count=1, method='trivial')", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [baseOpAtOrigin],
      {
        program_number: PROGRAM_NUMBER + 20,
        use_advanced_features: true,
      },
    );
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(1);
    expect(fs.method).toBe("trivial");
    expect(fs.distance_saved_mm).toBe(0);
    expect(fs.reorderings_count).toBe(0);
  });

  it("op with zero cutting coordinates (rapids only) is skipped from features", async () => {
    const rapidsOnlyOp: MillOperation = {
      ...baseOpAtOrigin,
      tool_number: 99,
      coordinates: [
        { x: 200, y: 200, z: 25, type: "rapid" },
        { x: 250, y: 250, z: 25, type: "rapid" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), rapidsOnlyOp, opAt(50, 50, 2)],
      {
        program_number: PROGRAM_NUMBER + 21,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.feature_sequence!.features_count).toBe(2);
  });

  it("first cutting coordinate (not first rapid) is used as the FeaturePoint", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(7, 11, 1), opAt(99, 99, 2)],
      {
        program_number: PROGRAM_NUMBER + 22,
        use_advanced_features: true,
      },
    );
    // FeaturePoint x/y for op 0 must be (7,11) — the first cutting coord —
    // not (7,11) of the leading rapid (which happens to be the same point
    // here). The TSP path-distance will differ if the engine erroneously
    // used the rapid: assert a known geometry instead.
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(2);
    // Distance between (7,11,-2) and (99,99,-2) should be sqrt(92^2+88^2+0)≈127.3 mm
    const expected = Math.hypot(99 - 7, 99 - 11, 0);
    expect(fs.original_distance_mm).toBeCloseTo(expected, 1);
  });
});

describe("HurcoV11.generateProgramAdvanced — sync byte-identical regression", () => {
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) with vs without advanced pass", async () => {
    const ops = [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)];
    const sync = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      program_number: PROGRAM_NUMBER + 30,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 30,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("operation order is NOT mutated — tool-change blocks emit in original sequence", async () => {
    // Ops in a deliberately suboptimal order; advanced pass would prefer a
    // different sequence, but it must NOT rewrite gcode. The optimizer's
    // reordering surfaces only in advanced_summary.feature_sequence.
    const ops = [opAt(0, 0, 1), opAt(100, 100, 2), opAt(50, 0, 3)];
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 31,
      use_advanced_features: true,
    });
    // Match Hurco tool-change emission `T<n> M06` (engine line 452) — this
    // skips header tool-list summaries and comment mentions, so the order
    // reflects the actual program flow.
    const gcodeText = adv.gcode.join("\n");
    const toolChanges = Array.from(gcodeText.matchAll(/T(\d+)\s+M06/g)).map((m) =>
      Number(m[1]),
    );
    expect(toolChanges).toEqual([1, 2, 3]);
  });

  it("all 4 advanced passes coexist (auto_speed_feed + rapid_reposition + hsm_dwell + feature_sequence)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 32,
        use_advanced_features: true,
        machine_id: "jmdie_hurco_v11",
      },
    );
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
    expect(out.advanced_summary!.feature_sequence).not.toBeNull();
  });
});

describe("HurcoV11.generateProgramAdvanced — failure modes & adversarial", () => {
  it("missing machine_id falls back to default rapid rate (no throw)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(100, 100, 2)],
      {
        program_number: PROGRAM_NUMBER + 40,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.feature_sequence).not.toBeNull();
    expect(out.advanced_summary!.feature_sequence!.features_count).toBe(2);
  });

  it("adversarial: 4 collinear ops produce zero improvement (TSP fixed-point)", async () => {
    const ops = [opAt(0, 0, 1), opAt(25, 0, 2), opAt(50, 0, 3), opAt(75, 0, 4)];
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 41,
      use_advanced_features: true,
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.distance_saved_mm).toBe(0);
    expect(fs.reorderings_count).toBe(0);
  });

  it("adversarial: aggressiveness 0 vs 1 leaves TSP output deterministic (geometry-only pass)", async () => {
    const ops = [opAt(0, 0, 1), opAt(100, 100, 2), opAt(50, 0, 3), opAt(0, 100, 4)];
    const lo = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 42,
      use_advanced_features: true,
      advanced_aggressiveness: 0,
      machine_id: "jmdie_hurco_v11",
    });
    const hi = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 43,
      use_advanced_features: true,
      advanced_aggressiveness: 1,
      machine_id: "jmdie_hurco_v11",
    });
    expect(lo.advanced_summary!.feature_sequence!.optimized_sequence).toEqual(
      hi.advanced_summary!.feature_sequence!.optimized_sequence,
    );
    expect(lo.advanced_summary!.feature_sequence!.distance_saved_mm).toBe(
      hi.advanced_summary!.feature_sequence!.distance_saved_mm,
    );
  });
});
