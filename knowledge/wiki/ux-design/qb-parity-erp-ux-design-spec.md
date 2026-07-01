# PRISM ERP — QuickBooks-Parity UX Design Specification

**Status:** Implementation-ready · **Target galaxy:** quebec (frontend-app) · **Stack:** Vite 6 + React 19 + React Router v7 · **Date:** 2026-05-29
**Canonical tree:** `H:\prism\mcp-server\web` (the buildable tree — has `package.json` + `vite.config`; the slot-hotel `web/` has only `src/` + `vitest.config.ts` and is NOT the build target)
**Backing dispatcher:** `prism_business` via HTTP bridge `/api/v1/erp/*` (port 3100)

> This spec is the single source of truth for the QuickBooks-parity ERP UX. It supersedes the design draft and folds in every PASS_WITH_FIXES / FAIL finding from the four adversarial verify arms (Familiarity, Trade-Dress/IP, Backend-Completeness, Quebec-Stack-Feasibility). Findings were not appended — they were resolved in-line and the design was changed. §7 summarizes each verdict and its resolution.

---

## 1. DESIGN PHILOSOPHY

### 1.1 The thesis

**Familiar IA + interactions (zero re-learning) + distinct identity + manufacturing-native enhancement.**

PRISM ERP borrows QuickBooks Online's *functional furniture* — left nav, +New tray, transaction lists, the money-bar-as-filter, the 4-tab invoice form, the split Save button, the account register, the bank-feed Review loop, the Report Center — so a QuickBooks user is productive on day one with no retraining. Into that familiar furniture we pour records that QuickBooks structurally cannot produce: every fiscal row is *born from a shop-floor event* (a completed traveler op, a 3-way-matched PO receipt, a spindle-hour log, a clock-in punch). The familiarity is the Trojan horse; the manufacturing-native data is the wedge.

The legal frame (from the trade-dress research) makes this split mandatory, not merely tasteful: **function is free to mirror (functionality doctrine, *Lotus v. Borland*, *Qualitex*); identity is not (Intuit's word marks, "QuickBooks green," logo/type, the coined "Money Bar").** Mirror the function; never the identity; stamp PRISM's own brand prominently on every surface (the "safe harbor" that defeats likelihood-of-confusion).

### 1.2 The four pillars

| Pillar | What it means | How it shows up |
|---|---|---|
| **Familiar IA** | Group order, nav labels, menu structure mirror QB 1:1 within the Books workspace | Sales → Expenses → Banking → Reports → Accounting spine preserved; +New tray columns verbatim |
| **Familiar interactions** | The hand-motions a QB user has memorized still work | money-bar tile-as-filter, split Save w/ remembered default, type-ahead "+ Add new", inline cell edit, drill-down-on-number, bank-feed accept/match/exclude |
| **Distinct identity** | Own wordmark, own palette (≥40° off Intuit green), own type, own icons, own illustrations | 3 candidate identity directions (§4); PRISM wordmark on every screen + report header |
| **Manufacturing-native enhancement** | The ◇ source chip, born-from-event pre-fill, 3-way match, Job P&L at actual, WIP tiles, the two-sided Marketplace | Each lands *inside* QB-shaped furniture so it reads native, not bolted-on (§5) |

### 1.3 Trade-dress DO / DON'T rules (enforced fleet-wide)

These are hard rules, lintable where possible (see §4.4 hue-floor token test).

**✅ DO (functional — free to mirror)**
- DO mirror layout skeletons: left vertical nav, top-right utility cluster, transaction list/register tables, two-pane reconciliation, slide-over detail panels, the "+New" tray, dashboard tile grid.
- DO mirror interaction patterns: aging buckets (Current / 1–30 / 31–60 / 61–90 / 90+), draft-and-approve inboxes, match-left-to-right reconcile, inline status badges, Today/Week/Month range chips, search-everywhere.
- DO mirror generic accounting vocabulary verbatim: Invoice, Bill, Reconcile, Aging, Chart of accounts, A/R, A/P, P&L, Trial balance, Balance sheet, Journal entry, Credit memo, Receive payment. (These are GAAP/industry terms of art — varying them only hurts adoption.)
- DO apply PRISM's own prominent branding on every surface (the affirmative safe harbor): wordmark top-left, on every report header/footer, in the login.
- DO independently author all icons, illustrations, copy, CSS (independent creation is an absolute defense).
- DO pick a brand hue ≥40° from Intuit green `#2CA01C` (hue 112.7°).

**❌ DON'T (identity — real exposure)**
- DON'T use the names QuickBooks, QB, Intuit, TurboTax, or confusingly similar — anywhere in product, code, marketing, metadata. (Internal rationale comments are non-shipping and acceptable.)
- DON'T use `#2CA01C` or a near-shade as primary/accent/active-nav/CTA chrome. Treat it as reserved. The ONLY sanctioned green is the shared `status.paid` emerald `#059669` (48.7° off, quarantined to the positive-money status role — never chrome).
- DON'T copy Intuit's logo, icon artwork, illustration style, or the Avenir Next for Intuit typeface.
- DON'T reproduce a pixel-identical distinctive composition (screenshots must not be interchangeable). Mirror the pattern; vary spacing/density/type/component shapes.
- DON'T copy Intuit marketing copy, taglines, onboarding scripts, or the coined feature name **"Money Bar"** + its segmented-green-bar treatment. (We ship the capability as **"Receivables Snapshot"** rendered as discrete cards.)
- DON'T ship the QB-coined terms `Estimate`, `Classes/Locations`, or the "In QuickBooks balance" string. (Use `Quote`, `Tracking categories`, `In PRISM | Bank`.)
- DON'T name the product `[Brand] Books` — "Books" sits inside the QuickBooks word-mark family. The product is **PRISM ERP** everywhere.
- DON'T imply affiliation ("Works like QuickBooks" as a headline).

---

## 2. INFORMATION ARCHITECTURE

### 2.1 Workspace scoping (FIX — IA does NOT own the whole rail)

PRISM is a ~12-domain manufacturing platform; the live `NAV_SECTIONS` in `shellCatalog.ts` already carries ~80 entries across Machining / Quotes-and-Planning / Shop-and-ERP / Business-Management / Operations-Support / Manufacturing-Excellence / Knowledge. A wholesale re-grouping would break navigation for machining/quality/learning surfaces.

**Resolution:** the QB-shaped rail is a **workspace mode**, not a rail replacement. A top-of-rail **workspace switch** toggles `Shop` ⇄ `Books`. In **Books** mode the rail renders the QB-spine groups below; in **Shop** mode the existing `NAV_SECTIONS` render unchanged. The switch persists in `localStorage` (`prism_workspace_v1`) alongside the existing `prism_nav_state_v1` group-collapse state. This is an additive `NavSection[]` set keyed by workspace — the existing machining/quality/learning sections are untouched.

```
[ Shop | ●Books ]   ← workspace switch, top of rail
```

### 2.2 Final left-nav tree (Books workspace) — THE ONE CANONICAL RAIL

This is the single authoritative rail. The earlier wireframe-vs-IA contradiction (bare "Jobs"/"Marketplace" top-level vs a "Manufacturing" group) is resolved in favor of the **Manufacturing contiguous group between Sales and Expenses** — it keeps QB's Sales → Expenses → Banking → Reports → Accounting spine intact. All wireframes in §3 render THIS rail.

White/light rail, dark-slate text, **theme-primary active indicator (never Intuit green)**, sentence case throughout. Routes are React Router v7 children under the **pathless** `<Layout/>` route — **live URLs have NO `/app/` prefix.**

```
PRISM  (wordmark — prominent, own identity)
[ Shop | ●Books ]                                    ← workspace switch
├─ ◈ Dashboard ──────────────────────────── /dashboard            [E]
│
├─ Sales ▾ (group)
│   ├─ Overview ──────────────────────────── /sales               [N]
│   ├─ All sales ────────────────────────── /sales/all            [N]
│   ├─ Invoices ─────────────────────────── /invoices             [E]
│   ├─ Quotes ──────────────────────────── /quotes               [N]  (QB "Estimates"→"Quotes")
│   ├─ Customers ───────────────────────── /customers            [E]
│   └─ Products & services ─────────────── /items                 [N]
│
├─ Manufacturing ▾ (group — PRISM-NATIVE)
│   ├─ Print-to-quote ────────────────────── /quote-builder        [E]  (RENAMED from "Quote builder" — kills the Quote collision)
│   ├─ Jobs & work orders ───────────────── /jobs                  [E]
│   ├─ Travelers ─────────────────────────── /travelers            [N]
│   ├─ Shop floor ───────────────────────── /shop-live            [N*] (see §2.6 cross-shell note)
│   ├─ Scheduling & capacity ─────────────── /scheduling           [E]
│   ├─ Inventory & materials ─────────────── /inventory            [E]
│   └─ Marketplace (RFQ network) ─────────── /rfq-inbox            [E] ⚠ BACKEND-BLOCKED (§2.5)
│
├─ Expenses ▾ (group — 4 children: intentional manufacturing addition, see §2.4)
│   ├─ Expenses ──────────────────────────── /expenses             [N]
│   ├─ Bills ─────────────────────────────── /bills                [N]
│   ├─ Purchase orders ───────────────────── /purchase-orders      [E]
│   └─ Vendors ───────────────────────────── /vendors              [N]
│
├─ Banking ──────────────────────────────── /banking              [N]
│
├─ Projects ─────────────────────────────── /profitability        [E]  (bare QB label; page title = "Job P&L at actual")
│
├─ Payroll ▾ (group)
│   ├─ Run payroll ───────────────────────── /payroll              [E]
│   ├─ Employees ───────────────────────────── /employees          [E]
│   └─ Timecards ─────────────────────────── /timecards            [E]
│
├─ Reports ──────────────────────────────── /reports              [E]
│
├─ Taxes ▾ (group)
│   ├─ Sales tax ─────────────────────────── /taxes/sales          [N]
│   └─ Payroll tax & 1099 ──────────────────── /taxes/payroll      [N]
│
├─ Accounting ▾ (group — QB-FAITHFUL: exactly 2 children)
│   ├─ Chart of accounts ─────────────────── /general-ledger       [E]
│   └─ Reconcile ─────────────────────────── /banking?tab=reconcile [E→tab]  (ONE canonical reconcile target)
│
└─ (footer)
    ├─ Executive dashboard ───────────────── /executive-dashboard  [E, admin]
    └─ Get paid & integrations ──────────── /integrations          [E]
```

`[E]` exists in `App.tsx`; `[N]` new route to register; `[N*]` cross-shell registration needed.

**Why zero re-learning holds:** Dashboard → Sales → Expenses → Banking → Reports → Accounting is QB's exact spine. Manufacturing is the single insertion, adjacent to Sales (where shop work becomes revenue). Journal entries + Budgets were **removed from the Accounting nav group** (FIX — QB's left-nav Accounting has only Chart of accounts + Reconcile; JE + Budgets live in the gear menu, §2.8). Projects keeps its bare QB label (FIX — `(Job P&L)` parenthetical dropped from nav; surfaced as page title instead).

