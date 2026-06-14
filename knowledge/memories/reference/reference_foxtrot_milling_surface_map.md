---
name: reference-foxtrot-milling-surface-map
description: "One-shot file-search index of EVERY mill-related artifact in PRISM (engines, algorithms, dispatcher, schemas, tribal catalogs, bridges, wiki, JM Die fleet, CAM bridges, post processors, physics constants, state files). Built 2026-05-27 by 6 parallel Explore agents for foxtrot (tribal-knowledge slot) so future iterations skip the rediscovery grep cycle."
type: reference
source: prism-memory
synced: 2026-05-27T14:20:05.203Z
aliases: reference_foxtrot_milling_surface_map
---


# Foxtrot — Milling-Surface File-Search Index

**Built:** 2026-05-27 via 6 parallel Explore agents. Purpose: skip rediscovery on every /loop tick.
**How to use:** When foxtrot needs to find ANY mill-related file, search this index FIRST. Re-grep only when this index is silent.

## GALAXY SENTINEL
- `H:/PRISM/mcp-server/src/engines/mill/CLAUDE.md` — milling-galaxy scope statement. Covers vertical+horizontal milling, 3-axis + indexed-4/5th + simultaneous-5-axis. **Excludes** turning/wedm/additive. Primary slot: alpha; overflow: bravo. HyperMILL sub-galaxy at `engines/hypermill/`.

## ENGINES (22 core + 12 HyperMILL sub-galaxy + AI orchestrators)

**Operation physics (9):** `mcp-server/src/engines/{BallEndMill,HighFeedMilling,HelicalMilling,TrochoidalMilling,ChamferMilling,PlungeMilling,ThreadMilling,SplineMilling,AdvancedMillingStrategies}Engine.ts`

**Orchestration (4):** `MillMasterOrchestratorFacadeEngine.ts` (P1-U02 facade) · `MillStrategyNeuralEngine.ts` · `MillingPrintToProgramEngine.ts` (KILO-P2P-RECONCILE-MS0) · `MillingProgramPatternEngine.ts`

**AI/AGI (4):** `MillingAGIOrchestrationEngine.ts` · `MillingUltimateAIEngine.ts` · `MillingAIUltraIntelligenceEngine.ts` · `MillingAGIMasterEngine.ts`

**HyperMILL sub-galaxy (12):** `engines/hypermill/HyperMillCADArtifactGeneratorEngine.ts` + `HyperMillCycleCatalogEngine.ts` · `HyperMillCodeGeneratorEngine.ts` · `HyperMillMultiAxisEngine.ts` · `HyperMillSpeedFeedMappingEngine.ts` · `HyperMillMaterialMapEngine.ts` · `HyperMillControllerCatalogEngine.ts` · `HyperMillStrategyEngine.ts` (41.2K) · `HyperMillACBridgeEngine.ts` · `HyperMILLAutomationBridge.ts` · `PrintToHyperMillBridge.ts` (24.1K) · `HyperMillStrategyRegistration.ts`

**Mill-turn:** `MillTurnCAMEngine.ts` · `Fusion360MillTurnBridgeEngine.ts` · `MastercamMillTurnBridge.ts` · `SolidCAMMillTurnFunctionIndexEngine.ts`

## ALGORITHMS (12 core)
Under `mcp-server/src/algorithms/`: `ChipThinningCompensation` · `KienzleForceModel` · `SurfaceFinishPredictor` · `ToolDeflectionModel` · `ThermalPartitionModel` · `JohnsonCookModel` · `PowerTorqueCalc` · `StabilityLobeDiagram` · `ToolWearPrediction` · `ChipTypePredictionModel` · `GilbertMRRModel` · `ExtendedTaylorModel.ts` (23.9K)

## DISPATCHER (single, massive)
`H:/PRISM/mcp-server/src/tools/dispatchers/millDispatcher.ts` — **847 actions** in z.enum, **53 lazy-loaded engines**. Action families: print_to_program, feature_recognize, process_plan, generate_gcode, mill_strategy_*, mill_toolpath_* (7), mill_force_calculate, deflection_check, chatter_predict, thermal_analyze, mill_collision_check/zones, mill_tool_recommend, mill_agi_orchestrate, mill_neural_recommend, mill_5axis_* (16), mill_uai_* (20), mill_sci_* (8), mill_tribal_query/get/add/stats, mill_lora_* (60+), mill_helical_calc, mill_high_feed_calc.

