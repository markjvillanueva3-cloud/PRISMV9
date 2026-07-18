# Mill Galaxy — PATHS.md (H:/-wide path atlas for slot:foxtrot)

> Converts every future Grep/Glob from O(N) → O(1) for mill work. Format: `<path> | <purpose> | <mtime-or-NA> | <maintainer-slot>`.
> Seeded from [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] (whiskey iter275 + foxtrot iter23). Re-verify counts on the live tree before relying. Built 2026-05-28 (U-PSGB-FOXTROT).

## Galaxy doctrine (this dir)
- `mcp-server/src/engines/mill/CLAUDE.md` | galaxy doctrine sentinel (Bibryam P1) | 2026-05-28 | foxtrot
- `mcp-server/src/engines/mill/MEMORY.md` | connected working brain | 2026-05-28 | foxtrot
- `mcp-server/src/engines/mill/PATHS.md` | this atlas | 2026-05-28 | foxtrot
- `mcp-server/src/engines/mill/TOOLBELT.md` | tool-call patterns | 2026-05-28 | foxtrot

## Engines (flat — mill engines live in the parent, not in mill/)
- `mcp-server/src/engines/` | ~222 `Mill*`/`*Milling*`/op-specific engines (flat) | live | foxtrot
- `mcp-server/src/engines/hypermill/` | HyperMILL sub-galaxy (~17 dedicated + 50+ flat `Hyper*`) | live | foxtrot
- key engines: `MillingForceEngine` `AdvancedMillingStrategiesEngine` `MillKinematicsCollisionEngine` `MillingAGIMasterEngine` `MillingPrintToProgramEngine` `MillStrategyNeuralEngine` `MillProgramOptimizerEngine` `MillBlockTimeProfilerEngine` `MillTurnOrchestrationEngine` `SpeedFeedOrchestratorEngine`

## Dispatcher
- `mcp-server/src/tools/dispatchers/millDispatcher.ts` | `prism_mill`, 49 actions, 217.8K | live | foxtrot
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` | `cam_mill_*` sub-actions | live | kilo
- `mcp-server/src/tools/dispatchers/cncOpsDispatcher.ts` | drill/mill/turn ops routing | live | foxtrot

## Schemas
- `mcp-server/src/schemas/millActionSchemas.ts` | 49 Zod + shared types (isoMaterialGroup, millingStrategy, toolpathType…), 87.3K | live | foxtrot
- `mcp-server/src/schemas/{hyperMillCodeGenerator,nxcamMillingFunctionIndex,powerMillRoughingFunctionIndex,powerMillFinishingFunctionIndex,solidcamMillTurnFunctionIndex}ActionSchemas.ts` | CAM-vendor mill schemas | live | foxtrot/kilo

## Registries
- `mcp-server/src/registries/ToolpathStrategyRegistry.ts` | 197K strategy LUT (largest; rough/finish/adaptive/HSM/trochoidal/peel/plunge/waterline/rest) | live | foxtrot
- `mcp-server/src/registries/{ToolRegistry,ToolGeometryDefaults,MachineRegistry,MaterialRegistry,CoolantRegistry,CoatingRegistry}.ts` | tool/machine/material/coolant/coating data | live | foxtrot/juliett

## Physics & algorithms (NEVER inline — import)
- `mcp-server/src/physics/constants.ts` | Kienzle kc1.1/mc + Taylor C,n canonical (P1800 M2100 K1100 N700 S2800 H3200) | live | shared
- `mcp-server/src/algorithms/{KienzleForceModel,ExtendedTaylorModel,ChipThinningCompensation,SurfaceFinishPredictor,ToolDeflectionModel,ThermalPartitionModel,JaegerTempField,JohnsonCookModel,PowerTorqueCalc,StabilityLobeDiagram,ToolWearPrediction,ChipTypePredictionModel,GilbertMRRModel}.ts` | 12 algos, mill = primary consumer | live | tango

## Posts
- `mcp-server/data/posts/` | 318 canonical `.cps` (Fusion 360; Haas 75+, Hurco, Okuma, Mazak, Fanuc, Brother, DMG, Doosan, Siemens) | live | echo
- `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/{brother,datron,deckel,dmg-mori,fadal,fanuc,grbl,haas,heidenhain,hurco,kern,mazak,mitsubishi,okuma,siemens,roku-roku}/` | 262 JM-tuned posts | live | echo
- `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (~92K) + `master-post-*` | post engines | live | echo

