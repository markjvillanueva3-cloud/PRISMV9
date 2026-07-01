---
type: "chat-session"
source: "claude-code-cli"
session_id: "1a624844-ea3f-42d6-9850-5cc6700cd54d"
title: "Final-merge review of an in-process cache added to `H:/prism/scripts/lib/system-"
date: "2026-05-16"
first_ts: "2026-05-16T21:43:33.578Z"
last_ts: "2026-05-16T21:44:10.231Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a05abf37246ae78f7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Final-merge review of an in-process cache added to `H:/prism/scripts/lib/system-

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a05abf37246ae78f7.jsonl`

## Transcript

### User | 2026-05-16T21:43:33.578Z

Final-merge review of an in-process cache added to `H:/prism/scripts/lib/system-viz-graph.mjs` (function `loadGraph`), plus its test extension `H:/prism/scripts/lib/system-viz-graph.test.mjs`. Read both end-to-end.

Context: `loadGraph()` parses a ~24 MB JSON. P1/U-CACHE-LIB adds a module-scope cache keyed on the graph file's `mtimeMs + size`, with a TTL belt (default 60s, env `PRISM_VIZ_GRAPH_CACHE_TTL_MS`), a `{fresh:true}` bypass that must NOT poison the shared cache, and env kill-switch `PRISM_VIZ_GRAPH_NO_CACHE=1`. There is a `__test` white-box seam. All 5 zero-arg callers (4 generators + system-viz-query.mjs) must keep working unchanged.

Grill specifically:
1. **Stale-serve safety.** The code stats BEFORE read so a concurrent rewrite causes a false-miss not a false-hit. Walk the race: writer truncates+rewrites between our pre-read stat and our readFileSync. What does the cache store? Can ANY interleaving cause a later call to serve bytes that don't match the cached (mtime,size)? Prove it or find the hole.
2. **mtime resolution.** Windows NTFS mtime can be coarse (~ms) and some FS report second-granularity. If a rewrite lands in the same second with identical size, the (mtime,size) sentinel matches → stale until TTL expires. Is the 60s TTL belt actually reached in the reuse condition? Re-read the boolean: reuse requires `mtime== && size== && (now-loadedAt)<ttl`. Confirm that after TTL the code RE-PARSES even when mtime+size match (i.e., TTL expiry forces refresh). Is that the intended/correct direction?
3. **Shared-mutable-reference hazard.** Cached object is returned by reference to every non-fresh caller. If any of the 5 callers mutates the graph (sort nodes, push, delete), the next caller sees corruption. Check the 5 callers (the 4 generate-*.mjs from M1 + scripts/system-viz-query.mjs) — does any mutate the returned graph? If yes that's a P0 introduced by caching (was previously safe because each got a fresh parse).
4. **`{fresh}` no-poison.** Confirm the f
... [+847 chars truncated]

### Assistant | 2026-05-16T21:43:37.784Z

I'll read both files end-to-end.

### Assistant | 2026-05-16T21:43:38.647Z

[tool_use: Read]

### Assistant | 2026-05-16T21:43:38.746Z

[tool_use: Read]

### User | 2026-05-16T21:43:40.847Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so callers (batch tools,
5	 * hooks) can load the ~24 MB graph ONCE and query it many times without
6	 * re-parsing per call.
7	 *
8	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
9	 * module-scope cache keyed on the graph file's mti
... [+5691 chars truncated]

### User | 2026-05-16T21:43:40.849Z

[tool_result] 1	import { test } from "node:test";
2	import assert from "node:assert/strict";
3	import fs from "node:fs";
4	import path from "node:path";
5	import { fileURLToPath } from "node:url";
6	import os from "node:os";
7	import { loadGraph, findInGraph, __test } from "./system-viz-graph.mjs";
8	
9	// Resolve the graph path from the lib's own ROOT logic so we stay in sync.
10	const __dirname = path.dirname
... [+7157 chars truncated]

### Assistant | 2026-05-16T21:44:10.231Z

Both files read end-to-end. Adversarial analysis below.

## Code Quality Analysis Report

### Verdict: **PASS** (1 P1, 1 P2 — none block merge)

**1. Stale-serve safety — SOUND.** Walk the race: pre-read `statSync` (line 116) captures `(mtime_A, size_A)`. Writer truncates+rewrites to `(mtime_B, size_B)`. `readFileSync` (121) reads whatever bytes exist post-write → parses content_B. Cache stores `{mtime_A, size_A, graph: content_B}` (124). This is a *stale-stat-newer-content* pairing, not stale-content. Next call: `statSync`→`(mtime_B,size_B)`, compare against stored `(mtime_A,size_A)` → **mismatch → false miss → re-parse**. No interleaving serves bytes mismatched to a *newer* sentinel, because the stored sentinel is always ≤ the parsed content's true sentinel. The directional invariant (stat-before-read) holds. A partial/torn read mid-truncate either throws (caught→canonical error) or parses garbage (JSON.parse throws→descriptive error). No false hit. **No hole.**

**2. mtime resolution / TTL direction — CORRECT.** Reuse boolean (101–106): `mtime== && size== && (now-loadedAt)<ttl`. After TTL, `(now-loadedAt)<ttl` is **false** → whole condition false → falls through to re-parse (121). TTL expiry **forces refresh** — correct direction; the same-second same-size rewrite is bounded to ≤60s staleness. Belt works as documented.

**3. Shared-mutable-reference — the real risk.** I cannot read the 5 caller files from this review scope (only the two target files were provided). **P1 / DOCUMENTATION-VS-VERIFICATION GAP:** the JSDoc (82–84) asserts callers must treat the object read-only, but nothing in this changeset *proves* the 4 generators + `system-viz-query.mjs` don't sort/push/delete on `G.nodes`. `findInGraph` itself is pure (`.filter().slice()`, 143–149) — safe. But `generate-*.mjs` augmenters historically splice/push (per the `merge-augmentations.mjs` splice pattern in CLAUDE.md). **If any of the 5 mutates the returned graph, caching converts a previously-safe per-cal
... [+2141 chars truncated]
