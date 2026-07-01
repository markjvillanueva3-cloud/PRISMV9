---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent review of commit d13211934f (already committed, on branch cad-fusion"
date: "2026-06-23"
first_ts: "2026-06-23T01:11:50.585Z"
last_ts: "2026-06-23T01:13:25.267Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a9c2f048afdbfa889.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review of commit d13211934f (already committed, on branch cad-fusion

> **claude-code-cli** | 2026-06-23 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a9c2f048afdbfa889.jsonl`

## Transcript

### User | 2026-06-23T01:11:50.585Z

Independent review of commit d13211934f (already committed, on branch cad-fusion-live-ms0) in PRISM's blueprint-vision OCR P1.5 region-routing subsystem. A prior review attempt was derailed by a transient git clobber of the working tree; the work is now committed and stable. Review the COMMITTED content of these 4 files end-to-end:

1. H:\prism\scripts\lib\region-glue-lib.mjs  (function buildRegionRoutedFused, ~line 171-201)
2. H:\prism\scripts\lib\region-glue-lib.test.mjs  (the buildRegionRoutedFused test section)
3. H:\prism\scripts\region-classify.mjs  (nModelsOf helper ~line 91; the region_route branch ~line 168-202)
4. H:\prism\scripts\region-classify.test.mjs  (the DENSE-RESCUE test)

THE CHANGE: buildRegionRoutedFused gained opts.fallbackNModels. When the full-page OCR floor fails on a dense page (no summary) but per-region crops rescue dims, it synthesizes summary.n_models from the region ensemble depth so the rescued dims stay TRAINABLE downstream (consumer buildTrainsetRow in scripts/lib/ocr-training-loop-lib.mjs gates corroboration on summary.n_models >= 2). extractWithRegionRouting captures the region ensemble depth (nModelsOf helper, max over region passes -> regionNModels) and passes it; returns regionNModels.

Verify with file:line citations + grade PASS/FAIL (P0/P1/P2):
- A real full-page summary is NEVER overwritten by the fallback (fallback only fires when summary is absent/malformed).
- n_hallucination_candidates is recomputed over the union in every return branch.
- fallbackNModels <= 0 / NaN / absent => no synthesis (honest: can't claim corroboration depth that didn't run).
- The function stays pure (no input mutation).
- The DI integration test (region-classify.test.mjs DENSE-RESCUE) genuinely proves the end-to-end path: failed floor + successful region => regionNModels captured => synthesized n_models=2 => rescued dim present + trainable. Would it FAIL if the synthesis logic were removed?
- Tests verify INTENT not just shape (R9); no weakened/
... [+239 chars truncated]

### Assistant | 2026-06-23T01:11:54.779Z

I'll review the committed content of these 4 files end-to-end. Let me start by reading all of them and confirming the commit.

### Assistant | 2026-06-23T01:11:55.729Z

[tool_use: Bash]

### Assistant | 2026-06-23T01:11:56.198Z

[tool_use: Read]

### Assistant | 2026-06-23T01:11:56.377Z

[tool_use: Read]

### User | 2026-06-23T01:11:57.519Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+12269 chars truncated]

### User | 2026-06-23T01:11:57.708Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/region-classify.mjs
3	//
4	// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
5	// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
6	// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
7	// split (cores: scripts/lib/region-classif
... [+14560 chars truncated]

### User | 2026-06-23T01:11:59.782Z

[tool_result] commit d13211934f27bc9ff106423ffdf702b4aa6e0c2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 20:11:07 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-DENSE-RESCUE-TRAINABLE (slot:xray): buildRegionRoutedFused synthesizes summary.n_models from the region ensemble when the full-page floor fails -- the dense-page rescue stays TRAINABLE for the cron
   
... [+1204 chars truncated]

### Assistant | 2026-06-23T01:12:03.868Z

Now let me read the two test files and verify the consumer gate in buildTrainsetRow.

### Assistant | 2026-06-23T01:12:04.397Z

[tool_use: Read]

### Assistant | 2026-06-23T01:12:04.512Z

[tool_use: Read]

### User | 2026-06-23T01:12:05.672Z

[tool_result] 1	/**
2	 * region-glue-lib -- unit tests for the P1.5 step-2 pure orchestration core.
3	 *
4	 * Pins the two correctness-critical seams of region routing:
5	 *   1. scaleBboxToPixels -- fractional bbox -> integer pixel crop (a missed/wrong scaling crops a
6	 *      ~1px box = silent recall loss). Degenerate (<1px) -> null -> caller full-page-floors it.
7	 *   2. mergeRegionResults -- the RECALL-FI
... [+15777 chars truncated]

### User | 2026-06-23T01:12:05.881Z

[tool_result] 1	/**
2	 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
3	 *
4	 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
5	 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
6	 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full
... [+10603 chars truncated]

### Assistant | 2026-06-23T01:12:09.662Z

Now let me verify the consumer gate in buildTrainsetRow to confirm the corroboration contract, and run both test files.

### Assistant | 2026-06-23T01:12:11.661Z

[tool_use: Grep]

### Assistant | 2026-06-23T01:12:12.549Z

[tool_use: Bash]

### User | 2026-06-23T01:12:13.173Z

[tool_result] 9-\ given its agreement? This lib answers it empirically, then grades labels:
10-//
11-//   1. CALIBRATE — on perfect-GT synthetic prints, measure P(a consensus dim is CORRECT | its
12://      AGREEMENT FRACTION f = k/n_models). Calibrating on the FRACTION (not raw count k) is the key
13-\      correctness property: k=2 means different things in a 2-model vs a 3-model run, but f="how much
14-//   
... [+6919 chars truncated]

### User | 2026-06-23T01:12:16.635Z

[tool_result]   ...
# Subtest: buildRegionRoutedFused: full-page summary PRESENT + fallbackNModels -> full-page summary WINS (fallback ignored, no overwrite)
ok 22 - buildRegionRoutedFused: full-page summary PRESENT + fallbackNModels -> full-page summary WINS (fallback ignored, no overwrite)
  ---
  duration_ms: 0.038
  ...
1..22
# tests 22
# suites 0
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
# dura
... [+456 chars truncated]

### Assistant | 2026-06-23T01:12:20.267Z

Both suites pass (22/22 + 11/11). Now let me verify the two claims that require deeper checking: ASCII-only in the .mjs code files, and whether the DENSE-RESCUE test would fail if synthesis were removed.

### Assistant | 2026-06-23T01:12:23.252Z

[tool_use: Bash]

### User | 2026-06-23T01:12:28.239Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
scripts/lib/region-glue-lib.mjs: ASCII-only OK
grep: -P supports only unibyte and UTF-8 locales
scripts/region-classify.mjs: ASCII-only OK

### Assistant | 2026-06-23T01:12:31.400Z

The grep `-P` warned but ran; let me confirm with a more reliable byte check, and prove the falsifiability of the DENSE-RESCUE test by simulating synthesis removal.

### Assistant | 2026-06-23T01:12:33.762Z

[tool_use: Bash]

### User | 2026-06-23T01:12:37.481Z

[tool_result] scripts/lib/region-glue-lib.mjs ASCII-only OK (11941 bytes)
scripts/region-classify.mjs ASCII-only OK (14064 bytes)

### Assistant | 2026-06-23T01:12:39.753Z

[tool_use: Bash]

### User | 2026-06-23T01:12:43.741Z

[tool_result] GOOD: DENSE-RESCUE assertion FAILS when synthesis removed -> summary synthesized

### Assistant | 2026-06-23T01:12:52.453Z

Both confirmed. Now let me verify the purity claim (no input mutation) end-to-end and confirm `n_hallucination_candidates` is recomputed in *every* return branch by tracing each one.

The code is fully read. Let me trace the four return branches of `buildRegionRoutedFused` for the recompute claim:

- Branch 1 (`region-glue-lib.mjs:193-194`, no fused + fallback>0): includes `n_hallucination_candidates: nHall`.
- Branch 2 (`region-glue-lib.mjs:195`, no fused + fallback<=0): `{ dimensions: dims }` — **no summary object at all**, so no `n_hallucination_candidates`.
- Branch 3 (`region-glue-lib.mjs:202`, summary present): `n_hallucination_candidates: nHall`.
- Branch 4 (`region-glue-lib.mjs:205`, fused present, no summary, fallback>0): `n_hallucination_candidates: nHall`.

Branch 2 omits the summary entirely. That is the honest "no synthesis" path and is correct per the design — but it means the claim "recomputed in every return branch" is technically only true in every branch that *produces a summary*. Let me verify this is intentional and consistent with the consumer's active-learning routing.

### Assistant | 2026-06-23T01:12:57.403Z

[tool_use: Bash]

### User | 2026-06-23T01:13:01.580Z

[tool_result] Branch-2 (no summary): consumer gets n_models=0 -> corroborationPossible=false -> 0 trainable -> needsReview via the 4th reason. Hallucination candidate not double-flagged but page still queued. OK.

### Assistant | 2026-06-23T01:13:25.267Z

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: The `opts.fallbackNModels` change to `buildRegionRoutedFused` is correct, surgical, and well-tested. A real full-page summary is never overwritten by the fallback; synthesis fires only on the failed-floor rescue path with a positive finite depth; the function is pure; the DI integration test genuinely proves the end-to-end dense-rescue path and is provably falsifying. All 22+11 tests pass, both code files are ASCII-only, no `.skip`/`.only`, and assertions verify intent (R9).

findings:
- none (P0/P1/P2). All review criteria verified clean.

What I verified (so the PASS is auditable):

1. **Real full-page summary never overwritten** — `region-glue-lib.mjs:198-202`: when `out.summary` is a present object, it spreads the real summary and only overrides `n_hallucination_candidates`; `n_models`/`n_ambiguous_pairs` are kept. Synthesis (`else if`, line 203-205) is mutually exclusive with this branch, so a real `n_models` can never be replaced by `fallbackN`. Pinned by the test at `region-glue-lib.test.mjs:249-255` (full-page n_models=4 wins over fallback 2).

2. **`n_hallucination_candidates` recomputed over the union in every summary-producing branch** — `nHall` computed once over union dims at `region-glue-lib.mjs:184`, used in branch 1 (`:194`), branch 3 (`:202`), branch 4 (`:205`). Branch 2 (`:195`, no fused + `fallbackN<=0`) honestly emits `{ dimensions: dims }` with no summary at all — this is correct, not a loss: that page reaches the consumer with `n_models=0` and routes to active-learning via `buildTrainsetRow`'s `corroboration_possible=false` -> 0 trainable -> `needsReview` (`ocr-training-loop-lib.mjs:130-131,174`). The function-level claim "recomputed in all branches" is accurate for every branch that produces a summary.

3. **`fallbackNModels <= 0 / NaN / absent => no synthesis** — `region-glue-lib.mjs:190` `Number.isFinite(...) ? ... : 0`, then guarded by `fallbackN > 0` at lines 193 a
... [+1851 chars truncated]
