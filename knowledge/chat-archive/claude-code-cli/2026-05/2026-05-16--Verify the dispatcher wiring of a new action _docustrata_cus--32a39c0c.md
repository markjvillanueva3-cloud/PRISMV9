---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Verify the dispatcher wiring of a new action `docustrata_customer_index` on the "
date: "2026-05-16"
first_ts: "2026-05-16T19:45:26.482Z"
last_ts: "2026-05-16T19:46:19.839Z"
cwd: "H:\\prism\\mcp-server"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af26e8633c2d36e53.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Verify the dispatcher wiring of a new action `docustrata_customer_index` on the 

> **claude-code-cli** | 2026-05-16 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af26e8633c2d36e53.jsonl`

## Transcript

### User | 2026-05-16T19:45:26.482Z

Verify the dispatcher wiring of a new action `docustrata_customer_index` on the `prism_cad` dispatcher. Three files were edited:

1. `H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` — the engine (already separately reviewed; exports `docustrataCustomerIndexEngine` with methods `isAvailable`, `getTotals`, `listCustomers({sortBy?,limit?})`, `getCustomer(name)`, `searchCustomers(query,{limit?})`, `findByPartNumber(partNumber)`).
2. `H:/prism/mcp-server/src/schemas/cadActionSchemas.ts` — added `docustrataCustomerIndexSchema` (a `z.object` with `mode` enum `available|totals|list|get|search|find_pn`, optional `customer`/`query`/`partNumber`/`sortBy`/`limit`) and a `docustrata_customer_index` entry in the `ACTION_CAD_SCHEMAS` map.
3. `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` — added `"docustrata_customer_index"` to the `ACTIONS` array and a `case "docustrata_customer_index"` in the switch that lazy-imports the engine and routes on `params.mode`.

VERIFY the wiring is complete and consistent (this is what the project's dispatcher conventions require):
1. The action string in the `ACTIONS` array (cadDispatcher.ts) EXACTLY matches the `case` label AND the `ACTION_CAD_SCHEMAS` map key (cadActionSchemas.ts). Spelling, snake_case.
2. The schema is registered in `ACTION_CAD_SCHEMAS` so `validateActionParams(action, params, ACTION_CAD_SCHEMAS)` will validate it.
3. The lazy import path `"../../engines/DocustrataCustomerIndexEngine.js"` is correct and the imported symbol `docustrataCustomerIndexEngine` matches the engine's actual export.
4. Every engine method called in the `case` exists with the argument shape used, and the `mode` sub-switch covers every value of the schema's `mode` enum (available/totals/list/get/search/find_pn) — no enum value unhandled, no handled value missing from the enum.
5. The case sets `result = { success: true, data: ... }` per the dispatcher's return convention and has a correct `break`.
6. No action-count regressio
... [+196 chars truncated]

### Assistant | 2026-05-16T19:45:29.648Z

I'll read all three files in parallel to verify the wiring.

### Assistant | 2026-05-16T19:45:30.047Z

[tool_use: Read]

### Assistant | 2026-05-16T19:45:30.497Z

[tool_use: Read]

### User | 2026-05-16T19:45:30.542Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\DocustrataCustomerIndexEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1778960407494). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-16T19:45:30.847Z

[tool_use: Read]

### User | 2026-05-16T19:45:31.527Z

[tool_result] File content (75727 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-16T19:45:31.601Z

[tool_result] 1	/**
2	 * CAD Dispatcher Action Schemas
3	 *
4	 * Zod schemas for prism_cad dispatcher actions.
5	 * Per dispatcher conventions: every action should have a schema.
6	 *
7	 * @module schemas/cadActionSchemas
8	 */
9	
10	import { z } from "zod";
11	
12	// ── Geometry Actions ──────────────────────────────────────────────────────────
13	const geometryCreateSchema = z.object({
14	  type: z.enum(["box
... [+48795 chars truncated]

### Assistant | 2026-05-16T19:45:34.012Z

I need to read the cadDispatcher.ts file in targeted sections to find the ACTIONS array and the docustrata_customer_index case. Let me search for the relevant portions.

### Assistant | 2026-05-16T19:45:35.412Z

[tool_use: Grep]

### User | 2026-05-16T19:45:36.005Z

[tool_result] 361:  "docustrata_customer_index",
3855:          case "docustrata_customer_index": {

### Assistant | 2026-05-16T19:45:36.184Z

[tool_use: Grep]

### User | 2026-05-16T19:45:37.052Z

[tool_result] 2: * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
466:export type DocustrataCustomerIndexEngine = typeof docustrataCustomerIndexEngine;

### Assistant | 2026-05-16T19:45:38.763Z

Good, the action string appears in the ACTIONS array at line 361 and the case is at line 3855. Now I need to read those specific sections.

### Assistant | 2026-05-16T19:45:39.743Z

[tool_use: Read]

### Assistant | 2026-05-16T19:45:40.678Z

[tool_use: Read]

### User | 2026-05-16T19:45:41.052Z

[tool_result] 355	  // lathe template; family enum is already constrained to the 4 OSP-anchored lathe families by the schema.
356	  "cad_lathe_template_place",          // MacroLibraryEngine.placeMacroTemplate — lathe-scoped bridge under prism_cad
357	  // U-PPL-D4 (MS-PRINT-PROGRAM-LOOP Track D): pure composition over UniversalCADIndexEngine
358	  // output + lathe .MIN entries → unified ProgramEquivalentIndex
... [+407 chars truncated]

### Assistant | 2026-05-16T19:45:41.486Z

[tool_use: Grep]

### User | 2026-05-16T19:45:41.704Z

[tool_result] 3848	              });
3849	              result = { success: true, data: composeResult };
3850	            } catch (err) {
3851	              result = dispatcherError(err, action, "prism_cad");
3852	            }
3853	            break;
3854	          }
3855	          case "docustrata_customer_index": {
3856	            const { docustrataCustomerIndexEngine } = await import(
3857	              ".
... [+2117 chars truncated]

### User | 2026-05-16T19:45:42.159Z

[tool_result] 455:export const docustrataCustomerIndexEngine = {

### Assistant | 2026-05-16T19:45:44.747Z

Now I need to verify the engine's exported methods to confirm the symbol name and method signatures match what the dispatcher calls.

### Assistant | 2026-05-16T19:45:45.685Z

[tool_use: Read]

### Assistant | 2026-05-16T19:45:47.006Z

[tool_use: Grep]

### User | 2026-05-16T19:45:47.568Z

[tool_result] 440	    if (!isPlainObject(e)) continue;
441	    const pns = strArray((e as Partial<CustomerEntry>).part_numbers);
442	    if (pns.some((x) => x.trim().toLowerCase() === target)) hits.push(name);
443	  }
444	  hits.sort((a, b) => a.localeCompare(b));
445	  return {
446	    available: true, path: r.path, partNumber: pn,
447	    count: hits.length, customers: hits,
448	  };
449	}
450	
451	// =======
... [+491 chars truncated]

### User | 2026-05-16T19:45:47.747Z

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

### Assistant | 2026-05-16T19:45:50.155Z

Now let me verify the function signatures for the methods the dispatcher calls with arguments, to confirm argument shape compatibility.

### Assistant | 2026-05-16T19:45:51.028Z

[tool_use: Read]

### User | 2026-05-16T19:45:51.848Z

[tool_result] 327	function listCustomers(
328	  opts: QueryOpts & { sortBy?: SortKey; limit?: number } = {},
329	): ListResult {
330	  const p = opts.indexPath ?? defaultIndexPath();
331	  const r = loadIndex(p);
332	  if (!r.available || !r.index) {
333	    return { available: false, error: r.error, path: r.path };
334	  }
335	  // `?? "programs"` only guards null/undefined; an invalid string sortBy
336	  // (
... [+3598 chars truncated]

### Assistant | 2026-05-16T19:46:19.839Z

I now have all the information needed. Let me compile the full wiring verification.

---

## Dispatcher Wiring Review: `docustrata_customer_index` on `prism_cad`

### Check 1 — Action string consistency (ACTIONS array, case label, schema map key)

- `cadDispatcher.ts` line 361: `"docustrata_customer_index"` in the `ACTIONS` array
- `cadDispatcher.ts` line 3855: `case "docustrata_customer_index":` — exact match
- `cadActionSchemas.ts` line 773: `docustrata_customer_index: docustrataCustomerIndexSchema` in `ACTION_CAD_SCHEMAS` — exact match

All three spellings are identical. No mismatch.

### Check 2 — Schema registration in `ACTION_CAD_SCHEMAS`

`docustrataCustomerIndexSchema` is defined at line 746 of `cadActionSchemas.ts` and registered under the key `"docustrata_customer_index"` at line 773. The `validateActionParams(action, params, ACTION_CAD_SCHEMAS)` call will find it correctly.

### Check 3 — Lazy import path and exported symbol name

Dispatcher (line 3856–3858):
```typescript
const { docustrataCustomerIndexEngine } = await import(
  "../../engines/DocustrataCustomerIndexEngine.js"
);
```

Engine file (`H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts`) line 455:
```typescript
export const docustrataCustomerIndexEngine = { ... };
```

The named export `docustrataCustomerIndexEngine` exists as a plain-object singleton. The import path `../../engines/DocustrataCustomerIndexEngine.js` is correct relative to `src/tools/dispatchers/cadDispatcher.ts`. No mismatch.

### Check 4 — Mode enum coverage and method argument shapes

Schema `mode` enum values (line 748): `"available" | "totals" | "list" | "get" | "search" | "find_pn"`

Dispatcher inner switch covers: `available`, `totals`, `list`, `get`, `search`, `find_pn`, plus a `default` defence-in-depth branch. All six enum values are handled; no enum value is unhandled, and no handled value is absent from the enum.

Argument shape verification against actual function signatures:

| Mode | Dispatcher ca
... [+2746 chars truncated]
