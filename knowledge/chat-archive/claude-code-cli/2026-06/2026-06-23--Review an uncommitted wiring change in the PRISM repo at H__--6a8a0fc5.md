---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review an uncommitted wiring change in the PRISM repo at H:\\prism. Grade PASS or"
date: "2026-06-23"
first_ts: "2026-06-23T00:09:48.087Z"
last_ts: "2026-06-23T00:11:05.990Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4e6ca0e77cb5205.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review an uncommitted wiring change in the PRISM repo at H:\prism. Grade PASS or

> **claude-code-cli** | 2026-06-23 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4e6ca0e77cb5205.jsonl`

## Transcript

### User | 2026-06-23T00:09:48.087Z

Review an uncommitted wiring change in the PRISM repo at H:\prism. Grade PASS or FAIL with file:line. Run `git -C H:/prism diff -- scripts/validate-perfect-parts.mjs` to see the diff, and read the surrounding context in scripts/validate-perfect-parts.mjs (the --tile branch it mirrors, ~lines 200-225) + the function it calls (extractWithRegionRouting in scripts/region-classify.mjs).

CONTEXT: P1.5 step 3 (slot:xray) -- wiring an opt-in `--region-route` measurement path into validate-perfect-parts.mjs (the perfect-parts recall harness), PARALLEL to the existing `--tile` path. The change is 3 parts: (1) import extractWithRegionRouting; (2) parseArgs adds `regionRoute: has("--region-route")` + `regionMinConf`; (3) a new `else if (opts.regionRoute)` branch in the per-page loop that calls extractWithRegionRouting and feeds pageDims/pageOk/pageModelsOk to the scorer, mirroring the --tile branch. RUNTIME-VERIFIED: a live run scored part 05850 end-to-end (recall=0.4286, 42 dims, 3/3 pages) -- no crash, the branch threads correctly.

VERIFY:
1. Does the region-route branch correctly mirror the --tile branch's contract -- pageDims (finite >0 value_mm), pageOk, pageModelsOk -- so the scorer receives the same shape? Any field-access bug on the extractWithRegionRouting return (rr.dimensions / rr.fullPage.ok / rr.regionsOcrOk)?
2. Branch ordering: if BOTH --tile and --region-route are passed, --tile wins (is that the actual behavior + is it acceptable/documented)?
3. Does it preserve the existing --tile and default paths byte-for-byte (no regression to the proven paths)?
4. Units: regions lose the title block -> the branch passes assumeUnits:"in" (forces inch onto regions like --tile). Correct for JM inch convention?
5. Any resource/loop issue, convention deviation, or inlined constant?

First line: 'VERDICT: PASS' or 'VERDICT: FAIL'. Then P0/P1/P2 with file:line.

### Assistant | 2026-06-23T00:09:52.981Z

I'll review this wiring change. Let me start by examining the diff and the relevant files.

### Assistant | 2026-06-23T00:09:53.460Z

[tool_use: Bash]

### User | 2026-06-23T00:09:56.939Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 47899789bb..bc4dbcac5a 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -27,6 +27,7 @@ import { argv, exit, env } from "node:process";
 import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
 import { resolvePageTitleBlockUnit, pageForceUnit } from "
... [+2571 chars truncated]

### Assistant | 2026-06-23T00:09:59.985Z

Now let me read the surrounding context in validate-perfect-parts.mjs and the region-classify.mjs function it calls.

### Assistant | 2026-06-23T00:10:01.374Z

[tool_use: Read]

### Assistant | 2026-06-23T00:10:01.380Z

[tool_use: Read]

### User | 2026-06-23T00:10:03.520Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+12697 chars truncated]

### User | 2026-06-23T00:10:03.574Z

[tool_result] 180	          // scoring OCR against it conflates a metric artifact with a real miss -- skip it (BEFORE the
181	          // expensive OCR -- saves GPU too), recording the classification for transparency/audit, exactly
182	          // like program-not-nc / program-non-lathe. Knob: --gt-contour-tol (lathe only).
183	          else if (!gt.gtReliable) {
184	            rec.skip = gt.gtClass === "mi
... [+7069 chars truncated]

### Assistant | 2026-06-23T00:10:15.997Z

Now I have the full picture of both the wiring change and the called function. Let me verify each of the 5 points against the actual code.

**Point 1 — Return contract field access.** The branch reads `rr.dimensions`, `rr.fullPage.ok`, and `rr.regionsOcrOk`. Confirming against the `extractWithRegionRouting` return shapes:
- full_page return (region-classify.mjs:137-141): `dimensions`, `fullPage: { dimensions, ok }`, `regionsOcrOk: 0`. ✓
- region_route return (region-classify.mjs:175-180): `dimensions: merged.dimensions`, `fullPage: { dimensions, ok }`, `regionsOcrOk`. ✓

Both return paths always carry `dimensions` (array), `fullPage.ok` (boolean), and `regionsOcrOk` (number). No undefined-access risk. The `(rr.dimensions || [])` guard at validate-perfect-parts.mjs:228 is defensive but the field is always present. `pageDims` filters to finite >0 `value_mm` exactly like the `--tile` branch (line 217) and default branch (line 232). ✓

**Point 2 — Branch ordering.** Lines 208/218/229: `if (opts.tile) ... else if (opts.regionRoute) ... else`. If both passed, `--tile` wins. This is documented at validate-perfect-parts.mjs:108-110 ("if BOTH are passed --tile wins"). Acceptable and explicit. ✓

**Point 3 — Byte-for-byte preservation of existing paths.** The diff inserts only: one import (line 30), two parseArgs fields (lines 111-112 of diff context), and one `else if` branch. The `if (opts.tile)` block (208-217) and `else` default block (229-234) are untouched. ✓

**Point 4 — Units.** The branch passes `assumeUnits: "in"`, mirroring `--tile` (line 212). Inside `extractWithRegionRouting`, `assumeUnits` is the full-page floor fallback (keeps title block, line 129-130), and `regionForceUnits = opts.forceUnits || opts.assumeUnits` forces inch onto the region crops that strip the title block (line 149). Correct for JM inch convention and matches `--tile` semantics. ✓

Let me verify one subtle point about the `pageModelsOk`/`models_ok` semantics and check the scorer field expecta
... [+114 chars truncated]

### Assistant | 2026-06-23T00:10:17.461Z

[tool_use: Read]

### User | 2026-06-23T00:10:18.639Z

[tool_result] 95	    parts: get("--parts", DEFAULT_PARTS),
96	    outDir: get("--out-dir", DEFAULT_OUT),
97	    axis: String(get("--axis", "all")).toLowerCase(), // all | mill | lathe -- skip (no OCR) off-axis parts
98	    limit: num("--limit", 0),
99	    models: get("--models", null),
100	    relTol: num("--rel-tol", 0.02),
101	    neutralStepOnly: has("--neutral-step-only"),
102	    fresh: has("--fresh"),
103
... [+866 chars truncated]

### Assistant | 2026-06-23T00:10:18.860Z

[tool_use: Bash]

### User | 2026-06-23T00:10:22.860Z

[tool_result] scripts/vision-tiling-extract.mjs:80: *   fail (models_ok=0) and tilesOcrOk=0. The CLI injects a default model; a programmatic caller must pass one.
scripts/vision-tiling-extract.mjs:83: *            baseline:(object|null), lift:(object|null), tilesOcrOk:number, tilesOcrFailed:number}>}
scripts/vision-tiling-extract.mjs:109:  let tilesOcrOk = 0;
scripts/vision-tiling-extract.mjs:117:    // (models
... [+1291 chars truncated]

### Assistant | 2026-06-23T00:10:33.400Z

I've now verified the semantics. Let me confirm the `pageModelsOk` semantics align. In the `--tile` branch, `pageModelsOk = t.tilesOcrOk` (number of OCR-ok tiles). In the region branch, `pageModelsOk = Math.max(rr.regionsOcrOk, rr.fullPage.ok ? 1 : 0)`. This is used only for `modelsOkMax` reporting (line 237, `models_ok` field, context-only). The region branch correctly accounts for the floor contributing even when zero regions are OCR'd (full-page-only route), which the `--tile` branch's `tilesOcrOk` would set to 0. This is a reasonable enhancement, not a contract break — `models_ok` is reporting context, not a scoring denominator (line 250 confirms it's reported, line 244 scoring uses only `ocrDimsMm`).

One subtle point to verify: in the region branch, `pageOk = rr.fullPage.ok || rr.regionsOcrOk > 0`. This means a page is "ok" if the full-page floor succeeded even with zero regions — which is the correct recall-first semantics. The `--tile` branch sets `pageOk = t.tilesOcrOk > 0`, which can be `false` even if the baseline succeeded (tiling discards the baseline's pageOk signal). The region branch is actually *more* correct here, and since `pageDims` always pulls from the merged union (which includes the full-page floor dims), there's no risk of `pageOk=true` but empty `pageDims` causing a problem — empty dims just contribute nothing to `allDimsMm`.

Let me do a final check: confirm there's no unused-import or no second consumer that the `--region-route` wiring should reach (R15 wiring completeness), and verify the test file referenced exists.

### Assistant | 2026-06-23T00:10:34.970Z

[tool_use: Bash]

### User | 2026-06-23T00:10:38.931Z

[tool_result] scripts/region-classify.test.mjs
---grep region-route usage---
30:import { extractWithRegionRouting } from "./region-classify.mjs";
110:    // --region-route: P1.5 layout-aware region routing (segment -> route -> crop -> OCR each -> UNION
113:    regionRoute: has("--region-route"),
218:                } else if (opts.regionRoute) {
222:                  const rr = await extractWithRegionRouting({

### Assistant | 2026-06-23T00:11:05.990Z

All references are consistent and complete. The import is used (line 222), the flag is parsed (line 113), the branch consumes it (line 218), and `region-classify.mjs` carries its own test file. This is an opt-in measurement path in a harness script (not a dispatcher/engine), so no dispatcher wiring is in scope; the wiring target here is the harness's per-page loop, which is correctly reached.

Let me verify the `regionMinConf` default semantics one more time, since the comment says "default lib 0.7" and the parseArgs passes `undefined` when the flag is absent.

The parseArgs at line 114: `regionMinConf: has("--region-min-conf") ? num("--region-min-conf", 0.7) : undefined`. When the flag is absent, this is `undefined`, passed as `minConfidence: opts.regionMinConf` (line 224) → `extractWithRegionRouting` passes it to `decideRegionRouting({ minConfidence: opts.minConfidence, ... })` (region-classify.mjs:126). The library's `decideRegionRouting` applies its own default (0.7) when `minConfidence` is undefined. The comment "default lib 0.7" correctly describes this delegation — the harness does NOT hardcode the 0.7 floor, it defers to the lib. The `0.7` in `num("--region-min-conf", 0.7)` is only the parse-default used when the flag IS present but value-less, which is a defensive fallback, not an inlined physics constant (it's a confidence threshold, not a Kienzle/Taylor/material constant). No safety-invariant violation.

I have everything needed to render the verdict.

---

VERDICT: PASS

summary: The `--region-route` wiring correctly mirrors the proven `--tile` branch's contract — every field accessed on the `extractWithRegionRouting` return (`rr.dimensions`, `rr.fullPage.ok`, `rr.regionsOcrOk`) is present on BOTH return paths (full_page at region-classify.mjs:137-141 and region_route at region-classify.mjs:175-180), so the scorer always receives the same `pageDims`/`pageOk`/`pageModelsOk` shape with no undefined-access risk. The existing `--tile` and default paths are p
... [+3301 chars truncated]
