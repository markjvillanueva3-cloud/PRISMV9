# ERP Front-End Database Catalog — DB-COVERAGE-GAPFILL-MS0 / U-ERP01

> **Work order:** *"databases for front end erp should be cataloged."*
> **Built by:** slot-assigned chat, 2026-06-03. Read-derived from the ERP engines, the `businessActionSchemas.ts` action set, the React/Vite frontend (`mcp-server/web/src/pages/*` + `web/src/api/*`), and the on-disk `mcp-server/data/state/` + `state/shared/` stores.
> **Scope:** every data store the front-end ERP reads or writes. The "gap" this milestone fixes = stores with a front-end page but no backing JSON file. U-ERP01 seeds the 3 P0 stores (invoices, employees, general-ledger).

---

## 1. Method / where the truth lives

The PRISM frontend is **not** a Next.js App Router app (no `web/app/**/page.tsx`). It is a **React 19 + Vite SPA** at `mcp-server/web/src/`:
- **Pages:** `mcp-server/web/src/pages/*.tsx` (~100 pages). ERP-relevant pages enumerated in §2.
- **API client:** `mcp-server/web/src/api/client.ts` (the big `prism_*` HTTP client — `listInvoices`, `glChartOfAccounts`, `listEmployees`, …) + per-domain clients `api/erp.ts` (the 10 `/api/v1/erp` analytics endpoints), `api/business.ts`, `api/prismBusiness.ts`. Frontend record **type contracts** live in `mcp-server/web/src/api/types.ts` (`Invoice`, `Employee`, `GLAccount`, `TrialBalance`, …) — these are the field shapes the UI actually renders.
- **Backend engines:** `mcp-server/src/engines/ERP*.ts`, `GeneralLedgerEngine.ts`, `CustomerPortalEngine.ts`, plus the business galaxy (`JournalEntryEngine`, `CustomerManagementEngine`, `ItemMasterEngine`, …).
- **Dispatcher contract:** `mcp-server/src/schemas/businessActionSchemas.ts` (invoicing, GL, AP/AR, payroll, tool-usage actions on `prism_business`).
- **Persisted data:** `mcp-server/data/state/*.json` and `state/shared/*.json`.

**Key architectural finding (matches the milestone root cause):** the ERP engines + schemas + frontend pages are rich, but the **persistent data layer is largely in-memory** (`const x: Map<...> = new Map([...])` seeded inline in the engine) and **un-persisted to disk**. `ERPIntegrationEngine` is the exception — it write-throughs to PostgreSQL via `PersistenceBridge`. `GeneralLedgerEngine` persists to `state/shared/general-ledger-state.json` (created lazily on first write, absent until then). Most ERP stores have **no JSON file**, so a fresh UI render shows only the inline seed (3 invoices, 3 tools, …) or an empty list.

---

## 2. ERP-relevant front-end pages (in scope)

| Page (`web/src/pages/`) | Surfaces store | Reads via (`api/client.ts`) | Record type (`api/types.ts`) |
|---|---|---|---|
| `InvoicesPage.tsx` | invoices | `listInvoices`, `createInvoice` → `/erp/invoices`, `/erp/invoice-create` | `Invoice` |
| `GeneralLedgerPage.tsx` | general-ledger | `glChartOfAccounts`, `glTrialBalance`, `glIncomeStatement`, `glBalanceSheet`, `glRecordInvoice/Payment/Purchase/Payroll`, `glJournalEntry` | `GLAccount`, `TrialBalance`, `IncomeStatement`, `BalanceSheet` |
| `EmployeeDirectoryPage.tsx`, `EmployeeProfilePage.tsx`, `EmployeePortalPage.tsx`, `EmployeePhonePortalPage.tsx`, `HotelEmployeeHubPage.tsx` | employees | `listEmployees`, `employeeSearch`, `employeeCreate`, `employeeUpdate`, `employeeDeptSummary`, `employeeUtilization` | `Employee` |
| `InventoryPage.tsx` | tool-inventory / item-master | `prism_business` tool-usage + inventory actions | (loose) |
| `CustomersPage.tsx` | customers | `prism_business` customer actions | `Customer` |
| `JobsPage.tsx`, `JobPlannerPage.tsx`, `BatchPlanningPage.tsx` | work-orders / jobs | `erp/job/*` + `prism_business` job actions | `ErpJob*` |
| `JobProfitabilityPage.tsx`, `CommissionTrackerPage.tsx`, `FinancialAnalysisPage.tsx`, `DailyFlashReportPage.tsx`, `ExecutiveDashboardPage.tsx` | derived from GL + jobs + invoices | mixed | derived |
| `MachineRatesPage.tsx`, `MaterialPricingPage.tsx`, `EquipmentAssetPage.tsx` | rates / material price / assets | shop-config + pricing | (loose) |
| `MaintenanceWorkOrderPage.tsx` | maintenance work orders | maintenance actions | (loose) |
| `CapacityPlanningPage.tsx` | capacity (derived) | `erp/analytics/capacity`, `oee`, `bottleneck`, `predictive` | `ErpCapacity*` etc. |
| `ErpDashboard.tsx`, `BusinessSuitePage.tsx`, `LatheERPDashboard.tsx` | ERP roll-up | mixed | mixed |
| `CustomerPortalPage.tsx`, `HotelPortalPage.tsx` | portal tokens / quality docs | `CustomerPortalEngine` | `Portal*` |

