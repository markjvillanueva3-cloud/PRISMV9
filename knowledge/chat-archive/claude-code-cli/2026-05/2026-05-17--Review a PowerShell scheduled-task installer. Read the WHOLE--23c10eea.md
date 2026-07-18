---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Review a PowerShell scheduled-task installer. Read the WHOLE file end-to-end: `H"
date: "2026-05-17"
first_ts: "2026-05-17T19:48:14.523Z"
last_ts: "2026-05-17T19:48:46.249Z"
cwd: "H:\\PRISM"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ac6febe608a33731b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a PowerShell scheduled-task installer. Read the WHOLE file end-to-end: `H

> **claude-code-cli** | 2026-05-17 | 7 msgs (3 user / 4 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ac6febe608a33731b.jsonl`

## Transcript

### User | 2026-05-17T19:48:14.523Z

Review a PowerShell scheduled-task installer. Read the WHOLE file end-to-end: `H:/prism/.claude/helpers/install-nn-graph-retrain-task.ps1` (~210 lines). It parses clean (verified via Parser::ParseFile, 0 errors).

WHAT IT IS: the durable installer for NN-GRAPH-MS2 U2 — registers a Windows Scheduled Task that runs `H:/PRISM/scripts/nn-graph-retrain-lifecycle.mjs` every 6 hours to autonomously retrain a GraphSAGE GNN checkpoint. It is a deliberate near-mirror of the already-shipped, already-reviewed `H:/prism/.claude/helpers/install-fleet-reaper-task.ps1` — READ THAT FILE TOO and diff the two: the installer should match its proven structure (elevation check, node-exe resolution, -Uninstall branch, script sanity-check, two triggers poll+AtStartup, S4U/SYSTEM/Interactive principal, splatted Register-ScheduledTask, -RunNow poll loop, reversibility). Any DIVERGENCE from the fleet-reaper installer is either an intentional tuning for this heavier task or a bug — classify each.

The intentional differences (verify they are correct, not bugs):
- Cadence is `-EveryHours 6` (hours), not `-EveryMinutes` — a retrain is multi-minute, drift-gated so most polls are no-ops.
- `ExecutionTimeLimit` 30 min (vs 2 min) — training takes minutes.
- `RestartInterval` 5 min (vs 1 min).
- Node is launched with `--max-old-space-size=8192` as the FIRST argument before the script path (the lifecycle loads a ~150MB graph) — verify this arg ordering is correct for `New-ScheduledTaskAction -Execute $nodeExe -Argument`.
- Phase offset +450s (vs +210s) to clear the host's 5-min tasks.
- Sanity-check greps the script head for `NN-GRAPH-MS2` and `--status` (vs `slot-aware orphan` / `--once`).

CHECK FOR REAL BUGS:
- `$lifecycleArgs` string construction with backtick-escaped quotes `` `"$lifecycleScript`" `` inside a double-quoted string — correct PowerShell? Will the task receive `--max-old-space-size=8192 "C:\path\script.mjs"` (and `--dry-run` when -DryRun) as intended, with the script path quoted (it 
... [+746 chars truncated]

### Assistant | 2026-05-17T19:48:24.627Z

I'll read both files end-to-end and diff them.

### Assistant | 2026-05-17T19:48:25.058Z

[tool_use: Read]

### Assistant | 2026-05-17T19:48:25.272Z

[tool_use: Read]

### User | 2026-05-17T19:48:26.116Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM NN-Graph Retrain',
3	  # Cadence in HOURS — this is a heavy task (a retrain is a multi-minute
4	  # GraphSAGE training run), unlike the 5-minute fleet-reaper sweep. The
5	  # lifecycle's own drift gate makes most polls a sub-second no-op, so a
6	  # 6-hour cadence catches graph drift quickly while almost never paying the
7	  # full retrain cost. Override wit
... [+11302 chars truncated]

### User | 2026-05-17T19:48:26.360Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
5	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
6	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
7	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+10750 chars truncated]

### Assistant | 2026-05-17T19:48:46.249Z

Both files read end-to-end and diffed. The NN-graph installer is a faithful, correct mirror of the proven fleet-reaper installer.

## Diff classification

**Intentional tunings — all verified correct:**
- `-EveryHours 6` (L8) vs `-EveryMinutes 5` — `RepetitionInterval (New-TimeSpan -Hours $EveryHours)` (L118) is correct; `New-TimeSpan -Hours` is valid.
- `ExecutionTimeLimit 30 min` (L133) — correct for multi-minute training.
- `RestartInterval 5 min` (L135) — correct, proportional to the heavier cadence.
- `--max-old-space-size=8192` as first arg (L103-108) — **correct ordering.** `New-ScheduledTaskAction -Execute $nodeExe -Argument "<heap> <script> [--dry-run]"` produces `node --max-old-space-size=8192 "C:\...\script.mjs" --dry-run`. Node V8 flags must precede the script path; this is right. The fleet-reaper installer passes only script+flags, so the divergence is genuinely required here, not a bug.
- Phase offset +450s (L13) — correct; clears the +60/+120/+210/+330 task cluster.
- Sanity grep `NN-GRAPH-MS2` + `--status` (L95) vs `slot-aware orphan` + `--once` — correct adaptation.

**Bug checks — all clean:**
- `$lifecycleArgs` (L104-108): backtick-escaped `` `"$lifecycleScript`" `` inside a double-quoted string is correct PowerShell. `$nodeHeap` interpolates, `` `" `` emits literal quotes around the (interpolated) path. Result string: `--max-old-space-size=8192 "H:\PRISM\scripts\nn-graph-retrain-lifecycle.mjs" --dry-run`. Quoting is harmless today and safe if the path ever gained spaces.
- `$desc` (L156): `$(if ($DryRun) { ' --dry-run [BURN-IN]' })` subexpression interpolation is valid — emits the string when `-DryRun`, `$null`→empty otherwise.
- `-Principal` splat-omission (L145, L160-168): correct. `$principal` stays `$null` under `-Interactive`; the `if ($principal)` guard omits the key entirely rather than passing `-Principal $null` (which throws). Matches the proven installer exactly.
- `-RunNow` poll loop (L181-196): correct. 20-min deadline, 10s sleep, `26
... [+1080 chars truncated]
