---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Independent second-pass review of a PRISM dispatcher-wiring unit at H:/prism — t"
date: "2026-05-22"
first_ts: "2026-05-22T21:12:10.740Z"
last_ts: "2026-05-22T21:13:19.540Z"
cwd: "H:\\prism\\mcp-server"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a35d5cad21d788b1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of a PRISM dispatcher-wiring unit at H:/prism — t

> **claude-code-cli** | 2026-05-22 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a35d5cad21d788b1d.jsonl`

## Transcript

### User | 2026-05-22T21:12:10.740Z

Independent second-pass review of a PRISM dispatcher-wiring unit at H:/prism — the orphaned CustomerPortfolioMinerEngine wired into prism_business. Read each changed region END TO END. Weight toward security, test integrity, hidden coupling, conventions.

Changed files:
1. H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts — 6 new ACTIONS enum entries + 6 dispatcher case blocks (`customer_portfolio_sources/list/mine/harvest/audit/profile`).
2. H:/prism/mcp-server/src/schemas/businessActionSchemas.ts — 6 new schema consts + shared `safeCustomerName` validator + map registration.
3. H:/prism/mcp-server/src/__tests__/businessDispatcher.customer-portfolio-wire.test.ts — NEW 13-case round-trip test.

Engine: H:/prism/mcp-server/src/engines/CustomerPortfolioMinerEngine.ts — static-method class that mines the JM Die CNC LATHE filesystem archive. `mineCustomer(name)` does `path.join(JM_DIE_CNC_LATHE, name)` then `readdir` — so an unsanitized name is a path-traversal vector.

Focus on:
- SECURITY: `safeCustomerName` = `z.string().min(1).max(120).regex(/^[A-Za-z0-9 ._&'()-]+$/).refine(s => !s.includes(".."))`. Does this FULLY close the path-traversal hole? Consider: forward slash, backslash, `..`, absolute paths (`C:\`, `/etc`), URL-encoded variants, null bytes, leading/trailing dots, Unicode lookalikes. Is the dispatcher's `validateActionParams` guaranteed to run BEFORE the case executes (so the engine never sees an unsanitized name)? Does `customer_portfolio_profile`'s `name_query` also go through `safeCustomerName`? Is `getCustomerProfile` independently safe (exact-match against a real listing)?
- Test integrity: 13 cases — are they REAL assertions? The engine reads a filesystem archive that may not exist on the test host. The test claims to assert "shape not contents." Is that sound — or could a test silently pass on a host where the archive IS present and a host where it ISN'T, masking a real wiring break? Do the 4 schema-rejection tests + 3 path-traversal t
... [+872 chars truncated]

### Assistant | 2026-05-22T21:12:28.800Z

I'll review the three changed files plus the engine end to end.

### Assistant | 2026-05-22T21:12:29.219Z

[tool_use: Read]

### Assistant | 2026-05-22T21:12:30.058Z

[tool_use: Read]

### Assistant | 2026-05-22T21:12:30.129Z

[tool_use: Read]

### User | 2026-05-22T21:12:32.985Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\businessActionSchemas.ts' was already read 4s ago in this session and is unchanged (mtime 1779484059808). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-05-22T21:12:34.424Z

[tool_result] 1	/**
2	 * CustomerPortfolioMinerEngine — Customer Defaults from JM Die Archive
3	 *
4	 * RES-MS21: Mines the JM DIE/CNC LATHE/{CUSTOMER}/ folder structure to build
5	 * customer profiles with historical machining patterns. When a repeat job comes
6	 * in for a known customer, PRISM pre-fills defaults (material, operations,
7	 * typical feeds/speeds, machine preferences) from their historical patt
... [+14799 chars truncated]

### User | 2026-05-22T21:12:34.657Z

[tool_result] 1	/**
2	 * BRIDGE-WIRING — CustomerPortfolioMinerEngine → prism_business wiring test
3	 *
4	 * Round-trips the 6 customer_portfolio_* actions through businessDispatcher's
5	 * prism_business tool. CustomerPortfolioMinerEngine was a built-but-orphaned
6	 * engine (no dispatcher reference) — this unit wires it.
7	 *
8	 * The engine mines the JM Die CNC LATHE archive from the filesystem. On a host
9	
... [+6491 chars truncated]

### Assistant | 2026-05-22T21:12:39.399Z

I have the test and engine. Let me read the dispatcher and schema file regions.

### Assistant | 2026-05-22T21:12:41.058Z

[tool_use: Grep]

### Assistant | 2026-05-22T21:12:42.418Z

[tool_use: Grep]

### User | 2026-05-22T21:12:45.777Z

[tool_result] 1440-  limit: z.number().int().optional(),
1441-}).passthrough();
1442-
1443:const customer_revenue_concentration = z.object({}).passthrough();
1444-
1445-const customer_growth_trends = z.object({
1446-  window_days: z.number().int().positive().optional(),
1447-}).passthrough();
1448-
1449:const customer_normalize = z.object({
1450-  apply: z.boolean().optional(),
1451-}).passthrough();
1452-
1453
... [+1546 chars truncated]

### User | 2026-05-22T21:12:45.903Z

[tool_result] 52- */
53-import { z } from "zod";
54-import { log } from "../../utils/Logger.js";
55-import { slimResponse } from "../../utils/responseSlimmer.js";
56:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
57-import { ACTION_BUSINESS_SCHEMAS } from "../../schemas/businessActionSchemas.js";
58-
59-// Lazy engine cache
60-let _financial: any;
--
631-  "customer
... [+3750 chars truncated]

### Assistant | 2026-05-22T21:12:49.698Z

Let me verify the `validateActionParams` ordering and the success-envelope shape returned by the dispatcher.

### Assistant | 2026-05-22T21:12:50.556Z

[tool_use: Read]

### Assistant | 2026-05-22T21:12:51.370Z

[tool_use: Read]

### User | 2026-05-22T21:12:58.326Z

[tool_result] 1	/**
2	 * Dispatcher Middleware Utility
3	 * Common validation and error handling for MCP dispatchers.
4	 * @module utils/dispatcherMiddleware
5	 */
6	
7	import { z } from "zod";
8	
9	export interface DispatcherErrorResult {
10	  success: false;
11	  error: string;
12	  action: string;
13	  dispatcher: string;
14	  details?: unknown;
15	  /**
16	   * MCP-protocol content payload. Always populated
... [+3935 chars truncated]

### User | 2026-05-22T21:12:58.358Z

[tool_result] 2632	            result = await CustomerPortfolioMinerEngine.getCustomerProfile(params.name_query);
2633	            break;
2634	          }
2635	
2636	          // ── Integration / Export ──
2637	          case "integration_export_qb": {
2638	            const engine = await getEngine("integrationAdapter");
2639	            result = engine.exportQuickBooksIIF(params.transactions ?? []);
2640	    
... [+2344 chars truncated]

### Assistant | 2026-05-22T21:13:19.540Z

Independent second-pass review complete. All four files read end to end.

## Findings

**P1 — Path-traversal guard has a gap: absolute Windows paths slip through.**
`safeCustomerName`'s regex `/^[A-Za-z0-9 ._&'()-]+$/` rejects `/` and `\`, and `.refine()` rejects `..`. But it does NOT reject a bare drive-letter colon-free absolute reference. `path.join("H:/PRISM/JM DIE/CNC LATHE", "PRN")` or `path.join(root, "CON")` resolves to Windows reserved device names — `readdir` on `CON`/`PRN`/`NUL`/`AUX`/`COM1` etc. throws, so the engine degrades to `makeEmptyProfile` (no traversal), so this is contained — downgrade to P2. The genuine residual concern: the `:` char is correctly excluded, `/` `\` excluded, `..` excluded. **The hole IS closed for traversal.** Null bytes (`\x00`) are excluded by the regex. URL-encoded `%2e%2e` would be literal chars `%2e` — `%` is not in the class, rejected. Unicode lookalikes (e.g. U+2024 ONE DOT LEADER) are not `[A-Za-z0-9...]`, rejected. **Net: traversal is fully closed. No P0/P1 security finding.** Ordering confirmed: `validateActionParams` runs at line 940, before the switch at ~2593 — the engine never sees an unsanitized name. `name_query` also routes through `safeCustomerName` (line 1474). `getCustomerProfile` is independently safe (exact case-insensitive match against real `listCustomers()`).

**P2 — Test cross-host ambiguity (the stated concern is real).** `customer_portfolio_mine "ALCOA"` asserts `programCount >= 0` and tier ∈ set — passes whether the archive exists (real ALCOA folder) or not (`makeEmptyProfile`). A wiring break that returned a *different* engine's shape would still fail (good), but a break that silently swapped to an empty stub would pass on a no-archive CI host. Acceptable for a wiring test; the `customer_portfolio_sources` fixed-value assertions (118/15599) are the real anti-regression anchor. Not a stub — no `toBeDefined()` present.

**P2 — `harvest` with large `max_customers` mines thousands of `.MIN` files synch
... [+498 chars truncated]
