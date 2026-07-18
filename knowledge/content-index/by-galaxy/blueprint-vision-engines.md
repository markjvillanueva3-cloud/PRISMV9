---
name: blueprint-vision-engines
description: Strategic categorized engine digest for the blueprint-vision galaxy (OCR + blueprint reading + CAD-file data extraction + GD&T/tolerance parse).
type: reference
galaxy: blueprint-vision
node_type: memory
---

# blueprint-vision galaxy -- engine digest

## Overview

The blueprint-vision galaxy (slot xray) turns unstructured inputs -- raster
blueprints, scanned prints, multi-print PDFs, and native CAD files -- into
structured PRISM data (dimensions, tolerances, GD&T callouts, geometry,
materials, feature trees). It owns VLM-ensemble OCR, multi-print PDF split
discipline, per-field confidence gating, native CAD-format readers (DXF/SVG,
STEP/AP242, STL, Fusion .f3d, FreeCAD .fcstd), GD&T/FCF parsing tied to a
datum schema, the ground-truth corpus pipeline (extract -> validate ->
register), and the blueprint -> CAD / quote / program / LoRA bridge surfaces.
50 blueprint-vision-owned engines live FLAT under `mcp-server/src/engines/*.ts`
(the galaxy subdir holds doctrine markdown only). The primary action surface is
`cadDispatcher.ts` (`prism_cad`, ~40 blueprint-vision actions:
`cad_pdf_blueprint_extract`, `cad_gdt_*`, `cad_tolerance_*`, `cad_dxf_*`,
`cad_f3d_*`, `cad_fcstd_*`, `cad_stl_analyze`, `blueprint_rag_*`,
`blueprint_lora_*`, `blueprint_coverage_*`, `feature_recognize`), with secondary
surfaces on `businessDispatcher` (blueprint_to_quote), `qualityDispatcher`
(blueprint_compare_revisions / inspection_plan), `camDispatcher`
(print_to_program_full), and `resourceExtractionDispatcher` (ocr_process).
EXCLUDES (per doctrine): CAD geometry authoring -> delta; CAM toolpath -> kilo;
quote pricing logic -> charlie; G-code emission -> echo; feature-to-strategy
mapping -> cam galaxy.

## Strategic categories

### OCR core (raster/vision + text)
- `BlueprintVisionOCREngine.ts` -- primary vision-LLM (Ollama-first) blueprint OCR
- `BlueprintOCREngine.ts` -- structured-regex OCR over pre-extracted text
- `BlueprintOCRAdapter.ts` -- OCR adapter / result normalization
- `CADLiveBlueprintOcrAdapter.ts` -- live blueprint OCR adapter (`cad_live_blueprint_ocr`)
- `ImageOCRPipelineEngine.ts` -- image OCR pipeline
- `OCRResultEngine.ts` -- OCR result model
- `TesseractOCRBridgeEngine.ts` -- Tesseract engine bridge
- `MachineServiceTagOCREngine.ts` -- machine service-tag OCR

### PDF-blueprint dimension extraction
- `PDFBlueprintDimensionExtractorEngine.ts` -- dim extraction from PDF blueprint
- `PDFBlueprintPatternRescueEngine.ts` -- low-confidence pattern rescue
- `BlueprintExtractionRAGEngine.ts` -- RAG-assisted extraction

### GD&T / FCF callout parse + validate
- `GDTCalloutParserEngine.ts` -- base GD&T FCF callout parser
- `PrismEnhancedGDTEngine.ts` -- enriched FCF (symbol metadata + CAM strategy + MMC/LMC bonus)
- `PrismGDTFCFParserEngine.ts` -- GD&T FCF parser variant
- `FCFSyntaxValidatorEngine.ts` -- feature-control-frame syntax validator
- `GDTStackupEngine.ts` -- GD&T-aware stackup

### Tolerance analysis + extraction
- `ToleranceEngine.ts` -- ISO 286 IT-grade / fit / stackup / Cpk
- `ToleranceExtractionEngine.ts` -- tolerance/GD&T callout parse -> per-feature strategy
- `ToleranceAwareGenerationEngine.ts` -- tolerance-aware generation
- `ToleranceStackEngine.ts` - `ToleranceStackUpEngine.ts` -- stackup variants
- `MaterialCalloutParserEngine.ts` -- material spec callout parse
- `ToolCalloutCardEngine.ts` -- tool callout card extraction

