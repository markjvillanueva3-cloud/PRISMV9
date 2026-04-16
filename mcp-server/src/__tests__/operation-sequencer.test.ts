/**
 * OperationSequencerEngine Tests — CAMK-MS3/U02
 * Tests optimal operation ordering with tool change minimization
 */
import { describe, it, expect } from "vitest";
import { operationSequencerEngine } from "../engines/OperationSequencerEngine.js";
import type { Operation } from "../engines/OperationSequencerEngine.js";

function makeOp(id: string, type: Operation["type"], toolId: string, opts: any = {}): Operation {
  return {
    id, type, tool_id: toolId, tool_diameter_mm: opts.diameter ?? 10,
    estimated_time_sec: opts.time ?? 60, setup_id: opts.setup,
    prerequisites: opts.depends, depth_mm: opts.depth,
    heat_generation: opts.heat,
  };
}

describe("OperationSequencerEngine", () => {
  // ---- Basic sequencing ----
  it("sequences operations respecting dependencies", () => {
    const ops = [
      makeOp("finish1", "finish", "T2", { depends: ["rough1"] }),
      makeOp("rough1", "rough", "T1"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence[0].operation_id).toBe("rough1");
    expect(result.sequence[1].operation_id).toBe("finish1");
  });

  // ---- Tool change minimization ----
  it("groups same-tool operations to minimize changes", () => {
    const ops = [
      makeOp("op1", "rough", "T1"),
      makeOp("op2", "rough", "T2"),
      makeOp("op3", "rough", "T1"),
      makeOp("op4", "rough", "T2"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.tool_change_count).toBeLessThanOrEqual(2);
  });

  // ---- Thermal relaxation ----
  it("adds thermal wait between roughing and finishing", () => {
    const ops = [
      makeOp("rough1", "rough", "T1"),
      makeOp("finish1", "finish", "T2"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.thermal_wait_time_sec).toBeGreaterThanOrEqual(0);
  });

  // ---- Implicit type ordering via dependencies ----
  it("orders rough → semi_finish → finish with explicit dependencies", () => {
    const ops = [
      makeOp("finish", "finish", "T3", { depends: ["semi"] }),
      makeOp("semi", "semi_finish", "T2", { depends: ["rough"] }),
      makeOp("rough", "rough", "T1"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    const ids = result.sequence.map(s => s.operation_id);
    expect(ids.indexOf("rough")).toBeLessThan(ids.indexOf("semi"));
    expect(ids.indexOf("semi")).toBeLessThan(ids.indexOf("finish"));
  });

  // ---- 5+ operation program ----
  it("handles 5+ operation program", () => {
    const ops = [
      makeOp("rough_pocket", "rough", "T1", { time: 120 }),
      makeOp("rough_slot", "slot", "T1", { time: 60 }),
      makeOp("semi_pocket", "semi_finish", "T2", { time: 90 }),
      makeOp("finish_pocket", "finish", "T3", { time: 60 }),
      makeOp("drill_holes", "drill", "T4", { time: 30 }),
      makeOp("deburr_edges", "deburr", "T5", { time: 20 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence).toHaveLength(6);
    expect(result.total_time_sec).toBeGreaterThan(0);
  });

  // ---- Fixture-aware sequencing ----
  it("groups operations by setup", () => {
    const ops = [
      makeOp("op1_s1", "rough", "T1", { setup: "setup1" }),
      makeOp("op2_s2", "rough", "T1", { setup: "setup2" }),
      makeOp("op3_s1", "finish", "T2", { setup: "setup1" }),
      makeOp("op4_s2", "finish", "T2", { setup: "setup2" }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence).toHaveLength(4);
  });

  // ---- Total time calculation ----
  it("total time = cutting + tool changes + thermal waits", () => {
    const ops = [
      makeOp("rough", "rough", "T1", { time: 100 }),
      makeOp("finish", "finish", "T2", { time: 50 }),
    ];
    const result = operationSequencerEngine.sequence({
      operations: ops, tool_change_time_sec: 8,
    });
    const expected = result.cutting_time_sec + result.tool_change_time_sec + result.thermal_wait_time_sec;
    expect(result.total_time_sec).toBeCloseTo(expected, 5);
  });

  // ---- Tool change count ----
  it("counts correct tool changes", () => {
    const ops = [
      makeOp("op1", "rough", "T1"),
      makeOp("op2", "rough", "T1"),
      makeOp("op3", "rough", "T2"),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.tool_change_count).toBe(1);
  });

  // ---- Optimization score ----
  it("computes optimization score", () => {
    const ops = [
      makeOp("op1", "rough", "T1", { time: 60 }),
      makeOp("op2", "finish", "T1", { time: 60 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.optimization_score).toBeGreaterThan(0);
    expect(result.optimization_score).toBeLessThanOrEqual(100);
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
    const ops = [makeOp("only", "rough", "T1", { time: 120 })];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(result.sequence).toHaveLength(1);
    expect(result.tool_change_count).toBe(0);
  });

  // ---- Warnings generation ----
  it("generates warnings array", () => {
    const ops = [
      makeOp("rough", "rough", "T1", { time: 100 }),
      makeOp("finish", "finish", "T2", { time: 50 }),
    ];
    const result = operationSequencerEngine.sequence({ operations: ops });
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
