# Blueprint-Vision Galaxy — H:/-wide PATHS atlas (XRAY slot)

> The O(N)→O(1) navigation map for slot:xray. Every path verified on disk 2026-05-29 (3 parallel inventory agents). Format: `<abs-path> | <purpose> | <maintainer-slot>`.
> ⚠ Paths the alpha seed invented that DO NOT exist are listed under `## Phantom paths` — never reference them.

## Engine sources (mcp-server/src/engines/*.ts)
- `H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts` | primary blueprint OCR (37.9K) | xray
- `H:/prism/mcp-server/src/engines/BlueprintOCREngine.ts` | OCR core (35.7K) | xray
- `H:/prism/mcp-server/src/engines/BlueprintOCRAdapter.ts` + `CADLiveBlueprintOcrAdapter.ts` | OCR adapters / live blueprint OCR | xray
- `H:/prism/mcp-server/src/engines/PDFBlueprintDimensionExtractorEngine.ts` | dim extraction from PDF blueprint (→ cad_pdf_blueprint_extract) | xray
- `H:/prism/mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts` | low-confidence pattern rescue (→ cad_pdf_pattern_rescue_extract) | xray
- `H:/prism/mcp-server/src/engines/BlueprintExtractionRAGEngine.ts` | RAG-assisted extraction (→ blueprint_rag_*) | xray
- `H:/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts` | join extracted blueprint → existing program (45.4K) | xray
- `H:/prism/mcp-server/src/engines/BlueprintToCADGenerationEngine.ts` + `BlueprintToAllCADsOrchestratorEngine.ts` | blueprint→CAD reconstruction | xray/delta
- `H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts` + `BlueprintCoverageAuditEngine.ts` | corpus harvest + coverage audit | xray
- `H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts` | LoRA training-set bridge (→ blueprint_lora_*) | xray/india
- `H:/prism/mcp-server/src/engines/BlueprintToQuoteBridgeEngine.ts` | blueprint→quote bridge | xray/charlie
- `H:/prism/mcp-server/src/engines/GDTCalloutParserEngine.ts` · `PrismEnhancedGDTEngine.ts` · `FCFSyntaxValidatorEngine.ts` | GD&T parse + FCF validate | xray
- `H:/prism/mcp-server/src/engines/ToleranceEngine.ts` · `ToleranceAwareGenerationEngine.ts` | tolerance stackup/IT-grade/fit/apply | xray
- `H:/prism/mcp-server/src/engines/DXFGeometryParserEngine.ts` · `DXFParserEngine.ts` | DXF/SVG geometry parse | xray
- `H:/prism/mcp-server/src/engines/FCStdNativeParserEngine.ts` | FreeCAD .fcstd parser | xray
- `H:/prism/mcp-server/src/engines/F3DSQLiteParserEngine.ts` | Fusion .f3d/.f3z parser | xray
- `H:/prism/mcp-server/src/engines/STLToVoxelGridEngine.ts` | STL analyze (→ cad_stl_analyze) | xray
- `H:/prism/mcp-server/src/engines/{CADFeatureRecognitionEngine,CADFeatureClassifierEngine,FeatureRecognitionEngine,LatheTurningFeatureRecognizerEngine}.ts` | feature recognition family | xray/delta
- `H:/prism/mcp-server/src/engines/{ImageOCRPipelineEngine,OCRResultEngine,TesseractOCRBridgeEngine,MachineServiceTagOCREngine}.ts` | OCR pipeline + Tesseract bridge | xray
- `H:/prism/mcp-server/src/engines/PDF{Table,MaterialProperty,Formula,Processing,SourceRegistry,Highlight,HandbookBatch,Structure}*Engine.ts` | shared PDF infra | xray/lima
- `H:/prism/mcp-server/src/engines/blueprint-vision/` | THIS galaxy (CLAUDE/MEMORY/PATHS/TOOLBELT.md; no .ts inside) | xray

