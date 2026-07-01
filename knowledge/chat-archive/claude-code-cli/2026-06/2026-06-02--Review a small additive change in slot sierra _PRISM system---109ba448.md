---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Review a small additive change in slot sierra (PRISM system-viz): an idempotence"
date: "2026-06-02"
first_ts: "2026-06-02T16:01:20.561Z"
last_ts: "2026-06-02T16:05:29.008Z"
cwd: "H:\\prism-slot-sierra"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-af13014cf136c0960.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a small additive change in slot sierra (PRISM system-viz): an idempotence

> **claude-code-cli** | 2026-06-02 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-af13014cf136c0960.jsonl`

## Transcript

### User | 2026-06-02T16:01:20.561Z

Review a small additive change in slot sierra (PRISM system-viz): an idempotence FAST-PATH added to `regenFindCache()` in `H:/prism/scripts/lib/system-viz-graph.mjs`. The function eagerly regenerates the find-cache sidecar (parse 685MB graph → project → atomic write). The new fast-path: BEFORE the expensive `loadGraph({fresh:true})`, call `readSidecarIfFresh()`; if it returns non-null (sidecar already fresh vs the current graph stat), return `{ok:true, reason:"already-fresh"}` and SKIP the parse. Test 6/6 pass.

Read END-TO-END `regenFindCache` + `readSidecarIfFresh` + `writeSidecarAtomic` + `loadFindCache` in that file. Verify CORRECTNESS:
1. **Does the fast-path skip ONLY when genuinely fresh?** `readSidecarIfFresh` re-stats the live graph and compares sidecar.sourceMtimeMs===graph.mtimeMs && sourceSize===graph.size — confirm a stale/absent sidecar returns null → the fast-path does NOT trigger → full regen proceeds.
2. **Does it break the WIRED regen-viz semantics?** regen-viz calls regen-find-cache as a post-merge step AFTER the graph was rewritten (merge/seed-ghost), so the graph mtime changed → the prior sidecar is stale → readSidecarIfFresh returns null → NOT skipped → regenerates. Confirm the fast-path can NOT cause regen-viz to serve a stale sidecar after a real graph change.
3. **Ordering:** the fast-path is placed AFTER the cache-disabled + graph-missing guards (so a missing graph still returns graph-missing, not a false already-fresh). Confirm.
4. **Return-shape consistency:** the already-fresh return has the same {ok,path,nodeCount,bytes,sourceMtimeMs} shape as the success return, plus reason:"already-fresh". Confirm no caller (regen-find-cache.mjs CLI) breaks on the reason field (it treats ok:true → exit 0 regardless of reason).

Report P0/P1. Try to construct a case where the fast-path serves a STALE sidecar (says already-fresh when the graph actually changed). Grade PASS/FAIL with a one-paragraph rationale. Do NOT load system-graph.json (695MB). Do NO
... [+16 chars truncated]

### Assistant | 2026-06-02T16:01:42.185Z

I'll review this additive change. Let me read the relevant functions end-to-end in the target file.

### Assistant | 2026-06-02T16:01:43.488Z

[tool_use: Grep]

### User | 2026-06-02T16:01:53.389Z

[tool_result] 53:// internal loadGraph / readSidecarIfFresh / writeSidecarAtomic in this file)
211: * loadFindCache — cross-process sidecar optimized for findInGraph().
290:function readSidecarIfFresh() {
312:function writeSidecarAtomic(graph, sourceStat) {
316:  // recording a fresh stat against stale nodes (would make readSidecarIfFresh
350:export function loadFindCache({ fresh = false } = {}) {
352:    const
... [+1018 chars truncated]

### Assistant | 2026-06-02T16:01:58.697Z

Let me read the full relevant sections of the file.

### Assistant | 2026-06-02T16:01:59.164Z

[tool_use: Read]

### User | 2026-06-02T16:02:07.156Z

[tool_result] 200	  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
201	  return G.nodes
202	    .filter(n =>
203	      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
204	        .toLowerCase()
205	        .includes(q)
206	    )
207	    .slice(0, limit);
208	}
209	
210	/**
211	 * loadFindCache — cross-process sidecar optimized for findInGraph().
212	 *
213	 * 
... [+13518 chars truncated]

### Assistant | 2026-06-02T16:02:11.443Z

I have read all four functions end-to-end plus the surrounding context. Let me also confirm `graphPath()` and check the CLI caller `regen-find-cache.mjs` to verify return-shape consumption.

### Assistant | 2026-06-02T16:02:12.499Z

[tool_use: Grep]

### User | 2026-06-02T16:02:24.934Z

[tool_result] 48:function graphPath() {

### Assistant | 2026-06-02T16:02:28.154Z

[tool_use: Read]

### User | 2026-06-02T16:02:47.086Z

[tool_result] 40	const ROOT = path.resolve(__dirname, "..", "..");
41	const DEFAULT_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
42	// Read at CALL time (not module-eval) so tests + future tooling can point the
43	// lib at a temp fixture without touching the live ~370 MB production graph.
44	// REGRESSION DEFENSE: a prior test that hard-coded the production path
45	// accident
... [+3530 chars truncated]

### Assistant | 2026-06-02T16:02:50.627Z

Now let me verify the CLI caller `regen-find-cache.mjs` handles the `ok:true` / `reason` shape correctly.

### Assistant | 2026-06-02T16:02:50.781Z

[tool_use: Glob]

### User | 2026-06-02T16:03:06.622Z

[tool_result] No files found

### Assistant | 2026-06-02T16:03:10.753Z

[tool_use: Grep]

### User | 2026-06-02T16:03:32.890Z

[tool_result] Found 3 files
H:\prism\scripts\lib\system-viz-graph.mjs
H:\prism\scripts\lib\__tests__\regen-find-cache.test.mjs
H:\prism\scripts\regen-find-cache.mjs

### Assistant | 2026-06-02T16:03:35.770Z

[tool_use: Read]

### User | 2026-06-02T16:04:01.874Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-find-cache — offline (proactive) generator for the find-cache sidecar.
4	 *
5	 * The find-cache (state/shared/system-viz/find-cache.json) is the slim per-node
6	 * projection behind findInGraph() — read by viz-first-redirect.mjs + the four
7	 * pre-*-graph-inject hooks (~1060 `find` calls/day from fresh node subprocesses).
8	 * It used to be built ONLY lazily
... [+3929 chars truncated]

### Assistant | 2026-06-02T16:04:05.789Z

I have everything needed. Let me verify the test file to confirm the 6/6 includes a genuine already-fresh test (R9 — does the test fail when business logic breaks).

### Assistant | 2026-06-02T16:04:06.118Z

[tool_use: Read]

### User | 2026-06-02T16:04:45.733Z

[tool_result] 1	// regen-find-cache.test.mjs — tests for regenFindCache (offline find-cache writer).
2	//
3	// HERMETIC BY CONSTRUCTION: every test writes its graph stub to a tmp file and
4	// sets PRISM_VIZ_GRAPH_PATH + PRISM_VIZ_FIND_CACHE_PATH to tmp paths. The live
5	// ~685MB production graph at H:/prism/state/shared/system-viz/system-graph.json
6	// is NEVER opened, moved, or unlinked by any test here. (S
... [+9707 chars truncated]

### Assistant | 2026-06-02T16:05:29.008Z

I have everything needed for a full correctness verdict. I read `regenFindCache`, `readSidecarIfFresh`, `writeSidecarAtomic`, `loadFindCache`, `graphPath`, the CLI caller, and the test file end-to-end. The 695MB graph was never opened.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 3 (`system-viz-graph.mjs`, `regen-find-cache.mjs`, `regen-find-cache.test.mjs`)
- Issues Found: 0 P0, 0 P1 (2 P2/P3 observations)
- Verdict: **PASS**

### The four correctness questions

**1. Does the fast-path skip ONLY when genuinely fresh? — CONFIRMED.**
`regenFindCache` (lines 413-418) gates the skip entirely on `readSidecarIfFresh()` returning non-null. That function (lines 290-309) is strict: it returns `null` on (a) absent sidecar (`readFileSync` catch, 294), (b) corrupt JSON (297), (c) schema mismatch — missing `nodes`/`sourceMtimeMs`/`sourceSize` (298-302), (d) absent graph (`statSync` catch, 305), and critically (e) any drift via `st.mtimeMs !== sidecar.sourceMtimeMs || st.size !== sidecar.sourceSize` (306-308). The freshness re-stats the *live* graph at call time (`graphPath()` honors `PRISM_VIZ_GRAPH_PATH`). A stale or absent sidecar → `null` → `if (existing)` is false → control falls through to `loadGraph({fresh:true})` + full regen. The skip cannot fire on anything but a byte-stat-matched sidecar. The idempotence test (lines 166-181) proves an mtime move flips `readSidecarIfFresh` to `null`, and the fast-path test (188-205) proves the first call never short-circuits.

**2. Does it break WIRED regen-viz semantics? — NO. Cannot serve a stale sidecar after a real graph change.**
regen-viz invokes this as a post-merge step *after* the graph was rewritten (merge/seed-ghost). A real content write changes the graph's mtime (and almost always size). On the post-merge `regenFindCache` call, `readSidecarIfFresh` re-stats the just-rewritten graph; the prior sidecar carries the *old* `sourceMtimeMs`/`sourceSize`, so the stat comparison fail
... [+5430 chars truncated]
