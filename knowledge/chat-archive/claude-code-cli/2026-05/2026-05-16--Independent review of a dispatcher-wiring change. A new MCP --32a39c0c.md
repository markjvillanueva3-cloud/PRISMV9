---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Independent review of a dispatcher-wiring change. A new MCP action `docustrata_c"
date: "2026-05-16"
first_ts: "2026-05-16T19:45:38.466Z"
last_ts: "2026-05-16T19:47:09.986Z"
cwd: "H:\\prism\\mcp-server"
messages: 37
user_msgs: 15
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a49b8b00d619eb5a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent review of a dispatcher-wiring change. A new MCP action `docustrata_c

> **claude-code-cli** | 2026-05-16 | 37 msgs (15 user / 22 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a49b8b00d619eb5a1.jsonl`

## Transcript

### User | 2026-05-16T19:45:38.466Z

Independent review of a dispatcher-wiring change. A new MCP action `docustrata_customer_index` was added to the `prism_cad` dispatcher across two files (the engine `DocustrataCustomerIndexEngine.ts` was reviewed separately — assume it is correct):

- `H:/prism/mcp-server/src/schemas/cadActionSchemas.ts` — new `docustrataCustomerIndexSchema` + a `docustrata_customer_index` key in `ACTION_CAD_SCHEMAS`.
- `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` — `"docustrata_customer_index"` added to the `ACTIONS` `as const` array; a `case "docustrata_customer_index"` added to the `switch (action)` just before `default:`.

Read both files (the relevant regions). Weight your review toward:
1. PARAM FLOW: the dispatcher runs `normalizeParams` (snake_case → camelCase) then `validateActionParams` against the per-action schema BEFORE the switch. Trace: a caller sends `{action:"docustrata_customer_index", params:{mode:"find_pn", part_number:"442A"}}`. Does `part_number` become `partNumber`? Does the schema (which declares `partNumber`) accept it? Does the engine call `findByPartNumber(params.partNumber)` receive it? Check `mode:"get"` with `customer`, `mode:"search"` with `query`, `mode:"list"` with `sortBy`/`limit` the same way.
2. SCHEMA STRICTNESS: a plain `z.object` strips unknown keys. Is anything the engine needs stripped? Is `limit` typed `z.number().int().positive()` — does that reject the engine-meaningful `limit:0`? (The engine treats 0 as "empty list"; if the schema rejects 0 the dispatcher caller can never request it — is that acceptable / intended?)
3. CASE CORRECTNESS: the inner `switch (mode)` — does it set `result` on every path including the (Zod-unreachable) default? Any missing `break`? Does `result = {success:true, data}` match how the surrounding cases and the final `return {content:[...JSON.stringify(slimResponse(result))]}` expect `result` to be shaped?
4. The `as const` ACTIONS array drives `z.enum(ACTIONS)` — confirm the new entry doesn't break 
... [+164 chars truncated]

### Assistant | 2026-05-16T19:45:43.257Z

I'll review the dispatcher-wiring change by reading both files.

### Assistant | 2026-05-16T19:45:44.008Z

[tool_use: Bash]

### Assistant | 2026-05-16T19:45:44.979Z

[tool_use: Bash]

### User | 2026-05-16T19:45:49.606Z

[tool_result] 746:export const docustrataCustomerIndexSchema = z.object({
773:  docustrata_customer_index: docustrataCustomerIndexSchema,

### User | 2026-05-16T19:45:50.538Z

[tool_result] 16:import { slimResponse } from "../../utils/responseSlimmer.js";
17:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
105:const ACTIONS = [
226:  "gt_blueprint_register", "gt_blueprint_join_docustrata", "gt_enumerate_by_tier",
361:  "docustrata_customer_index",
372:Actions: ${ACTIONS.join(", ")}.
374:    { action: z.enum(ACTIONS), params: z.record(z.stri
... [+1206 chars truncated]

### Assistant | 2026-05-16T19:45:52.499Z

Let me read the relevant regions of both files.

### Assistant | 2026-05-16T19:45:53.302Z

[tool_use: Read]

### Assistant | 2026-05-16T19:45:54.126Z

[tool_use: Read]

### User | 2026-05-16T19:45:54.151Z

[tool_result] 740	});
741	
742	/**
743	 * DocustrataCustomerIndexEngine — query the per-customer-folder rollup of the
744	 * Docustrata print archive (programs / CAD / matched prints per JM-Die customer).
745	 */
746	export const docustrataCustomerIndexSchema = z.object({
747	  mode: z
748	    .enum(["available", "totals", "list", "get", "search", "find_pn"])
749	    .describe(
750	      "available=is the index
... [+1787 chars truncated]

### User | 2026-05-16T19:45:54.975Z

[tool_result] 3850	            } catch (err) {
3851	              result = dispatcherError(err, action, "prism_cad");
3852	            }
3853	            break;
3854	          }
3855	          case "docustrata_customer_index": {
3856	            const { docustrataCustomerIndexEngine } = await import(
3857	              "../../engines/DocustrataCustomerIndexEngine.js"
3858	            );
3859	            const m
... [+2026 chars truncated]

### Assistant | 2026-05-16T19:45:55.015Z

[tool_use: Read]

### User | 2026-05-16T19:45:56.380Z

[tool_result] 375	    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
376	      log.info(`[prism_cad] Action: ${action}`);
377	      let result: any;
378	      try {
379	        // H1-MS2: Auto-normalize snake_case → camelCase params
380	        let params = rawParams;
381	        try {
382	          const { normalizeParams } = await import("../.
... [+798 chars truncated]

### Assistant | 2026-05-16T19:45:59.723Z

Now let me verify the engine method signatures to confirm the param flow, and check `normalizeParams` behavior for the `find_pn` → `partNumber` case.

### Assistant | 2026-05-16T19:46:00.980Z

[tool_use: Bash]

### Assistant | 2026-05-16T19:46:01.458Z

[tool_use: Read]

### User | 2026-05-16T19:46:02.288Z

[tool_result] 1	/**
2	 * PRISM Param Normalizer
3	 * ======================
4	 * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
5	 * Applied at dispatcher entry before handler functions.
6	 * 
7	 * @version 1.0.0 — H1-MS2
8	 */
9	
10	/** Snake→camel alias map for manufacturing parameters */
11	const PARAM_ALIASES: Record<string, string> = {
12	  // Geometry
13	  tool_diameter: "to
... [+5952 chars truncated]

### User | 2026-05-16T19:46:04.514Z

[tool_result] 303:function isAvailable(opts: QueryOpts = {}): AvailabilityResult {
310:function getTotals(opts: QueryOpts = {}): TotalsResult {
327:function listCustomers(
360:function getCustomer(name: unknown, opts: QueryOpts = {}): GetResult {
390:function searchCustomers(
421:function findByPartNumber(
458:  isAvailable,
459:  getTotals,
460:  listCustomers,
461:  getCustomer,
462:  searchCustomers,
463:  f
... [+16 chars truncated]

### Assistant | 2026-05-16T19:46:07.885Z

This is the critical finding. Let me confirm the `normalizeParams` behavior: it does **not** strip keys (it adds camelCase alongside) and it has **no** alias entry for `part_number`. Let me read the engine method signatures and `validateActionParams` to complete the trace.

### Assistant | 2026-05-16T19:46:09.577Z

[tool_use: Read]

### Assistant | 2026-05-16T19:46:10.281Z

[tool_use: Bash]

### User | 2026-05-16T19:46:11.398Z

[tool_result] 300	}
301	
302	/** Is the customer-folder index present and parseable? */
303	function isAvailable(opts: QueryOpts = {}): AvailabilityResult {
304	  const p = opts.indexPath ?? defaultIndexPath();
305	  const r = loadIndex(p);
306	  return { available: r.available, path: r.path, error: r.error };
307	}
308	
309	/** Index-wide totals + provenance. */
310	function getTotals(opts: QueryOpts = {}): To
... [+5923 chars truncated]

### User | 2026-05-16T19:46:14.190Z

[tool_result] 76:export function validateActionParams(
86:  const result = schema.safeParse(params);

### Assistant | 2026-05-16T19:46:17.510Z

Let me read `validateActionParams` to confirm whether it strips keys or fails on unknowns, and `cleanLimit` to verify the `limit:0` handling.

### Assistant | 2026-05-16T19:46:18.366Z

[tool_use: Read]

### Assistant | 2026-05-16T19:46:19.062Z

[tool_use: Bash]

### User | 2026-05-16T19:46:19.328Z

[tool_result] 76	export function validateActionParams(
77	  action: string,
78	  params: Record<string, unknown>,
79	  schemas: Record<string, z.ZodTypeAny>,
80	): ValidationResult {
81	  const schema = schemas[action];
82	  if (!schema) {
83	    // No schema = pass through (valid)
84	    return { valid: true, success: true, data: params };
85	  }
86	  const result = schema.safeParse(params);
87	  if (result.su
... [+657 chars truncated]

### User | 2026-05-16T19:46:22.630Z

[tool_result] 247:function cleanLimit(limit: unknown): number | undefined {
347:  const limit = cleanLimit(opts.limit);
411:  const limit = cleanLimit(opts.limit);

### Assistant | 2026-05-16T19:46:25.809Z

Critical detail: `validateActionParams` returns `result.data` (the **parsed** output, which strips unknown keys), but the dispatcher discards it. Let me confirm the dispatcher uses `validation.data` or the pre-validation `params`, and read `cleanLimit`.

### Assistant | 2026-05-16T19:46:26.709Z

[tool_use: Read]

### Assistant | 2026-05-16T19:46:27.557Z

[tool_use: Read]

### User | 2026-05-16T19:46:27.958Z

[tool_result] 245	 * non-positive limit (0, negative, fractional < 1) yields an EMPTY list, never
246	 * a silently unbounded one. */
247	function cleanLimit(limit: unknown): number | undefined {
248	  if (typeof limit !== "number" || !Number.isFinite(limit)) return undefined;
249	  return Math.max(0, Math.floor(limit));
250	}
251	
252	// =========================================================================
... [+322 chars truncated]

### User | 2026-05-16T19:46:28.583Z

[tool_result] 386	        const validation = validateActionParams(action, params, ACTION_CAD_SCHEMAS);
387	        if (!validation.valid) {
388	          return dispatcherError(
389	            `Invalid params for '${action}': ${validation.errorMessage}`,
390	            action,
391	            "prism_cad"
392	          );
393	        }
394	
395	        switch (action) {

### Assistant | 2026-05-16T19:46:33.400Z

I have the complete trace. The dispatcher uses the pre-validation `params` object (not `validation.data`), so Zod stripping does not actually affect what reaches the engine — but I need to verify one final point about `as const` array structure.

### Assistant | 2026-05-16T19:46:34.086Z

[tool_use: Read]

### User | 2026-05-16T19:46:34.914Z

[tool_result] 355	  // lathe template; family enum is already constrained to the 4 OSP-anchored lathe families by the schema.
356	  "cad_lathe_template_place",          // MacroLibraryEngine.placeMacroTemplate — lathe-scoped bridge under prism_cad
357	  // U-PPL-D4 (MS-PRINT-PROGRAM-LOOP Track D): pure composition over UniversalCADIndexEngine
358	  // output + lathe .MIN entries → unified ProgramEquivalentIndex
... [+317 chars truncated]

### Assistant | 2026-05-16T19:47:09.986Z

I have everything needed for a complete review.

## Code Review — `docustrata_customer_index` dispatcher wiring

### 1. PARAM FLOW — traced end to end

The dispatcher discards `validation.data` and switches on the pre-validation `params` object (`cadDispatcher.ts:386` captures `validation` only to check `.valid`; line 395 onward reads `params`, which was set by `normalizeParams` at line 383). So Zod strictness does **not** govern what the engine receives — `normalizeParams` output does. Trace per mode:

- **`mode:"find_pn"`, `part_number:"442A"`** — **CORRECT, but not for the reason the schema implies.** `normalizeParams` has **no `part_number` alias** in `PARAM_ALIASES` (`paramNormalizer.ts:11-67`). It does *not* rename `part_number` → `partNumber`. However, `normalizeParams` is **additive and non-destructive** (`paramNormalizer.ts:84` `{...params}`, comment line 76-77 "Does NOT remove original keys"), so the original `part_number` key survives. The dispatcher reads `params.partNumber` at `cadDispatcher.ts:3885` — which is `undefined`. `findByPartNumber(undefined)` then hits the engine guard (`DocustrataCustomerIndexEngine.ts:426` `typeof partNumber === "string" ? ... : ""` → empty → line 427-432 returns a structured `error: "a non-empty part number is required"`). **Net result: a caller sending snake_case `part_number` gets a "required" error even though they supplied the value.** See P1-A below.
- **`mode:"get"`, `customer`** — `customer` is already a single lowercase token, no snake_case, passes through `normalizeParams` untouched; `params.customer` reaches `getCustomer` (line 3875). CORRECT.
- **`mode:"search"`, `query`** — single token, untouched; `params.query` reaches `searchCustomers` (line 3879). CORRECT.
- **`mode:"list"`, `sort_by`/`limit`** — `sort_by` is **not** in `PARAM_ALIASES` either; if a caller sends `sort_by` it survives as-is and `params.sortBy` is `undefined` → engine falls back to `"programs"` (`DocustrataCustomerIndexEngine.ts:338-342`), sil
... [+4383 chars truncated]
