---
name: reference_ai-training_phase4_deep_2026_06_13
description: "Phase-4 knowledge layer for PRISM's ai-training galaxy: advanced heterophily-aware GNNs (GPRGNN, ACM-GCN), continual/multi-task LoRA (AdaLoRA, EWC, LoRA-Hub), learned sparse retrieval (SPLADE), full proper-scoring-rule theory (Gneiting & Raftery 2007, log-score, ECE), and the post-training quantization stack beyond GGUF (GPTQ, AWQ, speculative decoding, Flash Attention 2)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.462Z
aliases: reference_ai-training_phase4_deep_2026_06_13
---


# ai-training Phase-4 — Deep Knowledge Increment

> **Scope boundary.** Phase-2 anchored GraphSAGE/H2GCN/GAT, temperature calibration, LoRA/QLoRA (NF4), RAG/HyDE/ColBERT, GGUF, and multi-agent self-consistency. Phase-3 defined the actionable five-step H2GCN lift recipe (encoder swap → QLoRA → HNSW RAG-at-inference → focal Brier-Murphy calibration → GGUF Q4_K_M deploy). This file deposits the **next deeper layer** not yet in those anchors.

---

## Context — where the live PRISM GNN stands (as of this session)

- **Selective-deploy scores (τ=0.7, 32% coverage):** AUROC 0.808 ✓ / macro-F1 0.439 ✗ / Brier 0.179 ✗.
- **Calibration is a measured dead-end:** Murphy reliability decomposition placed only 0.0197 of the 0.179 Brier gap in miscalibration; best calibrator (density-matched LOO-CV isotonic) barely moved the needle (0.178 residual). The residual is *refinement loss*, not a calibration failure — R12: do not build another calibration layer.
- **Bottleneck for macro-F1:** imbalanced multi-class over 34 galaxy nodes + heterophilous wiring graph; the encoder (currently GraphSAGE) is not heterophily-aware. H2GCN was the Phase-3 prescription; Phase-4 documents the full heterophily-aware GNN landscape so the best encoder choice can be made with evidence.
- **6 orphan wires still open in mlDispatcher:** IntentClassifier, PolicyExperienceLedger, TransferLearning, TemporalReasoning, RealTimeAnomalyDetection, KnowledgeIngestion. LoRA-related actions (adalora_*, continual_lora_*, fedlora_*, lora_compose, lora_gate, loramoe, olora_*) already exist in mlDispatcher.ts — Phase-4 sub-domain 2 documents the science behind those actions.

---

## The deeper increments

### 1. Advanced heterophily-aware GNNs beyond H2GCN

**Why Phase-2/3 is not enough.** H2GCN (Zhu et al. NeurIPS 2020) separates ego/neighbor embeddings and uses high-order aggregation to handle heterophily. It is a strong baseline. But the graph-homophily literature has moved on: two 2021 papers directly extend or supersede it, and understanding them is necessary before committing an encoder swap.

**Adjusted homophily metric (Lim et al. NeurIPS 2021).** The classic node homophily ratio h = |{(u,v)∈E : y_u = y_v}| / |E| is biased toward graphs with many classes and unbalanced class sizes — a low-h score may indicate genuine heterophily *or* just class imbalance. Lim et al. (2021, "Large Scale Learning on Non-Homophilous Graphs") define the *adjusted homophily* h_adj = (h − Σ_k p_k^2) / (1 − Σ_k p_k^2) where p_k is class proportion. A graph with h_adj ≈ 0 is truly random; h_adj < 0 is genuinely disassortative. **PRISM implication:** compute h_adj on the 34-galaxy wiring graph *before* selecting an encoder; if h_adj is close to 0 the H2GCN lift may be small and GPRGNN or ACM-GCN could be better.

**GPRGNN — Generalized PageRank GNN (Chien et al. ICLR 2021).** Core idea: replace the fixed or hand-designed graph filter (low-pass in GCN, combined in H2GCN) with a learnable polynomial spectral filter: H = Σ_{k=0}^{K} γ_k (Ã)^k X W, where γ_k are learned per-propagation weights (initialized to a PageRank distribution). This lets the model learn whether to aggregate from close or distant neighbors adaptively *per layer*. The γ_k can go negative (high-pass) or positive (low-pass) — capturing heterophilous or homophilous structure without a separate ego branch. Works well on graphs where the optimal hop-distance is unknown a priori. Published: Eli Chien, Jianhao Peng, Pan Li, Olgica Milenkovic, ICLR 2021. PyG implementation: `torch_geometric.nn.conv.GPRConv`.

