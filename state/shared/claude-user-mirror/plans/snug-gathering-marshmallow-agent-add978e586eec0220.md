# ERP Integration Review — Manufacturing Business Workflow Pages

## Scope

Reviewed five frontend pages and their backing engines:

| Page | Frontend | Engine |
|------|----------|--------|
| ERP Dashboard | `web/src/pages/ErpDashboard.tsx` | hooks: useErpJobTrack, useErpCapacity, useErpOee |
| Inventory | `web/src/pages/InventoryPage.tsx` | `mcp-server/src/engines/InventoryEOQEngine.ts` |
| Purchase Orders | `web/src/pages/PurchaseOrdersPage.tsx` | `mcp-server/src/engines/PurchaseOrderEngine.ts` |
| General Ledger | `web/src/pages/GeneralLedgerPage.tsx` | `mcp-server/src/engines/GeneralLedgerEngine.ts` |
| Payroll | `web/src/pages/PayrollPage.tsx` | `mcp-server/src/engines/PayrollEngine.ts` |

Also reviewed: `IntegrationAdapterEngine.ts`, `shopTypes.ts`, `businessDispatcher.ts`.

---

## 1. DATA MODEL ASSESSMENT

### 1A. What Is Sound

**General Ledger Engine** -- the strongest piece of this ERP.

- Proper double-entry bookkeeping with balanced journal entry validation (line 130-133 of GL engine: `Math.abs(totalDebits - totalCredits) > 0.01` throws).
- Manufacturing-appropriate chart of accounts with WIP (1300), Raw Material Inventory (1200), Tool Inventory (1210), Accumulated Depreciation (1510), Accrued Payroll (2100), Payroll Taxes Payable (2200).
- Normal balance tracking per account (debit vs credit) -- the engine correctly applies debits/credits based on `normal_balance` direction (lines 172-176).
- Pre-built journal entry templates for the four core manufacturing transaction types: `recordInvoice`, `recordPayment`, `recordPurchase`, `recordPayroll`, `recordJobCost`.
- Trial balance, income statement, and balance sheet generation from the ledger data -- all structurally correct.
- The `recordJobCost` method properly debits WIP (1300) and credits individual cost pools (5000/5100/5200/5400), which is the correct absorption costing pattern.

**Purchase Order Engine** -- good lifecycle model.

- Full PO lifecycle: draft -> submitted -> approved -> partially_received -> received -> invoiced -> paid -> cancelled.
- Receiving records tracked separately from POs with condition tracking (good/damaged/wrong_item).
- Three-way match (PO vs receiving vs invoice) -- the right control for manufacturing AP.
- `linked_jobs` field on POs connecting purchasing to job costing.
- Line-item category taxonomy specific to manufacturing: raw_material, cutting_tool, workholding, consumable, machine_part, service.

**Payroll Engine** -- legitimately detailed.

- Pulls hours from TimeClockEngine (real time data, not manual entry).
- Proper tax calculations: federal withholding, state withholding, Social Security with wage base cap ($168,600), Medicare with additional rate above $200K threshold.
- YTD tracking for wage base cap calculations -- critical for correct FICA.
- Configurable per-employee deductions (health insurance, 401k, other).
- Department-level aggregation in payroll summary.
- Double-time rate support (manufacturing reality: holidays, 7th consecutive day in some states).

**Inventory EOQ Engine** -- mathematically rigorous.

- Classic Harris EOQ formula correctly implemented: Q* = sqrt(2DS/H).
- Safety stock using z-score from inverse normal CDF (proper Beasley-Springer-Moro approximation, not a lookup table).
- Reorder point = demand during lead time + safety stock.
- Total annual cost includes purchase cost + ordering cost + holding cost (including safety stock carrying).
- AtomicValue returns with uncertainty propagation -- consistent with the PRISM engine pattern.
- Practical recommendations engine (flags excessive ordering frequency, capital tie-up, high variability).

