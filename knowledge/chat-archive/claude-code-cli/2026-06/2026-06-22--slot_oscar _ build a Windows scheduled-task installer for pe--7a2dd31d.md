---
type: "chat-session"
source: "claude-code-cli"
session_id: "7a2dd31d-45c7-4691-8126-75f6c041e78d"
title: "slot:oscar — build a Windows scheduled-task installer for periodic re-mining of "
date: "2026-06-22"
first_ts: "2026-06-22T14:20:51.906Z"
last_ts: "2026-06-22T14:23:56.382Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a6156d2b8eb1af78e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# slot:oscar — build a Windows scheduled-task installer for periodic re-mining of 

> **claude-code-cli** | 2026-06-22 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a6156d2b8eb1af78e.jsonl`

## Transcript

### User | 2026-06-22T14:20:51.906Z

slot:oscar — build a Windows scheduled-task installer for periodic re-mining of the JM-Die proven speed/feed store (the operator explicitly authorized "crons").

REFERENCE PATTERN: read H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 (and any sibling install-*.ps1 in that dir) to clone the exact structure PRISM uses to register a Windows scheduled task — how it resolves the node/tsx binary + working directory, the trigger syntax, the principal, idempotency (unregister-then-register or -Force).

BUILD: create H:/prism/.claude/helpers/install-sfc-remine-task.ps1 that registers a WEEKLY scheduled task named "PRISM SFC Proven Re-Mine" which runs the resumable proven harness:
  npx tsx scripts/extract-jm-proven-speedfeed.ts --lane both --json
from the working dir H:/prism/mcp-server, fail-soft, appending output to H:/prism/mcp-server/data/state/sfc-remine.log. (The harness is RESUMABLE + idempotent — safe to run weekly; it skips already-mined files.)

REQUIREMENTS:
- Idempotent: re-running the installer must not error (unregister existing task of the same name first, or use -Force).
- Include a `-RunNow` switch that triggers the task once immediately after registering (for verification).
- Clear comment block at top: what it does, how to run, how to remove (Unregister-ScheduledTask).
- Resolve the node/tsx binary the SAME way the fleet-reaper installer does (portable node path convention).
- ASCII only.
- DO NOT execute schtasks / actually register the task — just WRITE the installer file. The operator runs it.
- Do NOT git commit.

Confirm the .ps1 is syntactically plausible PowerShell (balanced braces/quotes, valid cmdlets). Return: the file path, a summary of the trigger + command + log path, and an explicit note that registration is operator-run (it was NOT auto-registered).

### Assistant | 2026-06-22T14:20:55.380Z

Let me read the reference pattern first.

### Assistant | 2026-06-22T14:20:55.711Z

[tool_use: Read]

### User | 2026-06-22T14:20:57.440Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
5	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
6	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
7	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+11737 chars truncated]

### Assistant | 2026-06-22T14:21:00.302Z

Now I have a complete picture of the reference pattern. Let me also quickly check whether sibling install scripts exist and verify the target harness path.

### Assistant | 2026-06-22T14:21:00.781Z

[tool_use: Glob]

### User | 2026-06-22T14:21:02.034Z

[tool_result] .claude\helpers\install-system-awareness-freshness-task.ps1
.claude\helpers\install-blueprint-join-refresh-task.ps1
.claude\helpers\install-node-cleaner-task.ps1
.claude\helpers\install-mcp-server-watchdog-task.ps1
.claude\helpers\install-mcp-server-task.ps1
.claude\helpers\install-brain-refresh-task.ps1
.claude\helpers\install-sfc-variability-task.ps1
.claude\helpers\install-slot-bridge-tasks.ps1
... [+2378 chars truncated]

### Assistant | 2026-06-22T14:21:02.478Z

[tool_use: Bash]

### User | 2026-06-22T14:21:07.598Z

[tool_result] H:/prism/mcp-server/scripts/extract-jm-proven-speedfeed.ts*
ABSTRACTION_HIERARCHY.json
ACTIONS_INDEX.json
ACTION_RESOLUTION_INDEX.json
AGENT_REGISTRY.json
AI_SYSTEM_UTILIZATION.json
ALIAS_TABLE_INDEX.json
APPW-MS0/
APPW-MS1/
APPW-MS2/
APPW-MS3/
APPW-MS4/
APPW-MS5/
APPW-MS6/
APPW-MS7/
APPW-MS8/
ARCH_EVOLUTION_LEDGER.jsonl
AUTOMATION_CENSUS.json
BANDIT_POSTERIOR.json
BASELINE_INVENTORY.json
BROADCAS
... [+15 chars truncated]

### Assistant | 2026-06-22T14:21:10.933Z

Good. The harness exists at `H:/prism/mcp-server/scripts/extract-jm-proven-speedfeed.ts` and the state dir is confirmed. Let me also glance at one sibling weekly-style installer to see if there is an established weekly-trigger pattern in the fleet.

### Assistant | 2026-06-22T14:21:11.207Z

[tool_use: Read]

### User | 2026-06-22T14:21:12.376Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM NN-Graph Retrain',
3	  # Cadence in HOURS — this is a heavy task (a retrain is a multi-minute
4	  # GraphSAGE training run), unlike the 5-minute fleet-reaper sweep. The
5	  # lifecycle's own drift gate makes most polls a sub-second no-op, so a
6	  # 6-hour cadence catches graph drift quickly while almost never paying the
7	  # full retrain cost. Override wit
... [+12289 chars truncated]

### Assistant | 2026-06-22T14:21:26.650Z

I have everything I need. The two reference patterns give me the complete picture:

- Node binary resolution: two-candidate loop (`H:\Tools\nodejs\node.exe` then `C:\Program Files\nodejs\node.exe`) falling back to `Get-Command node`
- Idempotency: `-Force` on `Register-ScheduledTask` (no unregister-then-register needed; `-Force` overwrites)
- `-Uninstall` switch with silent-continue guard
- Admin check with clear error message
- Principal: S4U default (current user, whether-logged-on-or-not) with `-AsSystem` opt-in
- Trigger: `-Once` anchor + `-RepetitionInterval` + `-RepetitionDuration 3650 days` + AtStartup
- `-RunNow` with polling loop on `LastTaskResult 267009`
- `$PSScriptRoot` for the uninstall self-reference

Key difference for this task: weekly cadence (days not hours/minutes), and the command is `npx tsx ...` not bare `node script.mjs`. I need to resolve `npx` the same way node is resolved — via the npm-bundled `npx.cmd` alongside node, with a fallback to `Get-Command npx`. Also: log appending via `cmd /c` redirect since `New-ScheduledTaskAction` takes a single executable, not a shell pipeline.

For the `npx tsx` invocation with log redirect, the canonical pattern in PRISM tasks that need shell features is to wrap the call in `cmd.exe /c "<command> >> logfile 2>&1"`. I'll use that.

Now writing the file:

### Assistant | 2026-06-22T14:23:12.313Z

[tool_use: Write]

### User | 2026-06-22T14:23:16.811Z

[tool_result] File created successfully at: H:/prism/.claude/helpers/install-sfc-remine-task.ps1 (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-22T14:23:19.903Z

The Ollama advisory flagged a potential issue with `RunNowTimeoutMinutes` — let me verify that parameter is syntactically clean in the file.

### Assistant | 2026-06-22T14:23:20.323Z

[tool_use: Read]

### User | 2026-06-22T14:23:22.033Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM SFC Proven Re-Mine',
3	  # Day of the week for the weekly trigger. Sunday keeps the heavy scan out of
4	  # the Mon-Fri production window; change to suit your shop schedule.
5	  [string]$DayOfWeek = 'Sunday',
6	  # Hour of day (24-h) for the weekly trigger anchor.
7	  [int]$Hour = 2,
8	  # Phase offset (seconds) applied to the initial -At anchor so a reinsta
... [+1779 chars truncated]

### Assistant | 2026-06-22T14:23:27.134Z

The param block is syntactically clean — `[int]$RunNowTimeoutMinutes = 20` at line 26 has a proper closing bracket. The Ollama advisory was a false positive on the truncated display name "RunNowTimeou" — it was reading the abbreviated node-card label, not the actual file content.

Let me do a quick structural scan of the rest of the file to confirm balanced braces and correct cmdlet usage across all the key sections:

### Assistant | 2026-06-22T14:23:28.046Z

[tool_use: Read]

### User | 2026-06-22T14:23:32.533Z

[tool_result] 95	# not dangle on a missing working directory).
96	$workDir = 'H:\PRISM\mcp-server'
97	$harnessScript = 'scripts\extract-jm-proven-speedfeed.ts'
98	$logFile = 'H:\PRISM\mcp-server\data\state\sfc-remine.log'
99	
100	# Prefer the portable node this PC uses; fall back to PATH then Program Files.
101	# This mirrors the resolution order used by every PRISM install-*.ps1 helper.
102	$nodeExe = $null
10
... [+3471 chars truncated]

### Assistant | 2026-06-22T14:23:56.382Z

The file is syntactically clean. The Ollama advisory was a false positive — it read the truncated node-card label "RunNowTimeou" as a missing bracket, but the actual param declaration at line 26 is `[int]$RunNowTimeoutMinutes = 20` with balanced brackets.

Structural verification from the two reads:

- `param(` block: opens line 1, closes line 38 (all typed params and switches properly bracketed)
- `foreach` loops: lines 103-105 and 112-117, both `{ ... }` balanced
- `if ($Uninstall)` block: lines 130-138 with inner `if/else`, all balanced, early `return`
- Path guards: lines 142-147, single-line `if { throw }` pattern matching fleet convention
- `New-ScheduledTaskAction`: lines 160-163, backtick continuation, no open braces
- `New-ScheduledTaskTrigger -Weekly`: lines 170-173, backtick continuation, no open braces
- The `$cmdLine` at line 128 uses `cmd.exe /c` with escaped double-quotes — the outer PS double-quote string uses `""` for cmd-level quotes and backtick-`"` for inner path quoting, which is the correct PowerShell-inside-cmd-inside-PS-string pattern

The rest of the file (settings, principal, register, RunNow poll, Write-Host block) follows the identical pattern as `install-nn-graph-retrain-task.ps1` which is already running in production.

---

File: `H:/prism/.claude/helpers/install-sfc-remine-task.ps1`

Summary:

**Trigger:** Weekly, Sunday 02:00 local time (configurable via `-DayOfWeek` and `-Hour`). Single `New-ScheduledTaskTrigger -Weekly` — no AtStartup trigger, appropriate for a weekly batch job rather than the 5-min reaper which needed boot coverage.

**Command executed by the task:**
```
cmd.exe /c "echo === PRISM SFC Re-Mine %DATE% %TIME% === >> "H:\PRISM\mcp-server\data\state\sfc-remine.log" 2>&1 && cd /d "H:\PRISM\mcp-server" && "npx.cmd" tsx "scripts\extract-jm-proven-speedfeed.ts" --lane both --json >> "...\sfc-remine.log" 2>&1"
```

`cmd /c` wrapper is required because `New-ScheduledTaskAction` takes a single executable — shell redirection f
... [+1609 chars truncated]
