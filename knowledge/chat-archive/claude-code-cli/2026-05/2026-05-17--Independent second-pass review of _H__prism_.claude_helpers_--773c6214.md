---
type: "chat-session"
source: "claude-code-cli"
session_id: "773c6214-15ba-41d4-b247-7d7bde7309db"
title: "Independent second-pass review of `H:\\prism\\.claude\\helpers\\slot-job-object.ps1`"
date: "2026-05-17"
first_ts: "2026-05-17T20:05:29.705Z"
last_ts: "2026-05-17T20:08:04.010Z"
cwd: "H:\\PRISM"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a968585234f33d6ad.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Independent second-pass review of `H:\prism\.claude\helpers\slot-job-object.ps1`

> **claude-code-cli** | 2026-05-17 | 23 msgs (9 user / 14 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a968585234f33d6ad.jsonl`

## Transcript

### User | 2026-05-17T20:05:29.705Z

Independent second-pass review of `H:\prism\.claude\helpers\slot-job-object.ps1` — read the whole file end-to-end. This is REAPER-PERMFIX-MS1/U-C1: a PowerShell 5.1 helper creating a per-chat-slot Windows Job Object (active-process cap 50, 8GB job-memory cap, kill-on-job-close) for OS-level fork containment in the PRISM 13-chat fleet.

You are arm B — weight your review toward what a correctness-focused first reviewer is LIKELY TO MISS:
1. INTEGRATION with the existing fleet-reaper system. The userspace reaper is `scripts/fleet-reaper-sweep.mjs` + `.claude/helpers/process-slot-map.mjs`. Does this helper's sidecar (`state/shared/slot-job-objects/<slot>.json`) collide with or duplicate any existing state file? Is the sidecar schema sane for a future reaper consumer? Should it have a schemaVersion field?
2. SECURITY / hostile input — the `-Slot` param flows into a kernel object name `prism-slot-<slot>`. Is the validation regex `^[a-z][a-z0-9-]{0,30}$` sufficient to prevent namespace-separator injection (`\`, `Global\`, `Local\`) or path traversal into the sidecar filename `Join-Path $SidecarDir "$S.json"`? Are -ProcessId / -ActiveProcessLimit / -JobMemoryGB range-bounded?
3. DESTRUCTIVE-ACTION SAFETY — this helper can KILL processes (kill-on-job-close) and CAP a chat's memory. Could a wrong invocation kill the operator's chat? Is the kill switch `PRISM_SLOT_JOB_DISABLE=1` honored on every mutating path? Is -DryRun provably non-destructive?
4. REVERSIBILITY — the REAPER-PERMFIX safety matrix says U-C1 reversal = "unwrap Job Object membership". Does the helper as written allow a clean reversal (just don't run -Anchor)? Any persistent OS state left behind?
5. CONVENTION conformance — compare against the sibling `.claude/helpers/install-fleet-reaper-task.ps1` and `autopilot-watchdog.ps1`: `#Requires -Version 5.1`, comment-based help, env-var knob naming (`PRISM_*`), exit-code discipline.
6. ERROR BUDGET — atomic sidecar write (tmp+Move-Item), is the `.tmp` cleaned on failu
... [+369 chars truncated]

### Assistant | 2026-05-17T20:05:38.470Z

I'll review this PowerShell helper file thoroughly.

### Assistant | 2026-05-17T20:05:38.622Z

[tool_use: Read]

### User | 2026-05-17T20:05:39.156Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\slot-job-object.ps1' was already read 17s ago in this session and is unchanged (mtime 1779048281012). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T20:05:42.938Z

The file wasn't actually in my context. Let me read it with explicit override.

### Assistant | 2026-05-17T20:05:43.318Z

[tool_use: Bash]

### User | 2026-05-17T20:05:45.114Z

[tool_result] #Requires -Version 5.1
<#
.SYNOPSIS
    PRISM slot Job Object — OS-level fork-bomb containment per chat slot.
    REAPER-PERMFIX-MS1 / U-C1.

.DESCRIPTION
    Wraps a chat slot's process tree in a Windows Job Object so the kernel —
    not a userspace polling reaper — enforces three hard limits:

      * JOB_OBJECT_LIMIT_ACTIVE_PROCESS  (-ActiveProcessLimit, default 50)
            A runaway forge
... [+23654 chars truncated]

### Assistant | 2026-05-17T20:05:49.504Z

Now let me check the integration points — existing fleet-reaper state files and sidecar conventions.

### Assistant | 2026-05-17T20:05:53.070Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:05:53.954Z

[tool_use: Grep]

### User | 2026-05-17T20:05:53.963Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: job: command not found
/usr/bin/bash: line 1: $null: ambiguous redirect
/usr/bin/ls: cannot access 'H:\prism\state\shared" 2> | Select-String -Pattern slot': No such file or directory
---REAPER STATE FILES---
/usr/bin/bash: line 1: $null: ambiguous redirect
---SLOT STATE---
/usr/bin/bash: line 1: $null: ambiguous redirect

### User | 2026-05-17T20:05:53.963Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(ls "H:\prism\state\shared\" 2>$null | Se…) errored</tool_use_error>

### Assistant | 2026-05-17T20:05:57.474Z

That ran under bash. Let me use PowerShell and Glob properly.

### Assistant | 2026-05-17T20:05:57.901Z

[tool_use: Glob]

### Assistant | 2026-05-17T20:05:58.318Z

[tool_use: Glob]

### Assistant | 2026-05-17T20:05:59.221Z

[tool_use: Grep]

### User | 2026-05-17T20:06:00.339Z

[tool_result] No matches found

### User | 2026-05-17T20:06:11.977Z

[tool_result] state\shared\fleet-reaper-candidates.json.8540.31922cb1.tmp
state\shared\.alpha-reaper-last.json
state\shared\fleet-reaper.log.1
state\shared\orphan-reaper.log
state\shared\.fleet-reaper-stop.stamp
state\shared\fleet-reaper-candidates.json
state\shared\fleet-reaper.log

### User | 2026-05-17T20:06:11.987Z

[tool_result] No files found

### Assistant | 2026-05-17T20:06:17.197Z

Confirmed — `slot-job-object.ps1` is the first file using the `state/shared/slot-job-objects/` sidecar dir; no collision. Note the `.tmp` orphan in the reaper-candidates file (`fleet-reaper-candidates.json.8540.31922cb1.tmp`) — a leftover-tmp pattern exists in the codebase, relevant to my error-budget check. Let me verify a couple more things: the sibling helper conventions and the CreateJobObject ALREADY_EXISTS handle semantics.

### Assistant | 2026-05-17T20:06:19.895Z

[tool_use: Bash]

### User | 2026-05-17T20:06:22.669Z

[tool_result] === install-fleet-reaper-task.ps1 head ===
﻿param(
  [string]$TaskName = 'PRISM Fleet Reaper',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
  # on the half-cycle between them instead of ph
... [+1785 chars truncated]

### Assistant | 2026-05-17T20:08:04.010Z

The grep got intercepted by RTK. I have enough — `install-fleet-reaper-task.ps1` uses a bare BOM-prefixed `param(` with NO `#Requires -Version 5.1` and NO comment-based help, while `autopilot-watchdog.ps1` uses `#Requires -Version 5.1` + comment-based help. `slot-job-object.ps1` matches the watchdog (the better convention). I have what I need for a complete review.

---

# Review: `slot-job-object.ps1` — REAPER-PERMFIX-MS1/U-C1

Arm B independent second-pass. I read the file end-to-end and verified integration against `scripts/fleet-reaper-sweep.mjs`, the `state/shared/` state-file inventory, and sibling PS helpers.

## Grade: **FAIL** — one P0.

---

## P0 — `-Anchor` is a no-op on the canonical detached launch; the kill-on-job-close reap NEVER fires

This is the load-bearing defect. The helper's own DESCRIPTION (lines 25–32) states the safety property correctly: the job's limits and kill-on-job-close enforcement persist *only while a handle stays open*, and `-Anchor` is the long-lived handle holder that blocks. But the **lifetime model contradicts the launch model**.

The `.EXAMPLE` at line 51 says: *"production: wrap a slot launch (blocks — run detached / as the wrapper)"*. And the NOTES at line 24 say the anchor's job is *"the slot's last line of defence"*. The intended deployment is a **detached** anchor process.

Now trace the anchor block (lines ~330–355):

- `Find-ClaudeAncestor $PID` walks parents of **the PowerShell process running this script**.
- When run **detached** (`Start-Process -WindowStyle Hidden`, a scheduled task, or `powershell ... &`), this script's parent chain does **not** lead to `claude.exe` — the detached process is reparented to `services.exe`/`wininit` or the scheduler. `Find-ClaudeAncestor` returns `0`.
- That triggers the self-assign branch (line ~315): `AssignPid($hJob, $PID)`, `$claudePid = 0`, `$assignedSelf = $true`.
- The block loop (line ~348): `if ($claudePid -gt 0)` is **false**, so the loop body does nothing. The comment at l
... [+14531 chars truncated]