The `api/erp.ts` client's 10 endpoints (`/quote/generate`, `/job/plan`, `/analytics/oee`, …) are **compute/analytics**, not stores — they derive from job + machine data, so they are not catalogued as stores below.

---

## 3. Store catalog

Legend — **Backing file**: ✅ persisted JSON on disk · ⚠️ persists lazily (file created on first write, may be absent) · ❌ in-memory only (no file). **Page**: does a front-end page surface it. **GAP**: front-end page exists but no backing data file.

| # | Store | Backing file (`mcp-server/` unless noted) | Records | Backing engine | Dispatcher · action | FE page | Status |
|---|-------|-------------------------------------------|---------|----------------|---------------------|---------|--------|
| 1 | **invoices** | `data/state/invoices.json` ✅ **(NEW — U-ERP01)** | **20** | `GeneralLedgerEngine.recordInvoice` + business invoicing | `prism_business` · `invoice_create / invoice_from_job / invoice_list / invoice_payment / invoice_aging`; FE `/erp/invoices`, `/erp/invoice-create` | `InvoicesPage.tsx` | ✅ GAP CLOSED |
| 2 | **employees** | `data/state/employees.json` ✅ **(NEW — U-ERP01)** | **18** | (HR/business engines) + seed `src/data/jm-die-employees.ts` (8 in-code seeds) | `prism_business` employee actions; FE `/erp/employees`, `/erp/employee-*` | `EmployeeDirectoryPage.tsx` + 4 portal pages | ✅ GAP CLOSED |
| 3 | **general-ledger** | `data/state/general-ledger.json` ✅ **(NEW — U-ERP01)**; engine runtime store at `state/shared/general-ledger-state.json` ⚠️ (lazy) | **51 accounts + 40 journal entries** | `GeneralLedgerEngine.ts` (authoritative) + `JournalEntryEngine.ts` (templates) | `prism_business` · `gl_chart_of_accounts / gl_journal_entry / gl_record_invoice / gl_record_payment / gl_record_purchase / gl_record_payroll`; FE `/erp/gl-*` | `GeneralLedgerPage.tsx` | ✅ GAP CLOSED |
| 4 | **work-orders** | none ❌ (runtime → PostgreSQL via `PersistenceBridge` entity `work_orders`) | 0 file | `ERPIntegrationEngine` (`importWorkOrder`), `ERPWorkOrderEngine` (status sync), `ERPImportEngine` | `prism` · `erp_import_wo / erp_wo_list / erp_get_plan`; FE `/erp/job/*` | `JobsPage.tsx`, `JobPlannerPage.tsx` | ⚠️ GAP (page, no JSON; PG-backed at runtime) — U-ERP02 |
| 5 | **tool-inventory** | none ❌ (inline `Map` seed of 3; `ERPIntegrationEngine` PG entity `tool_inventory` seeds 6) | 0 file | `ERPToolInventoryEngine` (inline 3), `ERPIntegrationEngine` (inline 6) | `prism` · `erp_tool_inventory / erp_tool_update`; FE inventory actions | `InventoryPage.tsx` | ⚠️ GAP (page, no JSON) — U-ERP02 |
| 6 | **tool-transactions** | none ❌ (in-memory array, resets each boot) | 0 file | `ERPToolInventoryEngine` (`transactions[]`) | `prism_business` · `tool_*` usage actions | (Inventory/tool-crib pages) | ⚠️ GAP — U-ERP02 |
| 7 | **quotes / quote-history** | gitignored under `state/shared/quoting/` (not a state JSON); consolidated metadata in `data/vendor-catalog-db/` | n/a | quoting galaxy (`QuoteEstimator`, …) | `prism_business` quote actions, `prism_quoting` | `CostEstimatorPage.tsx`, `BlueprintQuotePage.tsx`, quote pages | ⚠️ partial (quoting corpus exists; no ERP quote-history JSON) — U-ERP02 |
| 8 | **materials-stock** | none ❌ (material *physics* DB is `data/materials/*_R3.json`; that is cutting data, NOT stock-on-hand) | 0 file | (inventory/material engines); GL acct `1320 Raw Materials Inventory` | `prism_business` material/inventory actions | `MaterialPricingPage.tsx`, `InventoryPage.tsx` | ⚠️ GAP (no stock-quantity store) — U-ERP02 |
| 9 | **customers** | none ❌ (in-memory) | 0 file | `CustomerManagementEngine` | `prism_business` customer actions | `CustomersPage.tsx` | ⚠️ GAP (page, no JSON) — backlog |
| 10 | **NCRs (non-conformance)** | none ❌ (in-memory `Map`) | 0 file | `ERPQualityEngine` (`createNCR`, `closeNCR`), `CustomerPortalEngine` quality docs | `prism` quality actions | `CompliancePage.tsx`, `QualityDashboardPage.tsx` | ⚠️ GAP — U-ERP03 |
| 11 | **receiving / inspections** | none ❌ (in-memory) | 0 file | `ERPQualityEngine` (`recordInspection`, type `receiving`) | `prism` quality actions | quality pages | ⚠️ GAP — U-ERP03 |
| 12 | **cost-entries / cost-feedback** | none ❌ (in-memory; ERPIntegration PG entity `cost_feedback`) | 0 file | `ERPCostFeedbackEngine`, `ERPIntegrationEngine.recordCostFeedback` | `prism` · `erp_cost_feedback / erp_cost_history` | `JobProfitabilityPage.tsx`, `FinancialAnalysisPage.tsx` | ⚠️ GAP (page, no JSON) — backlog |
| 13 | **vendors / purchase-orders / vendor-bills** | metadata in `data/vendor-catalog-db/` ✅ (425 vendors, procurement); no live PO/AP store JSON | 425 vendors (metadata) | vendor engines, `GeneralLedgerEngine.recordPurchase` | `prism_business` · `po_*`, `gl_record_purchase`, `integration_export_ar_aging` | (procurement pages) | ⚠️ partial — U-ERP03 |

