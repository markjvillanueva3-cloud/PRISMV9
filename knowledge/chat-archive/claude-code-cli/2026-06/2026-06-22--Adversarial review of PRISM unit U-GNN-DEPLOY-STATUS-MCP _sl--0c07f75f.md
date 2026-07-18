---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c07f75f-24a7-47d8-a038-b4f2e5216e1d"
title: "Adversarial review of PRISM unit U-GNN-DEPLOY-STATUS-MCP (slot:india). Grade PAS"
date: "2026-06-22"
first_ts: "2026-06-22T20:22:37.435Z"
last_ts: "2026-06-22T20:23:50.402Z"
cwd: "H:\\prism\\mcp-server"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a9fcb0b98f227788c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Adversarial review of PRISM unit U-GNN-DEPLOY-STATUS-MCP (slot:india). Grade PAS

> **claude-code-cli** | 2026-06-22 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a9fcb0b98f227788c.jsonl`

## Transcript

### User | 2026-06-22T20:22:37.435Z

Adversarial review of PRISM unit U-GNN-DEPLOY-STATUS-MCP (slot:india). Grade PASS or FAIL with P0/P1/P2 findings + file:line. You are the analyst arm — weighted to silent breakage, regression, security, fail-soft. Read all three files end-to-end:
1. ENGINE: H:/prism/mcp-server/src/engines/GnnDeployStatusEngine.ts (pure reader of the GNN deploy-gate report)
2. DISPATCHER: H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts — the new `gnn_deploy_status` action (in the ACTIONS array + a switch case ~after the wiring_potential case)
3. TEST: H:/prism/mcp-server/src/__tests__/GnnDeployStatusEngine.test.ts

Source-of-truth to compare against: `.claude/hooks/nn-graph-health-inject.mjs` (the `classifyGnn` reader) and `state/shared/nn-graph/NN-EVAL.json` (the live report shape).

Context: tests 13/13 green, tsc clean, live-validated (auroc 0.7891; gates {0.78,0.55,0.15} READ from the report; selective deploy-ready @tau=0.7 coverage 0.2738 classes 2/13).

VERIFY THESE SPECIFICALLY:
- CORRECTNESS + FAIL-SOFT: does `readStatus` EVER throw (missing file / garbage JSON / non-object parsed value)? Do the num/obj/bool coercions ever let a missing field masquerade as 0 or true? Is the staleness math safe (bad assessedAt -> null, not NaN)? Is `classify(null|undefined|[]|42|"x")` safe?
- NO-THRESHOLD-INLINE (india-critical): grep the engine for any literal 0.78/0.55/0.15/0.7. The gates MUST come only from the report's `gates` field; the engine must NEVER re-grade (no recompute of pass/fail) — it surfaces STORED `grade.pass`/`selective.deployGrade.pass`.
- SCHEMA-FIDELITY vs classifyGnn: does the engine's field mapping match classifyGnn's reads (deferred, metrics.auroc metrics-first, checkpointMeta.auroc pretext, selective.deployGrade.{pass,operatingPoint}, degeneracy)? Flag any field classifyGnn reads that this drops/mis-maps, or where the two would DISAGREE on the same report.
- SECURITY: the action accepts an operator-supplied `eval_path` and reads ANY file as JSON. Read-arbi
... [+329 chars truncated]

### Assistant | 2026-06-22T20:22:40.079Z

I'll read all five files in parallel to conduct a thorough adversarial review.

### Assistant | 2026-06-22T20:22:40.583Z

[tool_use: Read]

### Assistant | 2026-06-22T20:22:41.072Z

[tool_use: Read]

### User | 2026-06-22T20:22:41.402Z

[tool_result] 1	/**
2	 * GnnDeployStatusEngine -- MCP-surface reader for the GraphSAGE GNN (tier-5
3	 * wiring-inference) deploy-gate verdict.
4	 *
5	 * U-GNN-DEPLOY-STATUS-MCP (slot:india 2026-06-22). The GNN selective-deploy
6	 * evaluation (`scripts/lib/nn-graph-eval.mjs` runAssessment) writes its graded
7	 * verdict to `state/shared/nn-graph/NN-EVAL.json`, and the hook-side reader
8	 * `.claude/hooks/nn-gra
... [+10999 chars truncated]

### Assistant | 2026-06-22T20:22:41.562Z

[tool_use: Read]

### Assistant | 2026-06-22T20:22:41.772Z

[tool_use: Read]

### User | 2026-06-22T20:22:42.085Z

