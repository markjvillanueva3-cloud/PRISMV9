---
type: "chat-session"
source: "claude-code-cli"
session_id: "32c4ef87-567e-4db1-aef8-17e4186ddcf6"
title: "Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `caa0c29cb8` (dense embe"
date: "2026-06-11"
first_ts: "2026-06-11T00:57:35.070Z"
last_ts: "2026-06-11T01:01:16.966Z"
cwd: "H:\\PRISM"
messages: 57
user_msgs: 21
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-a10f599f56b919096.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `caa0c29cb8` (dense embe

> **claude-code-cli** | 2026-06-11 | 57 msgs (21 user / 36 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-a10f599f56b919096.jsonl`

## Transcript

### User | 2026-06-11T00:57:35.070Z

Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `caa0c29cb8` (dense embedding rerank arm) on branch cad-fusion-live-ms0, repo root H:/prism. Read end-to-end:
- scripts/lib/galaxy-dense-rerank.mjs (cosineSim/denseRankChunks/fuseSparseDense PURE + embedText/hybridRetrieve I/O)
- scripts/lib/hybrid-retrieval.mjs (the REUSED rrfMerge + hitDocId -- confirm galaxy-dense-rerank genuinely composes it, no duplicate RRF/fusion impl)
- scripts/lib/galaxy-reasoning-bridge.mjs (the dense wiring in reasonForGalaxy)

CONTEXT: This completes the sparse+dense RAG hybrid for the galaxy reasoning bridge. Sparse retrieval (galaxy-context-retrieval.mjs) selects candidates; the dense arm embeds the top-M via Ollama nomic-embed-text (768d), reranks by cosine, and RRF-fuses sparse+dense. OFF by default (PRISM_GALAXY_RAG_DENSE=1), fail-soft (no embed service -> null -> sparse kept).

JUDGE:
1. DEDUP (R8): does fuseSparseDense REUSE rrfMerge (not reimplement RRF)? Is the chunk->hit `id` mapping correct so hitDocId fuses sparse+dense on the same key (hitDocId reads hit.id first)? Does cosineSim/denseRankChunks duplicate anything existing? (grep for existing cosine/dense rerank libs).
2. Is this REAL hybrid retrieval -- does the dense arm actually change/refine the ranking, and does RRF genuinely blend BOTH arms (a doc high in both wins; a dense-only doc still surfaces)? Trace the math.
3. Correctness of the bounded two-stage: dense embeds only the sparse top-M candidates (bounds embed calls) -- confirm. Is the fusion deterministic?

Verify by reading; optionally run `cd /h/prism && node --test scripts/lib/galaxy-dense-rerank.test.mjs`. Report file:line per finding (P0/P1). End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-11T00:57:38.961Z

I'll review this commit thoroughly. Let me start by reading the three files end-to-end, then trace the math and check for duplication.

### Assistant | 2026-06-11T00:57:40.374Z

[tool_use: Bash]

### Assistant | 2026-06-11T00:57:40.815Z

[tool_use: Bash]

### User | 2026-06-11T00:57:44.134Z

[tool_result] caa0c29cb87eaa7ddd5378586b04d912d7608688
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-DENSE (slot:charlie): add the dense embedding rerank arm -> completes the sparse+dense RAG HYBRID, build-once for all 34 galaxies
Closes the last code-completable piece of the rag+cag+hybrids triad (was blocked by an
ENOSPC disk-full halt; disk recovered via the reaper sweep). The bridge's RAG w
... [+1467 chars truncated]

### User | 2026-06-11T00:57:48.489Z

[tool_result] commit caa0c29cb87eaa7ddd5378586b04d912d7608688
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 19:57:18 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-DENSE (slot:charlie): add the dense embedding rerank arm -> completes the sparse+dense RAG HYBRID, build-once for all 34 galaxies
    
    Closes the last code-completable piece of the 
... [+1938 chars truncated]

### Assistant | 2026-06-11T00:57:50.408Z

Let me read the three core files end-to-end now.

### Assistant | 2026-06-11T00:57:51.357Z

[tool_use: Read]

### Assistant | 2026-06-11T00:57:51.887Z

[tool_use: Read]

### Assistant | 2026-06-11T00:57:51.960Z

[tool_use: Read]

### User | 2026-06-11T00:57:52.220Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\galaxy-dense-rerank.mjs' was already read 7s ago in this session and is unchanged (mtime 1781139255805). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T00:57:53.636Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE — compose all 4 retrieval
3	// substrates (memory-index BM25 + master-index graph BM25 + episode-store
4	// predicate + Qdrant dense vector) into ONE query API. Fan out the same
5	// query string to every substrate the caller injects; merge ranked hit
6	// lists by Reciprocal Rank Fusion (Cormack et al. 2009, k=60) — robust to

... [+14536 chars truncated]

### User | 2026-06-11T00:57:53.814Z

[tool_result] 1	/**
2	 * galaxy-reasoning-bridge.mjs -- the generic, fleet-wide AI reasoning bridge that
3	 * wires EVERY galaxy to leg-#10 deep-reasoning (AI-SYNERGY-AUDIT-MS0/U-AISYN-BRIDGE,
4	 * slot:charlie).
5	 *
6	 * The audit's worst real gap was ownsOrWiresAi: ~23 galaxies (mostly infra/meta)
7	 * have NO AI reasoning wiring. Building 23 bespoke domain bridge engines would be
8	 * making-work (most have
... [+15034 chars truncated]

### Assistant | 2026-06-11T00:57:58.081Z

I have the bridge and hybrid-retrieval files. The dense-rerank file was already read in context. Let me view it again since I need to reference exact line numbers for findings, then check the dependencies it relies on.

### Assistant | 2026-06-11T00:57:58.447Z

[tool_use: Read]

### User | 2026-06-11T00:57:59.512Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\galaxy-dense-rerank.mjs' was already read 14s ago in this session and is unchanged (mtime 1781139255805). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-11T00:58:01.878Z

The read-once guard is blocking. Let me disable the cache to get the file content with line numbers, since I need exact file:line references for my findings.

### Assistant | 2026-06-11T00:58:03.086Z

[tool_use: Bash]

### User | 2026-06-11T00:58:08.730Z

[tool_result]      1	/**
     2	 * galaxy-dense-rerank.mjs -- optional DENSE (embedding) rerank arm for the galaxy
     3	 * reasoning bridge, completing the sparse+dense RAG hybrid (AI-SYNERGY-AUDIT-MS0/
     4	 * U-AISYN-DENSE, slot:charlie).
     5	 *
     6	 * Two-stage hybrid: the sparse lexical retriever (galaxy-context-retrieval.mjs) selects
     7	 * candidate sections; this arm embeds the top-M candida
... [+7152 chars truncated]

### Assistant | 2026-06-11T00:58:13.221Z

I have all three files now. Let me check the dependencies the dense arm relies on — specifically `scoreChunks` (which the bridge passes as `sparseRanked`) to confirm those chunks carry an `id`, and grep for any pre-existing cosine/dense-rerank libs to verify R8 (no duplication). Let me also confirm the test file's claims.

### Assistant | 2026-06-11T00:58:15.917Z

[tool_use: Bash]

### Assistant | 2026-06-11T00:58:16.939Z

[tool_use: Bash]

### User | 2026-06-11T00:58:20.530Z

[tool_result] /**
 * galaxy-context-retrieval.mjs -- PURE sparse RAG retrieval for the galaxy reasoning
 * bridge (AI-SYNERGY-AUDIT-MS0/U-AISYN-RAG, slot:charlie).
 *
 * Upgrades the bridge from a FIXED 1800-char synthesis dump to per-question retrieval:
 * given a galaxy's candidate docs + a question, return the top-K most relevant markdown
 * SECTIONS (heading-bounded chunks), ranked by relevance and diversif
... [+2389 chars truncated]

### User | 2026-06-11T00:58:30.962Z

[tool_result] === existing cosine implementations (lib) ===
scripts/lib/connection-finder.mjs
scripts/lib/galaxy-dense-rerank.mjs
scripts/lib/memo-embed-lib.mjs
scripts/lib/memory-index-search-lib.mjs
scripts/lib/node2vec-embedder.mjs
scripts/lib/node2vec-embedder.test.mjs
scripts/lib/path-embed.mjs
scripts/lib/path-ledger.mjs
scripts/lib/tribal-graph-embedding.mjs
scripts/lib/tribal-graph-embedding.test.mjs
mc
... [+1022 chars truncated]

### Assistant | 2026-06-11T00:58:36.742Z

There are existing cosine implementations. The R8 question is whether `galaxy-dense-rerank.mjs` should have reused one of the `scripts/lib/` cosine helpers rather than writing its own. Let me check the most relevant candidates — `memo-embed-lib.mjs` and `memory-index-search-lib.mjs` — to see if there's an exported, importable `cosineSim` the dense arm should have reused. Let me also confirm the key ID-mapping concern: does `scoreChunks` output carry an `id`, and does the sparse list passed to `fuseSparseDense` align with `denseRankChunks`.

### Assistant | 2026-06-11T00:58:38.131Z

[tool_use: Bash]

### Assistant | 2026-06-11T00:58:40.264Z

[tool_use: Bash]

### User | 2026-06-11T00:58:43.177Z

[tool_result] === scoreChunks + retrieveTopK bodies ===
 * scores it; a chunk may carry an optional numeric `prior` (0..1) that feeds the scorer's
 * stage1 feature (e.g. a synthesis-spine prior). Returns chunks with a `score`, desc.
 * @returns {Array<{source, heading, text, score}>}
 */
export function scoreChunks(chunks, query) {
  const arr = Array.isArray(chunks) ? chunks.filter((c) => c && typeof c.text =
... [+1546 chars truncated]

### User | 2026-06-11T00:58:48.069Z

[tool_result] === memo-embed-lib cosine export ===
scripts/lib/memo-embed-lib.mjs:175:export function cosine(a, b) {
scripts/lib/memory-index-search-lib.mjs:477:export function cosineSimInt8(queryVec, int8arr, int8norm, queryNorm) {
=== are any of these exported + importable as a shared cosine? ===
scripts/lib/connection-finder.mjs:63:export function cosineSim(tokensA, tokensB, idf) {
scripts/lib/galaxy-dense-r
... [+581 chars truncated]

### Assistant | 2026-06-11T00:58:55.426Z

This is a critical R8 finding to assess. There are several existing cosine implementations. Let me examine the closest candidates to judge whether `galaxy-dense-rerank.cosineSim` is a genuine duplicate or a justified small local helper. The key distinction: `connection-finder.cosineSim` operates on tokens+idf (different signature), but `memo-embed-lib.cosine`, `node2vec-embedder.cosineSimilarity`, `path-embed.cosine`, and `tribal-graph-embedding.cosineSimilarity` all operate on dense numeric vectors — same shape as the new one.

### Assistant | 2026-06-11T00:58:58.001Z

[tool_use: Bash]

### User | 2026-06-11T00:59:01.971Z

[tool_result] === memo-embed-lib.cosine (175) ===

/**
 * Pure: cosine similarity of two equal-length numeric vectors. Returns 0 on
 * any mismatch / zero-norm (safe default — never NaN).
 */
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y 
... [+3810 chars truncated]

### Assistant | 2026-06-11T00:59:07.735Z

This confirms the R8 finding clearly: `galaxy-dense-rerank.cosineSim` (lines 36-48) is byte-for-byte the same algorithm as at least three existing exported helpers — `memo-embed-lib.cosine`, `path-embed.cosine`, and `node2vec-embedder.cosineSimilarity` are all the identical "pure cosine of two equal-length numeric vectors, 0 on degenerate input" function. This is a genuine duplicate of a trivial, ubiquitous helper.

Now let me run the test file to verify the claims (RRF blend, dense-only union, fail-soft) actually pass, and trace the fusion math.

### Assistant | 2026-06-11T00:59:08.356Z

[tool_use: Bash]

### User | 2026-06-11T00:59:13.260Z

[tool_result]   ...
# Subtest: fuseSparseDense: a dense-ONLY doc still surfaces (union, not intersection)
ok 6 - fuseSparseDense: a dense-ONLY doc still surfaces (union, not intersection)
  ---
  duration_ms: 0.1364
  ...
# Subtest: fuseSparseDense: respects topK
ok 7 - fuseSparseDense: respects topK
  ---
  duration_ms: 0.1801
  ...
# Subtest: chunkId: deterministic + content-sensitive
ok 8 - chunkId: determin
... [+755 chars truncated]

### Assistant | 2026-06-11T00:59:17.628Z

All 11 tests pass. The earlier "test_timeout" triage note was a false alarm from the `node --test` runner default budget, not an actual failure — the full run shows 11/11 pass. Now let me trace the fusion math carefully and verify the critical correctness concerns: the chunk→hit id mapping and whether the dense arm genuinely refines the ranking. Let me read the test file to verify the RRF blend assertions are real (R9), and trace one specific concern about `fuseSparseDense`.

### Assistant | 2026-06-11T00:59:18.545Z

[tool_use: Bash]

### User | 2026-06-11T00:59:22.450Z

[tool_result]      1	/**
     2	 * Tests for galaxy-dense-rerank.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-DENSE).
     3	 * Reference-value tests for the PURE fusion math (cosine + dense rank + RRF fusion) with
     4	 * INJECTED embeddings + an injected embedFn -- no live Ollama needed. Run:
     5	 *   node --test scripts/lib/galaxy-dense-rerank.test.mjs
     6	 */
     7	import { test } from "node:test";
     8	imp
... [+6199 chars truncated]

### Assistant | 2026-06-11T00:59:33.543Z

The tests are genuine R9 reference-value tests — they assert real ranking outcomes (cosine [1,0]·[1,0]=1, RRF blend-both, dense-only union, fail-soft null), not stubs. Now let me trace the two correctness concerns carefully.

**Concern 1 — the id-mapping in the bridge's live path.** In `galaxy-reasoning-bridge.mjs:265`, `sparseFull = scoreChunks(...)`. Looking at `scoreChunks` output (lines 89-107 of galaxy-context-retrieval), the returned objects carry `{source, heading, text, score}` — **no `id` field**. That `sparseFull` is passed as `opts.sparseRanked` into `hybridRetrieve` (line 267). Inside `hybridRetrieve` (line 138): `candidates = source.map((c, i) => ({ ...c, id: c.id || chunkId(c, i) }))` — so id is synthesized via `chunkId` because `c.id` is absent. Then `denseRanked = denseRankChunks(candidates, ...)` operates on those same `candidates` objects (which now carry the synthesized id). So sparse and dense both fuse on the synthesized `chunkId`. Let me verify there's no aliasing/divergence issue.

### Assistant | 2026-06-11T00:59:36.369Z

[tool_use: Bash]

### User | 2026-06-11T00:59:40.370Z

[tool_result] fused.length = 3
ids distinct? true
   Force | surfaces: {"sparse":1,"dense":1} | score: 0.032787
   Vise | surfaces: {"sparse":2,"dense":3} | score: 0.032002
   Coolant | surfaces: {"sparse":3,"dense":2} | score: 0.032002

### Assistant | 2026-06-11T00:59:47.229Z

The id-mapping works correctly in the live bridge path. When `scoreChunks` output (id-less) is passed in, `hybridRetrieve` synthesizes ids via `chunkId`, and both the sparse list and dense list reference the *same* candidate objects (with the synthesized id), so RRF fuses on the same key. The `Force` section gets `{sparse:1, dense:1}` provenance — both arms contribute. This validates the commit's "both arms contribute" claim.

Now let me verify the **dense arm genuinely refines the ranking** (not a no-op), and check the determinism/RRF-tie concern. Let me also verify a subtle point: in `fuseSparseDense`, the sparse list passed from `hybridRetrieve` (line 147) is `candidates` — the *unranked* incoming order, not a re-sorted sparse ranking. Since the bridge passes `scoreChunks` output which IS sorted by sparse score desc, the incoming order already reflects sparse rank. Let me confirm dense reordering actually happens.

### Assistant | 2026-06-11T00:59:53.202Z

[tool_use: Bash]

### User | 2026-06-11T00:59:56.902Z

[tool_result] Order after hybrid (dense should pull Force up from sparse-rank-2):
   Force {"sparse":2,"dense":1} 0.032522
   Vise {"sparse":1,"dense":3} 0.032266
   Coolant {"sparse":3,"dense":2} 0.032002
deterministic? true

### Assistant | 2026-06-11T01:00:03.455Z

This confirms the dense arm genuinely refines the ranking. When sparse ranks `Vise` #1 but dense (embedding-cosine) finds `Force` closest, RRF promotes `Force` to the top — `Force` gets `{sparse:2, dense:1}`, beating `Vise`'s `{sparse:1, dense:3}`. RRF math: Force = 1/61 + 1/62 = 0.01639+0.01613 = 0.03252; Vise = 1/61 + 1/63 = 0.01639+0.01587 = 0.03227. Force wins. The fusion genuinely blends both arms, and it's deterministic across runs.

Now let me verify the **bounded two-stage** claim (dense embeds only the sparse top-M) and check one edge concern: what happens when `candidateM` truncates but `sparseFull` from the bridge could be large. Also let me confirm the `embedText` URL construction is correct (no double `/api/embeddings`).

### Assistant | 2026-06-11T01:00:08.555Z

[tool_use: Bash]

### User | 2026-06-11T01:00:12.721Z

[tool_result] embedCalls = 13 (expect 13 = 1 query + 12 candidates)
fused.length = 5 (topK=5)
=== embedText URL: DEFAULT OLLAMA_URL has NO /api/embeddings; embedText appends it (line 107). Check for double-append ===
21:const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
99:/** Embed text via Ollama /api/embeddings. Fail-soft: any error / non-array -> null. */
102:  const url = opts.url
... [+74 chars truncated]

### Assistant | 2026-06-11T01:00:23.486Z

The bounded two-stage is confirmed: 50 chunks but only 13 embed calls (1 query + 12 candidates, exactly `candidateM`). The URL construction is correct — `OLLAMA_URL` is the base (`http://127.0.0.1:11434`) and `embedText` appends `/api/embeddings` once, no double-append. This differs from `hybrid-retrieval.mjs`'s `DEFAULT_OLLAMA_URL` (line 29) which bakes `/api/embeddings` into the constant, but the two are independent and each is internally consistent.

Now let me check two remaining concerns: (1) the `opts.url` passed through from the bridge — does the bridge ever pass a `url` that already contains `/api/embeddings`? and (2) is there a latent issue where `embedText` is called with `opts` that includes `sparseRanked`/`topK`/`candidateM` (since `hybridRetrieve` passes `opts` straight through to `embedFn(query, opts)` at line 141)?

### Assistant | 2026-06-11T01:00:28.191Z

[tool_use: Bash]

### User | 2026-06-11T01:00:32.435Z

[tool_result] === Does bridge pass a url into hybridRetrieve? (line 267) ===
24:import { hybridRetrieve } from "./galaxy-dense-rerank.mjs";
267:        const fused = await hybridRetrieve(chunks, query, { sparseRanked: sparseFull, topK: RAG_TOP_K });
--- the call passes { sparseRanked, topK } only; url/model come from env defaults. embedText ignores extra opts keys. OK ===

=== Verify embedText tolerates the pas
... [+87 chars truncated]

### Assistant | 2026-06-11T01:00:38.774Z

The opts passthrough is harmless — `embedText` only reads `model`/`url`/`timeoutMs` and ignores the extra keys, and is fail-soft on errors. The bridge passes only `{sparseRanked, topK}`, so url/model come from env defaults consistently.

Let me do a final check on one subtle correctness point in the bridge integration: the `denseOn` gating and the `context.sources` rewrite (line 270), plus confirm the dense-aware cache key prevents collision. Then verify the whole bridge still imports/loads cleanly.

### Assistant | 2026-06-11T01:00:40.557Z

[tool_use: Bash]

### User | 2026-06-11T01:00:44.911Z

[tool_result] === bridge loads cleanly (import smoke) ===
exports: assembleGalaxyContext, buildReasoningPrompt, firstIdentityLine, gatherGalaxyDocs, reasonForGalaxy

=== dense cache-key collision guard: cacheModel = model+dense when denseOn (line 240) ===
23:import { cagKey, corpusFingerprint, getCached, putCached, loadCache, saveCache } from "./galaxy-cag-cache.mjs";
235:  const denseOn = process.env.PRISM_GAL
... [+588 chars truncated]

### Assistant | 2026-06-11T01:00:51.543Z

All integration points check out. The cache-key collision guard is correct: when `denseOn`, the CAG key uses `model+dense` (line 240, 247), so a sparse-only answer and a hybrid answer for the same galaxy+question are stored under distinct keys and never collide. The `context.sources` rewrite (line 270) correctly upgrades the `retrieved:` provenance tag to `retrieved-hybrid:` only when fusion actually produced results.

One last thing — let me note a subtle observation about the `denseOn` flow: the dense rerank runs *only on a CAG miss* (it's after the `getCached` early-return at line 251). That's correct behavior (a cache hit shouldn't re-embed), but let me confirm the cache-write path stores the dense-refined sources. Let me also verify the cosine duplicate is the only R8 concern by checking whether `connection-finder.cosineSim` (token-based) is genuinely different.

### Assistant | 2026-06-11T01:00:53.325Z

[tool_use: Bash]

### User | 2026-06-11T01:00:57.197Z

[tool_result] === connection-finder.cosineSim signature (token-based, NOT numeric-vector — genuinely different) ===
export function cosineSim(tokensA, tokensB, idf) {
  if (!tokensA.length || !tokensB.length) return 0;
  const tfA = new Map();
  for (const t of tokensA) tfA.set(t, (tfA.get(t) || 0) + 1);
  const tfB = new Map();
  for (const t of tokensB) tfB.set(t, (tfB.get(t) || 0) + 1);
  let dot = 0;
  let 
... [+684 chars truncated]

### Assistant | 2026-06-11T01:01:16.966Z

Confirmed. `connection-finder.cosineSim` is genuinely different (token-TF-IDF based, not dense numeric-vector cosine), so it's not the duplicate. The cache-write (line 283) correctly stores the dense-refined `context.sources`.

I have completed a thorough end-to-end review. Let me compile my verdict.

---

## Reviewer A (Holistic) — Verdict for `caa0c29cb8` (dense embedding rerank arm)

I read all three target files end-to-end, traced the fusion math, ran the test suite (11/11 pass), and reproduced the live bridge path with injected embeddings.

### 1. DEDUP (R8)

**PASS on the headline claim, with ONE real P2 finding.**

- **RRF reuse — VERIFIED.** `fuseSparseDense` (`galaxy-dense-rerank.mjs:75`) genuinely imports and calls `rrfMerge` from `hybrid-retrieval.mjs:19`. It does NOT reimplement RRF — it constructs two `{source, hits}` lists and delegates fusion entirely. The commit's R8 claim is honest.
- **`hitDocId` key alignment — VERIFIED.** `fuseSparseDense` feeds `rrfMerge` hits shaped `{ id }` (lines 77-78). `hitDocId` (`hybrid-retrieval.mjs:50`) reads `hit.id` first, so both arms fuse on the same `id`. I reproduced the live bridge path: `scoreChunks` output carries NO `id`, but `hybridRetrieve:138` synthesizes one via `chunkId` and **both the sparse and dense lists reference the same candidate objects**, so they fuse correctly (proved: `Force` section got `{sparse:1, dense:1}` provenance, ids distinct).
- **P2 (R8) — `cosineSim` is a genuine duplicate** (`galaxy-dense-rerank.mjs:36-48`). It is byte-for-byte the same "pure cosine of two equal-length numeric vectors, 0 on degenerate input" already exported as `memo-embed-lib.cosine:175`, `path-embed.cosine:69`, and `node2vec-embedder.cosineSimilarity:268`. (`connection-finder.cosineSim` is token/TF-IDF — genuinely different, not a dup.) This is a trivial 10-line helper, so the cost is low, but strictly per R8 it could have imported `cosine` from `memo-embed-lib.mjs`. Non-blocking — the commit body only claimed RRF
... [+1217 chars truncated]
