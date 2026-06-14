---
name: u-rag-4-synergy-wiring-2026-05-22
description: "U-RAG-4 PARTIAL — edge-ordering lib + 2 hooks shipped; synergy-wiring 2-of-4 done (system-viz roost, wiki architecture entry). GNN reference-pool feed + per-unit obsidian memories remaining."
aliases: reference_u_rag_4_synergy_wiring_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.021Z
---


# U-RAG-4 — edge-ordering + milestone synergy wiring

## Edge-ordering (DONE earlier; prior session)

`scripts/lib/edge-order.mjs` — pure: reorders a rank-sorted top-K so strongest hits sit at HEAD and TAIL with weakest in the low-attention middle ("lost in the middle"). O(n), no count change, no latency. Shipped commits: `25b770e195` (lib) · `2b4654a710` (master-index-precheck-inject) + tribal sibling.

Edge-ordering for the remaining 2 hooks (memory-relevance, wiki-precheck) is a follow-up.

## Synergy wiring (this session — 2 of 4 shipped)

- **system-viz ghost roost** ✅ `8554ca7c4d` — `scripts/generate-rag-upgrade-features.mjs` emits `ghost.rag_upgrade_ms0` + 6 unit children, parses status from spec `## Status` table (emoji-agnostic keyword match; static 6-unit set so format drift degrades to "unknown" gray, never drops). Wired in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` (loadOptional + version line + splice block mirroring priorityQueue). 17/17 tests. Per-file scrutiny 2/2 PASS.
- **wiki architecture entry** ✅ `12182c62dd` — `knowledge/wiki/architecture/two-stage-lexical-rerank.md` documents the U-RAG-2 pattern + boost-pinning invariant + why-not-NIM rationale. Cross-refs to milestone + keyscheme memories.
- **per-unit obsidian memories** ✅ this batch — 5 new files (U-RAG-2..6); U-RAG-1 already covered by [[reference_tribal_index_keyscheme_clobber_2026_05_22]]. The Stop hook `stop-obsidian-memory-feed.mjs` auto-propagates C: → H: `knowledge/memories/reference/`.
- **GNN feed** ✅ wired + triggered + empirically dormant (R12 honest reporting) — research finding: NN-1 (the 768-d feature swap) was **already shipped 2026-05-17** in `scripts/lib/graphsage-train-pipeline.mjs` with a `--embedding-source` CLI flag.

**Empirical retrain (this session, 2026-05-22):** I triggered the 768-d retrain command from this iteration. Result: `featureSource:projected` (the pipeline FELL BACK to legacy 8-d features because `embeddingHitCount=0`), AUROC=0.2971, Brier(calibrated)=0.2245. The checkpoint at `state/shared/nn-graph/graphsage-checkpoint-768d-rag-upgrade.json` will NOT auto-promote (AUROC 0.297 < 0.78 gate). **The discovery: the spec's "U-RAG-1 wiki embeddings become the GNN's reference pool" framing is incomplete.** The wiki embeddings are keyed on `external:<winPath>` (wiki file path); the system-graph nodes are engine/hook/skill names. Zero overlap → fail-soft fallback to projected features. Bridging requires an additional mapping layer (graph node ID → wiki file path) before the GNN can consume wiki embeddings as node features. That's a follow-up unit, NOT in [[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] scope. It accepts the existing `knowledge/wiki/architecture/_embeddings.jsonl` (14,738 int8 768-d nomic-embed-text vectors) as the GraphSAGE feature source. The U2 self-retrain lifecycle (`scripts/nn-graph-retrain-lifecycle.mjs`) auto-promotes any checkpoint that clears the AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 NN-GRAPH gates. **The wiring is complete; remaining work is operator-action only.** Trigger:
  ```
  node scripts/lib/graphsage-train-pipeline.mjs \
    --embedding-source H:/prism/knowledge/wiki/architecture/_embeddings.jsonl \
    --node-type-field layer \
    --neg-p-hard 0.7 \
    --out state/shared/nn-graph/graphsage-checkpoint-768d.json
  ```
  Run when memory permits (<90% commit). NN-EVAL.json's `poolSize:0` / `auroc:0.096` are about HOLDOUT-pool coverage and AUROC under the current 8-d projected features — a 768-d retrain is the next lever. Per [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] the empirical question (whether 768-d clears the gate) is answerable only by running this command. The RAG-UPGRADE→GNN bridge IS the `--embedding-source` flag; no new code needed.

## See also

- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md`
- Wiki: [[two-stage-lexical-rerank]]
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] — GNN 768-d feature-layer prior work
