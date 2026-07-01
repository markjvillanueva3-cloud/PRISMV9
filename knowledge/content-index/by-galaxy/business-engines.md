---
name: business-engines
description: Strategic categorized engine digest for the business galaxy (ERP/HR/accounting/CRM/procurement/compliance) -- 71 engines, flat in mcp-server/src/engines.
type: reference
galaxy: business
node_type: memory
---

# business galaxy -- engine digest

## Overview

The business galaxy (slot:hotel) is PRISM's back-office layer: ERP integration, HR/payroll, accounting/general-ledger, CRM/customer-portal, procurement/vendor, and compliance/audit -- the layer that consumes accepted quotes (from quoting/charlie) into work orders and closes the estimated-vs-actual cost loop. Its two hard invariants are financial-invariant discipline (double-entry `sum(debits)===sum(credits)`, run `gl_trial_balance` before any `gl_journal_entry`) and PII discipline (redact customer/employee PII before any Ollama/external call; per-route auth on every HTTP surface). Engines live FLAT in `mcp-server/src/engines/*.ts` (the `business/` subdir holds only the cascade brain: CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md); the `business/` subdir is NOT a source root. Execution surface is `prism_business` (`mcp-server/src/tools/dispatchers/businessDispatcher.ts`, ~7,770 lines, 16 action buckets); MCP-down fallback imports engines directly from source.

Refined business-galaxy set: **71 engines** (keyword-refined off the flat 2,700-engine tree, then filtered against the doctrine sub-domain map in `business/CLAUDE.md` sec 2 + `business/PATHS.md`). Note: the Vendor/procurement family (11 engines) overlaps quoting/charlie -- vendor sourcing is co-owned (charlie owns the `.ts` extraction, hotel consumes it for PO/procurement). CAM/post-processor/WEDM-physics/capability-audit engines that matched the raw keyword sweep were EXCLUDED as other-galaxy assets.

## Strategic categories

### Accounting / Ledger / Finance
- `GeneralLedgerEngine.ts` (35K) -- double-entry GL, chart of accounts, financial statements
- `AccountingHardeningEngine.ts` (28K) -- bank-reconcile, WIP valuation, variance, QuickBooks sync
- `ChartOfAccountsEngine.ts` -- manufacturing chart-of-accounts registry
- `LedgerProjectorEngine.ts` -- projected/forecast ledger state
- `ActualCostEngine.ts` -- estimated-vs-actual cost capture
- `JobCostingEngine.ts` -- per-job cost rollup
- `JobProfitabilityWaterfallEngine.ts` -- per-job profit waterfall
- `CostEstimationEngine.ts`, `FreightCostEngine.ts` (name-derived), `ImportCostEngine.ts` (name-derived), `ToolCostPerPartEngine.ts`, `CostEfficiencyBridgeEngine.ts`, `CostSavingsTrackerEngine.ts`, `CostAlarmEngine.ts`

### Billing / Invoicing / AR
- `BillingEngine.ts` (25K) -- SaaS subscription + usage-tiered post pricing + Stripe-shaped webhooks
- `StripeBillingEngine.ts` (name-derived) -- Stripe adapter layer
- `InvoicingEngine.ts` (name-derived) -- invoice generation
- `CustomerStatementEngine.ts` (name-derived) -- AR statements
- `FinanceChargeDunningEngine.ts` (name-derived) -- finance charges + dunning workflow

### HR / Payroll / Employee
- `EmployeeEngine.ts` (30K) -- employee master data, skills, certs, labor rates (HR foundation)
- `EmployeeMachineDomainAcademyEngine.ts` (48K) -- (role x machine-domain) x tier training, Cpk-gated qualification bridge to shift-swap/task-handoff
- `EmployeePayrollGrossPayEngine.ts` (name-derived), `PayrollEngine.ts` (name-derived), `PayrollLiabilityFilingEngine.ts` (name-derived) -- payroll compute + tax filing
- `EmployeePTOAccrualEngine.ts`, `EmployeeBenefitsEnrollmentEngine.ts` (name-derived), `EmployeeExpenseReimbursementEngine.ts` (name-derived)
- `EmployeeTimeClockEngine.ts`, `EmployeeShiftScheduleEngine.ts`, `EmployeeShiftSwapEngine.ts`, `EmployeeTaskHandoffEngine.ts`, `EmployeeMultiJobConcurrencyEngine.ts`, `EmployeeShopFloorMobileEngine.ts`
- `EmployeePerformanceFeedbackEngine.ts` (name-derived), `EmployeeRoleAcademyInjectionEngine.ts`, `EmployeeDailyDigestEngine.ts` (name-derived), `EmployeeWizardBridgeEngine.ts`
- `EmployeePerOpPartTrackerEngine.ts`, `EmployeePerMachineSFAdaptiveEngine.ts`, `EmployeeInsertSideTrackerEngine.ts` (per-op/per-machine/per-insert trackers)

