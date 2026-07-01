---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Independent second-pass review of `H:/prism/.claude/helpers/zebra-launch.ps1` (j"
date: "2026-05-21"
first_ts: "2026-05-21T18:24:49.669Z"
last_ts: "2026-05-21T18:26:12.517Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a2bce5b14246c4b1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of `H:/prism/.claude/helpers/zebra-launch.ps1` (j

> **claude-code-cli** | 2026-05-21 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a2bce5b14246c4b1d.jsonl`

## Transcript

### User | 2026-05-21T18:24:49.669Z

Independent second-pass review of `H:/prism/.claude/helpers/zebra-launch.ps1` (just written, ~240 lines, PARSE OK). You are arm B — arm A (code-analyzer) is checking races + atomic-write + doctrine + R12. Your weighting: gaps arm A might miss.

This is the operator-facing launcher for ZEBRA-OMNISCIENT (G10 scheduled-task install + G12 per-slot zebraOptIn flip). Source spec: `H:/prism/state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md`. Calls the (newly em-dash-fixed) `install-zebra-orchestrator-task.ps1`. Atomically edits `state/shared/chat-slots.json` using a lockfile mirroring the convention in `H:/prism/.claude/helpers/chat-slots.mjs` (search for `acquireLock`/`releaseLock` to see the canonical).

Read the whole file. Focus on:
1. **Operator surprise** — would a reasonable operator predict the behavior from running with no args? Default burn-in + default 2 slots — explicit enough? Confusion risk between `-WhatIf` (preview) and `-DryRun` (which the script doesn't expose directly but the installer does — risk of operator typing `-DryRun` and getting an error)?
2. **Security** — injection risk via `-Slots` parameter (array of strings used to index into JSON object). PS hash-table access by string — any way a slot name like `__proto__` or `constructor` would poison the JSON object on round-trip? (Test: `$obj.slots.__proto__ = $true` in PS — what happens?) Path traversal via slot names? Shell injection via Write-Host?
3. **Reversibility** — if G10 succeeds but G12 fails (or vice versa), what state is left behind? Does the script tell the operator what to roll back? Does it support `-SkipInstall` / `-SkipOptIn` so the operator can run only the failed half?
4. **Naming conformance** — matches the `.claude/helpers/install-zebra-orchestrator-task.ps1` style (param block, `$ErrorActionPreference = 'Stop'`, descriptive Write-Host)?
5. **Doctrine refuses** — per §G4, Zebra never escalates its own privilege; this script is operator-only by `#Requires -RunAsAdministrator`
... [+619 chars truncated]

### Assistant | 2026-05-21T18:25:01.694Z

I'll read the file and verify the conventions referenced.

### Assistant | 2026-05-21T18:25:02.736Z

[tool_use: Read]

### Assistant | 2026-05-21T18:25:02.899Z

[tool_use: Read]

### User | 2026-05-21T18:25:06.800Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\zebra-launch.ps1' was already read 2s ago in this session and is unchanged (mtime 1779387758633). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T18:25:09.367Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Zebra Orchestrator',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. Existing 5-min host tasks:
5	  #   Cleanup Orchestrator     ~+60s
6	  #   Memory Pressure Relief   ~+120s
7	  #   Fleet Reaper             ~+210s
8	  #   Fleet Memory Monitor     ~+330s
9	  # +420s lands zebra in its own slot of the 5-min cycle so no two Pow
... [+9159 chars truncated]

### Assistant | 2026-05-21T18:25:13.610Z

I have the installer for reference. Now let me read the actual launcher under review and the canonical lock convention.

### Assistant | 2026-05-21T18:25:14.699Z

[tool_use: Read]

### Assistant | 2026-05-21T18:25:16.021Z

[tool_use: Grep]

### User | 2026-05-21T18:25:33.792Z

[tool_result] 391-}
392-
393-// ─── Lock for read-modify-write ─────────────────────────────────────────
394-//
395-// Two chats claiming "alpha" simultaneously could both read null, both write
396-\ their own claim, and the last writer wins silently. Lock prevents that:
397-// each claim acquires the lock, reads, modifies, writes, releases.
398-
399:function acquireLock(lockPath = DEFAULT_LOCK_PATH) {
400-  en
... [+1410 chars truncated]

### User | 2026-05-21T18:25:36.432Z

[tool_result] 1	#Requires -RunAsAdministrator
2	<#
3	.SYNOPSIS
4	  ZEBRA-OMNISCIENT operator launcher — one elevated PS call lands G10 + G12.
5	
6	.DESCRIPTION
7	  Closes the two operator-action gates left at the end of ZEBRA-HERMES-GAP-AUDIT:
8	    G10 — registers the `PRISM Zebra Orchestrator` scheduled task (via
9	          install-zebra-orchestrator-task.ps1). Default: BURN-IN (dry-run baked
10	          in
... [+10484 chars truncated]

### Assistant | 2026-05-21T18:26:12.517Z

Arm-B review of `H:/prism/.claude/helpers/zebra-launch.ps1`:

**P0 (must-fix before ship)**
- **`Get-Content -Raw` returns BOM-prefixed string on UTF-8-with-BOM `chat-slots.json` → `ConvertFrom-Json` either chokes or silently swallows the BOM, then `Set-Content -Encoding UTF8` writes BOM back. If the canonical mjs writer uses no-BOM, every launcher invocation flips encoding → diff noise + potential R12 silent corruption. Fix: `[IO.File]::ReadAllText($ChatSlotsPath, [Text.UTF8Encoding]::new($false))` and `[IO.File]::WriteAllText($tmp, $json, [Text.UTF8Encoding]::new($false))`.
- **R12 fail-loud violation in verify block** (line 214): `-and` precedence — `$a -contains $b -and $c` parses as `$a -contains ($b -and $c)`. Slot-name existence check is silently broken; the `[OK]` line will print for unknown slots. Fix: wrap in parens: `($verify.slots.PSObject.Properties.Name -contains $slot) -and ($verify.slots.$slot.zebraOptIn -eq $true)`.

**P1**
- **Slot-name injection / prototype-poisoning probe (Q2):** PS `PSCustomObject` is not a hashtable; `$obj.slots.__proto__` is just a property name — no JS-style prototype pollution. BUT `.PSObject.Properties.Name -contains '__proto__'` returns false (no such property unless one literally exists in the JSON), so the unknown-slot branch correctly rejects it. **However** `[pscustomobject]@{...}` on line 159 uses `$obj.slots.$slot = ...` with an unvalidated `$slot` — an operator passing `-Slots ../etc/passwd` would add a property literally named `../etc/passwd` to the JSON (no filesystem escape, but persistent JSON pollution + breaks downstream readers expecting a NATO-26 enum). Fix: validate `$slot -match '^[a-z]+$'` and intersect against `SLOT_NAMES`-equivalent.
- **`-WhatIf` collides with PowerShell common-parameter `-WhatIf`** without `[CmdletBinding(SupportsShouldProcess)]`. Currently works because `[switch]$WhatIf` shadows it, but `$WhatIf` value inside `& powershell @installerArgs` is NOT propagated — operator typing `-WhatIf`
... [+2172 chars truncated]
