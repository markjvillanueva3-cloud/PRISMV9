---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review an uncommitted change in the PRISM repo at H:\\prism. Grade PASS or FAIL w"
date: "2026-06-23"
first_ts: "2026-06-23T00:27:30.470Z"
last_ts: "2026-06-23T00:29:17.411Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-adc23255210a7f24a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review an uncommitted change in the PRISM repo at H:\prism. Grade PASS or FAIL w

> **claude-code-cli** | 2026-06-23 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-adc23255210a7f24a.jsonl`

## Transcript

### User | 2026-06-23T00:27:30.470Z

Review an uncommitted change in the PRISM repo at H:\prism. Grade PASS or FAIL with file:line. Run `git -C H:/prism diff -- scripts/lib/region-glue-lib.mjs scripts/region-classify.mjs` and read the two test files (scripts/lib/region-glue-lib.test.mjs, scripts/region-classify.test.mjs).

CONTEXT: P1.5 step-3b UNBLOCK (slot:xray). The training cron (blueprint-ocr-training-loop.mjs) builds labels from a FULL fused object (dims + gdt + notes + profiles + surface_finishes + summary), but region routing was dimension-only -- so wiring it into the cron would drop non-dimension labels. This change adds:
1. `buildRegionRoutedFused(mergedDimensions, fullPageFused)` in region-glue-lib.mjs -- returns `{...fullPageFused, dimensions: mergedDimensions}` (region dims swapped in, all non-dimension labels preserved from the full-page floor pass); null/non-object fullPageFused -> `{dimensions: dims}`; non-array dims -> [].
2. extractWithRegionRouting now returns `fused` on BOTH routes: full_page -> the full-page pass's fused; region_route -> buildRegionRoutedFused(merged.dimensions, fullPageFused). Plus fullPage.fused.

VERIFY:
1. buildRegionRoutedFused correctness + PURITY (does NOT mutate fullPageFused -- spread is shallow; confirm the input dimensions array isn't aliased in a way that mutates the caller). Edge cases (null/undefined/non-array).
2. extractWithRegionRouting: is `fused` correct on both routes? On full_page, fused = the real full-page fused (not the hybrid). On region_route, fused.dimensions = the region union, non-dim fields from the full-page floor. When the full-page floor FAILED (fullRes.fused null), is fused still safe (buildRegionRoutedFused(dims, null) -> {dimensions: dims}, no crash)?
3. Did the change preserve all existing return fields (dimensions, merged, fullPage.dimensions/ok, perRegion, cropSpecs, lift, regionsOcrOk/Failed)? Any regression to the existing contract the prior tests/consumers rely on?
4. HONEST-LIMIT correctness: on a failed full-page floor t
... [+322 chars truncated]

### Assistant | 2026-06-23T00:27:34.937Z

I'll analyze this change. Let me start by reading the diff and the test files.

### Assistant | 2026-06-23T00:27:36.420Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:27:36.869Z

[tool_use: Read]

### Assistant | 2026-06-23T00:27:37.207Z

[tool_use: Read]

### User | 2026-06-23T00:27:41.313Z

[tool_result] diff --git a/scripts/lib/region-glue-lib.mjs b/scripts/lib/region-glue-lib.mjs
index c97a5a4fb6..2daa7b7596 100644
--- a/scripts/lib/region-glue-lib.mjs
+++ b/scripts/lib/region-glue-lib.mjs
@@ -149,3 +149,29 @@ export function mergeRegionResults(perRegion, fullPageDims, cropSpecs, pageW, pa
   const tiles = buildMergeTiles(cropSpecs, pageW, pageH);
   return mergeTiledDimensions(perTile, { tiles,
... [+4318 chars truncated]

### User | 2026-06-23T00:27:43.579Z

[tool_result] 1	/**
2	 * region-glue-lib -- unit tests for the P1.5 step-2 pure orchestration core.
3	 *
4	 * Pins the two correctness-critical seams of region routing:
5	 *   1. scaleBboxToPixels -- fractional bbox -> integer pixel crop (a missed/wrong scaling crops a
6	 *      ~1px box = silent recall loss). Degenerate (<1px) -> null -> caller full-page-floors it.
7	 *   2. mergeRegionResults -- the RECALL-FI
... [+10596 chars truncated]

### User | 2026-06-23T00:27:43.651Z

[tool_result] 1	/**
2	 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
3	 *
4	 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
5	 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
6	 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full
... [+8851 chars truncated]

### Assistant | 2026-06-23T00:27:46.752Z

Now let me read the surrounding context in region-classify.mjs to verify the `fused` extraction and check the full-page floor path, plus how the cron consumer reads the result.

### Assistant | 2026-06-23T00:27:47.737Z

[tool_use: Read]

### Assistant | 2026-06-23T00:27:48.441Z

[tool_use: Read]

### User | 2026-06-23T00:27:49.648Z

[tool_result] 90	function ensembleOk(res) {
91	  const okModels = res ? res.models_ok : undefined;
92	  return !!res && !res.error && (typeof okModels === "number" ? okModels > 0 : true);
93	}
94	
95	/**
96	 * Segment a page, route its regions, OCR each region + the full-page floor, and UNION them. Pure
97	 * over injectable deps.
98	 *
99	 * @param {{pngPath:string, models?:string[], segmentModel?:string, segm
... [+6465 chars truncated]

### User | 2026-06-23T00:27:50.266Z

[tool_result] 100	 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} cropSpecs
101	 * @param {number} pageW
102	 * @param {number} pageH
103	 * @returns {Array<{id:string,x:number,y:number,w:number,h:number}>}
104	 */
105	export function buildMergeTiles(cropSpecs, pageW, pageH) {
106	  const tiles = [];
107	  if (Array.isArray(cropSpecs)) {
108	    for (const s of cropSpecs) {
109	      if (s &&
... [+3846 chars truncated]

### Assistant | 2026-06-23T00:27:54.728Z

Now let me verify the consumer (the training cron) to confirm the contract it expects from `fused`, and check whether any existing consumers depend on the prior `fullPage` shape or on `extractWithRegionRouting`'s return.

### Assistant | 2026-06-23T00:27:56.374Z

[tool_use: Grep]

### User | 2026-06-23T00:27:58.292Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:43:  buildTrainsetRow,
scripts\blueprint-ocr-training-loop.mjs:242:      const nm = res.fused.summary.n_models;
scripts\blueprint-ocr-training-loop.mjs:244:      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
scripts\blueprint-ocr-training-loop.mjs:322:      // temp-PNG cleanup fires even if buildTrainsetRow/classifyActiveLe
... [+8709 chars truncated]

### Assistant | 2026-06-23T00:28:02.382Z

The cron consumer `buildTrainsetRow` accesses `res.fused.summary.n_models` and `res.fused.dimensions`. Let me verify how the consumer reads `summary` and confirm the hybrid `fused` from `buildRegionRoutedFused` carries a `summary`, and check `buildTrainsetRow` itself for null-safety on `summary`.

### Assistant | 2026-06-23T00:28:03.325Z

[tool_use: Read]

### Assistant | 2026-06-23T00:28:04.075Z

[tool_use: Read]

### User | 2026-06-23T00:28:05.859Z

[tool_result] 120	 * This closes the calibration-domain leak: a single-model run (n_models<2, fraction always 1.0 by
121	 * self-agreement) can NEVER mint trainable labels.
122	 * @param {{part:string, image:string}} part
123	 * @param {{dimensions:Array, summary:object}} fused  fuseEnsemble output
124	 * @param {object} calibration
125	 * @param {{thresholds?:object}} [opts]
126	 * @returns {object} trainset r
... [+3357 chars truncated]

### User | 2026-06-23T00:28:06.258Z

[tool_result] 230	  const calSamples = [];
231	  const calCases = [];
232	  if (opts.calibrateCount > 0) {
233	    const workDir = join(tmpdir(), `ocr-tl-cal-${pid}`);
234	    mkdirSync(workDir, { recursive: true });
235	    console.log(`\n  [1/3] CALIBRATE — ${opts.calibrateCount} synthetic prints (${opts.difficulties.join("/")})`);
236	    for (let i = 0; i < opts.calibrateCount; i++) {
237	      const diffic
... [+1823 chars truncated]

### Assistant | 2026-06-23T00:28:12.491Z

I have a complete picture now. Let me verify one important integration point: the cron consumer at line 363 calls `buildTrainsetRow(..., res.fused, calibration)`. The change is being made specifically to unblock wiring region routing into that cron. Let me check whether the cron actually consumes `extractWithRegionRouting`'s result yet (line 363 uses `res.fused` — is `res` from `extractWithRegionRouting` or from `runEnsembleOverImage`?).

### Assistant | 2026-06-23T00:28:13.508Z

[tool_use: Read]

### User | 2026-06-23T00:28:15.726Z

[tool_result] 330	      // to pure per-page resolution with PRISM_OCR_PER_PRINT_UNIT_DISABLE=1. printUnit RESETS per print.
331	      let printUnit = null, unanchoredOcrdPages = 0;
332	      const autoUnit = !opts.forceUnits && env.PRISM_OCR_PER_PRINT_UNIT_DISABLE !== "1";
333	      try {
334	        for (const { page, png } of rast.pages) {
335	          // OPT-IN pre-VLM gate: a CONFIDENT non-drawing page is 
... [+3860 chars truncated]

### Assistant | 2026-06-23T00:28:25.792Z

I now have full context. The cron at line 363 still uses `runEnsembleOverImage` directly (`res.fused`), not `extractWithRegionRouting` — so this change is the *enabling* step (it makes `extractWithRegionRouting` return a `fused`-shaped object so a future wiring can substitute it). The current change is purely additive to `extractWithRegionRouting`'s return shape; the cron is NOT yet wired to it. That is consistent with "step-3b UNBLOCK".

Let me trace the key correctness concerns and run the tests to confirm.

### Assistant | 2026-06-23T00:28:26.692Z

[tool_use: Bash]

### User | 2026-06-23T00:28:38.442Z

[tool_result]   ...
# Subtest: buildRegionRoutedFused: non-array dims -> [] (never undefined into a label builder)
ok 15 - buildRegionRoutedFused: non-array dims -> [] (never undefined into a label builder)
  ---
  duration_ms: 0.0727
  ...
# Subtest: buildRegionRoutedFused: does NOT mutate the input full-page fused (pure)
ok 16 - buildRegionRoutedFused: does NOT mutate the input full-page fused (pure)
  ---
  
... [+816 chars truncated]

### Assistant | 2026-06-23T00:28:54.206Z

All 26 tests pass (16 + 10). Let me now do my analytical pass on the concerns, including the subtle aliasing/mutation question and the `summary` null-safety on the hybrid path.

**Analysis of each concern:**

1. **`buildRegionRoutedFused` purity (region-glue-lib.mjs:171-177):** `{ ...fullPageFused, dimensions: dims }` is a shallow copy producing a new object — the input `fullPageFused` is not mutated. The `dimensions` property is overwritten with `dims` (the `merged.dimensions` array), so the caller's `fullPageFused.dimensions` is not aliased. Confirmed pure. The no-mutation test (test 16) and `notEqual(out, fp)` pin this.

2. **Shared-reference aliasing of `dims`:** `out.dimensions === merged.dimensions` (same array reference) — but `merged.dimensions` is a fresh array produced by `mergeTiledDimensions`, not aliased to any input, so no caller-visible mutation hazard. And `out.gdt === fullPageFused.gdt` (shallow copy shares nested object refs) — standard shallow-copy semantics; the consumer `buildTrainsetRow` only reads, never mutates, so safe.

3. **`fused` on both routes:**
   - full_page (region-classify.mjs:143): `fused = fullFused` = the real full-page pass fused (not a hybrid). Correct. Test 10 confirms.
   - region_route (region-classify.mjs:187): `fused = buildRegionRoutedFused(merged.dimensions, fullFused)` = region dims + full-page non-dim fields. Correct. Test 9 confirms.

4. **Failed full-page floor (`fullRes.fused` null):** `fullFused = fullRes && fullRes.fused ? fullRes.fused : null` (lines 137, 179). On region_route with a null fullFused, `buildRegionRoutedFused(dims, null)` returns `{ dimensions: dims }` — no crash. Honest limit documented at lib:161-165. Correct.

5. **Existing contract preservation:** All prior return fields preserved (`route`, `page`, `decision`, `dimensions`, `merged`, `fullPage.{dimensions,ok}`, `perRegion`, `cropSpecs`, `lift`, `regionsOcrOk/Failed`). The change only ADDS `fused` (top-level) and `fullPage.fused`. No field remov
... [+344 chars truncated]

### Assistant | 2026-06-23T00:28:55.137Z

[tool_use: Read]

### User | 2026-06-23T00:28:57.663Z

[tool_result] 218	                } else if (opts.regionRoute) {
219	                  // P1.5 region routing: segment -> route -> crop each region -> OCR -> UNION with a
220	                  // full-page floor (recall-first). assumeUnits forced onto regions (they lose the title
221	                  // block, like tiles); the full-page floor keeps it. Dims from the merged union (value_mm).
222	               
... [+1400 chars truncated]

### Assistant | 2026-06-23T00:29:17.411Z

Confirmed: `validate-perfect-parts.mjs:228` reads `rr.dimensions` (unchanged field) — it does NOT read `rr.fused`, so it's unaffected by the change and remains correct. The grep hit at line 232 was the non-region-route branch reading `res.fused.dimensions` from `runEnsembleOverImage` (a different object). No consumer is broken.

I have fully traced the blast radius. Here is my verdict.

VERDICT: PASS

summary: The change is strictly additive — it adds a top-level `fused` and `fullPage.fused` to `extractWithRegionRouting`'s return and a pure `buildRegionRoutedFused` helper. No existing return field was removed/renamed, no consumer reads the new field yet in a way that could break, and every edge path (null full-page floor, non-array dims, no-mutation) is covered by real assertions. All 26 tests pass (16 + 10). The honest-limit (empty gdt/notes when the full-page floor itself failed) is documented and unavoidable.

findings:
- [P2] scripts/lib/region-glue-lib.mjs:176 — `buildRegionRoutedFused` returns `out.dimensions === merged.dimensions` (the same array reference the caller's `merged.dimensions` already holds, and `out.gdt === fullPageFused.gdt` via shallow spread). This is correct for the current read-only consumer (`buildTrainsetRow` only reads), but if a future consumer mutates `result.fused.dimensions` or a nested non-dim field in place, it would silently mutate the sibling `result.merged.dimensions` / `result.fullPage.fused`. Not a defect today; note it if a write-path consumer is ever wired. No fix required now — document the shared-reference contract or deep-copy only if a mutating consumer appears.
- [P2] scripts/region-classify.mjs:179 — `fullFused` is recomputed identically at lines 137 and 179 (`fullRes && fullRes.fused ? fullRes.fused : null`). Minor duplication, not a correctness issue; could hoist above the route branch. No action needed.

Consumers / edge-paths traced (auditable PASS):
- `scripts/blueprint-ocr-training-loop.mjs:363-375` — the named ta
... [+1164 chars truncated]
