---
name: feedback_india_candidate_file_checkpoint
description: write GNN checkpoints to .candidate.json — never overwrite the live checkpoint mid-training
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_candidate_file_checkpoint
---


Checkpoint promotion discipline: training writes to `state/shared/nn-graph/graphsage-checkpoint.candidate.json`; the live `graphsage-checkpoint.json` is replaced only after the deploy gate passes.

**Why:** concurrent training + eval racing on the live file corrupts it (checkpoint-promotion-race failure mode); an in-place overwrite of a failing candidate silently degrades production inference.

**How to apply:** candidate-file pattern always; `nn-graph-retrain-lifecycle.mjs` promotes on gate-pass only and never auto-promotes a deferred candidate. [[feedback_india_deploy_gate_hard]]
