---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Map the MCP SERVER SUPERVISION layer. Read in full: H:/prism/scripts/mcp-server-"
date: "2026-06-03"
first_ts: "2026-06-03T00:29:34.683Z"
last_ts: "2026-06-03T00:40:08.253Z"
cwd: "H:\\prism-slot-golf"
messages: 71
user_msgs: 30
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-ada8aa2790fbac838.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Map the MCP SERVER SUPERVISION layer. Read in full: H:/prism/scripts/mcp-server-

> **claude-code-cli** | 2026-06-03 | 71 msgs (30 user / 41 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-ada8aa2790fbac838.jsonl`

## Transcript

### User | 2026-06-03T00:29:34.683Z

Map the MCP SERVER SUPERVISION layer. Read in full: H:/prism/scripts/mcp-server-supervisor.mjs ; any H:/prism/.claude/helpers/install-*mcp* or install scripts that register the "PRISM MCP Server" / "PRISM MCP Server Watchdog" scheduled tasks ; H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs (the --services=mcp path) ; mcp-server/dist/index.js startup/port-bind code (or its src mcp-server/src/index.ts http/port-bind + any bind-fail-fast preflight). Determine: how dist/index.js is launched, how the port :3100 is bound, whether a single-flight lock (mcp-server-3100.lock) exists and who honors it, what the Watchdog re-launch condition is, and exactly where uncoordinated respawns originate. KNOWN ROOT-CAUSES this session (do NOT re-derive — verify + extend):
- MCP server is HTTP on 127.0.0.1:3100, entry mcp-server/dist/index.js, ~50s cold boot (loads 64 dispatchers / ~700MB engines).
- Supervised by scripts/mcp-server-supervisor.mjs + Windows scheduled tasks "PRISM MCP Server" + "PRISM MCP Server Watchdog".
- MULTI-INSTANCE LEAK: three uncoordinated restarters (Watchdog task, supervisor, per-chat auto-reconnect hook) all respawn dist/index.js when :3100 looks down WITHOUT reaping stale instances -> N instances race to bind one port -> bind contention -> flapping (positive feedback).
- FALSE-POSITIVE PROBE: a short connectivity timeout under host CPU load reads a healthy server as down -> spawns a transient 2nd instance.
- BOOT-RESET FLAP: restarting a server that is still in its ~50s boot resets the clock -> perpetual DOWN.
- PARTIAL FIX SHIPPED: bind-fail-fast preflight (commit 2167e22cc8, "FIX1+2") makes a losing instance exit fast so a healthy port self-converges 2->1 in ~15s.
- DESIGNED-NOT-SHIPPED: a unified single-flight lock mcp-server-3100.lock shared by ALL THREE restarters ("FIX4/6"), plus a "process-exists-but-not-yet-healthy = BOOTING, leave alone" guard.
- RELATED REGRESSION: heartbeat-keepalive 8ms-timeout typo broke chat-slot heartbeat fleet-wide (c
... [+259 chars truncated]

### Assistant | 2026-06-03T00:29:48.809Z

I'll map the MCP SERVER SUPERVISION layer by reading the specified files and understanding the architecture, port binding, lock mechanisms, and restart conditions.

### Assistant | 2026-06-03T00:29:49.045Z

[tool_use: Read]

### Assistant | 2026-06-03T00:29:49.595Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:29:49.600Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:29:49.735Z

[tool_use: Read]

### Assistant | 2026-06-03T00:29:49.942Z

[tool_use: Read]

### User | 2026-06-03T00:30:09.948Z

[tool_result] H:/prism/.claude/helpers\install-system-awareness-freshness-task.ps1
H:/prism/.claude/helpers\install-blueprint-join-refresh-task.ps1
H:/prism/.claude/helpers\install-node-cleaner-task.ps1
H:/prism/.claude/helpers\install-mcp-server-watchdog-task.ps1
H:/prism/.claude/helpers\install-zulu-orchestrator-task.ps1
H:/prism/.claude/helpers\install-mcp-server-task.ps1
H:/prism/.claude/helpers\install-bra
... [+1491 chars truncated]

### User | 2026-06-03T00:30:09.995Z

[tool_result] H:/prism/.claude/helpers\install-mcp-server-watchdog-task.ps1
H:/prism/.claude/helpers\install-mcp-server-task.ps1
H:/prism/.claude/helpers\install-mcp-monitor-task.ps1

### User | 2026-06-03T00:30:12.253Z

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
... [+12874 chars truncated]

### User | 2026-06-03T00:30:12.925Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-docker-launcher.mjs — Idempotent Docker/Ollama activator
4	 *
5	 * Brings up the PRISM local compute stack:
6	 *   1. Launches Docker Desktop if stopped (Windows-aware)
7	 *   2. Waits for Docker daemon ready (timeout-guarded)
8	 *   3. Brings up requested compose services (default: postgres, prism-server,
9	 *      prometheus, ollama, qdrant) via docker-com
... [+16938 chars truncated]

### User | 2026-06-03T00:30:12.968Z

[tool_result] 1	import { createRequire as __esmCreateRequire } from 'module'; import { fileURLToPath as __esmFileURLToPath } from 'url'; import { dirname as __esmDirname } from 'path'; var require = __esmCreateRequire(import.meta.url); var __filename = __esmFileURLToPath(import.meta.url); var __dirname = __esmDirname(__filename);
2	import {
3	  ORANGE_VISE_SPECS,
4	  findSoftJaws,
5	  findVise,
6	  findVisesByJ
... [+5245 chars truncated]

### Assistant | 2026-06-03T00:30:14.938Z

Let me read the source TypeScript file for the MCP server to understand the port binding and preflight logic.

### Assistant | 2026-06-03T00:30:15.397Z

[tool_use: Glob]

### Assistant | 2026-06-03T00:30:15.853Z

[tool_use: Read]

### Assistant | 2026-06-03T00:30:16.034Z

[tool_use: Read]

### User | 2026-06-03T00:30:20.355Z

[tool_result] H:/prism/mcp-server/src\generators\index.ts
H:/prism/mcp-server/src\registries\index.ts
H:/prism/mcp-server/src\shared\index.ts
H:/prism/mcp-server/src\utils\index.ts
H:/prism/mcp-server/src\services\interfaces\index.ts
H:/prism/mcp-server/src\cli\index.ts
H:/prism/mcp-server/src\algorithms\index.ts
H:/prism/mcp-server/src\services\index.ts
H:/prism/mcp-server/src\knowledge\index.ts
H:/prism/mcp-s
... [+243 chars truncated]

### User | 2026-06-03T00:30:22.237Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM MCP Server',
3	  [switch]$DryRun,
4	  [switch]$RunNow,
5	  [switch]$Uninstall,
6	  [switch]$Interactive,
7	  [switch]$AsCurrentUser,
8	  [switch]$AsSystem
9	)
10	
11	# install-mcp-server-task.ps1 - durable autostart for the PRISM HTTP MCP server.
12	#
13	# Registers a Windows Scheduled Task that runs `mcp-server-supervisor.mjs`
14	# at boot and at every user
... [+4878 chars truncated]

### User | 2026-06-03T00:30:22.470Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM MCP Server Watchdog',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset so this task doesn't fire at the same wall-clock minute as
5	  # the supervisor (AtStartup+AtLogon only) / fleet-reaper (+210s) / memory
6	  # monitor (+330s). +90s lands between them on the 5-min cycle.
7	  [int]$StartOffsetSeconds = 90,
8	  [switch]$DryRun,
9	  [switch]$RunNow,
10	  [swit
... [+4393 chars truncated]

### Assistant | 2026-06-03T00:30:24.077Z

I'll continue reading the MCP server source and the watchdog script to complete the map.

### Assistant | 2026-06-03T00:30:24.490Z

[tool_use: Read]

### Assistant | 2026-06-03T00:30:24.912Z

[tool_use: Read]

### Assistant | 2026-06-03T00:30:25.100Z

[tool_use: Bash]

### User | 2026-06-03T00:30:32.710Z

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
... [+17803 chars truncated]

### User | 2026-06-03T00:30:34.917Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+8563 chars truncated]

### User | 2026-06-03T00:34:37.697Z

[tool_result] H:/prism/cad-engine/.venv/Lib/site-packages/anthropic/types/beta/beta_mcp_tool_result_block.py
H:/prism/cad-engine/.venv/Lib/site-packages/anthropic/types/beta/beta_mcp_tool_use_block.py
H:/prism/cad-engine/.venv/Lib/site-packages/anthropic/types/beta/beta_mcp_tool_use_block_param.py
H:/prism/cad-engine/.venv/Lib/site-packages/anthropic/types/beta/beta_request_mcp_tool_result_block_param.py
H:/pri
... [+529 chars truncated]

### Assistant | 2026-06-03T00:34:39.739Z

I found a relevant lock file. Let me continue reading the watchdog and look for the actual lock implementation.

### Assistant | 2026-06-03T00:34:40.164Z

[tool_use: Read]

### Assistant | 2026-06-03T00:34:40.622Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:34:41.469Z

[tool_use: Grep]

### User | 2026-06-03T00:34:44.100Z

[tool_result] 200	  } else {
201	    log("warn", "No listener PID found on port — server may already be down", { port: SERVER_PORT });
202	  }
203	  // Step 2: spawn the supervisor detached. It probes /health first
204	  // (idempotent) and only spawns the server if it's confirmed down.
205	  if (!fs.existsSync(SUPERVISOR_SCRIPT)) {
206	    log("error", "Supervisor script not found — cannot respawn", { path: SU
... [+4057 chars truncated]

### User | 2026-06-03T00:34:47.127Z

[tool_result] Found 30 files limit: 30
H:\prism\mcp-server\src\index.ts
H:\prism\mcp-server\src\engines\FinancialReportSuiteEngine.ts
H:\prism\mcp-server\src\__tests__\FinancialReportSuiteEngine.test.ts
H:\prism\mcp-server\src\engines\AISystemRouterEngine.ts
H:\prism\mcp-server\src\__tests__\MemoryGraphEngine.test.ts
H:\prism\mcp-server\src\engines\MemoryGraphEngine.ts
H:\prism\mcp-server\src\data\tribal-tips\j
... [+1428 chars truncated]

### User | 2026-06-03T00:35:19.165Z

[tool_result] H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/__tests__/WEDMDwgImportEngine-mcp.test.ts
H:/prism/.claude/worktrees/agent-a0310b5d699214970/mcp-server/src/__tests__/WEDMDwgImportEngine-mcp.test.ts
H:/prism/.claude/worktrees/agent-a37d7460d5d653f84/mcp-server/src/__tests__/WEDMDwgImportEngine-mcp.test.ts
H:/prism/.claude/worktrees/agent-a4553ad14430ed1b4/mcp-server/src/__tests__/
... [+1736 chars truncated]

### Assistant | 2026-06-03T00:35:20.835Z

Let me search more specifically for the HTTP server setup and port binding in the MCP server source.

### Assistant | 2026-06-03T00:35:21.708Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:35:22.065Z

[tool_use: Bash]

### User | 2026-06-03T00:35:28.772Z

[tool_result] 903:// TRANSPORT HANDLERS
944:  // HARDEN (golf 2026-06-02 MCP-HARDEN) FIX 2 — pre-bootstrap port preflight.
946:  // NOT run if :PORT is already owned by a peer — that is exactly how the
949:  // FIRST if a peer owns it. FIX 1 (httpServer 'error' handler at app.listen)
950:  // closes the residual TOCTOU window between this probe closing and the real listen.
952:    const pfPort = parseInt(proces
... [+1010 chars truncated]

### User | 2026-06-03T00:35:34.328Z

[tool_result] 20:import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
949:  // FIRST if a peer owns it. FIX 1 (httpServer 'error' handler at app.listen)
950:  // closes the residual TOCTOU window between this probe closing and the real listen.
957:        if (e.code === "EADDRINUSE") {
961:        resolve(); // non-EADDRINUSE probe error: proceed; the real listen w
... [+627 chars truncated]

### Assistant | 2026-06-03T00:35:36.130Z

Let me read the full HTTP server setup section from index.ts to understand the complete port binding flow.

### Assistant | 2026-06-03T00:35:36.557Z

[tool_use: Read]

### Assistant | 2026-06-03T00:35:36.976Z

[tool_use: Read]

### Assistant | 2026-06-03T00:35:37.539Z

[tool_use: Grep]

### User | 2026-06-03T00:35:38.685Z

[tool_result] 900	}
901	
902	// ============================================================================
903	// TRANSPORT HANDLERS
904	// ============================================================================
905	
906	/**
907	 * Run server with stdio transport (for local MCP clients)
908	 */
909	async function runStdio(): Promise<void> {
910	  // H1-MS4: Generate unique session ID for MemGraph trackin
... [+11468 chars truncated]

### User | 2026-06-03T00:35:39.553Z

[tool_result] 1280	    );
1281	
1282	    app.get(/^(?!\/(?:api|mcp|health|ready|metrics|\.well-known|ws)(?:\/|$)).*/, (_req, res) => {
1283	      res.sendFile(frontendIndexPath);
1284	    });
1285	
1286	    log.info(`[WEB] Serving built frontend from ${frontendDistDir}`);
1287	  } else {
1288	    log.warn(`[WEB] Built frontend not found at ${frontendDistDir}; HTTP mode serving API only`);
1289	  }
1290	  
1291	
... [+5027 chars truncated]

### User | 2026-06-03T00:36:02.585Z

[tool_result] Found 14 files
H:\prism\knowledge\memories\reference\reference_mcp_multi_instance_leak_3100_2026_06_02.md
H:\prism\knowledge\memories\feedback\feedback_mcp_autoreconnect_each_turn.md
H:\prism\.claude\hooks\mcp-connectivity-check.mjs
H:\prism\knowledge\wiki\code-tribal\learnings\mcp-autoreconnect-ms0-u-mcp-reconnect-action.md
H:\prism\data\roadmap-index.json
H:\prism\knowledge\wiki\code-tribal\lear
... [+460 chars truncated]

### Assistant | 2026-06-03T00:36:04.510Z

Perfect! I found the auto-reconnect references. Let me read those files to understand the third restarter.

### Assistant | 2026-06-03T00:36:04.711Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:04.928Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:05.169Z

[tool_use: Read]

### User | 2026-06-03T00:36:07.048Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' was already read 4m ago in this session and is unchanged (mtime 1780371873238). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T00:36:07.277Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-broadcast-reconnect-inject.mjs' was already read 51s ago in this session and is unchanged (mtime 1779679859303). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-03T00:36:08.238Z

[tool_result] 1	---
2	name: feedback_mcp_autoreconnect_each_turn
3	description: "Standing rule — if the MCP daemon is disconnected, the fleet auto-reconnects each turn (single-flight), never advisory-only. Enforced by the per-turn connectivity hook calling maybeReconnect()."
4	type: feedback
5	source: prism-memory
6	synced: 2026-06-03T00:35:12.431Z
7	aliases: feedback_mcp_autoreconnect_each_turn
8	---
9	
10	
11
... [+2549 chars truncated]

### Assistant | 2026-06-03T00:36:10.665Z

Excellent! Now I have the full picture. Let me search for the actual mcp-reconnect-action.mjs file to understand the single-flight lock implementation.

### Assistant | 2026-06-03T00:36:11.044Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:11.154Z

[tool_use: Bash]

### User | 2026-06-03T00:36:17.033Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-reconnect-action.mjs' was already read 6m ago in this session and is unchanged (mtime 1780264997231). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T00:36:49.734Z

[tool_result] H:/prism/knowledge/wiki/code-tribal/learnings/mcp-autoreconnect-ms0-u-mcp-reconnect-action.md
H:/prism/knowledge/wiki/code-tribal/learnings/mcp-autoreconnect-ms0-u-mcp-reconnect-wire.md
H:/prism/scripts/lib/mcp-reconnect-action.mjs
H:/prism/scripts/lib/mcp-reconnect-action.test.mjs
H:/prism/scripts/mcp-reconnect.mjs
H:/prism/state/shared/mcp-reconnect-signal.json
H:/prism/state/shared/.mcp-reconne
... [+7 chars truncated]

### Assistant | 2026-06-03T00:36:51.659Z

Let me read the mcp-reconnect-action.mjs file with Grep to see the actual lock implementation since it's already in cache.

### Assistant | 2026-06-03T00:36:52.296Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:36:52.743Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:52.940Z

[tool_use: Bash]

### User | 2026-06-03T00:36:56.014Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/mcp-reconnect.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION CLI (alpha, 2026-05-31).
3	//
4	// Probe the shared MCP daemon and, if down, single-flight a detached reconnect (see
5	// scripts/lib/mcp-reconnect-action.mjs). Directly runnable by any chat / scheduled task; the
6	// per-turn enforcement path is the connectivity hook calling maybeReconnect() (gol
... [+1957 chars truncated]

### User | 2026-06-03T00:36:57.401Z

[tool_result] 13://     a fleet single-flight, throttled, detached reconnect the per-turn hook calls when down.
21://   • single-flights across the whole fleet via an O_EXCL lockfile whose TTL doubles as the
22://     throttle (one host, shared H: fs, sole user → O_EXCL is reliable)
26://   • PURE decision core (`decideReconnect`) + injected-deps orchestrator (`maybeReconnect`)
31:// Knobs: PRISM_MCP_AUTORECONN
... [+1402 chars truncated]

### User | 2026-06-03T00:37:02.279Z

[tool_result] -rw-r--r-- 1 wompu 197611 39 Jun  2 19:24 H:/prism/state/shared/.mcp-reconnect.lock

### Assistant | 2026-06-03T00:37:05.052Z

Perfect! I now have all the information needed to map the MCP SERVER SUPERVISION layer. Let me compile the comprehensive report.

### Assistant | 2026-06-03T00:38:35.585Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:38:36.710Z

[tool_result] Output does not match required schema: /failureModes: must be array, /existingAssets: must be array, /gaps: must be array, /recommendations: must be array

### Assistant | 2026-06-03T00:38:38.722Z

Let me reformat with proper array structures.

### Assistant | 2026-06-03T00:39:56.396Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:39:57.366Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:40:08.253Z

Perfect! I've completed the comprehensive mapping of the MCP SERVER SUPERVISION layer. Here's a summary of what was delivered:

## Summary

I mapped the **MCP SERVER SUPERVISION LAYER** across 3 independent restarters that coordinate (or fail to coordinate) to keep the MCP server at `127.0.0.1:3100` running:

### **Key Findings**

**How the MCP server is launched:**
- Entry: `H:/prism/mcp-server/dist/index.js` (from `src/index.ts`)
- Transport: HTTP, port 3100 (configurable)
- Port binding: Two-layer hardening (FIX 1+2, golf 2026-06-02):
  - **Preflight probe** (lines 944–966): Net.createServer() listen before expensive bootstrap; if EADDRINUSE, exit(0) immediately
  - **Error handler** (lines 1304–1311): Express httpServer.on("error") catches EADDRINUSE, exits cleanly(0); other errors exit(1) for supervisor retry
- Cold boot: ~50s (~700MB engines loaded)

**Three Uncoordinated Restarters:**
1. **Supervisor** (`mcp-server-supervisor.mjs`): Long-running loop, PID-locked, respawns child with exponential backoff
2. **Watchdog** (`mcp-server-watchdog.mjs`): 5-min periodic wedge detector, escalates to taskkill + respawn after 2 consecutive failures (10 min confirmed down), also preemptively restarts on RSS pressure (≥3GB)
3. **Per-Chat Auto-Reconnect Hook** (`mcp-connectivity-check.mjs`): Every chat turn, if :3100 down, calls `maybeReconnect()` which single-flights a spawn via O_EXCL lock at `H:/prism/state/shared/.mcp-reconnect.lock` (60s TTL)

**CRITICAL GAP: No Unified Port Lock**
- Designed (FIX4/6) but **NOT SHIPPED**: `mcp-server-3100.lock` shared by all three restarters
- **Current race condition**: Under host CPU load, N instances can race to bind :3100 simultaneously. While FIX 1+2 cause losers to exit(0) fast, each still wastes ~700MB and ~50s boot resources
- **Missing "BOOTING" guard**: No way for peer respawners to detect "new instance is still in cold boot"

**Boot-Reset Flap Risk:**
- When restart begins during prior cold boot: new instance finds :3100 bou
... [+411 chars truncated]
