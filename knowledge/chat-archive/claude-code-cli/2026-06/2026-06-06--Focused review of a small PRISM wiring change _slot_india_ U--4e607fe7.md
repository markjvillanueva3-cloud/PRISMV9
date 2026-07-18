---
type: "chat-session"
source: "claude-code-cli"
session_id: "4e607fe7-e3af-475c-8535-1d10b459c62c"
title: "Focused review of a small PRISM wiring change (slot:india, U-LEG-STATE-SELECTIVE"
date: "2026-06-06"
first_ts: "2026-06-06T05:31:23.319Z"
last_ts: "2026-06-06T05:43:25.220Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a151c91c633da8937.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Focused review of a small PRISM wiring change (slot:india, U-LEG-STATE-SELECTIVE

> **claude-code-cli** | 2026-06-06 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a151c91c633da8937.jsonl`

## Transcript

### User | 2026-06-06T05:31:23.319Z

Focused review of a small PRISM wiring change (slot:india, U-LEG-STATE-SELECTIVE-WIRE). Run `git -C H:/prism diff` and read the changed files end-to-end:
- H:/prism/.claude/hooks/nn-graph-health-inject.mjs (classifyGnn + formatDigest)
- H:/prism/.claude/hooks/psn-leg-state-inject.mjs (legStateNnGraph)
- their two .test.mjs files

WHAT IT DOES: The GNN tier-5 deploy eval (NN-EVAL.json) now carries `selective.deployGrade` (from the prior unit U-GNN-SELECTIVE-DEPLOY) — the tier is deploy-ready-selective at the production gate τ=0.7 (32% coverage) even though the full-holdout grade fails on Brier. Before this change, the fleet's per-prompt PSN-leg-state banner + the SessionStart NN-GRAPH health digest reported "BELOW-GATE / tier-5 dormant" — which is now FALSE (the tier contributes on 32% of ghosts). This change makes `classifyGnn` (the single-source-of-truth reader) expose `selectiveDeployReady` + `selectiveOperatingPoint`, and both consumers (formatDigest, legStateNnGraph) surface a new "SELECTIVE-DEPLOY" / "DEPLOY-READY-SELECTIVE" state instead of the false "dormant".

VERIFY:
1. Correctness: classifyGnn reads r.selective.deployGrade.pass + operatingPoint safely (null-guards for legacy/absent selective). selectiveDeployReady only true when deployGrade.pass===true.
2. Back-compat: a graded-below report WITHOUT a selective section → selectiveDeployReady false, falls through to BELOW-GATE unchanged. (Tested?)
3. Honesty: the new SELECTIVE-DEPLOY state is accurate (tier contributes on 32%, defers below); it does NOT overstate (it still notes full-coverage pending ref-pool growth); the full-holdout grade is unaffected.
4. Does this change the "concerning legs" semantics correctly — is surfacing SELECTIVE-DEPLOY (rather than going silent) the right call? (It corrects a false "dormant" claim and flags full-coverage is still pending — argue whether that's right.)
5. Regression: the anti-drift REAL-DATA guard test allowlist was extended to include SELECTIVE-DEPLOY — legitimat
... [+229 chars truncated]

### Assistant | 2026-06-06T05:31:34.098Z

I'll start by reading the changed files and running the diff to understand the scope of the change.

### Assistant | 2026-06-06T05:31:34.535Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:31:35.646Z

[tool_use: Bash]

### User | 2026-06-06T05:31:51.301Z

[tool_result] diff --git a/.claude/hooks/nn-graph-health-inject.mjs b/.claude/hooks/nn-graph-health-inject.mjs
index 48a510161b..e1b607ee8c 100644
--- a/.claude/hooks/nn-graph-health-inject.mjs
+++ b/.claude/hooks/nn-graph-health-inject.mjs
@@ -167,6 +167,17 @@ export function classifyGnn(evalReport) {
   const degen = r.degeneracy && typeof r.degeneracy === "object" ? r.degeneracy : null;
   const degenerate =
... [+4079 chars truncated]

### User | 2026-06-06T05:31:55.602Z

[tool_result] warning: in the working copy of '.claude/helpers/mcp-tool-domains.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of '.claude/hooks/main-tree-write-block.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of '.claude/hooks/prompt-rules-inject.mjs', CRLF will be replaced by LF the next time Git touches it
warning: 
... [+7666 chars truncated]

### Assistant | 2026-06-06T05:31:58.234Z

Now let me read the two hook files end-to-end and their test files.

### Assistant | 2026-06-06T05:31:59.417Z

[tool_use: Read]

### Assistant | 2026-06-06T05:31:59.572Z

[tool_use: Read]

### User | 2026-06-06T05:32:11.699Z

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
... [+15016 chars truncated]

### User | 2026-06-06T05:32:12.620Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory)
3	/**
4	 * psn-leg-state-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
7	 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
8	 * one of the substrates it should consult — a compact per-PSN-leg health
9	 * digest that surfaces ONLY legs in a concer
... [+29239 chars truncated]

### Assistant | 2026-06-06T05:32:14.899Z

Now let me read both test files end-to-end.

### Assistant | 2026-06-06T05:32:15.372Z

[tool_use: Read]

### Assistant | 2026-06-06T05:32:15.769Z

[tool_use: Read]

### User | 2026-06-06T05:32:27.718Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for nn-graph-health-inject.mjs (/goal synergy iter 18, echo).
4	 *
5	 * Run: node --test .claude/hooks/nn-graph-health-inject.test.mjs
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
10	import { tmpdir } from "node:os";
11	import path from "node:pa
... [+17315 chars truncated]

### User | 2026-06-06T05:32:29.187Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psn-leg-state-inject.test.mjs — pin the per-leg health predicates +
4	 * formatLegState render for U-PSN-LEG-STATE-INJECT (golf 2026-05-24).
5	 *
6	 * Each leg's predicate is pure (takes `now` + stat + optional doc).
7	 * Tests pin: happy/silent · stale-by-time · missing · render markers.
8	 */
9	
10	import { describe, it } from "node:test";
11	import assert from "
... [+30576 chars truncated]

### Assistant | 2026-06-06T05:32:32.200Z

Both files read end-to-end. Now let me run the tests and inspect the live NN-EVAL.json to verify the change against real data.

### Assistant | 2026-06-06T05:32:33.782Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:32:35.576Z

[tool_use: Bash]

### User | 2026-06-06T05:33:26.962Z

[tool_result]   ---
  duration_ms: 1.1628
  type: 'suite'
  ...
# Subtest: formatLegState — owner tag render (Bridge\#7)
    # Subtest: appends → owner: `<slot>` to a concerning leg with a known owner
    ok 1 - appends → owner: `<slot>` to a concerning leg with a known owner
      ---
      duration_ms: 0.186
      ...
    # Subtest: omits the owner tag for an unknown leg label (no fabricated owner)
    ok 2 -
... [+649 chars truncated]

### User | 2026-06-06T05:34:07.069Z

[tool_result] deferred: false
has metrics: true {"auroc":0.8084,"macroF1":0.4389,"brier":0.179,"accuracy":0.6613}
has selective: true
selective.deployGrade: {"pass":true,"verdict":"deploy-ready-selective","failures":[],"productionGate":0.7,"operatingPoint":{"tau":0.7,"coverage":0.3226,"emitted":20,"brier":0.0406,"macroF1":1,"accuracy":1},"maxCoveragePoint":{"tau":0.5,"coverage":0.4677,"brier":0.1013,"macroF1":0
... [+567 chars truncated]

### Assistant | 2026-06-06T05:34:11.742Z

Tests are 108/108 green. The live NN-EVAL.json confirms the exact shape the change handles: `deferred:false`, full `grade.pass:false` (Brier 0.179 > 0.15 + macro-F1 fail), but `selective.deployGrade.pass:true` with operating point τ=0.7, coverage 0.3226.

Let me verify the live end-to-end render of both consumers against the real file, and check one correctness edge — that `op.brier` is rendered raw (unformatted) and the type-guards hold.

### Assistant | 2026-06-06T05:34:16.321Z

[tool_use: Bash]

### User | 2026-06-06T05:34:44.872Z

[tool_result] (node:43364) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\.claude\hooks\nn-graph-health-inject.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

### Assistant | 2026-06-06T05:34:47.966Z

The `||` fallback ran but the require side printed only the warning. Let me run the ESM probe cleanly.

### Assistant | 2026-06-06T05:34:51.879Z

[tool_use: Bash]

### User | 2026-06-06T05:35:10.900Z

[tool_result] selectiveDeployReady: true
selectiveOperatingPoint: {"tau":0.7,"coverage":0.3226,"brier":0.0406,"macroF1":1}
healthy: false | dormant: false | graded: true
---- formatDigest ----
## 🧠 NN-GRAPH (GraphSAGE tier-5) health (fresh)
   ◐ GNN tier **DEPLOY-READY-SELECTIVE** — below the full-coverage gate, but at the production confidence gate τ=0.7 it contributes on 32% of ghosts (Brier 0.0406, macro-F1 
... [+535 chars truncated]

### Assistant | 2026-06-06T05:35:16.441Z

Live render confirms the change works correctly end-to-end against the real production NN-EVAL.json. Both consumers now surface the honest SELECTIVE-DEPLOY state instead of the false "tier-5 dormant" / "below promotion gate" claim.

Let me verify the back-compat path and one subtle correctness concern: the digest's bottom line still shows the full-holdout Brier (0.179) while the selective line shows the operating-point Brier (0.0406) — confirming these are distinct, not a contradiction. Let me also confirm a legacy doc without `selective` falls through cleanly, and check whether the DEGENERATE branch correctly precedes selective (ordering precedence).

### Assistant | 2026-06-06T05:35:25.783Z

[tool_use: Bash]

### User | 2026-06-06T05:35:41.510Z

[tool_result] legacy-no-selective digest branch: falls through
legacy-no-selective leg: BELOW-GATE
pass=false selectiveDeployReady: false | op: null
pass=false leg status: BELOW-GATE
degen+selective (auroc 0.5) leg status: DEGENERATE
pass=true,no-op selectiveDeployReady: true | op: null
pass=true,no-op leg status: BELOW-GATE

### Assistant | 2026-06-06T05:35:47.298Z

All edge cases behave correctly. The most interesting one is #4: `deployGrade.pass:true` but `operatingPoint` missing → `selectiveDeployReady:true` but `selectiveOperatingPoint:null`, and both consumers correctly fall through to BELOW-GATE because both render branches are guarded by `&& g.selectiveOperatingPoint` / `&& cls.selectiveOperatingPoint`. This means a deploy-ready-selective verdict with no operating point degrades to BELOW-GATE rather than emitting a SELECTIVE line with `?`/undefined values — fail-closed and safe (no crash, no misleading partial render).

Let me do a final check on the git history context to confirm the prior unit (U-GNN-SELECTIVE-DEPLOY) actually produced the `selective.deployGrade` field, so the claim that this is wiring an already-produced field is accurate.

### Assistant | 2026-06-06T05:35:48.544Z

[tool_use: Bash]

### User | 2026-06-06T05:41:05.478Z

[tool_result] Command running in background with ID: blnjoe97g. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e607fe7-e3af-475c-8535-1d10b459c62c\tasks\blnjoe97g.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T05:41:08.722Z

[tool_use: Bash]

### User | 2026-06-06T05:42:34.885Z

[tool_result] scripts/lib/nn-graph-eval.mjs
scripts/lib/nn-graph-eval.test.mjs
===selective producer===
scripts/lib/nn-graph-eval.mjs
scripts/lib/nn-graph-eval.test.mjs

### Assistant | 2026-06-06T05:43:11.078Z

Confirmed: `scripts/lib/nn-graph-eval.mjs` is the producer of `selective.deployGrade` — the field this change consumes was genuinely produced by the prior unit (U-GNN-SELECTIVE-DEPLOY), and the live NN-EVAL.json carries it. This is a pure consumer-wiring change, not a fabricated schema.

I have everything needed. Here is my review.

---

## Code Quality Analysis Report — U-LEG-STATE-SELECTIVE-WIRE (slot:india)

### Summary
- **Verdict: PASS** (3 reviewer arms: self + live-data + edge-matrix)
- Files analyzed: 4 (2 hooks + 2 tests)
- Tests: **108/108 green** (`node --test` both files)
- Live-data validated: renders correctly against the real production `NN-EVAL.json`
- P0: 0 · P1: 0 · P2: 2 (both cosmetic/optional)

### Point-by-point verification

**1. Correctness — PASS.** `classifyGnn` (lines 174-180) reads `r.selective.deployGrade.pass` through a full null-guard chain: `sel` (object-check) → `dg` (object-check) → `selectiveDeployReady = dg ? dg.pass === true : false`. The `=== true` is strict, so a truthy-but-non-boolean `pass` never sets it. `op` is gated on `selectiveDeployReady && dg.operatingPoint && typeof===object`, so `dg.operatingPoint` is only dereferenced after `selectiveDeployReady` is already true (no TypeError on the `dg.operatingPoint` access). Verified live: `selectiveDeployReady:true`, op `{tau:0.7,coverage:0.3226,brier:0.0406,macroF1:1}`.

**2. Back-compat — PASS, tested.** A graded-below report with no `selective` section: `sel=null → dg=null → selectiveDeployReady=false → op=null`. Both consumers fall through to BELOW-GATE unchanged. Confirmed live (`legacy-no-selective leg: BELOW-GATE`, digest "falls through") and pinned by `nn-graph-health-inject.test.mjs:115` and `psn-leg-state-inject.test.mjs:162`. `deployGrade.pass:false` also correctly yields `false`/null (test :121).

**3. Honesty — PASS, and notably rigorous.** The two Brier numbers are intentionally distinct and not contradictory: the SELECTIVE line shows the *operating-point* Brier (0
... [+4429 chars truncated]

### Assistant | 2026-06-06T05:43:11.186Z

[tool_use: TaskStop]

### User | 2026-06-06T05:43:19.736Z

[tool_result] {"message":"Successfully stopped task: blnjoe97g (rtk git log --oneline -8 2>&1 | head -20; echo \"---grep producer---\"; grep -rl \"deployGrade\" scripts/ mcp-server/ 2>/dev/null | head -10)","task_id":"blnjoe97g","task_type":"local_bash","command":"rtk git log --oneline -8 2>&1 | head -20; echo \"---grep producer---\"; grep -rl \"deployGrade\" scripts/ mcp-server/ 2>/dev/null | head -10"}

### Assistant | 2026-06-06T05:43:25.220Z

Background task stopped. Review complete.

**Final verdict: PASS** — 0 P0, 0 P1, 2 cosmetic P2 (raw `op.brier` interpolation; one untested-but-correct fail-closed edge). The change correctly wires the already-produced `selective.deployGrade` field through the single-source-of-truth reader (`classifyGnn`) into both consumers, replacing a now-false "tier-5 dormant" claim with an honest "DEPLOY-READY-SELECTIVE @ τ=0.7, 32% coverage, full-coverage pending" state. Back-compat is intact by construction and tested, all 108 tests pass, and the live production `NN-EVAL.json` renders exactly as intended.
