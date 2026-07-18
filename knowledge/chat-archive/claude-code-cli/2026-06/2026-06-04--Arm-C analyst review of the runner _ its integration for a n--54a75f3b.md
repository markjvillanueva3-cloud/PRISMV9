---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Arm-C analyst review of the runner + its integration for a new PRISM closed-loop"
date: "2026-06-04"
first_ts: "2026-06-04T16:48:13.476Z"
last_ts: "2026-06-04T16:51:22.315Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-ac8987433d19eacb7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Arm-C analyst review of the runner + its integration for a new PRISM closed-loop

> **claude-code-cli** | 2026-06-04 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-ac8987433d19eacb7.jsonl`

## Transcript

### User | 2026-06-04T16:48:13.476Z

Arm-C analyst review of the runner + its integration for a new PRISM closed-loop OCR training engine (slot:xray). Weight on silent breakage, I/O safety, integration coupling, and real-data robustness. Grade PASS/FAIL with P0/P1 (file:line).

PRIMARY FILE: H:/prism/scripts/blueprint-ocr-training-loop.mjs (read fully).
SUPPORTING (read as needed): H:/prism/scripts/lib/ocr-training-loop-lib.mjs, H:/prism/scripts/lib/vision-ensemble-fuse.mjs (runEnsembleOverImage — the runner's engine), H:/prism/scripts/lib/vision-ab-compare.mjs (generateSyntheticPrint).

The runner ran live successfully: 4 synthetic calibration prints + 1 real JM print (state/shared/ocr-training-loop/extrude_punch.png) → trainset.jsonl + active-learning-queue.jsonl + training-loop-report.json. Verify by reading state/shared/ocr-training-loop/training-loop-report.json — is it well-formed, honest (mustHumanVerify, sample counts), and consistent with the emitted trainset.jsonl?

CHECK:
1. INTEGRATION: does the runner call runEnsembleOverImage / generateSyntheticPrint / buildTrainsetRow / calibrateCorroboration with correct argument shapes? Trace the data flow: generateSyntheticPrint → {png, truth} → runEnsembleOverImage → fused.dimensions → perDimCorrectness(consensus, truth.dimensions) → calibrateCorroboration. Does truth.dimensions have the shape perDimCorrectness expects (dimToMm-readable)? 
2. REAL-DATA ROBUSTNESS: fail-soft on missing PNG, ensemble all-failed, gen failure, empty --real set, no models pulled. Does any path crash instead of skip? Is the no-re-OCR soul honored (weak-label only on bounded operator-supplied prints, never the 257K corpus)?
3. I/O: mkdirSync recursive, writeFileSync wrapped, JSONL formatting correct (trailing newline only when non-empty), report paths absolute. Any partial-write / overwrite hazard on the shared state dir?
4. EXIT CODES: 0 ran / 2 ensemble-dead / 3 setup. Is the exit-2 condition correct (only when calibration empty AND no real labels)?
5. EMIT CORRECTNESS: t
... [+259 chars truncated]

### Assistant | 2026-06-04T16:48:31.874Z

I'll perform the arm-C analyst review focusing on silent breakage, I/O safety, integration coupling, and real-data robustness. Let me read the files thoroughly.

### Assistant | 2026-06-04T16:48:32.776Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:34.761Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:34.766Z

[tool_use: Read]

### User | 2026-06-04T16:48:35.150Z

[tool_result] read-once-guard: 'H:\prism\scripts\blueprint-ocr-training-loop.mjs' was already read 20s ago in this session and is unchanged (mtime 1780591241091). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T16:48:37.241Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 23s ago in this session and is unchanged (mtime 1780590918613). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T16:48:37.909Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "models": [
4	    "qwen3-vl:8b-instruct",
5	    "qwen2.5vl:7b",
6	    "llama3.2-vision:11b"
7	  ],
8	  "n_models": 3,
9	  "calibrate": {
10	    "count_attempted": 4,
11	    "cases": [
12	      {
13	        "seed": 9000,
14	        "difficulty": "easy",
15	        "models_ok": 2,
16	        "dims": 8,
17	        "correct": 5
18	      },
19	      {
20	        "s
... [+2329 chars truncated]

### Assistant | 2026-06-04T16:48:42.347Z

The two source files are already in my context from earlier reads. Let me read the supporting library files and the emitted data files to complete the trace.

### Assistant | 2026-06-04T16:48:42.872Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:43.251Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:43.738Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:44.232Z

[tool_use: Read]

### User | 2026-06-04T16:48:52.390Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+24843 chars truncated]

### User | 2026-06-04T16:48:52.671Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+24682 chars truncated]

### User | 2026-06-04T16:48:52.740Z

[tool_result] 1	{"part":"extrude_punch.png","image":"state/shared/ocr-training-loop/extrude_punch.png","n_models":1,"labels":[{"type":"diameter","value_mm":3.048,"corroboration":1,"n_models":1,"agreement_confidence":0.95,"value_spread_mm":0,"tier":"silver","expected_accuracy":0.7857,"trainable":true},{"type":"linear","value_mm":8.636,"corroboration":1,"n_models":1,"agreement_confidence":0.95,"value_spread_mm":0
... [+1151 chars truncated]

### User | 2026-06-04T16:48:53.295Z

[tool_result] 1	{"part":"extrude_punch.png","image":"state/shared/ocr-training-loop/extrude_punch.png","reasons":["1 ambiguous pair(s) — model value-disagreement"],"summary":{"n_models":1,"models":["qwen3-vl:8b-instruct"],"per_model_dim_count":{"qwen3-vl:8b-instruct":8},"quorum":2,"n_clusters":8,"n_corroborated":0,"n_partial":0,"n_singleton":8,"n_hallucination_candidates":0,"n_ambiguous_pairs":1,"corroboration_
... [+116 chars truncated]

### Assistant | 2026-06-04T16:48:59.499Z

I have the supporting libs and emitted artifacts. The two primary files were read earlier but the read-once-guard says they're in my context — but I need to actually verify them. Let me re-read the two primary files (the guard cached them, but I must see their content to review). I'll disable the cache for these.

### Assistant | 2026-06-04T16:49:00.879Z

[tool_use: Bash]

### User | 2026-06-04T16:49:09.990Z

[tool_result] ---primary runner---
#!/usr/bin/env node
// scripts/blueprint-ocr-training-loop.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
//
// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
//      measure P(consensus dim CORRECT | corrobor
... [+10944 chars truncated]

### Assistant | 2026-06-04T16:49:15.893Z

Now let me read the pure library that backs the calibration/tiering core, since the trace depends on its exact shapes.

### Assistant | 2026-06-04T16:49:15.895Z

[tool_use: Bash]

### User | 2026-06-04T16:49:21.768Z

[tool_result] // scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims ≥k models corroborate are h
... [+9944 chars truncated]

### Assistant | 2026-06-04T16:49:25.781Z

I have all the files. Let me trace the data flow carefully and verify the key claims, then check `parseVisionResponse` / `dimToMm` shape compatibility since the trace hinges on truth.dimensions being dimToMm-readable.

### Assistant | 2026-06-04T16:49:27.920Z

[tool_use: Bash]

### Assistant | 2026-06-04T16:49:28.941Z

[tool_use: Bash]

### User | 2026-06-04T16:49:33.299Z

[tool_result] --- synthetic-print-gen.py truth shape ---
6:# dimensions + hole diameter callouts + title block) with PERFECT, KNOWN ground
7:# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
13:# truth nominal_mm = inches * 25.4 so it lines up with the code-side inch->mm
56:    # clutter the OCR must read past to recover the nominal). Truth records ONLY the
57:    # nominal — tol
... [+1518 chars truncated]

### User | 2026-06-04T16:49:34.083Z

[tool_result] --- dimToMm + dimType source ---
23:/** Coerce a dimension (number or {nominal_mm}/{mm}/{value}) to a finite mm number, else null. */
24:export function dimToMm(d) {
29:    const v = d.nominal_mm ?? d.mm ?? d.value ?? d.nominal;
40:export function dimMatches(a, b, opts = {}) {
64:export function dimType(d) {
81:export function typesCompatible(a, b) {
88: * @param {Array} extracted  OCR dims (numbe
... [+463 chars truncated]

### Assistant | 2026-06-04T16:49:39.615Z

The trace confirms: truth dims are `{type, nominal_mm}` and `dimToMm` reads `nominal_mm ?? mm ?? value ?? nominal`. So `perDimCorrectness` correctly reads truth via `dimToMm`/`dimType`, and angular dims (`nominal_mm: null`) are filtered out by `t.mm !== null`. Let me verify the `dimToMm` body fully and the `consensusType`/`assignLabelTier` `nModels` interaction, plus check for the partial-write concern on the shared dir.

### Assistant | 2026-06-04T16:49:39.918Z

[tool_use: Read]

### User | 2026-06-04T16:49:43.560Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+4680 chars truncated]

### Assistant | 2026-06-04T16:49:50.537Z

I now have the complete picture. Let me verify the report's internal consistency against the emitted trainset (the report says `silver: 8, trainable: 8`; the trainset has exactly 8 silver/trainable rows) and check one subtle point — whether the `calCases` "correct" count is consistent with the `byK` calibration (the report shows the calibration was built from synthetic GT). Let me also confirm one integration nuance: the runner's `runEnsembleOverImage` call for the real print does NOT pass `workDir`, so it defaults to `tmpdir()`.

Let me do a final targeted check on the report consistency arithmetic and the exit-2 / weak-label-only path concern.

### Assistant | 2026-06-04T16:49:56.396Z

[tool_use: Bash]

### User | 2026-06-04T16:49:59.515Z

[tool_result] === report consistency cross-check ===
calibrate.cases correct sum vs byK correct sum:
  cases: 5+6+5+6 = 22 correct; dims 8+7+6+7 = 28 samples
  byK:   k1(n20,c16) + k2(n8,c6) = 28 samples, 22 correct  -> CONSISTENT

trainset.jsonl labels (should be 8 silver/trainable):
  rows: 1 labels: 8 allTrainable: true allSilver: true

AL queue (should be 1, reason ambiguous pair):
  queue rows: 1
  reasons
... [+52 chars truncated]

### Assistant | 2026-06-04T16:50:07.131Z

All cross-checks pass. I have completed the full trace. Let me note one important observation about the live run that exposes a real consistency question, and finalize.

The report shows `n_models: 3` (the 3 family leaders were pulled and used for calibration), but the weak-label real print shows `n_models: 1` in both trainset and AL queue summary (`per_model_dim_count: {"qwen3-vl:8b-instruct": 8}`). This means for the real print only ONE model survived. Let me verify this is a fail-soft survivor path and not a silent bug — and confirm the calibration/tiering `nModels` mismatch handling.

### Assistant | 2026-06-04T16:50:11.309Z

[tool_use: Bash]

### User | 2026-06-04T16:50:20.346Z

[tool_result] === nModels mismatch trace (calibration nModels=3, real-print fused n_models=1) ===
assignLabelTier opts.nModels passed = fused.summary.n_models = 1 (from buildTrainsetRow)
calibration.nModels = 3
nModelsMatch = (opts.nModels===3? no) => 1!==3 => nModelsMatch:FALSE

BUT: tier is still assigned (k=1 -> isotonic 0.7857 -> silver). nModelsMatch flag is computed but...
106: * @returns {{tier:"gold"|"s
... [+1811 chars truncated]

### Assistant | 2026-06-04T16:51:22.315Z

I have found a real P1: the calibration was built from a 3-model ensemble (`nModels: 3`), but the live real print only had 1 model survive (`n_models: 1`). The corroboration `k=1` from a 1-model run does NOT mean the same thing as `k=1` from a 3-model run — a `k=1` in a 3-model calibration means "1 of 3 agreed" (low trust), whereas a `k=1` from a 1-model run means "the only model present said it" (no corroboration possible at all). `assignLabelTier` computes `nModelsMatch: false` correctly, but `buildTrainsetRow` (line 137-142) drops that flag entirely and still marks the label `trainable: true` (silver). This is a silent calibration-domain mismatch: untrusted single-model dims are being emitted into the supervised trainset under a trust value (0.7857) measured on a different ensemble configuration.

This is the headline finding. Let me complete the review.

## Arm-C Analyst Review — `blueprint-ocr-training-loop.mjs` + integration

**GRADE: FAIL** (1 P1; no P0). The runner is well-built, fail-soft, and I/O-safe; the report is well-formed and honest. But the live run surfaced a real calibration-domain leak that lets single-model (uncorroborated) dims enter the supervised trainset stamped with a 3-model trust value — exactly the "garbage in" failure mode the engine's own header says it exists to prevent.

---

### P1 — Calibration-domain mismatch silently admits single-model dims as trainable `silver`

**Where:** `scripts/lib/ocr-training-loop-lib.mjs:137-142` (`buildTrainsetRow`), interacting with `:110` (`assignLabelTier` computes `nModelsMatch` but it is discarded) and the runner at `blueprint-ocr-training-loop.mjs:138-144` (real-print ensemble run).

**The live evidence (this exact run):**
- Calibration built from `nModels: 3` (report `calibrate.calibration.nModels: 3`).
- The single real print (`extrude_punch.png`) had only **1 model survive** — `trainset.jsonl` and the AL-queue summary both show `n_models: 1`, `per_model_dim_count: {"qwen3-vl:8b-instruct": 8}`, 
... [+8237 chars truncated]
