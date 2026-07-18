---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent regression/silent-breakage review (analyst arm) of Unit B \"U-XRAY-PR"
date: "2026-06-23"
first_ts: "2026-06-23T13:47:46.571Z"
last_ts: "2026-06-23T13:50:13.205Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a2279ab2c1a95555b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent regression/silent-breakage review (analyst arm) of Unit B "U-XRAY-PR

> **claude-code-cli** | 2026-06-23 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a2279ab2c1a95555b.jsonl`

## Transcript

### User | 2026-06-23T13:47:46.571Z

Independent regression/silent-breakage review (analyst arm) of Unit B "U-XRAY-PROGRAM-GT-CALIB" in H:/prism. Grade PASS or FAIL with P0/P1/P2 + file:line. Read end-to-end. Use `git -C H:/prism diff -- scripts/lib/cnc-program-gt-lib.mjs scripts/validate-perfect-parts.mjs` for the exact changes.

WHAT IT DOES: harvest REAL program-GT {f,correct} calibration samples from the OCR validation harness into the durable calibration-sample-store (Unit A), so the closed-loop OCR calibration is grounded in real machined dimensions, not only synthetic prints. Opt-in via --emit-calibration (default OFF).

FILES:
1. scripts/lib/cnc-program-gt-lib.mjs — NEW export programGtAgreementSamples(fusedDims, programGT, opts): the program-GT analog of perDimCorrectness (ocr-training-loop-lib.mjs). f = corroboration/n_models; correct = dimMatchesProgram(value_mm, gtDistinct).matched.
2. scripts/lib/cnc-program-gt-calibration.test.mjs — NEW, 8 tests (pass).
3. scripts/validate-perfect-parts.mjs — wired: import, --emit-calibration + --calibration-store args, allFusedDims collection in the PLAIN branch only, emit+append after scoring, report field.

VERIFY:
- **Byte-identical-when-off:** with --emit-calibration absent, opts.emitCalibration is false → the allFusedDims collection block (plain branch) and the emit/append block are BOTH skipped. Confirm no behavior change to the recall measurement (scorePartAgainstProgram on allDimsMm is untouched). allFusedDims is declared unconditionally but only populated when on — confirm an empty array has no effect.
- **Only emits from TRUSTED parts:** the emit block sits INSIDE the post-scoring else (after the gtReliable gate at validate-perfect-parts ~line 183-189 skips contour/mill-no-feature parts). Confirm a part that is skipped (program-not-nc / program-contour-gt / axis-filtered / ocr-failed) NEVER reaches the emit. So only gtReliable, OCR'd, scored parts emit samples.
- **Plain-branch-only collection:** allFusedDims is populated only in the plain `els
... [+1039 chars truncated]

### Assistant | 2026-06-23T13:47:49.915Z

I'll perform an independent regression/silent-breakage review of Unit B. Let me start by examining the exact changes and then trace the blast radius.

### Assistant | 2026-06-23T13:47:51.300Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:47:51.510Z

[tool_use: Read]

### User | 2026-06-23T13:47:52.824Z

[tool_result] diff --git a/scripts/lib/cnc-program-gt-lib.mjs b/scripts/lib/cnc-program-gt-lib.mjs
index 6fb039f653..2242dd931e 100644
--- a/scripts/lib/cnc-program-gt-lib.mjs
+++ b/scripts/lib/cnc-program-gt-lib.mjs
@@ -331,6 +331,44 @@ export function scorePartAgainstProgram(ocrDimsMm, programGT, opts = {}) {
   };
 }
 
