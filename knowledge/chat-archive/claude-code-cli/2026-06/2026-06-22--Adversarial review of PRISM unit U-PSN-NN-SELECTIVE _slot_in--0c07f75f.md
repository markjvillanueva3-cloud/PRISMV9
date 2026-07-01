---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c07f75f-24a7-47d8-a038-b4f2e5216e1d"
title: "Adversarial review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — a bug fix + R"
date: "2026-06-22"
first_ts: "2026-06-22T20:55:11.715Z"
last_ts: "2026-06-22T20:56:23.636Z"
cwd: "H:\\prism\\mcp-server"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a897b142abdfb6395.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Adversarial review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — a bug fix + R

> **claude-code-cli** | 2026-06-22 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a897b142abdfb6395.jsonl`

## Transcript

### User | 2026-06-22T20:55:11.715Z

Adversarial review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — a bug fix + R16 enhancement to the PSN-health NN/GNN leg #10. Grade PASS/FAIL with P0/P1/P2 + file:line. Analyst lens: silent breakage, regression, the bug fix's correctness. Read all 3 changed files:

1. `H:/prism/mcp-server/src/engines/PSNHealthCheckEngine.ts` — extended `LegInputsSchema.nnGnn` (added optional selectiveDeployReady/selectiveCoverage/selectiveTau) + rewrote `classifyNnGnn` (lines ~138+) to model selective-deploy AND fix a misleading signal.
2. `H:/prism/scripts/generate-psn-health-features.mjs` — `gatherNnGnn` now routes through the canonical `classifyGnn` reader (imported from `.claude/hooks/nn-graph-health-inject.mjs`) instead of reading top-level `j.auroc`.
3. `H:/prism/mcp-server/src/__tests__/PSNHealthCheckEngine.test.ts` — new selective-deploy test cases.

THE BUG (verify it was real + is fixed): the old `gatherNnGnn` read `j.auroc`/`j.brier` (top-level), but `NN-EVAL.json` stores the graded metric at `metrics.auroc` (there is NO top-level `auroc`). So the generator fed `{auroc:null}` and the dashboard rendered NN/GNN leg #10 as RED "AUROC UNGRADED" while the GNN is actually graded (auroc 0.7891) + deploy-ready-selective. Live-validated: leg now renders amber "deploy-ready-selective (27% coverage tau 0.7)".

VERIFY:
- classifyNnGnn correctness: trace all branches (null/promoted/full-gate-ok/selective-ready/accurate-fail). Confirm the OLD misleading "AUROC < gate" (emitted even when AUROC passed but Brier failed) is genuinely fixed. Any branch that now misclassifies or any OTHER leg regressed by the schema change?
- Generator: does importing `classifyGnn`+`loadEval` from the hook risk a side effect (does the hook run a main() on import)? Is `loadEval` return shape ({evalReport, ageMs}) read correctly? Is the mapping promoted = g.healthy sound? Backward-compat if NN-EVAL.json is deferred (g.auroc null -> leg {auroc:null} -> red UNGRADED, correct)?
- Schema: are the new fields cor
... [+195 chars truncated]

### Assistant | 2026-06-22T20:55:15.152Z

I'll read all three files in parallel to perform a thorough adversarial review.

### Assistant | 2026-06-22T20:55:15.664Z

[tool_use: Read]

### Assistant | 2026-06-22T20:55:16.150Z

[tool_use: Read]

### Assistant | 2026-06-22T20:55:16.376Z

[tool_use: Read]

### User | 2026-06-22T20:55:16.462Z

[tool_result] 1	/**
2	 * PSNHealthCheckEngine — HZD-PSN-01 (HZP-DASH-PSN-MS0)
3	 *
4	 * Pure-core PSN-leg health classifier. Given raw signal data for each of
5	 * the 11 PSN legs (Obsidian brain · PRISM OS · Wiki · Memories · Tribal ·
6	 * System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI), returns
7	 * a normalized health record per leg with status pill + 1-line signal.
8	 *
9	 * The CALLER doe
... [+13671 chars truncated]

### User | 2026-06-22T20:55:17.224Z

[tool_result] 1	/** PSNHealthCheckEngine tests — HZD-PSN-01 (HZP-DASH-PSN-MS0). */
2	import { describe, it, expect } from "vitest";
3	import { PSNHealthCheckEngine, type LegInputs } from "../engines/PSNHealthCheckEngine.js";
4	
5	const allHealthy = (): LegInputs => ({
6	  obsidian:   { memoryCount: 500, lastMemoryAgeMin: 30 },
7	  prismOs:    { actionCount: 45, lastInvocationAgeMin: 5 },
8	  wiki:       { entry
... [+10775 chars truncated]

### User | 2026-06-22T20:55:17.427Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-psn-health-features.mjs — HZD-PSN-01 (HZP-DASH-PSN-MS0)
4	 *
5	 * Assembles raw PSN-leg signals from disk → feeds PSNHealthCheckEngine pure-core
6	 * algorithm → writes single roost snapshot. Dashboard polls
7	 * state/shared/system-viz/staging/psn-health.json every 5s.
8	 *
9	 * R12 fail-soft: any source missing on disk → that leg's input is omitted →
10	
... [+16263 chars truncated]

### Assistant | 2026-06-22T20:55:20.981Z

I'll now read the hook file that is being imported, to verify the import is safe and the return shape is correctly consumed.

### Assistant | 2026-06-22T20:55:21.346Z

[tool_use: Read]

### User | 2026-06-22T20:55:22.461Z

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
... [+15476 chars truncated]

### Assistant | 2026-06-22T20:55:27.741Z

I now have everything needed to do a thorough trace. Let me verify the one remaining open question — whether any other consumer of `classifyGnn` or `loadEval` was left un-updated, and whether the generator's `nnGnn` inline classifier in the `.mjs` switch statement was updated to match the engine's new selective-deploy branch.

### Assistant | 2026-06-22T20:55:29.648Z

[tool_use: Grep]

### Assistant | 2026-06-22T20:55:30.881Z

[tool_use: Grep]

### User | 2026-06-22T20:55:31.086Z

[tool_result] Found 30 files
H:\prism\scripts\generate-psn-health-features.mjs
src\engines\PSNHealthCheckEngine.ts
src\tools\dispatchers\devDispatcher.ts
src\engines\GnnDeployStatusEngine.ts
src\__tests__\GnnDeployStatusEngine.test.ts
H:\prism\scripts\measure-ghost-holdout-headtohead.mjs
H:\prism\.claude\hooks\psn-leg-state-inject.mjs
H:\prism\scripts\lib\nn-graph-eval.mjs
H:\prism\scripts\lib\nn-graph-eval.tes
... [+1032 chars truncated]

### User | 2026-06-22T20:55:32.579Z

[tool_result] H:\prism\.claude\hooks\nn-graph-health-inject.test.mjs:14:// Fixture: the live first-run state — GNN dormant, AUROC far below gate.
H:\prism\.claude\hooks\nn-graph-health-inject.test.mjs:43:// Fixture: GNN live but below the AUROC gate → not healthy, not dormant.
H:\prism\.claude\hooks\nn-graph-health-inject.test.mjs:186:test("classifyGnn: live but below AUROC gate → not healthy, not dormant", () 
... [+13475 chars truncated]

### Assistant | 2026-06-22T20:55:37.873Z

The grep results give me the full picture I need. Let me now check the one concrete divergence I spotted: the inline `nnGnn` classifier in the generator's `classify()` switch (lines 106-112) was NOT updated with the selective-deploy branch, while `gatherNnGnn()` correctly feeds selective fields. I need to confirm that discrepancy is real and trace its blast radius.

### Assistant | 2026-06-22T20:55:38.512Z

[tool_use: Read]

### Assistant | 2026-06-22T20:55:39.468Z

[tool_use: Read]

### User | 2026-06-22T20:55:39.496Z

[tool_result] 106	    case "nnGnn": {
107	      if (i.auroc === null) return { status: "red", signal: "AUROC UNGRADED (eval deferred)" };
108	      if (i.promoted) return { status: "green", signal: `AUROC ${i.auroc.toFixed(3)}, Brier ${(i.brier ?? 0).toFixed(3)} (PROMOTED)` };
109	      const gateOk = i.auroc >= NN_AUROC_PROMOTE && (i.brier ?? 1) <= NN_BRIER_PROMOTE;
110	      if (gateOk) return { status: "ambe
... [+856 chars truncated]

### User | 2026-06-22T20:55:40.551Z

[tool_result] 210	  // shape; the top-level `auroc` fallback keeps flat/legacy docs working.
211	  const cls = classifyGnn(evalDoc);
212	  // Type-strict fallback: `Number(null) === 0` (a finite!), so a flat
213	  // {auroc:null} doc must NOT be read as 0 → BELOW-GATE. Require a real number.
214	  const topLevelAuroc = (typeof evalDoc.auroc === "number" && Number.isFinite(evalDoc.auroc))
215	    ? evalDoc.auroc
... [+3882 chars truncated]

### Assistant | 2026-06-22T20:56:23.636Z

I have everything I need. Here is the complete adversarial analysis.

---

VERDICT: FAIL

summary: The bug fix is real and correctly implemented in both `PSNHealthCheckEngine.ts` and `gatherNnGnn()`. However, the generator script contains a second, inline copy of the NN/GNN classifier in its `classify()` switch statement (lines 106-112 of `generate-psn-health-features.mjs`) that was NOT updated with this diff. That copy still emits the old misleading `"AUROC ${x} < 0.78 gate"` signal unconditionally for all non-promoted, non-gate-met cases, which means the selective-deploy branch is silently dead in the script's actual output path. A consumer of `psn-health.json` (the dashboard file the script writes) will see the old wrong signal for the live GNN state. The `.ts` engine and its tests are clean; the regression lives entirely in the `.mjs` generator's stale inline copy.

findings:
  - [P1] `H:/prism/scripts/generate-psn-health-features.mjs:106-112` -- The `classify()` switch's `"nnGnn"` case is a stale copy of the pre-fix classifier. It has no `selectiveDeployReady` branch. For the live GNN state (AUROC 0.7891 passes gate, Brier 0.1887 fails, `selectiveDeployReady:true`), `gatherNnGnn()` correctly assembles `{auroc:0.7891, brier:0.1887, promoted:false, selectiveDeployReady:true, selectiveCoverage:0.27, selectiveTau:0.7}` and feeds it to this `classify()` function. The function hits the final fallthrough at line 111 and emits `signal:"AUROC 0.789 < 0.78 gate"` -- which is doubly wrong (AUROC actually passes the gate; selective deploy is ready). The fixed classifier in `PSNHealthCheckEngine.ts:classifyNnGnn` is never called by this script; the script has its own inline port. The file written to `state/shared/system-viz/staging/psn-health.json` (polled by the dashboard) carries the old misleading signal. Fix: update the `"nnGnn"` case in `classify()` at lines 106-112 to mirror `classifyNnGnn()` in the engine, specifically: check `i.selectiveDeployReady` before the final
... [+3996 chars truncated]
