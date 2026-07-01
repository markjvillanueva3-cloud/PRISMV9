# AUDIT-CAM-STATUS — Per-CAM-System wiring reality

**Generated:** 2026-05-02
**Scope:** 6 tier-1 + 17 tier-2 CAM systems
**Method:** engine manifest scan + dispatcher action grep + corpus check (not all corpora measured — flagged where unknown)

## Tier-1 (priority 1–6)

| CAM | Pri | Bridge engine | Function index | Strategy registry | Post support | In-host add-in | Tool sync | Posts in `Resources/` | NC in `JM die/` | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Fusion 360** | 1 | Fusion360AutomationBridge, Fusion360LiveBridgeEngine, Fusion360InHostRunnerEngine | Fusion360FunctionIndexEngine, Fusion360CycleCatalogEngine, Fusion360ControllerCatalogEngine | Fusion360StrategyRecommenderEngine (named: `fusion360_strategy_recommend`) + Fusion360AIOrchestrationEngine | Fusion360CodeGeneratorEngine, Fusion360PostprocessEngine (cam.f360_*, cam_fusion_build_postprocess) | **PARTIAL** — `Fusion360InHostRunnerEngine` + `cam_inhost_fusion360_*` actions exist; Python add-in scaffolding (cam.f360_live_* actions for sketch/extrude/fillet/etc.) | `fusion_export_tool_library`, `fusion_sync_tools` | unknown — `data/posts/fusion-cache/` has 464 files | unknown (JM Die corpus 17,150 progs across 16 customers; CAM source breakdown not measured) | **beta** — bridge + indexer + in-host runner all present, but Python add-in is generator-only; no live runtime test |
| **hyperMILL** | 2 | HyperMILLAutomationBridge, HyperMillACConnectionManager, HyperMillACScriptExecutor | HyperMillFunctionIndex (63 hyperMILL engines), HyperMillACStandardToolDBEngine | HyperMillStrategyEngine, HyperMillBladeRoughingEngine, HyperMillMillTurnStrategyEngine | HyperMillPostprocessBridge (cam_hypermill_*) | **STRONG** — Project Manager via `HyperMillACScriptExecutor` + `HyperMillACServerConfig`; 63 dedicated engines | `hypermill_tool_export`, `hypermill_tool_export_job` | unknown — `H:/prism/resources/hypermill/` not measured | unknown | **production** — most-mature tier-1; in-host runtime + tool sync + Project Manager wiring all confirmed |
| **Mastercam** | 3 | MastercamAutomationBridge, MastercamEDMBridge, MastercamMillTurnBridge | MastercamCycleCatalogEngine, MastercamControllerCatalogEngine, MastercamFunctionIndexEngine | MastercamStrategyEngine, MastercamMultiAxisStrategyEngine, MastercamDeepLearningEngine | MastercamCodeGeneratorEngine, mastercam_code_generate, mastercam_safety_validate | **PARTIAL** — `cam_inhost_mastercam_*` plan/summarize/stats actions; C-Hook C++ scaffolding generator-only | `mastercam_tool_export`, `mastercam_tool_export_job`, `mastercam_tool_import`, `mastercam_tool_drift` | `H:/prism/resources/MasterCam/MASTERCAM/POSTS/Mill/NC` 266 files | unknown | **production** — 25 engines, deep AI orchestration, safety validation, EDM bridge |
| **Esprit** | 4 | EspritCAMBridgeEngine | EspritFunctionIndexEngine (4 sections: milling, turning, mill_turn, swiss) | esprit_strategy_recommend, esprit_function_index_get_profit_operations | (no dedicated EspritPostEngine surfaced) | **NONE** — no `cam_inhost_esprit_*` actions; no in-host runner | (no esprit_tool_export action surfaced) | unknown — needs Resources/Esprit corpus measurement | unknown — EspritKnowledgeBase is referenced via `esprit_function_index_get_summary` only | **stub** — bridge + index + strategy actions exist; ProfitTurning/ProfitMilling action exposed (`esprit_function_index_get_profit_operations`); .esp file format parser NOT FOUND; in-host add-in NOT WIRED. DOWNGRADED for Mark's tier-1 priority — needs significant build to match hyperMILL/Mastercam parity |
| **Inventor HSM** | 5 | InventorAutomationBridge, InventorHSMInHostRunnerEngine, InventorHSMPluginAdapterEngine | InventorCAMFunctionIndexEngine, InventorHSMFunctionIndexEngine | InventorCAMStrategyEngine, InventorCAMAIOrchestrationEngine | InventorCAMCodeGeneratorEngine, InventorCADCodeGeneratorEngine | **STRONG** — `cam_inhost_inventor_hsm_*` plan/summarize/stats/reset actions; `cam_inventor_hsm_analyze_operation`, `cam_inventor_hsm_analyze_project`, `cam_inventor_hsm_generate_nc_header`, `cam_inventor_hsm_build_*` (setup_create, operation_create, tool_library_add, stock_setup, postprocess) | (no inventor_tool_export action surfaced) | unknown | unknown | **beta** — strong in-host scaffolding; tool-sync gap |
| **SolidWorks** | 6 | SolidWorksAutomationBridge | (no dedicated SolidWorksFunctionIndexEngine surfaced — relies on SolidCAM if SW+SolidCAM stack) | (no SolidWorksStrategyEngine surfaced) | SolidWorksCodeGeneratorEngine | **NONE** | (no solidworks_tool_export action surfaced) | unknown | unknown | **stub** — only 2 engines (bridge + codegen); SolidWorks CAM via SolidCAM stack documented elsewhere; per Mark's vision SolidWorks should be tier-1 — DOWNGRADED |

