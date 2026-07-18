---
type: "chat-session"
source: "claude-code-cli"
session_id: "2993382b-19f8-4464-9752-1eccfc734599"
title: "Independent second-pass review of a P0 SFC backend fix (slot:oscar). Do NOT assu"
date: "2026-06-25"
first_ts: "2026-06-25T13:22:20.223Z"
last_ts: "2026-06-25T13:27:33.493Z"
cwd: "H:\\prism\\mcp-server"
messages: 78
user_msgs: 28
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a20df8ec04f530649.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of a P0 SFC backend fix (slot:oscar). Do NOT assu

> **claude-code-cli** | 2026-06-25 | 78 msgs (28 user / 50 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2993382b-19f8-4464-9752-1eccfc734599/subagents/agent-a20df8ec04f530649.jsonl`

## Transcript

### User | 2026-06-25T13:22:20.223Z

Independent second-pass review of a P0 SFC backend fix (slot:oscar). Do NOT assume the wiring reviewer caught everything. Weight your review toward: hidden coupling, regression risk to the calc path, the completeness gate's true action-scope, edge cases, and whether the fix could mask a genuine incompleteness. Read each file END TO END.

CONTEXT: `prism_product:sfc_calculate` (the SFC web page's backend action via POST /api/v1/sfc/calculate) was false-blocked by `pre-machine-completeness-gate` because the page sends FLAT machine_max_rpm/machine_power_kw but the gate reads NESTED machine.spindle.*. Fix centralizes a flat->nested bridge into one shared helper used by BOTH dispatchers.

FILES (uncommitted, branch cad-fusion-live-ms0):
- mcp-server/src/utils/sfcMachineBridge.ts (new SFC_BRIDGE_ACTIONS set + applySfcMachineBridge fn)
- mcp-server/src/tools/dispatchers/productDispatcher.ts (calls applySfcMachineBridge before pre-calculation hooks)
- mcp-server/src/tools/dispatchers/calcDispatcher.ts (inline bridge -> shared helper)
- mcp-server/src/utils/sfcMachineBridge.test.ts (6 new tests)

KEY QUESTIONS to answer with file:line:
1. The gate empirically fires for `sfc_calculate` but NOT for `cycle_time` (a sibling SFC route action that needs no machine). Does the bridge's action set (sfc_calculate, sfc_quick, sfc_compare, sfc_optimize) correctly cover the machine-dependent product SFC actions WITHOUT over-reaching into data/meta actions (sfc_materials/sfc_tools/sfc_formulas)? Is including sfc_quick/sfc_compare/sfc_optimize safe (no-op if they carry no machine fields)?
2. Could attaching params.machine for an action that does NOT run the gate cause any downstream misbehavior (e.g. ProductEngine reads flat machine_max_rpm, ignores nested machine — confirm no double-handling)?
3. Is there ANY path where the bridge masks genuinely-incomplete machine data (i.e., makes the gate pass when it should block)? Trace buildSfcMachinePackage's positivity guards.
4. Refactor safety: 
... [+461 chars truncated]

### Assistant | 2026-06-25T13:22:25.717Z

I'll review this P0 SFC fix end to end. Let me start by reading all four files.

### Assistant | 2026-06-25T13:22:26.216Z

[tool_use: Read]

### Assistant | 2026-06-25T13:22:26.490Z

[tool_use: Read]

### User | 2026-06-25T13:22:27.531Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\sfcMachineBridge.ts' was already read 13s ago in this session and is unchanged (mtime 1782393380413). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:22:27.546Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\sfcMachineBridge.test.ts' was already read 13s ago in this session and is unchanged (mtime 1782393544066). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-25T13:22:31.181Z

The files are already in my context from the harness pre-read. Let me read the two dispatcher files and the consuming engine to verify the full contract.

### Assistant | 2026-06-25T13:22:32.125Z

[tool_use: Read]

### Assistant | 2026-06-25T13:22:32.347Z

[tool_use: Read]

### User | 2026-06-25T13:22:32.792Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\productDispatcher.ts' was already read 8s ago in this session and is unchanged (mtime 1782393427302). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-06-25T13:22:33.067Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts' was already read 8s ago in this session and is unchanged (mtime 1782393451263). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-25T13:22:37.157Z

The read-once guard claims these are in context, but I do not actually see the file contents in my context — the guard is a harness artifact. Let me disable the cache to get the real content.

### Assistant | 2026-06-25T13:22:38.105Z

[tool_use: Bash]

### Assistant | 2026-06-25T13:22:38.655Z

[tool_use: Bash]

### User | 2026-06-25T13:22:46.644Z

[tool_result] /**
 * sfcMachineBridge.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
 *
 * The machine-validation hooks (src/hooks/MachineValidationHooks.ts) read the NESTED machine shape
 * `machine.spindle.{max_rpm, power_kw}`. But the SFC orchestrate path sends FLAT top-level fields
 * `machine_max_rpm` / `machine_power_kw` (the SpeedFeedOrchestratorEngine / OrchestratorInput contract).
 * So the flat
... [+4012 chars truncated]

### User | 2026-06-25T13:22:49.054Z

[tool_result] /**
 * sfcMachineBridge.test.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
 *
 * Proves the flat->nested machine bridge + its contract against the REAL pre-machine-completeness-gate:
 * the bug (flat SFC payload false-blocks), the fix (bridged spec passes), and NO WEAKENING (a genuinely
 * incomplete payload still blocks). Found via the live e2e visual pass -- the SFC default JM preset
 * 
... [+6829 chars truncated]

### Assistant | 2026-06-25T13:22:52.642Z

Now let me read the dispatcher files and the gate hook to verify the integration contract end to end.

### Assistant | 2026-06-25T13:22:53.551Z

[tool_use: Bash]

### User | 2026-06-25T13:22:58.083Z

[tool_result] /**
 * MCAT-MS0 U-MCAT08: Machine Validation Safety Hooks
 *
 * 5 BLOCKING hooks that prevent dangerous cutting operations when
 * machine data is incomplete, incompatible, or exceeded:
 *
 * 1. pre-machine-spindle-limits — blocks if RPM exceeds machine spindle max
 * 2. pre-machine-envelope-check — blocks if part exceeds work envelope
 * 3. pre-machine-power-budget — blocks if power/torque exceed
... [+19547 chars truncated]

### Assistant | 2026-06-25T13:23:01.959Z

Now I understand the gate logic. Critically: `spindle.power` check on line `if (!spindle.power_kw && !spindle.power_continuous_kw && !spindle.power)`. Let me examine the dispatcher integration points.

### Assistant | 2026-06-25T13:23:04.359Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:23:05.580Z

[tool_use: Grep]

### User | 2026-06-25T13:23:05.607Z

[tool_result] 49:  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
63:  "ppg_cycle_time",
64:  "ppg_cycle_time_compare",
113:    case "sfc_calculate":
163:      return { modified_lines: result.summary?.modified_lines, feed_reductions: result.summary?.feed_reductions, rpm_caps: result.summary?.rpm_caps, stops_added: result.summary?.optional_stops_added, cycle_ratio: result.estimated_cycle_time_ratio
... [+1993 chars truncated]

### User | 2026-06-25T13:23:07.188Z

[tool_result] 429:    case "sf_orchestrate": case "sf_quick":
914:  "sf_orchestrate", "sf_quick", "sf_resolve_machine", "sf_resolve_tool",
1390:          const { applySfcMachineBridge } = await import("../../utils/sfcMachineBridge.js");
1391:          applySfcMachineBridge(action, params as Record<string, unknown>);
1479:              params.machine_rate
1814:            result = calculateMultiPassStrategy(para
... [+3461 chars truncated]

### Assistant | 2026-06-25T13:23:12.043Z

Let me read the productDispatcher integration site (around lines 250-290) and the calcDispatcher integration site (around 1380-1400) and the old inline pattern to confirm byte-equivalent behavior.

### Assistant | 2026-06-25T13:23:13.268Z

[tool_use: Read]

### User | 2026-06-25T13:23:14.480Z

[tool_result] 240	  server.tool(
241	    "prism_product",
242	    "Product tools: SFC (surface finish calc), PPG (post processor generator), Shop Manager (job costing/quoting), ACNC (adaptive CNC programming). Use 'action' param.",
243	    {
244	      action: z.enum(ACTIONS),
245	      params: z.record(z.string(), z.any()).optional(),
246	    },
247	    async ({ action, params: rawParams = {} }: { action: strin
... [+6614 chars truncated]

### Assistant | 2026-06-25T13:23:18.969Z

The product path is wired correctly: bridge runs at line 268-270, before `pre-calculation` hooks at line 278. The `hookCtx.target.data = params` (line 275), so the mutated `params.machine` reaches the gate. Now let me verify the calcDispatcher integration site and the OLD inline behavior to confirm byte-equivalence.

### Assistant | 2026-06-25T13:23:19.857Z

[tool_use: Read]

### User | 2026-06-25T13:23:20.967Z

[tool_result] 1375	          return dispatcherError(
1376	            `Invalid params for '${action}': ${validation.errorMessage}`,
1377	            action,
1378	            "prism_calc"
1379	          );
1380	        }
1381	
1382	        // SFC machine-data shape bridge (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar): the machine-validation
1383	        // hooks (MachineValidationHooks) read the NESTED machine.spindle.
... [+2837 chars truncated]

### Assistant | 2026-06-25T13:23:26.460Z

Now I need the OLD inline pattern to verify byte-equivalence. The key question's claimed old guard was `(action === "sf_orchestrate" || action === "sf_quick") && !params.machine`. Let me check git diff to see exactly what was replaced in calcDispatcher.

### Assistant | 2026-06-25T13:23:27.485Z

[tool_use: Bash]

### User | 2026-06-25T13:23:31.931Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/calcDispatcher.ts b/mcp-server/src/tools/dispatchers/calcDispatcher.ts
index d1b4f471a3..85be3ebc10 100644
--- a/mcp-server/src/tools/dispatchers/calcDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/calcDispatcher.ts
@@ -1386,10 +1386,9 @@ export function registerCalcDispatcher(server: any): void {
         // the present, sane flat spec into the n
... [+1000 chars truncated]

### Assistant | 2026-06-25T13:23:36.081Z

Now I can verify byte-equivalence precisely. Let me also check the productDispatcher diff and confirm `cycle_time` / sibling actions and check the ProductEngine for the double-handling concern (does ProductEngine read flat `machine_max_rpm` AND now-attached nested `machine`?).

### Assistant | 2026-06-25T13:23:36.702Z

[tool_use: Bash]

### User | 2026-06-25T13:23:42.341Z

[tool_result] <persisted-output>
Output too large (312KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\2993382b-19f8-4464-9752-1eccfc734599\tool-results\bvpykgs70.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/wiki/architecture/skills/project/checkin.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/wiki/architecture
... [+1755 chars truncated]

### Assistant | 2026-06-25T13:23:46.527Z

The diff stat is polluted by unrelated working-copy changes. Let me scope the diff to just the 4 relevant files and look at the product dispatcher hunk plus how sfc_calculate routes to ProductEngine.

### Assistant | 2026-06-25T13:23:47.046Z

[tool_use: Bash]

### User | 2026-06-25T13:23:51.837Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/productDispatcher.ts b/mcp-server/src/tools/dispatchers/productDispatcher.ts
index 274e8adb73..6558dcd478 100644
--- a/mcp-server/src/tools/dispatchers/productDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/productDispatcher.ts
@@ -256,6 +256,19 @@ export function registerProductDispatcher(server: any): void {
           Object.assign(params, norm
... [+1232 chars truncated]

### Assistant | 2026-06-25T13:23:55.202Z

Now let me verify the sfc_calculate routing to the engine, and whether ProductEngine reads flat machine_max_rpm vs nested machine (the double-handling concern in Q2). Let me find the sfc_calculate case and how params reach the engine.

### Assistant | 2026-06-25T13:23:56.281Z

[tool_use: Read]

### User | 2026-06-25T13:23:57.154Z

[tool_result] 370	          };
371	        } else if (action === "ppg_optimization_report") {
372	          const { optimizationReportEngine } = await import("../../engines/OptimizationReportEngine.js");
373	          result = await optimizationReportEngine.generate({
374	            gcode: params.gcode,
375	            machine: params.machine,
376	            material: params.material,
377	            tools: p
... [+3028 chars truncated]

### Assistant | 2026-06-25T13:24:00.401Z

Now let me find the `sfc_calculate` engine routing case specifically to verify how the machine param is consumed (the double-handling Q2 concern).

### Assistant | 2026-06-25T13:24:02.181Z

[tool_use: Grep]

### User | 2026-06-25T13:24:03.396Z

[tool_result] 4: * Routes 40 product actions to ProductEngine sub-engines.
5- * Extracted from intelligenceDispatcher (SYS-MS1-U00).
6- *
7- * Sub-engines:
8- *   productSFC  (10 actions) — Surface Finish Calculator
9- *   productPPG  (10 actions) — Post Processor Generator
10- *   productShop (10 actions) — Shop Manager
11- *   productACNC (10 actions) — Adaptive CNC
12- *
13- * @milestone SYS-MS1-U00
14- */
1
... [+3761 chars truncated]

### Assistant | 2026-06-25T13:24:07.728Z

Now let me confirm how `productSFC(action, params)` consumes the machine field — whether it reads flat `machine_max_rpm` (double-handling check Q2). Let me look at the ProductEngine SFC entry point.

### Assistant | 2026-06-25T13:24:09.710Z

[tool_use: Grep]

### User | 2026-06-25T13:24:11.511Z

[tool_result] 381:  machine_power_kw?: number;
382:  machine_max_rpm?: number;
734:function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
785:  if (params.machine_max_rpm && rpm > params.machine_max_rpm) {
786:    rpm = params.machine_max_rpm;
836:    forceResult.power, params.machine_power_kw, forceResult.Fc,
843:    safety.warnings.push(`Optimal RPM exceeded machine max ${params.
... [+969 chars truncated]

### Assistant | 2026-06-25T13:24:18.347Z

This confirms the Q2 double-handling analysis. `sfcCalculate` (line 734) reads ONLY the flat `params.machine_max_rpm` (line 785) and `params.machine_power_kw` (lines 836, 1102, 1224). It never reads the nested `params.machine.spindle.*`. So the bridge-attached nested `params.machine` is consumed ONLY by the validation hooks, never by the engine — no double-handling. Let me confirm `productSFC` dispatch (line 1249) routes sfc_calculate/quick/compare/optimize and check whether the engine treats `params.machine` as anything else (line 1885 uses `params.machine` as a string machine-id, but that is in a different function — likely shop costing, not SFC).

### Assistant | 2026-06-25T13:24:19.104Z

[tool_use: Read]

### User | 2026-06-25T13:24:20.118Z

[tool_result] 1249	export function productSFC(action: string, params: Record<string, any>): any {
1250	  recordHistory(action, params);
1251	
1252	  switch (action) {
1253	    case "sfc_calculate":
1254	      return sfcCalculate(params as SFCInput);
1255	    case "sfc_compare":
1256	      return sfcCompare(params as SFCInput);
1257	    case "sfc_optimize":
1258	      return sfcOptimize(params as SFCInput & { ob
... [+805 chars truncated]

### Assistant | 2026-06-25T13:24:44.131Z

I now have the full picture. The SFC engine path (`sfcCalculate`/`sfcQuick`/`sfcCompare`/`sfcOptimize`, lines 1253-1260) all take `SFCInput` and read flat fields. `params.machine` as a string-id is only used in the SHOP costing functions (line 1885, 2050, 2091 — `productShop`), which are NOT in the SFC_BRIDGE_ACTIONS set. So no collision.

Let me verify two remaining edge concerns: (1) whether `sfc_safety` (NOT bridged) routes to a path that needs the gate, and (2) whether `cycle_time` referenced in the question is `ppg_cycle_time` (which doesn't need machine and isn't bridged — correct). Let me also verify that the camelCase aliases claim (`machineMaxRpm`) is actually what normalizeParams produces.

### Assistant | 2026-06-25T13:24:46.048Z

[tool_use: Bash]

### User | 2026-06-25T13:24:49.367Z

[tool_result] 4: * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
81:/** Reverse map: camelCase → snake_case (for engines that expect snake_case) */
88: * Normalize params: convert any snake_case keys to their camelCase equivalents.
89: * Does NOT remove original keys — adds camelCase versions alongside.
128:    "machine_power_kw", "machine_max_rpm", "machine_max_torque_nm",

### Assistant | 2026-06-25T13:24:58.862Z

[tool_use: Read]

### User | 2026-06-25T13:24:59.680Z

[tool_result] 88	 * Normalize params: convert any snake_case keys to their camelCase equivalents.
89	 * Does NOT remove original keys — adds camelCase versions alongside.
90	 * Returns new object (does not mutate input).
91	  * @param params - configuration options
92	  * @returns result object
93	 */
94	export function normalizeParams(params: Record<string, any>): Record<string, any> {
95	  if (!params || type
... [+2813 chars truncated]

### Assistant | 2026-06-25T13:25:13.463Z

Let me confirm `PARAM_ALIASES` actually maps `machine_max_rpm` -> `machineMaxRpm` and `machine_power_kw` -> `machinePowerKw` (the bridge's camelCase fallback relies on this), and confirm `cycle_time` is not a product action that would route through the gate problematically.

### Assistant | 2026-06-25T13:25:14.066Z

[tool_use: Read]

### User | 2026-06-25T13:25:15.041Z

[tool_result] 1	/**
2	 * PRISM Param Normalizer
3	 * ======================
4	 * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
5	 * Applied at dispatcher entry before handler functions.
6	 * 
7	 * @version 1.0.0 — H1-MS2
8	 */
9	
10	/** Snake→camel alias map for manufacturing parameters */
11	const PARAM_ALIASES: Record<string, string> = {
12	  // Geometry
13	  tool_diameter: "to
... [+2051 chars truncated]

### Assistant | 2026-06-25T13:25:25.675Z

Important finding. There is NO `machine_max_rpm -> machineMaxRpm` or `machine_power_kw -> machinePowerKw` entry in `PARAM_ALIASES`. The aliases map ends at line 79 (closing brace). So the bridge's camelCase fallback (`params.machineMaxRpm` / `params.machinePowerKw`) is NOT populated by `normalizeParams` for these specific fields.

This is a documentation discrepancy, not a functional bug: the bridge reads the snake_case `machine_max_rpm` FIRST (`finitePositive(params.machine_max_rpm) ?? finitePositive(params.machineMaxRpm)`), and the web page posts snake_case, so the primary path works. But the JSDoc claim in `sfcMachineBridge.ts` ("normalizeParams also produces camelCase aliases, so both snake_case and camelCase are read") and the test "reads the camelCase aliases that normalizeParams adds" are inaccurate — normalizeParams does NOT add `machineMaxRpm`/`machinePowerKw`. Let me confirm there's no second alias block and that line 45 `machine: "machine_name"` doesn't interfere with the bridge.

### Assistant | 2026-06-25T13:25:26.823Z

[tool_use: Bash]

### User | 2026-06-25T13:25:30.451Z

[tool_result] 45:  machine: "machine_name",
128:    "machine_power_kw", "machine_max_rpm", "machine_max_torque_nm",

### Assistant | 2026-06-25T13:25:38.282Z

Confirmed. Two findings worth flagging now:

1. **`PARAM_ALIASES` line 45: `machine: "machine_name"`.** When the SFC web page posts a flat payload, if it ever includes a top-level `machine` key (e.g. a machine name string), `normalizeParams` maps `machine -> machine_name` but does NOT delete the original `machine` key (line 89: "Does NOT remove original keys"). The original `machine` value is preserved. This matters for the bridge's overwrite-guard: `applySfcMachineBridge` returns false (no-op) if `params.machine` is already set. So if the web page posts a `machine` string, the bridge would NOT run, and the gate would block (string `machine` has no `.spindle`). Let me check whether the web buildSfcRequest posts a `machine` key. Let me also confirm the alias mapping direction is harmless for the snake_case fields (machine_power_kw is only a NUMERIC_FIELDS entry, not aliased).

Let me check the web request builder to confirm the exact posted shape.

### Assistant | 2026-06-25T13:25:39.787Z

[tool_use: Bash]

### User | 2026-06-25T13:25:45.764Z

[tool_result] mcp-server/web/src/components/sfc/buildSfcRequest.ts
mcp-server/web/src/__tests__/buildSfcRequest.test.ts
---
import type { SfcCalculateRequest } from "../../types/sfc";
import type { MaterialEntry } from "../../data/materials";
import type { OperationType } from "../../data/operations";
import type { MachineEntry } from "../../data/machines";
import type { SfcParams } from "./ParameterPanel";

/*
... [+2385 chars truncated]

### Assistant | 2026-06-25T13:25:52.936Z

This confirms the web page posts ONLY flat snake_case `machine_max_rpm` / `machine_power_kw` and does NOT post a top-level `machine` key. So:

- The bridge's primary snake_case read works (the web path is correct and proven).
- The `machine -> machine_name` alias concern is moot for the web page (no `machine` key posted).
- The camelCase fallback (`machineMaxRpm`/`machinePowerKw`) is dead code for these specific fields since `normalizeParams` doesn't produce them — but harmless (snake_case read wins). This is a P2 doc/test-accuracy issue.

Now let me verify the test integrity (Q5): do the 6 new tests fail on revert? The "6 new tests" are in the last `describe` block (`applySfcMachineBridge -- shared calc + product SFC wiring`). Let me run them to confirm they pass currently and reason about revert-failure. Let me run the test file.

### Assistant | 2026-06-25T13:25:53.885Z

[tool_use: Bash]

### User | 2026-06-25T13:25:59.181Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/sfcMachineBridge.test.ts (15 tests) 8ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  08:25:58
   Duration  224ms (transform 66ms, setup 0ms, import 88ms, tests 8ms, environment 0ms)

### Assistant | 2026-06-25T13:26:07.292Z

All 15 tests pass (4 original buildSfcMachinePackage + 3 gate-contract + 2 suite + 6 new applySfcMachineBridge). Now let me verify the revert-failure property by reasoning about each of the 6 new tests against a revert (removing `applySfcMachineBridge` or the dispatcher wiring):

- The 6 tests call `applySfcMachineBridge` DIRECTLY (not through the dispatcher), so reverting the *dispatcher wiring* (the productDispatcher hunk) would NOT fail these unit tests — that's a gap. But reverting the *function* (deleting `applySfcMachineBridge`/`SFC_BRIDGE_ACTIONS`) would fail compilation/import. The regression-anchor assertions (`preMachineCompletenessGate.handler(...).blocked` toggling true->false) are concrete and would fail if `buildSfcMachinePackage` produced the wrong shape. These are genuine R9 reference-value tests, not stubs.

Let me confirm the test does NOT round-trip through the actual dispatcher (a noted R15 gap — the question explicitly frames this as a wiring fix). Let me check whether any test imports/exercises the dispatcher itself.

### Assistant | 2026-06-25T13:26:08.499Z

[tool_use: Bash]

### User | 2026-06-25T13:26:13.249Z

[tool_result] mcp-server/src/__tests__/pp-advanced-features.test.ts:5: * wired via productDispatcher: ppg_hsm_inject, ppg_sister_tool, ppg_auto_probe
mcp-server/src/__tests__/pp-advanced-features.test.ts:322:describe("productDispatcher — PP-REV-MS3 action wiring", () => {
mcp-server/src/__tests__/pp-advanced-features.test.ts:325:    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.u
... [+2298 chars truncated]

### Assistant | 2026-06-25T13:26:19.243Z

Confirmed: no test round-trips the bridge through the actual `prism_product` / `prism_calc` dispatcher handler. The 6 new tests cover the pure helper + the real gate, but the WIRING into the dispatcher (the productDispatcher hunk that is the actual P0 fix) is verified only by source-text reading, not by an executed E2E. That's an R15 gap (test through the dispatcher), though the wiring is simple and source-confirmed.

Let me do a final type-check on the new file and the two dispatchers to ensure the refactor compiles cleanly.

### Assistant | 2026-06-25T13:26:20.483Z

[tool_use: Bash]

### User | 2026-06-25T13:26:43.029Z

[tool_result] src/engines/ReinforcementLearningCAMFeedbackEngine.ts(302,40): error TS2554: Expected 5 arguments, but got 4.
src/engines/ReinforcementLearningCAMFeedbackEngine.ts(373,42): error TS2554: Expected 5 arguments, but got 4.
EXIT_PIPE_DONE

### Assistant | 2026-06-25T13:26:46.723Z

The only TS errors are in `ReinforcementLearningCAMFeedbackEngine.ts` — a pre-existing, unrelated file (not part of this diff). Zero errors in `sfcMachineBridge.ts`, `productDispatcher.ts`, or `calcDispatcher.ts`. Let me confirm those RL errors are pre-existing (not introduced by this change) by checking it's unmodified.

### Assistant | 2026-06-25T13:26:48.383Z

[tool_use: Bash]

### User | 2026-06-25T13:26:52.207Z

[tool_result] ---(empty above = unmodified by this session)---

### Assistant | 2026-06-25T13:27:33.493Z

Confirmed unrelated and pre-existing (the RL file is not in this session's changes). The four review files type-check clean.

Let me do a final pass on Q3 (positivity guards / masking incompleteness) by re-examining `buildSfcMachinePackage` against the gate's exact critical-field logic. The gate blocks if `!spindle.max_rpm || spindle.max_rpm <= 0` OR `!spindle.power_kw && !spindle.power_continuous_kw && !spindle.power`. The bridge sets `max_rpm` only when `finitePositive` (>0), and sets `power_kw`+`power_continuous_kw` only when power is finite-positive. So:

- A partial spec with ONLY rpm (no power): bridge sets `{spindle:{max_rpm}}` → gate's power-missing branch still fires → STILL BLOCKS. Correct, no masking.
- A partial spec with ONLY power (no rpm): bridge sets `{spindle:{power_kw,power_continuous_kw}}` → gate's `!spindle.max_rpm` branch fires → STILL BLOCKS. Correct.
- Empty/non-positive: bridge returns undefined, no `params.machine` attached → gate blocks on `pkg = {}`. Correct.

The bridge cannot make the gate pass unless BOTH a positive rpm AND positive power are present — which is exactly the gate's own pass condition. No masking path exists. The test at line "bridges only the present field of a partial spec" plus "NO WEAKENING" tests lock this.

I have everything needed. Final verdict.

---

VERDICT: PASS

summary: The flat->nested SFC machine bridge is correct, non-destructive, and does not weaken the completeness gate. The shared helper faithfully reproduces the old calcDispatcher inline behavior, the action set covers the machine-dependent product+calc SFC actions without over-reaching data/meta actions, there is no double-handling in ProductEngine (the engine reads only flat fields; the nested `machine` is consumed solely by the validation hooks), and no path lets the bridge mask genuinely-incomplete data. Two non-blocking accuracy/coverage gaps (P2) and one R15 test-depth gap (P2) are noted; nothing rises to P0/P1.

findings:
- [P2] `mcp-server/src/u
... [+4322 chars truncated]
