---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent second-pass review of an uncommitted wiring change in the PRISM repo"
date: "2026-06-23"
first_ts: "2026-06-23T00:09:57.649Z"
last_ts: "2026-06-23T00:11:52.176Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4a5d8bdaea7a7a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review of an uncommitted wiring change in the PRISM repo

> **claude-code-cli** | 2026-06-23 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4a5d8bdaea7a7a1.jsonl`

## Transcript

### User | 2026-06-23T00:09:57.649Z

Independent second-pass review of an uncommitted wiring change in the PRISM repo at H:\prism (do NOT assume the other reviewer caught everything). Grade PASS or FAIL with file:line. Run `git -C H:/prism diff -- scripts/validate-perfect-parts.mjs`; read the per-page extraction loop it modifies + extractWithRegionRouting in scripts/region-classify.mjs.

CONTEXT: P1.5 step 3 -- opt-in `--region-route` measurement path added to validate-perfect-parts.mjs (the perfect-parts recall harness), parallel to `--tile`. RUNTIME-VERIFIED: live run scored part 05850 (recall=0.4286, 42 dims). This is a production MEASUREMENT script (not the training cron).

Hunt for SILENT BREAKAGE / regression specifically:
1. Did the edit alter the existing default (non-tile, non-region) path or the --tile path in any way (whitespace/logic)? The proven paths must be byte-identical except for the inserted branch.
2. pageOk semantics: the branch sets pageOk = rr.fullPage.ok || rr.regionsOcrOk > 0. Could this mark a page OK when NO dims were actually extracted (inflating pagesOcrd / hiding an ocr-failed)? Compare to the --tile branch (tilesOcrOk>0) and the default (models_ok>0). Is there a case where pageOk=true but pageDims=[] that would skew the recall denominator or the ocr_failed count?
3. The per-print-unit anchoring (printUnit detection) only runs in the default branch -- does the region-route branch correctly NOT need it (regions forced to assumeUnits like --tile)? Any wrong-scale-dim risk?
4. regionMinConf undefined when --region-min-conf absent -> passed as opts.minConfidence:undefined -> does extractWithRegionRouting default it to 0.7 correctly (not NaN/0)?
5. Any exception path in the branch that could abort the whole 91-part run (vs the default's resilience)?

First line: 'VERDICT: PASS' or 'VERDICT: FAIL'. Then P0/P1/P2 with file:line.

### Assistant | 2026-06-23T00:10:01.407Z

I'll investigate this wiring change systematically. Let me start by reading the diff and the relevant source files.

### Assistant | 2026-06-23T00:10:02.345Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:10:02.440Z

[tool_use: Read]

### User | 2026-06-23T00:10:04.072Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.mjs' was already read 1s ago in this session and is unchanged (mtime 1782171837280). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:10:06.439Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 47899789bb..bc4dbcac5a 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -27,6 +27,7 @@ import { argv, exit, env } from "node:process";
 import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
 import { resolvePageTitleBlockUnit, pageForceUnit } from "
... [+2571 chars truncated]

### Assistant | 2026-06-23T00:10:09.959Z

The read-once-guard says region-classify.mjs is already in context, but I don't actually have it. Let me read it explicitly along with the full validate-perfect-parts.mjs context.

### Assistant | 2026-06-23T00:10:10.357Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:10:11.332Z

[tool_use: Read]

### User | 2026-06-23T00:10:12.482Z

[tool_result] 150	      // 1. resolve the print (Docustrata) + program (JM DIE) on disk
151	      // NOTE: do NOT basename() first — the display filename can contain "/" (e.g. a scan date
152	      // "12/1/2020"), which basename() would split on, mangling the name. findOne sanitizes "/" → "_"
153	      // (the on-disk form) itself; the join stores a bare filename, not a path, so basename is unneeded.
154	     
... [+12538 chars truncated]

### User | 2026-06-23T00:10:14.580Z

[tool_result] #!/usr/bin/env node
// scripts/region-classify.mjs
//
// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
// split (cores: scripts/lib/region-classifier-lib.mjs + 
... [+11892 chars truncated]

### Assistant | 2026-06-23T00:10:18.493Z

I have both files. Now let me trace the specific concerns carefully. Let me verify the exact behavior of each leg by reading the merge/glue lib and checking the `pageDims=[]` + `pageOk=true` scenario closely.

### Assistant | 2026-06-23T00:10:18.962Z

[tool_use: Read]

### User | 2026-06-23T00:10:20.195Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+7709 chars truncated]

### Assistant | 2026-06-23T00:10:20.632Z

[tool_use: Bash]

### User | 2026-06-23T00:10:24.606Z

[tool_result]     else if (a === "--force-units") o.forceUnits = args[++i];
    else if (a === "--baseline") o.baseline = true;
    else if (a === "--json") o.json = true;
    else if (a === "--keep") o.keep = true;
    else if (a === "--out") o.out = args[++i];
  }
  return o;
}

async function main() {
  const o = parseArgs(argv.slice(2));
  if (!o.image || !existsSync(o.image)) { process.stderr.write("ERROR:
... [+2499 chars truncated]

### Assistant | 2026-06-23T00:10:28.534Z

Now I have a clear picture. Let me verify the two critical concerns: (1) whether `pageOk=true` with `pageDims=[]` is possible and whether it differs from the proven branches, and (2) check `decideRegionRouting` to confirm `minConfidence:undefined` defaults to 0.7 correctly.

### Assistant | 2026-06-23T00:10:29.949Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:10:31.129Z

[tool_use: Bash]

### User | 2026-06-23T00:10:33.979Z

[tool_result] 54:export const DEFAULT_REGION_MIN_CONFIDENCE = 0.7;
302: * @param {{minConfidence?:number}} [opts]
306:  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_REGION_MIN_CONFIDENCE;
334: * @param {{minConfidence?:number, minTrustedRegions?:number}} [opts]
337:export function decideRegionRouting(parseResult, opts = {}) {
338:  const floor = Numb
... [+209 chars truncated]

### User | 2026-06-23T00:10:35.683Z

[tool_result] 105:  return { type, mm, confidence, raw_text };
227:    return {
299:  return { dimensions, ambiguous_pairs, summary, per_model };
382:  if (typeof a.imageBase64 !== "string" || !a.imageBase64) return { error: "no imageBase64" };
383:  if (typeof a.model !== "string" || !a.model) return { error: "no model" };
391:  try { writeFile(reqFile, JSON.stringify(body)); } catch (e) { return { error: `wri
... [+2911 chars truncated]

