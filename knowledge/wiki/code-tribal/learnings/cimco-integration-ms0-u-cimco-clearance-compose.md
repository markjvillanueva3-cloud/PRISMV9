# CIMCO-INTEGRATION-MS0/U-CIMCO-CLEARANCE-COMPOSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-CLEARANCE-COMPOSE: composeClearanceInput maps a driveLiveFsm result -> the prism_cimco:cimco_live_run_clearance 5-gate params (driver never owns final clearance, R7; dispatcher side already proven by SIM-6 tests). FAIL-CLOSED: run_complete gated on the DRIVE's ACTUAL quiescence (not just caller-supplied SIM-5 obs) -- a sim that never settled yields run_complete:false even with complete obs, surfacing the timeout blocker. program_units declared-only (25.4x guard). Caught+fixed a real bug via a strengthened assertion (R12): the first cut let supplied runCompleteness override actual drive settling. +5 tests round-tripping REAL driveLiveFsm output (69/69). The full post->NC->CIMCO-sim->report->5-gate closed loop now composes end-to-end in code.

**Commit:** `340fc878f8e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:46:24-05:00
**Tags:** cimco-integration-ms0, u-cimco-clearance-compose, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-CLEARANCE-COMPOSE: composeClearanceInput maps a driveLiveFsm result -> the prism_cimco:cimco_live_run_clearance 5-gate params (driver never owns final clearance, R7; dispatcher side already proven by SIM-6 tests). FAIL-CLOSED: run_complete gated on the DRIVE's ACTUAL quiescence (not just caller-supplied SIM-5 obs) -- a sim that never settled yields run_complete:false even with complete obs, surfacing the timeout blocker. program_units declared-only (25.4x guard). Caught+fixed a real bug via a strengthened assertion (R12): the first cut let supplied runCompleteness override actual drive settling. +5 tests round-tripping REAL driveLiveFsm output (69/69). The full post->NC->CIMCO-sim->report->5-gate closed loop now composes end-to-end in code.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-CLEARANCE-COMPOSE: composeClearanceInput maps a driveLiveFsm result -> the prism_cimco:cimco_live_run_clearance 5-gate params (driver never owns final clearance, R7; dispatcher side already proven by SIM-6 tests). FAIL-CLOSED: run_complete gated on the DRIVE's ACTUAL quiescence (not just caller-supplied SIM-5 obs) -- a sim that never settled yields run_complete:false even with complete obs, surfacing the timeout blocker. program_units declared-only (25.4x guard). Caught+fixed a real bug via a strengthened assertion (R12): the first cut let supplied runCompleteness override actual drive settling. +5 tests round-tripping REAL driveLiveFsm output (69/69). The full post->NC->CIMCO-sim->report->5-gate closed loop now composes end-to-end in code.
```

## Files touched (3)
- scripts/cimco-sim-driver.mjs      | 34 ++++++++++++++++++++++++++++++++++
- scripts/cimco-sim-driver.test.mjs | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 83 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 340fc878f8e3`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._