---
title: NN-GRAPH-MS0 — Hybrid neural-symbolic GNN tier-5 wiring inference
slug: nn-graph-ms0
kind: architecture
domain: ai-routing
status: shipped-research-only
shipped_at: 2026-05-16
shipped_by: claude-b6c4b196 (slot alpha)
milestone: NN-GRAPH-MS0
related:
  - graphsage-predictor
  - system-viz-first-audit
  - close-out-audit
---

# NN-GRAPH-MS0 — GraphSAGE link-prediction over system-viz

## What it is

A GraphSAGE link-prediction GNN added as the **5th tier** of PRISM's
wiring-inference cascade. The cascade answers one question: for an engine that
exists on disk but is wired to no dispatcher (a `ghost.unwired-engine` node in
the system-viz graph), *which dispatcher should it wire to?*

The four pre-existing tiers run cheapest-first:

1. **keyword** — dispatcher keyword match (confidence ~0.85)
2. **expanded-keyword** — broadened keyword set
3. **sibling-prefix** — dispatcher of same-prefix sibling engines (~0.65)
4. **LLM** — Ollama `qwen2.5-coder:7b` batch classification (capped ~0.55)

NN-GRAPH-MS0 adds **tier 5 — GNN**. It is strictly additive: the 4-tier hybrid
is the always-on floor; the GNN only augments. `PRISM_NNG_DISABLE=1` reverts
behaviour to the 4-tier cascade exactly, and a missing trained checkpoint makes
the GNN tier a graceful no-op.

## Method

The GNN classifier (`scripts/seed-ghost-gnn-classify.mjs`, U6) does
**GraphSAGE-embedding k-NN label propagation**:

1. Load a checkpoint trained by the U4 pipeline. No checkpoint → graceful skip.
2. The reference set is the cascade's own high-confidence output — ghost
   engines whose `proposed_wiring` is a valid `prism_*` dispatcher at
   `confidence >= PRISM_NNG_REF_MIN_CONF`.
3. Embed an **edgeless subgraph** of {targets ∪ references} with the frozen
   model. Unwired engines are graph-isolated (one proposed-wire edge, nothing
   else), so the honest signal is the model's learned transform of each node's
   symbolic features, not message passing — and embedding the proposed-wire
   neighbourhood would leak the cascade's own guesses.
4. For each UNKNOWN target, score the link to every reference with the model's
   link head (`sigmoid(z_u · z_v)`), take the top-K, and take a
   confidence-weighted vote of their dispatchers. The winning vote share is the
   prediction confidence (capped — a propagated label is never as hard as a
   keyword hit). The GNN gate fires only at/above `PRISM_NNG_MIN_CONF`.

GraphSAGE itself: 2-layer, mean aggregator, `concat(self, agg)`, ReLU on the
hidden layer and **linear on the output layer** (ReLU on the final layer traps
embeddings in the positive orthant and collapses AUROC to ~0.5), L2-normalised.

## Units & artifacts

| Unit | Deliverable |
|------|-------------|
| U1 U-NNG-EDGE-NORMALIZE | `scripts/lib/edge-typology-normalizer.mjs` |
| U2 U-NNG-NODE-EMBED-INGEST | node embedding ingest (nomic-embed reuse) |
| U3 U-NNG-NODE2VEC-TOPOLOGY | `graph-random-walk.mjs` · `node2vec-embedder.mjs` · `systemviz-node-feature-projector.mjs` |
| U4 U-NNG-GRAPHSAGE-TRAIN | `graphsage-model.mjs` · `graphsage-trainer.mjs` · `graphsage-checkpoint.mjs` · `graphsage-train-pipeline.mjs` |
| U5 U-NNG-GRAPHSAGE-PREDICT | `graphsage-predictor.mjs` — link-prediction inference |
| U6 U-NNG-INFERENCE-FIFTH-TIER | `seed-ghost-gnn-classify.mjs` + tier-5 gate in `seed-ghost-llm-classify.mjs` |
| U7 U-NNG-EVAL-HARNESS | `scripts/lib/nn-graph-eval.mjs` — AUROC/macro-F1/Brier assessment |
| U8 U-NNG-WIKI-DOC | this entry + memory + 4-surface close-out |

All NN-GRAPH lib + script suites are `node:test`: U1–U5 297/297, U6 89/89
(aggregate: 58 classifier + 31 tier-5 gate), U7 46/46 — green. Each file
passed a per-file 2-reviewer scrutiny gate.

## Env knobs

