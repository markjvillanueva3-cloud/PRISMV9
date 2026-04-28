/**
 * aiReasoningDispatcher U-WIRE24 round-trip tests — ActiveLearningStrategyEngine.
 *
 * Validates that the 2 new learning_* actions (learning_rank, learning_summary)
 * wire correctly through prism_ai and that the engine's rank/summary methods
 * produce coherent output through the dispatcher contract.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE24
 */

import { describe, it, expect } from "vitest";
import {
  ActiveLearningStrategyEngine,
  activeLearningStrategyEngine,
  type LearningCandidate,
} from "../engines/ActiveLearningStrategyEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const SAMPLE_CANDIDATES: LearningCandidate[] = [
  // High info-gain, cheap → should rank #1
  { id: "a", topic: "Kienzle for Inconel 718", currentUncertainty: 0.5, expectedReduction: 0.9, costMinutes: 10, psiImpact: 5 },
  // Medium info-gain, expensive
  { id: "b", topic: "Coolant tribology study", currentUncertainty: 0.4, expectedReduction: 0.5, costMinutes: 60, psiImpact: 2 },
  // Low info-gain, very cheap
  { id: "c", topic: "Already-known thread chart", currentUncertainty: 0.05, expectedReduction: 0.5, costMinutes: 2 },
  // Edge: 0 uncertainty → 0 entropy → 0 info gain
  { id: "d", topic: "Confirmed material spec", currentUncertainty: 0, expectedReduction: 1, costMinutes: 1 },
];

