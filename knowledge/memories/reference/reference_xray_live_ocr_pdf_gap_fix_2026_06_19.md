---
name: reference_xray_live_ocr_pdf_gap_fix_2026_06_19
description: "The LIVE MCP OCR path (cad_live_blueprint_ocr / CADLiveBlueprintOcrAdapter) could NOT read PDFs at all (fail-loud, no multi-page) -- disconnected from the working all-pages CLI extractor. Fixed: U-PRINT-OCR-PDF + HARDEN."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_live_ocr_pdf_gap_fix_2026_06_19
---


slot:xray, 2026-06-19 (operator "continue upgrading and training the ocr/blueprint reading feature").

**THE GAP (the deeper sibling of the page-0-only grinder bug):** the production READ path
delta/round-trip/quote consumes -- `cad_live_blueprint_ocr` ->
`CADLiveBlueprintOcrAdapter.ocrPrint` (also the `ocrPrint` dep of
`CADRoundTripValidationEngine`) -- **fail-loud REJECTED PDFs** (PDF/TIFF were in
`UNSUPPORTED_FOLLOWUP_EXTS`, deferred to a NEVER-BUILT `U-PRINT-OCR-PDF` unit) and had
**no multi-page concept** (single image = one page). Meanwhile the proven all-pages
multi-page VLM extraction lived ONLY in the standalone CLI
(`scripts/run-ollama-vision-extract.mjs` `selectPages()`) + the nightly grinder. So the
LIVE MCP path was disconnected from the working extractor. Most JM/Docustrata prints are
multi-page PDFs -- **live-verified: real Docustrata bundles are 8pp and 10pp** (pages 0/2/7
rendered fine via pdf-to-png.py). A page-0-only / can't-read-PDF live path = read the
cover, miss the drawing = the operator's "delta missed dims clear to see" class.

**KEY INSIGHT (the reorientation lead that paid off):** the GRINDER being multi-page-correct
(commit d820c15936 fixed validate-perfect-parts; run-ollama-vision-extract was already
all-pages) does NOT mean the PRODUCTION read path is. Engines do NOT rasterize (PDF->page
is the caller's job). So the live MCP entry was the unaudited surface. Always trace the LIVE
consumer path (cadDispatcher cad_live_blueprint_ocr + businessDispatcher blueprint_to_quote
+ camDispatcher print_to_program_full), not just the trainer. (blueprint_to_quote takes a
PRE-computed analysis; print_to_program takes structured params; cad_pdf_blueprint_extract is
TEXT-based -- so cad_live_blueprint_ocr was the one PDF-raster surface, and it was broken.)

**FIX -- U-PRINT-OCR-PDF (commit 13557d84):** `ocrPrint` branches on `classifyPrintPath` kind:
- image (.png/.jpg/...): one analyze call (back-compat, UNCHANGED) -> pages=1.
- raster-doc (.pdf/.tif/.tiff): rasterize ALL pages (cap 12, grayscale, the
  grinder/validate-perfect-parts discipline) via the canonical `scripts/lib/pdf-to-png.py`,
  analyze each page via the injectable analyzer, UNION dims/features (dedup label|value|unit),
  report pagesTotal/pagesOcrd for honest partials (R12). Sequential per-page (Ollama
  serializes; must not hammer the GPU vs the live grinder). PdfRasterizer + analyzer are
  injectable -> hermetic tests (no subprocess, no GPU). PrintDimension gained optional
  `sourcePage`; PrintOcrResult gained `pagesTotal`/`pagesOcrd` (additive -- 3 importers
  unaffected). WIRED: the existing cad_live_blueprint_ocr action + round-trip ocrPrint dep
  inherit PDF support with NO dispatcher change.

**HARDEN -- U-PRINT-OCR-PDF-HARDEN (commit f2aa3e95):** all 3 scrutiny reviewers flagged the
same P2 -- cad_live_blueprint_ocr has no Zod schema + forwarded raw params as opts. Added
pure `sanitizeLiveOcrAdapterOptions`: clamps maxPages [1,12] + dpi [72,600] (raster DoS
guard), validates enums, coerces booleans, accepts explicit page but never defaults one,
and NEVER forwards analyzer/rasterizer (injection guard). Wired into the dispatcher case.

**VERIFIED:** 50 adapter tests (union proof: page0/1=cover 0 dims, page2=drawing 2 dims,
union=2 sourcePage:2; + zero-pages/pagecount-throw/partial/all-fail failure modes + dedup/
cap/single-page adversarial + 7 sanitizer cases) + 28 round-trip regression; tsc clean;
esbuild OK; 3-of-3 PASS (no P0/P1); live raster on real 8pp+10pp prints. Test rewritten to
the REAL BlueprintVisionResult contract (gdt_frames + title_block.confidence -- the prior
test asserted stale gdt_callouts/overall_confidence/ed.label and was red).

**PROCESS LESSON:** committing on the shared `H:/prism` tree, a peer's concurrent commit
clobbered my staged index ("no changes added"). Fix = atomic pathspec commit
`git commit -m ... -- <files>` (stages+commits the named paths in one op, ignores peer churn)
+ `[MAIN-FORCE]` in the command to pass git-add-lane-guard (line 432 escape). xray OCR work
goes [MAIN-FORCE] to cad-fusion-live-ms0 (live code lives there; slot/xray is 4107 behind).

Related: [[reference_xray_multipage_page0_only_bug_2026_06_19]] (the grinder sibling) ·
[[reference_xray_corpus_continuous_and_gdt_tribal_plan_2026_06_19]] ·
[[feedback_xray_multi_print_split_before_ocr]] · [[reference_xray_cad_dispatcher_primary_surface]].
NEXT backlog (U-XRAY-IMPROVE-BACKLOG 8199b56166): wire scan-preprocessing (--preprocess) into
the grinder; recall-first ensemble fusion (keep 1-of-N as AL candidate); region tiling for
dense pages; page-classify-gate the live adapter's pages (skip cover/table).
