---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fb9f93e-060e-41e8-a955-9136ab917e7b"
title: "You are Agent A7 of a zebra-coordinated H: drive inventory audit. India runs per"
date: "2026-05-26"
first_ts: "2026-05-26T15:33:54.407Z"
last_ts: "2026-05-26T15:43:48.043Z"
cwd: "H:\\prism"
messages: 83
user_msgs: 39
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/0fb9f93e-060e-41e8-a955-9136ab917e7b/subagents/agent-a00d3c8e222d88bbe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# You are Agent A7 of a zebra-coordinated H: drive inventory audit. India runs per

> **claude-code-cli** | 2026-05-26 | 83 msgs (39 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fb9f93e-060e-41e8-a955-9136ab917e7b/subagents/agent-a00d3c8e222d88bbe.jsonl`

## Transcript

### User | 2026-05-26T15:33:54.407Z

You are Agent A7 of a zebra-coordinated H: drive inventory audit. India runs per-domain AI-stack coord; your axis is **CAD + 6 CAM bridges** physical accounting. Read-only.

Scope:
1. **CAD engines** — Glob `H:/prism/mcp-server/src/engines/*CAD*.ts` + `*Cad*.ts`. Count + categorize (Fusion/Inventor/Onshape/Solid*/Free*).
2. **CAM engines** — Glob `mcp-server/src/engines/*CAM*.ts` + `*Mastercam*.ts` + `*hyperMILL*.ts` + `*Esprit*.ts` + `*Powermill*.ts` + `*SolidCAM*.ts` + `*NX*.ts` + `*Catia*.ts`. Count per vendor.
3. **CAM bridges per CLAUDE.md** — verify 6 tier-1 bridge engines exist: Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks. Where do they live?
4. **CAM dispatcher coverage** — rtk grep "CAMEngine\|CAMBridge\|MasterCam\|hyperMILL\|Esprit\|InventorHSM" -l in `mcp-server/src/tools/dispatchers/*.ts`.
5. **CAD scripts** — Glob `H:/prism/scripts/cad-*.mjs` count.
6. **CAM scripts** — Glob `H:/prism/scripts/cam-*.mjs` count.
7. **CAD/CAM state files** — search `mcp-server/data/`, `state/shared/` for `cad-*.json`, `cam-*.json`, `*corpus*.json`. Top-10 by size.
8. **CAD/CAM corpus** — `mcp-server/data/cad-functions/` and `cam-functions/` file counts. `state/shared/cad-tribal-corpus.jsonl` and `cam-tribal-corpus.jsonl` size + record count.
9. **Fusion360 + hypermill extracted dirs** — `mcp-server/data/fusion360/`, `mcp-server/data/hypermill/`, `mcp-server/data/hypermill-extracted/` file counts.
10. Bias check.

Output ≤350 lines markdown. Sections: CAD engines · CAM engines per vendor · 6 tier-1 bridges status · Dispatchers · Scripts · State files · Corpus stats · Extraction dirs · Gaps.

Use rtk Bash, Glob. Don't write. Budget ≤3000 tokens output.

### Assistant | 2026-05-26T15:34:10.239Z

I'll execute the CAD + 6 CAM bridges physical accounting audit in parallel.

### Assistant | 2026-05-26T15:34:10.652Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:11.135Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:11.658Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:12.164Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:12.757Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:13.121Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:14.128Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:14.822Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:15.621Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:16.607Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:16.610Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:18.291Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:18.295Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:18.298Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:34:18.300Z

[tool_use: Glob]

### User | 2026-05-26T15:35:48.638Z

[tool_result] mcp-server\src\engines\CadQueryCodeGeneratorEngine.ts
mcp-server\src\engines\CadFileIndexEngine.ts
mcp-server\src\engines\FixtureCadIngesterEngine.ts
mcp-server\src\engines\LatheLoRACadenceEngine.ts
mcp-server\src\engines\LatheLoRACadenceOrchestratorEngine.ts
mcp-server\src\engines\MillingLoRACadenceEngine.ts
mcp-server\src\engines\FiveAxisLoRACadenceEngine.ts
mcp-server\src\engines\MillTurnLoRACa
... [+445 chars truncated]

### User | 2026-05-26T15:35:50.123Z

[tool_result] No files found

### User | 2026-05-26T15:35:50.131Z

