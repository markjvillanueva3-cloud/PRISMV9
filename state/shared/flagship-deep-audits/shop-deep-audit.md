# SHOP + HR + PAYROLL Flagship Deep Audit — Consolidated Report

**Verdict:** 56/100 — **PARTIAL BUILD** · Strong shop foundation, weak payroll/compliance, dangerous DB gaps
**Date:** 2026-05-08
**Method:** 10 parallel Explore agents (honest-build scan replaced roadmap)
**Comparison:** WEDM 82, Lathe 75, Mill 68, Quote 65, PPG 62, **Shop 56**, SFC 53

---

## EXECUTIVE SUMMARY

Shop+HR+Payroll is the **first PRISM subsystem with a CRITICAL DB-layer gap**. Unlike Quote (built but undocumented), this domain has **payroll tables that exist in code declarations but were never created in PostgreSQL**, **zero shop_id FKs across any HR/payroll table** (worse multi-tenant exposure than Quote), **no PII encryption-at-rest**, and **0 payroll test files** despite PayrollEngine claiming FICA/federal withholding logic.

The shop-floor side is in much better shape: 15 engines (CertificationTracking, JobLifecycle, OEECalculator, ShopFloorCheckIn, TimeClock, ShiftScheduleOptimizer), 12 frontend pages with WebSocket-ready dashboards, and integrations to job costing/quote variance work end-to-end.

**The discriminator is regulatory exposure**: payroll touches federal/state tax filings, ACA, garnishments, W-2/1099. Untested and partially-built payroll code in production is **regulatory liability**, not feature gap.

**Highest-leverage commits:**
1. **DB migration: create payroll tables** + `shop_id` FK on every HR/payroll table + PII encryption (16h)
2. **Build PayrollEngine test suite** — FLSA overtime (40hr + CA double-time), FICA cap $168,600, federal brackets, garnishment 25% cap (24h)
3. **Wire certification → machine permission gate** (4h, safety-critical: prevents uncertified operator from running 5-axis Multus)
4. **Add W-2 / 1099 / FUTA / SUTA generation engines** (40h)
5. **Add OSHA injury → workers comp claim path** (16h, regulatory exposure)

Time to "won't get sued" payroll: **~96h**. Time to four-sigma production: **~400h+**.

---

## AGENT SCORECARD

| # | Agent | Domain | Score | Status |
|---|---|---|---:|---|
| 1 | Shop floor engines | 15/21 present | 62 | ✓ Solid foundation |
| 2 | HR engines | 11 engines | 72 | ⚠ Hiring/offboarding weak |
| 3 | Payroll engines | 5 engines, no W-2/FUTA | 58 | ✗ Compliance gaps |
| 4 | Dispatcher | Shop 62%, HR 33%, Payroll 43% | 50 | ⚠ Fragmented |
| 5 | Frontend | 12 pages, no kiosk | 72 | ⚠ Missing operator UX |
| 6 | **DB schema** | **No shop_id, no PII enc, payroll tables missing** | **32** | **✗ CRITICAL** |
| 7 | Compliance | OSHA 85, payroll tax 44 | 65 | ⚠ Tax filings absent |
| 8 | Integration | 2 wired / 2 partial / 2 stubbed / 2 absent | 38 | ✗ Many dead links |
| 9 | **Tests** | **0 payroll, 0 tax tests** | **35** | **✗ CRITICAL** |
| 10 | Honest scan | 9.2K LOC, undertested | 63 | ⚠ Partial build |
| | **Composite** | | **56** | **Partial Build** |

---

## PART A — SHOP FLOOR ENGINES (Agent 1) · 62/100

### Present (15)
JobLifecycleEngine, CapacityPlanningEngine, ShopSchedulerEngine, OEECalculatorEngine, ShopFloorCheckInEngine, TimeClockEngine, OperatorDashboardOrchestratorEngine, ShiftScheduleOptimizerEngine, CertificationTrackingEngine, MilestoneTrackingEngine, ScrapRootCauseEngine, QualityManagementEngine, JobTravelerEngine, DurableJobQueueEngine