**ACM-GCN — Adaptive Channel Mixing GCN (Lim et al. NeurIPS 2021).** Decomposes the graph signal into three channels — low-pass (standard GCN aggregation), high-pass (difference between ego and neighbor), and identity (ego only) — then learns a *per-node* mixing matrix to combine them. Key property: the mixing weights vary across nodes, so a node in a locally homophilous neighborhood gets mostly low-pass while a node with heterophilous wiring gets mostly high-pass. Stronger than H2GCN on several heterophilous benchmarks (Chameleon, Squirrel, Actor) in the Lim et al. study. Heavier than GPRGNN; best when node-local structure varies significantly. Published: Derek Lim et al., NeurIPS 2021.

**Practical selector for PRISM:**
- Compute h_adj on the 34-galaxy wiring graph.
- h_adj > 0.4 → GraphSAGE is adequate; skip encoder swap.
- 0.1 < h_adj ≤ 0.4 → H2GCN (Phase-3 recipe); established, simple to wire.
- h_adj ≤ 0.1 → evaluate GPRGNN (simpler, learnable polynomial) vs ACM-GCN (per-node mixing, stronger on extreme heterophily). K=10 for GPRGNN is a standard starting point.
- All three are in PyTorch Geometric; can swap encoder with minimal dispatcher changes.

**Performance note (hypothesis, not verified on PRISM graph):** in the Lim et al. 2021 study on public benchmarks ACM-GCN improved accuracy 3–10 pp over H2GCN on high-heterophily datasets; GPRGNN improved 2–7 pp. Do not treat these as PRISM predictions.

---

### 2. Continual / multi-task LoRA — science behind mlDispatcher's adalora_* / continual_lora_* actions

Phase-2 covered LoRA (Hu et al. 2021) and QLoRA (Dettmers et al. NeurIPS 2023). Those anchors cover base fine-tuning. This section covers two harder problems: (a) adapting *efficiently* when the rank budget should vary across layers, (b) preventing catastrophic forgetting when fine-tuning on a stream of tasks.

**AdaLoRA — Adaptive Rank Allocation via SVD (Zhang et al. ACL 2023).** Standard LoRA uses a fixed rank r for all weight matrices. Empirically different layers need different ranks (attention QK matrices often need more capacity than V or FFN). AdaLoRA parameterizes each adapter as W_0 + P Λ Q^T where P and Q are orthogonal and Λ = diag(λ_1…λ_r) is a diagonal importance matrix. Importance scores σ_i are computed as the magnitude of the singular values weighted by a sensitivity estimate (gradient-times-weight); low-importance singular triplets are pruned during training, effectively allocating rank budget where it matters. The total parameter budget B = Σ_layers r_i is fixed; AdaLoRA redistributes across layers adaptively. **Result:** at same total parameters, AdaLoRA consistently outperforms fixed-rank LoRA on NLG/NLU benchmarks (Zhang et al. 2023, ACL). mlDispatcher's `adalora_*` actions surface this. Key hyperparameter: `init_r` (initial rank, pruned to target), `target_r` (final rank), `deltaT` (pruning frequency in steps).

**Elastic Weight Consolidation (EWC, Kirkpatrick et al. PNAS 2017).** The canonical continual learning baseline for catastrophic forgetting. When fine-tuning on a new task B after task A, adds a quadratic penalty to the loss: L_B(θ) + λ/2 Σ_i F_i(θ_i − θ_A^*)^2, where F_i is the diagonal of the Fisher information matrix for task A (approximates how important weight i was for A). Weights critical to A are heavily penalized from moving. Limitation: Fisher diagonal grows with tasks; memory cost is O(|θ|) per task. In the LoRA setting, EWC is applied to the adapter parameters only (O(r×d) not O(d^2)), making it practical. Published: James Kirkpatrick et al., "Overcoming Catastrophic Forgetting in Neural Networks," PNAS 2017. mlDispatcher's `continual_lora_*` actions should apply EWC to the LoRA adapter weight-delta, not the frozen base.

