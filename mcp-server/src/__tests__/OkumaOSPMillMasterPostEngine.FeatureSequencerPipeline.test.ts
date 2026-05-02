/**
 * OkumaOSPMillMasterPostEngine — Feature-Sequencer Pipeline (sequenceFeatures TSP wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring
 *
 * Mirrors HurcoV11MillMasterPostEngine.FeatureSequencerPipeline.test.ts.
 * Verifies `generateProgramAdvanced()` synthesizes one `FeaturePoint` per
 * MillOperation (first cutting coordinate), runs the TSP sequencer, and
 * surfaces the optimized order in `advanced_summary.feature_sequence`
 * while keeping sync `output.gcode` byte-identical and operation order
 * unmutated. Adds a P500 5-axis variant.
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
const PROGRAM_NUMBER = 9400;

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

describe("OkumaOSPMill.generateProgramAdvanced — feature_sequence gating", () => {
  it("returns feature_sequence=null in advanced_summary when use_advanced_features unset", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [baseOpAtOrigin],
      { program_number: PROGRAM_NUMBER },
    );
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits feature_sequence_optimization in enhancement list when advanced enabled", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 0, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 1,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_features_applied).toContain("feature_sequence_optimization");
    expect(out.advanced_features_applied).toContain("hsm_dwell_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.feature_sequence with non-null shape", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 2,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
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

describe("OkumaOSPMill.generateProgramAdvanced — TSP optimization correctness", () => {
  it("zigzag-ordered ops are reordered to a shorter path (improvement_pct > 0)", async () => {
    const ops = [
      opAt(0, 0, 1),
      opAt(0, 100, 2),
      opAt(50, 0, 3),
      opAt(50, 100, 4),
      opAt(100, 50, 5),
    ];
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 10,
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(5);
    expect(fs.optimized_distance_mm).toBeLessThanOrEqual(fs.original_distance_mm);
    expect(fs.distance_saved_mm).toBeGreaterThan(0);
    expect(fs.improvement_pct).toBeGreaterThan(0);
    expect(fs.reorderings_count).toBeGreaterThan(0);
  });

  it("already-optimal sequence yields zero distance saved + zero reorderings", async () => {
    const ops = [opAt(0, 0, 1), opAt(50, 0, 2), opAt(100, 0, 3)];
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 11,
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.distance_saved_mm).toBe(0);
    expect(fs.improvement_pct).toBe(0);
    expect(fs.reorderings_count).toBe(0);
  });

  it("method label is 'nearest_neighbor+2opt' for >1 features", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2)],
      {
        program_number: PROGRAM_NUMBER + 12,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_summary!.feature_sequence!.method).toBe("nearest_neighbor+2opt");
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — feature extraction edge cases", () => {
  it("single-op program yields trivial sequence (features_count=1, method='trivial')", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
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
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), rapidsOnlyOp, opAt(50, 50, 2)],
      {
        program_number: PROGRAM_NUMBER + 21,
        use_advanced_features: true,
      },
    );
    expect(out.advanced_summary!.feature_sequence!.features_count).toBe(2);
  });

  it("first cutting coordinate is used as the FeaturePoint (not the leading rapid)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(7, 11, 1), opAt(99, 99, 2)],
      {
        program_number: PROGRAM_NUMBER + 22,
        use_advanced_features: true,
      },
    );
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(2);
    const expected = Math.hypot(99 - 7, 99 - 11, 0);
    expect(fs.original_distance_mm).toBeCloseTo(expected, 1);
  });

  it("P500 5-axis family with Z-varying op feature points still produces valid TSP", async () => {
    const fiveAxisOpAt = (cx: number, cy: number, cz: number, t: number): MillOperation => ({
      ...baseOpAtOrigin,
      tool_number: t,
      operation_type: "3d_surface",
      coordinates: [
        { x: cx, y: cy, z: cz, type: "linear" },
        { x: cx + 5, y: cy, z: cz - 1, type: "linear" },
      ],
    });
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [
        fiveAxisOpAt(0, 0, 0, 1),
        fiveAxisOpAt(50, 50, -3, 2),
        fiveAxisOpAt(100, 0, -1, 3),
      ],
      {
        program_number: PROGRAM_NUMBER + 23,
        use_advanced_features: true,
        osp_family: "p500",
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.features_count).toBe(3);
    expect(fs.original_distance_mm).toBeGreaterThan(0);
    expect(fs.optimized_distance_mm).toBeLessThanOrEqual(fs.original_distance_mm);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — sync byte-identical regression", () => {
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) with vs without advanced pass", async () => {
    const ops = [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)];
    const sync = okumaOSPMillMasterPostEngine.generateProgram(ops, {
      program_number: PROGRAM_NUMBER + 30,
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 30,
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("operation order is NOT mutated — tool-length-comp blocks emit in original sequence", async () => {
    const ops = [opAt(0, 0, 1), opAt(100, 100, 2), opAt(50, 0, 3)];
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 31,
      use_advanced_features: true,
    });
    // Match Okuma OSP tool-length-comp emission `G43 H<n>` (engine line 653;
    // emitted once per op when default `tool_length_comp_mode` is in effect).
    // This skips header tool-list summaries and comment mentions.
    const gcodeText = adv.gcode.join("\n");
    const toolLines = Array.from(gcodeText.matchAll(/G43\s+H(\d+)/g)).map((m) =>
      Number(m[1]),
    );
    expect(toolLines).toEqual([1, 2, 3]);
  });

  it("all 4 advanced passes coexist (auto_speed_feed + rapid_reposition + hsm_dwell + feature_sequence)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
      [opAt(0, 0, 1), opAt(50, 50, 2), opAt(100, 0, 3)],
      {
        program_number: PROGRAM_NUMBER + 32,
        use_advanced_features: true,
        machine_id: "jmdie_okuma_genos_m460v_5ax",
      },
    );
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.hsm_dwell).not.toBeNull();
    expect(out.advanced_summary!.feature_sequence).not.toBeNull();
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — failure modes & adversarial", () => {
  it("missing machine_id falls back to default rapid rate (no throw)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(
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
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 41,
      use_advanced_features: true,
    });
    const fs = out.advanced_summary!.feature_sequence!;
    expect(fs.distance_saved_mm).toBe(0);
    expect(fs.reorderings_count).toBe(0);
  });

  it("adversarial: aggressiveness 0 vs 1 leaves TSP output deterministic (geometry-only pass)", async () => {
    const ops = [opAt(0, 0, 1), opAt(100, 100, 2), opAt(50, 0, 3), opAt(0, 100, 4)];
    const lo = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 42,
      use_advanced_features: true,
      advanced_aggressiveness: 0,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const hi = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 43,
      use_advanced_features: true,
      advanced_aggressiveness: 1,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(lo.advanced_summary!.feature_sequence!.optimized_sequence).toEqual(
      hi.advanced_summary!.feature_sequence!.optimized_sequence,
    );
    expect(lo.advanced_summary!.feature_sequence!.distance_saved_mm).toBe(
      hi.advanced_summary!.feature_sequence!.distance_saved_mm,
    );
  });
});
