---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Independent second-pass review of an OCR-runner wiring change. Grade PASS/FAIL w"
date: "2026-06-03"
first_ts: "2026-06-03T18:49:53.728Z"
last_ts: "2026-06-03T18:56:04.155Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 19
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-ae96b7a09a2d840d2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review of an OCR-runner wiring change. Grade PASS/FAIL w

> **claude-code-cli** | 2026-06-03 | 47 msgs (19 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-ae96b7a09a2d840d2.jsonl`

## Transcript

### User | 2026-06-03T18:49:53.728Z

Independent second-pass review of an OCR-runner wiring change. Grade PASS/FAIL with every P0/P1 + line number, weighted toward what a first reviewer misses: hidden coupling, other callers, logging/output contract, operator ergonomics.

File: H:/prism/scripts/run-ollama-vision-extract.mjs (wires in the new H:/prism/scripts/lib/vision-model-select.mjs).

Change summary: `--model` now defaults to null and is auto-resolved by a new `resolveVisionModel()` (profile/VRAM-aware: on a 96GB RTX 6000 it can upgrade off the hardcoded qwen3-vl:8b-instruct; explicit --model is an operator force). Added model_reason/vram_gb/vision_tier to the JSON result and a "[vision] model=..." log line.

Focus:
1. OTHER CALLERS: grep the repo for scripts that invoke run-ollama-vision-extract.mjs (e.g. scripts/ocr-closed-loop.mjs, any batch runner, blueprint-ocr-batch). Do they pass --model explicitly? If a batch caller relied on the OLD default behavior (always 8b-instruct) and does NOT pass --model, will the new auto-resolve change their behavior? Today on a 16GB host it resolves to the same 8b-instruct, and on a 96GB host with nothing bigger pulled also 8b-instruct — so behavior should be unchanged today. CONFIRM that, and flag if any caller would be surprised.
2. OUTPUT CONTRACT: the JSON result grew 3 fields (model_reason, vram_gb, vision_tier). Does any downstream consumer parse this JSON strictly (schema validation, exact-shape assertion) that the new fields would break? Check the closed-loop / benchmark consumers.
3. PERF: probeTotalVramGB spawns nvidia-smi (≤10s) and fetchAvailableVisionModels fetches /api/tags (≤8s) once per runner invocation. For a BATCH that spawns the runner per-PDF, that's nvidia-smi + a fetch per PDF — is that an acceptable cost, or should resolution be hoisted/cached? Note it but it's likely P2.
4. ERGONOMICS: is the logged reason/warning clear to an operator? Is the explicit-model warning (thinking trap) surfaced loudly enough?
5. Does the prereq comment block 
... [+224 chars truncated]

### Assistant | 2026-06-03T18:50:03.339Z

I'll review this OCR-runner wiring change. Let me start by reading the changed file, the library it wires in, and then hunt for callers.

### Assistant | 2026-06-03T18:50:03.941Z

[tool_use: Read]

### Assistant | 2026-06-03T18:50:04.808Z

[tool_use: Read]

### User | 2026-06-03T18:50:05.777Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-model-select.mjs' was already read 7s ago in this session and is unchanged (mtime 1780512151962). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:51:20.991Z

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

### Assistant | 2026-06-03T18:51:25.587Z

The vision-model-select.mjs read was deduped — I need its content. Let me grep for the key exports and read the lib, plus hunt for callers in parallel.

### Assistant | 2026-06-03T18:51:26.577Z

[tool_use: Read]

### Assistant | 2026-06-03T18:51:27.396Z

[tool_use: Grep]

### User | 2026-06-03T18:51:29.884Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+3169 chars truncated]

### User | 2026-06-03T18:51:52.110Z

[tool_result] .audit-wh.json:75:      "scripts/run-ollama-vision-extract.mjs": 1,
.audit-wh.json:1126:      "file": "scripts/run-ollama-vision-extract.mjs",
mcp-server\data\state\session-file-ownership.json:167:    "scripts/run-ollama-vision-extract.mjs": {
knowledge\wiki\code-tribal\learnings\per-slot-galaxy-buildout-u-psgb-xray-scan-preprocess.md:30:run-ollama-vision-extract.mjs: +--grayscale/--preprocess/--d
... [+4683 chars truncated]

### Assistant | 2026-06-03T18:52:03.819Z

The grep shows no `.mjs`/`.py` caller invokes `run-ollama-vision-extract.mjs` directly — only docs, wiki, audit JSON, and hook-cache references. Let me find the actual batch/closed-loop callers mentioned in the brief, since they may invoke it via spawn with a different string form (e.g. `vision-extract`, or via `node` + path).

### Assistant | 2026-06-03T18:52:05.171Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:52:05.496Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:52:07.696Z

[tool_use: Glob]

### User | 2026-06-03T18:52:12.322Z

[tool_result] Found 15 files
scripts\run-ollama-vision-extract.mjs
scripts\lib\catalog-extraction-router.mjs
scripts\lib\catalog-gpu-profile.mjs
scripts\lib\vision-model-select.mjs
scripts\ocr-closed-loop.mjs
scripts\lib\dimension-set-score.mjs
scripts\page-classify.mjs
scripts\lib\page-classifier-lib.mjs
scripts\db-toolbelt.mjs
scripts\batch-ollama-vision-extract.mjs
scripts\lib\blueprint-extract-io.mjs
script
... [+170 chars truncated]

### User | 2026-06-03T18:52:22.003Z

[tool_result] scripts\lib\ocr-benchmark-lib.mjs
scripts\lib\ocr-benchmark-lib.test.mjs
scripts\run-ocr-benchmark.mjs
scripts\build-blueprint-ocr-worklist.mjs
scripts\build-blueprint-ocr-worklist.test.mjs
scripts\blueprint-ocr-review.mjs
scripts\blueprint-ocr-review.test.mjs
scripts\run-ocr-batch-overnight.ps1
scripts\ocr-closed-loop.mjs

### User | 2026-06-03T18:52:23.299Z

[tool_result] scripts\run-ollama-vision-extract.test.mjs
scripts\batch-ollama-vision-extract.test.mjs
scripts\lib\ollama-vision-extract-lib.mjs
scripts\lib\ollama-vision-extract-lib.test.mjs
scripts\batch-ollama-vision-extract.mjs
scripts\lib\vision-model-select.mjs
scripts\lib\vision-model-select.test.mjs
scripts\run-ollama-vision-extract.mjs

### Assistant | 2026-06-03T18:52:27.909Z

The two key callers are `scripts/batch-ollama-vision-extract.mjs` and `scripts/ocr-closed-loop.mjs`. Let me read both, plus the lib (for DEFAULT_VISION_MODEL and buildOllamaRequestBody contract) and the rest of vision-model-select.mjs.

### Assistant | 2026-06-03T18:52:28.293Z

[tool_use: Read]

### Assistant | 2026-06-03T18:52:28.930Z

[tool_use: Read]

### User | 2026-06-03T18:52:40.003Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/batch-ollama-vision-extract.mjs
3	//
4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
5	//
6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
8	// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
9	// sat
... [+13844 chars truncated]

### User | 2026-06-03T18:52:40.024Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-closed-loop.mjs
3	//
4	// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
5	//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
6	//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
7	//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
8	//   → AGG
... [+8396 chars truncated]

### Assistant | 2026-06-03T18:52:50.733Z

Now I have both callers. Key findings on caller behavior:

1. **`batch-ollama-vision-extract.mjs`** — does NOT pass `--model` to the single runner (`buildPrintArgs` line 146-155 has no `--model`). So when the batch spawns `run-ollama-vision-extract.mjs`, the runner will now auto-resolve. The batch ALSO has its OWN `VL_MODEL` (line 47) that it warms onto the GPU via `claimGpu`. This is a real coupling concern — let me verify.

2. **`ocr-closed-loop.mjs`** — does NOT spawn the runner at all. It imports lib functions directly and uses its own `--model` defaulting to `DEFAULT_VISION_MODEL`. So it's unaffected by the runner change, but it parses NO JSON from the runner. Not a consumer of the runner's JSON output.

Let me now read the rest of vision-model-select.mjs (the selection logic + probes) and the lib's DEFAULT_VISION_MODEL + buildOllamaRequestBody, plus check the JSON consumers (anything parsing the runner's stdout JSON).

### Assistant | 2026-06-03T18:52:51.713Z

[tool_use: Read]

### Assistant | 2026-06-03T18:52:52.141Z

[tool_use: Read]

### User | 2026-06-03T18:53:39.123Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+23135 chars truncated]

### User | 2026-06-03T18:53:40.291Z

[tool_result] 50	import { spawnSync as nodeSpawnSync } from "node:child_process";
51	
52	import { DEFAULT_VISION_MODEL } from "./ollama-vision-extract-lib.mjs";
53	
54	// The 16GB-safe default — re-exported from the OCR lib so there is ONE source of
55	// truth for "today's model". Do NOT redefine the literal here (drift hazard).
56	export const SAFE_DEFAULT_VISION_MODEL = DEFAULT_VISION_MODEL;
57	
58	// A host
... [+12849 chars truncated]

### Assistant | 2026-06-03T18:53:55.672Z

Now I have the full picture. Let me read the rest of vision-model-select.mjs (the fetchAvailableVisionModels probe, lines 299+) and check whether anything consumes the runner's JSON `result` strictly. Let me also check the test file to understand the expected output contract, and grep for consumers of `blueprint-accuracy-events.jsonl` / the runner's stdout JSON shape.

### Assistant | 2026-06-03T18:53:55.674Z

[tool_use: Read]

### Assistant | 2026-06-03T18:53:55.680Z

[tool_use: Grep]

### User | 2026-06-03T18:54:00.117Z

[tool_result] 299	    return null;
300	  }
301	}
302	
303	/**
304	 * Impure: enumerate pulled ollama model ids from /api/tags. Returns [] on any
305	 * failure (→ availability gate disabled, selector falls back safely). Never throws.
306	 *
307	 * @param {string} [ollamaUrl]
308	 * @param {{ fetch?: Function, timeoutMs?: number }} [deps]
309	 * @returns {Promise<string[]>}
310	 */
311	export async function fetc
... [+879 chars truncated]

### User | 2026-06-03T18:54:01.868Z

[tool_result] <persisted-output>
Output too large (26.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\b3f47ec7-5613-49ad-a7a9-19371bba1ac7\tool-results\toolu_01JErGaFBs9CyoqG6x4HXck1.txt

Preview (first 2KB):
scripts\aggregate-extractions-to-template.mjs:110:    skipped: report.summary.skipped,
scripts\agents\spawned-agent-context-lib.mjs:468:  lines.push(`- **Master indexes:** ${indexes?.s
... [+1758 chars truncated]

### Assistant | 2026-06-03T18:54:11.459Z

The grep was too broad (matched `.summary.` everywhere). Let me narrow to consumers of the runner's specific output fields and the events file. The batch caller reads `r.summary.pages_ok` / `pages_processed` — those still exist. Let me check the events-file consumers and the runner's test for exact-shape assertions.

### Assistant | 2026-06-03T18:54:13.506Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:54:13.983Z

[tool_use: Read]

### User | 2026-06-03T18:54:16.358Z

[tool_result] read-once-guard: 'H:\prism\scripts\run-ollama-vision-extract.test.mjs' was already read 4m ago in this session and is unchanged (mtime 1780161950015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T18:54:19.281Z

[tool_result] .claude\scripts\scrutiny-3way.mjs:133:  : ["--no-install", "codex", "exec", "--skip-git-repo-check", "-c", "model_reasoning_effort=\"medium\""];
.claude\scripts\scrutiny-3way.mjs:609:    "-c", `model_reasoning_effort="${effort}"`,
.claude\hooks\xray-blueprint-domain-inject.mjs:109:    "FAST SEARCH = juliett's stores (R8 — SEARCH the paid-for extraction, NEVER re-OCR 257K PDFs): mcp-server/data/jm-
... [+3627 chars truncated]

### Assistant | 2026-06-03T18:54:29.145Z

The test file is in my context already from an earlier read. Let me verify the key facts I need confirmed:

1. The events-file consumers (`blueprint-accuracy-consumer.mjs`, `blueprint-ocr-review.mjs`, `aggregate-extractions-to-template.mjs`) read the `outcome_record` event — NOT the runner's stdout `result` JSON. The 3 new fields (`model_reason`, `vram_gb`, `vision_tier`) are only on the stdout `result`, and `buildPageEvent` (lines 214-235) does NOT add them to the event payload. So event consumers are unaffected. Confirmed by reading line 314 (`buildPageEvent(args, pi, pc.count, r.extraction)`) — the event shape didn't change.

2. The only consumer of the runner's stdout JSON is the batch runner (line 164 `JSON.parse(res.stdout)`), reading `pages_ok` / `pages_processed` — both still present. JSON.parse of a superset object is non-strict, so the 3 added fields don't break it.

Let me confirm the events consumer doesn't do strict-shape validation on the event, and check the test for any exact-shape assertion on the result. Let me grep the test for the relevant assertions.

### Assistant | 2026-06-03T18:54:30.353Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:54:31.513Z

[tool_use: Grep]

### User | 2026-06-03T18:54:35.066Z

[tool_result] No matches found

### User | 2026-06-03T18:54:36.468Z

[tool_result] No matches found

### Assistant | 2026-06-03T18:54:45.410Z

The test file does NOT assert on `model`, `model_reason`, `vision_tier`, or `vram_gb`, and does NOT use exact-shape/deepStrictEqual assertions. The events consumer does NOT do strict-shape validation. Both output contracts are safe.

Let me confirm one last thing — the test file's actual coverage of the new `resolveVisionModel` path and whether the prereq comment was updated. Let me look at the test file content directly (it's in my earlier context, but let me grep its structure to be precise).

### Assistant | 2026-06-03T18:54:46.551Z

[tool_use: Grep]

### User | 2026-06-03T18:54:51.259Z

[tool_result] 3:// The render+VLM loop is integration-tested separately (GPU-bound); selectPages
7:import { test } from "node:test";
8:import assert from "node:assert/strict";
9:import { selectPages, buildRenderArgs } from "./run-ollama-vision-extract.mjs";
11:test("selectPages: default (no opts) → ALL pages (the multi-print fix)", () => {
12:  assert.deepEqual(selectPages(4), [0, 1, 2, 3]);
13:  assert.deepEqu
... [+3249 chars truncated]

### Assistant | 2026-06-03T18:56:04.155Z

I have everything I need. The runner's test file (`run-ollama-vision-extract.test.mjs`) covers only `selectPages` + `buildRenderArgs` — it does NOT test `resolveVisionModel` (the new function), which is consistent with the comment that the render+VLM loop is integration-tested separately, and `resolveVisionModel`'s pure innards live in `vision-model-select.mjs` (which has its own test file per the Glob: `vision-model-select.test.mjs`). The runner-level `resolveVisionModel` wrapper is the only thin untested seam.

Let me do final verification on the two coupling questions that matter most: (1) confirm the batch's `claimGpu` warms `VL_MODEL` (its own env-derived default) while the spawned runner now auto-resolves independently — a potential model-mismatch, and (2) confirm `PRISM_VISION_MODEL` env reconciles them. I have all the code. Now I'll write the review.

## Independent Second-Pass Review — VERDICT: PASS (with 1 P1 + 3 P2)

Reviewed `H:/prism/scripts/run-ollama-vision-extract.mjs` and its new dependency `scripts/lib/vision-model-select.mjs`, against the two real callers (`batch-ollama-vision-extract.mjs`, `ocr-closed-loop.mjs`), the shared lib (`ollama-vision-extract-lib.mjs`), the event consumers, and the test file. The core change is sound, strictly-additive, and fail-safe. One real coupling gap that a first-pass reviewer would likely miss, plus three lower-severity items.

---

### 1. OTHER CALLERS — CONFIRMED today-unchanged, but a P1 latent coupling exists

Two scripts touch the runner:

- **`ocr-closed-loop.mjs`** — does NOT spawn the runner. It imports lib functions directly (`buildOllamaRequestBody`, `parseVisionResponse`) and uses its own `--model` defaulting to `DEFAULT_VISION_MODEL` (line 25, 67). Completely unaffected by this change. No JSON-from-runner parsing. ✅
- **`batch-ollama-vision-extract.mjs`** — spawns the runner per-PDF via `buildPrintArgs` (lines 146-155). It does **NOT** pass `--model`. So every batched print now goes through the new aut
... [+10436 chars truncated]
