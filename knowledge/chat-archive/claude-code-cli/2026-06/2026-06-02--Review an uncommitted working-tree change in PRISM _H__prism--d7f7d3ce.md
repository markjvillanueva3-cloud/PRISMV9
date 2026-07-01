---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Review an uncommitted working-tree change in PRISM (H:/prism). Run `git -C H:/pr"
date: "2026-06-02"
first_ts: "2026-06-02T14:03:55.370Z"
last_ts: "2026-06-02T14:08:02.613Z"
cwd: "H:\\prism-slot-hotel"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a0a9aa42e81114892.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Review an uncommitted working-tree change in PRISM (H:/prism). Run `git -C H:/pr

> **claude-code-cli** | 2026-06-02 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a0a9aa42e81114892.jsonl`

## Transcript

### User | 2026-06-02T14:03:55.370Z

Review an uncommitted working-tree change in PRISM (H:/prism). Run `git -C H:/prism diff -- mcp-server/src/engines/CustomerManagementEngine.ts mcp-server/src/tools/dispatchers/businessDispatcher.ts mcp-server/src/__tests__/CustomerManagementEngine.jm-corpus-seed.test.ts` and read each changed region end-to-end.

CONTEXT/INTENT: New feature — bulk-seed the CRM (CustomerManagementEngine) from the JM Die full-corpus customer roster (state/shared/databases/jm-customers.jsonl, 473 real customer folders emitted by scripts/jm-die-full-corpus-ingest.mjs) so the ERP renders real JM customers for quote-to-ship training. The JM record is file-inventory-derived ({customer_key, aliases, files_total, files_by_bucket, materials_seen, machine_classes_seen, source_folders}) — names + activity only, NO contact/financial data.

The change adds:
1. CustomerManagementEngine.ts: JMCorpusCustomerRecord + JMCorpusSeedResult interfaces, a normalizeCustomerKey() helper, and a seedFromJMCorpus(records) method (pure, no file IO; dedups by normalized name against existing customers; status=active if machining files (program+cad+print+setup)>0 else prospect; tags from materials_seen+machine_classes_seen deduped+capped 12; notes carry file counts + source folder; seeds via createCustomer with safe defaults Net 30 / standard / $0 credit).
2. businessDispatcher.ts: a customer_seed_jm_corpus action (enum entry + handler). Handler uses params.records (pre-parsed, for tests) else reads the JSONL from params.path or repo-root candidates, fail-loud if not found.
3. The test (8 cases, all PASS): happy/idempotent/dedup/invalid/adversarial + 2 dispatcher round-trips.

GRADE PASS/FAIL with explicit P0/P1/P2 findings. Focus on:
1. Idempotency correctness — can re-running ever duplicate customers? Is the dedup set built correctly (existing customers + within-batch)?
2. createCustomer side effects — it calls persistenceBridge.persist + increments nextId. Any issue bulk-calling it 473×? Any persistence concern?
... [+605 chars truncated]

### Assistant | 2026-06-02T14:04:25.502Z

I'll review the working-tree change. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-02T14:04:26.925Z

[tool_use: Bash]

### User | 2026-06-02T14:05:05.275Z

[tool_result] mcp-server/src/engines/CustomerManagementEngine.ts | 1508 +++++++++++---------
 .../src/tools/dispatchers/businessDispatcher.ts    |   34 +
 2 files changed, 833 insertions(+), 709 deletions(-)

--- Changes ---

mcp-server/src/engines/CustomerManagementEngine.ts
  @@ -1,709 +1,799 @@
  -import { persistenceBridge } from "../db/PersistenceBridge.js";
  -
  -/**
  - * CustomerManagementEngine — CRM 
... [+5376 chars truncated]

### Assistant | 2026-06-02T14:05:13.719Z

The diff was truncated for the engine file. Let me read the actual new code in each file directly — the engine's new methods, the dispatcher handler, the test, the createCustomer side effects, and the allowlist file.

### Assistant | 2026-06-02T14:05:15.532Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:05:15.856Z

[tool_use: Read]

### User | 2026-06-02T14:05:26.152Z

[tool_result] 1	/**
2	 * CustomerManagementEngine.seedFromJMCorpus — JM Die full-corpus CRM seed
3	 *
4	 * Bulk-loads the 473-customer JM Die roster (state/shared/databases/jm-customers.jsonl,
5	 * emitted by scripts/jm-die-full-corpus-ingest.mjs) into the CRM so the ERP renders real
6	 * JM customers for full quote-to-ship training + shop-floor simulate testing.
7	 *
8	 * Real-value assertions (no toBeDefined(
... [+9774 chars truncated]

### User | 2026-06-02T14:05:26.312Z

[tool_result] 137:export interface JMCorpusCustomerRecord {
148:export interface JMCorpusSeedResult {
159:function normalizeCustomerKey(name: string): string {
223:  seedFromJMCorpus(records: JMCorpusCustomerRecord[]): JMCorpusSeedResult {
224:    const result: JMCorpusSeedResult = {
229:    const existing = new Set([...this.customers.values()].map((c) => normalizeCustomerKey(c.name)));
232:      const nk = nor
... [+23 chars truncated]

### Assistant | 2026-06-02T14:05:30.802Z

Now let me read the engine's new code regions in full — interfaces, normalizeCustomerKey, seedFromJMCorpus, and createCustomer.

### Assistant | 2026-06-02T14:05:31.740Z

[tool_use: Read]

### User | 2026-06-02T14:05:42.153Z

[tool_result] 130	}
131	
132	/**
133	 * One record from the JM Die full-corpus ingest (state/shared/databases/jm-customers.jsonl,
134	 * emitted by scripts/jm-die-full-corpus-ingest.mjs — 473 real JM Die customer folders).
135	 * File-inventory derived: names + activity counts, no contact/financial fields.
136	 */
137	export interface JMCorpusCustomerRecord {
138	  customer_key: string;
139	  aliases?: string[]
... [+6820 chars truncated]

### Assistant | 2026-06-02T14:05:46.254Z

Now let me check the security-critical allowlist file and confirm how createCustomer's persistenceBridge behaves under bulk calls.

### Assistant | 2026-06-02T14:05:47.170Z

[tool_use: Read]

### Assistant | 2026-06-02T14:05:48.717Z

[tool_use: Grep]

### User | 2026-06-02T14:06:18.097Z

[tool_result] 1	/**
2	 * business-dispatch-allowlist.ts — the curated set of prism_business actions the browser may
3	 * invoke through POST /api/v1/business/dispatch (createBusinessRouter).
4	 *
5	 * ── SECURITY: DENY-BY-DEFAULT ───────────────────────────────────────────────────────────────
6	 * The prism_business dispatcher exposes ~879 actions, many of which are FINANCIAL
7	 * (payroll_run, gl_journal_entry
... [+3718 chars truncated]

### User | 2026-06-02T14:06:26.029Z

[tool_result] 7- * fast synchronous reads; the bridge ensures writes are durably persisted.
8- *
9- * Pattern:
10- *   - At startup: loadAll() fills engine Maps from the store
11: *   - After mutation: persist(entity, key, value) queues write with confirmation
12- *   - At shutdown: gracefulShutdown() drains queue with timeout
13- *
14- * This avoids making engine APIs async (which would break all callers).
15-
... [+928 chars truncated]

### Assistant | 2026-06-02T14:06:30.958Z

All code read. The dispatch handler I've already seen in full from the diff. Let me confirm one final detail — that `customer_list` (used in the test round-trip) and `customer_seed_jm_corpus` resolve through the dispatcher, and confirm the persist mode/queue behavior under bulk calls.

### Assistant | 2026-06-02T14:06:30.968Z

[tool_use: Read]

### User | 2026-06-02T14:07:18.117Z

[tool_result] 196	  persist(entity: string, key: string, value: StoreRecord | null): Promise<boolean> {
197	    if (this.mode === "memory" || !this.initialized) return Promise.resolve(true);
198	
199	    // INTEG-MS2: Write to WAL first (crash-safe)
200	    const walSeq = writeAheadLog.append(
201	      value === null ? "delete" : "upsert",
202	      entity,
203	      key,
204	      value
205	    );
206	
207	  
... [+1796 chars truncated]

### Assistant | 2026-06-02T14:08:02.613Z

I have everything needed. The persist is fire-and-forget (queued + debounced flush, or no-op in memory mode), createCustomer ignores the returned promise, and the WAL append is non-blocking. Here is my review.

---

## Code Quality Analysis Report — `customer_seed_jm_corpus` (JM corpus CRM seed)

### Summary
- **Grade: PASS**
- Files Analyzed: 3 (CustomerManagementEngine.ts, businessDispatcher.ts, CustomerManagementEngine.jm-corpus-seed.test.ts)
- Issues Found: 0 P0, 0 P1, 4 P2
- The feature is correct, idempotent, fail-loud where it must be, fail-soft where appropriate, and — critically — the write action is **NOT** browser-reachable.

---

### Per-focus findings

**1. Idempotency — CORRECT.** The dedup `Set` is seeded from all existing customers' normalized names (`CustomerManagementEngine.ts:229`) *and* updated within the batch via `existing.add(nk)` at line 264 *before* the next iteration. So re-runs skip pre-existing (verified by test L101-109) and within-batch duplicate keys collapse to one. `normalizeCustomerKey` strips case + all non-alphanumerics (`HOLO-KROME` ≡ `Holo Krome`, verified L111-122). Re-running can never duplicate.

**2. `createCustomer` bulk side effects — SAFE for 473×.** `persist()` is fire-and-forget: in `memory`/uninitialized mode it's an immediate `Promise.resolve(true)` no-op (`PersistenceBridge.ts:197`); in store mode it does a cheap synchronous WAL append + pushes onto a debounced batch queue (`scheduleFlush`). No per-call I/O, no await in the hot loop. `createCustomer` ignores the returned promise (consistent with every other caller — `updateCustomer` etc.). 473 sequential in-memory `Map.set` + queue-push is trivial. No persistence concern.

**3. status / tags / notes — CORRECT.**
- `active` iff `program+cad+print+setup > 0`, else `prospect` (L237-238). Matches intent and tests (HOLO-KROME/ITW active, scan/other-only AAAMECONINGPIN prospect, L78-79, L148). Note: `scan` and `doc` correctly excluded from the machining test but `scan` *is
... [+4331 chars truncated]
