---
name: reference_u_ms1_u2_pdf_blueprint_pattern_rescue
description: "BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U2 shipped — PDFBlueprintPatternRescueEngine: additive 4-pattern rescue from v8.89.002 PRISM_OCR_ENGINE.js monolith fork. New engine 385 LOC + 67 tests + cadDispatcher additive compose. 2-of-2 per-file scrutiny PASS after 2P0+6P1 fix cycle."
source: prism-memory
synced: 2026-05-18T01:02:10.088Z
aliases: reference_u_ms1_u2_pdf_blueprint_pattern_rescue
---


**Date:** 2026-05-16 (slot charlie, claude-339c8ff7, BLUEPRINT-OCR-TRAINING-MS1 /loop iter 1/30 — bravo-take attempted but already-owned)

**Shipped:**
- `mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts` (385 LOC pure-transform)
- `mcp-server/src/__tests__/PDFBlueprintPatternRescueEngine.test.ts` (67 cases, real-value pins)
- `mcp-server/src/tools/dispatchers/cadDispatcher.ts` (z.enum +1 action, 2 case-blocks)
- `mcp-server/src/engines/PDFBlueprintDimensionExtractorEngine.ts` (docstring redirect — file has mixed unicode encoding that makes Edit on the unicode-table section unreliable; ASCII-only edits work)
- Envelope: completed_units 1→2 of 8; U-MS1-U2 status flipped + exit_evidence + 2-of-2 scrutiny notes

**Commits:**
- `edc0c0eaf` — impl (engine + tests + sister-engine docstring + dispatcher compose)
- envelope flip commit (separate, after impl landed)

**Approach that worked (key precedent for future MS1 units):**
- The original goal was to EXTEND PDFBlueprintDimensionExtractorEngine.ts in-place with new methods. **Blocked** — that file uses literal `\uXXXX` escape sequences in source bytes for some GDT symbols and rendered glyphs for others; Edit tool's old_string match fails on both forms. After two retries the **pivot was to ship a separate sibling engine** (additive composition, no unicode edit needed). This is the same pattern MS1-U1 used (shipped 2 new engines for its rescue at sha e88cf6429).
- The 4 rescued patterns (fractional dims like `1/2"`, limit-pair dims like `1.000/1.002`, ISO 1302 N-grade Ra `N1..N12` lookup, standalone microinch `32 µin` without Ra prefix) were verified ABSENT from all 5 existing OCR-related engines (BlueprintVisionOCREngine 996 LOC, PDFBlueprintDimensionExtractorEngine 439 LOC, ImageOCRPipelineEngine 198 LOC, GDTCalloutParserEngine 238 LOC, BlueprintOCREngine 1106 LOC) before authoring. The Tesseract.js browser orchestration in the monolith fork was correctly deemed obsolete (server-side context owns OCR via the existing 5).

**Per-file scrutiny gate findings (load-bearing — 2 P0 + 6 P1 caught + fixed pre-commit):**
1. **P0 — fractional raw_text slice arithmetic broken** (both reviewers found independently): the offset math `m.index + (m[0].length - wholeStr.length - 1 - ...)` produced negative or wrong offsets, silently masked by a `rawText.length > 0 ? rawText : <fallback>` ternary. Fix: switch to `(?<![#\d\/.\-A-Za-z])` lookbehind (preserves `m.index` alignment) + `m[0].trim()` directly.
2. **P0 — standalone microinch regex `(\d+\.?\d*)` ambiguity**: parses `"3."` as ghost-match (`parseFloat("3.")===3`), plus polynomial backtracking risk on adversarial input. Fix: `(\d+(?:\.\d+)?)` unambiguous form.
3. **P1 — leading-guard `(?:^|[^...])` consumes 1 char** → cascading off-by-one in every downstream slice. Fix: replaced with lookbehind (same as P0-1 fix).
4. **P1 — Ra-prefix veto window 6 chars too narrow** to catch `Ra = 32 µin` (`Ra` + `=` + ` ` + value start = 8+ chars). Fix: widened to 10.
5. **P1 — limit-pair M-prefix back-window 8 chars** misses `METRIC THREAD M10 X 1.0/1.25` (spaced form). Fix: widened to 16.
6. **P1 — limit-pair chamfer ahead-window 4 chars** misses `0.250/0.260 X 45deg` (spaced form). Fix: widened to 8.
7. **P1 — limit-pair ignored dispatcher `drawing_units` param** → US blueprints stamped `unit:"mm"` contradicting sister engine on same call. Fix: plumbed `default_unit` through engine.extract().
8. **P1 — sister engine docstring stale** (added a "rescue is HERE" comment to PDFBlueprintDimensionExtractorEngine then pivoted to sibling). Fix: docstring redirected to PDFBlueprintPatternRescueEngine.

