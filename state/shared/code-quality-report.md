# PRISM Code Quality Scan — Reachability (Psi) Report

**Generated:** 2026-06-26T18:14:19Z (UTC)
**Scope:** `H:/prism/mcp-server/src/` — 10,300 `.ts` files; 3,861 top-level engine files; 5,068 non-test files scanned.
**Run mode:** Scheduled autonomous scan. Static analysis only (no build/test executed).

---

## Executive Summary

| Metric | Count | Psi Impact |
|--------|-------|-----------|
| Orphaned engine files (never imported anywhere) | **128** | HIGH |
| Orphaned `.test` files inside `engines/` | 11 | LOW (test hygiene) |
| Likely-dead named imports | **740** (across 396 files) | MEDIUM |
| TODO / FIXME / HACK / XXX comments | **93** | LOW–MED |
| — of which wiring-flavored TODO/FIXME | 13 | MEDIUM |
| Stub engines (`throw … not implemented`) | 5 engines (+2 tests) | MED–HIGH |
| QuoteToShipOrchestratorEngine reachable? | **YES** (via businessDispatcher) | RESOLVED |
| Stale count in `index.ts` header comment | 554 claimed vs **3,670** actual `*Engine.ts` | MED (doc drift) |

**Headline:** 128 engine files compile in the tree but are imported by nothing — they inflate SVI without contributing to Psi (reachability). They are the single largest dead-code surface found.

---

## 1. Unexported / Orphaned Engines (HIGH Psi impact)

**Definition:** an engine file whose basename never appears in any `from "…"` import path anywhere else in `src/`. Such an engine is invisible to every dispatcher and consumer.

**Count: 128 real engine files** (`.test` orphans excluded).

**Methodology caveat:** detection is import-path-basename based. An engine reached *only* via a dynamic `import()`, a barrel re-export under a renamed alias, or a registry-driven string lookup would show as a false positive. Verify before deleting — treat this as a **candidate** list, not a kill list.

Notable clusters (suggests whole subsystems never wired):

- **CAM vendor function-index / orchestration engines** (largest cluster): `SolidCAM*FunctionIndexEngine` (×9), `NXCAM*FunctionIndexEngine` (×5), `MastercamAIOrchestrationEngine`, `MastercamMultiAxisEngine`, `MastercamMillTurnBridge`, `MastercamControllerCatalogEngine`, `MastercamSafetyHooksEngine`, `CATIACodeGeneratorEngine`, `CATIAMachiningAIOrchestrationEngine`, `NXCAMCodeGeneratorEngine`, `PowerMillCodeGeneratorEngine`, `WorkNCCAMBridgeEngine`, `BobCADCAMBridgeEngine`, `InventorCAMStrategyEngine`, `InventorCAMToolExportEngine`, `Fusion360CADFunctionIndexEngine`, `FusionCPSParserEngine`, `FusionMultiAxisEngine`, `FusionMaterialPhysicsBridge`, `AutodeskFusionMCPProxyEngine`, `CAMKernelExtensionEngine`, `CAMKernelValidationEngine`, `CAMPluginSDKEngine`.
- **Batch-CAM generators** (likely build-time helpers, verify): `BatchCAMAddInGenerators`, `BatchCAMControllerEngines`, `BatchCAMMaterialBridgeEngines`, `BatchCAMOperationCatalogEngines`, `BatchCAMSafetyEngines`, `BatchCAMStrategyEngines2`.
- **Machine connectivity / shop-floor**: `MTConnectAdapterEngine`, `MqttBridgeEngine`, `MachineConnectivityEngine`, `RealTimeMachineIntelligenceEngine`, `MachineModelAcquisitionEngine`, `MachineModelDownloaderEngine`, `E2ShopConnectorEngine`, `EquipmentAssetEngine`, `PreventiveMaintenanceEngine`.
- **Reliability / statistics**: `ReliabilityBlockDiagramEngine`, `ReliabilityEngineeringEngine`, `ManufacturingStatisticsEngine`.
- **AI maximizer family** (possible dedup targets): `AIDeepKnowledgeIntegrationEngine`, `AIIntelligenceMaximizerEngine`, `AIPhysicsOptimizationEngine`, `AISystemSynchronizerEngine`, `PRISMNeuralKnowledgeSynthesisEngine`.
- **Singletons never imported**: `emailIntakeSingleton`, `intakeProcessorSingleton`, `visionDiagnosticSingleton`, `reactiveChainBootstrap` — confirm these aren't side-effect imports referenced elsewhere.
- **Explicit dead artifact**: `WeeklySynthesisEngine.charlie-crashed.archive.2026-05-17.ts` — a crashed-session archive file living in `engines/`. Safe to remove from the source tree (move to an archive dir).

Full enumeration in Appendix A.

---

## 2. Dead Imports (MEDIUM Psi impact)

**740** named imports appear exactly once in their file (only in the `import { … }` statement, never used in the body), spanning **396 files**.

