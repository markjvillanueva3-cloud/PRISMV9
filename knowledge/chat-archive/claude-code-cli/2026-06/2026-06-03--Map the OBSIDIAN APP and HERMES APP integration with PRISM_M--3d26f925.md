---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Map the OBSIDIAN APP and HERMES APP integration with PRISM/MCP — the goal requir"
date: "2026-06-03"
first_ts: "2026-06-03T00:29:34.685Z"
last_ts: "2026-06-03T00:37:49.236Z"
cwd: "H:\\prism-slot-golf"
messages: 77
user_msgs: 32
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a8b5e2d901a9fb079.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Map the OBSIDIAN APP and HERMES APP integration with PRISM/MCP — the goal requir

> **claude-code-cli** | 2026-06-03 | 77 msgs (32 user / 45 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a8b5e2d901a9fb079.jsonl`

## Transcript

### User | 2026-06-03T00:29:34.685Z

Map the OBSIDIAN APP and HERMES APP integration with PRISM/MCP — the goal requires "wired + synergized to ... obsidian app + hermes app". For OBSIDIAN: how does the Obsidian vault/app connect to PRISM? Read H:/prism/.claude/hooks/stop-obsidian-memory-feed.mjs and grep for "obsidian" across .claude/hooks + scripts + mcp-server/src; is there an Obsidian MCP client/plugin, or only the memory-feed file copy? What would "MCP stays connected for the Obsidian app" mean concretely? For HERMES: read the hermes galaxy brain mcp-server/src/engines/hermes-zulu/MEMORY.md and grep "hermes" across mcp-server/src/engines + .claude; is Hermes (zebra slot — agent-fleet orchestrator) an MCP client of :3100? How does it depend on the MCP server staying up? Determine the concrete wiring each app needs to "stay connected no matter what". KNOWN ROOT-CAUSES this session (do NOT re-derive — verify + extend):
- MCP server is HTTP on 127.0.0.1:3100, entry mcp-server/dist/index.js, ~50s cold boot (loads 64 dispatchers / ~700MB engines).
- Supervised by scripts/mcp-server-supervisor.mjs + Windows scheduled tasks "PRISM MCP Server" + "PRISM MCP Server Watchdog".
- MULTI-INSTANCE LEAK: three uncoordinated restarters (Watchdog task, supervisor, per-chat auto-reconnect hook) all respawn dist/index.js when :3100 looks down WITHOUT reaping stale instances -> N instances race to bind one port -> bind contention -> flapping (positive feedback).
- FALSE-POSITIVE PROBE: a short connectivity timeout under host CPU load reads a healthy server as down -> spawns a transient 2nd instance.
- BOOT-RESET FLAP: restarting a server that is still in its ~50s boot resets the clock -> perpetual DOWN.
- PARTIAL FIX SHIPPED: bind-fail-fast preflight (commit 2167e22cc8, "FIX1+2") makes a losing instance exit fast so a healthy port self-converges 2->1 in ~15s.
- DESIGNED-NOT-SHIPPED: a unified single-flight lock mcp-server-3100.lock shared by ALL THREE restarters ("FIX4/6"), plus a "process-exists-but-not-yet-healthy = B
... [+385 chars truncated]

### Assistant | 2026-06-03T00:29:48.053Z

I'll systematically map the OBSIDIAN and HERMES app integrations with PRISM/MCP. Let me start by examining the critical files and understanding the wiring.

### Assistant | 2026-06-03T00:29:48.267Z

[tool_use: Read]

### Assistant | 2026-06-03T00:29:48.732Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:29:48.892Z

[tool_use: Bash]

### User | 2026-06-03T00:30:08.443Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-obsidian-memory-feed.mjs — Stop Hook
5	 * =========================================
6	 *
7	 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
8	 *
9	 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
10	 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
11	 * mirrored into the H: Obsidian vault
... [+5511 chars truncated]

### User | 2026-06-03T00:30:54.864Z

[tool_result] total 6383
drwxr-xr-x 1 wompu 197611     0 Jun  2 19:25 ./
drwxr-xr-x 1 wompu 197611     0 Jun  2 17:19 ../
drwxr-xr-x 1 wompu 197611     0 May 13 19:49 .deprecated/
-rw-r--r-- 1 wompu 197611  9683 Apr 16 19:48 AGI_INFRA_PHASE_A_WIRING.md
-rw-r--r-- 1 wompu 197611 43473 May 29 23:13 HOOK_DIGEST.md
-rw-r--r-- 1 wompu 197611  2839 Apr 27 07:48 README.md
drwxr-xr-x 1 wompu 197611     0 Jun  2 19:26 _
... [+1556 chars truncated]

### User | 2026-06-03T00:31:02.067Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/classApplyDescriptorDestructureSet.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/classApplyDescriptorGet.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/classApplyDescriptorSet
... [+1629 chars truncated]

### Assistant | 2026-06-03T00:31:04.174Z

Now let me check for Obsidian references in hooks and scripts:

### Assistant | 2026-06-03T00:31:04.730Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:31:04.999Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:31:05.444Z

[tool_use: Bash]

### User | 2026-06-03T00:31:15.484Z

[tool_result] Found 28 files
H:\prism\.claude\hooks\slot-context-bundle-inject.mjs
H:\prism\.claude\hooks\lib\ollama-stats.mjs
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.claude\hooks\stop-auto-capture-per-slot.mjs
H:\prism\.claude\hooks\master-index-precheck-inject.mjs
H:\prism\.claude\hooks\h-to-c-obsidian-mirror.mjs
H:\prism\.claude\hooks\stop-obsidian-memory-feed.mjs
H:\prism\.claude\hooks\obsidian-prec
... [+1120 chars truncated]

### User | 2026-06-03T00:31:15.711Z

[tool_result] Found 78 files
H:\prism\scripts\psn-synergy-collect.test.mjs
H:\prism\scripts\psn-synergy-collect.mjs
H:\prism\scripts\regen-viz.mjs
H:\prism\scripts\merge-augmentations.mjs
H:\prism\scripts\lib\cag-router.mjs
H:\prism\scripts\build-memory-index-sidecar.test.mjs
H:\prism\scripts\lib\memory-index-search-lib.mjs
H:\prism\scripts\lib\recall-first.test.mjs
H:\prism\scripts\lib\recall-first.mjs
H:\pris
... [+3319 chars truncated]

### User | 2026-06-03T00:31:38.324Z

[tool_result] mcp-server/src/algorithms/ABCClassificationFormula.ts
mcp-server/src/algorithms/ActivationFunctionsAlgorithm.ts
mcp-server/src/algorithms/AdaptiveControllerModel.ts
mcp-server/src/algorithms/AmortizationScheduleFormula.ts
mcp-server/src/algorithms/AnomalyDetector.ts
mcp-server/src/algorithms/AntColonyTSP.ts
mcp-server/src/algorithms/BayesianOptimizer.ts
mcp-server/src/algorithms/BayesianWearModel.
... [+1140 chars truncated]

### Assistant | 2026-06-03T00:31:40.083Z

Let me read the key Obsidian-related files and search for Hermes:

### Assistant | 2026-06-03T00:31:40.302Z

[tool_use: Read]

### Assistant | 2026-06-03T00:31:40.768Z

[tool_use: Read]

### Assistant | 2026-06-03T00:31:41.172Z

[tool_use: Grep]

### User | 2026-06-03T00:31:46.514Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
4	 *
5	 * Converts PRISM memory system to Obsidian-compatible markdown:
6	 * 1. Reads memory files from ~/.claude/projects/H--prism/memory/
7	 * 2. Converts to Obsidian format with [[wikilinks]]
8	 * 3. Creates relationship links between related memories
9	 * 4. Syncs tribal knowledge tips
10	 *
11	 *
... [+27681 chars truncated]

### User | 2026-06-03T00:31:47.235Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * obsidian-precheck-inject.mjs — UserPromptSubmit hook
5	 *
6	 * BACKEND-DEV-LOOP / U-OBSIDIAN-PRECHECK (slot delta, 2026-05-18).
7	 *
8	 * Sibling to wiki-precheck-inject.mjs: scans the 644+ Obsidian memory files
9	 * under knowledge/memories/{feedback,reference,project,user}/ on every
10	 * UserPromptSubmit. Returns BM25-lite top-K hits as additionalC
... [+12455 chars truncated]

### User | 2026-06-03T00:31:47.863Z

[tool_result] Found 33 files
H:\prism\mcp-server\src\engines\hermes-zulu\MEMORY.md
H:\prism\mcp-server\src\engines\fleet-hygiene\MEMORY.md
H:\prism\mcp-server\src\engines\database-expansion\MEMORY.md
H:\prism\mcp-server\src\engines\backend-helper\MEMORY.md
H:\prism\mcp-server\src\engines\agent-orchestration\MEMORY.md
H:\prism\mcp-server\src\engines\hermes-zulu\PATHS.md
H:\prism\mcp-server\src\engines\hermes-zul
... [+1617 chars truncated]

### Assistant | 2026-06-03T00:31:49.619Z

I'll now read the critical Hermes and MCP integration files:

### Assistant | 2026-06-03T00:31:49.864Z

[tool_use: Read]

### Assistant | 2026-06-03T00:31:50.295Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:31:50.548Z

[tool_use: Read]

### User | 2026-06-03T00:31:55.336Z

[tool_result] 1	# BRAVO + ZULU Galaxy Memory — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
2	
3	Append-only cross-session memory for the hermes-zulu galaxy. Bravo owns the build side; zulu owns the runtime/orchestration side. Both share this file.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="
... [+10462 chars truncated]

### User | 2026-06-03T00:31:55.656Z

[tool_result] 1	import { createRequire as __esmCreateRequire } from 'module'; import { fileURLToPath as __esmFileURLToPath } from 'url'; import { dirname as __esmDirname } from 'path'; var require = __esmCreateRequire(import.meta.url); var __filename = __esmFileURLToPath(import.meta.url); var __dirname = __esmDirname(__filename);
2	import {
3	  ORANGE_VISE_SPECS,
4	  findSoftJaws,
5	  findVise,
6	  findVisesByJ
... [+2485 chars truncated]

### User | 2026-06-03T00:32:57.574Z

[tool_result] .claude/helpers/mcp-tool-domains.mjs:  "hermes-zulu": ["cognitive", "devops"],
.claude/helpers/mcp-tool-domains.mjs:  bravo: "hermes-zulu",
.claude/helpers/mcp-tool-domains.mjs:  zulu: "hermes-zulu",
.claude/helpers/mcp-tool-domains.test.mjs:  assert.equal(resolveDomainsFromEnv({ PRISM_SLOT_GALAXY: "hermes-zulu" }, ""), "cognitive,devops");
.claude/hooks/outcome-bus-auto-tap.mjs:  bravo: "hermes-z
... [+836 chars truncated]

### Assistant | 2026-06-03T00:32:59.267Z

I'll search more strategically for Obsidian and Hermes MCP integration patterns:

### Assistant | 2026-06-03T00:33:00.355Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:33:00.779Z

[tool_use: Grep]

### Assistant | 2026-06-03T00:33:01.222Z

[tool_use: Read]

### User | 2026-06-03T00:33:10.118Z

[tool_result] Found 21 files
H:\prism\scripts\post-training-harness.mjs
H:\prism\scripts\post-nc-conformance.mjs
H:\prism\scripts\regenerate-launch-fleet.mjs
H:\prism\scripts\winmax-tool-pocket-autoselect.mjs
H:\prism\scripts\lib\mcp-reconnect-action.mjs
H:\prism\scripts\lib\octopus-live-brain.test.mjs
H:\prism\scripts\lib\octopus-live-brain.mjs
H:\prism\scripts\monitor-mcp-and-reaper.mjs
H:\prism\scripts\build
... [+509 chars truncated]

### User | 2026-06-03T00:33:11.209Z

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
... [+5450 chars truncated]

### User | 2026-06-03T00:33:26.360Z

[tool_result] Found 33 files
H:\prism\knowledge\wiki\architecture\hermes-zulu-integration.md
H:\prism\mcp-server\data\docs\galaxies\lathe\ENGINE_DIGEST.md
H:\prism\mcp-server\data\milestones\HERMES-AGI-ARCHITECTURE-MS0.json
H:\prism\mcp-server\data\milestones\COMMAND-KERNEL-MS0.json
H:\prism\knowledge\wiki\architecture\tests\ka\kar-ms7-unified-orchestrator.md
H:\prism\mcp-server\data\milestones\CADCAM-DAGI-MS4.
... [+1582 chars truncated]

### Assistant | 2026-06-03T00:33:28.205Z

Let me examine the critical MCP supervision and connection files more closely:

### Assistant | 2026-06-03T00:33:28.687Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:28.889Z

[tool_use: Read]

### Assistant | 2026-06-03T00:33:29.246Z

[tool_use: Bash]

### User | 2026-06-03T00:33:33.267Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-reconnect-action.mjs' was already read 3m ago in this session and is unchanged (mtime 1780264997231). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T00:33:34.040Z

[tool_result] 140	
141	// ---------- health probe ----------
142	
143	function probeHealth(timeoutMs = 5000) {
144	  return new Promise((resolve) => {
145	    const url = new URL(HEALTH_URL);
146	    const req = http.request(
147	      {
148	        hostname: url.hostname,
149	        port: parseInt(url.port, 10),
150	        path: url.pathname,
151	        method: "GET",
152	        timeout: timeoutMs,
153	   
... [+7357 chars truncated]

### User | 2026-06-03T00:34:37.754Z

[tool_result] ./scripts/generate-hermes-zulu-ops-features.mjs
./scripts/hermes-dream-cycle-synth.mjs
./scripts/hermes-dream-cycle-synth.test.mjs
./scripts/hermes-self-reflect-populater.mjs
./scripts/hermes-self-reflect-populater.test.mjs
./scripts/lib/hermes-frontier-utils.mjs
./scripts/lib/hermes-frontier-utils.test.mjs
./scripts/lib/hermes-outcome-feedback.mjs
./scripts/lib/hermes-outcome-feedback.test.mjs
./
... [+35 chars truncated]

### Assistant | 2026-06-03T00:34:39.696Z

Now let me examine the key integration and hook files:

### Assistant | 2026-06-03T00:34:40.141Z

[tool_use: Read]

### Assistant | 2026-06-03T00:34:40.580Z

[tool_use: Read]

### Assistant | 2026-06-03T00:34:41.021Z

[tool_use: Bash]

### User | 2026-06-03T00:34:44.121Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// U-GALAXY-MS1-B1 (2026-05-27, slot:alpha — sierra's territory, alpha-skeleton ship):
4	// HMEMV04 Obsidian bidirectional vault — H: → C: reverse-mirror per
5	// SCOPE-EXPANSION §Q6 #1 (cyrilXBT bidirectional vault, biggest dormant-X-article miss).
6	//
7	// PostToolUse hook that fires when a Write/Edit/MultiEdit lands under
8	// H:/prism/knowledge/memories/*
... [+5560 chars truncated]

### User | 2026-06-03T00:34:44.984Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-obsidian-memory-extract.mjs — Stop Hook
5	 * =============================================
6	 *
7	 * Extracts session learnings and writes to Obsidian vault.
8	 * Uses Ollama (FREE) to analyze the session and extract:
9	 * - Patterns that worked
10	 * - Mistakes to avoid
11	 * - Decisions made
12	 * - Context for next session
13	 *
14	 * This com
... [+2472 chars truncated]

### User | 2026-06-03T00:34:50.471Z

[tool_result] .claude/hooks/agent-watchdog.mjs
.claude/hooks/chat-bus-inject.mjs
.claude/hooks/chat-slot-heartbeat.mjs
.claude/hooks/claudemd-ollama-enforcer.mjs
.claude/hooks/cross-terminal-conflict.mjs
.claude/hooks/error-block-prewarn.mjs
.claude/hooks/fleet-task-health-stop.mjs
.claude/hooks/gsd-section-retrieve.mjs
.claude/hooks/heartbeat-keepalive.mjs
.claude/hooks/mcp-broadcast-reconnect-inject.mjs

### Assistant | 2026-06-03T00:34:52.085Z

Let me read the critical heartbeat and connection monitoring files:

### Assistant | 2026-06-03T00:34:52.334Z

[tool_use: Read]

### Assistant | 2026-06-03T00:34:52.580Z

[tool_use: Read]

### Assistant | 2026-06-03T00:34:52.774Z

[tool_use: Read]

### User | 2026-06-03T00:34:55.216Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-broadcast-reconnect-inject.mjs' (same offset/limit) was already read 2m ago in this session and is unchanged (mtime 1779679859303). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### User | 2026-06-03T00:34:55.526Z

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
... [+8674 chars truncated]

### User | 2026-06-03T00:34:57.068Z

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
... [+3789 chars truncated]

### Assistant | 2026-06-03T00:34:58.795Z

Let me check the scheduled task configuration and the MCP server entry point for concrete wiring:

### Assistant | 2026-06-03T00:34:59.245Z

[tool_use: Bash]

### User | 2026-06-03T00:35:41.755Z

[tool_result] ./.claude/helpers/install-blueprint-join-refresh-task.ps1
./.claude/helpers/install-blueprint-ocr-batch-task.ps1
./.claude/helpers/install-brain-refresh-task.ps1
./.claude/helpers/install-cleanup-orchestrator-task.ps1
./.claude/helpers/install-combo-efficiency-tasks.ps1
./.claude/helpers/install-cost-alarm-task.ps1
./.claude/helpers/install-fleet-memory-monitor-task.ps1
./.claude/helpers/install-f
... [+123 chars truncated]

### Assistant | 2026-06-03T00:35:43.257Z

Let me find the MCP server install task:

### Assistant | 2026-06-03T00:35:43.385Z

[tool_use: Bash]

### User | 2026-06-03T00:36:17.923Z

[tool_result] ./.claude/helpers/install-mcp-monitor-task.ps1
./.claude/helpers/install-mcp-server-task.ps1
./.claude/helpers/install-mcp-server-watchdog-task.ps1

### Assistant | 2026-06-03T00:36:19.721Z

Now let me read these critical MCP task installers and the mcp-broadcast-reconnect file from my previous knowledge:

### Assistant | 2026-06-03T00:36:19.963Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:19.970Z

[tool_use: Read]

### User | 2026-06-03T00:36:23.747Z

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

### User | 2026-06-03T00:36:23.816Z

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

### Assistant | 2026-06-03T00:36:26.365Z

Now let me examine the Obsidian and Hermes app integration architecture documents:

### Assistant | 2026-06-03T00:36:27.027Z

[tool_use: Read]

### Assistant | 2026-06-03T00:36:27.390Z

[tool_use: Bash]

### User | 2026-06-03T00:36:29.899Z

[tool_result] 1	---
2	name: hermes-zulu-integration
3	description: HERMES-MS0 — zulu designated as PRISM's orchestrator-Hermes; slot souls + observation lib + observation Stop hook + statusline MP bar redesigned to slot task-queue countdown
4	type: architecture
5	status: in-progress
6	mapped_units: U-HERMES02, U-HERMES03 (stage-1)
7	date: 2026-05-20
8	---
9	
10	# HERMES-MS0 — Zulu as the designated Hermes orche
... [+8292 chars truncated]

### User | 2026-06-03T00:36:32.864Z

[tool_result] knowledge/wiki/architecture/fleet-reaper.md
knowledge/wiki/architecture/hermes-zulu-integration.md
knowledge/wiki/architecture/layer-l8.md
knowledge/wiki/architecture/psn-deep-learning-reasoning-training-substrate.md

### Assistant | 2026-06-03T00:36:38.293Z

Now I have enough information to synthesize the full analysis. Let me compile the findings:

### Assistant | 2026-06-03T00:37:37.546Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:37:38.317Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:37:49.236Z

## Summary

I've completed a comprehensive mapping of the OBSIDIAN and HERMES app integration with PRISM's MCP server. Here are the critical findings:

### **OBSIDIAN App (NOT an MCP client)**
- **Zero wired MCP connection** — Obsidian vault is file-based only
- Memory flows: C:\Users\...\memory → H:\prism\knowledge (via `obsidian-memory-sync.mjs`, 3-min throttled)
- Reverse flow: H:\prism\knowledge edits → C: via `h-to-c-obsidian-mirror.mjs` (PostToolUse hook)
- Recall: `obsidian-precheck-inject.mjs` reads 644+ vault files on every UserPromptSubmit (BM25-lite)
- **Conclusion:** Obsidian has NO dependency on MCP staying up — it's a standalone vault synchronized via file I/O

### **HERMES/ZULU Orchestrator (WIRED AS MCP ENGINES, NOT A SEPARATE CLIENT)**
- Hermes is NOT a separate app — it's 8 engines (`ZuluFleetGovernorEngine`, `DreamMarkerScannerEngine`, etc.) compiled INTO the MCP server
- All wired to dispatchers (0 orphans as of 2026-06-02)
- **Hermes DEPENDS entirely on :3100 staying up** — when the server is down, control surfaces (zulu_authority_check, dream_scan, weekly_synthesis) are unreachable
- Fleet coordination depends on these engines: weekly reflection (Sunday 20:53 cron), cross-slot work orders, authorization predicates
- **Conclusion:** "MCP stays connected for Hermes" = "the server at 127.0.0.1:3100 stays running"

### **Critical Gaps for "Stay Connected No Matter What"**

**Root-cause unresolved issues:**
1. **MULTI-INSTANCE LEAK** — 3 uncoordinated restarters (supervisor, watchdog, bridge hook) race to respawn `:3100` without a unified lock
2. **BOOTING GUARD MISSING** — during the ~50s cold boot, bridge auto-reconnect can't tell if the server is starting or dead, so it respawns prematurely
3. **FIX4/6 DESIGNED BUT NOT SHIPPED** — the unified `mcp-server-3100.lock` with single-flight semantics and "process-exists-but-not-yet-healthy = BOOTING" guard
4. **Readiness = NO-GO** — per MEMORY.md, runtime is still dark, governance absent, 12/34 galaxies
... [+404 chars truncated]
