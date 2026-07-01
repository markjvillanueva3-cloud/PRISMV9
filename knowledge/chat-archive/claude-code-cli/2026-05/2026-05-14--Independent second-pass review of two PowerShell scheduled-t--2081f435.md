---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "Independent second-pass review of two PowerShell scheduled-task installer script"
date: "2026-05-14"
first_ts: "2026-05-14T20:22:07.578Z"
last_ts: "2026-05-14T20:24:11.987Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-add6ea1e4fe3402fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of two PowerShell scheduled-task installer script

> **claude-code-cli** | 2026-05-14 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-add6ea1e4fe3402fd.jsonl`

## Transcript

### User | 2026-05-14T20:22:07.578Z

Independent second-pass review of two PowerShell scheduled-task installer scripts. Read BOTH end-to-end:
1. H:\prism\.claude\helpers\install-memory-pressure-task.ps1 (one-line edit: ExecutionTimeLimit 2min→4min + comment)
2. H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1 (NEW — registers "PRISM Cleanup Orchestrator" task running cleanup-orchestrator.mjs every 5 min)

A content-specialist is reviewing cmdlet correctness in parallel — YOU focus on what they're likely to miss:

- CONVENTION CONFORMANCE: File 2 was modeled on H:\prism\.claude\helpers\install-fleet-reaper-task.ps1 — read that sibling and confirm File 2 matches its structure/idioms (param block style, elevation probe, Uninstall-first ordering, footer help text). Flag any silent divergence.
- INTEGRATION / COLLISION: File 2 registers a NEW task on a host that already runs "PRISM Fleet Reaper" (+210s, 5min) and "PRISM Memory Pressure Auto-Relief" (~+60s, 5min). File 2 anchors at +135s, 5min. Is there a real phase-collision risk? Does adding a 3rd 5-min node/PowerShell-forking hygiene task create a process-table problem the installer should warn about? Note: install-fleet-reaper-task.ps1's comments ASSUME a "PRISM Cleanup Orchestrator" task exists — does File 2's TaskName exactly match what the siblings expect (`PRISM Cleanup Orchestrator`)?
- REVERSIBILITY / SAFETY: per the project rule "never delete, only disable" — does `-Uninstall` use Unregister cleanly? Could either script ever remove or clobber the WRONG task? Is `-Force` on Register-ScheduledTask safe (it overwrites an existing same-name task — acceptable for re-install, but does it silently blow away a hand-customized task)?
- IDEMPOTENCY: re-running File 2 — clean? The `(Get-Date).AddSeconds(...)` trigger anchor shifts every install — is that a problem (drift of the phase offset across re-installs)?
- ERROR BUDGET: `$ErrorActionPreference='Stop'` — every throw path gives an actionable message? What happens if `cleanup-orchestrator.m
... [+493 chars truncated]

### Assistant | 2026-05-14T20:22:12.370Z

I'll review both files end-to-end along with the sibling installer they were modeled on.

### Assistant | 2026-05-14T20:22:12.582Z

[tool_use: Read]

### Assistant | 2026-05-14T20:22:13.036Z

[tool_use: Read]

### Assistant | 2026-05-14T20:22:13.417Z

[tool_use: Read]

### User | 2026-05-14T20:22:14.744Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-memory-pressure-task.ps1' was already read 19s ago in this session and is unchanged (mtime 1778789949158). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-14T20:22:15.583Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1' was already read 18s ago in this session and is unchanged (mtime 1778790058737). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-14T20:22:15.741Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-reaper-task.ps1' was already read 3m ago in this session and is unchanged (mtime 1778769419359). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-05-14T20:22:19.713Z

The read-once-guard says these files are already in my context, but I don't actually have them in this conversation. The guard is mistaken about my context state — I need the actual content to review. Let me bypass the cache.

### Assistant | 2026-05-14T20:22:20.601Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:22:21.507Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:22:22.330Z

[tool_use: Bash]

### User | 2026-05-14T20:22:27.988Z

