---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Investigate the RTX 6000 Blackwell GPU + ollama + local-model training/inference"
date: "2026-06-03"
first_ts: "2026-06-03T18:08:55.449Z"
last_ts: "2026-06-03T18:19:19.055Z"
cwd: "H:\\prism"
messages: 77
user_msgs: 32
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a112184ca7507772d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Investigate the RTX 6000 Blackwell GPU + ollama + local-model training/inference

> **claude-code-cli** | 2026-06-03 | 77 msgs (32 user / 45 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a112184ca7507772d.jsonl`

## Transcript

### User | 2026-06-03T18:08:55.449Z

Investigate the RTX 6000 Blackwell GPU + ollama + local-model training/inference infrastructure in H:/prism. Recent commits added a 'home_blackwell' ModelRoutingEngine profile (qwen2.5-coder:32b) and a fleet-reaper 'blackwell' host preset (commits 4199918e49, 4047a82236). I need concrete answers, cite file:line:

1. What is the current GPU/ollama integration — which models are configured/referenced in code, and is there ANY vision/OCR-capable model wired or referenced (llava, qwen2-vl, minicpm-v, got-ocr2, internvl)? Search ModelRoutingEngine, OllamaHookBridgeEngine, ollama-bridge scripts, ask-ollama.mjs.
2. What scripts/engines actually run GPU compute, model training, or LoRA fine-tuning? Find real training scripts (python/node) — do they exist and run, or are they scaffolds? Where would a GPU vision model be invoked from?
3. How are local models invoked for blueprint/OCR/CAD tasks today (if at all)? Is there an image→model inference path anywhere in the repo?
4. What concrete leverage does the RTX 6000 (96GB VRAM, runs 32B + vision models) unlock that the prior RTX 4080 SUPER (16GB) could not? E.g., resident vision-OCR model, larger LoRA training batches, 32B reasoning for CAD-gen.

Report a concrete capability map: what's wired, what's runnable, and the highest-ROI GPU leverage for the xray/blueprint-vision domain specifically. Cite file paths. Search breadth: very thorough.

### Assistant | 2026-06-03T18:09:06.907Z

I'll conduct a thorough investigation of the RTX 6000 Blackwell GPU infrastructure in your prism repository. Let me start by mapping the ModelRoutingEngine, GPU integration scripts, and vision/training capabilities.

### Assistant | 2026-06-03T18:09:07.936Z

[tool_use: Bash]

### User | 2026-06-03T18:09:14.234Z

[tool_result] 4199918e49 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-ROUTE-PROFILE (slot:alpha): teach ModelRoutingEngine the RTX PRO 6000 Blackwell — home_blackwell profile + real 32B/14B GPU catalog so code+substantial-reasoning route to the FREE local qwen2.5-coder:32b instead of paid cloud (token-saving payoff). SAFETY preserved: every local tier<85 keeps safety_critical on cloud fron
... [+4898 chars truncated]

### Assistant | 2026-06-03T18:09:18.064Z

Let me search for the ModelRoutingEngine and GPU/vision-related configurations:

### Assistant | 2026-06-03T18:09:18.065Z

[tool_use: Glob]

### User | 2026-06-03T18:09:33.367Z

[tool_result] .git\backup-untracked\mcp-server\src\__tests__\ModelRoutingEngine.test.ts
.git\backup-untracked\mcp-server\src\engines\ModelRoutingEngine.ts
mcp-server\dist.bak-20260504-143257\engines\ModelRoutingEngine.js.map
mcp-server\dist.bak-20260504-143257\engines\ModelRoutingEngine.js
mcp-server\dist.bak-20260504-143257\engines\ModelRoutingEngine.d.ts.map
mcp-server\dist.bak-20260504-143257\engines\ModelRo
... [+5002 chars truncated]

### Assistant | 2026-06-03T18:09:36.679Z

Now let me examine the main ModelRoutingEngine file and related configurations:

### Assistant | 2026-06-03T18:09:36.716Z

[tool_use: Read]

### User | 2026-06-03T18:09:38.438Z

[tool_result] 1	/**
2	 * ModelRoutingEngine — Phase 0.19 U-LLM7
3	 *
4	 * Decide which LLM backend/model should service a given request so simple
5	 * queries take the local Ollama path (free, on-prem, fast once warm) and
6	 * only queries that genuinely need frontier reasoning fall back to the paid
7	 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
8	 * — callers feed it request fea
... [+28270 chars truncated]

### Assistant | 2026-06-03T18:09:41.430Z

Now let me search for OllamaHookBridgeEngine and related GPU/vision configurations:

### Assistant | 2026-06-03T18:09:41.849Z

[tool_use: Read]

### Assistant | 2026-06-03T18:09:42.519Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:09:42.820Z

[tool_use: Bash]

### User | 2026-06-03T18:09:43.409Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine
3	 *
4	 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
5	 * without consuming API tokens. Designed for hook use cases:
6	 *
7	 * - Fast: 500ms default timeout (hooks can't block long)
8	 * - Resilient: Graceful fallback when Ollama unavailable
9	 * - Configurable: Per-hook-type model selection
10	 * - Stateless: No connection pooling 
... [+7575 chars truncated]

### User | 2026-06-03T18:09:48.316Z

[tool_result] Found 250 files limit: 250
mcp-server\src\engines\ModelRoutingEngine.ts
mcp-server\src\engines\MachineHandbookRegistryEngine.ts
mcp-server\src\engines\CoolantValidationEngine.ts
mcp-server\src\engines\PartsLibraryEngine.ts
mcp-server\scripts\_probe-real.mts
scripts\verify-jm-part-library-seed.ts
mcp-server\src\__tests__\PartsLibraryEngine.jm-corpus-seed.test.ts
mcp-server\src\schemas\partsLibraryA
... [+14351 chars truncated]

### User | 2026-06-03T18:10:27.535Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/worktrees/adr-120-impl/v3/@claude-flow/providers/src/ollama-provider.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modu
... [+1210 chars truncated]

### Assistant | 2026-06-03T18:10:31.265Z

Let me search for training, GPU compute, and vision model implementations:

### Assistant | 2026-06-03T18:10:31.470Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:10:31.895Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:10:32.046Z

[tool_use: Bash]

### User | 2026-06-03T18:11:11.772Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/cjs/training.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/cjs/training.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/esm/training.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/esm/training.js
H:/prism/.cache/npm/_npx
... [+1248 chars truncated]

### User | 2026-06-03T18:12:09.612Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/cjs/lora.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/cjs/lora.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/esm/lora.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@ruvector/ruvllm/dist/esm/lora.js
H:/prism/.cache/npm/_npx/09002f125df728b
... [+28440 chars truncated]

### User | 2026-06-03T18:12:58.444Z

[tool_result] H:/prism/.claude/hooks/blueprint-accuracy-guard.mjs
H:/prism/.claude/hooks/blueprint-coverage-floor-guard.mjs
H:/prism/.claude/hooks/blueprint-coverage-floor-guard.test.mjs
H:/prism/.claude/hooks/blueprint-join-index-stale-check.mjs
H:/prism/.claude/hooks/xray-blueprint-domain-inject.mjs
H:/prism/.claude/hooks/xray-blueprint-domain-inject.test.mjs
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b
... [+1405 chars truncated]

### Assistant | 2026-06-03T18:13:03.093Z

Let me check the fleet-reaper blackwell preset and examine CAD/blueprint vision paths:

### Assistant | 2026-06-03T18:13:03.170Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:13:03.545Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:13:03.956Z

[tool_use: Read]

### User | 2026-06-03T18:13:06.656Z

[tool_result] 1	/**
2	 * BlueprintOCRAdapter — Contract for blueprint-OCR backends in the print-to-program pipeline.
3	 *
4	 * Shipped: 2026-05-23, slot:kilo iter 8 (U-OCR-ADAPTER-IFACE from KILO-QUEUE-PSN-SYNERGY-2026-05-23).
5	 * Part of: U-GAP-P2P-OCR-DIMENSION decomposition (multi-session ML build).
6	 *
7	 * Purpose: Defines the contract any OCR backend (eDOCr2, PaddleOCR, future cloud APIs)
8	 * must impl
... [+4180 chars truncated]

### User | 2026-06-03T18:13:08.683Z

[tool_result] Found 4 files
mcp-server\src\__tests__\orchestrationDispatcher.cog-ollama-wire.test.ts
mcp-server\src\schemas\orchestrationActionSchemas.ts
mcp-server\src\__tests__\ModelRoutingEngine.test.ts
mcp-server\src\engines\ModelRoutingEngine.ts

### User | 2026-06-03T18:13:37.330Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T18:13:40.536Z

Let me search for fleet-reaper presets and GPU-specific configurations:

### Assistant | 2026-06-03T18:13:41.195Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:13:41.677Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:13:42.757Z

[tool_use: Bash]

### User | 2026-06-03T18:14:25.883Z

[tool_result] H:/prism/.claude/helpers/fleet-reaper-enum-cache.mjs
H:/prism/.claude/helpers/fleet-reaper-enum-cache.test.mjs
H:/prism/.claude/helpers/fleet-reaper-host-presets.mjs
H:/prism/.claude/helpers/fleet-reaper-host-presets.test.mjs
H:/prism/.claude/helpers/fleet-reaper.test.mjs
H:/prism/.claude/hooks/fleet-reaper-stop.mjs
H:/prism/prism-test-6d0595/.claude/helpers/fleet-reaper.test.mjs
H:/prism/prism-te
... [+707 chars truncated]

### User | 2026-06-03T18:14:30.934Z

[tool_result] Found 4 files
mcp-server\src\__tests__\orchestrationDispatcher.cog-ollama-wire.test.ts
mcp-server\src\schemas\orchestrationActionSchemas.ts
mcp-server\src\__tests__\ModelRoutingEngine.test.ts
mcp-server\src\engines\ModelRoutingEngine.ts

### User | 2026-06-03T18:14:41.249Z

[tool_result] H:/prism/mcp-server/src/engines/ModelRoutingEngine.ts:    id: "qwen3-vl:8b",

### Assistant | 2026-06-03T18:14:44.950Z

Let me read the fleet-reaper presets and check for CAD/vision infrastructure:

### Assistant | 2026-06-03T18:14:45.183Z

[tool_use: Read]

### Assistant | 2026-06-03T18:14:45.843Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:14:46.321Z

[tool_use: Read]

### User | 2026-06-03T18:14:56.152Z

[tool_result] No files found

### User | 2026-06-03T18:14:56.294Z

[tool_result] 1	// fleet-reaper-host-presets.mjs — per-PC env-var preset overlay.
2	//
3	// Hostname-keyed presets let the same fleet-reaper code do the right thing on
4	// dissimilar PCs: a home PC with a 16GB GPU + 64GB RAM can keep a 7B model
5	// resident and hold a 90% mem floor; a work PC with an 8GB GPU + tighter RAM
6	// needs a smaller default model and a tighter floor so the reaper kicks in
7	// earli
... [+6858 chars truncated]

### User | 2026-06-03T18:14:56.756Z

[tool_result] 1	/**
2	 * CADLiveBlueprintOcrAdapter — CAD-DRAW-MAX-MS1/U-PRINT-OCR-LIVE
3	 *
4	 * Live adapter wiring the existing {@link BlueprintVisionOCREngine} (Claude
5	 * Vision API powered) as the `ocrPrint` dependency of the round-trip
6	 * validation engine.
7	 *
8	 * Maps `ExtractedDimension[]` (from BlueprintVisionOCREngine) →
9	 * `PrintDimension[]` (the round-trip engine's expected shape). Preserve
... [+4636 chars truncated]

### Assistant | 2026-06-03T18:15:00.922Z

Let me search for ask-ollama and vision model inference paths:

### Assistant | 2026-06-03T18:15:01.376Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:15:01.786Z

[tool_use: Read]

### Assistant | 2026-06-03T18:15:02.325Z

[tool_use: Grep]

### User | 2026-06-03T18:15:08.151Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-engine-api-extractor — PreToolUse hook on Read of engine source files.
5	 *
6	 * The U-WIRE13 killer (part 1 of 2). When the agent reads a PRISM engine
7	 * source file, this hook fires Ollama with a structured-extraction prompt
8	 * to capture the engine's public contract:
9	 *
10	 *   { methods: [{ name, params?, returns? }],
11	 *     requir
... [+3342 chars truncated]

### User | 2026-06-03T18:15:09.614Z

[tool_result] No files found

### User | 2026-06-03T18:15:43.971Z

[tool_result] H:/prism/scripts/ask-ollama-fallback.test.mjs
H:/prism/scripts/ask-ollama.mjs
H:/prism/scripts/__tests__/ask-ollama.test.mjs

### Assistant | 2026-06-03T18:15:48.310Z

Let me read ask-ollama.mjs to understand the local model invocation path:

### Assistant | 2026-06-03T18:15:48.311Z

[tool_use: Read]

### Assistant | 2026-06-03T18:15:48.423Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:15:48.502Z

[tool_use: Bash]

### User | 2026-06-03T18:15:57.885Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+8678 chars truncated]

### User | 2026-06-03T18:16:05.190Z

[tool_result] -rw-r--r-- 1 wompu 197611  8151 May 23 21:58 H:/prism/mcp-server/src/engines/BlueprintOCRAdapter.ts
-rw-r--r-- 1 wompu 197611 36601 May 11 00:02 H:/prism/mcp-server/src/engines/BlueprintOCREngine.ts
-rw-r--r-- 1 wompu 197611 38825 May  6 10:52 H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts
-rw-r--r-- 1 wompu 197611 38825 May  6 10:52 H:/prism/mcp-server/src/engines/BlueprintVisionOCRE
... [+756 chars truncated]

### User | 2026-06-03T18:16:05.610Z

[tool_result] H:/prism/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts:export type InputFormat = "dxf" | "step" | "iges" | "text" | "image" | "auto";
H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts:export const blueprintCorpusHarvestEngine = new BlueprintCorpusHarvestEngine();
H:/prism/mcp-server/src/engines/BlueprintCoverageAuditEngine.ts:export const blueprintCoverageAuditEngine = new
... [+3430 chars truncated]

### Assistant | 2026-06-03T18:16:09.586Z

Let me check the BlueprintVisionOCREngine and vision model infrastructure:

### Assistant | 2026-06-03T18:16:10.072Z

[tool_use: Read]

### Assistant | 2026-06-03T18:16:10.196Z

[tool_use: Read]

### User | 2026-06-03T18:16:30.088Z

[tool_result] 1	// WIRE-EXEMPT: dispatcher import was removed by an unrelated peer revert mid-session
2	// (CAD-FUSION-LIVE-MS0 / 2026-05-06). Engine is consumed via direct import by
3	// PrintToFusion360Bridge + downstream OCR pipelines and does not need its own
4	// dispatcher action surface; restoring the previous prism_cad lazy import is
5	// scheduled in the same milestone's restoration commit alongside th
... [+5129 chars truncated]

### User | 2026-06-03T18:16:30.097Z

[tool_result] 1	/**
2	 * MachiningVisionDiagnosticEngine — operator-photo → diagnosis → parameter
3	 * adjustment recommender for roughing operations (hotel iter26).
4	 *
5	 * Operator directive (2026-05-25):
6	 *   "build a feature that will allow the operator to take a picture of chips,
7	 *    part and tooling to determine issues to make automatic parameter
8	 *    adjustments to the program and speed and fe
... [+4747 chars truncated]

### Assistant | 2026-06-03T18:16:34.623Z

Perfect. Now let me search for GPU training scripts and get a summary of the current state:

### Assistant | 2026-06-03T18:16:35.300Z

[tool_use: Read]

### Assistant | 2026-06-03T18:16:36.015Z

[tool_use: Bash]

### User | 2026-06-03T18:16:39.776Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	WEDM LoRA Training Script
4	Phase 0.2 - WEDM AGI Roadmap
5	
6	Trains LoRA adapters on WEDM program outcomes for domain-specific fine-tuning.
7	Uses HuggingFace PEFT for efficient parameter-efficient fine-tuning.
8	
9	Usage: python scripts/wedm_train_lora.py --outcomes outcomes.jsonl
10	"""
11	
12	import argparse
13	import json
14	import os
15	from datetime import d
... [+3724 chars truncated]

### User | 2026-06-03T18:17:55.983Z

[tool_result] H:/prism/mcp-server/src/engines/AIMLEngine.ts:export type ModelStatus = "ready" | "training" | "stale" | "error" | "uninitialized";
H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts: * LoRA export bundle producer. Selects ground-truth training pairs from the
H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts: * HARD RULE (spec): exports stay in `mcp-server/data/training/lora/s
... [+2328 chars truncated]

### Assistant | 2026-06-03T18:18:03.965Z

Now let me check for actual training execution and compile my findings:

### Assistant | 2026-06-03T18:18:04.557Z

[tool_use: Read]

### Assistant | 2026-06-03T18:18:04.562Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:18:04.887Z

[tool_use: Bash]

### User | 2026-06-03T18:18:15.155Z

[tool_result] 1	/**
2	 * BlueprintLoRABridgeEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
3	 *
4	 * LoRA export bundle producer. Selects ground-truth training pairs from the
5	 * GroundTruthRegistryEngine + anonymizes (scrubs customer names, part numbers,
6	 * program content per [[feedback_no_public_h_drive]]) + formats per the target
7	 * fine-tune provider's spec + writes a sealed bundle.
8	 *
9	 * HARD RULE 
... [+3217 chars truncated]

### User | 2026-06-03T18:18:32.615Z

[tool_result] d673f2866f [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-ROUTE-PROFILE (slot:alpha): teach ModelRoutingEngine the RTX PRO 6000 Blackwell — home_blackwell profile + real 32B/14B GPU catalog so code+substantial-reasoning route to the FREE local qwen2.5-coder:32b instead of paid cloud (token-saving payoff). SAFETY preserved: every local tier<85 keeps safety_critical on cloud fron
... [+4968 chars truncated]

### User | 2026-06-03T18:18:35.570Z

[tool_result] H:/prism/mcp-server/src/engines/AICapabilityMaximizerEngine.ts
H:/prism/mcp-server/src/engines/AIDeepKnowledgeIntegrationEngine.ts
H:/prism/mcp-server/src/engines/AIIntelligenceMaximizerEngine.ts
H:/prism/mcp-server/src/engines/AIMLFormulasEngine.ts
H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts
H:/prism/mcp-server/src/engines/AISystemSynchronizerEngine.ts
H:/prism/mcp-server/src/engines/
... [+204 chars truncated]

### Assistant | 2026-06-03T18:19:19.055Z

Excellent. Now I have comprehensive data. Let me compile the final report with all findings:

## RTX 6000 Blackwell GPU + Ollama Infrastructure — Concrete Capability Map

Based on thorough investigation of commits, ModelRoutingEngine, fleet-reaper presets, vision engines, and training infrastructure, here's what's wired, what's runnable, and the GPU leverage:

### 1. CURRENT GPU/OLLAMA INTEGRATION — MODELS CONFIGURED

**ModelRoutingEngine.ts (H:/prism/mcp-server/src/engines/ModelRoutingEngine.ts:1-343)**

**Blackwell GPU Tier (RTX PRO 6000 96GB) — LIVE:**
- **qwen2.5-coder:32b** [line 137-148]: qualityTier=83, codeTier=90, 20GB VRAM (Q4_K_M resident), 3500ms latency (warm on Blackwell; 60m keep_alive mitigates cold load), tags=[code, gcode, reasoning, chat], **ZERO COST** — the token-saving payoff
- **deepseek-r1:14b** [line 150-161]: qualityTier=80 (reasoning specialist), 9GB VRAM, runsOn=[home_blackwell, home_4080]
- **qwen2.5-coder:14b** [line 163-174]: qualityTier=72, codeTier=82, 9GB VRAM
- **qwen3-vl:8b** [line 176-187]: **VISION-CAPABLE**, qualityTier=66, codeTier=60, 6GB VRAM, 1800ms latency, runsOn=[home_blackwell, home_4080, work_3080], tags=[chat]

**VISION/OCR-CAPABLE MODELS REFERENCED:**
- **qwen3-vl:8b** is the ONLY vision model in the routing catalog (line 176-187). NO llava, minicpm-v, got-ocr2, or internvl configured in code.

**Fleet-Reaper Blackwell Host Preset (H:/.claude/helpers/fleet-reaper-host-presets.mjs:49-60):**
```
label: "blackwell"
description: "RTX PRO 6000 Blackwell Workstation Edition 96GB · 127GB RAM — keep a 32B model resident"
PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL: "qwen2.5-coder:32b"
PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "60m"
PRISM_FLEET_REAPER_GPU_FREE_MIN_MB: "24576" (24GB GPU floor — critical for resident 32B)
```
**Deployed by commits 4199918e49 (ModelRoutingEngine profile) + 4047a82236 (fleet-reaper preset)** — both 2026-06-03.

**Ollama local inference path:** ask-ollama.mjs (H:/prism/scripts/ask-ollama.mjs:1-200+) uses 
... [+7870 chars truncated]
