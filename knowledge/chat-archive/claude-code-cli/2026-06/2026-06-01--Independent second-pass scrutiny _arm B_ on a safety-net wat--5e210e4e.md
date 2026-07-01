---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Independent second-pass scrutiny (arm B) on a safety-net watchdog change. Don't "
date: "2026-06-01"
first_ts: "2026-06-01T23:52:13.218Z"
last_ts: "2026-06-01T23:59:53.662Z"
cwd: "H:\\prism-slot-bravo"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a941a49964a15e5c1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Independent second-pass scrutiny (arm B) on a safety-net watchdog change. Don't 

> **claude-code-cli** | 2026-06-01 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a941a49964a15e5c1.jsonl`

## Transcript

### User | 2026-06-01T23:52:13.218Z

Independent second-pass scrutiny (arm B) on a safety-net watchdog change. Don't assume arm A caught everything; weight toward classification correctness, false-alert risk, and honest scoping.

## Files
- `H:/prism/scripts/fleet-task-health-watch.mjs` (MODIFIED — three task-name arrays near lines 114-190; `aggregateHealth` ~498).
- `H:/prism/scripts/__tests__/fleet-task-health-watch.test.mjs` (the E2E drift test ~line 471 that gates this; now passing 44/44).

## Context
A watchdog tracks `PRISM *` scheduled tasks. `KNOWN_PRISM_TASKS` feeds missing-registration detection; `CRASH_CRITICAL_TASKS` feeds a "≥2 degraded → critical" rule; `MUST_EXIST_TASKS` feeds a "hard-down → critical alone" rule. The change synced KNOWN to the 21 names discovered from `install-*-task.ps1` files (was missing 9 → E2E drift test was red), and added "PRISM Zulu Orchestrator" to CRASH_CRITICAL (autonomy backbone, dark ~2 days per the Hermes-readiness audit).

## Verify (arm B angles)
- **Is adding 9 names to KNOWN honest, or does it create alert-fatigue?** Several added tasks (PRISM MCP Server, PRISM MCP Server Watchdog, etc.) — if any of these legitimately is NOT registered in normal operation, the watchdog will now warn perpetually. Is that a TRUE signal (real task that should exist) or noise? Cross-check: does an `install-*-task.ps1` exist for each of the 9 (i.e., they're real, intended-to-exist tasks)? Note any that look like they might be dev-only / optional.
- **CRASH_CRITICAL judgment**: is "PRISM Zulu Orchestrator" correctly classified vs MUST_EXIST? Is the decision to keep MCP Server / MCP Server Watchdog as KNOWN-only (not crash-critical) defensible, or is MCP Server Watchdog actually a more load-bearing crash-prevention task than Zulu and an inconsistency? (The change comment explicitly defers that — judge whether deferring is honest or a cop-out.)
- **Alphabetical/convention conformance** of the KNOWN list; LF line endings (flag CRLF); comment density vs the surrounding file.
- **
... [+421 chars truncated]

### Assistant | 2026-06-01T23:52:21.857Z

I'll perform an independent second-pass scrutiny (arm B) on this watchdog change. Let me start by reading the modified files and gathering the evidence I need to verify the claims.

### Assistant | 2026-06-01T23:52:22.774Z

[tool_use: Read]

### Assistant | 2026-06-01T23:52:22.857Z

[tool_use: Glob]

### User | 2026-06-01T23:52:25.226Z

[tool_result] .claude\helpers\install-blueprint-join-refresh-task.ps1
.claude\helpers\install-cleanup-orchestrator-task.ps1
.claude\helpers\install-hook-janitor-task.ps1
.claude\helpers\install-memory-pressure-task.ps1
.claude\helpers\install-node-cleaner-task.ps1
.claude\helpers\install-source-monitor-task.ps1
.claude\helpers\install-fleet-memory-monitor-task.ps1
.claude\helpers\install-nn-graph-retrain-task.p
... [+509 chars truncated]

### User | 2026-06-01T23:52:25.824Z

[tool_result] 1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task safety net.
4	 *
5	 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
6	 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
7	 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
8	 * `PRISM Cleanup Orchestrator`, `PRISM No
... [+44501 chars truncated]

