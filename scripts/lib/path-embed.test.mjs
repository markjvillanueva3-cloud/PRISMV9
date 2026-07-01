// scripts/lib/path-embed.test.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-ACCEL-KNN (alpha, 2026-05-31).
// Hermetic: embedText's network call is injected via opts.runImpl; pickBestPath's embedder via opts.embed.
// (The LIVE nomic-embed check runs as a separate bash E2E, not here, so this suite stays deterministic.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { embedText, cosine, pickBestPath, DEFAULT_REPLAY_THRESHOLD } from "./path-embed.mjs";

const okRun = (vec) => () => JSON.stringify({ embedding: vec });

test("embedText parses {embedding:[...]} (nomic /api/embeddings shape)", () => {
  const v = embedText("hello", { runImpl: okRun([0.1, 0.2, 0.3]) });
  assert.deepEqual(v, [0.1, 0.2, 0.3]);
});

test("embedText parses {embeddings:[[...]]} (/api/embed shape)", () => {
  const v = embedText("hello", { runImpl: () => JSON.stringify({ embeddings: [[1, 2, 3]] }) });
  assert.deepEqual(v, [1, 2, 3]);
});

test("embedText FAIL-SOFT → null on throw / bad-json / empty / non-finite", () => {
  assert.equal(embedText("x", { runImpl: () => { throw new Error("curl boom"); } }), null);
  assert.equal(embedText("x", { runImpl: () => "not json" }), null);
  assert.equal(embedText("x", { runImpl: () => JSON.stringify({ embedding: [] }) }), null);
  assert.equal(embedText("x", { runImpl: () => JSON.stringify({ embedding: [1, "NaNish", 3] }) }), null);
  assert.equal(embedText("x", { runImpl: () => JSON.stringify({ embedding: [1, Infinity] }) }), null);
  assert.equal(embedText("x", { runImpl: () => JSON.stringify({ nothing: true }) }), null);
});

test("embedText guards: empty/non-string → null; disabled knob → null", () => {
  assert.equal(embedText(""), null);
  assert.equal(embedText("   "), null);
  assert.equal(embedText(null), null);
  assert.equal(embedText(42), null);
  process.env.PRISM_PATH_EMBED_DISABLE = "1";
  try { assert.equal(embedText("hello", { runImpl: okRun([1, 2]) }), null, "disabled even with a good runImpl"); }
  finally { delete process.env.PRISM_PATH_EMBED_DISABLE; }
});

test("cosine: identical=1, orthogonal=0, length-mismatch=0, zero-vector=0", () => {
  assert.equal(cosine([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([1, 2], [1, 2, 3]), 0);
  assert.equal(cosine([0, 0], [1, 1]), 0);
  assert.ok(Math.abs(cosine([1, 1], [2, 2]) - 1) < 1e-9, "parallel vectors → 1");
});

// toy 3-d embedder keyed on goal keywords (deterministic, no network)
const toyEmbed = (t) => {
  const s = String(t).toLowerCase();
  return [/round|hole|bore/.test(s) ? 1 : 0, /square|pocket|slot/.test(s) ? 1 : 0, /thread|tap/.test(s) ? 1 : 0];
};

test("pickBestPath ranks by cosine + REPLAYS when top ≥ threshold", () => {
  const cands = [
    { goal: "drill a round hole", score: 0.5 },
    { goal: "mill a square pocket", score: 0.9 },
    { goal: "tap a thread", score: 0.2 },
  ];
  const r = pickBestPath("bore a round hole to depth", cands, { embed: toyEmbed, threshold: 0.8 });
  assert.equal(r.ranked[0].goal, "drill a round hole", "nearest-by-meaning first");
  assert.equal(r.replay, true, "top similarity (round/hole match=1.0) ≥ 0.8 → replay");
  assert.equal(r.topSimilarity, 1);
  assert.equal(r.reason, "match-above-threshold");
});

test("pickBestPath does NOT replay when top < threshold", () => {
  const cands = [{ goal: "mill a square pocket", score: 0.9 }];
  const r = pickBestPath("drill a round hole", cands, { embed: toyEmbed, threshold: 0.8 });
  // query=[1,0,0] vs candidate=[0,1,0] → cosine 0
  assert.equal(r.replay, false);
  assert.equal(r.topSimilarity, 0);
  assert.equal(r.reason, "below-threshold");
});

test("pickBestPath no candidates → replay:false, reason no-candidates", () => {
  const r = pickBestPath("anything", [], { embed: toyEmbed });
  assert.equal(r.replay, false);
  assert.equal(r.reason, "no-candidates");
  assert.deepEqual(r.ranked, []);
});

test("pickBestPath FAIL-SOFT: query un-embeddable (Ollama down) → no replay, score-order, reason no-query-embedding", () => {
  const deadEmbed = () => null; // simulates Ollama down
  const cands = [{ goal: "a", score: 0.3 }, { goal: "b", score: 0.9 }];
  const r = pickBestPath("q", cands, { embed: deadEmbed });
  assert.equal(r.replay, false, "never replay-on-blind when the embedder is down");
  assert.equal(r.reason, "no-query-embedding");
  assert.equal(r.ranked[0].score, 0.9, "degrades to score order");
});

test("pickBestPath: a CANDIDATE that fails to embed gets similarity 0 (no crash), ranks last", () => {
  // query + "good" embed; "bad" candidate goal returns null (per-candidate embed failure)
  const embed = (t) => (t === "bad" ? null : [1, 0]);
  const cands = [{ goal: "bad", score: 0.9 }, { goal: "good", score: 0.1 }];
  const r = pickBestPath("q", cands, { embed, threshold: 0.5 });
  assert.equal(r.ranked[0].goal, "good", "embeddable match ranks above the un-embeddable candidate");
  assert.equal(r.ranked.find((x) => x.goal === "bad").similarity, 0, "un-embeddable candidate → sim 0");
  assert.equal(r.replay, true, "the good candidate (sim 1.0) ≥ 0.5 threshold");
});

test("DEFAULT_REPLAY_THRESHOLD is a sane cosine gate", () => {
  assert.ok(DEFAULT_REPLAY_THRESHOLD > 0.5 && DEFAULT_REPLAY_THRESHOLD < 1);
});
