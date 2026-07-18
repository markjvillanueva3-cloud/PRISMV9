---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Review the F11 cross-lock wiring in TWO files (read both fully + the lock lib H:"
date: "2026-05-19"
first_ts: "2026-05-19T00:26:26.354Z"
last_ts: "2026-05-19T00:27:59.015Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-aeee89d658bb56117.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the F11 cross-lock wiring in TWO files (read both fully + the lock lib H:

> **claude-code-cli** | 2026-05-19 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-aeee89d658bb56117.jsonl`

## Transcript

### User | 2026-05-19T00:26:26.354Z

Review the F11 cross-lock wiring in TWO files (read both fully + the lock lib H:/prism/scripts/lib/system-graph-write-lock.mjs):
- H:/prism/scripts/system-viz-on-commit.mjs — new import block + the acquireGraphWriteLock/installGraphWriteLockReleaseOnExit block inside main() right after pidFileGuard().
- H:/prism/scripts/system-viz-add-node.mjs — new import block + the TIER-1b `isGraphWriteLockActive` DEFER added to flushQueue right after the existing TIER-1 `isRegenActive` block (also read the flushQueue signature change adding the `graphWriteLock` param).

CONTEXT: U-VIZ-F11-CROSS-LOCK. There are THREE independent system-graph.json writers: (1) regen-viz.mjs [already wired in prior file], (2) system-viz-on-commit.mjs [its main() runs merge-augmentations.mjs ×2], (3) system-viz-add-node.mjs flushQueue [atomic temp+rename write]. F1 isolated generate-system-viz.mjs to architecture-graph.json (NOT a racer). The design: regen-viz + on-commit ACQUIRE the shared .system-graph-write.pid; add-node DEFERS while it is held. on-commit ALSO has its own pre-existing .system-viz-on-commit.pid self-guard (exit-0 skip, "next commit recovers"); add-node's pre-existing TIER-1 already defers on .system-viz-on-commit.pid. 83/83 SystemVizAddNode.test.ts pass; 25/25 lock-lib test pass.

VERIFY (flag P0/P1, grade PASS/FAIL):
1. SYMMETRY/COMPLETENESS: with this commit, are ALL three writers now mutually exclusive on the ONE shared .system-graph-write.pid? Trace: regen-viz holds it → on-commit sees acquire-fail → skips exit 0; on-commit holds it → regen-viz sees acquire-fail → skips exit 4; either holds it → add-node TIER-1b returns deferred. Is any pairwise race still open?
2. on-commit SKIP CODE: it uses `process.exit(0)` on F11-held (mirroring its own pidFileGuard skip). Is exit-0 correct here given on-commit is post-commit-hook-invoked + detached (not operator/cron)? Does it match on-commit's documented "skipped runs recovered by next commit" contract? Any consumer that would misread e
... [+1722 chars truncated]

### Assistant | 2026-05-19T00:26:33.996Z

I'll read all three files in parallel to perform a thorough review.

### Assistant | 2026-05-19T00:26:34.427Z

[tool_use: Read]

### Assistant | 2026-05-19T00:26:35.287Z

[tool_use: Read]

### Assistant | 2026-05-19T00:26:35.383Z

[tool_use: Read]

### User | 2026-05-19T00:26:38.376Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-on-commit.mjs — full refresh chain.
4	 *
5	 * Called by:
6	 *   - Git post-commit hook (auto-fires on every commit)
7	 *   - Cron (hourly)
8	 *   - Slash command /system-viz
9	 *   - Manual: `node scripts/system-viz-on-commit.mjs`
10	 *
11	 * Sequence:
12	 *   1. generate-system-viz.mjs           — base graph from live PRISM state
13	 *   2. merge-augmen
... [+14549 chars truncated]

### User | 2026-05-19T00:26:40.242Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.mjs — shared cross-process write lock for
5	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * ── Why this exists ──────────────────────────────────────────────────────
8	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
9	 * (`architectu
... [+12330 chars truncated]

### User | 2026-05-19T00:26:40.244Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
4	 *
5	 * Spec: CLEANUP-MS0 / U-CLEANUP-C3
6	 *
7	 * Bridges the ~100s latency between full system-viz regenerations
8	 * (`generate-system-viz.mjs` rebuilds the whole 20K-node graph from
9	 * scratch) by appending "dashed" provisional nodes to the live graph
10	 * as soon as new engines / di
... [+32256 chars truncated]

### Assistant | 2026-05-19T00:27:59.015Z

All three files read in full. Proceeding through each verification point systematically.

---

## Question 1 — SYMMETRY / COMPLETENESS: Are all three writers mutually exclusive on ONE shared lock?

Tracing each pairwise race:

**regen-viz holds `.system-graph-write.pid` → on-commit tries to run:**
`on-commit.main()` calls `acquireGraphWriteLock()` after `pidFileGuard()`. `acquireGraphWriteLock` calls `decideAcquire(readLockRaw(...), selfPid)`. regen-viz's pid is alive and different from on-commit's pid → `decideAcquire` returns `{ acquire: false }` → `acquireGraphWriteLock` returns `{ acquired: false, heldBy: regen-pid }` → on-commit logs the skip and calls `process.exit(0)`. Blocked correctly.

**on-commit holds `.system-graph-write.pid` → regen-viz tries to run:**
regen-viz (already wired in a prior commit) calls `acquireGraphWriteLock()` at its own entry. Same path: on-commit's pid is alive → `{ acquired: false }` → regen-viz exits with exit code 4 (`EXIT_GRAPH_WRITE_LOCK_SKIP`). Blocked correctly.

**Either holds `.system-graph-write.pid` → add-node flushQueue:**
TIER-1b at line 470: `isGraphWriteLockActive({ pidPath: graphWriteLock })`. `isGraphWriteLockActive` calls `decideActive(rawContents, selfPid)`. If regen-viz or on-commit holds it with a live pid that differs from add-node's pid → `decideActive` returns `true` → `flushQueue` returns `{ deferred: true, error: "graph_write_locked" }`. Queue untouched. Blocked correctly.

**add-node holds its own `.system-viz-add-node.pid` → regen-viz or on-commit:**
Neither regen-viz nor on-commit consult add-node's PID file. This is intentional by design: add-node's flush is an atomic `temp+rename`, so when regen-viz or on-commit's merge stage runs AFTER add-node finishes its rename, it reads the already-updated graph. And if regen-viz/on-commit is mid-chain, TIER-1b defers add-node until they release. The CAS/TIER-2 mtime check in add-node catches the narrow `release → regen-next-stage` window. This asymmetry is archite
... [+10208 chars truncated]
