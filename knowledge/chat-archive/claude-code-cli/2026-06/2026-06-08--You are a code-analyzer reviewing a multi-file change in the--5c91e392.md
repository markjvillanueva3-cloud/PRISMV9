---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "You are a code-analyzer reviewing a multi-file change in the PRISM repo (H:/pris"
date: "2026-06-08"
first_ts: "2026-06-08T15:47:44.607Z"
last_ts: "2026-06-08T15:50:50.104Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a121f33142214edf5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# You are a code-analyzer reviewing a multi-file change in the PRISM repo (H:/pris

> **claude-code-cli** | 2026-06-08 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a121f33142214edf5.jsonl`

## Transcript

### User | 2026-06-08T15:47:44.607Z

You are a code-analyzer reviewing a multi-file change in the PRISM repo (H:/prism). Read these TWO files END-TO-END and review them against the contract below. Flag P0/P1 issues and grade PASS/FAIL.

FILES:
1. H:/prism/scripts/lib/ocr-training-loop-lib.mjs — pure (no fs/fetch) closed-loop OCR trust-calibration core. I ADDED 4 functions at the end: printCursorKey, parseCursorDoneSet, formatCursorLine, partitionByResumeCursor (a resume-cursor for reaper-survivable corpus runs). Review especially those 4.
2. H:/prism/scripts/blueprint-ocr-training-loop.mjs — the runner. I CHANGED PHASE 2 (weak-label) from in-memory accumulation + end-of-run writeFileSync to per-print O_APPEND (trainset.jsonl + active-learning-queue.jsonl + processed-cursor.jsonl) with resume via the lib functions. I ADDED rasterizeIfPdf (PDF→PNG via scripts/lib/pdf-to-png.py page 0 grayscale) + --worklist + --fresh flags.

CONTRACT being verified:
- RESUME INVARIANT: a corpus run killed mid-way (the fleet-reaper kills long node/python under load) must, on restart, process ONLY un-done prints — re-OCR count of already-completed prints = 0. The cursor is the source of truth.
- FAIL-LOUD (R12): never silently discard a print; every skip (missing/rasterize-fail/ensemble-fail) must be logged AND cursored so it isn't retried forever.
- APPEND ORDER: durable rows (trainset/queue) must be appended BEFORE the cursor line for that print, so a kill between them re-processes the print (idempotent) rather than losing a label.
- A torn final cursor line (kill mid-write) must NOT abort resume — parseCursorDoneSet must fail-soft-skip it.
- Cross-path dedup: the SAME drawing at two corpus paths must collapse to ONE cursor key (basename, lowercased) so it isn't re-OCR'd via a different path.

Look hard for: (a) any path where a completed print gets re-OCR'd on resume; (b) any silent data loss; (c) temp-PNG leak from rasterizeIfPdf; (d) the cursorTotal/report numbers lying about what was actually processed; (e) edge case
... [+190 chars truncated]

### Assistant | 2026-06-08T15:47:53.750Z

I'll review both files end-to-end against the contract. Let me read them.

### Assistant | 2026-06-08T15:47:54.227Z

[tool_use: Read]

### Assistant | 2026-06-08T15:47:54.230Z

[tool_use: Read]

### User | 2026-06-08T15:47:57.142Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+16916 chars truncated]

### User | 2026-06-08T15:47:57.175Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+18572 chars truncated]

### Assistant | 2026-06-08T15:48:05.057Z

Both files are read. Let me verify the resume invariant by tracing the cross-path dedup and append-order logic carefully, and check the worklist builder's dedup key claim plus the rasterize key-collision concern.

### Assistant | 2026-06-08T15:48:06.458Z

[tool_use: Bash]

### User | 2026-06-08T15:48:14.191Z

[tool_result] 0 matches for 'toLowerCase\|basename\|dedup\|cursorKey\|\.key'

### Assistant | 2026-06-08T15:48:18.109Z

The grep returned 0 matches, which means either the file doesn't exist or uses different terms. Let me verify the worklist builder exists and check its actual dedup convention, since the lib's cross-path dedup claim ("single source of the identity convention") depends on it.

### Assistant | 2026-06-08T15:48:19.264Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:48:20.853Z

[tool_use: Bash]

### User | 2026-06-08T15:48:44.522Z

[tool_result] NOT_FOUND
scripts/audit-wiki-coverage.mjs
scripts/batch-ollama-vision-extract.mjs
scripts/batch-ollama-vision-extract.test.mjs
scripts/blueprint-ocr-training-loop.mjs
scripts/build-blueprint-ocr-worklist.mjs
scripts/build-blueprint-ocr-worklist.test.mjs
scripts/db-toolbelt.mjs
scripts/generate-wiki-debt-worklist.mjs
scripts/lib/ocr-training-loop-lib.mjs
scripts/lib/ocr-training-loop-lib.test.mjs

### User | 2026-06-08T15:48:50.015Z

[tool_result] scripts/lib/isotonic-calibrator.mjs  8.5K
scripts/lib/pdf-to-png.py  7.4K
scripts/lib/synthetic-print-gen.py  9.2K
---
5 matches in 3 files:

143:0:true, n, dropped, reliable: n >= MIN_RELIABLE_SAMPLES };
87:0:fitted AND n >= MIN_RELIABLE_SAMPLES — a thin fit is real but
scripts/lib/isotonic-calibrator.mjs:36:export const MIN_RELIABLE_SAMPLES = 50;
scripts/lib/isotonic-calibrator.mjs:50:export fun
... [+125 chars truncated]

### Assistant | 2026-06-08T15:48:54.786Z

The worklist builder exists at `scripts/build-blueprint-ocr-worklist.mjs` (not `scripts/lib/`). Let me verify its dedup key convention to validate the lib's claim that `printCursorKey` matches "the same de-dup key build-blueprint-ocr-worklist.mjs already uses." Also let me check `runEnsembleOverImage` and `fuseEnsemble` output shape for the `models_ok` field and `summary.n_models`.

### Assistant | 2026-06-08T15:48:57.436Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:48:57.587Z

[tool_use: Bash]

### User | 2026-06-08T15:49:02.430Z

[tool_result] 12 matches in 2 files:

12:0:path";
scripts/build-blueprint-ocr-worklist.mjs:25:const n = String(name || "").toLowerCase();
scripts/build-blueprint-ocr-worklist.mjs:42:function walkBlueprintPdfs(dir, picks, seenName, limit, depth = 0) {
scripts/build-blueprint-ocr-worklist.mjs:50:walkBlueprintPdfs(full, picks, seenName, limit, depth + 1);
scripts/build-blueprint-ocr-worklist.mjs:55:const key = ent
... [+583 chars truncated]

### User | 2026-06-08T15:49:08.432Z

[tool_result] 0 matches for 'models_ok\|n_models\|return\s*{\|fused\b\|summary'

### Assistant | 2026-06-08T15:49:15.660Z

The worklist builder confirms the dedup convention: line 25 `String(name || "").toLowerCase()` and line 55/89 `ent.name.toLowerCase()` / `o.name.toLowerCase()` — **de-dup by filename, lowercased**. This matches `printCursorKey` (basename + lowercased). The cross-path dedup claim holds.

Now let me verify the ensemble output shape (`models_ok`, `fused.summary.n_models`) since the runner's skip logic and the resume invariant depend on it.

### Assistant | 2026-06-08T15:49:16.911Z

[tool_use: Bash]

### User | 2026-06-08T15:49:23.073Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
23 matches in 12 files:

191:0:Array<object>,            // fused, corroboration-desc
193:0:object,
232:0:nModels,
283:0:nModels,
407:0:object, per_model_runs:Array<{model:string, ok:boolean, ms:number, dim_count:...
408:0:numb
... [+1403 chars truncated]

### Assistant | 2026-06-08T15:49:26.920Z

Let me read the exact ensemble return shape (lines 405-445) and the summary construction (lines 282-299) to confirm `models_ok` and `summary.n_models` are the real field names.

### Assistant | 2026-06-08T15:49:28.024Z

[tool_use: Read]

### Assistant | 2026-06-08T15:49:28.778Z

[tool_use: Read]

### User | 2026-06-08T15:49:30.686Z

[tool_result] 282	  const summary = {
283	    n_models: nModels,
284	    models: runs.map((r) => r.model),
285	    per_model_dim_count: Object.fromEntries(per_model.map((p) => [p.model, p.dim_count])),
286	    quorum,
287	    n_clusters: dimensions.length,
288	    n_corroborated: corroborated.length,                 // ≥2 models agree (consensus, high-trust)
289	    n_partial: dimensions.filter((d) => d.status 
... [+549 chars truncated]

### User | 2026-06-08T15:49:31.451Z

[tool_result] 405	 * }} a
406	 * @returns {Promise<{
407	 *   fused:object, per_model_runs:Array<{model:string, ok:boolean, ms:number, dim_count:(number|null), error:(string|null)}>,
408	 *   models_ok:number, models_failed:number, image:string,
409	 * }>}
410	 */
411	export async function runEnsembleOverImage(a) {
412	  const deps = a.deps || {};
413	  const readFile = typeof deps.readFile === "function" ? dep
... [+2136 chars truncated]

### Assistant | 2026-06-08T15:49:41.197Z

Confirmed: `runEnsembleOverImage` returns `{ fused, per_model_runs, models_ok, models_failed, image }` and `fused.summary.n_models` exists. The runner's field accesses (`res.fused.summary.n_models`, `res.models_ok`, `res.fused.dimensions`, `res.fused.summary`) all match.

Now let me verify two contract-critical edge cases concretely: (1) the `--fresh` ordering relative to cursor read, and (2) the cross-path dedup interaction when a print appears in BOTH `--real-png` and `--worklist`. Let me also check the test file to see what's already covered.

### Assistant | 2026-06-08T15:49:42.628Z

[tool_use: Bash]

### User | 2026-06-08T15:49:47.341Z

[tool_result] Exit code 1
34 matches in 16 files:

196:0:collapses cross-path duplicates to one identity (JM stores a print at many pa...
200:0:\\PRISM\\Docustrata\\x\\PART_A.PDF"), "part_a.pdf");
208:0:round-trips a done key; defaults status=labeled", () => {
209:0:"DIR/Foo.png", status: "labeled", trainable: 5, n_models: 3, ts: "2026-06-08T...
219:0:"x.png" }));
224:0:a TORN final line (kill mid-write) is ski
... [+1712 chars truncated]

### Assistant | 2026-06-08T15:49:51.473Z

Strong test coverage exists for all 4 functions including the contract-critical cases: cross-path collapse, torn final line, legacy keys, todo-order preservation, in-worklist dedup, and keyless drop. Let me run the test suite to confirm green, then verify the one subtle edge case I want to confirm — the `--fresh` truncation correctness and whether a print in BOTH `--real-png` and `--worklist` is handled.

### Assistant | 2026-06-08T15:49:52.009Z

[tool_use: Bash]

### User | 2026-06-08T15:49:57.302Z

[tool_result]   ...
# Subtest: partitionByResumeCursor: a print listed twice in the worklist is processed once (in-worklist de-dup)
ok 18 - partitionByResumeCursor: a print listed twice in the worklist is processed once (in-worklist de-dup)
  ---
  duration_ms: 0.1153
  ...
# Subtest: partitionByResumeCursor: keyless (blank) worklist entries are dropped from todo, counted
ok 19 - partitionByResumeCursor: keyles
... [+195 chars truncated]

### Assistant | 2026-06-08T15:50:50.104Z

19/19 pass. Now I have everything needed. Let me trace the remaining contract concerns against the actual code:

**Cross-path dedup when a print is in both `--real-png` and `--worklist`:** `realPngs` (line 167-175) concatenates `--real-png`, `--real-dir` PNGs, and `--worklist` entries into one array. `partitionByResumeCursor` (line 193) de-dups within that array via its internal `seen` set (lib line 289-294), so the same basename appearing via two sources collapses to one `todo` entry. Verified correct.

**`--fresh` truncation correctness:** lines 185-187 truncate `trainsetPath/queuePath/cursorPath` to `""` BEFORE the cursor read (line 189 is gated on `!opts.fresh`), so on `--fresh` the doneSet stays empty and all prints re-process. Correct ordering.

Now let me trace the most important contract concern — the **report `cursorTotal`/numbers honesty** and one subtle data-loss path in the append ordering.

The contract says durable rows must be appended BEFORE the cursor line. Let me look at lines 232-242 carefully:

- Trainset append (234) → queue append (238) → cursor append (241). Correct order. A kill between trainset-append and cursor-append re-processes (key not yet cursored), and the re-append is additive/idempotent by key. Good.

But there's a real issue worth flagging. Let me verify the `alQueue` double-counting / report semantics and the trainset dedup-on-resume behavior.

I now have a complete picture. Here is my review.

---

## Code Quality Analysis Report — OCR Training-Loop Resume Cursor

### Summary
- **Files Analyzed:** 2 (`scripts/lib/ocr-training-loop-lib.mjs`, `scripts/blueprint-ocr-training-loop.mjs`)
- **Verdict: PASS** (with 1 P1 the author should decide on, and 3 P2 notes)
- The 5 contract invariants (resume, fail-loud, append-order, torn-line fail-soft, cross-path dedup) all hold against the actual code. The dedup-key convention claim is **verified true** against `build-blueprint-ocr-worklist.mjs` (lines 25/55/89: `name.toLowerCase()` de-dup-by
... [+6256 chars truncated]