### Missing (6 critical)
- WorkOrderEngine
- KanbanEngine
- AndonEngine
- ReworkEngine
- MachineUtilizationEngine
- DowntimeTrackingEngine

Job → schedule → time → quality pipeline solid; pull-system, alert visualizations, work-order dispatch, rework management absent.

---

## PART B — HR ENGINES (Agent 2) · 72/100

### 11 core engines wired
- EmployeeEngine (master, certifications, clearance)
- TimeClockEngine (shift → payroll handoff)
- PayrollEngine (gross pay, tax, deductions)
- HRComplianceEngine (benefits, PTO, training, reviews)
- CertificationTrackingEngine
- ComplianceEngine (regulatory frameworks, audit logs)
- IndustryStandardsComplianceEngine (ISO)
- LegalComplianceOperatingEngine (labor law)
- ApprenticeEngine
- CurriculumEngine (15-course academy, 4 cert levels)
- LearningPathEngine (adaptive)

### Critical Gaps
- No offboarding/termination engine
- No hiring pipeline / applicant tracking
- No OSHA reporting engine (OSHAComplianceEngine appears in Agent 7 — name conflict; Agent 2 missed it)
- No background check integration
- No operator-machine certification ENFORCEMENT at engine layer (data exists, gate missing)

---

## PART C — PAYROLL ENGINES (Agent 3) · 58/100

### 5 engines (~2,000 LOC)
- **PayrollEngine**: FICA (SS cap $168.6k, Medicare +0.9% over $200k), federal/state withholding, 401(k), health insurance deductions
- **TimeClockEngine**: Multi-job clocking, break tracking, pause reasons
- **HRComplianceEngine**: PTO accrual by tenure, 7 benefit types, training records, performance reviews, comp history
- **ActualCostEngine**: Labor cost rollup vs estimates, profitability tracking
- **EmployeeEngine**: Rates, OT policies (daily/weekly), shift premiums, skills/certs

### Compliance Gaps (CRITICAL)
- **No W-2 generation engine**
- **No 1099 contractor engine**
- **No FUTA / SUTA employer tax engine**
- **No wage garnishment engine** (legal violation when court orders garnishment)
- **No direct deposit ACH engine**
- **No EFTPS deposit scheduler**

Untested + partial = regulatory risk. PayrollEngine has 0 test files.

---

## PART D — DISPATCHER (Agent 4) · 50/100

| Domain | Coverage | Notes |
|---|---:|---|
| Shop | 62% (5/8) | Work order partial, OEE/downtime missing |
| HR | 33% (2/6) | Fragmented across businessDispatcher + knowledgeDispatcher |
| Payroll | 43% (3/7) | Core present; W2/tax/overtime absent |

- Lazy imports & schemas: 100% complete (where actions exist)
- Test coverage: 40%
- **Recommendation**: consolidate to dedicated `hrDispatcher` and `payrollDispatcher` (or namespace under businessDispatcher)

---

## PART E — FRONTEND (Agent 5) · 72/100

### 12 pages
- **Shop**: ShopFloorLive, Dashboard, CncOps (WebSocket-ready, real-time)
- **HR**: EmployeeDirectory (760 LOC, 4-tab workforce desk), HRCompliancePage (8+ domains)
- **Payroll**: TimecardPage (audit trail, CSV export, status workflow), PayrollPage (register with deduction breakdown, GL handoff)

### Critical Gap: Zero Kiosk Pages
No badge-scan, full-screen, large-button shop-floor stations. All desktop-optimized. Missing 14 spec pages: OperatorDashboard, AndonBoard, Certification, TaxForms, etc.

---

## PART F — DATABASE SCHEMA (Agent 6) · 32/100 ✗ CRITICAL

### Coverage
- **Shop**: 8 tables (work_orders, time_entries, quality_records); missing operator_clockins, machine_states, downtime_log, kanban
- **HR**: Only `employees` table; missing certifications, training_records, hiring_pipeline
- **Payroll**: **STUBBED IN CODE** (payroll_periods, payroll_deductions) but **NEVER CREATED IN DATABASE**; missing paystubs, garnishments, w2_forms, benefits_enrollments

