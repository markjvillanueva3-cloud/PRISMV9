---
type: "chat-session"
source: "claude-code-cli"
session_id: "a614edfb-8bcb-461d-bac1-a5df0acd7b73"
title: "Independent second-pass review of a PRISM fleet-hygiene change: wiring a watchdo"
date: "2026-05-19"
first_ts: "2026-05-19T16:31:01.139Z"
last_ts: "2026-05-19T16:32:34.207Z"
cwd: "H:\\PRISM"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-a9f80eab585b98e5f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Independent second-pass review of a PRISM fleet-hygiene change: wiring a watchdo

> **claude-code-cli** | 2026-05-19 | 12 msgs (5 user / 7 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-a9f80eab585b98e5f.jsonl`

## Transcript

### User | 2026-05-19T16:31:01.139Z

Independent second-pass review of a PRISM fleet-hygiene change: wiring a watchdog-stack orchestrator into the `/fleet-reaper` slash command.

Read these two files end-to-end:
- H:\prism-slot-hotel\.claude\helpers\ensure-all-watchdogs.ps1 — a PowerShell orchestrator that iterates a 10-watchdog table and installs/enables missing Windows scheduled tasks. This session a bug was fixed: `Install-Watchdog` no longer trusts `$LASTEXITCODE` (unreliable through nested `& powershell 2>&1`); it now verifies success via a post-install `Get-ScheduledTask` probe.
- H:\prism-slot-hotel\.claude\commands\fleet-reaper.md — the `/fleet-reaper` skill doc; a new "Step 0 — Ensure the full watchdog stack" was added before the sweep step.

Weight your review toward what a first reviewer is likely to MISS:
1. **Integration coupling** — the .ps1 hardcodes `$helpersDir = 'H:\PRISM\.claude\helpers'`. The skill doc tells the operator to invoke the H:/prism runtime copy. But the file being reviewed lives in a slot worktree (H:/prism-slot-hotel). Is there a path-divergence trap where the orchestrator run from the slot worktree resolves installers in the main tree? Is that intended or a bug?
2. **Idempotency / re-run safety** — `/fleet-reaper` is doctrinally always-on and re-run constantly. Does Step 0 running on every invocation create churn (re-install? duplicate?) or is it cleanly idempotent (Ready→noop)?
3. **Elevation honesty** — the orchestrator throws on a non-admin shell unless `-WhatIf`. The skill doc claims Step 0 is "elevation-aware: if the running shell is not elevated it falls back to -WhatIf". VERIFY against the actual .ps1 code — is this TRUE? If the .ps1 throws instead of falling back, the doc is an R12 fail-loud violation (lying about behavior). Flag it hard.
4. **Verdict-block consistency** — does the new `watchdogs:` verdict line have a documented failure path? Does `failed > 0` degrade the verdict correctly?
5. **Naming / convention conformance** with the rest of the skill doc.

... [+63 chars truncated]

### Assistant | 2026-05-19T16:31:15.380Z

I'll review both files end-to-end.

### Assistant | 2026-05-19T16:31:15.383Z

[tool_use: Read]

### Assistant | 2026-05-19T16:31:16.821Z

[tool_use: Read]

### User | 2026-05-19T16:31:23.823Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\.claude\helpers\ensure-all-watchdogs.ps1' was already read 15s ago in this session and is unchanged (mtime 1779206283187). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-05-19T16:31:24.824Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\.claude\commands\fleet-reaper.md' was already read 14s ago in this session and is unchanged (mtime 1779208144865). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-05-19T16:31:28.901Z

The read-once guard says both files are already in my context, but I don't actually have their content from this conversation turn. Let me bypass the cache to perform the review.

### Assistant | 2026-05-19T16:31:29.846Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:31:31.278Z

[tool_use: Bash]

### User | 2026-05-19T16:32:05.247Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
---
name: fleet-reaper
description: Launch the slot-aware orphan-process reaper + RAM/CPU/GPU coordinator for the 7-chat fleet. Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's proce
... [+22618 chars truncated]

### User | 2026-05-19T16:32:11.764Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
param(
  [switch]$WhatIf,       # report only — never install/enable
  [switch]$Force,        # re-register every watchdog even if already Ready
  [switch]$Quiet,        # suppress per-task lines, print summary only
  [string[]]$Only = @(), # narrow to a specific watchdog (by task name)
  [string[]]$Skip = @()  # exclude s
... [+8245 chars truncated]

### Assistant | 2026-05-19T16:32:34.207Z

Both files read. Here is my independent second-pass review.

## Findings

### P0 — Elevation honesty: the doc lies about behavior (R12 violation)

**The skill doc claims (Step 0):** *"The orchestrator is **elevation-aware**: if the running shell is not elevated it falls back to `-WhatIf` (report-only)..."*

**The .ps1 actually does (lines ~30-34):**
```powershell
if (-not $isAdmin -and -not $WhatIf) {
  throw "Run from an ELEVATED PowerShell — ... -WhatIf works without elevation."
}
```

There is **no fallback**. A non-elevated shell that runs the documented Step 0 command (`...ensure-all-watchdogs.ps1` with no flags) **throws and aborts** — it does not silently downgrade to `-WhatIf`. The operator must *manually* pass `-WhatIf`. The doc describes a graceful auto-fallback that does not exist in the code. This is exactly the R12 fail-loud violation flagged in the brief — fix one side: either (a) make the .ps1 actually self-downgrade (`if (-not $isAdmin) { $WhatIf = $true; Write-Warning ... }`), or (b) rewrite the doc to say "throws on a non-elevated shell; pass `-WhatIf` for report-only." Given PRISM doctrine prefers fail-loud, (b) is the smaller honest fix, but the doc's whole "elevation-aware fallback" framing must go.

### P1 — Path-divergence trap: slot worktree → main-tree installers

`$helpersDir = 'H:\PRISM\.claude\helpers'` is hardcoded. The skill doc's Step 0 command also points at `H:/prism/.claude/helpers/ensure-all-watchdogs.ps1` (main tree). This is **internally consistent and not a bug** — both the orchestrator and the installers it calls resolve to the main tree, and the scheduled tasks register host-global runtime paths. The slot worktree (`H:/prism-slot-hotel`) is only the *edit/commit* surface. **However:** if an operator runs the slot-worktree copy directly, the orchestrator still resolves installers from the main tree — a silent cross-tree jump. Recommend a one-line comment in the .ps1 stating "intentionally main-tree — installers + tasks are host
... [+1334 chars truncated]
