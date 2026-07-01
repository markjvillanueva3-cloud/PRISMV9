---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review a newly-written PowerShell scheduled-task installer END TO END, rigorousl"
date: "2026-05-16"
first_ts: "2026-05-16T20:28:19.935Z"
last_ts: "2026-05-16T20:29:29.165Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a7d845f05d863c9bc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review a newly-written PowerShell scheduled-task installer END TO END, rigorousl

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a7d845f05d863c9bc.jsonl`

## Transcript

### User | 2026-05-16T20:28:19.935Z

Review a newly-written PowerShell scheduled-task installer END TO END, rigorously.

FILE: H:/prism-hotel-c2/scripts/cron/knowledge-distillation-cron.ps1

UNIT SPEC — OBSIDIAN-INTELLIGENCE-MS3 / B6 (U-KNOWLEDGE-DISTILLATION):
  1st-of-month cron writes knowledge/wiki/distillations/YYYY-MM-<topic>.md (the engine + test are sibling deliverables of this same unit). This cron is the invocation layer.

CONTEXT — this script deliberately mirrors B4's already-shipped `weekly-synthesis-cron.ps1` after that unit's 2-arm FAIL→fix cycle. Key invariants from B4:
  - LogonType S4U (NOT Interactive — Interactive silently doesn't run when the user is logged off)
  - Register-ScheduledTask -Force (atomic re-register; no window of unregistered task)
  - The action invokes the engine via tsx on the .ts SOURCE (PRISM's esbuild emits NO per-engine dist/*.js — the B1/B2/B3 sibling crons reference dist/engines/*.js and are latent-broken; B4/B5/B6 use tsx)
  - PS 5.1 -Command collapses native-exe exit codes; trailing `; exit $LASTEXITCODE` (backtick-escaped for runtime evaluation) is REQUIRED
  - RunNow polls LastRunTime advance (not LastTaskResult, which can be stale)
  - Action self-creates the log dir

ALREADY SMOKE-VERIFIED: DryRun parses cleanly, emits the expected action string + log path + S4U principal.

B6-SPECIFIC DECISION: PS 5.1's New-ScheduledTaskTrigger has no native -Monthly verb. Two valid paths: a CIM MSFT_TaskMonthlyTrigger, OR a -Daily trigger gated inside the action by day-of-month. This script uses the daily + day-of-month gate (`if ((Get-Date).Day -ne 1) { exit 0 }`) — simpler, fail-predictable, ~30 sub-second no-op fires per month. Confirm this is correct and not a code-smell. Do NOT flag the choice — confirm it.

WHAT TO VERIFY (flag every P0 / P1):
  - The action string is correctly built: PS 5.1 -Command quoting around the gate, the engine invocation, the log redirection `*>>`, and the `; exit $LASTEXITCODE` (backtick-escaped) trailing.
  - The day-of-month gate r
... [+1149 chars truncated]

### Assistant | 2026-05-16T20:28:26.630Z

I'll perform a rigorous end-to-end review of this PowerShell scheduled-task installer.

### Assistant | 2026-05-16T20:28:26.878Z

[tool_use: Read]

### User | 2026-05-16T20:28:27.870Z

[tool_result] 1	#requires -Version 5.0
2	<#
3	.SYNOPSIS
4	  Register / unregister the PRISM Knowledge Distillation scheduled task
5	  (OBSIDIAN-INTELLIGENCE-MS3 / B6 - U-KNOWLEDGE-DISTILLATION).
6	
7	.DESCRIPTION
8	  Fires once a month - on the 1st, at 03:15 local time - and runs
9	  KnowledgeDistillationEngine over the last 30 days of knowledge/resources/
10	  + knowledge/areas/ notes, writing per-topic canoni
... [+10736 chars truncated]

### Assistant | 2026-05-16T20:29:29.165Z

Performing rigorous end-to-end review against the unit spec and B4's invariants.

## Findings

### P0 — must fix

**P0-1 — `$gateLine` is interpolated as a STATEMENT into a `;`-chain, but on `-RunNowBypassGate` it expands to a COMMENT that swallows the rest of the line.**
- File: `H:/prism-hotel-c2/scripts/cron/knowledge-distillation-cron.ps1:146,155`
- Problem: When `-RunNowBypassGate` is set, `$gateLine = "# day-of-month gate BYPASSED by -RunNowBypassGate"`. The action string becomes:
  ```
  New-Item ... | Out-Null; # day-of-month gate BYPASSED by -RunNowBypassGate; & 'node.exe' ...; exit $LASTEXITCODE
  ```
  In PowerShell, `#` begins a line comment that runs to **end-of-line, not end-of-statement**. Because the entire `-Command` payload is one line, the `#` swallows everything to its right — the engine invocation, the redirect, AND the `; exit $LASTEXITCODE`. The action becomes a no-op that exits 0 silently. This breaks the `-RunNow -RunNowBypassGate` backfill path entirely AND, worse, if someone re-runs the script WITHOUT `-RunNowBypassGate` after a bypass-register, the comment branch is gone — but in the same invocation when both are set, the registered action body is poisoned. (The DryRun smoke-test wouldn't have caught this — printing the action string doesn't execute it.)
- Fix: Make the bypass branch emit a real no-op statement, not a comment. Either:
  ```powershell
  $gateLine = if ($RunNowBypassGate) { "$null = 'gate-bypassed'" } else { "if ((Get-Date).Day -ne 1) { exit 0 }" }
  ```
  or omit the segment entirely and conditionally build the array. Comments inside a single-line `-Command` payload are toxic — never inline `#` into a `;`-joined command string.

### P1 — should fix

**P1-1 — `$gateLine` interpolates a literal `$LASTEXITCODE` token into a comment-prone position; the broader risk is that the action string has no defense against future contributors adding a `#`-prefixed branch.**
- File: line 145-149
- Problem: Same root cause as P0-1. Even a
... [+7525 chars truncated]
