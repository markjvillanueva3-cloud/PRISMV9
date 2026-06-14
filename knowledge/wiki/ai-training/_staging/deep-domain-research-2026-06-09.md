---
status: UNVERIFIED
owner_slot: india
staged_by: papa-deepdomain-research
date: 2026-06-09
galaxy: ai-training
domain: ML / LoRA / RAG / GNN / calibration / deploy-gates
---

**<!-- UNVERIFIED: india (ai-training owner) must verify every cited claim below against the cited primary source before integrating into the live galaxy CLAUDE.md / MEMORY.md. Every fact carries an inline citation; nothing here is asserted as PRISM ground-truth. -->**

# AI-Training Galaxy — Deep-Domain Research Packet (UNVERIFIED)

Curated, cited best-practice facts for the ai-training galaxy (LoRA fine-tuning, RAG retrieval design, GNN/GraphSAGE, probabilistic calibration, deploy gates). Sources are reputable + free (arXiv primary papers, HuggingFace PEFT docs, Wikipedia for textbook statistics). Each fact maps to a PRISM consumer where relevant (the GNN tier-5 wiring cascade, the LoRA-from-vault pipeline, the RAG corpus, NN-EVAL deploy gates) so india can decide what to surface.

---

## 1. LoRA fine-tuning — rank, alpha, scaling

