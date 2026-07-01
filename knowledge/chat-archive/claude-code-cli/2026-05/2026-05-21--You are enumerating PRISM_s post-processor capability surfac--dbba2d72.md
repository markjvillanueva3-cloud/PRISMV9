---
type: "chat-session"
source: "claude-code-cli"
session_id: "dbba2d72-e7f8-4d04-877a-b7ff468c720b"
title: "You are enumerating PRISM's post-processor capability surface for a capability a"
date: "2026-05-21"
first_ts: "2026-05-21T18:58:45.243Z"
last_ts: "2026-05-21T19:13:34.504Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 28
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/dbba2d72-e7f8-4d04-877a-b7ff468c720b/subagents/agent-adb2e6e9615438451.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# You are enumerating PRISM's post-processor capability surface for a capability a

> **claude-code-cli** | 2026-05-21 | 63 msgs (28 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dbba2d72-e7f8-4d04-877a-b7ff468c720b/subagents/agent-adb2e6e9615438451.jsonl`

## Transcript

### User | 2026-05-21T18:58:45.243Z

You are enumerating PRISM's post-processor capability surface for a capability assessment. PRISM is a manufacturing-intelligence platform at H:/prism (MCP server in mcp-server/, ~2659 engines). A "post-processor" converts CAM toolpath output into machine-specific CNC G/M-code dialect.

Search breadth: very thorough. Report concisely — under 700 words total, structured. I need FACTS (file paths, engine names, dispatcher action names, line counts), not prose.

Enumerate exactly these 6 things:

1. **Post-processor ENGINES** — find every engine whose name contains Post/PPG/MasterPost/Controller-dialect. Check `mcp-server/data/docs/ENGINE_DIGEST.md` first (it has 1-line descriptions). List each: name, 1-line purpose, approx file size in `mcp-server/src/engines/`. Specifically locate: PostProcessorGeneratorEngine, PRISMPostProcessorGenerator (if exists), MasterPostGeneratorEngine, MasterPostProcessorEngine, AdvancedPostProcessorEngine, any LathePostGen/LatheMasterPost engines, PostProcessorVideoKnowledgeNeuralEngine.

2. **Dispatcher ACTIONS** — in `mcp-server/data/docs/DISPATCHER_DIGEST.md` and the dispatcher tool descriptions, list the post-processor action families: `prism_cam` actions starting `post_` and `master_post_` and `pp_` and `cps_`; `prism_product` actions starting `ppg_`; `prism_cam` `lathe_masterpost_*` and `lathe_post*`. Just give the action-name families + rough counts, not every single action.

3. **The "enhanced ones from a few weeks ago"** — run `git -C H:/prism log --oneline --since="2026-04-25" --until="2026-05-21" -- "*Post*" "*post*"` style search (or grep git log for POST/PPG milestone scopes). Identify any post-processor milestone work in late April / early May 2026 — milestone IDs like PPG-WIRE-MS0, POST-*, MASTER-POST-*, lathe-masterpost. Report the milestone IDs + what shipped.

4. **JM Die post processors** — search the `JM DIE/` archive directory and any jm-die-profile references for actual post-processor files (.pst, .cps, controller confi
... [+687 chars truncated]

### Assistant | 2026-05-21T18:59:04.434Z

I'll conduct a thorough enumeration of PRISM's post-processor capability surface. Let me start by searching the key reference documents and source directories.

### Assistant | 2026-05-21T18:59:04.653Z

[tool_use: Read]

### Assistant | 2026-05-21T18:59:04.864Z

[tool_use: Read]

### Assistant | 2026-05-21T18:59:05.501Z

[tool_use: Bash]

### Assistant | 2026-05-21T18:59:05.765Z

[tool_use: Bash]

### User | 2026-05-21T18:59:10.196Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**97 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-21 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **11265**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|-----
... [+10641 chars truncated]

### User | 2026-05-21T18:59:10.701Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-598 of 3222 total (114326 tokens, cap 25000). Call Read with offset=599 limit=598 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries f
... [+43969 chars truncated]

### User | 2026-05-21T18:59:18.912Z

[tool_result] mcp-server/src/engines/AdvancedPostPhysicsEngine.ts
mcp-server/src/engines/AdvancedPostProcessorEngine.ts
mcp-server/src/engines/AutoPostmortemEngine.ts
mcp-server/src/engines/BlamelessPostMortemEngine.ts
mcp-server/src/engines/CAMAGIMasterOrchestratorEngine.ts
mcp-server/src/engines/CAMPostInvokeOrchestratorEngine.ts
mcp-server/src/engines/CAMPostSelectorUIEngine.ts
mcp-server/src/engines/CpsPost
... [+2391 chars truncated]

### User | 2026-05-21T18:59:41.371Z

[tool_result] ed1ff032c7 [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (sl...

### Assistant | 2026-05-21T18:59:43.517Z

I'll continue the enumeration systematically. Let me search for more specific post-processor related information.

### Assistant | 2026-05-21T18:59:44.178Z

[tool_use: Bash]

### Assistant | 2026-05-21T18:59:44.817Z

[tool_use: Bash]

### Assistant | 2026-05-21T18:59:45.059Z

[tool_use: Glob]

### Assistant | 2026-05-21T18:59:45.714Z

[tool_use: Bash]

### User | 2026-05-21T19:00:19.547Z

[tool_result] | ppDispatcher | prism_pp — PostProcessor dispatcher — G-code generation, optimizatio... | 801 |
| productDispatcher | prism_product — Product tools: SFC (surface finish calc), PPG (post proce... | 76 |

### User | 2026-05-21T19:00:45.390Z

[tool_result] 117
AdvancedPostPhysicsEngine.ts
AdvancedPostProcessorEngine.ts
AutoPostmortemEngine.ts
BlamelessPostMortemEngine.ts
CAMPostInvokeOrchestratorEngine.ts
CAMPostSelectorUIEngine.ts
CpsPostParserEngine.ts
CrossCAMPostEngine.ts
EDMPostProcessGCodeEngine.ts
EDMPostProcessorExtension.ts
FiveAxisPostEngine.ts
FusionLathePostDeltaRegistryEngine.ts
FusionPostSyncEngine.ts
HurcoV11MillMasterPostEngine.ts
Hy
... [+3496 chars truncated]

### User | 2026-05-21T19:00:50.543Z

[tool_result] No files found

### User | 2026-05-21T19:01:06.187Z

[tool_result] ed1ff032c7 [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (sl...

### Assistant | 2026-05-21T19:01:07.987Z

Now let me search for dispatcher actions and wiki entries:

### Assistant | 2026-05-21T19:01:08.412Z

[tool_use: Read]

### Assistant | 2026-05-21T19:01:08.828Z

[tool_use: Read]

### Assistant | 2026-05-21T19:01:09.739Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:01:10.050Z

[tool_use: Glob]

### User | 2026-05-21T19:01:23.997Z

[tool_result] knowledge\wiki\code-tribal\canonical\proceed-which-postprocessor-should-be-updated-create-hvz-fil.md
knowledge\wiki\architecture\engines\cam\advancedpostphysicsengine.md
knowledge\wiki\architecture\engines\memory\autopostmortemengine.md
knowledge\wiki\architecture\engines\cam\crosscampostengine.md
knowledge\wiki\architecture\engines\edm\edmpostprocessgcodeengine.md
knowledge\wiki\architecture\engi
... [+7182 chars truncated]

### User | 2026-05-21T19:01:24.661Z

[tool_result] 1	/**
2	 * prism_pp — PostProcessor-Specific Dispatcher
3	 *
4	 * 95 actions for post processor operations across 17 categories:
5	 *   - pp_generate (G-code generation)
6	 *   - pp_analyze (analysis)
7	 *   - pp_optimize (optimization)
8	 *   - pp_validate (safety validation)
9	 *   - pp_physics (physics-aware)
10	 *   - pp_neural (neural network)
11	 *   - pp_tribal (tribal knowledge)
12	 *   - 
... [+3398 chars truncated]

### User | 2026-05-21T19:01:24.664Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Product Dispatcher
3	 *
4	 * Routes 40 product actions to ProductEngine sub-engines.
5	 * Extracted from intelligenceDispatcher (SYS-MS1-U00).
6	 *
7	 * Sub-engines:
8	 *   productSFC  (10 actions) — Surface Finish Calculator
9	 *   productPPG  (10 actions) — Post Processor Generator
10	 *   productShop (10 actions) — Shop Manager
11	 *   productACNC (10 actions) — Ad
... [+1942 chars truncated]

### User | 2026-05-21T19:01:51.807Z

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

### Assistant | 2026-05-21T19:01:54.712Z

Let me search for JM Die post-processor references and specific milestone work:

### Assistant | 2026-05-21T19:01:55.420Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:01:56.097Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:01:56.592Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:01:57.114Z

[tool_use: Bash]

### User | 2026-05-21T19:02:32.315Z

[tool_result] /usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long
0
/usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long

### User | 2026-05-21T19:04:46.072Z

[tool_result] H

### User | 2026-05-21T19:04:46.316Z

[tool_result] H:/PRISM/JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps
H:/PRISM/JM DIE/HAAS-HURCO/ATF/OldVersions/STRIP POST HOLDER.0006.ipt
H:/PRISM/JM DIE/HAAS-HURCO/ATF/OldVersions/STRIP POST.0004.ipt
H:/PRISM/JM DIE/HAAS-HURCO/ATF/OldVersions/STRIP TOP POST HOLDER.0009.ipt
H:/PRISM/JM DIE/HAAS-HURCO/ATF/OldVersions/STRIP TOP POST.0005.ipt
H:/PRISM/JM DIE/HAAS-HURCO/ATF/STRIP POST HOLDER.ipt
H:/P
... [+1984 chars truncated]

### User | 2026-05-21T19:05:27.343Z

[tool_result] ed1ff032c7 [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (sl...
398e671a45 [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-POST-JMDIE-LEARNING (slot:ind...
4c1431370c [MAIN] [BRIDGE-DEEP]/U-BRIDGE-MASTERPOST-CAM (slot:india): source_...
75e6ad694e [MAIN] [AI-TRAINING-FIRST-MS0]/U-AITRAIN-POST-CNC-CONTROLLER-DL-ST...
5e8890a460 [FEATURE-GAP-AUDIT-MS0]/U-GAP-POST-RL-POSTPROCESSOR: add tests (e
... [+814 chars truncated]

### Assistant | 2026-05-21T19:05:30.715Z

Now let me search for AI/neural/tribal connections and more engine details:

### Assistant | 2026-05-21T19:05:31.814Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:05:32.209Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:05:32.837Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:05:33.871Z

[tool_use: Bash]

### User | 2026-05-21T19:05:56.708Z

[tool_result] 4930 PostProcessorPipelineEngine.ts
902 MasterPostProcessorEngine.ts
637 PostProcessorGeneratorEngine.ts
Σ 6469

### User | 2026-05-21T19:05:57.249Z

[tool_result] (Bash completed with no output)

### User | 2026-05-21T19:06:02.410Z

[tool_result] (Bash completed with no output)

### User | 2026-05-21T19:06:16.681Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-21T19:06:18.227Z

Let me refine my approach and search directly in the dispatcher files for action lists:

### Assistant | 2026-05-21T19:06:18.636Z

[tool_use: Read]

### Assistant | 2026-05-21T19:06:19.102Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:06:19.708Z

[tool_use: Bash]

### User | 2026-05-21T19:06:25.837Z

[tool_result] 100	
101	// PP-DL-MS8: Ensemble & Uncertainty
102	let _ppEnsembleUncertainty: any;
103	
104	// PP-DL-MS9: Decision Explainer
105	let _ppDecisionExplainer: any;
106	
107	// PP-AGI-ADVISOR: Unified Job Advisor
108	let _ppJobAdvisor: any;
109	
110	// PP-AGI-TEMPLATES: Scenario Template Library
111	let _ppTemplateLibrary: any;
112	
113	// PP-AGI-ANALYZER: G-code Program Analyzer
114	let _ppProgramAnal
... [+5168 chars truncated]

### User | 2026-05-21T19:11:32.847Z

[tool_result] Command running in background with ID: bizvlqamr. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\dbba2d72-e7f8-4d04-877a-b7ff468c720b\tasks\bizvlqamr.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-21T19:11:33.987Z

[tool_result] Command running in background with ID: b7mjjawko. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\dbba2d72-e7f8-4d04-877a-b7ff468c720b\tasks\b7mjjawko.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-21T19:11:35.913Z

I'll wait for the background commands to complete and consolidate findings with simpler searches:

### Assistant | 2026-05-21T19:11:36.328Z

[tool_use: Read]

### Assistant | 2026-05-21T19:11:36.963Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:11:37.591Z

[tool_use: Bash]

### Assistant | 2026-05-21T19:11:38.175Z

[tool_use: Bash]

### User | 2026-05-21T19:11:52.082Z

[tool_result] 1	rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2	

### User | 2026-05-21T19:12:39.124Z

[tool_result] 6

### User | 2026-05-21T19:12:39.244Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
107 matches in 45 files:

134:0:
136:0:
138:0:
140:0:
142:0:
144:0:
146:0:
148:0:
150:0:
152:0:
154:0:
156:0:
158:0:
160:0:
162:0:
164:0:
166:0:
168:0:

### User | 2026-05-21T19:13:01.178Z

[tool_result] 170
---
AdvancedPostPhysicsEngine.ts  34.1K
AdvancedPostProcessorEngine.ts  38.5K
AutoPostmortemEngine.ts  13.3K
BlamelessPostMortemEngine.ts  11.4K
CAMAGIMasterOrchestratorEngine.ts  49.1K
CAMPostInvokeOrchestratorEngine.ts  8.2K
CAMPostSelectorUIEngine.ts  12.8K
CpsPostParserEngine.ts  31.9K
CrossCAMPostEngine.ts  47.8K
EDMPostProcessGCodeEngine.ts  125.8K
EDMPostProcessorExtension.ts  28.9K
Fiv
... [+6260 chars truncated]

### Assistant | 2026-05-21T19:13:34.504Z

Perfect. Now let me compile the final enumeration with direct file lookups:

---

## **PRISM Post-Processor Capability Surface Enumeration**

### **1. POST-PROCESSOR ENGINES**

**Search found 170 engines matching Post/PPG/Master patterns:**

**Core Pipeline Engines:**
- **PostProcessorPipelineEngine.ts** — 218.4 KB (4930 LOC) — 38-stage G-code generation pipeline
- **MasterPostProcessorEngine.ts** — 33.3 KB (902 LOC) — Central post dispatcher
- **PostProcessorGeneratorEngine.ts** — 21.3 KB (637 LOC) — Code gen from strategy
- **AdvancedPostProcessorEngine.ts** — 38.5 KB — Extended dialect logic

**LaTeX Master Post Engines (11 engines):**
- LatheMasterPostRouterEngine.ts (16.4 KB)
- LatheMasterPostDeepReasoningEngine.ts (38.5 KB)
- LatheMasterPostAPIEngine.ts (21.5 KB)
- LatheMasterPostUnifiedOutputEngine.ts (23.0 KB)
- LatheMasterPostRegressionMatrixEngine.ts (33.9 KB)
- LatheMasterPostEnsembleCrossCheckEngine.ts (18.5 KB)
- LatheMasterPostSelfAwarenessEngine.ts (28.5 KB)
- LatheMasterOrchestratorFacadeEngine.ts (25.7 KB)
- LatheLoRAMasterOrchestratorEngine.ts (9.6 KB)

**Lathe Post Gen Pipeline (5 engines):**
- LathePostGeneratorActiveLearningEngine.ts (18.0 KB)
- LathePostGeneratorDialectEngine.ts (18.4 KB)
- LathePostGeneratorSpecIngestEngine.ts (28.3 KB)
- LathePostGeneratorUncertaintyEngine.ts (15.2 KB)
- LathePostGeneratorValidatorWiringEngine.ts (22.5 KB)

**AI/Neural/Neural Engines (8 engines):**
- **PostProcessorVideoKnowledgeNeuralEngine.ts** (55.4 KB) — **YES: video neural knowledge**
- PostProcessorDeepIntelligenceEngine.ts (80.0 KB)
- PostProcessorNeuralNetworkEngine.ts (60.8 KB)
- PostProcessorDeepLearningEngine.ts (36.4 KB)
- LathePostProcessorAIEngine.ts (73.1 KB)
- MasterPostProcessorAGIOrchestrationEngine.ts (41.4 KB)
- PostProcessorAGIMasterRegistryEngine.ts (37.9 KB)
- WireEDMMasterAIEngine.ts (51.3 KB)

**Machine-Specific Masters (7 engines):**
- HurcoV11MillMasterPostEngine.ts (65.6 KB)
- OkumaB250LatheMasterPostEngine.ts (25.7 KB)
- OkumaOSPM
... [+8261 chars truncated]
