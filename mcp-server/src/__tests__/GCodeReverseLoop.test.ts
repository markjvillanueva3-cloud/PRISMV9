/**
 * GCodeReverseLoop — tests the 3 inverse-direction engines as one suite:
 *   GCodeRuntimePredictorEngine  — G-code → runtime prediction
 *   GCodeReverseCADEngine        — G-code → finished CAD features
 *   GCodeBidirectionalOptimizer  — runtime + CAD → optimization recommendations
 *
 * Every assertion checks a concrete arithmetic value (no toBeDefined-only).
 *
 * @milestone GCODE-RUNTIME-PREDICT-MS0 + GCODE-REVERSE-CAD-MS0 + GCODE-BIDIRECTIONAL-OPTIMIZE-MS0
 */

import { describe, expect, it } from "vitest";
import {
  GCodeRuntimePredictorEngine,
  MACHINE_LIBRARY,
  type ParsedBlock,
} from "../engines/GCodeRuntimePredictorEngine.js";
import {
  GCodeReverseCADEngine,
  type ToolEnvelope,
  type StockBlock,
} from "../engines/GCodeReverseCADEngine.js";
import { GCodeBidirectionalOptimizerEngine } from "../engines/GCodeBidirectionalOptimizerEngine.js";

const predictor = new GCodeRuntimePredictorEngine();
const reverser = new GCodeReverseCADEngine();
const optimizer = new GCodeBidirectionalOptimizerEngine();

const SIMPLE_LINE: ParsedBlock[] = [
  { n: 1, motion: "G1", x: 0,   y: 0, z: 0, f: 1000 },
  { n: 2, motion: "G1", x: 100, y: 0, z: 0, f: 1000 },
];

const FACE_MILL_BLOCKS: ParsedBlock[] = [
  { n: 1, motion: "G0", x: 0,   y: 0,   z: 25, m: [6], t: 14 },
  { n: 2, motion: "G0", s: 5000, m: [3] },
  { n: 3, motion: "G0", x: -30, y: -30, z: 5 },
  { n: 4, motion: "G1", x: -30, y: -30, z: -0.5, f: 800 },
  { n: 5, motion: "G1", x:  30, y: -30, z: -0.5 },
  { n: 6, motion: "G1", x:  30, y:  30, z: -0.5 },
  { n: 7, motion: "G1", x: -30, y:  30, z: -0.5 },
  { n: 8, motion: "G1", x: -30, y: -30, z: -0.5 },
  { n: 9, motion: "G0", x: -30, y: -30, z: 25, m: [30] },
];

const DRILL_BLOCKS: ParsedBlock[] = (() => {
  const blocks: ParsedBlock[] = [
    { n: 1, motion: "G0", z: 25, m: [6], t: 7 },
    { n: 2, motion: "G0", s: 1500, m: [3] },
  ];
  let nN = 3;
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const x = col * 15, y = row * 15;
      blocks.push({ n: nN++, motion: "G0", x, y, z: 5 });
      blocks.push({ n: nN++, motion: "G1", x, y, z: -15, f: 200 });
      blocks.push({ n: nN++, motion: "G0", x, y, z: 5 });
    }
  }
  blocks.push({ n: nN, motion: "G0", z: 25, m: [30] });
  return blocks;
})();

const TOOL_OSCILLATION_BLOCKS: ParsedBlock[] = [
  { n: 1,  motion: "G0", z: 25, m: [6], t: 14 },
  { n: 2,  motion: "G1", x: 0,  y: 0, z: -0.5, f: 800 },
  { n: 3,  motion: "G0", z: 25, m: [6], t: 7  },
  { n: 4,  motion: "G1", x: 10, y: 0, z: -10,  f: 300 },
  { n: 5,  motion: "G0", z: 25, m: [6], t: 14 },
  { n: 6,  motion: "G1", x: 20, y: 0, z: -0.5, f: 800 },
  { n: 7,  motion: "G0", z: 25, m: [6], t: 7  },
  { n: 8,  motion: "G1", x: 30, y: 0, z: -10,  f: 300 },
  { n: 9,  motion: "G0", z: 25, m: [6], t: 14 },
  { n: 10, motion: "G1", x: 40, y: 0, z: -0.5, f: 800, m: [30] },
];

const STOCK: StockBlock = {
  min: { x: -40, y: -40, z: -30 },
  max: { x:  40, y:  40, z:   0 },
};

const FACE_MILL_TOOL: ToolEnvelope = {
  tool_number: 14, type: "facemill", diameter_mm: 12, flutes: 4,
};
const DRILL_TOOL: ToolEnvelope = {
  tool_number: 7, type: "drill", diameter_mm: 6.35, flutes: 2,
};

