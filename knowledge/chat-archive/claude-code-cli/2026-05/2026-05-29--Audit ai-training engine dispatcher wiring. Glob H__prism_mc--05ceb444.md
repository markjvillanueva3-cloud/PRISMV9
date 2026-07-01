---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Audit ai-training engine dispatcher wiring. Glob H:/prism/mcp-server/src/engines"
date: "2026-05-29"
first_ts: "2026-05-29T13:42:49.077Z"
last_ts: "2026-05-29T13:57:13.794Z"
cwd: "H:\\prism-slot-india"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_8cccc7e8-be0/agent-ad7433c76c4467fe2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Audit ai-training engine dispatcher wiring. Glob H:/prism/mcp-server/src/engines

> **claude-code-cli** | 2026-05-29 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_8cccc7e8-be0/agent-ad7433c76c4467fe2.jsonl`

## Transcript

### User | 2026-05-29T13:42:49.077Z

Audit ai-training engine dispatcher wiring. Glob H:/prism/mcp-server/src/engines/*LoRA*.ts and count. Grep H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts for "xproc_neural" / "xproc_outcome" / "lora" (are NN/GNN/LoRA engines reachable via prism_ai?). Read H:/prism/state/shared/nn-graph/NN-EVAL.json deploy-gate status. Return dimension="nn-gnn-lora-wiring" + status + gaps[] (list any clearly-unwired ai-training engines or the deploy-gate blocker) + evidence.

### Assistant | 2026-05-29T13:43:04.083Z

I'll audit the ai-training engine dispatcher wiring. Let me run the independent checks in parallel.

### Assistant | 2026-05-29T13:43:04.278Z

[tool_use: Glob]

### User | 2026-05-29T13:43:41.377Z

[tool_result] H:/prism/mcp-server/src/engines\LatheLoRACadenceEngine.ts
H:/prism/mcp-server/src/engines\LatheLoRAPipelineEngine.ts
H:/prism/mcp-server/src/engines\LatheLoRATrainingScriptEngine.ts
H:/prism/mcp-server/src/engines\LatheLoRAProgramParserEngine.ts
H:/prism/mcp-server/src/engines\LatheLoRAExampleGeneratorEngine.ts
H:/prism/mcp-server/src/engines\LatheLoRADatasetValidatorEngine.ts
H:/prism/mcp-server/
... [+5628 chars truncated]

### Assistant | 2026-05-29T13:43:46.733Z

That's a large set. Let me get the exact count and run the dispatcher grep and NN-EVAL read in parallel.

### Assistant | 2026-05-29T13:43:47.691Z

[tool_use: Bash]

### Assistant | 2026-05-29T13:43:52.506Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:43:52.737Z

[tool_use: Read]

### User | 2026-05-29T13:44:32.887Z

[tool_result] 84:// U-PSN-AI-DISP-LORA (papa /loop iter6, 2026-05-23) — close
86:// Mirror of cadDispatcher's blueprint_lora_* actions. Same engine singleton
87:// (BlueprintLoRABridgeEngine), always-on anonymization HARD RULE applies.
88:// LoRA bundle production IS AI-routing work — fine-tuned endpoint registers
90:const BLUEPRINT_LORA_ACTIONS = [
91:  "blueprint_lora_prepare_set",
92:  "blueprint_lora_export
... [+11791 chars truncated]

### User | 2026-05-29T13:44:33.859Z

[tool_result] 1	{
2	  "deferred": true,
3	  "reason": "insufficient-reference-pool",
4	  "checkpointPresent": true,
5	  "poolSize": 0,
6	  "checkpointMeta": {
7	    "trainedAt": "2026-05-16T21:34:13.774Z",
8	    "nodeCount": 20460,
9	    "cappedNodes": 5998,
10	    "truncated": true,
11	    "edgeCount": 6562,
12	    "trainEdgeCount": 5250,
13	    "testEdgeCount": 1312,
14	    "evalNegativeCount": 1312,
15	    "
... [+342 chars truncated]

### User | 2026-05-29T13:46:54.104Z

[tool_result] 94

### Assistant | 2026-05-29T13:46:57.785Z

The dispatcher results confirm wiring for several engine families. Let me verify whether the `xproc_neural`/`xproc_outcome` actions are present in the action enum (registered) and check which LoRA engines are actually reachable vs. just existing on disk. Let me look at the enum definitions and the NN-EVAL gate context.

### Assistant | 2026-05-29T13:46:59.239Z

[tool_use: Read]

### Assistant | 2026-05-29T13:47:00.531Z

[tool_use: Grep]

### User | 2026-05-29T13:47:09.144Z

[tool_result] 150	  "decision_reasoning_select_machine",
151	  "dependency_graph_impact",
152	  "dependency_graph_stats",
153	  "domain_orchestrator_find",
154	  "domain_orchestrator_list",
155	  // Knowledge graph / neural bridge / LoRA
156	  "kg_neural_bridge_search",
157	  "kg_neural_bridge_add",
158	  "mit_course_knowledge_query",
159	  "catia_test_run_step",
160	  "catia_test_register",
161	  "machine_lora
... [+4154 chars truncated]

### User | 2026-05-29T13:47:11.455Z

[tool_result] 161:  "machine_lora_base_info",
165:  "lora_adapter_register",
543:  xproc_outcome_record: async (params) => {
555:  xproc_outcome_record_outcome: async (params) => {
558:    if (!id) throw new Error("xproc_outcome_record_outcome requires `id`");
624:  xproc_neural_train: async (params) => {
2607:      case "xproc_outcome_record":
2608:      case "xproc_outcome_record_outcome":
2618:      case "xp
... [+105 chars truncated]

### Assistant | 2026-05-29T13:47:16.187Z

Now I have a clear picture. The `xproc_neural_*`/`xproc_outcome_*` actions and several LoRA-engine actions ARE wired and reachable via `prism_ai`. Let me confirm which of the 94 LoRA engines are actually reachable, and check the `continualLoRAEngine` wiring (line 2110) plus the action enum families that contain the LoRA/neural actions. Let me check the AI_REASONING_ACTIONS enum head and OUTCOME_CROSSWIRE for the xproc actions.

### Assistant | 2026-05-29T13:47:18.123Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:47:19.496Z

[tool_use: Bash]

### User | 2026-05-29T13:47:44.731Z

[tool_result] 48:const OUTCOME_CROSSWIRE_ACTIONS = [
54:type OutcomeCrosswireAction = (typeof OUTCOME_CROSSWIRE_ACTIONS)[number];
231:  ...OUTCOME_CROSSWIRE_ACTIONS,
543:  xproc_outcome_record: async (params) => {
555:  xproc_outcome_record_outcome: async (params) => {
558:    if (!id) throw new Error("xproc_outcome_record_outcome requires `id`");
624:  xproc_neural_train: async (params) => {
2110:        const
... [+354 chars truncated]

### User | 2026-05-29T13:49:52.029Z

[tool_result] AdaLoRARankAllocatorEngine.js
BlueprintLoRABridgeEngine.js
CAMLoRAAdapterTrainerEngine.js
CAMLoRAEngine.js
ContinualLoRAEngine.js
DetachedLoRARunnerEngine.js
FederatedLoRAEngine.js
FiveAxisLoRACadenceEngine.js
FiveAxisLoRADatasetBuilderEngine.js
GrindingLoRACadenceEngine.js
GrindingLoRADatasetBuilderEngine.js
InferenceLoRAGateEngine.js
LaserLoRACadenceEngine.js
LaserLoRADatasetBuilderEngine.js
Lat
... [+2525 chars truncated]

### Assistant | 2026-05-29T13:49:57.076Z

I now have enough data. Let me cross-reference: of the 94 LoRA engine files on disk, only ~30 distinct LoRA engine families are referenced anywhere in dispatchers. Let me confirm the magnitude of the unwired set by listing distinct LoRA engine basenames on disk vs. those referenced in dispatchers.

### Assistant | 2026-05-29T13:49:58.979Z

[tool_use: Bash]

### User | 2026-05-29T13:51:40.610Z

[tool_result] MillLoRAPipelineCoordinatorEngine.js
PRISMLoRAAdapterEngine.js
WEDMLoRADatasetBuilderEngine.js

### Assistant | 2026-05-29T13:51:51.351Z

This is a critical finding. The `comm` shows only 3 LoRA engine *files* are completely absent from dispatchers — but that's misleading because most Lathe* engines are referenced only via the singleton orchestrator pattern. Let me verify what's actually reachable vs. dead by checking whether the bulk of Lathe LoRA engines (45+) are reachable through a dispatcher action, or only imported transitively. Let me check the turning dispatcher (which the india/lathe domain notes mention) for lathe LoRA actions.

### Assistant | 2026-05-29T13:51:53.526Z

[tool_use: Bash]

### User | 2026-05-29T13:53:09.984Z

[tool_result] camDispatcher.ts
millDispatcher.ts
shopPracticeDispatcher.ts
turningDispatcher.ts
---distinct LatheLoRA engines referenced in dispatchers---
49
---LatheLoRA engine files on disk---
49

### Assistant | 2026-05-29T13:53:15.756Z

All 49 LatheLoRA engines are referenced in dispatchers (turningDispatcher being the primary lathe surface). That means the LoRA wiring is far more complete than the raw `comm` against `aiReasoningDispatcher` alone suggested. The 3 truly-unreferenced engines are the real gap. Let me confirm those 3 are genuinely unwired (not exempt singletons or wrapped) and check the NN-EVAL deploy gate semantics — AUROC 0.096 is below random (0.5), which is the deploy blocker.

### Assistant | 2026-05-29T13:53:19.212Z

[tool_use: Bash]

### User | 2026-05-29T13:55:31.635Z

[tool_result] === Search ALL dispatchers for the 3 candidates ===
--- MillLoRAPipelineCoordinatorEngine ---
  NOT in any dispatcher
--- PRISMLoRAAdapterEngine ---
  NOT in any dispatcher
--- WEDMLoRADatasetBuilderEngine ---
  NOT in any dispatcher
=== WIRE-EXEMPT tags in the 3 files? ===
  no WIRE-EXEMPT tags

### Assistant | 2026-05-29T13:55:41.782Z

Confirmed. Three LoRA engines are unwired with no WIRE-EXEMPT tag. Let me do a final check on whether these 3 are wrapped by a referenced orchestrator (e.g., MillLoRAPipelineCoordinator may be invoked by MillLoRAMasterOrchestrator which IS wired) — this distinguishes a true orphan from a transitively-reachable engine. I'll also confirm the export shape (singleton vs class) for honesty.

### Assistant | 2026-05-29T13:55:44.552Z

[tool_use: Bash]

### User | 2026-05-29T13:56:04.980Z

[tool_result] === Is each of the 3 imported by ANY engine (transitive reach)? ===
MillLoRAPipelineCoordinatorEngine : imported by 0 other engine file(s)
PRISMLoRAAdapterEngine : imported by 1 other engine file(s)
WEDMLoRADatasetBuilderEngine : imported by 0 other engine file(s)

=== export shape (singleton?) ===
Compact grep - strips whitespace, truncates, groups by file

Usage: rtk grep [OPTIONS] <PATTERN> [PA
... [+880 chars truncated]

### Assistant | 2026-05-29T13:56:09.151Z

The last grep got intercepted by the rtk wrapper. Let me get the export shape directly with the Grep tool.

### Assistant | 2026-05-29T13:56:11.314Z

[tool_use: Grep]

### User | 2026-05-29T13:56:24.358Z

[tool_result] H:\prism\mcp-server\src\engines\PRISMLoRAAdapterEngine.ts:111:export class PRISMLoRAAdapterEngine {

### Assistant | 2026-05-29T13:56:37.889Z

I have all the evidence I need. Let me summarize the findings:

**LoRA engine count:** 94 files matching `*LoRA*.ts`.

**Dispatcher reachability via prism_ai (aiReasoningDispatcher):**
- `xproc_neural_*` actions: WIRED (train/predict/evaluate/save/load/metrics/reset + ewc_status/clear/consolidate) → `CrossProcessNeuralLearningEngine`
- `xproc_outcome_*` actions: WIRED (record/query/stats/replay/publish family) → `OutcomePublishAdapterEngine` + outcome store
- LoRA actions on prism_ai: `lora_adapter_register/resolve/list/stats`, `machine_lora_base_info`, `detached_lora_runner_info`, `blueprint_lora_*` (4), `lora_drift_*` (8), `continual_lora` (ContinualLoRAEngine.train) — all WIRED
- LatheLoRA family (49 engines): all reachable, primarily via turningDispatcher (+ cam/mill/shopPractice)

**Genuinely unwired (3):** `MillLoRAPipelineCoordinatorEngine`, `PRISMLoRAAdapterEngine`, `WEDMLoRADatasetBuilderEngine` — no dispatcher reference, no WIRE-EXEMPT tag. `PRISMLoRAAdapterEngine` is imported by 1 other engine (partial transitive reach); the other two are imported by 0 engines (true orphans).

**Deploy gate:** NN-EVAL.json shows `deferred: true`, `reason: insufficient-reference-pool`, `poolSize: 0`, and a trained GNN checkpoint with **AUROC 0.096** (far below 0.5 random baseline) — the deploy gate is blocked.

### Assistant | 2026-05-29T13:56:54.325Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:57:03.990Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T13:57:13.794Z

Audit complete. Summary of the **nn-gnn-lora-wiring** dimension — status **PARTIAL**:

**Counts**
- 94 LoRA engine files (`H:/prism/mcp-server/src/engines/*LoRA*.ts`).
- Only 3 of 94 are absent from every dispatcher; the other 91 (incl. all 49 LatheLoRA engines) are reachable.

**prism_ai reachability — YES.** `aiReasoningDispatcher.ts` wires the full `xproc_neural_*` family (train/predict/evaluate/save/load/metrics/reset + EWC) → `CrossProcessNeuralLearningEngine`, the `xproc_outcome_*` family → `OutcomePublishAdapterEngine`, and the LoRA action surface (`lora_adapter_*`, `machine_lora_base_info`, `detached_lora_runner_info`, `blueprint_lora_*`, `lora_drift_*`, `continual_lora` → `ContinualLoRAEngine`). LatheLoRA engines are reached primarily through `turningDispatcher`.

**Gaps (clearly-unwired engines):**
1. `MillLoRAPipelineCoordinatorEngine.ts` — true orphan (0 dispatcher refs, 0 engine imports, no WIRE-EXEMPT).
2. `WEDMLoRADatasetBuilderEngine.ts` — true orphan (same).
3. `PRISMLoRAAdapterEngine.ts` — no dispatcher ref / no WIRE-EXEMPT; only partially reachable (imported by 1 engine, exported as a class).

**Deploy-gate blocker:** `state/shared/nn-graph/NN-EVAL.json` is `deferred: true`, reason `insufficient-reference-pool`, `poolSize: 0`. Separately, the trained GNN checkpoint is anti-predictive — **AUROC 0.096** (below the 0.5 random baseline), trained on a truncated/capped node set (5,998 of 20,460 nodes). Even if the reference pool were populated, the checkpoint would fail any AUROC ≥ 0.5 gate.
