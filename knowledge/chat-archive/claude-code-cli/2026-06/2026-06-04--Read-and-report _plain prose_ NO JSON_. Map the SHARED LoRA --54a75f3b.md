---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Read-and-report (plain prose, NO JSON). Map the SHARED LoRA TRAINING PIPELINE in"
date: "2026-06-04"
first_ts: "2026-06-04T17:55:24.448Z"
last_ts: "2026-06-04T17:59:40.366Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-a631d6c157935df4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Read-and-report (plain prose, NO JSON). Map the SHARED LoRA TRAINING PIPELINE in

> **claude-code-cli** | 2026-06-04 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-a631d6c157935df4e.jsonl`

## Transcript

### User | 2026-06-04T17:55:24.448Z

Read-and-report (plain prose, NO JSON). Map the SHARED LoRA TRAINING PIPELINE in H:/prism and the canonical per-domain pattern.
Read FULLY: scripts/lib/lora-training-pipeline.mjs, scripts/lib/py-subprocess-bridge.mjs. Then read mcp-server/src/engines/LatheLoRADatasetBuilderEngine.ts + LatheLoRATrainingScriptEngine.ts + LatheLoRATrainingMonitorEngine.ts as the EXEMPLAR per-domain quartet.
REPORT EXACTLY:
1. lora-training-pipeline.mjs: what is its public API (functions), what does it orchestrate, does it actually invoke a python trainer via py-subprocess-bridge or is it scaffolding? What dataset format does it consume?
2. py-subprocess-bridge.mjs: how does Node launch a python training script (args, cwd, env, GPU)? Is it real + tested?
3. The Lathe quartet: what is the canonical recipe to ADD A NEW DOMAIN LoRA (dataset-builder -> training-script -> monitor -> cadence)? What would a blueprint-vision equivalent need? Are these engines real or stubs?
4. Is the Lathe/domain LoRA a TEXT/sequence LoRA (G-code/params) or could the pattern carry a VISION LoRA (image->text)? Note the difference.
Concrete, with file:line + verbatim function names. Flag stubs.

### Assistant | 2026-06-04T17:56:00.464Z

I'll read the four files fully, plus the two Lathe quartet engines mentioned (note: the task lists 3 Lathe engines as the "quartet" — I'll find the 4th too).

### Assistant | 2026-06-04T17:56:00.662Z

[tool_use: Read]

### Assistant | 2026-06-04T17:56:00.708Z

[tool_use: Read]

### User | 2026-06-04T17:56:31.156Z

[tool_result] 1	// scripts/lib/lora-training-pipeline.mjs
2	//
3	// LoRATrainingPipelineEngine — generic LoRA fine-tune pipeline.
4	//
5	// PURPOSE
6	// PRISM today has 67 LoRA engines forked across domains:
7	//   - 50 LatheLoRA*   (LatheLoRACadenceEngine, LatheLoRADatasetBuilderEngine,
8	//                       LatheLoRAEnsembleOrchestratorEngine, LatheLoRA-
9	//                       HyperparameterOptimizer
... [+21839 chars truncated]

### User | 2026-06-04T17:56:31.169Z

[tool_result] 1	/**
2	 * py-subprocess-bridge.mjs — BLACKWELL-AI-MS0 / U-PY-BRIDGE-LIB
3	 *
4	 * The ONE canonical Node->Python spawn primitive for the Blackwell training
5	 * stack. Every GPU job that Node orchestrates but Python executes — the GNN
6	 * GATv2/H2GCN retrain, QLoRA fine-tunes, the full-corpus GPU embedder, the
7	 * Bradley-Terry reward model — spawns its Python through this bridge so the
8	 * co
... [+17831 chars truncated]

### Assistant | 2026-06-04T17:56:44.481Z

Now the Lathe quartet. Let me locate them and read them.

### Assistant | 2026-06-04T17:56:44.797Z

[tool_use: Glob]

### User | 2026-06-04T17:57:14.544Z

[tool_result] mcp-server\src\engines\LatheLoRACadenceEngine.ts
mcp-server\src\engines\LatheLoRAPipelineEngine.ts
mcp-server\src\engines\LatheLoRATrainingScriptEngine.ts
mcp-server\src\engines\LatheLoRAProgramParserEngine.ts
mcp-server\src\engines\LatheLoRAExampleGeneratorEngine.ts
mcp-server\src\engines\LatheLoRADatasetValidatorEngine.ts
mcp-server\src\engines\LatheLoRAHyperparameterOptimizerEngine.ts
mcp-serve
... [+2400 chars truncated]

### Assistant | 2026-06-04T17:57:19.583Z

The task names three specific engines as the exemplar quartet. Let me read those three plus the cadence engine (the 4th of the dataset-builder → training-script → monitor → cadence recipe).

### Assistant | 2026-06-04T17:57:20.552Z

[tool_use: Read]

### Assistant | 2026-06-04T17:57:20.637Z

[tool_use: Read]

### User | 2026-06-04T17:57:28.945Z

[tool_result] 1	/**
2	 * LatheLoRADatasetBuilderEngine — LATHE-LORA-MS0 U-LLR05
3	 * ======================================================
4	 *
5	 * Builds training datasets for LatheLoRA fine-tuning from JM Die program archive.
6	 * Converts raw Okuma .MIN programs into instruction-tuning format suitable for
7	 * Unsloth/PEFT LoRA training.
8	 *
9	 * Pipeline:
10	 *   1. Scan JM DIE archive (5,297 .MIN lathe 
... [+25205 chars truncated]

### User | 2026-06-04T17:57:29.012Z

[tool_result] 1	/**
2	 * LatheLoRATrainingScriptEngine — Training Script Generator
3	 *
4	 * U-LLR03: Generates Python training scripts for LoRA/QLoRA fine-tuning
5	 * of local LLMs on JM Die lathe programs. Targets Unsloth/PEFT workflow.
6	 *
7	 * Ported from prism-lathe-master for PRISM integration.
8	 *
9	 * @module engines/LatheLoRATrainingScriptEngine
10	 */
11	
12	// ======================================
... [+16072 chars truncated]

### Assistant | 2026-06-04T17:57:36.420Z

Now the monitor and cadence engines.

### Assistant | 2026-06-04T17:57:37.470Z

[tool_use: Read]

### Assistant | 2026-06-04T17:57:37.740Z

[tool_use: Read]

### User | 2026-06-04T17:57:48.117Z

[tool_result] 1	/**
2	 * LatheLoRATrainingMonitorEngine — LATHE-LORA-MS0 U-LLR12
3	 * =======================================================
4	 *
5	 * Monitors LatheLoRA training progress with real-time metrics,
6	 * early stopping detection, and checkpoint management.
7	 *
8	 * Features:
9	 *   - Loss tracking (train/eval)
10	 *   - Learning rate scheduling visualization
11	 *   - Gradient norm monitoring
12	
... [+13786 chars truncated]

### User | 2026-06-04T17:57:48.793Z

[tool_result] 1	/**
2	 * LatheLoRACadenceEngine — Training Cadence Scheduler
3	 *
4	 * U-LLR01: Manages training schedules, automatic retraining triggers,
5	 * and model versioning for LatheLoRA fine-tuning.
6	 *
7	 * Ported from prism-lathe-master for PRISM integration.
8	 *
9	 * @module engines/LatheLoRACadenceEngine
10	 */
11	
12	// ============================================================================
... [+15435 chars truncated]

### Assistant | 2026-06-04T17:59:40.366Z

I have read all five files fully (the task named three Lathe engines; I added the cadence engine to complete the dataset-builder → training-script → monitor → cadence quartet). Here is the report.

---

# SHARED LoRA TRAINING PIPELINE — Map & Per-Domain Pattern

## 1. `scripts/lib/lora-training-pipeline.mjs` — the shared collapse library

**Public API (verbatim function names, all `export`ed):**
- `validateAdapter(adapter, domain)` — `:81`. Throws if the adapter is missing any of the 4 contract methods or if `domainTag()` ≠ `domain`.
- `buildDataset(corpus, adapter, opts)` — `:123`. STAGE 1. Validates + feature-extracts each raw example via the adapter, splits train/holdout, throws if `< minExamples` (default 10).
- `hyperparameterGrid(searchSpace)` — `:176`. STAGE 2. Cartesian product over `{rank, alpha, dropout, lr}`. Grid only — Bayesian is explicitly a "follow-up unit" (`:171`).
- `trainOnce(params)` — `:220` (async). STAGE 3 HARNESS.
- `ensembleVote(trainedAdapters, domainAdapter, opts)` — `:289`. STAGE 4. Top-k by loss → `domainAdapter.mergeAdapters()`.
- `deployGate(params)` — `:324`. STAGE 5. Safety floor (`S(x) ≥ 0.95`) + drift floor gates.
- `createLoRATrainingPipeline({ domain, adapter })` — `:366`. Factory binding domain+adapter, returns the 5 stages plus `runFullPipeline({corpus, innerTrain, options})` (`:383`).
- Constants/exports: `PIPELINE_VERSION = "1.0.0"` (`:51`), `latheAdapterStub` (`:430`), `millAdapterStub` (`:470`), `wedmAdapterStub` (`:504`).

**What it orchestrates:** the 5 documented pipeline stages (dataset-build → hyperparameter-opt → train → ensemble-vote → deploy) that the file's own header says were copy-forked across "67 LoRA engines" (`:6`). It is a **deduplication/collapse foundation** — its purpose is to give those 67 engines one shared pipeline.

**Does it actually invoke a Python trainer via `py-subprocess-bridge`? NO — it does not import or reference the bridge at all.** This is the load-bearing finding:
- `trainOnce` is a **har
... [+14851 chars truncated]
