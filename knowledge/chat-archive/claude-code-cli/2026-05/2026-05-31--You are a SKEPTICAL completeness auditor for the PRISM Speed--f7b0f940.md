---
type: "chat-session"
source: "claude-code-cli"
session_id: "f7b0f940-61e9-4d5b-812e-205ca34b8a84"
title: "You are a SKEPTICAL completeness auditor for the PRISM Speed-Feed Calculator (SF"
date: "2026-05-31"
first_ts: "2026-05-31T04:38:41.268Z"
last_ts: "2026-05-31T04:56:24.209Z"
cwd: "H:\\prism-slot-oscar"
messages: 72
user_msgs: 28
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/workflows/wf_b354a2ff-601/agent-adf329e1ee1c76105.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# You are a SKEPTICAL completeness auditor for the PRISM Speed-Feed Calculator (SF

> **claude-code-cli** | 2026-05-31 | 72 msgs (28 user / 44 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/workflows/wf_b354a2ff-601/agent-adf329e1ee1c76105.jsonl`

## Transcript

### User | 2026-05-31T04:38:41.268Z

You are a SKEPTICAL completeness auditor for the PRISM Speed-Feed Calculator (SFC, slot "oscar"), galaxy mcp-server/src/engines/speed-feed/. Goal: a complete, testable, sellable SFC with closed-loop learning. Enumerate the ENTIRE gap set for your axis — do NOT prune to "top 3". For each gap give a proposed unit id, one-line why, depends_on, blocks, effort S/M/L, owner slot, priority P0-P3, and exists_partial (what's already built — run a quick grep/read to avoid proposing duplicates; cite real engine/file names). Start surfaces: speed-feed/{MEMORY,PATHS,TOOLBELT,CLAUDE,SFC-AWARENESS}.md, mcp-server/src/physics/constants.ts, prism_calc SFC actions in calcDispatcher.ts. Use Grep/Glob/Read efficiently. Return ONLY the structured object.

AXIS = WIRING / ORPHANS / DISPATCHER COVERAGE. Find every unwired or dangling SFC asset. BUILD_STATE reports ~5 unwired "Speed" engines. Enumerate: SFC engines on disk with NO dispatcher reference (orphans), built-but-dangling consumers (e.g. SFCParameterRefinementEngine not wired into speedFeedNineAxisOrchestratorEngine; SpeedFeedDeepLearningEngine.recordFeedback has no ingestion action; SpeedFeedPSNDecisionPriorEngine not invoked by predict path), prism_calc SFC actions that exist vs engines that SHOULD be exposed, and any action enum / schema / lazy-import mismatches. Cite each orphan + its natural dispatcher.

### Assistant | 2026-05-31T04:38:53.069Z

I'll audit the WIRING/ORPHANS/DISPATCHER COVERAGE axis for the SFC galaxy. Let me start by examining the key surfaces and then systematically trace each asset's wiring status.

### Assistant | 2026-05-31T04:38:54.915Z

[tool_use: Bash]

### Assistant | 2026-05-31T04:38:55.546Z

[tool_use: Glob]

### User | 2026-05-31T04:39:07.619Z

[tool_result] No files found

### User | 2026-05-31T04:39:21.307Z

[tool_result] H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/CLAUDE.md  13.7K
H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/GSD.md  5.2K
H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/MEMORY.md  7.2K
H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/PATHS.md  8.2K
H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/SFC-AWARENESS.md  5.0K
H:/prism-slot-oscar/mcp-server/src/engines/spe
... [+125 chars truncated]

### Assistant | 2026-05-31T04:39:24.620Z

The engines aren't in the speed-feed subdirectory. Let me find where the SFC engines actually live and read the key surfaces.

### Assistant | 2026-05-31T04:39:25.097Z

[tool_use: Glob]

### Assistant | 2026-05-31T04:39:25.581Z

[tool_use: Glob]

### Assistant | 2026-05-31T04:39:26.044Z

[tool_use: Read]

### User | 2026-05-31T04:39:31.695Z

[tool_result] mcp-server\src\engines\SFCCalculateEngine.ts
mcp-server\src\engines\SFCCompareEngine.ts
mcp-server\src\engines\SFCDriftCanaryEngine.ts
mcp-server\src\engines\SFCFewShotNewMaterialEngine.ts
mcp-server\src\engines\SFCInferenceGateWireEngine.ts
mcp-server\src\engines\SFCMultiHypothesisRankerEngine.ts
mcp-server\src\engines\SFCOptimizeEngine.ts
mcp-server\src\engines\SFCOutcomeCaptureWireEngine.ts
mcp
... [+149 chars truncated]

### User | 2026-05-31T04:39:32.180Z

[tool_result] 1	# Speed-Feed (SFC) Galaxy — PATHS.md (H:/-wide path atlas for slot:oscar)
2	
3	> THE highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for slot:oscar.
4	> Format: `<absolute-path> | <purpose> | <maintainer-slot>`. Verify mtime before trusting a stale row.
5	> Engines live FLAT at `mcp-server/src/engines/` — there is no per-engine `speed-feed/` subdir (this dir is the doctrin
... [+8239 chars truncated]

### User | 2026-05-31T04:39:34.871Z

[tool_result] mcp-server\src\engines\CAMSpeedFeedBridgeEngine.ts
mcp-server\src\engines\LatheSpeedFeedCalculatorFacadeEngine.ts
mcp-server\src\engines\LatheSpeedFeedDeepLearningAdvisorEngine.ts
mcp-server\src\engines\LatheSpeedFeedReasoningBridgeEngine.ts
mcp-server\src\engines\LatheSpeedFeedShopAwareTuningEngine.ts
mcp-server\src\engines\ProvenSpeedFeedAggregatorEngine.ts
mcp-server\src\engines\SpeedFeedAdvanc
... [+1335 chars truncated]

### Assistant | 2026-05-31T04:39:38.713Z

I have the engine inventory. Now let me grep the dispatchers to determine wiring status for each SFC engine. Let me look at the SFC-specific engines and the key dangling consumers named in the task.

### Assistant | 2026-05-31T04:39:40.612Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:39:43.098Z

[tool_use: Grep]

### User | 2026-05-31T04:39:55.041Z

[tool_result] mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:2
mcp-server\src\tools\dispatchers\calcDispatcher.ts:4

Found 6 total occurrences across 2 files.

### User | 2026-05-31T04:39:57.527Z

[tool_result] mcp-server\src\tools\dispatchers\camDispatcher.ts:1
mcp-server\src\tools\dispatchers\calcDispatcher.ts:21

Found 22 total occurrences across 2 files.

### Assistant | 2026-05-31T04:40:00.983Z

Let me get the exact dispatcher references per engine. I need to see which specific engines are wired and which are orphaned.

### Assistant | 2026-05-31T04:40:02.465Z

[tool_use: Grep]

### User | 2026-05-31T04:40:19.809Z

[tool_result] 30: * @param action - The calc action name (e.g. "cutting_force", "tool_life", "speed_feed")
42:    case "speed_feed":
570:  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
824:  "stepover_calc", "ultimate_speed_feed", "tool_selection_advice",
915:  // -- SFC-ACCURACY-MS1 Iter 4+5: parameter-cascade auto-adjust + pareto recommender --
1038:  // -- SFC: Surface Finish C
... [+9375 chars truncated]

### Assistant | 2026-05-31T04:40:26.109Z

Now let me see the rest of the SFC dispatcher actions and check the SFC* engines that returned 0 hits. Let me get the remaining dispatcher content and check each SFC engine specifically.

### Assistant | 2026-05-31T04:40:26.979Z

[tool_use: Grep]

### User | 2026-05-31T04:40:34.436Z

[tool_result] 9129:              "../../engines/SpeedFeedNineAxisOrchestratorEngine.js"
9131:            const { speedFeedPropagationBridgeEngine } = await import(
9132:              "../../engines/SpeedFeedPropagationBridgeEngine.js"
9134:            const p = params as Parameters<typeof speedFeedNineAxisOrchestratorEngine.run>[0];
9135:            const r = speedFeedNineAxisOrchestratorEngine.run(p);
9136:   
... [+8322 chars truncated]

### Assistant | 2026-05-31T04:40:40.588Z

Now I have a clear picture of what's wired in calcDispatcher. Let me check the remaining SFC engines that returned 0 hits in dispatchers — the orphans — and verify the specific dangling consumers named in the task. Let me check each SFC* engine and the aiReasoningDispatcher references.

### Assistant | 2026-05-31T04:40:44.367Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:40:45.801Z

[tool_use: Grep]

### User | 2026-05-31T04:40:49.888Z

[tool_result] Found 4 files
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\tools\dispatchers\dataDispatcher.ts

### User | 2026-05-31T04:40:52.046Z

[tool_result] 488:    const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
489:    return speedFeedOrchestratorEngine.consultNeuralPredictor(params);
791:      // PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-LEARN-CAM-SFC. OutcomeFeedbackOverride
793:      // per-domain override map that downstream CAM/SFC engines consult
1063:      // sfc_drift_canary_check — SFC drift detec
... [+518 chars truncated]

### Assistant | 2026-05-31T04:40:55.929Z

Let me get the exact actions for the SFC* engines in aiReasoningDispatcher (drift-canary, few-shot, RAG, multi-hypothesis, inference-gate, etc.) and check which SFC* engines are truly orphaned. Let me also verify the dangling-consumer claims internally.

### Assistant | 2026-05-31T04:40:59.243Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:41:01.247Z

[tool_use: Grep]

### User | 2026-05-31T04:41:17.299Z

[tool_result] 1063:      // sfc_drift_canary_check — SFC drift detection
1065:      case "sfc_drift_canary_check": {

### User | 2026-05-31T04:41:26.793Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-31T04:41:30.782Z

The aiReasoningDispatcher only wires `sfc_drift_canary_check`, `sfc_few_shot`, and the closed-loop. Let me check the full picture across ALL dispatchers for the SFC* engines and verify which are truly orphaned. Let me search for the action names of these engines across the whole dispatcher dir efficiently.

### Assistant | 2026-05-31T04:41:34.610Z

[tool_use: Bash]

### User | 2026-05-31T04:41:44.265Z

[tool_result] === individual counts ===
SFCMultiHypothesisRankerEngine: 0 dispatcher files
SFCInferenceGateWireEngine: 0 dispatcher files
SFCRAGWarmStartEngine: 0 dispatcher files
SFCCompareEngine: 0 dispatcher files
SFCOptimizeEngine: 0 dispatcher files
SFCProvenanceWireEngine: 0 dispatcher files
SFCOutcomeCaptureWireEngine: 0 dispatcher files
SFCParameterRefinementEngine: 0 dispatcher files
SpeedFeedShopLibra
... [+134 chars truncated]

### Assistant | 2026-05-31T04:41:48.854Z

Strong signal — 11 engines have ZERO dispatcher references. But the aiReasoningDispatcher matched some via lowercase singleton names. Let me verify whether these are wired via singleton (lowercase) or instance names, and check how SFCDriftCanary/FewShot are actually invoked vs these. Let me check exports and singleton naming patterns.

### Assistant | 2026-05-31T04:41:51.693Z

[tool_use: Bash]

### Assistant | 2026-05-31T04:41:56.375Z

[tool_use: Bash]

### User | 2026-05-31T04:41:59.079Z

[tool_result] === lowercase singleton refs across ALL dispatchers ===
sfcMultiHypothesisRankerEngine: 0
sfcInferenceGateWireEngine: 0
sfcRAGWarmStartEngine: 0
sfcRagWarmStartEngine: 0
sfcCompareEngine: 0
sfcOptimizeEngine: 0
sfcProvenanceWireEngine: 0
sfcOutcomeCaptureWireEngine: 0
sfcParameterRefinementEngine: 0
speedFeedShopLibraryBridgeEngine: 0
speedFeedPDFCorpusBridgeEngine: 0
speedFeedCatalogJoinerEngine:
... [+57 chars truncated]

### User | 2026-05-31T04:42:17.229Z

[tool_result] === export style + LOC per orphan-candidate ===
SFCMultiHypothesisRankerEngine (711 LOC): export const HypothesisSourceSchema = z.enum([;export const CandidateHypothesisSchema = z.object({;export const SFCMultiHypothesisRankerInputSchema = z.object({;
SFCInferenceGateWireEngine (280 LOC): export class SFCInferenceGateWireEngine {;export const sfcInferenceGateWireEngine = new SFCInferenceGateWireEn
... [+1722 chars truncated]

### Assistant | 2026-05-31T04:42:22.350Z

Confirmed: 11 substantial engines (all with real exports/singletons, 213-711 LOC) have ZERO dispatcher references across the entire codebase. These are genuine orphans. Now let me verify the dangling-consumer claims from the task: (1) SFCParameterRefinementEngine not wired into the nine-axis orchestrator, (2) SpeedFeedDeepLearningEngine.recordFeedback has no ingestion action, (3) SFCMultiHypothesisRanker/RAGWarmStart/InferenceGate not invoked by the predict path. Let me check cross-engine usage and the recordFeedback ingestion gap.

### Assistant | 2026-05-31T04:42:25.665Z

[tool_use: Bash]

### Assistant | 2026-05-31T04:42:27.498Z

[tool_use: Bash]

### User | 2026-05-31T04:45:32.159Z

[tool_result] === cross-engine consumers (in engines dir, excluding self+test) ===
--- SFCParameterRefinementEngine consumed by:
./speed-feed/sfc-knowledge-index.json
./speed-feed/SFC-KNOWLEDGE-INDEX.md
--- SFCMultiHypothesisRankerEngine consumed by:
./SFCRAGWarmStartEngine.ts
./speed-feed/sfc-knowledge-index.json
./speed-feed/SFC-KNOWLEDGE-INDEX.md
--- SFCRAGWarmStartEngine consumed by:
./SFCMultiHypothesisRan
... [+1304 chars truncated]

### User | 2026-05-31T04:51:04.827Z

[tool_result] Command running in background with ID: bxxbdxs3i. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\576f56ee-21b3-4844-a410-188793262aff\tasks\bxxbdxs3i.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-31T04:51:17.304Z

Very informative. The orphan cluster forms an internal mini-graph (RAG↔Ranker↔Provenance↔InferenceGate↔OutcomeCapture) but NONE of them reach a dispatcher. SFCOutcomeCaptureWire IS consumed by SpeedFeedOrchestratorEngine + SfcDatabaseRegistry + ParameterRefinement (so it has engine consumers but no dispatcher action). Let me check the recordFeedback result and verify the nine-axis orchestrator does NOT use ParameterRefinement, plus check the predict path.

### Assistant | 2026-05-31T04:51:18.934Z

[tool_use: Read]

### Assistant | 2026-05-31T04:51:20.643Z

[tool_use: Bash]

### User | 2026-05-31T04:51:38.540Z

[tool_result] 1	=== recordFeedback in SpeedFeedDeepLearningEngine ===
2	rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3	23 matches in 12 files:
4	
5	1207:0:"recordFeedback",
6	1218:0:the AI ladder
7	1241:0:{ total_feedback: number; calibrated: boolean; avg_errors: Record<string, num...
8	1252:0:number;
9	1257:0:this.selfLearning.getStats().total_feedback,
10	46
... [+560 chars truncated]

### User | 2026-05-31T04:51:41.946Z

[tool_result] === NineAxis orchestrator: does it import ParameterRefinement/MultiHyp/RAG/InferenceGate? ===
60:// SpeedFeedDeepLearningEngine can fold actuals back into calibrationFactors.
=== recordFeedback def in DL ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
7 matches in 3 files:

1207:0:"recordFeedback",
469:0:FeedbackEntry): void {
SpeedFeedDeepLearn
... [+406 chars truncated]

### Assistant | 2026-05-31T04:51:48.188Z

Confirmed key dangling findings:
- `SpeedFeedDeepLearningEngine.recordFeedback` (line 1172) exists but is NOT called by any dispatcher action — the only wired DL action is `getSelfLearningStats`/`stats` (introspection only). No ingestion action exists.
- The NineAxis orchestrator does NOT import ParameterRefinement, MultiHypothesis, RAGWarmStart, or InferenceGate — confirms those are dangling from the real recommendation path.

Let me verify the PSNDecisionPrior wiring claim (the task says it's "not invoked by predict path" but it IS wired as `sfc_psn_decision_prior`), and check the predict path (`consultNeuralPredictor`) and the SfcDatabaseRegistry domain count for any structural mismatch. Let me also confirm the SFCOutcomeCaptureWire/ProvenanceWire have no standalone action.

### Assistant | 2026-05-31T04:51:52.387Z

[tool_use: Bash]

### Assistant | 2026-05-31T04:51:54.259Z

[tool_use: Grep]

### User | 2026-05-31T04:52:04.946Z

[tool_result] 1063:      // sfc_drift_canary_check — SFC drift detection
1065:      case "sfc_drift_canary_check": {
1085:      // sfc_fewshot_predict — Few-shot material prediction
1087:      case "sfc_fewshot_predict": {
1088:        const { sfcFewShotNewMaterialEngine } = await import("../../engines/SFCFewShotNewMaterialEngine.js");
1093:          query_features: Parameters<typeof sfcFewShotNewMaterialEngine
... [+374 chars truncated]

### User | 2026-05-31T04:52:06.878Z

[tool_result] === predict path: consultNeuralPredictor — does it call PSNDecisionPrior/RAG/MultiHyp/InferenceGate? ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 3 files:

3550:0:unknown): {
3629:0:Schema for consultNeuralPredictor input. Lives at module scope
SpeedFeedOrchestratorEngine.ts:3563:const parsed = consultNeuralPredictorInputSchema.s
... [+1194 chars truncated]

### Assistant | 2026-05-31T04:52:11.891Z

This is the crucial detail. `SFCParameterRefinementEngine` is explicitly tagged `// WIRE-EXEMPT` — it names sibling unit `U-BRIDGE-LEARN-SFC-WIRE` as the wiring path, and it says the orchestrator refinement pass is "wired separately". This is the dangling-consumer gap: the engine exists, the orchestrator opt-in pass is NOT wired, and the named sibling unit hasn't shipped. Let me verify whether the orchestrator actually has the refinement pass wired, and check the `consultNeuralPredictor` predict path body for whether it uses RAG/MultiHyp.

### Assistant | 2026-05-31T04:52:13.360Z

[tool_use: Read]

### Assistant | 2026-05-31T04:52:17.927Z

[tool_use: Bash]

### User | 2026-05-31T04:52:31.674Z

[tool_result] 3540	   *
3541	   * Pure (no state mutation, no I/O); safe to call from any pipeline
3542	   * stage. NN errors are caught and reported as "unavailable" — callers
3543	   * MUST decide whether unavailable means proceed (degrade open) or
3544	   * block (degrade closed). This engine returns the signal; the policy
3545	   * lives at the call site.
3546	   *
3547	   * @param input  OutcomeRecord-shap
... [+1458 chars truncated]

### User | 2026-05-31T04:54:17.367Z

[tool_result] === orchestrator: any refinement-pass wiring to ParameterRefinement? ===
0
=== U-BRIDGE-LEARN-SFC-WIRE shipped anywhere? ===
H:/prism-slot-oscar/mcp-server/src/engines/SFCParameterRefinementEngine.ts
=== which dispatcher wires SpeedFeedMiner/Autopilot/Proven/Resource/MachineAware (already-wired set, confirm) ===
speed_feed_mine: 2
speed_feed_autopilot: 2
proven_speed_feed_query: 2
speed_feed_resou
... [+62 chars truncated]

### Assistant | 2026-05-31T04:54:23.171Z

Confirmed all key findings. The `consultNeuralPredictor` predict path uses `crossProcessNeuralLearningEngine` (not the SFC RAG/MultiHyp/InferenceGate cluster), and `machine_aware_speed_feed` returns 0 (it's wired under a different action name — let me note that). `auto_speed_feed_calc` etc. all confirmed wired. `U-BRIDGE-LEARN-SFC-WIRE` exists ONLY as the WIRE-EXEMPT comment — never shipped.

Let me do a final check: the MachineAware action name, and confirm the schema/enum mismatches by checking if any orphan has an action in the enum but no case (or vice versa). Let me also confirm `sfc_few_shot`/drift engines are fully wired (action + case).

### Assistant | 2026-05-31T04:54:27.899Z

[tool_use: Bash]

### User | 2026-05-31T04:54:46.901Z

[tool_result] === MachineAware actual action name ===
1138:  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MACHINE-AWARE (2026-05-21, slot:juliett): MachineAwareSpeedFeedEngine wire —
1144:  "machine_aware_constrain",
9837:          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MACHINE-AWARE (2026-05-21, slot:juliett): MachineAwareSpeedFeedEngine.constrain —
9843:          case "machine_aware_constrain": {
9844:     
... [+900 chars truncated]

### Assistant | 2026-05-31T04:54:50.654Z

`machine_aware_constrain` is the actual action — MachineAware IS wired. Lathe facade family all wired (1 dispatcher each). HeatTreatment wired. The drift/fewshot enum check returned empty — let me verify those actions are actually in an enum (potential enum-vs-case mismatch — a real wiring defect class). Let me check the aiReasoningDispatcher action enum.

### Assistant | 2026-05-31T04:54:53.290Z

[tool_use: Bash]

### User | 2026-05-31T04:55:08.172Z

[tool_result] === are sfc_drift_canary_check / sfc_fewshot_predict in the action enum/list (not just case)? ===
1063:      // sfc_drift_canary_check — SFC drift detection
1065:      case "sfc_drift_canary_check": {
1085:      // sfc_fewshot_predict — Few-shot material prediction
1087:      case "sfc_fewshot_predict": {
=== ppg sfc closed loop action enum ===
487:  xproc_neural_consult_speedfeed: async (params) 
... [+462 chars truncated]

### Assistant | 2026-05-31T04:55:20.929Z

I have enough to complete the audit. The aiReasoningDispatcher uses a `case` dispatch pattern (the action validation is likely centralized elsewhere via a registry, so the case-only membership is the wiring). `sfc_drift_canary_check`, `sfc_fewshot_predict`, `ppg_sfc_closed_loop`, `xproc_neural_consult_speedfeed` are all genuinely wired.

I now have a complete, verified picture. Let me synthesize the gap set.

**Verified wired SFC engines** (have dispatcher actions): UltimateSpeedFeed, SpeedFeedOrchestrator (10+ actions), NineAxisOrchestrator, BaselineComparator, PropagationBridge, DownstreamSubscriber, PSNDecisionPrior, ChatterStabilityAdapter, ExhaustiveCombination, OutcomeFeedbackBridge, TriVendorBatchComparator, DeepLearning (stats only), AdvancedAI (stats), UltimateAI (stats), AutoSpeedFeedCalculator, CAMSpeedFeedBridge, SpeedFeedMiner, SpeedFeedAutopilot, MachineAware, ProvenSpeedFeedAggregator, SpeedFeedResourceIntegration, SfcDatabaseRegistry, SFCCalculate, SFCDriftCanary, SFCFewShotNewMaterial, PPGSFCClosedLoop, Lathe facade family, HeatTreatment, exporters.

**Verified ORPHANS** (0 dispatcher refs, real engines 213-711 LOC): SFCMultiHypothesisRanker, SFCInferenceGateWire, SFCRAGWarmStart, SFCCompare, SFCOptimize, SFCProvenanceWire, SFCOutcomeCaptureWire, SFCParameterRefinement (WIRE-EXEMPT, sibling unit never shipped), SpeedFeedShopLibraryBridge, SpeedFeedPDFCorpusBridge, SpeedFeedCatalogJoiner.

**Verified dangling consumers**: DeepLearning.recordFeedback (no ingestion action — only stats wired); NineAxis orchestrator doesn't consume Refinement/MultiHyp/RAG/InferenceGate; orchestrator refinement-pass unwired.

### Assistant | 2026-05-31T04:56:07.812Z

[tool_use: StructuredOutput]

### User | 2026-05-31T04:56:10.829Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T04:56:24.209Z

I've completed the WIRING/ORPHANS/DISPATCHER COVERAGE audit for the SFC galaxy and returned the structured gap set.

Key findings (all verified against live code, not BUILD_STATE counts):

**Orphans — 11 engines with ZERO dispatcher references** (BUILD_STATE's "~5 unwired Speed engines" undercounts by 2x). They cluster into one fully-built but unreachable closed-loop-learning + RAG subsystem:
- SFCMultiHypothesisRanker, SFCRAGWarmStart, SFCInferenceGateWire, SFCProvenanceWire, SFCOutcomeCaptureWire, SFCParameterRefinement, SFCCompare, SFCOptimize, SpeedFeedShopLibraryBridge, SpeedFeedCatalogJoiner, SpeedFeedPDFCorpusBridge (213-711 LOC each, real class+singleton exports, consuming each other internally — but no MCP surface).

**Dangling consumers (3, all confirmed):**
- `SpeedFeedDeepLearningEngine.recordFeedback` (L1172) — the actuals-ingestion entry point — has no dispatcher action; only introspection stats are wired, so the DL loop can be read but never fed.
- `SpeedFeedNineAxisOrchestratorEngine` (the real recommendation path) imports none of Refinement/MultiHyp/RAG/InferenceGate.
- `SFCParameterRefinementEngine` is `// WIRE-EXEMPT` naming sibling unit `U-BRIDGE-LEARN-SFC-WIRE` — that unit was never shipped (the token exists only inside the engine's own comment).

**Stale-hint correction:** the task's hint that `SpeedFeedPSNDecisionPriorEngine` is "not invoked by predict path" is half-stale — it IS wired (`sfc_psn_decision_prior`), but the real gap is that the predict path (`consultNeuralPredictor` → `crossProcessNeuralLearningEngine`) never consults it as a prior. Filed as U-OSC-WIRE-PSNPRIOR-PREDICT.

8 proposed units (3 P0, 2 P1, 3 P2) with dependency ordering: the RAG-cluster wiring (U-OSC-WIRE-CLOSED-LOOP-RAG-CLUSTER) is the keystone P0 that unblocks the orchestrator-consume and parameter-refinement units. Relevant surfaces: `mcp-server/src/tools/dispatchers/calcDispatcher.ts`, `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`, and the 11 orphan e
... [+152 chars truncated]
