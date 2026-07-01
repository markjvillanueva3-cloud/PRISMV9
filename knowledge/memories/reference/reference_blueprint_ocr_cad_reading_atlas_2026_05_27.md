---
name: reference-blueprint-ocr-cad-reading-atlas-2026-05-27
description: "Fleet-shareable atlas of every blueprint-reading, OCR, and CAD-file-format-reading engine + dispatcher action + wiki entry + tribal tip. Built for kilo, delta, echo, foxtrot, oscar, whiskey, mike — read first before building any new print/PDF/CAD reader."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.480Z
aliases: reference_blueprint_ocr_cad_reading_atlas_2026_05_27
---


# Blueprint / OCR / CAD-file-reading atlas (fleet-shareable)

**Built for:** `kilo`, `delta`, `echo`, `foxtrot`, `oscar`, `whiskey`, `mike` — any slot whose work touches print-reading, PDF extraction, OCR, or parsing native CAD files (DXF/DWG/STEP/IGES/STL/F3D/FCStd/SLDPRT/IPT/3DM/HMC). Read this FIRST before grepping or building anything new — duplicates waste cycles and the wire-domain atlas convention has already proven the value.

**Source:** 3 parallel Explore agents, 2026-05-27. All paths are slot-relative (slot-mike worktree; same shape across all slots). Replace `slot-mike` with your slot name as needed.

---

## 1. BLUEPRINT + OCR ENGINES (14, all in `mcp-server/src/engines/`)

