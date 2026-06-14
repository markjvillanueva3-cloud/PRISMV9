import { describe, it, expect } from "vitest";
import { RetrievalEvalEngine, retrievalEvalEngine } from "../engines/RetrievalEvalEngine.js";

const e = new RetrievalEvalEngine();

describe("RetrievalEvalEngine.precisionAtK", () => {
  it("scores the relevant fraction of the top-k", () => {
    expect(e.precisionAtK(["a", "b", "c", "d"], ["a", "c"], 1)).toBe(1);     // [a] → 1/1
    expect(e.precisionAtK(["a", "b", "c", "d"], ["a", "c"], 2)).toBe(0.5);   // [a,b] → 1/2
    expect(e.precisionAtK(["a", "b", "c", "d"], ["a", "c"], 4)).toBe(0.5);   // 2/4
  });
  it("clamps k to the retrieved length", () => {
    expect(e.precisionAtK(["a", "b", "c", "d"], ["a", "c"], 10)).toBe(0.5);  // k→4, 2/4
  });
  it("returns 0 for k<=0, empty retrieved, or empty relevant", () => {
    expect(e.precisionAtK(["a", "b"], ["a"], 0)).toBe(0);
    expect(e.precisionAtK(["a", "b"], ["a"], -3)).toBe(0);
    expect(e.precisionAtK([], ["a"], 5)).toBe(0);
    expect(e.precisionAtK(["a", "b"], [], 2)).toBe(0);
  });
  it("de-duplicates retrieved ids so a repeat cannot inflate precision", () => {
    expect(e.precisionAtK(["a", "a", "b"], ["a"], 2)).toBe(0.5);  // dedupe→[a,b]
  });
  it("tolerates NaN k", () => {
    expect(e.precisionAtK(["a", "b"], ["a"], Number.NaN)).toBe(0);
  });
});

describe("RetrievalEvalEngine.recallAtK", () => {
  it("scores the fraction of relevant items found in the top-k", () => {
    expect(e.recallAtK(["a", "b", "c", "d"], ["a", "c"], 2)).toBe(0.5);  // 1 of 2
    expect(e.recallAtK(["a", "b", "c", "d"], ["a", "c"], 4)).toBe(1);    // 2 of 2
  });
  it("divides by relevant-set size, not k", () => {
    expect(e.recallAtK(["a", "b", "c"], ["a", "x", "y"], 3)).toBeCloseTo(1 / 3, 10);
  });
  it("returns 0 for an empty relevant set (no signal, not 1)", () => {
    expect(e.recallAtK(["a", "b"], [], 2)).toBe(0);
  });
});

describe("RetrievalEvalEngine.reciprocalRank", () => {
  it("is 1/rank of the first relevant hit", () => {
    expect(e.reciprocalRank(["a", "b"], ["a"])).toBe(1);
    expect(e.reciprocalRank(["b", "a", "c"], ["a"])).toBe(0.5);
    expect(e.reciprocalRank(["b", "c", "a"], ["a"])).toBeCloseTo(1 / 3, 10);
  });
  it("is 0 when no relevant id is retrieved", () => {
    expect(e.reciprocalRank(["b", "c"], ["a"])).toBe(0);
  });
});

describe("RetrievalEvalEngine.averagePrecision", () => {
  it("averages precision at each relevant hit over the relevant count", () => {
    // [a,b,c] vs {a,c}: hit@1 p=1/1=1, hit@3 p=2/3 → (1 + 0.6667)/2 = 0.8333
    expect(e.averagePrecision(["a", "b", "c"], ["a", "c"])).toBeCloseTo(0.8333333, 6);
  });
  it("is 1 only when every relevant id is retrieved contiguously at the top", () => {
    expect(e.averagePrecision(["a", "c", "b"], ["a", "c"])).toBe(1);
  });
  it("is 0 for empty relevant or no hits", () => {
    expect(e.averagePrecision(["a", "b", "c"], [])).toBe(0);
    expect(e.averagePrecision(["b", "c"], ["a"])).toBe(0);
  });
});

