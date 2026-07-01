---
type: "chat-session"
source: "claude-code-cli"
session_id: "2993382b-19f8-4464-9752-1eccfc734599"
title: "Review a NEW PowerShell scheduled-task installer for correctness + silent-failur"
date: "2026-06-25"
first_ts: "2026-06-25T13:55:47.342Z"
last_ts: "2026-06-25T13:57:39.853Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a026e3df75012d6fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a NEW PowerShell scheduled-task installer for correctness + silent-failur

> **claude-code-cli** | 2026-06-25 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a026e3df75012d6fd.jsonl`

## Transcript

### User | 2026-06-25T13:55:47.342Z

Review a NEW PowerShell scheduled-task installer for correctness + silent-failure risk. Read END TO END: H:/prism/scripts/install-sfc-gauntlet-task.ps1. Compare against its proven template: H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 (read the relevant parts).

PURPOSE: register a durable Windows Scheduled Task that runs `node H:/prism/scripts/sfc-jm-accuracy-refresh.mjs --json` every N hours independent of any Claude session (the operator wants the SFC-vs-ALL-JM accuracy gauntlet to "never stop"; today it's a Claude-REPL-only cron that dies when chats close).

Grade PASS/FAIL with P0/P1 + line cites. Focus on SILENT-FAILURE modes (a task that registers but never effectively runs is the worst outcome):
1. Principal: it defaults to S4U/current-user (not SYSTEM) with the rationale that the runner only READS JM files + WRITES report JSON and needs the user's H: drive mapping + ACLs. Is S4U correct here? Would SYSTEM be UNABLE to see the user's H: mapping (a real reason to NOT use SYSTEM)? Is RunLevel Highest + LogonType S4U a valid combination?
2. Triggers: -Once with -RepetitionInterval (hours) + -RepetitionDuration 3650d, plus an AtStartup trigger. Correct for an every-N-hours durable poll? Any gotcha with the two-trigger array?
3. Settings: ExecutionTimeLimit 60min, MultipleInstances IgnoreNew, RestartCount 2. Reasonable for a corpus-refresh that spans 154K rows? Could IgnoreNew + a hung run wedge it forever (no — IgnoreNew skips the new instance; confirm)?
4. The -Argument string quoting (`"$runnerScript`" --json) + -WorkingDirectory 'H:\PRISM' — will node resolve the script + its relative spawns correctly?
5. Uninstall path, admin check, runner sanity-gate (header match 'SFC-JM-ACCURACY' + '--json'), never-delete-only-disable compliance.
6. Any way this silently registers a task that never actually executes the refresh?

Be terse. PASS/FAIL + findings with line numbers.

### Assistant | 2026-06-25T13:55:53.459Z

I'll review the new installer against its proven template. Let me read both files.

### Assistant | 2026-06-25T13:55:54.332Z

[tool_use: Read]

### Assistant | 2026-06-25T13:55:54.502Z

[tool_use: Read]

### User | 2026-06-25T13:55:55.458Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM SFC Gauntlet',
3	  # Cadence of the incremental JM-accuracy refresh. The refresh is cursor-resumed
4	  # (only newly-written JM programs are re-extracted), so a few-hour cadence keeps
5	  # "test SFC vs ALL JM programs" current without thrashing. Default 6h = 4x/day.
6	  [int]$EveryHours = 6,
7	  # Phase offset (seconds) so this does not phase-lock onto the 
... [+8207 chars truncated]

### User | 2026-06-25T13:55:55.736Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
5	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
6	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
7	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+11737 chars truncated]

### Assistant | 2026-06-25T13:56:03.907Z

Now let me verify the critical claims against the actual runner script — the sanity-gate header match, the `--full`/`--json` flag support, and where it writes its output.

### Assistant | 2026-06-25T13:56:04.518Z

[tool_use: Read]

### User | 2026-06-25T13:56:05.750Z

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

### Assistant | 2026-06-25T13:56:13.642Z

The runner confirms: header line 4 has `SFC-JM-ACCURACY`, line 13 has `--json` (within the first 20 lines the sanity-gate reads), and it supports `--full` and `--json`. Now let me verify the `-WorkingDirectory` claim and check for the AtStartup-trigger collision concern with `-Once`/repetition. Let me check whether the runner's relative spawns depend on cwd or on the script's own path.

The runner uses `REPO_ROOT` derived from `import.meta.url` (line 19) and spawns children with `cwd: REPO_ROOT` (line 23) using absolute `resolve(REPO_ROOT, script)` paths — so it is cwd-independent. Let me verify the two physical concerns: the `$head -match` array behavior and whether SYSTEM can see the H: mapping is a real argument, plus check for any drive-mapping reality.

### Assistant | 2026-06-25T13:56:15.503Z

[tool_use: Bash]

### Assistant | 2026-06-25T13:56:17.527Z

