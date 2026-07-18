---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "You are reviewing a dispatcher-wiring change in the PRISM repo, worktree H:/pris"
date: "2026-06-11"
first_ts: "2026-06-11T13:19:58.735Z"
last_ts: "2026-06-11T13:20:48.101Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a671b3d12f8ccbfbf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# You are reviewing a dispatcher-wiring change in the PRISM repo, worktree H:/pris

> **claude-code-cli** | 2026-06-11 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a671b3d12f8ccbfbf.jsonl`

## Transcript

### User | 2026-06-11T13:19:58.735Z

You are reviewing a dispatcher-wiring change in the PRISM repo, worktree H:/prism-slot-hotel (branch slot/hotel). Unit: U-HOTEL-SUPPLIER-DIR-WIRE (slot:hotel, 2026-06-11). Goal: wire the SupplierCapabilityProfileEngine's previously built-but-UNWIRED read/lifecycle methods into businessDispatcher as 6 new actions. Only `registerSupplier` was wired before (action `supplier_capability_register`).

Read these files END-TO-END:
1. H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts — the new z.enum entries (search for "supplier_directory_list" in the action enum, ~line 1628) AND the 6 new switch cases (search for `case "supplier_directory_list"`, ~line 2138). Also read the existing `case "supplier_capability_register"` just above and the sibling `marketplace_lead` cases for the convention.
2. H:/prism-slot-hotel/mcp-server/src/engines/SupplierCapabilityProfileEngine.ts — the engine being wired. Verify the method signatures the dispatcher calls: listSuppliers(filter), getProfile(supplierId), canSatisfy(supplierId, requirement), updateProfile(supplierId, patch) [note UpdateProfileSchema is .strict()], deactivateSupplier(supplierId), reactivateSupplier(supplierId).

VERIFY (flag P0/P1):
- Every new action string in the z.enum has a matching `case` and vice-versa (no enum/case mismatch, no typo, no duplicate).
- Param normalization is correct for each method's actual signature. In particular: supplier_profile_update strips supplierId/supplier_id/id/action from a flat patch before calling updateProfile (because UpdateProfileSchema is .strict() and would throw on unknown keys) — confirm the strip is correct and that `params.patch` (nested) path also works.
- supplier_can_satisfy passes (supplierId, requirement) correctly; RequirementSchema is non-strict so passing flat `params` as the requirement is safe.
- getProfile returning null on not-found is handled (the case sets `result = engine.getProfile(...)`, returned via JSON.stringify; null is acceptable l
... [+617 chars truncated]

### Assistant | 2026-06-11T13:20:02.881Z

I'll read both files end-to-end, focusing on the supplier-directory wiring.

### Assistant | 2026-06-11T13:20:03.805Z

[tool_use: Read]

### Assistant | 2026-06-11T13:20:04.104Z

[tool_use: Read]

### User | 2026-06-11T13:20:04.912Z

[tool_result] 1600	  // ── HOTEL self-merge: QB-parity + networking marketplace (30 engines, 2026-05-31) ──
1601	  "sales_use_tax_calc",
1602	  "fixed_asset_depreciate",
1603	  "form_1099nec_generate",
1604	  "estimate_create",
1605	  "sales_order_create",
1606	  "credit_memo_create",
1607	  "receive_payment_apply",
1608	  "customer_statement_generate",
1609	  "finance_charge_compute",
1610	  "vendor_credit_cre
... [+4679 chars truncated]

### User | 2026-06-11T13:20:05.414Z

[tool_result] 1	/**
2	 * SupplierCapabilityProfileEngine — the multi-tenant per-shop CAPABILITY registry that powers the
3	 * PRISM manufacturing networking marketplace (galaxy:business, slot:hotel). THE keystone Phase-0
4	 * product of the networking platform.
5	 *
6	 * WHAT IT IS / WHY IT'S NET-NEW: today PRISM's capability physics is single-tenant — it knows JM
7	 * Die's machines only, via {@link ShopConfig
... [+33272 chars truncated]

### Assistant | 2026-06-11T13:20:08.516Z

Good. Now I need to read the 6 new switch cases in businessDispatcher.ts around line 2138.

### Assistant | 2026-06-11T13:20:09.459Z

[tool_use: Read]

### User | 2026-06-11T13:20:11.702Z

[tool_result] 2080	          case "financial_report_sales_by_customer": {
2081	            const engine = await getEngine("financialReportSuite");
2082	            result = engine.salesByCustomer(params.invoices ?? []);
2083	            break;
2084	          }
2085	          case "budget_create": {
2086	            const engine = await getEngine("budget");
2087	            result = engine.createBudget(params);

... [+7838 chars truncated]

### Assistant | 2026-06-11T13:20:17.254Z

Now let me also verify the `getEngine` function for `"supplierCapability"` key to confirm it resolves correctly, and check if there's a `marketplace_lead_get` case for the null-return convention comparison.

### Assistant | 2026-06-11T13:20:18.802Z

[tool_use: Grep]

### Assistant | 2026-06-11T13:20:19.463Z

[tool_use: Grep]

### User | 2026-06-11T13:20:20.012Z

[tool_result] 168:let _supplierCapability: any;
275:    case "supplierCapability":
276:      return _supplierCapability ??= (await import("../../engines/SupplierCapabilityProfileEngine.js")).supplierCapabilityProfileEngine;
2144:            const engine = await getEngine("supplierCapability");
2152:            const engine = await getEngine("supplierCapability");
2159:            const engine = await getEngine(
... [+306 chars truncated]

### User | 2026-06-11T13:20:20.551Z

[tool_result] 1662-  // HOTEL: NETPLAT orchestrator — end-to-end RFQ rank (Phase-0 capability match + 3 Phase-2 signals → capstone blend) (2026-05-31)
1663-  "marketplace_rank_rfq",
1664-  // HOTEL: NETPLAT seeding — directory-lead funnel from charlie's vendor corpus into onboarding (2026-05-31)
1665-  "marketplace_seed_from_hints",
1666-  "marketplace_lead_list",
1667:  "marketplace_lead_get",
1668-  "marketpl
... [+770 chars truncated]

### Assistant | 2026-06-11T13:20:48.101Z

I have all the data needed. Here is the complete wiring review.

---

**Step 1 — z.enum vs case symmetry**

Enum entries added (lines 1632-1637):
- `supplier_directory_list`
- `supplier_profile_get`
- `supplier_can_satisfy`
- `supplier_profile_update`
- `supplier_deactivate`
- `supplier_reactivate`

Case statements present (lines 2151-2195):
- `case "supplier_directory_list"` — present
- `case "supplier_profile_get"` — present
- `case "supplier_can_satisfy"` — present
- `case "supplier_profile_update"` — present
- `case "supplier_deactivate"` — present
- `case "supplier_reactivate"` — present

Exact 1:1 match. No orphan enum entries, no orphan cases, no typos, no duplicates.

---

**Step 2 — Engine singleton resolution**

`getEngine("supplierCapability")` at `H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts:275-276` lazy-imports `SupplierCapabilityProfileEngine.js` and returns the exported `supplierCapabilityProfileEngine` alias (line 665 of the engine file: `export const supplierCapabilityProfileEngine = SupplierCapabilityProfileEngine`). All 7 cases (including the pre-existing `supplier_capability_register`) use this same key. Correct.

---

**Step 3 — Parameter normalization per method**

`listSuppliers(filter)` — dispatcher passes `params.filter ?? {}`. The engine's `listSuppliers` accepts a `SupplierListFilter` object. Passing a nested `filter` sub-object is the right shape; the `{}` fallback is correct for active-only listing. No issue.

`getProfile(supplierId)` — dispatcher passes `params.supplierId`. Engine signature is `getProfile(supplierId: string)`. Correct. Returns `null` on not-found; the dispatcher assigns to `result` and returns via `JSON.stringify`, matching the `marketplace_lead_get` sibling at line 2314-2318 which follows the same pattern. Correct.

`canSatisfy(supplierId, requirement)` — dispatcher passes `(params.supplierId, params.requirement ?? params)`. Engine signature is `canSatisfy(supplierId: string, requirement:
... [+2506 chars truncated]
