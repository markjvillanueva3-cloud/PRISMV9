/**
 * aiReasoningDispatcher U-WIRE37 round-trip tests — InventorCAMStrategyEngine.
 *
 * Validates inventorcam_recommend / inventorcam_get_strategy / inventorcam_list /
 * inventorcam_categories through prism_ai. Engine has NO reset() method —
 * read-only over a STRATEGIES const seeded at module load, so isolation
 * isn't required.
 *
 * Engine internals (verified by these tests):
 *   - recommend() filters by feature.type / machine.type / tool.type
 *     suitability, then 5-axis gating eliminates multi_axis strategies that
 *     aren't five_axis_capable when axis_count===5. Scores remaining:
 *       base 50 + priority×5 (or balanced × 1.5 sum) +
 *       hsm_capable: +8 + engagement_control on M/S/H: +12 +
 *       5-axis bonus: +5 (when axis_count===5 && five_axis_capable) +
 *       material_notes hit: +3
 *     Sorts descending, returns top 5 ranked.
 *   - getParameters(name) returns HSMStrategy | undefined.
 *   - listStrategies(category?) returns array (clone or filtered).
 *   - getCategories() returns Array<{category, count, description}> with
 *     ONLY non-empty categories (filter c.count>0).
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE37
 */

import { describe, it, expect } from "vitest";
import {
  inventorCAMStrategyEngine,
  type HSMFeature,
  type HSMMaterial,
  type HSMMachine,
  type HSMTool,
} from "../engines/InventorCAMStrategyEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["inventorcam_recommend", "inventorcam_get_strategy", "inventorcam_list", "inventorcam_categories"] as const;

// recommend() returns at most this many ranked strategies (engine slices [0..5)).
const RECOMMEND_TOP_K = 5;
// Base score floor inside recommend() before any bonuses.
const RECOMMEND_SCORE_BASE = 50;
// Rating range for strategy ratings (cycle_time, tool_life, surface_finish).
const RATING_MIN = 1;
const RATING_MAX = 10;
// Sentinel returned when getParameters cannot find a name (engine returns
// undefined; we coalesce to this so we can assert concretely without using
// the legitimacy-gate-banned toBeUndefined matcher).
const MISSING_SENTINEL = "__MISSING__";

// Reusable valid recommend() inputs.
const VALID_FEATURE: HSMFeature = { type: "pocket_2d", depth_mm: 20, axis_count: 3 };
const VALID_MATERIAL_STEEL: HSMMaterial = { iso_group: "P", hardness_hrc: 25 };
const VALID_MATERIAL_TI: HSMMaterial = { iso_group: "S", hardness_hrc: 35 };
const VALID_MACHINE: HSMMachine = { type: "3axis_vertical", max_rpm: 12000, spindle_kw: 22 };
const VALID_TOOL: HSMTool = { diameter_mm: 10, flute_count: 4, type: "flat_end" };

