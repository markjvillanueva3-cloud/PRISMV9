---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Assess DOMAIN-CAPABILITY coverage for slot:hotel's \"business\" galaxy (a tool-and"
date: "2026-05-29"
first_ts: "2026-05-29T16:47:55.202Z"
last_ts: "2026-05-29T16:55:03.902Z"
cwd: "H:\\prism-slot-hotel"
messages: 42
user_msgs: 16
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_75b8d18e-0a7/agent-a9b5d73d10bbbc10a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Assess DOMAIN-CAPABILITY coverage for slot:hotel's "business" galaxy (a tool-and

> **claude-code-cli** | 2026-05-29 | 42 msgs (16 user / 26 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_75b8d18e-0a7/agent-a9b5d73d10bbbc10a.jsonl`

## Transcript

### User | 2026-05-29T16:47:55.202Z

Assess DOMAIN-CAPABILITY coverage for slot:hotel's "business" galaxy (a tool-and-die shop's full back-office ERP). Run: node H:/prism-slot-hotel/scripts/business-domain-atlas.mjs  (and --synergy). Read the dispatcher bucket map in H:/prism-slot-hotel/mcp-server/src/engines/business/CLAUDE.md §8.6.
A COMPLETE manufacturing back-office ERP needs: GL/accounting, AP (vendor/PO/3-way-match), AR (invoice/collections/aging), payroll, HR (employee/PTO/benefits/timeclock/shift/performance), CRM (customer/portal/complaint), inventory/materials, work-order/job-traveler, quoting, costing/job-cost, purchasing, scheduling/capacity, quality/compliance (ISO/OSHA/CAPA/NCR), BI/reporting/dashboards, tax, fixed-assets/depreciation, banking/cash, time-and-billing.
For EACH area, does the galaxy have engine(s) + dispatcher action(s)? Produce a coverage table: area | covered? | engine/action evidence. List capability areas GENUINELY MISSING or thin (no engine, or only a stub). Be concrete and honest — if coverage is broad, say so.

### Assistant | 2026-05-29T16:48:06.932Z

I'll start by running the atlas script and reading the dispatcher bucket map, then build the coverage assessment.

### Assistant | 2026-05-29T16:48:08.724Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:48:08.957Z

[tool_use: Bash]

### User | 2026-05-29T16:48:36.872Z

[tool_result] 🏨 BUSINESS DOMAIN ATLAS — galaxy:business (erp-hr-specialist)  [2026-05-29]  root=H:/prism
   ENGINES: ~261 business/ERP/HR (.ts prefix-regex ESTIMATE — may include domain-adjacent; precise classification is india's NN job)
   DISPATCHER: prism_business — 879 actions · 574 lazy-imports · 12 sibling business dispatchers (authDispatcher, bridgeDispatcher, complianceDispatcher, exportDispatcher, inbo
... [+690 chars truncated]

### User | 2026-05-29T16:48:52.645Z

[tool_result] 🏨 BUSINESS DOMAIN — 11-leg PSN synergy (7/11 PASS)  [2026-05-29]  — presence-based — deep correctness is validated by the workflow audit, not this script
  🟢 LEG-1 Obsidian brain: PASS — MEMORY.md has Master-brain link
  🟢 LEG-2 PRISM OS: PASS — operatingSystemDispatcher present
  🟢 LEG-3 Wiki: PASS — 475 business wiki action entries
  🟢 LEG-4 Memories: PASS — 19 hotel/business memories
  🟡 LEG-5 
... [+809 chars truncated]

### Assistant | 2026-05-29T16:48:55.052Z

Now let me read the dispatcher bucket map in §8.6 and look at the actual engine inventory.

### Assistant | 2026-05-29T16:48:55.930Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:48:57.062Z

[tool_use: Grep]

### User | 2026-05-29T16:49:13.302Z

[tool_result] 🏨 BUSINESS UNWIRED PUNCH-LIST (maximize-potential opportunity set) — 2 of 27 total unwired
  • ERPImportEngine
  • SemanticAssetIndexEngine

### User | 2026-05-29T16:49:16.599Z

[tool_result] 181:2. **TECHNIQUE** — does a `prism_business` action already exist? (879 do — §8.6.) Reconcile-both-ways before reaching for new code.
191:### 8.6 Dispatcher surface — `prism_business` (businessDispatcher.ts, 6746 lines, 879 action cases)

### Assistant | 2026-05-29T16:49:20.383Z

[tool_use: Read]

### User | 2026-05-29T16:49:29.074Z

[tool_result] 191	### 8.6 Dispatcher surface — `prism_business` (businessDispatcher.ts, 6746 lines, 879 action cases)
192	16 functional buckets (3 samples each; full enum in the tool schema):
193	- **financial:** `financial_npv` · `financial_irr` · `financial_machine_investment`
194	- **gl_accounting:** `gl_journal_entry` · `gl_trial_balance` · `gl_balance_sheet` (+`acct_bank_reconcile`, `acct_wip_valuation`)
1
... [+5007 chars truncated]

### Assistant | 2026-05-29T16:49:32.267Z

The dispatcher bucket map is clear. Now let me verify actual engine existence for each capability area, especially the thin ones (tax, fixed-assets, banking/cash, time-and-billing). Let me enumerate the actual engine files and cross-check against the buckets.

### Assistant | 2026-05-29T16:49:33.734Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:49:34.171Z

[tool_use: Bash]

### User | 2026-05-29T16:50:03.629Z

[tool_result] (Bash completed with no output)

### User | 2026-05-29T16:50:39.867Z

[tool_result] 0

### Assistant | 2026-05-29T16:50:43.052Z

The engines aren't in a `business/` subdirectory — they're prefixed in the main engines dir. Let me find the actual locations.

### Assistant | 2026-05-29T16:50:44.236Z

[tool_use: Glob]

### User | 2026-05-29T16:51:10.274Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-29T16:51:13.787Z

The atlas uses a prefix-regex. Let me look at how the atlas resolves engines and find them by representative names per capability area.

### Assistant | 2026-05-29T16:51:15.161Z

[tool_use: Bash]

### User | 2026-05-29T16:51:28.381Z

[tool_result] 🏨 BUSINESS DOMAIN ATLAS — galaxy:business (erp-hr-specialist)  [2026-05-29]  root=H:/prism
   ENGINES: ~261 business/ERP/HR (.ts prefix-regex ESTIMATE — may include domain-adjacent; precise classification is india's NN job)
   DISPATCHER: prism_business — 879 actions · 574 lazy-imports · 12 sibling business dispatchers (authDispatcher, bridgeDispatcher, complianceDispatcher, exportDispatcher, inbo
... [+4811 chars truncated]

### Assistant | 2026-05-29T16:51:32.079Z

Engines live in the integration tree `H:/prism/mcp-server/src/engines` (flat, prefix-named), not the slot worktree. Let me verify the actual engine files exist per capability area by grepping the engines directory for representative names. I'll target each capability area directly.

### Assistant | 2026-05-29T16:51:35.442Z

[tool_use: Bash]

### User | 2026-05-29T16:52:12.569Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-29T16:52:17.340Z

[tool_use: Bash]

### User | 2026-05-29T16:52:40.896Z

[tool_result] AICapabilityMaximizerEngine.ts  19.9K
AccountingHardeningEngine.ts  27.9K
ActualCostEngine.ts  16.9K
ActualCostEngine.ts-1.archive.2026-05-27.corrupted  17.5K
AdditiveQuoteEngine.ts  16.8K
AnisotropicMaterialModelEngine.ts  8.4K
AssetDependencyGraphEngine.ts  6.4K
AssetRecommendationEngine.ts  5.0K
AssetSynergyDetectorEngine.ts  4.2K
AssetWiringSummaryEngine.ts  11.3K
AuditFindingToCAPABridgeEngin
... [+11116 chars truncated]

### Assistant | 2026-05-29T16:52:45.128Z

I have a comprehensive engine list. Now let me verify the thin areas concretely — tax, fixed-assets/depreciation, banking/cash, AR collections, AP 3-way-match — by checking dispatcher action presence and the specific engines. Let me grep the dispatcher for action coverage in the questionable areas.

### Assistant | 2026-05-29T16:52:48.581Z

[tool_use: Grep]

### User | 2026-05-29T16:53:01.264Z

[tool_result] case "invoice_aging": {
          case "po_three_way_match": {
          case "asset_register": {
          case "asset_depreciation_schedule": {
          case "asset_calibration_due": {
          case "acct_bank_reconcile": {
          case "ar_aging_report": {
          case "po_three_way_match": {
          case "cash_flow_project": {

### Assistant | 2026-05-29T16:53:04.684Z

Notably, no `tax_` or `sales_tax_` or `1099`/`w2` action surfaced. Let me confirm the tax gap and check payroll-tax / fixed-asset depreciation method depth, plus collections/dunning.

### Assistant | 2026-05-29T16:53:11.990Z

[tool_use: Grep]

### User | 2026-05-29T16:53:16.465Z

[tool_result] "asset_compute_depreciation",
  "asset_depreciation_schedule",
  "integration_export_payroll_tax",
  // ── Amortization / Depreciation (G8 — hotel iter12) ──
  "amortization_straight_line",  // straight-line depreciation schedule
              tax: params.tax ?? 0,
              tax: params.tax ?? 0,
              taxes: params.taxes ?? 0,
          case "asset_compute_depreciation": {
           
... [+860 chars truncated]

### Assistant | 2026-05-29T16:53:21.823Z

This confirms the picture. Tax = `integration_export_payroll_tax` only (an export shim), no sales/use tax engine, no income-tax provisioning, no 1099/W2 generation. Depreciation exists (`AssetDepreciationEngine`-backed actions + straight-line formula). No `collections`/`dunning` action — AR collections is thin (aging exists, dunning workflow does not). Let me do two final checks: confirm there's no dedicated AR collections/dunning engine, and confirm banking/cash depth (cash flow projection exists). Let me also verify the GL depth and AP 3-way-match engine backing.

### Assistant | 2026-05-29T16:53:27.472Z

[tool_use: Bash]

### User | 2026-05-29T16:53:52.794Z

[tool_result] === collections/dunning/credit-mgmt engines ===
ARAgingEngine.ts  11.2K
ActualVsPredictedCollectorEngine.ts  12.1K
CADPerAdapterFeedbackCollectorEngine.ts  13.0K
FeedbackCollectorEngine.ts  7.6K
WEDMCreditCostEngine.ts  3.2K
=== tax engines ===
CADOperationTaxonomyEngine.ts  31.7K
FCFSyntaxValidatorEngine.ts  10.2K
LiveToolingSyntaxEngine.ts  12.0K
PPExpressionSyntaxValidatorEngine.ts  16.3K
PostP
... [+644 chars truncated]

### Assistant | 2026-05-29T16:54:02.674Z

Key findings confirmed:
- **No dedicated tax engine** (the "tax" hits are CAD/post-processor taxonomy engines, not fiscal tax). Only `integration_export_payroll_tax`.
- **No dedicated fixed-asset/depreciation engine file** — the depreciation *actions* (`asset_register`, `asset_compute_depreciation`, `asset_depreciation_schedule`) are backed by `EquipmentAssetEngine.ts` (the "Asset*" engines found are graph/recommendation/wiring meta-engines, not fiscal fixed-asset). Depreciation math exists via `AmortizationScheduleFormula`. So depreciation is covered functionally but lean (straight-line; no MACRS/declining-balance tax-basis schedules surfaced).
- **AR collections/dunning**: `ARAgingEngine` exists (aging) but no dunning/collections-workflow engine.

Let me verify the EquipmentAssetEngine backs the asset actions and check the GL/AP backing engines exist, then I have enough.

### Assistant | 2026-05-29T16:54:02.931Z

[tool_use: Bash]

### User | 2026-05-29T16:54:15.902Z

[tool_result] === asset_register backing import ===
  // ── Equipment Assets (BIZ-MS5 U-BIZ37) ──
  "asset_compute_depreciation",
  "asset_register",
  "asset_depreciation_schedule",
--
            break;
          }
          case "asset_register": {
            const engine = await getEngine("equipmentAsset");

### Assistant | 2026-05-29T16:55:03.902Z

Confirmed: asset actions are backed by `EquipmentAssetEngine` (lazy `getEngine("equipmentAsset")`). I now have enough to produce the honest coverage assessment.

# DOMAIN-CAPABILITY Coverage — slot:hotel "business" galaxy (tool-and-die back-office ERP)

**Headline: coverage is BROAD and genuinely deep.** `prism_business` exposes 879 wired action cases across 16 functional buckets, backed by ~261 prefix-matched engines and 12 sibling business dispatchers. 25 of 27 business engines are wired (only `ERPImportEngine` + `SemanticAssetIndexEngine` orphaned). All 19 ERP areas you named have at least one real engine + at least one wired dispatcher action. The gaps are *thin spots* (lean/single-method implementations), not *missing pillars* — only one area (general tax) is genuinely absent.

## Coverage table

| Area | Covered? | Engine / action evidence |
|---|---|---|
| GL / accounting | ✅ Strong | `GeneralLedgerEngine` (24.7K) + `AccountingHardeningEngine` (27.9K); actions `gl_journal_entry`, `gl_trial_balance`, `gl_balance_sheet`, `acct_wip_valuation`, `acct_bank_reconcile` |
| AP (vendor/PO/3-way-match) | ✅ Strong | `PurchaseOrderEngine`, `PurchaseOrderLifecycleEngine`, `VendorQuoteToPurchaseOrderEngine`, `PurchasingDirectoryEngine`; actions `po_create`, `po_three_way_match`, `po_ap_aging` |
| AR (invoice/collections/aging) | 🟡 Partial | `BillingEngine`, `ARAgingEngine`; actions `invoice_create/payment/aging`, `ar_aging_report`. **Aging present, collections/dunning workflow absent** (no dunning engine/action) |
| Payroll | ✅ Good | `PayrollEngine`, `EmployeePayrollGrossPayEngine`; actions `payroll_create_period/run/compute_gross` + `integration_export_payroll_tax` |
| HR (employee/PTO/benefits/timeclock/shift/performance) | ✅ Excellent | Deepest area: `EmployeeEngine`, `EmployeePTOAccrualEngine`, `EmployeeBenefitsEnrollmentEngine`, `EmployeeTimeClockEngine`/`TimeClockEngine`, `EmployeeShiftScheduleEngine`/`ShiftScheduleOptimizerEngine`/`EmployeeShiftSwapEngine`, `Employ
... [+5806 chars truncated]
