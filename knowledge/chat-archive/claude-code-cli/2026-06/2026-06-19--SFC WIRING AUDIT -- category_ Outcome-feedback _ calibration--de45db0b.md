---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Outcome-feedback / calibration-persist / tri-compa"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.833Z"
last_ts: "2026-06-19T15:12:17.915Z"
cwd: "H:\\prism"
messages: 88
user_msgs: 39
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a258a45d43475021b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Outcome-feedback / calibration-persist / tri-compa

> **claude-code-cli** | 2026-06-19 | 88 msgs (39 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a258a45d43475021b.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.833Z

SFC WIRING AUDIT -- category: Outcome-feedback / calibration-persist / tri-compare / vendor-parity / proven-aggregator.
The SFC calc path = these 3 orchestrators (all H:/prism/mcp-server/src/engines/):
  - UltimateSpeedFeedEngine.ts (core calculate(); 31 models; the physics hub)
  - SpeedFeedNineAxisOrchestratorEngine.ts (9-axis run(); clamps; ROI popup)
  - SpeedFeedOrchestratorEngine.ts (central hub ~2851 LOC, 67 integration points)
plus the dispatcher (src/tools/dispatchers/calcDispatcher.ts speed_feed / sfc_* / ultimate_speed_feed actions) and REST (src/routes createSfcRouter -> /api/v1/sfc) + web (web/src/types/sfc.ts).

WIRING DEFINITION: an engine/algorithm is WIRED into the SFC iff its exported singleton/class is imported AND CALLED by one of the 3 orchestrators above (grep its export name in those files and confirm a call site, not just an import), OR it is reachable via a prism_calc speed_feed/sfc_*/ultimate_speed_feed dispatcher action. CLASSIFY each asset:
  - WIRED: consumed in the SFC calc path (cite the call site file:line).
  - UNWIRED-BUT-APPLICABLE: physically relevant to a speed/feed recommendation but NOT consumed by any SFC orchestrator or SFC dispatcher action -> a functional gap; say WHERE it should wire.
  - DEAD/NA: not SFC-applicable (lathe-toolpath-only, post-processor-only, EDM, business) OR a stub/duplicate -> exclude with one-line reason.
Be exact with file:line. Mechanical grep + classify; flag judgment calls for synthesis.

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "Calibration|OutcomeFeedback|TriComparator|TriVendor|Baseline|Vendor|ProvenSpeedFeed|DriftCanary|MultiHypothesis|GWizard|HSMAdvisor" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site
... [+324 chars truncated]

### Assistant | 2026-06-19T15:06:24.115Z

I'll systematically enumerate all matching assets and verify actual call sites in the three orchestrators. Let me run parallel searches.

### Assistant | 2026-06-19T15:06:25.761Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:27.239Z

[tool_use: Bash]

### User | 2026-06-19T15:06:40.662Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:06:47.280Z

[tool_result] <persisted-output>
Output too large (54.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bf43bx422.txt

Preview (first 2KB):
H:/prism/mcp-server/src/algorithms/ABCClassificationFormula.ts
H:/prism/mcp-server/src/algorithms/AdaptiveControllerModel.ts
H:/prism/mcp-server/src/algorithms/AntColonyTSP.ts
H:/prism/mcp-server/src/algor
... [+1765 chars truncated]

### Assistant | 2026-06-19T15:06:50.151Z

Let me read the full grep results and get the imports from all 3 orchestrators in parallel.

### Assistant | 2026-06-19T15:06:52.063Z

[tool_use: Read]

### User | 2026-06-19T15:06:56.168Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-612 of 913 total (31666 tokens, cap 25000). Call Read with offset=613 limit=612 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	H:/prism/mcp-server/src/algorithms/ABCClassificationFormula.ts
2	H:/prism/mcp-server/src/algorithms/Adapti
... [+40513 chars truncated]

### Assistant | 2026-06-19T15:06:56.863Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:57.122Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:57.313Z

[tool_use: Bash]

### User | 2026-06-19T15:07:06.523Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:07:06.896Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:07:11.955Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:07:15.988Z

The import grep returned no output — likely a path issue on Windows. Let me fix the approach and get imports + the full file list at once.

### Assistant | 2026-06-19T15:07:17.165Z

[tool_use: Read]

### Assistant | 2026-06-19T15:07:18.507Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:19.534Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:19.958Z

[tool_use: Bash]

### User | 2026-06-19T15:07:24.540Z

[tool_result] 613	H:/prism/mcp-server/src/engines/SFCMultiHypothesisRankerEngine.ts
614	H:/prism/mcp-server/src/engines/SFCOutcomeCaptureWireEngine.ts
615	H:/prism/mcp-server/src/engines/SFCProvenanceWireEngine.ts
616	H:/prism/mcp-server/src/engines/SFCRAGWarmStartEngine.ts
617	H:/prism/mcp-server/src/engines/SPCFeedbackLoopEngine.ts
618	H:/prism/mcp-server/src/engines/SVIEnhancedCalculatorEngine.ts
619	H:/pris
... [+18590 chars truncated]

### User | 2026-06-19T15:07:33.872Z

[tool_result] grep: H:/prism/mcp-server/src/engines/speed-feed/SpeedFeedNineAxisOrchestratorEngine.ts: No such file or directory

### User | 2026-06-19T15:07:34.102Z

[tool_result] grep: H:/prism/mcp-server/src/engines/speed-feed/UltimateSpeedFeedEngine.ts: No such file or directory

### User | 2026-06-19T15:07:35.067Z

[tool_result] grep: H:/prism/mcp-server/src/engines/speed-feed/SpeedFeedOrchestratorEngine.ts: No such file or directory

### Assistant | 2026-06-19T15:07:38.954Z

The grep found the files exist at the root engines path, not in a speed-feed subfolder. Let me use Windows paths correctly.

### Assistant | 2026-06-19T15:07:39.771Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:40.763Z

[tool_use: Bash]

### User | 2026-06-19T15:07:49.334Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### User | 2026-06-19T15:07:50.521Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-06-19T15:07:52.627Z

Windows paths need backslash escaping. Let me use PowerShell for this.

### Assistant | 2026-06-19T15:07:53.535Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:07:54.028Z

[tool_use: PowerShell]

### User | 2026-06-19T15:07:56.749Z

[tool_result] AutoSpeedFeedCalculatorEngine.ts
AutoSpeedFeedEngine.ts
CAMSpeedFeedBridgeEngine.ts
CrossProcessSpeedFeedBridge.ts
HeatTreatmentAwareSpeedFeedEngine.ts
LatheSpeedFeedCalculatorFacadeEngine.ts
LatheSpeedFeedDeepLearningAdvisorEngine.ts
LatheSpeedFeedReasoningBridgeEngine.ts
LatheSpeedFeedShopAwareTuningEngine.ts
MachineAwareSpeedFeedEngine.ts
ProvenSpeedFeedAggregatorEngine.ts
SpeedFeedA
... [+834 chars truncated]

### User | 2026-06-19T15:07:59.136Z

[tool_result] H:\PRISM\mcp-server\src\engines\UltimateSpeedFeedEngine.ts

### Assistant | 2026-06-19T15:08:02.249Z

All three orchestrators are in `H:\prism\mcp-server\src\engines\` (flat). Now let me get their imports and check each matched asset's call sites in parallel.

### Assistant | 2026-06-19T15:08:03.410Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:08:04.195Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:08:04.934Z

[tool_use: PowerShell]

### User | 2026-06-19T15:08:06.234Z

[tool_result] Exit code 1
[31;1mhead: [31;1mThe term 'head' is not recognized as a name of a cmdlet, function, script file, or executable program.[0m
[31;1m[31;1mCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.[0m

### User | 2026-06-19T15:08:08.802Z

[tool_result] import {
import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";
import { speedFeedOutcomeFeedbackBridgeEngine } from "./SpeedFeedOutcomeFeedbackBridgeEngine.js";

### system

... [8 middle messages omitted -- see raw_file] ...

### User | 2026-06-19T15:08:51.730Z

[tool_result] === ORCH(SpeedFeedOrchestratorEngine.ts) ===

[32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
        39 import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";
      2164       const { provenSpeedFeedAggregatorEngine } = require("./ProvenSpeedFeedAggregatorEng…
      2170       const proven = provenSpeedFeedAggregatorEngine.getProvenParams(materialGro
... [+502 chars truncated]

### User | 2026-06-19T15:08:56.126Z

[tool_result] [32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
       970   // -- QS-MS6 P2: Physics Auto-Calibration --
      1052   // (context-aware default RPM/feed/DOC/WOC/coolant — NOT Kienzle/Taylor; SFM baselines).
      1057   // R12-safe wire — exposes calibration/training status, NOT inference (L1 NN has random…
      1063   // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-
... [+4976 chars truncated]

### Assistant | 2026-06-19T15:09:00.640Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:09:04.651Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:05.731Z

[tool_result] [32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
      3509           sink: "SpeedFeedDeepLearningEngine.recordFeedback → SFCOutcomeCaptureWireEngine…

### User | 2026-06-19T15:09:07.434Z

[tool_result] [32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
      1068   // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SFCMultiHypothesisRankerEngine carried…
      1115   // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR (2026-06-08, slot:oscar): SpeedFeedTriCompa…
      1128   // OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST (2026-06-08, slot:oscar): SpeedFeedCalibrati…
      1153   
... [+4688 chars truncated]

### Assistant | 2026-06-19T15:09:12.143Z

Good — now I have the dispatcher call sites. Let me get the remaining ones for HSMAdvisor/GWizard export and the SpeedFeedBaselineComparatorEngine, plus check SFCOutcomeCaptureWireEngine, SFCDriftCanaryEngine, SFCFewShotNewMaterialEngine, SFCProvenanceWireEngine, SFCRAGWarmStartEngine call sites.

### Assistant | 2026-06-19T15:09:14.671Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:09:17.103Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:19.436Z

[tool_result] [32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
     10256           // the live-baseline data source the SpeedFeedBaselineComparatorEngine
     10276             const { hsmAdvisorSettingsExportEngine } = await import(
     10277               "../../engines/HSMAdvisorSettingsExportEngine.js"
     10283                 ? hsmAdvisorSettingsExportEngine.writeSetting
... [+391 chars truncated]

### User | 2026-06-19T15:09:22.180Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-06-19T15:09:25.265Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:28.402Z

[tool_result] [32;1mLineNumber[0m[32;1m Line[0m
[32;1m----------[0m [32;1m----[0m
     10256           // the live-baseline data source the SpeedFeedBaselineComparatorEngine

### Assistant | 2026-06-19T15:09:30.836Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:32.899Z

[tool_result] NOT_FOUND SFCDriftCanaryEngine
NOT_FOUND SFCFewShotNewMaterialEngine
NOT_FOUND SFCInferenceGateWireEngine
NOT_FOUND SFCProvenanceWireEngine
NOT_FOUND SFCRAGWarmStartEngine
FOUND SpeedFeedBaselineComparatorEngine -> calcDispatcher.ts:10256
FOUND StratifiedCalibrationEngine -> calcDispatcher.ts:6996
FOUND SpeedFeedCalibrationPersistEngine -> calcDispatcher.ts:1128 | calcDispatcher.ts:9869 | c
... [+183 chars truncated]

### Assistant | 2026-06-19T15:09:36.755Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:09:38.074Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:42.568Z

[tool_result] 10256:           // the live-baseline data source the SpeedFeedBaselineComparatorEngine

### User | 2026-06-19T15:09:44.821Z

[tool_result] 6996:             const { StratifiedCalibrationEngine: SCE } = await import("../../engines/StratifiedCalibrationEngine.js");

### Assistant | 2026-06-19T15:09:48.793Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:09:49.838Z

[tool_use: PowerShell]

### User | 2026-06-19T15:09:51.782Z

[tool_result] 6981:               fleet_learning: "fleetLearning",
6982:               anomaly_guard: "anomalyGuard",
6983:               time_weighted_calibrate: "timeWeightedCalibrate",
6984:               parse_cmm_export: "parseCMMExport",
6985:             };
6986:             result = (fpe as any)[fpeMap[action]](params as ValidatedParams);
6987:             break;
6988:           }
6989: 
6990: 
... [+1218 chars truncated]

### User | 2026-06-19T15:09:53.700Z

[tool_result] 10251:           // HSMAdvisor settings_v2.xml live-state adapter.
10252:           // Reads the operator's actual HSMAdvisor calculator state from disk
10253:           // (UTF-16 XML at %APPDATA%/HSMAdvisor/settings_v2.xml or env override
10254:           // PRISM_HSMADVISOR_SETTINGS_PATH) and returns the current Tool +
10255:           // computed Cut (sfm/ipt/mrr/rpm/feed) + Settings snaps
... [+1115 chars truncated]

### Assistant | 2026-06-19T15:09:58.248Z

[tool_use: PowerShell]

### User | 2026-06-19T15:10:00.643Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-06-19T15:10:04.311Z

[tool_use: PowerShell]

### User | 2026-06-19T15:10:07.725Z

[tool_result] NOT_FOUND VendorCatalogImport
NOT_FOUND VendorCatalogManifest
NOT_FOUND VendorCostIndex
NOT_FOUND VendorPerformance
NOT_FOUND VendorRealtimePricing
NOT_FOUND VendorTurningCatalog

### Assistant | 2026-06-19T15:10:19.530Z

[tool_use: PowerShell]

### User | 2026-06-19T15:10:21.155Z

[tool_result] NOT_FOUND AdaptiveCalibration
NOT_FOUND BayesianAdaptive
NOT_FOUND CAMBaselineRegressor
NOT_FOUND CAMConfidenceCalibration
FOUND CalibratedSimulation -> calcDispatcher.ts:10564
FOUND CalibrationEngine -> calcDispatcher.ts:6996
NOT_FOUND CascadeCalibration
NOT_FOUND ConformalCalibrationMonitor
NOT_FOUND CrossProcessCalibrationAuditor
NOT_FOUND CrossProcessDriftAwareFederation
NOT_FOUND Go
... [+423 chars truncated]

### Assistant | 2026-06-19T15:10:26.744Z

[tool_use: PowerShell]

### Assistant | 2026-06-19T15:10:27.341Z

[tool_use: PowerShell]

### User | 2026-06-19T15:10:29.657Z

[tool_result] 10559:             const p = params as any;
10560:             result = { success: true, data: (mod as any).physicsPrediction?.(p.action ?? "surface_integrity", p) ?? { engine: "PhysicsPredictionEngine", note: "method not callable" } };
10561:             break;
10562:           }
10563:           case "calibrated_simulation_calc": {
10564:             const { calibratedSimulationEngine } = a
... [+1102 chars truncated]

### User | 2026-06-19T15:10:32.375Z

[tool_result] 7013: 
7014:           // ── Prediction Feedback Orchestrator ──
7015:           case "submit_measurement": case "learned_prediction":
7016:           case "batch_import_measurements": case "machine_intelligence":
7017:           case "compare_and_learn": case "system_learning_status": {
7018:             const { PredictionFeedbackOrchestratorEngine: PFO } = await import("../../engines/Predic
... [+1453 chars truncated]

### Assistant | 2026-06-19T15:10:36.591Z

I have enough data to classify all assets. Let me now verify the SFC-applicability of the remaining NOT_FOUND engines to determine DEAD/NA vs UNWIRED-BUT-APPLICABLE, then compile the final table.

### Assistant | 2026-06-19T15:10:48.689Z

[tool_use: PowerShell]

### User | 2026-06-19T15:10:50.375Z

[tool_result] [31;1mGet-Content: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m  39 | [0m     $content = [36;1mGet-Content $f -TotalCount 30 -Raw[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe 'Raw' and 'TotalCount' parameters cannot be specified in t
... [+14109 chars truncated]

### Assistant | 2026-06-19T15:10:53.636Z

I have sufficient data from all the verified call sites. Let me do one final targeted read to classify the SFC-specific orphans, then compile the full table.

### Assistant | 2026-06-19T15:11:05.110Z

[tool_use: PowerShell]

### User | 2026-06-19T15:11:06.970Z

[tool_result] SFCDriftCanaryEngine: /** |  * SFCDriftCanaryEngine — U-PPG-SFC-11
SFCFewShotNewMaterialEngine: /** |  * SFCFewShotNewMaterialEngine — U-PPG-SFC-13
SFCInferenceGateWireEngine: // WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher | /**
SFCProvenanceWireEngine: // WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher 
... [+2569 chars truncated]

### Assistant | 2026-06-19T15:12:17.915Z

I now have all the data needed. Compiling the final table.

**Enumeration:** 50 total assets matched the category grep across engines + algorithms + physics.

**Wiring status determined from verified call sites:**

**WIRED** (imported AND called in an SFC orchestrator or SFC dispatcher action):
- `ProvenSpeedFeedAggregatorEngine` — SpeedFeedOrchestratorEngine.ts:2170 (lazy require + call) AND calcDispatcher.ts:9976–10022 (4 actions: aggregateLatheData/aggregateMillData/getProvenParams/exportForSpeedFeed)
- `SFCOutcomeCaptureWireEngine` — SpeedFeedOrchestratorEngine.ts:3509 (sink in deep-learning recordFeedback chain); calcDispatcher.ts comment references it as the terminal sink — **judgment call**: the line 3509 reference is in a comment string, not a direct call site. Marking UNWIRED-BUT-APPLICABLE (the comment documents an intended wire that is not a direct import+call).
- `SpeedFeedOutcomeFeedbackBridgeEngine` — SpeedFeedNineAxisOrchestratorEngine.ts:69 (import) + :680 (`.capture()` call); calcDispatcher.ts:9491+9503+9511 (recordActuals/stats actions)
- `CrossProcessOutcomeStore` — SpeedFeedOrchestratorEngine.ts:39 (import as type only — `import type`) — type-only imports are NOT call sites. Marking UNWIRED-BUT-APPLICABLE.
- `SpeedFeedTriComparatorEngine` — calcDispatcher.ts:9806+9808 (`speedFeedTriComparatorEngine.run()` under `speed_feed_tri_compare` action)
- `SpeedFeedCalibrationPersistEngine` — calcDispatcher.ts:9874+9881 (`buildFromLedgerFile()` under `speed_feed_calibration_persist` action)
- `HSMAdvisorAdapterEngine` — calcDispatcher.ts:10263–10266 (`.read()` under `hsmadvisor_read_current_state`)
- `HSMAdvisorSettingsExportEngine` — calcDispatcher.ts:10276–10284 (`.writeSettings()/.export()` under `hsmadvisor_export_settings`)
- `HSMAdvisorComparatorBridgeEngine` — calcDispatcher.ts:10307–10310 (`.run()` under `hsmadvisor_compare`)
- `GWizardAdapterEngine` — calcDispatcher.ts:10318–10321 (`.read()` under `gwizard_read_toolcrib`)
- `GWizardToolCribExportE
... [+12164 chars truncated]
