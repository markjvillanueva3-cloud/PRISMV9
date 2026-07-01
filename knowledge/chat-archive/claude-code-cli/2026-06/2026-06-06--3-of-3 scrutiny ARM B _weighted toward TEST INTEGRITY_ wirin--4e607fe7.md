---
type: "chat-session"
source: "claude-code-cli"
session_id: "4e607fe7-e3af-475c-8535-1d10b459c62c"
title: "3-of-3 scrutiny ARM B (weighted toward TEST INTEGRITY, wiring completeness, inli"
date: "2026-06-06"
first_ts: "2026-06-06T04:54:31.807Z"
last_ts: "2026-06-06T05:00:58.016Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 26
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a43277649cc2eb6f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# 3-of-3 scrutiny ARM B (weighted toward TEST INTEGRITY, wiring completeness, inli

> **claude-code-cli** | 2026-06-06 | 71 msgs (26 user / 45 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a43277649cc2eb6f9.jsonl`

## Transcript

### User | 2026-06-06T04:54:31.807Z

3-of-3 scrutiny ARM B (weighted toward TEST INTEGRITY, wiring completeness, inlined-constant detection — do NOT assume arm A caught everything) for PRISM commit b0b5b08716. Run `git -C H:/prism show b0b5b08716` and read the changed files + their test files in full.

Focus:
1. TEST INTEGRITY — do scripts/lib/nn-graph-eval.test.mjs (new selective tests) and scripts/nn-graph-calibration-analysis.test.mjs assert REAL reference values (hand-computed Brier/macro-F1, Murphy identity, production-gate τ=0.7 operating point), NOT toBeDefined stubs? Would a constant-returning stub fail them? Do they round-trip the wired assessHoldout→runAssessment path? Run them: `cd H:/prism && node --test scripts/lib/nn-graph-eval.test.mjs scripts/nn-graph-calibration-analysis.test.mjs` and confirm green.
2. WIRING COMPLETENESS — riskCoverageCurve/selectiveDeployPoint/gradeSelectiveDeploy reuse the harness's own computeBrier/computeMacroF1 (no duplicate metric impl)? selective wired into assessHoldout AND runAssessment AND renderReport? NN-EVAL.json additive field doesn't break readers (classifyGnn, psn-leg-state, retrain-lifecycle)?
3. INLINED CONSTANTS / magic numbers — is the production threshold single-sourced from GNN_DEFAULTS.minConf (not re-inlined 0.7)? Are gate thresholds (0.78/0.55/0.15) from GATE_THRESHOLDS, not re-hardcoded?
4. Any silent-failure, NaN crash, or edge-case gap.

Grade PASS/FAIL with P0/P1/P2. Be concise.

### Assistant | 2026-06-06T04:54:41.387Z

I'll run the scrutiny review for commit b0b5b08716. Let me start by examining the commit and its changed files.

### Assistant | 2026-06-06T04:54:42.261Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:54:43.129Z

[tool_use: Bash]

### User | 2026-06-06T04:54:49.304Z

[tool_result] commit b0b5b087162b67b3ebe9d4d55751dfb41a5b32ad
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 5 23:50:17 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-SELECTIVE-DEPLOY (slot:india): GNN tier-5 deploys honestly as a SELECTIVE predictor — calibration proven a measured DEAD END
    
    FINDING 1: post-hoc confidence calibration is a DEAD END for the Brier gate (Murphy
... [+1722 chars truncated]

### User | 2026-06-06T04:54:49.803Z

[tool_result] b0b5b087162b67b3ebe9d4d55751dfb41a5b32ad
markjvillanueva3-cloud
Fri Jun 5 23:50:17 2026 -0500
[MAIN] [BLACKWELL-AI-MS0]/U-GNN-SELECTIVE-DEPLOY (slot:india): GNN tier-5 deploys honestly as a SELECTIVE predictor — calibration proven a measured DEAD END

FINDING 1: post-hoc confidence calibration is a DEAD END for the Brier gate (Murphy reliability 0.0197 of 0.179; best honest Platt LOO-CV 0.178 > 0.
... [+996 chars truncated]

### Assistant | 2026-06-06T04:54:51.681Z

Let me read the changed files in full. The key files are the eval library and the two test files.

### Assistant | 2026-06-06T04:54:52.697Z

[tool_use: Read]

### Assistant | 2026-06-06T04:54:52.762Z

[tool_use: Read]

### User | 2026-06-06T04:54:55.112Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.mjs' was already read 10s ago in this session and is unchanged (mtime 1780720489203). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T04:54:56.296Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.test.mjs — node:test suite for the GNN tier-5 assessment
4	 * harness (NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS, U7).
5	 *
6	 * The pure metric functions are pinned to hand-computed reference values
7	 * (AUROC via Mann-Whitney, macro-F1, Brier) — a stub returning a constant
8	 * would fail. The end-to-end paths use a REAL GraphSAGE model from createModel
9	
... [+37003 chars truncated]

### Assistant | 2026-06-06T04:55:04.739Z

The test file content is in context. The eval library was already read 10s ago — but I don't have it in my visible context since that was a different session marker. Let me read it now (the guard says it's already read, but I need to see it). Let me use Grep to pull the new functions and the calibration files.

### Assistant | 2026-06-06T04:55:05.643Z

[tool_use: Read]

### Assistant | 2026-06-06T04:55:05.746Z

[tool_use: Read]

### User | 2026-06-06T04:55:08.231Z

[tool_result] read-once-guard: 'H:\prism\scripts\nn-graph-calibration-analysis.mjs' was already read 7s ago in this session and is unchanged (mtime 1780720691153). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T04:55:09.379Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-calibration-analysis.test.mjs — node:test suite for the calibration
4	 * study. The calibrators (temperature scaling, Platt, isotonic), the LOO-CV
5	 * driver, and the Murphy decomposition are pinned to hand-verifiable reference
6	 * values / invariants — a stub returning a constant would fail. The end-to-end
7	 * `analyzeCalibration` is run on a determini
... [+7272 chars truncated]

### Assistant | 2026-06-06T04:55:12.796Z

Both source files were read in a prior turn (the read-once guard) but their content isn't in my visible context. I need to see the actual implementations. Let me grep for the key functions in both source files.

### Assistant | 2026-06-06T04:55:14.305Z

[tool_use: Bash]

### User | 2026-06-06T04:55:27.316Z

[tool_result] #!/usr/bin/env node
/**
 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
 *
 * The assessment harness for the GNN tier-5 wiring classifier. It measures
 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
 * to deploy, against the milestone's mandatory exit gates:
 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
 *
 * Method — leave-out holdout 
... [+2645 chars truncated]

### Assistant | 2026-06-06T04:55:29.579Z

Let me see the new selective-prediction functions and the diff-added regions of nn-graph-eval.mjs.

### Assistant | 2026-06-06T04:55:31.275Z

[tool_use: Bash]

### User | 2026-06-06T04:55:44.055Z

[tool_result] 26: * Pure metric functions — computeAUROC, computeMacroF1, computeBrier,
40:import { loadGnnCheckpoint, classifyUnknownGhosts, isValidDispatcher, GNN_DEFAULTS } from "../seed-ghost-gnn-classify.mjs";
103:export function computeMacroF1(predicted, truth) {
133:export function computeBrier(probs, outcomes) {
178:      brier: count > 0 ? round4(computeBrier(bk.probs, bk.outcomes)) : null,
208:/** Ope
... [+3943 chars truncated]

### Assistant | 2026-06-06T04:55:46.553Z

Now let me read the full selective-prediction block (lines 200-345) and the wiring/render sections.

### Assistant | 2026-06-06T04:55:47.248Z

[tool_use: Read]

### User | 2026-06-06T04:55:50.962Z

[tool_result] 200	  }
201	  return {
202	    pass: failures.length === 0,
203	    verdict: failures.length === 0 ? "deploy-ready" : "shipped-research-only",
204	    failures,
205	  };
206	}
207	
208	/** Operating thresholds for the selective-deploy sweep (deploy confidence gates). */
209	export const SELECTIVE_THRESHOLDS = Object.freeze([0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]);
210	
211	/**
212	 * Sel
... [+8773 chars truncated]

### Assistant | 2026-06-06T04:55:53.721Z

Now let me read the wiring into assessHoldout/runAssessment (lines 510-690) and the render section (lines 760-800).

### Assistant | 2026-06-06T04:55:54.538Z

[tool_use: Read]

### User | 2026-06-06T04:55:58.744Z

[tool_result] 510	 */
511	export function assessHoldout(graph, predictor, opts = {}) {
512	  const { holdout, poolSize, stratified, heldClasses } = buildHoldout(graph, opts);
513	  if (holdout.length === 0) {
514	    return { n: 0, skipped: true, poolSize,
515	      reason: poolSize < 2 ? "insufficient-reference-pool" : "empty-holdout",
516	      metrics: {}, buckets: [], samples: [] };
517	  }
518	  const targ
... [+8758 chars truncated]

### Assistant | 2026-06-06T04:56:02.711Z

Now the render section for the selective verdict (760-800).

### Assistant | 2026-06-06T04:56:03.702Z

[tool_use: Read]

### User | 2026-06-06T04:56:06.764Z

[tool_result] 755	      (d.dominantClass ? ` collapsed to the reference-pool class prior (every prediction → \`${d.dominantClass}\`, share ${d.dominantShare})` : " emits one confidence for every input") +
756	      ". Threshold tuning cannot help — the embeddings/vote must actually separate classes first.");
757	  }
758	  L.push("");
759	  L.push("## Per-bucket calibration", "", "| Confidence | Count | Mean pro
... [+4450 chars truncated]

### Assistant | 2026-06-06T04:56:09.634Z

Now let me see the calibration analysis source — the key functions (murphy, looCV, fitPlatt, fitIsotonic, fitTemperature, analyzeCalibration) and check for inlined constants.

### Assistant | 2026-06-06T04:56:11.201Z

[tool_use: Bash]

### User | 2026-06-06T04:56:19.996Z

[tool_result] 4: * calibration can clear the GNN tier-5 deploy Brier gate (<= 0.15), the HONEST way.
6: * Context: the deploy gate fails on Brier (0.179 > 0.15). The first calibration
30:import fs from "node:fs";
31:import path from "node:path";
32:import { pathToFileURL } from "node:url";
33:import {
34:  computeBrier,
35:  riskCoverageCurve,
36:  selectiveDeployPoint,
63:export function fitTemperature(cs, ys)
... [+1353 chars truncated]

### Assistant | 2026-06-06T04:56:23.212Z

There's a finding emerging: `analyzeCalibration` (calibration analysis) re-inlines `0.15` and `0.55` as default gates rather than importing `GATE_THRESHOLDS`. Let me read the calibration analysis source in full to confirm and understand `murphy`, `looCV`, and the `MURPHY_BINS` constant.

### Assistant | 2026-06-06T04:56:23.790Z

[tool_use: Read]

### User | 2026-06-06T04:56:27.188Z

[tool_result] 30	import fs from "node:fs";
31	import path from "node:path";
32	import { pathToFileURL } from "node:url";
33	import {
34	  computeBrier,
35	  riskCoverageCurve,
36	  selectiveDeployPoint,
37	} from "./lib/nn-graph-eval.mjs";
38	
39	const EVAL_PATH = process.env.NN_EVAL_PATH
40	  || path.join(process.cwd(), "state/shared/nn-graph/NN-EVAL.json");
41	
42	// ---- numeric helpers ---------------------
... [+11386 chars truncated]

### Assistant | 2026-06-06T04:56:30.359Z

Now I have full visibility into both source files and their tests. Let me run the two test suites to confirm they pass, and check the NN-EVAL.json additive field doesn't break the downstream readers (classifyGnn, psn-leg-state, retrain-lifecycle).

### Assistant | 2026-06-06T04:56:31.673Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:56:33.912Z

[tool_use: Bash]

### User | 2026-06-06T04:56:37.565Z

[tool_result]   ...
# Subtest: murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
ok 83 - murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
  ---
  duration_ms: 0.6337
  ...
# Subtest: murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
ok 84 - murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
  ---
  duration_m
... [+510 chars truncated]

### User | 2026-06-06T04:56:57.453Z

[tool_result] ---readers of NN-EVAL.json---
scripts/agents/spawned-agent-context-lib.mjs
scripts/ai-training-awareness.mjs
scripts/ai-training-galaxy-audit.mjs
scripts/generate-psn-health-features.mjs
scripts/hm-extraction-coverage.mjs
scripts/lib/graphsage-train-pipeline.test.mjs
scripts/nn-eval-refresh.mjs
scripts/nn-graph-calibration-analysis.mjs
.claude/hooks/nn-graph-health-inject.mjs
.claude/hooks/nn-grap
... [+154 chars truncated]

### Assistant | 2026-06-06T04:57:00.860Z

Both suites pass: 86 tests green (the calibration suite reports as part of the combined run). Wait — the combined total shows 86, but the eval suite alone is supposed to be ~80+. Let me verify each suite's count separately and confirm the NN-EVAL.json schema readers tolerate the additive `selective` field. The key reader is `classifyGnn` and the two hooks.

### Assistant | 2026-06-06T04:57:02.757Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:57:04.324Z

[tool_use: Bash]

### User | 2026-06-06T04:57:09.763Z

[tool_result] === eval suite ===
# tests 74
# pass 74
# fail 0
=== calibration suite ===
# tests 12
# pass 12
# fail 0

### User | 2026-06-06T04:58:11.109Z

[tool_result] Exit code 255
106: * nn-graph-eval's runAssessment emits TWO shapes; classifyGnn is the single
120:export function classifyGnn(evalReport) {
129:  // `classifyGnn(graded).poolSize` and reports a false "pool 0".
195:  const g = classifyGnn(evalReport);
=== where classifyGnn is DEFINED ===

### Assistant | 2026-06-06T04:58:16.409Z

`classifyGnn` is defined in `.claude/hooks/nn-graph-health-inject.mjs`. The grep with multiple files returned 255 because one path didn't exist, but the result shows it's at line 120 of that hook. Let me confirm `classifyGnn` reads only the fields it needs and the additive `selective` field at top level of NN-EVAL.json won't break it. Let me read classifyGnn and check the NN-EVAL.json structure of the additive field.

### Assistant | 2026-06-06T04:58:16.502Z

[tool_use: Read]

### User | 2026-06-06T04:58:21.897Z

[tool_result] 100	 * Returns { dormant, healthy, auroc, brier, poolSize, graded, verdict, reason }.
101	 *
102	 * dormant  — `deferred:true` OR no usable checkpoint → tier-5 is not voting.
103	 * healthy  — NOT dormant AND auroc past gate AND brier within gate.
104	 * graded   — a real deploy-gate holdout was scored (the `metrics` path).
105	 *
106	 * nn-graph-eval's runAssessment emits TWO shapes; classifyGnn 
... [+5582 chars truncated]

### Assistant | 2026-06-06T04:58:26.710Z

`classifyGnn` reads only specific named fields (`metrics`, `checkpointMeta`, `deferred`, `poolSize`, `grade.verdict`, `degeneracy`, `reason`) — it ignores the new top-level `selective` field entirely. The additive field is inert to this reader, confirming the commit's claim. Let me verify the actual NN-EVAL.json structure to confirm `selective` is purely additive (top-level, not replacing anything), and that the two hook test suites still pass.

### Assistant | 2026-06-06T04:58:29.124Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:58:30.563Z

[tool_use: Bash]

### User | 2026-06-06T04:58:36.714Z

[tool_result] top-level keys: deferred, assessedAt, holdoutN, embeddingMode, checkpointPresent, holdoutSplit, heldClasses, gates, metrics, degeneracy, buckets, grade, selective, samples
deferred: false
has selective: true
selective keys: curve, deployPoint, deployGrade
deployGrade.verdict: deploy-ready-selective
grade.verdict: shipped-research-only
metrics: {"auroc":0.8084,"macroF1":0.4389,"brier":0.179,"accura
... [+11 chars truncated]

### User | 2026-06-06T04:58:44.089Z

[tool_result] # tests 102
# pass 102
# fail 0

### Assistant | 2026-06-06T04:58:50.920Z

Excellent confirmation. The live NN-EVAL.json shows the honesty discipline is correctly preserved: `grade.verdict: shipped-research-only` (full-holdout fails the gate — Brier 0.179 > 0.15, macroF1 0.4389 < 0.55) is retained ALONGSIDE the additive `selective.deployGrade.verdict: deploy-ready-selective`. The full-holdout grade is never overwritten. Downstream hook readers (102 tests) pass.

Now let me verify the three specific claims in the review focus: (1) `selectiveDeployPoint` anchors on `GNN_DEFAULTS.minConf`, not a re-inlined 0.7, and confirm what `GNN_DEFAULTS.minConf` actually is; (2) confirm `riskCoverageCurve` reuses `computeBrier`/`computeMacroF1` (no duplicate metric impl) — already confirmed in `selectiveRow`. Let me check the one INLINED-CONSTANT concern I spotted in the calibration analysis.

### Assistant | 2026-06-06T04:58:52.157Z

[tool_use: Bash]

### User | 2026-06-06T04:59:05.838Z

[tool_result] 63:export const GNN_DEFAULTS = Object.freeze({
64:  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
135: * env, env wins over GNN_DEFAULTS. Garbage env values fall back to the
139:  const d = GNN_DEFAULTS;
143:    minConf: finiteOr(pick(overrides.minConf, env.PRISM_NNG_MIN_CONF), d.minConf, { min: 0, max: 1 }),
153:    // OPT-IN (default OFF — it regressed the live 
... [+423 chars truncated]

### Assistant | 2026-06-06T04:59:16.803Z

Confirmed: `GNN_DEFAULTS.minConf = 0.7` is the canonical single source, imported by `nn-graph-eval.mjs` (line 40), and `selectiveDeployPoint` defaults `productionMinConf` to `GNN_DEFAULTS.minConf` (line 289) — NOT a re-inlined literal `0.7`. The tests assert `dp.productionMinConf === 0.7` which is correct because the canonical value happens to be 0.7 — the production code reads it dynamically, so if `GNN_DEFAULTS.minConf` ever changes the production logic follows.

Now let me verify the inlined-constant concern I flagged in the calibration analysis and the gate-threshold sourcing in the eval lib. Let me check `gradeMetrics` / `GATE_THRESHOLDS` usage and the calibration's `0.55`/`0.15` defaults.

### Assistant | 2026-06-06T04:59:17.350Z

[tool_use: Read]

### User | 2026-06-06T04:59:21.328Z

[tool_result] 185	 * — verdict is "deploy-ready" when every gate clears, else "shipped-research-only"
186	 * (the milestone's honest deferred-deploy outcome). A missing/non-finite metric
187	 * is a failure, never a silent pass.
188	 */
189	export function gradeMetrics(metrics, gates = GATE_THRESHOLDS) {
190	  const m = metrics || {};
191	  const failures = [];
192	  if (!Number.isFinite(m.auroc) || m.auroc < g
... [+639 chars truncated]

### Assistant | 2026-06-06T04:59:28.404Z

`gradeMetrics` correctly reads from `GATE_THRESHOLDS` (default param), and the eval-lib selective functions all default `gates = GATE_THRESHOLDS`. No re-hardcoded 0.78/0.55/0.15 in the production paths of nn-graph-eval.mjs.

Now let me examine the one inlined-constant issue more carefully in the calibration analysis. `analyzeCalibration` uses `gates.macroF1 ?? 0.55` and `Number.isFinite(gates.brier) ? gates.brier : 0.15` as fallbacks, and `buildVerdict` has a hardcoded `(≥0.55)` in the FINDING 2 string. Let me confirm whether the calibration script imports GATE_THRESHOLDS at all and check the test that asserts the 0.15 default.

### Assistant | 2026-06-06T04:59:28.728Z

[tool_use: Bash]

### User | 2026-06-06T04:59:44.940Z

[tool_result] 4: * calibration can clear the GNN tier-5 deploy Brier gate (<= 0.15), the HONEST way.
6: * Context: the deploy gate fails on Brier (0.179 > 0.15). The first calibration
187:  const GATE = Number.isFinite(gates.brier) ? gates.brier : 0.15;
223:  const rc = riskCoverageCurve(samples, { brier: GATE, macroF1: gates.macroF1 ?? 0.55 });
224:  const deployPoint = selectiveDeployPoint(samples, { brier: G
... [+473 chars truncated]

### Assistant | 2026-06-06T04:59:52.066Z

Confirmed the finding. The calibration analysis script (`scripts/nn-graph-calibration-analysis.mjs`) does NOT import `GATE_THRESHOLDS` from the eval lib — it re-inlines `0.15` (brier) and `0.55` (macroF1) as defaults at lines 187, 223, 224, and a hardcoded `(≥0.55)` literal in the FINDING 2 verbatim string at line 262. The eval lib it imports from already exports `GATE_THRESHOLDS = {auroc:0.78, macroF1:0.55, brier:0.15}` and it's already importing other symbols from that same module. This is a real but P2-severity inlined-constant drift: a one-line analysis script, the values match the canonical gate today, and the `analyzeCalibration(samples, gates)` signature lets a caller pass the real gates. But the defaults should source from the imported `GATE_THRESHOLDS` to prevent silent drift if the milestone gate changes.

Let me do a final check on edge-case/NaN safety in the new selective functions — specifically `selectiveRow` when `computeMacroF1` returns null, and the `round4` behavior on null, plus confirm `riskCoverageCurve` empty-sample test passed.

### Assistant | 2026-06-06T04:59:58.146Z

[tool_use: Bash]

### User | 2026-06-06T05:00:15.341Z

[tool_result] 62:function round4(x) {
=== verify selectiveRow null-macroF1 path is safe ===
single-sample row: {"tau":0.5,"coverage":1,"emitted":1,"brier":0.01,"macroF1":1,"accuracy":1,"classesEmitted":1,"brierClears":true,"macroF1Clears":true}
all-NaN-conf -> rows: []
no-emit-at-0.7 deployPoint.found: false | productionPoint: null

### Assistant | 2026-06-06T05:00:20.050Z

Edge cases are all clean: all-NaN confidence → `[]` (no crash), no-emit-at-production-gate → `found:false`, `productionPoint:null` (correctly handled by `gradeSelectiveDeploy`'s `op ? ... : null` guard). Let me check `round4` handles null/NaN and verify one last potential edge: `selectiveRow`'s `macroF1Clears` when `computeMacroF1` could return null (kept set is always non-empty equal-length here, so it can't, but let me confirm `round4(null)` doesn't produce a misleading value).

### Assistant | 2026-06-06T05:00:22.058Z

[tool_use: Read]

### User | 2026-06-06T05:00:28.717Z

[tool_result] 62	function round4(x) {
63	  return Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null;
64	}
65	
66	/**
67	 * Area under the ROC curve via the rank-sum (Mann-Whitney U) identity, with

### Assistant | 2026-06-06T05:00:58.016Z

`round4(x)` returns `null` for non-finite — so `brier`/`macroF1` degrade to `null`, and the `brierClears`/`macroF1Clears` flags use `Number.isFinite(brier) && ...` guards (lines 254-255), which correctly evaluate to `false` on null rather than silent-passing. The NaN/null handling is fail-closed throughout.

I have full coverage of all four focus areas. Here is my verdict.

---

## ARM B SCRUTINY VERDICT — commit b0b5b08716

**GRADE: PASS** (1 P2, no P0/P1)

Both suites green: `nn-graph-eval.test.mjs` **74/74**, `nn-graph-calibration-analysis.test.mjs` **12/12** (86 combined). Downstream reader hooks (`nn-graph-health-inject`, `psn-leg-state-inject`) **102/102**.

### 1. TEST INTEGRITY — PASS
Tests assert REAL hand-computed reference values, not stubs:
- **Brier**: `[0.5]→0.25`, `[0.9,0.9]/[1,1]→0.01`, τ=0.6 emitted-set Brier `(0.01+0.09)/2=0.05` hand-derived (eval test:627-629). A constant-returning stub fails every one.
- **Macro-F1**: `[a,a,b]/[a,b,b]→2/3` with per-class support asserted; spurious/missed-class → F1=0.
- **Murphy identity**: `reliability − resolution + uncertainty == directBrier` asserted to `1e-9` against an independently-recomputed Brier (cal test:107-116) — this is the load-bearing assertion behind FINDING 1, and it is a genuine algebraic invariant, not a value pin.
- **Production operating point τ=0.7**: `selectiveDeployPoint` test pins `productionPoint.tau===0.7`, `emitted===2`, `brier===0.05`, plus the override path (τ=0.5→Brier 0.1008) and the all-wrong→`found:false` failure path (eval test:645-676). Round-trips the wired `assessHoldout→runAssessment` path with a REAL seeded GraphSAGE model (eval test:712-725), asserting both `scored.selective` and `res.selective.deployGrade` AND that `res.grade` (full-holdout) is retained alongside.
- LOO-CV no-leak test proves out-of-fold ≠ in-sample (cal test:95-103) — verifies intent, not behavior.

### 2. WIRING COMPLETENESS — PASS
- `selectiveRow` (the shared core of `riskCoverageCurve`/`selectiveDepl
... [+3090 chars truncated]