### 2.3 "+ New" create menu — restored QB verbs + Manufacturing column (FIX)

Top-of-rail pill, opening the 5-column overlay. Sentence case. Columns 1–4 are QB's tray **verbatim in order and label**, with the two daily verbs the draft dropped now **restored** (Check, Refund receipt). The only QB-term change is `Estimate→Quote`. Column 5 (Manufacturing) is purely additive.

| Column 1 — CUSTOMERS | Column 2 — VENDORS | Column 3 — EMPLOYEES | Column 4 — OTHER | Column 5 — MANUFACTURING |
|---|---|---|---|---|
| Invoice | Expense | Run payroll | Bank deposit | Quote (print → price) |
| Receive payment | **Check** ← restored | Single time activity | Transfer | Work order |
| Quote *(QB Estimate)* | Bill | Weekly timesheet | Journal entry | Traveler |
| Credit memo | Pay bills | | Memorized/recurring JE | RFQ (broadcast) ⚠ |
| Sales receipt | Purchase order | | Inventory qty adjustment | Material receipt |
| **Refund receipt** ← restored | Vendor credit | | Add product/service | Time clock entry |
| Sales order ⚑ | **Credit card credit** ← restored | | Add account | |
| Customer statement | Pay down credit card | | Define payment term | |

⚑ **Sales order** is QB-Desktop-only, NOT a QBO `+New` item — flagged as an intentional manufacturing-shop addition, not a parity item.
⚠ **RFQ** verb is backend-blocked in the target tree until marketplace engines merge (§2.5).

### 2.4 Expenses group shape — flagged as intentional (FIX)

QB's Expenses group has exactly **two** children (Expenses, Vendors); ours has **four** (Expenses, Bills, Purchase orders, Vendors). This is a deliberate manufacturing addition (a shop lives in its AP/PO loop) and is **flagged in the operator decision summary** as a known scan-shape change, not silent drift. Bills and Purchase orders are reachable in QB via +New / list filters; promoting them to nav children is the only group whose shape differs from QB muscle memory.

### 2.5 Marketplace — BACKEND-BLOCKED in the target tree (FIX — demoted from "wired")

The 5 marketplace engines (`MarketplaceMatchOrchestratorEngine`, `MarketplaceFinalRankEngine`, `SupplierReputationEngine`, `GeoLogisticsEngine`, `MarketplaceSeedingEngine`) and all 13 NETPLAT actions (`marketplace_rank_rfq`, `marketplace_final_rank`, `supplier_reputation[_rank]`, `geo_route_cost/landed_cost/logistics_score`, `capacity_earliest_slot`, `vendor_catalog_ingest`, `marketplace_seed_from_hints`, `marketplace_lead_*`, `marketplace_escrow_deposit`) are **absent from the slot-hotel dispatcher** and several engine files are absent from disk in this tree. The Landed-Surface audit asserts they shipped to MAIN; the implementing chat must **merge them in (or build them) before the Marketplace screens are anything but paper.**

**Marketplace screens (`/rfq-inbox`, `/marketplace/suppliers`, `/marketplace/logistics`) and the `+New ▸ Manufacturing ▸ RFQ` verb are marked `⚠ BACKEND-BLOCKED`** in the IA, the +New tray, and wireframe §3.7. Build them last, behind a feature flag, after a direct dispatcher grep confirms the action literals.

### 2.6 Shop-floor cross-shell note (FIX)

`/shop-live` currently lives ONLY under the locked-down `/employee/*` shell, not the `lead/admin` `<Layout/>` shell. Surfacing it in the Books Manufacturing group requires **either** a second route registration under `<Layout/>` (clearance `lead`) **or** a cross-shell link with clearance handling. Do not assume "EXISTS" means reachable from the accounting shell. Marked `[N*]`.

### 2.7 Top bar (top-right utility cluster)

| Element | Behavior | Backing |
|---|---|---|
| Global search | Type-ahead across transactions/customers/vendors/items + module jump ("chart of accounts" → `/general-ledger`); recent list on focus | `cmdk` palette + `customerList`/master-index |
| + New | The 5-column tray (§2.3) | per-item actions |
| Help (?) | Contextual help + assistant | existing help shell |
| Settings (gear ⚙) | 4-column settings menu (§2.8) | — |
| Notifications (bell) | Overdue invoices, 3-way-match exceptions, RFQ bids, payroll-due | `invoice_aging`, `po_three_way_match`, `rfqList` |
| Company / avatar | Shop switcher, profile, sign out | `/shop`, `/settings` |

### 2.8 Gear / Settings menu — QB 4 columns, JE+Budgets live here (FIX)

| YOUR COMPANY | LISTS | TOOLS | PROFILE |
|---|---|---|---|
| Account and settings → `/settings` | All lists → `/items` | Import data → `/inbox` | Subscriptions & billing → `/integrations` |
| Manage users → `/admin` | Products & services → `/items` | Export data → `/exports` | Manage subscription |
| Custom form styles → `/settings?tab=forms` | Recurring transactions | Reconcile → `/banking?tab=reconcile` | What's new |
| **Chart of accounts** → `/general-ledger` | Tracking categories *(QB "Classes/Locations")* | **Journal entries** → `/general-ledger?tab=journal` | Feedback |
| | Payment terms | **Budgeting** → `/budgets` | Switch company / shop → `/shop` |
| | | Audit log → `/audit-manager` | |

Business view / accountant view toggle lives lower-right (flips labels only, never data). JE and Budgeting are reachable from the gear (QB-correct) and NOT duplicated in the left-nav Accounting group.

### 2.9 Reconcile — ONE canonical route (FIX)

The draft hedged Reconcile across three targets. **Resolved to a single canonical target: `/banking?tab=reconcile`.** All three entry points wire to it identically:
1. Accounting nav group → Reconcile → `/banking?tab=reconcile`
2. Gear → Tools → Reconcile → `/banking?tab=reconcile`
3. Banking screen "Reconcile ▸" button → `/banking?tab=reconcile`

A QB user always lands in the identical place. (React Router v7 `useSearchParams` reads the `tab`.)

### 2.10 Banking route — loads BankingPage, not GeneralLedgerPage (FIX)

Clicking "Banking" in the rail loads a **Banking page at `/banking`** (new route → `BankingPage`), NOT `GeneralLedgerPage`. Wireframe §3.5 header is corrected to `/banking → BankingPage`. The account register and reconcile sub-views are tabs within `/banking` (`?tab=register`, `?tab=reconcile`).

### 2.11 Complete route → dispatcher-action table

`[E]` exists · `[N]` new route · Client method = real `client.ts` export when present, else **(add)** = a thin new wrapper following the existing `request<T>()` pattern. **FIX — five methods the draft cited as existing do not exist in `client.ts` (verified count 0) and are moved to (add): `arAgingReport`, `invoiceAging`, `cashFlowProject`, `profitabilityAnalyze`, `financialReportSalesByCustomer`.**

> **GROUND-TRUTH WARNING (P0, FIX).** The action literals below are the MAIN/879-action names. The **slot-hotel** dispatcher is the **stale 441-action copy** and uses OLD names (`quote_estimate` not `estimate_create`; `acct_bank_reconcile` not `bank_reconcile`; `gl_income_statement` etc.). ~22 of these actions are NOT reachable in slot-hotel. **Before wiring: either (a) merge MAIN's `businessDispatcher` into the build tree, or (b) rebind each row to the build tree's real literals.** A pre-wire CI gate (§6.5) greps every action string against the live `case '…'` set and fails on any miss. Do not bind `client.ts` to a string absent from the target dispatcher.

#### Sales / A/R
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Sales overview | `/sales` [N] | `invoice_aging`, `ar_aging_report` | `listInvoices`, **arAgingReport (add)** |
| Invoices (money-bar list) | `/invoices` [E] | `invoice_list`, `invoice_create`, `invoice_aging`, `invoice_from_job`, `invoice_payment` | `listInvoices`, `createInvoice` |
| Receive payment | `/invoices?action=receive` [E] | `receive_payment_apply`, `gl_record_payment` | `glRecordPayment` |
| Quotes | `/quotes` [N] | `estimate_create`, `quote_generate`, `quote_to_order`, `quote_revise`, `quote_status_change` | **(add)** |
| Credit memos | `/invoices?type=credit-memo` [E] | `credit_memo_create` | **(add)** |
| Sales orders | `/sales/orders` [N] | `sales_order_create` | **(add)** |
| Customer statements | `/customers?action=statement` [E] | `customer_statement_generate` | **(add)** |
| Finance charges / dunning | `/invoices?tab=dunning` [E] | `finance_charge_compute` | **(add)** |
| Customers | `/customers` [E] | `customer_create/get/list`, `customer_credit_check` | `customerList`, `customerCreate`, `customerCreditCheck` |
| Products & services | `/items` [N] | `item_define`, `inventory_price_break_optimize` | **(add)** |

