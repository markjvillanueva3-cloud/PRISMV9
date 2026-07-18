// @ts-nocheck
/**
 * CAM strategy empirical re-rank tests (U2: closed-loop CONSUME).
 *
 * U1 made SelfLearningCAMEngine persist learned strategy effectiveness across
 * restarts. U2 makes the GENERATION side consume it: CAMStrategyRecommenderEngine
 * nudges its catalog scores by the learned win-rate per strategy (bounded,
 * confidence-scaled), and the cam_func_strategy_recommend dispatcher feeds it the
 * live ranking. This closes the loop: learn -> persist -> reload -> influence the
 * next recommendation.
 */
import { describe, it, expect } from "vitest";
import {
  CAMStrategyRecommenderEngine,
  empiricalScoreDelta,
} from "../engines/CAMStrategyRecommenderEngine.js";
import { dispatchCamFunction } from "../tools/dispatchers/camFunctionDispatcher.js";
import { selfLearningCAMEngine } from "../engines/SelfLearningCAMEngine.js";

/** Max bounded delta a high-confidence win-rate of 1.0 can apply. */
const MAX_DELTA = 0.15;
const QUERY = { target_cam: "fusion360", part_hint: "adaptive roughing pocket", material: "aluminum 6061" };

describe("empiricalScoreDelta (bounded, confidence-scaled learned re-rank)", () => {
  it("high-confidence win-rate 1.0 yields the max +0.15 boost", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 1.0, confidence: "high", observations: 100 })).toBeCloseTo(MAX_DELTA, 9);
  });
  it("high-confidence win-rate 0.0 yields the max -0.15 dampen", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 0.0, confidence: "high", observations: 100 })).toBeCloseTo(-MAX_DELTA, 9);
  });
  it("win-rate 0.5 is neutral (exactly zero delta)", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 0.5, confidence: "high", observations: 100 })).toBe(0);
  });
  it("confidence scales the magnitude (low = 0.3x, medium = 0.65x of high)", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 1.0, confidence: "low", observations: 5 })).toBeCloseTo(0.3 * 0.3 * 0.5, 9);
    expect(empiricalScoreDelta({ strategy: "x", winRate: 1.0, confidence: "medium", observations: 20 })).toBeCloseTo(0.3 * 0.65 * 0.5, 9);
  });
  it("zero observations or a missing signal yields zero (graceful)", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 1.0, confidence: "high", observations: 0 })).toBe(0);
    expect(empiricalScoreDelta(undefined)).toBe(0);
  });
  it("win-rate is clamped to [0,1] before centering (no out-of-range blow-up)", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: 5, confidence: "high", observations: 100 })).toBeCloseTo(MAX_DELTA, 9);
    expect(empiricalScoreDelta({ strategy: "x", winRate: -3, confidence: "high", observations: 100 })).toBeCloseTo(-MAX_DELTA, 9);
  });
  it("a non-finite win-rate (NaN / Infinity) yields zero, never poisons the score", () => {
    expect(empiricalScoreDelta({ strategy: "x", winRate: NaN, confidence: "high", observations: 100 })).toBe(0);
    expect(empiricalScoreDelta({ strategy: "x", winRate: Infinity, confidence: "high", observations: 100 })).toBe(0);
  });
});

