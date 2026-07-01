---
name: reference_xray_page_classify_numctx_fix_and_wire_2026_06_16
description: "page-classify was SILENTLY non-functional (num_ctx 4096 too small for the real prompt + a 150/300dpi page image -> empty VLM responses -> every page fell through to extract = zero skip value). Fixed (8192), measured 40-67% skip on multi-page bundles, then wired as an OPT-IN (default-OFF) pre-VLM page gate into the closed-loop OCR training loop. slot:xray 2026-06-16."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_page_classify_numctx_fix_and_wire_2026_06_16
---


# page-classify num_ctx silent-bug fix + opt-in loop wiring — slot:xray 2026-06-16

Continuation of [[reference_xray_ocr_observability_al_queue_surface_2026_06_16]] (same session, "push
through" after MCP reconnect). The deferred "measure page-classify skip-rate first" item was executed
in the idle pre-02:00 GPU window — and turned up a silent bug + then justified the wiring.

## R12 SILENT BUG (commit e3fababc90) — num_ctx 4096 -> 8192
`page-classify.mjs` returned **empty VLM responses** (307ms-8625ms, `done_reason=undefined`, len 0) on
every page -> the fail-soft path made every page `verdict:"extract"` -> the gate provided ZERO skip
value while *appearing* to run. Root cause: `buildClassifierRequestBody` set `num_ctx: 4096`, but the
real 1320-char classifier prompt + a rendered page image's vision tokens OVERFLOW 4096, leaving no room
for generation. Measured live: ctx 4096 = empty; **ctx 8192 = valid JSON (`done_reason=stop`)**; 16384
same. KEY VLM-sizing lesson: qwen3-vl resizes images to a fixed vision grid, so **input DPI does NOT
linearly grow vision tokens** — a 300dpi page (1MB base64) classifies fine at 8192, same as 150dpi.
Fix = default `num_ctx` 4096 -> 8192. 29->30 tests.

## MEASUREMENT (the deferred decision gate, now answered with real data)
4-PDF sample, qwen3-vl:8b-instruct: single-page real drawings (D22706-16/07) -> EXTRACT (0% skip,
correctly kept); multi-page scanned bundles -> **40% (2/5: table+drawing) and 67% (2/3: bom+blank)
skip** at conf 0.95-0.98. NO false skips of drawing pages. So on multi-page bundles (the dominant JM
corpus shape, ~96% multi-page) the gate saves 40-67% of ensemble GPU time.

## WIRING (commit a2d885fcb7) — OPT-IN --page-classify gate
Wired `classifyImage(png)` into `blueprint-ocr-training-loop.mjs` as a pre-VLM gate: a confident
non-drawing page is skipped before the ensemble. **DEFAULT-OFF** (`--page-classify`) -> the nightly
cron path is byte-identical. Data-loss-safe (skips ONLY `cls.verdict==="skip"`; decidePageVerdict
requires `is_drawing===false && conf>=floor && source==="json"`; any failure -> extract). All-pages-
skipped cursors as `skipped-all-paperwork` (legit done, not ensemble-failed). New report field
`this_run_pages_skipped_paperwork`. Live-validated on the 5pp 11_7 bundle (temp out-dir): 2 pages
skipped, 3 drawing pages -> 16 dims, report=2.

**HARDENING** caught by scrutiny arm B (P0): the same-session `source!=="prose"` -> `source==="json"`
tighten broke 2 source-less test fixtures (suite went red). Fixed fixtures + added an explicit
regression test pinning the source-gating contract -> 30/30. Lesson re-confirmed: a lib hardening
MUST update its tests in the SAME change (R9/R12); the per-file 2-reviewer gate caught it before commit.

## OPERATOR DECISION (surfaced, NOT auto-applied)
To ENABLE the gate on the nightly grinder (likely net-positive given the multi-page corpus): add
`--page-classify` to `$nodeArgs` in `scripts/run-ocr-training-loop-overnight.ps1`. Left OFF because it
changes the LIVE unattended grinder's behavior on all 7142 prints — validated on a 4-PDF sample, not
the full corpus, so enabling it is the operator's conscious call. Net-positive on multi-page bundles,
net-NEGATIVE (pure +1 classify tax per kept page) on single-page-drawing inputs.

Ties: [[reference_xray_ocr_observability_al_queue_surface_2026_06_16]] (same session, units 1-2).