#### Manufacturing
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Print-to-quote | `/quote-builder` [E] | `quote_generate`, `multi_process_quote`, `blueprint_to_quote`, `quote_quantity_breaks` | `quoteInstant`, `quoteQtyBreaks` |
| Jobs & work orders | `/jobs` [E] + `/orders` [E] | `order_work_order_create`, `quote_to_ship_run/status`, `schedule_open_work_orders`, `what_if_work_order` | (add) |
| Travelers | `/travelers` [N] | `traveler_create/get/scan/start_setup/start_cycle/complete_step/get_active` | **(add)** |
| Shop floor | `/shop-live` [N*] | `capacity_machine_load`, `capacity_all_loads` | (add) |
| Scheduling & capacity | `/scheduling` [E] + `/capacity` [E] | `capacity_project/earliest_slot/schedule_job/bottlenecks/summary/what_if`, `batch_capacity` | `schedulingSingleMachine` |
| Inventory & materials | `/inventory` [E] | `inventory_adjust_quantity/reorder_point/eoq/abc/safety_stock`, `acct_wip_valuation`, `material_stock` | `inventoryEOQ`, `inventoryABC`, `inventorySafetyStock` |
| Marketplace — RFQ inbox ⚠ | `/rfq-inbox` [E] | `rfqCreate`, `rfqList`, `rfqAssign`, `rfqUpdateStatus`, `marketplace_rank_rfq`, `marketplace_final_rank` | `rfqCreate`, `rfqList`, `rfqAssign`, `rfqUpdateStatus` |
| Marketplace — suppliers ⚠ | `/marketplace/suppliers` [N] | `marketplace_seed_from_hints`, `marketplace_lead_*`, `supplier_reputation[_rank]`, `vendor_catalog_ingest` | (add, BLOCKED) |
| Marketplace — logistics/escrow ⚠ | `/marketplace/logistics` [N] | `geo_route_cost/landed_cost/logistics_score`, `marketplace_escrow_deposit` | (add, BLOCKED) |

#### Expenses / A/P
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Expenses | `/expenses` [N] | `recurring_expense_create/list/get/update_amount/forecast/monthly_burden/deactivate`, `gl_record_purchase` | `glRecordPurchase` |
| Bills (3-way match) | `/bills` [N] | `po_three_way_match`, `shipping_three_way_match`, `po_record_receipt`, `vendor_credit_create` | `poThreeWayMatch` |
| Purchase orders | `/purchase-orders` [E] | `po_create/approve/receive/list/get/get_status/transition/append_change_order/ap_aging/spend_by_category/receipt_record` | `poCreate`, `poApprove`, `poReceive`, `poList`, `poAPAging`, `poSpendByCategory` |
| Pay bills | `/purchase-orders?tab=pay` [E] | `bill_payment_run` | **(add)** |
| Vendors | `/vendors` [N] + `/vendor-scorecard` [E] | `vendor_list_all`, `supplier_reputation` | `vendorList`, `vendorScorecard` |

#### Banking
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Bank transactions (review loop) | `/banking` [N] / `?tab=register` | `bank_feed_import`, `bank_deposit_record` | **(add)** |
| Reconcile | `/banking?tab=reconcile` [N→tab] | `bank_reconcile` (slot-hotel: `acct_bank_reconcile`), `integration_reconcile_bank` | `integrationReconcileBank` |

#### Projects / Job P&L
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Projects (page title "Job P&L at actual") | `/profitability` [E] | `profitability_analyze/compare/sensitivity`, `actual_cost_profitability`, `costing_job_cost`, `gl_record_wip_to_cogs` | **profitabilityAnalyze (add)**, `actualCostProfitability` |
| Tooling cost | `/tooling-cost` [E] | `inventory_tool_optimize/select` | `inventoryToolOptimize` |

#### Payroll
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Run payroll | `/payroll` [E] | `payroll_run/create_period/compute_gross/pay_stub/reconcile_gross`, `gl_record_payroll`, `benefits_payroll_deductions` | `runPayroll`, `createPayrollPeriod`, `finalizePayroll`, `glRecordPayroll` |
| Employees | `/employees` [E] | `mgr_direct_reports/reports_to_chain/set_reports_to`, `attendance_report`, `pto_compute_balance` | `hrPtoBalance` |
| Timecards | `/timecards` [E] | (time-clock entry) | — |

#### Reports
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Report center | `/reports` [E] | `reporting_dashboard/financial/pareto/production/quality/trend` | `reportingDashboard`, `reportingFinancial`, `reportingPareto`, `reportingTrend` |
| P&L | `/reports?r=income-statement` [E] | `gl_income_statement` | `glIncomeStatement` |
| Balance sheet | `/reports?r=balance-sheet` [E] | `gl_balance_sheet` | `glBalanceSheet` |
| Trial balance | `/reports?r=trial-balance` [E] | `gl_trial_balance`, `fin_invariant_validate_trial_balance` | `glTrialBalance`, `finInvariantValidateTrialBalance` |
| A/R aging | `/reports?r=ar-aging` [E] | `ar_aging_report`, `invoice_aging`, `integration_export_ar_aging` | **arAgingReport (add)**, **invoiceAging (add)**, `integrationExportARAging` |
| A/P aging | `/reports?r=ap-aging` [E] | `po_ap_aging` | `poAPAging` |
| Sales by customer/item | `/reports?r=sales-by-customer` [E] | `financial_report_sales_by_customer` | **financialReportSalesByCustomer (add)** |
| Cash flow | `/reports?r=cash-flow` [E] | `cash_flow_project` | **cashFlowProject (add)** |

#### Taxes
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Sales tax center | `/taxes/sales` [N] | `sales_use_tax_calc` | **(add)** |
| Payroll tax & 1099 | `/taxes/payroll` [N] | `payroll_compute_941`, `form_1099nec_generate`, `integration_export_payroll_tax` | `integrationExportPayrollTax` |

#### Accounting
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Chart of accounts | `/general-ledger` [E] | `gl_chart_of_accounts`, `chart_account_add`, `gl_record_invoice/purchase` | `glChartOfAccounts`, `glRecordInvoice`, `glRecordPurchase` |
| Journal entries | `/general-ledger?tab=journal` [E] | `gl_journal_entry`, `journal_entry_memorize` | `glJournalEntry` |
| Budgets | `/budgets` [N] | `budget_create` | **(add)** |
| Audit / validation | `/audit-manager` [E] | `accounting_audit`, `accounting_validate` | — |

#### Fixed assets / Dashboard / Executive
| Screen | Route | Action(s) | Client method |
|---|---|---|---|
| Fixed assets & depreciation | `/assets` [E] | `asset_register/list/compute_depreciation/depreciation_schedule`, `fixed_asset_depreciate`, `asset_transfer`, `asset_calibration_due` | `equipmentAssets` |
| Dashboard | `/dashboard` [E] | `invoice_aging`, `cash_flow_project`, `acct_wip_valuation`, `po_three_way_match`, `financial_report_sales_by_customer`, `sales_use_tax_calc` | `dailyFlashReport`, **cashFlowProject (add)** |
| Executive dashboard | `/executive-dashboard` [E] | `reporting_financial`, `daily_flash_report`, `commission_report` | `dailyFlashReport`, `commissionReport` |

### 2.12 Orphan audit (inverse audit completed — FIX)

**Routes to register in `App.tsx`** (all under the pathless `<Layout/>`, NO `/app/` prefix): `/sales`, `/sales/all`, `/sales/orders`, `/quotes`, `/items`, `/travelers`, `/marketplace/suppliers`⚠, `/marketplace/logistics`⚠, `/expenses`, `/bills`, `/vendors`, `/banking`, `/budgets`, `/taxes/sales`, `/taxes/payroll`. `/shop-live` needs cross-shell registration (§2.6).

**client.ts wrappers to add** (action exists, no export yet): the five false-cited methods + `credit_memo_create`, `sales_order_create`, `customer_statement_generate`, `finance_charge_compute`, `bill_payment_run`, `item_define`, `inventory_adjust_quantity`, `bank_reconcile`, `bank_deposit_record`, `bank_feed_import`, `budget_create`, `journal_entry_memorize`, `list_define_term`, `sales_use_tax_calc`, `vendor_credit_create`, `payroll_compute_941`, `form_1099nec_generate`, `asset_*` depreciation set, `traveler_*` set, marketplace set⚠.

**Reverse-orphan — landed actions with NO screen home (FIX — give each a tab home or flag headless):**
- `acct_wip_valuation` → surfaced as Dashboard WIP tile **and** a Job-P&L sub-tab `/profitability?tab=wip` (not headless).
- `acct_variance_analysis`, `acct_multi_period_compare`, `acct_cost_to_complete` → Reports → "Manufacturing" group tabs (`/reports?r=variance|multi-period|cost-to-complete`).
- `actual_cost_margin_alerts`, `actual_cost_trend` → Dashboard "Job P&L variance" tile drill-down + `/profitability?tab=trend`.
- `additive_quote`, `additive_compare_technologies` → the `/additive` route (exists in `App.tsx`, was dropped from the draft IA without reason) is **restored** to the Manufacturing group as `Additive quote → /additive`.

**Reverse-orphan (no QB analog — intentionally Manufacturing-native):** `/travelers`, `/shop-live`, `/marketplace/*`, `/quote-builder`, `/additive`.

**Overloaded +New verbs documented (FIX):** `Sales receipt → invoice_create` with `{ paid: true }` flag; `Transfer → bank_deposit_record` with `{ mode: 'transfer' }`; `Pay down credit card → bill_payment_run` with `{ mode: 'cc_paydown' }`. The wiring chat must pass the documented mode param so the button posts the correct document type — or file a dedicated action.