### CRM / Customer
- `CustomerManagementEngine.ts` (34K) -- CRM: records, credit limits, pricing tiers, pipeline
- `CustomerPortalEngine.ts` (41K) -- token-based external customer portal, SQLite-WAL persisted
- `CustomerMaterialMapEngine.ts` (31K) -- learned customer->material distribution map
- `CustomerKnowledgeEngine.ts`, `CustomerPortfolioMinerEngine.ts`, `CustomerComplaintIntakeEngine.ts` (name-derived), `CustomerStatementEngine.ts` (name-derived)
- `ProspectiveCustomerEngine.ts` (name-derived), `BuyerAccountEngine.ts` (name-derived), `CrossCustomerPolicyTransferEngine.ts` (name-derived)

### ERP orchestration
- `ERPIntegrationEngine.ts` (32K) -- central ERP bridge (JobBOSS/Epicor/SAP mapping layer)
- `MultiERPConnectorEngine.ts` (49K) -- unified IERPConnector: E2/Epicor-Kinetic/ProShop/generic-CSV adapters
- `ERPWorkOrderEngine.ts`, `ERPCostFeedbackEngine.ts` (5-category cost feedback), `ERPQualityEngine.ts` (name-derived), `ERPToolInventoryEngine.ts` (reorder-point sync), `ERPImportEngine.ts` (name-derived)
- `JMDieErpSimulationEngine.ts` (name-derived) -- JM Die ERP sim

### Job / Order / Scheduling / Capacity
- `JobTravelerEngine.ts` (25K) -- E2-style op-routing traveler (setup+cycle dual time tracking)
- `JobLifecycleEngine.ts` -- 13-state job lifecycle state machine
- `JobShopSchedulingEngine.ts` (name-derived), `JobRoutingTemplateEngine.ts` (name-derived), `JobDeskAggregatorEngine.ts` (name-derived), `AutomatedJobSchedulerEngine.ts` (name-derived)
- `CapacityPlanningEngine.ts` (name-derived), `CapacityMonteCarloEngine.ts` (name-derived), `EngineeringChangeOrderEngine.ts` (name-derived)

### Procurement / Vendor (co-owned with quoting/charlie)
- `VendorEngine.ts` (name-derived) -- vendor master
- `VendorCreditEngine.ts`, `VendorPerformanceTrackerEngine.ts`, `VendorQuoteToPurchaseOrderEngine.ts`, `VendorUnitPriceEngine.ts`, `VendorCostIndexEngine.ts`, `VendorRegionEngine.ts`, `LocationAwareVendorPricingEngine.ts`, `VendorRealtimePricingClientEngine.ts` (all name-derived) -- pricing/PO/performance
- `VendorCatalogImportEngine.ts`, `VendorCatalogManifestEngine.ts`, `VendorTurningCatalogExtractorEngine.ts` (name-derived) -- catalog ingest (charlie-owned extraction)
- `JMCustomerVendorDatabaseEngine.ts` (name-derived) -- JM Die vendor DB

### Compliance / Audit / PII / Legal
- `ComplianceEngine.ts` (41K) -- compliance-as-code: regulatory templates, hooks, audits, append-only log (ADDITIVE, never gating)
- `LegalComplianceOperatingEngine.ts` (34K) -- NDA lifecycle, export-control (ITAR/EAR), doc retention, OSHA, cert tracking
- `IndustryStandardsComplianceEngine.ts` (28K) -- ISO 2768/1302, AS9100, ISO 13485, IATF 16949 part checks
- `PIIComplianceEngine.ts` (name-derived), `ISO9001QMSEngine.ts` (name-derived), `ITARComplianceTaggerEngine.ts` (name-derived), `OSHAComplianceEngine.ts` (name-derived), `HRComplianceEngine.ts` (name-derived)
- `CAPAWorkflowEngine.ts` (name-derived), `KaizenLeanSigmaEngine.ts` (name-derived), `LOTOLogEngine.ts` (name-derived)
- `AuditManagerEngine.ts` (name-derived), `ConsensusAuditLogEngine.ts` (name-derived), `DepartmentAuditDashboardEngine.ts` (name-derived), `InternalAuditCalendarEngine.ts` (name-derived), `OperatorActionAuditTrailEngine.ts` (name-derived)

