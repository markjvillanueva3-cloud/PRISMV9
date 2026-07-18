---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Independent review of a PowerShell scheduled-task installer: `H:/prism/.claude/h"
date: "2026-05-17"
first_ts: "2026-05-17T19:48:30.196Z"
last_ts: "2026-05-17T19:49:35.752Z"
cwd: "H:\\PRISM"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a6a09a2d7529c824e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent review of a PowerShell scheduled-task installer: `H:/prism/.claude/h

> **claude-code-cli** | 2026-05-17 | 16 msgs (6 user / 10 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a6a09a2d7529c824e.jsonl`

## Transcript

### User | 2026-05-17T19:48:30.196Z

Independent review of a PowerShell scheduled-task installer: `H:/prism/.claude/helpers/install-nn-graph-retrain-task.ps1` (~210 lines, parses clean). Read the WHOLE file end-to-end. Review fresh — do not assume a prior reviewer caught everything.

WHAT IT IS: registers a Windows Scheduled Task running `H:/PRISM/scripts/nn-graph-retrain-lifecycle.mjs --max-old-space-size=8192` every 6 hours to autonomously retrain a GraphSAGE GNN. The lifecycle script it launches: fingerprints the system-viz graph, drift-detects, trains a candidate checkpoint, evaluates it, and promotes candidate→live ONLY on gate-pass. The task must run unattended (operator may be logged off).

Weight your review toward what a structural code-correctness pass misses:
- AUTONOMY CORRECTNESS: does the registered task ACTUALLY run when no user is logged in? The whole point is unattended operation. Verify the principal (S4U LogonType, RunLevel Highest), the AtStartup trigger, `-StartWhenAvailable`, `RestartCount`. Is there any path where the task registers but silently never fires (e.g. Interactive-only principal, missing trigger)?
- REVERSIBILITY (feedback_never_delete_only_disable): is `-Uninstall` present, idempotent, and does the help text surface `Disable-ScheduledTask` as the pause lever? Does the script ever DELETE anything other than via explicit `-Uninstall`?
- SECURITY: the task runs node with `--max-old-space-size=8192` then a script path. Any command-injection surface? `$env:USERDOMAIN\$env:USERNAME` interpolation into the principal — safe? Any secret leaked into the task definition or `Write-Host`?
- FAIL-LOUD (R12): `$ErrorActionPreference='Stop'`, the elevation check throws with a clear message, the script-not-found and sanity-check both `throw`. Is there any failure that is silently swallowed — e.g. `Register-ScheduledTask` failing, or a bad node path?
- OPERATIONAL HONESTY: the `-RunNow` poll — if a real retrain runs past the 20-min deadline, does the script report that honestly rather 
... [+737 chars truncated]

### Assistant | 2026-05-17T19:48:39.839Z

I'll review the installer file and its sibling for convention comparison.

### Assistant | 2026-05-17T19:48:40.286Z

[tool_use: Read]

### Assistant | 2026-05-17T19:48:40.554Z

[tool_use: Read]

### User | 2026-05-17T19:48:40.781Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-nn-graph-retrain-task.ps1' was already read 15s ago in this session and is unchanged (mtime 1779047223359). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-05-17T19:48:41.049Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-reaper-task.ps1' was already read 15s ago in this session and is unchanged (mtime 1778969330578). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-05-17T19:48:45.800Z

The read-once guard reports both files were already read in this session, but I do not have their content in my context — I was dispatched fresh for this review with no prior turns. I must read the actual file to review it.

### Assistant | 2026-05-17T19:48:46.706Z

[tool_use: Bash]

### User | 2026-05-17T19:48:53.919Z

[tool_result] param($
  [string]$TaskName = 'PRISM NN-Graph Retrain',$
  # Cadence in HOURS M-bM-^@M-^T this is a ---SEP---
marker

### Assistant | 2026-05-17T19:48:57.325Z

The file exists. I'll read it with the cache disabled.

### Assistant | 2026-05-17T19:48:57.854Z

[tool_use: Bash]

### User | 2026-05-17T19:49:01.625Z

[tool_result]   1 │ param(
  2 │   [string]$TaskName = 'PRISM NN-Graph Retrain',
  3 │   # Cadence in HOURS — this is a heavy task (a retrain is a multi-minute
  4 │   # GraphSAGE training run), unlike the 5-minute fleet-reaper sweep. The
  5 │   # lifecycle's own drift gate makes most polls a sub-second no-op, so a
  6 │   # 6-hour cadence catches graph drift quickly while almost never paying the
  7 │   # ful
... [+11827 chars truncated]

### Assistant | 2026-05-17T19:49:05.654Z

Now let me verify the sibling installer for convention comparison and check one tuning concern.

### Assistant | 2026-05-17T19:49:08.302Z

[tool_use: Bash]

### User | 2026-05-17T19:49:12.733Z

[tool_result]   1 │ ﻿param(
  2 │   [string]$TaskName = 'PRISM Fleet Reaper',
  3 │   [int]$EveryMinutes = 5,
  4 │   # Phase offset (seconds) for the trigger anchor. PRISM already runs the
  5 │   # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
  6 │   # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
  7 │   # on the half-cycle between them instead of pha
... [+2349 chars truncated]

### Assistant | 2026-05-17T19:49:35.752Z

The file is faithfully matched to its sibling. My review:

---

**Review of `install-nn-graph-retrain-task.ps1`**

**AUTONOMY CORRECTNESS — PASS.** Default path (no `-Interactive`) builds an S4U principal with `RunLevel Highest` (L151-152) or SYSTEM/ServiceAccount with `-AsSystem` (L148-149) — both run logged-off. `-StartWhenAvailable` (L132) covers missed anchors; `RestartCount 3` (L134) self-heals abnormal exits; the `AtStartup` trigger (L120) survives reboot. No path registers an interactive-only task by accident — `-Interactive` is explicit opt-in. The `$null` principal is correctly *omitted* via splat (L168), not passed as `-Principal $null` which would throw. Sound.

**REVERSIBILITY — PASS.** `-Uninstall` (L78-86) is idempotent: `Get-ScheduledTask -ErrorAction SilentlyContinue` guards `Unregister-ScheduledTask`, and the not-found branch reports cleanly. No `Remove-Item`/destructive op anywhere. Help text surfaces `Disable-ScheduledTask` as the pause lever (L210). The script only ever removes a task via explicit `-Uninstall`. Matches `feedback_never_delete_only_disable`.

**SECURITY — PASS.** No command-injection surface: `$lifecycleScript` is a hardcoded literal (L69), `$nodeExe` resolves from a fixed candidate list / `Get-Command` (L72-76). `$lifecycleArgs` interpolates only those plus the constant heap flag (L104-108). `$env:USERDOMAIN\$env:USERNAME` into `-UserId` is parameter-bound, not shell-evaluated — safe (a hostile env value would just fail principal resolution loudly, not inject). No secrets in the task definition or `Write-Host`.

**FAIL-LOUD — PASS.** `$ErrorActionPreference='Stop'` (L57); elevation check throws a clear message (L64); script-not-found throws (L89); the header-sanity check throws if the target isn't the real lifecycle script (L95-96); `Get-Command node -ErrorAction Stop` (L76) throws on no node. `Register-ScheduledTask` runs under `Stop`, so a registration failure surfaces. Nothing silently swallowed.

**OPERATIONAL HONESTY — PASS.*
... [+1475 chars truncated]
