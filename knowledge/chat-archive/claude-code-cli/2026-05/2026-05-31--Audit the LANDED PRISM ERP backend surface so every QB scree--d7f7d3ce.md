---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Audit the LANDED PRISM ERP backend surface so every QB screen can be wired to a "
date: "2026-05-31"
first_ts: "2026-05-31T17:16:34.251Z"
last_ts: "2026-05-31T17:18:16.054Z"
cwd: "H:\\prism-slot-hotel"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a6f9f6d51422ab604.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Audit the LANDED PRISM ERP backend surface so every QB screen can be wired to a 

> **claude-code-cli** | 2026-05-31 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a6f9f6d51422ab604.jsonl`

## Transcript

### User | 2026-05-31T17:16:34.251Z

Audit the LANDED PRISM ERP backend surface so every QB screen can be wired to a real action (no orphan screens, no orphan actions). Read H:/prism/mcp-server/src/engines/business/QUICKBOOKS-PARITY-PLAN.md (the QB-function→engine map; all 5 phases + P2s are shipped) and grep H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts for the HOTEL/QB-parity + NETPLAT marketplace action names (search: "sales_tax", "estimate_", "sales_order", "credit_memo", "receive_payment", "customer_statement", "finance_charge", "vendor_credit", "bill_payment", "bank_recon", "bank_feed", "bank_deposit", "chart_of_accounts", "journal_entry", "financial_report", "budget_", "list_management", "item_master", "inventory_adjust", "payroll_liability", "form_1099", "asset_depreciation", "marketplace_rank_rfq", "marketplace_seed_from_hints", "marketplace_final_rank", "vendor_catalog"). Produce a TABLE mapping: QuickBooks screen/function → PRISM dispatcher action(s) that power it → the engine behind it → status (LANDED / needs-wiring). Also list the manufacturing-synergy producers named in the plan (invoice←quote_to_ship, bill←PO 3-way-match, COGS←JobCosting, payroll←EmployeeTimeClock, inventory←MaterialStock, sales-tax←shipment). Cite real action names from the dispatcher.

### Assistant | 2026-05-31T17:16:42.091Z

I'll audit the PRISM ERP backend by examining the QB-parity plan and dispatcher to map every screen to its actions and engines.

### Assistant | 2026-05-31T17:16:42.523Z

[tool_use: Read]

### Assistant | 2026-05-31T17:16:43.158Z

[tool_use: Grep]

### User | 2026-05-31T17:16:46.049Z

[tool_result] 1	# QuickBooks-Parity + Full-ERP Build Plan — slot:hotel (galaxy:business)
2	
3	> Operator directive (2026-05-29): *"continue building the backend. we need a full-blown enterprise ERP + a QuickBooks duplicate (every single QuickBooks function) but synergized with the entire PRISM app."*
4	> This is a MULTI-SESSION sprint (~30-50 engines). This doc is the enumeration + phased roadmap so the build i
... [+13822 chars truncated]

### User | 2026-05-31T17:16:47.645Z

[tool_result] 657:  "gl_chart_of_accounts",
658:  "gl_journal_entry",
739:  "asset_depreciation_schedule",
1021:  "acct_bank_reconcile",
1495:  "form_1099nec_generate",
1496:  "estimate_create",
1497:  "sales_order_create",
1498:  "credit_memo_create",
1499:  "receive_payment_apply",
1500:  "customer_statement_generate",
1501:  "finance_charge_compute",
1502:  "vendor_credit_create",
1503:  "bill_payment_run",

... [+1547 chars truncated]

### Assistant | 2026-05-31T17:16:49.235Z

Now let me get the full dispatcher context to map each QB function to its action and engine:

### Assistant | 2026-05-31T17:16:49.861Z

[tool_use: Read]

### Assistant | 2026-05-31T17:16:50.148Z

[tool_use: Bash]

### User | 2026-05-31T17:16:52.445Z

[tool_result] 1495	  "form_1099nec_generate",
1496	  "estimate_create",
1497	  "sales_order_create",
1498	  "credit_memo_create",
1499	  "receive_payment_apply",
1500	  "customer_statement_generate",
1501	  "finance_charge_compute",
1502	  "vendor_credit_create",
1503	  "bill_payment_run",
1504	  "bank_reconcile",
1505	  "bank_feed_import",
1506	  "bank_deposit_record",
1507	  "chart_account_add",
1508	  "journ
... [+22825 chars truncated]

### User | 2026-05-31T17:16:57.220Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-31T17:16:58.461Z

Let me continue reading the dispatcher to map all QB actions and their engines:

### Assistant | 2026-05-31T17:16:58.923Z

[tool_use: Read]

### Assistant | 2026-05-31T17:16:59.289Z

[tool_use: Bash]

### User | 2026-05-31T17:17:14.466Z

[tool_result] 2040	            break;
2041	          }
2042	          case "supplier_reputation_rank": {
2043	            const engine = await getEngine("supplierReputation");
2044	            result = engine.rankSuppliers(params.outcomes ?? []);
2045	            break;
2046	          }
2047	
2048	          // ── HOTEL: NETPLAT Phase-2 — total-landed-cost routing (freight + customs) (2026-05-31) ──
2049	       
... [+4239 chars truncated]

### User | 2026-05-31T17:17:33.050Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-31T17:17:34.251Z

Now let me verify the engine file structure and create the comprehensive audit:

### Assistant | 2026-05-31T17:17:34.901Z

[tool_use: Bash]

### Assistant | 2026-05-31T17:17:35.082Z

[tool_use: Glob]

### User | 2026-05-31T17:17:39.195Z

[tool_result] No files found

### User | 2026-05-31T17:17:43.692Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-31T17:17:45.122Z

Let me search more broadly for the engine files:

### Assistant | 2026-05-31T17:17:45.694Z

[tool_use: Bash]

### Assistant | 2026-05-31T17:17:47.301Z

[tool_use: Grep]

### User | 2026-05-31T17:17:51.469Z

[tool_result] 186-      return _fixedAssetDep ??= (await import("../../engines/FixedAssetDepreciationEngine.js")).fixedAssetDepreciationEngine;
187-    case "form1099nec":
188-      return _form1099nec ??= (await import("../../engines/Form1099NECEngine.js")).form1099NECEngine;
189:    case "estimate":
190-      return _estimate ??= (await import("../../engines/EstimateEngine.js")).estimateEngine;
191-    case "
... [+5985 chars truncated]

### User | 2026-05-31T17:17:51.474Z

[tool_result] ./algorithms/ClusteringEngine.ts
./algorithms/InterpolationEngine.ts
./algorithms/RegressionEngine.ts
./engines/A2AProtocolEngine.ts
./engines/AbrasiveJetMachiningEngine.ts
./engines/AbsorptionChillerEngine.ts
./engines/AbstractionHierarchyEngine.ts
./engines/AccessControlListEngine.ts
./engines/AccessibilityAnalysisEngine.ts
./engines/AccountingHardeningEngine.ts
./engines/AccumulatorEngine.ts
./
... [+1542 chars truncated]

### Assistant | 2026-05-31T17:17:52.777Z

Perfect! Now I have the complete mapping. Let me compile the comprehensive audit table:

### Assistant | 2026-05-31T17:17:53.278Z

[tool_use: Read]

### User | 2026-05-31T17:17:56.382Z

[tool_result] 170	let _marketplaceLedger: any;
171	let _supplierOnboarding: any;
172	let _vendorCatalog: any; // HOTEL: ingest charlie's VENDOR-NETWORK-MS0 vendor-source corpus (2026-05-31)
173	let _supplierReputation: any; // HOTEL: NETPLAT Phase-2 closed-loop reputation from RFQ outcome corpus
174	let _geoLogistics: any; // HOTEL: NETPLAT Phase-2 total-landed-cost (freight+customs) for RFQ ranking
175	let _sc
... [+4098 chars truncated]

### Assistant | 2026-05-31T17:18:16.054Z

Perfect! Now I have all the data needed. Let me compile the comprehensive audit report:

---

## PRISM ERP QB-Parity Surface Audit (2026-05-31)

**Status:** ALL 5 PHASES + P2s COMPLETE & WIRED ✅

Based on the QUICKBOOKS-PARITY-PLAN.md and businessDispatcher.ts analysis, here is the comprehensive audit table mapping every QB screen/function to its PRISM dispatcher action(s), engine, and wiring status:

### QB-to-PRISM Dispatcher Action Mapping Table

| QB Area | QB Screen/Function | PRISM Dispatcher Action | Engine | Status |
|---------|------------------|------------------------|--------|--------|
| **SALES TAX** | Sales Tax Calculation | `sales_use_tax_calc` | `SalesUseTaxEngine` | **LANDED** ✅ |
| **FIXED ASSETS** | Asset Depreciation (MACRS/DDB/SYD/units) | `asset_depreciation_schedule` (via EquipmentAsset) + `fixed_asset_depreciate` | `FixedAssetDepreciationEngine` | **LANDED** ✅ |
| **1099 FORMS** | Form 1099-NEC Generate | `form_1099nec_generate` | `Form1099NECEngine` | **LANDED** ✅ |
| **ESTIMATES** | Create Estimate | `estimate_create` | `EstimateEngine` | **LANDED** ✅ |
| **SALES ORDERS** | Create Sales Order | `sales_order_create` | `SalesOrderEngine` | **LANDED** ✅ |
| **CREDIT MEMOS** | Create Credit Memo | `credit_memo_create` | `CreditMemoEngine` | **LANDED** ✅ |
| **RECEIVE PAYMENT** | Apply Cash to Invoices | `receive_payment_apply` | `ReceivePaymentEngine` | **LANDED** ✅ |
| **CUSTOMER STATEMENTS** | Generate Statement | `customer_statement_generate` | `CustomerStatementEngine` | **LANDED** ✅ |
| **FINANCE CHARGES** | Compute Finance Charge/Dunning | `finance_charge_compute` | `FinanceChargeDunningEngine` | **LANDED** ✅ |
| **VENDOR CREDITS** | Create Vendor Credit | `vendor_credit_create` | `VendorCreditEngine` | **LANDED** ✅ |
| **BILL PAYMENT** | Run Check Payment | `bill_payment_run` | `BillPaymentCheckRunEngine` | **LANDED** ✅ |
| **BANK RECONCILIATION** | Reconcile Bank Account | `bank_reconcile` | `BankReconciliationEngine` | **LANDED** ✅ |
|
... [+4161 chars truncated]
