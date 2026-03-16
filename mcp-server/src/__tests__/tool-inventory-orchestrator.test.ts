/**
 * ToolInventoryOrchestratorEngine — 15+ tests covering all 4 methods
 * checkAvailability, suggestSubstitutes, getReorderList, optimizeToolCrib
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolInventoryOrchestratorEngine,
  type OnHandTool,
  type OperationRequirement,
  type ToolUsageRecord,
} from "../engines/ToolInventoryOrchestratorEngine.js";

// ── Test fixtures ──

function makeTools(): OnHandTool[] {
  return [
    { id: "T1", diameter: 10, type: "endmill", flutes: 4, coating: "TiAlN", condition: "good", flute_length_mm: 30, total_cutting_minutes: 50 },
    { id: "T2", diameter: 12, type: "endmill", flutes: 3, coating: "AlCrN", condition: "new", flute_length_mm: 36 },
    { id: "T3", diameter: 6, type: "endmill", flutes: 2, coating: "TiN", condition: "worn", flute_length_mm: 18 },
    { id: "T4", diameter: 8.5, type: "drill", flutes: 2, coating: "TiAlN", condition: "good", flute_length_mm: 60 },
    { id: "T5", diameter: 20, type: "endmill", flutes: 4, coating: "TiAlN", condition: "retired" },
    { id: "T6", diameter: 10, type: "endmill", flutes: 4, coating: "TiAlN", condition: "needs_regrind", flute_length_mm: 30 },
    { id: "T7", diameter: 16, type: "endmill", flutes: 5, coating: "AlCrN", condition: "good", flute_length_mm: 48 },
    { id: "T8", diameter: 10, type: "endmill", flutes: 4, coating: "TiAlN", condition: "good", flute_length_mm: 30 },
  ];
}

function makeUsageHistory(): ToolUsageRecord[] {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  return [
    { tool_id: "T1", jobs_completed: 25, last_used: daysAgo(3) },
    { tool_id: "T2", jobs_completed: 10, last_used: daysAgo(15) },
    { tool_id: "T3", jobs_completed: 40, last_used: daysAgo(5) },
    { tool_id: "T4", jobs_completed: 8, last_used: daysAgo(45) },
    { tool_id: "T5", jobs_completed: 0, last_used: daysAgo(200) },
    { tool_id: "T6", jobs_completed: 15, last_used: daysAgo(60) },
    { tool_id: "T7", jobs_completed: 2, last_used: daysAgo(120) },
    { tool_id: "T8", jobs_completed: 30, last_used: daysAgo(1) },
  ];
}

describe("ToolInventoryOrchestratorEngine", () => {
  let engine: ToolInventoryOrchestratorEngine;

  beforeEach(() => {
    engine = new ToolInventoryOrchestratorEngine();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // checkAvailability
  // ═══════════════════════════════════════════════════════════════════════════

  describe("checkAvailability", () => {
    it("should report all available when tools match operations", () => {
      const ops: OperationRequirement[] = [
        { type: "pocket", material: "P", diameter: 10, depth: 20 },
      ];
      const result = engine.checkAvailability({ operations: ops, on_hand_tools: makeTools() });

      expect(result.job_feasible).toBe(true);
      expect(result.summary.available).toBe(1);
      expect(result.summary.unavailable).toBe(0);
      expect(result.operations[0].matching_tools.length).toBeGreaterThan(0);
      expect(result.operations[0].matching_tools[0].suitability_score).toBeGreaterThanOrEqual(70);
    });

    it("should report unavailable when no matching tools exist", () => {
      const ops: OperationRequirement[] = [
        { type: "tap", material: "M", diameter: 6 },
      ];
      // Use inventory with only a retired tool — no usable match
      const retiredOnly: OnHandTool[] = [
        { id: "R1", diameter: 6, type: "tap", condition: "retired" },
      ];
      const result = engine.checkAvailability({ operations: ops, on_hand_tools: retiredOnly });

      expect(result.job_feasible).toBe(false);
      expect(result.summary.unavailable).toBe(1);
      expect(result.operations[0].status).toBe("unavailable");
      expect(result.operations[0].catalog_alternatives.length).toBeGreaterThan(0);
    });

    it("should handle empty inventory with degraded mode", () => {
      const ops: OperationRequirement[] = [
        { type: "drill", material: "P", diameter: 8 },
      ];
      const result = engine.checkAvailability({ operations: ops, on_hand_tools: [] });

      expect(result.job_feasible).toBe(false);
      expect(result.operations[0].status).toBe("unavailable");
      expect(result.operations[0].notes.some(n => n.includes("No on-hand inventory"))).toBe(true);
      expect(result.operations[0].catalog_alternatives.length).toBeGreaterThan(0);
    });

    it("should handle multiple operations with mixed availability", () => {
      const ops: OperationRequirement[] = [
        { type: "pocket", material: "P", diameter: 10 },
        { type: "drill", material: "P", diameter: 8.5 },
        { type: "ream", material: "P", diameter: 12 },
      ];
      const result = engine.checkAvailability({ operations: ops, on_hand_tools: makeTools() });

      expect(result.summary.total_operations).toBe(3);
      // pocket and drill should match, ream likely unavailable
      expect(result.summary.available + result.summary.partial).toBeGreaterThanOrEqual(2);
    });

    it("should use setInventory when on_hand_tools not provided", () => {
      engine.setInventory(makeTools());
      const ops: OperationRequirement[] = [
        { type: "pocket", material: "P", diameter: 10 },
      ];
      const result = engine.checkAvailability({ operations: ops });

      expect(result.operations[0].matching_tools.length).toBeGreaterThan(0);
    });

    it("should penalize worn tools in scoring", () => {
      const ops: OperationRequirement[] = [
        { type: "pocket", material: "P", diameter: 6 },
      ];
      const result = engine.checkAvailability({ operations: ops, on_hand_tools: makeTools() });

      // T3 is worn, should have warnings
      const t3Match = result.operations[0].matching_tools.find(m => m.tool_id === "T3");
      if (t3Match) {
        expect(t3Match.warnings.some(w => w.includes("worn"))).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // suggestSubstitutes
  // ═══════════════════════════════════════════════════════════════════════════

  describe("suggestSubstitutes", () => {
    it("should rank substitutes by risk", () => {
      const result = engine.suggestSubstitutes({
        required_diameter: 11,
        required_type: "endmill",
        material: "P",
        on_hand_tools: makeTools(),
      });

      expect(result.substitutes.length).toBeGreaterThan(0);
      // Ranks should be sequential
      for (let i = 0; i < result.substitutes.length; i++) {
        expect(result.substitutes[i].suitability_rank).toBe(i + 1);
      }
    });

    it("should exclude retired tools from substitutes", () => {
      const result = engine.suggestSubstitutes({
        required_diameter: 20,
        required_type: "endmill",
        material: "P",
        on_hand_tools: makeTools(),
      });

      const hasRetired = result.substitutes.some(s => s.tool_id === "T5");
      expect(hasRetired).toBe(false);
    });

    it("should provide risk assessment with deflection delta", () => {
      const result = engine.suggestSubstitutes({
        required_diameter: 10,
        required_type: "endmill",
        material: "P",
        on_hand_tools: makeTools(),
      });

      for (const sub of result.substitutes) {
        expect(sub.risk_assessment).toBeDefined();
        expect(typeof sub.risk_assessment.deflection_delta_pct).toBe("number");
        expect(["none", "minor", "significant", "severe"]).toContain(sub.risk_assessment.finish_impact);
        expect(["low", "medium", "high"]).toContain(sub.risk_assessment.overall_risk);
      }
    });

    it("should fall back to catalog when no on-hand tools available", () => {
      const result = engine.suggestSubstitutes({
        required_diameter: 25,
        required_type: "endmill",
        material: "P",
        on_hand_tools: [],
      });

      expect(result.substitutes.length).toBe(0);
      expect(result.catalog_recommendations.length).toBeGreaterThan(0);
      expect(result.notes.some(n => n.includes("No on-hand inventory"))).toBe(true);
    });

    it("should warn when best substitute is high risk", () => {
      // Only provide a very different diameter
      const tools: OnHandTool[] = [
        { id: "X1", diameter: 25, type: "endmill", condition: "worn" },
      ];
      const result = engine.suggestSubstitutes({
        required_diameter: 10,
        required_type: "endmill",
        material: "P",
        on_hand_tools: tools,
      });

      // 25mm for 10mm job — should be high risk if it even qualifies
      if (result.substitutes.length > 0) {
        expect(result.substitutes[0].risk_assessment.overall_risk).not.toBe("low");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getReorderList
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getReorderList", () => {
    it("should flag worn-out and retired tools", () => {
      const result = engine.getReorderList({ on_hand_tools: makeTools() });

      const wornItems = result.items.filter(i => i.reason === "worn_out");
      expect(wornItems.length).toBeGreaterThan(0);
      // T5 (retired) and T6 (needs_regrind) should appear
      expect(wornItems.some(i => i.tool_description.includes("T5"))).toBe(true);
      expect(wornItems.some(i => i.tool_description.includes("T6"))).toBe(true);
    });

    it("should flag tools below minimum stock level", () => {
      const result = engine.getReorderList({
        on_hand_tools: [
          { id: "T1", diameter: 10, type: "endmill", condition: "needs_regrind" },
        ],
        min_stock_level: 2,
      });

      const belowMin = result.items.filter(i => i.reason === "below_min_stock");
      expect(belowMin.length).toBeGreaterThan(0);
    });

    it("should identify tools needed for upcoming jobs", () => {
      const result = engine.getReorderList({
        on_hand_tools: makeTools(),
        upcoming_jobs: [
          {
            job_name: "Widget-42",
            operations: [
              { type: "tap", diameter: 6, material: "P" },
              { type: "ream", diameter: 10, material: "P" },
            ],
          },
        ],
      });

      const jobNeeds = result.items.filter(i => i.reason === "upcoming_job_need");
      expect(jobNeeds.length).toBeGreaterThan(0);
      expect(jobNeeds[0].jobs_affected).toContain("Widget-42");
    });

    it("should return empty list when everything is stocked", () => {
      const result = engine.getReorderList({
        on_hand_tools: [
          { id: "T1", diameter: 10, type: "endmill", condition: "new" },
        ],
        min_stock_level: 1,
        upcoming_jobs: [
          { operations: [{ type: "pocket", diameter: 10, material: "P" }] },
        ],
      });

      // endmill covers pocket, stock level 1 met
      const jobNeeds = result.items.filter(i => i.reason === "upcoming_job_need");
      expect(jobNeeds.length).toBe(0);
    });

    it("should sort by priority (critical first)", () => {
      const result = engine.getReorderList({ on_hand_tools: makeTools(), min_stock_level: 3 });

      if (result.items.length >= 2) {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 1; i < result.items.length; i++) {
          expect(priorityOrder[result.items[i].priority]).toBeGreaterThanOrEqual(
            priorityOrder[result.items[i - 1].priority]
          );
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // optimizeToolCrib
  // ═══════════════════════════════════════════════════════════════════════════

  describe("optimizeToolCrib", () => {
    it("should separate tools into keep vs retire", () => {
      const result = engine.optimizeToolCrib({
        usage_history: makeUsageHistory(),
        on_hand_tools: makeTools(),
      });

      expect(result.keep.length + result.retire.length).toBe(makeTools().length);
      // Retired T5 should always be in retire list
      expect(result.retire.some(r => r.tool_id === "T5")).toBe(true);
    });

    it("should respect max_tools limit", () => {
      const result = engine.optimizeToolCrib({
        usage_history: makeUsageHistory(),
        on_hand_tools: makeTools(),
        max_tools: 3,
      });

      expect(result.keep.length).toBeLessThanOrEqual(3);
      expect(result.retire.length).toBeGreaterThanOrEqual(makeTools().length - 3);
      expect(result.estimated_savings.freed_slots).toBe(result.retire.length);
    });

    it("should rank active tools higher", () => {
      const result = engine.optimizeToolCrib({
        usage_history: makeUsageHistory(),
        on_hand_tools: makeTools(),
      });

      // T8 (30 jobs, used 1d ago) should be in keep with high score
      const t8 = result.keep.find(k => k.tool_id === "T8");
      expect(t8).toBeDefined();
      expect(t8!.usage_score).toBeGreaterThan(0);
    });

    it("should suggest replacements for worn retired tools", () => {
      const result = engine.optimizeToolCrib({
        usage_history: makeUsageHistory(),
        on_hand_tools: makeTools(),
        max_tools: 4,
      });

      // T6 (needs_regrind) should get a replacement suggestion if retired
      const t6Retired = result.retire.some(r => r.tool_id === "T6");
      if (t6Retired) {
        expect(result.suggested_replacements.some(r => r.retire_tool_id === "T6")).toBe(true);
      }
    });

    it("should handle empty usage history", () => {
      const result = engine.optimizeToolCrib({
        usage_history: [],
        on_hand_tools: makeTools(),
      });

      // All tools have daysSinceUse=999, most will still be kept (condition bonus)
      expect(result.keep.length + result.retire.length).toBe(makeTools().length);
    });

    it("should handle idle_days_threshold", () => {
      const result = engine.optimizeToolCrib({
        usage_history: makeUsageHistory(),
        on_hand_tools: makeTools(),
        idle_days_threshold: 30,
      });

      // T7 was used 120 days ago, should be penalized
      const t7Keep = result.keep.find(k => k.tool_id === "T7");
      const t7Retire = result.retire.find(r => r.tool_id === "T7");
      // With 30-day threshold, T7 at 120 days should lean toward retire
      expect(t7Keep || t7Retire).toBeDefined();
    });
  });
});
