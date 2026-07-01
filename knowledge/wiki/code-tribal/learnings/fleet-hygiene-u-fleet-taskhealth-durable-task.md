# FLEET-HYGIENE/U-FLEET-TASKHEALTH-DURABLE-TASK — [MAIN-FORCE] [FLEET-HYGIENE]/U-FLEET-TASKHEALTH-DURABLE-TASK (slot:golf): installer + live registration of the "PRISM Fleet Task Health" durable scheduled task (watchdog-over-the-watchdogs)

**Commit:** `368b015ce82c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:01:13-05:00
**Tags:** fleet-hygiene, u-fleet-taskhealth-durable-task, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-FLEET-TASKHEALTH-DURABLE-TASK (slot:golf): installer + live registration of the "PRISM Fleet Task Health" durable scheduled task (watchdog-over-the-watchdogs)

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-FLEET-TASKHEALTH-DURABLE-TASK (slot:golf): installer + live registration of the "PRISM Fleet Task Health" durable scheduled task (watchdog-over-the-watchdogs)

GAP: the fleet-task-health-watch.mjs audit ran ONLY via the Stop hook
(fleet-task-health-stop.mjs -- near-continuous while chats are open) and the
durable "PRISM Fleet Task Health" scheduled task was ABSENT (verified: 75 PRISM
tasks, this one not among them). The two sibling crash-prevention tasks (Fleet
Reaper, Fleet Memory Monitor) each have a durable installer; this completes the
set with the belt-and-suspenders timer-driven layer that keeps auditing even
when no chat is open (e.g. overnight).

WHAT: new .claude/helpers/install-fleet-task-health-task.ps1, cloned from the
install-fleet-memory-monitor-task.ps1 sibling (R11/R13/R15 -- same param block,
isAdmin guard, node-exe resolution, head-sanity check, dual trigger, splat
register, RunNow poll, knobs footer). Runs fleet-task-health-watch.mjs --once
every 5 min + AtStartup, +270s phase offset (clear of cleanup +60 / mem-relief
+120 / reaper +210 / memmon +330), S4U + RunLevel Highest (runs
whether-logged-on + at boot), ExecutionTimeLimit 180s, MultipleInstances
IgnoreNew, RestartCount 3.

LIVE: registered + RunNow -> State=Ready, LastTaskResult=0 (CLEAN, all
safety-net tasks healthy), NextRun armed on the 5-min cadence. Task count
75 -> 76. The 2026-06-08 migration freeze is LIFTED (only 2/76 tasks disabled
now, neither crash-critical), so arming this is consistent with current state.

ACCURACY (per-file 2-arm scrutiny, 3 rounds): the watchdog is NOT purely
advisory -- its live --once path has a G10 self-heal that re-enables a DISABLED
crash-critical task (CRASH_CRITICAL_TASKS, NOT in EXPECTED_DISABLED_TASKS) via
Enable-ScheduledTask, default-on, off via PRISM_FTH_AUTO_REENABLE_DISABLE=1 or
-DryRun. It NEVER kills a process, NEVER registers a task, and only ever
Enable (never Disable). A migration freeze does NOT suppress this re-enable (a
crash-critical task is load-bearing; a prior freeze gate was removed after it
neutered the guard). The header + Description + footer knob all state this
accurately. ExecutionTimeLimit 180s covers the worst-case 7-crash-critical x
15s serial re-enable fan-out + 15s sampler.

Reversible: -Uninstall removes it; Disable-ScheduledTask pauses it;
PRISM_FTH_AUTO_REENABLE_DISABLE=1 makes it detect-and-advise-only.
```

## Files touched (2)
- .claude/helpers/install-fleet-task-health-task.ps1 | 229 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 229 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 368b015ce82c`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._