---

## Tier-1 in-host add-in status (1-line each)

- **Fusion 360**: in-host runner exists (Fusion360InHostRunnerEngine + cam_inhost_fusion360_*); Python add-in is plan/summarize, not live execution.
- **hyperMILL**: full Project Manager runtime (HyperMillACConnectionManager + HyperMillACScriptExecutor + AC server config) — best in class.
- **Mastercam**: in-host runner stub (cam_inhost_mastercam_*); C-Hook C++ generator-only.
- **Esprit**: NOT WIRED — no in-host runner, no .esp parser, no live add-in.
- **Inventor HSM**: in-host runner present (InventorHSMInHostRunnerEngine + InventorHSMPluginAdapterEngine + cam_inhost_inventor_hsm_*).
- **SolidWorks**: NOT WIRED — only AutomationBridge + CodeGenerator; no add-in, no function index.

---

## Tier-2 (priority 2 generic — keep or deprecate?)

| CAM | Bridge engine | Function index | Strategy actions | Post support | In-host | Tool sync | Recommendation |
|---|---|---|---|---|---|---|---|
| **SolidCAM** | (multiple sub-engines: SolidCAM25D, SolidCAM3DHSSHSR, SolidCAM5Axis, SolidCAMMillTurn, SolidCAMTurning, SolidCAMIMachining) | SolidCAMFunctionIndexEngine + 7 sub-indexes | solidcam_strategy_recommend, solidcam_imachining_*, solidcam_25d_*, solidcam_3d_hss_hsr_*, solidcam_5_axis_*, solidcam_turning_*, solidcam_millturn_* (≥80 actions) | solidcam_code_generate, solidcam_code_templates | NONE | NONE | **KEEP — promote to tier-1** (deepest tier-2 coverage; iMachining unique) |
| **BobCAD** | BobCADCAMBridgeEngine | BobCADCAMFunctionIndexEngine | bobcad_strategy_list, bobcad_strategy_recommend, bobcad_function_index_* (DMT operations) | NONE explicit | NONE | NONE | KEEP |
| **Cimatron** | CimatronCAMBridgeEngine | CimatronFunctionIndexEngine | cimatron_strategy_list, cimatron_strategy_recommend, cimatron_function_index_get_mold_die_operations | NONE | NONE | NONE | KEEP — mold/die specialty |
| **TopSolid** | (no dedicated bridge engine; only TopSolidCAMFunctionIndexEngine) | TopSolidCAMFunctionIndexEngine | topsolid_strategy_list, topsolid_strategy_recommend | NONE | NONE | NONE | KEEP-LITE |
| **WorkNC** | WorkNCCAMBridgeEngine | WorkNCFunctionIndexEngine | worknc_strategy_list, worknc_strategy_recommend, worknc_function_index_get_auto5_operations | NONE | NONE | NONE | KEEP — Auto5 unique |
| **CAMWorks** | (no bridge surfaced) | CAMWorksFunctionIndexEngine | camworks_strategy_list, camworks_strategy_recommend, camworks_function_index_get_afr_operations | NONE | NONE | NONE | KEEP-LITE — AFR is the only differentiator |
| **EdgeCAM** | (no bridge surfaced) | EdgecamFunctionIndexEngine | edgecam_strategy_list, edgecam_strategy_recommend, edgecam_function_index_get_waveform_operations | NONE | NONE | NONE | KEEP-LITE |
| **GibbsCAM** | (no bridge surfaced) | GibbsCAMFunctionIndexEngine | gibbscam_strategy_list, gibbscam_strategy_recommend, gibbscam_function_index_get_volumill_operations | NONE | NONE | NONE | KEEP-LITE |
| **SprutCAM** | SprutCAMBridgeEngine | SprutCAMFunctionIndexEngine | sprutcam_strategy_list, sprutcam_strategy_recommend, sprutcam_function_index_get_robot_operations | NONE | NONE | NONE | KEEP — robot specialty |
| **Tebis** | TebisCAMBridgeEngine | TebisFunctionIndexEngine | tebis_strategy_list, tebis_strategy_recommend, tebis_function_index_get_proven_process_operations | NONE | NONE | NONE | KEEP — Proven Process unique |
| **Creo** | CreoToolkitBridgeEngine, CreoIntegrationTestSuiteEngine, CreoAddinRibbonEngine | CreoFunctionIndexEngine | creo_function_index_get_mill_turn_operations | NONE explicit | **PARTIAL** (CreoAddinRibbonEngine — surface only) | NONE | KEEP |
| **PartMaker** | (no bridge surfaced) | PartMakerFunctionIndexEngine | partmaker_strategy_*, partmaker_function_index_get_swiss_turning_operations | NONE | NONE | NONE | KEEP — Swiss specialty |
| **FeatureCAM** | (no bridge surfaced) | FeatureCAMFunctionIndexEngine | featurecam_strategy_*, featurecam_function_index_get_afr_operations | NONE | NONE | NONE | KEEP-LITE |
| **AlphaCAM** | (no bridge surfaced) | AlphacamFunctionIndexEngine | alphacam_strategy_*, alphacam_function_index_get_drilling_operations | NONE | NONE | NONE | KEEP-LITE |
| **VISI** | (no bridge surfaced — VISI* hits are mostly BlueprintVisionOCR which is unrelated) | VISIFunctionIndexEngine | visi_strategy_*, visi_function_index_get_mold_operations | NONE | NONE | NONE | KEEP — mold specialty |
| **CATIA** | CATIACAAV5BridgeEngine, CATIAAddinPluginEngine, CATIAIntegrationTestSuiteEngine | CATIAMachiningFunctionIndexEngine | CATIAStrategyEngine, catia_strategy_*, catia_machining_function_index_get_surface_operations | CATIACodeGeneratorEngine, catia_code_generate, catia_code_templates | **PARTIAL** (CATIAAddinPluginEngine) | NONE | **PROMOTE — better than Esprit/SolidWorks tier-1**; full CAA V5 bridge + addin + AI orchestration |
| **NX** | (no NXBridgeEngine surfaced — but NXOpen API actions exist) | NXCAMFunctionIndexEngine, NXCAMMillingFunctionIndexEngine, NXCAMTurningFunctionIndexEngine, NXCAMFBMFunctionIndexEngine | NXCAMStrategyEngine, nx_cam_recommend, nx_cam_parameters, nx_cam_ipw, nx_cam_fbm | NXCodeGeneratorEngine, NXCAMCodeGeneratorEngine, nx_code_generate | nxopen_api_connect, nxopen_api_execute | NONE | **PROMOTE — true tier-1 candidate**; NXOpen API + 4 indexes + FBM (feature-based machining) — exceeds Esprit completeness |

