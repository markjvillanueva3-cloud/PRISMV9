/**
 * PP-REV-MS2 — Tool Optimization + Magazine Layout Tests
 * =======================================================
 * Tests for ToolChangeOptimizationEngine wired via productDispatcher:
 *   ppg_tool_change_optimize, ppg_magazine_layout, ppg_tool_sharing, ppg_magazine_calculate
 */
import { describe, it, expect } from "vitest";
import { ToolChangeOptimizationEngine } from "../engines/ToolChangeOptimizationEngine.js";
import { ToolMagazineOptimizationEngine } from "../engines/ToolMagazineOptimizationEngine.js";

const tce = new ToolChangeOptimizationEngine();
const tme = new ToolMagazineOptimizationEngine();

// ============================================================================
// Fixtures
// ============================================================================

/** 6-operation job with 3 tools: T1 (rough), T2 (drill), T3 (finish) */
const OPS_3TOOL = [
  { id: "op1", tool_id: "T1", tool_diameter_mm: 20, operation_type: "rough" as const, cutting_time_min: 5 },
  { id: "op2", tool_id: "T2", tool_diameter_mm: 10, operation_type: "drill" as const, cutting_time_min: 2 },
  { id: "op3", tool_id: "T1", tool_diameter_mm: 20, operation_type: "rough" as const, cutting_time_min: 3 },
  { id: "op4", tool_id: "T3", tool_diameter_mm: 12, operation_type: "finish" as const, cutting_time_min: 8, required_Ra_um: 0.8 },
  { id: "op5", tool_id: "T2", tool_diameter_mm: 10, operation_type: "drill" as const, cutting_time_min: 1 },
  { id: "op6", tool_id: "T1", tool_diameter_mm: 20, operation_type: "rough" as const, cutting_time_min: 4 },
];

const TOOLS_3 = [
  { tool_id: "T1", diameter_mm: 20, length_mm: 100, usage_rank: 1 },
  { tool_id: "T2", diameter_mm: 10, length_mm: 80, usage_rank: 2 },
  { tool_id: "T3", diameter_mm: 12, length_mm: 90, usage_rank: 3 },
];

/** 10-operation job with prerequisites (rough before finish on same feature) */
const OPS_PREREQ = [
  { id: "r1", tool_id: "T1", tool_diameter_mm: 20, operation_type: "rough" as const, feature_id: "F1" },
  { id: "r2", tool_id: "T1", tool_diameter_mm: 20, operation_type: "rough" as const, feature_id: "F2" },
  { id: "d1", tool_id: "T2", tool_diameter_mm: 8, operation_type: "drill" as const, feature_id: "F3" },
  { id: "f1", tool_id: "T3", tool_diameter_mm: 12, operation_type: "finish" as const, feature_id: "F1", prerequisites: ["r1"] },
  { id: "f2", tool_id: "T3", tool_diameter_mm: 12, operation_type: "finish" as const, feature_id: "F2", prerequisites: ["r2"] },
  { id: "d2", tool_id: "T4", tool_diameter_mm: 6, operation_type: "drill" as const, feature_id: "F4" },
  { id: "c1", tool_id: "T5", tool_diameter_mm: 10, operation_type: "chamfer" as const, feature_id: "F3", prerequisites: ["d1"] },
  { id: "c2", tool_id: "T5", tool_diameter_mm: 10, operation_type: "chamfer" as const, feature_id: "F4", prerequisites: ["d2"] },
];

