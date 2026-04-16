import { describe, it, expect } from "vitest";
import { IntelligentSequencingEngine } from "../engines/IntelligentSequencingEngine.js";

const engine = new IntelligentSequencingEngine();

describe("IntelligentSequencingEngine", () => {
  it("sequences datum facing before roughing", () => {
    const result = engine.sequence([
      { id: "rough-1", type: "roughing", operation: "roughing" },
      { id: "face-1", type: "facing", operation: "facing", is_datum: true },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("face-1")).toBeLessThan(ids.indexOf("rough-1"));
    expect(result.rules_applied).toContain("datum_first");
  });

  it("sequences roughing before finishing", () => {
    const result = engine.sequence([
      { id: "finish-1", type: "finishing", operation: "finishing" },
      { id: "rough-1", type: "roughing", operation: "roughing" },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("rough-1")).toBeLessThan(ids.indexOf("finish-1"));
    expect(result.rules_applied).toContain("rough_all_before_finish_any");
  });

  it("sequences drill → ream → tap for holes", () => {
    const pos = { x: 10, y: 10, z: 0 };
    const result = engine.sequence([
      { id: "tap-1", type: "tapping", operation: "tapping", position: pos },
      { id: "ream-1", type: "reaming", operation: "reaming", position: pos },
      { id: "drill-1", type: "drilling", operation: "drilling", position: pos },
      { id: "cdrill-1", type: "center_drill", operation: "center_drill", position: pos },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("cdrill-1")).toBeLessThan(ids.indexOf("drill-1"));
    expect(ids.indexOf("drill-1")).toBeLessThan(ids.indexOf("ream-1"));
    expect(ids.indexOf("ream-1")).toBeLessThan(ids.indexOf("tap-1"));
  });

  it("groups same-tool operations together", () => {
    const result = engine.sequence([
      { id: "a", type: "roughing", operation: "roughing", tool_id: "T01" },
      { id: "b", type: "roughing", operation: "roughing", tool_id: "T02" },
      { id: "c", type: "roughing", operation: "roughing", tool_id: "T01" },
    ]);
    const ids = result.operations.map(o => o.id);
    // T01 ops should be adjacent
    const aIdx = ids.indexOf("a");
    const cIdx = ids.indexOf("c");
    expect(Math.abs(aIdx - cIdx)).toBe(1);
    expect(result.rules_applied).toContain("tool_grouping_tsp");
  });

  it("puts parting operation last", () => {
    const result = engine.sequence([
      { id: "part-1", type: "parting", operation: "parting" },
      { id: "rough-1", type: "roughing", operation: "roughing" },
      { id: "finish-1", type: "finishing", operation: "finishing" },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids[ids.length - 1]).toBe("part-1");
  });

  it("inserts thermal relaxation gap between rough and finish", () => {
    const result = engine.sequence([
      { id: "rough-1", type: "roughing", operation: "roughing" },
      { id: "finish-1", type: "finishing", operation: "finishing" },
    ]);
    expect(result.thermal_gaps_inserted).toBeGreaterThanOrEqual(1);
    const types = result.operations.map(o => o.type);
    expect(types).toContain("thermal_wait");
  });

  it("inserts probe point after roughing before finishing", () => {
    const result = engine.sequence([
      { id: "rough-1", type: "roughing", operation: "roughing" },
      { id: "rest-1", type: "rest", operation: "rest" },
    ]);
    expect(result.probe_points_inserted).toBeGreaterThanOrEqual(1);
    const types = result.operations.map(o => o.type);
    expect(types).toContain("probing");
  });

  it("orders shallow features before deep", () => {
    const result = engine.sequence([
      { id: "deep", type: "roughing", operation: "roughing", depth_mm: 30 },
      { id: "shallow", type: "roughing", operation: "roughing", depth_mm: 5 },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("shallow")).toBeLessThan(ids.indexOf("deep"));
    expect(result.rules_applied).toContain("z_level_shallow_first");
  });

  it("respects explicit dependencies", () => {
    const result = engine.sequence([
      { id: "b", type: "drilling", operation: "drilling", requires_ops: ["a"] },
      { id: "a", type: "facing", operation: "facing" },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("b"));
  });

  it("orders 3+2 indexed before simultaneous 5-axis", () => {
    const result = engine.sequence([
      { id: "sim5", type: "finishing", operation: "finishing", axes_required: 5 },
      { id: "idx3", type: "finishing", operation: "finishing", axes_required: 3 },
    ]);
    const ids = result.operations.map(o => o.id);
    expect(ids.indexOf("idx3")).toBeLessThan(ids.indexOf("sim5"));
  });

  it("handles 50+ operations efficiently", () => {
    const ops = Array.from({ length: 50 }, (_, i) => ({
      id: `op-${i}`,
      type: i < 10 ? "facing" : i < 30 ? "roughing" : i < 40 ? "drilling" : "finishing",
      operation: i < 10 ? "facing" : i < 30 ? "roughing" : i < 40 ? "drilling" : "finishing",
      tool_diameter_mm: 6 + (i % 5) * 4,
      depth_mm: 5 + (i % 8) * 3,
      position: { x: (i % 8) * 15, y: Math.floor(i / 8) * 15, z: 0 },
    }));

    const t0 = Date.now();
    const result = engine.sequence(ops);
    const elapsed = Date.now() - t0;

    expect(result.operations.length).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(1000);
    expect(result.sequence_quality_score).toBeGreaterThan(50);
    expect(result.rules_applied.length).toBeGreaterThan(5);
  });

  it("produces quality score above 70 for well-structured input", () => {
    const result = engine.sequence([
      { id: "face", type: "facing", operation: "facing", is_datum: true },
      { id: "rough", type: "roughing", operation: "roughing" },
      { id: "drill", type: "drilling", operation: "drilling" },
      { id: "finish", type: "finishing", operation: "finishing" },
    ]);
    expect(result.sequence_quality_score).toBeGreaterThanOrEqual(70);
  });

  it("reports tool change count and savings", () => {
    const result = engine.sequence([
      { id: "a", type: "roughing", operation: "roughing", tool_id: "T01" },
      { id: "b", type: "roughing", operation: "roughing", tool_id: "T02" },
      { id: "c", type: "roughing", operation: "roughing", tool_id: "T01" },
      { id: "d", type: "roughing", operation: "roughing", tool_id: "T02" },
    ]);
    // With grouping, should be 1 change (T01→T02) not 3
    expect(result.tool_changes).toBeLessThanOrEqual(2);
  });
});
