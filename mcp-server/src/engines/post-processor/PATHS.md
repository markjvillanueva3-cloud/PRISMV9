# Post-Processor Galaxy — PATHS.md (H:/-wide path atlas for slot:echo)

> THE highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for slot:echo.
> Format: `<absolute-path> | <purpose> | <maintainer-slot>`. Verify mtime before trusting stale rows.
> Engines live FLAT at `mcp-server/src/engines/` — there is no `post-processor/` engine subdir (this dir is the doctrine pointer only).

## Tier-1 MasterPost engines (saleable product)
- `H:/prism/mcp-server/src/engines/MasterPostProcessorEngine.ts` | 7-engine fanout, MACHINE_FEATURE_DB (haas/okuma/mazak/fanuc/siemens) | echo
- `H:/prism/mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` | 14-controller / 19-CAM / 25+-op AGI surface, UnifiedPostResult | echo
- `H:/prism/mcp-server/src/engines/PostProcessorPipelineEngine.ts` | 7-phase / 38-stage physics→safety→output pipeline | echo
- `H:/prism/mcp-server/src/engines/MasterPostFineTuningEngine.ts` | per-vendor calibration LoRA-class loop (36K) | echo
- `H:/prism/mcp-server/src/engines/MasterPostProcessorAGIOrchestrationEngine.ts` | stub-wired NOT dark (action master_post_agi_orchestrate; generateAGIPost?.() ?? not-callable = dark-in-practice) — MS-MASTERPOST anchor [corrected 2026-05-29 audit] | echo
- `H:/prism/mcp-server/src/engines/MasterPostProcessorGeniusEngine.ts` | stub-wired NOT dark (action master_post_genius_generate; generateMasterPost?.() ?? not-callable = dark-in-practice) [corrected 2026-05-29 audit] | echo
- `H:/prism/mcp-server/src/engines/PostProcessorUnificationEngine.ts` | fully wired (4 actions, reference impl) | echo

## G-code core engines
- `H:/prism/mcp-server/src/engines/GCodeSafetyAnalyzerEngine.ts` | 67K central safety gate (rapid/coolant-order/retract) | echo
- `H:/prism/mcp-server/src/engines/GCodeTemplateEngine.ts` | 58K snippet/template library | echo
- `H:/prism/mcp-server/src/engines/GCodeIntelligencePipelineEngine.ts` | 18K orchestrator | echo
- `H:/prism/mcp-server/src/engines/GCodeValidationEngine.ts` · `GCodeVerificationEngine.ts` | pre-emit gates | echo
- `H:/prism/mcp-server/src/engines/GCodeTranspilerEngine.ts` | 17K cross-controller transpile | echo
- `H:/prism/mcp-server/src/engines/GCode{Energy,}OptimizationEngine.ts` · `GCodeBidirectionalOptimizerEngine.ts` | optimization | echo
- `H:/prism/mcp-server/src/engines/GCode{Runtime,Time}{Predictor,Estimator}Engine.ts` | cycle-time | echo
- `H:/prism/mcp-server/src/engines/GCodeUnderstandingTransformerEngine.ts` · `GCodeReverseCADEngine.ts` | NL→GC / GC→CAD | echo

## Controller-specialist (stub-wired leverage class)
- `H:/prism/mcp-server/src/engines/WEDMPostMitsubishiEngine.ts` (12K) · `WEDMPostSodickEngine.ts` (10K) · `WEDMPostMakinoEngine.ts` · `WEDMPostAgieEngine.ts` · `WEDMPostFanucEngine.ts` | wire-EDM dialects, stub-wired | echo+mike
- `H:/prism/mcp-server/src/engines/LathePostProcessorAIEngine.ts` | 73K largest-dark, single `getPostProfile` wired | echo+whiskey
- `H:/prism/mcp-server/src/engines/LathePostGeneratorActiveLearningEngine.ts` (18K) · `JMDiePostProcessorLearningEngine.ts` (21K) | closed-loop, single-method | echo+india
- `H:/prism/mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` | 92K JM lead Hurco WinMAX post | echo+foxtrot
- `H:/prism/mcp-server/src/engines/LatheMasterPostSelfAwarenessEngine.ts` | fully wired (6 actions) | echo+whiskey

