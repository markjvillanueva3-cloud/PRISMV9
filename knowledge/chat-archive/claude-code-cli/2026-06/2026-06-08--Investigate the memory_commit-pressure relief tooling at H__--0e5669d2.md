---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Investigate the memory/commit-pressure relief tooling at H:/prism, and find the "
date: "2026-06-08"
first_ts: "2026-06-08T17:48:12.833Z"
last_ts: "2026-06-08T17:50:24.386Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 23
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a08e43b86aac3641a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Investigate the memory/commit-pressure relief tooling at H:/prism, and find the 

> **claude-code-cli** | 2026-06-08 | 55 msgs (23 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a08e43b86aac3641a.jsonl`

## Transcript

### User | 2026-06-08T17:48:12.833Z

Investigate the memory/commit-pressure relief tooling at H:/prism, and find the source of the 210/227GB COMMIT over-commit (physical RAM is 127GB with 38GB free, so the pressure is page-file commit charge, not physical RAM exhaustion).

Find and report (exact paths):
1. The pressure-relief scripts the Stop hook named: H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1 and 06-aggressive-killer.mjs — read them, report exactly WHAT they kill (zombie tsserver? idle node? by what age/RSS criteria?) and whether they're safe to run (do they protect the live MCP daemon + the fleet-reaper + active chat slots?).
2. The pressure gate itself — the Stop hook that blocks on "CRITICAL MEMORY PRESSURE commit 96.3%". Find it (.claude/hooks/*pressure* or enforce-*). What metric does it read (commit vs physical), what threshold, what "auto-heal" does it attempt, and the PRISM_PRESSURE_GATE=0 override.
3. The fleet-memory-monitor + fleet-reaper — how they classify and reap orphans, and whether they target commit-charge offenders.
4. WHAT is committing 210GB? 84 node procs total only 7.1GB working set, so the commit is reserved-but-not-resident address space. Identify the likely offenders: is it the many node procs each reserving a large --max-old-space-size? Docker? A few large-heap processes? Look for any process-inventory or census script (scripts/system-health/*, fleet-memory-monitor) that breaks down commit by process.
5. The system-health script directory — enumerate scripts/system-health/*.{ps1,mjs} and one-line what each does (these are the relief toolbelt).

Report: the relief sequence that's SAFE to run at 96% commit (which scripts, in what order, what they spare), + the diagnosis of what's over-committing. Final text IS the data.

### Assistant | 2026-06-08T17:48:21.512Z

I'll investigate the memory/commit-pressure relief tooling at H:/prism systematically. Let me start by exploring the structure and finding the key scripts and hooks.

### Assistant | 2026-06-08T17:48:21.961Z

[tool_use: Bash]

### User | 2026-06-08T17:48:25.137Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Sort-Object: command not found

### Assistant | 2026-06-08T17:48:30.050Z

I understand. I'm in plan mode and cannot execute any changes. Let me use PowerShell to explore the memory/commit-pressure relief tooling in H:/prism. Since this is Windows, I'll use the correct syntax.

### Assistant | 2026-06-08T17:48:30.131Z

[tool_use: PowerShell]

### User | 2026-06-08T17:48:31.326Z

[tool_result] [32;1mName[0m
[32;1m----[0m
00-defender-exclusion-bootstrap.ps1
01-pagefile-relocate.ps1
02-kill-zombie-tsservers.ps1
03-commit-pressure-check.mjs
03-memory-pressure-auto-relief.ps1
04-pre-launch-check.ps1
04-prism-mcp-orphan-monitor.ps1
05-soft-config-tweaks.ps1
06-aggressive-killer.mjs
06-peer-audit-tick.ps1
08-envelope-drift.ps1
09-wiki-lint.ps1
10-stale-handoff-sweep.ps1
20-
... [+420 chars truncated]

### Assistant | 2026-06-08T17:48:34.485Z

Now let me read the two key pressure-relief scripts and the pressure check script:

### Assistant | 2026-06-08T17:48:34.485Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:34.488Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:34.944Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:34.967Z

[tool_use: Read]

### User | 2026-06-08T17:48:37.532Z

[tool_result] 1	# =====================================================================
2	# PRISM System Health 02 - Kill leaked TypeScript servers + node zombies
3	# =====================================================================
4	# Problem: tsserver.js holds the entire PRISM codebase (3000+ engines)
5	#   in memory. After hours of editing it leaks past 3 GB. VS Code,
6	#   Cursor, Windsurf all spawn th
... [+3269 chars truncated]

### User | 2026-06-08T17:48:37.582Z

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

### User | 2026-06-08T17:48:38.025Z

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

### User | 2026-06-08T17:48:38.128Z

[tool_result] 1	param(
2	  [int]$LightThresholdPct = 85,
3	  [int]$MediumThresholdPct = 92,
4	  [int]$HeavyThresholdPct = 97,
5	  [int]$MaxRuntimeSec = 100,
6	  [int]$MinTierBudgetSec = 5,
7	  [int]$ZombieCapSec = 60,
8	  [string]$LogPath = 'H:\prism\.cache\memory-pressure-log.jsonl',
9	  [int]$LogMaxLines = 500,
10	  [switch]$DryRun
11	)
12	
13	# 03-memory-pressure-auto-relief.ps1 — automated memory-pressure r
... [+16222 chars truncated]

### Assistant | 2026-06-08T17:48:42.515Z

Now let me look for the pressure gate hook and examine the fleet-memory-monitor and node-process-janitor:

### Assistant | 2026-06-08T17:48:42.518Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:42.775Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:42.780Z

[tool_use: Glob]

### User | 2026-06-08T17:48:43.681Z

[tool_result] .claude\hooks\commit-pressure-stop-gate.mjs

### User | 2026-06-08T17:48:43.951Z

[tool_result] .claude\hooks\lib\enforce-memory-pipeline.py
.claude\hooks\cog-bridge-ai-memory-capture.mjs
.claude\hooks\error-pattern-memory.mjs
.claude\hooks\error-recovery-memory.mjs
.claude\hooks\memory-system-init.mjs
.claude\hooks\session-action-memory.mjs
.claude\hooks\stop_on_uncommitted_memory.mjs
.claude\hooks\post-memory-context-eval.mjs
.claude\hooks\memory-autocompact-stop.mjs
.claude\hooks\memory-a
... [+801 chars truncated]

### User | 2026-06-08T17:48:44.008Z

[tool_result] .claude\hooks\lib\test-quality-gate-stop.mjs.corrupt.zlib
.claude\hooks\lib\agent-gate-check.py
.claude\hooks\lib\enforce-review-gate.py
.claude\hooks\lib\enforce-wiring-gate.py
.claude\hooks\wedm-tier6-geom-gate.mjs
.claude\hooks\lib\enforce-formula-accuracy-gate.py
.claude\hooks\cad-accuracy-gate.mjs
.claude\hooks\commit-pressure-stop-gate.mjs
.claude\hooks\complexity-gate.mjs
.claude\hooks\hook
... [+1112 chars truncated]

### Assistant | 2026-06-08T17:48:47.464Z

Good, found the pressure gate. Now let me read it:

### Assistant | 2026-06-08T17:48:47.795Z

[tool_use: Read]

### Assistant | 2026-06-08T17:48:47.897Z

[tool_use: Read]

### User | 2026-06-08T17:48:50.912Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * commit-pressure-stop-gate.mjs - Proactive memory-pressure gate with self-heal
5	 * =====================================================================
6	 * Wired as a Stop hook. Reads commit-used / commit-limit and:
7	 *   - SOFT WARN at >= 75% (advisory, exits 0)
8	 *   - HARD WARN at >= 88% (sends notification, still exits 0)
9	 *   - SELF-HEAL at
... [+5251 chars truncated]

### User | 2026-06-08T17:48:51.569Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * Node Process Janitor — PreToolUse `.*` (hot path) + scheduled `--full` (backstop)
5	 *
6	 * Problem: ~8 concurrent Claude terminals × ~15 PreToolUse + ~9 PostToolUse hooks
7	 * per tool call → dozens of `node`/`bash` processes spawned per second. On Windows
8	 * the *fork itself* (CreateProcess + per-process DLL init for the Git-for-Windows
9	 * `bash
... [+10077 chars truncated]

### Assistant | 2026-06-08T17:48:54.736Z

I'm in plan mode. Let me explore the remaining critical files systematically to answer all 5 questions.

### Assistant | 2026-06-08T17:48:55.424Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:55.501Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:48:55.504Z

[tool_use: Glob]

### User | 2026-06-08T17:48:56.737Z

[tool_result] No files found

### User | 2026-06-08T17:48:56.876Z

[tool_result] scripts\system-health\21-memory-garden.ps1
scripts\system-health\03-memory-pressure-auto-relief.ps1

### User | 2026-06-08T17:48:56.986Z

[tool_result] .claude\hooks\fleet-task-health-stop.mjs
.claude\hooks\fleet-reaper-stop.mjs
.claude\hooks\stop-fleet-soul-graduation.mjs

### Assistant | 2026-06-08T17:49:03.502Z

Now let me read the fleet-related and memory scripts:

### Assistant | 2026-06-08T17:49:04.060Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:04.175Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:04.182Z

[tool_use: Read]

### User | 2026-06-08T17:49:05.486Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-H1 — Weekly memory-garden audit (Mon 04:11).
5	
6	.DESCRIPTION
7	  Thin Windows-Task-Scheduler wrapper around scripts/memory-garden-scan.mjs.
8	  Surfaces three classes of memory debt (unreferenced files / dangling
9	  MEMORY.md pointers / stale H:/C: path refs) and writes a verdict to
10	  state/shared/MEMORY_GARDEN_REPORT.md. Defer
... [+2348 chars truncated]

### User | 2026-06-08T17:49:07.509Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * fleet-reaper-stop.mjs — Stop-hook arm of the slot-aware orphan reaper.
5	 *
6	 * When any of the up to 26 concurrent chats ends, kick a slot-aware sweep so the
7	 * just-ended chat's orphan node/git/bash processes get noticed promptly instead
8	 * of waiting up to ~5 min for the next scheduled-task / Monitor tick. A chat
9	 * that crashes or is closed
... [+6766 chars truncated]

### User | 2026-06-08T17:49:07.668Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * fleet-task-health-stop.mjs — Stop-hook arm of the scheduled-task health
5	 * watchdog (scripts/fleet-task-health-watch.mjs).
6	 *
7	 * THE GAP. PRISM's crash-prevention safety net is a set of Windows scheduled
8	 * tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, …). Nothing
9	 * watches whether those tasks are themselves healthy — a t
... [+10593 chars truncated]

