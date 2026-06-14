---
title: U-NNG-PIPELINE-STRATIFIED-WIRE
kind: architecture
milestone: NN-GRAPH-MS1
shipped: 2026-05-17
slot: alpha
commit: "97c9286311"
status: shipped
related: [nn-graph-ms0]
---

# NN-GRAPH-MS1 / U-NNG-PIPELINE-STRATIFIED-WIRE

Wires the GraphSAGE trainer's already-shipped **stratified negative sampling**
through `runTrainingPipeline` so the GNN both trains AND evaluates against a
type-marginal-matched negative distribution. Closes the *cause* of the
AUROC=0.096 deferred-deploy-gate (heterophily anti-correlation under uniform
negatives) documented triply in [[nn-graph-ms0]].

## Root cause
`scripts/lib/graphsage-trainer.mjs` already exported `positiveTypeMarginal`,
`sampleStratifiedNegativeEdges`, and a `train()` accepting `opt.nodeType` +
`opt.negPHard`. `scripts/lib/graphsage-train-pipeline.mjs` never passed
`nodeType`, so on the heterophilous system-viz graph (same-type ≠ linked)
uniform negatives let the model exploit "different type ⇒ not linked", which is
anti-correlated with truth → AUROC below random. The defect was at the
trainer↔pipeline **integration boundary**, not the algorithm.

## Change (opt-in, backward-compatible)
- `PIPELINE_DEFAULTS.nodeTypeField=null`, `.negPHard=0.7` — off unless requested.
- `extractNodeTypes(rawGraph, fieldName)` — `Map<id,type>` or null on
  missing/non-string/no-field/non-object.
- `sampleStratifiedEvalNegatives(...)` — re-implements the trainer's stratified
  pick against the pipeline's `canonicalEdgeKey` (the trainer's internal
  `edgeKey` is unexported), falling back to uniform `sampleEvalNegatives()` when
  nodeType/marginal absent — so eval negatives mirror the trained distribution.
- `runTrainingPipeline`: `nodeType` filtered to `features.keys()` (a pruned/capped
  graph would inflate bucket weights with unsamplable ids); `typeMarginal`
  computed from **trainEdges only** (leakage-safe); `stratifiedActive` gates the
  `train()` call AND eval negatives together.
- CLI flags `--node-type-field <field>` / `--neg-p-hard <0..1>`; metrics expose
  `stratifiedNegatives/nodeTypeField/typeMarginalSize/negPHard`.
- Legacy path is **byte-identical** when `nodeTypeField` unset (regression test
  asserts `deepEqual` weights across two runs + `stratifiedNegatives===false`),
  preserving `PRISM_NNG_DISABLE` discipline.

## Tests
74/74 pipeline + 183/183 NN-GRAPH stack via `node --test` (+23 new cases;
boundary fixtures sized — e.g. 30 nodes/type — to defeat seen-set saturation in
the marginal-mass assertion).

## Status / operator action
Deploy gate moved **code-side → data-side**. `state/shared/nn-graph/NN-EVAL.json`
remains `deferred:true, poolSize:0` because the live 372k-node graph currently
has 0 reference ghosts (tier dormant *by data*, not by bug). Lift requires an
operator out-of-session run:

```
node scripts/lib/graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard 0.7
```

against the real graph, after which `nn-graph-eval.mjs` re-reads NN-EVAL.

Memory: [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] ·
[[reference_nn_graph_ms0_2026_05_16]].

## NN-GRAPH-MS2 / U1-REFERENCE-POOL-SEED-STAGE (2026-05-17, slot alpha)

The MS1 stratified-wire above made the eval *able* to measure a good model;
this unit makes the eval *able to run at all*. Root cause: `nn-graph-eval`
deferred `insufficient-reference-pool` (poolSize:0) on every run because
`seed-ghost-from-unwired.mjs` — which already emits high-confidence
(0.80–0.85) `ghost.unwired-engine` reference nodes — was never a regen-viz
stage, so each regen rebuilt `system-graph.json` with 0 ghost nodes. DEDUP/
simplify win: the fix is **not a new builder** but one explicit **post-merge**
`spawnSync` stage in `regen-viz.mjs` (`seed-ghost-from-unwired.mjs --apply`,
after `add-parent-contains-edges`, past the merge-abort gate, fail-loud,
idempotent). FAST[] was unusable (arg-less → cannot pass `--apply`).

**Necessary but NOT sufficient** (Reviewer B, R12): verifiably clears the
data-side dormancy gate only (seed output passes all 4 `buildHoldout` filters
at conf ≥0.8 → poolSize≥2 → eval grades instead of deferring). The model-side
gate (no checkpoint clears AUROC≥0.78; current 0.096) is untouched — full NN
autonomy still needs the operator stratified retrain + NN-GRAPH-MS2 U2 (queued:
self-retrain lifecycle scheduled task, fleet-reaper S4U pattern). 4 node:test
structural fail-on-revert guards; per-file 2-reviewer scrutiny PASS, 0 P0/P1.
Memory: [[reference_nn_graph_ms2_u1_2026_05_17]].

## NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE (2026-05-17, slot alpha)

U1 made the eval *able to grade*; U2 makes the **retraining itself autonomous**.
`scripts/nn-graph-retrain-lifecycle.mjs` runs as a Windows scheduled task
(`.claude/helpers/install-nn-graph-retrain-task.ps1` — S4U principal, AtStartup
trigger, 6-hour cadence, `RestartCount 3`, `MultipleInstances IgnoreNew`; a
near-mirror of the proven `install-fleet-reaper-task.ps1`). Per poll:

1. **fingerprint** — `graphFingerprint(graph)` → `{nodeCount, edgeCount, ghostCount}`.
2. **drift-detect** — `driftDecision()` compares the fingerprint against a
   baseline sidecar (`state/shared/nn-graph/retrain-baseline.json`). No drift +
   a fresh baseline → cheap no-op SKIP. Triggers: force · no baseline · node/
   edge/ghost delta past its band · baseline older than `maxAgeHours` (168h
   floor, catches trainer-*code* drift the graph fingerprint cannot see).
3. **train** — spawn `graphsage-train-pipeline.mjs --out <candidate> --graph
   <path> --node-type-field layer --neg-p-hard 0.7`. The live checkpoint is
   **never** touched by training; the trainer writes only the candidate path.
4. **evaluate** — `runAssessment({checkpoint: candidate})` grades it.
5. **promote** — `promoteDecision()` is the **safety invariant**: promote IFF
   `assessment.deferred === false && assessment.grade.pass === true` (strict
   booleans). A deferred (insufficient-reference-pool) or sub-gate candidate is
   NEVER promoted. Promotion = atomic candidate→live rename, prior live kept as
   `graphsage-checkpoint.prev.json` (reversibility).
6. **ledger** — one advisory JSONL row to `retrain-lifecycle.jsonl`.

### Design
Pure exported decision fns (`graphFingerprint` / `driftDecision` /
`promoteDecision` — I/O-free, defensive) + a fail-soft imperative shell
(`runLifecycle` — NEVER throws; every side effect is an injectable dependency).
A PID lockfile (`retrain.lock`, stale-reclaim by liveness probe) serializes an
overlapping run (scheduled task racing a manual `--force`) so the shared
candidate path cannot corrupt. `runLifecycle` wraps its body in `try/finally`
so the lock is released on every exit path. CLI: `--force` · `--dry-run`
(train+eval+decide, never promote, never move the baseline) · `--status`.

The baseline advances on every successful retrain *attempt* (the trainer is
deterministic — re-running over an unchanged graph reproduces an identical
candidate), including a sub-gate fail; the next genuine retry is driven by graph
drift or the `maxAgeHours` floor.

