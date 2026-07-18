---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent financial-correctness review of the just-built ReceivePaymentEngine "
date: "2026-05-30"
first_ts: "2026-05-30T01:44:10.062Z"
last_ts: "2026-05-30T01:45:34.586Z"
cwd: "H:\\prism-slot-hotel"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-ae9bf31b81253f6d0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Independent financial-correctness review of the just-built ReceivePaymentEngine 

> **claude-code-cli** | 2026-05-30 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-ae9bf31b81253f6d0.jsonl`

## Transcript

### User | 2026-05-30T01:44:10.062Z

Independent financial-correctness review of the just-built ReceivePaymentEngine (PRISM ERP, galaxy:business). Read END TO END: H:/prism-slot-hotel/mcp-server/src/engines/ReceivePaymentEngine.ts + H:/prism-slot-hotel/mcp-server/src/__tests__/ReceivePaymentEngine.test.ts (+ any H:/prism-slot-hotel/mcp-server/src/data/*.ts it imports). SPEC it must satisfy: QuickBooks "Receive Payment" / cash-application parity (QB-PARITY Phase-2 #4). Producer: a customer payment against open invoices. Methods: applyPayment({paymentId,customerId,amount,date,method}, openInvoices[{invoiceId,balance,date}], opts{strategy:'oldest-first'|'specified', allocations?[{invoiceId,amount}]}) → {applied[{invoiceId,amountApplied,newBalance}], unappliedCredit, fullyApplied}. oldest-first sorts by invoice date and fills sequentially; overpayment → unappliedCredit; short payment → partial on oldest. GL to RETURN: DR 1000 Cash (amount) / CR 1200 AR (Σapplied) [+ CR a customer-credit-liability for unapplied, or note it]. Invariants: Σapplied + unappliedCredit == payment.amount EXACTLY (reconcile both ways — THROW if not); per-invoice amountApplied ≤ balance (over-apply THROWS); half-even. Reference tests: full single-invoice, partial, overpayment→credit, multi-invoice oldest-first sequential fill, specified-allocation, over-allocate throws, Σapplied+unapplied==amount invariant, adversarial (NaN amount, negative, empty invoices→all unapplied).

BUILD REPORT: {
  "engine": "ReceivePaymentEngine",
  "status": "BUILT — all tests green, tsc-clean for new files",
  "dedupFinding": "No existing ReceivePaymentEngine / CashApplication engine. Grepped ENGINE_DIGEST.md (no 'ReceivePayment' or 'Payment' match) and globbed src/engines/*Payment*/*ReceivePayment*/*CashApplication* (no files). Confirmed NOT a duplicate. Reused (did not rebuild): roundCentsHalfEven from SalesUseTaxEngine.ts (imported), EstimateEngine.toSalesOrder() output shape referenced in JSDoc as the upstream producer, GeneralLedgerEngine chart-of-a
... [+4394 chars truncated]

### Assistant | 2026-05-30T01:44:19.511Z

I'll review this engine end-to-end with a financial-correctness lens. Let me read the files.

### Assistant | 2026-05-30T01:44:20.000Z

[tool_use: Read]

### Assistant | 2026-05-30T01:44:21.006Z

[tool_use: Read]

### Assistant | 2026-05-30T01:44:21.071Z

[tool_use: Read]

### User | 2026-05-30T01:44:30.225Z

[tool_result] 1	/**
2	 * ReceivePaymentEngine — customer cash-application for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Receive Payment" function (apply a customer payment against open invoices).
5	 * QB-PARITY Phase-2 engine #4 of the A/R revenue cycle
6	 * (Estimate → SalesOrder → CreditMemo → ReceivePayment → Statement → Dunning, roadmap task #18).
7	 *
8	 * Producer / PR
... [+17257 chars truncated]

### User | 2026-05-30T01:44:30.611Z

[tool_result] 1	/**
2	 * ReceivePaymentEngine.test.ts — QuickBooks "Receive Payment" cash-application parity.
3	 *
4	 * Reference values are hand-computed (NOT toBeDefined() stubs). Each test encodes WHY the behaviour
5	 * matters: a payment must reconcile to the penny against the open A/R it relieves, over-apply must
6	 * fail loud, and the returned GL must balance.
7	 */
8	import { describe, it, expect } from
... [+13222 chars truncated]

### User | 2026-05-30T01:44:30.753Z

[tool_result] 1	/**
2	 * cash-application-accounts.ts — GL account designations + policy constants for the
3	 * customer cash-application (QuickBooks "Receive Payment") cycle in the PRISM ERP
4	 * (galaxy:business, slot:hotel).
5	 *
6	 * Single source of truth for the accounts ReceivePaymentEngine posts to, so the engine
7	 * NEVER inlines an account number or a policy rate (business/GSD.md §2.1 financial-invar
... [+1878 chars truncated]

### Assistant | 2026-05-30T01:44:34.364Z

Now let me verify the one critical dependency — `roundCentsHalfEven` — since the entire reconciliation math rests on its actual behavior. The build report claims `0.125 → 0.12`. I need to confirm the real implementation.

### Assistant | 2026-05-30T01:44:36.565Z

[tool_use: Grep]

### User | 2026-05-30T01:44:45.587Z

[tool_result] 32:export function roundCentsHalfEven(value: number): number {
33-  if (!Number.isFinite(value)) throw new Error(`[sales-tax] non-finite amount: ${value}`);
34-  const sign = value < 0 ? -1 : 1;
35-  const abs = Math.abs(value) * 100;
36-  const floor = Math.floor(abs);
37-  const diff = abs - floor;
38-  const EPS = 1e-9;
39-  let rounded: number;
40-  if (Math.abs(diff - 0.5) < EPS) rounded = fl
... [+2584 chars truncated]

### Assistant | 2026-05-30T01:45:34.586Z

I now have everything needed. The `roundCentsHalfEven` implementation is confirmed: it operates on `abs * 100`, rounds half-to-even, and divides by 100. The build report's claim `0.125 → 0.12` is correct (`12.5` ties to even `12`).

Let me trace the financial correctness carefully, especially around the half-even rounding seam since that's where unbalanced results hide.

## Analysis

**Reconciliation invariant — is it actually exact?** The build report claims `Σapplied + unappliedCredit == payment.amount EXACTLY`. Let me find the hole.

`unappliedCredit = roundCentsHalfEven(paymentAmount - totalApplied)`. Since `paymentAmount` and `totalApplied` are both already cent-rounded, their difference is already a clean cent value, so the re-round is a no-op. Reconciliation `totalApplied + unappliedCredit` reconstructs `paymentAmount`. This holds — **on the rounded basis**. Good.

**The real bug — oldest-first per-invoice rounding seam (P1).** Consider odd-cent balances where `Math.min(remaining, balance)` is never the binding constraint but the *sum* of independently-rounded applications drifts. Construct:

- payment `amount = 0.10`
- invoices (oldest-first): `INV-1 balance=0.025`, `INV-2 balance=0.025`, `INV-3 balance=0.10`, dates ascending.

Trace `applyOldestFirst`:
- `balanceById`: `0.025 → roundCentsHalfEven(0.025)`. `abs=2.5`, `diff=0.5` tie → even → floor `2` → `0.02`. So both INV-1 and INV-2 store **0.02**. INV-3 stores `0.10`.
- remaining=0.10. INV-1: `min(0.10, 0.02)=0.02`, applied 0.02, remaining 0.08. INV-2: applied 0.02, remaining 0.06. INV-3: `min(0.06,0.10)=0.06`, applied 0.06, remaining 0.
- totalApplied = 0.02+0.02+0.06 = 0.10. unapplied 0. Reconciles. **No bug here** — `Math.min` caps each to the rounded balance, and `remaining` is re-rounded each step.

The `Math.min` + per-step `roundCentsHalfEven(remaining - amountApplied)` design genuinely closes the multi-invoice drift seam. I tried several odd-cent fills (0.01 fanned across sub-cent balances) and the
... [+6378 chars truncated]