**LoRA-Hub (Huang et al. 2023).** Composition approach: maintain a *library* of trained LoRA adapters (one per galaxy or per task), then at inference time learn a *linear combination* of adapters conditioned on the input task descriptor. Formally: ΔW = Σ_k w_k ΔW_k where w_k are learned composition weights. This enables zero-shot or few-shot task transfer: if PRISM adds a new galaxy, retrieve the most relevant adapter subset and compose without retraining. Distinct from Adapter Fusion (Pfeiffer et al. EACL 2021, which learns a learned weighted fusion layer on top of frozen adapters). LoRA-Hub keeps the composed adapter as a true LoRA module. mlDispatcher's `lora_compose` action is the natural home for this. Published: Chengsong Huang et al., 2023 (arXiv, later referenced in multiple surveys).

**LoRAMoE — Mixture-of-Experts LoRA (mlDispatcher has `loramoe`).** Each position in the token sequence routes to one of N LoRA experts via a gating network. Related to Mixtral's MoE at the full-model level but applied only to the adapter parameters. Enables specialization per input type without per-task fine-tuning runs. Active research area in 2023–2024; no canonical single published paper to cite here — recommend verifying the specific LoRAMoE formulation actually wired into mlDispatcher before building consumers.

**PRISM implication for the 6 orphan wires:** IntentClassifier and TransferLearning are the most natural consumers of continual-LoRA. IntentClassifier could use a composed adapter (LoRA-Hub) built from per-galaxy adapters; TransferLearning could use AdaLoRA with per-layer rank allocation where cross-galaxy layers get higher rank.

---

### 3. Learned sparse retrieval — SPLADE (the missing leg vs BM25 and ColBERT)

Phase-2 covered dense retrieval (ColBERT late-interaction MaxSim, HyDE, HNSW) and BM25 (heuristic TF-IDF lexical). The gap: there is a third paradigm — *learned sparse retrieval* — that combines lexical speed with learned weighting.

**SPLADE (Formal et al. SIGIR 2021).** Stands for Sparse Lexical and Expansion Model. Architecture: a transformer (BERT-based) with a SPLADE activation: w_t = Σ_i log(1 + ReLU(e_{i,t})) over all context positions i for vocabulary term t. This produces a sparse high-dimensional vector over the vocabulary where each dimension is a learned importance weight for that term. The output can be stored in a standard inverted index (fast retrieval). Key additions: (a) **vocabulary expansion** — the model can activate terms not literally present in the query/document (e.g. "CNC" → also activates "machining," "G-code"); (b) **FLOPS regularizer** in training: L_FLOPS = λ_q Σ_t w_q,t + λ_d Σ_t w_d,t encourages sparsity by penalizing total activated dimensions. Published: Thibault Formal, Benjamin Piwowarski, Stéphane Clinchant, SIGIR 2021; extended in SPLADE v2 (Formal et al. 2022).

**SPLADE vs ColBERT vs BM25 (characterization, not PRISM benchmark):**
| | BM25 | SPLADE | ColBERT |
|---|---|---|---|
| Representation | Sparse, heuristic | Sparse, learned | Dense per-token |
| Vocabulary expansion | No | Yes (learned) | Yes (MaxSim implicit) |
| Inverted index | Yes | Yes | No (HNSW) |
| Latency at retrieval | Very low | Low | Moderate |
| Training required | No | Yes (fine-tune) | Yes (fine-tune) |
| Out-of-vocab terms | Poor | Good (expansion) | Good (dense) |

**PRISM implication:** the tribal-knowledge retrieval pipeline currently uses ColBERT reranking and BM25 first-stage. A SPLADE first-stage would offer vocabulary expansion (important for manufacturing — "runout" expands to "tool run-out," "radial deviation," etc.) while remaining inverted-index compatible. **This is a hypothesis; validate on live tribal-embed-index before wiring.** The `KnowledgeIngestion` orphan wire in mlDispatcher is the natural consumer.

---

### 4. Proper scoring rules — full theory beyond Brier

Phase-2 introduced the Brier score and the Murphy decomposition. Phase-4 goes to the foundational theory.

**Gneiting & Raftery (JASA 2007) — the canonical reference.** Tilmann Gneiting and Adrian Raftery, "Strictly Proper Scoring Rules, Prediction, and Estimation," *Journal of the American Statistical Association*, 102(477):359–378, 2007. This is the paper to read and cite for any discussion of proper scoring rules in ML. Key results:

