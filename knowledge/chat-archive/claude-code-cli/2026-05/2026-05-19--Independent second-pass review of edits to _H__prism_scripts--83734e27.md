---
type: "chat-session"
source: "claude-code-cli"
session_id: "83734e27-22c8-45b2-bf03-84f276b2cdd7"
title: "Independent second-pass review of edits to `H:/prism/scripts/fleet-reaper-sweep."
date: "2026-05-19"
first_ts: "2026-05-19T17:08:07.007Z"
last_ts: "2026-05-19T17:10:23.024Z"
cwd: "H:\\PRISM"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-ae48a9b3271ffdc81.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of edits to `H:/prism/scripts/fleet-reaper-sweep.

> **claude-code-cli** | 2026-05-19 | 12 msgs (5 user / 7 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-ae48a9b3271ffdc81.jsonl`

## Transcript

### User | 2026-05-19T17:08:07.007Z

Independent second-pass review of edits to `H:/prism/scripts/fleet-reaper-sweep.mjs` (Unit 1 of a fleet-resilience build). Do NOT assume a prior reviewer caught everything — review fresh.

WHAT CHANGED: this file (the PRISM fleet-reaper, a safety-critical orphan-process reaper that also self-heals its own Windows scheduled task) gained stalled-trigger detection. A scheduled task can be `State: Ready` yet have `NextRunTime` frozen in the past (trigger stalled → never fires). New exported pure fns `parseTaskNextRun(stdout)` and `isTriggerStalled(nextRunMs, nowMs, cadenceMs, mult=1.5)`; a new `triggerStalled` param on `taskSelfHealAction`; a new `DEFAULT_TASK_CADENCE_SEC=300` const; and caller wiring inside `runSweep` (~line 1619-1648) that parses NextRun from the existing `schtasks /Query /V /FO LIST` call and passes `triggerStalled` through.

Read the whole file. Weight your review toward what a code-correctness reviewer is LESS likely to catch:
- SAFETY: this is a process-reaper. Could the new `triggerStalled→run` path cause a harmful side effect? `runScheduledTaskNow` does `schtasks /Run` — is re-running an already-Ready-but-stalled task safe + idempotent? Could a false-positive `isTriggerStalled` trigger a `schtasks /Run` storm (every 5-min sweep re-runs it)? Is there a feedback loop where running the task resets NextRun, or NOT — and if not, does the sweep re-fire `run` forever?
- INTEGRATION: `isTriggerStalled` and `parseTaskNextRun` are exported — Unit 1 also imports `isTriggerStalled` into `.claude/hooks/golf-slot-reaper-guardian.mjs`. Is the signature stable/clean enough to be a shared contract?
- The `mult=1.5` slack: with a 300s cadence, stall fires at >450s past. Is that the right sensitivity for a safety mechanism — too eager (false self-heal) or too slow (5+ min blind)?
- Error budget: if `schtasks` is missing/slow, `taskNextRunMs` stays null → `isTriggerStalled`→false → no spurious action. Confirm that degradation path.
- Naming/convention conformance w
... [+148 chars truncated]

### Assistant | 2026-05-19T17:08:41.479Z

I'll review the changed file with focus on safety, integration, and second-order effects.

### Assistant | 2026-05-19T17:08:42.005Z

[tool_use: Bash]

### User | 2026-05-19T17:09:18.016Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
2993

### Assistant | 2026-05-19T17:09:24.339Z

[tool_use: Grep]

### User | 2026-05-19T17:09:31.713Z

[tool_result] 1621:      let taskNextRunMs = null;
1627:        taskNextRunMs = parseTaskNextRun(r);
1632:        Math.max(30, Number(process.env.PRISM_FLEET_REAPER_TASK_CADENCE_SEC) || DEFAULT_TASK_CADENCE_SEC) * 1000;
1633:      const taskTriggerStalled = isTriggerStalled(taskNextRunMs, Date.now(), taskCadenceMs);
1634:      const taskDecision = taskSelfHealAction({
1636:        triggerStalled: taskTriggerSta
... [+856 chars truncated]

### Assistant | 2026-05-19T17:09:36.101Z

[tool_use: Read]

### User | 2026-05-19T17:09:47.663Z

[tool_result] 2505	const DEFAULT_NIM_RESTART_COOLDOWN_SEC = 300;
2506	const NIM_START_SCRIPT = "H:/Tools/nim/start.ps1";
2507	/** The "PRISM Fleet Reaper" scheduled-task repetition interval — install-fleet-reaper-task.ps1
2508	 *  registers a 5-min trigger. Used to judge whether the task's NextRunTime has stalled
2509	 *  (State:Ready but the trigger frozen in the past). Override: PRISM_FLEET_REAPER_TASK_CADENC
... [+10411 chars truncated]

### Assistant | 2026-05-19T17:09:52.503Z

Now let me examine the caller wiring inside `runSweep`.

### Assistant | 2026-05-19T17:09:53.508Z

[tool_use: Read]

### User | 2026-05-19T17:10:00.128Z

[tool_result] 1600	      });
1601	      if (nimDecision.action === "restart") {
1602	        const r = restartNimDaemon({});
1603	        if (r.ok) {
1604	          try {
1605	            mkdirSync(dirname(nimMarkerPath), { recursive: true });
1606	            writeFileSync(nimMarkerPath, JSON.stringify({ ts: Date.now(), pid: r.pid }));
1607	          } catch { /* mtime is the load-bearing signal — even if writ
... [+3986 chars truncated]

### Assistant | 2026-05-19T17:10:23.024Z

Now I have what I need. Let me verify the critical safety concern — whether `schtasks /Run` resets NextRunTime.

The key safety question is whether `schtasks /Run` on a stalled task fixes the frozen `NextRunTime`. This is the load-bearing assumption. Let me check the surrounding NIM keepalive pattern for cooldown precedent — note `nimKeepaliveAction` has a `lastRestartMs`/`cooldownSec` cooldown, but `taskSelfHealAction` has **none**.

## Review: `fleet-reaper-sweep.mjs` stalled-trigger detection

**P1 — No cooldown on the `triggerStalled → run` path; storm risk if `schtasks /Run` does NOT advance NextRunTime (line 1638-1644, 2603-2627).** This is the dominant second-order risk. `schtasks /Run` starts the task *out-of-band* — on Windows it does **not** reliably re-arm a stalled repetition trigger; `NextRunTime` of a trigger that has genuinely stalled often stays frozen. If so, every 5-min sweep re-evaluates `isTriggerStalled→true` and re-fires `schtasks /Run` **forever**. Compare the sibling `nimKeepaliveAction` (line 2578) which is explicitly cooldown-gated via `lastRestartMs`/marker-file — `taskSelfHealAction` has no equivalent. The reaper itself is the task being re-run, so a storm = the reaper spawning extra copies of itself under memory pressure. Fix: add a marker-file cooldown (mirror the NIM/global-compact pattern at 1656-1660) so a stalled-but-unfixable trigger is re-run at most once per N minutes, and surface a louder caveat after repeated failures. The doc comment at 2670 (`Sync, idempotent`) is **overclaiming** — `/Run` is idempotent in the "no error" sense but not "harmless to repeat": each call launches another reaper instance.

**P2 — `Date.now()` sampled three times (1633, 1663, plus probe).** Minor: `isTriggerStalled` and `decideGlobalCompaction` each get a fresh `Date.now()`. Harmless here but inconsistent with capturing one `nowMs` per sweep; a code-correctness reviewer flagged style, the real point is testability/determinism.

**P2 — `mult=1.5` sen
... [+1157 chars truncated]
