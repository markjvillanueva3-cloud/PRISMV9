---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Round-2 review of PRISM tribal-graph embedding library + paired test. Round 1 FA"
date: "2026-05-16"
first_ts: "2026-05-16T01:48:45.549Z"
last_ts: "2026-05-16T01:50:42.156Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a9f693db944d50b67.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Round-2 review of PRISM tribal-graph embedding library + paired test. Round 1 FA

> **claude-code-cli** | 2026-05-16 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a9f693db944d50b67.jsonl`

## Transcript

### User | 2026-05-16T01:48:45.549Z

Round-2 review of PRISM tribal-graph embedding library + paired test. Round 1 FAILed with 3 P0s (silent-success on all-malformed, stats lying, mergeIntoCheckpoint accepting wrong-dim) + 6 P1s. Round 1 also surfaced an endpoint contract bug (legacy /api/embeddings + prompt key vs modern /api/embed + input key).

**Round-2 fixes applied (verify each landed and is correct):**
1. embedBatch.ok = `items.length === 0 || vectors.length > 0` (true total-rejection now surfaces as ok=false)
2. embedBatch stats expose `malformedOrDuplicate` + `embedFailed` + `failed` separately
3. embedBatch skipIds rejects non-Set/Array (was accepting any `.has`-bearing object)
4. topKSimilar excludeIds rejects non-Set/Array
5. Reserved id names (__proto__, constructor, prototype) rejected at input gate and merge gate
6. mergeIntoCheckpoint validates fresh vector dim against checkpoint.dim
7. ollamaEmbedOne: modern /api/embed + input first, 404 falls back to legacy /api/embeddings + prompt. Endpoint option pins ("auto"|"modern"|"legacy")
8. Modern response shape `{embeddings: [[...]]}` parsed correctly
9. embedClusters: duplicate cluster id throws (not silent generic failure)
10. defaultClusterText uses " | " separator (was U+001F contaminating cosine signal)
11. buildLateralWires sort has explicit tie-break by (fromId, toId)
12. embedWithRetry adds jitter (50-100% of base delay) via JITTER_MIN_FRACTION constant
13. saveCheckpoint sweeps stale .tmp-* siblings older than TMP_STALE_AGE_MS; rename failure unlinks the tmp
14. loadCheckpoint validates embedding shape per-vector; returns `corruptIds` array of ids whose embeddings are wrong-shape

**Files to review (read FULL contents end-to-end, BOTH files):**
1. `H:\prism\scripts\lib\tribal-graph-embedding.mjs` (now ~605 LOC)
2. `H:\prism\scripts\lib\tribal-graph-embedding.test.mjs` (now ~1000 LOC, 104 cases, all pass in 341ms)

**Your job (Arm A — content specialist):**
- Verify each of the 14 fixes actually landed and is correct (no half-fix, no
... [+948 chars truncated]

### Assistant | 2026-05-16T01:48:53.600Z

I'll perform a thorough Round-2 review of the tribal-graph embedding library and its tests, verifying each of the 14 fixes.

### Assistant | 2026-05-16T01:48:53.961Z

[tool_use: Read]

### User | 2026-05-16T01:48:54.831Z

[tool_result] 1	// tribal-graph-embedding.mjs
2	// Pure-ish Ollama nomic-embed-text 768d embedding helper for the tribal-graph
3	// system. Lateral wires across the L0-L8 hierarchy are computed by cosine
4	// similarity over these embeddings. Companion to tribal-graph-clusters.mjs.
5	//
6	// Karpathy R12 (fail-loud): every failure mode is surfaced. Partial-batch
7	// failures return { ok: false, error, partial:
... [+30331 chars truncated]

### Assistant | 2026-05-16T01:48:57.046Z

Now let me read the test file:

### Assistant | 2026-05-16T01:49:00.052Z

[tool_use: Read]

### User | 2026-05-16T01:49:01.089Z

[tool_result] 1	// tribal-graph-embedding.test.mjs
2	// node:test suite (vitest harness blocked per [[reference_fleet_reaper_ms1]]).
3	// Run: node --test H:/prism/scripts/lib/tribal-graph-embedding.test.mjs
4	
5	import { describe, it, before, after } from "node:test";
6	import assert from "node:assert/strict";
7	import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, utimesSync } from "node:fs";
... [+43134 chars truncated]

### Assistant | 2026-05-16T01:49:04.261Z

Understood. Now let me run the tests to verify they actually pass, then verify a few specific concerns with targeted reads.

### Assistant | 2026-05-16T01:49:05.146Z

[tool_use: Bash]

### User | 2026-05-16T01:49:09.165Z

[tool_result]     # Subtest: [P1] buildLateralWires tie-break is deterministic
    ok 16 - [P1] buildLateralWires tie-break is deterministic
      ---
      duration_ms: 1.0104
      ...
    # Subtest: [P1] topKSimilar self-matches-self with score > 0.99
    ok 17 - [P1] topKSimilar self-matches-self with score > 0.99
      ---
      duration_ms: 0.2249
      ...
    # Subtest: [P1] retry uses jitter (delays no
... [+343 chars truncated]

### Assistant | 2026-05-16T01:49:12.354Z

All 104 tests pass. Now let me verify a few specific concerns I noticed during the read:

### Assistant | 2026-05-16T01:49:17.789Z

[tool_use: Bash]

### User | 2026-05-16T01:49:22.678Z

[tool_result] Sweep safety: cleanupStaleTmpFiles runs BEFORE new tmp is created. Cannot delete current.
Even if cleanup ran AFTER, age = 0 < 5min so it would be kept.

### Assistant | 2026-05-16T01:49:32.774Z

[tool_use: Bash]

### User | 2026-05-16T01:49:37.207Z

[tool_result] corruptIds: returned by loadCheckpoint, NOT consumed by embedClusters, but the not-in-processedIds path causes auto-heal next run

### Assistant | 2026-05-16T01:49:43.864Z

[tool_use: Bash]

### User | 2026-05-16T01:49:48.019Z

[tool_result] 404 fallback: ONLY triggers on endpoint=auto. Other status codes throw immediately.
endpoint=modern with 404 → throws (no fallback). Correct: caller explicitly pinned.

### Assistant | 2026-05-16T01:49:51.343Z

Task list is relevant — the current review is exactly the in-progress task #4. Not modifying it; the parent agent owns task state.

Now let me check one more correctness concern around the modern-shape parser:

### Assistant | 2026-05-16T01:49:52.656Z

[tool_use: Read]

### User | 2026-05-16T01:49:53.842Z

[tool_result] 240	    const data = await resp.json();
241	    // Modern endpoint returns { embeddings: [[...]] }; legacy returns { embedding: [...] }
242	    const vec = a.modern
243	      ? (Array.isArray(data?.embeddings) && data.embeddings[0])
244	      : data?.embedding;
245	    if (!Array.isArray(vec)) {
246	      throw new Error(`ollamaEmbedOne: response missing embedding field (got ${JSON.stringify(data)
... [+288 chars truncated]

### Assistant | 2026-05-16T01:50:42.156Z

---

## Round-2 Review: PRISM Tribal-Graph Embedding Library

**Grade: PASS** (with one P2 cleanup nit, two doc/contract gaps worth surfacing)

### Verification of the 14 round-2 fixes

All 14 fixes landed and are correct:

1. `embedBatch.ok` formula at L388-392 (`items.length === 0 || vectors.length > 0`): correct — all-rejection surfaces ok=false; empty input is vacuous ok=true. Locked in by `[P0] all-malformed` test L892.
2. Stats fields `malformedOrDuplicate` + `embedFailed` + `failed` at L395-404: present and distinct. Locked by L901 test (asserts exact counts 2/1/1/3).
3. `embedBatch.skipIds` strict shape at L313-322: `instanceof Set || Array.isArray`, else throws. Locked by L940 test.
4. `topKSimilar.excludeIds` strict shape at L104-111: identical pattern. Locked by L948 test (string `"abc"` → throws).
5. `RESERVED_ID_NAMES` rejected at input (`embedBatch` L342-346, `embedClusters` L648-650) and merge gate (`mergeIntoCheckpoint` L577-579). Locked by tests at L932, L956, L978.
6. `mergeIntoCheckpoint` dim validation at L573-576: throws on mismatch with explicit "X != Y" message. Locked by L924 test.
7. `ollamaEmbedOne` modern-first/legacy-fallback at L202-249: correct. 404-only fallback gated by `endpoint === "auto"` (L231). Non-404 errors throw at L236-238. Locked by L989, L996, L1012 tests.
8. Modern response parser at L242-243 (`Array.isArray(data?.embeddings) && data.embeddings[0]`): correct shape extraction. Locked by L989 test.
9. `embedClusters` duplicate id throws at L651-653 (not generic failure). Locked by L967 test.
10. `defaultClusterText` uses `TEXT_JOIN_SEP = " | "` (L40, L711). Locked by L1059 test.
11. `buildLateralWires` tie-break at L161-163 — explicit `fromId/toId` cascade. Locked by L1065 test.
12. `embedWithRetry` jitter at L275-278 via `JITTER_MIN_FRACTION = 0.5` (L30). Math: `base * (0.5 + random*0.5)` = 50-100% of base. Correct.
13. `saveCheckpoint` calls `cleanupStaleTmpFiles` at L451 BEFORE the new tmp is created at L452 — current sav
... [+5783 chars truncated]
