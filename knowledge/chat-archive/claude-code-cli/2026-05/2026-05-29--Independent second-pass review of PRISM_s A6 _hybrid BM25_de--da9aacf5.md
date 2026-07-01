---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Independent second-pass review of PRISM's A6 \"hybrid BM25+dense+RRF memory retri"
date: "2026-05-29"
first_ts: "2026-05-29T19:47:23.450Z"
last_ts: "2026-05-29T19:58:18.618Z"
cwd: "H:\\prism-slot-alpha"
messages: 51
user_msgs: 18
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a1c60b5a3ce8b0c62.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Independent second-pass review of PRISM's A6 "hybrid BM25+dense+RRF memory retri

> **claude-code-cli** | 2026-05-29 | 51 msgs (18 user / 33 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a1c60b5a3ce8b0c62.jsonl`

## Transcript

### User | 2026-05-29T19:47:23.450Z

Independent second-pass review of PRISM's A6 "hybrid BM25+dense+RRF memory retrieval" changeset. Do NOT assume a prior reviewer caught everything. Read ALL THREE files END-TO-END. Weight your review toward: integration with the already-built BM25 path, hidden coupling, security (subprocess/JSON parsing), error budgets, naming/convention conformance, inlined constants, and stub/weak test assertions.

FILES:
1. H:/prism/scripts/lib/memory-index-search-lib.mjs
2. H:/prism/scripts/build-memory-embeddings-sidecar.mjs
3. H:/prism/scripts/memory-index-search-hybrid.test.mjs

SPECIFIC THINGS TO ATTACK:
- SECURITY: embedQueryViaOllamaSync passes a JSON payload to curl via execFileSync (no shell). Confirm there is NO shell injection surface (args array, not a shell string). Confirm JSON.parse of curl stdout and of both sidecars is wrapped so malformed input can never throw on the hot path. Confirm maxBuffer is bounded.
- INTEGRATION: the rewritten sidecar branch in runMemoryIndexSearch must preserve the EXACT prior BM25 hit shape {name,fileName,namespace,score,description,opening(sliced 200)} and ordering for the non-hybrid path. Diff the new `toHit` mapping against the old inline mapping — any field drift is a P1. Confirm the live-scan fallback branch (further down) is unchanged.
- COUPLING: tryHybridFuse depends on byKey being built from ALL sidecar records and on recordKey() producing identical keys for the BM25 sidecar records AND the embeddings sidecar records. If the two sidecars are built from different record sets (drift), what happens? Confirm it degrades safely (missing key → skipped, not crash).
- The embeddings sidecar staleness: tryLoadEmbeddingsSidecar does NOT stale-check (unlike the BM25 sidecar). Is "use a stale embeddings sidecar anyway" the right call, or a silent-staleness bug? Judge it.
- CONSTANTS: confirm NO inlined physics constants (Kienzle/Taylor/material) — there should be none here, but verify. Confirm magic numbers (RRF k=60, timeouts, cooldown, d
... [+839 chars truncated]

### Assistant | 2026-05-29T19:47:36.593Z

I'll perform an independent second-pass review of the A6 hybrid memory retrieval changeset. Let me read all three files end-to-end.

### Assistant | 2026-05-29T19:47:37.218Z

[tool_use: Read]

### Assistant | 2026-05-29T19:47:37.527Z

[tool_use: Read]

### Assistant | 2026-05-29T19:47:37.947Z

[tool_use: Read]

### User | 2026-05-29T19:47:39.874Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\memory-index-search-lib.mjs' was already read 17s ago in this session and is unchanged (mtime 1780083924093). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-29T19:47:41.074Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-memory-embeddings-sidecar.mjs' was already read 17s ago in this session and is unchanged (mtime 1780082871808). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-05-29T19:47:47.758Z

[tool_result] 1	/**
2	 * A6 — tests for the hybrid BM25+dense+RRF retrieval added to
3	 * memory-index-search-lib.mjs.  node --test scripts/memory-index-search-hybrid.test.mjs
4	 *
5	 * Covers: int8 pack/unpack round-trip + cosine, RRF fusion algebra, denseRankAll,
6	 * embeddings-sidecar load (+ corrupt/stale fail-soft), the sync ollama embedder
7	 * via injected exec, tryHybridFuse integration (circuit-breake
... [+13383 chars truncated]

### Assistant | 2026-05-29T19:47:52.441Z

The test file is now in my context. The two source files were read 17s ago but the read-once guard says their content is in my context — however I don't actually have them in this conversation. Let me read them with explicit cache bypass since I need the full source to review.

### Assistant | 2026-05-29T19:47:52.669Z

[tool_use: Read]

### User | 2026-05-29T19:47:55.265Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\memory-index-search-lib.mjs' was already read 32s ago in this session and is unchanged (mtime 1780083924093). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-29T19:48:01.979Z

The guard is blocking me but the file content is NOT actually in my context (this is a fresh agent invocation). I need to bypass the cache. Let me disable the read cache.

### Assistant | 2026-05-29T19:48:02.709Z

[tool_use: Bash]

### User | 2026-05-29T19:48:37.986Z

[tool_result] bypass marker

### Assistant | 2026-05-29T19:48:42.122Z

The env var on a bash call won't carry to the Read tool. Let me read the file using offset/limit which the guard explicitly allows for "a different part of the file."

### Assistant | 2026-05-29T19:48:42.591Z

[tool_use: Read]

### User | 2026-05-29T19:48:49.261Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+29643 chars truncated]

### Assistant | 2026-05-29T19:48:57.135Z

Now I have the main lib file. Let me read the embeddings sidecar builder file (file 2). I'll use offset to bypass the read-once guard.

### Assistant | 2026-05-29T19:48:57.997Z

[tool_use: Read]

### User | 2026-05-29T19:49:08.308Z

[tool_result] 1	#!/usr/bin/env node
2	// A6 — build the memory-vault DENSE-embeddings sidecar that backs the hybrid
3	// BM25+dense+RRF retrieval added to memory-index-search-lib.mjs.
4	//
5	// Reads:  H:/prism/state/shared/memory-index-sidecar.json  (the BM25 sidecar —
6	//         reused as the record source so the embeddings sidecar aligns 1:1 by
7	//         recordKey; never re-enumerate the vault here, tha
... [+9927 chars truncated]

### Assistant | 2026-05-29T19:49:13.297Z

I now have all three files end-to-end. Let me verify a few specific claims before finalizing. First, the integration claim: the test asserts the BM25-only path's prior hit shape. Let me confirm whether the prior (pre-A6) inline mapping was identical to the new `toHit`. Let me check git history for the prior version of this file.

### Assistant | 2026-05-29T19:49:15.460Z

[tool_use: Bash]

### User | 2026-05-29T19:54:04.769Z

[tool_result] dec72e4199 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN-FIX]/U-OBF-RECALL-NS: A1+A5 — index scrutiny/uncategorized...
0c0c7ace08 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN-FIX]/U-OBF-RECALL: memory-index graceful-degradation — sta...
70291ce926 [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-BATCH-V2-WIRE (slot:whiskey iter10): batch CLI V2 version-switching. [...
cab89da0a6 [MAIN] [SYNERGY-AUDIT-CONT
... [+601 chars truncated]

### Assistant | 2026-05-29T19:54:10.169Z

The A6 changes are uncommitted (working tree). Let me see the current uncommitted diff to confirm exactly what changed versus the committed BM25 baseline, focusing on the `runMemoryIndexSearch` mapping.

### Assistant | 2026-05-29T19:54:10.171Z

[tool_use: Bash]

### User | 2026-05-29T19:54:25.525Z

[tool_result] scripts/lib/memory-index-search-lib.mjs | 284 ++++++++++++++++++++++++++++++--
 1 file changed, 274 insertions(+), 10 deletions(-)

--- Changes ---

scripts/lib/memory-index-search-lib.mjs
  @@ -14,8 +14,9 @@
  -import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
  +import { readFileSync, statSync, readdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
   impor
... [+6435 chars truncated]

### Assistant | 2026-05-29T19:54:29.385Z

Let me see the exact diff of the `runMemoryIndexSearch` body to confirm the prior inline mapping versus the new `toHit`, and whether the live-scan branch is unchanged.

### Assistant | 2026-05-29T19:54:30.723Z

[tool_use: Bash]

### User | 2026-05-29T19:54:39.333Z

[tool_result]  export function runMemoryIndexSearch(query, opts = {}) {
   const tokens = tokenize(query, opts);
   if (tokens.length < 1) return { tokens, hits: [] };
 
   const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
   const namespaces = opts.namespaces ?? DEFAULT_NAMESPACES;
   const topK = opts.topK ?? DEFAULT_TOP_K;
   const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
   const ma
... [+2108 chars truncated]

### Assistant | 2026-05-29T19:54:44.222Z

This confirms the BM25 path mapping is byte-identical (the inline mapping was refactored into `toHit`, field-for-field). The live-scan branch is unchanged. Now let me verify two integration concerns: (1) does the real hook caller use `source` or expect a specific shape, and (2) the staleness asymmetry — does the BM25 sidecar still get stale-checked while embeddings don't, and is there a real drift risk.

### Assistant | 2026-05-29T19:54:45.769Z

[tool_use: Bash]

### User | 2026-05-29T19:55:00.662Z

[tool_result] === hook caller usage of runMemoryIndexSearch ===
26:import { runMemoryIndexSearch } from "../../scripts/lib/memory-index-search-lib.mjs";
77:  const { tokens, hits } = runMemoryIndexSearch(prompt, { topK: TOP_K });

### Assistant | 2026-05-29T19:55:06.196Z

The hook only consumes `{tokens, hits}` — `source` is additive and harmless. The hit shape is preserved. Now let me verify the int8 clamp boundary and the norm consistency concern (a P-level subtlety): `packInt8` clamps to ±127 and computes norm from the *clamped* int8 values, but the builder persists `norm` from `packInt8`, while `unpackInt8` reconstructs the Int8Array — so `cosineSimInt8` uses the stored norm against the unpacked array. Let me verify these are consistent and check the `recordKey` drift-safety concern in `tryHybridFuse`.

### Assistant | 2026-05-29T19:55:14.539Z

[tool_use: Bash]

### User | 2026-05-29T19:55:30.761Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\lib\memory-index-search-lib.mjs' imported from C:\Users\wompu\AppData\Local\Temp\a6probe.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
... [+569 chars truncated]

### Assistant | 2026-05-29T19:55:34.411Z

Path resolution issue (Windows). Let me use the proper Windows path and put the probe inside the repo temp.

### Assistant | 2026-05-29T19:55:38.884Z

[tool_use: Bash]

### User | 2026-05-29T19:55:54.273Z

[tool_result] stored norm: 214.9023033845845 recomputed l2norm(unpacked): 214.9023033845845 EQUAL: true
self cosine: 0.9999959125445088
drift fused keys: [ 'feedback/ghost', 'reference/a' ]
recordKey {ns,fileName,no name}: reference/x.md
emb-key-fallback {ns,fileName,no name}: reference/undefined

### Assistant | 2026-05-29T19:56:00.527Z

This confirms a real key-derivation divergence. Now let me run the actual test suite to confirm it passes (and that there's no test_timeout in this suite specifically — the earlier triage note may have been from another run).

### Assistant | 2026-05-29T19:56:01.168Z

[tool_use: Bash]

### User | 2026-05-29T19:56:15.610Z

[tool_result]   ...
# Subtest: tryHybridFuse: null (→BM25) when sidecar absent / hybrid disabled / circuit tripped / embed fails
ok 13 - tryHybridFuse: null (→BM25) when sidecar absent / hybrid disabled / circuit tripped / embed fails
  ---
  duration_ms: 1.0899
  ...
# Subtest: E2E hybrid: dense-only memory 'c' surfaces; source=hybrid
ok 14 - E2E hybrid: dense-only memory 'c' surfaces; source=hybrid
  ---
  du
... [+499 chars truncated]

### Assistant | 2026-05-29T19:56:22.819Z

All 16 tests pass cleanly with no timeout. Now let me verify the circuit-breaker open/close transition test assertions more closely, and check one final security concern: confirm `execFileSync` with `curl` cannot have shell injection and that the circuit-breaker test actually proves the *close* transition (not just open). Let me also check whether there's a test proving `clearEmbedCircuit` is invoked on success.

### Assistant | 2026-05-29T19:56:25.591Z

[tool_use: Bash]

### User | 2026-05-29T19:56:30.887Z

[tool_result] === Does any test assert the circuit CLOSE (unlink on success)? ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 4 files:

174:0:() => {}, unlinkImpl: () => {}, now: 1000,
200:0:() => {}, unlinkImpl: () => {},
213:0:() => { wrote = true; }, unlinkImpl: () => {},
244:0:() => {}, unlinkImpl: () => {}, now: 1000,
=== Does any test asser
... [+342 chars truncated]

### Assistant | 2026-05-29T19:56:38.692Z

This confirms my concerns. The circuit-breaker tests only inject a no-op `unlinkImpl: () => {}` — there is NO assertion that `unlinkImpl` is invoked on success. So the circuit *close* transition is untested (only *open* is tested, via `wrote = true` at line 213). And there's no test asserting the `dense.length === 0 → null` guard (line 524). Let me do one final check on the R12 honesty edge: when does `source: "hybrid"` get returned but dense actually contributed nothing meaningful — i.e., RRF produced a list identical to BM25 ordering. Let me verify the logical flow.

### Assistant | 2026-05-29T19:56:46.389Z

[tool_use: Bash]

### User | 2026-05-29T19:56:56.689Z

[tool_result] Dense added nothing new (same single key a). Result still non-null → source would be 'hybrid'
out: [{"name":"a","fileName":"a.md","namespace":"reference","description":"x","opening":"","score":0.03278688524590164}]

### Assistant | 2026-05-29T19:57:04.292Z

This confirms the R12-honesty nuance: `source: "hybrid"` is reported whenever the dense path *runs and produces candidates*, even if dense contributed nothing distinct from BM25. That is defensible (the dense path genuinely ran and influenced scoring/ordering), so it is not a false success — I'll note it as P2-informational rather than an R12 violation.

I have everything I need. Let me clean up the temp probe files I created and confirm no stray files remain.

### Assistant | 2026-05-29T19:57:05.458Z

[tool_use: Bash]

### User | 2026-05-29T19:57:19.048Z

[tool_result] cleanup done
 M knowledge/wiki/architecture/actions/cad/cad-probe-drift-alerts.md
 M knowledge/wiki/architecture/actions/cad/cad-probe-drift-analyze.md
 M knowledge/wiki/architecture/actions/cad/cad-probe-drift-history.md
 M knowledge/wiki/architecture/actions/cad/cad-probe-drift-record.md
 M knowledge/wiki/architecture/actions/cad/cad-probe-get.md
 M knowledge/wiki/architecture/actions/cad/cad-pr
... [+7897 chars truncated]

### Assistant | 2026-05-29T19:58:18.618Z

My temp probe files are removed (the `grep -i probe` matched many pre-existing unrelated files in the repo, none of which are mine). Cleanup is confirmed — `probe-a6-tmp.mjs`, `probe-r12-tmp.mjs`, and `/tmp/a6probe.mjs` are gone.

I have completed a full end-to-end independent review of all three files plus empirical verification. Here are my findings.

---

## Independent Second-Pass Review — A6 Hybrid BM25+Dense+RRF Memory Retrieval

### Files reviewed (end-to-end)
1. `H:/prism/scripts/lib/memory-index-search-lib.mjs` (638 lines)
2. `H:/prism/scripts/build-memory-embeddings-sidecar.mjs` (234 lines)
3. `H:/prism/scripts/memory-index-search-hybrid.test.mjs` (279 lines)

I ran the suite (16/16 pass, 128ms, no timeout) and wrote throwaway probes to empirically verify int8 norm consistency, key-derivation drift, and the R12 honesty path.

---

### SECURITY — clean, no injection surface (PASS)

- **No shell injection.** `embedQueryViaOllamaSync` (lib lines 458-477) calls `execImpl("curl", [args], {...})` — `execFileSync` with an **args array, no shell**. The query never reaches a shell; it's a JSON value inside `-d payload`. The URL/model come from named consts or opts, not interpolated into a command string. Confirmed safe.
- **JSON.parse is wrapped everywhere on the hot path.** `embedQueryViaOllamaSync` (line 473) is inside `try/catch` → null. `tryLoadEmbeddingsSidecar` (line 436), `embedCircuitTripped` (line 482), `tryLoadMemorySidecar` (line 253) — all wrapped. Malformed curl stdout / corrupt sidecar / corrupt circuit file cannot throw on the hot path. Verified by test lines 115, 139.
- **maxBuffer bounded** at `8 * 1024 * 1024` (line 471), `timeout: timeoutMs + 500`, `windowsHide: true`. Good.
- **No inlined physics constants** — confirmed none present (correct; this is a retrieval lib).

---

### FINDINGS

**P1 — recordKey ↔ embeddings-sidecar key fallback divergence (silent drift / orphaned dense records).**
`recordKey()` (lib lines 326-329) falls back to `name |
... [+7834 chars truncated]
