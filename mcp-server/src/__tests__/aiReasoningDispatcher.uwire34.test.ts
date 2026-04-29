/**
 * aiReasoningDispatcher U-WIRE34 round-trip tests — JMDieProgramLearningEngine.
 *
 * Validates jmdie_query / jmdie_get_pattern / jmdie_get_tips / jmdie_stats
 * through prism_ai. Engine has reset() so beforeEach() guarantees fresh state.
 *
 * Engine internals (verified by these tests):
 *   - loadPatterns() seeds 15 deterministic patterns: 3 machineTypes (lathe,
 *     mill, wedm) × 5 categories (roughing, finishing, threading, drilling,
 *     profiling). Patterns numbered pattern_1..pattern_15 in nested-loop order
 *     so pattern_1..5 = lathe×categories, _6..10 = mill×, _11..15 = wedm×.
 *   - query() filters by machineType / category / minFrequency, sorts by
 *     descending frequency, slices to limit (default 50).
 *   - getPattern(id) returns ProgramPattern or null when missing.
 *   - getTips(machineType?) flattens patterns[*].tips into string[].
 *   - getStats() returns totalPrograms=36929, extractedPatterns=15, byMachine-
 *     Type/byCategory aggregations.
 *   - reset() clears patterns Map and forces re-init on next call.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE34
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { jmDieProgramLearningEngine } from "../engines/JMDieProgramLearningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["jmdie_query", "jmdie_get_pattern", "jmdie_get_tips", "jmdie_stats"] as const;

// Engine seed cardinality (3 machineTypes × 5 categories) → 15 patterns; verified in test below.
const SEEDED_PATTERN_COUNT = 15;
const PATTERNS_PER_MACHINE_TYPE = 5;
const PATTERNS_PER_CATEGORY = 3;
const TOTAL_JMDIE_PROGRAMS = 36929;
// Engine seeds frequency = floor(random()*500)+50 → range [50, 549]; pick > 549 to force empty result.
const ABOVE_MAX_SEEDED_FREQUENCY = 999;
// Schema accepts 1..1000 inclusive; these probe each rejection edge.
const SCHEMA_LIMIT_BELOW_MIN = 0;
const SCHEMA_LIMIT_ABOVE_MAX = 1001;
const SCHEMA_LIMIT_NON_INTEGER = 1.5;
const SCHEMA_QUERY_LIMIT_SMALL = 3;
const SCHEMA_QUERY_LIMIT_OVER_SEED = 100;

describe("U-WIRE34 — engine direct: JMDieProgramLearningEngine", () => {
  beforeEach(() => {
    jmDieProgramLearningEngine.reset();
  });

  it("query with no filter returns all 15 seeded patterns", async () => {
    const patterns = await jmDieProgramLearningEngine.query({});
    expect(patterns.length).toBe(SEEDED_PATTERN_COUNT);
    const machineTypes = new Set(patterns.map((p) => p.machineType));
    expect(machineTypes.size).toBe(3);
    expect(machineTypes.has("lathe")).toBe(true);
    expect(machineTypes.has("mill")).toBe(true);
    expect(machineTypes.has("wedm")).toBe(true);
  });

  it("query results are sorted by frequency descending", async () => {
    const patterns = await jmDieProgramLearningEngine.query({});
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].frequency).toBeGreaterThanOrEqual(patterns[i].frequency);
    }
  });

  it("query filtered by machineType=lathe returns exactly 5 patterns (one per category)", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ machineType: "lathe" });
    expect(patterns.length).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(patterns.every((p) => p.machineType === "lathe")).toBe(true);
    const cats = new Set(patterns.map((p) => p.category));
    expect(cats.size).toBe(PATTERNS_PER_MACHINE_TYPE);
  });

  it("query filtered by category=threading returns exactly 3 patterns (one per machineType)", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ category: "threading" });
    expect(patterns.length).toBe(PATTERNS_PER_CATEGORY);
    expect(patterns.every((p) => p.category === "threading")).toBe(true);
  });

  it("query filtered by both machineType and category returns at most 1 pattern", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ machineType: "wedm", category: "drilling" });
    expect(patterns.length).toBe(1);
    expect(patterns[0].machineType).toBe("wedm");
    expect(patterns[0].category).toBe("drilling");
  });

  it("query with minFrequency above max possible returns empty array (failure mode)", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ minFrequency: ABOVE_MAX_SEEDED_FREQUENCY });
    expect(patterns.length).toBe(0);
  });

  it("query with minFrequency=0 returns all 15 patterns (no filter effect)", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ minFrequency: 0 });
    expect(patterns.length).toBe(SEEDED_PATTERN_COUNT);
  });

  it("query with limit=3 caps results to 3 even when more match", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ limit: SCHEMA_QUERY_LIMIT_SMALL });
    expect(patterns.length).toBe(SCHEMA_QUERY_LIMIT_SMALL);
  });

  it("query with limit above seed count returns all 15", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ limit: SCHEMA_QUERY_LIMIT_OVER_SEED });
    expect(patterns.length).toBe(SEEDED_PATTERN_COUNT);
  });

  it("getPattern returns full ProgramPattern shape for valid id", async () => {
    const pattern = await jmDieProgramLearningEngine.getPattern("pattern_1");
    if (!pattern) throw new Error("pattern_1 should exist after seeding");
    expect(pattern.id).toBe("pattern_1");
    expect(pattern.machineType).toBe("lathe");
    expect(pattern.category).toBe("roughing");
    expect(pattern.examples.length).toBe(2);
    expect(pattern.examples[0]).toBe("program_1_ex1");
    expect(pattern.examples[1]).toBe("program_1_ex2");
    expect(pattern.tips.length).toBe(1);
    expect(pattern.tips[0]).toBe("lathe roughing tip from JM DIE programs");
  });

  it("getPattern returns null for missing id (failure mode)", async () => {
    const pattern = await jmDieProgramLearningEngine.getPattern("pattern_999");
    expect(pattern).toBeNull();
  });

  it("getPattern with empty string returns null", async () => {
    const pattern = await jmDieProgramLearningEngine.getPattern("");
    expect(pattern).toBeNull();
  });

  it("pattern_15 (last seeded) is wedm/profiling", async () => {
    const pattern = await jmDieProgramLearningEngine.getPattern("pattern_15");
    if (!pattern) throw new Error("pattern_15 should exist");
    expect(pattern.machineType).toBe("wedm");
    expect(pattern.category).toBe("profiling");
    expect(pattern.name).toBe("JM DIE wedm profiling pattern");
  });

  it("getTips with no filter returns all 15 tips (one per pattern)", async () => {
    const tips = await jmDieProgramLearningEngine.getTips();
    expect(tips.length).toBe(SEEDED_PATTERN_COUNT);
    expect(tips.every((t) => typeof t === "string" && t.length > 0)).toBe(true);
    expect(tips.every((t) => t.endsWith("tip from JM DIE programs"))).toBe(true);
  });

  it("getTips filtered by machineType=mill returns exactly 5 tips", async () => {
    const tips = await jmDieProgramLearningEngine.getTips("mill");
    expect(tips.length).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(tips.every((t) => t.startsWith("mill "))).toBe(true);
  });

  it("getStats returns totalPrograms=36929 + 15 extractedPatterns + balanced aggregations", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.totalPrograms).toBe(TOTAL_JMDIE_PROGRAMS);
    expect(stats.analyzedPrograms).toBe(TOTAL_JMDIE_PROGRAMS);
    expect(stats.extractedPatterns).toBe(SEEDED_PATTERN_COUNT);
    expect(stats.extractedTips).toBe(SEEDED_PATTERN_COUNT);
    expect(stats.byMachineType.lathe).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(stats.byMachineType.mill).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(stats.byMachineType.wedm).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(stats.byCategory.roughing).toBe(PATTERNS_PER_CATEGORY);
    expect(stats.byCategory.finishing).toBe(PATTERNS_PER_CATEGORY);
    expect(stats.byCategory.threading).toBe(PATTERNS_PER_CATEGORY);
    expect(stats.byCategory.drilling).toBe(PATTERNS_PER_CATEGORY);
    expect(stats.byCategory.profiling).toBe(PATTERNS_PER_CATEGORY);
  });

  it("reset() clears patterns and forces re-seed on next query", async () => {
    await jmDieProgramLearningEngine.query({}); // initialize
    jmDieProgramLearningEngine.reset();
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.extractedPatterns).toBe(SEEDED_PATTERN_COUNT); // re-seeded
  });
});

describe("U-WIRE34 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' is a Zod schema and accepts minimal valid input", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    expect(schema instanceof z.ZodType).toBe(true);
    const minimal: Record<string, Record<string, unknown>> = {
      jmdie_query: {},
      jmdie_get_pattern: { id: "pattern_1" },
      jmdie_get_tips: {},
      jmdie_stats: {},
    };
    const parsed = schema.parse(minimal[action]);
    // .parse() throws on failure; if reached here, parse succeeded.
    expect(parsed).toEqual(minimal[action]);
  });

  it("jmdie_get_pattern requires non-empty id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["jmdie_get_pattern"];
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ id: "" })).toThrow();
    const result = schema.parse({ id: "x" }) as { id: string };
    expect(result.id).toBe("x");
  });

  it("jmdie_query rejects invalid machineType enum value (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["jmdie_query"];
    expect(() => schema.parse({ machineType: "press" })).toThrow();
    const result = schema.parse({ machineType: "lathe" }) as { machineType: string };
    expect(result.machineType).toBe("lathe");
  });

  it("jmdie_query rejects invalid category enum value (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["jmdie_query"];
    expect(() => schema.parse({ category: "boring" })).toThrow();
    const result = schema.parse({ category: "drilling" }) as { category: string };
    expect(result.category).toBe("drilling");
  });

  it("jmdie_query rejects negative minFrequency / out-of-range limit (failure modes)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["jmdie_query"];
    expect(() => schema.parse({ minFrequency: -1 })).toThrow();
    expect(() => schema.parse({ limit: SCHEMA_LIMIT_BELOW_MIN })).toThrow();
    expect(() => schema.parse({ limit: SCHEMA_LIMIT_ABOVE_MAX })).toThrow();
    expect(() => schema.parse({ limit: SCHEMA_LIMIT_NON_INTEGER })).toThrow();
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE34 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    jmDieProgramLearningEngine.reset();
  });

  it("jmdie_query returns {patterns, count} with count matching length", async () => {
    const out = await executeAIReasoningAction("jmdie_query", { machineType: "lathe" });
    expect(out.success).toBe(true);
    const data = out.data as { patterns: unknown[]; count: number };
    expect(Array.isArray(data.patterns)).toBe(true);
    expect(data.patterns.length).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(data.count).toBe(PATTERNS_PER_MACHINE_TYPE);
  });

  it("jmdie_get_pattern hit returns {pattern, found:true}", async () => {
    const out = await executeAIReasoningAction("jmdie_get_pattern", { id: "pattern_7" });
    expect(out.success).toBe(true);
    const data = out.data as { pattern: { id: string; machineType: string }; found: boolean };
    expect(data.found).toBe(true);
    expect(data.pattern.id).toBe("pattern_7");
    expect(data.pattern.machineType).toBe("mill"); // _6..10 = mill
  });

  it("jmdie_get_pattern miss returns {pattern:null, found:false}", async () => {
    const out = await executeAIReasoningAction("jmdie_get_pattern", { id: "nonexistent_id" });
    expect(out.success).toBe(true);
    const data = out.data as { pattern: unknown; found: boolean };
    expect(data.found).toBe(false);
    // Response-slim layer may strip top-level null fields; either is acceptable.
    expect(data.pattern === null || data.pattern === undefined).toBe(true);
  });

  it("jmdie_get_tips with machineType filter returns 5 wedm tips", async () => {
    const out = await executeAIReasoningAction("jmdie_get_tips", { machineType: "wedm" });
    expect(out.success).toBe(true);
    const data = out.data as { tips: string[]; count: number };
    expect(data.count).toBe(PATTERNS_PER_MACHINE_TYPE);
    expect(data.tips.every((t) => t.startsWith("wedm "))).toBe(true);
  });

  it("jmdie_stats returns full LearningStats shape", async () => {
    const out = await executeAIReasoningAction("jmdie_stats", {});
    expect(out.success).toBe(true);
    const stats = out.data as {
      totalPrograms: number;
      extractedPatterns: number;
      byMachineType: Record<string, number>;
    };
    expect(stats.totalPrograms).toBe(TOTAL_JMDIE_PROGRAMS);
    expect(stats.extractedPatterns).toBe(SEEDED_PATTERN_COUNT);
    expect(stats.byMachineType.lathe).toBe(PATTERNS_PER_MACHINE_TYPE);
  });

  it("jmdie_query with invalid machineType returns success:false from dispatcher", async () => {
    const out = await executeAIReasoningAction("jmdie_query", { machineType: "press" });
    expect(out.success).toBe(false);
    // Zod failure surfaces the rejected enum value in the message.
    expect(out.error).toMatch(/machineType|press|enum/i);
  });

  it("jmdie_get_pattern without id parameter returns success:false (failure mode)", async () => {
    const out = await executeAIReasoningAction("jmdie_get_pattern", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/id|required/i);
  });

  it("singleton state persists across dispatcher calls (no reset between)", async () => {
    const r1 = await executeAIReasoningAction("jmdie_stats", {});
    const r2 = await executeAIReasoningAction("jmdie_stats", {});
    const s1 = r1.data as { extractedPatterns: number };
    const s2 = r2.data as { extractedPatterns: number };
    expect(s1.extractedPatterns).toBe(SEEDED_PATTERN_COUNT);
    expect(s2.extractedPatterns).toBe(SEEDED_PATTERN_COUNT);
  });
});
