/**
 * RecallRankingEngine tests — HMEMV02.  Asserts exact arithmetic on
 * recency/access norm/raw score, MMR ordering, and schema rejection of
 * weights that don't sum to 1.0.
 */
import { describe, it, expect } from "vitest";
import {
  RecallRankingEngine,
  DEFAULT_WEIGHTS,
  type RankableCandidate,
  type RankingWeights,
} from "../engines/RecallRankingEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";

const cand = (
  id: string, sim: number, accessed_at: string, access_count: number, embedding?: number[],
): RankableCandidate => ({
  candidate_id: id, key: `k_${id}`, similarity: sim,
  accessed_at, access_count, embedding,
});

describe("RecallRankingEngine.recencyScore — exponential decay", () => {
  it("returns 1.0 for accessed_at = now", () => {
    expect(RecallRankingEngine.recencyScore(ISO, ISO)).toBe(1);
  });

  it("returns 0.5 for 24h ago (half-life boundary)", () => {
    const day_ago = "2026-05-23T13:00:00.000Z";
    expect(RecallRankingEngine.recencyScore(day_ago, ISO)).toBeCloseTo(0.5, 9);
  });

  it("returns 0.25 for 48h ago (two half-lives)", () => {
    const two_days_ago = "2026-05-22T13:00:00.000Z";
    expect(RecallRankingEngine.recencyScore(two_days_ago, ISO)).toBeCloseTo(0.25, 9);
  });

  it("clamps to 1.0 if accessed_at > now (future access)", () => {
    const future = "2026-05-25T13:00:00.000Z";
    expect(RecallRankingEngine.recencyScore(future, ISO)).toBe(1);
  });
});

describe("RecallRankingEngine.accessNorm — normalization", () => {
  it("returns 0 for count=0", () => {
    expect(RecallRankingEngine.accessNorm(0)).toBe(0);
  });

  it("returns 0.5 for count=10 (half of MAX_ACCESS_NORM=20)", () => {
    expect(RecallRankingEngine.accessNorm(10)).toBe(0.5);
  });

  it("clamps at 1.0 for count beyond max", () => {
    expect(RecallRankingEngine.accessNorm(100)).toBe(1);
  });

  it("returns 0 for invalid inputs (NaN, Infinity, negative)", () => {
    expect(RecallRankingEngine.accessNorm(NaN)).toBe(0);
    expect(RecallRankingEngine.accessNorm(Infinity)).toBe(0);
    expect(RecallRankingEngine.accessNorm(-5)).toBe(0);
  });
});

describe("RecallRankingEngine.rawScore — exact composite", () => {
  it("computes w_sim*sim + w_rec*1 + w_acc*0.5 for canonical case", () => {
    const c = cand("c1", 0.8, ISO, 10);
    const score = RecallRankingEngine.rawScore(c, DEFAULT_WEIGHTS, ISO);
    // 0.6*0.8 + 0.25*1 + 0.15*0.5 = 0.48 + 0.25 + 0.075 = 0.805
    expect(score).toBeCloseTo(0.805, 9);
  });

  it("zero similarity + fresh access still scores from recency + access alone", () => {
    const c = cand("c1", 0, ISO, 20);
    const score = RecallRankingEngine.rawScore(c, DEFAULT_WEIGHTS, ISO);
    // 0.6*0 + 0.25*1 + 0.15*1 = 0.40
    expect(score).toBeCloseTo(0.40, 9);
  });
});

