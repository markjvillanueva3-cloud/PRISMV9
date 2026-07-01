---
title: Hermes enrichment injection (tribal + LoRA) and the GNN phantom-prune metric-gaming caveat
type: lesson
domain: ai-training
slot: india
date: 2026-06-30
tags: [producer-consumer-gap, tribal-injection, lora-corpus, gnn, macrof1, eval-integrity, hermes]
commits: [28b6a2eeba, 97c392ce75, 2aa800a701, f1eced9297]
related: [[reference_tribal_embed_index_is_the_perprompt_surface_2026_06_24]], [[reference_hermes_tribal_inject_and_cron_drift_2026_06_30]], [[reference_gnn_confusion_analysis_2026_06_30]], [[feedback_verify_actual_contract_not_proxy]]
---

# Hermes enrichment injection + the GNN phantom-prune caveat

## The recurring pattern: producer-alive / consumer-dead

The `hermes-domain-enrichment-loop.mjs` (6 parallel Grok agents) continuously emits cited
per-domain rules to `state/shared/staging/hermes-enrichment-loop-tips.json` (capture-tip
schema). The producer was ALIVE and producing, but the knowledge never reached the AI
systems because **no consumer read the staging file**. This is the same class as
[[reference_tribal_embed_cron_rearm_2026_06_25]] — a live producer with a dead consumer
silently strands knowledge. Fix = wire the staging file as a source into each AI-consumption
surface, idempotent by the tip's stable `hkl-<domain>-NNN` id:

- **Tribal (per-prompt + RAG):** `embed-pdf-tribal-tips-into-index.mjs` -> the L1 vector index
  `tribal-embed-index.json`. This is the LOAD-BEARING surface (`tribal-rerank`, PSN leg #5 +
  RAG) — NOT `cad-cam-pdf-tribal-seeds.json`, which no hook reads
  ([[reference_tribal_embed_index_is_the_perprompt_surface_2026_06_24]]). Proven: 185 embedded,
  `tip:hkl-mill-001` retrieves #1 @1.6244.
- **LoRA (`fleet-lora-combined.jsonl`, GPU fine-tune):** `hermes-enrichment-to-alpaca.mjs`
  converts capture-tip -> Alpaca `{instruction,output,galaxy}`, registered as a
  `lora-training-jsonl` source in `build-fleet-training-corpus-inventory.mjs`. Proven: 190 pairs
  folded into the combined corpus (20326 -> 20516).

## Bug 1 — CLI default duplicated between signature and main() (silent cron-path drop)

`embed-pdf-tribal-tips-into-index.mjs` had the default source list in TWO places: the
`collectAllTips` signature default AND `main()`'s `flags.sources`. Adding `hermes` to only the
signature default left it **live on `--source hermes` but DEAD on the cron's no-arg path** (the
durable tribal-embed cron runs with no `--source`). `catalog` had silently suffered the same
drift earlier. Fix: a single exported `DEFAULT_SOURCES` const referenced by both. **Lesson:
when a script has an explicit-flag path AND a no-flag default, validate the NO-FLAG (cron/
unattended) path — a green `--source X` proves nothing about what the cron runs.** Sibling of
[[feedback_verify_actual_contract_not_proxy]].

## Bug 2 — a corpus-quality heuristic mis-applied across corpus types

`lora-corpus-quality-check.mjs` graded the Hermes corpus "degenerate-corpus" despite
uniqueRatio 1.0 / contradiction 0. Cause: `thinInstructionRate` counts `key=value` tokens (a
PARAMETRIC-corpus proxy, e.g. the sweep corpus `material=A, op=turn`). A prose knowledge-recall
corpus legitimately has zero `key=` tokens, so thinRate=1.0 was a false degeneracy signal. Fix:
THIN moved to an `advisories[]` (reported, non-failing); the REAL degeneracy gates (low
diversity, high contradiction) stay pass-failing. **Lesson: a quality heuristic tuned for one
corpus shape can false-flag another — gate the corpus on the universal degeneracy signals
(duplication, label noise), keep shape-specific proxies advisory.** (3-of-3 confirmed this is a
heuristic-scope fix, NOT a gate-softening — the degeneracy gates were untouched.)

## CAVEAT — do NOT prune GNN "phantom" labels on holdout-only evidence (metric-gaming)

The confusion analysis ([[reference_gnn_confusion_analysis_2026_06_30]]) reports 13 "phantom"
classes (predicted, true-count 0) absorbing 16% of prediction mass, and macroF1 lifts from
0.41 to 0.52 when tail/phantom classes are excluded. It is TEMPTING to "prune" them to lift the
macroF1 deploy gate. **DO NOT** prune a label as dead on the basis of a 200-sample holdout
alone: a class predicted-but-0-true in 200 samples may be a real-but-rare class merely absent
from that holdout. Removing it from the label space to raise macroF1 is **eval-metric-gaming**
(the india soul hard-refuses `fabricating-or-softening-eval-metrics`). A label is safely
prunable ONLY after verifying it is 0-true across the FULL label distribution (not the holdout)
AND has no real node instances. The legitimate macroF1 levers remain reference-pool growth +
sharper features ([[reference_gnn_selective_deploy_2026_06_06]]), applied through the armed
`PRISM NN-Graph Retrain` scheduled task (self-gates on AUROC>=0.78), NOT a label-space trim to
flatter the number.
