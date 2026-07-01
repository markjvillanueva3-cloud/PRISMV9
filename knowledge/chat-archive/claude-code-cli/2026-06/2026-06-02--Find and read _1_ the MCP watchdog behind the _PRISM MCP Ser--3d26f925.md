---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Find and read (1) the MCP watchdog behind the 'PRISM MCP Server Watchdog' / 'PRI"
date: "2026-06-02"
first_ts: "2026-06-02T14:07:13.483Z"
last_ts: "2026-06-02T14:16:45.163Z"
cwd: "H:\\prism-slot-golf"
messages: 54
user_msgs: 22
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a0f6bd9723f0b1f92.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Find and read (1) the MCP watchdog behind the 'PRISM MCP Server Watchdog' / 'PRI

> **claude-code-cli** | 2026-06-02 | 54 msgs (22 user / 32 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a0f6bd9723f0b1f92.jsonl`

## Transcript

### User | 2026-06-02T14:07:13.483Z

Find and read (1) the MCP watchdog behind the 'PRISM MCP Server Watchdog' / 'PRISM MCP Server' scheduled tasks — grep H:/prism for 'mcp-server-watchdog', 'install-mcp-monitor', RSS/heap restart thresholds; (2) H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs the --services=mcp path. What RSS/heap threshold triggers a preemptive restart (CLAUDE.md notes a 3GB threshold + NODE_OPTIONS heap bump)? Does the restart drain gracefully or hard-kill, and does it reap stale instances first?

Return a CONCISE plain-text report (<=30 lines, NO JSON). Cover: (a) current behavior in 3-5 bullets, (b) specific gaps under high concurrency / restart-storms — focus on the failure we just hit: 11 'node dist/index.js' instances piled up racing to bind :3100, hung at ~700MB each instead of exiting, fleet-wide connect failures, (c) 2-3 concrete hardening changes as file:function -> change. Be exact about file paths, function names, and line areas. Do NOT paste large code blocks; cite line ranges.

### Assistant | 2026-06-02T14:07:48.302Z

I'll investigate the MCP watchdog and restart behavior. Let me start by searching for the relevant files.

### Assistant | 2026-06-02T14:07:49.253Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:07:49.724Z

[tool_use: Glob]

### Assistant | 2026-06-02T14:07:50.194Z

[tool_use: Glob]

### Assistant | 2026-06-02T14:07:50.623Z

[tool_use: Glob]

### User | 2026-06-02T14:08:46.916Z

[tool_result] .claude\hooks\auto-precompact-watchdog.mjs
.claude\hooks\autonomous-loop-watchdog.mjs
.claude\hooks\tool-watchdog.mjs
scripts\__tests__\golf-watchdog-wiring-bridge.test.mjs
scripts\golf-watchdog-wiring-bridge.mjs
.claude\hooks\__tests__\wiki-watchdog-actuator-e2e.test.mjs
.claude\hooks\agent-watchdog.mjs
.claude\hooks\stop-memory-size-watchdog.mjs
.claude\hooks\wiki-propagation-watchdog-stop.mjs
.
... [+201 chars truncated]

### User | 2026-06-02T14:08:47.107Z

[tool_result] No files found

### User | 2026-06-02T14:08:47.709Z

[tool_result] mcp-server\scripts\ollama-docker-launcher.mjs

### User | 2026-06-02T14:08:59.514Z

[tool_result] Found 3 files
H:\prism\.claude\helpers\install-mcp-monitor-task.ps1
H:\prism\.audit-wh.json
H:\prism\.claude\helpers\ensure-all-watchdogs.ps1

### Assistant | 2026-06-02T14:09:03.824Z

Found the key files. Let me read the watchdog, the installer, and the launcher.

### Assistant | 2026-06-02T14:09:04.297Z

[tool_use: Read]

### Assistant | 2026-06-02T14:09:05.274Z

[tool_use: Read]

### Assistant | 2026-06-02T14:09:05.284Z

[tool_use: Read]

### User | 2026-06-02T14:09:15.660Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-golf.

### User | 2026-06-02T14:09:33.559Z

[tool_result] 1	# install-mcp-monitor-task.ps1 — register "PRISM MCP Connectivity Monitor"
2	#
3	# Scheduled task runs every 5 minutes under the current user (no elevation
4	# required). Each invocation = one tick of monitor-mcp-and-reaper.mjs --once:
5	# probes :3100/health, tails fleet-reaper.log, appends one JSONL row to
6	# H:/prism/state/shared/dashboards/mcp-reaper-monitor.jsonl.
7	#
8	# Idempotent — re-r
... [+2877 chars truncated]

### User | 2026-06-02T14:09:34.376Z

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

### Assistant | 2026-06-02T14:09:38.680Z

The watchdog file is at `H:/prism` but my cwd is the golf worktree. Note that there's NO `--services=mcp` path in `ollama-docker-launcher.mjs` — it handles docker services, not the MCP server process. Let me read the actual MCP watchdog from the H:/prism tree and find the supervisor/restart logic.

### Assistant | 2026-06-02T14:09:39.828Z

[tool_use: Read]

### Assistant | 2026-06-02T14:09:41.480Z

[tool_use: Grep]

### User | 2026-06-02T14:10:11.461Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-health-watchdog.mjs — probe :3100, respawn if dead, taskkill+respawn if wedged.
4	 *
5	 * Closes the gap where (a) supervisor scheduled task may not be installed
6	 * (needs elevation) and (b) supervisor can't detect "port bound but /health
7	 * unresponsive" (wedged-but-alive). Runs on every fleet-reaper sweep + every
8	 * Stop hook + manual invocation → 26+ l
... [+5357 chars truncated]

### User | 2026-06-02T14:10:13.017Z

[tool_result] Found 24 files
scripts\lib\fleet-reaper-mcp-zombie-hunter.test.mjs
scripts\fleet-reaper-sweep.mjs
scripts\lib\fleet-reaper-mcp-zombie-hunter.mjs
scripts\regen-viz.mjs
scripts\rgs-tool-planner.mjs
scripts\nn-graph-retrain-lifecycle.mjs
scripts\lib\bg-app-throttle.mjs
scripts\fleet-task-health-watch.mjs
scripts\fleet-memory-monitor.test.mjs
scripts\fleet-memory-monitor.mjs
scripts\cron-revwalk.test.
... [+536 chars truncated]

### Assistant | 2026-06-02T14:10:18.341Z

Now let me read the supervisor (the actual respawn target with RSS/heap thresholds) and the zombie-hunter that the watchdog references.

### Assistant | 2026-06-02T14:10:18.342Z

[tool_use: Read]

### Assistant | 2026-06-02T14:10:18.347Z

[tool_use: Read]

### User | 2026-06-02T14:10:42.736Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-golf.

### User | 2026-06-02T14:11:06.154Z

[tool_result] 1	/**
2	 * MCP-zombie hunter for fleet-reaper-sweep.mjs.
3	 * =============================================
4	 *
5	 * Catches the failure mode that 2026-05-23/slot-golf surfaced: 106 PRISM MCP
6	 * server processes (node.exe running `mcp-server/dist/index.js`), 46 of them
7	 * with a DEAD parent claude.exe — collectively holding 38.8 GB RSS. claude-code
8	 * does not reliably reap its spawned MCP 
... [+12021 chars truncated]

### Assistant | 2026-06-02T14:11:13.063Z

The supervisor is referenced as `H:/prism/scripts/mcp-server-supervisor.mjs` but doesn't exist at that path. Let me find it and the 3GB/NODE_OPTIONS heap logic the CLAUDE.md mentions.

### Assistant | 2026-06-02T14:11:13.729Z

[tool_use: Glob]

### Assistant | 2026-06-02T14:11:15.364Z

[tool_use: Grep]

### User | 2026-06-02T14:11:38.702Z

[tool_result] scripts\daemon-supervisor.mjs

### User | 2026-06-02T14:11:41.403Z

[tool_result] Found 12 files
scripts\regen-viz.mjs
scripts\rgs-tool-planner.mjs
scripts\nn-graph-retrain-lifecycle.mjs
scripts\cron-revwalk.test.mjs
scripts\cron-revwalk.mjs
scripts\build-graph-index.test.mjs
scripts\build-graph-index.mjs
scripts\regen-wiki-from-viz.mjs
scripts\generate-vault-graph.mjs
.claude\hooks\prism-http-autostart.mjs
.claude\hooks\posttool-error-explain.mjs
.claude\helpers\smart-recovery
... [+4 chars truncated]

### Assistant | 2026-06-02T14:11:47.641Z

The supervisor with the 3GB threshold isn't where the watchdog points. The CLAUDE.md note references commit `8cbd06cf5` (watchdog mem probe) and `ee8be4fd2` (supervisor heap bump). Let me find the real supervisor and the autostart hook, and check those commits.

### Assistant | 2026-06-02T14:11:48.290Z

[tool_use: Glob]

### Assistant | 2026-06-02T14:11:48.972Z

[tool_use: Read]

### User | 2026-06-02T14:12:21.693Z

[tool_result] No files found

### User | 2026-06-02T14:12:22.720Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * prism-http-autostart.mjs — SessionStart hook
5	 *
6	 * Ensures the shared PRISM HTTP server is running before Claude needs it.
7	 * If not running, starts it in background.
8	 *
9	 * Benefits:
10	 * - Single server for all 6-8 concurrent chats
11	 * - 16GB total memory instead of 96GB (6 × 16GB)
12	 * - No file contention between server instances
13	 
... [+3401 chars truncated]

### Assistant | 2026-06-02T14:12:40.894Z

The supervisor referenced by the watchdog (`mcp-server-supervisor.mjs`) doesn't exist on disk — the watchdog would fail to heal a DOWN/WEDGED server. Let me confirm the actual wired autostart hook and find the 3GB threshold + heap bump from the cited commits.

### Assistant | 2026-06-02T14:12:41.687Z

[tool_use: Glob]

### User | 2026-06-02T14:12:44.606Z

[tool_result] .claude\hooks\mcp-daemon-autostart.mjs

### Assistant | 2026-06-02T14:12:46.414Z

[tool_use: Bash]

### User | 2026-06-02T14:13:26.968Z

[tool_result] ee8be4fd2f [MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor s...
---SHOW ee8be4fd2 (supervisor heap bump)---
commit ee8be4fd2fcaf5f02a4d4280bce0bd16ec1ee130
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 23 22:35:00 2026 -0500

    [MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-k
... [+1835 chars truncated]

### Assistant | 2026-06-02T14:13:34.211Z

Both files were committed (`scripts/mcp-server-supervisor.mjs` and `scripts/mcp-server-watchdog.mjs`) but neither exists on disk now in the golf worktree — they're the canonical files at `H:/prism`. Let me read both from the H:/prism tree directly, plus the wired daemon-autostart hook.

### Assistant | 2026-06-02T14:13:37.249Z

[tool_use: Bash]

### User | 2026-06-02T14:15:20.840Z

[tool_result] H:/prism/scripts/mcp-server-supervisor.mjs  10.4K
H:/prism/scripts/mcp-server-watchdog.mjs  12.0K
===git ls-tree HEAD scripts/mcp-server-*===
100644 blob 92448eb59d53a6d71554486ec63e49b40b249c4a	scripts/daemon-supervisor.mjs
100644 blob 8ee27e37b14c57e56cdf776c3854b40b14b2fe65	scripts/fleet-services-watchdog.mjs
100644 blob 4e826cb14b6ff8de758d8c30fea67708bc3ed928	scripts/golf-watchdog-wiring-brid
... [+278 chars truncated]

### Assistant | 2026-06-02T14:15:26.828Z

Important finding: `mcp-server-supervisor.mjs` and `mcp-server-watchdog.mjs` exist on disk at `H:/prism/scripts/` (10.4K and 12.0K) but are NOT in the golf branch's HEAD tree — they're untracked/uncommitted in this worktree but live in the main tree. They exist on disk. Let me read both.

### Assistant | 2026-06-02T14:15:26.829Z

[tool_use: Read]

### Assistant | 2026-06-02T14:15:26.833Z

[tool_use: Read]

### User | 2026-06-02T14:15:59.139Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+13006 chars truncated]

### User | 2026-06-02T14:15:59.887Z

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
... [+11351 chars truncated]

### Assistant | 2026-06-02T14:16:03.929Z

I now have the full picture. Let me verify the `--once` respawn behavior gap (escalate spawns supervisor with `--once`, which spawns once but won't respawn). I have enough to write the report. Let me check the daemon-autostart hook briefly for the bind path that allowed 11 instances to pile up.

### Assistant | 2026-06-02T14:16:05.895Z

[tool_use: Grep]

### User | 2026-06-02T14:16:16.912Z

[tool_result] No matches found

### Assistant | 2026-06-02T14:16:45.163Z

No PID-lock / single-flight guard in the autostart hook — that's the root of the pile-up. I have everything needed. Here is the report.

MCP WATCHDOG / RESTART BEHAVIOR — findings (golf cwd; canonical files live at H:/prism, NOT in golf HEAD tree)

(a) CURRENT BEHAVIOR
- Two scripts, both at H:/prism/scripts/. mcp-server-watchdog.mjs (302L, the 5-min scheduled task "PRISM MCP Server Watchdog") probes GET 127.0.0.1:3100/health; mcp-server-supervisor.mjs (299L, AtStartup/AtLogon task) is the spawner.
- RSS preemptive restart: watchdog L67 RSS_THRESHOLD_MB default 3072 (3GB), parsed from /health memory.rss_mb. L249 fires escalate() when rssMB>=threshold AND uptime>=60s AND 30-min cooldown (PREEMPT_COOLDOWN_MS=1800000) elapsed. Heap bump lives in supervisor spawnChild() L189-201: appends NODE_OPTIONS=--max-old-space-size=4096 (defers if operator already set one). 3GB recycle sits below the 4GB cap.
- Restart = HARD-KILL, not graceful drain: escalate() L195-216 finds listener via netstat -ano then taskkill /F /PID (force, no SIGTERM/connection drain). Supervisor's OWN shutdown() does drain (SIGTERM→5s→SIGKILL) but the watchdog never calls it — it kills the orphan PID directly.
- Stale-instance reaping is partial: supervisor acquirePidLock() L105-132 does O_EXCL + stale-PID takeover, so two SUPERVISORS can't co-run. But there is NO guard against multiple server children — and watchdog escalate() spawns the supervisor with `--once` (L210), so the respawned server has no respawn loop / no PID lock contention check on the server itself.
- ollama-docker-launcher.mjs has NO --services=mcp path; SERVICE_PORTS maps prism-server→3000 (docker), unrelated to the :3100 native MCP server. It cannot start/restart the MCP process.

(b) GAPS vs the 11-instance pile-up at :3100 (~700MB each, hung not exiting, fleet-wide connect fail)
- No single-flight on server spawn. The wired SessionStart hook .claude/hooks/prism-http-autostart.mjs (and mcp-daemon-autostart.mjs) starts the server with
... [+1930 chars truncated]
