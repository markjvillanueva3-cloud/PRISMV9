# HOTEL — Shop-Operations Gap Matrix & Build Plan (2026-05-25)

**Slot:** hotel (ERP+HR specialist, JULIETT-12CHAT-ALLOCATION)
**Goal:** *Deep research on what's missing from the software suite that a shop needs to operate efficiently, effectively, and safely — including OSHA, ISO certification, full accounting from Docustrata, self-learning optimization algorithms, and synergy across PRISM app + PSN + /system-viz.*
**Method:** Compose existing capability where possible (R8 read-before-write); identify true gaps; build the highest-ROI atoms.

---

## Executive summary

PRISM has **substantial existing coverage** across all 5 axes. The truly-missing pieces are a small set of high-leverage atoms. The pattern: **wire-don't-build** where engines already exist, **build-then-wire** for true gaps.

| Axis | Coverage today | Gap density | Priority |
|---|---|---|---|
| A — OSHA compliance | ~70% (OSHAComplianceEngine has incident + 300/300A + PPE; near-miss as enum) | LOTO log, SDS library, training records | P1 |
| B — ISO certification | ~50% (have 13485 + AS9100 + CAPA + IndustryStandards; missing canonical 9001 for general die shop) | ISO 9001 QMS, internal-audit calendar, mgmt-review record | P0 (JM Die is a general die shop) |
| C — Real-time accounting | ~85% (GL/AR/AP/Payroll/Customer/JobCosting all exist; Docustrata ingest exists) | Docustrata→AP→GL bridge | P0 |
| D — Self-learning optimization | ~25% (manual ShopRates input, no learning loop) | Actual-vs-predicted ledger + adaptive shop-rate | P0 |
| E — PSN + system-viz synergy | ~60% (business/erp/hr roosts partial) | ghost-roost for ops-safety + accounting | P2 |

**Highest-impact gaps (P0):**
1. `BurdenRateEngine` was a `$0` stub — **SHIPPED iter1** (replaces decade-blocker for every cost calculation).
2. ISO 9001 QMS engine — JM Die is general die work; current ISO suite covers medical + aero only.
3. Docustrata → AP → GL real-time bridge — ingest + extractors + GL all exist; the bridge is the missing link.
4. Self-learning shop-rate optimizer — closes the actual-vs-predicted loop the current static `ShopRates` input ignores.

---

## Axis A — OSHA Compliance

### What exists (verified)

- **`OSHAComplianceEngine`** (BIZ-MS5/U-BIZ40) — `OSHAIncident` record with `injury_type ∈ {injury, illness, near_miss, property_damage}`, `body_part_affected`, `days_away`, `days_restricted`, `medical_treatment` enum, `recordable` flag, witnesses, corrective_actions. PPE assignment tracking.
- Graph nodes: `osha-300-log`, `osha-300a-summary`, `osha-create-incident` already built.
- `EmployeeShopFloorMobileEngine.W4` — DNC safety check + machine safety check actions on `prism_shop`.
- `HRComplianceEngine` — HR compliance scaffold.

### True gaps

| Gap | Why it's needed | Engine to build | Wire location |
|---|---|---|---|
| **LOTO (Lockout/Tagout) log** | OSHA 29 CFR 1910.147 mandate; required for any machine maintenance | `LOTOLogEngine` — checkout/lockout/verify/clear states + audit chain | `prism_business`: `loto_*` actions (5) |
| **SDS Library** | OSHA HazCom 29 CFR 1910.1200; every chemical in shop needs an SDS readable on demand | `SDSLibraryEngine` — index, search-by-chemical, expiration tracking | `prism_business`: `sds_*` actions (4) |
| **Safety Training Records** | OSHA general-duty clause + ISO 9001 §7.2 competency | `SafetyTrainingRecordEngine` — completion + expiration + retraining-due | `prism_business`: `training_*` actions (5) |
| **OSHA 301 Incident Detail** | 300-log is summary; 301 is the per-incident detailed form. Already half-supported by OSHAIncident record — needs explicit 301-form generator. | Method on OSHAComplianceEngine: `generate301Form(incidentId)` | `prism_business`: `osha_generate_301` |

### Algorithms / formulas

- **DART rate** (Days Away/Restricted/Transferred) = (incidents_with_days_away + incidents_with_restricted_days) × 200,000 / total_hours_worked
- **TRIR** (Total Recordable Incident Rate) = (recordable_incidents × 200,000) / total_hours_worked
- **LWDII** = (lost_work_day_cases × 200,000) / total_hours_worked
- **Severity Rate** = days_lost × 200,000 / total_hours_worked
- Industry benchmark BLS-NAICS-3327 (machine shops): TRIR < 3.3 = above-median

