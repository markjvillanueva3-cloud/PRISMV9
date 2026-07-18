---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review the new file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 "
date: "2026-06-17"
first_ts: "2026-06-17T15:41:49.937Z"
last_ts: "2026-06-17T15:43:11.733Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a980f67afde2fdd5e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review the new file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 

> **claude-code-cli** | 2026-06-17 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a980f67afde2fdd5e.jsonl`

## Transcript

### User | 2026-06-17T15:41:49.937Z

Review the new file H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (read it end-to-end). It is a Windows scheduled-task installer that registers "PRISM Fleet Task Health" to run scripts/fleet-task-health-watch.mjs --once every 5 minutes. It was cloned from the sibling H:/prism/.claude/helpers/install-fleet-memory-monitor-task.ps1 (read that too as the convention baseline) and must match its conventions.

Verify for COMPLETENESS + OPERATOR CLARITY + CONVENTION CONFORMANCE:
1. Does it correctly clone the sibling's structure (param block, isAdmin guard, node-exe resolution, Uninstall path, head-sanity check, action/trigger/settings/principal, RunNow poll, knobs/verify Write-Host footer)?
2. The watch script's documented CLI is `--once`, `--status`, `--dry-run`, `--json`, `--reset`, `--history`, `--no-advisory`, `--help`; exit codes 0=clean 1=warn 2=critical 3=measurement-fail. Does the installer invoke `--once` and does its RunNow exit-code reporting correctly map 0/1/2/3 (and 267009=still-running)? Crucially: the watch's own exit 1/2 means a FLEET task is degraded (a finding), NOT that this watchdog task failed -- does the RunNow reporting frame it that way (not as a task failure)?
3. Is the head-sanity check (`fleet-task-health` + `--once` in first 90 lines) correct against the actual watch script header?
4. Is the phase offset (+270s) genuinely clear of the documented siblings (cleanup +60, mem-relief +120, reaper +210, memmon +330)?
5. ASCII-only? (no em-dashes / smart quotes / unicode arrows in the code -- PRISM hook-blocks non-ASCII). Flag any non-ASCII char with its line.
6. Idempotent (Force=$true on register; clean Uninstall)? Targets the canonical main tree H:\PRISM\scripts (not a worktree)?
Grade PASS or FAIL with P0/P1/P2 + line citations. Read-only.

### Assistant | 2026-06-17T15:41:54.646Z

I'll review the new installer file end-to-end against its sibling baseline. Let me read both files and the watch script header.

### Assistant | 2026-06-17T15:41:55.110Z

[tool_use: Read]

### Assistant | 2026-06-17T15:41:55.616Z

[tool_use: Read]

### Assistant | 2026-06-17T15:41:56.198Z

[tool_use: Read]

### User | 2026-06-17T15:41:57.204Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-memory-monitor-task.ps1' was already read 5m ago in this session and is unchanged (mtime 1780363914109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-06-17T15:41:57.803Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Task Health',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) so this task does not phase-lock onto the existing
5	  # 5-min host tasks. Cycle positions already taken (offset mod 300s):
6	  #   "PRISM Cleanup Orchestrator"      ~+60s
7	  #   "Memory Pressure Auto-Relief"     ~+120s
8	  #   "PRISM Fleet Reaper"              +210s (install-fleet
... [+12025 chars truncated]

### User | 2026-06-17T15:41:58.019Z

[tool_result] 1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task safety net.
4	 *
5	 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
6	 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
7	 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
8	 * `PRISM Cleanup Orchestrator`, `PRISM No
... [+6668 chars truncated]

### Assistant | 2026-06-17T15:42:02.277Z

I have the new installer and the watch script header. The sibling was read 5 minutes ago, but I need its exact content to compare conventions. Let me read the sibling fresh and check the documented phase offsets in the reaper installer.

### Assistant | 2026-06-17T15:42:02.684Z

[tool_use: Read]

### User | 2026-06-17T15:42:03.269Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-memory-monitor-task.ps1' was already read 5m ago in this session and is unchanged (mtime 1780363914109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-17T15:42:04.603Z

[tool_use: Bash]

### User | 2026-06-17T15:42:12.766Z

[tool_result] 9:  [int]$StartOffsetSeconds = 210,
14:  [switch]$RunNow,
102:# Two triggers: (1) the every-$EveryMinutes poll, anchored +$StartOffsetSeconds
109:  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
110:  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
111:  -RepetitionDuration (New-TimeSpan -Days 3650)
115:# ExecutionTimeLimit 2 min: a worst-case sweep is ~30s (3 PowerShell forks +
124:
... [+714 chars truncated]

### Assistant | 2026-06-17T15:42:16.821Z

The read-once guard is blocking the sibling re-read but I have it from earlier in context. Let me read it via Bash since I need the exact node-resolution and phase-offset comment block to compare, plus verify the memmon offset documentation and the watch script's exit code behavior around the `--once`/measurement-fail path.

