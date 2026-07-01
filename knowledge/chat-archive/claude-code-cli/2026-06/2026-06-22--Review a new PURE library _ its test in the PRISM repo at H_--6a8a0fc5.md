---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review a new PURE library + its test in the PRISM repo at H:\\prism. Grade PASS o"
date: "2026-06-22"
first_ts: "2026-06-22T23:24:08.413Z"
last_ts: "2026-06-22T23:26:28.282Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-aaa77916e623ae19b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a new PURE library + its test in the PRISM repo at H:\prism. Grade PASS o

> **claude-code-cli** | 2026-06-22 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-aaa77916e623ae19b.jsonl`

## Transcript

### User | 2026-06-22T23:24:08.413Z

Review a new PURE library + its test in the PRISM repo at H:\prism. Grade PASS or FAIL with file:line. Read all three:
- H:\prism\scripts\lib\region-glue-lib.mjs (under review)
- H:\prism\scripts\lib\region-glue-lib.test.mjs (its test, 12/12 pass)
- H:\prism\scripts\lib\vision-tiling-lib.mjs (the mergeTiledDimensions it delegates to -- read mergeTiledDimensions + dimKey + the `connected`/clique logic, ~lines 140-260)

CONTEXT: P1.5 step-2 pure orchestration core for the region-routing glue (BLUEPRINT-VISION-OCR, slot:xray). It prepares inputs for crop-image-tiles.py (integer-pixel {id,x,y,w,h}) and recombines extractions via vision-tiling-lib mergeTiledDimensions. Exports: scaleBboxToPixels, buildRegionCropSpecs, buildMergeTiles, mergeRegionResults, FULL_PAGE_TILE_ID.

THE LOAD-BEARING CONTRACT (verify rigorously): region routing can only ADD recall on top of the proven full-page OCR floor -- NEVER replace it with a box-cropped subset. mergeRegionResults must (a) ALWAYS include the full-page floor pass in the merge so a full-page-only dim is never lost, (b) collapse a dim found by both a region and the full-page pass (no double-count), and (c) NOT over-merge two distinct same-valued features in non-overlapping regions.

HUNT FOR:
1. The merge-input assembly: does buildMergeTiles' whole-page "full_page" overlap tile correctly enable (b) WITHOUT causing the over-merge in (c)? Trace it against vision-tiling-lib's NON-TRANSITIVE greedy-clique `connected` logic. Is there any case where the full_page tile bridges two distinct features into one (a silent recall/precision loss)?
2. scaleBboxToPixels: any off-by-one / clamp bug that admits an out-of-bounds crop or wrongly nulls a valid box? Confirm the sub-pixel (<1px) -> null guard is correct (a 1px crop = silent recall loss).
3. Could mergeRegionResults ever DROP a full-page-floor dim (the data-loss bug)? Trace the perTile assembly + the passthrough-instance handling in mergeTiledDimensions.
4. Purity (only imports the pur
... [+143 chars truncated]

### Assistant | 2026-06-22T23:24:14.368Z

I'll review all three files rigorously, tracing the load-bearing contract.

### Assistant | 2026-06-22T23:24:15.312Z

[tool_use: Read]

### Assistant | 2026-06-22T23:24:15.792Z

[tool_use: Read]

### Assistant | 2026-06-22T23:24:15.848Z

[tool_use: Read]

### User | 2026-06-22T23:24:16.431Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+7709 chars truncated]

### User | 2026-06-22T23:24:16.940Z

[tool_result] 1	/**
2	 * region-glue-lib -- unit tests for the P1.5 step-2 pure orchestration core.
3	 *
4	 * Pins the two correctness-critical seams of region routing:
5	 *   1. scaleBboxToPixels -- fractional bbox -> integer pixel crop (a missed/wrong scaling crops a
6	 *      ~1px box = silent recall loss). Degenerate (<1px) -> null -> caller full-page-floors it.
7	 *   2. mergeRegionResults -- the RECALL-FI
... [+8027 chars truncated]

### User | 2026-06-22T23:24:17.420Z

[tool_result] 1	/**
2	 * vision-tiling-lib.mjs -- P0.2 dense-page region tiling: PURE tile-grid geometry + cross-tile dimension
3	 * merge. No image I/O and no GPU live here. The image-crop + ensemble-OCR step (a follow-up unit)
4	 * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
5	 * results to `mergeTiledDimensions()` to recombine them into one de-duplicat
... [+13466 chars truncated]

### Assistant | 2026-06-22T23:24:22.381Z

Now let me trace the critical contract carefully. The key question in HUNT #1 and #3 hinges on how `connected` treats the `full_page` tile. Let me verify the over-merge scenario in (c) by tracing through the clique logic precisely.

The critical scenario for the over-merge bug: two distinct same-valued features in non-overlapping regions r0 and r1, plus the full_page tile that overlaps both. Let me trace the geometry and the test that claims it stays separate.

### Assistant | 2026-06-22T23:24:23.242Z

[tool_use: Read]

### User | 2026-06-22T23:24:24.331Z

[tool_result] 118	test("mergeRegionResults: two distinct same-valued features in NON-overlapping regions stay SEPARATE", () => {
119	  const pageW = 1000, pageH = 800;
120	  // r0 top-left, r1 bottom-right -- they do NOT overlap each other (only the full_page tile overlaps both)
121	  const routed = [
122	    { id: "r0", bbox: [0, 0, 0.3, 0.3], extractor: "vlm_ocr", region_kind: "drawing_view" },
123	    { id: 
... [+1413 chars truncated]

### Assistant | 2026-06-22T23:24:50.015Z

Let me trace the over-merge test by hand to verify it actually proves what it claims, because the clique-partition order is what determines the outcome.

**Trace of the (c) test** — three instances in the bucket (all key `LINEAR|mm:2540|1.000`), in `perTile` order: r0, r1, full_page. So `instances` = `[{r0}, {r1}, {full_page}]` (indices 0,1,2).

Greedy clique partition over bucket `[0,1,2]`:
- i=0 (r0): no groups → `groups = [[0]]`
- i=1 (r1): test against group `[0]` → `connected(1,0)`? r1 vs r0 tiles. r0=(0,0,300,240), r1=(700,560,300,240). `tilesOverlap`? `0 < 700+300=1000 && 700 < 0+300=300`? `700 < 300` is **false** → not connected. So r1 starts a new group → `groups = [[0],[1]]`
- i=2 (full_page): test against `[0]` → `connected(2,0)` = full_page overlaps r0 → **true**. `grp.every` for group `[0]` is satisfied → joins → `groups = [[0,2],[1]]`

Result: 2 groups → 2 dims. The test passes and correctly demonstrates the clique guard prevents over-merge. The full_page joins r0 (first group it's pairwise-connected to) and r1 survives alone. **(c) holds.**

Now the subtle hunt for HUNT #1: is there an *order-dependent* case where the full_page tile bridges? The clique partition is greedy and order-dependent. Let me verify there's no input ordering where full_page lands such that it could merge r0 and r1 into one group. Since r0 and r1 never overlap, they can never be in the same clique group regardless of where full_page goes — `connected(r0,r1)` is always false, so they can never satisfy `grp.every` together. **The non-overlap of distinct regions is the invariant that holds; full_page can only ever attach to one of them.** Correct.

Let me now check a deeper edge case in HUNT #1 — the `tileAgreement` / representative correctness, and a potential genuine over-merge: what if full_page and a region DO legitimately share a dim, but full_page also separately should corroborate a *different* region's dim? Let me examine whether the test's (b) assertion about `tileAgreemen
... [+31 chars truncated]

