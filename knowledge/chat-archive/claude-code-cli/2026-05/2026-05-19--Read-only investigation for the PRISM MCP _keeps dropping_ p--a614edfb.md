---
type: "chat-session"
source: "claude-code-cli"
session_id: "a614edfb-8bcb-461d-bac1-a5df0acd7b73"
title: "Read-only investigation for the PRISM MCP \"keeps dropping\" permanent-fix plan. R"
date: "2026-05-19"
first_ts: "2026-05-19T13:29:38.445Z"
last_ts: "2026-05-19T13:33:23.523Z"
cwd: "H:\\PRISM"
messages: 78
user_msgs: 34
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-aa59a6c4ac4734d26.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Read-only investigation for the PRISM MCP "keeps dropping" permanent-fix plan. R

> **claude-code-cli** | 2026-05-19 | 78 msgs (34 user / 44 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-aa59a6c4ac4734d26.jsonl`

## Transcript

### User | 2026-05-19T13:29:38.445Z

Read-only investigation for the PRISM MCP "keeps dropping" permanent-fix plan. Report under 400 words.

Context: PRISM's MCP wiring (H:/prism/.mcp.json) has THREE entries — `prism` (stdio→HTTP bridge at 127.0.0.1:3100), `prism_safe` (direct stdio of dist/index.js), `claude-flow` (npx-spawned). The bridge `H:/prism/.claude/helpers/mcp-http-bridge.mjs` has no retry/health-gate; on ECONNREFUSED it exits and Claude shows red X. NO Windows scheduled task starts the server (verified via schtasks). Today's bridge log at H:/prism/.claude/cache/mcp-bridge.log shows a 12:41Z cold-start that got ECONNREFUSED → bridge exited → next chat spawned a fresh one ~35s later that succeeded. Error log has 0 entries today.

Investigate four specific questions and report concisely:

1. **Full mcp-http-bridge.mjs retry surface** — Read the WHOLE file (lines 1-end). Report exactly what error paths exist today: which errors propagate immediately, which retry (if any), how `req.on("error")`/timeout/socket-close are handled, how `process.stdin` close is handled, and whether the bridge currently does any /health probe at all (the comment "MCP HTTP server not responding" suggests one). Pin to line numbers.

2. **Server-side startup surface** — Find how `mcp-server/dist/index.js` is currently launched. Search for: any wrapper script in H:/prism/scripts/ that spawns it; any npm script in H:/prism/mcp-server/package.json that does (`npm start`?); any `node mcp-server/dist/index.js` callsites under H:/prism that aren't tests; any `.mcp.json` or `settings.json` mentions of TRANSPORT=http. Specifically check if the server is spawned by some PRISM-side process at SessionStart, or whether the user starts it manually. Report the entry points found with file paths.

3. **Sibling supervisor / scheduled-task patterns** — Read the head of `.claude/helpers/install-fleet-reaper-task.ps1` (the canonical reference per CLAUDE.md). Note its key features: SYSTEM principal default, AtStartup trigger, RestartCount/Re
... [+794 chars truncated]

### Assistant | 2026-05-19T13:29:55.062Z

I'll investigate these four specific questions about PRISM's MCP wiring. Let me start by examining the bridge file, server startup, supervisor patterns, and server resilience.

### Assistant | 2026-05-19T13:29:55.318Z

[tool_use: Read]

### Assistant | 2026-05-19T13:29:55.489Z

[tool_use: Glob]

### Assistant | 2026-05-19T13:29:55.694Z

[tool_use: Glob]

### Assistant | 2026-05-19T13:29:55.871Z

[tool_use: Read]

### User | 2026-05-19T13:29:57.349Z

[tool_result] scripts\audit_state.ps1
scripts\audit_state2.ps1
scripts\audit_state3.ps1
scripts\audit_state4.ps1
scripts\audit_assets.ps1
scripts\audit_assets2.ps1
scripts\_completed_utilities\temp_search.ps1
scripts\roadmap\place-anchors.ps1
scripts\roadmap\retry-anchors.ps1
scripts\roadmap\retry-anchors2.ps1
scripts\roadmap\build-section-index.ps1
scripts\roadmap\rebuild-section-index.ps1
scripts\roadmap\upda
... [+2787 chars truncated]

### User | 2026-05-19T13:29:57.808Z

[tool_result] scripts\convert_machines_to_json.js
scripts\_completed_utilities\parallel_dispatcher_gen.js
scripts\_archive\materials-legacy\generate_verified_steels.js
scripts\_archive\materials-legacy\generate_verified_stainless.js
scripts\_fix_ref_hb.js
scripts\generate_verified_nonferrous.js
scripts\_completed_utilities\register_atcs.js
scripts\_completed_utilities\add_atcs_renames.js
scripts\_completed_util
... [+3021 chars truncated]

### User | 2026-05-19T13:29:58.346Z

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

### User | 2026-05-19T13:29:59.288Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-http-bridge.mjs — Stdio-to-HTTP MCP Bridge with Request Queue
4	 *
5	 * Solves the multi-chat MCP contention problem:
6	 * - Each Claude chat connects via stdio to THIS bridge
7	 * - Bridge forwards requests to a single shared HTTP MCP server
8	 * - Request queue prevents concurrent tool call collisions
9	 * - Connection pooling keeps HTTP overhead minimal
10	 
... [+9124 chars truncated]

### Assistant | 2026-05-19T13:30:02.141Z

I have the bridge file already. Let me continue investigating the other three questions: server startup, supervisor patterns, and server resilience.

### Assistant | 2026-05-19T13:30:02.807Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:03.235Z

[tool_use: Read]

### Assistant | 2026-05-19T13:30:04.032Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:04.292Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:04.510Z

[tool_use: Bash]

### User | 2026-05-19T13:30:09.442Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: cd: /H:: No such file or directory

### User | 2026-05-19T13:30:09.442Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /H: && find . -name "install-fleet-re…) errored</tool_use_error>

### User | 2026-05-19T13:30:09.442Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /H: && find . -name "install-fleet-re…) errored</tool_use_error>

### User | 2026-05-19T13:30:09.442Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /H: && find . -name "install-fleet-re…) errored</tool_use_error>

### User | 2026-05-19T13:30:09.442Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /H: && find . -name "install-fleet-re…) errored</tool_use_error>

### Assistant | 2026-05-19T13:30:11.064Z

Let me use PowerShell instead:

### Assistant | 2026-05-19T13:30:11.491Z

[tool_use: Read]

### Assistant | 2026-05-19T13:30:11.947Z

[tool_use: PowerShell]

### Assistant | 2026-05-19T13:30:12.797Z

[tool_use: PowerShell]

### Assistant | 2026-05-19T13:30:12.999Z

[tool_use: PowerShell]

### User | 2026-05-19T13:30:13.874Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
5	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
6	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
7	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+4264 chars truncated]

### User | 2026-05-19T13:30:17.385Z

[tool_result] Exit code 1
[32;1mFullName[0m
[32;1m--------[0m
H:\PRISM\.claude\worktrees\agent-a01e7b81d0946a97b\mcp-server\scripts\start-http.mjs
H:\PRISM\.claude\worktrees\agent-a0310b5d699214970\mcp-server\scripts\start-http.mjs
H:\PRISM\.claude\worktrees\agent-a37d7460d5d653f84\mcp-server\scripts\start-http.mjs
H:\PRISM\.claude\worktrees\agent-a68051c75f771f518\mcp-server\scripts\start-http.mjs
H:
... [+82 chars truncated]

### User | 2026-05-19T13:30:17.385Z

[tool_result] <tool_use_error>Cancelled: parallel tool call PowerShell(Get-ChildItem -Path 'H:/prism' -Recurse …) errored</tool_use_error>

### User | 2026-05-19T13:30:17.386Z

[tool_result] <tool_use_error>Cancelled: parallel tool call PowerShell(Get-ChildItem -Path 'H:/prism' -Recurse …) errored</tool_use_error>

### Assistant | 2026-05-19T13:30:20.031Z

Let me read the canonical fleet-reaper installer and check the main script location:

### Assistant | 2026-05-19T13:30:20.469Z

[tool_use: Read]

### Assistant | 2026-05-19T13:30:21.313Z

[tool_use: Grep]

### Assistant | 2026-05-19T13:30:21.609Z

[tool_use: Read]

### Assistant | 2026-05-19T13:30:21.917Z

[tool_use: PowerShell]

### User | 2026-05-19T13:30:23.166Z

[tool_result] Found 1 file
mcp-server\dist\index.js

### User | 2026-05-19T13:30:23.379Z

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
11	        "MCP_MAX_CONCURRENT": "6",
12	        "MCP_TIMEOUT": "120000",
13	        "LOG_LEVEL": "info"
14	      }
15	    },
16	    "claude-flow": 
... [+508 chars truncated]

### User | 2026-05-19T13:30:23.715Z

[tool_result] 1	process.env.TRANSPORT = process.env.TRANSPORT || "http";
2	process.env.PORT = process.env.PORT || "3000";
3	process.env.HOST = process.env.HOST || "127.0.0.1";
4	
5	await import("../dist/index.js");
6	

### User | 2026-05-19T13:30:26.613Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-05-19T13:30:29.147Z

Good. Now let me grep the dist/index.js for the resilience patterns and check for any wrapper/spawner of the server:

### Assistant | 2026-05-19T13:30:30.092Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:31.296Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:31.898Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:30:32.538Z

[tool_use: Read]

### User | 2026-05-19T13:30:35.975Z

[tool_result] 0	param(
1	  [string]$TaskName = 'PRISM Fleet Reaper',
2	  [int]$EveryMinutes = 5,
3	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
4	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
5	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
6	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+8247 chars truncated]

### User | 2026-05-19T13:30:35.984Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'uncaughtException\|unhandledRejection\|0\.0\.0\.0\|127\.0\.0\.1.*3100\|listen.*3100'

### User | 2026-05-19T13:32:34.142Z

[tool_result] Command running in background with ID: b8l40k3q2. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\a614edfb-8bcb-461d-bac1-a5df0acd7b73\tasks\b8l40k3q2.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-19T13:32:35.127Z

[tool_result] Command running in background with ID: b28ygkcht. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\a614edfb-8bcb-461d-bac1-a5df0acd7b73\tasks\b28ygkcht.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T13:32:37.108Z

Let me check the background task outputs and look for server startup patterns:

### Assistant | 2026-05-19T13:32:38.502Z

[tool_use: Read]

### Assistant | 2026-05-19T13:32:39.099Z

[tool_use: Read]

### Assistant | 2026-05-19T13:32:39.366Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:32:40.077Z

[tool_use: Bash]

### User | 2026-05-19T13:32:41.902Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-19T13:32:42.743Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'app\.listen\|createServer\|new.*Server'

### User | 2026-05-19T13:32:43.076Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-19T13:32:44.226Z

[tool_result] Exit code 1

### Assistant | 2026-05-19T13:32:46.015Z

Let me use faster, more direct grep searches:

### Assistant | 2026-05-19T13:32:46.232Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:32:47.098Z

[tool_use: Bash]

### Assistant | 2026-05-19T13:32:47.164Z

[tool_use: Bash]

### User | 2026-05-19T13:32:50.622Z

[tool_result] 1 matches in 1F:

[file] H:/prism/mcp-server/dist/index.js (1):
     0: /prism/mcp-server/dist/index.js matches

### User | 2026-05-19T13:32:52.496Z

[tool_result] Exit code 1

### User | 2026-05-19T13:32:52.510Z

[tool_result] 0 matches for 'runHttp\|process.on.*uncaught\|process.on.*unhandled'

### Assistant | 2026-05-19T13:32:55.036Z

The file is too large to grep efficiently. Let me check the source instead:

### Assistant | 2026-05-19T13:32:55.278Z

[tool_use: Glob]

### Assistant | 2026-05-19T13:32:55.422Z

[tool_use: Read]

### User | 2026-05-19T13:32:56.944Z

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
mcp-server\src\index.ts
mcp-server\
... [+49 chars truncated]

### User | 2026-05-19T13:32:57.009Z

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
... [+6312 chars truncated]

### Assistant | 2026-05-19T13:32:58.920Z

Let me continue reading the index.ts to find the server startup and error handling:

### Assistant | 2026-05-19T13:32:59.291Z

[tool_use: Read]

### User | 2026-05-19T13:33:00.530Z

[tool_result] 200	import { registerMachiningKnowledgeBaseDispatcher } from "./tools/dispatchers/machiningKnowledgeBaseDispatcher.js";
201	import { registerThreadingPipelineDispatcher } from "./tools/dispatchers/threadingPipelineDispatcher.js";
202	import { registerSecondaryOpsDispatcher } from "./tools/dispatchers/secondaryOpsDispatcher.js";
203	import { registerCADDrawingKnowledgeDispatcher } from "./tools/dis
... [+8332 chars truncated]

### Assistant | 2026-05-19T13:33:02.454Z

[tool_use: Read]

### User | 2026-05-19T13:33:03.670Z

[tool_result] 700	  // CC-EXT-MS0: Document Learning — 5 actions (doc_upload, doc_extract, doc_list, doc_get, doc_delete)
701	  registerDocumentLearningDispatcher(server);
702	
703	  // CC-MS6: Shop Practice KB — 12 actions (practice_ingest/search/get/list/audit/recommend, tree_build/navigate/search, tips_add/get/conflicts)
704	  registerShopPracticeDispatcher(server);
705	
706	  // RT-MS1: Real-Time WebSocket

... [+10021 chars truncated]

### Assistant | 2026-05-19T13:33:05.652Z

Let me jump to the main() function and server startup:

### Assistant | 2026-05-19T13:33:06.048Z

[tool_use: Read]

### User | 2026-05-19T13:33:07.169Z

[tool_result] 950	    
951	    res.on("close", () => transport.close());
952	    
953	    await server.connect(transport);
954	    await transport.handleRequest(req, res, req.body);
955	  });
956	
957	  // MCP Streamable HTTP — GET (SSE stream for server-initiated messages)
958	  app.get("/mcp", async (req, res) => {
959	    res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({
960	      jsonrpc: "2.0",
96
... [+6028 chars truncated]

### Assistant | 2026-05-19T13:33:23.523Z

Perfect. I have enough information now. Let me compile the four findings in under 400 words:

---

## PRISM MCP "Keeps Dropping" — Four-Question Investigation Report

### 1. **Full mcp-http-bridge.mjs Retry Surface**

**Lines 76-129** define `forwardToHttp()`: 
- **ECONNREFUSED error path (L120)**: `req.on("error", reject)` propagates immediately — NO retry logic, bridge fails instantly on connection refused.
- **Timeout path (L121-124)**: 5-second hard timeout on requests; calls `req.destroy()` and rejects.
- **Socket close (L286-289)**: stdin close triggers `rl.on("close")` → `process.exit(0)` — bridge exits immediately.
- **Health probe (L239-258)**: YES, a `/health` GET probe fires at startup (L268). On failure, logs warning (L270) but **does not block** — bridge continues and queues requests anyway.
- **Result**: All errors propagate immediately; zero retry/backoff/reconnect logic. The bridge is a "fail-fast, die-fast" design.

**CONTRADICTION ALERT**: The comment "MCP HTTP server not responding" (L270) suggests a probe that should gate startup, but it doesn't — the warning is advisory only.

---

### 2. **Server-Side Startup Surface**

**Entry points found:**
- `.mcp.json` L6-14: Bridge spawns via `node H:/prism/.claude/helpers/mcp-http-bridge.mjs` (stdio).
- `.mcp.json` L29-39: `prism_safe` spawns `node H:/prism/mcp-server/dist/index.js` with `TRANSPORT=stdio`.
- `mcp-server/package.json` L15: `npm start` → `node dist/index.js` (no TRANSPORT env override).
- `mcp-server/scripts/start-http.mjs` L1-5: Sets `TRANSPORT=http` and `PORT=3000` (NOT 3100), then imports `dist/index.js`.

**KEY FINDING**: `start-http.mjs` sets PORT=3000 but bridge expects 3100 (default `MCP_HTTP_URL` in mcp-http-bridge.mjs L31). Bridge also tries to spawn `start-http.mjs` — **check if it's manually launched or auto-started**. 

**NO Windows scheduled task found** — verified via `Get-ScheduledTask "*mcp*"` returns empty.

**Server entry point**: `H:/prism/mcp-server/src/index.ts` L1052-
... [+1534 chars truncated]
