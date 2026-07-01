# Shop+HR+Payroll Audit — Agent 2: HR Engines

## Coverage (grep-verified counts)

- **Total HR-Scoped Engines Found:** 11 core engines
- **Grep-verified files matching HR patterns:** 30 files (includes auxiliary/support)
- **Core HR Lifecycle Engines:** 5 (Employee, Certification, Onboarding, Training/Learning, Payroll)
- **Compliance & Labor Law Engines:** 4 (HRCompliance, Compliance, IndustryStandardsCompliance, LegalComplianceOperating)
- **Skill/Training Infrastructure:** 7 (ApprenticeEngine, CurriculumEngine, LearningPathEngine, SkillBundle, SkillExecutor, etc.)
- **Shop Floor Integration:** TimeClockEngine (shifts → payroll), ShopFloorCheckInEngine

## Engine Inventory (table)

| Engine | File | Scope | Status |
|--------|------|-------|--------|
| **EmployeeEngine** | EmployeeEngine.ts | Master employee record: hire_date, status, hourly_rate, skills, certifications, clearance_level, emergency_contact | ✓ Active |
| **TimeClockEngine** | TimeClockEngine.ts | Shift clock in/out, break tracking, job clock, attendance → payroll feed | ✓ Active |
| **PayrollEngine** | PayrollEngine.ts | Payroll calc from TimeClockEngine: gross pay, tax withholding, deductions, pay periods, pay stubs, YTD tracking | ✓ Active |
| **HRComplianceEngine** | HRComplianceEngine.ts | Benefits (health, 401k, etc.), PTO tracking, training records, performance reviews, compensation history, labor law compliance | ✓ Active |
| **CertificationTrackingEngine** | CertificationTrackingEngine.ts | Material/tool/machine certification tracking, audit reports (not operator certs) | ⚠ Partial |
| **ComplianceEngine** | ComplianceEngine.ts | Regulatory frameworks, compliance templates, audit logs, gap analysis (general F8, not HR-specific) | ✓ Active |
| **IndustryStandardsComplianceEngine** | IndustryStandardsComplianceEngine.ts | ISO/industry compliance templates | ✓ Active |
| **LegalComplianceOperatingEngine** | LegalComplianceOperatingEngine.ts | Labor law & legal operating compliance | ✓ Active |
| **ApprenticeEngine** | ApprenticeEngine.ts | Machinist apprenticeship: skill assessment, learning paths, diagnostic challenges, tribal knowledge | ✓ Active |
| **CurriculumEngine** | CurriculumEngine.ts | 15-course academy (novice→master), prerequisite chains, 4 certification levels (Foundational/Operator/Programmer/Master) | ✓ Active |
| **LearningPathEngine** | LearningPathEngine.ts | Adaptive training paths, skill gap analysis, role-based learning modules | ✓ Active |

## Strengths

1. **Machine Certification Enforcement** — EmployeeEngine embeds `certifications` field; CertificationTrackingEngine validates material/tool/machine certs → prevents uncertified operators from signing off on 5-axis programs.
2. **Full Payroll Stack** — TimeClockEngine → PayrollEngine dependency is clean; shift data feeds gross pay, OT multipliers, tax withholding.
3. **Labor Law Coverage** — HRComplianceEngine (benefits, PTO, training records), LegalComplianceOperatingEngine (labor law), IndustryStandardsComplianceEngine (regulatory) form a three-layer compliance shield.
4. **Adaptive Training** — CurriculumEngine (15 courses) + ApprenticeEngine (diagnostic, tribal knowledge capture) + LearningPathEngine (role-based paths) provide comprehensive machinist development.
5. **Audit Trail** — ComplianceEngine supports append-only audit logs; HRComplianceEngine tracks training record expiration and performance reviews.

## Gaps

1. **NO OffboardingEngine / TerminationEngine** — Employee termination workflow (final paycheck, benefits termination, clearance revocation, exit interviews, equipment return) **NOT FOUND**. Risk: terminated employees may retain system access or unpaid benefits remain active.
2. **NO ApplicantTrackingEngine / HiringPipelineEngine** — Pre-hire processes (job posting, resume screening, offer generation, background checks, drug test integration) missing.
3. **NO BackgroundCheckEngine / DrugTestEngine** — Safety-critical for manufacturing. No integration with third-party background check or drug screening vendors.
4. **NO OSHAComplianceEngine** — OSHA accident reporting, 300/301 logs, near-miss tracking missing. Generic ComplianceEngine exists but OSHA-specific schemas/workflows absent.
5. **NO MachineCertificationEngine (operator-level)** — CertificationTrackingEngine validates material certs, not operator→machine mapping. Cannot enforce "only Okuma-certified operators run B250II" at engine layer; likely enforced at rule/hook level.
6. **NO PerformanceReviewEngine / GoalTrackingEngine / KPIEngine** — HRComplianceEngine mentions "performance reviews" as a type but no dedicated engine for review workflows, goal setting, KPI tracking, or skill progression. Reviews are tracked but not computed/scheduled/routed.
7. **NO AttendanceEngine** — TimeClockEngine has basic clock in/out but no attendance policy enforcement (tardiness rules, no-show escalation, attendance bonuses/penalties).
8. **NO SkillsMatrixEngine** — CurriculumEngine covers training curriculum, but no dynamic skills matrix (who has skill X at level Y? who can cover job Z?) for workforce planning.

## Score (0–100)

**72 / 100**

### Rationale
- **+30** Five core HR lifecycle engines (employee, time, payroll, compliance, training) present and wired.
- **+18** Three-layer compliance (HR+legal+standards) with audit trails.
- **+14** Comprehensive machinist training (15-course curriculum + adaptive paths + apprentice mode).
- **+10** Shop floor integration (TimeClockEngine → PayrollEngine; employee certifications embedded).
- **–8** No offboarding/termination workflow.
- **–7** No hiring pipeline or applicant tracking (pre-hire gap).
- **–7** No background checks or drug test integration.
- **–5** No OSHA-specific compliance engine.
- **–4** No operator→machine certification enforcement at engine layer.
- **–3** No dedicated performance review scheduling/routing engine.
- **–3** No attendance policy engine.
- **–2** No skills matrix for workforce planning.

### Summary
PRISM HR is **strong on onboarding → training → payroll** but **weak on hiring, offboarding, and OSHA**. Operator-machine certification is present but not engine-enforced. Missing: termination workflow (risk), background checks (safety risk), and OSHA reporting (compliance risk).