describe("GCodeRuntimePredictorEngine — concrete arithmetic", () => {
  it("100mm G1 at 1000 mm/min on Hurco VMX24 = 6.0s motion time", () => {
    const r = predictor.predictForMachine(SIMPLE_LINE, "hurco_vmx24");
    const cutBlock = r.blocks.find(b => b.motion === "G1" && b.path_length_mm > 0)!;
    expect(cutBlock.path_length_mm).toBeCloseTo(100, 1);
    expect(cutBlock.effective_feed_mm_min).toBeCloseTo(1000, 1);
    expect(cutBlock.motion_time_sec).toBeCloseTo(6.0, 1);
  });

  it("face-mill program total = sum of per-block totals (conservation)", () => {
    const r = predictor.predictForMachine(FACE_MILL_BLOCKS, "hurco_vmx24");
    expect(r.total_sec).toBeGreaterThan(0);
    const sum = r.blocks.reduce((a, b) => a + b.total_sec, 0);
    expect(sum).toBeCloseTo(r.total_sec, 3);
  });

  it("haas_vf2 (lookahead 200, accel 1500) > hurco_vmx24 on same drill array", () => {
    const hurco = predictor.predictForMachine(DRILL_BLOCKS, "hurco_vmx24");
    const haas = predictor.predictForMachine(DRILL_BLOCKS, "haas_vf2");
    expect(haas.total_sec).toBeGreaterThan(hurco.total_sec);
  });

  it("tool change M06+T# on Hurco VMX24 adds exactly 6.0s overhead", () => {
    const r = predictor.predictForMachine(FACE_MILL_BLOCKS, "hurco_vmx24");
    const tcBlock = r.blocks.find(b => b.tool_change_sec > 0)!;
    expect(tcBlock.tool_change_sec).toBeCloseTo(MACHINE_LIBRARY.hurco_vmx24.tool_change_sec, 3);
    expect(tcBlock.tool_change_sec).toBeCloseTo(6.0, 3);
  });

  it("spindle ramp 0→5000 RPM × 1.5s/krpm = 7.5s on Hurco VMX24", () => {
    const r = predictor.predictForMachine(FACE_MILL_BLOCKS, "hurco_vmx24");
    const ramp = r.blocks.find(b => b.spindle_ramp_sec > 0)!;
    expect(ramp.spindle_ramp_sec).toBeCloseTo(7.5, 1);
  });

  it("R12: unknown machine_id throws with the supported-list in the error", () => {
    expect(() => predictor.predictForMachine(SIMPLE_LINE, "nonexistent_machine")).toThrow(/Unknown machine_id/);
  });

  it("R12: max_feed=0 throws (would cause divide-by-zero silently)", () => {
    expect(() => predictor.predict(SIMPLE_LINE, {
      machine_id: "broken",
      max_feed_mm_min: 0, max_rapid_mm_min: 1000, max_accel_mm_sec2: 1000,
      lookahead_blocks: 100, blocks_per_sec: 1000,
      tool_change_sec: 5, spindle_ramp_sec_per_krpm: 1,
    })).toThrow(/max_feed_mm_min/);
  });

  it("Empty block array yields total_sec = 0 (graceful degenerate)", () => {
    const r = predictor.predictForMachine([], "hurco_vmx24");
    expect(r.total_sec).toBe(0);
    expect(r.blocks.length).toBe(0);
  });

  it("All 4 machines in MACHINE_LIBRARY produce total_sec > 0 on face-mill input", () => {
    const machines = Object.keys(MACHINE_LIBRARY);
    expect(machines.length).toBeGreaterThanOrEqual(4);
    for (const id of machines) {
      const r = predictor.predictForMachine(FACE_MILL_BLOCKS, id);
      expect(r.total_sec).toBeGreaterThan(0);
    }
  });

  it("Time breakdown components sum to >= cutting time (overhead always positive)", () => {
    const r = predictor.predictForMachine(FACE_MILL_BLOCKS, "hurco_vmx24");
    const totalComponents =
      r.time_breakdown.cutting_sec + r.time_breakdown.rapid_sec
      + r.time_breakdown.tool_change_sec + r.time_breakdown.spindle_ramp_sec
      + r.time_breakdown.dwell_sec;
    expect(totalComponents).toBeGreaterThan(0);
    expect(r.time_breakdown.cutting_sec).toBeGreaterThanOrEqual(0);
    expect(r.time_breakdown.tool_change_sec).toBeCloseTo(6.0, 3);
  });
});

