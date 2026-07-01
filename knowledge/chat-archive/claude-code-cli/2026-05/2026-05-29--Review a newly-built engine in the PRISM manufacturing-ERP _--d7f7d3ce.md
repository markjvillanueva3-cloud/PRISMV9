---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Review a newly-built engine in the PRISM manufacturing-ERP (galaxy:business, slo"
date: "2026-05-29"
first_ts: "2026-05-29T19:24:19.817Z"
last_ts: "2026-05-29T19:42:31.255Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a0387a43f9bbba4c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Review a newly-built engine in the PRISM manufacturing-ERP (galaxy:business, slo

> **claude-code-cli** | 2026-05-29 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a0387a43f9bbba4c8.jsonl`

## Transcript

### User | 2026-05-29T19:24:19.817Z

Review a newly-built engine in the PRISM manufacturing-ERP (galaxy:business, slot:hotel). It implements QuickBooks-parity "Estimate" (non-binding customer quote → discount → tax → status FSM → convert-to-sales-order). It is the first Phase-2 A/R engine. Grade PASS or FAIL with concrete file:line P0/P1/P2 findings. 26 tests currently pass.

Read END TO END (absolute paths):
1. H:\prism-slot-hotel\mcp-server\src\engines\EstimateEngine.ts
2. H:\prism-slot-hotel\mcp-server\src\data\estimate-policy.ts
3. H:\prism-slot-hotel\mcp-server\src\__tests__\EstimateEngine.test.ts

It imports `roundCentsHalfEven` + `SalesUseTaxEngine.calcSalesTax` from H:\prism-slot-hotel\mcp-server\src\engines\SalesUseTaxEngine.ts (already independently reviewed + 20 tests — you can trust it; just confirm the call args are correct).

Weighted concerns (highest first):
- **Pro-rata tax allocation correctness** (EstimateEngine.ts `create`, the `taxableShare` / `taxableBase` block): when an estimate mixes taxable and non-taxable lines AND has a discount, the engine allocates the discount proportionally to the taxable share: `taxableBase = (subtotal − discount) × (taxableExtension / subtotal)`. Is this a correct, defensible sales-tax convention? Walk a worked example (e.g. $1000 taxable + $1000 exempt freight, 10% discount → what SHOULD the taxable base be, and does the code produce it?). Flag if it under- or over-taxes. Consider the subtotal==0 edge (division guard).
- **Reconciliation invariant**: does `subtotal − discountAmount + tax === grandTotal` hold on every path (including rounding)? Is there a path where rounding the parts independently makes the identity drift by a cent?
- **Status FSM (estimate-policy.ts)**: are the transitions sound for a real quote lifecycle? Any missing legal edge or any dangerous edge (e.g. can a converted estimate be re-converted / double-counted downstream)? Is `accepted → expired` correct or should an accepted estimate be immune to expiry (note `isExpired` already 
... [+821 chars truncated]

### Assistant | 2026-05-29T19:24:47.229Z

I'll review this engine end-to-end. Let me read all three files plus the dependency's signatures in parallel.

### Assistant | 2026-05-29T19:24:47.231Z

[tool_use: Read]

### Assistant | 2026-05-29T19:24:47.238Z

[tool_use: Read]

### Assistant | 2026-05-29T19:24:47.703Z

[tool_use: Read]

### Assistant | 2026-05-29T19:24:47.804Z

[tool_use: Read]

### User | 2026-05-29T19:25:13.416Z

[tool_result] 1	/**
2	 * EstimateEngine — customer estimates / quotes for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Estimate" function set (build a non-binding price proposal, discount it,
5	 * compute tax, send → accept/reject/expire, convert an accepted estimate to a sales order).
6	 * QB-PARITY-MS0 Phase-2 engine #1 (A/R revenue cycle, the first step of the QB sales workf
... [+8717 chars truncated]

### User | 2026-05-29T19:25:13.533Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { EstimateEngine as E, type Estimate } from "../engines/EstimateEngine.js";
3	
4	const base = (over: Record<string, unknown> = {}) => ({
5	  customerId: "CUST-1",
6	  issueDate: "2026-01-01",
7	  lines: [{ description: "CNC part A", quantity: 10, unitPrice: 100 }],
8	  ...over,
9	});
10	
11	describe("EstimateEngine.create — line/subtotal/to
... [+6863 chars truncated]

### User | 2026-05-29T19:25:13.535Z

[tool_result] 1	/**
2	 * estimate-policy.ts — estimate/quote policy for the PRISM ERP (galaxy:business).
3	 *
4	 * Imported by EstimateEngine — the default validity window and the status state-machine are SHOP
5	 * POLICY, not engine logic; per business/CLAUDE.md §8.7 (anti-pattern: inlining customer/shop terms)
6	 * they live here so a policy change is one edit, not a code hunt. A shop with a 14-day quote vali
... [+1781 chars truncated]

### User | 2026-05-29T19:25:13.726Z

[tool_result] 1	/**
2	 * SalesUseTaxEngine — sales & use tax for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Sales Tax" function set (calc tax on a taxable sale, self-assess use tax,
5	 * aggregate the period liability to remit, "Pay Sales Tax"). QB-PARITY-MS0 Phase-1 engine #1 — the
6	 * audit's #1 true pillar gap (prior coverage was only an `integration_export_payroll_tax` s
... [+6464 chars truncated]

### Assistant | 2026-05-29T19:25:19.951Z

Now let me verify the tax rate data and confirm the call args are correct, then work the adversarial examples.

### Assistant | 2026-05-29T19:25:20.396Z

[tool_use: Read]

### User | 2026-05-29T19:25:52.267Z

[tool_result] 1	/**
2	 * sales-tax-rates.ts — US sales/use tax rate table for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * Imported by SalesUseTaxEngine — NEVER inline a tax rate in engine code (financial-invariant /
5	 * anti-pattern #1: jurisdiction-specific + changes over time; a stale inlined rate = wrong tax =
6	 * real liability). This module is the single source of truth.
7	 *
8	 * ⚠ HONESTY: t
... [+3745 chars truncated]

### Assistant | 2026-05-29T19:26:03.010Z

I now have everything. Let me work the weighted concerns adversarially with concrete arithmetic.

**Concern 1 — Pro-rata tax allocation.** Worked example from the prompt: $1000 taxable + $1000 exempt freight, 10% discount.
- subtotal = 2000, discount = 200, taxableExtension = 1000, taxableShare = 1000/2000 = 0.5
- taxableBase = (2000 − 200) × 0.5 = 1800 × 0.5 = **900**. Tax @ 6% = $54. This is the correct, defensible convention: the discount is spread proportionally across taxable and exempt lines, so the taxable line's share of the $200 discount is $100, leaving $900 taxable. This is the standard "discount allocated pro-rata by extended price" method that QuickBooks and most DOR guidance endorse. Correct.

Now let me hunt for the reconciliation drift — this is where the real bug lives.

**Concern 2 — Reconciliation invariant drift.** The identity is `subtotal − discountAmount + tax === grandTotal`. Note `grandTotal = roundCentsHalfEven(subtotal − discountAmount + tax)`. Since `subtotal`, `discountAmount`, and `tax` are each already cent-rounded, their sum is already an exact multiple of $0.01 (modulo float epsilon), so the outer round is a no-op and the identity holds on the reported fields. That part is safe. **But** there's a subtler issue: `taxableBase` is rounded independently from the pro-rata math, and the *sum of allocated bases need not equal subtotal − discount*. That's expected (the exempt base isn't taxed) — not a reconciliation break. Let me find the actual cent-drift path.

Let me construct an adversarial pro-rata rounding case.

### Assistant | 2026-05-29T19:26:08.959Z

[tool_use: Bash]

### User | 2026-05-29T19:29:44.195Z

[tool_result] {
  subtotal: 1000,
  discount: 0.01,
  taxableExt: 333.33,
  share: 0.33332999999999996,
  taxableBase: 333.33,
  tax: 20,
  grand: 1019.99,
  recon: 1019.99
}
identity holds? true

### Assistant | 2026-05-29T19:29:50.661Z

Reconciliation identity holds (the outer round on grandTotal absorbs sub-cent float noise since the three parts are each cent-aligned). Now let me probe the discount-clamp ordering bug and the percent>100 throw ordering, plus the FSM `accepted → expired` inconsistency.

### Assistant | 2026-05-29T19:30:03.507Z

[tool_use: Bash]

### User | 2026-05-29T19:34:43.938Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-05-29T19:34:46.653Z

RTK doesn't like the multiline heredoc. Let me run it raw.

### Assistant | 2026-05-29T19:34:50.587Z

[tool_use: Bash]

### User | 2026-05-29T19:36:46.920Z

[tool_result] all-exempt taxableBase: 0 taxComputed? false
UNKNOWN-JURIS + all-exempt: calcSalesTax SKIPPED (taxableBase=0) => ZZ never validated, no throw
taxExempt w/o reason + taxableBase=0 => calcSalesTax SKIPPED => missing-reason NOT enforced

### Assistant | 2026-05-29T19:36:50.609Z

Confirmed two silent-skip paths. Let me confirm the `percent>100` throw-ordering and the negative-discount handling, and verify the FSM `accepted → expired` self-contradiction.

### Assistant | 2026-05-29T19:36:56.885Z

[tool_use: Bash]

### User | 2026-05-29T19:37:55.140Z

[tool_result] percent 150: clamp computes 1000 then throw fires => SAFE (throw still reached)
FSM allows accepted->expired: true
but isExpired() returns false for accepted (immune). => transition(accepted,expired) SUCCEEDS, producing status=expired, after which isExpired now returns TRUE (status no longer accepted). Self-inconsistent: an estimate the engine swore could not expire CAN be force-expired via the FS
... [+30 chars truncated]

### Assistant | 2026-05-29T19:37:58.892Z

Let me confirm the date-math edge cases (month boundary + the `addDays` validation gap for malformed dates that slice past the validation) and the lexicographic comparison correctness, plus whether `addDays` validates a too-short date.

### Assistant | 2026-05-29T19:38:06.051Z

[tool_use: Bash]

### User | 2026-05-29T19:39:54.205Z

[tool_result] Exit code 1
Jan31+1: 2026-02-01
Feb28+1 (2026 non-leap): 2026-03-01
Feb28+1 (2024 leap): 2024-02-29
Dec31+30: 2027-01-30
leading-zero lexicographic: 2026-02-05 > 2026-01-31 ? true
[eval]:8
console.log("2026-1-1 short form Date parse:", new Date("2026-1-1T00:00:00Z").toISOString().slice(0,10)); // does short non-padded parse? 
                                                                      
... [+416 chars truncated]

### Assistant | 2026-05-29T19:39:59.312Z

Good — date math is correct for valid ISO dates (month/year/leap boundaries all right, lexicographic compare is chronologically valid for zero-padded `YYYY-MM-DD`). The `2026-1-1T00:00:00Z` throws as Invalid, which is what `addDays` would catch. Let me check the remaining malformed-date and the `13-45` overflow coercion path.

### Assistant | 2026-05-29T19:40:03.532Z

[tool_use: Bash]

### User | 2026-05-29T19:40:52.170Z

[tool_result] 2026-1-1 threw: invalid 2026-1-1
2026-13-45 threw: invalid 2026-13-45

### Assistant | 2026-05-29T19:40:56.649Z

Both malformed dates throw — `addDays` is the validation gate (called for `validUntil`), so an invalid `issueDate` can never reach the stored estimate. Date handling is sound.

Now let me do a final adversarial sweep: can I construct a wrong *total* via the `extension` re-rounding vs subtotal, and confirm the `taxableExtension` re-round of already-rounded extensions is harmless.

### Assistant | 2026-05-29T19:41:04.568Z

[tool_use: Bash]

### User | 2026-05-29T19:41:36.069Z

[tool_result] ext(3*33.335)= 100 sub of 7= 700 7* 100 = 700
taxableExt reround of [1000,250 taxable]= 1250
(99.01)*.5 => 49.5

### Assistant | 2026-05-29T19:42:31.255Z

All rounding paths are clean — the reconciliation invariant holds on every path because each component is cent-aligned before the final sum is re-rounded. My analysis is complete. Here is the review.

---

## Code Quality Analysis Report — EstimateEngine

### Summary
- **Files analyzed:** 3 (engine, policy, test) + 2 dependency files confirmed (`SalesUseTaxEngine.ts`, `sales-tax-rates.ts`)
- **Pro-rata tax allocation:** correct and defensible
- **Reconciliation invariant:** holds on every path including rounding
- **Date math:** correct (UTC, deterministic, boundary-safe, lexicographic compare valid)
- **Issues found:** 0 P0 · 3 P1 · 3 P2

### Weighted-concern findings

**1. Pro-rata tax allocation — CORRECT (highest weight).** `EstimateEngine.ts:117-121`. Worked example $1000 taxable + $1000 exempt freight, 10% discount: subtotal 2000, discount 200, taxableShare 1000/2000 = 0.5, `taxableBase = (2000−200)×0.5 = 900`, tax @6% = $54. This is the standard "discount allocated pro-rata by extended price" convention (QuickBooks + general DOR guidance) — the taxable line absorbs its proportional $100 of the discount, not all or none of it. Neither under- nor over-taxes. The `subtotal > 0 ? … : 0` division guard at line 120 is present and correct (an all-zero-price estimate yields share 0, base 0). PASS.

**2. Reconciliation invariant — HOLDS (no cent drift).** `EstimateEngine.ts:134`. `subtotal`, `discountAmount`, and `tax` are each `roundCentsHalfEven`-aligned before the sum, so `subtotal − discountAmount + tax` is already an exact multiple of $0.01; the outer round at line 134 only absorbs float epsilon. I tried to force drift with 333.33/666.67 splits, a $0.01 discount on a non-clean share, and 0.005 ties — the identity `subtotal − discountAmount + tax === grandTotal` held exactly every time. PASS.

**3. P1 — FSM `accepted → expired` self-contradicts `isExpired`.** `estimate-policy.ts:32` allows `accepted: ["converted", "expired"]`, but `EstimateEngine.ts:164` makes `is
... [+7710 chars truncated]
