---
name: feedback_india_deploy_gate_hard
description: NN-GRAPH deploy gate is hard — never promote a checkpoint that fails AUROC/F1/Brier
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_deploy_gate_hard
---


The NN-GRAPH (GraphSAGE) wiring-inference classifier promotes candidate→live ONLY when AUROC ≥ 0.78, macro-F1 ≥ 0.55, Brier ≤ 0.15 (`scripts/lib/nn-graph-eval.mjs`). Current state: deferred (AUROC ≈ 0.096 heterophily).

**Why:** a research-shipped model (code runs) is not a deploy-gated model (metrics clear); promoting a failing candidate poisons every downstream consumer of `xproc_neural_*`.

**How to apply:** run `nn-graph-eval` / `runAssessment` after every retrain; keep candidates in `.candidate.json`; promote IFF all 3 gates clear. Never report an AUROC without the eval run. [[feedback_india_eval_before_assert]] · [[lessons/heterophily-collapse-class]]
