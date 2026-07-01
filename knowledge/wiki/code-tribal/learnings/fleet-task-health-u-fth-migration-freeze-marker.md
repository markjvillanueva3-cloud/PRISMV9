# FLEET-TASK-HEALTH/U-FTH-MIGRATION-FREEZE-MARKER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-MIGRATION-FREEZE-MARKER (slot:golf): marker-driven freeze partition — supersedes the static disabled-list

**Commit:** `4141daf9d80e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T02:58:02-05:00
**Tags:** fleet-task-health, u-fth-migration-freeze-marker, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-MIGRATION-FREEZE-MARKER (slot:golf): marker-driven freeze partition — supersedes the static disabled-list

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-MIGRATION-FREEZE-MARKER (slot:golf): marker-driven freeze partition — supersedes the static disabled-list

Evolves U-FTH-EXPECTED-DISABLED-PARTITION (698cf12ad2). That commit hardcoded 4
disabled task names — but the authoritative project memory
(project_scheduled_task_migration_freeze_2026_06_08) shows the freeze spans ~47
tasks AND the disabled set FLUCTUATES across readings (a detached audit races on
every Stop). A static list of 4 can never track a fluctuating ~47-task set, so it
left ~43 still crying wolf. (My own pre-compaction investigation,
reference_fleet_task_health_cry_wolf_2026_06_09, had already concluded a static
list is the wrong design — I missed it when building commit 1. R8/R12 self-catch.)

THE FIX: a migration-active MARKER (state/shared/MIGRATION-FREEZE-ACTIVE.flag,
env override PRISM_MIGRATION_FREEZE_ACTIVE) that makes the operator-note
source-of-truth (install-vault-rot-sentinel-cron.ps1:11-16) machine-readable.
While active, aggregateHealth treats a DISABLED non-load-bearing task as an
expected pause; when the marker clears, disabled tasks resume flagging
IMMEDIATELY — closing the 'static list silently hides a task after the freeze
ends' staleness trap the marker design exists to avoid.

LOAD-BEARING GUARD (R12): a disabled MUST_EXIST / crash-critical task is NEVER
auto-excused by the freeze — the operator would not freeze a reaper, so a
disabled one is a real signal. EXPECTED_DISABLED_TASKS is kept (now empty) as the
narrow allowlist for permanent individual exceptions (e.g. superseded tasks).

LIVE-VALIDATED (flag-file path, no env): 7 frozen tasks partition into
expectedDisabled; cry-wolf drops from 9 flagged → 2 GENUINE signals that survive
correctly — Blueprint OCR Batch=stale (real 'not firing' signal) and Zombie
Reaper v2=disabled (a crash-critical reaper the guard refuses to silence). The
WARN now means something again.

83/83 tests (8 new: isMigrationFreezeActive env/file/fail-soft + freeze-active
partition + load-bearing-not-excused + freeze-inactive-resumes + stale-not-excused).
REMOVE the flag file when the migration completes.
```

## Files touched (4)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 80 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-task-health-watch.mjs                | 55 +++++++++++++++++++++++++++++++++++++++++++++++++------
- state/shared/MIGRATION-FREEZE-ACTIVE.flag          | 25 +++++++++++++++++++++++++
- 3 files changed, 154 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till crying wolf. (My own pre-compaction investigation,
- wrong design — I missed it when building commit 1. R8/R12 self-catch.)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4141daf9d80e`
- Milestone envelope: `mcp-server/data/milestones/FLEET-TASK-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._