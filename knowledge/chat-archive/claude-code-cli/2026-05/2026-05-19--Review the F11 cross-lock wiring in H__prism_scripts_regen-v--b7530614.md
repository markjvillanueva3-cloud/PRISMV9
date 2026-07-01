---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Review the F11 cross-lock wiring in H:/prism/scripts/regen-viz.mjs (read the who"
date: "2026-05-19"
first_ts: "2026-05-19T00:12:39.836Z"
last_ts: "2026-05-19T00:14:33.402Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 18
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a752535b9d6ab31ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the F11 cross-lock wiring in H:/prism/scripts/regen-viz.mjs (read the who

> **claude-code-cli** | 2026-05-19 | 42 msgs (18 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a752535b9d6ab31ed.jsonl`

## Transcript

### User | 2026-05-19T00:12:39.836Z

Review the F11 cross-lock wiring in H:/prism/scripts/regen-viz.mjs (read the whole file, focus on the new import block ~line 28-36 and the acquire/install block placed right before the `[regen-viz] merging…` log / merge-augmentations spawn ~line 180-205). Also read H:/prism/scripts/lib/system-graph-write-lock.mjs (the lock API being consumed) end to end.

CONTEXT: U-VIZ-F11-CROSS-LOCK. regen-viz.mjs orchestrates an ~8-min chain: a FAST/HEAVY generator loop (writes STAGING augmentation files, NOT system-graph.json) → merge-augmentations.mjs (FIRST writer of system-graph.json) → repair → dedup → reparent → add-parent-contains-edges → seed-ghost-from-unwired --apply → system-viz-obsidian-bridge-v2 (all rewrite system-graph.json) → executive-briefing/wiki-debt (READ-only consumers) → drift-gate. regen-viz has hard `process.exit()` at: line ~82 (drift verdict early path), the merge-guard abort (~line 220), and the final `process.exit(failed>0||driftFail?1:0)` (~line 340).

VERIFY (flag P0/P1, grade PASS/FAIL):
1. PLACEMENT: is acquireGraphWriteLock() called BEFORE the first system-graph.json writer (merge-augmentations spawn) and is installGraphWriteLockReleaseOnExit() registered immediately after acquire so EVERY subsequent exit path (incl. the merge-guard `process.exit(guard.exitCode)` and final exit) releases the lock? Is there ANY system-graph.json-writing stage that runs OUTSIDE the lock's held window (before acquire or after a release)?
2. The early `process.exit(fail?1:0)` at ~line 82 — does that run BEFORE or AFTER the acquire block? If before, the lock was never taken (fine — nothing written yet). If the exit handler is installed but lock not acquired, does releaseGraphWriteLock no-op safely (it should: nothing to unlink / not owner)?
3. SKIP-LOUD: acquire-fail → `process.exit(3)`. Is exit code 3 distinct from regen-viz's existing 0/1 semantics and not collided with the merge-guard guard.exitCode values (check decideMergePostState exit codes 2/3 in regen-viz-mer
... [+1029 chars truncated]

### Assistant | 2026-05-19T00:12:47.329Z

I'll read both files end-to-end, then verify each point systematically.

### Assistant | 2026-05-19T00:12:47.786Z

[tool_use: Read]

### Assistant | 2026-05-19T00:12:47.967Z

[tool_use: Read]

### User | 2026-05-19T00:12:50.724Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\system-graph-write-lock.mjs' was already read 6m ago in this session and is unchanged (mtime 1779149118078). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:12:51.891Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+16993 chars truncated]

### Assistant | 2026-05-19T00:12:56.081Z

The read-once-guard means `system-graph-write-lock.mjs` is already in context. Let me read it now with explicit parameters to get the content.

### Assistant | 2026-05-19T00:12:56.823Z

[tool_use: Read]

### User | 2026-05-19T00:12:58.087Z

[tool_result] 0	#!/usr/bin/env node
1	// tier: T0
2	/**
3	 * system-graph-write-lock.mjs — shared cross-process write lock for
4	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
5	 *
6	 * ── Why this exists ──────────────────────────────────────────────────────
7	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
8	 * (`architectu
... [+11639 chars truncated]

### Assistant | 2026-05-19T00:13:00.016Z

Now I need to check the merge-guard exit codes to verify the exit-3 collision question.

### Assistant | 2026-05-19T00:13:01.816Z

[tool_use: Grep]

### User | 2026-05-19T00:13:01.817Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-05-19T00:13:02.707Z

[tool_use: Grep]

### User | 2026-05-19T00:13:02.708Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-05-19T00:13:05.323Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:13:05.903Z

[tool_use: Grep]

### User | 2026-05-19T00:13:06.900Z

[tool_result] No files found

### User | 2026-05-19T00:13:07.661Z

[tool_result] 42- * @param {number} o.preMergeNodeCount system-graph.json node count BEFORE merge
43- * @param {number} o.postMergeNodeCount system-graph.json node count AFTER merge
44- * @param {number} o.augTotalBytes     sum of *-augmentation.json bytes on disk
45: * @returns {{abort: boolean, exitCode: number, reason: string, message: string}}
46- */
47-export function decideMergePostState({
48-  mergeStatu
... [+805 chars truncated]

### Assistant | 2026-05-19T00:13:10.393Z

[tool_use: Grep]

### User | 2026-05-19T00:13:13.396Z

[tool_result] 13- *
14- * Decision contract:
15: *   - merge subprocess exited non-zero → ABORT (code 2). Don't touch the
16- *     post-merge stages; their inputs are now corrupted.
17- *   - merge exited 0 but the graph file shrank or stayed flat while ≥1 MB of
--
25-import path from "node:path";
26-
27:export const EXIT_OK = 0;
28:export const EXIT_MERGE_FAILED = 2;
29:export const EXIT_MERGE_NO_OP = 3;
30-

... [+791 chars truncated]

### Assistant | 2026-05-19T00:13:16.428Z

Now I have everything needed. Let me verify one remaining detail: whether FAST/HEAVY generators write system-graph.json directly.

### Assistant | 2026-05-19T00:13:17.278Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:13:18.418Z

[tool_use: Grep]

### User | 2026-05-19T00:13:18.646Z

[tool_result] Found 55 files
scripts\generate-system-viz.mjs
scripts\generate-misc-tasks-features.mjs
scripts\generate-executive-briefing.mjs
scripts\generate-git-tree.mjs
scripts\generate-vault-graph.mjs
scripts\generate-wiki-debt-worklist.mjs
scripts\generate-milestone-wiki.mjs
scripts\generate-misc-l8-wiki.mjs
scripts\generate-extracted-data-atomic.mjs
scripts\generate-domain-wiki.mjs
scripts\generate-data-c
... [+1665 chars truncated]

### User | 2026-05-19T00:13:20.107Z

[tool_result] 1-#!/usr/bin/env node
2-/**
3: * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
4- *
5- * Reads:
6: *   state/shared/system-viz/system-graph.json
7- *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8- *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
--
32-}

[Showing results with p
... [+22 chars truncated]

### Assistant | 2026-05-19T00:13:24.061Z

Several FAST generators reference `system-graph.json`. I need to check whether they READ it (source) or WRITE it (target) — specifically the ones in the FAST[] list that are not merely augmentation emitters.

### Assistant | 2026-05-19T00:13:25.699Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:13:26.416Z

[tool_use: Grep]

### User | 2026-05-19T00:13:26.977Z

[tool_result] 304-  }
305-  stats.parentsAdded = parentsAdded;
306:  fs.writeFileSync(ENG_SAT, JSON.stringify(engSat));
307-
308-  // Write back both augmentations
309:  fs.writeFileSync(ENG_SAT, JSON.stringify(engSat));
310:  fs.writeFileSync(ACT_ENG, JSON.stringify(actEng));
311-
312-  return {
--
320-const result = generate();
321-const outPath = path.join(VIZ_DIR, "engine-reclassify-augmentation.json");
322
... [+112 chars truncated]

### User | 2026-05-19T00:13:27.840Z

[tool_result] 268-
269-fs.mkdirSync(VIZ_DIR, { recursive: true });
270:fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + "\n", "utf8");
271-console.log(`[git-tree] wrote git-tree-augmentation.json — ${newNodes.length} nodes (${branches.length} branches + ${commits.length} commits + 1 hub) · ${newEdges.length} edges (${parentEdges} parent, ${containsEdges} contains, ${stats.tips} tip, ${touchedEdges} touched→
... [+280 chars truncated]

### Assistant | 2026-05-19T00:13:30.709Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:13:31.908Z

[tool_use: Grep]

### User | 2026-05-19T00:13:32.073Z

[tool_result] No matches found

### User | 2026-05-19T00:13:32.936Z

[tool_result] No matches found

### Assistant | 2026-05-19T00:13:36.067Z

Good — the FAST generators write augmentation files, not system-graph.json directly. Let me do one final targeted check on the two FAST-list generators that mentioned system-graph.json in the broad search, to confirm they only read it.

### Assistant | 2026-05-19T00:13:37.396Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:13:38.601Z

[tool_use: Grep]

### User | 2026-05-19T00:13:39.847Z

[tool_result] 135-  }
136-
137:  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
138-  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }
139-

### User | 2026-05-19T00:13:40.225Z

[tool_result] 265-const result = generate();
266-const out = path.join(VIZ_DIR, "wiki-cross-refs-augmentation.json");
267:fs.writeFileSync(out, JSON.stringify(result));
268-console.log(`wrote ${out}`);
269-if (result.error) console.log(`  error: ${result.error}`);

### Assistant | 2026-05-19T00:13:42.644Z

[tool_use: Grep]

### User | 2026-05-19T00:13:44.112Z

[tool_result] 44-const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
45-const INVENTORY_PATH = path.join(ROOT, "state/shared/specs/MISC-TASKS-INVENTORY.json");
46:const OUT_PATH = path.join(VIZ_DIR, "misc-tasks-augmentation.json");
47-
48-/**

### Assistant | 2026-05-19T00:14:33.402Z

All FAST generators write augmentation files only. Now I have a complete picture. Here is the full review.

---

## U-VIZ-F11-CROSS-LOCK Wiring Review

### 1. PLACEMENT — acquire before first writer, handler installed immediately after

**Correct.** The acquire block is at regen-viz.mjs lines 197–208, placed after the FAST/HEAVY generator loop (lines 159–170) and before the `preMergeNodeCount` snapshot and the `merge-augmentations.mjs` spawn (line 211). `installGraphWriteLockReleaseOnExit()` is called at line 207, immediately after the `process.exit(3)` skip-loud branch, so every subsequent exit path — the merge-guard `process.exit(guard.exitCode)` at line 230, and the final `process.exit(failed>0||driftFail?1:0)` at line 348 — fires the `process.once('exit', release)` handler registered inside `installGraphWriteLockReleaseOnExit`.

Every system-graph.json-writing stage (merge-augmentations → repair → dedup → reparent → add-parent-contains-edges → seed-ghost → obsidian-bridge) runs after line 211, inside the held window. No writing stage runs before the acquire or after a release call. **No gap here.**

### 2. Early `process.exit` at line 86 (`--drift-gate-only`)

This exit is at line 86, which is before the acquire block at line 197. At that point `installGraphWriteLockReleaseOnExit()` has not been called and no lock has been written. The `process.once('exit', release)` handler does not exist yet, so it cannot fire. There is nothing to release. **Safe — correct.**

Additionally: if somehow `installGraphWriteLockReleaseOnExit` were called before acquire (it is not, but hypothetically), `releaseGraphWriteLock` reads the pid file, finds a pid that does not match `process.pid`, and does not call `unlinkSync`. It is idempotent/fail-soft by construction (lines 164–172 of the lock file). The no-op safety holds regardless.

### 3. Exit code collision — F11 exit 3 vs merge-guard EXIT_MERGE_NO_OP = 3

**P0 FINDING — EXIT CODE COLLISION.**

`regen-viz-merge-guard.mjs` exports
... [+5559 chars truncated]
