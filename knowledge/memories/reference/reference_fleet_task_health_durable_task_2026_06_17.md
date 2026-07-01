---
name: reference_fleet_task_health_durable_task_2026_06_17
description: "The \"PRISM Fleet Task Health\" durable scheduled task is now REGISTERED (was absent) via a new installer; the watchdog re-enables disabled crash-critical tasks even mid-freeze (G10, NOT advisory-only)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.577Z
aliases: reference_fleet_task_health_durable_task_2026_06_17
---


# PRISM Fleet Task Health durable task -- registered + installer created (2026-06-17, slot:golf)

Commit `368b015ce8` ([MAIN-FORCE] [FLEET-HYGIENE]/U-FLEET-TASKHEALTH-DURABLE-TASK). Operator directive "try doing it yourself" (after I'd flagged it operator-only-elevated).

## What was done
- New installer `.claude/helpers/install-fleet-task-health-task.ps1` -- the THIRD durable fleet-crash-prevention task installer, cloned from `install-fleet-memory-monitor-task.ps1` (siblings: reaper, memory-monitor).
- Registered LIVE: `PRISM Fleet Task Health`, S4U + RunLevel Highest (runs whether-logged-on + at boot), `fleet-task-health-watch.mjs --once` every 5 min + AtStartup, +270s phase offset, ExecutionTimeLimit 180s, RestartCount 3. State=Ready, RunNow LastTaskResult=0 (CLEAN). Task count 75 -> 76.
- It is the belt-and-suspenders timer layer for the watch that previously ran ONLY via the `fleet-task-health-stop.mjs` Stop hook (near-continuous while chats open; this covers the no-chat-open window e.g. overnight).

## Operationally-important caveat (scrutiny-caught, verify before relying)
The watchdog's live `--once` path is NOT purely advisory. Its **G10 self-heal re-enables a DISABLED crash-critical task** (`CRASH_CRITICAL_TASKS` = Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, Node Orphan Cleaner, WSL Memory Guard, Zombie Reaper v2, Zulu Orchestrator) via `Enable-ScheduledTask`. Gates: (a) Disabled, (b) crash-critical, (c) NOT in `EXPECTED_DISABLED_TASKS` (currently empty), plus off via `PRISM_FTH_AUTO_REENABLE_DISABLE=1` or `-DryRun`.
- **A migration freeze does NOT suppress this** -- `selectReenableTargets` (`scripts/fleet-task-health-watch.mjs:1170-1188`) deliberately does not consult `migrationFreezeActive` (a prior `if(freeze) return []` was removed after it neutered the guard for weeks). So to keep a crash-critical task disabled on purpose, add it to `EXPECTED_DISABLED_TASKS` or set the knob -- a freeze alone will NOT hold it.
- It NEVER kills a process, NEVER registers a task, only ever Enable (never Disable).

## Freeze status (2026-06-17)
The 2026-06-08 migration freeze ([[project_scheduled_task_migration_freeze_2026_06_08]]) is effectively LIFTED: only 2/76 PRISM tasks disabled (`PRISM Tribal Consolidate Weekly`, `PRISM Zebra Orchestrator` -- neither crash-critical), vs ~47 at freeze time. Arming this task is consistent with current state.

## Reversible
`-Uninstall` removes it; `Disable-ScheduledTask -TaskName 'PRISM Fleet Task Health'` pauses; `PRISM_FTH_AUTO_REENABLE_DISABLE=1` makes it detect-and-advise-only.

## Scrutiny
Per-file 2-arm scrutiny, 3 rounds: round 1 caught the inaccurate "Advisory only -- never auto-registers" Description (R12) + ExecutionTimeLimit-too-tight; round 2 caught a NEW false "suppressed under migration freeze" clause I introduced; round 3 both arms PASS. Lesson: when documenting a script's behavior in an installer, verify the gating against the script's ACTUAL predicate -- do not assume a freeze gate exists.
