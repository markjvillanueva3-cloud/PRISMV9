---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "RE-VERIFY a P0 fix in `mcp-server/scripts/sfc-batch-coordinator.mjs` (branch slo"
date: "2026-06-14"
first_ts: "2026-06-14T05:58:40.426Z"
last_ts: "2026-06-14T06:00:32.542Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a95456ae72cee7caf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# RE-VERIFY a P0 fix in `mcp-server/scripts/sfc-batch-coordinator.mjs` (branch slo

> **claude-code-cli** | 2026-06-14 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a95456ae72cee7caf.jsonl`

## Transcript

### User | 2026-06-14T05:58:40.426Z

RE-VERIFY a P0 fix in `mcp-server/scripts/sfc-batch-coordinator.mjs` (branch slot/oscar, worktree H:/prism-slot-oscar). A prior review found a P0 liveness hang and it was just fixed. Confirm the fix CLOSES the hang and introduces no new defect. Report PASS/FAIL.

THE ORIGINAL P0 (now supposedly fixed): the worker exit handler requeued an in-flight unit but gated RESPAWN on `code !== 0`, and `finish()` fired on `active===0` without checking `pending.length===0`. So a clean (code-0) mid-unit worker exit, OR a last-worker requeue, stranded the requeued unit and finish() reported a clean DONE with < all units complete (silent incompleteness, R12).

THE FIX (read the current file ~lines 205-260):
1. The exit handler now refills the pool with `if (!shuttingDown && pending.length > 0 && active < poolSize) { spawnWorker(idx); return; }` BEFORE the `if (active === 0) finish();` -- decoupled from the requeue, NO `code !== 0` gate.
2. finish() now sets process.exitCode=1 and logs INCOMPLETE when pending.length>0, when erroredUnits>0, or (full run, no --limit) when totalComplete < SFC_WORK_UNIT_COUNT.

VERIFY by re-tracing:
(a) Original strand trace #1 (drained sibling + code-0 mid-unit exit): worker A drained+shutdown, worker B exits code 0 mid-unit. Does B's exit now requeue AND refork so the requeued unit is picked up? Walk the new exit handler line by line.
(b) Original strand trace #2 (last worker requeues): B is the only remaining active worker, exits mid-unit, requeues its unit, active becomes 0. Does the refill fire (pending>0 && active<poolSize) and spawn a replacement BEFORE finish()? Or does finish() still fire prematurely?
(c) NEW-DEFECT CHECK: can the refill cause a RESPAWN STORM or infinite loop? E.g., a unit that always crashes its worker -> requeue -> refork -> crash -> ... Is there any termination guarantee, or does a poison unit spin forever? (Consider: the worker catches runUnit errors and posts {type:error} rather than crashing, so a "poison" cell errors-and
... [+770 chars truncated]

### Assistant | 2026-06-14T05:58:46.085Z

I'll re-verify the P0 fix by reading the current state of the file. Let me start by examining the relevant section.

### Assistant | 2026-06-14T05:58:46.404Z

[tool_use: Read]

### User | 2026-06-14T05:58:55.947Z

[tool_result] 1	/**
2	 * SFC full-space batch sweep COORDINATOR (U-FT-05, SFC-FULLTUNE).
3	 * ===============================================================
4	 *
5	 * Orchestrates the offline 20,321,280-cell sweep: forks a pool of sfc-batch-worker.mjs
6	 * children and fans the 1,152 regime-aligned work units (enumerateWorkUnits) across them,
7	 * one unit per worker at a time (FIFO acquire). Each completed un
... [+13202 chars truncated]

### Assistant | 2026-06-14T05:59:00.633Z

I have the full file. Let me trace the worker lifecycle precisely. The exit handler is the critical section (lines 213-231). Let me also read the worker to confirm the assumptions about the protocol (especially whether `_idle`/`_unit`/`_shutdownSent` states are correctly set/cleared, and whether the worker catches errors vs crashes).

### Assistant | 2026-06-14T05:59:00.836Z

[tool_use: Read]

### User | 2026-06-14T05:59:04.499Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\scripts\sfc-batch-worker.mjs' was already read 6m ago in this session and is unchanged (mtime 1781414973800). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-14T05:59:07.820Z

The worker was read earlier this session. Let me re-fetch its content via Grep since the read-once guard claims it's in context but I want to confirm the key protocol points (error handling, message types, idle/ready flow).

### Assistant | 2026-06-14T05:59:09.454Z

[tool_use: Grep]

### User | 2026-06-14T05:59:13.707Z

[tool_result] 8: * per `{type:'run'}` IPC message.
22: * (CADRegressionWorkerThreadRunnerEngine): {type:'run',runId,task} in, {type:'result',
23: * runId,result} out, with the runId echoed so a stale message can never be mis-credited.
30: * fleet-reaper sees real PIDs). This plain-ESM (.mjs) entry loads natively; its TypeScript
44:const send = (m) => process.send(m);
54:function runUnit(task) {
57:    throw new
... [+1053 chars truncated]

### Assistant | 2026-06-14T05:59:16.823Z

I now have the full worker protocol. Let me read the worker's message handler more completely to confirm the exact behavior around the `shutdown` message and the `runId` extraction (to validate the bleed-guard and the clean-exit path).

### Assistant | 2026-06-14T05:59:17.698Z

[tool_use: Read]

### User | 2026-06-14T05:59:20.856Z

[tool_result] 100	  };
101	}
102	
103	process.on("message", (msg) => {
104	  if (!msg || typeof msg !== "object") return;
105	  const m = /** @type {{ type?: string, runId?: number, task?: RunTask }} */ (msg);
106	  if (m.type === "shutdown") {
107	    process.exit(0);
108	  }
109	  if (m.type !== "run" || !m.task) return; // ignore unknown
110	  const runId = m.runId;
111	  try {
112	    const result = runUnit
... [+390 chars truncated]

### Assistant | 2026-06-14T06:00:32.542Z

I now have everything needed to trace the concurrency logic precisely. Let me work through each verification scenario carefully against the actual code.

## Analysis

### State machine recap (coordinator, per worker `w`)

From `spawnWorker` (line 210): on fork, `w._idle=true, w._shutdownSent=false, w._unit=null, w._runId=-1`, `active++`.
- `ready` → `dispatch(w)`.
- `dispatch(w)` (151-159): `pending.shift()`. If a unit `u`: `w._idle=false; w._unit=u; w._runId=nextRunId++; send run`. If none: `w._idle=true; maybeShutdown(w)`.
- `maybeShutdown` (161-166): if `pending.length===0 && !w._shutdownSent` → set `_shutdownSent=true; send shutdown`.
- `result`/`error` (179-204): record, then `dispatch(w)` again.

Key invariant: a worker is "mid-unit" exactly when `w._unit && !w._idle`. After a `result`/`error`, `dispatch(w)` runs synchronously and either re-sets `_unit` to a new unit (still mid-unit) or sets `_idle=true` (drained). The worker only `process.exit(0)`s on receiving `shutdown` (worker line 106-107) — it does not exit after sending a result; it loops awaiting the next `run`.

---

### (a) Strand trace #1 — drained sibling + code-0 mid-unit exit

Setup: poolSize=2. Worker A drained → `maybeShutdown(A)` sent shutdown → A exits (clean). Worker B is mid-unit (`B._unit=u, B._idle=false, B._shutdownSent=false`). B exits **code 0** mid-unit (e.g., killed by OS / clean process death before sending result).

B's exit handler (213-231):
- `active--` → suppose active goes 1→0 (A already exited).

  Wait — order matters. Let me be precise. If A exited first, A's exit decremented active. When A exited: `!shuttingDown && !A._shutdownSent` is **false** (A's `_shutdownSent=true`), so no requeue. Refill check (225): `pending.length > 0`? In this scenario A drained the queue, so at A's drain time pending was 0 — but B then died and **requeues** its unit. Sequencing: A exits *before* B dies, so at A's exit `pending.length===0` → no refill → `active===1` (B still alive) → no finish. G
... [+10512 chars truncated]
