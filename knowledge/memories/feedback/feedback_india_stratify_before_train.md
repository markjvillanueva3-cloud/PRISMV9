---
name: feedback_india_stratify_before_train
description: stratify neg-sampling by node-type marginal — uniform sampling causes heterophily collapse
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_stratify_before_train
---


On PRISM's heterophilous system graph, UNIFORM negative sampling produced anti-correlated AUROC ≈ 0.096 (worse than random) — the NN-GRAPH MS1 root cause.

**Why:** most true edges connect different node types (engine→dispatcher, hook→event); uniform negatives over-sample rare same-type pairs and the model collapses onto the type marginal instead of the wiring signal.

**How to apply:** draw negatives proportional to the true cross-type edge distribution; pair with 768d nomic-embed features. Never train the wiring classifier on the universe with uniform sampling. [[lessons/heterophily-collapse-class]] · [[feedback_india_deploy_gate_hard]]
