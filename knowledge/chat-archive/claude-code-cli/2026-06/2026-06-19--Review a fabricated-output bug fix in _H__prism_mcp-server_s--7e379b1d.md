---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Review a fabricated-output bug fix in `H:/prism/mcp-server/src/engines/WEDMCalcu"
date: "2026-06-19"
first_ts: "2026-06-19T17:42:16.862Z"
last_ts: "2026-06-19T17:45:51.141Z"
cwd: "H:\\prism\\mcp-server"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-ade4fba3ed2314aea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a fabricated-output bug fix in `H:/prism/mcp-server/src/engines/WEDMCalcu

> **claude-code-cli** | 2026-06-19 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-ade4fba3ed2314aea.jsonl`

## Transcript

### User | 2026-06-19T17:42:16.862Z

Review a fabricated-output bug fix in `H:/prism/mcp-server/src/engines/WEDMCalculatorAIEngine.ts` (slot:bravo, ENGINE-AUDIT). The audit found `calculatePassParameters` hardcoded `const pathLength = 100; // placeholder`, so every `passes[].cutting_time_min` + the shipped `predicted_cycle_time_min` were computed from a fake 100mm path. Fix (5 additive edits):
1. Added optional `cut_length_mm?: number` to `WEDMCalcInput`.
2. Added named constant `DEFAULT_ESTIMATE_PATH_LENGTH_MM = 100`.
3. `calculatePassParameters`: `pathLength = input.cut_length_mm && input.cut_length_mm > 0 ? input.cut_length_mm : DEFAULT_ESTIMATE_PATH_LENGTH_MM`.
4. `estimateCycleTime`: `confidence: input.cut_length_mm && input.cut_length_mm > 0 ? 0.85 : 0.35`.
5. `generateWarnings`: pushes an ESTIMATE warning when cut_length_mm absent/<=0.

Test `src/__tests__/WEDMCalculatorAIEngine.test.ts` (10 tests, ALL PASS, tsc clean). Dispatcher `edmDispatcher.ts:2411` passes `params` directly to the engine, so cut_length_mm flows through (no dispatcher change).