## CAM→post bridges
- `H:/prism/mcp-server/src/engines/Fusion360MillTurnBridgeEngine.ts` (10K) | Fusion → post mill-turn | echo+kilo
- `H:/prism/mcp-server/src/engines/HyperMillCodeGeneratorEngine.ts` (36K) · `HyperMillACServerConfig.ts` (8K) | hyperMILL → post | echo+kilo

## Dispatchers (action surface)
- `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` | ~21k lines; ~155 post/pp/ppg/dialect cases; stub tail L19871–20022 | echo
- `H:/prism/mcp-server/src/tools/dispatchers/productDispatcher.ts` | lines 134–184: 24 `ppg_*` actions | echo

## Dialect / kinematic / post DATA (machine-readable — never inline; VERIFIED on-disk 2026-05-29)
- `H:/prism/mcp-server/src/data/okuma-dialect-knowledge.ts` | the ONLY per-vendor dialect .ts (NOT controller-dialects/<vendor>.ts — that dir does NOT exist) | echo
- `H:/prism/mcp-server/src/data/controller-knowledge.json` · `controller-knowledge-tips.ts` · `controller-alarm-database.json` | cross-controller knowledge + alarm DB | echo
- `H:/prism/mcp-server/src/data/fusion-post-strategies.json` · `cimco-post-strategies.json` · `hypermill-post-configs.json` · `machine-post-enriched.ts` | per-CAM/per-machine post strategy data | echo
- `H:/prism/mcp-server/src/data/machine-kinematics-catalog.ts` · `machine-kinematics-enriched.ts` | RTCP/G68.2/multi-channel kinematics (NOT machine-kinematics.ts — absent) | echo+machine-setup
- `H:/prism/mcp-server/src/data/post-feature-parity/mill-post-feature-parity.ts` · `tribal-tips/post-pdf-cited-tips.ts` | mill post feature-parity matrix + PDF-cited tribal tips | echo
- `H:/prism/mcp-server/src/physics/constants.ts` | Kienzle kc / Taylor C,n (P1 pipeline) | bravo/alpha (read-only for echo)

