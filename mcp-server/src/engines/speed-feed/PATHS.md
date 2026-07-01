# Speed-Feed (SFC) Galaxy — PATHS.md (H:/-wide path atlas for slot:oscar)

> THE highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for slot:oscar.
> Format: `<absolute-path> | <purpose> | <maintainer-slot>`. Verify mtime before trusting a stale row.
> Engines live FLAT at `mcp-server/src/engines/` — there is no per-engine `speed-feed/` subdir (this dir is the doctrine pointer only). Source-of-truth inventory: `reference_oscar_sfc_domain_map_2026_05_27`.

## Galaxy doctrine (this dir)
- `H:/prism/mcp-server/src/engines/speed-feed/CLAUDE.md` | operational scope + PSN edges + anti-patterns | oscar
- `H:/prism/mcp-server/src/engines/speed-feed/MEMORY.md` | cross-session brain + master-brain link | oscar
- `H:/prism/mcp-server/src/engines/speed-feed/PATHS.md` | THIS file | oscar
- `H:/prism/mcp-server/src/engines/speed-feed/TOOLBELT.md` | tool-call patterns | oscar
- `H:/prism/state/shared/slot-souls/oscar.md` | oscar voice/refuses (speed-feed-specialist) | oscar

## Primary orchestrator engines
- `H:/prism/mcp-server/src/engines/UltimateSpeedFeedEngine.ts` | canonical physics (31 models, 401 assertions) | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` | central hub (2,851 LOC) | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` | 9-axis composition + 3 modes + clamp | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeed{AdvancedAI,DeepLearning,UltimateAI}Engine.ts` | SF-AI L1/L2/L3 (training U-OSC9-17) | oscar+india

## Baseline · at-scale · cross-vendor
- `H:/prism/mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts` | diff vs 5 vendor baseline DBs | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts` | physics-invariant bounded cartesian sweep + ledger (I1–I6) | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedTriVendorBatchComparatorEngine.ts` | PRISM×baseline×G-Wizard matrix (U-OSC9-14) | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedCatalogJoinerEngine.ts` | per-cell Vc delta recovery where toolcrib matched | oscar

