---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Final confirmation review of H:/prism/.claude/helpers/install-fleet-task-health-"
date: "2026-06-17"
first_ts: "2026-06-17T15:59:11.119Z"
last_ts: "2026-06-17T16:00:10.818Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-abe651aaf862b5041.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Final confirmation review of H:/prism/.claude/helpers/install-fleet-task-health-

> **claude-code-cli** | 2026-06-17 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-abe651aaf862b5041.jsonl`

## Transcript

### User | 2026-06-17T15:59:11.119Z

Final confirmation review of H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (read end-to-end). A prior round flagged that the prose falsely said the G10 auto-re-enable is "suppressed under an active migration freeze" -- which is FALSE because selectReenableTargets in H:/prism/scripts/fleet-task-health-watch.mjs (lines ~1170-1188) deliberately does NOT gate on the migration freeze (only EXPECTED_DISABLED_TASKS + crash-critical membership gate it; the freeze gate was removed after it neutered the guard for weeks).

Confirm BOTH of these now read accurately (no remaining false freeze-suppression claim):
1. The header comment block (around lines 56-68).
2. The registered-task $desc string (the line building $desc).
The accurate gates are: (a) task Disabled, (b) in CRASH_CRITICAL_TASKS, (c) NOT in EXPECTED_DISABLED_TASKS, plus PRISM_FTH_AUTO_REENABLE_DISABLE=1 / -DryRun off-switches; a migration freeze does NOT suppress a crash-critical re-enable.

Also confirm no NEW inaccuracy/ASCII-violation/PowerShell-syntax-break introduced by the edits, and that the previously-closed items remain closed (knob in footer, ExecutionTimeLimit 180s, "never kills/registers, only Enable never Disable" accurate). Grade PASS or FAIL with line citations. Read-only.

### Assistant | 2026-06-17T15:59:16.392Z

I'll review the PowerShell installer file end-to-end, then cross-check the gating logic against the watch script it documents.

### Assistant | 2026-06-17T15:59:17.558Z

[tool_use: Read]

### Assistant | 2026-06-17T15:59:17.773Z

[tool_use: Read]

### User | 2026-06-17T15:59:18.682Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Task Health',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) so this task does not phase-lock onto the existing
5	  # 5-min host tasks. Cycle positions already taken (offset mod 300s):
6	  #   "PRISM Cleanup Orchestrator"      ~+60s
7	  #   "Memory Pressure Auto-Relief"     ~+120s
8	  #   "PRISM Fleet Reaper"              +210s (install-fleet
... [+13748 chars truncated]

### User | 2026-06-17T15:59:18.987Z

[tool_result] 1140	/**
1141	 * Select the crash-critical tasks that are SAFE to auto-re-enable.
1142	 *
1143	 * The recurring failure (precedent 2bc54961b re-enabled 7; 2026-06-09 re-enabled
1144	 * an 8th, "PRISM Zombie Reaper v2"): a crash-critical reaper silently lands in
1145	 * the Disabled state (Windows update, a peer disable, a crash mid-registration).
1146	 * Until now the watchdog only NAGGED -- a WAR
... [+4185 chars truncated]

### Assistant | 2026-06-17T15:59:34.038Z

I have both files. Let me verify the two specific claims about gating logic against the watch script, and confirm the previously-closed items.

**1. Header comment block (lines 56-68):**
- Line 56-57: "The watchdog NEVER kills a process and NEVER REGISTERS a task, and only ever Enable-ScheduledTask (never Disable)." — matches `selectReenableTargets` (returns only enable candidates, line 1164 "NEVER selects a task to disable") and `reenableTasks` (only `Enable-ScheduledTask`, line 1217). Accurate.
- Lines 58-61: G10 fires for a task that is "(a) Disabled, (b) crash-critical, and (c) NOT in the watch script's EXPECTED_DISABLED_TASKS allowlist" — matches the exact predicate at line 1182: `t.status === "disabled" && crash.has(name) && !expected.has(name)`. Accurate.
- Lines 61-62: "entirely off when PRISM_FTH_AUTO_REENABLE_DISABLE=1 or in -DryRun" — knob name matches the footer (line 223). Accurate.
- Lines 62-65: "a migration freeze does NOT suppress this path -- a crash-critical task is load-bearing, so the watch deliberately re-enables it even mid-freeze (a prior freeze gate was removed after it neutered the guard for weeks)." — this is now CORRECT and matches the watch script JSDoc (lines 1149-1159: "The HW-migration freeze is deliberately NOT a gate here... A prior blanket `if (freeze) return []` made this guard a no-op for the entire weeks-long HW-migration freeze") and the code comment at line 1172 ("migrationFreezeActive is intentionally NOT consulted"). The previously-flagged FALSE claim is GONE.
- Lines 65-66: "To keep a crash-critical task disabled on purpose, add it to EXPECTED_DISABLED_TASKS or set the knob." — matches the `!expected.has(name)` gate and the knob. Accurate.

**2. The `$desc` string (line 166):**
"DOES self-heal by re-enabling a disabled crash-critical task NOT in EXPECTED_DISABLED_TASKS (G10 -- fires even during a migration freeze, since a crash-critical task is load-bearing; set PRISM_FTH_AUTO_REENABLE_DISABLE=1 or use -DryRun for detect-an
... [+459 chars truncated]

### Assistant | 2026-06-17T15:59:36.105Z

[tool_use: Grep]

### Assistant | 2026-06-17T15:59:36.934Z

[tool_use: Grep]

### User | 2026-06-17T15:59:39.117Z

[tool_result] 57: *   node fleet-task-health-watch.mjs --once --json   # one audit, JSON
58: *   node fleet-task-health-watch.mjs --status        # read ledger, no audit
62: *   node fleet-task-health-watch.mjs --dry-run       # full audit, never write
128:export const CRASH_CRITICAL_TASKS = [
170: * be mirrored into MUST_EXIST_TASKS / CRASH_CRITICAL_TASKS / KNOWN_PRISM_TASKS
304:export const EXPECTED_DISABLED_
... [+1242 chars truncated]

### User | 2026-06-17T15:59:40.111Z

[tool_result] No matches found

### Assistant | 2026-06-17T15:59:45.541Z

The `export const CRASH_CRITICAL_TASKS = [` is at line 128. Let me verify the count of crash-critical tasks (the ExecutionTimeLimit comment at line 141 claims "7 CRASH_CRITICAL_TASKS") and confirm the knob name and the `Out-Null`/exit-code contract.

### Assistant | 2026-06-17T15:59:45.975Z

[tool_use: Read]

### User | 2026-06-17T15:59:46.514Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-task-health-watch.mjs' (same offset/limit) was already read 4m ago in this session and is unchanged (mtime 1781235190212). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-17T15:59:49.381Z

The guard is mistaken about the offset overlap (I read 1140-1219 earlier, not 128-172). Let me grep the specific range instead to count the crash-critical entries.

### Assistant | 2026-06-17T15:59:49.815Z

[tool_use: Read]

### User | 2026-06-17T15:59:51.101Z

[tool_result] 128	export const CRASH_CRITICAL_TASKS = [
129	  "PRISM Fleet Reaper",
130	  "PRISM Fleet Memory Monitor",
131	  "PRISM Cleanup Orchestrator",
132	  "PRISM Node Orphan Cleaner",
133	  "PRISM WSL Memory Guard",
134	  "PRISM Zombie Reaper v2",
135	  "PRISM Zulu Orchestrator",
136	  // 2026-06-08 MCP-FLEET-CAPACITY-MS0 (slot:sierra): added "PRISM WSL Memory
137	  // Guard" — charlie's vmmemWSL commit-
... [+2299 chars truncated]

### Assistant | 2026-06-17T16:00:10.818Z

`CRASH_CRITICAL_TASKS` now has **7 entries** (lines 129-135: Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, Node Orphan Cleaner, WSL Memory Guard, Zombie Reaper v2, Zulu Orchestrator). The ExecutionTimeLimit comment at installer line 141 says "With 7 CRASH_CRITICAL_TASKS that is up to ~7x15s = 105s" — the count matches the live array. Accurate.

I now have everything needed to grade. All claims verified against the live watch script.

---

VERDICT: PASS

summary: The previously-flagged false freeze-suppression claim is fully corrected in BOTH locations — the header comment (lines 62-65) and the `$desc` string (line 166) now accurately state that a migration freeze does NOT suppress the G10 crash-critical re-enable, matching `selectReenableTargets` (`fleet-task-health-watch.mjs:1170-1188`, predicate `disabled && crash.has && !expected.has`, with `migrationFreezeActive` deliberately not consulted per the line-1172 comment and the JSDoc lines 1149-1159). No new inaccuracy, ASCII violation, or PowerShell-syntax break was introduced, and all previously-closed items remain closed.

findings: none

Audit detail (so the PASS is verifiable):
- `install-fleet-task-health-task.ps1:60-61` — G10 gates stated as "(a) Disabled, (b) crash-critical, (c) NOT in EXPECTED_DISABLED_TASKS" exactly match the predicate at `fleet-task-health-watch.mjs:1182`. Accurate.
- `install-fleet-task-health-task.ps1:62-66` — "a migration freeze does NOT suppress this path... a prior freeze gate was removed after it neutered the guard for weeks" matches the watch-script JSDoc (`:1149-1159`) and the inline comment (`:1172`). The prior false claim is gone.
- `install-fleet-task-health-task.ps1:166` ($desc) — "fires even during a migration freeze, since a crash-critical task is load-bearing" plus both off-switches (`PRISM_FTH_AUTO_REENABLE_DISABLE=1` / `-DryRun`) are consistent with the watch-script knob check at `:1292`. No false freeze-suppression claim remains.
- Knob name `PRISM_FTH_AUTO_RE
... [+1416 chars truncated]