**Caveat:** approximate. False positives possible where a symbol is used only inside template literals, JSX, or type-only positions stripped by tooling. Recommend running `tsc --noUnusedLocals` / ESLint `no-unused-vars` for the authoritative list before mass edits. This scan establishes the *order of magnitude* and the hotspot files.

These don't affect runtime Psi directly but raise parse cost, mislead readers about dependencies, and hide real coupling.

---

## 3. TODO / FIXME / HACK / XXX (LOW–MEDIUM)

Total **93** markers: TODO 71, FIXME 9, HACK 7, XXX 6.

- **Wiring-flavored (affect Psi): 13** — TODO/FIXME within 60 chars of `wire | implement | hook up | register | dispatch | connect | not yet | unimplemented`. These indicate an engine/action half-connected. Prioritize these 13 for triage.
- Remaining ~80 are cosmetic/in-line notes (LOW).

---

## 4. Stub / Phantom Engines (MED–HIGH)

**5 engine files** contain `throw new Error(… not implemented …)`:

- `engines/AutonomousAIOrchestrationEngine.ts`
- `engines/CommonlyMissedPatternsRegistry.ts`
- `engines/LatheLiveToolingPlannerEngine.ts`
- `engines/LocalModelOrchestratorEngine.ts`
- `engines/PRISMNeuralKnowledgeSynthesisEngine.ts`

(+2 test files: `__tests__/CounterfactualBuildSimulatorEngine.test.ts`, `__tests__/GapPredictorEngine.test.ts` — these likely assert the throw, so they are expected.)

**Caveat:** a `not implemented` throw can be a legitimate guard on an unsupported branch rather than a whole phantom engine. Each needs a body read to classify. Note `PRISMNeuralKnowledgeSynthesisEngine` appears on BOTH the orphan list AND the stub list — strongest deletion/finish candidate.

---

## 5. QuoteToShipOrchestratorEngine — Export Status (RESOLVED)

The CLAUDE.md note "NOT exported from index.ts yet" is **stale**. Findings:

- Not a *direct* export in `index.ts` (correct — `index.ts` is the MCP server entry, not an engine barrel).
- **Reachable**: referenced by 16 non-self files, including `tools/dispatchers/businessDispatcher.ts`.
- `businessDispatcher` is imported (`index.ts:182`) and registered (`index.ts:791`) via `registerBusinessDispatcher(server)`.
- Therefore QuoteToShip IS wired into the live tool surface through the business dispatcher. **Psi-reachable. No action needed** beyond updating the stale CLAUDE.md note.

---

## 6. Recommendations — sorted by Psi impact

1. **(HIGH) Triage the 128 orphaned engines.** For each, confirm no dynamic/aliased/string-registry reference, then either (a) wire to its natural dispatcher (the CAM-vendor and machine-connectivity clusters look like genuinely unfinished subsystems) or (b) move to `engines/_archive/`. Start with the CAM-vendor cluster (~35 files) — wiring or removing it as a unit gives the biggest single Psi/SVI swing.
2. **(HIGH) Delete the crashed archive file** `WeeklySynthesisEngine.charlie-crashed.archive.2026-05-17.ts` from `engines/` — pure dead weight, zero ambiguity.
3. **(MED-HIGH) Resolve the 5 stub engines.** Read each body; finish or remove. `PRISMNeuralKnowledgeSynthesisEngine` (orphan + stub) first.
4. **(MED) Run `tsc --noUnusedLocals` / ESLint** to confirm and auto-strip the ~740 dead imports; bank the cheap wins in the 396 hotspot files.
5. **(MED) Triage the 13 wiring TODO/FIXME** — these mark half-connected actions that directly suppress Psi.
6. **(MED) Fix the `index.ts` header count.** It claims "554 engine files (561 exported)" while the tree holds 3,670 `*Engine.ts`. Auto-regenerate from `PRISM-INVENTORY-LATEST.md` instead of hardcoding.
7. **(LOW) Move the 11 orphaned `.test` files** out of `engines/` into `__tests__/` for consistency, or delete if their subject engine is gone.

---

## Appendix A — All 128 orphaned engine files