### BI / Document / Sync
- `BusinessIntelligenceEngine.ts` (48K) -- make-vs-buy, capital-investment ROI/NPV, break-even, capacity
- `BusinessDocumentExtractorEngine.ts` (name-derived) -- business doc extraction
- `BusinessSyncEngine.ts` (name-derived) -- worst-status-wins sync aggregation (was an exFAT-corruption stub, restored)
- `DocustrataAccountingBridgeEngine.ts` (name-derived), `DocustrataCustomerIndexEngine.ts` (name-derived) -- DocuStrata AP/customer index bridges

## Key engines (detailed)

### MultiERPConnectorEngine.ts
Largest business engine (49K). Provides a unified `IERPConnector` interface abstracting ERP-specific operations plus concrete adapters for E2 Shop System, Epicor Kinetic (REST OData), ProShop ERP, and generic CSV (RFC 4180). Routes operations to the correct adapter by registered system ID so a shop can run multiple ERPs simultaneously (e.g. E2 for production + ProShop for quality).
- Path: `mcp-server/src/engines/MultiERPConnectorEngine.ts`
- Exports: `ERPSystemType`, `ERPConnectionConfig`, `CSVColumnMapping`; actions `multi_erp_connect|import_wo|export_plan|sync_inventory|status|list_systems`

### EmployeeMachineDomainAcademyEngine.ts
The HR<->academy bridge (48K). Adds the (role x machine_domain) x tier dimension on top of generic role tracks across 10 machine domains (mill/lathe/swiss_lathe/mill_turn/wedm/sinker_edm/grinder/inspection + honing + carbide_polishing). Passing a domain course auto-calls `EmployeeShiftSwapEngine.registerCoursePassed` AND `EmployeeTaskHandoffEngine.registerCoursePassed` -- single-source-of-truth for machine-X qualification. Cpk on the qualification part is the gate, not seat-time.
- Path: `mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts`
- Exports: `MachineDomain` type; PII-free, Object.frozen returns, R12 fail-loud, idempotent registration

### BusinessIntelligenceEngine.ts
Cost/benefit decision engine (48K). Make-vs-buy, upgrade-vs-outsource, capital-investment justification (ROI/NPV/payback), capacity planning, cost-driver, and break-even analysis. Every decision carries full financial justification plus sensitivity analysis and risk assessment.
- Path: `mcp-server/src/engines/BusinessIntelligenceEngine.ts`
- Exports: `AnalysisType`, `CostCategory`, `MakeOption` (make-vs-buy input)