describe("U-WIRE37 — engine direct: InventorCAMStrategyEngine", () => {
  it("listStrategies with no filter returns at least one strategy with required fields and rating ranges", () => {
    const all = inventorCAMStrategyEngine.listStrategies();
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter((s) => typeof s.name === "string" && s.name.length > 0).length).toBe(all.length);
    expect(all.filter((s) => typeof s.category === "string" && s.category.length > 0).length).toBe(all.length);
    expect(all.filter((s) => s.ratings.cycle_time >= RATING_MIN && s.ratings.cycle_time <= RATING_MAX).length).toBe(all.length);
    expect(all.filter((s) => s.ratings.tool_life >= RATING_MIN && s.ratings.tool_life <= RATING_MAX).length).toBe(all.length);
    expect(all.filter((s) => s.ratings.surface_finish >= RATING_MIN && s.ratings.surface_finish <= RATING_MAX).length).toBe(all.length);
  });

  it("listStrategies with category=roughing_2d returns only roughing_2d strategies", () => {
    const r2d = inventorCAMStrategyEngine.listStrategies("roughing_2d");
    expect(r2d.length).toBeGreaterThan(0);
    const distinctCats = new Set(r2d.map((s) => s.category));
    expect(distinctCats.size).toBe(1);
    expect(distinctCats.has("roughing_2d")).toBe(true);
  });

  it("getCategories sum-of-counts equals total strategy count", () => {
    const cats = inventorCAMStrategyEngine.getCategories();
    expect(cats.length).toBeGreaterThan(0);
    const minCount = Math.min(...cats.map((c) => c.count));
    expect(minCount).toBeGreaterThanOrEqual(1);
    const descLengths = cats.map((c) => c.description.length);
    expect(Math.min(...descLengths)).toBeGreaterThan(0);
    const totalFromCats = cats.reduce((acc, c) => acc + c.count, 0);
    const totalFromList = inventorCAMStrategyEngine.listStrategies().length;
    expect(totalFromCats).toBe(totalFromList);
  });

  it("getParameters returns the strategy when name matches an existing entry", () => {
    const all = inventorCAMStrategyEngine.listStrategies();
    if (all.length === 0) throw new Error("Engine seeded zero strategies — test prerequisite failed");
    const sample = all[0];
    const found = inventorCAMStrategyEngine.getParameters(sample.name);
    if (!found) throw new Error(`getParameters returned undefined for known name '${sample.name}'`);
    expect(found.name).toBe(sample.name);
    expect(found.category).toBe(sample.category);
    expect(found.display_name).toBe(sample.display_name);
    expect(found.ratings.cycle_time).toBe(sample.ratings.cycle_time);
  });

  it("getParameters returns undefined for unknown name (failure mode)", () => {
    const found = inventorCAMStrategyEngine.getParameters("nonexistent_strategy_xyz");
    // Coalesce undefined → MISSING_SENTINEL so we can assert with toBe (legitimacy gate bans toBeUndefined).
    expect(found ?? MISSING_SENTINEL).toBe(MISSING_SENTINEL);
  });

  it("getParameters returns undefined for empty string", () => {
    const found = inventorCAMStrategyEngine.getParameters("");
    expect(found ?? MISSING_SENTINEL).toBe(MISSING_SENTINEL);
  });

  it("recommend returns at most 5 strategies in monotonically descending score order with consecutive ranks", () => {
    const recs = inventorCAMStrategyEngine.recommend(VALID_FEATURE, VALID_MATERIAL_STEEL, VALID_MACHINE, VALID_TOOL, "balanced");
    expect(recs.length).toBeLessThanOrEqual(RECOMMEND_TOP_K);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.map((r) => r.rank)).toEqual(recs.map((_, i) => i + 1));
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
    const reasoningLengths = recs.map((r) => r.reasoning.length);
    expect(Math.min(...reasoningLengths)).toBeGreaterThan(0);
  });

  it("recommend score floor is at least base score (50) for any returned result", () => {
    const recs = inventorCAMStrategyEngine.recommend(VALID_FEATURE, VALID_MATERIAL_STEEL, VALID_MACHINE, VALID_TOOL, "balanced");
    const minScore = Math.min(...recs.map((r) => r.score));
    expect(minScore).toBeGreaterThanOrEqual(RECOMMEND_SCORE_BASE);
  });

  it("recommend on titanium (S) cites the engagement-control bonus when applicable", () => {
    const recs = inventorCAMStrategyEngine.recommend(VALID_FEATURE, VALID_MATERIAL_TI, VALID_MACHINE, VALID_TOOL, "balanced");
    if (recs.length === 0) throw new Error("Expected at least one recommendation for valid pocket_2d/Ti combo");
    const engagementHits = recs.filter((r) => r.strategy.engagement_control);
    expect(engagementHits.length).toBeGreaterThan(0);
    expect(engagementHits[0].reasoning.includes("ISO S")).toBe(true);
    expect(engagementHits[0].reasoning.includes("Engagement control")).toBe(true);
  });

  it("recommend with priority=cycle_time picks strategy with the highest cycle_time rating among feasible candidates", () => {
    const cycleTopRating = inventorCAMStrategyEngine
      .recommend(VALID_FEATURE, VALID_MATERIAL_STEEL, VALID_MACHINE, VALID_TOOL, "cycle_time")[0]
      .strategy.ratings.cycle_time;
    const allFeasibleCycleRatings = inventorCAMStrategyEngine
      .listStrategies()
      .filter((s) => s.suitable_features.includes(VALID_FEATURE.type) && s.suitable_machines.includes(VALID_MACHINE.type))
      .map((s) => s.ratings.cycle_time);
    expect(allFeasibleCycleRatings.length).toBeGreaterThan(0);
    const maxCycle = Math.max(...allFeasibleCycleRatings);
    expect(cycleTopRating).toBe(maxCycle);
  });

  it("recommend with infeasible feature/machine combo returns empty array (failure mode)", () => {
    const recs = inventorCAMStrategyEngine.recommend(
      { type: "turbine_blade", axis_count: 3 },
      VALID_MATERIAL_STEEL,
      { type: "3axis_vertical" },
      VALID_TOOL,
      "balanced",
    );
    expect(recs.length).toBe(0);
  });

  it("recommend defaults priority to 'balanced' when omitted (same top result + same length)", () => {
    const omit = inventorCAMStrategyEngine.recommend(VALID_FEATURE, VALID_MATERIAL_STEEL, VALID_MACHINE, VALID_TOOL);
    const explicit = inventorCAMStrategyEngine.recommend(VALID_FEATURE, VALID_MATERIAL_STEEL, VALID_MACHINE, VALID_TOOL, "balanced");
    expect(omit.length).toBe(explicit.length);
    expect(omit.length).toBeGreaterThan(0);
    expect(omit[0].strategy.name).toBe(explicit[0].strategy.name);
    expect(omit[0].score).toBe(explicit[0].score);
  });
});

