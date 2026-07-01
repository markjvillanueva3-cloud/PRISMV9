# FULL ERP / BUSINESS Flagship Deep Audit — Consolidated Report

**Verdict:** 56/100 — **SINGLE-TENANT READY, SAAS-BLOCKED** · Strong core, 0% multi-tenant, 0% tax compliance
**Date:** 2026-05-08
**Method:** 10 parallel Explore agents (honest-build scan + BUILD_STATE intersection)
**Comparison:** WEDM 82, Lathe 75, Mill 68, Quote 65, PPG 62, **CAD/CAM 56**, Shop 56, **ERP 56**, SFC 53

---

## EXECUTIVE SUMMARY

ERP is the **most-built but most-blocked** PRISM subsystem. Honest-build scan rates the codebase **92/100** (36 wired engines, 386 dispatcher actions in businessDispatcher, 17 frontend pages, 9 DB tables, 1,200+ LOC tests). BUT:

- **Multi-tenant: 12/100** — 0 of 9 ERP tables have `shop_id` FK. Auth extracts userId only. ShopConfigurationEngine + MultiTenantEngine exist but **never invoked from any ERP path**. Two tenants would see each other's chart of accounts, customers, vendors, jobs, invoices.
- **Tax: 12/100** — 0 sales tax engines, 0 nexus determination, 0 1099 generators, no Avalara/TaxJar integration. Multi-state SaaS violates Wayfair (2018) economic nexus rules immediately upon ship.
- **Reporting: 42/100** — Strong manufacturing dashboards (OEE, downtime, utilization), **zero financial dashboards** (no P&L, BS, AR/AP aging UI, sales pipeline, compliance reports). ReportsPage exists with API hooks but no rendered financial views.

**The pattern is clear:** ERP-wide **single-tenant** is production-quality. ERP-wide **SaaS-grade** is structurally absent. Same shop_id finding from Quote (15/100) and Shop+HR+Payroll (32/100) extends across the entire ERP layer.

**Highest-leverage commits:**
1. **Schema migration: `shop_id FK NOT NULL` on all 9 ERP tables** + auth middleware threading + per-tenant query layer (40h)
2. **Build SalesTaxCalculationEngine + NexusDeterminationEngine + Avalara integration** (40h)
3. **Wire 1099-NEC and 1099-MISC generators** (cross-cuts with Shop+HR audit) (16h)
4. **Auto-trigger Quote→GL and Job-completion→COGS GL** posting (8h)
5. **Build financial dashboard pages** — P&L, Balance Sheet, AR/AP aging (40h)

Time to SaaS-ready: **~144h core**. Time to four-sigma: **~600h**.

---

## AGENT SCORECARD

| # | Agent | Domain | Score | Status |
|---|---|---|---:|---|
| 1 | GL / Accounting | GeneralLedgerEngine + AccountingHardening + Audit | 65 | ✓ Solid core |
| 2 | AP / AR | InvoicingEngine + PO 3-way match | 72 | ⚠ Vendor + dunning gaps |
| 3 | Inventory | MaterialCertTrace (AS9100) + ToolCrib + EOQ | 78 | ✓ Strong (highest in audit) |
| 4 | Purchasing/MRP | PO + Vendor scorecards | 52 | ✗ No MRP/BOM/RFQ |
| 5 | CRM | 11 engines, production-grade portal | 74 | ✓ Solid |
| 6 | Reporting | Manufacturing strong, financial weak | 42 | ✗ No financial UI |
| 7 | **Multi-tenant** | **0/9 tables scoped** | **12** | **✗ CRITICAL — blocks SaaS** |
| 8 | **Tax** | **0 sales tax / 0 nexus / 0 1099** | **12** | **✗ CRITICAL — Wayfair violation** |
| 9 | Integration | 40% wired / 40% partial | 60 | ⚠ COGS unwired |
| 10 | Honest scan | 36 engines + 386 actions wired | 92 | ✓ Codebase ahead of docs |
| | **Composite** | | **56** | **Single-Tenant Ready, SaaS-Blocked** |

---

## PART A — GL / ACCOUNTING (Agent 1) · 65/100

### Engines
- **GeneralLedgerEngine** — chart of accounts, journal entries, trial balance, P&L, balance sheet
- **AccountingHardeningEngine** — bank reconciliation, WIP valuation (GAAP), variance analysis, EAC forecasting
- **AuditEngine** — tamper-evident audit trail with actor/IP tracking

