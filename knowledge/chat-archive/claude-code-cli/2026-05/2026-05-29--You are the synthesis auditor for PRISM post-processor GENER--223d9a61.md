---
type: "chat-session"
source: "claude-code-cli"
session_id: "223d9a61-3f74-43d4-958b-7bf559cd8407"
title: "You are the synthesis auditor for PRISM post-processor GENERATION coverage. Give"
date: "2026-05-29"
first_ts: "2026-05-29T16:13:02.878Z"
last_ts: "2026-05-29T16:22:04.128Z"
cwd: "H:\\prism-slot-echo"
messages: 60
user_msgs: 24
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism-slot-echo/223d9a61-3f74-43d4-958b-7bf559cd8407/subagents/workflows/wf_37f4cf5f-0f6/agent-aed58106220e941ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:44"
---

# You are the synthesis auditor for PRISM post-processor GENERATION coverage. Give

> **claude-code-cli** | 2026-05-29 | 60 msgs (24 user / 36 assistant) | cwd: H:\prism-slot-echo
> Raw: `H:/.claude/projects/H--prism-slot-echo/223d9a61-3f74-43d4-958b-7bf559cd8407/subagents/workflows/wf_37f4cf5f-0f6/agent-aed58106220e941ba.jsonl`

## Transcript

### User | 2026-05-29T16:13:02.878Z

You are the synthesis auditor for PRISM post-processor GENERATION coverage. Given these three inventories, determine whether the post-processor galaxy can actually GENERATE a correct post for EVERY machine + controller in the database.

MACHINES (?): []

CONTROLLERS (?): []