[tool_result] mcp-server\src\engines\MastercamSafetyHooksEngine.ts
mcp-server\src\engines\MastercamToolExportEngine.ts
mcp-server\src\engines\MastercamDeepLearningEngine.ts
mcp-server\src\engines\MastercamMaterialBridgeEngine.ts
mcp-server\src\engines\Mastercam5AxisEngine.ts
mcp-server\src\engines\MastercamCycleCatalogEngine.ts
mcp-server\src\engines\MastercamMultiAxisEngine.ts
mcp-server\src\engines\MastercamC
... [+1134 chars truncated]

### User | 2026-05-26T15:35:50.145Z

[tool_result] No files found

### User | 2026-05-26T15:35:50.152Z

[tool_result] mcp-server\src\engines\HyperMillSafetyHooks.ts
mcp-server\src\engines\HyperMillThreadStandardEngine.ts
mcp-server\src\engines\HyperMillCycleDefaultsEngine.ts
mcp-server\src\engines\HyperMillControllerCatalogEngine.ts
mcp-server\src\engines\HyperMillCycleCatalogEngine.ts
mcp-server\src\engines\HyperMillMaterialMapEngine.ts
mcp-server\src\engines\HyperMillMultiAxisEngine.ts
mcp-server\src\engines\Hy
... [+3958 chars truncated]

### User | 2026-05-26T15:35:50.186Z

[tool_result] mcp-server\src\engines\EspritCAMBridgeEngine.ts
mcp-server\src\engines\EspritFunctionIndexEngine.ts
mcp-server\src\engines\PrintToEspritBridge.ts
mcp-server\src\engines\EspritCodeGeneratorEngine.ts
mcp-server\src\engines\EspritLiveBridgeEngine.ts
mcp-server\src\engines\EspritCADExecutionBridge.ts
mcp-server\src\engines\SfcEspritApplyEngine.ts

### User | 2026-05-26T15:35:50.236Z

[tool_result] mcp-server\src\engines\MultiCAMPostEngine.ts
mcp-server\src\engines\FiveAxisCAMIntegrationEngine.ts
mcp-server\src\engines\SelfLearningCAMEngine.ts
mcp-server\src\engines\MillTurnCAMEngine.ts
mcp-server\src\engines\MultiProcessCAMRouterEngine.ts
mcp-server\src\engines\ScalableCAMOrchestratorEngine.ts
mcp-server\src\engines\CAMKernelDispatcherBridge.ts
mcp-server\src\engines\CAMUtilityEngines.ts
mc
... [+4882 chars truncated]

### User | 2026-05-26T15:35:50.242Z

[tool_result] mcp-server\src\engines\CADKernelEngine.ts
mcp-server\src\engines\CADDrawingKnowledgeEngine.ts
mcp-server\src\engines\HyperCADSAutomationEngine.ts
mcp-server\src\engines\PrintToHyperCADSBridge.ts
mcp-server\src\engines\HyperCADSMockLayer.ts
mcp-server\src\engines\hypermill\HyperMillCADArtifactGeneratorEngine.ts
mcp-server\src\engines\TurningCADImportEngine.ts
mcp-server\src\engines\hypermill\CADSeq
... [+5015 chars truncated]

### User | 2026-05-26T15:35:50.248Z

[tool_result] mcp-server\src\engines\ContextInventoryEngine.ts
mcp-server\src\engines\InventoryEOQEngine.ts
mcp-server\src\engines\ToolInventoryOrchestratorEngine.ts
mcp-server\src\engines\InventoryAwareToolSelectorEngine.ts
mcp-server\src\engines\InventoryOptimizationEngine.ts
mcp-server\src\engines\JMDieProgramInventoryEngine.ts
mcp-server\src\engines\ERPToolInventoryEngine.ts
mcp-server\src\engines\InventorC
... [+950 chars truncated]

### User | 2026-05-26T15:35:50.252Z

[tool_result] mcp-server\src\engines\NXCAMStrategyEngine.ts
mcp-server\src\engines\NXCAMCodeGeneratorEngine.ts
mcp-server\src\engines\NXCAMAIOrchestrationEngine.ts
mcp-server\src\engines\NXOpenSketchEntityEngine.ts
mcp-server\src\engines\NXOpenAssemblyDrawingEngine.ts
mcp-server\src\engines\NXCodeGeneratorEngine.ts
mcp-server\src\engines\NXCAMMillingFunctionIndexEngine.ts
mcp-server\src\engines\NXCAMTurningFunc
... [+123 chars truncated]