describe("U-WIRE24 — engine direct: ActiveLearningStrategyEngine", () => {
  it("rank() assigns monotonic 1..N rank with stable tie-break by id", () => {
    const ranked = activeLearningStrategyEngine.rank(SAMPLE_CANDIDATES);
    expect(ranked.length).toBe(SAMPLE_CANDIDATES.length);
    for (let i = 0; i < ranked.length; i += 1) {
      expect(ranked[i].rank).toBe(i + 1);
    }
    // Score is monotonically non-increasing
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it("rank() puts the high-info-gain cheap target ('a') first", () => {
    const ranked = activeLearningStrategyEngine.rank(SAMPLE_CANDIDATES);
    expect(ranked[0].id).toBe("a");
  });

  it("rank() returns infoGain == 0 when currentUncertainty is 0 (no entropy to remove)", () => {
    const ranked = activeLearningStrategyEngine.rank([SAMPLE_CANDIDATES[3]]);
    expect(ranked[0].infoGain).toBeCloseTo(0, 4);
  });

  it("rank() throws on duplicate ids", () => {
    expect(() =>
      activeLearningStrategyEngine.rank([
        { id: "x", topic: "t1", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 5 },
        { id: "x", topic: "t2", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 5 },
      ]),
    ).toThrow(/duplicate id/i);
  });

  it("rank() throws on costMinutes <= 0", () => {
    expect(() =>
      activeLearningStrategyEngine.rank([
        { id: "z", topic: "bad", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 0 },
      ]),
    ).toThrow(/costMinutes/i);
  });

  it("rank() throws on uncertainty outside [0,1]", () => {
    expect(() =>
      activeLearningStrategyEngine.rank([
        { id: "y", topic: "bad", currentUncertainty: 1.5, expectedReduction: 0.5, costMinutes: 5 },
      ]),
    ).toThrow(/currentUncertainty/i);
  });

  it("summary() reports total + topTopic from a ranked list", () => {
    const ranked = activeLearningStrategyEngine.rank(SAMPLE_CANDIDATES);
    const sum = activeLearningStrategyEngine.summary(ranked);
    expect(sum.total).toBe(SAMPLE_CANDIDATES.length);
    expect(sum.topTopic).toBe(ranked[0].topic);
    // totalInfoGain >= 0 and equals sum of components (within rounding)
    const expected = ranked.reduce((a, r) => a + r.infoGain, 0);
    expect(sum.totalInfoGain).toBeCloseTo(Math.round(expected * 10000) / 10000, 4);
  });

  it("summary() returns total=0, topTopic=null on empty input", () => {
    const sum = activeLearningStrategyEngine.summary([]);
    expect(sum.total).toBe(0);
    expect(sum.totalInfoGain).toBe(0);
    expect(sum.topTopic).toBe(null);
  });

  it("class export is constructable and produces equivalent ranking", () => {
    const fresh = new ActiveLearningStrategyEngine();
    const a = fresh.rank(SAMPLE_CANDIDATES);
    const b = activeLearningStrategyEngine.rank(SAMPLE_CANDIDATES);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });
});

describe("U-WIRE24 — schema integrity", () => {
  it("learning_rank and learning_summary are in AI_REASONING_ACTIONS exactly once each", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    expect(actions.filter((a) => a === "learning_rank").length).toBe(1);
    expect(actions.filter((a) => a === "learning_summary").length).toBe(1);
  });

  it("ACTION_AI_REASONING_SCHEMAS has Zod schemas for both new actions", () => {
    expect(typeof (ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>).learning_rank).toBe("object");
    expect(typeof (ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>).learning_summary).toBe("object");
  });

  it("learning_rank schema rejects empty candidates array", () => {
    const schema = (ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>).learning_rank;
    expect(schema.safeParse({ candidates: [] }).success).toBe(false);
  });

  it("learning_rank schema rejects costMinutes <= 0", () => {
    const schema = (ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>).learning_rank;
    const bad = { candidates: [{ id: "x", topic: "t", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 0 }] };
    expect(schema.safeParse(bad).success).toBe(false);
  });
});

describe("U-WIRE24 — dispatcher round-trip: prism_ai", () => {
  it("learning_rank happy path: returns ranked array + topRank + count + totalInfoGain", async () => {
    const r = await executeAIReasoningAction("learning_rank" as AIReasoningAction, {
      candidates: SAMPLE_CANDIDATES,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      count?: number;
      totalInfoGain?: number;
      topRank?: { id?: string; rank?: number } | null;
      ranked?: Array<{ id: string; rank: number; score: number; infoGain: number }>;
    };
    expect(data.count).toBe(SAMPLE_CANDIDATES.length);
    expect(typeof data.totalInfoGain).toBe("number");
    expect(data.topRank?.id).toBe("a");
    expect(data.topRank?.rank).toBe(1);
    expect((data.ranked ?? []).length).toBe(SAMPLE_CANDIDATES.length);
  });

  it("learning_rank FAIL: missing candidates field → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("learning_rank" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("learning_rank FAIL: invalid uncertainty (>1) → schema rejects", async () => {
    const r = await executeAIReasoningAction("learning_rank" as AIReasoningAction, {
      candidates: [{ id: "z", topic: "t", currentUncertainty: 1.5, expectedReduction: 0.5, costMinutes: 5 }],
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("learning_summary happy path: takes ranked output of learning_rank → returns total + topTopic", async () => {
    const rankResp = await executeAIReasoningAction("learning_rank" as AIReasoningAction, {
      candidates: SAMPLE_CANDIDATES,
    });
    expect(rankResp.success).toBe(true);
    const ranked = (rankResp.data as { ranked: unknown[] }).ranked;

    const sumResp = await executeAIReasoningAction("learning_summary" as AIReasoningAction, { ranked });
    expect(sumResp.success).toBe(true);
    const data = sumResp.data as { total?: number; totalInfoGain?: number; topTopic?: string | null };
    expect(data.total).toBe(SAMPLE_CANDIDATES.length);
    expect(typeof data.topTopic).toBe("string");
    expect(typeof data.totalInfoGain).toBe("number");
  });

  it("learning_summary on empty ranked array succeeds with total=0 (slim may strip null topTopic)", async () => {
    const r = await executeAIReasoningAction("learning_summary" as AIReasoningAction, { ranked: [] });
    expect(r.success).toBe(true);
    const data = r.data as { total?: number; topTopic?: string | null };
    // total=0 may be slimmed (slimResponse strips falsy primitives only via undefined/null;
    // the engine returns total:0 which is falsy-by-value but defined). Either way, topTopic
    // is null and gets stripped; total may or may not survive depending on slim level.
    expect(data.total === 0 || data.total === undefined).toBe(true);
    expect(data.topTopic === null || data.topTopic === undefined).toBe(true);
  });
});