| Knob | Default | Effect |
|------|---------|--------|
| `PRISM_NNG_DISABLE` | off | `=1` reverts to the 4-tier cascade exactly |
| `PRISM_NNG_MIN_CONF` | 0.7 | GNN gate fires only at/above this |
| `PRISM_NNG_REF_MIN_CONF` | 0.8 | a ghost is a vote-reference at/above this |
| `PRISM_NNG_TOPK` | 15 | nearest references that vote per target |
| `PRISM_NNG_CHECKPOINT` | `state/shared/nn-graph/graphsage-checkpoint.json` | trained model path |

## Exit gates & honest outcome

Mandatory exit gates: **AUROC ≥ 0.78 · macro-F1 ≥ 0.55 · Brier ≤ 0.15**.

The U7 harness measures these against a seeded leave-out holdout of the
cascade's high-confidence labels. **Honesty note:** that is an
*internal-consistency* metric — it measures whether the GNN agrees with the
keyword/sibling heuristic tiers, NOT verified ground truth. A high score means
the embedding space groups same-dispatcher engines; it does not prove the
wiring is correct. `scripts/lib/nn-graph-eval.mjs` states this in every report.

**Status: `shipped-research-only`.** All 8 units are built, tested, and
committed. The deploy gate is **DEFERRED**: producing a trained checkpoint is a
U4-pipeline run (`scripts/lib/graphsage-train-pipeline.mjs`) over the real
system-viz graph, not harness-building work.
`state/shared/nn-graph/NN-EVAL.{md,json}` currently reads `DEFERRED — no
checkpoint`. When a checkpoint exists, re-running the harness produces the
metrics and `gradeMetrics` returns `deploy-ready` or `shipped-research-only`
honestly. The milestone envelope's exit gate explicitly provides for this
deferred-deploy close.

## Run it

```bash
# GNN tier-5 classifier (dry-run — graceful skip until a checkpoint exists)
node scripts/seed-ghost-gnn-classify.mjs --dry-run

# evaluation harness — emits state/shared/nn-graph/NN-EVAL.{md,json}
node scripts/lib/nn-graph-eval.mjs

# the LLM tier auto-invokes the GNN tier-5 gate before its Ollama batch
node scripts/seed-ghost-llm-classify.mjs --dry-run

# produce the trained checkpoint that lifts the eval out of DEFERRED
node scripts/lib/graphsage-train-pipeline.mjs --help
```

## Commits

U6 `6655a98a1` · U7 `e7db71cbc` (this session, slot alpha) · U4c `645f5fe99` ·
U4d `ae25ba33d` · U5 `458ece24a` (prior sessions).

## Continuation — 2026-05-16b (slot alpha, claude-fe461853)

Not new GNN science — the AUROC=0.096 anti-correlation was already triply
empirically confirmed by the prior session (see the memory note's tail; the
deploy path is a NEW unit, not MS0). This continuation delivered two real,
in-scope things:

1. **Eval-harness honesty fix** (`scripts/lib/nn-graph-eval.mjs`). The
   deferred-report writer printed *"Re-run it once a trained checkpoint
   exists"* for **every** deferred reason — actively false once a checkpoint
   loads but the graph has no reference pool. Fix: `runAssessment` plumbs
   `checkpointPresent` / `poolSize` / best-effort `checkpointMeta`;
   `renderReport` branches the prose (no-checkpoint vs data-blocked
   `insufficient-reference-pool`), and the strong "trained / U4-resolved"
   claim is **gated on embedded `checkpointMeta`** (a loaded predictor alone
   does not prove training — P1 raised by reviewer B, fixed). +2 fail-on-revert
   regression tests; 48/48 `node:test`; 2-reviewer per-file gate PASS.
2. **Reproducible deferred state.** The U4 checkpoint
   (`state/shared/nn-graph/graphsage-checkpoint.json`, 152 KB) was never
   committed (was `??` untracked). Now committed + `NN-EVAL.{md,json}`
   regenerated, so a fresh tree shows the honest data-blocked state without
   re-running training. Blocker moved code-side → **data-side**: `poolSize
   0 < 2` (live graph has 0 `ghost.unwired-engine` reference ghosts; the
   tier-5 gate is dormant by data, exactly as designed).

**Deploy gate remains DEFERRED.** Real progress needs `U-NEG-SAMPLE-STRATIFIED`
(cheap: layer-stratified negative sampling — should push pretext AUROC > 0.5)
or `U4-768D-FEATURES` (the proven path). Re-run `node
scripts/lib/nn-graph-eval.mjs` after any system-viz regen that yields ≥2
high-confidence reference ghosts — no retraining needed for the data to change.
