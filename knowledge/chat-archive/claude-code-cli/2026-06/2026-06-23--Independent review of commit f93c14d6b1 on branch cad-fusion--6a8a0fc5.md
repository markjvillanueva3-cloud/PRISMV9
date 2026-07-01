---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent review of commit f93c14d6b1 on branch cad-fusion-live-ms0 -- wiring "
date: "2026-06-23"
first_ts: "2026-06-23T01:22:17.567Z"
last_ts: "2026-06-23T01:25:43.166Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a294f5efa56f9fcca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review of commit f93c14d6b1 on branch cad-fusion-live-ms0 -- wiring 

> **claude-code-cli** | 2026-06-23 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a294f5efa56f9fcca.jsonl`

## Transcript

### User | 2026-06-23T01:22:17.567Z

Independent review of commit f93c14d6b1 on branch cad-fusion-live-ms0 -- wiring opt-in --region-route into the live OCR training cron H:\prism\scripts\blueprint-ocr-training-loop.mjs. Read the file (per-page loop ~line 334-405, parseArgs ~107-116, imports ~36-41). Do NOT assume the other reviewer caught everything.

CONTEXT: --region-route (default OFF) makes the per-page loop resolve `fused` from extractWithRegionRouting (P1.5 region routing: full-page floor UNION per-region crops) instead of plain runEnsembleOverImage. The hybrid fused flows into buildTrainsetRow + classifyActiveLearning. The running cron is unchanged when the flag is off.

Weight toward what a structural-diff reviewer might miss:
- DATA-LOSS / SAFETY: Could the region branch ever silently produce FEWER labels than full-page on a print the full-page reads fine (recall regression)? The design claims region routing only ADDS recall on top of an always-run full-page floor -- is that actually true in this wire (does extractWithRegionRouting's hybrid fused.dimensions include the full-page floor dims)?
- UNITS (xray rail: JM is INCH, a units mismatch is a 25.4x error): region crops strip the title block. The wire passes assumeUnits:"in" + forceUnits (regions) + conditionally ensembleOpts.forceUnits when --force-units. Is there ANY path where a region crop gets OCR'd with NO unit forcing (-> a wrong-scale value silently entering the trainset)?
- CONVENTION: opt-in default-off correctly leaves the cron byte-identical when off? ASCII-only in the .mjs? The new parseArgs flag + comment match the file's idiom?
- The commit claims "VALIDATED live ... 12 labels ... 0 trainable = --calibrate-count 0 artifact". Is that a sound interpretation, or could 0 trainable hide a real region-routing defect? (Consider: uncalibrated tier is by-design untrainable when calibrate-count=0; check buildTrainsetRow/the report semantics.)

Grade PASS/FAIL with P0/P1/P2 + file:line. Concise.

### Assistant | 2026-06-23T01:22:22.109Z

I'll review commit f93c14d6b1, focusing on the data-loss, units, convention, and validation-claim risks. Let me start by reading the commit and the changed file end-to-end.

### Assistant | 2026-06-23T01:22:23.046Z

[tool_use: Bash]

### Assistant | 2026-06-23T01:22:23.606Z

[tool_use: Bash]

### User | 2026-06-23T01:22:27.455Z

[tool_result] commit f93c14d6b15d240ae53c1ac0f78b30a9722e1bc5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 20:21:36 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-CRON-WIRE (slot:xray): wire opt-in --region-route into the live OCR training cron -- the last P1.5 consumer (R15 wire-to-all)
    
    blueprint-ocr-training-loop.mjs per-page loop now resolves the pag
... [+1452 chars truncated]

### User | 2026-06-23T01:22:29.065Z

[tool_result] commit f93c14d6b15d240ae53c1ac0f78b30a9722e1bc5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 20:21:36 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-CRON-WIRE (slot:xray): wire opt-in --region-route into the live OCR training cron -- the last P1.5 consumer (R15 wire-to-all)
    
    blueprint-ocr-training-loop.mjs per-page loop now resolves the pag
... [+8708 chars truncated]

### Assistant | 2026-06-23T01:22:33.305Z

I have the diff. Now let me read the full file end-to-end to understand the surrounding contract, and read the key dependency `extractWithRegionRouting` to verify the data-loss and units claims.

### Assistant | 2026-06-23T01:22:33.657Z

[tool_use: Read]

### Assistant | 2026-06-23T01:22:33.869Z

[tool_use: Read]

### User | 2026-06-23T01:22:35.911Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.mjs' was already read 11m ago in this session and is unchanged (mtime 1782176112332). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T01:22:36.159Z

[tool_result] read-once-guard: 'H:\prism\scripts\blueprint-ocr-training-loop.mjs' was already read 21s ago in this session and is unchanged (mtime 1782177399596). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T01:22:38.684Z

The read-once guard is blocking, but these files were not actually read in MY session context. Let me disable the cache to get the actual content.

### Assistant | 2026-06-23T01:22:40.168Z

[tool_use: Bash]

### User | 2026-06-23T01:22:46.200Z

[tool_result]   479 H:/prism/scripts/blueprint-ocr-training-loop.mjs
  250 H:/prism/scripts/region-classify.mjs
  729 total

### Assistant | 2026-06-23T01:22:49.144Z

[tool_use: Read]

### User | 2026-06-23T01:22:50.034Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.mjs' was already read 11m ago in this session and is unchanged (mtime 1782176112332). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T01:22:54.927Z

The guard tracks by file path regardless of session. I'll read via Bash with the cache disabled at the env level isn't enough for the Read tool, so I'll use `cat` through Bash to get the actual content.

### Assistant | 2026-06-23T01:22:55.548Z

[tool_use: Bash]

### User | 2026-06-23T01:23:01.548Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/region-classify.mjs
     3	//
     4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
     5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
     6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
     7	// split
... [+15413 chars truncated]

### Assistant | 2026-06-23T01:23:05.994Z

I now have `region-classify.mjs` fully. I need the merge/fused builders to verify the core data-loss claim (does the hybrid fused include the full-page floor dims as a UNION). Let me read `region-glue-lib.mjs` and the trainset-row/active-learning logic in the main file, plus `buildRegionRoutedFused` and `mergeRegionResults`.

### Assistant | 2026-06-23T01:23:07.122Z

[tool_use: Bash]

### User | 2026-06-23T01:23:12.469Z

[tool_result]      1	// scripts/lib/region-glue-lib.mjs
     2	//
     3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
     4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
     5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
     6	// merge inputs for vision-tiling-lib me
... [+12996 chars truncated]

### Assistant | 2026-06-23T01:23:19.720Z

The merge logic confirms the union contract at the lib level: `mergeRegionResults` always pushes the full-page floor as a participating tile (region-glue-lib.mjs:144-148), and `buildRegionRoutedFused` replaces only `dimensions` while preserving the full-page floor's non-dimension schema (region-glue-lib.mjs:197). 

Now I need to verify the critical data-loss question end-to-end: does `mergeTiledDimensions` actually preserve every full-page dim (never drop one), and does the main file's `buildTrainsetRow`/`classifyActiveLearning`/`printUnit` handling have any gap in the region path. Let me read the relevant parts.

### Assistant | 2026-06-23T01:23:20.836Z

[tool_use: Bash]

### User | 2026-06-23T01:23:26.513Z

[tool_result]    290	  if (opts.fresh) {
   291	    for (const p of [trainsetPath, queuePath, cursorPath]) { try { writeFileSync(p, ""); } catch { /* best-effort */ } }
   292	  }
   293	  let doneSet = new Set();
   294	  if (!opts.fresh && existsSync(cursorPath)) {
   295	    try { doneSet = parseCursorDoneSet(readFileSync(cursorPath, "utf8"), { retryFailed: opts.retryFailed }); }
   296	    catch (e) { conso
... [+15721 chars truncated]

### Assistant | 2026-06-23T01:23:31.094Z

Now let me check the head of the main file (imports, parseArgs, OLLAMA_URL, `models` resolution) and verify `buildTrainsetRow`/`classifyActiveLearning` semantics — specifically the corroboration/trainable gate and whether 0-trainable on calibrate-count 0 is by-design.

### Assistant | 2026-06-23T01:23:32.046Z

[tool_use: Bash]

### User | 2026-06-23T01:23:38.854Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/blueprint-ocr-training-loop.mjs
     3	//
     4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
     5	//
     6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
     7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
     8	//      measure
... [+9823 chars truncated]

### Assistant | 2026-06-23T01:23:44.001Z

Now let me verify the `buildTrainsetRow` trainable gate and `classifyActiveLearning` to confirm: (1) the "0 trainable on calibrate-count 0" interpretation is sound, and (2) whether the region-routed fused with synthesized `summary.n_models` actually passes the corroboration gate. Let me also check `mergeTiledDimensions` to confirm the union never drops a full-page dim.

### Assistant | 2026-06-23T01:23:47.046Z

[tool_use: Bash]

### User | 2026-06-23T01:23:51.054Z

[tool_result] // scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims models corroborate are high
... [+6664 chars truncated]

### Assistant | 2026-06-23T01:23:57.870Z

This confirms the validation-claim interpretation. With `--calibrate-count 0`, `calibration.calibrated` is false → `tierForFraction` returns `tier: "uncalibrated"` (line 107) → `buildTrainsetRow` line 143: `trainable: t.tier === "gold" || t.tier === "silver"` is false for "uncalibrated". So **0 trainable on calibrate-count 0 is by-design and does NOT hide a region-routing defect** — the 12 labels were produced and tiered (proving the hybrid fused flowed through), they just can't be trainable without a calibration function. The commit's interpretation is sound.

Now let me verify the core data-loss claim at the `mergeTiledDimensions` level — does the union ever drop a full-page floor dim? And confirm the merge tile topology lets the full-page tile participate without spuriously collapsing distinct dims.

### Assistant | 2026-06-23T01:24:00.201Z

[tool_use: Bash]

### User | 2026-06-23T01:24:06.584Z

[tool_result] 4: * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
9: * each page into overlapping quadrants raises the effective DPI per region without a bigger model.
15: * RECALL-FIRST: a dim that lands in the overlap seam appears in multiple OVERLAPPING tiles and collapses
16: * to ONE; two distinct same-valued features in NON-overlapping tiles are kept S
... [+3272 chars truncated]

### Assistant | 2026-06-23T01:24:12.711Z

The merge contract is sound: an instance with no tileId or a tile not in the grid "connects only to itself => never silently dropped" (line 196), and the full-page floor dims always participate via `perTile.push({tileId: FULL_PAGE_TILE_ID, ...})`. The greedy clique partition keeps the representative as the highest-confidence instance in each clique. Critically, I need to verify one subtle data-loss vector: when a full-page floor dim and a region dim DON'T match (different value/type), are they kept as SEPARATE groups, and is the full-page one ALWAYS retained? Let me read the grouping/representative selection in full and check the matcher.

### Assistant | 2026-06-23T01:24:14.041Z

[tool_use: Bash]

### User | 2026-06-23T01:24:19.205Z

[tool_result] export function mergeTiledDimensions(perTile, opts = {}) {
  const valueTolMm = isPosFinite(opts.valueTolMm) ? opts.valueTolMm : DEFAULT_MERGE_VALUE_TOL_MM;
  const tileMap = new Map();
  if (Array.isArray(opts.tiles)) for (const t of opts.tiles) if (t && t.id != null) tileMap.set(String(t.id), t);

  // Flatten to instances {dim, tileId}. Tolerate a missing tileId (legacy single-page result -> pa
... [+3898 chars truncated]

### Assistant | 2026-06-23T01:24:27.805Z

The data-loss safety is rigorously established. The merge: groups by `dimKey` (value+type within tolerance), then within a key bucket only collapses instances whose tiles PAIRWISE overlap (clique). The full-page tile `[0,0,pageW,pageH]` overlaps every region tile, so a full-page floor dim corroborated by a region dim collapses to ONE (no double-count); a full-page floor dim NOT recovered by any region forms its own group and is emitted. Worst case is under-merge (SAFE direction). **The full-page floor dims are never dropped** — confirming the design claim that region routing only ADDS recall.

Now let me close the units question definitively. I need to verify there is NO path where a region crop is OCR'd with no unit forcing. The region force is `opts.forceUnits || opts.assumeUnits || undefined` (region-classify.mjs:162), and the cron passes `assumeUnits: "in"` (line 366). Let me confirm `runEnsembleOverImage` actually applies `forceUnits` to each region call and that `assumeUnits:"in"` is never empty in this wire.

### Assistant | 2026-06-23T01:24:29.759Z

[tool_use: Bash]

### User | 2026-06-23T01:24:33.539Z

[tool_result] 372: *   partClass?:string, wireEdm?:boolean, assumeUnits?:string,
399:  const parsed = parseVisionResponse(raw, { assumeUnits: a.assumeUnits, forceUnits: a.forceUnits });
411: *   png:string, models:string[], partClass?:string, wireEdm?:boolean, assumeUnits?:string,
412: *   forceUnits?:string, ollamaUrl?:string, maxTimeSec?:number, workDir?:string,
421:export async function runEnsembleOverImage(
... [+112 chars truncated]

### Assistant | 2026-06-23T01:24:43.924Z

Let me trace the exact units flow in the region path one more time and verify the `regionEnsembleCommon` actually carries `forceUnits` and that `ensembleCommon` (used for the floor) carries `assumeUnits`. I have the key lines. Let me reason through the units paths precisely:

In the cron region branch (blueprint-ocr-training-loop.mjs:364-366):
- `rrEnsembleOpts = { ollamaUrl, maxTimeSec, format }` plus `forceUnits` only if `opts.forceUnits` is set.
- Calls `extractWithRegionRouting({ pngPath, models, assumeUnits: "in", forceUnits: opts.forceUnits || undefined, ensembleOpts: rrEnsembleOpts })`.

Inside `extractWithRegionRouting`:
- `ensembleCommon = { models, partClass, wireEdm, assumeUnits: "in", ...ensembleOpts }` — so floor gets `assumeUnits:"in"` (region-classify.mjs:139).
- `regionForceUnits = opts.forceUnits || opts.assumeUnits || undefined` → since `assumeUnits:"in"` is always passed by the cron, `regionForceUnits = "in"` even when `--force-units` is not given (region-classify.mjs:162).
- `regionEnsembleCommon = { ...ensembleCommon, forceUnits: "in" }` (region-classify.mjs:163).

So **every region crop is OCR'd with `forceUnits:"in"`** in the cron wire, regardless of `--force-units`. There is no path where a region crop is OCR'd with no unit forcing. Let me confirm the one edge: what if `assumeUnits` were ever falsy. The cron hardcodes `assumeUnits:"in"` (line 366), so this is closed. Let me also double check `node --check` passes and there's no ASCII violation in the diff.

### Assistant | 2026-06-23T01:24:46.055Z

[tool_use: Bash]

### User | 2026-06-23T01:24:50.917Z

[tool_result] SYNTAX_OK
=== non-ASCII in changed regions (lines 37,107-115,352-401) ===
grep: -P supports only unibyte and UTF-8 locales
ASCII_CLEAN (added lines)

### Assistant | 2026-06-23T01:24:54.766Z

The `LC_ALL=C` broke the `-P` flag. Let me rerun the ASCII check correctly on the actual added lines (the diff's `+` lines), excluding pre-existing surrounding context which already legitimately contains non-ASCII (the file uses `—`, `→`, `⚠` in older comments/log lines).

### Assistant | 2026-06-23T01:24:56.162Z

[tool_use: Bash]

### User | 2026-06-23T01:25:01.538Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ADDED_LINES_ASCII_CLEAN

### Assistant | 2026-06-23T01:25:06.880Z

The `grep -P` warning fires but exits non-zero (no matches), so the `||` branch reports clean. Let me do one definitive ASCII check with python to be certain, and confirm the off-path byte-identity (when `--region-route` is off, the per-page loop is unchanged except the `fused` variable rename, which is behavior-neutral).

### Assistant | 2026-06-23T01:25:09.188Z

[tool_use: Bash]

### User | 2026-06-23T01:25:13.453Z

[tool_result] ADDED_LINES_STRICT_ASCII_CLEAN

### Assistant | 2026-06-23T01:25:43.166Z

All added lines are strict ASCII. I have now verified every dimension of the review. Let me do a final reasoning pass on the off-path byte-identity and the `models` resolution edge to make sure the region branch uses the same `models` array as the floor.

The off-path (`--region-route` off): the only change is `const res = ...; fused = res.fused;` then `buildTrainsetRow(..., fused, ...)` instead of `buildTrainsetRow(..., res.fused, ...)`. Same value, same `res.models_ok === 0 continue`, same printUnit anchoring, same `res.fused.summary` → `fused.summary` in the AL queue. **Behaviorally byte-identical when off** — confirmed.

One last verification: the region branch passes `models` (resolved at top of main via `resolveModels`) into `extractWithRegionRouting`, and that same `models` array reaches both the floor and the region crops via `ensembleCommon`/`regionEnsembleCommon`. Confirmed at region-classify.mjs:122,139,163. The `n_models` corroboration depth is therefore consistent.

I have everything needed. Here is my verdict.

---

VERDICT: PASS

summary: The wire is correct, data-loss-safe, and units-safe. `--region-route` is opt-in default-off and leaves the running cron behaviorally byte-identical when off (the only off-path change is a `res.fused`→`fused` alias). The hybrid `fused` genuinely UNIONs the always-run full-page floor with the region passes (verified through `mergeRegionResults` → `mergeTiledDimensions`), so region routing can only ADD dim recall, never regress it. Every region crop is OCR'd with unit forcing in this wire, and the "0 trainable" validation claim is a sound `--calibrate-count 0` artifact, not a hidden defect.

findings: none

What I verified (so the PASS is auditable):

- DATA-LOSS / recall regression — NOT possible in this wire. The region branch calls `extractWithRegionRouting`, whose floor (`runEnsemble({png, assumeUnits:"in", ...})`) ALWAYS runs (`region-classify.mjs:139-142`). The hybrid fused is `buildRegionRoutedFused(merged.dimens
... [+3310 chars truncated]
