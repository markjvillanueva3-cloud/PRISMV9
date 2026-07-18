---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "You are reviewer C of three independent Claude PRISM reviewers — the analyst arm"
date: "2026-05-14"
first_ts: "2026-05-14T23:54:37.453Z"
last_ts: "2026-05-15T00:02:04.067Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a03afb80192816d19.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# You are reviewer C of three independent Claude PRISM reviewers — the analyst arm

> **claude-code-cli** | 2026-05-14 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a03afb80192816d19.jsonl`

## Transcript

### User | 2026-05-14T23:54:37.453Z

You are reviewer C of three independent Claude PRISM reviewers — the analyst arm, weighted toward silent breakage, regression risk, I/O security, error-budget completeness, and integration coupling. Do NOT assume reviewers A and B caught everything. Target: commit 311044234 "[INFRA-FIX]/RAM-MONITOR-CORRECTION".

Read the WHOLE corrected files end-to-end:
- H:\prism\scripts\system-health\03-memory-pressure-auto-relief.ps1
- H:\prism\.claude\helpers\install-memory-pressure-task.ps1
Also read H:\prism\.claude\hooks\node-process-janitor.mjs (the script now invoked) — specifically its arg parsing and what `--full` does, and whether running it from a 5-min scheduled task could itself cause harm (does it kill processes the memory-pressure task shouldn't trigger? PID-scoping?).

CONTEXT: 311044234 corrects 45350f309. 45350f309 falsely claimed node-process-janitor.mjs was dead and swapped it for cleanup-orchestrator.mjs. This commit reverts that swap (back to node-process-janitor.mjs --full), keeps the Invoke-Bounded self-bounding fix, and fixes a GetTempFileName-outside-try bug (the bug YOUR prior review of 45350f309 raised as P1).

YOUR FOCUS:
- SILENT BREAKAGE: Does running node-process-janitor.mjs --full from the memory-pressure scheduled task have side effects the OLD (pre-45350f309) behavior didn't? The original code ran it the same way, so this is a true revert — but confirm node-process-janitor.mjs --full is SAFE to run on a 5-min cadence from a scheduled task (not just from a Stop hook). Could it kill THIS scheduled task's own powershell.exe / node.exe children, or the Claude chats' processes?
- ERROR BUDGET: Trace every failure path in Invoke-Bounded post-fix. GetTempFileName throws → catch returns hashtable; Start-Process throws → catch; Wait-Process times out → taskkill/Kill branch; $proc.Kill() throws → swallowed. Is ANY path still able to throw OUT of Invoke-Bounded? If Start-Process succeeds but assigns $proc, then a later line throws — does finally still clea
... [+980 chars truncated]

### Assistant | 2026-05-14T23:54:44.478Z

I'll review the three files end-to-end.

### Assistant | 2026-05-14T23:54:45.597Z

[tool_use: Read]

### Assistant | 2026-05-14T23:54:46.223Z

[tool_use: Read]

### Assistant | 2026-05-14T23:54:46.255Z

[tool_use: Read]

### User | 2026-05-14T23:54:46.541Z

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

### User | 2026-05-14T23:54:48.264Z

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

### User | 2026-05-15T00:01:14.930Z

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
... [+4251 chars truncated]

### Assistant | 2026-05-15T00:02:04.067Z

I have all three files. Let me trace the critical paths.

## Analysis

### node-process-janitor.mjs `--full` safety

`--full` sets `FULL=true`, which: (1) skips stdin drain, (2) skips throttle, (3) runs the same PS sweep + the orphan-MCP/git pass. Critically the kill categories are **identical** in `--full` vs hot-path — `--full` just bypasses the throttle stamp. The four kill categories:

1. `node.exe` w/ `.claude/hooks` or `.claude/helpers` in cmdline, age > 45s
2. `bash.exe`/`sh.exe` w/ same scope, age > 45s
3. `node.exe` w/ `@playwright*mcp` or `mcp-http-bridge.mjs` cmdline — **only if parent-dead**
4. `git.exe` w/ `*prism*` cmdline — **only if parent-dead**

**Can it kill the memory-pressure task's own children?** The scheduled task runs `powershell.exe -File 03-memory-pressure-auto-relief.ps1`. That powershell's cmdline references `scripts\system-health\` — **not** `.claude/hooks` or `.claude/helpers`, so category 1/2 cannot match it (and it's `powershell.exe`, not `node.exe`/`bash.exe` anyway). The `node.exe` that runs the janitor itself is excluded via `$self`. The janitor's *child* powershell (the temp `.ps1` execSync) — that powershell's cmdline references `prism-janitor-*.ps1` in tmpdir, not `.claude/hooks`, so it won't self-match. **Safe.**

**Can it kill Claude chat processes?** The Claude harness node processes don't run `.claude/hooks` cmdlines — they're the harness. Their MCP servers (category 3) are protected by the parent-dead gate: a live session's MCP has a live parent. A live `git commit` from a chat (category 4) has a live parent. The age gate is 45s — a hook node older than 45s is well past any 10s hook timeout, so it's genuinely an orphan. This is the **same behavior the original pre-45350f309 code ran** — it's a true revert. No new side effects.

One real concern: `02-kill-zombie-tsservers.ps1` is invoked but **not in this commit's diff and not provided to me** — I can't verify its kill scoping. But it's unchanged from before the bad commit 
... [+5820 chars truncated]
