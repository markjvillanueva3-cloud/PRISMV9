---
name: reference_ai-training_gnn_lora_rag_calibration_2026_06_13
description: "AI-training (india) Phase-2 deep-research anchor — GraphSAGE (Hamilton 2017 inductive, neighbor-sample+aggregate) + H2GCN heterophily (Zhu 2020 ego/neighbor separation, higher-order nbrs, no self-mix) + GAT; link-pred eval AUROC/Brier/macroF1 + selective-deploy@τ; calibration Platt/isotonic/temperature (Guo 2017) + Murphy decomp; LoRA (Hu 2021 ΔW=BA) + QLoRA (Dettmers 2023 NF4); RAG (Lewis 2020)+HyDE+rerank; Ollama/GGUF quant; consensus self-consistency/debate (octopus). Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.462Z
aliases: reference_ai-training_gnn_lora_rag_calibration_2026_06_13
---


**Context:** Phase-2 anchor for the AI-training galaxy (india), per the 2026-06-13 knowledge-max `/goal`. Ties to
PRISM's live GNN tier-5 (AUROC 0.808 selective-deploy @τ=0.7) + LoRA + RAG substrates. Spec:
`FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §india.

## Graph neural nets (the wiring-inference tier-5)
- **GraphSAGE** (Hamilton, Ying, Leskovec 2017) — INDUCTIVE node embeddings via neighbor **sampling + aggregation**
  (mean / LSTM / max-pool); generalizes to unseen nodes (vs transductive GCN). PRISM's tier-5 base.
- **Heterophily problem** — vanilla GCN/SAGE assume homophily (connected nodes share labels). PRISM's wiring graph
  is heterophilous (an engine connects to UNLIKE dispatchers) → AUROC capped. **H2GCN** (Zhu et al. 2020) fixes
  via (1) **ego/neighbor embedding separation** (don't mix self into the aggregate), (2) **higher-order
  neighborhoods** (2-hop), (3) combine intermediate representations. Also GPR-GNN, FAGCN. → the path to
  full-coverage lift (vs the current selective-deploy ceiling). [[multiseed_before_auroc_claim]]: link-pred AUROC
  on capped subgraphs is high-variance — never claim a lift on one seed.
- **GAT** (attention over neighbors) — learns per-edge weights; useful when neighbor importance varies.

## Eval + calibration (the deploy gate)
- **AUROC** = ranking/discrimination (threshold-free). **Brier** = calibration+refinement (squared error of
  probs); **Murphy decomposition** = reliability − resolution + uncertainty (PRISM measured reliability only
  0.0197 of 0.179 Brier → the gap is REFINEMENT not miscalibration → calibration is a DEAD END for the Brier gate,
  full-coverage needs sharper features/ref-pool, not recalibration). **macro-F1** = per-class balance.
- **Calibration methods** (when miscalibration IS the issue): Platt scaling (logistic), isotonic regression
  (non-parametric monotone), **temperature scaling** (Guo et al. 2017 — single-param softmax temp, the modern
  default). 
- **Selective deployment @ τ:** abstain below a confidence threshold, defer to the next tier (LLM) → emitted-set
  Brier 0.041 / macro-F1 1.0 / 32% coverage = textbook risk@coverage. The honest way to ship a sub-gate model.

## Fine-tuning (the per-domain LoRAs)
- **LoRA** (Hu et al. 2021) — freeze base W, learn low-rank ΔW = B·A (rank r ≪ dim), scale α/r; only adapters
  train → tiny checkpoints, swappable per domain (mill/lathe/wedm LoRAs). **QLoRA** (Dettmers et al. 2023) —
  4-bit **NF4** base + double-quantization + paged optimizers → fine-tune a large model on one GPU (fits Blackwell
  96 GB comfortably). Dataset feed: vault-to-lora (245/247 feedback memories).

## Retrieval (RAG substrate)
- **RAG** (Lewis et al. 2020) — retrieve-then-generate. **HyDE** — embed a hypothetical answer to improve recall.
  **Reranking** — cross-encoder / bge-reranker / **ColBERT** (late interaction) over the top-k. **Hybrid**
  BM25 + dense (PRISM tribal-rerank is the live leg). Chunking + overlap; embedding model = nomic-embed-text (live).

## Local inference (Ollama / llama.cpp)
- **GGUF** format; quant levels (Q4_K_M = the resident default, Q8/F16 for accuracy); KV-cache; `num_ctx`
  (context — forward numCtx so long slices aren't truncated), `num_parallel`, `keep_alive` (30m). Blackwell:
  gpt-oss:120b for deep reasoning, qwen2.5-coder:32b map, gpt-oss:20b mid.

## Consensus (the octopus)
- **Self-consistency** (Wang et al. 2022 — sample N, majority-vote), **multi-agent debate**, perspective-diverse
  verification. PRISM's octopus = multi-model consensus ledger.

## Integration (india)
- india is the substrate FOR all galaxies (GNN wiring-inference, per-domain LoRAs, RAG recall, consensus). Next
  deep-research (roadmap §india): ingest H2GCN + temperature-scaling papers → retrain GNN with grown ref-pool
  (the full-coverage lift); QLoRA NF4 specifics for the Blackwell fine-tune lane.

Sources (canonical papers): Hamilton et al. 2017 (GraphSAGE); Zhu et al. 2020 (H2GCN); Veličković et al. 2018
(GAT); Guo et al. 2017 (temperature scaling/calibration); Hu et al. 2021 (LoRA); Dettmers et al. 2023 (QLoRA);
Lewis et al. 2020 (RAG); Wang et al. 2022 (self-consistency); Khattab & Zaharia 2020 (ColBERT). Expertise-authored
anchor cross-referenced to PRISM's live GNN/LoRA/RAG state.