+/**
+ * Pure: the program-GT analog of the synthetic `perDimCorrectness` -- turn a part's
... [+10569 chars truncated]

### User | 2026-06-23T13:47:53.983Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cnc-program-gt-calibration.test.mjs -- node:test coverage for
4	 * programGtAgreementSamples (U-XRAY-PROGRAM-GT-CALIB): the program-GT analog of
5	 * the synthetic perDimCorrectness that turns fused OCR dims into {f,correct}
6	 * calibration samples using the CNC program as the answer key.
7	 *
8	 * Isolated test file (the function is a new, self-contained export b
... [+4291 chars truncated]

### Assistant | 2026-06-23T13:48:02.754Z

Let me read the key consumer/dependency files to verify the contracts. I need to see Unit A's calibration store, the `dimMatchesProgram` matcher, `buildTrainsetRow`'s nm resolution, and the surrounding context in validate-perfect-parts.mjs.

### Assistant | 2026-06-23T13:48:04.973Z

[tool_use: Read]

### Assistant | 2026-06-23T13:48:05.049Z

[tool_use: Read]

### User | 2026-06-23T13:48:06.052Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\calibration-sample-store.mjs' was already read 23m ago in this session and is unchanged (mtime 1782220847425). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T13:48:06.872Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+38936 chars truncated]

### Assistant | 2026-06-23T13:48:11.119Z

The calibration store was already read this session. Let me retrieve its content via Grep to verify the `appendCalibrationStore`, `isValidSample`, and the canonical store path that Unit A uses. I also need to verify the surrounding branch structure in validate-perfect-parts.mjs (the gtReliable gate, the --tile/--region-route branches, and `relTol` availability).

### Assistant | 2026-06-23T13:48:12.993Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:48:13.624Z

[tool_use: Read]

### User | 2026-06-23T13:48:15.463Z

[tool_result] 150	  console.log(`\n🧪 TRUE-TEST — ${parts.length} perfect parts · ${todo.length} todo · ${parts.length - todo.length} resumed · models ${models.join(",")}`);
151	  const rasterDir = join(tmpdir(), `truetest-raster-${process.pid}`);
152	  mkdirSync(rasterDir, { recursive: true });
153	
154	  const agg = { scored: 0, passed: 0, print_unresolved: 0, prog_unresolved: 0, prog_not_nc: 0, prog_non_lathe
... [+13856 chars truncated]

### User | 2026-06-23T13:48:15.701Z

[tool_result] 55:export function isValidSample(s) {
131: * @returns {Array<{f:number, correct:boolean, source:string, ts:string}>}
139:    source: typeof s.source === "string" && s.source ? s.source : source,
154:export function loadCalibrationStore(path) {
175:export function appendCalibrationStore(path, samples, meta = {}) {

### Assistant | 2026-06-23T13:48:20.078Z

Now let me read the calibration-sample-store.mjs content (it was read earlier but not in my current context). Let me read the key functions: `isValidSample`, `appendCalibrationStore`, and the default store path.

### Assistant | 2026-06-23T13:48:20.843Z

[tool_use: Read]

### User | 2026-06-23T13:48:21.937Z

[tool_result] 40	/**
41	 * Default ring-buffer ceiling. Keeps the store bounded (the most-recent N
42	 * samples) so it reflects the CURRENT model lineup -- an ensemble upgrade should
43	 * not be out-voted forever by stale samples from a retired model set. 5000 is
44	 * ~200 nightly runs at 24 samples/run; far above MIN_RELIABLE, small on disk.
45	 */
46	export const DEFAULT_SAMPLE_CAP = 5000;
47	
48	/**
49	 *
... [+6483 chars truncated]

### Assistant | 2026-06-23T13:48:40.503Z

Now I need to verify the canonical store path Unit A uses, to confirm Unit B's default matches. Let me find where Unit A (the consumer of the calibration store — likely the OCR training loop) sets its default store path. I also want to verify the `--region-route` branch never increments `agg.scored` without populating `allFusedDims` (which is the documented limitation), and check whether `appendCalibrationStore` returning `-1` poisons the `calibration_store_written` field semantics.

### Assistant | 2026-06-23T13:48:45.520Z

[tool_use: Grep]

### User | 2026-06-23T13:48:46.993Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:55:  loadCalibrationStore,
scripts\blueprint-ocr-training-loop.mjs:56:  appendCalibrationStore,
scripts\blueprint-ocr-training-loop.mjs:134:    calibrationStore: has("--no-calibration-store")
scripts\blueprint-ocr-training-loop.mjs:136:      : get("--calibration-store", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "calibration-samples.jsonl")),
sc
... [+3544 chars truncated]

### Assistant | 2026-06-23T13:48:52.763Z

Confirmed: the default store path is byte-identical between Unit A (`blueprint-ocr-training-loop.mjs:136`) and Unit B (`validate-perfect-parts.mjs:124`) — both `state/shared/ocr-training-loop/calibration-samples.jsonl`. Program-GT and synthetic-GT samples accumulate together, distinguished by the `source` provenance field.

Now let me verify two remaining concerns: (1) the `perDimCorrectness` contract in the OCR training loop to confirm `f = corroboration/n_models` matches `buildTrainsetRow`'s nm resolution, and (2) whether `res.fused.dimensions` actually carries `corroboration` and `n_models` per-dim fields. Let me check the ensemble fuse output shape and `buildTrainsetRow`.

### Assistant | 2026-06-23T13:48:54.222Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:48:55.600Z

[tool_use: Grep]

### User | 2026-06-23T13:48:55.653Z

[tool_result] 12://      AGREEMENT FRACTION f = k/n_models). Calibrating on the FRACTION (not raw count k) is the key
16://      (more agreement ⇒ not less accurate). Only prints with n_models≥2 contribute (a 1-model run
17://      has NO corroboration signal). (R9: the trust is MEASURED against ground truth, not assumed.)
19://      is trainable ONLY if its print had n_models≥2 (real corroboration) AND it clea
... [+3043 chars truncated]

### User | 2026-06-23T13:48:57.622Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
191:// corroboratio
... [+2362 chars truncated]

### Assistant | 2026-06-23T13:49:05.064Z

This confirms the critical contracts. The fused `dimensions` from `vision-ensemble-fuse.mjs` carry per-dim `corroboration` and `n_models` (lines 331-332), and `summary.n_models` is the run-level count (line 389). Unit B's nm resolution at validate-perfect-parts.mjs:277 (`d.n_models else page summary.n_models`) exactly mirrors `buildTrainsetRow`'s line 162 (`d.n_models else runNModels = fused.summary.n_models`). The `f = corroboration/n_models` formula matches.

Now let me verify one subtle point: `buildTrainsetRow` adds a SECOND-LEVEL gate (`corroborationPossible = runNModels >= MIN_ENSEMBLE_FOR_CORROBORATION`) that gates the WHOLE part — not just per-dim. Unit B's `programGtAgreementSamples` gates per-dim on `nm < minModels` but does NOT gate on the run-level `summary.n_models`. Let me check whether this is a divergence that could let single-model-run dims through. Let me look at what `d.n_models` is set to in a single-model run.

### Assistant | 2026-06-23T13:49:06.055Z

[tool_use: Read]

### User | 2026-06-23T13:49:07.121Z

[tool_result] 305	
306	  const perModel = runs.map((r) => ({
307	    model: r.model,
308	    dims: Array.isArray(r.extraction.dimensions) ? r.extraction.dimensions : [],
309	  }));
310	  const per_model = perModel.map((p) => ({ model: p.model, dim_count: p.dims.filter((d) => dimToMm(d) !== null).length }));
311	
312	  const clusters = clusterAcrossModels(perModel, opts);
313	
314	  const dimensions = clusters.m
... [+1684 chars truncated]

### Assistant | 2026-06-23T13:49:16.852Z

This is the key insight. In `vision-ensemble-fuse.mjs`, EVERY dimension carries `n_models: nModels` (line 332) — the **run-level** n_models, identical for every dim in a fused page. The per-dim `corroboration` (line 316) is how many models saw THAT dim.

So in a single-model run (`nModels = 1`), every dim has `n_models = 1` and `corroboration = 1`. Unit B's per-dim gate `if (nm < minModels) continue` (minModels=2) correctly excludes these. So Unit B's per-dim `nm < 2` gate IS equivalent to the run-level `corroborationPossible` gate that `buildTrainsetRow` applies, because `d.n_models` always equals the run-level `nModels`. There is no divergence — a single-model run is fully excluded.

Now one final verification: in validate-perfect-parts.mjs:277, the fallback `pnm` (page summary.n_models else pageModelsOk) is used when `d.n_models` is non-finite. But per the fuse output, `d.n_models` is always set to `nModels`. The fallback only triggers if the fused dim is malformed. This is defensive and harmless.

Let me confirm the f-clamp behavior matches between Unit B and `buildTrainsetRow`, and double-check that a value of f exactly at boundaries is handled. Let me also run the test suite to confirm R9 (tests pass, no skip).

### Assistant | 2026-06-23T13:49:17.322Z

[tool_use: Bash]

### User | 2026-06-23T13:49:18.956Z

[tool_result]   ...
# Subtest: empty/garbage fused input -> []
ok 7 - empty/garbage fused input -> []
  ---
  duration_ms: 0.0901
  ...
# Subtest: samples are store-valid (consumable by calibration-sample-store.isValidSample)
ok 8 - samples are store-valid (consumable by calibration-sample-store.isValidSample)
  ---
  duration_ms: 4.7979
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 
... [+32 chars truncated]

### Assistant | 2026-06-23T13:49:25.689Z

8/8 pass, 0 skipped. Now let me verify the byte-identical-when-off claim by confirming the args/get helper handles the `--calibration-store` default correctly even when `--emit-calibration` is absent (it's computed but never used). And let me verify there's no syntax error in the modified validate file by parsing it.

### Assistant | 2026-06-23T13:49:26.783Z

[tool_use: Bash]

### User | 2026-06-23T13:49:28.755Z

[tool_result] SYNTAX_OK
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 16.5864

### Assistant | 2026-06-23T13:49:33.296Z

Both validate. Now let me confirm one subtle blast-radius concern: the report field `calibration_samples_emitted` was added to the output JSON object. Let me verify no downstream consumer of validate-perfect-parts' report JSON does strict schema validation that would break on the new field, and confirm the `--emit-calibration` default-off path leaves the recall metric truly untouched (no consumer reads `agg.calibrationSamples` when it's undefined).

### Assistant | 2026-06-23T13:49:34.874Z

[tool_use: Grep]

### User | 2026-06-23T13:49:38.666Z

[tool_result] state\token-economy-session.json:260:      "file": "H:\\prism\\scripts\\validate-perfect-parts.mjs"
state\token-economy-session.json:274:      "file": "H:\\prism\\scripts\\validate-perfect-parts.mjs"
state\token-economy-session.json:281:      "file": "H:\\prism\\scripts\\validate-perfect-parts.mjs"
state\token-economy-session.json:295:      "file": "H:\\prism\\scripts\\validate-perfect-parts.mjs"

... [+2033 chars truncated]

### Assistant | 2026-06-23T13:50:13.205Z

No external consumer reads the report's `calibration_samples_emitted`/`calibration_store_written` fields — they are write-only additions to the report JSON. The `region-drop-report` consumer reads only `rec.region_page_diags`, which is untouched. No schema-strict consumer would break on the additive fields.

I have now traced the full blast radius. Let me consolidate my findings.

## Verification summary (consumers/edge-paths traced)

**Byte-identical-when-off (CONFIRMED):** `opts.emitCalibration = has("--emit-calibration")` (line 122). When absent → false. Both the collection block (validate:273-280, gated `if (opts.emitCalibration && pageOk)`) and the emit/append block (validate:309-318, gated `if (opts.emitCalibration && allFusedDims.length)`) are skipped. `allFusedDims` declared unconditionally (line 211) but stays `[]` → `.length` is 0 → emit never fires. `scorePartAgainstProgram(ocrDimsMm, gt, ...)` at line 293 reads `allDimsMm` (untouched, separate accumulator). The report field defaults to `agg.calibrationSamples || 0` = 0. The `calibrationStore` default path is computed via `get()` but never read when off — harmless. Recall measurement is provably unchanged.

**Only TRUSTED parts emit (CONFIRMED):** the emit block (309) sits inside the `else` at validate:199-305, downstream of every skip: `print-unresolved`/`program-unresolved` (166-167), `program-not-nc` (175), `axis-filtered`/`program-non-lathe` (185-186), `!gt.gtReliable` → `program-contour-gt`/`program-mill-no-gt` (193-198), `raster-failed` (206), `ocr-failed` (290). A skipped part `continue`s past the emit. Only `gtReliable`, OCR'd, scored parts reach it.

**Plain-branch-only collection (CONFIRMED + acceptable):** `allFusedDims` populated only in the `else { runEnsembleOverImage }` branch (273-280). The `--tile` and `--region-route` branches return merged dims without reliable per-dim `corroboration`/`n_models` (they map to `value_mm` only — validate:235, 246). With `--tile`/`--region-route` + `--emit-
... [+4394 chars truncated]
