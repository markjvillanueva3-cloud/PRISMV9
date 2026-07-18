---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "You are reviewing the A6 \"hybrid BM25 + dense + RRF retrieval\" changeset for PRI"
date: "2026-05-29"
first_ts: "2026-05-29T19:47:04.202Z"
last_ts: "2026-05-29T19:55:10.242Z"
cwd: "H:\\prism-slot-alpha"
messages: 42
user_msgs: 16
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a85ccde7329872d70.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:36"
---

# You are reviewing the A6 "hybrid BM25 + dense + RRF retrieval" changeset for PRI

> **claude-code-cli** | 2026-05-29 | 42 msgs (16 user / 26 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a85ccde7329872d70.jsonl`

## Transcript

### User | 2026-05-29T19:47:04.202Z

You are reviewing the A6 "hybrid BM25 + dense + RRF retrieval" changeset for PRISM's Obsidian-memory recall path. Read ALL THREE files END-TO-END and grade PASS/FAIL with explicit P0/P1/P2 findings.

FILES:
1. H:/prism/scripts/lib/memory-index-search-lib.mjs  (the hot-path lib — focus here; the new code starts at the "A6 — Hybrid BM25 + dense" comment block and the rewritten sidecar branch in runMemoryIndexSearch)
2. H:/prism/scripts/build-memory-embeddings-sidecar.mjs  (offline embeddings-sidecar builder)
3. H:/prism/scripts/memory-index-search-hybrid.test.mjs  (node:test suite, 16 cases)

CONTRACT THE CODE MUST SATISFY (verify each, cite line numbers):
- STRICTLY ADDITIVE + FAIL-SAFE: when the embeddings sidecar is absent, ollama is unreachable, the query-embed times out/returns junk, or the circuit breaker is tripped, runMemoryIndexSearch MUST return the pre-existing BM25-only result with source:"sidecar" (or "live"), byte-identical to before A6. Trace every early-return in tryHybridFuse and confirm each degrades correctly.
- runMemoryIndexSearch MUST stay SYNCHRONOUS (a cross-worktree-locked hook calls it synchronously and cannot change). Confirm no await/async leaked into the hot path; the query embed is a synchronous curl subprocess (embedQueryViaOllamaSync).
- int8 quantization correctness: packInt8 stores int8 bytes (base64) + the int8 vector's L2 norm; cosineSimInt8 computes dot(queryFloat, int8)/(queryNorm*int8norm). VERIFY the mathematical claim in the comments that the per-vector quant SCALE CANCELS in cosine (so storing scale is unnecessary). Confirm divide-by-zero guards (zero norms → 0).
- RRF (reciprocalRankFusion): score(key)=Σ 1/(k+rank+1); a key present in only one ranking still surfaces (this is how a BM25-miss/dense-only memory appears). Confirm k default 60, tie-break deterministic.
- Circuit breaker: a query-embed failure writes EMBED_CIRCUIT_PATH; a fresh failure (<120s) skips the network entirely; success clears it. Confirm all fs ops are fa
... [+975 chars truncated]

### Assistant | 2026-05-29T19:47:17.675Z

I'll review the A6 hybrid retrieval changeset. Let me read all three files end-to-end.

### Assistant | 2026-05-29T19:47:18.219Z

[tool_use: Read]

### Assistant | 2026-05-29T19:47:18.649Z

[tool_use: Read]

### Assistant | 2026-05-29T19:47:19.017Z

[tool_use: Read]

### User | 2026-05-29T19:47:26.580Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+29643 chars truncated]

### User | 2026-05-29T19:47:26.980Z

[tool_result] 1	#!/usr/bin/env node
2	// A6 — build the memory-vault DENSE-embeddings sidecar that backs the hybrid
3	// BM25+dense+RRF retrieval added to memory-index-search-lib.mjs.
4	//
5	// Reads:  H:/prism/state/shared/memory-index-sidecar.json  (the BM25 sidecar —
6	//         reused as the record source so the embeddings sidecar aligns 1:1 by
7	//         recordKey; never re-enumerate the vault here, tha
... [+9927 chars truncated]

### User | 2026-05-29T19:47:27.318Z

[tool_result] 1	/**
2	 * A6 — tests for the hybrid BM25+dense+RRF retrieval added to
3	 * memory-index-search-lib.mjs.  node --test scripts/memory-index-search-hybrid.test.mjs
4	 *
5	 * Covers: int8 pack/unpack round-trip + cosine, RRF fusion algebra, denseRankAll,
6	 * embeddings-sidecar load (+ corrupt/stale fail-soft), the sync ollama embedder
7	 * via injected exec, tryHybridFuse integration (circuit-breake
... [+13383 chars truncated]

### Assistant | 2026-05-29T19:47:36.917Z

I have all three files. Let me verify each contract claim carefully. First, let me trace the critical mathematical claim about int8 scale cancellation in cosine similarity, and check the hydration path and byKey coverage.

Let me verify the key correctness concern: in `tryHybridFuse`, the test at line 178 calls `fused.map(recordKey)` — but the fused records have `score` added and are spread from `byKey` records which do NOT have a `key` field directly. Let me trace `recordKey` against the hydrated records.

### Assistant | 2026-05-29T19:47:38.174Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:47:39.766Z

[tool_use: Grep]

### User | 2026-05-29T19:47:48.516Z

[tool_result] 11:// Schema: { schemaVersion, builtAt, vaultRoot, namespaces, sourceMtimeMs,
12://           recordCount, records: [ {name, fileName, namespace, description,
15:// sourceMtimeMs = max(stat(namespace_dir).mtimeMs) — the lib re-validates by
32:// U-OBF-RECALL-NS (2026-05-29 slot:alpha): namespaces now SINGLE-SOURCED from the lib
38:  vaultRoot = DEFAULT_VAULT_ROOT,
39:  namespaces = DEFAULT_NAMESPA
... [+656 chars truncated]

### User | 2026-05-29T19:47:49.203Z

[tool_result] 326:export function recordKey(rec) {
526:  const bm25Keys = (Array.isArray(bm25Ranked) ? bm25Ranked : []).map(recordKey);
534:    const rec = byKey.get(key);
573:      byKey.set(recordKey(rec), rec);          // ALL records (hybrid hydrates BM25-miss hits)

### Assistant | 2026-05-29T19:47:56.991Z

Now let me trace the key correctness issues. I need to verify: (1) the `recordKey` math for hydrated records, (2) the int8 scale-cancellation claim, (3) RRF tie-break, (4) circuit breaker, and (5) the byKey coverage. Let me look at a couple subtle spots more closely.

The hydrated records out of `byKey` are the raw BM25 sidecar records (which contain `namespace` + `name`), so `recordKey` on them recomputes the same key. That's consistent. Let me verify the cosine math claim precisely and check for the unpackInt8 buffer-aliasing edge case.

### Assistant | 2026-05-29T19:47:57.789Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:48:03.642Z

[tool_use: Bash]

### User | 2026-05-29T19:48:35.416Z

[tool_result]   ...
# Subtest: tryHybridFuse: null (→BM25) when sidecar absent / hybrid disabled / circuit tripped / embed fails
ok 13 - tryHybridFuse: null (→BM25) when sidecar absent / hybrid disabled / circuit tripped / embed fails
  ---
  duration_ms: 1.3974
  ...
# Subtest: E2E hybrid: dense-only memory 'c' surfaces; source=hybrid
ok 14 - E2E hybrid: dense-only memory 'c' surfaces; source=hybrid
  ---
  du
... [+500 chars truncated]

### User | 2026-05-29T19:48:49.272Z

[tool_result] cos(float,int8) = 0.9999938001156075
cos with arbitrary doc rescale = 0.9999938001156072 (should equal above — scale cancels)
q.length = 7 expected 7

### Assistant | 2026-05-29T19:48:54.921Z

16/16 tests pass, and the scale-cancellation claim is verified empirically. Now let me check two subtle correctness concerns I spotted: the `unpackInt8` buffer-aliasing safety (base64 decode can produce a Buffer with non-zero byteOffset over a shared pool), and whether a stale embeddings sidecar can desync from the BM25 sidecar in a way that ships a degraded-but-healthy-looking result.

### Assistant | 2026-05-29T19:49:00.012Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:49:06.493Z

[tool_use: Bash]

### User | 2026-05-29T19:49:21.766Z

[tool_result] aliasing mismatches over 200 allocs: 0 (0 = safe)

### User | 2026-05-29T19:49:50.772Z

[tool_result] manual: fused recs w/o description rely on toHit s.description||"" — present at line 564
---- circuit breaker path check ----
ls: cannot access '/h/prism/state/shared/.memory-embed-circuit.json': No such file or directory
ls: cannot access '/h/prism/state/shared/memory-embeddings-sidecar.json': No such file or directory
-rw-r--r-- 1 wompu 197611 6754968 May 29 14:24 /h/prism/state/shared/memory-in
... [+16 chars truncated]

### Assistant | 2026-05-29T19:49:58.058Z

The embeddings sidecar doesn't exist yet (so hybrid is dormant — the strictly-additive presence-gate is real). The BM25 sidecar exists. Buffer aliasing is safe. Now let me check one more important correctness concern: the RRF fusion only fuses two key-lists, but `bm25Ranked` (scoredSc) is the FULL scored BM25 list, while `dense` is capped at 50. Let me verify the worst-case latency claim and check whether the fused output can be EMPTY in a way that incorrectly returns BM25 (which is actually the correct behavior). Let me also verify the dense-only doc actually outranks correctly and check the `now` injection consistency in circuit functions.

### Assistant | 2026-05-29T19:50:08.110Z

[tool_use: Bash]

### User | 2026-05-29T19:50:46.060Z

[tool_result] threw on circuit-write-failure? false | returned: null

### Assistant | 2026-05-29T19:50:51.788Z

Circuit-write failure is fully fail-soft. Now let me verify the most important architectural concern raised in the contract: **can a degraded/partial result ship as if healthy?** Let me examine the staleness path for the BM25 sidecar carefully — the A6 change made stale sidecars "use anyway." I need to confirm the embeddings sidecar staleness handling, and whether a desync between the two sidecars (BM25 has records the embeddings sidecar lacks, or vice versa) corrupts results.

### Assistant | 2026-05-29T19:50:52.431Z

[tool_use: Read]

### User | 2026-05-29T19:51:09.611Z

[tool_result] 1	#!/usr/bin/env node
2	// U-MEMORY-INDEX-SIDECAR — pre-build the memory-vault sidecar so the H7
3	// UserPromptSubmit hook (memory-index-precheck-inject.mjs) can hit a
4	// pre-parsed JSON instead of cold-scanning the ~492-file vault every prompt
5	// (measured at ~8.7 s — exceeded the 5 s UPS timeout, so H7 shipped UNWIRED).
6	//
7	// Reads:  H:/prism/knowledge/memories/{feedback,reference,proje
... [+1321 chars truncated]

### Assistant | 2026-05-29T19:51:17.646Z

Now let me test the desync scenario: what if the embeddings sidecar has a dense-only record whose key is NOT in `byKey` (because the BM25 sidecar was rebuilt and dropped/renamed records). The hydration loop at line 533-537 uses `byKey.get(key)` and `continue`s on miss — so a dense hit with no BM25 record is silently dropped. That's correct fail-safe. But let me verify the inverse and the empty-fused edge.

### Assistant | 2026-05-29T19:51:27.495Z

[tool_use: Bash]

### User | 2026-05-29T19:51:48.155Z

[tool_result] desync (dense key not in byKey): fused keys = [ 'reference/a' ]
  -> ghost correctly dropped (no fabricated record): true
all-keys-unhydratable -> returns null (BM25 fallback): true

### Assistant | 2026-05-29T19:51:57.206Z

Desync degrades safely. Now let me check the one remaining concern with real teeth: the `embeddings sidecar STALENESS` path. The BM25 sidecar uses graceful staleness (uses-anyway). The embeddings `tryLoadEmbeddingsSidecar` does NOT check `sourceMtimeMs` at all — it has no staleness gate. Let me confirm that and assess whether it matters, plus verify the worst-case latency budget arithmetic and the `--resume` + atomic-write claims in the builder.

### Assistant | 2026-05-29T19:51:57.241Z

[tool_use: Read]

### User | 2026-05-29T19:52:07.736Z

[tool_result] 428	export function tryLoadEmbeddingsSidecar({
429	  sidecarPath = DEFAULT_EMBEDDINGS_SIDECAR_PATH,
430	  readFileImpl = readFileSync,
431	  existsImpl = existsSync,
432	} = {}) {
433	  if (process.env.PRISM_MEMORY_HYBRID_DISABLE === "1") return null;
434	  if (!existsImpl(sidecarPath)) return null;
435	  let sc;
436	  try { sc = JSON.parse(readFileImpl(sidecarPath, "utf8")); } catch { return null
... [+644 chars truncated]

### Assistant | 2026-05-29T19:52:15.826Z

Confirmed: `tryLoadEmbeddingsSidecar` does no staleness check (no `sourceMtimeMs` comparison) — this is a P2, not a P0, since a stale embeddings sidecar just misses recently-added memories (the dense path degrades to BM25 for those keys, which is the documented graceful-staleness intent). But there's a subtler issue worth checking: the embeddings builder writes `sourceMtimeMs` into the sidecar (lines 164, 200) but the loader never reads it, so the field is dead. Not a bug, just dead metadata.

Now let me verify the worst-case latency arithmetic and the `dim` mismatch concern (query embed dim vs sidecar dim — cosineSimInt8 uses `Math.min(queryVec.length, int8arr.length)` which silently truncates on dim mismatch rather than failing).

### Assistant | 2026-05-29T19:52:23.060Z

[tool_use: Bash]

### User | 2026-05-29T19:53:36.063Z

[tool_result] dim-mismatch sim (q=3d, doc=4d): 0.5 -> nonzero means partial-dot leak
denseRankAll with dim mismatch ranks it anyway: [ 'k' ]
---- worst-case latency arithmetic ----
embed curl --max-time = ceil(2500/1000) = 3s; exec timeout = 2500+500 = 3000ms
circuit-tripped path: 0 network. BM25 scan ~0.3s. fused RRF over ~hundreds of keys: negligible.

### Assistant | 2026-05-29T19:53:47.411Z

Found a real but low-severity issue. There's also a **latency arithmetic discrepancy**: the comment claims a "2.5s curl cap" but `--max-time` is `ceil(2500/1000) = 3` seconds, and the exec backstop is `timeoutMs + 500 = 3000ms`. So the curl can run up to 3s (not 2.5s), and the exec subprocess timeout is also 3000ms — meaning the exec backstop (3000ms) and the curl cap (3000ms) are equal, so the "500ms backstop" provides effectively zero margin over curl's own timeout. Still well under 5s, so the budget holds, but the comment is inaccurate. Let me verify the exact worst-case once more and check whether the `dim` field from the sidecar could be used to guard the mismatch.

### Assistant | 2026-05-29T19:53:51.399Z

[tool_use: Bash]

### User | 2026-05-29T19:54:06.894Z

[tool_result] emb.dim is loaded (line 451) but NEVER compared to qvec.length in tryHybridFuse (lines 515-523).
Guard would be: if (emb.dim && qvec.length !== emb.dim) return null;
---- check git status / whether this is committed ----
dec72e4199 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN-FIX]/U-OBF-RECALL-NS: A1+A5 — index scrutiny/uncategorized...
0c0c7ace08 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN
... [+406 chars truncated]

### Assistant | 2026-05-29T19:55:10.242Z

I have everything I need for a complete verdict. Let me compile the final review.

## Code Quality Analysis Report — A6 Hybrid BM25+dense+RRF Retrieval

### Summary
- Files Analyzed: 3 (`memory-index-search-lib.mjs`, `build-memory-embeddings-sidecar.mjs`, `memory-index-search-hybrid.test.mjs`)
- Tests: 16/16 PASS (verified by running `node --test`)
- Issues Found: 0 P0, 2 P1, 4 P2
- Overall Quality Score: 8.5/10

The changeset is genuinely strictly-additive and fail-safe. I traced every early-return in `tryHybridFuse`, the int8 math, RRF, the circuit breaker, hydration, and the build-script fail-loud paths. **No path was found where a degraded or partial result ships as if healthy.** Every degradation collapses to the pre-existing BM25 result with `source:"sidecar"` (or `"live"`).

---

### Contract verification (each confirmed against line numbers)

**1. Strictly additive + fail-safe — PASS.** Every early-return in `tryHybridFuse` (lib lines 498–539) returns `null`, and `runMemoryIndexSearch` (line 582–587) treats `null` as "fall through to BM25-only":
- `opts.hybrid === false` → null (line 499)
- `PRISM_MEMORY_HYBRID_DISABLE` → null (line 500)
- no embeddings sidecar / corrupt / empty → `tryLoadEmbeddingsSidecar` null → null (line 512)
- circuit tripped → null, no network (line 513)
- embed returns null/empty → trips circuit, null (line 520)
- `dense.length === 0` → null (line 524)
- all fused keys unhydratable → `out=[]` → null (line 538)

I empirically confirmed the desync case (dense key absent from `byKey`): the ghost record is dropped, not fabricated, and an all-unhydratable result returns null → BM25 fallback. Verified the embeddings sidecar is currently **absent on disk**, so hybrid is dormant today and the BM25 path is byte-identical to pre-A6.

**2. Synchronous hot path — PASS.** No `await`/`async` in `runMemoryIndexSearch` or `tryHybridFuse`. The query embed is `execFileSync` curl (line 466). The `async` code lives only in the offline builder, correctly.
... [+7386 chars truncated]
