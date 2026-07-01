---
type: "chat-session"
source: "claude-code-cli"
session_id: "fd2dc2f2-dece-487f-b054-17f8565d8030"
title: "Independent second-pass review. Run `git -C H:/prism diff HEAD .claude/hooks/nn-"
date: "2026-06-03"
first_ts: "2026-06-03T13:27:18.035Z"
last_ts: "2026-06-03T13:31:51.508Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 15
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a55ec2a5b2e088e3c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review. Run `git -C H:/prism diff HEAD .claude/hooks/nn-

> **claude-code-cli** | 2026-06-03 | 44 msgs (15 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fd2dc2f2-dece-487f-b054-17f8565d8030/subagents/agent-a55ec2a5b2e088e3c.jsonl`

## Transcript

### User | 2026-06-03T13:27:18.035Z

Independent second-pass review. Run `git -C H:/prism diff HEAD .claude/hooks/nn-graph-health-inject.mjs .claude/hooks/psn-leg-state-inject.mjs .claude/hooks/nn-graph-health-inject.test.mjs .claude/hooks/psn-leg-state-inject.test.mjs` for the exact changes; read the touched functions. These hooks fire FLEET-WIDE (psn-leg-state on every UserPromptSubmit across 26 slots; nn-graph-health on every SessionStart), so a regression is high blast-radius. Grade PASS/FAIL, flag P0/P1.

The change surfaces a `degeneracy` field (written by the GNN eval into NN-EVAL.json) through `classifyGnn` into both hooks, so a constant-vote-collapsed model reads as `[DEGENERATE]` ("rearchitect") instead of `[BELOW-GATE]` ("tune"). A prior reviewer checked correctness/back-compat; weight YOUR pass toward:
1. **Message accuracy** — does the DEGENERATE wording over-claim? It says "rearchitecting (features/vote), not threshold tuning" — is that a defensible operator instruction given the eval only proves constant-confidence collapse (not necessarily a feature problem)?
2. **Hidden coupling / blast radius** — grep all readers of `classifyGnn` return + all NN-EVAL.json consumers. Does the new `degenerate`/`degenerateMode` field or the new `DEGENERATE` status string break any downstream (SVI, dashboards, other hooks, system-viz roosts)?
3. **Fail-soft** — if `degeneracy.mode` is missing/garbage but `isDegenerate:true`, does the render still produce sane output (no `undefined` in the fleet message)?
4. **Did the test change weaken the anti-drift guard** (adding DEGENERATE to the status whitelist) or correctly extend it?
5. Any P0/P1 the first reviewer might rationalize away.

Report P0/P1/P2. End with PASS or FAIL.

### Assistant | 2026-06-03T13:27:39.727Z

I'll run the diff and read the touched functions to do this independent second-pass review.

### Assistant | 2026-06-03T13:27:41.053Z

[tool_use: Bash]

### User | 2026-06-03T13:27:48.777Z

[tool_result] diff --git a/.claude/hooks/nn-graph-health-inject.mjs b/.claude/hooks/nn-graph-health-inject.mjs
index 8c21679e6d..4065432d8b 100644
--- a/.claude/hooks/nn-graph-health-inject.mjs
+++ b/.claude/hooks/nn-graph-health-inject.mjs
@@ -161,6 +161,12 @@ export function classifyGnn(evalReport) {
   const aurocPass = auroc !== null && auroc >= PROMOTE_AUROC_MIN;
   const brierPass = brier !== null && brie
... [+8099 chars truncated]

### Assistant | 2026-06-03T13:27:53.114Z

Now let me read the full context of both hook files to understand `classifyGnn`, its readers, and the render paths.

### Assistant | 2026-06-03T13:27:53.426Z

[tool_use: Read]

### User | 2026-06-03T13:27:57.479Z

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
... [+13316 chars truncated]

### Assistant | 2026-06-03T13:28:02.185Z

Now let me read the psn-leg-state-inject.mjs to see the full `legStateNnGraph` function and how `cls` (classifyGnn result) is obtained.

### Assistant | 2026-06-03T13:28:02.771Z

[tool_use: Read]

### User | 2026-06-03T13:28:05.064Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\psn-leg-state-inject.mjs' (same offset/limit) was already read 19s ago in this session and is unchanged (mtime 1780492932906). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-03T13:28:09.288Z

The guard says I've already seen it but I haven't read this file in this session. Let me read the relevant section.

### Assistant | 2026-06-03T13:28:10.301Z

[tool_use: Bash]

### User | 2026-06-03T13:28:11.792Z

[tool_result]   }
  // Canonical schema read (single source of truth — nn-graph-health-inject's
  // classifyGnn). The real NN-EVAL.json nests AUROC under `checkpointMeta` and
  // carries `deferred`/`reason`; the prior flat `evalDoc.auroc` read was always
  // undefined → it mis-reported every healthy/deferred report as "UNGRADED ...
  // embeddingSource mismatch" (a fabricated cause). `classifyGnn` reads the 
