---
type: "chat-session"
source: "claude-code-cli"
session_id: "a8796b17-72d9-4d62-83f0-defe8037fc4a"
title: "Independent second-pass review of a SAFETY-CRITICAL dispatcher-wiring changeset "
date: "2026-06-11"
first_ts: "2026-06-11T05:29:50.155Z"
last_ts: "2026-06-11T05:33:25.978Z"
cwd: "H:\\prism-slot-romeo"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism-slot-romeo/a8796b17-72d9-4d62-83f0-defe8037fc4a/subagents/agent-a82f6b7ac7ea18509.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:08"
---

# Independent second-pass review of a SAFETY-CRITICAL dispatcher-wiring changeset 

> **claude-code-cli** | 2026-06-11 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism-slot-romeo
> Raw: `H:/.claude/projects/H--prism-slot-romeo/a8796b17-72d9-4d62-83f0-defe8037fc4a/subagents/agent-a82f6b7ac7ea18509.jsonl`

## Transcript

### User | 2026-06-11T05:29:50.155Z

Independent second-pass review of a SAFETY-CRITICAL dispatcher-wiring changeset in PRISM worktree H:/prism-slot-romeo (branch slot/romeo), unit U-WIRE-SWISSCOLLISION. It wires SwissTypeCollisionEngine through prism_turning via 4 actions (swiss_collision_check_all / _gang / _scenario / _preset) + Zod schemas + a 15-case round-trip test.

