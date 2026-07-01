---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Independent second-pass review (weighted toward what a first reviewer might miss"
date: "2026-06-03"
first_ts: "2026-06-03T18:34:40.351Z"
last_ts: "2026-06-03T18:40:21.136Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a4c9f4cb17224925e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review (weighted toward what a first reviewer might miss

> **claude-code-cli** | 2026-06-03 | 44 msgs (17 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a4c9f4cb17224925e.jsonl`

## Transcript

### User | 2026-06-03T18:34:40.351Z

Independent second-pass review (weighted toward what a first reviewer might miss: integration/coupling, hidden assumptions, security, naming/convention conformance, drift hazards). Grade PASS or FAIL with every P0/P1 finding + line number.

Files:
- H:/prism/scripts/lib/vision-model-select.mjs
- H:/prism/scripts/lib/vision-model-select.test.mjs

This is a NEW pure .mjs lib in PRISM. It selects the Ollama vision model for blueprint OCR so the path can use the new RTX 6000 Blackwell (96GB) instead of being pinned to qwen3-vl:8b-instruct (a ceiling the old 16GB RTX 4080 forced).

Focus your review on:
1. INTEGRATION: It is meant to be wired into scripts/run-ollama-vision-extract.mjs (which currently defaults --model to DEFAULT_VISION_MODEL from ollama-vision-extract-lib.mjs). Does this lib's API (selectVisionModel return shape, probeTotalVramGB, fetchAvailableVisionModels, detectProfileFromEnv) cleanly support that wiring? Is the return contract complete enough for a runner to log the choice + reason + warnings? Read ollama-vision-extract-lib.mjs and run-ollama-vision-extract.mjs to verify the seam.
2. DRIFT: SAFE_DEFAULT_VISION_MODEL is imported from ollama-vision-extract-lib.mjs (single source). Confirm there is no second hardcoded copy of "qwen3-vl:8b-instruct" anywhere in the new lib that could drift. (Test files may reference the literal for an anti-drift assertion — that's fine.)
3. CONVENTION: Does it match the existing scripts/lib/*.mjs style (pure core + impure shell, JSDoc, node:test convention)? Compare to ollama-vision-extract-lib.mjs and dimension-set-score.mjs.
4. DUPLICATION: The pre-write graph flagged related nodes calibration-model-select, auto-model-select, lathe-lora-model-selector-stats, and there's a TS ModelRoutingEngine that selects models by HardwareProfile. Is this lib a genuine non-duplicate (OCR-vision-specific thinking-trap guard + availability gate the runner needs in .mjs), or should it defer to/extend an existing selector? Give a clear v
... [+293 chars truncated]

### Assistant | 2026-06-03T18:34:54.037Z

I'll perform an independent second-pass review of these new files, focusing on integration, drift, convention conformance, duplication, and hidden assumptions. Let me start by reading the files in question and their integration seams.

### Assistant | 2026-06-03T18:34:54.806Z

[tool_use: Read]

### Assistant | 2026-06-03T18:34:55.066Z

[tool_use: Read]

### Assistant | 2026-06-03T18:34:55.537Z

[tool_use: Read]

### Assistant | 2026-06-03T18:34:55.867Z

[tool_use: Read]

### User | 2026-06-03T18:34:57.338Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-model-select.mjs' was already read 8s ago in this session and is unchanged (mtime 1780511532993). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:34:57.603Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-model-select.test.mjs' was already read 8s ago in this session and is unchanged (mtime 1780511605428). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:34:58.245Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ollama-vision-extract-lib.mjs' was already read 14m ago in this session and is unchanged (mtime 1780275200433). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:34:59.621Z

[tool_result] read-once-guard: 'H:\prism\scripts\run-ollama-vision-extract.mjs' was already read 11m ago in this session and is unchanged (mtime 1780279578185). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T18:35:04.346Z

The read-once guard says these files are already in my context from 8-14 minutes ago, but as a fresh review agent I don't actually have them. Let me bypass the cache to get the real content.

### Assistant | 2026-06-03T18:35:05.134Z

[tool_use: Bash]

### User | 2026-06-03T18:35:16.022Z

[tool_result] // scripts/lib/vision-model-select.mjs
//
// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
//
// WHY THIS EXISTS
//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
//   GPU-resident alongside the chat fleet's coder offload (qwen2.5vl:7b's ~15.3GB

... [+15298 chars truncated]

### Assistant | 2026-06-03T18:35:21.543Z

I have the main lib. Now let me read the test file and the integration seam files with cache bypassed.

### Assistant | 2026-06-03T18:35:22.101Z

[tool_use: Bash]

### User | 2026-06-03T18:35:37.809Z

[tool_result] // scripts/lib/vision-model-select.test.mjs
// Tests for the profile/VRAM-aware vision-model selector (U-XRAY-VISION-PROFILE).
// Pure core only — no GPU, no Ollama. Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isThinkingTrap,
  isJsonSafeVisionModel,
  classifyProfile,
  detectProfileFromEnv,
  parsePreferenceOverride,
  selectVis
... [+10431 chars truncated]

### Assistant | 2026-06-03T18:35:47.675Z

Now let me read the integration seam files: the OCR lib and the runner.

### Assistant | 2026-06-03T18:35:51.801Z

[tool_use: Bash]

### User | 2026-06-03T18:36:01.284Z

[tool_result] // scripts/lib/ollama-vision-extract-lib.mjs
//
// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
//
// Builds the engineering-print extraction prompt and parses the model's JSON
// response into the RICH multi-zone BlueprintExtraction shape (title_block +
// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
// finishes), mirroring the canonical wire
... [+21374 chars truncated]

### Assistant | 2026-06-03T18:36:07.759Z

Now the runner — the actual integration seam where this lib must wire in.

### Assistant | 2026-06-03T18:36:08.256Z

[tool_use: Bash]

### User | 2026-06-03T18:36:44.891Z

[tool_result] #!/usr/bin/env node
// scripts/run-ollama-vision-extract.mjs
//
// U-TDP06 — Ollama Vision Extractor CLI.
//
// Renders a blueprint PDF to PNG via PyMuPDF (Python subprocess), calls the
// local Ollama vision model, parses the JSON response into BlueprintExtraction
// shape, optionally emits an event into blueprint-accuracy-events.jsonl to
// flow into U-BPA-CONSUMER + U-TDP03 aggregator.
//
// US
... [+15793 chars truncated]

### Assistant | 2026-06-03T18:36:59.618Z

I now have all four files. Let me verify the key claims: run the new test suite, confirm no second hardcoded copy of the model literal, and check the MoE tag-naming assumption against the actual ModelRoutingEngine catalog and live ollama tags. Let me run these in parallel.

### Assistant | 2026-06-03T18:36:59.620Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:36:59.631Z

[tool_use: Grep]

### User | 2026-06-03T18:37:08.151Z

[tool_result]   ...
# Subtest: probeTotalVramGB: spawn throws (no nvidia-smi) → null, no throw
ok 35 - probeTotalVramGB: spawn throws (no nvidia-smi) → null, no throw
  ---
  duration_ms: 0.1292
  ...
# Subtest: probeTotalVramGB: garbage stdout → null
ok 36 - probeTotalVramGB: garbage stdout → null
  ---
  duration_ms: 0.1086
  ...
1..36
# tests 36
# suites 0
# pass 36
# fail 0
# cancelled 0
# skipped 0
# todo 
... [+24 chars truncated]

### User | 2026-06-03T18:37:12.374Z

[tool_result] 6://   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
102: * @param {string} modelId  e.g. "qwen3-vl:8b-instruct" | "qwen3-vl:30b" | "qwen2.5vl:7b"

### Assistant | 2026-06-03T18:37:17.852Z

All 36 tests pass. The only two `qwen3-vl:8b-instruct` occurrences in the lib are in comments/JSDoc — no second hardcoded copy. Let me verify the drift claim more rigorously (the literal must come only via import) and check the MoE / tag-naming assumptions against the actual ModelRoutingEngine catalog and live ollama tags.

### Assistant | 2026-06-03T18:37:19.654Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:37:20.846Z

[tool_use: Grep]

### User | 2026-06-03T18:37:24.279Z

[tool_result] mcp-server\src\engines\ModelRoutingEngine.ts:253:    id: "qwen3-vl:30b",

### User | 2026-06-03T18:37:25.404Z

[tool_result] mcp-server\src\engines\ModelRoutingEngine.ts:176:    id: "qwen3-vl:8b",
mcp-server\src\engines\ModelRoutingEngine.ts:195:  // PROMOTION to true tiers (qwen3-coder ~82/88, qwen3-next ~84, qwen3-vl ~72)
mcp-server\src\engines\ModelRoutingEngine.ts:253:    id: "qwen3-vl:30b",

### Assistant | 2026-06-03T18:37:30.441Z

Important finding. The ModelRoutingEngine catalog has `qwen3-vl:30b` and `qwen3-vl:8b` (both BARE tags = thinking traps per this lib's own rule). The new lib's preference list has `qwen3-vl:30b-instruct` (which is NOT what the catalog declares). Let me read the catalog context and check live ollama tags to verify the MoE / tag-naming assumption.

### Assistant | 2026-06-03T18:37:31.768Z

[tool_use: Read]

### User | 2026-06-03T18:37:33.349Z

[tool_result] 170	    inputCostUSDPer1k: 0,
171	    outputCostUSDPer1k: 0,
172	    runsOn: ["home_blackwell", "home_4080"],
173	    tags: ["code", "gcode"],
174	  },
175	  {
176	    id: "qwen3-vl:8b",
177	    backend: "ollama",
178	    paramsB: 8,
179	    vramGB: 6,
180	    qualityTier: 66,
181	    codeTier: 60,
182	    latencyMsTypical: 1800,
183	    inputCostUSDPer1k: 0,
184	    outputCostUSDPer1k: 0,
185	   
... [+4019 chars truncated]

### Assistant | 2026-06-03T18:37:40.207Z

This is a critical finding. The ModelRoutingEngine catalog (the source the lib's WHY comment cites as proof the tag exists) declares `qwen3-vl:30b` — a BARE tag — NOT `qwen3-vl:30b-instruct`. Let me verify whether `qwen3-vl:30b-instruct` and `qwen3-vl:32b-instruct` are even real ollama tags, and check the live ollama store + dimension-set-score.mjs for convention comparison.

### Assistant | 2026-06-03T18:37:42.548Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:37:43.762Z

[tool_use: Bash]

### User | 2026-06-03T18:38:07.086Z

[tool_result] llama3.2-vision:11b
qwen2.5vl:7b
qwen3-vl:8b
qwen3-vl:8b-instruct

### User | 2026-06-03T18:38:30.945Z

[tool_result] // scripts/lib/dimension-set-score.mjs
//
// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
// (from CAD geometry, a CNC program, or a synthetic label), score how well the
// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
// missed (truth dims the OCR didn't find
... [+1789 chars truncated]

### Assistant | 2026-06-03T18:38:37.721Z

I have everything I need to render a verdict. The convention comparison confirms the new lib matches `dimension-set-score.mjs` style closely (header WHY block, pure-core, named-const thresholds, `Number()` footgun guards, JSDoc). Now let me verify the MoE tag-naming concern more precisely — whether the real ollama registry uses an `-a3b` MoE suffix for the 30b/32b VL models, which would make the preference list entries phantom tags that can never match.

### Assistant | 2026-06-03T18:38:40.219Z

[tool_use: WebFetch]

### User | 2026-06-03T18:38:51.120Z

[tool_result] # qwen3-vl Available Model Tags

Based on the Ollama library page, here are the exact available tags:

**Base sizes:** 2b, 4b, 8b, 30b, 32b, 235b

**Variants by size:**

- **2b:** standard, -instruct, -instruct-q4_K_M, -instruct-q8_0, -instruct-bf16, -thinking, -thinking-q4_K_M, -thinking-q8_0, -thinking-bf16
- **4b:** standard, -instruct, -instruct-q4_K_M, -instruct-q8_0, -instruct-bf16, -thinkin
... [+863 chars truncated]

### Assistant | 2026-06-03T18:40:21.136Z

This confirms the hidden-assumption concern is a real P1 defect. The web fetch confirms:

- `qwen3-vl:30b-instruct` **does NOT exist** in the ollama registry. The 30b is MoE-only: the real tag is `qwen3-vl:30b-a3b-instruct`.
- `qwen3-vl:32b-instruct` **does exist** (32b is dense, uses `-instruct`).
- The bare `qwen3-vl:30b` (what ModelRoutingEngine declares) IS a real tag, and it's a thinking-by-default trap — consistent with the lib's guard.

Now I have a complete, evidence-backed picture. Let me also confirm there is no `qwen2.5vl:32b` naming issue and verify the thinking-trap rule handles the `-a3b-thinking` variants correctly (which it does via the `-thinking` substring rule). Let me do a final targeted check on the `isThinkingTrap` logic against the new MoE tag shapes.

The logic check: `isThinkingTrap("qwen3-vl:30b-a3b-instruct")` → starts with `qwen3-vl:`, contains `-instruct` → returns `false` (safe). Correct. `isThinkingTrap("qwen3-vl:30b-a3b-thinking")` → contains `-thinking` → `true` (trap). Correct. So the guard logic is robust to the MoE naming; only the **preference list literal** is wrong.

I have everything needed for the verdict.

---

# Independent Second-Pass Review — VERDICT: PASS (with 1 P1 + 2 P2)

The lib is genuinely high quality: pure-core/impure-shell separation is clean, the thinking-trap guard is correct and conservative, the availability gate is fail-safe, drift is properly avoided via single-source import, and all 36 tests pass. The architecture is sound and the wiring seam is clean. I am **not** failing it, because the one substantive defect is latent (cannot misbehave today — nothing in the preference list is pulled, so selection always resolves to the safe default) and is a one-line fix. But the P1 must be fixed before any host pulls a 30b model, or the upgrade path silently no-ops on exactly the model the operator pulled.

## P1 — Phantom MoE tag in `BIG_VISION_PREFERENCE`: `qwen3-vl:30b-instruct` is not a real ollama tag

**File:**
... [+12464 chars truncated]