### 1B. What Is Structurally Wrong or Missing in the Data Model

**CRITICAL: In-memory state, no persistence.**

Every engine uses `private orders: Map<>`, `private entries: JournalEntry[]`, etc. as in-memory stores. The singleton pattern (`export const generalLedgerEngine = new GeneralLedgerEngine()`) means:
- All data is lost on server restart.
- No transaction isolation, no ACID guarantees.
- No audit trail persistence.
- Concurrent access from multiple users will produce race conditions on the shared Maps.

For a demo this is acceptable. For production, every engine needs a persistence layer (SQLite minimum, PostgreSQL recommended).

**CRITICAL: No foreign key relationships enforced across engines.**

The engines are independent singletons. There is no enforced referential integrity between:
- PO line items and inventory items (a PO receipt does not automatically increase inventory quantities)
- Payroll runs and GL entries (payroll engine does not call `generalLedgerEngine.recordPayroll()`)
- PO approvals and GL entries (approving/receiving a PO does not create an AP journal entry)
- Job completion and invoice creation
- Invoice payment and AR reduction in the GL

Each engine operates in isolation. The `businessDispatcher.ts` lazy-loads them independently. The GL has the `recordPurchase`, `recordPayroll`, `recordJobCost` methods, but nothing calls them automatically when those events happen in the PO/Payroll/Job engines.

**MAJOR: AP aging uses PO creation date, not invoice date.**

In `PurchaseOrderEngine.getAPAging()` (line 198-199), aging is calculated as:
```typescript
const days = Math.floor((now - new Date(po.created_at).getTime()) / 86400000);
```
This is wrong. AP aging should be based on invoice date or due date, not PO creation date. A PO created 60 days ago but invoiced yesterday is current, not 60 days overdue.

**MAJOR: No actual inventory ledger.**

The `InventoryEOQEngine` is a calculator only -- it computes optimal order quantities and reorder points given parameters. There is no actual inventory ledger that tracks:
- Current on-hand quantities per item/location
- Lot/serial number tracking
- Bin/location management
- Inventory valuation (FIFO, LIFO, weighted average)
- Physical count / cycle count reconciliation

The `InventoryPage.tsx` ABC classification uses hardcoded sample data (lines 51-57) rather than querying actual inventory.

**MAJOR: PO tax calculation is hardcoded at 8%.**

`PurchaseOrderEngine.createOrder()` line 94: `tax: subtotal * 0.08`. In manufacturing:
- Raw materials are often tax-exempt (resale certificate / manufacturing exemption).
- Tax rates vary by jurisdiction.
- Some items are taxable, others are not, on the same PO.

---

## 2. RELATIONSHIP CHAIN: PO -> Receiving -> Inventory -> Job Costing

### What Exists

The PO engine has the receiving flow:
1. `createOrder()` -- creates PO with line items
2. `approveOrder()` -- changes status, records approver
3. `receiveGoods()` -- creates ReceivingRecord, updates line item received quantities, changes PO status to partially_received or received
4. `threeWayMatch()` -- compares PO total vs receiving total vs invoice total

The GL engine has `recordPurchase()` which debits the correct expense account based on category and credits AP.

### What Is Missing (the broken chain)

| Step | Expected Behavior | Current State |
|------|-------------------|---------------|
| PO Approved | GL entry: debit commitment memo account | Not implemented -- no commitment accounting |
| Goods Received | Inventory quantities increase; GL entry: debit inventory, credit GR/IR accrual | Receiving only updates PO line `quantity_received`. No inventory impact. No GL entry. |
| Invoice Matched | GL entry: debit GR/IR accrual, credit AP | Not implemented. Three-way match is read-only verification. |
| Invoice Paid | GL entry: debit AP, credit Cash | No payment recording on POs. |
| Material Issued to Job | Inventory decreases; GL entry: debit WIP, credit inventory | No material issue transaction exists. |
| Job Complete | GL entry: debit COGS, credit WIP (for the finished goods) | `recordJobCost` debits WIP but there is no completion/COGS transfer. |

