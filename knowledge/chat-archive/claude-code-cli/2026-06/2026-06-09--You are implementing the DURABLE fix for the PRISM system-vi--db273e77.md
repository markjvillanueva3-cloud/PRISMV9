---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are implementing the DURABLE fix for the PRISM system-viz find-cache OOM (si"
date: "2026-06-09"
first_ts: "2026-06-09T23:41:06.111Z"
last_ts: "2026-06-09T23:58:35.348Z"
cwd: "H:\\prism"
messages: 111
user_msgs: 41
assistant_msgs: 70
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_f3afcbf2-96f/agent-ae99946fa8e52321d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# You are implementing the DURABLE fix for the PRISM system-viz find-cache OOM (si

> **claude-code-cli** | 2026-06-09 | 111 msgs (41 user / 70 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_f3afcbf2-96f/agent-ae99946fa8e52321d.jsonl`

## Transcript

### User | 2026-06-09T23:41:06.111Z

You are implementing the DURABLE fix for the PRISM system-viz find-cache OOM (sierra's routed task, authorized by the operator). Work on the REAL repo at H:/prism. ASCII-only (use -- not em-dash). This touches sierra's core lib -- be surgical and preserve all existing behavior except the one intended contract change.

THE BUG (read these FIRST, R8):
- H:/prism/scripts/lib/system-viz-graph.mjs -- read loadFindCache(), readSidecarIfFresh(), regenFindCache(), and the find-cache path resolution. loadFindCache() is the cross-process sidecar reader for findInGraph(). Its CURRENT stale/absent behavior: when the find-cache sidecar (state/shared/system-viz/find-cache.json, ~57MB) is STALE or ABSENT, it falls through to loadGraph() which MATERIALIZES the ~643MB system-graph.json into V8 heap -> OOM. This is called inside PreToolUse/UserPromptSubmit hooks with ~1500ms budgets.
- H:/prism/scripts/regen-find-cache.mjs -- the offline regenerator. It self-re-execs with a raised heap (24GB) and rebuilds the sidecar in ~8s. This is the ONLY safe way to rebuild (the build inherently takes >1.5s, so it can NEVER run inside the hook hot path).
- H:/prism/scripts/lib/graph-stream-degree.mjs -- a streaming graph reader (callback-per-element, never materializes) -- proven, but even streaming the 643MB graph takes ~2.8s, still > the 1500ms hook budget. So streaming-in-the-hot-path is ALSO not viable.

THE FIX (serve-stale + detached debounced regen -- degrade-don't-die):
Change loadFindCache() ONLY in its stale/absent fallback path:
1. If a sidecar file EXISTS but is stale: return the STALE sidecar's parsed nodes (with an added `stale:true` flag on the returned object) INSTEAD of calling loadGraph(). A slightly-stale find projection is ~99% accurate for SEARCH -- vastly better than an OOM. AND trigger a detached, debounced regen (step 3).
2. If NO sidecar exists at all (cold): do NOT call loadGraph() in this hot path. Trigger the detached debounced regen and return a fail-soft empty result
... [+2985 chars truncated]

### Assistant | 2026-06-09T23:41:10.850Z

I'll start by reading the target files to understand the current implementation (R8: read before write).

### Assistant | 2026-06-09T23:41:11.307Z

[tool_use: Read]

### User | 2026-06-09T23:41:15.599Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+25962 chars truncated]

### Assistant | 2026-06-09T23:41:20.406Z

Now let me look at the regen-find-cache.mjs and the existing test file, plus the regenerator details.

### Assistant | 2026-06-09T23:41:20.845Z

[tool_use: Read]

### Assistant | 2026-06-09T23:41:21.347Z

[tool_use: Glob]

### User | 2026-06-09T23:41:27.202Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-find-cache — offline (proactive) generator for the find-cache sidecar.
4	 *
5	 * The find-cache (state/shared/system-viz/find-cache.json) is the slim per-node
6	 * projection behind findInGraph() — read by viz-first-redirect.mjs + the four
7	 * pre-*-graph-inject hooks (~1060 `find` calls/day from fresh node subprocesses).
8	 * It used to be built ONLY lazily
... [+4059 chars truncated]

### User | 2026-06-09T23:41:44.542Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T23:41:47.402Z

Let me find the existing test files for this lib directly.

### Assistant | 2026-06-09T23:41:48.126Z

[tool_use: Bash]

### User | 2026-06-09T23:41:59.099Z

[tool_result] system-viz-graph.mjs
system-viz-graph.test.mjs

### Assistant | 2026-06-09T23:42:02.467Z

There's an existing `system-viz-graph.test.mjs`. The task says to use a file named `system-viz-graph-findcache.test.mjs` OR extend the existing one. Let me read the existing test file to understand the test patterns and DI conventions already in use.

### Assistant | 2026-06-09T23:42:02.669Z

[tool_use: Read]

### User | 2026-06-09T23:42:06.109Z

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

### Assistant | 2026-06-09T23:42:09.843Z

Now I understand the full picture. Let me check the callers of `loadFindCache` to verify the return-shape contract and ensure I don't break them (R8 — read the callers).

### Assistant | 2026-06-09T23:42:10.901Z

[tool_use: Grep]

### User | 2026-06-09T23:42:25.228Z

[tool_result] knowledge\memories\reference\reference_systemviz_find_oom_2026_06_09.md:3:[Omitted long matching line]
knowledge\memories\reference\reference_systemviz_find_oom_2026_06_09.md:18:`loadFindCache()` (the 55-57MB sidecar) then `findInGraph()`. The OOM is a
knowledge\memories\reference\reference_systemviz_find_oom_2026_06_09.md:19:FALLBACK: `loadFindCache` is documented "if [sidecar] is stale or absent
... [+1893 chars truncated]

### Assistant | 2026-06-09T23:42:27.945Z

Let me read the only real caller — `system-viz-query.mjs` around line 64 — to confirm exactly how the return shape is consumed.

### Assistant | 2026-06-09T23:42:28.587Z

[tool_use: Read]

### User | 2026-06-09T23:42:34.826Z

[tool_result] 40	}
41	
42	// FIND SHORT-CIRCUIT — viz-first-redirect.mjs fires ~1060×/day calling this
43	// subcommand from fresh node subprocesses. The full loadGraph() parse costs
44	// ~2s post-cable-swap on the 370 MB system-graph.json; loadFindCache() reads
45	// a ~2 MB projected sidecar that's ~170× smaller. Short-circuiting BEFORE
46	// the (eager) loadGraph below keeps every other cmd's behavior uncha
... [+2363 chars truncated]

### Assistant | 2026-06-09T23:42:47.482Z

I now have full understanding. The caller does `g = loadFindCache()` then `findInGraph(g, q, ...)`. `findInGraph` does `G.nodes.filter(...)`. So as long as the return shape always has a `nodes` array, an empty `nodes:[]` returns 0 hits gracefully — no crash. The extra `stale`/`cold` flags are harmless to this caller.

Let me verify the planning with a checklist, then implement.

**Plan (R10 checkpoint):**
- Modify `loadFindCache()` ONLY in its fallback path (after `readSidecarIfFresh()` returns null).
  - Add optional `opts` DI seam: `{ fresh, _spawnFn, _loadGraphFn, _now, _readSidecar }` — defaulting to real impls, no call-site change.
  - Distinguish stale (sidecar file EXISTS but stale) vs cold (no sidecar file at all). `readSidecarIfFresh()` returns null for BOTH — so I need a separate existence check to disambiguate.
  - Stale: read the stale sidecar's parsed nodes, return `{nodes, stale:true}`, trigger debounced detached regen.
  - Cold: return `{nodes:[], stale:true, cold:true}`, trigger debounced regen, NEVER call loadGraph.
  - Fresh-hit path: unchanged byte-for-byte.
- Add `spawnDebouncedRegen()` helper: lockfile mtime debounce (60s), detached spawn, fail-safe.
- Update the contract comment near line 12.
- Add tests with DI seams; run.

One subtlety: when `fresh:true` or `findCacheDisabled()`, the current code intentionally does a full parse+repopulate. The task says change ONLY the stale/absent fallback path. The `fresh:true`/disabled paths are explicit caller opt-ins (e.g. `regenFindCache` calls `loadGraph({fresh:true})`, and the regenerator itself wants the real parse). I must preserve those — they are NOT the hook hot path. So my serve-stale logic applies only when NOT fresh and NOT disabled (i.e., the normal hook path that today falls through to loadGraph on stale/absent).

Let me read a stale sidecar's raw nodes — I need a helper that reads the sidecar's parsed nodes regardless of freshness (for the stale-serve case). Let me create the tasks and impl
... [+6 chars truncated]

### Assistant | 2026-06-09T23:42:49.410Z

[tool_use: TaskCreate]

### User | 2026-06-09T23:42:50.949Z

[tool_result] Task #33 created successfully: Implement serve-stale + detached debounced regen in loadFindCache

### Assistant | 2026-06-09T23:42:51.286Z

[tool_use: TaskCreate]

### Assistant | 2026-06-09T23:42:52.583Z

[tool_use: TaskCreate]

### User | 2026-06-09T23:42:57.965Z

[tool_result] Task #34 created successfully: Write hermetic tests for serve-stale loadFindCache

### User | 2026-06-09T23:42:58.880Z

[tool_result] Task #35 created successfully: Run new + existing tests, confirm no regression

### Assistant | 2026-06-09T23:43:01.133Z

First let me run the existing test to get the BEFORE baseline.

### Assistant | 2026-06-09T23:43:01.603Z

[tool_use: TaskUpdate]

### Assistant | 2026-06-09T23:43:02.600Z

[tool_use: Bash]

### User | 2026-06-09T23:43:02.743Z

[tool_result] Updated task #33 status

### User | 2026-06-09T23:45:24.990Z

[tool_result]     descriptiveError (file:///H:/PRISM/scripts/lib/system-viz-graph.mjs:85:10)
    readAndParse (file:///H:/PRISM/scripts/lib/system-viz-graph.mjs:123:28)
    loadGraph (file:///H:/PRISM/scripts/lib/system-viz-graph.mjs:179:17)
    TestContext.<anonymous> (file:///H:/PRISM/scripts/lib/system-viz-graph.test.mjs:150:17)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/t
... [+396 chars truncated]

### Assistant | 2026-06-09T23:45:28.806Z

The existing test has 9 failures BEFORE my change — but these are the real-graph tests hitting the live 643MB graph (the OOM/string-cap bug itself). Let me confirm the failure cause to establish a clean before/after.

### Assistant | 2026-06-09T23:45:29.473Z

[tool_use: Bash]

### User | 2026-06-09T23:47:33.895Z

[tool_result] not ok 1 - loadGraph returns graph with nodes array >1000
not ok 2 - findInGraph kienzle returns ≥1 real match
not ok 3 - findInGraph is pure (idempotent)
not ok 4 - findInGraph respects limit
ok 5 - findInGraph hermetic: kienzle query returns ≥1 hit matching /kienzle/i on label+id+info
ok 6 - findInGraph hermetic: limit=1 on 'engine' query returns exactly 1 result
ok 7 - findInGraph hermetic: pur
... [+654 chars truncated]

### Assistant | 2026-06-09T23:47:39.422Z

Confirmed: the 9 failures are exactly the `{ skip: !HAVE_GRAPH }` real-graph tests (1-4, 10-14) — they're NOT skipped because the graph file EXISTS, but loading the live 643MB graph fails (the exact V8 string-cap/OOM this whole feature works around). The 5 hermetic tests (5-9) all PASS. These 9 failures are pre-existing, unrelated to my change, and caused by the live graph being too large to materialize — which is precisely the bug being mitigated. My change does NOT touch `loadGraph` or these tests.

Now let me implement the fix. First, the contract comment near line 12:

### Assistant | 2026-06-09T23:47:49.929Z

[tool_use: Edit]

### User | 2026-06-09T23:47:54.919Z

[tool_result] [ascii-guard] Blocked: smart-substitution / non-ASCII chars in a code file (H:\prism\scripts\lib\system-viz-graph.mjs). These break PS 5.1 decoding, parsers, diffs, and grep:
  - "—" (em dash) at line 8:23 -> use --
Fix: replace each with its ASCII form above, then retry. Legit case? PRISM_ASCII_GUARD_BYPASS=1 (logged). Markdown/docs are never blocked.

### Assistant | 2026-06-09T23:47:58.522Z

The ASCII guard caught my em-dash. The task explicitly requires ASCII-only (use `--` not em-dash). The existing file already has em-dashes in surrounding lines, but my NEW text must be ASCII. Let me replace all em-dashes in my new block with `--`.

### system

... [31 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-09T23:51:48.951Z

The debounce-expiry test (4b) fails. Root cause: `spawnDebouncedRegen` writes the lock with `fs.writeFileSync(lockPath, String(now()))`, but the debounce check uses the lock file's **actual filesystem mtime** (`lst.mtimeMs`), NOT the injected `now()`. So in call #2 at `now()=win+1`, the lock's real mtime is the wall-clock time from call #1 (a few ms ago), and `now() - realMtime` is a huge number (win+1 minus a 2026 epoch ms = negative actually). 

This is a real DI weakness: the debounce reads filesystem mtime but compares against injected `now()`. The two clocks don't agree under injection. The fix that keeps production behavior correct AND makes the test hermetic: write the injected `now()` value INTO the lock file as content, and read that content for the debounce comparison (falling back to mtime only if content is unparseable). This makes the lock's timestamp authoritative and clock-consistent.

Actually, simpler and more robust: the lock content already IS `String(now())`. Let me make the debounce read the lock's stored timestamp from its content, not the fs mtime. This is the cleaner design — the timestamp source matches the timestamp writer. Let me update `spawnDebouncedRegen`.

### Assistant | 2026-06-09T23:51:58.823Z

[tool_use: Edit]

### User | 2026-06-09T23:52:09.135Z

[tool_result] The file H:/prism/scripts/lib/system-viz-graph.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-09T23:52:11.739Z

Now re-run the new test file.

### Assistant | 2026-06-09T23:52:13.015Z

[tool_use: Bash]

### User | 2026-06-09T23:52:24.569Z

[tool_result] ok 1 - fresh sidecar -> plain cache hit (no stale flag, no regen spawn)
ok 2 - stale sidecar -> serves stale nodes (stale:true) + spawns regen once, never loadGraph
ok 3 - cold (no sidecar) -> fail-soft empty {stale,cold} + spawn once + loadGraph NEVER called
ok 4 - debounce: a fresh regen lock (<60s) suppresses a second spawn
ok 5 - debounce expiry: a lock older than the window allows a new spawn
... [+327 chars truncated]

### Assistant | 2026-06-09T23:52:31.195Z

All 9 pass. Now let me confirm the existing test suite has no NEW regression from my change. The 9 pre-existing failures are real-graph OOM tests (graph file present but too large). Let me re-run it, but to avoid wasting ~2 minutes loading the 643MB graph again, I'll point it at a temp fixture graph via `PRISM_VIZ_GRAPH_PATH` so the previously-failing real-graph tests can actually run — this proves my change didn't break the lib logic. But the existing test computes `HAVE_GRAPH` from the hardcoded default path, not the env. So those tests run against the real graph regardless.

The honest before/after: BEFORE my change = 5 pass / 9 fail. The 9 failures are the live-graph-OOM tests. My change does not touch `loadGraph`, `readAndParse`, `findInGraph`, caching, or any code those 9 tests exercise. Let me re-run to confirm AFTER is identical (5 pass / 9 fail, same tests).

### Assistant | 2026-06-09T23:52:32.107Z

[tool_use: Bash]

### User | 2026-06-09T23:55:10.409Z

[tool_result] not ok 1 - loadGraph returns graph with nodes array >1000
not ok 2 - findInGraph kienzle returns ≥1 real match
not ok 3 - findInGraph is pure (idempotent)
not ok 4 - findInGraph respects limit
ok 5 - findInGraph hermetic: kienzle query returns ≥1 hit matching /kienzle/i on label+id+info
ok 6 - findInGraph hermetic: limit=1 on 'engine' query returns exactly 1 result
ok 7 - findInGraph hermetic: pur
... [+665 chars truncated]

### Assistant | 2026-06-09T23:55:16.198Z

Identical before/after: 5 pass / 9 fail, the exact same 9 tests (1-4, 10-14 — all the live-643MB-graph tests). No regression introduced by my change. To make the before/after airtight, let me prove the 9 failures are graph-OOM (not my change) by confirming the failure mode is the descriptive read/parse error from loading the live graph — which the earlier baseline run already showed (`readAndParse -> loadGraph -> descriptiveError`). That's the V8 string-cap on the 643MB graph, fully independent of `loadFindCache`.

Let me also do a final ASCII-only verification on both files I touched (the task mandates ASCII-only for my additions).

### Assistant | 2026-06-09T23:55:18.887Z

[tool_use: Bash]

### User | 2026-06-09T23:55:31.711Z

[tool_result] scripts/lib/system-viz-graph.mjs:2:  * system-viz-graph <U+2014> load-once + in-process-cache lib for the system-viz graph.
scripts/lib/system-viz-graph.mjs:10:  * (no 24 MB re-parse). Invalidation is conservative <U+2014> stat is taken
scripts/lib/system-viz-graph.mjs:29:  * SCOPE <U+2014> who actually benefits (be honest, per /forge-audit-v2 reviewer):
scripts/lib/system-viz-graph.mjs:31:  * CLI
... [+2024 chars truncated]

### Assistant | 2026-06-09T23:55:40.220Z

My new test file is 100% ASCII (0 non-ASCII lines). The 58 non-ASCII lines in `system-viz-graph.mjs` are all PRE-EXISTING em-dashes/arrows in the original file's docs (lines 2, 10, 29... all far from my additions). The ASCII guard already blocked and I fixed my own contribution — every line I added is ASCII (`--`, `->`). Let me verify none of MY added lines are in that non-ASCII list by checking the line ranges of my additions (header ~14-30, helpers ~378-480, __test ~545-550). All 20 shown are pre-existing original-author lines. Let me confirm my specific added blocks are clean.

### Assistant | 2026-06-09T23:55:42.914Z

[tool_use: Bash]

### User | 2026-06-09T23:55:56.576Z

[tool_result] NON-ASCII in MY block @29:  * SCOPE — who actually benefits (be honest, per /forge-audit-v2 reviewer):
NON-ASCII in MY block @541:  * regenFindCache — OFFLINE (proactive) generator for the find-cache sidecar.
NON-ASCII in MY block @545:  * stale/absent sidecar — and that rebuild pays the FULL graph cold-parse
NON-ASCII in MY block @550:  * STRATEGY: do the same stat → parse → project → atomic-writ
... [+160 chars truncated]

### Assistant | 2026-06-09T23:56:04.724Z

Those 5 hits (@29, @541, @545, @550, @555) are all PRE-EXISTING original-author lines that just happen to fall inside my rough range estimates — line 29 is the original `SCOPE` doc comment, and 541-555 are the original `regenFindCache` doc block (which I did NOT modify). My actual additions (the CONTRACT AMENDMENT header block, the three helpers, the rewritten `loadFindCache` body, and the `__test` seams) are all ASCII. The em-dash guard already enforced this when it blocked my first edit attempt. 

Let me do a final precise check: grep my actual new identifiers' surrounding lines for non-ASCII to be definitive.

### Assistant | 2026-06-09T23:56:08.078Z

[tool_use: Bash]

### User | 2026-06-09T23:56:19.674Z

[tool_result] marker-line non-ASCII: 0

### Assistant | 2026-06-09T23:56:23.890Z

All my contributed code is ASCII-clean. Let me mark the final task complete and update the doc-correction in the `loadFindCache` JSDoc return-shape note (the existing JSDoc at line ~225 still says "ALWAYS `{nodes: Array}`" — I should update it to reflect the new stale/cold flags so the contract doc isn't a lie, per R12).

### Assistant | 2026-06-09T23:56:24.759Z

[tool_use: Read]

### User | 2026-06-09T23:56:29.670Z

[tool_result] 238	 * is stale or absent we fall through to loadGraph() and atomically write a
239	 * fresh sidecar.
240	 *
241	 * RETURN SHAPE: ALWAYS `{nodes: Array<slim-node>}`. SYMMETRIC across cache-hit
242	 * and cache-miss paths — both project to the same minimal shape. The function
243	 * is for `findInGraph` ONLY. DO NOT USE if you need `graph.edges`,
244	 * `graph.meta`, `graph.schemaVersion`, `graph.f
... [+1295 chars truncated]

### Assistant | 2026-06-09T23:56:33.845Z

I'll update the RETURN SHAPE JSDoc block to reflect the new stale/cold flags (R12 — keep the doc honest). I'll also fix lines 237-239 which describe the old "fall through to loadGraph" behavior. Let me update both, using ASCII for any new text.

### Assistant | 2026-06-09T23:56:34.716Z

[tool_use: Read]

### User | 2026-06-09T23:56:36.434Z

[tool_result] 227	 * loadFindCache — cross-process sidecar optimized for findInGraph().
228	 *
229	 * PROBLEM SOLVED: hooks like viz-first-redirect fire 1000+ times/day and each
230	 * spawns a fresh `node` subprocess that calls loadGraph() once and exits.
231	 * The in-process _cache above is useless for them — each subprocess pays the
232	 * full 370MB parse cost (≈2s post-cable-swap, ≈9s on a slow USB-2.0 po
... [+436 chars truncated]

### Assistant | 2026-06-09T23:56:52.399Z

[tool_use: Edit]

### User | 2026-06-09T23:56:59.198Z

[tool_result] The file H:/prism/scripts/lib/system-viz-graph.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-09T23:57:03.402Z

Now let me also update the `@returns` annotation line for accuracy and verify the module still loads + tests still pass after the JSDoc edits (JSDoc-only, but confirm no accidental syntax break).

### Assistant | 2026-06-09T23:57:04.169Z

[tool_use: Read]

### User | 2026-06-09T23:57:08.199Z

[tool_result] 278	 *   PRISM_VIZ_FIND_CACHE_DISABLE=1  → bypass + do not populate
279	 *   PRISM_VIZ_FIND_CACHE_PATH=<p>   → override sidecar path (read at call time)
280	 *
281	 * @param {object} [opts]
282	 * @param {boolean} [opts.fresh=false] - bypass sidecar entirely; do not write.
283	 * @returns {{nodes: Array}} ALWAYS this shape. See RETURN SHAPE above.
284	 */
285	

### Assistant | 2026-06-09T23:57:20.587Z

[tool_use: Edit]

### User | 2026-06-09T23:57:27.898Z

[tool_result] The file H:/prism/scripts/lib/system-viz-graph.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-09T23:57:37.030Z

Now a final confirmation run: module loads + both test files. Let me run the new test (fast, hermetic) and a module-load check together.

### Assistant | 2026-06-09T23:57:38.866Z

[tool_use: Bash]

### User | 2026-06-09T23:57:45.849Z

[tool_result] MODULE LOAD OK
# tests 9
# pass 9
# fail 0
# skipped 0

### Assistant | 2026-06-09T23:57:50.527Z

All green. Let me update task status and verify the live find path still works end-to-end against the real (stale) sidecar — a quick smoke test through the actual CLI to prove the serve-stale path doesn't OOM and returns results.

### Assistant | 2026-06-09T23:57:50.999Z

[tool_use: TaskUpdate]

### Assistant | 2026-06-09T23:57:51.978Z

[tool_use: Bash]

### User | 2026-06-09T23:57:52.660Z

[tool_result] Task not found

### User | 2026-06-09T23:58:02.390Z

[tool_result] Found 30 node(s) matching "kienzle":
  L6/core  core.physics                 Physics Constants (3) [docs:16]
  L10/architecture  vault.wiki.architecture.actions.adaptivecontrol.calibration-kienzle calibration-kienzle [docs:16]
  L10/architecture  vault.wiki.architecture.actions.calc.kienzle-coefficients kienzle-coefficients [docs:16]
  L10/architecture  vault.wiki.architecture.actions.calc.kienzle
... [+371 chars truncated]

### Assistant | 2026-06-09T23:58:35.348Z

Live smoke passes: the `find` CLI returned 30 hits under a tight 512MB heap cap (would have OOM'd before the fix when the sidecar was stale/absent), EXIT=0. The current sidecar is fresh so this is the fresh-hit path — but it proves the fast path is intact under tight heap. The serve-stale/cold paths are fully proven by the 9 hermetic tests with the exploding-loadGraph seam.

The earlier TaskUpdate "Task not found" is benign (task #35 was already marked completed in the prior call). All three tasks are done.

Here is my report.

---

DURABLE FIX COMPLETE -- system-viz find-cache serve-stale-then-async-heal

FILES CHANGED

1. H:/prism/scripts/lib/system-viz-graph.mjs (surgical -- fallback path + new helper + contract comment only)
   - Added import: `import { spawn } from "node:child_process";`
   - File-header CONTRACT AMENDMENT comment (after the original line-12 "never serve stale bytes" note): documents that loadGraph's invariant still holds, but loadFindCache's fallback now serves-stale-then-async-heals instead of OOMing.
   - New module-scope helpers (inserted just before `loadFindCache`):
     - `regenLockPath()` -- lock path beside the sidecar (`<find-cache-dir>/.find-cache-regen.lock`).
     - `const REGEN_DEBOUNCE_MS = 60_000` -- 60s debounce window.
     - `readSidecarNodesUnchecked()` -- parses the sidecar nodes WITHOUT a freshness gate; returns the nodes array (stale-serveable) or null (absent/corrupt/schema-mismatch = cold). Never touches the graph.
     - `spawnDebouncedRegen({now, spawnFn})` -- lockfile-debounced, detached (`{detached:true, stdio:'ignore'}` + `unref()`) spawn of `scripts/regen-find-cache.mjs`. Fully fail-safe (every step wrapped; never throws). Does NOT import regen-find-cache -- spawns it as a subprocess so the 24GB heap re-exec stays out-of-process.
   - `loadFindCache(opts, seams)` rewritten: fresh-hit fast path unchanged (byte-for-byte: `if (sidecar) return { nodes: sidecar.nodes }`). New stale/absent fallback (only when NOT fresh 
... [+3506 chars truncated]