## Machine / Controller / Alarm databases (post-gen CONSUMES — wired 2026-05-29)
> The post-gen chain: route by **machine_model** (MACHINE db) → emit by **controller dialect** (CONTROLLER db) → validate against known **alarms** (ALARM db). juliett owns these stores; echo consumes. Bidirectional bridge in `database-expansion/MEMORY.md`.
### Machines — 824 in registry (21 are the JM post-gen target fleet)
- `H:/prism/mcp-server/src/registries/MachineRegistry.ts` | 824 machines / ~30 mfrs (DMG Mori, Mazak, Makino, Matsuura, Brother, Doosan, Hermle, Grob…); byController index | query via prism_data machine_search/machine_get | echo+juliett
- `H:/prism/mcp-server/src/engines/MachineConfigDatabaseEngine.ts` · `MachineHandbookRegistryEngine.ts` · `MachineOptionRegistryEngine.ts` · `MachineRateDatabaseEngine.ts` | machine config / handbook / option / rate DB engines | echo+juliett
- `H:/prism/mcp-server/src/engines/ShopConfigurationEngine.ts` | 21 JM Die machines (VMC-01..05, LTH-01..07, WEDM, EDM, …) — the post-gen target fleet (see coverage audit) | echo
- `H:/prism/mcp-server/src/data/machine-kinematics-catalog.ts` · `machine-post-enriched.ts` · `data/state/ontology/machine-def-ontology.json` · `data/state/shop-machine-overlays.json` | kinematics / post-enrich / ontology / shop overlays | echo
### Controllers — ~30 entries
- `H:/prism/mcp-server/src/data/controller-knowledge.json` | ~30 controller entries (array-indexed 0..N) | echo
- `H:/prism/mcp-server/src/data/okuma-dialect-knowledge.ts` · `controller-knowledge-tips.ts` | per-vendor dialect + tips | echo
- `CONTROLLER_PROFILES` (in `MasterPostProcessorUnifiedAGIEngine.ts`) | 14 post-gen controller profiles (fanuc/siemens/haas/okuma/mazak/heidenhain/mitsubishi/fagor/hurco/dmg_mori/brother/doosan/citizen/generic) | echo
### Alarms — 2,588 across 13 controllers
- `H:/prism/mcp-server/src/data/controller-alarm-database.json` | **2,588 alarms / 13 controllers** (schema: version/totalAlarms/byController/alarms/migrated_from_archive) | echo+juliett
- **USE (underused synergy):** alarm-aware post-gen — cross-check emitted G/M sequences against this DB to avoid known-alarm-triggering output. Not yet wired into PostProcessorPipelineEngine P5 safety phase (gap for a future build).
### Tools — 41,495 across 32 vendor catalogs
- `H:/prism/mcp-server/src/data/*-tools-extracted.json` | **41,495 tools** (osg 11550, iscar 5449, guhring 3421, accupro 3015, flash 2485, sandvik 2418, seco 1224, hypermill 587, ampc 555, …) — T#/geometry/length+dia for tool-length+cutter comp | echo+juliett
- `H:/prism/mcp-server/src/engines/ToolCatalogEngine.ts` · `CAMToolLibraryEngine.ts` · `FusionToolLibraryEngine.ts` · `ShopToolLibraryEngine.ts` · `ToolDatabaseBridgeEngine.ts` · `ToolCatalogAdaptiveEngine.ts` | tool DB access engines (query via prism_data / tool catalog actions) | echo+kilo
### Tool holders — 1,889 across 5 catalogs
- `H:/prism/mcp-server/src/data/*holder*-extracted.json` | **1,889 holders** (big-daishowa 1208, haimer 489, osg 52, guhring 23) — gauge length / collision geometry for retract+clearance | echo
- `H:/prism/mcp-server/src/engines/ToolHolderCatalogEngine.ts` · `HolderOperationMatchEngine.ts` | holder DB + holder↔operation match | echo
### Fixtures / workholding
- `H:/prism/mcp-server/src/engines/MonolithFixtureDatabaseEngine.ts` · `MonolithWorkholdingDatabaseEngine.ts` · `MonolithHyperMillFixtureDatabaseEngine.ts` · `StockWorkholdingCatalogEngine.ts` · `FixtureDesignEngine.ts` · `FixturePartCatalogEngine.ts` · `FixtureClampingEngine.ts` · `LatheWorkholdingEngine.ts` (+ ~7 more Fixture*) | workholding / WCS origin / clearance for post-gen safe-Z + retract | echo+kilo
### Tool paths (the motion post-gen EMITS — kilo CAM-generated)
- toolpath ENGINES (kilo domain, feed post-gen P2): `AdaptiveToolpathRouterEngine` · `MultiaxisToolpathEngine` · `FiveAxisToolpath{Integration,Synthesis}Engine` · `PPToolpathStrategyEncoderEngine` · `PPGreedyToolpathOptimizerEngine` · `LathePrintToolpathGeneratorEngine` · `EDMToolpathStrategyEngine` · `Novel*ToolpathEngine` | `ToolpathBlock` → PostProcessorPipelineEngine P2 block-by-block | kilo→echo
- emitted toolpath corpus = the **160,582 NC programs** (§Domain data corpus above)
### Materials — 2,544 (hyperMILL) + ISO-group physics constants
- `H:/prism/mcp-server/src/data/hypermill-materials.json` | 2,544 materials | echo+oscar
- `H:/prism/mcp-server/src/physics/constants.ts` | Kienzle kc1.1 per ISO group (P1800/M2100/K1100/N700/S2800/H3200) + Taylor C,n — material→cutting-physics for feed/speed+force | bravo (read-only for echo)
- material engines: `CustomerMaterialMapEngine` · `Fusion360MaterialBridgeEngine`/`FusionMaterialBridgeEngine` · `AnisotropicMaterialModelEngine` · `DocuStrataMaterialPriorEngine` · `EDMMaterialMachineWireEngine` (EDM material↔wire) | echo+oscar
### Feed/speed (oscar SFC — per material × tool × machine)
- `H:/prism/mcp-server/src/engines/CAMSpeedFeedBridgeEngine.ts` · `AutoSpeedFeedCalculatorEngine.ts` · `HeatTreatmentAwareSpeedFeedEngine.ts` · `LatheSpeedFeedCalculatorFacadeEngine.ts` | feed/speed → post-gen block params (action `cam_speedfeed_compute`); NEVER inline feed/speed | echo+oscar
### Customer profile (the "for the customer" dimension)
- `H:/prism/mcp-server/src/engines/CustomerKnowledgeEngine.ts` · `CustomerManagementEngine.ts` · `JMCustomerVendorDatabaseEngine.ts` | customer identity → machine fleet → post requirements (ITW/Alcoa/Optimas/SFS/Holo-Krome + 100 more) | echo+hotel+juliett
- `H:/prism/mcp-server/src/engines/PostLibraryConfiguratorEngine.ts` | **per-customer post config / preferences — THE customer-post product surface** | echo
- `H:/prism/mcp-server/src/engines/CustomerMaterialMapEngine.ts` · `CrossCustomerPolicyTransferEngine.ts` | customer↔material map + cross-customer post-policy transfer | echo+hotel