[tool_result] 1	/**
2	 * GnnDeployStatusEngine.test.ts -- U-GNN-DEPLOY-STATUS-MCP (slot:india 2026-06-22).
3	 *
4	 * Proves the GNN deploy-gate verdict is now consumable through the MCP surface
5	 * (prism_dev:gnn_deploy_status) as a PURE read of the already-graded
6	 * state/shared/nn-graph/NN-EVAL.json -- never re-grading, never inlining a
7	 * threshold (gates come from the report's own `gates` field).
8	 *

... [+10187 chars truncated]

### User | 2026-06-22T20:22:42.800Z

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

### User | 2026-06-22T20:22:42.913Z

[tool_result] 1	{
2	  "deferred": false,
3	  "assessedAt": "2026-06-17T19:37:56.054Z",
4	  "holdoutN": 84,
5	  "embeddingMode": "direct",
6	  "checkpointPresent": true,
7	  "holdoutSplit": "stratified",
8	  "heldClasses": 13,
9	  "gates": {
10	    "auroc": 0.78,
11	    "macroF1": 0.55,
12	    "brier": 0.15
13	  },
14	  "metrics": {
15	    "auroc": 0.7891,
16	    "macroF1": 0.4101,
17	    "brier": 0.1887,
18	   
... [+22935 chars truncated]

### Assistant | 2026-06-22T20:22:47.869Z

Now I need to read the devDispatcher to verify the action wiring. Let me also check for any existing callers of classifyGnn to understand the blast radius.

### Assistant | 2026-06-22T20:22:49.241Z

[tool_use: Grep]

### Assistant | 2026-06-22T20:22:50.286Z

[tool_use: Grep]

### User | 2026-06-22T20:22:50.339Z

[tool_result] 100-"router_adaptation_apply",
101-// CLEANUP-MS0/U-CLEANUP-C2: WiringPotentialEngine (C1) — rank candidate
102-// dispatchers for orphan engines. Three modes: analyze (single engine),
103-// batch_unwired (scan BUILD_STATE.NEEDS_WIRING orphans), dashboard
104-// (aggregate top-candidate distribution across all orphans).
105-"wiring_potential",
106-// U-GNN-DEPLOY-STATUS-MCP (slot:india): surface 
... [+1629 chars truncated]

### User | 2026-06-22T20:22:55.385Z

[tool_result] <persisted-output>
Output too large (27.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\0c07f75f-24a7-47d8-a038-b4f2e5216e1d\tool-results\toolu_01FaimgNEW5q3QGEe2HRkupL.txt

Preview (first 2KB):
H:\prism\.claude\hooks\nn-graph-health-inject.test.mjs:12:import { loadEval, classifyGnn, formatDigest } from "./nn-graph-health-inject.mjs";
H:\prism\.claude\hooks\nn-graph-health-inj
... [+1734 chars truncated]

### Assistant | 2026-06-22T20:22:58.184Z

Now let me check the specific field mappings between classifyGnn and the engine, paying close attention to the `selectiveOperatingPoint` shape difference I noticed.

### Assistant | 2026-06-22T20:22:59.703Z

[tool_use: Grep]

### Assistant | 2026-06-22T20:23:00.917Z

[tool_use: Grep]

### User | 2026-06-22T20:23:02.551Z

[tool_result] 182:        concentrated: dg.concentrated === true }
238:      ? ` Spans ${op.classesEmitted}/${op.totalClasses} classes${op.concentrated ? " (concentrated)" : ""}.`

### User | 2026-06-22T20:23:02.784Z

[tool_result] 1227-                    _hint: `Readiness: ${startupResult.readiness_score}/100 (${startupResult.grade}) — ${startupResult.skills_matched}/${startupResult.skills_total} skills, NL: ${startupResult.nl_hook_status}`
1228-                  };
1229-                } catch { 
1230:                  result.enhanced_startup = { status: "ran_but_parse_failed", raw: startupOutput.slice(0, 200) }; 
1231-  
... [+1608 chars truncated]

### Assistant | 2026-06-22T20:23:06.659Z

I have all the data I need. Let me now do the targeted field-mapping analysis between `classifyGnn` and `GnnDeployStatusEngine.classify`.

### Assistant | 2026-06-22T20:23:07.624Z

[tool_use: Grep]

### User | 2026-06-22T20:23:08.529Z

[tool_result] 71:  concentrated: boolean;
197:        concentrated: bool(dg.concentrated),

### Assistant | 2026-06-22T20:23:09.193Z

[tool_use: Grep]

### User | 2026-06-22T20:23:10.107Z

[tool_result] No matches found

### Assistant | 2026-06-22T20:23:50.402Z

I have all the data needed for a complete analysis. Let me now do the final targeted check on the `selectiveOperatingPoint` shape divergence.

The engine's `GnnSelectiveOperatingPoint` interface (line 55-64) has fields: `tau, coverage, emitted, brier, macroF1, accuracy, classesEmitted, totalClasses`. It does NOT include `concentrated`.

`classifyGnn` (hook, line 178-183) builds `selectiveOperatingPoint` with: `tau, coverage, brier, macroF1, classesEmitted, totalClasses, concentrated` — `concentrated` is placed INSIDE the operating point object.

The engine places `concentrated` OUTSIDE the operating point, on `GnnSelectiveDeploy` directly (line 71, read at line 197 from `dg.concentrated`). This matches the live NN-EVAL.json shape (`selective.deployGrade.concentrated` is a top-level field of deployGrade, not inside `operatingPoint`).

So the engine's mapping is actually CORRECT to the JSON schema. `classifyGnn` places `concentrated` inside its returned `selectiveOperatingPoint` object as a convenience — a divergence from the raw schema, but not a bug in the engine. Now confirming the `emitted` and `accuracy` fields: classifyGnn does NOT surface `emitted` or `accuracy` in its operating point; the engine DOES read both from the report. That's additive (engine surfaces more), not a breakage.

I have everything needed for the verdict.

---

VERDICT: PASS

summary: The engine is a disciplined pure reader: no inlined thresholds (grep confirms zero 0.78/0.55/0.15/0.7 literals), fail-soft on every error path (missing file, garbage JSON, non-object, null, primitives all handled), and staleness math is NaN-safe. One structural divergence from `classifyGnn` exists in the `selectiveOperatingPoint` shape but it maps correctly to the live NN-EVAL.json schema. The `parse_failed` error string does not echo file content. No P0 or P1 issues found.

findings:

- [P2] `H:/prism/mcp-server/src/engines/GnnDeployStatusEngine.ts:55-64` vs `H:/prism/.claude/hooks/nn-graph-health-inject.mjs:1
... [+4155 chars truncated]