describe("CAMStrategyRecommenderEngine empirical re-rank (closed-loop consume)", () => {
  const engine = new CAMStrategyRecommenderEngine();

  it("no empirical signal is byte-identical to baseline (cold callers unaffected)", () => {
    const a = engine.recommend(QUERY);
    const b = engine.recommend({ ...QUERY, empirical_ranking: [] });
    expect(b).toEqual(a);
    expect(a.alternatives.every((c) => !c.empirical_adjusted)).toBe(true);
  });

  it("boosting the winner with a high win-rate raises its score by exactly the delta and surfaces it", () => {
    const base = engine.recommend(QUERY);
    expect(base.recommended_score).toBeGreaterThan(0); // a real winner exists
    const W = base.recommended_strategy;
    const boosted = engine.recommend({
      ...QUERY,
      empirical_ranking: [{ strategy: W, winRate: 1.0, confidence: "high", observations: 100 }],
    });
    expect(boosted.recommended_strategy).toBe(W); // boosting the winner keeps it the winner
    expect(boosted.recommended_score).toBeCloseTo(base.recommended_score + MAX_DELTA, 9);
    expect(boosted.rationale).toContain("learned win-rate 1.00, high confidence");
  });

  it("a learned signal for a strategy NOT in the corpus changes nothing (graceful no-op)", () => {
    const base = engine.recommend(QUERY);
    const out = engine.recommend({
      ...QUERY,
      empirical_ranking: [{ strategy: "__no_such_strategy__", winRate: 1.0, confidence: "high", observations: 100 }],
    });
    expect(out.recommended_strategy).toBe(base.recommended_strategy);
    expect(out.recommended_score).toBeCloseTo(base.recommended_score, 9);
  });

  it("a boosted alternative can overtake a dampened winner (re-sort closes the loop)", () => {
    const base = engine.recommend(QUERY);
    expect(base.alternatives.length).toBeGreaterThan(0);
    const alt0 = base.alternatives[0];
    const gap = base.recommended_score - alt0.score;
    const out = engine.recommend({
      ...QUERY,
      empirical_ranking: [
        { strategy: alt0.strategy, winRate: 1.0, confidence: "high", observations: 100 },
        { strategy: base.recommended_strategy, winRate: 0.0, confidence: "high", observations: 100 },
      ],
    });
    if (gap < 2 * MAX_DELTA) {
      // the 0.30 swing covers the baseline gap -> the alternative overtakes
      expect(out.recommended_strategy).toBe(alt0.strategy);
    } else {
      // winner held, but it was dampened by exactly the delta
      expect(out.recommended_score).toBeCloseTo(base.recommended_score - MAX_DELTA, 9);
    }
  });
});

describe("cam_func_strategy_recommend dispatcher round-trip (R15 wire-through)", () => {
  it("returns a recommendation through the dispatcher (learned consume wired, fail-soft)", async () => {
    const res = await dispatchCamFunction("cam_func_strategy_recommend", { ...QUERY });
    expect(res.recommended_score).toBeGreaterThan(0);
    expect(res.mode).toBe("production");
  });

  it("use_learned:false skips the learner and still returns a recommendation", async () => {
    const res = await dispatchCamFunction("cam_func_strategy_recommend", { ...QUERY, use_learned: false });
    expect(res.recommended_score).toBeGreaterThan(0);
  });

  it("a seeded learned win-rate flows through the dispatcher into the re-rank (end-to-end loop)", async () => {
    const base = await dispatchCamFunction("cam_func_strategy_recommend", { ...QUERY, use_learned: false });
    const W = base.recommended_strategy;
    // Seed the singleton learner with observations where the winning strategy is
    // the best performer, so strategyRanking() returns a non-empty ranking for W.
    for (let i = 0; i < 6; i++) {
      selfLearningCAMEngine.cutToLearn({
        observations: [
          {
            jobId: `seed-${i}`,
            machineId: "VMC-01",
            materialGroup: "N",
            strategy: W,
            cuttingParams: { speed_mpm: 400, feed_mmtooth: 0.1, axial_depth_mm: 3, radial_depth_mm: 6, tool_diameter_mm: 12 },
            actuals: { force_N: 800, surface_finish_Ra_um: 0.8, tool_life_min: 90 },
            predicted: { force_N: 850, surface_finish_Ra_um: 1.0, tool_life_min: 80 },
          },
        ],
      });
    }
    const learned = await dispatchCamFunction("cam_func_strategy_recommend", { ...QUERY });
    // Seeding W with good outcomes can only boost or hold W; it must stay the
    // winner and the loop must not error. (Score >= cold score.)
    expect(learned.recommended_strategy).toBe(W);
    expect(learned.recommended_score).toBeGreaterThanOrEqual(base.recommended_score);
  });
});