### Backing files with no front-end page (reverse gap)
- `data/vendor-catalog-db/` — 425-vendor procurement corpus is persisted but has no dedicated ERP front-end page (consumed by quoting, not a vendor-management UI). Reverse gap: **data without a page**.
- `data/materials/*_R3.json` — material physics (cutting data) persisted; the ERP "materials-stock" concept (qty on hand) is a *different* store (row 8) and is NOT this file. Do not conflate.

---

## 4. P0 stores seeded by U-ERP01 (this unit)

### 4a. `data/state/invoices.json` — 20 invoices
**Schema = frontend `Invoice` interface (`web/src/api/types.ts:222`), matched field-for-field** (the load-bearing consumer, `InvoicesPage.tsx`, reads exactly these):
```
{ id, job_id, customer_name, date, due_date,
  line_items: [{ description, quantity, unit_price, total }],
  subtotal, tax, total,
  status: 'draft' | 'sent' | 'paid' | 'overdue',
  payments: [{ date, amount, method }],
  balance_due }
```
Invariants enforced in seed + test: `line.total == quantity*unit_price`, `subtotal == Σline totals`, `total == subtotal + tax`, `balance_due == total − Σpayments`, `status:'paid' ⇒ balance_due 0`. Status spread: 8 paid, 6 sent, 3 draft, 3 overdue. Customers drawn from the real JM Die roster (ITW, Alcoa, Optimas, SFS, Holo-Krome, Fastenal). `schemaVersion: 1`.

