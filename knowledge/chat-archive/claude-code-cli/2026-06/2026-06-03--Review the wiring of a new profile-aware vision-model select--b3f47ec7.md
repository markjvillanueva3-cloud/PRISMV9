---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Review the wiring of a new profile-aware vision-model selector into an existing "
date: "2026-06-03"
first_ts: "2026-06-03T18:49:39.878Z"
last_ts: "2026-06-03T18:51:40.913Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a94912b1457bf2881.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review the wiring of a new profile-aware vision-model selector into an existing 

> **claude-code-cli** | 2026-06-03 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a94912b1457bf2881.jsonl`

## Transcript

### User | 2026-06-03T18:49:39.878Z

Review the wiring of a new profile-aware vision-model selector into an existing OCR runner. Grade PASS/FAIL with every P0/P1 + line number.

File changed: H:/prism/scripts/run-ollama-vision-extract.mjs
New lib it wires in: H:/prism/scripts/lib/vision-model-select.mjs

What the wiring does: previously the runner defaulted `--model` to DEFAULT_VISION_MODEL (hardcoded qwen3-vl:8b-instruct). Now `--model` defaults to null and a new `resolveVisionModel(explicitModel, env, ollamaUrl)` function resolves the model: an explicit `--model` is an operator force (honored, warned if a thinking-trap); otherwise it calls selectVisionModel({vramGB: probeTotalVramGB(), availableModels: await fetchAvailableVisionModels(url), envOverride: env.PRISM_VISION_MODEL, preference: parsePreferenceOverride(env.PRISM_VISION_PREFERENCE)}). The chosen model + reason + vram + tier are logged and added to the JSON result (model_reason, vram_gb, vision_tier).

Verify specifically:
1. Is `resolveVisionModel` correct and total (never throws)? It must degrade to the safe default if the GPU/Ollama probes fail (they return null/[] respectively — confirm the selector handles that, which it does via fail-safe availability).
2. Is the explicit `--model` precedence correct (CLI force wins over env/auto)? Does an explicit thinking-trap --model get a loud warning rather than a silent break?
3. Is `args.model` correctly reassigned BEFORE the page-extract loop uses it (extractPage → callOllamaVision(args.model,...))? Confirm there is no path where the OLD null model reaches the Ollama call.
4. Did removing DEFAULT_VISION_MODEL from the import break anything else in the file? (grep its other uses.)
5. Does the change preserve back-compat for the runner's exported pure functions (buildRenderArgs, selectPages) that its test file imports? (14/14 runner tests pass — confirm nothing in the test contract changed.)
6. Any race/ordering issue with the async resolve added inside main()?

Be concrete with line numbers. The 
... [+106 chars truncated]

### Assistant | 2026-06-03T18:49:56.817Z

I'll read both files thoroughly before making any judgments.

### Assistant | 2026-06-03T18:49:57.556Z

[tool_use: Read]

### Assistant | 2026-06-03T18:49:57.814Z

[tool_use: Read]

### User | 2026-06-03T18:50:01.761Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/run-ollama-vision-extract.mjs
3	//
4	// U-TDP06 — Ollama Vision Extractor CLI.
5	//
6	// Renders a blueprint PDF to PNG via PyMuPDF (Python subprocess), calls the
7	// local Ollama vision model, parses the JSON response into BlueprintExtraction
8	// shape, optionally emits an event into blueprint-accuracy-events.jsonl to
9	// flow into U-BPA-CONSUMER + U-TDP03 ag
... [+19861 chars truncated]

### User | 2026-06-03T18:50:01.954Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+17610 chars truncated]

### Assistant | 2026-06-03T18:50:08.554Z

Now let me check the test file and the lib it imports from to verify the remaining questions.

### Assistant | 2026-06-03T18:50:09.917Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:50:10.712Z

[tool_use: Grep]

### User | 2026-06-03T18:50:13.284Z

[tool_result] 31:export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";
379:  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;

### User | 2026-06-03T18:50:24.918Z

[tool_result] scripts\run-ollama-vision-extract.test.mjs

### Assistant | 2026-06-03T18:50:32.422Z

[tool_use: Read]

### Assistant | 2026-06-03T18:50:32.427Z

[tool_use: Grep]

### User | 2026-06-03T18:50:35.757Z

[tool_result] No matches found

### User | 2026-06-03T18:50:36.526Z

[tool_result] 1	// scripts/run-ollama-vision-extract.test.mjs
2	// Tests for the runner's pure page-selection logic (U-PSGB-XRAY-MULTIPAGE #1).
3	// The render+VLM loop is integration-tested separately (GPU-bound); selectPages
4	// is the pure decision that governs WHICH pages get processed — the fix for the
5	// "page 0 only → ~76% of pages dropped" bug. Run: node --test <file>
6	
7	import { test } from "node:
... [+3921 chars truncated]

### Assistant | 2026-06-03T18:51:40.913Z

Good — all the files are in hand. I have both complete files and the test file. Here is the full review.

---

## Wiring Review: `resolveVisionModel` into `run-ollama-vision-extract.mjs`

**Files reviewed:**
- `H:/prism/scripts/run-ollama-vision-extract.mjs`
- `H:/prism/scripts/lib/vision-model-select.mjs`
- `H:/prism/scripts/run-ollama-vision-extract.test.mjs`

---

### Question 1 — Is `resolveVisionModel` correct and total (never throws)?

**PASS.**

`resolveVisionModel` (runner lines 250–269) has two branches:

**Explicit model path (lines 251–259):** Trims the string, calls `isThinkingTrap()`, returns immediately. `isThinkingTrap` (lib lines 114–125) is a pure regex function with a `typeof` guard on line 115 — it cannot throw on any input.

**Auto-resolve path (lines 261–269):** Calls `probeTotalVramGB()` (lib lines 290–300) and `fetchAvailableVisionModels()` (lib lines 311–327). Both are fully wrapped in try/catch / error-swallowing logic and return `null` / `[]` respectively on any failure. `selectVisionModel` (lib lines 210–272) then receives these. The critical degrade chain in `selectVisionModel`:

- `vramGB = null` → `classifyProfile(null)` returns `"standard"` (lib line 146 — `Number.isFinite(null)` is false) → the big-VRAM upgrade path is skipped entirely.
- `availableModels = []` → `haveTags = false` (lib line 213) → `confirmedAvailable()` always returns false (lib line 222) → the big-VRAM loop on lines 244–256 never selects a candidate even on a big-VRAM host.
- Both null/[] together → falls through to the safe-fallback return on lines 260–271, which always returns `SAFE_DEFAULT_VISION_MODEL`.

`SAFE_DEFAULT_VISION_MODEL` is imported from `ollama-vision-extract-lib.mjs` at lib line 52, not re-hardcoded. The final `resolveVisionModel` return on line 269 always returns an object with a non-empty `model` string. No code path reaches the Ollama call with a null or empty model.

---

### Question 2 — Is the explicit `--model` precedence correct? Does a thin
... [+7418 chars truncated]
