# Shop+HR+Payroll Audit — Agent 7: Compliance

## Payroll Compliance

| Regime | Engine | Status | Notes |
|--------|--------|--------|-------|
| FLSA Overtime | PayrollEngine | **COVERED** | Calculates regular/OT/double-time hours; enforces 40h threshold |
| Federal Income Tax | PayrollEngine | **COVERED** | 2026 withholding rates (22% default); YTD tracking |
| FICA (SS + Medicare) | PayrollEngine | **COVERED** | SS capped at $168.6K wage base; Medicare 1.45% + 0.9% surtax >$200K |
| FUTA/SUTA | PayrollEngine | **STUBBED** | No FUTA (employer 0.6%) or state unemployment (SUTA) tax calculation |
| State Min Wage | PayrollEngine | **STUBBED** | No jurisdiction detection; flat-rate overtime only |
| W-2/W-3 Annual | PayrollEngine | **STUBBED** | YTD tracking exists but no W-2 generation or IRS filing engine |
| 1099 Contractor | PayrollEngine | **ABSENT** | No independent contractor vs employee classification |
| ACA Reporting (Form 1095-C) | HRComplianceEngine | **STUBBED** | Benefits enrollment tracked; no ACA form generation |
| EFTPS Deposit Schedule | GeneralLedgerEngine | **STUBBED** | GL tracks Tax Payable accrual; no EFTPS transmission logic |

**Payroll Score: 44/100** — Core math (FLSA, FICA, fed tax) present; state/federal filing/quarterly deposits absent.

---

## HR Compliance

| Regime | Engine | Status | Notes |
|--------|--------|--------|-------|
| EEO-1 Reporting | HRComplianceEngine | **ABSENT** | No race/gender/job category tracking for annual EEO-1 filing |
| OSHA Form 300/300A/301 | OSHAComplianceEngine | **COVERED** | Full incident recording, 300/300A summary generation, PPE tracking |
| I-9 Verification | HRComplianceEngine | **STUBBED** | Employee record structure exists; no I-9 document control or E-Verify integration |
| E-Verify | HRComplianceEngine | **ABSENT** | No SSN verification or federal employment authorization check |
| FMLA Tracking | HRComplianceEngine | **COVERED** | PTO types include FMLA; balance management, approval workflow |
| ADA Accommodations | HRComplianceEngine | **STUBBED** | Benefit plans exist; no disability accommodation request/tracking workflow |
| Benefits Administration | HRComplianceEngine | **COVERED** | 7 plan types (health, dental, vision, 401k, life, disability, HSA); enrollment, deductions |
| Training Records | HRComplianceEngine | **COVERED** | Safety/technical/compliance courses; expiration alerts (90-day warning) |
| Performance Reviews | HRComplianceEngine | **COVERED** | Review creation, compensation history, goal tracking |

**HR Score: 62/100** — OSHA, PTO/FMLA, benefits, and training solid; missing EEO-1, I-9/E-Verify, ADA formalization.

---

## Shop Floor (OSHA)

| Regime | Engine | Status | Notes |
|--------|--------|--------|-------|
| Recordable Injury Determination | OSHAComplianceEngine | **COVERED** | Auto-classifies recordable: medical treatment beyond first aid, days away >0, days restricted >0 |
| Incident Reporting | OSHAComplianceEngine | **COVERED** | Create/list/update incidents with severity (first_aid/recordable/lost_time/fatality) |
| OSHA 300 Log | OSHAComplianceEngine | **COVERED** | Auto-generates 300 log for specified year; case numbering, injury/illness flags |
| OSHA 300A Summary | OSHAComplianceEngine | **COVERED** | Annual summary: total injuries, illnesses, days away/restricted, deaths |
| Lockout/Tagout Records | LegalComplianceOperatingEngine | **STUBBED** | Safety inspection types support; no LOTO-specific tracking or lock point inventory |
| Machine Guarding Inspections | LegalComplianceOperatingEngine | **COVERED** | Safety inspection framework with pass/fail/warning; next inspection date scheduling |
| PPE Assignment/Tracking | OSHAComplianceEngine | **COVERED** | PPE issuance by employee, condition tracking (good/worn/replace), replacement alerts |
| Incident Root Cause & Corrective Action | LegalComplianceOperatingEngine | **COVERED** | Incident update tracks root_cause, corrective_action, investigation status |

**OSHA Score: 85/100** — Comprehensive incident tracking and 300/300A generation; LOTO records absent.

---

## Defense/ITAR

| Regime | Engine | Status | Notes |
|--------|--------|--------|-------|
| ITAR Part Classification | LegalComplianceOperatingEngine | **COVERED** | Export classification by regime (ITAR/EAR), USML/ECCN, license tracking |
| Denied Party Screening | LegalComplianceOperatingEngine | **COVERED** | Checks 6 lists (OFAC/BIS/Debarred); demo pattern-based, production needs SAM.gov API |
| License Tracking & Renewal | LegalComplianceOperatingEngine | **COVERED** | License number, expiry date, expired status flag |
| Document Retention (ITAR 22 CFR 122.5) | LegalComplianceOperatingEngine | **COVERED** | Export records 5-year retention policy built-in |
| Defense Contractor Registration | LegalComplianceOperatingEngine | **STUBBED** | No DDTC/SAM registration status or contractor eligibility check |
| Foreign National Access Controls | LegalComplianceOperatingEngine | **STUBBED** | No country/citizenship fields on employees; no ITAR facility access gates |

**ITAR Score: 67/100** — Classification and denied-party checks present; registration, facility access controls absent.

---

## Cross-Cutting Engines

- **ComplianceEngine**: Meta-framework (ISO 13485, AS9100, SOC2, HIPAA, FDA 21 CFR 11); provisions hooks, manages templates, conflict resolution
- **FDA21CFRPart11Engine**: Electronic signatures, audit trails, authority checks for medical device records
- **ISO13485QMSEngine**: Medical device QMS document control, traceability
- **ISO14971RiskManagementEngine**: Medical device risk analysis
- **LegalComplianceOperatingEngine**: NDA lifecycle, export control, retention, audit logs, safety incidents, certifications (AS9100D, ISO 13485, NADCAP)

---

## Overall Compliance Score: **65/100**

### Strengths
- FLSA overtime calculation, FICA/Social Security withholding
- OSHA incident tracking, 300/300A generation, PPE management
- ITAR/EAR classification and denied-party screening
- Benefits administration, PTO accrual, training expiration alerts
- FDA 21 CFR Part 11 electronic signatures (medical device pathway)

### Critical Gaps
1. **Payroll Filing**: No W-2/W-3, 1099, quarterly state unemployment (SUTA), FUTA, or EFTPS transmission
2. **HR Compliance**: EEO-1 reporting, I-9/E-Verify, ADA accommodation workflow missing
3. **OSHA**: Lockout/tagout record tracking absent
4. **Defense**: No DDTC registration, foreign national access gates, facility clearance integration
5. **Tax Jurisdiction**: No state-by-state minimum wage, rate, or filing logic

### Remediation Priority
- **P0**: Implement W-2 generation, quarterly SUTA/FUTA deposit calculations, EFTPS scheduling (payroll filing)
- **P1**: Add I-9 document control, E-Verify integration, EEO-1 category tracking (compliance risk + legal exposure)
- **P2**: Extend LOTO record capture, foreign national access control, facility certifications (shop safety + defense)

---

**Assessment Date**: 2026-05-08  
**Scope**: PRISM MCP Server v1.0+ (all engines in src/engines/)  
**Disclaimer**: This audit is informational; not legal/regulatory advice. Organizations must engage compliance counsel independently.
