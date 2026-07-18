---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Holistic review (arm A of PRISM 3-of-3 scrutiny gate) of commit a783df2419 on br"
date: "2026-06-23"
first_ts: "2026-06-23T08:06:09.339Z"
last_ts: "2026-06-23T08:08:01.745Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 14
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a97da4d59fcab1c1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Holistic review (arm A of PRISM 3-of-3 scrutiny gate) of commit a783df2419 on br

> **claude-code-cli** | 2026-06-23 | 39 msgs (14 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a97da4d59fcab1c1d.jsonl`

## Transcript

### User | 2026-06-23T08:06:09.339Z

Holistic review (arm A of PRISM 3-of-3 scrutiny gate) of commit a783df2419 on branch cad-fusion-live-ms0.

Get the diff: `git -C H:/prism show a783df2419 --stat` then `git -C H:/prism show a783df2419`.

UNIT: U-XRAY-ENSEMBLE-NONDIM-UNION. `fuseEnsemble` (scripts/lib/vision-ensemble-fuse.mjs) used to fuse ONLY dimensions and silently drop each model's extracted gdt/notes/profiles/surface_finishes. The commit adds a recall-first cross-model UNION of those four fields (de-dup by per-field identity key; each entry tagged corroboration/n_models/models/hallucination_candidate), new summary counts, and wires the counts through buildTrainsetRow + aggregateTrainingLoop (scripts/lib/ocr-training-loop-lib.mjs) and the runner scripts/blueprint-ocr-training-loop.mjs (JSONL trainset row + this_run_non_dim_coverage report block).

Grade PASS/FAIL with P0/P1/P2 + file:line. Focus: overall correctness, is the change strictly additive (existing dimension fuse + existing consumers unaffected), does it reach a real destination (not an orphan), and is it honest (counts only, GD&T not claimed as a trained label). Note: 72/72 lib tests pass; live run produced report this_run_non_dim_coverage {gdt:1,notes:1,profiles:0,surface_finishes:1}. Do not run tests. End with PASS or FAIL.

### Assistant | 2026-06-23T08:06:15.746Z

I'll review commit a783df2419 holistically. Let me start by getting the diff.

### Assistant | 2026-06-23T08:06:16.061Z

[tool_use: Bash]

### User | 2026-06-23T08:06:18.873Z

[tool_result] commit a783df2419d5744ff7b28f2c07ad3f17ac9fee09
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:05:09 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage
    
    Producer (vision-ensemble-f
... [+2457 chars truncated]

### Assistant | 2026-06-23T08:06:21.048Z

Let me get the full diff and read the affected files end to end.

### Assistant | 2026-06-23T08:06:21.685Z

[tool_use: Bash]

### User | 2026-06-23T08:06:24.490Z

[tool_result] <persisted-output>
Output too large (29.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\6a8a0fc5-4275-43b0-b847-449c590c706b\tool-results\b09ftwsmj.txt

Preview (first 2KB):
commit a783df2419d5744ff7b28f2c07ad3f17ac9fee09
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:05:09 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-N
... [+1765 chars truncated]

### Assistant | 2026-06-23T08:06:27.581Z

[tool_use: Read]

### User | 2026-06-23T08:06:30.816Z

[tool_result] 1	commit a783df2419d5744ff7b28f2c07ad3f17ac9fee09
2	Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
3	Date:   Tue Jun 23 03:05:09 2026 -0500
4	
5	    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage
6	    
7	    Producer (vis
... [+31393 chars truncated]

### Assistant | 2026-06-23T08:06:33.583Z

Now let me read the full source files end to end to verify the surrounding contract. Starting with the producer `vision-ensemble-fuse.mjs`.

### Assistant | 2026-06-23T08:06:34.071Z

[tool_use: Read]

### User | 2026-06-23T08:06:35.410Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+32396 chars truncated]

### Assistant | 2026-06-23T08:06:38.711Z

The producer is clean and complete. Now let me read the consumer lib and the runner to verify the wiring reaches a real destination, and check the existing consumer `buildRegionRoutedFused` to confirm the additive claim.

### Assistant | 2026-06-23T08:06:39.192Z

[tool_use: Read]

### User | 2026-06-23T08:06:39.943Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 12m ago in this session and is unchanged (mtime 1782201138117). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T08:06:43.448Z

The read-once guard fired, but I have not actually seen the full content of `ocr-training-loop-lib.mjs` in this session (only the diff hunks). Let me read it with explicit offset to bypass the cache and see the full `buildTrainsetRow` and `aggregateTrainingLoop` context.

### Assistant | 2026-06-23T08:06:43.963Z

[tool_use: Read]

### User | 2026-06-23T08:06:45.094Z

[tool_result] 100	 * @param {object} calibration
101	 * @param {{thresholds?:object}} [opts]
102	 * @returns {{tier:"gold"|"silver"|"bronze"|"reject"|"uncalibrated", expectedAccuracy:(number|null), f:number}}
103	 */
104	export function assignLabelTier(f, calibration, opts = {}) {
105	  const th = { ...DEFAULT_TIER_THRESHOLDS, ...(opts.thresholds || {}) };
106	  const acc = expectedAccuracyForFraction(f, calibr
... [+7691 chars truncated]

### Assistant | 2026-06-23T08:06:50.145Z

The consumer lib is correct and complete. Now let me read the runner around the changed write sites to verify both write destinations are reached, and confirm `aggregateTrainingLoop` is actually called by the runner (or if the runner uses its own inline `nonDimCoverage` tally — there appear to be two paths).

### Assistant | 2026-06-23T08:06:51.155Z

[tool_use: Read]

### User | 2026-06-23T08:06:52.313Z

[tool_result] 360	          // union (opt-in --region-route). Downstream (buildTrainsetRow / classifyActiveLearning / queue
361	          // summary) consumes `fused` uniformly -- both paths emit the same fused shape.
362	          let fused;
363	          if (opts.regionRoute) {
364	            // Region routing forces units onto each title-block-stripped crop (regions); the full-page
365	            // floor 
... [+10068 chars truncated]

### Assistant | 2026-06-23T08:07:00.248Z

Both runner write sites are wired: the JSONL row (line 400) and the report block (line 471), both fed from the in-memory `nonDimCoverage` tally (lines 404-407) and the `trainsetRow.*_count` fields. The runner uses its own inline tally rather than `aggregateTrainingLoop`, but `aggregateTrainingLoop`'s new `non_dim_coverage` rollup is exercised by tests and is a legitimate parallel destination for the lib's other consumers. Let me verify the existing consumer `buildRegionRoutedFused` (referenced in the commit message) to confirm it already assumed the fields, and check for any consumer that might be broken by the new return shape.

### Assistant | 2026-06-23T08:07:01.683Z

[tool_use: Grep]

### User | 2026-06-23T08:07:03.157Z

[tool_result] scripts\blueprint-ocr-review.mjs:66:    const gdt = Array.isArray(ex.gdt) ? ex.gdt : [];
scripts\blueprint-ocr-training-loop.mjs:400:            try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, gdt_count: trainsetRow.gdt_count, note_count: trainsetRow.note_count, profile_count: trainsetRow.pr
... [+6991 chars truncated]

### Assistant | 2026-06-23T08:07:06.917Z

Let me locate `buildRegionRoutedFused` specifically (the consumer the commit message names as already assuming the fields), and check the region-glue lib that the runner calls via `extractWithRegionRouting`.

### Assistant | 2026-06-23T08:07:08.321Z

[tool_use: Grep]

### User | 2026-06-23T08:07:08.328Z

[tool_result] <tool_use_error>Path does not exist: H:\prism\scripts\lib\region-route-glue-lib.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-23T08:07:11.081Z

[tool_use: Grep]

### User | 2026-06-23T08:07:12.597Z

[tool_result] Found 4 files
scripts\lib\vision-ensemble-fuse.mjs
scripts\region-classify.mjs
scripts\lib\region-glue-lib.test.mjs
scripts\lib\region-glue-lib.mjs

### Assistant | 2026-06-23T08:07:16.560Z

Wait — the grep says `vision-ensemble-fuse.mjs` matches `buildRegionRoutedFused`, but I read the whole file and saw no such symbol. That match must be in a comment I scanned past, or the grep is matching a substring. Let me check the region-glue-lib (the actual definition site) to verify the existing consumer's contract for the non-dim fields.

### Assistant | 2026-06-23T08:07:17.573Z

[tool_use: Grep]

### User | 2026-06-23T08:07:19.045Z

[tool_result] 153-/**
154- * Build a COMPLETE fused-shaped object for a region-routed page: take the full-page floor's fused
155: * output (which carries the non-dimension rich schema -- gdt / notes / profiles / surface_finishes /
156- * summary / part_bounds) and REPLACE its dimensions with the region-routed union. This lets a consumer
157- * that builds rich labels from a `fused` object (e.g. blueprint-ocr-tr
... [+1260 chars truncated]

### Assistant | 2026-06-23T08:07:25.232Z

This confirms the commit's central premise. Let me read the body of `buildRegionRoutedFused` to confirm it spreads the full-page fused (carrying gdt/notes/profiles/surface_finishes) — so the region-route path now genuinely carries these fields (previously the spread would have carried empty/undefined since fuseEnsemble never produced them).

### Assistant | 2026-06-23T08:07:26.160Z

[tool_use: Read]

### User | 2026-06-23T08:07:27.108Z

[tool_result] 178	export function buildRegionRoutedFused(mergedDimensions, fullPageFused, opts = {}) {
179	  const dims = Array.isArray(mergedDimensions) ? mergedDimensions : [];
180	  // n_hallucination_candidates recomputed over the UNION dims so a region-only hallucination candidate
181	  // (a singleton a region crop recovered) still routes to active-learning review (classifyActiveLearning
182	  // triggers
... [+1946 chars truncated]

### Assistant | 2026-06-23T08:07:33.324Z

Confirmed. Line 197 `const out = { ...fullPageFused, dimensions: dims }` spreads the full-page fused object — which previously did NOT contain `gdt/notes/profiles/surface_finishes` because `fuseEnsemble` dropped them. So the region-route consumer was genuinely getting empty/undefined for those fields (the "ASSUMED the fused carried them" data loss the commit message describes). Now `fuseEnsemble` produces them, and `buildRegionRoutedFused` correctly passes them through to `buildTrainsetRow`. This validates both the bug and the fix reaching a real destination.

Let me do a final verification: check that no other consumer of `fuseEnsemble`'s return object would break by the added top-level keys, and confirm the `numKeyPart`/`profileKey` correctness with one edge case — whether `profileKey` drops a profile that has only a `name` (no dims). Let me also confirm there are no other callers of `fuseEnsemble`.

### Assistant | 2026-06-23T08:07:34.842Z

[tool_use: Grep]

### User | 2026-06-23T08:07:36.555Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:304:  // ensemble read, now that fuseEnsemble unions them). Captured for ALL pages, not just those with
scripts\blueprint-ocr-training-loop.mjs:471:        this_run_non_dim_coverage: nonDimCoverage,
scripts\lib\vision-tiling-lib.mjs:114://   - fuseEnsemble     (vision-ensemble-fuse):      { value_mm,   raw_texts:string[], agreement_confidence }
scripts\lib\v
... [+3574 chars truncated]

### Assistant | 2026-06-23T08:08:01.745Z

All `fuseEnsemble` consumers are accounted for: the runner (`runEnsembleOverImage` internal + the training-loop), the region-glue passthrough, and the tests. No consumer destructures the return in a way that the four new top-level keys would break (additive keys only; existing consumers read `dimensions`/`summary`/`ambiguous_pairs`/`per_model`). The `aggregateTrainingLoop` non-dim rollup is used by the lib test; the runner uses its own inline tally (a parallel, equivalent path — acceptable since the runner predates and does not call `aggregateTrainingLoop`).

I have read all five changed files end to end (or the relevant whole functions plus surrounding context) plus the two key downstream consumers (`buildRegionRoutedFused`, the runner write sites). I have everything needed to grade.

Let me note one substantive edge I examined: `profileKey` — a profile with only `{name:"bore"}` and no type/dims yields key `"bore|||"`. Two genuinely different profiles both named "bore" with no other distinguishing fields would collapse to one entry. This is recall-LOSING (not recall-gaining), but it is consistent with the de-dup-by-identity design, mirrors the dimension fuse's behavior for indistinguishable inputs, and the field is a counts-only advisory (not a trained label), so the impact is bounded to a slightly under-counted `profile_count`. Worth noting as P2, not a blocker.

---

VERDICT: PASS

summary: Commit a783df2419 adds a recall-first cross-model UNION of gdt/notes/profiles/surface_finishes to `fuseEnsemble` (previously these were silently dropped, a real R12 data-loss the existing region-route consumer `buildRegionRoutedFused` already assumed away via its `{...fullPageFused}` spread at region-glue-lib.mjs:197). The change is strictly additive (existing `dimensions`/`summary`/`ambiguous_pairs`/`per_model` consumers are byte-unaffected), reaches two real destinations in the runner (the trainset JSONL row at blueprint-ocr-training-loop.mjs:400 and the `this_run_non_dim_co
... [+2258 chars truncated]
