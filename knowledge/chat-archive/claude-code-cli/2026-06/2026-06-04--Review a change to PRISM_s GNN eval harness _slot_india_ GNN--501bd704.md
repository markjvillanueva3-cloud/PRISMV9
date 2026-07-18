---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Review a change to PRISM's GNN eval harness (slot:india, GNN-F0 spec 1b). Files:"
date: "2026-06-04"
first_ts: "2026-06-04T20:36:54.228Z"
last_ts: "2026-06-04T20:44:07.488Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 9
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ad38f16f6796765d0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review a change to PRISM's GNN eval harness (slot:india, GNN-F0 spec 1b). Files:

> **claude-code-cli** | 2026-06-04 | 26 msgs (9 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ad38f16f6796765d0.jsonl`

## Transcript

### User | 2026-06-04T20:36:54.228Z

Review a change to PRISM's GNN eval harness (slot:india, GNN-F0 spec 1b). Files: `H:/prism/scripts/lib/nn-graph-eval.mjs` (buildHoldout now does a per-class STRATIFIED split by default; flat kept behind opts.stratify===false / --flat-holdout; assessHoldout + runAssessment thread `stratified`/`heldClasses` into NN-EVAL.json as `holdoutSplit`) + `H:/prism/scripts/lib/nn-graph-eval.test.mjs` (+5 stratification tests). See `git -C H:/prism diff scripts/lib/nn-graph-eval.mjs scripts/lib/nn-graph-eval.test.mjs`.

WHY: the flat seededShuffle split inherits the pool's ~45% prism_turning skew, so a minority class (prism_calc) can get ZERO holdout samples; computeMacroF1 averages per-class F1 over union(predicted,truth), so a class with no truth sample that is ever predicted scores F1=0 and drags the average.

LIVE A/B (deterministic seed 1337, same 62-ghost holdout size): flat AUROC 0.737 / macroF1 0.452 / Brier 0.199 / acc 0.726 → stratified AUROC 0.808 / macroF1 0.439 / Brier 0.179 / acc 0.661.

GRADE PASS/FAIL with P0/P1/P2. VERIFY HARD:
1. **R12 — is switching the default to stratified GAMING the AUROC number (0.737→0.808 looks better)?** The counter-claim: stratified ALSO moved macroF1 DOWN (0.452→0.439) and accuracy DOWN (0.726→0.661), so it can't be a cherry-pick (a cherry-pick improves everything). AUROC rose because the flat split genuinely under-sampled. Is stratified the standard/more-correct eval here, and is the default-switch defensible? Or is it metric-manipulation?
2. **Correctness of buildHoldout stratification:** every >=2-sample class gets >=1 holdout AND retains >=1 reference (floor(len/2) with len>=2 → 1..len-1); 1-sample classes are reference-only; deterministic (seeded, sorted class order); the requested cap still applies.
3. **Threading:** assessHoldout returns stratified/heldClasses; runAssessment records holdoutSplit honestly; flat path still works via --flat-holdout.
4. Tests assert real intent (imbalanced fixture, every-class-present, singleton-ex
... [+173 chars truncated]

### Assistant | 2026-06-04T20:37:16.803Z

I'll review this GNN eval harness change. Let me start by reading the diff and the full files to understand the stratification implementation.

### Assistant | 2026-06-04T20:37:17.671Z

[tool_use: Bash]

### User | 2026-06-04T20:38:11.913Z

[tool_result] diff --git a/scripts/lib/nn-graph-eval.mjs b/scripts/lib/nn-graph-eval.mjs
index c584e4849b..111c1c1d34 100644
--- a/scripts/lib/nn-graph-eval.mjs
+++ b/scripts/lib/nn-graph-eval.mjs
@@ -322,10 +322,46 @@ export function buildHoldout(graph, opts = {}) {
     pool.push(n);
   }
 
-  const cap = Math.floor(pool.length / 2); // keep at least half as references
-  const k = Math.min(requested, cap);
-
... [+7795 chars truncated]

### Assistant | 2026-06-04T20:38:17.438Z

I have the diff. Now let me read the full source file to verify the context around the changes — especially `buildHoldout`, `computeMacroF1`, `voteDispatcher` base-rate normalization, and `assessHoldout`.

### Assistant | 2026-06-04T20:38:18.438Z

[tool_use: Read]

### Assistant | 2026-06-04T20:38:19.114Z

[tool_use: Read]

### User | 2026-06-04T20:38:33.481Z

[tool_result] 280	  } else if (singleClass) {
281	    detail = `all predictions = \`${dominantClass}\` but confidence varies — collapsed to the reference-pool class prior`;
282	  } else {
283	    detail = "discriminating (varied confidence + classes)";
284	  }
285	  return { isDegenerate, mode, distinctConfidences, distinctPredictions, dominantClass, dominantShare, detail };
286	}
287	
288	/** Fisher-Yates shuf
... [+9372 chars truncated]

### User | 2026-06-04T20:38:33.697Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.test.mjs — node:test suite for the GNN tier-5 assessment
4	 * harness (NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS, U7).
5	 *
6	 * The pure metric functions are pinned to hand-computed reference values
7	 * (AUROC via Mann-Whitney, macro-F1, Brier) — a stub returning a constant
8	 * would fail. The end-to-end paths use a REAL GraphSAGE model from createModel
9	
... [+2858 chars truncated]

### Assistant | 2026-06-04T20:38:47.869Z

Now let me look at `computeMacroF1` and `computeAUROC` to verify the WHY claim — specifically that AUROC is a label-correctness ranking metric (not class-conditional), which is key to assessing whether stratification "games" AUROC.

### Assistant | 2026-06-04T20:38:49.083Z

[tool_use: Bash]

### User | 2026-06-04T20:40:02.700Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 1 files:

scripts/lib/nn-graph-eval.mjs:72:export function computeAUROC(scores, labels) {
scripts/lib/nn-graph-eval.mjs:103:export function computeMacroF1(predicted, truth) {
scripts/lib/nn-graph-eval.mjs:133:expor
... [+148 chars truncated]

### Assistant | 2026-06-04T20:40:08.472Z

Let me read the metric functions to verify the AUROC and macroF1 semantics.

### Assistant | 2026-06-04T20:40:09.066Z

[tool_use: Read]

### User | 2026-06-04T20:40:14.313Z

[tool_result] 60	
61	/** Round to 4 dp, or null when not finite. */
62	function round4(x) {
63	  return Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null;
64	}
65	
66	/**
67	 * Area under the ROC curve via the rank-sum (Mann-Whitney U) identity, with
68	 * average ranks for ties. `scores` are predictions, `labels` are 0/1. Returns
69	 * a value in [0,1], or null when a class is absent or the inputs are inva
... [+6074 chars truncated]

### Assistant | 2026-06-04T20:40:29.723Z

Now I understand the metric semantics deeply. Let me verify a critical aspect of the WHY/R12 claim. The key question for "is this gaming AUROC?": AUROC here is computed over `scores` (prediction confidence) vs `labels` (correct=1/incorrect=0) — it measures **whether the classifier's confidence ranks correct predictions above incorrect ones**, pooled across all samples. It is NOT class-conditional. So changing the class composition of the holdout changes which samples are in the AUROC pool. Let me verify the `gradeMetrics` confirms macroF1 is indeed the binding gate, and check the gate thresholds.

### Assistant | 2026-06-04T20:40:31.018Z

[tool_use: Bash]

### User | 2026-06-04T20:41:44.828Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'GATE_THRESHOLDS\s*=\|HARNESS_DEFAULTS\s*=\|auroc:\|macroF1:\|brier:\|holdout:\|seed:'

### Assistant | 2026-06-04T20:41:49.649Z

The rtk grep regex failed (BRE alternation). Let me read the constants directly.

### Assistant | 2026-06-04T20:41:50.454Z

[tool_use: Read]

### User | 2026-06-04T20:42:41.579Z

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
... [+2799 chars truncated]

### Assistant | 2026-06-04T20:42:45.823Z

Now I have the full picture. Let me run the test suite to verify it passes, and also write a small verification script to confirm the stratification invariants hold (every ≥2-sample class held + keeps a reference, determinism, cap behavior).

### Assistant | 2026-06-04T20:42:46.877Z

[tool_use: Bash]

### User | 2026-06-04T20:43:53.379Z

[tool_result] # tests 62
# pass 62
# fail 0

### Assistant | 2026-06-04T20:43:58.484Z

62/62 pass. Now let me write a focused verification probe to independently check the stratification invariants and a critical edge case the tests don't cover: the **cap interaction with stratification**. When `requested < holdout.length`, a final `seededShuffle(holdout, seed).slice(0, requested)` can DROP whole classes — re-introducing the exact zero-holdout skew the change set out to fix. Let me probe this.

### Assistant | 2026-06-04T20:44:07.488Z

[tool_use: Bash]
