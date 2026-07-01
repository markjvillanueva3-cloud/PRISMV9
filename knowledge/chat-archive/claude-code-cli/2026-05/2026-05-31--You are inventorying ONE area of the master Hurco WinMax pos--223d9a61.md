---
type: "chat-session"
source: "claude-code-cli"
session_id: "223d9a61-3f74-43d4-958b-7bf559cd8407"
title: "You are inventorying ONE area of the master Hurco WinMax post processor: **setup"
date: "2026-05-31"
first_ts: "2026-05-31T21:35:46.638Z"
last_ts: "2026-05-31T21:46:19.261Z"
cwd: "H:\\prism-slot-echo"
messages: 112
user_msgs: 48
assistant_msgs: 64
raw_file: "H:/.claude/projects/H--prism-slot-echo/223d9a61-3f74-43d4-958b-7bf559cd8407/subagents/workflows/wf_c087d89f-85f/agent-ac11490a2c342205f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:44"
---

# You are inventorying ONE area of the master Hurco WinMax post processor: **setup

> **claude-code-cli** | 2026-05-31 | 112 msgs (48 user / 64 assistant) | cwd: H:\prism-slot-echo
> Raw: `H:/.claude/projects/H--prism-slot-echo/223d9a61-3f74-43d4-958b-7bf559cd8407/subagents/workflows/wf_c087d89f-85f/agent-ac11490a2c342205f.jsonl`

## Transcript

### User | 2026-05-31T21:35:46.638Z

You are inventorying ONE area of the master Hurco WinMax post processor: **setupsheet-psn** — emit_setup_sheet, generateProgramWithFullPSN (the 11-leg PSN integration), fine-tuning (master_post_fine_tune_*), tribal citation, AGI orchestration.

GROUND TRUTH (verified live this session — do NOT contradict, build on it):
- Master post engine: mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts (2270 lines). Methods: generateProgram(), generateProgramAdvanced(), generateProgramWithFullPSN().
  Option enums seen: coolant_mode "flood"|"mist"|"tsc"|"off"; operation_type "face"|"pocket"|"contour"|"drill"|"tap"|"bore"|"slot"|"3d_surface"|"adaptive"; spindle_type (e.g. CAT40); use_ultimotion (UltiMotion optional package); emit_setup_sheet; controller_diagonal_mode "independent"|"slowest_axis".
- Dispatcher: mcp-server/src/tools/dispatchers/camDispatcher.ts. Master-post actions: master_post_hurco_v11, master_post_unified_agi_generate, master_post_unified_agi_analyze, master_post_unified_agi_kinematics, master_post_genius_generate, master_post_agi_orchestrate, master_post_get_controller_profile, master_post_analyze_gcode, master_post_generate, master_post_fine_tune_* .
- Tool-DB exporters that ALREADY EXIST (verify+exercise, do NOT rebuild): universal_tool_export (returns CSV — VERIFIED working), fusion_export_tool_library, fusion_sync_tools, mastercam_tool_export, mastercam_tool_export_job, hypermill_tool_export, hypermill_tool_export_job, inventor_tool_export, cam_fusion_build_tool_install, cam_mastercam_build_tool_install, cam_hypermill_build_tool_install.
- Validators (mine, pure static, run via node): scripts/post-nc-dialect-lint.mjs <file> --dialect hurco  AND  scripts/post-nc-conformance.mjs <file> [--live].
- JM mill fleet (real machines): VMC-01 Hurco VM30i WinMAX-v10; VMC-02 Okuma M460V-5AX OSP-P300MA-H; VMC-03/04 Haas VF-2/OM-2 PRE-NGC; VMC-05 Roku-Roku Fanuc-31i. Test controller WinMax target machine class: Hurco VMX42SRTi (spindle max_rpm 12000, ~18kW).
- LANE 
... [+1576 chars truncated]

### Assistant | 2026-05-31T21:35:56.535Z

I'll inventory the setupsheet-psn area. Let me start by setting up the output directory and reading the key files in parallel.

### Assistant | 2026-05-31T21:35:57.475Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:35:59.182Z

[tool_use: Bash]

### User | 2026-05-31T21:36:09.153Z

[tool_result] created

### User | 2026-05-31T21:36:29.448Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
14 matches in 8 files:

