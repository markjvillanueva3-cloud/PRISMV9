---
name: reference-cimco-live-drive-blockers-2026-06-09
description: "Two verified blockers gating the full-fidelity all-15 CIMCO live sim sweep (echo, 2026-06-09 PM)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.516Z
aliases: reference_cimco_live_drive_blockers_2026_06_09
---


CIMCO closed-loop sim arm -- all-fleet live drive (slot:echo, 2026-06-09 PM). **STATUS: COMPLETE -- both blockers below are now CLOSED; the all-15 unattended sweep RAN TO COMPLETION** (12/12 sim-able `found=true`, sim ran + report read; 3 EDM routed; commits 40cf2e0d3b + a28927fc0b, 3-of-3 PASS). The two blockers were (R12 -- characterized, not assumed):

**Blocker 1 -- two-process invoke->read attach unreliable in batch.** `--op read-report` runs as a SEPARATE `PrismCimcoUI.exe` process from the `--keep` invoke. Manual/human-paced read found the live grid; in tight batch timing it returns `no-read` (the read process can't reliably grab the window the invoke process holds). FIX = a single-process C# `invoke+read` op that holds the window handle throughout. Next echo unit.

**Blocker 2 -- repeated CIMCO launches get reaped.** ONE CIMCO launch per node process survives; a SECOND launch in a loop/process is SIGKILLed (`exit 137`, OOM/reaper). CIMCO Edit is ~320MB each; the always-on fleet-reaper (golf domain, MUST-KEEP-RUNNING) treats the reparented CIMCO GUI as an orphan. The resumable per-machine driver (one launch per short-lived process) is the right shape, but the all-15 sweep needs reaper coordination to exempt sim-launched CIMCO mid-run. Don't brute-force a multi-launch loop -- it just burns budget + leaves orphans.

**R14 gotcha (fixed):** `killCimco()` must kill `PrismCimcoUI.exe` too, not just `CIMCOEdit.exe`/`CIMCOSimulation.exe` -- the `--keep` driver lingers resident holding CIMCO, and the next `--launch` collides with the half-dead instance ("no XTPMainFrame window"). Add a post-kill settle (taskkill /F is async).

**Shipped this session:** `scripts/cimco-fleet-drive.mjs` (resumable per-machine driver, incremental flush + cursor, orphan-kill); normalizer `report-header-only` source (header columns + 0 data rows = AMBIGUOUS, deliberately NON-clearing -- the earlier "treat header-only as CLEAN" note was WRONG, corrected). 87 tests green (69 driver + 18 normalizer). Status: `state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md`. Lesson: one heavy-GUI launch per short-lived process; never loop-spawn. See [[feedback_close_background_tasks_at_stop]].
