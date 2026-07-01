---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Read H:/prism/mcp-server/src/index.ts lines 1310-1330 (maxConnections/keep-alive"
date: "2026-06-09"
first_ts: "2026-06-09T16:17:05.816Z"
last_ts: "2026-06-09T16:18:07.362Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-aebded1db13d9e12a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Read H:/prism/mcp-server/src/index.ts lines 1310-1330 (maxConnections/keep-alive

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-aebded1db13d9e12a.jsonl`

## Transcript

### User | 2026-06-09T16:17:05.816Z

Read H:/prism/mcp-server/src/index.ts lines 1310-1330 (maxConnections/keep-alive capacity tuning) + H:/prism/scripts/mcp-server-supervisor.mjs lines 190-220 (heap floor). Summarize the current capacity model (maxConnections=512; the "26 slots x ~4 + workflow fan-out 16/slot ~= peak 300-400" comment; heap floor 24GB; watchdog preempt 18GB). Then assess under the NEW assumption that the FULL fleet is in ultracode mode launching UNLIMITED Workflow agents: is 512 conns / 24GB heap / NO per-request concurrency cap sufficient, or is an explicit bounded concurrency CAP+QUEUE the only safe memory bound? Return the numbers + a reasoned verdict on the bound needed for "unlimited agents".

### Assistant | 2026-06-09T16:17:12.737Z

I'll read the two specified file regions to assess the capacity model.

### Assistant | 2026-06-09T16:17:13.622Z

[tool_use: Read]

### Assistant | 2026-06-09T16:17:14.430Z

[tool_use: Read]

### User | 2026-06-09T16:17:22.022Z

[tool_result] 1300	  // (~700MB, all engines loaded) instead of exiting → the 11-instance pileup that
1301	  // took :3100 down fleet-wide. exit(0) on EADDRINUSE = "a peer already owns the
1302	  // port, which is success for the fleet" → does NOT trip the supervisor backoff/
1303	  // respawn loop. Any other listen error is fatal (exit 1) so the supervisor restarts.
1304	  httpServer.on("error", (e: NodeJS.Err
... [+2251 chars truncated]

### User | 2026-06-09T16:17:22.039Z

[tool_result] 185	  }
186	  const delay = Math.min(backoffMs, BACKOFF_MAX_MS);
187	  log("info", "Scheduling respawn", { delayMs: delay });
188	  respawnTimer = setTimeout(() => { respawnTimer = null; spawnChild(); }, delay);
189	  // Exponential backoff for next consecutive crash.
190	  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
191	}
192	
193	function spawnChild() {
194	  if (stopping) return;
195	 
... [+2275 chars truncated]

### Assistant | 2026-06-09T16:18:07.362Z

I have both regions. The Read loop warning is a false positive — my two reads were distinct files; I have what I need.

## Capacity Model (current, as-coded)

**Socket ceiling — `index.ts:1313-1326` (MCP-FLEET-CAPACITY-MS0, 2026-06-08):**
- `httpServer.maxConnections = 512` (env `PRISM_MCP_MAX_CONNECTIONS`).
- Sizing rationale in comment: 26 slots × ~4 concurrent `/mcp` calls ≈ 104, PLUS workflow fan-out (a workflow spawns up to **16** concurrent agents, each able to call MCP, across multiple looping slots) → "realistic peak 300-400." 512 = headroom.
- `keepAliveTimeout=65s`, `headersTimeout=70s`, `requestTimeout=0` (no per-request timeout — long tool calls must not be severed).
- Stated assumption: idle keep-alive sockets are "cheap (~few KB each)"; `buildRequestServer()` factory isolates each concurrent request, so maxConnections is described as "purely a socket ceiling."

**Heap floor — `supervisor.mjs:209-215` (BLACKWELL-TUNE, golf 2026-06-09):**
- `heapFloorMB = 24576` (24GB), env `PRISM_MCP_HEAP_FLOOR_MB`; injected as `--max-old-space-size` via `ensureHeapFloor`, larger inherited caps respected.
- History: 4GB was a band-aid for the `error_ledger_recall_similar` retained-reference leak; on the 136GB Blackwell box the 4GB cap forced OOM-restart disconnects every few hours; 24GB pushes the restart horizon ~6× out. **The leak fix is explicitly still owed.**
- Watchdog preemptive restart at ~18GB RSS (per your prompt; the supervisor heap floor sits at 24GB above that trip point).

## Assessment under "full fleet in ultracode launching UNLIMITED Workflow agents"

The current model is sufficient **only because** of one load-bearing assumption baked into the 512/300-400 comment: **the workflow fan-out is bounded at 16 agents/slot.** The new premise deletes that bound. Walk the two axes:

**1. The 512 socket cap is the wrong abstraction, and it is NOT a memory bound.**
The comment is correct that idle sockets are cheap — but that is exactly why `maxConnections` cannot
... [+4769 chars truncated]
