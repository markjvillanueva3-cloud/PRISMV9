---
name: reference_codebase_wired_refpool_rejected_2026_06_18
description: "MEASURED REJECTION (slot:india 2026-06-18, cec53c06a9): applying the 3206 codebase-wired GNN ref-pool feeder (the '20x pool-growth lever') REGRESSES the deploy gate -- AUROC 0.789->0.772 (below 0.78), selective deploy-ready->no-deployable-operating-point, Brier@gate 0.04->0.26. Spans 29/29 classes but wrecks calibration. Do NOT --apply; it would break PSN leg #10 in production. Harness: scripts/measure-codebase-wired-refpool-auroc.mjs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.519Z
aliases: reference_codebase_wired_refpool_rejected_2026_06_18
---


**slot:india, 2026-06-18. The U-GNN-CODEBASE-WIRED-APPLY decision: MEASURED + REJECTED before any shared-graph mutation.**

## What was proposed
`scripts/wired-engines-to-refpool.mjs` (committed 859554a148, NEVER applied) is a 3rd GNN ref-pool feeder: every engine imported by EXACTLY ONE dispatcher -> a `ghost.codebase-wired.<engine>` reference node (confidence 1.0, the dispatcher = the ground-truth label). Dry-run: **3206 labels** (409 multi-dispatcher EXCLUDED as ambiguous). The prior commit message called it "the 20x pool-growth lever" (355-ref pool -> 3561). The hypothesis: a bigger, more diverse ref pool fixes the deployed tier-5's concentration ("spans 2/13 classes -- full-coverage pending ref-pool growth").

## How it was measured (NON-DESTRUCTIVE, india discipline)
`scripts/measure-codebase-wired-refpool-auroc.mjs` (+ 4/4 test, 2-reviewer PASS) -- mirrors `measure-binary-auroc.mjs`. Builds the 3206 ghosts via the canonical apply-path functions, embeds ONLY the new ones to a temp file (build-node-embeddings --ghosts-only, 87.5s for 3206 via nomic), merges with the deployed 355 verbatim, loads the real graph, runs BASELINE then injects the 3206 in-memory + ENRICHED. **The shared 542MB system-graph.json + deployed ghost-node-embeddings.jsonl are NEVER written** -- the apply was gated on this.

## The result (the rejection)
| condition | AUROC | selective @tau=0.7 | coverage | Brier@gate | macroF1 | classes |
|---|---|---|---|---|---|---|
| baseline (deployed 355) | **0.7891** OK | **deploy-ready-selective** robust | 27.4% | 0.0417 | 1.0 | 2/13 |
| enriched (+3206) | 0.7716 FAIL | **no-deployable-operating-point** fragile | 42.5% | 0.2577 | 0.3169 | 29/29 |

The 3206 refs DO span all 29 classes (2/13 -> 29/29) and raise coverage (27->42%), BUT **wreck emitted-set calibration**: Brier@gate 0.04 -> 0.26 (>> 0.15 gate), macroF1 1.0 -> 0.32, global AUROC dips below the 0.78 gate, selective verdict flips deploy-ready -> no-deployable-operating-point. A bigger/more-diverse pool DILUTES the confident-correct neighborhoods the small concentrated pool had.

## Why this is UNCONFOUNDED for the deploy decision (the key point)
The deployed eval (`nn-graph-retrain-lifecycle` -> `nn-graph-eval.buildHoldout`) draws its holdout from ALL `kind:ghost.unwired-engine` refs with confidence>=0.8 on the LIVE graph. So if you `--apply` the 3206, the next live eval reproduces holdoutN=200 / 29-class / no-deployable-operating-point -> **PSN leg #10 flips SELECTIVE-DEPLOY -> broken in production**. That consequence is real regardless of the apples-to-oranges holdout-composition caveat (baseline holdoutN=84 vs enriched 200). **REJECTED: do NOT --apply, do NOT wire stage 1c.**

## How to apply (doctrine for future ref-pool-growth proposals)
- **Ref-pool growth is NOT a free win.** Coverage/class-span UP can come WITH calibration DOWN. Always measure Brier@gate + the selective verdict, not just coverage/AUROC. More references can REGRESS the deployed tier.
- **Measure on a non-destructive copy BEFORE mutating the shared graph** (this harness is the reusable tool: `node --max-old-space-size=8192 scripts/measure-codebase-wired-refpool-auroc.mjs`). india refuses to mutate the deployed classifier on an unmeasured guess -- and this is exactly why.
- The lever's NAME ("20x pool-growth") invited a blind apply; the measurement caught the regression. A tempting-sounding lever is not a measured one.