### Assistant | 2026-06-08T17:49:14.499Z

Now let me search for process-inventory and census scripts to understand what's committing 210GB:

### Assistant | 2026-06-08T17:49:15.433Z

[tool_use: Bash]

### Assistant | 2026-06-08T17:49:15.631Z

[tool_use: Glob]

### Assistant | 2026-06-08T17:49:16.174Z

[tool_use: Grep]

### User | 2026-06-08T17:49:19.332Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Where-Object: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-06-08T17:49:20.708Z

[tool_result] scripts\render-fleet-pipeline-to-viz.mjs
scripts\system-viz-fleet-awareness.mjs
scripts\system-viz-fleet-awareness.test.mjs
scripts\__tests__\fleet-reaper-ballast.test.mjs
scripts\__tests__\fleet-reaper-service-restart.test.mjs
scripts\fleet-memory-monitor.test.mjs
scripts\__tests__\fleet-reaper-soft-relief-v2.test.mjs
scripts\lib\fleet-reaper-crash-watch.mjs
scripts\lib\fleet-reaper-crash-watch.t
... [+1517 chars truncated]

### User | 2026-06-08T17:49:22.102Z

[tool_result] No files found

### Assistant | 2026-06-08T17:49:27.239Z

Let me read the fleet-memory-monitor to understand commit classification:

