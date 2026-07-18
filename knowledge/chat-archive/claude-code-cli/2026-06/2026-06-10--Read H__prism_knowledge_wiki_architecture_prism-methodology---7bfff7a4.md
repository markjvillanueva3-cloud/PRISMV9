---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Read H:/prism/knowledge/wiki/architecture/prism-methodology-foundations.md and H"
date: "2026-06-10"
first_ts: "2026-06-10T15:02:31.718Z"
last_ts: "2026-06-10T15:03:15.775Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a309f1386957d9ae6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Read H:/prism/knowledge/wiki/architecture/prism-methodology-foundations.md and H

> **claude-code-cli** | 2026-06-10 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a309f1386957d9ae6.jsonl`

## Transcript

### User | 2026-06-10T15:02:31.718Z

Read H:/prism/knowledge/wiki/architecture/prism-methodology-foundations.md and H:/prism/knowledge/memories/patterns/ai-training_synthesis.md. Summarize, in <=400 words, what PRISM's AI-systems DOCTRINE already covers across: LoRA, RAG, CAG, GNN/NN, autonomous/agentic loops, harnesses, self-improving/self-learning, Obsidian-brain. List the named mechanisms/files it already has. Be concrete (cite file paths / engine names you see). This is the 'what we already have' baseline.

### Assistant | 2026-06-10T15:02:42.644Z

I'll read both files in parallel to build the baseline.

### Assistant | 2026-06-10T15:02:43.665Z

[tool_use: Read]

### Assistant | 2026-06-10T15:02:44.061Z

[tool_use: Read]

### User | 2026-06-10T15:02:45.328Z

[tool_result] 1	---
2	title: PRISM Methodology Foundations — how every galaxy should operate (loop discipline, the PSN brain, LoRA/RAG/CAG, agentic harnesses, Blackwell + Ollama tiering)
3	galaxy: cross-cutting
4	owner_slot: papa
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-methodology-build (2026-06-10)"
7	verification_method: external-systems (LoRA/RAG/CAG) WebFetch-confirmed against arXiv primary sources;
... [+11019 chars truncated]

### User | 2026-06-10T15:02:45.669Z

[tool_result] 1	---
2	name: ai-training_synthesis
3	description: "[auto-synth · verify] Compounding synthesis of the ai-training domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
4	metadata:
5	  type: patterns
6	  galaxy: ai-training
7	  synthesizedFrom: 24
8	  model: gpt-oss:120b
9	  synthesizedAt: 2026-06-10T13:59:5
... [+4060 chars truncated]

### Assistant | 2026-06-10T15:03:15.775Z

PRISM's AI-systems doctrine baseline (from `prism-methodology-foundations.md` + `ai-training_synthesis.md`):

**LoRA** — External method grounded in Hu et al. 2021 (arXiv:2106.09685): freeze pretrained weights, inject per-layer low-rank matrices. PRISM mechanisms: `vault-to-lora-dataset.mjs` converts vault doctrine memories into Alpaca-style training triples (cross-galaxy source mode aggregates tagged pairs across all 34 galaxies); `reference_vault_to_ai_feeders_2026_06_09`. Doctrine: every domain owns/maintains its own self-improving AI-training stack cloned from India's reference galaxy (`feedback_domains_own_ai_training_systems`). Open thread: 3 unassigned LoRA orphans from India's audit.

**RAG** — Grounded in Lewis et al. 2020 (arXiv:2005.11401): parametric seq2seq + non-parametric dense-vector retrieved passages. PRISM mechanism: RAG-HYBRID path = dense embeddings via Qdrant + memory/wiki/tribal sidecars (`nomic-embed-text` 768-d).

**CAG** — Grounded in Chan et al. 2024 (arXiv:2412.15605): preload knowledge into extended context, cache KV state, no real-time retrieval. PRISM mechanism: `scripts/lib/cag-router.mjs` ([[cag-router]]) classifies queries COLD/HOT/HYBRID; COLD served from ~92 KB static-doctrine prompt-cache (`cache_control: ephemeral`).

**GNN/NN** — Not covered in these two files (the methodology file omits it; the synthesis file is LoRA/synthesis-focused). GNN tier-5 doctrine lives elsewhere (CLAUDE.md §NN-GRAPH).

**Autonomous/agentic loops** — `[[agent-loop-design-rules]]` (6 rules: CLOSED-loop by default, EVAL-GATE every iteration, each pass feeds the next, self-correct, orchestrator/specialist/subagent split, budget-as-stop-condition). Auto-invoked via `.claude/hooks/loop-iteration-inject.mjs` (knob `PRISM_LOOP_RULES_DISABLE=1`). Outcome bus + loop-state + handoff RESUME carry state forward.

**Harnesses** — Agentic-harness pattern: orchestrator owns GOAL, specialists own steps, narrow subagents do bounded work, coordination is deterministic/
... [+1856 chars truncated]
