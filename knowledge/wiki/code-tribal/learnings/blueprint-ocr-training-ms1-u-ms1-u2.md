# BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U2 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U2: rescue prism-ocr-engine monolith — additive PatternRescueEngine + 67 tests + cadDispatcher compose

**Commit:** `edc0c0eaf0b3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:14:28-05:00
**Tags:** blueprint-ocr-training-ms1, u-ms1-u2, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U2: rescue prism-ocr-engine monolith — additive PatternRescueEngine + 67 tests + cadDispatcher compose

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U2: rescue prism-ocr-engine monolith — additive PatternRescueEngine + 67 tests + cadDispatcher compose

Rescue value-add from v8.89.002 PRISM_OCR_ENGINE.js monolith fork (sister copy
at extracted_modules/complete_extraction/, byte-identical regex library) — the
Tesseract.js browser orchestration is obsolete in server-side context (sister
engines BlueprintVisionOCREngine/ImageOCRPipelineEngine/BlueprintOCREngine
already cover image→text). What the monolith uniquely contributed was a regex
pattern library for US engineering conventions absent from the prior
extractors:
  1. Fractional dimensions   - 1/2", 3/8, 1-1/2", 2 3/4  (US inch convention)
  2. Limit-pair dimensions   - 1.000/1.002             (US bilateral form)
  3. ISO 1302 N-grade Ra     - N1..N12 lookup          (Annex F comparator)
  4. Standalone microinch    - 32 µin, 125 microinch   (without Ra prefix)

Pattern: NEW sibling engine PDFBlueprintPatternRescueEngine.ts (385 LOC pure-
transform) — does NOT modify sister engine internals; only composes additively
into the existing cad_pdf_blueprint_extract dispatcher case. New standalone
action cad_pdf_pattern_rescue_extract exposes the rescue layer alone.

Per-file scrutiny gate (2 parallel reviewer agents): caught 2 P0 + 6 P1
findings, all fixed:
  P0 (raw_text slice math) → ditched arithmetic; lookbehind regex; m[0].trim()
  P0 (microinch \d+\.?\d* ambiguity) → \d+(?:\.\d+)? unambiguous regex
  P1 leading-guard consume off-by-one → lookbehind eliminates cascade
  P1 Ra-prefix veto window 6→10 chars (catches Ra = 32 µin, Ra: 32 µin)
  P1 limit M-prefix back-window 8→16 (catches METRIC THREAD M10 X 1.0/1.25)
  P1 limit chamfer ahead-window 4→8 (catches `0.250/0.260 X 45deg` spaced)
  P1 limit unit defaults mm but ignored dispatcher drawing_units → plumbed
  P1 sister-engine docstring stale → redirected to sibling engine reference

Tests: 67 vitest cases (real-value assertions, ISO 1302 full grade table pin,
adversarial 10k-digit ReDoS bound, every veto path exercised, P0/P1 fix
regressions explicitly pinned). 17 sister-engine tests regression-clean.
84/84 PASS.

Wiring:
  - z.enum +cad_pdf_pattern_rescue_extract (cadDispatcher.ts:247)
  - case "cad_pdf_blueprint_extract" composes rescue.extract() into base
    result (additive — result shape grows, never shrinks; rescue_counts
    surfaced as metadata field)
  - case "cad_pdf_pattern_rescue_extract" new — standalone rescue invocation

Deferred follow-ups (logged for milestone close-out, not auto-claimed):
  - validateCompleteness() semantic — sister engine's completeness scoring
    doesn't see rescued dims; documented in dispatcher comment. Fix is to
    either wire rescue into completeness symmetry or sum rescue_counts at
    consumer site.
  - cadDispatcher integration test for composed path (requires MockMCPServer
    harness retrofit per BATCH1-5 pre-existing follow-up).
  - 4 P2 findings: limit-pair telemetry-on-cap, N-grade callout-balloon
    false-negative (documented contract), microinch dedup window edge cases.

Refs: [[reference_blueprint_ocr_training_ms1_collision]] (prior shared-tree
absorption), [[feedback_parallel_scrutiny_per_file]], BLUEPRINT-OCR-TRAINING-
MS1 envelope units[1].

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../PDFBlueprintPatternRescueEngine.test.ts        | 538 +++++++++++++++++++++
- .../PDFBlueprintDimensionExtractorEngine.ts        |   8 +-
- .../src/engines/PDFBlueprintPatternRescueEngine.ts | 385 +++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  31 +-
- 4 files changed, 960 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show edc0c0eaf0b3`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._