### CAD-format native readers
- `DXFGeometryParserEngine.ts` -- arc-preserving DXF/STEP/IGES parser (WEDM contours)
- `DXFParserEngine.ts` -- DXF/SVG -> 2D polygon boundaries
- `F3DSQLiteParserEngine.ts` -- Fusion 360 .f3d/.f3z SQLite timeline parser
- `FCStdNativeParserEngine.ts` -- FreeCAD .fcstd ZIP+XML native parser
- `STLToVoxelGridEngine.ts` -- STL -> voxel grid analyze (`cad_stl_analyze`)
- `STEPAP242PMIExtractorEngine.ts` -- STEP AP242 PMI (GD&T/datums/PMI) extractor
- `CADModelDimensionExtractorEngine.ts` -- CAD-model dimension extraction
- `CAD2DDrawingEngine.ts` -- CAD 2D drawing handling
- `Drawing2DExtractionEngine.ts` -- 2D drawing (DXF) real-entity extraction

### Feature recognition + binding
- `CADFeatureRecognitionEngine.ts` -- machining-feature recognition on geometry
- `FeatureRecognitionEngine.ts` -- feature recognition core
- `LatheTurningFeatureRecognizerEngine.ts` -- turning-feature recognizer
- `PrintReadingEngine.ts` -- print reading / feature binding
- `EDMDrawingInterpretationEngine.ts` -- WEDM drawing interpretation (feature classify + tol->pass)

### Ground-truth corpus pipeline
- `GroundTruthBatchExtractor.ts` -- 4-stage GT pipeline orchestrator (20K-file corpus)
- `GroundTruthFeatureTreeExtractor.ts` -- canonical feature-tree normalizer
- `GroundTruthValidationEngine.ts` -- corpus-integrity gate (8 per-bundle checks + quarantine)
- `GroundTruthRegistryEngine.ts` -- queryable indexed GT corpus (5 compound indexes)

### Orchestration + bridges (blueprint -> CAD / program / quote / LoRA)
- `PrintToCADOrchestratorEngine.ts` -- print -> CAD orchestrator (GD&T side-channel)
- `BlueprintToCADGenerationEngine.ts` -- blueprint -> CAD reconstruction
- `BlueprintToAllCADsOrchestratorEngine.ts` -- blueprint -> all-CAD-formats orchestrator
- `BlueprintProgramJoinEngine.ts` -- join extracted blueprint pages -> program/CAD files
- `BlueprintToQuoteBridgeEngine.ts` -- blueprint -> quote bridge (-> charlie)
- `BlueprintLoRABridgeEngine.ts` -- LoRA training-set bridge (-> india)
- `BlueprintCorpusHarvestEngine.ts` -- corpus harvest
- `BlueprintCoverageAuditEngine.ts` -- coverage audit
- `EmailPrintIntakeEngine.ts` -- email print intake

## Key engines (detailed)

### DXFGeometryParserEngine.ts
Arc-preserving DXF/STEP/IGES parser for the Wire EDM pipeline. Unlike
`DXFParserEngine` (which discretizes all geometry to point arrays), it preserves
line/arc segment semantics required for G02/G03 generation: supports LINE, ARC,
CIRCLE, LWPOLYLINE (bulge->arc), SPLINE->biarc, ELLIPSE->arc, and INSERT/BLOCK
flattening, running a full pipeline (spline-to-arc 0.005mm chord, gap closure,
duplicate removal, CCW/CW winding normalization, self-intersection detection) to
`WireEDMContour[]`.
Path: `mcp-server/src/engines/DXFGeometryParserEngine.ts`. Notable exports:
`Point2D`, `LineSegment`, `parseDXFGroups` (re-used by `Drawing2DExtractionEngine`).