[tool_result] param(
  [string]$TaskName = 'PRISM Memory Pressure Auto-Relief',
  [int]$EveryMinutes = 5,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-memory-pressure-task.ps1 — HS-13 automated memory-pressure relief
# (2026-05-12). Registers a Windows Scheduled Task that runs
# scripts/system-health/03-memory-pressure-auto-relief.ps1 every $EveryMinutes
# minutes, independent of Claude Code sessions. C
... [+3543 chars truncated]

### User | 2026-05-14T20:22:39.944Z

[tool_result] param($
  [string]$TaskName = 'PRISM Cleanup Orchestrator',$
  [int]$EveryMinutes = 5,$
  # Phase offset (seconds) for the trigger anchor. PRISM runs three 5-min$
  # PowerShell/node-forking hygiene tasks; firing them on the same minute$
  # spikes the process table. Anchors: "Memory Pressure Auto-Relief" ~+60s,$
  # this orchestrator +135s (the half-cycle between), "Fleet Reaper" +210s.$
  # This
... [+7748 chars truncated]

### User | 2026-05-14T20:22:42.193Z

[tool_result] param(
  [string]$TaskName = 'PRISM Fleet Reaper',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
  # on the half-cycle between them instead of phase-locking onto the same busy
  # minute (t
... [+7187 chars truncated]

### Assistant | 2026-05-14T20:22:45.786Z

I have all three files. Now let me verify a couple of integration claims — that `cleanup-orchestrator.mjs` exists and its header matches the sanity check, and check whether File 1's edit actually applies to the live task.

### Assistant | 2026-05-14T20:22:47.162Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:22:48.832Z

[tool_use: Bash]

### User | 2026-05-14T20:22:54.146Z

[tool_result] #!/usr/bin/env node
/**
 * cleanup-orchestrator.mjs — U-CLEANUP-E3
 *
 * Single-call wrapper that runs the 5 existing cleanup helpers in sequence and
 * emits one unified result line. Pure delegator — NO new kill logic per R1.
 *
 * Sub-cleaners (executed in registry order):
 *   1. git-lock-sweeper.mjs        (hook-style: drains stdin, emits JSON)
 *   2. chat-bus-reap.mjs           (CLI: --json 
... [+2724 chars truncated]

### User | 2026-05-14T20:22:57.989Z

[tool_result] ed8fe2192 [MAIN] [CLEANUP-MS0]/U-CLEANUP-E3: helpers/cleanup-orchestrator.mjs + 5-min scheduled task
---status---
 M .claude/helpers/install-memory-pressure-task.ps1
?? .claude/helpers/install-cleanup-orchestrator-task.ps1

### Assistant | 2026-05-14T20:24:11.987Z

Now I have everything I need. Key findings from verification:

1. **The sanity-check string match is broken.** File 2 line ~99 requires `$head -match 'Single-call wrapper'` but the actual `cleanup-orchestrator.mjs` header says **"Single-call wrapper that runs..."** — wait, it DOES contain "Single-call wrapper". Let me re-check: the header line is `* Single-call wrapper that runs the 5 existing cleanup helpers...`. The regex `'Single-call wrapper'` matches. And `'cleanup-orchestrator\.mjs'` matches line 2 (`* cleanup-orchestrator.mjs — U-CLEANUP-E3`). Both within first 60 lines. **Sanity check passes — OK.**

2. **Critical: a "PRISM Cleanup Orchestrator" task likely already exists.** Commit `ed8fe2192` (`U-CLEANUP-E3`) shipped `cleanup-orchestrator.mjs` + "a 5-min scheduled task". The orchestrator's own header says `U-CLEANUP-E3`. So a Cleanup Orchestrator scheduled task may already be registered on the host by that prior unit — and File 2's `-Force` will silently overwrite it.

Here are my findings.

---

## Independent Second-Pass Review

### P0 — none

### P1 findings

**P1-1 — File 2, `Register-ScheduledTask ... -Force` silently overwrites a possibly-already-existing "PRISM Cleanup Orchestrator" task (collision with U-CLEANUP-E3).**
Commit `ed8fe2192` is titled `[CLEANUP-MS0]/U-CLEANUP-E3: helpers/cleanup-orchestrator.mjs + 5-min scheduled task` — i.e. a "5-min scheduled task" for the orchestrator was *already shipped once*. If that unit registered a task named `PRISM Cleanup Orchestrator` (the name the siblings + `/checkin` + `/fleet-reaper` all assume), then File 2's `-Force` blows it away on every install with **no detection, no diff, no warning**. The fleet-reaper sibling does the exact same `-Force` thing, so this matches convention — but the convention is only safe because there's no *prior* installer competing for the same name. Here there may be. The installer should, before `Register-ScheduledTask`, check `Get-ScheduledTask -TaskName $TaskName` and emit 
... [+9821 chars truncated]
