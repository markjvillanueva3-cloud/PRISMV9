---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "I'm extending `H:/prism/scripts/fleet-reaper-sweep.mjs` to add a \"soft pressure "
date: "2026-05-14"
first_ts: "2026-05-14T17:50:22.898Z"
last_ts: "2026-05-14T17:55:05.833Z"
cwd: "H:\\prism"
messages: 117
user_msgs: 49
assistant_msgs: 68
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-abe9edfac415cc040.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# I'm extending `H:/prism/scripts/fleet-reaper-sweep.mjs` to add a "soft pressure 

> **claude-code-cli** | 2026-05-14 | 117 msgs (49 user / 68 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-abe9edfac415cc040.jsonl`

## Transcript

### User | 2026-05-14T17:50:22.898Z

I'm extending `H:/prism/scripts/fleet-reaper-sweep.mjs` to add a "soft pressure response" — under high commit memory, drop CPU priority on stale-slot processes (BelowNormal) and trim their working sets (PSAPI EmptyWorkingSet / SetProcessWorkingSetSize -1 -1). I need to know what PRISM already does so I extend instead of duplicate.

Find and report:

1. **node-process-janitor.mjs** — exists per `.claude/helpers/` and CLAUDE.md. Read it. What patterns does it use to enumerate / classify / kill? Does it ever change priority or trim working sets? Does it have an injectable seam pattern (like fleet-reaper-sweep does with `enumerator`/`killer`)?

2. **cleanup-orchestrator.mjs** — same dir. Read it. What sub-cleaners does it call? Is it sync or async-spawn? Any priority/trim work?

3. **`scripts/system-health/03-memory-pressure-auto-relief.ps1`** — CLAUDE.md says it exists as a Windows scheduled task. Read it. What relief actions does it take? Does it already trim working sets or change priorities?

4. **`zombie-reaper-daemon.mjs`** (in `.claude/helpers/`) — read it. Does it have priority/trim logic?

5. **Any existing use of `Set-Process` / `SetPriorityClass` / `SetProcessWorkingSetSize` / `EmptyWorkingSet`** anywhere in the repo (`scripts/`, `.claude/`, `mcp-server/`). I want to know if there's a vetted helper I can call rather than re-implementing.

6. **`state/shared/commit-pressure-stop-gate.mjs`** or similar pressure-gate hooks — what's the canonical "we're under pressure" signal in this codebase? File path, threshold knobs (env vars), what hook fires on it.

7. **PowerShell timeout / kill patterns** — how does `fleet-reaper-sweep.mjs` invoke PowerShell (resolvePowershell, PS_TIMEOUT_MS, SIGKILL on timeout) vs the other helpers? I want to be consistent. Show me the canonical pattern from any one of them.

8. **Tests** for any of the above — vitest files that exercise priority/trim/pressure-relief logic. Look in `.claude/helpers/*.test.mjs` and `mcp-server/src/__tests
... [+195 chars truncated]

### Assistant | 2026-05-14T17:50:24.491Z

I'll systematically search for these files and patterns. Let me start by exploring the repository structure and then reading the key files you mentioned.

### Assistant | 2026-05-14T17:50:24.677Z

[tool_use: Bash]

### User | 2026-05-14T17:50:26.552Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-14T17:50:28.006Z

I'm in plan mode, so I'll search read-only. Let me use PowerShell correctly and then grep through the codebase.

### Assistant | 2026-05-14T17:50:28.097Z

[tool_use: PowerShell]

### User | 2026-05-14T17:50:33.930Z

[tool_result] _PROJECT_FILES
.cache
.claude
.claude-flow
.claude-octopus
.claude-profiles
.claude-user-state
.codex
.codex_vendor
.codex-temp
.github
.husky
.lsmcp
.playwright-cli
.playwright-mcp
.pytest_cache
.scratch
.sessions
.swarm
.taskmaster
.tmp
%SystemDrive%
archives
artifacts
audits
autonomous-tasks
backups
BOX
c
cad-engine
checkpoints
claude-backup-from-c
claude-dev
co
... [+540 chars truncated]

### Assistant | 2026-05-14T17:50:34.963Z

Now let me search for the specific files:

### Assistant | 2026-05-14T17:50:35.388Z

[tool_use: Glob]

### Assistant | 2026-05-14T17:50:35.813Z

[tool_use: Glob]

### Assistant | 2026-05-14T17:50:36.027Z

[tool_use: Glob]

### User | 2026-05-14T17:50:56.827Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T17:50:56.932Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T17:50:57.024Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T17:50:57.882Z

Let me be more specific with the path:

### Assistant | 2026-05-14T17:50:58.170Z

[tool_use: PowerShell]

### User | 2026-05-14T17:51:03.320Z

[tool_result] _probe.test.mjs
advisor-session-log.mjs
agent-coordination-daemon.mjs
agent-coordination.mjs
agent-identity.mjs
agent-index-injector.mjs
agent-util-ledger.mjs
ai-self-awareness-inject.mjs
ai-system-activation.mjs
appdata-junction-setup.mjs
apply-hook-fixes.mjs
arbitration-log.mjs
async-hook-enqueue.mjs
atomic-write.mjs
auto-compact-gate.mjs
auto-resume-injector.mjs
auto-route.mjs

... [+4014 chars truncated]

### Assistant | 2026-05-14T17:51:04.426Z

Good! Now let me check for the scripts:

### Assistant | 2026-05-14T17:51:04.894Z

[tool_use: PowerShell]

### Assistant | 2026-05-14T17:51:05.436Z

[tool_use: PowerShell]

### Assistant | 2026-05-14T17:51:05.669Z

[tool_use: PowerShell]

### User | 2026-05-14T17:51:08.357Z

[tool_result] H:\PRISM\scripts\fleet-reaper-sweep.mjs

### User | 2026-05-14T17:51:11.430Z

[tool_result] H:\PRISM\scripts\system-health\03-memory-pressure-auto-relief.ps1

### User | 2026-05-14T17:51:13.562Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-05-14T17:51:14.658Z

Good! Now let me read the key files. Let me check what exists and read them in parallel:

### Assistant | 2026-05-14T17:51:14.934Z

[tool_use: Read]

### Assistant | 2026-05-14T17:51:15.104Z

[tool_use: Read]

### Assistant | 2026-05-14T17:51:15.302Z

[tool_use: Read]

### Assistant | 2026-05-14T17:51:15.514Z

[tool_use: Read]

### User | 2026-05-14T17:51:16.093Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-reaper-sweep.mjs' was already read 7m ago in this session and is unchanged (mtime 1778769886938). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-14T17:51:19.165Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cleanup-orchestrator.mjs — U-CLEANUP-E3
4	 *
5	 * Single-call wrapper that runs the 5 existing cleanup helpers in sequence and
6	 * emits one unified result line. Pure delegator — NO new kill logic per R1.
7	 *
8	 * Sub-cleaners (executed in registry order):
9	 *   1. git-lock-sweeper.mjs        (hook-style: drains stdin, emits JSON)
10	 *   2. chat-bus-reap.mjs   
... [+22000 chars truncated]

### User | 2026-05-14T17:51:19.530Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zombie-reaper-daemon.mjs (U-COORD10)
4	 *
5	 * Active cleanup daemon that runs every 60s to:
6	 * - Remove orphaned lock files
7	 * - Clean stale claims from AtomicClaimBroker
8	 * - Prune dead sessions from coordination status
9	 *
10	 * Integrated with agent-coordination-daemon.mjs
11	 */
12	
13	import * as fs from 'fs';
14	import * as path from 'path';
15	
16	co
... [+3578 chars truncated]

### User | 2026-05-14T17:51:19.573Z

[tool_result] 1	param(
2	  [int]$LightThresholdPct = 85,
3	  [int]$MediumThresholdPct = 92,
4	  [int]$HeavyThresholdPct = 97,
5	  [string]$LogPath = 'H:\prism\.cache\memory-pressure-log.jsonl',
6	  [int]$LogMaxLines = 500,
7	  [switch]$DryRun
8	)
9	
10	# 03-memory-pressure-auto-relief.ps1 — automated memory-pressure relief.
11	#
12	# Runs every 5 minutes via the "PRISM Memory Pressure Auto-Relief" Windows
13	# 
... [+7268 chars truncated]

### Assistant | 2026-05-14T17:51:21.157Z

Now let me search for node-process-janitor and check for any existing priority/trim patterns:

### Assistant | 2026-05-14T17:51:21.610Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:51:22.074Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:51:22.406Z

[tool_use: Grep]

### User | 2026-05-14T17:51:24.060Z

[tool_result] No files found

### User | 2026-05-14T17:51:24.389Z

[tool_result] No files found

### User | 2026-05-14T17:51:25.188Z

[tool_result] Found 5 files
.claude\helpers\process-slot-map.mjs
.claude\helpers\ram-zombie-watch.mjs
.claude\helpers\ram-zombie-watch.sh.archive.2026-05-13
.claude\helpers\install-memory-pressure-task.ps1
.claude\helpers\install-hook-janitor-task.ps1

### system

... [37 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-14T17:52:52.468Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:52:52.960Z

[tool_use: Grep]

### User | 2026-05-14T17:52:54.894Z

[tool_result] (PowerShell completed with no output)

### User | 2026-05-14T17:52:58.504Z

[tool_result] Found 6 files
.claude\helpers\cleanup-orchestrator.test.mjs
.claude\helpers\cleanup-orchestrator.mjs
.claude\helpers\ram-zombie-watch.mjs
.claude\helpers\scrutiny-ledger.test.mjs
.claude\helpers\scrutiny-ledger.mjs
.claude\helpers\node-orphan-cleaner.mjs

### User | 2026-05-14T17:52:59.208Z

[tool_result] Found 5 files limit: 5
state\shared\HOOK_REGISTRY.json
state\shared\HOOK_REGISTRY.json.previous.json
state\shared\HOOK_UTILIZATION_REPORT.json
state\shared\HOOK_DEFINITIONS_INVENTORY.md
state\shared\hook-definitions-inventory.json

### Assistant | 2026-05-14T17:53:00.535Z

Now let me read node-orphan-cleaner to see PowerShell kill patterns:

### Assistant | 2026-05-14T17:53:00.762Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:01.203Z

[tool_use: Grep]

### User | 2026-05-14T17:53:03.377Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Node orphan cleaner for PRISM/Codex.
4	 *
5	 * Goals:
6	 * - Kill stale transient Node workers (vitest, stdin runners, one-off CLI helpers)
7	 * - Preserve long-lived PRISM services and app-owned MCP/extension processes
8	 * - Run safely from shell startup/exit and a lightweight scheduled task
9	 */
10	import { execFileSync } from 'child_process';
11	import { appen
... [+6661 chars truncated]

### User | 2026-05-14T17:53:03.578Z

[tool_result] Found 2 files
scripts\system-health\06-aggressive-killer.mjs
scripts\eject-drive.py

### Assistant | 2026-05-14T17:53:04.900Z

Let me check the aggressive-killer and look for any existing tests:

### Assistant | 2026-05-14T17:53:05.330Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:05.806Z

[tool_use: Glob]

### Assistant | 2026-05-14T17:53:06.854Z

[tool_use: Grep]

### User | 2026-05-14T17:53:07.998Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * 06-aggressive-killer.mjs - emergency reaper for stuck bash/git/node processes.
4	 *
5	 * Use cases:
6	 *   - Pressure-gate self-heal (invoked from commit-pressure-stop-gate.mjs)
7	 *   - Manual emergency cleanup when system commit memory is pinned
8	 *   - Recovery after a chat hangs on an unfinished tool call
9	 *
10	 * Kill rules (all conservative — never touches
... [+5434 chars truncated]

### User | 2026-05-14T17:53:10.055Z

[tool_result] 151:  it("systemMessage takes priority over hookSpecificOutput when both present", () => {
153:    // 'X:' so stripHookPrefix leaves it intact — proves the priority is what

### User | 2026-05-14T17:53:27.126Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T17:53:29.813Z

Let me check for install scripts to see task registration patterns, and search for any existing "soft" relief patterns:

### Assistant | 2026-05-14T17:53:30.293Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:31.695Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:53:31.226Z

[tool_use: Grep]

### User | 2026-05-14T17:53:33.661Z

[tool_result] 205: * Pure — no I/O. `now` injectable.
399: * Run a single sweep. Fully injectable — every OS touch point has an opts seam
408: *   readMemory      injectable host-memory reader
409: *   killer          injectable process killer
410: *   ledgerPath, ledgerLockPath  injectable ledger paths
511:      // the killer is injectable — but never let a kill-path throw escape

### User | 2026-05-14T17:53:33.850Z

[tool_result] Found 4 files
scripts\system-health\10-stale-handoff-sweep.ps1
scripts\system-health\09-wiki-lint.ps1
scripts\system-health\28-cleanup-orchestrator.ps1
scripts\system-health\26-awareness-health.ps1

### User | 2026-05-14T17:53:34.955Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Memory Pressure Auto-Relief',
3	  [int]$EveryMinutes = 5,
4	  [switch]$RunNow,
5	  [switch]$Uninstall
6	)
7	
8	# install-memory-pressure-task.ps1 — HS-13 automated memory-pressure relief
9	# (2026-05-12). Registers a Windows Scheduled Task that runs
10	# scripts/system-health/03-memory-pressure-auto-relief.ps1 every $EveryMinutes
11	# minutes, independent of
... [+2988 chars truncated]

### Assistant | 2026-05-14T17:53:36.963Z

Now let me check the actual fleet-reaper-sweep.mjs for the defaultKiller function and resolve PowerShell pattern:

### Assistant | 2026-05-14T17:53:37.400Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:38.321Z

[tool_use: Grep]

### User | 2026-05-14T17:53:40.656Z

[tool_result] 56:import { execFileSync, spawn } from "node:child_process";
95:function resolvePowershell() {
126:        const raw = execFileSync(
127:          resolvePowershell(),
340:      raw = execFileSync(
341:        resolvePowershell(),
385:function defaultKiller(pids) {

### User | 2026-05-14T17:53:44.912Z

[tool_result] 300	  if (!candidate || candidate.isCandidate !== true) {
301	    return { reap: false, reason: "not a reap candidate" };
302	  }
303	  const ageMs = candidate.ageMs;
304	  if (!Number.isFinite(ageMs)) {
305	    return { reap: false, reason: "process age unknown — refusing to reap" };
306	  }
307	  if (ageMs < cfg.ageFloorMs) {
308	    return { reap: false, reason: `too young (${Math.round(ageMs /
... [+6555 chars truncated]

### Assistant | 2026-05-14T17:53:47.542Z

Perfect! Let me get the resolvePowershell function:

### Assistant | 2026-05-14T17:53:48.093Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:48.897Z

[tool_use: Grep]

### User | 2026-05-14T17:53:52.037Z

[tool_result] 95	function resolvePowershell() {
96	  const abs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
97	  try { if (existsSync(abs)) return abs; } catch { /* fall through */ }
98	  return "powershell.exe";
99	}
100	
101	// ─── Memory pressure ────────────────────────────────────────────────────────
102	
103	/**
104	 * Read host memory pressure. Returns physical + commit used-% and the m
... [+1600 chars truncated]

### User | 2026-05-14T17:54:12.430Z

[tool_result] Found 10 files limit: 10
.claude\kernel\psk.mjs
.claude\hooks\prism-awareness-v2.mjs
.claude\hooks\cross-session-awareness.mjs
.claude\hooks\awareness-snapshot.mjs
.claude\hooks\ai-command-awareness.mjs
.claude\helpers\cron-registry-reconcile.mjs
.claude\helpers\process-slot-map.mjs
.claude\hooks\wiki-precheck-inject.mjs
.claude\hooks\node-process-janitor.mjs
.claude\hooks\goal-prereq-inject.mjs

### Assistant | 2026-05-14T17:54:13.996Z

Perfect. Now let me create a comprehensive summary by reading one more file to understand the complete picture:

### Assistant | 2026-05-14T17:54:14.443Z

[tool_use: Read]

### Assistant | 2026-05-14T17:54:14.973Z

[tool_use: Bash]

### User | 2026-05-14T17:54:20.555Z

[tool_result] 1	#!/usr/bin/env node
2	// ram-zombie-watch.mjs — fleet watchdog for the Monitor tool. Single-write-per-tick.
3	// Stdout = events. Stderr = errors (captured to task output file, not the event stream).
4	//
5	// Each tick produces AT MOST ONE stdout write so Monitor sees it as one notification.
6	// Per-condition cooldown prevents alert spam — same alert won't re-emit within ALERT_COOLDOWN_MS.
7	

... [+3579 chars truncated]

### User | 2026-05-14T17:54:25.153Z

[tool_result] -rw-r--r-- 1 Mark V 197608 30202 May 14 12:53 H:\prism\state\shared\.janitor-kills.jsonl

### Assistant | 2026-05-14T17:55:05.833Z

Excellent! I now have all the information needed. Let me compile the comprehensive report.

---

## PRISM Process Management & Memory Pressure: Existing Patterns Report

I've completed a thorough search of the PRISM codebase. Here's what exists and what patterns you should follow:

### **1. node-process-janitor.mjs** — Process enumeration & killing patterns

**File:** `H:\prism\.claude\hooks\node-process-janitor.mjs`

**Enumeration/Kill approach:**
- **Windows:** Generates a PowerShell script on-the-fly (`join(tmpdir(), 'prism-janitor-${pid}-${date}.ps1')`), pipes it to `execSync()` with a timeout
- **POSIX:** Uses `ps -eo` + `awk` + `xargs kill -TERM`
- **Categories matched:**
  - Stale hook/helper node/bash (`.claude/hooks` or `.claude/helpers` in cmdline + age > 45s)
  - Orphan MCP servers (parent-dead + age gate)
  - Orphan git.exe (prism-scoped cmdline + parent-dead + age gate)

**Key constants:**
```javascript
const STAMP = "H:/prism/state/shared/.hook-janitor-stamp";
const THROTTLE_SECONDS = 30;
const MAX_AGE_SECONDS = 45;
const PS_TIMEOUT_MS = 8000;
```

**Seam pattern:** `FULL` flag (boolean) — throttle skip for scheduled-task mode vs hot-path. Uses **no injectable seam** (hardcoded `Stop-Process` via inline PS). ❌ Not designed for extension.

**Does it do priority/trim?** ❌ **No.** Pure kill logic only.

---

### **2. cleanup-orchestrator.mjs** — Sub-cleaner orchestrator

**File:** `H:\prism\.claude\helpers\cleanup-orchestrator.mjs`

**Sub-cleaners called (in order):**
1. `git-lock-sweeper.mjs` (hook-style)
2. `chat-bus-reap.mjs` (CLI with `--json` + `--dry-run`)
3. `zombie-reaper-daemon.mjs` (CLI, no args, prints only when count>0)
4. `node-orphan-cleaner.mjs` (CLI with `--reason=` and throttle bypass `--force`)
5. `bash-orphan-cleaner.mjs` (hook-style)

**Execution:** `spawnSync()` per cleaner, with per-cleaner `timeoutMs` (5-30s range). **Sync sequential**, not parallel (intentional — ordering matters for chat-bus → zombies).

**Does it do priority/trim
... [+9318 chars truncated]
