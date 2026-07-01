---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review a small, self-contained 2-file change in the PRISM blueprint-vision (xray"
date: "2026-06-23"
first_ts: "2026-06-23T00:48:42.179Z"
last_ts: "2026-06-23T00:51:03.733Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a1565bfd57c5b7188.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a small, self-contained 2-file change in the PRISM blueprint-vision (xray

> **claude-code-cli** | 2026-06-23 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a1565bfd57c5b7188.jsonl`

## Transcript

### User | 2026-06-23T00:48:42.179Z

Review a small, self-contained 2-file change in the PRISM blueprint-vision (xray) OCR P1.5 region-routing subsystem. Read BOTH files END-TO-END:

1. H:\prism\scripts\lib\region-glue-lib.mjs  (the pure orchestration core)
2. H:\prism\scripts\region-classify.mjs       (the live glue orchestrator that consumes it)

THE CHANGE under review (this iteration only): `buildRegionRoutedFused(mergedDimensions, fullPageFused, opts={})` gained a 3rd `opts.fallbackNModels` param. PURPOSE: when the full-page OCR floor FAILS on a dense page (returns a fused with NO usable `summary`, or null), but the per-region crops succeed and recover dims (the "dense-page rescue" — region routing's whole value), the hybrid fused must still carry a `summary.n_models` so the downstream training-cron consumer `buildTrainsetRow` (in scripts/lib/ocr-training-loop-lib.mjs) does NOT gate the rescued dims out of training (its corroboration gate is `summary.n_models >= 2`, defaulting to 0 when summary is absent). The consumer `extractWithRegionRouting` in region-classify.mjs now captures the region ensemble's n_models (via new helper `nModelsOf`, max over region passes) and passes it as `fallbackNModels`, and surfaces `regionNModels` in its return.

VERIFY, with file:line citations:
- CORRECTNESS: Does the fallback only synthesize a summary when the full-page summary is ABSENT (never overwrite a real full-page summary)? Is `n_hallucination_candidates` recomputed over the union in ALL branches? Is the function still pure (no input mutation)?
- INTEGRATION COUPLING: Is `fallbackNModels` actually wired from the region passes (not always 0)? Is synthesizing `summary.n_models` from the REGION ensemble depth a VALID corroboration signal for those region dims (the region fusion ran the same multi-model ensemble per crop)? Any case where this over-claims corroboration (e.g. single-model run → n_models=1 → gate correctly stays false)?
- SILENT BREAKAGE / REGRESSION: Does the default (no fallbackNModels passed, or
... [+461 chars truncated]

### Assistant | 2026-06-23T00:48:51.441Z

I'll read both files end-to-end, plus the downstream consumer that defines the corroboration contract.

### Assistant | 2026-06-23T00:48:51.965Z

[tool_use: Read]

### Assistant | 2026-06-23T00:48:52.052Z

[tool_use: Read]

### User | 2026-06-23T00:48:53.543Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+12269 chars truncated]

### User | 2026-06-23T00:48:53.683Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+14560 chars truncated]

### Assistant | 2026-06-23T00:48:57.272Z

Both files read end-to-end. Now I'll verify the downstream consumer contract that `fallbackNModels` is meant to satisfy, since that defines whether the synthesis is correct.

### Assistant | 2026-06-23T00:48:57.597Z

[tool_use: Read]

### User | 2026-06-23T00:48:59.126Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+20673 chars truncated]

### Assistant | 2026-06-23T00:49:11.038Z

I have the full consumer contract. Now I'll verify two things: (1) what `runEnsembleOverImage` returns for `summary.n_models` and `models_ok` (so `nModelsOf` is sound), and (2) whether `fused.summary.n_models` reflects the per-region ensemble depth correctly.

### Assistant | 2026-06-23T00:49:12.213Z

[tool_use: Grep]

### User | 2026-06-23T00:49:14.450Z

[tool_result] 193: *   summary: object,
197:export function fuseEnsemble(modelExtractions, opts = {}) {
232:      n_models: nModels,
282:  const summary = {
283:    n_models: nModels,
418: *   models_ok:number, models_failed:number, image:string,
421:export async function runEnsembleOverImage(a) {
426:  if (!a.png || typeof a.png !== "string") return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], mo
... [+464 chars truncated]

### Assistant | 2026-06-23T00:49:18.616Z

Let me read the key sections of `fuseEnsemble` and `runEnsembleOverImage` to confirm `n_models` semantics — specifically whether `n_models` reflects models that produced extractions vs models attempted.

### Assistant | 2026-06-23T00:49:19.137Z

[tool_use: Read]

### User | 2026-06-23T00:49:20.654Z

[tool_result] 197	export function fuseEnsemble(modelExtractions, opts = {}) {
198	  const runs = (Array.isArray(modelExtractions) ? modelExtractions : [])
199	    .filter((r) => r && typeof r === "object" && typeof r.model === "string" && r.extraction && typeof r.extraction === "object");
200	  const nModels = runs.length;
201	  const quorum = Number.isFinite(opts.quorum) && opts.quorum >= 1
202	    ? Math.floo
... [+5452 chars truncated]

### Assistant | 2026-06-23T00:49:25.524Z

This confirms the contract precisely. `fuseEnsemble`'s `summary.n_models = nModels = runs.length` (line 200/283) — the count of models that produced a valid extraction object, not models attempted. This is exactly the corroboration depth `buildTrainsetRow` expects. Let me verify `runEnsembleOverImage`'s return to confirm `models_ok` semantics for `nModelsOf`'s fallback path.

### Assistant | 2026-06-23T00:49:26.119Z

[tool_use: Read]

### User | 2026-06-23T00:49:28.015Z

[tool_result] 418	 *   models_ok:number, models_failed:number, image:string,
419	 * }>}
420	 */
421	export async function runEnsembleOverImage(a) {
422	  const deps = a.deps || {};
423	  const readFile = typeof deps.readFile === "function" ? deps.readFile : readFileSync;
424	  const now = typeof deps.now === "function" ? deps.now : Date.now;
425	  const models = Array.isArray(a.models) ? a.models.filter((m) => 
... [+2108 chars truncated]

### Assistant | 2026-06-23T00:49:33.824Z

Contract fully confirmed. `models_ok = okRuns.length` (line 454) and `fused.summary.n_models = okRuns.length` (line 447 feeds `fuseEnsemble` only the ok runs, where `nModels = runs.length` line 200). So both branches of `nModelsOf` return the same value (count of models that produced a valid extraction) — they are consistent, and it's the exact corroboration depth the gate wants.

Now let me trace the actual consumer of `region-classify.mjs`'s `fused` output to confirm the wiring is live and that `buildTrainsetRow` is actually called on this hybrid `fused`. The change is only valuable if a consumer feeds this `fused` into `buildTrainsetRow`.

### Assistant | 2026-06-23T00:49:35.272Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:49:36.534Z

[tool_use: Grep]

### User | 2026-06-23T00:49:38.658Z

[tool_result] H:\prism\scripts\blueprint-ocr-training-loop.mjs-42-  calibrateAgreement,
scripts\blueprint-ocr-training-loop.mjs:43:  buildTrainsetRow,
H:\prism\scripts\blueprint-ocr-training-loop.mjs-44-  classifyActiveLearning,
--
H:\prism\scripts\blueprint-ocr-training-loop.mjs-321-      // dims. The cursor stays per-PRINT (resume skips the whole print). try/finally guarantees the
scripts\blueprint-ocr-traini
... [+11945 chars truncated]

### User | 2026-06-23T00:49:41.302Z

[tool_result] Found 26 files
state\session-reorientation\reorientation-claude-6a8a0fc5.json
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
state\shared\ATOMIC_CLAIMS.json
scripts\region-classify.test.mjs
scripts\region-classify.mjs
scripts\lib\region-glue-lib.test.mjs
state\HANDOFF.md
scripts\lib\region-glue-lib.mjs
state\shared\handoffs\consolidated\xray.md
... [+1231 chars truncated]

### Assistant | 2026-06-23T00:49:47.418Z

Now I have a critical integration finding. The downstream consumer `blueprint-ocr-training-loop.mjs:363` calls `buildTrainsetRow(..., res.fused, ...)` but I need to verify whether `res.fused` there comes from `extractWithRegionRouting` (the region-routed hybrid) or from the older tiling path. Let me check that consumer.

### Assistant | 2026-06-23T00:49:48.280Z

[tool_use: Read]

### User | 2026-06-23T00:49:51.497Z

[tool_result] 300	  if (realPngs.length) {
301	    console.log(`\n  [2/3] WEAK-LABEL -- ${distinctTotal} distinct prints (${realPngs.length} listed, ${skippedWorklistDup} re-filed dup) | ${todo.length} todo | ${skippedCursorDone} done (resume) = ${distinctTotal ? ((skippedCursorDone / distinctTotal) * 100).toFixed(1) : "0.0"}% corpus${skippedNullKey ? ` | ${skippedNullKey} blank-skipped` : ""}`);
302	    for (c
... [+5891 chars truncated]

### Assistant | 2026-06-23T00:49:57.404Z

This is the key integration finding. The actual live training cron (`blueprint-ocr-training-loop.mjs:348`) calls `runEnsembleOverImage` directly — NOT `extractWithRegionRouting`. So `res.fused` at line 363 is the plain full-page ensemble fused, and the region-routing hybrid `fused` (with `fallbackNModels` synthesis) is NOT consumed by this cron yet. The only live consumer of `extractWithRegionRouting` is `validate-perfect-parts.mjs:222` (validation, not training). This bounds the actual blast radius of the change. Let me confirm the test for the rescue path and quickly check `validate-perfect-parts.mjs` to see if it reads `regionNModels`/`fused`.

### Assistant | 2026-06-23T00:49:58.351Z

[tool_use: Read]

### Assistant | 2026-06-23T00:49:59.153Z

[tool_use: Read]

### User | 2026-06-23T00:50:00.302Z

[tool_result] 165	  assert.deepEqual(r.fused.notes, ["FP NOTE"]);
166	  assert.ok(r.fused.dimensions.find((d) => d.nominal_mm === 25.4));
167	});
168	
169	test("DENSE-RESCUE: full-page floor FAILS but a region rescues -> hybrid summary.n_models synthesized (dims stay TRAINABLE for the cron)", async () => {
170	  // This is region routing's WHOLE VALUE for the training cron: a dense page the full-page VLM cannot
... [+1488 chars truncated]

### User | 2026-06-23T00:50:01.215Z

[tool_result] 210	});
211	
212	test("buildRegionRoutedFused: no summary on the full-page fused + no fallback -> no crash, no synthesized summary", () => {
213	  const out = buildRegionRoutedFused([{ type: "linear", nominal_mm: 5, hallucination_candidate: true }], { gdt: [] });
214	  assert.equal(out.summary, undefined, "absent summary stays absent (failed-floor case, no fallback -> AL via n_models=0 default)");
... [+3334 chars truncated]

### Assistant | 2026-06-23T00:50:06.255Z

I have everything needed. Let me verify the ASCII-only requirement on the two changed files and run the two test suites to confirm green, then finalize.

### Assistant | 2026-06-23T00:50:08.036Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:50:08.962Z

[tool_use: Bash]

### User | 2026-06-23T00:50:12.721Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN: both files

### User | 2026-06-23T00:50:17.574Z

[tool_result]   ...
# Subtest: buildRegionRoutedFused: full-page summary PRESENT + fallbackNModels -> full-page summary WINS (fallback ignored, no overwrite)
ok 22 - buildRegionRoutedFused: full-page summary PRESENT + fallbackNModels -> full-page summary WINS (fallback ignored, no overwrite)
  ---
  duration_ms: 0.0391
  ...
1..22
# tests 22
# suites 0
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
# dur
... [+465 chars truncated]

### Assistant | 2026-06-23T00:50:26.173Z

The grep `-P` failed (locale), but the fallback assertion ran on a clean byte scan. Let me confirm ASCII cleanliness properly with a byte-level check, since `-P` errored rather than confirmed.

### Assistant | 2026-06-23T00:50:27.636Z

[tool_use: Bash]

### User | 2026-06-23T00:50:31.818Z

[tool_result] scripts/lib/region-glue-lib.mjs: 0 non-printable/non-ascii lines
scripts/region-classify.mjs: 0 non-printable/non-ascii lines

### Assistant | 2026-06-23T00:51:03.733Z

Both files are ASCII-clean, both suites green (22/22 + 11/11). My analysis is complete.

---

VERDICT: PASS

summary: The `fallbackNModels` change is correct, pure, and honestly bounded. The fallback synthesizes `summary.n_models` only on the full-page-failed rescue path (never overwrites a real full-page summary), `n_hallucination_candidates` is recomputed over the union in every branch, and the default (no/<=0/NaN fallback) preserves prior behavior exactly with no NaN/undefined leak. One non-blocking integration gap worth flagging: the live training cron does not yet consume this hybrid `fused`, so the change's value is currently latent (validation-path only), but that does not break anything.

findings:
- [P2] `scripts/blueprint-ocr-training-loop.mjs:348,363` -- INTEGRATION/LATENT: the live training cron calls `runEnsembleOverImage` directly and feeds `res.fused` (plain full-page ensemble) into `buildTrainsetRow`; it does NOT call `extractWithRegionRouting`. So the dense-page rescue this change enables (`summary.n_models` synthesis keeping rescued dims trainable) reaches NO live trainset row yet -- the only live consumer of `extractWithRegionRouting` is `scripts/validate-perfect-parts.mjs:222` (validation, not training). The change is correct and ready, but is plumbing ahead of its consumer (R15 "wire to every consumer"). Not a regression -- the cron is unchanged and behaves identically. Fix/track: a follow-up unit to switch the cron's per-page extraction to `extractWithRegionRouting` (or document this as a staged, scoped delivery) so the rescue path actually fires in production.

Correctness (verified):
- No-overwrite of a real summary: `region-glue-lib.mjs:198-202` -- when `out.summary` is a present object, `n_models`/`n_ambiguous_pairs` are spread from the full-page summary and only `n_hallucination_candidates` is recomputed; the `else if (fallbackN > 0)` synthesis branch (203-206) is reachable ONLY when the full-page summary is missing/malformed. Test `region
... [+3476 chars truncated]
