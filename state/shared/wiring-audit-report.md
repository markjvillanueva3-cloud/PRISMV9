# PRISM Engine Wiring Audit Report

**Generated**: 2026-06-22T17:05:07Z (automated scheduled run)
**SVI Snapshot**: 1.4 × 10^46, headline Ψ = 100.0% (state/shared/SVI-compact.md, 2026-06-22T16:42Z)
**Auditor**: engine-wiring-audit (autonomous scheduled task)
**Previous Audit**: 2026-05-04 (Ψ reported 41.1%)

---

## Executive Summary

Static import-graph analysis of the live source tree. **Key correction to the SVI headline:** SVI-compact.md reports Ψ = 100.0%, but its own per-pipeline reach table shows 36–92% — the headline and the component data are inconsistent. The headline 100% is not supported by the actual import graph.

- **3,827 engine source files** scanned in `src/engines/`.
- **3,764** are not imported by **any dispatcher** directly (98%). Most are reached indirectly (engine→engine, sub-engine of a pipeline).
- **2,680** are not imported anywhere in `src/`.
- **138 are TRUE repo-wide orphans** — imported by no file anywhere (src, scripts, web). After removing archive/boot/singleton false-positives, **131 substantive engine orphans** remain.
- **9 dead dispatchers** of 111 dispatcher files — present in source but imported by no route/server/tool-index.
- **All 9 pipelines under-wire their registries**: only 4 of 36 pipeline×registry slots have a direct registry import.

| Metric | Current (2026-06-22) | Previous (2026-05-04) | Δ |
|--------|----------------------|------------------------|---|
| Total engine files | 3,827 | 3,046 | +781 |
| Not imported by any dispatcher | 3,764 | 1,089 | — (method differs) |
| TRUE repo-wide orphans | 138 | n/a | new metric |
| Substantive engine orphans | 131 | n/a | new metric |
| Dead dispatchers | 9 | 30 | −21 |
| Pipelines w/ 0 direct core registries | 5 of 9 | 9 of 9 | −4 |
| Pipelines w/ 0 physics helpers | 3 (Grinding, Laser, Waterjet) | 1 (EDM) | +2 |

> Methodology note: the previous audit's 1,089 figure counted dispatcher-direct imports against a 3,046-file tree; this audit resolves indirect reach across the whole repo, so the comparable headline is the **138 true orphans**, not the dispatcher-direct count. Numbers are not 1:1 comparable across the two methods.

---

## 1. Orphan Engines (true repo-wide — imported nowhere)

**138 total**; **131 substantive** after dropping 7 archive/boot/singleton entries (e.g. `WeeklySynthesisEngine.charlie-crashed.archive.*`, `reactiveChainBootstrap`, `*Singleton`).

### 1a. CAM-vendor integration subsystem — largest orphan cluster (41 engines)

An entire multi-CAM bridge/orchestration/function-index layer exists but is wired to nothing. This is the single biggest disconnected subsystem by count:

- `AutodeskFusionMCPProxyEngine`
- `BatchCAMAddInGenerators`
- `BobCADCAMBridgeEngine`
- `CAMKernelExtensionEngine`
- `CAMKernelValidationEngine`
- `CAMPluginSDKEngine`
- `CATIACodeGeneratorEngine`
- `CATIAMachiningAIOrchestrationEngine`
- `CadCamHandoffEngine`
- `CamxEnergyOptimizationEngine`
- `Fusion360CADFunctionIndexEngine`
- `Fusion5AxisEngine`
- `FusionCPSParserEngine`
- `FusionMaterialPhysicsBridge`
- `FusionMultiAxisEngine`
- `InventorCAMStrategyEngine`
- `InventorCAMToolExportEngine`
- `MastercamAIOrchestrationEngine`
- `MastercamControllerCatalogEngine`
- `MastercamMillTurnBridge`
- `MastercamMultiAxisEngine`
- `MastercamSafetyHooksEngine`
- `NXCAMAIOrchestrationEngine`
- `NXCAMCodeGeneratorEngine`
- `NXCAMFBMFunctionIndexEngine`
- `NXCAMFunctionIndexEngine`
- `NXCAMMillingFunctionIndexEngine`
- `NXCAMTurningFunctionIndexEngine`
- `PowerMillAIOrchestrationEngine`
- `PowerMillCodeGeneratorEngine`
- `SolidCAM25DFunctionIndexEngine`
- `SolidCAM3DHSSHSRFunctionIndexEngine`
- `SolidCAM5AxisFunctionIndexEngine`
- `SolidCAMAIOrchestrationEngine`
- `SolidCAMCodeGeneratorEngine`
- `SolidCAMFunctionIndexEngine`
- `SolidCAMIMachiningFunctionIndexEngine`
- `SolidCAMMillTurnFunctionIndexEngine`
- `SolidCAMSafetyHooksEngine`
- `SolidCAMTurningFunctionIndexEngine`
- `WorkNCCAMBridgeEngine`

### 1b. Top 20 other substantive orphans

- `AIDeepKnowledgeIntegrationEngine`
- `AIIntelligenceMaximizerEngine`
- `AIPhysicsOptimizationEngine`
- `AISystemSynchronizerEngine`
- `AdaptiveParameterSpaceEngine`
- `AdditiveManufacturingPhysicsEngine`
- `AgentAutoUpdateEngine`
- `AssemblyOptimizationEngine`
- `AssessmentEngine`
- `AuditManagerEngine`
- `BatchCAMControllerEngines`
- `BatchCAMMaterialBridgeEngines`
- `BatchCAMOperationCatalogEngines`
- `BatchCAMSafetyEngines`
- `BatchCAMStrategyEngines2`
- `CMMPathPlanningEngine`
- `ControllerFeatureMatrixEngine`
- `CryogenicCuttingEngine`
- `CuttingDataExportEngine`
- `E2ShopConnectorEngine`