POST-GEN ENGINES (live=9 stub=14 dark=0): [{"name":"MasterPostProcessorEngine","role":"7-engine fanout core; MACHINE_FEATURE_DB (haas/okuma/mazak/fanuc/siemens); .process() emit","wiring":"live","dispatcher_actions":["master_post_process"]},{"name":"MasterPostProcessorUnifiedAGIEngine","role":"14-controller / 19-CAM AGI surface; generatePost/analyzeGCode/getControllerProfile/getStatistics/getContextForAI","wiring":"live","dispatcher_actions":["master_post_generate","master_post_analyze_gcode","master_post_get_controller_profile","master_post_get_stats","master_post_get_ai_context","master_post_unified_agi_generate (DUP, stub-tail L20131)","master_post_unified_agi_analyze (DUP, stub-tail L20136)","master_post_unified_agi_kinematics (DUP, stub-tail L20144)"]},{"name":"PostProcessorPipelineEngine","role":"7-phase / 38-stage physics→safety→output pipeline; real await .process() in post_process_with_catalog + master_post_by_machine + registered getEngine('postPipeline')","wiring":"live","dispatcher_actions":["post_process_with_catalog","post_sidecar_build","post_sidecar_verify","post_sidecar_canonicalize","post_line_by_line","post_generate_output","post_normalize_cam","(invoked inside master_post_by_machine L7312)"]},{"name":"MasterPostFineTuningEngine","role":"per-vendor calibration LoRA-class loop; recordActualVsPredicted/getFineTunedParameters/applyFineTuning/getConfidenceScore/getStatistics/clear — all real direct calls","wiring":"live","dispatcher_actions":["master_post_fine_tune_record","master_post_fine_tune_get_params","master_post_fine_tune_apply","master_post_fine_tune_confidence","master_post_fine_tune_stats","master_post_fine_tune_clear"]},{"name":"MasterPostProcessorAGIOrchestrationEngin
... [+6409 chars truncated]

### Assistant | 2026-05-29T16:13:18.567Z

I'll audit the post-processor generation coverage. The machine/controller inventories came through empty, so let me read the actual database state to determine what machines and controllers PRISM needs to cover.

### Assistant | 2026-05-29T16:13:20.028Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:13:20.896Z

[tool_use: Glob]

### Assistant | 2026-05-29T16:13:20.502Z

[tool_use: Glob]

### User | 2026-05-29T16:13:39.008Z

[tool_result] mcp-server\src\data\jm-die-profile.ts

### User | 2026-05-29T16:13:39.010Z

[tool_result] mcp-server\src\registries\MachineRegistry.ts
mcp-server\src\registries\MachineSpindleDefaults.ts

### User | 2026-05-29T16:13:52.886Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-29T16:14:00.292Z

Let me read the canonical machine/controller sources directly.

### Assistant | 2026-05-29T16:14:01.839Z

[tool_use: Read]

### Assistant | 2026-05-29T16:14:01.845Z

[tool_use: Read]

### User | 2026-05-29T16:14:14.370Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Machine Registry
3	 * Complete access to 824 machines × 4 data layers
4	 * Implements BASIC → CORE → ENHANCED → LEVEL5 hierarchy
5	 */
6	
7	import * as fs from "fs/promises";
8	import * as path from "path";
9	import { BaseRegistry } from "./base.js";
10	import { PATHS, DATA_LAYERS } from "../constants.js";
11	import { log } from "../utils/Logger.js";
12	import { readJ
... [+61312 chars truncated]

### User | 2026-05-29T16:14:14.631Z

[tool_result] 1	/**
2	 * JM Die Company Profile
3	 *
4	 * Test shop for PRISM development: 21 machines, 24,545+ programs, 100+ customers.
5	 * Location: Machesney Park, IL
6	 *
7	 * This module provides constants for customer names, machine categories,
8	 * and shop-specific configuration used across PRISM engines.
9	 *
10	 * @module data/jm-die-profile
11	 */
12	
13	/**
14	 * JM Die customer list — extracted f
... [+10207 chars truncated]

### Assistant | 2026-05-29T16:14:26.245Z

Now I have the JM Die controller map (the real production fleet) and the MachineRegistry (824 machines × controllers). The crux is: the JM Die map is the canonical production fleet. Let me now examine the actual generating-engine code paths to determine which controllers each can truly emit NC for, and confirm the .cps coverage. Let me check the MasterPost controller profiles and the post-by-machine routing.

### Assistant | 2026-05-29T16:14:26.995Z

[tool_use: Grep]

### Assistant | 2026-05-29T16:14:28.329Z

[tool_use: Grep]

### User | 2026-05-29T16:14:32.786Z

[tool_result] 1220:  "master_post_hurco_v11", "master_post_okuma_b250", "master_post_okuma_osp", "master_post_mitsubishi_mv1200r", "master_post_by_machine",
1221-  "cnc_simulate", "cnc_simulate_report", "cnc_simulate_physics", "cnc_simulate_predictive",
1222-  // Orphan CAM engines (11 engines, 30 actions)
1223-  "instantaneous_engagement_analyze", "instantaneous_engagement_optimal_sf",
1224-  "multi_cam_post_l
... [+15363 chars truncated]

### User | 2026-05-29T16:14:34.516Z

[tool_result] 317:const CONTROLLER_PROFILES: Record<UnifiedControllerType, ControllerProfile> = {
556:  ...Object.keys(CONTROLLER_PROFILES).map((ctrl, i) => ({
903:    return CONTROLLER_PROFILES[controller] || CONTROLLER_PROFILES.generic;
955:      controllers_supported: Object.keys(CONTROLLER_PROFILES).length,

### Assistant | 2026-05-29T16:14:40.345Z

Let me read the MasterPost controller profiles (what 14 controllers it claims) and the rest of the by-machine routing to find the fallthrough/reject behavior, plus confirm what the "live" generate path actually emits per controller.

### Assistant | 2026-05-29T16:14:41.871Z

[tool_use: Read]

### Assistant | 2026-05-29T16:14:42.686Z

[tool_use: Read]

### User | 2026-05-29T16:14:43.784Z

[tool_result] 280	    accuracy: number;
281	    maintainability: number;
282	    controller_optimization: number;
283	    physics_compliance: number;
284	    tribal_adherence: number;
285	    best_practices: number;
286	  };
287	  /** Detected controller */
288	  detected_controller: UnifiedControllerType;
289	  /** Detected operations */
290	  detected_operations: string[];
291	  /** Line statistics */
292	  l
... [+3705 chars truncated]

### User | 2026-05-29T16:14:45.089Z

[tool_result] 7000	              // PPG-WIRE-MS6/U-PPGM17b — verify_tier now wires through to the
7001	              // WEDM verifier (PASS_DEFAULTS / E_PACK_TABLE consistency).
7002	              const { sealWEDMMasterPostOutput: sealWEDMRouter } = await import("../../cps/sealMasterPostOutput.js");
7003	              result = sealWEDMRouter(wedmRouterOutput, {
7004	                source_engine_versions: { "Mi
... [+6712 chars truncated]

### Assistant | 2026-05-29T16:14:55.227Z

This is the critical finding: `master_post_by_machine` is the ONLY real machine→post router, and it ONLY routes to 4 engines (Okuma OSP mill, Okuma lathe, Mitsubishi WEDM, Hurco mill). Every other model hits the `else` reject. Let me confirm the full controller profile list (the "14 controllers" claim) and check whether MasterPostProcessorUnifiedAGIEngine's `generatePost` actually emits real NC or just a profile-driven template. Let me also verify the .cps file coverage on disk.

### Assistant | 2026-05-29T16:14:56.642Z

[tool_use: Read]

### Assistant | 2026-05-29T16:14:58.277Z

[tool_use: Grep]

### User | 2026-05-29T16:14:58.384Z

[tool_result] 400	    rtcp_mode: "G43.4",
401	    hsm_code: "G5.1 Q1",
402	    market_share: 0.08,
403	  },
404	  heidenhain: {
405	    id: "heidenhain",
406	    name: "Heidenhain TNC",
407	    families: ["TNC 640", "TNC 620", "TNC 530"],
408	    features: {
409	      hsm: { code: "M120", modes: { rough: "LA5.0", finish: "LA0.01" } },
410	      fiveAxis: { tcp: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS" },
41
... [+7670 chars truncated]

### User | 2026-05-29T16:15:02.350Z

[tool_result] 31: *      - Single generatePost() method routes to appropriate engine(s)
32- *      - Automatic controller detection from machine profile
33- *      - Cross-CAM feature injection (iMachining, adaptive, RTCP, etc.)
34- *
35- *   2. G-CODE ANALYSIS
36- *      - Pattern recognition via deep learning
37- *      - Quality scoring across 8 dimensions
38- *      - Bottleneck detection with improvement s
... [+1965 chars truncated]

### Assistant | 2026-05-29T16:15:08.314Z

Now let me confirm whether `generatePost` actually delegates to `masterPostProcessorEngine.process()` (real NC emit) and read the MachineKinematicProfile / MasterPostProcessorEngine.process to confirm the core fanout actually emits NC. Let me also check the .cps file inventory on disk to validate JM .cps coverage.

### Assistant | 2026-05-29T16:15:09.950Z

[tool_use: Read]

### Assistant | 2026-05-29T16:15:11.851Z

[tool_use: Grep]

### User | 2026-05-29T16:15:12.240Z

[tool_result] 671	    let kinematicsValidation: KinematicsValidation | undefined;
672	    if (input.validate_kinematics !== false && input.machine) {
673	      machineProfile = typeof input.machine === "string"
674	        ? postProcessorMachineKinematicsEngine.getMachineProfile(input.machine)
675	        : undefined; // MachineProfile would need conversion
676	      if (machineProfile) {
677	        kinematics
... [+4827 chars truncated]

### Assistant | 2026-05-29T16:15:14.082Z

[tool_use: Bash]

### User | 2026-05-29T16:15:19.302Z

[tool_result] 150:const MACHINE_FEATURE_DB: Record<string, MachineFeatures> = {
244:  process(
259:    const features = config.machine?.features ?? MACHINE_FEATURE_DB[config.controller] ?? {};
333:      const postResult = postProcessorEngine.process(postInput, postConfig);
477:      result: this.process(segments, { ...baseConfig, controller }),
505:        features: MACHINE_FEATURE_DB.haas,
527:        features
... [+442 chars truncated]

### User | 2026-05-29T16:15:47.902Z

[tool_result] H:/PRISM/JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps
H:/PRISM/JM DIE/JM DIE COMPANY/QUEUE/CHAT-GPT PROMPT TEST PARTS/OkumaM460V-5AX (Need to Test).cps
H:/PRISM/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/inspection/brother/brother speedio inspection.cps
H:/PRISM/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/inspection/datron/datron next inspection.cps
H:/PRISM/JM DIE/POST PROCE
... [+4858 chars truncated]

### Assistant | 2026-05-29T16:15:58.852Z

Major findings crystallizing. There are 301 .cps files on disk (vanilla Fusion posts for many controllers — Haas/Doosan/Fanuc/Heidenhain/Hurco/Mazak/Siemens/Brother/Datron/Amada), but these are Fusion 360 JavaScript posts, NOT PRISM generating engines. The question is whether PRISM's *engines* can generate NC. Let me verify the MachineKinematicProfile coverage (which machines the AGI engine can validate) and confirm the WEDM/sinker generate-stub finding, plus the MACHINE_FEATURE_DB contents (only 5 controllers per task). Let me also check the categorized JM .cps that match the production fleet specifically.

### Assistant | 2026-05-29T16:16:00.519Z

[tool_use: Read]

### User | 2026-05-29T16:16:01.778Z

[tool_result] 150	const MACHINE_FEATURE_DB: Record<string, MachineFeatures> = {
151	  haas: {
152	    hsm: { code: "G187", modes: { rough: "P1", medium: "P2", finish: "P3" }, tolerance: "E" },
153	    tsc: { on: "M88", off: "M89" },
154	    probing: { type: "wips", probe: "G65 P9832", toolSetter: "G65 P9023" },
155	    fiveAxis: { tcp: "G234", dwo: "G254", dwoff: "G255" },
156	    ssv: { on: "G10", off: "G11", 
... [+3327 chars truncated]

### Assistant | 2026-05-29T16:16:04.073Z

[tool_use: Bash]

### User | 2026-05-29T16:17:01.076Z

[tool_result] === JM-DIE FLEET .cps PRISM posts (production) ===
H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/haas/HAAS_VF2_PRISM_Enhanced_iMachining.cps
H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/hurco/HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps
H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/hurco/HURCO_VM30i_PRISM_v11.cps
H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/hurco/P
... [+3329 chars truncated]

### Assistant | 2026-05-29T16:17:07.049Z

This is decisive. The picture is now clear. Let me make two final verifications: (1) the WEDM `generate` stub confirmation in the actual engine code, and (2) the lathe post AI dark-stub confirmation — these determine whether the lathe/sinker production machines have a real generating path. Let me check the WEDM Mitsubishi engine's generate method and confirm the sinker EDM gap (EDM-01/02 Mitsubishi EA — no engine routes them).

### Assistant | 2026-05-29T16:17:12.545Z

[tool_use: Bash]

### User | 2026-05-29T16:19:05.863Z

[tool_result] === WEDMPostMitsubishi generate ===
71:  generate(input: WEDMPostInput): WEDMPostOutput {
92:    const progNum = (input.program_number ?? "0001").padStart(4, "0");
97:    lines.push(`(${input.part_description ?? "WIRE EDM PROGRAM"})`);
99:    lines.push(`(MATERIAL: ${input.material ?? "TOOL STEEL"} THICKNESS: ${input.thickness_mm.toFixed(2)}mm)`);
100:    lines.push(`(WIRE: ${(input.wire_diameter_
... [+849 chars truncated]

### Assistant | 2026-05-29T16:19:13.759Z

Important nuance found: the `WEDMPostMitsubishiEngine.generate()` method DOES exist and emits real lines (the dispatcher wrapping with `?.()` fallback is over-cautious — the method is callable). And `PPSinkerEDMPostEngine.ts` exists for sinker EDM. And `LathePostProcessorAIEngine.getPostProfile()` is a real method too. The task's "stub-wired" classification reflects dispatcher-level `?.()` defensive wrapping, not necessarily dead engine code. Let me confirm the OkumaB250 lathe engine emits real NC and check the sinker engine + whether the dispatcher actually routes sinker/lathe machines anywhere.

### Assistant | 2026-05-29T16:19:19.687Z

[tool_use: Bash]

### User | 2026-05-29T16:19:26.226Z

[tool_result] === OkumaB250 lathe generateProgram (method name) ===
248:  generateProgram(
=== PPSinkerEDMPost wiring? (search dispatcher) ===
=== edm_sinker_program routes to? ===
1251:  "edm_wire_program", "edm_sinker_program", "edm_micro_program", "edm_cycle_time", "edm_uncertainty",
7472:          case "edm_sinker_program": {
=== Hurco engine generateProgram real ===
=== OkumaOSPMill generateProgram real ==
... [+1 chars truncated]

### Assistant | 2026-05-29T16:19:32.218Z

Let me read the `edm_sinker_program` case to see what it actually emits, and confirm whether the Hurco/OkumaOSP generateProgram methods exist (the grep returned nothing - they may use a different signature). Let me also verify the lathe master post route used elsewhere.

### Assistant | 2026-05-29T16:19:33.226Z

[tool_use: Read]

### User | 2026-05-29T16:19:34.253Z

[tool_result] 7472	          case "edm_sinker_program": {
7473	            const eng = await getEngine("edmAsm");
7474	            result = eng.assembleSinkerEDM(params);
7475	            break;
7476	          }
7477	          case "edm_micro_program": {
7478	            const eng = await getEngine("edmAsm");
7479	            result = eng.assembleMicroEDM(params);
7480	            break;
7481	          }
7482	 
... [+1819 chars truncated]

### Assistant | 2026-05-29T16:19:37.287Z

[tool_use: Bash]

### User | 2026-05-29T16:19:47.501Z

[tool_result] === Hurco generate methods ===
100:  /** Enable post-emission AutoSpeedFeed advanced pipeline. See `generateProgramAdvanced`.
101:   *  Default false — sync `generateProgram` is unchanged. */
128:   * the sync `generateProgram` path; AS/F only runs via `generateProgramAdvanced`
236:  /** Advanced-pipeline opt-in fields — populated only by `generateProgramAdvanced`
237:   *  when `use_advanced_feat
... [+1380 chars truncated]

### Assistant | 2026-05-29T16:19:57.063Z

Now the full picture is clear, and there's significant nuance the input inventory missed. There IS a separate lathe master post system (`lathe_masterpost_emit`, `lathe_master_post_route` in turningDispatcher) that the post-gen-engines inventory didn't capture — the lathe galaxy has its own emission surface. And `PPSinkerEDMPostEngine.generate()` is real but NOT wired into a machine-routed dispatcher action (the `edm_sinker_program`→`edmAsm.assembleSinkerEDM` is a generic EDM assembler, not the Mitsubishi EA-specific sinker post). Let me do one final check: the lathe masterpost emit route and the LatheMasterPostRouterEngine machine coverage, since that determines whether the 7 Okuma lathes have a real live path.

### Assistant | 2026-05-29T16:19:58.172Z

[tool_use: Read]

### User | 2026-05-29T16:19:59.288Z

[tool_result] 4335	          case "lathe_masterpost_emit": {
4336	            const { LatheMasterPostAPIEngine } = await import(
4337	              "../../engines/LatheMasterPostAPIEngine.js"
4338	            );
4339	            const emitResult = LatheMasterPostAPIEngine.emit(params as Parameters<typeof LatheMasterPostAPIEngine.emit>[0]);
4340	            result = {
4341	              success: emitResult.succe
... [+2327 chars truncated]

### Assistant | 2026-05-29T16:20:00.456Z

[tool_use: Bash]

### User | 2026-05-29T16:20:06.357Z

[tool_result] === LatheMasterPostRouter controllers ===
4: * Central router for lathe post-processing. Given {machineId, operation, controller},
20:export type LatheControllerFamily = "okuma" | "fanuc" | "mitsubishi" | "mazak" | "haas" | "citizen" | "generic";
37:  controller?: string;
49:  controller: string;
50:  controllerFamily: LatheControllerFamily;
70:  controller: string;
71:  controllerFamily: LatheCon
... [+3608 chars truncated]

### Assistant | 2026-05-29T16:20:27.914Z

I now have everything I need for a complete, honest synthesis. There's a separate `LatheMasterPostAPIEngine` (live emit path for lathe with okuma/fanuc/mitsubishi/mazak/haas/citizen dialects) and `LatheMasterPostRouterEngine` with a sample JM_DIE_MACHINES list. This materially changes the picture: the lathe galaxy has its own emission surface the input inventory omitted, so the 7 Okuma lathes DO have a live path via the turning dispatcher.

Let me synthesize the coverage analysis against the **canonical production fleet** (the 15-row `JM_DIE_CONTROLLER_MAP`, which is the real "every machine + controller" the audit must answer for), cross-referenced against the broader 824-machine registry.

Key determinations:

**JM Die production fleet (15 machines) — live post-gen path analysis:**
- 7 Okuma lathes (LTH-01..07, OSP-P200/P300/P500/U10L): LIVE via `master_post_by_machine` Okuma-lathe branch → `OkumaB250LatheMasterPostEngine.generateProgram()` (acknowledged: hardwired to LB250II tribal — non-LB250 may emit "slightly off codes" per inline comment) AND a second path via `lathe_masterpost_emit`/`LatheMasterPostAPIEngine`. Real but with a fidelity caveat for the non-B250 controllers (P200LA, P300LA-E, P500, U10L, P300SA).
- VMC-01 Hurco VM30i WinMAX: LIVE — `HurcoV11MillMasterPostEngine.generateProgram()`, real, has .cps (HURCO_VM30i_PRISM_v11.cps). Best-covered machine.
- VMC-02 Okuma M460V-5AX OSP-P300MA-H: LIVE — `OkumaOSPMillMasterPostEngine` (P300/P500 family), real, has .cps.
- VMC-03/04 Haas VF-2 / OM-2 PRE-NGC: NO live machine-routed engine. `master_post_by_machine` has NO Haas branch (falls to `else` reject). MasterPostProcessorEngine has Haas in MACHINE_FEATURE_DB but only via `master_post_process` with caller-supplied segments+controller, not machine-routed. Has .cps on disk. P0 — real production machines, no machine-routed generating path.
- VMC-05 Roku-Roku Fanuc 31i-B5: NO live engine AND no .cps (profile explicitly notes "no post yet"). P0.
- EDM-01/02 Mits
... [+678 chars truncated]

### Assistant | 2026-05-29T16:21:35.616Z

[tool_use: StructuredOutput]

### User | 2026-05-29T16:21:36.476Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T16:22:04.128Z

Audit complete. Summary of the synthesis:

**Verdict: PARTIAL (~40% of the canonical production fleet has a correct live machine-routed post-gen path).**

The canonical "every machine + controller" set is the 15-row `JM_DIE_CONTROLLER_MAP` (the real shop fleet), backed by the 824-machine `MachineRegistry`. The single real machine→post router is `master_post_by_machine`, and it routes only **4 engine families** (Hurco mill, Okuma OSP mill, Okuma lathe, Mitsubishi MV1200R WEDM) — everything else hits an `else` hard-reject.

**Live (6 covered):** Hurco VM30i (VMC-01), Okuma M460V-5AX (VMC-02), 7 Okuma lathes (LTH-01..07, live-with-LB250II-fidelity-caveat via two real paths including the lathe galaxy's own `LatheMasterPostAPIEngine.emit`), and the generic caller-supplies-controller `master_post_process` path (6 real dialects).

**P0 gaps (real production machines with no safe path):**
- VMC-03/04 Haas VF-2 + OM-2 (PRE-NGC) — no Haas branch in the router; only NGC dialect exists (PRE-NGC mis-emit = crash risk).
- VMC-05 Roku-Roku (Fanuc 31i-B5) — zero post, zero engine, silent reject.
- EDM-01/02 Mitsubishi EA sinkers — `PPSinkerEDMPostEngine.generate()` is real but unwired; only a generic EDM assembler is reachable.
- WEDM-01 Mitsubishi FA10S — router mis-routes it to the MV1200R dialect engine; the correct `WEDMPostMitsubishiEngine.generate()` exists but is only reachable via a `?.()`-masked non-machine-routed action.

**Key nuance the input inventory missed:** several "stub-wired/dark" engines (WEDMPost*, LathePostProcessorAIEngine, PPSinkerEDMPostEngine) have **real `.generate()` methods** — the staleness is in the dispatcher's defensive `method?.() ?? 'not callable'` wrap (a fail-loud / R12 violation), not dead engine code. P1 fix #6 (de-fang that pattern) recovers real capability with pure wiring. The lathe galaxy also has its own emit surface (`lathe_masterpost_emit`) the post-gen inventory omitted, which is why the Okuma lathes count as live.

Relevant files: `mc
... [+479 chars truncated]
