---
name: reference_gnn_edge_predict_foundation_2026_06_08
description: "Foundation correction for MS3 U-GNN-EDGE-PREDICT: the link-prediction unit needs no torch/GPU — GraphSAGE is pure-JS, inference is sigmoid(dot()) over the already-computed 563-node 768d embeddings. CORRECTION 2026-06-09: torch IS live in the 3.13 GPU venv (H:/Tools/python-gpu, torch 2.11+cu128 sm_120, qlora) — only the 3.14 non-GPU python lacks it; the H2GCN re-embed is GPU-unblocked NOW (not golf's pending install)."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.590Z
aliases: reference_gnn_edge_predict_foundation_2026_06_08
---


# U-GNN-EDGE-PREDICT foundation — pure-JS, no torch/GPU needed (2026-06-08, slot:india)

Probed the foundation before building MS3 U-GNN-EDGE-PREDICT (link-prediction to
surface missing/dead wiring edges). The handoff said step #1 = "verify the
Blackwell GPU stack runs a real link-pred train." That premise is **wrong** — and
correcting it UNBLOCKS the build.

## Measured facts (DESKTOP-N7MI1VB, 2026-06-08)

| Probe | Result |
|---|---|
| `import torch` (H:/Tools/python 3.14.5 — the NON-GPU fallback interpreter) | **ModuleNotFoundError** here (3.14 has no cu128 wheels). This is NOT the training interpreter. |
| `scripts/py/gpu_health.py` via the **3.13 GPU venv** (`PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe`) | **`{ready:true, torch_ready:true, qlora_ready:true, torch 2.11.0+cu128, device "RTX PRO 6000 Blackwell", sm_120, gpu_matmul_ok:true, bnb_4bit_ok:true}`** — verified LIVE 2026-06-09. Provisioned 06-06 ([[reference_gpu_stack_provisioned_2026_06_06]]). The "golf must install" error only appears when probing the wrong (3.14) interpreter. |
| GraphSAGE link-pred primitive | `sigmoid(dot(z_u,z_v))` EXISTS, exported, `scripts/lib/graphsage-model.mjs:274` (also `sigmoid()` :50, `dot()` :60) |
| Node embeddings (edge-predict INPUT) | `state/shared/nn-graph/node-embeddings-768d.jsonl` — **563 nodes**, ~1.1MB, generated Jun 8 20:41 (today) |

## The correction (R12 / R13 logical-order)

PRISM's entire GraphSAGE pipeline is **pure JavaScript** (`graphsage-trainer.mjs`,
`-predictor.mjs`, `-model.mjs`) — NOT torch. **Edge-prediction INFERENCE** = score
candidate (u,v) pairs with `sigmoid(dot(z_u, z_v))` over the EXISTING 768d
embeddings. That needs **no torch, no GPU train**. The torch/GPU stack matters only
for FUTURE heavier retrains (H2GCN, 768d feature recompute) — which the LIVE 3.13 GPU
venv now supports (torch 2.11+cu128 sm_120, verified 2026-06-09) — not for this unit.

So the real foundation for U-GNN-EDGE-PREDICT is **(a) the 563-node embeddings (✓
present) + (b) the sigmoid/dot primitive (✓ at :274)** — both verified present. The
unit is UNBLOCKED, pure-JS, buildable now.

## Build plan (R13 logical order — core before integration)

1. `scripts/lib/edge-predict.mjs` — pure core: load embeddings jsonl → for candidate
   (engine→dispatcher) pairs NOT currently wired, score `sigmoid(dot(z_eng, z_disp))`
   → rank high-score unwired pairs as "missing wiring" predictions. Reuse the exported
   `sigmoid`/`dot` from `graphsage-model.mjs` (do NOT re-derive). Edge cases: empty
   embeddings, dim-mismatch vectors, NaN, single-node, self-pair (u==v).
2. test (`edge-predict.test.mjs`, node:test) — reference-value scoring (hand-compute
   sigmoid(dot) for a 2-vector fixture) + ranking order + the edge cases.
3. `GnnEdgePredictionEngine.ts` — wraps the lib (AtomicValue-shaped output).
4. Wire `prism_dev:infer_missing_wiring` (dispatcher + schema) → round-trip test.
5. VALIDATE against the live 563 embeddings — surface the top-N predicted missing
   edges with scores; sanity-check a few against reality (is the pair genuinely
   unwired? is the prediction plausible?). Numbers, not "looks fine" (R15-step-3).