**Key files (absolute, canonical tree):** route table `H:\prism\mcp-server\web\src\App.tsx`; nav catalog `H:\prism\mcp-server\web\src\components\shell\shellCatalog.ts`; shell render `H:\prism\mcp-server\web\src\components\Layout.tsx`; data client `H:\prism\mcp-server\web\src\api\client.ts`; dispatcher `H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts`.

---

## 3. CORE SCREEN DESIGNS (ASCII wireframes)

**Recognizability contract (all screens):** light/white left rail · top-right utility cluster (search · +New · help · gear · bell · avatar) · soft-gray canvas with white rounded cards · sentence-case labels · split Save · status colors (paid=emerald, overdue=orange/red, open=slate/blue). **IP deltas fleet-wide:** PRISM wordmark top-left + every report header; brand accent is theme-primary (≥40° off `#2CA01C`), never QB green; the "Money Bar" is **"Receivables Snapshot"** as discrete cards; +New gains a 5th Manufacturing column; provenance ◇ source chip sits in the existing status-badge slot.

Legend: `[action]` = dispatcher action · `client.ts:fn()` = real export (line numbers intentionally omitted — they rot; verify by name) · `route` = `App.tsx` path.

### 3.1 Dashboard — `route: /dashboard → DashboardPage`
**QB-mirror:** QBO Business Dashboard widget tile grid. **Delta:** 4 manufacturing tiles in the same grid furniture.

```
┌────────────┬──────────────────────────────────────────────────────────────────────────┐
│ ◆ PRISM    │  ⌕ Search        + New ▾    ?    ⚙    🔔    (JM)                            │
│[Shop|●Books]├──────────────────────────────────────────────────────────────────────────┤
├────────────┤  Dashboard                                       [ This month ▾ ]          │
│ ▣ Dashboard│ ┌─────────────────────────────┐ ┌──────────────────────────────────────┐ │
│ ◷ Sales    │ │ Invoices            $128,400 │ │ Expenses          Last 30 days ▾     │ │
│ ◷ Manufact.│ │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░ │ │   ◔ donut  ■ Material 41% ■ Tooling  │ │
│ ◷ Expenses │ │ ■ Overdue 18.2k ■ Not due    │ │            ■ Labor 19%  23%          │ │
│ ◷ Banking  │ │ 6 open · 2 overdue           │ │                                      │ │
│ ◷ Projects │ └─────────────────────────────┘ └──────────────────────────────────────┘ │
│ ◷ Payroll  │ ┌─────────────────────────────┐ ┌──────────────────────────────────────┐ │
│ ◷ Reports  │ │ Profit & Loss   Last month   │ │ Bank accounts                        │ │
│ ◷ Taxes    │ │  Income      $214,900        │ │ Operating  In PRISM 84,210 |Bank 86k │ │
│ ◷ Accounting││  Expenses  − $158,600        │ │   ⟳ 12 to review        [ Update ]   │ │
│ ──────────  │ │  Net profit  $ 56,300  ▲     │ │ Payroll    In PRISM 22,050 |Bank 22k │ │  ← "In PRISM | Bank"
│ + New ▾     │ └─────────────────────────────┘ │   ✓ reconciled          [ Update ]   │ │     (NOT "In QuickBooks")
│            │ ┌─────────────────────────────┐ └──────────────────────────────────────┘ │
│            │ │ Sales (line)  ╱╲  ╱╲╱        │ ┌──────────────────────────────────────┐ │
│            │ └─────────────────────────────┘ │ Cash flow  in 97,300  out −41,800    │ │
│            │ ╔════════════ MANUFACTURING (PRISM-native, same tile furniture) ════════╗ │
│            │ ║┌────────────┐┌────────────┐┌─────────────┐┌──────────────────────────┐║ │
│            │ ║│Jobs in     ││Quote       ││Machine-hrs →││Open Marketplace RFQs  ⚠   │║ │
│            │ ║│progress 14 ││win-rate 62%││revenue      ││ (BACKEND-BLOCKED — feature │║ │
│            │ ║│■on-track 11││ ▲4pt       ││ 312hr→$71.8k││  flag off until merged)   │║ │
│            │ ║│■at-risk  3 ││            ││$230/spdl-hr ││                          │║ │
│            │ ║└────────────┘└────────────┘└─────────────┘└──────────────────────────┘║ │
│            │ ╚════════════════════════════════════════════════════════════════════════╝ │
└────────────┴──────────────────────────────────────────────────────────────────────────┘
```
**Backing actions / source-chips:** Invoices bar ← `listInvoices()` bucketed by status. Expenses donut ← `glIncomeStatement()` expense-side. P&L ← `glIncomeStatement({period_start,period_end})`. Bank accounts ← `glBalanceSheet()` cash + `[bank_reconcile]` review count (label **In PRISM | Bank**). Cash flow ← `cashFlowProject() (add)`. **Jobs in progress** ← `[costing_job_cost]` (◇ Job source per drill row). **Quote win-rate** ← `[estimate_create]` corpus ratio. **Machine-hrs→revenue** ← spindle-log COGS vs `glRecordInvoice()` (◇ traveler-op source). **Open RFQs** ← `[marketplace_rank_rfq]` ⚠ behind feature flag.

### 3.2 Invoice form — `route: /invoices → InvoicesPage (create/edit)`
**QB-mirror:** QB 2024 invoice — 4 tabs · blue-tinted header · customer top-left · date/terms/due top-right · line grid · totals lower-right · split Save. **Delta:** ◇ source chip + smart pre-fill banner.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PRISM   ⌕    + New ▾   ?   ⚙   🔔  (JM)                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  [ Edit ]  Receive payment   Manage   PDF / Preview                       ✕ close      │ ← 4 tabs (QB)
│ ┌───────────────────────────────────────────────────────────────────────────────────┐│
│ │ ◇ Born from  Job #4471 · Traveler op 30 · Quote Q-1180  — review & approve         ││ ← source chip (accent
│ ├───────────────────────────────────────────────────────────────────────────────────┤│   color, NOT green)
│ │░░░ HEADER (blue-tinted, QB) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░││
│ │ Customer [ ITW Mortgage Div.   ▾]   Invoice no. [ 1042       ]                      ││
│ │ Email    [ ap@itw.com          ]    Invoice date[ 05/31/2026▤]                      ││
│ │ Bill to  [ 3600 W Lake Ave ... ]    Terms       [ Net 30     ▾]                      ││
│ │ Ship to  [ (auto from traveler)]    Due date    [ 06/30/2026▤] (auto)               ││
│ └───────────────────────────────────────────────────────────────────────────────────┘│
│ ┌───────────────────────────────────────────────────────────────────────────────────┐│
│ │ # │ Product/Service │ Description     │ Qty │ Rate  │ Amount │Tax│ Job/Tracking cat ││ ← QB grid +Job col
│ │ 1 │ CNC-MILL-OP ▾   │ 6061-T6 bracket │ 250 │ 38.40 │9,600.00│ ☑ │ Job #4471 ◇auto  ││
│ │ 2 │ WIRE-EDM ▾      │ Trilobe detail  │ 250 │ 12.10 │3,025.00│ ☑ │ Job #4471 ◇auto  ││
│ │ + Add lines   Clear all lines   Add subtotal                                        ││
│ └───────────────────────────────────────────────────────────────────────────────────┘│
│  Message [ Thank you for your business. ]      ┌── totals (QB stack) ──┐               │
│  📎 Attachments (max 25MB)  ☐ Make recurring   │ Subtotal     12,625.00│               │
│                                                │ Sales tax ▾ ⓘ   821.60│ ← sales_use_tax│
│                                                │ Total       13,446.60 │   (ship-to)    │
│                                                │ Balance due 13,446.60 │               │
│                                                └───────────────────────┘               │
│                                            [ Save and send ▾ ]  ← Save·Save&new·close   │ ← split (remembers)
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing / source-chip:** customer type-ahead ← `[customer_list]`. Smart pre-fill (lines/qty/price/ship-to) ← **A3 born-from-event** `[quote_to_ship_run]` → BillingEngine; ◇auto field marks drop on override. Sales tax ← `[sales_use_tax_calc]` from ship-to. Save ← `createInvoice()` + `glRecordInvoice()`. Receive-payment tab ← `[receive_payment_apply]`.

### 3.3 Sales list / Receivables Snapshot — `route: /invoices (list) → InvoicesPage`
**QB-mirror:** QB Sales list + money-bar + table + per-row Action. **Delta (IP-required, recognition cost acknowledged §7):** the money-bar is **"Receivables Snapshot"** rendered as **discrete cards** (NOT a segmented green bar), kept in the exact top-of-list position with tile-as-filter preserved. ◇ chip in status column.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Sales ▸ Invoices                              ⌕ search   ⤓ Excel   🖨   + New ▾        │
│ ┌─── RECEIVABLES SNAPSHOT (QB "money bar" capability; clickable filter CARDS) ────────┐│
│ │ ┌────────┐┌─────────┐┌─────────┐┌─────────┐┌────────────┐                          ││
│ │ │Quotes  ││Unbilled ││Overdue  ││Open     ││Paid (30d)  │  ← each card = $ + count  ││
│ │ │$41,200 ││$6,400   ││$18,200  ││$97,300  ││$112,050    │     click → filters table ││
│ │ │ 3 quote││ activity││ 2 ▮ red ││ 6 ▮ blue││ 9 ▮ emerald│                          ││
│ │ └────────┘└─────────┘└─────────┘└─────────┘└────────────┘                          ││
│ └─────────────────────────────────────────────────────────────────────────────────────┘
│  [ Filter ▾ ]  [ Batch actions ▾ ]   [ ⚙ columns ]                                     │
│ ┌───┬────────┬───────┬────┬──────────────┬───────┬─────────┬───────┬──────────────────┐│
│ │ ☐ │ Date   │ Type  │No. │ Customer     │ Due   │ Balance │ Total │ Status           ││
│ ├───┼────────┼───────┼────┼──────────────┼───────┼─────────┼───────┼──────────────────┤│
│ │ ☐ │05/31/26│Invoice│1042│ ITW Mortgage │06/30  │13,446.60│13,446 │ Open  ◇Job4471 ▾ ││ ← ◇ chip in
│ │ ☐ │05/22/26│Invoice│1039│ Alcoa Howmet │05/29  │ 4,890.00│ 4,890 │ Overdue ◇ ▾      ││   status slot
│ │ ☐ │05/18/26│Invoice│1036│ Holo-Krome   │ paid  │    0.00 │ 8,210 │ Paid ◇ ▾         ││
│ │ ☐ │05/15/26│Quote  │Q-77│ SFS Group    │  —    │    —    │22,100 │ Pending ◇Manual ▾││ ← manual=neutral chip
│ └───┴────────┴───────┴────┴──────────────┴───────┴─────────┴───────┴──────────────────┘│
│   Row ▾Action: Receive payment · Send reminder · Print · Send · Copy · Void · Share    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing / source-chip:** snapshot cards ← `listInvoices({status})` bucketed; Quotes card ← `[estimate_create]` corpus. Rows ← `listInvoices()`; tile click re-queries (or client-side filters cached rows — §6.6). Row "Receive payment" ← `[receive_payment_apply]`. ◇ chip links row → Job/Traveler; hand-keyed rows render neutral un-clickable `◇ Manual entry` (never ragged).

