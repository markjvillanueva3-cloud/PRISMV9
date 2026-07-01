---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "RE-REVIEW (round 2) of EstimateEngine in the PRISM ERP. Your round-1 review retu"
date: "2026-05-29"
first_ts: "2026-05-29T19:46:33.694Z"
last_ts: "2026-05-29T19:48:14.650Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-aa74b8bb9e82cb45e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# RE-REVIEW (round 2) of EstimateEngine in the PRISM ERP. Your round-1 review retu

> **claude-code-cli** | 2026-05-29 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-aa74b8bb9e82cb45e.jsonl`

## Transcript

### User | 2026-05-29T19:46:33.694Z

RE-REVIEW (round 2) of EstimateEngine in the PRISM ERP. Your round-1 review returned FAIL with three P1 findings. They have now been fixed. Confirm each fix is correct and complete, check no regression was introduced, then grade PASS or FAIL.

Read END TO END:
1. H:\prism-slot-hotel\mcp-server\src\engines\EstimateEngine.ts
2. H:\prism-slot-hotel\mcp-server\src\data\estimate-policy.ts
3. H:\prism-slot-hotel\mcp-server\src\__tests__\EstimateEngine.test.ts  (now 29 tests, all passing)

The three P1 fixes to verify:
- **P1 #3 (FSM/isExpired contradiction)**: the `accepted → expired` edge was REMOVED from `ESTIMATE_STATUS_TRANSITIONS` in estimate-policy.ts — `accepted` now transitions only to `["converted"]`. Confirm this makes the FSM consistent with `isExpired` (which treats accepted/converted as never-expiring). Confirm there's a test asserting `accepted → expired` now throws AND that `isExpired(accepted, far-future)` is false.
- **P1 #4 (silent-skip unknown jurisdiction)**: the tax guard changed from `if (e.taxJurisdiction && taxableBase > 0)` to `if (e.taxJurisdiction)`. Confirm an unknown jurisdiction now throws even when taxableBase is 0 (all-non-taxable lines), via SalesUseTaxEngine.calcSalesTax → getSalesTaxRate. Confirm a test covers it.
- **P1 #5 (silent-skip exempt-without-reason)**: same guard change. Confirm an exempt estimate with no exemptReason now throws even at $0 taxable base. Confirm a test covers it.

Also verify NO regression: does calcSalesTax handle amount=0 correctly (returns tax 0, doesn't throw on a valid jurisdiction)? Do all the prior-passing scenarios (tax $60, pro-rata $1000 base, exempt-with-reason $0 tax) still hold given the guard now fires at base 0? Does the percent-discount validation now correctly precede the clamp?

Note: two P2s from round 1 are being DEFERRED to the plan (estimateId same-day collision; toSalesOrder not auto-transitioning to converted) — do not fail on those; just confirm they're the only remaining items and re-fl
... [+119 chars truncated]

### Assistant | 2026-05-29T19:46:44.349Z

I'll re-review the three files end to end to verify each P1 fix and check for regressions.

### Assistant | 2026-05-29T19:46:45.470Z

[tool_use: Read]

### Assistant | 2026-05-29T19:46:45.840Z

[tool_use: Read]

### Assistant | 2026-05-29T19:46:46.025Z

[tool_use: Read]

### User | 2026-05-29T19:46:51.327Z

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
... [+7857 chars truncated]

### User | 2026-05-29T19:46:51.674Z

[tool_result] 1	/**
2	 * EstimateEngine — customer estimates / quotes for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Estimate" function set (build a non-binding price proposal, discount it,
5	 * compute tax, send → accept/reject/expire, convert an accepted estimate to a sales order).
6	 * QB-PARITY-MS0 Phase-2 engine #1 (A/R revenue cycle, the first step of the QB sales workf
... [+9191 chars truncated]

### User | 2026-05-29T19:46:52.643Z

[tool_result] 1	/**
2	 * estimate-policy.ts — estimate/quote policy for the PRISM ERP (galaxy:business).
3	 *
4	 * Imported by EstimateEngine — the default validity window and the status state-machine are SHOP
5	 * POLICY, not engine logic; per business/CLAUDE.md §8.7 (anti-pattern: inlining customer/shop terms)
6	 * they live here so a policy change is one edit, not a code hunt. A shop with a 14-day quote vali
... [+1817 chars truncated]

### Assistant | 2026-05-29T19:46:56.550Z

I have all three files. To verify the regression-check claim about `calcSalesTax` handling `amount=0` and unknown-jurisdiction throwing, I need to read the actual SalesUseTaxEngine implementation it depends on.

### Assistant | 2026-05-29T19:46:56.551Z

[tool_use: Glob]

### User | 2026-05-29T19:47:00.537Z

[tool_result] src\engines\SalesUseTaxEngine.ts

### Assistant | 2026-05-29T19:47:03.312Z

[tool_use: Read]

### User | 2026-05-29T19:47:12.230Z

[tool_result] 1	/**
2	 * SalesUseTaxEngine — sales & use tax for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Sales Tax" function set (calc tax on a taxable sale, self-assess use tax,
5	 * aggregate the period liability to remit, "Pay Sales Tax"). QB-PARITY-MS0 Phase-1 engine #1 — the
6	 * audit's #1 true pillar gap (prior coverage was only an `integration_export_payroll_tax` s
... [+6464 chars truncated]

### Assistant | 2026-05-29T19:47:15.597Z

Now let me confirm the rate-lookup behavior for an unknown jurisdiction and a valid one (MI), since the regression check depends on `getSalesTaxRate` throwing on unknown but not on a valid jurisdiction at amount 0.

### Assistant | 2026-05-29T19:47:15.954Z

[tool_use: Glob]

### User | 2026-05-29T19:47:22.218Z

[tool_result] No files found

### Assistant | 2026-05-29T19:47:25.379Z

[tool_use: Glob]

### User | 2026-05-29T19:47:29.755Z

[tool_result] src\data\sales-tax-rates.ts

### Assistant | 2026-05-29T19:47:33.340Z

[tool_use: Read]

### User | 2026-05-29T19:47:39.039Z

[tool_result] 1	/**
2	 * sales-tax-rates.ts — US sales/use tax rate table for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * Imported by SalesUseTaxEngine — NEVER inline a tax rate in engine code (financial-invariant /
5	 * anti-pattern #1: jurisdiction-specific + changes over time; a stale inlined rate = wrong tax =
6	 * real liability). This module is the single source of truth.
7	 *
8	 * ⚠ HONESTY: t
... [+3745 chars truncated]

### Assistant | 2026-05-29T19:48:14.650Z

I now have the complete dependency chain. Let me trace each fix and regression concern against the actual code.

## Verification trace

**P1 #3 — FSM/isExpired contradiction (FIXED, correct)**
- `estimate-policy.ts:32` — `accepted: ["converted"]`. The `expired` edge is gone; `accepted` transitions only to `["converted"]`. Confirmed.
- `EstimateEngine.ts:168` — `isExpired` returns `false` for `accepted`/`converted` unconditionally. The FSM (no `accepted→expired` edge) and the predicate (accepted never expires) are now mutually consistent — neither path can produce an "expired accepted" estimate.
- Test `EstimateEngine.test.ts:115-119` asserts both halves in one case: `E.transition(accepted, "expired")` throws `/illegal status transition/` AND `E.isExpired(accepted, "2099-01-01") === false`. A second corroborating case at :129-132 asserts `isExpired(accepted, "2030-01-01") === false`. Both the throw and the far-future-false are covered. Confirmed complete.

**P1 #4 — silent-skip unknown jurisdiction (FIXED, correct)**
- `EstimateEngine.ts:128` — guard is now `if (e.taxJurisdiction)` (the `&& taxableBase > 0` is gone). Confirmed.
- Path at `:129-135` → `SalesUseTaxEngine.calcSalesTax({ amount: taxableBase=0, jurisdiction: "ZZ", ... })` → `#compute` (`:82-84`) → `TaxableSaleSchema.parse` (passes; amount 0 is finite) → `getSalesTaxRate("ZZ")` (`sales-tax-rates.ts:55-61`) throws "unknown jurisdiction". So an unknown jurisdiction throws even at $0 base. Confirmed.
- Test `:165-167` — all-non-taxable line ($1000, `taxable:false`) ⇒ `taxableBase=0`, `taxJurisdiction:"ZZ"` ⇒ `.toThrow()`. The test's premise is sound: `taxableExtension=0`, `taxableShare=0`, `taxableBase=0`, yet the guard fires because `e.taxJurisdiction` is truthy. Covered. Confirmed.

**P1 #5 — silent-skip exempt-without-reason (FIXED, correct)**
- Same `:128` guard. Path → `calcSalesTax({ amount:0, jurisdiction:"MI", exempt:true, exemptReason:undefined })` → `#compute` → `getSalesTaxRate("MI")` resolves OK →
... [+4073 chars truncated]
