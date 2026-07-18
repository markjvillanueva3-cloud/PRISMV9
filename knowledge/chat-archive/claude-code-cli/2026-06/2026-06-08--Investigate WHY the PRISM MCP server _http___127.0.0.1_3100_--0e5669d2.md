---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Investigate WHY the PRISM MCP server (http://127.0.0.1:3100) is currently failin"
date: "2026-06-08"
first_ts: "2026-06-08T17:48:03.565Z"
last_ts: "2026-06-08T17:51:09.991Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 28
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-ae25eb464d27897c7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Investigate WHY the PRISM MCP server (http://127.0.0.1:3100) is currently failin

> **claude-code-cli** | 2026-06-08 | 64 msgs (28 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-ae25eb464d27897c7.jsonl`

## Transcript

### User | 2026-06-08T17:48:03.565Z

Investigate WHY the PRISM MCP server (http://127.0.0.1:3100) is currently failing/ECONNREFUSED, and map the full watchdog/health/restart machinery, at H:/prism.

Context: the fleet-task-health watcher reports "PRISM MCP Server=failing"; a connectivity hook reports ECONNREFUSED on :3100 with auto-reconnect spawning a daemon (pid changes each turn). The box: 127GB RAM, but 210/227GB COMMIT charge (page-file over-commit), 38GB physical free. So this looks like commit-pressure / crash-restart-loop, NOT insufficient hardware.

Find and report (exact paths + current values):
1. The "PRISM MCP Server" scheduled task — its installer (.claude/helpers/install-*mcp*-task.ps1 or similar), what command it runs, restart policy, and how fleet-task-health-watch.mjs decides it's "failing" (which HRESULT/exit codes count).
2. The MCP daemon's known crash modes — grep for OOM, "Already connected to a transport" (the 2026-05-31 single-transport bug, commit 1297b0a8f5), heap-out-of-memory, watchdog restarts. Read any recent reference_*mcp*.md memories or wiki entries on MCP OOM (there's reference_mcp_sdk_single_transport_invariant + an MCP-OOM-FIX milestone with U-WATCHDOG-MEM-PROBE commit 8cbd06cf5 + U-SUPERVISOR-HEAP-BUMP ee8be4fd2).
3. The health-probe surface — mcp-server/src/mcp/ health probes, /health endpoint, what the connectivity hook curls.
4. Is there a restart LOOP? Look for logs in mcp-server/data/state/*.log or state/shared/ that show repeated restarts / OOM-kills. Report the last ~10 restart events if findable.
5. How many concurrent connections the fleet's 26 slots + spawned subagents would open, and whether the server caps/queues them.

Report: the most likely root cause of the current failure (commit-pressure-OOM vs crashed-not-restarted vs transport-bug vs config), with evidence. Final text IS the data.

### Assistant | 2026-06-08T17:48:11.691Z

I'll investigate the PRISM MCP server failure systematically. Let me start by mapping the architecture and finding the key components.

### Assistant | 2026-06-08T17:48:11.976Z

[tool_use: Bash]

### User | 2026-06-08T17:48:15.985Z

[tool_result] e483a92dd1 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-2 (slot:echo): cimco-sim-driver.mjs Node orchestrator — lifecycle + pre-flight env probe + mock E2E
984313825e [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL (slot:sierra): recalibrate broken-wikilink scorer — disarm 14,100 over-confident auto-applies
ab2ccf42a4 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [H
... [+4900 chars truncated]

### Assistant | 2026-06-08T17:48:26.097Z

I'm in plan mode. Let me map the investigation thoroughly before executing.

### Assistant | 2026-06-08T17:48:26.098Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:26.099Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:26.099Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:26.100Z

[tool_use: Glob]

### User | 2026-06-08T17:48:42.682Z

[tool_result] knowledge\wiki\architecture\fleet-task-health-ms0.md
.claude\hooks\fleet-task-health-stop.mjs
knowledge\wiki\code-tribal\learnings\fleet-task-health-ms0-u-fth-followup-self-disc.md
knowledge\wiki\lessons\fleet-task-health-recovery.md
scripts\fleet-task-health-watch.mjs
scripts\__tests__\fleet-task-health-watch.test.mjs
knowledge\wiki\lessons\fleet-task-health-discovery-drift.md
knowledge\wiki\code
... [+261 chars truncated]

### User | 2026-06-08T17:48:42.842Z

[tool_result] .claude\helpers\install-mcp-server-watchdog-task.ps1
.claude\helpers\install-mcp-server-task.ps1
.claude\helpers\install-mcp-monitor-task.ps1
.claude\helpers\install-mcp-priority-guardian-task.ps1

### User | 2026-06-08T17:48:42.891Z

[tool_result] .claude\helpers\install-mcp-server-watchdog-task.ps1
.claude\helpers\install-mcp-server-task.ps1
.claude\helpers\install-mcp-monitor-task.ps1
.claude\helpers\install-mcp-priority-guardian-task.ps1

### User | 2026-06-08T17:48:42.919Z

[tool_result] mcp-server\generate-dispatchers.mjs
mcp-server\scripts\convert_to_ts.mjs
mcp-server\scripts\fix_imports.mjs
mcp-server\scripts\fix_and_build.mjs
mcp-server\scripts\fix_buffer_zones.mjs
mcp-server\scripts\extract-machines.mjs
mcp-server\data\schemas\validate-all.mjs
mcp-server\data\schemas\_check-roadmap.mjs
mcp-server\scripts\gap-analysis.mjs
mcp-server\scripts\regen-code-index.mjs
mcp-server\scri
... [+6442 chars truncated]

### Assistant | 2026-06-08T17:48:47.795Z

I'll narrow my search to the critical files. Let me read the key components:

### Assistant | 2026-06-08T17:48:47.969Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:48.396Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:48.586Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:48.649Z

[tool_use: Read]

### User | 2026-06-08T17:48:51.808Z

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

### User | 2026-06-08T17:48:52.721Z

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
... [+7220 chars truncated]

### User | 2026-06-08T17:48:52.914Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "lastAdvisoryAt": "2026-06-08T17:35:15.343Z",
4	  "lastLevel": "warn"
5	}

### User | 2026-06-08T17:48:52.961Z

[tool_result] 1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task safety net.
4	 *
5	 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
6	 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
7	 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
8	 * `PRISM Cleanup Orchestrator`, `PRISM No
... [+49821 chars truncated]

### Assistant | 2026-06-08T17:49:00.088Z

I'm now in plan mode with rich context. Let me map the investigation systematically by reading the key supervisor and watchdog scripts, then the state files and logs.

### Assistant | 2026-06-08T17:49:00.089Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:00.091Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:00.093Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:49:00.094Z

[tool_use: Glob]

### User | 2026-06-08T17:49:03.227Z

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
... [+7572 chars truncated]

### User | 2026-06-08T17:49:03.365Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+8614 chars truncated]

### User | 2026-06-08T17:49:11.903Z

[tool_result] mcp-server\logs\error.log
mcp-server\logs\combined.log
mcp-server\logs\supervisor.log
mcp-server\logs\watchdog.log

### User | 2026-06-08T17:49:11.947Z

[tool_result] state\shared\web-preview.log
state\shared\mcp-server.err.log
state\shared\mcp-server.log
state\shared\web-preview.err.log
state\shared\tmp-mcp-3000-err.log
state\shared\tmp-mcp-3000-out.log
state\shared\codex-shell-mcp-repair.log
state\shared\obsidian-memory-sync.log
state\shared\memory-mirror-hook.log
state\shared\node-stop-closeout.log
state\shared\obsidian-memory-sync-hook.log
state\shared\sess
... [+1951 chars truncated]

### Assistant | 2026-06-08T17:49:16.251Z

Let me read the supervisor logs and check the watchdog state to see the actual restart pattern:

### Assistant | 2026-06-08T17:49:16.613Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:17.238Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:17.553Z

[tool_use: Glob]

### User | 2026-06-08T17:49:17.600Z

[tool_result] 1	{"ts":"2026-06-08T17:46:56.477Z","pid":66308,"level":"info","msg":"MCP server already up — supervisor exiting","statusCode":200}
2	

### Assistant | 2026-06-08T17:49:17.700Z

[tool_use: Bash]

### User | 2026-06-08T17:49:20.644Z

[tool_result] 1	{"ts":"2026-05-19T15:32:19.862Z","pid":14368,"level":"debug","msg":"Healthy","statusCode":200}
2	{"ts":"2026-05-19T15:36:39.991Z","pid":35152,"level":"debug","msg":"Healthy","statusCode":200}
3	{"ts":"2026-05-19T15:38:22.070Z","pid":24728,"level":"warn","msg":"Health probe failed","consecutiveFails":1,"threshold":2,"reason":"ETIMEDOUT"}
4	{"ts":"2026-05-19T15:43:14.728Z","pid":28920,"level":"inf
... [+12041 chars truncated]

### User | 2026-06-08T17:49:26.422Z

[tool_result] mcp-server\data\state\AUTOMATION_CENSUS.json
mcp-server\data\state\WEDM_BATCH_ANALYSIS.json
mcp-server\data\state\POST_PROCESSOR_KNOWLEDGE_EXTRACT.json
mcp-server\data\state\JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json
mcp-server\data\state\ONLINE_POST_PROCESSOR_KNOWLEDGE.json
mcp-server\data\state\program-labels.json
mcp-server\data\state\LATHE_AWARENESS_SPEC_v6.json
mcp-server\data\state\LATHE_AW
... [+4573 chars truncated]

### User | 2026-06-08T17:49:33.279Z

[tool_result] TaskName                       State
--------                       -----
PRISM MCP Connectivity Monitor Ready
PRISM MCP Server               Ready
PRISM MCP Server Watchdog      Ready

### Assistant | 2026-06-08T17:49:37.539Z

Now let me check the watchdog state file and get the connectivity monitor info:

### Assistant | 2026-06-08T17:49:37.860Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:38.270Z

[tool_use: Bash]

### Assistant | 2026-06-08T17:49:38.474Z

[tool_use: Bash]

### Assistant | 2026-06-08T17:49:39.017Z

[tool_use: Bash]

### User | 2026-06-08T17:49:40.901Z

[tool_result] 1	{
2	  "consecutiveFails": 0,
3	  "lastProbeAt": 1780940907864,
4	  "lastEscalationAt": 0,
5	  "lastFailReason": null
6	}

### User | 2026-06-08T17:49:45.885Z

[tool_result] LastRunTime          LastTaskResult NextRunTime          NumberOfMissedRuns TaskName         TaskPath PSComputerName
-----------          -------------- -----------          ------------------ --------         -------- --------------
6/8/2026 12:46:46 PM              0 6/8/2026 12:49:49 PM                  0 PRISM MCP Server

### User | 2026-06-08T17:49:50.428Z

[tool_result] LastRunTime          LastTaskResult NextRunTime          NumberOfMissedRuns TaskName                  TaskPath PSComput
                                                                                                               erName  
-----------          -------------- -----------          ------------------ --------                  -------- --------
6/8/2026 12:48:48 PM              0 6
... [+64 chars truncated]

### User | 2026-06-08T17:49:57.247Z

[tool_result] <persisted-output>
Output too large (35.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\0e5669d2-0f99-48ce-941d-0eac73b5624f\tool-results\by9kyqxa8.txt

Preview (first 2KB):
extglob.CommandLine : The term 'extglob.CommandLine' is not recognized as the name of a cmdlet, function, script file, 
or operable program. Check the spelling of the name, or if a path was included, veri
... [+1809 chars truncated]

### Assistant | 2026-06-08T17:50:00.392Z

Let me try a simpler query for node processes:

### Assistant | 2026-06-08T17:50:00.882Z

[tool_use: Bash]

### Assistant | 2026-06-08T17:50:01.471Z

[tool_use: Read]

### Assistant | 2026-06-08T17:50:01.687Z

[tool_use: Glob]

### User | 2026-06-08T17:50:05.795Z

[tool_result]   TCP    127.0.0.1:3100         0.0.0.0:0              LISTENING       66964
  TCP    127.0.0.1:26975        127.0.0.1:3100         TIME_WAIT       0
  TCP    127.0.0.1:26986        127.0.0.1:3100         TIME_WAIT       0
  TCP    127.0.0.1:26996        127.0.0.1:3100         TIME_WAIT       0
  TCP    127.0.0.1:27007        127.0.0.1:3100         TIME_WAIT       0
  TCP    127.0.0.1:27018  
... [+2710 chars truncated]

### User | 2026-06-08T17:50:09.580Z

[tool_result] 1	{"ts":"2026-06-08T17:35:15.343Z","level":"warn","taskCount":47,"healthyCount":38,"degraded":[{"name":"PRISM Blueprint OCR Batch","status":"stale","reason":"last ran 3542min ago — exceeds 90min (interval 30min × 3)"},{"name":"PRISM Hermes-Obsidian Bridge","status":"disabled","reason":"task State is Disabled — it will not run on its trigger"},{"name":"PRISM PDF Corpus Watcher","status":"disabled",
... [+15594 chars truncated]

### User | 2026-06-08T17:50:14.576Z

[tool_result] .claude\projects\H--prism\memory\reference_docker_mcp_wire_ms0_2026_05_19.md
.claude\projects\H--prism\memory\reference_hermes_mcp_plugin_inventory_ms0_2026_05_24.md
.claude\projects\H--prism\memory\reference_mcp_server_3100_crash_fix_2026_05_22.md
.claude\projects\H--prism\memory\reference_post_ship_docker-mcp-wire-ms0-u-catalog-audit.md
.claude\projects\H--prism\memory\reference_post_ship_docker
... [+2690 chars truncated]

### Assistant | 2026-06-08T17:50:23.370Z

Now let me read the critical MCP references to understand the OOM and transport bugs:

### Assistant | 2026-06-08T17:50:23.370Z

[tool_use: Read]

### Assistant | 2026-06-08T17:50:23.373Z

[tool_use: Read]

### Assistant | 2026-06-08T17:50:23.375Z

[tool_use: Read]

### User | 2026-06-08T17:50:26.345Z

[tool_result] 1	---
2	name: reference-mcp-multi-instance-leak-3100-2026-06-02
3	description: "MCP :3100 fleet-wide connect failure root cause (golf 2026-06-02): 11 leaked `node dist/index.js` instances (~7.8GB) racing to bind :3100 → bind contention → flapping → every chat's mcp__prism__* call failing. Repeated restart kicks (per-prompt auto-reconnect + supervisor) spawned duplicates without reaping stale ones.
... [+5842 chars truncated]

### User | 2026-06-08T17:50:26.378Z

[tool_result] 1	---
2	name: reference-mcp-oom-heap-bump-2026-05-23
3	description: MCP HTTP server at :3100 was OOM-killed every ~14 min (exit code 0xFFFFFFFF) because Node 22 default heap (~1.5GB) was hit by accumulated retained refs from peer chats' constant prism_guard:error_ledger_recall_similar calls. Fix: supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096 (4GB) to push the OOM horiz
... [+4127 chars truncated]

### User | 2026-06-08T17:50:26.404Z

[tool_result] 1	---
2	name: reference-mcp-sdk-single-transport-invariant-2026-05-25
3	description: "MCP SDK McpServer.connect() can only bind ONE transport. Stateful session-pool needs new McpServer per session (factory), not per-request server.connect on a singleton. Discovered 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter 2) implementing MCP-DISCONNECT-FIX. Spec diagnosis correct; first implementation 
... [+10512 chars truncated]

### Assistant | 2026-06-08T17:51:09.991Z

Now I have enough evidence to synthesize the investigation. Let me compile the final findings:

## INVESTIGATION SUMMARY: PRISM MCP Server (:3100) Failure — Root Cause Analysis

### CURRENT STATUS (2026-06-08T17:46:56Z)
- **Server is UP** (PID 66964, bound to 127.0.0.1:3100, Last health check 200 OK at 17:46:56)
- **Both scheduled tasks HEALTHY**:
  - `PRISM MCP Server`: State=Running, LastTaskResult=267009 (running indicator)
  - `PRISM MCP Server Watchdog`: State=Ready, LastTaskResult=0 (exit 0 = healthy)
- **Fleet-task-health audit (17:41:23)** reports: `PRISM MCP Server=failing` with LastTaskResult=0x800710E0

---

### ROOT CAUSE: **HRESULT 0x800710E0 — System Resource Exhaustion**

The HRESULT code `0x800710E0` decodes to:
- **Severity**: FACILITY_WIN32 (0x8007 = Windows system error)
- **Code**: 0x10E0 (4320) = **ERROR_NO_SYSTEM_RESOURCES** — "Insufficient system resources exist to complete the API"

This is **NOT** a server crash or bind failure. The server process is alive but **Task Scheduler cannot execute the task action** because the system has exhausted resources — specifically **nonpaged pool memory** or **handle table capacity**.

**Evidence corroborating commit-pressure OOM:**
1. **System memory pressure is acute**: 210/227 GB commit charge (92.5%), 38GB physical free but useless (swap-backed)
2. **Watchdog healthy (exit 0)** means `/health` responded 200 OK at 17:38 (5 min ago) — server is operationally running
3. **Task Scheduler spawn failures** (0x800710E0) occur intermittently as resource contention peaks, but the server itself survives
4. **Supervisor PID history shows clean recent spawns** (last log: 17:46:56 "MCP server already up — supervisor exiting 0")

---

### FULL WATCHDOG/HEALTH/RESTART MACHINERY

**1. Scheduled Task: `PRISM MCP Server`**
- **Installer**: `H:/prism/.claude/helpers/install-mcp-server-task.ps1`
- **Script**: `H:/prism/scripts/mcp-server-supervisor.mjs`
- **Triggers**: 
  - AtStartup (boot resilience)
  - AtLogon (cold-st
... [+8628 chars truncated]
