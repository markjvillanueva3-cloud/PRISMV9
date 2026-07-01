---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Review the integration layer of PRISM's P0.2 dense-page region tiling for bluepr"
date: "2026-06-22"
first_ts: "2026-06-22T15:35:14.738Z"
last_ts: "2026-06-22T15:38:12.468Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a037b01182b25894a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review the integration layer of PRISM's P0.2 dense-page region tiling for bluepr

> **claude-code-cli** | 2026-06-22 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a037b01182b25894a.jsonl`

## Transcript

### User | 2026-06-22T15:35:14.738Z

Review the integration layer of PRISM's P0.2 dense-page region tiling for blueprint OCR. Read end-to-end:
- H:/prism/scripts/vision-tiling-extract.mjs (the orchestrator + CLI; exports readPngSize, cropTilesPy, extractWithTiling, computeLift)
- H:/prism/scripts/lib/crop-image-tiles.py (the Python PIL tile cropper)
- H:/prism/scripts/vision-tiling-extract.test.mjs (11 tests, all passing)
- H:/prism/scripts/lib/vision-tiling-lib.mjs (the pure core it builds on -- focus on the NEW shape-tolerant accessors dimValueMm/dimRawText/dimConfidence and dimKey/confOf)

CONTEXT: extractWithTiling(opts, deps) is pure over injectable deps {readImageSize, cropTiles, runEnsemble}; the CLI wires real deps (PNG-header size read, Python crop subprocess, runEnsembleOverImage from vision-ensemble-fuse.mjs). A live E2E already caught + fixed 3 bugs: (1) the fused ensemble emits {type, value_mm, raw_texts[], agreement_confidence} NOT {nominal_mm, raw_text, confidence} -> shape-tolerant accessors added; (2) runEnsembleOverImage returns top-level error:null even when models_ok=0 ("empty response" trap) -> the orchestrator now gates tilesOcrOk on models_ok>0; (3) the reliable model is qwen3-vl:8b-instruct not the 32b/thinking variants. Live result: tiling 12 dims vs full-page baseline 8 (+4 new, 0 dropped).

Grade PASS or FAIL. Focus on SILENT BREAKAGE / resource / error-budget:
1. readPngSize: is the PNG IHDR parse correct (signature check, big-endian width/height at bytes 16/20)? Any malformed-PNG path that returns garbage instead of throwing?
2. cropTilesPy: spawnSync of the Python cropper -- error handling (non-zero exit, bad stdout JSON, maxBuffer), the tiles-JSON passed as an argv string (could a large grid blow the command-line length? note the .py also accepts a file path). Temp/workDir cleanup in the CLI finally block -- any leak or a cleanup that could delete the wrong dir?
3. extractWithTiling accounting: is tilesOcrOk/tilesOcrFailed now correct for both real (models_ok present) and
... [+696 chars truncated]

### Assistant | 2026-06-22T15:35:18.436Z

I'll review the P0.2 dense-page region tiling integration layer end-to-end. Let me start by reading all four files.

### Assistant | 2026-06-22T15:35:18.945Z

[tool_use: Read]

### Assistant | 2026-06-22T15:35:19.369Z

[tool_use: Read]

### Assistant | 2026-06-22T15:35:19.825Z

[tool_use: Read]

### Assistant | 2026-06-22T15:35:20.111Z

[tool_use: Read]

### User | 2026-06-22T15:35:22.408Z

[tool_result] 1	#!/usr/bin/env python3
2	"""crop-image-tiles.py -- crop a page image into the tile rects computed by vision-tiling-lib.
3	
4	Part of P0.2 dense-page region tiling (blueprint-vision / slot xray). One Python process crops ALL
5	tiles of a page (one PIL startup, not N), so the JS orchestrator (vision-tiling-extract.mjs) spends a
6	single subprocess per page. Each tile box is clamped to the image bo
... [+2800 chars truncated]

### User | 2026-06-22T15:35:24.057Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vision-tiling-extract.mjs
3	//
4	// U-XRAY-TILING-EXTRACT -- P0.2 dense-page region tiling, end to end.
5	//
6	// Splits a blueprint page PNG into overlapping tiles (computeTileGrid), OCRs EACH tile with the
7	// multi-VLM ensemble (runEnsembleOverImage), then recombines the per-tile dimension sets into one
8	// de-duplicated set (mergeTiledDimensions). Tiling ra
... [+12446 chars truncated]

### User | 2026-06-22T15:35:25.147Z

[tool_result] 1	// Tests for vision-tiling-extract.mjs -- the P0.2 tiling orchestrator (pure over injectable deps).
2	// Real reference values; the orchestration is proven with MOCK crop+OCR deps (the live GPU E2E is the
3	// CLI). Run: node scripts/vision-tiling-extract.test.mjs
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { writeFileSync, mkdtempSync } from "node:fs"
... [+8620 chars truncated]

### User | 2026-06-22T15:35:25.950Z

[tool_result] 1	/**
2	 * vision-tiling-lib.mjs -- P0.2 dense-page region tiling: PURE tile-grid geometry + cross-tile dimension
3	 * merge. No image I/O and no GPU live here. The image-crop + ensemble-OCR step (a follow-up unit)
4	 * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
5	 * results to `mergeTiledDimensions()` to recombine them into one de-duplicat
... [+13466 chars truncated]

### Assistant | 2026-06-22T15:35:29.628Z

Now let me trace the consumers of the changed symbols and verify the `runEnsembleOverImage` contract that the orchestrator depends on. Let me read the ensemble-fuse library to verify the actual return shape.

### Assistant | 2026-06-22T15:35:29.843Z

[tool_use: Read]

### User | 2026-06-22T15:35:31.983Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+25838 chars truncated]

### Assistant | 2026-06-22T15:35:36.964Z

Now I have the full contract. Let me verify a critical detail: the `runEnsembleOverImage` return shape. I notice `models_ok` is at the **top level** of the return object, not inside `fused`. Let me verify the orchestrator's accounting against this, and check a key edge case in the merge logic. Let me trace one more thing — whether `value_spread_mm` with `Math.max(...mms)` could throw on empty, and verify the test suite actually runs green.

### Assistant | 2026-06-22T15:35:37.808Z

[tool_use: Bash]

### Assistant | 2026-06-22T15:35:38.464Z

[tool_use: Grep]

### User | 2026-06-22T15:35:46.431Z

[tool_result]   ...
# Subtest: extractWithTiling: without --baseline, no baseline/lift is computed
ok 8 - extractWithTiling: without --baseline, no baseline/lift is computed
  ---
  duration_ms: 0.2581
  ...
# Subtest: extractWithTiling: throws fail-loud when pngPath is missing
ok 9 - extractWithTiling: throws fail-loud when pngPath is missing
  ---
  duration_ms: 0.3323
  ...
# Subtest: extractWithTiling: cons
... [+565 chars truncated]

### User | 2026-06-22T15:35:58.634Z

[tool_result] Found 5 files
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
scripts\vision-tiling-extract.test.mjs
scripts\vision-tiling-extract.mjs
scripts\lib\crop-image-tiles.py

### Assistant | 2026-06-22T15:36:03.076Z

Tests pass (11/11) and the orchestrator has no other importing consumers (it's a new leaf). Now let me focus adversarially on the specific failure paths. Let me verify the critical command-line length concern for large grids and the temp dir cleanup interaction, plus the workDir collision behavior.

### Assistant | 2026-06-22T15:36:03.749Z

[tool_use: Read]

### User | 2026-06-22T15:36:07.912Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+2853 chars truncated]

### Assistant | 2026-06-22T15:36:14.036Z

Now I have everything needed. Let me verify the two highest-suspicion items adversarially: (1) `parseVisionResponse` return shape on a value-less callout (does it set `success`?), and (2) the exact behavior of `dimToMm`/`dimType` to confirm whether value-less callouts (threads with no mm) ever survive into the fused dimensions at all — because if they don't, `computeLift`'s raw-text branch and the `dimRawText` accessor may be dead for the real path while the test mock keeps them green.

### Assistant | 2026-06-22T15:36:15.109Z

[tool_use: Grep]

### User | 2026-06-22T15:36:18.015Z

[tool_result] 24:export function dimToMm(d) {
25-  if (d === null || d === undefined) return null; // Number(null)===0 footgun — guard first
26-  if (typeof d === "boolean") return null;        // Number(true)===1 footgun — a bool is not a dim
27-  if (typeof d === "number") return Number.isFinite(d) ? d : null;
28-  if (typeof d === "object") {
29-    const v = d.nominal_mm ?? d.mm ?? d.value ?? d.nominal;
30-
... [+1632 chars truncated]

### Assistant | 2026-06-22T15:36:26.060Z

This confirms a real silent-behavior gap. Let me trace it precisely: `normalizeModelDim` returns `null` when `dimToMm(d) === null` (line 96-97 of vision-ensemble-fuse), and `clusterAcrossModels` skips any candidate where `!n` (line 137). So **a value-less callout (thread/finish with no mm) is dropped before fusion** — the fused `dimensions` never contain a value-less dim. This means in the **real** path, `computeLift`'s `raw:`-branch and `dimRawText` over `raw_texts` are exercised, but only for dims that DO have an mm value. Let me confirm there's no path where value-less dims survive, and check one more critical thing about the `value_mm` fused field — whether it can ever be non-finite, which would corrupt the `computeLift` key.

### Assistant | 2026-06-22T15:36:27.130Z

[tool_use: Grep]

### User | 2026-06-22T15:36:29.604Z

[tool_result] 88: * if it carries no usable mm value. Reuses dimToMm (handles {nominal_mm}/{mm}/number and the
127:  // (idempotent on an already-normalized dim — dimToMm reads nominal_mm??mm and dimType collapses
219:    const value_mm = weightedMeanMm(cl.members);
229:      value_mm,
248:    a.value_mm - b.value_mm);
258:      const big = Math.max(Math.abs(a.value_mm), Math.abs(b.value_mm));
260:      const r
... [+107 chars truncated]

### Assistant | 2026-06-22T15:36:36.281Z

Confirmed: every fused dim has a finite `value_mm` (from `weightedMeanMm`, which always returns a finite number for a non-empty member list, and clusters always have ≥1 member). So in the **real fused path**, every dim has `value_mm != null`, meaning `dimValueMm(d) != null` always, meaning `computeLift`'s key always takes the `mm:` branch and **never the `raw:` branch**. The raw-text matching is dead for the real path but that's a correctness-neutral observation (the mm-branch is correct).

Now let me examine the most important adversarial finding — the `computeLift` key uses a **different value tolerance** than the merge that produced `tiledDims`, which can produce a misleading lift count. And critically, let me re-examine the `onlyInBaseline` "regression signal" semantics for a real asymmetry. Let me also verify the large-grid argv length concern concretely.

### Assistant | 2026-06-22T15:36:40.013Z

[tool_use: Bash]

### User | 2026-06-22T15:36:45.639Z

[tool_result] tiles: 101 json bytes: 6227
under 32767? true
default grid json bytes: 249

### Assistant | 2026-06-22T15:36:51.465Z

So a 10x10 grid (101 tiles) is ~6KB — well under the Windows 32767 limit. The default 2x2+center is ~249 bytes. The argv-length risk is real only at extreme grids (a 60x60 grid would approach the limit), and the `.py` already accepts a file path as fallback — but **the orchestrator never uses the file-path fallback**; it always passes the inline JSON string (line 59). This is a latent P2, not a live break.

Now let me check the one genuinely concerning silent-break path I want to confirm: the **workDir collision in `extractWithTiling` vs the CLI**, and whether the baseline OCR writes its request file into a workDir that gets deleted. Let me trace the CLI workDir lifecycle precisely.

### Assistant | 2026-06-22T15:36:52.152Z

[tool_use: Read]

### User | 2026-06-22T15:36:54.375Z

[tool_result] 84	
85	  const { width, height } = await readImageSize(opts.pngPath);
86	  const grid = computeTileGrid(width, height, opts.tileOpts || {});
87	  const workDir = opts.workDir || join(tmpdir(), `prism-tiling-${pid}-${grid.tiles.length}`);
88	  const cropMap = await cropTiles(opts.pngPath, grid.tiles, workDir);
89	
90	  const ensembleCommon = {
91	    models, partClass: opts.partClass, wireEdm: opts
... [+1909 chars truncated]

### Assistant | 2026-06-22T15:37:00.428Z

Now I have a complete picture. Let me verify one final critical accounting concern: the **`tilesOcrOk` / `tilesOcrFailed` count for the empty-but-valid tile**. A tile where the ensemble ran successfully (`models_ok > 0`) but found **zero dimensions** is counted `ok` (correctly — a model running and finding nothing is a valid OCR, not a failure). Let me confirm the test for that and check whether the baseline OCR's `models_ok=0` case (real path) is reflected anywhere — it sets `baseline.error` only from `bres.error`, which is `null` when `models_ok=0`. That's the **same `models_ok>0` trap the orchestrator just fixed for tiles, but NOT applied to the baseline**.

### Assistant | 2026-06-22T15:37:07.547Z

[tool_use: Bash]

### User | 2026-06-22T15:37:17.469Z

[tool_result] baseline.error: null
baseline.count: 0
lift.newInTiled: 1 (tiling LIFT computed against a FALSELY-empty baseline)
=> baseline silently reports 0 dims as if the page genuinely has none, NOT as a failed OCR

### Assistant | 2026-06-22T15:37:26.174Z

Confirmed — a real silent-break the static review and the existing tests missed. The orchestrator fixed the `models_ok=0` "empty response" trap for **tiles** (lines 106-108) but **did not apply the same gate to the baseline** (lines 117-119). When the baseline full-page OCR has every model fail (`models_ok=0, error=null`), it is recorded as a genuine `count: 0` with `error: null`, and `computeLift` then reports an **inflated `newInTiled`** — exactly the R15 "tiling beats baseline" evidence number — derived from a baseline that didn't actually run. This is the same class of bug the live E2E already caught once, left un-patched on the sibling path.

Let me confirm the cluster-empty edge in fuseEnsemble can't throw (the `Math.max(...mms)` with empty), to rule out a crash path versus the silent one.

### Assistant | 2026-06-22T15:37:27.292Z

[tool_use: Bash]

### User | 2026-06-22T15:37:35.131Z

[tool_result] empty fuse dimensions: 0 summary.n_models: 0
OK: no NaN/throw on empty ensemble

### Assistant | 2026-06-22T15:38:12.468Z

No crash path — the `models_ok=0` failure is silent, not loud, which makes it worse (it produces a plausible-looking but false lift number). 

I now have enough to grade. Let me compile the findings with exact citations.

## Review Complete

**VERDICT: FAIL**

**summary:** The orchestrator correctly hardened tile OCR against the `models_ok=0` "empty response" trap (the bug the live E2E already caught), but left the **identical trap un-patched on the baseline path** — when the full-page baseline OCR has every model fail (`models_ok=0, error=null`), it is silently recorded as a genuine `count: 0`, which inflates `computeLift.newInTiled` and fabricates the exact R15 "tiling beats baseline" evidence number the tool exists to produce. Two lower-severity issues (large-grid argv length never using the existing file-path fallback; a misleading `onlyInBaseline` "regression signal" when the baseline silently fails) round out the findings. Everything else (PNG IHDR parse, crop subprocess error handling, temp cleanup, tile accounting, the main-module guard, computeLift symmetry) is correct.

**findings:**

- **[P1]** `H:/prism/scripts/vision-tiling-extract.mjs:116-120` — **Baseline OCR is blind to the `models_ok=0` trap the tile path was just fixed for.** Lines 106-108 gate `tilesOcrOk` on `models_ok > 0`, but the baseline at 117-119 sets `baseline.error = (bres && bres.error) || null` — and `runEnsembleOverImage` returns `error: null` even when every model failed with `models_ok: 0` (vision-ensemble-fuse.mjs:451-457 has no top-level `error` on the all-models-empty path). **Trigger:** the same "empty response" / thinking-model trap that motivated the tile fix, hitting the full-page baseline call. **Result:** `baseline.count` becomes `0` with `error: null` (indistinguishable from a page that genuinely has no dims), and `computeLift(bdims=[], merged.dimensions)` reports `newInTiled = (all merged dims)` — a fabricated recall-lift headline. I reproduced this live: a `models_ok:0` b
... [+4448 chars truncated]
