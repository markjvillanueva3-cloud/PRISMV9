---
name: reference-nn-graph-ms2-nn1-768d-features-2026-05-17
description: NN-GRAPH-MS2 NN-1 — GraphSAGE 8d→768d feature swap. Single-file change to the train pipeline; loads the existing wiki embedding JSONL; opt-in, byte-identical legacy path; auto-promotes via U2 lifecycle on AUROC≥0.78 gate-pass. The model-side lever for the deferred-deploy gate. Shipped 2026-05-17 slot alpha.
aliases: reference_nn_graph_ms2_nn1_768d_features_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
---


# NN-GRAPH-MS2 / NN-1 — U-NNG-768D-FEATURES (2026-05-17, slot alpha)

Commit this session. The **model-side** half of the GNN tier-5 stack — pairs
with MS1 stratified negative sampling (the *distribution* lever) by adding
the *feature-richness* lever, the only model-side variable left for the
AUROC=0.096 deferred-deploy gate.

## The lever
`NN-EVAL.json` shows `checkpointMeta.inputDim = 8` — the live model trains
on the 8-d projected hand-features from `systemviz-node-feature-projector.mjs`.
The wiki brain ALREADY holds **14,738 int8 768-d nomic-embed-text vectors**
at `knowledge/wiki/architecture/_embeddings.jsonl`. NN-1 is a feature-
**source swap**, not feature engineering — the embeddings exist.

## What shipped (1 prod file + 1 test file, 346 insertions)
- `scripts/lib/graphsage-train-pipeline.mjs` — adds `loadEmbeddingFeatures()`
  + an `embeddingSource` branch in `runTrainingPipeline` + 4 new metric
  fields + `--embedding-source` CLI flag + console.log feature-source line.
- `scripts/lib/graphsage-train-pipeline.test.mjs` — +27 cases across 3 new
  describes (loader pure-fn coverage, runTrainingPipeline embedding-mode
  integration, parseArgs). 103/103 green.

## The loader (loadEmbeddingFeatures)
Manual `indexOf("\n")` line iteration with V8 substring sharing keeps peak
heap ≈ raw.length on the real 45MB wiki file (not 2× from `.split`). Int8
dequant via `q[i]/127` recovers the L2-normalized component in roughly
[-1, 1]. Non-finite components → 0. Ragged rows (`q.length !== dim`) are
skipped, not silently padded. `__meta` header gives `dim`; if absent,
inferred from the first data row.

**Seven fail-soft return-null gates** (R12): non-string filePath, empty
nodeIds, reader throws, empty raw input, malformed/missing meta dim, all-
line JSON.parse errors, zero hits. `runTrainingPipeline` then falls through
to the legacy projected-feature path — the flag is a no-op, never a crash.

`opts.readFileImpl` is an injectable reader for hermetic tests; the default
is `fs.readFileSync`.

## The branch (runTrainingPipeline)
When `cfg.embeddingSource` is set AND the loader yields >0 hits, features
are built from the embedding map with a zero-vector fallback for nodes
absent from the file (uniform feature matrix; structure-only contribution
via SAGE aggregation; dropping orphans would shrink the graph). Otherwise
the legacy 8-d projected path runs **byte-identical** to pre-edit behavior —
preserves the MS1 stratified-sampling parity invariant.

New metrics: `featureSource ("projected"|"embedding")`, `embeddingDim`,
`embeddingHitCount`, `embeddingMissCount`.

## Auto-promotion (the deploy-gate path)
The U2 self-retrain lifecycle (`nn-graph-retrain-lifecycle.mjs`) will
auto-promote the 768-d retrained checkpoint IFF it clears the NN-GRAPH gates
(AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15). No deploy code needed — U2 is
the mechanism that auto-ships the first good checkpoint the moment one is
produced.

## Per-file scrutiny — 4 reviewer agents, 2 rounds
- **File 1 (pipeline):** arm A code-analyzer PASS · arm B reviewer PASS,
  round 1, **0 P0/P1**. 3 P2 deferrables (USAGE-text drift, unbounded
  `dim` for malicious files, zero-vector orphan-widening as design intent).
- **File 2 (test):** arm A test-review PASS round 1 · arm B reviewer FAIL
  with 8 P1 → fixes applied (tightened `hit >= 15` → `=== 15`, expanded
  LEGACY-PARITY to `deepEqual` minus trainedAt, added PARTIAL-HIT test
  pinning zero-fill, added 4 defensive guards for malformed `__meta` /
  null-obj / array-obj, fixed hardcoded `H:/__nonexistent_*` Windows paths
  to `os.tmpdir()` + random suffix, asserted `embeddingMissCount` field)
  → round 2 PASS · PASS, **0 P0/P1**.

## The PARTIAL-HIT test (the load-bearing add)
The realistic deploy-gate config: a 15-node `clusterGraph(3,5)` with an
embedding fixture covering only 9 of the 15 nodes. Asserts:
- `r.metrics.embeddingHitCount === 9` (exact, not `>=`)
- `r.metrics.embeddingMissCount === 6` (exact)
- `r.skipped === false` — training succeeded, proving the zero-fill kept the
  feature matrix uniform across all 15 nodes (otherwise the trainer would
  crash on dim-mismatch or skip a hollow run).

`miss = features.size - emb.hit = 15 - 9 = 6` algebraically REQUIRES
`features.size === 15`, i.e. the zero-fill loop actually ran for every
nodeId. The test pins the deploy-gate config end-to-end through real disk
I/O — the production retrain will go through this exact path.

## Scope honesty (R12 — necessary but NOT sufficient)
NN-1 makes the 768-d feature regime *available*. It does NOT prove the
AUROC gate clears. The empirical question — does richer node feature
representation actually overcome the heterophily anti-correlation? — is
answerable only by an operator running the 768-d stratified retrain at
<90% commit memory and seeing what `nn-graph-eval` grades. If 768-d still
under-performs, the next lever is a heterophily-aware aggregator
(H2GCN-style ego/neighbor separation) — a substantively larger unit, scope
only on empirical failure.

## Operator action
Once memory permits (<90% commit):
```
node scripts/lib/graphsage-train-pipeline.mjs \
  --embedding-source H:/prism/knowledge/wiki/architecture/_embeddings.jsonl \
  --node-type-field layer \
  --neg-p-hard 0.7 \
  --out state/shared/nn-graph/graphsage-checkpoint-768d.json
```
Then `node scripts/nn-graph-retrain-lifecycle.mjs` (or wait for the cron) —
the lifecycle's promote-on-gate-pass guard will swap live ↔ candidate
atomically iff the new checkpoint clears all 3 NN-GRAPH gates.

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] (the autonomous retrain
lifecycle that auto-promotes this checkpoint) ·
[[reference_u_nng_pipeline_stratified_wire_2026_05_17]] (MS1 — the
distribution lever this composes with) ·
[[reference_nn_graph_ms2_u1_2026_05_17]] (the data-side seed stage) ·
[[reference_nn_graph_ms0_2026_05_16]] (the deferred-gate root cause).
