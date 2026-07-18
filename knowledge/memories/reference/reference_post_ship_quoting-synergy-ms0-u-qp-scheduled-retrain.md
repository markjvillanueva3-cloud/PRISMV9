---
name: reference_post_ship_quoting-synergy-ms0-u-qp-scheduled-retrain
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN (commit 8865dc296). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.013Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-scheduled-retrain
---


# QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN (slot:charlie /goal-yolo iter3): cron-side invoker for the training orchestrator. scripts/quoting-train-cycle.mjs reads state/shared/quoting/baseline-records.json -> QuotingTrainingOrchestratorEngine.runOnce -> exit 0/1. Flags: --baseline <path>, --no-write (dry-run), --feed-psn, --json (machine-readable). Closes the operator overnight directive 'keep training the system' on the SCHEDULER side: yolo-iter1 built the orchestrator engine; yolo-iter3 makes it actually fire periodically via Windows Task Scheduler or any cron. Lazy-loads engine from src/ (tsx) or dist/ (compiled) so it works pre- and post-build. Output line: WROTE | SAFE-DRYRUN | GATED with MAPE + psi_delta_fed counter.

**Shipped:** 2026-05-25T22:37:07-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[quoting-synergy-ms0-u-qp-scheduled-retrain]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._