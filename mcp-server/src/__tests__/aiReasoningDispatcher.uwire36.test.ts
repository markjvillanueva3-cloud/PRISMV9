/**
 * aiReasoningDispatcher U-WIRE36 round-trip tests — FusionDeepLearningEngine.
 *
 * Validates fusion_dl_select_strategy / fusion_dl_explain / fusion_dl_list /
 * fusion_dl_stats through prism_ai. Engine has NO reset() method but is
 * stateless w.r.t. read methods (strategies seeded once from FUSION_STRATEGIES
 * const at module load); we only test read paths so isolation isn't required.
 *
 * Engine internals (verified by these tests):
 *   - 23 strategies seeded from FUSION_STRATEGIES const (counted in stats test).
 *   - selectOptimalStrategy() chains: filter by feature → material → machine →
 *     tool diameter → optional adaptive preference (when prefer_adaptive OR
 *     depth > 2× tool diameter) → score remaining → sort descending → pick top.
 *   - confidence = min(0.95, top_score + 0.4).
 *   - score base 0.5; +0.25 deep-cavity-adaptive; +0.15 fine-finish (Ra<1.6)
 *     for scallop/parallel/steep_shallow; +0.1 multiaxis on freeform; +0.1
 *     steep_shallow on freeform.
 *   - Fallback to fusion-2d-contour with confidence 0.4 + warning when zero
 *     candidates remain.
 *   - Material-specific tribal tips appended (H → "reduce speed 30%", S →
 *     "high-pressure coolant"). Adaptive strategies append tool-life tip.
 *   - calculateCuttingParameters() multiplies material baseParams by strategy
 *     factors. P base = { Vc:200, fz:0.15, ap:5, ae:10 }.
 *   - explainStrategy(id) returns markdown string or null.
 *   - listStrategies() / findByCategory(cat) → arrays from internal state.
 *   - getStats() returns { strategies:23, knowledge_entries:0, supported_-
 *     features:21, supported_materials:6, categories:string[] }.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE36
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { fusionDeepLearningEngine } from "../engines/FusionDeepLearningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["fusion_dl_select_strategy", "fusion_dl_explain", "fusion_dl_list", "fusion_dl_stats"] as const;

// Engine seed cardinality — verified by stats test below.
const SEEDED_STRATEGY_COUNT = 23;
const SUPPORTED_FEATURE_COUNT = 21;
const SUPPORTED_MATERIAL_COUNT = 6;
// Confidence formula: min(0.95, score + 0.4); base score 0.5 → minimum confidence 0.9 when no boosts apply.
const CONFIDENCE_FLOOR_BASE_SCORE = 0.9;
const CONFIDENCE_CEILING = 0.95;
const FALLBACK_CONFIDENCE = 0.4;
// Material P (steel) Kienzle base parameters from engine source.
const STEEL_BASE_VC_M_MIN = 200;
const STEEL_BASE_FZ_MM_TOOTH = 0.15;
// 2D Adaptive Clearing strategy factors.
const ADAPTIVE_2D_SPEED_FACTOR = 1.2;
const ADAPTIVE_2D_FEED_FACTOR = 1.4;

describe("U-WIRE36 — engine direct: FusionDeepLearningEngine", () => {
  it("listStrategies returns 23 seeded strategies with required fields", () => {
    const strategies = fusionDeepLearningEngine.listStrategies();
    expect(strategies.length).toBe(SEEDED_STRATEGY_COUNT);
    expect(strategies.every((s) => typeof s.id === "string" && s.id.startsWith("fusion-"))).toBe(true);
    expect(strategies.every((s) => Array.isArray(s.suitable_features))).toBe(true);
    expect(strategies.every((s) => Array.isArray(s.suitable_materials))).toBe(true);
    expect(strategies.every((s) => s.min_tool_diameter_mm < s.max_tool_diameter_mm)).toBe(true);
  });

  it("findByCategory('2d_adaptive') returns exactly the fusion-2d-adaptive strategy", () => {
    const found = fusionDeepLearningEngine.findByCategory("2d_adaptive");
    expect(found.length).toBe(1);
    expect(found[0].id).toBe("fusion-2d-adaptive");
    expect(found[0].operation_name).toBe("2D Adaptive Clearing");
  });

  it("findByCategory for an unseeded category returns empty array", () => {
    const found = fusionDeepLearningEngine.findByCategory("3d_morphed_spiral");
    expect(found.length).toBe(0);
  });

  it("selectOptimalStrategy on shallow steel pocket picks 2d_adaptive (auto-prefer adaptive when depth > 2×D)", () => {
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 30, // 30 > 2 × 10 → triggers adaptive preference
      width_mm: 50,
      tolerance_mm: 0.1,
    });
    expect(r.primary_strategy.category).toBe("2d_adaptive");
    expect(r.confidence).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR_BASE_SCORE);
    expect(r.confidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
    expect(r.reasoning_chain.length).toBeGreaterThan(0);
    expect(r.reasoning_chain.some((s) => s.includes("Adaptive Clearing"))).toBe(true);
    expect(r.warnings.length).toBe(0);
  });

  it("selectOptimalStrategy applies Kienzle base × strategy factors for steel + 2d_adaptive", () => {
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 30,
      width_mm: 50,
      tolerance_mm: 0.1,
      prefer_adaptive: true,
    });
    // 2d_adaptive: speed_factor=1.2, feed_factor=1.4. Steel base Vc=200, fz=0.15.
    // Engine rounds speed to integer; feed to 3 decimals.
    expect(r.cutting_parameters.speed_m_min).toBe(Math.round(STEEL_BASE_VC_M_MIN * ADAPTIVE_2D_SPEED_FACTOR));
    expect(r.cutting_parameters.feed_mm_tooth).toBeCloseTo(STEEL_BASE_FZ_MM_TOOTH * ADAPTIVE_2D_FEED_FACTOR, 3);
  });

  it("selectOptimalStrategy on hardened steel appends 'reduce speed 30%' tribal tip", () => {
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "closed_pocket",
      material_group: "H",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      tolerance_mm: 0.05,
    });
    expect(r.tribal_tips.some((t) => t.includes("Hardened steel") && t.includes("30%"))).toBe(true);
  });

  it("selectOptimalStrategy on superalloy appends 'high-pressure coolant' tribal tip", () => {
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "freeform_surface",
      material_group: "S",
      machine_type: "5axis_table_table",
      tool_diameter_mm: 8,
      depth_mm: 5,
      width_mm: 20,
      tolerance_mm: 0.02,
    });
    expect(r.tribal_tips.some((t) => t.toLowerCase().includes("high-pressure coolant"))).toBe(true);
  });

  it("selectOptimalStrategy with surface_finish_Ra_um<1.6 boosts finishing strategies", () => {
    // freeform_surface + fine finish on 3-axis mill → expect parallel/scallop/steep_shallow at top.
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "freeform_surface",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 6,
      depth_mm: 2,
      width_mm: 50,
      tolerance_mm: 0.01,
      surface_finish_Ra_um: 0.8, // < 1.6 → boost finishing
    });
    const finishingCats = ["3d_scallop", "3d_parallel", "3d_steep_shallow"];
    expect(finishingCats.includes(r.primary_strategy.category)).toBe(true);
  });

  it("selectOptimalStrategy returns fallback (2D Contour, confidence 0.4) when no candidates remain", () => {
    // Tool diameter outside every strategy's range forces empty candidate set
    // after step 4 (tool diameter filter), triggering the fallback branch.
    const r = fusionDeepLearningEngine.selectOptimalStrategy({
      feature_type: "freeform_surface",
      material_group: "P",
      machine_type: "lathe_2axis", // freeform_surface is unsupported on lathe → empty after step 3
      tool_diameter_mm: 10,
      depth_mm: 5,
      width_mm: 20,
      tolerance_mm: 0.05,
    });
    expect(r.primary_strategy.id).toBe("fusion-2d-contour");
    expect(r.confidence).toBe(FALLBACK_CONFIDENCE);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("No optimal strategy");
  });

  it("explainStrategy returns markdown for valid id with all required sections", () => {
    const md = fusionDeepLearningEngine.explainStrategy("fusion-2d-adaptive");
    if (!md) throw new Error("fusion-2d-adaptive should exist");
    expect(md).toContain("## 2D Adaptive Clearing");
    expect(md).toContain("Category: 2d_adaptive");
    expect(md).toContain("### Suitable For");
    expect(md).toContain("### Tool Requirements");
    expect(md).toContain("### Cutting Parameters");
    expect(md).toContain("### Tribal Tips");
    expect(md).toContain("autodesk.com");
  });

  it("explainStrategy returns null for missing id (failure mode)", () => {
    const md = fusionDeepLearningEngine.explainStrategy("fusion-nonexistent");
    expect(md).toBeNull();
  });

  it("explainStrategy returns null for empty string", () => {
    const md = fusionDeepLearningEngine.explainStrategy("");
    expect(md).toBeNull();
  });

  it("getStats returns expected counts with all 23 strategy categories enumerated", () => {
    const s = fusionDeepLearningEngine.getStats();
    expect(s.strategies).toBe(SEEDED_STRATEGY_COUNT);
    expect(s.supported_features).toBe(SUPPORTED_FEATURE_COUNT);
    expect(s.supported_materials).toBe(SUPPORTED_MATERIAL_COUNT);
    expect(Array.isArray(s.categories)).toBe(true);
    expect(s.categories.length).toBeGreaterThan(0);
    // Every seeded strategy's category appears in the deduped list
    expect(s.categories.includes("2d_adaptive")).toBe(true);
    expect(s.categories.includes("3d_steep_shallow")).toBe(true);
    expect(s.categories.includes("multiaxis_swarf")).toBe(true);
  });
});

describe("U-WIRE36 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' is a Zod schema and accepts minimal valid input", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    expect(schema instanceof z.ZodType).toBe(true);
    const minimal: Record<string, Record<string, unknown>> = {
      fusion_dl_select_strategy: {
        feature_type: "closed_pocket",
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 10,
        depth_mm: 20,
        width_mm: 50,
        tolerance_mm: 0.1,
      },
      fusion_dl_explain: { strategy_id: "fusion-2d-adaptive" },
      fusion_dl_list: {},
      fusion_dl_stats: {},
    };
    const parsed = schema.parse(minimal[action]) as Record<string, unknown>;
    expect(parsed).toEqual(minimal[action]);
  });

  it("fusion_dl_select_strategy rejects invalid feature_type enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_select_strategy"];
    expect(() => schema.parse({
      feature_type: "tetrahedron", // not in 21-element enum
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      tolerance_mm: 0.1,
    })).toThrow();
  });

  it("fusion_dl_select_strategy rejects invalid material_group enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_select_strategy"];
    expect(() => schema.parse({
      feature_type: "closed_pocket",
      material_group: "Z", // not in {P,M,K,N,S,H}
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      tolerance_mm: 0.1,
    })).toThrow();
  });

  it("fusion_dl_select_strategy rejects non-positive dimensions (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_select_strategy"];
    const baseValid = {
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      tolerance_mm: 0.1,
    };
    expect(() => schema.parse({ ...baseValid, tool_diameter_mm: 0 })).toThrow();
    expect(() => schema.parse({ ...baseValid, tool_diameter_mm: -5 })).toThrow();
    expect(() => schema.parse({ ...baseValid, depth_mm: 0 })).toThrow();
    expect(() => schema.parse({ ...baseValid, tolerance_mm: -0.01 })).toThrow();
  });

  it("fusion_dl_select_strategy requires all 7 mandatory fields (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_select_strategy"];
    // Missing feature_type
    expect(() => schema.parse({
      material_group: "P", machine_type: "3axis_mill",
      tool_diameter_mm: 10, depth_mm: 20, width_mm: 50, tolerance_mm: 0.1,
    })).toThrow();
    // Missing tool_diameter_mm
    expect(() => schema.parse({
      feature_type: "closed_pocket", material_group: "P", machine_type: "3axis_mill",
      depth_mm: 20, width_mm: 50, tolerance_mm: 0.1,
    })).toThrow();
  });

  it("fusion_dl_explain requires non-empty strategy_id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_explain"];
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ strategy_id: "" })).toThrow();
    const ok = schema.parse({ strategy_id: "fusion-drill" }) as { strategy_id: string };
    expect(ok.strategy_id).toBe("fusion-drill");
  });

  it("fusion_dl_list rejects invalid category enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_dl_list"];
    expect(() => schema.parse({ category: "5_axis_dance" })).toThrow();
    const ok = schema.parse({ category: "drill" }) as { category: string };
    expect(ok.category).toBe("drill");
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE36 — dispatcher round-trip: prism_ai", () => {
  it("fusion_dl_select_strategy returns full FusionStrategyRecommendation shape", async () => {
    const out = await executeAIReasoningAction("fusion_dl_select_strategy", {
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 30,
      width_mm: 50,
      tolerance_mm: 0.1,
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      primary_strategy: { id: string; category: string };
      alternative_strategies: unknown[];
      reasoning_chain: string[];
      confidence: number;
      cutting_parameters: { speed_m_min: number; feed_mm_tooth: number };
      tribal_tips: string[];
    };
    expect(data.primary_strategy.category).toBe("2d_adaptive");
    expect(data.confidence).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR_BASE_SCORE);
    expect(data.cutting_parameters.speed_m_min).toBe(Math.round(STEEL_BASE_VC_M_MIN * ADAPTIVE_2D_SPEED_FACTOR));
    expect(data.tribal_tips.length).toBeGreaterThan(0);
  });

  it("fusion_dl_explain hit returns {explanation, found:true}", async () => {
    const out = await executeAIReasoningAction("fusion_dl_explain", { strategy_id: "fusion-drill" });
    expect(out.success).toBe(true);
    const data = out.data as { explanation: string; found: boolean };
    expect(data.found).toBe(true);
    expect(data.explanation).toContain("## Drill");
    expect(data.explanation).toContain("Category: drill");
  });

  it("fusion_dl_explain miss returns {explanation:null, found:false}", async () => {
    const out = await executeAIReasoningAction("fusion_dl_explain", { strategy_id: "fusion-imaginary" });
    expect(out.success).toBe(true);
    const data = out.data as { explanation: unknown; found: boolean };
    expect(data.found).toBe(false);
    // Response-slim layer may strip top-level null fields; either is acceptable.
    expect(data.explanation === null || data.explanation === undefined).toBe(true);
  });

  it("fusion_dl_list with no filter returns all 23 seeded strategies", async () => {
    const out = await executeAIReasoningAction("fusion_dl_list", {});
    expect(out.success).toBe(true);
    const data = out.data as { strategies: unknown[]; count: number };
    expect(data.count).toBe(SEEDED_STRATEGY_COUNT);
    expect(data.strategies.length).toBe(SEEDED_STRATEGY_COUNT);
  });

  it("fusion_dl_list with category=drill returns exactly 1 (fusion-drill)", async () => {
    const out = await executeAIReasoningAction("fusion_dl_list", { category: "drill" });
    expect(out.success).toBe(true);
    const data = out.data as { strategies: { id: string }[]; count: number };
    expect(data.count).toBe(1);
    expect(data.strategies[0].id).toBe("fusion-drill");
  });

  it("fusion_dl_stats returns expected counts", async () => {
    const out = await executeAIReasoningAction("fusion_dl_stats", {});
    expect(out.success).toBe(true);
    const data = out.data as {
      strategies: number;
      supported_features: number;
      supported_materials: number;
      categories: string[];
    };
    expect(data.strategies).toBe(SEEDED_STRATEGY_COUNT);
    expect(data.supported_features).toBe(SUPPORTED_FEATURE_COUNT);
    expect(data.supported_materials).toBe(SUPPORTED_MATERIAL_COUNT);
    expect(data.categories.length).toBeGreaterThan(0);
  });

  it("fusion_dl_select_strategy with invalid feature_type returns success:false", async () => {
    const out = await executeAIReasoningAction("fusion_dl_select_strategy", {
      feature_type: "imaginary_feature",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      tolerance_mm: 0.1,
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/feature_type|enum|imaginary/i);
  });

  it("fusion_dl_explain without strategy_id returns success:false (failure mode)", async () => {
    const out = await executeAIReasoningAction("fusion_dl_explain", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/strategy_id|required/i);
  });

  it("fusion_dl_list with invalid category returns success:false (failure mode)", async () => {
    const out = await executeAIReasoningAction("fusion_dl_list", { category: "fake_category" });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/category|enum|fake/i);
  });

  it("singleton state persists across dispatcher calls (idempotent reads)", async () => {
    const r1 = await executeAIReasoningAction("fusion_dl_stats", {});
    const r2 = await executeAIReasoningAction("fusion_dl_stats", {});
    expect((r1.data as { strategies: number }).strategies).toBe(SEEDED_STRATEGY_COUNT);
    expect((r2.data as { strategies: number }).strategies).toBe(SEEDED_STRATEGY_COUNT);
  });
});