These formulas should drive a `SafetyKPIEngine` (planned U-SAFETY-KPI).

---

## Axis B — ISO Certification

### What exists (verified)

- `ISO13485QMSEngine` — medical-device QMS validator (covers §4.2.3 MDF, §7.3 design, §7.5.2 cleanliness, §7.5.5 sterilization, §7.5.7 UDI, §8.2.1 PMS, §8.5.2 advisory notices)
- `AS9100TraceabilityEngine` — aerospace traceability (§8.5.2, §8.6, §7.5); createRecord, updateMaterial, addOperation, addInspection, addDocument, generateCofC, validateChain, auditReport
- `CAPAWorkflowEngine` — full CAPA states (opened → investigating → action_planned → action_implemented → effectiveness_check → closed | escalated) with dwell-time gating per FDA 21 CFR 820.100 + ISO 13485 §8.5.2
- `IndustryStandardsComplianceEngine` — covers ISO 2768, 1302, AS9100, ISO 13485, IATF 16949, DIN 65151, ISO 14644
- `CertificationTrackingEngine` — material/tool/machine cert tracking
- `ITARComplianceTaggerEngine` — ITAR
- `NISTAIRMFComplianceEngine` — NIST AI RMF
- `LegalComplianceOperatingEngine` — legal compliance
- Ghost-pending: `PPG-MS20 Compliance Spine` (AS9100 + NADCAP + ITAR + CFR Part 11 + ISO 13485)

### True gaps

| Gap | Why it's needed | Engine to build |
|---|---|---|
| **ISO 9001:2015 QMS engine** | JM Die is a *general* die shop. Current suite has 13485 (medical) + AS9100 (aero) but NOT 9001 (the baseline standard JM Die actually needs for cert). | `ISO9001QMSEngine` — covers §4 context, §5 leadership, §6 planning, §7 support, §8 operation, §9 performance evaluation, §10 improvement |
| **Internal-audit calendar** | ISO 9001 §9.2 requires planned internal audits at planned intervals | `InternalAuditCalendarEngine` — schedule, scope, lead-auditor, findings ledger |
| **Management-review record** | ISO 9001 §9.3 requires top-management review with documented inputs/outputs | `ManagementReviewEngine` — agenda templates, attendees, action items |
| **Document Control (Quality Manual + WIs + SOPs)** | ISO 9001 §7.5 controlled documents — revision history, approvals, distribution | `DocumentControlEngine` — version chain, approval workflow, controlled-copy tracking |

### Algorithms

- **QMS Maturity Score** = (clauses_implemented / clauses_applicable) × audit_evidence_factor
- **Non-conformity rate trend** — Mann-Kendall trend test on NCR-per-month time series
- **CAPA effectiveness** = (recurrences_after_implementation / recurrences_before_implementation) — target < 0.2

---

## Axis C — Real-Time Accounting from Docustrata

### What exists (verified)

- **GL surface (full)** on `prism_business`: `gl_chart_of_accounts`, `gl_journal_entry`, `gl_record_invoice`, `gl_record_payment`, `gl_record_purchase`, `gl_record_payroll`, `gl_trial_balance`, `gl_income_statement`, `gl_balance_sheet`, `gl_record_wip_to_cogs`
- **AR/AP surface (full)** on `prism_business`: `ar_invoice_record`, `ar_payment_record`, `ar_invoice_get`, `ar_invoice_list`, `ar_aging_report`, `po_create`, `po_approve`, `po_receive`, `po_receipt_record`, `po_three_way_match`, `po_ap_aging`
- **Payroll** on `prism_business`: `payroll_create_period`, `payroll_run`, `payroll_pay_stub` (composes `EmployeeEngine` + `TimeClockEngine`)
- **Customer analytics**: `customer_revenue_concentration` (HHI), `customer_growth_trends`, `customer_normalize`
- **Docustrata ingest**: `JMDieDocustrataIngestEngine` walks `H:/PRISM/JM DIE/_PART LIBRARY/<customer>/<part>/<docs>` extracting {customer, part_id, doc_filename, doc_date, doc_extension, abs_path}
- **Docustrata customer index**: `DocustrataCustomerIndexEngine` — read-only over `phase23-customer-folder-index.json`
- **Business doc extractor**: `BusinessDocumentExtractorEngine` (INGEST-MS5/U-BIZ01) — OCR + structured extraction for PO/invoice/RFQ
- **Office docs**: `OfficeDocumentPipelineEngine` — docx/xlsx/pptx parsing
- **`BurdenRateEngine`** — SHIPPED iter1 (was $0 stub, now real)

