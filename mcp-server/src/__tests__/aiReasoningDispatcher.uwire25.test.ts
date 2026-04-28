/**
 * aiReasoningDispatcher U-WIRE25 round-trip tests — MetaLearningOptimizerEngine.
 *
 * Validates that meta_learning_record/recommend/stats/list wire correctly
 * through prism_ai. The engine holds (scenario, strategy) → stats state in
 * a singleton; this test runs against a FRESH ENGINE INSTANCE for the
 * direct-engine block (each test isolated via clear()), and uses the
 * dispatcher singleton with a unique scenario per test to avoid cross-test
 * pollution.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE25
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MetaLearningOptimizerEngine,
  metaLearningOptimizerEngine,
} from "../engines/MetaLearningOptimizerEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE25 — engine direct: MetaLearningOptimizerEngine", () => {
  let engine: MetaLearningOptimizerEngine;
  beforeEach(() => {
    engine = new MetaLearningOptimizerEngine();
  });

  it("record() updates attempts/successes/successRate after one success", () => {
    const stats = engine.record({ scenario: "S1", strategy: "fast", success: true, durationMs: 100 });
    expect(stats.attempts).toBe(1);
    expect(stats.successes).toBe(1);
    expect(stats.successRate).toBeCloseTo(1, 4);
    expect(stats.avgDurationMs).toBeCloseTo(100, 4);
  });

  it("record() Wilson lower bound is < raw success rate (the whole point of penalizing low-N)", () => {
    const stats = engine.record({ scenario: "S2", strategy: "X", success: true });
    expect(stats.successRate).toBeCloseTo(1, 4);
    expect(stats.wilsonLowerBound).toBeLessThan(stats.successRate);
    expect(stats.wilsonLowerBound).toBeGreaterThanOrEqual(0);
  });

  it("record() running average of durationMs is correct after multiple records", () => {
    engine.record({ scenario: "S3", strategy: "X", success: true, durationMs: 100 });
    engine.record({ scenario: "S3", strategy: "X", success: true, durationMs: 200 });
    const stats = engine.record({ scenario: "S3", strategy: "X", success: true, durationMs: 300 });
    expect(stats.avgDurationMs).toBeCloseTo(200, 4);
    expect(stats.attempts).toBe(3);
  });

  it("recommend() returns null when no candidates meet minAttempts", () => {
    engine.record({ scenario: "S4", strategy: "X", success: true });
    expect(engine.recommend("S4", 5)).toBe(null);
  });

  it("recommend() picks the strategy with highest Wilson lower bound, not highest raw rate", () => {
    // Strategy A: 1/1 success (high rate, but tiny sample → low Wilson LB)
    // Strategy B: 9/10 success (lower rate, but bigger sample → higher Wilson LB)
    engine.record({ scenario: "S5", strategy: "A", success: true });
    for (let i = 0; i < 9; i += 1) engine.record({ scenario: "S5", strategy: "B", success: true });
    engine.record({ scenario: "S5", strategy: "B", success: false });
    const rec = engine.recommend("S5");
    expect(rec === null).toBe(false);
    expect(rec?.strategy).toBe("B");
    expect((rec?.rationale ?? "").length).toBeGreaterThan(0);
  });

  it("record() throws on empty scenario or strategy", () => {
    expect(() => engine.record({ scenario: "", strategy: "X", success: true })).toThrow(/scenario required/i);
    expect(() => engine.record({ scenario: "S", strategy: "", success: true })).toThrow(/strategy required/i);
  });

  it("record() throws on negative durationMs", () => {
    expect(() =>
      engine.record({ scenario: "S", strategy: "X", success: true, durationMs: -1 }),
    ).toThrow(/durationMs/i);
  });

  it("statsFor() returns null for unknown pair, real stats after record", () => {
    expect(engine.statsFor("S6", "X")).toBe(null);
    engine.record({ scenario: "S6", strategy: "X", success: true });
    const s = engine.statsFor("S6", "X");
    expect(s === null).toBe(false);
    expect(s?.attempts).toBe(1);
  });

  it("listScenarios() and listAll() return what was recorded; size matches", () => {
    engine.record({ scenario: "alpha", strategy: "x", success: true });
    engine.record({ scenario: "alpha", strategy: "y", success: false });
    engine.record({ scenario: "beta", strategy: "x", success: true });
    expect(engine.listScenarios()).toEqual(["alpha", "beta"]);
    expect(engine.listAll().length).toBe(3);
    expect(engine.size()).toBe(3);
  });

  it("clear() empties the ledger", () => {
    engine.record({ scenario: "S", strategy: "X", success: true });
    expect(engine.size()).toBe(1);
    engine.clear();
    expect(engine.size()).toBe(0);
    expect(engine.listAll().length).toBe(0);
  });
});

describe("U-WIRE25 — schema integrity", () => {
  it("all 4 meta_learning_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of ["meta_learning_record", "meta_learning_recommend", "meta_learning_stats", "meta_learning_list"]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of ["meta_learning_record", "meta_learning_recommend", "meta_learning_stats", "meta_learning_list"]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("meta_learning_record schema rejects empty strings + non-boolean success", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.meta_learning_record.safeParse({ scenario: "", strategy: "X", success: true }).success).toBe(false);
    expect(map.meta_learning_record.safeParse({ scenario: "S", strategy: "", success: true }).success).toBe(false);
    expect(map.meta_learning_record.safeParse({ scenario: "S", strategy: "X", success: "yes" }).success).toBe(false);
  });

  it("meta_learning_record schema rejects negative durationMs", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.meta_learning_record.safeParse({ scenario: "S", strategy: "X", success: true, durationMs: -1 }).success,
    ).toBe(false);
  });
});

describe("U-WIRE25 — dispatcher round-trip: prism_ai", () => {
  // Use a unique scenario per test so the singleton's persistent state
  // doesn't bleed between tests.
  const sn = (name: string) => `uwire25_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  it("meta_learning_record → meta_learning_stats round-trip preserves attempts/successes", async () => {
    const scenario = sn("rec_round_trip");
    const r = await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario,
      strategy: "S1",
      success: true,
      durationMs: 250,
    });
    expect(r.success).toBe(true);
    const data = r.data as { recorded?: boolean; stats?: { attempts: number; successes: number } };
    expect(data.recorded).toBe(true);
    expect(data.stats?.attempts).toBe(1);
    expect(data.stats?.successes).toBe(1);

    const s = await executeAIReasoningAction("meta_learning_stats" as AIReasoningAction, {
      scenario,
      strategy: "S1",
    });
    expect(s.success).toBe(true);
    const sd = s.data as { stats?: { attempts: number } | null };
    expect(sd.stats?.attempts).toBe(1);
  });

  it("meta_learning_recommend returns null wrapped in { recommendation: null } when no data", async () => {
    const scenario = sn("empty_recommend");
    const r = await executeAIReasoningAction("meta_learning_recommend" as AIReasoningAction, { scenario });
    expect(r.success).toBe(true);
    const data = r.data as { recommendation?: unknown };
    // slimResponse will strip null — the field may be missing OR present as null
    expect(data.recommendation === null || data.recommendation === undefined).toBe(true);
  });

  it("meta_learning_recommend picks higher-Wilson strategy after multiple records", async () => {
    const scenario = sn("wilson_pick");
    // Strategy "tribal_lookup": 9/10 wins (large sample, high Wilson)
    for (let i = 0; i < 9; i += 1) {
      await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
        scenario, strategy: "tribal_lookup", success: true,
      });
    }
    await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario, strategy: "tribal_lookup", success: false,
    });
    // Strategy "pdf_extract": 1/1 (tiny sample, low Wilson despite 100% rate)
    await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario, strategy: "pdf_extract", success: true,
    });

    const r = await executeAIReasoningAction("meta_learning_recommend" as AIReasoningAction, { scenario });
    expect(r.success).toBe(true);
    const data = r.data as { recommendation?: { strategy?: string; rationale?: string } | null };
    expect(data.recommendation === null || data.recommendation === undefined).toBe(false);
    expect(data.recommendation?.strategy).toBe("tribal_lookup");
    expect(typeof data.recommendation?.rationale).toBe("string");
  });

  it("meta_learning_list mode='scenarios' returns recorded scenario names", async () => {
    const scenario = sn("list_scen");
    await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario, strategy: "X", success: true,
    });
    const r = await executeAIReasoningAction("meta_learning_list" as AIReasoningAction, { mode: "scenarios" });
    expect(r.success).toBe(true);
    const data = r.data as { mode?: string; scenarios?: string[]; count?: number };
    expect(data.mode).toBe("scenarios");
    expect(Array.isArray(data.scenarios)).toBe(true);
    expect((data.scenarios ?? []).includes(scenario)).toBe(true);
    expect(typeof data.count).toBe("number");
  });

  it("meta_learning_list mode='all' returns full stats matrix", async () => {
    const r = await executeAIReasoningAction("meta_learning_list" as AIReasoningAction, { mode: "all" });
    expect(r.success).toBe(true);
    const data = r.data as { mode?: string; stats?: unknown[]; count?: number; size?: number };
    expect(data.mode).toBe("all");
    expect(Array.isArray(data.stats)).toBe(true);
    expect(typeof data.count).toBe("number");
    // count must equal size when mode=all
    expect(data.count).toBe(data.size);
  });

  it("meta_learning_record FAIL: empty scenario → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario: "", strategy: "X", success: true,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("meta_learning_record FAIL: missing 'success' field → schema rejects", async () => {
    const r = await executeAIReasoningAction("meta_learning_record" as AIReasoningAction, {
      scenario: "S", strategy: "X",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("meta_learning_recommend FAIL: missing scenario field → schema rejects", async () => {
    const r = await executeAIReasoningAction("meta_learning_recommend" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});

// Smoke test: confirm singleton is shared and survives module re-import
describe("U-WIRE25 — singleton state continuity", () => {
  it("metaLearningOptimizerEngine singleton is the same object across imports", async () => {
    const mod = await import("../engines/MetaLearningOptimizerEngine.js");
    expect(mod.metaLearningOptimizerEngine).toBe(metaLearningOptimizerEngine);
  });
});