describe("RecallRankingEngine.rank — ordering + MMR", () => {
  it("ranks 3 candidates by raw_score DESC when no embeddings (degenerate MMR)", () => {
    const cands = [
      cand("c_low",  0.1, ISO, 0),
      cand("c_high", 0.9, ISO, 0),
      cand("c_mid",  0.5, ISO, 0),
    ];
    const ranked = RecallRankingEngine.rank(cands, DEFAULT_WEIGHTS, ISO);
    expect(ranked[0].candidate_id).toBe("c_high");
    expect(ranked[1].candidate_id).toBe("c_mid");
    expect(ranked[2].candidate_id).toBe("c_low");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });

  it("MMR with high embedding similarity diversifies away from top candidate", () => {
    // c_a + c_b identical embeddings; c_c orthogonal.  With λ=0.5 + identical
    // raws, MMR should pick c_a first, then c_c (orthogonal), then c_b (penalized).
    const cands = [
      { ...cand("c_a", 0.9, ISO, 0, [1, 0, 0]) },
      { ...cand("c_b", 0.9, ISO, 0, [1, 0, 0]) },
      { ...cand("c_c", 0.9, ISO, 0, [0, 1, 0]) },
    ];
    const w: RankingWeights = { similarity: 0.6, recency: 0.25, access_frequency: 0.15, mmr_lambda: 0.5 };
    const ranked = RecallRankingEngine.rank(cands, w, ISO);
    expect(ranked[0].candidate_id).toBe("c_a");
    // After c_a, c_c (orthogonal) should outrank c_b (duplicate of c_a).
    expect(ranked[1].candidate_id).toBe("c_c");
    expect(ranked[2].candidate_id).toBe("c_b");
  });

  it("topK truncates the ranked list to exactly K entries", () => {
    const cands = [
      cand("c1", 0.9, ISO, 0),
      cand("c2", 0.8, ISO, 0),
      cand("c3", 0.7, ISO, 0),
      cand("c4", 0.6, ISO, 0),
    ];
    const ranked = RecallRankingEngine.rank(cands, DEFAULT_WEIGHTS, ISO, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].candidate_id).toBe("c1");
    expect(ranked[1].candidate_id).toBe("c2");
  });

  it("empty candidate list returns empty result (boundary)", () => {
    expect(RecallRankingEngine.rank([], DEFAULT_WEIGHTS, ISO)).toEqual([]);
  });
});

describe("RecallRankingEngine — schema rejection (adversarial)", () => {
  it("rejects weights that don't sum to 1.0", () => {
    expect(() => RecallRankingEngine.rank([cand("c1", 0.5, ISO, 0)], {
      similarity: 0.5, recency: 0.5, access_frequency: 0.5, mmr_lambda: 0.5,
    }, ISO)).toThrow(/sum/);
  });

  it("rejects similarity outside [0,1] (NaN, negative, >1)", () => {
    expect(() => RecallRankingEngine.rank([cand("c1", NaN, ISO, 0)], DEFAULT_WEIGHTS, ISO)).toThrow();
    expect(() => RecallRankingEngine.rank([cand("c1", -0.1, ISO, 0)], DEFAULT_WEIGHTS, ISO)).toThrow();
    expect(() => RecallRankingEngine.rank([cand("c1", 1.1, ISO, 0)], DEFAULT_WEIGHTS, ISO)).toThrow();
  });

  it("rejects non-array candidates input", () => {
    expect(() => RecallRankingEngine.rank(null as never, DEFAULT_WEIGHTS, ISO)).toThrow(/array/);
  });
});

describe("RecallRankingEngine.renderRanking", () => {
  it("renders header + per-result lines with raw + final scores", () => {
    const ranked = RecallRankingEngine.rank(
      [cand("c1", 0.9, ISO, 10), cand("c2", 0.5, ISO, 0)],
      DEFAULT_WEIGHTS, ISO,
    );
    const md = RecallRankingEngine.renderRanking(ranked);
    expect(md.includes("[RANKING] 2 result(s)")).toBe(true);
    expect(md.includes("k_c1")).toBe(true);
    expect(md.includes("k_c2")).toBe(true);
    expect(md.includes("#1")).toBe(true);
  });

  it("renders empty banner when ranking is empty", () => {
    expect(RecallRankingEngine.renderRanking([])).toBe("[RANKING] (empty)");
  });
});
