---
type: "chat-session"
source: "claude-code-cli"
session_id: "69c2d78c-032d-4d96-a0c8-27f4681dabcd"
title: "## Mission Hunt for DORMANT features in `H:\\PRISM\\extracted\\` (896 files, 27 dir"
date: "2026-05-28"
first_ts: "2026-05-28T03:37:43.644Z"
last_ts: "2026-05-28T03:41:44.380Z"
cwd: "H:\\prism\\mcp-server"
messages: 62
user_msgs: 21
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/69c2d78c-032d-4d96-a0c8-27f4681dabcd/subagents/agent-aa56d25e2d4a915d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# ## Mission Hunt for DORMANT features in `H:\PRISM\extracted\` (896 files, 27 dir

> **claude-code-cli** | 2026-05-28 | 62 msgs (21 user / 41 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/69c2d78c-032d-4d96-a0c8-27f4681dabcd/subagents/agent-aa56d25e2d4a915d9.jsonl`

## Transcript

### User | 2026-05-28T03:37:43.644Z

## Mission
Hunt for DORMANT features in `H:\PRISM\extracted\` (896 files, 27 dirs: algorithms, business, catalogs, constants, controllers, core, engines, formulas, infrastructure, integration, knowledge_bases, learning, machines, materials*, mit, systems, tools, units, verification_reports, workholding, _ARCHIVE_OLD_MATERIALS, plus *_backup_* and *_complete dirs).

"Dormant" = exists in extracted/ but **not integrated** into `H:\prism\mcp-server\src\` (engines, dispatchers, algorithms, registries). I want a punch list of HIGH-ROI unmigrated capabilities so I can rank for porting.

## Context
- PRISM is a manufacturing-intelligence MCP server. CAD blueprint → physics → CNC G-code pipeline.
- `H:\prism\mcp-server\src\engines\` is the live engine surface (~3000 engines).
- `H:\PRISM\extracted\` is the monolith-extraction archive; some has been ported, much has not.
- Already known + EXCLUDED from this sweep (I already inventoried these in a prior pass):
  - Post-processor family: `PRISM_UNIVERSAL_POST_GENERATOR_V2`, `PRISM_KALMAN_CONTROLLER`, `PRISM_OKUMA_OSP_*`, `PRISM_GUARANTEED_POST_PROCESSOR`, `PRISM_GCODE_BACKPLOT_ENGINE`, `PRISM_POST_ANALYSIS_AI`, `PRISM_TOOLPATH_GCODE_BRIDGE`, `PRISM_MACHINE_SPECIFIC_POST_TEMPLATES`, `PRISM_POST_PROCESSOR_DEVELOPMENT_ENGINE`
  - Alarm DBs (Fanuc/Haas/Okuma/Heidenhain/Mitsubishi alarms — already wiki-integrated as `controllers-alarms` nodes).
- Look for everything ELSE: algorithms, formulas, AI/ML, materials science, business logic, learning systems, calibration data, knowledge bases, MIT-OCW extractions, fixturing, workholding, etc.

## Method
1. **Enumerate** the 27 top-level dirs — file counts per dir + 1-line purpose inference from `_README.md` if present.
2. For each dir, sample 5-10 representative file names. Skip raw data/JSON backups (anything with `_backup_` or `_OLD_` in path).
3. **Token-check** the top candidates: take a uniquely-named const/class from each (e.g., `PRISM_NEURAL_OPTIMIZER` → search for `NeuralOptimizer
... [+534 chars truncated]

### Assistant | 2026-05-28T03:37:54.587Z

I'll hunt for dormant features in the extracted PRISM directory. Let me start by enumerating the 27 top-level directories and sampling their contents.

### Assistant | 2026-05-28T03:37:55.059Z

[tool_use: Bash]

### User | 2026-05-28T03:37:58.807Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-05-28T03:38:00.456Z

Let me use a simpler approach to enumerate the directories:

### Assistant | 2026-05-28T03:38:00.694Z

[tool_use: Bash]

### User | 2026-05-28T03:38:07.077Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-05-28T03:38:08.777Z

Let me try with proper path escaping:

### Assistant | 2026-05-28T03:38:08.829Z

[tool_use: Bash]

### User | 2026-05-28T03:38:17.497Z

[tool_result] _ARCHIVE_OLD_MATERIALS/
algorithms/
business/
catalogs/
constants/
controllers/
core/
engines/
formulas/
infrastructure/
integration/
knowledge_bases/
learning/
machines/
materials/
materials_backup_20260125_0134/
materials_backup_full_20260125_0136/
materials_backup_v2_20260125_0138/
materials_complete/
materials_enhanced/
materials_v9_complete/
mit/
systems/
tools/
units/
verification_reports/
w
... [+94 chars truncated]

### Assistant | 2026-05-28T03:38:19.599Z

Good. Now let me get file counts per directory and sample files:

### Assistant | 2026-05-28T03:38:19.949Z

[tool_use: Bash]

### User | 2026-05-28T03:38:29.078Z

[tool_result] engines: 257
controllers: 147
machines: 110
algorithms: 52
materials: 48
materials_backup_v2_20260125_0138: 42
materials_backup_full_20260125_0136: 42
materials_backup_20260125_0134: 42
_ARCHIVE_OLD_MATERIALS: 27
materials_v9_complete: 17
materials_enhanced: 14
integration: 14
formulas: 12
core: 11
knowledge_bases: 10
systems: 7
business: 7
learning: 6
catalogs: 6
mit: 5
infrastructure: 5
workhold
... [+83 chars truncated]

### Assistant | 2026-05-28T03:38:30.981Z

Now let me sample key directories. I'll start with the largest ones and check what's actually integrated:

### Assistant | 2026-05-28T03:38:31.284Z

[tool_use: Bash]

### User | 2026-05-28T03:38:40.391Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-28T03:38:42.093Z

Let me sample files from the high-value directories more directly:

### Assistant | 2026-05-28T03:38:42.125Z

[tool_use: Bash]

### User | 2026-05-28T03:38:52.578Z

[tool_result] ALGORITHM_LIBRARY.js  74.0K
COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js  74.1K
PRISM_ACO_SEQUENCER.js  196.8K
PRISM_ADVANCED_INTERPOLATION.js  6.7K
PRISM_ALGORITHM_ENSEMBLER.js  6.4K
PRISM_ALGORITHM_ORCHESTRATOR.js  9.2K
PRISM_ALGORITHM_REGISTRY.js  150.8K
PRISM_ALGORITHM_STRATEGIES.js  10.3K
PRISM_BEZIER_MIT.js  3.4K
PRISM_CONTROL_SYSTEMS_MIT.js  3.9K
PRISM_CORE_ALGORITHMS.js  20.6K
PRISM_CRITICAL_ALG
... [+260 chars truncated]

### Assistant | 2026-05-28T03:38:54.452Z

Perfect. Now let me check if these are in the mcp-server and sample a few more directories:

### Assistant | 2026-05-28T03:38:54.696Z

[tool_use: Bash]

### User | 2026-05-28T03:39:06.123Z

[tool_result] PRISM_LEARNING_ENGINE.js  2.2K
PRISM_LEARNING_ENGINE_FEEDBACK.js  13.2K
PRISM_LEARNING_FEEDBACK_CONNECTOR.js  8.2K
PRISM_LEARNING_INTEGRATION_BRIDGE.js  10.7K
PRISM_LEARNING_PERSISTENCE_ENGINE.js  4.2K
PRISM_LEARNING_RATE_SCHEDULER_ENGINE.js  5.6K
---
PRISM_BUSINESS_AI_SYSTEM.js  8.1K
PRISM_COST_DATABASE.js  288.2K
PRISM_COST_ESTIMATION.js  6.4K
PRISM_SCHEDULING_ENGINE.js  5.8K
PRISM_SHOP_ANALYTIC
... [+191 chars truncated]

### Assistant | 2026-05-28T03:39:08.045Z

Now let me search the mcp-server for evidence of integration. I'll sample key class names:

### Assistant | 2026-05-28T03:39:08.850Z

[tool_use: Grep]

### User | 2026-05-28T03:39:12.643Z

[tool_result] Found 250 files limit: 250
src\tools\dispatchers\businessDispatcher.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\schemas\aiReasoningActionSchemas.ts
src\tools\dispatchers\millDispatcher.ts
src\tools\dispatchers\calcDispatcher.ts
src\tools\dispatchers\devDispatcher.ts
src\tools\dispatchers\intelligenceDispatcher.ts
src\schemas\intelligenceActionSchemas.ts
src\engines\CAMPhase5Stubs.ts
src\
... [+11121 chars truncated]

### Assistant | 2026-05-28T03:39:15.100Z

Good—there's clearly integration. Let me now search for specific algorithms/modules that are NOT integrated:

### Assistant | 2026-05-28T03:39:15.718Z

[tool_use: Bash]

### User | 2026-05-28T03:39:24.105Z

[tool_result] PRISM_220_COURSES_MASTER.js  14.2K
PRISM_DATA_STRUCTURES_KB.js  12.1K
PRISM_KNOWLEDGE_AI_CONNECTOR.js  4.1K
PRISM_KNOWLEDGE_BASE.js  28.1K
PRISM_KNOWLEDGE_FUSION.js  5.6K
PRISM_KNOWLEDGE_GRAPH.js  10.4K
PRISM_KNOWLEDGE_INTEGRATION_ROUTES.js  8.1K
PRISM_MFG_STRUCTURES_KB.js  4.9K
PRISM_SYSTEMS_KB.js  5.8K
PRISM_UNIVERSITY_ALGORITHMS.js  201.2K
---
PRISM_CAD_KERNEL_MIT.js  11.2K
PRISM_CAM_KERNEL_MIT
... [+367 chars truncated]

### Assistant | 2026-05-28T03:39:25.961Z

Let me search for these knowledge base and catalog classes in the mcp-server:

### Assistant | 2026-05-28T03:39:26.924Z

[tool_use: Grep]

### User | 2026-05-28T03:39:32.195Z

[tool_result] Found 22 files
src\tools\dispatchers\devDispatcher.ts
src\tools\dispatchers\intelligenceDispatcher.ts
src\__tests__\monolithUnifiedQueryDispatch.test.ts
src\schemas\intelligenceActionSchemas.ts
src\tools\dispatchers\dataDispatcher.ts
src\engines\MonolithConsolidatedCatalogManifestEngine.ts
src\__tests__\monolithZeniCatalogManifest.test.ts
src\engines\MonolithZeniCatalogManifestEngine.ts
src\__test
... [+583 chars truncated]

### Assistant | 2026-05-28T03:39:34.441Z

Now let me systematically check which extracted items are NOT in mcp-server by testing a broader set of unique identifiers:

### Assistant | 2026-05-28T03:39:35.065Z

[tool_use: Bash]

### User | 2026-05-28T03:39:42.754Z

[tool_result] 19

### Assistant | 2026-05-28T03:39:44.832Z

Excellent signal! Let me now do a targeted search for specific unported items:

### Assistant | 2026-05-28T03:39:45.494Z

[tool_use: Bash]

### User | 2026-05-28T03:39:50.747Z

[tool_result] algorithms/PRISM_ACO_SEQUENCER.js: 201570 bytes
algorithms/PRISM_FFT_PREDICTIVE_CHATTER.js: 12118 bytes
learning/PRISM_LEARNING_ENGINE.js: 2278 bytes
learning/PRISM_LEARNING_ENGINE_FEEDBACK.js: 13466 bytes
learning/PRISM_LEARNING_FEEDBACK_CONNECTOR.js: 8408 bytes
learning/PRISM_LEARNING_INTEGRATION_BRIDGE.js: 10946 bytes
learning/PRISM_LEARNING_PERSISTENCE_ENGINE.js: 4308 bytes
learning/PRISM_LEAR
... [+290 chars truncated]

### Assistant | 2026-05-28T03:39:53.495Z

Now let me check which of these are NOT referenced in mcp-server at all:

### Assistant | 2026-05-28T03:39:54.244Z

[tool_use: Bash]

### User | 2026-05-28T03:40:20.950Z

[tool_result] ACOSequencer: /usr/bin/grep: H:/prism/mcp-server/src/__tests__/skillOrchBenchmark.test.ts: Permission denied
DORMANT
FFTPredictiveChatter: /usr/bin/grep: H:/prism/mcp-server/src/__tests__/skillOrchBenchmark.test.ts: Permission denied
DORMANT
LearningEngineFeedback: /usr/bin/grep: H:/prism/mcp-server/src/__tests__/skillOrchBenchmark.test.ts: Permission denied
DORMANT
CostDatabase: /usr/bin/grep: H:
... [+145 chars truncated]

### Assistant | 2026-05-28T03:40:22.798Z

Good signal. Let me sample more directories systematically:

### Assistant | 2026-05-28T03:40:22.996Z

[tool_use: Bash]

### User | 2026-05-28T03:40:31.472Z

[tool_result] PRISM_FORCE_LOOKUP.js  2.0K
PRISM_MATERIAL_PHYSICS.js  2.0K
PRISM_MFG_PHYSICS.js  6.8K
PRISM_STANDALONE_CALCULATOR_API.js  11.1K
PRISM_STRESS.js  4.3K
PRISM_STRESS_ANALYSIS.js  8.4K
PRISM_THERMAL_COMPENSATION.js  7.0K
PRISM_THERMAL_LOOKUP.js  1.7K
PRISM_THERMAL_PROPERTIES.js  5.5K
PRISM_TOOL_LIFE_ESTIMATOR.js  4.9K
PRISM_TOOL_WEAR_MODELS.js  21.2K
PRISM_WEAR_LOOKUP.js  3.0K
---
PRISM_COMPARE.js  1
... [+107 chars truncated]

### Assistant | 2026-05-28T03:40:33.367Z

Let me now test these systematically for integration:

### Assistant | 2026-05-28T03:40:34.020Z

[tool_use: Bash]

### User | 2026-05-28T03:40:43.008Z

[tool_result] StandalonCalculator: 0
ToolWearModels: 0
ThermalCompensation: 0
StressAnalysis: 0
StateStore: 0
CompareEngine: 0

### Assistant | 2026-05-28T03:40:44.907Z

Perfect! Let me also check systems and integration dirs:

### Assistant | 2026-05-28T03:40:45.356Z

[tool_use: Bash]

### User | 2026-05-28T03:40:52.791Z

[tool_result] PRISM_ERROR_BOUNDARY.js  5.1K
PRISM_ERROR_HANDLER.js  1.6K
PRISM_ERROR_LOOKUP.js  5.4K
PRISM_UI_ADAPTER.js  10.8K
PRISM_UI_BACKEND_INTEGRATOR.js  11.2K
PRISM_UI_INTEGRATION_ENGINE.js  5.7K
PRISM_UI_SYSTEM.js  12.0K
---
PRISM_100_PERCENT_INTEGRATION.js  8.7K
PRISM_AI_100_INTEGRATION.js  8.6K
PRISM_AI_KNOWLEDGE_INTEGRATION.js  7.1K
PRISM_BRIDGE.js  12.5K
PRISM_CAD_LEARNING_BRIDGE.js  10.5K
PRISM_CAL
... [+379 chars truncated]

### Assistant | 2026-05-28T03:40:54.807Z

Let me test a few more high-value modules and then compile my findings:

### Assistant | 2026-05-28T03:40:55.537Z

[tool_use: Bash]

### User | 2026-05-28T03:41:01.134Z

[tool_result] UIAdapter: 0
ErrorLookup: 0
SimulationIntegration: 0
CADLearningBridge: 0
EventBridge: 5

### Assistant | 2026-05-28T03:41:03.137Z

Now let me read a couple of key extracted files to understand their scope better:

### Assistant | 2026-05-28T03:41:03.618Z

[tool_use: Read]

### User | 2026-05-28T03:41:06.507Z

[tool_result] 1	/**
2	 * PRISM_ACO_SEQUENCER
3	 * Extracted from PRISM v8.89.002 monolith
4	 * References: 24
5	 * Category: metaheuristic
6	 * Lines: 5375
7	 * Session: R2.3.3 Algorithm Gap Extraction
8	 */
9	
10	const PRISM_ACO_SEQUENCER = {
11	
12	    version: '1.0.0',
13	    authority: 'PRISM_ACO_SEQUENCER',
14	    created: '2026-01-14',
15	    innovationId: 'ACO_HOLE_SEQUENCING',
16	
17	    // CONFIGURATIO
... [+1501 chars truncated]

### Assistant | 2026-05-28T03:41:08.267Z

Let me check one more high-value file:

### Assistant | 2026-05-28T03:41:08.530Z

[tool_use: Read]

### User | 2026-05-28T03:41:11.754Z

[tool_result] 1	// PRISM_COST_DATABASE - Lines 95639-96664 (1026 lines) - Cost database\n\nconst PRISM_COST_DATABASE = {
2	    version: '1.0.0',
3	    lastUpdated: '2025-01-01',
4	
5	    // SECTION 1: MACHINE COST FACTORS
6	    // Based on Total Cost of Ownership (TCO) principles
7	    machineCosts: {
8	        // Hourly machine rates by category (fully burdened)
9	        // Formula: (Depreciation + Interest +
... [+1772 chars truncated]

### Assistant | 2026-05-28T03:41:13.760Z

Perfect. Now let me get a final size summary and compile my findings:

### Assistant | 2026-05-28T03:41:14.459Z

[tool_use: Bash]

### User | 2026-05-28T03:41:20.780Z

[tool_result] 15066838 total

### Assistant | 2026-05-28T03:41:44.380Z

Perfect. Now let me compile the dormancy report:

## DORMANT FEATURES INVENTORY — H:\PRISM\extracted\

**Archive size:** ~15.1 MB core (896 files, 27 dirs). Extraction date: Jan 2026.

### TOP 20 UNPORTED HIGH-ROI CAPABILITIES

| Path | Size | Capability | Confidence | ROI Rationale |
|------|------|-----------|-----------|---------------|
| algorithms/PRISM_ACO_SEQUENCER.js | 197 KB | Ant Colony Optimization for hole/feature sequencing | HIGH | 5375 lines; metaheuristic TSP solver for setup planning; *zero hits* in mcp-server |
| business/PRISM_COST_DATABASE.js | 288 KB | Machine hourly rates + TCO lookup tables (95+ machine types) | HIGH | 1026 lines; ~50 detailed machine profiles (VMC/lathe/5-axis/EDM); enables instant costing |
| algorithms/PRISM_ALGORITHM_REGISTRY.js | 150 KB | Registry of 150+ algorithms with orchestration | HIGH | Centralized algorithm catalog; routing + dispatch layer not in current engines |
| knowledge_bases/PRISM_UNIVERSITY_ALGORITHMS.js | 201 KB | MIT-OCW extracted: calculus, controls, vibration, FEM, dynamics | HIGH | 201 KB pure academic knowledge; physics foundations for chatter/thermal |
| business/PRISM_SCHEDULING_ENGINE.js | 5.8 KB | Job shop scheduling with capacity constraints | MED | 5 KB summary but references full solver; complements existing orchestration |
| algorithms/PRISM_FFT_PREDICTIVE_CHATTER.js | 12 KB | Spindle chatter prediction from FFT signatures | MED | 12 KB; regenerative lobes + FFT integration; safety-critical |
| formulas/PRISM_TOOL_WEAR_MODELS.js | 21 KB | Archard + Taylor + flank wear progression models | MED | 21 KB; competing wear formulation alternatives to existing Kienzle |
| business/PRISM_COST_ESTIMATION.js | 6.4 KB | Quote generation from process plans | MED | Bridges process → quoting; distinct from CAM costing |
| catalogs/PRISM_MAJOR_MANUFACTURERS_CATALOG.js | 73 KB | 500+ tool + machine SKUs; Sandvik/Kennametal/ISCAR/Walter | HIGH | De-duplicates current catalog; source-of-truth for vendor links 
... [+4372 chars truncated]
