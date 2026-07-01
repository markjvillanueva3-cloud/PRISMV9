---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Independent final re-review of the `docustrata_customer_index` dispatcher wiring"
date: "2026-05-16"
first_ts: "2026-05-16T20:05:49.684Z"
last_ts: "2026-05-16T20:07:27.110Z"
cwd: "H:\\prism\\mcp-server"
messages: 24
user_msgs: 11
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6bf28848a1bfa9db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent final re-review of the `docustrata_customer_index` dispatcher wiring

> **claude-code-cli** | 2026-05-16 | 24 msgs (11 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6bf28848a1bfa9db.jsonl`

## Transcript

### User | 2026-05-16T20:05:49.684Z

Independent final re-review of the `docustrata_customer_index` dispatcher wiring after fixes. Read `H:/prism/mcp-server/src/schemas/cadActionSchemas.ts` and `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts`.

You previously flagged (P1-A) snake_case `part_number`/`sort_by` don't reach the engine because `normalizeParams` doesn't alias them, and (P1-B) the schema `limit: z.number().int().positive()` rejects `limit:0` even though the engine treats it as "empty list".

Fixes applied:
- `case "docustrata_customer_index"` now reads `params.partNumber ?? params.part_number` (for `find_pn` mode) and `params.sortBy ?? params.sort_by` (for `list` mode) so a snake_case caller is bridged in the case body, regardless of `normalizeParams`.
- Schema field changed to `limit: z.number().int().nonnegative().optional()` so `limit:0` validates and reaches the engine's `cleanLimit` → empty-list path.

Confirm — and do NOT assume the other reviewer caught everything:
1. Trace `{mode:"find_pn", part_number:"442A"}` through `normalizeParams` → `validateActionParams` → the case body — does the engine now receive `"442A"`?
2. Trace `{mode:"list", sort_by:"name", limit:0}` similarly. Does sort_by reach the engine as `"name"`? Does limit:0 reach the engine and produce an empty list?
3. Did the `??` add introduce any wrong-precedence or accidental coercion? `params.partNumber ?? params.part_number` — what if `params.partNumber` is the empty string `""`? (`??` does NOT fall through on `""`, only `null`/`undefined`. Is that the desired behavior for this engine?)
4. Schema `.nonnegative()` — does it correctly accept 0, reject negatives, reject NaN/Infinity, reject non-integers (because of `.int()`)?
5. Anything else P0/P1 in the wiring.

Report P0/P1 with line numbers, then end with exactly `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T20:05:59.708Z

I'll trace through the fixes independently. Let me read the relevant files.

### Assistant | 2026-05-16T20:06:00.708Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:06:01.805Z

[tool_use: Bash]

### User | 2026-05-16T20:06:04.901Z

[tool_result] 17:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
361:  "docustrata_customer_index",
382:          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
383:          params = normalizeParams(rawParams);
386:        const validation = validateActionParams(action, params, ACTION_CAD_SCHEMAS);
3855:          case "docustrata_custome
... [+183 chars truncated]

### User | 2026-05-16T20:06:05.719Z

[tool_result] 746:export const docustrataCustomerIndexSchema = z.object({
778:  docustrata_customer_index: docustrataCustomerIndexSchema,

### Assistant | 2026-05-16T20:06:09.941Z

[tool_use: Read]

### User | 2026-05-16T20:06:10.757Z

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
... [+1869 chars truncated]

### Assistant | 2026-05-16T20:06:10.945Z

[tool_use: Read]

### User | 2026-05-16T20:06:11.795Z

[tool_result] 370	    "prism_cad",
371	    `CAD/Geometry dispatcher — geometry operations, meshing, feature recognition, stock modeling, WCS setup, DfM checking.
372	Actions: ${ACTIONS.join(", ")}.
373	Params vary by action — pass relevant fields in params object.`,
374	    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
375	    async ({ action, params: rawParams = {} }: { action:
... [+1138 chars truncated]

### Assistant | 2026-05-16T20:06:11.942Z

[tool_use: Read]

### User | 2026-05-16T20:06:13.245Z

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
... [+2238 chars truncated]

### Assistant | 2026-05-16T20:06:17.756Z

Now let me verify the remaining details — normalizeParams behavior, the engine signatures, and the snake_case→camelCase conversion.

### Assistant | 2026-05-16T20:06:19.301Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:06:20.817Z

[tool_use: Bash]

### User | 2026-05-16T20:06:23.199Z

[tool_result] 10:/** Snake→camel alias map for manufacturing parameters */
88:    const alias = PARAM_ALIASES[key];
89:    if (alias && !(alias in result)) {
90:      result[alias] = value;
153:    const alias = REVERSE_ALIASES[key];
154:    if (alias && !(alias in result)) {
155:      result[alias] = value;

### User | 2026-05-16T20:06:24.939Z

[tool_result] 247:function cleanLimit(limit: unknown): number | undefined {
327:function listCustomers(
347:  const limit = cleanLimit(opts.limit);
360:function getCustomer(name: unknown, opts: QueryOpts = {}): GetResult {
390:function searchCustomers(
411:  const limit = cleanLimit(opts.limit);
421:function findByPartNumber(
460:  listCustomers,
461:  getCustomer,
462:  searchCustomers,
463:  findByPartNumber,

### Assistant | 2026-05-16T20:06:29.317Z

[tool_use: Read]

### Assistant | 2026-05-16T20:06:30.030Z

[tool_use: Read]

### Assistant | 2026-05-16T20:06:30.992Z

[tool_use: Read]

### User | 2026-05-16T20:06:32.762Z

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
... [+2924 chars truncated]

### User | 2026-05-16T20:06:33.759Z

[tool_result] 240	  });
241	}
242	
243	/** Clamp a caller-supplied limit. An omitted / non-finite limit -> undefined
244	 * (no limit); a present finite number -> max(0, floor) so a present-but-
245	 * non-positive limit (0, negative, fractional < 1) yields an EMPTY list, never
246	 * a silently unbounded one. */
247	function cleanLimit(limit: unknown): number | undefined {
248	  if (typeof limit !== "number" |
... [+1319 chars truncated]

### User | 2026-05-16T20:06:33.926Z

[tool_result] 320	    schemaVersion: r.index.schemaVersion,
321	    customerCount: Object.keys(r.index.customers).length,
322	    totals: r.index.totals ?? {},
323	  };
324	}
325	
326	/** All customers as bounded summary rows, sorted and optionally limited. */
327	function listCustomers(
328	  opts: QueryOpts & { sortBy?: SortKey; limit?: number } = {},
329	): ListResult {
330	  const p = opts.indexPath ?? defa
... [+4317 chars truncated]

### Assistant | 2026-05-16T20:07:27.110Z

Now I have full visibility into both files plus the engine + normalizer. Let me complete the trace.

The PARAM_ALIASES map has NO entries for `part_number` or `sort_by` (confirmed by reading the whole alias table). So `normalizeParams` is a no-op on those keys — the case-body `??` bridge is the only mechanism keeping snake_case callers alive.

Tracing the two scenarios:

**Trace 1 — `{mode:"find_pn", part_number:"442A"}`:**
1. `normalizeParams({mode, part_number:"442A"})`: no alias hits → returns `{mode, part_number:"442A"}` unchanged.
2. `validateActionParams(action, params, ACTION_CAD_SCHEMAS)`: `docustrataCustomerIndexSchema` is `z.object({...})` (NOT `.strict()`/`.passthrough()` — default is **strip**). Unknown key `part_number` is silently stripped from the **validation result**, but the validator only returns `{valid, errorMessage}` (line 386) — the dispatcher continues using the **original `params` object** (with `part_number` still present). Validation passes (only `mode:"find_pn"` is required by schema; `partNumber` is optional).
3. Case body line 3887: `params.partNumber ?? params.part_number` → `undefined ?? "442A"` → `"442A"` reaches `findByPartNumber("442A")`. PASS.

**Trace 2 — `{mode:"list", sort_by:"name", limit:0}`:**
1. `normalizeParams`: no alias for `sort_by` → unchanged.
2. Validation: `mode:"list"` ✓; `sort_by:"name"` stripped on validation copy (irrelevant — see trace 1); `limit:0` — schema is now `z.number().int().nonnegative().optional()` → `0` is a non-negative integer → PASSES.
3. Case body line 3870-3873: `sortBy: params.sortBy ?? params.sort_by` → `undefined ?? "name"` → `"name"`. `limit: params.limit` → `0`. Engine `listCustomers({sortBy:"name", limit:0})`: line 340 confirms `"name"` is a key of `SORT_FIELD` via `hasOwnProperty` (registry sort keys include `name`); `cleanLimit(0)` → `Math.max(0, Math.floor(0))` → `0`; line 348 `sorted.slice(0, 0)` → `[]` (empty list). PASS.

**Question 3 — `??` precedence and empty-string semantics:**
`
... [+3711 chars truncated]
