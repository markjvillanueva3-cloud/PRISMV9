---
name: blueprint-vision-knowledge-index
type: architecture
domain: blueprint-vision
audience: [xray, delta, kilo, charlie, juliett, india]
authored_by: xray
authored_on: 2026-05-29
related:
  - blueprint-vision-galaxy
  - blueprint-vision-multi-print-discipline
  - blueprint-vision-extraction-confidence
  - open-source-vision-options-for-blueprint-ocr
  - print-to-program-pipeline-canonical
---

# Blueprint-Vision Knowledge Index (slot:xray)

**The single compiled entry point** for every blueprint-vision wiki page, tribal tip, memory, data store, and engine surface. Query this first (`/wiki-query blueprint-vision-knowledge-index`) before fanning out — it is what `xray-blueprint-domain-inject.mjs` points at. Built 2026-05-29 (U-PSGB-XRAY), every reference on-disk-verified.

## 1. Wiki entries (10 — all in `knowledge/wiki/architecture/`)
- [[blueprint-vision-galaxy]] — galaxy charter (pipeline + PSN edges + standing gaps).
- [[blueprint-vision-multi-print-discipline]] — split before OCR; 8,154→36,638 container split; "96%"=multi-page (don't conflate).
- [[blueprint-vision-extraction-confidence]] — verified shipped gates: OCR 0.70 floor / CAD-fidelity 0.85 / S(x) 0.98 / >20% conformal-drift block.
- [[open-source-vision-options-for-blueprint-ocr]] — free vision/OCR alternatives to Claude Vision (eDOCr2 / Tesseract / vision-LLM).
- [[print-to-program-pipeline-canonical]] — the extraction→program pipeline.
- [[domain-blueprint]] · [[domain-pdf]] · [[domain-tolerance]] — per-domain engine overviews.
- [[f2-pdf-highlights-wire]] · [[cad-cam-resources-pdf-index]] — PDF highlight + resource-index wiring.
- [[lessons/cad-blueprint-revolve-2475-037]] — JM Die 2475-037 live-build lesson (canonical test print).
- `lessons/pdf-extract-*.md` (~34 leaves) — per-corpus extraction lessons (lima/xray).

## 2. Tribal knowledge
- **slot:xray corpus** — `state/shared/blueprint-vision-tribal-corpus.jsonl` (7 tips: verify-on-disk · split-before-OCR · confidence-floor-0.70 · pypdf-path · silent-empty-guard · no-native-reader-gaps · mm/inch-normalize).
- **code-tribal callout-classification** (`knowledge/wiki/code-tribal/`): `blueprint-ocr-operator-wisdom.md` + 11 `blueprint-dim-*.md` (diameter/radius/linear/note/material-callout/surface-finish/thread-callout/gdt-positional/gdt-profile/gdt-runout/other) — how to read each callout class off a drawing.
- **print-reading store** — `state/shared/print-reading-tribal-tips.jsonl` (49KB; family-WH- floor patterns, per-family extraction floors).
- Adjacent math/quality: `code-tribal/math-cad-geometry-nurbs-gdt.md` · `part-setup-tolerance-stack-up-methods.md` · `quality-first-article-inspection-and-spc-cadence.md`.

## 3. Memories (Obsidian — `C:/.../memory/` + `knowledge/memories/`)
- [[reference_xray_engine_inventory_verified_2026_05_29]] — real engine names (21 seed phantoms corrected).
- [[reference_xray_confidence_thresholds_reconciled]] — shipped 0.70 floor, not seed 0.85/0.95/0.99.
- [[reference_xray_docustrata_96pct_unverified]] — 96%=multi-page vs container-split nuance.
- [[reference_xray_jm_die_print_corpus_paths]] · [[reference_xray_blueprint_extraction_ledgers]] · [[reference_xray_cad_dispatcher_primary_surface]] · [[reference_xray_pypdf_canonical_extractor_path]] · [[reference_xray_no_native_reader_gaps]].
- [[feedback_xray_verify_engine_name_before_reference]] · [[feedback_xray_multi_print_split_before_ocr]] · [[feedback_xray_per_field_confidence_mandatory]].
- Anchor: [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]] (21KB master atlas) · [[reference_docustrata_pipeline_2026_05_16]] · [[feedback_use_lima_pypdf_page_extractor]].

