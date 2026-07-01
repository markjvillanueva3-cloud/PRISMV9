---
type: "chat-session"
source: "claude-code-cli"
session_id: "fd2dc2f2-dece-487f-b054-17f8565d8030"
title: "Independent second-pass review of an uncommitted change in `H:/prism`. Run `git "
date: "2026-06-03"
first_ts: "2026-06-03T13:08:00.425Z"
last_ts: "2026-06-03T13:12:09.316Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-aa2cd7ec20fa30fe0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review of an uncommitted change in `H:/prism`. Run `git 

> **claude-code-cli** | 2026-06-03 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-aa2cd7ec20fa30fe0.jsonl`

## Transcript

### User | 2026-06-03T13:08:00.425Z

Independent second-pass review of an uncommitted change in `H:/prism`. Run `git -C H:/prism diff HEAD scripts/lib/nn-graph-eval.mjs scripts/lib/nn-graph-eval.test.mjs` to see exactly my changes; read the touched functions end-to-end. This is the only diff to review. Grade PASS/FAIL, flag P0/P1.

The change adds `detectDegeneracy(scores, predicted)` to the GNN tier-5 deploy-gate eval, wires a `degeneracy` field through `assessHoldout` → `runAssessment`, and adds a `renderReport` warning. Purpose: a constant-vote classifier scores AUROC ~0.5 by tie-break, so the guard makes the report say "below-gate by DEGENERACY, not a small margin" instead of letting a collapsed model read as a near-miss. `isDegenerate` is keyed off confidence-collapse (distinct confidence count ≤ 1), NOT prediction-class collapse.

A prior reviewer already PASSED it on correctness/integration/test-integrity. Weight YOUR pass toward what they may have under-checked:
1. **Statistical soundness of the threshold** — is "distinct rounded(4dp) confidence ≤ 1 ⇒ AUROC invalid" the right boundary? Could a near-degenerate model with exactly 2 distinct confidences (e.g. 0.40 and 0.4001) slip through as "not degenerate" and still produce a meaningless AUROC? Is that boundary acceptable and documented, or a real gap?
2. **Hidden coupling** — grep for importers of this module and readers of `NN-EVAL.json`; does the additive `degeneracy` key or the new export break/confuse any consumer (esp. `classifyGnn` in `.claude/hooks/nn-graph-health-inject.mjs`, and any SVI/dashboard reader)?
3. **`renderReport` deferred path** — confirm a DEFERRED result (no `degeneracy` field) cannot crash the new `d && d.isDegenerate` access.
4. Any P0/P1 the first reviewer might have rationalized away.

Report P0/P1/P2. End with PASS or FAIL.

### Assistant | 2026-06-03T13:08:16.557Z

I'll review this diff. Let me start by examining the exact changes and reading the touched functions end-to-end.

### Assistant | 2026-06-03T13:08:17.861Z

[tool_use: Bash]

### User | 2026-06-03T13:08:36.621Z

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

### Assistant | 2026-06-03T13:08:43.563Z

I have the diff. Now let me read the full source file to understand the surrounding context, helper functions (`round4`), and how `assessHoldout` produces `scores` and `predicted`.

### Assistant | 2026-06-03T13:08:43.564Z

[tool_use: Read]

### User | 2026-06-03T13:08:46.968Z

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
... [+30511 chars truncated]

### Assistant | 2026-06-03T13:08:51.850Z

I have the full source. Now let me check the consumers — `classifyGnn` in the health-inject hook, readers of `NN-EVAL.json`, and any other importers of this module — for hidden coupling.

### Assistant | 2026-06-03T13:08:53.287Z

[tool_use: Grep]

### Assistant | 2026-06-03T13:08:53.751Z

[tool_use: Grep]

### User | 2026-06-03T13:09:20.619Z

[tool_result] Found 8 files
CLAUDE.md
knowledge\wiki\lessons\nn-graded-schema-read-fix.md
.claude\hooks\nn-graph-health-inject.mjs
.claude\hooks\nn-graph-health-inject.test.mjs
knowledge\wiki\lessons\nn-leg-schema-read-fix.md
knowledge\wiki\code-tribal\learnings\psn-leg-health-fix-u-nn-leg-schema-read-fix.md
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs

### User | 2026-06-03T13:09:21.510Z

[tool_result] Found 69 files
mcp-server\data\state\session-file-ownership.json
knowledge\memories\reference\reference_whiskey_lathe_lora_tier_complete_2026_05_30.md
knowledge\memories\reference\reference_u_rag_4_synergy_wiring_2026_05_22.md
knowledge\memories\reference\reference_u_nn_graph_health_2026_05_21.md
knowledge\memories\reference\reference_u_nng_pipeline_stratified_wire_2026_05_17.md
knowledge\memories
... [+4176 chars truncated]

### Assistant | 2026-06-03T13:09:26.324Z

Let me read the two hook consumers that read `NN-EVAL.json` and contain `classifyGnn` — these are the most likely coupling points.

### Assistant | 2026-06-03T13:09:26.499Z

[tool_use: Read]

### User | 2026-06-03T13:09:35.634Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * .claude/hooks/nn-graph-health-inject.mjs
4	 *
5	 * SessionStart hook — surfaces the NN-GRAPH (GraphSAGE GNN tier-5) wiring-
6	 * inference health from `state/shared/nn-graph/NN-EVAL.json` (producer: the
7	 * nn-graph-eval pipeline, NN-GRAPH-MS0/MS1/MS2).
8	 *
9	 * Iter 18 of the /goal synergize loop (echo, 2026-05-21). Closes the
10	 * "neural network / gnn" substr
... [+12293 chars truncated]

### Assistant | 2026-06-03T13:09:44.096Z

This consumer (`classifyGnn`) reads only `deferred`, `metrics`, `checkpointMeta`, `poolSize`, `checkpointPresent`, `grade`, `reason`. It does not touch `degeneracy`, so the additive key is invisible to it. Confirmed the additive key is back-compat safe here. Let me check the second consumer (`psn-leg-state-inject.mjs`) and confirm it also delegates to `classifyGnn`.

### Assistant | 2026-06-03T13:09:45.498Z

[tool_use: Grep]

### User | 2026-06-03T13:09:52.039Z

[tool_result] 24: *  - NN/GNN (#10): NN-EVAL.json AUROC below 0.78 deploy gate OR missing
52:// U-NN-LEG-SCHEMA-READ-FIX (2026-06-02, slot:india): the NN-EVAL.json schema is
54:// Delegate the read to nn-graph-health-inject's classifyGnn so there is ONE
57:import { classifyGnn, PROMOTE_AUROC_MIN, PROMOTE_BRIER_MAX } from "./nn-graph-health-inject.mjs";
189: * NN/GNN leg health. `statResult` is {mtimeMs} for NN-
... [+1114 chars truncated]

### Assistant | 2026-06-03T13:09:57.973Z

The second consumer also delegates to `classifyGnn` and reads only `auroc`/`brier`/`deferred`/`checkpointMeta` — never `degeneracy`. Both `NN-EVAL.json` readers are isolated from the additive key.

Now let me verify the tests actually pass, to confirm test integrity rather than just trust it.

### Assistant | 2026-06-03T13:09:58.914Z

[tool_use: Bash]

### User | 2026-06-03T13:10:04.874Z

[tool_result]   ...
# Subtest: parseArgs — reads every flag
ok 56 - parseArgs — reads every flag
  ---
  duration_ms: 0.1894
  ...
# Subtest: parseArgs — --help sets help; unknown argument throws
ok 57 - parseArgs — --help sets help; unknown argument throws
  ---
  duration_ms: 0.3353
  ...
# Subtest: main — returns 0 for --help and 2 for an unknown argument
ok 58 - main — returns 0 for --help and 2 for an unkn
... [+151 chars truncated]

### Assistant | 2026-06-03T13:10:16.740Z

All 58 tests pass. Now let me dig into the core statistical question — point 1. I need to verify two things: (a) whether the AUROC computation actually does tie-break to ~0.5 under constant confidence (which is the premise of the whole guard), and (b) what `classifyUnknownGhosts` actually produces as confidence values — specifically whether near-degenerate "2 distinct confidences" is a real reachable state. Let me look at how confidences are produced.

### Assistant | 2026-06-03T13:10:18.080Z

[tool_use: Grep]

### User | 2026-06-03T13:10:26.979Z

[tool_result] 9: * UNKNOWN it resolves with confidence >= PRISM_NNG_MIN_CONF is pre-empted out
10: * of the (slow, ~0.55-confidence) Ollama batch.
15: *   2. The reference set is the cascade's own high-confidence output: ghost
17: *      confidence >= PRISM_NNG_REF_MIN_CONF (the keyword tier, ~0.85).
22: *   4. For each UNKNOWN target, score the link to every reference with the
23: *      model's link head, tak
... [+2705 chars truncated]

### Assistant | 2026-06-03T13:10:37.377Z

This is the crucial detail for the statistical-soundness question. The confidence in `assessHoldout` comes from `c.confidence`, which the producer (`seed-ghost-gnn-classify.mjs` line 344) rounds to 4dp: `Math.round(v.confidence * 1e4) / 1e4`. And `assessHoldout` itself rounds again at line 364 (`round4(conf)` for samples) but pushes the raw `conf` (already 4dp-rounded by the producer) into `scores`.

So the confidence values entering `detectDegeneracy` are **already quantized to 4dp by the producer**. The `detectDegeneracy` distinct-count also rounds to 4dp. This means the round4 grouping in `detectDegeneracy` matches the actual precision of the data — there's no information loss from re-rounding. The "0.40 vs 0.4001" near-degenerate scenario from the prompt: those are genuinely 2 distinct values at 4dp, and the producer would emit them as distinct. Let me verify the AUROC tie-break behavior empirically to confirm the guard's premise and check the boundary case.

### Assistant | 2026-06-03T13:10:46.258Z

[tool_use: Bash]

### User | 2026-06-03T13:10:57.617Z

[tool_result] constant-conf AUROC (mixed labels): 0.5
constant-conf AUROC (3 correct 1 wrong): 0.5
near-degenerate (0.40 x3, 0.4001 x1): {"isDegenerate":false,"mode":"single-class","distinctConfidences":2,"distinctPredictions":1,"dominantClass":"a","dominantShare":1,"detail":"all predictions = `a` but confidence varies — collapsed to the reference-pool class prior"}
  AUROC if odd-one wrong: 0
  AUROC if odd-on
... [+379 chars truncated]

### Assistant | 2026-06-03T13:11:09.120Z

Empirical results confirm the key claims and surface the boundary question precisely. Let me analyze:

1. **AUROC tie-break premise: CONFIRMED.** Constant confidence → AUROC exactly 0.5 regardless of label correctness. The guard's central premise holds.

2. **The boundary case (point 1) is REAL but correctly handled.** With confidences `[0.40, 0.40, 0.40, 0.4001]` (2 distinct), `isDegenerate=false`, yet the AUROC can be **0 or 1** depending on which sample the odd confidence lands on — a wildly unstable, meaningless number. This is exactly the "2 distinct confidences slip through" scenario the prompt asked about. However: this is **not** a regression or a false-negative in the deploy gate. The gate already FAILs anything below 0.78; an AUROC of 0 or 1 from a near-degenerate split is still graded against the real metric, and the guard's purpose is narrow — flag the *specific* constant-vote collapse mode (the live 8-dim failure where AUROC reads ~0.5 as a deceptive near-miss). A 2-distinct-confidence model that scores AUROC 1.0 isn't being misread as a near-miss; it'd read as PASS, which is a different (and genuinely different) concern. Let me assess whether that's a documented limitation or a silent gap.

Let me check the test file end-to-end and verify the `dominantShare`/single-sample edge in `detectDegeneracy` plus the `distinctConfidences` semantics when `s.length < 2` but `predicted` is longer.

### Assistant | 2026-06-03T13:11:09.777Z

[tool_use: Read]

### User | 2026-06-03T13:11:16.859Z

[tool_result] 360	  fs.rmSync(tmpdir, { recursive: true, force: true });
361	});
362	
363	// --- detectDegeneracy (U-NN-EVAL-DEGENERATE-GUARD) -------------------------
364	
365	test("detectDegeneracy — constant confidence + single class → degenerate constant-vote", () => {
366	  // The live 8-dim/768d failure mode: every target → prism_turning @ 0.4.
367	  const d = detectDegeneracy([0.4, 0.4, 0.4, 0.4], ["pri
... [+4763 chars truncated]

### Assistant | 2026-06-03T13:11:28.711Z

I have everything I need. Let me also confirm the `NN-EVAL.json` JSON output won't bloat or break the `MAX_EVAL_BYTES` 1MB cap in the consumer (the `degeneracy` object is tiny, ~7 small fields), and that the `detail` string with backticks/special chars is JSON-safe. It's serialized via `JSON.stringify` at line 603, so it's safe. The degeneracy object adds well under 1KB.

Let me do one final check — point 4: verify there's no issue with `detectDegeneracy` receiving `scores` filtered to fewer than `predicted.length` (the `assessHoldout` always pushes equal-length arrays, but `detectDegeneracy` filters non-finite scores while keeping all predictions, creating a length mismatch in the degenerate-detail path). Let me confirm the dominant-class share semantics are still coherent in that case.

### Assistant | 2026-06-03T13:11:32.707Z

[tool_use: Bash]

### User | 2026-06-03T13:11:40.906Z

[tool_result] mismatch: {"isDegenerate":true,"mode":"constant-confidence","distinctConfidences":1,"distinctPredictions":2,"dominantClass":"a","dominantShare":0.75,"detail":"every target scored at one confidence (0.4) — AUROC carries no ranking signal (artifact of the tie, not a near-miss)"}

### Assistant | 2026-06-03T13:12:09.316Z

The length-mismatch path is benign — `dominantShare` uses `p.length` as denominator and `distinctConfidences` uses filtered `s`; both stay coherent. In practice `assessHoldout` always pushes `conf=0` (finite) for unresolved targets, so `scores` and `predicted` are always equal length anyway. No bug.

I have completed the review. Here are my findings.

---

## Review summary

**Reviewing:** Uncommitted diff to `H:/prism/scripts/lib/nn-graph-eval.mjs` and `H:/prism/scripts/lib/nn-graph-eval.test.mjs` — addition of `detectDegeneracy()`, its wiring through `assessHoldout` → `runAssessment`, and a `renderReport` honesty warning.

**What I independently verified (beyond the prior reviewer's correctness/integration pass):**
- AUROC tie-break premise — empirically confirmed: constant confidence → AUROC exactly 0.5 regardless of label correctness (`H:/prism/scripts/lib/nn-graph-eval.mjs:72-95`). The guard's central claim is sound.
- Both `NN-EVAL.json` consumers (`classifyGnn` in `H:/prism/.claude/hooks/nn-graph-health-inject.mjs:120-176` and the delegating reader in `H:/prism/.claude/hooks/psn-leg-state-inject.mjs:202`) read only `deferred`/`metrics`/`checkpointMeta`/`poolSize`/`grade`/`reason`/`checkpointPresent` — **none touch `degeneracy`**. The additive key is invisible to them; no SVI/dashboard reader keys off it either.
- Deferred `renderReport` path — confirmed no crash: a deferred result returns before the `d && d.isDegenerate` access (`renderReport` line 473-521 returns early), and even if reached, the `d && ...` short-circuit guards a missing field. Empirically rendered a deferred result with no `degeneracy` field: 996 chars, no throw.
- The `degeneracy` object adds <1KB to `NN-EVAL.json`, well under the consumer's 1MB `MAX_EVAL_BYTES` cap; backtick/special chars in `detail` are JSON-safe via `JSON.stringify`.
- 58/58 tests pass.

## Findings

### P0
None.

### P1
None.

### P2 (documentation gap, not a correctness defect)

**P2-1 — The "2 distinct confidences" bo
... [+3045 chars truncated]
