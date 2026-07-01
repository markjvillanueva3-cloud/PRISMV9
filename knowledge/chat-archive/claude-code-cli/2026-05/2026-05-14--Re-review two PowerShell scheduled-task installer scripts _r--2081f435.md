---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "Re-review two PowerShell scheduled-task installer scripts (round 2 — round 1 had"
date: "2026-05-14"
first_ts: "2026-05-14T20:30:16.613Z"
last_ts: "2026-05-14T20:31:22.480Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-ab5bc7603388c46b0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Re-review two PowerShell scheduled-task installer scripts (round 2 — round 1 had

> **claude-code-cli** | 2026-05-14 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-ab5bc7603388c46b0.jsonl`

## Transcript

### User | 2026-05-14T20:30:16.613Z

Re-review two PowerShell scheduled-task installer scripts (round 2 — round 1 had a FAIL from an independent reviewer, now addressed). Read BOTH files fully:
1. H:\prism\.claude\helpers\install-memory-pressure-task.ps1
2. H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1

ROUND-1 FINDINGS NOW ADDRESSED — verify each fix is correct:
- File 2 was REWRITTEN: round 1 it wrongly pointed the new task at `cleanup-orchestrator.mjs` directly. It now registers the task to run the CANONICAL wrapper `H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1` (shipped by U-CLEANUP-E3) via `powershell.exe -File`. Read `H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1` to confirm the installer invokes it correctly (correct -File path, the wrapper accepts `-DryRun`, the wrapper does its own node resolution so the installer needs none).
- File 2 P1-1 fix: added an existence probe (`Get-ScheduledTask` before `Register-ScheduledTask -Force`) that Write-Hosts a "Replacing existing task" notice. Verify it's correct and placed before the Register call.
- File 2 P1-3 fix: the phase-offset comment now says "+135s is the midpoint between Memory-Relief (+60s) and Fleet-Reaper (+210s)" (was "half-cycle between"). Verify the wording is now accurate.
- File 2 P2: added a KNOWN-LIMITATION comment about `-Once` trigger re-anchoring on re-install; added a footer line to list all PRISM hygiene tasks.
- File 1 (install-memory-pressure-task.ps1) P1-2 fix: added footer Write-Host lines telling the operator the Register call is what applies the 4-min limit, and to re-run elevated if they only pulled the commit.

VERIFY:
- File 2: the sanity head-check regex now matches on `cleanup-orchestrator` + `U-CLEANUP-E3` — confirm both strings appear in 28-cleanup-orchestrator.ps1's first 60 lines.
- File 2: `$wrapperArgs` string construction with the `$(if ($DryRun) {...})` subexpression inside a double-quoted string + the backtick-escaped `\`"...\`"` around the path — is the resulting ar
... [+528 chars truncated]

### Assistant | 2026-05-14T20:30:21.029Z

I'll read all three files fully to verify the round-1 fixes.

### Assistant | 2026-05-14T20:30:21.878Z

[tool_use: Read]

### Assistant | 2026-05-14T20:30:22.692Z

[tool_use: Read]

### Assistant | 2026-05-14T20:30:22.840Z

[tool_use: Read]

### User | 2026-05-14T20:30:24.638Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1' was already read 4m ago in this session and is unchanged (mtime 1778727600844). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-14T20:30:25.806Z

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
... [+4214 chars truncated]

### User | 2026-05-14T20:30:27.339Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Cleanup Orchestrator',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM runs three 5-min
5	  # PowerShell/node-forking hygiene tasks; firing them on the same minute
6	  # spikes the process table. Default anchors: "Memory Pressure Auto-Relief"
7	  # ~+60s, this orchestrator +135s, "Fleet Reaper" +210s — i.e. +135s is the
... [+9848 chars truncated]

### Assistant | 2026-05-14T20:30:31.451Z

The read-once guard blocked the third file but I read it 4 minutes ago. Let me retrieve the specific parts I need to verify against — the first 60 lines for the header anchors, and the param/DryRun handling.

### Assistant | 2026-05-14T20:30:31.956Z

[tool_use: Read]

### User | 2026-05-14T20:30:33.688Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-E3 — every-5-min orphan reaper for nodes / git locks / bash.
5	
6	.DESCRIPTION
7	  Thin Windows-Task-Scheduler wrapper around .claude/helpers/cleanup-orchestrator.mjs.
8	  The orchestrator delegates to 5 existing PRISM cleaners (NO new kill logic):
9	    - git-lock-sweeper.mjs        — clears stale .git/*.lock
10	    - chat-bus-reap.
... [+2665 chars truncated]

### Assistant | 2026-05-14T20:30:36.378Z

Now let me read the rest of the wrapper to confirm node resolution and exit codes.

### Assistant | 2026-05-14T20:30:36.853Z

[tool_use: Read]

### User | 2026-05-14T20:30:41.650Z

[tool_result] 75	
76	$nodeBin = "H:\Tools\nodejs\node.exe"
77	if (-not (Test-Path $nodeBin)) {
78	  $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
79	}
80	if (-not $nodeBin) {
81	  Write-Error "node binary not found (tried H:\Tools\nodejs\node.exe + PATH)"
82	  exit 3
83	}
84	
85	& $nodeBin @nodeArgs
86	$exit = $LASTEXITCODE
87	if ($null -eq $exit) { $exit = 0 }
88	exit $exit
89	

### Assistant | 2026-05-14T20:31:22.480Z

I have all three files fully. Let me verify each round-1 fix and check for remaining issues.

## Verification

**File 2 → wrapper invocation (`28-cleanup-orchestrator.ps1`):**
- Installer line 86 targets `H:\PRISM\scripts\system-health\28-cleanup-orchestrator.ps1` — correct path, file exists.
- Wrapper accepts `-DryRun` (param line 55) and forwards `--dry-run` to the orchestrator (line 72). Confirmed.
- Wrapper does its own node resolution (lines 76-83: `H:\Tools\nodejs\node.exe` then PATH fallback). Installer needs none. Confirmed.
- Installer invokes via `powershell.exe -File` (line 104). Note: the wrapper's shebang says `pwsh` and its own `.EXAMPLE` uses `pwsh.exe`, but the wrapper only uses 5.1-compatible cmdlets/syntax (`param([switch])`, `Split-Path`, `Join-Path`, `Test-Path`, `&`, `$LASTEXITCODE`) — running it under `powershell.exe` 5.1 is fine, and the installer comment (lines 99-102) explicitly justifies this. Correct.

**File 2 → sanity head-check regex (lines 94-96):** Wrapper line 4 contains `U-CLEANUP-E3` AND `cleanup-orchestrator` (also lines 7, 39, etc.). Both anchors are within the first 60 lines. `Get-Content -TotalCount 60` returns a string array; `$head -match 'pattern'` against an array returns the matching elements (truthy if any match), so `(-not ((...) -and (...)))` is correct boolean logic. PASS.

**File 2 → `$wrapperArgs` construction (line 103):**
```powershell
$wrapperArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$wrapperScript`"$(if ($DryRun) { ' -DryRun' })"
```
The `$(...)` subexpression returns `' -DryRun'` (string) or `$null` (when `$DryRun` is false; an `if` with no else yields `$null`, which stringifies to empty). The backtick-escaped `` `" `` produces literal double-quotes around the path. Resulting argument string when not DryRun: `-NoProfile -ExecutionPolicy Bypass -File "H:\PRISM\scripts\system-health\28-cleanup-orchestrator.ps1"`. When DryRun: same with ` -DryRun` appended. Correct for `New-ScheduledTaskAction -Argument`. 
... [+4665 chars truncated]
