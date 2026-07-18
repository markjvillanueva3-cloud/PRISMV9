---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Read H:/prism/mcp-server/src/engines/ai-training/MEMORY.md and list H:/prism/mcp"
date: "2026-06-10"
first_ts: "2026-06-10T15:02:31.719Z"
last_ts: "2026-06-10T15:03:54.959Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a7da95606eb7cf1cf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Read H:/prism/mcp-server/src/engines/ai-training/MEMORY.md and list H:/prism/mcp

> **claude-code-cli** | 2026-06-10 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a7da95606eb7cf1cf.jsonl`

## Transcript

### User | 2026-06-10T15:02:31.719Z

Read H:/prism/mcp-server/src/engines/ai-training/MEMORY.md and list H:/prism/mcp-server/src/engines/ai-training/ (Glob *.ts, count). Summarize in <=400 words: what AI-training engines/pipelines PRISM has BUILT, what is DORMANT or DATA-BLOCKED (esp the GraphSAGE GNN tier-5: AUROC 0.808 selective-deploy @tau=0.7 but full-coverage blocked on reference-pool growth; macro-F1/Brier below gate). Also note the just-built vault->LoRA pipeline (scripts/vault-to-lora-dataset.mjs --source feedback|galaxy, assemble-fleet-lora-corpus.mjs, audit-galaxy-ai-coverage.mjs). This is the 'current build state'.

### Assistant | 2026-06-10T15:02:41.742Z

I'll read the MEMORY.md file and enumerate the TypeScript files in the ai-training engine directory.

### Assistant | 2026-06-10T15:02:42.267Z

[tool_use: Read]

### Assistant | 2026-06-10T15:02:42.609Z

[tool_use: Glob]

### User | 2026-06-10T15:02:43.862Z

[tool_result] No files found

### User | 2026-06-10T15:02:44.142Z

[tool_result] 1	# INDIA Galaxy Memory — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
2	
3	Append-only cross-session memory for the india slot.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
7	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowl
... [+12340 chars truncated]

### Assistant | 2026-06-10T15:02:54.777Z

The Glob returned no files at that exact path. Let me verify the directory structure.

### Assistant | 2026-06-10T15:02:56.415Z

[tool_use: Bash]

### Assistant | 2026-06-10T15:02:58.383Z

[tool_use: Bash]

### User | 2026-06-10T15:03:03.267Z

[tool_result] total 1328
drwxr-xr-x 1 wompu 197611     0 Jun  9 21:50 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 08:13 ../
-rw-r--r-- 1 wompu 197611  9325 Jun  9 20:57 CLAUDE.md
-rw-r--r-- 1 wompu 197611 12602 Jun  9 21:50 MEMORY.md
-rw-r--r-- 1 wompu 197611 15610 Jun  4 12:44 PATHS.md
-rw-r--r-- 1 wompu 197611  3850 May 29 12:26 TOOLBELT.md
---TS-COUNT---
1

### User | 2026-06-10T15:03:05.365Z

[tool_result] assemble-fleet-lora-corpus.mjs*
assemble-fleet-lora-corpus.test.mjs
audit-galaxy-ai-coverage.mjs*
audit-galaxy-ai-coverage.test.mjs
vault-to-lora-dataset.mjs*
vault-to-lora-dataset.test.mjs
---
H:/prism/scripts/assemble-fleet-lora-corpus.mjs*
H:/prism/scripts/audit-galaxy-ai-coverage.mjs*
H:/prism/scripts/vault-to-lora-dataset.mjs*

### Assistant | 2026-06-10T15:03:17.717Z

The `ai-training/` directory holds only ONE `.ts` file — the actual engines live under `src/engines/` (flat) and sibling subdirs. The directory itself is a galaxy-brain doc folder (CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md), not where the `.ts` engines sit. Let me find the real engine `.ts` and confirm the three new scripts are real (not stubs).

### Assistant | 2026-06-10T15:03:20.008Z

[tool_use: Bash]

### User | 2026-06-10T15:03:28.527Z

[tool_result] ===.ts in ai-training/===
===LoRA/NN engines in flat engines dir (count)===
193
===sizes of the 3 new scripts===
11077 H:/prism/scripts/assemble-fleet-lora-corpus.mjs*
4602 H:/prism/scripts/audit-galaxy-ai-coverage.mjs*
20205 H:/prism/scripts/vault-to-lora-dataset.mjs*

### Assistant | 2026-06-10T15:03:54.959Z

# AI-Training Galaxy — Current Build State (INDIA slot)

**Directory `mcp-server/src/engines/ai-training/`**: NOT a `.ts` engine folder — it is a galaxy-brain doc node holding 4 files only (`CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`). `Glob *.ts` = 0 matches; `find` confirms 0 `.ts` here. The actual engines live flat in `mcp-server/src/engines/` (193 files match LoRA/Neural/MetaLearn/DeepReason/Evolutionary/OutcomeFeedback/Cognitive/CrossProcess) plus sibling RAG subdirs (`blueprint-rag/`, `cad-corpus/`, `tribal-knowledge/`, `mit-curriculum/`, `pdf-corpus/`).

## BUILT
- **GraphSAGE GNN tier-5** (`scripts/lib/graphsage-{trainer,predictor,train-pipeline,checkpoint,model}.mjs`) — 5th tier of the wiring-inference cascade; classifies UNKNOWN `ghost.unwired-engine` nodes to a dispatcher. Research-shipped MS0/MS1/MS2.
- **Autonomous retrain lifecycle** (`scripts/nn-graph-retrain-lifecycle.mjs`) — 6h-cadence scheduled task (S4U); promotes candidate→live IFF deploy-gate clears; never promotes deferred candidates. GNN node-embedding bridge wired as a pre-retrain stage.
- **LoRA + adapter layer** — per-domain `LatheLoRA*`, `MillLoRA*`, cross-domain `LoRAAdapter*` engines + cadence/drift/deployment/monitoring orchestration (~95 LoRA engines per memory).
- **RAG layer** — blueprint/CAD/tribal/MIT-OCW/PDF corpora with source-fingerprint invalidation.
- **Deep reasoning + ML + self-improvement** — `CrossProcessNeuralLearningEngine`, `MetaLearningOptimizerEngine` (2848-outcome threshold), `DeepReasoning*`, `Evolutionary/AdaptiveThreshold/OutcomeFeedbackBus`. ML algorithm primitives wired via `prism_algorithm` (attention/transformer/lowrank/PCA/kNN/GMM/Viterbi/H2GCN-heterophily).
- **Model routing oracle** — `OllamaCapabilityProbeEngine` (runnable-model authority, live-validated 2026-06-08); octopus `MultiModelConsensusEngine.ask()` consults it.

## DORMANT / DATA-BLOCKED
- **GNN full-coverage deploy = BLOCKED.** Live 62-ghost holdout (2026-06-06, direct-embed): **AUROC 0.
... [+1175 chars truncated]