## Feedback · propagation
- `H:/prism/mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts` | outcome→DL calibration (audit F9) | oscar+india
- `H:/prism/mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts` | Bayesian prior from PSN | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedDownstreamSubscriberEngine.ts` | sfcOutcomeWire → 5 caches | oscar
- `H:/prism/mcp-server/src/engines/SpeedFeedPropagationBridgeEngine.ts` | fan-out → post + mill/lathe/wedm + print_to_program; also carries MRR → cycle_min into charlie's quoting (no dedicated oscar quote bridge) | oscar

## Specialized + vendor bridges + parity exporters
- `H:/prism/mcp-server/src/engines/{MachineAware,HeatTreatmentAware}SpeedFeedEngine.ts` | machine/HT adjustments | oscar
- `H:/prism/mcp-server/src/engines/CAMSpeedFeedBridgeEngine.ts` | 6 CAM-system S/F vocab normalize ↔ orchestrator | oscar+kilo
- `H:/prism/mcp-server/src/engines/SpeedFeedChatterStabilityAdapterEngine.ts` | Altintas SLD + RCSA-FRF (U-OSC9-06) | oscar
- `H:/prism/mcp-server/src/engines/LatheSpeedFeed*.ts` | lathe facade family (Facade/DLAdvisor/ShopAware/Reasoning) | oscar+whiskey
- `H:/prism/mcp-server/src/engines/{GWizardAdapter,HSMAdvisorAdapter,HSMAdvisorComparatorBridge}Engine.ts` | live vendor readers | oscar
- `H:/prism/mcp-server/src/engines/PRISMToolCatalogAggregatorEngine.ts` | 24 *-extracted.json → 41,192 deduped tools | oscar
- `H:/prism/mcp-server/src/engines/{GWizard,HSMAdvisor}LibraryExporterEngine.ts` | ShopTool[] → toolcrib.csv / tooldb2.xml | oscar
- `H:/prism/mcp-server/src/engines/HSMAdvisorMachineExporterEngine.ts` | machine fleet → machines.xml | oscar
- `H:/prism/mcp-server/src/engines/WedmTrainingPairBridgeEngine.ts` | mike's 98-pair WEDM corpus indexer (U-OSC9-13) | oscar+mike

## Algorithms + constants (NEVER inline a constant)
- `H:/prism/mcp-server/src/algorithms/{KienzleForceModel,ExtendedTaylorModel,MerchantShearForceModel,PowerTorqueCalc,GilbertMRRModel}.ts` | core physics | oscar
- `H:/prism/mcp-server/src/algorithms/{StabilityLobeDiagram,FRFStabilityLobe,STFTChatter,SpindleVibFFTModel}.ts` | chatter | oscar
- `H:/prism/mcp-server/src/algorithms/{ToolWearPrediction,BayesianWearModel,UsuiWearModel,JohnsonCookModel,ToolDeflectionModel}.ts` | wear/deflection | oscar
- `H:/prism/mcp-server/src/physics/constants.ts` | **canonical kc1.1 + Taylor C/n — single source** | bravo/alpha (read-only for oscar)
- `H:/prism/mcp-server/src/physics/unit-conversions.ts` | RPM↔m/min, feed↔chip-thickness | oscar
- `H:/prism/mcp-server/src/registries/{Material,Tool,Machine,MachineSpindleDefaults,Coating,Coolant,Algorithm,Formula}Registry.ts` | registries | oscar+juliett

## Data catalogs
- `H:/prism/mcp-server/src/data/*-tool-catalog.ts` | ~24 vendor tool catalogs (sgs/osg/guhring/sandvik/seco/helical/emuge/…) | oscar+juliett
- `H:/prism/mcp-server/src/data/*-extracted.json` | 41,192 deduped tools (PRISMToolCatalogAggregator source) | oscar
- `H:/prism/mcp-server/src/data/{guhring-iscar,helical,osg,manufacturer,new-manufacturer}-speed-feed-data.ts` | S/F tables | oscar
- `H:/prism/mcp-server/src/data/hypermill-speed-feed-catalog.ts` (1.2M) | materials×tools matrix | oscar+kilo
- `H:/prism/mcp-server/src/data/hypermill-materials-catalog.ts` (1.2M) | Kienzle + Johnson-Cook | oscar
- `H:/prism/mcp-server/src/data/machine-torque-curves.ts` (745K) · `machine-kinematics-enriched.ts` (430K) | spindle envelope | oscar+machine-setup
- `H:/prism/mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` (260K) | Kennametal/Sandvik/CNC-Cookbook cited S/F | oscar+foxtrot
- `H:/prism/mcp-server/src/data/shop-tools/shop-tools-{endmills,twist-drills,insert-drills-130,insert-drills-180,boring-rough,boring-finish,turning}.csv` | JM on-hand (218 tools) | oscar

## Operator live vendor data (NOT in repo — AppData)
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/{machines.xml,user_tool_lib.tooldb2.xml,settings_v2.xml}` | 12 machines + 41,209 tools applied 2026-05-27 (.bak originals exist) | oscar
- `C:/Users/wompu/AppData/Roaming/GWizard.*/Local Store/toolcrib.csv` | 41,209 tools applied (.bak original) | oscar
- `.../GWizard.db` | 11KB SQLite (effectively-empty machines DB; U-OSC9-15-GWIZARD-MACHINE-DB deferred) | oscar

## JM Die fleet
- `H:/PRISM/JM DIE/jm-die-profile.ts` | JM_DIE_CONTROLLER_MAP (15: 7 Okuma lathes + 5 mills + 2 sinker + 1 wire) | oscar+all
- `H:/PRISM/JM DIE/{CNC MILL HAAS,CNC OKUMA MULTUS,HURCO CNC PROGRAMS,CNC LATHE}/` | program corpus (S/F mining source) | oscar+foxtrot+whiskey

## Dispatchers (action surface)
- `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` | ~50 `sfc_*` / `speed_feed_*` / `*_speed_feed*` actions (grep, don't full-read) | oscar
- `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` | `lathe_sf_full`, `auto_speed_feed_optimize` | oscar+echo+kilo

## State ledgers + milestone
- `H:/prism/mcp-server/data/state/{REASONING_TRACE_LEDGER,MILLING_REASONING_TRACE_LEDGER,cost-telemetry}.jsonl` | SFC traces + cost↔MRR | oscar
- `H:/prism/mcp-server/data/state/outcomes/outcomes.jsonl` | domain completion events (india loop) | oscar+india
- `H:/prism/mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json` | primary SFC milestone envelope | oscar

## Wiki · skills · hooks · scripts · tests · memories
- `H:/prism/knowledge/wiki/architecture/{speed-feed-galaxy,sfccalculateengine,sfcdriftcanaryengine}.md` + `actions/calc/speed-feed*.md` | wiki | oscar
- `H:/prism/.claude/commands/{auto-speed-feed,auto-speed-feed-lathe,test-speed-feed,cycle-time-crush,sf-audit-oscar}.md` | skills | oscar
- `H:/prism/.claude/hooks/oscar-sfc-constants-guard.mjs` | additive constant-inline reminder (this galaxy) | oscar
- `H:/prism/mcp-server/scripts/hooks/sfc-provenance-guard.mjs` | PostToolCall provenance gate | oscar
- `H:/prism-slot-oscar/scripts/{sf-tri-vendor-smoke,sf-parity-preview}.mjs` | tri-vendor matrix + parity export smoke | oscar
- `H:/prism/mcp-server/src/__tests__/*SpeedFeed*.test.ts` + `UltimateSpeedFeedEngine` 401 gauntlet | tests | oscar
- `C:/Users/wompu/.claude/projects/H--prism/memory/*_oscar_*.md` | oscar auto-memories (mirror → knowledge/memories/) | oscar
- `H:/prism/knowledge/memories/{feedback,reference}/*_oscar_*.md` | H: mirror (Stop-hook fed) | oscar

— Created 2026-05-28 by slot:oscar claude-f7b0f940.

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for speed-feed:** `resources/MANUFACTURER_CATALOGS` · `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` · `resources/WORKHOLDING AND FIXTURE CATALOGS`
<!-- END:critical-resource-roots -->





<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why speed-feed (oscar — Speed & Feed Calculator (PRIMARY consumer)):** Extract S/F tables from the 44 HIGH/not-ingested catalogs into per-vendor mcp-server/src/data/<vendor>-speed-feed-data.ts. The SFC extraction manifest is the worklist; the pulled-PDFs dir is the source. Cite source page; never inline physics constants.
- `state/shared/quoting/catalog-sfc-extraction-manifest.json` (json) — per-maker SFC extraction manifest: vendor -> target mcp-server/src/data/<vendor>-speed-feed-data.ts + extraction_priority + iso_groups_expected + catalog_on_disk + already_ingested + jm_buys. THE worklist for S/F extraction.
- `state/shared/quoting/CATALOG-SFC-EXTRACTION-MANIFEST.md` (md) — human-readable view of the SFC extraction manifest
- `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29` (dir) — 190 validated vendor cutting-tool catalog + dedicated speeds/feeds-chart PDFs pulled this expansion (browser->curl, %PDF + size validated)
- `mcp-server/src/data` (dir) — oscar's per-vendor <vendor>-speed-feed-data.ts S/F databases — the extraction TARGETS for the 44 HIGH/not-ingested makers (ingested via ToolCatalogEngine.addTools())
- `scripts/harvest-catalog-pdfs.mjs` (script) — PDF->canonical-maker classifier + JSONL emitter (NAME_RULES word-anchored + vendorFromCatalogFilename + CONFIRMED_VENDORS)
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the speed-feed galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **CoatingDB** (Tool Coating Database) — `mcp-server/src/registries/CoatingRegistry.ts` · 100 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CoolantDB** (Coolant Reference Database) — `data/databases/CoolantDB.json` · 5 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MaterialDB** (Material Database) — `data/materials/` · 6,509 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PhysicsMappingDB** (Physics Parameter Mapping Index) — `mcp-server/src/registries/PhysicsMappingRegistry.ts` · 1,942 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ProcessDataDB** (Process Data Database) — `data/databases/ProcessDataDB.json` · 8 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **SpindleDB** (Spindle Protection Database) — `data/databases/SpindleDB.json` · 5 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolDB** (Cutting Tool Database) — `data/tools/` · 13,967 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **VendorCatalogDB** (Vendor / Manufacturer Catalog Database) — `mcp-server/data/vendor-catalog-db/` · 425 entries · manifest `mcp-server/data/vendor-catalog-db/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/speed-feed/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/speed-feed_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="speed-feed" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs speed-feed "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
