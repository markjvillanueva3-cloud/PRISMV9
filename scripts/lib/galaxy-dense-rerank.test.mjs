/**
 * Tests for galaxy-dense-rerank.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-DENSE).
 * Reference-value tests for the PURE fusion math (cosine + dense rank + RRF fusion) with
 * INJECTED embeddings + an injected embedFn -- no live Ollama needed. Run:
 *   node --test scripts/lib/galaxy-dense-rerank.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkId,
  cosineSim,
  denseRankChunks,
  fuseSparseDense,
  hybridRetrieve,
  buildCandidatePool,
} from "./galaxy-dense-rerank.mjs";

// --- cosineSim ---
test("cosineSim: identical vectors -> 1, orthogonal -> 0, opposite -> -1", () => {
  assert.equal(cosineSim([1, 0], [1, 0]), 1);
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 0], [-1, 0]), -1);
});

test("cosineSim: ADVERSARIAL mismatched/empty/zero -> 0 (no NaN/throw)", () => {
  assert.equal(cosineSim([1, 2, 3], [1, 2]), 0); // length mismatch
  assert.equal(cosineSim([], []), 0);
  assert.equal(cosineSim([0, 0], [1, 1]), 0); // zero vector
  assert.equal(cosineSim(null, [1]), 0);
});

// --- denseRankChunks ---
test("denseRankChunks: ranks by cosine to the query vector (closest first)", () => {
  const chunks = [
    { id: "a", text: "force", heading: "A" },
    { id: "b", text: "vise", heading: "B" },
    { id: "c", text: "coolant", heading: "C" },
  ];
  const qVec = [1, 0]; // "about force"
  const vecs = [
    [0.9, 0.1], // a: close to query
    [0.1, 0.9], // b: far
    [0.5, 0.5], // c: middle
  ];
  const ranked = denseRankChunks(chunks, qVec, vecs);
  assert.equal(ranked[0].id, "a");
  assert.equal(ranked[2].id, "b");
  assert.ok(ranked[0].score > ranked[1].score && ranked[1].score > ranked[2].score);
});

test("denseRankChunks: ADVERSARIAL misaligned vecs / empty query -> [] (no throw)", () => {
  assert.deepEqual(denseRankChunks([{ id: "a", text: "x" }], [1, 0], [[1, 0], [0, 1]]), []); // len mismatch
  assert.deepEqual(denseRankChunks([{ id: "a", text: "x" }], [], [[1]]), []);
  assert.deepEqual(denseRankChunks([], [1], [[1]]), []);
});

// --- fuseSparseDense (RRF) ---
test("fuseSparseDense: a doc ranked high by BOTH arms wins (RRF blends both rankings)", () => {
  // sparse order: x, y, z ; dense order: y, x, z -> y and x both near top in both -> top 2
  const sparse = [{ id: "x" }, { id: "y" }, { id: "z" }];
  const dense = [{ id: "y" }, { id: "x" }, { id: "z" }];
  // attach minimal chunk fields for output mapping
  const withFields = (a) => a.map((c) => ({ ...c, source: "s", heading: c.id, text: c.id }));
  const fused = fuseSparseDense(withFields(sparse), withFields(dense), { topK: 3 });
  assert.equal(fused.length, 3);
  // y is rank1(dense)+rank2(sparse), x is rank2(dense)+rank1(sparse) -> tie, both above z
  assert.ok(["x", "y"].includes(fused[0].id));
  assert.ok(["x", "y"].includes(fused[1].id));
  assert.equal(fused[2].id, "z"); // z is last in both -> fused last
  assert.ok(fused[0].surfaces.sparse && fused[0].surfaces.dense); // provenance from both arms
});

test("fuseSparseDense: a dense-ONLY doc still surfaces (union, not intersection)", () => {
  const sparse = [{ id: "a", source: "s", heading: "a", text: "a" }];
  const dense = [{ id: "b", source: "s", heading: "b", text: "b" }, { id: "a", source: "s", heading: "a", text: "a" }];
  const fused = fuseSparseDense(sparse, dense, { topK: 5 });
  const ids = fused.map((f) => f.id).sort();
  assert.deepEqual(ids, ["a", "b"]); // b (dense-only) is included
});

test("fuseSparseDense: respects topK", () => {
  const mk = (ids) => ids.map((id) => ({ id, source: "s", heading: id, text: id }));
  const fused = fuseSparseDense(mk(["a", "b", "c", "d"]), mk(["d", "c", "b", "a"]), { topK: 2 });
  assert.equal(fused.length, 2);
});

// --- chunkId ---
test("chunkId: deterministic + content-sensitive", () => {
  const c = { source: "mill/CLAUDE.md", heading: "Speed", text: "force" };
  assert.equal(chunkId(c, 0), chunkId(c, 0)); // deterministic
  assert.notEqual(chunkId(c, 0), chunkId({ ...c, text: "vise" }, 0)); // content-sensitive
  assert.notEqual(chunkId(c, 0), chunkId(c, 1)); // index-sensitive
});

// --- hybridRetrieve with an INJECTED embedFn (no live Ollama) ---
test("hybridRetrieve: the DENSE arm CHANGES the ranking (NON-VACUOUS: sparse-alone gives the opposite)", async () => {
  // sparse order [Coolant, Vise, Force] -> Force is sparse-LAST. dense (cosine to 'force')
  // ranks Force FIRST. If the dense arm were a no-op/broken, RRF would keep Vise ABOVE Force
  // (the sparse order). A working dense arm lifts Force ABOVE Vise -> proves dense influences
  // the rank (this assertion FAILS if the dense feature is broken -- reviewer-B P1 fix).
  const chunks = [
    { source: "s", heading: "Coolant", text: "coolant flood pressure" },
    { source: "s", heading: "Vise", text: "vise jaw clamp" },
    { source: "s", heading: "Force", text: "cutting force kienzle" },
  ];
  const vmap = new Map([
    ["force", [1, 0]],
    ["cutting force kienzle", [0.95, 0.05]], // Force: closest to query
    ["coolant flood pressure", [0.5, 0.5]],
    ["vise jaw clamp", [0.1, 0.9]], // Vise: farthest
  ]);
  const embedFn = async (t) => vmap.get(t) || [0, 0];
  const sparseRanked = chunks.slice(); // Force is LAST in the sparse ranking
  const fused = await hybridRetrieve(chunks, "force", { embedFn, sparseRanked, topK: 3, candidateM: 12 });
  const idx = (h) => fused.findIndex((f) => f.heading === h);
  // sparse alone -> idx(Force)=2 > idx(Vise)=1; the working dense arm REVERSES this:
  assert.ok(
    idx("Force") !== -1 && idx("Force") < idx("Vise"),
    `dense arm must lift Force above Vise; got ${JSON.stringify(fused.map((f) => f.heading))}`
  );
});

test("hybridRetrieve: FAIL-SOFT -- embedFn returns null -> null (caller keeps sparse)", async () => {
  const chunks = [{ source: "s", heading: "A", text: "x" }];
  const fused = await hybridRetrieve(chunks, "q", { embedFn: async () => null });
  assert.equal(fused, null);
});

test("hybridRetrieve: FAIL-SOFT -- a PARTIAL embed (query ok, one chunk null) -> null (no partial fusion)", async () => {
  const chunks = [{ source: "s", heading: "A", text: "alpha" }, { source: "s", heading: "B", text: "beta" }];
  // query embeds fine, but the 'alpha' chunk embed fails -> the whole arm must bail to sparse.
  const embedFn = async (t) => (t === "q" ? [1, 0] : t === "alpha" ? null : [0, 1]);
  const fused = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks });
  assert.equal(fused, null);
});

// --- OPT-IN graceful partial-dense (PRISM_GALAXY_RAG_PARTIAL_DENSE / opts.partialDense) ---
// Motivation: under concurrent VRAM load a cold nomic-embed-text starves -> ONE slow embed
// dropped the WHOLE dense arm to sparse fleet-wide. Opt-in reranks the survivors instead.
test("hybridRetrieve: OPT-IN partialDense -- 1 of 3 embeds fails, >=2 survive -> reranks survivors + retains the miss via sparse (NOT null)", async () => {
  const chunks = [
    { source: "s", heading: "A", text: "alpha" }, // embed FAILS
    { source: "s", heading: "B", text: "beta" },  // embeds, strong dense match to query
    { source: "s", heading: "C", text: "gamma" }, // embeds, weak dense match
  ];
  const embedFn = async (t) =>
    t === "q" ? [1, 0] : t === "alpha" ? null : t === "beta" ? [0.95, 0.05] : [0, 1];
  // default (gate OFF) still bails to sparse on the partial embed -- regression-lock:
  assert.equal(await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks }), null);
  // gate ON: survivors B+C reranked, and the un-embedded A still surfaces via its sparse weight:
  const fused = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks, partialDense: true, topK: 3 });
  assert.ok(Array.isArray(fused) && fused.length >= 2, `expected partial-dense fusion, got ${JSON.stringify(fused)}`);
  const headings = fused.map((f) => f.heading);
  assert.ok(headings.includes("B"), "embedded survivor B must be present");
  assert.ok(headings.includes("A"), "un-embedded A must still surface via sparse (graceful, not dropped)");
});

test("hybridRetrieve: OPT-IN partialDense -- only 1 embed survives (<2) -> null (too few to rerank)", async () => {
  const chunks = [
    { source: "s", heading: "A", text: "alpha" }, // FAILS
    { source: "s", heading: "B", text: "beta" },  // FAILS
    { source: "s", heading: "C", text: "gamma" }, // survives -> only 1
  ];
  const embedFn = async (t) => (t === "q" ? [1, 0] : t === "gamma" ? [0, 1] : null);
  const fused = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks, partialDense: true });
  assert.equal(fused, null);
});

test("hybridRetrieve: OPT-IN partialDense is a NO-OP when all embeds succeed (byte-identical to gate-off)", async () => {
  const chunks = [
    { source: "s", heading: "A", text: "alpha" },
    { source: "s", heading: "B", text: "beta" },
    { source: "s", heading: "C", text: "gamma" },
  ];
  const embedFn = async (t) =>
    t === "q" ? [1, 0] : t === "alpha" ? [0.9, 0.1] : t === "beta" ? [0.3, 0.7] : [0, 1];
  const off = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks, topK: 3 });
  const on = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked: chunks, topK: 3, partialDense: true });
  assert.deepEqual(on, off, "partialDense must not alter the all-embeds-succeed path");
});

test("hybridRetrieve: ADVERSARIAL empty chunks / empty query -> null", async () => {
  assert.equal(await hybridRetrieve([], "q", { embedFn: async () => [1] }), null);
  assert.equal(await hybridRetrieve([{ source: "s", heading: "A", text: "x" }], "", { embedFn: async () => [1] }), null);
});

// --- buildCandidatePool: dense candidate backfill (the lexical-disjoint rescue) ---
// GAP: the bridge built the dense candidate pool from `scoreChunks().filter(score>0)` ONLY, so a
// chunk the lexical arm scored to ZERO was never embedded -- the dense arm could not surface a
// lexical miss, defeating the sparse+dense hybrid. On real paraphrase queries the lexical-hit set
// was 22-31% of the corpus, leaving 69-78% dense-invisible. buildCandidatePool backfills the
// sparse head with lexical-miss chunks up to candidateM so the dense arm covers the corpus.
test("buildCandidatePool: backfills the sparse head with lexical-miss chunks (the rescue)", () => {
  const sparse = [{ source: "s", heading: "Hit", text: "lexical hit" }];
  const full = [
    { source: "s", heading: "Hit", text: "lexical hit" },        // already in sparse head
    { source: "s", heading: "Miss1", text: "semantic only one" }, // sparse-zero -> backfilled
    { source: "s", heading: "Miss2", text: "semantic only two" }, // sparse-zero -> backfilled
  ];
  const pool = buildCandidatePool(sparse, full, 12);
  const heads = pool.map((c) => c.heading);
  assert.deepEqual(heads, ["Hit", "Miss1", "Miss2"]); // sparse head first, then doc-order backfill
  assert.equal(new Set(heads).size, heads.length); // no duplicate (Hit not added twice)
});

test("buildCandidatePool: byte-identical to sparse-only when the sparse head already fills candidateM", () => {
  const sparse = [
    { source: "s", heading: "A", text: "a" },
    { source: "s", heading: "B", text: "b" },
    { source: "s", heading: "C", text: "c" },
  ];
  const full = [...sparse, { source: "s", heading: "D", text: "d" }];
  const pool = buildCandidatePool(sparse, full, 2); // cap below sparse-head size
  assert.deepEqual(pool, sparse.slice(0, 2)); // backfill adds nothing -> old behavior preserved
});

test("buildCandidatePool: caps total at candidateM even with a large backfill (embed budget held)", () => {
  const sparse = [{ source: "s", heading: "Hit", text: "hit" }];
  const full = Array.from({ length: 50 }, (_, i) => ({ source: "s", heading: `M${i}`, text: `miss ${i}` }));
  const pool = buildCandidatePool(sparse, full, 12);
  assert.equal(pool.length, 12); // 1 sparse + 11 backfill = exactly the budget, never more
  assert.equal(pool[0].heading, "Hit");
});

test("buildCandidatePool: ADVERSARIAL empty sparse / non-array / junk chunks -> safe", () => {
  // empty sparse: pool is pure doc-order backfill up to cap.
  const full = [{ source: "s", heading: "X", text: "x" }, { text: "" }, null, { source: "s", heading: "Y", text: "y" }];
  const pool = buildCandidatePool([], full, 12);
  assert.deepEqual(pool.map((c) => c.heading), ["X", "Y"]); // junk (empty-text / null) skipped
  // non-array inputs do not throw.
  assert.deepEqual(buildCandidatePool(null, null, 12), []);
});

test("hybridRetrieve: END-TO-END a lexical-DISJOINT but dense-relevant chunk is now RESCUED (the fix)", async () => {
  // 'Deflection' shares ZERO query tokens -> sparse score 0 -> the OLD sparse-only pool excluded it.
  // 'Pricing' is a lexical red herring (matches "cost"); the dense arm knows the query is about a
  // broken cutter, not money. The fix backfills Deflection into the pool so dense can surface it.
  const chunks = [
    { source: "s", heading: "Coolant", text: "coolant flood lubrication chip evacuation" },
    { source: "s", heading: "Pricing", text: "quote cost margin overhead per part" },
    { source: "s", heading: "Deflection", text: "endmill stiffness chatter fracture rigidity" },
  ];
  const q = "cost of a snapped cutter";
  // sparse-rank list = exactly the lexical hit (Pricing), as scoreChunks().filter(score>0) yields.
  const sparseRanked = [chunks[1]];
  const vmap = new Map([
    [q, [1, 0, 0]],
    ["endmill stiffness chatter fracture rigidity", [0.96, 0.05, 0.05]], // dense-closest (real answer)
    ["quote cost margin overhead per part", [0.2, 0.9, 0.1]],            // lexical hit, dense-far
    ["coolant flood lubrication chip evacuation", [0.1, 0.1, 0.9]],
  ]);
  const embedFn = async (t) => vmap.get(t) || [0, 0, 0];

  const fixed = await hybridRetrieve(chunks, q, { embedFn, sparseRanked, topK: 3, candidateM: 12 });
  assert.ok(
    fixed && fixed.some((c) => c.heading === "Deflection"),
    `backfill must let the dense arm surface the lexical-miss chunk; got ${JSON.stringify((fixed || []).map((c) => c.heading))}`
  );

  // Regression-lock: with backfill OFF (the OLD behavior), Deflection is unreachable -> only Pricing.
  const old = await hybridRetrieve(chunks, q, { embedFn, sparseRanked, topK: 3, candidateM: 12, backfill: false });
  assert.deepEqual((old || []).map((c) => c.heading), ["Pricing"]); // proves the gap existed
  assert.ok(!(old || []).some((c) => c.heading === "Deflection"));
});

test("hybridRetrieve: backfill is a NO-OP when sparseRanked already exceeds candidateM (byte-identical)", async () => {
  const chunks = Array.from({ length: 20 }, (_, i) => ({ source: "s", heading: `H${i}`, text: `t${i}` }));
  const sparseRanked = chunks.slice(); // 20 sparse hits, candidateM=12 -> head already fills budget
  const embedFn = async (t) => {
    const i = Number(String(t).replace(/[^0-9]/g, "")) || 0;
    return [1 / (i + 1), i / 20, 0.5];
  };
  const on = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked, topK: 5, candidateM: 12 });
  const off = await hybridRetrieve(chunks, "q", { embedFn, sparseRanked, topK: 5, candidateM: 12, backfill: false });
  assert.deepEqual(on, off, "backfill must not alter the pool when the sparse head already fills candidateM");
});