### True gaps

| Gap | Why it's needed | Engine to build | Wire location |
|---|---|---|---|
| **Docustrata → AP → GL bridge** | The 3 chains (Docustrata ingest, BusinessDocExtractor, AP+GL) exist but are NOT wired together. An invoice landing in Docustrata should auto-flow to AP→GL with reconciliation. | `DocustrataAccountingBridgeEngine` — composes `JMDieDocustrataIngestEngine` + `BusinessDocumentExtractorEngine` + AP/GL singletons | `prism_business`: `docustrata_to_ap`, `docustrata_to_gl`, `docustrata_invoice_reconcile` |
| **Real-time financial-snapshot endpoint** | Top-of-the-app dashboard needs P&L + AR-aging + AP-aging + WIP + cash position in one call | `RealTimeFinancialSnapshotEngine` — orchestrates GL trial-balance + AR aging + AP aging + cash | `prism_business`: `realtime_financial_snapshot` |
| **Sales-tax allocation** | Multi-state sales-tax on AR invoices (Illinois nexus + remote sellers) | `SalesTaxAllocationEngine` | `prism_business`: `sales_tax_*` (3) |
| **Cash-flow projection (forward-looking)** | Have `cash_flow_project` action stub but verify completeness | `CashFlowProjectionEngine` — extend with AR-aging-based DSO model | (existing wired) |

### Algorithms / formulas

- **Double-entry invariant**: Σ debits = Σ credits per journal entry (hotel-soul gate)
- **AR Aging buckets** (0-30, 31-60, 61-90, 91+) — DSO = (AR / total credit sales) × period_days
- **AP Aging** — DPO = (AP / COGS) × period_days
- **Cash conversion cycle** = DSO + DIO − DPO
- **WIP→COGS recognition** = standard cost × percentage_complete (already wired via `gl_record_wip_to_cogs`)
- **Bad-debt allowance** = AR_aging_bucket_balance × default_rate_by_bucket (industry-empirical defaults)
- **Concentration risk** = HHI of top customer revenues (already shipped via `customer_revenue_concentration`)

---

## Axis D — Self-Learning Shop-Economics Optimizer

### What exists (verified)

- `ShopRates` input on `JobCostingEngine` is static — caller passes in rates, no learning
- `MachineRateDatabaseEngine` — curated TCO data, never updates from outcomes
- `ActualCostEngine` exists (and one `.ts-1` shadow file — needs cleanup)
- `LatheActualCostReconciliationEngine` — lathe-specific actual-vs-predicted ledger (partial pattern)
- `CostEfficiencyBridgeEngine` — bridge engine
- `ActualVsPredictedCollectorEngine` exists (per file inventory)

### True gaps

| Gap | Why it's needed | Engine to build |
|---|---|---|
| **Self-learning shop-rate optimizer** | Close actual-vs-predicted loop across the full fleet (not just lathe). Adapt shop rate from outcomes via Bayesian update. | `AdaptiveShopRateEngine` — Bayesian-update shop rate from `ActualVsPredictedCollectorEngine` ledger; emit per-machine prior + posterior |
| **Bid-to-win calibrator** | Track quote → win-rate → margin to learn the optimal markup for each customer/material/quantity combination | `BidWinCalibratorEngine` — logistic regression: P(win | markup, customer_tier, material, qty) |
| **Market-rate ingest** | Pull external market rate signals (metals indices, energy prices) to adapt material/utilities cost forecasts | `MarketRateIngestEngine` — fetch USGS metals + EIA energy + USD index; emit material-price adjustment factor |
| **Job-economics outcome ledger** | Append-only ledger of every job's (estimated_cost, actual_cost, estimated_revenue, actual_revenue, margin_delta) | `JobEconomicsOutcomeEngine` — feeds AdaptiveShopRate, BidWinCalibrator |

### Algorithms / formulas

- **Bayesian rate update**: Posterior μ = (σ_actual² × μ_prior + σ_prior² × x_obs) / (σ_actual² + σ_prior²), Posterior σ² = (σ_prior² × σ_actual²) / (σ_prior² + σ_actual²)
- **Bid-win logistic**: P(win) = 1 / (1 + exp(-(β₀ + β₁·markup + β₂·tier + β₃·qty)))
- **Optimal markup** (max EV): markup* = argmax [P(win | markup) × (revenue(markup) - cost)]
- **Tool-life regression to cost**: Cost_per_part = MachineRate × cycle_time + Tool_cost / parts_per_tool + Material_cost — learn parts_per_tool via Weibull-MLE from outcomes
- **OEE-to-burden feedback**: Update `oee` parameter on `BurdenRateEngine` from real downtime ledger (TimeClockEngine pauses) — closes the loop

