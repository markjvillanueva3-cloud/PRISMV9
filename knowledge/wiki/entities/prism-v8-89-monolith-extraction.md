---
title: PRISM v8.89 Monolith Extraction State
aliases: [monolith-extraction, extracted-folder, extracted_modules, v8.89-monolith]
category: entities
sources: 3
confidence: 0.9
last_verified: 2026-05-11
source: H:/prism/extracted/ + H:/prism/extracted_modules/ (surveyed by 3 parallel agents 2026-05-11)
---

# PRISM v8.89 Monolith Extraction State

## What it is

`H:/prism/extracted/` (91 MB, 895 files) and `H:/prism/extracted_modules/` (149 MB, ~1048 files) hold the **decomposed PRISM v8.89 monolith** — a 986,622-line HTML file (`PRISM_v8_89_002_TRUE_100_PERCENT.html`, the previous all-in-one PRISM build, originally on `C:\PRISM\_BUILD\`). It was decomposed into two parallel sets:

- **`extracted/`** — **datasets**, organized into category folders: `materials*` (1,047 materials × ~127 params, in `materials_v9_complete/` — plus 6 stale backup variants), `machines/` (110 files, ~500 machine profiles), `controllers/alarms/` (2,500+ alarm codes, 12 controllers + `MASTER_ALARM_DATABASE_v3.json`), `catalogs/` (8 vendor tool catalogs: SGS/Sandvik/Kennametal/Tungaloy/OSG/Guhring/Seco/Mitsubishi), `algorithms/` (52 files), `formulas/` (12 files — Kienzle, Taylor, etc.), `knowledge_bases/` (10 files incl. ~3,700 tribal tips + manufacturing playbook), `engines/` (78 ported JS — incl. `post_processor/PRISM_POST_PROCESSOR_DATABASE_V2.js` 2,718 lines), `business/` (7), `workholding/` (3), `integration/` (14), `learning/` (6), `systems/` (7), `mit/` (5), `units/` (3). Maps: `MASTER_EXTRACTION_INDEX.json`, `EXTRACTION_REGISTRY.json` (the latter is stale — claims 3.34%).
- **`extracted_modules/`** — **ported JS engine modules** from the 1,469-module monolith (1,000 unique; 950 dumped to disk). Subdirs: `complete_extraction/` (~830 .js), `COMPLETE/` (64), `MEGA/` (12), `GIANT/` (10), `ai_ml_engines/` (28), `geometry_engines/` (27), `physics_engines/` (11), `databases/` (11). Master maps: `MONOLITH_MODULE_INVENTORY.json` (1,469 modules · 71 formulas · 20 algorithms · 200 gateway routes), `FINAL_EXTRACTION_SUMMARY.json`, `MODULES_BY_CATEGORY.json`, `EXTRACTION_PRIORITY_LIST.json`.

Module breakdown (from `MONOLITH_MODULE_INVENTORY.json`): ~382 general engines · ~116-128 AI/ML · ~87-128 databases · ~31 optimization · 20 physics formulas · 13 signal-processing · 12 neural/deep-learning · ~336-537 "other".

## Wiring state — ~8-12% reachable as live capability

**Datasets (`extracted/`) ≈ 70% bridged:**
- ✅ Machines → `MachineRegistry` (`PATHS.MACHINES_DB` = `extracted/machines`)
- ✅ Alarms → `AlarmRegistry` (`PATHS.EXTRACTED_DIR/controllers/alarms`)
- ✅ Post-processor DB → `PostProcessorRegistry` (reads `extracted/engines/post_processor/PRISM_POST_PROCESSOR_DATABASE_V2.js`)
- ✅ Knowledge bases → `KnowledgeBaseRegistry`
- ✅ Toolpath strategies (762) → `ToolpathStrategyRegistry` (hand-transcribed once from the monolith, not loaded at runtime)
- ⚠️ Materials → `MaterialRegistry` **MISCONFIGURED**: `PATHS.MATERIALS_DB` (`mcp-server/src/constants.ts:61`) points at `mcp-server/data/materials/` which has only **3 JSON files** — the 1,047-material `extracted/materials_v9_complete/` set is NOT loaded. **1-line fix.**
- ⚠️ Algorithms → `AlgorithmRegistry` loads only ~17 of the 52 in `extracted/algorithms/`
- ⚠️ Tool catalogs → `CatalogRegistryBridgeEngine` maps the 8 vendor catalogs to `ToolRegistry`/`MachineRegistry`, but `enrichAll()` is **never called** — no dispatcher, no caller. The engine is orphaned (written for RX-P5-U02, left unwired).
- 💀 Orphan-dead-weight (no PATHS, safe to ignore): `_ARCHIVE_OLD_MATERIALS/`, `materials_backup_*` ×3, `constants/`, `verification_reports/`.

**Ported engine modules (`extracted_modules/`) ≈ 95% orphaned:** only **8** were rewritten as TypeScript and wired — the L2 engines (`AIMLEngine`, `CADKernelEngine`, `CAMKernelEngine`, `FileIOEngine`, `SimulationEngine`, `VisualizationEngine`, `ReportEngine`, `SettingsEngine`) behind `prism_l2` (37 actions). The other ~1,350 sit as raw `.js` dumps. There is **no single "monolith unbundler"** — each category was hand-bridged via its own registry loader, and the work stalled (`EXTRACTION_PRIORITY_LIST.json` shows ~932 still "remaining", only ~19 ever processed further). `H:/PRISM_ARCHIVE_2026-02-01/EXTRACTED/` (referenced by the `project_archive_outdated` memory) **no longer exists**.

## Revenue-roadmap relevance (v7.2)

The orphaned monolith source overlaps directly with the v7.2 build targets — porting it accelerates the revenue products:

| Revenue product | Orphaned monolith source to harvest |
|---|---|
| **Master Post** (biggest ARR unlock, 44-unit line) | `extracted_modules/GIANT/PRISM_POST_PROCESSOR_GENERATOR.js` (6.5 MB), `extracted_modules/.../PRISM_VERIFIED_POST_DATABASE_V2.js` (5.6 MB — 50+ verified controllers), `extracted/engines/POST_PROCESSOR_100_PERCENT.js` (1,205 lines, 40+ cycles × 15+ dialects) |
| **SFC** (ships Day 3) | `extracted/materials_v9_complete/` (1,047 materials — PATHS repoint), `extracted/catalogs/` (8 vendor catalogs — `CatalogRegistryBridgeEngine.enrichAll()` wire), `extracted_modules/.../PRISM_SIGNAL_ENHANCED.js` (7 MB cutting physics/chatter/thermal), `extracted_modules/.../PRISM_PSO_OPTIMIZER.js` (8.3 MB speed/feed optimization), Kienzle/Taylor formula files |
| **MS1 billing** | `extracted_modules/GIANT/PRISM_SUBSCRIPTION_SYSTEM.js` (8.6 MB — subscription/licensing mechanics) |
| **CADCAM-AI** | `PRISM_AI_100_KB_CONNECTOR.js` (7.2 MB), `PRISM_AI_EXPERT_INTEGRATION.js` (6.6 MB), `PRISM_PRECISION.js` (5.4 MB), `PRISM_TOOLPATH_STRATEGIES_COMPLETE.js`, CAD/CAM kernels |
| **LEARN** | `extracted_modules/complete_extraction/PRISM_220_COURSE_*` (the 220-course catalog) |

**Note:** the ~1,350 orphaned `.js` monolith modules are a SEPARATE, LARGER pool than the 875 "unwired" TS engines counted in `BUILD_STATE` — they aren't even TS yet. v7.2 §R6 (`MS-MONOLITH-HARVEST`) tracks this; 3 quick wins (`U-MONO-MAT-REPOINT`, `U-MONO-CATALOG-WIRE`, `U-MONO-ALGO-SURFACE`) are hoisted into MS0-EXTENSION.

## See also

- `[[prism_l2Engine]]` — the 8 ported engines that ARE wired
- `[[CatalogRegistryBridgeEngine]]` — the orphaned 8-vendor-catalog bridge
- `[[prism_resourceExtraction]]` — the (different) PDF/archive extraction pipeline
- `H:/prism/extracted_modules/EXTRACTION_PRIORITY_LIST.json` — the priority order for the harvest backlog
