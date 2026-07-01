---
type: "chat-session"
source: "claude-code-cli"
session_id: "4e607fe7-e3af-475c-8535-1d10b459c62c"
title: "3-of-3 scrutiny ARM C (weighted toward SILENT BREAKAGE, regression risk, I/O saf"
date: "2026-06-06"
first_ts: "2026-06-06T04:54:40.138Z"
last_ts: "2026-06-06T05:08:01.196Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 23
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-ae5cd67b0b57c3d38.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# 3-of-3 scrutiny ARM C (weighted toward SILENT BREAKAGE, regression risk, I/O saf

> **claude-code-cli** | 2026-06-06 | 65 msgs (23 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-ae5cd67b0b57c3d38.jsonl`

## Transcript

### User | 2026-06-06T04:54:40.138Z

3-of-3 scrutiny ARM C (weighted toward SILENT BREAKAGE, regression risk, I/O safety, error-budget completeness, integration coupling — do NOT assume arms A or B caught everything) for PRISM commit b0b5b08716. Run `git -C H:/prism show b0b5b08716` and read the changed files in full.

Focus:
1. REGRESSION — the change adds an additive `selective` field to NN-EVAL.json and to assessHoldout/runAssessment return shapes. Confirm the existing `grade`/`metrics` (full-holdout) path is byte-unchanged and still computes identically. Confirm fleet-wide readers of NN-EVAL.json (`.claude/hooks/nn-graph-health-inject.mjs` classifyGnn, `.claude/hooks/psn-leg-state-inject.mjs`, `scripts/nn-graph-retrain-lifecycle.mjs`, `scripts/ai-training-awareness.mjs`) consume named fields and are inert to the new key. Run `cd H:/prism && node --test scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs scripts/nn-eval-refresh.test.mjs` to confirm no regression.
2. SILENT BREAKAGE — selectiveDeployPoint signature changed from (samples,gates,thresholds) to (samples,gates,opts). Are all callers updated (calibration-analysis.mjs, the tests)? Does the GNN_DEFAULTS import resolve without a circular-import hazard (nn-graph-eval imports from seed-ghost-gnn-classify which... check)?
3. ERROR BUDGET — empty samples, non-finite confidence, n<2 holdout, all-wrong → do the new functions degrade gracefully (return {found:false}/[]/insufficient) rather than throw?
4. HONESTY — is the deploy verdict anchored on the real production gate (not cherry-picked τ)? Is the full-holdout failing grade still surfaced?

Grade PASS/FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-06T04:54:50.358Z

I'll run the scrutiny review for commit b0b5b08716. Let me start by examining the commit and its changed files.

### Assistant | 2026-06-06T04:54:51.238Z

[tool_use: Bash]

### User | 2026-06-06T04:54:57.356Z

[tool_result] commit b0b5b087162b67b3ebe9d4d55751dfb41a5b32ad
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 5 23:50:17 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-SELECTIVE-DEPLOY (slot:india): GNN tier-5 deploys honestly as a SELECTIVE predictor — calibration proven a measured DEAD END
    
    FINDING 1: post-hoc confidence calibration is a DEAD END for the Brier gate (Murphy
... [+1722 chars truncated]

### Assistant | 2026-06-06T04:55:00.022Z

Let me read the core changed file in full and examine the key functions.

### Assistant | 2026-06-06T04:55:00.045Z

[tool_use: Read]

### User | 2026-06-06T04:55:02.574Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.mjs' was already read 17s ago in this session and is unchanged (mtime 1780720489203). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-06T04:55:04.738Z

The file content seems to be expected in context but it was the diff that was shown. Let me read it properly with the cache disabled.

### Assistant | 2026-06-06T04:55:05.795Z

[tool_use: Bash]

### User | 2026-06-06T04:55:14.862Z

[tool_result]   876 scripts/lib/nn-graph-eval.mjs
  279 scripts/nn-graph-calibration-analysis.mjs
 1155 total

### Assistant | 2026-06-06T04:55:16.996Z

[tool_use: Read]

### User | 2026-06-06T04:55:21.162Z

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
... [+5451 chars truncated]

### Assistant | 2026-06-06T04:55:24.240Z

[tool_use: Read]

### User | 2026-06-06T04:55:31.396Z

[tool_result] 120	    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
121	    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
122	    perClass.set(cls, { precision, recall, f1, support: tp + fn });
123	    sumF1 += f1;
124	  }
125	  return { macroF1: classes.size > 0 ? sumF1 / classes.size : null, perClass };
126	}
127	
128	/**
129	 * Brier score — mean squared error of
... [+14309 chars truncated]

### Assistant | 2026-06-06T04:55:34.012Z

Now let me read the rest of the file, especially `assessHoldout`, `runAssessment`, and how the new functions are wired in.

### Assistant | 2026-06-06T04:55:34.717Z

[tool_use: Read]

### User | 2026-06-06T04:55:38.027Z

[tool_result] 380	 */
381	export function detectDegeneracy(scores, predicted) {
382	  const s = Array.isArray(scores) ? scores.filter((x) => Number.isFinite(x)) : [];
383	  const p = Array.isArray(predicted) ? predicted : [];
384	  const base = {
385	    isDegenerate: false, mode: "none",
386	    distinctConfidences: 0, distinctPredictions: 0,
387	    dominantClass: null, dominantShare: null, detail: "",
388	  
... [+12392 chars truncated]

### Assistant | 2026-06-06T04:55:40.392Z

Let me continue reading runAssessment, particularly the part that writes NN-EVAL.json and how `selective` is folded in.

### Assistant | 2026-06-06T04:55:41.078Z

[tool_use: Read]

### User | 2026-06-06T04:55:44.648Z

[tool_result] 629	    const ckptPath = opts.checkpoint || path.join(OUT_DIR, "graphsage-checkpoint.json");
630	    const loaded = loadGnnCheckpoint(ckptPath, { readFileImpl: opts.readFileImpl });
631	    if (!loaded.ok) {
632	      return { deferred: true, reason: loaded.reason, checkpointPresent: false,
633	        note: "The GNN tier-5 harness is built and tested; a trained checkpoint (U4 pipeline) is require
... [+14509 chars truncated]

### Assistant | 2026-06-06T04:55:47.879Z

Now I have the full picture of nn-graph-eval.mjs. Let me check the diff to confirm what changed (vs the original), and verify the GNN_DEFAULTS import chain for circular hazards. Let me look at the diff specifically.

### Assistant | 2026-06-06T04:55:49.033Z

[tool_use: Bash]

### User | 2026-06-06T04:55:55.494Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
commit b0b5b087162b67b3ebe9d4d55751dfb41a5b32ad
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 5 23:50:17 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-SELECTIVE-DEPLOY (slot:india): GNN tier-5 deploys honestly as a SELECTIVE predictor — calibration proven a measured DEAD END
    
    FINDING
... [+19753 chars truncated]

### Assistant | 2026-06-06T04:56:06.589Z

Important finding from the diff. The `buildHoldout` change is NOT purely additive — the diff at line 459 shows that the **default path changed from flat to stratified**. The original code was a flat split; now stratified is the default and flat is opt-in via `--flat-holdout`. This means the existing `grade`/`metrics` (full-holdout) path is NOT byte-unchanged — it now uses a different holdout. Let me note this and verify against the regression task's concern about "full-holdout path computes identically."

Wait — let me re-read. The concern in the task says "the existing grade/metrics (full-holdout) path is byte-unchanged and still computes identically." But the diff shows the holdout split default changed. Let me check whether this stratify change was part of THIS commit or a prior one by checking git blame context. Actually the diff clearly shows `-  const cap = Math.floor(pool.length / 2)` being replaced — so the stratify-default IS part of this commit. This is a meaningful behavioral change to the full-holdout metrics. Let me verify the circular import concern and run the tests.

### Assistant | 2026-06-06T04:56:07.882Z

[tool_use: Bash]

### User | 2026-06-06T04:56:16.844Z

[tool_result] 42:import fs from "node:fs";
43:import path from "node:path";
44:import { fileURLToPath, pathToFileURL } from "node:url";
46:import { loadPredictor, embedGraph, scoreLink } from "./lib/graphsage-predictor.mjs";
47:import { readGraphStreaming } from "./lib/graph-io.mjs";
48:import { mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";
63:export const GNN_DEFAULTS = Object.freeze({
64:  mi
... [+1366 chars truncated]

### Assistant | 2026-06-06T04:56:21.508Z

`seed-ghost-gnn-classify.mjs` imports from `graphsage-predictor.mjs`, `graph-io.mjs`, `viz-dispatcher-node-id.mjs` — it does NOT import from `nn-graph-eval.mjs`. So no circular import: `nn-graph-eval.mjs` → `seed-ghost-gnn-classify.mjs` is a one-way edge. `GNN_DEFAULTS.minConf = 0.7`, frozen, matches the commit message claim. No circular-import hazard.

Now let me check the calibration-analysis caller (the `selectiveDeployPoint` signature change concern) and run the regression tests.

### Assistant | 2026-06-06T04:56:22.612Z

[tool_use: Bash]

### User | 2026-06-06T05:01:28.242Z

[tool_result] Command running in background with ID: bngfjwcyr. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e607fe7-e3af-475c-8535-1d10b459c62c\tasks\bngfjwcyr.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T05:01:30.846Z

[tool_use: Bash]

### User | 2026-06-06T05:01:42.914Z

[tool_result] scripts/nn-graph-calibration-analysis.mjs:35:  riskCoverageCurve,
scripts/nn-graph-calibration-analysis.mjs:36:  selectiveDeployPoint,
scripts/nn-graph-calibration-analysis.mjs:223:  const rc = riskCoverageCurve(samples, { brier: GATE, macroF1: gates.macroF1 ?? 0.55 });
scripts/nn-graph-calibration-analysis.mjs:224:  const deployPoint = selectiveDeployPoint(samples, { brier: GATE, macroF1: gates.m
... [+18 chars truncated]

### Assistant | 2026-06-06T05:01:48.029Z

The calibration-analysis caller invokes `selectiveDeployPoint(samples, gates)` with only 2 args — the new 3rd `opts` param defaults to `{}`, so it picks up `GNN_DEFAULTS.minConf`. That's a compatible signature change (the old 3rd param `thresholds` was apparently never passed positionally by this caller). Let me read the calibration-analysis file around that usage and check the background grep, then run the regression tests.

### Assistant | 2026-06-06T05:01:48.911Z

[tool_use: Read]

### User | 2026-06-06T05:01:54.510Z

[tool_result] 200	  if (tooFew) {
201	    looCVResult = { insufficient: true, holdoutN: cs.length, note: "LOO-CV needs >= 2 samples" };
202	    clearsCal = { temperature: false, platt: false, isotonic: false };
203	  } else {
204	    const tProbs = looCV(cs, ys, fitTemperature);
205	    const pProbs = looCV(cs, ys, fitPlatt);
206	    const iProbs = looCV(cs, ys, fitIsotonic);
207	    const tBrier = computeBrier
... [+4439 chars truncated]

### Assistant | 2026-06-06T05:01:58.137Z

The calibration-analysis caller is consistent: `selectiveDeployPoint(samples, gates)` — 2 positional args. The new 3rd `opts` defaults to `{}`, picking up `GNN_DEFAULTS.minConf`. Correct usage. Now let me run the regression tests required by the task and check the fleet-wide readers of NN-EVAL.json.

### Assistant | 2026-06-06T05:01:59.064Z

[tool_use: Bash]

### User | 2026-06-06T05:02:05.674Z

[tool_result]   ...
# Subtest: murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
ok 83 - murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
  ---
  duration_ms: 0.6501
  ...
# Subtest: murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
ok 84 - murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
  ---
  duration_m
... [+511 chars truncated]

### Assistant | 2026-06-06T05:02:08.663Z

That output combined both test files (86 total) — but the task asked for the retrain-lifecycle and nn-eval-refresh tests. Let me run the exact regression tests the task specified, plus the nn-graph-eval test count separately.

### Assistant | 2026-06-06T05:02:09.553Z

[tool_use: Bash]

### User | 2026-06-06T05:04:44.890Z

[tool_result]   ...
# Subtest: refresh: degraded path when only skip entries
ok 61 - refresh: degraded path when only skip entries
  ---
  duration_ms: 0.6169
  ...
# Subtest: writeOutput: creates parent dir + writes JSON file
ok 62 - writeOutput: creates parent dir + writes JSON file
  ---
  duration_ms: 1.3945
  ...
# Subtest: end-to-end: realistic lifecycle → trained envelope written to disk
ok 63 - end-to-e
... [+199 chars truncated]

### Assistant | 2026-06-06T05:04:48.263Z

Both regression test suites pass (63/63). The retrain-lifecycle test took 147s (live graph load), explaining the watchdog warning. Now let me verify the fleet-wide readers of NN-EVAL.json consume named fields and are inert to the new `selective` key.

### Assistant | 2026-06-06T05:04:49.959Z

[tool_use: Bash]

### User | 2026-06-06T05:05:09.083Z

[tool_result] 26: *     the promotion gate AND not deferred) — the interesting state (dormant /
63:// tier-5 is auto-promoted IFF auroc >= this AND brier <= this (macroF1 also
64:// gated but NN-EVAL.json does not always carry it — auroc is the binding
82: * non-null object; checkpointMeta optional — a deferred eval may omit it).
100: * Returns { dormant, healthy, auroc, brier, poolSize, graded, verdict, reason
... [+2498 chars truncated]

### Assistant | 2026-06-06T05:05:12.122Z

`nn-graph-health-inject.mjs` reads `metrics.auroc`, `metrics.brier`, `checkpointMeta.*`, `deferred`, `poolSize`, `checkpointPresent` — all named fields. It does NOT touch `selective`. Inert to the new key. Confirmed. Now the other three readers.

### Assistant | 2026-06-06T05:05:13.897Z

[tool_use: Bash]

### User | 2026-06-06T05:05:22.556Z

[tool_result] 24: *  - NN/GNN (#10): NN-EVAL.json AUROC below 0.78 deploy gate OR missing
52:// U-NN-LEG-SCHEMA-READ-FIX (2026-06-02, slot:india): the NN-EVAL.json schema is
53:// nested ({deferred, reason, checkpointMeta:{auroc,...}}) — NOT flat {auroc}.
54:// Delegate the read to nn-graph-health-inject's classifyGnn so there is ONE
57:import { classifyGnn, PROMOTE_AUROC_MIN, PROMOTE_BRIER_MAX } from "./nn-gra
... [+2096 chars truncated]

### Assistant | 2026-06-06T05:05:25.811Z

`psn-leg-state-inject.mjs` delegates to `classifyGnn` (the canonical reader) and reads `deferred`, top-level `auroc` fallback. It does NOT read `selective`. Inert. Now the last two readers.

### Assistant | 2026-06-06T05:05:27.797Z

[tool_use: Bash]

### User | 2026-06-06T05:05:36.381Z

[tool_result] scripts/nn-graph-retrain-lifecycle.mjs:21: *                     NN-GRAPH-MS0 mandatory gates (AUROC>=0.78, macroF1>=0.55,
scripts/nn-graph-retrain-lifecycle.mjs:24: *                     clears. A deferred (un-graded) or sub-gate candidate is
scripts/nn-graph-retrain-lifecycle.mjs:30: * and only if the assessment is graded (deferred===false) AND grade.pass===true.
scripts/nn-graph-retrain-lifecyc
... [+3917 chars truncated]

### Assistant | 2026-06-06T05:05:41.934Z

Both `nn-graph-retrain-lifecycle.mjs` (reads `deferred`, `grade.pass`, `grade.verdict`, `metrics.*`, `holdoutN`, `poolSize`) and `ai-training-awareness.mjs` (reads `checkpointMeta.*`, `deferred`, `reason`, `poolSize`) consume only named fields. Neither reads `selective`. All 4 fleet readers are inert to the new key.

Now let me verify the critical REGRESSION concern: the promotion gate. The task asks if the deploy verdict is anchored on the production gate and the full-holdout failing grade is still surfaced. The key question for silent breakage — `shouldPromote` in retrain-lifecycle keys off `grade.pass` (full-holdout), NOT the new `deployGrade`. Let me confirm `selectiveDeployPoint` / `gradeSelectiveDeploy` does NOT leak into the promotion decision (which would be a silent over-promotion).

### Assistant | 2026-06-06T05:05:42.825Z

[tool_use: Read]

### User | 2026-06-06T05:05:48.149Z

[tool_result] 192	 * checkpoint. Returns { promote:boolean, reason:string }.
193	 *
194	 * THE SAFETY INVARIANT. promote===true requires ALL of:
195	 *   - an assessment object exists
196	 *   - assessment.deferred === false  (it was graded, not skipped)
197	 *   - assessment.grade.pass === true (strict — every NN-GRAPH gate cleared)
198	 * Anything else — null, deferred (insufficient reference pool), a sub-gat
... [+1166 chars truncated]

### Assistant | 2026-06-06T05:05:54.761Z

This is the critical safety confirmation. `promoteDecision` keys strictly on `a.grade.pass === true` — the FULL-HOLDOUT grade (`gradeMetrics`). The new `selective`/`deployGrade` does NOT participate in the auto-promotion decision. So the "deploy-ready-selective" verdict cannot silently auto-promote a model that fails the full-holdout gate. The full-holdout failing grade is retained and is the binding gate for promotion. This is the honest design the commit message claims.

Let me verify the actual live NN-EVAL.json to confirm the full-holdout `grade` still surfaces a FAIL while `selective` reports deploy-ready (the honesty concern), and check macroF1 in the awareness reader (`m.macroF1`).

### Assistant | 2026-06-06T05:05:57.273Z

[tool_use: Bash]

### User | 2026-06-06T05:06:05.915Z

[tool_result] deferred: false
metrics: {"auroc":0.8084,"macroF1":0.4389,"brier":0.179,"accuracy":0.6613}
grade: {"pass":false,"verdict":"shipped-research-only","failures":["macro-F1 0.4389 < 0.55","Brier 0.1790 > 0.15"]}
holdoutSplit: stratified holdoutN: 62
selective.deployGrade.verdict: deploy-ready-selective pass: true robust: true
productionGate: 0.7 op: {"tau":0.7,"coverage":0.3226,"emitted":20,"brier":0.0
... [+29 chars truncated]

### Assistant | 2026-06-06T05:06:12.931Z

This is the honesty crux, and it is handled correctly:
- The full-holdout `grade` is `{pass:false, verdict:"shipped-research-only", failures:["macro-F1 0.4389 < 0.55","Brier 0.1790 > 0.15"]}` — the FAIL is retained and surfaced.
- The `selective.deployGrade` is `deploy-ready-selective, pass:true, robust:true` at the production gate τ=0.7, coverage 32.26%, emitted 20/62, Brier 0.0406, macro-F1 1.0, AUROC 0.808 global.
- The numbers match the commit message exactly (Brier 0.041, macro-F1 1.0, AUROC 0.808, 32% coverage). Honest, anchored on the production gate, not a cherry-picked τ.

Now let me check a subtle silent-breakage concern: `ai-training-awareness.mjs` reads `checkpointMeta.auroc` for the graded path but the GRADED report has NO `checkpointMeta` (only `metrics`). Let me verify — this is a PRE-EXISTING reader behavior, not introduced by this commit, but I should confirm whether the holdoutSplit change affects it. Also let me check the error-budget edge cases in the new functions directly.

### Assistant | 2026-06-06T05:06:25.990Z

[tool_use: Bash]

### User | 2026-06-06T05:06:31.436Z

[tool_result] rcc empty: []
sdp empty: {"found":false,"productionMinConf":0.7,"productionPoint":null,"maxCoveragePoint":null,"robustAboveGate":false}
grade empty: {"pass":false,"verdict":"no-deployable-operating-point","failures":["AUROC n/a < 0.78 (global ranking)","the tier emits 
rcc nonfinite: []
sdp 1-sample-below-gate: {"found":false,"productionMinConf":0.7,"productionPoint":null,"maxCoveragePoint":null,"
... [+115 chars truncated]

### Assistant | 2026-06-06T05:06:38.492Z

All error-budget edge cases degrade gracefully — no throws:
- empty samples → `[]` / `{found:false}`
- non-finite confidence (NaN/null) → filtered out → `[]`
- n<2 / 1-sample-below-gate → `{found:false}`
- all-wrong above gate → `found:false`, brierClears:false (Brier 0.725, correctly fails)
- null arg → `[]` / `found:false`

The functions are robust. Now let me verify one final integration-coupling concern: the holdoutSplit default change (flat→stratified) is the most material regression risk. The task framed concern #1 as "the full-holdout grade/metrics path is byte-unchanged." It is NOT byte-unchanged — the default holdout split changed. I need to determine whether this stratify change shipped in THIS commit or a prior one, because that affects whether it's in-scope. The diff clearly shows it in b0b5b08716. Let me confirm the prior NN-EVAL.json metrics to see if this is a behavioral shift introduced here.

### Assistant | 2026-06-06T05:06:40.826Z

[tool_use: Bash]

### User | 2026-06-06T05:06:48.265Z

[tool_result] 325:  const cap = Math.floor(pool.length / 2); // keep at least half as references
---PARENT NN-EVAL grade/metrics---
2:  "deferred": false,
8:    "auroc": 0.78,
9:    "macroF1": 0.55,
10:    "brier": 0.15
13:    "auroc": 0.7373,
14:    "macroF1": 0.4517,
15:    "brier": 0.199,
33:      "brier": null
40:      "brier": 0.3148
47:      "brier": 0.2525
54:      "brier": 0.19
61:      "brier": 0.04
65
... [+62 chars truncated]

### Assistant | 2026-06-06T05:07:06.943Z

This is the key finding for concern #1. The parent commit (b0b5b08716~1) had:
- Only the flat split (`const cap = Math.floor(pool.length / 2)`), NO `opts.stratify` branch — confirming the **stratified split is introduced in THIS commit**.
- Parent metrics: AUROC **0.7373**, macroF1 **0.4517**, Brier **0.199** (flat split).
- This commit's metrics: AUROC **0.8084**, macroF1 **0.4389**, Brier **0.179** (stratified split).

So concern #1's premise — "the existing grade/metrics (full-holdout) path is byte-unchanged and still computes identically" — is **FALSE**. The full-holdout metrics changed because the default holdout split changed from flat to stratified within this commit. The AUROC moved 0.7373→0.8084, Brier 0.199→0.179, macroF1 0.4517→0.4389.

This is a legitimate, documented, defensible change (the comments + `holdoutSplit` field + `--flat-holdout` A/B flag explain it). BUT both versions still produce `grade.pass:false / shipped-research-only`, so the binding verdict is unchanged and no promotion regression occurs. The change is in-scope and honest, but the task's framing that the full-holdout path is "byte-unchanged" is incorrect. I'll flag this as a P2 (documentation/scoping clarity — the commit bundles a holdout-methodology change alongside the selective-deploy feature; both produce the same FAIL verdict so no silent breakage, but they are two distinct changes in one commit).

Let me do a final check: confirm the renderReport selective block doesn't crash on the deferred path and that `git status` is clean (committed state). Let me also verify the nn-graph-eval test count claim and that no other consumer reads `samples` shape that changed.

### Assistant | 2026-06-06T05:07:17.037Z

[tool_use: Bash]

### User | 2026-06-06T05:07:31.335Z

[tool_result] # tests 74
# pass 74
# fail 0
---deferred render no-crash---
deferred render OK len: 212
null-selective render OK, has SELECTIVE section: false

### Assistant | 2026-06-06T05:08:01.196Z

All verified:
- nn-graph-eval.test.mjs: 74/74 pass (the commit message's "86" was the combined count with calibration; standalone is 74).
- Deferred render: no crash, renders cleanly.
- Null-selective render: no crash, correctly omits the Selective section (guarded by `sel && Array.isArray(sel.curve) && sel.curve.length > 0`).

I have everything needed. Here is my verdict.

---

## ARM C Scrutiny Report — commit b0b5b08716 (U-GNN-SELECTIVE-DEPLOY)

### VERDICT: **PASS** (with one P2)

Weighted toward silent breakage, regression risk, I/O safety, error-budget, integration coupling. All four focus axes verified against live data and the 4 named fleet readers.

---

### 1. REGRESSION — verified, one scoping correction
- **4 fleet readers are inert to the new `selective` key.** Confirmed by source inspection:
  - `nn-graph-health-inject.mjs` `classifyGnn` → reads `metrics.{auroc,brier}`, `checkpointMeta.*`, `deferred`, `poolSize`, `checkpointPresent`. No `selective`.
  - `psn-leg-state-inject.mjs` → delegates to `classifyGnn` + top-level `auroc` fallback. No `selective`.
  - `nn-graph-retrain-lifecycle.mjs` → reads `deferred`, `grade.{pass,verdict,failures}`, `metrics.*`, `holdoutN`, `poolSize`. No `selective`.
  - `ai-training-awareness.mjs` → reads `checkpointMeta.*`, `deferred`, `reason`, `poolSize`. No `selective`.
- **Regression tests pass:** `nn-graph-retrain-lifecycle.test.mjs` + `nn-eval-refresh.test.mjs` = 63/63; `nn-graph-eval.test.mjs` = 74/74; calibration = 12/12 (86 combined). No regressions.
- **P2 — the full-holdout path is NOT byte-unchanged (concern #1 premise is false).** This commit changes the *default* `buildHoldout` split from **flat → stratified** (`scripts/lib/nn-graph-eval.mjs:468-501`). Parent (b0b5b08716~1) had only the flat split. Live metrics moved as a result: AUROC 0.7373→0.8084, Brier 0.199→0.179, macroF1 0.4517→0.4389. This is documented (the `holdoutSplit` field + `--flat-holdout` A/B flag + inline rationale), defensible (stratification
... [+3216 chars truncated]
