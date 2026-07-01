---
type: "chat-session"
source: "claude-code-cli"
session_id: "c9c4e6a8-22e3-4cd2-b834-feece577b10c"
title: "Review H:/prism/scripts/system-health/33-blueprint-join-refresh.ps1 end-to-end a"
date: "2026-05-15"
first_ts: "2026-05-15T02:52:44.737Z"
last_ts: "2026-05-15T02:54:57.949Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 13
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-a77b8443f91be376e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review H:/prism/scripts/system-health/33-blueprint-join-refresh.ps1 end-to-end a

> **claude-code-cli** | 2026-05-15 | 30 msgs (13 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c9c4e6a8-22e3-4cd2-b834-feece577b10c/subagents/agent-a77b8443f91be376e.jsonl`

## Transcript

### User | 2026-05-15T02:52:44.737Z

Review H:/prism/scripts/system-health/33-blueprint-join-refresh.ps1 end-to-end as a PowerShell engineer.

CONTEXT — This file ships in U-DOCU-04 / MS-DOCU-INGEST. It is a self-contained Windows Scheduled-Task wrapper that rebuilds the blueprint↔program join index by running two python phase scripts and then validating the output:
  1. H:/Tools/python/python.exe scripts/docustrata/phase20-verified-prints-index.py
  2. H:/Tools/python/python.exe scripts/docustrata/phase16-blueprint-program-join-v6.py
  3. Validate Docustrata/.index/blueprint-program-join-full-v6.jsonl: line-count via [System.IO.File]::ReadLines, parse first 20 records, required keys {part_number, part_number_normalized, blueprints, programs, match_confidence}, match_confidence value in {exact, loose, ambiguous, miss, garbage}.
  4. Write state/shared/blueprint-join-refresh-last.json schemaVersion:1, no BOM.

REQUIREMENTS (from unit spec):
- Self-contained (no node wrapper) — distinct from 08-envelope-drift.ps1 which is a thin wrapper around a node mjs.
- Params: -DryRun, -Json, -FrozenTime
- PS 5.1 compatible (no `??`, no `?.`, no ternary, no `::new()` static factory on Encoding)
- $ErrorActionPreference = "Continue" (a phase failure must NOT abort validation; failures accrue into result.errors[])
- No-BOM UTF8 log write
- Models docblock/structure on 08-envelope-drift.ps1 (param block + docblock + exit codes + $here/$repo derivation)

CHECK FOR (P0/P1 only — surface concrete bugs, not style preferences):
1. Bugs / regressions: anything that breaks under realistic operator use (missing python, missing phase15 upstream, truncated v6 jsonl, NaN/null record fields, etc.).
2. PS 5.1 compatibility violations: parser errors or runtime errors on Windows PowerShell 5.1.
3. Path/process-handling: Start-Process exit code capture, temp-file cleanup, stdout/stderr tail truncation.
4. Validation logic correctness: line-count via ReadLines, first-20-record parsing with proper enumerator stop, required-keys check vi
... [+1140 chars truncated]

### Assistant | 2026-05-15T02:52:49.874Z

I'll review this PowerShell script end-to-end. Let me start by reading the file and the referenced sibling files.

### Assistant | 2026-05-15T02:52:50.374Z

[tool_use: Read]

### User | 2026-05-15T02:52:51.338Z

[tool_result] 1	#!/usr/bin/env pwsh
2	<#
3	.SYNOPSIS
4	  MS-DOCU-INGEST/U-DOCU-04 — Blueprint↔program join refresh cron (weekly cadence).
5	
6	.DESCRIPTION
7	  Rebuilds the blueprint↔program join index that powers prism_dev:program_for_print /
8	  print_for_program and prism_cam:cam_program_for_print / cam_print_for_program by
9	  invoking the canonical phase pipeline:
10	
11	    H:/Tools/python/python.exe scri
... [+16048 chars truncated]

### Assistant | 2026-05-15T02:52:55.872Z

Now let me check the sibling file referenced in the spec (08-envelope-drift.ps1) and the validator hook to verify KEEP-IN-SYNC claims.

### Assistant | 2026-05-15T02:52:56.482Z

[tool_use: Glob]

### User | 2026-05-15T02:52:56.943Z

[tool_result] scripts\system-health\08-envelope-drift.ps1

### Assistant | 2026-05-15T02:52:57.435Z

[tool_use: Glob]

### Assistant | 2026-05-15T02:52:57.930Z

[tool_use: Glob]

### User | 2026-05-15T02:52:57.972Z

[tool_result] .claude\hooks\blueprint-join-index-stale-check.mjs

### User | 2026-05-15T02:52:58.320Z

[tool_result] scripts\docustrata\phase20-verified-prints-index.py

### Assistant | 2026-05-15T02:52:58.405Z

[tool_use: Glob]

### User | 2026-05-15T02:52:58.796Z

[tool_result] scripts\docustrata\phase16-blueprint-program-join-v6.py

### Assistant | 2026-05-15T02:53:01.626Z

[tool_use: Read]

### User | 2026-05-15T02:53:02.186Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-health\08-envelope-drift.ps1' was already read 7m ago in this session and is unchanged (mtime 1778724363679). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:53:03.109Z

[tool_use: Grep]

### User | 2026-05-15T02:53:03.785Z

[tool_result] 34:// ("Docustrata/.index/blueprint-program-join-full-v6.jsonl"). Hardcoded H:/prism
39:const JOIN_PATH = "H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl";
64:  if (!existsSync(JOIN_PATH)) {
66:      `⚠ Blueprint↔program join index MISSING (${JOIN_PATH}). ` +
77:  const ageDays = (Date.now() - statSync(JOIN_PATH).mtimeMs) / (1000 * 60 * 60 * 24);
83:      `⚠ Blueprint↔program join
... [+54 chars truncated]

### Assistant | 2026-05-15T02:53:04.302Z

[tool_use: Grep]

### User | 2026-05-15T02:53:05.047Z

[tool_result] 416:                "match_confidence": conf,

### Assistant | 2026-05-15T02:53:08.296Z

Let me look at the phase16 source to verify the canonical match_confidence values and the OUT path.

### Assistant | 2026-05-15T02:53:09.815Z

[tool_use: Grep]

### User | 2026-05-15T02:53:10.451Z

[tool_result] 357:                conf = "garbage" if gc else "miss"
361:                conf = "ambiguous"
363:                conf = "exact"
365:                conf = "ambiguous"
367:                conf = "loose"

### Assistant | 2026-05-15T02:53:11.202Z

[tool_use: Grep]

### User | 2026-05-15T02:53:11.825Z

[tool_result] 7:  - v6 reads `phase20-verified-prints.jsonl` — the consolidated verified-prints
19:  phase20-verified-prints.jsonl        per verified-print-page records:
25:OUTPUTS
26:  blueprint-program-join-full-v6.jsonl  one record per normalized PN
41:PHASE20 = INDEX / "phase20-verified-prints.jsonl"
46:OUT = INDEX / "blueprint-program-join-full-v6.jsonl"
257:    Reads phase20-verified-prints.jsonl: PNs ar
... [+358 chars truncated]

### Assistant | 2026-05-15T02:53:16.074Z

Good — confirmed canonical values are exact/loose/ambiguous/miss/garbage (matches script). No "internal" appears in the conf assignments. OUT path matches. Now let me check the 08-envelope-drift.ps1 structure that's already in context — I have it from a prior read. Let me look at the install task script and the python phase20 to round out my review.

### Assistant | 2026-05-15T02:53:18.100Z

[tool_use: Grep]

### Assistant | 2026-05-15T02:53:18.377Z

[tool_use: Read]

### User | 2026-05-15T02:53:20.374Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-health\08-envelope-drift.ps1' was already read 7m ago in this session and is unchanged (mtime 1778724363679). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-15T02:53:21.758Z

[tool_result] 3:phase20-verified-prints-index.py — consolidate phase-15 deep-OCR per-page records
17:  1. Reads phase15-deep-rescan-parallel.jsonl (per-page records).
27:  5. Emits phase20-verified-prints.jsonl — one record per verified print page.
28:  6. Emits phase20-verified-prints-by-doc.jsonl — one record per doc that has
38:  H:/Tools/python/python.exe scripts/docustrata/phase20-verified-prints-index.py 
... [+371 chars truncated]

### Assistant | 2026-05-15T02:54:57.949Z

I have the file contents and all the sibling references. Time to write the review.

---

## Code Quality Analysis Report — 33-blueprint-join-refresh.ps1

### Verdict: PASS (with 2 P1 fixes recommended before next file)

The script is well-structured, mirrors `08-envelope-drift.ps1` conventions, and the docblock is honest about its self-contained nature. Validation logic, exit-code precedence, no-BOM writes, and PS 5.1 compatibility are all sound. I surfaced a handful of real bugs and one P0-borderline correctness gap.

---

### Findings

**P1 — `33-blueprint-join-refresh.ps1:190` — `$result.elapsedMs` not set on exception or on phase-script-not-found path**

The `$result.elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds` line lives AFTER the `try { } catch { } finally { }` block but BEFORE `return $result`. That's fine for the happy path, but:

1. The early return at line 154 (`if (-not (Test-Path $ScriptPath)) { ... return $result }`) bypasses it → `elapsedMs` stays at `0`.
2. The early return at line 149 (DryRun skip) bypasses it → `elapsedMs` stays at `0` (acceptable; documented as skipped).

Not catastrophic, but the "script not found" branch silently reports 0ms — operators triaging a failing scheduled task will misread that as "phase didn't run". Fix:

```powershell
if (-not (Test-Path $ScriptPath)) {
  $result.stderrTail = "phase script not found: $ScriptPath"
  $result.elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds
  return $result
}
```

Or move the `elapsedMs` calculation into the `finally` block so it covers exception + normal paths uniformly.

---

**P1 — `33-blueprint-join-refresh.ps1:314` — `if (-not $pythonBin)` will never trigger as written**

`$pythonBin` is initialized at line 97 to the literal string `"H:\Tools\python\python.exe"`. Then at lines 98-100, IF that path doesn't exist, it's reassigned to `(Get-Command python -ErrorAction SilentlyContinue).Source`. If both probes fail, `Get-Command` returns `$null` and `.Source` evaluat
... [+11217 chars truncated]
