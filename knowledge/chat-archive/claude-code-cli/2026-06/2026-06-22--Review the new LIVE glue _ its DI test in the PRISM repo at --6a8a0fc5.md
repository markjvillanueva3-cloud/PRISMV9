---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review the new LIVE glue + its DI test in the PRISM repo at H:\\prism. Grade PASS"
date: "2026-06-22"
first_ts: "2026-06-22T23:40:32.026Z"
last_ts: "2026-06-22T23:42:57.861Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 17
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-aa1f33bee92a6af59.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review the new LIVE glue + its DI test in the PRISM repo at H:\prism. Grade PASS

> **claude-code-cli** | 2026-06-22 | 46 msgs (17 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-aa1f33bee92a6af59.jsonl`

## Transcript

### User | 2026-06-22T23:40:32.026Z

Review the new LIVE glue + its DI test in the PRISM repo at H:\prism. Grade PASS or FAIL with file:line. Read:
- H:\prism\scripts\region-classify.mjs (under review)
- H:\prism\scripts\region-classify.test.mjs (DI test, 8/8 pass)
- H:\prism\scripts\vision-tiling-extract.mjs (the sibling it mirrors + imports readPngSize/cropTilesPy/computeLift -- compare structure)

CONTEXT: P1.5 step-2b live glue (BLUEPRINT-VISION-OCR, slot:xray). It segments a blueprint page (curl->Ollama), routes via decideRegionRouting (region-classifier-lib), crops via crop-image-tiles.py, OCRs each region + a full-page floor (runEnsembleOverImage), and UNIONs via mergeRegionResults (region-glue-lib). extractWithRegionRouting(opts, deps) is DI-testable; runRegionSegment is the default live segment dep. LIVE SMOKE already passed: real curl->qwen3-vl:8b-instruct returned 4 valid regions in 7.6s -> region_route.

VERIFY THE LOAD-BEARING DATA-LOSS-SAFE CONTRACT:
1. The full-page OCR floor must ALWAYS run regardless of route (the recall guarantee). Confirm it runs BEFORE the route branch and is used in BOTH full_page (as the result) and region_route (as the merge floor).
2. On full_page route: is the result the full-page floor dims (never a box-cropped subset)? Is crop NOT invoked?
3. On region_route: does mergeRegionResults union region+floor (region routing can only ADD recall)? Can any region failure (uncroppable / models_ok=0) cause a full-page dim to be LOST?
4. Fail-soft: segment failure/throw -> full_page (verify the try/catch). runRegionSegment fail-soft on bad image/curl/parse -> "".
5. R12 fail-loud parity with the tiling sibling: ensembleOk treats models_ok=0 as failure (not silent success).
6. Convention: imports reuse the sibling helpers (no reinvention), ASCII, NodeNext .mjs/.js suffixes, isMain CLI guard. Any floating promise that isn't the main().catch() CLI pattern?

First line: 'VERDICT: PASS' or 'VERDICT: FAIL'. Then P0/P1/P2 with file:line.

### Assistant | 2026-06-22T23:40:37.364Z

I'll review the three files to verify the data-loss-safe contract. Let me read them in parallel.

### Assistant | 2026-06-22T23:40:37.840Z

[tool_use: Read]

### Assistant | 2026-06-22T23:40:38.336Z

[tool_use: Read]

### Assistant | 2026-06-22T23:40:38.478Z

[tool_use: Read]

### User | 2026-06-22T23:40:38.941Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+12532 chars truncated]

### User | 2026-06-22T23:40:39.474Z

[tool_result] 1	/**
2	 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
3	 *
4	 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
5	 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
6	 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full
... [+7000 chars truncated]

### User | 2026-06-22T23:40:39.924Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vision-tiling-extract.mjs
3	//
4	// U-XRAY-TILING-EXTRACT -- P0.2 dense-page region tiling, end to end.
5	//
6	// Splits a blueprint page PNG into overlapping tiles (computeTileGrid), OCRs EACH tile with the
7	// multi-VLM ensemble (runEnsembleOverImage), then recombines the per-tile dimension sets into one
8	// de-duplicated set (mergeTiledDimensions). Tiling ra
... [+15029 chars truncated]

### Assistant | 2026-06-22T23:40:44.819Z

Now let me verify the dependencies referenced - the libs that the glue imports. Let me check the merge logic and crop spec builder for the data-loss-safe contract, plus verify the helper signatures actually match.

### Assistant | 2026-06-22T23:40:45.784Z

[tool_use: Read]

### Assistant | 2026-06-22T23:40:45.890Z

[tool_use: Read]

### User | 2026-06-22T23:40:46.455Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\region-glue-lib.mjs' was already read 17m ago in this session and is unchanged (mtime 1782170544189). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:40:46.934Z

[tool_result] 1	// scripts/lib/region-classifier-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 -- layout-aware REGION segmentation + routing (pure core).
4	//
5	// THE PROBLEM this solves (blueprint-reading-improvement-backlog-2026-06-19, P1.5):
6	// the SHIPPED page classifier (scripts/lib/page-classifier-lib.mjs) makes a BINARY
7	// per-page decision -- extract the whole page or skip it. That over-skips: a page
... [+20736 chars truncated]

### Assistant | 2026-06-22T23:40:51.052Z

The read-once guard says I already have region-glue-lib.mjs in context, but I need to verify the `mergeRegionResults` and `buildRegionCropSpecs` signatures match the call sites in region-classify.mjs. Let me grep the specific exports to confirm the contract (not re-read the whole file).

### Assistant | 2026-06-22T23:40:52.188Z

[tool_use: Grep]

### User | 2026-06-22T23:40:53.477Z

[tool_result] 71:export function buildRegionCropSpecs(routed, pageW, pageH) {
72-  if (!Array.isArray(routed)) return [];
73-  const specs = [];
74-  for (const r of routed) {
75-    if (!r || typeof r !== "object") continue;
76-    if (r.extractor === "skip") continue;          // covered by the full-page floor
77-    if (!Array.isArray(r.bbox)) continue;          // no croppable box -> full-page floor
78-    
... [+1911 chars truncated]

### Assistant | 2026-06-22T23:40:58.326Z

The signatures match the call sites exactly. Now let me verify a few load-bearing details: confirm `mergeRegionResults` always pushes the full-page floor (verified above, line 144-148), and check whether there's a potential data-loss issue in the merge's clique-collapse logic. Let me check the `buildMergeTiles` and `scaleBboxToPixels` for the contract that the full-page tile overlaps every region.

### Assistant | 2026-06-22T23:40:59.050Z

[tool_use: Read]

### User | 2026-06-22T23:41:00.182Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+6897 chars truncated]

### Assistant | 2026-06-22T23:41:11.616Z

Now I have the full picture of the glue-lib. Let me verify one critical data-loss concern: the merge's clique-collapse with the full-page tile. The concern (per the contract) is whether a full-page floor dim could ever be *dropped* by `mergeTiledDimensions`. Let me check that merge function's behavior, specifically whether it can lose a dim from a tile.

### Assistant | 2026-06-22T23:41:12.668Z

[tool_use: Grep]

### User | 2026-06-22T23:41:14.037Z

[tool_result] 175:export function mergeTiledDimensions(perTile, opts = {}) {
176-  const valueTolMm = isPosFinite(opts.valueTolMm) ? opts.valueTolMm : DEFAULT_MERGE_VALUE_TOL_MM;
177-  const tileMap = new Map();
178-  if (Array.isArray(opts.tiles)) for (const t of opts.tiles) if (t && t.id != null) tileMap.set(String(t.id), t);
179-
180-  // Flatten to instances {dim, tileId}. Tolerate a missing tileId (legacy 
... [+3390 chars truncated]

### Assistant | 2026-06-22T23:41:17.665Z

I see a problem. Line 220 and 222 contain literal backslashes (`\`) where comment markers (`//`) should be. Let me read those lines carefully to confirm whether this is a syntax error.

### Assistant | 2026-06-22T23:41:18.886Z

[tool_use: Read]

### User | 2026-06-22T23:41:19.859Z

[tool_result] 217	  const merged = [];
218	  let maxTileAgreement = 0;
219	  for (const bucket of byKey.values()) {
220	    // Greedy CLIQUE partition (deliberately NOT union-find / connected-components): an instance joins an
221	    // existing group ONLY if it is directly `connected` to EVERY member already in that group, else it
222	    // starts a new group. This matters because `connected` (tiles overlap) 
... [+1913 chars truncated]

### Assistant | 2026-06-22T23:41:28.355Z

The actual file has correct `//` comments at lines 220/222 — the backslashes in the Grep output were a display artifact (rtk grep filtering), not the real file content. The merge logic is sound: it's a clique partition that never drops an instance (every instance lands in exactly one group, every group emits one merged dim). The full-page floor instances are never lost.

Now let me verify the critical data-loss edge case the test claims: when `models` is empty in region_route, and confirm the `dimsOf`/`runEnsemble` floor-always-runs ordering. Let me also check whether the `vision-tiling-lib.mjs` was a pre-existing file (not part of this diff) by checking git status of the under-review files.

### Assistant | 2026-06-22T23:41:28.687Z

[tool_use: Bash]

### User | 2026-06-22T23:41:32.883Z

[tool_result] ---STATUS---
?? scripts/region-classify.mjs
?? scripts/region-classify.test.mjs

### Assistant | 2026-06-22T23:41:38.081Z

The two files under review (`region-classify.mjs` + `.test.mjs`) are new/untracked — this is the diff. The libs (`region-glue-lib`, `region-classifier-lib`, `vision-tiling-extract`, `vision-tiling-lib`) are pre-existing dependencies (no status change), so they are NOT part of this diff but I traced them to verify the contract holds.

Let me run the DI test to confirm the 8/8 pass claim, then trace one remaining concern: does the test actually exercise the `models_ok` fail-loud parity in the region_route path (not just full_page), and is there a floating promise anywhere.

### Assistant | 2026-06-22T23:41:38.534Z

[tool_use: Bash]

### User | 2026-06-22T23:41:42.013Z

[tool_result]   ...
# Subtest: full-page floor counts as failed when models_ok=0 (R12 fail-loud parity)
ok 6 - full-page floor counts as failed when models_ok=0 (R12 fail-loud parity)
  ---
  duration_ms: 0.0954
  ...
# Subtest: runRegionSegment: fail-soft -> '' on a missing image (no Ollama needed)
ok 7 - runRegionSegment: fail-soft -> '' on a missing image (no Ollama needed)
  ---
  duration_ms: 0.207
  ...
#
... [+225 chars truncated]

### Assistant | 2026-06-22T23:41:45.090Z

8/8 pass confirmed. Now let me verify the libs' tests also exist and pass (the cores this glue depends on), and do a syntax/lint sanity check on the glue itself via node --check.

### Assistant | 2026-06-22T23:41:47.211Z

[tool_use: Bash]

### User | 2026-06-22T23:41:50.374Z

[tool_result] SYNTAX_OK region-classify.mjs
SYNTAX_OK vision-tiling-lib.mjs
---ASCII check (non-ascii bytes in glue+test)---
grep: -P supports only unibyte and UTF-8 locales
ALL_ASCII

### Assistant | 2026-06-22T23:41:53.914Z

The `-P` locale warning prevented the non-ASCII check from running properly. Let me redo the ASCII check with a working approach.

### Assistant | 2026-06-22T23:41:54.950Z

[tool_use: Bash]

### User | 2026-06-22T23:41:58.625Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ALL_ASCII (exit 2)

### Assistant | 2026-06-22T23:42:07.914Z

The grep `-P` is failing on the locale, returning exit 2 (error, not "no match"). Let me use the Grep tool which uses ripgrep instead.

### Assistant | 2026-06-22T23:42:08.826Z

[tool_use: Grep]

### Assistant | 2026-06-22T23:42:09.628Z

[tool_use: Grep]

### User | 2026-06-22T23:42:10.345Z

[tool_result] No matches found

### User | 2026-06-22T23:42:11.045Z

[tool_result] No matches found

### Assistant | 2026-06-22T23:42:26.105Z

Both new files are pure ASCII. Now I have everything I need to grade. Let me do a final verification of the floating-promise concern and the one subtle data-loss path I want to be certain about: in `extractWithRegionRouting`, the `await` on every async dep call, and the workDir cleanup race.

Let me trace the contract points one final time against the code:

**1. Full-page floor ALWAYS runs before the route branch** — Confirmed: `region-classify.mjs:131` `runEnsemble({ png: opts.pngPath, ...ensembleCommon })` runs at line 131, BEFORE the route branch at line 136. Used as the result in full_page (line 139 `dimensions: fullDims`) and as the merge floor in region_route (line 166 `mergeRegionResults(perRegion, fullDims, ...)`).

**2. full_page route returns floor dims, no crop** — Confirmed: line 136-142 returns `dimensions: fullDims` and never calls `cropRegions`. Test at line 81 asserts `calls.crop === 0`.

**3. region_route unions, no region failure loses a full-page dim** — Confirmed: `mergeRegionResults` (region-glue-lib.mjs:144-148) ALWAYS pushes the full-page floor as a perTile entry regardless of region outcomes. Uncroppable region → `regionsOcrFailed++; continue` (line 159) leaving the floor intact. Merge is clique-partition (never drops an instance). Test at lines 87-100 and 111-119 prove it.

**4. Fail-soft** — Confirmed: segment try/catch (lines 121-124) → `segText=""` → parse fail → full_page. `runRegionSegment` returns `""` on every failure (lines 58, 65, 69, 72). Tests 4 and 7.

**5. R12 fail-loud parity** — Confirmed: `ensembleOk` (lines 90-93) treats `models_ok === 0` as failure, byte-matching the sibling's logic at vision-tiling-extract.mjs:119-120. Test 6.

**6. Conventions** — Confirmed: reuses `readPngSize/cropTilesPy/computeLift` (line 40), `runEnsembleOverImage` (line 41), pure-lib helpers (lines 30-38). NodeNext `.mjs/.js` suffixes. `isMain` guard (line 224) with `main().catch()` (line 225). No floating promise — every `await` is awaited; the onl
... [+263 chars truncated]

### Assistant | 2026-06-22T23:42:32.565Z

[tool_use: Bash]

### User | 2026-06-22T23:42:36.365Z

[tool_result] route=region_route dims=1 fullPageOk=false lift.baselineFailed=true kept9.9=true

### Assistant | 2026-06-22T23:42:57.861Z

This confirms the most adversarial edge: when the full-page floor itself FAILS (`models_ok=0`, empty), the region_route path still keeps the region-only dim (`dims=1, kept9.9=true`), correctly flags `fullPage.ok=false` and `lift.baselineFailed=true` (R12 — the lift number is honestly marked as not-valid-evidence). No data loss, no throw, no fabricated lift headline.

I have fully traced the data-loss-safe contract end to end, run the DI suite (8/8), syntax-checked the glue, ASCII-verified both new files, confirmed all imported sibling signatures match call sites, and exercised the failed-floor adversarial edge live.

VERDICT: PASS

summary: The P1.5 step-2b region-routing glue (`scripts/region-classify.mjs`) holds the load-bearing data-loss-safe contract on every traced path: the full-page OCR floor always runs before the route branch and is the result on full_page / the merge floor on region_route; region routing can only ADD recall (verified live, including the adversarial case where the floor itself fails with `models_ok=0` and a region-only dim still survives). Fail-soft (throwing/empty segment -> full_page), R12 fail-loud parity (`ensembleOk` treats `models_ok=0` as failure, byte-matching the tiling sibling), and convention reuse are all correct; the DI suite is genuinely 8/8 and the two new files are pure ASCII with a clean `isMain` + `main().catch()` CLI guard and no floating promises.

findings:
- [PASS-AUDIT] Consumers/edge-paths traced (no P0/P1/P2):
  - **Contract 1 (floor always runs, before route)** — `H:\prism\scripts\region-classify.mjs:131` runs `runEnsemble` on the full page unconditionally, before the route branch at line 136; reused as result (`:139`) and merge floor (`:166`).
  - **Contract 2 (full_page = floor dims, no crop)** — `H:\prism\scripts\region-classify.mjs:136-142` returns `dimensions: fullDims`, never invokes `cropRegions`; asserted by test `:81` (`calls.crop===0`).
  - **Contract 3 (union, no region failure loses a floor dim)** — `H:
... [+1685 chars truncated]