- **Strictly proper scoring rule definition:** S(P, y) is proper if E_P[S(P,Y)] ≥ E_P[S(Q,Y)] for all Q, with equality iff P = Q. A strictly proper rule is one where the *forecaster is uniquely incentivized to report their true belief*. Any strictly proper rule can be derived from a *scoring function* G (a convex function of the forecast distribution).
- **Brier score** (Brier 1950): S_BS(p, y) = (p − y)^2. Strictly proper for binary forecasts. Murphy decomposition: Brier = reliability − resolution + uncertainty. **Resolution** is the gap between the reliability surface and the no-skill level — it is what calibration cannot fix (it requires a *sharper* model, not a better-calibrated one). This is why the Phase-3 finding that PRISM's Brier gap is resolution loss and not reliability loss is so important: calibration cannot improve resolution.
- **Log-score / NLL** (Good 1952, Savage 1971): S_log(p, y) = −log p(y). Also strictly proper. Advantages over Brier: (a) more sensitive to confident wrong predictions (asymptotic penalty), (b) theoretically relates to KL divergence, (c) the natural training objective for cross-entropy. Disadvantage: unbounded when the model assigns p≈0 to the true class — a single extremely confident error dominates.
- **Energy Score** (Gneiting & Raftery 2007, multivariate): S_ES(P, y) = E[||X − y||^β] − 1/2 E[||X − X'||^β] where X, X' ∼ P. The multivariate generalization of Brier that does not require decomposing into independent univariate forecasts. Relevant when PRISM predicts joint properties (e.g. a vector of toolpath parameters).

**Practical diagnostics beyond Brier:**

- **Expected Calibration Error (ECE):** partition the probability simplex into M equal-width bins; ECE = Σ_m |B_m|/N |acc(B_m) − conf(B_m)|. Fast, but bin-width-sensitive and biased with small sample sizes. The adaptive ECE (aECE) uses equal-mass bins.
- **Reliability diagram:** plot mean confidence vs mean accuracy per bin. A perfectly calibrated model lies on the diagonal. A curve *below* the diagonal = overconfident; above = underconfident. The area between curve and diagonal is roughly proportional to ECE.
- **Sharpness vs resolution:** sharpness is the variance of the forecast distribution (a property of P alone, independent of y). A sharp model concentrates probability mass; a calibrated model is sharp and its confidence matches empirical accuracy. A model can be sharp but miscalibrated or well-calibrated but diffuse. Maximizing sharpness subject to calibration is the goal — not just minimizing Brier or ECE independently.
- **R12 note:** PRISM's calibration analysis (scripts/nn-graph-calibration-analysis.mjs) already found reliability 0.0197 of 0.179 Brier — this is textbook: the model's resolution loss dominates. Any future calibration experiment must report Murphy decomposition *before* claiming improvement.

---

### 5. Post-training quantization beyond GGUF — GPTQ, AWQ, speculative decoding, Flash Attention 2

Phase-2 covered GGUF Q4_K_M (llama.cpp k-quant format, 4-bit mixed precision with 8-bit for outlier layers). Phase-4 covers the research-grade alternatives.

**GPTQ (Frantar et al. ICLR 2023).** "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers." Elias Frantar, Saleh Ashkboos, Torsten Hoefler, Dan Alistarh. Core algorithm: Optimal Brain Quantization (OBQ), which quantizes one weight at a time, using the inverse Hessian of the block loss to *compensate* remaining weights for the quantization error of each completed weight. Specifically, for row i of weight W in a linear layer, quantize w_i to round(w_i / δ), then update all remaining w_j by subtracting (w_i − quant(w_i)) * H_inv[i,j] / H_inv[i,i]. This is O(d^3) per layer but Frantar et al. give a lazy-batch implementation making it practical. Result: 3–4 bit quantization with perplexity ≈ FP16 on OPT/BLOOM/GPT-J. Key limitation: GPTQ can struggle with outlier activations (specific dimensions with abnormally large values in certain architectures, notably LLaMA-class models).

**AWQ — Activation-Aware Weight Quantization (Lin et al. MLSys 2024).** Ji Lin et al. (MIT Han lab), "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration," MLSys 2024. Key insight: not all weights are equally important — weights multiplied by *salient input channels* (high activation magnitude) cause proportionally more error when quantized. AWQ identifies the 0.1–1% of salient channels via calibration data and applies a *per-channel scaling factor* s to protect them: for weight column j with scaling s_j, quantize W_j / s_j and multiply by s_j at inference (equivalent to scaling the weight but representable as a shifted quantization grid). No weight-by-weight Hessian needed; computationally cheaper than GPTQ. Better than GPTQ on LLaMA-class models at 4-bit; comparable at 3-bit. **PRISM relevance on Blackwell (RTX PRO 6000 96GB):** AWQ is better supported by TensorRT-LLM and vLLM's AWQ kernel path than GPTQ, and the 96GB VRAM makes 4-bit AWQ of a 32B model (qwen2.5-coder:32b, ~17GB at 4-bit) trivially resident alongside other models.

**Speculative decoding (Leviathan et al. ICML 2023; Chen et al. 2023).** The observation: LLM autoregressive inference is bottlenecked by memory bandwidth (the KV cache read per token), not compute. Speculative decoding uses a small *draft model* (N tokens are generated rapidly using the fast small model) and a large *verifier model* (verifies all N tokens in parallel in one forward pass, accepting tokens where the draft distribution matches the target distribution, rejecting otherwise). Throughput gain: 2–3x on same quality output, with zero quality loss (the rejection sampling procedure makes the output distribution *exactly equal* to the target model). Papers: Yaniv Leviathan, Matan Kalman, Yonatan Berant, "Fast Inference from Transformers via Speculative Decoding," ICML 2023; Charlie Chen et al. "Speculative Decoding with Big Little Decoder," NeurIPS 2023. **PRISM relevance:** the Blackwell stack already runs qwen2.5-coder:32b as the default. If a qwen2.5-coder:1.5b or :7b draft model can be kept resident (trivial on 96GB), speculative decoding could 2–3x throughput on the mlDispatcher inference path. Hypothesis; needs profiling.

**Flash Attention 2 (Dao et al. 2023).** Tri Dao, "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning," ICLR 2024 (arXiv 2307.08691, 2023). Core mechanism: IO-aware tiling — instead of materializing the full N×N attention matrix in HBM (O(N^2) reads/writes), compute attention in SRAM-resident tiles that fit in fast on-chip memory. Flash Attention 2 improves on FA1 by better work-partitioning across warps (reduces idle cycles on non-square matrices) and better handling of non-power-of-2 sequence lengths. Speedup on H100: 2–4x wall-clock attention computation vs standard PyTorch; memory: O(N) vs O(N^2) (enables much longer contexts). **PRISM relevance:** FA2 is already integrated in most modern transformer training codebases via `flash_attn` pip package; should be enabled by default in any new fine-tuning run on Blackwell. Verify via `torch.nn.functional.scaled_dot_product_attention` (which calls FA2 when available in PyTorch 2.0+).

---

## Wiring / consumers (R15)

| Phase-4 sub-domain | Existing PRISM surface | Recommended wire |
|---|---|---|
| GPRGNN / ACM-GCN encoder | `nn-graph-retrain-lifecycle.mjs`, `graphsage-trainer.mjs` | Add `--encoder gprgnn` / `--encoder acm` flag to trainer; add `adjusted_homophily` metric to `nn-graph-eval.mjs` |
| AdaLoRA | `mlDispatcher.ts::adalora_*` actions | Wire to `continual-lora-engine.ts` (or equivalent); expose `init_r`, `target_r`, `deltaT` params |
| EWC for continual LoRA | `mlDispatcher.ts::continual_lora_*` actions | Compute Fisher diagonal over ai-training adapter params after each galaxy fine-tune run; store in `state/shared/lora-task-fishers/` |
| LoRA-Hub composition | `mlDispatcher.ts::lora_compose` action | Build adapter library index per galaxy; implement `compose(task_descriptor)` → weighted sum |
| SPLADE | `KnowledgeIngestion` orphan wire | First-stage retriever for tribal-embed-index; fallback to BM25 if SPLADE model not resident |
| Proper scoring / ECE | `nn-graph-eval.mjs`, `nn-graph-calibration-analysis.mjs` | Add `log_score`, `ECE`, `reliability_diagram_data` to eval output; always report Murphy decomposition alongside |
| AWQ quantization | Ollama / vLLM serve path for qwen2.5-coder:32b | Wire AWQ-quantized checkpoint if available; use `--quantization awq` in vLLM serve |
| Speculative decoding | mlDispatcher inference path | Add draft-model config to `ollama-prism-bridge.mjs`; profile vs baseline throughput before shipping |
| Flash Attention 2 | Any new fine-tuning run in ai-training galaxy | Set `attn_implementation="flash_attention_2"` in HuggingFace trainer config; verify with `flash_attn` installed in GPU venv |

**Orphan wires addressed by Phase-4 knowledge:**
- IntentClassifier → LoRA-Hub (compose per-galaxy adapters for intent classification)
- TransferLearning → AdaLoRA + EWC (adaptive rank + forgetting prevention across tasks)
- KnowledgeIngestion → SPLADE first-stage retrieval

---

## Next — Phase-5 honestly scoped

Phase-5 should address:
1. **Graph contrastive learning for node encoder pre-training** (GraphCL, GRACE, SimGRACE — self-supervised pre-training before fine-tuning on the 34-galaxy labeling; could improve macro-F1 without growing the labeled ref-pool).
2. **Long-context RAG beyond HNSW** — multi-vector retrieval (single-document embedding → per-chunk embeddings with parent-doc pointers); BM25+ColBERT reciprocal-rank fusion (RRF) for hybrid first-stage vs SPLADE comparison.
3. **LoRA merging and model ensembling** — TIES-Merging (Yadav et al. NeurIPS 2023: Trim-Elect-Disjoint-Sign merge of LoRA delta-weights from multiple tasks without performance averaging); DARE (Language Model Merging by Uncertainty-Based Dropout, 2024).
4. **Active learning for ref-pool growth** — the selective-deploy gate (τ=0.7) abstains on 68% of nodes; those abstained nodes are high-uncertainty and are the best candidates to label next. Bayesian active learning by disagreement (BALD, Houlsby et al. 2011) or Monte Carlo dropout uncertainty could prioritize which nodes to push to the human labeling queue.
5. **Calibration for multi-class GNN** — Dirichlet calibration (Kull et al. NeurIPS 2019) is a proper multi-class generalization of temperature scaling; avoids the binary-only ECE issue. Worth a single experiment if macro-F1 lifts but calibration regresses (which the Murphy decomposition will surface).

R12 constraint: all Phase-5 items are hypotheses. None have been validated on PRISM graph data.

---

## Sources

All sources below are real, published, nameable. Performance numbers from them are for those papers' benchmarks, not PRISM.

1. Hamilton, Ying, Leskovec. "Inductive Representation Learning on Large Graphs." NeurIPS 2017. (GraphSAGE — covered Phase-2; referenced here for encoder baseline)
2. Zhu et al. "Beyond Homophily in Graph Neural Networks: Current Limitations and Effective Designs." NeurIPS 2020. (H2GCN)
3. Chien, Peng, Li, Milenkovic. "Adaptive Universal Generalized PageRank Graph Neural Network." ICLR 2021. (GPRGNN)
4. Lim et al. "Large Scale Learning on Non-Homophilous Graphs." NeurIPS 2021. (ACM-GCN + adjusted homophily metric)
5. Zhang et al. "AdaLoRA: Adaptive Budget Allocation for Parameter-Efficient Fine-Tuning." ACL 2023. (AdaLoRA)
6. Kirkpatrick et al. "Overcoming Catastrophic Forgetting in Neural Networks." PNAS 2017. (EWC)
7. Pfeiffer et al. "AdapterFusion: Non-Destructive Task Composition for Transfer Learning." EACL 2021. (Adapter Fusion — Phase-4 contrast with LoRA-Hub)
8. Huang et al. "LoRAHub: Efficient Cross-Task Generalization via Dynamic LoRA Composition." 2023. (LoRA-Hub)
9. Formal, Piwowarski, Clinchant. "SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking." SIGIR 2021. (SPLADE)
10. Formal et al. "From Distillation to Hard Negative Sampling: Making Sparse Neural IR Models More Effective." SIGIR 2022. (SPLADE v2)
11. Gneiting, Raftery. "Strictly Proper Scoring Rules, Prediction, and Estimation." JASA 102(477):359–378, 2007. (Canonical proper scoring rules reference)
12. Good. "Rational Decisions." Journal of the Royal Statistical Society B, 14:107–114, 1952. (Log-score origin)
13. Brier. "Verification of Forecasts Expressed in Terms of Probability." Monthly Weather Review 78:1–3, 1950. (Brier score)
14. Murphy. "A New Vector Partition of the Probability Score." Journal of Applied Meteorology 12:595–600, 1973. (Murphy decomposition: reliability-resolution-uncertainty)
15. Frantar, Ashkboos, Hoefler, Alistarh. "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers." ICLR 2023. (GPTQ)
16. Lin et al. "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration." MLSys 2024. (AWQ)
17. Leviathan, Kalman, Berant. "Fast Inference from Transformers via Speculative Decoding." ICML 2023. (Speculative decoding)
18. Dao. "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning." ICLR 2024 / arXiv 2307.08691, 2023. (Flash Attention 2)
