---
type: "chat-session"
source: "claude-code-cli"
session_id: "2a305e00-e356-4b4c-9010-951ae7d41845"
title: "Independent second-pass review of unit U-CAD-LEARN-CALIBRATE. Do NOT assume arm "
date: "2026-06-25"
first_ts: "2026-06-25T13:07:12.253Z"
last_ts: "2026-06-25T13:23:44.428Z"
cwd: "H:\\prism\\mcp-server"
messages: 105
user_msgs: 36
assistant_msgs: 69
raw_file: "H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-a57e42c034245165f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of unit U-CAD-LEARN-CALIBRATE. Do NOT assume arm 

> **claude-code-cli** | 2026-06-25 | 105 msgs (36 user / 69 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-a57e42c034245165f.jsonl`

## Transcript

### User | 2026-06-25T13:07:12.253Z

Independent second-pass review of unit U-CAD-LEARN-CALIBRATE. Do NOT assume arm A caught everything. Weight toward TEST INTEGRITY, DISPATCHER WIRING completeness, inlined-constant detection, and weakened/stub assertions.

Read the diff:
`git -C H:/prism diff -- mcp-server/src/engines/CADTrialErrorLearningEngine.ts mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts mcp-server/src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts`

CONTEXT: recommendAdjustments gained `calibrate?:boolean`; recalibrates riskScore (logit-shift toward realized failure rate over scored recs, shrinkage w=n/(n+10), gated n>=3). Wired into cad_learning_recommend + cad_learning_record_recommendation (default true; `disable_calibrate` opt-out). getLoopEfficacy adds calibrationShift/calibrationApplied. Tests added to the engine test (7) + dispatcher round-trip test (3).

VERIFY (PASS/FAIL + P0/P1 file:line):
1. Do the engine tests use REAL reference values (toBeCloseTo with computed numbers), not toBeDefined/stub asserts? Do they FAIL if the math regresses (R9 intent, not behavior)?
2. Coverage: happy (over+under) + >=3 failure modes (insufficient-data, byte-identical-off, clamp-extreme) + adversarial (equilibrium, all-pass clamp)? Any gaps?
3. Does the test seeding actually populate the scored set as claimed? Verify the attributed outcomes (no partType) really do NOT change partTypeTotals[partType], so the raw slice risk is what the test asserts. If that assumption is wrong, the reference values are wrong -> P0.
4. Dispatcher wiring: both actions pass `calibrate`; default-true + disable_calibrate escape hatch correct; no action-count regression; round-trip test is read-only (no live-ledger mutation, matching the file's stated discipline).
5. Any inlined magic constant that should come from a shared/canonical source? Any `.skip`/`.only`? Any weakened assertion?
6. Is `disable_calibrate` a sensible param nam
... [+101 chars truncated]

### Assistant | 2026-06-25T13:07:17.470Z

I'll review this unit thoroughly. Let me start by reading the diff and the full files.

### Assistant | 2026-06-25T13:07:18.921Z

[tool_use: Bash]

### User | 2026-06-25T13:07:20.545Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-25T13:07:26.178Z

The diff is already cached. Let me read the full files end-to-end to understand the surrounding contracts, not just the diff hunks.

### Assistant | 2026-06-25T13:07:26.711Z

[tool_use: Read]

### User | 2026-06-25T13:07:27.242Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADTrialErrorLearningEngine.ts' was already read 3s ago in this session and is unchanged (mtime 1782392259776). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-25T13:07:42.559Z

The harness is telling me the file content is already in my context. However, I genuinely need to see the diff and file contents to perform this review. Let me get the diff via a modified command (different flags) and read the files fresh.

### Assistant | 2026-06-25T13:07:44.394Z

[tool_use: Bash]

### User | 2026-06-25T13:07:50.300Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts', CRLF will be replaced by LF the next time Git touches it
 .../__tests__/CADTrialErrorLearningEngine.test.ts  |  96 +++++++++++++++++++
 ...onDispatcher.
... [+239 chars truncated]

### Assistant | 2026-06-25T13:07:55.734Z

[tool_use: Bash]

### User | 2026-06-25T13:08:01.943Z

[tool_result] diff --git a/mcp-server/src/engines/CADTrialErrorLearningEngine.ts b/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
index 8395466c6d..78abbc4590 100644
--- a/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
+++ b/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
@@ -111,34 +111,50 @@ export interface TribalAdvice {
  * Pure provider returning CAD tribal lessons relevant to a recomm
... [+13264 chars truncated]

### Assistant | 2026-06-25T13:08:08.365Z

Now let me read the full engine file to understand the data model — particularly `recommendations`, `RecommendationRecord`, `predictedRisk`, `outcomeStatus`, `fulfilled`, and how `recommendAdjustments` computes `riskScore` from the slices (critical for verifying test reference values).

### Assistant | 2026-06-25T13:08:09.555Z

[tool_use: Bash]

### User | 2026-06-25T13:08:13.893Z

[tool_result]      1	/**
     2	 * CADTrialErrorLearningEngine — U-CADC29
     3	 *
     4	 * Learns from CAD generation regeneration-test failures (output of
     5	 * CADRegenerationTestEngine). Extracts recurring failure patterns by
     6	 * category (volume mismatch, bbox mismatch, topology, code error) and
     7	 * provides risk scoring + adjustment recommendations for new generation
     8	 * candidates
... [+4592 chars truncated]

### Assistant | 2026-06-25T13:08:17.618Z

Let me read the key sections of the engine — the `RecommendationRecord` data model and the `recommendAdjustments` risk computation, plus the aggregate/slice logic.

### Assistant | 2026-06-25T13:08:18.639Z

[tool_use: Bash]

### User | 2026-06-25T13:08:25.632Z

[tool_result]    120	
   121	export interface CalibrationInfo {
   122	  applied: boolean;         // true when a non-trivial shift was applied (enough scored data)
   123	  rawRiskScore: number;     // riskScore BEFORE recalibration (the raw aggregate estimate)
   124	  shift: number;            // logit-space shift added (negative = corpus over-predicts risk)
   125	  scoredSampleSize: number; // recommendati
... [+7108 chars truncated]

### Assistant | 2026-06-25T13:08:29.468Z

Now let me read the `recommendAdjustments` risk computation and how slices feed `riskScore`, plus `attributeOutcome`/`ingest` to confirm how `predictedRisk`, `outcomeStatus`, and `fulfilled` get set.

### Assistant | 2026-06-25T13:08:30.703Z

[tool_use: Bash]

### User | 2026-06-25T13:08:36.250Z

[tool_result]    450	  /**
   451	   * Closed-loop self-calibration signal (U-CAD-LEARN-CALIBRATE). The scored set =
   452	   * recommendations with a realized (linked) outcome. Once it reaches
   453	   * MIN_EFFICACY_SAMPLES, the corpus mean predicted risk is compared to the realized
   454	   * failure fraction and a logit-space shift is learned that moves future predictions
   455	   * toward reality, shri
... [+4787 chars truncated]

### Assistant | 2026-06-25T13:08:52.868Z

Now I understand the risk computation. Let me read how `partTypeTotals`, `generatorTotals`, `featureTotals`, `totalFailures`, `totalSuccesses` are built in `updateAggregates`, and how `attributeOutcome` sets `fulfilled`/`outcomeStatus`/`predictedRisk`. This is critical for verifying test point #3 (the seeding assumption).

### Assistant | 2026-06-25T13:08:54.355Z

[tool_use: Bash]

### User | 2026-06-25T13:08:59.749Z

[tool_result]    300	 * failures alone. Single source shared by updateAggregates + getFailureStats.
   301	 */
   302	const ALL_FAILURE_CATEGORIES: FailureCategory[] = [
   303	  "volume_mismatch",
   304	  "bbox_mismatch",
   305	  "feature_count_mismatch",
   306	  "topology_mismatch",
   307	  "code_error",
   308	  "unknown",
   309	];
   310	
   311	interface CategoryAggregate {
   312	  failures: number;

... [+5786 chars truncated]

### Assistant | 2026-06-25T13:09:03.258Z

Now let me read `updateAggregates`, `attributeOutcome`, and `linkOutcome` to confirm exactly how `partTypeTotals` is updated (point #3 hinges on whether an outcome with no `partType` skips `partTypeTotals`).

### Assistant | 2026-06-25T13:09:04.835Z

[tool_use: Bash]

### User | 2026-06-25T13:09:09.238Z

[tool_result] 179:  predictedRisk: number;     // riskScore at issue time (0..1 posterior failure prob)
183:  fulfilled: boolean;        // a linked outcome has been observed
184:  outcomeStatus?: "pass" | "fail" | "error"; // realized status of the linked outcome
186:  fulfilledAt?: string;
197:  calibrationError: number;     // |mean predictedRisk - realized failure fraction| over scored recs
198:  brierScore
... [+3006 chars truncated]

### Assistant | 2026-06-25T13:09:12.969Z

Now let me read the exact `updateAggregates` body (1000-1045) and `attributeOutcome`/`linkOutcome` (1057-1075) to confirm point #3.

### Assistant | 2026-06-25T13:09:13.853Z

[tool_use: Read]

### User | 2026-06-25T13:09:14.712Z

[tool_result] 977	  private updateAggregates(o: RegenerationOutcome, categories: FailureCategory[]): void {
978	    const isFail = o.status !== "pass";
979	    const seen = new Set<FailureCategory>(categories);
980	    if (!isFail) {
981	      // Successes count toward every observed-when-failed category in a flat
982	      // aggregation — but we want per-category baselines, so credit success
983	      // to A
... [+4368 chars truncated]

### Assistant | 2026-06-25T13:09:20.487Z

I now have the full engine picture. Key confirmation for point #3: `updateAggregates` only touches `partTypeTotals` when `o.partType` is truthy (line 1021), and `linkOutcome` sets `fulfilled`/`outcomeStatus` only when an outcome cites a `recommendationId` (line 1061-1069). So an attributed outcome with no `partType` populates the scored set (`predictedRisk`/`fulfilled`) without changing `partTypeTotals`. Let me verify the exact test seeding now.

### Assistant | 2026-06-25T13:09:21.662Z

[tool_use: Bash]

### User | 2026-06-25T13:09:26.840Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts b/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts
index ea49cc3186..8bc36ba756 100644
--- a/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts
+++ b/m
... [+6483 chars truncated]

### Assistant | 2026-06-25T13:09:31.510Z

Now I have the full test. Let me verify the reference values independently with actual computation, since the whole P0 hinges on these being correct. I'll compute the math directly.

### Assistant | 2026-06-25T13:09:37.532Z

[tool_use: Bash]

### User | 2026-06-25T13:09:42.974Z

[tool_result] T1 over (8/2,5,1): {"rawRisk":0.75,"meanPred":0.75,"realizedFailFrac":0.2,"w":0.3333333333333333,"shift":-0.8283022165959999,"corrected":0.5671690256229078,"n":5}
T2 under (2/8,5,4): {"rawRisk":0.25,"meanPred":0.25,"realizedFailFrac":0.8,"w":0.3333333333333333,"shift":0.8283022165960002,"corrected":0.43283097437709217,"n":5}
T3 equil (3/7,6,2): {"rawRisk":0.3333333333333333,"meanPred":0.3333333333
... [+466 chars truncated]

### Assistant | 2026-06-25T13:09:50.767Z

My independent computation confirms every reference value in the tests:
- T1 over: shift -0.82830, corrected 0.56717 ✓ (matches `0.56717` and `-0.82830`)
- T2 under: shift +0.82830, corrected 0.43283 ✓
- T3 equilibrium: shift 0, corrected = rawRisk 0.33333 ✓
- T4 below-floor: applied=false, shift=0, raw preserved ✓ (n=2 < 3)
- T6 all-pass: corrected 0.01894 (finite, >0, <0.5) ✓

Now the **critical point #3 verification**: the test claims attributed outcomes carry NO partType, so they do NOT change `partTypeTotals[partType]`, leaving the raw slice risk as `(fails+1)/(fails+passes+2)`. Let me verify the `meanPred` assumption: each rec is issued via `recordRecommendation({partType}, {calibrate:false})` — so `predictedRisk` at issue = the raw partType slice risk. But there's a subtlety: the recs are recorded BEFORE the outcomes are attributed, and the partType slice is built ONLY from the initial `fails`/`passes` ingests. Let me verify no ordering issue and that `attributeOutcome` with no partType truly skips `partTypeTotals`.

### Assistant | 2026-06-25T13:09:52.168Z

[tool_use: Read]

### User | 2026-06-25T13:09:53.177Z

[tool_result] 795	  }
796	
797	  /**
798	   * Convenience: stamp an outcome with a recommendationId and ingest it, closing
799	   * the loop in one call. Equivalent to ingest({ ...outcome, recommendationId }).
800	   */
801	  attributeOutcome(recommendationId: string, rawOutcome: unknown): IngestResult {
802	    const base = (rawOutcome && typeof rawOutcome === "object" ? rawOutcome : {}) as Record<string, unkn
... [+2077 chars truncated]

### Assistant | 2026-06-25T13:10:03.251Z

Confirmed: `attributeOutcome` calls `ingest({...base, recommendationId})`. In the test, `base` is `{testId, originalPath, status}` with NO `partType`. So `updateAggregates` line 1021 (`if (o.partType)`) is skipped — `partTypeTotals[partType]` is genuinely untouched by the attributed outcomes. The raw slice risk stays `(fails+1)/(fails+passes+2)`. **Point #3 verified correct.**

One subtle wrinkle: the attributed outcomes DO get ingested into `outcomes`, `totalIngested`, `totalFailures/Successes`, and the per-category `aggregates`. But the riskScore for a candidate `{partType}` is computed ONLY from `partTypeTotals.get(partType)` (line 508-517) — the slice. Since `slicesUsed.length > 0`, it never falls into the global fallback (line 541). So the per-category aggregate changes are irrelevant to `riskScore`. The reference values hold. 

Now let me check the `meanPred` assumption more carefully — `computeCalibrationShift` recomputes `meanPred` from `r.predictedRisk` over the scored set, NOT from the current slice. The recs were issued at `predictedRisk = rawRisk`. But wait — were they issued at exactly `rawRisk`? The recs are recorded AFTER all `fails`/`passes` ingests (seedCalibration order: ingests first, then recordRecommendation). So at issue time, `partTypeTotals[partType] = {failures: fails, successes: passes}`, giving `predictedRisk = (fails+1)/(fails+passes+2)` = rawRisk. Confirmed. Now let me verify the dispatcher wiring diff.

### system

... [25 middle messages omitted -- see raw_file] ...

### User | 2026-06-25T13:11:59.704Z

[tool_result] 23:let _cadCorpusOrch: any, _cadEmbedIndex: any, _cadPipeline: any, _cadRegenTest: any, _geoCompare: any, _cadRegistry: any, _inventorGen: any, _naca: any, _loftedWing: any, _gear: any, _spring: any, _cadTrialLearn: any, _printToFusion: any, _printToMastercam: any, _printToInventor: any, _printToSolidWorks: any, _printToEsprit: any, _espritGen: any, _printToAllCads: any, _printToHyperCADSAnalysis:
... [+1720 chars truncated]

### Assistant | 2026-06-25T13:12:13.164Z

Confirmed. `cad_trial_recommend` (cadDispatcher.ts:2013, in the live action enum at line 233) resolves to the **same singleton** `cadTrialErrorLearningEngine` (line 64) that `cad_learning_recommend` uses. Both are live, exposed, public dispatcher actions over the same engine/ledger. The calibration wiring was added to ONLY one of the two recommend surfaces. This is a genuine R15 wiring-completeness gap.

Severity assessment: it's not a correctness/data-loss bug (P0) — the un-wired path simply returns the raw uncalibrated risk (the pre-existing behavior, no regression). But it IS an incomplete wiring of a new capability to a natural consumer in the same engine, which R15/§ENGINE-WIRING calls out explicitly. I'll grade it **P1** (should-fix before merge — either wire it or document why it's intentionally scoped).

Let me do a final check on the all-pass clamp test (T6) — there's a subtle edge worth examining: the comment says realized 0 with `recCount:4, realizedFails:0`. But also confirm the `seedCalibration` for T6 records 4 recs with partType "z" and a 5/5 split. The recs are issued at rawRisk 0.5. Then all 4 outcomes are "pass" (i<0 is never true). So scored set n=4 ≥ 3, realFails=0, realizedFailFrac=0. Good. Let me also confirm there's no NaN risk in `logit(0)` → clamps to EPS → finite. Verified in my node computation (corrected 0.01894, finite). 

Let me verify one last adversarial concern: does the `cad_learning_record_recommendation` recursion (persisting calibrated `predictedRisk`) get any test coverage at all, and is the convergence claim ("loop tightens each pass") actually safe? Let me quickly simulate the recursion to confirm it converges and doesn't diverge.

### Assistant | 2026-06-25T13:12:23.466Z

[tool_use: Bash]

### User | 2026-06-25T13:12:29.919Z

[tool_result] pass 1 meanPred 0.75000 shift -1.65660 corrected 0.36401
pass 2 meanPred 0.36401 shift -0.55220 corrected 0.63330
pass 3 meanPred 0.63330 shift -1.28847 corrected 0.45268
pass 4 meanPred 0.45268 shift -0.79762 corrected 0.57468
pass 5 meanPred 0.57468 shift -1.12485 corrected 0.49344
pass 6 meanPred 0.49344 shift -0.90670 corrected 0.54783
pass 7 meanPred 0.54783 shift -1.05214 corrected 0.51162
p
... [+55 chars truncated]

### Assistant | 2026-06-25T13:12:38.965Z

This is a significant finding. The production recursion does NOT converge to the realized rate — it **oscillates around ~0.53** and never approaches the true realized failure rate of 0.2. The dispatcher comment claims "the loop tightens each pass" and "predictions converge on reality," but my simulation shows the opposite: because each pass re-anchors on the **raw slice risk** (`sigmoid(logit(rawRisk) + shift)`) while `meanPred` is computed from the **previous pass's calibrated predictions**, the feedback creates a damped oscillation that settles at a fixed point well above the realized rate, not at the realized rate.

Let me confirm this is actually how production behaves: in `cad_learning_record_recommendation`, the persisted `predictedRisk` IS the calibrated `riskScore` (engine line 785). So on the next `recordRecommendation` call, `computeCalibrationShift` reads those calibrated values as `meanPred`. The recalibration formula always starts from the raw `riskScore` of the current call (engine line 575: `riskScore = sigmoid(logit(riskScore) + cal.shift)` where `riskScore` is the freshly-computed raw slice value), then adds a shift derived from the *calibrated* `meanPred`. This mismatch (shift computed from calibrated history, applied to raw current) is what breaks convergence.

Let me verify the exact lines one more time to be certain of the claim.

### Assistant | 2026-06-25T13:12:40.449Z

[tool_use: Read]

### User | 2026-06-25T13:12:41.465Z

[tool_result] 564	    const suggestions = this.buildSuggestions(patterns, candidate);
565	    const tribalTips = this.collectTribalTips(
566	      topRiskCategories.map((c) => c.category),
567	      candidate,
568	      opts?.tribalProvider
569	    );
570	
571	    // Closed-loop self-calibration (U-CAD-LEARN-CALIBRATE): shift the raw aggregate
572	    // riskScore toward the realized failure rate measured over 
... [+508 chars truncated]

### Assistant | 2026-06-25T13:13:21.893Z

Confirmed. Line 578: `riskScore = sigmoid(logit(riskScore) + cal.shift)` where `riskScore` (line 576 `rawRiskScore`) is the freshly-recomputed raw slice aggregate, and `cal.shift` (line 575) is computed by `computeCalibrationShift` from the persisted `predictedRisk` history.

Now I must carefully weigh the severity. The recursion-divergence I demonstrated only manifests in the **production multi-pass loop** where `cad_learning_record_recommendation` is called repeatedly with `calibrate:true` (the dispatcher default) AND the persisted calibrated predictions feed back into `meanPred`. Let me think about whether this is truly a defect or whether the design is defensible:

- **Within a single recommend pass** (the engine test's scope): the math is correct and the reference values are verified. The calibration shifts the raw risk toward realized rate by one shrinkage-weighted logit step. This is fine and correct.
- **Across passes in production**: `meanPred` is supposed to represent "what the corpus currently predicts." But because predictions are persisted *post-calibration*, `meanPred` drifts, and the one-step correction from raw never reaches the realized rate. The dispatcher's claim "the loop tightens each pass → predictions converge on reality" is **not accurate** — it oscillates around a biased fixed point.

However, I should be careful: the oscillation is bounded and damped by shrinkage, it never diverges to ±∞ or NaN, and the persisted Brier in `getLoopEfficacy` would still reflect reality. So it's not a crash/data-loss (P0). It's a **correctness-of-claim / convergence defect** that contradicts the unit's stated thesis and the dispatcher comment. The cleaner design would compute `meanPred` from raw (uncalibrated) predictions, or persist the raw predictedRisk separately. This is a real P1 — the documented behavior ("converges on reality") is false, and it's untested in production form.

I have enough to render a verdict. Let me compile findings.

## Review Complet
... [+5389 chars truncated]

### User | 2026-06-25T13:20:24.718Z

The coordinator sent a message while you were working:
I applied fixes for both your P1s + the P2. Please re-verify the UPDATED diff and return PASS/FAIL:
`git -C H:/prism diff -- mcp-server/src/engines/CADTrialErrorLearningEngine.ts mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts mcp-server/src/tools/dispatchers/cadDispatcher.ts mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts mcp-server/src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts`

Fixes:
1. [P1 wiring] cadDispatcher.ts cad_trial_recommend now passes `calibrate` (default-on, disable_calibrate opt-out) — same singleton as cad_learning_recommend. R15 second consumer wired.
2. [P1 convergence] Added `rawPredictedRisk?` to RecommendationRecord. recordRecommendation now persists `rawPredictedRisk = recommendation.calibration?.rawRiskScore ?? recommendation.riskScore` (the RAW pre-calibration risk). computeCalibrationShift now sums `r.rawPredictedRisk ?? r.predictedRisk` instead of the calibrated predictedRisk — so the shift basis is anchored to the raw aggregate, NOT its own calibrated output. This removes the self-referential bias: meanPred stays anchored to the slice, so corrected risk converges on the realized rate as scored data grows (w->1), not a biased fixed point. Updated the engine doc + dispatcher comment to state this honestly.
3. [P2 clamp] Added the all-FAIL (realized=1) clamp test mirroring the all-PASS one.
4. Added a production-path multi-pass test: wave-2 recs recorded with calibrate:true (predictedRisk calibrated ~0.567, rawPredictedRisk 0.75); asserts the shift is the RAW-anchored -1.24245 / corrected 0.46411 (a predictedRisk-anchored revert would give ~-1.0216 and FAIL this test). 78/78 tests pass, 0 tsc errors in changed files (2 pre-existing RL-CAM unrelated).

Confirm whether P1-1, P1-2, P2 are resolved and the convergence claim is now accurate + tested.

Address this before completing your current task.

IMPORTANT: This is NOT from your user a
... [+152 chars truncated]

### Assistant | 2026-06-25T13:20:29.339Z

Let me re-verify the updated diff. The convergence-math claim (P1-2) is load-bearing, so I'll re-read the changed sections and independently re-simulate.

### Assistant | 2026-06-25T13:20:30.204Z

[tool_use: Bash]

### User | 2026-06-25T13:20:33.912Z

[tool_result] diff --git a/mcp-server/src/engines/CADTrialErrorLearningEngine.ts b/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
index 8395466c6d..89b2aea37d 100644
--- a/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
+++ b/mcp-server/src/engines/CADTrialErrorLearningEngine.ts
@@ -111,34 +111,51 @@ export interface TribalAdvice {
  * Pure provider returning CAD tribal lessons relevant to a recomm
... [+16011 chars truncated]

### Assistant | 2026-06-25T13:20:43.925Z

The engine changes look right. Let me re-read the updated tests and dispatchers, then independently re-simulate the convergence to verify the corrected math claim.

### Assistant | 2026-06-25T13:20:44.941Z

[tool_use: Bash]

### User | 2026-06-25T13:20:52.423Z

[tool_result] warning: in the working copy of 'mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts b/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts
index 2cfcac3b44..5403ba7329 100644
--- a/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts
+++ b/mcp-s
... [+3008 chars truncated]

### Assistant | 2026-06-25T13:20:58.989Z

Both P1 wirings are in place. P1-1: `cad_trial_recommend` now passes `calibrate` with the same default-on/opt-out semantics. P1-2: `computeCalibrationShift` now sums `r.rawPredictedRisk ?? r.predictedRisk`, and `recordRecommendation` persists `rawPredictedRisk = recommendation.calibration?.rawRiskScore ?? recommendation.riskScore`.

Now the critical verification: does anchoring `meanPred` on the raw prediction actually make the loop converge on the realized rate? Let me re-run my multi-pass simulation with the corrected basis.

### Assistant | 2026-06-25T13:21:04.349Z

[tool_use: Bash]

### User | 2026-06-25T13:21:08.486Z

[tool_result] n=   3 w 0.2308 shift -0.57344 corrected 0.62836
n=   5 w 0.3333 shift -0.82830 corrected 0.56717
n=  10 w 0.5000 shift -1.24245 corrected 0.46410
n=  20 w 0.6667 shift -1.65660 corrected 0.36401
n=  50 w 0.8333 shift -2.07076 corrected 0.27445
n= 100 w 0.9091 shift -2.25901 corrected 0.23860
n= 500 w 0.9804 shift -2.43618 corrected 0.20791
n=2000 w 0.9950 shift -2.47254 corrected 0.20199

### Assistant | 2026-06-25T13:21:16.489Z

The corrected math now genuinely converges. With `meanPred` anchored to the raw aggregate (0.75) and the true realized rate at 0.2, the corrected risk monotonically approaches 0.2 as scored data grows: 0.628 → 0.567 → 0.464 → 0.364 → 0.274 → 0.239 → 0.208 → 0.20199 (n=2000). As `w → 1`, `corrected → realized`. The P1-2 convergence claim is now mathematically accurate — the self-referential bias is eliminated because the shift basis no longer drifts with its own output.

Note my earlier oscillation simulation modeled the buggy drift (meanPred from calibrated predictions). The fix removes that drift entirely. Now let me verify the production-path test reference value the coordinator cited: at n=10 scored, raw-anchored shift = -1.24245, corrected = 0.46410. The coordinator claims the wave-2 test asserts `-1.24245 / 0.46411`. That matches my n=10 computation exactly. Let me read the actual updated test to confirm it's wired as claimed (not just asserted in the message).

### Assistant | 2026-06-25T13:21:17.999Z

[tool_use: Bash]

### User | 2026-06-25T13:21:27.622Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts b/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts
index ea49cc3186..f45cdd79c3 100644
--- a/mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts
+++ b/m
... [+8893 chars truncated]

### Assistant | 2026-06-25T13:21:32.764Z

The new production-path test (P1-2) is real and well-designed. It's the key R9 test: it records wave-1 recs with `calibrate:true`, attributes outcomes (scoring them), then records wave-2 recs ALSO with `calibrate:true` — so wave-2's `predictedRisk` is calibrated (~0.567) but `rawPredictedRisk` stays 0.75. It then asserts the shift is `-1.24245` (the raw-anchored value at n=10) and explicitly notes that a `predictedRisk`-anchored bug would yield ~-1.0216 and FAIL. This test genuinely fails if the fix is reverted. Let me verify both the correct value and the buggy value to confirm the test is a true discriminator.

### Assistant | 2026-06-25T13:21:41.188Z

[tool_use: Bash]

### User | 2026-06-25T13:21:45.758Z

[tool_result] wave-2 calibrated predictedRisk: 0.56717
CORRECT (raw-anchored) shift: -1.24245 risk: 0.46410
BUGGY (predictedRisk-anchored) mean: 0.65858 shift: -1.02164

### Assistant | 2026-06-25T13:21:51.648Z

Confirmed exactly. The test's stated discrimination is accurate:
- CORRECT (raw-anchored): shift -1.24245, risk 0.46410 — matches the test asserts (`-1.24245`, `0.46411`).
- BUGGY (predictedRisk-anchored): polluted mean 0.65858, shift -1.02164 — matches the test comment's "~-1.0216 → this fails."

The test is a true R9 discriminator: `toBeCloseTo(-1.24245, 3)` fails against the buggy -1.0216. This proves the fix is wired and the convergence is real, not asserted.

Now let me verify the two clamp tests (all-pass and all-fail) and confirm the all-fail upper-clamp branch works as claimed (risk > 0.5, < 1, finite).

### Assistant | 2026-06-25T13:21:56.986Z

[tool_use: Bash]

### User | 2026-06-25T13:22:02.232Z

[tool_result] all-fail: raw 0.5 shift 3.94729 risk 0.98106 finite true >0.5 true <1 true
all-pass: shift -3.94729 risk 0.01894 finite true >0 true <0.5 true

### Assistant | 2026-06-25T13:22:08.610Z

Both clamp tests verified. The all-fail (P2 new test): risk 0.98106 — finite, > 0.5, < 1 (upper clamp branch of `clampProb` exercised). The all-pass mirror: risk 0.01894 — finite, > 0, < 0.5. Both asserts hold.

Now let me verify the updated dispatcher round-trip test and confirm no `.skip`/`.only` slipped into either test file, plus confirm `rawPredictedRisk` is correctly handled on ledger replay (the new field needs to survive `loadFromDisk` round-trip, or convergence breaks across restarts).

### Assistant | 2026-06-25T13:22:12.774Z

[tool_use: Bash]

### User | 2026-06-25T13:22:20.141Z

[tool_result] === round-trip test diff ===
diff --git a/mcp-server/src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts b/mcp-server/src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts
index ebd021822a..3497823e5f 100644
--- a/mcp-server/src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts
+++ b/mcp-server/src/__tests__/cadAutomationDispatcher.cad-lea
... [+2795 chars truncated]

### Assistant | 2026-06-25T13:22:27.271Z

No `.skip`/`.only`. The round-trip test is read-only and additive. Now I need to verify a potential durability gap: does `rawPredictedRisk` survive the ledger replay in `loadFromDisk`? If the replay reconstructs `RecommendationRecord` and drops `rawPredictedRisk`, then after a process restart, `computeCalibrationShift` would fall back to the calibrated `predictedRisk` and the convergence bias would re-appear across restarts. Let me read the replay path.

### Assistant | 2026-06-25T13:22:28.236Z

[tool_use: Read]

### User | 2026-06-25T13:22:29.847Z

[tool_result] 1095	   * Replay the recommendation JSONL ledger. Records are stored at issue time
1096	   * (fulfilled:false); fulfillment is re-derived from the outcome ledger by the
1097	   * outcome replay in loadFromDisk, so always reload them unfulfilled. Restores
1098	   * recCounter past the highest auto-assigned id so new ids never collide.
1099	   */
1100	  private loadRecommendationsFromDisk(): void {

... [+1456 chars truncated]

### Assistant | 2026-06-25T13:22:38.576Z

I found a **durability concern** that needs verification. The `loadRecommendationsFromDisk` replay (line 1108) does `JSON.parse(line) as RecommendationRecord` and spreads `...r` (line 1111), so `rawPredictedRisk` IS preserved for records written AFTER this fix. But records persisted BEFORE this fix have no `rawPredictedRisk` field — those fall back to `predictedRisk` via the `??` (line 480). For a pre-fix record where `predictedRisk` was a calibrated value, the fallback re-introduces the bias. This is the documented "legacy records" fallback and is acceptable (the comment at line 181-182 and 476 explicitly states this), since it only affects records written before the fix shipped, and new records converge correctly.

The spread `...r` at line 1111 confirms `rawPredictedRisk` survives ledger replay for new records — so convergence holds across process restarts. Good.

Let me run the actual test suite to confirm the coordinator's "78/78 pass" claim rather than taking it on faith (R12 — verify build outcomes).

### Assistant | 2026-06-25T13:22:40.028Z

[tool_use: Bash]

### User | 2026-06-25T13:22:51.438Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/CADTrialErrorLearningEngine.test.ts (70 tests) 55ms
stderr | src/__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts > cadAutomationDispatcher cad_learning tribal-injection -- wire > routes to recommendAdjustments and surfaces the curated CAD tribal lessons as tribalTips
[INFO] [prism_cad_automation] Action: cad_learning_recommend
... [+1976 chars truncated]

### Assistant | 2026-06-25T13:22:54.976Z

All 78 tests pass (70 engine + 8 dispatcher). The "78/78" claim is verified, not taken on faith. Let me do a final tsc check on the changed files to confirm the "0 tsc errors in changed files" claim, then confirm the second consumer `cad_trial_recommend` is in its action enum (no regression).

### Assistant | 2026-06-25T13:22:56.682Z

[tool_use: Bash]

### User | 2026-06-25T13:23:22.792Z

[tool_result] NO TSC ERRORS in the 5 changed files

### Assistant | 2026-06-25T13:23:44.428Z

No tsc errors in any of the five changed files. All claims verified independently.

## Re-verification Complete

I re-read all five changed files, independently re-simulated the convergence math (both correct and buggy bases), confirmed the production-path test is a true R9 discriminator, ran the test suite, and type-checked.

---

VERDICT: PASS

summary: All three prior findings are resolved with verified, not merely asserted, fixes. P1-1: `cad_trial_recommend` (cadDispatcher.ts:2016) now passes `calibrate` over the same singleton with the same default-on/`disable_calibrate` opt-out as `cad_learning_recommend` — the second consumer is wired (R15). P1-2: the self-referential convergence bias is genuinely eliminated — `computeCalibrationShift` now anchors `meanPred` on the raw pre-calibration prediction (`r.rawPredictedRisk ?? r.predictedRisk`, engine:480) while `recordRecommendation` persists `rawPredictedRisk = recommendation.calibration?.rawRiskScore ?? recommendation.riskScore` (engine:796), so the loop converges on the realized rate as scored data grows instead of oscillating at a biased fixed point. P2: the all-FAIL upper-clamp test now mirrors the all-PASS one.

findings: none

Auditable verification performed:
- Convergence (P1-2) re-simulated independently: raw-anchored `meanPred` (0.75), realized 0.2 -> corrected risk monotonically 0.628 (n=3) -> 0.567 (n=5) -> 0.464 (n=10) -> 0.274 (n=50) -> 0.208 (n=500) -> 0.202 (n=2000); as w->1, corrected -> realized. The old drift (oscillating ~0.53) is gone.
- The new production-path test (engine test:~932) is a true R9 discriminator: I computed the correct raw-anchored shift -1.24245 (risk 0.46410) vs the buggy predictedRisk-anchored shift -1.02164 (polluted mean 0.65858). The test asserts `toBeCloseTo(-1.24245, 3)` and `toBeCloseTo(0.46411, 3)` plus `toBeLessThan(0.56717)` — all FAIL against the buggy -1.0216, so a revert of the fix breaks the test. It records wave-1 AND wave-2 recs with `calibrate:true`, exercisin
... [+1270 chars truncated]
