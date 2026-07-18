---
type: "chat-session"
source: "claude-code-cli"
session_id: "ccf537ea-2ef7-4e40-bc08-fee665c2a949"
title: "Analyst review (silent-breakage / regression / numerical-safety) of commit HEAD "
date: "2026-06-10"
first_ts: "2026-06-10T03:28:49.867Z"
last_ts: "2026-06-10T03:31:33.297Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/ccf537ea-2ef7-4e40-bc08-fee665c2a949/subagents/agent-a9b0cd5d86c3adbd1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Analyst review (silent-breakage / regression / numerical-safety) of commit HEAD 

> **claude-code-cli** | 2026-06-10 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ccf537ea-2ef7-4e40-bc08-fee665c2a949/subagents/agent-a9b0cd5d86c3adbd1.jsonl`

## Transcript

### User | 2026-06-10T03:28:49.867Z

Analyst review (silent-breakage / regression / numerical-safety) of commit HEAD in H:/prism (`git -C H:/prism show HEAD`). Subject: CAMStrategyRecommenderEngine.ts empirical re-rank + camFunctionDispatcher.ts wiring to selfLearningCAMEngine.strategyRanking() + 13 tests. Both strict-typed, tsc-clean, tests green.

Check, terse, P0/P1 only with file:line:
1. Numerical: empiricalScoreDelta with NaN winRate, NaN observations, or negative observations — does the clamp/guard hold (no NaN propagating into candidate scores -> no NaN-poisoned sort)?
2. The candidate score after re-rank is clamped to >=0 but NOT capped above — can a boosted score exceed the catalog max (1.05) and is that a problem for downstream consumers reading recommended_score?
3. Regression: cold callers (no empirical_ranking, or use_learned:false) — is behavior provably unchanged vs pre-commit? Any consumer of recommend() that would break on the new optional StrategyCandidate fields?
4. The dispatcher seeds NO state but reads the singleton selfLearningCAMEngine — any test-pollution or import-time side effect introduced?
5. Anything that makes the closed loop silently never fire in production (e.g. learner empty by default, name mismatch) that should be surfaced rather than silent?
GRADE PASS or FAIL.

### Assistant | 2026-06-10T03:28:52.887Z

I'll review HEAD against the five analyst axes. Let me read the actual diff first.

### Assistant | 2026-06-10T03:28:53.558Z

[tool_use: Bash]

### User | 2026-06-10T03:28:56.283Z

[tool_result] commit cee25cfa7595ed319656c5d9d648dc28aa9ea6db
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 22:28:19 2026 -0500

    [MAIN] [KILO-CAM-CLOSEDLOOP]/U-CAM-LEARN-CONSUME (slot:kilo): CAM recommendation consumes the persisted learned win-rates -- closes the loop on the generation side
    
    U2 of the closed-loop CAM plan. U1 made SelfLearningCAMEngine persist learne
... [+1552 chars truncated]

### Assistant | 2026-06-10T03:28:58.551Z

[tool_use: Bash]

### User | 2026-06-10T03:29:00.061Z

[tool_result] commit cee25cfa7595ed319656c5d9d648dc28aa9ea6db
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 22:28:19 2026 -0500

    [MAIN] [KILO-CAM-CLOSEDLOOP]/U-CAM-LEARN-CONSUME (slot:kilo): CAM recommendation consumes the persisted learned win-rates -- closes the loop on the generation side
    
    U2 of the closed-loop CAM plan. U1 made SelfLearningCAMEngine persist learne
... [+6272 chars truncated]

### Assistant | 2026-06-10T03:29:02.744Z

Now the dispatcher diff and the surrounding engine context (the scoring base, catalog max claim of 1.05, and how `score` is consumed).

### Assistant | 2026-06-10T03:29:03.719Z

[tool_use: Bash]

### User | 2026-06-10T03:29:06.768Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts b/mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts
index 3fc3007fde..02f7c74a5a 100644
--- a/mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts
@@ -90,12 +90,41 @@ export async function dispatchCamFunction(
     }
     case "cam_func_strategy_recomm
... [+2046 chars truncated]

### Assistant | 2026-06-10T03:29:10.090Z

Now let me verify the upstream `strategyRanking()` contract — specifically the shape of `winRate.rate`, `confidence`, and `observations`, since the dispatcher maps these and the NaN-safety hinges on what the learner can emit.

### Assistant | 2026-06-10T03:29:11.814Z

[tool_use: Bash]

### User | 2026-06-10T03:29:14.361Z

[tool_result] mcp-server/src/engines/SelfLearningCAMEngine.ts:10: *  3. strategyRanking     — Empirical strategy effectiveness with confidence intervals
mcp-server/src/engines/SelfLearningCAMEngine.ts:202:/** Input for strategyRanking */
mcp-server/src/engines/SelfLearningCAMEngine.ts:232:/** Result of strategyRanking */
mcp-server/src/engines/SelfLearningCAMEngine.ts:588: *  is never altered, so live strate
... [+4832 chars truncated]

### Assistant | 2026-06-10T03:29:17.424Z

Let me look at how `winRate.rate` is computed (the `wins / totalContests` at line 1277-1278) to assess whether `rate` can be NaN, and check the base catalog score range to address the 1.05 cap question.

### Assistant | 2026-06-10T03:29:18.538Z

[tool_use: Bash]

### User | 2026-06-10T03:29:19.948Z

[tool_result]     if (allComposites.length > 0) {
      // Determine per-record winner
      const winCounts = new Map<string, number>();
      const totalRounds = filtered.length;
      for (const strat of byStrategy.keys()) winCounts.set(strat, 0);

      // For each timestamp bucket, find best strategy
      const timestamps = [...new Set(filtered.map(r => r.timestamp))].sort();
      for (const ts of timest
... [+1507 chars truncated]

### Assistant | 2026-06-10T03:29:22.714Z

Now let me check the base catalog score computation in the recommender to address the "exceed 1.05" question, and find the cold-path baseline behaviour.

### Assistant | 2026-06-10T03:29:23.553Z

[tool_use: Bash]

### User | 2026-06-10T03:29:31.505Z

[tool_result]   constructor(
    private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine,
    private corpus: ReadonlyArray<CorpusEntry> = STRATEGY_CORPUS,
  ) {}

  recommend(req: StrategyRecRequest): StrategyRecResult {
    const target = req.target_cam ?? "";
    const partHint = req.part_hint ?? "";
    const material = req.material ?? "";
    const maxAlt = Math.max(1, req.max_alternatives ?? 5);


... [+1897 chars truncated]

### Assistant | 2026-06-10T03:29:34.561Z

Now I have enough to assess all five axes. Let me check the `recommended_score` consumers (axis 2 downstream impact) and confirm the test file's NaN coverage.

### Assistant | 2026-06-10T03:29:37.983Z

[tool_use: Bash]

### User | 2026-06-10T03:29:43.767Z

[tool_result] mcp-server/web/src/api/client.ts:512:  return request('POST', '/erp/kaizen-score', { suggestion_id: suggestionId, ...score });
mcp-server/web/src/components/CommandPalette.tsx:57:        .filter(r => r.score > 0)
mcp-server/web/src/components/CommandPalette.tsx:58:        .sort((a, b) => b.score - a.score)
mcp-server/web/src/components/calculator/MillOptimizer.tsx:7: * and returns so the test's
... [+2103 chars truncated]

### Assistant | 2026-06-10T03:29:45.939Z

The test path differs. Let me get the actual test file path and check its NaN coverage.

### Assistant | 2026-06-10T03:29:48.660Z

[tool_use: Bash]

### User | 2026-06-10T03:29:58.325Z

[tool_result] FILE: mcp-server/src/__tests__/camStrategyEmpiricalRerank.test.ts
===NaN/clamp coverage in tests===
15:  empiricalScoreDelta,
24:describe("empiricalScoreDelta (bounded, confidence-scaled learned re-rank)", () => {
26:    expect(empiricalScoreDelta({ strategy: "x", winRate: 1.0, confidence: "high", observations: 100 })).toBeCloseTo(MAX_DELTA, 9);
29:    expect(empiricalScoreDelta({ strategy: "x", w
... [+1512 chars truncated]

### Assistant | 2026-06-10T03:30:02.734Z

I have full visibility now. Let me trace the NaN path precisely on the three inputs the question names, and confirm whether the winRate-NaN case is actually guarded.

The `empiricalScoreDelta` guard is `if (!sig || !(sig.observations > 0)) return 0;`. Then `centered = clamp(winRate,0,1) - 0.5`. Let me verify the exact NaN-propagation behavior of `Math.min/Math.max` and the sort, plus whether the dispatcher can ever produce `winRate: NaN` from the upstream `wins/totalContests`.

### Assistant | 2026-06-10T03:30:08.867Z

[tool_use: Bash]

### User | 2026-06-10T03:30:14.135Z

[tool_result] winRate NaN, obs 100: NaN
obs NaN: 0
obs -5: 0
obs 0: 0
confidence garbage: 0.045
sort w/ one NaN: a:0.8,b:NaN,c:0.5

### Assistant | 2026-06-10T03:30:20.074Z

This confirms the critical finding. The `winRate: NaN` case is **not** guarded — it produces `delta = NaN`, which poisons `cand.score`. Let me verify whether upstream `strategyRanking()` can actually emit `winRate.rate = NaN` (the dispatcher feeds it raw with no sanitization), and confirm the sort consequence in the real candidate set.

The upstream computes `rate: wins / totalContests` where `totalContests = timestamps.length || 1` (so divisor ≥ 1, never NaN from that path). But `winRate.rate` is initialized to `0` at line 1248 and only overwritten inside `if (allComposites.length > 0)`. So the persisted/empty-corpus path yields `rate: 0`, not NaN. Let me confirm there's no other path and check what the engine does with a NaN score in its actual `scored.sort` + `winner` selection.

### Assistant | 2026-06-10T03:30:24.334Z

[tool_use: Bash]

### User | 2026-06-10T03:30:32.116Z

[tool_result] after sort order: good,mid,poison
positives: good,mid
winner if winner=scored[0]: good
winner if winner=positives[0]: good
=== how winner is picked ===
    }
    scored.sort((a, b) => b.score - a.score || a.strategy.localeCompare(b.strategy));
    const positives = scored.filter((c) => c.score > 0);

    if (positives.length === 0) {
      return {
        target_cam: target,
        part_hint: pa
... [+809 chars truncated]

### Assistant | 2026-06-10T03:30:36.373Z

This is an important mitigating detail. Let me now confirm the upstream contract truly cannot emit `winRate.rate = NaN` by reading the init and the only write path, and verify `Number(params.max_alternatives)` / dispatcher param coercion doesn't introduce a separate NaN. That settles axes 1, 2, 3, 4, 5.

### Assistant | 2026-06-10T03:30:38.760Z

[tool_use: Bash]

### User | 2026-06-10T03:30:42.397Z

[tool_result]         finishFactor: {
          mean: finStats.mean,
          ci95: [finStats.mean - z * finStd / sqrtN, finStats.mean + z * finStd / sqrtN],
        },
        lifeFactor: {
          mean: lifeStats.mean,
          ci95: [lifeStats.mean - z * lifeStd / sqrtN, lifeStats.mean + z * lifeStd / sqrtN],
        },
        winRate: { rate: 0, ci95: [0, 1] }, // computed below
        compositeScore:
... [+431 chars truncated]

### Assistant | 2026-06-10T03:31:33.297Z

I have everything needed. Final analysis below.

## Code Quality Analysis Report — `git -C H:/prism show HEAD` (cee25cfa75)

Scope: `CAMStrategyRecommenderEngine.ts` (+66), `camFunctionDispatcher.ts` (+29), `camStrategyEmpiricalRerank.test.ts` (+141).

### Axis 1 — Numerical (NaN propagation into score → poisoned sort)

**P1 — `winRate: NaN` is NOT guarded; produces `delta = NaN` and poisons the candidate score.**
`CAMStrategyRecommenderEngine.ts:296-298` (`empiricalScoreDelta`):
```
if (!sig || !(sig.observations > 0)) return 0;        // guards obs only
const centered = Math.max(0, Math.min(1, sig.winRate)) - 0.5;  // NaN survives clamp
return EMPIRICAL_RERANK_ALPHA * w * centered;          // -> NaN
```
The `!(observations > 0)` guard correctly neutralizes **NaN observations** (`NaN > 0` is false → return 0), **negative observations** (return 0), and **zero observations** (return 0) — reproduced and confirmed. But **`winRate: NaN` with `observations > 0` is unguarded**: `Math.min(1, NaN) → NaN`, `NaN - 0.5 → NaN`, `0.3*w*NaN → NaN`. The clamp does not sanitize NaN (it only bounds finite out-of-range, which the test at line 42-44 covers — `winRate:5`/`-3` → ±MAX_DELTA — but NaN is a different failure mode, untested). At `CAMStrategyRecommenderEngine.ts:368-372` this NaN flows into `cand.score = Math.max(0, cand.score + delta)` → `Math.max(0, NaN) → NaN`, poisoning the score.

**Severity downgraded from P0 to P1 by two mitigants** (both verified, not assumed):
1. **The producer cannot currently emit `winRate.rate = NaN`.** `SelfLearningCAMEngine.ts:1248` initializes `rate: 0`; the only overwrite (`1278`) is `wins / totalContests` with `totalContests = timestamps.length || 1` (divisor ≥ 1). So today's live dispatcher feed is NaN-free. This is the *only* in-tree caller, so the loop does not currently break in production.
2. **Even if a NaN score occurs, the winner selection is accidentally robust.** `:378` sorts then `:379` `positives = scored.filter(c => c.score > 0
... [+6923 chars truncated]