... [+4065 chars truncated]

### Assistant | 2026-06-03T13:28:18.424Z

Now let me check the critical concern: in `psn-leg-state-inject`, the degenerate fixture in the test uses `metrics: { auroc: 0.5, brier: 0.26 }` (top-level, not nested in `checkpointMeta`). I need to verify that the DEGENERATE branch is reachable given the `usingNested` / `auroc` resolution. Let me check how `cls.degenerate` interacts. The degenerate branch is inside `if (auroc < PROMOTE_AUROC_MIN)`. For the metrics-shape doc, `cls.auroc` comes from `metrics.auroc` = 0.5, so `usingNested=true`, `auroc=0.5 < 0.78`. Good — reachable.

Now let me grep for all consumers of `classifyGnn` and `NN-EVAL.json` to assess blast radius.

### Assistant | 2026-06-03T13:28:18.605Z

[tool_use: Grep]

### User | 2026-06-03T13:28:41.082Z

[tool_result] Found 11 files
knowledge\memories\reference\reference_u_nn_graph_health_2026_05_21.md
knowledge\memories\reference\reference_nn_leg_schema_read_fix_2026_06_02.md
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\nn-graph-health-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\nn-graph-health-inject.mjs
knowledge\wiki\lessons\nn-graded-schema-read-fix.md
CLAUDE.md
knowle
... [+219 chars truncated]

### Assistant | 2026-06-03T13:28:47.381Z

`classifyGnn` is imported only by the two hooks + their tests (the rest are docs/wiki/memory). So the return-shape additions (`degenerate`, `degenerateMode`) have no external code consumers beyond these two hooks. Now let me check all consumers of the leg-state output and the digest output — i.e., who reads the `status` string or the NN-EVAL.json file directly, to assess whether `DEGENERATE` as a new status breaks any downstream.

### Assistant | 2026-06-03T13:28:48.418Z

[tool_use: Grep]

### User | 2026-06-03T13:28:55.662Z

[tool_result] Found 250 files limit: 250
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\nn-graph-health-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\nn-graph-health-inject.mjs
scripts\lib\nn-graph-eval.mjs
scripts\psn-synergy-collect.test.mjs
scripts\lib\nn-graph-eval.test.mjs
mcp-server\src\engines\PartsLibraryEngine.ts
mcp-server\src\schemas\quotingActionSchemas.ts
scripts\q
... [+14372 chars truncated]

### Assistant | 2026-06-03T13:29:00.343Z

The broad grep is too noisy (matches "below"/"gate" everywhere and a `prism-test-*` scratch tree). Let me narrow to actual consumers of the `status` string `DEGENERATE`/`BELOW-GATE` and the leg-state output, and check the producer `nn-graph-eval.mjs` to confirm the `degeneracy` field shape this read relies on actually exists.

### Assistant | 2026-06-03T13:29:01.456Z

[tool_use: Grep]

### User | 2026-06-03T13:29:05.336Z

