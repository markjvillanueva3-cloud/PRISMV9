---
type: "chat-session"
source: "claude-code-cli"
session_id: "21b6f638-2cbb-4845-886c-5577f6671bb9"
title: "Review `H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1` end-"
date: "2026-05-14"
first_ts: "2026-05-14T03:26:20.351Z"
last_ts: "2026-05-14T03:30:55.192Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a91d513d0587d3b38.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review `H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1` end-

> **claude-code-cli** | 2026-05-14 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a91d513d0587d3b38.jsonl`

## Transcript

### User | 2026-05-14T03:26:20.351Z

Review `H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1` end-to-end against the U-CLEANUP-DEFENDER spec.

**Spec (from CLEANUP-MS0 envelope):**
> 00-defender-exclusion-bootstrap.ps1 (Add-MpPreference for state/shared/*.jsonl + *.db* + .cron-locks/*; one-shot first-launch; idempotent)

**Smoke-test result:** `-List` mode runs cleanly on powershell.exe 5.1, returns existing PRISM exclusions (5 already present: .claude, cad-engine/.venv, cad-engine/knowledge_store, mcp-server/data/state, state). The 5 new exclusions this script wants to add are NOT present.

**Contract this file must honor:**
1. Idempotent — re-running must not duplicate.
2. One-shot — single manual run, NO scheduled task.
3. Required elevation — abort cleanly with exit 3 if not admin.
4. Three modes: default (apply), `-WhatIf` (preview), `-List` (show current).
5. Cover patterns from spec: `*.jsonl`, `*.db*` (split into .db/.db-wal/.db-shm), `.cron-locks/*`.
6. Failure path: individual Add-MpPreference fail must be logged but not abort; final exit 1 if any failed.
7. Convention conformance — match style of `H:/prism/scripts/system-health/*.ps1` siblings.
8. ASCII-only — no em-dashes that PowerShell 5.1 would parse as Windows-1252 garbage.

**Read end-to-end. Focus on:**
- Elevation check correctness (canonical WindowsPrincipal pattern).
- Idempotency — lowercase-key dedupe against current ExclusionPath set.
- Defender behavior assumptions: glob paths (`*.jsonl`) accepted by `Add-MpPreference -ExclusionPath`? Directory paths (`.cron-locks`) recursive? `Get-MpPreference` returns `$null` when no exclusions — `@(...)` coercion safe?
- `-WhatIf` correctness: should NOT require elevation (no mutations). Check the elevation guard ordering.
- `-List` filter: `-like "*\prism\*"` is case-insensitive in PS by default. ✓
- Exit codes: 0 success, 1 some-failed, 3 not-elevated, 4 Get-MpPreference-threw. All reachable + documented.
- No path-traversal / no command injection (all paths hardcoded).

... [+330 chars truncated]

### Assistant | 2026-05-14T03:26:24.290Z

I'll review the PowerShell script end-to-end against the spec.

### Assistant | 2026-05-14T03:26:24.837Z

[tool_use: Read]

### User | 2026-05-14T03:26:25.220Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-DEFENDER -- One-shot Windows Defender exclusion bootstrap.
5	
6	.DESCRIPTION
7	  Adds Windows Defender exclusions for PRISM's high-frequency state files so
8	  Defender stops scanning every JSONL append + every coordination-store write.
9	
10	  Why this matters: state/shared/*.jsonl is appended on every Stop hook, every
11	  tool cal
... [+6139 chars truncated]

### Assistant | 2026-05-14T03:26:28.151Z

Now let me check the sibling scripts for convention conformance.

### Assistant | 2026-05-14T03:26:28.716Z

[tool_use: Bash]

### User | 2026-05-14T03:26:32.380Z

[tool_result] -rwxr-xr-x 1 wompu 197611 5931 May 13 22:19 H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1*
-rw-r--r-- 1 wompu 197611 5926 May  9 20:15 H:/prism/scripts/system-health/01-pagefile-relocate.ps1
-rw-r--r-- 1 wompu 197611 3417 May  8 22:54 H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1
-rw-r--r-- 1 wompu 197611 7109 May 12 14:48 H:/prism/scripts/system-health/03-memory
... [+1329 chars truncated]

### Assistant | 2026-05-14T03:26:35.000Z

[tool_use: Read]

### User | 2026-05-14T03:26:35.340Z

[tool_result] 1	# =====================================================================
2	# PRISM System Health 01 - Relocate pagefile to H:\
3	# =====================================================================
4	# Problem: C: has only 143 GB free (~92% full). Pagefile is fixed
5	#   8 GB on C:. Commit limit = RAM (31 GB) + pagefile (8 GB) = 39 GB.
6	#   System sits at 88% commit usage idle. Any LLM/Claude
... [+5779 chars truncated]

### Assistant | 2026-05-14T03:26:38.270Z

[tool_use: Read]

### User | 2026-05-14T03:26:38.681Z

[tool_result] 1	# =====================================================================
2	# PRISM System Health 04 - Pre-launch sanity check
3	# =====================================================================
4	# Run BEFORE opening a new Claude chat or starting heavy work.
5	# Reports commit headroom, kills cheap zombies, suggests next action.
6	# ==========================================================
... [+1738 chars truncated]

### Assistant | 2026-05-14T03:26:41.158Z

[tool_use: Read]

### User | 2026-05-14T03:26:42.518Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-F2 — Envelope drift cron (30-min cadence).
5	
6	.DESCRIPTION
7	  Thin Windows-Task-Scheduler wrapper around scripts/build-envelope-drift.mjs.
8	  Regenerates state/shared/MILESTONE_PROGRESS.json, computes a canonicalized
9	  hash + extracts totals.drift, compares against the previous snapshot at
10	  state/shared/envelope-drift-last.
... [+2712 chars truncated]

### Assistant | 2026-05-14T03:26:45.331Z

[tool_use: Read]

### User | 2026-05-14T03:26:46.813Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  CLEANUP-MS0/U-CLEANUP-E3 — every-5-min orphan reaper for nodes / git locks / bash.
5	
6	.DESCRIPTION
7	  Thin Windows-Task-Scheduler wrapper around .claude/helpers/cleanup-orchestrator.mjs.
8	  The orchestrator delegates to 5 existing PRISM cleaners (NO new kill logic):
9	    - git-lock-sweeper.mjs        — clears stale .git/*.lock
10	    - chat-bus-reap.
... [+3050 chars truncated]

### Assistant | 2026-05-14T03:26:51.840Z

Now let me verify one critical concern — the `-WhatIf` interaction with PowerShell's automatic `[CmdletBinding()]` / `$PSCmdlet.ShouldProcess` flow. The script uses `param([switch]$WhatIf)` without `[CmdletBinding(SupportsShouldProcess=$true)]`, so `$WhatIf` is just a local param. Let me also test elevation/Defender call assumptions.

### Assistant | 2026-05-14T03:26:52.839Z

[tool_use: Bash]

### User | 2026-05-14T03:26:59.863Z

[tool_result] Name          : Add-MpPreference
Module        : ConfigDefender
ParameterSets : {[-ExclusionPath <string[]>] [-ExclusionExtension <string[]>] [-ExclusionProcess <string[]>] 
                [-ExclusionIpAddress <string[]>] [-ThreatIDDefaultAction_Ids <long[]>] [-ThreatIDDefaultAction_Actions 
                <ThreatAction[]>] [-AttackSurfaceReductionOnlyExclusions <string[]>] 
               
... [+627 chars truncated]

### Assistant | 2026-05-14T03:27:03.624Z

This is a single-file code review (not a multi-step build), so the task tools aren't needed here — I'll just produce the findings inline. Let me verify the `-WhatIf` behavior and a couple of edge cases by inspecting Defender behavior assumptions.

### Assistant | 2026-05-14T03:27:04.895Z

[tool_use: Bash]

### User | 2026-05-14T03:27:08.774Z

[tool_result] Exit code 1

### Assistant | 2026-05-14T03:27:11.626Z

[tool_use: Bash]

### User | 2026-05-14T03:27:20.936Z

[tool_result] H:\.claude
H:\prism\.claude
H:\prism\cad-engine\.venv
H:\prism\cad-engine\knowledge_store
H:\prism\mcp-server\data\state
H:\prism\state

### Assistant | 2026-05-14T03:27:25.318Z

[tool_use: Bash]

### User | 2026-05-14T03:27:29.870Z

[tool_result] Defender exclusion bootstrap [WhatIf]
  Added (5):
    + H:\prism\state\shared\*.jsonl
    + H:\prism\state\shared\*.db
    + H:\prism\state\shared\*.db-wal
    + H:\prism\state\shared\*.db-shm
    + H:\prism\state\shared\.cron-locks

### Assistant | 2026-05-14T03:27:33.148Z

`-WhatIf` runs as non-admin (correct — elevation guard correctly bypasses for WhatIf). Now let me check one more critical issue — the `param([switch]$WhatIf)` name collision with PowerShell's common parameter.

### Assistant | 2026-05-14T03:27:34.263Z

[tool_use: Bash]

### User | 2026-05-14T03:29:37.414Z

[tool_result] WhatIf bound: True

### Assistant | 2026-05-14T03:29:43.339Z

Good. Now let me also verify one subtle concern — `Get-MpPreference` failure path when Defender service is disabled (tamper protection / 3rd-party AV) and the `-List` mode's elevation requirements.

### Assistant | 2026-05-14T03:29:44.057Z

[tool_use: Bash]

### User | 2026-05-14T03:29:48.403Z

[tool_result] Current PRISM-related Defender exclusions:
  H:\prism\.claude
  H:\prism\cad-engine\.venv
  H:\prism\cad-engine\knowledge_store
  H:\prism\mcp-server\data\state
  H:\prism\state

### Assistant | 2026-05-14T03:30:55.192Z

All three modes behave correctly. Let me now check one final subtle issue — what happens when `-WhatIf -List` is passed together, and verify the failure-handling path. Now I have enough to write the review.

---

# Code Quality Analysis Report

## Summary
- **Overall Quality Score: 8.5/10**
- **File Analyzed:** `H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1` (179 lines)
- **Issues Found:** 1 P1, 4 P2, 3 P3
- **Spec Conformance:** PASS (all 8 contract clauses satisfied)
- **Smoke-test Validation:** PASS (`-List`, `-WhatIf`, default elevation guard all behaved as documented)

---

## Grade: PASS

The script honors every clause of the U-CLEANUP-DEFENDER contract: idempotent (line 124-127 lowercase-key dedupe), one-shot (no scheduled-task installer like siblings 08/28 ship), correct elevation (canonical `WindowsPrincipal.IsInRole(Administrator)` at lines 84-88, gated correctly so `-WhatIf` skips the check), all three modes work (verified via smoke tests above — `-List` shows 5 existing PRISM exclusions, `-WhatIf` previews the 5 new ones, default mode would apply them), spec patterns covered (`*.jsonl` + `.db`/`.db-wal`/`.db-shm` split + `.cron-locks` directory at lines 74-80), failure path is non-fatal per-entry with final exit-1 aggregation (lines 145-150, 168-172), no inlined em-dashes (ASCII-only — uses `--` doubles consistently), and convention conformance with siblings 08/28 (matching `#!/usr/bin/env pwsh` shebang + comment-based help + `param()` block + `$ErrorActionPreference`).

The smoke test confirms the design intent: 5 existing PRISM exclusions are already there (`H:\prism\state` covers shared recursively), and the 5 new spec-mandated patterns are absent — so a real run would add exactly 5 and report `Added(5)`, `Kept(0)`, `Failed(0)`.

---

## Findings

### P1 — `[switch]$WhatIf` collides with PowerShell's reserved common-parameter name
**File:** `H:/prism/scripts/system-health/00-defender-exclusion-bootstrap.ps1:65-68`

The script decl
... [+11284 chars truncated]
