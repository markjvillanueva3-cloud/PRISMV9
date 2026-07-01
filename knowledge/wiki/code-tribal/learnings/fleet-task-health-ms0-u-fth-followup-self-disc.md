# FLEET-TASK-HEALTH-MS0/U-FTH-FOLLOWUP-SELF-DISC — [MAIN] [FLEET-TASK-HEALTH-MS0]/U-FTH-FOLLOWUP-SELF-DISC: installer self-discovery — closes arm-C deferred P1 + reveals 5 silent + 1 stale

**Commit:** `19f8cc98ca67` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T17:09:54-05:00
**Tags:** fleet-task-health-ms0, u-fth-followup-self-disc, auto-distilled

## Subject
[MAIN] [FLEET-TASK-HEALTH-MS0]/U-FTH-FOLLOWUP-SELF-DISC: installer self-discovery — closes arm-C deferred P1 + reveals 5 silent + 1 stale

## Body
```
[MAIN] [FLEET-TASK-HEALTH-MS0]/U-FTH-FOLLOWUP-SELF-DISC: installer self-discovery — closes arm-C deferred P1 + reveals 5 silent + 1 stale

discoverInstallerTasks + detectInstallerDrift: scan .claude/helpers/install-*-task.ps1 for [string]$TaskName = '<value>', categorise drift vs KNOWN_PRISM_TASKS / MUST_EXIST_TASKS / CRASH_CRITICAL_TASKS. Wired into runOnce telemetry row as installerDrift field — advisory, never elevates audit level.

E2E test caught real drift on first run (the point of the unit):
  + Added 5 silent: PRISM Blueprint Join Refresh, PRISM Memory Pressure Auto-Relief, PRISM NN-Graph Retrain, PRISM RGS Tool Planner, PRISM Source Monitor Sweep
  - Removed 1 stale: PRISM Orphan Process Reaper (PS) — no installer found, false-flagged 'missing' on every audit forever

Per CLAUDE.md 'fix the code or fix the test, never weaken the assertion': hardcoded lists were stale, lists updated to match installer reality, 44/44 PASS, drift closes cleanly. Watchdog now tracks 12 PRISM tasks (was 8, net +4) and correctly omits 1 phantom.

12 new node:test cases. Hermetic mocks for the regex+filter paths + 2 LIVE-DATA oracles (sane shape on real helpers dir + drift==0 against real KNOWN_PRISM_TASKS) — same 'pure-core+injected-readers MUST ship one real-data E2E' lesson as FLEET-TASK-HEALTH-MS0's arm-C round.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 144 +++++++++++++++++++++
- scripts/fleet-task-health-watch.mjs                | 100 +++++++++++++-
- 2 files changed, 240 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- lesson as FLEET-TASK-HEALTH-MS0's arm-C round.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 19f8cc98ca67`
- Milestone envelope: `mcp-server/data/milestones/FLEET-TASK-HEALTH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._