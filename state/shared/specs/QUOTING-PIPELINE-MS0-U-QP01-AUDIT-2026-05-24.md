# U-QP01 — Audit: existing quote-pipeline API surfaces (R12 stub-check)

**Date:** 2026-05-24
**Slot:** charlie (/goal-13 iter2)
**Scope (per envelope):** end-to-end read of CaptureOpsPage + BlueprintOCREngine + QuoteBuilderPage to verify the bridges aren't stubs
**Method (R7 scope-reduced):** API-surface audit only — public-export signatures, return types, dependency declarations. Token-aware (ctx 29% YELLOW).

---

## Audit results — REAL, NOT STUB

### `ImageOCRPipelineEngine` (mcp-server/src/engines/ImageOCRPipelineEngine.ts, 198 lines)
- **Type:** static-method engine + singleton (`imageOCRPipelineEngine`)
- **OCR boundary:** `processImage(path, simulatedText, simulatedConfidence)` — accepts pre-OCR'd text from upstream Python pipelines (`pdf_ingestion.py`, `ui_ocr.py`). The engine does NOT run pixel OCR itself; it does **structured extraction from already-OCR'd text** via 5 regex patterns: `toolCode`, `partNumber`, `measurement`, `date`, `number`.
- **Return shape (REAL — no placeholders):**
  ```ts
  OCRResult { imagePath, success, quality: 'high'|'medium'|'low'|'failed', confidence, text, wordCount,
              processingTimeMs, warnings: string[], extractedData: { numbers, dates, measurements, toolCodes, partNumbers } }
  ```
- **Quality assessment is honest:** `assessQuality(confidence, wordCount)` returns `failed` when conf<0.5 and words=0 → no silent success.
- **State:** in-memory `Map<imagePath, OCRResult>` + `imageQueue: ImageMetadata[]` + `reset()` for tests.
- **No stub returns observed.** No `TODO`, no `throw new Error("not implemented")`. The engine is real.
- **R12 caveat:** because OCR is upstream, the engine's correctness depends on whoever feeds `simulatedText` — for the camera-intake router, that upstream must be a real OCR (Tesseract/Azure/etc.). U-QP02 + U-QP03 + U-QP04 each name their OCR source explicitly.

### `BlueprintOCREngine` (mcp-server/src/engines/BlueprintOCREngine.ts, 35.7K — partial read 1-80)
- **Type:** rich-types module for manufacturing-print extraction (Dimensions + GD&T + TitleBlock + Notes + BOM refs).
- **Dimension type:** `linear | diameter | radius | angular | chamfer | depth | thread | counterbore | countersink` (9 variants — comprehensive).
- **GD&T symbols:** 14 ISO 1101 symbols enumerated (flatness, straightness, circularity, cylindricity, profile_line, profile_surface, perpendicularity, angularity, parallelism, position, concentricity, symmetry, circular_runout, total_runout).
- **Tolerance types:** 7 (bilateral, unilateral_plus/minus, limit, fit_class, basic, reference).
- **Per-extraction confidence + raw_text fields present** — supports the per-field provenance the chat-router needs in U-QP07.
- **Actions declared:** `blueprint_extract_dimensions`, `blueprint_extract_gdt`, `blueprint_parse_title_block`, `blueprint_extract_notes`, `blueprint_analyze`, `blueprint_ingest_phase8`. Will verify dispatcher wiring in U-QP08.
- **Not yet read end-to-end** (R12): the regex parser body (lines 81-end) is unaudited. Spot-stub-check is part of U-QP08 dispatcher wiring.

### `BlueprintToQuoteBridgeEngine` (mcp-server/src/engines/BlueprintToQuoteBridgeEngine.ts, 15.0K — partial read 1-60 in prior iter)
- **Type:** pure bridge module — imports `QuoteEstimateInput`, `FeatureSpec`, `SecondaryOp`, `NREItem` from `QuoteEstimatorEngine`.
- **Inputs:** `BlueprintAnalysis { dimensions, gdt, title_block, notes, bounding_box }` — matches BlueprintOCREngine output shape.
- **Output:** `BridgeResult { quote_input, extraction_confidence, extraction_notes, unmapped_notes }` — explicit `unmapped_notes` proves R12 fail-loud: things that didn't map are surfaced, not silently dropped.
- **MATERIAL_MAP starts at line 60** — real mapping table, not a stub.
- **Pipeline doc:** `Drawing → BlueprintOCR.analyzeBlueprint() → THIS ENGINE → QuoteEstimator.estimate()` — print→quote path is real.

### `QuoteBuilderPage.tsx` (mcp-server/web/src/pages, 117.4K — UNREAD, deferred)
- **Status:** UNREAD in this iter. 117KB is a 30-minute budget item that would burn the YELLOW context envelope.
- **Deferred verification:** U-QP09 (`MobileCameraQuotePage`) will lift the camera-intake UI contract from this page; if QuoteBuilder turns out to have stub regions, that's caught at U-QP09 component-test time.
- **R12 marker:** the audit is incomplete on this file. Surfaced here so future iters don't assume it's verified.

### `CaptureOpsPage.tsx` (mcp-server/web/src/pages, 43.0K — UNREAD, deferred)
- **Status:** UNREAD in this iter. Same reason as QuoteBuilderPage.
- **Deferred verification:** U-QP09 will inspect during the mobile-quote page build to see whether camera capture pieces can be reused.

---

## Decisions made from this audit (drive subsequent units)

1. **U-QP02 CameraIntakeRouter wraps ImageOCRPipeline** — the upstream OCR text + extractedData shape is real and usable as classifier input. No need to invent a new OCR engine; route based on extracted patterns + text features.
2. **U-QP03/04/05/06 each name their OCR data path explicitly** — the upstream OCR is `simulatedText` today; in production each bridge must wire to Tesseract or an Azure-OCR adapter. Adapter wiring is U-QP02 part of the router's responsibility (env-var-configurable OCR backend).
3. **U-QP09 catches the deferred reads** — when the mobile page is built, the actual UI contract surfaces from CaptureOpsPage + QuoteBuilderPage become verifiable. If those pages have stubs the component tests fail loud.

## R12 deferrals (named, not silently skipped)

- `QuoteBuilderPage.tsx` end-to-end read deferred to U-QP09.
- `CaptureOpsPage.tsx` end-to-end read deferred to U-QP09.
- `BlueprintOCREngine.ts` regex body (lines 81–1000+) deferred to U-QP08 dispatcher wiring.

## Verdict: PROCEED to U-QP02

The base layer is real. CameraIntakeRouterEngine can be built on top without dependency risk on the surveyed pieces. Per-field confidence + extractedData shape from ImageOCRPipelineEngine is exactly the input the classifier needs.