The `linked_jobs` field on POs is a good start but is never used to flow costs from PO -> receiving -> WIP.

---

## 3. GL STRUCTURE ASSESSMENT

### Correct

- Account numbering follows standard convention (1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue, 5xxx direct costs, 6xxx payroll costs, 7xxx admin).
- Separate accounts for direct labor (5000), direct material (5100), tooling (5200), machine expense (5300), shop overhead (5400) -- this is the right COGS decomposition for a job shop.
- WIP account (1300) exists.
- Payroll taxes payable (2200) separated from accrued payroll (2100).

### Missing for Production Manufacturing ERP

| Account | Why Needed |
|---------|-----------|
| 1400 Finished Goods Inventory | For completed but unshipped jobs |
| 1250 Supplies Inventory | Consumables (coolant, rags, etc.) vs raw material |
| 2400 Customer Deposits | Progress billing / deposits on large jobs |
| 2500 Notes Payable | Equipment financing |
| 4200 Shipping Revenue | If shipping is billed separately |
| 5500 Subcontract / Outside Processing | Heat treat, plating, anodizing -- major cost in job shops |
| 5600 Scrap / Rework Expense | Quality cost tracking |
| 6400 Workers Comp Insurance | Significant cost in manufacturing |
| 6500 Union Dues Payable | If applicable |
| 8000 Other Income / Interest | Non-operating income |

### Structural Issue: No Sub-Ledger Architecture

The GL engine is a single flat ledger. A production ERP needs:
- **AR Sub-Ledger**: Individual customer balances that reconcile to GL account 1100.
- **AP Sub-Ledger**: Individual vendor balances that reconcile to GL account 2000.
- **Inventory Sub-Ledger**: Item-level valuations that reconcile to GL accounts 1200/1210/1300.
- **Fixed Asset Sub-Ledger**: Individual asset depreciation schedules reconciling to 1500/1510.

Without sub-ledgers, the GL shows a single AR balance but cannot tell you which customers owe what. The Invoice engine (`InvoicingEngine`) exists separately but is not reconciled to the GL.

### Structural Issue: No Fiscal Period Close

There is no concept of:
- Period close / period lock (prevent posting to closed months)
- Year-end close (transfer net income to retained earnings, zero out revenue/expense accounts)
- Adjusting entries
- Closing entries

The `getIncomeStatement()` method takes period dates but queries all-time account balances (lines 283-289 iterate all accounts regardless of date). This means the P&L reflects all-time revenue and expense, not period-specific.

---

## 4. PAYROLL CALCULATION ASSESSMENT

### What Is Correct

- Gross pay = (regular hours x regular rate) + (OT hours x OT rate) + (DT hours x DT rate) -- correct.
- Social Security: 6.2% rate, capped at wage base ($168,600), with YTD tracking to enforce the cap -- correct.
- Medicare: 1.45% base + 0.9% additional above $200K -- correct.
- Federal withholding as a flat percentage -- simplified but defensible for a first implementation.
- `round2()` function for penny-exact calculations -- good.

### What Is Simplified/Wrong

**Federal tax is a flat rate, not bracketed.**
The engine applies `config.federal_tax_rate` (default 22%) as a flat percentage of gross pay. Real federal withholding uses:
- Filing status (single, married filing jointly, head of household)
- W-4 allowances / additional withholding
- Progressive tax brackets (10%, 12%, 22%, 24%, 32%, 35%, 37%)
- Pre-tax deduction adjustments (401k, health insurance reduce taxable income)

For a manufacturing ERP where most machinists earn $50K-$100K, a flat 22% is a reasonable approximation, but the 401k deduction should reduce the tax base (it currently does not -- line 135: `federalTax = grossPay * config.federal_tax_rate` uses gross, not gross minus pre-tax deductions).