## Dispatchers (mcp-server/src/tools/dispatchers/)
- `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` | PRIMARY ~40-action surface (cad_pdf_blueprint_extract, cad_gdt_*, cad_tolerance_*, cad_dxf_*, cad_f3d_*, cad_fcstd_*, cad_stl_analyze, blueprint_rag_*, blueprint_lora_*, blueprint_coverage_*, feature_recognize) | delta/xray
- `H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts` | blueprint_to_quote, blueprint_resolve_material | charlie
- `H:/prism/mcp-server/src/tools/dispatchers/qualityDispatcher.ts` | blueprint_compare_revisions/dxf_dimensions/extract/inspection_plan/setup_sheet | quality
- `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` | print_to_program_* (full/enhanced/plan/validate/check_intake/regression/coverage), cam_feature_recognize | kilo
- `H:/prism/mcp-server/src/tools/dispatchers/cadDrawingKnowledgeDispatcher.ts` | cad_select_gdt, cad_get_gdt_rules, cad_design_datums, cad_plan_drawing | delta
- `H:/prism/mcp-server/src/tools/dispatchers/{resourceExtraction,session}Dispatcher.ts` | ocr_process/stats; ocr_summarize/filter_by_confidence/merge_text/render | xray

## State / registries / ledgers
- `H:/prism/state/shared/blueprint-extraction-accuracy-2026-05-24.jsonl` (16MB) + `.md` | accuracy run ledger | xray
- `H:/prism/state/shared/blueprint-extraction-deep-reason-2026-05-24.jsonl` (24.5MB) + `.md` | deep-reason ledger | xray
- `H:/prism/state/shared/blueprint-extraction-{coverage-proof,matched-self-consistency,100pct-proof}-2026-05-24.jsonl` | proof ledgers | xray
- `H:/prism/state/shared/blueprint-accuracy-events.jsonl` | live accuracy event stream (dedup source) | xray
- `H:/prism/state/shared/blueprint-accuracy-state.json` | current accuracy state | xray
- `H:/prism/state/shared/blueprint-join-refresh-last.json` | blueprint↔program join refresh marker | xray
- `H:/prism/state/shared/cad-cam-pdf-tribal-seeds.json` | CAD/CAM PDF-derived tribal seeds | xray/lima
- `H:/prism/state/shared/{EXTRACTION_STATUS,EXTRACTION-PRIORITY-GAP-AUDIT,EXTRACTION-STUB-CLASSIFIER}.json` | extraction status/audit registries | xray
- `H:/prism/state/shared/{extracted-pdfs,pdf-extracts,ocr-ground-truth,ocr-benchmarks}/` | per-domain corpora subdirs | xray
- `H:/prism/mcp-server/data/state/PDF_RESOURCE_MANIFEST.json` (26KB) · `cad-cam-resources-pdf-index.json` (1MB) · `extraction-log.json` (54.6KB — canonical extraction registry) · `EXTRACTION_INVERSE_INDEX.json` | xray

## Scripts (extraction / OCR / blueprint)
- `H:/prism/scripts/extract-jm-die-corpus-page-by-page.py` | **CANONICAL** pypdf page-by-page extractor (the "lima pypdf" tool) | lima/xray
- `H:/prism/scripts/lib/pdf-to-png.py` | PDF→PNG rasterizer (feeds OCR) | xray
- `H:/prism/scripts/lib/blueprint-extractor-lib.mjs` (+ test) · `blueprint-extract-io.mjs` | blueprint extractor core + I/O | xray
- `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs` (+ test) | Ollama vision OCR extraction core (low-confidence fallback) | xray
- `H:/prism/scripts/lib/{ocr-benchmark-lib,pdf-text-extract-lib,pdf-parse-extract-helpers}.mjs` | OCR/PDF extraction cores | xray
- `H:/prism/scripts/blueprint-extraction-{deep-reason,100pct-proof,accuracy-report,proof-of-coverage,matched-self-consistency}.mjs` | accuracy/coverage proof harnesses | xray
- `H:/prism/scripts/blueprint-accuracy-consumer.mjs` (+ lib) | consumes blueprint accuracy events | xray
- `H:/prism/scripts/{batch-pdf-extract,pdf-parse-extract,extract-cad-cam-pdf-content,build-cad-cam-resources-pdf-index}.mjs` | PDF extract/index | xray
- `H:/prism/scripts/blueprint-extract-sidecar.py` · `run-ocr-benchmark.mjs` · `pdf-corpus-watcher-sweep.mjs` | sidecar / benchmark / corpus watch | xray
- `H:/prism/scripts/wedm-pair-jm-die-blueprints-v4.mjs` | pair JM Die blueprints → WEDM programs (v4 latest) | mike/xray