## PATH-A COMPLETE end-to-end (2026-06-09) — 3 units, all 3-of-3 PASS

The full path-A pipeline (predict MISSING knowledge/cross-substrate edges over the
existing 543-node knowledge-corpus embeddings) is shipped + committed:
1. `scripts/lib/edge-predict.mjs` — pure scoring core (l2normalize/scoreEdge/loadEmbeddings/rankEdges). 21/21. Arm-C caught+fixed a P1 (Infinity→NaN leak in the norm guard).
2. `scripts/lib/edge-predict-candidates.mjs` — graph-coupled candidate gen (nodeType/edgeKey/loadExistingEdgeKeys/generateCandidates). 14/14.
3. `scripts/predict-missing-edges.mjs` — CLI consumer → ranked report `state/shared/system-viz/predicted-missing-edges.json`. 17/17 incl run() integration. Arm-A caught+fixed 2 P1 (loadEmbeddings read-guard + run() coverage).

LIVE: 543 nodes, 120 existing edges, 1687 ghost→wiki/memory candidates, top predictions
0.72–0.73 (e.g. `ghost.spec.closed-loop-tribal-wiki-plan → feedback_do_optional_high_roi_work`).
Run: `node scripts/predict-missing-edges.mjs --top 50 --min 0.70`.

**WIRING CONVENTION — R11/R8 finding (2026-06-09, supersedes the "TS engine + dispatcher" plan):**
The "GnnEdgePredictionEngine.ts + prism_dev:infer_missing_wiring" plan was WRONG-CONVENTION. Verified:
- `prism_dev:infer_missing_wiring` does NOT exist (was aspirational in CLAUDE.md).
- NO TS engine in `mcp-server/src/engines/` imports from `scripts/lib/*.mjs` (cross-tree .ts→.mjs is not a codebase pattern).
- The ENTIRE NN-graph/GraphSAGE family — `nn-graph-eval.mjs`, `-calibration-analysis.mjs`, `-retrain-lifecycle.mjs` — is wired as **scripts + scheduled-tasks + system-viz augmentations**, NEVER a TS engine or a dispatcher action.
So **the CLI `predict-missing-edges.mjs` IS the in-convention wired surface** (it mirrors `nn-graph-eval` exactly). Building a TS engine or a `prism_dev` action would VIOLATE R11. The dispatcher→script `execFileSync(.mjs --json)` bridge (devDispatcher:8941 `roadmap_tool_plan_coverage`) exists for OTHER families (rgs), not this one.

**System-viz roost — SHIPPED 2026-06-09 (U-GNN-EDGE-PREDICT-VIZ, built by india).** Initially deferred to sierra, then built directly per `feedback_all_slots_free_access` + `feedback_net_benefit_auto_build` (all-additive sierra-core edits are fine for any slot). `scripts/generate-predicted-edges-features.mjs` (9/9 test) emits `predicted-missing-edges-augmentation.json` (ghost.predicted_edges roost, internal-only contains edges) → registered in `regen-viz.mjs` FAST[] (after generate-cross-substrate-edges so its existing-edges input is fresh) + `merge-augmentations.mjs` loadOptional+splice (byte-faithful mirror of the octopus splice). LIVE: 543 emb → 25 preds → 26 nodes/25 edges, splice-sim folds 0-dangling. 3-of-3 PASS. So **path-A is FULLY WIRED end-to-end: core → candidates → CLI → system-viz roost.**

