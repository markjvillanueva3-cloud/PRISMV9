---
name: reference_nn_leg_schema_read_fix_2026_06_02
description: "NN/GNN PSN-leg health fabricated an \"embeddingSource mismatch\" diagnosis fleet-wide; root cause was schema-read blindness (top-level auroc vs nested checkpointMeta.auroc). Fixed via canonical classifyGnn. Real tier-5 blocker = reference-pool=0."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.228Z
aliases: reference_nn_leg_schema_read_fix_2026_06_02
---


# NN/GNN PSN-leg schema-read fix (slot:india, 2026-06-02, commit f436b2c614)

`psn-leg-state-inject.legStateNnGraph` read top-level `evalDoc.auroc`, but `NN-EVAL.json` nests it at
`checkpointMeta.auroc` (+ `deferred`/`reason`/`poolSize`). The read was ALWAYS undefined → every
prompt across all 26 slots got the fabricated "AUROC not finite … likely embeddingSource mismatch"
diagnosis. True state: `DEFERRED — insufficient-reference-pool (poolSize 0), AUROC 0.096 sub-gate`.

**Fix:** delegate the read to canonical `classifyGnn` (one source of truth; nn-graph-health-inject
already read it right), type-strict top-level fallback (guards `Number(null)===0`), `DEFERRED` status
with the real reason, gate on `classifyGnn.healthy` (AUROC+Brier fail-closed), export
`PROMOTE_AUROC_MIN`/`PROMOTE_BRIER_MAX`. 81/81 tests incl real-data anti-drift + negative-assert.

**Why it matters:** a fabricated cause string is fleet-wide misinformation — it sent every chat toward
the wrong fix (`U-NN-PREDICTOR-EMBED-WIRE`) when the real blocker is the reference pool. Never bake an
unverified cause into a diagnostic; one state file should have one shared reader.

**Verified stale claims (superseded in CLAUDE.md):**
- `U-NN-TRAINER-EXPORT-RESTORE` — RESOLVED: `positiveTypeMarginal`/`sampleStratifiedNegativeEdges`
  ARE exported by `graphsage-trainer.mjs`; 154/154 trainer+pipeline tests pass.
- The real tier-5 deploy blocker is `insufficient-reference-pool` (poolSize 0). `NN-EVAL.json` is
  stale (May-16, pre the May-23 reference-pool seed, 8-dim auroc 0.096); Jun-1 768d candidate scores
  auroc 0.388 (still <0.5 heterophily, <0.78 gate). Next-unit `U-NN-REFPOOL-REEVAL` = fresh
  `runAssessment` against the post-seed 548MB graph.

**How to apply:** when a health/observability signal looks wrong, verify the field path against the
ACTUAL state-file schema before trusting (or repeating) its conclusion. See [[feedback_psn_definition]],
wiki [[nn-leg-schema-read-fix]].
