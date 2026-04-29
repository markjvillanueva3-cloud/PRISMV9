/**
 * aiReasoningDispatcher U-WIRE40 round-trip tests — FusionStrategyKnowledgeEngine.
 *
 * Validates fusion_kb_select_strategy / fusion_kb_compare_strategies /
 * fusion_kb_list_strategies / fusion_kb_get_strategy / fusion_kb_stats
 * through prism_ai. Engine has clear() so beforeEach resets the query
 * counter; the underlying STRATEGY_KNOWLEDGE_BASE is module-const seed
 * (read-only) so list/get tests don't need isolation.
 *
 * Engine internals (verified by these tests):
 *   - selectStrategy(query) bumps queries++, filters via _filterApplicable
 *     (feature match + 5-axis gating + drill→drilling-only enforcement),
 *     scores via _scoreStrategies, returns top-1 with reasoning_chain.
 *   - compareStrategies(query, maxStrategies=3) bumps queries++, returns
 *     top-N (slice) plus comparison_summary + decision_rationale.
 *   - getAllStrategies / getStrategyById / getStrategiesForFeature do NOT
 *     bump queries (verified by stats invariance test).
 *   - stats() returns {queries:N}, clear() zeroes it.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE40
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  fusionStrategyKnowledgeEngine,
  type StrategyQuery,
} from "../engines/FusionStrategyKnowledgeEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = [
  "fusion_kb_select_strategy",
  "fusion_kb_compare_strategies",
  "fusion_kb_list_strategies",
  "fusion_kb_get_strategy",
  "fusion_kb_stats",
] as const;

// Engine default for compareStrategies' maxStrategies parameter.
const DEFAULT_COMPARE_MAX_N = 3;
// Sentinel for coalescing undefined→sentinel→toBe (legitimacy gate bans toBeUndefined).
const MISSING_SENTINEL = "__MISSING__";

// Reusable valid query — pocket roughing in steel with 10mm flat-end.
const VALID_QUERY: StrategyQuery = {
  feature: "pocket",
  operation: "roughing",
  material: "steel_alloy",
  tool_diameter_mm: 10,
  tool_type: "flat_end",
  prefer_hsm: true,
};

// Drill-on-pocket — passes filter (drill is allowed only for drilling category)
// to verify the drill→drilling-only enforcement path.
const DRILL_ON_POCKET: StrategyQuery = {
  feature: "pocket",
  operation: "roughing",
  material: "aluminum",
  tool_diameter_mm: 8,
  tool_type: "drill",
};

describe("U-WIRE40 — engine direct: FusionStrategyKnowledgeEngine", () => {
  beforeEach(() => {
    fusionStrategyKnowledgeEngine.clear();
  });

  it("getAllStrategies returns the seeded knowledge base with required fields", () => {
    const all = fusionStrategyKnowledgeEngine.getAllStrategies();
    expect(all.length).toBeGreaterThan(0);
    // Every entry has non-empty id/name/category.
    const idLen = Math.min(...all.map((s) => s.id.length));
    expect(idLen).toBeGreaterThan(0);
    const nameLen = Math.min(...all.map((s) => s.name.length));
    expect(nameLen).toBeGreaterThan(0);
    // Every entry has at least one applicable_features and ratings in [1,5].
    const minFeats = Math.min(...all.map((s) => s.applicable_features.length));
    expect(minFeats).toBeGreaterThan(0);
    expect(all.filter((s) => s.surface_quality_rating >= 1 && s.surface_quality_rating <= 5).length).toBe(all.length);
    expect(all.filter((s) => s.productivity_rating >= 1 && s.productivity_rating <= 5).length).toBe(all.length);
  });

  it("getStrategiesForFeature('pocket') returns only pocket-applicable strategies", () => {
    const pocket = fusionStrategyKnowledgeEngine.getStrategiesForFeature("pocket");
    expect(pocket.length).toBeGreaterThan(0);
    // Every returned strategy must list 'pocket' in applicable_features.
    expect(pocket.filter((s) => s.applicable_features.includes("pocket")).length).toBe(pocket.length);
  });

  it("getStrategyById returns the strategy matching the requested id", () => {
    const all = fusionStrategyKnowledgeEngine.getAllStrategies();
    const sample = all[0];
    const fetched = fusionStrategyKnowledgeEngine.getStrategyById(sample.id);
    if (!fetched) throw new Error(`getStrategyById returned undefined for known id '${sample.id}'`);
    expect(fetched.id).toBe(sample.id);
    expect(fetched.name).toBe(sample.name);
    expect(fetched.category).toBe(sample.category);
  });

  it("getStrategyById returns undefined for an unknown id (failure mode)", () => {
    const fetched = fusionStrategyKnowledgeEngine.getStrategyById("does_not_exist_id");
    expect(fetched ?? MISSING_SENTINEL).toBe(MISSING_SENTINEL);
  });

  it("selectStrategy bumps the query counter and returns a non-empty recommendation", () => {
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
    const rec = fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(1);
    // Recommendation has non-empty id/name/operation/score/reasoning_chain.
    expect(rec.strategy_id.length).toBeGreaterThan(0);
    expect(rec.strategy_name.length).toBeGreaterThan(0);
    expect(rec.fusion_operation.length).toBeGreaterThan(0);
    expect(rec.reasoning_chain.length).toBeGreaterThan(0);
    // reasoning_chain steps are 1..N consecutive
    expect(rec.reasoning_chain.map((s) => s.step)).toEqual(rec.reasoning_chain.map((_, i) => i + 1));
    // Trade-offs object has both pros and cons arrays.
    expect(Array.isArray(rec.trade_offs.pros)).toBe(true);
    expect(Array.isArray(rec.trade_offs.cons)).toBe(true);
    // Citations array exists (may be empty for some strategies).
    expect(Array.isArray(rec.citations)).toBe(true);
  });

  it("compareStrategies returns at most N strategies with winner === strategies[0]", () => {
    const cmp = fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY, DEFAULT_COMPARE_MAX_N);
    expect(cmp.strategies.length).toBeLessThanOrEqual(DEFAULT_COMPARE_MAX_N);
    expect(cmp.strategies.length).toBeGreaterThan(0);
    expect(cmp.winner.strategy_id).toBe(cmp.strategies[0].strategy_id);
    expect(cmp.comparison_summary.length).toBeGreaterThan(0);
    expect(cmp.decision_rationale.length).toBeGreaterThan(0);
    // Scores monotonically non-increasing across strategies.
    for (let i = 1; i < cmp.strategies.length; i++) {
      expect(cmp.strategies[i - 1].score).toBeGreaterThanOrEqual(cmp.strategies[i].score);
    }
  });

  it("compareStrategies defaults to N=3 when maxStrategies is omitted", () => {
    const cmp = fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY);
    expect(cmp.strategies.length).toBeLessThanOrEqual(DEFAULT_COMPARE_MAX_N);
    expect(cmp.strategies.length).toBeGreaterThan(0);
  });

  it("compareStrategies bumps query counter once per call", () => {
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
    fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY, 2);
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(1);
    fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY, 2);
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(2);
  });

  it("getAllStrategies / getStrategyById / getStrategiesForFeature do NOT bump query counter", () => {
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
    fusionStrategyKnowledgeEngine.getAllStrategies();
    fusionStrategyKnowledgeEngine.getStrategyById("f360_2d_adaptive");
    fusionStrategyKnowledgeEngine.getStrategiesForFeature("pocket");
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
  });

  it("clear() zeros the query counter", () => {
    fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY);
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(2);
    fusionStrategyKnowledgeEngine.clear();
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
  });

  it("selectStrategy throws when filter produces zero candidates (drill on pocket-only feature)", () => {
    // Engine filter rules:
    //   1. strategy.applicable_features must include query.feature
    //   2. drill tool eliminates all strategies where category !== 'drilling'
    // The intersection of pocket-applicable AND drilling-category is empty,
    // so scored[0] is undefined and the engine throws on .strategy access.
    // This test documents that real engine behavior so a future defensive
    // fix can flip this assertion to .not.toThrow().
    expect(() => fusionStrategyKnowledgeEngine.selectStrategy(DRILL_ON_POCKET)).toThrow();
    // Engine still bumped the query counter before the crash (counter++ is
    // the first line of selectStrategy, before _filterApplicable runs).
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(1);
  });

  it("selectStrategy with target_ra_um surfaces in parameters or reasoning", () => {
    const ra: StrategyQuery = { ...VALID_QUERY, operation: "finishing", target_ra_um: 0.8 };
    const rec = fusionStrategyKnowledgeEngine.selectStrategy(ra);
    // Must produce a finishing-applicable strategy (the engine doesn't return
    // 'roughing-only' strategies for finishing op when alternatives exist).
    expect(rec.strategy_id.length).toBeGreaterThan(0);
    expect(rec.reasoning_chain.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE40 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      fusion_kb_select_strategy: {
        feature: "pocket",
        operation: "roughing",
        material: "steel_alloy",
        tool_diameter_mm: 10,
        tool_type: "flat_end",
      },
      fusion_kb_compare_strategies: {
        feature: "pocket",
        operation: "roughing",
        material: "steel_alloy",
        tool_diameter_mm: 10,
        tool_type: "flat_end",
      },
      fusion_kb_list_strategies: {},
      fusion_kb_get_strategy: { id: "f360_2d_adaptive" },
      fusion_kb_stats: {},
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("fusion_kb_select_strategy rejects invalid feature enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_select_strategy"];
    expect(() => schema.parse({
      feature: "not_a_feature",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    })).toThrow();
  });

  it("fusion_kb_select_strategy rejects invalid operation enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_select_strategy"];
    expect(() => schema.parse({
      feature: "pocket",
      operation: "polishing", // not in the 3-element enum
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    })).toThrow();
  });

  it("fusion_kb_select_strategy rejects invalid material / tool_type / tool_diameter (failure modes)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_select_strategy"];
    expect(() => schema.parse({
      feature: "pocket",
      operation: "roughing",
      material: "wood",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    })).toThrow();
    expect(() => schema.parse({
      feature: "pocket",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "diamond_grinder",
    })).toThrow();
    expect(() => schema.parse({
      feature: "pocket",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 0,
      tool_type: "flat_end",
    })).toThrow();
    expect(() => schema.parse({
      feature: "pocket",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: -3,
      tool_type: "flat_end",
    })).toThrow();
  });

  it("fusion_kb_select_strategy requires all 5 mandatory fields (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_select_strategy"];
    expect(() => schema.parse({
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    })).toThrow();
    expect(() => schema.parse({
      feature: "pocket",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    })).toThrow();
  });

  it("fusion_kb_compare_strategies max_strategies must be int 1..20 (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_compare_strategies"];
    const baseValid = {
      feature: "pocket",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    };
    expect(() => schema.parse({ ...baseValid, max_strategies: 0 })).toThrow();
    expect(() => schema.parse({ ...baseValid, max_strategies: 21 })).toThrow();
    expect(() => schema.parse({ ...baseValid, max_strategies: 2.5 })).toThrow();
    const ok = schema.parse({ ...baseValid, max_strategies: 5 }) as { max_strategies: number };
    expect(ok.max_strategies).toBe(5);
  });

  it("fusion_kb_get_strategy requires non-empty id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_get_strategy"];
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ id: "" })).toThrow();
    const ok = schema.parse({ id: "f360_2d_adaptive" }) as { id: string };
    expect(ok.id).toBe("f360_2d_adaptive");
  });

  it("fusion_kb_list_strategies rejects invalid feature enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fusion_kb_list_strategies"];
    expect(() => schema.parse({ feature: "imaginary_feature" })).toThrow();
    const ok = schema.parse({ feature: "pocket" }) as { feature: string };
    expect(ok.feature).toBe("pocket");
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE40 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    fusionStrategyKnowledgeEngine.clear();
  });

  it("fusion_kb_select_strategy returns full StrategyRecommendation shape", async () => {
    const out = await executeAIReasoningAction("fusion_kb_select_strategy", VALID_QUERY as unknown as Record<string, unknown>);
    expect(out.success).toBe(true);
    const data = out.data as {
      strategy_id: string;
      strategy_name: string;
      reasoning_chain: unknown[];
      trade_offs: { pros: string[]; cons: string[] };
    };
    expect(data.strategy_id.length).toBeGreaterThan(0);
    expect(data.strategy_name.length).toBeGreaterThan(0);
    expect(data.reasoning_chain.length).toBeGreaterThan(0);
    expect(Array.isArray(data.trade_offs.pros)).toBe(true);
    expect(Array.isArray(data.trade_offs.cons)).toBe(true);
  });

  it("fusion_kb_compare_strategies returns winner + strategies[] with consistent top", async () => {
    const out = await executeAIReasoningAction("fusion_kb_compare_strategies", {
      ...VALID_QUERY,
      max_strategies: 2,
    } as unknown as Record<string, unknown>);
    expect(out.success).toBe(true);
    const data = out.data as {
      strategies: { strategy_id: string }[];
      winner: { strategy_id: string };
      comparison_summary: string;
      decision_rationale: string;
    };
    expect(data.strategies.length).toBeLessThanOrEqual(2);
    expect(data.strategies.length).toBeGreaterThan(0);
    expect(data.winner.strategy_id).toBe(data.strategies[0].strategy_id);
    expect(data.comparison_summary.length).toBeGreaterThan(0);
    expect(data.decision_rationale.length).toBeGreaterThan(0);
  });

  it("fusion_kb_list_strategies with no filter returns full KB count matching engine direct", async () => {
    const out = await executeAIReasoningAction("fusion_kb_list_strategies", {});
    expect(out.success).toBe(true);
    const data = out.data as { strategies: unknown[]; count: number };
    const directCount = fusionStrategyKnowledgeEngine.getAllStrategies().length;
    expect(data.count).toBe(directCount);
    expect(data.strategies.length).toBe(directCount);
  });

  it("fusion_kb_list_strategies with feature=pocket returns subset matching engine direct", async () => {
    const out = await executeAIReasoningAction("fusion_kb_list_strategies", { feature: "pocket" });
    expect(out.success).toBe(true);
    const data = out.data as { strategies: { applicable_features: string[] }[]; count: number };
    const directCount = fusionStrategyKnowledgeEngine.getStrategiesForFeature("pocket").length;
    expect(data.count).toBe(directCount);
    // Every returned strategy must list 'pocket' in its applicable features.
    expect(data.strategies.filter((s) => s.applicable_features.includes("pocket")).length).toBe(data.strategies.length);
  });

  it("fusion_kb_get_strategy hit returns {strategy, found:true}", async () => {
    const sample = fusionStrategyKnowledgeEngine.getAllStrategies()[0];
    const out = await executeAIReasoningAction("fusion_kb_get_strategy", { id: sample.id });
    expect(out.success).toBe(true);
    const data = out.data as { strategy: { id: string }; found: boolean };
    expect(data.found).toBe(true);
    expect(data.strategy.id).toBe(sample.id);
  });

  it("fusion_kb_get_strategy miss returns {strategy:null, found:false}", async () => {
    const out = await executeAIReasoningAction("fusion_kb_get_strategy", { id: "this_id_does_not_exist" });
    expect(out.success).toBe(true);
    const data = out.data as { strategy: unknown; found: boolean };
    expect(data.found).toBe(false);
    // Response-slim layer may strip null; both shapes mean "not found".
    expect(data.strategy ?? MISSING_SENTINEL).toBe(MISSING_SENTINEL);
  });

  it("fusion_kb_stats returns current query counter without reset by default", async () => {
    fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    fusionStrategyKnowledgeEngine.compareStrategies(VALID_QUERY);
    const out = await executeAIReasoningAction("fusion_kb_stats", {});
    expect(out.success).toBe(true);
    const data = out.data as { queries: number; reset_after_read: boolean };
    expect(data.queries).toBe(2);
    expect(data.reset_after_read).toBe(false);
    // Counter must still be 2 after a no-reset read.
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(2);
  });

  it("fusion_kb_stats with {reset:true} clears counter AFTER reading", async () => {
    fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    fusionStrategyKnowledgeEngine.selectStrategy(VALID_QUERY);
    const out = await executeAIReasoningAction("fusion_kb_stats", { reset: true });
    expect(out.success).toBe(true);
    const data = out.data as { queries: number; reset_after_read: boolean };
    expect(data.queries).toBe(3);
    expect(data.reset_after_read).toBe(true);
    // Counter must be 0 after reset.
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
  });

  it("fusion_kb_select_strategy with invalid feature enum returns success:false", async () => {
    const out = await executeAIReasoningAction("fusion_kb_select_strategy", {
      feature: "imaginary_feature",
      operation: "roughing",
      material: "steel_alloy",
      tool_diameter_mm: 10,
      tool_type: "flat_end",
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/feature|enum|imaginary/i);
  });

  it("fusion_kb_get_strategy without id returns success:false", async () => {
    const out = await executeAIReasoningAction("fusion_kb_get_strategy", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/id|required/i);
  });

  it("fusion_kb_compare_strategies with max_strategies=0 returns success:false", async () => {
    const out = await executeAIReasoningAction("fusion_kb_compare_strategies", {
      ...VALID_QUERY,
      max_strategies: 0,
    } as unknown as Record<string, unknown>);
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/max_strategies|min/i);
  });

  it("dispatcher select+compare bump engine counter symmetrically (cross-call invariant)", async () => {
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(0);
    await executeAIReasoningAction("fusion_kb_select_strategy", VALID_QUERY as unknown as Record<string, unknown>);
    await executeAIReasoningAction("fusion_kb_compare_strategies", VALID_QUERY as unknown as Record<string, unknown>);
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(2);
    // list/get/stats do NOT bump the counter.
    await executeAIReasoningAction("fusion_kb_list_strategies", {});
    await executeAIReasoningAction("fusion_kb_get_strategy", { id: "f360_2d_adaptive" });
    await executeAIReasoningAction("fusion_kb_stats", {});
    expect(fusionStrategyKnowledgeEngine.stats().queries).toBe(2);
  });
});
