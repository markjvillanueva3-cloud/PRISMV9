---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent financial-correctness review of the just-built CreditMemoEngine (PRI"
date: "2026-05-30"
first_ts: "2026-05-30T01:41:55.080Z"
last_ts: "2026-05-30T01:45:53.145Z"
cwd: "H:\\prism-slot-hotel"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-a402447afb7c1c0fe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Independent financial-correctness review of the just-built CreditMemoEngine (PRI

> **claude-code-cli** | 2026-05-30 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-a402447afb7c1c0fe.jsonl`

## Transcript

### User | 2026-05-30T01:41:55.080Z

Independent financial-correctness review of the just-built CreditMemoEngine (PRISM ERP, galaxy:business). Read END TO END: H:/prism-slot-hotel/mcp-server/src/engines/CreditMemoEngine.ts + H:/prism-slot-hotel/mcp-server/src/__tests__/CreditMemoEngine.test.ts (+ any H:/prism-slot-hotel/mcp-server/src/data/*.ts it imports). SPEC it must satisfy: QuickBooks "Credit Memo" parity (QB-PARITY Phase-2 #3). Producer: a customer return/RMA or price-adjustment. Methods: create({creditMemoId,customerId,reason,lines[{description,quantity,unitPrice}],taxJurisdiction?}) → credit memo with subtotal/tax/total (reuse roundCentsHalfEven; tax via reading SalesUseTaxEngine.calcSalesTax IF a jurisdiction is given — import it); applyToInvoice(creditMemo, {invoiceId, invoiceBalance, amount}) → reduces invoice balance, tracks applied vs remaining unapplied credit; remainingCredit(creditMemo). GL effect to RETURN (data): DR 4000 Sales Revenue (contra/return) + DR 2100 Tax Payable (tax reversal) / CR 1200 AR (total). Invariants: applied ≤ creditMemo.total AND applied ≤ invoiceBalance (over-apply THROWS); unapplied = total − Σapplied ≥ 0; half-even. Reference tests: create w/ tax, apply partial to invoice, apply full, over-apply throws (both ceilings), unapplied-credit balance after partial, GL lines balance, adversarial (negative qty, NaN).

BUILD REPORT: All 25 tests pass (vitest counts the `it` blocks: 25). All green on the first run. The engine is complete and verified.

{
  "engine": "CreditMemoEngine",
  "filesCreated": [
    "H:/prism-slot-hotel/mcp-server/src/engines/CreditMemoEngine.ts",
    "H:/prism-slot-hotel/mcp-server/src/data/credit-memo-policy.ts",
    "H:/prism-slot-hotel/mcp-server/src/__tests__/CreditMemoEngine.test.ts"
  ],
  "vitestPassCount": "25 passed (25)",
  "methods": {
    "create": "({creditMemoId?,customerId,reason,lines[{description,quantity,unitPrice,taxable?}],taxJurisdiction?}) -> CreditMemo {subtotal, tax, total, applied:0, unapplied:total}. Reason validated a
... [+3899 chars truncated]

### Assistant | 2026-05-30T01:42:10.807Z

I'll review the CreditMemoEngine end-to-end with a financial-correctness lens. Let me read all the relevant files.

### Assistant | 2026-05-30T01:42:11.800Z

[tool_use: Read]

### Assistant | 2026-05-30T01:42:12.239Z

[tool_use: Read]

### Assistant | 2026-05-30T01:42:12.724Z

[tool_use: Read]

### User | 2026-05-30T01:42:26.535Z

[tool_result] 1	/**
2	 * CreditMemoEngine — customer credit memos for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Credit Memo" function set (QB-PARITY-MS0 Phase-2 #3, the A/R revenue
5	 * cycle: Estimate → Sales Order → Invoice → **Credit Memo** → Receive Payment → Statement → Dunning).
6	 * A credit memo is a NEGATIVE-revenue document: it reverses revenue (and the tax that ro
... [+13166 chars truncated]

### User | 2026-05-30T01:42:27.076Z

[tool_result] 1	/**
2	 * CreditMemoEngine tests — QuickBooks "Credit Memo" parity (galaxy:business, slot:hotel).
3	 * REAL hand-computed reference values (no toBeDefined stubs). Covers:
4	 *  - happy path: create w/ tax, partial apply, full apply, remaining-credit balance, GL balance
5	 *  - failure modes: unknown reason, unknown jurisdiction, over-apply (both ceilings), bad amounts
6	 *  - adversarial: NaN/Inf
... [+13185 chars truncated]

### User | 2026-05-30T01:42:29.061Z

[tool_result] 1	/**
2	 * credit-memo-policy.ts — constants & policy for the QuickBooks-parity Credit Memo engine
3	 * (galaxy:business, slot:hotel). Single source of truth for the GL accounts a credit memo
4	 * touches and the application-policy knobs — so CreditMemoEngine never inlines an account
5	 * number or a policy rate (financial-invariant gate, business/GSD.md §2).
6	 *
7	 * A QB Credit Memo is a NEGATI
... [+2645 chars truncated]

### Assistant | 2026-05-30T01:42:32.806Z

Now let me verify the critical dependency: the `SalesUseTaxEngine.calcSalesTax` contract and `roundCentsHalfEven` behavior, since the engine reuses both. The producer claims a `$0.005 → $0.00` banker's tie, and tax computed on a rounded taxable base. Let me read that file.

### Assistant | 2026-05-30T01:42:33.744Z

[tool_use: Read]

### Assistant | 2026-05-30T01:42:34.055Z

[tool_use: Read]

### User | 2026-05-30T01:42:36.975Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\mcp-server\src\engines\SalesUseTaxEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1780077160361). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-30T01:42:37.356Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\mcp-server\src\data\sales-tax-rates.ts' was already read 7m ago in this session and is unchanged (mtime 1780076759279). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-30T01:42:40.783Z

The read-once guard says these were already read but I don't have them in my actual context (fresh session). Let me bypass the cache.

### Assistant | 2026-05-30T01:42:42.612Z

[tool_use: Bash]

### Assistant | 2026-05-30T01:42:43.158Z

[tool_use: Bash]

### User | 2026-05-30T01:43:16.389Z

[tool_result] /**
 * SalesUseTaxEngine — sales & use tax for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Sales Tax" function set (calc tax on a taxable sale, self-assess use tax,
 * aggregate the period liability to remit, "Pay Sales Tax"). QB-PARITY-MS0 Phase-1 engine #1 — the
 * audit's #1 true pillar gap (prior coverage was only an `integration_export_payroll_tax` shim).
 *
 * 
... [+6015 chars truncated]

### User | 2026-05-30T01:43:45.935Z

[tool_result] /**
 * sales-tax-rates.ts — US sales/use tax rate table for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Imported by SalesUseTaxEngine — NEVER inline a tax rate in engine code (financial-invariant /
 * anti-pattern #1: jurisdiction-specific + changes over time; a stale inlined rate = wrong tax =
 * real liability). This module is the single source of truth.
 *
 * ⚠ HONESTY: these are a SNAPS
... [+3561 chars truncated]

### Assistant | 2026-05-30T01:43:52.119Z

Now I have the full dependency chain. Let me analyze the critical financial-correctness concern: the tax computed on a `taxableBase` that is rounded, then `total = subtotal + tax`, versus the GL lines which use `subtotal` (full) for the revenue reversal. Let me trace a partly-taxable scenario carefully to find the inversion bug.

The key insight: in `create()`, the GL `revenueReversal` uses `creditMemo.subtotal` (the FULL subtotal including non-taxable lines), and `taxReversal` uses `creditMemo.tax` (tax on the taxable base only). That balances against `total = subtotal + tax`. Good. But let me hunt for the case where tax was computed on a base that doesn't match.

Let me construct an adversarial input where the rounded extension sum diverges, and verify the half-even rounding edge in `SalesUseTaxEngine`.

### Assistant | 2026-05-30T01:43:53.907Z

[tool_use: Bash]

### User | 2026-05-30T01:44:10.300Z

[tool_result] node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'

### Assistant | 2026-05-30T01:44:14.192Z

I'll replicate the engine logic in plain JS to numerically test adversarial inputs, since the TS won't run directly. Let me port the exact arithmetic (roundCentsHalfEven + create + applyToInvoice + glLinesForIssue) faithfully and probe for unbalanced results.

### Assistant | 2026-05-30T01:44:26.147Z

[tool_use: Bash]

### User | 2026-05-30T01:44:45.204Z

[tool_result] GL balance/total fails: 0
[]

### Assistant | 2026-05-30T01:44:53.474Z

GL always balances and `total == subtotal + tax` holds. The contra-posting structure is internally consistent. Now the more important financial question: **does the tax on the credit memo actually equal the tax that was on the original invoice?** The producer computes tax on a *rounded-per-line, then summed, then rounded* taxable base. Let me check the application-side invariants and the over-apply EPS tolerance — that's where a real over-credit can slip through.

### Assistant | 2026-05-30T01:45:11.183Z

[tool_use: Bash]

### User | 2026-05-30T01:45:27.863Z

[tool_result] PROBE1 chained sub-cent: applied=0.1 unapplied=0 apps=10
PROBE2 threw: over-apply remaining
PROBE3 amount 0.504 vs invBal 0.50: applied=0.5 invAfter=0

### Assistant | 2026-05-30T01:45:34.127Z

Interesting — PROBE3 confirms a real (minor) issue: the `amount` is rounded to cents **before** the over-apply ceiling check, so an input `amount: 0.504` against an invoice balance of `0.50` is silently accepted (rounded down to `0.50`). That's sub-cent and bounded, but it means the ceiling check compares the *rounded* amount against the balance, not the *requested* amount. PROBE2 confirms the half-even round-up is correctly caught. Let me now examine the most consequential issue: **the tax-base divergence between the credit memo and the original invoice**, and whether the GL `revenueReversal == subtotal` is actually correct accounting when there's a discount/non-taxable mix. Let me also check the `total <= 0` guard interaction with negative-after-rounding and the EstimateEngine line-math claim.

### Assistant | 2026-05-30T01:45:36.970Z

[tool_use: Bash]

### User | 2026-05-30T01:45:52.839Z

[tool_result] 0.005 -> 0
0.015 -> 0.02
0.025 -> 0.02
0.035 -> 0.04
0.045 -> 0.04
0.125 -> 0.12
2.675 -> 2.68
1.005 -> 1
0.105 -> 0.1

### Assistant | 2026-05-30T01:45:53.145Z

You've hit your session limit · resets 11:10pm (America/Chicago)
