---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Per-file scrutiny gate for a PRISM dispatcher-wiring unit at H:/prism. The orpha"
date: "2026-05-22"
first_ts: "2026-05-22T21:12:10.758Z"
last_ts: "2026-05-22T21:13:46.961Z"
cwd: "H:\\prism\\mcp-server"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a0d118cf64cc616ce.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Per-file scrutiny gate for a PRISM dispatcher-wiring unit at H:/prism. The orpha

> **claude-code-cli** | 2026-05-22 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a0d118cf64cc616ce.jsonl`

## Transcript

### User | 2026-05-22T21:12:10.758Z

Per-file scrutiny gate for a PRISM dispatcher-wiring unit at H:/prism. The orphaned CustomerPortfolioMinerEngine is being wired into the prism_business dispatcher. Read each changed region END TO END, flag P0/P1, grade PASS/FAIL.

Changed files:
1. H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts — added 6 entries to the ACTIONS enum (`customer_portfolio_sources/list/mine/harvest/audit/profile`, after `customer_normalize`) and 6 dispatcher `case` blocks (after the `customer_normalize` case). Each case lazy-imports `CustomerPortfolioMinerEngine` from `../../engines/CustomerPortfolioMinerEngine.js` and calls a static method.
2. H:/prism/mcp-server/src/schemas/businessActionSchemas.ts — added 6 schema consts + a shared `safeCustomerName` validator + registered all 6 in the ACTION_BUSINESS_SCHEMAS map.
3. H:/prism/mcp-server/src/__tests__/businessDispatcher.customer-portfolio-wire.test.ts — NEW 13-case round-trip test.

The engine (H:/prism/mcp-server/src/engines/CustomerPortfolioMinerEngine.ts) is a STATIC-method class (no singleton): getSources(), listCustomers(), mineCustomer(name), harvest(maxCustomers?), audit(), getCustomerProfile(nameQuery), filterByTier(...). filterByTier is intentionally NOT wired (takes a profile array, not a standalone action).

Verify specifically:
- Wiring completeness: each of the 6 action strings appears in ALL THREE places — the ACTIONS enum, a dispatcher case, and the schema map. Const name === enum string === map key, exactly. Any mismatch → P0.
- The dispatcher cases: `customer_portfolio_mine` passes `params.customer_name`, `customer_portfolio_harvest` passes `params.max_customers`, `customer_portfolio_profile` passes `params.name_query`. Do these param names match the schema field names exactly? A mismatch (schema validates `customer_name` but case reads `params.customerName`) would mean the engine gets undefined → P0/P1.
- Static-class call pattern: the cases call `CustomerPortfolioMinerEngine.getSources()` etc. (stat
... [+931 chars truncated]

### Assistant | 2026-05-22T21:12:23.746Z

I'll read all four files end-to-end before issuing any findings.

### Assistant | 2026-05-22T21:12:24.291Z

[tool_use: Read]

### Assistant | 2026-05-22T21:12:24.360Z

[tool_use: Read]

### User | 2026-05-22T21:12:33.812Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1550 of 2748 total (37665 tokens, cap 25000). Call Read with offset=1551 limit=1550 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Business Dispatcher Action Schemas
3	 * ====================================
4	 * Per-action 
... [+54406 chars truncated]

### User | 2026-05-22T21:12:34.124Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1548 of 3913 total (53694 tokens, cap 25000). Call Read with offset=1549 limit=1548 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * prism_business — Business Operations Dispatcher
3	 *
4	 * 169 actions across 29 engines:
5	 *
... [+60028 chars truncated]

### Assistant | 2026-05-22T21:12:39.724Z

I need to read the remaining sections of both files to find the new case blocks and schema map registration.

### Assistant | 2026-05-22T21:12:40.788Z

[tool_use: Read]

### Assistant | 2026-05-22T21:12:41.748Z

[tool_use: Read]

### User | 2026-05-22T21:12:45.341Z

[tool_result] 3600	          case "lathe_actual_cost_reconcile": {
3601	            const engine = await getEngine("latheReconciliation");
3602	            result = engine.reconcile(params as any);
3603	            break;
3604	          }
3605	          case "lathe_actual_cost_accuracy": {
3606	            const engine = await getEngine("latheReconciliation");
3607	            result = engine.getAccuracyStats(p
... [+13610 chars truncated]

### User | 2026-05-22T21:12:45.718Z

[tool_result] 2550	      coating: z.string().optional(),
2551	      condition: z.enum(["new", "good", "worn", "needs_regrind", "retired"]).optional(),
2552	      total_cutting_minutes: z.number().optional(),
2553	      tool_material: z.string().optional(),
2554	      flute_length_mm: z.number().optional(),
2555	      overall_length_mm: z.number().optional(),
2556	    })).optional().describe("On-hand tool invent
... [+12909 chars truncated]

### Assistant | 2026-05-22T21:12:49.278Z

The schema map ends at line 2747 without the new portfolio entries. I need to see the section between the customer_normalize schema and the existing end of the map, and also find the new dispatcher case blocks for the portfolio actions.

### Assistant | 2026-05-22T21:12:50.282Z

[tool_use: Grep]

### Assistant | 2026-05-22T21:12:51.404Z

[tool_use: Grep]

### User | 2026-05-22T21:12:57.179Z

[tool_result] 1450-  apply: z.boolean().optional(),
1451-}).passthrough();
1452-
1453:const customer_portfolio_sources = z.object({}).passthrough();
1454-
1455:const customer_portfolio_list = z.object({}).passthrough();
1456-
1457-// customer_name feeds path.join(archiveRoot, name) inside the engine — reject
1458-// path separators and parent-dir traversal so a query cannot escape the archive.
--
1460-  .regex(
... [+1004 chars truncated]

### User | 2026-05-22T21:12:57.196Z

[tool_result] 632-  "customer_pipeline",
633-  "customer_analytics",
634-  "customer_top",
635-  "customer_revenue_concentration",
636-  "customer_growth_trends",
637-  "customer_normalize",
638:  "customer_portfolio_sources",
639:  "customer_portfolio_list",
640:  "customer_portfolio_mine",
641:  "customer_portfolio_harvest",
642:  "customer_portfolio_audit",
643:  "customer_portfolio_profile",
644-  // ── Int
... [+2467 chars truncated]

### Assistant | 2026-05-22T21:13:00.219Z

Now I need to read the engine file to verify the static method signatures, and read the test file.

### Assistant | 2026-05-22T21:13:00.674Z

[tool_use: Read]

### Assistant | 2026-05-22T21:13:00.970Z

[tool_use: Read]

### User | 2026-05-22T21:13:03.645Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CustomerPortfolioMinerEngine.ts' was already read 31s ago in this session and is unchanged (mtime 1775960834000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-05-22T21:13:05.014Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\businessDispatcher.customer-portfolio-wire.test.ts' was already read 31s ago in this session and is unchanged (mtime 1779484112620). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for y
... [+33 chars truncated]

### Assistant | 2026-05-22T21:13:08.249Z

[tool_use: Grep]

### Assistant | 2026-05-22T21:13:09.168Z

[tool_use: Grep]

### User | 2026-05-22T21:13:11.803Z

[tool_result] 135-   */
136:  static getSources() {
137-    return {
--
387-   */
388:  static filterByTier(
389-    profiles: CustomerProfile[],

### User | 2026-05-22T21:13:11.875Z

[tool_result] 1-/**
2- * BRIDGE-WIRING — CustomerPortfolioMinerEngine → prism_business wiring test
3- *
4: * Round-trips the 6 customer_portfolio_* actions through businessDispatcher's
5- * prism_business tool. CustomerPortfolioMinerEngine was a built-but-orphaned
6- * engine (no dispatcher reference) — this unit wires it.
7- *
8- * The engine mines the JM Die CNC LATHE archive from the filesystem. On a host
--
... [+4549 chars truncated]

### Assistant | 2026-05-22T21:13:14.341Z

Now I need to verify whether `getSources()` is sync or async, and check the other method signatures.

### Assistant | 2026-05-22T21:13:15.219Z

[tool_use: Grep]

### User | 2026-05-22T21:13:17.096Z

[tool_result] 134-   * Returns source info for the JM Die CNC Lathe archive.
135-   */
136:  static getSources() {
137-    return {
138-      rootPath: JM_DIE_CNC_LATHE,
--
146-   * Lists all customer folder names under CNC LATHE.
147-   */
148:  static async listCustomers(): Promise<string[]> {
149-    try {
150-      const entries = await readdir(JM_DIE_CNC_LATHE, { withFileTypes: true });
--
159-   * Mine a 
... [+987 chars truncated]

### Assistant | 2026-05-22T21:13:46.961Z

I now have all the data needed for a complete analysis. Here is the full review.

---

**Wiring completeness — 6-action matrix**

All 6 strings (`customer_portfolio_sources`, `customer_portfolio_list`, `customer_portfolio_mine`, `customer_portfolio_harvest`, `customer_portfolio_audit`, `customer_portfolio_profile`) appear in:
- The `ACTIONS` const array (lines 638-643 of businessDispatcher.ts)
- A `case` block (lines 2593-2634 of businessDispatcher.ts)
- The `ACTION_BUSINESS_SCHEMAS` map (lines 2346-2351 of businessActionSchemas.ts)

Const name === enum string === map key for all 6. No mismatch. No collision in other dispatchers found.

**Param name matching — dispatcher case vs schema field**

- `customer_portfolio_mine`: schema field is `customer_name`; case reads `params.customer_name`. MATCH.
- `customer_portfolio_harvest`: schema field is `max_customers`; case reads `params.max_customers`. MATCH.
- `customer_portfolio_profile`: schema field is `name_query`; case reads `params.name_query`. MATCH.

**Static-class call pattern**

All 6 cases use `const { CustomerPortfolioMinerEngine } = await import(...)` then call `CustomerPortfolioMinerEngine.methodName(...)` as static calls, never `new`. Correct per the engine's design.

**Async correctness — the one real issue**

`getSources()` is declared `static getSources()` with no `async` keyword — it returns a plain object, not a Promise. The `customer_portfolio_sources` case calls `CustomerPortfolioMinerEngine.getSources()` without `await`. CORRECT — no spurious `await` on a sync method.

`listCustomers`, `mineCustomer`, `harvest`, `audit`, and `getCustomerProfile` are all `static async`. The corresponding cases:
- `customer_portfolio_list`: `await CustomerPortfolioMinerEngine.listCustomers()`. CORRECT.
- `customer_portfolio_mine`: `await CustomerPortfolioMinerEngine.mineCustomer(...)`. CORRECT.
- `customer_portfolio_harvest`: `await CustomerPortfolioMinerEngine.harvest(...)`. CORRECT.
- `customer_portfolio_audit`: `awa
... [+3218 chars truncated]