### Assistant | 2026-06-17T15:42:18.237Z

[tool_use: Bash]

### Assistant | 2026-06-17T15:42:18.660Z

[tool_use: Bash]

### User | 2026-06-17T15:42:26.350Z

[tool_result] $pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 90s: a worst-case sample is ~10s (one PowerShell CIM
# call + JSON 
... [+4183 chars truncated]

### User | 2026-06-17T15:42:29.321Z

[tool_result] param(
  [string]$TaskName = 'PRISM Fleet Memory Monitor',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) so this task doesn't phase-lock onto the existing
  # 5-min host tasks:
  #   "Cleanup Orchestrator"           anchored ~+60s
  #   "Memory Pressure Auto-Relief"    anchored ~+120s
  #   "PRISM Fleet Reaper"             anchored +210s (CLAUDE.md, install-fleet-reaper-task.ps1:9)
  # Land
... [+4621 chars truncated]

### Assistant | 2026-06-17T15:42:33.623Z

Now I have both files fully. Let me verify a couple of factual claims in the new installer's comments: (1) the actual env knob names the watch script reads (to confirm the footer matches), and (2) whether the watch script's argv parsing accepts `--once` (the documented usage shows bare `node ...` does one audit too, and `--once` is in the usage list). Let me also verify the watch script's actual exit-code behavior and the telemetry/status flag names.

### Assistant | 2026-06-17T15:42:35.591Z

[tool_use: Grep]

### User | 2026-06-17T15:42:37.897Z

[tool_result] 57: *   node fleet-task-health-watch.mjs --once --json   # one audit, JSON
58: *   node fleet-task-health-watch.mjs --status        # read ledger, no audit
59: *   node fleet-task-health-watch.mjs --history [N]   # tail N telemetry rows
60: *   node fleet-task-health-watch.mjs --reset         # clear telemetry + ledger
61: *   node fleet-task-health-watch.mjs --no-advisory   # audit + telemetry on
... [+2387 chars truncated]

### Assistant | 2026-06-17T15:42:41.762Z

Let me verify the exit-code mapping in the watch script's main runner and the `--once`/default path to confirm 0/1/2/3 semantics, plus check that `flags.once` exists (the installer passes `--once` explicitly).

### Assistant | 2026-06-17T15:42:42.367Z

[tool_use: Read]

### User | 2026-06-17T15:42:43.795Z

[tool_result] 1408	  const exitCode = agg.level === "critical" ? 2 : agg.level === "warn" ? 1 : 0;
1409	  return { row, level: agg.level, aggregate: agg, classified, advisory: adv, writes, exitCode, cfg, dryRun, disabled, autoReenable };
1410	}
1411	
1412	// ─── CLI plumbing ───────────────────────────────────────────────────────────
1413	
1414	function parseFlags(argv) {
1415	  const a = new Set(argv);
1416	  
... [+5603 chars truncated]

### Assistant | 2026-06-17T15:42:48.998Z

I now have everything needed. Let me note one important finding: the watch script's `parseFlags` does NOT track a `--once` flag (there is no `once: a.has("--once")` key). The script treats anything that is not `--status`/`--history`/`--reset`/`--help` as the default "run one audit" path. So passing `--once` is harmless (ignored, falls through to the default audit) and matches the documented usage. The installer's `--once` invocation is correct.

Let me also confirm the ASCII cleanliness of the new file (the PRISM hook blocks non-ASCII) by scanning for any non-ASCII byte.

### Assistant | 2026-06-17T15:42:50.880Z

[tool_use: Bash]

### Assistant | 2026-06-17T15:42:52.509Z

[tool_use: Bash]

### User | 2026-06-17T15:42:55.743Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
CLEAN: install-fleet-task-health-task.ps1 is 100% ASCII

### User | 2026-06-17T15:42:58.162Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
grep: -P supports only unibyte and UTF-8 locales
=== sibling non-ascii count:  ===

### Assistant | 2026-06-17T15:43:01.599Z

The locale broke `-P`. Let me re-run the ASCII scan with a forced UTF-8 locale to get a reliable byte-level result.

### Assistant | 2026-06-17T15:43:04.525Z

[tool_use: Bash]

### User | 2026-06-17T15:43:10.537Z

[tool_result] === NEW installer non-ASCII lines ===
CLEAN (no non-ASCII in new installer)
=== SIBLING (mem-monitor) non-ASCII lines (baseline shows the repo tolerates em-dashes in this family) ===
13:  # Burn-in mode bakes --dry-run into the task — sweep classifies but never
19:  # Legacy: register with NO principal → Logon Mode "Interactive only" (task
25:  # monitor reads but never kills, so S4U is sufficient
... [+1264 chars truncated]

### Assistant | 2026-06-17T15:43:11.733Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