describe("RetrievalEvalEngine.evaluateQuery", () => {
  it("bundles all metrics for one query", () => {
    const s = e.evaluateQuery("q", ["a", "b", "c", "d"], ["a", "c"], [1, 2, 4]);
    expect(s.retrievedCount).toBe(4);
    expect(s.relevantCount).toBe(2);
    expect(s.precisionAtK[1]).toBe(1);
    expect(s.precisionAtK[2]).toBe(0.5);
    expect(s.recallAtK[4]).toBe(1);
    expect(s.reciprocalRank).toBe(1);
    // [a,b,c,d] vs {a,c}: c is at rank 3 → AP = (1/1 + 2/3) / 2 = 0.8333
    expect(s.averagePrecision).toBeCloseTo(0.8333333, 6);
  });
});

describe("RetrievalEvalEngine.evaluateQuerySet", () => {
  const queries = [
    { query: "q1", relevantIds: ["a", "c"] },
    { query: "q2", relevantIds: ["x"] },
  ];
  const retrieve = (q: string): string[] =>
    q === "q1" ? ["a", "b", "c", "d"] : ["y", "x"];

  it("aggregates MRR, mAP and mean precision/recall over the set", async () => {
    const r = await retrievalEvalEngine.evaluateQuerySet(queries, retrieve, [1, 2]);
    expect(r.queryCount).toBe(2);
    // q1 p@1=1 p@2=0.5 ; q2 p@1=0 p@2=0.5
    expect(r.meanPrecisionAtK[1]).toBe(0.5);
    expect(r.meanPrecisionAtK[2]).toBe(0.5);
    // q1 r@1=0.5 r@2=0.5 ; q2 r@1=0 r@2=1
    expect(r.meanRecallAtK[1]).toBe(0.25);
    expect(r.meanRecallAtK[2]).toBe(0.75);
    // q1 rr=1 ; q2 rr=0.5
    expect(r.mrr).toBe(0.75);
    // q1 ap=0.8333 ; q2 ap=0.5 → 0.6667
    expect(r.map).toBeCloseTo(0.6666667, 6);
    expect(r.perQuery).toHaveLength(2);
  });

  it("scores 0 (not crash) when the retrieval surface throws", async () => {
    const boom: () => string[] = () => { throw new Error("retrieval down"); };
    const r = await retrievalEvalEngine.evaluateQuerySet(queries, boom, [1]);
    expect(r.queryCount).toBe(2);
    expect(r.mrr).toBe(0);
    expect(r.map).toBe(0);
  });

  it("treats a non-array retrieval result as empty", async () => {
    const bad = (() => null) as unknown as (q: string) => string[];
    const r = await retrievalEvalEngine.evaluateQuerySet(queries, bad, [1]);
    expect(r.meanPrecisionAtK[1]).toBe(0);
  });

  it("skips malformed query entries", async () => {
    const mixed = [{ query: "q1", relevantIds: ["a"] }, { relevantIds: ["z"] }] as EvalQuerySetItem[];
    const r = await retrievalEvalEngine.evaluateQuerySet(mixed, retrieve, [1]);
    expect(r.queryCount).toBe(1);
  });

  it("rejects a non-function retrieve argument", async () => {
    await expect(
      retrievalEvalEngine.evaluateQuerySet(queries, null as unknown as () => string[], [1]),
    ).rejects.toThrow(/retrieveFn/);
  });

  it("handles an empty query set", async () => {
    const r = await retrievalEvalEngine.evaluateQuerySet([], retrieve, [1]);
    expect(r.queryCount).toBe(0);
    expect(r.mrr).toBe(0);
    expect(r.map).toBe(0);
  });
});

type EvalQuerySetItem = { query: string; relevantIds: string[] };
