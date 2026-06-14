# QuickBooks-Parity + Full-ERP Build Plan — slot:hotel (galaxy:business)

> Operator directive (2026-05-29): *"continue building the backend. we need a full-blown enterprise ERP + a QuickBooks duplicate (every single QuickBooks function) but synergized with the entire PRISM app."*
> This is a MULTI-SESSION sprint (~30-50 engines). This doc is the enumeration + phased roadmap so the build is guided, non-duplicative, and operator-sequenceable. Auto-cascades under the galaxy dir. Companion: `./GSD.md` (build/commit/test contract) · `./CLAUDE.md §8` · `[[reference_hotel_galaxy_completeness_audit_2026_05_29]]` (the ~88% audit that motivated this).

## The PRISM-synergy thesis (what makes this NOT a standalone QuickBooks clone)
Every fiscal record is BORN from a shop-ops event, not hand-keyed:
- **Invoice ← `quote_to_ship_run`** (accepted quote → order → traveler → invoice → GL). No re-keying.
- **Bill ← PO 3-way-match** (PO + receipt + vendor invoice; vendor master = the ingested DocuStrata `jm-die-vendor-registry`).
- **COGS / job P&L ← `JobCostingEngine` / `ActualCostEngine`** (per-category material/labor/machine-hr/overhead/freight — real shop cost, not an estimate).
- **Payroll ← `EmployeeTimeClockEngine`** (clock data → gross pay → GL + payroll-tax liability).
- **Inventory value ← `MaterialStockEngine` / tool-life** (reorder + valuation from real consumption).
- **Sales tax ← shipment** (`ShippingReceivingLogEngine` → taxable event by ship-to jurisdiction).
That cross-wiring is the differentiator — QB is an island; PRISM-ERP is the shop's nervous system. EVERY engine below MUST name its shop-ops producer (GSD §2 Rule 3: no paper bridges; GSD §3: producer→consumer→viz triplet).

## QuickBooks function → PRISM coverage map
Legend: ✅ have engine · 🟡 thin/extend · 🔴 missing (build).