### Assistant | 2026-06-08T17:49:27.240Z

[tool_use: Read]

### Assistant | 2026-06-08T17:49:27.243Z

[tool_use: Read]

### User | 2026-06-08T17:49:30.190Z

[tool_result] 1	// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
2	// but ALL its invocations go through explicit `node X.mjs` (the scheduled task,
3	// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
4	// chmod+x + `./X.mjs` direct execution. A line-1 `#!` is fine for node + esbuild
5	// + bash but vite's SSR transform does NOT strip it; it injects its
... [+12508 chars truncated]

### User | 2026-06-08T17:49:31.180Z

[tool_result] 1	/**
2	 * fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.
3	 *
4	 * Sits ALONGSIDE the fleet-reaper. The reaper reaps orphan processes of
5	 * CRASHED slots (after a 10-min confirm window) and runs at +210s phase off
6	 * the host. That covers post-crash cleanup, but leaves a real gap: when ALL
7	 * 13 chats are LIVE and the box drifts toward commit-memory saturation, the
... [+47165 chars truncated]

### Assistant | 2026-06-08T17:50:24.386Z

Perfect. Now let me create a comprehensive report based on all the information I've gathered. Let me structure the findings:

## COMPREHENSIVE INVESTIGATION REPORT: Memory/Commit-Pressure Relief Tooling at H:/prism

---

### 1. PRESSURE-RELIEF SCRIPTS (02-kill-zombie-tsservers.ps1 & 06-aggressive-killer.mjs)

**Location:** 
- `H:\prism\scripts\system-health\02-kill-zombie-tsservers.ps1`
- `H:\prism\scripts\system-health\06-aggressive-killer.mjs`

**WHAT THEY KILL:**

**02-kill-zombie-tsservers.ps1:**
- **tsserver.js** processes ≥60 min old (editor language servers from VS Code/Cursor/Windsurf, leak 3+ GB per instance after hours)
- **dist/index.js** MCP servers ≥60 min old AND ≥200 MB RAM (stale MCP server instances)
- **@playwright/mcp** processes ≥60 min old (orphaned playwright MCP launchers)
- **typescript-language-server** processes ≥60 min old (stale ts-language-server)
- Reports: PID, RAM (MB), age (min), reason; typical reclaim 0.5-2 GB

**06-aggressive-killer.mjs:**
- **git.exe / git-credential / git-remote-\*** ≥120s old (default; 30s in --aggressive mode) — stuck git on auth prompt or dead remote
- **bash.exe** leaf processes (no live children) ≥300s old (default; 60s aggressive), not on parent chain
- **node.exe** transients (vitest/jest/tsx/esbuild patterns) OR orphaned (parent dead) ≥600s old (default; 180s aggressive)
- **powershell.exe** orphans (parent dead) ≥300s old (default; 60s aggressive)
- **Thresholds lower under --aggressive:** git=30s, bash=60s, node=180s, ps=60s
- Max 50 kills per run; reports freed MB & commit % before/after
- **Protects:** live Claude harness descendants, active MCP daemon descendants, active chat slots

**Safety Assessment:**
✅ **SAFE to run at 96% commit:**
- `02-kill-zombie-tsservers.ps1`: Age gates (60 min) ensure only stale editor LSP + old MCP servers killed; VS Code/Cursor auto-respawn on next keystroke (~5s re-index, no data loss)
- `06-aggressive-killer.mjs`: Dual-gates (age + parent-dead for MCP/git) + ancestor
... [+11224 chars truncated]
