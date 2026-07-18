---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent regression/silent-breakage review (arm C analyst) of a 3-file change"
date: "2026-06-23"
first_ts: "2026-06-23T13:25:27.218Z"
last_ts: "2026-06-23T13:39:09.783Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a8bc89c692f99e809.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent regression/silent-breakage review (arm C analyst) of a 3-file change

> **claude-code-cli** | 2026-06-23 | 44 msgs (17 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a8bc89c692f99e809.jsonl`

## Transcript

### User | 2026-06-23T13:25:27.218Z

Independent regression/silent-breakage review (arm C analyst) of a 3-file change in H:/prism. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read each file end-to-end.

CHANGE (Unit A "U-XRAY-CALIB-ACCUMULATE"): make the blueprint-OCR closed-loop calibration ACCUMULATE samples across nightly runs instead of recalibrating from ~24 synthetic samples each run (which is below MIN_RELIABLE_SAMPLES=50, so permanently reliable:false).

FILES:
1. NEW: H:/prism/scripts/lib/calibration-sample-store.mjs — pure parse/merge/serialize/stamp + thin fs load/append/reset wrappers. Domain-neutral {f,correct,source,ts} JSONL store, ring-buffered cap.
2. NEW: H:/prism/scripts/lib/calibration-sample-store.test.mjs — node:test, 17 tests (already pass).
3. EDITED: H:/prism/scripts/blueprint-ocr-training-loop.mjs — added import, 3 args (--calibration-store / --no-calibration-store / --calibration-store-cap / --reset-calibration-store), the load→merge→calibrate→append block around the `calibrateAgreement` call, and report fields. Use `git -C H:/prism diff -- scripts/blueprint-ocr-training-loop.mjs` to see exactly what changed.

VERIFY THESE INVARIANTS specifically:
- **Byte-identical-when-off:** with --no-calibration-store, opts.calibrationStore is null → persistedSamples=[] → merge filters but synthetic samples are already valid {f,correct} → calibrate on the same set as before, no append. Confirm no behavior change in that path.
- **No clobber / append-only:** the store is only ever appended (or explicitly reset via --reset-calibration-store, NOT --fresh). Confirm --fresh does not touch the calibration store. Confirm there is no writeFileSync that would truncate the accumulated store on a normal run.
- **Scope:** calMerge / calStoreWritten are referenced in the report block far below their declaration — confirm they are function-scoped and in scope there (not block-scoped inside an if).
- **Fail-soft:** load/append never throw on a missing/corrupt store; a torn final J
... [+559 chars truncated]

### Assistant | 2026-06-23T13:25:30.191Z

I'll review this 3-file change for silent breakage and regression risk. Let me start by reading all the relevant files and the diff.

### Assistant | 2026-06-23T13:25:30.672Z

[tool_use: Read]

### Assistant | 2026-06-23T13:25:31.145Z

[tool_use: Read]

### Assistant | 2026-06-23T13:25:31.884Z

[tool_use: Bash]

### User | 2026-06-23T13:25:31.979Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * calibration-sample-store.mjs -- durable cross-run accumulation of agreement
4	 * calibration samples for the blueprint-OCR closed loop (and any other
5	 * isotonic-agreement calibrator that is starved for samples per single run).
6	 *
7	 * Why this exists: `blueprint-ocr-training-loop.mjs` PHASE-1 calibrates
8	 * P(consensus dim correct | agreement fraction f) from
... [+8870 chars truncated]

### User | 2026-06-23T13:25:32.987Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * calibration-sample-store.test.mjs -- node:test coverage for the durable
4	 * cross-run calibration-sample accumulation store (Unit A).
5	 *
6	 * Run directly (node:test auto-runs on exit): `node calibration-sample-store.test.mjs`
7	 * (NOT `node --test <file>` -- that ran 0 tests in this env, per CLAUDE.md).
8	 */
9	
10	import test from "node:test";
11	import asser
... [+10296 chars truncated]

### User | 2026-06-23T13:25:34.450Z

[tool_result] diff --git a/scripts/blueprint-ocr-training-loop.mjs b/scripts/blueprint-ocr-training-loop.mjs
index 314fd1009b..bde1a6088f 100644
--- a/scripts/blueprint-ocr-training-loop.mjs
+++ b/scripts/blueprint-ocr-training-loop.mjs
@@ -50,6 +50,13 @@ import {
   partitionByResumeCursor,
   isCorpusDrained,
 } from "./lib/ocr-training-loop-lib.mjs";
+import {
+  DEFAULT_SAMPLE_CAP,
+  loadCalibrationStore,

... [+4563 chars truncated]

### Assistant | 2026-06-23T13:25:44.801Z

Now I have the diff. Let me read the full edited file end-to-end to verify scope, the `calibration` consumer paths, and the helper functions used in the diff (`get`, `num`, `has`, `join`, `REPO_ROOT`).

### Assistant | 2026-06-23T13:25:45.041Z

[tool_use: Read]

### User | 2026-06-23T13:25:47.492Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+40152 chars truncated]

### Assistant | 2026-06-23T13:25:52.062Z

Now let me verify the `calibrateAgreement` contract and `MIN_RELIABLE_SAMPLES` to confirm the merged-set behavior and the report-block scope. Let me also confirm ASCII-only on the new files and check whether the synthetic `calSamples` rows actually match the `{f,correct}` shape that `isValidSample` accepts (the byte-identical-when-off invariant depends on `f>0` for all synthetic samples).

### Assistant | 2026-06-23T13:25:52.580Z

[tool_use: Read]

### Assistant | 2026-06-23T13:25:52.857Z

[tool_use: Read]

### User | 2026-06-23T13:25:54.282Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
4	 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * Why this exists: a trained classifier's raw output score is rarely a
7	 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
8	 * cases that are positive only 60% of the time. The NN-GRAPH-MS0
... [+8914 chars truncated]

### User | 2026-06-23T13:25:55.395Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+25628 chars truncated]

### Assistant | 2026-06-23T13:26:01.813Z

I now have the full contract. Let me verify a few specific concerns: (1) ASCII-only in the new files, (2) the `calibrateAgreement` filter vs `isValidSample` filter divergence (a subtle silent-difference risk), and (3) confirm the scheduled-task / cron invocation that runs this nightly, to check for concurrency (multiple runs appending to the same fixed store path).

### Assistant | 2026-06-23T13:26:03.434Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:26:05.133Z

[tool_use: Bash]

### User | 2026-06-23T13:26:05.409Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
BOTH NEW FILES ASCII-CLEAN

### User | 2026-06-23T13:26:52.116Z

[tool_result] === callers / schedulers of blueprint-ocr-training-loop ===
scripts/lib/calibration-sample-store.mjs:7: * Why this exists: `blueprint-ocr-training-loop.mjs` PHASE-1 calibrates
scripts/lib/pdf-parse-extract-helpers.mjs:200: * (blueprint-ocr-training-loop) owns drawings. Text-bearing PDFs are unaffected.
scripts/lib/region-glue-lib.mjs:204: * that builds rich labels from a `fused` object (e.g. bluep
... [+1082 chars truncated]

### Assistant | 2026-06-23T13:26:58.014Z

Let me check the overnight scheduler and the continuous cron to assess concurrency (whether two runs could append to the same fixed store path simultaneously), and confirm `--no-calibration-store` truly produces byte-identical calibration vs the old `calibrateAgreement(calSamples)` path.

### Assistant | 2026-06-23T13:26:59.060Z

[tool_use: Read]

### User | 2026-06-23T13:27:02.287Z

[tool_result] 1	# run-ocr-training-loop-overnight.ps1 - reaper-immune + console-allocated CLOSED-LOOP TRAINING launcher.
2	#
3	# Sister to run-ocr-batch-overnight.ps1 (the raw-OCR-extract lane). This runs the TRAINING lane:
4	# blueprint-ocr-training-loop.mjs calibrates the ensemble trust function on synthetic-GT prints, then
5	# weak-labels the real drawing corpus into a tiered (gold/silver/bronze/reject) trai
... [+6546 chars truncated]

### Assistant | 2026-06-23T13:27:02.548Z

[tool_use: Bash]

### User | 2026-06-23T13:32:04.933Z

[tool_result] Command running in background with ID: bcl8qp8fv. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d\tasks\bcl8qp8fv.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-23T13:32:38.021Z

I found a significant concern. The overnight scheduler (`run-ocr-training-loop-overnight.ps1`) uses `--out-dir 'H:\prism\state\shared\ocr-training-loop\corpus-train'` (line 23), but the new default calibration store path is FIXED at `state/shared/ocr-training-loop/calibration-samples.jsonl` (NOT under `--out-dir`). Let me examine the concurrency model and whether the continuous installer can spawn overlapping runs. Let me retrieve the background command result.

### Assistant | 2026-06-23T13:32:41.720Z

[tool_use: Bash]

### User | 2026-06-23T13:32:43.402Z

[tool_result] === continuous / cron installers referencing the overnight runner or store ===

### Assistant | 2026-06-23T13:32:47.558Z

The grep for cron/continuous installers came back empty. Let me search more broadly for the continuous installer mentioned in the ps1 comment ("the -Continuous installer", "30-min backstop repetition"), to assess whether overlapping/concurrent runs could append to the shared fixed store.

### Assistant | 2026-06-23T13:32:50.446Z

[tool_use: Bash]

### User | 2026-06-23T13:37:52.458Z

[tool_result] Command running in background with ID: bgzkb95yt. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d\tasks\bgzkb95yt.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-23T13:37:57.810Z

[tool_use: Bash]

### User | 2026-06-23T13:37:59.953Z

[tool_result] === installers / schedulers (broad) ===
scripts/cron/connection-finder-cron.ps1
scripts/cron/daily-context-cron.ps1
scripts/cron/knowledge-distillation-cron.ps1
scripts/cron/weekly-synthesis-cron.ps1
scripts/fleet-task-health-watch.mjs
scripts/install-brain-refresh-task.ps1
scripts/install-orphan-reaper-task.ps1
scripts/install-prism-hooks-container.ps1
scripts/install-quoting-pipeline-cron.ps1
sc
... [+194 chars truncated]

### Assistant | 2026-06-23T13:38:09.324Z

The broad search shows no separate continuous installer file registers the overnight ps1 by path — the registration is operator-side (Task Scheduler), and the ps1's own comments describe a 30-min backstop repetition with `IgnoreNew`. `IgnoreNew` means Task Scheduler will NOT start a new instance while one is running, so the concurrency risk is bounded for that specific task. However, the store path mismatch (store at the fixed repo path, not under `--out-dir corpus-train`) is the more important finding to verify. Let me confirm the exact paths and that `appendFileSync` is atomic enough, plus double check the byte-identical-when-off path one more time against `calibrateAgreement`'s own filter.

I have enough to assess all invariants now. Let me do one final verification: confirm that with `--no-calibration-store`, the merged set passed to `calibrateAgreement` is exactly `calSamples` (order-preserved, no filtering divergence that could change the isotonic fit), and that the synthetic samples always satisfy `isValidSample`.

### Assistant | 2026-06-23T13:38:12.841Z

[tool_use: Bash]

### User | 2026-06-23T13:38:14.999Z

[tool_result] === confirm synthetic calSamples shape: perDimCorrectness returns {f, correct} ===
222:    return { f: nm > 0 ? d.corroboration / nm : 0, correct };
=== f can be 0 when nm<=0? perDimCorrectness line 222 ===
222:    return { f: nm > 0 ? d.corroboration / nm : 0, correct };
=== calibrateAgreement filter (lib line 49): same f>0 && f<=1 guard ===
49:  const rows = (Array.isArray(samples) ? samples : [
... [+236 chars truncated]

### Assistant | 2026-06-23T13:38:22.008Z

This confirms the key parity. Let me trace one subtle silent-difference: `perDimCorrectness` can emit `f:0` (when `nm<=0`) or `correct` being non-boolean (it's always a boolean from `.some()`, so that's fine). The `mergeCalibrationSamples` filters those `f:0` rows via `isValidSample` BEFORE `calibrateAgreement` — but the OLD code passed raw `calSamples` (including any `f:0` rows) directly to `calibrateAgreement`, which ALSO filters `f>0`. So both drop `f:0`. The filters are equivalent for `f`. Let me verify the one divergence that matters: `isValidSample` requires `typeof correct === "boolean"` (strict), while `calibrateAgreement` only checks `s.correct === true` for counting (it tolerates non-boolean). Since synthetic `correct` is always boolean, no divergence in the off path. 

Now let me verify the background task is closed and do a final concurrency check on whether `appendFileSync` with O_APPEND is the only writer (no truncating writeFileSync on the store path during a normal run).

### Assistant | 2026-06-23T13:38:24.441Z

[tool_use: Bash]

### User | 2026-06-23T13:38:25.943Z

[tool_result] === every write to the calibration store path in the runner (must be append-only on normal runs) ===
29:import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, appendFileSync, rmSync } from "node:fs";
56:  appendCalibrationStore,
58:  resetCalibrationStore,
134:    calibrationStore: has("--no-calibration-store")
137:    calibrationStoreCap: Math.max(1, num("--calibration-store-ca
... [+1088 chars truncated]

### Assistant | 2026-06-23T13:38:31.510Z

Confirmed: the only `writeFileSync` calls target `trainsetPath`/`queuePath`/`cursorPath` (the `--fresh` truncation, line 326) and `reportPath` (line 491). Neither touches `opts.calibrationStore`. The store is written ONLY via `appendCalibrationStore` (append-only) or `resetCalibrationStore` (gated behind `--reset-calibration-store`). The `--fresh` truncation list explicitly excludes the calibration store. All invariants verified.

Let me confirm the background task is finished/closed before reporting.

### Assistant | 2026-06-23T13:38:32.526Z

[tool_use: Bash]

### User | 2026-06-23T13:38:34.815Z

[tool_result] bg tasks done
---

### Assistant | 2026-06-23T13:39:09.783Z

All verification complete. Both background searches returned and are closed. Here is my arm-C analyst verdict.

---

VERDICT: PASS

summary: The change is correctly append-only and fail-soft; the `--no-calibration-store` path is provably byte-identical to the prior `calibrateAgreement(calSamples)` behavior, and the accumulation store is never truncated on a normal run (`--fresh` deliberately excludes it). I traced every consumer of the changed control flow (`calibrateAgreement`, the report block, the overnight scheduler) and the new helper's full surface; no silent breakage. One real operational mismatch (P2) between the store's fixed default path and the scheduler's `--out-dir` that affects observability/audit but not correctness.

findings:
- [P2] `scripts/run-ocr-training-loop-overnight.ps1:23` + `scripts/blueprint-ocr-training-loop.mjs:136` -- **Store path is OUTSIDE the scheduled run's `--out-dir`.** The live scheduler writes everything (trainset/queue/cursor/report) under `H:/prism/state/shared/ocr-training-loop/corpus-train/`, but the new default calibration store is hard-pinned to `H:/prism/state/shared/ocr-training-loop/calibration-samples.jsonl` (the parent dir, NOT `corpus-train/`). This is intentional per the code comment ("FIXED repo path (stable across --out-dir changes)") and is functionally fine -- the corpus still accumulates -- but it means the store does NOT sit beside the run's own report/cursor, so a future per-`--out-dir` archival/cleanup of `corpus-train/` would silently miss it, and an operator inspecting the run dir won't find the accumulating corpus. The report's `store_path` field (line 495) does surface the true location, which mitigates. Fix (optional): either default the store under `opts.outDir` for locality, or document in the ps1 that the calibration corpus lives one level up and is shared across out-dirs by design.

Consumers / edge-paths traced for an auditable PASS:
- **Byte-identical-when-off** (`blueprint-ocr-training-loop.mjs:2
... [+3755 chars truncated]
