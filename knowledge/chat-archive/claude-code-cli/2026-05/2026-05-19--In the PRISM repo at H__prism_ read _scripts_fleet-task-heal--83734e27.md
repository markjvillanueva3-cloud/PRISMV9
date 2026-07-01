---
type: "chat-session"
source: "claude-code-cli"
session_id: "83734e27-22c8-45b2-bf03-84f276b2cdd7"
title: "In the PRISM repo at H:/prism, read `scripts/fleet-task-health-watch.mjs` (the s"
date: "2026-05-19"
first_ts: "2026-05-19T16:47:56.111Z"
last_ts: "2026-05-19T16:52:52.207Z"
cwd: "H:\\PRISM"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-a93dd865316630946.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# In the PRISM repo at H:/prism, read `scripts/fleet-task-health-watch.mjs` (the s

> **claude-code-cli** | 2026-05-19 | 24 msgs (10 user / 14 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-a93dd865316630946.jsonl`

## Transcript

### User | 2026-05-19T16:47:56.111Z

In the PRISM repo at H:/prism, read `scripts/fleet-task-health-watch.mjs` (the scheduled-task health watchdog from FLEET-TASK-HEALTH-MS0). Report concisely (under 350 words):

1. Does it check whether a scheduled task's NextRunTime is ADVANCING / fresh (i.e. would it catch a task that is `State: Ready` but whose trigger has stalled and isn't firing)? Or does it only classify on `State` (disabled/ready) + `LastTaskResult`? Quote the exact classification logic.

2. What event fires it — is it a Stop hook (`fleet-task-health-stop.mjs`)? A scheduled task itself? How often does it actually run?

3. Does it specifically watch `PRISM Fleet Reaper`? How does it enumerate which tasks to check (a hardcoded list, or a `PRISM *` glob)?

4. The reaper sweep script `scripts/fleet-reaper-sweep.mjs` has a Tier-3 block (~line 2473-2520) doing "scheduled-task self-heal" via `schtasks /Run`. Read that block and report: does the reaper, on every sweep, re-kick its own scheduled task? What exactly does the self-heal do, and what would it NOT catch (e.g. a stalled trigger vs a disabled task vs a missing task)?

Report file paths + line numbers + exact code snippets for the classification logic.

### Assistant | 2026-05-19T16:48:23.322Z

I'll read both scripts to analyze the health-check logic and self-heal behavior.

### Assistant | 2026-05-19T16:48:23.578Z

[tool_use: Read]

### Assistant | 2026-05-19T16:48:24.428Z

[tool_use: Read]

### User | 2026-05-19T16:48:49.241Z

[tool_result] 2470	  }
2471	}
2472	
2473	// ─── Tier-3 (FLEET-REAPER-MS2): NIM keepalive + scheduled-task self-heal ──
2474	//
2475	// User directive 2026-05-19 ([GOLF]/U-WAVE3): "make sure fleet-reaper stays
2476	// running along with nvidia NIM + docker + ollama to relieve pressure of the
2477	// pc so we maintain stability for 12+ chats" + "add watchdog to fleet reaper".
2478	//
2479	// Tier-2 already handle
... [+2630 chars truncated]

### User | 2026-05-19T16:48:49.245Z

[tool_result] 1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task safety net.
4	 *
5	 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
6	 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
7	 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
8	 * `PRISM Cleanup Orchestrator`, `PRISM No
... [+39952 chars truncated]

### Assistant | 2026-05-19T16:49:11.184Z

I'll read the complete tier-3 self-heal block from fleet-reaper-sweep.mjs to analyze the scheduling and behavior.

### Assistant | 2026-05-19T16:49:12.071Z

[tool_use: Read]

### User | 2026-05-19T16:49:44.635Z

[tool_result] 2500	const NIM_START_SCRIPT = "H:/Tools/nim/start.ps1";
2501	
2502	/** Pure: parse `schtasks /Query /TN ... /V /FO LIST` stdout → lower-cased status. */
2503	export function parseTaskQueryStatus(stdout) {
2504	  if (!stdout || typeof stdout !== "string") return "unknown";
2505	  for (const l of stdout.split(/\r?\n/)) {
2506	    const m = l.match(/^\s*Status:\s*(.+?)\s*$/i);
2507	    if (m) {
2508	
... [+7327 chars truncated]

### Assistant | 2026-05-19T16:49:49.414Z

Perfect. Now let me search for where the task self-heal is actually invoked in the sweep loop to understand the triggering frequency.

### Assistant | 2026-05-19T16:49:50.512Z

[tool_use: Bash]

### User | 2026-05-19T16:50:17.891Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 1F:

[file] scripts/fleet-reaper-sweep.mjs (4):
  1629: const taskDecision = taskSelfHealAction({
  1633: const r = runScheduledTaskNow(taskName, {});
  2551: export function taskSelfHealAction({ taskStatus, disabl
... [+112 chars truncated]

### Assistant | 2026-05-19T16:50:19.214Z

[tool_use: Read]

### User | 2026-05-19T16:50:29.453Z

[tool_result] 1620	      let taskStatusStr = "unknown";
1621	      try {
1622	        const r = execFileSync("schtasks", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"], {
1623	          timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
1624	        });
1625	        taskStatusStr = parseTaskQueryStatus(r);
1626	      } catch (e) {
1627	        taskStatusStr = "unknow
... [+2570 chars truncated]

### Assistant | 2026-05-19T16:50:34.720Z

Now let me check where the watchdog fires - I need to understand if it's a Stop hook or scheduled task.

### Assistant | 2026-05-19T16:50:35.095Z

[tool_use: Bash]

### User | 2026-05-19T16:50:51.108Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T16:50:52.824Z

[tool_use: Bash]

### User | 2026-05-19T16:51:16.307Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T16:51:17.997Z

[tool_use: Bash]

### User | 2026-05-19T16:52:03.013Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
21:15 aggressive-killer-stop.mjs  193.0K
21:15 chat-cleanup-on-stop.mjs  193.0K
21:15 commit-pressure-stop-gate.mjs  193.0K
21:15 cost-ceiling-stop.mjs  193.0K
21:15 duplication-guard-stop.mjs  193.0K
09:30 fleet-reaper-stop.mjs  193.0K
16:14 fleet-task-health-stop.mjs  193.0K
21:15 git-health-guard.mjs  193.0K
21:15 git-s
... [+2997 chars truncated]

### Assistant | 2026-05-19T16:52:04.849Z

[tool_use: Read]

### User | 2026-05-19T16:52:22.654Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * fleet-task-health-stop.mjs — Stop-hook arm of the scheduled-task health
5	 * watchdog (scripts/fleet-task-health-watch.mjs).
6	 *
7	 * THE GAP. PRISM's crash-prevention safety net is a set of Windows scheduled
8	 * tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, …). Nothing
9	 * watches whether those tasks are themselves healthy — a t
... [+4409 chars truncated]

### Assistant | 2026-05-19T16:52:52.207Z

Perfect. Now I have enough context. Let me compile my findings into a comprehensive report.

---

## REPORT: Scheduled-Task Health Watch & Self-Heal Analysis

### 1. **Classification Logic: Does it Detect Stalled Triggers?**

**SHORT ANSWER:** No — it does NOT check if NextRunTime is advancing. The watchdog ONLY classifies on `State` (Disabled/Ready/Running/Queued) + `LastTaskResult` (Windows launch-failure codes) + `LastRunTime` staleness.

**EXACT LOGIC** (`fleet-task-health-watch.mjs` lines 422–465):

```javascript
export function classifyTask(t, nowMs, cfg) {
  const state = (t.state || "").trim();
  
  if (state === "Disabled") {
    return { status: "disabled", reason: "task State is Disabled — it will not run on its trigger" };
  }
  if (state !== "Ready" && state !== "Running" && state !== "Queued") {
    return { status: "unknown-state", reason: `task State is '${state || "(empty)"}' — expected Ready` };
  }
  
  const r = t.lastTaskResult;
  if (isLaunchFailureCode(r)) {
    const hex = "0x" + (r >>> 0).toString(16).toUpperCase();
    return { status: "failing", reason: `LastTaskResult=${hex} — Task Scheduler could not run the task's action` };
  }
  
  if (t.lastRunTimeMs == null) {
    return { status: "never-ran", reason: "no LastRunTime — task has never executed" };
  }
  
  // Staleness — only checkable for tasks that carry a repetition interval.
  if (Number.isFinite(t.intervalMs) && t.intervalMs > 0) {
    const ageMs = nowMs - t.lastRunTimeMs;
    const limitMs = t.intervalMs * cfg.staleMultiplier;
    if (ageMs > limitMs) {
      return { status: "stale", reason: `last ran ${Math.round(ageMs / 60000)}min ago ...` };
    }
  }
  
  return { status: "healthy", reason: "Ready, ran within its interval, last result OK" };
}
```

**Gap:** A task with `State: Ready` but `NextRunTime` = NOW or forever-stalled (trigger never fires again) passes as "healthy" because the logic never compares `NextRunTime` to clock. It only checks LastRunTime age. A disabled 
... [+5447 chars truncated]