## SCHEMAS
`H:/PRISM/mcp-server/src/schemas/millActionSchemas.ts` — 2,053 lines. Shared primitives: `isoMaterialGroup` (P/M/K/N/S/H), `millingStrategy` (12 types), `toolpathType` (10).

## SKILLS (`.claude/commands/` — project + user)
`mill.md` (255 lines, full pipeline orchestrator) · `mill-studio.md` · `mill-harden.md` · `mill-learn.md` · `mill-optimize.md` · `mill-validate.md` · `mill-agi.md` · `mill-awareness.md` · `hypermill-3d-strategy-guide.md` · `hypermill-project-setup.md`

## TRIBAL-TIP CATALOGS
- `H:/PRISM/mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` — **262 tips** (post-iter23). Export: `MILLING_PDF_CITED_TIPS`. Types: `CitedMillingTip`, `MillingTipEvidenceLevel`, `MillingTipConfidence`. Queries: `tipsForMillingOperation()`, `listMillingOperationsWithTips()`.
- `H:/PRISM/mcp-server/src/data/tribal-tips/milling-training-index.ts` — derived training nodes. Export: `MILLING_TRAINING_NODES`. Queries: `nodesForOperation()`, `nodesByVendor()`, `nodesByConfidence()`, `searchMillingTrainingNodes()`, `summarizeMillingTrainingIndex()`.

## BRIDGE / EXTRACTION SCRIPTS
- `H:/PRISM/scripts/generate-milling-extracted-pdf-bridge.mjs` — bridges whiskey-slot PDF extractions → system-viz
- `H:/PRISM/scripts/generate-milling-tribal-tip-bridge-features.mjs` — bridges cited-tips → system-viz (R12 Windows path-fix shipped this session)
- `H:/PRISM/scripts/audit-mill-psn-coverage.mjs` — PSN-coverage audit
- `H:/PRISM/scripts/extract-jm-milling-tools-fusion.mjs` — Fusion 360 tool extraction
- `H:/PRISM/scripts/extract-tungaloy-endmills.py` · `extract-kennametal-milling.py` · `extract-hypermill-speedfeed.py` — vendor catalog extractors

## SYSTEM-VIZ AUGMENTATION (state/shared/system-viz/)
- `milling-extracted-pdf-bridge-augmentation.json` (91.4K, 68 PDFs)
- `milling-tribal-tip-bridge-augmentation.json` (12.8K, 78 tips bridged)
- `staging/galaxy-roosts/mill.json`
- `staging/galaxy-roosts/pdf-corpus-mill.json`

Consumer engine for tribal-tip → curriculum bridge: `mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts`.

## WIKI ENTRIES (1,310 milling-tagged files; ~100 in architecture/)
- **Engines (mill-domain):** `knowledge/wiki/architecture/engines/mill/{powermill*,mastercammillturnbridge}.md` + flat `engines/{ballendmill,chamfermilling,helicalmilling,highfeedmilling,plungemilling,rollingmill,splinemilling,threadmilling,trochoidalmilling}engine.md`
- **Actions:** `architecture/actions/calc/{ball-end-mill,chamfer-milling,helical-milling,high-feed-milling,plunge-milling,spline-mill,thread-mill,trochoidal-milling}-calc.md` · `actions/aireasoning/ai-mill-*.md` (9) · `actions/cam/cam-hypermill-*.md` (20+)
- **Skills:** `architecture/skills/{project,user}/mill-*.md` + `hypermill-*.md`
- **Code-tribal (365+):** `knowledge/wiki/code-tribal/youtube-*.md` (recent: `youtube-y2yZ-Ql6eyo.md` Deep Pocket Finishing, `youtube-HS50Q-EWtdU.md` 3D Finishing Sloped Surfaces)
- **Index taxonomy:** `domain-mill` (24 engines) · `domain-milling` (34 engines) · `dispatcher-mill` (179 actions wiki count, NOTE: live dispatcher has 847)
- **Roadmap:** `project_mill_master` MILL-MASTER v13.0.0 (79 phases, 900 units)