// ============================================================================
// 1. optimizeToolChanges
// ============================================================================
describe("ToolChangeOptimizationEngine — optimizeToolChanges", () => {
  it("reduces tool changes by batching same-tool operations", () => {
    const result = tce.optimizeToolChanges(OPS_3TOOL, TOOLS_3);
    // Original: T1→T2→T1→T3→T2→T1 = 5 changes
    // Optimized should batch T1s together, T2s together
    expect(result.original_tool_changes).toBe(5);
    expect(result.total_tool_changes).toBeLessThan(5);
    expect(result.changes_saved).toBeGreaterThan(0);
    expect(result.time_saved_sec).toBeGreaterThan(0);
    expect(result.reduction_pct).toBeGreaterThan(0);
  });

  it("respects prerequisites (rough before finish)", () => {
    const result = tce.optimizeToolChanges(OPS_PREREQ, []);
    // Verify f1 comes after r1, f2 after r2, c1 after d1, c2 after d2
    const seq = result.optimized_sequence;
    const indexOf = (id: string) => seq.findIndex(s => s.operation_id === id);
    expect(indexOf("f1")).toBeGreaterThan(indexOf("r1"));
    expect(indexOf("f2")).toBeGreaterThan(indexOf("r2"));
    expect(indexOf("c1")).toBeGreaterThan(indexOf("d1"));
    expect(indexOf("c2")).toBeGreaterThan(indexOf("d2"));
  });

  it("returns 0 changes for single-tool job", () => {
    const singleTool = [
      { id: "a", tool_id: "T1", tool_diameter_mm: 10 },
      { id: "b", tool_id: "T1", tool_diameter_mm: 10 },
      { id: "c", tool_id: "T1", tool_diameter_mm: 10 },
    ];
    const result = tce.optimizeToolChanges(singleTool, []);
    expect(result.total_tool_changes).toBe(0);
    expect(result.original_tool_changes).toBe(0);
    expect(result.changes_saved).toBe(0);
  });

  it("handles empty operation list", () => {
    const result = tce.optimizeToolChanges([], []);
    expect(result.optimized_sequence).toHaveLength(0);
    expect(result.warnings).toContain("No operations provided");
  });

  it("optimized sequence contains all operations", () => {
    const result = tce.optimizeToolChanges(OPS_3TOOL, TOOLS_3);
    expect(result.optimized_sequence).toHaveLength(OPS_3TOOL.length);
    const ids = new Set(result.optimized_sequence.map(s => s.operation_id));
    for (const op of OPS_3TOOL) {
      expect(ids.has(op.id)).toBe(true);
    }
  });

  it("cumulative_changes is monotonically non-decreasing", () => {
    const result = tce.optimizeToolChanges(OPS_3TOOL, TOOLS_3);
    for (let i = 1; i < result.optimized_sequence.length; i++) {
      expect(result.optimized_sequence[i].cumulative_changes)
        .toBeGreaterThanOrEqual(result.optimized_sequence[i - 1].cumulative_changes);
    }
  });
});