## JM Die blueprint / print corpus (H:/PRISM/JM DIE/)
- `H:/PRISM/JM DIE/PRISM CAD TESTING/` | print→CAD test fixture; canonical test print `PRISM_2475-037_Extrude_Punch Drawing v1.pdf` | xray
- `H:/PRISM/JM DIE/REVERSE ENGINEERING/` | mixed CAD/blueprint samples (~36: 12 .ipt, 8 .idw, 4 .jpg scans, 3 .stp, 2 .dxf) | xray
- `H:/PRISM/JM DIE/Prism JM Die/` | 406 customer subdirs (program corpus by customer) | xray/foxtrot/whiskey

## Hooks + skills
- `H:/prism/.claude/hooks/blueprint-accuracy-guard.mjs` | extraction accuracy gate | xray
- `H:/prism/.claude/hooks/blueprint-coverage-floor-guard.mjs` (+ test) | min coverage floor enforce | xray
- `H:/prism/.claude/hooks/blueprint-join-index-stale-check.mjs` | flag stale blueprint↔program join | xray
- `H:/prism/.claude/hooks/cost-bridge-on-pdf-extract.mjs` | bridge PDF-extract → cost/quote | xray/charlie
- `H:/prism/.claude/commands/{cad-extract,cad-feature-recognize,cad-from-blueprint,cad-tolerance-check,cmm-parse,pdf-learn,prints}.md` | project skills | xray
- `H:/prism/.claude/commands/{checkin,galaxy-buildout,handoff,precompact,startup,smart,extract}-xray.md` | xray slot wrappers + /extract-xray | xray
- `C:/Users/wompu/.claude/commands/{blueprint-read,print-to-program}.md` | user-global skills | xray

## Wiki entries (knowledge/wiki/)
- `H:/prism/knowledge/wiki/architecture/open-source-vision-options-for-blueprint-ocr.md` | vision/OCR option survey | xray
- `H:/prism/knowledge/wiki/architecture/{domain-blueprint,domain-pdf,domain-tolerance,domain-cad}.md` | per-domain overviews | xray/delta
- `H:/prism/knowledge/wiki/architecture/print-to-program-pipeline-canonical.md` | canonical extraction→program pipeline | kilo/xray
- `H:/prism/knowledge/wiki/architecture/{f2-pdf-highlights-wire,cad-cam-resources-pdf-index}.md` | PDF highlight + resource index | xray
- `H:/prism/knowledge/wiki/architecture/blueprint-vision-{galaxy,multi-print-discipline,extraction-confidence}.md` | NEW this buildout (galaxy bridges) | xray
- `H:/prism/knowledge/wiki/lessons/cad-blueprint-revolve-2475-037.md` | JM Die 2475-037 live-build lesson | delta/xray
- `H:/prism/knowledge/wiki/lessons/pdf-extract-*.md` (~34 leaves) | per-corpus extraction lessons | lima/xray
- `H:/prism/knowledge/wiki/code-tribal/blueprint-ocr-operator-wisdom.md` + `blueprint-dim-*.md` (11) | OCR operator wisdom + callout-classification tips | xray

## Phantom paths (alpha seed invented these — they DO NOT exist; never reference)
- ✗ `H:/PRISM/JM DIE/PRINTS/`, `_PART LIBRARY`, `JM EXAMPLE PARTS` → use `PRISM CAD TESTING/` + `REVERSE ENGINEERING/` + `Prism JM Die/`.
- ✗ `H:/prism/scripts/lima-pypdf-page-extract.mjs` → use `scripts/extract-jm-die-corpus-page-by-page.py`.
- ✗ `H:/prism/state/shared/blueprint-extraction-log.jsonl` → use the date-suffixed `blueprint-extraction-*-2026-05-24.jsonl` + `blueprint-accuracy-events.jsonl`.
- ✗ Engines `CAD{STEPParse,DXFGeomParse,FCStdParse,F3DParse,STLAnalyze,GDT*,Tolerance*}Engine` → see the format→engine map in MEMORY.md for the real names.

— Built 2026-05-29 by slot:xray (PER-SLOT-GALAXY-BUILDOUT). Re-verify any path before relying if galaxy dir mtime ≫ this date.

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for blueprint-vision:** `Docustrata/JMD Scans` · `Docustrata/JMD Laser Sheets` · `resources/PDF` · `JM DIE/REVERSE ENGINEERING`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the blueprint-vision galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToleranceDB** (ISO 286 Tolerance Database) — `data/databases/ToleranceDB.json` · 260 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/blueprint-vision/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/blueprint-vision_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="blueprint-vision" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs blueprint-vision "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
