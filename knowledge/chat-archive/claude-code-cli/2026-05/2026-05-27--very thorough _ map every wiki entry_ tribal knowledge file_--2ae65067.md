---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ae65067-e11d-4499-80a6-c81da270c373"
title: "very thorough — map every wiki entry, tribal knowledge file, and Obsidian memory"
date: "2026-05-27"
first_ts: "2026-05-27T13:49:29.732Z"
last_ts: "2026-05-27T14:23:24.295Z"
cwd: "H:\\PRISM"
messages: 97
user_msgs: 44
assistant_msgs: 53
raw_file: "H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-a1f83afcde2543173.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# very thorough — map every wiki entry, tribal knowledge file, and Obsidian memory

> **claude-code-cli** | 2026-05-27 | 97 msgs (44 user / 53 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-a1f83afcde2543173.jsonl`

## Transcript

### User | 2026-05-27T13:49:29.732Z

very thorough — map every wiki entry, tribal knowledge file, and Obsidian memory entry in PRISM that relates to the Speed-Feed Calculator (SFC) domain. Goal: a path-with-1-line-role manifest for oscar's future SFC searches.

Search scope:
- `H:/prism/knowledge/wiki/` (Karpathy LLM-wiki; 700+ entries)
- `H:/prism/knowledge/wiki/index.md` (catalog — read this first; grep for sfc/speed/feed/Kienzle/chatter/HSMAdvisor/G-Wizard/vendor/baseline/MRR)
- `H:/prism/knowledge/tribal/` (tribal-knowledge surface, 2000+ files)
- `H:/prism/knowledge/memories/feedback/` (standing-doctrine memory entries)
- `H:/prism/knowledge/memories/reference/` (point-in-time memory entries)
- `H:/prism/knowledge/memories/project/` (milestone snapshots)
- `C:/Users/wompu/.claude/projects/H--prism/memory/` (the live Obsidian memory namespace — feedback_*, reference_*, project_*)

Categories to enumerate (use Glob + Grep — keywords: sfc, "speed feed", "speed-feed", "speed_feed", NineAxis, Kienzle, Taylor, "tool life", chatter, HSMAdvisor, "G-Wizard", "GWizard", MRR, baseline, vendor, SLD, "stability lobe", "Altintas", "Tlusty", "feed per tooth", "cutting speed", spindle, rpm):

1. **Wiki entries** in `knowledge/wiki/architecture/`, `knowledge/wiki/architecture/tests/`, `knowledge/wiki/concepts/`, `knowledge/wiki/decisions/`, `knowledge/wiki/patterns/`, `knowledge/wiki/lessons/`, `knowledge/wiki/code-tribal/`, `knowledge/wiki/software-engineering/`, `knowledge/wiki/reference/`. Path + 1-line topic.

2. **Tribal knowledge files** that reference SFC topics — controller tips (camworks, hyperMILL, Mastercam, etc.), shop-floor wisdom on speeds/feeds, chip control, surface finish.

3. **Memory entries** (Obsidian namespace at `C:/Users/wompu/.claude/projects/H--prism/memory/`):
   - `reference_oscar_sfc_*.md` (slot:oscar's session references)
   - Any `feedback_*` related to speed/feed doctrine
   - Any `reference_*` keyed on SFC milestones (U-OSC9-*, OSCAR-SFC-9AXIS-MS0)
   - Any `project_*` snapshots ta
... [+615 chars truncated]

### Assistant | 2026-05-27T13:49:51.751Z

I'll conduct a thorough search of PRISM's knowledge base for Speed-Feed Calculator (SFC) domain content. Let me start systematically.

### Assistant | 2026-05-27T13:49:52.191Z

[tool_use: Read]

### Assistant | 2026-05-27T13:49:52.193Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.524Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.636Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.925Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:53.769Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:53.771Z

[tool_use: Glob]

### User | 2026-05-27T13:51:24.880Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-205 of 1414 total (102121 tokens, cap 25000). Call Read with offset=206 limit=205 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	---
2	title: PRISM Wiki Index
3	category: meta
4	last_verified: 2026-05-08
5	author: hybrid
6	---
7	
8	#
... [+41094 chars truncated]

### User | 2026-05-27T13:51:26.425Z

[tool_result] knowledge\memories\project\forge_audit_2026-05-10T04-42-31-053Z.md
knowledge\memories\project\forge_audit_2026-05-10T04-43-31-605Z.md
knowledge\memories\project\forge_audit_2026-05-10T04-49-28-463Z.md
knowledge\memories\project\forge_audit_2026-05-10T05-05-42-899Z.md
knowledge\memories\project\forge_audit_2026-05-10T06-53-25-258Z.md
knowledge\memories\project\forge_audit_2026-05-10T06-53-45-082Z.m
... [+1623 chars truncated]

### User | 2026-05-27T13:51:26.476Z

[tool_result] knowledge\memories\feedback\feedback_d2_bom_smoke.md
knowledge\memories\feedback\feedback_d2_smoke.md
knowledge\memories\feedback\feedback_atcs.md
knowledge\memories\feedback\feedback_lathe_audit_2026_05_05.md
knowledge\memories\feedback\feedback_obsidian_brain.md
knowledge\memories\feedback\feedback_pick_unit_routing.md
knowledge\memories\feedback\feedback_prism_os.md
knowledge\memories\feedback\
... [+6100 chars truncated]

### User | 2026-05-27T13:51:26.506Z

[tool_result] knowledge\tribal\auto-ingested-quarantine\auto-ingested-tips-auto-5005.md
knowledge\tribal\auto-ingested-quarantine\auto-ingested-tips-auto-5006.md
knowledge\tribal\auto-ingested-quarantine\auto-ingested-tips-auto-5007.md
knowledge\tribal\auto-ingested-quarantine\auto-ingested-tips-auto-5008.md
knowledge\tribal\auto-ingested-quarantine\auto-ingested-tips-auto-5009.md
knowledge\tribal\auto-ingested
... [+7072 chars truncated]

### User | 2026-05-27T13:51:26.522Z

[tool_result] C:\Users\wompu\.claude\projects\H--prism\memory\feedback_d2_smoke.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_d2_bom_smoke.md
C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY-ARCHIVE.md.cmptmp-21284-1779144772436
C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY-ARCHIVE.md.cmptmp-56452-1779153514291
C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY.md.cmptmp-45396-1
... [+8864 chars truncated]

### User | 2026-05-27T13:51:26.570Z

[tool_result] knowledge\memories\reference\node_algorithm_alg_adaptivecontrollermodel.md
knowledge\memories\reference\node_algorithm_alg_anomalydetector.md
knowledge\memories\reference\node_algorithm_alg_antcolonytsp.md
knowledge\memories\reference\node_algorithm_alg_bayesianoptimizer.md
knowledge\memories\reference\node_algorithm_alg_bayesianwearmodel.md
knowledge\memories\reference\node_algorithm_alg_chipbrea
... [+6397 chars truncated]

### User | 2026-05-27T13:51:27.002Z

[tool_result] knowledge\wiki\consensus\f01d0ccc.md
knowledge\wiki\lessons\cad-blueprint-revolve-2475-037.md
knowledge\wiki\lessons\cad-fusion-live-ms0-integration-discovery.md
knowledge\wiki\lessons\cad-fusion-live-ms0-h-drive-archaeology.md
knowledge\wiki\architecture\system-viz.md
knowledge\wiki\entities\jm-die-program-catalog.md
knowledge\wiki\code-tribal\canonical\hypermill-contour-milling-milling-open-and-
... [+8596 chars truncated]

### Assistant | 2026-05-27T13:51:39.629Z

Now let me search strategically for SFC-related content using grep on the index and then targeted searches.

### Assistant | 2026-05-27T13:51:41.442Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:51:42.743Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:51:42.747Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:51:42.749Z

[tool_use: Bash]

### User | 2026-05-27T13:52:28.689Z

[tool_result] 31:- [[AttractorDetection]] — AttractorDetectionEngine — Dynamical Systems Stability Analysis | category:concepts | sources:1 | confidence:0.7 | last_verified:2026-05-08 | source:src/engines/AttractorDetectionEngine.ts
89:- [[CAMBaselineRegressor]] — CAMBaselineRegressorEngine — U-CAM-ML-04 | category:concepts | sources:1 | confidence:0.7 | last_verified:2026-05-08 | source:src/engines/CAMBaseline
... [+2141 chars truncated]

### User | 2026-05-27T13:52:29.154Z

[tool_result] Found 50 files limit: 50
knowledge\memories\reference\reference_zpsn02_souls_filled_2026_05_23.md
knowledge\memories\reference\reference_whiskey_lathe_corpus_state_2026_05_27_iter42.md
knowledge\memories\reference\reference_whiskey_lathe_corpus_state_2026_05_27_iter101.md
knowledge\memories\reference\reference_whiskey_academy_lathe_bridge_2026_05_26.md
knowledge\memories\reference\reference_viz_fi
... [+3498 chars truncated]

### User | 2026-05-27T13:57:28.749Z

[tool_result] Command running in background with ID: b4uhhuhsu. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\6523f922-a3aa-4a21-908d-5e97e7e58de3\tasks\b4uhhuhsu.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-27T14:03:13.466Z

[tool_result] Command running in background with ID: bnlwb3hyo. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\6523f922-a3aa-4a21-908d-5e97e7e58de3\tasks\bnlwb3hyo.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-27T14:03:17.266Z

Let me read those background task results and continue the targeted search.

### Assistant | 2026-05-27T14:03:17.340Z

[tool_use: Read]

### Assistant | 2026-05-27T14:03:17.982Z

[tool_use: Read]

### Assistant | 2026-05-27T14:03:18.801Z

[tool_use: Bash]

### Assistant | 2026-05-27T14:03:19.096Z

[tool_use: Grep]

### User | 2026-05-27T14:03:45.927Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-27T14:03:46.099Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-27T14:09:24.714Z

[tool_result] Command running in background with ID: bue4xjr34. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\6523f922-a3aa-4a21-908d-5e97e7e58de3\tasks\bue4xjr34.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-27T14:10:06.521Z

[tool_result] Found 28 files
knowledge\wiki\architecture\domain-other.md
knowledge\wiki\architecture\layer-l8.md
knowledge\wiki\architecture\layer-l1.md
knowledge\wiki\architecture\tests-index.md
knowledge\wiki\architecture\tests\sf\sfcespritapplyengine.md
knowledge\wiki\architecture\datacat\sandvik-tool-catalog.md
knowledge\wiki\architecture\datacat\sandvik-2022-tool-catalog.md
knowledge\wiki\architecture\data
... [+1252 chars truncated]

### Assistant | 2026-05-27T14:10:13.689Z

Excellent—I've found the SFC test entries in the wiki. Let me now read those SFC test files and the reference memory entries for oscar.

### Assistant | 2026-05-27T14:10:13.842Z

[tool_use: Read]

### Assistant | 2026-05-27T14:10:15.207Z

[tool_use: Read]

### Assistant | 2026-05-27T14:10:15.211Z

[tool_use: Read]

### Assistant | 2026-05-27T14:10:15.382Z

[tool_use: Read]

### Assistant | 2026-05-27T14:10:15.460Z

[tool_use: Read]

### system

... [17 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T14:18:51.419Z

[tool_use: Read]

### Assistant | 2026-05-27T14:18:51.825Z

[tool_use: Read]

### Assistant | 2026-05-27T14:18:52.419Z

[tool_use: Read]

### Assistant | 2026-05-27T14:18:52.894Z

[tool_use: Read]

### Assistant | 2026-05-27T14:18:53.036Z

[tool_use: Read]

### User | 2026-05-27T14:19:07.242Z

[tool_result] 1	---
2	title: Test — sfcInferenceGateWireEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/engines/sfcInferenceGateWireEngine.test.ts
6	group: _sf
7	target: sfcInferenceGateWireEngine
8	milestone: PSAU-PPG-SFC U-PPG-SFC-05
9	it_count: 18
10	expect_count: 60
11	line_count: 456
12	generated_by: scripts/generate-test-wiki.mjs
13	last_verified: 2026-05-11
14	tags:
... [+1710 chars truncated]

### User | 2026-05-27T14:19:07.246Z

[tool_result] 1	---
2	title: Test — sfcMultiHypothesisRankerEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/engines/sfcMultiHypothesisRankerEngine.test.ts
6	group: _sf
7	target: sfcMultiHypothesisRankerEngine
8	it_count: 40
9	expect_count: 106
10	line_count: 650
11	generated_by: scripts/generate-test-wiki.mjs
12	last_verified: 2026-05-11
13	tags: [architecture, system-viz,
... [+1722 chars truncated]

### User | 2026-05-27T14:19:07.276Z

[tool_result] 1	---
2	title: Test — sfcProvenanceWireEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/engines/sfcProvenanceWireEngine.test.ts
6	group: _sf
7	target: sfcProvenanceWireEngine
8	it_count: 33
9	expect_count: 178
10	line_count: 635
11	generated_by: scripts/generate-test-wiki.mjs
12	last_verified: 2026-05-11
13	tags: [architecture, system-viz, test, sf, sfcprovena
... [+1697 chars truncated]

### User | 2026-05-27T14:19:07.370Z

[tool_result] 1	---
2	title: Test — sfcOutcomeCaptureWireEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/engines/sfcOutcomeCaptureWireEngine.test.ts
6	group: _sf
7	target: sfcOutcomeCaptureWireEngine
8	it_count: 15
9	expect_count: 84
10	line_count: 366
11	generated_by: scripts/generate-test-wiki.mjs
12	last_verified: 2026-05-11
13	tags: [architecture, system-viz, test, sf,
... [+1693 chars truncated]

### User | 2026-05-27T14:19:07.709Z

[tool_result] 1	H:/prism/knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5000.md
2	H:/prism/knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5014.md
3	H:/prism/knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5024.md
4	H:/prism/knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5026.md
5	H:/prism/knowledge/tribal/auto-ingested-quarantine/auto-in
... [+2259 chars truncated]

### Assistant | 2026-05-27T14:19:14.597Z

Let me read a few of the tribal knowledge files and then compile the manifest.

### Assistant | 2026-05-27T14:19:14.598Z

[tool_use: Read]

### Assistant | 2026-05-27T14:19:14.599Z

[tool_use: Read]

### Assistant | 2026-05-27T14:19:14.600Z

[tool_use: Read]

### Assistant | 2026-05-27T14:19:14.801Z

[tool_use: Bash]

### User | 2026-05-27T14:19:31.279Z

[tool_result] 1	---
2	id: "bc-001"
3	title: "Adaptive Roughing Maintains Constant Tool Engagement"
4	source: "web:bobcad-adaptive-roughing"
5	confidence: 93
6	category: "cam_strategy"
7	tags: ["adaptive-roughing", "trochoidal", "constant-engagement", "tool-life", "mrr"]
8	_source: "bobcad-cam-tips.ts"
9	indexed_at: 2026-04-28T01:00:41.444Z
10	---
11	
12	# Adaptive Roughing Maintains Constant Tool Engagement
13	
... [+1034 chars truncated]

### User | 2026-05-27T14:19:31.565Z

[tool_result] 1	---
2	id: "auto-5000"
3	title: "hyperMILL Horizontal"
4	source: "auto:extracted"
5	confidence: 80
6	category: "cam_strategy"
7	tags: ["auto-ingested"]
8	_source: "auto-ingested-tips.ts"
9	indexed_at: 2026-05-12T16:16:39.385Z
10	---
11	
12	# hyperMILL Horizontal
13	
14	Fixed step: The value defined under Lateral infeed area for the lateral infeed is retained. The value of the | Workflow: Select s
... [+533 chars truncated]

### User | 2026-05-27T14:19:31.590Z

[tool_result] 1	---
2	id: "bc-016"
3	title: "Chamfer Milling with Depth and Width Control"
4	source: "web:bobcad-chamfer"
5	confidence: 87
6	category: "cam_strategy"
7	tags: ["chamfer", "edge-breaking", "depth-control", "3d-chamfer"]
8	_source: "bobcad-cam-tips.ts"
9	indexed_at: 2026-04-28T01:00:41.456Z
10	---
11	
12	# Chamfer Milling with Depth and Width Control
13	
14	BobCAD chamfer milling supports chamfer m
... [+912 chars truncated]

### User | 2026-05-27T14:20:50.702Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/adaptivecontrol/adaptive-chatter-analyze.md
H:/prism/knowledge/wiki/architecture/actions/adaptivecontrol/adaptive-feed-tune.md
H:/prism/knowledge/wiki/architecture/actions/adaptivecontrol/adaptive-feed.md
H:/prism/knowledge/wiki/architecture/actions/adaptivecontrol/adaptive-spindle-chatter.md
H:/prism/knowledge/wiki/architecture/actions/adaptivecontrol/
... [+2091 chars truncated]

### Assistant | 2026-05-27T14:20:59.253Z

Perfect. Let me read a few more key SFC action files and then compile the comprehensive manifest.

### Assistant | 2026-05-27T14:20:59.684Z

[tool_use: Read]

### Assistant | 2026-05-27T14:20:59.909Z

[tool_use: Read]

### Assistant | 2026-05-27T14:21:00.222Z

[tool_use: Read]

### Assistant | 2026-05-27T14:21:00.357Z

[tool_use: Read]

### Assistant | 2026-05-27T14:21:00.629Z

[tool_use: Read]

### User | 2026-05-27T14:21:24.323Z

[tool_result] 1	---
2	title: aiReasoning:ai_resource_speed_feed
3	type: action
4	action_id: disp.aireasoningdispatcher.action.ai_resource_speed_feed
5	dispatcher: aiReasoning
6	action_name: ai_resource_speed_feed
7	parent_layer: L4a
8	generated_by: scripts/generate-action-wiki.mjs
9	last_verified: 2026-05-18
10	tags: [action, dispatcher-aireasoning, ai_intel]
11	related:
12	  - knowledge/wiki/architecture/dispa
... [+761 chars truncated]

### User | 2026-05-27T14:21:24.362Z

[tool_result] 1	---
2	title: aiReasoning:ppg_sfc_closed_loop
3	type: action
4	action_id: disp.aireasoningdispatcher.action.ppg_sfc_closed_loop
5	dispatcher: aiReasoning
6	action_name: ppg_sfc_closed_loop
7	parent_layer: L4a
8	generated_by: scripts/generate-action-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [action, dispatcher-aireasoning, ai_intel]
11	related:
12	  - knowledge/wiki/architecture/dispatcher-air
... [+739 chars truncated]

### User | 2026-05-27T14:21:24.427Z

[tool_result] 1	---
2	title: aiReasoning:sfc_drift_canary_check
3	type: action
4	action_id: disp.aireasoningdispatcher.action.sfc_drift_canary_check
5	dispatcher: aiReasoning
6	action_name: sfc_drift_canary_check
7	parent_layer: L4a
8	generated_by: scripts/generate-action-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [action, dispatcher-aireasoning, ai_intel]
11	related:
12	  - knowledge/wiki/architecture/dispa
... [+760 chars truncated]

### User | 2026-05-27T14:21:24.452Z

[tool_result] 1	---
2	title: adaptiveControl:tool_life_predict
3	type: action
4	action_id: disp.adaptivecontroldispatcher.action.tool_life_predict
5	dispatcher: adaptiveControl
6	action_name: tool_life_predict
7	parent_layer: L4a
8	generated_by: scripts/generate-action-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [action, dispatcher-adaptivecontrol, manufacturing]
11	related:
12	  - knowledge/wiki/architecture
... [+775 chars truncated]

### User | 2026-05-27T14:21:25.233Z

[tool_result] 1	---
2	title: Domain — other
3	type: architecture
4	domain: other
5	parent_layer: L5
6	generated_by: scripts/generate-domain-wiki.mjs
7	last_verified: 2026-05-11
8	tags: [architecture, system-viz, engine-domain, domain-other]
9	related:
10	  - knowledge/wiki/architecture/layer-l5.md
11	  - knowledge/wiki/architecture/layer-l4.md
12	  - state/shared/system-viz/system-graph.json
13	---
14	
15	# Eng
... [+4081 chars truncated]

### Assistant | 2026-05-27T14:21:30.410Z

Now let me search for the remaining SFC engine wiki entries and compile the final manifest.

### Assistant | 2026-05-27T14:21:31.101Z

[tool_use: Bash]

### Assistant | 2026-05-27T14:21:31.561Z

[tool_use: Read]

### Assistant | 2026-05-27T14:21:31.733Z

[tool_use: Read]

### Assistant | 2026-05-27T14:21:32.159Z

[tool_use: Read]

### User | 2026-05-27T14:22:54.635Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/aireasoning/ai-resource-speed-feed.md
H:/prism/knowledge/wiki/architecture/actions/aireasoning/xproc-neural-consult-speedfeed.md
H:/prism/knowledge/wiki/architecture/actions/calc/auto-speed-feed-calc.md
H:/prism/knowledge/wiki/architecture/actions/calc/cam-speed-feed-bridge.md
H:/prism/knowledge/wiki/architecture/actions/calc/proven-speed-feed-aggregate
... [+2678 chars truncated]

### User | 2026-05-27T14:22:59.468Z

[tool_result] 1	---
2	title: Test — SFCParameterRefinementEngine.test.ts
3	type: test
4	kind: test
5	test_path: mcp-server/src/__tests__/SFCParameterRefinementEngine.test.ts
6	group: _sf
7	target: SFCParameterRefinementEngine
8	it_count: 13
9	expect_count: 52
10	line_count: 393
11	generated_by: scripts/generate-test-wiki.mjs
12	last_verified: 2026-05-22
13	tags: [architecture, system-viz, test, sf, sfcparameter
... [+1815 chars truncated]

### User | 2026-05-27T14:22:59.499Z

[tool_result] 1	---
2	title: Test — sfcRAGWarmStartEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/engines/sfcRAGWarmStartEngine.test.ts
6	group: _sf
7	target: sfcRAGWarmStartEngine
8	milestone: PSAU-PPG-SFC U-PPG-SFC-07
9	it_count: 32
10	expect_count: 69
11	line_count: 525
12	generated_by: scripts/generate-test-wiki.mjs
13	last_verified: 2026-05-11
14	tags: [architecture,
... [+1667 chars truncated]

### User | 2026-05-27T14:22:59.541Z

[tool_result] 1	---
2	title: Test — PPGSFCClosedLoopOrchestratorEngine.test.ts
3	type: architecture
4	kind: test
5	test_path: mcp-server/src/__tests__/PPGSFCClosedLoopOrchestratorEngine.test.ts
6	group: _pp
7	target: PPGSFCClosedLoopOrchestratorEngine
8	it_count: 17
9	expect_count: 54
10	line_count: 349
11	generated_by: scripts/generate-test-wiki.mjs
12	last_verified: 2026-05-11
13	tags: [architecture, system-v
... [+1659 chars truncated]

### Assistant | 2026-05-27T14:23:24.295Z

Perfect. Now I have comprehensive coverage. Let me compile the final manifest for oscar's SFC searches.

---

# SFC Domain Manifest — PRISM Knowledge Base

## Wiki Entries (Architecture Tests & Actions)

### SFC Core Engine Tests
- H:/prism/knowledge/wiki/architecture/tests/sf/sfccalculateengine.md: Surface finish calculation for turning/milling Ra/Rz/Rt formulas
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcdriftcanaryengine.md: Page-Hinkley drift detection for SFC parameter stability (U-PPG-SFC-11)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcfewshotnewmaterialengine.md: Few-shot adaptation for new materials <500ms quote-path MAE (U-PPG-SFC-13)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcmultihypothesisrankerengine.md: Bayesian ranking of SFC candidates by hypothesis source (U-PPG-SFC-09)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcinferencegatewireengine.md: LoRA gate wrapping SFC outputs for adapter fallback (U-PPG-SFC-05)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcprovenancewireengine.md: Kienzle/Taylor formula citation engine (ISO P/M/K/N/S group coverage)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcoutcomecapturewireengine.md: Outcome capture normalizer for feedRate/spindleRpm aliases
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcragwarmstartengine.md: Historical prior retrieval by material/machine/operation context (U-PPG-SFC-07)
- H:/prism/knowledge/wiki/architecture/tests/sf/sfcparameterrefinementengine.md: SFM factor refinement via feedback bus evidence (U-BRIDGE-LEARN-SFC)
- H:/prism/knowledge/wiki/architecture/tests/pp/ppgsfcclosedlooporchestratorengine.md: 8-phase closed-loop orchestrator (chatter feedback, override capture)

### SFC Dispatcher Actions
- H:/prism/knowledge/wiki/architecture/actions/calc/speed-feed.md: Base speed-feed action
- H:/prism/knowledge/wiki/architecture/actions/calc/auto-speed-feed-calc.md: Auto SFC calculator
- H:/prism/knowledge/wiki/architecture/actions/calc/cam-speed-feed-bridge
... [+4356 chars truncated]