### 3.4 Expenses / Bills + PO 3-way match — `route: /bills → BillsPage` (+ `/purchase-orders`)
**QB-mirror:** QB Expenses/Bills list + bank-reconcile split-pane grammar. **Delta (A4):** 3-way match tile QB cannot do, rendered in QB's match-left-to-right reconcile layout.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Expenses ▸ Bills                               ⌕   ⤓ Excel   🖨   + New ▾             │
│ ┌─── Bills snapshot (cards, QB pattern) ────────────────────────────────────────────┐│
│ │  Open bills $41,800 │ Overdue $9,200 │ Paid (30d) $63,400 │ Received-not-invoiced ◇ ││
│ └─────────────────────────────────────────────────────────────────────────────────────┘
│ ┌───┬──────────┬──────┬─────┬──────────────┬───────┬─────────┬──────────┬────────────┐│
│ │ ☐ │ Bill date│ Type │ No. │ Vendor       │ Due   │ Balance │ Status   │ Action     ││
│ │ ☐ │05/28/26  │ Bill │B-318│ Carpenter Stl│06/27  │12,400.00│Open ◇PO882│ ▾          ││
│ │ ☐ │05/20/26  │ Bill │B-312│ MSC Tooling  │05/27  │ 2,180.00│Overdue ◇  │ ▾          ││
│ └───┴──────────┴──────┴─────┴──────────────┴───────┴─────────┴──────────┴────────────┘│
│ ╔═════ 3-WAY MATCH — PO-882 (PRISM-native; reuses QB reconcile split-pane) ═══════════╗│
│ ║  Match: PO ↔ Receiving ↔ Vendor invoice        tolerance ±2%   [ Auto-clear ✓ ]    ║│
│ ║ ┌─ Purchase order ─┐ ┌─ Receiving ──────┐ ┌─ Vendor invoice ─┐ ┌─ Status ────────┐║│
│ ║ │ 6061 plate 500lb │ │ recvd     500lb  │ │ billed    500lb  │ │ ✓ matched       │║│
│ ║ │ @ $4.10 = 2,050  │ │ 05/26 GRN-44     │ │ @ $4.10 = 2,050  │ │ emerald         │║│
│ ║ ├──────────────────┤ ├──────────────────┤ ├──────────────────┤ ├─────────────────┤║│
│ ║ │ Sawing svc 1 lot │ │ recvd     1 lot  │ │ @ $640  =   640  │ │ ⚠ price var     │║│
│ ║ │ @ $600  =   600  │ │ 05/26            │ │  (+$40 / +6.7%)  │ │ → approve?      │║│
│ ║ └──────────────────┘ └──────────────────┘ └──────────────────┘ └─────────────────┘║│
│ ║  Exceptions (1): price variance line 2 +$40  [ Approve ] [ Dispute ] [ Hold ]      ║│
│ ║                                          [ Post matched lines as Bill ▾ ]          ║│
│ ╚═════════════════════════════════════════════════════════════════════════════════════╝
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing / source-chip:** Bills list ← `[bill_payment_run]` + `vendor_credit_create`. 3-way panes ← `[po_three_way_match]` (`poThreeWayMatch()` → `/erp/po-three-way-match`, confirmed literal) — PO + GRN + vendor invoice triangulation; received-not-invoiced accrual is the native delta. "Post as Bill" ← bill engine → `glRecordPurchase()`. ◇PO882 chip ties the Bill to the physical receipt.

### 3.5 Banking — `route: /banking → BankingPage` (FIX — was GeneralLedgerPage)
**QB-mirror:** QB bank-feed Review loop (For review / Categorized / Excluded + Add/Match) + account register + reconcile. **Delta:** Add/Match in theme-primary (not QB green); ◇ chips on shop-sourced matched rows; reconcile is `?tab=reconcile`.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Banking                            Operating ▾   In PRISM 84,210 | Bank 86,030        │ ← /banking, BankingPage
│  [ For review (12) ] Categorized   Excluded         ⟳ Update     Rules    Reconcile ▸ │ → /banking?tab=reconcile
│ ┌───┬──────────┬───────────────────┬──────────┬──────────────────┬──────────────────┐│
│ │ ☐ │ Date     │ Description       │ Amount   │ Category/Match   │ Action           ││
│ │ ☐ │05/30/26  │ DEP ITW MORTGAGE  │+13,446.60│ Match: Inv 1042 ◇│ [ Match ]        ││ ← theme-primary, not grn
│ │ ☐ │05/29/26  │ CARPENTER STL ACH │ −2,050.00│ Match: PO-882 ◇  │ [ Match ]        ││
│ │ ☐ │05/28/26  │ AMZN TOOLING      │ −  184.10│ Categorize ▾     │ [ Add ]          ││
│ └───┴──────────┴───────────────────┴──────────┴──────────────────┴──────────────────┘│
│ ╔═════ ACCOUNT REGISTER (?tab=register, QB spreadsheet ledger) — Operating ═══════════╗│
│ ║ [ Add ▾: Check·Deposit·Expense·Transfer ]                    Filter ▾   ⌕           ║│
│ ║ ┌──────────┬────────┬───────────┬─────────┬─────────┬─────────┬───┬──────────┐      ║│
│ ║ │ Date     │Ref/Type│ Payee     │ Account │ Payment │ Deposit │ ✓ │ Balance  │      ║│
│ ║ │05/30/26  │DEP     │ ITW Mortg.│ A/R     │         │13,446.60│ C │ 86,030   │      ║│
│ ║ │05/29/26  │EXP B318│ Carpenter │ Inventory│2,050.00│         │ C │ 72,583   │      ║│
│ ║ │05/27/26  │CHK 2041│ MSC Tooling│Tooling │ 2,180.00│         │ R │ 74,633   │      ║│
│ ║ └──────────┴────────┴───────────┴─────────┴─────────┴─────────┴───┴──────────┘      ║│
│ ║   ✓ legend: C=cleared  R=reconciled (locked)                                       ║│
│ ╚═════════════════════════════════════════════════════════════════════════════════════╝
│  Reconcile ▸ (?tab=reconcile)  Statement ending [ 86,030.00 ]  Date [05/31/26]  Diff 0 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing / source-chip:** For-review ← `[bank_feed_import]` (OFX/QBO/BAI2). Match ← against `listInvoices()`/PO records; ◇ chips show shop-op source. Register ← `[chart_account_add]` accounts + `[bank_deposit_record]`; running balance from GL. Reconcile ← `[bank_reconcile]` (slot-hotel literal `acct_bank_reconcile`) / `integrationReconcileBank()`. **In PRISM | Bank** framing (never "In QuickBooks").

### 3.6 Reports center — `route: /reports → ReportsPage`
**QB-mirror:** QB Report Center — search + Standard/Custom/Management tabs + favorite-star + category groups + drill-down. **Delta:** PRISM header stamp on every report; a Manufacturing report group in the same list grammar.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Reports                                          ⌕ find a report by name              │
│  [ Standard ]   Custom reports   Management reports                                    │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐
│ │ ★ Favorites   Profit and loss ☆   A/R aging summary ☆   Balance sheet ☆            ││
│ │ ──────────────────────────────────────────────────────────────────────────────────  ││
│ │ Business overview            Who owes you            What you owe                    ││
│ │  Profit and loss        →     A/R aging summary  →    A/P aging summary  →            ││
│ │  Balance sheet          →     Open invoices      →    Vendor balance     →            ││
│ │  Statement of cash flows→     Customer balance   →                                    ││
│ │  Trial balance / GL     →    Sales and customers                                      ││
│ │                               Sales by customer  →    Sales by product  →             ││
│ │ ╔══ Manufacturing (PRISM-native group, same list furniture) ══════════════════════╗││
│ │ ║  Job P&L at actual (quote vs actual) →   Machine-hour utilization → revenue   → ║││
│ │ ║  WIP valuation report                →   3-way match exceptions               → ║││
│ │ ║  Sales tax by shipment jurisdiction  →   Cost-to-complete / variance          → ║││  ← homes acct_*
│ │ ╚══════════════════════════════════════════════════════════════════════════════════╝││     orphan actions
│ └─────────────────────────────────────────────────────────────────────────────────────┘
│  ── open report ──  Period [ This year ▾ ]  Method ( Cash | ●Accrual )  Customize  Run  │
│  PRISM ▸ JM Die Company · Profit & Loss · Jan 1 – May 31 2026   ⤓Excel ⤓PDF ✉ 🖨        │ ← PRISM-stamped header
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing:** P&L ← `glIncomeStatement()`; Balance sheet ← `glBalanceSheet()`; Trial balance ← `glTrialBalance()`; GL/CoA ← `glChartOfAccounts()`. Sales by customer ← `financialReportSalesByCustomer() (add)`. A/R & A/P aging (Current/1-30/31-60/61-90/90+ — generic buckets) ← `arAgingReport() (add)` + `poAPAging()`. Cash flow ← `cashFlowProject() (add)`. Manufacturing group: Job P&L ← `[costing_job_cost]`; variance/cost-to-complete ← `acct_variance_analysis`/`acct_cost_to_complete` (homes the orphan actions); Sales tax by jurisdiction ← `sales_use_tax_calc`; WIP ← `acct_wip_valuation`. Control strip (Period · Cash/Accrual · Customize · Run · export) + number drill-down = QB behavior preserved.