### Reports available
Income Statement, Balance Sheet, Trial Balance, Bank Reconciliation, WIP Valuation, Variance Analysis

### Auto-posting status
GL posting wired via QuoteToShipOrchestratorEngine but **lacks explicit job-completion hook** in JobLifecycleEngine.

### Gaps
- No period-close workflow
- No tax engines (separate critical gap)
- No AR/AP aging engine (separate from data — engine missing)
- No customer/project profitability rollup
- No cash flow statement
- **No multi-currency support** (blocks international)

---

## PART B — AP / AR (Agent 2) · 72/100

### AR (3 engines)
- InvoicingEngine — full lifecycle + aging reports
- CustomerManagementEngine — credit limits, payment terms, 1099-ready tax IDs
- StripeBillingEngine — SaaS subscription billing (partial)

### AP (3 engines)
- PurchaseOrderEngine — three-way match fully implemented + AP aging + supplier tracking
- AccountingHardeningEngine — bank reconciliation, WIP valuation
- FinancialAnalysisEngine — NPV/IRR/ROI

### Strengths
- ✓ Three-way match (PO → Receipt → Invoice) FULLY IMPLEMENTED
- ✓ Payment methods: Check, Wire, ACH, Credit Card
- ✓ Aging reports: Both AR & AP
- ✓ Credit limits: Enforced

### Gaps
- VendorEngine, PaymentEngine, ACHEngine, CheckPrintingEngine missing
- No dunning / late fee logic
- No cash discount support (2/10 Net 30)
- No 1099 or statement generation

---

## PART C — INVENTORY (Agent 3) · 78/100 ★ HIGHEST IN AUDIT

### Strengths
- **MaterialCertTraceabilityEngine** — full AS9100 lot traceability (cert → stock → program → inspection → shipment)
- **ToolCribEngine** — tool lifecycle (checkout/checkin/condition/reorder), 86K+ catalog + deflection modeling
- **InventoryEOQEngine** — safety stock & reorder points with ABC classification
- **ActualCostEngine** — labor/material/tooling cost vs estimate

### Gaps
- No explicit FIFO/LIFO valuation toggle (default avg cost)
- WIP tracking implicit (no dedicated engine)
- Finished-goods hold logic absent
- Barcode/RFID passive (not real-time)
- Auto-PO generation unwired
- Material cert PDF storage external (no internal PDF DB)

---

## PART D — PURCHASING / MRP (Agent 4) · 52/100

### Found
- PurchaseOrderEngine — PO lifecycle, 3-way match, AP aging
- VendorEngine — scorecards, spend tracking
- InventoryOptimizationEngine — EOQ/ABC
- PurchasingDirectoryEngine — 15+ distributors
- VendorCatalogManifestEngine — PDF ingest

### Critical Gaps
- **No MRP logic** — no demand-driven planning
- **No BOM explosion** — multi-level BOM unsupported
- **No RFQ engine** — vendor RFQs manual
- **No blanket POs** — release-against-blanket missing
- **No VMI** (Vendor-Managed Inventory)
- **No backorder management**
- **No receiving inspection** workflow
- **No AVL** (Approved Vendor List)
- **No drop-ship orchestration**

**Verdict: Transactional PO processor, NOT a demand-driven system.** Requires MRP core implementation before enterprise scaling.

---

## PART E — CRM (Agent 5) · 74/100

### 11 engines
- 5 core CRM: CustomerManagement, Portal, Knowledge, PortfolioMiner, CommunicationLog
- 6 sales/analytics: QuoteAnalytics, ProfitabilityWaterfall, OrderLifecycle, CrossCustomerPolicyTransfer, JobProfitability, AutoQuote

### Strengths
- **Portal**: production-grade token auth, scoped access, quality docs, messaging
- **Pipeline**: RFQ → Quote → Order (14-state machine, audit trail) → Win/loss
- **Profitability**: hierarchical waterfall + Pareto portfolio analysis by customer/part

### Gaps
- No Dun & Bradstreet integration
- No NPS / customer satisfaction
- No AI lead scoring
- No churn prediction

---

## PART F — REPORTING / DASHBOARDS (Agent 6) · 42/100

### Strong (manufacturing)
- 3 live dashboards: DashboardPage, OEE 4-tab decomposition, Department operations
- Manufacturing KPIs: OEE, availability, performance, quality, machine uptime, tool life, downtime Pareto, employee utilization
- ToolingCostPage, ReportsPage with business APIs (dashboard, pareto, production, quality, financial, trend)