```
AIDeepKnowledgeIntegrationEngine, AIIntelligenceMaximizerEngine, AIPhysicsOptimizationEngine,
AISystemSynchronizerEngine, AdaptiveParameterSpaceEngine, AdditiveManufacturingPhysicsEngine,
AgentAutoUpdateEngine, AssemblyOptimizationEngine, AssessmentEngine, AuditManagerEngine,
AutodeskFusionMCPProxyEngine, BatchCAMAddInGenerators, BatchCAMControllerEngines,
BatchCAMMaterialBridgeEngines, BatchCAMOperationCatalogEngines, BatchCAMSafetyEngines,
BatchCAMStrategyEngines2, BobCADCAMBridgeEngine, CAMKernelExtensionEngine, CAMKernelValidationEngine,
CAMPluginSDKEngine, CATIACodeGeneratorEngine, CATIAMachiningAIOrchestrationEngine, CMMPathPlanningEngine,
CamxEnergyOptimizationEngine, ControllerFeatureMatrixEngine, CryogenicCuttingEngine, CuttingDataExportEngine,
E2ShopConnectorEngine, EPackTableImportEngine, EdgeCaseCaptureEngine, EmbeddingPipelineEngine,
EnergyHarvestingEngine, EnergyOptimizationIntegrationEngine, EquipmentAssetEngine, ExtractedKnowledgeWiringEngine,
FinishTargetAdvisorEngine, Fusion360CADFunctionIndexEngine, FusionCPSParserEngine, FusionMaterialPhysicsBridge,
FusionMultiAxisEngine, GapDetectionEngine, HandbookMaintenanceIntelligenceEngine, HolePatternPipelineEngine,
ImpactAnalysisEngine, InstructorDashboardEngine, InventorCAMStrategyEngine, InventorCAMToolExportEngine,
KioskModeEngine, LaserAblationPhysicsEngine, LatheLoRATrainingScriptEngine, LatheTransformerEngine,
LessonRendererEngine, LocalLearningEngine, MTConnectAdapterEngine, MachineConnectivityEngine,
MachineMatcherEngine, MachineModelAcquisitionEngine, MachineModelDownloaderEngine, MachiningAcousticsEngine,
MacroBulkEmitOrchestratorEngine, ManufacturerCatalogIndexEngine, ManufacturingStatisticsEngine,
MastercamAIOrchestrationEngine, MastercamControllerCatalogEngine, MastercamMillTurnBridge, MastercamMultiAxisEngine,
MastercamSafetyHooksEngine, MillKinematicsCollisionEngine, ModelRegistryEngine, MqttBridgeEngine,
MultiAxisKinematicEngine, NXCAMAIOrchestrationEngine, NXCAMCodeGeneratorEngine, NXCAMFBMFunctionIndexEngine,
NXCAMFunctionIndexEngine, NXCAMMillingFunctionIndexEngine, NXCAMTurningFunctionIndexEngine, PPValidatorAGIWiringEngine,
PRISMNeuralKnowledgeSynthesisEngine, PluginManifestEngine, PowerMillCodeGeneratorEngine, PreventiveMaintenanceEngine,
PrintToAIBridgeEngine, ProgrammerProductivityEngine, ROIAdvisorEngine, RawToolingNormalizerEngine,
RealTimeMachineIntelligenceEngine, ReliabilityBlockDiagramEngine, ReliabilityEngineeringEngine, ReverseIndexEngine,
SaaSAPIEngine, SamplingWorkflowEngine, ShopDataCompletenessEngine, SkillInliningOptimizerEngine,
SoftJawBoringGCodeEngine, SolidCAM25DFunctionIndexEngine, SolidCAM3DHSSHSRFunctionIndexEngine,
SolidCAM5AxisFunctionIndexEngine, SolidCAMAIOrchestrationEngine, SolidCAMCodeGeneratorEngine,
SolidCAMFunctionIndexEngine, SolidCAMIMachiningFunctionIndexEngine, SolidCAMMillTurnFunctionIndexEngine,
SolidCAMSafetyHooksEngine, SolidCAMTurningFunctionIndexEngine, StandardDimensionLookupEngine, StochasticEDMEngine,
SustainabilityLCAEngine, SwarmGroupExecutor, SystemUtilizationAuditEngine, ThreadMethodSelectorEngine,
ToolpathThermalEngine, TroubleshootingDecisionTreeEngine, UserToolLibraryEngine, UserToolLibraryPersistence,
VisualLabEngine, WEDMProductionReadinessEngine, WEDMSchedulingEngine,
WeeklySynthesisEngine.charlie-crashed.archive.2026-05-17, WhiteLabelConfigEngine, WorkNCCAMBridgeEngine,
WorkflowTemplateEngine, ZuluDashboardControlEngine, emailIntakeSingleton, intakeProcessorSingleton,
reactiveChainBootstrap, visionDiagnosticSingleton
```

## Appendix B — Orphaned `.test` files in `engines/`

```
BayesianAcquisitionRefiner.test, CADAppCircuitBreakerEngine.test, CADFallbackRoutingEngine.test,
GraphImportanceEngine.test, HermesAutomationBridge.test, KnowledgeInjectionPipelineEngine.test,
MOEAStoppingCriterion.test, MastercamStrategyEngine.test, MultiObjectiveEngine.synergy.test,
RiskTierClassifierEngine.test, UnitOfMeasureDisambiguationEngine.test
```

---
*Scan caveats: reachability is static import-path analysis; dynamic imports, registry/string lookups, and aliased re-exports can cause false positives. Dead-import count is approximate — confirm with `tsc --noUnusedLocals`/ESLint before bulk edits. No build or tests were run as part of this scan.*