_(+70 more non-CAM substantive orphans; full machine list in `/tmp` scan.)_

---

## 2. Dead Dispatchers (in source, imported by no route/server)

**9 of 111** dispatcher files reach no route surface:

- `aiDispatcher`
- `cadAutomationDispatcher`
- `camFunctionDispatcher`
- `cplDispatcher`
- `machineDispatcher`
- `securityDispatcher`
- `sessionDocNodesAction` — *action module, not a full dispatcher; likely needs folding into its parent session dispatcher*
- `sessionHybridSearchAction` — *action module, not a full dispatcher; likely needs folding into its parent session dispatcher*
- `sessionNodeCardAction` — *action module, not a full dispatcher; likely needs folding into its parent session dispatcher*

Three (`sessionDocNodesAction`, `sessionHybridSearchAction`, `sessionNodeCardAction`) are action fragments, not standalone dispatchers. The remaining six (`aiDispatcher`, `cadAutomationDispatcher`, `camFunctionDispatcher`, `cplDispatcher`, `machineDispatcher`, `securityDispatcher`) are full dispatchers shipping unreachable actions.

---

## 3. Per-Pipeline Registry Connection Status

Direct import of each core registry inside the pipeline engine file (Y = direct `import`; N = absent — may still reach the data indirectly via a sub-engine, but not wired at the pipeline level):

| Pipeline | File LOC | Material | Tool | Machine | Strategy | Physics engines (direct) | SVI reach |
|----------|---------:|:--:|:--:|:--:|:--:|--------------------------|----------:|
| PrintToProgram | 3,527 | Y | N | N | N | AutoSpeedFeedEngine, ChatterStabilityLobeEngine, constants | 90% |
| Turning | 1,822 | Y | N | N | N | ChatterStabilityLobeEngine, constants | 74% |
| MultiAxis | 950 | Y | N | N | N | constants | 91% |
| MillTurn | 2,125 | N | N | N | N | constants | 92% |
| EDM | 701 | N | N | N | N | wedm-constants | 38% |
| Grinding | 2,052 | N | N | N | N | — | 52% |
| Laser | 2,281 | N | N | N | N | — | 37% |
| Waterjet | 2,335 | N | N | N | N | — | 36% |
| QuoteToShip | 5,450 | N | N | Y | N | constants | 51% |

**Findings:**
- **ToolRegistry and ToolpathStrategyRegistry are imported by ZERO pipelines.** No pipeline pulls tooling or strategy data at the pipeline layer — the SVI table claims `tools`/`strategies` for several pipelines, but no import backs that claim.
- **EDM is the thinnest** (701 LOC, 1 import, 0 registries, only `wedm-constants`) — corroborated by lowest SVI reach (38%).
- **Grinding, Laser, Waterjet import 0 physics engines** (no Kienzle/Taylor/thermal/chatter) — they emit programs without a force/thermal model. SVI reach 52/37/36%.
- **MillTurnSwiss imports no registries directly** despite 92% SVI reach — reach is via sub-engines, masking a pipeline-level wiring gap.

---

## 4. Recommended Wiring Actions (sorted by estimated Ψ impact)

1. **Wire the CAM-vendor bridge subsystem (41 engines) to a dispatcher.** Largest orphan cluster. Create/revive a `prism_cam_vendor` dispatcher (or fold into `prism_cam`) importing the Mastercam/NX/SolidCAM/PowerMill/Fusion/Inventor/CATIA bridges + their function-index engines. **Highest Ψ lift** (≈100+ actions).
2. **Revive the 6 full dead dispatchers** (`aiDispatcher`, `cadAutomationDispatcher`, `camFunctionDispatcher`, `cplDispatcher`, `machineDispatcher`, `securityDispatcher`) by importing them in their route files. Each ships actions that never reach the MCP surface.
3. **Connect ToolRegistry + ToolpathStrategyRegistry into all 9 pipelines** at the pipeline layer (currently 0/9). Biggest structural registry gap; directly raises pipeline reach.
4. **Add a physics model to Grinding/Laser/Waterjet** (force/thermal/ablation). They currently emit programs with no physics helper — lowest-reach pipelines after EDM.
5. **Bring EDM to parity**: import MaterialRegistry + a discharge/thermal physics engine into `EDMProgramAssemblerEngine` (currently 1 import). Single highest per-pipeline lift (38%→).
6. **Fold the 3 session action fragments** (`sessionDocNodesAction`/`HybridSearchAction`/`NodeCardAction`) into the parent session dispatcher, or delete if superseded.
7. **Triage the ~90 non-CAM substantive orphans** (reliability, sustainability/LCA, machine-connectivity/MTConnect/MQTT, additive, acoustics): decide wire-or-archive per engine; several look like genuine capabilities (MTConnect, PreventiveMaintenance, ReliabilityEngineering) worth a dispatcher.

---

## 5. Data-Integrity Flag

`SVI-compact.md` headline **Ψ = 100.0% is contradicted by its own pipeline table (36–92%) and by this import-graph audit.** Recommend the SVI calculator stop counting indirectly-loaded engines as 'reachable' at 100% and instead report the import-graph reach, so Ψ reflects actual pipeline wiring. Until then, treat the 100% headline as unverified.

---

_Audit method: static import-graph scan (3,827 engine files, 111 dispatchers, 81 routes). Direct `from "..."` import resolution; indirect/dynamic loaders not counted as wiring. Singleton/boot files may be dynamically loaded and are flagged, not asserted dead._