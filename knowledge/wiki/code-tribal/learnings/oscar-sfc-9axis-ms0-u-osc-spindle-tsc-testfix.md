# OSCAR-SFC-9AXIS-MS0/U-OSC-SPINDLE-TSC-TESTFIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC-TESTFIX (slot:oscar): fix the baseline test my TSC wiring (9ebdb76d00) broke -- scrutiny-caught regression

**Commit:** `3c62758d1a59` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:44:42-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-spindle-tsc-testfix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC-TESTFIX (slot:oscar): fix the baseline test my TSC wiring (9ebdb76d00) broke -- scrutiny-caught regression

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC-TESTFIX (slot:oscar): fix the baseline test my TSC wiring (9ebdb76d00) broke -- scrutiny-caught regression

3-of-3 scrutiny (B+C FAIL) caught that U-OSC-SPINDLE-TSC broke a pre-existing assertion:
SpeedFeedNineAxisOrchestratorEngine.test.ts:193 "flood = exactly 1.0 baseline" used the full
fixture MILL_ALUMINUM_FULL_9AXIS which sets through_spindle_coolant:true + flood, so the new TSC
+8% bonus made coolant_effectiveness 1.08 != 1.0. My prior "48/48 green" claim was FALSE (R12) --
I ran 5 chosen files, NOT the engine's own 59-test suite. FIX: isolate the flood TYPE baseline by
setting through_spindle_coolant:false for that assertion (still toBe(1.0), NOT weakened -- the
TSC-on case is covered in spindleTscWiring.test.ts). Full engine suite now 59/59 + TSC 7/7 = 66/66.
```

## Files touched (2)
- mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts | 7 +++++--
- 1 file changed, 5 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till toBe(1.0), NOT weakened -- the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3c62758d1a59`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._