### Assistant | 2026-06-23T00:10:40.809Z

Concern 4 confirmed resolved: `decideRegionRouting` uses `Number.isFinite(opts.minConfidence) ? ... : DEFAULT_REGION_MIN_CONFIDENCE` (0.7), so `undefined` → 0.7 correctly (no NaN/0 risk). And `routeRegion` also gets the clamped `floor`, so the floor is propagated, not the raw undefined.

Now let me verify the critical pageOk concern. The key question: can `pageOk=true` while `pageDims=[]`? Let me trace `ensembleOk` and `dimsOf` precisely. Let me look at the `fused` shape and confirm `models_ok>0` doesn't guarantee dims.

### Assistant | 2026-06-23T00:10:42.224Z

[tool_use: Read]

### User | 2026-06-23T00:10:43.267Z

[tool_result] 436	      imageBase64: b64, model, tag: idx, workDir: a.workDir,
437	      partClass: a.partClass, wireEdm: a.wireEdm, assumeUnits: a.assumeUnits, forceUnits: a.forceUnits,
438	      ollamaUrl: a.ollamaUrl, maxTimeSec: a.maxTimeSec, format: a.format, deps,
439	    });
440	    const ms = now() - t0;
441	    if (ex && ex.error) return { model, ok: false, ms, dim_count: null, error: ex.error, extract
... [+896 chars truncated]

### Assistant | 2026-06-23T00:10:44.035Z

[tool_use: Bash]

### User | 2026-06-23T00:10:47.485Z

[tool_result] 109:// unreliable answer-key for callout-recall (T-11BT: a G3 radius -> 14-27 "diameters" ~ 3-4 real callouts;
112:// GT we KNOW over-counts -- classify reliability + aggregate recall only over stepped parts, exactly like
120: * Pure: classify a posted lathe program's GROUND-TRUTH RELIABILITY for callout-recall by its feed-move
124: * so scoring OCR against those points structurally ceilings recal
... [+1885 chars truncated]

### Assistant | 2026-06-23T00:10:52.474Z

Now I have the complete picture for the critical pageOk analysis. Let me confirm the recall denominator is GT-based (not page-based) by reading the scoring function precisely.

### Assistant | 2026-06-23T00:10:53.544Z

[tool_use: Read]

### User | 2026-06-23T00:10:54.700Z

[tool_result] 308	export function scorePartAgainstProgram(ocrDimsMm, programGT, opts = {}) {
309	  const ocr = (Array.isArray(ocrDimsMm) ? ocrDimsMm : []).filter((d) => Number.isFinite(d) && d > 0);
310	  // callout-class GT (feature diameters + length) — the print-level dims, not toolpath points.
311	  const calloutIn = programGT && Array.isArray(programGT.calloutDimsIn) ? programGT.calloutDimsIn : [];
312	  c
... [+1382 chars truncated]

### Assistant | 2026-06-23T00:11:03.898Z

I now have everything I need to grade. Let me synthesize the analysis on each concern.

**Recall denominator** (line 327): `recall = gtMatched / gtDistinct.length` — purely GT-derived. The page count (`pagesOcrd`) is NOT in the recall denominator. So even if `pageOk=true` with `pageDims=[]`, the recall is unaffected because `pageDims=[]` contributes nothing to `allDimsMm` and the denominator is the program's callout GT. This eliminates the recall-skew concern.

**The pageOk=true / pageDims=[] case** (concern 2): This IS possible in the region branch. `pageOk = rr.fullPage.ok || rr.regionsOcrOk > 0`. `rr.fullPage.ok = ensembleOk(fullRes)` which is true when `models_ok > 0` — i.e., a model RAN and returned a (possibly empty) extraction. But this is **identical semantics** to the default branch (`res.models_ok > 0`) and the `--tile` branch (`t.tilesOcrOk > 0`, where `tilesOcrOk` increments on `ensembleOk`, not on dim count). All three proven branches mark `pageOk=true` on "OCR ran successfully" regardless of dim yield. So the region branch is consistent — not a new divergence.

Let me verify the one subtle divergence: in the default branch, `pageDims` is gated on `pageOk` (line 232: `pageOk ? ... : []`), whereas the region/tile branches compute `pageDims` unconditionally. Let me confirm this doesn't matter.

### Assistant | 2026-06-23T00:11:05.998Z

[tool_use: Bash]

### User | 2026-06-23T00:11:09.738Z

[tool_result] 56d2a4e0d2 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-CLASSIFY (slot:xray): P1.5 step 2b -- LIVE region-routing glue (segment->route->crop->union with full-page floor)
5db3d88b15 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-GLUE-LIB (slot:xray): P1.5 step 2 core -- pure region-glue orchestration (fraction->pixel scale + recall-first full-page union)
0a41c90a4c [MAIN-FORCE] [BLU
... [+235 chars truncated]

### Assistant | 2026-06-23T00:11:20.599Z

The dependencies (`region-classify.mjs`, `region-glue-lib.mjs`, `region-classifier-lib.mjs`) are all committed — only `validate-perfect-parts.mjs` is the diff under review. The dependency `extractWithRegionRouting` is built on a proven foundation (R13 logical order satisfied).

Now let me confirm concern 5 (exception resilience) — whether an exception in the region branch can abort the whole 91-part run. Looking at the diff: the `await extractWithRegionRouting(...)` call is inside the `for (const { png } of pages)` loop, which is inside the big `else` block, which is inside the per-part `try { ... } catch (e) { rec.error = ... }` at lines 158–262. So a throw is caught per-part. Let me also verify `extractWithRegionRouting` itself only throws on the pngPath guard (which is always satisfied here since `png` is a valid string from `rasterAllPages`).

Looking at `extractWithRegionRouting`: the only `throw` is `if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath)`. The segment dep is try/caught internally; the full-page ensemble and region ensembles use `runEnsembleOverImage` which returns `{error}` objects rather than throwing. `cropTilesPy`/`computeLift`/`mergeRegionResults` could theoretically throw, but any such throw is caught by the per-part `catch (e)` at line 262, identical to the default path's resilience. **No new run-abort risk.**

Let me do one final check — confirm the proven default/tile paths are byte-identical except the inserted branch (concern 1), via the diff hunk boundaries.

### Assistant | 2026-06-23T00:11:22.581Z

[tool_use: Bash]

### User | 2026-06-23T00:11:26.298Z

[tool_result]  scripts/validate-perfect-parts.mjs | 17 +++++++++++++++++
 1 file changed, 17 insertions(+)
---full insert-only check: are there any deletions (lines starting with '-' that aren't '---')?---
(empty above = pure additions, no deletions to proven paths)

### Assistant | 2026-06-23T00:11:52.176Z

Confirmed: **17 insertions, 0 deletions**. The proven default and `--tile` paths are byte-identical — the change is purely the import line, two parseArgs fields, and the inserted `else if (opts.regionRoute)` branch. No whitespace or logic touch to the proven paths.

I have completed a full trace. Final verdict.

---

VERDICT: PASS

summary: This is a clean, addition-only wiring change (17 insertions, 0 deletions) — the proven default and `--tile` paths are byte-identical and a deletion check confirms no edits to either. The inserted `else if (opts.regionRoute)` branch is built on a committed, proven foundation (`extractWithRegionRouting`, commits 56d2a4e0d2/5db3d88b15/0a41c90a4c), forces units onto regions like the tile branch, defaults `minConfidence` correctly, and is wrapped by the same per-part try/catch resilience as every other branch. I found no silent-breakage, regression, or run-abort risk; one P2 cosmetic inconsistency is noted below for transparency.

findings:
- [P2] `scripts/validate-perfect-parts.mjs:228` — Minor semantic divergence (NOT a bug): the region branch computes `pageDims` unconditionally from `rr.dimensions`, while the default branch (line 232) gates it behind `pageOk ? ... : []`. This is harmless and actually matches the `--tile` branch (line 217, also unconditional). In the region branch `pageDims` is only consumed at line 238 inside `if (pageOk)`, so an ungated computation when `pageOk=false` is dead-stored and never reaches `allDimsMm`. No fix required; flagged only so the PASS is auditable.

Audit trail (consumers/edge-paths traced, why each is safe):
- **Concern 1 (proven paths untouched):** `git diff --stat` = 17 insertions / 0 deletions; deletion-grep is empty → default + `--tile` are byte-identical.
- **Concern 2 (pageOk inflation / recall skew):** Traced the recall denominator to `scorePartAgainstProgram` (`cnc-program-gt-lib.mjs:327`): `recall = gtMatched / gtDistinct.length` — derived solely from the program's callout GT, NOT fro
... [+2632 chars truncated]
