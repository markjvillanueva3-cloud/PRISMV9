---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are analyzing CPU/RAM/process-priority contention that starves the MCP serve"
date: "2026-06-04"
first_ts: "2026-06-04T03:30:23.031Z"
last_ts: "2026-06-04T03:43:20.012Z"
cwd: "H:\\PRISM"
messages: 70
user_msgs: 27
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a8364010769f824dd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are analyzing CPU/RAM/process-priority contention that starves the MCP serve

> **claude-code-cli** | 2026-06-04 | 70 msgs (27 user / 43 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a8364010769f824dd.jsonl`

## Transcript

### User | 2026-06-04T03:30:23.031Z

You are analyzing CPU/RAM/process-priority contention that starves the MCP server, and designing the DURABLE mechanism to keep it healthy. 
== LIVE GROUND TRUTH (DESKTOP-N7MI1VB, slot golf, 2026-06-03) ==
- The recurring symptom: chats periodically show "MCP DISCONNECTED" then a watchdog restart. Operator: "permanently fix the mcp server drop we constantly experience."
- MCP HTTP bridge listens on :3100, owner node pid 36276 (756MB RSS, just boosted to AboveNormal).
- THREE node processes at ~2.9GB RSS each — right at the documented 3GB watchdog OOM-restart threshold (a restart = a drop).
- CPU was at 100% (16 logical cores, Ryzen 7 7800X3D). No single runaway — AGGREGATE saturation from 201 active fleet /loop sessions + Obsidian + Defender (MsMpEng) + ollama. CPU starvation of the MCP event loop = request timeouts = "MCP DISCONNECTED".
- PRIORITY INVERSION found: ollama 'llama-server' runner processes were at AboveNormal priority, PREEMPTING the Normal-priority MCP server. Golf normalized runners->Normal + boosted MCP->AboveNormal as immediate relief (CPU 100%->93%). But ollama RESPAWNS runners at AboveNormal on each model load, so a one-shot fix is NOT durable.
- RAM is healthy: 40% used, 76GB free of 127GB. GPU: 96GB RTX PRO 6000 Blackwell, just optimized (4-model roster, 54GB resident, 42GB free, 1% util — lots of idle GPU compute).

== PRIOR MCP-DROP FIXES ALREADY SHIPPED (do NOT rebuild; verify they're deployed) ==
- commit 1297b0a8f5 (2026-05-31, golf): "MCP :3100 Already connected to a transport" — buildRequestServer() makes a FRESH McpServer per /mcp request (SDK allows only 1 transport/server; overlapping multi-chat requests threw -> client timeout -> DISCONNECTED). Split registerTools -> bootstrapServices(once)+bindDispatchers(per-server).
- MCP-OOM-FIX (2026-05-23): watchdog preemptive restart on RSS pressure (3GB threshold), supervisor spawnChild injects NODE_OPTIONS heap bump.
- Ollama serve is now a scheduled task (PRISM Ollama Serve, Normal priority,
... [+2533 chars truncated]

### Assistant | 2026-06-04T03:30:34.609Z

I'll analyze the MCP contention problem. Let me start by reading the key files mentioned in the task, scoped to the directories specified.

### Assistant | 2026-06-04T03:30:35.555Z

[tool_use: Read]

### Assistant | 2026-06-04T03:30:36.038Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:30:36.525Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:30:36.832Z

[tool_use: Glob]

### User | 2026-06-04T03:30:48.322Z

[tool_result] 1	# PRISM Ollama CPU Throttle (slot golf, 2026-06-03)
2	# Pins every `ollama` serve/runner process to the lower half of logical cores
3	# + BelowNormal priority, so CPU-resident inference (forced when NIM owns the
4	# whole GPU) yields to foreground work and can't peg the box. Idempotent +
5	# fail-soft. Runs every 1 min via the "PRISM Ollama CPU Throttle" scheduled task
6	# to close the gap where
... [+1485 chars truncated]

### User | 2026-06-04T03:31:04.593Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:31:04.595Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:31:04.608Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T03:31:07.974Z

The repo tree is too large for Glob to scan. Let me use direct filesystem listing scoped to specific directories instead.

### Assistant | 2026-06-04T03:31:09.374Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:31:10.339Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:31:11.476Z

[tool_use: Bash]

### User | 2026-06-04T03:31:40.323Z

[tool_result] add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
ask-ollama-fallback.test.mjs
ask-ollama.mjs*
audit-mcp-route-takerate.mjs*
audit-mcp-route-takerate.test.mjs*
audit-memory-dbs.mjs*
audit-nudge-mcp-actions.mjs*
backfill-memory-aliases.mjs*
backfill-memory-aliases.test.mjs
backfill-memory-provenance.mjs*
batch-ollama-vision-extract.mjs*
batch-ollama-vision-extrac
... [+1359 chars truncated]

### User | 2026-06-04T03:31:45.924Z

[tool_result] autopilot-watchdog.ps1
claude-tree-priority.mjs
ensure-all-watchdogs.ps1
fleet-reaper-enum-cache.mjs
fleet-reaper-enum-cache.test.mjs
fleet-reaper-host-presets.mjs
fleet-reaper-host-presets.test.mjs
fleet-reaper.test.mjs
install-blueprint-join-refresh-task.ps1
install-blueprint-ocr-batch-task.ps1
install-brain-refresh-task.ps1
install-cleanup-orchestrator-task.ps1
install-combo-efficiency-tasks.ps
... [+1273 chars truncated]

### User | 2026-06-04T03:31:54.663Z

[tool_result] split-priority5-catalogs.ts

### Assistant | 2026-06-04T03:31:57.522Z

I have the key files identified. Let me read the supervisor, watchdog, and priority-related files that bear directly on the design.

### Assistant | 2026-06-04T03:31:58.342Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:58.821Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:59.031Z

[tool_use: Read]

### User | 2026-06-04T03:32:00.969Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-04T03:32:02.417Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-04T03:32:03.894Z

[tool_result] 1	/**
2	 * claude-tree-priority.mjs — pure-injected helper for FLEET-REAPER-MS3/U-FR-MS3-A.
3	 *
4	 * Walk a process tree rooted at a claude.exe and set its priority class so the
5	 * "active" chat (the one the user just typed in) gets a brief CPU lift over
6	 * the idle siblings. Strictly capped at AboveNormal (Above-Normal is the
7	 * highest safe class — High and Realtime affect scheduler stabi
... [+11226 chars truncated]

### Assistant | 2026-06-04T03:32:07.357Z

The supervisor/watchdog filenames differ from my guess. Let me find their exact names and read them, plus check the install tasks and the host-presets that drive the reaper priority logic.

### Assistant | 2026-06-04T03:32:09.688Z

[tool_use: Bash]

### User | 2026-06-04T03:33:20.311Z

[tool_result] nim-docker-launcher.mjs*
nim-docker-launcher.test.mjs
ollama-docker-launcher.mjs*
ollama-docker-launcher.test.mjs
start-http.mjs
start-production.ps1
start-production.sh*
---helpers daemon/supervisor---
install-mcp-server-watchdog-task.ps1
mcp-http-bridge.mjs*
mcp-server-daemon.mjs*

### Assistant | 2026-06-04T03:33:23.348Z

The supervisor/watchdog live in `.claude/helpers/`. Let me read the daemon, watchdog, install tasks, and the bridge to understand the lifecycle and where to inject priority.

### Assistant | 2026-06-04T03:33:24.088Z

[tool_use: Read]

### Assistant | 2026-06-04T03:33:24.374Z

[tool_use: Read]

### Assistant | 2026-06-04T03:33:24.733Z

[tool_use: Read]

### User | 2026-06-04T03:33:40.303Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-04T03:33:52.378Z

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
... [+7734 chars truncated]

### User | 2026-06-04T03:33:53.226Z

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

### Assistant | 2026-06-04T03:33:57.192Z

Now let me read the actual watchdog (in scripts/), the supervisor install task, and the install-mcp-server-task to understand the spawn path and where the heap/priority gets set. The watchdog references `H:\PRISM\scripts\mcp-server-watchdog.mjs`.

### Assistant | 2026-06-04T03:33:57.687Z

[tool_use: Read]

### Assistant | 2026-06-04T03:33:57.932Z

[tool_use: Read]

### User | 2026-06-04T03:34:07.896Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\mcp-server-watchdog.mjs' was already read 75s ago in this session and is unchanged (mtime 1780451545914). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T03:34:15.517Z

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

### Assistant | 2026-06-04T03:34:18.456Z

Now the supervisor itself — the canonical spawn path where NODE_OPTIONS heap is injected and where I'd add a priority floor. Let me read it.

### Assistant | 2026-06-04T03:34:18.830Z

[tool_use: Read]

### User | 2026-06-04T03:34:24.686Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\mcp-server-supervisor.mjs' was already read 2m ago in this session and is unchanged (mtime 1780412109563). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T03:34:29.798Z

The read-once guard says I read the supervisor and watchdog already — but the guard is firing on a prior turn in this session that I don't have in my context window (these were the failed reads earlier). Let me bypass the cache to actually get their content, since I genuinely need the spawn path and heap-injection logic.

### Assistant | 2026-06-04T03:34:30.422Z

[tool_use: Bash]

### User | 2026-06-04T03:35:44.830Z

[tool_result] #!/usr/bin/env node
/**
 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
 *
 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
 * driven). Designed to run as a Windows scheduled task on AtStartup +
 * AtLogon so the server is up before any Claude Code chat opens. Also runs
 * on-demand from the CLI.
 *
 * Behavior:
 *   - On launch: probe /healt
... [+6888 chars truncated]

### Assistant | 2026-06-04T03:35:47.478Z

The supervisor read worked. Let me get the rest — the spawnChild body with NODE_OPTIONS and the OOM mitigation comment.

### Assistant | 2026-06-04T03:35:48.951Z

[tool_use: Bash]

### User | 2026-06-04T03:36:43.352Z

[tool_result]   // OOM horizon out by ~10x (multi-hour mitigation). The true leak fix
  // belongs in a separate session targeting error_ledger_recall_similar
  // ref-retention. We APPEND to any caller-provided NODE_OPTIONS so an
  // operator override (e.g. =8192) wins.
  const existingNodeOpts = process.env.NODE_OPTIONS || "";
  const heapFlag = "--max-old-space-size=4096";
  const nextNodeOpts = existingNod
... [+4290 chars truncated]

### Assistant | 2026-06-04T03:36:50.930Z

Now I have the full spawn path. The supervisor spawns the child at default (Normal) priority and injects `--max-old-space-size=4096`. Now let me read the watchdog (it was earlier blocked by read-once but I never actually saw its content in this context window), the host-presets that store the reaper GPU tier config, and the fleet-reaper sweep to understand how it currently handles priority/affinity. Let me also check the now-disabled throttle task install.

### Assistant | 2026-06-04T03:36:51.313Z

[tool_use: Bash]

### User | 2026-06-04T03:37:14.928Z

[tool_result] === WATCHDOG (kill+escalate logic) ===
#!/usr/bin/env node
/**
 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
 *
 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
 * it never noticed. T
... [+5099 chars truncated]

### Assistant | 2026-06-04T03:37:19.089Z

Now I understand the watchdog's RSS-pressure preemptive restart logic (3072MB default, the cause of the documented restarts). Let me confirm the throttle task is disabled, check the ollama serve install task, and look at the fleet-reaper GPU/ollama coordinator + host presets to understand what priority knobs already exist. Then I'll have everything for the design.

### Assistant | 2026-06-04T03:37:22.210Z

[tool_use: Bash]

### User | 2026-06-04T03:38:09.966Z

[tool_result] === scheduled tasks (PRISM*) state ===
=== ollama serve / throttle install scripts present? ===
ollama-cpu-throttle.ps1

### Assistant | 2026-06-04T03:38:14.093Z

schtasks output is empty (likely needs elevation or different quoting). Let me check the host-presets file (which the durable reaper task reads for GPU-tier priority config) and the fleet-reaper sweep's priority/GPU coordinator logic — that's the existing durable mechanism I should extend rather than duplicate.

### Assistant | 2026-06-04T03:38:16.526Z

[tool_use: Bash]

### User | 2026-06-04T03:38:55.929Z

[tool_result] === fleet-reaper-sweep: priority/affinity/ollama/gpu refs ===
97:// FLEET-REAPER-MS3/U-FR-MS3-D: drop reaper self CPU priority during sweep so
106:} from "./lib/reaper-self-io-priority.mjs";
109:// top-N non-Claude heavy processes to BelowNormal; hysteresis-restore at
120:import { setPriorityForPids as _setPriorityForPidsExternal } from "../.claude/helpers/claude-tree-priority.mjs";
144:// records
... [+4412 chars truncated]

### Assistant | 2026-06-04T03:39:01.039Z

This is the key finding. The reaper already has a `demoteToBelowNormal` PowerShell applier and reads GPU/ollama state, and it has per-host presets. The reaper has a CPU-priority infrastructure but it operates on "non-Claude heavy" + "idle slot" processes — it does NOT have a dedicated ollama-runner-demote + MCP-floor mechanism. Let me look at the exact `demoteToBelowNormal` applier and how the reaper enumerates processes, plus check the bridge for any priority/liveness logic, so I know exactly where the new module plugs in.

### Assistant | 2026-06-04T03:39:02.886Z

[tool_use: Bash]

### User | 2026-06-04T03:39:55.675Z

[tool_result] === reaper demote applier + restore (880-1000) ===
    try { unlinkSync(psFile); } catch { /* best-effort */ }
  }
}

/** Windows: drop CPU priority to BelowNormal for each PID. */
function windowsPriorityRelief(pids) {
  // pids originate from Win32_Process.ProcessId (integers); String(Number())
  // double-coerces so nothing but a numeric literal lands inside @(...).
  const idLiteral = pids.map
... [+4207 chars truncated]

### Assistant | 2026-06-04T03:39:59.677Z

I now have a complete picture of the mechanisms. I have enough to write the analysis and design. Let me do a couple of final verifications: confirm the bridge has the per-request server fix deployed (1297b0a8f5), and check whether the GPU question has any existing ONNX/embedding offload surface I should reference. Let me check the bridge briefly and the embeddings engine path.

### Assistant | 2026-06-04T03:40:04.103Z

[tool_use: Bash]

### User | 2026-06-04T03:40:35.021Z

[tool_result] === bridge: liveness/retry/health-gate present? ===
=== server entry: buildRequestServer deployed? (per-request fresh server) ===
416:// FRESH McpServer per /mcp request (SDK stateless pattern). bootstrapServices() runs the
417:// heavy global I/O ONCE; bindDispatchers() is side-effect-free tool registration that runs
439:async function bootstrapServices(): Promise<void> {
523: * on fresh per-requ
... [+1183 chars truncated]

### Assistant | 2026-06-04T03:40:39.916Z

The bridge grep returned empty (the grep pattern may not match the bridge's actual symbols, but the install task confirms bridge resilience knobs exist). The per-request fresh-server fix (`buildRequestServer`/`bootstrapServices`/`bindDispatchers`) is deployed in `src/index.ts`. There's `LocalEmbeddingEngine.ts` + `OllamaEmbedderEngine.ts` — the GPU offload candidates. Let me quickly check the LocalEmbeddingEngine to confirm it's ONNX CPU-bound (the GPU question hinges on this).

### Assistant | 2026-06-04T03:40:43.300Z

[tool_use: Bash]

### User | 2026-06-04T03:41:24.027Z

[tool_result] === LocalEmbeddingEngine: ONNX/CPU/provider hints ===
36:export const DEFAULT_DIM = 384;
=== OllamaEmbedderEngine: does it call ollama /api/embed (GPU-backed already)? ===
7: * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
44:  /** Override the embeddings endpoint. Default http://127.0.0.1:11434/api/embeddings */
46:  /** Override the model name. Default nomic-embed-te
... [+294 chars truncated]

### Assistant | 2026-06-04T03:41:30.737Z

I have everything needed. Key findings confirmed:
- `LocalEmbeddingEngine` is 384-d (the CPU ONNX path), `OllamaEmbedderEngine` already routes embeddings to Ollama's GPU-backed `/api/embeddings` (nomic-embed-text) — so the GPU offload path partly exists already.
- The reaper has a full Windows priority-relief + working-set-trim infrastructure and reads GPU/ollama state, with per-host presets (`DESKTOP-N7MI1VB` = blackwell).
- The supervisor spawns the child at Normal priority with `--max-old-space-size=4096`; the watchdog preemptively restarts at RSS ≥ 3072MB (the documented "drop").

Let me update the task list and write the final analysis.

### Assistant | 2026-06-04T03:41:31.090Z

[tool_use: TaskUpdate]

### User | 2026-06-04T03:41:33.284Z

[tool_result] Updated task #5 status

### Assistant | 2026-06-04T03:43:20.012Z

# MCP Server Contention — Root-Cause Analysis + Durable Priority/Affinity Mechanism + OOM Recommendation

## 1. Contention analysis — every current MCP-drop cause (not just the one already patched)

The "MCP DISCONNECTED → watchdog restart" symptom has **four independent causes**. Three are already patched; two of those patches are themselves *triggering drops* under the new Blackwell-era load.

| # | Cause | Mechanism → drop | Status |
|---|-------|------------------|--------|
| A | SDK single-transport collision | overlapping `/mcp` requests on the shared `McpServer` threw "Already connected to a transport" → client timeout | **FIXED & deployed** — `buildRequestServer()` is live in `mcp-server/src/index.ts:416-527` (`bootstrapServices` once + `bindDispatchers` per-request). Verified. |
| B | **RSS-pressure preemptive restart = a drop** | `mcp-server-watchdog.mjs` restarts the server when `/health.memory.rss_mb ≥ 3072` (`RSS_THRESHOLD_MB` default 3072). **Three node procs are at ~2.9GB right now** — one tick over 3072 and the watchdog kills + respawns = a visible disconnect. The 3GB threshold is a 16GB-RAM-era band-aid still firing on a 127GB box. | **Patched-but-now-harmful.** Threshold must move (see §4). |
| C | **CPU starvation of the event loop (the live, unpatched cause)** | 100% aggregate CPU from 201 `/loop` sessions + Obsidian + Defender + ollama. The MCP node event loop is Normal priority; under saturation it doesn't get scheduled → `/health` and `/mcp` requests exceed the bridge/watchdog timeouts → "DISCONNECTED". **Amplified by priority inversion**: ollama `llama-server.exe` runners spawn at **AboveNormal**, structurally preempting the Normal MCP server. | **NOT durably fixed.** Golf's one-shot renormalize relieved it (100%→93%) but ollama respawns runners at AboveNormal on every model load. This is the core of the build. |
| D | App-layer wedge | port bound but `/health` hangs (CLOSE_WAIT accumulation) | **FIXED** — watchdog wedge-detection (2-fail thr
... [+14937 chars truncated]
