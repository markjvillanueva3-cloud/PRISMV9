---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent second review of the new file H:/prism/.claude/helpers/install-fleet"
date: "2026-06-17"
first_ts: "2026-06-17T15:50:55.666Z"
last_ts: "2026-06-17T15:52:56.712Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-ad29fd2f18db1e33a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent second review of the new file H:/prism/.claude/helpers/install-fleet

> **claude-code-cli** | 2026-06-17 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-ad29fd2f18db1e33a.jsonl`

## Transcript

### User | 2026-06-17T15:50:55.666Z

Independent second review of the new file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (read end-to-end). It registers a Windows scheduled task "PRISM Fleet Task Health" running scripts/fleet-task-health-watch.mjs --once every 5 min. Do NOT assume the other reviewer caught everything -- weight toward SAFETY, SECURITY, and correctness of the elevation logic.

Verify:
1. ELEVATION LOGIC: the guard is `if (-not $isAdmin -and -not $Interactive) { throw }`. Is this correct -- the hardened S4U/SYSTEM principals (which need admin to register) are blocked without elevation, while the -Interactive current-user path is allowed without admin? Trace: with -Interactive, principal stays $null and the register splat omits -Principal. Any path where it would silently register a broken/privilege-mismatched task?
2. The watch script is documented "NEVER auto-registers" and "advisory only, never kills". Confirm THIS installer only schedules `--once` audits -- no kill/enable/disable of OTHER tasks.
3. SCHEDULED-TASK FREEZE: a 2026-06-08 operator migration-freeze said do-not-re-arm PRISM tasks until migration complete; live state now shows only 2/76 disabled (freeze lifted). Should this installer carry an OPERATOR-NOTE comment like install-vault-rot-sentinel-cron.ps1 does, or is that unnecessary now? (advisory, likely not a blocker)
4. Could the task dangle/break: worktree path safety, node-exe fallback, head-sanity guard if the watch script is renamed? Is ExecutionTimeLimit 120s adequate for a Get-ScheduledTask enumeration over ~76 tasks?
5. ASCII-only code? Any injection risk in the Description / Write-Host strings? Any RunNow poll bug (infinite loop / wrong deadline / off-by-one)?
Grade PASS or FAIL with P0/P1/P2 + line citations. Read-only.

### Assistant | 2026-06-17T15:50:59.624Z

I'll review the installer file end-to-end. Let me start by reading it completely, along with the watch script it schedules and a comparison installer.

### Assistant | 2026-06-17T15:51:00.160Z

[tool_use: Read]

### Assistant | 2026-06-17T15:51:00.580Z

[tool_use: Read]

### User | 2026-06-17T15:51:00.602Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-task-health-task.ps1' was already read 9m ago in this session and is unchanged (mtime 1781710783335). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-17T15:51:01.675Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-916 of 1541 total (35737 tokens, cap 25000). Call Read with offset=917 limit=916 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task s
... [+53549 chars truncated]

### Assistant | 2026-06-17T15:51:05.993Z

Now let me re-read the installer file (since the read-once guard says it's in my context, but I want to verify the exact lines) and look at the comparison installer mentioned in the task.

### Assistant | 2026-06-17T15:51:06.712Z

[tool_use: Bash]

### User | 2026-06-17T15:51:10.480Z

[tool_result]      1	param(
     2	  [string]$TaskName = 'PRISM Fleet Task Health',
     3	  [int]$EveryMinutes = 5,
     4	  # Phase offset (seconds) so this task does not phase-lock onto the existing
     5	  # 5-min host tasks. Cycle positions already taken (offset mod 300s):
     6	  #   "PRISM Cleanup Orchestrator"      ~+60s
     7	  #   "Memory Pressure Auto-Relief"     ~+120s
     8	  #   "PRISM Fleet R
... [+12764 chars truncated]

### Assistant | 2026-06-17T15:51:14.110Z

Now let me examine the comparison installer mentioned in the task (the vault-rot-sentinel cron with its OPERATOR-NOTE) and a peer installer (the memory-monitor one it claims to mirror).

### Assistant | 2026-06-17T15:51:15.285Z

[tool_use: Read]

### Assistant | 2026-06-17T15:51:15.371Z

[tool_use: Read]

### User | 2026-06-17T15:51:16.683Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-memory-monitor-task.ps1' was already read 15m ago in this session and is unchanged (mtime 1780363914109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-17T15:51:17.187Z

[tool_result] 1	# install-vault-rot-sentinel-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
2	# Register a durable Windows Scheduled Task that runs the vault-rot sentinel
3	# (vault-rot-sentinel.mjs --write) daily. Closes the "rot-sentinel runs only by
4	# hand" gap from the 2026-06-08 vault audit (it detects stale/orphaned/rotting
5	# notes but its report was 2 days stale because nothing scheduled it).
6	#
... [+2404 chars truncated]

### Assistant | 2026-06-17T15:51:23.279Z

I have the installer in full, the watch script header and the comparison vault-rot installer. Let me verify the memory-monitor peer it claims to mirror (lines 67-71 for the node-exe fallback) and confirm the watch script's `--once` / advisory-only / non-destructive behavior by checking the relevant sections of the watch script.

### Assistant | 2026-06-17T15:51:24.935Z

[tool_use: Read]

### User | 2026-06-17T15:51:25.939Z

[tool_result] 55	$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
56	  [Security.Principal.WindowsBuiltinRole]::Administrator)
57	if (-not $isAdmin) {
58	  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
59	}
60	
61	# Always target the canonical main tree, never a worktree (a worktree's
62	
... [+1595 chars truncated]

### Assistant | 2026-06-17T15:51:26.379Z

[tool_use: Grep]

### User | 2026-06-17T15:51:27.828Z

[tool_result] 300: * WHEN THE FREEZE LIFTS: re-enable the task (`schtasks /Change /TN "<name>"
1147: * `Enable-ScheduledTask` by hand. This makes the WARN self-healing.
1168: * @returns {string[]} task names safe to Enable-ScheduledTask (possibly empty)
1196: * Re-enable each named scheduled task via `Enable-ScheduledTask`. NON-elevated
1217:    const ps = `$ErrorActionPreference='Stop'; Enable-ScheduledTask -T
... [+435 chars truncated]

### Assistant | 2026-06-17T15:51:32.330Z

Important finding: the watch script DOES have an auto-reenable path (`Enable-ScheduledTask`). The task description says the watchdog "never auto-registers" but it CAN re-enable disabled tasks. I need to verify whether the `--once` invocation that THIS installer schedules triggers that auto-reenable, and whether that conflicts with the migration freeze. Let me read the auto-reenable section and the main/CLI dispatch of the watch script.

### Assistant | 2026-06-17T15:51:33.206Z

[tool_use: Read]

### User | 2026-06-17T15:51:34.293Z

[tool_result] 1140	/**
1141	 * Select the crash-critical tasks that are SAFE to auto-re-enable.
1142	 *
1143	 * The recurring failure (precedent 2bc54961b re-enabled 7; 2026-06-09 re-enabled
1144	 * an 8th, "PRISM Zombie Reaper v2"): a crash-critical reaper silently lands in
1145	 * the Disabled state (Windows update, a peer disable, a crash mid-registration).
1146	 * Until now the watchdog only NAGGED -- a WAR
... [+16018 chars truncated]

### Assistant | 2026-06-17T15:51:41.733Z

This is a material finding for the task's question #2. The watch script DOES auto-re-enable disabled crash-critical tasks (`selectReenableTargets` → `reenableTasks` → `Enable-ScheduledTask`). The task brief asserts the installer "only schedules `--once` audits — no kill/enable/disable of OTHER tasks." Let me verify whether the `--once` invocation that THIS installer schedules triggers that auto-reenable, by reading the CLI main dispatch.

### Assistant | 2026-06-17T15:51:42.224Z

[tool_use: Read]

### User | 2026-06-17T15:51:43.175Z

[tool_result] 1439	  node fleet-task-health-watch.mjs --dry-run      # full audit, no writes
1440	  node fleet-task-health-watch.mjs --help
1441	
1442	Knobs: see file header.
1443	Exit: 0 clean · 1 warn · 2 critical · 3 measurement/IO failure.`;
1444	
1445	function fmtSummary(r) {
1446	  const tag = r.level === "critical" ? "[CRIT]" : r.level === "warn" ? "[WARN]" : "[OK]";
1447	  const deg = r.row.degraded.len
... [+4161 chars truncated]

### Assistant | 2026-06-17T15:51:49.601Z

I now have the complete picture. The `--once` invocation (the default audit path) runs `runOnce({ dryRun: false })`, which at line 1292 DOES invoke the auto-re-enable path unless `--dry-run` or `PRISM_FTH_AUTO_REENABLE_DISABLE=1`. So the installer's scheduled live task (no `--dry-run`) WILL re-enable disabled crash-critical tasks via `Enable-ScheduledTask`. This is a side-effect on OTHER tasks that the task brief's premise (#2) and the installer's own description (line 150: "Advisory only -- never kills, never auto-registers") does not mention.

Let me verify the ExecutionTimeLimit adequacy concern by checking the actual live task count and confirm the node-exe candidate list parity. Let me also check whether `$nodeExe` may contain a space that breaks the argument quoting.

### Assistant | 2026-06-17T15:51:51.524Z

[tool_use: Bash]

### User | 2026-06-17T15:51:55.246Z

[tool_result] scripts/fleet-task-health-watch.mjs:1290:  // Skipped on dryRun (no mutation) and under PRISM_FTH_AUTO_REENABLE_DISABLE=1.
scripts/fleet-task-health-watch.mjs:1292:  if (!dryRun && process.env.PRISM_FTH_AUTO_REENABLE_DISABLE !== "1") {
---ftl-disable-check---
203:Write-Host "  PRISM_FLEET_TASKHEALTH_DISABLE=1                     watchdog refuses to write/emit"

### Assistant | 2026-06-17T15:52:01.255Z

Confirmed. The installer's knobs block (lines 202-206) lists `PRISM_FLEET_TASKHEALTH_DISABLE`, `STALE_MULT`, `ADVISORY_COOLDOWN_SEC`, `PS_TIMEOUT_MS` — but NOT `PRISM_FTH_AUTO_REENABLE_DISABLE`, the one knob that controls the only mutating side-effect the scheduled live task performs on OTHER tasks.

Now let me trace the elevation logic edge case in #1, and the node-exe space-quoting question. Let me check the `$auditArgs` quoting and the `$env:USERDOMAIN` behavior.

### Assistant | 2026-06-17T15:52:03.357Z

[tool_use: Bash]

### User | 2026-06-17T15:52:09.280Z

[tool_result] 0
=== live PRISM task count (if on host) ===
76

### Assistant | 2026-06-17T15:52:56.712Z

76 live PRISM tasks confirmed. Now let me assess ExecutionTimeLimit adequacy more precisely. The watch script does ONE `Get-ScheduledTask` enumeration plus a `Get-ScheduledTaskInfo` per task in a single PS invocation, with the script's own internal PS_TIMEOUT_MS default of 15000ms (15s). Plus, the auto-reenable path can spawn an additional `powershell.exe` per disabled crash-critical task (line 1221), each with its own 15s timeout. Let me verify the time-budget math: worst case = node startup + 15s sampler + N×15s reenable spawns. Let me check how many crash-critical tasks could be disabled and the reenable timeout.

The reenable loop (lines 1214-1232) spawns one `powershell.exe` per target serially, each with `timeout: DEFAULT_PS_TIMEOUT_MS` = 15s. There are 7 CRASH_CRITICAL_TASKS. If multiple are disabled and each spawn hangs to its 15s timeout, that alone is up to 7×15s = 105s, plus the 15s sampler, plus node startup — easily exceeding the 120s ExecutionTimeLimit. Let me confirm CRASH_CRITICAL count and finalize.

The analysis is complete. I have verified every claim against actual code lines. Here is my verdict.

---

VERDICT: FAIL

summary: The installer is well-constructed PowerShell — the elevation guard is correct, the splat-omits-Principal pattern is sound, the head-sanity guard and node fallback are solid, and the RunNow poll is bounded. BUT the task brief's load-bearing premise #2 ("this installer only schedules `--once` audits — no kill/enable/disable of OTHER tasks") is FALSE: the live `--once` invocation this installer schedules invokes the watch script's auto-re-enable path, which runs `Enable-ScheduledTask` against OTHER (disabled crash-critical) tasks on every 5-min tick. That has two consequences — a documentation lie in the installer's own Description, and a real conflict with the active migration freeze — plus a credible ExecutionTimeLimit overrun when several crash-critical tasks are disabled at once.

findings:

- [P1] `H:/prism/.claude/helpers
... [+6561 chars truncated]