### BlueprintProgramJoinEngine.ts
Joins Phase-8-extracted blueprint pages (cleaned JSONL with `part_numbers_clean`)
to JM Die program/CAD files indexed by `program-labels.json` + the CAD
`master-index.json`, emitting a join JSONL that groups blueprint pages + matching
program/CAD files under a normalized part number with a match-confidence tag
(exact | loose | miss). Streams the phase8 JSONL line-by-line (readline) so
memory stays bounded regardless of corpus size.
Path: `mcp-server/src/engines/BlueprintProgramJoinEngine.ts`. Notable exports:
`ProgramFileRef`.

### GroundTruthRegistryEngine.ts
Indexed, queryable corpus over the ground-truth bundles produced by
`GroundTruthBatchExtractor`. Builds five compound indexes (byFileId,
byCustomerLower, byFormat, byMachineCategory, byComplexityTier) from a tree of
`bundle.json` manifests; customer + machine category are inferred from the JM Die
path convention, complexity tier from feature count + dimensional envelope.
Persists via `dumpManifest()`/`loadManifest()` (Zod-validated JSON, indexes
rebuilt from entries on load).
Path: `mcp-server/src/engines/GroundTruthRegistryEngine.ts`. Shortcode E2508.

### BlueprintVisionOCREngine.ts
Vision-LLM-powered blueprint OCR (free Ollama-first via `llmEngine.queryVision`,
Claude vision backup) -- actual image understanding, NOT regex text parsing.
Takes a photo/scan and extracts dimensions+tolerances, GD&T callouts, material
specs, surface finish, geometry, title-block, and notes; output types are
interface-compatible with `BlueprintOCREngine` for downstream WEDM/mill/turn
pipelines.
Path: `mcp-server/src/engines/BlueprintVisionOCREngine.ts`. Marked WIRE-EXEMPT
(consumed by direct import from `PrintToFusion360Bridge` + OCR pipelines). Notable
exports: `BlueprintAnalysis`, `ExtractedDimension`, `ExtractedGDT`, `TitleBlockData`.

### BlueprintOCREngine.ts
Text-mode blueprint reading: structured regex parsing over OCR'd / PDF-extracted
text (does NOT perform OCR itself -- expects pre-extracted text). Extracts
dimension callouts (linear/angular/radial/diameter), GD&T symbols + frames,
title-block metadata, notes/annotations, and BOM references.
Path: `mcp-server/src/engines/BlueprintOCREngine.ts`. Actions:
`blueprint_extract_dimensions`, `blueprint_extract_gdt`,
`blueprint_parse_title_block`, `blueprint_analyze`, `blueprint_ingest_phase8`.
Notable exports: `DimensionType`, `GDTSymbol`, `ToleranceType`.

### EDMDrawingInterpretationEngine.ts
WEDM-P2P MS1 drawing-interpretation consolidation (U01-U06): EDM feature
classifier, GD&T extraction for EDM context, tolerance/finish -> pass-count
mapper, material-callout conductivity/machinability parser, part-thickness
speed-correction analyzer, and process-selection advisor (wire vs sinker vs
alternative). Cites Handbook of Wire EDM, ISO 4287, Benedict, Jameson.
Path: `mcp-server/src/engines/EDMDrawingInterpretationEngine.ts`. Actions:
`interpret`, `classify_features`, `recommend_process`, `calculate_passes`.
Notable exports: `PartFeature`.

### ToleranceEngine.ts
ISO 286-1:2010 tolerance analysis: IT-grade lookup (tolerance width for
nominal size + grade), shaft/hole fit analysis (clearance/transition/
interference), tolerance stack-up (worst case + RSS), and process capability
(Cpk/Cp). All data from ISO 286-1:2010 Tables 1-5.
Path: `mcp-server/src/engines/ToleranceEngine.ts`. Notable exports:
`calculateITGrade`, `analyzeShaftHoleFit`, `toleranceStackUp`, `calculateCpk`.

