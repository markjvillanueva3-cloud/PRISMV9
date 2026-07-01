---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are a PRISM fleet-hygiene (golf-slot) architecture reviewer. Read the REAL c"
date: "2026-06-10"
first_ts: "2026-06-10T01:13:47.267Z"
last_ts: "2026-06-10T01:15:39.320Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 20
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_96da29fa-09d/agent-a344d1ecdac8f0860.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are a PRISM fleet-hygiene (golf-slot) architecture reviewer. Read the REAL c

> **claude-code-cli** | 2026-06-10 | 46 msgs (20 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_96da29fa-09d/agent-a344d1ecdac8f0860.jsonl`

## Transcript

### User | 2026-06-10T01:13:47.267Z

You are a PRISM fleet-hygiene (golf-slot) architecture reviewer. Read the REAL code before asserting anything (R12 - no fabrication; cite file:line). The repo root is H:/prism.

Relevant golf/fleet files to ground in:
  - scripts/fleet-task-health-watch.mjs (the scheduled-task watchdog; CRASH_CRITICAL_TASKS; selectReenableTargets/reenableTasks = the G10 auto-re-enable guard that self-heals a disabled crash-critical task)
  - .claude/hooks/fleet-task-health-stop.mjs (Stop advisory; buildAdvisory surfaces WARNs + the autoReenable heal result)
  - scripts/fleet-reaper-sweep.mjs (the slot-aware orphan reaper; softRelief; GPU/ollama coordinator)
  - .claude/hooks/docker-service-health-stop.mjs (G6: docker-container + MCP-singleton + native-ollama :11434 Stop advisories; ADVISORY-only, --fix is operator-invoked)
  - scripts/docker-service-health-check.mjs (the --fix executor: docker start <realName>)
  - .claude/hooks/golf-slot-reaper-guardian.mjs (the SessionStart/UserPromptSubmit guardian)
  - state/shared/golf-galaxy-completion-plan-2026-06-09.md (golf work queue: G1-G10; remaining G2/G4/G8)

ARTICLE (Akshay Pachaar, "Your Agent Harness Should Repair Itself" / Opik): current observability stops at showing WHAT happened; "the real bottleneck is everything that has to happen AFTER the trace lands on your screen" — the manual why/how-to-fix. A self-repairing harness automates the debug+fix loop (trace -> diagnose -> test -> repair -> verify), not just the alert.

YOUR LENS: PRISM's fleet-hygiene (golf domain) is the fleet's self-repair layer. The G10 guard (selectReenableTargets+reenableTasks in fleet-task-health-watch.mjs) is the FIRST real instance: a disabled crash-critical scheduled task is now AUTO-re-enabled instead of just WARNed. Find the NEXT such gaps: places where golf's watchdogs SURFACE a trace/WARN but a human still has to act. Concrete live example RIGHT NOW: "PRISM Blueprint OCR Batch=stale" WARNs every Stop fleet-wide but NOTHING auto-re-runs or auto-quar
... [+815 chars truncated]

### Assistant | 2026-06-10T01:13:51.374Z

I'll ground each finding in the real code before asserting anything. Let me read the relevant files in parallel.

### Assistant | 2026-06-10T01:13:51.859Z

[tool_use: Read]

### Assistant | 2026-06-10T01:13:52.319Z

[tool_use: Read]

### Assistant | 2026-06-10T01:13:52.792Z

[tool_use: Read]

### User | 2026-06-10T01:13:52.970Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-task-health-watch.mjs' was already read 1s ago in this session and is unchanged (mtime 1781047515950). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T01:13:53.012Z

[tool_use: Read]

### User | 2026-06-10T01:13:54.150Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-task-health-stop.mjs' was already read 1s ago in this session and is unchanged (mtime 1781037491325). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T01:13:57.613Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\docker-service-health-stop.mjs' was already read 1s ago in this session and is unchanged (mtime 1781050365855). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-10T01:13:58.967Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * docker-service-health-check.mjs — detect downed prism-* Docker services.
4	 *
5	 * Closes a recurring fleet-hygiene gap (golf): the local compute stack's named
6	 * services (qdrant/postgres/prometheus/grafana) can silently go DOWN with no
7	 * alert — Qdrant alone has done it 3× (2026-05-24, -05-28, -06-08), each time
8	 * degrading semantic vector search (the CAG
... [+6016 chars truncated]

### Assistant | 2026-06-10T01:14:01.138Z

The three other files are already in my context. Let me read the remaining grounding files I haven't seen yet.

### Assistant | 2026-06-10T01:14:01.993Z

[tool_use: Read]

### Assistant | 2026-06-10T01:14:02.559Z

[tool_use: Read]

### User | 2026-06-10T01:14:02.987Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-task-health-watch.mjs' was already read 11s ago in this session and is unchanged (mtime 1781047515950). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T01:14:03.032Z

[tool_use: Read]

### Assistant | 2026-06-10T01:14:03.502Z

[tool_use: Read]

### User | 2026-06-10T01:14:03.754Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\fleet-task-health-stop.mjs' was already read 11s ago in this session and is unchanged (mtime 1781037491325). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T01:14:03.981Z

[tool_use: Read]

### Assistant | 2026-06-10T01:14:04.318Z

[tool_use: Read]

### User | 2026-06-10T01:14:04.376Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\docker-service-health-stop.mjs' was already read 9s ago in this session and is unchanged (mtime 1781050365855). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-10T01:14:05.335Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-reaper-sweep.mjs' was already read 12s ago in this session and is unchanged (mtime 1780946476794). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T01:14:06.111Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * golf-slot-reaper-guardian.mjs — the GOLF slot owns the fleet reaper.
5	 *
6	 * Doctrine (user directive, 2026-05-16, SUPERSEDES the prior alpha-owns rule):
7	 * "make it so golf is the new permanent /fleet-reaper monitor instead of alpha."
8	 * The chat holding the `golf` slot in chat-slots.json owns the FLEET-REAPER
9	 * pipeline. This hook is the en
... [+17369 chars truncated]

### User | 2026-06-10T01:14:06.232Z

[tool_result] 1	# Golf Galaxy (fleet-hygiene) — Work-Queue Completion Plan (v2, ultracode-refined)
2	**Generated:** 2026-06-09 (slot golf, session c7361c9f) · **Goal:** finish all open golf units, staging grunt work on Ollama when viable.
3	**Method:** Ollama `gpt-oss:120b` deep-read 43 golf handoffs + CLOSE-OUT-DEFERRED → 14 candidates; Claude reconciled; **bounded 3-lens ultracode brainstorm (`wf_cfbf3c86-4c4
... [+14962 chars truncated]

### Assistant | 2026-06-10T01:14:10.184Z

I have the docker files, golf guardian, and completion plan. I still need the actual content of three files that the read-once guard says are in my context but which I have NOT actually seen the bodies of yet (fleet-task-health-watch, fleet-task-health-stop, fleet-reaper-sweep). The guard is mistaken — those reads errored before returning content. Let me Grep the specific load-bearing symbols to ground my findings.

### Assistant | 2026-06-10T01:14:12.555Z

[tool_use: Grep]

### Assistant | 2026-06-10T01:14:13.485Z

[tool_use: Grep]

### User | 2026-06-10T01:14:15.350Z

[tool_result] 24: *   3. Classifies each: healthy | disabled | failing | stale | never-ran |
40: * disabled / unknown-state / stale / never-ran), plus Windows-level launch
67: *   PRISM_FLEET_TASKHEALTH_STALE_MULT=N         stale = interval×N (default 3)
105:export const DEFAULT_STALE_MULTIPLIER = 3;        // stale = task interval × 3
123:export const CRASH_CRITICAL_TASKS = [
151:  // this name (stale entry). 
... [+4161 chars truncated]

### User | 2026-06-10T01:14:15.688Z

[tool_result] 47:/** Ignore a telemetry row older than this — too stale to trust as "current". */
114: * (both peers see stale stamp → both spawn) is a separate, BOUNDED concern:
144: * there is nothing worth surfacing (clean / stale / malformed row).
147:export function buildAdvisory(row, nowMs) {
170:  const tag = row.level === "critical" ? "CRITICAL" : "WARN";
174:  // NOT live — a task you just enabled/regi
... [+305 chars truncated]

### Assistant | 2026-06-10T01:14:18.913Z

Now let me read the key function bodies precisely — `selectReenableTargets`/`reenableTasks` (the G10 guard), the classifier's stale/failing handling, and the reaper's softRelief + GPU/ollama coordinator — to ground the gap analysis exactly.

### Assistant | 2026-06-10T01:14:19.867Z

[tool_use: Read]

### Assistant | 2026-06-10T01:14:20.849Z

[tool_use: Read]

### Assistant | 2026-06-10T01:14:21.518Z

[tool_use: Read]

### User | 2026-06-10T01:14:24.799Z

[tool_result] 120	 * The process/memory-hygiene tasks. ≥2 of these degraded simultaneously is
121	 * `critical` even if neither is a MUST_EXIST task — the net is collapsing.
122	 */
123	export const CRASH_CRITICAL_TASKS = [
124	  "PRISM Fleet Reaper",
125	  "PRISM Fleet Memory Monitor",
126	  "PRISM Cleanup Orchestrator",
127	  "PRISM Node Orphan Cleaner",
128	  "PRISM WSL Memory Guard",
129	  "PRISM Zombie Rea
... [+3598 chars truncated]

### User | 2026-06-10T01:14:24.888Z

[tool_result] 940	 * Until now the watchdog only NAGGED -- a WARN every audit until a human ran
941	 * `Enable-ScheduledTask` by hand. This makes the WARN self-healing.
942	 *
943	 * SAFE = the task is (a) currently `disabled` AND (b) a known CRASH_CRITICAL task
944	 * AND (c) NOT in EXPECTED_DISABLED_TASKS. The HW-migration freeze is deliberately
945	 * NOT a gate here: aggregateHealth excuses a disabled task 
... [+5246 chars truncated]

### User | 2026-06-10T01:14:25.789Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * docker-service-health-stop.mjs — Stop-hook arm of the Docker-service health
5	 * guard (scripts/docker-service-health-check.mjs).
6	 *
7	 * THE GAP. The local compute stack's named services (qdrant/postgres/
8	 * prometheus/grafana) can silently go DOWN — Qdrant alone did it 3× (2026-05-24,
9	 * -05-28, -06-08), each time degrading semantic vector sea
... [+4316 chars truncated]

### Assistant | 2026-06-10T01:14:28.307Z

Now let me read the classifier (stale/failing classification) and the reaper's softRelief + GPU/ollama coordinator to ground the remaining findings precisely.

### Assistant | 2026-06-10T01:14:29.317Z

[tool_use: Read]

### User | 2026-06-10T01:14:30.900Z

[tool_result] 660	  // Scheduler could not run the action (missing node, bad path, access
661	  // denied, hard crash). Small exit codes are the SCRIPT's own findings and
662	  // are NEVER a task-health failure — see isLaunchFailureCode.
663	  const r = t.lastTaskResult;
664	  // Transient system-pressure spawn-refusal: the box was momentarily saturated
665	  // (commit near ceiling) so Task Scheduler couldn't
... [+7468 chars truncated]

### Assistant | 2026-06-10T01:14:31.403Z

[tool_use: Grep]

### User | 2026-06-10T01:14:33.153Z

[tool_result] 1:// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
19: * every running node/git/bash PID to its owning chat slot via process ancestry
44: *   node fleet-reaper-sweep.mjs --once --json         # one sweep, JSON
49: *   node fleet-reaper-sweep.mjs --once --stop-event   # invoked by the Stop hook
86:// the right thing on dissimilar PCs (home: 16GB GPU + 7B model + 90% m
... [+4635 chars truncated]

### Assistant | 2026-06-10T01:14:36.813Z

I now have enough grounded detail. Let me confirm one critical thing for my highest-ROI candidate: whether the `stale`/`failing` classification has any auto-repair path (vs. just WARN), and whether the Ollama coordinator's prewarm is the only self-action for a downed daemon.

### Assistant | 2026-06-10T01:14:38.713Z

[tool_use: Grep]

### Assistant | 2026-06-10T01:14:40.298Z

[tool_use: Grep]

### User | 2026-06-10T01:14:40.477Z

[tool_result] 783:    return !!t && (t.status === "disabled" || t.status === "failing" || t.status === "trigger-stalled");

### User | 2026-06-10T01:14:42.055Z

[tool_result] 16: * `<id>_prism-qdrant` in "Created" state and `docker start prism-qdrant` 404s.
21: * never starts/stops anything (the --fix action is operator-invoked on the CLI).
120:    + `Fix: node scripts/docker-service-health-check.mjs --fix `
133:export function buildOllamaAdvisory(probe) {
161:      + `Repair: node scripts/singleton-service-guard.mjs --fix`;
171:export async function ollamaNativeProbe(
... [+327 chars truncated]

### Assistant | 2026-06-10T01:15:39.320Z

I have everything I need, grounded in real file:line. Confirmed: the only auto-repair path in `fleet-task-health-watch.mjs` is `selectReenableTargets`+`reenableTasks` (the `disabled`→Enable G10 heal, line 964/1002); `stale`/`failing`/`trigger-stalled` classifications (line 715/675/701) have NO auto-repair — they only feed `degraded`/`isHardDown` for WARN aggregation. And `docker-service-health-stop.mjs` is advisory-only with the `--fix` operator-invoked (line 21).

Here is my review.

---

GOLF SELF-REPAIR GAP ANALYSIS — fleet-task-health + reaper + docker as the fleet's self-repair layer

The article's thesis applied: golf's watchdogs already do the trace→alert half well. The G10 guard (`selectReenableTargets` fleet-task-health-watch.mjs:964 + `reenableTasks`:1002, wired into `runOnce` ~1093) is the ONE place golf crossed from "alert" to "auto-repair": a disabled crash-critical task now self-heals (Enable-only, soul-safe). Every finding below is a place a trace/WARN lands but a human still has to act.

FINDING 1 — `stale` and `failing` crash-critical tasks WARN forever; only `disabled` self-heals.
- SHOULD: the self-repair loop should cover all repairable hard-down states, not one.
- ACTUALLY: `classifyTaskHealth` emits `stale` (watch.mjs:715), `failing` (:675), `trigger-stalled` (:701). All three feed `isHardDown`/`degraded` (:783) → WARN. But `selectReenableTargets` (:976) ONLY matches `t.status === "disabled"`. A crash-critical task that is Registered+Enabled but `stale` (LastRunTime frozen, e.g. the daemon died but the task object is fine) or `trigger-stalled` (NextRunTime frozen in the past, :701) is WARNed every Stop and NEVER auto-kicked — even though `Start-ScheduledTask`/`schtasks /Run` is the exact inverse-of-disable safe op the G10 JSDoc already blesses (:956). Note the reaper guardian ALREADY does this for its OWN task (golf-slot-reaper-guardian.mjs:331 kicks `schtasks /Run` on stall) — but the generic watchdog doesn't generalize it to the other 6 crash
... [+7467 chars truncated]
