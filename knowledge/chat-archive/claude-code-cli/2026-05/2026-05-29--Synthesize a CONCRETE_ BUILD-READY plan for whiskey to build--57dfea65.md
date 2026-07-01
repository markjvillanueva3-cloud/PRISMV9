---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Synthesize a CONCRETE, BUILD-READY plan for whiskey to build the lathe domain's "
date: "2026-05-29"
first_ts: "2026-05-29T16:54:34.935Z"
last_ts: "2026-05-29T16:57:21.755Z"
cwd: "H:\\prism-slot-whiskey"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_efe40eea-99a/agent-a8b1ccdebb8cae0e2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:14"
---

# Synthesize a CONCRETE, BUILD-READY plan for whiskey to build the lathe domain's 

> **claude-code-cli** | 2026-05-29 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-whiskey
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_efe40eea-99a/agent-a8b1ccdebb8cae0e2.jsonl`

## Transcript

### User | 2026-05-29T16:54:34.935Z

Synthesize a CONCRETE, BUILD-READY plan for whiskey to build the lathe domain's self-improving AI system, templated on india. You have three inputs.

== INDIA TEMPLATE (the blueprint to clone) ==
I have the complete picture. Here is the canonical blueprint.

---

# CANONICAL SELF-IMPROVING-AI TEMPLATE (extracted from india/ai-training)
## The blueprint whiskey clones for lathe

### LOOP TOPOLOGY (the closed cycle)
```
[1] EXTRACT → [2] FEATURIZE → [3] EXPERIENCE-LEDGER → [4] FEEDBACK-BUS (pub/sub)
        ↑                              │                       │
        │                             publish "outcome.recorded"/"outcome.completed"
        │                              ▼                       ▼
 [10] CONTINUAL-LEARN ← [9] DRIFT/RETRAIN-LIFECYCLE   [5] TRAIN (auto-train tick on threshold)
        │                              ↑                       │
        │                       runAssessment gate             ▼
        └──── promote IFF gates clear ←─ [8] MODEL-SELECT ← [6] INFERENCE → [7] UNCERTAINTY/CALIBRATION
                                                                            │
                                          outcome.recorded ←── operator/physics outcome ──┘  (closes to [3])
