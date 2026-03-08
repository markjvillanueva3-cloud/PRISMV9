/**
 * OperationSequencerEngine Tests — CAMK-MS3/U02
 * Tests optimal operation ordering with tool change minimization
 */
import { describe, it, expect } from "vitest";
import { operationSequencerEngine } from "../engines/OperationSequencerEngine.js";

function makeOp(id: string, type: any, toolId: string, opts: any = {}) {
  return {
    id, type, tool_id: toolId, tool_diameter_mm: opts.diameter ?? 10,
    estimated_time_sec: opts.time ?? 60, feature_id: opts.feature,
    setup_id: opts.setup, depends_on: opts.depends,
    mrr_mm3_per_min: opts.mrr, surface_requirement_ra_um: opts.ra,
    priority: opts.priority,
  };
}

describe("OperationSequencerEngine", () => {
  // ---- Basic sequencing ----
  it("sequences operations respecting dependencies", () => {
    const ops = [
      makeOp("finish1", "finishing", "T2", { feature: "pocket1", depends: ["rough1"] }),
      makeOp("rough1", "roughing", "T1", { feature: "pocket1" }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence[0].id).toBe("rough1");
    expect(result.sequence[1].id).toBe("finish1");
  });

  // ---- Tool change minimization ----
  it("groups same-tool operations to minimize changes", () => {
    const ops = [
      makeOp("op1", "roughing", "T1"),
      makeOp("op2", "roughing", "T2"),
      makeOp("op3", "roughing", "T1"),
      makeOp("op4", "roughing", "T2"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    // Tool grouping should reduce changes from 3 (alternating) to 1
    expect(result.tool_changes).toBeLessThanOrEqual(2);
  });

  // ---- Thermal relaxation ----
  it("adds thermal wait between roughing and finishing on same feature", () => {
    const ops = [
      makeOp("rough1", "roughing", "T1", { feature: "f1" }),
      makeOp("finish1", "finishing", "T2", { feature: "f1" }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.thermal_wait_time_sec).toBeGreaterThan(0);
    expect(result.sequence[1].wait_before_sec).toBeGreaterThan(0);
  });

  it("no thermal wait when disabled", () => {
    const ops = [
      makeOp("rough1", "roughing", "T1", { feature: "f1" }),
      makeOp("finish1", "finishing", "T2", { feature: "f1" }),
    ];
    const result = operationSequencerEngine.sequence({
      operations: ops, optimize_thermal: false,
    });
    expect(result.thermal_wait_time_sec).toBe(0);
  });

  // ---- Implicit type ordering per feature ----
  it("orders roughing → semi-finish → finishing per feature automatically", () => {
    const ops = [
      makeOp("finish", "finishing", "T3", { feature: "f1" }),
      makeOp("semi", "semi_finish", "T2", { feature: "f1" }),
      makeOp("rough", "roughing", "T1", { feature: "f1" }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    const ids = result.sequence.map(s => s.id);
    expect(ids.indexOf("rough")).toBeLessThan(ids.indexOf("semi"));
    expect(ids.indexOf("semi")).toBeLessThan(ids.indexOf("finish"));
  });

  // ---- 5+ operation program ----
  it("handles 5+ operation program", () => {
    const ops = [
      makeOp("rough_pocket", "roughing", "T1", { feature: "pocket", time: 120 }),
      makeOp("rough_slot", "roughing", "T1", { feature: "slot", time: 60 }),
      makeOp("semi_pocket", "semi_finish", "T2", { feature: "pocket", time: 90 }),
      makeOp("finish_pocket", "finishing", "T3", { feature: "pocket", time: 60 }),
      makeOp("drill_holes", "drilling", "T4", { time: 30 }),
      makeOp("deburr", "deburr", "T5", { time: 20 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence).toHaveLength(6);
    expect(result.total_time_sec).toBeGreaterThan(0);
    // Roughing before finishing
    const roughIdx = result.sequence.findIndex(s => s.id === "rough_pocket");
    const finishIdx = result.sequence.findIndex(s => s.id === "finish_pocket");
    expect(roughIdx).toBeLessThan(finishIdx);
  });

  // ---- Fixture-aware sequencing ----
  it("groups operations by setup", () => {
    const ops = [
      makeOp("op1_s1", "roughing", "T1", { setup: "setup1" }),
      makeOp("op2_s2", "roughing", "T1", { setup: "setup2" }),
      makeOp("op3_s1", "finishing", "T2", { setup: "setup1" }),
      makeOp("op4_s2", "finishing", "T2", { setup: "setup2" }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    // Setup 1 ops should be grouped together
    const s1Indices = result.sequence
      .filter(s => s.setup_id === "setup1")
      .map(s => s.sequence);
    const s2Indices = result.sequence
      .filter(s => s.setup_id === "setup2")
      .map(s => s.sequence);
    // All setup1 indices should be before all setup2 indices (or vice versa)
    const s1Max = Math.max(...s1Indices);
    const s2Min = Math.min(...s2Indices);
    expect(s1Max < s2Min || Math.max(...s2Indices) < Math.min(...s1Indices)).toBe(true);
  });

  // ---- Total time calculation ----
  it("total time = cutting + tool changes + thermal waits", () => {
    const ops = [
      makeOp("rough", "roughing", "T1", { feature: "f1", time: 100 }),
      makeOp("finish", "finishing", "T2", { feature: "f1", time: 50 }),
    ];
    const result = operationSequencerEngine.sequence({
      operations: ops, tool_change_time_sec: 8,
    });
    const expected = result.cutting_time_sec + result.tool_change_time_sec + result.thermal_wait_time_sec;
    expect(result.total_time_sec).toBeCloseTo(expected, 5);
  });

  // ---- Tool change time ----
  it("counts correct tool changes", () => {
    const ops = [
      makeOp("op1", "roughing", "T1"),
      makeOp("op2", "roughing", "T1"),
      makeOp("op3", "roughing", "T2"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.tool_changes).toBe(1); // T1→T1 (no change), T1→T2 (1 change)
  });

  // ---- Optimization score ----
  it("computes optimization score", () => {
    const ops = [
      makeOp("op1", "roughing", "T1", { time: 60 }),
      makeOp("op2", "finishing", "T1", { time: 60 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.optimization_score).toBeGreaterThan(0);
    expect(result.optimization_score).toBeLessThanOrEqual(100);
  });

  // ---- Quick estimate ----
  it("quickEstimate returns tool changes and time", () => {
    const ops = [
      makeOp("op1", "roughing", "T1"),
      makeOp("op2", "roughing", "T2"),
    ];
    const quick = operationSequencerEngine.quickEstimate(ops);
    expect(quick.tool_changes).toBeGreaterThanOrEqual(0);
    expect(quick.estimated_min).toBeGreaterThan(0);
  });

  // ---- Empty operations ----
  it("handles empty operations", () => {
    const result = operationSequencerEngine.sequence({ operations: [] });
    expect(result.sequence).toHaveLength(0);
    expect(result.total_time_sec).toBe(0);
    expect(result.optimization_score).toBe(100);
  });

  // ---- Single operation ----
  it("handles single operation", () => {
    const ops = [makeOp("only", "roughing", "T1", { time: 120 })];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence).toHaveLength(1);
    expect(result.tool_changes).toBe(0);
  });

  // ---- High MRR before precision ----
  it("detects thermal need for high MRR before precision finish", () => {
    const ops = [
      makeOp("rough", "roughing", "T1", { mrr: 100 }),
      makeOp("finish", "finishing", "T2", { ra: 0.8 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.thermal_wait_time_sec).toBeGreaterThan(0);
  });

  // ---- Notes generation ----
  it("generates optimization notes", () => {
    const ops = [
      makeOp("rough", "roughing", "T1", { feature: "f1", time: 100 }),
      makeOp("finish", "finishing", "T2", { feature: "f1", time: 50 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(Array.isArray(result.notes)).toBe(true);
  });
});
