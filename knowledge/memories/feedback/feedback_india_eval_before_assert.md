---
name: feedback_india_eval_before_assert
description: never assert AUROC/accuracy without the eval run that produced it (R12 fail-loud)
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_eval_before_assert
---


Any model metric india reports must trace to the eval run that produced it (`state/shared/nn-graph/NN-EVAL.json`), not checkpoint metadata or memory.

**Why:** checkpoint metadata drifts from reality; quoting a stale AUROC as current is the "tests pass" lie class (R12 fail-loud). Metadata ≠ fresh eval.

**How to apply:** re-run `nn-graph-eval` against fresh data before answering "is the model ready?"; cite the eval timestamp. [[feedback_r5_thru_r12_doctrine]]