**Deferred follow-ups (NOT auto-claimed; tracked here for MS1 close-out at U8):**
- `validateCompleteness()` semantic divergence: sister engine's completeness scoring still walks only `extractDimensions()` output, not the rescued dims. A blueprint with ONLY fractional `1/2"` callouts will silently score 0/25 for "linear_dimensions". Fix is to either wire rescue into completeness symmetry (touch sister engine) OR sum `rescue_counts` at consumer site (touch dispatcher comment + caller docs).
- cadDispatcher integration test for composed path: 67 engine tests prove the rescue engine, but no end-to-end MCP-server invocation test exercises the new `cad_pdf_blueprint_extract` (composed) or `cad_pdf_pattern_rescue_extract` (standalone) action via MockMCPServer. Blocked on the same BATCH1-5+U-PPL-A5 MockMCPServer harness retrofit logged by the prior chat — orthogonal to this milestone.
- 4 P2 findings: cap-hit telemetry, N-grade callout-balloon false-negative (documented contract), microinch dedup edge cases.

**Skill notes (general doctrine):**
- When Edit can't match unicode bytes, **pivot to sibling engine** rather than fighting encoding. Reviewer A's P0-1 demonstrates the cost of trying to be clever with slice math — kept arithmetic to zero, use `m[0].trim()` directly when lookbehind makes `m.index` mean exactly the match start.
- The `\d+\.?\d*` regex pattern is a class of bug worth grepping the codebase for — anywhere it appears it has the same ghost-match + ReDoS issue. Replace with `\d+(?:\.\d+)?` everywhere.
- Per-file scrutiny gate is load-bearing for compound-error prevention. Even on a small surgical engine (385 LOC), it caught 2 P0 + 6 P1 across 2 reviewer agents that I would have shipped silently otherwise.

**MS1 progress:** 2 of 8 (U-MS1-U1 + U-MS1-U2). Remaining: U3 (GroundTruthRegistry extend), U4 (GroundTruthValidation extend), U5 (blueprint-accuracy-guard + new blueprint-coverage-floor-guard Stop hook), U6 (BlueprintCorpusHarvestEngine + scripts + cron), U7 (BlueprintExtractionRAGEngine centerpiece), U8 (BlueprintLoRABridge + CoverageAudit + close-out).

Sister: [[reference_blueprint_ocr_training_ms1_collision]] (the original spec collision history). Companion: [[feedback_parallel_scrutiny_per_file]] (per-file gate doctrine — load-bearing). The unicode-encoding workaround should propagate as a separate `[[feedback_edit_tool_unicode_mixed]]` memo for future authors.


## Related
[[engines/PDFBlueprintPatternRescueEngine|PDFBlueprintPatternRescueEngine]] • [[engines/PDFBlueprintDimensionExtractorEngine|PDFBlueprintDimensionExtractorEngine]] • [[engines/BlueprintVisionOCREngine|BlueprintVisionOCREngine]] • [[engines/ImageOCRPipelineEngine|ImageOCRPipelineEngine]] • [[engines/GDTCalloutParserEngine|GDTCalloutParserEngine]] • [[engines/BlueprintOCREngine|BlueprintOCREngine]] • [[engines/BlueprintCorpusHarvestEngine|BlueprintCorpusHarvestEngine]] • [[engines/BlueprintExtractionRAGEngine|BlueprintExtractionRAGEngine]] • [[skills/loop|/loop]] • [[skills/src|/src]]