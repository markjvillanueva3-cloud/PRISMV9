---
type: "chat-session"
source: "claude-code-cli"
session_id: "a614edfb-8bcb-461d-bac1-a5df0acd7b73"
title: "You are reviewing two files changed in a PRISM fleet-hygiene work item: wiring a"
date: "2026-05-19"
first_ts: "2026-05-19T16:30:44.770Z"
last_ts: "2026-05-19T16:31:46.888Z"
cwd: "H:\\PRISM"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-afe77035e1292b174.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# You are reviewing two files changed in a PRISM fleet-hygiene work item: wiring a

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-afe77035e1292b174.jsonl`

## Transcript

### User | 2026-05-19T16:30:44.770Z

You are reviewing two files changed in a PRISM fleet-hygiene work item: wiring a watchdog-stack orchestrator into the `/fleet-reaper` slash command so one command brings up all 10 critical Windows scheduled-task watchdogs.

CONTEXT: PRISM is a Windows manufacturing-intelligence platform. It runs ~10 critical fleet-hygiene Windows scheduled tasks (MCP server supervisor, MCP wedge watchdog, fleet reaper, memory monitor, cleanup orchestrator, etc.). The new `ensure-all-watchdogs.ps1` orchestrator iterates a canonical 10-watchdog table and installs/enables any missing ones. The user wants `/fleet-reaper` to auto-launch the whole stack as Step 0.

FILE 1 — H:\prism-slot-hotel\.claude\helpers\ensure-all-watchdogs.ps1
The key change this session: the `Install-Watchdog` function previously trusted `$LASTEXITCODE` from a nested `& powershell ... 2>&1` call to decide INSTALL-FAILED vs INSTALLED. That exit code is unreliable (false INSTALL-FAILED reported even when the task registered fine). It was replaced with a post-install `Get-ScheduledTask` probe: if the task IS present after the install attempt, declare INSTALLED regardless of exit code.

FILE 2 — H:\prism-slot-hotel\.claude\commands\fleet-reaper.md
A new "Step 0 — Ensure the full watchdog stack" was added to the Protocol section before "Step 1 — Sweep", plus a `watchdogs:` line in the verdict block, a `--no-ensure-watchdogs` flag in the Args section, and companion-surface + when-line-appears doc updates.

Read BOTH files end-to-end. Verify:
1. The PowerShell exit-code fix is correct — does the post-install probe logic handle all branches (Absent→install, Disabled→enable, Ready→noop, Force)? Is the 500ms Start-Sleep sufficient for Task Scheduler commit latency? Is the INSTALL-FAILED path still reachable for a genuinely-failed install?
2. Any PowerShell correctness bugs — variable scoping, `$ErrorActionPreference`, the `& powershell ... 2>&1` pattern, string truncation `.Substring`.
3. The skill-doc Step 0 is internally 
... [+650 chars truncated]

### Assistant | 2026-05-19T16:31:01.384Z

I'll read both files end-to-end.

### Assistant | 2026-05-19T16:31:02.219Z

[tool_use: Read]

### Assistant | 2026-05-19T16:31:03.100Z

[tool_use: Read]

### User | 2026-05-19T16:31:22.149Z

[tool_result] 1	param(
2	  [switch]$WhatIf,       # report only — never install/enable
3	  [switch]$Force,        # re-register every watchdog even if already Ready
4	  [switch]$Quiet,        # suppress per-task lines, print summary only
5	  [string[]]$Only = @(), # narrow to a specific watchdog (by task name)
6	  [string[]]$Skip = @()  # exclude specific watchdogs (by task name)
7	)
8	
9	# ensure-all-watchdogs
... [+8802 chars truncated]

### User | 2026-05-19T16:31:23.515Z

[tool_result] 1	---
2	name: fleet-reaper
3	description: Launch the slot-aware orphan-process reaper + RAM/CPU/GPU coordinator for the 7-chat fleet. Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. FLEET-REAPER-MS1 adds three layers: a leftover-bash-
... [+23421 chars truncated]

### Assistant | 2026-05-19T16:31:46.888Z

# Review: `/fleet-reaper` Step-0 watchdog-stack wiring

## P0 — breaks

**None.** Both files parse correctly; the orchestrator and skill-doc are functionally coherent.

## P1 — wrong / misleading

**1. Doc lies about elevation fallback.** The skill-doc claims the orchestrator "is **elevation-aware**: if the running shell is not elevated it falls back to `-WhatIf`" (line 137-139), and the companion-surface line repeats "elevation-aware (`-WhatIf` fallback)" (line 318). **The `.ps1 does NOT do this.** Lines 30-32 *`throw`* on non-admin unless `-WhatIf` was *explicitly passed by the caller*:
```powershell
if (-not $isAdmin -and -not $WhatIf) { throw "Run from an ELEVATED PowerShell..." }
```
There is no auto-fallback — a non-elevated invocation hard-fails with a thrown error, it does not silently degrade to report-only. Step 1's bash example (line 120) passes no `-WhatIf`, so on a non-admin shell the orchestrator throws and Step 0 aborts. **Fix:** either make the doc honest ("throws on non-admin; pass `-WhatIf` yourself for an unelevated report-only run") or actually implement the fallback (`if (-not $isAdmin) { $WhatIf = $true; Write-Host "not elevated → -WhatIf" }`).

**2. `INSTALL-FAILED` detail tail truncates from the *wrong end* — actually correct here, but inconsistent.** Line 87 `$tail.Substring($tail.Length - 240)` keeps the *last* 240 chars (the actual error tail) — correct. But line 126's `ENABLE-FAILED` truncation `.Substring(0, ...Min(80,...))` keeps the *first* 80. Not a bug, just inconsistent truncation direction; P2-borderline. Keep as P1 only because a thrown installer error's useful message is usually at the *end*, so `ENABLE-FAILED` may show a less-useful head.

## P2 — nits

- **500ms Start-Sleep** (line 75): Task Scheduler registration via `Register-ScheduledTask` is synchronous — the task is queryable on return. The sleep is harmless belt-and-suspenders; sufficient. No change needed.
- **`WOULD-INSTALL` counted as `installed++`** (line 112): under 
... [+1232 chars truncated]
