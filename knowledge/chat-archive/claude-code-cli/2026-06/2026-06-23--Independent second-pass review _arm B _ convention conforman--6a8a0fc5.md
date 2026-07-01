---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent second-pass review (arm B — convention conformance, test integrity, "
date: "2026-06-23"
first_ts: "2026-06-23T07:54:12.514Z"
last_ts: "2026-06-23T07:56:56.167Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a0e77b6ba9564a6ac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review (arm B — convention conformance, test integrity, 

> **claude-code-cli** | 2026-06-23 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a0e77b6ba9564a6ac.jsonl`

## Transcript

### User | 2026-06-23T07:54:12.514Z

Independent second-pass review (arm B — convention conformance, test integrity, hidden coupling; do NOT assume the analyst caught everything) for PRISM unit U-XRAY-ENSEMBLE-NONDIM-UNION (consumer half).

FILE CHANGED: H:\prism\scripts\lib\ocr-training-loop-lib.mjs
TEST FILE: H:\prism\scripts\lib\ocr-training-loop-lib.test.mjs

CONTEXT: `buildTrainsetRow` now records `gdt_count/note_count/profile_count/surface_finish_count` from the fused object (which `fuseEnsemble` now unions — previously these fields were silently dropped). `aggregateTrainingLoop` rolls them into `non_dim_coverage`. This makes the closed-loop OCR trainset corpus capture GD&T/notes/profile/finish reach instead of being dimension-only.

VERIFY (grade PASS/FAIL with P0/P1/P2 + file:line):
1. Does the code read like the surrounding code (naming style, ASCII-only, comment density)? Any non-ASCII in new lines?
2. Is the change genuinely WIRED to a destination (not an orphan)? The counts must flow into the JSONL trainset row + the run report — confirm the trainset row returned by buildTrainsetRow is what the runner writes, and the aggregate is the report.
3. Is this honest observability (R12) — does it claim more than it does? It records COUNTS only (not the gdt/notes content as trainable labels). Confirm the comment/naming does not overstate (it should NOT imply gdt is now a trained label — that is a future unit).
4. TEST INTEGRITY — 3 new tests: real reference-value assertions, happy + back-compat (missing fields -> 0) + rollup? Any weakened assertion, stub, .skip/.only?
5. Any back-compat risk to existing trainset JSONL consumers from the added keys?

Read both changed files end-to-end. Report only P0/P1/P2 with file:line + a final PASS or FAIL. Tests already verified green (29/29) — do not run them.

### Assistant | 2026-06-23T07:54:28.537Z

I'll review the consumer half of U-XRAY-ENSEMBLE-NONDIM-UNION. Let me read both files end to end.

### Assistant | 2026-06-23T07:54:28.887Z

[tool_use: Read]

### User | 2026-06-23T07:54:29.603Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 13s ago in this session and is unchanged (mtime 1782201138117). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T07:54:30.940Z

[tool_use: Read]

### User | 2026-06-23T07:54:31.625Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1782201189386). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T07:54:34.990Z

The read-once guard says these files are already in my context, but I don't actually have them in this fresh review thread. Let me bypass the cache to read them.

### Assistant | 2026-06-23T07:54:35.967Z

[tool_use: Bash]

### User | 2026-06-23T07:54:39.038Z

[tool_result] // scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims models corroborate are high
... [+20398 chars truncated]

### Assistant | 2026-06-23T07:54:43.107Z

I have the lib file. Now the test file.

### Assistant | 2026-06-23T07:54:44.056Z

[tool_use: Bash]

### User | 2026-06-23T07:54:47.180Z

[tool_result] // scripts/lib/ocr-training-loop-lib.test.mjs
// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
// training on garbage labels — the exact "garbage in, garbage out" 
... [+23281 chars truncated]

### Assistant | 2026-06-23T07:55:07.506Z

I have both files. Now let me verify the producer-side contract: does `fuseEnsemble` actually union `gdt/notes/profiles/surface_finishes` as the comment and the consumer claim? The consumer is honest only if the producer fields it reads (`fused.gdt`, `fused.notes`, `fused.profiles`, `fused.surface_finishes`) actually exist. Let me also verify the runner actually writes `buildTrainsetRow`'s return and the aggregate into the report.

### Assistant | 2026-06-23T07:55:09.026Z

[tool_use: Grep]

### User | 2026-06-23T07:55:10.298Z

[tool_result] 38://   combineConfidenceNoisyOr · normalizeModelDim · clusterAcrossModels · fuseEnsemble
182:// NON-DIMENSION FIELD UNION (recall-first) -- gdt / notes / profiles / surface_finishes.
229: * @param {string} field  "gdt" | "notes" | "profiles" | "surface_finishes"
273: * unions of the non-dimension fields (gdt / notes / profiles / surface_finishes).
285: *   profiles: Array<object>,              //
... [+1201 chars truncated]

### Assistant | 2026-06-23T07:55:14.723Z

[tool_use: Grep]

### User | 2026-06-23T07:55:16.037Z

[tool_result] Found 12 files
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\region-classify.mjs
scripts\region-classify.test.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\region-glue-lib.test.mjs
scripts\lib\region-glue-lib.mjs
scripts\probe-vision-model.mjs
scripts\xray-trainset-to-lora.mjs
scripts\xray-trainset-to-lora.test.mjs
scripts\lib\trainset-to-lora-p
... [+52 chars truncated]

### Assistant | 2026-06-23T07:55:28.418Z

Confirmed: the producer `fuseEnsemble` at `vision-ensemble-fuse.mjs:406` returns `{ dimensions, gdt, notes, profiles, surface_finishes, ... }` — the exact field names the consumer reads. The union code is at lines 380-381. The contract is real, not fabricated.

Now let me confirm the runner (`blueprint-ocr-training-loop.mjs`) writes `buildTrainsetRow`'s output to the JSONL trainset and the aggregate to the report — that proves the new counts reach a destination (not orphaned).

### Assistant | 2026-06-23T07:55:30.286Z

[tool_use: Grep]

### User | 2026-06-23T07:55:31.573Z

[tool_result] 14://   3. EMIT — trainset.jsonl (for india), active-learning-queue.jsonl, and a run report.
29:import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, appendFileSync, rmSync } from "node:fs";
44:  buildTrainsetRow,
268:  // Each completed print appends its trainset/queue rows AND a cursor line IMMEDIATELY, so a kill
282:  const trainsetPath = join(opts.outDir, "trainset.jsonl");
... [+3458 chars truncated]

### Assistant | 2026-06-23T07:55:43.963Z

This is a critical finding. The runner at `blueprint-ocr-training-loop.mjs:388` calls `buildTrainsetRow` and gets the row with the new `gdt_count/note_count/profile_count/surface_finish_count` fields, BUT:

1. At line 396, the **trainset JSONL** row it writes is a *hand-rebuilt object*: `{ key, page, part, image, n_models, labels: trainable, source }` — it does NOT include the new non-dim count fields.
2. At line 442, the **report** is rebuilt from local tallies (`agg`, `totalLabels`, etc.) — let me check whether it calls `aggregateTrainingLoop` or rolls `non_dim_coverage` at all.

Let me read the runner's report-emit block and the per-page aggregation to confirm whether the new counts actually reach EITHER destination.

### Assistant | 2026-06-23T07:55:44.524Z

[tool_use: Read]

### User | 2026-06-23T07:55:45.707Z

[tool_result] 295	    try { doneSet = parseCursorDoneSet(readFileSync(cursorPath, "utf8"), { retryFailed: opts.retryFailed }); }
296	    catch (e) { console.error(`  ⚠ cursor read failed (treating as empty): ${e instanceof Error ? e.message : String(e)}`); }
297	  }
298	  const { todo, skippedDone, skippedNullKey, skippedWorklistDup, skippedCursorDone, distinctTotal } = partitionByResumeCursor(realPngs, doneSet
... [+14303 chars truncated]

### Assistant | 2026-06-23T07:56:11.285Z

I now have the full picture. This is the load-bearing finding. Let me lay it out precisely.

The task prompt's wiring claim — "the counts must flow into the JSONL trainset row + the run report" — is the acceptance criterion. Verifying against the actual runner (`blueprint-ocr-training-loop.mjs`):

**The trainset JSONL row (line 396):** The runner does NOT write `buildTrainsetRow`'s return object. It hand-rebuilds a new object: `{ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, source }`. The new `gdt_count/note_count/profile_count/surface_finish_count` fields produced by `buildTrainsetRow` are NOT picked up. So the counts do NOT reach the JSONL trainset row.

**The report (lines 442-462):** The runner does NOT call `aggregateTrainingLoop`. It builds the report from its own in-memory tallies (`agg`, `totalLabels`, `trainableLabels`, `alQueue`, etc.). There is NO `non_dim_coverage` key anywhere in the report. The runner does not accumulate `gdt_count` etc. per page (line 404 only iterates `trainsetRow.labels` for tier counts). So the counts do NOT reach the run report either.

The consumer-side code (the lib) is correct and tested, but the actual destinations the task prompt names — the JSONL trainset row AND the run report — both bypass the new fields. The producer (`fuseEnsemble`) unions the data, `buildTrainsetRow` records the counts, but the runner discards them at both write sites. This is an orphan: the new fields are computed and dropped, exactly the "building != wiring / generating != delivering" failure mode.

Let me double check there is no other consumer of `buildTrainsetRow`'s full object (e.g. some other runner that writes it whole) and that `aggregateTrainingLoop` truly has no caller outside tests.

### Assistant | 2026-06-23T07:56:12.986Z

[tool_use: Grep]

### User | 2026-06-23T07:56:16.314Z

[tool_result] knowledge\wiki\architecture\blueprint-reading-improvement-backlog-2026-06-19.md:39:[Omitted long matching line]
scripts\lib\ocr-training-loop-lib.mjs:128:export function buildTrainsetRow(part, fused, calibration, opts = {}) {
scripts\lib\ocr-training-loop-lib.mjs:191:export function aggregateTrainingLoop(perPartResults, calibration) {
scripts\blueprint-ocr-training-loop.mjs:388:          const tra
... [+231 chars truncated]

### Assistant | 2026-06-23T07:56:56.167Z

Confirmed:
- `buildTrainsetRow` has exactly one non-test caller: `blueprint-ocr-training-loop.mjs:388` — which discards the new count fields when it hand-rebuilds the JSONL row (line 396) and never accumulates them into the report.
- `aggregateTrainingLoop` has **zero non-test callers anywhere in the repo**. It is a pre-existing orphan; the new `non_dim_coverage` rollup it grew is therefore never written to any report. The runner computes its report inline and does not call it.

So the new observability the unit advertises ("the closed-loop OCR trainset corpus capture GD&T/notes/profile/finish reach") does not actually reach either destination the task prompt names. The lib + tests are clean; the wiring is missing.

Now the remaining checks (convention, R12 honesty, test integrity, back-compat) on the changed file itself.

**1. Convention / ASCII.** The new lines (the `buildTrainsetRow` count block at lines 159-167, the `aggregateTrainingLoop` `nonDim` block at lines 193-204) match surrounding naming (`snake_case` output keys, `camelCase` locals), comment density is consistent, and the guards (`fused && Array.isArray(...) ? ....length : 0`) mirror the existing `dims`/`runNModels` defensive style. The comment at lines 161-164 uses `/` separators, no smart quotes, no em-dashes — ASCII-only in the new lines. (The file does use unicode `⇒`/`≥`/`→` elsewhere, but those are pre-existing, not in this diff.)

**2. R12 honesty.** The comment is careful: "Records GD&T/notes/profile/finish *reach*" and "Non-dimension *coverage* the ensemble captured." It does NOT claim gdt is a trained label — `gdt_count` is a count, not added to `labels`, and the trainable gating (gold/silver) is untouched. The naming (`*_count`, `non_dim_coverage`) correctly signals observability-only. This is honest.

**3. Test integrity.** The 3 new lib tests are real:
- `buildTrainsetRow: records non-dimension coverage` — reference values `gdt_count===2, note_count===1, profile_count===1, surface_finish_c
... [+4816 chars truncated]