### 4b. `data/state/employees.json` — 18 employees, 6 departments
**Schema = frontend `Employee` interface (`web/src/api/types.ts:126`), matched field-for-field** (`EmployeeDirectoryPage.tsx` reads `labor_rates?.regular`, `status`, `department`, `role`, `skills`, `certifications[].expires`, `first_name`/`last_name`):
```
{ id, first_name, last_name, department, role,
  status: 'active'|'inactive'|'on_leave'|'terminated',
  clearance_level: 'shop_floor'|'lead'|'hr_manager'|'admin',
  auth_user_id: string|null,
  labor_rates: { regular, overtime, double_time },
  overtime_policy: { rule, daily_threshold_hrs, weekly_threshold_hrs, ot_multiplier, dt_multiplier },
  shift_differential: { second_shift_premium, third_shift_premium } | null,
  skills: string[],
  certifications: [{ name, expires?, status? }],
  hire_date, email?, phone? }
```
Department spread (matches `JMDieSeedDepartment`): machining (5), programming (3), quality (3), engineering (3), management (2), planning (2). Status spread: active 15, on_leave 1, inactive 1, terminated 1. Invariant: `overtime == 1.5×regular`, `double_time == 2.0×regular`. Names reflect JM Die's Polish/Spanish-primary floor (`project_jm_die_shop_floor_languages`). Synthetic — **no real PII**. `schemaVersion: 1`.

### 4c. `data/state/general-ledger.json` — 51 accounts + 40 journal entries
**Schema = `GeneralLedgerEngine` authoritative shapes (`src/engines/GeneralLedgerEngine.ts`):**
- Envelope = `LedgerState`: `{ schemaVersion: 1, journal_entries[], next_entry_seq, updated_at }` (+ `chart_of_accounts[]` added — the engine holds the chart as a module const `CHART_OF_ACCOUNTS`; persisting it in the store makes the file self-describing for the `gl_chart_of_accounts` consumer).
- Account = `Account`: `{ id, name, type, normal_balance, category }`. Types ∈ asset/liability/equity/revenue/expense. The engine ships 22 accounts; this store **extends to 51** with a standard manufacturing chart (cash/AR/WIP/FG/raw/tooling/equipment, AP/tax/payroll/deposits/loans, equity/draw, 3 revenue streams + contra, COGS/materials/direct-labor/OH/subcontract, 12 operating + interest expenses).
- Journal line = `JournalLineSchema`: `{ account_id, debit, credit, description? }`.
- `entry.source` ∈ the engine enum (`manual|invoice|payment|purchase|payroll|wip_to_cogs|depreciation|adjustment`).

**Double-entry invariant (enforced + tested):** every entry has Σdebits == Σcredits, no both-sided lines, no zero-zero lines, every `account_id` is in the chart — so the store would also pass `GeneralLedgerEngine.postEntry`'s replay. Total debits == total credits == **$1,063,864.44**. 40 entries span Jan–Apr 2026 (openings, raw-material/tooling purchases, WIP issue + labor, customer invoices, payments, monthly payroll/rent/utilities/depreciation, tax remittance, loan payment, prepaid insurance + amortization, customer deposit + application, AR write-off, owner's draw). `schemaVersion: 1`.

---

## 5. Verification

`mcp-server/src/__tests__/erp-seed-stores.test.ts` (vitest, **20 tests, all green**) asserts, per file: JSON parses, `schemaVersion === 1`, record count ≥ expected, and every record carries the concrete consumer fields (no `.toBeTruthy()`/`.toBeDefined()` — concrete `.toBe()`/`.toContain()`/`.toBeGreaterThanOrEqual()`). For general-ledger it asserts the real behavioral invariant: **every entry balances AND total debits === total credits**.

Run: `cd mcp-server && npx vitest run src/__tests__/erp-seed-stores.test.ts`.

---

## 6. Honest scope notes (R12)

- **No new dispatcher wiring or persistence-loader code** was added in U-ERP01 — these are **seed data files**. The ERP engines still hold their own inline/in-memory or PG-backed stores at runtime; making the engines *read* `data/state/*.json` as their seed source is follow-up work (loader + schema-version migration), not part of this data-seed unit. The files are render-ready for any consumer that reads `data/state/<store>.json` directly (the pattern other `data/state/*.json` stores use) and are field-faithful to the frontend types regardless.
- **GL chart double-source:** `GeneralLedgerEngine.CHART_OF_ACCOUNTS` (module const, 22 accounts) is the engine's runtime chart; the seeded `general-ledger.json` carries a 51-account superset. If the engine is later wired to load the chart from this file, reconcile the two (the 51 is a superset of the 22 — same id/name/type for the overlapping accounts). Flagged so it is not a silent divergence.
- **Stores I did NOT seed in U-ERP01** (deferred to U-ERP02/U-ERP03 per the milestone spec): work-orders, tool-inventory, tool-transactions, materials-stock, quote-history (U-ERP02); NCRs, receiving-inspections, vendor-bills (U-ERP03); customers + cost-feedback (backlog). Each has a front-end page but no JSON file today — the gap is real and catalogued in §3.