## JM Die mill corpus
- `JM DIE/CNC MILL HAAS/` | 51-58 customers, 469 files (.NC/.nc/.mcx-8/.stp/.STEP/.MIN/.SLDPRT); top FONTANA 102, OMG 51, ATF 49 | live | foxtrot
- `JM DIE/HURCO CNC PROGRAMS/` | 25 `.hnc` Hurco WinMax programs | live | foxtrot
- `JM DIE/_PART LIBRARY/<customer>/` | 2,505 CAD (.dxf 1586, .STEP+.stp 499, .DWG 231, Parasolid 129, .SLDPRT 48) | live | delta
- `mcp-server/src/data/jm-die-profile.ts` | VMC-01..05 mill machine specs + registered posts | live | foxtrot
- `mcp-server/src/engines/ShopConfigurationEngine.ts` | 21-machine shop config (5 mill) | live | hotel
- NOTE: NO `JM DIE/CNC MILLING/` parent; NO `PRISM_UPGRADED/` mill outputs; NO central `TOOL LIST/` (tool data embedded in program headers)

## State / ingestion / tribal data
- `mcp-server/data/ingestion_cache/milling-extraction-curriculum.json` | 50 PDFs, 3-tier, feeds 11 sub-systems | 2026-05-26 | foxtrot
- `mcp-server/data/ingestion_cache/milling-vendor-online-resources.json` | 8 vendor manifests (DAPRA/Sandvik/Kennametal/Ingersoll/Iscar/Mitsubishi/Seco/Sumitomo), 47+ URLs | 2026-05-26 | foxtrot
- `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` | `MILLING_PDF_CITED_TIPS` (268 tips) + `milling-training-index.ts` | live | foxtrot
- `state/shared/system-viz/milling-extracted-pdf-bridge-augmentation.json` (68 PDFs) + `milling-tribal-tip-bridge-augmentation.json` (78 tips) | viz augments | live | sierra
- `state/shared/system-viz/staging/galaxy-roosts/{mill,pdf-corpus-mill}.json` | galaxy roost nodes | live | sierra

## Wiki
- `knowledge/wiki/architecture/actions/calc/{kienzle-milling,milling-forces,trochoidal-milling-calc,high-feed-milling-calc,ball-end-mill-calc,helical-milling-calc,thread-mill-calc,spline-mill-calc}.md` | mill calc actions | live | foxtrot
- `knowledge/wiki/code-tribal/learnings/mill-video-corpus-ms0-{u-haas-sandvik-video-corpus,u-dapra-hem-video-corpus}.md` | manufacturer tribal | live | foxtrot
- `knowledge/wiki/architecture/actions/cam/cam-hypermill-ai-orchestrate.md` + `bridge-deep-u-bridge-sfc-hypermill.md` | CAM/SFC bridges | live | kilo/oscar