### User | 2026-05-26T15:35:50.257Z

[tool_result] mcp-server\src\engines\SolidCAMStrategyEngine.ts
mcp-server\src\engines\SolidCAMSafetyHooksEngine.ts
mcp-server\src\engines\SolidCAMCodeGeneratorEngine.ts
mcp-server\src\engines\SolidCAM25DFunctionIndexEngine.ts
mcp-server\src\engines\SolidCAMIMachiningFunctionIndexEngine.ts
mcp-server\src\engines\SolidCAM3DHSSHSRFunctionIndexEngine.ts
mcp-server\src\engines\SolidCAM5AxisFunctionIndexEngine.ts
mcp
... [+286 chars truncated]

### User | 2026-05-26T15:35:50.260Z

[tool_result] mcp-server\src\engines\CampaignEngine.ts
mcp-server\src\engines\CamKnowledgePortabilityEngine.ts
mcp-server\src\engines\MultiCamStrategyEngine.ts
mcp-server\src\engines\CamProfileEngine.ts
mcp-server\src\engines\CamDesignEngine.ts
mcp-server\src\engines\MultiCamStrategyEngineExt.ts
mcp-server\src\engines\CrossCamRecommenderEngine.ts
mcp-server\src\engines\CamxEnergyOptimizationEngine.ts
mcp-server
... [+282 chars truncated]

### User | 2026-05-26T15:35:50.264Z

[tool_result] mcp-server\src\engines\SensorFusionEngine.ts
mcp-server\src\engines\FusionToolSyncEngine.ts
mcp-server\src\engines\FusionCPSParserEngine.ts
mcp-server\src\engines\PhysicsFusionOrchestrator.types.ts
mcp-server\src\engines\PhysicsFusionConvergenceEngine.ts
mcp-server\src\engines\PhysicsFusionOrchestratorEngine.ts
mcp-server\src\engines\FusionToolExportEngine.ts
mcp-server\src\engines\FusionPostSyncE
... [+2228 chars truncated]

### User | 2026-05-26T15:35:50.646Z

[tool_result] No files found

### User | 2026-05-26T15:35:50.669Z

[tool_result] scripts\_archive\closed-milestones\cad-uix-capability-lock.mjs
scripts\_archive\closed-milestones\cad-uix-p8-realtime.mjs
scripts\_archive\closed-milestones\cad-uix-round2.mjs
scripts\_archive\closed-milestones\cad-uix-round3.mjs
scripts\lib\cad-ground-truth-lib.mjs
scripts\lib\cad-ground-truth-lib.test.mjs
scripts\cad-pipeline-coverage-scorer.mjs
scripts\__tests__\cad-regen-test.test.mjs
scripts\
... [+214 chars truncated]

### Assistant | 2026-05-26T15:35:54.718Z

Now let me query the dispatchers, state files, corpus stats, and extraction dirs in parallel.

### Assistant | 2026-05-26T15:35:57.391Z

[tool_use: Grep]

### Assistant | 2026-05-26T15:35:57.879Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:35:57.882Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:35:58.731Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:35:59.254Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:36:00.402Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:36:00.735Z

[tool_use: Glob]

### system