### Critical Gaps (financial)
- ✗ No P&L UI page
- ✗ No Balance Sheet UI page
- ✗ No AR/AP aging UI page
- ✗ No sales pipeline dashboard
- ✗ No compliance reports (ISO, AS9100)
- ✗ No custom report builder
- ✗ No drill-down navigation
- ✗ Export: text-only (.txt) — lacks Excel, PDF, CSV, scheduled email

**Pattern**: Engines exist; UI doesn't render their output.

---

## PART G — MULTI-TENANT (Agent 7) · 12/100 ✗ CRITICAL

### Score: 12/100 — Critical SaaS readiness gaps

- **0 of 9 ERP tables have `shop_id` FK** — no database-layer isolation
- **Routes don't thread `tenant_id`** — auth extracts userId only, not shop_id from JWT
- **ShopConfigurationEngine exists but unwired** — manufacturing-only, not ERP
- **GeneralLedgerEngine uses single shared chart** — no per-tenant customization
- **MultiTenantEngine exists but orphaned** — never invoked from ERP layer
- **Stripe billing: 0% connected** — no payment processor, subscriptions, or metering
- **PII exposed across tenants** — employees, customers, vendors shared unmasked
- **No GDPR offboarding** — no data export, right-to-erasure, or tenant deletion tied to data cleanup

### Critical actions (priority order)
1. Schema migration: add `shop_id FK + NOT NULL` to all 9 tables
2. Auth middleware: extract `tenant_id` from JWT, inject into request context
3. Query layer: apply `WHERE shop_id = $tenantId` to all ERP queries via TenantIsolationEngine
4. GL hardening: per-tenant chart of accounts
5. Stripe integration: webhooks + usage metering
6. Tenant wizard: onboarding (provision GL charts) + offboarding (GDPR erasure)

---

## PART H — TAX (Agent 8) · 12/100 ✗ CRITICAL

### Critical gaps
- **0 sales tax engines** (state-by-state, county, city)
- **0 nexus determination** (Wayfair 2018 economic nexus rules)
- **0 use tax engines**
- **0 1099 generators** (NEC, MISC, K)
- **0 tax exemption certificate management**
- **0 Avalara / TaxJar / Vertex API integration**
- **0 SaaS subscription tax rules** (WA 6.5%, CA 7.25%, etc.)
- **0 VAT / GST** (international expansion blocked)

### Implication
Tax is **subsumed in margins** during quoting. **Multi-state SaaS operations violate Wayfair economic nexus rules immediately upon ship.** Payroll audit confirmed missing W-2/FUTA/SUTA engines (compounds this).

**Verdict: Tax compliance is a regulatory blocker before any revenue collection.**

---

## PART I — INTEGRATION (Agent 9) · 60/100

### 10 ERP chains
| # | Chain | Status |
|---|---|---|
| 1 | Quote → Job → Invoice → GL | ⚠ PARTIAL (Quote→GL auto-trigger missing) |
| 2 | PO → Receipt → Bill → GL | ✓ WIRED |
| 3 | Timesheet → Payroll → GL | ✓ WIRED |
| 4 | Job completion → Inventory deplete → COGS GL | ✗ STUBBED (engine exists, not invoked) |
| 5 | Inventory issue → WIP → FG → Customer | ✗ ABSENT |
| 6 | Sales receipt → Bank deposit → GL | ⚠ PARTIAL (manual) |
| 7 | Period close → TB → P&L → BS | ⚠ PARTIAL (not automated) |
| 8 | Customer payment → Cash → AR aging | ✓ WIRED |
| 9 | Vendor payment → Cash → AP aging | ✓ WIRED |
| 10 | Tool checkout → wear → reorder | ⚠ PARTIAL (incomplete) |

**40% wired / 40% partial / 10% stubbed / 10% absent**

### Most critical
- Multi-tenant data leakage (0/9 ERP tables scoped by shop_id) blocks SaaS
- Payroll tables non-existent in PostgreSQL despite engine code (cross-finding from Shop+HR audit)

**Functional for single-tenant; requires 250h integration work for GAAP compliance + SaaS readiness.**

---

## PART J — HONEST-BUILD SCAN (Agent 10) · 92/100 ★

### Reality
- **36 engines wired** (QuoteEstimator, JobCosting, GL, Invoicing, HR, AP) + 6 partial
- **386 dispatcher actions** in businessDispatcher — 100% ERP logic routed here
- **17 frontend ERP pages** live (dashboards, quote builders, GL, invoices)
- **1,200+ LOC ERP tests** — no critical-path gaps
- **9 DB tables** (GL double-entry, AP matching, invoices, POs, customers ready)

