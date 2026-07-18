# QUOTING-SYNERGY-MS0/U-QP-TRAINING-ORCHESTRATOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINING-ORCHESTRATOR (slot:charlie /goal-yolo iter1): continuous calibration loop. QuotingTrainingOrchestratorEngine.runOnce() composes existing substrate: (1) QuotingTrainingLoopEngine.run -> AccuracyReport, (2) QuotingCalibrationEngine.deriveWithCoV -> factors + CoV gate, (3) when safe_to_activate + writeIfSafe: atomic write to active-calibration.json (temp+rename), (4) optional psi_delta feed via QuoteOutcomePSIDeltaBridgeEngine. Fail-soft on every stage. CoV escalation -> skip write + skip_reason explains why. New dispatcher action quoting_training_orchestrator_run. 11/11 tests covering empty-records reject, safe write, writeIfSafe=false dry-run, CoV-escalation sparse-data skip, atomic temp cleanup, nested dir creation, psi_delta feed on/off, maxFactor clamp, full AccuracyReport return, warnings invariant. Operator overnight directive: 'keep training the system with quoting'. 12 new prism_quoting actions total across iters 11-19+yolo1.

**Commit:** `3d7535feedf7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T22:04:49-05:00
**Tags:** quoting-synergy-ms0, u-qp-training-orchestrator, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINING-ORCHESTRATOR (slot:charlie /goal-yolo iter1): continuous calibration loop. QuotingTrainingOrchestratorEngine.runOnce() composes existing substrate: (1) QuotingTrainingLoopEngine.run -> AccuracyReport, (2) QuotingCalibrationEngine.deriveWithCoV -> factors + CoV gate, (3) when safe_to_activate + writeIfSafe: atomic write to active-calibration.json (temp+rename), (4) optional psi_delta feed via QuoteOutcomePSIDeltaBridgeEngine. Fail-soft on every stage. CoV escalation -> skip write + skip_reason explains why. New dispatcher action quoting_training_orchestrator_run. 11/11 tests covering empty-records reject, safe write, writeIfSafe=false dry-run, CoV-escalation sparse-data skip, atomic temp cleanup, nested dir creation, psi_delta feed on/off, maxFactor clamp, full AccuracyReport return, warnings invariant. Operator overnight directive: 'keep training the system with quoting'. 12 new prism_quoting actions total across iters 11-19+yolo1.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINING-ORCHESTRATOR (slot:charlie /goal-yolo iter1): continuous calibration loop. QuotingTrainingOrchestratorEngine.runOnce() composes existing substrate: (1) QuotingTrainingLoopEngine.run -> AccuracyReport, (2) QuotingCalibrationEngine.deriveWithCoV -> factors + CoV gate, (3) when safe_to_activate + writeIfSafe: atomic write to active-calibration.json (temp+rename), (4) optional psi_delta feed via QuoteOutcomePSIDeltaBridgeEngine. Fail-soft on every stage. CoV escalation -> skip write + skip_reason explains why. New dispatcher action quoting_training_orchestrator_run. 11/11 tests covering empty-records reject, safe write, writeIfSafe=false dry-run, CoV-escalation sparse-data skip, atomic temp cleanup, nested dir creation, psi_delta feed on/off, maxFactor clamp, full AccuracyReport return, warnings invariant. Operator overnight directive: 'keep training the system with quoting'. 12 new prism_quoting actions total across iters 11-19+yolo1.
```

## Files touched (9)
- .../__tests__/QuotingTrainingOrchestrator.test.ts  | 194 ++++++++++++++
- .../__tests__/machineQualityScoreBridge.test.ts    | 242 ++++++++++++++++++
- .../src/engines/MachineQualityScoreEngine.ts       | 281 +++++++++++++++++++++
- .../engines/QuotingTrainingOrchestratorEngine.ts   | 153 +++++++++++
- .../src/schemas/intelligenceActionSchemas.ts       |  14 +
- mcp-server/src/schemas/quotingActionSchemas.ts     |  27 ++
- .../tools/dispatchers/intelligenceDispatcher.ts    |  22 ++
- .../src/tools/dispatchers/quotingDispatcher.ts     |  13 +
- 8 files changed, 946 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3d7535feedf7`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._