---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "You are synthesizing an actionable improvement plan for PRISM's AI-systems (slot"
date: "2026-06-10"
first_ts: "2026-06-10T15:06:47.749Z"
last_ts: "2026-06-10T15:09:10.707Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a1a89f7be325e868e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are synthesizing an actionable improvement plan for PRISM's AI-systems (slot

> **claude-code-cli** | 2026-06-10 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a1a89f7be325e868e.jsonl`

## Transcript

### User | 2026-06-10T15:06:47.749Z

You are synthesizing an actionable improvement plan for PRISM's AI-systems (slot:india domain). Target hardware: RTX PRO 6000 Blackwell 96GB VRAM + Ryzen 9950X3D 32T + 136GB RAM + NVMe. Single-GPU large-VRAM box. Local LLMs via Ollama (qwen2.5-coder:32b heavy, gpt-oss:120b deep ~64GB, gpt-oss:20b mid, :1.5b trivial).

## What PRISM already has (survey):
PRISM's AI-systems doctrine baseline (from `prism-methodology-foundations.md` + `ai-training_synthesis.md`):

**LoRA** — External method grounded in Hu et al. 2021 (arXiv:2106.09685): freeze pretrained weights, inject per-layer low-rank matrices. PRISM mechanisms: `vault-to-lora-dataset.mjs` converts vault doctrine memories into Alpaca-style training triples (cross-galaxy source mode aggregates tagged pairs across all 34 galaxies); `reference_vault_to_ai_feeders_2026_06_09`. Doctrine: every domain owns/maintains its own self-improving AI-training stack cloned from India's reference galaxy (`feedback_domains_own_ai_training_systems`). Open thread: 3 unassigned LoRA orphans from India's audit.

**RAG** — Grounded in Lewis et al. 2020 (arXiv:2005.11401): parametric seq2seq + non-parametric dense-vector retrieved passages. PRISM mechanism: RAG-HYBRID path = dense embeddings via Qdrant + memory/wiki/tribal sidecars (`nomic-embed-text` 768-d).

**CAG** — Grounded in Chan et al. 2024 (arXiv:2412.15605): preload knowledge into extended context, cache KV state, no real-time retrieval. PRISM mechanism: `scripts/lib/cag-router.mjs` ([[cag-router]]) classifies queries COLD/HOT/HYBRID; COLD served from ~92 KB static-doctrine prompt-cache (`cache_control: ephemeral`).

**GNN/NN** — Not covered in these two files (the methodology file omits it; the synthesis file is LoRA/synthesis-focused). GNN tier-5 doctrine lives elsewhere (CLAUDE.md §NN-GRAPH).

**Autonomous/agentic loops** — `[[agent-loop-design-rules]]` (6 rules: CLOSED-loop by default, EVAL-GATE every iteration, each pass feeds the next, self-correct, orchestrator/specialist
... [+21868 chars truncated]

### Assistant | 2026-06-10T15:06:56.381Z

I'll synthesize this rigorously. Let me first verify a few of the cited PRISM paths actually exist before I commit to recommendations referencing them, since the task demands honesty about real vs. invented files.

### Assistant | 2026-06-10T15:06:59.241Z

[tool_use: Bash]

### Assistant | 2026-06-10T15:07:01.086Z

[tool_use: Bash]

### Assistant | 2026-06-10T15:07:03.884Z

[tool_use: Bash]

### User | 2026-06-10T15:07:05.276Z

[tool_result] ls: cannot access 'scripts/nn-graph-eval.mjs': No such file or directory
scripts/assemble-fleet-lora-corpus.mjs*
scripts/audit-galaxy-ai-coverage.mjs*
scripts/lib/cag-router.mjs
scripts/lib/galaxy-mining-registry.mjs
scripts/lib/graph-node-embedding-bridge.mjs*
scripts/lib/graphsage-train-pipeline.mjs*
scripts/lib/graphsage-trainer.mjs*
scripts/mine-galaxy-transcripts.mjs*
scripts/nn-graph-retrain
... [+50 chars truncated]

### User | 2026-06-10T15:07:07.927Z

[tool_result] ls: cannot access 'scripts/ai-upgrade-broadcast.mjs': No such file or directory
scripts/ask-ollama.mjs*
scripts/galaxy-reflection-synthesis.mjs*
scripts/lib/ollama-vision-extract-lib.mjs
scripts/ollama-offload-dashboard.mjs*
scripts/vault-to-gnn-refpool.mjs*

### User | 2026-06-10T15:07:11.776Z

[tool_result] .claude/helpers/loop-state.mjs*
.claude/hooks/loop-iteration-inject.mjs*
.claude/hooks/memory-relevance-inject.mjs*
.claude/hooks/tribal-by-domain-inject.mjs*
.claude/scripts/tribal-rerank.mjs*
scripts/lib/load-tribal-index.mjs*

### Assistant | 2026-06-10T15:07:19.722Z

Most paths verified. Two cited paths are wrong: `scripts/nn-graph-eval.mjs` and `scripts/ai-upgrade-broadcast.mjs` don't exist at those locations. Let me find their real locations before citing them.

### Assistant | 2026-06-10T15:07:21.083Z

[tool_use: Bash]

### Assistant | 2026-06-10T15:07:22.139Z

[tool_use: Bash]

### User | 2026-06-10T15:07:29.387Z

[tool_result] scripts/lib/nn-graph-eval.mjs
scripts/lib/nn-graph-eval.test.mjs
scripts/nn-graph-calibration-analysis.mjs
scripts/nn-graph-calibration-analysis.test.mjs

### User | 2026-06-10T15:07:58.151Z

[tool_result] ./scripts/lib/nn-graph-eval.mjs
./scripts/lib/nn-graph-eval.test.mjs

### Assistant | 2026-06-10T15:09:10.707Z

`nn-graph-eval.mjs` is at `scripts/lib/nn-graph-eval.mjs`. `ai-upgrade-broadcast.mjs` does not exist anywhere in the repo — the survey's reference to it is unverified, so I will not cite it as a real file. I have what I need.

# Top 8 AI-Systems Improvements — PRISM (slot:india), Blackwell box

Ranked by ROI. Path-honesty notes inline. Verified-present paths cited; unverified ones flagged. `ai-upgrade-broadcast.mjs` from the survey does NOT exist in the repo (searched fleet-wide) — I do not build on it.

---

## 1. [TOP-PICK] Stage a hybrid BM25+dense → RRF → cross-encoder rerank in front of the dense-only RAG path
- **Mechanism:** RAG
- **Files to change/create:** the RAG-HYBRID retrieval path currently reranks dense-only via the tribal reranker `.claude/scripts/tribal-rerank.mjs` (verified) over the sidecars read by `scripts/lib/load-tribal-index.mjs` (verified). Add a `scripts/lib/rrf-fuse.mjs` (new) that fuses a BM25 lexical pass with the existing dense pass on **ranks (Reciprocal Rank Fusion), not raw scores**, then cross-encoder reranks top-K. Wire into `tribal-rerank.mjs` and the four recall injectors (`memory-relevance-inject.mjs`, `tribal-by-domain-inject.mjs` — both verified).
- **ROI / effort:** High / M
- **GPU/operator:** Runnable NOW (CPU BM25 + existing embeddings; cross-encoder optional on GPU).
- **Blackwell-relevance:** Low for the lever itself (it's a recall-quality fix), but the optional cross-encoder rerank step runs free on the 96GB card.
- **Why #1:** Dense-only retrieval systematically misses rare tokens — exactly the SKUs, E-codes (E952/E56xx), G-codes, error/alarm codes, part numbers that dominate PRISM's manufacturing corpus. BM25 nails those; literature shows hybrid lifts DPR recall 48.7→53.4%, nDCG@10 43.4→52.6. This is the single highest-ROI runnable-now code change because it improves *every* recall injector that already fires on every prompt across all 26 slots, with zero data-block and no operator dependency.

---

## 2. Per-query CA
... [+8786 chars truncated]
