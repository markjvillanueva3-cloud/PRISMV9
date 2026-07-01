---
name: reference_xray_multipage_page0_only_bug_2026_06_19
description: "page-0-only OCR on multi-page print bundles = the real recall=0 cause in validate-perfect-parts (FIXED) + strong candidate for operator's \"delta missed dims\"; check the LIVE path next"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_multipage_page0_only_bug_2026_06_19
---


slot:xray, 2026-06-19 (operator "do everything to improve blueprint reading" / "keep pushing").

**THE BUG (run-verified):** `validate-perfect-parts.mjs` rasterized PAGE 0 ONLY (comment: "the
perfect-parts prints are single drawings" -- FALSE). Docustrata bundles are commonly MULTI-PAGE: a
cover/table/routing page + the actual DRAWING on a LATER page. So the TRUE-test OCR'd the cover, missed
the drawing, scored recall=0 -- and I (and prior sessions) misread that as an OCR-capability failure.

**RUN-PROOF** on "Scanned Document - 11_18_2020 6_17 AM.pdf" (a perfect-part print):
- page-classify: p0 = table (conf 0.98), p2 = DRAWING (conf 1.0)
- probe p0 (8b): raw_len=456, 0 dims  (the cover the harness was reading)
- probe p2 (8b): parse_ok, 14 dims    (the drawing it was MISSING)
The 8b reads the drawing fine; the harness just never looked at the drawing page.

**FIX (commit d820c15936, U-XRAY-PERFECT-PARTS-MULTIPAGE):** rasterPage0 -> rasterAllPages (cap 12,
mirrors the grinder's rasterizePrintPages); main loop OCRs every page + UNIONs the dims before scoring;
records pages_total/pages_ocrd. Sequential (Ollama serializes per-model; don't hammer the GPU vs the
live grinder). Additive -- recall can only rise. End-to-end --limit 6 re-validation was running to
quantify the lift (b0x9todqg).

**HIGH-VALUE NEXT LEAD (the likely operator-pain root cause):** page-0-only on multi-page bundles is a
strong candidate for "delta missed features/dimensions that were clear to see" -- if the LIVE/production
print-reading path delta consumes also reads page-0-only, it looks at a cover page + misses the drawing.
NOTE: the grinder (blueprint-ocr-training-loop.mjs) is ALREADY multi-page-correct (rasterizePrintPages).
The engines (BlueprintVisionOCREngine/BlueprintOCREngine/PDFBlueprintDimensionExtractorEngine) showed NO
page-iteration on grep -- PDF->page rasterization is the CALLER's job (xray doctrine: split-before-OCR).
So trace the LIVE entry (cadDispatcher cad_pdf_blueprint_extract -> the dispatcher's PDF feeding +
businessDispatcher blueprint_to_quote + camDispatcher print_to_program_full): does each render ALL pages
or page 0? Fix any page-0-only there (same all-pages discipline). THIS is the next unit to confirm + fix.

Follow-on: page-classify-gate validate's pages (skip cover/table -> faster + cleaner precision), like
the grinder's --page-classify.
Related: [[reference_xray_ensemble_corroboration_recall_collapse_2026_06_19]] (corrected) ·
[[reference_xray_corpus_continuous_and_gdt_tribal_plan_2026_06_19]] · [[feedback_xray_multi_print_split_before_ocr]].