Read END-TO-END:
1. H:/prism-slot-romeo/mcp-server/src/engines/SwissTypeCollisionEngine.ts (the collision engine: checkAll's conditional check-gating + checkGangInterference matrix + generateCollisionScenario + getMachinePreset; constants MIN_GANG_TOOL_CLEARANCE_MM=3.0, BAR_RUNOUT_FACTOR=0.001, GUIDE_BUSHING_CLEARANCE_MM=0.005, SWISS_MACHINE_PRESETS)
2. H:/prism-slot-romeo/mcp-server/src/__tests__/turningDispatcher.swiss-collision-wire.test.ts
3. The 4 swiss_collision_* switch cases in turningDispatcher.ts + the 4 Zod schemas in turningActionSchemas.ts

Weight your review toward TEST INTEGRITY and what a wiring specialist might miss. INDEPENDENTLY RE-DERIVE every reference value from the engine source (do not trust the test comments):
- checkAll(minConfig, minState): confirm EXACTLY which of the 8 checks fire for a config with guideBushing but NO gangSlide/bAxis/subSpindle/crossSlide/ejector. Confirm bushing_thermal pass (innerDia 20.5, barDia 20, no temp => deltaT 0 => effectiveClearance (20.5-20)/2=0.25 >= GUIDE_BUSHING_CLEARANCE 0.005) and bar_runout pass (maxRunout 20*0.001=0.02, effectiveDiameter 20.04, bushingClearance (20.5-20.04)/2=0.23 > 0). Confirm checks.length===2, safe===true, safeZones.length===1 (only calculateBarSafeZone; gangSlide+bAxis absent).
- gang UNSAFE [st1,st2]@pitch25/holderWidth20/toolDia10: re-derive clearance = 25 - (15+15) = -5; overlap = MIN_GANG_TOOL_CLEARANCE(3) - clearance(-5) = 8; matrixMap[0][1]=false; minimumClearance_mm=-5. gang SAFE [st1,st5]: gap 100, clearance 70, matrixMap[0][1]=true, minimumClearance 70.
- scenario("Star")/("Citizen"): re-derive component count (base 5 + b_axis_tool + sub_sp
... [+933 chars truncated]

### Assistant | 2026-06-11T05:29:52.999Z

I'll perform an independent second-pass review of this safety-critical changeset. Let me read all the relevant files end-to-end and independently re-derive every reference value.

### Assistant | 2026-06-11T05:29:53.943Z

[tool_use: Read]

### Assistant | 2026-06-11T05:29:54.337Z

[tool_use: Read]

### User | 2026-06-11T05:29:54.383Z

[tool_result] read-once-guard: 'H:\prism-slot-romeo\mcp-server\src\engines\SwissTypeCollisionEngine.ts' was already read 14s ago in this session and is unchanged (mtime 1779249929551). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### User | 2026-06-11T05:29:55.195Z

[tool_result] 1	/**
2	 * turningDispatcher.swiss-collision-wire.test.ts
3	 *
4	 * ROMEO WIRING/U-WIRE-SWISSCOLLISION -- round-trip wire test for the 4 swiss_collision_* actions
5	 * wrapping the stateless SwissTypeCollisionEngine through prism_turning. Invokes THROUGH the
6	 * dispatcher (action enum -> validateActionParams -> getEngine -> switch guard -> engine method),
7	 * NOT the engine directly, so the act
... [+10993 chars truncated]

### Assistant | 2026-06-11T05:29:57.704Z

I have the test file and the engine source (already in context). Now let me read the dispatcher cases and the Zod schemas.

### Assistant | 2026-06-11T05:29:59.143Z

[tool_use: Grep]

### User | 2026-06-11T05:30:00.154Z

[tool_result] 402-  "turret_check_interference",               // checkToolInterference(assignments, config)
403-  \ Swiss-vs-conventional routing decision -- SwissTypeDecisionEngine (WIRING\U-WIRE-SWISSDECIDE, slot:romeo)
404-  "swiss_decide",                            // decide(spec) -> RoutingVerdictResult (weighted scoring + hard blocks)
405-  "swiss_decide_batch",                      // decideBatch(specs
... [+3611 chars truncated]

### Assistant | 2026-06-11T05:30:00.275Z

[tool_use: Grep]

### User | 2026-06-11T05:30:00.280Z

[tool_result] <tool_use_error>Path does not exist: H:/prism-slot-romeo/mcp-server/src/tools/dispatchers/turningActionSchemas.ts. Note: your current working directory is H:\prism-slot-romeo.</tool_use_error>

### Assistant | 2026-06-11T05:30:05.641Z

The dispatcher cases are clear. Let me locate the schemas file and verify the `getEngine("swissCollision")` lazy import and sibling wire conventions.

### Assistant | 2026-06-11T05:30:07.073Z

[tool_use: Bash]

### Assistant | 2026-06-11T05:30:08.347Z

[tool_use: Grep]

### User | 2026-06-11T05:30:08.947Z

[tool_result] H:/prism-slot-romeo/mcp-server/src/schemas/hypermill/cam/turningSchemas.ts
H:/prism-slot-romeo/mcp-server/src/schemas/nxcamTurningFunctionIndexActionSchemas.ts
H:/prism-slot-romeo/mcp-server/src/schemas/solidcamTurningFunctionIndexActionSchemas.ts
H:/prism-slot-romeo/mcp-server/src/schemas/turningActionSchemas.ts
H:/prism-slot-romeo/mcp-server/src/schemas/turningProgramActionSchemas.ts

### User | 2026-06-11T05:30:10.042Z

[tool_result] 33-\ WIRING\U-WIRE-SWISSDECIDE (slot:romeo) -- stateless Swiss-vs-conventional routing decision (pure scoring)
34-let _swissDecide: any;
35-\ WIRING\U-WIRE-SWISSCOLLISION (slot:romeo) -- stateless Swiss-type collision-check suite (checkAll + gang + scenario + preset)
36:let _swissCollision: any;
37-async function getEngine(name: string): Promise<any> {
38-  switch (name) {
39-    case "chuck": ret
... [+3322 chars truncated]

### Assistant | 2026-06-11T05:30:13.377Z

The lazy import and dispatcher cases are confirmed. Now let me read the Zod schemas and verify the engine source sections I need to re-derive against (checkAll gating, checkGangInterference, generateCollisionScenario, getMachinePreset, and the constants).

### Assistant | 2026-06-11T05:30:14.330Z

[tool_use: Read]

### User | 2026-06-11T05:30:15.161Z

[tool_result] 1	/**
2	 * Turning Dispatcher Action Schemas
3	 * ==================================
4	 * Per-action Zod schemas for all 7 prism_turning actions.
5	 * SAFETY CRITICAL — chuck/tailstock forces affect workpiece ejection risk.
6	 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
7	 *
8	 * @module schemas/turningActionSchemas
9	 * @version 1.0.0
10	 */
11	
12	import { z } from "zod";
13	imp
... [+1868 chars truncated]

### Assistant | 2026-06-11T05:30:15.718Z

[tool_use: Grep]

### User | 2026-06-11T05:30:16.690Z

[tool_result] 1924-\ Swiss-type collision-check suite -- SwissTypeCollisionEngine (WIRING\U-WIRE-SWISSCOLLISION, slot:romeo)
1925-// SAFETY CRITICAL. Lenient passthrough schemas; config/state/gangConfig presence enforced in the
1926-\ dispatcher switch, all clearance physics owned by the engine. machineType: Star|Citizen|Tornos|Tsugami.
1927-// ===================================================================
... [+1744 chars truncated]

### Assistant | 2026-06-11T05:30:20.396Z

Schemas confirmed. Now I need to independently re-derive the engine logic. The engine source is in my context from 14s ago, but let me read the specific load-bearing sections precisely to re-derive every reference value (the system reminder says it's already in context, but I must verify exact line numbers for citations). Let me grep the key methods.

### Assistant | 2026-06-11T05:30:23.956Z

[tool_use: Grep]

### User | 2026-06-11T05:30:25.014Z

[tool_result] 42:const MIN_GANG_TOOL_CLEARANCE_MM = 3.0;
51:const GUIDE_BUSHING_CLEARANCE_MM = 0.005;
63:const BAR_RUNOUT_FACTOR = 0.001; // 0.1% of diameter
225:  hasCrossSlide: boolean;
381:export const SWISS_MACHINE_PRESETS: Record<string, Partial<SwissMachineConfig>> = {
549:  checkAll(config: SwissMachineConfig, state: SwissMachineState): SwissCollisionResult {
557:      const gangResult = this.checkGangIn
... [+3408 chars truncated]

### Assistant | 2026-06-11T05:30:29.578Z

Now I have the structural map. I notice a critical detail at line 1331: `if (preset?.hasCrossSlide !== false)` — this is the cross_slide gating logic in `generateCollisionScenario`. The test comment and prompt claim "NO preset sets hasCrossSlide so cross_slide is always added." Let me read the exact sections to re-derive: `checkAll` (549-760), `checkGangInterference` (772-820), `generateCollisionScenario` (1292-1350), `getMachinePreset` (1453-1475), the presets (381-540), and bar_runout/bushing_thermal checks.

### Assistant | 2026-06-11T05:30:30.461Z

[tool_use: Read]

### User | 2026-06-11T05:30:31.294Z

[tool_result] 549	  checkAll(config: SwissMachineConfig, state: SwissMachineState): SwissCollisionResult {
550	    const checks: SwissCollisionCheck[] = [];
551	    const warnings: string[] = [];
552	    const criticals: string[] = [];
553	    const safeZones: SwissCollisionZone[] = [];
554	
555	    // 1. Gang slide interference matrix
556	    if (config.gangSlide && config.gangSlide.stations.length > 0) {
557	
... [+11293 chars truncated]

### Assistant | 2026-06-11T05:30:39.949Z

I've now re-derived `checkAll` and `checkGangInterference` directly from source. Let me verify my derivations:

**checkAll(minConfig, minState)** — config has `hasGuideBushing:true`, `guideBushing` present, `hasCrossSlide:false`, NO `gangSlide`/`bAxis`/`subSpindle`/`ejectorPinLength_mm`:
- Check 1 (gang): `config.gangSlide` absent → skip ✓
- Check 2 (bAxis): `config.bAxis?.hasAxis` undefined → skip ✓
- Check 3 (bushing_thermal): `hasGuideBushing && guideBushing` → **FIRES** ✓
- Check 4 (pickoff): `config.subSpindle?.hasSubSpindle` undefined → skip ✓
- Check 5 (cross-slide): `config.hasCrossSlide` is false → skip ✓
- Check 6 (ejector): `config.ejectorPinLength_mm` falsy → skip ✓
- Check 7 (bar_runout): **UNCONDITIONAL → FIRES** ✓
- Check 8 (live_tool): `config.gangSlide` absent → skip ✓

So `checks.length === 2` (bushing_thermal + bar_runout) ✓. SafeZones: line 745 unconditional barSafeZone (+1); gangSlide absent, bAxis absent → `safeZones.length === 1` ✓.

Now I must verify the bushing_thermal and bar_runout PASS conditions, and the gang clearance math. Let me read `checkBushingThermal`, `checkBarRunout`, the presets, `generateCollisionScenario`, and `getMachinePreset`.

### Assistant | 2026-06-11T05:30:41.406Z

[tool_use: Read]

### Assistant | 2026-06-11T05:30:42.170Z

[tool_use: Read]

### User | 2026-06-11T05:30:42.259Z

[tool_result] 940	    // Thermal expansion of bushing inner diameter
941	    // Brass/carbide expand, reducing clearance
942	    const expansionCoeff = bushing.material === "carbide" ? 0.000006 : BUSHING_THERMAL_EXPANSION_COEFF;
943	    const thermalExpansion = bushing.innerDiameter_mm * expansionCoeff * deltaT;
944	
945	    // Effective inner diameter after expansion
946	    const effectiveID = bushing.innerDi
... [+1378 chars truncated]

### User | 2026-06-11T05:30:42.995Z

[tool_result] 1190	  }
1191	
1192	  // --------------------------------------------------------------------------
1193	  // 9. Bar stock runout collision
1194	  // --------------------------------------------------------------------------
1195	  /**
1196	   * Check bar stock runout against bushing clearance
1197	   * @param config Machine configuration
1198	   * @param state Current machine state
1199	   * @ret
... [+1221 chars truncated]

### Assistant | 2026-06-11T05:30:53.497Z

Re-deriving the two PASS conditions:

**bushing_thermal** (checkBushingThermal, innerDiameter 20.5, barDia 20, no `bushingTemp_celsius`):
- `deltaT` = 0 (no temp). thermalExpansion = 20.5 × coeff × 0 = 0. effectiveID = 20.5.
- effectiveClearance = (20.5 − 20)/2 = **0.25**. minSafeClearance = GUIDE_BUSHING_CLEARANCE_MM = 0.005.
- safe = 0.25 ≥ 0.005 → **true** ✓ (matches test's `passed === true`)

**bar_runout** (checkBarRunout, barDia 20, guideBushing.innerDiameter 20.5):
- maxRunout = 20 × 0.001 = **0.02**. effectiveDiameter = 20 + 2×0.02 = **20.04**.
- bushingID = 20.5 (from `config.guideBushing.innerDiameter_mm`). bushingClearance = (20.5 − 20.04)/2 = **0.23**.
- safe = 0.23 > 0 → **true** ✓

Both pass → `safe === true`, `checks.length === 2` ✓.

**Gang UNSAFE [st1,st2]** @pitch25, holderWidth20, toolDia10:
- envelopeA = 20/2 + 10/2 = 10+5 = **15**. envelopeB = **15**.
- stationGap = |2−1| × 25 = **25**. clearance = 25 − (15+15) = 25 − 30 = **−5** ✓
- −5 < 3 → matrixMap[0][1]=false ✓. overlap = 3 − (−5) = **8** ✓. minimumClearance = −5 ✓.

**Gang SAFE [st1,st5]**:
- stationGap = |5−1| × 25 = **100**. clearance = 100 − 30 = **70** ✓. 70 ≥ 3 → matrixMap[0][1]=true ✓, minClearance 70 ✓.

All gang math confirmed. Now the scenario and preset logic. Let me read `generateCollisionScenario` (1292-1355), `getMachinePreset` (1453-1475), and the SWISS_MACHINE_PRESETS block (381-540).

### Assistant | 2026-06-11T05:30:55.414Z

[tool_use: Read]

### Assistant | 2026-06-11T05:30:55.651Z

[tool_use: Read]

### User | 2026-06-11T05:30:56.390Z

[tool_result] 1292	  generateCollisionScenario(machineType: SwissMachineType): SwissCollisionScenario {
1293	    const components: SwissComponent[] = [
1294	      "guide_bushing",
1295	      "main_spindle",
1296	      "gang_slide",
1297	      "bar_stock",
1298	      "part",
1299	    ];
1300	
1301	    const collisionPairs: CollisionPair[] = [
1302	      { componentA: "gang_slide", componentB: "bar_stock", scenar
... [+3266 chars truncated]

### User | 2026-06-11T05:30:56.590Z

[tool_result] 1453	  getMachinePreset(machineType: SwissMachineType, model?: string): Partial<SwissMachineConfig> | undefined {
1454	    const key = model ? `${machineType}_${model.replace(/[^a-zA-Z0-9]/g, "")}` : undefined;
1455	    if (key && SWISS_MACHINE_PRESETS[key]) {
1456	      return SWISS_MACHINE_PRESETS[key];
1457	    }
1458	
1459	    // Return first matching preset for this manufacturer
1460	    for 
... [+347 chars truncated]

### Assistant | 2026-06-11T05:31:01.129Z

The loop warnings are spurious (these are distinct offset reads), but I have what I need. The scenario logic is confirmed. Now the critical re-derivation hinges on the SWISS_MACHINE_PRESETS contents — specifically whether any preset's key starts with the manufacturer name, has `bAxis.hasAxis` and `subSpindle.hasSubSpindle`, and whether any sets `hasCrossSlide`. Let me read the presets block.

### Assistant | 2026-06-11T05:31:02.276Z

[tool_use: Read]

### User | 2026-06-11T05:31:03.157Z

[tool_result] 381	export const SWISS_MACHINE_PRESETS: Record<string, Partial<SwissMachineConfig>> = {
382	  "Star_SR-20": {
383	    machineType: "Star",
384	    model: "SR-20",
385	    maxBarDiameter_mm: 20,
386	    mainSpindleMaxRpm: 10000,
387	    hasGuideBushing: true,
388	    guideBushing: {
389	      innerDiameter_mm: 20.5,
390	      outerDiameter_mm: 38,
391	      length_mm: 30,
392	      material: "carbi
... [+4209 chars truncated]

### Assistant | 2026-06-11T05:31:15.283Z

Now I have full ground truth on the presets. Final re-derivations:

**scenario("Star")**: preset lookup `Star_SR-20` exists (line 382). It has `bAxis.hasAxis: true` (404), `subSpindle.hasSubSpindle: true` (412), and NO `hasCrossSlide` key → `preset?.hasCrossSlide !== false` is `undefined !== false` = **true** → cross_slide added.
- Components: base 5 + b_axis_tool (1) + sub_spindle,pickoff_spindle (2) + cross_slide (1) + ejector_pin (1) = **10** ✓
- collisionPairs: base 3 + bAxis 3 + subSpindle 3 + crossSlide 2 + ejector 2 = **13** ✓

**scenario("Citizen")**: `Citizen_L20` exists (420), same structure → 10/13 ✓. Confirmed NO preset sets `hasCrossSlide` (grep at line 225 was the interface field; line 662 reads `config.hasCrossSlide`; line 1331 is the only scenario gate — none of the 4 presets define the key). So cross_slide is always added ✓.

**preset("Star")**: `getMachinePreset("Star")` no model → loops, `"Star_SR-20".startsWith("Star")` → returns Star_SR-20: model "SR-20", maxBarDiameter_mm 20, mainSpindleMaxRpm 10000 ✓.

**preset("Tornos")**: `"Tornos_SwissGT".startsWith("Tornos")` → returns Tornos_SwissGT: model "Swiss GT 26", maxBarDiameter_mm 26 ✓.

**preset("Nonexistent")**: no key starts with "Nonexistent" → returns `undefined` → dispatcher: `found: !!undefined` = false ✓.

Now the dispatcher try/catch — let me verify the throws are converted to `{success:false, error}` and check for em-dash/ASCII-guard risk in the new code.

### Assistant | 2026-06-11T05:31:16.852Z

[tool_use: Read]

### User | 2026-06-11T05:31:17.708Z

[tool_result] 2634	          }
2635	
2636	          default:
2637	            result = { error: `Unknown action: ${action}` };
2638	        }
2639	        // PIPELINE-VAR U-PV03b: Auto-chain PostProcessor for any mill-turn result with program_text
2640	        if ((result as any)?.program_text && (result as any).program_text.length > 0) {
2641	          try {
2642	            const { postProcessorPipelineEngine
... [+2325 chars truncated]

### Assistant | 2026-06-11T05:31:25.671Z

The try/catch at line 2682-2685 confirms: any engine throw (including the 5 switch-guard `throw new Error(...)` statements) is caught and routed through `dispatcherError(error, action, "prism_turning")`. I need to confirm `dispatcherError` returns a parseable `{success:false, error}` shape. I also spotted a pre-existing mojibake `â€"` at line 2659 (an em-dash that got UTF-8-mangled) — but that's NOT in the new code; it's in the pre-existing PostProcessor block. Let me verify `dispatcherError`'s shape and `slimResponse` behavior for the failure path.

### Assistant | 2026-06-11T05:31:26.848Z

[tool_use: Bash]

### User | 2026-06-11T05:32:36.522Z

[tool_result] src/utils/dispatcherMiddleware.ts:32:export function dispatcherError(

### Assistant | 2026-06-11T05:32:38.942Z

[tool_use: Read]

### User | 2026-06-11T05:32:39.790Z

[tool_result] 32	export function dispatcherError(
33	  error: unknown,
34	  action: string,
35	  dispatcher: string,
36	): DispatcherErrorResult {
37	  const message = error instanceof Error ? error.message : String(error);
38	  const body = {
39	    success: false as const,
40	    error: message,
41	    action,
42	    dispatcher,
43	    details: error instanceof Error ? { stack: error.stack } : undefined,
44	 
... [+940 chars truncated]

### Assistant | 2026-06-11T05:32:50.590Z

`dispatcherError` returns `content[0].text = JSON.stringify({success:false, error:message, ...})`. The test's `call()` helper parses `r.content[0].text` → gets `{success:false, error}`. Each switch guard throws `"<action>: '<field>' ... is required"` — the message contains the literal word **"required"**, so `String(r.error)).toContain("required")` passes for all 5 failure-mode tests. The failure path is valid and round-tripped through the dispatcher.

One final verification: the failure-mode tests rely on the engine throw vs the Zod schema. The schemas are all `.optional().passthrough()`, so a missing `config`/`state`/`machineType` passes Zod validation and reaches the switch guard which throws — confirming the guard (not Zod) is what fires. But I should verify there's no earlier normalization/validation layer that would reject these with a different (non-"required") message. Let me check that the `swiss_collision_gang` "no stations" case actually reaches the guard — `{ stationPitch_mm: 25 }` passes the `.optional()` gangConfig schema, reaches line 2610: `!Array.isArray(gangConfig.stations)` → true → throws "required". Confirmed.

Let me do a final check for any tautological assertions and confirm the test's "matrixMap[0][1]" indexing is meaningful (not always-true). The matrix is initialized all-`true` (line 779), and only set `false` on interference. For the SAFE case, `matrixMap[0][1]` staying `true` could be tautological — but the test ALSO asserts `minimumClearance_mm === 70` (a derived value) and `safe === true`, so a silent logic change is caught by those. For the UNSAFE case, `matrixMap[0][1] === false` is non-tautological (must be flipped from the init default). 

Let me confirm there are no inlined magic constants in the new dispatcher/schema code and check em-dash usage in the new lines specifically.

### Assistant | 2026-06-11T05:32:52.398Z

[tool_use: Bash]

### User | 2026-06-11T05:32:53.635Z

[tool_result] 1:          // ── Swiss-type collision-check suite (WIRING/U-WIRE-SWISSCOLLISION, slot:romeo) ──
---schemas---
exit-scan-done

### Assistant | 2026-06-11T05:32:57.851Z

The only non-ASCII in the new code is the `──` box-drawing characters in a comment header (line 2591) — consistent with the sibling `swiss_decide` section header style and other section delimiters in the dispatcher. No em-dash mojibake in the new code (the `â€"` at line 2659 is pre-existing PostProcessor code, outside this changeset). The schema lines are pure ASCII. No inlined magic constants — all clearance physics stays in the engine.

All derivations complete. Let me record my verdict.

### Assistant | 2026-06-11T05:32:57.967Z

[tool_use: TaskUpdate]

### User | 2026-06-11T05:32:58.456Z

[tool_result] Updated task #9 status

### Assistant | 2026-06-11T05:33:25.978Z

## Independent Second-Pass Review — U-WIRE-SWISSCOLLISION

**GRADE: PASS** — every reference value independently re-derived from engine source matches the test assertions exactly; the dispatcher try/catch validly converts the 5 switch-guard throws into parseable `{success:false,error}` containing "required"; no P0/P1 issues found.

### Independent re-derivations (from source, not test comments)

**checkAll(minConfig, minState)** — `SwissTypeCollisionEngine.ts:549`
Config has `hasGuideBushing:true` + `guideBushing`, `hasCrossSlide:false`, no gangSlide/bAxis/subSpindle/ejectorPinLength_mm. Of the 8 checks: #1 gang (`:556` gangSlide absent→skip), #2 bAxis (`:584` skip), #3 bushing_thermal (`:610` **FIRES**), #4 pickoff (`:636` skip), #5 cross-slide (`:662` `hasCrossSlide` false→skip), #6 ejector (`:673` skip), #7 bar_runout (`:699` **UNCONDITIONAL, FIRES**), #8 live-tool (`:723` gangSlide absent→skip). → **checks.length===2**, types `["bar_runout","bushing_thermal"]` after sort ✓. SafeZones: `:745` barSafeZone unconditional (+1), gang/bAxis absent → **safeZones.length===1** ✓.
- bushing_thermal (`:957`): deltaT=0 → effectiveClearance=(20.5−20)/2=**0.25** ≥ 0.005 → pass ✓
- bar_runout (`:1203`): maxRunout=20×0.001=0.02, effDia=20.04, bushingClearance=(20.5−20.04)/2=**0.23** > 0 → pass ✓
- → safe===true, every `passed===true` ✓

**gang UNSAFE [st1,st2]** — `:781` envelopeA=envelopeB=20/2+10/2=15; stationGap=1×25=25; clearance=25−30=**−5**; −5<3 → matrixMap[0][1]=false; overlap=3−(−5)=**8**; minimumClearance=**−5** ✓
**gang SAFE [st1,st5]** — stationGap=4×25=100; clearance=70; matrixMap[0][1]=true; minClearance=**70** ✓

**scenario("Star"/"Citizen")** — `:1292` base 5 comp / 3 pairs. Star_SR-20 (`:382`) has `bAxis.hasAxis:true`+`subSpindle.hasSubSpindle:true`, NO `hasCrossSlide` key. Gate `:1331` `undefined !== false`=true → cross_slide always added. Components 5+1+2+1+1=**10**; pairs 3+3+3+2+2=**13** ✓. Verified all 4 presets (`:382,420,458,496`) — none define `hasCrossS
... [+2626 chars truncated]