### Self-learning loop architecture

```
Quote Estimate → Production → Actual Outcome Capture (ActualVsPredictedCollector)
       ↓                              ↓
QuoteEstimator ← AdaptiveShopRate ← JobEconomicsOutcome
       ↓                              ↓
BidWinCalibrator ← MarketRateIngest (external signals)
       ↓
Next Quote (better-calibrated)
```

---

## Axis E — PSN + system-viz Synergy

### What exists (verified)

- /system-viz already renders ghost-pending nodes: `🔻 PPG-MS20 Compliance Spine`, `osha-300-log`, `osha-create-incident`, `jm-die-shop`
- `prism_business` + `prism_shop` dispatchers wired with 100+ actions across customer/order/quote/employee/payroll/GL/AR/AP surfaces
- Existing ghost roosts include `ghost.misc_tasks`, `ghost.bridge_synergy`, `ghost.priority_queue`, `ghost.substrate_health`

### True gaps

| Gap | Why it's needed | What to build |
|---|---|---|
| **Business-frontend ghost roost** | Surface every business-domain capability in /system-viz so operators can navigate ERP/HR/accounting in the visual map | `scripts/generate-business-frontend-features.mjs` — emits `ghost.business_frontend` roost with children for each dispatcher action group |
| **Safety/OSHA ghost roost** | Centralize all OSHA/safety/training visibility | `scripts/generate-safety-features.mjs` — emits `ghost.shop_safety` roost |
| **Accounting/realtime-financial roost** | One-glance financial-health node in system-viz | `scripts/generate-accounting-features.mjs` — emits `ghost.realtime_accounting` roost |
| **PSN cross-leg link enrichment** | Hotel-domain engines should link to NN/GNN (for predictions), wiki (for ISO clauses), memories (for hotel-soul invariants), PRISM AI (for synthesis) | Already partial via per-subagent pre-search; extend with explicit `psn_*` action wiring |

---

## Build sequence (already started)

| Iter | Unit | Status |
|---|---|---|
| 1 | `BurdenRateEngine` stub → real cost-accounting impl + 31/31 tests | **SHIPPED** (commit pending broadcast) |
| 2 | `DocustrataAccountingBridgeEngine` — wire ingest → extractor → AP/GL | building |
| 3 | `AdaptiveShopRateEngine` + `JobEconomicsOutcomeEngine` — self-learn loop | pending |
| 4 | `ISO9001QMSEngine` + `LOTOLogEngine` + `SDSLibraryEngine` + `SafetyTrainingRecordEngine` | pending |
| 5 | `ghost.business_frontend` + `ghost.shop_safety` + `ghost.realtime_accounting` roosts | pending |
| 6 | `RealTimeFinancialSnapshotEngine` — top-of-app dashboard composite | pending |
| 7 | `BidWinCalibratorEngine` + `MarketRateIngestEngine` | pending |
| 8 | `InternalAuditCalendarEngine` + `ManagementReviewEngine` + `DocumentControlEngine` | pending |

---

## Hotel-soul invariants applied to every build

1. **Cents-resolution** — every $ value reported to the penny; never round to thousands
2. **Financial-invariant gate** — Σ debits = Σ credits before any GL write; refuse write on imbalance
3. **PII redaction** — last4 SSN, masked CC, role-only names; never log raw PII
4. **R12 fail-loud** — no silent $0 / null / partial returns
5. **Defensive copy** — every public return is Object.frozen
6. **Forward + backward reconciliation** — transaction → GL forward AND GL → source transactions backward

---

## Cross-references

- [[reference_employee_mobile_portal_2026_05_23]] — 43 `emp_*` actions on `prism_shop`
- [[reference_u_bridge_erp_quote_2026_05_20]] — quote→order bridge pattern (template for Docustrata bridge)
- [[reference_u_bridge_erp_sched_2026_05_20]] — work-order→scheduling bridge pattern
- [[reference_acp_ms6_closeout_2026_05_23]] — quote-autopilot + telemetry pattern (template for self-learn ledger)
- [[reference_hotel_mus_customer_analytics_2026_05_22]] — customer-analytics cluster
- [[feedback_psn_definition]] — PSN 11-leg taxonomy
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION (hotel = erp+hr)
- CLAUDE.md §HOTEL slot-soul (financial-invariant gate + PII redaction)
