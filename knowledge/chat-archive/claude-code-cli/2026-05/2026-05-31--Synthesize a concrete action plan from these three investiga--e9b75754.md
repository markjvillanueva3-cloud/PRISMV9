---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Synthesize a concrete action plan from these three investigation results. Reason"
date: "2026-05-31"
first_ts: "2026-05-31T22:37:27.365Z"
last_ts: "2026-05-31T22:43:48.301Z"
cwd: "H:\\prism-slot-xray"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a940d957d7ed7e276.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Synthesize a concrete action plan from these three investigation results. Reason

> **claude-code-cli** | 2026-05-31 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_83e0856c-6f5/agent-a940d957d7ed7e276.jsonl`

## Transcript

### User | 2026-05-31T22:37:27.365Z

Synthesize a concrete action plan from these three investigation results. Reason strictly against the live empirical data — reject any config the data already refutes.

LIVE EMPIRICAL DATA (RTX 4080 SUPER 16GB, Ollama 0.24.0 bare 'ollama.exe serve', Windows 11):
- GPU total 16376 MiB. OS/desktop baseline ~4.5GB (dwm/explorer/Firefox/Docker Desktop), so ~11.8GB free for ML.
- qwen2.5vl:7b disk size 6.0GB. LOADED footprint at num_ctx=8192 = 15.3GB (per /api/ps size_vram). 15.3 > 11.8 free => spills ~3.5GB to CPU => >180s/page => the runner's 180s timeout aborts ("This operation was aborted"). Even WARM (model already resident) it still aborts. NO coder model was loaded during these tests — the blocker is purely the vision model footprint vs free VRAM, NOT fleet contention.
- DPI does NOT change the loaded footprint: dpi 200/130/100 all => 15.3GB (footprint allocated at model-load from num_ctx; image vision-tokens consume CONTEXT slots, not the allocated KV size).
- num_ctx=4096 (dpi130): still aborted at ~190s (footprint still too big / still spilled).
- num_ctx=2048 (dpi130): completed in 127s (faster => fit better on GPU, less spill) BUT "parse: empty response" — image vision-tokens + prompt filled the tiny 2048 context, leaving ~0 tokens for the 4096-token JSON output.
- Request body today: options.num_ctx=8192, options.num_predict=4096, temperature=0.1, stream=false. /api/generate endpoint. The rich JSON output (title_block+dimensions+gdt+notes+profiles+surface_finishes) needs ~2000-4000 output tokens; repairTruncatedJson is a safety net.
- Ollama env today: OLLAMA_MAX_LOADED_MODELS=3, OLLAMA_NUM_PARALLEL=3, OLLAMA_KEEP_ALIVE=5m, OLLAMA_FLASH_ATTENTION unset, OLLAMA_KV_CACHE_TYPE unset.
- Other available models: qwen2.5-coder:3b/7b/14b/32b, moondream:1.8b (useless-parrots-prompt), llama3.2-vision:11b (7.8GB disk), nomic-embed-text, deepseek-r1:14b.
- GOAL: run qwen2.5vl:7b GPU-RESIDENT (completes <90s/page) for an unattended overnight blueprint-OCR batch CONCURREN
... [+57104 chars truncated]

### Assistant | 2026-05-31T22:37:42.366Z

I'll start by verifying the load-bearing claims against the live PRISM code referenced in the third investigation lane, since the coordination mechanism depends on exact function signatures that I must not hallucinate.

### Assistant | 2026-05-31T22:37:44.733Z

[tool_use: Grep]

### Assistant | 2026-05-31T22:37:46.398Z

[tool_use: Grep]

### User | 2026-05-31T22:38:01.972Z

[tool_result] 59:const CONFIDENCE_THRESHOLD = 0.80;
61:// inject threshold matches CONFIDENCE_THRESHOLD — eliminates the
65:// FLEET-REAPER-MS1: hard clamp on the hint's thresholdDelta — mirrors the
68:const HINT_THRESHOLD_DELTA_CAP = 0.30;
79:// CONFIDENCE_THRESHOLD → recorded as silent suggest instead of offload).
206: * offload MORE aggressively (a NEGATIVE thresholdDelta lowers the confidence
213: * @return
... [+946 chars truncated]

### User | 2026-05-31T22:38:03.065Z

[tool_result] 219:// documented OOM-blinding failure mode: under ~96% commit even the reaper's own
251:export const DEFAULT_OLLAMA_PREWARM_MODEL = "qwen2.5-coder:7b";
262:export const DEFAULT_OLLAMA_KEEP_ALIVE = "-1";
1101:  // ONLY (the GPU probe), and PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE / --no-coord
1257:export function decideOllamaCoordination({ mem, gpu, ollama, slotCounts, cfg } = {}) {
1259:  const pr
... [+1716 chars truncated]

### Assistant | 2026-05-31T22:38:07.007Z

The code confirms the third lane's claims precisely. Let me verify the two remaining load-bearing facts: the consumer's hard-reject of non-aggressive modes (the gap requiring a new branch), and the writeRoutingHint mode mapping. Let me read the exact consumer branch and the batch runner's keep_alive handling.

### Assistant | 2026-05-31T22:38:08.364Z

[tool_use: Read]

### Assistant | 2026-05-31T22:38:08.922Z

[tool_use: Read]

### User | 2026-05-31T22:38:21.708Z

[tool_result] 204	 * The fleet-reaper coordinator writes this file when the host is under memory
205	 * pressure AND the GPU can absorb more Ollama work — it nudges this hook to
206	 * offload MORE aggressively (a NEGATIVE thresholdDelta lowers the confidence
207	 * bar so more tasks clear it). Best-effort + fail-soft: a missing / corrupt /
208	 * expired / non-aggressive hint returns null (no behaviour change)
... [+2308 chars truncated]

### User | 2026-05-31T22:38:21.711Z

[tool_result] 1344	export function writeRoutingHint(decision, { now = Date.now(), path = DEFAULT_HINT_PATH, hintTtlSec } = {}) {
1345	  const ttlSec = Number.isFinite(hintTtlSec)
1346	    ? Math.max(1, Math.min(MAX_HINT_TTL_SEC, hintTtlSec))
1347	    : DEFAULT_HINT_TTL_SEC;
1348	  const aggressive = !!(decision && decision.shouldHintOffload);
1349	  const rawDelta = decision && Number.isFinite(decision.threshol
... [+1282 chars truncated]

### Assistant | 2026-05-31T22:38:25.776Z

Confirmed. The consumer hard-rejects any mode != `"aggressive-offload"` (line 240) and the producer hard-maps `mode` to `aggressive-offload`/`auto` only (line 1355). So a `suppress-offload` mode needs an additive consumer branch AND a producer path. Now let me verify the batch runner's keep_alive handling and num_ctx plumbing — the "one gap" the third lane flagged.

### Assistant | 2026-05-31T22:38:27.666Z

[tool_use: Grep]

### Assistant | 2026-05-31T22:38:28.084Z

[tool_use: Glob]

### User | 2026-05-31T22:38:45.669Z

[tool_result] 12://   1. GPU-claim — unload the fleet coder model(s), warm qwen2.5vl (num_ctx 8192,
13://      long keep_alive) so it stays GPU-resident for the whole run.
41:const CODER_MODELS = ["qwen2.5-coder:7b", "qwen2.5-coder:3b", "qwen2.5-coder:14b", "qwen2.5-coder:32b", "nomic-embed-text", "deepseek-r1:14b"];
42:const VL_MODEL = env.PRISM_VISION_MODEL || "qwen2.5vl:7b";
116:async function claimGpu(numCt
... [+929 chars truncated]

### User | 2026-05-31T22:38:52.064Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-31T22:38:55.309Z

Let me find the single-print runner to verify whether it passes keep_alive and num_ctx on its per-page request, and locate where num_ctx/num_predict are sent in the actual generate body.

### Assistant | 2026-05-31T22:38:56.015Z

[tool_use: Glob]

### Assistant | 2026-05-31T22:38:57.896Z

[tool_use: Read]

### User | 2026-05-31T22:39:28.076Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-31T22:39:33.977Z

[tool_result] 125	  if (vl) return { resident: false, vramGB: 0, note: "loaded to CPU (size_vram=0) — contention; will be slow" };
126	  return { resident: false, vramGB: 0, note: "VL not loaded (warm failed)" };
127	}
128	
129	// ── single-print spawn ─────────────────────────────────────────────
130	
131	/**
132	 * Pure: build the single-print runner argv. Exported so the flag-forwarding is
133	 * UNIT-TESTED
... [+1741 chars truncated]

### Assistant | 2026-05-31T22:39:39.208Z

The critical finding confirmed: `buildPrintArgs` (line 138-147) forwards `--dpi`, `--timeout-ms`, page count — but does NOT forward `--num-ctx`, `--num-predict`, or `--keep-alive` to the single-print runner. So the per-page `/api/generate` request in `run-ollama-vision-extract.mjs` uses ITS OWN defaults — the batch's `claimGpu` num_ctx never reaches the actual page request. This is the load-bearing gap. Let me read the single runner's request body directly.

### Assistant | 2026-05-31T22:39:39.804Z

[tool_use: Read]

### User | 2026-05-31T22:39:50.141Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/run-ollama-vision-extract.mjs
3	//
4	// U-TDP06 — Ollama Vision Extractor CLI.
5	//
6	// Renders a blueprint PDF to PNG via PyMuPDF (Python subprocess), calls the
7	// local Ollama vision model, parses the JSON response into BlueprintExtraction
8	// shape, optionally emits an event into blueprint-accuracy-events.jsonl to
9	// flow into U-BPA-CONSUMER + U-TDP03 ag
... [+3507 chars truncated]

### Assistant | 2026-05-31T22:39:53.192Z

The single runner has `--num-ctx` (default 8192) and `--model` flags. Let me check the request body builder to confirm exactly which options get sent (num_ctx, num_predict, keep_alive, temperature) and confirm there's no `--keep-alive` flag on the single runner.

### Assistant | 2026-05-31T22:39:54.721Z

[tool_use: Grep]

### User | 2026-05-31T22:41:13.029Z

[tool_result] 370:export function buildOllamaRequestBody(prompt, imageBase64, opts = {}) {
378:      temperature: 0.1,
379:      // num_predict 4096: the rich multi-zone schema (title_block + dimensions +
383:      num_predict: 4096,
384:      // num_ctx CAP — load-bearing for GPU residency. qwen2.5vl:7b's DEFAULT
390:      num_ctx: 8192,

### Assistant | 2026-05-31T22:41:15.923Z

[tool_use: Read]

### User | 2026-05-31T22:41:31.996Z

[tool_result] 370	export function buildOllamaRequestBody(prompt, imageBase64, opts = {}) {
371	  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
372	  return {
373	    model,
374	    prompt,
375	    images: [imageBase64],
376	    stream: false,
377	    options: {
378	      temperature: 0.1,
379	      // num_predict 4096: the rich multi-zone schema (title_block + d
... [+1563 chars truncated]

### Assistant | 2026-05-31T22:41:48.587Z

I now have all load-bearing facts verified against live code. Key findings:

1. **Request body** (`buildOllamaRequestBody`): sends `temperature:0.1, num_predict:4096, num_ctx:8192`, NO `keep_alive` (so per-page `/api/generate` defaults to server `OLLAMA_KEEP_ALIVE=5m`), `...opts.modelOptions` is the override seam.
2. **The plumbing gap**: `run-ollama-vision-extract.mjs` has `--num-ctx` (default 8192) and `--model`, but NO `--num-predict` or `--keep-alive` flag. And `buildPrintArgs` in the batch runner forwards neither `--num-ctx` nor `--keep-alive` to the spawned single runner — so the batch's `claimGpu(numCtx)` warms VL at the right ctx, but each PAGE request re-uses the lib default 8192 and 5m keep_alive. There's the eviction + footprint gap.
3. **Coordination**: `loadRoutingHint` hard-rejects mode != `aggressive-offload` (line 240); `writeRoutingHint` only emits `aggressive-offload`/`auto` (line 1355). Suppression needs additive branches in both. `PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE=1` is real (line 1530/3282). `DEFAULT_OLLAMA_KEEP_ALIVE="-1"` + `DEFAULT_OLLAMA_PREWARM_MODEL="qwen2.5-coder:7b"` confirmed (lines 262/251).

Now I'll synthesize. The data REFUTES several configs: ctx=2048 (empty output — confirmed live), ctx>=8192 single-parallel (15.3GB still spills), KV-quant on the vision model (silent f16 fallback, qwen2.5vl not on FA allowlist), DPI as a footprint lever (all DPI = 15.3GB). The data ELEVATES NUM_PARALLEL=1 (3x KV multiplier hypothesis confirmed by source code llm/server.go + FAQ) as the highest-leverage zero-quality-loss lever.

Let me reconcile the footprint arithmetic against the empirical anchor before ranking. The 15.3GB at ctx=8192/parallel=3 is the only hard datum. If NUM_PARALLEL multiplies the context-scaled allocation, then parallel=1 collapses the 3x context-scaled portion. Lane 2's decomposition (weights 6.0GB fixed + KV ~0.47GB/8k + ~8.8GB context-scaled graph) means the ~8.8GB scaled term at parallel=3 → ~2.9GB at parallel=1, pre
... [+221 chars truncated]

### Assistant | 2026-05-31T22:43:26.805Z

[tool_use: StructuredOutput]

### User | 2026-05-31T22:43:47.331Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T22:43:48.301Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
