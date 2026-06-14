# Lathe Galaxy PATHS.md — H:/-wide path atlas (slot:whiskey)

> THE highest-ROI artifact. Converts every future lathe Grep/Glob from O(N) → O(1). Format: `<path> | <purpose> | <maintainer>`. Built 2026-05-28, comprehensively re-mapped 2026-05-29 (3-agent path-atlas Workflow). When a path moves, fix it here FIRST. **Counts are live-verified 2026-05-29.**

## Engine source (flat — `H:/prism/mcp-server/src/engines/`)
- `engines/lathe/` | galaxy brain dir — **6 files**: CLAUDE/MEMORY/PATHS/TOOLBELT/GSD/KNOWLEDGE (NOT engine code) | whiskey
- `engines/Lathe*.ts` | **194** lathe-prefixed engines (AI ~20, LoRA ~40, physics/ops/safety ~30, JM/cost ~15) | whiskey
- `engines/Turning*.ts` (25) · `Okuma*.ts` (12) · `*MillTurn*.ts` (11) · `Swiss*.ts` (6) · `HardTurn*.ts` (2) · `Eccentric*.ts` (1) | ~57 turning-family | whiskey
- **Workholding:** `engines/{SoftJawProfile,SoftJawBoringGCode,MagneticChuck,SteadyRestPlacement,LatheChuckJawSetup,ChuckJawForce,TailstockForce}Engine.ts` | whiskey
- **Bar/sub-spindle:** `engines/{BarFeeder,BarFeedPitchOptimizer,SubSpindleHandoffVerifier,PPOkumaSubSpindleSync,LatheSubSpindleTransferPurge}Engine.ts` | whiskey
- **Boring/groove/part:** `engines/{BoringBar,BoringBarDeflection,PartingGrooving,GrooveClassification,LathePartingChipClearance}Engine.ts` | whiskey
- **Spindle/CSS/force physics:** `engines/{TurningForce,TurningInsertLife,SpindleTorqueCurve,SpindleTorqueGate,CSSChipLoadInvariantCoordinator}Engine.ts` | whiskey
- **Hard-turn/eccentric/swiss:** `engines/{HardTurningCapstone,HardTurningDecision,EccentricTurning}Engine.ts` + `Swiss{ChannelFileEmitter,GuideBushingPhysics,PartTransferSequence,TypeCollision,TypeDecision,TypeIntelligence}Engine.ts` | whiskey
- `engines/mill/` | sibling mill galaxy (mill-turn handoff) | foxtrot
- `mcp-server/src/physics/constants.ts` | CANONICAL kc/Taylor/material constants — NEVER inline | shared (physics-reviewer)
- `mcp-server/src/registries/` | **PascalCase:** `MaterialRegistry.ts` · `ToolRegistry.ts` · `ToolGeometryDefaults.ts` · `MachineSpindleDefaults.ts` · `CoatingRegistry.ts` · `CoolantRegistry.ts` (NO `workholding.ts` — workholding is engine-level) | shared

## Algorithms / physics models (`H:/prism/mcp-server/src/algorithms/`)
- `KienzleForceModel.ts` · `ExtendedTaylorModel.ts` · `MerchantShearForceModel.ts` · `SandvikTurningForceModel.ts` | turning force/tool-life | shared (physics-reviewer)
- `SpindleVibFFTModel.ts` · `ThermalPartitionModel.ts` · `ParticleSwarm.ts` | chatter/thermal/optimizer | shared

## Schemas — dispatcher action contracts (`H:/prism/mcp-server/src/schemas/`)
- `turningActionSchemas.ts` · `turningProgramActionSchemas.ts` · `threadActionSchemas.ts` · `threadingPipelineActionSchemas.ts` | the 4 lathe dispatcher contracts | whiskey
- `lathe{MasterPost,MasterPostAPI,MasterPostDeepReasoning,MasterPostSelfAwareness,MasterPostUnifiedOutput}ActionSchemas.ts` (5) · `lathePostgenActionSchemas.ts` · `latheSpeedFeedActionSchemas.ts` | post/postgen/SF contracts | whiskey/echo
- `{nxcamTurning,solidcamTurning,solidcamMillTurn}FunctionIndexActionSchemas.ts` | CAM-turning function-index contracts | whiskey/kilo

