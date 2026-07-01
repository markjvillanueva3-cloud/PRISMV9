// Tests for memory-recall-eval.mjs (BRAIN-UPGRADE rank 3 — recall-quality harness).
// Pure scorers tested directly; runEval driven with an injected searchFn (the A/B oracle).

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { rankOf, scoreQuery, aggregate, compareModes, buildQuery, sampleStride, runEval } from "./memory-recall-eval.mjs";

const EXP = { fileName: "a.md", namespace: "reference" };
const hit = (fn, ns) => ({ fileName: fn, namespace: ns, name: fn.replace(".md", ""), score: 1 });

describe("rankOf", () => {
  it("finds expected at its 1-based rank (namespace+fileName match)", () => {
    assert.equal(rankOf([hit("x.md", "p"), hit("a.md", "reference"), hit("y.md", "f")], EXP), 2);
  });
  it("rank 1", () => assert.equal(rankOf([hit("a.md", "reference")], EXP), 1));
  it("absent → 0", () => assert.equal(rankOf([hit("x.md", "p")], EXP), 0));
  it("fileName match wins even if hit has no namespace (tolerant)", () => {
    assert.equal(rankOf([{ fileName: "a.md" }], EXP), 1);
  });
  it("same fileName but DIFFERENT namespace → not a match", () => {
    assert.equal(rankOf([hit("a.md", "feedback")], EXP), 0);
  });
  it("non-array / empty → 0", () => {
    assert.equal(rankOf(null, EXP), 0);
    assert.equal(rankOf([], EXP), 0);
  });
});

describe("scoreQuery", () => {
  it("rank 1 → hit, p1, rr=1, ndcg=1", () => {
    const s = scoreQuery([hit("a.md", "reference")], EXP, 10);
    assert.deepEqual(s, { rank: 1, hit: true, p1: true, rr: 1, ndcg: 1 });
  });
  it("rank 2 within k → hit, not p1, rr=0.5, ndcg=1/log2(3)", () => {
    const s = scoreQuery([hit("x.md", "p"), hit("a.md", "reference")], EXP, 10);
    assert.equal(s.hit, true);
    assert.equal(s.p1, false);
    assert.equal(s.rr, 0.5);
    assert.ok(Math.abs(s.ndcg - 1 / Math.log2(3)) < 1e-9);
  });
  it("rank beyond k → NOT a recall hit, but rr still 1/rank (MRR sees it)", () => {
    const hits = [...Array(4)].map((_, i) => hit(`f${i}.md`, "x")).concat(hit("a.md", "reference")); // rank 5
    const s = scoreQuery(hits, EXP, 3);
    assert.equal(s.rank, 5);
    assert.equal(s.hit, false, "rank 5 > k=3");
    assert.equal(s.ndcg, 0, "outside k contributes 0 nDCG");
    assert.equal(s.rr, 1 / 5);
  });
  it("absent → all zero", () => {
    assert.deepEqual(scoreQuery([hit("x.md", "p")], EXP, 10), { rank: 0, hit: false, p1: false, rr: 0, ndcg: 0 });
  });
});

describe("aggregate", () => {
  it("averages the per-query bundle", () => {
    const a = aggregate([
      { hit: true, p1: true, rr: 1, ndcg: 1 },
      { hit: true, p1: false, rr: 0.5, ndcg: 0.63 },
      { hit: false, p1: false, rr: 0, ndcg: 0 },
    ]);
    assert.equal(a.n, 3);
    assert.ok(Math.abs(a.recallAtK - 2 / 3) < 1e-9);
    assert.ok(Math.abs(a.p1 - 1 / 3) < 1e-9);
    assert.ok(Math.abs(a.mrr - 0.5) < 1e-9);
  });
  it("empty → all zero, n=0 (no NaN)", () => {
    assert.deepEqual(aggregate([]), { n: 0, recallAtK: 0, p1: 0, mrr: 0, ndcg: 0 });
  });
});

describe("compareModes", () => {
  it("positive delta when hybrid better", () => {
    const d = compareModes({ recallAtK: 0.5, p1: 0.2, mrr: 0.3, ndcg: 0.4 }, { recallAtK: 0.8, p1: 0.5, mrr: 0.7, ndcg: 0.75 });
    assert.equal(d.mrr, 0.4);
    assert.equal(d.p1, 0.3);
  });
  it("negative delta when hybrid worse (must surface a regression, not hide it)", () => {
    assert.equal(compareModes({ recallAtK: 0.9, p1: 0, mrr: 0, ndcg: 0 }, { recallAtK: 0.6, p1: 0, mrr: 0, ndcg: 0 }).recallAtK, -0.3);
  });
});

