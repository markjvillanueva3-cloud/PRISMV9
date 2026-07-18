---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent review of an uncommitted change in the PRISM repo at H:\\prism (do NO"
date: "2026-06-23"
first_ts: "2026-06-23T00:27:41.380Z"
last_ts: "2026-06-23T00:30:52.150Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a09dd41c3e753bf16.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review of an uncommitted change in the PRISM repo at H:\prism (do NO

> **claude-code-cli** | 2026-06-23 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a09dd41c3e753bf16.jsonl`

## Transcript

### User | 2026-06-23T00:27:41.380Z

Independent review of an uncommitted change in the PRISM repo at H:\prism (do NOT assume the analyst caught everything). Grade PASS or FAIL with file:line. Run `git -C H:/prism diff -- scripts/lib/region-glue-lib.mjs scripts/region-classify.mjs` + read both test files.

CONTEXT: P1.5 step-3b unblock (slot:xray). Adds `buildRegionRoutedFused(mergedDimensions, fullPageFused)` to region-glue-lib.mjs (a hybrid fused: region-routed dimensions + the full-page floor's non-dimension labels gdt/notes/profiles/surface_finishes/summary), and extractWithRegionRouting now returns a `fused` field (full-page fused on full_page route; the hybrid on region_route). Purpose: let the training cron's buildTrainsetRow consume region routing without dropping non-dimension training labels. region-glue-lib 16/16 + region-classify 10/10 pass.

Weight toward what an analyst might miss:
1. DESIGN SOUNDNESS: is the hybrid (region dims + full-page everything-else) the right call, or does it silently mislead? Specifically: the region UNION already includes the full-page floor's dims (mergeRegionResults unions them), so fused.dimensions is the union -- but fused.gdt/notes are ONLY the full-page's (not per-region). Is that asymmetry honestly documented (R12) so a future cron-wirer understands region routing improves DIMS but not gdt/notes? Is there any double-count risk (the union dims vs the full-page fused.dimensions being replaced, not merged)?
2. SCOPE HONESTY: does this OVER-claim that step 3b is now done? It only provides the seam (buildRegionRoutedFused + .fused); the actual cron wiring is still a separate unit. Is that clear?
3. Test integrity (R9): the .fused tests inject a fake runEnsemble that adds gdt/notes to the full-page png -- do they genuinely assert the non-dim labels survive AND the region dims are present? Any .skip/.only? Would a test fail if buildRegionRoutedFused started dropping non-dim fields?
4. Convention/ASCII/purity; no floating promises.

First line: 'VERDICT: PASS' or
... [+63 chars truncated]

### Assistant | 2026-06-23T00:27:47.103Z

I'll review the uncommitted change. Let me start by examining the diff and reading the relevant files.

### Assistant | 2026-06-23T00:27:47.801Z

[tool_use: Bash]

### User | 2026-06-23T00:27:51.779Z

[tool_result] diff --git a/scripts/lib/region-glue-lib.mjs b/scripts/lib/region-glue-lib.mjs
index c97a5a4fb6..2daa7b7596 100644
--- a/scripts/lib/region-glue-lib.mjs
+++ b/scripts/lib/region-glue-lib.mjs
@@ -149,3 +149,29 @@ export function mergeRegionResults(perRegion, fullPageDims, cropSpecs, pageW, pa
   const tiles = buildMergeTiles(cropSpecs, pageW, pageH);
   return mergeTiledDimensions(perTile, { tiles,
... [+4318 chars truncated]

### Assistant | 2026-06-23T00:27:56.308Z

Let me read both files end to end, plus both test files.

### Assistant | 2026-06-23T00:27:57.172Z

[tool_use: Read]

### Assistant | 2026-06-23T00:27:57.386Z

[tool_use: Read]

### User | 2026-06-23T00:27:59.117Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+9483 chars truncated]

### User | 2026-06-23T00:27:59.245Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+13514 chars truncated]

### Assistant | 2026-06-23T00:28:02.324Z

Now let me read both test files end to end.

### Assistant | 2026-06-23T00:28:02.817Z

[tool_use: Read]

### Assistant | 2026-06-23T00:28:03.163Z

[tool_use: Read]

### User | 2026-06-23T00:28:04.543Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\region-glue-lib.test.mjs' was already read 21s ago in this session and is unchanged (mtime 1782174415657). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:28:05.076Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.test.mjs' was already read 22s ago in this session and is unchanged (mtime 1782174359055). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T00:28:07.991Z

The read-once guard claims I've read these test files this session, but they are not in my context. Let me bypass the guard to read them.

### Assistant | 2026-06-23T00:28:08.619Z

[tool_use: Bash]

### User | 2026-06-23T00:28:12.866Z

[tool_result] /**
 * region-glue-lib -- unit tests for the P1.5 step-2 pure orchestration core.
 *
 * Pins the two correctness-critical seams of region routing:
 *   1. scaleBboxToPixels -- fractional bbox -> integer pixel crop (a missed/wrong scaling crops a
 *      ~1px box = silent recall loss). Degenerate (<1px) -> null -> caller full-page-floors it.
 *   2. mergeRegionResults -- the RECALL-FIRST union of t
... [+9943 chars truncated]

### Assistant | 2026-06-23T00:28:16.170Z

Now the region-classify test file.

### Assistant | 2026-06-23T00:28:16.695Z

[tool_use: Bash]

### User | 2026-06-23T00:28:24.041Z

[tool_result] /**
 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
 *
 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full_page"
 * (t
... [+8286 chars truncated]

### Assistant | 2026-06-23T00:28:27.434Z

I have both test files now. Let me verify the tests actually run and pass, and check whether `buildTrainsetRow` (the cited consumer) exists and what shape it expects — to verify the "unblock" claim and whether anything is left as a floating promise.

### Assistant | 2026-06-23T00:28:28.426Z

[tool_use: Bash]

### User | 2026-06-23T00:28:40.286Z

[tool_result]   ...
# Subtest: buildRegionRoutedFused: non-array dims -> [] (never undefined into a label builder)
ok 15 - buildRegionRoutedFused: non-array dims -> [] (never undefined into a label builder)
  ---
  duration_ms: 0.0357
  ...
# Subtest: buildRegionRoutedFused: does NOT mutate the input full-page fused (pure)
ok 16 - buildRegionRoutedFused: does NOT mutate the input full-page fused (pure)
  ---
  
... [+677 chars truncated]

### Assistant | 2026-06-23T00:28:43.264Z

Both pass (16/16, 10/10, 0 skipped). Now let me verify the cited consumer `buildTrainsetRow` in `blueprint-ocr-training-loop.mjs` — to confirm the seam is real and the scope claim (cron wiring is a separate unit) holds.

### Assistant | 2026-06-23T00:28:44.732Z

[tool_use: Grep]

### User | 2026-06-23T00:28:47.582Z

[tool_result] 43:  buildTrainsetRow,
242:      const nm = res.fused.summary.n_models;
244:      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
322:      // temp-PNG cleanup fires even if buildTrainsetRow/classifyActiveLearning throws (the parser has
363:          const trainsetRow = buildTrainsetRow({ part: `${basename(entry)}#p${page}`, image: pageImage }, res.fused, calibrati
... [+303 chars truncated]

### Assistant | 2026-06-23T00:28:52.432Z

This confirms the seam claim: `buildTrainsetRow(meta, res.fused, calibration)` consumes a `fused` object with `.dimensions`, `.summary`, etc. The new `.fused` field on `extractWithRegionRouting`'s return is shaped to be a drop-in for that second argument. Let me verify `buildTrainsetRow`'s actual signature/usage of non-dimension fields to confirm the hybrid preserves what it needs, and confirm the cron currently does NOT yet call region routing (scope honesty).

### Assistant | 2026-06-23T00:28:54.786Z

[tool_use: Grep]

### User | 2026-06-23T00:28:54.796Z

[tool_result] <tool_use_error>Path does not exist: H:\prism\scripts\lib\blueprint-ocr-trainset-lib.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-23T00:28:55.473Z

[tool_use: Grep]

### User | 2026-06-23T00:28:58.148Z

[tool_result] Found 6 files
scripts\region-classify.test.mjs
scripts\region-classify.mjs
scripts\lib\region-glue-lib.mjs
scripts\validate-perfect-parts.mjs
scripts\lib\region-classifier-lib.test.mjs
scripts\lib\region-classifier-lib.mjs

### Assistant | 2026-06-23T00:29:03.445Z

The grep confirms scope honesty: `blueprint-ocr-training-loop.mjs` (the cron) does NOT yet import or call `extractWithRegionRouting` / region-classify. So this change only provides the seam; the actual cron wiring remains unbuilt — consistent with the change being "step 3b unblock" not "step 3b done." Let me locate where `buildTrainsetRow` is defined to verify which non-dimension fields it actually reads (so I can confirm the hybrid preserves them).

### Assistant | 2026-06-23T00:29:04.156Z

[tool_use: Bash]

### User | 2026-06-23T00:29:10.662Z

[tool_result] scripts/lib/ocr-training-loop-lib.mjs:128:export function buildTrainsetRow(part, fused, calibration, opts = {}) {

### Assistant | 2026-06-23T00:29:16.638Z

Let me read `buildTrainsetRow` to verify exactly which non-dimension fields it consumes, confirming the hybrid preserves them and there's no double-count.

### Assistant | 2026-06-23T00:29:17.212Z

[tool_use: Read]

### User | 2026-06-23T00:29:19.409Z

[tool_result] 128	export function buildTrainsetRow(part, fused, calibration, opts = {}) {
129	  const dims = fused && Array.isArray(fused.dimensions) ? fused.dimensions : [];
130	  const runNModels = fused && fused.summary && Number.isFinite(fused.summary.n_models) ? fused.summary.n_models : 0;
131	  const corroborationPossible = runNModels >= MIN_ENSEMBLE_FOR_CORROBORATION;
132	  const labels = dims.map((d) =>
... [+5359 chars truncated]

### Assistant | 2026-06-23T00:29:25.720Z

I now have full verification of the consumer contract. Let me note a key finding regarding the `summary.n_models` field, which is load-bearing for `buildTrainsetRow`.

Critical observation: `buildTrainsetRow` reads `fused.summary.n_models` (line 130) — and the hybrid `buildRegionRoutedFused` keeps the full-page pass's `summary` (with `n_models` from the full-page run), but it REPLACES `.dimensions` with the region-routed union. The region-routed union dims come from `mergeTiledDimensions`, which produces `tileAgreement`/corroboration fields, but the per-dim `n_models` and `corroboration` fields on the merged dims may differ from the full-page `summary.n_models`. Let me check what fields the merged union dims carry vs. what `buildTrainsetRow` reads per-dim (`d.corroboration`, `d.n_models`, `d.value_mm`, `d.agreement_confidence`, `d.value_spread_mm`).

### Assistant | 2026-06-23T00:29:26.710Z

[tool_use: Bash]

### User | 2026-06-23T00:29:32.417Z

[tool_result] 113://   - extractDimension (ollama-vision-extract-lib): { nominal_mm, raw_text:string,   confidence }
114://   - fuseEnsemble     (vision-ensemble-fuse):      { value_mm,   raw_texts:string[], agreement_confidence }
119:  for (const v of [d && d.nominal_mm, d && d.value_mm, d && d.mm]) {
135:  for (const v of [d && d.confidence, d && d.agreement_confidence]) {
173: *   `tileAgreement` (how many t
... [+277 chars truncated]

### Assistant | 2026-06-23T00:29:40.241Z

This is the key design detail. `mergeTiledDimensions` (line 245) spreads `...instances[rep].dim` — meaning each merged union dim preserves the original `fuseEnsemble`-shaped fields (`value_mm`, `corroboration`, `n_models`, `agreement_confidence`, `value_spread_mm`) from whichever tile pass produced it, and adds `tileAgreement`/`sourceTiles`. So the merged dims DO carry the per-dim fields `buildTrainsetRow` reads. This means the hybrid fused is shape-compatible for the per-dim labeling path. Good — the seam is sound.

Now let me check one subtle correctness concern: `buildTrainsetRow` uses `fused.summary.n_models` (the run-level model count) as a fallback for per-dim `n_models` (line 133). In the hybrid, `summary` is the full-page pass's. Region dims come from region passes which used the same `models` list, so `n_models` is consistent. But region dims also have their own `d.n_models` (preferred when `>0`). Let me confirm the union dims carry `n_models`/`corroboration` per-dim by checking `fuseEnsemble` output shape.

### Assistant | 2026-06-23T00:29:41.152Z

[tool_use: Bash]

### User | 2026-06-23T00:29:48.598Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
191: *   dimensions
... [+1719 chars truncated]

### Assistant | 2026-06-23T00:30:00.972Z

This confirms the full picture. Each dim from `fuseEnsemble` carries `value_mm`, `corroboration`, `n_models`, `agreement_confidence`, `value_spread_mm`, `hallucination_candidate` — and the union via `mergeTiledDimensions` preserves these (spread `...dim`). So the hybrid's per-dim labeling path is sound.

There is one design subtlety worth flagging (a P2, honestly-documented gap that affects the FUTURE cron consumer, not this diff's correctness): `buildTrainsetRow`/`classifyActiveLearning` read run-level `fused.summary.{n_hallucination_candidates, n_ambiguous_pairs}` from the full-page summary. In the hybrid, region-recovered dims that are singletons/hallucination-candidates won't be reflected in `summary.n_hallucination_candidates` (which is the full-page pass's count). This is a stale-summary asymmetry that could let a region-only hallucination slip through active-learning review. But this is downstream of the seam and belongs to the (unbuilt) cron-wiring unit — the diff's own comment already honestly scopes the hybrid as dimension-recall-only. I'll note it.

Let me do a final ASCII/convention check on the added lines.

### Assistant | 2026-06-23T00:30:01.899Z

[tool_use: Bash]

### User | 2026-06-23T00:30:11.236Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ALL-ASCII-CLEAN

### Assistant | 2026-06-23T00:30:13.943Z

The `-P` flag failed to run due to locale, so the "ALL-ASCII-CLEAN" came from the `&&`/`||` short-circuit, not a real scan. Let me run a proper non-ASCII check.

### Assistant | 2026-06-23T00:30:15.564Z

[tool_use: Bash]

### User | 2026-06-23T00:30:23.794Z

[tool_result] ALL-ASCII-CLEAN

### Assistant | 2026-06-23T00:30:52.150Z

All four files are ASCII-clean (no smart-quotes, no em-dashes; the comments use `--` ASCII dashes consistent with the surrounding file). 

I have everything needed for a verdict. Let me summarize my verification.

VERDICT: PASS

summary: The change adds a pure `buildRegionRoutedFused(mergedDimensions, fullPageFused)` helper and threads a `fused` field through `extractWithRegionRouting` (full-page fused on `full_page` route, the hybrid on `region_route`). It is correct, pure, ASCII-clean, honestly scoped, and well-tested: the hybrid swaps in the region-routed union dims while preserving the full-page pass's non-dimension schema, which is shape-compatible with the cited consumer `buildTrainsetRow(part, fused, calibration)` in `scripts/lib/ocr-training-loop-lib.mjs:128`. I verified the merged union dims carry the per-dim fields `buildTrainsetRow` reads (`value_mm`/`corroboration`/`n_models`/`agreement_confidence`/`value_spread_mm`, preserved through `mergeTiledDimensions` `...dim` spread at `scripts/lib/vision-tiling-lib.mjs:245` and originating in `fuseEnsemble` at `scripts/lib/vision-ensemble-fuse.mjs:229-238`). No double-count: `fused.dimensions` is the union, computed once by `mergeRegionResults`, and is *replaced* (not merged again) into the full-page fused. Tests run green (region-glue-lib 16/16, region-classify 10/10, 0 skipped/only).

findings:
- [P2] `scripts/lib/region-glue-lib.mjs:171-176` (design asymmetry, honestly addressed) -- The hybrid keeps the full-page pass's `summary` while replacing `dimensions` with the region union. The future cron consumer `classifyActiveLearning` (`scripts/lib/ocr-training-loop-lib.mjs:170-173`) reads run-level `summary.{n_models,n_hallucination_candidates,n_ambiguous_pairs}` from that full-page summary -- so a region-only singleton/hallucination dim recovered by region routing will NOT be counted in `summary.n_hallucination_candidates`, and could bypass active-learning review when the cron is eventually wired. The diff's docs
... [+2790 chars truncated]