| Engine | Role | Key exports |
|---|---|---|
| `BlueprintOCREngine.ts` | Text-regex extractor (dim/GD&T/title block/notes); needs pre-OCR'd text | `blueprintOCREngine`, `BlueprintAnalysis`, `ExtractedDimension`, `ExtractedGDT`, `TitleBlockData` |
| `BlueprintVisionOCREngine.ts` | **Claude Vision API** image→structured JSON (dims+tol, GD&T, material, finish, geometry, title block) — WIRE-EXEMPT | `blueprintVisionOCREngine` |
| `ImageOCRPipelineEngine.ts` | Generic image OCR (jpg/png/tiff/bmp/gif/webp) w/ quality + confidence (U-AWR27, 550-image pipeline) | `imageOCRPipelineEngine` |
| `PrintReadingEngine.ts` | Orchestrator over `BlueprintOCREngine`: setup-sheet / inspection-plan / DXF-text dims / revision compare | `printReadingEngine` |
| `BlueprintToCADGenerationEngine.ts` | Vision→3D CAD pipeline (multi-view recon, GD&T preservation, dim validation) — CADCAM-DAGI-MS0/U-DAGI08 | `blueprintToCADGenerationEngine` |
| `BlueprintToAllCADsOrchestratorEngine.ts` | Image→6-CAD end-to-end (Vision + printToAllCADsOrchestrator) — CAD-COMPLETE-MS0 | `blueprintToAllCADsOrchestratorEngine` |
| `BlueprintToQuoteBridgeEngine.ts` | Blueprint extraction → `QuoteEstimateInput` (Xometry-style upload→quote) | `blueprintToQuoteBridgeEngine` |
| `PDFBlueprintDimensionExtractorEngine.ts` | Text-PDF regex extractor (dims/GD&T/finish/threads/part-info) | `pdfBlueprintDimensionExtractorEngine` |
| `PDFBlueprintPatternRescueEngine.ts` | Additive US-convention regex (fractional `1/2"`, limit pairs `1.000/1.002`, ISO 1302 N-grade Ra, microinch) — BLUEPRINT-OCR-TRAINING-MS1/U2 | `pdfBlueprintPatternRescueEngine` |
| `BlueprintExtractionRAGEngine.ts` | RAG layer over Vision (corpus + tribal + dim-signature near-neighbour, conformal bounds, must cite ≥1 source) — MS1/U-MS1-U7 | `blueprintExtractionRAGEngine` |
| `BlueprintCorpusHarvestEngine.ts` | MIT-OCW + vendor PDFs + curated online → `knowledge/wiki/training-corpus/` — MS1/U-MS1-U6 | `blueprintCorpusHarvestEngine` |
| `BlueprintCoverageAuditEngine.ts` | Audits Docustrata corpus (extracted_ok / widened_bounds / operator_overridden / never_seen) — MS1/U-MS1-U8 | `blueprintCoverageAuditEngine` |
| `BlueprintLoRABridgeEngine.ts` | LoRA export bundles (gemini-finetune / openai / modal / local-lora) w/ HARD anonymization (no customer / part #) | `blueprintLoRABridgeEngine` |
| `BlueprintProgramJoinEngine.ts` | Joins Phase 8 JSONL pages → JM Die programs / CAD via part-number normalize (exact / loose / miss) | `blueprintProgramJoinEngine` |

**Vision/LLM backends actually wired:**
- **Claude Vision API** — primary image-understanding path (`BlueprintVisionOCREngine`)
- **Regex on pre-OCR'd text** — `BlueprintOCREngine`, `PDFBlueprintDimensionExtractor`, `PDFBlueprintPatternRescue` (expects text from `pdf_ingestion.py` or `ui_ocr.py`)
- **Pluggable** — `BlueprintExtractionRAGEngine` accepts injectable backends (Tesseract / Ollama vision / GPT-4V swappable)
- **NOT wired today:** Ollama Llava bridge, GPT-4V bridge (both are gaps if needed)

---

## 2. CAD-FILE-FORMAT READERS (15 engines + 12 live bridges)

### Native readers (in-process, no external tool required)

| Engine | Formats | Notes |
|---|---|---|
| `DXFParserEngine.ts` | DXF, SVG → `Polygon2D[]` | Discretizes splines/arcs |
| `DXFGeometryParserEngine.ts` | DXF, STEP, IGES → `WireEDMContour[]` | **Arc-preserving** (G02/G03-ready) — preferred for WEDM lane |
| `DxfWriterEngine.ts` | `Polygon2D[]` → ASCII DXF R12 (write) | Action `dxf_write_polygons` |
| `STEPGeometryParserEngine.ts` | STEP ISO 10303-21 text | Entity counts (CYLINDRICAL/CONICAL/TOROIDAL/SPHERICAL/B_SPLINE/PLANE/ADVANCED_FACE) |
| `StepImportEngine.ts` | STEP AP203/AP214 via **occt-import-js WASM** | Triangulated mesh + features. Actions `step_import \| step_analyze \| step_features` |
| `IGESImportEngine.ts` | IGES 5.3 (80-char records) | Entities 100/102/104/106/108/110/112/116/120/124/126/128/142/144. Actions `iges_parse \| iges_extract_geometry \| iges_summary` |
| `WEDMDwgImportEngine.ts` | DWG R14-R2018 via **LibreDWG + ODA fallback** | Delegates to DXFGeometryParserEngine |
| `F3DSQLiteParserEngine.ts` | Fusion `.f3d/.f3z` **offline** | ZIP + SQLite `model.sqlite`, no Fusion required. `better-sqlite3` read-only |
| `FCStdNativeParserEngine.ts` | FreeCAD `.FCStd/.FCStd1` **offline** | yauzl ZIP+XML, FreeCAD 0.19–1.0 |
| `STLToVoxelGridEngine.ts` | ASCII STL | Triangle mesh + voxel grid. Actions `stl_parse \| stl_voxelize \| stl_analyze` |
| `MeshEngine.ts` | Generic mesh import/export/repair | Actions `mesh_import \| mesh_export \| mesh_generate \| mesh_simplify \| mesh_analyze \| mesh_repair` |
| `TurningCADImportEngine.ts` | STEP / IGES 3D → axisymmetric turning profile | XZ silhouette, TurningFeature[] |
| `FixtureCadIngesterEngine.ts` | `.ipt/.iam` (Inventor) + STEP/IGES fallback | Fixture assemblies |
| `hypermill/HMCProjectParserEngine.ts` | hyperMILL `.hmc` XML v31/v33 | FeatureSequenceRecords |
| `CADKernelEngine.ts` | B-Rep kernel (Vec3/Mat4/NURBS/CSG/BVH) | Backs `cad` lazy import in dispatcher |

### Live bridges (HTTP / COM / MCP — external tool running)

| Bridge | Backend | Notes |
|---|---|---|
| `Fusion360LiveBridgeEngine.ts` | F360 add-in `127.0.0.1:18360` (HTTP) | Sketch/extrude/fillet/etc. + ExtractedAction replay |
| `Fusion360AutomationBridge.ts` | F360 HTTP `127.0.0.1:7540` | `.f3d/.f3z` open/getGeometry/exportSTEP |
| `Fusion360InHostRunnerEngine.ts` | F360 add-in scenario runner (WS, JSON-RPC 2.0) | 6 descriptor axes |
| `Fusion360PluginAdapterEngine.ts` | F360 CAM Python add-in (`adsk.cam`) | CAM-side bridge |
| `Fusion360CADGeneratorAdapter.ts` | Typed CADOperation[] → Python emit | `UnifiedCADCodeGeneratorBase` |
| `AutodeskFusionMCPProxyEngine.ts` | Official Autodesk Fusion MCP `127.0.0.1:27182/mcp` | 5 tools, JSON-RPC 2.0 |
| `SolidWorksLiveBridgeEngine.ts` | `.bas/.swp` VBA via http \| com \| mock | Action `solidworks_live_execute` |
| `SolidWorksCADExecutionBridge.ts` | VBA macro scaffold emitter | — |
| `InventorAutomationBridge.ts` + `InventorCADExecutionBridge.ts` | iLogic VB.NET COM | — |
| `RhinoCommonBridgeEngine.ts` | Rhino 3DM via RhinoCommon .NET / Rhino.Compute HTTP | Exports to STEP/IGES/STL |
| `AutoCADDotNetBridgeEngine.ts` | DWG via AcMgd/AcDbMgd + AutoLISP | — |
| `FreeCADAutomationBridge.ts` | `.FCStd` via FreeCADCmd subprocess JSON-RPC | — |

### Orchestrators / registries / classifiers

- `CADAdapterRegistry.ts` — `CADSystemId` → ICADCodeGenerator (freecad/fusion360/inventor/mastercam; +10 planned)
- `CADToSTEPPipelineEngine.ts` — Universal CAD → STEP pipeline (router → bridge → validate AP214/AP242 → fallback). Actions `step_pipeline_run|step_pipeline_batch|step_validate|step_pipeline_strategies|step_pipeline_supported`
- `CADAutomationRouter.ts` + `CADAutomationMockLayer.ts` — Extension→bridge dispatch
- `CADFormatConversionMatrixEngine.ts` — 25+ format conversion graph + magic-byte sniff. Actions `cad_classify_conversion|cad_best_path|cad_sniff_format|cad_probe_validity|cad_list_conversion_edges`
- `CADFileClassifierEngine.ts` — Classifies `.sldprt/.ipt/.FCStd/.f3d/.f3z/.sldasm/.iam/.slddrw/.idw/.mcx-8/.MCX/.mcam/.hmc/.step/.stp/.iges/.igs/.stl/.x_t/.x_b` → part/assembly/drawing/cam/neutral/kernel + testStrategy

---

## 3. FORMAT → ENGINE QUICK-MAP (machine-grep-friendly)

```
DXF read     → DXFParserEngine (2D polygons) | DXFGeometryParserEngine (arc-preserving, WEDM)
DXF write    → DxfWriterEngine
DWG          → WEDMDwgImportEngine (→ DXFGeometryParserEngine) | AutoCADDotNetBridgeEngine (live)
STEP/STP     → StepImportEngine (occt WASM) | STEPGeometryParserEngine (text) | DXFGeometryParserEngine (WEDM) | TurningCADImportEngine (axisymmetric)
IGES/IGS     → IGESImportEngine | TurningCADImportEngine | FixtureCadIngesterEngine
STL          → STLToVoxelGridEngine | MeshEngine
F3D/F3Z      → F3DSQLiteParserEngine (offline) | Fusion360AutomationBridge (live HTTP) | AutodeskFusionMCPProxyEngine (official MCP)
FCStd        → FCStdNativeParserEngine (offline) | FreeCADAutomationBridge (live)
SLDPRT/ASM   → SolidWorksLiveBridgeEngine + SolidWorksCADExecutionBridge + SolidWorksAutomationBridge
IPT/IAM      → FixtureCadIngesterEngine (offline, w/ STEP fallback) | InventorAutomationBridge + InventorCADExecutionBridge
3DM          → RhinoCommonBridgeEngine
X_T/X_B      → CADFileClassifierEngine classifies only — NO native parser (GAP)
HMC          → hypermill/HMCProjectParserEngine
SAT, OBJ, FBX → NO dedicated reader (GAP; MeshEngine generic mesh_import may handle OBJ)
```

**Known gaps for fleet pickup:** native SAT, OBJ, FBX, X_T/X_B parser engines. The `mcp-server/cad-servers/` directory referenced in some old docs DOES NOT EXIST in current worktree — CAD servers are in-process engines + the F360 add-in under `resources/fusion360/`.

---

## 4. DISPATCHER ACTIONS (grep-ready)

### Blueprint / OCR
- **`cadDispatcher`** → `cad_pdf_blueprint_extract`, `cad_pdf_pattern_rescue_extract`, `cad_blueprint_generate`, `cad_blueprint_extract_features`, `cad_blueprint_infer_class`, `cad_blueprint_flag_features`, `cad_print_to_cad`, `cad_translate_blueprint_to_ops`, `cad_print_regenerate`, `blueprint_to_3d_model`, `blueprint_to_cadquery_script`, `blueprint_to_all_cads{,_validate,_capabilities}`, `print_to_{fusion360,mastercam,inventor,solidworks,esprit}{,_validate,_capabilities}`, `print_to_all_cads{,_validate,_targets}`, `print_to_hypercads_analysis{,_validate,_capabilities}`, `gt_blueprint_{register,join_docustrata}`, `gt_enumerate_by_tier`, `blueprint_rag_{extract,explain,compare_to_baseline}`, `blueprint_lora_{prepare_set,export,register_endpoint,history}`, `blueprint_coverage_{audit,by_customer,flag_retrain,report}`
- **`qualityDispatcher`** → `blueprint_extract`, `blueprint_setup_sheet`, `blueprint_inspection_plan`, `blueprint_compare_revisions`, `blueprint_dxf_dimensions`
- **`businessDispatcher`** → `blueprint_to_quote`, `blueprint_resolve_material`, `lathe_auto_quote_from_print`
- **`devDispatcher`** → `blueprint_ingest_phase8`, `blueprint_ingest_phase15`, `print_program_join`, `print_for_program`, `pdf_pipeline_{extract,read,classify}`
- **`camDispatcher`** → `print_to_program{,_full,_enhanced,_plan,_validate,_check_intake,_regression_run,_regression_run_one,_coverage,_tutorial}`, `print_ai_{resolve_material,resolve_features,recommend_machine}`, `print_to_hypermill{,_validate,_capabilities}`, `print_to_inventor_hsm{,_validate,_capabilities}`
- **`aiReasoningDispatcher`** → `ai_wedm_print_to_program` (request_type `print_to_program`)
- **`sessionDispatcher`** → `print_corpus_all_shas`, `print_corpus_total_count`, `print_stall_stats`

### CAD-file readers
- **`cadAutomationDispatcher`** — `route|list_supported_extensions|supports_extension|open|close|get_geometry|get_operation_tree|get_toolpaths|export_step|dxf_parse|dxf_write_polygons|stl_write_polygons|iges_parse|iges_extract_geometry|iges_summary|cad_classify_conversion|cad_best_path|cad_sniff_format|cad_probe_validity|cad_list_conversion_edges|build_script|execute_script|validate_script|step_pipeline_{run,batch,validate,strategies,supported}|feature_tree_extract|mock_*`
- **`cadDispatcher`** — `cad_cam_handoff|cad_taxonomy_*|cad_capability_*|cadquery_{generate_script,step_by_step,validate_syntax,execute_script,codegen_prompt}|cad_corpus_*|cad_index_*|cad_pipeline_*|cad_training_*|cad_regen_*|cad_trial_*|cad_registry_*|cad_class_*`
- **`cadRegressionDispatcher`** — regression orchestration (uses Fusion/SW/Inventor/FreeCAD bridges)
- **`cadDrawingKnowledgeDispatcher`** — drawing-knowledge surface
- **`edmDispatcher`** — invokes `WEDMDwgImportEngine` + `DXFGeometryParserEngine`
- **`turningDispatcher`** + **`turningProgramDispatcher`** — `TurningCADImportEngine`
- **`camDispatcher`** + **`calcDispatcher`** + **`l2EngineDispatcher`** — additional reader entry points

---

## 5. LIMA'S CANONICAL PYPDF PAGE-BY-PAGE EXTRACTOR

Per `[[feedback_use_lima_pypdf_page_extractor]]` — **all chats use lima's script**, 76× deeper than pdf-parse, domain-tagged + notability-scored.

- **Script:** `H:/prism-slot-lima/scripts/extract-jm-die-corpus-page-by-page.py` (11.1 KB, pypdf, page-by-page, notability 0.0–1.0 floor 0.4, 12-domain tagged)
- **Shared mirror:** `H:/PRISM/scripts/extract-jm-die-corpus-page-by-page.py` (also exists in shared tree)
- **Queue input:** `state/shared/jm-die-corpus-queue.json`

**Drained corpus (2026-05-26):**
- `H:/prism-slot-lima/mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (16.7 MB) — **8,752 page-level tribal entries** from 73 PDFs / 11,160 pages
- `H:/prism-slot-lima/mcp-server/data/tribal/jm-die-corpus.jsonl` (45.6 KB) — 82 catalog entries (1/PDF)
- `H:/prism-slot-lima/mcp-server/data/tribal/jm-fleet-machines.jsonl` (63.9 KB) — 154 academy courses
- `H:/prism-slot-lima/knowledge/wiki/code-tribal/jm-die-corpus/` — 83 stub wiki entries
- Surfaced live via `tribal-by-domain-inject` hook on slot-soul domain match

---

## 6. WIKI ENTRIES (top picks — full grep with `wiki-query`)

### Engine + architecture entries
- `wiki/architecture/engines/cad/pdfblueprintdimensionextractorengine.md`
- `wiki/architecture/engines/cad/blueprintextractionragengine.md` (BLUEPRINT-OCR-TRAINING-MS1)
- `wiki/architecture/engines/cad/blueprintcorpusharvestengine.md`
- `wiki/architecture/engines/cad/jmdiearchivebackannotationengine.md`
- `wiki/architecture/engines/ai/blueprintlorabridgeengine.md`
- `wiki/architecture/engines/pdf/imageocrpipelineengine.md`
- `wiki/architecture/engines/cam/blueprintprogramjoinengine.md`
- `wiki/architecture/engines/dev/pdfprocessingpipelineengine.md`
- `wiki/architecture/engines-unwired/pdftableextractionengine.md` (GHOST, unwired)
- `wiki/architecture/engines-unwired/pdfhandbookbatchprocessorengine.md` (GHOST)
- `wiki/architecture/engines-unwired/pdfsourceregistryengine.md` (GHOST)

### Domain rollups
- `wiki/architecture/domain-cad.md`
- `wiki/architecture/domain-pdf.md` (3 atomic engines)
- `wiki/architecture/f2-pdf-highlights-wire.md` — F2 PDF /Highlight Wire (`pdf_highlights_extract`)

### Skills + hooks
- `wiki/architecture/skills/user/blueprint-read.md` — `/blueprint-read` user skill
- `wiki/architecture/skills/project/cad-from-blueprint.md` — `/cad-from-blueprint` project skill
- `wiki/architecture/skills/user/lathe-print-to-program.md` — `/lathe-print-to-program`
- `wiki/architecture/hooks/runtime/blueprint-accuracy-guard.md` — PostToolUse runtime guard

### Frontends
- `wiki/architecture/frontends/page/fe-page-blueprintquotepage-1.md` — `BlueprintQuotePage`
- `wiki/architecture/frontends/frontend_file/frontend-prism-web-pages-blueprintquotepage.md` — source

### Code-tribal patterns (auto-generated PRINT-OCR-100PCT-MS0 U4)
- `wiki/code-tribal/blueprint-dim-linear.md`
- `wiki/code-tribal/blueprint-dim-diameter.md`
- `wiki/code-tribal/blueprint-dim-radius.md`
- `wiki/code-tribal/blueprint-dim-gdt-positional.md`
- `wiki/code-tribal/blueprint-dim-gdt-runout.md`
- `wiki/code-tribal/blueprint-dim-gdt-profile.md`
- `wiki/code-tribal/blueprint-dim-thread-callout.md`
- `wiki/code-tribal/blueprint-dim-surface-finish.md`
- `wiki/code-tribal/blueprint-dim-material-callout.md`
- `wiki/code-tribal/blueprint-dim-note.md`
- `wiki/code-tribal/blueprint-dim-other.md`

---

## 7. TRIBAL TIP FILES

| File | Count | Notes |
|---|---|---|
| `mcp-server/src/data/wedm-knowledge-tips.ts` | 122+ ids | 0 directly blueprint/OCR/CAD; wire-EDM ops (wire-breakage / surface-finish / taper / UV / flushing / setup) |
| `mcp-server/src/data/controller-knowledge-tips.ts` | 121 ids | 5 dim/GDT-adjacent (fanuc-ai-contour, siemens/heidenhain/haas dialect) |
| `mcp-server/src/data/bobcad-cam-tips.ts` | 220 ids | BobCAD V36/V37; bc-001 adaptive-roughing trochoidal, CAM strategies |
| `mcp-server/src/data/cad-validation-corpus.ts` | 12 cases | OD pins, hard turns, threaded shafts, punches/dies, GD&T-tagged |
| `mcp-server/src/data/hypercad-python-api.ts` | full SDK ref | om.cad.{core,commands,booleans,modify}, om.cam.core — 179-file extraction |
| `mcp-server/src/data/tribal-knowledge-tips.ts` | type-defs only | `TribalTipSeverity` enum host (Okuma legacy schema) |

**Not yet present (gap):** `mill-knowledge-tips.ts`, `lathe-knowledge-tips.ts`, `blueprint-knowledge-tips.ts`, `cad-knowledge-tips.ts`, `general-knowledge-tips.ts` — none of these dedicated tribal-tip files exist. If a slot wants blueprint-specific tribal data, the corpus is in `BlueprintExtractionRAGEngine`'s neighbour-pool, not a dedicated tip file.

---

## 8. ACADEMY COURSE

- `mcp-server/src/data/academy/course-0c-blueprint-reading.ts` — **Course 0C: Blueprint Reading & GD&T** (Novice, 12 modules, ~10 hours, longest pre-machining course)
- Wiki: `wiki/architecture/courses/academy-course-0c-blueprint-reading-blueprint-reading-gd-t.md`
- `knowledge/courses/` and `data/courses/` DIRECTORIES DO NOT EXIST — only the academy course exists.

---

## 9. PYTHON CAD EXECUTORS (scripts)

- `scripts/cadquery-executor.py`
- `scripts/freecad-executor.py`
- `mcp-server/scripts/freecad-executor.py`
- `mcp-server/scripts/build-cad-coverage-matrix.ts`
- `mcp-server/scripts/cad-regen-test.ts`
- `mcp-server/scripts/full-cad-ai-pipeline-2475-037.ts`
- `mcp-server/scripts/ingest-cad-corpus.ts`, `gen-cad-nl-corpus.mjs`, `emit-cad-training-extractions.mjs`
- `scripts/close-out-cad-silent-debt.mjs`, `scripts/run-hypercad-validation.mjs`

---

## 10. CAD-FUSION-LIVE-MS0 BRANCH CONTEXT

The currently active branch is `cad-fusion-live-ms0`. Key engines:
- `Fusion360LiveBridgeEngine.ts` — the canonical live bridge
- `resources/fusion360/prism-test-runner/{index.js,manifest.json}` — F360 add-in (com.jmdie.prism.test-runner, runOnStartup, win/mac)
- Wiki context: `knowledge/wiki/lessons/cad-fusion-live-ms0-h-drive-archaeology.md` + `cad-fusion-live-ms0-integration-discovery.md`
- No engine files prefixed `*FusionLive*` beyond `Fusion360LiveBridgeEngine.ts` — that ONE engine is the live-CAD surface (HTTP server inside Fusion at :18360)

---

## FAST-LOOKUP CHEAT SHEET

| If you need to… | Use… |
|---|---|
| Read a DXF for WEDM | `DXFGeometryParserEngine` (arc-preserving) |
| Read a DXF for general 2D | `DXFParserEngine` |
| Read a STEP file in-process | `StepImportEngine` (occt WASM) |
| Read STEP without WASM | `STEPGeometryParserEngine` (text-only) |
| Read DWG | `WEDMDwgImportEngine` (LibreDWG + ODA fallback) |
| Read F3D offline | `F3DSQLiteParserEngine` |
| Read FreeCAD offline | `FCStdNativeParserEngine` |
| Talk to a running Fusion 360 | `Fusion360LiveBridgeEngine` (:18360) |
| Talk to official Autodesk MCP | `AutodeskFusionMCPProxyEngine` (:27182) |
| OCR an image of a print | `BlueprintVisionOCREngine` (Claude Vision) → if you only have text: `BlueprintOCREngine` |
| Extract dims from a text PDF | `PDFBlueprintDimensionExtractorEngine` → fallback `PDFBlueprintPatternRescueEngine` |
| Pair a print to its program | `BlueprintProgramJoinEngine` (via `print_program_join` action) |
| Build LoRA training pairs from prints | `BlueprintLoRABridgeEngine` (HARD anonymized) |
| Page-by-page deep PDF extract | Lima's `extract-jm-die-corpus-page-by-page.py` |
| Audit blueprint coverage | `BlueprintCoverageAuditEngine` |
| Classify a CAD extension | `CADFileClassifierEngine` |
| Sniff CAD magic bytes | `CADFormatConversionMatrixEngine` |
| Convert between CAD formats | `CADFormatConversionMatrixEngine` (best-path graph) → `CADToSTEPPipelineEngine` |

---

**Cross-refs:** [[reference_wire_domain_atlas_for_mike_2026_05_27]] · [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] · [[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_cam_corpus_locations]] · [[feedback_use_lima_pypdf_page_extractor]] · [[feedback_enumerate_before_read]]
