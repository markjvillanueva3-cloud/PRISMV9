---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Review a HIGH-BLAST-RADIUS change to H:/prism/scripts/lib/memory-index-search-li"
date: "2026-06-10"
first_ts: "2026-06-10T18:13:22.931Z"
last_ts: "2026-06-10T18:16:53.390Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a99b98f50c8b84098.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a HIGH-BLAST-RADIUS change to H:/prism/scripts/lib/memory-index-search-li

> **claude-code-cli** | 2026-06-10 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a99b98f50c8b84098.jsonl`

## Transcript

### User | 2026-06-10T18:13:22.931Z

Review a HIGH-BLAST-RADIUS change to H:/prism/scripts/lib/memory-index-search-lib.mjs (HMEMV09 consumer rewire). This lib's `runMemoryIndexSearch` is called synchronously by `.claude/hooks/memory-index-precheck-inject.mjs`, a UserPromptSubmit hook that fires on EVERY prompt across all 26 fleet chat slots. A regression breaks fleet-wide memory recall.

Read the WHOLE file end-to-end: H:/prism/scripts/lib/memory-index-search-lib.mjs and its tests H:/prism/scripts/lib/memory-index-search-lib.test.mjs

WHAT CHANGED (verify against the actual file, do not assume):
1. New exported `denseRankViaQdrant(queryVec, opts)` — POSTs to a Qdrant HNSW collection `prism_memories` (dim 768, Cosine) via an injectable curl `execImpl`, returns `[{key, sim}]` from `result[].payload.node_id` + `score`, or `null` on ANY failure (bad input / curl throw / non-JSON / Qdrant error body with no `result` array / empty result / missing node_id).
2. `tryHybridFuse` restructured to be Qdrant-PRIMARY with the pre-existing linear-scan (`denseRankAll` over the 21.9MB embeddings sidecar) as a LAZY fallback: gate on sidecar-present-OR-qdrant-enabled → embed query → try Qdrant ANN → if null, lazy-load sidecar + linear scan → RRF fuse with BM25 → hydrate via `byKey`.

CONTRACT THAT MUST HOLD (grade FAIL if any is violated):
- FAIL-SOFT: every failure path (Qdrant down, ollama embed down, no sidecar, parse error) must degrade to the prior behavior (BM25-only or scan), NEVER throw, NEVER break recall. The function must never propagate an exception to the synchronous hook.
- BACK-COMPAT: `opts.hybrid === false` must short-circuit to null BEFORE any fs/embed/Qdrant work (existing tests + the two `fakeSidecarOpts` sidecar tests rely on this). `PRISM_MEMORY_HYBRID_DISABLE=1` must still disable.
- REVERT KNOB: `PRISM_MEMORY_QDRANT_DISABLE=1` (or `opts.qdrant === false`) must fully bypass Qdrant and use the scan path.
- KEY ALIGNMENT: Qdrant `payload.node_id` is `namespace/name` == `recordKey()`, so dense keys hy
... [+1208 chars truncated]

### Assistant | 2026-06-10T18:13:30.046Z

I'll review this high-blast-radius change. Let me read the target file and its tests end-to-end.

### Assistant | 2026-06-10T18:13:30.527Z

[tool_use: Read]

### Assistant | 2026-06-10T18:13:30.825Z

[tool_use: Read]

### User | 2026-06-10T18:13:33.519Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+43706 chars truncated]

### User | 2026-06-10T18:13:36.347Z

[tool_result] 1	// Hermetic node:test suite for memory-index-search-lib.mjs (H7 of
2	// SYSTEM-SYNERGY-AUDIT). 28 cases. Pure-core only — fs reads are mocked via
3	// injected readImpl/readdirImpl/statImpl/existsImpl.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  tokenize,
9	  buildMemoryRecord,
10	  scoreMemoryRecord,
11	  enumerateMemoryFiles,
12	  runMemoryI
... [+35196 chars truncated]

### Assistant | 2026-06-10T18:13:43.722Z

I've read both files end-to-end. Now let me verify a few critical claims against the actual consumer hook and the upstream `byKey` construction, since the contract hinges on them.

### Assistant | 2026-06-10T18:13:43.922Z

[tool_use: Read]

### User | 2026-06-10T18:13:46.793Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\memory-index-precheck-inject.mjs' was already read 24m ago in this session and is unchanged (mtime 1781019080475). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-10T18:13:51.735Z

The hook isn't actually in my context (this is a fresh agent session). Let me grep the call site to verify how `runMemoryIndexSearch` is invoked and whether `source` is consumed.

### Assistant | 2026-06-10T18:13:52.647Z

[tool_use: Bash]

### User | 2026-06-10T18:14:05.935Z

[tool_result] 5:// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
23://   PRISM_MEMORY_INDEX_K=N            — top-K hits (default 3, bounded 1..10)
29:import { runMemoryIndexSearch } from "../../scripts/lib/memory-index-search-lib.mjs";
47:// relevance-gated in the lib — never suppresses cross-domain hits. Graceful: no
65:  catch { return ""; }
77:function renderBlock(tokens, hits, b
... [+525 chars truncated]

### Assistant | 2026-06-10T18:14:11.152Z

Now I have the full picture of the call site. Let me check the exact context around line 110-122 and confirm the outer try/catch wraps the call.

### Assistant | 2026-06-10T18:14:11.969Z

[tool_use: Read]

### User | 2026-06-10T18:14:14.587Z

[tool_result] 95	  let payload;
96	  try { payload = JSON.parse(readStdinSync() || "{}"); }
97	  catch { process.exit(0); }
98	
99	  const prompt = String(payload.prompt ?? "").slice(0, MAX_PROMPT_LEN);
100	  if (!prompt || prompt.length < 6) { process.exit(0); }
101	
102	  // Per-session same-prompt throttle: a /loop re-submits the SAME prompt each
103	  // tick — without this we re-inject an identical block e
... [+875 chars truncated]

### Assistant | 2026-06-10T18:14:22.241Z

I now have everything needed. The hook calls `runMemoryIndexSearch` at line 110 wrapped in an outer `try/catch` (line 119-124) that `process.exit(0)`s on any throw — so even a thrown exception degrades to "no injection" rather than crashing the prompt. But the contract demands the *lib function itself* never throw, and the outer catch only protects the hook process, not other potential synchronous callers. Let me trace the precise exception-escape paths.

Let me analyze the critical risk areas methodically. First, the byKey hydrate gate and the model-dim guard.

### Assistant | 2026-06-10T18:14:22.892Z

[tool_use: Read]

### User | 2026-06-10T18:14:26.892Z

[tool_result] 665	export function tryHybridFuse({ query, bm25Ranked, byKey, opts = {} }) {
666	  if (opts.hybrid === false) return null;
667	  if (process.env.PRISM_MEMORY_HYBRID_DISABLE === "1") return null;
668	
669	  const existsImpl = opts.existsImpl ?? existsSync;
670	  const readFileImpl = opts.readFileImpl ?? readFileSync;
671	  const writeFileImpl = opts.writeFileImpl ?? writeFileSync;
672	  const unlin
... [+3857 chars truncated]

### Assistant | 2026-06-10T18:14:45.821Z

I have the full picture now. Let me trace each exception-escape path carefully and verify the contract claims.

**Key trace 1 — `tryHybridFuse` is called WITHOUT a try/catch in `runMemoryIndexSearch` (line 800).** So any throw inside `tryHybridFuse` propagates up through `runMemoryIndexSearch` to the caller. The only protection is the hook's outer `try/catch`. The contract explicitly says "The function must never propagate an exception to the synchronous hook." Let me hunt every throw site inside the `tryHybridFuse` call tree.

**Key trace 2 — the production embed-circuit calls.** When `tryHybridFuse` is invoked from `runMemoryIndexSearch` (line 800), `opts` is the hook's opts `{ topK, boostDomain }` — so `opts.writeFileImpl`, `opts.unlinkImpl`, `opts.existsImpl` are all undefined, meaning the real `writeFileSync`/`unlinkSync`/`existsSync` run in production.

Let me verify the `tripEmbedCircuit` / `clearEmbedCircuit` are wrapped and confirm the exception surface around `existsImpl(embSidecarPath)` at line 682.

Let me now reason through each finding precisely.

**Finding A — `existsImpl(embSidecarPath)` at line 682 is unguarded.** In production from the hook, `opts.existsImpl` is undefined → `existsSync` is used. `existsSync` essentially never throws (returns false on bad paths). Low risk. But `embedCircuitTripped` (686) wraps its body in try/catch — good. The dangerous one is the dense-arm and hydrate.

Let me check whether `denseRankViaQdrant`'s default `execImpl` (the real `execFileSync`) can throw in a way not caught. Looking at lines 530-538: the `execImpl(...)` is inside `try { } catch { return null; }`. Good. But `JSON.stringify({ vector: queryVec, ... })` at line 525 is **before** the try block. `queryVec` is the ollama embedding (an array of numbers) — `JSON.stringify` of that won't throw. OK.

**Finding B — the hydrate loop `byKey.get(key)` at line 738.** When called from `runMemoryIndexSearch` line 800, `byKey` is always a real Map. When Qdrant returns a 
... [+826 chars truncated]

### Assistant | 2026-06-10T18:14:47.949Z

[tool_use: Bash]

### User | 2026-06-10T18:15:09.027Z

[tool_result] 31b5946bdc [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXCLUDE (slot:alpha): exclude 9571 node_* pointer stubs from memo recall (72% corpus noise)
3172f51903 [MAIN] [MEMORY-RECALL-DOMAIN-BOOST]/U-MRDB-WIRE (slot:golf): keep each galaxy's primary domain context in recall via an additive, relevance-gated, opt-in boost
06a6de1b51 [MAIN] [MEMORY-RECALL-SUPERSEDE]/U-MRS-E
... [+9139 chars truncated]

### Assistant | 2026-06-10T18:15:19.120Z

The diff confirms exactly what changed. The error-triage reminder is a false positive (no test ran). Now let me verify the key behavioral question: was the model-dim guard a `return null` (full bypass of dense) BEFORE, and is it now correctly scoped to ONLY the scan arm? And critically — **does the Qdrant arm have ANY dim guard?**

This is the most important finding. Pre-change: `if (emb.dim && qvec.length !== emb.dim) return null;` protected the *only* dense path. Post-change: the Qdrant arm (lines 698-705) runs `denseRankViaQdrant(qvec, ...)` with **no dim check at all**. If ollama's embed model produces a wrong-dim vector (e.g., a model swap to a non-768-d model), the Qdrant POST sends a wrong-length vector. Let me confirm what Qdrant does in that case and whether the guard gap matters.

Let me also run the test suite to confirm green baseline before finalizing.

### Assistant | 2026-06-10T18:15:19.818Z

[tool_use: Bash]

### User | 2026-06-10T18:15:30.672Z

[tool_result]   ...
# Subtest: tryHybridFuse: query-embed failure trips the circuit and returns null (BM25-only)
ok 64 - tryHybridFuse: query-embed failure trips the circuit and returns null (BM25-only)
  ---
  duration_ms: 0.3591
  ...
# Subtest: tryHybridFuse: hybrid=false short-circuits BEFORE any Qdrant/embed work (back-compat)
ok 65 - tryHybridFuse: hybrid=false short-circuits BEFORE any Qdrant/embed work 
... [+342 chars truncated]

### Assistant | 2026-06-10T18:16:53.390Z

All 66 tests pass. Now let me verify the dim-guard gap concern concretely: does the Qdrant arm gate on dim, and what's the failure mode of a wrong-dim vector reaching Qdrant? Also I want to confirm there's NO test asserting the dim guard protects the Qdrant arm.

The tests confirm: there is no test for a wrong-dim query vector hitting the Qdrant arm. Let me confirm the exact behavior of Qdrant on a dim-mismatched vector by checking if the contract claims fail-soft on "Qdrant error body". A 768-vs-N mismatch → Qdrant returns HTTP 400 with `{status:{error:"Wrong input: Vector dimension error..."}}` and NO `result` array → `denseRankViaQdrant` returns null → falls to the scan arm, where the dim guard then catches it. So it degrades correctly via the error-body path, not via an explicit dim check. That's a defensible-but-implicit safety: it relies on Qdrant rejecting the wrong-dim vector rather than silently truncating. I'll log it as P2.

Let me check one more subtle thing — the `source` field difference and whether `denseRankViaQdrant`'s `sim:0` for missing score creates an ordering issue, plus whether there's a dedup gap when Qdrant returns duplicate node_ids.

I have everything I need. Let me compile the findings.

## Code Quality Analysis Report — `tryHybridFuse` / `denseRankViaQdrant` Qdrant rewire (HMEMV09)

### Summary
- Files analyzed: `H:/prism/scripts/lib/memory-index-search-lib.mjs` (target), `…memory-index-search-lib.test.mjs` (66/66 pass), `H:/prism/.claude/hooks/memory-index-precheck-inject.mjs` (consumer)
- The change is well-constructed and the core contract largely holds. I traced every contract clause against the actual code and the live consumer. I could not find a P0 that breaks fleet recall. I found one **P1 exception-escape path**, two genuine **P2** gaps (one of which the prompt specifically flagged — the dim guard), and several P3s.
- Verdict drivers: the lazy-load perf claim is correct; fail-soft is correct on every *anticipated* failure; back-
... [+11529 chars truncated]
