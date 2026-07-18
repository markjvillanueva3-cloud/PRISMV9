---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Explore the PRISM MCP server (H:/prism/mcp-server/) to map EVERY tunable resourc"
date: "2026-06-08"
first_ts: "2026-06-08T17:48:03.517Z"
last_ts: "2026-06-08T17:56:20.621Z"
cwd: "H:\\prism"
messages: 113
user_msgs: 38
assistant_msgs: 75
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a9b209808bd003b63.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Explore the PRISM MCP server (H:/prism/mcp-server/) to map EVERY tunable resourc

> **claude-code-cli** | 2026-06-08 | 113 msgs (38 user / 75 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a9b209808bd003b63.jsonl`

## Transcript

### User | 2026-06-08T17:48:03.517Z

Explore the PRISM MCP server (H:/prism/mcp-server/) to map EVERY tunable resource/capacity knob, so a hardware-tuning upgrade can reuse them rather than invent new ones. Be thorough.

Find and report (with exact file:line and current values):
1. Node heap settings — NODE_OPTIONS, --max-old-space-size, --max-semi-space-size anywhere they're set: package.json scripts, the launcher, the supervisor, settings.json, scheduled-task installers (.claude/helpers/install-*.ps1), env files.
2. The MCP server entry point (mcp-server/dist/index.js / src/index.ts) — how it binds :3100, any concurrency/worker/connection limits, request-server-per-request pattern (there was a 2026-05-31 "buildRequestServer fresh server per request" fix — find it), any cache sizes, pool sizes, timeouts.
3. The supervisor / watchdog — mcp-server/scripts/ for a supervisor that spawns the child with NODE_OPTIONS and an RSS-pressure preemptive restart (there's a 2026-05-23 watchdog at ~3GB threshold + supervisor heap bump). Report the exact RSS threshold, restart logic, and heap value injected.
4. The launcher — ollama-docker-launcher.mjs / ollama-docker-launcher and any --services=mcp path; how the daemon is (re)started.
5. Any embedding pool / GPU usage config (the box has a 96GB RTX PRO 6000 Blackwell that's 99.9% idle) — embed-pool-lock, ONNX, Ollama keep_alive, any GPU concurrency knob.
6. Worker threads / cluster / piscina / child_process pools anywhere in the server.
7. Existing hardware-tuning artifacts: the BLACKWELL-HW-SYNC-MS0 work (commit e5ad4ea802 "apply operator-approved new-HW retunes 9950X3D2 + RTX PRO 6000 Blackwell") — find what it ALREADY retuned so I don't redo it.

Report a structured inventory: each knob, its file:line, current value, and which hardware resource it maps to. Final text IS the data.

### Assistant | 2026-06-08T17:48:11.354Z

I'll systematically explore the PRISM MCP server to map all tunable knobs. Let me start with a comprehensive search across the codebase.

### Assistant | 2026-06-08T17:48:11.693Z

[tool_use: Bash]

### User | 2026-06-08T17:48:16.554Z

[tool_result] prism/.audit-ps1-syntax-installers.ps1
prism/.audit-ps1-syntax.ps1
prism/.audit-reaper-post-protect.json
prism/.audit-tasks-now.ps1
prism/.audit-wh.json
prism/.bucket-cache.json
prism/.bucket-report.mjs
prism/.cache/ai-coverage.json
prism/.cache/ai-roadmap-audit.json
prism/.cache/audit-bucket.mjs
prism/.cache/audit-coverage.mjs
prism/.cache/chat-slots.backup.json
prism/.cache/hook-categorize.json

... [+1180 chars truncated]

### Assistant | 2026-06-08T17:48:26.093Z

Let me search the MCP server directory specifically:

### Assistant | 2026-06-08T17:48:26.093Z

[tool_use: Bash]

### User | 2026-06-08T17:48:32.003Z

[tool_result] total 4440
drwxr-xr-x 1 wompu 197611       0 Apr 19 22:02 %SystemDrive%/
drwxr-xr-x 1 wompu 197611       0 Jun  8 12:47 ./
drwxr-xr-x 1 wompu 197611       0 Jun  8 12:44 ../
drwxr-xr-x 1 wompu 197611       0 May 12 07:48 .claude/
drwxr-xr-x 1 wompu 197611       0 Apr 19 22:03 .claude-flow/
drwxr-xr-x 1 wompu 197611       0 May  8 20:22 .claude-octopus/
-rw-r--r-- 1 wompu 197611     964 Feb 27 07:2
... [+9752 chars truncated]

### Assistant | 2026-06-08T17:48:37.375Z

Let me explore the mcp-server directory structure and files:

### Assistant | 2026-06-08T17:48:37.376Z

[tool_use: Glob]

### User | 2026-06-08T17:48:38.260Z

[tool_result] No files found

### Assistant | 2026-06-08T17:48:41.741Z

Let me refine my search:

### Assistant | 2026-06-08T17:48:41.863Z

[tool_use: Bash]

### User | 2026-06-08T17:48:47.284Z

[tool_result] total 4440
drwxr-xr-x 1 wompu 197611       0 Apr 19 22:02 %SystemDrive%/
drwxr-xr-x 1 wompu 197611       0 Jun  8 12:47 ./
drwxr-xr-x 1 wompu 197611       0 Jun  8 12:44 ../
drwxr-xr-x 1 wompu 197611       0 May 12 07:48 .claude/
drwxr-xr-x 1 wompu 197611       0 Apr 19 22:03 .claude-flow/
drwxr-xr-x 1 wompu 197611       0 May  8 20:22 .claude-octopus/
-rw-r--r-- 1 wompu 197611     964 Feb 27 07:2
... [+9752 chars truncated]

### Assistant | 2026-06-08T17:48:50.537Z

I see now—I need to look inside `/h/prism/mcp-server/mcp-server/`. Let me explore the actual MCP server source:

### Assistant | 2026-06-08T17:48:50.624Z

[tool_use: Bash]

### User | 2026-06-08T17:48:57.917Z

[tool_result] total 32
drwxr-xr-x 1 wompu 197611 0 Apr 27 11:37 ./
drwxr-xr-x 1 wompu 197611 0 Jun  8 12:47 ../
drwxr-xr-x 1 wompu 197611 0 Jun  8 01:19 data/

### Assistant | 2026-06-08T17:49:01.938Z

Let me check the dist and src directories:

### Assistant | 2026-06-08T17:49:02.309Z

[tool_use: Bash]

### User | 2026-06-08T17:49:09.469Z

[tool_result] total 18267
drwxr-xr-x 1 wompu 197611       0 Jun  1 09:30 ./
drwxr-xr-x 1 wompu 197611       0 Jun  8 12:47 ../
-rw-r--r-- 1 wompu 197611    1278 May 28 23:09 .env
drwxr-xr-x 1 wompu 197611       0 Jun  8 01:19 __tests__/
drwxr-xr-x 1 wompu 197611       0 Jun  8 01:18 algorithms/
drwxr-xr-x 1 wompu 197611       0 Jun  8 01:18 architecture/
drwxr-xr-x 1 wompu 197611       0 Jun  8 01:18 bot/
drwxr
... [+1253 chars truncated]

### Assistant | 2026-06-08T17:49:15.020Z

Let me look at the main entry point and scripts:

### Assistant | 2026-06-08T17:49:15.196Z

[tool_use: Bash]

### User | 2026-06-08T17:49:21.604Z

[tool_result] total 3282
drwxr-xr-x 1 wompu 197611     0 Jun  8 11:47 ./
drwxr-xr-x 1 wompu 197611     0 Jun  8 12:47 ../
-rw-r--r-- 1 wompu 197611    22 Apr 13 20:07 KnowledgeApplicabilityEngine.ts.tmp
drwxr-xr-x 1 wompu 197611     0 Jun  8 12:49 __tests__/
drwxr-xr-x 1 wompu 197611     0 Jun  8 01:19 algorithms/
drwxr-xr-x 1 wompu 197611     0 Jun  8 01:19 architecture/
drwxr-xr-x 1 wompu 197611     0 Jun  8 
... [+1761 chars truncated]

### Assistant | 2026-06-08T17:49:25.054Z

Let me read the main index.ts file and search for key tuning parameters:

### Assistant | 2026-06-08T17:49:25.251Z

[tool_use: Read]

### User | 2026-06-08T17:49:26.354Z

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

### Assistant | 2026-06-08T17:49:33.902Z

Now let me search for port bindings, connection limits, and NODE_OPTIONS:

### Assistant | 2026-06-08T17:49:33.902Z

[tool_use: Bash]

### User | 2026-06-08T17:49:39.576Z

[tool_result] 893: * is what eliminates the "Already connected to a transport" collision under concurrency —
1015:  // exact BUG-1 / BUG-2 class from reference_mcp_server_3100_crash_fix_2026_05_22)
1108:    // richer per-tool snapshot (counts, p50/p95/p99 latency, error rate, concurrency).
1139:    // single choke point — per-tool count/latency + live/peak concurrency. Wrapped so
1301:  // took :3100 down fleet
... [+55 chars truncated]

### Assistant | 2026-06-08T17:49:41.856Z

Let me search more specifically in the index.ts file:

### Assistant | 2026-06-08T17:49:42.186Z

[tool_use: Read]

### User | 2026-06-08T17:49:43.349Z

[tool_result] 800	    log.info("[MCP] Resources, Prompts, Tasks, and Logging initialized");
801	  } catch (mcpErr: any) {
802	    log.warn(`[MCP] Primitives init failed (non-fatal): ${mcpErr.message}`);
803	  }
804	
805	  // ── ONCE-ONLY post-bind tail (MCP-CONCURRENCY-FIX) ──────────────────────────
806	  // Synergies, SVI auto-watch, the protocol-bridge dispatch handler (which captures the
807	  // SHARED ser
... [+14401 chars truncated]

### Assistant | 2026-06-08T17:49:50.504Z

Good progress. Now let me search for the key tuning parameters in the rest of the file and related files:

### Assistant | 2026-06-08T17:49:51.010Z

[tool_use: Read]

### User | 2026-06-08T17:49:52.054Z

[tool_result] 1250	    // _registeredTools is a plain Record<string, RegisteredTool>, not a Map
1251	    const registeredTools = (server as any)._registeredTools ?? {};
1252	    const tool = registeredTools[toolName];
1253	    if (!tool) return { error: `Tool ${toolName} not found` };
1254	    try {
1255	      // SDK v1.27.1: registered tool uses .handler(args, extra), not .callback
1256	      // _http_api flag
... [+6481 chars truncated]

### Assistant | 2026-06-08T17:50:01.553Z

Excellent! Now let me search for package.json scripts and supervisor/launcher files:

### Assistant | 2026-06-08T17:50:01.603Z

[tool_use: Read]

### User | 2026-06-08T17:50:02.685Z

[tool_result] 1	{
2	    "name": "prism-mcp-server",
3	    "version": "1.0.0",
4	    "description": "PRISM Manufacturing Intelligence MCP Server - CNC machining data, calculations, and AI orchestration",
5	    "main": "dist/index.js",
6	    "bin": {
7	        "prism": "dist/cli.js"
8	    },
9	    "type": "module",
10	    "scripts": {
11	        "patch": "node scripts/close_gaps.js && node scripts/add_atcs_rename
... [+5709 chars truncated]

### Assistant | 2026-06-08T17:50:07.670Z

Excellent! Now let me search for the supervisor and launcher scripts:

### Assistant | 2026-06-08T17:50:07.859Z

[tool_use: Bash]

### User | 2026-06-08T17:50:13.800Z

[tool_result] total 3904
drwxr-xr-x 1 wompu 197611     0 Jun  8 11:05 ./
drwxr-xr-x 1 wompu 197611     0 Jun  8 12:47 ../
drwxr-xr-x 1 wompu 197611     0 Jun  8 03:29 __pycache__/
drwxr-xr-x 1 wompu 197611     0 Jun  8 03:29 __tests__/
-rwxr-xr-x 1 wompu 197611 30508 Apr 19 17:53 _apply_r14_expansion.mjs*
drwxr-xr-x 1 wompu 197611     0 Jun  8 03:29 _completed_utilities/
-rw-r--r-- 1 wompu 197611  1782 Jun  1 2
... [+3004 chars truncated]

### system

... [33 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-08T17:52:43.823Z

Excellent! Now let me search for environment variables and ollama settings:

### Assistant | 2026-06-08T17:52:43.824Z

[tool_use: Read]

### User | 2026-06-08T17:52:44.877Z

[tool_result] 1	# PRISM MCP Server Configuration
2	
3	ANTHROPIC_API_KEY=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
4	
5	# Model preferences (updated 2026-02-14 P0-MS0b)
6	OPUS_MODEL=claude-opus-4-6
7	SONNET_MODEL=claude-sonnet-4-5-20250929
8	HAIKU_MODEL=claude-haiku-4-5-20251001
9	
10	# Opus 4.6 Configuration
11	ADAPTIVE_THINKING=true
12	EFFORT_T
... [+938 chars truncated]

### Assistant | 2026-06-08T17:52:47.518Z

Now let me check for embedded pool and GPU-related settings:

### Assistant | 2026-06-08T17:52:48.029Z

[tool_use: Bash]

### User | 2026-06-08T17:52:53.236Z

[tool_result] /h/prism/mcp-server/src/engines/AutoResearchOrchestratorEngine.ts:65: * spans. If you ever embed this engine in a worker_thread pool or
/h/prism/mcp-server/src/engines/BRepTessellatorEngine.ts:18: * Computational Geometry). Pure computation; no rendering, no GPU.
/h/prism/mcp-server/src/engines/BanditParameterOptimizerEngine.ts:194:          this.selectGPUCB(context));
/h/prism/mcp-server/src/engi
... [+4179 chars truncated]

### Assistant | 2026-06-08T17:52:57.750Z

Let me search for the PRISM_EMBED_CONCURRENCY setting mentioned in the commit:

### Assistant | 2026-06-08T17:52:58.262Z

[tool_use: Bash]

### User | 2026-06-08T17:53:16.010Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T17:53:18.539Z

Let me check the settings files:

### Assistant | 2026-06-08T17:53:18.851Z

[tool_use: Bash]

### User | 2026-06-08T17:53:41.128Z

[tool_result] /h/prism/.claude/.env
/h/prism/.claude/backups/sync-20260419-210038/settings.json
/h/prism/.claude/plugins/cache/claude-plugins-official/chrome-devtools-mcp/32dc50d59bdb/.gemini/settings.json
/h/prism/.claude/plugins/cache/nyldn-plugins/octo/9.38.0/.claude/settings.json
/h/prism/.claude/plugins/marketplaces/claude-code-workflows/.gemini/settings.json
/h/prism/.claude/settings.json
/h/prism/.claude
... [+746 chars truncated]

### Assistant | 2026-06-08T17:53:45.625Z

Let me read the main settings.json:

### Assistant | 2026-06-08T17:53:46.350Z

[tool_use: Bash]

### User | 2026-06-08T17:53:52.424Z

[tool_result]   "env": {
    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
    "OLLAMA_MODELS": "H:/Tools/ollama/models",
    "PRISM_PYTHON_GPU_PATH": "H:/Tools/python-gpu/Scripts/python.exe",
    "PRISM_PYTHON_PATH": "H:/Tools/
... [+1475 chars truncated]

### Assistant | 2026-06-08T17:53:56.248Z

Now let me check for the PowerShell scripts that configure Ollama and the supervisor:

### Assistant | 2026-06-08T17:53:56.250Z

[tool_use: Bash]

### User | 2026-06-08T17:54:02.560Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T17:54:05.015Z

Let me search for ollama-related PowerShell files directly:

### Assistant | 2026-06-08T17:54:05.762Z

[tool_use: Bash]

### User | 2026-06-08T17:54:13.528Z

[tool_result] /h/prism/.claude/helpers/install-blueprint-ocr-batch-task.ps1
/h/prism/.claude/helpers/install-mcp-priority-guardian-task.ps1

### Assistant | 2026-06-08T17:54:20.093Z

Let me search for the soft-config file mentioned in the commit message:

### Assistant | 2026-06-08T17:54:20.328Z

[tool_use: Bash]

### User | 2026-06-08T17:54:46.826Z

[tool_result] /h/prism/resources/OPEN MIND/hyperCAD-S/31.0/files/hcconfig/menu05_curves.hcconfig.xml
/h/prism/resources/OPEN MIND/hyperCAD-S/33.0/files/hcconfig/menu05_curves.hcconfig.xml
/h/prism/scripts/system-health/05-soft-config-tweaks.ps1

### Assistant | 2026-06-08T17:54:53.712Z

Perfect! Let me read that file:

### Assistant | 2026-06-08T17:54:53.713Z

[tool_use: Read]

### User | 2026-06-08T17:54:57.765Z

[tool_result] 1	# =====================================================================
2	# PRISM System Health 05 - Soft config tweaks (no admin, no reboot)
3	# =====================================================================
4	# Tunes ollama + tsserver behaviour to the host's ACTUAL GPU class so it
5	# lowers idle commit pressure WITHOUT downgrading a large-VRAM card to
6	# 16GB-era caps. (Before 2026-06
... [+5794 chars truncated]

### Assistant | 2026-06-08T17:55:02.002Z

Excellent! Now let me search for the watchdog/supervisor RSS threshold mentioned in the commit date range:

### Assistant | 2026-06-08T17:55:02.688Z

[tool_use: Bash]

### User | 2026-06-08T17:55:08.934Z

[tool_result] /h/prism/.claude/helpers/autopilot-watchdog.ps1:250:                    Write-Log "Window not found after compact. User may need to restart."
/h/prism/.claude/helpers/harden-prism-tasks.ps1:4:# (they DIE at user logoff/lock), 19 had no restart-on-failure, and 2 wouldn't start on battery.
/h/prism/.claude/helpers/install-fleet-memory-monitor-task.ps1:47:# every reboot, every fleet-reaper restart. I
... [+1926 chars truncated]

### Assistant | 2026-06-08T17:55:13.884Z

Let me check for the MCP watchdog script mentioned in the earlier grep:

### Assistant | 2026-06-08T17:55:14.286Z

[tool_use: Bash]

### User | 2026-06-08T17:55:21.226Z

[tool_result] 1316:  httpServer.keepAliveTimeout = 65_000;
1317:  httpServer.headersTimeout = 70_000;
1318:  httpServer.requestTimeout = 0;
1319:  httpServer.maxConnections = 200;

### Assistant | 2026-06-08T17:55:24.858Z

Perfect! Now let me check for request-per-server and buildRequestServer details:

### Assistant | 2026-06-08T17:55:25.231Z

[tool_use: Bash]

### User | 2026-06-08T17:55:31.771Z

[tool_result] 414:// shared server per request; two overlapping requests collided and the 2nd threw before
416:// FRESH McpServer per /mcp request (SDK stateless pattern). bootstrapServices() runs the
513:  // (these are NOT per-server and must not re-run on every /mcp request).
523: * on fresh per-request servers built by buildRequestServer(). The temporary
809:  // server's bindDispatchers() call — and must N
... [+541 chars truncated]

### Assistant | 2026-06-08T17:55:38.152Z

Excellent! Now let me check the McxBatchExtractorEngine to find the defaultConcurrency equivalent:

### Assistant | 2026-06-08T17:55:38.217Z

[tool_use: Read]

### User | 2026-06-08T17:55:39.634Z

[tool_result] 1	/**
2	 * McxBatchExtractorEngine — LATHE-PROD-READY-MS0/U-LPR28
3	 * =======================================================
4	 *
5	 * Bounded-concurrency batch extractor for the JM Die Mastercam binary
6	 * corpus — 3,713 `.mcx-8` + 1,825 `.MCX` + future `.mcam`.  Sibling
7	 * implementation to {@link ./MINBatchExtractorEngine}: same checkpoint
8	 * shape, same atomic write+rename, same skip-if
... [+7117 chars truncated]

### Assistant | 2026-06-08T17:56:20.621Z

Perfect! Now let me compile all the findings. Let me create a comprehensive inventory document:

Based on my thorough exploration of the PRISM MCP server codebase, here is the complete structured inventory of tunable hardware capacity knobs:

---

## PRISM MCP SERVER — HARDWARE TUNING INVENTORY

### 1. NODE HEAP SETTINGS

| Knob | File:Line | Current Value | Hardware Resource | Notes |
|------|-----------|---------------|-------------------|-------|
| `--max-old-space-size` (build) | `/h/prism/mcp-server/package.json:13` | `16384` (16 GB) | Heap/Memory | TypeScript build command |
| `--max-old-space-size` (build:tsc) | `/h/prism/mcp-server/package.json:14` | `16384` (16 GB) | Heap/Memory | TSC compilation |
| `--max-old-space-size` (test) | `/h/prism/mcp-server/package.json:19` | `16384` (16 GB) | Heap/Memory | Vitest runner |
| `--max-old-space-size` (test:coverage) | `/h/prism/mcp-server/package.json:20` | `16384` (16 GB) | Heap/Memory | Vitest coverage |
| `--max-old-space-size` (build:incremental) | `/h/prism/mcp-server/package.json:24` | `16384` (16 GB) | Heap/Memory | Incremental TS build |

### 2. MCP SERVER ENTRY POINT — `/h/prism/mcp-server/src/index.ts`

#### Port & Binding
| Knob | File:Line | Current Value | Hardware Resource | Notes |
|------|-----------|---------------|-------------------|-------|
| PORT (default) | `index.ts:1291` | `3000` | Network | Fallback to 3000 if `$env:PORT` unset |
| PORT (via start-http.mjs) | `/h/prism/mcp-server/scripts/start-http.mjs:2` | `3000` | Network | HTTP transport default |
| PRISM_BIND_HOST (default) | `index.ts:1293` | `127.0.0.1` | Network | Localhost-only by default; set `PRISM_BIND_HOST=0.0.0.0` for Docker |

#### HTTP Keep-Alive & Connection Limits
| Knob | File:Line | Current Value | Hardware Resource | Notes |
|------|-----------|---------------|-------------------|-------|
| `keepAliveTimeout` | `index.ts:1316` | `65_000` ms (65s) | Network/Memory | Hold idle keep-alive connections 65s |
| `headersTimeout
... [+12303 chars truncated]
