---
name: fleet-task-health-ms0
type: architecture
domain: fleet-hygiene
created: 2026-05-17
slot: mike
tags: [scheduled-task, watchdog, memory-pressure, crash-prevention, hook]
---

# FLEET-TASK-HEALTH-MS0 — watchdog over the safety net + critical-pressure compact actuator

Built 2026-05-17 (slot mike) in response to the operator ask: *"keep an eye on
windows tasks and system performance to ensure chats don't crash. can we build
something else for this?"*

Two strictly-additive units. **A** makes PRISM's existing crash-prevention
safety net *trustworthy*; **B** closes the loop from *advisory* to *action* at
the critical moment.

## The gap

PRISM's crash-prevention safety net is ~8 Windows scheduled tasks — `PRISM
Fleet Reaper`, `PRISM Fleet Memory Monitor`, `PRISM Cleanup Orchestrator`,
`PRISM Node Orphan Cleaner`, `PRISM Orphan Process Reaper (PS)`, `PRISM Zombie
Reaper v2`, `PRISM Hook Janitor`, `PRISM Synergy Regression Watch`. Every one
runs unattended on a timer.

- **Nothing watched whether those tasks were themselves healthy.** Each
  installer verifies its own task once at registration; the golf-slot reaper
  guardian re-checks *only* `PRISM Fleet Reaper`. A task disabled by a Windows
  update, wedged (a hung instance + `IgnoreNew`), erroring, or never-running
  degraded the net silently — invisible until a chat crashed.
- **The fleet-memory-monitor only *advises*.** On critical commit pressure it
  names the largest live chat tree as the best `/compact` target — but only to
  `state/shared/AGENT_CHAT.jsonl`, a diffuse bus. Whether the chat that should
  compact ever sees it was left to chance.

## A — scheduled-task health watchdog

- `scripts/fleet-task-health-watch.mjs` — enumerates every `PRISM *` scheduled
  task via one PowerShell `Get-ScheduledTask` + `Get-ScheduledTaskInfo` call;
  reads State / LastRunTime / LastTaskResult / each task's *own* trigger
  repetition interval (cadence is never hard-coded); classifies each as
  `healthy | disabled | failing | stale | never-ran | unknown-state`;
  aggregates to `clean | warn | critical`; appends telemetry to
  `state/shared/fleet-task-health-history.jsonl`; emits a cooldowned advisory
  to `AGENT_CHAT.jsonl`. Exit 0/1/2/3. Advisory only — never registers tasks.
- `.claude/hooks/fleet-task-health-stop.mjs` — Stop hook. Rides the fleet's
  Stop stream (every chat ending a turn) so the watchdog runs densely WITHOUT
  its own scheduled task (avoiding the watch-the-watchman recursion). Reads the
  last telemetry row to inject a warn/critical advisory into the stopping
  chat's verdict; throttled (stamp file) — 13 simultaneous Stops collapse to
  one detached watchdog run. Wired: `settings.json` Stop chain.

**Key design distinction (a live bug, caught + fixed during the build):** a
task `failing` is judged ONLY by a Windows HRESULT launch-failure code
(high-bit-set, e.g. `0x80070002`). A small script exit code (1/2/3) is NOT a
failure — PRISM monitors deliberately exit 1/2/3 as *findings*
(warn/critical/measurement-fail). The first cut treated every nonzero
`LastTaskResult` as failure and false-flagged Fleet Memory Monitor + Synergy
Watch. See `isLaunchFailureCode`.

## B — critical-pressure compact actuator

- `.claude/hooks/critical-memory-compact-nudge.mjs` — UserPromptSubmit hook.
  Reads the fleet-memory-monitor's last telemetry row; when it is fresh and
  `critical` AND this chat's slot equals the monitor's named `largestTree`,
  injects a blunt `/compact` directive into the prompt context, throttled
  per-chat. Fires in exactly ONE chat per critical episode — the named hog —
  so it is never fleet-wide noise. Wired: `settings.json` UserPromptSubmit
  chain.

**Honest scope:** `/compact` is the only action that frees a *live* chat's
memory — a working-set trim just pages back in, and a hook cannot invoke
`/compact`. So B's job is not trimming; it is putting the directive in front
of the exact chat that must act, at a decision point. **Known limitation:** B
matches by slot, so it fires only when the fleet-memory-monitor successfully
labels the largest tree with a slot name; when the monitor emits an unlabeled
`tree-PID`, B stays silent (graceful degradation — the monitor's own
AGENT_CHAT advisory still covers it). Widening B's coverage means improving the
monitor's PID→slot attribution — a separate follow-up.

## Tests

- `scripts/__tests__/fleet-task-health-watch.test.mjs` — 32 node:test cases.
- `.claude/hooks/__tests__/critical-memory-compact-nudge.test.mjs` — 19 cases.
- Both suites carry fail-on-revert regression guards for the two load-bearing
  properties: small exit code ≠ `failing`, and B fires in exactly one case.

## Knobs

| knob | effect |
|------|--------|
| `PRISM_FLEET_TASKHEALTH_DISABLE=1` | watchdog + Stop hook are silent no-ops |
| `PRISM_FLEET_TASKHEALTH_STALE_MULT=N` | stale = task interval × N (default 3) |
| `PRISM_FLEET_TASKHEALTH_ADVISORY_COOLDOWN_SEC=N` | min s between advisories (default 900) |
| `PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS=N` | PowerShell query timeout (default 15000) |
| `PRISM_CRIT_MEM_NUDGE_DISABLE=1` | compact-nudge hook is a silent no-op |
| `PRISM_CRIT_MEM_NUDGE_COOLDOWN_SEC=N` | per-chat nudge cooldown (default 480) |

## Sister entries

`fleet-reaper.md` · `fleet-memory-monitor.md` — same fleet-hygiene family.
This watchdog audits the *scheduled tasks themselves*, the layer the reaper and
the memory monitor silently depend on. Memory:
[[reference_fleet_task_health_ms0_2026_05_17]].
