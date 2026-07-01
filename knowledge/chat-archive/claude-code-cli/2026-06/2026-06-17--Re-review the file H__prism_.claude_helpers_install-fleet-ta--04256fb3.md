---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Re-review the file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 ("
date: "2026-06-17"
first_ts: "2026-06-17T15:55:55.797Z"
last_ts: "2026-06-17T15:57:04.413Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a3053bb2f343df60c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Re-review the file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (

> **claude-code-cli** | 2026-06-17 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a3053bb2f343df60c.jsonl`

## Transcript

### User | 2026-06-17T15:55:55.797Z

Re-review the file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (read end-to-end). A prior review FAILED it on 3 P1s now claimed fixed; confirm closure + no regressions/new issues.

The 3 P1s that were fixed:
1. The header comment + the registered-task Description previously said "Advisory only -- never kills, never auto-registers" -- INACCURATE because the live `--once` path has a G10 auto-re-enable that calls Enable-ScheduledTask on disabled crash-critical tasks (gated by PRISM_FTH_AUTO_REENABLE_DISABLE, default-on; suppressed under migration freeze / EXPECTED_DISABLED). Verify the header (around lines 56-63) AND the $desc string now accurately state: never kills/registers, BUT self-heals by re-enabling disabled crash-critical tasks (with the freeze/EXPECTED_DISABLED/knob/DryRun gating). No remaining false "advisory only / never auto-registers" absolute.
2. The knobs Write-Host footer previously omitted PRISM_FTH_AUTO_REENABLE_DISABLE. Verify it is now listed (detect-and-advise-only).
3. ExecutionTimeLimit was 120s, too tight for the worst-case re-enable fan-out (up to 7 crash-critical x 15s serial powershell spawns + 15s sampler). Verify it is now 180s and the comment explains the fan-out math.

Also re-confirm the still-good properties: faithful clone of install-fleet-memory-monitor-task.ps1, ASCII-only (no em-dash/smart-quote/unicode), --once invocation, RunNow exit-code mapping 0/1/2/3/267009 framing exit 1/2 as a FLEET FINDING, head-sanity guard, +270s offset clear of siblings, Force idempotent, canonical main-tree path, elevation guard `(-not isAdmin -and -not Interactive)` correct.
Grade PASS or FAIL with P0/P1/P2 + line citations. Read-only.

### Assistant | 2026-06-17T15:56:01.849Z

I'll review the file end-to-end, then verify the sibling it clones from.

### Assistant | 2026-06-17T15:56:02.330Z

[tool_use: Read]

### Assistant | 2026-06-17T15:56:02.631Z

[tool_use: Read]

### User | 2026-06-17T15:56:03.353Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-memory-monitor-task.ps1' was already read 19m ago in this session and is unchanged (mtime 1780363914109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-17T15:56:03.746Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Task Health',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) so this task does not phase-lock onto the existing
5	  # 5-min host tasks. Cycle positions already taken (offset mod 300s):
6	  #   "PRISM Cleanup Orchestrator"      ~+60s
7	  #   "Memory Pressure Auto-Relief"     ~+120s
8	  #   "PRISM Fleet Reaper"              +210s (install-fleet
... [+13184 chars truncated]

### Assistant | 2026-06-17T15:56:08.750Z

I have the full file content. The sibling memory-monitor script is already in context. Let me verify the two load-bearing claims I cannot confirm from the installer alone: the watch script's exit-code semantics, the `--once` flag, `CRASH_CRITICAL_TASKS` count (7), the `PS_TIMEOUT_MS` default (15s), and the `PRISM_FTH_AUTO_REENABLE_DISABLE` knob behavior. These underpin the fan-out math (P1.3) and the knob description (P1.2).

### Assistant | 2026-06-17T15:56:10.417Z

[tool_use: Grep]

### User | 2026-06-17T15:56:12.223Z

[tool_result] 57: *   node fleet-task-health-watch.mjs --once --json   # one audit, JSON
69: *   PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS=N      PowerShell query timeout (default 15000)
112:export const DEFAULT_PS_TIMEOUT_MS = 15_000;
128:export const CRASH_CRITICAL_TASKS = [
170: * be mirrored into MUST_EXIST_TASKS / CRASH_CRITICAL_TASKS / KNOWN_PRISM_TASKS
210:  "PRISM Vault Memory Promotion Cron",     // MCP-FLE
... [+3921 chars truncated]

### Assistant | 2026-06-17T15:56:14.967Z

Let me verify the `CRASH_CRITICAL_TASKS` count is exactly 7 and confirm the exit-code semantics and `--once` exit path.

### Assistant | 2026-06-17T15:56:15.956Z

[tool_use: Read]

### Assistant | 2026-06-17T15:56:16.881Z

[tool_use: Read]

### User | 2026-06-17T15:56:16.937Z

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
... [+2474 chars truncated]

### User | 2026-06-17T15:56:20.357Z

[tool_result] 1196	 * Re-enable each named scheduled task via `Enable-ScheduledTask`. NON-elevated
1197	 * succeeds for user-owned PRISM tasks (verified 2026-06-09 on "PRISM Zombie
1198	 * Reaper v2"); a task whose principal needs elevation returns ok:false WITH the
1199	 * error so the caller surfaces the elevated one-liner instead of lying that it
1200	 * healed (R12). Side-effecting but `_spawn`-injectable f
... [+1800 chars truncated]

### Assistant | 2026-06-17T15:56:25.007Z

I now have everything needed to verify all three claims plus the still-good properties. Let me confirm the exit-code semantics in the watch script (the `--once` exit path) and check that `selectReenableTargets` is gated by EXPECTED_DISABLED + freeze, then verify the `--once` exit-code mapping matches.

### Assistant | 2026-06-17T15:56:25.749Z

[tool_use: Read]

### User | 2026-06-17T15:56:26.800Z

[tool_result] 1140	/**
1141	 * Select the crash-critical tasks that are SAFE to auto-re-enable.
1142	 *
1143	 * The recurring failure (precedent 2bc54961b re-enabled 7; 2026-06-09 re-enabled
1144	 * an 8th, "PRISM Zombie Reaper v2"): a crash-critical reaper silently lands in
1145	 * the Disabled state (Windows update, a peer disable, a crash mid-registration).
1146	 * Until now the watchdog only NAGGED -- a WAR
... [+2774 chars truncated]

### Assistant | 2026-06-17T15:57:04.413Z

I have all evidence needed. Let me note one nuance the watch-script JSDoc surfaces (`selectReenableTargets`, lines 1150-1160): the migration freeze is deliberately NOT a gate inside `selectReenableTargets` for crash-critical tasks. I'll cross-check that against the installer's wording, since both the header (lines 56-62) and `$desc` (line 160) describe the gating. Now to grade.

## Verification summary

**P1.1 — header + $desc accuracy (FIXED, with one wording nuance).**
- Header lines 56-62 now read: "The watchdog NEVER kills a process and NEVER REGISTERS a task. It DOES self-heal one narrow case: its G10 guard re-ENABLES a DISABLED crash-critical task via Enable-ScheduledTask ... default-on but suppressed under an active migration freeze, for any task in EXPECTED_DISABLED, and entirely off when PRISM_FTH_AUTO_REENABLE_DISABLE=1 or in -DryRun. So the LIVE task is advisory + self-heal, NOT purely advisory". No remaining absolute "advisory only / never auto-registers" false claim. The "never registers a task" claim is accurate — verified the watch script only calls `Enable-ScheduledTask` (lines 1217, 1221), never `Register-ScheduledTask`.
- `$desc` line 160: "Never kills a process or registers a task; DOES self-heal by re-enabling a disabled crash-critical task (G10 -- suppressed under migration freeze / EXPECTED_DISABLED; set PRISM_FTH_AUTO_REENABLE_DISABLE=1 or use -DryRun for detect-and-advise-only)." Accurate and consistent with the header.
- Nuance (P2, not a fix-blocker): both the header (line 59 "suppressed under an active migration freeze") and `$desc` (line 160 "suppressed under migration freeze") state the freeze suppresses the re-enable. The watch script's `selectReenableTargets` JSDoc (lines 1150-1160) is explicit that for a *crash-critical* task the freeze is deliberately NOT a gate — only EXPECTED_DISABLED suppresses it; the freeze only excuses *non-load-bearing* tasks elsewhere (line ~764). Since this G10 re-enable path operates exclusively on crash-cr
... [+5439 chars truncated]
