---
type: "chat-session"
source: "claude-code-cli"
session_id: "76a392af-6ede-4688-ba7e-5ef9ec1099cd"
title: "Review `H:\\PRISM\\.claude\\helpers\\install-fleet-reaper-task.ps1` end-to-end (read"
date: "2026-05-14"
first_ts: "2026-05-14T14:33:12.979Z"
last_ts: "2026-05-14T14:34:37.216Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-af470c48bed99630b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review `H:\PRISM\.claude\helpers\install-fleet-reaper-task.ps1` end-to-end (read

> **claude-code-cli** | 2026-05-14 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-af470c48bed99630b.jsonl`

## Transcript

### User | 2026-05-14T14:33:12.979Z

Review `H:\PRISM\.claude\helpers\install-fleet-reaper-task.ps1` end-to-end (read the WHOLE file). It is a Windows Scheduled-Task installer that registers a 5-minute task running `H:\PRISM\scripts\fleet-reaper-sweep.mjs --once` (the slot-aware orphan-process reaper).

It was cloned from the proven sibling `H:\PRISM\.claude\helpers\install-hook-janitor-task.ps1` — read that sibling and diff the two: confirm the clone correctly adapted the pattern and didn't drop or mis-copy anything.

Verify:
1. `param()` block — `$TaskName`, `$EveryMinutes`, `$RunNow`, `$Uninstall` — sane defaults? `$EveryMinutes = 5` correct?
2. `$ErrorActionPreference = 'Stop'` — present (the sibling has it)?
3. Node binary resolution — `H:\Tools\nodejs\node.exe` → `C:\Program Files\nodejs\node.exe` → `Get-Command node` fallback. Matches the sibling? Does `Get-Command node -ErrorAction Stop` correctly throw a clear error if node isn't anywhere?
4. `-Uninstall` path — `Get-ScheduledTask ... -ErrorAction SilentlyContinue` then `Unregister-ScheduledTask ... -Confirm:$false`, with a `return`. Idempotent (safe to run when the task doesn't exist)?
5. The sanity check — `Get-Content $sweepScript -TotalCount 90` then `($head -match 'slot-aware orphan') -and ($head -match '--once')`. Is `-match` against an ARRAY (Get-Content returns string[]) the right operator here — does it work as "any line matches"? (It does in PowerShell, but confirm.) Is this a meaningful guard against installing a task that points at a wrong/stale script?
6. `New-ScheduledTaskAction` — `-Execute $nodeExe -Argument "`"$sweepScript`" --once"` — is the quoting correct so the task runs `node.exe "H:\PRISM\scripts\fleet-reaper-sweep.mjs" --once`? The backtick-escaped quotes inside the double-quoted string — trace the resulting argument string exactly.
7. `New-ScheduledTaskTrigger` — `-Once -At (Get-Date).AddMinutes(1) -RepetitionInterval ... -RepetitionDuration (New-TimeSpan -Days 3650)`. Matches the sibling's "repeat forever" pattern?
8.
... [+860 chars truncated]

### Assistant | 2026-05-14T14:33:17.128Z

I'll review both files end-to-end and diff them.

### Assistant | 2026-05-14T14:33:18.011Z

[tool_use: Read]

### Assistant | 2026-05-14T14:33:18.192Z

[tool_use: Read]

### User | 2026-05-14T14:33:20.690Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  [switch]$RunNow,
5	  [switch]$Uninstall
6	)
7	
8	# install-fleet-reaper-task.ps1 — durable backbone for the slot-aware orphan reaper.
9	#
10	# Registers a Windows Scheduled Task that runs fleet-reaper-sweep.mjs --once every
11	# $EveryMinutes minutes, independent of any Claude Code session. This is the
12	# "sur
... [+4925 chars truncated]

### User | 2026-05-14T14:33:21.160Z

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

### Assistant | 2026-05-14T14:33:27.622Z

Now let me verify the sweep script's actual header to confirm the sanity check works, and check that the referenced env knobs match reality.

### Assistant | 2026-05-14T14:33:28.045Z

[tool_use: Read]

### User | 2026-05-14T14:33:32.099Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.
4	 *
5	 * PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each chat
6	 * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
7	 * children. When a chat crashes or is closed WITHOUT firing its Stop hooks those
8	 * children are orphaned — they p
... [+4976 chars truncated]

### Assistant | 2026-05-14T14:34:37.216Z

I have everything I need. Let me trace through each verification point.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 3 (target installer, sibling installer, sweep script header)
- Issues Found: 3 (0 P0, 0 P1, 1 P2, 2 P3)
- Technical Debt Estimate: ~0.25 hours (cosmetic only)

The clone is a faithful, correctly-adapted copy of the proven sibling. Every structural element transferred intact; the intentional deviations (task name, cadence, script path, sanity regex, timeout, knobs block) are all justified and correct. No functional defect found.

---

### Verification walkthrough (all 11 points)

**1. `param()` block — PASS.** Lines 1-6. `$TaskName='PRISM Fleet Reaper'` (distinct from sibling's `'PRISM Hook Janitor'` — correct, no task-name collision). `$EveryMinutes=5` (sibling=2) — correct and matches the documented rationale at lines 23-26 (cleanup-orchestrator / memory-relief cadence; reaper's own 2-tick confirm window means ~10-15 min to reap). `$RunNow`/`$Uninstall` switches identical to sibling. Sane.

**2. `$ErrorActionPreference = 'Stop'` — PASS.** Line 31. Present, matches sibling line 24.

**3. Node binary resolution — PASS.** Lines 37-42. Identical logic to sibling lines 28-33: `foreach` over `@('H:\Tools\nodejs\node.exe','C:\Program Files\nodejs\node.exe')` with `Test-Path`+`break`, then `(Get-Command node -ErrorAction Stop).Source`. `Get-Command node -ErrorAction Stop` does correctly throw a terminating error (`CommandNotFoundException`) if node is absent from PATH — and with `$ErrorActionPreference='Stop'` already set the `-ErrorAction Stop` is belt-and-suspenders but harmless. The thrown error names `node` clearly. Correct.

**4. `-Uninstall` path — PASS.** Lines 44-52. `Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue` (returns `$null`, no throw, when absent) → `Unregister-ScheduledTask -Confirm:$false` only inside the `if`, else prints "already uninstalled" → `return`. Fully idempoten
... [+8326 chars truncated]
