---
type: "chat-session"
source: "claude-code-cli"
session_id: "76a392af-6ede-4688-ba7e-5ef9ec1099cd"
title: "I'm planning a new slash-command pipeline for PRISM (at H:\\PRISM) that reaps orp"
date: "2026-05-14"
first_ts: "2026-05-14T12:20:08.022Z"
last_ts: "2026-05-14T12:25:40.619Z"
cwd: "H:\\PRISM"
messages: 99
user_msgs: 44
assistant_msgs: 55
raw_file: "H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-ac8f8279940c9ebc0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# I'm planning a new slash-command pipeline for PRISM (at H:\PRISM) that reaps orp

> **claude-code-cli** | 2026-05-14 | 99 msgs (44 user / 55 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-ac8f8279940c9ebc0.jsonl`

## Transcript

### User | 2026-05-14T12:20:08.022Z

I'm planning a new slash-command pipeline for PRISM (at H:\PRISM) that reaps orphan node/bash/git processes left open by the 7 concurrent Claude chats, and keeps host memory stable. Before I design it, I need a thorough inventory of EXISTING process-hygiene / memory-relief infrastructure so I don't duplicate it.

Search "very thorough" across H:\PRISM for and report back on each of these (give absolute file paths, what they do, their CLI flags/args, and how they're invoked — hook? cron? skill? manual?):

1. `node-process-janitor.mjs` — find it, summarize what it reaps, its `--full` flag and any other flags, where it's wired.
2. `git-lock-sweeper.mjs` — what it sweeps, how it's wired.
3. `tool-watchdog.mjs` — what it records/does.
4. The `reap-zombies` skill (`.claude/commands/reap-zombies.md` and any project-level copy) — what it does.
5. `scripts/system-health/03-memory-pressure-auto-relief.ps1` and any other files in `scripts/system-health/` — what the memory-pressure auto-relief does, its cadence.
6. `commit-pressure-stop-gate.mjs` — its self-heal step.
7. Any existing scripts/skills/hooks with "reap", "zombie", "orphan", "janitor", "process", "memory-pressure", "fleet" in the name or that kill/end processes (tasklist, taskkill, Get-Process, Stop-Process, kill).
8. Any existing PRISM cron / scheduled-task registration scripts (look in scripts/ for `install-*-task.ps1`, cron-bootstrap, register scheduled tasks) — what pattern they follow for a 5-minute cadence task.
9. Whether there's already a Monitor-based or loop-based fleet-hygiene command.

Report excerpts of the key files (the janitor, the memory-relief ps1, one scheduled-task install script) so I can see their structure. Be thorough — I need to know exactly what exists before building.

### Assistant | 2026-05-14T12:20:10.156Z

I'll conduct a thorough inventory of PRISM's process-hygiene and memory-relief infrastructure. Let me search systematically across the codebase.

### Assistant | 2026-05-14T12:20:10.568Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:10.815Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:11.041Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:11.237Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:11.434Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:11.692Z

[tool_use: Glob]

### User | 2026-05-14T12:20:30.958Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:20:31.360Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:20:31.700Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:20:32.009Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:20:32.207Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:20:32.444Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T12:20:34.231Z

The globs are timing out. Let me narrow the search paths and try more targeted searches.

### Assistant | 2026-05-14T12:20:34.418Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:34.859Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:35.250Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:35.784Z

[tool_use: Glob]

### User | 2026-05-14T12:20:36.988Z

[tool_result] No files found

### User | 2026-05-14T12:20:37.307Z

[tool_result] scripts\system-health\03-commit-pressure-check.mjs
scripts\system-health\06-aggressive-killer.mjs

### User | 2026-05-14T12:20:37.750Z

[tool_result] scripts\system-health\02-kill-zombie-tsservers.ps1
scripts\system-health\04-pre-launch-check.ps1
scripts\system-health\05-soft-config-tweaks.ps1
scripts\system-health\01-pagefile-relocate.ps1
scripts\system-health\03-memory-pressure-auto-relief.ps1
scripts\system-health\04-prism-mcp-orphan-monitor.ps1
scripts\system-health\20-coord-db-vacuum.ps1
scripts\system-health\21-memory-garden.ps1
scripts\s
... [+418 chars truncated]

### User | 2026-05-14T12:20:37.974Z

[tool_result] .claude\commands\reap-zombies.md

### Assistant | 2026-05-14T12:20:39.097Z

Good results. Let me now search for the specific files and related infrastructure:

### Assistant | 2026-05-14T12:20:39.824Z

[tool_use: Grep]

### Assistant | 2026-05-14T12:20:40.050Z

[tool_use: Read]

### Assistant | 2026-05-14T12:20:40.209Z

[tool_use: Read]

### Assistant | 2026-05-14T12:20:40.425Z

[tool_use: Read]

### Assistant | 2026-05-14T12:20:40.544Z

[tool_use: Read]

### User | 2026-05-14T12:20:42.686Z

[tool_result] No files found

### User | 2026-05-14T12:20:44.340Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * PRISM System Health 03 - Commit pressure monitor
4	 * =====================================================================
5	 * Reports current Windows commit-pressure ratio and exits with:
6	 *   exit 0  - healthy (< 75%)
7	 *   exit 1  - watch  (75-85%)
8	 *   exit 2  - critical (>= 85%) - new allocations likely to fail
9	 *
10	 * Usable as Stop-hook gate, /star
... [+3958 chars truncated]

### User | 2026-05-14T12:20:44.704Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * 06-aggressive-killer.mjs - emergency reaper for stuck bash/git/node processes.
4	 *
5	 * Use cases:
6	 *   - Pressure-gate self-heal (invoked from commit-pressure-stop-gate.mjs)
7	 *   - Manual emergency cleanup when system commit memory is pinned
8	 *   - Recovery after a chat hangs on an unfinished tool call
9	 *
10	 * Kill rules (all conservative — never touches
... [+10723 chars truncated]

### User | 2026-05-14T12:20:45.035Z

[tool_result] 1	param(
2	  [int]$LightThresholdPct = 85,
3	  [int]$MediumThresholdPct = 92,
4	  [int]$HeavyThresholdPct = 97,
5	  [string]$LogPath = 'H:\prism\.cache\memory-pressure-log.jsonl',
6	  [int]$LogMaxLines = 500,
7	  [switch]$DryRun
8	)
9	
10	# 03-memory-pressure-auto-relief.ps1 — automated memory-pressure relief.
11	#
12	# Runs every 5 minutes via the "PRISM Memory Pressure Auto-Relief" Windows
13	# 
... [+7268 chars truncated]

### User | 2026-05-14T12:20:45.223Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "reap-zombies"
6	---
7	# /reap-zombies — Dead Claim Cleanup
8	
9	> **HOOK COVERAGE (added 2026-04-30):** This action runs automatically on every SessionStart via `.claude/hooks/stale-claim-sweeper.mjs` (TTLs: claims 5min, git locks 5min, workboard heartbeat 1hr; PID-dead sessions swept regardless of age). **Do not invoke this skill for routine clea
... [+1409 chars truncated]

### Assistant | 2026-05-14T12:20:47.919Z

Now let me search for more related infrastructure:

### Assistant | 2026-05-14T12:20:48.354Z

[tool_use: Read]

### Assistant | 2026-05-14T12:20:49.372Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:20:48.556Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:20:49.800Z

[tool_use: Bash]

### User | 2026-05-14T12:20:52.074Z

[tool_result] scripts\system-health\02-kill-zombie-tsservers.ps1
scripts\system-health\04-pre-launch-check.ps1
scripts\system-health\05-soft-config-tweaks.ps1
scripts\system-health\01-pagefile-relocate.ps1
scripts\system-health\03-memory-pressure-auto-relief.ps1
scripts\system-health\04-prism-mcp-orphan-monitor.ps1
scripts\system-health\20-coord-db-vacuum.ps1
scripts\system-health\21-memory-garden.ps1
scripts\s
... [+418 chars truncated]

### system

... [19 middle messages omitted -- see raw_file] ...

### User | 2026-05-14T12:21:26.705Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * node-orphan-cleaner.mjs - Stop hook closeout orchestrator.
5	 *
6	 * This is intentionally a thin wrapper.  Dedup found older process cleaners in
7	 * the hook/helper tree, so the Stop hook delegates to the safer PRISM/Codex
8	 * cleanup helpers instead of carrying a second process-killing implementation.
9	 *
10	 * Scope:
11	 * - clean stale .claude 
... [+3583 chars truncated]

### User | 2026-05-14T12:21:48.778Z

[tool_result] H:\PRISM\.claude\helpers/chat-bus-reap.mjs
H:\PRISM\.claude\helpers/install-hook-janitor-task.ps1
H:\PRISM\.claude\helpers/install-node-cleaner-task.ps1
H:\PRISM\.claude\helpers/install-zombie-reaper-task.ps1
H:\PRISM\.claude\helpers/node-orphan-cleaner.mjs
H:\PRISM\.claude\helpers/zombie-reaper-daemon.mjs

### Assistant | 2026-05-14T12:21:51.783Z

Now let me read the remaining key helper files and check for cron/scheduled task patterns:

### Assistant | 2026-05-14T12:21:52.495Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:52.885Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:53.822Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:21:54.063Z

[tool_use: Bash]

### User | 2026-05-14T12:21:58.334Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Node Orphan Cleaner',
3	  [int]$EveryMinutes = 5,
4	  [switch]$RunNow
5	)
6	
7	$ErrorActionPreference = 'Stop'
8	
9	$cleanerScript = 'H:\PRISM\.claude\helpers\node-orphan-cleaner.mjs'
10	$nodeExe = 'C:\Program Files\nodejs\node.exe'
11	
12	if (-not (Test-Path $cleanerScript)) {
13	  throw "Cleaner script not found: $cleanerScript"
14	}
15	
16	if (-not (Test-
... [+782 chars truncated]

### User | 2026-05-14T12:21:59.802Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Zombie Reaper v2',
3	  [int]$EveryMinutes = 5,
4	  [switch]$RunNow,
5	  [switch]$Uninstall
6	)
7	
8	# install-zombie-reaper-task.ps1 — HARNESS-AUDIT/U-TIER3c (2026-05-10)
9	#
10	# Registers a Windows Scheduled Task that runs stop_close_prism_nodes_v2.mjs
11	# every $EveryMinutes minutes, independent of Claude Code sessions.
12	#
13	# Why: v2 reaper currently
... [+3308 chars truncated]

### User | 2026-05-14T12:22:18.085Z

[tool_result] (Bash completed with no output)

### User | 2026-05-14T12:22:19.488Z

[tool_result] -rw-r--r-- 1 Mark V 197608   3607 May 11 21:48 install-hook-janitor-task.ps1
-rw-r--r-- 1 Mark V 197608   3167 May 12 13:45 install-memory-pressure-task.ps1
-rw-r--r-- 1 Mark V 197608   1077 Mar 31 20:36 install-node-cleaner-task.ps1
-rw-r--r-- 1 Mark V 197608   3830 May 13 11:01 install-source-monitor-task.ps1
-rw-r--r-- 1 Mark V 197608   3436 May 10 22:05 install-zombie-reaper-task.ps1
-rwxr-xr-
... [+65 chars truncated]

### Assistant | 2026-05-14T12:22:21.081Z

Now let me read the memory-pressure task installer and a couple more key files:

### Assistant | 2026-05-14T12:22:21.326Z

[tool_use: Read]

### Assistant | 2026-05-14T12:22:21.790Z

[tool_use: Read]

### Assistant | 2026-05-14T12:22:22.509Z

[tool_use: Grep]

### User | 2026-05-14T12:22:24.442Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Memory Pressure Auto-Relief',
3	  [int]$EveryMinutes = 5,
4	  [switch]$RunNow,
5	  [switch]$Uninstall
6	)
7	
8	# install-memory-pressure-task.ps1 — HS-13 automated memory-pressure relief
9	# (2026-05-12). Registers a Windows Scheduled Task that runs
10	# scripts/system-health/03-memory-pressure-auto-relief.ps1 every $EveryMinutes
11	# minutes, independent of
... [+2988 chars truncated]

### User | 2026-05-14T12:22:24.518Z

[tool_result] No files found

### User | 2026-05-14T12:22:26.060Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Hook Janitor',
3	  [int]$EveryMinutes = 2,
4	  [switch]$RunNow,
5	  [switch]$Uninstall
6	)
7	
8	# install-hook-janitor-task.ps1 — permanent fix for the hook fork-storm hang (2026-05-11)
9	#
10	# Registers a Windows Scheduled Task that runs node-process-janitor.mjs --full
11	# every $EveryMinutes minutes, independent of Claude Code sessions.
12	#
13	# Why a t
... [+3458 chars truncated]

### Assistant | 2026-05-14T12:22:27.765Z

Let me search for the commit-pressure-stop-gate and look at a few more infrastructure pieces:

### Assistant | 2026-05-14T12:22:28.353Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:22:28.784Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:22:29.129Z

[tool_use: Bash]

### User | 2026-05-14T12:22:42.280Z

[tool_result] H:\PRISM\.claude\hooks/session-start-zombie-reap.mjs

### User | 2026-05-14T12:22:43.573Z

[tool_result] H:\PRISM\.claude\hooks/.deprecated/awareness-2026-05-13/stop_on_awareness_degraded.mjs
H:\PRISM\.claude\hooks/bundles/stop-bundle.mjs
H:\PRISM\.claude\hooks/stop-auto-wire.mjs
H:\PRISM\.claude\hooks/stop-bash-orphan-cleaner.mjs
H:\PRISM\.claude\hooks/stop-bg-runner.mjs
H:\PRISM\.claude\hooks/stop-consensus-drain.mjs
H:\PRISM\.claude\hooks/stop-index-sync.mjs
H:\PRISM\.claude\hooks/stop-mark-comple
... [+1954 chars truncated]

### User | 2026-05-14T12:24:31.487Z

[tool_result] Command running in background with ID: b5gpxv5x3. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\76a392af-6ede-4688-ba7e-5ef9ec1099cd\tasks\b5gpxv5x3.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T12:24:32.637Z

Good. Let me read a couple more key files and check the background search result:

### Assistant | 2026-05-14T12:24:33.062Z

[tool_use: Read]

### Assistant | 2026-05-14T12:24:34.603Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:24:35.217Z

[tool_use: Bash]

### User | 2026-05-14T12:24:35.635Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop_close_prism_nodes_v2.mjs — PRISM-STAB-MS0/U-A3 (2026-05-09).
5	 *
6	 * Stop hook that hunts down orphan git.exe / node.exe processes whose
7	 * parent has died, but only when their CommandLine identifies them as
8	 * spawned by our hook stack. Replaces the broken v1 which couldn't
9	 * traverse Windows process descendants reliably.
10	 *
11	 * Wh
... [+5736 chars truncated]

### Assistant | 2026-05-14T12:24:35.826Z

[tool_use: Grep]

### User | 2026-05-14T12:24:37.549Z

[tool_result] Found 10 files
.claude\commands\pick-build-close.md
.claude\commands\macro-program.md
.claude\commands\checkin.md
.claude\commands\staged-sanity.md
.claude\commands\peer-file-isolation.md
.claude\commands\skill-recall-tune.md
.claude\commands\scrutiny-batch.md
.claude\commands\startup.md
.claude\commands\batch-optimize.md
.claude\commands\program-audit.md

### User | 2026-05-14T12:24:47.316Z

[tool_result] (Bash completed with no output)

### User | 2026-05-14T12:24:48.546Z

[tool_result] H:\PRISM\scripts/reap-orphan-procs.ps1

### Assistant | 2026-05-14T12:24:50.335Z

Let me read the reap-orphan-procs.ps1 file:

### Assistant | 2026-05-14T12:24:50.553Z

[tool_use: Read]

### Assistant | 2026-05-14T12:24:50.838Z

[tool_use: Read]

### User | 2026-05-14T12:24:53.653Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  reap-orphan-procs.ps1 — pure-PowerShell reaper for orphaned/wedged PRISM hook processes.
4	
5	.DESCRIPTION
6	  The PRISM hook stack spawns ~24 short-lived `node`/`bash` subprocesses per Claude tool call.
7	  Most exit in milliseconds; a few leak — and when enough leak, Windows runs out of process /
8	  handle headroom (`ERROR_NO_SYSTEM_RESOURCES` / 0x5AA) and *new* spawns bloc
... [+10539 chars truncated]

### User | 2026-05-14T12:24:54.261Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * chat-bus-reap.mjs — Sweep zombie chat-bus state.
4	 *
5	 * Removes presence files whose claudeParentPid is dead, and claim files
6	 * owned by zombie sessions. Safe to run on demand or periodically.
7	 *
8	 * Liveness probe: process.kill(pid, 0) — ESRCH = dead.
9	 *
10	 * Usage:
11	 *   node H:/prism/.claude/helpers/chat-bus-reap.mjs              # reap
12	 *   nod
... [+2781 chars truncated]

### Assistant | 2026-05-14T12:25:40.619Z

Perfect. I now have a comprehensive picture of PRISM's process-hygiene infrastructure. Let me compile the thorough inventory for you.

---

## THOROUGH INVENTORY OF PRISM PROCESS-HYGIENE & MEMORY-RELIEF INFRASTRUCTURE

### 1. **node-process-janitor.mjs**
**Location:** `H:\PRISM\.claude\hooks\node-process-janitor.mjs`

**What it reaps:**
- Stale `.claude/hooks` and `.claude/helpers` node.exe processes (age > 120s by default)
- Git-for-Windows bash.exe wrappers spawned by hooks (age > 300s default, or 60s with `--aggressive`)
- Orphaned @playwright/mcp and mcp-http-bridge node servers (parent process dead)
- Dead-parent PowerShell.exe spawned by hooks (age > 300s default)
- Protects: dist/index.js MCP servers, Claude.exe descendants, vitest/jest/tsx test workers

**CLI Flags:**
- `--full` — enables aggressive reaping (bash 60s, git 30s, node 180s, ps 60s)
- `--aggressive` — alias for `--full`
- `--json` — structured JSON output
- `--dry-run` — simulate without killing
- `--git-age N` — override git timeout (seconds)
- `--bash-age N` — override bash timeout (seconds)
- `--node-age N` — override node timeout (seconds)

**How it's invoked:**
- **Hook:** Runs manually when memory pressure hits medium/heavy thresholds via `03-memory-pressure-auto-relief.ps1`
- **Scheduled Task:** `PRISM Hook Janitor` (Windows Scheduled Task, every 2 minutes) installed via `install-hook-janitor-task.ps1`
- **Stop Hook:** Called by `node-orphan-cleaner.mjs` (delegating wrapper)
- Command: `node.exe "H:\PRISM\.claude\hooks\node-process-janitor.mjs" --full`

**Exit codes:** 0 = success, 1 = fatal error; always logs kills to `H:/prism/state/shared/aggressive-killer.log` (JSONL format with PID, age, freed_mb, reason)

---

### 2. **git-lock-sweeper** (not a separate script — integrated)
**Location:** Swept by `04-prism-mcp-orphan-monitor.ps1`

**What it sweeps:**
- Stale `.git/index.lock` files (older than 60s default, configurable via `$GitLockMaxAgeSec`)
- Paths: `H:/prism/.git/index.lock`, `H
... [+11472 chars truncated]
