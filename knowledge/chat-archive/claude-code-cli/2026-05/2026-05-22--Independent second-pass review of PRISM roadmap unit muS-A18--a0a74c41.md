---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Independent second-pass review of PRISM roadmap unit muS-A18 (CustomerNormalizer"
date: "2026-05-22"
first_ts: "2026-05-22T17:16:51.299Z"
last_ts: "2026-05-22T17:23:09.792Z"
cwd: "H:\\prism\\mcp-server"
messages: 37
user_msgs: 15
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a27d2f4cc48fab869.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of PRISM roadmap unit muS-A18 (CustomerNormalizer

> **claude-code-cli** | 2026-05-22 | 37 msgs (15 user / 22 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a27d2f4cc48fab869.jsonl`

## Transcript

### User | 2026-05-22T17:16:51.299Z

Independent second-pass review of PRISM roadmap unit muS-A18 (CustomerNormalizer) at H:/prism. Read each changed region END TO END. Weight toward integration, hidden coupling, conventions, test integrity, data-safety.

Changed files:
1. H:/prism/mcp-server/src/engines/CustomerManagementEngine.ts — 3 new interfaces (CustomerNormalizationChange/CustomerDuplicateCluster/CustomerNormalizationReport), new `normalizeCustomers(apply=false)` method, new `private canonicalPhone(raw)` helper.
2. H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts — new `"customer_normalize"` enum entry + dispatcher case `engine.normalizeCustomers(params.apply === true)`.
3. H:/prism/mcp-server/src/schemas/businessActionSchemas.ts — new `customer_normalize` schema const + map registration.
4. H:/prism/mcp-server/src/__tests__/CustomerManagementEngine.normalize.test.ts — NEW 13-case test file.

Focus on:
- Wiring completeness: `customer_normalize` present in ALL THREE places (enum, dispatcher case, schema map)? Const name === enum string === map key exactly? A miss → P0.
- DATA SAFETY: this method can MUTATE customer records when apply=true. Is the apply path gated correctly? Could a malformed/partial Customer record cause `normalizeCustomers` to throw mid-loop and leave the portfolio half-normalized? Is that acceptable, or should it be transactional?
- The dispatcher uses `params.apply === true` (strict) — so any non-true value (undefined, "true" string, 1) yields a dry run. Is that the safe default? (It is — mutation requires explicit boolean true. Confirm.)
- persistenceBridge.persist is called per-customer inside the loop when apply=true — N writes. Is that consistent with how the rest of the engine persists (createCustomer/updateCustomer do one persist per mutation)? Any performance concern at scale, or fine?
- Convention conformance: matches the muS-B14/muS-B15 sibling methods (revenueConcentration, customerTrends) just above — JSDoc style, return-object shape, snake_case repo
... [+706 chars truncated]

### Assistant | 2026-05-22T17:17:15.231Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:17:13.413Z

I'll review the four changed files end-to-end.

### Assistant | 2026-05-22T17:17:14.640Z

[tool_use: Bash]

### User | 2026-05-22T17:17:43.645Z

[tool_result] mcp-server/src/engines/CustomerManagementEngine.ts | 135 +++++++++++++++++++++
 mcp-server/src/schemas/businessActionSchemas.ts    |   5 +
 .../src/tools/dispatchers/businessDispatcher.ts    |   6 +
 3 files changed, 146 insertions(+)
---UNTRACKED---
?? knowledge/wiki/architecture/actions/data/machine-vocab-normalize-record.md
?? knowledge/wiki/architecture/actions/data/machine-vocab-normalize.md

... [+263 chars truncated]

### User | 2026-05-22T17:17:45.836Z

[tool_result] src\tools\dispatchers\businessDispatcher.ts:637:  "customer_normalize",
src\tools\dispatchers\businessDispatcher.ts:2582:          case "customer_normalize": {
src\tools\dispatchers\businessDispatcher.ts:2584:            result = engine.normalizeCustomers(params.apply === true);
src\engines\CustomerManagementEngine.ts:563:  normalizeCustomers(apply: boolean = false): CustomerNormalizationReport {

... [+2635 chars truncated]

### Assistant | 2026-05-22T17:17:50.155Z

[tool_use: Read]

### Assistant | 2026-05-22T17:17:50.652Z

[tool_use: Read]

### Assistant | 2026-05-22T17:17:51.134Z

[tool_use: Read]

### Assistant | 2026-05-22T17:17:51.365Z

[tool_use: Read]

### User | 2026-05-22T17:18:02.864Z

[tool_result] 1443	const customer_revenue_concentration = z.object({}).passthrough();
1444	
1445	const customer_growth_trends = z.object({
1446	  window_days: z.number().int().positive().optional(),
1447	}).passthrough();
1448	
1449	const customer_normalize = z.object({
1450	  apply: z.boolean().optional(),
1451	}).passthrough();
1452	
1453	// ====================================================================
... [+601 chars truncated]

### User | 2026-05-22T17:18:02.871Z

[tool_result] 2575	            break;
2576	          }
2577	          case "customer_growth_trends": {
2578	            const engine = await getEngine("customerMgmt");
2579	            result = engine.customerTrends(params.window_days);
2580	            break;
2581	          }
2582	          case "customer_normalize": {
2583	            const engine = await getEngine("customerMgmt");
2584	            result = e
... [+428 chars truncated]

### User | 2026-05-22T17:18:02.891Z

[tool_result] 480	      let trend: CustomerTrend['trend'];
481	      if (daysSinceLast > 2 * win) {
482	        trend = 'dormant';
483	      } else if (firstTs >= recentStart && prior === 0) {
484	        trend = 'new';
485	      } else if (prior === 0 && recent > 0) {
486	        trend = 'growing'; // reactivated after a quiet prior window
487	      } else if (recent >= prior * (1 + GROWTH_BAND)) {
488	       
... [+8433 chars truncated]

### User | 2026-05-22T17:18:03.011Z

[tool_result] 1	/**
2	 * muS-A18 — CustomerNormalizer
3	 *
4	 * Tests CustomerManagementEngine.normalizeCustomers() and round-trips the
5	 * customer_normalize action through businessDispatcher's prism_business tool.
6	 *
7	 * Real-value assertions (no toBeDefined() stubs):
8	 *   - Whitespace collapse, email lowercasing, phone canonicalization to
9	 *     (NNN) NNN-NNNN, state uppercasing, zip trimming.
10	 * 
... [+8036 chars truncated]

### Assistant | 2026-05-22T17:18:08.233Z

Let me verify the interfaces, the schema map registration, and the sibling-method conventions.

### Assistant | 2026-05-22T17:18:09.219Z

[tool_use: Bash]

### Assistant | 2026-05-22T17:18:09.608Z

[tool_use: Read]

### User | 2026-05-22T17:18:29.656Z

[tool_result] 1	import { persistenceBridge } from "../db/PersistenceBridge.js";
2	
3	/**
4	 * CustomerManagementEngine — CRM for job shops. Customer records, credit limits,
5	 * pricing tiers, communication log, win/loss tracking, sales pipeline.
6	 */
7	
8	export interface Customer {
9	  id: string;
10	  name: string;
11	  company: string;
12	  contact_name: string;
13	  email: string;
14	  phone: string;
15	 
... [+3045 chars truncated]

### User | 2026-05-22T17:19:12.465Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
14 matches in 2 files:

engines/CustomerManagementEngine.ts:109:export interface CustomerNormalizationChange {
engines/CustomerManagementEngine.ts:116:export interface CustomerDuplicateCluster {
engines/CustomerManagementEngine.ts:122:export interface CustomerNormalizationReport {
engines/CustomerManag
... [+895 chars truncated]

### Assistant | 2026-05-22T17:19:15.743Z

Let me verify the schema map registration (the `actionSchemas` map key) since that's the only wiring point not yet confirmed.

### Assistant | 2026-05-22T17:19:16.480Z

[tool_use: Bash]

### Assistant | 2026-05-22T17:19:17.157Z

[tool_use: Bash]

### User | 2026-05-22T17:20:49.036Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
9 matches in 3 files:

139:0:Omit<Customer, 'id' | 'current_balance' | 'created_at' | 'status'> & { status...
157:0:string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Customer {
engines/CustomerManagementEngine.ts:149:persistenceBridge.persist("customers", id, customer as any);
engines/Cus
... [+614 chars truncated]

### User | 2026-05-22T17:20:49.400Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 1 files:

schemas/businessActionSchemas.ts:1443:const customer_revenue_concentration = z.object({}).passthrough();
schemas/businessActionSchemas.ts:1445:const customer_growth_trends = z.object({
schemas/businessActionSchemas.ts:1449:const customer_normalize = z.object({
[+1 more]

### Assistant | 2026-05-22T17:20:52.624Z

The grep output shows the schema const at line 1449 but I need the map registration. Let me confirm it explicitly.

### Assistant | 2026-05-22T17:20:53.493Z

[tool_use: Bash]

### User | 2026-05-22T17:21:23.867Z

[tool_result] Exit code 1
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'customer_normalize:'
---map context---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'customer_growth_trends:'

### Assistant | 2026-05-22T17:21:27.236Z

No `:`-suffixed map entries. Let me find how schemas are registered into the action map.

### Assistant | 2026-05-22T17:21:27.722Z

[tool_use: Bash]

### User | 2026-05-22T17:21:43.405Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 1 files:

schemas/businessActionSchemas.ts:7:* @module schemas/businessActionSchemas
schemas/businessActionSchemas.ts:1449:const customer_normalize = z.object({
[+1 more]

### Assistant | 2026-05-22T17:21:48.451Z

The grep is truncating on a binary byte. Let me read the file tail directly to see the map.

### Assistant | 2026-05-22T17:21:49.281Z

[tool_use: Bash]

### User | 2026-05-22T17:22:27.536Z

[tool_result] 2717

### Assistant | 2026-05-22T17:22:34.700Z

The grep is stopping at the null byte. The schema map registration is at the file tail. Let me read it with the Read tool which handles binary safely.

### Assistant | 2026-05-22T17:22:35.748Z

[tool_use: Bash]

### User | 2026-05-22T17:22:56.085Z

[tool_result] 1443: const customer_revenue_concentration = z.object({}).passthrough();
1445: const customer_growth_trends = z.object({
1449: const customer_normalize = z.object({
2319: customer_revenue_concentration,
2320: customer_growth_trends,
2321: customer_normalize,

### Assistant | 2026-05-22T17:23:09.792Z

Wiring confirmed at line 2321 (shorthand `customer_normalize,` in the schema map). All three places present, names exact. Review complete.

## Independent Second-Pass Review — muS-A18 CustomerNormalizer

**Wiring (P0 check — PASS):** `customer_normalize` present in all three: enum (businessDispatcher.ts:637), dispatcher case (:2582-2586), schema const (:1449) + map entry (:2321). Const name === enum string === map key exactly. Sibling pattern (`customer_growth_trends`) matched.

**P1 — Mid-loop throw leaves portfolio half-normalized.** `normalizeCustomers(apply=true)` mutates `cust` fields then calls `persistenceBridge.persist` per-customer inside the `for` loop. If a malformed record (e.g. `cust.address` undefined, or `cust.email` null) reaches line 583/591, the access throws and earlier customers are already mutated + persisted while later ones are not. There is no try/catch and no transactional rollback. The JSDoc claims dry-run safety but says nothing about partial-apply risk. Compare: `createCustomer`/`updateCustomer` each mutate exactly one record per call, so a throw is self-contained — this method breaks that invariant. Either (a) validate every record up front before any mutation, or (b) document the partial-apply behavior. Not a blocker since `Customer` fields are non-optional and the engine controls all writes, but it is an unguarded data-safety gap.

**P2 — In-memory mutation precedes the persist.** Line 601-606 mutate the live map entry, *then* line 607 persists. If `persist` throws (disk full, lock), the in-memory map is already normalized but disk is stale → divergence until next persist. `updateCustomer` has the identical ordering, so this is convention-consistent, not a regression. Note only.

**P3 — N persist calls at scale.** One write per dirty customer, consistent with `createCustomer`/`updateCustomer` (one persist per mutation). Fine for job-shop scale (hundreds of customers). No batch-persist API exists to use instead.

**Confirmed safe:**
- `
... [+1065 chars truncated]
