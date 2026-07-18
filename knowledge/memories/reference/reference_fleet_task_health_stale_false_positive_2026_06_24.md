---
name: reference_fleet_task_health_stale_false_positive_2026_06_24
description: "fleet-task-health false-flags weekly + blank-NextRun tasks as stale (NN-Graph Retrain, Tribal Embed) -- benign false-positive, diagnosed for golf"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.578Z
aliases: reference_fleet_task_health_stale_false_positive_2026_06_24
---


**DIAGNOSED FALSE-POSITIVE (2026-06-24, slot:alpha -- for golf/fleet-hygiene to fix).**

`fleet-task-health-stop.mjs` (Stop hook) emits a recurring `WARN -- PRISM NN-Graph Retrain=stale, PRISM Tribal Embed=stale` on every turn. **Verified BENIGN -- both tasks are healthy:**
- `PRISM NN-Graph Retrain`: State=Ready, LastTaskResult=0 (success), LastRun 06/17, **NextRun 06/25** (scheduled) -- it is a WEEKLY task, so a 7-day-old last-run is normal cadence.
- `PRISM Tribal Embed`: State=Ready, LastTaskResult=0 (success), **LastRun 06/24 (today)**, NextRun blank.

**Root cause:** `scripts/fleet-task-health-watch.mjs` is designed to be cadence-aware (`stale = interval x DEFAULT_STALE_MULTIPLIER(3)`, reading each task's OWN repetition interval; FALLBACK_GRACE for tasks with no interval). But its per-task repetition-interval reading false-flags these two -- the live watch (fresh run) still classifies them stale even though Windows reports them Ready/LastResult=0/recent-or-scheduled. Likely a Windows trigger-type parsing gap: a Weekly trigger and/or a blank-NextRun (event/non-repeating) trigger isn't yielding the real interval, so the classifier falls back to a SHORT grace window -> false stale. (Note: `--json` audit with a generic `t.stale` filter returned 0 -- the stale flag lives under a different field; read the actual telemetry row schema.)

**Direction is SAFE (false-positive, not false-negative)** -- the warning over-fires harmlessly; a genuinely failed task carries LastResult != 0 (a separate, intact signal). So this is cosmetic alert-fatigue, NOT a missed-failure risk.

**Fix (golf, careful -- this is a SAFETY-monitoring gate):** correct the interval detection for Weekly + blank-NextRun trigger types so their stale window respects real cadence; add a regression test pinning "weekly task last-run < 21d = healthy" and "ran-today = healthy". Do NOT widen the grace globally (risks the dangerous false-NEGATIVE direction -- suppressing real failures). Alpha did NOT self-patch: R8 (subtle owned-elsewhere safety subsystem) + safety-rail (never risk a safety gate without full understanding). Wiki context: [[fleet-task-health-ms0]].
