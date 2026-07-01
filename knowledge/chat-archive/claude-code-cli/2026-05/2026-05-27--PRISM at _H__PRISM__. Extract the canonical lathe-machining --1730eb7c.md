---
type: "chat-session"
source: "claude-code-cli"
session_id: "1730eb7c-9196-4e9b-856c-4f2a7414724d"
title: "PRISM at `H:/PRISM/`. Extract the canonical lathe-machining ORDER OF OPERATIONS "
date: "2026-05-27"
first_ts: "2026-05-27T19:59:57.231Z"
last_ts: "2026-05-27T20:03:18.625Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 20
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-ab22b07a2f496373a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# PRISM at `H:/PRISM/`. Extract the canonical lathe-machining ORDER OF OPERATIONS 

> **claude-code-cli** | 2026-05-27 | 46 msgs (20 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-ab22b07a2f496373a.jsonl`

## Transcript

### User | 2026-05-27T19:59:57.231Z

PRISM at `H:/PRISM/`. Extract the canonical lathe-machining ORDER OF OPERATIONS for a print-to-program pipeline.

Search these surfaces for documented lathe operation sequencing rules:
1. **Tribal corpus** — `mcp-server/data/ingestion_cache/lathe-tribal-master-index-*.json`, `lathe-videos-tribal-*.json` (432 indexed videos). Look for operation-order patterns from Haas/Sandvik/PerformanceTooling/Dapra training.
2. **Wiki entries** — `knowledge/wiki/code-tribal/canonical/*-turning-*` and `knowledge/wiki/code-tribal/learnings/*-lathe-*`. Look for "turning workflow", "lathe operation order", "OP1/OP2 sequencing".
3. **JM-Die real programs** — sample 3-5 high-volume customer programs from `H:/PRISM/JM DIE/CNC LATHE/{ALCOA,CAMCAR,SFS,FONTANA,OPTIMAS}/` to extract the actual operation-tag patterns (NAT01, NAT02, etc. — what operations are these and what's the typical order?).
4. **Mazak/Okuma EIA training corpus** — `mcp-server/data/ingestion_cache/lathe-vendor-expansion-*.json` (14 vendors). Look for vendor-canonical sequencing.
5. **Engines that already encode sequencing**: search for `OperationSequenceEngine`, `LatheOperationSequencer`, `TurningOpsOrdering`, or any engine that takes feature list → ordered ops list.

Synthesize into a canonical lathe op-order pipeline (turning typically follows pattern: setup → face → rough OD → semi-finish OD → finish OD → groove → thread → drill → bore → part-off → secondary ops).

Then map each stage to:
- Which PRISM engine handles it (if any)
- Typical G-code blocks (G71 roughing, G70 finishing, G76 threading, G74 peck-drill, etc.)
- Common dialects (Fanuc 2-line G71+G70 vs Okuma single-line G71 with U/H/F)

Format: 10-12 numbered stages with engine + G-code mapping. Under 700 words.

### Assistant | 2026-05-27T20:00:08.692Z

I'll systematically search PRISM for canonical lathe operation sequencing rules across the identified surfaces.

### Assistant | 2026-05-27T20:00:08.807Z

[tool_use: Bash]

### User | 2026-05-27T20:00:15.668Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-27T20:00:17.697Z

Let me use the appropriate tools for this search task.

### Assistant | 2026-05-27T20:00:18.446Z

[tool_use: Glob]

### Assistant | 2026-05-27T20:00:18.454Z

[tool_use: Glob]

### Assistant | 2026-05-27T20:00:18.547Z

[tool_use: Glob]

### Assistant | 2026-05-27T20:00:18.824Z

[tool_use: Glob]

### User | 2026-05-27T20:00:28.897Z

[tool_result] knowledge\wiki\code-tribal\learnings\tsc-fix-u-tsc-lathe-kgraph.md
knowledge\wiki\code-tribal\learnings\backend-dev-loop-u-lathe-prog-opt-wire.md
knowledge\wiki\code-tribal\learnings\backend-dev-loop-u-wire-lathe-parting-clear.md
knowledge\wiki\code-tribal\learnings\feature-gap-audit-ms0-u-gap-lathe-live-tooling.md
knowledge\wiki\code-tribal\learnings\backend-dev-loop-u-wire-lathe-perf-slo.md
know
... [+1771 chars truncated]

### User | 2026-05-27T20:00:28.975Z

[tool_result] knowledge\wiki\code-tribal\canonical\contour-create-the-contour-for-the-turning-model-as-feature-.md
knowledge\wiki\code-tribal\canonical\a-turning-tool-on-the-tools-tab-in-the-lower-area-turning-to.md
knowledge\wiki\code-tribal\canonical\a-stockmodel-for-a-turning-job.md
knowledge\wiki\code-tribal\canonical\the-features-for-turning-operations.md
knowledge\wiki\code-tribal\canonical\a-turning-tool
... [+49 chars truncated]

### User | 2026-05-27T20:00:29.512Z

[tool_result] No files found

### User | 2026-05-27T20:00:41.346Z

[tool_result] No files found

### Assistant | 2026-05-27T20:00:48.164Z

Now let me search for operation sequencing engines and check the wiki files more directly:

### Assistant | 2026-05-27T20:00:48.171Z

[tool_use: Grep]

### Assistant | 2026-05-27T20:00:48.177Z

[tool_use: Read]

### Assistant | 2026-05-27T20:00:48.180Z

[tool_use: Glob]

### User | 2026-05-27T20:00:58.226Z

[tool_result] JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_GENOS_L300-M\132A04-0018-27.nc
JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_GENOS_L200E-M\132A04-0018-27.nc
JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_LNC8\132A04-0018-27.nc
JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_LB-3000EX\132A04-0018-27.nc
JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_LB-3000EX_II\132A04-0018-27.nc
JM DIE\CNC LATHE\ALCOA\PRISM_UPGRAD
... [+5155 chars truncated]

### User | 2026-05-27T20:01:00.286Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "the features for turning operations"
4	domain: "Turning"
5	version_state: Draft
6	confidence: 0.85
7	cluster_size: 1
8	canonical_sha256: 5507e266acaf095e
9	sources:
10	  - hm-tip-idi72f:5507e266acaf095e
11	extracted_via: tf-idf-cosine-0.8
12	extracted_at: 2026-05-09T02:29:30.482Z
13	---
14	## Question
15	
16	How do I the features for turning operations?
17	
1
... [+615 chars truncated]

### User | 2026-05-27T20:01:15.724Z

[tool_result] Found 86 files
scripts\merge-augmentations.mjs
scripts\__tests__\generate-bridge-priority-features.test.mjs
scripts\__tests__\unwired-bridge-rank.test.mjs
scripts\__tests__\render-combo-efficiency-dashboard.test.mjs
scripts\generate-bridge-priority-features.mjs
scripts\unwired-bridge-rank.mjs
scripts\render-combo-efficiency-dashboard.mjs
data\docker-volumes\grafana\plugins\grafana-metricsdrilldown
... [+4206 chars truncated]

### Assistant | 2026-05-27T20:01:18.520Z

I'll search for operation sequencing more strategically and examine actual program files.

### Assistant | 2026-05-27T20:01:19.423Z

[tool_use: Grep]

### Assistant | 2026-05-27T20:01:20.374Z

[tool_use: Read]

### Assistant | 2026-05-27T20:01:20.379Z

[tool_use: Glob]

### User | 2026-05-27T20:01:36.258Z

[tool_result] No files found

### User | 2026-05-27T20:01:41.345Z

[tool_result] 1	(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)
2	(  source: H:\PRISM\JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_Multus_B250II\132A04-0018-27.nc)
3	(  partNumber: 132A04-0018-27)
4	(  machineId: LTH-01)
5	(  machineModel: Okuma_GENOS_L300-M)
6	(  material: tool_steel)
7	(  iso_group: H)
8	(  RPM: 2095 confidence=0.75 source=calculated)
9	(  feedrate: 272 mm/min)
10	(  depthOfCut: 1.5 mm)
11	(  effe
... [+6639 chars truncated]

### User | 2026-05-27T20:01:51.781Z

[tool_result] Found 50 files limit: 50
mcp-server\web\src\data\youtube-picks.ts
mcp-server\web\src\components\learning\LessonView.tsx
mcp-server\web\src\components\wedm-studio\StepReview.tsx
mcp-server\web\src\App.tsx
mcp-server\web\src\data\employee-tracks.ts
web\src\pages\DashboardPage.tsx
mcp-server\src\engines\MillingPrintToProgramEngine.ts
mcp-server\web\src\components\sfc\AdvancedCharts.tsx
mcp-server\web
... [+2272 chars truncated]

### Assistant | 2026-05-27T20:02:02.206Z

Excellent! I found a real program. Let me extract more samples and search for the operation sequencing engines.

### Assistant | 2026-05-27T20:02:02.212Z

[tool_use: Read]

### Assistant | 2026-05-27T20:02:02.218Z

[tool_use: Read]

### Assistant | 2026-05-27T20:02:02.222Z

[tool_use: Glob]

### Assistant | 2026-05-27T20:02:02.751Z

[tool_use: Grep]

### User | 2026-05-27T20:02:08.910Z

[tool_result] mcp-server\src\engines\AcoSequencerEngine.ts
mcp-server\src\engines\OperationSequencerEngine.ts
mcp-server\src\engines\OperationSequenceMinerEngine.ts
mcp-server\src\engines\HyperMillSecondaryOpsSequencer.ts
mcp-server\src\engines\hypermill\CADSequenceLearningEngine.ts
mcp-server\src\engines\hypermill\FeatureSequenceReplicatorEngine.ts
mcp-server\src\engines\LatheSequenceOptimizerEngine.ts
mcp-ser
... [+374 chars truncated]

### User | 2026-05-27T20:02:10.436Z

[tool_result] 1	(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)
2	(  source: H:\PRISM\JM DIE\CNC LATHE\ALCOA\WAFER1314.MIN)
3	(  partNumber: WAFER1314)
4	(  machineId: LTH-01)
5	(  machineModel: Okuma_GENOS_L300-M)
6	(  material: tool_steel)
7	(  iso_group: H)
8	(  RPM: 2095 confidence=0.75 source=calculated)
9	(  feedrate: 272 mm/min)
10	(  depthOfCut: 1.5 mm)
11	(  effective SFM: 180)
12	(  physicsBackend: Ultima
... [+1371 chars truncated]

### User | 2026-05-27T20:02:10.618Z

[tool_result] 1	(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)
2	(  source: H:\PRISM\JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_Multus_B250II\HN-11.nc)
3	(  partNumber: HN-11)
4	(  machineId: LTH-01)
5	(  machineModel: Okuma_GENOS_L300-M)
6	(  material: tool_steel)
7	(  iso_group: H)
8	(  RPM: 2095 confidence=0.75 source=calculated)
9	(  feedrate: 272 mm/min)
10	(  depthOfCut: 1.5 mm)
11	(  effective SFM: 180)
12
... [+5835 chars truncated]

### User | 2026-05-27T20:02:30.254Z

[tool_result] Found 4 files
mcp-server\src\tools\dispatchers\dataDispatcher.ts
mcp-server\src\tools\schemas\boxAuditActionSchemas.ts
src\tools\schemas\boxAuditActionSchemas.ts
src\tools\dispatchers\dataDispatcher.ts

### Assistant | 2026-05-27T20:02:33.005Z

Perfect! Found the sequencing engines. Let me examine the key ones:

### Assistant | 2026-05-27T20:02:33.531Z

[tool_use: Read]

### Assistant | 2026-05-27T20:02:33.578Z

[tool_use: Read]

### Assistant | 2026-05-27T20:02:35.328Z

[tool_use: Read]

### Assistant | 2026-05-27T20:02:35.332Z

[tool_use: Grep]

### User | 2026-05-27T20:02:44.217Z

[tool_result] 1	/**
2	 * LATHE-PRO-MS3, U-LPS02
3	 * LatheSequenceOptimizerEngine — Multi-Criteria Operation Sequencing
4	 *
5	 * Optimizes operation order for turned parts using hard constraints + soft objectives.
6	 *
7	 * Hard constraints (NEVER violated):
8	 * - Face first (establishes Z datum)
9	 * - Cutoff/part-off last
10	 * - G96 (CSS) for turning/facing, G97 (RPM) for drilling/tapping
11	 * - Center dr
... [+15882 chars truncated]

### User | 2026-05-27T20:02:44.281Z

[tool_result] 1	/**
2	 * OperationSequencerEngine — Optimal Operation Ordering for Multi-Op CNC Programs
3	 *
4	 * Given N operations (rough, semi-finish, finish, deburr, drill, etc.), finds the
5	 * optimal execution sequence by combining:
6	 *   1. Dependency-aware topological sort (prerequisites + implicit rules)
7	 *   2. Greedy TSP approximation for tool-change minimization
8	 *   3. Thermal relaxation ins
... [+19615 chars truncated]

### User | 2026-05-27T20:02:45.413Z

[tool_result] Found 40 files limit: 40
mcp-server\src\engines\MillingPrintToProgramEngine.ts
mcp-server\src\engines\CurriculumEngine.ts
mcp-server\src\engines\KnowledgeCurriculumBridgeEngine.ts
mcp-server\src\engines\SmartToolSelectorEngine.ts
mcp-server\src\engines\MillTurnCAMEngine.ts
mcp-server\src\engines\ToolpathStrategyEngine.ts
mcp-server\src\engines\WEDMPostTypes.ts
mcp-server\src\engines\MonolithMajorM
... [+1845 chars truncated]

### User | 2026-05-27T20:02:47.989Z

[tool_result] 1	/**
2	 * LathePrintSequencePlannerEngine — U-LTH37 (LATHE-MASTER P4)
3	 *
4	 * From strategy plan → ordered operation sequence with:
5	 *   - Stock state tracking (diameter/length evolution)
6	 *   - Tool change minimization (group ops by tool)
7	 *   - Setup split detection (re-chuck / sub-spindle pickup)
8	 *   - Cycle-time prediction per operation
9	 *   - Precedence validation (center_drill 
... [+36739 chars truncated]

### Assistant | 2026-05-27T20:03:18.625Z

Perfect! I now have comprehensive data to synthesize the canonical lathe operation order. Let me compile the final report.

## CANONICAL LATHE OPERATION ORDER FOR PRINT-TO-PROGRAM PIPELINE

Based on analysis of PRISM's sequencing engines, real JM-Die customer programs, and precedence rules, here is the canonical 12-stage turning workflow:

### **STAGE BREAKDOWN**

**1. SETUP & FACE (NAT01 / OP10)**
- Engine: `LatheSequenceOptimizerEngine` (PRIORITY_TIER=1)
- Operations: Face the end, establish Z datum
- G-code: `G50 S600 M3; G96 S200; G1 X−0.04 F0.005` (Okuma CSS mode)
- Dialect: Fanuc G50 (spindle-limit) + G96 (CSS); Okuma integrates into NTURN cycles

**2. CENTER DRILL (NAT03 / OP10)**
- Engine: `LatheSequenceOptimizerEngine` (PRIORITY_TIER=2)
- Prerequisites: After face, before drill
- G-code: `G97 S800; G1 Z−0.15 F0.002` (RPM mode, center drill)
- Dialect: G97 mandatory for drilling; fixed RPM prevents chatter on small holes

**3. ROUGH OD TURNING (NAT01 / OP10)**
- Engine: `LathePrintSequencePlannerEngine` (category=rough, PRIORITY=4)
- Stock removal strategy: G85 NTURN (Okuma roughing macro); Fanuc uses G71 2-line format
- G-code (Okuma): `G85 NTURN D0.1 U0.1 W0.005 F0.01; NTURN G81` (stock reduction: 0.1 mm radial)
- G-code (Fanuc): `G71 P10 Q20 U0.1 W0.05 D1.5 F100` (P/Q = contour block range, U = stock allowance)
- Thermal note: High heat generation; requires cooldown before finish

**4. SEMI-FINISH OD (Optional, NAT02 / OP10)**
- Engine: Embedded in `OperationSequencerEngine` (FINISHING_TYPES detection)
- Purpose: Reduce thermal distortion before finish; allows tool warm-up
- G-code (Okuma): `G87 NTURN` (single-pass contour with lower DOC)
- Typical: 0.3−0.5 mm radial allowance left for finish

**5. FINISH OD TURNING (NAT02 / OP10)**
- Engine: `LatheSequenceOptimizerEngine` (PRIORITY_TIER=6 finish_od)
- Prerequisite: Rough OD must complete (thermal_relaxation_sec = 30s inserted)
- G-code (Okuma): `G87 NTURN` with tighter tolerances; `G40` cancel tool comp

... [+4802 chars truncated]
