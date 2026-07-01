---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are diagnosing the MCP server architecture and EVERY cause of the recurring "
date: "2026-06-04"
first_ts: "2026-06-04T03:30:23.030Z"
last_ts: "2026-06-04T03:37:49.762Z"
cwd: "H:\\PRISM"
messages: 75
user_msgs: 31
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a36d5208b1be5bd0d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are diagnosing the MCP server architecture and EVERY cause of the recurring 

> **claude-code-cli** | 2026-06-04 | 75 msgs (31 user / 44 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a36d5208b1be5bd0d.jsonl`

## Transcript

### User | 2026-06-04T03:30:23.030Z

You are diagnosing the MCP server architecture and EVERY cause of the recurring "MCP DISCONNECTED" drop. 
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
- Ollama serve is now a scheduled task (PRISM Ollama Serve, Normal priority, logon trigger), CPU throttle task
... [+2360 chars truncated]

### Assistant | 2026-06-04T03:30:42.972Z

I'll diagnose the MCP server architecture and every cause of the recurring "MCP DISCONNECTED" drop. Let me start by mapping the key files in parallel.

### Assistant | 2026-06-04T03:30:43.907Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:30:44.344Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:30:44.786Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:30:44.940Z

[tool_use: Glob]

### User | 2026-06-04T03:31:08.634Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:31:08.702Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:31:08.853Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T03:31:08.952Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T03:31:11.852Z

The recursive globs from repo root timed out. Let me scope to specific directories using PowerShell directory listings instead, which is faster than ripgrep on a 548MB tree.

### Assistant | 2026-06-04T03:31:14.278Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:31:15.672Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:31:16.965Z

[tool_use: PowerShell]

### User | 2026-06-04T03:31:22.456Z

[tool_result] [32;1mName                   [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m----                   [0m [32;1m------[0m [32;1m-------------[0m
brief-drift-monitor.mjs   7002 5/2/2026 4:27:56 PM
lyapunov_monitor.ts       3744 4/18/2026 11:58:13 PM
lyapunov-monitor.ts       5072 4/18/2026 2:35:24 PM
start-http.mjs             191 3/31/2026 7:57:58 PM

### User | 2026-06-04T03:31:27.444Z

[tool_result] [32;1mName                                 [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m----                                 [0m [32;1m------[0m [32;1m-------------[0m
agent-coordination-daemon.mjs          17741 5/13/2026 11:38:54 AM
autopilot-watchdog.ps1                  9575 4/5/2026 12:16:50 AM
cog-bridge-drain.mjs                   12539 5/7/2026 9:06:18 PM
coord-ipc-ser
... [+1468 chars truncated]

### User | 2026-06-04T03:31:31.087Z

[tool_result] [32;1mName                           [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m----                           [0m [32;1m------[0m [32;1m-------------[0m
DIRECTIVE_SUMMARIES_REFRESH.log   1191 4/28/2026 9:45:00 AM
CAD_COVERAGE_REFRESH.log          6166 4/25/2026 12:22:54 AM

### Assistant | 2026-06-04T03:31:35.785Z

`mcp-http-bridge.mjs` is in `.claude/helpers` (not the server proper — that's the bridge). The state logs are stale. Let me find the actual HTTP bridge server file (the one serving :3100 with the SDK transport) and the watchdog/supervisor scripts. The bridge fix `1297b0a8f5` mentioned `buildRequestServer`. Let me search the server directory and find logs more broadly.

### Assistant | 2026-06-04T03:31:37.672Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:31:39.650Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:31:41.680Z

[tool_use: PowerShell]

### User | 2026-06-04T03:31:52.697Z

[tool_result] <persisted-output>
Output too large (39.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\8765f828-890b-45ba-8af4-4bbf24e81b0b\tool-results\baim09bo7.txt

Preview (first 2KB):
[32;1mFullName                                                                                [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m--------                                              
... [+1760 chars truncated]

### User | 2026-06-04T03:31:58.646Z

[tool_result] (PowerShell completed with no output)

### User | 2026-06-04T03:32:02.590Z

[tool_result] [32;1mFullName                                            [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m--------                                            [0m [32;1m------[0m [32;1m-------------[0m
H:\PRISM\mcp-server\data\state\watchdog-state.json      122 6/3/2026 10:28:28 PM
H:\PRISM\mcp-server\data\state\server-supervisor.pid      5 6/3/2026 10:16:57 PM

### Assistant | 2026-06-04T03:32:06.602Z

I found `watchdog-state.json` and `server-supervisor.pid` updated today (10:28 PM and 10:16 PM). The src dir lookup hit too many test files. Let me find the actual entry-point files. The server-supervisor.pid implies a `server-supervisor` script. Let me locate the real bridge server, supervisor, and watchdog scripts precisely.

### Assistant | 2026-06-04T03:32:09.419Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:32:09.904Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:10.915Z

[tool_use: Read]

### User | 2026-06-04T03:32:15.798Z

[tool_result] [32;1mFullName                                                   [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m--------                                                   [0m [32;1m------[0m [32;1m-------------[0m
H:\PRISM\mcp-server\scripts\nim-docker-launcher.mjs          11251 5/17/2026 8:06:19 PM
H:\PRISM\mcp-server\scripts\nim-docker-launcher.test.mjs      5096 5/17/2026 8:06
... [+540 chars truncated]

### User | 2026-06-04T03:32:33.845Z

[tool_result] 1	{
2	  "consecutiveFails": 0,
3	  "lastProbeAt": 1780543708506,
4	  "lastEscalationAt": 1780502321202,
5	  "lastFailReason": null
6	}

### User | 2026-06-04T03:32:33.847Z

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

### Assistant | 2026-06-04T03:32:38.763Z

Now I have the architecture. The supervisor is `H:\PRISM\scripts\mcp-server-supervisor.mjs` (repo root, not mcp-server/scripts) and the bridge is `.claude/helpers/mcp-http-bridge.mjs`. Critically, the server entry is `mcp-server/dist/index.js` with `TRANSPORT=http`. Let me read the supervisor, the bridge, and find the actual server entry + watchdog. Let me also find the supervisor.log.

### Assistant | 2026-06-04T03:32:39.251Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:40.223Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:42.407Z

[tool_use: PowerShell]

### User | 2026-06-04T03:32:51.223Z

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

### User | 2026-06-04T03:32:52.630Z

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

### User | 2026-06-04T03:32:57.904Z

[tool_result] [32;1mName            [0m[32;1m  Length[0m[32;1m LastWriteTime[0m
[32;1m----            [0m [32;1m ------[0m [32;1m-------------[0m
supervisor.log       393 6/3/2026 10:31:57 PM
watchdog.log      460696 6/3/2026 10:28:28 PM
supervisor.log.1 1102311 6/3/2026 10:24:29 PM
combined.log     9083045 3/26/2026 1:09:30 PM
error.log          29425 3/26/2026 1:07:54 PM

---WATCHDOG SCRIP
... [+1602 chars truncated]

### Assistant | 2026-06-04T03:33:04.123Z

Wait — I read the supervisor at `H:\PRISM\scripts\mcp-server-supervisor.mjs` (12,116 bytes per the listing, but my Read showed an older 328-line version). The listing shows it was modified 6/2 at 9:55 AM (12,116 bytes) and there's `mcp-server-watchdog.mjs` (15,555 bytes, modified 6/2 8:52 PM). Let me re-read the current supervisor (it may differ from what I read — my Read may have hit a cached/stale path) and read the watchdog + recent logs. Let me also check the actual server entry for the `/mcp` route and `buildRequestServer`.

### Assistant | 2026-06-04T03:33:05.085Z

[tool_use: Read]

### Assistant | 2026-06-04T03:33:06.016Z

[tool_use: PowerShell]

### Assistant | 2026-06-04T03:33:07.382Z

[tool_use: PowerShell]

### User | 2026-06-04T03:33:12.160Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\mcp-server-watchdog.mjs' was already read 19s ago in this session and is unchanged (mtime 1780451545914). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T03:33:43.025Z

[tool_result] {"ts":"2026-06-03T19:48:27.838Z","pid":69880,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":782,"uptimeSec":2236}
{"ts":"2026-06-03T19:53:33.232Z","pid":68344,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":796,"uptimeSec":259}
{"ts":"2026-06-03T19:58:27.847Z","pid":25556,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":818,"uptimeSec":554}
{"ts":"2026-06-03T20:03:32.
... [+4630 chars truncated]

### User | 2026-06-04T03:34:12.917Z

[tool_result] {"ts":"2026-06-04T03:25:58.179Z","pid":81120,"level":"info","msg":"MCP server already up — supervisor exiting","statusCode":200}
{"ts":"2026-06-04T03:28:56.948Z","pid":80724,"level":"info","msg":"MCP server already up — supervisor exiting","statusCode":200}
{"ts":"2026-06-04T03:31:57.617Z","pid":55520,"level":"info","msg":"MCP server already up — supervisor exiting","statusCode":200}
===SUPERVI
... [+2591 chars truncated]

### Assistant | 2026-06-04T03:34:21.793Z

The watchdog log is enormously informative. The watchdog ran from a different file (`mcp-server-watchdog.mjs`) that was "already read 19s ago" — but I never read it; that's the read-once-guard referring to another agent or a phantom. Let me read it now via offset (the guard blocks a full re-read). Most critically, the watchdog log reveals the SMOKING GUN: **the server PID changes on nearly every 5-min probe** (69880 → 68344 → 25556 → 58076...) and **RSS resets** (rssMB 44, 51, 60, then climbing 632→683→696→735). The server is restarting constantly. Let me read the watchdog script and the server entry's /mcp route.

### Assistant | 2026-06-04T03:34:22.468Z

[tool_use: Read]

### Assistant | 2026-06-04T03:34:24.590Z

[tool_use: PowerShell]

### User | 2026-06-04T03:34:38.984Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+8614 chars truncated]

### User | 2026-06-04T03:34:44.557Z

[tool_result] [32;1mName                               [0m[32;1m Length[0m[32;1m LastWriteTime[0m
[32;1m----                               [0m [32;1m------[0m [32;1m-------------[0m
index.ts                             65047 6/2/2026 8:21:54 PM
KnowledgeApplicabilityEngine.ts.tmp     22 4/13/2026 8:07:20 PM

===src/mcp===

[32;1mName                      [0m[32;1m Length[0m[32;1m LastWri
... [+1329 chars truncated]

### Assistant | 2026-06-04T03:34:49.410Z

The server entry is `mcp-server/src/index.ts` (65KB, compiled to dist/index.js). Now let me read the critical parts of index.ts: the `/mcp` route handler, `buildRequestServer`, the `/health` and `/ready` endpoints, and the HTTP listen path. I'll search within index.ts specifically (scoped). Let me also read the rest of the watchdog escalation logic.

### Assistant | 2026-06-04T03:34:51.697Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:34:52.309Z

[tool_use: Read]

### User | 2026-06-04T03:35:11.846Z

[tool_result] 200	    const r = spawnSync("taskkill", ["/F", "/PID", String(pid)], { encoding: "utf-8", windowsHide: true });
201	    log("info", "taskkill result", { code: r.status, stdout: (r.stdout || "").slice(0, 200), stderr: (r.stderr || "").slice(0, 200) });
202	  } else {
203	    log("warn", "No listener PID found on port — server may already be down", { port: SERVER_PORT });
204	  }
205	  // Step 2: sp
... [+7460 chars truncated]

### User | 2026-06-04T03:35:15.707Z

[tool_result] 18:import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
20:import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
37:} from "./mcp/index.js";
41:} from "./mcp/authHttp.js";
406:const server = new McpServer({
413:// The HTTP /mcp handler used to call server.connect(transport) on this MODULE-LEVEL
416:// FRESH McpServer per /mcp request (S
... [+3126 chars truncated]

### Assistant | 2026-06-04T03:35:25.092Z

The `buildRequestServer` fix (1297b0a8f5) IS present — confirmed at index.ts:890-898, with `/mcp` POST handler at 1137 calling `buildRequestServer()` at 1205, fresh `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` (stateless) at 1194. Now let me read the critical sections: the `/mcp` POST handler (1137-1226), `/health` (982-1012), `/ready` (1040-1075), the `listen` + bootstrap path (915-980, 1294+), and the per-request server build. This is the heart of the diagnosis.

### Assistant | 2026-06-04T03:35:25.366Z

[tool_use: Read]

### User | 2026-06-04T03:35:35.264Z

[tool_result] 982	  app.get("/health", async (_, res) => {
983	    const memUsage = process.memoryUsage();
984	    const uptime = process.uptime();
985	    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
986	    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
987	    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
988	    
989	    // Registry health
990	    const registry
... [+14449 chars truncated]

### Assistant | 2026-06-04T03:35:39.992Z

Now let me read the critical bind-fail-fast handler (1298+) and the bootstrap/listen section (915-980), plus the per-request `buildRequestServer` + the `_postBindDone` guard. These determine whether per-request `buildRequestServer()` is cheap or expensive (a key drop-cause for CPU starvation).

### Assistant | 2026-06-04T03:35:40.515Z

[tool_use: Read]

### Assistant | 2026-06-04T03:35:40.863Z

[tool_use: Read]

### User | 2026-06-04T03:35:49.008Z

[tool_result] 880	    const { eventBus, EventTypes } = await import("./engines/EventBus.js");
881	    eventBus.publish(EventTypes.SYSTEM_STARTUP, {
882	      timestamp: new Date().toISOString(),
883	      dispatchers_registered: true,
884	    }, { category: "system", priority: "high", source: "index" });
885	  } catch { /* startup event is best-effort */ }
886	  } // end once-only post-bind tail (guarded by _po
... [+4358 chars truncated]

### User | 2026-06-04T03:35:49.122Z

[tool_result] 1300	  // (~700MB, all engines loaded) instead of exiting → the 11-instance pileup that
1301	  // took :3100 down fleet-wide. exit(0) on EADDRINUSE = "a peer already owns the
1302	  // port, which is success for the fleet" → does NOT trip the supervisor backoff/
1303	  // respawn loop. Any other listen error is fatal (exit 1) so the supervisor restarts.
1304	  httpServer.on("error", (e: NodeJS.Err
... [+4089 chars truncated]

### Assistant | 2026-06-04T03:35:53.843Z

Now I have the full picture. The critical finding: `buildRequestServer()` calls `bindDispatchers(s)` on **every single `/mcp` request** — registering ALL ~90 dispatchers / ~7,244 actions onto a fresh McpServer per request. Let me verify how heavy `bindDispatchers` is (it's the per-request cost that, under CPU saturation, causes the timeouts). Let me read it and the `_postBindDone` guard.

### Assistant | 2026-06-04T03:35:54.368Z

[tool_use: Read]

### User | 2026-06-04T03:36:12.764Z

[tool_result] 520	/**
521	 * Per-server tool BINDING — side-effect-free beyond server.tool(...) registration.
522	 * Safe to call ONCE on the shared server (REST + /health + bridge) AND repeatedly
523	 * on fresh per-request servers built by buildRequestServer(). The temporary
524	 * server.tool proxy is installed and restored within this function, scoped to the
525	 * passed `server`, so concurrent calls on di
... [+6109 chars truncated]

### Assistant | 2026-06-04T03:36:19.391Z

I now have conclusive evidence. `bindDispatchers` synchronously registers ~90 dispatchers (each wrapping its actions with the universal auto-hook proxy) onto a fresh McpServer — and `buildRequestServer()` runs this **on every single `/mcp` POST**. That is heavy synchronous CPU work on the main event loop per request, multiplied by 201 active sessions. Under CPU saturation, this is the dominant new drop-cause.

Let me confirm two remaining things: (1) whether there's a dual-spawn / multiple scheduled tasks both launching the server (the supervisor's 3-min repeat + watchdog + bridge self-heal all racing), and (2) check the bootstrap heavy section briefly. Let me also verify the GPU/ollama question context — check if any inline inference (ONNX embeddings) runs on the main thread.

### Assistant | 2026-06-04T03:36:20.808Z

[tool_use: Read]

### Assistant | 2026-06-04T03:36:23.827Z

[tool_use: PowerShell]

### User | 2026-06-04T03:36:27.060Z

[tool_result] 439	async function bootstrapServices(): Promise<void> {
440	  if (_bootstrapped) return;
441	  _bootstrapped = true;
442	  log.info("Bootstrapping PRISM services (one-time)...");
443	
444	  // Initialize registries first
445	  log.info("Initializing data registries...");
446	  await registryManager.initialize();
447	  
448	  // Session 43+: Bootstrap full formula (490) and machine (824) registries
... [+4156 chars truncated]

### User | 2026-06-04T03:36:40.070Z

[tool_result] [32;1mTaskName                         [0m[32;1m    State[0m
[32;1m--------                         [0m [32;1m   -----[0m
PRISM Blueprint Join Refresh         Ready
PRISM Blueprint OCR Batch            Ready
PRISM Brain Refresh                  Ready
PRISM Brain Web                      Ready
PRISM Cleanup Orchestrator           Ready
PRISM Combo Efficiency Baseline      Ready
PRIS
... [+1202 chars truncated]

### Assistant | 2026-06-04T03:36:48.402Z

This confirms everything. Key live findings:
- `:3100` listener is PID **36276** — matching the operator's ground-truth (the 756MB owner node, just boosted to AboveNormal). The server has been stable on this PID since the operator's intervention.
- The watchdog log earlier showed rapid PID churn (69880→68344→25556...) with RSS resets — but that was the watchdog log's *own* PID per run (each 5-min watchdog invocation is a fresh process), NOT the server. The `uptimeSec` field is the real server uptime, and it DID reset repeatedly (2236→259→554→66→364... then 31→331→631), proving the **server itself restarted many times**.
- 56 node processes, but only one owns :3100 — no dual-listener. The preflight + EADDRINUSE handler are working.
- Both "PRISM MCP Server" (3-min repeat supervisor) and "PRISM MCP Server Watchdog" + "PRISM MCP Connectivity Monitor" + "PRISM Memory Pressure Auto-Relief" are all Ready/active — multiple independent restart authorities.

Now I have everything needed. Let me update the task and write the report.

### Assistant | 2026-06-04T03:36:48.593Z

[tool_use: TaskUpdate]

### User | 2026-06-04T03:36:50.651Z

[tool_result] Updated task #4 

### Assistant | 2026-06-04T03:37:49.762Z

# MCP DISCONNECTED — Full Architecture Diagnosis & Every Drop-Cause (DESKTOP-N7MI1VB, 2026-06-03)

## Architecture summary (verified, file:line)

**Topology:** Each Claude chat spawns its own `mcp-http-bridge.mjs` (stdio↔HTTP) → forwards JSON-RPC to ONE shared HTTP server on `127.0.0.1:3100`. The server is a single Node process (`mcp-server/dist/index.js`, built from `src/index.ts`, 65KB) run under `TRANSPORT=http`.

**Lifecycle authorities (FOUR independent restart triggers — this is itself a problem):**
| Component | File | Role |
|---|---|---|
| Supervisor | `H:\PRISM\scripts\mcp-server-supervisor.mjs` | Spawns `dist/index.js` w/ `NODE_OPTIONS=--max-old-space-size=4096`; respawn w/ exp backoff; O_EXCL PID lock at `mcp-server/data/state/server-supervisor.pid` |
| Scheduled task "PRISM MCP Server" | `install-mcp-server-task.ps1` | AtStartup + AtLogon + **3-min repetition** relaunching the supervisor |
| Watchdog | `H:\PRISM\scripts\mcp-server-watchdog.mjs` (task "PRISM MCP Server Watchdog", 5-min) | `/health` probe; on 2 consecutive fails OR RSS≥3072MB → `taskkill /F` the :3100 PID + respawn supervisor |
| Bridge self-heal | `mcp-http-bridge.mjs:155` `ensureServerStarted()` | Each of ~26 bridges spawns the supervisor on any connection-class error (throttled 15s/bridge) |
| Plus 2 more live tasks | "PRISM MCP Connectivity Monitor", "PRISM Memory Pressure Auto-Relief" | additional kill/restart authority |

**Server request path (the key cost center):** `app.post("/mcp")` (index.ts:1137) builds a **FRESH `McpServer` per request** via `buildRequestServer()` (index.ts:896) → `bindDispatchers(s)` (index.ts:527) which synchronously registers **~90 dispatchers / ~7,244 actions**, each wrapped by the universal auto-hook proxy (index.ts:541-568), on EVERY `/mcp` POST. `bootstrapServices()` (the heavy ~700MB engine/registry/DB load) is correctly run ONCE and guarded by `_bootstrapped` (index.ts:440) + `_postBindDone`.

**Live ground truth confirmed:** `:3100` listener = PID 3
... [+7674 chars truncated]
