---
title: Fleet-task-health cry-wolf — a static allowlist can't track a fluctuating freeze; use a marker
type: lesson
domain: dev-infra
created: 2026-06-09
by: claude-1dcb25dc
unit: U-FTH-MIGRATION-FREEZE-MARKER
commit: 4141daf9d8
tags: [watchdog, cry-wolf, alert-fatigue, R12, R8, scheduled-tasks, migration-freeze, marker-over-list, load-bearing-guard]
---

# Fleet-task-health cry-wolf — marker over static list

## What broke
The Stop-hook "⚠ PRISM scheduled-task safety net WARN" fired **every Stop** on tasks the
operator had **deliberately disabled** under a ~47-task hardware-migration freeze
([[project-scheduled-task-migration-freeze-2026-06-08]]). `aggregateHealth` classified every
`disabled` task as `degraded` → `level=warn`, so the alert was red for a state the operator
*chose*. An alert that fires on deliberate pauses trains operators to dismiss it — and the next
time a **real** reaper/monitor task fails, that genuine signal is lost in the noise. (Dismissed
~12× in a single session before the fix.)

## The mis-step (R8 self-catch — recorded so it isn't repeated)
The first commit (`698cf12ad2`, U-FTH-EXPECTED-DISABLED-PARTITION) added a **static
`EXPECTED_DISABLED_TASKS` allowlist** of 4 hardcoded task names. It was built *before* reading
the existing investigation memory ([[reference_fleet_task_health_cry_wolf_2026_06_09]]) — which
already concluded a static list is the wrong design. Two reasons it fails:
1. The freeze spans **~47 tasks**, not 4 — the list left ~43 still crying wolf.
2. The disabled set **fluctuates across readings** (a detached audit races on every Stop, so the
   reported subset shifts). A static list of names can *never* track a moving set.

The recall surfaced that memory at edit-time (score 18) and it was opened only *after* committing.
R8 lesson: **read the recall-surfaced memory BEFORE building on the surface it describes**, not
after — the memory IS the prior art the dedup rule exists to honor.

## The fix
A machine-readable **migration-active marker** (`state/shared/MIGRATION-FREEZE-ACTIVE.flag`, env
override `PRISM_MIGRATION_FREEZE_ACTIVE`) makes the human operator-note source-of-truth
(`install-vault-rot-sentinel-cron.ps1:11-16`) gateable. `isMigrationFreezeActive()` reads it
fail-soft (any error ⇒ NOT frozen — flag normally, never suppress). While active, `aggregateHealth`
partitions a `disabled` non-load-bearing task into an informational `expectedDisabled` bucket
instead of `degraded`. When the marker clears, disabled tasks **resume flagging immediately** —
closing the "static list silently hides a task after the freeze ends but before re-enable"
staleness trap that motivated a marker over a list in the first place.

## The load-bearing guard (R12 — the part that makes it safe)
A `disabled` **MUST_EXIST or crash-critical** task (e.g. a reaper) is **NEVER auto-excused** by
the freeze — the operator would not freeze a load-bearing safety net, so a disabled one is a real
signal that must still escalate. STRICT status gate, too: only the exact `disabled` status is an
expected pause; a frozen-listed task that re-appears `failing`/`stale`/`missing` is never swallowed.
The narrow static `EXPECTED_DISABLED_TASKS` list is kept (now empty) only for *permanent* individual
exceptions (e.g. a superseded task that should never be re-enabled), which deliberately override the
load-bearing default and so must each be positively justified.

## Live result
Flag-file path, no env: 7 frozen tasks partitioned into `expectedDisabled`; cry-wolf dropped from
**9 flagged → 2 genuine signals** that survived correctly — `Blueprint OCR Batch=stale` (a real
"registered+enabled but not firing in ~73h" signal) and `Zombie Reaper v2=disabled` (a
crash-critical task the load-bearing guard refuses to silence, left surfaced for operator triage).
The WARN means something again. 83/83 tests (8 new: env/file/fail-soft + freeze-active partition +
load-bearing-not-excused + freeze-inactive-resumes + stale-not-excused).

## Reusable pattern
When a watchdog must tolerate a **temporary, broad, fluctuating** "expected-bad" state:
- Gate on a **marker** (one flag the operator sets/clears), not an enumerated list of the affected
  items — a list drifts the moment the set moves or the temporary state ends.
- Make the marker mirror an existing human source-of-truth so it isn't a solo policy invention.
- **Never let the marker excuse load-bearing items** — the whole point of the watchdog is to catch
  *those* failing, freeze or no freeze.
- Keep a tiny, individually-justified allowlist for *permanent* exceptions, separate from the
  temporary marker.

## See also
[[fleet-task-health-discovery-drift]] · [[fleet-task-health-recovery]] · [[fleet-task-health-ms0]] ·
[[project-scheduled-task-migration-freeze-2026-06-08]] · [[reference_fleet_task_health_cry_wolf_2026_06_09]]