## Scripts (regen-able)
- `scripts/generate-milling-extracted-pdf-bridge.mjs` | PDF → system-viz (68 PDFs) | foxtrot
- `scripts/generate-milling-tribal-tip-bridge-features.mjs` | cited tips → viz | foxtrot
- `scripts/audit-mill-psn-coverage.mjs` | PSN-coverage audit | foxtrot
- `scripts/mill-wiring-audit.mjs` | engine→dispatcher wiring audit (unwired + ROI ranking) | foxtrot
- `scripts/mill-path-index.mjs` | **VALIDATED instant-pathway index** → `mill/PATH-INDEX.json` (existence-checked; incl `databases-juliett` edge). Run `--check` for CI, `--missing` to list absent. | foxtrot
- `scripts/regen-mill-awareness.mjs` | live AWARENESS.md generator | foxtrot
- `scripts/extract-jm-milling-tools-fusion.mjs` + `scripts/extract-{tungaloy-endmills,kennametal-milling,hypermill-speedfeed}.{mjs,py}` | tool/vendor extractors | foxtrot

## Hooks & skills
- `H:/.claude/hooks/slot-context-bundle-inject.mjs` | injects mill galaxy for foxtrot (SLOT_GALAXY_MAP `foxtrot:'mill'` line 70) | live | sierra/zulu
- `H:/.claude/hooks/tribal-by-domain-inject.mjs` | top-3 mill tribal on keyword | live | shared
- `~/.claude/commands/{mill,mill-studio,mill-harden,mill-optimize,mill-validate,mill-learn,mill-master,mill-agi,mill-awareness}.md` | mill skills | foxtrot
- `state/shared/MILL-MASTER-HANDOFF.md` | 79 phases, 900 units (2026-04-21 lock) | foxtrot

## Cross-galaxy entry points
- `../lathe/CLAUDE.md` (mill-turn) · `../post-processor/CLAUDE.md` (G-code emit) · `../cam/CLAUDE.md` (strategy) · india closed-loop surfaces (`xproc_*`)
- **juliett (databases):** `registries/{Tool,Material,Machine,Coolant,Coating}Registry.ts` + `ToolGeometryDefaults.ts` + `data/jm-die-profile.ts` + `data/jm-die-database/` — mill is the primary consumer; juliett owns DB schema/expansion. Validated set: `PATH-INDEX.json` §`databases-juliett`. Never re-derive material kc/density or tool geometry — read the registry.

## Known gaps / next-session candidates (from atlas §17)
1. No unified mill-archive locator (programs split CNC MILL HAAS + HURCO).
2. No `PRISM_UPGRADED/` mill outputs (lathe v2.0.0 pipeline not yet run on mill).
3. No mill tool-list ingestion (data embedded in headers).
4. `hypermill/CLAUDE.md` missing (documented FUTURE).
5. VMC-05 Roku-Roku has no registered post — verify (bug or by-design).

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for mill:** `JM DIE/CNC MILL HAAS` · `JM DIE/HAAS-HURCO` · `JM DIE/HURCO CNC PROGRAMS` · `resources/HSMWorks 2027` · `resources/MasterCam`
<!-- END:critical-resource-roots -->





<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why mill (foxtrot — Milling Wizard):** Milling-tool S/F source: Fraisa / LMT / ITC / CGS / Kodiak / HAM / Zecha / Tru-Edge milling makers feed mill speed/feed recommendations. Read the manifest for milling-maker targets + the pulled PDFs for cutting-data tables.
- `state/shared/quoting/catalog-sfc-extraction-manifest.json` (json) — per-maker SFC extraction manifest: vendor -> target mcp-server/src/data/<vendor>-speed-feed-data.ts + extraction_priority + iso_groups_expected + catalog_on_disk + already_ingested + jm_buys. THE worklist for S/F extraction.
- `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29` (dir) — 190 validated vendor cutting-tool catalog + dedicated speeds/feeds-chart PDFs pulled this expansion (browser->curl, %PDF + size validated)
- `mcp-server/src/data` (dir) — oscar's per-vendor <vendor>-speed-feed-data.ts S/F databases — the extraction TARGETS for the 44 HIGH/not-ingested makers (ingested via ToolCatalogEngine.addTools())
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the mill galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
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

- **wiki (domain):** `knowledge/wiki/mill/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/mill_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="mill" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs mill "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