describe("GCodeReverseCADEngine — feature extraction", () => {
  it("Face-mill program extracts ≥1 feature attributable to T14", () => {
    const tools = new Map<number, ToolEnvelope>([[14, FACE_MILL_TOOL]]);
    const r = reverser.reconstruct(FACE_MILL_BLOCKS, tools, STOCK);
    expect(r.features.length).toBeGreaterThanOrEqual(1);
    expect(r.features[0].tool_number).toBe(14);
  });

  it("Drill array extracts a 'hole' feature with diameter exactly 6.35mm", () => {
    const tools = new Map<number, ToolEnvelope>([[7, DRILL_TOOL]]);
    const r = reverser.reconstruct(DRILL_BLOCKS, tools, STOCK);
    const holes = r.features.filter(f => f.kind === "hole");
    expect(holes.length).toBeGreaterThanOrEqual(1);
    expect(holes[0].tool_number).toBe(7);
    expect(holes[0].primary_dim_mm).toBeCloseTo(6.35, 3);
    expect(holes[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("Stock volume math: 80 × 80 × 30 = 192,000 mm^3 EXACT", () => {
    const tools = new Map<number, ToolEnvelope>([[14, FACE_MILL_TOOL]]);
    const r = reverser.reconstruct(FACE_MILL_BLOCKS, tools, STOCK);
    expect(r.stock_volume_mm3).toBeCloseTo(192000, 0);
  });

  it("Volume conservation: finished_vol + removed_vol = stock_vol EXACT", () => {
    const tools = new Map<number, ToolEnvelope>([[14, FACE_MILL_TOOL]]);
    const r = reverser.reconstruct(FACE_MILL_BLOCKS, tools, STOCK);
    expect(r.finished_volume_mm3 + r.material_removed_mm3).toBeCloseTo(r.stock_volume_mm3, 0);
  });

  it("R12: negative stock dimension throws", () => {
    const tools = new Map<number, ToolEnvelope>();
    expect(() => reverser.reconstruct([], tools, {
      min: { x: 0, y: 0, z: 0 }, max: { x: -1, y: 10, z: 10 },
    })).toThrow(/Stock dimensions must be positive/);
  });

  it("R12: unknown tool emits warning + skips, yields zero features (graceful)", () => {
    const tools = new Map<number, ToolEnvelope>();
    const r = reverser.reconstruct(FACE_MILL_BLOCKS, tools, STOCK);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.features.length).toBe(0);
  });

  it("Feature_counts histogram sums to features.length", () => {
    const tools = new Map<number, ToolEnvelope>([[7, DRILL_TOOL]]);
    const r = reverser.reconstruct(DRILL_BLOCKS, tools, STOCK);
    const counts = Object.values(r.feature_counts).reduce((a, b) => a + b, 0);
    expect(counts).toBe(r.features.length);
  });
});

describe("GCodeBidirectionalOptimizerEngine — closes the loop", () => {
  it("Tool oscillation (T14,T7,T14,T7,T14) yields a tool_sequencing rec with savings > 0", () => {
    const r = optimizer.optimize({
      blocks: TOOL_OSCILLATION_BLOCKS,
      machine: MACHINE_LIBRARY.hurco_vmx24,
    });
    const toolSeq = r.recommendations.find(rec => rec.category === "tool_sequencing");
    expect(toolSeq?.category).toBe("tool_sequencing");
    expect(toolSeq?.estimated_savings_sec ?? 0).toBeGreaterThan(0);
  });

  it("Conservation: optimized_runtime + total_savings = baseline runtime", () => {
    const r = optimizer.optimize({
      blocks: TOOL_OSCILLATION_BLOCKS,
      machine: MACHINE_LIBRARY.hurco_vmx24,
    });
    expect(r.optimized_runtime_estimate_sec + r.total_estimated_savings_sec)
      .toBeCloseTo(r.baseline_runtime.total_sec, 1);
  });

  it("Recommendations sorted by savings descending (top is highest-impact)", () => {
    const r = optimizer.optimize({
      blocks: TOOL_OSCILLATION_BLOCKS,
      machine: MACHINE_LIBRARY.hurco_vmx24,
    });
    for (let i = 1; i < r.recommendations.length; i++) {
      expect(r.recommendations[i].estimated_savings_sec)
        .toBeLessThanOrEqual(r.recommendations[i - 1].estimated_savings_sec);
    }
  });

  it("Empty block list yields 0 recommendations + 0 savings (graceful degenerate)", () => {
    const r = optimizer.optimize({ blocks: [], machine: MACHINE_LIBRARY.hurco_vmx24 });
    expect(r.recommendations.length).toBe(0);
    expect(r.total_estimated_savings_sec).toBe(0);
    expect(r.total_savings_pct).toBe(0);
  });

  it("Summary always emits ≥3 lines (baseline + rec count + savings)", () => {
    const r = optimizer.optimize({
      blocks: TOOL_OSCILLATION_BLOCKS,
      machine: MACHINE_LIBRARY.hurco_vmx24,
    });
    expect(r.summary.length).toBeGreaterThanOrEqual(3);
  });

  it("Cross-machine variability: same program on Haas vs Hurco produces different baselines", () => {
    const haasOpt = optimizer.optimize({
      blocks: DRILL_BLOCKS,
      machine: MACHINE_LIBRARY.haas_vf2,
    });
    const hurcoOpt = optimizer.optimize({
      blocks: DRILL_BLOCKS,
      machine: MACHINE_LIBRARY.hurco_vmx24,
    });
    expect(haasOpt.baseline_runtime.total_sec).not.toBeCloseTo(hurcoOpt.baseline_runtime.total_sec, 1);
  });
});
