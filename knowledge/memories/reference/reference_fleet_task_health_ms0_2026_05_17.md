---
name: reference-fleet-task-health-ms0-2026-05-17
description: "FLEET-TASK-HEALTH-MS0 — watchdog over PRISM's ~8 crash-prevention scheduled tasks (A) + critical-pressure /compact actuator hook (B). Built 2026-05-17 slot mike."
aliases: reference_fleet_task_health_ms0_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.118Z
---


# FLEET-TASK-HEALTH-MS0 (2026-05-17, slot mike)

Built in response to operator ask "keep an eye on windows tasks and system
performance to ensure chats don't crash. can we build something else?" Two
strictly-additive units; both advisory-only (never kill, never register tasks).

## A — scheduled-task health watchdog
Closes the gap: PRISM's crash-prevention safety net is ~8 `PRISM *` Windows
scheduled tasks, but nothing watched whether those tasks were themselves
healthy (disabled / wedged / failing / never-run went silent until a crash).
- `scripts/fleet-task-health-watch.mjs` — enumerates every `PRISM *` task via
  one PowerShell call; classifies healthy/disabled/failing/stale/never-ran/
  unknown-state; aggregates clean/warn/critical; telemetry JSONL + cooldowned
  AGENT_CHAT advisory. Exit 0/1/2/3.
- `.claude/hooks/fleet-task-health-stop.mjs` — Stop hook, rides the fleet Stop
  stream so the watchdog runs densely without its own scheduled task. Throttled
  (stamp). Wired into settings.json Stop chain.

## B — critical-pressure compact actuator
- `.claude/hooks/critical-memory-compact-nudge.mjs` — UserPromptSubmit hook;
  when [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]] telemetry is fresh + `critical` AND this chat's slot
  is the named `largestTree`, injects a blunt /compact directive into the
  prompt. Fires in exactly one chat per critical episode. Wired into
  settings.json UserPromptSubmit chain.

## Load-bearing lessons
- **Small exit code ≠ task failure.** A `failing` task is judged ONLY by a
  Windows HRESULT launch-failure code (high-bit-set, e.g. 0x80070002). PRISM
  monitors exit 1/2/3 as FINDINGS — the first cut treated every nonzero
  `LastTaskResult` as failure and false-flagged [[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]] + Synergy
  Watch. Caught by a live `--dry-run` smoke test. See `isLaunchFailureCode`.
- **Only /compact frees a live chat's memory** — a working-set trim pages back
  in, and a hook cannot invoke /compact. So B's value is purely *targeting* the
  directive at the right chat at a decision point, not relief itself.
- B matches the largest tree BY SLOT — it fires only when [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]]
  labels the largest tree with a slot name; an unlabeled `tree-PID` → B silent
  (graceful degradation). Widening coverage = fixing the monitor's attribution.
- chat-slots.json path order MUST mirror the telemetry producer
  ([[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]]: `.claude/state/` primary, `state/shared/` fallback) —
  a reviewer caught B reading them inverted (latent: `.claude/state/` is absent
  today so both fall through, but a future drift would misroute the nudge).

## Tests / knobs
32 node:test cases for A (`scripts/__tests__/fleet-task-health-watch.test.mjs`),
19 for B (`.claude/hooks/__tests__/critical-memory-compact-nudge.test.mjs`) —
both with fail-on-revert regression guards. Knobs:
`PRISM_FLEET_TASKHEALTH_{DISABLE,STALE_MULT,ADVISORY_COOLDOWN_SEC,PS_TIMEOUT_MS}`,
`PRISM_CRIT_MEM_NUDGE_{DISABLE,COOLDOWN_SEC}`.

Wiki: `knowledge/wiki/architecture/fleet-task-health-ms0.md`. Sister to
[[reference_fleet_reaper_ms1]] and [[reference_fleet_memory_monitor_2026_05_16]]
— same scheduled-task pattern; this audits the tasks the others depend on.
