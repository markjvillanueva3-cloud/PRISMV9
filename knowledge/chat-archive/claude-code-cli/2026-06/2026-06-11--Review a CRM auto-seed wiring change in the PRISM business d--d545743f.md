---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "Review a CRM auto-seed wiring change in the PRISM business dispatcher. Read the "
date: "2026-06-11"
first_ts: "2026-06-11T04:07:51.914Z"
last_ts: "2026-06-11T04:10:31.542Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a17d437e2fb775ca6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Review a CRM auto-seed wiring change in the PRISM business dispatcher. Read the 

> **claude-code-cli** | 2026-06-11 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a17d437e2fb775ca6.jsonl`

## Transcript

### User | 2026-06-11T04:07:51.914Z

Review a CRM auto-seed wiring change in the PRISM business dispatcher. Read the WHOLE of each changed region end-to-end. Grade PASS or FAIL and list every P0/P1 issue with file:line.

UNIT SPEC: `CustomerManagementEngine` boots with an empty in-memory `customers` Map and has NO constructor rehydration; `createCustomer` persists write-only but nothing reads back on boot. The explicit `customer_seed_jm_corpus` action existed + was wired but was NEVER auto-invoked, so `customer_list` returned [] on every server start (SITE-DESTUB BLOCKER #2 — ERP rendered empty). FIX: auto-seed the CRM from `state/shared/databases/jm-customers.jsonl` (473 real JM customers) on FIRST construct, idempotent + fail-soft.

FILES (in the H:/prism-slot-hotel worktree):
1. `H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts` — THREE edits:
   (a) new module-level helper `loadJMCustomerCorpusRecords(explicitPath?)` inserted just before `async function getEngine` (~line 185) — fs-loads the JSONL from candidate paths, returns `{records, usedPath}` or null.
   (b) the `case "customerMgmt":` factory (~line 375) now: `if (!_customerMgmt) { construct; try { if listCustomers().length===0 { loaded=await loadJMCustomerCorpusRecords(); if(loaded) seedFromJMCorpus(loaded.records) } } catch {} } return _customerMgmt`.
   (c) the `case "customer_seed_jm_corpus":` (~line 3607) refactored to reuse the helper (DRY).
2. `H:/prism-slot-hotel/mcp-server/src/__tests__/businessDispatcher.customer-autoseed.test.ts` — NEW (4 round-trip tests via a fixture written in beforeAll/restored in afterAll).
3. `H:/prism-slot-hotel/mcp-server/src/__tests__/CustomerManagementEngine.jm-corpus-seed.test.ts` — beforeAll now async + primes the one-time auto-seed via `customer_list` so beforeEach reset() gives a clean CRM.

VERIFY RIGOROUSLY: (1) correctness of the empty-check guard + memoization (does the auto-seed fire exactly once? any double-seed/ID-collision risk?); (2) idempotency (seedFromJMCorpus dedu
... [+660 chars truncated]

### Assistant | 2026-06-11T04:07:58.644Z

I'll review this CRM auto-seed wiring change rigorously. Let me read the changed regions end-to-end.

### Assistant | 2026-06-11T04:07:59.934Z

[tool_use: Read]

### Assistant | 2026-06-11T04:08:00.563Z

[tool_use: Read]

### Assistant | 2026-06-11T04:08:01.038Z

[tool_use: Read]

### User | 2026-06-11T04:08:03.813Z

[tool_result] 150	let _salesOrder: any;
151	let _creditMemo: any;
152	let _receivePayment: any;
153	let _customerStatement: any;
154	let _financeChargeDunning: any;
155	let _vendorCredit: any;
156	let _billPayment: any;
157	let _bankReconciliation: any;
158	let _bankFeedImport: any;
159	let _bankDepositTransfer: any;
160	let _chartOfAccounts: any;
161	let _journalEntry: any;
162	let _financialReportSuite: any;

... [+6227 chars truncated]

### User | 2026-06-11T04:08:04.336Z

[tool_result] 1	/**
2	 * businessDispatcher -- customerMgmt first-construct AUTO-SEED (SITE-DESTUB BLOCKER #2)
3	 *
4	 * The CRM (CustomerManagementEngine) boots with an empty in-memory customers Map and has
5	 * no constructor rehydration, so on every server start customer_list returned [] until a
6	 * manual customer_seed_jm_corpus action was called -- and nothing ever auto-called it, so
7	 * the ERP customer
... [+6097 chars truncated]

### User | 2026-06-11T04:08:05.001Z

[tool_result] 1	/**
2	 * CustomerManagementEngine.seedFromJMCorpus — JM Die full-corpus CRM seed
3	 *
4	 * Bulk-loads the 473-customer JM Die roster (state/shared/databases/jm-customers.jsonl,
5	 * emitted by scripts/jm-die-full-corpus-ingest.mjs) into the CRM so the ERP renders real
6	 * JM customers for full quote-to-ship training + shop-floor simulate testing.
7	 *
8	 * Real-value assertions (no toBeDefined(
... [+10990 chars truncated]

### Assistant | 2026-06-11T04:08:07.543Z

Now let me read the two critical edit regions in the dispatcher: the `customerMgmt` factory case and the `customer_seed_jm_corpus` action case.

### Assistant | 2026-06-11T04:08:08.907Z

[tool_use: Read]

### Assistant | 2026-06-11T04:08:10.358Z

[tool_use: Grep]

### User | 2026-06-11T04:08:12.975Z

[tool_result] 360	      return _toolUsage ??= (
361	        await import("../../engines/ToolUsageEngine.js")
362	      ).toolUsageEngine;
363	    case "actualCost":
364	      return _actualCost ??= (
365	        await import("../../engines/ActualCostEngine.js")
366	      ).actualCostEngine;
367	    case "quoteEstimator":
368	      return _quoteEstimator ??= (
369	        await import("../../engines/QuoteEstimat
... [+2142 chars truncated]

### User | 2026-06-11T04:08:35.502Z

[tool_result] 188: * (auto-seed) vs fail-loud (the explicit customer_seed_jm_corpus action). Shared by that
192:async function loadJMCustomerCorpusRecords(
415:    case "customerMgmt": {
422:        // customer_seed_jm_corpus call (SITE-DESTUB BLOCKER #2). Idempotent + fail-soft:
424:        // index.ts startup before serving) or the jsonl is absent; seedFromJMCorpus dedups
428:            const loaded = await 
... [+739 chars truncated]

### Assistant | 2026-06-11T04:08:38.204Z

Now let me read the full `customerMgmt` factory block and the refactored `customer_seed_jm_corpus` action case.

### Assistant | 2026-06-11T04:08:39.602Z

[tool_use: Read]

### Assistant | 2026-06-11T04:08:40.117Z

[tool_use: Read]

### User | 2026-06-11T04:08:43.732Z

[tool_result] 415	    case "customerMgmt": {
416	      if (!_customerMgmt) {
417	        _customerMgmt = (
418	          await import("../../engines/CustomerManagementEngine.js")
419	        ).customerManagementEngine;
420	        // Auto-seed the CRM from the JM Die corpus on first construct so ERP read paths
421	        // (customer_list / customer_search / ...) render real JM customers without a manual
422	 
... [+1176 chars truncated]

### User | 2026-06-11T04:08:45.061Z

[tool_result] 3600	            const engine = await getEngine("customerMgmt");
3601	            result = engine.listCustomers({
3602	              status: params.status,
3603	              tier: params.tier ?? params.pricing_tier,
3604	            });
3605	            break;
3606	          }
3607	          case "customer_seed_jm_corpus": {
3608	            // Bulk-seed the CRM from the JM Die full-corpus roster
... [+1712 chars truncated]

### Assistant | 2026-06-11T04:08:49.408Z

Now let me verify the engine-level claims: the `listCustomers` signature (does it accept no args?), `seedFromJMCorpus` dedup logic, and whether `_customerMgmt` is module-level singleton. Let me also verify the index.ts:498 race claim.

### Assistant | 2026-06-11T04:08:51.297Z

[tool_use: Grep]

### Assistant | 2026-06-11T04:08:52.341Z

[tool_use: Grep]

### User | 2026-06-11T04:09:02.641Z

[tool_result] 117:  normalized_key: string;
159:function normalizeCustomerKey(name: string): string {
163:class CustomerManagementEngine {
164:  private customers: Map<string, Customer> = new Map();
168:  private nextId = 1;
171:    const id = `CUST-${String(this.nextId++).padStart(4, '0')}`;
206:  listCustomers(filter?: { status?: string; tier?: string }): Customer[] {
216:   * a record whose name already maps
... [+1102 chars truncated]

### User | 2026-06-11T04:09:02.981Z

[tool_result] 100:let _customerMgmt: any;

### Assistant | 2026-06-11T04:09:05.263Z

Let me read the engine's `seedFromJMCorpus` dedup logic and `listCustomers` to verify idempotency, plus the index.ts:498 race claim.

### Assistant | 2026-06-11T04:09:06.826Z

[tool_use: Read]

### Assistant | 2026-06-11T04:09:07.477Z

[tool_use: Read]

### User | 2026-06-11T04:09:08.662Z

[tool_result] 159	function normalizeCustomerKey(name: string): string {
160	  return (name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
161	}
162	
163	class CustomerManagementEngine {
164	  private customers: Map<string, Customer> = new Map();
165	  private commLogs: CommunicationLog[] = [];
166	  private opportunities: SalesOpportunity[] = [];
167	  private jobHistory: Map<string, { revenue: number; margin
... [+5213 chars truncated]

### User | 2026-06-11T04:09:09.287Z

[tool_result] 485	  }
486	
487	  // INFRA-1-2: Database initialization (graceful — server always starts without DB)
488	  try {
489	    const { db } = await import("./db/connection.js");
490	    const connected = await db.connect();
491	    if (connected) {
492	      log.info("[INFRA] PostgreSQL connected — running migrations...");
493	      const { runMigrations } = await import("./db/migration-runner.js");
49
... [+874 chars truncated]

### Assistant | 2026-06-11T04:09:14.245Z

Now let me verify the persistence rehydration path — does `persistenceBridge.loadAll()` actually populate the in-memory `customers` Map of this engine in Postgres mode (the race claim depends on this), and confirm the action enum still contains `customer_seed_jm_corpus` (anti-regression). Let me also check whether `getEngine` itself has any locking, to assess the concurrency window.

### Assistant | 2026-06-11T04:09:16.121Z

[tool_use: Grep]

### Assistant | 2026-06-11T04:09:16.630Z

[tool_use: Read]

### User | 2026-06-11T04:09:18.141Z

[tool_result] 10: *   - At startup: loadAll() fills engine Maps from the store
117:  async loadAll(): Promise<{ mode: "postgres" | "memory"; loaded: Record<string, number>; walRecovered: number }> {

### User | 2026-06-11T04:09:18.206Z

[tool_result] 850	  // ── Customer Management ──
851	  "customer_create",
852	  "customer_get",
853	  "customer_update",
854	  "customer_search",
855	  "customer_list",
856	  "customer_seed_jm_corpus",
857	  "customer_credit_check",
858	  "customer_log_comm",
859	  "customer_comm_history",

### Assistant | 2026-06-11T04:09:21.582Z

Let me read the `loadAll` body to verify how it rehydrates customer rows (does it call `createCustomer`, which bumps `nextId` and persists, or set the Map directly?) — this is load-bearing for the empty-check guard and the double-seed-on-restart analysis.

### Assistant | 2026-06-11T04:09:22.154Z

[tool_use: Read]

### User | 2026-06-11T04:09:23.244Z

[tool_result] 100	    this.registrations.push({
101	      entity: config.entity,
102	      getMap: () => new Map(),
103	      getArray: config.getArray,
104	      setArray: config.setArray,
105	      keyField: config.keyField,
106	      toRecord: config.toRecord ?? ((v) => v as StoreRecord),
107	      fromRecord: config.fromRecord ?? ((r) => r as T),
108	    });
109	  }
110	
111	  /**
112	   * Initialize persis
... [+4253 chars truncated]

### Assistant | 2026-06-11T04:09:28.242Z

I need to confirm whether `CustomerManagementEngine` actually registers with the PersistenceBridge (i.e., whether `loadAll()` rehydrates the `customers` Map at all). This determines whether the "race-free in Postgres mode" claim and the "skipped when persistence already rehydrated rows" comment are TRUE. Let me check for a registration call.

### Assistant | 2026-06-11T04:09:29.302Z

[tool_use: Grep]

### User | 2026-06-11T04:09:32.540Z

[tool_result] 1:import { persistenceBridge } from "../db/PersistenceBridge.js";
180:    persistenceBridge.persist("customers", id, customer as any);
192:    persistenceBridge.persist("customers", id, cust as any);
300:    persistenceBridge.persistAppend("customer_communications", log as any);
322:    persistenceBridge.persistAppend("sales_opportunities", opp as any);
330:    persistenceBridge.persist("sales_opp
... [+557 chars truncated]

### Assistant | 2026-06-11T04:09:35.241Z

This confirms the registration. Let me read lines 786-805 to see exactly how `registerMap` wires the customers Map — critical for confirming `loadAll()` populates `(customerManagementEngine).customers` directly (so the empty-check guard sees rehydrated rows in Postgres mode).

### Assistant | 2026-06-11T04:09:36.658Z

[tool_use: Read]

### Assistant | 2026-06-11T04:09:37.184Z

[tool_use: Read]

### User | 2026-06-11T04:09:38.466Z

[tool_result] 786	persistenceBridge.registerMap({
787	  entity: "customers",
788	  getMap: () => (customerManagementEngine as any).customers as Map<string, any>,
789	  keyField: "id",
790	});
791	persistenceBridge.registerArray({
792	  entity: "customer_communications",
793	  getArray: () => (customerManagementEngine as any).commLogs as any[],
794	  setArray: (data: any[]) => { (customerManagementEngine as any)
... [+334 chars truncated]

### User | 2026-06-11T04:09:38.842Z

[tool_result] 60	// ─── Bridge ─────────────────────────────────────────────────────────────────
61	
62	class PersistenceBridgeImpl {
63	  private registrations: EntityRegistration<any>[] = [];
64	  private pendingWrites: PendingWrite[] = [];
65	  private flushTimer: ReturnType<typeof setTimeout> | null = null;
66	  private flushing = false;
67	  private flushPromise: Promise<{ flushed: number; errors: number }
... [+1061 chars truncated]

### Assistant | 2026-06-11T04:09:44.215Z

I now have full confirmation of the entire data-flow. The `registerMap` for "customers" uses `getMap: () => customerManagementEngine.customers` (a live reference to the engine's Map), and `loadAll()` in Postgres mode does `map.set(key, item)` directly into that live Map (PersistenceBridge.ts:171-176). So in Postgres mode, by the time `getEngine("customerMgmt")` is first called (after `loadAll()` completed at index.ts:500, awaited before serving), `listCustomers().length` is non-zero IF the DB had rows — confirming the empty-check guard. Let me verify one final correctness detail: the seed result tail (lines 268-275) and confirm `nextId` collision behavior, then I have everything.

### Assistant | 2026-06-11T04:09:45.306Z

[tool_use: Read]

### User | 2026-06-11T04:09:47.234Z

[tool_result] 268	      result.customer_ids.push(cust.id);
269	      result.seeded++;
270	      if (status === "active") result.active++; else result.prospect++;
271	    }
272	    return result;
273	  }
274	
275	  checkCredit(customer_id: string, order_amount: number): {
276	    approved: boolean;
277	    credit_limit: number;
278	    current_balance: number;
279	    available_credit: number;
280	    order_amou
... [+42 chars truncated]

### Assistant | 2026-06-11T04:10:31.542Z

I have read every changed region and all load-bearing dependencies end-to-end. Here is my verdict.

## Code Quality Analysis Report — CRM Auto-Seed Wiring

### Summary
- **Verdict: PASS**
- Files analyzed: 5 (2 changed source regions + helper, 2 new/modified tests, 3 dependency files traced)
- P0 issues: 0
- P1 issues: 0
- P2/P3 advisories: 3 (non-blocking, logged below)

### Verification against the 6 rigor criteria

**(1) Empty-check guard + memoization — fires exactly once, no double-seed/ID-collision.** PASS.
`case "customerMgmt"` (businessDispatcher.ts:415-436) gates the whole construct+seed inside `if (!_customerMgmt)`. `_customerMgmt` is the module-level singleton (businessDispatcher.ts:100). Once assigned at :417, the block never re-enters, so the seed body is unreachable on every subsequent call. The empty-check `listCustomers().length === 0` (:427) is a genuine guard, not a stub — `listCustomers` (CustomerManagementEngine.ts:206-211) returns the live Map contents. No ID-collision risk: `seedFromJMCorpus` routes every insert through `createCustomer`, which mints `CUST-${nextId++}` (CustomerManagementEngine.ts:171) — monotonic, and the dedup `existing` Set (:229, updated at :267) prevents re-inserting a name already present.

**(2) Idempotency + the Postgres/in-memory race claim — race-free in BOTH modes.** PASS, and the claim is verified, not taken on faith:
- `seedFromJMCorpus` dedups by `normalizeCustomerKey` (lowercased, non-alphanumerics stripped — CustomerManagementEngine.ts:159-161, 229-234). Re-seed → `skipped_existing`, never a duplicate.
- **Postgres mode:** `registerMap({entity:"customers", getMap:()=>customerManagementEngine.customers})` (CustomerManagementEngine.ts:786-789) hands `loadAll()` a *live reference* to the engine's Map. `loadAll()` does `map.set(key,item)` directly into it (PersistenceBridge.ts:171-176), and is `await`-ed at index.ts:500 *before* the server registers/serves. So the first `getEngine("customerMgmt")` after boot sees a p
... [+6027 chars truncated]