- **LoRA injects trainable rank-decomposition matrices into each Transformer layer while freezing the pre-trained weights; for GPT-3 175B it reduces trainable parameters by ~10,000× and GPU memory by ~3× versus full fine-tuning with Adam, while matching or beating full fine-tuning quality and adding no inference latency.** (Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models," arXiv:2106.09685, abstract.)

- **The LoRA update is scaled every forward pass by a fixed scalar `lora_alpha / r` (alpha over rank). Rank-stabilized LoRA (rsLoRA) instead uses `lora_alpha / sqrt(r)`, which stabilizes adapters and unlocks better performance at higher `r`; enable with `use_rslora=True`.** (HuggingFace PEFT LoRA developer guide, "Rank-stabilized LoRA (rsLoRA)" section; underlying paper arXiv:2312.03732.)

- **Default PEFT LoRA adapts only the attention query and value projections (`q_proj`, `v_proj`). "QLoRA-style" training instead targets ALL linear layers — set `target_modules="all-linear"` — which the QLoRA paper shows can match full fine-tuning quality.** (HuggingFace PEFT LoRA guide, "QLoRA-style training" section; QLoRA paper arXiv:2305.14314.)

- **DoRA (Weight-Decomposed Low-Rank Adaptation) splits the weight update into magnitude + direction (direction handled by normal LoRA, magnitude by a separate learnable parameter) and "can improve the performance of LoRA, especially at low ranks." Enable with `use_dora=True`.** (HuggingFace PEFT LoRA guide, "Weight-Decomposed Low-Rank Adaptation (DoRA)" section; paper arXiv:2402.09353.)

- **LoRA+ uses different learning rates for the A and B adapter matrices and is reported to increase fine-tuning speed by up to 2× and performance by 1–2% (`create_loraplus_optimizer`, `loraplus_lr_ratio`).** (HuggingFace PEFT LoRA guide, "LoRA+ optimized LoRA" section; paper arXiv:2402.12354.)

- **PEFT supports per-layer rank/alpha overrides via `rank_pattern` and `alpha_pattern` dicts (regex keys), so non-uniform rank allocation across layers is a first-class config — useful when some layers warrant more capacity than others.** (HuggingFace PEFT LoRA guide, "Fine grained control over ranks and alpha (scaling)" section.)

> PRISM relevance: india's LoRA-from-vault pipeline (`vault-to-lora-dataset.mjs`, per MEMORY.md `reference_vault_to_ai_feeders_2026_06_09`) should record `r`, `lora_alpha`, the scaling rule (alpha/r vs alpha/sqrt(r)), and `target_modules` in every adapter's config so the choice is auditable. UNVERIFIED whether PRISM currently uses rsLoRA scaling — india to confirm.

## 2. RAG — retrieval architecture & chunking design

- **RAG combines a parametric seq2seq generator with a non-parametric memory (a dense vector index of Wikipedia retrieved by a neural retriever). Two formulations: RAG-Sequence conditions on the same retrieved passages across the whole output; RAG-Token can attend to different passages per token. RAG set state-of-the-art on three open-domain QA tasks at NeurIPS 2020.** (Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," arXiv:2005.11401, abstract.)

- **Dense Passage Retrieval (DPR) uses a dual-encoder (BERT) to embed questions and passages into dense vectors and retrieves by nearest-neighbor / max-inner-product search; it outperforms BM25 sparse retrieval by 9%–19% absolute on top-20 passage retrieval accuracy across open-domain QA benchmarks.** (Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering," arXiv:2004.04906, abstract.)

- **Chunk size shows a "Goldilocks" trade-off: empirically, increasing chunk size from 50→500 tokens raises answer accuracy (richer context) but slightly raises hallucination; beyond ~1000 tokens accuracy drops as relevant detail is diluted. A moderate chunk size balances context richness against focus.** (Empirical synthesis in recent RAG best-practice surveys — "Searching for Best Practices in RAG," arXiv:2407.01219, and "Multi-Source Knowledge Pruning for RAG," arXiv:2409.13694.)

- **A two-stage retrieve-then-rerank pipeline is the standard high-precision pattern: dense retrieval returns top-k candidates (k a hyperparameter, e.g. 5–8), then a cross-encoder reranker (BERT/T5/LLaMA family) re-scores and keeps a smaller top-k′ to filter noisy/near-duplicate context before generation. Reranking helps most when the knowledge base is large, overlapping, and noisy.** (RAG best-practice survey literature: arXiv:2407.01219; arXiv:2404.07221 "Improving Retrieval for RAG-based QA.")

> PRISM relevance: the ai-training RAG corpus + the tribal-rerank PSN leg (`.claude/scripts/tribal-rerank.mjs`) already implement a rerank stage. UNVERIFIED — india to confirm PRISM's chunk size / overlap settings against the Goldilocks finding above.

## 3. GNN / GraphSAGE — inductive node embeddings

- **GraphSAGE is INDUCTIVE: instead of learning a fixed embedding per node (transductive, like DeepWalk/node2vec), it learns an aggregation FUNCTION that generates embeddings for previously-unseen nodes from their features + sampled local neighborhood — critical for evolving graphs.** (Hamilton, Ying & Leskovec, "Inductive Representation Learning on Large Graphs" (GraphSAGE), arXiv:1706.02216, abstract.)

- **GraphSAGE works by (1) sampling a fixed-size set of neighbors at each hop, then (2) aggregating their feature vectors with a learnable aggregator (mean / LSTM / pooling variants proposed in the paper). Sampling bounds per-node compute regardless of graph degree.** (GraphSAGE, arXiv:1706.02216, abstract + method.)

- **The paper validates the inductive claim on three settings: unseen-node classification in an evolving citation network, Reddit-post classification, and a fully-unseen protein–protein-interaction graph — outperforming strong baselines in each.** (GraphSAGE, arXiv:1706.02216, abstract.)

> PRISM relevance: PRISM's wiring-inference tier-5 GNN is GraphSAGE (CLAUDE.md §NN-GRAPH). The inductive property is WHY a GraphSAGE classifier can score an UNKNOWN `ghost.unwired-engine` node that wasn't in the training graph — india should keep this framing front-and-center in the galaxy brain.

## 4. Calibration — Brier, reliability, ECE, temperature scaling

- **Brier score (binary): `BS = (1/N) Σ (f_t − o_t)²`, where `f_t` is the forecast probability and `o_t ∈ {0,1}` the outcome. Range 0 (perfect) to 1 (worst); lower is better.** (Wikipedia, "Brier score," definition.)

- **Murphy decomposition: `BS = REL − RES + UNC` (Reliability − Resolution + Uncertainty). Reliability measures how well forecast probabilities match observed frequencies (0 = perfectly reliable); Resolution rewards forecasts that deviate from the base rate (higher better); Uncertainty is the irreducible base-rate variance (maximized at a 50% event rate).** (Wikipedia, "Brier score," Murphy three-component decomposition.)

- **A reliability (calibration) diagram plots forecast probability (x) against observed outcome frequency (y); a perfectly calibrated model lies on the y=x diagonal. High discrimination ≠ good calibration — a model can rank outcomes perfectly yet assign miscalibrated probabilities.** (Wikipedia, "Calibration (statistics)" and "Brier score.")

- **Modern deep networks are systematically OVERCONFIDENT / poorly calibrated (a regression vs older networks). Expected Calibration Error (ECE) quantifies the gap between confidence and accuracy. Temperature scaling — dividing logits by a single learned scalar T before softmax (a 1-parameter Platt scaling) — is a "surprisingly effective" post-hoc fix. Calibration is influenced by depth, width, weight decay, and BatchNorm.** (Guo, Pleiss, Sun & Weinberger, "On Calibration of Modern Neural Networks," arXiv:1706.04599, abstract.)

> PRISM relevance: PRISM's GNN deploy gate already grades on Brier + AUROC (NN-EVAL.json). The Murphy decomposition is the lens PRISM used to prove calibration was a DEAD END for the Brier gate (CLAUDE.md §NN-GRAPH 2026-06-06: "Murphy reliability/miscalibration only 0.0197 of 0.179" — the residual was refinement loss, NOT miscalibration, so temperature/Platt scaling can't recover it). This packet's citations are the textbook backing for that finding.

## 5. Deploy gates & evaluation discipline

- **Selective / risk-at-coverage deployment: a calibrated classifier with a confidence threshold can ABSTAIN below the threshold and defer to a fallback, trading coverage for emitted-set accuracy — the textbook risk@coverage curve.** (General classification doctrine; consistent with Guo et al. calibration framing, arXiv:1706.04599. Matches PRISM's tier-5 "DEPLOY-READY-SELECTIVE at minConf=0.7" pattern in CLAUDE.md §NN-GRAPH 2026-06-06.)

- **Link-prediction AUROC on capped subgraphs is high-variance across seeds — single-seed lifts can be noise. Report ≥3 seeds before claiming an AUROC improvement.** (PRISM memory `feedback_multiseed_before_auroc_claim.md`, which records H2GCN +0.118 on seed5 reversing to −0.049 on seed7 — a documented PRISM observation, cited here as PRISM doctrine, not an external claim.)

---

## Sources

1. Hu, Shen, Wallis, Allen-Zhu, Li, Wang, Wang, Chen — *LoRA: Low-Rank Adaptation of Large Language Models* — https://arxiv.org/abs/2106.09685
2. HuggingFace — *PEFT LoRA developer guide* (rsLoRA, DoRA, LoRA+, QLoRA-style `all-linear`, rank/alpha patterns) — https://huggingface.co/docs/peft/main/en/developer_guides/lora
3. rsLoRA — *A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA* — https://arxiv.org/abs/2312.03732
4. DoRA — *Weight-Decomposed Low-Rank Adaptation* — https://arxiv.org/abs/2402.09353
5. LoRA+ — *Efficient Low Rank Adaptation of Large Models* — https://arxiv.org/abs/2402.12354
6. QLoRA — *Efficient Finetuning of Quantized LLMs* — https://arxiv.org/abs/2305.14314
7. Lewis et al. — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* — https://arxiv.org/abs/2005.11401
8. Karpukhin et al. — *Dense Passage Retrieval for Open-Domain Question Answering* — https://arxiv.org/abs/2004.04906
9. Wang et al. — *Searching for Best Practices in Retrieval-Augmented Generation* — https://arxiv.org/abs/2407.01219
10. *Improving Retrieval for RAG-based Question Answering* — https://arxiv.org/abs/2404.07221
11. *Multi-Source Knowledge Pruning for Retrieval-Augmented Generation* — https://arxiv.org/abs/2409.13694
12. Hamilton, Ying, Leskovec — *Inductive Representation Learning on Large Graphs (GraphSAGE)* — https://arxiv.org/abs/1706.02216
13. Wikipedia — *Brier score* (formula, range, Murphy decomposition) — https://en.wikipedia.org/wiki/Brier_score
14. Wikipedia — *Calibration (statistics)* (reliability diagram, discrimination vs calibration) — https://en.wikipedia.org/wiki/Calibration_(statistics)
15. Guo, Pleiss, Sun, Weinberger — *On Calibration of Modern Neural Networks* (ECE, temperature scaling) — https://arxiv.org/abs/1706.04599
