---
name: reference_post_ship_quoting-synergy-ms0-u-qp-training-orchestrator
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-TRAINING-ORCHESTRATOR (commit 3d7535fee). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.014Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-training-orchestrator
---


# QUOTING-SYNERGY-MS0/U-QP-TRAINING-ORCHESTRATOR

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINING-ORCHESTRATOR (slot:charlie /goal-yolo iter1): continuous calibration loop. QuotingTrainingOrchestratorEngine.runOnce() composes existing substrate: (1) QuotingTrainingLoopEngine.run -> AccuracyReport, (2) QuotingCalibrationEngine.deriveWithCoV -> factors + CoV gate, (3) when safe_to_activate + writeIfSafe: atomic write to active-calibration.json (temp+rename), (4) optional psi_delta feed via QuoteOutcomePSIDeltaBridgeEngine. Fail-soft on every stage. CoV escalation -> skip write + skip_reason explains why. New dispatcher action quoting_training_orchestrator_run. 11/11 tests covering empty-records reject, safe write, writeIfSafe=false dry-run, CoV-escalation sparse-data skip, atomic temp cleanup, nested dir creation, psi_delta feed on/off, maxFactor clamp, full AccuracyReport return, warnings invariant. Operator overnight directive: 'keep training the system with quoting'. 12 new prism_quoting actions total across iters 11-19+yolo1.

**Shipped:** 2026-05-25T22:04:49-05:00 by markjvillanueva3-cloud
**Files:** 9 touched

Full distillation: [[quoting-synergy-ms0-u-qp-training-orchestrator]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._