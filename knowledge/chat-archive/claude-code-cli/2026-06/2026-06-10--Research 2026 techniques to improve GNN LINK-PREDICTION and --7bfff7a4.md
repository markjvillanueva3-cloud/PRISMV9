---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Research 2026 techniques to improve GNN LINK-PREDICTION and NODE-CLASSIFICATION "
date: "2026-06-10"
first_ts: "2026-06-10T15:03:55.069Z"
last_ts: "2026-06-10T15:06:10.451Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-af044407fceca94eb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Research 2026 techniques to improve GNN LINK-PREDICTION and NODE-CLASSIFICATION 

> **claude-code-cli** | 2026-06-10 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-af044407fceca94eb.jsonl`

## Transcript

### User | 2026-06-10T15:03:55.069Z

Research 2026 techniques to improve GNN LINK-PREDICTION and NODE-CLASSIFICATION on SPARSE, HETEROPHILOUS graphs with a SMALL labeled reference pool: H2GCN was tried (single-seed noise). What beyond GraphSAGE: H2GCN/GPRGNN/heterophily-aware, contrastive pretraining, active-learning for reference-pool growth, calibration. Focus on lifting AUROC past 0.78 + macro-F1 0.55 + Brier 0.15 with limited labels.

Return <=350 words of CONCRETE, CITED findings (URLs/paper names). Lead with the 2-3 highest-leverage actionable techniques. The current month is June 2026 -- prefer recent sources. End with a 'Sources:' list.

### Assistant | 2026-06-10T15:04:10.559Z

I'll research this directly since it's a focused technical question with current sources available.

### Assistant | 2026-06-10T15:04:11.813Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T15:04:12.014Z

[tool_use: WebSearch]

### User | 2026-06-10T15:04:32.102Z

[tool_result] Web search results for query: "heterophilous graph neural network link prediction 2026 small labeled set GPRGNN active learning"

I'll search for information on this topic for you.

Links: [{"title":"On the Impact of Feature Heterophily on Link Prediction with Graph Neural Networks | OpenReview","url":"https://openreview.net/forum?id=3LZHatxUa9"},{"title":"Link Prediction on Heterophilic Graphs vi
... [+4191 chars truncated]

### User | 2026-06-10T15:04:39.076Z

[tool_result] Web search results for query: "graph contrastive pretraining few labels node classification heterophily 2025 2026 AUROC"

I'll search for information on this topic.

Links: [{"title":"Homophily-aware Heterogeneous Graph Contrastive Learning","url":"https://arxiv.org/html/2501.08538v1"},{"title":"Relative contrastive pretraining of heterogeneous graph aware language model for zero-shot multi-label 
... [+6511 chars truncated]

### Assistant | 2026-06-10T15:04:46.699Z

Let me get more specifics on active learning and calibration for the small-pool problem.

### Assistant | 2026-06-10T15:04:47.544Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T15:04:47.892Z

[tool_use: WebSearch]

### User | 2026-06-10T15:05:27.493Z

[tool_result] Web search results for query: "GNN calibration Brier score temperature scaling graph neural network overconfident 2025 GATS"

I'll search for information about GNN calibration techniques, including temperature scaling and the GATS method.

Links: [{"title":"[2210.06391] What Makes Graph Neural Networks Miscalibrated?","url":"https://arxiv.org/abs/2210.06391"},{"title":"(PDF) GETS: Ensemble Tempera
... [+6502 chars truncated]

### User | 2026-06-10T15:05:46.534Z

[tool_result] Web search results for query: "active learning graph neural network node classification budget label efficiency 2025 GALClon uncertainty diversity"

I'll search for information on this topic for you.

Links: [{"title":"Active Learning for Graph Neural Networks via Node Feature Propagation","url":"https://grlearning.github.io/papers/46.pdf"},{"title":"Partition-Based Active Learning for Graph Neura
... [+10268 chars truncated]

### Assistant | 2026-06-10T15:06:10.451Z

I have enough concrete, cited material across heterophily-aware architectures, contrastive pretraining, active learning, and calibration. Synthesizing the highest-leverage findings.

---

For sparse/heterophilous graphs with a small reference pool, the literature converges on three high-leverage moves, in priority order:

**1. Active-learning the reference pool (biggest lever — you are label-starved, not architecture-starved).** Pure uncertainty sampling underperforms; combine uncertainty + diversity/class-balance. **GraphCBAL (2026)** uses RL to produce a class-balanced labeled set and beats SOTA on skewed-class problems — directly relevant since your 62-ghost holdout is tiny and imbalanced. **GALAXY (arXiv 2202.01402)** does "refined uncertainty sampling" that gathers far more class-balanced labels at extreme imbalance. For heterophily specifically, **SAG (arXiv 2308.08823)** adds pairwise dis/similarity to avoid querying nodes poisoned by hostile (inter-class) neighborhoods — exactly your failure mode. This grows the pool *and* fixes the `insufficient-reference-pool` deferral.

**2. Heterophily-aware encoder + learnable decoder for link prediction.** "On the Impact of Feature Heterophily on LP with GNNs" (arXiv 2409.17475) shows LP under heterophily needs **separated node embeddings + a learnable decoder** (not dot-product). GPR-GNN is a validated heterophilic-LP baseline ("LP on Heterophilic Graphs via Disentangled Representation Learning," arXiv 2208.01820); **GRAFF-LP** (arXiv 2402.14802) is a physics-inspired LP model purpose-built for heterophily. Prefer these over single-seed H2GCN — and per your own doctrine, require ≥3 seeds before any AUROC claim.

**3. Heterophily-aware contrastive pretraining for label efficiency.** **PolyGCL (ICLR 2024)** and **HeterGCL (IJCAI 2024)** use combined low+high-pass encoders; **HGMS (arXiv 2501.08538)** reports Macro-F1 + AUC at 20/40/60 labels-per-class — the regime you're in. Pretrain unsupervised on the full 676MB graph
... [+1064 chars truncated]