### Assistant | 2026-06-22T23:24:51.567Z

[tool_use: Grep]

### Assistant | 2026-06-22T23:24:52.609Z

[tool_use: Grep]

### User | 2026-06-22T23:24:53.164Z

[tool_result] 173: *   `tileAgreement` (how many tile-instances backed it -- a recall/precision signal) and `sourceTiles`.
242:      const sourceTiles = [...new Set(comp.map((ii) => instances[ii].tileId).filter((t) => t != null))].sort();
243:      const tileAgreement = comp.length;
244:      if (tileAgreement > maxTileAgreement) maxTileAgreement = tileAgreement;
245:      merged.push({ ...instances[rep].dim, t
... [+29 chars truncated]

### User | 2026-06-22T23:24:54.316Z

[tool_result] Found 2 files
scripts\lib\region-glue-lib.test.mjs
scripts\lib\region-glue-lib.mjs

### Assistant | 2026-06-22T23:24:58.563Z

Let me check whether the consumer glue script (`region-classify.mjs`) exists, since the contract says these prepare inputs for it — and verify whether `mergeRegionResults` is actually wired/consumed (integration coupling, HUNT #4 scope). The grep shows only the lib + test reference these symbols, meaning the consumer is not yet wired. Let me confirm.

### Assistant | 2026-06-22T23:24:59.041Z

[tool_use: Glob]

### Assistant | 2026-06-22T23:24:59.550Z

[tool_use: Grep]

### User | 2026-06-22T23:25:01.155Z

[tool_result] Found 3 files
scripts\lib\region-glue-lib.mjs
scripts\lib\region-classifier-lib.test.mjs
scripts\lib\region-classifier-lib.mjs

### User | 2026-06-22T23:25:06.889Z

[tool_result] scripts\lib\region-classifier-lib.mjs
scripts\lib\region-classifier-lib.test.mjs

### Assistant | 2026-06-22T23:25:14.496Z

The sibling `region-classifier-lib.mjs` exists. Let me verify the contract shape that `decideRegionRouting` emits — specifically whether the `routed` array's `bbox`, `extractor`, `region_kind`, and `id` field names match what `buildRegionCropSpecs` reads (integration coupling — HUNT #5). A field-name drift here is exactly the silent-break class.

### Assistant | 2026-06-22T23:25:15.893Z

[tool_use: Grep]

### User | 2026-06-22T23:25:17.318Z

[tool_result] 10-// also loses small dims in dense regions (the dense-document recall failure). P1.5
11-\ extends the page classifier to REGION level: segment the page into regions and
12:// ROUTE each region to the right extractor (view->VLM-OCR, table->table-parser,
13-// title-block->field-parser) so no whole page is dropped and dense tables get a real
14-// parser. It is the layout-aware sibling of the fixe
... [+10031 chars truncated]

### Assistant | 2026-06-22T23:25:38.238Z

I now have the full integration contract. The `decideRegionRouting` output `routed` is `regions.map(r => ({...r, ...routeRegion(...)}))`, so each `routed` entry carries `id` (`r0`, `r1`...), `bbox` (clamped fractional or null), `extractor`, `region_kind`, `confidence`, `valid`, `confident`. These field names exactly match what `buildRegionCropSpecs` reads (`r.id`, `r.bbox`, `r.extractor`, `r.region_kind`). The contract aligns.

Now let me verify one important seam in `routeRegion`: a region with a usable bbox but `confident:false` (low confidence) still gets a real extractor (not "skip"). So `buildRegionCropSpecs` will crop it. That matches the recall-first intent — no break.

Let me trace the remaining hunts precisely.

**HUNT #2 — scaleBboxToPixels clamp/off-by-one:**

Line 51-52: origin clamped to `[0, pageW-1]` / `[0, pageH-1]`. Line 53-54: `w = min(w, pageW-x)`, `h = min(h, pageH-y)`. Since `x <= pageW-1`, `pageW-x >= 1`, so the max width is at least 1 — good, never produces a guaranteed-degenerate from clamping. Out-of-bounds: `x+w <= x+(pageW-x) = pageW` — never exceeds page. Correct. The `w<1||h<1 -> null` guard at line 55 correctly catches sub-pixel rounds-to-zero. Test line 42-43 confirms. **No off-by-one admitting OOB crop.**

One subtle case: negative fractional inputs. `fx=-0.5, pageW=1000` → `x=round(-500)=-500` → clamped `max(0,...) = 0`. `fw` negative → `w=round(negative)` → then `min(w, pageW-0)` stays negative → `w<1` → null. Safe.

**HUNT #3 — could mergeRegionResults DROP a full-page-floor dim?**

The full-page floor is always pushed as a perTile entry (line 145-148) keyed `FULL_PAGE_TILE_ID`, with `tiles` including a full_page tile (line 113). Trace a full-page-only dim through `connected`: it's an instance with `tileId=full_page`. In its key bucket, if it's alone → its own group → kept. If it shares a key with a region dim → `connected(fullpage, region)` = full_page overlaps region = true → they collapse to ONE (correct dedup, (b)). The represe
... [+1039 chars truncated]

### Assistant | 2026-06-22T23:25:40.918Z

[tool_use: Bash]

### User | 2026-06-22T23:25:44.543Z

[tool_result] fb3012f003 [MAIN-FORCE] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-TRIBAL (slot:india): wire PlaybookRulesEngine (largest unwired engine, 500+ rules) into prism_knowledge + land orphaned test
0deb392694 [MAIN-FORCE] [ZULU-LEDGER-RECONCILE]/U-ZLR-WIKI-LESSON (slot:zulu): promote meta-systems utilization truth-harness lesson to wiki (bug-finding->wiki gate)
8a16ccbaf3 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]
... [+779 chars truncated]

### Assistant | 2026-06-22T23:25:47.951Z

Test passes 12/12. Let me confirm the ASCII check definitively (the `-P` failed due to locale, so the "PURE ASCII" was a false echo from the `||`). Let me re-verify ASCII purity properly and check the NodeNext `.mjs` import suffix convention.

### Assistant | 2026-06-22T23:25:50.873Z

[tool_use: Bash]

### User | 2026-06-22T23:25:54.758Z

[tool_result] === non-ASCII bytes (both files) ===
scripts/lib/region-glue-lib.mjs:0
scripts/lib/region-glue-lib.test.mjs:0
=== imports ===
24:import { mergeTiledDimensions } from "./vision-tiling-lib.mjs";
=== fs/fetch/child_process/process leak check ===
6:// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no fs/fetch/subprocess); the

### Assistant | 2026-06-22T23:26:28.282Z

All confirmed:
- 0 non-ASCII bytes in both files.
- Only import is the pure sibling `./vision-tiling-lib.mjs` with explicit `.mjs` (NodeNext-correct).
- No fs/fetch/subprocess/process refs (the only match is the comment word).

Now let me do a final rigorous trace on one residual concern for HUNT #1 — the genuine over-merge risk I haven't fully closed: **what if two regions DO overlap each other** (the segmenter can emit overlapping bboxes, e.g. a dimension_table nested inside a drawing_view)? Then `connected(r0,r1)` could be true, and a same-valued dim in both would correctly collapse — that's fine, they share area so it's plausibly one feature. That's the designed recall-first behavior, not a bug.

The one remaining adversarial case worth confirming: the greedy clique partition is **order-dependent**, and `mergeRegionResults` always pushes `full_page` LAST in `perTile` (line 145). Let me verify whether ordering could ever cause a *miss* of dedup (b) — i.e., full_page failing to collapse with a region it overlaps. Trace: three instances same key — r0, r1 (r0 and r1 overlap each other this time), full_page. Bucket `[0,1,2]`. i=0→`[[0]]`. i=1: `connected(1,0)` true → `[[0,1]]`. i=2 (full_page): `grp.every(connected(2, {0,1}))` — full_page overlaps both → true → `[[0,1,2]]` → one dim. Correct collapse. No miss.

What if r0 and r1 do NOT overlap (the (c) case)? Already traced: full_page joins whichever group it tests first that it's pairwise-connected to (group `[0]`), r1 stays separate → 2 dims. The full_page can only ever corroborate ONE of two non-overlapping features — but since the full-page dim is a *duplicate corroboration* (the actual recall floor value is preserved in whichever group it lands), no data is lost; the other distinct feature survives independently. This is exactly contract (c) + (a) satisfied simultaneously.

I have completed all four hunt areas plus the integration-coupling trace. Let me finalize.

VERDICT: PASS

summary: The pure lib correctly e
... [+3567 chars truncated]