**MODEL-QUALITY finding (reviewer arm-B P2, india's domain to act on):** the top predicted-edge scores SATURATE at ~0.7311 = sigmoid(1.0), i.e. the GraphSAGE embedding cosines hit ~1.0 for the top pairs → **near-degenerate embeddings** (the documented heterophily / feature-sharpness limit from the NN-GRAPH standing focus). The roost faithfully surfaces what the pipeline produces; the predictions are real but discrimination is capped by embedding quality. Sharper features (H2GCN / 768d recompute over a fuller graph) would spread the score distribution — this is the SAME lever as the NN/GNN deploy-gate lift, and it's exactly what path-B's embedding regen should also address.

**Path-B** (engine→dispatcher wiring inference): reuses the SAME CLI (target-agnostic) — only the embedding input changes, no new engine needed. BUT see the degeneracy finding below — a same-feature re-embed is now KNOWN low-value.

## EMBEDDING DEGENERACY — pivotal finding (2026-06-09, U-GNN-EMBEDDING-DEGENERACY, 6th unit)

`scripts/nn-graph-embedding-degeneracy.mjs` (16/16 test, 3-of-3 PASS) characterized the live 543-node
GraphSAGE embeddings. **They are DEGENERATE / COLLAPSED:**
- meanCosine **0.861** (random unit vectors in 768-d ≈ 0)
- centroidNorm **0.928** (543 spread vectors baseline ≈ 1/√543 ≈ 0.043 — so ~93% of every vector points one shared way)
- fracSaturated **0.135** (13.5% of pairs near-identical, |cos|>0.99); p99/max cosine = 1.0
- verdict: **degenerate** (12–20× the random baseline on every axis, reviewer-confirmed)

**Why this REDIRECTS path-B (the operator's GPU decision):** the edge-prediction score saturation
(sigmoid(1.0)=0.7311) is NOT genuine high similarity — it's collapsed embeddings. A **path-B 644MB
GPU re-embed with the SAME features would be WASTED** — it would reproduce the same collapse. The fix
is **sharper features** — the `graph_heterophily_aggregate` (HeterophilyAwareAggregator / H2GCN
ego-neighbour separation) primitive ALREADY exists (`prism_algorithm`, per ai-training MEMORY.md).
This is the **SAME lever** as the NN/GNN deploy-gate (AUROC 0.096 heterophily) — collapsed/heterophilic
embeddings are the shared root cause. So the next high-value GPU spend = an **H2GCN-FEATURE re-embed**
(feed `graph_heterophily_aggregate` features into `graphsage-train-pipeline.mjs` before re-embedding),
NOT path-B's same-feature re-embed. Run `node scripts/nn-graph-embedding-degeneracy.mjs` to re-confirm
after any feature change. See [[feedback_india_deploy_gate_hard]].

**GPU-UNBLOCKED (2026-06-09):** the H2GCN re-embed has **no install gate** — the 3.13 GPU venv torch
stack is LIVE (torch 2.11+cu128 sm_120, qlora, RTX PRO 6000 Blackwell 96GB, `gpu_matmul_ok:true`).
Hardware doctrine: [[feedback_build_for_blackwell_hardware]].

**H2GCN SHIPPED — core + pipeline wiring (2026-06-09, slot:india):**
- `766af4bd56` U-GNN-HETEROPHILY-MJS-PORT: `scripts/lib/heterophily-features.mjs` — pure-JS H2GCN
  transform (faithful .mjs twin of `HeterophilyAwareAggregator.ts`, fuzz-verified 5019/0 vs the
  compiled TS), 21/21.
- `f3e962f400` U-GNN-HETEROPHILY-WIRE: wired into `scripts/lib/graphsage-train-pipeline.mjs` as an
  opt-in `heterophilyHops` (default 0 = byte-identical no-op, proven by checkpoint-layers deepEqual).
  When >0, features become `z=[ego||agg(N1)||...||agg(NH)]` over TRAIN edges (leakage-safe), `inputDim`
  widened to `egoDim*(1+hops)` before createModel; `metrics.heterophily` records it. 108/108, both
  units 2-reviewer PASS (0 P0/P1). The pipeline is **pure-JS** so this runs GPU-free.
- **VALIDATED on live data — `bfaef...` U-GNN-HETEROPHILY-VALIDATE** (`scripts/validate-heterophily-auroc.mjs`,
  heap-bumped A/B, all else identical so the delta IS the lever): on the deploy-gate-realistic config
  (768-d embeddings + stratified + 4000 nodes), 3 seeds, ROBUST — baseline (vanilla) AUROC **0.324-0.345**
  (BELOW random = the heterophily anti-correlation, the 0.096-gate symptom); H2GCN hops=2 **0.389-0.423**;
  lift **+0.059..+0.078** (mean ~+0.067, 3/3 positive, droppedEdges 0). VERDICT: the lever is DIRECTIONALLY
  CORRECT + robust (pulls AUROC up from the anti-correlation) but does **NOT clear the 0.78 gate** (nor reach
  0.5 at hops=2) alone — ~25% of nodes are isolated (ego-only), capping the lift. **Gate-clearance still needs
  the OTHER levers** (reference-pool growth + more hops / denser neighbourhoods + GPU retrain + the selective-
  deploy minConf gate), not this one alone. CRITICAL LESSON: the simple config (8-d, 1500 nodes) single-seed
  showed +0.118 but multi-seed exposed it as NOISE (seed7 -0.049); only multi-seed at the realistic config is
  trustworthy — see [[feedback_multiseed_before_auroc_claim]]. Re-run the harness after any other lever lands.
- Pure-JS pipeline (GPU not required for this). No CLI `--heterophily-hops` flag yet (the harness drives it
  programmatically); adding the flag + a summary line is a small follow-up.

## CORE SHIPPED + a target redirect (2026-06-08, same session)

`scripts/lib/edge-predict.mjs` (pure core: `l2normalize` / `scoreEdge` / `loadEmbeddings` /
`rankEdges`, reuses `linkScore`/`dot` from graphsage-model.mjs) + `edge-predict.test.mjs`
(18/18 node:test, hand-computed reference values). LIVE-VALIDATED: loads the real 543-node
file (0 skipped, dim 768) and scores live 768d vectors (ghost×wiki grid → 0.6692–0.7311,
sensible spread, correct DESC ranking).

**REDIRECT (R12 live-validation catch):** the 543-node embedding set is a **knowledge-corpus
graph**, NOT an engine-wiring graph. Prefix histogram: `wiki:223, vault:153, reg:55,
tribal-tip:26, ms-envelope:12, ghost:7, memory_*:~24, skill/schema/script/…` — **zero
`eng.*` and zero `disp.*` nodes.** So "missing **engine→dispatcher** wiring" CANNOT be
inferred from this file (those nodes aren't embedded). The core lib is target-AGNOSTIC
(scores any candidate pairs), so it stands. But the INTEGRATION half (candidate generation +
`GnnEdgePredictionEngine` + `prism_dev:infer_missing_wiring`) must pick ONE:
  - **(A) retarget** to the edges this set DOES support — knowledge/cross-substrate edges
    (ghost→wiki, wiki→memory, tribal→wiki "documented-by") — aligns with CROSS-SUBSTRATE-SYNERGY-MS0; OR
  - **(B) regenerate** embeddings over the FULL graph incl. `eng.*`/`disp.*` nodes (the
    bridge `graph-node-embedding-bridge.mjs` currently emits only a 543-node matched subset),
    then do the original engine→dispatcher wiring inference.
Decide A vs B before building the integration half — it's a real fork, not a detail.

## Embeddings file schema (CONFIRMED 2026-06-08 — so next context skips re-discovery)

`state/shared/nn-graph/node-embeddings-768d.jsonl` (563 lines):
- **Line 1 is a `__meta` header record** (`{__meta, model, dim, count, generatedAt, schemaVersion, source}`) — SKIP it; real node records start at line 2 (562 nodes).
- **Per-node record: `{ n, q }`** where `n` = node id (dotted-prefix, e.g. `reg.postprocessorregistry`; prefixes `eng.`/`disp.`/`reg.`/`ghost.`/… give node TYPE cheaply — no graph load, no node-card lookup needed for the engine-vs-dispatcher split), `q` = **int[768] QUANTIZED** vector (sample `[2,-1,-21,0]`, NOT float).
- **Edge-predict must dequantize/normalize `q` before `sigmoid(dot())`** (the graphsage-model.mjs primitive expects float, L2-normalized z's — see its :274 comment). Check the trainer / `__meta` for the quant scale before scoring.
- **Existing engine→dispatcher edges** (to identify MISSING ones) come from the CHEAP sources — `state/shared/system-viz/find-cache.json` (55MB) + `node-card-offsets.json` (24MB seekable) — NOT the 676MB `system-graph.json`.

Related: [[reference_gnn_node_embedding_bridge_2026_05_23]] · [[reference_gnn_selective_deploy_2026_06_06]] · [[reference_octopus_live_validation_2026_06_08]].
