---
name: ai-training-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) deep-research foundations layer for the ai-training galaxy (AI/ML systems engineering — GNN/LoRA/RAG/calibration). 8 canonical sources fetched + excerpted from arXiv/Stanford/HuggingFace. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: ai-training
  tier: VERIFIED
  verifiedBy: WebFetch
---

# ai-training galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched and excerpted — not model-recalled. Pure CS/AI/ML literature; field fence held (no manufacturing sources).

## Synthesis (next-layer knowledge)
The ai-training galaxy sits at the intersection of four compounding research threads: (1) **Inductive GNN learning** (GraphSAGE, H2GCN) enabling node classification on evolving and heterophilic graphs without full retraining — GraphSAGE's neighborhood-sampling aggregators generalize to unseen nodes at inference, while H2GCN's ego/neighbor separation and higher-order neighborhoods correct the failure mode where standard GNNs are outperformed by structure-ignoring MLPs on heterophilic graphs (directly applicable to PRISM's wiring-inference tier-5 where engine ghost-nodes and their dispatcher neighbors occupy different class labels). (2) **Parameter-efficient fine-tuning** (LoRA, QLoRA, PEFT) compressing domain adaptation to a few million adapter params — LoRA's rank decomposition (W0+BA, r<<d,k) eliminates inference latency, QLoRA stacks 4-bit NormalFloat + paged optimizers to train a 65B model on one GPU; the backbone of PRISM's ~95 LoRA engine stack on Blackwell 96GB. (3) **Hybrid parametric+retrieval** (RAG) grounding generation in live non-parametric corpora via end-to-end MIPS retrieval — the pattern behind PRISM's tribal/wiki/corpus injection. (4) **Post-hoc confidence calibration** via temperature scaling — the ICML 2017 finding that modern nets are poorly calibrated, plus the Murphy reliability decomposition (residual Brier loss is *refinement*, not miscalibration → temperature scaling alone cannot close PRISM's GNN Brier gate at minConf=0.7). Stanford CS224W grounds the pedagogical layer.

## Verified sources

### [Inductive Representation Learning on Large Graphs (GraphSAGE)](https://arxiv.org/abs/1706.02216v4) — paper
> "most existing approaches require that all nodes in the graph are present during training of the embeddings; these previous approaches are inherently transductive and do not naturally generalize to unseen nodes."

**Knowledge:** GraphSAGE — inductive neighborhood sampling + aggregation (mean/LSTM/pooling) enabling GNN generalization to unseen nodes at inference (Hamilton, Ying, Leskovec, NeurIPS 2017). Foundational to PRISM's GNN tier-5 wiring-inference cascade.

### [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) — paper
> "As we pre-train larger models, full fine-tuning, which retrains all model parameters, becomes less feasible."

**Knowledge:** Low-rank decomposition W0 + BA (r << d,k) — freezes pretrained weights, trains only adapters A,B; ~10,000x parameter reduction vs full fine-tuning; no inference latency (adapters merge at deploy). Directly applicable to PRISM's ~95 LoRA engine stack.

### [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) — paper
> "QLoRA backpropagates gradients through a frozen, 4-bit quantized pretrained language model into Low Rank Adapters (LoRA)."

**Knowledge:** 4-bit NormalFloat + double quantization + paged optimizers on top of LoRA; fine-tune a 65B model on a single 48GB GPU at 16-bit task performance. Maps to PRISM's Blackwell 96GB VRAM target.

### [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) — paper
> "their ability to access and precisely manipulate knowledge is still limited, and hence on knowledge-intensive tasks, their performance lags behind task-specific architectures."

**Knowledge:** RAG combines parametric seq2seq memory with a non-parametric dense vector index via MIPS, end-to-end fine-tuned (Lewis et al., NeurIPS 2020). Directly maps to PRISM's tribal/wiki/corpus RAG injection pipeline.

### [On Calibration of Modern Neural Networks](https://arxiv.org/abs/1706.04599) — paper
> "We discover that modern neural networks, unlike those from a decade ago, are poorly calibrated."

**Knowledge:** Temperature scaling (single scalar T dividing logits before softmax) is the simplest, most effective post-hoc calibration (Guo et al., ICML 2017). Applies to PRISM's GNN AUROC/Brier gate + selective-deploy threshold (minConf=0.7); PRISM's Murphy decomposition confirmed residual Brier is refinement, not miscalibration.

### [Beyond Homophily in GNNs: Current Limitations and Effective Designs (H2GCN)](https://arxiv.org/abs/2006.11468) — paper
> "Many popular GNNs fail to generalize to [heterophily], and are even outperformed by models that ignore the graph structure (e.g., multilayer perceptrons)."

**Knowledge:** H2GCN (Zhu et al., NeurIPS 2020) — ego/neighbor embedding separation + higher-order neighborhoods (k=1,2) + combination of intermediate representations for heterophilic graphs. Directly relevant to PRISM's GNN AUROC heterophily gap on the wiring-inference cascade.

### [Adapters — Hugging Face PEFT Documentation](https://huggingface.co/docs/peft/en/conceptual_guides/adapter) — article
> "Adapter-based methods add extra trainable parameters after the attention and fully-connected layers of a frozen pretrained model to reduce memory-usage and speed up training."

**Knowledge:** Official PEFT conceptual guide (LoRA, AdaLoRA, X-LoRA, LoHa, OFT, BOFT) — unified PeftModel/LoraConfig API with target_modules for attention projections. Canonical wrapper pattern for PRISM's LoRA engine compose/merge.

### [Stanford CS224W: Machine Learning with Graphs](http://web.stanford.edu/class/cs224w) — course
> "Complex data can be represented as a graph of relationships between objects. Such networks are a fundamental tool for modeling social, technological, and biological systems."

**Knowledge:** Graduate course (Jure Leskovec) covering GNNs, node embeddings, link prediction, knowledge graphs, influence maximization. Curriculum baseline for PRISM academy GNN content + pedagogical grounding for the graph-ML tier.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_51c75703-dc9). Ledger: state/shared/galaxy-knowledge-iterations.json._
