---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Find and read the per-turn MCP auto-reconnect: grep H:/prism/.claude/hooks for '"
date: "2026-06-02"
first_ts: "2026-06-02T14:07:13.483Z"
last_ts: "2026-06-02T14:12:08.106Z"
cwd: "H:\\prism-slot-golf"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a82212b8ea8576edb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Find and read the per-turn MCP auto-reconnect: grep H:/prism/.claude/hooks for '

> **claude-code-cli** | 2026-06-02 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a82212b8ea8576edb.jsonl`

## Transcript

### User | 2026-06-02T14:07:13.483Z

Find and read the per-turn MCP auto-reconnect: grep H:/prism/.claude/hooks for 'mcp-connectivity-check' and 'maybeReconnect' (commit 05d920ec3b wired maybeReconnect into the DOWN branch with a single-flight O_EXCL lock). How does it decide :3100 is down and spawn a restart? Why might its single-flight lock FAIL to prevent 11 duplicate spawns (lock path per-worktree? lock not held across the spawn? stale-lock bypass?)? What is the exact spawn command it uses?

Return a CONCISE plain-text report (<=30 lines, NO JSON). Cover: (a) current behavior in 3-5 bullets, (b) specific gaps under high concurrency / restart-storms — focus on the failure we just hit: 11 'node dist/index.js' instances piled up racing to bind :3100, hung at ~700MB each instead of exiting, fleet-wide connect failures, (c) 2-3 concrete hardening changes as file:function -> change. Be exact about file paths, function names, and line areas. Do NOT paste large code blocks; cite line ranges.

### Assistant | 2026-06-02T14:07:47.762Z

I'll grep the hooks directory for both terms to find the relevant code.

### Assistant | 2026-06-02T14:07:49.255Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:07:49.661Z

[tool_use: Grep]

### User | 2026-06-02T14:08:47.750Z

[tool_result] Found 1 file
H:\prism\.claude\hooks\mcp-connectivity-check.mjs

### User | 2026-06-02T14:08:48.189Z

[tool_result] Found 3 files
H:\prism\.claude\hooks\mcp-connectivity-check.mjs
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.claude\hooks\mcp-connectivity-check.test.mjs

### Assistant | 2026-06-02T14:08:52.391Z

[tool_use: Read]

### User | 2026-06-02T14:09:30.064Z

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

### Assistant | 2026-06-02T14:09:35.980Z

Now the core reconnect library.

### Assistant | 2026-06-02T14:09:36.162Z

[tool_use: Read]

### User | 2026-06-02T14:10:08.271Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+13272 chars truncated]

### Assistant | 2026-06-02T14:10:13.706Z

Now let me look at the spawn target — `mcp-server-daemon.mjs` — to find the exact spawn command and whether it guards against duplicate binds.

### Assistant | 2026-06-02T14:10:13.707Z

[tool_use: Read]

### User | 2026-06-02T14:11:01.504Z

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

### Assistant | 2026-06-02T14:11:11.496Z

I have everything I need. The chain is `mcp-connectivity-check.mjs` → `maybeReconnect()` → `spawnDaemon()` → `mcp-server-daemon.mjs start` → `spawn(node, ["dist/index.js"])`. Now I can analyze the failure modes.

The key finding: the O_EXCL lock at `H:/prism/state/shared/.mcp-reconnect.lock` only single-flights `maybeReconnect`'s *decision to call `spawnDaemon`*. But `spawnDaemon` runs `mcp-server-daemon.mjs start` **detached and fire-and-forget** — `maybeReconnect` returns immediately after `child.pid` exists, NOT after the daemon binds :3100. The lock is held only for the instant of `spawn()`, not across the daemon's 30s warmup/bind. And the daemon's own guard (`start()` lines 102-122) checks the PID file + `/health` — but during a restart-storm the prior daemon is hung at ~700MB (event loop blocked, not answering `/health`, but the OLD pid still "running"), so each fresh spawn's guard sees an unhealthy PID, SIGTERMs it, then races to bind :3100.

Let me confirm the lock-path-per-worktree question (whether `PRISM_ROOT` differs across slot worktrees).

### Assistant | 2026-06-02T14:11:12.480Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:11:13.735Z

[tool_use: Grep]

### User | 2026-06-02T14:11:37.598Z

[tool_result] No matches found

### User | 2026-06-02T14:11:38.337Z

[tool_result] No matches found

### Assistant | 2026-06-02T14:12:08.106Z

Confirmed: neither file references `PRISM_ROOT` overriding, so the lock path resolves via `mcp-reconnect-action.mjs` line 39 (`process.env.PRISM_ROOT || "H:/prism"`). All 26 slot worktrees run the same hook from `H:/prism/.claude/hooks`, and `DEFAULT_LOCK_PATH` is hardcoded to `H:/prism/state/shared/` — so the lock IS shared fleet-wide (not per-worktree). The real gaps are elsewhere. Here is the report.

MCP per-turn auto-reconnect — behavior + failure analysis (commit 05d920ec3b)

Files: `H:/prism/.claude/hooks/mcp-connectivity-check.mjs` (UserPromptSubmit hook) → `H:/prism/scripts/lib/mcp-reconnect-action.mjs` (`maybeReconnect`/`spawnDaemon`) → `H:/prism/.claude/helpers/mcp-server-daemon.mjs` (`start`).

(a) Current behavior
- Each turn the hook probes GET `http://127.0.0.1:3100/health` (3s timeout, 30s throttle). DOWN = 5xx / ECONNREFUSED / timeout; 2xx-4xx = up (connectivity-check.mjs:123, 102-133).
- On DOWN it calls `maybeReconnect({ok:result.ok})` (connectivity-check.mjs:185-191). That single-flights via O_EXCL ("wx") lock at `H:/prism/state/shared/.mcp-reconnect.lock`, TTL/throttle 60s; `decideReconnect` returns skip if lock age < TTL, reclaim if stale (reconnect-action.mjs:43-67, 73-92, 124-161).
- If it wins the lock it calls `spawnDaemon` → DETACHED, unref'd `spawn(process.execPath, [helper,"start"])` and returns immediately on `child.pid` — fire-and-forget, NO wait for bind (reconnect-action.mjs:98-113).
- `mcp-server-daemon.mjs start` is the real spawner: exact command is `spawn(process.execPath, ["dist/index.js"], {cwd:"H:/prism/mcp-server", env:{TRANSPORT:"http", PORT:"3100", ...}, detached:true})` (daemon.mjs:147-161).

(b) Gaps that let 11 `node dist/index.js` pile up
- LOCK RELEASED TOO EARLY (root cause): the O_EXCL lock guards only the *instant of `spawn()`*, not the daemon's ~30s warmup/bind. `maybeReconnect` returns after `child.pid`, the lock then expires by age only (60s). So the lock prevents duplicate *spawn calls within 60s* but does NOTHI
... [+2260 chars truncated]