### GroundTruthValidationEngine.ts
Corpus-integrity gate for the ground-truth bundles: walks
`{outputRoot}/{fileId}/` dirs, runs eight independent per-bundle integrity checks
(bundle-json-missing/parse-error/schema-invalid, step-missing/not-iso-10303,
feature-tree missing/parse-error/empty, dim-signature missing/parse-error/
zero-envelope/nan, screenshot-missing), and emits a ValidationReport whose
quarantineList enumerates every fileId to re-extract or exclude. Each issue maps
to a stable code so callers route automated repairs without string-parsing.
Path: `mcp-server/src/engines/GroundTruthValidationEngine.ts`. Composes (not
duplicates) `GroundTruthBatchExtractor` + `GroundTruthRegistryEngine`.

### DXFParserEngine.ts
Parses DXF and SVG files into 2D polygon boundaries (`Polygon2D[]`). Handles DXF
LINE/ARC/CIRCLE/LWPOLYLINE(bulge)/ELLIPSE/SPLINE and SVG path/rect/circle/
ellipse/polygon/polyline + transforms; algorithms include arc discretization, De
Boor SPLINE evaluation, cubic-Bezier discretization, shoelace area, and
winding-number inside/outside classification.
Path: `mcp-server/src/engines/DXFParserEngine.ts`. Notable exports: `Point2D`,
`Polygon2D`, `ParseResult`. Actions: `cad_dxf_parse_polygons`, `cad_svg_parse_polygons`.

### ToleranceExtractionEngine.ts
Tolerance & GD&T parsing for the turning pipeline: parses bilateral/unilateral
tolerances, fit notation (H7/g6 ISO 286 decomposition), GD&T frames, and ISO
2768-m general tolerances, then converts them to per-feature tolerance objects
with machining-strategy implications (e.g. tol < 0.01mm -> grinding; runout ->
between-centers support). Cites ISO 286-1, ISO 2768-1/2, ASME Y14.5-2018, ISO 1302.
Path: `mcp-server/src/engines/ToleranceExtractionEngine.ts`. Milestone
LATHE-PRO-MS-1 U-LPI03.

### GroundTruthBatchExtractor.ts
Orchestrates the full 4-stage ground-truth pipeline across the ~20K-file CAD
corpus with bounded concurrency (default 4 workers), atomic checkpointing,
idempotent resume (per runId), and a per-format coverage report. Per file: STEP
export -> feature tree -> dimensional signature -> screenshots -> a per-file
`bundle.json` manifest. Statuses ok/partial/failed/skipped; per-task error
isolation (one failing file never aborts the batch); atomic tmp+rename writes.
Path: `mcp-server/src/engines/GroundTruthBatchExtractor.ts`. Shortcode E2507.

### STEPAP242PMIExtractorEngine.ts
Product Manufacturing Information extraction from STEP AP242 (ISO 10303-242):
extracts GD&T, datums, tolerances, and surface texture, linking PMI annotations
to geometric features for downstream WEDM processing. This is the side-channel
that carries GD&T where plain STEP AP203/AP214 does not.
Path: `mcp-server/src/engines/STEPAP242PMIExtractorEngine.ts`. Notable exports:
`DatumReference`, `ToleranceValue`, `GeometricTolerance`. Milestone
MS-P1.5-ONESHOT/U-P1.5-OS-02.

### GroundTruthFeatureTreeExtractor.ts
Canonical JSON feature-tree normalizer -- converts heterogeneous CAD parser
output into ONE Zod-validated feature-tree schema so the 20,006-file GT corpus
speaks a single vocabulary (Sketch/Extrude/Revolve/Sweep/Loft/Fillet/Chamfer/
Hole/Pattern/Mirror/Shell/Body/Component/Spreadsheet/Other). Composes
`FCStdNativeParserEngine` + `F3DSQLiteParserEngine` + STEP fallback; has a mock
mode (PRISM_CAD_MOCK=1) for CI without a CAD install.
Path: `mcp-server/src/engines/GroundTruthFeatureTreeExtractor.ts`. Shortcode E2504.

