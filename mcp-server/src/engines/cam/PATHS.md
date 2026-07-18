# CAM Galaxy PATHS.md — H:/-wide path atlas (slot:kilo)

> Converts future Grep/Glob from O(N) → O(1) for slot:kilo. Format: `<absolute-path> | <purpose> | <maintainer>`. Hit THIS before any broad filesystem scan. Verified 2026-05-28 (disk-gather; system-viz graph was degraded).

## Galaxy center
- `H:/prism/mcp-server/src/engines/cam/CLAUDE.md` | galaxy doctrine head | kilo
- `H:/prism/mcp-server/src/engines/cam/MEMORY.md` | galaxy working brain | kilo
- `H:/prism/mcp-server/src/engines/cam/PATHS.md` | this atlas | kilo
- `H:/prism/mcp-server/src/engines/cam/TOOLBELT.md` | tool-call cheatsheet | kilo
- `H:/prism/state/shared/slot-souls/kilo.md` | CAM-specialist soul | kilo

## Engine source (71 CAM* + 68 hyperMILL)
- `H:/prism/mcp-server/src/engines/CAM*.ts` | 71 top-level CAM engines (orchestration/AI/feature/catalog/validation/in-host) | kilo
- `H:/prism/mcp-server/src/engines/hypermill/` | 68 hyperMILL bridge engines (AC bridge, AI orchestration, blade roughing, 5-axis tilt) | kilo
- `H:/prism/mcp-server/src/engines/CAMAGIMasterOrchestratorEngine.ts` | top-level CAM reasoning (49K) | kilo
- `H:/prism/mcp-server/src/engines/CAMKernelEngine.ts` | DXF/SVG/NL intent → strategy (47K) + `CAMKernelDispatcherBridge.ts` | kilo
- `H:/prism/mcp-server/src/engines/CAMCrossSystemTranslatorEngine.ts` | cross-vendor strategy mapping | kilo
- `H:/prism/mcp-server/src/engines/CAMFeedbackLoopEngine.ts` | india closed-loop tap | kilo
- toolpath physics (shared): `H:/prism/mcp-server/src/engines/{Trochoidal,Adaptive,ScallopHeight,...}Toolpath*.ts` | reached via toolpathDispatcher | tango/kilo

## Dispatchers (source)
- `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` | prism_cam — primary CAM execution surface | kilo
- `H:/prism/mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts` | per-vendor function index | kilo
- `H:/prism/mcp-server/src/tools/dispatchers/toolpathDispatcher.ts` | prism_toolpath — strategy/sim engine | tango/kilo

## State JSON / registries (`mcp-server/data/state/`)
- `H:/prism/mcp-server/data/state/CAM_VENDOR_REGISTRY.json` | vendor + strategy compatibility map (10K) | kilo
- `H:/prism/mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json` | CAM AI action index (310K) | kilo
- `H:/prism/mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json` | CAM tribal RAG index (5.3M) | kilo
- `H:/prism/state/shared/corpus/cam-tribal-tips.jsonl` | 928 real-data CAM tribal tips (catalog-traced); regen `node scripts/emit-cam-tribal-tips.mjs` (MCP/Ollama-free) | kilo
- `H:/prism/scripts/emit-cam-tribal-tips.mjs` | CAM tribal extractor: catalog descriptions → corpus jsonl | kilo
- `H:/prism/state/shared/CAM-KNOWLEDGE-INDEX.md` | **COMPILED CAM knowledge map** — 519 CAM wiki leaves (grouped by subdir) + tribal sources + key paths; the one-stop search surface. Regen `node scripts/cam-knowledge-index.mjs` (fs-only) | kilo
- `H:/prism/scripts/cam-knowledge-index.mjs` | compiles all CAM wiki+tribal+paths into the knowledge index | kilo
- `H:/prism/mcp-server/data/state/CAM_ML_DRIFT_LOG.jsonl` | ML drift telemetry | india/kilo
- `H:/prism/mcp-server/data/state/CAM_UIX_COVERAGE_BASELINE.json` · `CAM_UIX_RATELIMIT_REGISTRY.json` · `cam_uix_scope_decisions.json` | UIX coverage/ratelimit/scope | kilo
- `H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json` | CAM PDF corpus index (1M) | kilo
- `H:/prism/mcp-server/data/state/CAMK-MS2/` · `CAMK-MS3/` | CAM-kernel milestone state | kilo

## Scripts (`H:/prism/scripts/`)
- `build-cad-cam-resources-pdf-index.mjs` | index Mastercam/hyperMILL/OPEN MIND PDFs | kilo
- `consolidate-cadcam-corpus.mjs` | merge CAD/CAM corpus | kilo
- `extract-cad-cam-pdf-content.mjs` · `extract-cam-domain-pdfs.sh` | PDF content extract | kilo
- `extract-cadcam-tribal-wiki.mjs` | CAM PDF → tribal + wiki seeds | kilo
- `generate-cad-cam-pdf-tribal-seeds.mjs` · `generate-cadcam-training-corpus-features.mjs` | tribal/training feature emit | kilo/india
- `_audit-foxtrot-mill-cam.mjs` | mill↔cam boundary audit | foxtrot/kilo

