---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Review the file H:/prism/scripts/lib/system-graph-write-lock.mjs END TO END (rea"
date: "2026-05-19"
first_ts: "2026-05-19T00:02:15.950Z"
last_ts: "2026-05-19T00:03:15.848Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-aec0180e8fd727a2e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the file H:/prism/scripts/lib/system-graph-write-lock.mjs END TO END (rea

> **claude-code-cli** | 2026-05-19 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-aec0180e8fd727a2e.jsonl`

## Transcript

### User | 2026-05-19T00:02:15.950Z

Review the file H:/prism/scripts/lib/system-graph-write-lock.mjs END TO END (read the whole file).

CONTEXT: This is the F11 leg of DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK. It is a NEW shared cross-process advisory PID lock for `state/shared/system-viz/system-graph.json`. Two writers will consume it:
- `scripts/regen-viz.mjs` will `acquireGraphWriteLock()` + `installGraphWriteLockReleaseOnExit()` before its ~8-min subprocess chain (it has hard `process.exit()` calls mid-chain at the merge-guard abort and final exit).
- `scripts/system-viz-add-node.mjs` `flushQueue` will call `isGraphWriteLockActive()` and DEFER if true.

The lock semantics MUST be byte-equivalent to the proven crash-safe pattern already in `scripts/system-viz-add-node.mjs` (functions `acquirePidLock`/`releasePidLock`/`isRegenActive`, lines ~334-372): read pid → `process.kill(pid,0)` liveness probe → dead/absent/unparseable/own → claim/proceed, live-other → refuse/active. Read that file's lines 327-372 to verify parity.

VERIFY (flag P0/P1, grade PASS/FAIL):
1. Crash-safe correctness: does `decideAcquire`/`decideActive` exactly mirror acquirePidLock/isRegenActive (dead PID reclaim via ESRCH catch, self-pid idempotent re-entry, live-other refusal)? Any divergence is a P0.
2. `installGraphWriteLockReleaseOnExit` — does `process.once('exit', release)` actually fire on `process.exit()` (regen-viz's mid-chain hard-exit paths)? Is the SIGINT/SIGTERM re-exit (130/143) correct and non-looping? Could the re-exit cause a release-then-loop?
3. Self-pid handling: `decideActive` returns false for our own pid — correct for the DEFER predicate? Confirm regen-viz acquiring then add-node (different pid) seeing it = active=true.
4. Path resolution: `REPO_ROOT = resolve(__dirname,'..','..')` from scripts/lib/ → is that H:/prism? `PRISM_SYSTEM_GRAPH_WRITE_PID` override absolute-resolved correctly?
5. Race/TOCTOU: decideAcquire reads then writes non-atomically — is that acceptable for an advisory lock g
... [+491 chars truncated]

### Assistant | 2026-05-19T00:02:24.124Z

I'll read the target file end to end, then the sibling reference pattern for parity verification.

### Assistant | 2026-05-19T00:02:24.285Z

[tool_use: Read]

### User | 2026-05-19T00:02:25.274Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.mjs — shared cross-process write lock for
5	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * ── Why this exists ──────────────────────────────────────────────────────
8	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
9	 * (`architectu
... [+10143 chars truncated]

### Assistant | 2026-05-19T00:02:27.947Z

Now let me read the sibling reference pattern to verify byte-equivalence parity.

### Assistant | 2026-05-19T00:02:28.713Z

[tool_use: Read]

### User | 2026-05-19T00:02:29.784Z

[tool_result] 320	  if (!fs.existsSync(lfPath)) return Infinity;
321	  const iso = fs.readFileSync(lfPath, "utf8").trim();
322	  const t = Date.parse(iso);
323	  if (!Number.isFinite(t)) return Infinity;
324	  return now - t;
325	}
326	
327	// ─── PID-file guard (mirrors system-viz-on-commit.mjs pattern) ───────────
328	
329	/**
330	 * Acquire single-writer guard via PID file. Returns true if acquired,
331	 * f
... [+2271 chars truncated]

### Assistant | 2026-05-19T00:03:15.848Z

I have both files. Let me verify parity point by point.

## Parity Analysis

**Sibling `acquirePidLock` (lines 334-348) logic:**
- mkdir recursive (unguarded)
- read file → parse pid
- `Finite && pid>0 && pid!==self` → `process.kill(pid,0)` → live: return false; dead (catch): fall through to claim
- pid absent/unreadable/unparseable/≤0/===self → fall through to write
- write self pid, return true

**`decideAcquire` (lines 95-106) logic:**
- `rawContents==null` → acquire (mirrors "no file/unreadable")
- `!Finite || pid<=0` → acquire (mirrors unparseable/≤0)
- `pid===selfPid` → acquire (mirrors `pid!==process.pid` skip → write)
- live other → refuse; dead other (catch) → acquire

This is an **exact mirror**. Self-pid idempotent re-entry ✓, dead-PID ESRCH reclaim ✓, live-other refusal ✓.

**`isRegenActive` (364-372) vs `decideActive` (114-125):** absent/unreadable→false, unparseable/≤0→false, dead→false, live→true. `decideActive` adds `pid===selfPid → false` which `isRegenActive` lacks — but this is **correct and intentional**: the sibling's lock is held by a *different* tool (`generate-system-viz`) so self-collision never occurs there; here regen-viz both holds and could query, so excluding self is the right DEFER predicate (regen must not defer to its own lock). Not a divergence — a correct adaptation. ✓

Now checking the verification items:

**1. Crash-safe correctness:** PASS. Exact mirror, ESRCH catch reclaim, self-pid idempotent, live-other refusal all correct.

**2. `installGraphWriteLockReleaseOnExit`:**
- `process.once('exit', release)` — fires on `process.exit()` synchronously. `release` is `releaseGraphWriteLock` which is purely synchronous fs ops. The `'exit'` handler is allowed to do synchronous work. regen-viz's `process.exit()` at merge-guard abort / final exit → handler fires. ✓
- SIGINT/SIGTERM: `onSignal` calls `release()` then `process.exit(130/143)`. The `process.exit()` re-triggers the `'exit'` event → `release` runs again. `releaseGraphWriteLock` 
... [+5943 chars truncated]
