---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "Review two PowerShell scheduled-task installer scripts end-to-end. Read BOTH fil"
date: "2026-05-14"
first_ts: "2026-05-14T20:21:50.583Z"
last_ts: "2026-05-14T20:23:10.669Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a7fc30deebba7db78.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review two PowerShell scheduled-task installer scripts end-to-end. Read BOTH fil

> **claude-code-cli** | 2026-05-14 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a7fc30deebba7db78.jsonl`

## Transcript

### User | 2026-05-14T20:21:50.583Z

Review two PowerShell scheduled-task installer scripts end-to-end. Read BOTH files fully:
1. H:\prism\.claude\helpers\install-memory-pressure-task.ps1 (EDITED — one change)
2. H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1 (NEW FILE)

CONTEXT:
- File 1 EDIT: bumped `-ExecutionTimeLimit` from `(New-TimeSpan -Minutes 2)` to `(New-TimeSpan -Minutes 4)` plus an explanatory comment. Rationale: the relief script it registers (03-memory-pressure-auto-relief.ps1) now self-bounds every run to ~100s; the 2-min task limit was too tight and the scheduler was SIGKILL'ing runs (LastTaskResult=267014). 4 min is now a backstop, not the primary bound. Verify ONLY this change is sound and nothing else in the file regressed.
- File 2 NEW: registers a "PRISM Cleanup Orchestrator" Windows scheduled task that runs `.claude/helpers/cleanup-orchestrator.mjs` every 5 min. It was modeled on the canonical sibling `H:\prism\.claude\helpers\install-fleet-reaper-task.ps1` (read that too for the pattern). The /checkin and /fleet-reaper skills + the fleet-reaper installer's own comments all reference this task as part of the intended fleet-hygiene design, but no installer existed — this closes that gap.

VERIFY File 2:
- Param defaults sane? `StartOffsetSeconds=135` is meant to land between Memory-Relief (~+60s) and Fleet-Reaper (+210s) on the 300s cycle — is that math right and is the phase-offset reasoning sound?
- Elevation probe, `-Uninstall` path, `Test-Path` guard, the head-sanity-check regex (`cleanup-orchestrator\.mjs` + `Single-call wrapper`) — correct? Will the sanity regex actually match cleanup-orchestrator.mjs's real header? (Read H:\prism\.claude\helpers\cleanup-orchestrator.mjs lines 1-60 to confirm.)
- node.exe resolution, `New-ScheduledTaskAction`/`Trigger`/`Settings`/`Register-ScheduledTask` calls — correct cmdlet usage, correct arg quoting (`$orchArgs` with the `\`"...\`"` escaping)?
- `-RunNow` poll loop: correct handling of LastTaskResult 267009 (running)? Does
... [+473 chars truncated]

### Assistant | 2026-05-14T20:21:54.201Z

I'll review both PowerShell installer scripts plus the canonical sibling and the orchestrator script header.

### Assistant | 2026-05-14T20:21:55.093Z

[tool_use: Read]

### Assistant | 2026-05-14T20:21:55.547Z

[tool_use: Read]

### Assistant | 2026-05-14T20:21:55.993Z

[tool_use: Read]

### Assistant | 2026-05-14T20:21:56.364Z

[tool_use: Read]

### User | 2026-05-14T20:21:58.458Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-reaper-task.ps1' was already read 2m ago in this session and is unchanged (mtime 1778769419359). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-05-14T20:22:00.631Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Cleanup Orchestrator',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM runs three 5-min
5	  # PowerShell/node-forking hygiene tasks; firing them on the same minute
6	  # spikes the process table. Anchors: "Memory Pressure Auto-Relief" ~+60s,
7	  # this orchestrator +135s (the half-cycle between), "Fleet Reaper" +210s.
8
... [+7952 chars truncated]

### User | 2026-05-14T20:22:01.210Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cleanup-orchestrator.mjs — U-CLEANUP-E3
4	 *
5	 * Single-call wrapper that runs the 5 existing cleanup helpers in sequence and
6	 * emits one unified result line. Pure delegator — NO new kill logic per R1.
7	 *
8	 * Sub-cleaners (executed in registry order):
9	 *   1. git-lock-sweeper.mjs        (hook-style: drains stdin, emits JSON)
10	 *   2. chat-bus-reap.mjs   
... [+2895 chars truncated]

### User | 2026-05-14T20:22:01.878Z

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
... [+3799 chars truncated]

### Assistant | 2026-05-14T20:22:06.416Z

