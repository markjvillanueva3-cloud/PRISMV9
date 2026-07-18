---
type: "chat-session"
source: "claude-code-cli"
session_id: "745cce01-7d94-42ad-9b6e-b4cb839608b6"
title: "Review a PRISM orphan-rescue engine-wiring change. `VariabilityEnvelopeEngine` w"
date: "2026-05-14"
first_ts: "2026-05-14T20:38:08.511Z"
last_ts: "2026-05-14T20:40:37.838Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 18
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/745cce01-7d94-42ad-9b6e-b4cb839608b6/subagents/agent-a263a3e1f3bbbcf02.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a PRISM orphan-rescue engine-wiring change. `VariabilityEnvelopeEngine` w

> **claude-code-cli** | 2026-05-14 | 41 msgs (18 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/745cce01-7d94-42ad-9b6e-b4cb839608b6/subagents/agent-a263a3e1f3bbbcf02.jsonl`

## Transcript

### User | 2026-05-14T20:38:08.511Z

Review a PRISM orphan-rescue engine-wiring change. `VariabilityEnvelopeEngine` was wired into the `prism_adaptive_control` MCP dispatcher as 8 new actions. You have NO prior context — Read every file below in full before analyzing.

Files changed:
1. `H:/prism/mcp-server/src/engines/VariabilityEnvelopeEngine.ts` — ONLY change: `class VariabilityEnvelopeEngine` → `export class VariabilityEnvelopeEngine` (line ~45), to enable `new` instances in tests. The singleton `export const variabilityEnvelopeEngine` at the bottom is unchanged.
2. `H:/prism/mcp-server/src/schemas/adaptiveControlActionSchemas.ts` — added 2 shared sub-schemas (`_variabilityEnvelopeShape`, `_variabilityEvidence`) + 8 action schemas (`variability_evaluate`, `variability_get_envelope`, `variability_set_envelope`, `variability_expand`, `variability_apply_expansion`, `variability_export`, `variability_import`, `variability_outliers`) + 8 entries in the `ADAPTIVE_CONTROL_ACTION_SCHEMAS` export map.
3. `H:/prism/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts` — added `let _var: any;` + a `case "var":` in the `getEngine()` lazy-cache helper, 8 entries in the `ACTIONS` enum, 8 switch cases before `default:`, and bumped the registration log count 23→31.

The engine `VariabilityEnvelopeEngine.ts` is a STATEFUL singleton (in-memory `envelopes` Map seeded with 8 defaults, `outlierBuffer` Map). Public methods: `evaluate(parameter, value, context?): EnvelopeEvaluation`, `getEnvelope(parameter): VariabilityEnvelope | undefined`, `setEnvelope(parameter, envelope): void`, `expandEnvelope(parameter, evidence[]): EnvelopeExpansionProposal | null` (returns null if <3 successful outliers above p999), `applyExpansion(proposal): void`, `exportEnvelopes(): Record<string, VariabilityEnvelope>`, `importEnvelopes(data): void`, `getOutlierBuffer(): Map<string, number[]>`.

Verify against PRISM dispatcher conventions:
- Every action in `ACTIONS` enum has a matching switch case AND a schema-map entry (and vice ver
... [+1443 chars truncated]

### Assistant | 2026-05-14T20:38:11.809Z

I'll read all three files in full before analyzing.

### Assistant | 2026-05-14T20:38:12.240Z

[tool_use: Read]

### Assistant | 2026-05-14T20:38:12.639Z

[tool_use: Read]

### Assistant | 2026-05-14T20:38:12.747Z

[tool_use: Read]

### User | 2026-05-14T20:38:18.552Z

[tool_result] 1	/**
2	 * VariabilityEnvelopeEngine — Probabilistic Parameter Boundaries
3	 *
4	 * Phase 0.25: Adaptive Variability Framework
5	 *
6	 * Replaces hard min/max limits with probabilistic envelopes that adapt
7	 * based on evidence. NO HARD CAPS — all parameters use adaptive boundaries.
8	 *
9	 * @module engines/VariabilityEnvelopeEngine
10	 */
11	
12	export interface VariabilityEnvelope {
13	  param
... [+8617 chars truncated]

### User | 2026-05-14T20:38:19.798Z

[tool_result] 1	/**
2	 * Adaptive Control Dispatcher Action Schemas
3	 * ============================================
4	 * Per-action Zod schemas for all 12 prism_adaptive_control actions.
5	 * SCI-MS1: Adaptive feed/spindle control, Bayesian calibration,
6	 * tool life prediction, digital twin sync.
7	 *
8	 * @module schemas/adaptiveControlActionSchemas
9	 * @version 1.0.0
10	 */
11	
12	import { z } from "zod"
... [+19973 chars truncated]

### User | 2026-05-14T20:38:20.153Z

[tool_result] 1	/**
2	 * prism_adaptive_control — Adaptive Control & Digital Twin Dispatcher
3	 *
4	 * 12 actions: adaptive_feed, adaptive_feed_tune, adaptive_spindle,
5	 *   adaptive_spindle_stability, adaptive_spindle_chatter, bayesian_calibrate,
6	 *   bayesian_predict_force, tool_life_predict, tool_life_weibull,
7	 *   tool_life_replacement, digital_twin_sync, digital_twin_query
8	 *
9	 * Engine dependencie
... [+14344 chars truncated]

### Assistant | 2026-05-14T20:38:23.472Z

I have all three files in full. Now I'll perform the complete wiring analysis.

### Assistant | 2026-05-14T20:38:24.740Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:38:25.986Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:38:27.279Z

[tool_use: Grep]

### User | 2026-05-14T20:38:29.299Z

[tool_result] mcp-server\src\tools\dispatchers\adaptiveControlDispatcher.ts:37:    // ORPHAN-RESCUE: VariabilityEnvelopeEngine — probabilistic parameter boundaries
mcp-server\src\tools\dispatchers\adaptiveControlDispatcher.ts:39:    case "var": return _var ??= (await import("../../engines/VariabilityEnvelopeEngine.js")).variabilityEnvelopeEngine;
mcp-server\src\tools\dispatchers\adaptiveControlDispatcher.ts:55:
... [+224 chars truncated]

### User | 2026-05-14T20:38:30.141Z

[tool_result] Found 1 file
mcp-server\src\tools\dispatchers\adaptiveControlDispatcher.ts

### User | 2026-05-14T20:38:31.621Z

[tool_result] 15:import { slimResponse } from "../../utils/responseSlimmer.js";
235:            // slimResponse strips a null envelope — `found` carries the signal regardless.
298:      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };

### Assistant | 2026-05-14T20:38:35.719Z

Good — the 8 action names appear in exactly one dispatcher file. Now I need to verify the return shape convention, check for the `{success:true, data}` rule discrepancy flagged in the dispatcher rules, inspect the `variability_apply_expansion` null-proposal risk, and confirm the barrel export.

### Assistant | 2026-05-14T20:38:36.451Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:38:37.512Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:38:38.424Z

[tool_use: Grep]

### User | 2026-05-14T20:38:46.090Z

[tool_result] No matches found

### User | 2026-05-14T20:38:46.588Z

[tool_result] 15:import { slimResponse } from "../../utils/responseSlimmer.js";
235:            // slimResponse strips a null envelope — `found` carries the signal regardless.
298:      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };

### User | 2026-05-14T20:38:46.990Z

[tool_result] 10:export function slimResponse<T>(response: T): T {
18:    return response.map(slimResponse) as T;
25:    slimmed[key] = typeof value === "object" ? slimResponse(value) : value;

### Assistant | 2026-05-14T20:38:49.271Z

[tool_use: Read]

### Assistant | 2026-05-14T20:38:49.844Z

[tool_use: Glob]

### User | 2026-05-14T20:38:58.308Z

[tool_result] mcp-server\src\engines\index.ts

### User | 2026-05-14T20:39:03.424Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 */
10	export function slimResponse<T>(response: T): T {
11	  if (response === null || response === undefined) {
12	    return response;
13	  }
14	  if (typeof resp
... [+1179 chars truncated]

### Assistant | 2026-05-14T20:39:08.541Z

Good. Now check the barrel export and the `variability_apply_expansion` null-proposal risk path.

### Assistant | 2026-05-14T20:39:09.842Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:39:11.165Z

[tool_use: Grep]

### User | 2026-05-14T20:39:16.919Z

[tool_result] No matches found

### User | 2026-05-14T20:39:19.358Z

[tool_result] 82:export function normalizeParams(params: Record<string, any>): Record<string, any> {
148:export function normalizeParamsSnake(params: Record<string, any>): Record<string, any> {

### Assistant | 2026-05-14T20:39:21.922Z

[tool_use: Read]

### Assistant | 2026-05-14T20:39:23.319Z

[tool_use: Grep]

### User | 2026-05-14T20:39:28.665Z

[tool_result] No matches found

### User | 2026-05-14T20:39:29.694Z

[tool_result] 82	export function normalizeParams(params: Record<string, any>): Record<string, any> {
83	  if (!params || typeof params !== "object") return params;
84	  const result = { ...params };
85	  let remapped = 0;
86	  
87	  for (const [key, value] of Object.entries(params)) {
88	    const alias = PARAM_ALIASES[key];
89	    if (alias && !(alias in result)) {
90	      result[alias] = value;
91	      rema
... [+1745 chars truncated]

### Assistant | 2026-05-14T20:39:32.708Z

I have everything I need. Let me now do the full count verification before delivering the final report.

### Assistant | 2026-05-14T20:39:34.322Z

[tool_use: Grep]

### Assistant | 2026-05-14T20:39:35.193Z

[tool_use: Grep]

### User | 2026-05-14T20:39:37.721Z

[tool_result] 56:  "variability_evaluate", "variability_get_envelope", "variability_set_envelope",
57:  "variability_expand", "variability_apply_expansion",
58:  "variability_export", "variability_import", "variability_outliers",

### User | 2026-05-14T20:39:39.315Z

[tool_result] 333:const variability_evaluate = z.object({
339:const variability_get_envelope = z.object({
343:const variability_set_envelope = z.object({
348:const variability_expand = z.object({
353:const variability_apply_expansion = z.object({
361:  }).passthrough().describe("EnvelopeExpansionProposal produced by variability_expand"),
364:const variability_export = z.object({}).passthrough();
366:const varia
... [+320 chars truncated]

### Assistant | 2026-05-14T20:40:37.838Z

I now have complete information. Here is the full wiring review.

---

## Dispatcher Wiring Review — VariabilityEnvelopeEngine Orphan-Rescue

### Engine Report

```json
{
  "engine": "VariabilityEnvelopeEngine",
  "file": "H:/prism/mcp-server/src/engines/VariabilityEnvelopeEngine.ts",
  "dispatcher": "prism_adaptive_control (adaptiveControlDispatcher)",
  "z_enum": true,
  "case_statement": true,
  "lazy_import": true,
  "schema": true,
  "action_unique": true,
  "exported": false,
  "issues": [
    {
      "severity": "HIGH",
      "rule": "Barrel Export — engine not in index.ts",
      "detail": "VariabilityEnvelopeEngine (class) and variabilityEnvelopeEngine (singleton) are absent from H:/prism/mcp-server/src/engines/index.ts. The dispatcher imports directly via lazy path import, which works at runtime, but the barrel contract is broken — any consumer that imports from the barrel gets nothing."
    },
    {
      "severity": "HIGH",
      "rule": "Dispatcher docblock header is stale",
      "detail": "adaptiveControlDispatcher.ts line 3 reads '12 actions: adaptive_feed, ...' and lists only 5 engine dependencies. After this change there are 32 actions and 12 engine dependencies. The stale header is misleading but not a runtime break. The registration log on line 301 ('31 actions') is also wrong — ACTIONS now has 32 entries (count them: 12 original + 6 calibration + 5 ENGINE-WIRE-MS0 + 8 variability = 31... wait)."
    },
    {
      "severity": "HIGH",
      "rule": "Registration log count mismatch",
      "detail": "Line 301: log.info('Registered: prism_adaptive_control dispatcher (31 actions)'). Actual ACTIONS array count: adaptive_feed, adaptive_feed_tune, adaptive_spindle, adaptive_spindle_stability, adaptive_spindle_chatter (5) + bayesian_calibrate, bayesian_predict_force (2) + tool_life_predict, tool_life_weibull, tool_life_replacement (3) + digital_twin_sync, digital_twin_query (2) + calibration_kienzle, calibration_taylor, calibration_surface_bias, calibra
... [+6985 chars truncated]