**No employer-side tax calculation.**
The engine calculates employee deductions only. Manufacturing payroll also needs:
- Employer FICA match (6.2% SS + 1.45% Medicare) -- this is a significant expense not tracked.
- FUTA (Federal Unemployment Tax) -- 6.0% on first $7,000 per employee.
- SUTA (State Unemployment Tax) -- varies by state and experience rating.
- Workers' Compensation insurance -- rate varies by job classification.

The `IntegrationAdapterEngine.exportPayrollTaxSummary()` does reference "Employer FICA Match" in its export, but the PayrollEngine never calculates or stores it.

**No pre-tax vs post-tax deduction ordering.**
Health insurance (if Section 125 / cafeteria plan) and 401k should reduce taxable income before federal/state tax calculation. The current engine calculates all deductions independently from gross pay.

### Frontend Mismatch

The `PayrollPage.tsx` frontend type (`PayStub` in shopTypes.ts) has a simplified structure:
```typescript
interface PayStub {
  employee_id: string;
  employee_name: string;
  period: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: { type: string; amount: number }[];
  net_pay: number;
}
```

But the engine's `PayStub` type is much richer (earnings breakdown, itemized deductions, YTD). The frontend is throwing away most of the engine's output through the `as unknown as` cast at line 31 of PayrollPage.tsx. The `stubs` extraction might not even map correctly if the API response structure differs from what the frontend expects.

---

## 5. WHAT IS MISSING FOR A REAL MANUFACTURING ERP vs A DEMO

### Tier 1: Foundational (without these, it is not an ERP)

1. **Persistent storage** -- Database backing for all engines. Currently everything is in-memory.
2. **Transaction integrity** -- ACID transactions across related operations (e.g., receiving goods must atomically update PO status + create inventory receipt + create GL entry).
3. **User authentication and authorization** -- No RBAC. `approved_by: 'current-user'` is hardcoded. Real shops need: who can approve POs above $X, who can run payroll, who can post journal entries.
4. **Audit trail** -- Every change to financial data must be logged with who/when/what. Required for any accounting audit.
5. **Multi-currency** -- Even US-only shops buy imported tooling and material.

### Tier 2: Manufacturing-Specific (without these, a generic ERP, not manufacturing)

6. **Bill of Materials (BOM)** -- Multi-level BOM with parent/child relationships, quantities per assembly, revision control. This is the core of manufacturing ERP and does not exist anywhere in the system.
7. **Material Requirements Planning (MRP)** -- Given the BOM, open orders, and inventory, calculate what to buy and when. The EOQ calculator is a single-item optimization; MRP is the time-phased, multi-item, multi-level explosion.
8. **Routing / Work Center definition** -- Formal operation sequences with setup times, run times per piece, work center assignments. The Job engine has operations but they are not linked to defined work centers or routings.
9. **Shop Floor Control** -- Real-time job status from machine operators (start/stop operations, quantity completed, scrap reporting). The TimeClockEngine tracks clock-in/out but not operation-level data collection.
10. **Quality Management integration** -- NCR (Non-Conformance Reports) exist in the types but are not wired to job costing. Scrap/rework costs should flow into job cost variance.
11. **Lot traceability** -- For aerospace/medical manufacturing: trace material certifications through receiving, inventory, and into specific jobs. The `MaterialCert` type exists but is not connected to the PO/inventory/job chain.

### Tier 3: Operational (needed for daily use)

12. **Receiving inspection** -- Quality hold on received goods before releasing to inventory.
13. **Return to vendor (RTV)** -- Handling damaged/incorrect goods from receiving.
14. **Physical inventory / cycle counting** -- Reconcile book inventory to actual counts.
15. **Engineering Change Orders (ECO)** -- Revision control on parts, BOMs, and routings.
16. **Shipping / packing lists** -- Close the loop from job completion to shipment to invoicing.
17. **Sales tax calculation** -- By jurisdiction, with manufacturing exemptions.
18. **1099 reporting** -- For subcontractors / outside processing vendors.

