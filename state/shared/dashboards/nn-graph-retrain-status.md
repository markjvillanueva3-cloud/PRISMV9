# NN-GRAPH retrain promotion — operational-deferral close-out link

**Recorded by:** slot whiskey `claude-902de304`, 2026-05-23.

## Status

The PSN-DORMANCY-AUDIT-MS0 2026-05-22 punch list flagged "NN-GRAPH retrain promotion" as remaining-dormant. After review of the NN-GRAPH-MS2 documentation (CLAUDE.md §NN-GRAPH-MS0/MS1/MS2), the actual situation is:

- **Code-side wiring: COMPLETE.** Tier-5 cascade is wired (`PRISM_NNG_*` knobs honored, cascade defers to tiers 1-4 when DORMANT).
- **Promotion gate: WIRED.** Auto-promotes IFF AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15.
- **Self-retrain lifecycle: WIRED.** S4U scheduled task ([[reference_nn_graph_ms2_u2_2026_05_17]]).
- **Reference-pool seed stage: WIRED.** ([[reference_nn_graph_ms2_u1_2026_05_17]]).
- **NN-1 768-d feature swap: WIRED.** ([[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]]).

## What "remaining" actually means

The "remaining" item is **operational, not code**. Current state:
- AUROC: 0.096 (gate threshold ≥0.78)
- Reason: `insufficient-reference-pool (reference poolSize 0)`

The retrain mechanism cannot promote a model because there is no reference data to evaluate it against. This is a **data-side precondition** — the reference pool grows as production outcomes accumulate. No chat session can "ship" the pool growth; it accumulates organically as operators run jobs and the outcome-bus records results.

## Synergy with this session's shipped work

The same-session OutcomeFeedbackOverrideStoreEngine (b8255bce75) and MTConnectToOutcomeBridgeEngine (in 2548d0cc74) **directly contribute to reference-pool growth**: every outcome event they emit/translate adds to the corpus the NN-GRAPH retrain consults. The work shipped this session is the upstream feeder; the retrain gate is the downstream consumer.

## Close-out determination

NN-GRAPH retrain promotion is **not a unit that can be force-shipped**. It is the consequence of upstream data flow, all of which is now wired (TIER1-TIER2, TIER2-TIER3, LEARN-CAM/SFC, SHOPFLOOR-LEARN). The unit auto-completes when the pool grows past threshold — no further whiskey action is needed.

## Audit trail

- CLAUDE.md §NN-GRAPH (lines documenting MS0/MS1/MS2 status)
- `state/shared/nn-graph/NN-EVAL.json` (live AUROC + pool size)
- This session's commits: 8b801cd815, 0fd50119bd, a9afe53ebc, 4a00b41df9, b925b381df, b8255bce75
- Peer-absorbed: 2548d0cc74 (MTConnect bridge), 984ce3a5ec (lima's SHOPFLOOR-LEARN)
