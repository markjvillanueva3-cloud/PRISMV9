/**
 * QuotingSimilarJobRetrieverEngine -- reference-value + failure + adversarial coverage.
 *
 * Reference values are hand-computed cosine/euclidean distances so the test fails if the
 * retrieval math, ranking order, or distance->similarity mapping regresses (R9 intent).
 *
 * @unit U-QP-SIMILAR-JOB-RETRIEVE (slot:india)
 */
import { describe, it, expect } from "vitest";
import {
  quotingSimilarJobRetrieverEngine as eng,
  similarityFromDistance,
  type SimilarJobCandidate,
} from "../engines/QuotingSimilarJobRetrieverEngine.js";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";
import { quotingActionEnum } from "../schemas/quotingActionSchemas.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
function makeServer(): Handler {
  let captured: Handler | null = null;
  registerQuotingDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } });
  return captured!;
}
const parse = (out: { content: Array<{ type: "text"; text: string }> }) => JSON.parse(out.content[0].text);

// cosine distance = 1 - cos. [1,0] vs: [1,0] -> 0 (identical), [0,1] -> 1 (orthogonal), [-1,0] -> 2 (opposite).
const COS_CORPUS: SimilarJobCandidate[] = [
  { jobId: "same", vector: [1, 0], record: { price: 100 } },
  { jobId: "orth", vector: [0, 1] },
  { jobId: "opp", vector: [-1, 0] },
];

describe("similarityFromDistance", () => {
  it("cosine: similarity = 1 - distance (identical->1, orthogonal->0, opposite->-1)", () => {
    expect(similarityFromDistance(0, "cosine")).toBe(1);
    expect(similarityFromDistance(1, "cosine")).toBe(0);
    expect(similarityFromDistance(2, "cosine")).toBe(-1);
  });
  it("euclidean/manhattan: monotone proxy 1/(1+distance) in (0,1]", () => {
    expect(similarityFromDistance(0, "euclidean")).toBe(1);
    expect(similarityFromDistance(5, "euclidean")).toBeCloseTo(1 / 6, 10);
    expect(similarityFromDistance(1, "manhattan")).toBe(0.5);
  });
});

describe("retrieveSimilarJobs -- happy path (reference values)", () => {
  it("ranks by cosine distance nearest-first with exact distances/similarities", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 3, metric: "cosine" });
    expect(r.neighbors.map((n) => n.jobId)).toEqual(["same", "orth", "opp"]);
    expect(r.neighbors.map((n) => n.rank)).toEqual([1, 2, 3]);
    expect(r.neighbors[0].distance).toBeCloseTo(0, 10);
    expect(r.neighbors[1].distance).toBeCloseTo(1, 10);
    expect(r.neighbors[2].distance).toBeCloseTo(2, 10);
    expect(r.neighbors[0].similarity).toBeCloseTo(1, 10);
    expect(r.neighbors[1].similarity).toBeCloseTo(0, 10);
    expect(r.neighbors[2].similarity).toBeCloseTo(-1, 10);
    expect(r.corpusSize).toBe(3);
    expect(r.dim).toBe(2);
    expect(r.metric).toBe("cosine");
  });

  it("k limits the returned neighbors to the nearest k", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 1 });
    expect(r.neighbors).toHaveLength(1);
    expect(r.neighbors[0].jobId).toBe("same");
    expect(r.k).toBe(1);
  });

  it("echoes the candidate record back on a hit (and omits it when absent)", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 2 });
    expect(r.neighbors[0].record).toEqual({ price: 100 }); // "same" carried a record
    expect("record" in r.neighbors[1]).toBe(false); // "orth" carried none
  });

  it("euclidean metric: distance + 1/(1+d) similarity (reference values)", () => {
    const corpus: SimilarJobCandidate[] = [
      { jobId: "far", vector: [3, 4] }, // dist sqrt(9+16)=5
      { jobId: "near", vector: [1, 0] }, // dist 1
    ];
    const r = eng.retrieveSimilarJobs({ query: [0, 0], corpus, k: 2, metric: "euclidean" });
    expect(r.neighbors.map((n) => n.jobId)).toEqual(["near", "far"]);
    expect(r.neighbors[0].distance).toBeCloseTo(1, 10);
    expect(r.neighbors[1].distance).toBeCloseTo(5, 10);
    expect(r.neighbors[0].similarity).toBeCloseTo(0.5, 10);
    expect(r.neighbors[1].similarity).toBeCloseTo(1 / 6, 10);
  });

  it("deterministic tie-break: equal-distance candidates keep corpus order (lower index first)", () => {
    const corpus: SimilarJobCandidate[] = [
      { jobId: "a", vector: [1, 0] },
      { jobId: "b", vector: [1, 0] }, // identical to a -> same distance
    ];
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus, k: 2 });
    expect(r.neighbors.map((n) => n.jobId)).toEqual(["a", "b"]);
  });
});

