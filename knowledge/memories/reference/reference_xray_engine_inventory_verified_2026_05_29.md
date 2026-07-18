---
name: reference_xray_engine_inventory_verified_2026_05_29
description: Verified real blueprint-vision engine names — the alpha-seed named 21 engines that don't exist
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_engine_inventory_verified_2026_05_29
---


slot:xray galaxy = `mcp-server/src/engines/blueprint-vision/`. The alpha seed CLAUDE.md (commit `d6e5e4109f`) named 21 `CAD*Engine` classes that DO NOT exist on disk (alpha-seed hallucination class — same as bravo/india caught). Verified-on-disk real engines (2026-05-29, 3 parallel agents):

- OCR: `BlueprintVisionOCREngine` (primary, 37.9K), `BlueprintOCREngine` (35.7K), `BlueprintOCRAdapter`, `CADLiveBlueprintOcrAdapter`, `ImageOCRPipelineEngine`, `OCRResultEngine`, `TesseractOCRBridgeEngine`, `MachineServiceTagOCREngine`.
- PDF-blueprint: `PDFBlueprintDimensionExtractorEngine` (→`cad_pdf_blueprint_extract`), `PDFBlueprintPatternRescueEngine` (→`cad_pdf_pattern_rescue_extract`), `BlueprintExtractionRAGEngine`.
- GD&T/tol: `GDTCalloutParserEngine`, `PrismEnhancedGDTEngine`, `FCFSyntaxValidatorEngine`, `ToleranceEngine`, `ToleranceAwareGenerationEngine`.
- Parsers: `DXFGeometryParserEngine`, `DXFParserEngine`, `FCStdNativeParserEngine`, `F3DSQLiteParserEngine`, `STLToVoxelGridEngine`. (STEP: action `cad_step_parse_file/string` — backing engine name unconfirmed.)
- Orchestration: `BlueprintToCADGenerationEngine`, `BlueprintToAllCADsOrchestratorEngine`, `BlueprintProgramJoinEngine`, `BlueprintCorpusHarvestEngine`, `BlueprintCoverageAuditEngine`, `BlueprintLoRABridgeEngine`, `BlueprintToQuoteBridgeEngine`.
- Feature-recog: `CADFeatureRecognitionEngine`, `CADFeatureClassifierEngine`, `FeatureRecognitionEngine`, `LatheTurningFeatureRecognizerEngine`.

Full map (format→engine→action) in the galaxy MEMORY.md. See [[feedback_xray_verify_engine_name_before_reference]].
