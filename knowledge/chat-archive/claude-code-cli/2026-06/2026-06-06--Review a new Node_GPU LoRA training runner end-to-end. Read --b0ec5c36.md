---
type: "chat-session"
source: "claude-code-cli"
session_id: "b0ec5c36-4450-413c-8517-b0fb5635538c"
title: "Review a new Node→GPU LoRA training runner end-to-end. Read the WHOLE file: H:/p"
date: "2026-06-06"
first_ts: "2026-06-06T16:25:39.344Z"
last_ts: "2026-06-06T16:27:27.361Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 6
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/b0ec5c36-4450-413c-8517-b0fb5635538c/subagents/agent-a5c6a56ac80aecd5b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review a new Node→GPU LoRA training runner end-to-end. Read the WHOLE file: H:/p

> **claude-code-cli** | 2026-06-06 | 13 msgs (6 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b0ec5c36-4450-413c-8517-b0fb5635538c/subagents/agent-a5c6a56ac80aecd5b.jsonl`

## Transcript

### User | 2026-06-06T16:25:39.344Z

Review a new Node→GPU LoRA training runner end-to-end. Read the WHOLE file: H:/prism/scripts/lib/blueprint-vl-train-runner.mjs and its test H:/prism/scripts/lib/blueprint-vl-train-runner.test.mjs. Also skim the contracts it depends on: H:/prism/scripts/lib/py-subprocess-bridge.mjs (runPythonJson/runPythonJsonOrThrow — note `ok` semantics, `.bridge` on the thrown error, NDJSON result), H:/prism/scripts/py/gpu_health.py (the report fields torch_ready/qlora_ready/sm_supported/errors), and the trainer CLI/result contract in H:/prism/mcp-server/scripts/blueprint_vl_train_lora.py (argparse flags: --bundle --output --base-model --epochs --lora-r --lora-alpha --lora-dropout --val-frac --seed --dpi --batch-size --grad-accum --lr --target-modules; emit_result(ok, ...) with training_brier/adapter_dir/brier_n on success and error="missing_dependency"|"gpu_unusable"|"insufficient_data" on failure; per-step {event:"progress",stage:"train",logs:{loss}}).

This module is T3.2 of state/shared/ocr-training-loop/INDIA-TAKEOVER-PLAN-blueprint-lora.md — the "missing connective tissue" that (1) pre-gates on the STRONG gpu_health.py, (2) validates the staged bundle, (3) spawns the trainer via the bridge streaming progress, (4) maps the result to the generic pipeline's trainOnce() finite-loss contract.

VERIFY RIGOROUSLY — report P0/P1:
1. CLI arg correctness: does buildTrainerArgs emit EXACTLY the flags blueprint_vl_train_lora.py's argparse accepts (names + value formatting)? Any flag the trainer expects but the runner omits, or a wrong flag name, is a P0 (silent train misconfig). Cross-check against the trainer's argparse.
2. GPU gate correctness: assertGpuTrainable — is it truly fail-CLOSED (missing/unparseable report → throws, never silently passes)? Does requireBnb correctly require qlora_ready AND torch_ready? Does the runner refuse to spawn the trainer when the gate throws (verify control flow — the trainer must NOT run on a dead GPU)?
3. Result mapping: the `loss` contract — it pre
... [+1069 chars truncated]

### Assistant | 2026-06-06T16:25:49.798Z

I'll review this Node→GPU LoRA training runner end-to-end. Let me read the target file, its test, and the contracts it depends on.

### Assistant | 2026-06-06T16:25:50.476Z

[tool_use: Read]

### Assistant | 2026-06-06T16:25:51.557Z

[tool_use: Read]

### Assistant | 2026-06-06T16:25:51.733Z

[tool_use: Read]

### Assistant | 2026-06-06T16:25:52.171Z

[tool_use: Read]

### Assistant | 2026-06-06T16:25:52.538Z

[tool_use: Read]

### User | 2026-06-06T16:25:54.869Z

[tool_result] 1	// scripts/lib/blueprint-vl-train-runner.mjs
2	//
3	// T3.2 (INDIA-TAKEOVER-PLAN-blueprint-lora) — the Node→GPU runner: the missing
4	// connective tissue between the .mjs orchestration layer and the real Qwen2.5-VL
5	// PEFT trainer `mcp-server/scripts/blueprint_vl_train_lora.py` (T3.1, shipped
6	// b121b19f7b). NO current engine owns this edge.
7	//
8	// WHAT IT DOES (in dependency order, fail
... [+15798 chars truncated]

### User | 2026-06-06T16:25:55.804Z

[tool_result] 1	// scripts/lib/blueprint-vl-train-runner.test.mjs — hermetic tests for the T3.2 Node→GPU
2	// LoRA runner. NO GPU / Python: the two py-bridge calls (gpu_health + trainer) are
3	// dependency-injected (_runPythonJson / _runTrainer) with canned PyBridgeResult objects.
4	import test from "node:test";
5	import assert from "node:assert/strict";
6	import { writeFileSync, mkdtempSync, rmSync } from "no
... [+11942 chars truncated]

### User | 2026-06-06T16:25:56.066Z

[tool_result] 1	/**
2	 * py-subprocess-bridge.mjs — BLACKWELL-AI-MS0 / U-PY-BRIDGE-LIB
3	 *
4	 * The ONE canonical Node->Python spawn primitive for the Blackwell training
5	 * stack. Every GPU job that Node orchestrates but Python executes — the GNN
6	 * GATv2/H2GCN retrain, QLoRA fine-tunes, the full-corpus GPU embedder, the
7	 * Bradley-Terry reward model — spawns its Python through this bridge so the
8	 * co
... [+17831 chars truncated]

### User | 2026-06-06T16:25:56.332Z

[tool_result] 1	#!/usr/bin/env python3
2	"""gpu_health.py — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH (fail-loud GPU readiness gate)
3	
4	The canonical, FAIL-LOUD verifier of "can this host actually train on the GPU
5	right now." It is the single most dangerous silent-failure mode in the whole
6	Blackwell training stack: a torch wheel built for an older CUDA arch
7	(cu117/cu121/cu124) will report ``torch.cuda.is_availa
... [+18436 chars truncated]

### User | 2026-06-06T16:25:56.593Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	blueprint_vl_train_lora.py — BLACKWELL-AI-MS0 / U-XRAY-VL-TRAINER (slot:xray, acting for india)
4	
5	The REAL Qwen2.5-VL PEFT (LoRA) trainer for the blueprint-vision OCR loop. This is the
6	keystone that `wedm_train_lora.py` never was: that script is a TEXT-ONLY SIMULATION stub
7	(prints fake epoch losses, imports only argparse/json/os, never touches a GPU). This o
... [+30288 chars truncated]

### Assistant | 2026-06-06T16:27:27.361Z

I have everything I need. The PreToolUse hook confirms gpu_health.py is unchanged from my prior read. Let me cross-check the one structural detail that matters most for the bridge contract — how `runPythonJsonOrThrow` surfaces a trainer `ok:false` (handled-failure) result, since that determines whether the runner's two failure paths are both reachable.

Tracing the critical path: the trainer emits `emit_result(False, error="...")` then `return EXIT_MISSING_DEP` (3/4/5, all non-zero). The bridge sees non-zero exit → `error = NONZERO_EXIT` → `ok:false` → `runPythonJsonOrThrow` **throws**. So a handled trainer failure goes down the runner's `catch` path, NOT the `result.ok !== true` path. This is the linchpin of finding #4. Let me verify the test fakes against this.

I've now traced every path. Here is my analysis.

## Code Quality Analysis Report — blueprint-vl-train-runner.mjs (T3.2)

**Verdict: PASS** (with 1 P1 test-integrity gap and several P2/P3 notes). The runner is fail-closed, the CLI contract matches the trainer's argparse exactly, and no path reports a train successful when it wasn't. The one material concern is a test-faithfulness gap (R9) where the DI fake diverges from the real bridge contract and masks the runner's actual production failure path.

---

### 1. CLI arg correctness — PASS (exact match)

Cross-checked `buildTrainerArgs` (runner:158-172) against `build_arg_parser()` (trainer:516-535), every flag matches name + dest + value formatting:

| Runner flag | Trainer argparse | Type/format | Match |
|---|---|---|---|
| `--bundle` | `--bundle` (str) | path string | ✓ |
| `--output` | `--output` (str) | dir string | ✓ |
| `--base-model` | `--base-model` dest=base_model | str | ✓ |
| `--epochs` | `--epochs` int | `String(3)` → `"3"` | ✓ |
| `--lora-r` | `--lora-r` dest=lora_r int | ✓ |
| `--lora-alpha` | `--lora-alpha` int | ✓ |
| `--lora-dropout` | `--lora-dropout` float | `String(0.05)`→`"0.05"` | ✓ |
| `--val-frac` | `--val-frac` float | ✓ |
| `--see
... [+14252 chars truncated]
