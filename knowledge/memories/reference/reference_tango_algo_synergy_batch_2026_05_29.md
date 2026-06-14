---
name: reference_tango_algo_synergy_batch_2026_05_29
description: ALGO-SYNERGY batch (slot tango, 2026-05-29) — 11 new dedup-gated algorithm primitives wired to prism_algorithm; cron stopped at diminishing-returns inflection
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.965Z
aliases: reference_tango_algo_synergy_batch_2026_05_29
---


**Slot tango, 2026-05-29, `/goal generate algorithms in priority order` + `/loop next batch of algorithms` (recurring cron `4c9b46ec`).** Built 11 genuinely-distinct, dedup-gated, tested, dispatcher-wired algorithm primitives this session — all in `mcp-server/src/algorithms/`, each wired into `algorithmDispatcher.ts` via a lazy-import validate-then-calculate `case` block + an enum-membership + reachability synergy test (the MS1 lesson: assert `ALGORITHM_ACTIONS.toContain(...)` so a mock server can't false-green a missing `z.enum` entry).

## The 11 (priority-list head: ai/nn/gnn/deep-learning/deep-reasoning)
- **HeterophilyAwareAggregator** → `graph_heterophily_aggregate` (GNN; H2GCN ego/neighbor separation — the AUROC=0.096 heterophily lever for NN-GRAPH)
- **ScaledDotProductAttention** → `ml_attention` (transformer core)
- **LayerNormalization** → `ml_layernorm` (transformer block — *pairs with* ml_attention; Ba/Kiros/Hinton 2016)
- **LowRankApproximation** → `ml_lowrank` (truncated SVD via power-iteration+deflation; LoRA core; Eckart–Young)
- **PrincipalComponentAnalysis** → `ml_pca` (*composes* LowRankApproximation)
- **KNearestNeighbors** → `ml_knn` (RAG retrieval/classify/regress; cosine/euclidean/manhattan)
- **GaussianMixtureModel** → `ml_gmm` (EM soft clustering, diagonal cov, log-sum-exp stable; completes the clustering family kmeans/kmedoids/dbscan/knn/gmm)
- **ViterbiDecoder** → `ml_viterbi` (exact HMM MAP path, log-space DP)
- **BeamSearchDecoder** → `ml_beam_search` (n-best top-K decoding; *companion to* ml_viterbi — approximate large-vocab vs exact small-state; matrix-formulated so wireable)
- **DynamicTimeWarping** → `ml_dtw` (elastic time-series alignment, Sakoe-Chiba)
- **SavitzkyGolayFilter** → `signal_savgol` (polynomial smoothing/derivatives; telemetry pre-processing)

`prism_algorithm` ML group grew to **19 actions**. Synergy test suite: **47 tests** (all PASS).

## Stop decision (R6 + R12 honesty)
Stopped the recurring cron `4c9b46ec` at the diminishing-returns inflection rather than manufacture marginal work. Remaining candidates were each disqualified by evidence:
- `Welford`/SPC control-limits → overlaps `AnomalyDetector.ts` (marginal)
- `A*`/pathfinding → toolpath/CAM = echo/kilo domain-slot territory ([[feedback_prioritize_devtools_backend]] is about leverage, but R8 forbids building a peer slot's domain solo)
- `KalmanFilter` → already exists (DUP)
- priority-tail (sfc/cad/cam/mill/lathe/wire/post/quoting/erp) → **domain-slot territory** owned by oscar/delta/echo/foxtrot/whiskey/mike/india/charlie/hotel — needs coordination, not tango-solo builds

**Lesson reaffirmed:** an unattended `/loop` cron is correct ONLY while genuinely-distinct, in-lane, dedup-gated picks remain. When the dedup probe + domain-ownership map show only marginal/out-of-lane candidates, `CronDelete` + checkpoint beats spinning. See [[feedback_autonomous_loop_drift_discipline]].

Pattern for each build: dedup grep in `src/algorithms/` FIRST → `Algorithm<I,O>` (validate/calculate/getMetadata) → real-value hand-derived test (never `toBeDefined()` stubs; fix the test, never weaken the guard — the LayerNorm `epsilon:0` and SavGol cubic-at-symmetric-interior cases were both *test* bugs, code was right) → wire dispatcher action + case + comment count → enum+reachability synergy test → `rtk npx vitest run` → `[MAIN] [ALGO-SYNERGY]/U-ALGO-*` commit on `cad-fusion-live-ms0`. Related: [[reference_tango_ml_dispatcher_wire]] · [[reference_tango_attention_algorithm]] · [[reference_tango_lowrank_svd]].

## Continuation — transformer stack (attended, 2026-05-29 `/checkin-tango continue building high roi algos and engines`)
+2 primitives completing the transformer block (batch now **13**, ML group **21 actions**), demonstrating the just-written [[feedback_find_all_wiring_endpoints_and_combinations]] doctrine by COMPOSING earlier picks:
- **MultiHeadAttention** → `ml_multihead_attention` (`57cb18ffc3`) — composes `ScaledDotProductAttention` per head + concat + Wo; h=1/no-proj ⇒ exactly SDPA (load-bearing test invariant); 15+3 tests.
- **TransformerBlock** → `ml_transformer_block` (`b384ed9ac0`) — composes MultiHeadAttention + LayerNormalization + position-wise FFN(relu/gelu) + residuals; pre-LN default / post-LN opt; identity invariant zero-Wv+zero-FFN ⇒ out=x; fully hand-derived FFN element + residual-structure invariant; 14+3 tests.
Composition chain: `ml_attention` → `ml_multihead_attention`+`ml_layernorm` → `ml_transformer_block`. Wired into india galaxy brain (stateful N-block inference engine is india's layer — R8). TransformerBlock is correctly an ALGORITHM (stateless given weights), NOT an engine; PRISM engines are domain-stateful and owned by domain slots — said so honestly rather than fabricate a redundant engine wrapper.

## +1 robust-estimation primitive (broadens PSN into manufacturing-data domains, 2026-05-29 "lets keep improving")
- **RANSACHyperplane** → `spatial_ransac_fit` (`a5bc7ffaeb`) — robust orthogonal-distance line(2D)/plane(3D)/hyperplane(N-D) fit, REJECTS outliers via RANSAC consensus + total-least-squares refit on inliers (self-contained Jacobi symmetric-eigensolver helper, also reusable). Deterministic given seed; reports inliers/outliers/inlierRMS. 16+3 tests (hand-derived line `y=2x+1` normal `(2,−1)/√5`, 2-outlier rejection, z=0 plane). **Batch now 14 primitives.** First non-ML/non-AI pick — deliberately broadens PSN leg #8 coverage into the manufacturing-data domains: wired into **cad** (planar-face extraction from noisy clouds), **quality** (CMM flatness/straightness, outlier-robust form error), **oscar** (robust telemetry trend) galaxy brains. Confirms the dedup discipline caught a substring false-positive ("ransac" ⊂ "transaction", 11 hits in the EDI parser) — word-boundary re-check before building. Next candidates if continuing: Kabsch/Procrustes rigid alignment (metrology registration, reuses the Jacobi helper), P² streaming quantiles (SPC control limits).
