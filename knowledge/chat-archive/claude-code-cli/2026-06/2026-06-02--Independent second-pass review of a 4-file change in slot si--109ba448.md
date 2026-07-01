---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Independent second-pass review of a 4-file change in slot sierra (PRISM, system-"
date: "2026-06-02"
first_ts: "2026-06-02T14:27:54.839Z"
last_ts: "2026-06-02T14:32:23.093Z"
cwd: "H:\\prism-slot-sierra"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a657e0773e4550142.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Independent second-pass review of a 4-file change in slot sierra (PRISM, system-

> **claude-code-cli** | 2026-06-02 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a657e0773e4550142.jsonl`

## Transcript

### User | 2026-06-02T14:27:54.839Z

Independent second-pass review of a 4-file change in slot sierra (PRISM, system-viz). The change adds an OFFLINE generator for the find-cache sidecar to fix a real defect: find-cache was built ONLY lazily by the first `find` cache-miss after a graph regen, paying a 695MB graph cold-parse inside a ~1500ms hook budget → timeout → node-context inject silently failed fleet-wide. (Measured: warm 56MB sidecar parse = 540ms, within budget; the cold 695MB fallthrough was the failure.) The new generator runs eagerly as a regen-viz post-merge stage so the sidecar stays fresh.

Reviewer A (code-analyzer) already PASSED the producer correctness + confirmed the byte-identical-drop-in claim + OOM-safe streaming. YOUR weighting (do NOT assume A caught these): TEST INTEGRITY (R9 — tests verify intent, not tautology), integration coupling, convention conformance, hidden regressions.

Read END-TO-END:
1. `H:/prism/scripts/lib/__tests__/regen-find-cache.test.mjs` — 5 tests, all currently PASS. For EACH: would it FAIL if the logic regressed, or is it a tautology/stub? Scrutinize test 2 ("drop-in") hardest — does it ACTUALLY prove the offline sidecar is consumed as a FRESH cache-hit by the lazy `loadFindCache` (would it fail if regenFindCache wrote an incompatible/stale format)? Is the hermetic PRISM_VIZ_GRAPH_PATH fence truly preventing any touch of the live 685MB production graph? Name any missing failure mode that MATTERS.
2. `H:/prism/scripts/regen-find-cache.mjs` — the CLI, now with a heap self-re-exec (reExecWithHeapIfNeeded, mirroring build-graph-index.mjs). Verify the re-exec: no infinite loop (PRISM_REGEN_FIND_CACHE_NO_REEXEC guard + execArgv heap-flag check), env/args forwarding, exit-status propagation. Verify exit codes (0=written or cache-disabled; 1=fail) and the canonical-throw fail-loud.
3. `H:/prism/scripts/lib/system-viz-graph.mjs` `regenFindCache` export + `H:/prism/scripts/regen-viz.mjs` find-cache stage — check naming/idiom conformance vs the sibling sidecar stages 
... [+371 chars truncated]

### Assistant | 2026-06-02T14:28:17.951Z

I'll review these 4 files end-to-end with my weighting on test integrity, integration coupling, convention conformance, and hidden regressions.

### Assistant | 2026-06-02T14:28:18.887Z

[tool_use: Read]

### Assistant | 2026-06-02T14:28:18.918Z

[tool_use: Read]

### User | 2026-06-02T14:29:21.643Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-find-cache — offline (proactive) generator for the find-cache sidecar.
4	 *
5	 * The find-cache (state/shared/system-viz/find-cache.json) is the slim per-node
6	 * projection behind findInGraph() — read by viz-first-redirect.mjs + the four
7	 * pre-*-graph-inject hooks (~1060 `find` calls/day from fresh node subprocesses).
8	 * It used to be built ONLY lazily
... [+3929 chars truncated]

### User | 2026-06-02T14:29:21.657Z

[tool_result] 1	// regen-find-cache.test.mjs — tests for regenFindCache (offline find-cache writer).
2	//
3	// HERMETIC BY CONSTRUCTION: every test writes its graph stub to a tmp file and
4	// sets PRISM_VIZ_GRAPH_PATH + PRISM_VIZ_FIND_CACHE_PATH to tmp paths. The live
5	// ~685MB production graph at H:/prism/state/shared/system-viz/system-graph.json
6	// is NEVER opened, moved, or unlinked by any test here. (S
... [+8304 chars truncated]

### Assistant | 2026-06-02T14:29:25.211Z

Now let me read the lib file to verify `regenFindCache`, the sidecar primitives, and the freshness logic.

### Assistant | 2026-06-02T14:29:25.473Z

[tool_use: Read]

### User | 2026-06-02T14:29:55.613Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+20483 chars truncated]

### Assistant | 2026-06-02T14:30:00.181Z

Now let me read the regen-viz.mjs find-cache stage and the sibling stages for convention comparison.

### Assistant | 2026-06-02T14:30:00.398Z

[tool_use: Read]

### User | 2026-06-02T14:30:06.969Z

[tool_result] read-once-guard: 'H:\prism\scripts\regen-viz.mjs' was already read 15m ago in this session and is unchanged (mtime 1780409208622). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-02T14:30:10.520Z

The guard says I've read it already, but I don't actually have it in this session's context. Let me grep the relevant stage.

### Assistant | 2026-06-02T14:30:12.277Z

[tool_use: Grep]

### User | 2026-06-02T14:31:01.049Z

[tool_result] 370-  if (ob.status !== 0) { console.error(`[regen-viz] ✗ obsidian-bridge failed (non-fatal)`); }
371-}
372-
373-// Master-index sidecar — pre-built inverted index for master-index search.
374-// The merged system-graph.json is ~372 MB; loadGraph parsing it INLINE in the
375-// per-prompt master-index hook is fatal (the hook has a 2-5 s budget).
376:// build-graph-index.mjs builds the compact ~105
... [+4074 chars truncated]

### Assistant | 2026-06-02T14:31:06.856Z

I have everything needed. Let me verify one coupling concern: that the heap re-exec in `regen-find-cache.mjs` is consistent with the sibling `build-graph-index.mjs`, and confirm `NODE_ARGS` heap value in regen-viz.

### Assistant | 2026-06-02T14:31:09.053Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:31:09.838Z

[tool_use: Grep]

### User | 2026-06-02T14:31:37.596Z

[tool_result] 35- * the parity with a regression-guard test.
36- *
37- * MEMORY: parsing the 372 MB graph needs ~1.5-2 GB heap. `main()` re-execs
38: * itself once with `--max-old-space-size=8192` when invoked without a heap
39- * flag, so a bare `node scripts/build-graph-index.mjs` is safe. Disable the
40: * re-exec with `PRISM_BUILD_GRAPH_INDEX_NO_REEXEC=1`.
41- *
42- * CLI:  node scripts/build-graph-index.mj
... [+1457 chars truncated]

### User | 2026-06-02T14:31:37.634Z

[tool_result] 207-// sequentially (one spawnSync at a time), so peak is one 24GB process. If 24GB still
208-// intermittently OOMs as the graph grows further, bump to 32768 (host supports it).
209:const NODE_ARGS = ["--max-old-space-size=24576", "--stack-size=8192"];
210-
211-console.log(`[regen-viz] running ${scripts.length} generator(s)${wantFull ? " (FULL)" : " (fast)"}…`);

### Assistant | 2026-06-02T14:32:23.093Z

I now have full end-to-end visibility on all 4 files plus both siblings. Here is my independent second-pass review.

---

## Independent second-pass review — `regen-find-cache` find-cache offline generator

### Test integrity (R9 — verified per-test)

I traced every test against a hypothetical logic regression. **None are tautologies/stubs.** Each would fail on a real regression:

- **Test 1 (happy):** Asserts `r.ok`, `nodeCount===12`, sidecar exists, `bytes>0`, `schemaVersion===1`, `nodes.length===12`, AND that `degree`/`_internalRef` are stripped while `label` survives. This is the strongest test — it would fail if `projectForFind` leaked non-projected fields (the `FIND_FIELDS` allowlist regressing to a passthrough), if the schema version drifted, or if the write silently no-op'd. Real intent, real reference values.
- **Test 2 (drop-in):** This is the load-bearing one and it **genuinely proves the claim.** It calls `regenFindCache()` then `lib.__test.readSidecarIfFresh()` and asserts non-null. Critically, `readSidecarIfFresh` is the *exact* gate `loadFindCache` uses (line 352) to decide cache-hit-vs-cold-parse — and it independently re-stats the live graph and compares `sourceMtimeMs`/`sourceSize` (lines 304-308) plus validates the schema shape (lines 298-302). So a non-null return *is* proof that the next `find` takes the hit path, not the cold parse. If `regenFindCache` wrote an incompatible format (missing `sourceMtimeMs`, wrong `nodes` shape, stale stat) the schema/freshness guard would return null and the test would fail. It then calls `loadFindCache()` and asserts the same node count + projected label, closing the loop on real consumption. **This test is not a tautology — it would fail on an incompatible/stale write.** PASS.
- **Test 3 (graph-missing):** Asserts `ok:false`, `reason==="graph-missing"`, no sidecar. Would fail if the missing-graph branch threw instead of returning the reason, or wrote a phantom sidecar. Real.
- **Test 4 (cache-disabled):** Asse
... [+6145 chars truncated]
