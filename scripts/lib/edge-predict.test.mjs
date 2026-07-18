// scripts/lib/edge-predict.test.mjs — node:test for the U-GNN-EDGE-PREDICT pure core.
// Reference values are hand-computed (cosine → sigmoid); no toBeDefined() stubs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { l2normalize, scoreEdge, loadEmbeddings, rankEdges, dot } from "./edge-predict.mjs";

const closeTo = (actual, expected, dp = 5) =>
  assert.ok(Math.abs(actual - expected) < 0.5 * 10 ** -dp, `${actual} !~= ${expected} (${dp}dp)`);

// ── l2normalize ────────────────────────────────────────────────────────────
test("l2normalize([3,4]) → unit vector [0.6,0.8] (norm 5)", () => {
  const n = l2normalize([3, 4]);
  closeTo(n[0], 0.6);
  closeTo(n[1], 0.8);
  closeTo(Math.hypot(...n), 1.0); // unit length
});

test("l2normalize is scale-invariant — [6,8] and [3,4] normalize identically (quantization scale divides out)", () => {
  const a = l2normalize([3, 4]);
  const b = l2normalize([6, 8]);
  closeTo(a[0], b[0]);
  closeTo(a[1], b[1]);
});

test("l2normalize zero vector → all-zero (no divide-by-zero)", () => {
  assert.deepEqual(l2normalize([0, 0, 0]), [0, 0, 0]);
});

test("l2normalize NaN component → all-zero (NaN-norm guard, no NaN leak)", () => {
  assert.deepEqual(l2normalize([NaN, 1]), [0, 0]);
});

test("l2normalize empty/non-array → []", () => {
  assert.deepEqual(l2normalize([]), []);
  assert.deepEqual(l2normalize(null), []);
  assert.deepEqual(l2normalize(undefined), []);
});

test("l2normalize ±Infinity component → all-zero (non-finite-norm guard; arm-C P1 lock)", () => {
  // norm = sqrt(Inf² + …) = Inf; a bare `norm > EPS` guard would NOT fire (Inf>1e-12),
  // leaking Inf/Inf = NaN. The Number.isFinite guard must neutralize it to no-signal.
  assert.deepEqual(l2normalize([Infinity, 1]), [0, 0]);
  assert.deepEqual(l2normalize([1, -Infinity, 2]), [0, 0, 0]);
  assert.deepEqual(l2normalize([1e400, 5]), [0, 0]); // 1e400 parses to Infinity
});

// ── scoreEdge (sigmoid(cosine) for L2-normalized inputs) ─────────────────────
test("scoreEdge identical direction → cosine 1 → sigmoid(1) ≈ 0.73106", () => {
  const z = l2normalize([0.6, 0.8]);
  closeTo(scoreEdge(z, z), 0.7310586, 5);
});

test("scoreEdge orthogonal → cosine 0 → sigmoid(0) = 0.5 exactly", () => {
  assert.equal(scoreEdge(l2normalize([1, 0]), l2normalize([0, 1])), 0.5);
});

test("scoreEdge opposite → cosine -1 → sigmoid(-1) ≈ 0.26894", () => {
  closeTo(scoreEdge(l2normalize([1, 0]), l2normalize([-1, 0])), 0.2689414, 5);
});

test("scoreEdge known angle [3,4]·[4,3] → cosine EXACTLY 0.96 → score = sigmoid(0.96)", () => {
  const a = l2normalize([3, 4]);
  const b = l2normalize([4, 3]);
  // cosine = 0.6*0.8 + 0.8*0.6 = 0.96 (hand-verified). Assert the score against the
  // MATHEMATICAL reference sigmoid(0.96), not a hand-typed 7-digit literal — the prior
  // literal 0.7231157 was wrong (true ≈ 0.7231218) and only passed under a loosened
  // tolerance (reviewer arm-B P2, an R12 assertion-loosening smell).
  closeTo(dot(a, b), 0.96, 10);
  closeTo(scoreEdge(a, b), 1 / (1 + Math.exp(-0.96)), 12);
});

test("scoreEdge never emits NaN from a non-finite vector (Infinity neutralized → 0.5)", () => {
  const z = l2normalize([Infinity, 1]); // → [0,0] after the guard
  const s = scoreEdge(z, l2normalize([1, 1]));
  assert.ok(Number.isFinite(s), `score must be finite, got ${s}`);
  assert.equal(s, 0.5); // zero vec → dot 0 → sigmoid(0)
});

test("scoreEdge dim-mismatch → dot()=0 → 0.5 (graceful, not a throw)", () => {
  assert.equal(scoreEdge([1, 0], [1, 0, 0]), 0.5);
});

