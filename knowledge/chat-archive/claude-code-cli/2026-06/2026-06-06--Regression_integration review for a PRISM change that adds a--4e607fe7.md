---
type: "chat-session"
source: "claude-code-cli"
session_id: "4e607fe7-e3af-475c-8535-1d10b459c62c"
title: "Regression/integration review for a PRISM change that adds a `selective` field t"
date: "2026-06-06"
first_ts: "2026-06-06T04:21:18.207Z"
last_ts: "2026-06-06T04:31:17.330Z"
cwd: "H:\\prism"
messages: 68
user_msgs: 27
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-abcc5596a9c2c8165.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Regression/integration review for a PRISM change that adds a `selective` field t

> **claude-code-cli** | 2026-06-06 | 68 msgs (27 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-abcc5596a9c2c8165.jsonl`

## Transcript

### User | 2026-06-06T04:21:18.207Z

Regression/integration review for a PRISM change that adds a `selective` field to the GNN tier-5 eval output (NN-EVAL.json) and to the runAssessment/assessHoldout return shapes.

The change is in H:/prism/scripts/lib/nn-graph-eval.mjs: assessHoldout now returns `selective:{curve,deployPoint}`; runAssessment now returns `selective:{curve,deployPoint,deployGrade}`; renderReport renders a new "## Selective deployment" section. The on-disk H:/prism/state/shared/nn-graph/NN-EVAL.json now has a top-level `selective` key alongside the existing `metrics`, `grade`, `degeneracy`, `buckets`, `samples`.

YOUR JOB: find anything this BREAKS. The NN-EVAL.json and the runAssessment return are read by fleet-wide consumers. Specifically check:
1. Does adding the `selective` key break any READER of NN-EVAL.json? Find them: grep H:/prism for readers of NN-EVAL.json, `classifyGnn`, `nn-graph-health`, `psn-leg-state`, `nn-graph-retrain-lifecycle`, `nn-feedback-to-memory`. Confirm they read specific fields (metrics.auroc, checkpointMeta, grade) and that an ADDITIVE field cannot break them. Cite the files.
2. Does the existing `grade` (full-holdout) still compute and report IDENTICALLY (unchanged)? Confirm metrics auroc/macroF1/brier are untouched.
3. Test integrity: do the new tests in nn-graph-eval.test.mjs and nn-graph-calibration-analysis.test.mjs assert real reference values (not toBeDefined stubs)? Do they round-trip the wired path (assessHoldout→runAssessment exposing selective)? Run them mentally / confirm they'd fail on a stubbed implementation.
4. Convention conformance: matches the existing node:test style, export style, JSDoc density of nn-graph-eval.mjs.
5. Any silent-failure or schema-version concern (does NN-EVAL.json need a schemaVersion bump)?

Report P0/P1/P2 with file:line evidence. Grade PASS/FAIL.

### Assistant | 2026-06-06T04:21:30.856Z

I'll review this change. Let me start by reading the modified file and finding all consumers of NN-EVAL.json.

### Assistant | 2026-06-06T04:21:31.362Z

[tool_use: Read]

### Assistant | 2026-06-06T04:21:32.686Z

[tool_use: Grep]

### Assistant | 2026-06-06T04:21:33.169Z

[tool_use: Grep]

### User | 2026-06-06T04:21:36.437Z

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
... [+43771 chars truncated]

### User | 2026-06-06T04:21:57.132Z

[tool_result] Found 17 files
knowledge\memories\reference\reference_u_nn_graph_health_2026_05_21.md
knowledge\memories\reference\reference_nn_leg_schema_read_fix_2026_06_02.md
knowledge\memories\reference\reference_nn_graded_schema_read_fix_2026_06_03.md
CLAUDE.md
state\shared\specs\FLEET-1MONTH-TRAJECTORY-2026-06-03.html
state\shared\specs\FLEET-1MONTH-TRAJECTORY-2026-06-03.md
state\shared\specs\BLACKWELL-SYNC
... [+633 chars truncated]

### User | 2026-06-06T04:21:58.605Z

[tool_result] Found 57 files
knowledge\memories\reference\reference_u_rag_4_synergy_wiring_2026_05_22.md
knowledge\memories\reference\reference_u_nn_graph_health_2026_05_21.md
knowledge\memories\reference\reference_u_nng_pipeline_stratified_wire_2026_05_17.md
knowledge\memories\reference\reference_subagent_psn_substrate_upgrade_2026_05_24.md
knowledge\memories\reference\reference_nn_leg_schema_read_fix_2026_06_
... [+3077 chars truncated]

### Assistant | 2026-06-06T04:22:01.691Z

I have the full eval file. Now let me read the key consumers that read NN-EVAL.json and use classifyGnn, to verify the additive `selective` field can't break them.

### Assistant | 2026-06-06T04:22:02.145Z

[tool_use: Read]

### Assistant | 2026-06-06T04:22:02.608Z

[tool_use: Read]

### User | 2026-06-06T04:22:05.192Z

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
... [+13546 chars truncated]

### User | 2026-06-06T04:22:05.827Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory)
3	/**
4	 * psn-leg-state-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
7	 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
8	 * one of the substrates it should consult — a compact per-PSN-leg health
9	 * digest that surfaces ONLY legs in a concer
... [+28303 chars truncated]

### Assistant | 2026-06-06T04:22:08.923Z

Both key consumers route through `classifyGnn`, which reads only specific fields. Let me examine the remaining consumers (retrain-lifecycle, feedback-to-memory) and the two test files.

### Assistant | 2026-06-06T04:22:11.724Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:22:13.173Z

[tool_use: Grep]

### User | 2026-06-06T04:22:16.178Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect
---grep for retrain+feedback files---
/usr/bin/bash: line 1: $null: ambiguous redirect

### User | 2026-06-06T04:22:20.198Z

[tool_result] Found 14 files
scripts\lib\nn-graph-eval.test.mjs
scripts\nn-graph-calibration-analysis.mjs
scripts\lib\nn-graph-eval.mjs
scripts\ai-training-galaxy-audit.mjs
scripts\ai-training-awareness.mjs
scripts\nn-eval-refresh.test.mjs
scripts\nn-eval-refresh.mjs
scripts\lib\graphsage-train-pipeline.mjs
scripts\generate-psn-health-features.mjs
scripts\agents\spawned-agent-context-lib.mjs
scripts\lib\graphsa
... [+154 chars truncated]

### Assistant | 2026-06-06T04:22:22.855Z

Let me examine the consumers that read NN-EVAL.json or runAssessment's return, plus the refresh script and retrain lifecycle.

### Assistant | 2026-06-06T04:22:24.743Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:22:26.165Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:22:28.149Z

[tool_use: Bash]

### User | 2026-06-06T04:22:29.419Z

[tool_result] === nn-eval-refresh.mjs (reads/writes NN-EVAL?) ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

scripts/nn-eval-refresh.mjs:147:fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));
scripts/nn-eval-refresh.mjs:161:console.log(JSON.string
... [+24 chars truncated]

### User | 2026-06-06T04:22:35.207Z

[tool_result] === retrain-lifecycle NN-EVAL/runAssessment usage ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
14 matches in 7 files:

301:0:checkpointPath });
398:0:a.metrics || null,
399:0:a.grade
400:0:a.grade.pass, verdict: a.grade.verdict, failures: a.grade.failures || [] }
715:
... [+910 chars truncated]

### User | 2026-06-06T04:22:41.066Z

[tool_result] === generate-psn-health-features (reads NN-EVAL) ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
7 matches in 6 files:

105:0:"red", signal: "AUROC UNGRADED (eval deferred)" };
106:0:"green", signal: `AUROC ${i.auroc.toFixed(3)}, Brier ${(i.brier ?? 0).toFixed...
108:0:"
... [+970 chars truncated]

### Assistant | 2026-06-06T04:22:43.682Z

Let me look at the retrain-lifecycle compaction (line 389-400, the part that consumes runAssessment's return shape) and the generate-psn-health-features reader in detail, since these touch the runAssessment shape that now carries `selective`.

### Assistant | 2026-06-06T04:22:44.641Z

[tool_use: Read]

### Assistant | 2026-06-06T04:22:45.610Z

[tool_use: Read]

### Assistant | 2026-06-06T04:22:46.232Z

[tool_use: Read]

### User | 2026-06-06T04:22:48.398Z

[tool_result] 385	/* ------------------------------------------------------------------ *
386	 * Imperative shell.
387	 * ------------------------------------------------------------------ */
388	
389	/** Compact a runAssessment() result for the ledger (drops bulky samples). */
390	function summarizeAssessment(a) {
391	  if (!a || typeof a !== "object") return { deferred: true, reason: "no assessment" };
392	  
... [+951 chars truncated]

### User | 2026-06-06T04:22:49.171Z

[tool_result] 95	    case "algorithms": {
96	      if (i.count === 0) return { status: "red", signal: "no algorithms registered" };
97	      return { status: "green", signal: `${i.count} algorithms` };
98	    }
99	    case "formulas": {
100	      if (!i.constantsFileExists) return { status: "red", signal: "constants.ts MISSING" };
101	      if (i.inlinedViolations > 0) return { status: "red", signal: `${i.inlin
... [+1619 chars truncated]

### User | 2026-06-06T04:22:50.457Z

[tool_result] 34	}
35	
36	// Pure: classify the deploy gate from an NN-EVAL.json object.
37	export function gateVerdict(evalJson) {
38	  if (!evalJson) return { verdict: "UNKNOWN", detail: "no NN-EVAL.json" };
39	  const m = evalJson.checkpointMeta || {};
40	  const auroc = typeof m.auroc === "number" ? m.auroc : null;
41	  const brier = typeof m.brierCalibrated === "number" ? m.brierCalibrated
42	    : (typeof
... [+1045 chars truncated]

### Assistant | 2026-06-06T04:22:52.912Z

All consumers confirmed to read specific fields, never enumerate keys. Now let me read the two test files to verify they assert real reference values and round-trip the wired path.

### Assistant | 2026-06-06T04:22:53.246Z

[tool_use: Read]

### User | 2026-06-06T04:22:57.706Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.test.mjs' was already read 76s ago in this session and is unchanged (mtime 1780719320501). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-06T04:22:59.855Z

The read-once guard claims I read it, but it isn't in my context (I read the eval source, not the test). Let me bypass the cache.

### Assistant | 2026-06-06T04:23:01.936Z

[tool_use: Bash]

### User | 2026-06-06T04:23:08.909Z

[tool_result] === nn-graph-eval.test.mjs : selective-related tests ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
230 matches in 21 files:

257:0:10, seed: 1 }).poolSize, 2);
276:0:[], edges: [] }, {}).holdout.length, 0);
277:0:[makeGhost("g", "E", "prism_cam", 0.9)] }, {}).holdout.l
... [+2630 chars truncated]

### Assistant | 2026-06-06T04:23:11.092Z

Let me read the actual selective-test section of the eval test file (lines ~620-690) and the calibration-analysis test.

### Assistant | 2026-06-06T04:23:12.035Z

[tool_use: Read]

### User | 2026-06-06T04:23:16.904Z

[tool_result] 600	 * top is confidently-correct and the bottom is uncertain — the abstaining-tier
601	 * pattern the curve must surface.
602	 */
603	function makeSamples() {
604	  return [
605	    { engine: "A", predicted: "prism_cam", truth: "prism_cam", confidence: 0.9, correct: true },
606	    { engine: "B", predicted: "prism_calc", truth: "prism_calc", confidence: 0.7, correct: true },
607	    { engine: "C"
... [+6079 chars truncated]

### Assistant | 2026-06-06T04:23:20.787Z

These tests assert real reference values (Brier 0.05 from hand-computed `((0.9-1)²+(0.7-1)²)/2`, deploy point τ=0.4 with macro-F1 0.733 derivation). The end-to-end test at line 692 round-trips assessHoldout→runAssessment. Now let me check the calibration-analysis test and confirm the renderReport selective section is tested.

### Assistant | 2026-06-06T04:23:22.285Z

[tool_use: Bash]

### User | 2026-06-06T04:23:27.972Z

[tool_result] === calibration-analysis test: imports + selective assertions ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
29 matches in 3 files:

10:0:assert/strict";
9:0:test";
scripts/nn-graph-calibration-analysis.test.mjs:12:import {
scripts/nn-graph-calibration-analysis.test.mjs
... [+2589 chars truncated]

### Assistant | 2026-06-06T04:23:31.493Z

The calibration-analysis test asserts real reference values (`out.deployPoint.found===true`, `out.deployPoint.brier<=0.15`, Brier-decomposition algebraic invariants). Let me look at the calibration-analysis source to understand whether it consumes the new `selective` shape from the eval module (potential coupling), and confirm what `deployPoint` it tests.

### Assistant | 2026-06-06T04:23:33.879Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:23:36.969Z

[tool_use: Read]

### User | 2026-06-06T04:23:51.409Z

[tool_result] === calibration-analysis.mjs : how it gets deployPoint (own impl vs imports eval) ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
16 matches in 9 files:

199:0:GATE, macroF1: gates.macroF1 ?? 0.55 });
200:0:GATE, macroF1: gates.macroF1 ?? 0.55 });
225:0:rc,
227:0:buildVe
... [+930 chars truncated]

### User | 2026-06-06T04:23:56.793Z

[tool_result] 125	
126	// --- analyzeCalibration (end-to-end) ---------------------------------------
127	
128	test("analyzeCalibration — reproduces the live finding on the canonical 62-sample shape", () => {
129	  // A miniature but faithful holdout: a confidently-correct head + an uncertain tail.
130	  const samples = [
131	    ...Array.from({ length: 10 }, (_, i) => ({ predicted: "prism_cam", truth: "prism_c
... [+1202 chars truncated]

### Assistant | 2026-06-06T04:24:00.945Z

This confirms the calibration-analysis tool IMPORTS `riskCoverageCurve` and `selectiveDeployPoint` from the eval module (single source of truth, no duplicated impl — R7/R8 compliant). The test feeds a faithful 24-sample shape and asserts the deploy point is found with Brier ≤ 0.15. Now let me verify the two remaining concerns: whether NN-EVAL.json carries a schemaVersion anywhere, and run the actual tests to confirm green.

### Assistant | 2026-06-06T04:24:04.241Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:24:04.812Z

[tool_use: Bash]

### User | 2026-06-06T04:24:11.510Z

[tool_result] === schemaVersion in NN-EVAL.json or eval module? ===
exit=1
=== current on-disk NN-EVAL.json top-level keys ===
keys: deferred, assessedAt, holdoutN, embeddingMode, checkpointPresent, holdoutSplit, heldClasses, gates, metrics, degeneracy, buckets, grade, selective, samples
has selective: true
deferred: false

### User | 2026-06-06T04:24:17.447Z

[tool_result] === RUN eval tests ===
  ...
# Subtest: main — returns 0 for --help and 2 for an unknown argument
ok 73 - main — returns 0 for --help and 2 for an unknown argument
  ---
  duration_ms: 0.5655
  ...
1..73
# tests 73
# suites 0
# pass 73
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 142.3011

### Assistant | 2026-06-06T04:24:23.644Z

73/73 pass. The live NN-EVAL.json already carries `selective` and is `deferred:false` (graded). No `schemaVersion` exists anywhere in the NN-EVAL.json schema — it never had one. Let me run the calibration-analysis test and confirm the live graded report still reads correctly through both fleet consumers.

### Assistant | 2026-06-06T04:24:24.588Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:24:27.513Z

[tool_use: Bash]

### User | 2026-06-06T04:24:33.827Z

[tool_result] === RUN calibration-analysis tests ===
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 123.2558

### User | 2026-06-06T04:24:39.273Z

[tool_result] === consumers reading the LIVE graded NN-EVAL.json (with selective present) ===
classifyGnn: {"graded":true,"healthy":false,"dormant":false,"auroc":0.8084,"brier":0.179,"verdict":"shipped-research-only","degenerate":false}

### Assistant | 2026-06-06T04:24:56.386Z

Both test suites green (73 + 12). `classifyGnn` reads the live graded report correctly — `auroc:0.8084, brier:0.179` from `metrics.*`, completely unaffected by the additive `selective` key. Let me do a final check: confirm the `grade` (full-holdout) computation is byte-identical to pre-change (untouched path), and check git diff to confirm scope of the change.

### Assistant | 2026-06-06T04:24:59.738Z

[tool_use: Bash]

### User | 2026-06-06T04:30:05.581Z

[tool_result] Command running in background with ID: b8c3999di. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e607fe7-e3af-475c-8535-1d10b459c62c\tasks\b8c3999di.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T04:30:10.100Z

[tool_use: Bash]

### User | 2026-06-06T04:30:19.847Z

[tool_result] + * the harness's OWN computeBrier / computeMacroF1 (one metric source, so the
+    const brier = computeBrier(probs, labels);
+    const macroF1 = computeMacroF1(predicted, truth).macroF1;
+ * clear. This NEVER replaces the full-holdout `gradeMetrics` — it is an ADDITIONAL
+  const aurocPass = Number.isFinite(m.auroc) && m.auroc >= gates.auroc;
+  if (!aurocPass) failures.push(`AUROC ${Number.isF
... [+301 chars truncated]

### Assistant | 2026-06-06T04:30:24.794Z

The diff confirms: all the `computeAUROC/computeMacroF1/computeBrier/gradeMetrics` references in the diff are in the NEW selective functions (they REUSE the existing metric functions) — the only `m.auroc` references are inside the new `gradeSelectiveDeploy`. The core `gradeMetrics` body and the metric functions themselves are not modified (192 insertions, only 5 deletions). Let me confirm what those 5 deletions were.

### Assistant | 2026-06-06T04:30:25.895Z

[tool_use: Bash]

### User | 2026-06-06T04:30:32.935Z

[tool_result] -  const cap = Math.floor(pool.length / 2); // keep at least half as references
-  const k = Math.min(requested, cap);
-  const holdout = k > 0 ? seededShuffle(pool, seed).slice(0, k) : [];
-  return { holdout, poolSize: pool.length, requested };
-  const { holdout, poolSize } = buildHoldout(graph, opts);

### Assistant | 2026-06-06T04:31:17.330Z

These 5 deletions are pre-existing changes from the broader uncommitted working tree (stratified-holdout work in `buildHoldout` and the `assessHoldout` destructuring to add `stratified, heldClasses`), not from the `selective` addition itself. They are unrelated to the additive `selective` field and were already covered by passing tests. The `gradeMetrics` body, `metrics` object construction (auroc/macroF1/brier via the unchanged metric functions), and the `grade = gradeMetrics(scored.metrics)` call are all untouched.

I have everything I need. Here is my review.

---

## Code Review: GNN tier-5 `selective` field addition to NN-EVAL.json — **PASS**

### Scope verified
`H:/prism/scripts/lib/nn-graph-eval.mjs` (+192/−5): adds 4 new exported pure functions (`riskCoverageCurve`, `selectiveDeployPoint`, `gradeSelectiveDeploy`, plus `SELECTIVE_THRESHOLDS` const), an additive `selective:{curve,deployPoint}` key in `assessHoldout`'s return (line 539), `selective:{curve,deployPoint,deployGrade}` in `runAssessment`'s return (line 635), and a "## Selective deployment" `renderReport` block (lines 724-757). The 5 deletions are unrelated pre-existing stratified-holdout working-tree changes, not part of this feature.

---

### 1. Does the additive `selective` key break any NN-EVAL.json / runAssessment reader? — **NO. P0-clear.**

Every consumer reads named fields; none enumerates keys or validates against a closed schema. An additive sibling key is inert to all of them:

- **`H:/prism/.claude/hooks/nn-graph-health-inject.mjs:120-184` (`classifyGnn`)** — the canonical reader. Pulls only `r.checkpointMeta`, `r.metrics`, `r.deferred`, `r.poolSize`, `r.checkpointPresent`, `r.degeneracy`, `r.grade.verdict`, `r.reason`. Never touches `selective`. **Verified live**: against the on-disk graded NN-EVAL.json (which already carries `selective`), `classifyGnn` returns `{graded:true, auroc:0.8084, brier:0.179, verdict:"shipped-research-only"}` — correct, unaffected.
- **`H:/prism/.claude/hooks/
... [+6389 chars truncated]
