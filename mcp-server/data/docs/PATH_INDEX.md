# PRISM Path Index — Quick Reference for All Slash Commands
# Single source of truth for file locations. Read this instead of running Glob/Grep.
# Updated: 2026-03-01 | ~400 tokens when loaded

## Root Paths
- MCP: `C:/PRISM/mcp-server`
- CAD: `C:/PRISM/cad-engine`
- WEB: `C:/PRISM/web` or `C:/PRISM/mcp-server/web`
- STATE: `C:/PRISM/state`
- MEMORY: `C:/Users/Admin.DIGITALSTORM-PC/.claude/projects/C--Windows-System32/memory`
- COMMANDS: `C:/Users/Admin.DIGITALSTORM-PC/.claude/commands`
- HOOKS: `C:/Users/Admin.DIGITALSTORM-PC/.claude/hooks`
- HOOKIFY: `C:/Users/Admin.DIGITALSTORM-PC/.claude/hookify.*.local.md`
- PYTHON: `C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/Python/Python312/python.exe`

## MCP Server Source
- Dispatchers: `mcp/src/tools/dispatchers/*Dispatcher.ts` (51 files)
- Engines: `mcp/src/engines/*.ts` (198 total, index at `engines/index.ts`)
- Algorithms: `mcp/src/algorithms/*.ts` (51 files)
- Hooks: `mcp/src/hooks/*.ts` (220 hooks)
- Schemas: `mcp/src/schemas/*.ts`
- Utils: `mcp/src/utils/*.ts`
- Validation: `mcp/src/validation/*.ts`
- Tests: `mcp/src/__tests__/*.test.ts`
- Config: `mcp/tsconfig.json`, `mcp/vitest.config.ts`, `mcp/package.json`

## MCP Server Data
- MASTER_INDEX: `mcp/data/docs/MASTER_INDEX.md`
- PATH_INDEX: `mcp/data/docs/PATH_INDEX.md` (this file)
- Formulas: `mcp/data/formulas/*.json` (500 formulas)
- Materials DB: `mcp/data/materials/` (15 registries)
- Roadmap: `mcp/data/roadmap-index.json`
- Milestones: `mcp/data/milestones/*.json`
- Claims: `mcp/data/claims/`
- Video Learned: `mcp/data/video-learned/learning-registry.json`

## CAD Engine Source (Python)
- Core: `cad/src/cad_kernel.py`, `cad_export.py`, `geo_validator.py`, `bridge.py`
- Video Pipeline: `cad/src/video_ingest.py`, `frame_extract.py`, `vision_analyze.py`, `ui_ocr.py`
- Classification: `cad/src/domain_classify.py`, `platform_detect.py`
- Knowledge: `cad/src/knowledge_extract.py`, `knowledge_extract_offline.py`, `knowledge_bridge.py`
- Components: `cad/src/component_generator.py`, `component_writer.py`
- CAM Learning: `cad/src/strategy_aggregate.py`, `strategy_recommend.py`, `tool_select_kb.py`, `op_sequence.py`
- Practice KB: `cad/src/practice_aggregate.py`, `trouble_tree.py`, `material_tips.py`
- Document: `cad/src/document_ingest.py`, `document_classify.py`, `document_extract.py`
- Code Gen: `cad/src/code_gen.py`, `code_validator.py`, `primitive_gen.py`
- Prompts: `cad/src/prompts/{cad,cam,shop,document}_prompts.py`
- Validators: `cad/src/validators/{cad,cam,shop}_validator.py`
- Registry: `cad/src/learning_registry.py`
- Tests: `cad/tests/test_*.py`

## CAD Engine Data
- Strategy DB: `cad/data/cam_strategies/strategy_db.json`
- Tool Rationale: `cad/data/cam_strategies/tool_rationale_kb.json`
- Op Sequences: `cad/data/cam_strategies/operation_sequences.json`
- CAD Standards: `cad/data/cad_drawing_ref/cad_drawing_standards_and_practices.md`
- Knowledge Store: `cad/knowledge_store/`
- Primitives: `cad/primitives/library.py`, `primitives/index.json`
- Video Output: `cad/output/<video_id>/`
- Test Fixtures: `cad/test_data/video_fixtures.json`

## State Files
- Current: `state/CURRENT_STATE.json`, `state/QUICK_RESUME.json`
- Learning: `state/LEARNING_LOG.jsonl`, `state/LEARNING_STORE.json`
- Handoff: `state/HANDOFF_PACKAGE.json`, `state/RECOVERY_MANIFEST.json`
- Forge-Learn: `state/forge-learn/gap_analysis.json`, `state/forge-learn/learning_queue.json`
- Errors: `state/ERROR_LOG.jsonl`, `state/failure_patterns.jsonl`
- Sessions: `state/SESSION_JOURNAL.jsonl`, `state/session_events.jsonl`

## Web Frontend
- Components: `web/src/components/`
- Pages: `web/src/pages/`
- API: `web/src/api/`
- Hooks: `web/src/hooks/`
- Tests: `web/src/__tests__/`

## PDF Catalogs (46 files in C:/PRISM/CATALOGS/)
- Turning: `TURNING_CATALOG_PART 1.pdf`, `GC_2023-2024_US_Turning-Grooving.pdf`, `Turning 2018.1.pdf`, `Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf`
- Milling: `GC_2023-2024_US_Milling.pdf`, `Milling 2018.1.pdf`, `Solid End Mills.pdf`, `Flash_Solid_catalog_INCH.pdf`
- Drilling: `GC_2023-2024_US_Drilling.pdf`, `Holemaking.pdf`, `OSG.pdf`
- Threading: `Threading 2018.1.pdf`, `ZK12023_DEGB RevA EMUGE Katalog 160.pdf`
- General: `Cutting Tools Master 2022 English Inch.pdf`, `Cutting Tools Master 2022 English Metric.pdf`
- Toolholders: `BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf`, `Haimer USA Master Catalog.pdf`, `REGO-FIX Catalogue 2026 ENGLISH.pdf`, `guhring tool holders.pdf`
- Specialty: `INGERSOLL CUTTING TOOLS.pdf`, `ISCAR PART 1.pdf`, `korloy solid.pdf`, `korloy rotating.pdf`, `korloy turning.pdf`, `guhring full catalog.pdf`, `SGS_Global_Catalog_v26.1.pdf`, `MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf`
- Workholding: `CAMFIX_Catalog.pdf`, `543f80b8_2016_orange_vise_catalog.pdf`
- Reference: `Metalmorphosis-2021-FINAL-reduced-for-Web.pdf`, `01-Global-CNC-Full-Catalog-2023.pdf`
- Mirror: `C:/PRISM/MANUFACTURER_CATALOGS/uploaded/` (same files)

## Shop Practice Knowledge (C:/PRISM/cad-engine/data/shop_practices/)
- Practice DB: `practice_db.json` (30 practices, 6 categories)
- Trouble Trees: `trouble_trees/{chatter,surface_finish,tool_wear,dimensional_accuracy,chip_evacuation}.json`
- Material Tips: `material_tips/{aluminum,steel,stainless_steel,titanium,cast_iron}.json`

## Key Counts (verify with disk if stale)
- 51 dispatchers, 1265 actions, 198 engines (135 exported), 51 algorithms
- 220 hooks, 103 cadences, 500 formulas, 15 registries
- 60 slash commands, 88 hookify rules
- 2232 backend tests, 76 web tests, 11 E2E, 550 cad-engine tests
- 84/95 milestones complete
