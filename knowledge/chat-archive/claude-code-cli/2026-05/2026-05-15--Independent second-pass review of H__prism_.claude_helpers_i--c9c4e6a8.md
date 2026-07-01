---
type: "chat-session"
source: "claude-code-cli"
session_id: "c9c4e6a8-22e3-4cd2-b834-feece577b10c"
title: "Independent second-pass review of H:/prism/.claude/helpers/install-blueprint-joi"
date: "2026-05-15"
first_ts: "2026-05-15T03:08:35.897Z"
last_ts: "2026-05-15T03:10:50.801Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-aa628643840eb0eb9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review of H:/prism/.claude/helpers/install-blueprint-joi

> **claude-code-cli** | 2026-05-15 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-aa628643840eb0eb9.jsonl`

## Transcript

### User | 2026-05-15T03:08:35.897Z

Independent second-pass review of H:/prism/.claude/helpers/install-blueprint-join-refresh-task.ps1.

You are reviewer ARM B for the per-file scrutiny gate. Code-analyzer is doing a primary correctness pass; weight your review on things they typically miss.

CONTEXT — Windows Scheduled Task installer for the weekly blueprint↔program join index rebuild. Models on H:/prism/.claude/helpers/install-cleanup-orchestrator-task.ps1. Targets H:/prism/scripts/system-health/33-blueprint-join-refresh.ps1 (shipped earlier this unit).

FOCUS AREAS (where ARM B typically catches what ARM A misses):

1. **Convention conformance vs the model file**:
   - Read H:/prism/.claude/helpers/install-cleanup-orchestrator-task.ps1 fully.
   - Diff the structure, param order, elevation probe wording, sanity-probe pattern, MultipleInstances setting, -RunNow polling style, sibling-task description listing.
   - Surface any drift that wasn't required by the different cadence (weekly vs 5-min).

2. **Integration vs already-built engines**:
   - Sibling installers: install-fleet-reaper-task.ps1, install-memory-pressure-task.ps1, install-cleanup-orchestrator-task.ps1.
   - Does this installer's task name clash with anything in those?
   - Does the wrapper-path string match the actual on-disk path?

3. **Cross-file consistency vs golf-cron-registry.json**:
   - The handoff specifies dual mechanism: this installer (Windows task) + a golf-cron-registry entry (in-session golf reminder). The two should not interfere.
   - Read H:/prism/state/shared/golf-cron-registry.json.
   - Does the description correctly explain the dual-mechanism relationship?

4. **Hidden coupling / silent breakage**:
   - If the wrapper at H:\PRISM\scripts\system-health\33-blueprint-join-refresh.ps1 is moved/renamed AFTER install, what happens? Is there any drift-detection?
   - If a previous version of the task exists with a different argument set, does `-Force` silently overwrite the action AND the trigger AND the settings, or ju
... [+1683 chars truncated]

### Assistant | 2026-05-15T03:08:42.084Z

I'll perform an independent second-pass review of the blueprint join refresh task installer. Let me read all the relevant files first.

### Assistant | 2026-05-15T03:08:42.552Z

[tool_use: Read]

### User | 2026-05-15T03:08:43.011Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-blueprint-join-refresh-task.ps1' was already read 21s ago in this session and is unchanged (mtime 1778814453428). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### Assistant | 2026-05-15T03:08:43.049Z

[tool_use: Read]

### User | 2026-05-15T03:08:43.512Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1' was already read 22m ago in this session and is unchanged (mtime 1778790566069). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-05-15T03:08:44.031Z

[tool_use: Read]

### Assistant | 2026-05-15T03:08:44.118Z

[tool_use: Read]

### User | 2026-05-15T03:08:44.922Z

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
... [+19579 chars truncated]

### User | 2026-05-15T03:08:45.030Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "generatedAt": "2026-05-14T15:08:45.000Z",
4	  "generator": "U-CLEANUP-E2 (manual populate; bootstrap-golf.mjs A6 seeded the empty shell)",
5	  "lockfileDir": ".cron-locks",
6	  "timeBasis": "UTC",
7	  "notes": "Five daily hygiene prompts the golf-slot chat schedules via CronCreate at session start. Times intentionally off the :00/:30 marks per fleet-friendly schedu
... [+3666 chars truncated]

### Assistant | 2026-05-15T03:08:48.427Z

Now I have the model installer, golf-cron-registry, and wrapper script content. Let me check sibling installer task names and verify the installer file I need to review.

### Assistant | 2026-05-15T03:08:49.120Z

[tool_use: Read]

### User | 2026-05-15T03:08:49.597Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-blueprint-join-refresh-task.ps1' was already read 28s ago in this session and is unchanged (mtime 1778814453428). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### Assistant | 2026-05-15T03:08:52.818Z

Let me search for the file content since the read-once guard says it's already in context but I don't actually have it visible. Let me try with offset 0.

### Assistant | 2026-05-15T03:08:53.420Z

[tool_use: Read]

### User | 2026-05-15T03:08:54.279Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Blueprint Join Refresh',
3	  # Weekly cadence -- runs every Sunday at the same local wall-clock time. Mirrors
4	  # the in-session golf-cron-registry entry `golf-blueprint-join-refresh`
5	  # (cronExpr '47 8 * * 0' = Sunday 08:47 UTC). We pick LOCAL 08:47 here for the
6	  # Windows trigger because Task Scheduler triggers are local-time by default and
7	  # t
... [+10699 chars truncated]

### Assistant | 2026-05-15T03:08:57.285Z

Now let me verify a few sibling installer task name patterns and check the model file content to do proper diff analysis.

### Assistant | 2026-05-15T03:08:58.805Z

[tool_use: Grep]

### Assistant | 2026-05-15T03:09:00.301Z

[tool_use: Grep]

### User | 2026-05-15T03:09:00.538Z

[tool_result] .claude\helpers\install-zombie-reaper-task.ps1:2:  [string]$TaskName = 'PRISM Zombie Reaper v2',
.claude\helpers\install-memory-pressure-task.ps1:2:  [string]$TaskName = 'PRISM Memory Pressure Auto-Relief',
.claude\helpers\install-source-monitor-task.ps1:2:  [string]$TaskName = 'PRISM Source Monitor Sweep',
.claude\helpers\install-node-cleaner-task.ps1:2:  [string]$TaskName = 'PRISM Node Orphan Cl
... [+411 chars truncated]

### User | 2026-05-15T03:09:00.908Z

[tool_result] 112:# ExecutionTimeLimit 3 min: a typical run is ~10s; the orchestrator already
115:# MultipleInstances IgnoreNew so a slow run never piles a second instance on
118:  -AllowStartIfOnBatteries `
120:  -StartWhenAvailable `
121:  -ExecutionTimeLimit (New-TimeSpan -Minutes 3) `
122:  -MultipleInstances IgnoreNew