```
The bus is the **single primitive that turns a forest of engines into a graph** (FeedbackBusEngine docstring). Outcome → ledger → bus → auto-train → inference → new outcome → ledger. That cycle is the whole product.

---

### LAYERS + INDIA ENGINE(S) + KEY SIGNATURES

**L1 — Knowledge extraction / corpus** (RAG inputs)
- `engines/blueprint-rag/`, `cad-corpus/`, `tribal-knowledge/`, `mit-curriculum/`, `pdf-corpus/`. Feature side: `WikiRAGFeatureEngine` (`RAG_FEATURE_DIM`), `PhysicsFeatureExtractorEngine` (`PHYSICS_FEATURE_DIM`).

**L2 — Featurize** (record → fixed vector)
- `CrossProcessNeuralLearningEngine.featurize(record: OutcomeRecord): Float64Array` — 32-dim: numeric log1p-normalized + one-hot bridge/process + string-hash buckets (material/tool/mac
... [+36807 chars truncated]

### Assistant | 2026-05-29T16:54:53.541Z

I'll synthesize the build-ready plan. Let me verify the load-bearing claims against the actual codebase before producing the spec, since several details (physics constants, existing engine names, dispatcher action surface) are load-bearing.

### Assistant | 2026-05-29T16:54:57.908Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:54:57.917Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:54:59.269Z

[tool_use: Bash]

### User | 2026-05-29T16:55:10.302Z

[tool_result] mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts  65.6K
mcp-server/src/engines/CrossProcessOutcomeStore.ts  32.3K
mcp-server/src/engines/FeedbackBusEngine.ts  7.8K
mcp-server/src/engines/LatheLoRAContinualLearningEngine.ts  13.4K
mcp-server/src/engines/LatheLoRAMasterOrchestratorEngine.ts  9.6K
scripts/lib/nn-graph-eval.mjs  23.3K
scripts/nn-graph-retrain-lifecycle.mjs  34.1K

### User | 2026-05-29T16:55:10.983Z

[tool_result] 34:export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
57:export const CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }> = {

### User | 2026-05-29T16:55:16.205Z

[tool_result] ---DUP-CHECK-DONE---

### Assistant | 2026-05-29T16:55:21.925Z

All template files confirmed, both physics constants exported, and none of the 8 proposed engines exist by exact name. Let me confirm the near-dup siblings and the dispatcher surface that the specs delegate to.

### Assistant | 2026-05-29T16:55:24.789Z

[tool_use: Bash]

### User | 2026-05-29T16:55:47.626Z

[tool_result] Exit code 1
LatheKnowledgeGraphEngine.ts  87.8K
LatheLoRACadenceOrchestratorEngine.ts  13.4K
LatheLoRADatasetBuilderEngine.ts  23.0K
LatheLoRADriftDetectorEngine.ts  12.7K
LatheLoRAEmbeddingCacheEngine.ts  8.3K
LatheLoRAEnsembleCombinerEngine.ts  9.3K
LatheLoRAEnsembleOrchestratorEngine.ts  9.8K
LatheLoRAEnsembleVoterEngine.ts  10.2K
LatheLoRAExperimentTrackerEngine.ts  9.0K
LatheLoRAHyperparamete
... [+347 chars truncated]

### Assistant | 2026-05-29T16:57:21.755Z

All near-dup siblings confirmed present, turning dispatcher confirmed at 227KB, and zero `lora_ai_*` actions exist yet (clean namespace). The exit-1 is just grep returning 0 matches on the last command. Every load-bearing claim is verified. Producing the plan.

```markdown
# LATHE-SELFIMPROVE-AI-PLAN
**Slot:** whiskey · **Milestone:** `LATHE-LORA-MS0` · **Template:** india/ai-training · **Status:** build-ready
**Verified 2026-05-29:** all template files-of-record present · `CANONICAL_KIENZLE` (L34) + `CANONICAL_TAYLOR` (L57) exported in `physics/constants.ts` · all 8 target engines ABSENT by exact name · all near-dup siblings present on disk · `turningDispatcher.ts` (227KB) owns the lathe surface with **0** existing `lora_ai_*` actions (clean namespace).

> **Whiskey's job is wiring + 8 fusion/feedback engines, not rebuilding the layers.** The ~65-engine lathe LoRA stack is the most complete instantiation of india's template already on disk and already wired through `prism_turning`. The closed loop is ~90% built; the missing links are an **outcome-feedback backbone**, a **context/RAG layer**, and the **fusion/selection/meta composition tier** that ties the existing engines into one self-improving cycle.

---

## 1. Loop coverage map — the full closed loop, link by link

| india layer | Lathe engine covering it | Status |
|---|---|---|
| **L1 — Knowledge extraction / corpus** | ProgramParser, ProgramMiner, TribalExtractor, TribalAugmentation, KnowledgeCurator, KnowledgeGraph (6 engines) | **BUILT + WIRED** |
| **L1+ — Multi-source training-record harvest** | **#1 `LatheLoRAKnowledgeExtractorEngine`** (NEW — normalizes corpus+tribal+outcomes → `LatheTrainingRecord[]`) | **TO-BUILD** |
| **L2 — Featurize (record → vector)** | `LatheLoRADatasetBuilderEngine` (.MIN → SFT instruction format) | **BUILT + WIRED** |
| **L3 — Experience ledger (append-only outcomes)** | **#2 `LatheLoRAExperienceLedgerEngine`** (NEW — machining outcomes, not training-run metrics). Reuses `cros
... [+15682 chars truncated]