describe("retrieveSimilarJobs -- failure modes (>=3)", () => {
  it("throws on a non-array / empty query", () => {
    expect(() => eng.retrieveSimilarJobs({ query: [], corpus: COS_CORPUS })).toThrow(/non-empty number\[\]/);
    // @ts-expect-error -- intentionally wrong type
    expect(() => eng.retrieveSimilarJobs({ query: "x", corpus: COS_CORPUS })).toThrow(/non-empty number\[\]/);
  });

  it("throws on a non-array corpus", () => {
    // @ts-expect-error -- intentionally wrong type
    expect(() => eng.retrieveSimilarJobs({ query: [1, 0], corpus: { jobId: "x" } })).toThrow(/corpus must be an array/);
  });

  it("throws on a candidate missing a string jobId", () => {
    const bad = [{ jobId: "", vector: [1, 0] }] as SimilarJobCandidate[];
    expect(() => eng.retrieveSimilarJobs({ query: [1, 0], corpus: bad })).toThrow(/non-empty string jobId/);
  });

  it("throws on a per-candidate dimensionality mismatch", () => {
    const bad: SimilarJobCandidate[] = [{ jobId: "x", vector: [1, 0, 0] }]; // dim 3 vs query dim 2
    expect(() => eng.retrieveSimilarJobs({ query: [1, 0], corpus: bad })).toThrow(/vector dim 3 != query dim 2/);
  });
});

describe("retrieveSimilarJobs -- adversarial + edge cases (>=2)", () => {
  it("non-finite vector value (NaN/Infinity) is rejected (delegated to KNearestNeighbors.validate)", () => {
    expect(() => eng.retrieveSimilarJobs({ query: [1, 0], corpus: [{ jobId: "n", vector: [NaN, 0] }] })).toThrow(/finite/);
    expect(() => eng.retrieveSimilarJobs({ query: [Infinity, 0], corpus: COS_CORPUS })).toThrow(/finite/);
  });

  it("empty corpus returns graceful empty neighbors + a cold-start warning (never throws)", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: [] });
    expect(r.neighbors).toEqual([]);
    expect(r.k).toBe(0);
    expect(r.corpusSize).toBe(0);
    expect(r.warnings.join(" ")).toMatch(/cold start/);
  });

  it("k > corpus size clamps to corpus size (and surfaces a warning)", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 999 });
    expect(r.neighbors).toHaveLength(3);
    expect(r.k).toBe(3);
    expect(r.warnings.some((w) => /clamp/i.test(w))).toBe(true);
  });

  it("k < 1 (or non-integer) falls back to a valid k (clamped to >=1)", () => {
    const r0 = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 0 });
    expect(r0.neighbors.length).toBeGreaterThanOrEqual(1);
    const rFloat = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 2.7 });
    expect(rFloat.neighbors.length).toBeGreaterThanOrEqual(1); // non-integer -> DEFAULT_K path
  });

  it("a zero-norm vector under cosine is handled (max-dissimilar, warning), not a crash", () => {
    const r = eng.retrieveSimilarJobs({ query: [1, 0], corpus: [{ jobId: "zero", vector: [0, 0] }], metric: "cosine" });
    expect(r.neighbors).toHaveLength(1);
    expect(r.neighbors[0].distance).toBeCloseTo(1, 10); // cosine zero-norm -> distance 1
    expect(r.warnings.some((w) => /zero-norm/i.test(w))).toBe(true);
  });
});

describe("prism_quoting:quoting_similar_job_retrieve -- dispatcher round-trip (R15)", () => {
  it("the action is registered in the PRODUCTION enum (not just the handler map)", () => {
    expect(quotingActionEnum.options).toContain("quoting_similar_job_retrieve");
  });

  it("round-trips through the dispatcher and returns the SAME neighbors as the engine singleton", async () => {
    const handler = makeServer();
    const out = await handler({ action: "quoting_similar_job_retrieve", params: { query: [1, 0], corpus: COS_CORPUS, k: 3, metric: "cosine" } });
    expect(out.isError).not.toBe(true);
    const data = parse(out);
    const direct = eng.retrieveSimilarJobs({ query: [1, 0], corpus: COS_CORPUS, k: 3, metric: "cosine" });
    expect(data.neighbors.map((n: { jobId: string }) => n.jobId)).toEqual(direct.neighbors.map((n) => n.jobId));
    expect(data.neighbors[0].similarity).toBeCloseTo(1, 10);
    expect(data.corpusSize).toBe(3);
  });

  it("the Zod schema rejects malformed params (missing query) BEFORE reaching the engine", async () => {
    const handler = makeServer();
    const out = await handler({ action: "quoting_similar_job_retrieve", params: { corpus: COS_CORPUS } });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toMatch(/schema-validation-failed/);
  });
});