---

## 6. QUICKBOOKS / ACCOUNTING SOFTWARE INTEGRATION ASSESSMENT

### What Exists

The `IntegrationAdapterEngine` provides:
- **QuickBooks IIF export** -- generates tab-delimited IIF format for journal entries. This is the QuickBooks Desktop import format.
- **Generic CSV export** -- for spreadsheet import.
- **Payroll tax summary CSV** -- for 941 filing prep.
- **AR aging CSV export**.
- **Bank reconciliation** -- compares statement to book balance.

### What Is Good

- IIF format is correctly structured with TRNS/SPL/ENDTRNS blocks.
- The split line (SPL) correctly negates the amount for the offsetting entry.
- Bank reconciliation logic (outstanding deposits, outstanding checks, adjusted balances) is correct.

### What Is Wrong or Missing for Real QuickBooks Integration

**IIF format is QuickBooks Desktop only, and Intuit deprecated it.**
- QuickBooks Online (QBO) does not support IIF import.
- QuickBooks Desktop is being sunset by Intuit.
- Modern integration should use the QuickBooks Online API (OAuth 2.0 + REST endpoints).

**No account mapping.**
The IIF export uses PRISM's account names directly. QuickBooks has its own chart of accounts. A real integration needs:
- Account mapping table (PRISM account 1000 -> QB account "Checking")
- Customer/vendor name mapping
- Class/department mapping (QB classes -> PRISM departments)
- Item mapping (for invoice line items)

**Missing QuickBooks integration endpoints:**
- Customer sync (create/update customers in QB when created in PRISM)
- Vendor sync
- Invoice sync (push invoices to QB for emailing/payment collection)
- Bill sync (push AP invoices to QB for payment)
- Payment sync (record payments from QB bank feeds back to PRISM)
- Payroll journal entry sync (push payroll totals to QB, since most small shops use QB or ADP for actual payroll)

**No Xero / Sage / NetSuite adapters.**
For larger shops outgrowing QuickBooks, there is no path to Sage 100 (formerly MAS 90, very common in manufacturing), Sage Intacct, NetSuite, or Xero.

**No real-time sync or webhook handling.**
The current model is batch export (generate file, user downloads, user imports into QB). A production integration needs:
- Event-driven sync (invoice created -> push to QB)
- Webhook receiver (payment recorded in QB -> update PRISM AR)
- Conflict resolution (same record edited in both systems)
- Sync status dashboard (last sync time, error count, retry queue)

---

## 7. FRONTEND-SPECIFIC ISSUES

### PurchaseOrdersPage.tsx

- **Line 72**: `supplier_id` is generated from supplier name: `form.supplier_name.toLowerCase().replace(/\s+/g, '-')`. This will create duplicate supplier records with different IDs if the user types the name differently ("McMaster Carr" vs "McMaster-Carr"). Need a supplier master with lookup/autocomplete.
- **Line 73**: PO creation only supports a single line item. Real POs have multiple lines (e.g., 10 different raw material sizes on one PO to a metal supplier).
- **Line 86**: `approved_by: 'current-user'` is hardcoded. No actual authentication context.
- **AP aging display** (line 237): Shows "90+ Days" but the engine provides `over_30, over_60, over_90` -- the display skips the 61-90 day bucket.
- **useEffect dependency** (line 64): `filter` and `tab` are dependencies but `loadOrders`, `loadAging`, `loadSpend` are not in the dependency array. The eslint rule is presumably suppressed.

### InventoryPage.tsx

- **Line 15-16**: `safetyResult` and `toolOptResult` are typed as `any`. The engine returns structured `AtomicValue` objects but the frontend just dumps JSON (line 352: `JSON.stringify(toolOptResult, null, 2)`).
- **ABC classification hardcoded data** (lines 51-57): Should query actual inventory, not 5 hardcoded sample items.
- **No connection to actual inventory levels**: The page is purely a calculator. It does not show current stock quantities, pending PO quantities, or consumption rates.