## CONTROLLED CONFIRMATION (2026-06-18, 3ec8ca54a9 -- rejection is REAL, not a holdout artifact)
The confound is now closed. Added an additive `opts.holdoutGraph` seam to `assessHoldout` (buildHoldout(opts.holdoutGraph || graph) -- 0 external callers, byte-identical default, 80/80 tests) + a `--controlled` harness mode that holds out the SAME base 84 items while varying ONLY the reference pool. FAITHFUL result:
- baseline (refs=355): AUROC 0.7891, deploy-ready-selective, cov 27.4%, Brier@gate 0.0417, mF1 1.0, 2/13.
- controlled (refs=355+3206, SAME 84 holdout): AUROC **0.7925 (+0.003)**, **no-deployable-operating-point**, cov **52.4%**, Brier@gate **0.1951**, mF1 **0.2259**, 16-emitted/13-truth.
- VERDICT: even on the SAME predictions, the 3206 refs marginally RAISE global AUROC (+0.003) but COLLAPSE the selective gate -- coverage doubles while the newly-confident predictions are WRONG (Brier@gate 0.04->0.20, macroF1 1.0->0.23). **REJECTION CONFIRMED.**
- **MECHANISM:** a dense, diverse reference pool manufactures spurious HIGH-confidence votes for wrong dispatchers, destroying the abstention discipline that makes tier-5 deployable. Coverage is the wrong target; calibration of the emitted band is the constraint.
- **METHODOLOGY WIN:** global AUROC alone (+0.003) would have said "fine, slightly better"; the selective-deploy grade correctly caught the emitted-set collapse. This is exactly why india gates on Brier@gate + macroF1@gate + the selective verdict, not AUROC alone.

## CAP-SWEEP RESULT (2026-06-18, afeac9e1f4 -- ranking lever, NOT a coverage lever)
Added `capPerClass()` + `--cap-per-class=N` and swept balanced subsets on the FIXED 84 holdout (controlled):
| cap | refs | AUROC | selective gate |
|---|---|---|---|
| baseline | 355 | 0.7891 | deploy-ready (cov 27.4%, 2/13) |
| cap=5 | 263 | 0.8777 (+0.089) | HELD |
| cap=10 | ~440 | 0.879 (+0.090) | HELD |
| **cap=20** | **618** | **0.8886 (+0.099, PEAK)** | **HELD + live-eval also HOLDS** |
| cap=50 | 978 | 0.8764 | COLLAPSED (Brier@gate 0.08) |
| all-3206 | 3206 | 0.7925 | collapsed (Brier@gate 0.20) |

**Findings:** (1) DENSITY HYPOTHESIS CONFIRMED -- sparse subsets (cap<=20) HOLD the gate; the collapse threshold is BETWEEN cap=20 and cap=50. (2) **cap=20 is the optimum** (+0.099 AUROC, gate held on BOTH controlled AND the live-eval/enriched -- the harness says "APPLY is justified"). (3) **BUT no cap BROADENS coverage** -- every gate-holding cap NARROWS the emitted band to 1 class (coverage flat-to-down). The codebase-wired refs are a **RANKING-quality lever, NOT a coverage lever** -- this REFUTES the standing "full-coverage via ref-pool growth" assumption (see [[reference_gnn_refpool_growth_2026_06_13]]) for THIS ref source. Full-coverage needs sharper features / H2GCN / retrain, not these refs.

**Deployment status:** cap=20 is a measured, gate-safe, live-safe RANKING improvement but does NOT serve the coverage goal (slightly lowers coverage). Applying = an operator ranking-vs-coverage decision + a supervised shared-graph mutation -> queued OPTIONAL #15, NOT auto-applied (india does not auto-mutate the deployed classifier for a mixed tradeoff). The codebase-wired exploration is now COMPLETE: measured end-to-end, no coverage win, a real ranking option left to the operator.

Related: [[reference_post_ship_ai-systems-gnn-u-gnn-codebase-wired-refpool]] (the feeder commit) · [[reference_gnn_selective_deploy_2026_06_06]] (the selective-deploy doctrine) · [[reference_binary_embed_quantize_2026_06_18]] (sibling measure-before-deploy on binary quantization) · [[feedback_multiseed_before_auroc_claim]].
