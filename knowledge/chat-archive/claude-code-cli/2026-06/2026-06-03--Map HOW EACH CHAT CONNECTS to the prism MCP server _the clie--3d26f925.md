---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Map HOW EACH CHAT CONNECTS to the prism MCP server (the client/transport contrac"
date: "2026-06-03"
first_ts: "2026-06-03T00:29:34.685Z"
last_ts: "2026-06-03T00:35:29.675Z"
cwd: "H:\\prism-slot-golf"
messages: 79
user_msgs: 35
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a6783aa20a8034f0e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Map HOW EACH CHAT CONNECTS to the prism MCP server (the client/transport contrac

> **claude-code-cli** | 2026-06-03 | 79 msgs (35 user / 44 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a6783aa20a8034f0e.jsonl`

## Transcript

### User | 2026-06-03T00:29:34.685Z

Map HOW EACH CHAT CONNECTS to the prism MCP server (the client/transport contract). Look for the mcpServers / MCP client config: H:/prism/.mcp.json , the "mcpServers" block in C:/Users/wompu/.claude/settings.json (grep "prism" / "3100" / "mcpServers" — do NOT dump the whole file), and any HTTP/SSE transport setup. Determine: is the prism transport stdio or HTTP-to-:3100? Does each of the 26 chats hold its own client? What makes a client consider itself "disconnected", and what reconnect affordance exists client-side (e.g. the /mcp command, per-turn check)? Identify any in-process MCP transport-singleton invariant (search ENGINE_DIGEST / memories for "single-transport" / "already connected to a transport"). KNOWN ROOT-CAUSES this session (do NOT re-derive — verify + extend):
- MCP server is HTTP on 127.0.0.1:3100, entry mcp-server/dist/index.js, ~50s cold boot (loads 64 dispatchers / ~700MB engines).
- Supervised by scripts/mcp-server-supervisor.mjs + Windows scheduled tasks "PRISM MCP Server" + "PRISM MCP Server Watchdog".
- MULTI-INSTANCE LEAK: three uncoordinated restarters (Watchdog task, supervisor, per-chat auto-reconnect hook) all respawn dist/index.js when :3100 looks down WITHOUT reaping stale instances -> N instances race to bind one port -> bind contention -> flapping (positive feedback).
- FALSE-POSITIVE PROBE: a short connectivity timeout under host CPU load reads a healthy server as down -> spawns a transient 2nd instance.
- BOOT-RESET FLAP: restarting a server that is still in its ~50s boot resets the clock -> perpetual DOWN.
- PARTIAL FIX SHIPPED: bind-fail-fast preflight (commit 2167e22cc8, "FIX1+2") makes a losing instance exit fast so a healthy port self-converges 2->1 in ~15s.
- DESIGNED-NOT-SHIPPED: a unified single-flight lock mcp-server-3100.lock shared by ALL THREE restarters ("FIX4/6"), plus a "process-exists-but-not-yet-healthy = BOOTING, leave alone" guard.
- RELATED REGRESSION: heartbeat-keepalive 8ms-timeout typo broke chat-slot heartbeat
... [+273 chars truncated]

### Assistant | 2026-06-03T00:29:48.984Z

I'll map how each chat connects to the prism MCP server by examining the client/transport configuration and identifying the connection architecture.

### Assistant | 2026-06-03T00:29:49.194Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:29:49.417Z

[tool_use: Read]

### Assistant | 2026-06-03T00:29:49.725Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:29:49.947Z

[tool_use: Bash]

### User | 2026-06-03T00:30:09.794Z

[tool_result] state\shared\claude-user-mirror\.mcp.json
.mcp.json

### User | 2026-06-03T00:30:12.931Z

[tool_result] 1	{
2	  "mcpServers": {
3	    "prism": {
4	      "type": "stdio",
5	      "command": "node",
6	      "args": [
7	        "H:/prism/.claude/helpers/mcp-http-bridge.mjs"
8	      ],
9	      "env": {
10	        "MCP_HTTP_URL": "http://127.0.0.1:3100/mcp",
11	        "MCP_MAX_CONCURRENT": "3",
12	        "MCP_TIMEOUT": "120000",
13	        "LOG_LEVEL": "info",
14	        "PRISM_MCP_READY_BUDGET_MS": "1
... [+42 chars truncated]

### User | 2026-06-03T00:30:59.157Z

[tool_result] (Bash completed with no output)

### User | 2026-06-03T00:30:59.592Z

[tool_result]     "prism",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/session-id-pin.mjs",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/session-start-terminal-pin.mjs",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/slot-session-sidecar-sessionstart.mjs",
            "command": "\"H:/.claude/bin/portable-nod
... [+1671 chars truncated]

### Assistant | 2026-06-03T00:31:01.109Z

Now let me examine the MCP HTTP bridge and the mcp-server setup:

### Assistant | 2026-06-03T00:31:01.632Z

[tool_use: Read]

### Assistant | 2026-06-03T00:31:01.840Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:31:01.958Z

[tool_use: Read]

### Assistant | 2026-06-03T00:31:02.185Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:31:02.614Z

[tool_use: Bash]

### User | 2026-06-03T00:31:13.923Z

[tool_result] H:/prism/mcp-server/dist\registries\index.js
H:/prism/mcp-server/dist\mcp\index.js
H:/prism/mcp-server/dist\algorithms\index.js
H:/prism/mcp-server/dist\generators\index.js
H:/prism/mcp-server/dist\hooks\index.js
H:/prism/mcp-server/dist\engines\index.js
H:/prism/mcp-server/dist\knowledge\index.js
H:/prism/mcp-server/dist\services\interfaces\index.js
H:/prism/mcp-server/dist\services\index.js
H:/p
... [+258 chars truncated]

### User | 2026-06-03T00:31:14.505Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
4	 *
5	 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
6	 * driven). Designed to run as a Windows scheduled task on AtStartup +
7	 * AtLogon so the server is up before any Claude Code chat opens. Also runs
8	 * on-demand from the CLI.
9	 *
10	 * Behavior:
11	 *   -
... [+3729 chars truncated]

### User | 2026-06-03T00:31:14.667Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-http-bridge.mjs - Stdio-to-HTTP MCP Bridge with Request Queue + self-heal
4	 *
5	 * Solves the multi-chat MCP contention problem:
6	 * - Each Claude chat connects via stdio to THIS bridge
7	 * - Bridge forwards requests to a single shared HTTP MCP server
8	 * - Request queue prevents concurrent tool call collisions
9	 * - Connection pooling keeps HTTP overhead 
... [+22126 chars truncated]

### User | 2026-06-03T00:31:28.718Z

[tool_result] total 16839
drwxr-xr-x 1 wompu 197611       0 Jun  1 09:30 ./
drwxr-xr-x 1 wompu 197611       0 Jun  2 12:30 ../
-rw-r--r-- 1 wompu 197611    1278 May 28 23:09 .env
drwxr-xr-x 1 wompu 197611       0 May 20 17:21 __tests__/
drwxr-xr-x 1 wompu 197611       0 Jun  1 09:28 algorithms/
drwxr-xr-x 1 wompu 197611       0 May 20 17:21 architecture/
drwxr-xr-x 1 wompu 197611       0 May 20 17:21 bot/
drwxr
... [+676 chars truncated]

### User | 2026-06-03T00:31:59.440Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-06-03T00:32:01.134Z

Let me continue examining the supervisor and the Windows scheduled tasks setup:

### Assistant | 2026-06-03T00:32:01.783Z

[tool_use: Read]

### Assistant | 2026-06-03T00:32:02.214Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:32:02.625Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:32:03.213Z

[tool_use: Grep]

### User | 2026-06-03T00:32:05.879Z

[tool_result] 100	    // EPERM means it exists but we lack rights — still alive.
101	    return e && e.code === "EPERM";
102	  }
103	}
104	
105	function acquirePidLock() {
106	  try {
107	    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
108	  } catch {}
109	  // Stale-pid recovery: if a prior supervisor crashed, its PID file lingers
110	  // but the PID is dead → overwrite.
111	  if (fs.existsSync
... [+6185 chars truncated]

### User | 2026-06-03T00:32:27.683Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ScheduledTask: command not found
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Format-Table: command not found

### User | 2026-06-03T00:32:27.683Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(Get-ScheduledTask -TaskName "PRISM MCP S…) errored</tool_use_error>

### User | 2026-06-03T00:32:27.683Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(Get-ScheduledTask -TaskName "PRISM MCP S…) errored</tool_use_error>

### Assistant | 2026-06-03T00:32:29.338Z

Let me check the Windows scheduled task setup and slot session hooks using PowerShell:

### Assistant | 2026-06-03T00:32:29.850Z

[tool_use: PowerShell]

### Assistant | 2026-06-03T00:32:30.656Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:32:31.218Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:32:31.219Z

[tool_use: Glob]

### User | 2026-06-03T00:32:38.743Z

[tool_result] [32;1mTaskName                 [0m[32;1m State[0m
[32;1m--------                 [0m [32;1m-----[0m
PRISM MCP Server          Ready
PRISM MCP Server Watchdog Ready

### User | 2026-06-03T00:32:45.409Z

[tool_result] H:/prism/.claude/hooks\__tests__\token-awareness-sidecar.test.mjs
H:/prism/.claude/hooks\memory-index-sidecar-regen.mjs
H:/prism/.claude/hooks\token-awareness-sidecar.mjs
H:/prism/.claude/hooks\slot-session-sidecar-sessionstart.mjs
H:/prism/.claude/hooks\slot-session-sidecar-heartbeat.mjs
H:/prism/.claude/hooks\slot-session-sidecar-stop.mjs

### User | 2026-06-03T00:32:46.090Z

[tool_result] H:/prism/.claude/hooks\session-start-causal-trace.mjs
H:/prism/.claude/hooks\session-start-compact-p1.mjs
H:/prism/.claude/hooks\session-start-goal-inject.mjs
H:/prism/.claude/hooks\session-start-p1.mjs
H:/prism/.claude/hooks\session-start-zombie-reap.mjs
H:/prism/.claude/hooks\sessionstart-critical-path.mjs
H:/prism/.claude/hooks\session_start_inventory_inject.mjs
H:/prism/.claude/hooks\session_s
... [+953 chars truncated]

### User | 2026-06-03T00:32:47.299Z

[tool_result] Found 50 files limit: 50
H:\prism\.claude\hooks\mcp-connectivity-check.mjs
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.claude\hooks\mcp-route-suggest.mjs
H:\prism\.claude\hooks\prompt-rules-inject.mjs
H:\prism\.claude\hooks\slot-session-sidecar-heartbeat.mjs
H:\prism\.claude\hooks\slot-session-sidecar-sessionstart.mjs
H:\prism\.claude\hooks\mcp-broadcast-reconnect-inject.mjs
H:\prism\.claude\h
... [+2329 chars truncated]

### Assistant | 2026-06-03T00:32:48.979Z

Now let me examine the critical sidecar and heartbeat hooks:

### Assistant | 2026-06-03T00:32:49.216Z

[tool_use: Read]

### Assistant | 2026-06-03T00:32:49.408Z

[tool_use: Read]

### Assistant | 2026-06-03T00:32:49.797Z

[tool_use: Read]

### Assistant | 2026-06-03T00:32:49.909Z

[tool_use: Read]

### User | 2026-06-03T00:33:00.214Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * slot-session-sidecar-sessionstart.mjs — SessionStart hook (U-SR02)
5	 *
6	 * SLOT-RECOVERY-MS0/U-SR02 (2026-05-25, slot:golf)
7	 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §4
8	 *
9	 * Records a session-start event in state/shared/slot-sessions/<slot>.jsonl
10	 * for the current chat. The shared helper handles the crash-inferred
11	 * invariant —
... [+2434 chars truncated]

### User | 2026-06-03T00:33:00.514Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * slot-session-sidecar-heartbeat.mjs — UserPromptSubmit heartbeat hook (U-SR03)
5	 *
6	 * SLOT-RECOVERY-MS0/U-SR03 (2026-05-25, slot:golf)
7	 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §4
8	 *
9	 * Appends a heartbeat event to state/shared/slot-sessions/<slot>.jsonl on
10	 * every UserPromptSubmit, throttled to once per 60s per slot. This keeps
11	
... [+4587 chars truncated]

### User | 2026-06-03T00:33:00.531Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * heartbeat-keepalive.mjs — UserPromptSubmit hook that refreshes this chat's
5	 * chat-slots.json heartbeat between tool calls.
6	 *
7	 * Why this exists:
8	 *   Before this hook, a chat that sat idle for >10 min (CRASH_TTL_MS) would
9	 *   have its slot reclaimed by the next peer chat's /checkin — even though
10	 *   the chat was perfectly alive, just 
... [+3848 chars truncated]

### User | 2026-06-03T00:33:00.565Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * chat-slot-heartbeat.mjs — PostToolUse hook (all matchers)
5	 *
6	 * The missing middle of the fleet-slot lifecycle:
7	 *
8	 *   SessionStart  →  session-start-claim-slot.mjs   (claims a slot)
9	 *   PostToolUse   →  chat-slot-heartbeat.mjs        (THIS — keeps it warm)   ← was never built
10	 *   Stop          →  stop-release-slot.mjs          (releas
... [+3160 chars truncated]

### Assistant | 2026-06-03T00:33:02.721Z

Let me continue examining the chat-slot heartbeat and look at the MCP connectivity check hook:

### Assistant | 2026-06-03T00:33:03.195Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:03.362Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:03.857Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:04.336Z

[tool_use: Bash]

### User | 2026-06-03T00:33:12.808Z

[tool_result] 80	  } catch { /* fall through */ }
81	  // Fallback — let the canonical resolver try PID pins / env / transcript.
82	  if (existsSync(STABLE_ID_HELPER)) {
83	    try {
84	      const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
85	        input: rawStdin || "",
86	        encoding: "utf-8",
87	        timeout: 2000,
88	      });
89	      if (r.status === 0 && r.stdout) {
90	        const
... [+1582 chars truncated]

### User | 2026-06-03T00:33:12.876Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+4271 chars truncated]

### User | 2026-06-03T00:33:13.031Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-broadcast-reconnect-inject.mjs — UserPromptSubmit hook.
4	 * Surfaces a "/mcp reconnect" nudge when a fleet-wide MCP reconnect signal
5	 * is newer than this chat's last-seen timestamp. Tracks per-chat "seen"
6	 * state in .claude/cache/mcp-broadcast-seen-<chatId>.ts.
7	 *
8	 * Knobs:
9	 *   PRISM_MCP_BROADCAST_INJECT_DISABLE=1   disable
10	 *   PRISM_MCP_BROAD
... [+3868 chars truncated]

### User | 2026-06-03T00:33:24.108Z

[tool_result] H:/prism/mcp-server/src/constants.ts:/** Maximum characters for a single MCP tool text response — long replies are truncated to keep transport payloads bounded. */
H:/prism/mcp-server/src/data/docs/MASTER_INDEX_COMPACT.md:- ENGINE_DIGEST.md: mcp-server/data/docs/ENGINE_DIGEST.md (3280 engines)
H:/prism/mcp-server/src/engines/agent-orchestration/MEMORY.md:Galaxy brain docs live at `mcp-server/src/e
... [+3674 chars truncated]

### Assistant | 2026-06-03T00:33:26.003Z

Let me now examine how the 26 chats connect and check for the single-transport invariant in the MCP SDK:

### Assistant | 2026-06-03T00:33:26.643Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:33:27.104Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:33:27.476Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:27.884Z

[tool_use: Bash]

### User | 2026-06-03T00:33:32.547Z

[tool_result] 1	/**
2	 * MCP Barrel File — Re-exports core MCP utilities
3	 * @module mcp/index
4	 */
5	
6	import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
7	import { log } from "../utils/Logger.js";
8	
9	/** Stub: registerResources - resource registration handled elsewhere */
10	export function registerResources(_server: Server): void {
11	  log.debug("[mcp/index] registerResources call
... [+682 chars truncated]

### User | 2026-06-03T00:33:41.907Z

[tool_result] H:/prism/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/auth-extensions.d.ts
H:/prism/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/auth-extensions.js
H:/prism/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/auth.d.ts
H:/prism/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/auth.js
H:/prism/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.d.ts
H:/prism/no
... [+1233 chars truncated]

### User | 2026-06-03T00:33:42.817Z

[tool_result] H:/prism/mcp-server/src/data/academy/course-28-function-index-reference.ts:      "23 (closes the /goal axis 'include every single function and input possible for each cad and cam system')",
H:/prism/mcp-server/src/data/academy/course-28-function-index-reference.ts:    quizExplanation: "Per PRISM Academy courses 18-28: 23 priority CAM systems have BOTH entry-level training (courses 18-27) AND funct
... [+8334 chars truncated]

### User | 2026-06-03T00:33:48.755Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Where-Object: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-06-03T00:33:50.432Z

Let me check the MCP server entry point and the HTTP transport setup:

### Assistant | 2026-06-03T00:33:50.641Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:51.273Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:33:51.926Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:33:52.001Z

[tool_use: Read]

### User | 2026-06-03T00:33:52.294Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Provides access to:
6	 * - 55 dispatchers, 1670+ verified actions
7	 * - 554 engine files (561 exported), 23 registries
8	 * - Materials Database (6,372+ materials x 127 parameters)
9	 * - Machines Database (1,015+ machines x 4 layers)
10	 * - Controller Alarms (10,033+ alarms x 12 families)
11	 * 
... [+8392 chars truncated]

### User | 2026-06-03T00:34:02.776Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### User | 2026-06-03T00:34:05.918Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Route Registry
3	 * Central registration for all API route modules
4	 *
5	 * 41 route modules:
6	 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
7	 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
8	 * - PPG (8), Learning (10), ERP (10)
9	 * - EDM (7), Turning (6)
10	 * - Threads (12), Compliance (8), Telemetry 
... [+3769 chars truncated]

### User | 2026-06-03T00:34:13.359Z

[tool_result] 20:import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
406:const server = new McpServer({
411:// MCP-CONCURRENCY-FIX (2026-05-31): the official MCP SDK enforces ONE transport per
412:// McpServer instance (sdk/shared/protocol.js:217 — "Already connected to a transport").
413:// The HTTP /mcp handler used to call server.connect(transport) on this MODU
... [+1091 chars truncated]

### Assistant | 2026-06-03T00:34:15.240Z

Perfect! I now have all the information needed to map the connection architecture. Let me create the comprehensive output:

### Assistant | 2026-06-03T00:35:18.219Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:35:20.896Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:35:29.675Z

## Summary

I've mapped the complete MCP server connectivity architecture for the 26-chat fleet:

**Key Architecture:**
- **26 chats** → **1 shared stdio bridge process** (mcp-http-bridge.mjs) → **1 HTTP server** at 127.0.0.1:3100
- Bridge uses request queue (max 3 concurrent), retry with exponential backoff, and self-heal spawning of supervisor
- Server uses **per-request McpServer instance** pattern (FIX applied 2026-05-31) to avoid "Already connected to a transport" collisions from the MCP SDK's single-transport invariant

**Heartbeat & Reconnection System:**
- 5 hooks maintain uptime: slot-session sidecar, chat-slot heartbeat, heartbeat-keepalive, mcp-connectivity-check, mcp-broadcast-reconnect
- Connectivity check probes :3100 with 1s timeout, throttled 30s, injects disconnect banner
- Broadcast signal enables fleet-wide "/mcp reconnect" nudge with per-chat seen-state tracking

**Root Causes of Flapping (from system brief):**
1. Three uncoordinated restarters race without synchronization → multi-instance bind contention
2. Boot-reset flap when respawning during cold-start resets the 50s clock
3. False-positive probes under CPU load spawn transient instances
4. Partial fix shipped (bind-fail-fast) only addresses #2-3; designed fix (unified lock + BOOTING state) not yet shipped

**Critical Gaps:**
- No unified single-flight lock (FIX4/6 designed but unshipped)
- No "process-exists-but-not-yet-healthy = BOOTING" guard
- No fleet-wide respawn coordination
- Heartbeat timeout typo precedent (8ms regression) suggests timeout knobs need hardening
- Tool-domain filter (U-MCP-ROLLOUT) not yet empirically validated in production

The structured output above details all 26 connection paths, the three restarter race conditions, 10 failure modes, and 12 hardening recommendations to keep the MCP server reachable for every chat "no matter what."