### 3.7 Marketplace RFQ matching ⚠ BACKEND-BLOCKED — `route: /rfq-inbox → (Marketplace tab)`
**QB-mirror:** rendered in QB's Sales/Purchasing list-and-detail grammar (A7). **STATUS: BLOCKED — every backing action is absent from the target dispatcher (§2.5). Ship behind a feature flag after engines merge + dispatcher grep confirms literals.** Shown here as the design intent.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Marketplace ▸ RFQ matching ⚠ (feature-flagged off until engines merge)               │
│ ┌─── RFQ snapshot (same card pattern as Receivables Snapshot) ───────────────────────┐│
│ │  Open RFQs · 7 │ Matched 3 │ Awaiting bid 2 │ Escrow held $48,200 · 2              ││
│ └─────────────────────────────────────────────────────────────────────────────────────┘
│ ┌─ RFQ list (Invoices-style table) ───────┐ ┌─ RFQ-118 detail (vendor-card grammar) ──┐│
│ │ No.   Part        Qty Due    Status      │ │ RFQ-118 · Trilobe insert · 6061-T6      ││
│ │ R-118 Trilobe ins. 250 06/14 Matched ◇   │ │ Qty 250 · ±0.0005" · due 06/14          ││
│ │ R-117 Cam plate    40  06/09 Awaiting     │ │ ── Ranked suppliers (final rank) ──      ││
│ │ R-116 Shaft        500 06/20 Open         │ │ 1 Precision Co.  0.91 ⓘ [Award▾]        ││
│ │ R-115 Bracket      120 06/02 Escrow ◇     │ │   cap✓ rep96%OT 18mi slot6/3            ││
│ └─────────────────────────────────────────┘ │ 2 Apex Machining 0.84 ⓘ [Award▾]        ││
│  Row ▾: View bids · Award · Decline · Msg    │ ── Escrow ── Held $19,200 [Release ▾]   ││
│                                              │ Milestones ◷traveler ◷first-article ◷ship││
│                                              │ Onboarding: W-9✓ COI✓ AS9100⟳            ││
│                                              └─────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
```
**Backing (all BLOCKED until merge):** RFQ list ← `[marketplace_rank_rfq]`; ranked suppliers ← `[marketplace_final_rank]` (match + `supplier_reputation_rank` + `geo_logistics_score` + `capacity_earliest_slot`); score chips have hover tooltips explaining each number; escrow Held/Released badge reuses the A/R Paid/Pending/Held color column; ◇ chip ties escrow to milestones.

---

## 4. VISUAL DESIGN SYSTEM

### 4.1 Constraints (all three directions honor)
Zero Intuit green (`#2CA01C`, hue 112.7°) and no hue within ~40°. QB's light-rail / card aesthetic / comfortable density LAYOUT kept identical (zero re-learning). The three directions vary only the *skin* (color, nav treatment, type, density, icon weight). Furniture — left rail, +New tray, Receivables Snapshot, transaction lists, dashboard grid, reconcile panes — is shared and identical.

### 4.2 The 3 identity directions — comparison table → **★ OPERATOR DECISION POINT ★**

| Attribute | **A — Steel / Cobalt** | **B — Precision Teal / Slate** | **C — Indigo / Graphite** |
|---|---|---|---|
| **Primary** | Cobalt `#1F4FD8` (111.7° off green) · hover `#1A43B8` · pressed `#163A9E` | Deep Teal `#0E8C8C` (67.3° off — furthest, **lowest IP risk**) · hover `#0B7878` · pressed `#096363` | Indigo `#4338CA` (131.8° off) · hover `#3A30B0` · pressed `#2E2693` |
| **Accent** | Signal Amber `#E8910C` (76.5° off; shop warning-light vocab) | Indigo `#4F46E5` (130.7°; teal+indigo fintech signature) | Electric Violet `#7C3AED` (149.4°) |
| **Nav treatment** | Light rail, graphite text; active = cobalt left-edge bar + cobalt row tint 8% + cobalt text | Light rail, slate text; active = teal left-edge + teal row tint 8% + teal text | Light rail, graphite text + **optional premium dark-graphite rail** (`#1A1C25`); active = indigo edge+glow |
| **Canvas / cards** | Canvas `#F2F4F7` (steel-cool); white cards, hairline `#E2E6EC`, shadow `0 1px 2px rgba(20,30,50,.06)` | Canvas `#F6F8FA` (fintech-clean); flatter cards, hairline `#E5EAF0` | Canvas `#F4F4F8` (violet-neutral); 8px radius, deeper elev `0 2px 6px rgba(40,30,80,.07)` |
| **Typography** | Inter (UI) + IBM Plex Mono (figures) | Plus Jakarta Sans (UI) + Roboto Mono / `tabular-nums` | Geist (UI) + Geist Mono |
| **Density** | Comfortable, 44px rows (QB-equiv); compact 36px toggle | Comfortable, 44px, marginally airier | Comfortable→tighter 40px default; 44/36 available |
| **Icon style** | Line, 2px stroke, squared joints (engineering feel), cobalt-fill active | Line, 1.75px stroke, fully rounded (friendlier), teal-fill active | Line, 2px stroke, rounded, occasional duotone (indigo+violet) active |
| **Personality** | *"The shop's instrument panel learned accounting."* Industrial. | *"Clean modern fintech for the shop."* Mercury/Stripe lineage; **lowest confusion risk.** | *"Premium SaaS, built for manufacturers."* Linear/Vercel tier; dark-rail = instant "not QuickBooks" tell. |

> **★ IDENTITY DECISION — LOCKED: Direction C — Indigo / Graphite** (operator, 2026-05-31). Active tokens: primary Indigo `#4338CA`, accent Electric Violet `#7C3AED`, type **Geist + Geist Mono**, rounded 2px icons, with the **optional dark graphite rail** (`#1A1C25`) as the signature "not QuickBooks" tell. All three directions ship the identical QB-familiar IA + the same shared component system; only C's theme token *values* + type pairing + dark-rail are now active — set `data-theme="indigo"` on `<html>` (the runtime CSS-var swap; no rebuild). Personality: *"premium SaaS, built for manufacturers" (Linear/Vercel tier)*.
>
> IP note (carried from the trade-dress arm): C's indigo is **131.8° off** Intuit green `#2CA01C` — comfortably clear of the ~40° hue floor — but the final palette + the PRISM wordmark should still route through IP-counsel FTO clearance pre-launch (§7). The reserved-green rule (§1.3 / §4.4) still holds: `status.paid` emerald `#059669` is the ONLY sanctioned green and stays quarantined to the positive-money status role, never chrome.

### 4.3 Shared component system (identical across A/B/C; only token *values* swap)

Tokens extend the existing `primary-*` namespace that live `Button.tsx`/`Card.tsx` already use → adoption is non-breaking. Active theme selected by `data-theme="steel|teal|indigo"` on `<html>` via CSS-var indirection (runtime swap, no rebuild — mirrors existing `prism-dark` class + `data-sf-density`).

