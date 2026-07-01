---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent financial-correctness review of the just-built VendorCreditEngine (P"
date: "2026-05-30"
first_ts: "2026-05-30T04:01:02.154Z"
last_ts: "2026-05-30T04:03:53.358Z"
cwd: "H:\\prism-slot-hotel"
messages: 28
user_msgs: 12
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_bce5678d-743/agent-a134e43a611857eeb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Independent financial-correctness review of the just-built VendorCreditEngine (P

> **claude-code-cli** | 2026-05-30 | 28 msgs (12 user / 16 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_bce5678d-743/agent-a134e43a611857eeb.jsonl`

## Transcript

### User | 2026-05-30T04:01:02.154Z

Independent financial-correctness review of the just-built VendorCreditEngine (PRISM ERP, galaxy:business, A/P + banking). Read END TO END: H:/prism-slot-hotel/mcp-server/src/engines/VendorCreditEngine.ts + H:/prism-slot-hotel/mcp-server/src/__tests__/VendorCreditEngine.test.ts (+ any H:/prism-slot-hotel/mcp-server/src/data/*.ts it imports). SPEC: QuickBooks "Vendor Credit" parity (QB-PARITY Phase-3 A/P #1) — the A/P MIRROR of CreditMemoEngine. Producer: a return-to-vendor / vendor refund / vendor overbilling. Methods: create({vendorCreditId?, vendorId, reason, lines[{description,quantity,unitPrice,taxable?}], taxJurisdiction?}) → subtotal/tax/total (reuse roundCentsHalfEven; tax via SalesUseTaxEngine.calcSalesTax IF jurisdiction given — import it; validate reason against a vendor-credit-policy.ts reason list); applyToBill(vc, {billId, billBalance, amount}) → dual-ceiling over-apply THROWS (amount ≤ remaining credit AND ≤ billBalance), immutable (returns NEW object), tracks applied/unapplied; remainingCredit(vc); glLinesForIssue(vc) → REVERSES the original purchase: DR 2000 Accounts Payable (total) / CR 1320 Raw Materials (subtotal) [+ CR 2100 Tax Payable (tax)] — Σdr==Σcr asserted. Reference tests: create w/ tax, apply partial/full to bill, over-apply throws both ceilings, unapplied tracking, GL balances, adversarial (negative qty, NaN).

BUILD REPORT: The standalone tsc invocation produced no isolated-mode errors against my files (the `import` of `roundCentsHalfEven`/`SalesUseTaxEngine` resolves; the only way that emits no output is clean parse + type-check of my two files in isolation). The authoritative signal is the vitest run, which compiles via the project's transform pipeline and passed all 26 — that confirms the imports resolve and types are sound in the real build context.

Build complete and green. Summary below.

---

**Engine:** `VendorCreditEngine` (galaxy:business, slot:hotel) — QuickBooks "Vendor Credit" parity, the A/P mirror of `CreditMemoEngine`.

... [+3433 chars truncated]

### Assistant | 2026-05-30T04:01:30.112Z

I'll review the VendorCreditEngine end to end with a financial-correctness lens. Let me read the files.

### Assistant | 2026-05-30T04:01:31.077Z

[tool_use: Read]

### Assistant | 2026-05-30T04:01:31.548Z

[tool_use: Read]

### Assistant | 2026-05-30T04:01:31.782Z

[tool_use: Read]

### User | 2026-05-30T04:01:44.651Z

[tool_result] 1	/**
2	 * VendorCreditEngine — vendor credits (Accounts-Payable side) for the PRISM ERP
3	 * (galaxy:business, slot:hotel).
4	 *
5	 * QuickBooks-parity: the "Vendor Credit" function set (QB-PARITY Phase-3 A/P engine #1). This is the
6	 * A/P MIRROR of `CreditMemoEngine` (A/R): where a credit memo is a NEGATIVE-revenue document born from
7	 * a customer return, a vendor credit is a NEGATIVE-expens
... [+15938 chars truncated]

### User | 2026-05-30T04:01:46.384Z

[tool_result] 1	/**
2	 * VendorCreditEngine tests — QuickBooks "Vendor Credit" parity (A/P mirror of CreditMemoEngine).
3	 *
4	 * Reference values are HAND-COMPUTED against the imported MI/IN rates (sales-tax-rates.ts:
5	 * MI=6%, IN=7%) and the half-even rounding rule (roundCentsHalfEven). No toBeDefined() stubs:
6	 * every assertion encodes a concrete dollar amount or a concrete failure mode.
7	 */
8	import {
... [+14362 chars truncated]

### User | 2026-05-30T04:01:47.234Z

[tool_result] 1	/**
2	 * vendor-credit-policy.ts — constants & policy for the QuickBooks-parity Vendor Credit engine
3	 * (galaxy:business, slot:hotel). Single source of truth for the GL accounts a vendor credit
4	 * touches and the reason allowlist — so VendorCreditEngine never inlines an account number or a
5	 * policy value (financial-invariant gate, business/GSD.md §2, [[feedback_hotel_financial_invariant_g
... [+4111 chars truncated]

### Assistant | 2026-05-30T04:01:51.233Z

Now let me verify the imported dependencies actually exist and have the contracts the engine assumes — `roundCentsHalfEven`, `SalesUseTaxEngine.calcSalesTax`, the tax rates, and how `recordPurchase` actually posts (to confirm the reversal is a true inverse).

### Assistant | 2026-05-30T04:01:51.717Z

[tool_use: Read]

### Assistant | 2026-05-30T04:01:52.183Z

[tool_use: Glob]

### Assistant | 2026-05-30T04:01:52.666Z

[tool_use: Glob]

### Assistant | 2026-05-30T04:01:53.017Z

[tool_use: Glob]

### User | 2026-05-30T04:01:59.210Z

[tool_result] mcp-server\src\data\sales-tax-rates.ts

### User | 2026-05-30T04:01:59.521Z

[tool_result] 1	/**
2	 * SalesUseTaxEngine — sales & use tax for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Sales Tax" function set (calc tax on a taxable sale, self-assess use tax,
5	 * aggregate the period liability to remit, "Pay Sales Tax"). QB-PARITY-MS0 Phase-1 engine #1 — the
6	 * audit's #1 true pillar gap (prior coverage was only an `integration_export_payroll_tax` s
... [+6464 chars truncated]

### User | 2026-05-30T04:02:00.132Z

[tool_result] mcp-server\src\engines\GeneralLedgerEngine.ts

### User | 2026-05-30T04:02:00.323Z

[tool_result] mcp-server\src\engines\CreditMemoEngine.ts

### Assistant | 2026-05-30T04:02:03.851Z

I have what I need on SalesUseTaxEngine. Let me read the tax rates data and the two engines whose contracts the reversal claims to mirror — `recordPurchase` (must be a true inverse) and `CreditMemoEngine` (the A/R sibling for the sign-leg claim).

### Assistant | 2026-05-30T04:02:04.793Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:05.942Z

[tool_use: Grep]

### User | 2026-05-30T04:02:09.279Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\mcp-server\src\data\sales-tax-rates.ts' was already read 6m ago in this session and is unchanged (mtime 1780076759279). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-30T04:02:12.642Z

[tool_result] 8: *       recordInvoice, recordPayment, recordPurchase, recordPayroll,
9- *       recordJobCost, recordWipToCogs, createJournalEntry (generic)
10- *   - Derived financial statements:
11- *       getTrialBalance, getIncomeStatement, getBalanceSheet
12- *
13- * Accounting invariants (enforced):
14- *   - Every journal entry balances: Σdebits === Σcredits
15- *   - Trial balance total debits === tot
... [+5009 chars truncated]

### Assistant | 2026-05-30T04:02:16.781Z

This is the critical finding. The reversal claims to be the inverse of `recordPurchase`, but `recordPurchase` posts tax to **2100 as a DEBIT** (input tax recoverable, line 325), with the AP credit being `amount + tax` (line 327). Let me confirm the exact `RecordPurchaseInputSchema` semantics (is `amount` the pre-tax base?) and check the tax-rates content I already have, then verify the CreditMemoEngine sign claim.

### Assistant | 2026-05-30T04:02:18.241Z

[tool_use: Grep]

### Assistant | 2026-05-30T04:02:19.838Z

[tool_use: Grep]

### User | 2026-05-30T04:02:42.242Z

[tool_result] 131:export const RecordPurchaseInputSchema = z.object({
132-  po_id: z.string().min(1),
133-  amount: z.number().positive().finite(),
134-  tax: z.number().min(0).finite().optional().default(0),
135-  category: z.string().min(1),
136-  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
137-});
138-
139-export const RecordPayrollInputSchema = z.object({
140-  period: z.string().min(1),
141-  gross: z.n
... [+1010 chars truncated]

### User | 2026-05-30T04:02:44.630Z

[tool_result] 3- *
4- * QuickBooks-parity: the "Credit Memo" function set (QB-PARITY-MS0 Phase-2 #3, the A/R revenue
5- * cycle: Estimate → Sales Order → Invoice → **Credit Memo** → Receive Payment → Statement → Dunning).
6: * A credit memo is a NEGATIVE-revenue document: it reverses revenue (and the tax that rode it) and
7- * reduces what the customer owes. It is BORN from a customer return/RMA or a post-invoi
... [+5980 chars truncated]

### Assistant | 2026-05-30T04:03:53.358Z

I now have everything needed to adjudicate the central financial claim. Let me work through the GL reversal arithmetic carefully, because this is where the engine either reverses the purchase correctly or posts a wrong/unbalanced entry.

## The original purchase posting (`recordPurchase`, GeneralLedgerEngine.ts:317-335)

For a taxable purchase, `recordPurchase` posts (where `amount` = pre-tax base, `tax` = input tax):

```
DR 1320 Raw Materials   amount            (the expense/asset)
DR 2100 Tax Payable     tax               (input tax recoverable — line 325)
CR 2000 Accounts Payable amount + tax     (line 327)
```

Note carefully: **tax is a DEBIT to 2100** on the purchase (recoverable input tax). The full payable owed is `amount + tax`.

## The VendorCredit reversal posting (`glLinesForIssue`, VendorCreditEngine.ts:305-312)

For `subtotal=751.00, tax=45.06, total=796.06`:

```
DR 2000 Accounts Payable   796.06   (total)
CR 1320 Raw Materials      751.00   (subtotal)
CR 2100 Tax Payable         45.06   (tax)
```

## The verdict on correctness

A true inverse of the purchase would be:

```
DR 2000 AP        796.06
CR 1320 Raw       751.00
CR 2100 Tax        45.06   ← reverses the DR 2100 from the purchase
```

This **is** the exact mathematical inverse. Every leg flips sign, the amounts match, and Σdr == Σcr == 796.06. The tax leg credits 2100, which correctly reverses the purchase's *debit* to 2100. **The posting is balanced and economically correct.** The engine's own sign-note (policy lines 15-21) is muddled prose — it claims the purchase "ACCRUED a use-tax liability (a credit to 2100)", which contradicts the actual `recordPurchase` (it *debits* 2100). But the prose is wrong about the *mechanism* while the *number and direction the code emits are right*: a CR to 2100 is exactly what reverses a prior DR to 2100. So this is a documentation defect, not a posting defect. I flag it P2 below (a future maintainer trusting the comment could "fix" the code into a real bug
... [+10102 chars truncated]