### PrismEnhancedGDTEngine.ts
Enriches the base FCF parser (`gdtCalloutParserEngine`) with per-symbol metadata
(description/application/measurement-method), CAM strategy interpretation
(FCF -> drilling/facing/turning with tolerance branching), MMC/LMC bonus-
tolerance computation, and the ASME Y14.5 position-deviation formula
(2*sqrt(dx^2+dy^2+dz^2)). Composition only -- delegates FCF parse to the base
parser. Covers 14 GD&T symbols + 9 modifier-metadata blocks (base parser
recognizes 4 modifiers in text; 5 are metadata-only pending parser extension).
Path: `mcp-server/src/engines/PrismEnhancedGDTEngine.ts`. Errors-in-result (never
thrown). Milestone BLUEPRINT-OCR-TRAINING-MS1/U1.

### FCStdNativeParserEngine.ts
Direct ZIP+XML .FCStd parser (no FreeCAD launch required): reads Document.xml
(object tree/properties/expressions) via a purpose-built regex scanner (avoids a
full DOM parser on this safety-critical server), skipping .brp BRep binaries and
thumbnails. Supports FreeCAD 0.19/0.20/0.21/1.0 (schema differs across versions).
Path: `mcp-server/src/engines/FCStdNativeParserEngine.ts`. Shortcode E2502.
Actions: `cad_fcstd_parse`, `cad_fcstd_parse_buffer`. Notable export:
`AtomicValue<T>` (local), `FCStdParseResult`.

## Full engine index

Engines whose one-liner was NOT header-verified this pass are marked
"(name-derived)". The 15 in "Key engines (detailed)" above were header-read.