**Use the installed primitives by name (FIX — these libs are already in `package.json`, closing the audit's "no form builder / no data grid" gap):**

| Component | Built from (installed dep) | Backing |
|---|---|---|
| `<TransactionTable>` | `@tanstack/react-table` 8.21 + `@tanstack/react-virtual` | sortable/filterable/virtualized; column-gear, rows-per-page, Filter, Export, batch-actions, per-row Action dropdown |
| `<SaveSplitButton>` | `@radix-ui/react-dropdown-menu` + `class-variance-authority` | primary + caret (Save and send / close / new); remembers last in `prism_save_default_v1` |
| `<TxnFormShell>` / `<LineItemGrid>` / `<TypeAheadField>` / `<TotalsStack>` | `react-hook-form` 7.72 + `@hookform/resolvers` + `zod` 4 | header zone + line grid + totals + bottom toolbar; "+ Add new" last option per field |
| `<ApproveDraftBar>` | Radix + cva | born-from-event banner (A3); QB bank-feed accept/edit/exclude affordance → `receive_payment_apply`, `bill_payment_run` |
| `<PipelineStatusBar>` (Receivables Snapshot) | cards + shared `status` colors | clickable filter cards (NOT segmented bar): Quotes · Unbilled · Overdue · Open · Paid(30d); tile click filters `<TransactionTable>` |
| `<AccountRegister>` | `@tanstack/react-table` | Date·Ref/Type·Payee·Account·Payment·Deposit·✓(C/R)·Balance; inline Add-row; → `chart_account_add`/GL |
| `<DashboardTile>` + grid | `react-grid-layout` 2.2 + `@dnd-kit` | reorderable/resizable Customize layout; Today/Week/Month chips; stat/donut/bar/line/account-rows/checklist variants |
| `<SourceChip>` + `<ProvenanceSlideOver>` | Radix popover + existing `workflowRouteContext` (`parseWorkflowRouteContext`/`formatWorkflowSourceLabel`/`buildWorkflowPath`) + `?focusId=&focusType=` | the signature A1 differentiator; rides the EXISTING deep-link rail, not a new one |
| Charts | `recharts` 2.15 wrappers in `src/components/charts` | `<DonutChart>`/`<TrendChart>`/`<StatusSplitBar>`/`<AgingChart>`; series colors from `primary`+`accent`+`status` CSS vars (auto-reskin) |
| Global search / +New tray | `cmdk` 1.1 | command-palette primitive |
| Export | `xlsx` 0.18 + `jspdf` + `@react-pdf/renderer` | Excel/PDF on lists + reports |
| Icons / empty states | `lucide-react` + independently-authored PRISM flat illustrations | `<EmptyState>` — original artwork (IP defense) + one primary CTA |

### 4.4 Tailwind token structure (+ hue-floor lint, FIX-KEEP)

Three theme objects feed one `tailwind.config.js` `theme.extend.colors`. Components reference ONLY semantic tokens:

```
colors: {
  primary:  { 50…900 },   // ACTIVE: indigo ramp (#4338CA — Direction C, LOCKED 2026-05-31); data-theme="indigo", theme-mapped via CSS var
  accent:   { 50…900 },   // amber | indigo | violet
  surface:  { canvas, card, raised },
  border:   { hairline, strong },
  ink:      { primary, secondary, muted },   // graphite/slate text ramp
  status: {                                   // SHARED + FIXED across all 3 — never the primary hue:
    paid:    '#059669',  // cool-leaning emerald, 48.7° off #2CA01C — ONLY sanctioned green,
                         // QUARANTINED to positive-money status role; never chrome/CTA/active-nav.
    overdue: '#DC4E3A',  // orange-red
    open:    '#64748B',  // slate (draft/unbilled/open)
    info:    '#3B82F6',  // blue
    held:    '#9333EA',  // escrow-held (marketplace)
  }
}
```
Status colors are shared/fixed so the Receivables Snapshot + aging buckets read consistently across skins and the "paid green" is never brand primary.

**Hue-floor CI lint (FIX-KEEP — enforce the safe-harbor as a token rule, not a one-time check):** a vitest assertion over the three theme objects fails the build if any `primary`/`accent`/`surface`/`border`/`ink` (chrome/CTA/active-nav) token falls within **40° of hue 112.7°**. The `status.paid` emerald is the only sanctioned exception, commented as such in the token block. This prevents a future palette tweak from silently drifting toward Intuit green.

**Spacing scale (shared 4px grid):** `0/1=4/2=8/3=12/4=16/6=24/8=32/12=48`. Radius `sm=4 / md=6 / lg=8` (C nudges cards to 8). Shadow triplet `card/raised/overlay` per theme. `--row-h` density token = 44 (comfortable) | 40 (C default) | 36 (compact) via `data-density`.

---

## 5. MANUFACTURING DIFFERENTIATORS

The wedge: in QuickBooks every transaction is *typed by a human after the fact*; in PRISM ERP every fiscal record is *born from a shop-ops event*. Each differentiator lands inside familiar QB furniture so it reads native.

### 5.1 The provenance ◇ Source Chip (A1 — signature)
Every fiscal row carries an inline chip naming the shop-ops event that created it: `◇ Job #4471 · op 30` · `◇ PO-882 · 3-way ✓` · `◇ Quote Q-1180`.
- **Placement (familiar):** lists → the **status-badge slot** (a second pill left of status); forms → header zone under customer/vendor name; GL register → the existing **Ref/Type** cell (`· Job 4471` appended); audit log → existing reference column. No new column.
- **Interaction:** click → `<ProvenanceSlideOver>` (the existing `ShellRecord` slide-over via `?focusId=&focusType=`) showing the upstream artifact. QB's own click-to-detail gesture, resolved to a *shop* record.
- **Graceful degradation (load-bearing):** hand-keyed rows render a neutral, un-clickable `◇ Manual entry`; bank-imported rows `◇ Bank feed`. The chip is *always present* (column never ragged). A manual invoice later matched to a job is **promoted** `◇ Manual entry → ◇ Job 4471` with no row reshuffle.

### 5.2 Smart pre-fill (A3)
PRISM auto-populates the *same QB fields* with shop-derived values instead of blanks:

| QB field | QB behavior | PRISM smart default | Source |
|---|---|---|---|
| Customer + Bill-to | type-ahead, blank | from the job's customer; ship-to from traveler | job record |
| Line items (P/S, Qty, Rate, Amount) | hand-keyed | qty *shipped* + price from accepted quote | `createInvoice({ job_id })` |
| Terms / Due date | dropdown default | customer's last-used terms | customer record |
| Sales tax | "Select tax rate" | resolved from ship-to jurisdiction on traveler | shipment event |
| Bill line cost | hand-keyed | part standard cost / last PO price, variance-flagged | `poThreeWayMatch` |

- **Interaction (familiarity guarantee):** every smart-filled field is a normal editable input with the value already in it (QB "remembered default" idiom) + a tiny `◇ auto` mark at the field's right edge; type over it → plain manual value, mark drops. Nothing is locked.
- **Draft-and-approve:** born-from-event drafts land in the **draft inbox** using QB's bank-feed Review → **Approve / Edit / Exclude** three-button pattern (hosted on the existing `/inbox` Document Inbox). Operator sees `Draft invoice · Job 4471 · $12,400` — the exact accept-the-match muscle memory, manufacturing payload.

### 5.3 Manufacturing dashboard tiles (A6, A8) + Shop-Ops → Fiscal timeline
QB's exact home grid, swapped metrics (same card dimensions, same click-to-drill):

| Tile | QB analog slot | Click-through | Backing |
|---|---|---|---|
| WIP value | P&L mini-card slot | in-process job list / `/profitability?tab=wip` | `acct_wip_valuation` |
| Received-not-invoiced | Expenses donut slot | 3-way-match queue | `po_three_way_match` |
| Job P&L variance | Invoices status-bar style | `/profitability` | `costing_job_cost` |
| Sales tax by jurisdiction | Sales Tax Center slot | tax liability by ship-to | `sales_use_tax_calc` |
| RFQ inbox ⚠ | Tasks/Shortcuts slot | `/rfq-inbox` (flagged) | `marketplace_rank_rfq` |
| A/R aging | QB aging buckets verbatim | `/invoices` filtered | `arAgingReport (add)` |

**Shop-Ops → Fiscal Timeline** (familiar grammar, new surface): a vertical activity feed on the dashboard + each Job detail — `Quote accepted → Traveler released → Op 20 ran 4.2 machine-hr → Material drawn $1,840 → Shipped (tax resolved) → Invoice drafted → Payment received → GL posted`. Each node carries the §5.1 ◇ chip linking to its fiscal record. Presented as QB's "Feed" pattern (recent activity), but causally ordered floor→ledger.

### 5.4 Marketplace in accounting grammar (A7) ⚠ backend-blocked (§2.5)
The two-sided network has no QB analog → highest re-learning risk → rendered entirely in surfaces QB users operate:
- **RFQ broadcast** = a familiar "estimate request" list at `/rfq-inbox`, same list chrome as `/invoices`; posting reuses the +New form shape (`rfqCreate`).
- **Ranked supplier match** = a sortable table (vendor-list grammar): columns Match · Reputation · Logistics · Capacity · Total, each a chip with a hover tooltip explaining the number (`MarketplaceFinalRankEngine` blend).
- **Escrow** = the familiar Paid/Pending/Held badge column; onboarding (W-9/COI/cert) reuses `/inbox` intake.

> **Citation precision (FIX):** `po_three_way_match` is a confirmed literal. The marketplace ranking actions (`marketplace_rank_rfq`, `marketplace_final_rank`, `supplier_reputation_rank`, `geo_*`, `capacity_earliest_slot`) are plan-named and **were NOT confirmed as exact dispatcher case labels** in the target tree. Confirm via direct dispatcher grep before binding any `client.ts` call. (The earlier "businessDispatcher.ts:1541" citation was fabricated — that file has no such line.)

### 5.5 Marketplace-in-accounting-grammar one-liner & sales pitch

> **The pitch:** *"Everything you know about QuickBooks, plus your shop floor wired straight into the books."*
> **Demo half-line:** *"You don't type the invoice — the job ships and the invoice is already written, with a chip showing exactly which traveler op it came from."*

(Note: pitch uses "QuickBooks" only as comparative *marketing context*, never as a product affiliation/compatibility claim — keep it out of in-product UI copy and metadata.)

---

## 6. IMPLEMENTATION PLAN — quebec frontend galaxy

**Stack (FIX — verified):** Vite 6 + React 19 + `react-router-dom` 7.1.1 (declarative `<Routes>/<Route>` + `React.lazy`). Shell is a **pathless** `<Route element={<Layout/>}>` → URLs are root-level, NO `/app/` prefix. Data via `client.ts` `request<T>(method, path, body)` → `/api/v1/erp/*` (port 3100) → `prism_business`. State: TanStack Query 5.96 + Zustand 5.0. NOT Next.js; there are no App Router conventions to satisfy.

### 6.1 Phase 0 — Ground-truth re-pin & gates (BLOCKING, before any screen)
1. **Pin the build tree:** confirm the implementing chat edits `H:\prism\mcp-server\web` (has `package.json`/`vite.config`), NOT slot-hotel `web/`.
2. **Re-pin the dispatcher:** either merge MAIN's 879-action `businessDispatcher` into the build tree, OR rebind every §2.11 row to the build tree's real literals.
3. **Stand up the pre-wire CI gate** (§6.5) + the hue-floor lint (§4.4) before writing UI.
4. **Add the 14 new routes** to `App.tsx` (root-level, lazy) + register `/shop-live` cross-shell (§2.6).
5. **Add the Books/Shop workspace switch** to `Layout.tsx` + `shellCatalog.ts` (additive `NavSection[]`, keyed by workspace; `prism_workspace_v1`).

### 6.2 Phase 1 — Shared component foundation (build order)
Build in dependency order — verifiable core before consumers:
1. **Theme tokens** (chosen direction A/B/C) in `tailwind.config.js` + `index.css` CSS-var indirection + hue-floor lint green.
2. **`<SaveSplitButton>`**, **`<TypeAheadField>`**, **`<SourceChip>`+`<ProvenanceSlideOver>`** (atoms; SourceChip rides existing `workflowRouteContext`).
3. **`<TransactionTable>`** (`@tanstack/react-table`+virtual) + **`<PipelineStatusBar>`** (Receivables Snapshot cards).
4. **`<TxnFormShell>`/`<LineItemGrid>`/`<TotalsStack>`** (`react-hook-form`+`zod`) + **`<ApproveDraftBar>`**.
5. **`<AccountRegister>`**, **`<DashboardTile>`+grid** (`react-grid-layout`), charts wrappers (`recharts`).
6. **`cmdk`** global-search/+New tray.

### 6.3 Phase 2 — Screens (build first → last)
Order chosen so each screen sits on a proven foundation + delivers a familiar MVP early:
1. **Invoice form + Sales list** (`/invoices`) — the single most-used QB surface; exercises `<TxnFormShell>`, `<TransactionTable>`, `<PipelineStatusBar>`, `<SourceChip>`, `createInvoice`/`listInvoices`/`glRecordInvoice` (all real, no wrapper gap). **This is the thin-slice MVP** (§6.7).
2. **Dashboard** (`/dashboard`) — `<DashboardTile>` grid; reuses Phase-1 charts; `glIncomeStatement`/`glBalanceSheet` real.
3. **Banking** (`/banking` + `?tab=register`/`?tab=reconcile`) — `<AccountRegister>` + bank-feed Review loop; needs `bank_*` wrappers (add).
4. **Reports center** (`/reports`) — mostly-real backing; add `arAgingReport`/`cashFlowProject`/`financialReportSalesByCustomer` wrappers.
5. **Expenses/Bills + 3-way match** (`/bills`, `/purchase-orders`) — `poThreeWayMatch` real; the A4 differentiator.
6. **Projects** (`/profitability`), **Payroll**, **Taxes**, **Accounting CoA/JE/Budgets**, **Items/Customers/Vendors** — fill out parity.
7. **Marketplace** (`/rfq-inbox`, `/marketplace/*`) ⚠ **LAST, behind a feature flag** — only after engines merge + dispatcher grep confirms literals.

### 6.4 Data wiring to `prism_business`
- Reuse `client.ts` `request<T>()`. Add the ~24 missing thin wrappers (§2.12) following the existing pattern; **do not** invent endpoints — bind to confirmed `/erp/*` paths.
- Confirmed-real bindings to lean on: `createInvoice`→`/erp/invoice-create`, `listInvoices`→`/erp/invoices`, `glChartOfAccounts/glTrialBalance/glIncomeStatement/glBalanceSheet/glRecordInvoice/glRecordPayment/glRecordPurchase/glRecordPayroll/glJournalEntry`, `poThreeWayMatch`→`/erp/po-three-way-match`, `poCreate/poList/poAPAging`, `rfqCreate/rfqList`, `customerList/customerCreditCheck/customerPipeline`, `reportingFinancial/Pareto/Trend`, `actualCostProfitability`, `dailyFlashReport`, `runPayroll`, `vendorList/vendorScorecard`, `integrationReconcileBank`.

### 6.5 Pre-wire CI gate (FIX — hard gate)
A script greps every action string in the §2.11 map against the live `grep -oE "case '[a-z_0-9]+'" businessDispatcher.ts` set in the target tree and **fails the build on any miss**. No row may assert "verified real" for an action/client method not extracted from the actual file. (The marketplace rows are expected to fail until engines merge → keep them feature-flagged so the gate is scoped to wired screens.)

### 6.6 TanStack Query contract (FIX — specify per screen)
- **Query keys:** `['invoices', { status }]`, `['register', accountId]`, `['report', reportId, { period, method }]`, `['threeWayMatch', poId]`.
- **Invalidation:** Approve-draft / Receive-payment / Post-as-Bill / Save mutations `invalidateQueries(['invoices'])` (and `['register']` for GL-posting mutations). 3-way-match post invalidates `['threeWayMatch', poId]` + `['bills']`.
- **Money-bar tile filter = CLIENT-SIDE** filtering of the already-cached `['invoices']` list (no round-trip per tile click); only an explicit status-scoped query uses a new key.
- **Optimistic updates** on the born-from-event inbox Approve (show the posted row immediately, roll back on error).

### 6.7 Thin-slice familiar MVP
Ship **Invoice form + Sales list (Receivables Snapshot) + Dashboard** on the chosen theme, wired to the already-real `createInvoice`/`listInvoices`/`glRecordInvoice`/`glIncomeStatement`/`glBalanceSheet` (zero wrapper gaps, zero backend-blocked deps). A QuickBooks user can create/send an invoice and read their dashboard on day one — the full zero-re-learning promise demonstrated with the smallest reachable surface. Source chips render from real `workflowRouteContext`; manual rows show `◇ Manual entry` so the column is clean from the first import.

---

## 7. VERIFY SUMMARY — 4 adversarial verdicts + resolutions

### 7.1 Familiarity / zero-re-learning — PASS_WITH_FIXES → resolved
| Finding | Resolution in this spec |
|---|---|
| P0 Reconcile homeless / triple-routed | §2.9 — ONE canonical route `/banking?tab=reconcile`; all 3 entry points wire to it identically |
| P0 Left-nav spec ⟂ wireframe | §2.2 — ONE canonical rail (IA's Manufacturing group between Sales/Expenses); all §3 wireframes render it |
| P0 Banking → GeneralLedgerPage | §2.10 / §3.5 — `/banking → BankingPage`; register + reconcile are tabs |
| P1 Expenses group reshaped (4 vs 2) | §2.4 — kept (manufacturing-justified) but explicitly flagged in operator summary |
| P1 Projects renamed | §2.2 — bare QB label "Projects" in nav; "Job P&L at actual" is the page title |
| P1 Accounting nav children invented | §2.2 / §2.8 — tightened to QB's 2 (Chart of accounts + Reconcile); JE+Budgets moved to gear |
| P1 "Quote" collision (3 places) | §2.2 — "Quote builder" renamed **"Print-to-quote"**; "Quotes" (Sales) now unambiguously = QB Estimate |
| P2 Missing +New verbs | §2.3 — restored **Check** + **Refund receipt** + **Credit card credit**; Sales order flagged ⚑ non-QBO |
| P2 Receivables Snapshot recognition cost | §3.3 + §7 — **acknowledged honestly** (single largest pure-recognition delta, legally required); mitigated by exact top-of-list position + tile-as-filter preserved |

### 7.2 Trade-dress / IP safety — PASS_WITH_FIXES → resolved
| Finding | Resolution |
|---|---|
| Color — PASS (all hues ≥40° off, verified) | §4.2 — locked; §4.4 hue-floor CI lint added so it can't drift |
| `status.paid` emerald edge case (48.7°) | §4.4 — quarantined to status role, commented as the only sanctioned green |
| P1 "PRISM Books" name inside QB word-mark family | §1.3 + product-wide — renamed **PRISM ERP** everywhere (incl. the pitch line) |
| Term swaps (Estimate→Quote, Classes→Tracking categories, Money Bar→Receivables Snapshot cards) — PASS | Locked; §1.3 forbids reintroducing them in a later "parity" pass |
| "In QuickBooks" framing — PASS | "In PRISM \| Bank" shipped; only internal rationale text references the original |
| DEFER — pre-launch FTO counsel pass on final palette + marketplace | §4.2 noted; B (Teal) flagged lowest-risk |

### 7.3 Backend completeness / no orphans — PASS_WITH_FIXES → resolved
| Finding | Resolution |
|---|---|
| P0 Ground-truth mismatch (~22 actions absent in slot-hotel; OLD names) | §2.11 warning + §6.1/§6.5 — re-pin tree or rebind to real literals; CI gate blocks on any miss |
| P0 Marketplace screens paper in this tree (5 engines + 13 actions absent) | §2.5 / §3.7 — demoted to ⚠ BACKEND-BLOCKED in IA, +New, wireframe; feature-flagged, built last |
| P1 False "verified" client.ts citations (×5) | §2.11 — moved to **(add)** column: `arAgingReport`, `invoiceAging`, `cashFlowProject`, `profitabilityAnalyze`, `financialReportSalesByCustomer` |
| P1 Inverse orphan audit incomplete | §2.12 — homed `acct_wip_valuation`, `acct_variance_analysis`, `acct_multi_period_compare`, `acct_cost_to_complete`, `actual_cost_*`, and restored `additive_*` (`/additive`) to Reports/Projects tabs + Manufacturing group |
| P2 Overloaded +New verbs | §2.12 — documented mode-flag contracts (`{paid:true}`, `{mode:'transfer'}`, `{mode:'cc_paydown'}`) |
| Fabricated line ref `:1541` | §3 — all hardcoded line numbers dropped; verify by name |

### 7.4 Quebec-stack feasibility — PASS_WITH_FIXES → resolved
| Finding | Resolution |
|---|---|
| Stack framing wrong (not Next.js) | §6 — confirmed Vite + React Router v7; design targets RR v7 conventions |
| P1 `/app/*` base fabricated (pathless layout) | §2 + §6 — global strip of `/app/` prefix; URLs root-level; `?tab=`/`?action=` via `useSearchParams` |
| P2 Five false client.ts methods not all flagged | §2.11 — all five in **(add)** |
| P2 Line-number citations drift | §3 — dropped |
| Nav restructure understated (~80 entries) | §2.1 — scoped as **Books/Shop workspace mode**, additive `NavSection[]`, not a rail replacement |
| TanStack Query pattern unspecified | §6.6 — query keys + invalidation + client-side tile filter + optimistic inbox specified |
| Components need no absent lib | §4.3 — every component bound to an installed dep by name (react-table, react-hook-form, react-grid-layout, cmdk, radix, recharts, xlsx/jspdf) |
| shop-live cross-shell | §2.6 — `[N*]` second registration or cross-shell link |
| Worktree-path inconsistency | §6.1 — canonical build tree pinned to `H:\prism\mcp-server\web` |