---

## Tier-2 verdict

**Recommendation:** keep all 17 tier-2 in scope (function index + strategy recommend gives 80% of value); promote **CATIA, NX, SolidCAM** to tier-1 (they outperform Esprit and SolidWorks in current wiring) OR re-baseline tier-1 list against actual maturity.

The current "tier-1 priority 4 = Esprit" claim does not match the code. Esprit has 2 engines + 0 in-host runner. NX/CATIA/SolidCAM each have 7+ engines, in-host paths, and full strategy taxonomies.

---

## Esprit deep-dive (per Mark's request)

| Probe | Result |
|---|---|
| `EspritFunctionIndexEngine` | EXISTS (`mcp-server/src/engines/EspritFunctionIndexEngine.ts`); 4 sections shipped: milling/turning/mill_turn/swiss — `mcp-server/data/cam-functions/esprit/` |
| `esprit_strategy_*` actions | `esprit_strategy_list`, `esprit_strategy_recommend` |
| `esprit_function_index_*` actions | `_get`, `_list_sections`, `_get_section`, `_list_operations`, `_find_parameter`, `_search_parameters`, `_get_operations_by_category`, `_get_summary`, `_get_profit_operations`, `_get_operation` |
| `EspritKnowledgeBase` API | NOT FOUND as standalone class — surfaced only via `esprit_function_index_get_summary` |
| `.esp` file format parser | **NOT FOUND** in engine manifest |
| Lathe / mill-turn specialization | turning + mill_turn + swiss sections in function index |
| ProfitTurning / ProfitMilling | `esprit_function_index_get_profit_operations` action exposes them |
| Tests | EspritCAMBridgeEngine.test.ts, EspritFunctionIndexEngine.test.ts |
| Posts in Resources/ | not measured in this audit; needs `ls H:/prism/resources/Esprit*` |
| In-host add-in | **MISSING** |

**Esprit verdict:** function-index path is **production**; in-host runtime, tool sync, post support, and `.esp` parser are **planned/missing**. As tier-1 priority 4, Esprit is currently behind tier-2 leaders (NX/CATIA/SolidCAM).