| Engine | Category | One-line |
|--------|----------|----------|
| BlueprintVisionOCREngine.ts | OCR core | Vision-LLM (Ollama-first) blueprint OCR -> structured dims/GD&T/title-block |
| BlueprintOCREngine.ts | OCR core | Structured-regex OCR over pre-extracted print text |
| BlueprintOCRAdapter.ts | OCR core | OCR adapter / result normalization (name-derived) |
| CADLiveBlueprintOcrAdapter.ts | OCR core | Live blueprint OCR adapter (cad_live_blueprint_ocr) (name-derived) |
| ImageOCRPipelineEngine.ts | OCR core | Image OCR pipeline (name-derived) |
| OCRResultEngine.ts | OCR core | OCR result model (name-derived) |
| TesseractOCRBridgeEngine.ts | OCR core | Tesseract engine bridge (name-derived) |
| MachineServiceTagOCREngine.ts | OCR core | Machine service-tag OCR (name-derived) |
| PDFBlueprintDimensionExtractorEngine.ts | PDF-blueprint extraction | Dimension extraction from PDF blueprint (name-derived) |
| PDFBlueprintPatternRescueEngine.ts | PDF-blueprint extraction | Low-confidence OCR pattern rescue (name-derived) |
| BlueprintExtractionRAGEngine.ts | PDF-blueprint extraction | RAG-assisted extraction (name-derived) |
| GDTCalloutParserEngine.ts | GD&T / FCF | Base GD&T FCF callout parser (name-derived) |
| PrismEnhancedGDTEngine.ts | GD&T / FCF | Enriched FCF: symbol metadata + CAM strategy + MMC/LMC bonus |
| PrismGDTFCFParserEngine.ts | GD&T / FCF | GD&T FCF parser variant (name-derived) |
| FCFSyntaxValidatorEngine.ts | GD&T / FCF | Feature-control-frame syntax validator (name-derived) |
| GDTStackupEngine.ts | GD&T / FCF | GD&T-aware tolerance stackup (name-derived) |
| ToleranceEngine.ts | Tolerance | ISO 286 IT-grade / fit / stackup / Cpk |
| ToleranceExtractionEngine.ts | Tolerance | Tolerance/GD&T callout parse -> per-feature turning strategy |
| ToleranceAwareGenerationEngine.ts | Tolerance | Tolerance-aware generation (name-derived) |
| ToleranceStackEngine.ts | Tolerance | Tolerance stackup variant (name-derived) |
| ToleranceStackUpEngine.ts | Tolerance | Tolerance stackup variant (name-derived) |
| MaterialCalloutParserEngine.ts | Tolerance | Material spec callout parse (name-derived) |
| ToolCalloutCardEngine.ts | Tolerance | Tool callout card extraction (name-derived) |
| DXFGeometryParserEngine.ts | CAD-format readers | Arc-preserving DXF/STEP/IGES parser -> WireEDMContour[] |
| DXFParserEngine.ts | CAD-format readers | DXF/SVG -> 2D polygon boundaries |
| F3DSQLiteParserEngine.ts | CAD-format readers | Fusion 360 .f3d/.f3z SQLite timeline parser (name-derived) |
| FCStdNativeParserEngine.ts | CAD-format readers | FreeCAD .fcstd ZIP+XML native parser |
| STLToVoxelGridEngine.ts | CAD-format readers | STL -> voxel grid analyze (cad_stl_analyze) (name-derived) |
| STEPAP242PMIExtractorEngine.ts | CAD-format readers | STEP AP242 PMI (GD&T/datums/PMI) extractor |
| CADModelDimensionExtractorEngine.ts | CAD-format readers | CAD-model dimension extraction (name-derived) |
| CAD2DDrawingEngine.ts | CAD-format readers | CAD 2D drawing handling (name-derived) |
| Drawing2DExtractionEngine.ts | CAD-format readers | 2D drawing (DXF) real-entity extraction (name-derived) |
| CADFeatureRecognitionEngine.ts | Feature recognition | Machining-feature recognition on geometry (name-derived) |
| FeatureRecognitionEngine.ts | Feature recognition | Feature recognition core (name-derived) |
| LatheTurningFeatureRecognizerEngine.ts | Feature recognition | Turning-feature recognizer (name-derived) |
| PrintReadingEngine.ts | Feature recognition | Print reading / feature binding (name-derived) |
| EDMDrawingInterpretationEngine.ts | Feature recognition | WEDM drawing interpretation: feature classify + tol->pass |
| GroundTruthBatchExtractor.ts | Ground-truth pipeline | 4-stage GT pipeline orchestrator over ~20K-file CAD corpus |
| GroundTruthFeatureTreeExtractor.ts | Ground-truth pipeline | Canonical feature-tree normalizer (one vocabulary) |
| GroundTruthValidationEngine.ts | Ground-truth pipeline | Corpus-integrity gate: 8 per-bundle checks + quarantine |
| GroundTruthRegistryEngine.ts | Ground-truth pipeline | Queryable indexed GT corpus (5 compound indexes) |
| PrintToCADOrchestratorEngine.ts | Orchestration + bridges | Print -> CAD orchestrator (carries GD&T side-channel) (name-derived) |
| BlueprintToCADGenerationEngine.ts | Orchestration + bridges | Blueprint -> CAD reconstruction (name-derived) |
| BlueprintToAllCADsOrchestratorEngine.ts | Orchestration + bridges | Blueprint -> all-CAD-formats orchestrator (name-derived) |
| BlueprintProgramJoinEngine.ts | Orchestration + bridges | Join extracted blueprint pages -> program/CAD files |
| BlueprintToQuoteBridgeEngine.ts | Orchestration + bridges | Blueprint -> quote bridge (-> charlie) (name-derived) |
| BlueprintLoRABridgeEngine.ts | Orchestration + bridges | LoRA training-set bridge (-> india) (name-derived) |
| BlueprintCorpusHarvestEngine.ts | Orchestration + bridges | Blueprint corpus harvest (name-derived) |
| BlueprintCoverageAuditEngine.ts | Orchestration + bridges | Extraction coverage audit (name-derived) |
| EmailPrintIntakeEngine.ts | Orchestration + bridges | Email print intake (name-derived) |

_50 blueprint-vision-owned engines. Header-verified: 15 (detailed above);
remaining 35 are name-derived + doctrine-grounded (PATHS.md + CLAUDE.md,
disk-confirmed 2026-05-29 by 3 parallel inventory agents). All at
`mcp-server/src/engines/*.ts`; the galaxy subdir holds doctrine markdown only.
Excludes engines owned by other galaxies (HyperMill/Fusion CAM extractors ->
kilo/cam; Lathe/Mill/WEDM print-to-program emitters -> whiskey/foxtrot/mike;
Post/Vendor/Handbook extractors -> echo/lima; business-doc extractors -> hotel)._
