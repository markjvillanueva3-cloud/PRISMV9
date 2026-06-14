# WEDM Galaxy PATHS.md — H:/-wide path atlas for slot:mike (Wire Wizard)

> **Purpose:** convert every future Grep/Glob/Agent for the wire-EDM domain from O(N) → O(1). Paste-ready absolute paths.
> **Owner:** slot:mike (galaxy:wedm). **Source:** distilled from `[[reference_wire_domain_atlas_for_mike_2026_05_27]]` (4-parallel-Explore build, 2026-05-27) + this session's WEDM-COMPREHENSIVE-TRAINING-PIPELINE work.
> **Count discipline (CLAUDE.md):** counts below are point-in-time (2026-05-27 atlas); they rot — paths are stable, verify counts live. DO NOT hardcode counts downstream.

---

## A) BACKEND CODE

| Need | Path |
|------|------|
| New/edit WEDM engine (flat — NOT a subdir) | `mcp-server/src/engines/WEDM*.ts` · `mcp-server/src/engines/EDM*.ts` |
| WEDM dispatcher (203 cases / 519 `wedm_*` occ as of 2026-05-27) | `mcp-server/src/tools/dispatchers/edmDispatcher.ts` |
| WEDM action schemas (master) | `mcp-server/src/schemas/edmActionSchemas.ts` (1,124 lines) |
| WEDM DL-core / ERP / lattice / training-template / job-history schemas | `mcp-server/src/schemas/wedm{DLCore,Erp,LatticeGraph,TrainingTemplate,JobHistory}*.ts` |
| WEDM routes | `mcp-server/src/routes/edm.ts` · `mcp-server/src/routes/wedm-erp.ts` |
| WEDM hooks (lib) | `.claude/hooks/lib/wedm-{batch-validate,digest-freshness,physics-constants-gate,program-safety-gate,synthetic-block}.mjs` |
| WEDM digest (live counts — read, don't hardcode) | `mcp-server/data/state/WEDM_DIGEST.json` ⚠ (root CLAUDE.md says `data/docs/` — stale; file is in `data/state/`) |

### Engine clusters (by-name pointers — check ENGINE_DIGEST + duplicationGuard before adding ANY)
- **Physics:** `WEDMSparkErosionModelEngine` · `WEDMGapVoltageControlEngine` · `WEDMMRRPhysicsEngine` · `WEDMThermalFieldEngine` · `WEDMDielectricCorrection` · `WEDMCurrentDensityGuard` · `WEDMPowerDensityGuard` · `WEDMCornerPhysics`
- **Wire mechanics:** `WEDMWire{PathCollision,BreakRisk,BreakPredictor,SpoolConsumption,StressAnalysis,TensionOptimizer,Heating,Deflection}Engine` · `WEDMTaperErrorBudget` · `WEDMSlugTabRetention` · `WEDMWeibullWireLife` · `WEDMKerfWidth` · `WEDMThinWireDerate`
- **Surface integrity:** `EDMSurfaceIntegrityEngine` · `EDMMonitorSurfaceIntegrityEngine` (46K) · `WEDMRecast{LayerML,DepthPredictor}` · `WEDMHeatAffectedZone` · `WEDMRaPredictor`
- **P2P pipeline:** `DXFGeometryParserEngine` · `EDMDrawingInterpretationEngine` (34K) · `EDMFeasibilityEngine` (31K) · `EDMMaterialMachineWireEngine` (70K) · `EDMStartHoleSetupEngine` (48K) · `EDMToolpathStrategyEngine` · `EDMMultiPassStrategyEngine` (14K) · `EDMCuttingParamFlushEngine` (71K) · `EDMWireSlugCornerTaperEngine` · `EDMPostProcessGCodeEngine` (126K) · `EDMCostDocumentationEngine` · `EDMQualityOrchestratorEngine` (102K) · `EDMBiMaterialCompensationEngine` (41K) · `WEDMPrintToProgramEngine` · `AutoPrintToProgramBridgeEngine` · `WEDMJobOutcomeEngine`
- **LoRA/training pipeline (this session's work):** `WEDMLoRA{TrainingScript,RewardShaping,SafetyEvaluator,ReasoningEvaluator,DatasetBuilder,Adapter,Cadence}Engine` · `WEDMCurriculumSchedulerEngine` · `WEDMAcademyBridgeEngine` · `WEDMRetrainTriggerEngine` · `WEDMInferenceRuntimeEngine` · `WEDMOllamaInferenceBridgeEngine` · `WEDMTemplateExtractorEngine`
- **ML/learning:** `WEDMMLParameterOptimizer` · `WEDMFeatureImportance` · `WEDMTransferLearning` · `WEDMOnlineLearning` · `WEDMNeuralTraining` · `WEDMLatticeGraph` · `WEDMGraphAttention` · `WEDMNeighborQuery` · `WEDMTribalTipLearner` · `WEDMFewShotMaterial`
- **AI/reasoning bridges:** `WireEDM{DeepAIHardening,Master,KnowledgeSynthesis,DeepReasoning,AIPrintToProgram,CAMKnowledge,AdvancedNeural}` · `WEDMAnalogicalReasoning`
- **Post router (5 vendors):** `WEDMPostDialectRouterEngine` → `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}`
- **Quality/governance:** `WEDMQualityOrchestrator` · `WEDMGovernanceStore` · `WEDMPreFlightCheck` · `WEDMAutonomySubstrateGateEngine` · `WEDMTribalRuntimeEngine`

---

## B) DATA / REGISTRIES (source-of-truth)

| Need | Path |
|------|------|
| **WEDM tribal source-of-truth (122 entries)** — all `knowledge/tribal/wedm-knowledge-tips-*.md` regenerate FROM this | `mcp-server/src/data/wedm-knowledge-tips.ts` |
| JM Die FA-10S tech tables (E12xx + E28xx per-pass) | `mcp-server/src/data/jm-die-wedm-tech-tables.ts` (220 LOC) |
| JM Die program patterns (4 ground-truth analyses) | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` (570 LOC) |
| WEDM engine registry | `mcp-server/src/data/wedm-engine-registry.ts` |
| Published conditions / machines / resources index | `mcp-server/src/data/wedm-{published-conditions,published-machines,resources-index}.ts` |
| EDM material DB · wire spec sheets (brass/zinc/gamma) | `mcp-server/src/data/edm-material-db.ts` · `mcp-server/src/data/wire-spec-sheets.ts` |
| Course-13 academy WEDM curriculum (Lima) | `mcp-server/src/data/academy/course-13-wire-edm-progressive.ts` |

### Runtime state — `mcp-server/data/state/` (48 WEDM state files)
| Need | Path |
|------|------|
| Lattice graph (1.5M) · GNN weights (131K) | `WEDM_LATTICE_GRAPH.json` · `WEDM_GNN_WEIGHTS.json` |
| Outcome-capture stream | `WEDM_OUTCOME_LEDGER.jsonl` |
| Reasoning trace ledger | `WEDM_REASONING_TRACE_LEDGER.jsonl` |
| LoRA checkpoint state | `WEDM_LORA_CHECKPOINT.json` |
| Capability manifest · parameter corpus · material index | `WEDM_CAPABILITY_MANIFEST.json` · `WEDM_PARAMETER_CORPUS.json` · `WEDM_MATERIAL_INDEX.json` |

---

## C) KNOWLEDGE NODES

| Need | Path |
|------|------|
| Tribal tips (MD, auto-gen from B's TS) | `knowledge/tribal/wedm-knowledge-tips-*.md` (86 files) |
| Per-engine wiki docs | `knowledge/wiki/architecture/engines/wedm/` (205) |
| Per-test wiki docs | `knowledge/wiki/architecture/tests/wedm/` (139) |
| Wire-EDM tactics/lessons tribal | `knowledge/wiki/code-tribal/wedm-*.md` (43) |
| Tribal-category indexes | `knowledge/wiki/architecture/tribal/tribal-wedm-*.md` (11) |
| WEDM material/parameter research lesson | `knowledge/wiki/lessons/wedm-wire-material-and-parameter-research-2026-05-26.md` |
| WEDM wizard inventory spec | `knowledge/wiki/architecture/specs/spec-wedm-wizard-inventory-2026-05-22.md` |
| mike memories (global C:) | `C:/Users/wompu/.claude/projects/H--prism/memory/{reference,feedback,project}_mike_*.md` + `reference_wire_domain_atlas_for_mike_2026_05_27.md` |
| WEDM slash skills | `.claude/commands/{wedm,wedm-audit,wedm-program,wedm-safety-gate,wire-edm-analyze,wire-edm-studio}.md` (+ ~20 more `wedm-*`) |

---

## D) JM DIE WIRE-EDM ARCHIVE — `H:/PRISM/JM DIE/WIRE EDM/` (4,058 files · 99 customers)

> Access per-customer programs via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NOT via Glob/Grep over the tree.

| Need | Path |
|------|------|
| Mastercam X8 projects (2,191) | `JM DIE/WIRE EDM/MCAM X8/` (`.mcx-8`) |
| Mastercam X2 projects (1,779) | `JM DIE/WIRE EDM/PROGRAMS MCAM X2/` (`.MCX`) |
| Raw NC ground truth (the cited parameters) | `WIRE EDM/ITW SHAKEPROOF 500-30540-24000-04.NC` (E12xx 4-pass straight, D2) · `WIRE EDM/NOZE TEST.NC` (E28xx 5-pass UV taper, SS) · `WIRE EDM/Wire Program - 5 inch square.NC` |
| Mitsubishi W31MV-2 .NC originals (mike's empirical extractor target) | `JM DIE/WIRE EDM/` (3 real programs, 20/20-test extractor) |
| Top customers (paste-ready) | TOMEK(433) · ATF(66) · OPTIMAS(61) · AJ MFG(52) · OMG(39) · GRANDEUR(37) · VALLEY(33) · ALLFAST(33) · STABIO(31) · HOLO-KROME(31) · FONTANA(31) · ITW(27) · SFS INTEC(26) |
| **Mitsubishi FA-10S post (JM Die's machine)** | `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-Mitsubishi-FA10S-WEDM.cps` |
| Vendor posts (consolidated) | `JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/wire-edm/` (Agie `.pst` · Makino `.cps`) |
| PRISM-enhanced posts (5 vendors) | `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-{Agie-CUT,Fanuc-ROBOCUT,Makino-U,Mitsubishi-FA10S,Sodick-AQ}-WEDM.cps` |

> **Gap (atlas D5):** prints/.dxf/CAD models are ZERO in the WIRE EDM tree — they live in the separate `_PART LIBRARY` hierarchy. ⚠ `JM DIE/CNC LATHE/NORTHERN WIRE/` is a LATHE customer named "Northern Wire", NOT wire-EDM — do not confuse.

---

## E) CORPUS / FRONTEND / ROADMAP

| Need | Path |
|------|------|
| Lima PDF corpus (gitignored, local — 8,752 pages / 73 PDFs) | `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (16.7M) |
| Mastercam Wire Tutorial text (#1 wire hit) | `state/shared/pdf-extracts/jm-die-tribal-wiki/mastercam-wire-tutorial.txt` |
| WEDM training corpora | `state/shared/wedm-training-corpus/` · `mcp-server/data/wedm-intelligence/` · `mcp-server/data/wedm-lora-smoke-out/` |
| Wire wizard frontend | `mcp-server/web/src/pages/WireEdmWizardPage.tsx` |
| Roadmap (160+ `WEDM-*` milestones) | `mcp-server/data/roadmap-index.json` |

---

## F) GALAXY-LOCAL (this brain)

| File | Role |
|------|------|
| `mcp-server/src/engines/wedm/CLAUDE.md` | galactic-center doctrine (auto-loads for slot:mike) |
| `mcp-server/src/engines/wedm/MEMORY.md` | per-domain working brain (master-brain-linked) |
| `mcp-server/src/engines/wedm/PATHS.md` | THIS file |
| `mcp-server/src/engines/wedm/TOOLBELT.md` | tool-call efficiency patterns |
| `state/shared/slot-souls/mike.md` | mike soul (wedm-specialist) |
| `.claude/hooks/slot-context-bundle-inject.mjs` | `SLOT_GALAXY_MAP.mike = "wedm"` (auto-loads this galaxy) |

---

## H) COMPILED INDEXES — instant pathways (slot:mike, 2026-05-29)

> The "wired, validated, auto-invoked" knowledge + file surface. The CURATED tables above are hand-maintained; these are MACHINE-GENERATED + exists-validated. Regenerate after adding domain files/wiki.

| Index | What | Regenerate | Query |
|-------|------|-----------|-------|
| **Knowledge (tribal+wiki)** — `WEDMKnowledgeIndexEngine` + `wedm-knowledge-index-loader` | unifies the 107 tribal tips (`wedm-knowledge-tips.ts`) + curated wiki (`WEDM_WIKI_KNOWLEDGE.json`) into one ranked-queryable corpus | `node scripts/build-wedm-knowledge-index.mjs` → `mcp-server/data/state/WEDM_WIKI_KNOWLEDGE.json` | `prism_edm:wedm_knowledge_index_query {keywords,topics,tags,sourceTypes,maxResults}` · `wedm_knowledge_index_stats` |
| **File manifest** — complete exists-validated | every wedm file on disk (566: engines/tests/tribal/wiki/schema/data/state/route/galaxy/skill) | `node scripts/build-wedm-file-index.mjs` → `mcp-server/data/state/WEDM_FILE_INDEX.json` | grep/read the JSON; `byCategory` for counts |

**Auto-invoke paths (when needed):** (1) `slot-context-bundle-inject` auto-loads this galaxy (incl. this PATHS.md) for every slot:mike prompt; (2) `tribal-by-domain-inject` surfaces wedm tribal on keyword match `{wedm,edm,wire,sodick,mitsubishi,agie,charmilles,sinker,pcd}`; (3) the `wedm_knowledge_index_query` dispatcher action is the on-demand unified query. Tests: `WEDMKnowledgeIndexEngine.test.ts` (17) + `wedm-knowledge-index-loader.test.ts` (3) = 20/20.

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for wedm:** `JM DIE/WIRE EDM`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the wedm galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlarmDB** (Alarm & Controller Database) — `data/controllers/` · 10,090 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoatingDB** (Tool Coating Database) — `mcp-server/src/registries/CoatingRegistry.ts` · 100 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CollisionDB** (Collision Detection Database) — `data/databases/CollisionDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GCodeTemplateDB** (G-Code Template Database) — `data/databases/GCodeTemplateDB.json` · 6 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MaterialDB** (Material Database) — `data/materials/` · 6,509 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PhysicsMappingDB** (Physics Parameter Mapping Index) — `mcp-server/src/registries/PhysicsMappingRegistry.ts` · 1,942 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PostProcessorDB** (Post Processor Catalog) — `mcp-server/src/registries/PostProcessorRegistry.ts` · 34 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ProcessDataDB** (Process Data Database) — `data/databases/ProcessDataDB.json` · 8 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToleranceDB** (ISO 286 Tolerance Database) — `data/databases/ToleranceDB.json` · 260 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolpathStrategyDB** (Toolpath Strategy Database) — `data/databases/ToolpathStrategyDB.json` · 586 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **VendorCatalogDB** (Vendor / Manufacturer Catalog Database) — `mcp-server/data/vendor-catalog-db/` · 425 entries · manifest `mcp-server/data/vendor-catalog-db/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **WorkholdingDB** (Workholding Reference Database) — `data/databases/WorkholdingDB.json` · 14 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/wedm/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/wedm_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="wedm" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs wedm "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
