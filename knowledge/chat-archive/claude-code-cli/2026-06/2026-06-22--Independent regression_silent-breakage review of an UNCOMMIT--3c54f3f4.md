---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Independent regression/silent-breakage review of an UNCOMMITTED PRISM change (H:"
date: "2026-06-22"
first_ts: "2026-06-22T19:40:19.577Z"
last_ts: "2026-06-22T19:43:26.519Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a8248018a50a8e631.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent regression/silent-breakage review of an UNCOMMITTED PRISM change (H:

> **claude-code-cli** | 2026-06-22 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a8248018a50a8e631.jsonl`

## Transcript

### User | 2026-06-22T19:40:19.577Z

Independent regression/silent-breakage review of an UNCOMMITTED PRISM change (H:/prism, branch cad-fusion-live-ms0). Do NOT assume the holistic reviewer caught everything. Read the diff:
`git -C H:/prism diff -- scripts/lib/ollama-vision-extract-lib.mjs scripts/lib/ollama-vision-extract-lib.test.mjs scripts/blueprint-ocr-training-loop.mjs scripts/validate-perfect-parts.mjs`

The change adds per-print unit propagation to multi-page blueprint OCR (detect title-block unit on the first page, force it on later pages of the same print). Two new exported pure helpers: resolvePageTitleBlockUnit + pageForceUnit. Wired into per-page loops in blueprint-ocr-training-loop.mjs (~line 339) and validate-perfect-parts.mjs (~line 205, non-tiling branch only).

Weight your review toward SILENT breakage and integration coupling:
1. Read the ACTUAL shape returned by runEnsembleOverImage (scripts/lib/vision-ensemble-fuse.mjs ~line 450): per_model_runs[].extraction. Confirm resolvePageTitleBlockUnit reads a field that ACTUALLY EXISTS on that extraction object (extraction.units / extraction.title_block.units / extraction.unit_resolution.drawing_units — verify against parseVisionResponse's return, lib ~line 783-805). A field-name mismatch = silently no-op (this is the exact bug class that bit a prior fused-shape merge).
2. In validate-perfect-parts.mjs: does the new code path interact correctly with the TILING branch (opts.tile)? printUnit anchoring only happens in the non-tiling branch — confirm the tiling branch is unaffected and printUnit staying null there is harmless.
3. `env` import: confirm `env` is imported in BOTH consumer files before the new `env.PRISM_OCR_PER_PRINT_UNIT_DISABLE` reads (training-loop line ~34, validate line ~25).
4. Import resolution: both consumers now import from ./lib/ollama-vision-extract-lib.mjs — confirm those exports exist and there's no circular-import or load-order hazard (does ollama-vision-extract-lib.mjs import anything from vision-ensemble-fuse.mjs t
... [+483 chars truncated]

### Assistant | 2026-06-22T19:40:22.650Z

I'll start by reading the actual diff and the referenced source files to verify the change against the real contracts.

### Assistant | 2026-06-22T19:40:23.636Z

[tool_use: Bash]

### User | 2026-06-22T19:40:24.364Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-22T19:40:26.905Z

The diff isn't actually in my context yet (the cache error is misleading). Let me read the actual files directly to verify against real contracts.

### Assistant | 2026-06-22T19:40:28.065Z

[tool_use: Bash]

### User | 2026-06-22T19:40:31.607Z

[tool_result] diff --git a/scripts/blueprint-ocr-training-loop.mjs b/scripts/blueprint-ocr-training-loop.mjs
index 89e089cbb4..caba0bb9e4 100644
--- a/scripts/blueprint-ocr-training-loop.mjs
+++ b/scripts/blueprint-ocr-training-loop.mjs
@@ -37,6 +37,7 @@ import { fetchAvailableVisionModels, isThinkingTrap, VISION_FAMILY_LEADERS } fro
 import { generateSyntheticPrint } from "./lib/vision-ab-compare.mjs";
 import
... [+10023 chars truncated]

### Assistant | 2026-06-22T19:40:35.056Z

I have the full diff for the 3 main files. Now let me verify the critical contracts: the actual shape of `parseVisionResponse`'s return (does `extraction.units` exist?), the shape returned by `runEnsembleOverImage`, and `normalizeUnit`. Let me read all the load-bearing source.

### Assistant | 2026-06-22T19:40:36.472Z

[tool_use: Read]

### Assistant | 2026-06-22T19:40:37.199Z

[tool_use: Bash]

### User | 2026-06-22T19:40:37.770Z

[tool_result] 700	  return {
701	    name: asStr(p.name),
702	    type: asStr(p.type),
703	    is_closed: p.is_closed === true,
704	    width_mm: asNum(p.width_mm),
705	    height_mm: asNum(p.height_mm),
706	    diameter_mm: asNum(p.diameter_mm),
707	    corner_radii_mm: asArray(p.corner_radii_mm).map(asNum).filter((x) => x != null),
708	    confidence: clamp01(p.confidence),
709	  };
710	}
711	
712	function ex
... [+7695 chars truncated]

### User | 2026-06-22T19:40:41.257Z

[tool_result] 167:export function normalizeUnit(u) {
189:  let u = normalizeUnit(unit);
192:    const fallback = normalizeUnit(assumeUnits);
498:  const fu = normalizeUnit(forceUnits);
500:  const dimUnit = forced || normalizeUnit(d.unit) || (drawingUnits === "in" || drawingUnits === "mm" ? drawingUnits : null);
566:    const u = normalizeUnit(raw);
586:  const ef = normalizeUnit(explicitForce);
588:  const pa 
... [+381 chars truncated]

### Assistant | 2026-06-22T19:40:46.464Z

Critical confirmation: `parseVisionResponse` returns `extraction.units = drawingUnits` (line 845), `extraction.title_block.units` (line 822/743/746), AND `extraction.unit_resolution.drawing_units` (line 855). All three field paths the new helper reads ACTUALLY EXIST. The field-name mismatch bug class is NOT present.

Now let me verify `normalizeUnit`'s behavior (does it return "in"/"mm" cleanly, and how does it handle "mixed"?) and the `runEnsembleOverImage` return shape (`per_model_runs[].extraction`).

### Assistant | 2026-06-22T19:40:47.413Z

[tool_use: Read]

### Assistant | 2026-06-22T19:40:47.918Z

[tool_use: Read]

### User | 2026-06-22T19:40:48.767Z

[tool_result] 160	    "- If a region is illegible, write [illegible] in place -- never invent text.",
161	    "- Keep numbers EXACTLY as printed (digits, commas, decimal points, $).",
162	  ].filter((l) => l != null);
163	  return lines.join("\n");
164	}
165	
166	/** Pure: normalize a unit token to "in" | "mm" | "mixed" | null(unknown). */
167	export function normalizeUnit(u) {
168	  if (u == null) return null;
... [+1408 chars truncated]

### User | 2026-06-22T19:40:49.231Z

[tool_result] 410	 * @param {{
411	 *   png:string, models:string[], partClass?:string, wireEdm?:boolean, assumeUnits?:string,
412	 *   forceUnits?:string, ollamaUrl?:string, maxTimeSec?:number, workDir?:string,
413	 *   format?:string, fuseOpts?:object,
414	 *   deps?:{spawn?:Function, readFile?:Function, writeFile?:Function, unlink?:Function, now?:Function}
415	 * }} a
416	 * @returns {Promise<{
417	 *   fuse
... [+2625 chars truncated]

### Assistant | 2026-06-22T19:40:56.712Z

Confirmed the full integration chain:

- `runEnsembleOverImage` returns `per_model_runs` where each entry has `.extraction` set to the parsed extraction object (line 443/450), or `null` on failure (line 441/450). The new helper's `r.extraction` read is correct.
- The `extraction` object IS the return of `ocrImageWithModelAsync` → `parseVisionResponse().extraction`, which has `.units`, `.title_block.units`, `.unit_resolution.drawing_units`. All three confirmed present.
- `normalizeUnit` returns exactly `"in"|"mm"|"mixed"|null`. The helper only counts `"in"`/`"mm"` votes; `"mixed"` and `null` correctly abstain. Good.

One important subtlety to check: `ocrImageWithModelAsync` — does it return the raw `extraction` object, or could `ex` be the `{success, error, extraction}` wrapper? Let me verify, plus check the JSDoc on line 417 (it does NOT list `extraction` in the per_model_runs type — a doc drift, but the actual code at 450 includes it). Let me verify `ocrImageWithModelAsync`'s return shape.

### Assistant | 2026-06-22T19:40:58.576Z

[tool_use: Bash]

### User | 2026-06-22T19:41:03.175Z

[tool_result] 138: * Output is PLAIN TEXT, not JSON -- the caller returns it raw (no parseVisionResponse).
559:    const ex = r && typeof r === "object" ? r.extraction : null;
---ASYNC FN BODY---
40://   ocrImageWithModelAsync · runEnsembleOverImage
378:export async function ocrImageWithModelAsync(a) {
435:    const ex = await ocrImageWithModelAsync({

### Assistant | 2026-06-22T19:41:07.025Z

`ocrImageWithModelAsync` is in `vision-ensemble-fuse.mjs` (line 378), not the lib. Let me read its return shape to confirm `ex` (the `extraction`) is the raw extraction object, not the `{success,error,extraction}` wrapper.

### Assistant | 2026-06-22T19:41:07.948Z

[tool_use: Read]

### User | 2026-06-22T19:41:09.643Z

[tool_result] 378	export async function ocrImageWithModelAsync(a) {
379	  const deps = a.deps || {};
380	  const writeFile = typeof deps.writeFile === "function" ? deps.writeFile : writeFileSync;
381	  const unlink = typeof deps.unlink === "function" ? deps.unlink : unlinkSync;
382	  if (typeof a.imageBase64 !== "string" || !a.imageBase64) return { error: "no imageBase64" };
383	  if (typeof a.model !== "string
... [+2113 chars truncated]

### Assistant | 2026-06-22T19:41:09.722Z

[tool_use: Bash]

### User | 2026-06-22T19:41:13.949Z

[tool_result] 42:import {
47:} from "./dimension-set-score.mjs";
48:import {
52:} from "./ollama-vision-extract-lib.mjs";
57:export const DEFAULT_DIM_CONF = 0.5;
63:export const NOISY_OR_CAP = 0.99;
75:export function combineConfidenceNoisyOr(confs) {
95:export function normalizeModelDim(d) {
124:export function clusterAcrossModels(perModel, opts = {}) {
197:export function fuseEnsemble(modelExtractions, opts =
... [+352 chars truncated]

### Assistant | 2026-06-22T19:41:22.943Z

Two critical confirmations:

1. **`ocrImageWithModelAsync` returns `parsed.extraction`** (line 401) — the RAW extraction object, NOT the `{success,error,extraction}` wrapper. So `per_model_runs[].extraction` is the raw extraction with `.units`/`.title_block.units`/`.unit_resolution.drawing_units`. The helper reads the correct shape. ✓

2. **Circular import direction**: `vision-ensemble-fuse.mjs` imports FROM `ollama-vision-extract-lib.mjs` (line 48-52). The new consumers import `resolvePageTitleBlockUnit`/`pageForceUnit` from `ollama-vision-extract-lib.mjs`. The lib's import section showed NO output for "vision-ensemble-fuse" in the lib — meaning `ollama-vision-extract-lib.mjs` does NOT import from `vision-ensemble-fuse.mjs`. So there's no cycle: lib is the leaf, fuse depends on lib. ✓ (Let me double-confirm the lib has zero back-import.)

Now let me verify the `env` imports in both consumer files (item 3), the tiling-branch interaction (item 2), and check `forceUnits` plumbing through `extractWithTiling` for the validate file's tiling branch.

### Assistant | 2026-06-22T19:41:25.549Z

[tool_use: Bash]

### User | 2026-06-22T19:41:29.954Z

[tool_result] === LIB back-import check (must be EMPTY) ===
(empty above = no cycle)
=== training-loop env import (line ~34) ===
1:#!/usr/bin/env node
33:import { spawnSync } from "node:child_process";
34:import { argv, exit, env, pid } from "node:process";
57:const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
59:const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
332:      const autoUn
... [+211 chars truncated]

### Assistant | 2026-06-22T19:41:34.517Z

Both confirmed:
- **No circular import** — lib has zero refs to vision-ensemble-fuse. ✓
- **`env` imported in training-loop** (line 34: `import { argv, exit, env, pid }`) — and already used elsewhere (line 57, 59), so it's a proven binding. ✓
- **`env` imported in validate** (line 25: `import { argv, exit, env }`). ✓

Now item 2 — the tiling branch interaction. Let me read the full validate-perfect-parts loop region including the tiling branch and how `printUnit` flows (or doesn't) through tiling, plus whether `printUnit` staying null in the tiling branch is harmless.

### Assistant | 2026-06-22T19:41:35.133Z

[tool_use: Read]

### User | 2026-06-22T19:41:36.334Z

[tool_result] 188	            //    the GPU concurrently with the live corpus grinder.
189	            const pages = rasterAllPages(printPath, rasterDir);
190	            if (!pages.length) { rec.skip = "raster-failed"; agg.raster_failed++; }
191	            else {
192	              const allDimsMm = []; let anyOk = false; let modelsOkMax = 0; let pagesOcrd = 0;
193	              // Per-print unit anchor (clone
... [+4511 chars truncated]

### Assistant | 2026-06-22T19:41:44.049Z

Item 2 confirmed clean. In validate-perfect-parts.mjs:
- The tiling branch (lines 202-211) is **completely unchanged** — it still calls `extractWithTiling` with the same args and never touches `printUnit`. ✓
- When `opts.tile` is set, `printUnit` stays `null` forever, but that's harmless because the tiling branch never reads it. ✓
- The non-tiling branch's `pageForceUnit(null, printUnit)` when `printUnit===null` returns `null` (verified: `pageForceUnit` with both null/normalize-to-null returns `null`), which matches the OLD call that passed no `forceUnits` at all. ✓

There's one subtle mixed-branch concern worth noting: if a single print has SOME pages tiled and some not — but no, `opts.tile` is a global flag, so a given run is either all-tiled or all-non-tiled. No mixed path. ✓

Now let me verify item 6 (behavior parity when OFF) precisely, and check the training-loop full region for the `unanchoredOcrdPages` counter logic (item 5) and `forceUnits` default. First, what does `opts.forceUnits` default to in training-loop, and is `forceUnits: undefined` vs the old `forceUnits: opts.forceUnits` byte-equivalent through `pageForceUnit`?

### Assistant | 2026-06-22T19:41:46.144Z

[tool_use: Bash]

### User | 2026-06-22T19:41:50.117Z

[tool_result] === training-loop forceUnits opt parsing ===
25://        [--force-units in|mm]  (force the global unit on PHASE-2 per-page OCR -- pages 2+ of a multi-page
26://                                print lose the title block; JM is INCH -> --force-units in fixes wrong-scale labels)
75:    // --force-units <in|mm>: AUTHORITATIVE unit override for PHASE-2 per-page OCR. Multi-page prints
78:    // so `--f
... [+909 chars truncated]

### Assistant | 2026-06-22T19:42:01.492Z

Now let me verify item 6 parity precisely by analyzing the data flow:

**Training-loop, OFF case (explicit `--force-units in` set):**
- `autoUnit = !opts.forceUnits && ...` → `!"in"` → `false`. So detection never runs, `printUnit` stays `null`.
- `pageForceUnit("in", null)`: `normalizeUnit("in")` → `"in"` → returns `"in"`.
- OLD code passed `forceUnits: opts.forceUnits` = `"in"`.
- **Both pass `"in"` to `runEnsembleOverImage`.** Byte-equivalent. ✓

**Training-loop, OFF case (`PRISM_OCR_PER_PRINT_UNIT_DISABLE=1`, no `--force-units`, so `opts.forceUnits=null`):**
- `autoUnit = !null && false` → `false`. Detection never runs, `printUnit` stays `null`.
- `pageForceUnit(null, null)` → `normalizeUnit(null)` → `null`, then `normalizeUnit(null)` → `null` → returns `null`.
- OLD code passed `forceUnits: opts.forceUnits` = `null`.
- **Both pass `null`.** Now I need to confirm: does `runEnsembleOverImage`/`parseVisionResponse` treat `forceUnits: null` identically to `forceUnits: undefined` (old default when `opts.forceUnits` was `null`)? `normalizeUnit(null)` and `normalizeUnit(undefined)` both return `null` (line 168: `if (u == null) return null`). ✓ Byte-equivalent.

Now the parity for validate when OFF — the OLD validate call had NO `forceUnits` key at all (`forceUnits: undefined`), the new one passes `forceUnits: pageForceUnit(null, null) = null`. `normalizeUnit(undefined) === normalizeUnit(null) === null`. ✓ Equivalent.

Let me verify item 5 (the counter) carefully and read the new test file to confirm test integrity, then check one edge: the late-anchor log and whether `unanchoredOcrdPages` can misreport.

### Assistant | 2026-06-22T19:42:02.509Z

[tool_use: Read]

### User | 2026-06-22T19:42:03.831Z

[tool_result] 344	              console.log(`    ${basename(entry)}#p${page}: page-classify SKIP (${kind}, conf ${conf}) -- not a drawing, ensemble skipped`);
345	              continue;
346	            }
347	          }
348	          const res = await runEnsembleOverImage({ png, models, assumeUnits: "in", forceUnits: pageForceUnit(opts.forceUnits, printUnit), ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec,
... [+2176 chars truncated]

### Assistant | 2026-06-22T19:42:13.050Z

Item 5 analysis — the `unanchoredOcrdPages` counter:

The counter logic is sound. Walking the path:
- `res.models_ok === 0` → `continue` (line 349) — page not OCR'd, counter NOT touched. ✓ Correct: a fully-failed page is not "OCR'd-but-unanchored".
- The classify-SKIP at line 344 also `continue`s before the ensemble — counter not touched. ✓ Correct: a skipped non-drawing page never reaches the counter.
- The counter `unanchoredOcrdPages++` only fires inside `if (autoUnit && !printUnit)` when `detected` is falsy — i.e. genuinely a page that WAS OCR'd (`models_ok > 0`) but declared no confident title-block unit. ✓ This is exactly "a genuinely-unanchored OCR'd page."
- Once `printUnit` is set, the whole `if (autoUnit && !printUnit)` block is skipped, so the counter freezes and the log fires at most once. ✓ No double-log, no throw (it's a plain `console.log` on integers/strings).

One nuance: when `autoUnit` is `false` (feature OFF), the entire block never runs, so `unanchoredOcrdPages` stays 0 and the log never fires. Correct — no spurious output in the OFF path. ✓

Now let me read the new tests to confirm they verify real intent (not stubs), and confirm `extractWithTiling` in validate's tiling branch is genuinely independent of the new code.

### Assistant | 2026-06-22T19:42:13.799Z

[tool_use: Bash]

### User | 2026-06-22T19:42:18.314Z

[tool_result] diff --git a/scripts/lib/ollama-vision-extract-lib.test.mjs b/scripts/lib/ollama-vision-extract-lib.test.mjs
index 48aaa9b0ce..fc2e6cd1b5 100644
--- a/scripts/lib/ollama-vision-extract-lib.test.mjs
+++ b/scripts/lib/ollama-vision-extract-lib.test.mjs
@@ -17,6 +17,8 @@ import {
   normalizeThreadCallout,
   normalizeChamferCallout,
   normalizeGdtSymbol,
+  resolvePageTitleBlockUnit,
+  pageForceUn
... [+5025 chars truncated]

### Assistant | 2026-06-22T19:42:29.176Z

The tests are real intent-verifying tests (R9-compliant) — they exercise the actual consensus rule (tie→null, majority wins, mixed/null abstain), all three field-fallback paths (`units`/`title_block.units`/`unit_resolution.drawing_units`), alias normalization, null-safety on malformed inputs, and the `pageForceUnit` override precedence. The `mkRun` helper builds the entry in the REAL `runEnsembleOverImage` shape (`{model, ok, ms, dim_count, error, extraction}`), matching line 450 exactly. Strong tests.

Let me run the test suite to confirm they actually pass (not just look correct), and verify the tiling branch's `extractWithTiling` doesn't share state. Let me also do a final check on whether there's a subtle gap: the test `mkRun(null, { ok: false })` sets `extraction: null` only when `ok` is false — but the helper's `ex = ok ? {...} : null` and field-set is gated on `if (ex)`. Let me run the tests.

### Assistant | 2026-06-22T19:42:30.099Z

[tool_use: Bash]

### User | 2026-06-22T19:42:35.202Z

[tool_result]   ...
# Subtest: pageForceUnit: explicit alias 'inch' normalized → 'in'
ok 115 - pageForceUnit: explicit alias 'inch' normalized → 'in'
  ---
  duration_ms: 0.022
  ...
# Subtest: pageForceUnit: garbage explicit falls through to a valid anchor
ok 116 - pageForceUnit: garbage explicit falls through to a valid anchor
  ---
  duration_ms: 0.0269
  ...
# Subtest: pageForceUnit: 'mixed' anchor is not a
... [+229 chars truncated]

### Assistant | 2026-06-22T19:42:39.873Z

All 117 tests pass (0 fail, 0 skip). Now let me do a final null-safety sweep on item 7 — what happens if `res.per_model_runs` is missing/undefined, or `res.fused` is missing. Let me verify `runEnsembleOverImage` always returns those keys even on the early-return error paths, and confirm the consumers guard appropriately.

### Assistant | 2026-06-22T19:42:43.082Z

[tool_use: Bash]

### User | 2026-06-22T19:42:47.708Z

[tool_result] === Every runEnsembleOverImage return path includes per_model_runs + fused? ===
426:  if (!a.png || typeof a.png !== "string") return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png || null, error: "no png" };
427:  if (!models.length) return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.p
... [+1638 chars truncated]

### Assistant | 2026-06-22T19:42:58.526Z

Item 7 (null-safety) fully verified:

- **All three early-return paths** of `runEnsembleOverImage` (lines 426, 427, 431) include `per_model_runs: []` and `fused: fuseEnsemble([])`. The main return (line 451) always includes both. So `res.per_model_runs` is **never undefined** — worst case it's `[]`, and `resolvePageTitleBlockUnit([])` correctly returns `null` (tested). Even if it WERE undefined, the helper guards `if (!Array.isArray(perModelRuns)) return null`. Double-safe. ✓
- **Training-loop**: `resolvePageTitleBlockUnit` (line 355) is reached only after `res.models_ok === 0` → `continue` guard (line 349). But the helper is null-safe regardless. ✓
- **Validate**: `resolvePageTitleBlockUnit(res.per_model_runs)` (line 217) is gated behind `pageOk` (`res.models_ok > 0`), and the helper is null-safe. ✓
- The `extraction:null` case (a per-model run that failed) is handled by the helper's `if (!ex || typeof ex !== "object") continue` (lib line 558-559). ✓

Now one last integration-coupling concern: in the training-loop, is the `resolvePageTitleBlockUnit` read of `res.per_model_runs[].extraction` affected by the fact that **once `printUnit` is anchored, all later pages get `forceUnits` applied — which OVERWRITES `extraction.units`**? Let me verify that the anchor detection only happens on the *first* unanchored page and doesn't create a feedback distortion. Looking at the logic: detection is gated by `!printUnit`, so once anchored it never re-detects. No feedback loop. But let me confirm that `forceUnits` doesn't corrupt `extraction.units` in a way that would matter — actually it can't matter since detection stops. 

Let me confirm the validate tiling branch's `extractWithTiling` is truly independent (doesn't import/depend on the changed helpers).

### Assistant | 2026-06-22T19:43:01.099Z

[tool_use: Bash]

### User | 2026-06-22T19:43:05.281Z

[tool_result] === extractWithTiling import surface (independence check) ===
(empty = tiling branch fully independent of new helpers)

=== confirm no other callers of these two functions across repo ===

### Assistant | 2026-06-22T19:43:26.519Z

Blast radius fully traced:
- `extractWithTiling` has zero references to the new helpers — the tiling branch is genuinely independent. ✓
- The two new exports (`resolvePageTitleBlockUnit`, `pageForceUnit`) have exactly TWO consumers (training-loop + validate), both verified. No third silently-broken consumer. ✓

I have completed all 7 review axes plus full blast-radius tracing and a live test run. Here is my verdict.

---

VERDICT: PASS

summary: The per-print unit-propagation change is field-shape-correct against the real `parseVisionResponse` contract (all three fallback paths — `extraction.units`, `extraction.title_block.units`, `extraction.unit_resolution.drawing_units` — actually exist and carry the same value), the two new helpers are pure and null-safe, both consumers wire them behind correct guards, and the OFF path is byte-equivalent to the prior code. The exact silent-no-op bug class the task warned about (a field-name mismatch on the fused/per-model shape) is NOT present. 117/117 lib tests pass live.

findings: none

Consumers / edge-paths traced for audit:
- `H:/prism/scripts/lib/vision-ensemble-fuse.mjs:443,450` — `per_model_runs[].extraction` is set to `ocrImageWithModelAsync`'s return, which is `parseVisionResponse(...).extraction` (the RAW extraction, line 401), not the `{success,error,extraction}` wrapper. The helper reads the correct object.
- `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs:845,822,855` — confirms `extraction.units` / `title_block.units` / `unit_resolution.drawing_units` all exist and all equal `drawingUnits`.
- `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs:167` — `normalizeUnit` returns only `in|mm|mixed|null`; helper counts only `in`/`mm`, so `mixed`/`null` correctly abstain; 1-1 tie → null (no anchor on a disagreed guess).
- Circular-import: `vision-ensemble-fuse.mjs` imports FROM `ollama-vision-extract-lib.mjs` (the leaf); the lib has zero back-import (grep empty). No cycle, no load-order hazard.
- `env` import: traini
... [+1425 chars truncated]
