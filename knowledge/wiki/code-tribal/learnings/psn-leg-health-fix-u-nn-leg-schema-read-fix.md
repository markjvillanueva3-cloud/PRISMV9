# PSN-LEG-HEALTH-FIX/U-NN-LEG-SCHEMA-READ-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-LEG-HEALTH-FIX]/U-NN-LEG-SCHEMA-READ-FIX (slot:india): NN/GNN PSN-leg health reads checkpointMeta.auroc via canonical classifyGnn — kills fleet-wide fabricated 'embeddingSource mismatch' diagnosis

**Commit:** `f436b2c61448` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T20:27:28-05:00
**Tags:** psn-leg-health-fix, u-nn-leg-schema-read-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-LEG-HEALTH-FIX]/U-NN-LEG-SCHEMA-READ-FIX (slot:india): NN/GNN PSN-leg health reads checkpointMeta.auroc via canonical classifyGnn — kills fleet-wide fabricated 'embeddingSource mismatch' diagnosis

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-LEG-HEALTH-FIX]/U-NN-LEG-SCHEMA-READ-FIX (slot:india): NN/GNN PSN-leg health reads checkpointMeta.auroc via canonical classifyGnn — kills fleet-wide fabricated 'embeddingSource mismatch' diagnosis

Root cause (schema-read-blindness, india's own documented regression class): psn-leg-state-inject.legStateNnGraph read top-level evalDoc.auroc, but real NN-EVAL.json nests it at checkpointMeta.auroc + carries deferred/reason/poolSize. So the read was ALWAYS undefined -> every prompt across all 26 slots got 'AUROC not finite ... likely embeddingSource mismatch, see U-NN-PREDICTOR-EMBED-WIRE' — a fabricated cause. The true state: deferred grading (insufficient-reference-pool, poolSize 0), AUROC 0.096 sub-gate.

Fix: delegate the schema read to the canonical classifyGnn (single source of truth — same reader nn-graph-health-inject uses); type-strict top-level fallback for legacy flat docs (guards Number(null)===0 trap); add DEFERRED status reporting the REAL reason + sub-gate AUROC; gate on classifyGnn.healthy so a checkpoint passing AUROC but failing the Brier calibration gate is surfaced, not silently certified (fail-closed). Export PROMOTE_AUROC_MIN/PROMOTE_BRIER_MAX from nn-graph-health-inject so the threshold is never re-inlined (drift risk).

Tests: 81/81 (61 leg-state incl new DEFERRED/nested/brier-gate/real-data anti-drift + 19 nn-graph-health + 1 brier). Negative-asserts the 'embeddingSource' string can never reappear. Per-file scrutiny 2-reviewer PASS (P1 brier-gate + P2 inlined-const both closed).
```

## Files touched (4)
- .claude/hooks/nn-graph-health-inject.mjs    |  6 ++++--
- .claude/hooks/psn-leg-state-inject.mjs      | 57 +++++++++++++++++++++++++++++++++++++++++++++++++--------
- .claude/hooks/psn-leg-state-inject.test.mjs | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- 3 files changed, 127 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f436b2c61448`
- Milestone envelope: `mcp-server/data/milestones/PSN-LEG-HEALTH-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._