[tool_result] scripts\lib\nn-graph-eval.mjs:218: *     (`isDegenerate` keys off it).
scripts\lib\nn-graph-eval.mjs:222: *     `isDegenerate`.
scripts\lib\nn-graph-eval.mjs:231: * sample). So `isDegenerate:false` means "not a CONSTANT-vote artifact", NOT
scripts\lib\nn-graph-eval.mjs:240: * @returns {{isDegenerate:boolean, mode:string, distinctConfidences:number,
scripts\lib\nn-graph-eval.mjs:248:    isDegenerat
... [+1220 chars truncated]

### Assistant | 2026-06-03T13:29:12.574Z

The producer is confirmed. Let me read the producer's degeneracy detection + the exact place it writes `degeneracy` into the eval report, plus its `mode` value possibilities, to validate the consumer's read against the real contract.

### Assistant | 2026-06-03T13:29:13.175Z

[tool_use: Read]

### User | 2026-06-03T13:29:21.425Z

[tool_result] 240	 * @returns {{isDegenerate:boolean, mode:string, distinctConfidences:number,
241	 *   distinctPredictions:number, dominantClass:(string|null),
242	 *   dominantShare:(number|null), detail:string}}
243	 */
244	export function detectDegeneracy(scores, predicted) {
245	  const s = Array.isArray(scores) ? scores.filter((x) => Number.isFinite(x)) : [];
246	  const p = Array.isArray(predicted) ? pre
... [+2607 chars truncated]

### Assistant | 2026-06-03T13:29:28.185Z

Important finding: the producer emits `isDegenerate: true` for **two** modes, not just `constant-vote`:
- `mode: "constant-vote"` (constantConfidence && singleClass)
- `mode: "constant-confidence"` (constantConfidence only, multiple classes)

Both set `isDegenerate = true` (line 269: `isDegenerate = constantConfidence`). So the consumer hooks will correctly surface `DEGENERATE` for `constant-confidence` mode too, with `degenerateMode` = "constant-confidence". Now let me verify a subtle point in the consumer message wording. Let me check the producer's report-side wording (lines 544-560) to compare against the hooks' messages for accuracy.

### Assistant | 2026-06-03T13:29:29.783Z

[tool_use: Read]

### User | 2026-06-03T13:29:33.455Z

[tool_result] 540	  L.push(`| Brier | ${m.brier ?? "n/a"} | <= ${result.gates.brier} | ${Number.isFinite(m.brier) && m.brier <= result.gates.brier ? "PASS" : "FAIL"} |`);
541	  L.push(`| accuracy | ${m.accuracy ?? "n/a"} | (informational) | — |`, "");
542	  L.push(`**Verdict: ${g.verdict.toUpperCase()}**`, "");
543	  if (!g.pass) L.push("Gate failures: " + g.failures.join("; "), "");
544	  // Honesty guard: a d
... [+1546 chars truncated]

### Assistant | 2026-06-03T13:29:45.713Z

This is the authoritative producer wording, and it's the key reference for the message-accuracy review. The producer's own honesty guard says (line 553): "Threshold tuning cannot help — the embeddings/vote must actually separate classes first." So the consumer hooks' message "needs rearchitecting (features/vote), not threshold tuning" is a faithful, slightly-condensed echo of the producer's own canonical instruction. The "features/vote" phrasing matches the producer's "embeddings/vote".

Now the message-accuracy nuance the task flagged: for `mode: "constant-confidence"` (multiple classes, varied predictions, but all one confidence), the producer's detail still says "AUROC carries no ranking signal." The consumer message says "the model collapsed (constant vote → class prior)" in the nn-graph-health digest. For `constant-confidence` mode, the model did NOT collapse to a single class prior — it emits multiple classes but one confidence. Let me look at the exact digest wording again for that edge.

The health-inject digest line (line 214):
> `DEGENERATE (${g.degenerateMode})` — AUROC is a tie-break artifact, not a near-miss; the model collapsed (constant vote → class prior). Below gate by degeneracy, not margin — needs rearchitecting (features/vote), not threshold tuning.

The mode is interpolated, so for `constant-confidence` it reads "DEGENERATE (constant-confidence) ... the model collapsed (constant vote → class prior)". The parenthetical "(constant vote → class prior)" is slightly inaccurate for constant-confidence mode (which is constant confidence, not necessarily constant vote/single class). But the mode name is shown, and the core claim — "AUROC is a tie-break artifact, not a near-miss; below gate by degeneracy" — holds for both modes (both void AUROC ranking). This is a P2 wording nuance, not a P0/P1.

Now let me verify fail-soft for garbage `degeneracy.mode`. Let me check the test file for the psn hook and confirm both test files run green.

### Assistant | 2026-06-03T13:29:46.468Z

[tool_use: Bash]

### User | 2026-06-03T13:29:49.325Z

[tool_result]     # Subtest: knob=1 → output contains the always-on N/11 coverage gauge
    ok 2 - knob=1 → output contains the always-on N/11 coverage gauge
      ---
      duration_ms: 78.7322
      ...
    # Subtest: knob=anything-but-1 (e.g. 'true', '0') → treated as OFF (strict ==="1")
    ok 3 - knob=anything-but-1 (e.g. 'true', '0') → treated as OFF (strict ==="1")
      ---
      duration_ms: 324.9199
 
... [+254 chars truncated]

### Assistant | 2026-06-03T13:29:53.553Z

92/92 tests pass. Now let me verify fail-soft behavior directly: what happens when `isDegenerate:true` but `mode` is missing or garbage. Let me test the render output for a degenerate doc with no `mode` field.

### Assistant | 2026-06-03T13:30:08.176Z

[tool_use: Bash]

### User | 2026-06-03T13:30:10.177Z

[tool_result] A classify: {"dormant":false,"healthy":false,"auroc":0.5,"brier":0.26,"poolSize":0,"graded":true,"degenerate":true,"degenerateMode":"","verdict":"","reason":"","trainedAt":""}
A digest:
## 🧠 NN-GRAPH (GraphSAGE tier-5) health (fresh)
   ⚠ GNN tier **DEGENERATE ()** — AUROC is a tie-break artifact, not a near-miss; the model collapsed (constant vote → class prior). Below gate by degeneracy, not mar
... [+1739 chars truncated]

### Assistant | 2026-06-03T13:30:20.024Z

Fail-soft is solid. Key observations:

- **Case A/B (missing/garbage mode):** No `undefined` leaks. The health digest renders `DEGENERATE ()` — empty parens, slightly ugly but not broken. The psn-leg fallback correctly produces `(constant-vote collapse)` via `cls.degenerateMode || "constant-vote"`. Note an **asymmetry**: the psn-leg hook defaults the empty mode to `"constant-vote"`, but the health digest does NOT — it renders empty parens `()`. Cosmetic, P2.
- **Case C (degeneracy is an array):** `typeof [] === "object"` is true, so `degen` is set to the array, then `degen.isDegenerate` is `undefined` → `degenerate:false`. Correctly falls through to generic BELOW-GATE. Safe.
- **Case D (constant-confidence):** This is the message-accuracy concern. The mode is `constant-confidence` (multi-class, varied predictions) but the health digest hardcodes "the model collapsed (constant vote → class prior)" — which describes single-class collapse, not constant-confidence-multi-class. Mild over-claim, P2.

Now let me confirm there are no other readers of the leg-state `status` strings (e.g. a downstream that switch/cases on `BELOW-GATE` and would break on a new `DEGENERATE` value), and check whether `formatLegState` or any SVI/dashboard consumes these statuses programmatically.

### Assistant | 2026-06-03T13:30:33.515Z

[tool_use: Grep]

### User | 2026-06-03T13:30:37.998Z

[tool_result] .claude\hooks\psn-leg-state-inject.mjs:230:    // AUROC ~0.5 by tie-break, not by being close. Surface DEGENERATE distinctly
.claude\hooks\psn-leg-state-inject.mjs:233:      return { leg: "NN/GNN (#10)", status: "DEGENERATE", detail: `AUROC ${auroc.toFixed(3)} is a tie-break artifact (${cls.degenerateMode || "constant-vote"} collapse), NOT a near-miss — tier-5 needs rearchitecting (features/vote),
... [+527 chars truncated]

### Assistant | 2026-06-03T13:30:44.855Z

The `status` field is consumed only by `formatLegState` (line 260), which just string-interpolates `[${s.status}]` into a markdown advisory line — no switch/case, no enum validation, no programmatic branching on the value. So a new `DEGENERATE` status value cannot break any rendering path; it just appears in the advisory text. Both hook outputs are advisory `additionalContext` strings — no downstream parser consumes them as structured data.

Let me do a final check on whether the psn-leg-state output is consumed anywhere structurally (e.g., a test or engine that asserts the set of possible statuses, or an octopus/PSN-health feature extractor that keys off it).

### Assistant | 2026-06-03T13:30:46.025Z

[tool_use: Grep]

### User | 2026-06-03T13:30:52.321Z

[tool_result] Found 5 files
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\nn-graph-health-inject.mjs
scripts\lib\octopus-corpus-loader.mjs
mcp-server\src\engines\QuotingNeuralReasoningBridgeEngine.ts

### Assistant | 2026-06-03T13:30:58.270Z

Let me confirm the two non-test hits (`octopus-corpus-loader.mjs`, `QuotingNeuralReasoningBridgeEngine.ts`) don't consume the `legStateNnGraph` status string structurally — they matched on `NN/GNN (#10)` taxonomy text, not the hook output.

### Assistant | 2026-06-03T13:30:59.500Z

[tool_use: Grep]

### User | 2026-06-03T13:31:14.485Z

[tool_result] No matches found

### Assistant | 2026-06-03T13:31:51.508Z

Confirmed — `octopus-corpus-loader.mjs` matched only on the `NN/GNN`/`#10` leg-taxonomy text (PSN leg names), not on the hook's status output. Neither it nor the Quoting bridge consumes `legStateNnGraph`'s return structurally. The blast radius is contained: the only consumers of `classifyGnn` and of the leg/digest output are the two hooks themselves and their tests, and both emit advisory markdown strings with no downstream structured parser.

I have everything I need. Let me finalize the review.

## Independent second-pass review — `degeneracy` surfacing in NN/GNN fleet hooks

**Scope reviewed:** `git diff HEAD` for `nn-graph-health-inject.mjs`, `psn-leg-state-inject.mjs`, and both `.test.mjs` files; the producer contract in `scripts/lib/nn-graph-eval.mjs` (`detectDegeneracy` + report-side honesty guard); all readers of `classifyGnn` and of the two hooks' output. Both suites run green (92/92). Fail-soft probed directly against missing/garbage `degeneracy.mode` and a non-object `degeneracy`.

### Weighted findings

**1. Message accuracy — defensible, with one over-claim (P2).**
The DEGENERATE instruction ("needs rearchitecting (features/vote), not threshold tuning") is a faithful, condensed echo of the producer's own canonical wording at `nn-graph-eval.mjs:553` ("Threshold tuning cannot help — the embeddings/vote must actually separate classes first"). For a `constant-vote` collapse this is exactly right, and the eval *does* prove AUROC is a tie-break artifact (constant confidence voids ranking), so the "not a near-miss" framing is sound. The over-claim: the producer sets `isDegenerate:true` for **two** modes — `constant-vote` AND `constant-confidence` (`isDegenerate = constantConfidence`, line 269). For `constant-confidence` (multi-class, varied predictions), the health digest still hardcodes "the model collapsed (constant vote → class prior)", which describes single-class collapse specifically. The mode name is correctly interpolated (`DEGENERATE (constant-confide
... [+4543 chars truncated]