Weighted toward silent breakage / regression:
1. Is the fix ADDITIVE + non-breaking? (cut_length_mm optional; cutting_time_min stays `number`; existing callers omitting it get the prior behavior PLUS honest flagging.) Any consumer that breaks?
2. The estimate-vs-real guard `input.cut_length_mm && input.cut_length_mm > 0` is used in 3 places — are all 3 consistent (no NaN/Infinity leak; a huge cut_length doesn't break)?
3. TEST INTEGRITY (R9): is the linearity invariant (cutting_time(500)==5*cutting_time(100)) mathematically correct given cutting_time=pathLength/feed and feed independent of cut_length? Would the tests fail if the bug returned (pathLength reverted to 100)?
4. Does the fix change any WEDM PHYSICS (feed, offset, Ra, wire) — it should ONLY change the cut-length source + confidence/warning?
5. Is lowering confidence to 0.35 + a warning the right R12 "surface uncertainty" behavior (vs silently keeping 0.85)?

Read the 5 edit sites + the test
... [+103 chars truncated]

### Assistant | 2026-06-19T17:42:20.652Z

I'll investigate this WEDM calculator fix end-to-end, tracing every changed symbol and its consumers.

### Assistant | 2026-06-19T17:42:21.167Z

[tool_use: Read]

### Assistant | 2026-06-19T17:42:21.710Z

[tool_use: Read]

### User | 2026-06-19T17:42:22.271Z

[tool_result] 1	/**
2	 * WEDMCalculatorAIEngine — AI-Powered Wire EDM Calculator for PRISM App
3	 *
4	 * Provides Claude Opus-level intelligence for the Wire EDM calculator page:
5	 * - Speed/feed optimization with physics reasoning
6	 * - Wire type selection with material compatibility
7	 * - Pass strategy recommendations
8	 * - Surface finish prediction with confidence intervals
9	 * - Cycle time estimation w
... [+26112 chars truncated]

### User | 2026-06-19T17:42:22.815Z

[tool_result] 1	/**
2	 * WEDMCalculatorAIEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-WEDM-CUTTIME-FABRICATION).
3	 *
4	 * The engine/algo/formula audit (iter 8) found `calculatePassParameters` hardcoded
5	 * `pathLength = 100; // placeholder`, so EVERY passes[].cutting_time_min and the shipped
6	 * predicted_cycle_time_min were computed from a fabricated 100mm path -- a real fabricated-output
7	 * d
... [+5722 chars truncated]

### Assistant | 2026-06-19T17:42:27.156Z

I have read the engine and the test end-to-end. Now let me trace the consumers of this engine to verify the additive `cut_length_mm` flows correctly and that no consumer breaks. The dispatcher claim says `edmDispatcher.ts:2411` passes `params` directly. Let me verify that and find every consumer.

### Assistant | 2026-06-19T17:42:28.559Z

[tool_use: Grep]

### Assistant | 2026-06-19T17:42:29.453Z

[tool_use: Grep]

### User | 2026-06-19T17:42:29.828Z

[tool_result] <persisted-output>
Output too large (27.1KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\7e379b1d-d716-46f2-8850-28bcd0a929a9\tool-results\toolu_013BYmndxp6Adu6Mg4yskfqL.txt

Preview (first 2KB):
src\tools\dispatchers\turningDispatcher.ts:1200:            if (typeof p?.cut_length_mm !== "number") throw new Error("lathe_op_time_compute requires 'cut_length_mm' (number)");
src\sc
... [+1783 chars truncated]

### User | 2026-06-19T17:42:30.938Z

[tool_result] Found 117 files
src\__tests__\WEDMCalculatorAIEngine.test.ts
src\engines\WEDMCalculatorAIEngine.ts
src\engines\WireEDMNeuralOrchestrationEngine.ts
src\engines\WEDMNeuralTrainingEngine.ts
src\engines\WEDMSetupSheetEngine.ts
src\tools\dispatchers\calcDispatcher.ts
src\schemas\calcActionSchemas.ts
src\tools\dispatchers\intelligenceDispatcher.ts
data\state\TEST_COVERAGE_INDEX.json
web\src\api\wedmErp.
... [+4570 chars truncated]

### Assistant | 2026-06-19T17:42:35.936Z

Let me examine the two key consumer sites: the main dispatcher call (line 2410-2412) and the `calcDispatcher.ts:9612` site, plus the schema validation that may gate `params` before reaching the engine.

### Assistant | 2026-06-19T17:42:36.870Z

[tool_use: Read]

### Assistant | 2026-06-19T17:42:37.752Z

[tool_use: Read]

### User | 2026-06-19T17:42:38.010Z

[tool_result] 2380	            }
2381	            const minR = wedmCornerPhysicsEngine.calculateMinCornerRadius(p.wireDiameter, p.sparkGap);
2382	            result = { min_corner_radius_mm: minR, source: "WEDMCornerPhysicsEngine.calculateMinCornerRadius" };
2383	            break;
2384	          }
2385	          case "wedm_dielectric_temp_factor": {
2386	            const { wedmDielectricCorrectionEngine } = a
... [+3330 chars truncated]

### User | 2026-06-19T17:42:42.435Z

[tool_result] 1500	              current_A: params.current_A,
1501	            });
1502	            break;
1503	          }
1504	          case "wedm_spark_erosion_validate": {
1505	            const engine = await getEngine("sparkErosion");
1506	            result = engine.validateParameters({
1507	              material: params.material,
1508	              thickness_mm: params.thickness_mm,
1509	             
... [+1572 chars truncated]

### Assistant | 2026-06-19T17:42:47.158Z

The `wedm_calculator_run` case at line 2411 passes `params` directly with a type cast to the engine, confirming the dispatcher claim. `cut_length_mm` flows through with no dispatcher change needed. Let me verify the schema for `wedm_calculator_run` doesn't strip unknown fields (Zod `.strict()` would reject `cut_length_mm`), and check the `calcDispatcher.ts:9612` site plus the schema definition.

### Assistant | 2026-06-19T17:42:48.101Z

[tool_use: Read]

### Assistant | 2026-06-19T17:42:48.899Z

[tool_use: Grep]

### User | 2026-06-19T17:42:49.050Z

[tool_result] 9590	            break;
9591	          }
9592	          case "speedfeed_ultimate_ai_stats": {
9593	            const { speedFeedUltimateAIEngine } = await import("../../engines/SpeedFeedUltimateAIEngine.js");
9594	            const out = speedFeedUltimateAIEngine.stats();
9595	            result = { success: true, stats: out };
9596	            break;
9597	          }
9598	
9599	          // FEATU
... [+2208 chars truncated]

### User | 2026-06-19T17:42:50.768Z

[tool_result] src\tools\dispatchers\edmDispatcher.ts:383:  "wedm_calculator_run",                   // WEDMCalculatorAIEngine.calculate
src\tools\dispatchers\edmDispatcher.ts:2409:          case "wedm_calculator_run": {
src\__tests__\edmDispatcherUnwiredBatch1.test.ts:129:    "wedm_calculator_run",

### Assistant | 2026-06-19T17:42:56.343Z

The `calcDispatcher.ts:9612` site is an unrelated `gilbert_econ_speed_compute` action (different engine), not a WEDM consumer — confirming `cut_length_mm` is a widely-used param name across the codebase but the only consumer of THIS engine is `edmDispatcher.ts:2411`. Now let me verify the schema for `wedm_calculator_run` to confirm it doesn't reject the new field, and confirm whether `params` is Zod-validated before reaching the engine (if `.strict()`, an unknown `cut_length_mm` would be stripped/rejected silently).

### Assistant | 2026-06-19T17:42:58.134Z

[tool_use: Bash]

### User | 2026-06-19T17:43:03.264Z

[tool_result] ---STRICT-CHECK---
---SCHEMA-FILES---
edmActionSchemas.ts
wedmDLCoreSchemas.ts
wedmErpActionSchemas.ts
wedmFeatureImportanceSchemas.ts
wedmGapVoltageSchemas.ts
wedmGnnWeightsSchema.ts
wedmHAZSchemas.ts
wedmJobHistorySchema.ts
wedmLatticeGraphSchema.ts
wedmMLOptimizerSchemas.ts
wedmMRRSchemas.ts
wedmOnlineLearningSchemas.ts
wedmPipelineActionSchemas.ts
wedmRecastMLSchemas.ts
wedmSparkErosionSchemas
... [+201 chars truncated]

### Assistant | 2026-06-19T17:43:08.241Z

No schema references `wedm_calculator_run`, meaning the action's params are NOT Zod-validated before reaching the engine — `params` is passed through raw with a type cast. This is important: it confirms there's no `.strict()` schema that would reject or strip the new `cut_length_mm` field, so the additive field flows through cleanly. Let me verify how the dispatcher acquires `params` (whether any normalization layer would strip unknown keys) and check the `calculateQuick` consumers since that method also calls the changed `calculatePassParameters`/`estimateCycleTime`.

### Assistant | 2026-06-19T17:43:10.129Z

[tool_use: Grep]

### Assistant | 2026-06-19T17:43:10.910Z

[tool_use: Grep]

### User | 2026-06-19T17:43:11.202Z

[tool_result] src\cli\index.ts:377:        const result = engine.calculate(route.action || action, params);
src\cli\index.ts:726:        const queueResult = schedulingPhysicsEngine.calculate({
src\cli\index.ts:742:        const batchResult = schedulingPhysicsEngine.calculate({
src\cli\index.ts:755:        const capacityResult = schedulingPhysicsEngine.calculate({
src\cli\index.ts:966:            const calcResul
... [+99 chars truncated]

### User | 2026-06-19T17:43:12.099Z

[tool_result] No matches found

### Assistant | 2026-06-19T17:43:17.201Z

Let me directly grep for the only two methods that consume the changed code paths, to confirm `calculateQuick` has no other callers (it lacks the confidence/warning surfacing so a consumer relying on it would not get the R12 flag), and confirm the web frontend consumes via the dispatcher HTTP bridge rather than the engine directly.

### Assistant | 2026-06-19T17:43:20.116Z

[tool_use: Bash]

### User | 2026-06-19T17:43:48.961Z

[tool_result] === calculateQuick callers (engine internal + external) ===
src/engines/TribalExplanationEngine.ts:277:      const matchScore = tip ? this.calculateQuickMatch(tip, context) : 0;
src/engines/TribalExplanationEngine.ts:628:  private calculateQuickMatch(tip: any, context: ExplanationContext): number {
src/engines/WEDMCalculatorAIEngine.ts:680:  calculateQuick(input: WEDMCalcInput): Partial<WEDMCalcRe
... [+357 chars truncated]

### Assistant | 2026-06-19T17:43:54.365Z

`calculateQuick` (line 680) has NO external callers — only its own definition. The `calculateQuickMatch` hits are an unrelated engine. So the only public entry is `calculate()` via the dispatcher. Let me inspect the web frontend consumers to see whether any read `cut_length_mm` or `cycle_time_confidence` / whether they expect the cycle time as authoritative, and check the web type definition for the result shape (a frontend that types `predicted_cycle_time_min` strictly should be unaffected since the field stays `number`).

### Assistant | 2026-06-19T17:43:54.788Z

[tool_use: Read]

### User | 2026-06-19T17:43:55.688Z

[tool_result] 1	/**
2	 * Wire EDM Calculator API — calls edmDispatcher (prism_edm) via /api/v1/edm/*
3	 *
4	 * Routes:
5	 *   /calculator-solve  — 6-engine orchestration (settings→multipass→cutting→corners→surface→cost)
6	 *   /wire              — legacy quick wire settings
7	 *   /multipass          — full multi-pass strategy
8	 *   /cost               — cost estimation
9	 *   /machines           — wire EDM ma
... [+20187 chars truncated]

### Assistant | 2026-06-19T17:44:02.464Z

The web frontend's `WireEdmCalcParams`/`WireEdmCalcResult` (line 82, 321) is a SEPARATE shape that goes through `/calculator-solve` (a 6-engine orchestration route), NOT `wedm_calculator_run`/`WEDMCalculatorAIEngine`. The frontend never directly types this engine's `WEDMCalcInput`/`WEDMCalcResult`, so the additive field cannot break frontend type-checking. Let me confirm there is no other route that maps to `WEDMCalculatorAIEngine` and verify the math invariant in the test by tracing the feed computation once more, and check the `calculateQuick` omission of confidence/warning is pre-existing (not introduced by this fix).

### Assistant | 2026-06-19T17:44:04.637Z

[tool_use: Bash]

### User | 2026-06-19T17:44:08.247Z

[tool_result] === git diff stat for this session (engine + test) ===
 mcp-server/src/engines/WEDMCalculatorAIEngine.ts | 27 +++++++++++++++++++++---
 1 file changed, 24 insertions(+), 3 deletions(-)

=== diff of the engine (the 5 edits) ===
diff --git a/mcp-server/src/engines/WEDMCalculatorAIEngine.ts b/mcp-server/src/engines/WEDMCalculatorAIEngine.ts
index 060b0f9623..b029f95b47 100644
--- a/mcp-server/src/eng
... [+3109 chars truncated]

### Assistant | 2026-06-19T17:44:15.457Z

The diff confirms exactly the 5 additive edits described, and crucially the prior code already had `confidence: 0.85` hardcoded — so the `calculateQuick` omission of confidence/warning is pre-existing, not introduced. Let me verify two remaining concerns: (1) the test will actually fail if the bug reverts (regression-locking), and (2) the `Infinity`/`NaN` edge — what happens when `feed` could be 0 (division), and confirm the linearity invariant holds given `feed` is independent of `cut_length`. Let me trace the feed formula and run the actual test to confirm green.

### Assistant | 2026-06-19T17:44:16.977Z

[tool_use: Bash]

### User | 2026-06-19T17:44:22.504Z

[tool_result] === Run the WEDM test ===
[INFO] [PRISMIntelligence] Reasoning: wedm_calculator - Enhance Wire EDM calculator results with AI reason...

stderr | src/__tests__/WEDMCalculatorAIEngine.test.ts > WEDMCalculatorAIEngine cut-time fabrication fix > the 0/negative cut_length matches the default-omitted estimate (both use the fallback)
[INFO] [WEDMCalculatorAI] Calculated 2-pass strategy for D2 cold-work 
... [+1961 chars truncated]

### Assistant | 2026-06-19T17:44:31.710Z

All 10 tests pass. Now let me verify the regression-locking claim (R9): would the test catch a revert of the bug? The linearity test (line 46-54) compares `cutting_time(500)` vs `5*cutting_time(100)`. If the bug reverted to `pathLength = 100` constant, then both would compute path=100, giving `cutting_time(500) == cutting_time(100)`, so `5*cutting_time(100) != cutting_time(100)` — test FAILS. That's a genuine regression-lock. Let me also verify the `feed` formula is truly independent of `cut_length` and check the NaN/Infinity edge where `feed` could go to zero.

Tracing `calculatePassParameters` (lines 433-450): `roughFeed = (baseRate / input.thickness_mm) * wirePerf.speed_factor`; `feed = isRough ? roughFeed : roughFeed * (1.5 + i*0.3)`. None of these reference `cut_length_mm` — confirmed independent, so linearity is mathematically exact. The only division-by-zero risk is `thickness_mm = 0`, which is pre-existing and orthogonal to this fix.

Let me do a final verification on whether any other dispatcher route or pipeline engine consumes this engine's output expecting `cycle_time_confidence == 0.85` as an invariant (a hidden coupling that the confidence-flip could break).

### Assistant | 2026-06-19T17:44:35.834Z

[tool_use: Bash]

### User | 2026-06-19T17:45:22.972Z

[tool_result] === any consumer reading cycle_time_confidence === 
RC=1

=== any consumer asserting/branching on 0.85 from this engine ===
src/engines/CrossCamRecommenderEngine.ts:87:  predicted_cycle_time_min: number;
src/engines/CrossCamRecommenderEngine.ts:457:    const bestSpeed = [...rankedStrategies].sort((a, b) => a.predicted_cycle_time_min - b.predicted_cycle_time_min)[0];
src/engines/CrossCamRecommender
... [+1811 chars truncated]

### Assistant | 2026-06-19T17:45:51.141Z

No consumer reads `cycle_time_confidence` anywhere (RC=1 = no matches), so flipping it 0.85→0.35 cannot break any downstream code. The `predicted_cycle_time_min` matches are all in `CrossCamRecommenderEngine` and `FleetLearningStrategyEngine` — entirely separate engines with their own field of the same name (CAM strategy comparison), not consumers of `WEDMCalculatorAIEngine`. The dispatcher returns `result` raw (no field stripping). The `tsc` grep returned no WEDMCalculatorAIEngine errors.

I have completed the full investigation. Here is my verdict.

---

VERDICT: PASS

summary: The fix is genuinely additive and non-breaking — `cut_length_mm` is an optional field, `cutting_time_min`/`predicted_cycle_time_min` stay `number`, and existing callers that omit it get the *exact* prior numeric behavior (path=100) plus honest low-confidence flagging. I traced every consumer: the sole entry point is `edmDispatcher.ts:2411 wedm_calculator_run`, which passes `params` through a raw type-cast (no Zod `.strict()` schema exists to strip/reject the new field), and the dispatcher returns the result un-stripped. No consumer anywhere reads `cycle_time_confidence`, so the 0.85→0.35 flip cannot break downstream logic. The R9 linearity invariant is mathematically sound and genuinely regression-locks the original bug.

findings:
- [PASS] No P0/P1/P2 found. All checks below verified.

Audit detail (auditable PASS):

1. Additive + non-breaking — CONFIRMED. `git diff` shows exactly 5 additive edits (24 ins / 3 del). `WEDMCalcInput.cut_length_mm` is `?:` optional (`WEDMCalculatorAIEngine.ts:59`); `WEDMPassParams.cutting_time_min` and `WEDMCalcResult.predicted_cycle_time_min` remain `number` (lines 76, 101). The pre-fix code already hardcoded `confidence: 0.85`, so nothing about the result contract changed shape. Sole consumer `edmDispatcher.ts:2411` casts `params` directly — no schema gate (grep of `src/schemas/` for `wedm_calculator_run` = 0 hits), so the new field flows through untouched. 
... [+2964 chars truncated]
