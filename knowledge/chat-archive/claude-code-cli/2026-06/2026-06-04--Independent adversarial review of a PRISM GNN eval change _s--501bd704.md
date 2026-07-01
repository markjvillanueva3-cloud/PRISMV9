---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Independent adversarial review of a PRISM GNN eval change (slot:india). Files: `"
date: "2026-06-04"
first_ts: "2026-06-04T20:37:06.961Z"
last_ts: "2026-06-04T20:45:01.905Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a4035eae2d7c701db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent adversarial review of a PRISM GNN eval change (slot:india). Files: `

> **claude-code-cli** | 2026-06-04 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a4035eae2d7c701db.jsonl`

## Transcript

### User | 2026-06-04T20:37:06.961Z

Independent adversarial review of a PRISM GNN eval change (slot:india). Files: `H:/prism/scripts/lib/nn-graph-eval.mjs` + `.test.mjs`. See `git -C H:/prism diff scripts/lib/nn-graph-eval.mjs scripts/lib/nn-graph-eval.test.mjs`.

The change makes `buildHoldout` use a per-class STRATIFIED split by default (was a flat seeded shuffle). Live result: the headline AUROC went from 0.737 to 0.808 (now passes the 0.78 gate), while macroF1 (0.452→0.439) and accuracy (0.726→0.661) went down.

Weight your review toward what the other reviewer may miss. GRADE PASS/FAIL + P0/P1/P2:
1. **Backward-compat / silent breakage:** does switching the DEFAULT to stratified break any OTHER caller of buildHoldout/assessHoldout/runAssessment (the retrain lifecycle, the PSN-leg health hook, any consumer that read the old flat numbers)? Grep for buildHoldout/runAssessment/assessHoldout callers. Does NN-EVAL.json gain `holdoutSplit` without breaking readers (e.g. classifyGnn / psn-leg-state-inject that parse NN-EVAL.json)?
2. **Determinism + edge cases:** stratify with a 1-class pool (does it equal flat?); a pool where every class is a singleton (empty holdout — is that handled vs an error?); the requested-cap interaction with stratification; seed propagation into the per-class shuffle (is it the SAME seed for every class — could that correlate the splits?).
3. **Is the macroF1 still honest under stratification?** computeMacroF1 averages over union(predicted,truth). With stratified holdout, does any class get unfairly counted/excluded? Should singleton classes that are still PREDICTED be in the denominator?
4. **The honesty framing for the commit:** AUROC went up — is it legit to ship this as "fair re-measurement" or is there a hidden way it inflates? Test integrity: do the new tests fail if stratification breaks?

Report PASS/FAIL + findings with file:line. Be skeptical.

### Assistant | 2026-06-04T20:37:25.156Z

I'll perform an independent adversarial review of this GNN eval change. Let me start by examining the actual diff and the files in question.

### Assistant | 2026-06-04T20:37:25.988Z

[tool_use: Bash]

### User | 2026-06-04T20:38:27.742Z

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

### Assistant | 2026-06-04T20:38:33.311Z

Now let me read the full eval file to understand the context around buildHoldout, computeMacroF1, and the callers.

### Assistant | 2026-06-04T20:38:33.312Z

[tool_use: Read]

### User | 2026-06-04T20:38:43.839Z

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
... [+34936 chars truncated]

### Assistant | 2026-06-04T20:38:50.634Z

Now let me investigate the key concerns. First, let me find all callers of buildHoldout/runAssessment/assessHoldout and readers of NN-EVAL.json.

### Assistant | 2026-06-04T20:38:51.385Z

[tool_use: Grep]

### Assistant | 2026-06-04T20:38:52.518Z

[tool_use: Grep]

### User | 2026-06-04T20:39:24.262Z

[tool_result] CLAUDE.md.bak-pre-f2:610:by training) → evaluate the candidate via `runAssessment()` → promote
CLAUDE.md.bak-pre-f2:616:a real-wiring test driving the actual `runAssessment` (the "hermetic fakes don't
CLAUDE.md.bak-2026-05-20T17-53-32:652:by training) → evaluate the candidate via `runAssessment()` → promote
CLAUDE.md.bak-2026-05-20T17-53-32:658:a real-wiring test driving the actual `runAssessment`
... [+2845 chars truncated]

### User | 2026-06-04T20:39:25.677Z

[tool_result] .tmp-git-log.txt:3:97c9286311 [MAIN] [NN-GRAPH-MS1]/U-NNG-PIPELINE-STRATIFIED-WIRE: wire trainer's stratified neg-sampling into pipeline...
.tmp-dirty-201ca088.txt:1762:knowledge/memories/reference/reference_u_nng_pipeline_stratified_wire_2026_05_17.md
.tmp-dirty-201ca088.txt:2086:knowledge/wiki/architecture/actions/aireasoning/xproc-replay-bridge-sample-stratified.md
CLAUDE.html:303:[Omitted long
... [+17016 chars truncated]

### Assistant | 2026-06-04T20:39:32.950Z

The two key consumers of NN-EVAL.json are the hooks `psn-leg-state-inject.mjs` and `nn-graph-health-inject.mjs`, both routing through `classifyGnn`. Let me read those readers carefully to assess backward-compat — this is exactly the regression class that bit India twice already (the schema-read-blindness bugs in the recent regressions log).

### Assistant | 2026-06-04T20:39:33.395Z

[tool_use: Read]

### User | 2026-06-04T20:39:43.149Z

[tool_result] 80	 * Pure: load + validate NN-EVAL.json. Returns { evalReport, ageMs } or null.
81	 * Hostile-payload guards: size cap + JSON parse + shape check (must be a
82	 * non-null object; checkpointMeta optional — a deferred eval may omit it).
83	 */
84	export function loadEval(evalPath, nowMs = Date.now()) {
85	  try {
86	    if (!existsSync(evalPath)) return null;
87	    const st = statSync(evalPath);

... [+8996 chars truncated]

### Assistant | 2026-06-04T20:39:53.931Z

`classifyGnn` reads only `metrics.auroc/brier`, `checkpointMeta.auroc`, `poolSize`, `deferred`, `checkpointPresent`, `degeneracy`, `grade.verdict`, `reason`, `trainedAt`. The new `holdoutSplit`/`heldClasses`/`stratified` fields are purely additive and ignored by this reader — no break. Let me confirm the psn-leg-state-inject reader delegates the same way and check the SVI refresh reader.

### Assistant | 2026-06-04T20:39:54.425Z

[tool_use: Read]

### Assistant | 2026-06-04T20:39:54.958Z

[tool_use: Read]

### User | 2026-06-04T20:40:08.301Z

[tool_result] 185	  return null;
186	}
187	
188	/**
189	 * NN/GNN leg health. `statResult` is {mtimeMs} for NN-EVAL.json;
190	 * `evalDoc` is the parsed JSON content (or null when missing/corrupt).
191	 */
192	export function legStateNnGraph(now, statResult, evalDoc) {
193	  if (!statResult || !evalDoc) {
194	    return { leg: "NN/GNN (#10)", status: "MISSING", detail: "NN-EVAL.json not found — tier-5 GNN dorma
... [+3378 chars truncated]

### User | 2026-06-04T20:40:08.827Z

[tool_result] 95	    const stat = fs.statSync(p);
96	    return (Date.now() - stat.mtimeMs) < maxAgeMs;
97	  } catch { return false; }
98	}
99	
100	function readPsnLegHealth() {
101	  // 11 legs per feedback_psn_definition. Use partial sources where available;
102	  // floor unmeasured legs at 0.5 (uncertainty default, NOT 1.0 vanity).
103	  const nn = safeReadJson(path.join(STATE_DIR, "nn-graph/NN-EVAL.json"),
... [+1568 chars truncated]

### Assistant | 2026-06-04T20:40:19.192Z

I found a backward-compat issue worth noting. `svi-enhanced-refresh.mjs:104` reads `nn.auroc` (top-level) — but that's a **pre-existing** read bug (top-level `auroc` was never present in the GRADED shape either; the graded shape nests it under `metrics.auroc`). This change neither introduces nor worsens it — but it's relevant: this change does NOT add a top-level `auroc`, so the SVI reader stays at its fallback `0.12`. Not a regression from this diff. Let me note it as P2 context but confirm it's not caused here.

Now let me verify the seededShuffle determinism concern — the same seed is used for every per-class shuffle. Let me look at mulberry32 and reason about correlation.

### Assistant | 2026-06-04T20:40:20.476Z

[tool_use: Read]

### User | 2026-06-04T20:40:26.360Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-random-walk.mjs — node2vec 2nd-order biased random walks over the
4	 * normalized PRISM system graph. Foundation for U-NNG-NODE2VEC-TOPOLOGY:
5	 * the walk corpus feeds the skip-gram embedder (Node2Vec part 2).
6	 *
7	 * Reference: Grover & Leskovec, "node2vec: Scalable Feature Learning for
8	 * Networks" (KDD 2016). The 2nd-order transition from (prev → cur 
... [+1301 chars truncated]

### Assistant | 2026-06-04T20:40:36.491Z

Now I have what I need on the seed concern. Each per-class shuffle calls `seededShuffle(members, seed)` with the **same** seed — `mulberry32` is reseeded identically per class. This is a real, if mild, concern: the RNG sequence is identical across classes. Let me reason about whether it causes correlated/biased selection.

Let me now run the tests to confirm test integrity, and examine the seededShuffle determinism / correlation issue more concretely. Let me also check how `requested` cap interacts.

### Assistant | 2026-06-04T20:40:42.183Z

[tool_use: Bash]

### User | 2026-06-04T20:41:57.252Z

[tool_result]   ...
# Subtest: renderReport — a failing graded result shows FAIL + the failure list
ok 59 - renderReport — a failing graded result shows FAIL + the failure list
  ---
  duration_ms: 0.2493
  ...
# Subtest: parseArgs — reads every flag
ok 60 - parseArgs — reads every flag
  ---
  duration_ms: 0.1804
  ...
# Subtest: parseArgs — --help sets help; unknown argument throws
ok 61 - parseArgs — --help 
... [+342 chars truncated]

### Assistant | 2026-06-04T20:42:01.168Z

62/62 pass. Now let me verify the critical adversarial concern: does the seed correlation matter, and does the new test actually fail if stratification breaks? Let me probe the seed-correlation issue empirically and check whether `parseArgs — reads every flag` test covers `--flat-holdout`.

### Assistant | 2026-06-04T20:42:07.824Z

[tool_use: Bash]

### User | 2026-06-04T20:43:44.078Z

[tool_result] prism_calc held original-indices: 0,1,4
prism_cam held original-indices: 0,1,4
prism_mill held original-indices: 0,1,4
prism_turning held original-indices: 0,1,4
heldClasses 4 singleton 0 total held 12

### Assistant | 2026-06-04T20:43:56.935Z

This confirms the seed-correlation concern empirically. Because every class is shuffled with the **same** `mulberry32(seed)` sequence, classes of equal size get the **identical** permutation, so the held-out members are the same original positions (0,1,4) in every class. Let me assess whether this actually biases the metric, or is merely cosmetic. The held members are determined by the (arbitrary) graph insertion order, which has no relation to the GNN's prediction quality — so this is **not** a metric-biasing flaw, but it does mean the "randomization" is not independent per class. Let me verify the within-class order is actually decoupled from anything the classifier sees (it shouldn't correlate with prediction correctness).

Let me also check the `requested` cap interaction more carefully — when the cap binds, it re-shuffles the combined holdout, which could **undo** stratification.

### Assistant | 2026-06-04T20:44:02.331Z

[tool_use: Bash]

### User | 2026-06-04T20:45:01.905Z

[tool_result] post-cap holdout size 5 dist {"prism_turning":5}
heldClasses(reported) 3 -- but after cap re-shuffle, classes present: prism_turning