### Tests
49 `node:test` cases — pure-fn reference values, the safety invariant against
all violating inputs (null / `{}` / string `"false"` / string `"true"` /
sub-gate / deferred), all ~10 `runLifecycle` action paths, adversarial inputs
(NaN / zero-baseline div-by-zero / every-dep-throws), and a **real-wiring test**
that drives the actual `runAssessment` with a `readFileImpl` spy to prove the
checkpoint-path contract the injected fakes assume (the "hermetic fakes don't
prove production wiring" oracle — RGS-MS1 / FLEET-REAPER-TIER2 lesson class).
6 per-file reviewer agents across the 3 files, all PASS; 2 P1s fixed in-session
(orchestrator: PID lock + SIGKILL surfacing; installer: `-RunNow` poll ceiling).

### Scope honesty (R12)
U2 makes *retraining* autonomous — it does NOT make the GNN deploy-ready. The
model-side gate (AUROC≥0.78 vs 0.096 heterophily anti-correlation) is untouched.
The lifecycle will faithfully **decline to promote** every sub-gate candidate
until a model-side unit (768-d features / improved negative sampling) lands —
which is *correct* behavior, not a gap: U2 is the mechanism that will
auto-promote the first good checkpoint the moment one is produced.

Knobs: `PRISM_NN_RETRAIN_{DISABLE, DRY_RUN, MIN_NODE_DELTA_PCT,
MIN_EDGE_DELTA_PCT, MIN_GHOST_DELTA_PCT, MAX_AGE_HOURS}`.
Memory: [[reference_nn_graph_ms2_u2_2026_05_17]].

## NN-GRAPH-MS2 / NN-1 — U-NNG-768D-FEATURES (2026-05-17, slot alpha)

The **model-side** lever for the AUROC=0.096 deferred-deploy gate. MS1 fixed
the negative-sampling distribution; U1 fixed the data-side dormancy; U2 made
retraining autonomous. NN-1 addresses the remaining model-side variable:
**feature richness**. `NN-EVAL.json checkpointMeta.inputDim = 8` — the live
model trains on the 8-d projected hand-features. The wiki brain already
holds **14,738 int8 768-d nomic-embed-text vectors** at
`knowledge/wiki/architecture/_embeddings.jsonl`. NN-1 is a feature-**source
swap**, not feature engineering — the embeddings exist.

### Change (opt-in, byte-identical legacy)
- `PIPELINE_DEFAULTS.embeddingSource = null` — off unless requested.
- `loadEmbeddingFeatures(filePath, nodeIds, opts)` — new exported loader.
  Manual `indexOf("\n")` loop with V8 substring sharing keeps peak heap ≈
  raw.length (not 2× from `.split`). Int8 dequant `q[i]/127`. Non-finite → 0.
  Ragged rows (`q.length !== dim`) skipped, never silently padded. `__meta`
  header gives `dim`; if absent, inferred from first data row. Seven fail-
  soft return-null gates: non-string filePath, empty nodeIds, reader throws,
  empty raw, malformed/missing meta dim, per-row JSON.parse errors, zero
  hits. `opts.readFileImpl` is an injectable reader for hermetic tests.
- `runTrainingPipeline`: when `cfg.embeddingSource` is set AND the loader
  yields >0 hits, features built from the embedding map with a 768-d zero-
  vector fallback for nodes absent from the file (uniform feature matrix;
  structure-only contribution via SAGE aggregation). Otherwise the legacy
  projected-feature path runs **byte-identical** to pre-edit behavior.
- New metrics: `featureSource ("projected"|"embedding")`, `embeddingDim`,
  `embeddingHitCount`, `embeddingMissCount`.
- CLI: `--embedding-source <path>`.

### Tests (103/103 green)
+27 cases across 3 new describes. The **REAL-WIRING** test writes a real
on-disk JSONL fixture and drives `runTrainingPipeline` end-to-end (the
"hermetic fakes don't prove production wiring" oracle — same lesson class
as [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] and
[[reference_fleet_reaper_tier1_2026_05_17]]). The **LEGACY-PARITY** test
pins byte-identical metrics between `embeddingSource:null` and unset via
`deepEqual(stripTs(a.metrics), stripTs(b.metrics))` — catches every metric
drift, not just 5 hand-picked fields. The **PARTIAL-HIT** test pins the
zero-fill contract for the realistic deploy-gate config (9 of 15 nodes
covered → `embeddingHitCount === 9, embeddingMissCount === 6`, training
succeeds — proving the zero-fill kept the feature matrix uniform).

### Per-file scrutiny (4 reviewer agents, 2 rounds)
- File 1 (pipeline): arm A code-analyzer PASS · arm B reviewer PASS, round
  1, 0 P0/P1.
- File 2 (test): arm A test-review PASS round 1 · arm B reviewer FAIL with
  8 P1 → fixes applied (tightened `hit >= 15` → `=== 15`, expanded
  LEGACY-PARITY to `deepEqual`, added PARTIAL-HIT test pinning zero-fill,
  added 4 defensive guards for malformed `__meta` / null-obj / array-obj,
  fixed hardcoded `H:/__nonexistent_*` Windows paths to tmpdir-based with
  random suffix, asserted `embeddingMissCount` field) → round 2 PASS · PASS,
  0 P0/P1.

### Auto-promotion (deploy-gate path)
The U2 self-retrain lifecycle promotes the 768-d candidate checkpoint IFF
it clears the NN-GRAPH gates (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15). No
deploy code needed — U2 is the mechanism that auto-ships the first good
checkpoint the moment one is produced.

### Scope honesty (R12 — necessary but NOT sufficient)
NN-1 makes the 768-d feature regime *available*. Whether richer node features
actually overcome the heterophily anti-correlation is an empirical question
only the operator's stratified retrain can answer. If 768-d still
under-performs, the next lever is a heterophily-aware aggregator
(H2GCN-style ego/neighbor separation) — a substantively larger unit, scope
only on empirical failure.

### Operator action
Once memory permits (<90% commit):
```
node scripts/lib/graphsage-train-pipeline.mjs \
  --embedding-source H:/prism/knowledge/wiki/architecture/_embeddings.jsonl \
  --node-type-field layer \
  --neg-p-hard 0.7 \
  --out state/shared/nn-graph/graphsage-checkpoint-768d.json
```
Then `node scripts/nn-graph-retrain-lifecycle.mjs` (or wait for the cron) —
the lifecycle's promote-on-gate-pass guard atomically swaps live ↔ candidate
iff the new checkpoint clears all 3 NN-GRAPH gates.

Memory: [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]].
