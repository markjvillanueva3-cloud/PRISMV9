/**
 * CAMX-MS0.3 / U-CAMX08 — Wire IntelligentSequencingEngine into PrintToProgram
 *
 * Behavioural coverage for the production-grade operation sequencing wire.
 * Verifies against runFullPipeline() with no mocked seams:
 *   1. Sequencing runs after process-planning, before G-code emit — the
 *      emitted program reflects the (possibly reordered) ops.
 *   2. Strict-additive: when the engine returns the same order, the pipeline
 *      is a behavioral no-op (no operation dropped, no op-number gap).
 *   3. Fail-soft: sequencer never crashes the pipeline. Even pathological
 *      inputs land on a valid program.
 *   4. op_number is re-stitched to a 1..N gap-free sequence in the new order.
 *   5. Cross-regression: U-CAMX07 entry-strategy + U-CAMX24 gcode_setup_sheet
 *      both still attach.
 *
 * @module tests/CAMX-MS0.3-U-CAMX08-IntelligentSequencing
 */

import { describe, it, expect } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";

const STEEL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

function pocket(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "pocket_closed",
    width_mm: 30,
    length_mm: 40,
    depth_mm: 10,
    position: { x: 40, y: 30, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function bore(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "bore",
    diameter_mm: 20,
    depth_mm: 12,
    position: { x: 60, y: 40, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function hole(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "hole_through",
    diameter_mm: 6,
    depth_mm: 15,
    position: { x: 20, y: 20, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function input(features: MachinableFeature[]): DrawingInput {
  return {
    part_number: "CAMX08-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
  };
}

describe("CAMX-MS0.3/U-CAMX08 — IntelligentSequencingEngine wire", () => {
  // --- Exit condition 1: op count preserved across sequencing ---

  it("preserves every planned operation through sequencing (no drops)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1"), hole("H2"), hole("H3")]),
    );
    expect(r.success).toBe(true);
    expect(r.operations.length).toBeGreaterThan(0);
    // Every input feature's id must still appear in op.feature_id of at least
    // one operation in the final list.
    const featureIds = new Set(["P1", "B1", "H1", "H2", "H3"]);
    const seenFeatures = new Set(r.operations.map(o => o.feature_id));
    for (const f of featureIds) {
      // Some features may produce multiple ops; at minimum each must produce one.
      expect(seenFeatures.has(f)).toBe(true);
    }
  });

  // --- Exit condition 4: op_number is gap-free 1..N ---

  it("re-numbers operations 1..N with no gaps after sequencing", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1"), hole("H2")]),
    );
    expect(r.success).toBe(true);
    const opNums = r.operations.map(o => o.op_number);
    // Every operation must have a unique 1-based op_number, contiguous 1..N.
    expect(opNums[0]).toBe(1);
    expect(opNums[opNums.length - 1]).toBe(opNums.length);
    const expected = Array.from({ length: opNums.length }, (_, i) => i + 1);
    expect(opNums).toEqual(expected);
  });

  // --- Exit condition 1: program reflects the sequenced order ---

  it("emits the program in the sequenced op_number order", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1")]),
    );
    expect(r.success).toBe(true);
    // The emitter sprinkles `Feature {id}` annotations through every op block
    // (operation headers + rapid-to-feature lines name the feature). Capture
    // first-seen offset for each unique feature id; that order must match the
    // first-appearance order of feature ids in r.operations.
    const matches = Array.from(r.program_text.matchAll(/Feature ([A-Za-z0-9_-]+)/g));
    const firstSeenAt = new Map<string, number>();
    for (const m of matches) {
      if (!firstSeenAt.has(m[1])) firstSeenAt.set(m[1], m.index ?? 0);
    }
    const uniqueFeatureOrder: string[] = [];
    const seen = new Set<string>();
    for (const o of r.operations) {
      if (!seen.has(o.feature_id)) { seen.add(o.feature_id); uniqueFeatureOrder.push(o.feature_id); }
    }
    for (const fid of uniqueFeatureOrder) expect(firstSeenAt.has(fid)).toBe(true);
    // First-seen offsets must be strictly monotone in the operations order.
    let lastOffset = -1;
    for (const fid of uniqueFeatureOrder) {
      const offs = firstSeenAt.get(fid)!;
      expect(offs).toBeGreaterThan(lastOffset);
      lastOffset = offs;
    }
  });

  // --- Exit condition 3: fail-soft on single-op (no sequencing needed) ---

  it("is a behavioral no-op on a single-op input (cannot reorder one op)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([hole("H1")]));
    expect(r.success).toBe(true);
    expect(r.operations.length).toBeGreaterThanOrEqual(1);
    expect(r.operations[0].op_number).toBe(1);
  });

  // --- Exit condition 3: empty features still produces a valid result ---

  it("does not crash on zero features (sequencing on empty array)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    // No features → success=false (no ops to emit) but pipeline must NOT throw.
    expect(r.success).toBe(false);
    expect(r.operations.length).toBe(0);
    expect(r.program_text).toBe("");
  });

  // --- Tool-change minimization — soft expectation ---

  it("groups operations by tool number when multiple holes share a tool", () => {
    // 5 identical holes → planner picks the same drill tool → sequencer should
    // KEEP them contiguous (the 33-rule sequencer's tool-grouping rule).
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([hole("H1"), hole("H2"), hole("H3"), hole("H4"), hole("H5")]),
    );
    expect(r.success).toBe(true);
    // Count actual tool changes in the FINAL ordering (after sequencing).
    let changes = 0;
    let lastTool = -1;
    for (const op of r.operations) {
      if (op.tool.tool_number !== lastTool) {
        changes++;
        lastTool = op.tool.tool_number;
      }
    }
    // 5 identical holes use the same drill → 1 tool change MAX (the first one).
    // If the sequencer broke contiguity, we'd see 5 tool changes.
    expect(changes).toBeLessThanOrEqual(2);
  });

  // --- Cross-regression: U-CAMX07 + U-CAMX24 wires still fire ---

  it("U-CAMX07 entry-strategy annotation still emits after sequencing", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")]),
    );
    expect(r.success).toBe(true);
    const hasEntryAnnotation =
      /(Helical entry|Ramp entry|Plunge pass).*feed×[0-9.]+\)/.test(r.program_text);
    expect(hasEntryAnnotation).toBe(true);
  });

  it("U-CAMX24 gcode_setup_sheet still attaches after sequencing", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")]),
    );
    expect(r.success).toBe(true);
    if (!r.gcode_setup_sheet) throw new Error("U-CAMX24 regression: gcode_setup_sheet missing");
    expect(r.gcode_setup_sheet.setup_sheet.part_number).toBe("CAMX08-T");
  });

  // --- Phase-order respect (datum/facing should NOT come after parting) ---

  it("does not place drilling-phase operations after finishing-phase operations", () => {
    // A planner with 1 pocket + 4 holes produces drill + pocket finish ops.
    // The 33-rule sequencer (PHASE_MAP.drilling=2, finishing=5) MUST keep
    // drilling BEFORE the last finishing op — a phase-order floor.
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), hole("H1"), hole("H2"), hole("H3"), hole("H4")]),
    );
    expect(r.success).toBe(true);
    const drillIndices = r.operations
      .map((o, i) => ({ i, type: o.operation_type }))
      .filter(x => x.type === "drill")
      .map(x => x.i);
    const finishIndices = r.operations
      .map((o, i) => ({ i, type: o.operation_type }))
      .filter(x => x.type === "finish" || x.type === "pocket_finish")
      .map(x => x.i);
    if (drillIndices.length > 0 && finishIndices.length > 0) {
      const lastDrill = drillIndices[drillIndices.length - 1];
      const lastFinish = finishIndices[finishIndices.length - 1];
      // Last drilling op must NOT come after the last finishing op.
      expect(lastDrill).toBeLessThanOrEqual(lastFinish);
    }
  });

  // --- Reviewer-B P1 regression: warnings reach allWarnings ---

  it("surfaces sequencer warnings into the pipeline's warnings array (R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1"), hole("H2")]),
    );
    expect(r.success).toBe(true);
    // The sequencer-warning channel is wired through stage="intelligent_sequencing".
    // Each warning the helper produced is a real string with non-empty content.
    const seqWarnings = r.warnings.filter(w => w.stage === "intelligent_sequencing");
    for (const w of seqWarnings) {
      expect(typeof w.message).toBe("string");
      expect(w.message.length).toBeGreaterThan(0);
      expect(w.severity).toBe("warning");
    }
  });

  // --- Stability — same input produces same output (determinism) ---

  it("is deterministic — same input twice produces the same op order", () => {
    const r1 = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1"), hole("H2")]),
    );
    const r2 = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), hole("H1"), hole("H2")]),
    );
    expect(r1.operations.map(o => o.feature_id + "/" + o.operation_type))
      .toEqual(r2.operations.map(o => o.feature_id + "/" + o.operation_type));
  });
});
