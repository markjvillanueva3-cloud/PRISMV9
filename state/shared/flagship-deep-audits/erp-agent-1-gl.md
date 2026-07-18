# ERP Audit — Agent 1: GL / Accounting

## Engines Found

### Primary GL Engine
- **GeneralLedgerEngine** (H:\PRISM\src\engines\GeneralLedgerEngine.ts)
  - Chart of Accounts (18 default accounts: assets, liabilities, equity, revenue, expense)
  - Journal Entry creation with double-entry validation
  - Account balance tracking
  - Trial Balance generation
  - Income Statement (P&L) generation
  - Balance Sheet generation
  - Pre-built transaction templates: recordInvoice, recordPayment, recordPurchase, recordPayroll, recordJobCost, recordWipToCogs

### Secondary GL Engine
- **AccountingHardeningEngine** (H:\PRISM\src\engines\AccountingHardeningEngine.ts)
  - Bank Reconciliation (auto-match bank transactions to GL entries with fuzzy matching)
  - WIP Valuation (3 GAAP-compliant methods: absorption, variable, throughput)
  - Variance Analysis (price, quantity, mix variance decomposition)
  - Cost-to-Complete/EAC forecasting (3 methods: budget_rate, current_cpi, atc_rate)
  - Period-over-period financial comparison
  - QuickBooks Online sync mapping

### Audit Trail Engine
- **AuditEngine** (H:\PRISM\src\engines\AuditEngine.ts)
  - Full compliance audit trail with tamper-evident sequencing
  - Categories: auth, data, config, safety, machine, quality, export, admin, system
  - Severity levels: info, warning, critical
  - Actor/IP tracking, resource versioning (previous_value/new_value)
  - Query, report, and retention management

## Auto-posting (job→GL) Status

**WIRED:** QuoteToShipOrchestratorEngine wires job completion → GL posting
- ctx.gl_journal populated at job shipment
- Auto-post occurs via recordWipToCogs (WIP→COGS release)
- Routes: /gl-journal (manual entry), /gl-record-invoice, /gl-record-payment, /gl-record-purchase, /gl-record-payroll
- **Status:** OPERATIONAL but incomplete—no explicit job-completion hook in JobLifecycleEngine triggers GL posting automatically

## Reports Available

### Financial Statements
- **Income Statement (P&L):** Revenue by account, expenses by account, net income, margin %
- **Balance Sheet:** Assets/Liabilities/Equity breakdown with Assets = Liabilities + Equity validation
- **Trial Balance:** Debit/credit verification, balance check

### Advanced Reports (via AccountingHardeningEngine)
- **Bank Reconciliation:** Matched/unmatched transactions, outstanding deposits/checks, adjusted balance
- **WIP Valuation:** Job-level WIP by absorption/variable/throughput method
- **Variance Analysis:** Price/quantity/mix variance decomposition per job
- **Period Comparison:** Period-over-period financial metrics

### Missing Reports (NOT FOUND)
- AR Aging (aged receivables by bucket)
- AP Aging (aged payables by bucket)
- Customer Profitability (revenue/COGS/margin per customer)
- Project Profitability (detailed job P&L with burden allocation)
- Cash Flow Statement (direct/indirect method)
- Tax Summary (sales tax payable, income tax liability)

## Multi-currency Support

**Status:** ABSENT
- All amounts in single currency (USD implied)
- No FX rates, multi-currency conversion, or translation adjustments
- No currency-aware account balancing

## Score (0–100)

**65/100**

**Rationale:**
- ✓ Core double-entry GL with journal entries
- ✓ Financial statements (P&L, Balance Sheet, Trial Balance)
- ✓ Bank reconciliation & WIP valuation
- ✓ Variance analysis & EAC forecasting
- ✓ Audit trail with tamper-evident sequencing
- ✗ No period-close/month-end workflow
- ✗ No automatic job→GL hook at completion
- ✗ No tax engines (income/sales tax calculation)
- ✗ No AR/AP aging, customer/project profitability reports
- ✗ No multi-currency support
- ✗ Persistence partially integrated (needs DB migration validation)

**Next Steps:** Implement period-close engine, job-completion GL trigger, tax calculators, aging reports.
