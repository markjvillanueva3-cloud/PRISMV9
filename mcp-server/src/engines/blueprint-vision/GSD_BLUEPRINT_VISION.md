# GSD — Blueprint-Vision domain protocol (slot:xray)

> Domain-specific "Get Stuff Done" session protocol for the extraction pipeline. Sister to `mcp-server/data/docs/gsd/GSD_QUICK.md` (fleet session-lifecycle) — THIS doc is the **per-extraction operating procedure**. Built 2026-05-29 (U-PSGB-XRAY continuation), every asset verified on disk.
> **Provenance discipline:** the alpha seed hallucinated 21 engine names. Every engine/path/threshold below is on-disk-verified or sourced to a named shipped spec. Verify any name before relying ([[feedback_xray_verify_engine_name_before_reference]]).

## When this protocol fires
Any time slot:xray turns an unstructured input (blueprint PDF, raster scan, native CAD file) into structured PRISM data for a downstream consumer (charlie/quote, kilo/program, delta/CAD, quality/inspection).

## The extraction lifecycle (canonical order — deviation = a refuse)

### Stage 0 — INTAKE + classify
- Classify: raster blueprint (OCR+vision) · vector (SVG/DXF — parse direct) · native CAD (per-format parser) · photo-of-paper (deskew first, lower threshold).
- Detect units up front. JM Die STEP files are often **inch** (`CONVERSION_BASED_UNIT 25.4mm`) — never assume mm.

### Stage 1 — SOURCE-SHA DEDUP
- Dedup vs `state/shared/blueprint-accuracy-events.jsonl` (live stream) + date-suffixed `blueprint-extraction-*-<date>.jsonl`. Known SHA → STOP (already extracted). There is **no** single `blueprint-extraction-log.jsonl`.