### Assistant | 2026-05-15T03:09:01.677Z

[tool_use: Grep]

### User | 2026-05-15T03:09:02.707Z

[tool_result] 1:param(
15:  [int]$StartOffsetSeconds = 135,
16:  # Burn-in mode: bakes -DryRun into the task definition (machine-persistent).
19:  # state/shared/cleanup-orchestrator.log, then reinstall without -DryRun.
20:  [switch]$DryRun,
21:  [switch]$RunNow,
22:  [switch]$Uninstall
44:# -RunNow, -Uninstall, phase offset, sanity check). On hosts where the raw
58:# can be Disable-ScheduledTask'd to pause wit
... [+826 chars truncated]

### Assistant | 2026-05-15T03:09:06.814Z

Let me check a few more critical details to complete the review.

### Assistant | 2026-05-15T03:09:07.878Z

[tool_use: Read]

### User | 2026-05-15T03:09:08.727Z

[tool_result] 130	$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
131	if ($existing) {
132	  Write-Host "Replacing existing scheduled task '$TaskName' (state: $($existing.State)) — its previous trigger/action/limit will be overwritten."
133	}
134	
135	Register-ScheduledTask `
136	  -TaskName $TaskName `
137	  -Action $action `
138	  -Trigger $trigger `
139	  -Settings $settings `
... [+1285 chars truncated]

### Assistant | 2026-05-15T03:09:09.024Z

[tool_use: Grep]

### User | 2026-05-15T03:09:09.800Z

[tool_result] No matches found

### Assistant | 2026-05-15T03:10:50.801Z

Critical finding — the golf-cron-registry.json has NO entry for `golf-blueprint-join-refresh`, but the installer + wrapper both reference it as if it exists. This is the dual-mechanism integration the installer's docblock claims is in place. Now I have enough context for the full review.

---

# Review Verdict: FAIL

The installer is structurally sound and conforms well to the model file. However, there are P0 integration findings — most critically a missing golf-cron-registry entry that breaks the dual-mechanism contract the installer's own description advertises, and the `Get-Content -TotalCount` sanity probe will produce false-positive matches that silently weaken the anchor check.

---

## P0 Findings

### P0-1 — Dual-mechanism contract broken: golf-cron-registry entry does not exist

**Location:** `install-blueprint-join-refresh-task.ps1:35-43, 132` references `golf-blueprint-join-refresh` in `state/shared/golf-cron-registry.json` as a sibling registered entry. The wrapper `33-blueprint-join-refresh.ps1:64-67` makes the same claim in its `.NOTES`.

**Problem:** `state/shared/golf-cron-registry.json` currently contains ONLY 5 entries (`golf-stale-claim-sweep`, `golf-state-snapshot`, `golf-wiki-lint`, `golf-frontend-merge-nudge`, `golf-close-out-audit`) — verified by `Grep` returning "No matches found" for `blueprint-join-refresh|golf-blueprint`. The installer's `$desc` field (line 132) tells operators reading the task description that the golf in-session reminder exists. It does not. The TaskCreate list (task #3 "golf-cron-registry entry") confirms this entry is pending — yet File8b ships claiming it as a precondition.

**Fix:** Either (a) ship File8b AFTER File8c (registry entry must land first or in the same commit), or (b) reword the installer description + wrapper `.NOTES` + installer header comment to say "intended dual mechanism — registry entry pending File8c". Documenting a relationship that does not exist is exactly the [[feedback_no_silent_skip]] / R12
... [+14923 chars truncated]