### Critical Security Issues
- **No `shop_id` FK on ANY table** (worse than Quote audit's data leakage finding)
- **No PII encryption-at-rest** for SSN, bank accounts
- **Type mismatches** (VARCHAR employee_id vs UUID employees.id)
- **Payroll tables non-existent** despite BusinessStore declarations — runtime failures guaranteed if PayrollEngine is invoked

### This is the single most dangerous gap in any flagship audited so far.
Customer SSN and bank account numbers in plaintext + no tenant isolation = regulatory + reputational + legal exposure.

---

## PART G — COMPLIANCE (Agent 7) · 65/100

| Regime | Score | Status |
|---|---:|---|
| OSHA (Forms 300/300A, PPE) | 85 | ✓ Comprehensive (gap: lockout/tagout) |
| ITAR / Defense | 67 | ⚠ Export class, denied-party OK; DDTC registration missing |
| HR (FMLA, benefits, training) | 62 | ⚠ EEO-1 / I-9 / E-Verify / ADA absent |
| **Payroll Tax Filings** | **44** | **✗ W-2/W-3, FUTA/SUTA, EFTPS, state min wage, 1099 all absent** |

Engines: PayrollEngine, HRComplianceEngine, OSHAComplianceEngine, LegalComplianceOperatingEngine + meta (ComplianceEngine, FDA21CFRPart11Engine, ISO13485QMSEngine).

---

## PART H — INTEGRATION (Agent 8) · 38/100

| # | Path | Status |
|---|---|---|
| 1 | Timesheet → Payroll | ✓ WIRED |
| 2 | Cert → Machine permission | ⚠ STUBBED (safety-critical) |
| 3 | Skill matrix → Job assign | ⚠ PARTIAL |
| 4 | Job → Labor cost | ✓ WIRED |
| 5 | Performance review → Wage | ✗ ABSENT |
| 6 | OSHA injury → Workers Comp | ✗ ABSENT |
| 7 | Onboarding → Cert grants | ⚠ PARTIAL |
| 8 | Termination → Access revoke | ⚠ STUBBED |

Wired: 2 / Partial: 2 / Stubbed: 2 / Absent: 2.

**Path 2 is safety-critical**: certifications stored but never enforced — uncertified operator could run 5-axis Multus today.
**Path 6 is regulatory**: no OSHA injury → workers comp pipeline; manual filing vulnerable to inspection failure.

---

## PART I — TESTS (Agent 9) · 35/100 ✗ CRITICAL

| Domain | Files | it() blocks |
|---|---:|---:|
| SHOP | 3 | 101 (work orders ✓; OEE/scheduling ✗) |
| OPERATOR | 4 | 78 (clockin/out ✓) |
| EMPLOYEE/HR | 1 | 31 (basics ✓; certs/reviews ✗) |
| **PAYROLL** | **0** | **0** ← CRITICAL |
| **TAX/COMPLIANCE** | **0** | **0** ← CRITICAL |

PayrollEngine claims FLSA OT, FICA cap, federal brackets — none tested against IRS/DOL tables.
Hardcoded OT multipliers (1.5x, 2.0x) vs real per-state rules (CA 8-hour rule).
No garnishment cap (25% disposable income), no ACA threshold (50 FTE), no EEO-1 categorization, no OSHA 300 recordability tests.

---

## PART J — HONEST-BUILD SCAN (Agent 10) · 63/100

### Reality
- **9.2K LOC built**:
  - Shop: 8 engines (85% ready)
  - HR: 1 engine consolidated (60%)
  - Payroll: 1 engine (45%)
- **Frontend**: 7 pages / 4.2K LOC
- **Database**: work_orders, employees created; payroll_periods/pay_stubs **MISSING**

### Reality vs Roadmap
- No `hrDispatcher` or `payrollDispatcher` — actions split across `shopPracticeDispatcher` + `businessDispatcher`
- Test coverage <5%
- Wiki has zero consolidated Shop/HR/Payroll entries

### Verdict: PARTIAL BUILD
- Backend ~50% built
- Tests ~5% complete
- DB ~30% complete
- Same pattern as Quote (under-documented) BUT with material gaps in the actual code (not just docs).

---

## CRITICAL BLOCKERS (Severity Order)

### TIER 0 — Legal / Regulatory
1. **No payroll tables in PostgreSQL** despite engines invoking them — runtime failures (16h DDL + migration)
2. **PII unencrypted at rest** — SSN, bank accounts in plaintext (16h column-level encryption)
3. **No shop_id on HR/payroll tables** — multi-tenant data leakage worse than Quote (8h)
4. **0 payroll test coverage** — production billing untested against IRS tables (24h)
5. **No W-2 / 1099 / FUTA / SUTA / garnishment** engines — annual filings impossible (40h)
6. **OSHA injury → workers comp absent** — inspection failure risk (16h)

### TIER 1 — Safety
7. **Certification → machine permission stubbed** — uncertified operator can run 5-axis (4h)
8. **Termination → access revocation stubbed** — ex-employee retains login (8h)

### TIER 2 — Operations
9. No WorkOrder / Kanban / Andon / Rework engines
10. No kiosk shop-floor pages
11. Performance review → wage adjustment absent

---

## RECOMMENDATIONS (priority order)

### IMMEDIATE — Stop the bleeding (96h)
1. DDL migration: create payroll tables + shop_id FK + PII encryption (16h)
2. Wire certification → machine permission gate (4h, safety)
3. PayrollEngine test suite vs IRS/DOL tables (24h)
4. W-2/W-3/1099 engines + tests (24h)
5. FUTA/SUTA + garnishment engines (16h)
6. Termination → access revocation (8h)
7. OSHA injury → workers comp basic flow (4h)

### NEXT SPRINT — M1 (80h)
8. WorkOrder + Kanban + Andon engines (24h)
9. Performance review → wage adjustment (8h)
10. Shop floor kiosk page (16h)
11. Onboarding → cert grants automation (8h)
12. EEO-1 / I-9 / E-Verify integrations (24h)

### M2 (80h)
13. ACA reporting (Form 1095-C) (16h)
14. State minimum wage logic (multi-state) (16h)
15. EFTPS deposit scheduler (16h)
16. Lockout/tagout records (8h)
17. ITAR DDTC + foreign-national gates (16h)
18. Frontend audit polish (8h)

### M3 (160h)
19. Performance KPI engine
20. Capacity planning ML
21. Real-time OEE WebSocket
22. Mobile shop-floor app
23. Workers comp insurance API
24. Background check API

---

## TIME-TO-PRODUCTION ESTIMATE

| Phase | Hours | Score Impact |
|---|---:|---|
| Stop the bleeding (TIER 0+1) | 96 | 56→72 |
| M1 ops + UX | 80 | 72→80 |
| M2 compliance polish | 80 | 80→86 |
| M3 mature features | 160 | 86→92 |
| Four-sigma hardening | 100 | 92→96 |
| **Total** | **516** | **56→96** |

---

## SUMMARY

Shop+HR+Payroll has **the deepest gaps of any subsystem audited**. Unlike Quote (built but undocumented) or SFC (complete but unwired), this domain has **DB tables that don't exist**, **PII unencrypted**, **0 payroll tests**, and **certification permission gates stubbed**. The shop-floor side is solid — but every regulatory-exposed area (payroll tax, OSHA workers comp, multi-tenant isolation) is either partial or absent.

**516h to four-sigma; 96h to "won't get sued."**

The pattern shifts here: this is **not a documentation problem** — material code gaps exist. The honest-build scan confirms the partial-build verdict; this domain is genuinely behind, not just under-recorded. Future audits should not expect the SFC/Quote "secretly built" surprise here.

**Composite Verdict: 56/100 — Partial Build, regulatory liability if shipped today.**