## JM Die post corpus
- `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/` | 12 `.cps` (Haas/Hurco/Okuma/Fanuc; wire-EDM absent) | echo
- API (NOT Glob): `prismSelfAwarenessEngine.getJMDieCustomerPath()` | JM customer-path resolver | —

## State specs (post-proc planning)
- `H:/prism/state/shared/specs/POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md` | **AUTHORITATIVE coverage audit** (workflow+codex+glob): PARTIAL ~40%; LIVE=Hurco VM30i/Okuma M460V+lathes/WEDM; 4 P0 machine gaps (Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route); 124 engines / ~9 live / 14 stub; build backlog | echo
- `H:/prism/state/shared/specs/POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md` | echo's consolidation (49 units, 8 stub engines, 12 .cps matrix) | echo
- `H:/prism/state/shared/specs/POST-PROCESSOR-CAPABILITY-ASSESSMENT-2026-05-21.md` | F1–F5 findings, 11-engine census | echo
- `H:/prism/state/shared/specs/POST-PROCESSOR-CORPUS-V3-VARIABILITY-MATRIX-2026-05-25.md` | P0-U06.7..20 sub-units | echo
- `H:/prism/state/shared/specs/POST-PROCESSOR-PROVE-OUT-2026-05-25.md` | 50/50 structural-only PASS, runtime deferred | echo
- `H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.md` | 5826 units / 110 milestones (grep `post|masterpost|pp_`) | all
- `H:/prism/state/shared/specs/MISC-TASKS-INVENTORY.md` | 318 misc (17 post orphans) | all

## Tests
- `H:/prism/mcp-server/src/__tests__/*{Post,GCode,post}*.test.ts` | post-proc test suite | echo
- `H:/prism/mcp-server/src/__tests__/GCodeSafetyAnalyzerEngine.test.ts` | safety-gate tests | echo