... [3 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-26T15:36:04.465Z

[tool_use: Bash]

### User | 2026-05-26T15:37:06.805Z

[tool_result] mcp-server\src\tools\dispatchers\cadDrawingKnowledgeDispatcher.ts
mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts
mcp-server\src\tools\dispatchers\cadRegressionDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts

### User | 2026-05-26T15:37:07.095Z

[tool_result] mcp-server\src\tools\dispatchers\camFunctionDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts

### User | 2026-05-26T15:37:07.770Z

[tool_result] No files found

### User | 2026-05-26T15:37:08.491Z

[tool_result] No files found

### User | 2026-05-26T15:37:08.604Z

[tool_result] Found 10 files
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\tools\dispatchers\qualityDispatcher.ts
mcp-server\src\tools\dispatchers\monitoringDispatcher.ts
mcp-server\src\tools\dispatchers\millDispatcher.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src
... [+160 chars truncated]

### User | 2026-05-26T15:37:08.627Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### User | 2026-05-26T15:37:08.629Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### User | 2026-05-26T15:37:08.631Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### User | 2026-05-26T15:37:08.633Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### User | 2026-05-26T15:37:08.634Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### User | 2026-05-26T15:38:10.634Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect
---
/usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-26T15:38:14.107Z

Acknowledged graph context. Continuing with corrected tool calls.

### Assistant | 2026-05-26T15:38:16.585Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:38:18.129Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:38:20.143Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:38:20.654Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:38:21.613Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:38:22.101Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:38:22.643Z

[tool_use: Glob]

### Assistant | 2026-05-26T15:38:22.812Z

[tool_use: Glob]

### User | 2026-05-26T15:38:59.322Z

[tool_result] fusion360/
hypercad/
inventor/
mastercam/
solidworks/
---CAM-FUNC---
alphacam/
bobcad/
camworks/
catia/
cimatron/
creo/
edgecam/
esprit/
featurecam/
fusion/
fusion360/
gibbscam/
hypermill/
inventor-hsm/
inventorcam/
mastercam/
nxcam/
partmaker/
powermill/
solidcam/
sprutcam/
surfcam/
tebis/
topsolid/
vericut/
visi/
worknc/
---FUSION360---
FUSION360_CAM_COMPLETE_CATALOG.json  77.3K
---HYPERMILL---

... [+106 chars truncated]

### User | 2026-05-26T15:39:22.930Z

[tool_result] mcp-server\src\engines\SolidWorksAutomationBridge.ts
mcp-server\src\engines\SolidWorksCodeGeneratorEngine.ts
mcp-server\src\engines\PrintToSolidWorksBridge.ts
mcp-server\src\engines\SolidWorksLiveBridgeEngine.ts
mcp-server\src\engines\SolidWorksCADExecutionBridge.ts
mcp-server\src\engines\SolidWorksCADFunctionIndexEngine.ts

### User | 2026-05-26T15:39:22.959Z

[tool_result] scripts\_archive\closed-milestones\cad-uix-capability-lock.mjs
scripts\_archive\closed-milestones\cad-uix-p8-realtime.mjs
scripts\_archive\closed-milestones\cad-uix-round2.mjs
scripts\_archive\closed-milestones\cad-uix-round3.mjs
scripts\lib\cad-ground-truth-lib.mjs
scripts\lib\cad-ground-truth-lib.test.mjs
scripts\cad-pipeline-coverage-scorer.mjs
scripts\__tests__\cad-regen-test.test.mjs
scripts\
... [+214 chars truncated]

### User | 2026-05-26T15:39:22.991Z

[tool_result] mcp-server\src\engines\FreeCADAutomationBridge.ts
mcp-server\src\engines\FreeCADCodeGeneratorEngine.ts

### User | 2026-05-26T15:39:23.022Z

[tool_result] No files found

### User | 2026-05-26T15:39:24.445Z

[tool_result] mcp-server\src\engines\OnshapeAPIBridgeEngine.ts
mcp-server\src\engines\OnshapeLiveCollabAdapter.ts

### User | 2026-05-26T15:39:51.253Z

[tool_result] H:/prism/mcp-server/data/state/cad-corpus-insights.json
H:/prism/mcp-server/data/state/cad-corpus-manifest-recovered.json
H:/prism/mcp-server/data/state/cad-corpus-manifest.json
H:/prism/mcp-server/data/state/cad-corpus-prevalence-report.json
H:/prism/mcp-server/data/state/cad-corpus-step-geometry-report.json
H:/prism/mcp-server/data/training/cam-unified-corpus.json
H:/prism/mcp-server/data/valida
... [+1492 chars truncated]

### User | 2026-05-26T15:39:54.846Z

[tool_result] H:/prism/state/shared/cad-tribal-corpus.jsonl  21.7K
H:/prism/state/shared/cam-tribal-corpus.jsonl  580.0K
---
21 cad-tribal-corpus.jsonl
598 cam-tribal-corpus.jsonl
Σ 619

### Assistant | 2026-05-26T15:39:58.829Z

Graph context noted. Now sizing top state files and counting corpus dirs.

### Assistant | 2026-05-26T15:40:04.359Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:40:04.545Z

[tool_use: Glob]

### User | 2026-05-26T15:41:12.862Z

[tool_result] ===CAD-CORPUS-STATE===
 
 
 
 
 
===CAM-TRAIN===
 
===CADCAM-CONSOL===
 
 
===CAD-FUNC-COUNT===
45
===CAM-FUNC-COUNT===
128
===FUSION-COUNT===
1
===HMILL-COUNT===
1
===HMILL-EXTRACTED===
1

### User | 2026-05-26T15:41:38.572Z

[tool_result] mcp-server\data\cad-functions\fusion360\assembly-operations.json
mcp-server\data\cad-functions\fusion360\drawing-operations.json
mcp-server\data\cad-functions\fusion360\feature-operations.json
mcp-server\data\cad-functions\fusion360\function-index.json
mcp-server\data\cad-functions\fusion360\mesh-operations.json
mcp-server\data\cad-functions\fusion360\modify-operations.json
mcp-server\data\cad-fun
... [+2469 chars truncated]

### Assistant | 2026-05-26T15:41:42.203Z

Acknowledged. I have sufficient data. Sizing top state files via Node for cross-shell reliability.

### Assistant | 2026-05-26T15:41:48.761Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:41:48.947Z

[tool_use: Glob]

### User | 2026-05-26T15:42:17.357Z

[tool_result] 4.93MB cad-corpus-manifest-recovered.json
4.92MB cad-corpus-manifest.json
0.33MB cad-pipeline-knowledge-index.json
0.25MB cadcam-training-corpus-augmentation.json
0.22MB cadcam-consolidated-corpus.json
0.17MB cam-unified-corpus.json
0.10MB cam-vendor-catalog-augmentation.json
0.04MB cad-corpus-insights.json
0.02MB cad-pipeline-coverage-LATEST.json
0.01MB cad-corpus-prevalence-report.json
0.01MB ca
... [+70 chars truncated]

### User | 2026-05-26T15:42:46.620Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-26T15:43:48.043Z

I have sufficient data to compile the report. The CAM functions dir has 128 files across 26 vendor subdirs (already known via `find`). Finalizing report.

# Agent A7 — CAD + 6 CAM Bridges Physical Accounting

## CAD engines (~100+ files, sample exhaustive)
`mcp-server/src/engines/*CAD*.ts` returned 100+ matches (truncated). Categorized:
- **Vendor execution bridges:** `Fusion360CADGeneratorAdapter`, `SolidWorksCADExecutionBridge`, `InventorCADExecutionBridge`, `MastercamCADExecutionBridge`, `HyperCADCADExecutionBridge`, `EspritCADExecutionBridge`
- **Vendor function indexes:** `Fusion360CADFunctionIndexEngine`, `InventorCADFunctionIndexEngine`, `MastercamCADFunctionIndexEngine`, `HyperCADCADFunctionIndexEngine`, `SolidWorksCADFunctionIndexEngine`
- **CAD core orchestration:** `CADKernelEngine`, `CADSystemRouterEngine`, `MasterCADControlBrainEngine`, `CADAdapterRegistry`, `CADAutomationRouter`, `CADAIStateMachineEngine`, `CADIntentDecomposerEngine`, `CADOperationPlannerEngine`, `PrintToAllCADsOrchestrator`, `BlueprintToAllCADsOrchestratorEngine`, `PrintToCADOrchestratorEngine`
- **CAD AI/ML stack:** `NeuralCADGenerationEngine`, `BlueprintToCADGenerationEngine`, `TextToCADGenerationEngine`, `CADTokenRepresentationEngine`, `CADCorpusIngesterEngine`, `CADSequenceTrainerEngine`, `CADFeatureEmbeddingEngine`, `CADRetrievalAugmentationEngine`, `CADGeometricAugmentationEngine`, `CADFeatureClassifierEngine`, `CADParameterPredictorEngine`, `CADEmbeddingIndexOrchestratorEngine`, `CADTrainingPipelineOrchestratorEngine`, `CADTrialErrorLearningEngine`, `CADCorpusPatternEngine`
- **CAD storage/governance:** `CADContentAddressableStoreEngine`, `CADAssemblyGraphEngine`, `CADRevisionDetectorEngine`, `CADTenantNamespaceEngine`, `CADAccessControlRBACABACEngine`, `CADReplicationDurabilityEngine`, `CADBundleSigningVersioningEngine`, `CADPluginMTLSSecurityEngine`, `CADPluginTamperAuditLogEngine`
- **HyperCAD specifics:** `HyperCADSAutomationEngine`, `HyperCADSCodeGeneratorEngine`, `HyperCA
... [+7994 chars truncated]
