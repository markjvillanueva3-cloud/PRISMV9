---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review PRISM unit U-XRAY-P15-REGION-NONDIM-RESCUE (analyst arm — silent breakage"
date: "2026-06-23"
first_ts: "2026-06-23T08:49:32.705Z"
last_ts: "2026-06-23T08:51:16.827Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-ab381b3eb36aab65a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review PRISM unit U-XRAY-P15-REGION-NONDIM-RESCUE (analyst arm — silent breakage

> **claude-code-cli** | 2026-06-23 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-ab381b3eb36aab65a.jsonl`

## Transcript

### User | 2026-06-23T08:49:32.705Z

Review PRISM unit U-XRAY-P15-REGION-NONDIM-RESCUE (analyst arm — silent breakage / regression / recall-loss / integration coupling). 3 changed files:

1. H:\prism\scripts\lib\vision-ensemble-fuse.mjs — added one export: `export const NON_DIM_KEY_FNS = {gdt: gdtKey, notes: noteKey, profiles: profileKey, surface_finishes: surfaceFinishKey}` (the per-field identity keys, so region-glue reuses the SAME identity, not a fork).
2. H:\prism\scripts\lib\region-glue-lib.mjs — new pure `mergeRegionFused(fullPageFused, perRegionFused, fields)`: recall-first union of non-dim fields across the floor + per-region fused, de-duped by NON_DIM_KEY_FNS. floor is first source (wins key ties). Recall-first: null/undefined dropped; primitives deduped by "prim:"+value; un-keyable objects KEPT. `buildRegionRoutedFused` now accepts `opts.regionFused` and Object.assigns the merged non-dim onto the output (dense-rescue: a page whose full-page floor failed -> 0 gdt still recovers region gdt/notes). When opts.regionFused absent -> byte-identical to before.
3. H:\prism\scripts\region-classify.mjs — `extractWithRegionRouting` captures each region's `fused` (was dims-only) and passes `regionFused: perRegion.map(p=>p.fused).filter(Boolean)` to buildRegionRoutedFused.

Tests: region-glue-lib 30/30 (+8 incl dense-rescue, floor-wins-tie, recall-first-primitive, malformed), region-classify 17/17, vision-ensemble-fuse 43/43.

VERIFY (PASS/FAIL + P0/P1/P2 + file:line):
1. CIRCULAR IMPORT: region-glue-lib now imports vision-ensemble-fuse. Confirm no import cycle + no import-time side effects (vision-ensemble-fuse's I/O shell uses top-level node: imports but no top-level execution).
2. BACK-COMPAT: buildRegionRoutedFused with NO opts.regionFused is byte-identical to before (existing callers + the 22 prior region-glue tests). The full_page route in region-classify is unaffected.
3. RECALL-FIRST correctness: does mergeRegionFused ever DROP a real label? floor-first tie-break correct? Does it re-corroborate ac
... [+427 chars truncated]

### Assistant | 2026-06-23T08:49:36.656Z

I'll review this unit thoroughly. Let me read all three changed files end-to-end plus trace the consumers.

### Assistant | 2026-06-23T08:49:37.059Z

[tool_use: Read]

### Assistant | 2026-06-23T08:49:37.534Z

[tool_use: Read]

### Assistant | 2026-06-23T08:49:37.906Z

[tool_use: Read]

### User | 2026-06-23T08:49:38.071Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+15710 chars truncated]

### User | 2026-06-23T08:49:38.670Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+17392 chars truncated]

### User | 2026-06-23T08:49:39.374Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+32837 chars truncated]

### Assistant | 2026-06-23T08:49:43.285Z

Now let me verify the import cycle question and trace consumers of `buildRegionRoutedFused`'s `fused` output. Let me check `vision-tiling-lib.mjs` (the other import of region-glue-lib) and any consumer that reads the `fused.gdt`/`fused.notes` fields.

### Assistant | 2026-06-23T08:49:44.228Z

[tool_use: Read]

### Assistant | 2026-06-23T08:49:45.181Z

[tool_use: Grep]

### User | 2026-06-23T08:49:45.233Z

[tool_result] 1	/**
2	 * vision-tiling-lib.mjs -- P0.2 dense-page region tiling: PURE tile-grid geometry + cross-tile dimension
3	 * merge. No image I/O and no GPU live here. The image-crop + ensemble-OCR step (a follow-up unit)
4	 * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
5	 * results to `mergeTiledDimensions()` to recombine them into one de-duplicat
... [+3291 chars truncated]

### Assistant | 2026-06-23T08:49:46.007Z

[tool_use: Grep]

### User | 2026-06-23T08:49:49.796Z

[tool_result] Found 42 files
state\shared\dashboards\injection-dedup-cache.json
state\session-reorientation\reorientation-claude-6a8a0fc5.json
scripts\lib\region-glue-lib.test.mjs
state\shared\WORK_CLAIMS.json
mcp-server\data\state\session-file-ownership.json
state\shared\ATOMIC_CLAIMS.json
scripts\lib\region-glue-lib.mjs
scripts\region-classify.mjs
scripts\lib\vision-ensemble-fuse.mjs
knowledge\memories\refere
... [+2314 chars truncated]

### User | 2026-06-23T08:49:50.886Z

[tool_result] scripts\region-classify.mjs:38:import { buildRegionCropSpecs, mergeRegionResults, buildRegionRoutedFused } from "./lib/region-glue-lib.mjs";
state\shared\memory-index-sidecar.json:1:[Omitted long matching line]

### Assistant | 2026-06-23T08:49:55.029Z

Now let me verify the import-cycle question definitively and trace the key consumer (`blueprint-ocr-training-loop.mjs` `buildTrainsetRow`) which is the named downstream consumer of the `fused` output. Let me check whether `vision-ensemble-fuse.mjs` or `vision-tiling-lib.mjs` imports back to `region-glue-lib.mjs`, and read the trainset-row consumer.

### Assistant | 2026-06-23T08:49:56.464Z

[tool_use: Grep]

### Assistant | 2026-06-23T08:49:57.417Z

[tool_use: Grep]

### User | 2026-06-23T08:49:57.794Z

[tool_result] No matches found

### User | 2026-06-23T08:49:58.805Z

[tool_result] 114://   - fuseEnsemble     (vision-ensemble-fuse):      { value_mm,   raw_texts:string[], agreement_confidence }

### Assistant | 2026-06-23T08:49:59.018Z

[tool_use: Grep]

### User | 2026-06-23T08:50:00.318Z

[tool_result] 44:  buildTrainsetRow,
112:    // The hybrid `fused` carries the region-recovered dims + the full-page non-dimension labels + a
190:/** Normalize a fused consensus dim's type string to the lowercased, sentinel-null convention dimType uses. */
249:      const nm = res.fused.summary.n_models;
251:      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
334:      // temp
... [+1709 chars truncated]

### Assistant | 2026-06-23T08:50:05.609Z

Import cycle is confirmed clean: `vision-ensemble-fuse.mjs` imports only `dimension-set-score.mjs` and `ollama-vision-extract-lib.mjs` (lines 42-52), plus node builtins — no import back to `region-glue-lib` or `vision-tiling-lib`. So `region-glue-lib -> vision-ensemble-fuse` is a one-way edge. No top-level execution in vision-ensemble-fuse (only `export const`/`function`/`import`; `main()` guard lives in region-classify, not in the lib). 

Now let me read `buildTrainsetRow` to confirm it tolerates the now-populated `gdt`/`notes` from region rescue (and whether it could choke on the union's entry shape), and check the test file for the dense-rescue coverage.

### Assistant | 2026-06-23T08:50:05.928Z

[tool_use: Grep]

### User | 2026-06-23T08:50:09.234Z

[tool_result] Found 1 file
scripts\lib\ocr-training-loop-lib.mjs

### Assistant | 2026-06-23T08:50:13.572Z

[tool_use: Grep]

### User | 2026-06-23T08:50:14.819Z

[tool_result] 122: * @param {object} g  a fused.gdt entry (symbol/tolerance_value/tolerance_unit/material_condition/datum_references/raw_text)
157:export function buildTrainsetRow(part, fused, calibration, opts = {}) {
180:  const gdtArr = fused && Array.isArray(fused.gdt) ? fused.gdt : [];
181:  const gdt_labels = gdtArr.map((g) => {
208:    gdt_labels,
209:    trainable_gdt_label_count: gdt_labels.filter((l) 
... [+695 chars truncated]

### Assistant | 2026-06-23T08:50:20.460Z

Let me read the `buildTrainsetRow` body (lines 157-220) to confirm what shape it expects from `fused.gdt` entries and whether a region-rescued entry (which may lack the trust metadata that the ensemble fuse adds) could choke or be silently mis-gated.

### Assistant | 2026-06-23T08:50:21.264Z

[tool_use: Read]

### User | 2026-06-23T08:50:22.368Z

[tool_result] 115	
116	/**
117	 * Pure: render a GD&T feature-control-frame entry to a canonical ASCII ground-truth string for the
118	 * LoRA pair (the GD&T analogue of a dimension's value_mm). Format:
119	 *   "<symbol> <tolerance><unit> <material_condition> [<datumA>|<datumB>]"
120	 * Empty/absent parts are dropped; falls back to verbatim raw_text if nothing structured is present.
121	 * Deterministic (no Ma
... [+6803 chars truncated]

### Assistant | 2026-06-23T08:50:29.145Z

I now have everything I need. `buildTrainsetRow` reads `fused.gdt` entries defensively (`Number.isFinite(g.corroboration) ? ... : 0`, `g.hallucination_candidate === true`), and a region-rescued gdt entry that originated from `fuseNonDimField` carries the same trust metadata (`corroboration`/`n_models`/`hallucination_candidate`). So the now-populated gdt/notes are consumed safely.

Let me verify one important edge: whether `mergeRegionFused`'s output entries preserve the per-region corroboration metadata correctly (the spec says it must NOT re-corroborate across regions), and confirm the dedup tie semantics. I already have the full source — let me trace the exact data flow for the recall-first / floor-wins-tie / cross-region correctness once more against the code, plus check `classifyActiveLearning`'s gdt-hallucination trigger which consumes the union.

### Assistant | 2026-06-23T08:50:29.949Z

[tool_use: Read]

### User | 2026-06-23T08:50:31.294Z

[tool_result] 220	
221	/**
222	 * Pure: should this print go to the operator active-learning queue (not auto-trained)?
223	 * Triggers: single-model run (no corroboration possible), ANY ambiguous pair, ANY hallucination
224	 * candidate, OR no trainable labels. Returns the reasons.
225	 * @param {{fused:object, trainsetRow:object}} perPart
226	 * @returns {{needsReview:boolean, reasons:string[]}}
227	 */
228	ex
... [+3199 chars truncated]

### Assistant | 2026-06-23T08:51:16.827Z

I have full coverage of every verification axis. Let me now work through each item against the code with precision.

## Trace of each verification axis

**1. CIRCULAR IMPORT** — `region-glue-lib.mjs:24-25` imports `mergeTiledDimensions` from `vision-tiling-lib.mjs` and `NON_DIM_KEY_FNS` from `vision-ensemble-fuse.mjs`. Confirmed via Grep: `vision-ensemble-fuse.mjs` imports only `dimension-set-score.mjs` + `ollama-vision-extract-lib.mjs` (no back-edge); `vision-tiling-lib.mjs` has zero refs to either lib (only a comment mention at line 114). No cycle. `vision-ensemble-fuse.mjs` is body-only at module scope — `export const`, `function`, `import` — no top-level execution; the `main()`/CLI guard lives in `region-classify.mjs:284`, not the lib. Importing it has no side effects. **CLEAN.**

**2. BACK-COMPAT** — In `buildRegionRoutedFused`, `regionNonDim` is `null` unless `opts.regionFused` is a non-empty array (`region-glue-lib.mjs:241-243`). When null: line 249 returns `base` unchanged (no-summary path) and line 252 `if (regionNonDim)` is skipped (summary path). Every prior call site passing only `(mergedDimensions, fullPageFused, {fallbackNModels})` is byte-identical. The full_page route in `region-classify.mjs:178-188` never calls `buildRegionRoutedFused` at all — it returns `fused: fullFused` directly, so it is wholly unaffected. **CLEAN.**

**3. RECALL-FIRST correctness** — `mergeRegionFused` (`region-glue-lib.mjs:170-198`): floor is pushed first (line 172) so on a key tie `seen.has(k)` keeps the floor's representative (line 190) — floor-wins-tie correct. `item == null` is the only drop (line 182) — a genuine null, never a real label. Un-keyable objects (keyFn returns null/throws → `k == null`) are KEPT (line 189) — no real label dropped. No re-corroboration: each `item` is pushed verbatim (`merged.push(item)`), so it keeps the `corroboration`/`n_models`/`hallucination_candidate` it earned in its own region's `fuseNonDimField`. It never recomputes corroboration acros
... [+6441 chars truncated]
