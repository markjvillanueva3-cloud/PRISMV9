---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Holistic review (arm A, PRISM 3-of-3 gate) of commit e7fd24791b on cad-fusion-li"
date: "2026-06-23"
first_ts: "2026-06-23T08:53:42.978Z"
last_ts: "2026-06-23T08:56:26.485Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a65540aa9caa1dddf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Holistic review (arm A, PRISM 3-of-3 gate) of commit e7fd24791b on cad-fusion-li

> **claude-code-cli** | 2026-06-23 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a65540aa9caa1dddf.jsonl`

## Transcript

### User | 2026-06-23T08:53:42.978Z

Holistic review (arm A, PRISM 3-of-3 gate) of commit e7fd24791b on cad-fusion-live-ms0.

Diff: `git -C H:/prism show e7fd24791b`

UNIT U-XRAY-P15-REGION-NONDIM-RESCUE: recovers GD&T/notes/profiles/surface_finishes on the region-route dense-rescue path (when the full-page floor fails on a dense page, region routing previously recovered dims only). New pure `mergeRegionFused` (region-glue-lib.mjs) unions per-region fused non-dim with the floor's, de-duped by the exported `NON_DIM_KEY_FNS` (same identity as the ensemble fuse); `buildRegionRoutedFused` gains `opts.regionFused` (byte-identical when absent); `region-classify.mjs` captures per-region fused + passes it. Recall-first (floor wins ties, never drops a read label, no cross-region re-corroboration).

Grade PASS/FAIL + P0/P1/P2 + file:line. Focus: correctness of the dense-rescue recovery, strictly additive/back-compat (opts.regionFused absent = unchanged), no import cycle, R12 honesty (does not re-corroborate; comment says so). Context: 30/30 + 17/17 + 43/43 tests green; a regression (dropped string-note) was caught during dev + fixed recall-first. Do not run tests. End with PASS or FAIL.

### Assistant | 2026-06-23T08:53:48.577Z

I'll review commit e7fd24791b on the cad-fusion-live-ms0 branch. Let me start by examining the diff.

### Assistant | 2026-06-23T08:53:49.019Z

[tool_use: Bash]

### User | 2026-06-23T08:53:52.118Z

[tool_result] commit e7fd24791bca2052af746acff25f6ed27bd44534
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:53:07 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (region-route fused was dims-only)
    
    The documented honest limit from the P1.5 region-routing arc: when a den
... [+2463 chars truncated]

### Assistant | 2026-06-23T08:53:54.695Z

Let me see the full diff and then read each changed file end to end.

### Assistant | 2026-06-23T08:53:56.350Z

[tool_use: Bash]

### User | 2026-06-23T08:54:00.062Z

[tool_result] commit e7fd24791bca2052af746acff25f6ed27bd44534
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:53:07 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (region-route fused was dims-only)
    
    The documented honest limit from the P1.5 region-routing arc: when a den
... [+10915 chars truncated]

### Assistant | 2026-06-23T08:54:02.694Z

Now let me read each changed file end to end to understand the full contracts. Let me read all three source files plus the test file.

### Assistant | 2026-06-23T08:54:03.115Z

[tool_use: Read]

### Assistant | 2026-06-23T08:54:03.485Z

[tool_use: Read]

### User | 2026-06-23T08:54:04.172Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-ensemble-fuse.mjs' was already read 4m ago in this session and is unchanged (mtime 1782204169983). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T08:54:04.219Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+15705 chars truncated]

### Assistant | 2026-06-23T08:54:07.473Z

The vision-ensemble-fuse.mjs read was guarded. Let me read it explicitly with the key functions, and also read the test file and the region-classify.mjs file.

### Assistant | 2026-06-23T08:54:08.414Z

[tool_use: Read]

### Assistant | 2026-06-23T08:54:08.609Z

[tool_use: Read]

### User | 2026-06-23T08:54:09.400Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.mjs' was already read 5m ago in this session and is unchanged (mtime 1782204290273). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T08:54:09.611Z

[tool_result] 150	  for (const c of cands) {
151	    let best = null, bestDelta = Infinity;
152	    for (const cl of clusters) {
153	      if (cl.members.some((m) => m.model === c.model)) continue;          // one vote per model
154	      if (typeAware && !typesCompatible(c.type, cl.resolvedType)) continue; // type gate
155	      if (!dimMatches(c.mm, cl.anchorMm, opts)) continue;                  // value gate
... [+7027 chars truncated]

### Assistant | 2026-06-23T08:54:13.382Z

The read-once guard claims I read region-classify.mjs and vision-ensemble-fuse.mjs in this session, but this is a fresh session for me. Let me bypass the cache to read region-classify.mjs end to end, since I need to verify the consumer wiring fully.

### Assistant | 2026-06-23T08:54:13.919Z

[tool_use: Read]

### User | 2026-06-23T08:54:14.905Z

[tool_result] 150	  if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath) throw new Error("extractWithRegionRouting: pngPath required");
151	  const readImageSize = deps.readImageSize || readPngSize;
152	  const segment = deps.segment || runRegionSegment;
153	  const cropRegions = deps.cropRegions || cropTilesPy;
154	  const runEnsemble = deps.runEnsemble || runEnsembleOverImage;
155	  const models = 
... [+6938 chars truncated]

### Assistant | 2026-06-23T08:54:18.426Z

I now have the full region_route path. Let me verify the `fused` shape that `res.fused` carries from `runEnsemble` (the per-region fused) to confirm the per-region fused actually contains `gdt`/`notes`/`profiles`/`surface_finishes` arrays. Let me also confirm `fuseEnsemble` returns those fields at the top level of `fused`.

### Assistant | 2026-06-23T08:54:19.001Z

[tool_use: Read]

### User | 2026-06-23T08:54:19.998Z

[tool_result] 276	/**
277	 * Pure: fuse N model extractions into a corroborated consensus dimension set PLUS recall-first
278	 * unions of the non-dimension fields (gdt / notes / profiles / surface_finishes).
279	 *
280	 * @param {Array<{model:string, extraction:object}>} modelExtractions  successful per-model OCR
281	 *        (extraction.dimensions is the per-model dim list -- the parseVisionResponse shape).

... [+4637 chars truncated]

### Assistant | 2026-06-23T08:54:22.631Z

[tool_use: Read]

### User | 2026-06-23T08:54:23.599Z

[tool_result] 366	          models_a: a.models, models_b: b.models,
367	          note: "same-type values within conflict band: model value-disagreement OR two distinct similar features — operator must disambiguate; never auto-merged.",
368	        });
369	      }
370	    }
371	  }
372	
373	  const corroborated = dimensions.filter((d) => d.corroboration >= 2);
374	  const singletons = dimensions.filter((d) => d
... [+3157 chars truncated]

### Assistant | 2026-06-23T08:54:27.823Z

Confirmed: `fuseEnsemble` returns `{ dimensions, gdt, notes, profiles, surface_finishes, ambiguous_pairs, summary, per_model }` at the top level. So a per-region `fused` object carries `gdt`/`notes`/`profiles`/`surface_finishes` as top-level arrays — exactly the fields `mergeRegionFused` unions over `src[field]`. The contract aligns.

Now let me confirm there's no import cycle between region-glue-lib and vision-ensemble-fuse, and check what vision-ensemble-fuse imports.

### Assistant | 2026-06-23T08:54:30.258Z

[tool_use: Bash]

### User | 2026-06-23T08:54:33.547Z

[tool_result] ---vision-tiling-lib imports---
---grep any import of region-glue in vision-ensemble or vision-tiling---
scripts/lib/vision-ensemble-fuse.mjs:221:// Exported per-field identity keys so a cross-SOURCE union (e.g. region-glue-lib unioning the

### Assistant | 2026-06-23T08:54:37.067Z

No import cycle: `vision-ensemble-fuse.mjs` and `vision-tiling-lib.mjs` do not import `region-glue-lib.mjs` (the only "region-glue" hit is a comment). The dependency is one-directional: region-glue-lib -> vision-ensemble-fuse + vision-tiling-lib. Let me confirm the top imports of vision-ensemble-fuse explicitly and check whether the file has any module-level side effects that would matter.

### Assistant | 2026-06-23T08:54:38.125Z

[tool_use: Read]

### User | 2026-06-23T08:54:39.129Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+1708 chars truncated]

### Assistant | 2026-06-23T08:54:43.370Z

Now let me read the test file to verify test integrity — that the new tests are real reference-value assertions and would fail if the logic broke, including the regression test the commit message mentions.

### Assistant | 2026-06-23T08:54:44.504Z

[tool_use: Bash]

### User | 2026-06-23T08:54:48.604Z

[tool_result] 20:import assert from "node:assert/strict";
28:  mergeRegionFused,
33:test("scaleBboxToPixels: exact reference conversion", () => {
34:  assert.deepEqual(scaleBboxToPixels([0.5, 0.5, 0.25, 0.25], 1000, 800), { x: 500, y: 400, w: 250, h: 200 });
35:  assert.deepEqual(scaleBboxToPixels([0, 0, 1, 1], 1000, 800), { x: 0, y: 0, w: 1000, h: 800 });
38:test("scaleBboxToPixels: clamps a box that would spi
... [+10577 chars truncated]

### Assistant | 2026-06-23T08:55:02.581Z

Let me see the rest of the dense-rescue tests (the end-to-end through region-classify and back-compat assertions).

### Assistant | 2026-06-23T08:55:03.306Z

[tool_use: Read]

### User | 2026-06-23T08:55:04.363Z

[tool_result] 258	// ---------- mergeRegionFused + dense-rescue non-dim recovery (U-XRAY-P15-REGION-NONDIM-RESCUE) ----------
259	
260	const gdtFrame = (symbol, tol, datums = []) => ({ symbol, tolerance_value: tol, datum_references: datums });
261	
262	test("mergeRegionFused: dense-rescue -- floor gdt empty, two regions each contribute a frame -> union has both", () => {
263	  const floor = { gdt: [], notes: []
... [+3864 chars truncated]

### Assistant | 2026-06-23T08:55:08.674Z

I have the full picture now. Let me verify a few edge cases by tracing the logic carefully, and confirm the back-compat claim and the "floor wins tie" semantics against the actual code, plus check the consumer `buildTrainsetRow` to confirm the recovered non-dim fields actually reach a consumer (R15 wiring — no orphan).

Let me check the downstream consumer that reads `fused.gdt`/`fused.notes` to confirm the recovery is not orphaned.

### Assistant | 2026-06-23T08:55:11.321Z

[tool_use: Bash]

### User | 2026-06-23T08:55:15.580Z

[tool_result] scripts/blueprint-ocr-training-loop.mjs:40:import { extractWithRegionRouting } from "./region-classify.mjs";
scripts/blueprint-ocr-training-loop.mjs:371:            const rr = await extractWithRegionRouting({ pngPath: png, models, assumeUnits: "in", forceUnits: opts.forceUnits || undefined, ensembleOpts: rrEnsembleOpts });
scripts/blueprint-ocr-training-loop.mjs:409:          nonDimCoverage.gdt +=
... [+690 chars truncated]

### Assistant | 2026-06-23T08:55:20.062Z

The consumer chain is wired and live: `blueprint-ocr-training-loop.mjs:371` calls `extractWithRegionRouting`, then builds a trainset row whose `gdt_count`/`note_count`/`profile_count`/`surface_finish_count` feed `nonDimCoverage`. Let me confirm `buildTrainsetRow` reads `fused.gdt`/`fused.notes`/etc. (so the recovered fields actually flow through, not orphan).

### Assistant | 2026-06-23T08:55:21.337Z

[tool_use: Bash]

### User | 2026-06-23T08:55:24.682Z

[tool_result] 44:  buildTrainsetRow,
249:      const nm = res.fused.summary.n_models;
251:      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
334:      // temp-PNG cleanup fires even if buildTrainsetRow/classifyActiveLearning throws (the parser has
361:          // union (opt-in --region-route). Downstream (buildTrainsetRow / classifyActiveLearning / queue
374:            fuse
... [+977 chars truncated]

### Assistant | 2026-06-23T08:55:37.857Z

Confirmed at line 374: `fused = rr.fused` (the region-routed hybrid), then line 393 `buildTrainsetRow(..., fused, ...)`, and `gdt_count`/`note_count`/etc. flow into `nonDimCoverage` and the trainset JSONL. So the recovered region GD&T/notes now reach the training corpus — the fix is wired to its real consumer, not orphaned. This was the documented honest limit, and the commit closes it.

Let me do a final trace of the back-compat invariant and the tie/dedup semantics against the actual code to confirm correctness of each claim:

1. **Back-compat (opts.regionFused absent)**: At line 241, `regionNonDim = Array.isArray(opts.regionFused) && opts.regionFused.length ? ... : null`. When absent → `null`. Then line 249 `return regionNonDim ? {...} : base` (failed-floor branch) and line 252 `if (regionNonDim) Object.assign(...)` (normal branch). Both gate on `regionNonDim`, so when absent the output is byte-identical to before. ✓ Verified, and the test at line 319-323 pins it.

2. **Floor wins tie**: Line 172 pushes `fullPageFused` FIRST into `sources`; the loop adds the first-seen key and `seen.has(k) → continue` skips later (region) duplicates. So floor representative wins. ✓ Test 273-279 pins it (raw_text "FLOOR").

3. **Recall-first / never drop a read label**: un-keyable object → `merged.push(item)` (line 189); primitives deduped by value (line 187); null skipped (line 182). ✓ Tests 304-307 (primitive) and 298-302 (malformed).

4. **No re-corroboration**: `mergeRegionFused` copies `item` references verbatim — it never recomputes `corroboration`/`n_models`. Each entry keeps what it earned in its own region's `fuseEnsemble`. ✓ Comment at 161-163 matches the code; this is honest (R12).

Let me verify one subtle correctness point — whether `Object.assign(out, regionNonDim)` could clobber a populated floor non-dim field with a *smaller* set in a non-failed-floor case (the normal case where the floor succeeded), which would be a recall regression.

### Assistant | 2026-06-23T08:55:38.788Z

[tool_use: Read]

### User | 2026-06-23T08:55:39.818Z

[tool_result] 150	
151	// ---------- buildRegionRoutedFused (the step-3b unblock: hybrid fused, no dropped labels) ----------
152	
153	test("buildRegionRoutedFused: keeps the full-page non-dimension schema, swaps in the region dims", () => {
154	  const fullPageFused = {
155	    dimensions: [linear(25.4, "1.000")],            // the full-page's (worse/fewer) dims -- to be replaced
156	    gdt: [{ symbol: "posit
... [+430 chars truncated]

### Assistant | 2026-06-23T08:55:49.788Z

This test (153) is the back-compat case (no `regionFused`), so `Object.assign` doesn't run. Let me reason about the clobber concern directly.

When `regionFused` IS supplied (the new path), `mergeRegionFused(fullPageFused, opts.regionFused)` includes `fullPageFused` as the FIRST source. So the merged `gdt` = floor's gdt UNION every region's gdt. It is a strict superset of the floor's gdt (recall-first). `Object.assign(out, regionNonDim)` then overwrites `out.gdt` (which is the floor's gdt, copied via `{...fullPageFused}`) with the merged superset. Since the merged set already contains every floor entry (floor is the first source, never dropped), this is never a recall regression — it can only ADD. ✓ Correct.

One more nuance: `mergeRegionFused` only unions the 4 default fields. Other rich fields on the floor's fused (`ambiguous_pairs`, `part_bounds`, `per_model`, `summary`) are preserved via `{...fullPageFused}` and not touched by the `Object.assign` (which only carries the 4 keys). ✓ No loss of other schema.

Now let me verify there is no behavioral issue with the per-region `fused` being `null` filtered out at the call site. At region-classify.mjs:236, `regionFused: perRegion.map((p) => p.fused).filter(Boolean)`. So nulls are filtered before reaching `mergeRegionFused`. And `mergeRegionFused` itself also guards `if (f && typeof f === "object")` (line 173). Double-safe. ✓

Let me confirm the `region-classify.test.mjs` covers the new `fused` capture path (17/17 claim) and the perRegion now carries `fused`.

### Assistant | 2026-06-23T08:55:50.897Z

[tool_use: Bash]

### User | 2026-06-23T08:55:54.313Z

[tool_result] 21:const ens = (dims) => ({ fused: { dimensions: dims }, models_ok: 2, error: null });
123:  deps.runEnsemble = () => ({ fused: { dimensions: [] }, models_ok: 0, error: null }); // empty-response trap
139:test("region_route -> .fused is the HYBRID (region dims + full-page non-dimension labels) -- unblocks the cron", async () => {
144:  // the full-page floor also carries non-dimension labels (gdt/
... [+1529 chars truncated]

### Assistant | 2026-06-23T08:56:26.485Z

The region-classify tests use ensemble fakes that set `r.fused.gdt`/`r.fused.notes`, and assert the hybrid fused preserves them. The new line at region-classify.mjs:213 captures `fused: res && res.fused ? res.fused : null` from the same `res` object the fakes return. The dense-rescue test (170-189) covers the floor-failed-but-regions-succeed path. These are real assertions that would fail if the wiring broke.

I have everything needed. Let me do a final check on whether the dropped comment-line citation change introduced any inaccuracy (the commit says it dropped a "rot-prone stale line citation"). The old comment cited `vision-ensemble-fuse.mjs:291`; the new comment says "Mirrors fuseEnsemble's n_hallucination_candidates count" without a line number. The actual `n_hallucination_candidates` is computed at vision-ensemble-fuse.mjs:397. So removing the stale `:291` citation (which would have been wrong/rotted) is correct and improves honesty — no inaccuracy introduced.

I have completed reading all changed files end to end, the test file, the upstream contract (`fuseEnsemble` return shape + `NON_DIM_KEY_FNS`), the downstream consumer (`blueprint-ocr-training-loop.mjs` → `buildTrainsetRow`), and verified no import cycle. Here is my verdict.

VERDICT: PASS

summary: U-XRAY-P15-REGION-NONDIM-RESCUE correctly closes the documented honest limit where a dense-page region-route recovered dimensions but lost GD&T/notes/profiles/surface_finishes from the failed full-page floor. The new `mergeRegionFused` is a sound recall-first cross-source union de-duped by the SAME `NON_DIM_KEY_FNS` identity the ensemble fuse uses (no fork), it is strictly additive/back-compat (byte-identical when `opts.regionFused` is absent), introduces no import cycle, and is genuinely wired through to its live consumer (the training-loop trainset corpus). The change is honest (R12): it does not re-corroborate across regions and the comment says exactly that.

findings:
  - none (P0/P1/P2 all clear)

Audi
... [+3304 chars truncated]
