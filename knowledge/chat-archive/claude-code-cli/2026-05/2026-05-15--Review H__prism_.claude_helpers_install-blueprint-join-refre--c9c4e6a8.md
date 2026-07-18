---
type: "chat-session"
source: "claude-code-cli"
session_id: "c9c4e6a8-22e3-4cd2-b834-feece577b10c"
title: "Review H:/prism/.claude/helpers/install-blueprint-join-refresh-task.ps1 end-to-e"
date: "2026-05-15"
first_ts: "2026-05-15T03:08:14.411Z"
last_ts: "2026-05-15T03:09:11.563Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-a60331e8399641cda.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review H:/prism/.claude/helpers/install-blueprint-join-refresh-task.ps1 end-to-e

> **claude-code-cli** | 2026-05-15 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-a60331e8399641cda.jsonl`

## Transcript

### User | 2026-05-15T03:08:14.411Z

Review H:/prism/.claude/helpers/install-blueprint-join-refresh-task.ps1 end-to-end as a PowerShell engineer with deep Windows Scheduled Task knowledge.

CONTEXT — This file ships in U-DOCU-04 / MS-DOCU-INGEST. It registers a Windows Scheduled Task ("PRISM Blueprint Join Refresh") pointing at the canonical wrapper scripts/system-health/33-blueprint-join-refresh.ps1 (just shipped, also under review). The cron runs weekly Sunday at 08:47 local. Sibling installers in the same dir: install-cleanup-orchestrator-task.ps1 (the explicit model), install-fleet-reaper-task.ps1, install-memory-pressure-task.ps1.

REQUIREMENTS (from unit spec):
- Modeled on install-cleanup-orchestrator-task.ps1 (params, elevation probe, sanity probe, -DryRun/-RunNow/-Uninstall, existence probe + replace-not-clobber, -Force register)
- Weekly Sunday trigger at off-peak time (08:47 local)
- powershell.exe (PS 5.1) — not pwsh.exe
- ExecutionTimeLimit ~30min
- Task name 'PRISM Blueprint Join Refresh'
- Wrapper sanity check: target script header contains 'blueprint-join-refresh' AND 'U-DOCU-04'

CHECK FOR (P0/P1 only):
1. PowerShell parser correctness (parse already verified OK; double-check by re-reading the file).
2. Bugs in the elevation probe, -Uninstall branch, Register-ScheduledTask args, trigger construction.
3. Wrapper-script-path correctness: must point at H:\PRISM\scripts\system-health\33-blueprint-join-refresh.ps1 (the file in main tree, not a worktree path).
4. Sanity-probe header anchors: do 'blueprint-join-refresh' and 'U-DOCU-04' actually appear in the FIRST 60 lines of the wrapper? Verify by reading H:/prism/scripts/system-health/33-blueprint-join-refresh.ps1 head.
5. Trigger semantics: New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At '08:47' — does this fire ONLY on Sunday at 08:47 local? Or every week starting from this Sunday?
6. ExecutionTimeLimit 30 min — appropriate for the wrapper's expected runtime?
7. MultipleInstances IgnoreNew — correct semantics?
8. -RunNow polling l
... [+871 chars truncated]

### Assistant | 2026-05-15T03:08:20.666Z

I'll review the installer script end-to-end against the requirements.

### Assistant | 2026-05-15T03:08:21.394Z

[tool_use: Read]

### User | 2026-05-15T03:08:22.286Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Blueprint Join Refresh',
3	  # Weekly cadence -- runs every Sunday at the same local wall-clock time. Mirrors
4	  # the in-session golf-cron-registry entry `golf-blueprint-join-refresh`
5	  # (cronExpr '47 8 * * 0' = Sunday 08:47 UTC). We pick LOCAL 08:47 here for the
6	  # Windows trigger because Task Scheduler triggers are local-time by default and
7	  # t
... [+10699 chars truncated]

### Assistant | 2026-05-15T03:08:29.151Z

Now let me verify the wrapper script header (req #4) and compare against the sibling installer (req #1).

### Assistant | 2026-05-15T03:08:30.166Z

[tool_use: Read]

### Assistant | 2026-05-15T03:08:30.523Z

[tool_use: Read]

### User | 2026-05-15T03:08:31.032Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1' was already read 22m ago in this session and is unchanged (mtime 1778790566069). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-15T03:08:31.111Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  MS-DOCU-INGEST/U-DOCU-04 — Blueprint↔program join refresh cron (weekly cadence).
5	
6	.DESCRIPTION
7	  Rebuilds the blueprint↔program join index that powers prism_dev:program_for_print /
8	  print_for_program and prism_cam:cam_program_for_print / cam_print_for_program by
9	  invoking the canonical phase pipeline:
10	
11	    H:/Tools/python/python.exe scri
... [+2800 chars truncated]

### Assistant | 2026-05-15T03:09:11.563Z

The wrapper header (lines 1-60) contains both anchor strings: `blueprint-join-refresh` (line 4, 30, 45, 56, 60) and `U-DOCU-04` (line 4). Sanity probe will pass.

Let me verify one trigger-semantics edge case (req #5) since `-Weekly -DaysOfWeek Sunday -At '08:47'` without `-StartDate` defaults to "now" — if registered on a Sunday after 08:47, does it fire next Sunday or skip a cycle? This is well-documented Task Scheduler behavior: weekly triggers compute next occurrence from registration time, so it fires the following Sunday 08:47, which is correct.

---

## Verdict: PASS

No P0 or P1 findings. The installer is well-engineered and faithfully mirrors `install-cleanup-orchestrator-task.ps1` while adapting to the weekly cadence.

### Requirements coverage

| Req | Status | Evidence |
|---|---|---|
| 1. Modeled on cleanup-orchestrator installer | OK | Same elevation probe shape (lines 66-70), same `-Uninstall` branch (72-80), same existence-probe-before-Force pattern (137-148), same `-RunNow` polling idiom, same param surface |
| 2. Weekly Sunday 08:47 local | OK | Defaults at lines 13-14, trigger at 110-113 |
| 3. powershell.exe (PS 5.1) | OK | Line 104 `-Execute 'powershell.exe'`; comment at 98-102 explicitly forbids switching |
| 4. ExecutionTimeLimit ~30 min | OK | Line 129 `New-TimeSpan -Minutes 30` |
| 5. Task name 'PRISM Blueprint Join Refresh' | OK | Line 2 default |
| 6. Sanity probe header anchors | OK | Lines 93-96; both `blueprint-join-refresh` and `U-DOCU-04` appear in wrapper line 4 (well within `-TotalCount 60`) |

### Check-for items

1. **PS parser**: Re-validated by reading; clean. No ternary, no `??`, no `?.`, no `::new()`. The `if`-as-expression at lines 103, 132, 150 is PS 5.1 native. `Out-Null` cast at line 148 is canonical.
2. **Elevation probe (66-70)**: Identical pattern to cleanup-orchestrator. `IsInRole([WindowsBuiltinRole]::Administrator)` is the right call. `throw` short-circuits before any task ops.
3. **-Uninstall branch (72-80)**: `Get-
... [+3183 chars truncated]
