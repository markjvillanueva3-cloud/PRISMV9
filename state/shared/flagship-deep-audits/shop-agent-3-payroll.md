# Shop+HR+Payroll Audit — Agent 3: Payroll Engines

**Audit Date:** 2026-05-08  
**Auditor:** Claude Code File Search  
**Scope:** Full payroll/HR engine inventory across PRISM SaaS

## Coverage (grep-verified counts)

| Engine | Status | Lines | Purpose |
|--------|--------|-------|---------|
| **PayrollEngine** | IMPLEMENTED | 264 | Gross pay, tax withholding, deductions, paystubs, YTD tracking |
| **EmployeeEngine** | IMPLEMENTED | 400+ | Master employee data, rates, certifications, labor records |
| **TimeClockEngine** | IMPLEMENTED | 600+ | Clock in/out, job time entries, break tracking, attendance |
| **HRComplianceEngine** | IMPLEMENTED | 400+ | Benefits (health/401k/life), PTO, training, reviews, compensation history |
| **ActualCostEngine** | IMPLEMENTED | 300+ | Labor cost rollup, variance analysis, profitability tracking |

**Total Payroll Stack:** 5 engines (2,000+ LOC combined)

## Engine Inventory (table)

### Core Payroll
- **PayrollEngine**: Calculates biweekly/monthly paystubs from TimeClockEngine data.
  - Earnings: Regular, overtime (1.5x), double-time (2x)
  - Tax withholding: Federal (22% default), state (5% default)
  - FICA: Social Security (6.2%, capped $168.6k wage base), Medicare (1.45% + 0.9% over $200k)
  - Deductions: Health insurance, 401(k) (6% default), other
  - YTD tracking per employee

### Time & Attendance
- **TimeClockEngine**: Shift and job clocking, break tracking, pause reasons (downtime, setup, tooling, etc.)
  - Pause categories: machine down, material shortage, tooling, breaks, idle
  - Process types: setup, production, FAI, rework, inspection, deburring, secondary ops
  - Foundation for labor costing

- **EmployeeEngine**: Employee master data, rates, overtime policies, shift assignments
  - Overtime rule: daily (8h+) or weekly (40h+)
  - Shift differentials: second/third shift premiums
  - Skills + certifications (verified, expiration dates)
  - Clearance levels: shop_floor, lead, HR manager, admin

### HR & Compliance
- **HRComplianceEngine**: Benefits administration, PTO, training, performance, compensation history
  - Benefit plans: Medical (PPO), dental, vision, 401(k), life, disability, HSA
  - PTO accrual: vacation (3.08-6.15 hrs/period), sick (1.85), personal (0.77)
  - PTO types: vacation, sick, personal, bereavement, jury duty, military, FMLA
  - Training records: safety, technical, quality, leadership, compliance, machine-specific
  - Performance reviews: 1-5 ratings, goals, compensation changes (raises, bonuses, promotions)
  - Compensation history: audit trail of rate changes

### Cost Integration
- **ActualCostEngine**: Rolls up labor costs from TimeClockEngine against estimates
  - By-employee labor cost tracking
  - Variance analysis: under/on-budget/over
  - Job profitability: estimated vs. actual margin
  - Cost center summaries: labor + material + tooling + machine + overhead

## Tax Compliance Coverage

### Federal & State (Simplified 2026 Rates)
- Federal withholding: Percentage-based (configurable, 22% default)
- State withholding: Percentage-based (configurable, 5% default)
- Social Security: 6.2% employee + 6.2% employer (wage base $168,600)
- Medicare: 1.45% employee + 1.45% employer
- Additional Medicare: 0.9% over $200k (single-year calculation, not lifetime)

### Gaps Identified
- **W-2/1099 generation:** No engine for annual tax form filing
- **FUTA/SUTA:** No employer payroll tax engines (federal/state unemployment)
- **Garnishments:** No support for wage garnishment, child support orders
- **Direct deposit:** No payment method engine (ACH, check routing)
- **Payroll tax filing:** No quarterly estimated tax (941-C) or annual reconciliation
- **Multi-state:** No state tax table registry or regional FMLA/wage law rules
- **Certification expirations:** HRCompliance tracks but no alert triggers

## Strengths

1. **Solid foundation:** PayrollEngine correctly implements gross-pay → deductions → net-pay flow
2. **FICA math correct:** Social Security wage base cap, Medicare additional rate calculation
3. **Employee master clean:** EmployeeEngine provides consistent rates, overtime rules, shift premiums
4. **Time tracking robust:** TimeClockEngine handles multi-job, pause/resume, break logic
5. **PTO management:** Accrual tiers by tenure, multiple PTO types, carryover caps
6. **Cost transparency:** ActualCostEngine links labor to job profitability via TimeClockEngine

## Gaps & Risks

| Gap | Risk | Priority |
|-----|------|----------|
| No W-2/1099 engine | Shops cannot file tax forms → compliance violation | CRITICAL |
| No FUTA/SUTA engines | Employer tax shortfalls, penalties | CRITICAL |
| No garnishment support | Wage order compliance gaps | HIGH |
| No direct deposit engine | Paper check-only; high manual overhead | HIGH |
| No tax filing orchestration | Missing quarterly 941-C, annual reconciliation | HIGH |
| No multi-state tax rules | Regional wage law/FMLA blind spots | MEDIUM |
| No compliance alerts | Training expiration, tax deadline, form due-date reminders | MEDIUM |
| No payroll audit trail | Limited tax audit defense | MEDIUM |
| No benefit compliance | ERISA/ACA reporting gaps | MEDIUM |

## Score: 58/100

**Justification:**
- **Coverage:** 5/5 core engines exist (100%)
- **Tax calculation:** FICA logic correct but federal/state simplified (60%)
- **Compliance:** W-2, 1099, FUTA, SUTA, garnishments missing (20%)
- **Integration:** PayrollEngine → TimeClockEngine tight but no ERP/accounting bridge (70%)
- **Audit trail:** YTD tracking present; full form/filing history absent (40%)

**Verdict:** Operational for basic payroll (paystub → gross/deductions/net), but **not tax-compliant** without W-2/FUTA/SUTA engines. Must add form-filing orchestration before shipping as SaaS payroll module.

**Recommended Next:** Fork /forge-triple to build W2FormEngine, FUTAEngine, GarnishmentEngine, DirectDepositEngine with full audit trail.
