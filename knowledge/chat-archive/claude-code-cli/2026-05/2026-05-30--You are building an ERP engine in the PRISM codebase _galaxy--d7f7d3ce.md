---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are building an ERP engine in the PRISM codebase (galaxy:business, slot:hote"
date: "2026-05-30"
first_ts: "2026-05-30T03:50:11.171Z"
last_ts: "2026-05-30T04:02:22.356Z"
cwd: "H:\\prism-slot-hotel"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_bce5678d-743/agent-af3260e979abb30d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are building an ERP engine in the PRISM codebase (galaxy:business, slot:hote

> **claude-code-cli** | 2026-05-30 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_bce5678d-743/agent-af3260e979abb30d6.jsonl`

## Transcript

### User | 2026-05-30T03:50:11.171Z


You are building an ERP engine in the PRISM codebase (galaxy:business, slot:hotel). HARD RULES:
- WORKTREE: write ALL files under H:/prism-slot-hotel/mcp-server/ . Engine → H:/prism-slot-hotel/mcp-server/src/engines/<Name>.ts ; test → H:/prism-slot-hotel/mcp-server/src/__tests__/<Name>.test.ts ; any constants → H:/prism-slot-hotel/mcp-server/src/data/<name>.ts .
- ADDITIVE ONLY. Create NEW files. Do NOT edit businessDispatcher.ts or any shared file. Tag the engine header with a '// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879); wire <action names> in main post golf-merge.' comment.
- DEDUP FIRST: grep H:/prism-slot-hotel/mcp-server/data/docs/ENGINE_DIGEST.md and ls H:/prism-slot-hotel/mcp-server/src/engines/ for an existing engine of this name/role (e.g. an existing BankReconciliation / acct_bank_reconcile, CashFlowProjection). If a real one exists, EXTEND its contract / reuse it rather than duplicating, and report that. duplicationGuard discipline.
- FINANCIAL INVARIANTS (refuse-on-violation, fail loud): import constants/accounts, never inline; half-even (banker's) rounding — REUSE roundCentsHalfEven from H:/prism-slot-hotel/mcp-server/src/engines/SalesUseTaxEngine.ts (import it, do not re-implement); money reconciles both ways; non-finite/negative/over-apply THROW (no silent coercion); any GL posting balances Σdebits==Σcredits (assert before return).
- GL CONTEXT (H:/prism-slot-hotel/mcp-server/src/engines/GeneralLedgerEngine.ts): chart = 1000 Cash, 1200 AR, 1300 WIP, 1310 Finished Goods, 1320 Raw Materials, 1500 Equipment, 1600 Accum Deprec, 2000 Accounts Payable, 2100 Tax Payable, 2200 Accrued Payroll, 3000 Owner Equity, 4000 Sales Rev, 5000 COGS, 5100 Materials Exp, 5500 Operating Exp, 5600 Tools/Consumables. recordPurchase posts DR<expense/asset>/CR 2000 AP (bill creation). There is NO vendor-payment recorder — RETURN your engine's GL lines as DATA (balanced), do NOT call GL directly; keep the engine pure 
... [+2852 chars truncated]

### Assistant | 2026-05-30T03:50:23.806Z

I'll start by reading the sibling patterns and required files, then dedup-check, then build.

### Assistant | 2026-05-30T03:50:26.419Z

[tool_use: Bash]

### Assistant | 2026-05-30T03:50:27.203Z

[tool_use: Read]

### Assistant | 2026-05-30T03:50:27.484Z

[tool_use: Read]

### User | 2026-05-30T03:50:49.964Z

[tool_result] 1	/**
2	 * ReceivePaymentEngine — customer cash-application for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Receive Payment" function (apply a customer payment against open invoices).
5	 * QB-PARITY Phase-2 engine #4 of the A/R revenue cycle
6	 * (Estimate → SalesOrder → CreditMemo → ReceivePayment → Statement → Dunning, roadmap task #18).
7	 *
8	 * Producer / PR
... [+17257 chars truncated]

### User | 2026-05-30T03:50:50.070Z

[tool_result] 1	/**
2	 * CreditMemoEngine — customer credit memos for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Credit Memo" function set (QB-PARITY-MS0 Phase-2 #3, the A/R revenue
5	 * cycle: Estimate → Sales Order → Invoice → **Credit Memo** → Receive Payment → Statement → Dunning).
6	 * A credit memo is a NEGATIVE-revenue document: it reverses revenue (and the tax that ro
... [+13166 chars truncated]

### User | 2026-05-30T03:52:58.878Z

[tool_result] ---LS---
BillingEngine.ts  25.3K
ReceivePaymentEngine.ts  16.0K
StripeBillingEngine.ts  14.3K
VendorCatalogManifestEngine.ts  17.1K
VendorEngine.ts  9.9K
VendorTurningCatalogExtractorEngine.ts  15.3K

### Assistant | 2026-05-30T03:53:03.379Z

No existing BillPayment/CheckRun engine — dedup clean. The two siblings give me the exact structure. Let me check the constants file ReceivePayment uses and confirm `roundCentsHalfEven` signature.

### Assistant | 2026-05-30T03:53:04.387Z

[tool_use: Read]

### Assistant | 2026-05-30T03:53:05.323Z

[tool_use: Bash]

### User | 2026-05-30T03:53:34.183Z

[tool_result] 1	/**
2	 * cash-application-accounts.ts — GL account designations + policy constants for the
3	 * customer cash-application (QuickBooks "Receive Payment") cycle in the PRISM ERP
4	 * (galaxy:business, slot:hotel).
5	 *
6	 * Single source of truth for the accounts ReceivePaymentEngine posts to, so the engine
7	 * NEVER inlines an account number or a policy rate (business/GSD.md §2.1 financial-invar
... [+1878 chars truncated]

### User | 2026-05-30T03:54:13.777Z

[tool_result] 32:export function roundCentsHalfEven(value: number): number {
33-  if (!Number.isFinite(value)) throw new Error(`[sales-tax] non-finite amount: ${value}`);
34-  const sign = value < 0 ? -1 : 1;
35-  const abs = Math.abs(value) * 100;
36-  const floor = Math.floor(abs);
37-  const diff = abs - floor;
38-  const EPS = 1e-9;
39-  let rounded: number;
40-  if (Math.abs(diff - 0.5) < EPS) rounded = fl
... [+545 chars truncated]

### Assistant | 2026-05-30T03:54:17.146Z

I have everything. Now I'll create the constants file (A/P mirror — Accounts Payable + Cash, plus an Undeposited Funds chart extension note is not needed here since check-run pays out of Cash directly). Let me write the constants file first.

### Assistant | 2026-05-30T03:54:24.400Z

[tool_use: Write]

### User | 2026-05-30T03:55:00.527Z

[tool_result] File created successfully at: H:/prism-slot-hotel/mcp-server/src/data/bill-payment-accounts.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-30T03:55:03.649Z

The graph nodes are GL-internal (gl-record-payment, gl-chart-of-accounts) — not an A/P bill-payment engine. Dedup remains clean (the constants file is purely additive account designations). Now the engine.

### Assistant | 2026-05-30T03:56:18.479Z

[tool_use: Write]

### User | 2026-05-30T03:56:28.646Z

[tool_result] File created successfully at: H:/prism-slot-hotel/mcp-server/src/engines/BillPaymentCheckRunEngine.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-30T03:56:32.830Z

The import warnings are false positives (the `.js` ESM extensions resolve to `.ts` siblings — the same pattern ReceivePaymentEngine uses). The "unreachable-after-return" warning is also a false positive (my early `return [];` in buildGlLines is followed only by code in the non-zero branch — let me verify it's structured correctly; actually it's an `if (totalPaid <= 0) return []` guard with the rest as the function body, which is correct, not unreachable).

Now the test file with hand-computed reference values.

### Assistant | 2026-05-30T03:57:22.296Z

[tool_use: Write]

### User | 2026-05-30T03:57:31.723Z

[tool_result] TEST LEGITIMACY GATE — BLOCKED

BillPaymentCheckRunEngine.test.ts is not valid coverage:
- placeholder test pattern: weak presence-only assertion

Write real assertions against real behavior. Synthetic loops, placeholder assertions, and mocked critical-domain SUTs do not count.

### Assistant | 2026-05-30T03:57:34.635Z

The gate flagged a weak assertion. The likely culprit is `expect(billPaymentCheckRunEngine).toBe(BillPaymentCheckRunEngine)` (presence-only identity check) or the `toBeUndefined()` check. Let me replace the alias-identity test with a real behavioral assertion via the alias, and strengthen the checkNo test.

### Assistant | 2026-05-30T03:57:38.808Z

[tool_use: Edit]

### User | 2026-05-30T03:57:38.837Z

[tool_result] <tool_use_error>File does not exist. Note: your current working directory is H:\prism-slot-hotel.</tool_use_error>

### Assistant | 2026-05-30T03:57:41.599Z

The legitimacy gate blocked the Write, so the file was never created. Let me also fix the `toBeUndefined()` assertion (the other likely flagged pattern) and re-Write the full file with both improvements.

### Assistant | 2026-05-30T03:58:30.388Z

[tool_use: Write]

### User | 2026-05-30T03:58:44.083Z

[tool_result] File created successfully at: H:/prism-slot-hotel/mcp-server/src/__tests__/BillPaymentCheckRunEngine.test.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-30T03:58:46.909Z

File created. Import warnings are false positives (ESM `.js` → `.ts` resolution); magic numbers are intentional hand-computed test fixtures. Now run vitest.

### Assistant | 2026-05-30T03:58:48.127Z

[tool_use: Bash]

### User | 2026-05-30T03:59:46.882Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/prism-slot-hotel/mcp-server

 ✓ src/__tests__/BillPaymentCheckRunEngine.test.ts (21 tests) 32ms

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Start at  22:59:40
   Duration  5
... [+76 chars truncated]

### Assistant | 2026-05-30T03:59:49.141Z

All 21 tests pass on the first run. Let me confirm the engine type-checks cleanly in isolation (the "unreachable-after-return" advisory was a false positive — verifying).

### Assistant | 2026-05-30T03:59:50.860Z

[tool_use: Bash]

### User | 2026-05-30T04:02:02.892Z

[tool_result] EXIT_GREP_DONE

### Assistant | 2026-05-30T04:02:22.356Z

No errors specific to my new files (the isolated tsc emits only pre-existing cross-module noise from the broader import graph, none referencing BillPayment/bill-payment). The engine and constants type-check cleanly. Build complete.

BillPaymentCheckRunEngine — QuickBooks "Pay Bills" / check-run parity (QB-PARITY Phase-3 A/P #2), the A/P mirror of ReceivePaymentEngine.

Files created (all under H:/prism-slot-hotel/mcp-server/, additive only):
- H:/prism-slot-hotel/mcp-server/src/engines/BillPaymentCheckRunEngine.ts
- H:/prism-slot-hotel/mcp-server/src/data/bill-payment-accounts.ts
- H:/prism-slot-hotel/mcp-server/src/__tests__/BillPaymentCheckRunEngine.test.ts

Vitest: 21/21 passing (1 file). Command: `node node_modules/vitest/vitest.mjs run src/__tests__/BillPaymentCheckRunEngine.test.ts`.

GL lines returned (as data, engine stays pure — no direct GL call): DR 2000 Accounts Payable (totalPaid) / CR 1000 Cash (totalPaid). A zero-total run emits no lines.

Invariants enforced (refuse-on-violation, fail loud — no silent coercion):
- Accounts/tolerance imported from bill-payment-accounts.ts (2000 AP, 1000 Cash — both existing chart members, no chart extension needed); roundCentsHalfEven imported from SalesUseTaxEngine (not re-implemented).
- per-bill amountPaid ≤ balance — over-pay THROWS (both specified-allocation ceiling and a defensive due-date-first guard).
- Σpaid + unusedFunds === run cashLimit EXACTLY, reconciled both ways (forward over-disburse THROW + reverse reconstruction THROW); when no cashLimit, unusedFunds === 0.
- one check PER VENDOR aggregating that vendor's paid bills; Σ check amounts === totalPaid reconciled both ways (THROW on mismatch). Sequential checkNo (CHK-<runId>-N) for method "check"; absent for ach/wire.
- GL balance asserted before return: Σdebits === Σcredits === totalPaid (THROW otherwise).
- NaN/Infinity/negative/empty-bills/duplicate-billId/duplicate-allocation/unknown-allocation-target all THROW (Zod `.finite().positive()` + explicit g
... [+1436 chars truncated]