## JM DIE FLEET (root `H:/PRISM/JM DIE/`)
- **`CNC MILL HAAS/`** — 59 customer subdirectories (Haas-program archive)
- **`HURCO CNC PROGRAMS/`** + **`HAAS-HURCO/`** — auxiliary milling programs

### Mill machines (from `mcp-server/src/data/jm-die-profile.ts` + `ShopConfigurationEngine.ts` DEFAULT_MACHINES):
| ID | Model | Controller | Rate | Axes/Capability |
|----|-------|-----------|------|-----------------|
| VMC-01 | Hurco VM30i | WinMAX v10 | $80 | 3-axis VMC, drilling, tapping, boring, contouring |
| VMC-02 | Okuma M460V-5AX | OSP-P300MA-H | $135 | 5-axis, die-sinking, high-speed milling |
| VMC-03 | Haas VF-2 | PRE-NGC | $65 | 3-axis VMC, drilling, tapping, boring |
| VMC-04 | Haas OM-2 | PRE-NGC | $55 | 3-axis VMC, engraving, small parts |
| VMC-05 | Roku-Roku HC 658-II | Fanuc 31i-B5 | $110 | High-speed milling, die-sinking, electrode milling |
| MAN-02 | Manual mill | (none) | $45 | Manual |

Path constants: `JM_DIE_MACHINE_PATHS.millHaas = "H:\\PRISM\\JM DIE\\CNC MILL HAAS"`, `millHurco = "H:\\PRISM\\JM DIE\\HURCO"`.

## CAM BRIDGES (per-vendor)
- **HyperMILL:** see HyperMILL sub-galaxy above (12 engines)
- **Fusion 360 / Inventor HSM:** `Fusion360MillTurnBridgeEngine.ts` · `PrintToInventorHSMBridge.ts` · `SfcInventorHsmApplyEngine.ts`
- **Mastercam:** `MastercamMillTurnBridge.ts` (23.7K)
- **PowerMill:** `PowerMillStrategyEngine.ts` (41.8K) + wiki engines `powermillroughingfunctionindexengine`, `powermillfinishingfunctionindexengine`, `powermill5axisfunctionindexengine`, `powermillunifiedfunctionindexengine`
- **SolidCAM:** `SolidCAMMillTurnFunctionIndexEngine.ts`
- **Esprit:** `SfcEspritApplyEngine.ts`
- **NX CAM:** `NXCAMMillingFunctionIndexEngine.ts`

## POST PROCESSORS (mill-specific)
- `HurcoV11MillMasterPostEngine.ts` (91.9K — 38-stage post, rapid/linear/arc optimization, cutter comp, dwell insertion)
- `OkumaOSPMillMasterPostEngine.ts` (80.9K — Okuma syntax, rapid plane opt, subroutine sequencing, M-code macros)
- `PostProcessorPipelineEngine.ts` — central 38-stage post orchestrator

## PHYSICS CONSTANTS (`mcp-server/src/physics/constants.ts`, 1,082 LOC)

### Kienzle kc1.1 [N/mm²] / mc — canonical (NEVER inline)
- **P** (steel) = 1800 / 0.25 · **M** (stainless) = 2100 / 0.25 · **K** (cast iron) = 1100 / 0.28
- **N** (al/cu/brass) = 700 / 0.22 · **S** (Inconel/Ti) = 2800 / 0.27 · **H** (HRC 45-65 hardened) = 3200 / 0.30

### Taylor C / n by material (carbide tool):
Steel 350/0.25 · Stainless 200/0.20 · Cast iron 250/0.25 · Aluminum 600/0.40 · Superalloys 150/0.18 · Hardened (CBN/ceramic) 120/0.15

### Milling tables:
- `CANONICAL_MILLING_SPEEDS` [m/min]: P 200/280 (rough/finish), M 130/200, K 160/240, N 500/800, S 40/70, H 60/100
- `CANONICAL_MILLING_FEEDS` [mm/tooth]: P 0.15/0.08, M 0.12/0.06, K 0.18/0.10, N 0.20/0.10, S 0.08/0.04, H 0.06/0.03
- Tool modulus: carbide 600 GPa, HSS 210 GPa (for deflection)