## Dispatchers (`H:/prism/mcp-server/src/tools/dispatchers/`)
- `turningDispatcher.ts` | 373 actions (3,538 lines) — SAFETY-CRITICAL chuck/spindle/CSS envelope + print-to-program + AGI + LoRA | whiskey
- `turningProgramDispatcher.ts` (14 — print→program, feature taxonomy, ISO 286/2768) · `threadDispatcher.ts` (17) · `threadingPipelineDispatcher.ts` (3) | whiskey
- spindle torque/power safety: `prism_safety:check_spindle_torque`/`check_spindle_power` (safetyDispatcher.ts) — NOT `lathe_spindle_*` (don't exist)
- lathe actions also in `camDispatcher.ts` (`lathe_post_process`, `lathe_sf_*`), `calcDispatcher.ts` (`turning_force`, `merchant_analysis`, `diamond_turning_*`)

## Vendor tool-library catalogs (`H:/prism/mcp-server/src/data/`) — ~30 files, ~10MB
- **Entry point:** `data/turning-vendor-catalog-loader.ts` | unifies all vendor catalogs | whiskey
- `data/sandvik-{2018-rotating,2022-tool,tool}-catalog.ts` + `sandvik-{master,tools}-extracted.json` | Sandvik (~5MB, largest) | whiskey
- `data/tungaloy-{turning,tooling,holder,drill,endmill,us-drill}-catalog.ts` + `*-extracted.json` | Tungaloy (~3MB) | whiskey
- `data/kennametal-{turning,tooling-systems}-catalog.ts` + `kennametal-{turning,holemaking,threading}-extracted.json` | Kennametal | whiskey
- `data/iscar-{turning,tools,endmill,insert_grade}-extracted.json` · `guhring-iscar-speed-feed-data.ts` | ISCAR + Guhring S/F | whiskey
- `data/{mitsubishi,widia-2022,korloy}-turning-catalog.ts` · `korloy-turning-extracted.json` | Mitsubishi/Widia/Korloy | whiskey
- `data/lathe-{tooling,hardening}-catalog.ts` · `lathe-physics-science-tips.ts` · `lathe-tribal-tips-okuma.ts` | PRISM-native lathe data | whiskey
- `data/shop-tools-turning.csv` · `shop-tools-insert-drills-{130,180}.csv` | JM Die shop tool sheets | whiskey

## Okuma OSP knowledge data (`H:/prism/mcp-server/src/data/`)
- `data/okuma-dialect-knowledge.ts` (41K) · `okuma-osp-advanced-knowledge.ts` · `okuma-osp-extracted-tips.ts` | OSP dialect/advanced/tips → OkumaDialectKnowledgeEngine | whiskey
- `data/okuma-{osp-program-examples,program-examples}.ts` (~120K) | OSP program corpus | whiskey
- `data/okuma-machines-from-step.ts` · `okuma-macro-patterns.ts` | machine geometry + macro patterns | whiskey
- `data/hypermill-turning-strategy-catalog.ts` | hyperMILL turning strategy (mill-turn/cam edge) | whiskey/kilo
- `data/jm-die-profile.ts` | **Fleet LTH-01..07, 100% Okuma OSP** (GENOS L300-M/L200E-M/L400II-E · LNC8 · Crown L1060 · LB 3000EX · Multus B250II) — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` | whiskey

## Lint tooling (slot-worktree `H:/prism-slot-whiskey/` — unmerged to shared tree)
- `scripts/lib/lathe-gcode-lint.mjs` (+`.test.mjs`, 28 tests) | **the lathe physics/safety lint BRAIN** (8 gotchas) | whiskey
- `scripts/lathe-program-lint.mjs` | CLI (files/stdin/--plan, --json/--strict) — `/lathe-lint` | whiskey
- `H:/.claude/hooks/lathe-gcode-lint-guard.mjs` | PostToolUse auto-lint on lathe .nc writes | whiskey

## slot:whiskey hermetic libs (`H:/prism-slot-whiskey/scripts/lib/`)
- `lathe-g76-thread-validator.mjs` (G76/G92 threading 7/7) · `lathe-shop-tool-library-bridge.mjs` (12/12) · `lathe-tribal-query-engine.mjs` (12/12) · `lathe-wizard-vendor-lookup.mjs` (9/9) · `lathe-ab-version-locator.mjs` (19+7) · `lathe-training-loop-stage-{4-reason,5-generate}.mjs` (18+13) · `lathe-academy-priors.mjs` | whiskey
- `scripts/lathe-quality-pipeline.mjs` (10-pt rubric, 39/39; exports `parseBlocks`/`extractProgramParameters`) · `scripts/scan-jm-die-ab-pairs.mjs` · `scripts/lathe-baseline-analyzer.mjs` · `scripts/query-lathe-tribal.mjs` | whiskey
- `scripts/lib/README-whiskey-lathe.md` | slot scripts/lib entry point | whiskey

## Tests (`H:/prism/mcp-server/src/__tests__/`)
- `Lathe*.test.ts` / `Turning*.test.ts` / `Okuma*.test.ts` | engine tests (canonical dir per [[feedback_engine_tests_in_tests_dir]]) | whiskey

## State JSON (`H:/prism/mcp-server/data/state/`)
- `lathe-engine-registry.json` · `LATHE_AWARENESS_SPEC_v7.json` (current) · `LATHE_PRODUCTION_READINESS.json` · `TEST_BASELINE_LATHE_PROD.json` · `LATHE_AI_TRAINING_REPORT.json` · `LATHE_AI_FULL_TRAINING_LOG.txt` · `phase_gates/LATHE-PROD-READY-*.json` | whiskey
- `mcp-server/data/jm-die-complete-catalog.json` (8.3MB) · `tool-catalog-inventory.json` · `vendor-catalog-manifest.json` | shop/vendor catalogs | whiskey/shared

## Scripts (`H:/prism/scripts/` — shared tree)
- `build-lathe-{engine-registry,wiring-audit,test-gap,physics-inline-scan,knowledge-coverage}.mjs` | registry/wiring/test-gap/inline-scan/coverage builders | whiskey
- `audit-jm-die-lathe-corpus.mjs` · `upgrade-jm-die-lathe-batch.mjs` · `demo-upgrade-jm-die-lathe-fixtures.mjs` · `train-lathe-full-archive.mjs` · `sfc-variability-enumerate-lathe.mjs` | whiskey
- `extract-{iscar,kennametal}-turning.py` · `extract-tungaloy-turning.py` · `generate-tungaloy-turning-ts.py` | vendor turning extractors | whiskey

## Milestones (`H:/prism/mcp-server/data/milestones/`)
- `LATHE-{MS0..MS8,AI,LORA-MS0,MASTER,P2P-CONSENSUS-MS4,PRO-v2,PRO-v3,PROD-READY-MS0}.json` | **19 JSON + 9 .md** | whiskey

## Wiki (`H:/prism/knowledge/wiki/`) — ~224 dedicated lathe files
- `architecture/engines/lathe/*.md` (122) · `architecture/engines/turning/*.md` (26) · `architecture/tests/lathe/*.md` (38) | per-engine/test wiki | whiskey
- `architecture/*{lathe,turn,okuma}*.md` (8 top-level: lathe-galaxy, lathe-safety-gates, lathe-okuma-dialect, lathe-program-lint, lathe-gsd-protocol, domain-lathe, domain-turning, domain-okuma) | whiskey
- `code-tribal/canonical/*{lathe,turn,okuma}*.md` (5) · `code-tribal/learnings/*{lathe,turn}*.md` (25) | tribal/wiring learnings | whiskey

## Memories — ⭐ the dedicated lathe BRAIN
- `H:/prism/knowledge/memories/galaxies/lathe/` | **~65 files — canonical persistent lathe brain** (11 feedback doctrine + ~54 reference designs/sessions; contains files NOT in C:, e.g. `reference_iter279_sfs_g80_anomaly`, `reference_mazatrol_vs_gmcode_paradigm`) | whiskey ⭐
- `C:/Users/wompu/.claude/projects/H--prism/memory/*{whiskey,lathe,turn,okuma}*.md` | **59** (auto-feeds Obsidian on Stop) | whiskey
- `H:/prism/knowledge/memories/feedback/*whiskey*.md` (11) · `…/_legacy-root/` (5 lathe incl. `project_lathe_master.md`) · `…/project/` (2) | whiskey
- compiled index of all the above: `engines/lathe/KNOWLEDGE.md`

## Tribal stores (NEVER JSON.parse the big indexes — query via engine/dispatcher)
- `H:/prism/state/shared/tribal-embed-index.json` (382MB) | master tribal vector index — query via `lathe-tribal-query-engine.mjs` / `prism_knowledge:tribal_search {slot:whiskey}` | shared
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` (14-vendor) · `jm-die-tribal-wiki-corpus.json` · `lathe-vendor-expansion-2026-05-26.json` · `lathe-videos-tribal-2026-05-26.json` (432 videos) · `extracted-pdfs/cnccookbook-lathe-programming-tips.jsonl` | whiskey
- `H:/prism/state/shared/tribal-graph/` | tribal knowledge graph | shared
- ⚠️ **HYGIENE FLAG:** ~75 orphaned `tribal-embed-index.json.*.tmp` (~25GB leaked, crashed atomic-write storm) — flag for golf sweep, do NOT use.

## JM Die corpus (`H:/PRISM/JM DIE/`) — access via `getJMDieCustomerPath()`, NOT Glob (24K-file noise tree)
- `JM DIE/CNC LATHE/<customer>/` | **118 customers, 14,475 A/B pairs** (primary corpus) | whiskey
- `JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<Machine>/<part>.nc` | v2.0.0 upgrader outputs | whiskey
- `JM DIE/OKUMA/JM Die Company/<customer>/` | **2nd lathe corpus — 31 customers**, Okuma-native | whiskey
- `JM DIE/CNC OKUMA MULTUS/` | mill-turn corpus (ACCURATE THREADED/AIR-INDUSTRIES/ITW + B250 .cps/.min) | whiskey
- `JM DIE/MACRO PROGRAMS/*.min` | Okuma macro templates (casing/counterbore/wafer-insert) | whiskey
- `JM DIE/LATHE/{HI-PERFORMANCE,OPTIMAS}/` | OPTIMAS feed-roll-groove parts | whiskey
- `JM DIE/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/OKUMA/*.step` | machine STEP (sim) | whiskey/india

## Post-processors (3 locations)
- `JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/lathe/{doosan,fanuc,grbl,haas,heidenhain,hurco,mazak,mitsubishi,okuma,siemens,unknown}/` | 11 dialect subdirs | whiskey/echo
- `…/vanilla/mill-turn/{brother,dmg-mori,fanuc,okuma,siemens}/` | 5 mill-turn subdirs | whiskey/echo
- `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/{lathe,mill-turn}/` + `JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_*.cps` | Okuma AI-Enhanced / PRISM-modified posts | echo/whiskey
- `mcp-server/data/posts/fusion-cache/` | ~59 lathe Fusion post variants | echo/whiskey

## Hooks + skills (`H:/.claude/` global + `H:/prism/.claude/` project)
- **Custom whiskey hooks:** `H:/.claude/hooks/whiskey-lathe-context-inject.mjs` (always-on lathe context) · `lathe-gcode-lint-guard.mjs` (PostToolUse auto-lint) | whiskey
- `H:/prism/.claude/hooks/{lathe-master-post-quality-gate,lathe-p2p-suggest,consistent-return-checker}.mjs` | lathe Stop/suggest/return-check | whiskey
- `.claude/hooks/{ai-auto-command-router,agi-safety-envelope-guard,audit-awareness-inject}.mjs` | lathe-context detectors | shared
- **Skills:** project (6) `H:/prism/.claude/commands/{lathe,lathe-studio,lathe-postgen,lathe-lora,lathe-master-post,lathe-lint}.md` + `galaxy-verify-whiskey.md`; user-global (25) `H:/.claude/commands/{lathe-thread,lathe-groove,lathe-print-to-program,hard-turn,chip-control,swiss-program,swiss-production,okuma-macro,auto-speed-feed-lathe,cost-optimize-lathe,quality-check-lathe,quality-gate-lathe,ship-lathe,lathe-wizard-test,lathe-agi-explain,lathe-erp,…}.md` | whiskey
- `slot-context-bundle-inject.mjs` `SLOT_GALAXY_MAP` → `whiskey:"lathe"` | slot↔galaxy map | shared

## Soul + galaxy docs (6-file brain — full set in WORKTREE; shared tree has stale 2-file)
- `state/shared/slot-souls/whiskey.md` | lathe-specialist soul | whiskey
- `engines/lathe/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD,KNOWLEDGE}.md` | this galaxy (GSD=session protocol · KNOWLEDGE=compiled wiki+tribal+memory index) | whiskey
- ⚠️ **DRIFT:** the full 6-file galaxy lives ONLY in `H:/prism-slot-whiskey/...` (unmerged); shared `H:/prism/mcp-server/src/engines/lathe/` has only stale CLAUDE+MEMORY. Merge slot/whiskey to sync.

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for lathe:** `JM DIE/CNC LATHE` · `JM DIE/LATHE` · `JM DIE/OKUMA` · `JM DIE/CNC OKUMA MULTUS` · `resources/MULTUS PROGRAMS`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the lathe galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlarmDB** (Alarm & Controller Database) — `data/controllers/` · 10,090 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoatingDB** (Tool Coating Database) — `mcp-server/src/registries/CoatingRegistry.ts` · 100 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CollisionDB** (Collision Detection Database) — `data/databases/CollisionDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoolantDB** (Coolant Reference Database) — `data/databases/CoolantDB.json` · 5 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GCodeTemplateDB** (G-Code Template Database) — `data/databases/GCodeTemplateDB.json` · 6 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MaterialDB** (Material Database) — `data/materials/` · 6,509 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PhysicsMappingDB** (Physics Parameter Mapping Index) — `mcp-server/src/registries/PhysicsMappingRegistry.ts` · 1,942 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PostProcessorDB** (Post Processor Catalog) — `mcp-server/src/registries/PostProcessorRegistry.ts` · 34 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ProcessDataDB** (Process Data Database) — `data/databases/ProcessDataDB.json` · 8 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **SpindleDB** (Spindle Protection Database) — `data/databases/SpindleDB.json` · 5 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ThreadDB** (Thread Specifications Database) — `data/databases/ThreadDB.json` · 339 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToleranceDB** (ISO 286 Tolerance Database) — `data/databases/ToleranceDB.json` · 260 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolDB** (Cutting Tool Database) — `data/tools/` · 13,967 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolpathStrategyDB** (Toolpath Strategy Database) — `data/databases/ToolpathStrategyDB.json` · 586 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **VendorCatalogDB** (Vendor / Manufacturer Catalog Database) — `mcp-server/data/vendor-catalog-db/` · 425 entries · manifest `mcp-server/data/vendor-catalog-db/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **WorkholdingDB** (Workholding Reference Database) — `data/databases/WorkholdingDB.json` · 14 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/lathe/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/lathe_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="lathe" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs lathe "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
