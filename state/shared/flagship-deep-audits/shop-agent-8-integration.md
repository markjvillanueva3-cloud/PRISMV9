# Shop+HR+Payroll Audit — Agent 8: Cross-Domain Integration

## 8 Integration Paths Status

| # | Integration Path | Status | Evidence |
|---|---|---|---|
| 1 | Timesheet → Payroll | **WIRED** | `shiftClockIn()`, `shiftClockOut()`, `getTimecard()`, `runPayroll()` fully implemented (client.ts:299-389) |
| 2 | Certification → Machine permission | **STUBBED** | `getEmployeeCertifications()` exists (client.ts:478, 1031) but no `checkMachineAccess()` or permission gate |
| 3 | Skill matrix → Job assignment | **PARTIAL** | `employeeAddSkill()` (client.ts:971) exists but missing `skillMatchJob()` or assignment logic |
| 4 | Job completion → Labor cost allocation | **WIRED** | `getJobLaborCost()` (client.ts:1006-1010); `jobTimeStop()` records completion (client.ts:332-341) |
| 5 | Performance review → Wage adjustment | **ABSENT** | No `performanceReview()` or `updateWage()` functions found |
| 6 | OSHA injury → Workers comp claim | **ABSENT** | No injury tracking, OSHA, or insurance API integrations |
| 7 | Onboarding → Initial certification grants | **PARTIAL** | OnboardingModal.tsx has "Machine Access" step but no auto-grant |
| 8 | Termination → Access revocation | **STUBBED** | `updateEmployeeStatus()` (client.ts:408-415) updates status but lacks cross-system revocation |

## Wiring Summary
- **Wired**: 2 (Timesheet→Payroll, Job→Labor cost)
- **Partial**: 2 (Skill matrix, Onboarding)
- **Stubbed**: 2 (Certification permission, Termination revocation)
- **Absent**: 2 (Performance→Wage, OSHA→Workers Comp)

## Critical Gaps
- **Path 5**: No automation between performance reviews and wage updates — manual only
- **Path 6**: Zero OSHA injury tracking, zero insurance integration — exposes shop to workers' comp filing failures
- **Path 2**: Certifications stored but never enforced as machine-access gate (operator without cert can theoretically run any machine)

## Score: 38/100

## Wiring Evidence Files
- `H:/PRISM/mcp-server/web/src/api/client.ts` (lines 299–1099)
- `H:/PRISM/mcp-server/web/src/pages/TimecardPage.tsx`
- `H:/PRISM/mcp-server/web/src/pages/PayrollPage.tsx`
- `H:/PRISM/mcp-server/web/src/components/employee/OnboardingModal.tsx`

## Remediation Priority
1. **Path 2** (Certification → Machine permission) — safety-critical, blocks 5-axis Multus from being run by uncertified operator
2. **Path 6** (OSHA → Workers Comp) — regulatory exposure, manual-only is insufficient for inspections
3. **Path 8** (Termination → Access revocation) — security risk if ex-employee retains shop floor login
4. **Path 5** (Performance → Wage) — process automation, lower priority
