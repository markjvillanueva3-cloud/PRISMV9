---
type: "chat-session"
source: "claude-code-cli"
session_id: "414c2529-cd21-4d95-b81f-eb81280c1006"
title: "You are diagnosing why the PRISM MCP server (HTTP on 127.0.0.1:3100) GOES DOWN u"
date: "2026-06-04"
first_ts: "2026-06-04T19:14:01.673Z"
last_ts: "2026-06-04T19:19:45.910Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/414c2529-cd21-4d95-b81f-eb81280c1006/subagents/workflows/wf_4bac22d7-23f/agent-af4910ab04e96fc1c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# You are diagnosing why the PRISM MCP server (HTTP on 127.0.0.1:3100) GOES DOWN u

> **claude-code-cli** | 2026-06-04 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/414c2529-cd21-4d95-b81f-eb81280c1006/subagents/workflows/wf_4bac22d7-23f/agent-af4910ab04e96fc1c.jsonl`

## Transcript

### User | 2026-06-04T19:14:01.673Z

You are diagnosing why the PRISM MCP server (HTTP on 127.0.0.1:3100) GOES DOWN under load and how to harden it. Context: PRISM runs up to 26 concurrent Claude chats (NATO slots alpha..zulu), and EACH chat spawns multiple subagents — all hitting :3100 concurrently via an HTTP bridge. The server must NOT go down. This session already shipped U-BOOTGRACE-PRODUCER-WIRE (wired writePortLock bootStartedAt into both spawners so decideRestart's 90s boot-grace has a producer). Known recent regressions (from H:/prism/CLAUDE.md "## Recent regressions"): 1297b0a8f5 (":3100 'Already connected to a transport' — fresh McpServer per /mcp request via buildRequestServer"); 8cbd06cf5 (watchdog RSS preemptive restart @3GB); ee8be4fd2 (supervisor NODE_OPTIONS heap bump for OOM-kill loop). Read REAL code. Report ONLY for YOUR subsystem: (a) every concrete DOWN-MODE (how it crashes/flaps/OOMs/refuses), (b) the CURRENT mitigation in code (cite file:line) — do NOT propose rebuilding what already exists (R8), (c) the GAPS that still take it down under fleet+subagent concurrency, (d) ranked FIX CANDIDATES with file:line + the specific change + how to test it. Be concrete and cite real code. Plain prose, ~350 words max.

YOUR SUBSYSTEM: fleet-load-backpressure
READ THESE FILES (under H:/prism/): the HTTP bridge that chats+subagents use to reach :3100 (search .claude/helpers/mcp-http-bridge.mjs + .claude/hooks/mcp-connectivity-check.mjs + any client retry), and state/shared/consensus-queue.jsonl async fan-out. FOCUS: what happens when 26 chats × N subagents all call at once — is there client-side rate-limiting / connection pooling / a queue / circuit-breaker? Or does every agent open its own connection and overwhelm the single server? Is there ANY admission control / concurrency cap / per-client throttle? This is the core "handle the fleet and the agents that spawn from them" gap.

### Assistant | 2026-06-04T19:14:16.290Z

I'll diagnose the fleet-load-backpressure subsystem. Let me read the real code.

### Assistant | 2026-06-04T19:14:16.667Z

[tool_use: Read]

### Assistant | 2026-06-04T19:14:16.855Z

[tool_use: Read]

### User | 2026-06-04T19:14:45.417Z

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

### User | 2026-06-04T19:14:45.419Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+9751 chars truncated]

### Assistant | 2026-06-04T19:14:54.135Z

Now the critical question: is there cross-process admission control, or just per-bridge MAX_CONCURRENT? Let me check how the bridge is spawned (one per chat or shared) and the consensus-queue fan-out.

### Assistant | 2026-06-04T19:15:00.172Z

[tool_use: Bash]

### Assistant | 2026-06-04T19:15:02.749Z

[tool_use: Grep]

### User | 2026-06-04T19:15:43.391Z

[tool_result] Found 2 files
.gitignore
.mcp.json

### User | 2026-06-04T19:15:59.920Z

[tool_result] === consensus-queue size + tail ===
50 state/shared/consensus-queue.jsonl
---
{"ts":"2026-06-04T19:11:21.194Z","session_id":"414c2529-cd21-4d95-b81f-eb81280c1006","prompt":"when you finish current task, fix the mcp-server and upgrade it further to handle the fleet and the agent
{"ts":"2026-06-04T19:11:51.293Z","session_id":"54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6","prompt":"precompact but plan for ta
... [+280 chars truncated]

### Assistant | 2026-06-04T19:16:04.780Z

Let me check how the bridge is wired (one per chat?) and what the consensus-queue writer/consumer does.

### Assistant | 2026-06-04T19:16:05.297Z

[tool_use: Read]

### Assistant | 2026-06-04T19:16:06.945Z

[tool_use: Bash]

### User | 2026-06-04T19:16:10.421Z

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

### User | 2026-06-04T19:18:04.079Z

[tool_result] Exit code 1
=== who writes consensus-queue.jsonl ===

### Assistant | 2026-06-04T19:18:08.775Z

This confirms the architecture. `.mcp.json` is per-project config, so **every Claude chat (and every subagent inheriting MCP config) spawns its OWN bridge process** pointed at the single shared `:3100`. Let me confirm the consensus-queue writer and whether anything caps total fleet concurrency.

### Assistant | 2026-06-04T19:18:12.478Z

[tool_use: Bash]

### Assistant | 2026-06-04T19:18:10.122Z

[tool_use: Grep]

### User | 2026-06-04T19:19:03.832Z

[tool_result] === server-side maxSockets / agent / connection cap on :3100 ? ===
=== how many bridge log lines / distinct bridge ids recently ===
30

### User | 2026-06-04T19:19:07.901Z

[tool_result] Found 3 files
.gitignore
.claude\hooks\auto-consensus-userprompt.mjs
.claude\hooks\auto-consensus-critical-edit.mjs

### Assistant | 2026-06-04T19:19:17.404Z

I have enough. Let me confirm the consensus-queue fan-out behavior quickly.

### Assistant | 2026-06-04T19:19:17.405Z

[tool_use: Read]

### User | 2026-06-04T19:19:22.050Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * auto-consensus-userprompt.mjs — UserPromptSubmit hook.
5	 *
6	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
7	 *
8	 * What this hook does
9	 * -------------------
10	 * 1. Reads the user's prompt from stdin.
11	 * 2. Detects "dev intent" keywords (build, plan, refactor, decide, review, etc).
12	 * 3. CACHE-FIRST: hashes the prompt, look
... [+2354 chars truncated]

### Assistant | 2026-06-04T19:19:45.910Z

I have everything needed for the fleet-load-backpressure subsystem.

## fleet-load-backpressure — DOWN-MODES & HARDENING

**(a) DOWN-MODES.** The fatal architecture fact: `.mcp.json` spawns one `mcp-http-bridge.mjs` **per Claude process** (`type:"stdio"`, args→bridge). 26 chats × N subagents each inherit this config → **N bridges, each opening its own HTTP connections to the single :3100**. Under fan-out: (1) **connection-storm thundering herd** — there is NO connection pooling: `forwardToHttp` creates a fresh `http.request` (default global agent, no `maxSockets`) every call; tens-to-hundreds of concurrent POSTs hit one Node server, exhausting its event loop / sockets → request latency climbs past `REQUEST_TIMEOUT` 120s → timeouts. (2) **Cold-start retry amplification** — when :3100 dies, every bridge independently runs `forwardWithRetry` AND `ensureServerStarted` (throttled only per-bridge at 15s), so a restart is hammered by the same herd it died from. (3) **Self-heal spawn-storm** — N bridges each spawn a supervisor; O_EXCL dedups winners but the losing spawns still burn CPU/IO during the outage. (4) **Queue-drainer fan-out OOM** — consensus-queue async fan-out spawns multi-model consensus per dev-prompt; uncapped concurrency feeds the 3GB RSS watchdog kill (8cbd06cf5).

**(b) CURRENT mitigations (do not rebuild).** Per-bridge concurrency cap `MAX_CONCURRENT=3` (`mcp-http-bridge.mjs:50`, `.mcp.json:11`) + in-process queue (`processQueue` :282-325). Connection-class retry w/ backoff (:239-277). `/ready` gate before first message (:477-501). uncaughtException keep-alive (:564-569). Queue cap `MAX_QUEUE=50` (`auto-consensus-userprompt.mjs:48`).

**(c) GAPS.** The 3-cap is **per-bridge, not fleet-wide** — there is zero cross-process admission control, no shared semaphore, no connection pool (`http.Agent({keepAlive,maxSockets})` absent), no circuit-breaker. 26×N bridges × 3 = effectively unbounded server-side concurrency. Backoff is uncoordinated (no jitter → synchron
... [+1176 chars truncated]