// ── loadEmbeddings (injected reader; skips __meta + bad lines) ────────────────
// Fixture uses node-id prefixes REPRESENTATIVE of the live corpus (reg.*/wiki.*/ghost.*),
// not eng.*/disp.* — the live embedding set has none of the latter (the redirect finding);
// the lib is target-agnostic (ids are only Map keys), so prefix choice is illustrative.
const FAKE_JSONL = [
  JSON.stringify({ __meta: true, model: "graphsage", dim: 2, count: 2 }),
  JSON.stringify({ n: "reg.alpha", q: [3, 4] }),
  JSON.stringify({ n: "wiki.calc", q: [0, 5] }),
  "{ this is not json }",
  JSON.stringify({ n: "missing.q" }), // no q field → skipped+counted
  JSON.stringify({ n: "empty.q", q: [] }), // present-but-empty q → skipped+counted (arm-B gap)
  "",
].join("\n");

test("loadEmbeddings skips __meta header + malformed + missing-q + present-empty-q, counts skips", () => {
  const { embeddings, meta, count, skipped } = loadEmbeddings("ignored", () => FAKE_JSONL);
  assert.equal(count, 2);
  assert.equal(skipped, 3); // bad-json line + missing-q record + present-but-empty-q record
  assert.ok(meta && meta.__meta === true);
  assert.ok(embeddings.has("reg.alpha"));
  assert.ok(embeddings.has("wiki.calc"));
  assert.ok(!embeddings.has("empty.q")); // empty q never stored
});

test("loadEmbeddings normalizes vectors on load → stored vector is unit-length", () => {
  const { embeddings } = loadEmbeddings("ignored", () => FAKE_JSONL);
  closeTo(Math.hypot(...embeddings.get("reg.alpha")), 1.0);
});

// ── rankEdges (score + rank + skip accounting) ───────────────────────────────
function fixtureMap() {
  // a aligned with b (cos 1), a orthogonal to c (cos 0)
  return new Map([
    ["a", l2normalize([1, 1])],
    ["b", l2normalize([2, 2])], // same direction as a
    ["c", l2normalize([1, -1])], // orthogonal to a
  ]);
}

test("rankEdges sorts by score DESC (aligned pair outranks orthogonal pair)", () => {
  const { ranked } = rankEdges(fixtureMap(), [
    ["a", "c"],
    ["a", "b"],
  ]);
  assert.equal(ranked.length, 2);
  assert.deepEqual([ranked[0].u, ranked[0].v], ["a", "b"]); // cos 1 > cos 0
  closeTo(ranked[0].score, 0.7310586, 5);
  closeTo(ranked[1].score, 0.5, 5);
  assert.ok(ranked[0].score > ranked[1].score);
});

test("rankEdges skips absent node + self-pair, counts both (no silent drop)", () => {
  const { ranked, skipped } = rankEdges(fixtureMap(), [
    ["a", "zzz"], // zzz absent
    ["a", "a"], // self-pair
    ["a", "b"], // valid
  ]);
  assert.equal(ranked.length, 1);
  assert.equal(skipped.absent, 1);
  assert.equal(skipped.selfPair, 1);
});

test("rankEdges accepts {u,v} object form as well as [u,v] tuple", () => {
  const { ranked } = rankEdges(fixtureMap(), [{ u: "a", v: "b" }]);
  assert.equal(ranked.length, 1);
  assert.deepEqual([ranked[0].u, ranked[0].v], ["a", "b"]);
});

test("rankEdges topK slices to the top N", () => {
  const { ranked } = rankEdges(
    fixtureMap(),
    [
      ["a", "c"],
      ["a", "b"],
    ],
    { topK: 1 },
  );
  assert.equal(ranked.length, 1);
  assert.deepEqual([ranked[0].u, ranked[0].v], ["a", "b"]); // highest only
});

test("rankEdges topK<=0 → empty (Math.max(0,topK) guard; arm-B coverage lock)", () => {
  const pairs = [["a", "b"], ["a", "c"]];
  assert.equal(rankEdges(fixtureMap(), pairs, { topK: 0 }).ranked.length, 0);
  assert.equal(rankEdges(fixtureMap(), pairs, { topK: -3 }).ranked.length, 0);
});

test("rankEdges empty candidates → empty ranked", () => {
  const { ranked, skipped } = rankEdges(fixtureMap(), []);
  assert.equal(ranked.length, 0);
  assert.equal(skipped.absent, 0);
  assert.equal(skipped.selfPair, 0);
});

test("rankEdges non-Map / non-array input → empty result (fail-soft, no throw)", () => {
  assert.deepEqual(rankEdges(null, [["a", "b"]]).ranked, []);
  assert.deepEqual(rankEdges(fixtureMap(), null).ranked, []);
});