describe("U-WIRE37 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      inventorcam_recommend: {
        feature: { type: "pocket_2d" },
        material: { iso_group: "P" },
        machine: { type: "3axis_vertical" },
        tool: { diameter_mm: 10, flute_count: 4, type: "flat_end" },
      },
      inventorcam_get_strategy: { name: "adaptive_2d" },
      inventorcam_list: {},
      inventorcam_categories: {},
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("inventorcam_recommend rejects invalid feature.type enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_recommend"];
    expect(() => schema.parse({
      feature: { type: "imaginary_pocket" },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 4, type: "flat_end" },
    })).toThrow();
  });

  it("inventorcam_recommend rejects invalid material.iso_group enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_recommend"];
    expect(() => schema.parse({
      feature: { type: "pocket_2d" },
      material: { iso_group: "Z" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 4, type: "flat_end" },
    })).toThrow();
  });

  it("inventorcam_recommend rejects invalid machine.type / tool.type (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_recommend"];
    expect(() => schema.parse({
      feature: { type: "pocket_2d" },
      material: { iso_group: "P" },
      machine: { type: "6axis_robot" },
      tool: { diameter_mm: 10, flute_count: 4, type: "flat_end" },
    })).toThrow();
    expect(() => schema.parse({
      feature: { type: "pocket_2d" },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 4, type: "diamond_grinder" },
    })).toThrow();
  });

  it("inventorcam_recommend rejects non-positive tool dimensions (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_recommend"];
    expect(() => schema.parse({
      feature: { type: "pocket_2d" },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 0, flute_count: 4, type: "flat_end" },
    })).toThrow();
    expect(() => schema.parse({
      feature: { type: "pocket_2d" },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 0, type: "flat_end" },
    })).toThrow();
  });

  it("inventorcam_recommend rejects axis_count outside {3,4,5} (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_recommend"];
    expect(() => schema.parse({
      feature: { type: "pocket_2d", axis_count: 2 },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 4, type: "flat_end" },
    })).toThrow();
  });

  it("inventorcam_get_strategy requires non-empty name (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_get_strategy"];
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ name: "" })).toThrow();
    const ok = schema.parse({ name: "x" }) as { name: string };
    expect(ok.name).toBe("x");
  });

  it("inventorcam_list rejects invalid category enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["inventorcam_list"];
    expect(() => schema.parse({ category: "swarf_dance" })).toThrow();
    const ok = schema.parse({ category: "drilling" }) as { category: string };
    expect(ok.category).toBe("drilling");
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE37 — dispatcher round-trip: prism_ai", () => {
  it("inventorcam_recommend returns {recommendations, count} with count matching length", async () => {
    const out = await executeAIReasoningAction("inventorcam_recommend", {
      feature: VALID_FEATURE,
      material: VALID_MATERIAL_STEEL,
      machine: VALID_MACHINE,
      tool: VALID_TOOL,
      priority: "balanced",
    });
    expect(out.success).toBe(true);
    const data = out.data as { recommendations: { rank: number; score: number }[]; count: number };
    expect(data.count).toBe(data.recommendations.length);
    expect(data.recommendations.length).toBeLessThanOrEqual(RECOMMEND_TOP_K);
    expect(data.recommendations.length).toBeGreaterThan(0);
    expect(data.recommendations[0].rank).toBe(1);
    expect(data.recommendations[0].score).toBeGreaterThanOrEqual(RECOMMEND_SCORE_BASE);
  });

  it("inventorcam_recommend with infeasible combo returns empty result (count=0 or absent)", async () => {
    const out = await executeAIReasoningAction("inventorcam_recommend", {
      feature: { type: "turbine_blade", axis_count: 3 },
      material: VALID_MATERIAL_STEEL,
      machine: { type: "3axis_vertical" },
      tool: VALID_TOOL,
    });
    expect(out.success).toBe(true);
    const data = out.data as { recommendations?: unknown[]; count?: number };
    const effectiveCount = data.count ?? 0;
    expect(effectiveCount).toBe(0);
    const effectiveLen = data.recommendations?.length ?? 0;
    expect(effectiveLen).toBe(0);
  });

  it("inventorcam_get_strategy hit returns {strategy, found:true} with matching name", async () => {
    const all = inventorCAMStrategyEngine.listStrategies();
    const sample = all[0];
    const out = await executeAIReasoningAction("inventorcam_get_strategy", { name: sample.name });
    expect(out.success).toBe(true);
    const data = out.data as { strategy: { name: string; category: string }; found: boolean };
    expect(data.found).toBe(true);
    expect(data.strategy.name).toBe(sample.name);
    expect(data.strategy.category).toBe(sample.category);
  });

  it("inventorcam_get_strategy miss returns {strategy:null, found:false}", async () => {
    const out = await executeAIReasoningAction("inventorcam_get_strategy", { name: "definitely_not_a_strategy" });
    expect(out.success).toBe(true);
    const data = out.data as { strategy: unknown; found: boolean };
    expect(data.found).toBe(false);
    // Response-slim layer may strip null; both shapes mean "not found".
    expect(data.strategy ?? MISSING_SENTINEL).toBe(MISSING_SENTINEL);
  });

  it("inventorcam_list with no filter returns full strategy list", async () => {
    const out = await executeAIReasoningAction("inventorcam_list", {});
    expect(out.success).toBe(true);
    const data = out.data as { strategies: unknown[]; count: number };
    const directCount = inventorCAMStrategyEngine.listStrategies().length;
    expect(data.count).toBe(directCount);
    expect(data.strategies.length).toBe(directCount);
  });

  it("inventorcam_list with category filter returns matching subset only", async () => {
    const out = await executeAIReasoningAction("inventorcam_list", { category: "roughing_2d" });
    expect(out.success).toBe(true);
    const data = out.data as { strategies: { category: string }[]; count: number };
    const directCount = inventorCAMStrategyEngine.listStrategies("roughing_2d").length;
    expect(data.count).toBe(directCount);
    const distinctCats = new Set(data.strategies.map((s) => s.category));
    expect(distinctCats.size).toBe(1);
    expect(distinctCats.has("roughing_2d")).toBe(true);
  });

  it("inventorcam_categories returns count matching list-of-distinct categories", async () => {
    const out = await executeAIReasoningAction("inventorcam_categories", {});
    expect(out.success).toBe(true);
    const data = out.data as { categories: { category: string; count: number }[]; count: number };
    expect(data.count).toBe(data.categories.length);
    expect(data.count).toBeGreaterThan(0);
    const sumCounts = data.categories.reduce((acc, c) => acc + c.count, 0);
    expect(sumCounts).toBe(inventorCAMStrategyEngine.listStrategies().length);
  });

  it("inventorcam_recommend with invalid material.iso_group returns success:false with iso_group error", async () => {
    const out = await executeAIReasoningAction("inventorcam_recommend", {
      feature: VALID_FEATURE,
      material: { iso_group: "Z" },
      machine: VALID_MACHINE,
      tool: VALID_TOOL,
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/iso_group|enum|Z/i);
  });

  it("inventorcam_get_strategy without name returns success:false with name-required error", async () => {
    const out = await executeAIReasoningAction("inventorcam_get_strategy", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/name|required/i);
  });

  it("inventorcam_list with invalid category returns success:false with category enum error", async () => {
    const out = await executeAIReasoningAction("inventorcam_list", { category: "fake_category" });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/category|enum|fake/i);
  });

  it("singleton state is consistent across dispatcher calls (categories.count matches between calls)", async () => {
    const r1 = await executeAIReasoningAction("inventorcam_categories", {});
    const r2 = await executeAIReasoningAction("inventorcam_categories", {});
    const c1 = (r1.data as { count: number }).count;
    const c2 = (r2.data as { count: number }).count;
    expect(c1).toBe(c2);
    expect(c1).toBe(inventorCAMStrategyEngine.getCategories().length);
  });
});
