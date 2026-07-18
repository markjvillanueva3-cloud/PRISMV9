---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Read-only investigation (propose, do NOT edit). PRISM Blackwell box: 127GB RAM, "
date: "2026-06-16"
first_ts: "2026-06-16T19:56:57.929Z"
last_ts: "2026-06-16T20:09:48.369Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 18
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ad060b53cb410b541.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Read-only investigation (propose, do NOT edit). PRISM Blackwell box: 127GB RAM, 

> **claude-code-cli** | 2026-06-16 | 40 msgs (18 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ad060b53cb410b541.jsonl`

## Transcript

### User | 2026-06-16T19:56:57.929Z

Read-only investigation (propose, do NOT edit). PRISM Blackwell box: 127GB RAM, 227GB commit limit. The shared MCP HTTP daemon = H:/prism/mcp-server/dist/index.js run with TRANSPORT=http on :3100 (loads 3800+ engines + a 536MB+ tribal index; has hit V8 OOM). It is launched/respawned by H:/prism/scripts/singleton-service-guard.mjs and kept alive by "PRISM MCP Server" supervisor + Watchdog Windows scheduled tasks.

Find, with exact file:line:
1. In singleton-service-guard.mjs: the exact spawn/exec of dist/index.js (the http daemon). Quote the command + args + env. Does it pass NODE_OPTIONS or --max-old-space-size? Report the CURRENT heap (if none, V8 default ~1.4GB).
2. EVERY other launch path of the daemon: grep H:/prism/.claude/helpers/*.ps1, H:/prism/scripts/*.ps1, *.mjs for "dist/index.js", "TRANSPORT", "PRISM MCP Server", "schtasks", "Register-ScheduledTask". List each launch path + its current heap flag. (The fix must cover ALL paths or the daemon OOMs on whichever path wins.)
3. ComputationCache.ts (H:/prism/mcp-server/src/engines/): the MAX_CACHE_SIZE constant line + value. And index.ts health threshold (grep "heapUsedMB" / "3500"). 

Return: for each, FILE:LINE + CURRENT value + the exact one-line change to set a Blackwell-appropriate heap (propose a value with reasoning given 127GB RAM but commit-charge pressure -- be conservative, e.g. 4096-8192MB, justify) and env-tunable cache. Note all are NEEDS-OPERATOR (daemon respawn). Cite file:line for everything; flag anything unverified (R12). Be concise -- tables/bullets.

### Assistant | 2026-06-16T19:57:58.505Z

[tool_use: Glob]

### Assistant | 2026-06-16T19:57:58.516Z

[tool_use: Glob]

### Assistant | 2026-06-16T19:57:58.526Z

[tool_use: Glob]

### User | 2026-06-16T20:01:38.604Z

[tool_result] mcp-server\src\engines\ComputationCache.ts

### User | 2026-06-16T20:01:38.795Z

[tool_result] scripts\singleton-service-guard.mjs

### User | 2026-06-16T20:01:39.042Z

[tool_result] mcp-server\src\generators\index.ts
mcp-server\src\registries\index.ts
mcp-server\src\shared\index.ts
mcp-server\src\utils\index.ts
mcp-server\src\services\interfaces\index.ts
mcp-server\src\cli\index.ts
mcp-server\src\algorithms\index.ts
mcp-server\src\services\index.ts
mcp-server\src\knowledge\index.ts
mcp-server\src\engines\index.ts
mcp-server\src\mcp\index.ts
mcp-server\src\hooks\index.ts
mcp-s
... [+108 chars truncated]

### Assistant | 2026-06-16T20:01:43.381Z

Let me read all the relevant files in parallel.

### Assistant | 2026-06-16T20:01:43.382Z

[tool_use: Read]

### Assistant | 2026-06-16T20:01:43.434Z

[tool_use: Read]

### Assistant | 2026-06-16T20:01:44.014Z

[tool_use: Read]

### User | 2026-06-16T20:02:08.277Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   fleet-wide: 0 mcp-http-bridge processes running (enum-cache 506s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-mode proceeds (no deadlock).
   ENFORCED ACTIONS:
     1.
... [+464 chars truncated]

### User | 2026-06-16T20:02:19.899Z

[tool_result] 1	/**
2	 * PRISM D4 — Computation Cache
3	 * ==============================
4	 * 
5	 * Manufacturing-aware cache with TTL policies:
6	 * - SAFETY tier (30s TTL): spindle loads, collision checks, tool stress
7	 * - STANDARD tier (120s TTL): cutting forces, surface finish, MRR
8	 * - STABLE tier (300s TTL): material properties, thread specs, formulas
9	 * 
10	 * Safety constraint: S(x)≥0.70 calcs AL
... [+17540 chars truncated]

### User | 2026-06-16T20:02:19.932Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1002 of 1549 total (32841 tokens, cap 25000). Call Read with offset=1003 limit=1002 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Pro
... [+55073 chars truncated]

### Assistant | 2026-06-16T20:02:25.685Z

Now let me get the rest of index.ts for the health threshold, and read the singleton-service-guard.mjs, plus search for all other launch paths:

### Assistant | 2026-06-16T20:02:26.452Z

[tool_use: Read]

### Assistant | 2026-06-16T20:02:26.492Z

[tool_use: Read]

### User | 2026-06-16T20:03:20.448Z

[tool_result] 1003	  // hung portless instead of exiting. Probe the port cheaply (~50MB) and exit
1004	  // FIRST if a peer owns it. FIX 1 (httpServer 'error' handler at app.listen)
1005	  // closes the residual TOCTOU window between this probe closing and the real listen.
1006	  {
1007	    const pfPort = parseInt(process.env.PORT || "3000", 10);
1008	    const pfHost = process.env.PRISM_BIND_HOST || "127.0.0.1
... [+26721 chars truncated]

### User | 2026-06-16T20:03:20.466Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * singleton-service-guard.mjs — detect + repair duplicate/wedged singleton
4	 * service daemons (golf fleet-hygiene).
5	 *
6	 * THE GAP. PRISM's MCP server is a SINGLETON daemon bound to :3100. Its
7	 * supervisor/auto-reconnect spawns a fresh daemon on a detected outage but does
8	 * NOT reliably kill the old one → multiple `mcp-server/dist/index.js` daemons
9	 * pi
... [+14297 chars truncated]

### Assistant | 2026-06-16T20:03:25.220Z

Good - singleton-service-guard.mjs delegates to `.claude/helpers/mcp-server-daemon.mjs`. Let me read that and search for all other launch paths simultaneously:

### Assistant | 2026-06-16T20:03:25.969Z

[tool_use: Read]

### Assistant | 2026-06-16T20:03:27.530Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:03:28.283Z

[tool_use: Grep]

### User | 2026-06-16T20:04:51.883Z

[tool_result] .claude\helpers\install-mcp-server-task.ps1:131:$desc = "Long-running supervisor for the PRISM HTTP MCP server at 127.0.0.1:3100 (mcp-server-supervisor.mjs). Spawns node mcp-server/dist/index.js with TRANSPORT=http, respawns with exponential backoff on crash, and refuses to start if a server is already responding healthy (probes /health first). Closes the 'red X at session start' half of the MCP-d
... [+251 chars truncated]

### User | 2026-06-16T20:04:52.097Z

[tool_result] scripts\cron\connection-finder-cron.ps1:158:Register-ScheduledTask `
scripts\coordination-db-health.ps1:46:  schtasks.exe /Create /SC HOURLY /TN "PRISM Coord DB Health" `
scripts\cron\daily-context-cron.ps1:141:  Write-Warn2 "DRY-RUN: would Register-ScheduledTask"
scripts\cron\daily-context-cron.ps1:180:Register-ScheduledTask @splat | Out-Null
scripts\cron\weekly-synthesis-cron.ps1:19:  dist/index
... [+7639 chars truncated]

### User | 2026-06-16T20:04:52.577Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-daemon.mjs — Shared MCP Server Daemon Manager
4	 *
5	 * Manages a single PRISM MCP server instance that multiple Claude chats share.
6	 * Eliminates the "N chats = N processes" contention problem.
7	 *
8	 * Commands:
9	 *   start   - Start the daemon (if not running)
10	 *   stop    - Stop the daemon
11	 *   status  - Check if daemon is running
12	 *   r
... [+9399 chars truncated]

### Assistant | 2026-06-16T20:04:57.193Z

Now let me read the supervisor and the install task, and the ensure-heap-floor helper:

### Assistant | 2026-06-16T20:04:58.156Z

[tool_use: Read]

### Assistant | 2026-06-16T20:04:58.970Z

[tool_use: Read]

### Assistant | 2026-06-16T20:04:59.224Z

[tool_use: Read]

### User | 2026-06-16T20:05:25.754Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   fleet-wide: 0 mcp-http-bridge processes running (enum-cache 688s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-mode proceeds (no deadlock).
   ENFORCED ACTIONS:
     1.
... [+464 chars truncated]

### User | 2026-06-16T20:05:30.354Z

[tool_result] 1	/**
2	 * ensure-heap-floor.mjs — guarantee a minimum V8 old-space heap for child spawns.
3	 *
4	 * THE BUG IT FIXES (2026-06-09, confirmed via a live MCP outage). The MCP server
5	 * OOMs on boot — `FATAL ERROR: Reached heap limit Allocation failed` — because it
6	 * loads 4000+ tribal tips + registries + graph during its ~40-50s cold boot, far
7	 * exceeding the **384MB** `--max-old-space-size`
... [+1839 chars truncated]

### User | 2026-06-16T20:05:30.390Z

[tool_result] 1	# PRISM MCP Server — Production Start Script (Windows)
2	# R6 Production Hardening
3	
4	$ErrorActionPreference = "Stop"
5	$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
6	$ProjectDir = Split-Path -Parent $ScriptDir
7	
8	Write-Host "=== PRISM Production Start ===" -ForegroundColor Cyan
9	Write-Host "Node: $(node --version)"
10	Write-Host "Dir: $ProjectDir"
11	
12	# Memory limi
... [+555 chars truncated]

### Assistant | 2026-06-16T20:05:35.960Z

Now let me read the supervisor and the install task PS1 to find the scheduled task heap setting:

### Assistant | 2026-06-16T20:05:36.750Z

[tool_use: Glob]

### Assistant | 2026-06-16T20:05:37.199Z

[tool_use: Read]

### User | 2026-06-16T20:05:43.938Z

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
... [+9622 chars truncated]

### User | 2026-06-16T20:05:44.423Z

[tool_result] No files found

### User | 2026-06-16T20:08:26.032Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user requested a read-only investigation (propose only, no edits) of the PRISM Blackwell box MCP HTTP daemon heap configuration. The specific sub-tasks were:
   - (1) In `singleton-service-guard.mjs`: find the exact spawn/exec of `dist/index.js` — command, args, env, NODE_OPTIONS / --max-old-space-size. Report current heap (if none, V8 default ~1.4 GB).
   - (2) EVERY other launch path of the daemon: grep `.claude/helpers/*.ps1`, `scripts/*.ps1`, `*.mjs` for "dist/index.js", "TRANSPORT", "PRISM MCP Server", "schtasks", "Register-ScheduledTask". List each path + current heap flag.
   - (3) `ComputationCache.ts`: the MAX_CACHE_SIZE constant line + value; `index.ts`: health threshold grep on "heapUsedMB" / "3500".
   - Return: FILE:LINE + CURRENT value + the exact one-line change to set a Blackwell-appropriate heap (conservative 4096–8192 MB with justification) and env-tunable cache. All flagged NEEDS-OPERATOR (daemon respawn). Cite file:line for everything; flag anything unverified (R12).

2. Key Technical Concepts:
   - V8 heap limits: `--max-old-space-size` Node.js flag controls old-space heap; default ~1.4 GB; causes OOM when loading 4000+ tribal tips + registries + 536 MB tribal index.
   - `NODE_OPTIONS` env var inheritance: child processes inherit parent's `NODE_OPTIONS`, so a portable-node-capped context (384 MB) OOMs the MCP server on boot.
   - `ensureHeapFloor.mjs`: pure utility that raises (never lowers) the `--max-old-space-size` in NODE_OPTIONS to a given floor; default floor 4096 MB; used by mcp-server-daemon.mjs.
   - `PRISM_MCP_HEAP_FLOOR_MB` env knob: controls the floor passed to `ensureHeapFloor()`; default "24576" (24 GB) in mcp-server-daemon.mjs.
   - Windows commit-charge limit: 227 GB commit limit on the Blackwell box vs 127 GB RAM; large heap reserv
... [+14303 chars truncated]

### Assistant | 2026-06-16T20:09:48.369Z

Here is the complete findings report for the PRISM Blackwell box MCP HTTP daemon heap investigation.

---

## MCP Daemon Heap Investigation — Findings Report

### Finding 1 — singleton-service-guard.mjs: Does NOT directly spawn dist/index.js

`H:/prism/scripts/singleton-service-guard.mjs:195–206`

```js
function startService(svc) {
  const helperPath = path.isAbsolute(svc.startHelper) ? svc.startHelper
    : path.join(REPO_ROOT, svc.startHelper);
  execFileSync(process.execPath, [helperPath, "start"], { ... });
}
```

The `startHelper` for the MCP service is `.claude/helpers/mcp-server-daemon.mjs` (wired in `SINGLETON_SERVICES` at lines 60–70). No heap flag in singleton-service-guard.mjs itself — it delegates entirely to the daemon helper.

---

### Finding 2 — All launch paths of dist/index.js

| # | File:Line | Heap / NODE_OPTIONS | Mode | Notes |
|---|---|---|---|---|
| **A** | `.claude/helpers/mcp-server-daemon.mjs:149–172` | `PRISM_MCP_HEAP_FLOOR_MB \|\| "24576"` → **24,576 MB** (env-tunable) | HTTP :3100 | PRIMARY supervised path. `ensureHeapFloor()` raises inherited NODE_OPTIONS to floor. |
| **B** | `scripts/start-production.ps1:13,26` | `--max-old-space-size=4096` → **4,096 MB** hard-coded | STDIO (no TRANSPORT=http) | Manual script only; not the supervised HTTP daemon path. |
| **C** | `.claude/helpers/install-mcp-server-task.ps1:44,78` | Delegates to `scripts/mcp-server-supervisor.mjs` (no heap arg passed) → **UNVERIFIED (R12)** | HTTP (supervisor sets TRANSPORT=http) | Supervisor is the actual spawn point; install script does not pass `--max-old-space-size`. |

The installer calls `mcp-server-supervisor.mjs` (line 44: `$supervisorScript = 'H:\PRISM\scripts\mcp-server-supervisor.mjs'`; line 78: `$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $supervisorArgs`). The supervisor script is the actual heap-setter for the scheduled-task path and was not directly read. Its heap setting is **UNVERIFIED (R12)** — it must be checked separately via `Re
... [+3785 chars truncated]