| QB area | QB functions | PRISM coverage | Action |
|---|---|---|---|
| Company / Chart of Accounts | COA, account types, classes, audit trail | `GeneralLedgerEngine` ✅ (journal/TB/BS/IS); `AuditLoggingEngine` ✅; **no COA/class list mgr** | 🟡 `ChartOfAccountsEngine` (COA + classes + account-type rules) |
| Customers / A/R | invoice, sales receipt, **estimate**, **sales order**, **credit memo**, **statement**, receive payment / **cash-application**, **finance charge**, AR aging | `BillingEngine`+`ARAgingEngine` ✅ (invoice/aging); **rest missing** | 🔴 `EstimateEngine`, `SalesOrderEngine`, `CreditMemoEngine`, `CustomerStatementEngine`, `ReceivePaymentEngine` (cash-application matching), `FinanceChargeDunningEngine` |
| Vendors / A/P | bill, bill payment / **check-run**, PO, item receipt, **vendor credit**, AP aging, **1099-NEC** | `PurchaseOrderEngine`+`PurchaseOrderLifecycleEngine`+`po_three_way_match` ✅ | 🔴 `VendorCreditEngine`, `BillPaymentCheckRunEngine`, `Form1099NECEngine` (needs $ from juliett `jm-die-database` — cross-tree dep) |
| Banking | write check, deposit, transfer, **reconcile**, **bank feed import** (OFX/QBO/BAI2), register | `acct_bank_reconcile` action 🟡 + `CashFlowProjectionEngine` 🟡 | 🔴 `BankReconciliationEngine`, `BankFeedImportEngine`, `BankDepositTransferEngine` |
| Sales Tax | tax item/code/agency, calc, **pay sales tax**, liability | only `integration_export_payroll_tax` shim 🔴 | 🔴 **`SalesUseTaxEngine`** + `sales-tax-rates.ts` constants (PHASE-1 #1) |
| Payroll | paycheck, payroll items, **liabilities**, **W2/941/940** | `PayrollEngine`+`EmployeePayrollGrossPayEngine` ✅ (gross/run) | 🟡 `PayrollLiabilityFilingEngine` (liabilities + W2/941/940 + 1099 bridge) |
| Inventory / Items | **item master**, inventory adjustment, assemblies/BOM, price levels | `MaterialStockEngine`+`InventoryEOQEngine` ✅ (stock/EOQ) | 🟡 `ItemMasterEngine` (QB items + price levels), `InventoryAdjustmentEngine` |
| Reports | P&L, Balance Sheet, **Cash Flow stmt**, Trial Balance, AR/AP aging, **Sales by customer/item**, **P&L by class/job**, **budget-vs-actual** | GL: TB/BS/IS ✅; aging ✅ | 🟡 `FinancialReportSuiteEngine` (CF stmt, sales-by-X, P&L-by-class/job, comparative periods) |
| Journal Entries | journal, **recurring/reversing**, **memorized txns** | `gl_journal_entry` ✅ | 🟡 `JournalEntryEngine` (recurring/reversing/memorized scheduler) |
| Budgets | budget create, **budget-vs-actual** | 🔴 none | 🔴 `BudgetEngine` |
| Fixed Assets | asset, **depreciation (MACRS/DDB/SYD)**, disposal/gain-loss | `EquipmentAssetEngine` 🟡 (straight-line only) | 🟡 `FixedAssetDepreciationEngine` (MACRS/DDB/SYD/units + disposal) |
| Lists | classes, terms, payment methods, types | scattered | 🟡 fold into `ChartOfAccountsEngine` + `ListManagementEngine` |
| Multi-currency | FX, realized/unrealized gain | 🔴 none | ⏸ DEFER (JM Die is USD-only — lowest priority) |

## Phased build roadmap (by leverage; each engine = GSD contract: real tests + dispatcher wiring + E2E + financial-invariant + named shop-ops producer)
- **PHASE 1 — fiscal gaps (highest value, the audit's true pillar gaps):** `SalesUseTaxEngine` (+`sales-tax-rates.ts` + `chart-of-accounts.ts` constants) → `FixedAssetDepreciationEngine` (MACRS) → `Form1099NECEngine` (after juliett $-data bridge).
- **PHASE 2 — A/R completion (revenue cycle):** `EstimateEngine` → `SalesOrderEngine` → `CreditMemoEngine` → `ReceivePaymentEngine` (cash-application) → `CustomerStatementEngine` → `FinanceChargeDunningEngine`.
- **PHASE 3 — A/P + banking:** `VendorCreditEngine` → `BillPaymentCheckRunEngine` → `BankReconciliationEngine` → `BankFeedImportEngine` (OFX/QBO) → `BankDepositTransferEngine`.
- **PHASE 4 — books + reports:** `ChartOfAccountsEngine` (+classes/lists) → `JournalEntryEngine` (recurring/reversing/memorized) → `FinancialReportSuiteEngine` (CF/sales-by-X/P&L-by-class) → `BudgetEngine` → `ListManagementEngine`.
- **PHASE 5 — items + payroll filings:** `ItemMasterEngine` → `InventoryAdjustmentEngine` → `PayrollLiabilityFilingEngine` (W2/941/940).

## Constants to extract (closes the audit's #1 correctness gap — import, never inline)
`mcp-server/src/data/`: `chart-of-accounts.ts`, `sales-tax-rates.ts` (by nexus jurisdiction), `payroll-tax-tables.ts`, `pto-policies.ts`, `benefits-plans.ts`, `customer-terms.ts`, `vendor-profile.ts`, `depreciation-tables.ts` (MACRS recovery periods). Built alongside their consuming engine (tax-rates with SalesUseTaxEngine, etc.).

## Wiring + test contract (per engine — GSD §3/§4 + comprehensive-build hook)
1. Engine: class + static methods, Zod input schema, typed result, financial-invariant gates (Σdr==Σcr where it posts; no fabricated $; import constants).
2. Dispatcher: lazy import + `case "<action>"` blocks in `businessDispatcher.ts` (worktree copy; additive — merge-safe; golf merges to main).
3. Tests: reference values + ≥3 failure modes + ≥2 adversarial (NaN/Inf/empty/oversize) + ≥3 spanning configs (e.g. 3 tax jurisdictions); ≥1 test invokes THROUGH the dispatcher.
4. Synergy: name the shop-ops producer + add the producer→consumer wire (no orphan).
5. Cross-tree: build in `slot/hotel` worktree; `Form1099NEC` + anything needing raw QB $ reconciles against juliett `jm-die-database` (do NOT re-OCR — R8).

## ⚠ SPRINT-WIDE WIRING CONSTRAINT (discovered 2026-05-29, iter 1)
The slot/hotel worktree's `businessDispatcher.ts` is a **stale, diverged copy: 3427 lines / 441 actions vs MAIN's 6650 lines / 879 actions**. Therefore **dispatcher wiring MUST NOT happen in this worktree** — wiring the worktree copy + golf-merging it would CLOBBER ~438 actions main has (catastrophic regression). Correct sequence for EVERY QB-parity engine:
1. Build engine + constants + tests in the worktree (additive NEW files — golf-merge-safe, no clobber). ✓ doable here.
2. Golf merges the new engine files → main (additive).
3. Wire MAIN's canonical `businessDispatcher.ts` (ACTIONS enum @L370 + switch @L865 + lazy import) — IN MAIN, post-merge. Engines carry a `// WIRE-EXEMPT:` tag until then.
**Operator decision needed:** either (a) refresh the worktree dispatcher from main before the sprint, (b) build QB-parity engines directly in main, or (c) accept build-in-worktree → golf-merge → wire-in-main as the per-engine cadence.

## Status
Plan authored 2026-05-29 (slot:hotel session d7f7d3ce). Operator chose **build-then-wire-in-main cadence**. Sprint `/loop` target 16; each engine `[hotel] [QB-PARITY-MS0]/U-QBP-<n>`, all WIRE-EXEMPT until wired in main.
- **iter 1 DONE `U-QBP-01`:** `SalesUseTaxEngine` + `sales-tax-rates.ts` + 20/20 tests (MI $60 / IN $70 / IL-COOK $102.50, half-even, period liability).
- **iter 2 DONE `U-QBP-02`:** `FixedAssetDepreciationEngine` + `depreciation-tables.ts` (IRS Pub 946) + 18/18 tests (MACRS / DDB+SL-switch / SYD / units / disposal).
- **iter 3 DONE `U-QBP-03`:** `Form1099NECEngine` + `form-1099-thresholds.ts` + 34/34 tests (tax-year-keyed NEC threshold $600→$2000 TY2026 H.R.1; corp exemption + attorney exception; card/1099-K exclusion; backup-withholding override; box-1 floor; TIN masked last-4 PII; multi-cause `drivers`). 3-of-3 reviewer PASS (tax-law + PII/coupling). The LIVE production $ feed still needs juliett's `jm-die-database` (cross-tree, deferred).
- **✅ PHASE 1 (fiscal gaps) COMPLETE** — the audit's three true pillar gaps closed.
- **iter 4 DONE `U-QBP-04`:** `EstimateEngine` + `estimate-policy.ts` + 29/29 tests (line/subtotal/discount reconciliation; pro-rata tax via SalesUseTaxEngine synergy MI 6%; status FSM draft→sent→accepted→converted; isExpired; toSalesOrder handoff). Reviewer FAIL→fix→PASS: fixed 3 P1s — accepted→expired FSM edge removed (consistent with isExpired immunity); tax guard `if(taxJurisdiction)` (was `&& taxableBase>0`) so unknown-jurisdiction + reasonless-exemption fail loud even at $0 base.
- **✅ PHASE 2 (A/R revenue cycle) COMPLETE** — `U-QBP-05..09` (109 tests, all specialist-verified exemplary): `SalesOrderEngine` (+sales-order-policy; backorder/partial-fulfill/allocate→ship), `CreditMemoEngine` (+credit-memo-policy; DR4000 Rev+DR2100 Tax/CR1200 AR, dual-ceiling over-apply, immutable), `ReceivePaymentEngine` (+cash-application-accounts; Σapplied+unapplied==payment both ways, DR1000/CR1200/CR2150), `CustomerStatementEngine` (+ar-statement-policy; closing reconciles both ways, aging buckets sum to closing, FIFO), `FinanceChargeDunningEngine` (+ar-finance-charge-policy; rate imported, grace, usury cap, tiered dunning).
- **✅ PHASE 3 (A/P + banking) COMPLETE** — `U-QBP-10..14` (125 tests, all verified): `VendorCreditEngine` (+vendor-credit-policy; A/P mirror, category-routed reversal materials→1320/tools→5600/equipment→1500/services→5500), `BillPaymentCheckRunEngine` (+bill-payment-accounts; per-vendor check aggregation), `BankReconciliationEngine` (+bank-reconciliation-accounts; interest acct 4900, reconciled never forced), `BankFeedImportEngine` (+bank-feed-accounts; OFX/QBO/CSV/generic, FITID dedup, sign-authoritative), `BankDepositTransferEngine` (self-transfer throws).
- **✅ PHASE 4 (books + reports) COMPLETE** — `U-QBP-15..19` (119 tests, commit `a81b9d9981`): `ChartOfAccountsEngine` (+chart-of-accounts-policy; range↔type↔normal-balance validation over GL's 22-account base), `JournalEntryEngine` (+journal-entry-templates; memorized/recurring/reversing over GL.createJournalEntry, integration-proven to post into real GL), `FinancialReportSuiteEngine` (cash-flow 3-section/sales-by-X/P&L-by-class/comparative), `BudgetEngine` (12-period budget-vs-actual, pulls actuals from real GL IS), `ListManagementEngine` (+list-management-defaults; terms/due-date/payment-methods). GL-EXTEND discipline held (no chart/createJournalEntry/statement duplication — proven empirically).
- **⏳ PHASE 5 (items + payroll filings) IN PROGRESS** — `U-QBP-20..22`: `ItemMasterEngine` (+item-master-defaults; QB item types + price levels, account-class validated) → `InventoryAdjustmentEngine` (qty/value adjustment → balanced GL lines, reconciles both ways) → `PayrollLiabilityFilingEngine` (+**payroll-tax-tables.ts** canonical FICA/SS-wage-base/Medicare/FUTA — closes the audit's missing-constant flag; **also DRYs `PayrollEngine`'s inlined rate consts** to import the same table, no-regression proven; W2/941/940 + W2↔941 reconciliation + Form1099NEC bridge). LAST QB-parity batch. Built via build→review→fix workflow.
- **Wiring backlog (do in MAIN, batched, post golf-merge — ALL phases):** `sales_tax_*`, asset MACRS/DDB/SYD (main `asset_depreciation:` bucket additive), `form_1099nec_*`, `estimate_*`, `sales_order_*`, `credit_memo_*`, `receive_payment_*`, `customer_statement_*`, `finance_charge_*`, `vendor_credit_*`, `bill_payment_*`, `bank_recon_*`, `bank_feed_*`, `bank_deposit_*`, `chart_of_accounts_*`, `journal_entry_*`, `financial_report_*`, `budget_*`, `list_management_*`, `item_master_*`, `inventory_adjust_*`, `payroll_liability_*`/`form_941`/`form_940`/`w2_generate` into main's 879-action businessDispatcher. **Constraint:** worktree `businessDispatcher.ts` is stale (441 vs 879) — wiring the worktree copy would clobber ~438 main actions on golf-merge, hence all engines `WIRE-EXEMPT`; wire IN MAIN post-merge.
- **Deferred P2s — ALL ✅ DONE (QB-parity 100% complete):** (1) ✅ DONE 2026-05-31 `U-QBP-P1` (commit `349fcf11f1`) — hoisted `roundCentsHalfEven` → canonical `src/data/money.ts`; full migration of 24 engines + 2 tests off `SalesUseTaxEngine` (NO re-export shim); test relocated to `money.test.ts`. tsc-0 @722 + 397+136 vitest + 2-of-2 reviewer PASS. (Near-miss: a scripted comment-fix pass corrupted SalesOrderEngine R→E; caught pre-land by corruption-scan + git-diff, restored from HEAD — see [[feedback_scripted_multifile_edit_corruption_guard]].) (2) ✅ DONE 2026-05-31 `U-QBP-P2` (commit `abf939499e`) — `EstimateEngine` fallback `estimateId` now appends an FNV-1a content hash (`EST-<cust>-<date>-<hash>`); kills the silent same-customer-same-day collision; pure/deterministic/idempotent; explicit id still verbatim. (3) ✅ DONE same commit — `toSalesOrder` returns `convertedEstimate` (FSM-flipped to `converted`) so a 2nd conversion throws (idempotent, no duplicate sales order). 35/35 vitest + 2-of-2 reviewer PASS.
