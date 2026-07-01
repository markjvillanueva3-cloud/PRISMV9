---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Find which algorithm modules are CONSUMED anywhere in the codebase (integration "
date: "2026-06-15"
first_ts: "2026-06-15T23:17:47.045Z"
last_ts: "2026-06-15T23:19:06.102Z"
cwd: "H:\\prism-slot-tango"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_b2fa7dc8-877/agent-a15757adde0c34b7c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Find which algorithm modules are CONSUMED anywhere in the codebase (integration 

> **claude-code-cli** | 2026-06-15 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_b2fa7dc8-877/agent-a15757adde0c34b7c.jsonl`

## Transcript

### User | 2026-06-15T23:17:47.045Z

Find which algorithm modules are CONSUMED anywhere in the codebase (integration tree, the romeo-relevant "is it truly orphaned" signal).
Run from H:/prism/mcp-server: grep -rhoE 'from "[^"]*algorithms/[A-Za-z0-9_]+' src/ (and also match single-quote variants). Extract the algorithm module name after "algorithms/" from every import across ALL of src/ (engines, dispatchers, other algorithms, anywhere).
Return names[] = the DISTINCT set of algorithm module names that are imported by at least one file anywhere in src/, count, and notes (how many total import sites, any caveats). This is the "reachable via some consumer" set. Use the names exactly as they appear after "algorithms/".

### Assistant | 2026-06-15T23:17:54.734Z

I'll search for algorithm module imports across the codebase.

### Assistant | 2026-06-15T23:17:56.274Z

[tool_use: Bash]

### User | 2026-06-15T23:18:06.881Z

[tool_result]       5 index
      5 FRFStabilityLobe
      4 types
      4 StabilityLobeDiagram
      3 ToolWearPrediction
      3 PersonalizedPageRank
      3 KienzleForceModel
      3 JaegerTempField
      3 HypervolumeIndicator
      3 ExtendedTaylorModel
      2 SandvikTurningForceModel
      2 RCSA
      2 MerchantShearForceModel
      2 LBFGSBOptimizer
      2 HaversineDistanceAlgorithm
      2 DPMultiPas
... [+1488 chars truncated]

### Assistant | 2026-06-15T23:18:09.254Z

Now let me get the total import site count and the distinct names list cleanly.

### Assistant | 2026-06-15T23:18:10.111Z

[tool_use: Bash]

### User | 2026-06-15T23:18:20.945Z

[tool_result] ABCClassificationFormula
ActivationFunctionsAlgorithm
AdaptiveControllerModel
AmortizationScheduleFormula
AnomalyDetector
AntColonyTSP
BayesianOptimizer
BayesianWearModel
BillOfMaterialsRollupFormula
ChipBreakingModel
ChipEvacuationModel
ChipTypePredictionModel
ChipVolumeRate
CoolantFlowModel
CoolantVcModifier
CriticalPathSchedulingFormula
CSPSetupPlan
CWEZBuffer
DBSCANAlgorithm
DecisionTreeClassi
... [+936 chars truncated]

### Assistant | 2026-06-15T23:18:23.203Z

[tool_use: Bash]

### User | 2026-06-15T23:18:40.090Z

[tool_result] 104

### Assistant | 2026-06-15T23:18:42.423Z

[tool_use: Bash]

### User | 2026-06-15T23:18:50.258Z

[tool_result] 69

### Assistant | 2026-06-15T23:18:53.855Z

69 distinct names across 104 import sites. Two of those names are `index` and `types` (barrel/type files, not algorithm implementations). The romeo-relevant consumed algorithm implementations number 67.

### Assistant | 2026-06-15T23:19:02.190Z

[tool_use: StructuredOutput]

### User | 2026-06-15T23:19:06.102Z

[tool_result] Structured output provided successfully