## 4. Protocol + galaxy docs
- **GSD** — `mcp-server/src/engines/blueprint-vision/GSD_BLUEPRINT_VISION.md` (8-stage extraction SOP).
- **Galaxy** — `mcp-server/src/engines/blueprint-vision/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`.
- **Soul** — `state/shared/slot-souls/xray.md`. **Skill** — `/extract-xray`.

## 5. Data stores for FAST SEARCH (juliett-owned — search, do NOT re-OCR · R8)
> **juliett owns every persistence surface; xray SEARCHES these, never re-extracts the paid-for corpus.** This is the xray↔juliett wiring — see [[reference_xray_juliett_database_wiring]].
- **`mcp-server/data/jm-die-database/`** — consolidated DocuStrata + JM-file DB (`manifest.json` + `.index/*.jsonl`; 257,992 files; built by `scripts/build-jm-die-database.mjs`). **THE fast-search surface for prior prints/programs.**
- **`H:/PRISM/Docustrata/.index/jm-die-index-v2.json`** — the docustrata join index.
- **Blueprint ledgers** — `state/shared/blueprint-accuracy-events.jsonl` (dedup), `blueprint-extraction-*-2026-05-24.jsonl`, `blueprint-accuracy-state.json`.
- **`mcp-server/data/state/cad-cam-resources-pdf-index.json`** (1MB) · `PDF_RESOURCE_MANIFEST.json` · `extraction-log.json`.
- **Qdrant collections** (juliett-owned via `QdrantMemoryEngine`) — memory/wiki/tribal/code-symbol embeddings; the semantic-search backbone for blueprint tribal + wiki.

## 6. Engine + dispatcher surface (route, don't reimplement)
- Primary: `BlueprintVisionOCREngine`, `PDFBlueprintDimensionExtractorEngine`, `PDFBlueprintPatternRescueEngine`, `GDTCalloutParserEngine`, `PrismEnhancedGDTEngine`, `FCFSyntaxValidatorEngine`, `DXFGeometryParserEngine`, `FCStdNativeParserEngine`, `F3DSQLiteParserEngine`, `STLToVoxelGridEngine`, `BlueprintProgramJoinEngine`, `GroundTruthRegistryEngine`+`GroundTruthValidationEngine`, `PrintToProgramPipelineEngine`, `PrintToCADOrchestratorEngine`, `CADClassFeatureLibraryEngine`.
- Primary dispatcher: **`cadDispatcher.ts`** (~40 actions: `cad_pdf_blueprint_extract`, `cad_gdt_*`, `cad_tolerance_*`, `cad_dxf_*`, `cad_f3d_*`, `cad_fcstd_*`, `cad_stl_analyze`, `blueprint_rag_*`, `blueprint_lora_*`, `feature_recognize`). Also `businessDispatcher:blueprint_to_quote`, `qualityDispatcher:blueprint_*`, `camDispatcher:print_to_program_*`, `sessionDispatcher/resourceExtractionDispatcher:ocr_*`.

## Auto-invocation
`.claude/hooks/xray-blueprint-domain-inject.mjs` (UserPromptSubmit) surfaces the top-line of this index whenever slot==xray OR a blueprint/OCR/extraction keyword fires. Knob: `PRISM_XRAY_BLUEPRINT_AWARENESS_DISABLE=1`. This index is the deep-dive target the hook points to.

— Built 2026-05-29 by slot:xray (U-PSGB-XRAY, /goal compile+wire). Sister to [[cad-knowledge-index]] (delta's equivalent).
