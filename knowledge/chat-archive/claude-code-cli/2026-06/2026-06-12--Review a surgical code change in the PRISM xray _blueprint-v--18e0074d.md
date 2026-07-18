---
type: "chat-session"
source: "claude-code-cli"
session_id: "18e0074d-ee7c-40cb-af1e-bfafb1d61025"
title: "Review a surgical code change in the PRISM xray (blueprint-vision) OCR pipeline,"
date: "2026-06-12"
first_ts: "2026-06-12T03:45:57.575Z"
last_ts: "2026-06-12T03:47:34.237Z"
cwd: "H:\\prism-slot-xray"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-xray/18e0074d-ee7c-40cb-af1e-bfafb1d61025/subagents/agent-a1b64c86d0703bf79.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a surgical code change in the PRISM xray (blueprint-vision) OCR pipeline,

> **claude-code-cli** | 2026-06-12 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/18e0074d-ee7c-40cb-af1e-bfafb1d61025/subagents/agent-a1b64c86d0703bf79.jsonl`

## Transcript

### User | 2026-06-12T03:45:57.575Z

Review a surgical code change in the PRISM xray (blueprint-vision) OCR pipeline, in worktree H:/prism-slot-xray. UNIT: U-XRAY-FORMAT-JSON-FIX — thread an OPTIONAL, DEFAULT-OFF Ollama `format:"json"` constrained-decoding param through the vision-extraction call chain to recover the ~30-37% qwen2.5vl:7b runaway-JSON dropout (an unconstrained num_predict:4096 free-generation hits the cap mid-structure -> malformed JSON -> whole-print parse-fail).

Read these 3 source files END-TO-END and verify the change:
1. scripts/lib/ollama-vision-extract-lib.mjs — `buildOllamaRequestBody()` (~line 394-437): the `format` is added as a TOP-LEVEL field (sibling of stream/think, NOT inside options{}) via `...(opts.format ? { format: opts.format } : {})`.
2. scripts/run-ollama-vision-extract.mjs — `parseArgs` adds `format:null` default + `--format-json` flag; `callOllamaVision(... , format)` 6th param threaded into buildOllamaRequestBody; extractPage call site passes `args.format`.
3. scripts/lib/vision-ensemble-fuse.mjs — `ocrImageWithModelAsync` passes `format: a.format`; `runEnsembleOverImage` threads `format: a.format` into each per-model call.

VERIFY (flag P0/P1 with file:line):
- **DEFAULT-OFF / byte-identical-legacy invariant**: when no format is supplied anywhere, is the emitted request body BYTE-IDENTICAL to before the change? (the spread must omit the key for undefined/null/falsy). Trace every call site that does NOT pass format.
- **Top-level placement**: `format` must be a top-level Ollama /api/generate field, NEVER inside `options{}` (Ollama ignores format inside options — silent no-op bug). Confirm.
- **Threading completeness**: is there any call path to buildOllamaRequestBody that the new param does NOT reach but SHOULD (so a user opting in via one entry point silently gets unconstrained decode)? Enumerate all callers of buildOllamaRequestBody and ocrImageWithModelAsync.
- **Falsy handling**: format="" or 0 — omitted (correct) or passed (bug)?
- Comment accuracy / ASCII
... [+221 chars truncated]

### Assistant | 2026-06-12T03:46:01.239Z

I'll review this surgical change. Let me start by reading all three source files end-to-end in parallel.

### Assistant | 2026-06-12T03:46:01.729Z

[tool_use: Read]

### Assistant | 2026-06-12T03:46:02.656Z

[tool_use: Read]

### Assistant | 2026-06-12T03:46:02.762Z

[tool_use: Read]

### User | 2026-06-12T03:46:09.739Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+30711 chars truncated]

### User | 2026-06-12T03:46:09.828Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/run-ollama-vision-extract.mjs
3	//
4	// U-TDP06 — Ollama Vision Extractor CLI.
5	//
6	// Renders a blueprint PDF to PNG via PyMuPDF (Python subprocess), calls the
7	// local Ollama vision model, parses the JSON response into BlueprintExtraction
8	// shape, optionally emits an event into blueprint-accuracy-events.jsonl to
9	// flow into U-BPA-CONSUMER + U-TDP03 ag
... [+17268 chars truncated]

### User | 2026-06-12T03:46:09.829Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+24904 chars truncated]

### Assistant | 2026-06-12T03:46:13.748Z

I've read all three files end-to-end. Now let me verify the completeness of the threading claim by enumerating ALL callers of `buildOllamaRequestBody` and `ocrImageWithModelAsync` across the entire worktree — this is the critical adversarial check.

### Assistant | 2026-06-12T03:46:14.691Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:46:15.459Z

[tool_use: Grep]

### User | 2026-06-12T03:46:21.288Z

[tool_result] scripts\lib\vision-ensemble-fuse.mjs:50:  buildOllamaRequestBody,
scripts\lib\vision-ensemble-fuse.mjs:379:  const body = buildOllamaRequestBody(prompt, a.imageBase64, { model: a.model, format: a.format });
scripts\lib\ollama-vision-extract-lib.test.mjs:11:  buildOllamaRequestBody,
scripts\lib\ollama-vision-extract-lib.test.mjs:40:// -- buildOllamaRequestBody: format:"json" constrained-decode opt-
... [+4360 chars truncated]

### User | 2026-06-12T03:46:21.340Z

[tool_result] state\shared\specs\XRAY-REGAIN-LEDGER-2026-06-11.md:192:3. **`scripts/lib/vision-ensemble-fuse.mjs:379`** — `ocrImageWithModelAsync()` calls `buildOllamaRequestBody(prompt, a.imageBase64, { model: a.model })`. Add `format: a.format` to the opts object; plumb `a.format:'json'` from the `runEnsembleOverImage` caller.
scripts\lib\vision-ensemble-fuse.mjs:40://   ocrImageWithModelAsync · runEnsembleOv
... [+185 chars truncated]

### Assistant | 2026-06-12T03:46:24.662Z

Three production callers of `buildOllamaRequestBody` confirmed (lib def, run-ollama line 175, ensemble line 379), plus the test file. Now let me check callers of `runEnsembleOverImage` to see if there's an entry point above the ensemble that should thread `format` but doesn't, and read the test file to verify test coverage matches the claims.

### Assistant | 2026-06-12T03:46:25.590Z

[tool_use: Grep]

### Assistant | 2026-06-12T03:46:26.520Z

[tool_use: Read]

### User | 2026-06-12T03:46:30.352Z

[tool_result] scripts\lib\vision-ensemble-fuse.test.mjs:16:  runEnsembleOverImage,
scripts\lib\vision-ensemble-fuse.test.mjs:254:// ── runEnsembleOverImage (impure shell, fully dependency-injected — no GPU/Ollama) ──
scripts\lib\vision-ensemble-fuse.test.mjs:280:test("runEnsembleOverImage: concurrent run, one model fails → ensemble still fuses survivors", async () => {
scripts\lib\vision-ensemble-fuse.test.mjs:
... [+1491 chars truncated]

### User | 2026-06-12T03:46:33.048Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.test.mjs
2	// Tests for the rich multi-zone Ollama vision extractor pure core
3	// (U-TDP06 + U-PSGB-XRAY-RICH-SCHEMA). Run: node --test <file>
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	
8	import {
9	  buildVisionPrompt,
10	  parseVisionResponse,
11	  buildOllamaRequestBody,
12	  repairTruncatedJson,
13	  repairLe
... [+5262 chars truncated]

### Assistant | 2026-06-12T03:46:38.174Z

The threading is verified. Now let me confirm the `runEnsembleOverImage` entry point threads `format` to `ocrImageWithModelAsync` (line 428 already showed `format: a.format`), and check whether there's any HIGHER-level caller of `runEnsembleOverImage` in production that would be the real CLI entry point silently dropping format. The grep shows only the test file calls it — no production CLI wraps the ensemble yet. Let me verify the ensemble test assertions and confirm the JSDoc on `runEnsembleOverImage` documents the `format` param (a completeness/comment-accuracy check).

### Assistant | 2026-06-12T03:46:39.184Z

[tool_use: Read]

### User | 2026-06-12T03:46:42.687Z

[tool_result] 254	// ── runEnsembleOverImage (impure shell, fully dependency-injected — no GPU/Ollama) ──
255	
256	// Fake curl spawn returning a canned {status,out} per call, in invocation order. Emits on a
257	// microtask so the Promise-based curlAsync settles asynchronously, exercising the real path.
258	function fakeSpawnSeq(responses) {
259	  let i = 0;
260	  return () => {
261	    const r = responses[i++
... [+4241 chars truncated]

### Assistant | 2026-06-12T03:46:46.178Z

I now have everything needed. Let me also verify the `runEnsembleOverImage` JSDoc `@param` block to check whether `format` is documented (comment-accuracy), since line 411-410 destructures `a.format` but I want to confirm the param doc lists it.

### Assistant | 2026-06-12T03:46:46.989Z

[tool_use: Read]

### User | 2026-06-12T03:46:54.488Z

[tool_result] 394	/**
395	 * Impure: run an ensemble of VLMs over ONE image CONCURRENTLY, then fuse. The image is read
396	 * + base64'd ONCE and shared across all models (one disk read, N inferences). Every model
397	 * runs in parallel via Promise.all — the Blackwell exploit. One model's failure is recorded
398	 * and excluded from the fuse; the ensemble still produces a result from the survivors.
399	 *
400	
... [+1919 chars truncated]

### Assistant | 2026-06-12T03:47:34.237Z

I have everything needed for a complete adversarial review. Let me record the final analysis.

## Code Quality Analysis Report — U-XRAY-FORMAT-JSON-FIX

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 3 source + 2 test (read for cross-verification)
- Issues Found: 0 P0, 0 P1, 2 P2 (non-blocking), 1 P3
- Technical Debt Estimate: ~0.25 hour (P2 doc-completeness only)

All five VERIFY criteria PASS. This is a textbook surgical, default-off, byte-identical-legacy change. The threading is complete across every production call path.

---

### Per-file verdict

**1. `scripts/lib/ollama-vision-extract-lib.mjs` — PASS**
- `buildOllamaRequestBody` (line 394-436): `format` added at line 416 via `...(opts.format ? { format: opts.format } : {})` as a **top-level sibling** of `stream`/`think`/`options` — correct. It is NOT inside `options{}` (lines 417-434). Confirmed at `ollama-vision-extract-lib.mjs:416`.
- Comment (lines 408-415) is accurate: explains server-side GBNF, default-off byte-identity, the dropout mechanism, and that both `"json"` and a schema object are valid Ollama `format` values. No inline physics constants, ASCII-only, no stub.

**2. `scripts/run-ollama-vision-extract.mjs` — PASS**
- `parseArgs` default `format: null` (line 58); `--format-json` sets `out.format = "json"` (line 77). Correct.
- `extractPage` passes `args.format` into `callOllamaVision(..., args.format)` (line 158).
- `callOllamaVision(model, prompt, imageBase64, timeoutMs, numCtx, format)` — 6th param threaded into `buildOllamaRequestBody(prompt, imageBase64, { model, modelOptions, format })` (line 175). Correct.

**3. `scripts/lib/vision-ensemble-fuse.mjs` — PASS**
- `ocrImageWithModelAsync` passes `format: a.format` into `buildOllamaRequestBody` (line 379); JSDoc lists `format?:(string|object)` (line 367). Correct and documented.
- `runEnsembleOverImage` threads `format: a.format` into each per-model `ocrImageWithModelAsync` call (line 428). Correct.

---

### VERIFY criteria — adv
... [+5509 chars truncated]
