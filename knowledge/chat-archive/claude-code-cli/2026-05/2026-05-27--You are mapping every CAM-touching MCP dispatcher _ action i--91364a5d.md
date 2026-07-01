---
type: "chat-session"
source: "claude-code-cli"
session_id: "91364a5d-72dc-41a9-9d66-7aeb54ece5c5"
title: "You are mapping every CAM-touching MCP dispatcher + action in PRISM for a memory"
date: "2026-05-27"
first_ts: "2026-05-27T13:42:13.695Z"
last_ts: "2026-05-27T13:52:05.718Z"
cwd: "H:\\PRISM"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/91364a5d-72dc-41a9-9d66-7aeb54ece5c5/subagents/agent-a36cff28fa178a1a4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are mapping every CAM-touching MCP dispatcher + action in PRISM for a memory

> **claude-code-cli** | 2026-05-27 | 33 msgs (14 user / 19 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/91364a5d-72dc-41a9-9d66-7aeb54ece5c5/subagents/agent-a36cff28fa178a1a4.jsonl`

## Transcript

### User | 2026-05-27T13:42:13.695Z

You are mapping every CAM-touching MCP dispatcher + action in PRISM for a memory.

**Context:** Kilo (CAM specialist) is building a CAM-corpus memory. PRISM's primary execution surface is MCP dispatchers (e.g. `prism_cam`, `prism_calc`, `prism_safety`) each with an `action` enum. Find every dispatcher and every action that touches CAM.

**Scope:**
1. `H:/prism/mcp-server/src/tools/dispatchers/*.ts` — every dispatcher file
2. `H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md` — pre-computed index (if it exists, use it first — it has 1-line summaries + action counts already)
3. Search for action names containing: cam, mill, lathe, wedm, wire_edm, toolpath, post, post_process, gcode, kienzle, taylor, mastercam, hypermill, fusion, esprit, solidcam, machining, feed, speed, chip, drill, tap

**Output format (Markdown, under 400 words):**

## CAM-touching dispatchers
| Dispatcher | File | # CAM actions | Top 5 CAM actions |
|---|---|---|---|

## CAM actions cross-dispatcher (top 30 by CAM-centrality)
| Action name | Dispatcher | Purpose (1 line) |
|---|---|---|

## Indirect CAM exposure
Dispatchers that don't claim CAM as their primary domain but expose CAM-relevant actions (e.g. `prism_calc:kienzle_force`, `prism_safety:validate_physics`, `prism_dev:roadmap_tool_plan_*`). List 10.

End with: "Total: X CAM-relevant dispatchers, Y CAM actions, Z CAM-adjacent actions."

Lean on DISPATCHER_DIGEST.md if it exists — much faster than opening every .ts.

### Assistant | 2026-05-27T13:42:37.782Z

I'll start by checking the DISPATCHER_DIGEST.md and then map CAM dispatchers.

### Assistant | 2026-05-27T13:42:38.849Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:42:39.227Z

[tool_use: Glob]

### User | 2026-05-27T13:43:40.044Z

[tool_result] mcp-server\src\tools\dispatchers\resourceHarvestingDispatcher.ts
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts
mcp-server\src\tools\dispatchers\securityDispatcher.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
mcp-server\src\tools\dispatchers\automationDispatcher.ts
mcp-server\src\tools\dispatchers\autonomousDispatch
... [+5311 chars truncated]

### User | 2026-05-27T13:45:55.012Z

[tool_result] H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md  11.3K

### Assistant | 2026-05-27T13:45:59.592Z

Good - DISPATCHER_DIGEST.md exists. Let me read it directly along with the canonical CAM dispatcher.

### Assistant | 2026-05-27T13:46:00.481Z

[tool_use: Read]

### User | 2026-05-27T13:47:52.141Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**105 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-27 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13529**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+11217 chars truncated]

### Assistant | 2026-05-27T13:47:57.648Z

Now let me grep for action names across CAM-touching dispatchers to extract specific actions.

### Assistant | 2026-05-27T13:48:01.810Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:48:02.805Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:48:04.146Z

[tool_use: Grep]

### User | 2026-05-27T13:49:00.505Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-05-27T13:49:00.513Z

[tool_result] mcp-server\src\tools\dispatchers\camDispatcher.ts:2013

Found 2013 total occurrences across 1 file.

### User | 2026-05-27T13:49:00.583Z

[tool_result] No matches found

### Assistant | 2026-05-27T13:49:11.233Z

Let me extract action names via case statements directly, focusing on top CAM dispatchers.

### Assistant | 2026-05-27T13:49:11.510Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:12.790Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:13.839Z

[tool_use: Grep]

### User | 2026-05-27T13:49:45.308Z

[tool_result] 100:case "facade"
102:case "strategy"
104:case "optimizer"
106:case "collision"
110:case "physics"
112:case "thermal"
114:case "scientific"
118:case "deeplearn"
120:case "neural"
122:case "pattern"
124:case "twin"
128:case "agi"
130:case "selfaware"
134:case "toolpath"
136:case "toolsel"
138:case "kinematics"
142:case "validate"
144:case "program"
149:case "adaptive"
151:case "wisdom"
155:case "ai
... [+527 chars truncated]

### User | 2026-05-27T13:49:45.341Z

[tool_result] 412:case "cam"
413:case "toolpath"
414:case "post"
415:case "collision"
416:case "stock"
417:case "toolasm"
418:case "fixture"
429:case "probing"
430:case "subprogram"
431:case "nesting"
461:case "portability"
464:case "transpiler"
469:case "thermal"
470:case "energy"
471:case "kinematic"
474:case "pipeline"
480:case "reliability"
482:case "spm"
483:case "constitutive"
486:case "coolant"
487:case 
... [+1432 chars truncated]

### User | 2026-05-27T13:49:46.305Z

[tool_result] 445:case "pp"
447:case "pipeline"
449:case "analyzer"
455:case "neural"
457:case "physics"
459:case "tribal"
461:case "kinematics"
463:case "verification"
469:case "cognition"
471:case "transformer"
477:case "generator"
479:case "api"
485:case "troubleshoot"
545:case "benchmark"
547:case "workflow"
607:case "dwell"
647:case "character"
683:case "cps"
687:case "bridge"
717:case "telemetry"
721:case
... [+599 chars truncated]

### Assistant | 2026-05-27T13:49:51.905Z

I have enough data. Let me check a few more key dispatchers for indirect CAM exposure.

### Assistant | 2026-05-27T13:49:55.330Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:56.377Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:57.871Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:59.584Z

[tool_use: Grep]

### User | 2026-05-27T13:51:29.207Z

[tool_result] 113:case "strategy_select"
117:case "params_calculate"
121:case "strategy_search"
125:case "strategy_list"
129:case "strategy_info"
133:case "stats"
137:case "material_strategies"
141:case "prism_novel"
145:case "novel_compute"
152:case "novel_list"
160:case "extended_compute"
167:case "extended_list"
175:case "crosscam_compute"
182:case "crosscam_list"
190:case "generate"

[Showing results with p
... [+22 chars truncated]

### User | 2026-05-27T13:51:29.222Z

[tool_result] 38:case "cutting_force"
40:case "tool_life"
42:case "speed_feed"
48:case "mrr"
54:case "chip_load"
84:case "spindle_max_mrr"
100:case "chip_formation"
102:case "chip_diagnose"
122:case "test_protocol_tool_life"
160:case "chip_thinning_compensation"
354:case "stochastic_tool_life"
374:case "cryo_tool_life"
426:case "lam_tool_life"
1464:case "chip_thinning"
1487:case "cutting_force"
1507:case "tool_
... [+161 chars truncated]

### User | 2026-05-27T13:51:29.238Z

[tool_result] 31:case "chuck"
32:case "tail"
33:case "steady"
34:case "live"
35:case "bar"
36:case "thread"
37:case "partoff"
48:case "drf"
556:case "chuck_force"
561:case "tailstock"
566:case "steady_rest"
571:case "live_tool"
576:case "live_tool_plan"
582:case "bar_pull"
587:case "thread_single_point"

[Showing results with pagination = limit: 15]

### User | 2026-05-27T13:51:29.333Z

[tool_result] No matches found

### Assistant | 2026-05-27T13:52:05.718Z

I have sufficient data. Here's the CAM-touching dispatcher + action map.

## CAM-touching dispatchers

| Dispatcher | File | # CAM actions | Top 5 CAM actions |
|---|---|---|---|
| camDispatcher | `mcp-server/src/tools/dispatchers/camDispatcher.ts` | 2475 | toolpath_generate, toolpath_simulate, toolpath_optimize, post_process, cam_strategy_recommend |
| millDispatcher | `mcp-server/src/tools/dispatchers/millDispatcher.ts` | 429 | strategy, toolpath, toolsel, kinematics, fiveaxis_cam |
| ppDispatcher | `mcp-server/src/tools/dispatchers/ppDispatcher.ts` | 801 | pp_generate_gcode, pp_generate_canned_cycle, pp_analyze_gcode, pp_analyze_controller_fit, pp_optimize_feed |
| turningDispatcher | `mcp-server/src/tools/dispatchers/turningDispatcher.ts` | 373 | chuck, thread, partoff, live_tool_plan, thread_single_point |
| edmDispatcher | `mcp-server/src/tools/dispatchers/edmDispatcher.ts` | 388 | wire EDM electrode/surface/sinker (CAM-adjacent NTM) |
| fiveAxisDispatcher | `mcp-server/src/tools/dispatchers/fiveAxisDispatcher.ts` | 15 | RTCP comp, kinematics, 5-axis post |
| toolpathDispatcher | `mcp-server/src/tools/dispatchers/toolpathDispatcher.ts` | 34 | strategy_select, params_calculate, generate, crosscam_compute, prism_novel |
| multiAxisProgramDispatcher | `mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts` | 2 | Multi-Axis Print-to-Program |
| turningProgramDispatcher | `mcp-server/src/tools/dispatchers/turningProgramDispatcher.ts` | 14 | Turning Print-to-Program |
| camFunctionDispatcher | `mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts` | 8 | NL CAM-function routing |
| multiOpDispatcher | `mcp-server/src/tools/dispatchers/multiOpDispatcher.ts` | 14 | rest_machining + multi-op orchestration |
| threadingPipelineDispatcher | `mcp-server/src/tools/dispatchers/threadingPipelineDispatcher.ts` | 3 | Thread programming pipeline |
| holePatternDispatcher | `mcp-server/src/tools/dispatchers/holePatternDispatcher.ts` | 3 | drill pattern recognition |
... [+3507 chars truncated]
