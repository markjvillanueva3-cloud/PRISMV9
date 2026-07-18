---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c07f75f-24a7-47d8-a038-b4f2e5216e1d"
title: "Review PRISM commit `50dc4068dd` on branch cad-fusion-live-ms0 (repo H:/prism). "
date: "2026-06-22"
first_ts: "2026-06-22T13:04:16.347Z"
last_ts: "2026-06-22T13:07:37.064Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 19
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a36435420156b1358.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Review PRISM commit `50dc4068dd` on branch cad-fusion-live-ms0 (repo H:/prism). 

> **claude-code-cli** | 2026-06-22 | 55 msgs (19 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a36435420156b1358.jsonl`

## Transcript

### User | 2026-06-22T13:04:16.347Z

Review PRISM commit `50dc4068dd` on branch cad-fusion-live-ms0 (repo H:/prism). This is arm A (holistic) of a 3-of-3 scrutiny gate.

Run `git -C H:/prism show 50dc4068dd` to see the full diff. The commit is `[AI-SYSTEMS-GNN]/U-GNN-GHOST-HOLDOUT-HEADTOHEAD (slot:india)`: it adds a measurement/decision script `scripts/measure-ghost-holdout-headtohead.mjs` (+ its `.test.mjs`), a result JSON `state/shared/nn-graph/ghost-h2h-2026-06-22.json`, a wiki update `knowledge/wiki/architecture/gnn-edges-lever.md`, and a memory file. It is the FINAL step of the GNN edges-lever arc: it runs 3 classifiers (direct-embed / neighbor-vote / confidence-hybrid@tau=0.70) on the live unwired-ghost holdout, multi-seed [1337,7,42], and decides whether to wire the edge-hybrid into the deployed GNN tier-5. The verdict shipped was KEEP direct-embed (hybrid AUROC mean ~0.768 < 0.78 gate, non-robust across seeds).

This is NOT a physics engine and introduces no new dispatcher-wired engine (it's a standalone measurement tool, sibling of scripts/measure-edge-class-homophily.mjs etc.) — so dispatcher-wiring + physics-constants criteria are N/A. The test uses node:test `assert` (the .mjs script convention), not vitest.

Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Focus on: (1) correctness of the decision logic (does decideHeadToHead correctly require multi-seed robustness?), (2) leak discipline (does the neighbor arm avoid leaking the held-out ghost's own label?), (3) honesty of the reported numbers vs the committed memory/wiki claims, (4) any silent failure mode. Note: `readGraphStreaming` at line ~304 is synchronous (the runner produced correct output, so it's not a floating-promise bug). Return a one-line VERDICT: PASS or FAIL.

### Assistant | 2026-06-22T13:04:24.168Z

I'll review commit `50dc4068dd` thoroughly. Let me start by examining the full diff.

### Assistant | 2026-06-22T13:04:24.327Z

[tool_use: Bash]

### User | 2026-06-22T13:04:27.804Z

[tool_result] commit 50dc4068ddd72edc5d31a0d3e4bfe08e853908d0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 07:34:24 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-HOLDOUT-HEADTOHEAD (slot:india): the FINAL edges-lever deploy decision on the LIVE ghost holdout -> KEEP direct-embed (multi-seed caught a false-positive single-seed WIRE)
    
    Ran the in-flight FINAL a
... [+1807 chars truncated]

### Assistant | 2026-06-22T13:04:30.273Z

Let me read the main script file end to end.

### Assistant | 2026-06-22T13:04:30.690Z

[tool_use: Read]

### User | 2026-06-22T13:04:31.526Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-ghost-holdout-headtohead.mjs -- the DEPLOY DECISION for the GNN tier-5 edges
4	 * lever (slot:india 2026-06-21). The FINAL step of the edges-lever arc
5	 * ([[gnn-edges-lever]]): run the three classifiers on the LIVE deployed UNWIRED-ghost
6	 * holdout and decide -- with real AUROC / macro-F1 / Brier at the production gate --
7	 * whether the homophilous-ed
... [+20831 chars truncated]

### Assistant | 2026-06-22T13:04:35.443Z

Now let me look at the key dependencies to verify the decision logic and leak discipline. Let me read the relevant parts of the supporting libraries.

### Assistant | 2026-06-22T13:04:35.987Z

[tool_use: Read]

### User | 2026-06-22T13:04:36.959Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ghost-neighbor-index.mjs -- GHOST-AWARE neighbor index for the GNN tier-5 ghost-holdout
4	 * head-to-head (slot:india 2026-06-21). The first (graph-free) piece of
5	 * U-GNN-GHOST-HOLDOUT-HEADTOHEAD.
6	 *
7	 * WHY: the shipped `buildNeighborIndex` (measure-neighbor-vote-loo.mjs) only links engines
8	 * where BOTH endpoints are in `stemToClass` (classifiable/wired) 
... [+7199 chars truncated]

### Assistant | 2026-06-22T13:04:40.604Z

Now let me examine the `gradeSelectiveDeploy` function to verify what `robustAboveGate` means and whether `decideHeadToHead`'s robustness gate works as claimed.

### Assistant | 2026-06-22T13:04:41.104Z

[tool_use: Read]

### User | 2026-06-22T13:04:42.994Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+53180 chars truncated]

### Assistant | 2026-06-22T13:04:52.167Z

Now I have a thorough understanding of the harness. Critical observation: `decideHeadToHead` uses `grade(a.hybrid).robustAboveGate` which sets per-seed wire decisions, and `runSeed` calls `decideHeadToHead` per seed. The aggregate then requires `live.every(r => r.decision.wireEdges)`. Let me verify the dependencies for leak discipline (neighborVote, confidenceHybridVote, buildStemToClass).

### Assistant | 2026-06-22T13:04:52.604Z

[tool_use: Read]

### User | 2026-06-22T13:04:53.545Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-neighbor-vote-loo.mjs -- NON-DESTRUCTIVE leave-one-out (LOO) neighbor-vote
4	 * dispatcher classification over the codebase-wired engines (slot:india 2026-06-21).
5	 *
6	 * WHY: U-GNN-EDGE-CLASS-HOMOPHILY-MEASURE (commit 1580c44d98,
7	 * [[reference_gnn_edge_class_homophily_2026_06_21]]) PROVED the leak-free engine<->engine
8	 * edge subgraph is strongly ho
... [+16393 chars truncated]

### Assistant | 2026-06-22T13:04:56.276Z

Now let me check `confidenceHybridVote` and `buildStemToClass`/`extractStem` for leak discipline, plus the test file.

### Assistant | 2026-06-22T13:04:56.706Z

[tool_use: Read]

### User | 2026-06-22T13:04:58.394Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-confidence-hybrid.mjs -- NON-DESTRUCTIVE confidence-aware hybrid sweep for the
4	 * GNN tier-5 dispatcher classifier (slot:india 2026-06-21). Sharpens the edges lever.
5	 *
6	 * WHY: U-GNN-CLASSIFY-HEADTOHEAD (cd3f64fe26, [[reference_gnn_classify_headtohead_2026_06_21]])
7	 * showed the NAIVE neighbor-first hybrid (use neighbor-vote wherever an engine has e
... [+13913 chars truncated]

### Assistant | 2026-06-22T13:05:04.194Z

Now let me verify the leak-discipline claim carefully. The crucial concern: in `runSeed`, the holdout comes from `runAssessment` (direct-embed). The held-out ghosts are `ghost.unwired-engine` nodes. The neighbor index is built over `ghostStems` (the holdout) with `stemToClass` (wired engines). 

Let me verify `extractStem` and `buildStemToClass` to confirm the held-out ghost can never appear in `stemToClass`.

### Assistant | 2026-06-22T13:05:05.148Z

[tool_use: Read]

### User | 2026-06-22T13:05:06.054Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-edge-class-homophily.mjs -- NON-DESTRUCTIVE per-edge-type dispatcher-class
4	 * homophily measurement for the GNN tier-5 "edges / message-passing" lever
5	 * (slot:india 2026-06-21).
6	 *
7	 * WHY: the deployed tier-5 classifier is DIRECT-EMBED (pure cosine k-NN over the
8	 * node embeddings -- see measure-codebase-wired-refpool-auroc.mjs:296-303), NOT the

... [+7062 chars truncated]

### Assistant | 2026-06-22T13:05:14.622Z

Now I understand the leak discipline. `stemToClass` is built from `buildEngineDispatcherMap(DISPATCHERS_DIR)` — engines that are actually wired to a single dispatcher (real codebase fact). The held-out ghosts are `ghost.unwired-engine` nodes whose `proposed_wiring` is a heuristic label, not a dispatcher wiring. So a held-out ghost's `proposed_wiring` truth label can never be in `stemToClass`'s VALUES being used... but the concern is whether the ghost's STEM is in `stemToClass`. The `isGhost` guard in `buildGhostNeighborIndex` (line 68): `ghosts.has(s) && !wired.has(s)` — wired precedence excludes a ghost whose stem is also wired. 

But there's a subtle leak vector worth checking: even if a ghost stem is excluded as a TARGET, could it still be a VOTER (neighbor) for another held-out ghost, leaking its heuristic label? Let me check — in `buildGhostNeighborIndex`, only WIRED engines become voters (`isWired(b)`, `slot.wired`). A held-out ghost is `isGhost`, not `isWired`, so it never enters another ghost's neighbor set. Good. The voters are strictly wired engines whose labels come from real dispatcher source. No leak.

Now let me read the test file end to end to verify test integrity.

### Assistant | 2026-06-22T13:05:14.927Z

[tool_use: Read]

### User | 2026-06-22T13:05:15.754Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for measure-ghost-holdout-headtohead.mjs (slot:india 2026-06-21).
4	 *
5	 * Real reference-value coverage (R9): hand-computed sample sets + metrics (AUROC via the
6	 * rank-sum identity, macro-F1 over union(predicted,truth), Brier as MSE), happy + >=3
7	 * failure + >=2 adversarial per exported pure function. Graph-free (main() owns the 542MB
8	 * graph; the 
... [+13571 chars truncated]

### Assistant | 2026-06-22T13:05:21.206Z

The tests are real reference-value tests (R9): hand-computed AUROC=1.0, macroF1=0.3889 (1.1667/3), Brier=0.1025, with happy + failure + adversarial cases per export. The adversarial robustness test (line 249) directly verifies that "more classes but NOT robust" does NOT wire — confirming the multi-seed robustness gate logic. Good test integrity.

Now let me verify the committed result JSON against the claims in the commit message and memory/wiki. Let me read the result JSON and the memory/wiki diffs.

### Assistant | 2026-06-22T13:05:21.645Z

[tool_use: Read]

### User | 2026-06-22T13:05:24.379Z

[tool_result] 1	{
2	  "generatedAt": "2026-06-22T12:27:05.183Z",
3	  "tau": 0.7,
4	  "productionGate": 0.7,
5	  "gates": {
6	    "auroc": 0.78,
7	    "macroF1": 0.55,
8	    "brier": 0.15
9	  },
10	  "stemToClassSize": 3208,
11	  "seedResults": [
12	    {
13	      "seed": 1337,
14	      "holdoutN": 84,
15	      "neighborCoverage": {
16	        "covered": 12,
17	        "total": 84,
18	        "coverage": 0.1429,
... [+27260 chars truncated]

### Assistant | 2026-06-22T13:05:34.671Z

The result JSON corroborates the commit message precisely:
- seed 1337: hybrid AUROC 0.7073, decision `keep` (hybrid below gate)
- seed 7: hybrid AUROC 0.8342, decision `WIRE` (passes + beats direct + robust)
- seed 42: hybrid AUROC 0.7618, decision `keep` (AUROC < 0.78)
- aggregate: `wireEdges: false`, KEEP direct-embed

Mean of (0.7073, 0.8342, 0.7618) = 0.7678 ≈ 0.768, matching the "mean ~0.768" claim. The single-seed false-positive (seed 7 WIRE) is correctly rejected because aggregate requires `live.every(r => r.decision.wireEdges)`.

Now let me verify there isn't an inconsistency: the decision logic uses per-seed `decideHeadToHead`, which for seed 7 returns `wireEdges: true`. But notice — for seed 7, `decideHeadToHead`'s robustness gate uses `grade(a.hybrid).robustAboveGate` which is true for seed 7. So the per-seed logic correctly fires WIRE on seed 7. The MULTI-SEED guard (`wireEverySeed`) is what catches it. The commit's claim that "decideHeadToHead's robustness gate correctly rejects" is slightly imprecise — it's the *aggregate* multi-seed `every` that rejects seed 7, not `decideHeadToHead` itself (which APPROVED seed 7). Let me note this nuance. The commit message says "A single seed (7) would have falsely said WIRE -- decideHeadToHead's robustness gate correctly rejects." That conflates the per-seed robustness (which passed for seed 7) with the multi-seed `every`. This is a minor honesty imprecision in the commit message, not the code.

Now let me read the memory file and wiki diff to verify the numbers claimed there.

### Assistant | 2026-06-22T13:05:36.415Z

[tool_use: Bash]

### User | 2026-06-22T13:05:41.038Z

[tool_result] commit 50dc4068ddd72edc5d31a0d3e4bfe08e853908d0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 07:34:24 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-HOLDOUT-HEADTOHEAD (slot:india): the FINAL edges-lever deploy decision on the LIVE ghost holdout -> KEEP direct-embed (multi-seed caught a false-positive single-seed WIRE)
    
    Ran the in-flight FINAL a
... [+5484 chars truncated]

### Assistant | 2026-06-22T13:05:49.013Z

The wiki numbers match the JSON exactly: hybrid Brier 0.079 / macroF1 0.619 (= seed 42 hybrid productionPoint: Brier 0.0792, macroF1 0.619), 2/13 classes, AUROC table (0.7073/0.8342/0.7618), mean ≈ 0.768. Note: the wiki cites the seed42 hybrid emitted-set (Brier 0.079, macroF1 0.619) as "the hybrid's emitted set clears" — but seed42's hybrid `found:true` (its emitted set DOES clear Brier+macroF1); it fails on global AUROC only. That's an accurate representation.

One nuance worth verifying: the wiki/commit claim that the hybrid "clears Brier+macroF1 and spans 2/13 vs direct-embed's 1/13". But the *binding* reason for KEEP differs per seed: seed 1337 fails because hybrid `found:false` (macroF1 0.3953 < 0.55 at the gate), NOT just AUROC. The commit narrative emphasizes the AUROC straddle, which is the seed42 + seed7 story, but seed1337 hybrid actually failed the emitted-set macroF1 too. This is a slight oversimplification in the prose but the JSON is fully honest and the aggregate decision is correct regardless.

Let me verify the memory file content and check the test counts claim (25/25, 15/15).

### Assistant | 2026-06-22T13:05:49.843Z

[tool_use: Read]

### User | 2026-06-22T13:05:50.711Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-06-22T13:05:53.645Z

The memory file path in the commit stat was truncated. Let me find its actual path.

### Assistant | 2026-06-22T13:05:54.452Z

[tool_use: Bash]

### User | 2026-06-22T13:05:58.560Z

[tool_result] knowledge/memories/reference/reference_gnn_ghost_holdout_headtohead_2026_06_22.md
knowledge/wiki/architecture/gnn-edges-lever.md
scripts/measure-ghost-holdout-headtohead.mjs
scripts/measure-ghost-holdout-headtohead.test.mjs
state/shared/nn-graph/ghost-h2h-2026-06-22.json

### Assistant | 2026-06-22T13:06:01.676Z

[tool_use: Read]

### User | 2026-06-22T13:06:02.779Z

[tool_result] read-once-guard: 'H:\prism\knowledge\memories\reference\reference_gnn_ghost_holdout_headtohead_2026_06_22.md' was already read 33s ago in this session and is unchanged (mtime 1782133400180). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state
... [+39 chars truncated]

### Assistant | 2026-06-22T13:06:05.754Z

I haven't actually seen the content. Let me read it via the diff.

### Assistant | 2026-06-22T13:06:06.311Z

[tool_use: Bash]

### User | 2026-06-22T13:06:09.768Z

[tool_result] ---
name: reference_gnn_ghost_holdout_headtohead_2026_06_22
description: "GNN tier-5 edges-lever FINAL arc step — the deploy decision on the LIVE unwired-ghost holdout (slot:india, 2026-06-22, U-GNN-GHOST-HOLDOUT-HEADTOHEAD). Ran the 3 arms (direct-embed / neighbor-vote / confidence-hybrid @ tau=0.70) via measure-ghost-holdout-headtohead.mjs on the 745MB graph, --max-old-space-size=8192, multi-see
... [+3939 chars truncated]

### Assistant | 2026-06-22T13:06:17.134Z

The memory file numbers all corroborate the JSON: Brier 0.079, macroF1 0.619, accuracy 0.957, coverage 27% (seed42 hybrid productionPoint: brier 0.0792, macroF1 0.619, accuracy 0.9565, coverage 0.2738 → 27%), 2/13 classes, AUROC table matches, mean ≈ 0.768. The "62.5% edge-coverage" claim is a derived figure I cannot directly verify from this JSON (neighborCoverage in the seeds is 14.3%/8.3%/8.3% — that's coverage of the HOLDOUT, not the full ghost population), but the memory frames it as the wired-set/full-ghost edge-coverage from a prior arc unit, which is plausibly sourced elsewhere. This is a per-population claim, not a result from this run; it's labeled as context, so low risk.

Now, let me verify the two test-count claims and that the tests actually pass / that there are no `.skip`/`.only`. Let me check the test counts and run them.

### Assistant | 2026-06-22T13:06:19.298Z

[tool_use: Bash]

### User | 2026-06-22T13:06:24.973Z

[tool_result] 25
15
---skip/only check---
none

### Assistant | 2026-06-22T13:06:28.753Z

25 tests and 15 tests confirmed (matching the commit's "25/25" and "15/15"), no `.skip`/`.only`/`.todo`. Let me actually run both test files to confirm they pass.

### Assistant | 2026-06-22T13:06:30.013Z

[tool_use: Bash]

### User | 2026-06-22T13:06:34.281Z

[tool_result]   ...
# Subtest: decideHeadToHead: adversarial -- more classes but NOT robust -> do NOT wire
ok 24 - decideHeadToHead: adversarial -- more classes but NOT robust -> do NOT wire
  ---
  duration_ms: 0.0351
  ...
# Subtest: decideHeadToHead: adversarial -- both pass, identical posture -> KEEP (no strict improvement)
ok 25 - decideHeadToHead: adversarial -- both pass, identical posture -> KEEP (no st
... [+322 chars truncated]

### Assistant | 2026-06-22T13:06:49.837Z

Both test suites pass clean: 25/25 and 15/15, 0 skipped/todo. The test-count claims are honest.

Now let me check one potential silent failure mode the prompt flagged: the `decideHeadToHead`'s `op` accessor uses `arm.selective.deployGrade.operatingPoint`, and `moreCoverage`/`moreClasses` read `hOp.coverage`/`hOp.classesEmitted`. When direct-embed's `pass` is false (seed 42, where direct AUROC 0.7676 < 0.78), `dOp = op(a.direct)` returns the operatingPoint... let me check. In `gradeSelectiveDeploy`, `operatingPoint` is set whenever `op` (productionPoint) exists — regardless of `pass`. So for seed 42, direct `pass:false` but `operatingPoint` is non-null (coverage 0.2262, 1 class). But in `decideHeadToHead`, the comparison only happens if `hPass` is true. For seed 42, hybrid `pass:false` → returns "keep (hybrid below gate)" before any comparison. Correct.

Let me also verify a subtle edge: in `decideHeadToHead`, `op()` returns operatingPoint even when an arm failed the gate (since `gradeSelectiveDeploy` always populates it when productionPoint exists). The reasons string for seed42 says "direct-embed: fails selective gate (coverage 0.2262, 1/13 classes)" — it reports the operatingPoint even on a fail. That's transparent/honest, matches JSON line 653.

Now let me check the `neighbor` arm is never used in the decision — `decideHeadToHead` only compares `direct` vs `hybrid`. The neighbor arm is computed and reported but not part of the wire decision. That's by design (the hybrid is the deployable artifact; neighbor-only abstains on ~86-91% of ghosts). Reasonable.

Let me verify there's no silent-failure in `runSeed` when `arm1.deferred` — and confirm the aggregate `wireEverySeed` handles the all-deferred case. Line 315: `live.length > 0 && live.every(...)`. If all seeds deferred, `live.length===0` → `wireEverySeed=false`, recommendation "inconclusive". Good — no false WIRE on empty.

One more: the `--out` write path and the `productionGate` consistency. The report has `ta
... [+201 chars truncated]

### Assistant | 2026-06-22T13:06:50.576Z

[tool_use: Bash]

### User | 2026-06-22T13:06:55.254Z

[tool_result] 64:  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
143:    minConf: finiteOr(pick(overrides.minConf, env.PRISM_NNG_MIN_CONF), d.minConf, { min: 0, max: 1 }),
224:  const minConf = finiteOr(refMinConf, GNN_DEFAULTS.refMinConf, { min: 0, max: 1 });
247:    if (!Number.isFinite(n.confidence) || n.confidence < minConf) continue;
588:    // empirically ~0.9-correct SHO
... [+50 chars truncated]

### Assistant | 2026-06-22T13:07:06.418Z

Confirmed `GNN_DEFAULTS.minConf = 0.7`, matching the tau default and the production gate. The selective-deploy point anchors on the real production gate, not a tuned-favorable τ.

Now let me do a final check on a subtle correctness concern: `decideHeadToHead`'s robustness gate. It reads `grade(a.hybrid).robustAboveGate`. The `gradeSelectiveDeploy` returns `robustAboveGate: dp.robustAboveGate === true`. From `selectiveDeployPoint`, `robustAboveGate = found && aboveGate.length>0 && aboveGate.every(clears)`. So robustness is a within-seed property (every τ ≥ 0.7 in the grid clears). For seed 7, hybrid `robustAboveGate:true` AND `found:true` → per-seed WIRE. The multi-seed `every` is the cross-seed guard. Both guards exist and are correctly combined. 

The only minor imprecision: the commit message says "decideHeadToHead's robustness gate correctly rejects" the seed-7 false positive, but actually `decideHeadToHead` APPROVED seed 7 (per-seed `wireEdges:true`, JSON line 437); the cross-seed `wireEverySeed = live.every(...)` in `main()` is what rejects it. The memory file (line "decideHeadToHead's robustness requirement → KEEP") has the same slight conflation. This is a documentation-attribution nuance, not a code bug — the correct outcome (KEEP) is reached, and the mechanism (multi-seed `every`) is real and tested (test line 249 verifies the per-seed robustness flag; the JSON proves the aggregate every-seed gate). I'll note it as P2.

Let me verify there are no ASCII/smart-quote issues introduced in the code files (the JSON `note` field contains em-dashes and τ, but those come from the upstream `nn-graph-eval.mjs` library output, not newly authored code — and they're in a data/report file, not source).

### Assistant | 2026-06-22T13:07:08.234Z

[tool_use: Bash]

### User | 2026-06-22T13:07:12.605Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-22T13:07:37.064Z

No non-ASCII characters in the authored source/test files (clean ASCII). The em-dashes/τ in the JSON report and wiki markdown are non-code report/doc content, generated by the existing `nn-graph-eval.mjs` note text — consistent with surrounding repo convention (the wiki entry already used τ/≥ before this commit).

I have everything needed. Let me summarize my findings.

## Review Complete

I read all 5 changed files end to end, plus the 4 upstream dependencies (`nn-graph-eval.mjs`, `ghost-neighbor-index.mjs`, `measure-neighbor-vote-loo.mjs`, `measure-confidence-hybrid.mjs`, `measure-edge-class-homophily.mjs`), ran both test suites, and cross-checked the committed numbers against the JSON, wiki, and memory.

---

VERDICT: PASS

summary: The measurement/decision script is correct, leak-disciplined, and honestly reported. The multi-seed deploy gate works as designed — `decideHeadToHead` makes a per-seed call and `main()`'s `wireEverySeed = live.every(r => r.decision.wireEdges)` (`scripts/measure-ghost-holdout-headtohead.mjs:315`) is the cross-seed guard that correctly rejects the single-seed-7 false-positive WIRE, yielding the shipped KEEP-direct-embed verdict. Numbers in the JSON, wiki, and memory all reconcile (mean hybrid AUROC 0.7678 ≈ 0.768 < 0.78; Brier 0.079 / macroF1 0.619 / 2-of-13 classes all trace to seed-42 hybrid productionPoint). Both test suites pass clean (25/25 + 15/15, no `.skip`/`.only`/`.todo`), with real hand-computed reference values and an adversarial test (`scripts/measure-ghost-holdout-headtohead.test.mjs:249`) that directly verifies "more classes but NOT robust → do NOT wire."

findings:
- [P2] `scripts/measure-ghost-holdout-headtohead.mjs` commit message + `knowledge/memories/reference/reference_gnn_ghost_holdout_headtohead_2026_06_22.md` (table caption "`decideHeadToHead`'s robustness requirement → KEEP") — minor attribution conflation: `decideHeadToHead` actually APPROVES seed 7 per-seed (`ghost-h2h-2026-06-22.json:437` `wireEdges:true`); t
... [+2195 chars truncated]