describe("buildQuery (self-anchor, name-token stripped)", () => {
  it("strips tokens equal to the memory's own slug name (avoid trivial exact-name match)", () => {
    const q = buildQuery("cutting force kienzle coefficient lookup", "cutting-force");
    assert.ok(!q.split(" ").includes("cutting"), "own-name token 'cutting' dropped");
    assert.ok(q.includes("kienzle"));
  });
  it("returns '' when description is empty/blank", () => {
    assert.equal(buildQuery("", "x"), "");
    assert.equal(buildQuery("   ", "x"), "");
  });
  it("returns '' when too few meaningful tokens remain (weak query)", () => {
    assert.equal(buildQuery("the and of", "x"), "", "all stopwords → weak");
    assert.equal(buildQuery("alpha beta", "alpha-beta"), "", "<3 non-name tokens → weak");
  });
});

describe("sampleStride (deterministic, no RNG)", () => {
  it("returns all when corpus <= n", () => {
    assert.deepEqual(sampleStride([1, 2, 3], 5), [1, 2, 3]);
  });
  it("returns exactly n, spread across the corpus", () => {
    const s = sampleStride([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
    assert.equal(s.length, 5);
    assert.deepEqual(s, [0, 2, 4, 6, 8], "even stride");
  });
  it("is deterministic (same input → same sample)", () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    assert.deepEqual(sampleStride(items, 7), sampleStride(items, 7));
  });
  it("empty / n<=0 → []", () => {
    assert.deepEqual(sampleStride([], 5), []);
    assert.deepEqual(sampleStride([1, 2], 0), []);
  });
});

describe("runEval (A/B oracle — both modes per query, delta, hybrid-engagement)", () => {
  const CORPUS = [
    { fileName: "a.md", namespace: "reference", name: "a", description: "cutting force kienzle coefficient lookup table" },
    { fileName: "b.md", namespace: "feedback", name: "b", description: "token budget discipline checkpoint between iterations" },
    { fileName: "c.md", namespace: "project", name: "c", description: "galaxy synthesis refresh incremental content hash" },
    { fileName: "weak.md", namespace: "inbox", name: "weak", description: "the and of" }, // → skipped-weak
  ];
  const TARGET_BY_TOKEN = { kienzle: ["a.md", "reference"], budget: ["b.md", "feedback"], synthesis: ["c.md", "project"] };
  const filler = (n, tag) => Array.from({ length: n }, (_, i) => hit(`f${tag}${i}.md`, "x"));
  // Hybrid ranks the target #1; BM25 ranks it #4. So hybrid strictly dominates on MRR/p@1.
  function fakeSearch(query, { hybrid }) {
    let target = null;
    for (const [tok, fn] of Object.entries(TARGET_BY_TOKEN)) if (query.includes(tok)) target = fn;
    if (!target) return { hits: filler(5, "miss"), source: hybrid ? "hybrid" : "sidecar" };
    const th = hit(target[0], target[1]);
    return hybrid
      ? { hits: [th, ...filler(5, "h")], source: "hybrid" } // rank 1
      : { hits: [...filler(3, "b"), th, ...filler(2, "b2")], source: "sidecar" }; // rank 4
  }

  it("scores both modes, counts skipped-weak, computes the hybrid lift + engagement", () => {
    const r = runEval({ corpus: CORPUS, sampleN: 10, topK: 10, searchFn: fakeSearch });
    assert.equal(r.corpusSize, 4);
    assert.equal(r.scored, 3, "3 scored, weak.md skipped");
    assert.equal(r.skippedWeak, 1);
    // BM25 target at rank 4 → p@1=0, MRR=0.25; Hybrid rank 1 → p@1=1, MRR=1.
    assert.equal(r.bm25.p1, 0);
    assert.equal(r.hybrid.p1, 1);
    assert.ok(Math.abs(r.bm25.mrr - 0.25) < 1e-9);
    assert.ok(Math.abs(r.hybrid.mrr - 1) < 1e-9);
    assert.equal(r.delta.mrr, 0.75, "hybrid lift surfaced");
    assert.equal(r.bm25.recallAtK, 1, "both within k=10");
    assert.equal(r.hybrid.recallAtK, 1);
    assert.equal(r.hybridEngagedRate, 1, "all hybrid-sourced");
    assert.equal(r.sources.hybrid, 3);
    assert.deepEqual(r.scoredByNamespace, { reference: 1, feedback: 1, project: 1 }, "per-namespace histogram of the scored set (weak.md/inbox skipped)");
  });

  it("hybrid falling back to BM25 (source=sidecar) shows engagement < 1 (surfaces silent BM25-only)", () => {
    const r = runEval({ corpus: CORPUS, sampleN: 10, topK: 10, searchFn: (q, o) => ({ ...fakeSearch(q, o), source: "sidecar" }) });
    assert.equal(r.hybridEngagedRate, 0, "no query actually used the dense path");
  });
});