### Stage 2 — MULTI-PRINT SPLIT (before any OCR)
- A Docustrata PDF is usually **multi-page** (per BLUEPRINT-OCR-TRAINING-MS1: ~96% multi-page, 5–10 prints/PDF, prints buried on pages 2+; a page-1-only pass missed 24,186 docs / 120K pages). **Split first, one extraction object per print.**
- Canonical splitter: `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf page-by-page; orchestrated by `docustrata-pipeline.py`, 7-stage cost-cascade). The container-split counts: phase21 split 8,154 containers → 36,638 single prints.
- ⚠ "96%" = multi-**page** (training doc); the 8,154→36,638 = multi-**print-container** split (docustrata pipeline). Don't conflate the two figures.

### Stage 3 — PER-PRINT EXTRACTION (tiered, confidence-scored)
- Tiered classifier (per training doc): image heuristic → Tesseract title-block OCR → vision-LLM, over ALL pages.
- Route by format: raster → `prism_cad:cad_pdf_blueprint_extract`; DXF/SVG → `cad_dxf_geom_parse`/`cad_svg_parse_polygons`; STEP → `cad_step_parse_file`; STL → `cad_stl_analyze`; FCStd → `cad_fcstd_parse`; F3D → `cad_f3d_parse`.
- Low confidence → `cad_pdf_pattern_rescue_extract` or vision-LLM (`scripts/lib/ollama-vision-extract-lib.mjs`).
- **Every RAG/vision extraction MUST cite ≥1 retrieved source** — no context → emit an explicit "low-confidence, no-priors" candidate, NEVER a hallucination.

### Stage 4 — CONFIDENCE GATE (shipped thresholds — see reconciliation note)
- **OCR per-field floor = 0.70** (shipped, PRINT-TO-INSPECTION-PIPELINE-V2): below it → operator-confirm dialog with the highlighted region.
- **CAD-fidelity < 0.85** → flag for operator review before continuing.
- Safety output (feed/speed → machine) → S(x) ≥ 0.98 (shop_floor tier) downstream.
- The drift guard `blueprint-accuracy-guard.mjs` HARD-BLOCKS when the conformal confidence bound widens **>20%** vs the rolling 50-sample window without a recalibration entry (`PRISM_BLUEPRINT_DRIFT_WIDEN_PCT`, default 20).
- ⚠ The seed's per-field "0.85 dims / 0.95 tol / 0.99 GD&T" tiering is a reasonable default but is **NOT corroborated by a shipped gate** — `0.70` is the verified operative floor. Treat per-field tiers as consumer-set until corroborated ([[reference_xray_confidence_thresholds_reconciled]]).

### Stage 5 — GD&T + TOLERANCE + UNIT NORMALIZATION
- GD&T callouts → `cad_gdt_callout_parse` + `cad_fcf_validate`; tie every FCF to its datum-3-2-1 schema (a bare FCF is meaningless). Composite/stacked frames feed `gdtstackupengine`.
- Normalize every dimension to **mm** at the boundary; imperial in the PRISM graph is forbidden.

### Stage 6 — CROSS-CHECK + GROUND-TRUTH DISCIPLINE
- Silent-empty-parse guard: cross-check geometry volume vs source-file size; flag if implausible (a parser's silent success is not a success).
- **Ground-truth is 4-tier stratified**: `confirmed` (ERP-shipped + measured) > `produced` > `quoted` > `inferred`. Historical S/F + dims from amateur programs are **DATA, not ground truth**. No extraction is ground truth without operator-confirm or a confirmed ERP match (`GroundTruthRegistryEngine` + `GroundTruthValidationEngine` — EXTEND, never recreate).

### Stage 7 — EMIT + HANDOFF (the consumer contracts)
- To charlie/quote: `prism_business:blueprint_to_quote`. To kilo/program: `prism_cam:print_to_program_full`.
- **To delta/CAD: honor the kilo→delta handoff contract** (`PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md`) — unit-gate (`reject`/`operator-confirm` blocks generation), part-class hint, `expectedFeatureGraph` (polarPatternCount, criticalTolerancesMustPropagate, minDimensionCount). STEP AP203/AP214 carry geometry ONLY (no GD&T) — GD&T survives via the orchestrator side-channel, never assume the format carries it.
- **LoRA/training export MUST anonymize** before any file leaves local FS: scrub customer names, part numbers, program content; operator-confirms the scrub. Blocklist customers: ITW, OPTIMAS, SFS, HOLO-KROME, ALCOA, Continental Midland.

### Stage 8 — LEDGER + CLOSED-LOOP
- Append a ledger entry; publish outcome via `xproc_outcome_publish {slot:'xray'}` (india learning loop); record actuals via `xproc_calibration_monitor_record`.

## Refuses (hard — from the xray soul)
OCR-without-split · confidence-blind output · GD&T-without-datum-tie · CAD-format conflation · skipping-mm-normalization · re-OCR-of-known-SHA · trusting-a-parser's-silent-success · enshrining-an-unverified-engine-name · treating-amateur-program-data-as-ground-truth · exporting-LoRA-without-anonymization.

## Verified engine surface (EXTEND, never recreate)
`BlueprintVisionOCREngine` · `BlueprintOCREngine` · `PDFBlueprintDimensionExtractorEngine` · `PDFBlueprintPatternRescueEngine` · `BlueprintExtractionRAGEngine` · `BlueprintProgramJoinEngine` · `GDTCalloutParserEngine` · `PrismEnhancedGDTEngine` · `FCFSyntaxValidatorEngine` · `GroundTruthRegistryEngine` · `GroundTruthValidationEngine` · `CrossProcessVisionTabularFusionEngine` · `PrintToProgramPipelineEngine` (stages 1–4+7) · `PrintToCADOrchestratorEngine` (5-stage) · `CADClassFeatureLibraryEngine` (`templateFor(partClass)`) · `PrintReadingEngine` · `SetupSheetFromGCodeEngine` (setup sheet from G-code, not CAM tree).

— Built 2026-05-29 by slot:xray. Companion: `CLAUDE.md` (scope), `MEMORY.md` (learnings), `PATHS.md` (atlas), `TOOLBELT.md` (tool patterns).
