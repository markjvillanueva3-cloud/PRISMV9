---
type: "chat-session"
source: "claude-code-cli"
session_id: "343f018c-806c-4453-91b4-a7a41a07ed4a"
title: "Read-only investigation for PRISM. Cwd H:\\prism. Return COMPACT findings with fi"
date: "2026-06-19"
first_ts: "2026-06-19T19:54:22.992Z"
last_ts: "2026-06-19T19:57:39.559Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 23
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-ac741de8233922ca4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Read-only investigation for PRISM. Cwd H:\prism. Return COMPACT findings with fi

> **claude-code-cli** | 2026-06-19 | 52 msgs (23 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-ac741de8233922ca4.jsonl`

## Transcript

### User | 2026-06-19T19:54:22.992Z

Read-only investigation for PRISM. Cwd H:\prism. Return COMPACT findings with file:line, NOT dumps.

GOAL: Document the exact contract of the shared LoRA trainer so I can wire a generic dataset->trainer backbone.

Answer:
1. `scripts/fleet_lora_train.py`: What CLI args does it take (--dataset, --out, --base-model, etc.)? What INPUT dataset FORMAT does it expect (jsonl? key names? Alpaca {instruction,input,output}? chat format?)? Where does it write the adapter? Cite line numbers. Read the argparse / main().
2. Does it actually run, or is it gated/blocked? Read memories `reference_fleet_lora_trainer_gpu_blocked_2026_06_11` and `reference_zulu_fleet_lora_train_2026_06_11` (under knowledge/memories/reference/ or C:\Users\wompu\.claude\projects\H--prism\memory\) and summarize: is the GPU/torch stack live now (operator says Blackwell RTX PRO 6000, torch on a 3.13 venv) or does it need uv/python 3.11-3.12? What is the CURRENT runnable status?
3. List per-domain LoRA dataset builders + trainers that exist: glob `mcp-server/src/engines/**/*LoRA*.ts` and `scripts/**/*lora*.{py,mjs}` and `scripts/**/*_train_lora.py`. For each, 1 line: is it a REAL builder/trainer or a SIMULATION STUB (grep for "simulate", "mock", "stub", "TODO", "not implemented")? Specifically classify `wedm_train_lora.py` and `LatheLoRADatasetBuilderEngine.ts`.
4. The LoRAExample interface (vault memory cites LatheLoRADatasetBuilderEngine.ts:36 `interface LoRAExample`): paste the exact field list + file:line.
5. Existing LoRA datasets on disk: glob `state/shared/lora/**` + report each file path + line count.

Use rtk bash. Cite file:line on every claim. Flag explicitly anything you could NOT verify.

### Assistant | 2026-06-19T19:54:27.376Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:54:27.786Z

[tool_use: Glob]

### Assistant | 2026-06-19T19:54:28.061Z

[tool_use: Glob]

### User | 2026-06-19T19:54:36.154Z

[tool_result] H:/prism/scripts/ai-training-awareness.mjs
H:/prism/scripts/ai-training-galaxy-audit.mjs
H:/prism/scripts/assemble-fleet-lora-corpus.mjs
H:/prism/scripts/assemble-fleet-lora-corpus.test.mjs
H:/prism/scripts/audit-closed-loop-training-coverage.mjs
H:/prism/scripts/audit-closed-loop-training-coverage.test.mjs
H:/prism/scripts/blueprint-ocr-training-loop.mjs
H:/prism/scripts/blueprint-trainset-curate
... [+2685 chars truncated]

### User | 2026-06-19T19:54:41.299Z

[tool_result] scripts\export-ledger-lora.mjs
scripts\__tests__\export-ledger-lora.test.mjs
scripts\lib\kip-lora-rotation.mjs
scripts\lib\kip-lora-rotation.test.mjs
scripts\kip-rotate-orphans-to-lora.mjs
scripts\kip-rotate-orphans-to-lora.test.mjs
scripts\lib\lora-training-pipeline.mjs
scripts\lib\lora-training-pipeline.test.mjs
scripts\lora-dataset-builder.test.mjs
scripts\lib\trainset-to-lora-pairs.mjs
scripts
... [+745 chars truncated]

### User | 2026-06-19T19:54:41.439Z

[tool_result] No files found

### Assistant | 2026-06-19T19:54:45.265Z

Let me read the key files in parallel.

### Assistant | 2026-06-19T19:54:45.722Z

[tool_use: Read]

### Assistant | 2026-06-19T19:54:46.456Z

[tool_use: Glob]

### Assistant | 2026-06-19T19:54:47.970Z

[tool_use: Bash]

### User | 2026-06-19T19:54:53.690Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	fleet_lora_train.py -- general LoRA (QLoRA) fine-tune for the fleet Alpaca corpus.
4	U-FLOR-FLEET-LORA-TRAINER (slot:tango 2026-06-11).
5	
6	CLOSES THE VERIFIED GAP: the fleet LoRA corpus
7	(state/shared/lora/fleet-lora-combined.jsonl, 1138 Alpaca rows of shape
8	{instruction, input, output, weight, source, advisory}) was trainingReady but had
9	NO real trainer. Th
... [+19078 chars truncated]

### User | 2026-06-19T19:55:00.440Z

[tool_result] feedback_agent_fanout_gate_on_fleet_load.md
feedback_auto_fix_and_blackwell_fleet_enforced.md
feedback_build_for_blackwell_hardware.md
feedback_fleet_design_10_chats.md
feedback_recurring_fleet_write_mistakes.md
feedback_sierra_graph_correctness_is_fleet_search.md
feedback_ultracode_fanout_local_gpu_not_claude.md
feedback_zulu_commit_own_slot_branch.md
feedback_zulu_master_orchestrator_free_roam.m
... [+588 chars truncated]

### User | 2026-06-19T19:55:03.268Z

[tool_result] mcp-server\src\engines\LatheLoRACadenceEngine.ts
mcp-server\src\engines\LatheLoRAPipelineEngine.ts
mcp-server\src\engines\LatheLoRATrainingScriptEngine.ts
mcp-server\src\engines\LatheLoRAProgramParserEngine.ts
mcp-server\src\engines\LatheLoRAExampleGeneratorEngine.ts
mcp-server\src\engines\LatheLoRADatasetValidatorEngine.ts
mcp-server\src\engines\LatheLoRAHyperparameterOptimizerEngine.ts
mcp-serve
... [+4782 chars truncated]

### Assistant | 2026-06-19T19:55:09.336Z

Now let me read the memory files and key TS files in parallel.

### Assistant | 2026-06-19T19:55:10.870Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:12.008Z

[tool_use: Read]

### Assistant | 2026-06-19T19:55:13.228Z

[tool_use: Bash]

### User | 2026-06-19T19:55:13.573Z

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
... [+2331 chars truncated]

### User | 2026-06-19T19:55:19.821Z

[tool_result] reference_blackwell_gpu_training_ready_2026_06_06.md
reference_fleet_lora_adapter_trained_2026_06_11.md
reference_fleet_lora_corpus_composition_2026_06_11.md
reference_fleet_lora_trainer_gpu_blocked_2026_06_11.md
reference_zulu_fleet_lora_train_2026_06_11.md
reference_zulu_fleet_precheck_2026_05_25.md
reference_zulu_fleet_survival_session_2026_06_18.md

### User | 2026-06-19T19:55:24.732Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T19:55:30.833Z

Now let me read the memory files and check the wedm_train_lora.py and dataset state in parallel.

### Assistant | 2026-06-19T19:55:31.974Z

[tool_use: Read]

### Assistant | 2026-06-19T19:55:32.374Z

[tool_use: Read]

### Assistant | 2026-06-19T19:55:33.126Z

[tool_use: Read]

### Assistant | 2026-06-19T19:55:33.617Z

[tool_use: Glob]

### User | 2026-06-19T19:55:37.561Z

[tool_result] <system-reminder>This memory is 8 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: reference_fleet_lora_trainer_gpu_blocked_2026_06_11
3	description: "Built AND EXECUTED the REAL fleet-corpus LoRA trainer scripts/fleet_lora_trai
... [+12407 chars truncated]

### User | 2026-06-19T19:55:38.006Z

[tool_result] <system-reminder>This memory is 7 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: zulu-fleet-lora-train-2026-06-11
3	description: "ACTUAL fleet QLoRA training executed on the Blackwell GPU (not emission, not simulation): script
... [+2963 chars truncated]

### User | 2026-06-19T19:55:38.072Z

[tool_result] <system-reminder>This memory is 13 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: reference_blackwell_gpu_training_ready_2026_06_06
3	description: "The Blackwell GPU training stack is LIVE (torch 2.11+cu128, qlora-ready) via H
... [+2953 chars truncated]

### User | 2026-06-19T19:55:44.459Z

[tool_result] state\shared\lora\galaxy-synthesis-lora-2026-06-10.jsonl
state\shared\lora\.bridge-sweep-result.json
state\shared\lora\adapters\fleet-smoke\checkpoint-4\README.md
state\shared\lora\adapters\fleet-smoke\checkpoint-4\adapter_model.safetensors
state\shared\lora\adapters\fleet-smoke\checkpoint-4\adapter_config.json
state\shared\lora\adapters\fleet-smoke\checkpoint-4\training_args.bin
state\shared\lora
... [+6618 chars truncated]

### Assistant | 2026-06-19T19:55:49.332Z

Now let me grab the wedm_train_lora.py stub check, the MillingLoRADatasetBuilderEngine stub check, and the lora dataset line counts in parallel.

### Assistant | 2026-06-19T19:55:51.344Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:52.855Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:55:54.132Z

[tool_use: Bash]

### User | 2026-06-19T19:55:55.124Z

[tool_result] No matches found

### User | 2026-06-19T19:55:58.753Z

[tool_result] 144:    print("  Epoch 1/3: loss=2.45")
145:    print("  Epoch 2/3: loss=1.82")
146:    print("  Epoch 3/3: loss=1.34")
228:    print(f"Final Loss: {metadata['final_loss']}")

### User | 2026-06-19T19:56:02.096Z

[tool_result]    3126 H:/prism/state/shared/lora/fleet-lora-combined.jsonl
    513 H:/prism/state/shared/lora/galaxy-synthesis-lora-2026-06-10.jsonl
     11 H:/prism/state/shared/lora/outcomes-dataset.jsonl
     13 H:/prism/state/shared/lora/domain/pdf-corpus-train.jsonl
   3663 total

### Assistant | 2026-06-19T19:56:04.665Z

Now let me get the wedm_train_lora.py lines around the fake losses, and check a few more dataset builders for stub markers.

### Assistant | 2026-06-19T19:56:05.438Z

[tool_use: Read]

### Assistant | 2026-06-19T19:56:06.175Z

[tool_use: Grep]

### User | 2026-06-19T19:56:07.015Z

[tool_result] 120	    print("WEDM LoRA TRAINING")
121	    print("="*60)
122	    print(f"Training samples: {len(training_data)}")
123	    print(f"Output directory: {output_dir}")
124	    print(f"Config: {config}")
125	
126	    # In production, this would be actual training code:
127	    # from transformers import AutoModelForCausalLM, AutoTokenizer
128	    # from peft import LoraConfig, get_peft_model, TaskType

... [+769 chars truncated]

### Assistant | 2026-06-19T19:56:07.220Z

[tool_use: Bash]

### User | 2026-06-19T19:56:07.978Z

[tool_result] No matches found

### User | 2026-06-19T19:56:12.722Z

[tool_result] _rslora-r32-train.log
adapters/
bridge-reasoning/
bridge-reasoning-combined.jsonl
cad-combined-training.jsonl
cad-dimension-dataset.jsonl
cad-fix-training-dataset.jsonl
cad-geometry-composition-dataset.jsonl
cad-ground-truth-dataset.jsonl
cad-knowledge-training-dataset.jsonl
domain/
fleet-lora-combined-capped.jsonl
fleet-lora-combined-capped.stats.json
fleet-lora-combined.jsonl
fleet-lora-combined
... [+506 chars truncated]

### Assistant | 2026-06-19T19:56:16.060Z

Now let me get the remaining lora dataset file line counts and check a few more builder stubs quickly.

### Assistant | 2026-06-19T19:56:19.821Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:56:21.827Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:56:22.583Z

[tool_use: Grep]

### User | 2026-06-19T19:56:23.359Z

[tool_result] No matches found

### User | 2026-06-19T19:56:24.211Z

[tool_result] 36:export interface LoRAExample {
52:export interface DatasetSplitConfig {
61:export interface DatasetStats {
78:export interface DatasetBuildResult {
89:export type InstructionType =
148:class LatheLoRADatasetBuilderEngine {
516:  async buildDataset(
716:export const latheLoRADatasetBuilderEngine = new LatheLoRADatasetBuilderEngine();

### User | 2026-06-19T19:56:25.127Z

[tool_result]    1751 H:/prism/state/shared/lora/fleet-lora-combined-capped.jsonl
    184 H:/prism/state/shared/lora/bridge-reasoning-combined.jsonl
    697 H:/prism/state/shared/lora/cad-combined-training.jsonl
     16 H:/prism/state/shared/lora/cad-dimension-dataset.jsonl
     29 H:/prism/state/shared/lora/cad-fix-training-dataset.jsonl
     11 H:/prism/state/shared/lora/cad-geometry-composition-dataset.jsonl
... [+486 chars truncated]

### Assistant | 2026-06-19T19:57:39.559Z

I have all the data needed. Here is the complete contract document.

---

## PRISM Shared LoRA Trainer — Contract Report

---

### 1. `scripts/fleet_lora_train.py` — CLI Contract

**File:** `H:/prism/scripts/fleet_lora_train.py`

**All CLI args** (`parse_args`, lines 322-350):

| Arg | Default | Notes |
|-----|---------|-------|
| `--corpus` | `state/shared/lora/fleet-lora-combined.jsonl` | Input dataset path |
| `--base` | `Qwen/Qwen2.5-7B-Instruct` | HF model id |
| `--out` | `state/shared/lora/adapters/fleet-adapter` | Adapter output dir |
| `--rank` | `16` | LoRA r |
| `--alpha` | `32` | LoRA alpha |
| `--dropout` | `0.05` | LoRA dropout |
| `--rslora` | `False` | rank-stabilized LoRA (alpha/sqrt(r)) |
| `--max-steps` | `400` | governs over epochs if >0 |
| `--epochs` | `0` | used only if max-steps==0 |
| `--batch` | `4` | per_device_train_batch_size |
| `--grad-accum` | `4` | gradient_accumulation_steps |
| `--lr` | `2e-4` | learning rate |
| `--max-seq-len` | `2048` | token truncation |
| `--save-steps` | `50` | checkpoint frequency |
| `--load-in-4bit` | `True` | 4-bit NF4 QLoRA (disable with `--no-4bit`) |
| `--bf16` | `True` | bfloat16 compute dtype |
| `--resume` | `True` | auto-resume from checkpoint in `--out` |
| `--smoke` | flag | forces max_steps=8, rank<=8, save_steps=4 |
| `--dry-run` | flag | no torch, no training; prints corpus summary + config |

**Input dataset format** (lines 65-91, 105-119):

JSONL, one JSON object per line. Alpaca schema:
- `instruction` (str, required, non-empty)
- `output` (str, required, non-empty)
- `input` (str, optional — becomes `### Input:\n{input}\n\n` block if non-empty)
- `weight` (float, optional — explicit per-sample trust weight)
- `advisory` (bool, optional — if `True` and no explicit `weight`, uses 0.5; else 1.0)
- `galaxy` (str, optional — used for corpus stats only)
- `source` (str, optional — used for corpus stats only)

Rows missing `instruction` or `output` are skipped with a count (line 87-90). The fleet
... [+9154 chars truncated]