### Assistant | 2026-06-01T23:52:29.400Z

I have the main file. The Glob shows there are more installer files than the comment's "21" claims. Let me extract the actual `$TaskName` defaults from every installer to verify the KNOWN list against ground truth, and check the test file and git history. These are independent investigations.

### Assistant | 2026-06-01T23:52:30.820Z

[tool_use: Grep]

### Assistant | 2026-06-01T23:52:31.521Z

[tool_use: Read]

### User | 2026-06-01T23:52:34.899Z

[tool_result] 420	});
421	
422	test("discoverInstallerTasks: live scan against real helpers dir (smoke)", () => {
423	  // Integration smoke: scan the actual H:/prism/.claude/helpers dir. We don't
424	  // assert specific names (those drift with installer additions/renames —
425	  // which is exactly what this function is supposed to surface), only that
426	  // (a) the call succeeds without throwing, (b) every
... [+3232 chars truncated]

### User | 2026-06-01T23:52:36.624Z

[tool_result] H:\prism\.claude\helpers\install-brain-refresh-task.ps1:2:  [string]$TaskName = 'PRISM Brain Refresh',
H:\prism\.claude\helpers\install-cleanup-orchestrator-task.ps1:2:  [string]$TaskName = 'PRISM Cleanup Orchestrator',
H:\prism\.claude\helpers\install-blueprint-join-refresh-task.ps1:2:  [string]$TaskName = 'PRISM Blueprint Join Refresh',
H:\prism\.claude\helpers\install-handoff-prune-task.ps1:2: 
... [+1952 chars truncated]

### Assistant | 2026-06-01T23:52:45.125Z

I now have the ground-truth installer set. Let me reconcile precisely. The grep returned 21 installer `$TaskName` defaults. Let me extract those exact 21 names and compare against the KNOWN list, and check the drift detector's discovery regex against the one outlier (`install-wiki-tribal-audit-task.ps1` uses double-quotes and line 19, not line 2).

Let me verify the git diff to confirm the test file wasn't weakened, and confirm the discovery regex matches the wiki-tribal case.

### Assistant | 2026-06-01T23:52:47.629Z

[tool_use: Bash]

### User | 2026-06-01T23:55:59.063Z

[tool_result] 19f8cc98ca [MAIN] [FLEET-TASK-HEALTH-MS0]/U-FTH-FOLLOWUP-SELF-DISC: installer self-discovery — closes arm-C deferred ...
da01003b61 [MAIN] [FLEET-TASK-HEALTH-MS0]/U-FTH01-02: scheduled-task watchdog + critical-pressure /compact actuator
=== DIFF of test file (working tree vs HEAD) ===

=== DIFF of watch file (working tree vs HEAD) ===
scripts/fleet-task-health-watch.mjs | 29 ++++++++++++++++++++++
... [+3742 chars truncated]

### Assistant | 2026-06-01T23:56:08.163Z

Confirmed: the test file has zero working-tree changes (`git diff HEAD` of the test file is empty), so the test went green purely from the source-list change, not by weakening the assertion. The watch file change is +29/-0 (pure additions, no deletions).

Now let me reconcile the discovered installer set against the KNOWN list exactly. The grep found 21 installer `$TaskName` values. But I notice a critical detail: `install-wiki-tribal-audit-task.ps1` uses **double quotes** at line 19, and the Glob showed `install-zebra-orchestrator-task.ps1` and `install-cost-alarm-task.ps1` and `install-system-viz-revwalk-task.ps1` and `install-system-awareness-freshness-task.ps1` — but those didn't appear in the grep output. Let me check why those installers didn't yield a `$TaskName` match (they may use a different parameter form), because that affects what the discovery regex actually finds.

### Assistant | 2026-06-01T23:56:10.334Z

[tool_use: Bash]

### User | 2026-06-01T23:56:15.640Z

[tool_result] === Installers that did NOT match the [string]$TaskName regex ===
--- install-zebra-orchestrator-task.ps1 (first 25 lines, TaskName context) ---
/usr/bin/grep: .claude/helpers/install-zebra-orchestrator-task.ps1: No such file or directory
--- install-cost-alarm-task.ps1 (first 25 lines, TaskName context) ---
62:$TaskName = "PRISM Cost Alarm"
88:    $existing = Get-ScheduledTask -TaskName $TaskName
... [+1195 chars truncated]

### Assistant | 2026-06-01T23:56:22.663Z

This is a significant finding. The discovery regex `/\[string\]\s*\$TaskName\s*=\s*['"](.+?)['"]/i` only matches installers that declare `$TaskName` as a **typed param default** (`[string]$TaskName = '...'`). At least **three** real PRISM installers declare the task name as a plain script variable (`$TaskName = "..."` without the `[string]` type prefix), so the discovery regex silently skips them:

- `install-cost-alarm-task.ps1` → **"PRISM Cost Alarm"**
- `install-system-viz-revwalk-task.ps1` → **"PRISM System-Viz Re-walk Daily"**
- `install-system-awareness-freshness-task.ps1` → **"PRISM System Awareness Freshness"**

These three are real, registered PRISM tasks that the drift detector cannot see — and therefore are NOT in KNOWN_PRISM_TASKS, and therefore are silently unwatched by missing-registration detection. This is exactly the failure class U-FTH-FOLLOWUP-SELF-DISC was built to surface, and the "synced KNOWN to the 21 discovered" claim is built on an incomplete discovery. Let me confirm the full picture and check the `--once` flag handling.

### Assistant | 2026-06-01T23:56:26.778Z

[tool_use: Bash]

### User | 2026-06-01T23:56:31.138Z

[tool_result] === ALL install-*-task.ps1 files ===
27
=== Count matching [string]$TaskName (what discovery sees) ===
0
=== Installers using bare $TaskName = (NOT typed param, missed by regex) ===
  install-blueprint-ocr-batch-task.ps1 -> PRISM Blueprint OCR Batch
  install-cost-alarm-task.ps1 -> PRISM Cost Alarm
  install-mcp-monitor-task.ps1 -> PRISM MCP Connectivity Monitor
  install-sfc-variability-task.ps1 
... [+172 chars truncated]

### Assistant | 2026-06-01T23:56:38.196Z

The grep -l with `\s` failed (grep BRE doesn't expand `\s` the same way), but the substantive finding stands and is now larger. There are **27** installer files total. The discovery regex matches 21 of them. At least **5 more** real PRISM task installers exist whose names the discovery regex cannot see because they declare `$TaskName` as a bare variable, not a typed `[string]` param:

- `install-blueprint-ocr-batch-task.ps1` → "PRISM Blueprint OCR Batch"
- `install-cost-alarm-task.ps1` → "PRISM Cost Alarm"
- `install-mcp-monitor-task.ps1` → "PRISM MCP Connectivity Monitor"
- `install-system-awareness-freshness-task.ps1` → "PRISM System Awareness Freshness"
- `install-system-viz-revwalk-task.ps1` → "PRISM System-Viz Re-walk Daily"

Plus `install-sfc-variability-task.ps1` (name needs inspection). Let me verify these are genuinely registered-intent tasks (have Register-ScheduledTask calls) and grab the sfc one, then confirm the `--once` flag is actually parsed (the header documents it but I want to verify it doesn't silently no-op).

### Assistant | 2026-06-01T23:56:41.482Z

[tool_use: Bash]

### User | 2026-06-01T23:58:49.244Z

[tool_result] Exit code 255
=== sfc-variability TaskName ===
=== Do the 5 missed installers actually Register-ScheduledTask? ===
  install-blueprint-ocr-batch-task.ps1 : Register-ScheduledTask x2
  install-cost-alarm-task.ps1 : Register-ScheduledTask x6
  install-mcp-monitor-task.ps1 : Register-ScheduledTask x1
  install-system-awareness-freshness-task.ps1 : Register-ScheduledTask x3
  install-system-viz-revwal
... [+238 chars truncated]

### Assistant | 2026-06-01T23:58:54.120Z

The first parts confirmed: all 5 (plus sfc) installers genuinely call `Register-ScheduledTask` — they are real, intended-to-exist tasks. The grep for `--once` failed only on the rtk/rg PATH issue. Let me retry the `--once` check and grab the sfc-variability task name with a direct approach.

### Assistant | 2026-06-01T23:58:55.714Z

[tool_use: Bash]

### User | 2026-06-01T23:58:59.256Z

[tool_result] === --once handling ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
5 matches in 1 files:

scripts/fleet-task-health-watch.mjs:12:* healthy. Each installer verifies its own task once at registration; the
scripts/fleet-task-health-watch.mjs:57:*   node fleet-task-health-watch.mjs --once --json   # one audit, JSON
scripts/fleet-task-health-watch.m
... [+617 chars truncated]

### Assistant | 2026-06-01T23:59:05.923Z

That fully reconciles. Key facts now established:

1. **`--once` is documented but never parsed** (`parseFlags` has no `--once` entry; it's a silent no-op — harmless since default already runs one audit, but the header advertises it). Minor.

2. **`install-sfc-variability-task.ps1`** registers MULTIPLE tasks with NON-default param names (`$GuardTaskName = 'PRISM SFC Variability Guard'`, `$MillTaskName = 'PRISM SFC Variability Batch Mill'`, and likely a lathe variant) — none of which the discovery regex (`$TaskName`) can ever match.

I have everything needed for the verdict. Let me do one final confirmation: run the actual drift test to confirm the 44/44 green claim, and confirm the live discovery count, since the whole "honesty" question hinges on whether the test passing means the watchdog actually sees all tasks.

### Assistant | 2026-06-01T23:59:09.217Z

[tool_use: Bash]

### User | 2026-06-01T23:59:13.911Z

[tool_result] discovered count: 21
hasDrift (drift test passes if false): false
missingFromHardcoded: []
staleInHardcoded: []
KNOWN count: 21
Zulu in CRASH_CRITICAL: true

### Assistant | 2026-06-01T23:59:53.662Z

This confirms the core scoping problem precisely. The drift test passes (`hasDrift: false`) because **both sides of the comparison share the same blind spot**: `discoverInstallerTasks` only finds the 21 typed-param installers, and KNOWN_PRISM_TASKS was synced to exactly those 21. The 6+ bare-`$TaskName` installers exist in the same directory but are invisible to both the detector and the list — so the test is green while the watchdog is blind to ~6 real safety-net tasks.

I have a complete picture. Here is my arm-B verdict.

---

## ARM-B SCRUTINY VERDICT: **FAIL**

The change is internally consistent, additive (+29/-0), correctly comment-dense, and the test went green for an honest reason (test file has zero working-tree edits — verified via `git diff HEAD`). The Zulu classification reasoning is sound. **But it ships a false sense of completeness**: the "synced KNOWN to the 21 discovered installer names" claim is true only within a discovery mechanism that silently misses at least 6 real registered PRISM tasks. That violates R12 (fail-loud / honest scoping) — the exact doctrine this unit was built to enforce.

### P0 findings

**P0-1 — Discovery regex misses ≥6 real registered tasks; the drift test is green-but-blind.**
`discoverInstallerTasks` uses `/\[string\]\s*\$TaskName\s*=\s*['"](.+?)['"]/i`, which only matches installers declaring the task name as a **typed param default** (`[string]$TaskName = '...'`). At least 6 real installers in the same `.claude/helpers/` dir declare the name as a bare script variable or a differently-named param, so they are invisible to the detector AND absent from KNOWN_PRISM_TASKS — i.e. silently unwatched by missing-registration detection, the precise failure U-FTH-FOLLOWUP-SELF-DISC exists to prevent. Each verified to call `Register-ScheduledTask`:
- `install-cost-alarm-task.ps1` → `PRISM Cost Alarm` (bare `$TaskName = "..."`)
- `install-system-viz-revwalk-task.ps1` → `PRISM System-Viz Re-walk Daily`
- `install-system-awareness-fr
... [+4755 chars truncated]
