---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "You are a mill-systems recon agent. Map PRISM's 4-AXIS milling substrate so it c"
date: "2026-06-01"
first_ts: "2026-06-01T00:23:20.621Z"
last_ts: "2026-06-01T00:59:27.886Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 126
user_msgs: 60
assistant_msgs: 66
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a07a74ce4d1a8090e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:44"
---

# You are a mill-systems recon agent. Map PRISM's 4-AXIS milling substrate so it c

> **claude-code-cli** | 2026-06-01 | 126 msgs (60 user / 66 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a07a74ce4d1a8090e.jsonl`

## Transcript

### User | 2026-06-01T00:23:20.621Z

You are a mill-systems recon agent. Map PRISM's 4-AXIS milling substrate so it can be folded into an architecture determination doc. Read from the worktree H:/prism-slot-foxtrot.

CONTEXT: MCP server (port 3100) and Ollama are DOWN — do NOT call mcp__prism__* tools. Read files directly. For graph search try `node scripts/system-viz-query.mjs find <noun>` (run from H:/prism-slot-foxtrot); if it errors, fall back to Grep/Glob over mcp-server/src/engines and the digests mcp-server/data/docs/ENGINE_DIGEST.md + DISPATCHER_DIGEST.md. NEVER invent an engine/path — report ONLY assets you actually saw on disk; mark anything you could not confirm as "unconfirmed". Do NOT read multi-thousand-line files end to end — Grep -n for symbols, Read with offset/limit on the relevant ranges.

The determination already covers P1 (3-axis/3+2 via MillingPrintToProgramEngine) and P1-5X (native 5-axis via MultiAxisPrintToProgramEngine + FiveAxisToolpathIntegrationEngine). 4-AXIS IS THE GAP. Determine precisely:

1. CORE PLOTTER: Does MultiAxisPrintToProgramEngine (and/or MultiSetupPlannerEngine) actually handle 4-axis (both 3+1 indexed AND continuous/simultaneous rotary), or only 5-axis? Grep it for "4-axis"/"4axis"/"rotary"/"A_axis"/"indexed"/axis-count handling. Is there a dedicated 4-axis or rotary or wrap or cylindrical-interpolation engine? (Grep engines for Rotary, FourAxis, 4Axis, Wrap, Cylindrical, Indexer, Indexed, TombstoneRotary.)

2. DISPATCHER: which dispatcher/action serves 4-axis? prism_5axis? prism_mill? Is there a 4-axis-specific action or does multiaxis_print_to_program take an axis-count param? Grep tools/dispatchers for 4-axis / multiaxis / rotary / fourAxis.

3. KINEMATICS + COLLISION: does MillKinematicsCollisionEngine cover a 4-axis machine config (single rotary A or B), or only the 5-axis trunnion A+C? Does it handle the cylindrical-interpolation polar-origin singularity (R->0) distinct from the 5-axis RTCP singularity at A~0? Grep it.

4. POST-PROCESSORS (echo domain
... [+2468 chars truncated]

### Assistant | 2026-06-01T00:23:35.848Z

I'll systematically investigate PRISM's 4-axis milling substrate. Let me run parallel searches across the key areas.

### Assistant | 2026-06-01T00:23:38.391Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:23:40.213Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:23:41.961Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:23:43.638Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:23:45.529Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:23:46.691Z

[tool_use: Bash]

### User | 2026-06-01T00:24:31.648Z

[tool_result] mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
mcp-server/src/tools/dispatchers/autonomousDispatcher.ts
mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts
mcp-server/src/tools/dispatchers/cadRegressionDispatcher.ts
mcp-server/src/tools/dispatchers/calcDispatcher.ts
mcp-server/src/tools/dispatchers/camDispatcher.ts
mcp-server/src/tools/dispatchers/cplDispatcher.ts
mcp-server/src
... [+370 chars truncated]

### User | 2026-06-01T00:27:09.527Z

[tool_result] (Bash completed with no output)

### User | 2026-06-01T00:27:09.978Z

[tool_result] (Bash completed with no output)

### User | 2026-06-01T00:27:10.211Z

[tool_result] mcp-server/src/engines/FiveAxisAggregatorEngine.ts
mcp-server/src/engines/FiveAxisAIUltraIntelligenceEngine.ts
mcp-server/src/engines/FiveAxisCADTemplateEngine.ts
mcp-server/src/engines/FiveAxisDeepLearningEngine.ts
mcp-server/src/engines/FiveAxisOrchestrationEngine.ts
mcp-server/src/engines/FiveAxisToolpathIntegrationEngine.ts
mcp-server/src/engines/FiveAxisToolpathSynthesisEngine.ts
mcp-server/s
... [+457 chars truncated]

### User | 2026-06-01T00:27:10.656Z

[tool_result] (Bash completed with no output)

### User | 2026-06-01T00:27:10.877Z

[tool_result] mcp-server/src/engines/AdditiveManufacturingPhysicsEngine.ts
mcp-server/src/engines/AdvancedCNCConfigEngine.ts
mcp-server/src/engines/AdvancedMathematicalMethodsEngine.ts
mcp-server/src/engines/AdvancedPostProcessorEngine.ts
mcp-server/src/engines/AdvancedUncertaintyEngine.ts
mcp-server/src/engines/AdvancedUncertaintyMethodsEngine.ts
mcp-server/src/engines/AICapabilityMaximizerEngine.ts
mcp-server
... [+1669 chars truncated]

### Assistant | 2026-06-01T00:27:17.194Z

Good. Key findings: `multiAxisProgramDispatcher.ts` exists. Let me now deep-dive into the key engines and dispatcher.

### Assistant | 2026-06-01T00:27:19.777Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:27:21.632Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:27:23.353Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:27:24.680Z

[tool_use: Bash]

### User | 2026-06-01T00:28:09.973Z

[tool_result] 0 matches for '4.axis\|4axis\|four.axis\|fourAxis\|rotary\|Rotary\|A.axis\|a_axis\|indexed\|Indexed\|axis.*count\|axisCount\|numAxes\|num_axes'

### User | 2026-06-01T00:28:11.083Z

[tool_result] 0 matches for '4.axis\|4axis\|four.axis\|fourAxis\|rotary\|Rotary\|A.axis\|a_axis\|indexed\|Indexed\|axis.*count\|axisCount\|numAxes\|cylindrical\|Cylindrical\|wrap\|Wrap'

### User | 2026-06-01T00:28:13.220Z

[tool_result] 0 matches for '4.axis\|4axis\|four.axis\|rotary\|Rotary\|A.axis\|indexed\|Indexed\|axis.*count\|cylindrical\|Cylindrical\|wrap\|Wrap\|G93\|G07\|G12\|inverse_time\|inverseTime'

### User | 2026-06-01T00:28:13.746Z

[tool_result] 22 matches in 8 files:

4:0:
46:0:actionEnum,
5:0:multiaxis_print_to_program, multiaxis_process_plan
56:0:${validation.errorMessage}`,
64:0:{
92:0:{
98:0:${action}`, action, "prism_multiaxis_program");
mcp-server/.../dispatchers/multiAxisProgramDispatcher.ts:2:* prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher
mcp-server/.../dispatchers/multiAxisProgramDispatcher.ts:27:"multiaxis_p
... [+1360 chars truncated]

### Assistant | 2026-06-01T00:28:16.484Z

[tool_use: Read]

### Assistant | 2026-06-01T00:28:17.700Z

[tool_use: Bash]

### User | 2026-06-01T00:28:32.785Z

[tool_result] 1	/**
2	 * prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher
3	 *
4	 * 2 actions across 1 engine:
5	 *   MultiAxisPrintToProgramEngine (2): multiaxis_print_to_program, multiaxis_process_plan
6	 *
7	 * Generates CNC programs for 3+2 indexed and 5-axis simultaneous machining.
8	 * Supports impeller blades, ports, undercuts, swept surfaces, angled features.
9	 *
10	 * @milestone PIPE-M
... [+4025 chars truncated]

### User | 2026-06-01T00:29:07.791Z

[tool_result] 950 MultiAxisPrintToProgramEngine.ts
314 MultiSetupPlannerEngine.ts
Σ 1264

### Assistant | 2026-06-01T00:29:13.427Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:29:14.099Z

[tool_use: Bash]

### User | 2026-06-01T00:29:44.111Z

[tool_result] /**
 * MultiAxisPrintToProgramEngine — 3+2 and 5-Axis Feature Pipeline
 *
 * Generates CNC programs for multi-axis machining features: indexed 3+2
 * drilling/milling, simultaneous 5-axis contouring, undercut machining,
 * impeller/blisk milling, port machining, and swept surface following.
 *
 * Physics (inline):
 *   - Rodrigues rotation formula for tool axis orientation
 *   - Effective diamete
... [+3058 chars truncated]

### User | 2026-06-01T00:29:44.158Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for '4.axis\|4axis\|four.axis\|fourAxis\|rotary\|Rotary\|A.axis\|a_axis\|indexed\|Indexed\|axis.*count\|axisCount\|numAxes\|cylindrical\|Cylindrical\|wrap\|Wrap\|G93\|G07\|G12\|inverse_time\|inverseTime\|A_deg\|B_deg\|C_deg\|3.2\|3plus\|3plus2'

### Assistant | 2026-06-01T00:29:48.738Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:29:49.479Z

[tool_use: Bash]

### User | 2026-06-01T00:30:19.930Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

mcp-server/.../engines/MultiAxisPrintToProgramEngine.ts:64:export type MultiAxisFeatureType =
mcp-server/.../engines/MultiAxisPrintToProgramEngine.ts:73:export type MultiAxisOpType =

### User | 2026-06-01T00:30:31.911Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'MultiAxisFeatureType\|MultiAxisOpType\|feature.*type\|opType\|5.axis\|5axis\|indexed\|rotary\|3.2\|A_deg\|B_deg\|C_deg\|tilt\|orientation'

### Assistant | 2026-06-01T00:30:35.667Z

[tool_use: Read]

### Assistant | 2026-06-01T00:30:37.490Z

[tool_use: Bash]

### User | 2026-06-01T00:30:58.245Z

[tool_result] 60	// ============================================================================
61	// TYPES
62	// ============================================================================
63	
64	export type MultiAxisFeatureType =
65	  | "angled_hole" | "angled_pocket" | "angled_face"
66	  | "undercut" | "dovetail"
67	  | "impeller_blade" | "blisk_blade" | "turbine_root"
68	  | "port" | "manifold_passage"
69
... [+4749 chars truncated]

### User | 2026-06-01T00:31:23.157Z

[tool_result] 55 matches in 30 files:

10:0:D_eff = D × sin(tilt_angle)
146:0:"none" | "low" | "medium" | "high";
179:0:Array<{
192:0:"5ax_trunnion" | "5ax_swivel_head" | "5ax_nutating" | "3plus2_rotary" | "5ax_...
238:0:number, B: number): "none" | "low" | "medium" | "high" {
240:0:Altintas 2012, She & Hung 2008 — singularity when tilt axis = 0
275:0:string, params: Record<string, unknown>): MultiAxisProgramRe
... [+4218 chars truncated]

### Assistant | 2026-06-01T00:31:27.293Z

Critical finding: `machine_type` at line 192 includes `"3plus2_rotary"` but NOT a distinct `"4ax_rotary"` or `"4ax_continuous"`. The engine handles 3+2 and 5-axis but conflates 4-axis. Let me now check the remaining areas.

### system

... [46 middle messages omitted -- see raw_file] ...

### User | 2026-06-01T00:45:54.902Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'effective_feed\|effectiveFeed\|deg_per_min\|degPerMin\|inverse_time\|inverseTime\|rotary_feed\|rotaryFeed\|rotary.*speed\|surface.*speed.*rotary\|feed.*radius\|F_lin\|F_deg\|deg.*per.*min'

### User | 2026-06-01T00:46:53.388Z

[tool_result] (Bash completed with no output)

### User | 2026-06-01T00:49:41.122Z

[tool_result] Command running in background with ID: b8namks3o. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\b74cac5a-c34c-4673-b056-d44a14ed1c13\tasks\b8namks3o.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-01T00:49:44.235Z

Let me continue collecting the remaining data points — wiring status, AI axis coverage, G93/cylindrical interp in the post engines, and MillKinematics 4-axis singularity coverage.

### Assistant | 2026-06-01T00:49:47.663Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:49:49.407Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:49:51.310Z

[tool_use: Bash]

### User | 2026-06-01T00:51:36.277Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
18 matches in 12 files:

1271:0:"X", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.x },
1272:0:"Y", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.y },
1273:0:"Z", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.z },
1276:0:"B", rapid
... [+1220 chars truncated]

### User | 2026-06-01T00:51:41.853Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for '4_axis\|4_axis_table\|4_axis_head\|A-axis\|rotary\|singularity\|cylindrical\|polar\|R.*->.*0\|radius.*zero'

### User | 2026-06-01T00:51:44.862Z

[tool_result] mcp-server/src/engines/ReasoningWiringEngine.ts:127:    name: "FourthAxisDecisionEngine",
mcp-server/src/engines/ReasoningWiringEngine.ts:496:    engine: "FourthAxisDecisionEngine",
mcp-server/src/__tests__/MILL-HARD-MS2.test.ts:18:  FourthAxisIndexingEngine,
mcp-server/src/__tests__/MILL-HARD-MS2.test.ts:26:} from "../engines/FourthAxisIndexingEngine.js";
mcp-server/src/__tests__/MILL-HARD-MS2.te
... [+6609 chars truncated]

### Assistant | 2026-06-01T00:51:47.694Z

[tool_use: Read]

### Assistant | 2026-06-01T00:51:50.247Z

[tool_use: Bash]

### User | 2026-06-01T00:51:51.838Z

[tool_result] 1	mcp-server/src/engines/ReasoningWiringEngine.ts:127:    name: "FourthAxisDecisionEngine",
2	mcp-server/src/engines/ReasoningWiringEngine.ts:496:    engine: "FourthAxisDecisionEngine",
3	mcp-server/src/__tests__/MILL-HARD-MS2.test.ts:18:  FourthAxisIndexingEngine,
4	mcp-server/src/__tests__/MILL-HARD-MS2.test.ts:26:} from "../engines/FourthAxisIndexingEngine.js";
5	mcp-server/src/__tests__/MILL-H
... [+2274 chars truncated]

### User | 2026-06-01T00:53:13.228Z

[tool_result] 38 matches in 25 files:

110:0:Vec3;  // For 5-axis: rotary center offset
113:0:number;
114:0:number;
161:0:boolean;
163:0:Array<{
183:0:boolean;
192:0:boolean;
256:0:60,
257:0:200,
631:0:{ near_singularity: boolean; type: string; severity: number } {
633:0:false, type: "none", severity: 0 };
643:0:true,
651:0:true,
657:0:false, type: "none", severity: 0 };
729:0:Map<string, CollisionObject> = new
... [+1793 chars truncated]

### Assistant | 2026-06-01T00:53:16.099Z

[tool_use: Read]

### Assistant | 2026-06-01T00:53:16.914Z

[tool_use: Read]

### User | 2026-06-01T00:53:31.667Z

[tool_result] 60	  position: Vec3;        // TCP position (mm)
61	  direction: Vec3;       // Tool axis direction (unit vector)
62	  angles?: EulerAngles;  // Euler angles if computed
63	}
64	
65	// ============================================================================
66	// MACHINE KINEMATIC TYPES
67	// ============================================================================
68	
69	/** Machine kinema
... [+2716 chars truncated]

### User | 2026-06-01T00:53:31.677Z

[tool_result] 430	 *   World → Z (spindle) → X → Y → C-rotation → A-rotation → TCP
431	 *
432	 * Where:
433	 *   A = tilt about X (table tilts forward/back)
434	 *   C = rotation about Z (table rotates)
435	 */
436	function fk5AxisTrunnion(
437	  x: number, y: number, z: number,
438	  a_deg: number, c_deg: number,
439	  pivot_offset: Vec3
440	): ToolOrientation {
441	  const a_rad = (a_deg * Math.PI) / 180;
442
... [+3025 chars truncated]

### Assistant | 2026-06-01T00:53:38.319Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:53:41.410Z

[tool_use: Bash]

### User | 2026-06-01T00:55:22.259Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

mcp-server/.../engines/MillKinematicsCollisionEngine.ts:72:| "4_axis_table"      // A-axis rotary on table
mcp-server/.../engines/MillKinematicsCollisionEngine.ts:73:| "4_axis_head"       // A-axis in head

### User | 2026-06-01T00:55:31.167Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
17 matches in 11 files:

1271:0:"X", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.x },
1272:0:"Y", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.y },
1273:0:"Z", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.z },
1276:0:"B", rapid
... [+1133 chars truncated]

### Assistant | 2026-06-01T00:55:34.362Z

[tool_use: Read]

### Assistant | 2026-06-01T00:55:35.308Z

[tool_use: Read]

### Assistant | 2026-06-01T00:55:36.733Z

[tool_use: Bash]

### User | 2026-06-01T00:55:41.707Z

[tool_result] 480	    tip: "Final M-code is M30 (program end + rewind). Genos M460V will not auto-rewind on M02 — always use M30",
481	    applies_to: ["all"],
482	    confidence: 0.99,
483	    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:27",
484	  },
485	  {
486	    category: "jm_die_brake_codes",
487	    tip: "5-axis indexed positioning: A-axis (R1) clamp/unclamp = M10/M11; C-axis (R2) clamp/unclamp = M26/M27. Al
... [+3933 chars truncated]

### User | 2026-06-01T00:55:42.280Z

[tool_result] 690	      if (cfg.tool_length_comp_mode === "G56_HA") {
691	        tribalTipsApplied.push("[jm_die_tool_length] G56 HA emitted (tool-length-comp via active register)");
692	      }
693	
694	      // CALL OO88 fixture-offset macro — emitted before the spindle-start line
695	      // for indexed 5-axis ops on P500 when use_call_oo88 is set. Recalculates
696	      // WCS `fixture_offset_wcs` (defaul
... [+2879 chars truncated]

### User | 2026-06-01T00:56:23.910Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'G93\|G07\|G12\|inverse.time\|cylindrical\|CYLINDRICAL'

### Assistant | 2026-06-01T00:56:27.685Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:56:29.528Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:56:31.032Z

[tool_use: Bash]

### User | 2026-06-01T00:57:05.207Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'G93\|G07\|G12\|inverse.time\|cylindrical\|CYLINDRICAL'

### User | 2026-06-01T00:57:05.343Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'axis.count.*4\|axis_count.*4\|4.*axis'

### User | 2026-06-01T00:57:13.359Z

[tool_result] mcp-server/src/data/academy/course-5-turning-operations.ts:238:- **G12.1 / G112**: Polar interpolation (program in XC instead of XY)
mcp-server/src/data/additional-tool-catalog.ts:9480:  {designation:"EG930020",manufacturer:"YG-1",type:"end_mill",cutting_diameter_mm:50.8,shank_diameter_mm:76.2,overall_length_mm:40.0,flute_length_mm:76.2},
mcp-server/src/data/additional-tool-catalog.ts:9481:  {desi
... [+7958 chars truncated]

### Assistant | 2026-06-01T00:57:17.551Z

Good — I have enough data for the full picture. Let me do two more targeted reads to close the remaining gaps on AI LoRA axis features and MillKinematics 4-axis FK/IK, then compile the report.

### Assistant | 2026-06-01T00:57:19.304Z

[tool_use: Read]

### Assistant | 2026-06-01T00:57:20.175Z

[tool_use: Read]

### User | 2026-06-01T00:57:31.408Z

[tool_result] 1	/**
2	 * MillingLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
3	 * =================================================================
4	 *
5	 * Builds LoRA fine-tuning datasets for milling operations by wrapping
6	 * {@link BaseLoRADatasetBuilder} with a milling-specific render function
7	 * and validation policy.
8	 *
9	 * INPUT: RawJob records sourced from PrintToProgramPipeline ou
... [+2589 chars truncated]

### User | 2026-06-01T00:57:35.180Z

[tool_result] 1280	  if (!machine) return undefined;
1281	  const rapidM = machine.rapid_traverse_mm_min / 1000;
1282	  const accel = machine.acceleration_g;
1283	  const env = machine.work_envelope_mm;
1284	  const axes: AxisKinematics[] = [
1285	    { name: "X", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.x },
1286	    { name: "Y", rapid_m_min: rapidM, accel_g: accel, is_rotary: fals
... [+1584 chars truncated]

### Assistant | 2026-06-01T00:59:27.886Z

I now have all the data needed. Here is the complete report.

---

## 4-AXIS CORE PLOTTER

**MultiAxisPrintToProgramEngine** — `mcp-server/src/engines/MultiAxisPrintToProgramEngine.ts` — wired (via `prism_multiaxis_program` dispatcher) — **does NOT handle 4-axis as a distinct mode**.

Key findings:
- `machine_type` union (line 192): `"5ax_trunnion" | "5ax_swivel_head" | "5ax_nutating" | "3plus2_rotary" | "5ax_gantry"`. No `"4ax_rotary"`, no `"4ax_continuous"`, no `"4ax_tombstone"`.
- `MultiAxisFeatureType` (lines 64–71) and `MultiAxisOpType` (lines 73–78): all entries are `3plus2_*`, `5ax_*`, `indexed_*`, `undercut_*`. Zero `4ax_*`, `rotary_wrap_*`, `cylindrical_*` entries.
- G-code emission (lines 606–664): branches on `3plus2` prefix → G68.2 tilted work plane; branches on `5ax_*` → G43.4 TCP. No branch for single-axis continuous rotary (A-only, no B/C).
- **FourthAxisIndexingEngine** (`mcp-server/src/engines/FourthAxisIndexingEngine.ts`, 425+ lines) — **orphaned**. Not imported by any dispatcher. Only consumed by tests (`MILL-HARD-MS2.test.ts`) and referenced by `ReasoningWiringEngine.ts` (metadata registry, not a live dispatch path). Status: **built, tested, orphaned — no dispatcher wire**.
- **FourthAxisDecisionEngine** (`mcp-server/src/engines/FourthAxisDecisionEngine.ts`, 33KB) — same status: orphaned. Referenced in `ReasoningWiringEngine.ts` lines 127 and 496 (reasoning graph, advisory) and test file only.
- **MultiSetupPlannerEngine** — zero hits for rotary/4-axis/cylindrical/wrap. Handles setup sequencing agnostically; no 4-axis awareness confirmed.

---

## 4-AXIS DISPATCHER ACTIONS

**`prism_multiaxis_program`** (`mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts`) — 2 actions:
- `multiaxis_print_to_program` — routes to `MultiAxisPrintToProgramEngine.calculate()`. Tool description says "3+2 and 5-axis simultaneous"; no axis-count param is documented or dispatched to the 4-axis engines.
- `multiaxis_process_plan` — same engine path.

**No 4-ax
... [+14020 chars truncated]