### Roadmap drift
- Codebase is **ahead of claims**
- 95% built, conservative estimates in roadmaps
- **No gaps found using intersection rule**

**Verdict: production-ready Quote→PO→Invoice→GL pipeline (single-tenant only).**

---

## CRITICAL BLOCKERS (Severity Order)

### TIER 0 — SaaS-deployment blockers
1. **0/9 ERP tables have shop_id FK** (40h: schema migration + auth threading + query layer)
2. **0 sales tax engines + 0 nexus determination** (40h: SalesTaxCalculationEngine + NexusDeterminationEngine + Avalara integration)
3. **0 1099 generators** (16h, cross-cuts with Shop+HR)
4. **PII unencrypted across tenants** (cross-cuts with Shop+HR)

### TIER 1 — Production trust
5. **No financial dashboard UI** (P&L, BS, AR/AP aging) (40h)
6. **Job completion → COGS GL stubbed** (8h auto-trigger)
7. **No period-close workflow** (24h)
8. **No MRP / BOM / RFQ engines** (80h)

### TIER 2 — Coverage
9. No multi-currency / FX support (24h)
10. No dunning / late fee / cash discount (16h)
11. No VendorEngine / PaymentEngine / CheckPrintingEngine (32h)
12. Manufacturing → financial dashboard parity (40h)

---

## RECOMMENDATIONS (priority order)

### IMMEDIATE — SaaS unblock (96h)
1. shop_id FK migration on all ERP tables (16h)
2. Auth → tenant_id injection (8h)
3. TenantIsolationEngine query layer (16h)
4. Per-tenant GL chart (8h)
5. SalesTaxCalculationEngine + Avalara API (24h)
6. NexusDeterminationEngine (8h)
7. 1099-NEC + 1099-MISC generators (16h)

### NEXT SPRINT — Production trust (88h)
8. Auto-trigger Quote→GL + Job-completion→COGS GL (8h)
9. Period-close workflow (24h)
10. P&L + BS + AR/AP aging dashboard pages (40h)
11. Excel/PDF/CSV/scheduled email exports (16h)

### M2 — Coverage (152h)
12. MRP + BOM explosion + RFQ engines (80h)
13. VendorEngine + PaymentEngine + CheckPrintingEngine (32h)
14. Multi-currency / FX (24h)
15. Dunning + late fee + cash discount (16h)

### M3 — Polish (160h)
16. WIP → Finished Goods pipeline (40h)
17. AVL + drop-ship + blanket POs + VMI (40h)
18. Reconciliation: charged vs collected vs remitted (16h)
19. Compliance reports (ISO, AS9100, ITAR) (24h)
20. Custom report builder + drill-down (40h)

---

## TIME-TO-PRODUCTION ESTIMATE

| Phase | Hours | Score Impact |
|---|---:|---|
| SaaS unblock (shop_id + tax) | 96 | 56→72 |
| Production trust (GL auto + UI) | 88 | 72→82 |
| MRP + supply chain | 80 | 82→88 |
| Multi-currency + collections | 72 | 88→92 |
| Polish + reconciliation | 160 | 92→96 |
| Four-sigma hardening | 100 | 96→98 |
| **Total** | **596** | **56→98** |

---

## SUMMARY

ERP scores **56/100** — but the verdict is binary: **single-tenant production-ready (92/100 honest-build), SaaS-blocked (12/100 multi-tenant + 12/100 tax)**. The 36 wired engines and 386 dispatcher actions are real. Quote→PO→Invoice→GL works. Three-way match works. AS9100 lot traceability works. Customer portal works.

**The blocker is structural**: every ERP table is single-tenant by schema. Every route drops `shop_id` at the boundary. Every tax calculation is subsumed in margins. **96 hours of disciplined integration work converts this from "works for JM Die" to "works as SaaS."**

This is the **same pattern as Quote (15/100 multi-tenant)** and **Shop+HR (32/100 DB)** — the multi-tenant theme runs across **3 of 8 audited subsystems** with the same root cause: ShopConfigurationEngine and MultiTenantEngine were built but never wired into ERP-touching paths.

**Composite Verdict: 56/100 — Single-Tenant Production-Ready, SaaS-Blocked. 96h to SaaS-ready, 596h to four-sigma.**
