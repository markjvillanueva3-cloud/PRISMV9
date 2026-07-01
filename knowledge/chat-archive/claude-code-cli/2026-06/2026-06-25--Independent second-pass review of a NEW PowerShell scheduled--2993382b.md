---
type: "chat-session"
source: "claude-code-cli"
session_id: "2993382b-19f8-4464-9752-1eccfc734599"
title: "Independent second-pass review of a NEW PowerShell scheduled-task installer. Rea"
date: "2026-06-25"
first_ts: "2026-06-25T13:55:58.608Z"
last_ts: "2026-06-25T13:57:18.068Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a825597c650ee1439.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of a NEW PowerShell scheduled-task installer. Rea

> **claude-code-cli** | 2026-06-25 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a825597c650ee1439.jsonl`

## Transcript

### User | 2026-06-25T13:55:58.608Z

Independent second-pass review of a NEW PowerShell scheduled-task installer. Read END TO END: H:/prism/scripts/install-sfc-gauntlet-task.ps1. Do NOT assume the other reviewer caught everything — weight toward security, foot-guns, and convention conformance with the sibling H:/prism/.claude/helpers/install-fleet-reaper-task.ps1.

CONTEXT: it registers a Windows task running `node scripts/sfc-jm-accuracy-refresh.mjs --json` every N hours so the SFC-vs-JM accuracy gauntlet runs independent of Claude sessions. The runner is read-only over JM files (writes only report JSON + a resume cursor).

Answer with PASS/FAIL + P0/P1/P2 + line cites:
1. SECURITY: any injection/path risk in how $nodeExe / $runnerScript / args are passed to New-ScheduledTaskAction? Hardcoded H:\PRISM paths — acceptable (matches the reaper) or a risk?
2. Does it claim "read-only" but actually run something that could mutate beyond reports? (The runner spawns sfc-jm-program-corpus.mjs + sfc-jm-corpus-analyze.mjs — confirm those only write the corpus/report, not source.)
3. CONVENTION: does it faithfully mirror the reaper installer's safety affordances (elevation check, -Uninstall, sanity-gate, StartWhenAvailable, restart self-heal, phase offset to avoid colliding with the +60/+210/+330s host-task cluster)? The chosen +420s offset — does it actually avoid collisions?
4. Is defaulting to S4U/current-user (vs the reaper's SYSTEM) the right call for a read/analyze task, or a mistake?
5. Any correctness gap that would make the task fail on this host (portable node at H:\Tools\nodejs\node.exe, working dir, etc.)?
6. ASCII-only (no smart-substitution chars that break PS 5.1)?

Terse. PASS/FAIL + findings.

### Assistant | 2026-06-25T13:56:04.954Z

I'll review the installer end-to-end, plus the sibling reaper installer and the runner scripts it spawns.

### Assistant | 2026-06-25T13:56:05.637Z

[tool_use: Read]

### Assistant | 2026-06-25T13:56:05.701Z

[tool_use: Read]

### User | 2026-06-25T13:56:06.434Z

[tool_result] read-once-guard: 'H:\prism\scripts\install-sfc-gauntlet-task.ps1' was already read 11s ago in this session and is unchanged (mtime 1782395688560). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:56:06.605Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-reaper-task.ps1' was already read 11s ago in this session and is unchanged (mtime 1780363918287). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-25T13:56:10.277Z

The files are already in my context. Let me read the runner scripts it spawns to verify the read-only claim.

### Assistant | 2026-06-25T13:56:10.378Z

[tool_use: Read]

### User | 2026-06-25T13:56:11.518Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/sfc-jm-accuracy-refresh.mjs
3	//
4	// SFC-JM-ACCURACY -- one-call refresh of the JM-program SFC accuracy pipeline:
5	//   1. sfc-jm-program-corpus.mjs  (INCREMENTAL by default -- resumes at cursor,
6	//      picks up newly-written JM programs; --full re-extracts everything)
7	//   2. sfc-jm-corpus-analyze.mjs  (re-flags outliers + gross-physical errors)
8	//
9	//
... [+2444 chars truncated]

### Assistant | 2026-06-25T13:56:20.327Z

The refresh runner spawns three scripts: corpus, analyze, and physics-compare (the prompt only mentioned the first two — physics-compare is a third spawn I need to verify). Let me read all three plus check the installer file is in context.

### Assistant | 2026-06-25T13:56:20.797Z

[tool_use: Read]

### User | 2026-06-25T13:56:21.892Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/sfc-jm-program-corpus.mjs
3	//
4	// SFC-JM-ACCURACY -- build the "as-programmed parameter corpus" by running the NC
5	// cutting-parameter extractor (scripts/lib/sfc-program-param-extract-lib.mjs) over
6	// EVERY posted-G-code program in H:/PRISM/JM DIE/. This is the data-production half
7	// of the operator goal "utilize ALL JM die parts and programs first to ru
... [+13533 chars truncated]

### Assistant | 2026-06-25T13:56:22.025Z

[tool_use: Read]

### Assistant | 2026-06-25T13:56:22.263Z

[tool_use: Read]

### User | 2026-06-25T13:56:23.518Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/sfc-jm-corpus-analyze.mjs
3	//
4	// SFC-JM-ACCURACY -- analyze the as-programmed JM parameter corpus
5	// (sfc-jm-program-corpus.mjs output) and surface the programs whose programmed
6	// speeds/feeds the shop's OWN body of work + basic physics disagree with. These
7	// are the operator's "amateur-written, use as the guideline to TEST AGAINST"
8	// candidates: th
... [+7454 chars truncated]

### User | 2026-06-25T13:56:23.735Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/sfc-jm-physics-compare.mjs
3	//
4	// SFC-JM-ACCURACY -- the PHYSICS test-against: for every JM lathe G96 CSS op in
5	// the corpus, compare the PROGRAMMED cutting speed to PRISM's canonical Taylor
6	// tool-life recommendation for the inferred material. Answers the operator's
7	// "verify the SFC calculations are correct ... use the [amateur] programs as the
8	//
... [+10431 chars truncated]

### Assistant | 2026-06-25T13:56:30.185Z

I've confirmed the three spawned scripts are write-confined (program-params.jsonl, processed-cursor.txt, SUMMARY.json, SFC-JM-CORPUS-ANALYSIS.json, SFC-JM-PHYSICS-COMPARE.json — all under `state/shared/`; reads of JM files are `latin1` read-only). Now I need the installer itself in context. The read-once guard says it's already in my context, but I don't actually have its content visible. Let me read it with an offset to bypass the cache and see the actual content.

### Assistant | 2026-06-25T13:56:30.790Z

[tool_use: Read]

### User | 2026-06-25T13:56:32.364Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM SFC Gauntlet',
3	  # Cadence of the incremental JM-accuracy refresh. The refresh is cursor-resumed
4	  # (only newly-written JM programs are re-extracted), so a few-hour cadence keeps
5	  # "test SFC vs ALL JM programs" current without thrashing. Default 6h = 4x/day.
6	  [int]$EveryHours = 6,
7	  # Phase offset (seconds) so this does not phase-lock onto the 
... [+8207 chars truncated]

### Assistant | 2026-06-25T13:56:36.422Z

Now I have the full installer in context. Let me check the reaper sibling's specific affordances to compare convention conformance, particularly the phase offset cluster and S4U/SYSTEM details.

### Assistant | 2026-06-25T13:56:38.623Z

[tool_use: Grep]

### User | 2026-06-25T13:56:39.971Z

[tool_result] 9:  [int]$StartOffsetSeconds = 210,
20:  # Conservative opt-out: run as the current user (S4U logon — current user's
21:  # context, no stored password) instead of the default SYSTEM. S4U can reap
24:  # reaper was failing to kill. Use only if a SYSTEM-context reaper is
27:  # Back-compat: SYSTEM is now the DEFAULT principal (see the principal block
91:# Sanity: confirm the script is the slot-awar
... [+1859 chars truncated]

### Assistant | 2026-06-25T13:56:43.543Z

I now have everything needed. Let me check whether the `$head -match` array semantics work and whether the offset cluster is accurate by checking what host tasks exist.

### Assistant | 2026-06-25T13:56:45.149Z

[tool_use: Grep]

### User | 2026-06-25T13:56:46.927Z

[tool_result] knowledge\extract_knowledge.ps1:20:    @{ version = 1; entry_count = 0; last_updated = ""; entries = @(); by_phase = @{}; by_type = @{} }
knowledge\extract_knowledge.ps1:39:Type: $($entry.type) | Phase: $($entry.phase) | MS: $($entry.milestone)
knowledge\extract_knowledge.ps1:56:    # Update by_phase index
knowledge\extract_knowledge.ps1:57:    $phase = $entry.phase
knowledge\extract_knowledge.ps1
... [+4628 chars truncated]

### Assistant | 2026-06-25T13:57:18.068Z

The +60/+210/+330 cluster claim is from the reaper docstrings (reaper +210, memory-monitor +330, task-health +60 per CLAUDE.md). The reaper installer uses +210. +420 sits clear of that cluster. I have everything I need.

VERDICT: PASS

summary: The installer faithfully mirrors the reaper sibling's safety affordances (elevation check, `-Uninstall`, 20-line sanity-gate, `StartWhenAvailable`, `RestartCount` self-heal, `AtStartup` resume, phase offset) and correctly diverges from it where the task profile differs (S4U default instead of SYSTEM is correct for a read/analyze task). I verified all three spawned runners are write-confined to `state/shared/` reports + cursor and read JM files read-only (`latin1`, no writes to source). No injection, path, or correctness defect would fail this on the host. Findings are P2-only.

findings:
- [P2] `install-sfc-gauntlet-task.ps1:91` -- `$refreshArgs` is built as a single interpolated string (`"`"$runnerScript`" --json"`) and handed to `-Argument`. This works (the path is hardcoded, no untrusted input, double-quoting handles the `PRISM`/`JM DIE` space), but the reaper passes its argument the same way so it is convention-consistent. Not a security risk: `$runnerScript` is a hardcoded literal (`:62`), never user-supplied, and the only variable surface (`$Full`) toggles a fixed `--full` token. No fix required; noting for parity audit only.
- [P2] `install-sfc-gauntlet-task.ps1:86-89` -- the sanity-gate reads `Get-Content -TotalCount 20` into `$head` (a string array) and tests `($head -match 'SFC-JM-ACCURACY')`. PowerShell `-match` on an array returns the matching elements (truthy if any line matches), so the gate is correct, but `SFC-JM-ACCURACY` first appears on line 4 and `--json` appears in the line-13 USAGE comment of the runner -- both within the 20-line window (verified against `sfc-jm-accuracy-refresh.mjs:4,13`). The gate is real and would fail loud on a wrong/renamed runner. Margin is thin (USAGE at line 13 of 20); if the run
... [+2556 chars truncated]