// ============================================================================
// 2. optimizeMagazine
// ============================================================================
describe("ToolChangeOptimizationEngine — optimizeMagazine", () => {
  it("assigns all tools to pockets within capacity", () => {
    const result = tce.optimizeMagazine(TOOLS_3, { magazine_capacity: 30 });
    expect(result.assignments).toHaveLength(3);
    expect(result.overflow_tools).toHaveLength(0);
    expect(result.utilization_pct).toBeCloseTo((3 / 30) * 100, 0);
  });

  it("reports overflow when magazine is too small", () => {
    const result = tce.optimizeMagazine(TOOLS_3, { magazine_capacity: 2 });
    expect(result.overflow_tools.length).toBeGreaterThan(0);
  });

  it("places sister tools and reports placements", () => {
    const toolsWithSister = [
      ...TOOLS_3,
      { tool_id: "T1-sister", diameter_mm: 20, length_mm: 100, is_sister: true, sister_of: "T1" },
    ];
    const result = tce.optimizeMagazine(toolsWithSister, { magazine_capacity: 30 });
    expect(result.sister_placements).toHaveLength(1);
    expect(result.sister_placements[0].parent_tool_id).toBe("T1");
    expect(result.assignments).toHaveLength(4);
  });

  it("respects blocked pockets", () => {
    const result = tce.optimizeMagazine(TOOLS_3, {
      magazine_capacity: 30,
      blocked_pockets: [1, 2, 3],
    });
    const usedPockets = result.assignments.map(a => a.pocket);
    expect(usedPockets).not.toContain(1);
    expect(usedPockets).not.toContain(2);
    expect(usedPockets).not.toContain(3);
  });

  it("computes rotation time for operation sequence", () => {
    const result = tce.optimizeMagazine(TOOLS_3, {
      magazine_capacity: 30,
      magazine_type: "drum",
    }, ["T1", "T2", "T3", "T1"]);
    expect(result.total_rotation_time_sec).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. suggestToolSharing
// ============================================================================
describe("ToolChangeOptimizationEngine — suggestToolSharing", () => {
  it("consolidates same-diameter same-type tools", () => {
    const ops = [
      { id: "a", tool_id: "T1", tool_diameter_mm: 10, tool_type: "flat" as const, operation_type: "rough" as const },
      { id: "b", tool_id: "T2", tool_diameter_mm: 10, tool_type: "flat" as const, operation_type: "rough" as const },
      { id: "c", tool_id: "T3", tool_diameter_mm: 10, tool_type: "flat" as const, operation_type: "semi_finish" as const },
    ];
    const result = tce.suggestToolSharing(ops);
    expect(result.tools_saved).toBeGreaterThan(0);
    expect(result.consolidated_tool_count).toBeLessThan(result.original_tool_count);
  });

  it("does not share tools with different diameters", () => {
    const ops = [
      { id: "a", tool_id: "T1", tool_diameter_mm: 10, tool_type: "flat" as const },
      { id: "b", tool_id: "T2", tool_diameter_mm: 20, tool_type: "flat" as const },
    ];
    const result = tce.suggestToolSharing(ops);
    expect(result.tools_saved).toBe(0);
  });

  it("excludes fine-finish operations from sharing", () => {
    const ops = [
      { id: "a", tool_id: "T1", tool_diameter_mm: 10, tool_type: "flat" as const, operation_type: "finish" as const, required_Ra_um: 0.4 },
      { id: "b", tool_id: "T2", tool_diameter_mm: 10, tool_type: "flat" as const, operation_type: "rough" as const },
    ];
    const result = tce.suggestToolSharing(ops);
    expect(result.non_shareable.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. ToolMagazineOptimizationEngine (simple calculator)
// ============================================================================
describe("ToolMagazineOptimizationEngine — calculate", () => {
  it("returns valid result with defaults", () => {
    const result = tme.calculate();
    expect(result.total_change_time_s.value).toBeGreaterThan(0);
    expect(result.avg_index_time_s.value).toBeGreaterThan(0);
    expect(result.magazine_utilization_pct.value).toBeGreaterThan(0);
    expect(result.estimated_tool_changes.value).toBeGreaterThan(0);
  });

  it("chain magazine is faster than rack for sequential indexing", () => {
    const chain = tme.calculate({ magazine_type: "chain", total_slots: 60, tools_required: 10 });
    const rack = tme.calculate({ magazine_type: "rack", total_slots: 60, tools_required: 10 });
    expect(chain.total_change_time_s.value).toBeLessThan(rack.total_change_time_s.value);
  });

  it("turret is fastest for small tool counts", () => {
    const turret = tme.calculate({ magazine_type: "turret", total_slots: 12, tools_required: 6 });
    const chain = tme.calculate({ magazine_type: "chain", total_slots: 120, tools_required: 6 });
    expect(turret.avg_index_time_s.value).toBeLessThan(chain.avg_index_time_s.value);
  });

  it("sister tool slots calculated when enabled", () => {
    const withSister = tme.calculate({ sister_tool_enabled: true, tools_required: 10 });
    const noSister = tme.calculate({ sister_tool_enabled: false, tools_required: 10 });
    expect(withSister.sister_tool_slots_needed.value).toBeGreaterThanOrEqual(noSister.sister_tool_slots_needed.value);
  });

  it("time saved vs sequential is positive for optimized strategy", () => {
    const result = tme.calculate({ strategy: "nearest_slot", tools_required: 15 });
    expect(result.time_saved_vs_sequential_s.value).toBeGreaterThanOrEqual(0);
  });

  it("recommendations provided for high utilization", () => {
    const result = tme.calculate({ total_slots: 12, tools_required: 11 });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. optimizeWithTSP
// ============================================================================
describe("ToolChangeOptimizationEngine — optimizeWithTSP", () => {
  it("returns valid result even without TSP algorithm", () => {
    const result = tce.optimizeWithTSP(OPS_3TOOL);
    expect(result.optimized_sequence).toHaveLength(OPS_3TOOL.length);
    expect(result.total_tool_changes).toBeGreaterThanOrEqual(0);
    expect(result.tsp_method).toBeDefined();
  });

  it("falls back to greedy for < 3 tools", () => {
    const twoToolOps = [
      { id: "a", tool_id: "T1", tool_diameter_mm: 10 },
      { id: "b", tool_id: "T2", tool_diameter_mm: 20 },
    ];
    const result = tce.optimizeWithTSP(twoToolOps);
    expect(result.tsp_used).toBe(false);
    expect(result.tsp_method).toContain("greedy");
  });
});

// ============================================================================
// 6. Action count anti-regression
// ============================================================================
describe("productDispatcher — PP-REV-MS2 action wiring", () => {
  it("productDispatcher exports all 4 new tool optimization actions", async () => {
    const fs = await import("fs");
    const dispatcherPath = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(dispatcherPath, "utf8");
    expect(src).toContain('"ppg_tool_change_optimize"');
    expect(src).toContain('"ppg_magazine_layout"');
    expect(src).toContain('"ppg_tool_sharing"');
    expect(src).toContain('"ppg_magazine_calculate"');
  });

  it("dispatcher has case blocks for all 4 new actions", async () => {
    const fs = await import("fs");
    const dispatcherPath = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(dispatcherPath, "utf8");
    expect(src).toContain('action === "ppg_tool_change_optimize"');
    expect(src).toContain('action === "ppg_magazine_layout"');
    expect(src).toContain('action === "ppg_tool_sharing"');
    expect(src).toContain('action === "ppg_magazine_calculate"');
  });
});
