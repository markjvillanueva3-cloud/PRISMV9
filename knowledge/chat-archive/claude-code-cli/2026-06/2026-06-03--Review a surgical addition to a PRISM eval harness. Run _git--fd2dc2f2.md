---
type: "chat-session"
source: "claude-code-cli"
session_id: "fd2dc2f2-dece-487f-b054-17f8565d8030"
title: "Review a surgical addition to a PRISM eval harness. Run `git -C H:/prism diff HE"
date: "2026-06-03"
first_ts: "2026-06-03T13:00:56.254Z"
last_ts: "2026-06-03T13:07:20.187Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a95808910febda8e7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a surgical addition to a PRISM eval harness. Run `git -C H:/prism diff HE

> **claude-code-cli** | 2026-06-03 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a95808910febda8e7.jsonl`

## Transcript

### User | 2026-06-03T13:00:56.254Z

Review a surgical addition to a PRISM eval harness. Run `git -C H:/prism diff HEAD scripts/lib/nn-graph-eval.mjs scripts/lib/nn-graph-eval.test.mjs` to see ONLY my uncommitted changes, then read the relevant functions in full. Grade PASS/FAIL, flag every P0/P1.

WHAT I ADDED (unit U-NN-EVAL-DEGENERATE-GUARD):
- A new pure exported function `detectDegeneracy(scores, predicted)` in `scripts/lib/nn-graph-eval.mjs` that flags a GNN classifier whose holdout output carries no ranking signal — so its AUROC (~0.5) is a tie-break artifact, NOT a near-miss. Two modes: `constant-confidence` (all confidences identical → AUROC voided → `isDegenerate:true`) and `single-class` (all predictions same dispatcher → reported but does NOT set isDegenerate on its own, since varied confidence still ranks). Requires ≥2 finite samples else `insufficient-holdout`.
- Wired into `assessHoldout` (returns `degeneracy`), `runAssessment` (graded result carries `degeneracy`), and `renderReport` (emits a DEGENERATE warning block when isDegenerate).
- Tests in the .test.mjs.

CONTEXT: this exists because the live 8-dim AND 768d GraphSAGE checkpoints both collapse to a constant `prism_turning` @ conf 0.4 predictor (verified last session) → AUROC exactly 0.5 by tie-break. Without this guard, the report reads "AUROC 0.500 < 0.78" as if threshold-tuning could rescue it.

VERIFY SPECIFICALLY:
1. Correctness of detectDegeneracy across all branches (constant-vote, constant-confidence, single-class, discriminating, <2 samples, null/garbage). Does it use `round4` consistently for the distinct-confidence count?
2. `Number.isFinite` filtering of scores — does a NaN/Infinity score corrupt the distinct count?
3. Edge: could a LEGITIMATE high-performing model ever be false-flagged degenerate? (e.g. all-correct, all-high-confidence-but-VARIED → must NOT flag; all-correct-IDENTICAL-confidence → genuinely no ranking, correctly flags.)
4. Integration: does adding `degeneracy` to the return objects break any existing c
... [+399 chars truncated]

### Assistant | 2026-06-03T13:01:09.444Z

I'll review your surgical addition. Let me start by examining the diff.

### Assistant | 2026-06-03T13:01:10.673Z

[tool_use: Bash]

### User | 2026-06-03T13:01:43.059Z

[tool_result] diff --git a/scripts/lib/nn-graph-eval.mjs b/scripts/lib/nn-graph-eval.mjs
index 2042752b9c..0095cbeab7 100644
--- a/scripts/lib/nn-graph-eval.mjs
+++ b/scripts/lib/nn-graph-eval.mjs
@@ -205,6 +205,76 @@ export function gradeMetrics(metrics, gates = GATE_THRESHOLDS) {
   };
 }
 
+/**
+ * Detect a DEGENERATE classifier — one whose holdout output carries no ranking
+ * signal, so the AUROC it yields
... [+11267 chars truncated]

### Assistant | 2026-06-03T13:01:48.736Z

Now let me read the full functions in context to verify correctness. Let me read the relevant sections of the source file.

### Assistant | 2026-06-03T13:01:48.737Z

[tool_use: Read]

### User | 2026-06-03T13:01:54.498Z

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
... [+2803 chars truncated]

### Assistant | 2026-06-03T13:01:58.179Z

Let me read `round4` and the `assessHoldout` function to understand how `scores` and `predicted` are constructed before being passed to `detectDegeneracy`.

### Assistant | 2026-06-03T13:01:59.764Z

[tool_use: Read]

### User | 2026-06-03T13:02:13.296Z

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
... [+6815 chars truncated]

### Assistant | 2026-06-03T13:02:20.660Z

Now let me read the `assessHoldout` function in full to see how `scores` and `predicted` are produced, which is critical for verifying the integration and edge cases.

### Assistant | 2026-06-03T13:02:20.775Z

[tool_use: Read]

### User | 2026-06-03T13:02:38.068Z

[tool_result] 300	  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
301	  // Label-unique pool: a held-out ghost is scored by label, so a duplicate-label
302	  // ghost would collapse in the holdout Set and over-count `n` (and U6's
303	  // label-keyed partition would thin the reference pool). First label wins.
304	  const seenLabel = new Set();
305	  const pool = [];
306	  for (const n of
... [+5149 chars truncated]

### Assistant | 2026-06-03T13:02:40.914Z

Now let me see the rest of `runAssessment` to verify how `scored.degeneracy` flows, and check the deferred / skipped paths where `degeneracy` might be absent.

### Assistant | 2026-06-03T13:02:41.888Z

[tool_use: Read]

### User | 2026-06-03T13:03:03.743Z

[tool_result] 420	        }
421	      } else {
422	        return { deferred: true, reason: `graph-load-failed: ${err && err.message ? err.message : err}` };
423	      }
424	    }
425	  }
426	  let predictor = opts.predictor;
427	  // An injected predictor (test path) counts as a present model — a real
428	  // checkpoint is only consulted when no predictor was supplied.
429	  let checkpointPresent = !!predicto
... [+7300 chars truncated]

### Assistant | 2026-06-03T13:03:15.689Z

I have the full picture of the source. Now let me run the tests to confirm they pass, and check whether there are other consumers of `assessHoldout`/`runAssessment` results that might break with the new `degeneracy` field.

### Assistant | 2026-06-03T13:03:17.313Z

[tool_use: Bash]

### User | 2026-06-03T13:03:45.594Z

[tool_result]   ...
# Subtest: renderReport — a failing graded result shows FAIL + the failure list
ok 55 - renderReport — a failing graded result shows FAIL + the failure list
  ---
  duration_ms: 0.1485
  ...
# Subtest: parseArgs — reads every flag
ok 56 - parseArgs — reads every flag
  ---
  duration_ms: 0.5582
  ...
# Subtest: parseArgs — --help sets help; unknown argument throws
ok 57 - parseArgs — --help 
... [+342 chars truncated]

### Assistant | 2026-06-03T13:03:50.765Z

All 58 tests pass. Now let me check for other consumers of these result objects across the codebase, to verify the JSON shape change is non-breaking.

### Assistant | 2026-06-03T13:03:51.356Z

[tool_use: Grep]

### User | 2026-06-03T13:04:19.672Z

[tool_result] Found 45 files
knowledge\memories\reference\reference_u_rag_4_synergy_wiring_2026_05_22.md
knowledge\memories\reference\reference_u_nn_graph_health_2026_05_21.md
knowledge\memories\reference\reference_u_nng_pipeline_stratified_wire_2026_05_17.md
knowledge\memories\reference\reference_subagent_psn_substrate_upgrade_2026_05_24.md
knowledge\memories\reference\reference_sierra_system_viz_brain_assessm
... [+2530 chars truncated]

### Assistant | 2026-06-03T13:04:29.278Z

The actual code consumers are the two hooks (`nn-graph-health-inject.mjs` and `psn-leg-state-inject.mjs`) plus `svi-enhanced-refresh.mjs`. These read the persisted `NN-EVAL.json` report. Let me verify they read by specific keys (additive field won't break them) and check how the JSON report is written, since `degeneracy` will now be persisted.

### Assistant | 2026-06-03T13:04:30.881Z

[tool_use: Grep]

### User | 2026-06-03T13:04:46.312Z

[tool_result] No matches found

[Showing results with pagination = offset: 549]

### Assistant | 2026-06-03T13:04:53.856Z

[tool_use: Read]

### User | 2026-06-03T13:05:12.011Z

[tool_result] 549	  }
550	  return L.join("\n") + "\n";
551	}
552	
553	const USAGE = `nn-graph-eval — assess the GNN tier-5 wiring classifier against the NN-GRAPH-MS0 gates
554	
555	Usage: node scripts/lib/nn-graph-eval.mjs [options]
556	
557	  --checkpoint <path>  trained checkpoint JSON (default: state/shared/nn-graph/graphsage-checkpoint.json)
558	  --graph <path>       graph JSON (default: the system-viz gr
... [+2616 chars truncated]

### Assistant | 2026-06-03T13:05:18.580Z

Confirmed: `JSON.stringify(result, ...)` serializes the whole `result`, so `degeneracy` will now be persisted to `NN-EVAL.json` (a graded run only). This is purely additive — the report has no schema version, and existing consumers read named keys. Let me confirm the consumers read by named key (additive-safe) rather than positionally.

### Assistant | 2026-06-03T13:05:19.310Z

[tool_use: Grep]

### User | 2026-06-03T13:05:24.865Z

[tool_result] 53:// nested ({deferred, reason, checkpointMeta:{auroc,...}}) — NOT flat {auroc}.
54:// Delegate the read to nn-graph-health-inject's classifyGnn so there is ONE
57:import { classifyGnn, PROMOTE_AUROC_MIN, PROMOTE_BRIER_MAX } from "./nn-graph-health-inject.mjs";
197:  // classifyGnn). The real NN-EVAL.json nests AUROC under `checkpointMeta` and
198:  // carries `deferred`/`reason`; the prior flat 
... [+1160 chars truncated]

### Assistant | 2026-06-03T13:05:37.862Z

Confirmed: the consumer reads named keys via `classifyGnn(evalDoc)` (reads `metrics.auroc`/`checkpointMeta.auroc`/`deferred`). An additive `degeneracy` key is invisible to it — no break. The new field is also independent of `gradeMetrics` (which is computed from `scored.metrics`, untouched).

Let me do a final correctness verification of the trickiest claim: that `round4` is used consistently for distinct-confidence counting, and whether NaN/Infinity filtering interacts correctly with the `s[0]` reference in the detail string. I have the full function. Let me trace the key edge cases mentally against the code, and verify one subtle interaction — the `s.length` vs `p.length` divergence when scores contain non-finite values but predictions don't.

Let me check: `assessHoldout` pushes `conf` (always finite — `Number.isFinite(c.confidence) ? c.confidence : 0`) so in production `scores` is always all-finite and `scores.length === predicted.length`. But `detectDegeneracy` is exported and independently tested, so I must verify it's robust to mismatched/non-finite inputs on its own.

Let me verify the one scenario the prompt flagged — a NaN score corrupting the distinct count — with a direct probe.

### Assistant | 2026-06-03T13:05:43.123Z

[tool_use: Bash]

### User | 2026-06-03T13:06:00.214Z

[tool_result] varied-high: {"isDegenerate":false,"mode":"none","distinctConfidences":4,"distinctPredictions":4,"dominantClass":"a","dominantShare":0.25,"detail":"discriminating (varied confidence + classes)"}
identical-high: {"isDegenerate":true,"mode":"constant-confidence","distinctConfidences":1,"distinctPredictions":3,"dominantClass":"a","dominantShare":0.3333,"detail":"every target scored at one confidence 
... [+1134 chars truncated]

### Assistant | 2026-06-03T13:06:13.373Z

Every probe matches the intended behavior. Let me note the critical findings from probe 4 and 6:

- **Probe 4 (sub-round4)**: confidences differing only below 4dp collapse to 1 distinct → flagged degenerate. This is *correct and important* — it mirrors `round4` precision used everywhere else in the harness (the report only ever displays/stores round4 confidences), so the guard's notion of "distinct" matches what the report would show. This directly answers the prompt's verification point #1.
- **Probe 6 (mismatch-len)**: when `predicted` is shorter than `scores`, `dominantShare` is computed from `p.length` (1.0 here), while `distinctConfidences` comes from `s` — they're independent. This can't happen in `assessHoldout` (arrays are built in lockstep) but the function degrades sanely standalone.

One subtle point worth confirming on probe 3 (`nan-mixed`): the detail string reports `s[0]` = `0.4` — but `s` is the *filtered* array, so `s[0]` is the first finite value, not the first raw value. That's correct (it should report a real confidence, never NaN). Good.

Now let me verify the `gradeMetrics` separation claim definitively and confirm `degeneracy` does not leak into the deferred/skipped paths in a way that would make `renderReport` crash (it guards with `d && d.isDegenerate`).

The deferred path (line 449-450) and skipped path return objects with NO `degeneracy` key, but `renderReport`'s deferred branch returns early (line 515/520) before reaching the degeneracy block, and the graded branch always has `degeneracy` from `scored.degeneracy`. The `d && d.isDegenerate` guard also handles any hand-constructed result lacking the field. No crash path.

Let me confirm the markdown spacing is correct by rendering the degenerate fixture and inspecting raw output.

### Assistant | 2026-06-03T13:06:17.993Z

[tool_use: Bash]

### User | 2026-06-03T13:06:39.987Z

[tool_result] | Brier | 0.26 | <= 0.15 | FAIL |$
| accuracy | 0.5 | (informational) | M-bM-^@M-^T |$
$
**Verdict: SHIPPED-RESEARCH-ONLY**$
$
Gate failures: AUROC 0.5000 < 0.78; macro-F1 0.1333 < 0.55; Brier 0.2600 > 0.15$
$
$
> M-bM-^ZM-  **DEGENERATE CLASSIFIER (constant-vote)** M-bM-^@M-^T every target scored at one confidence (0.4) and all predicted `prism_turning` M-bM-^@M-^T AUROC carries no ranking signal
... [+494 chars truncated]

### Assistant | 2026-06-03T13:07:20.187Z

The markdown spacing is correct. The blockquote (`>` lines) is preceded by a blank line and followed by a blank line (the `L.push("")` at line 545), so the `## Per-bucket calibration` heading renders as a proper section. There's a minor cosmetic double-blank between "Gate failures" and the warning block (one blank from the gate-failures push having no trailing `""`, plus the `""` that leads the degeneracy push), but that's harmless in markdown — consecutive blank lines collapse.

Let me verify test integrity point #6 — would the tests fail if `detectDegeneracy` were stubbed to `return {isDegenerate:false}`. The tests assert concrete values like `d.mode === "constant-vote"`, `d.distinctConfidences === 1`, `d.dominantClass === "prism_turning"`. A constant stub returning only `{isDegenerate:false}` would fail `assert.equal(d.isDegenerate, true)` immediately on the first test. Confirmed real assertions.

I have everything I need. Here's my review.

---

## Code Quality Analysis Report

### Summary
- Files Analyzed: 2 (`scripts/lib/nn-graph-eval.mjs`, `scripts/lib/nn-graph-eval.test.mjs`)
- Overall Quality Score: 9.5/10
- Issues Found: 0 P0, 0 P1, 2 P2 (cosmetic/optional)
- Tests: 58/58 pass; 10 new tests, all concrete-value assertions
- Technical Debt Estimate: ~0 hours (the P2s are optional polish)

### Verification of your 6 specified points

**1. Correctness across all branches — PASS.** Probed all six modes directly (constant-vote, constant-confidence, single-class, discriminating, <2 samples, null/garbage) plus the sub-`round4` precision case. Every branch behaves as specified. `round4` is used consistently for the distinct-confidence count (`new Set(s.map(x => round4(x))).size`), so the guard's notion of "distinct" exactly matches the precision the report stores/displays. Confidences differing only below 4dp correctly collapse to 1 distinct → flagged (probe 4). This is the *right* call: a model whose only "ranking" lives below reporting precision has no ranking th
... [+5417 chars truncated]