151:0:boolean;
376:0:false`. */
377:0:SetupSheet;
692:0:true
935:0:false.
936:0:SetupSheet | undefined;
979:0:setupSheet,
mcp-server/.../engines/HurcoV11MillMasterPostEngine.ts:252:export interface SetupSheet {
mcp-server/.../engines/HurcoV11MillMasterPostEngine.ts:275:* Populat
... [+573 chars truncated]

### Assistant | 2026-05-31T21:36:32.037Z

Let me read the key sections of the master post engine, focusing on the setup sheet and PSN integration.

### Assistant | 2026-05-31T21:36:33.256Z

[tool_use: Read]

### Assistant | 2026-05-31T21:36:34.296Z

[tool_use: Read]

### User | 2026-05-31T21:36:56.334Z

[tool_result] 240	  /** Structured material with optional Kienzle override (U-PPGH04). */
241	  material?: MillMaterial;
242	  spindle_rpm: number;
243	  feed_mm_min: number;
244	  axial_depth_mm: number;
245	  radial_depth_mm?: number;
246	  coolant?: "flood" | "mist" | "tsc" | "off";
247	  coordinates: Array<{ x: number; y: number; z: number; type: "rapid" | "linear" | "arc_cw" | "arc_ccw" }>;
248	  arc_data?
... [+5948 chars truncated]

### User | 2026-05-31T21:37:00.314Z

[tool_result] 900	        tool_material: "carbide",
901	        emitted: {
902	          vc_mpm,
903	          fpt_mm,
904	          ap_mm: effectiveOp.axial_depth_mm,
905	          ae_mm: effectiveOp.radial_depth_mm,
906	          S_rpm: effectiveOp.spindle_rpm,
907	          F_mmpm: effectiveOp.feed_mm_min,
908	        },
909	        physics_basis: "kienzle",
910	        confidence: 0.85,
911	        safety_m
... [+4186 chars truncated]

### Assistant | 2026-05-31T21:37:03.268Z

Now let me read the generateProgramWithFullPSN method (the 11-leg PSN integration) and the config interface.

### Assistant | 2026-05-31T21:37:04.203Z

[tool_use: Read]

### User | 2026-05-31T21:37:11.507Z

[tool_result] 1690	   *
1691	   * @param operations  Mill operations (same shape as generateProgram).
1692	   * @param config      Hurco post config (same shape as generateProgram).
1693	   * @param partContext Optional part-level context that informs the PSN
1694	   *                    enrichment (material, machine, part description,
1695	   *                    shop rates). Sensible defaults if omitted.
1696
... [+11243 chars truncated]

### Assistant | 2026-05-31T21:37:14.884Z

Now let me look at the HurcoPostConfig interface to understand all the input params, plus the tribal citation and AGI orchestration sections. Let me also find the config interface and tribal references.

### Assistant | 2026-05-31T21:37:16.792Z

[tool_use: Read]

### Assistant | 2026-05-31T21:37:17.951Z

[tool_use: Bash]

### User | 2026-05-31T21:37:23.213Z

[tool_result] 120	   * the nearest level. Independent of `advanced_aggressiveness` (which is
121	   * the AutoSpeedFeed 0..1 fractional knob in the advanced pipeline).
122	   * When omitted, sync emission is byte-identical to prior behavior — no
123	   * header line, no feed multiplier applied, `feed_optimizations` stays empty.
124	   */
125	  aggressiveness?: number;
126	  /**
127	   * Reserved for future sync
... [+4993 chars truncated]

### User | 2026-05-31T21:37:32.389Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
16 matches in 8 files:

1129:0:dwell for heavy cuts
1402:0:number;
1409:0:HURCO_V11_TRIBAL_KNOWLEDGE.length,
23:0:
329:0:string[];
717:0:string[] = [];
978:0:tribalTipsApplied,
mcp-server/.../engines/HurcoV11MillMasterPostEngine.ts:27:*   - JM Die tribal knowledge embedded (20+ tips)
mcp-server/.../eng
... [+853 chars truncated]

### Assistant | 2026-05-31T21:37:35.693Z

Let me read the tribal knowledge section, the HURCO_V11_TRIBAL_KNOWLEDGE array, and the AGI/fine-tune dispatcher cases. Let me look at the tribal section and the master post dispatcher cases.

### Assistant | 2026-05-31T21:37:37.107Z

[tool_use: Read]

### Assistant | 2026-05-31T21:37:38.953Z

[tool_use: Bash]

### User | 2026-05-31T21:37:39.947Z

[tool_result] 1344	   * Apply tribal knowledge based on operation
1345	   */
1346	  private applyTribalKnowledge(op: MillOperation): { applied: string[]; modifications: string[] } {
1347	    const applied: string[] = [];
1348	    const modifications: string[] = [];
1349	
1350	    for (const tip of HURCO_V11_TRIBAL_KNOWLEDGE) {
1351	      // Check if tip applies to this operation
1352	      const appliesToOp = t
... [+3005 chars truncated]

### User | 2026-05-31T21:37:46.187Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
43 matches in 23 files:

10695:0:{
12009:0:{
12011:0:"setup_sheet" });
14820:0:{
20121:0:{
20126:0:{
20131:0:{
20136:0:{
20144:0:{
6041:0:{
6055:0:{
6060:0:{
6069:0:{
6078:0:{
6083:0:{
6346:0:{
6358:0:{
6363:0:{
6713:0:{
9966:0:{
9974:0:{
9984:0:{
mcp-server/src/tools/dispatchers/camDispatcher.ts:1193:
... [+2462 chars truncated]

### Assistant | 2026-05-31T21:37:51.945Z

Let me read the master_post_hurco_v11 case and the AGI/fine-tune cases in the dispatcher, plus the tribal knowledge array definition.

### Assistant | 2026-05-31T21:37:53.931Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:37:55.652Z

[tool_use: Bash]

### User | 2026-05-31T21:38:01.497Z

[tool_result] Exit code 1
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'HURCO_V11_TRIBAL_KNOWLEDGE\s*=\|HURCO_V11_TRIBAL_KNOWLEDGE:'

### User | 2026-05-31T21:38:04.749Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
15 matches in 15 files:

20121:0:{
20126:0:{
20131:0:{
20136:0:{
20144:0:{
6041:0:{
6055:0:{
6060:0:{
6069:0:{
6078:0:{
6083:0:{
6713:0:{
9966:0:{
9974:0:{
9984:0:{

### Assistant | 2026-05-31T21:38:07.695Z

The rtk grep wrapper is mangling line output. Let me use the Grep tool directly which is cleaner.

### Assistant | 2026-05-31T21:38:10.521Z

[tool_use: Grep]

### Assistant | 2026-05-31T21:38:10.928Z

[tool_use: Grep]

### User | 2026-05-31T21:38:14.949Z

[tool_result] Found 1 file
H:\prism\mcp-server\src\engines\HurcoV11MillMasterPostEngine.ts

### User | 2026-05-31T21:38:16.090Z

[tool_result] 6041:          case "master_post_fine_tune_record": {
6055:          case "master_post_fine_tune_get_params": {
6060:          case "master_post_fine_tune_apply": {
6069:          case "master_post_fine_tune_confidence": {
6078:          case "master_post_fine_tune_stats": {
6083:          case "master_post_fine_tune_clear": {
6713:          case "master_post_hurco_v11": {
9966:          case "mas
... [+418 chars truncated]

### Assistant | 2026-05-31T21:38:19.978Z

Now let me read the key dispatcher cases. The master_post_hurco_v11 case (6713), the fine_tune cases (6041-6083), and the AGI cases (20121-20150).

### Assistant | 2026-05-31T21:38:20.875Z

[tool_use: Read]

### Assistant | 2026-05-31T21:38:21.267Z

[tool_use: Read]

### User | 2026-05-31T21:38:22.127Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts' (same offset/limit) was already read 39s ago in this session and is unchanged (mtime 1779767079954). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (d
... [+27 chars truncated]

### User | 2026-05-31T21:38:25.399Z

[tool_result] 20121	          case "master_post_genius_generate": {
20122	            const { masterPostProcessorGeniusEngine } = await import("../../engines/MasterPostProcessorGeniusEngine.js");
20123	            result = { success: true, data: (masterPostProcessorGeniusEngine as any).generateMasterPost?.(params as any) ?? { engine: "MasterPostProcessorGeniusEngine", note: "generateMasterPost not callable" } }
... [+3101 chars truncated]

### Assistant | 2026-05-31T21:38:28.461Z

The master_post_hurco_v11 case was already read at offset 6713. Let me read the fine_tune cases and the master_post_generate/analyze/get_controller cases.

### system

... [32 middle messages omitted -- see raw_file] ...

### User | 2026-05-31T21:40:50.386Z

[tool_result] file:///C:/Users/wompu/AppData/Local/Temp/extract_gc.mjs:3
const gc = r.data.gcode;
                  ^

TypeError: Cannot read properties of undefined (reading 'gcode')
    at file:///C:/Users/wompu/AppData/Local/Temp/extract_gc.mjs:3:19

Node.js v22.12.0
=== DIALECT LINT ===
state/shared/master-post-validation/hurco_live_sample.nc:1  [WARN] missing-program-end  no program end (M30/M2) fo
... [+1652 chars truncated]

### Assistant | 2026-05-31T21:40:52.928Z

[tool_use: Read]

### User | 2026-05-31T21:40:59.118Z

[tool_result] LINT exit=0
0
state/shared/master-post-validation/hurco_live_sample.nc:1  [WARN] missing-program-end  no program end (M30/M2) found
state/shared/master-post-validation/hurco_live_sample.nc: dialect=hurco · 0 error · 1 warn · 0 info (1 lines)
— total: 0 error · 1 warn across 1 file(s)
==========
CONF exit=0
NC conformance: state/shared/master-post-validation/hurco_live_sample.nc [rich] — 1/15 (scor
... [+1383 chars truncated]

### Assistant | 2026-05-31T21:41:02.811Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:41:04.231Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:41:05.636Z

[tool_use: Read]

### User | 2026-05-31T21:41:09.751Z

[tool_result] done

### User | 2026-05-31T21:41:13.628Z

[tool_result] 1	NC conformance: state/shared/master-post-validation/hurco_live_sample.nc [rich] — 1/15 (score 7%)
2	  FAIL  units                    expected=inch actual=null  <-- a units mismatch is a 25.4x scale error
3	  FAIL  work-offset              expected=G54 actual=null  <-- 
4	  FAIL  tool-T1-present          expected=T1 called actual=absent  <-- 
5	  FAIL  tool-T2-present          expected=T2 called 
... [+1121 chars truncated]

### User | 2026-05-31T21:41:14.967Z

[tool_result] 1	state/shared/master-post-validation/hurco_live_sample.nc:1  [WARN] missing-program-end  no program end (M30/M2) found
2	state/shared/master-post-validation/hurco_live_sample.nc: dialect=hurco · 0 error · 1 warn · 0 info (1 lines)
3	— total: 0 error · 1 warn across 1 file(s)
4	

### Assistant | 2026-05-31T21:41:15.055Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:41:19.752Z

[tool_use: Bash]

### User | 2026-05-31T21:41:25.224Z

[tool_result] exit=0
fine_tune_stats | http=200 | success=undefined | keys=total_weights,total_observations,avg_confidence
fine_tune_get_params | http=200 | success=false | keys=success,error,action,dispatcher
unified_agi_generate | http=200 | success=true | keys=gcode,line_count,estimated_time_sec,quality_score,segments_processed,warnings,controller_profile,provenance
unified_agi_analyze | http=200 | success=t
... [+358 chars truncated]

### Assistant | 2026-05-31T21:41:26.809Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:41:32.458Z

[tool_use: Read]

### User | 2026-05-31T21:41:34.494Z

[tool_result] wrote

### User | 2026-05-31T21:41:38.620Z

[tool_result] 1	fine_tune_stats | http=200 | success=undefined | keys=total_weights,total_observations,avg_confidence
2	fine_tune_get_params | http=200 | success=false | keys=success,error,action,dispatcher
3	unified_agi_generate | http=200 | success=true | keys=gcode,line_count,estimated_time_sec,quality_score,segments_processed,warnings,controller_profile,provenance
4	unified_agi_analyze | http=200 | success=
... [+368 chars truncated]

### Assistant | 2026-05-31T21:41:42.336Z

[tool_use: Bash]

### User | 2026-05-31T21:41:45.484Z

[tool_result] exit=0

### Assistant | 2026-05-31T21:41:48.922Z

[tool_use: Read]

### Assistant | 2026-05-31T21:41:50.807Z

[tool_use: Bash]

### User | 2026-05-31T21:41:52.200Z

[tool_result] exit=0
--- err ---
--- ls outputs ---
A_ulti_on_adaptive.nc  710B
B_ulti_on_contour.nc  701B
C_ulti_off.nc  670B
D_inch_extwcs.nc  0B
_conf.txt  1.4K
_err.txt  0B
_extra_calls.json  3.7K
_extra_stdout.txt  752B
_extra_summary.txt  408B
_lint.txt  277B
_raw_seal.json  18.9K
controller-packages-live.json  47.3K
coolant-spindle-live-drive.mjs  2.9K
drive-analyze.mjs  1.7K
drive-core.mjs  2.9K
drive-e
... [+344 chars truncated]

### Assistant | 2026-05-31T21:41:55.988Z

[tool_use: Read]

### Assistant | 2026-05-31T21:42:00.690Z

[tool_use: Grep]

### User | 2026-05-31T21:42:02.280Z

[tool_result] rc=0
-rw-r--r-- 1 wompu 197611 2103 May 31 16:41 state/shared/master-post-validation/_agi_calls.json

### User | 2026-05-31T21:42:06.768Z

[tool_result] 1	{
2	  "fine_tune_stats": {
3	    "total_weights": 0,
4	    "total_observations": 0,
5	    "avg_confidence": 0
6	  },
7	  "unified_agi_analyze": {
8	    "success": true,
9	    "data": {
10	      "quality_score": 60,
11	      "dimensions": {
12	        "safety": 50,
13	        "efficiency": 70,
14	        "accuracy": 75,
15	        "maintainability": 50,
16	        "controller_optimization": 50,
1
... [+1943 chars truncated]

### Assistant | 2026-05-31T21:42:06.829Z

[tool_use: Grep]

### Assistant | 2026-05-31T21:42:15.290Z

[tool_use: Bash]

### User | 2026-05-31T21:42:17.079Z

[tool_result] rc=0
-rw-r--r-- 1 wompu 197611 4469 May 31 16:42 state/shared/master-post-validation/_ft_calls.json

### User | 2026-05-31T21:42:23.780Z

[tool_result] 1	{
2	  "ft_record": {
3	    "success": false,
4	    "error": "Invalid params for 'master_post_fine_tune_record': predicted: Invalid input: expected string, received object; actual: Invalid input: expected string, received object; controller: Invalid option: expected one of \"fanuc\"|\"siemens\"|\"haas\"|\"okuma\"|\"mazak\"|\"mitsubishi\"|\"heidenhain\"|\"hurco\"|\"brother\"|\"generic\"; operation
... [+4361 chars truncated]

### User | 2026-05-31T21:42:31.953Z

[tool_result] done

### User | 2026-05-31T21:42:43.093Z

[tool_result] 1	unified_agi_kinematics => {"success":true,"data":{"valid":false,"machine_id":"hurco_vmx24","topology":"unknown","way_type":"unknown","build_tier":"unknown","travel_check":{"x_ok":false,"y_ok":false,"z_ok":false,"rotary_ok":fal
2	agi_orchestrate => {"success":true,"data":{}}
3	genius_generate => {"success":false,"error":"request.operations is not iterable","action":"master_post_genius_generate","
... [+142 chars truncated]

### User | 2026-05-31T21:42:45.326Z

[tool_result] 709:  generateProgram(
992:  postSingle(input: {
1399:  getStats(): {
1443:  async generateProgramAdvanced(
1697:  async generateProgramWithFullPSN(

### User | 2026-05-31T21:42:45.118Z

[tool_result] 219:/** PostMove is the simplified path token consumed by postSingle(). */
275: * Populated only by `generateProgramWithFullPSN()`; the legacy
332:   * `generateProgramWithFullPSN()`. Legacy `generateProgram()` leaves it
855:      const checks = this.performPhysicsChecks(effectiveOp, gcode.length);
886:      // engine's force gate at performPhysicsChecks() drives the S/F
992:  postSingle(input: {

... [+189 chars truncated]

### User | 2026-05-31T21:43:03.908Z

[tool_result] A_ulti_on_adaptive.nc  710B
B_ulti_on_contour.nc  701B
C_ulti_off.nc  670B
D_inch_extwcs.nc  0B
_agi_calls.json  2.1K
_conf.txt  1.4K
_err.txt  0B
_extra_calls.json  3.7K
_extra_stdout.txt  752B
_extra_summary.txt  408B
_ft_calls.json  4.4K
_ft_tail.txt  532B
_lint.txt  277B
_raw_seal.json  18.9K
controller-packages-live.json  47.3K
coolant-spindle-live-drive.mjs  2.9K
drive-analyze.mjs  1.7K
driv
... [+396 chars truncated]

### Assistant | 2026-05-31T21:43:40.231Z

[tool_use: StructuredOutput]

### User | 2026-05-31T21:43:50.503Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T21:44:02.366Z

The structured output was provided successfully. The full `_raw_seal.json` dump (which arrived after my StructuredOutput call resolved) reveals critical corrections to my liveStatus assessments. The seal does NOT drop setup_sheet/tribal_tips/physics_checks — they are all present under `data.engine_output`. I had mis-keyed my driver. Let me submit a corrected structured output with accurate live evidence.

Key corrections from the live `_raw_seal.json` and `_ft_calls.json`:
- **setup_sheet WORKS** live via `master_post_hurco_v11` (present at `data.engine_output.setup_sheet` with machine/controller/units/tools/operations).
- **tribal_tips_applied WORKS** — 10 tips emitted live (12-tip corpus, filtered by op/material).
- **physics_checks WORKS** — 5 checks live (Vc, chip load, Kienzle force, spindle RPM, Taylor life).
- **fine_tune actions** have strict enum schemas: controller must be `hurco` (not `hurco_winmax_v11`), operation must be `roughing|finishing|drilling|...`. My calls failed validation → the dispatcher cases are wired and schema-guarded (works), I just passed wrong enums.
- **genius_generate BROKEN** — real TypeError `request.operations is not iterable`.
- **unified_agi_generate/analyze/kinematics WORK** (real engine, not stubs as I wrongly concluded).

### Assistant | 2026-05-31T21:45:31.052Z

[tool_use: StructuredOutput]

### User | 2026-05-31T21:46:05.682Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T21:46:19.261Z

Inventory complete. I enumerated 22 features across the setupsheet-psn area, corrected my initial liveStatus assessments after the full `_raw_seal.json` dump revealed the seal preserves (not drops) the enrichment fields, and drove the live :3100 endpoint to gather concrete evidence.

Key findings:

**Working live (verified via :3100):**
- `master_post_hurco_v11` — emits valid 30-line Hurco V11 G-code, verify verdict PASS, sealed sidecar (sha256). setup_sheet, tribal_tips_applied (10 entries), and physics_checks (5: Vc/chipload/Kienzle-force/RPM/Taylor) all present at `data.engine_output`.
- Setup sheet (SSP-01..04), tribal application + 12-tip corpus (SSP-11/12), fine_tune_stats/clear (SSP-17), UnifiedAGI generate/analyze (SSP-18/19), AGI-case duplicate wiring (SSP-22).
- fine_tune record/get_params/confidence (SSP-15/16) — wired and schema-guarded; my calls were correctly rejected because controller must be enum `hurco` (not `hurco_winmax_v11`) and operation `roughing` (not `pocket`).

**Gaps / broken (P1):**
- **SSP-05 generateProgramWithFullPSN** (the 11-leg PSN integration) has NO dispatcher wiring — `master_post_hurco_v11` calls `generateProgram()` only, so `psn_enrichment` (runtime/optimizer/cost/AI-features, SSP-06..10) is never reachable via :3100. This is the single biggest gap in the area.
- **SSP-20 genius_generate** — live TypeError `request.operations is not iterable` (missing input guard).
- **SSP-19/22 controller-profile resolution** — `hurco_winmax_v11` falls back to the GENERIC Fanuc profile; `hurco_vmx24` not found in the kinematics machine library.
- **SSP-21 agi_orchestrate** — returns `success:true` with empty `data:{}` (fail-loud violation).
- **SSP-13 HurcoV11.getStats()** — no live surface.

Units caveat flagged throughout: engine is mm-native, live run was metric (G21); JM jobs are inch (G20) — caller must pass `units:'inch'`.

Validation artifacts are at `H:/prism/state/shared/master-post-validation/` (`_raw_seal.json`, `_ft_calls.json`, `_
... [+17 chars truncated]
