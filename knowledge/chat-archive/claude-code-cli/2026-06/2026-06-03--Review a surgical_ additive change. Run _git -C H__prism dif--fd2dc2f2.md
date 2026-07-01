---
type: "chat-session"
source: "claude-code-cli"
session_id: "fd2dc2f2-dece-487f-b054-17f8565d8030"
title: "Review a surgical, additive change. Run `git -C H:/prism diff HEAD .claude/hooks"
date: "2026-06-03"
first_ts: "2026-06-03T13:27:12.672Z"
last_ts: "2026-06-03T13:34:03.247Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a7538fd68da4b9245.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a surgical, additive change. Run `git -C H:/prism diff HEAD .claude/hooks

> **claude-code-cli** | 2026-06-03 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a7538fd68da4b9245.jsonl`

## Transcript

### User | 2026-06-03T13:27:12.672Z

Review a surgical, additive change. Run `git -C H:/prism diff HEAD .claude/hooks/nn-graph-health-inject.mjs .claude/hooks/psn-leg-state-inject.mjs .claude/hooks/nn-graph-health-inject.test.mjs .claude/hooks/psn-leg-state-inject.test.mjs` to see ONLY my changes; read the touched functions end-to-end. Grade PASS/FAIL, flag every P0/P1.

UNIT U-NN-DEGENERACY-HOOK-SURFACE: the GNN eval (`scripts/lib/nn-graph-eval.mjs`) now writes a `degeneracy:{isDegenerate, mode, ...}` field into NN-EVAL.json when the classifier is a constant-vote collapse (AUROC ~0.5 is a tie-break artifact, NOT a near-miss). This change makes the two consumer hooks SURFACE that:
- `classifyGnn` (nn-graph-health-inject.mjs) additively reads `r.degeneracy` → returns `degenerate`/`degenerateMode`.
- `formatDigest` (same file): new `else if (g.degenerate)` branch emits a DEGENERATE line.
- `legStateNnGraph` (psn-leg-state-inject.mjs): in the below-gate branch, if `cls.degenerate` returns status `DEGENERATE` instead of `BELOW-GATE`.

VERIFY:
1. Additive/back-compat: a report WITHOUT a degeneracy field (legacy/deferred) must yield degenerate=false and unchanged behavior. Confirm classifyGnn's read is null-safe (`r.degeneracy && typeof === object`).
2. Branch ordering in formatDigest: dormant > degenerate > below-gate — is a degenerate report ever ALSO dormant (would the dormant branch wrongly win)? (A degenerate report is graded ⇒ not dormant — confirm.)
3. legStateNnGraph: the DEGENERATE return only triggers when auroc < gate AND cls.degenerate. A healthy (auroc≥gate) degenerate-flagged report can't exist (degenerate ⇒ auroc 0.5), but confirm no path mislabels.
4. Test integrity: concrete assertions; the new anti-drift whitelist now includes "DEGENERATE" — is that the right fix (new valid status) vs a weakening?
5. No removed/renamed fields on classifyGnn's return (other consumers read dormant/healthy/auroc/brier/poolSize/reason).

Report P0/P1/P2. End with PASS or FAIL.

### Assistant | 2026-06-03T13:27:31.201Z

I'll review this change. Let me start by looking at the diff and reading the touched functions end-to-end.

### Assistant | 2026-06-03T13:27:33.976Z

[tool_use: Bash]

### User | 2026-06-03T13:27:38.040Z

[tool_result] diff --git a/.claude/hooks/nn-graph-health-inject.mjs b/.claude/hooks/nn-graph-health-inject.mjs
index 8c21679e6d..4065432d8b 100644
--- a/.claude/hooks/nn-graph-health-inject.mjs
+++ b/.claude/hooks/nn-graph-health-inject.mjs
@@ -161,6 +161,12 @@ export function classifyGnn(evalReport) {
   const aurocPass = auroc !== null && auroc >= PROMOTE_AUROC_MIN;
   const brierPass = brier !== null && brie
... [+8099 chars truncated]

### Assistant | 2026-06-03T13:27:41.068Z

Now let me read the full functions end-to-end in both source files to verify the changes in context.

### Assistant | 2026-06-03T13:27:41.976Z

[tool_use: Read]

### Assistant | 2026-06-03T13:27:42.752Z

[tool_use: Read]

### User | 2026-06-03T13:27:46.972Z

[tool_result] 120	export function classifyGnn(evalReport) {
121	  const r = evalReport && typeof evalReport === "object" ? evalReport : {};
122	  const meta = r.checkpointMeta && typeof r.checkpointMeta === "object" ? r.checkpointMeta : {};
123	  const metrics = r.metrics && typeof r.metrics === "object" ? r.metrics : {};
124	  const deferred = r.deferred === true;
125	  // `poolSize` is DEFERRED-shape telemetr
... [+6648 chars truncated]

### User | 2026-06-03T13:27:48.826Z

[tool_result] 180	  const unwired = Number(match[1]);
181	  if (!Number.isFinite(unwired)) return null;
182	  if (unwired > threshold) {
183	    return { leg: "Engines (#7)", status: "UNWIRED-DRIFT", detail: `${unwired} unwired engines (>${threshold} threshold) — run \`/wire-unwired\` or \`/dispatcher-coverage\`` };
184	  }
185	  return null;
186	}
187	
188	/**
189	 * NN/GNN leg health. `statResult` is {mtimeMs
... [+4706 chars truncated]

### Assistant | 2026-06-03T13:27:52.548Z

Now let me verify the producer side — confirm the `degeneracy` field shape the eval actually writes, so the hook reads match the real schema.

### Assistant | 2026-06-03T13:27:54.015Z

[tool_use: Bash]

### User | 2026-06-03T13:27:57.305Z

[tool_result] 218: *     (`isDegenerate` keys off it).
222: *     `isDegenerate`.
231: * sample). So `isDegenerate:false` means "not a CONSTANT-vote artifact", NOT
240: * @returns {{isDegenerate:boolean, mode:string, distinctConfidences:number,
248:    isDegenerate: false, mode: "none",
253:    return { ...base, mode: "insufficient-holdout", distinctConfidences: s.length,
254:      detail: "fewer than 2 finite-
... [+727 chars truncated]

### Assistant | 2026-06-03T13:28:01.356Z

The producer's schema matches the hook's read exactly: `degeneracy: { isDegenerate, mode, distinctConfidences, ... }`. Let me verify the `mode` values the producer can emit, to confirm the hook's `degenerateMode` rendering is robust.

### Assistant | 2026-06-03T13:28:02.148Z

[tool_use: Read]

### User | 2026-06-03T13:28:04.861Z

[tool_result] 244	export function detectDegeneracy(scores, predicted) {
245	  const s = Array.isArray(scores) ? scores.filter((x) => Number.isFinite(x)) : [];
246	  const p = Array.isArray(predicted) ? predicted : [];
247	  const base = {
248	    isDegenerate: false, mode: "none",
249	    distinctConfidences: 0, distinctPredictions: 0,
250	    dominantClass: null, dominantShare: null, detail: "",
251	  };
252	 
... [+2095 chars truncated]

### Assistant | 2026-06-03T13:28:10.828Z

Key observation: `isDegenerate = constantConfidence` only. So `mode` can be `"constant-vote"` OR `"constant-confidence"` when degenerate is true. Note that `mode: "single-class"` has `isDegenerate: false`, and `mode: "insufficient-holdout"` has `isDegenerate: false`. The hook reads `degenerateMode` generically from `degen.mode`, and falls back to `"constant-vote"` only when mode is missing — that handles `constant-confidence` correctly (renders the real mode). Good.

Now let me run both test files to confirm they pass.

### Assistant | 2026-06-03T13:28:11.710Z

[tool_use: Bash]

### User | 2026-06-03T13:28:14.802Z

[tool_result]     # Subtest: knob UNSET → output never contains the coverage gauge header
    ok 1 - knob UNSET → output never contains the coverage gauge header
      ---
      duration_ms: 63.1709
      ...
    # Subtest: knob=1 → output contains the always-on N/11 coverage gauge
    ok 2 - knob=1 → output contains the always-on N/11 coverage gauge
      ---
      duration_ms: 70.4948
      ...
    # Subtest:
... [+449 chars truncated]

### Assistant | 2026-06-03T13:28:20.622Z

All 92 tests pass (40 + 52 across the two files). Let me verify the one subtle concern: whether a degenerate report could ever ALSO be flagged `dormant` in `formatDigest`, and whether the `usingNested && !cls.healthy` Brier branch could ever pre-empt the DEGENERATE return in `legStateNnGraph`. Let me trace the exact ordering by checking the `EVAL_GRADED_BELOW` fixture and the dormant/graded interplay.

### Assistant | 2026-06-03T13:28:21.292Z

[tool_use: Read]

### User | 2026-06-03T13:28:24.522Z

[tool_result] 40	  },
41	});
42	
43	// Fixture: GNN live but below the AUROC gate → not healthy, not dormant.
44	const EVAL_BELOW_GATE = Object.freeze({
45	  deferred: false,
46	  checkpointPresent: true,
47	  poolSize: 800,
48	  checkpointMeta: { auroc: 0.61, brierCalibrated: 0.18 },
49	});
50	
51	// Fixture: the GRADED report shape (runAssessment's scored path, U-NN-REFPOOL-
52	// REEVAL). NO checkpointMeta /
... [+1758 chars truncated]

### Assistant | 2026-06-03T13:28:53.730Z

I have everything I need to trace each verification point rigorously. Let me confirm the two reasoning concerns by walking the data through the code.

**Verification point 2 (dormant > degenerate ordering in formatDigest):** The `EVAL_GRADED_DEGENERATE` fixture has `metrics.auroc = 0.5` (finite) and `deferred: false`, so `graded = true`. `checkpointPresent = (r.checkpointPresent === true) || graded = true`. Therefore `dormant = deferred || !checkpointPresent = false || false = false`. The dormant branch cannot win. The degenerate branch (line 211 `else if (g.degenerate)`) is correctly reachable. Confirmed: a degenerate report is graded ⇒ never dormant.

**Verification point 3 (legStateNnGraph no mislabel):** With `metrics.auroc = 0.5`, `cls.auroc = 0.5`, `usingNested = true`, `auroc = 0.5`. Flow: not deferred → skip DEFERRED; `auroc !== null` → skip UNGRADED; `0.5 < 0.78` true → enters the gate-miss block → `cls.degenerate` true → returns DEGENERATE. The Brier branch at line 241 is downstream of the `auroc < gate` block and unreachable for a degenerate (always sub-gate AUROC). A healthy degenerate-flagged report is logically impossible since `degenerate ⇒ constantConfidence ⇒ AUROC ~0.5 < gate`; even if such a contradictory report existed, it would skip DEGENERATE (auroc≥gate) and fall to the Brier/null check — never mislabeled as healthy. Fail-closed.

Let me confirm there are no OTHER consumers of `classifyGnn`'s return that could be affected by the additive fields, and that no field was removed/renamed.

### Assistant | 2026-06-03T13:28:53.733Z

[tool_use: Bash]

### User | 2026-06-03T13:33:30.005Z

[tool_result] H:/prism/.claude/hooks/nn-graph-health-inject.mjs:106: * nn-graph-eval's runAssessment emits TWO shapes; classifyGnn is the single
H:/prism/.claude/hooks/nn-graph-health-inject.mjs:129:  // `classifyGnn(graded).poolSize` and reports a false "pool 0".
H:/prism/.claude/hooks/nn-graph-health-inject.mjs:195:  const g = classifyGnn(evalReport);
H:/prism/.claude/hooks/psn-leg-state-inject.mjs:54:// Dele
... [+836 chars truncated]

### Assistant | 2026-06-03T13:34:03.247Z

Only two consumers: `formatDigest` (same file) and `legStateNnGraph` (psn-leg-state). Both are updated in this change. The return object adds `degenerate` + `degenerateMode` and removes/renames nothing — `dormant`, `healthy`, `auroc`, `brier`, `poolSize`, `graded`, `verdict`, `reason`, `trainedAt` are all preserved. Confirmed point 5.

I have completed a thorough end-to-end review. Here is my report.

---

## Code Quality Analysis Report — U-NN-DEGENERACY-HOOK-SURFACE

### Summary
- Files Analyzed: 4 (2 source hooks, 2 test files)
- Change shape: surgical, additive, fully back-compat
- Tests: 92/92 pass (40 nn-graph-health + 52 psn-leg-state)
- Issues Found: 0 P0, 0 P1, 2 P2 (non-blocking observations)

### Verification against the 5 required checks

**1. Additive / back-compat — PASS.** `classifyGnn`'s read is null-safe: `const degen = r.degeneracy && typeof r.degeneracy === "object" ? r.degeneracy : null;` then `degenerate = degen ? degen.isDegenerate === true : false`. A legacy/deferred report with no `degeneracy` field yields `degen=null → degenerate=false, degenerateMode=""`. The strict `=== true` guards against truthy-but-non-boolean values. The two back-compat tests (`EVAL_GRADED_BELOW`, `EVAL_DORMANT` → `degenerate=false`) confirm unchanged behavior. The added return fields break no existing path because both downstream consumers were located and both are updated in this change.

**2. Branch ordering dormant > degenerate > below-gate — PASS.** Traced concretely: a degenerate report carries `metrics.auroc=0.5` (finite) + `deferred:false`, so `graded=true → checkpointPresent=true → dormant=false`. The `if (g.dormant)` branch cannot win; control reaches `else if (g.degenerate)`. A degenerate report being graded ⇒ never dormant is confirmed by construction, not just by the fixture. The test `formatDigest: GRADED degenerate → DEGENERATE line` asserts both `includes("DEGENERATE")` and `!includes("below promotion gate")`.

**3. legStateNnGraph no mislabel — PASS.**
... [+4072 chars truncated]