[tool_use: Bash]

### User | 2026-06-25T13:56:18.789Z

[tool_result] 38a099807e [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-MATSTATE (slot:oscar): report P<->H material-STATE sensitivity (annealed vs hardened) -- the honest band range
8d679ff26e [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-CLAMP-AWARE (slot:oscar): split clamped vs unclamped aggressive flags + surface the real catches
c032259bea [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-MATERIAL-COMMENTS (slot:oscar
... [+432 chars truncated]

### User | 2026-06-25T13:56:22.808Z

[tool_result] 18:// RESUMABLE (the OCR-corpus lesson): durable row append BEFORE the cursor mark, so a
19:// reaper kill mid-run never marks a file done without its row. Re-run resumes at the
20:// cursor with zero re-reads. Cron-friendly: bounded --limit per invocation.
28:  existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync,
52:const DEFAULT_OUT = "state/shared/sfc-jm-program-corpus";
136:func
... [+652 chars truncated]

### Assistant | 2026-06-25T13:56:40.424Z

Critical finding confirmed. Both downstream scripts write to **relative** paths (`state/shared/...` — corpus line 52, analyze/physics-compare line 33-34). These relative paths resolve against the child process `cwd`, which the runner sets to `REPO_ROOT` (its own location, `H:\PRISM`), NOT the scheduled-task `-WorkingDirectory`. So output-path resolution is safe regardless of `-WorkingDirectory`. Good.

But the `net use` output reveals the load-bearing risk: **there are no entries in the network-drive list** — meaning H: is currently NOT a per-user mapped network drive on this host (it is a local/physical drive or a system-wide mapping). Let me confirm H: drive type, because the entire S4U-vs-SYSTEM rationale hinges on it.

### Assistant | 2026-06-25T13:56:43.728Z

[tool_use: Bash]

### User | 2026-06-25T13:56:47.786Z

[tool_result] Microsoft Windows [Version 10.0.22631.6199]
(c) Microsoft Corporation. All rights reserved.

H:\PRISM>---powershell drivetype---


DeviceID     : H:
DriveType    : 3
ProviderName :

### Assistant | 2026-06-25T13:56:53.116Z

Decisive. **H: is DriveType 3 (Local Disk), ProviderName empty** — it is a local/physical volume, NOT a per-user mapped network drive. This invalidates the central rationale in the installer's principal block.

Let me do a final check on the `$head -match` array-coercion behavior and the two-trigger `RepetitionDuration` edge that the template also uses (so I can confirm whether it's proven or a shared latent issue).

### Assistant | 2026-06-25T13:56:57.811Z

[tool_use: Bash]

### User | 2026-06-25T13:57:01.525Z

[tool_result] MATCH-OK (array -match returns matching elements, truthy)
SFC-JM-ACCURACY present in head: True
--json present in head: True

### Assistant | 2026-06-25T13:57:39.853Z

Sanity gate verified: `Get-Content -TotalCount 20` returns an array, `-match` over an array returns matching elements (truthy), and both tokens (`SFC-JM-ACCURACY` line 4, `--json` line 13) fall within the first 20 lines. The gate works.

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: The installer is a faithful, correctly-adapted clone of the proven fleet-reaper template. Output-path resolution is safe (the runner forces child `cwd: REPO_ROOT` and uses absolute script paths, so `-WorkingDirectory` is irrelevant to where reports land), the sanity-gate matches the real runner's header, `--full`/`--json` are genuinely supported, and the two-trigger + IgnoreNew + RestartCount settings are sound. There are no P0/P1 silent-failure modes. The one substantive issue is a P2: the S4U-vs-SYSTEM rationale rests on a factual claim ("H: is a user drive mapping SYSTEM can't see") that this host contradicts — H: is a local disk — but the chosen principal (S4U) still works, so it's a doc/justification defect, not a break.

findings:
  - [P2] `install-sfc-gauntlet-task.ps1:18,128-129` -- The principal rationale ("SYSTEM also may not see the user's H: drive mapping") is FALSE on this host: `Get-CimInstance Win32_LogicalDisk H:` returns DriveType=3 (Local Disk), empty ProviderName, and `net use` lists no network connections. H: is a physical/local volume, visible identically to SYSTEM and S4U. The S4U choice is still **correct and harmless** (current-user ACLs cover read JM + write report JSON; no kill privilege needed; RunLevel Highest + LogonType S4U is a valid, common combination), so the task runs fine — but the stated reason is wrong and could mislead a future operator into rejecting SYSTEM for a non-reason. Fix: soften the comment to "S4U avoids needing a stored password and matches the installing user's file ACLs" and drop the H:-mapping claim (or gate it behind an actual `DriveType -eq 4` check).
  - [P2] `install-sfc-gauntlet-task.ps1:91,154` -- Th
... [+3839 chars truncated]
