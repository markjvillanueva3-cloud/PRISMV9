---
name: reference_gnn_active_worklist_refresh_2026_06_24
description: India refreshed the GNN active-learning label-worklist 2026-06-24 (was 2-day stale) -- 37 unlabeled targets, 179 refs across 14 classes; the actionable target-list for ref-pool growth toward the 0.55 macro-F1 gate (open NN/GNN PSN leg). Includes high-confidence label analysis + the careful-labeling protocol for the next fresh-budget pass.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.588Z
aliases: reference_gnn_active_worklist_refresh_2026_06_24
---


# GNN active-label worklist refresh -- india 2026-06-24

Ran `scripts/lib/gnn-active-pool-select.mjs` (heap-bumped, 713MB graph load) to refresh the
stale (Jun 22) `state/shared/nn-graph/active-label-worklist.{json,md}`. Result (Jun 25 01:44):
- **37 unlabeled targets** (32 voted / 5 unvoted).
- **reference pool: 179 labelled ghosts across 14 dispatcher classes**.
- Acquisition = 0.6*uncertainty + 0.4*classRarity, greedy class-diversity re-rank (gamma=0.6).

This is the actionable input for the OPEN NN/GNN PSN leg (selective-deploy AUROC 0.808 OK;
full-holdout macro-F1 0.439 < 0.55 gate -- "full-coverage pending ref-pool growth"). The path
(per the worklist header): label the top ghosts (assign the correct dispatcher) -> feed to
`scripts/vault-to-gnn-refpool.mjs` -> next `nn-graph-retrain-lifecycle` run lifts macro-F1.

## Most label-starved classes (the biggest macro-F1 levers, lowest ref counts)
`prism_data(1)`, `prism_edm(2)`, `prism_session(2)`, `prism_cad(2)`, `prism_business(4)`,
`prism_quoting(4)`, `prism_5axis(4)`, `prism_safety(5)`. Labeling a ghost INTO a starved class
moves macro-F1 most (rarity weight).

## High-confidence labels I can already assert (model is label-starved -> predicted WRONG)
These are obvious from the engine NAME/role; VERIFY by reading each before feeding (a wrong label
POISONS training data -- india soul refuses fabricated labels):
- `GeminiClientEngine`, `GrokClientEngine`, `GrokCLIClientEngine` -> **prism_ai** (LLM API clients;
  model predicted prism_5axis/prism_quoting -- clearly wrong).
- `LokiLogSinkEngine` -> **prism_dev/telemetry** (logging sink; predicted prism_turning -- wrong).
- `SFCRAGWarmStartEngine`, `SFCParameterRefinementEngine`, `SFCMultiHypothesisRankerEngine`,
  `SFCInferenceGateWireEngine` -> **prism_calc/prism_safety** (SFC = speed-feed physics; predicted
  prism_5axis/prism_quoting -- wrong).
- `PDFFormulaExtractionEngine` -> **prism_calc** (model predicted prism_calc -- LIKELY RIGHT).
- `PPG*WireEngine` (PPGOutcomeCaptureWire/PPGProvenanceWire/PPGInferenceGateWire/PPGRAGDialectMatch)
  -> **prism_cam/post-processor** (PPG = post-processor-generator; predicted prism_ai/prism_turning).

## NEXT (fresh-budget labeling pass -- the careful work)
1. For each top worklist ghost: READ the engine (`mcp-server/src/engines/<name>.ts`), determine its
   TRUE dispatcher (the one it does/should wire to), prioritizing the label-starved classes above.
2. Feed verified labels via `scripts/vault-to-gnn-refpool.mjs` (grows the ref-pool).
3. Trigger `nn-graph-retrain-lifecycle.mjs --force` (operator-gated GPU) -> re-grade macro-F1 vs the
   0.55 gate. The labels are the lever; the retrain is the eval.
DO NOT rush labels under budget pressure -- a fabricated/wrong label is worse than no label
(poisons the gate the leg is trying to clear).

## This session also shipped (3 verified units, all 3-of-3 PASS)
`55cf3dd18d` U-BPA-LORA-PAIRS-WIRE + `4fa054801a` wiki; `10735ad466` U-QP-SIMILAR-JOB-RETRIEVE.
See [[reference_india_backlog_verified_2026_06_24]] + [[reference_lora_pairs_wire_and_scouted_done_2026_06_24]].
