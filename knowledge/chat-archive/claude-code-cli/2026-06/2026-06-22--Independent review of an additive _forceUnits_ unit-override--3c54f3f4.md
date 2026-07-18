---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Independent review of an additive `forceUnits` unit-override threaded through PR"
date: "2026-06-22"
first_ts: "2026-06-22T15:57:02.849Z"
last_ts: "2026-06-22T16:01:59.225Z"
cwd: "H:\\prism"
messages: 81
user_msgs: 29
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-aa1e48c1fbd23359d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent review of an additive `forceUnits` unit-override threaded through PR

> **claude-code-cli** | 2026-06-22 | 81 msgs (29 user / 52 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-aa1e48c1fbd23359d.jsonl`

## Transcript

### User | 2026-06-22T15:57:02.849Z

Independent review of an additive `forceUnits` unit-override threaded through PRISM's VLM blueprint-OCR chain (fixes a region-tiling bug: tiles lose the title block and guess wrong units). Read:
- H:/prism/scripts/lib/ollama-vision-extract-lib.mjs (extractDimension NEW forceUnits 4th param + parseVisionResponse threading; the new test "parseVisionResponse: forceUnits is AUTHORITATIVE")
- H:/prism/scripts/lib/vision-ensemble-fuse.mjs (forceUnits threaded through ocrImageWithModelAsync + runEnsembleOverImage)
- H:/prism/scripts/vision-tiling-extract.mjs (extractWithTiling forces units on tiles not baseline; --force-units CLI; the new test "TILES get forceUnits ... baseline does NOT")
- H:/prism/scripts/vision-tiling-extract.test.mjs + H:/prism/scripts/lib/ollama-vision-extract-lib.test.mjs (the new tests)

CONTEXT: All existing tests pass (extract-lib 93, ensemble-fuse 32, orchestrator 14). Live E2E: Ø.94 now 23.876mm (was 0.940mm), 0 unconverted sub-mm diameters, cross-tile duplicates now merge correctly. The semantic decision: for tiling, --assume-units is treated as AUTHORITATIVE on tiles (forced), because tiling structurally strips the title block; on the full-page baseline it stays a fallback.

Grade PASS or FAIL, weighted toward:
1. DESIGN SOUNDNESS: is "assumeUnits becomes authoritative (forced) for tiles" the right call? Could it MIS-force a genuinely mixed-units drawing (some mm dims on an inch drawing)? Is that risk acceptable / documented? Is the explicit --force-units escape hatch sufficient?
2. TEST INTEGRITY (R9): do the new tests assert real reference values (0.94*25.4=23.876) and pin the override precedence (forced over both d.unit AND drawing units)? Does the orchestrator test prove tiles-forced/baseline-unforced? Any missing case (invalid forceUnits string, forceUnits with no assumeUnits)?
3. CONVENTION + DOC: ASCII-only, JSDoc updated for the new param, comments accurate? Is the authoritative-on-tiles semantic clearly documented for a future maintai
... [+300 chars truncated]

### Assistant | 2026-06-22T15:57:05.986Z

I'll review the additive `forceUnits` unit-override change across the VLM blueprint-OCR chain. Let me read all the relevant files end-to-end.

### Assistant | 2026-06-22T15:57:06.342Z

[tool_use: Read]

### Assistant | 2026-06-22T15:57:06.820Z

[tool_use: Read]

### Assistant | 2026-06-22T15:57:07.217Z

[tool_use: Read]

### User | 2026-06-22T15:57:09.204Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ollama-vision-extract-lib.mjs' was already read 15s ago in this session and is unchanged (mtime 1782143448678). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:57:10.296Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-ensemble-fuse.mjs' was already read 15s ago in this session and is unchanged (mtime 1782143499594). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:57:10.317Z

[tool_result] read-once-guard: 'H:\prism\scripts\vision-tiling-extract.mjs' was already read 16s ago in this session and is unchanged (mtime 1782143551417). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T15:57:13.185Z

The read-once guard says these files are already in my context, but I don't actually have their content yet from this session. Let me disable the cache and read them fresh.

### Assistant | 2026-06-22T15:57:13.605Z

[tool_use: Read]

### Assistant | 2026-06-22T15:57:13.957Z

[tool_use: Read]

### User | 2026-06-22T15:57:15.004Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ollama-vision-extract-lib.mjs' was already read 22s ago in this session and is unchanged (mtime 1782143448678). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:57:15.202Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-ensemble-fuse.mjs' was already read 20s ago in this session and is unchanged (mtime 1782143499594). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T15:57:17.724Z

The guard keeps blocking but I don't have the content. Let me disable the read cache via the env var as the guard suggests.

### Assistant | 2026-06-22T15:57:18.432Z

[tool_use: Bash]

### User | 2026-06-22T15:57:25.892Z

[tool_result] // scripts/lib/ollama-vision-extract-lib.mjs
//
// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
//
// Builds the engineering-print extraction prompt and parses the model's JSON

### Assistant | 2026-06-22T15:57:31.090Z

The file is accessible. The read-once guard claims the content is in my context but it isn't — it was likely read by a different agent. Let me set the env var to bypass the guard properly for the Read tool.

### Assistant | 2026-06-22T15:57:31.756Z

[tool_use: Bash]

### User | 2026-06-22T15:57:44.697Z

[tool_result] cache disabled

### Assistant | 2026-06-22T15:57:47.836Z

Bash env doesn't persist to the Read tool. I'll read the files via Bash with line numbers since the Read guard is blocking. Let me get the full content with line numbers.

### Assistant | 2026-06-22T15:57:48.727Z

[tool_use: Bash]

### User | 2026-06-22T15:57:54.557Z

[tool_result] <persisted-output>
Output too large (55.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\3c54f3f4-6786-4c39-84d6-62b0a0db8cad\tool-results\b23qrixff.txt

Preview (first 2KB):
1:// scripts/lib/ollama-vision-extract-lib.mjs
2://
3:// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4://
5:// Builds the engineering-print extraction prompt and parses the mod
... [+1772 chars truncated]

### Assistant | 2026-06-22T15:57:58.229Z

The output is large. Let me read the saved full output file to get the complete content with line numbers.

### Assistant | 2026-06-22T15:57:59.801Z

[tool_use: Read]

### User | 2026-06-22T15:58:04.300Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-787 of 945 total (25501 tokens, cap 25000). Call Read with offset=788 limit=787 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	1:// scripts/lib/ollama-vision-extract-lib.mjs
2	2://
3	3:// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vi
... [+51474 chars truncated]

### Assistant | 2026-06-22T15:58:08.400Z

I have the core extract-lib content. The key change in `extractDimension` (lines 487-500) and `parseVisionResponse` (lines 642-710) is clear. Let me read the rest of the extract-lib file (after line 787) and then the other files.

### Assistant | 2026-06-22T15:58:09.158Z

[tool_use: Read]

### User | 2026-06-22T15:58:12.382Z

[tool_result] 788	788:      // (size_vram==size in /api/ps) on a 16GB card with the chat fleet running.
789	789:      // Footprint is NOT KV-dominated for this model: ctx8192→14.3GB vs ctx3072→
790	790:      // 14.3GB was measured for qwen2.5vl:7b (the old default — a ~13.7GB weights+
791	791:      // graph FLOOR that spilled to CPU → >180s/page; that is why the default moved
792	792:      // to qwen3-vl-instru
... [+8296 chars truncated]

### Assistant | 2026-06-22T15:58:15.183Z

I have the complete extract-lib. Now let me read the ensemble-fuse and tiling files with line numbers.

### Assistant | 2026-06-22T15:58:16.874Z

[tool_use: Bash]

### User | 2026-06-22T15:58:24.283Z

[tool_result] 40://   ocrImageWithModelAsync · runEnsembleOverImage
75:export function combineConfidenceNoisyOr(confs) {
95:export function normalizeModelDim(d) {
124:export function clusterAcrossModels(perModel, opts = {}) {
170:function weightedMeanMm(members) {
197:export function fuseEnsemble(modelExtractions, opts = {}) {
338:function curlAsync(args, deps = {}) {
372: *   partClass?:string, wireEdm?:boolea
... [+573 chars truncated]

### Assistant | 2026-06-22T15:58:26.580Z

Now let me read the relevant sections of ensemble-fuse around those line numbers.

### Assistant | 2026-06-22T15:58:27.351Z

[tool_use: Read]

### User | 2026-06-22T15:58:28.781Z

[tool_result] 360	    if (child.stderr) child.stderr.on("data", (d) => { stderr += d.toString(); });
361	    child.on("error", (e) => { stderr += (e && e.message) || String(e); done(null); });
362	    child.on("close", (code) => done(code));
363	  });
364	}
365	
366	/**
367	 * Impure: OCR one already-base64'd image with a SPECIFIC model via Ollama, async. Returns
368	 * the parsed extraction or {error}. Never t
... [+5986 chars truncated]

### Assistant | 2026-06-22T15:58:32.844Z

I notice the JSDoc for `ocrImageWithModelAsync` (lines 370-376) does NOT list `forceUnits` as a parameter, even though it's used on line 399. Let me note that. Now let me read the tiling extract file.

### Assistant | 2026-06-22T15:58:34.443Z

[tool_use: Bash]

### User | 2026-06-22T15:58:43.370Z

[tool_result] 6:// Splits a blueprint page PNG into overlapping tiles (computeTileGrid), OCRs EACH tile with the
7:// multi-VLM ensemble (runEnsembleOverImage), then recombines the per-tile dimension sets into one
12:// The orchestrator `extractWithTiling(opts, deps)` is PURE over injectable deps (readImageSize /
19://        [--assume-units in] [--baseline] [--json] [--keep] [--out <report.json>]
20://   --bas
... [+6417 chars truncated]

### Assistant | 2026-06-22T15:58:46.295Z

Now let me read the key section of the tiling extract file (the `extractWithTiling` function and the baseline path) in detail.

### Assistant | 2026-06-22T15:58:47.035Z

[tool_use: Read]

### User | 2026-06-22T15:58:48.778Z

[tool_result] 85	export async function extractWithTiling(opts, deps = {}) {
86	  if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath) throw new Error("extractWithTiling: pngPath required");
87	  const readImageSize = deps.readImageSize || readPngSize;
88	  const cropTiles = deps.cropTiles || cropTilesPy;
89	  const runEnsemble = deps.runEnsemble || runEnsembleOverImage;
90	  const models = Array.isAr
... [+3805 chars truncated]

### system

... [1 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-22T15:58:53.902Z

[tool_use: Read]

### User | 2026-06-22T15:58:55.785Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vision-tiling-extract.mjs
3	//
4	// U-XRAY-TILING-EXTRACT -- P0.2 dense-page region tiling, end to end.
5	//
6	// Splits a blueprint page PNG into overlapping tiles (computeTileGrid), OCRs EACH tile with the
7	// multi-VLM ensemble (runEnsembleOverImage), then recombines the per-tile dimension sets into one
8	// de-duplicated set (mergeTiledDimensions). Tiling ra
... [+2058 chars truncated]

### Assistant | 2026-06-22T15:59:02.403Z

I notice the USAGE block (lines 16-23) does NOT mention `--force-units` even though `parseArgs` handles it (line 195). And the JSDoc @param for `extractWithTiling` (lines 77-78) doesn't list `forceUnits` or `baseline`. Let me note these. Now let me read the tests. First the tiling test.

### Assistant | 2026-06-22T15:59:05.475Z

[tool_use: Bash]

### User | 2026-06-22T15:59:12.506Z

[tool_result] 13:test("readPngSize: parses width/height from a crafted PNG IHDR header (exact reference values)", () => {
27:test("readPngSize: throws fail-loud on a non-PNG / too-short file", () => {
36:test("computeLift: counts NEW-in-tiled, shared, and only-in-baseline by type+value", () => {
48:test("computeLift: value-less callouts (no nominal_mm) match by raw_text", () => {
85:test("extractWithTiling: til
... [+1935 chars truncated]

### Assistant | 2026-06-22T15:59:15.777Z

Let me read the key new test in full (the forceUnits test at line 163-181).

### Assistant | 2026-06-22T15:59:16.414Z

[tool_use: Read]

### User | 2026-06-22T15:59:18.363Z

[tool_result] 157	test("extractWithTiling: without --baseline, no baseline/lift is computed", async () => {
158	  const out = await extractWithTiling({ pngPath: "page.png" }, mockDeps());
159	  assert.equal(out.baseline, null);
160	  assert.equal(out.lift, null);
161	});
162	
163	test("extractWithTiling: TILES get forceUnits (global units authoritative); the full-page BASELINE does NOT", async () => {
164	  // 
... [+2781 chars truncated]

### Assistant | 2026-06-22T15:59:21.346Z

The orchestrator test (line 163-182) proves: tiles get forceUnits="in", baseline gets forceUnits=undefined, and explicit forceUnits beats assumeUnits. Good. Now let me read the new test in the extract-lib test file (the "forceUnits is AUTHORITATIVE" test).

### Assistant | 2026-06-22T15:59:23.344Z

[tool_use: Bash]

### User | 2026-06-22T15:59:28.305Z

[tool_result] 804:test("parseVisionResponse: forceUnits is AUTHORITATIVE -- overrides a per-dim unit guess and the drawing units", () => {
806:  // is inch. forceUnits:in must win -> 0.94in -> 23.876mm (the Ø.94=0.940mm-vs-23.876mm caveat fix).
811:  const forced = parseVisionResponse(resp, { forceUnits: "in" }).extraction.dimensions[0];
812:  assert.equal(forced.nominal_mm, 0.94 * 25.4); // 23.876 -- inch forc
... [+169 chars truncated]

### Assistant | 2026-06-22T15:59:30.355Z

Let me read this new test in full to assess its integrity.

### Assistant | 2026-06-22T15:59:31.162Z

[tool_use: Read]

### User | 2026-06-22T15:59:32.848Z

[tool_result] 804	test("parseVisionResponse: forceUnits is AUTHORITATIVE -- overrides a per-dim unit guess and the drawing units", () => {
805	  // Region tiling use-case: a tile that lost the title block guesses unit:mm on ".94"; the global drawing
806	  // is inch. forceUnits:in must win -> 0.94in -> 23.876mm (the Ø.94=0.940mm-vs-23.876mm caveat fix).
807	  const resp = JSON.stringify({
808	    title_block: {
... [+660 chars truncated]

### Assistant | 2026-06-22T15:59:39.166Z

This test is strong: it asserts `0.94 * 25.4` (the real reference value 23.876), pins forced-over-both (dim unit `mm` AND drawing units `mm` both overridden), and proves the unforced control yields 0.94 (so the override is what changed it). 

Now let me verify the diff to confirm exactly what changed and check there's no silent behavior change for non-tiling callers. Let me also check the `forced` value handling for `mixed` and invalid strings.

### Assistant | 2026-06-22T15:59:40.607Z

[tool_use: Bash]

### User | 2026-06-22T15:59:50.001Z

[tool_result]  .../__tests__/mcp-bridge-enforce-pretool.test.mjs  |     96 +-
 .claude/hooks/auto-consensus-userprompt.mjs        |     26 +-
 .claude/hooks/auto-consensus-userprompt.test.mjs   |     41 +
 .claude/hooks/loop-iteration-inject.mjs            |     10 +-
 .claude/hooks/mcp-bridge-enforce-pretool.mjs       |     52 +-
 .claude/hooks/model-tier-advisor.mjs               |     19 +-
 .claude/hooks/re
... [+3453 chars truncated]

### Assistant | 2026-06-22T15:59:56.460Z

The working tree has a large unrelated diff. Let me focus the diff on just the four target files to see precisely what changed for this unit.

### Assistant | 2026-06-22T15:59:58.280Z

[tool_use: Bash]

### User | 2026-06-22T16:00:09.475Z

[tool_result] diff --git a/scripts/lib/ollama-vision-extract-lib.mjs b/scripts/lib/ollama-vision-extract-lib.mjs
index eabfcf55d4..597c7280e8 100644
--- a/scripts/lib/ollama-vision-extract-lib.mjs
+++ b/scripts/lib/ollama-vision-extract-lib.mjs
@@ -484,15 +484,19 @@ function sfRaValue(x) {
   return null;
 }
 
-function extractDimension(d, drawingUnits, assumeUnits) {
+function extractDimension(d, drawingUnits,
... [+10356 chars truncated]

### Assistant | 2026-06-22T16:00:14.715Z

Now I have the complete, precise diff. The change is cleanly additive. Let me verify a few correctness concerns:

1. The `forced` value handling for invalid/`mixed` strings (the `normalizeUnit` path).
2. Whether the tests actually run green (the context says they do, but let me confirm the new test fails when the logic breaks — R9).
3. Whether `forceUnits` on a tolerance gets the same treatment (line 522-523 uses `conv.unit`, which is derived from the forced unit — let me verify that chain).

Let me check the tolerance conversion path interaction with forceUnits, and confirm `normalizeUnit("garbage")` returns null (so an invalid forceUnits string is safely ignored, not crashing).

### Assistant | 2026-06-22T16:00:24.142Z

[tool_use: Bash]

### User | 2026-06-22T16:00:30.954Z

[tool_result] invalid forceUnits -> unit: in nominal_mm: 50.8 (expect in, 50.8)
mixed forceUnits -> unit: in nominal_mm: 50.8 (expect in, 50.8 -- mixed not forced)
forceUnits no assumeUnits, no dim/drawing unit -> resolved: true assumed: false mm: 25.4 (expect resolved=true, assumed=false, 25.4)
tolerance under forceUnits=in -> nominal_mm: 25.4 tol_upper_mm: 0.254 (expect 25.4, 0.254)

### Assistant | 2026-06-22T16:00:36.782Z

All edge cases behave correctly:
- Invalid `forceUnits` string ("furlongs") -> safely ignored, falls through to dim unit (no crash).
- `forceUnits: "mixed"` -> not forced (guard requires `in`|`mm`), falls through correctly.
- `forceUnits` with NO assumeUnits and NO dim/drawing unit -> resolves correctly with `assumed=false` (it's authoritative, not assumed — semantically correct since the operator declared it).
- Tolerance correctly inherits the forced unit (0.01in -> 0.254mm).

Now let me confirm the R9 integrity — that the new tests actually fail if the logic regresses. Let me run the two new tests and also temporarily break the logic to confirm they catch it.

### Assistant | 2026-06-22T16:00:38.889Z

[tool_use: Bash]

### User | 2026-06-22T16:00:46.497Z

[tool_result] # Subtest: buildVisionPrompt: includes part_class hint
# Subtest: buildVisionPrompt: undefined part_class → 'unknown'
# Subtest: buildVisionPrompt: lists target feature kinds + custom override honored
# Subtest: buildVisionPrompt: rich contract zones all present
# Subtest: buildVisionPrompt: instructs JSON-only, no markdown, no array wrap
# Subtest: buildVisionPrompt: \#4 FIX — does NOT instruct i
... [+1102 chars truncated]

### Assistant | 2026-06-22T16:00:49.943Z

[tool_use: Bash]

### User | 2026-06-22T16:00:59.639Z

[tool_result] # tests 107
# pass 107
# fail 0
# cancelled 0
# skipped 0
# todo 0

### Assistant | 2026-06-22T16:01:02.869Z

107/107 pass. Now the R9 mutation check — let me confirm the new tests actually catch a regression. I'll revert the `forced` precedence in a temp copy and confirm the test goes red.

### Assistant | 2026-06-22T16:01:06.918Z

[tool_use: Bash]

### User | 2026-06-22T16:01:14.951Z

[tool_result] === Mutation 1: forced loses to dim unit ===
# tests 93
# pass 92
# fail 1

### Assistant | 2026-06-22T16:01:19.257Z

The lib test correctly goes red (1 fail) when `forced` loses precedence to the dim unit. Now mutate the orchestrator so the baseline ALSO gets forced (the wrong behavior) and confirm the tiling test catches it.

### Assistant | 2026-06-22T16:01:23.531Z

[tool_use: Bash]

### User | 2026-06-22T16:01:30.681Z

[tool_result] === Mutation 2: baseline forced too (wrong) ===
# tests 14
# pass 13
# fail 1
=== Restored -- verify green ===
# tests 14
# pass 14
# fail 0

### Assistant | 2026-06-22T16:01:34.862Z

Both mutation tests confirm R9 integrity: the new tests genuinely fail when the logic regresses (forced-precedence and baseline-not-forced are both load-bearing assertions), and pass again after restore. The files are restored to their original state.

Now let me verify the ASCII-only convention and check for any non-tiling callers of the shared lib that could be affected (silent behavior change risk). Let me grep for other callers of `parseVisionResponse` and `ocrImageWithModelAsync`/`runEnsembleOverImage`.

### Assistant | 2026-06-22T16:01:36.779Z

[tool_use: Bash]

### User | 2026-06-22T16:01:47.108Z

[tool_result] scripts/blueprint-ocr-training-loop.mjs:232:      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format: opts.format, workDir });
scripts/blueprint-ocr-training-loop.mjs:331:          const res = await runEnsembleOverImage({ png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format
... [+1106 chars truncated]

### Assistant | 2026-06-22T16:01:52.117Z

All external callers pass options WITHOUT `forceUnits` (only `assumeUnits` or `{}`). Since `forceUnits` is read via `opts.forceUnits` and defaults to `undefined` -> `normalizeUnit(undefined)` returns `null` -> `forced = null`, the precedence chain falls back to exactly the pre-change behavior (`normalizeUnit(d.unit) || drawingUnits ...`). This confirms ZERO silent behavior change for non-tiling callers. The change is purely additive.

Let me do a final ASCII-only check on the changed lines (the comments use `->` and `Ø` — let me verify which file contains `Ø` and whether it's in code or a comment).

### Assistant | 2026-06-22T16:01:54.363Z

[tool_use: Bash]

### User | 2026-06-22T16:01:59.225Z

[tool_result] (Bash completed with no output)
