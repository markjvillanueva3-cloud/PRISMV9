# QUOTING-SYNERGY-MS0/U-QP-CYCLETIME-JM-PROFILES — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CYCLETIME-JM-PROFILES (slot:charlie): add JM Die fleet machine profiles to CycleTimeEstimatorEngine (the real S-curve G-code time engine) so it accurately times programs for the machines JM runs. hurco_vm30i/hurco_vmx24/okuma_m460v profiles + 'hurco' ControllerType + CONTROLLER_DEFAULTS entry. rapid/accel/tool-change/block-proc VERIFIED from GCodeRuntimePredictorEngine.MACHINE_LIBRARY; jerk(~20x accel)/servo/lookahead/spindle DERIVED from peer CONTROLLER_DEFAULTS (R12: no fabricated specs; Roku-Roku deferred-no verified specs). 5/5 tests (profiles resolve + relative invariants: faster-rapid machine<slower, faster-ATC<slower), tsc clean. P0 #1/9 of QUOTING-COST-TIME-AUDIT plan

**Commit:** `2e1386276200` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T12:18:13-05:00
**Tags:** quoting-synergy-ms0, u-qp-cycletime-jm-profiles, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CYCLETIME-JM-PROFILES (slot:charlie): add JM Die fleet machine profiles to CycleTimeEstimatorEngine (the real S-curve G-code time engine) so it accurately times programs for the machines JM runs. hurco_vm30i/hurco_vmx24/okuma_m460v profiles + 'hurco' ControllerType + CONTROLLER_DEFAULTS entry. rapid/accel/tool-change/block-proc VERIFIED from GCodeRuntimePredictorEngine.MACHINE_LIBRARY; jerk(~20x accel)/servo/lookahead/spindle DERIVED from peer CONTROLLER_DEFAULTS (R12: no fabricated specs; Roku-Roku deferred-no verified specs). 5/5 tests (profiles resolve + relative invariants: faster-rapid machine<slower, faster-ATC<slower), tsc clean. P0 #1/9 of QUOTING-COST-TIME-AUDIT plan

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CYCLETIME-JM-PROFILES (slot:charlie): add JM Die fleet machine profiles to CycleTimeEstimatorEngine (the real S-curve G-code time engine) so it accurately times programs for the machines JM runs. hurco_vm30i/hurco_vmx24/okuma_m460v profiles + 'hurco' ControllerType + CONTROLLER_DEFAULTS entry. rapid/accel/tool-change/block-proc VERIFIED from GCodeRuntimePredictorEngine.MACHINE_LIBRARY; jerk(~20x accel)/servo/lookahead/spindle DERIVED from peer CONTROLLER_DEFAULTS (R12: no fabricated specs; Roku-Roku deferred-no verified specs). 5/5 tests (profiles resolve + relative invariants: faster-rapid machine<slower, faster-ATC<slower), tsc clean. P0 #1/9 of QUOTING-COST-TIME-AUDIT plan
```

## Files touched (3)
- mcp-server/src/__tests__/CycleTimeJMProfiles.test.ts | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CycleTimeEstimatorEngine.ts   | 55 ++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 125 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2e1386276200`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._