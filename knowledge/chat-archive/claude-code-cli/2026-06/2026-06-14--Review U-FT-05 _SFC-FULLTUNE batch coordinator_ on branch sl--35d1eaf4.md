---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Review U-FT-05 (SFC-FULLTUNE batch coordinator) on branch slot/oscar, worktree H"
date: "2026-06-14"
first_ts: "2026-06-14T05:52:51.114Z"
last_ts: "2026-06-14T05:54:39.634Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a3579754e7316aac9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Review U-FT-05 (SFC-FULLTUNE batch coordinator) on branch slot/oscar, worktree H

> **claude-code-cli** | 2026-06-14 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a3579754e7316aac9.jsonl`

## Transcript

### User | 2026-06-14T05:52:51.114Z

Review U-FT-05 (SFC-FULLTUNE batch coordinator) on branch slot/oscar, worktree H:/prism-slot-oscar. Read the file end-to-end. Report P0/P1/P2 + PASS/FAIL.

FILE: `mcp-server/scripts/sfc-batch-coordinator.mjs` (NEW). Orchestrates the offline 20.3M-cell sweep: forks a pool of sfc-batch-worker.mjs children (child_process.fork with execArgv: process.execArgv so workers inherit the tsx loader), fans the 1,152 enumerateWorkUnits() across them one unit at a time, records each completed unit in an atomic resumable manifest (state/sfc-batch/manifest.json, temp->rename), resumes by skipping units already complete (manifest entry AND shard on disk).

VERIFY (focus on concurrency + resume correctness):
1. POOL / FIFO dispatch: dispatch(w) shifts the next pending unit and sends {type:'run',runId,task}; on 'result' it records + dispatches the next; on 'ready' it dispatches. Is there any race where a unit is dispatched twice, or a worker sits idle with work pending? Is `pending.shift()` safe (single-threaded JS event loop -> yes, but confirm no await between check and shift)?
2. BLEED-GUARD: each dispatch increments nextRunId and stores w._runId; onMessage ignores result/error whose m.runId !== w._runId. Is this correct? Can a stale message from a re-forked worker's prior unit be mis-credited? (note: a re-forked worker is a NEW child object with its own _runId starting at the next nextRunId, so cross-worker bleed is impossible; verify.)
3. RESUME: isDone(u) = unitId in manifest.completed AND shard file exists. A manifest entry without a shard is re-run. Validated: run limit 2 -> 2 done; resume dry-run -> alreadyComplete:2 pending:1150. Confirm the logic + that --fresh clears manifest+shards, and stale *.partial are swept on startup.
4. RE-FORK ON EXIT: w.on('exit') -> if not shuttingDown and not _shutdownSent and had an in-flight unit (_unit && !_idle) -> requeue the unit; if active===0 finish(); else if pending>0 and code!==0 spawnWorker(idx). Trace: (a) clean shutdown (code 0 af
... [+1171 chars truncated]

### Assistant | 2026-06-14T05:52:57.853Z

I'll review U-FT-05, the SFC batch coordinator. Let me read the file end-to-end and the worker it forks to understand the contract.

### Assistant | 2026-06-14T05:52:58.244Z

[tool_use: Read]

### User | 2026-06-14T05:52:59.749Z

[tool_result] 1	/**
2	 * SFC full-space batch sweep COORDINATOR (U-FT-05, SFC-FULLTUNE).
3	 * ===============================================================
4	 *
5	 * Orchestrates the offline 20,321,280-cell sweep: forks a pool of sfc-batch-worker.mjs
6	 * children and fans the 1,152 regime-aligned work units (enumerateWorkUnits) across them,
7	 * one unit per worker at a time (FIFO acquire). Each completed un
... [+11637 chars truncated]

### Assistant | 2026-06-14T05:53:02.949Z

Now let me read the worker to understand the message contract (especially `ready`, `result`, `error`, `shutdown` semantics and the `runId` echo behavior).

### Assistant | 2026-06-14T05:53:03.366Z

[tool_use: Read]

### User | 2026-06-14T05:53:04.817Z

[tool_result] 1	/**
2	 * SFC full-space batch sweep WORKER (U-FT-04, SFC-FULLTUNE).
3	 * ==========================================================
4	 *
5	 * One worker of the offline 20,321,280-cell sweep. The coordinator (U-FT-05,
6	 * sfc-batch-coordinator.mjs) forks a pool of these and fans the 1,152 regime-aligned
7	 * work units (sfc-combinatorial-enumerator.enumerateWorkUnits) across them, one unit
8	 * 
... [+5735 chars truncated]

### Assistant | 2026-06-14T05:53:11.347Z

Now I have both files. Let me trace the key concurrency scenarios carefully. The critical question is the drained-worker-vs-requeue interaction. Let me trace it methodically.

Let me verify the enumerator's exports exist as imported (no fabrication) and check the `count` field shape that `dispatch` relies on.

### Assistant | 2026-06-14T05:53:13.356Z

[tool_use: Grep]

### User | 2026-06-14T05:53:14.945Z

[tool_result] 57:export const SFC_FULL_SPACE_SIZE: number = RADIX.reduce((a, b) => a * b, 1);
132:export function enumerateRange(offset: number, count: number): SampledCell[] {
164:export const SFC_CELLS_PER_WORK_UNIT: number =
179:export const SFC_WORK_UNIT_COUNT: number = VALID_CELLS.length * ISO_BANDS.length;
202:export function enumerateWorkUnits(): SfcWorkUnit[] {

### Assistant | 2026-06-14T05:53:18.025Z

[tool_use: Read]

### User | 2026-06-14T05:53:20.969Z

[tool_result] 180	
181	/** One unit of work the coordinator (U-FT-05) hands a worker (U-FT-04). */
182	export interface SfcWorkUnit {
183	  /** Stable, sortable, filename-safe id (`u0000`..). The output shard is named by this. */
184	  unitId: string;
185	  /** Flat-index slice [offset, offset+count) -- feed to enumerateRange()/cellAtIndex(). */
186	  offset: number;
187	  count: number;
188	  /** Regime coordi
... [+1413 chars truncated]

### Assistant | 2026-06-14T05:53:38.301Z

I now have everything I need. Let me trace the critical concurrency scenarios precisely.

The work units have unique `unitId`s and each unit is dispatched at most once at a time. Now let me trace the KEY concurrency question — the drained-worker-vs-requeue hang scenario — by reasoning through the exact state machine.

**The hang scenario (P0 candidate):**

Consider pool of 2 workers, 3 pending units remaining at some late point (call the requeue case). Actually, let me construct the minimal worst case that the E2E did NOT exercise:

- Suppose `pending` is nearly drained. Worker A finishes its last unit, calls `dispatch(A)` → `pending.shift()` returns `undefined` → `A._idle = true`, `maybeShutdown(A)` → `pending.length === 0` so sends `shutdown` to A, sets `A._shutdownSent = true`.
- Meanwhile Worker B is still running its unit (`B._unit` set, `B._idle = false`).
- Now Worker B **crashes mid-unit** (non-zero exit). In `w.on("exit")`: `active--` (active goes from 2 to 1). Condition `!shuttingDown && !B._shutdownSent && B._unit && !B._idle` → **true** → `pending.push(B._unit)` (pending now length 1). Then `if (active === 0)` → false (active is 1, A still alive). `else if (!shuttingDown && pending.length > 0 && code !== 0)` → **true** → `spawnWorker(B._idx)` → respawns. Good, the respawned worker emits `ready` → `dispatch` → picks up the requeued unit. **No hang here.** B's crash respawns.

Let me find the actual hang. The dangerous case is when the worker that requeues is itself the LAST active worker, OR when the only surviving worker is already shut down.

**Hang scenario — exit code 0 crash mid-unit with a drained sibling already shut down:**

The respawn is gated on `code !== 0`. Trace:
- 2 workers. Worker A drained → `A._shutdownSent = true`, A exits cleanly later (code 0).
- Worker B is running a unit. B dies mid-unit **with code 0** (e.g. `process.exit(0)` from an unexpected path, or killed by a signal that maps to exit code 0, or — more realistically — an OOM/s
... [+327 chars truncated]

### Assistant | 2026-06-14T05:53:38.944Z

[tool_use: Read]

### User | 2026-06-14T05:53:40.654Z

[tool_result] 205	  /** Fork one worker + wire its lifecycle (re-fork on unexpected exit, requeue its unit). */
206	  function spawnWorker(idx) {
207	    const w = fork(WORKER_PATH, [], { execArgv: process.execArgv, env: process.env, stdio: ["inherit", "inherit", "inherit", "ipc"] });
208	    w._idx = idx; w._idle = true; w._shutdownSent = false; w._unit = null; w._runId = -1;
209	    active++;
210	    w.on("me
... [+1942 chars truncated]

### Assistant | 2026-06-14T05:54:39.634Z

I have fully traced the state machine. Here are my findings.

## Code Quality Analysis Report — U-FT-05 sfc-batch-coordinator.mjs

### Summary
- Overall Quality Score: 7.5/10
- Files Analyzed: 2 (coordinator + worker contract) + enumerator interface
- Verdict: **FAIL** — one P0 liveness hang is reachable on the exact crash/requeue interaction the prompt flagged as un-exercised.

The bleed-guard, FIFO dispatch, resume logic, and manifest atomicity are all correct (verified below). The defect is isolated to the re-fork/requeue path under a drained sibling — precisely the interaction the E2E never hit.

---

### P0 — Requeued unit can be permanently stranded (liveness hang) when the only respawn path is gated off

**File:** `mcp-server/scripts/sfc-batch-coordinator.mjs:214-222`

The exit handler requeues an in-flight unit unconditionally, but **respawn is gated on `code !== 0`**. The requeue and the respawn are decoupled, so a worker can push work back onto `pending` and then NOT respawn — and no other worker is guaranteed to pick it up.

**Reachable trace (pool size 2, tail of the run):**

1. Worker A drains: `dispatch(A)` → `pending.shift()` returns `undefined` → `A._idle=true`, `maybeShutdown(A)` sends `shutdown`, sets `A._shutdownSent=true`. A is now a dead-end consumer — it will exit and never call `dispatch` again.
2. Worker B is mid-unit (`B._unit` set, `B._idle=false`). B exits **with code 0** while in-flight. This is not exotic: the worker calls `process.exit(0)` on receiving `{type:'shutdown'}` (`sfc-batch-worker.mjs:106-108`), and a `shutdown` message can be **in B's IPC queue ahead of an unprocessed `run`**, or B can receive the broadcast `shutdown` from `shutdown()` (SIGINT) — but the cleanest reproduction: any abnormal-yet-zero exit, or a `shutdown` race.
3. In B's `exit(code=0)`: `active--` → 1. The requeue guard `!shuttingDown && !B._shutdownSent && B._unit && !B._idle` is **true** → `pending.push(B._unit)` (pending length now 1).
4. `if (active === 0)`
... [+7833 chars truncated]
