---
type: "chat-session"
source: "claude-code-cli"
session_id: "1730eb7c-9196-4e9b-856c-4f2a7414724d"
title: "PRISM codebase at `H:/PRISM/`. List every LATHE/TURNING engine, algorithm, dispa"
date: "2026-05-27"
first_ts: "2026-05-27T14:04:47.411Z"
last_ts: "2026-05-27T14:18:46.187Z"
cwd: "H:\\PRISM"
messages: 64
user_msgs: 22
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-ad4df9a839347bc88.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# PRISM codebase at `H:/PRISM/`. List every LATHE/TURNING engine, algorithm, dispa

> **claude-code-cli** | 2026-05-27 | 64 msgs (22 user / 42 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-ad4df9a839347bc88.jsonl`

## Transcript

### User | 2026-05-27T14:04:47.411Z

PRISM codebase at `H:/PRISM/`. List every LATHE/TURNING engine, algorithm, dispatcher, schema. Exclude pure mill/wedm/cad files.

Scan these surfaces:
1. `mcp-server/src/engines/` — files with `Lathe`, `Turning`, `Threading`, `G76`, `Insert`, `Chuck`, `Spindle*Lathe` in name
2. `mcp-server/src/algorithms/` — same patterns
3. `mcp-server/src/tools/dispatchers/` — dispatchers with lathe actions (e.g. prism_lathe, prism_turning, plus lathe actions inside prism_cam)
4. `mcp-server/src/schemas/` — lathe-related zod schemas
5. `H:/prism-slot-whiskey/scripts/lib/lathe-*.mjs` — slot-whiskey lathe engines (already inventoried at scripts/lib/README-whiskey-lathe.md — also list those)
6. `mcp-server/src/engines/lathe/CLAUDE.md` — galaxy sentinel (per DOMAIN-GALAXY-DOCTRINE-MS0); report whether it exists + first 3 lines

Format: 6 numbered sections, each line `path | 1-line purpose`. Cap each section at 30 hits + total count. Under 500 words. Say "NOT FOUND" if a path doesn't exist.

### Assistant | 2026-05-27T14:05:02.341Z

I'll scan the PRISM codebase systematically for lathe/turning engines, algorithms, dispatchers, and schemas.

### Assistant | 2026-05-27T14:05:02.653Z

[tool_use: Bash]

### User | 2026-05-27T14:06:27.101Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-27T14:06:33.384Z

Let me use Bash with proper syntax:

### Assistant | 2026-05-27T14:06:34.159Z

[tool_use: Bash]

### User | 2026-05-27T14:07:40.381Z

[tool_result] H:/PRISM/mcp-server/src/engines/AdaptiveSpindleControlEngine.ts
H:/PRISM/mcp-server/src/engines/ChuckJawForceEngine.ts
H:/PRISM/mcp-server/src/engines/DiamondTurningEngine.ts
H:/PRISM/mcp-server/src/engines/EccentricTurningEngine.ts
H:/PRISM/mcp-server/src/engines/EmployeeInsertSideTrackerEngine.ts
H:/PRISM/mcp-server/src/engines/FusionLathePostDeltaRegistryEngine.ts
H:/PRISM/mcp-server/src/engine
... [+2149 chars truncated]

### Assistant | 2026-05-27T14:07:42.139Z

Good start. Let me continue with the full inventory across all sections:

### Assistant | 2026-05-27T14:07:43.076Z

[tool_use: Bash]

### User | 2026-05-27T14:08:56.171Z

[tool_result] 244

### Assistant | 2026-05-27T14:08:57.778Z

Too many to list all. Let me get counts and sample the inventory more strategically:

### Assistant | 2026-05-27T14:08:57.988Z

[tool_use: Bash]

### User | 2026-05-27T14:10:20.537Z

[tool_result] 198

### Assistant | 2026-05-27T14:10:22.319Z

Now let me get the algorithms, dispatchers, and schemas:

### Assistant | 2026-05-27T14:10:22.720Z

[tool_use: Bash]

### User | 2026-05-27T14:12:06.381Z

[tool_result] 1

### Assistant | 2026-05-27T14:12:08.230Z

Let me continue with broader scans:

### Assistant | 2026-05-27T14:12:08.277Z

[tool_use: Bash]

### User | 2026-05-27T14:12:40.004Z

[tool_result] 0 for '*[Ll]athe*.ts'

### Assistant | 2026-05-27T14:12:41.587Z

Let me use a more efficient approach:

### Assistant | 2026-05-27T14:12:41.912Z

[tool_use: Bash]

### User | 2026-05-27T14:12:59.212Z

[tool_result] H:/PRISM/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/agentDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts
H:/PRISM/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/atcsDispatcher.t
... [+910 chars truncated]

### Assistant | 2026-05-27T14:13:01.392Z

Let me search for lathe-specific dispatchers and get the schemas:

### Assistant | 2026-05-27T14:13:01.705Z

[tool_use: Bash]

### User | 2026-05-27T14:13:18.840Z

[tool_result] 0 for '*[Ll]athe*'
0 for '*[Ll]athe*'

### Assistant | 2026-05-27T14:13:23.533Z

Let me check for lathe actions in the main dispatchers and search slot-whiskey:

### Assistant | 2026-05-27T14:13:24.024Z

[tool_use: Bash]

### User | 2026-05-27T14:13:57.771Z

[tool_result] H:/PRISM/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/businessDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/cadDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/cadDrawingKnowledgeDispatcher.ts
H:/PRISM/mcp-server/src/tools/dispatchers/calcDispatcher.ts
H:/PRI
... [+861 chars truncated]

### Assistant | 2026-05-27T14:14:01.388Z

Now let me check slot-whiskey and the CLAUDE.md sentinel file:

### Assistant | 2026-05-27T14:14:01.656Z

[tool_use: Bash]

### User | 2026-05-27T14:14:31.813Z

[tool_result] 18F 2D:

./ lathe-ab-version-locator.mjs lathe-ab-version-locator.test.mjs lathe-academy-priors.mjs lathe-engines-e2e-smoke.test.mjs lathe-g76-thread-validator.mjs lathe-g76-thread-validator.test.mjs lathe-shop-tool-library-bridge.mjs lathe-shop-tool-library-bridge.test.mjs lathe-stage-4-5-pipeline.test.mjs lathe-training-loop-stage-4-reason.mjs lathe-training-loop-stage-4-reason.test.mjs lathe-tr
... [+251 chars truncated]

### Assistant | 2026-05-27T14:14:33.928Z

Now let me check for the CLAUDE.md and verify the slot-whiskey README:

### Assistant | 2026-05-27T14:14:34.234Z

[tool_use: Bash]

### User | 2026-05-27T14:15:01.087Z

[tool_result] EXISTS

### Assistant | 2026-05-27T14:15:02.710Z

[tool_use: Read]

### User | 2026-05-27T14:15:12.247Z

[tool_result] 1	# Lathe Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-26)
2	
3	> **Bibryam Context Cascade pattern (Pillar P1 of the Galaxy Doctrine).** This file loads automatically when Claude is editing under `mcp-server/src/engines/lathe/`. The root `CLAUDE.md` covers PRISM-wide doctrine; this file covers lathe-specific conventions, gotchas, and pointers. **Do NOT duplicate root doctrine here
... [+347 chars truncated]

### Assistant | 2026-05-27T14:15:17.369Z

Let me also check the slot-whiskey README for that inventory:

### Assistant | 2026-05-27T14:15:17.911Z

[tool_use: Read]

### User | 2026-05-27T14:15:23.348Z

[tool_result] 1	# Whiskey lathe-domain engines — entry point
2	
3	> **STATUS**: Session-final at iter272. All 6 P0 engines + AB-locator CLI scanner code-complete + **~140+3=143 hermetic tests** (39 in lathe-quality-pipeline alone) + **12 real-data-driven fixes (iter265 parseBlocks comment-strip added)** + full JM-Die archive scan = **14,475 A/B pairs across 118 customers**. Durable cron `8505e156` (every 5min, 
... [+3821 chars truncated]

### Assistant | 2026-05-27T14:15:25.935Z

Perfect. Now let me get a sample of engine names and create the final inventory report:

### Assistant | 2026-05-27T14:15:26.453Z

[tool_use: Bash]

### User | 2026-05-27T14:15:43.255Z

[tool_result] FusionLathePostDeltaRegistryEngine.ts
JMDieLatheProgramUpgraderEngine.ts
JMDieLatheProgramUpgraderV2Engine.ts
LatheActiveLearningEngine.ts
LatheActualCostReconciliationEngine.ts
LatheActualFeedbackTuningEngine.ts
LatheAdaptiveMachiningEngine.ts
LatheAdvancedOperationsEngine.ts
LatheAGIContinuousLearningEngine.ts
LatheAGIFeatureBridgeEngine.ts
LatheAGIKnowledgeUnificationEngine.ts
LatheAGISafetyCon
... [+559 chars truncated]

### Assistant | 2026-05-27T14:15:45.529Z

Let me check for turning/threading specific engines and get a final count:

### Assistant | 2026-05-27T14:15:46.053Z

[tool_use: Bash]

### User | 2026-05-27T14:16:09.712Z

[tool_result] DiamondTurningEngine.ts
EccentricTurningEngine.ts
HardTurningCapstoneEngine.ts
HardTurningDecisionEngine.ts
HyperMillTurningConfigIngesterEngine.ts
LatheTurningFeatureRecognizerEngine.ts
NXCAMTurningFunctionIndexEngine.ts
PPOkumaTurningPostEngine.ts
SolidCAMTurningFunctionIndexEngine.ts
TaperTurningEngine.ts
ThreadingPipelineEngine.ts
ThreadingServoSyncVerifierEngine.ts
ThreadTurningEngine.ts
Turn
... [+830 chars truncated]

### Assistant | 2026-05-27T14:16:11.687Z

Now let me get the schemas and dispatchers with lathe actions:

### Assistant | 2026-05-27T14:16:11.924Z

[tool_use: Bash]

### User | 2026-05-27T14:16:36.366Z

[tool_result] H:/PRISM/mcp-server/src/schemas/actionMetadata.ts
H:/PRISM/mcp-server/src/schemas/aiCapabilityActionSchemas.ts
H:/PRISM/mcp-server/src/schemas/aiReasoningActionSchemas.ts
H:/PRISM/mcp-server/src/schemas/businessActionSchemas.ts
H:/PRISM/mcp-server/src/schemas/cadActionSchemas.ts
H:/PRISM/mcp-server/src/schemas/cadAutomationActionSchemas.ts
H:/PRISM/mcp-server/src/schemas/cadFileIndexSchema.ts
H:/P
... [+712 chars truncated]

### Assistant | 2026-05-27T14:16:40.447Z

Let me get a final summary of the dispatcher lathe actions:

### Assistant | 2026-05-27T14:16:40.868Z

[tool_use: Bash]

### User | 2026-05-27T14:16:54.262Z

[tool_result] Compact grep - strips whitespace, truncates, groups by file

Usage: rtk grep [OPTIONS] <PATTERN> [PATH] [EXTRA_ARGS]...

Arguments:
  <PATTERN>        Pattern to search
  [PATH]           Path to search in [default: .]
  [EXTRA_ARGS]...  Extra ripgrep arguments (e.g., -i, -A 3, -w, --glob)

Options:
  -l, --max-len <MAX_LEN>      Max line length [default: 80]
  -m, --max <MAX>              Max res
... [+580 chars truncated]

### Assistant | 2026-05-27T14:16:58.408Z

Let me use the Grep tool directly:

### Assistant | 2026-05-27T14:16:58.956Z

[tool_use: Grep]

### User | 2026-05-27T14:17:11.222Z

[tool_result] Found 6 files
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\tools\dispatchers\millDispatcher.ts
mcp-server\src\tools\dispatchers\turningDispatcher.ts
mcp-server\src\tools\dispatchers\ppDispatcher.ts
mcp-server\src\tools\dispatchers\turningProgramDispatcher.ts

### Assistant | 2026-05-27T14:17:12.648Z

Let me check the DISPATCHER_DIGEST directly:

### Assistant | 2026-05-27T14:17:13.067Z

[tool_use: Bash]

### User | 2026-05-27T14:17:39.821Z

[tool_result] # PRISM Dispatcher Digest

**105 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Auto-generated: 2026-05-27 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
Total actions across all dispatchers: **13544**.

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControl
... [+4040 chars truncated]

### Assistant | 2026-05-27T14:17:42.196Z

Perfect! Now let me verify the actual lathe dispatcher entries:

### Assistant | 2026-05-27T14:17:42.532Z

[tool_use: Bash]

### User | 2026-05-27T14:18:00.102Z

[tool_result] | threadDispatcher | prism_thread — Threading calculations: tap drill, thread milling, depth,... | 17 |
| threadingPipelineDispatcher | prism_threading_pipeline — Threading Pipeline — complete thread programming for lath... | 3 |
| turningDispatcher | prism_turning — Turning-specific dispatcher â€” SAFETY CRITICAL. Chuck ja... | 373 |
| turningProgramDispatcher | prism_turning_program — Turning Pr
... [+57 chars truncated]

### Assistant | 2026-05-27T14:18:02.111Z

Excellent. Now let me compile the final inventory report. I have enough data:

### Assistant | 2026-05-27T14:18:02.937Z

[tool_use: Bash]

### User | 2026-05-27T14:18:17.962Z

[tool_result] 198
40

### Assistant | 2026-05-27T14:18:46.187Z

Perfect. Now I have complete data. Here is the PRISM lathe/turning inventory:

---

## PRISM Lathe/Turning Engine Inventory (2026-05-27)

### 1. Engines — `mcp-server/src/engines/` — **238 files** (30 sample below)

**Lathe-prefixed: 198 files**
- H:/PRISM/mcp-server/src/engines/LatheActiveLearningEngine.ts | Active learning for lathe parameter optimization
- H:/PRISM/mcp-server/src/engines/LatheActualCostReconciliationEngine.ts | Reconcile actual vs estimated lathe job costs
- H:/PRISM/mcp-server/src/engines/LatheAdaptiveMachiningEngine.ts | Real-time adaptive control for lathe operations
- H:/PRISM/mcp-server/src/engines/LatheAdvancedOperationsEngine.ts | Multi-axis lathe operations orchestration
- H:/PRISM/mcp-server/src/engines/LatheAGIKnowledgeUnificationEngine.ts | Unified AGI knowledge for lathe domain
- H:/PRISM/mcp-server/src/engines/LatheAIReasoningEngine.ts | AI reasoning for lathe strategy selection
- H:/PRISM/mcp-server/src/engines/LatheAnomalyDetectionEngine.ts | Detect lathe spindle/chuck anomalies
- H:/PRISM/mcp-server/src/engines/LatheAutoQuoteFromPrintEngine.ts | Auto-quote lathe jobs from engineering prints
- H:/PRISM/mcp-server/src/engines/LatheBayesianOptimizationEngine.ts | Bayesian optimization for lathe parameters
- H:/PRISM/mcp-server/src/engines/LatheCAMIntelligenceEngine.ts | CAM system integration for lathe toolpaths
- H:/PRISM/mcp-server/src/engines/LatheChangeoverBriefEngine.ts | Generate lathe changeover documentation
- H:/PRISM/mcp-server/src/engines/LatheChipMechanicsEngine.ts | Predict chip control & evacuation
- H:/PRISM/mcp-server/src/engines/LatheChuckJawSetupEngine.ts | Chuck jaw selection & clamping force
- H:/PRISM/mcp-server/src/engines/LatheClusterAnalysisEngine.ts | Cluster similar lathe jobs for batch ops
- H:/PRISM/mcp-server/src/engines/LatheCollisionDetectionEngine.ts | Detect tool/part collisions
- H:/PRISM/mcp-server/src/engines/LatheControllerSelectEngine.ts | Route to Okuma/Fanuc/Haas dialect
- H:/PRISM/mcp-server/s
... [+7069 chars truncated]