## Skills / hooks / wiki / memory
- `H:/prism/.claude/commands/post-{generate,validate,harden,register,diff}.md` · `lathe-{postgen,master-post}.md` · `post-status-echo.md` · `post-nc-lint.md` (static NC dialect linter) | skills | echo
- `H:/prism/scripts/post-nc-dialect-lint.mjs` (+ `.test.mjs`, 26 node:test) | STATIC NC/G-code dialect+safety linter — pure-static (no engine/build/MCP); 8 rules (coolant-before-spindle, feed-mode, retract, comment-style okuma/fanuc, modal-tap, program-end); turning-aware; CI-usable `--json --strict`; skill /post-nc-lint | echo
- `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` | SLOT_GALAXY_MAP (echo→post-processor, line 69) | sierra/zulu
- `H:/prism/.claude/hooks/echo-post-domain-inject.mjs` | echo's CUSTOM domain-awareness injector (UserPromptSubmit T2, keyword-gated digest; wired in settings.json; disable PRISM_ECHO_POST_DOMAIN_INJECT_DISABLE=1) | echo
- `H:/prism/.claude/hooks/post-nc-dialect-guard.mjs` | echo's CUSTOM PostToolUse NC-lint guard — auto-lints .nc/.min/.eia/.tap/.ngc/.h/.htc/.gcode/.pgm on Edit/Write/MultiEdit; advisory, fail-soft, wired in settings.json; disable PRISM_POST_NC_DIALECT_GUARD_DISABLE=1 | echo
- `H:/prism/knowledge/wiki/architecture/post-processor-knowledge-base.md` | CANONICAL compiled domain KB (wiki map + 10 tribal lessons + dialect quick-ref + quality gates); auto-invoked via echo-post-domain-inject + wiki-precheck | echo
- `H:/prism/knowledge/wiki/architecture/post-processor-*.md` | galaxy wiki bridges (galaxy/dialect-matrix/pipeline/knowledge-base) | echo
- `C:/Users/wompu/.claude/projects/H--prism/memory/*_echo_*.md` | echo auto-memories (mirror → knowledge/memories/) | echo
- `H:/prism/knowledge/memories/{feedback,reference}/*_echo_*.md` | H: mirror (Stop-hook fed) | echo
- `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` | ~155 post-proc engine rows (grep, don't full-read) | all

## Quality-gate + reward scripts (echo-owned, pure-node — no build/MCP needed)
- `H:/prism/scripts/post-nc-dialect-lint.mjs` | 8-rule static NC dialect/safety linter; `lintNc(text,{dialect,filename})`; turning-aware coolant; CLI `--json/--strict`; 26 node:tests | the lint signal
- `H:/prism/scripts/post-gen-reward.mjs` | **non-circular scored reward** `scorePost(nc,{dialect,golden,filename})` → `{reward, components:{lint,structure,alarm,golden?}, detail}`; composes lint+structure+alarm(2588-DB)+golden-Jaccard; alarm EXCLUDED+weights-renormalized for families w/o non-universal alarm codes (only SIEMENS G25/G26 carry signal; HURCO/FANUC excluded, universal codes never penalized); completeness-gated; CLI exit 0/3/2; 13 node:tests | the reward fn for HurcoV11 fine-tuning — `node scripts/post-gen-reward.mjs <out.nc> --dialect hurco [--golden ref.nc]`
- `H:/prism/scripts/find-cross-dialect-leaks.mjs` | runtime cross-dialect token-leak detector (needs built engine) | the leak signal
- `.claude/hooks/post-nc-dialect-guard.mjs` | PostToolUse auto-lint on `.nc/.min/.eia/.tap/.ngc/.h/.htc/.gcode/.pgm` (fail-soft; `PRISM_POST_NC_DIALECT_GUARD_DISABLE=1`) | auto-invoke
- HurcoV11 generator: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` `.generateProgram(...)` → wired `master_post_hurco_v11` (camDispatcher:6713) — the fine-tune target; score its output with post-gen-reward.

## Digest / inventory (use master_index_query, don't full-read)
- `H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md` | dispatcher action counts | all
- `H:/prism/PRISM-INVENTORY-LATEST.md` | live counts | all

## Domain data corpus (on-disk — instant pathways; live `find` totals, enumerated 2026-05-29, excl node_modules/.git/worktrees)
> Post-processing is the tail of CAD→CAM→post→NC. This maps BOTH ends: the CAD/CAM inputs echo posts, and the NC it emits.

### NC output programs — **160,582** files (.nc/.min/.eia/.tap/.ngc/.pgm)
- `H:/prism/mcp-server/data/programs/okuma/` (= `H:/prism/data/programs/okuma/` mirror) | 2,734 each — generated Okuma program set | echo
- `H:/prism/JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/Okuma_<machine>/` | per-customer×machine upgraded Okuma (OMG 2,723/machine ×7 machines; NATHANS USB 1,754; FONTANA 933; …) | echo+whiskey
- bulk = Okuma lathe (whiskey-adjacent); mill NC under `JM DIE/CNC MILL` + `BOX` | echo+foxtrot

### Post definitions — **13,790** `.cps` (Fusion/HSMWorks) + **52** Mastercam `.pst/.spm`
- `H:/prism/mcp-server/data/posts/fusion-cache/` (= `data/posts/fusion-cache/`) | 464 cached Fusion posts | echo
- `H:/prism/resources/FUSION BASIC POSTS/` · `H:/prism/BOX/FUSION BASIC POSTS/` · `mcp-server/data/posts/box-basic/` | 180 each — BOX basic post set | echo
- `H:/prism/resources/HSMWorks 2026/posts/` · `HSMWorks 2027/posts/` | 100 each | echo
- `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/` | 12 JM production `.cps` (Haas/Hurco/Okuma/Fanuc; wire-EDM absent) | echo

### CAD/CAM source inputs (toolpath sources echo posts) — point to delta, don't re-enumerate
- counts: `.ipt` 10,720 (Inventor) · `.step` 2,608 · `.f3d` 1,739 (Fusion) · `.sldprt` 529 · `.stl` 458 · `.stp` 271 · `.igs` 27 · `.iges` 2
- FULL 129K-file CAD corpus map is **delta's domain** → [[cad-corpus-paths]] (cross-domain ref; echo consumes these as posting inputs only)
- CAM seats producing toolpaths: Mastercam X8 (running), hyperMILL v31 (running, NOT v33), Fusion/HSMWorks — see delta hook / [[cad-corpus-paths]]

— Created 2026-05-28 by slot:echo claude-223d9a61. Data corpus enumerated 2026-05-29.

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for post-processor:** `resources/FUSION POSTS` · `resources/FUSION BASIC POSTS` · `resources/POSTS AND MACHINES` · `JM DIE/POST PROCESSORS` · `JM DIE/PRISM MODIFIED POST PROCESSORS` · `JM DIE/CONTROLLERS`
<!-- END:critical-resource-roots -->





<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why post-processor (echo — Post Processors):** Tool-table source: vendor tool geometry + designations from the catalogs inform post-processor tool-library output (tool numbers, diameters, holder fit). Read the manifest + pulled PDFs.
- `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29` (dir) — 190 validated vendor cutting-tool catalog + dedicated speeds/feeds-chart PDFs pulled this expansion (browser->curl, %PDF + size validated)
- `state/shared/quoting/catalog-sfc-extraction-manifest.json` (json) — per-maker SFC extraction manifest: vendor -> target mcp-server/src/data/<vendor>-speed-feed-data.ts + extraction_priority + iso_groups_expected + catalog_on_disk + already_ingested + jm_buys. THE worklist for S/F extraction.
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the post-processor galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlarmDB** (Alarm & Controller Database) — `data/controllers/` · 10,090 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CAMSystemDB** (CAM System Integration Database) — `data/databases/CAMSystemDB.json` · 61 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **CollisionDB** (Collision Detection Database) — `data/databases/CollisionDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GCodeTemplateDB** (G-Code Template Database) — `data/databases/GCodeTemplateDB.json` · 6 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MachineDB** (Machine Database) — `data/machines/` · 1,015 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PostProcessorDB** (Post Processor Catalog) — `mcp-server/src/registries/PostProcessorRegistry.ts` · 34 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToolDB** (Cutting Tool Database) — `data/tools/` · 13,967 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/post-processor/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/post-processor_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="post-processor" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs post-processor "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
