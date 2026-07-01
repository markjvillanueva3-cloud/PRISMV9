---
name: reference_post_ship_cimco-integration-ms0-u-cimco-clearance-compose
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-CLEARANCE-COMPOSE (commit 340fc878f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.805Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-clearance-compose
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-CLEARANCE-COMPOSE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-CLEARANCE-COMPOSE: composeClearanceInput maps a driveLiveFsm result -> the prism_cimco:cimco_live_run_clearance 5-gate params (driver never owns final clearance, R7; dispatcher side already proven by SIM-6 tests). FAIL-CLOSED: run_complete gated on the DRIVE's ACTUAL quiescence (not just caller-supplied SIM-5 obs) -- a sim that never settled yields run_complete:false even with complete obs, surfacing the timeout blocker. program_units declared-only (25.4x guard). Caught+fixed a real bug via a strengthened assertion (R12): the first cut let supplied runCompleteness override actual drive settling. +5 tests round-tripping REAL driveLiveFsm output (69/69). The full post->NC->CIMCO-sim->report->5-gate closed loop now composes end-to-end in code.

**Shipped:** 2026-06-09T14:46:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cimco-integration-ms0-u-cimco-clearance-compose]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._