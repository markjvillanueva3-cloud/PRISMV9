# OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST-HARDEN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CALIB-PERSIST-HARDEN (slot:oscar): close 3-of-3 scrutiny P2s — fix clamped-flag false-positive (band-test not round-compare), add ledger_rows_skipped observability + loud WARNING on zero-usable schema drift, guard persist() tmp-cleanup on rename failure. 19/19 engine tests (5 new regression locks)

**Commit:** `3438987f0eb3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T15:07:30-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-calib-persist-harden, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CALIB-PERSIST-HARDEN (slot:oscar): close 3-of-3 scrutiny P2s — fix clamped-flag false-positive (band-test not round-compare), add ledger_rows_skipped observability + loud WARNING on zero-usable schema drift, guard persist() tmp-cleanup on rename failure. 19/19 engine tests (5 new regression locks)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CALIB-PERSIST-HARDEN (slot:oscar): close 3-of-3 scrutiny P2s — fix clamped-flag false-positive (band-test not round-compare), add ledger_rows_skipped observability + loud WARNING on zero-usable schema drift, guard persist() tmp-cleanup on rename failure. 19/19 engine tests (5 new regression locks)
```

## Files touched (3)
- mcp-server/src/__tests__/SpeedFeedCalibrationPersistEngine.test.ts | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedCalibrationPersistEngine.ts        | 59 +++++++++++++++++++++++++++++++++++++++++++++++++----------
- 2 files changed, 98 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3438987f0eb3`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._