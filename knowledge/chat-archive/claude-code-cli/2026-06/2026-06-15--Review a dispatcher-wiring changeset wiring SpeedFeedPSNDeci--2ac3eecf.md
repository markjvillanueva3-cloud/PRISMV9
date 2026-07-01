---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "Review a dispatcher-wiring changeset wiring SpeedFeedPSNDecisionPriorEngine into"
date: "2026-06-15"
first_ts: "2026-06-15T16:38:38.099Z"
last_ts: "2026-06-15T16:40:03.257Z"
cwd: "H:\\prism-slot-papa"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-ac48e5d83be3a86c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# Review a dispatcher-wiring changeset wiring SpeedFeedPSNDecisionPriorEngine into

> **claude-code-cli** | 2026-06-15 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-ac48e5d83be3a86c4.jsonl`

## Transcript

### User | 2026-06-15T16:38:38.099Z

Review a dispatcher-wiring changeset wiring SpeedFeedPSNDecisionPriorEngine into prism_calc (PRISM, slot:papa, unit U-WIRE-SFC-PSN). Read END-TO-END (ABSOLUTE paths — repo at H:/prism, NOT cwd):

1. ENGINE: H:/prism/mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts — singleton `speedFeedPSNDecisionPriorEngine` (line ~368); class also exported. query(input: NineAxisInput): PSNDecisionPrior (line ~89) fuses 3 PSN sources (queryOutcomeLedger/queryTribalKnowledge/queryWiki), best-effort, never throws. constructor(projectRoot="H:/prism"). PSNDecisionPrior {fused, per_source[], prior_exists, summary}. NineAxisInput requires material + tooling.
2. DISPATCHER: H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts (search "U-WIRE-SFC-PSN" / "sfc_psn_decision_prior"). ACTIONS array (~1294), switch case (~10930 just before default).
3. SCHEMAS: H:/prism/mcp-server/src/schemas/calcActionSchemas.ts (search "sfc_psn_decision_prior", last entry).

VERIFY (grade P0/P1/P2/P3, then VERDICT PASS/FAIL):
- WIRING TRIPLE-MATCH: sfc_psn_decision_prior byte-identical in ACTIONS array, ACTION_CALC_SCHEMAS, switch case.
- READ-ONLY / DOMAIN-RESPECT (key check): confirm the case ONLY calls query() (a read). It must NOT call or modify any prior-mutation / fusion-physics method. The engine's priors and fusion logic belong to oscar; this is a wiring of the read surface only. Confirm no engine edit in this changeset (the changeset adds ACTIONS + schema + case + test, nothing in the engine file).
- BOUNDARY CAST: the case uses `params as unknown as Parameters<typeof speedFeedPSNDecisionPriorEngine.query>[0]` with a comment. Is this a legitimate validated-boundary cast (schema guarantees material+tooling objects; engine best-effort-extracts) or laundering a real bug? The single `as` would fail because calc's params is Record<string,unknown> and NineAxisInput is a specific shape — so `as unknown as` is the correct idiom here, not type-fighting. Confirm.
- SINGLETON STATELESS: query() i
... [+854 chars truncated]

### Assistant | 2026-06-15T16:38:44.384Z

I'll systematically read each file end-to-end to verify the dispatcher wiring for `sfc_psn_decision_prior`. Starting with all three files in parallel.

### Assistant | 2026-06-15T16:38:44.773Z

[tool_use: Read]

### Assistant | 2026-06-15T16:38:45.967Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:38:46.411Z

[tool_use: Grep]

### User | 2026-06-15T16:38:46.454Z

[tool_result] 1	/**
2	 * SpeedFeedPSNDecisionPriorEngine — surface a PSN-derived decision prior for SFC.
3	 *
4	 * Closes audit findings F3 (Obsidian-brain not wired) and F4 (wiki not wired)
5	 * from `state/shared/specs/SF-PSN-VALUE-NODE-AUDIT-2026-05-22.md`.
6	 *
7	 * The 9-axis orchestrator builds recommendations from canonical physics. This
8	 * engine asks 3 PSN surfaces — "what worked here before?" — and 
... [+16125 chars truncated]

### User | 2026-06-15T16:38:50.654Z

[tool_result] 1287-  "job_cost_rollup",
1288-  "quote_confidence_estimate",
1289-  "setup_time_predict",
1290-  "material_yield_optimize",
1291-  "customer_ltv_dcf",
1292-  \ U-WIRE-MOEA-STOP \ WIRE-UNWIRED-PAPA: MOEAStoppingCriterion HV-saturation stopping (slot:papa->tango 2026-06-15).
1293-  "moea_stopping_evaluate",
1294-  \ U-WIRE-SFC-PSN \ WIRE-UNWIRED-PAPA: SpeedFeedPSNDecisionPriorEngine.query -- read-o
... [+1562 chars truncated]

### User | 2026-06-15T16:38:52.563Z

[tool_result] 3732-[Omitted long context line]
3733-  \ U-WIRE-MOEA-STOP: MOEAStoppingCriterion HV-saturation stopping (slot:papa->tango 2026-06-15).
3734-  moea_stopping_evaluate: z.object({
3735-    fronts: z.array(z.array(z.array(z.number()))).min(1).describe("Sequence of per-generation Pareto fronts; each front is an array of objective vectors (minimization-normalized number[])"),
3736-    config: z.object(
... [+1371 chars truncated]

### Assistant | 2026-06-15T16:38:56.790Z

Now I have all three files read in full. Let me verify the surrounding context for the ACTIONS array position and the switch case boundaries to confirm no adjacent entries were altered.

### Assistant | 2026-06-15T16:38:57.937Z

[tool_use: Read]

### Assistant | 2026-06-15T16:38:58.718Z

[tool_use: Read]

### Assistant | 2026-06-15T16:38:59.170Z

[tool_use: Read]

### User | 2026-06-15T16:39:02.297Z

[tool_result] 1280	  "chip_control_strategy",
1281	  "taper_compensate",
1282	  "csg_tree_reduce",
1283	  "stock_envelope_compute",
1284	  "step_iges_diff",
1285	  "five_axis_tilt_lead",
1286	  "wedm_lead_geometry",
1287	  "job_cost_rollup",
1288	  "quote_confidence_estimate",
1289	  "setup_time_predict",
1290	  "material_yield_optimize",
1291	  "customer_ltv_dcf",
1292	  // U-WIRE-MOEA-STOP / WIRE-UNWIRED-PAPA
... [+462 chars truncated]

### User | 2026-06-15T16:39:03.781Z

[tool_result] 10910	            const fronts = params.fronts as number[][][];
10911	            const criterion = new MOEAStoppingCriterion(
10912	              (params.config ?? {}) as ConstructorParameters<typeof MOEAStoppingCriterion>[0],
10913	            );
10914	            let decision: ReturnType<typeof criterion.evaluate> | undefined;
10915	            for (const front of fronts) {
10916	              
... [+1395 chars truncated]

### User | 2026-06-15T16:39:04.108Z

[tool_result] 3725	        power: z.number().positive().optional().describe('Spindle rated power (kW) — engine checks against requiredPower. Default 15 if omitted.'),
3726	        torque: z.number().positive().optional().describe('Spindle rated torque (Nm) — engine checks against requiredTorque (with constant-power derating above base_rpm=1500). Default 100 if omitted.'),
3727	      }).passthrough().describe('M
... [+3078 chars truncated]

### Assistant | 2026-06-15T16:39:07.841Z

Now let me verify action-name uniqueness across all dispatchers to confirm no collision.

### Assistant | 2026-06-15T16:39:09.388Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:39:09.883Z

[tool_use: Grep]

### User | 2026-06-15T16:39:14.022Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:1295:  "sfc_psn_decision_prior",
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:10929:          case "sfc_psn_decision_prior": {

### User | 2026-06-15T16:39:15.970Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:1294:  // U-WIRE-SFC-PSN / WIRE-UNWIRED-PAPA: SpeedFeedPSNDecisionPriorEngine.query -- read-only PSN (outcome-ledger/tribal/wiki) decision-prior fusion; priors NOT edited (oscar domain). slot:papa->oscar 2026-06-15.
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:10928:          // U-WIRE-SFC-PSN / WIRE-UNWIRED-PAPA: SpeedFeed
... [+276 chars truncated]

### Assistant | 2026-06-15T16:40:03.257Z

All data is in hand. Here is the complete wiring review.

---

## Dispatcher Wiring Review — U-WIRE-SFC-PSN

**Engine:** `SpeedFeedPSNDecisionPriorEngine`
**File:** `H:/prism/mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts`
**Action:** `sfc_psn_decision_prior`
**Dispatcher:** `calcDispatcher` (`H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts`)
**Schema file:** `H:/prism/mcp-server/src/schemas/calcActionSchemas.ts`

---

### Check-by-check findings

**WIRING TRIPLE-MATCH**

All three surfaces carry the byte-identical string `sfc_psn_decision_prior`:

- ACTIONS array: `calcDispatcher.ts:1295` — `"sfc_psn_decision_prior",`
- Schema key: `calcActionSchemas.ts:3747` — `sfc_psn_decision_prior: z.object({...}).passthrough()`
- Switch case: `calcDispatcher.ts:10929` — `case "sfc_psn_decision_prior": {`

Triple-match confirmed. No spelling divergence across the three surfaces.

Grade: **P0 — PASS**

---

**READ-ONLY / DOMAIN-RESPECT**

The case body (`calcDispatcher.ts:10929-10934`) contains exactly one statement: `speedFeedPSNDecisionPriorEngine.query(...)`. No mutation method is called. The engine itself (`SpeedFeedPSNDecisionPriorEngine.ts`) exposes only one public method, `query()`, which is a pure read that calls three private methods (`queryOutcomeLedger`, `queryTribalKnowledge`, `queryWiki`) and `fuse()` / `summarize()` — all private, all read-only filesystem or heuristic operations. There is no call to any prior-mutation or fusion-physics method. The engine file itself is not modified by this changeset (the grep for `SpeedFeedPSNDecisionPriorEngine` in the dispatchers directory returns only `calcDispatcher.ts` hits, zero hits in the engine file, confirming no engine edit). The comment at `calcDispatcher.ts:1294` explicitly states "priors NOT edited (oscar domain)".

Grade: **P0 — PASS**

---

**BOUNDARY CAST**

`calcDispatcher.ts:10933`:

```
result = speedFeedPSNDecisionPriorEngine.query(params as unknown as Parameters<typeof speedFeedPSNDecisi
... [+5298 chars truncated]