## SPEED-FEED ORCHESTRATION HUB
- **`SpeedFeedOrchestratorEngine.ts`** (2,851 LOC) — central hub, 67 integration points, coordinates UltimateSpeedFeed + AutoSpeedFeed + MachiningPlaybook
- `UltimateSpeedFeedEngine.ts` — core physics (any input subset → infer missing via Kienzle/Taylor/chip-thinning/thermal/stability/surface-finish/MRR)
- `AutoSpeedFeedEngine.ts` — G-code line-by-line optimizer (chip-thinning, corner decel, arc/plunge limit, CuttingPowerBudget verify)
- Supporting: `SpeedFeedPropagationBridgeEngine.ts`, `CAMSpeedFeedBridgeEngine.ts`, `SpeedFeedBaselineComparatorEngine.ts`

## STATE / CONFIG FILES (state/shared/)
- `peer-repo-signatures/{prism-hypermill-ms1,prism-mill-master,prism-mill-p06,prism-mill-worktree}.json`
- `jm-fusion-tools/jm-milling-tools.json`
- `cad-action-templates/{powermill,hypermill}.actions.json`
- `audit-findings/revenue-roadmap/round2/03-ms2-mill-lathe.json`
- `dashboards/milling-pdf-corpus.json`

## QUICK PATH PATTERNS (foxtrot grep-substitute)
- Mill engine: `mcp-server/src/engines/{*Mill*,*milling*}.ts` + `engines/{mill,hypermill}/`
- Mill algorithm: `mcp-server/src/algorithms/{Kienzle,ExtendedTaylor,StabilityLobe,GilbertMRR,ChipThinning,SurfaceFinish,JohnsonCook,ToolWear,Jaeger,PowerTorque,ToolDeflection,ThermalPartition,ChipType}*.ts`
- Mill data: `mcp-server/src/data/tribal-tips/milling-*.ts` + `data/jm-die-profile.ts`
- Mill bridge script: `scripts/{generate,extract,audit}-*mill*.{mjs,py}`
- Mill wiki: `knowledge/wiki/architecture/{engines/mill/,actions/*/{*mill*,*hypermill*},skills/{project,user}/mill-*}` + `code-tribal/youtube-*.md`
- Mill system-viz: `state/shared/system-viz/milling-*.json` + `staging/galaxy-roosts/{mill,pdf-corpus-mill}.json`
- JM mill programs: `JM DIE/{CNC MILL HAAS,HURCO,HAAS-HURCO}/`

## RELATED MEMORIES (cross-links)
- [[feedback_psn_definition]] — PSN 11-leg taxonomy (this index serves PSN leg #5 Tribal + #7 Engines + #8 Algorithms + #9 Formulas)
- [[feedback_system_viz_first_audit]] — query /system-viz BEFORE Grep when checking exists/wired/orphan
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF extraction pipeline (lima slot)
- [[feedback_high_roi_backend_first_slot_queue]] — backend-infra ahead of revenue work for foxtrot's tribal-stream

## REGEN
Re-run the 6-agent sweep when:
1. Mill galaxy CLAUDE.md scope changes
2. New mill engine added (`engines/*Mill*`)
3. Tribal-tip catalog renamed/split
4. JM Die fleet machine added/retired
5. CAM-bridge vendor added (e.g. new EdgeCAM/WorkNC bridge)

This index was built in ~90s of parallel-agent time. Rebuild cost is bounded.


## Related
[[engines/MillMasterOrchestratorFacadeEngine|MillMasterOrchestratorFacadeEngine]] • [[engines/MillStrategyNeuralEngine|MillStrategyNeuralEngine]] • [[engines/MillingPrintToProgramEngine|MillingPrintToProgramEngine]] • [[engines/MillingProgramPatternEngine|MillingProgramPatternEngine]] • [[engines/MillingAGIOrchestrationEngine|MillingAGIOrchestrationEngine]] • [[engines/MillingUltimateAIEngine|MillingUltimateAIEngine]] • [[engines/MillingAIUltraIntelligenceEngine|MillingAIUltraIntelligenceEngine]] • [[engines/MillingAGIMasterEngine|MillingAGIMasterEngine]] • [[engines/HyperMillCADArtifactGeneratorEngine|HyperMillCADArtifactGeneratorEngine]] • [[engines/HyperMillCycleCatalogEngine|HyperMillCycleCatalogEngine]]