The fleet-reaper installer is already in my context. Let me verify a few specifics: the orchestrator's actual argument parsing (to confirm `--dry-run` is accepted and exit codes match), and the fleet-reaper installer's exact pattern for comparison.

### Assistant | 2026-05-14T20:22:08.167Z

[tool_use: Grep]

### User | 2026-05-14T20:22:09.928Z

[tool_result] 10: *   2. chat-bus-reap.mjs           (CLI: --json [--dry-run])
12: *   4. node-orphan-cleaner.mjs     (CLI: --reason=... [--dry-run] [--force])
25: *   - Aggregates into one operator-readable line (or JSON with --json).
36: * `--force-throttled` to bypass (operator opt-in, never default).
40: *   node cleanup-orchestrator.mjs --dry-run      # forward dry-run where supported
41: *   node cleanup-
... [+3091 chars truncated]

### Assistant | 2026-05-14T20:22:10.850Z

[tool_use: Grep]

### User | 2026-05-14T20:22:13.863Z

[tool_result] 9:  [int]$StartOffsetSeconds = 210,
14:  [switch]$RunNow,
45:$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
47:if (-not $isAdmin) {
56:$nodeExe = $null
58:  if (Test-Path $cand) { $nodeExe = $cand; break }
60:if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }
72:if (-not (Test-Path $sweepScript)) {
77:$head 
... [+1055 chars truncated]

### Assistant | 2026-05-14T20:22:18.317Z

Both files reviewed end-to-end. Let me verify the one remaining detail: the orchestrator's argument loop handling of unknown flags (line ~159+ region) and the dry-run forwarding to confirm File 2's `--dry-run` claim and the `[DryRun]` skip behavior.

### Assistant | 2026-05-14T20:22:19.277Z

[tool_use: Read]

### User | 2026-05-14T20:22:24.500Z

[tool_result] 143	function parseArgs(argv) {
144	  const args = {
145	    dryRun: false,
146	    json: false,
147	    verbose: false,
148	    forceThrottled: false,
149	    skip: new Set(),
150	    help: false,
151	  };
152	  const errors = [];
153	  for (const raw of argv) {
154	    if (raw === "--dry-run") args.dryRun = true;
155	    else if (raw === "--json") args.json = true;
156	    else if (raw === "--ver
... [+1335 chars truncated]

### Assistant | 2026-05-14T20:23:10.669Z

I have everything needed. Both files reviewed end-to-end, plus the orchestrator header/argparser and the canonical fleet-reaper sibling.

## Code Quality Analysis Report

### Summary
- Files Analyzed: 2 (+ 2 reference files)
- Overall Quality: high — both scripts are well-commented, follow the canonical sibling pattern, and the verified behaviors all check out
- Issues Found: 0 P0, 0 P1, 2 P2

---

### File 1 — `install-memory-pressure-task.ps1` (the EDIT)

The edit is **sound and isolated**. The change is exactly two things:
- Line 64: `-ExecutionTimeLimit (New-TimeSpan -Minutes 4)` (was `-Minutes 2`)
- Lines 50-59: a 10-line explanatory comment replacing whatever short comment was there before

Verification:
- The rationale holds: relief script self-bounds to ~100s (`$MaxRuntimeSec` default 100), so a 4-min scheduler limit is a true backstop, not the primary bound. The 2-min limit *was* dangerously close to the script's own 100s budget once you add WMI/taskkill latency under fork-storm load — `LastTaskResult=267014` (`SCHED_S_TASK_TERMINATED` / `0x41306`) is exactly the scheduler-SIGKILL signature, so the diagnosis is correct.
- The comment correctly warns that an already-registered task keeps its old limit until re-registered (line 58) — accurate and operationally important.
- Nothing else regressed: `$reliefScript` path, `-Uninstall` block, `Test-Path` guard, trigger, `Register-ScheduledTask`, `-RunNow` block, and the trailing help text are all unchanged and correct. The `%%` in the `-Description` (line 72) is pre-existing and harmless (it's a literal string passed to `Register-ScheduledTask`, not a format string).

File 1: **clean.**

---

### File 2 — `install-cleanup-orchestrator-task.ps1` (NEW)

**Param defaults / phase-offset math (lines 1-17):** Correct. On the 300s cycle: Memory-Relief ~+60s, this orchestrator +135s, Fleet-Reaper +210s. Gaps are 75s / 75s / (210→360≡60, i.e. 150s wrap to next Memory-Relief). The comment's claim of "~75s apart" is accurate
... [+5579 chars truncated]
