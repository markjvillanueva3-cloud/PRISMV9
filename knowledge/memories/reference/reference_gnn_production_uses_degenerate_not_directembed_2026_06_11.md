---
name: reference_gnn_production_uses_degenerate_not_directembed_2026_06_11
description: PRODUCTION ghost-wiring (regen-viz) classifies via the degenerate 0.096 GraphSAGE checkpoint, NOT the validated 0.808 direct-embed classifier -- because seed-ghost directEmbed defaults false + the env is unset. The model-free classifier BEATS the trained model.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_production_uses_degenerate_not_directembed_2026_06_11
---


**Finding (slot:india, 2026-06-11, /goal "accelerate closed loop training"):** chasing "deploy tier-5's trained model" led to the REAL state of the GNN deploy path, which is the opposite of the workflow's framing.

**There is no "0.808 trained checkpoint to promote."** The 0.808 in `NN-EVAL.json` is `embeddingMode:"direct"` -- **raw 768d nomic cosine k-NN with NO trained model** (`seed-ghost-gnn-classify.mjs:631-639`: "no trained checkpoint/model is consulted -- the embeddings file IS the classifier"). The actual GraphSAGE TRAINED model scores AUROC 0.43 (link-pred, lifecycle --force this session); the LIVE 8-d checkpoint scores 0.096. So the **model-free direct-embed classifier (0.808 selective-deploy-ready) BEATS the trained GraphSAGE** -- training the GNN is not the bottleneck; deploying the right classifier is.

**The gap (verified live):**
- `NN-EVAL.json`: `embeddingMode:"direct"`, holdoutN 62, AUROC 0.808, `selective.deployGrade.pass:true` @ tau=0.7 (Brier 0.0406, macroF1 1.0, robustAboveGate, concentrated 2/6 classes). GATE-VALIDATED selective deploy.
- `PRISM_NNG_DIRECT_EMBED` env = **UNSET** fleet-wide.
- `seed-ghost-gnn-classify.mjs` GNN_DEFAULTS.directEmbed = **false**; `resolveGnnConfig:151` = `env.PRISM_NNG_DIRECT_EMBED==="1" || overrides.directEmbed===true` -> default OFF.
- PRODUCTION consumer = `regen-viz.mjs:345` (canonical graph regen, classifies all `ghost.unwired-engine` nodes) -> calls `classifyUnknownGhosts` WITHOUT directEmbed -> **uses the degenerate 0.096 checkpoint**.
- BUT `gnn-active-pool-select.mjs:421` ALREADY defaults directEmbed=true ("PRODUCTION-validated direct-embed path"). So the active-learning selector + the eval use direct-embed; the production GHOST-WIRING consumer does not. Inconsistent.
- Ghost embeddings present: `state/shared/nn-graph/ghost-node-embeddings.jsonl` (637 rows, 1.6MB, Jun 4).

**THE FIX (high-value, india-doable, SCOPED -- ship with operator awareness as its own unit):** flip `GNN_DEFAULTS.directEmbed` -> true + `resolveGnnConfig` to default-ON-with-opt-out (`PRISM_NNG_DIRECT_EMBED=0` opts out; override wins). This deploys the 0.808 selective classifier in production ghost-wiring (strictly better than 0.096 -- tier-5 already abstains below minConf + defers to the LLM tier-6, so selective/concentrated emission is the validated risk@coverage path). Attempted this session; the flip is a 1-line change BUT requires updating **8 checkpoint-path tests** (lines 408/438/453/499/524/546/567/599 in seed-ghost-gnn-classify.test.mjs) to explicitly select the model path (`env:{PRISM_NNG_DIRECT_EMBED:"0"}` or `directEmbed:false`) -- they relied on the old default. Reverted to keep the repo clean + because a FLEET-WIDE production deploy-behavior change wants operator awareness, not a silent mid-redirect flip. Related: [[reference_gnn_selective_deploy_2026_06_06]] (the 0.808 selective validation), [[reference_gnn_promote_eval_disconnect_2026_06_11]] (the eval disconnect found en route).

**Lesson:** "deploy the trained model" assumed a trained model was the best classifier. It is NOT -- the model-free direct-embed baseline (0.808) beats the trained GraphSAGE (0.43). Verify WHICH classifier an eval measures before assuming training is the lever. The acceleration here is a deploy-config flip, not more training.