### CustomerPortalEngine.ts
Token-based external customer portal (41K), durable. Gives customers access to quotes/orders/milestones/quality-docs/messaging with NO PRISM account via scoped, time-limited, rate-limited, revocable cryptographic tokens (base64url 32 bytes). As of U-HOTEL-PORTAL-PERSISTENCE the four durable record types (tokens/messages/quality-docs/service-cases) are SQLite-WAL persisted (modeled on juliett's CoordinationStoreEngine); rate buckets stay in-memory on purpose.
- Path: `mcp-server/src/engines/CustomerPortalEngine.ts`
- Exports: `PortalTokenType`; actions `portal_create_token|revoke_token|list_tokens|quote_view|order_status|quote_respond|documents|document_download|messages|send_message`

### ComplianceEngine.ts
Compliance-as-code (41K, feature F8). Manages regulatory-compliance templates, auto-provisions hooks (F6), configures certificates (F4), runs compliance audits, resolves multi-template conflicts, and keeps append-only audit logs. Explicitly ADDITIVE -- S(x)>=0.70 enforcement and Omega gates operate independently; compliance never gates. Carries the extracted-JS quality-engine catalog (`QUALITY_SOURCE_FILE_CATALOG`).
- Path: `mcp-server/src/engines/ComplianceEngine.ts`
- Exports: `QUALITY_SOURCE_FILE_CATALOG`; depends on `NLHookEngine`, `CertificateEngine`

### GeneralLedgerEngine.ts
Double-entry bookkeeping core (35K) for the ERP layer. Standard manufacturing chart of accounts + balanced journal entries + structured recorders (`recordInvoice/recordPayment/recordPurchase/recordPayroll/recordWipToCogs/createJournalEntry`) + derived statements (`getTrialBalance/getIncomeStatement/getBalanceSheet`). Enforces every-entry-balances, trial-balance-balances, and the accounting equation. Persists to `state/shared/general-ledger-state.json` (schemaVersion 1, atomic write).
- Path: `mcp-server/src/engines/GeneralLedgerEngine.ts`
- Exports: `AccountType`, `NormalBalance`, `Account`; refs FASB ASC + Machinery's Handbook 31st

### CustomerManagementEngine.ts
CRM for job shops (34K). Customer records, credit limits, pricing tiers, communication log, win/loss tracking, sales pipeline. Includes a `CreditReview` desk row (shop's view of a customer's credit posture: limit/balance/utilization/over-limit), operator-only (credit routes are verifyToken-gated, no anon-leak concern).
- Path: `mcp-server/src/engines/CustomerManagementEngine.ts`
- Exports: `Customer`, `CreditReview`; backed by `persistenceBridge`

### LegalComplianceOperatingEngine.ts
Legal/compliance operating layer (34K, SQ4-2-LEGAL) covering 6 domains missing from ComplianceEngine/IndustryStandardsComplianceEngine: NDA lifecycle, export control (ITAR/EAR + denied-party screening + license tracking), document retention (legal hold + destruction scheduling), queryable audit trail, OSHA safety (incident tracking + OSHA 300 log), and certification tracking (AS9100/ISO 13485/NADCAP). In-memory with append-only audit logging.
- Path: `mcp-server/src/engines/LegalComplianceOperatingEngine.ts`
- Exports: `NDA`, `ExportClassification`

### ERPIntegrationEngine.ts
Central ERP/MES integration engine (32K, R9-MS4). Work-order import -> PRISM plan, tool-inventory sync (filter recs by stock), cost feedback (estimated vs actual), quality-data import, job-routing export with PRISM cycle times. Bridges ShopConfigurationEngine costing params (with `_SHOP_DEFAULTS` fallback) and the physics layer (`resolveMaterial`); actual vendor APIs (JobBOSS/Epicor/SAP) are deployment-time.
- Path: `mcp-server/src/engines/ERPIntegrationEngine.ts`
- Exports: ERP data-mapping logic; composes ShopConfigurationEngine + physics/constants

### CustomerMaterialMapEngine.ts
Learned customer->material distribution map (31K, U-PPL-C2). Replaces the hardcoded "shop tribal knowledge" customer->material lookup with a learned map from three evidence sources: filename alloy-code heuristics, back-annotated print material (~57% coverage via JMDieArchiveBackAnnotationEngine), and customer-folder fallback. Output is a per-customer DISTRIBUTION (not a single material) since a customer runs multiple part families. Composes (not forks) MATERIAL_KEYWORDS + canonical ISOGroup.
- Path: `mcp-server/src/engines/CustomerMaterialMapEngine.ts`
- Exports: per-customer material distribution; imports MATERIAL_KEYWORDS from MaterialResolverForProgramsEngine

### EmployeeEngine.ts
HR foundation (30K). Employee master data, skills, certifications, labor rates -- the base that TimeClockEngine, PayrollEngine, and ActualCostEngine all depend on. Seeds from `jm-die-employees.ts`, backed by persistenceBridge, and carries overtime policy / shift differential / clearance-level (`shop_floor|lead|hr_manager|admin`) + machine-authority-scope types.
- Path: `mcp-server/src/engines/EmployeeEngine.ts`
- Exports: `ClearanceLevel`, `MachineAuthorityScope`, `OvertimePolicy`, `ShiftDifferential`, `Employee`

### AccountingHardeningEngine.ts
Finance hardening (28K, SQ4-3-ACCT) filling gaps GeneralLedgerEngine does not cover: bank reconciliation (auto-match bank txns to GL), WIP valuation (3 methods), variance analysis (price/quantity/mix decomposition), cost-to-complete (EAC/ETC forecasting), multi-period compare, and QuickBooks Online sync. Composes GeneralLedgerEngine for GL data.
- Path: `mcp-server/src/engines/AccountingHardeningEngine.ts`
- Exports: `BankTransaction`, `GLEntry`; refs GAAP ASC 330/606/450, Horngren, PMBOK 7th

### IndustryStandardsComplianceEngine.ts
Standards-conformance checker (28K). Validates parts/processes against ISO 2768, ISO 1302, AS9100, ISO 13485, IATF 16949, DIN 65151, ISO 14644. Methods: `checkCompliance`, `getRequirements`, `suggestStandards` (ranks applicable standards for a material/process/application).
- Path: `mcp-server/src/engines/IndustryStandardsComplianceEngine.ts`
- Exports: `IndustryType`, `PartSpec`, `ComplianceCheckInput`, `StandardCheck`, `NonConformance`

### BillingEngine.ts
SaaS billing for multi-tenant PRISM (25K). Subscription plans (free/shop/team/enterprise), usage-based tiered post pricing, checkout session lifecycle, one-time top-ups, HMAC-SHA256-verified webhooks, and stats (MRR/ARR/churn/MTD). Returns Stripe-shaped objects with ZERO network calls (a future StripeAdapterEngine wraps it) so business logic stays the source of truth. Persists `state/shared/billing-state.json` (schemaVersion 1, atomic).
- Path: `mcp-server/src/engines/BillingEngine.ts`
- Exports: plan/post-price catalog; webhook signature `t=<ts>,v1=<hmac>` (5-min replay window)

### JobTravelerEngine.ts
E2-style job traveler (25K, U-TRAV1). Ordered routing steps with dual time tracking (setup + cycle per operation): Op 10 Saw -> Op 20 Mill -> Op 30 Inspect. Explicitly NOT a duplicate of JobLifecycleEngine (13-state lifecycle) or TimeClockEngine (shift/job-level labor) -- this is per-operation routing granularity. Integrates JobLifecycleEngine (status) + ActualCostEngine (variance) + pipeline outcome bus.
- Path: `mcp-server/src/engines/JobTravelerEngine.ts`
- Exports: `RoutingStepStatus`, `RoutingStep`; actions `traveler_create|start_setup|start_cycle|complete_step|get_active|get|scan`; DB migration 006

## Full engine index

| Engine | Category | One-line |
|---|---|---|
| GeneralLedgerEngine.ts | Accounting | Double-entry GL, chart of accounts, financial statements (debits===credits enforced) |
| AccountingHardeningEngine.ts | Accounting | Bank-reconcile, WIP valuation, variance, cost-to-complete, QuickBooks sync |
| ChartOfAccountsEngine.ts | Accounting | Manufacturing chart-of-accounts registry (name-derived) |
| LedgerProjectorEngine.ts | Accounting | Projected/forecast ledger state (name-derived) |
| ActualCostEngine.ts | Accounting | Estimated-vs-actual cost capture (name-derived) |
| JobCostingEngine.ts | Accounting | Per-job cost rollup (name-derived) |
| JobProfitabilityWaterfallEngine.ts | Accounting | Per-job profit waterfall (name-derived) |
| CostEstimationEngine.ts | Accounting | Cost estimation (name-derived) |
| FreightCostEngine.ts | Accounting | Freight cost (name-derived) |
| ImportCostEngine.ts | Accounting | Import/landed cost (name-derived) |
| ToolCostPerPartEngine.ts | Accounting | Per-part tool cost (name-derived) |
| CostEfficiencyBridgeEngine.ts | Accounting | Cost-efficiency bridge/telemetry (name-derived) |
| CostSavingsTrackerEngine.ts | Accounting | Cost-savings tracking (name-derived) |
| CostAlarmEngine.ts | Accounting | Cost threshold alarms (name-derived) |
| BillingEngine.ts | Billing | SaaS subscription + usage-tiered post pricing + Stripe-shaped webhooks |
| StripeBillingEngine.ts | Billing | Stripe adapter layer (name-derived) |
| InvoicingEngine.ts | Billing | Invoice generation (name-derived) |
| CustomerStatementEngine.ts | Billing | AR customer statements (name-derived) |
| FinanceChargeDunningEngine.ts | Billing | Finance charges + dunning workflow (name-derived) |
| EmployeeEngine.ts | HR | Employee master data, skills, certs, labor rates (HR foundation) |
| EmployeeMachineDomainAcademyEngine.ts | HR | (role x machine-domain) x tier training, Cpk-gated qualification bridge |
| EmployeePayrollGrossPayEngine.ts | HR | FLSA gross-pay compute (name-derived) |
| PayrollEngine.ts | HR | Payroll run (name-derived) |
| PayrollLiabilityFilingEngine.ts | HR | Payroll tax liability filing (name-derived) |
| EmployeePTOAccrualEngine.ts | HR | PTO accrual balance (name-derived) |
| EmployeeBenefitsEnrollmentEngine.ts | HR | Benefits enrollment (name-derived) |
| EmployeeExpenseReimbursementEngine.ts | HR | Expense reimbursement (name-derived) |
| EmployeeTimeClockEngine.ts | HR | Shift/job clock in-out (name-derived) |
| EmployeeShiftScheduleEngine.ts | HR | Shift scheduling (name-derived) |
| EmployeeShiftSwapEngine.ts | HR | Qualification-gated shift swap (name-derived) |
| EmployeeTaskHandoffEngine.ts | HR | Qualification-gated task handoff (name-derived) |
| EmployeeMultiJobConcurrencyEngine.ts | HR | Multi-job concurrency tracking (name-derived) |
| EmployeeShopFloorMobileEngine.ts | HR | Shop-floor mobile surface (name-derived) |
| EmployeePerformanceFeedbackEngine.ts | HR | Performance feedback (name-derived) |
| EmployeeRoleAcademyInjectionEngine.ts | HR | Generic role-academy track injection (name-derived) |
| EmployeeDailyDigestEngine.ts | HR | Per-employee daily digest (name-derived) |
| EmployeeWizardBridgeEngine.ts | HR | Employee<->wizard bridge (name-derived) |
| EmployeePerOpPartTrackerEngine.ts | HR | Per-operation part tracker (name-derived) |
| EmployeePerMachineSFAdaptiveEngine.ts | HR | Per-machine speed/feed adaptive tracker (name-derived) |
| EmployeeInsertSideTrackerEngine.ts | HR | Per-insert-side usage tracker (name-derived) |
| CustomerManagementEngine.ts | CRM | CRM: records, credit limits, pricing tiers, pipeline, credit review |
| CustomerPortalEngine.ts | CRM | Token-based external customer portal, SQLite-WAL persisted |
| CustomerMaterialMapEngine.ts | CRM | Learned customer->material distribution map |
| CustomerKnowledgeEngine.ts | CRM | Per-customer knowledge store (name-derived) |
| CustomerPortfolioMinerEngine.ts | CRM | Customer portfolio mining (name-derived) |
| CustomerComplaintIntakeEngine.ts | CRM | Customer complaint intake (name-derived) |
| ProspectiveCustomerEngine.ts | CRM | Prospect/lead management (name-derived) |
| BuyerAccountEngine.ts | CRM | Buyer account model (name-derived) |
| CrossCustomerPolicyTransferEngine.ts | CRM | Cross-customer policy transfer (name-derived) |
| ERPIntegrationEngine.ts | ERP | Central ERP/MES bridge (JobBOSS/Epicor/SAP mapping) |
| MultiERPConnectorEngine.ts | ERP | Unified IERPConnector: E2/Epicor-Kinetic/ProShop/CSV adapters |
| ERPWorkOrderEngine.ts | ERP | ERP work-order ingest (name-derived) |
| ERPCostFeedbackEngine.ts | ERP | 5-category estimated-vs-actual cost feedback (name-derived) |
| ERPQualityEngine.ts | ERP | ERP quality/SPC ingest (name-derived) |
| ERPToolInventoryEngine.ts | ERP | Tool-inventory sync + reorder-point alerts (name-derived) |
| ERPImportEngine.ts | ERP | ERP import layer (name-derived) |
| JMDieErpSimulationEngine.ts | ERP | JM Die ERP simulation (name-derived) |
| JobTravelerEngine.ts | Job/Sched | E2-style op-routing traveler (setup+cycle dual time) |
| JobLifecycleEngine.ts | Job/Sched | 13-state job lifecycle state machine (name-derived) |
| JobShopSchedulingEngine.ts | Job/Sched | Job-shop scheduling (name-derived) |
| JobRoutingTemplateEngine.ts | Job/Sched | Routing template registry (name-derived) |
| JobDeskAggregatorEngine.ts | Job/Sched | Job desk aggregation (name-derived) |
| AutomatedJobSchedulerEngine.ts | Job/Sched | Automated job scheduler (name-derived) |
| CapacityPlanningEngine.ts | Job/Sched | Capacity planning (name-derived) |
| CapacityMonteCarloEngine.ts | Job/Sched | Monte-Carlo capacity simulation (name-derived) |
| EngineeringChangeOrderEngine.ts | Job/Sched | Engineering change order (ECO) workflow (name-derived) |
| VendorEngine.ts | Procurement | Vendor master (name-derived; charlie-overlap) |
| VendorCreditEngine.ts | Procurement | Vendor credit terms (name-derived; charlie-overlap) |
| VendorPerformanceTrackerEngine.ts | Procurement | Vendor performance tracking (name-derived; charlie-overlap) |
| VendorQuoteToPurchaseOrderEngine.ts | Procurement | Vendor quote->PO conversion (name-derived; charlie-overlap) |
| VendorUnitPriceEngine.ts | Procurement | Vendor unit pricing (name-derived; charlie-overlap) |
| VendorCostIndexEngine.ts | Procurement | Vendor cost index (name-derived; charlie-overlap) |
| VendorRegionEngine.ts | Procurement | Vendor region resolution (name-derived; charlie-overlap) |
| LocationAwareVendorPricingEngine.ts | Procurement | Location-aware vendor pricing (name-derived; charlie-overlap) |
| VendorRealtimePricingClientEngine.ts | Procurement | Realtime vendor pricing client (name-derived; charlie-overlap) |
| VendorCatalogImportEngine.ts | Procurement | Vendor catalog import (name-derived; charlie-owned extraction) |
| VendorCatalogManifestEngine.ts | Procurement | Vendor catalog manifest (name-derived; charlie-owned extraction) |
| VendorTurningCatalogExtractorEngine.ts | Procurement | Turning-tool catalog extractor (name-derived; charlie-owned) |
| JMCustomerVendorDatabaseEngine.ts | Procurement | JM Die customer/vendor database (name-derived) |
| ComplianceEngine.ts | Compliance | Compliance-as-code: templates, hooks, audits, append-only log (additive) |
| LegalComplianceOperatingEngine.ts | Compliance | NDA/export-control/retention/OSHA/cert-tracking operating layer |
| IndustryStandardsComplianceEngine.ts | Compliance | ISO 2768/1302, AS9100, ISO 13485, IATF 16949 part checks |
| PIIComplianceEngine.ts | Compliance | PII compliance/redaction (name-derived) |
| ISO9001QMSEngine.ts | Compliance | ISO 9001 QMS (name-derived) |
| ITARComplianceTaggerEngine.ts | Compliance | ITAR compliance tagger (name-derived) |
| OSHAComplianceEngine.ts | Compliance | OSHA compliance (name-derived) |
| HRComplianceEngine.ts | Compliance | HR compliance alerts (name-derived) |
| CAPAWorkflowEngine.ts | Compliance | CAPA corrective-action workflow (name-derived) |
| KaizenLeanSigmaEngine.ts | Compliance | Kaizen / Lean Six Sigma (name-derived) |
| LOTOLogEngine.ts | Compliance | Lockout-tagout log (name-derived) |
| AuditManagerEngine.ts | Audit | Audit manager (name-derived) |
| ConsensusAuditLogEngine.ts | Audit | Consensus audit log (name-derived) |
| DepartmentAuditDashboardEngine.ts | Audit | Department audit dashboard (name-derived) |
| InternalAuditCalendarEngine.ts | Audit | Internal audit calendar (name-derived) |
| OperatorActionAuditTrailEngine.ts | Audit | Operator action audit trail (name-derived) |
| BusinessIntelligenceEngine.ts | BI | Make-vs-buy, capital-investment ROI/NPV, break-even, capacity |
| BusinessDocumentExtractorEngine.ts | BI | Business document extraction (name-derived) |
| BusinessSyncEngine.ts | BI | Worst-status-wins sync aggregation (restored from exFAT stub; name-derived) |
| DocustrataAccountingBridgeEngine.ts | BI | DocuStrata->accounting bridge (name-derived) |
| DocustrataCustomerIndexEngine.ts | BI | DocuStrata customer index (name-derived) |