## Physics (canonical — import, never inline)
- `H:/prism/mcp-server/src/physics/constants.ts` | Kienzle kc1.1/mc, Taylor C/n, material props | shared

## Wiki (`H:/prism/knowledge/wiki/architecture/`)
- `cam-galaxy.md` | CAM galaxy architecture (kilo-owned, this buildout) | kilo
- `cad-cam-resources-pdf-index.md` | CAM corpus PDF index entry | kilo
- `domain-pipeline-ms0.md` | 18-stage print-to-part pipeline (CAM=middle) | juliett/kilo
- `domain-galaxy-doctrine-2026-05-26.md` (under specs) | per-domain galaxy doctrine | alpha

## JM Die CAM corpus (`H:/PRISM/JM DIE/`)
- `JM DIE/FUSION CAD AND CAM FILES/` | Fusion CAD+CAM (subdirs: ELECTRODES, JM, MANNY, OKUMA, ROKU ROKU) | kilo
- `JM DIE/CNC MILL HAAS/` | Haas mill programs | foxtrot/kilo
- `JM DIE/ROKU-ROKU/CAM TEMPLATES/` | Roku-Roku CAM templates | kilo
- `JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/` | OPEN MIND training corpus | kilo
- `JM DIE/{CNC LATHE,Prism JM Die}/CAMCAR/` | lathe CAM | whiskey/kilo
- corpus map memory: `C:/Users/wompu/.claude/projects/H--prism/memory/reference_cam_corpus_locations.md` (Mastercam X8 + hyperMILL 31/33 paths)

## Hooks + skills + memory
- `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` | loads this galaxy (SLOT_GALAXY_MAP.kilo='cam') | shared
- `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs` | top-3 kilo CAM tribal per prompt | shared
- `H:/prism/.claude/hooks/outcome-bus-auto-tap.mjs` | auto-publish CAM outcomes to india | india
- `H:/prism/.claude/commands/cam-*.md` + vendor `*-setup.md` / `*-strategy-guide.md` + `cam-route-kilo.md` | CAM skills | kilo
- `C:/Users/wompu/.claude/projects/H--prism/memory/{reference,feedback}_kilo_*.md` | kilo memories (auto-fed to `H:/prism/knowledge/memories/<type>/`) | kilo

## Extraction log (do NOT re-extract)
- `H:/prism/mcp-server/data/state/extraction-log.json` | Mastercam(45)/hyperMILL(25) already extracted | kilo
- `H:/prism/mcp-server/data/state/cross-session-asset-registry.json` | cross-session dup guard | shared

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for cam:** `resources/FUSION 360 PROGRAMS` · `resources/HSMWorks 2027` · `resources/MasterCam` · `resources/SOLIDCAM` · `resources/OPEN MIND` · `resources/HYPERMILL` · `resources/inventor-hsm` · `JM DIE/FUSION CAD AND CAM FILES`
<!-- END:critical-resource-roots -->





<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why cam (kilo — CAM):** Toolpath tool selection: CAM consumes the maker tool catalogs + S/F for its tool database (tool geometry, recommended engagement, vc/fz). Read the manifest for per-maker targets + the pulled PDFs.
- `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29` (dir) — 190 validated vendor cutting-tool catalog + dedicated speeds/feeds-chart PDFs pulled this expansion (browser->curl, %PDF + size validated)
- `state/shared/quoting/catalog-sfc-extraction-manifest.json` (json) — per-maker SFC extraction manifest: vendor -> target mcp-server/src/data/<vendor>-speed-feed-data.ts + extraction_priority + iso_groups_expected + catalog_on_disk + already_ingested + jm_buys. THE worklist for S/F extraction.
- `mcp-server/src/data` (dir) — oscar's per-vendor <vendor>-speed-feed-data.ts S/F databases — the extraction TARGETS for the 44 HIGH/not-ingested makers (ingested via ToolCatalogEngine.addTools())
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the cam galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlgorithmDB** (Algorithm Database) — `data/algorithms/` · 52 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CAMSystemDB** (CAM System Integration Database) — `data/databases/CAMSystemDB.json` · 61 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoatingDB** (Tool Coating Database) — `mcp-server/src/registries/CoatingRegistry.ts` · 100 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CollisionDB** (Collision Detection Database) — `data/databases/CollisionDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoolantDB** (Coolant Reference Database) — `data/databases/CoolantDB.json` · 5 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **DecisionTreeDB** (Decision Tree Reference Data) — `data/databases/DecisionTreeDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GCodeTemplateDB** (G-Code Template Database) — `data/databases/GCodeTemplateDB.json` · 6 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
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

- **wiki (domain):** `knowledge/wiki/cam/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/cam_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="cam" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs cam "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
