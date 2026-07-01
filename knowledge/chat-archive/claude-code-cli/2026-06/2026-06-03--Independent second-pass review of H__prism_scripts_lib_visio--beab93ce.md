---
type: "chat-session"
source: "claude-code-cli"
session_id: "beab93ce-1457-474c-b6f8-bb8723757910"
title: "Independent second-pass review of H:/prism/scripts/lib/vision-ab-compare.mjs and"
date: "2026-06-03"
first_ts: "2026-06-03T19:44:12.708Z"
last_ts: "2026-06-03T19:47:08.505Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-a976682c57e73501d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Independent second-pass review of H:/prism/scripts/lib/vision-ab-compare.mjs and

> **claude-code-cli** | 2026-06-03 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-a976682c57e73501d.jsonl`

## Transcript

### User | 2026-06-03T19:44:12.708Z

Independent second-pass review of H:/prism/scripts/lib/vision-ab-compare.mjs and its test H:/prism/scripts/lib/vision-ab-compare.test.mjs. Weight your review toward what a correctness-focused reviewer is LIKELY TO MISS: integration coupling, hidden assumptions, naming/convention conformance, and silent-failure surfaces.

This lib is the A/B verdict core for choosing a blueprint-OCR vision model on a new 96GB RTX 6000 Blackwell. It pairs with H:/prism/scripts/lib/vision-model-select.mjs (the selection seam) and reuses ollama-vision-extract-lib + dimension-set-score + ocr-benchmark-lib. Read vision-model-select.mjs too (so you can judge whether buildUpgradeRecommendation's output actually plugs into that seam's model[]/PRISM_VISION_MODEL/BIG_VISION_PREFERENCE concepts coherently).

VERIFY (flag P0/P1, grade PASS/FAIL):
1. INTEGRATION: does buildUpgradeRecommendation's {recommendedModel, nextStep, currentSelection} actually map onto how vision-model-select decides (BIG_VISION_PREFERENCE / availability gate / PRISM_VISION_MODEL override)? Is the recommended action something an operator can act on?
2. HIDDEN COUPLING / DRIFT: the impure shell duplicates ~30 lines of generate/ocr glue from scripts/ocr-closed-loop.mjs. Is the duplication acknowledged (comment) and behaviorally consistent (same prompt partClass, same assumeUnits:"in", same curl transport)? Any divergence that would make A/B numbers NOT comparable to the closed-loop's?
3. CONVENTION: does it match the pure-core + fenced-impure-shell pattern, JSDoc style, fail-soft (never-throw) discipline of vision-model-select.mjs and the surrounding scripts/lib code? Inlined constants? Magic numbers that should be named?
4. SILENT FAILURE: any path where a model that produced garbage is scored as good, or a missing baseline silently picks a wrong reference, or runModelOverPrints swallows a systematic failure?
5. DETERMINISM: the pure functions must be Date.now/random-free (they are consumed by tests). Confirm.

Report conc
... [+55 chars truncated]

### Assistant | 2026-06-03T19:44:27.553Z

[tool_use: Read]

### Assistant | 2026-06-03T19:44:27.783Z

[tool_use: Read]

### Assistant | 2026-06-03T19:44:26.560Z

I'll review the two files as requested. Let me start by reading the target files and their integration partners.

### Assistant | 2026-06-03T19:44:27.071Z

[tool_use: Read]

### User | 2026-06-03T19:44:54.616Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+17610 chars truncated]

### User | 2026-06-03T19:44:55.608Z

[tool_result] 1	// scripts/lib/vision-ab-compare.test.mjs
2	// Tests for U-XRAY-VISION-AB pure A/B verdict core. Reference values + algebraic
3	// invariants — no toBeDefined() stubs. The pure functions decide a real, costly
4	// action (swap the production OCR model), so each test encodes WHY the verdict matters.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	
9	import {
10
... [+12643 chars truncated]

### User | 2026-06-03T19:44:59.570Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+22671 chars truncated]

### Assistant | 2026-06-03T19:45:05.289Z

Now let me read the closed-loop source to verify the duplication claim and check for behavioral divergence, plus the reused libs for contract alignment.

### Assistant | 2026-06-03T19:45:05.805Z

[tool_use: Read]

### Assistant | 2026-06-03T19:45:06.280Z

[tool_use: Read]

### Assistant | 2026-06-03T19:45:06.594Z

[tool_use: Read]

### User | 2026-06-03T19:45:09.680Z

[tool_result] read-once-guard: 'H:\prism\scripts\ocr-closed-loop.mjs' was already read 13m ago in this session and is unchanged (mtime 1780363294961). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T19:45:21.808Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+23135 chars truncated]

### User | 2026-06-03T19:45:22.228Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+9632 chars truncated]

### Assistant | 2026-06-03T19:45:27.387Z

The closed-loop file was already read this session but is in the read-once cache. Let me retrieve the specific generate/ocr glue from it to verify behavioral consistency of the duplicated shell, and check the `percentile` contract from ocr-benchmark-lib.

### Assistant | 2026-06-03T19:45:29.974Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:45:31.049Z

[tool_use: Grep]

### User | 2026-06-03T19:45:38.124Z

[tool_result] 14:// is local (curl, because node fetch fails against localhost Ollama under contention).
25:import { buildVisionPrompt, buildOllamaRequestBody, parseVisionResponse, DEFAULT_VISION_MODEL } from "./lib/ollama-vision-extract-lib.mjs";
31:const OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";
34:function generatePrint(seed, workDir, difficulty) {
36:  const r = spawnSync(PYTH
... [+1287 chars truncated]

### User | 2026-06-03T19:45:44.358Z

[tool_result] 47:export function percentile(arr, q) {
48-  if (!Array.isArray(arr) || arr.length === 0) return 0;
49-  if (!Number.isFinite(q)) return 0;
50-  const sorted = [...arr].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
51-  if (sorted.length === 0) return 0;
52-  if (sorted.length === 1) return sorted[0];
53-  const clampedQ = Math.max(0, Math.min(1, q));
54-  const idx = clampedQ * (sorted
... [+478 chars truncated]

### Assistant | 2026-06-03T19:47:08.505Z

I now have everything needed. Let me verify the closed-loop's `assumeUnits` and partClass details once more from the grep, and confirm the `aggregateScores.micro_f1` field name alignment. I have the full picture. Let me write up my independent second-pass review.

The closed-loop glue (lines 34-58) confirms the comparison points:
- `generatePrint`: `--units in`, `--difficulty`, timeout `60000` — matches `vision-ab-compare`'s `GEN_TIMEOUT_MS = 60000` and `--units "in"`.
- `ocrPng`: `buildVisionPrompt("generic")`, `buildOllamaRequestBody(..., {model})`, curl `--max-time "200"`, `maxBuffer 64MB`, `parseVisionResponse(raw, {assumeUnits:"in"})` — all match `vision-ab-compare`.

Here is my review.

---

## Independent Second-Pass Review — vision-ab-compare.mjs + test

**Verdict: PASS** (no P0; no P1). Several P2/P3 observations worth logging. The pure core is deterministic, fail-soft, and integrates coherently with the `vision-model-select` seam. The impure shell is a faithful, behaviorally-consistent clone of the closed-loop glue.

### 1. INTEGRATION — buildUpgradeRecommendation ↔ vision-model-select seam: COHERENT

The mapping is sound and operator-actionable:

- `vision-ab-compare.mjs:314` instructs the operator to `add "<rec>" to BIG_VISION_PREFERENCE (or set PRISM_VISION_MODEL)`. This maps exactly onto the two real upgrade levers in `vision-model-select.mjs`: the `BIG_VISION_PREFERENCE` walk (select line 244-256) and the `PRISM_VISION_MODEL` override (select line 225-240). Correct.
- `alreadySelected` (line 308) compares `verdict.recommendedModel` against `selection.model` — `selectVisionModel` returns `{model}` (select line 247/261), so the field name matches. Correct.
- The "stay" path recommends the baseline `DEFAULT_VISION_MODEL` = `qwen3-vl:8b-instruct`, which is exactly `SAFE_DEFAULT_VISION_MODEL` in the seam (select line 56). The zero-regression default is consistent across both files.

One **P2 integration gap worth noting** (not a bug, an incompleteness): `b
... [+11893 chars truncated]
