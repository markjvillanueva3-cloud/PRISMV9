---
name: reference_india_backlog_verified_2026_06_24
description: India open-learning-loops backlog VERIFIED-current state as of 2026-06-24 (slot:india). Saves the next fire from re-verifying -- of the original 8, only #5 Quoting is a clean next india unit; #1/#6/#7/#8/#9 done, #2 echo-gated, #3 risky-cross-lane-breaking, #4 rejected-design.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.615Z
aliases: reference_india_backlog_verified_2026_06_24
---


# India open-learning-loops backlog — VERIFIED current (2026-06-24)

Re-verification (R8) of [[reference_open_learning_loops_backlog_2026_06_22]] this session.
**Do NOT re-verify these — the state below is file:line-grounded as of 2026-06-24.**

| # | domain | VERIFIED state 2026-06-24 | next action |
|---|---|---|---|
| 1 | SFC | **DONE** — `U-SFC-OUTCOME-BUS-REAL` (2026-06-22) replaced `tryBusCapture` always-true with real `captureSFC` (per speed-feed galaxy card). | none |
| 2 | Post | **ECHO-GATED** — in-pipeline single-chokepoint vs 6-dispatcher placement is a post-processor DESIGN decision echo owns ("echo's hot-path"); echo actively building. | echo decides placement |
| 3 | CAD `feature_recognize` | **NOT S-effort — RISKY CROSS-LANE BREAKING CHANGE.** `cadDispatcher.ts:806` calls old `FeatureRecognitionEngine.recognize(features[])` (`.ts:136`, takes a CLASSIFIED features array → `FeatureRecognitionResult`). The scouted "swap to `CADFeatureRecognitionEngine.extractFeatures(geometry)`" (`.ts:63` → `RecognitionResult{features,confidence,counts}`) INVERTS the input contract (features[]→geometry) AND the output shape, across ~10 consumers + 3 schemas (cad/cam/mill). delta/xray core + safety-adjacent (feeds toolpath→G-code). | delta/xray ownership + full consumer/schema analysis; NOT india-solo |
| 4 | CAM | **REJECTED-DESIGN** — naive `recordOutcome` at `process()` forces `wasCorrect=true` (required field, unknown at decision-time) → falsifies the Mann-Kendall drift metric. Needs a 2-phase capture (record decision, update `wasCorrect` on actual). | dedicated 2-phase design unit |
| 5 | **Quoting kNN** | **DONE** — `U-QP-SIMILAR-JOB-RETRIEVE` (`10735ad466`, slot:india 2026-06-24). new `QuotingSimilarJobRetrieverEngine` (PURE kNN over PRECOMPUTED vectors, thin `KNearestNeighbors` wrapper) + `prism_quoting:quoting_similar_job_retrieve`. 19/19 + 3-of-3 PASS. The scout's "47,905" was unverified (spec says ~2K); engine is corpus-agnostic. | follow-up: charlie/juliett build the corpus loader + featurizer that feeds this action |
| 6 | Lathe | DONE (`2e1cd3ac7d`) | none |
| 7 | Mill | DONE (`775a94a91b`) | none |
| 8 | WEDM | DONE (`62c6c24add`) | none |
| 9 | Ensemble | DONE (`87e676f14e`) | none |

## This session also shipped
`U-BPA-LORA-PAIRS-WIRE` (`55cf3dd18d`) + wiki entry (`4fa054801a`) — closed pred→outcome→RETRAIN on
the LoRA surface (both dispatchers, R12 empty signal, 3-of-3 PASS). See
[[reference_lora_pairs_wire_and_scouted_done_2026_06_24]].

## Operator-gated india item
NN/GNN full-coverage (AUROC 0.808 selective-deploy OK; full-holdout below gate) needs an
operator-triggered stratified GPU retrain (`nn-graph-retrain-lifecycle.mjs --force`, Blackwell).
India soul refuses promoting past the deploy-gate without real AUROC/Brier.

## Lesson
The crossroad-auto-decide hook correctly forced a backlog re-check after I prematurely declared
"drained" — there WAS a documented verified backlog I had not consulted. But re-verification (R8)
then showed every remaining item is done / owner-gated / risky-cross-lane / needs-design, leaving
only #5 (M-effort, fresh context). "Check the documented backlog before claiming drained" — AND
"verify each scouted gap, the scout's effort estimate can be wrong" (#3 was scouted S, is really a
breaking cross-lane change).
