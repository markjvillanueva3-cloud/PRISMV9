---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "SCRUTINY AXIS A9 — OBSOLETE SETTINGS & CONFIG (settings.json + env knobs + sched"
date: "2026-05-17"
first_ts: "2026-05-17T04:27:04.309Z"
last_ts: "2026-05-17T04:29:17.277Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a21000746ffc31006.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SCRUTINY AXIS A9 — OBSOLETE SETTINGS & CONFIG (settings.json + env knobs + sched

> **claude-code-cli** | 2026-05-17 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a21000746ffc31006.jsonl`

## Transcript

### User | 2026-05-17T04:27:04.309Z

SCRUTINY AXIS A9 — OBSOLETE SETTINGS & CONFIG (settings.json + env knobs + scheduled tasks)

You are agent 9 of 10 in juliett's `/forge7` scrutiny pass. Your axis: settings/config that's no longer relevant.

CONTEXT: User explicitly asked "find obsolete current setups and settings". PRISM has many config surfaces:
- `H:/PRISM/.claude/settings.json` + `C:/Users/wompu/.claude/settings.json` (mirrored)
- ~50+ `PRISM_*` env knobs scattered across CLAUDE.md
- Windows scheduled tasks (PRISM Fleet Reaper, PRISM Fleet Memory Monitor, PRISM Cleanup Orchestrator)
- `mcp-server/data/state/*.json` configs
- `state/shared/omega-thresholds.json`
- `PRISM_GOLF_*` knobs (some explicitly NOT IMPLEMENTED per recent OBSOLESCENCE-CLEANUP-MS0/U-OBS-C1)

Recent regressions show config drift class:
- `PRISM_SLOT_TASK_CLAIM_DISABLE=1` was documented but never implemented (removed by U-OBS-C1)
- alpha-slot-reaper-guardian SUPERSEDED by golf-slot — back-compat alias kept, but is the original still wired?

YOUR JOB: find obsolete settings/config — knobs that don't connect to code, hooks wired-but-superseded, scheduled tasks for removed features.

EVIDENCE SOURCES:
1. `H:/PRISM/.claude/settings.json` (full read)
2. `C:/Users/wompu/.claude/settings.json` (full read) — verify byte-equal mirror
3. Grep all `PRISM_*` env knobs from CLAUDE.md (both project + global)
4. For each knob, grep code to find the read site (`process.env.PRISM_*`)
5. Windows scheduled tasks: `schtasks /Query /FO LIST /V | grep -i prism`
6. `mcp-server/data/state/*.json` listing
7. Recent OBSOLESCENCE-CLEANUP-MS0 commits: `git -C H:/prism log --oneline -10 --grep OBSOLESCENCE`
8. `state/shared/.fleet-reaper-actions.jsonl`

LOOK FOR:
- PRISM_* knobs documented but never read by any file
- PRISM_* knobs read by deleted code paths
- Hooks wired in settings.json but their .mjs file is missing
- Hooks wired with `_disabled_by:` flag still — should they be archived?
- Scheduled tasks for hooks/scripts that no longer exist
- Duplic
... [+824 chars truncated]

### Assistant | 2026-05-17T04:27:14.549Z

I'll scan for obsolete settings and config across the surfaces listed.

### Assistant | 2026-05-17T04:27:16.648Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:17.664Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:19.235Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:20.817Z

[tool_use: Grep]

### Assistant | 2026-05-17T04:27:24.093Z

[tool_use: Grep]

### User | 2026-05-17T04:27:32.032Z

[tool_result] 36255
36255
BYTE-EQUAL: YES

### User | 2026-05-17T04:27:43.393Z

[tool_result] (Bash completed with no output)

### User | 2026-05-17T04:27:47.412Z

[tool_result] 144:PRISM_GOLF_DISABLE
144:PRISM_GOLF_FAIL_CLOSED
144:PRISM_GOLF_WRITE_ALLOWLIST_BYPASS

### User | 2026-05-17T04:27:47.454Z

[tool_result] 20:PRISM_SHARED_INDEX_SURFACES
22:PRISM_BUILD_STATE_INJECT
59:PRISM_SCRUTINY_GIT_TIMEOUT_MS
59:PRISM_SCRUTINY_NO_DIFF_FILTER
76:PRISM_HOOK_PROFILE
109:PRISM_SLOT_TASK_ADVISORY_
109:PRISM_SLOT_TASK_CLAIM_DISABLE
117:PRISM_AUTO_RESUME_MAX_AGE_MIN
117:PRISM_AUTO_RESUME_DISABLE
118:PRISM_TERMINAL_PIN_DISABLE
118:PRISM_TERMINAL_PIN_VERBOSE
120:PRISM_TWID_CACHE_FILE
120:PRISM_TWID_CACHE_DISABLE
120:PRIS
... [+1433 chars truncated]

### User | 2026-05-17T04:27:55.668Z

[tool_result] 35ad678870 [MAIN] [HTML-PRIMARY-MS0][HTML-COMPANION-MS0]/CLOSE-OUT: flip envelope status — HTML stack 7/7 + 3/4 shipped (U-HTML-CLAUDE-MD-EDIT deferred peer-claim)
7b50cb5690 [MAIN] [FLEET-MEMORY-MONITOR-MS0]/U-FMM01: 5-min RAM monitor + claude.exe-tree attribution
04e512cbe6 [MAIN] [OBSOLESCENCE-CLEANUP-MS0]/U-OBS-A4: tribal-noise quarantine (326 auto-ingested-tips → quarantine/)
996e42d9a4 [MAIN
... [+567 chars truncated]

### Assistant | 2026-05-17T04:28:00.305Z

Acknowledged. Continuing analysis using direct file reads where index doesn't apply (env knob grep is not in dispatcher digest scope).

### Assistant | 2026-05-17T04:28:02.440Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:28:05.618Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:28:06.790Z

[tool_use: Grep]

### User | 2026-05-17T04:28:22.755Z

[tool_result] Status:                               Ready
Last Run Time:                        11/30/1999 12:00:00 AM
Task To Run:                          C:\Program Files\AMD\CIM\Bin64\InstallManagerApp.exe -AMDLinkUpdate
Status:                               Running
Last Run Time:                        5/16/2026 6:08:58 PM
Task To Run:                          C:\Program Files 
(x86)\SanDisk\Dashboar
... [+3710 chars truncated]

### User | 2026-05-17T04:28:34.618Z

[tool_result] TaskName                            State LastRun               
--------                            ----- -------               
PRISM Cleanup Orchestrator          Ready 5/16/2026 11:28:28 PM 
PRISM Fleet Memory Monitor          Ready 5/16/2026 11:27:27 PM 
PRISM Fleet Reaper                  Ready 5/16/2026 11:28:28 PM 
PRISM Hook Janitor                  Ready 5/16/2026 11:27:27 PM 
PRIS
... [+1048 chars truncated]

### User | 2026-05-17T04:28:35.156Z

[tool_result] CONTEXT AT 1,082,630 TOKENS — PRECOMPACT HARD THRESHOLD (940,000)

You are 0 tokens from the 1M hard cap.
You MUST run /precompact NOW before any more tool calls.

Steps:
  1. Invoke the precompact skill via the Skill tool with skill="precompact".
  2. After /precompact completes, the user runs /compact (auto-enforced by Stop hook).

This block was issued because continuing work now risks overflow
... [+50 chars truncated]

### Assistant | 2026-05-17T04:29:17.277Z

I have enough evidence to deliver findings. Returning analysis now (skipping further tool calls per the hard threshold notice).

## A9 — OBSOLETE SETTINGS/CONFIG FINDINGS

### F1: 8 PRISM scheduled tasks running — overlapping reaper/cleanup coverage
- Evidence: `schtasks` returns PRISM Cleanup Orchestrator, Fleet Memory Monitor, Fleet Reaper, Hook Janitor, Node Orphan Cleaner, Orphan Process Reaper (PS), Synergy Regression Watch, Zombie Reaper v2 — all `Ready` and recently fired.
- Impact: At least 3 overlap conceptually (Node Orphan Cleaner + Orphan Process Reaper (PS) + Zombie Reaper v2 are all process-reapers; Fleet Reaper MS1 was supposed to supersede them per CLAUDE.md "additive — does NOT replace" caveat that's now stale). Hook Janitor purpose unclear vs Cleanup Orchestrator.
- Recommendation: P1 — audit each task's `Task To Run` script; archive Zombie Reaper v2 + Node Orphan Cleaner + Orphan Process Reaper (PS) if Fleet Reaper MS1 covers their cases. Document in CLAUDE.md which task owns which responsibility.
- Priority: **P1**

### F2: `PRISM_ALPHA_GUARDIAN_*` knobs preserved as back-compat alias but doctrine SUPERSEDED
- Evidence: CLAUDE.md lines 556+558 still document `PRISM_ALPHA_GUARDIAN_DISABLE` + `PRISM_ALPHA_GUARDIAN_NO_SWEEP`. Doctrine section (MEMORY.md `[GOLF owns reaper (SUPERSEDES alpha)]`) confirms `alpha-slot-reaper-guardian.mjs` is UNWIRED but preserved on disk per [[feedback_never_delete_only_disable]].
- Impact: Operators reading CLAUDE.md will set the alpha knob expecting effect; only the golf knob now controls behavior. The alias claim "still respected" needs verification — if `alpha-slot-reaper-guardian.mjs` is unwired, the env var read is dead code.
- Recommendation: P2 — mark both alpha knobs as `[SUPERSEDED → use PRISM_GOLF_GUARDIAN_*]` in CLAUDE.md §FLEET-REAPER-MS1, or remove the alpha entries entirely. Match the U-OBS-C1 cleanup pattern.
- Priority: **P2**

### F3: `PRISM_TWID_TIMEOUT_MS` documented at line 120 but supersedence path
... [+3471 chars truncated]