### GeneralLedgerPage.tsx

- **Record Transaction form** (lines 260-372): The journal entry form only supports a single debit account and single credit account. Real journal entries often have multiple lines (e.g., payroll entry debits multiple expense accounts and credits multiple liability accounts).
- **No date field on transaction recording**: The `glRecordInvoice`, `glRecordPayment`, etc. calls do not pass a date from the UI. The engine requires a date parameter.
- **No validation feedback**: If a journal entry is out of balance, the error is caught generically. Should show specific balance validation error.

### PayrollPage.tsx

- **No employee selection**: Runs payroll for all active employees. No ability to exclude employees or run for a specific department.
- **No preview/approval step**: Clicking "Run Payroll" immediately finalizes. Real payroll needs: preview -> review -> approve -> post -> print checks/direct deposit.
- **Missing data**: No display of individual deduction breakdowns (federal, state, FICA). Just shows total deductions.
- **No GL posting**: Running payroll does not create a GL journal entry.

### ErpDashboard.tsx

- **Manufacturing-centric KPIs are good**: Active jobs, utilization, OEE, machine count.
- **Missing financial KPIs**: No cash position, no AR/AP totals, no month-to-date revenue, no margin alerts.
- **Quick links** reference routes (`/erp/quote`, `/erp/jobs`, etc.) but these may not all exist as implemented pages.

---

## 8. SUMMARY SCORECARD

| Area | Rating | Notes |
|------|--------|-------|
| GL double-entry correctness | A | Balanced entries enforced, proper normal balance handling |
| Chart of accounts design | B+ | Good manufacturing accounts, missing a few (FG inventory, subcontract) |
| PO lifecycle | B | Good status model, missing payment and GL integration |
| Three-way match | B- | Verification works but does not trigger any downstream action |
| Payroll tax math | B+ | FICA correct with caps, federal withholding simplified but reasonable |
| Inventory management | D | Calculator only, no actual inventory ledger |
| Cross-engine integration | F | Engines are isolated silos with no event-driven connections |
| Data persistence | F | All in-memory, lost on restart |
| QuickBooks integration | C | IIF export exists but is desktop-only deprecated format |
| Audit / compliance | F | No audit trail, no user auth, no period locking |
| BOM / MRP | N/A | Does not exist |
| Overall as demo | B | Demonstrates the concepts well, good UI, correct formulas |
| Overall as production ERP | D- | Foundational gaps in persistence, integration, and compliance |

---

## 9. RECOMMENDED PRIORITIZED IMPROVEMENTS

### Phase 1: Make it functional (data does not vanish)
1. Add SQLite persistence layer to all engines (can use sql.js for cross-platform, already in the embeddings package).
2. Wire PO receiving -> GL entry (auto-create journal entry on goods receipt).
3. Wire payroll run -> GL entry (auto-create payroll journal entry).
4. Fix AP aging to use invoice/due date instead of PO creation date.

### Phase 2: Close the loops
5. Add actual inventory ledger (on-hand qty, location, valuation method).
6. Wire PO receiving -> inventory increase.
7. Wire material issue -> inventory decrease + job WIP increase.
8. Add multi-line PO creation in the UI.
9. Add payroll preview/approval workflow.

### Phase 3: Real accounting integration
10. Replace IIF export with QuickBooks Online API integration (OAuth2 + REST).
11. Add account mapping configuration UI.
12. Add bidirectional sync (push invoices to QB, pull payments from QB).
13. Add fiscal period management (open/close periods, year-end close).

### Phase 4: Manufacturing ERP features
14. Bill of Materials module.
15. MRP explosion / time-phased ordering.
16. Shop floor data collection (operation start/stop, qty complete, scrap).
17. Lot traceability (material cert -> receiving -> job).
