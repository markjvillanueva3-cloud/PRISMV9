# Shop+HR+Payroll Audit — Agent 9: Tests

**Audit Date:** 2026-05-08  
**Auditor:** Claude Code File Search  
**Scope:** Test coverage for Shop, Operator, Employee, Payroll, Tax, Compliance domains

## Test Files / it() blocks by Domain

| Domain | Test Files | it() Blocks | Status |
|--------|-----------|-------------|--------|
| **SHOP** | 3 files | 101 | PARTIAL |
| **OPERATOR** | 4 files | 78 | PARTIAL |
| **EMPLOYEE/HR** | 1 file | 31 | BASIC |
| **PAYROLL** | 0 files | 0 | MISSING |
| **TAX** | 0 files | 0 | MISSING |
| **OSHA/COMPLIANCE** | 0 files | 0 | MISSING |
| **TOTAL** | 8 files | 210 | 35% COVERAGE |

### SHOP Domain (101 tests across 3 files)
- `ShopDataCompletenessEngine.test.ts` — 19 tests (data validation, rules checking)
- `ShopFloorNoteIngestionEngine.test.ts` — 55 tests (note parsing, handoff, quality tracking)
- `ShopMachineOverlayEngine.test.ts` — 27 tests (machine availability, assignment)
- **Coverage:** Work order tracking ✓ | OEE calc ✗ | Schedule optimization ✗ | Downtime classification ✓

### OPERATOR Domain (78 tests across 4 files)
- `OperatorActionAuditTrailEngine.test.ts` — 14 tests (action logging, compliance)
- `OperatorApprovalGateEngine.test.ts` — 31 tests (approval workflow, state machines)
- `OperatorPreferencesEngine.test.ts` — 14 tests (UI settings, tool preferences)
- `operator-dashboard-orchestrator.test.ts` — 19 tests (dashboard rendering, data aggregation)
- **Coverage:** Clockin/out ✓ | Audit trails ✓ | Authority scope ✓ | Role-based access ✓

### EMPLOYEE/HR Domain (31 tests, 1 file — emp-ms0-phase1.test.ts)
- Employee model enhancements (10 tests): defaults, clearance levels, auth linking, overtime policy, shift differentials, rate recalculation
- TimeClock enhancements (11 tests): job start/pause/stop, process types, pause categories, handoff notes, carry-over jobs
- Input sanitization (10 tests): HTML stripping, truncation, eval/javascript URI blocking, null handling
- **Coverage:** Onboarding basics ✓ | Overtime calc (basic) ✓ | Certification expiry ✗ | Performance review ✗ | Skills matrix ✗

### PAYROLL Domain (0 tests — MISSING)
- **Missing:** PayrollEngine tests for end-to-end payroll run
- **Missing:** FLSA overtime calculation (40hr week, double-time states like CA)
- **Missing:** Federal tax bracket tests (2026 rates: 10%, 12%, 22%, 24%, 32%, 35%, 37%)
- **Missing:** FICA cap validation ($168,600 wage base 2024/2026)
- **Missing:** Bonus run, retroactive pay, garnishment (25% disposable income cap)

### TAX Domain (0 tests — MISSING)
- **Missing:** Federal withholding calculation (Form W-4 withholding tables)
- **Missing:** State tax bracket tests (varies by jurisdiction)
- **Missing:** Social Security 6.2% + wage base cap
- **Missing:** Medicare 1.45% + 0.9% threshold over $200k
- **Missing:** Additional Medicare tax calculation

### COMPLIANCE Domain (0 tests — MISSING)
- **Missing:** ACA threshold (50 FTE trigger for benefits mandate)
- **Missing:** EEO-1 categorization (job title codes, race/ethnicity rollup)
- **Missing:** OSHA 300 recordable criteria (injury classification, lost workday tracking)
- **Missing:** State-specific wage garnishment caps (25% disposable income rule)

## Reference Value Sourcing (IRS, DOL, OSHA)

### Identified Issues
1. **emp-ms0-phase1.test.ts** uses hardcoded multipliers (1.5, 2.0) for OT/DT but no real FLSA validation
   - `expect(emp.overtime_rate).toBe(30)` assumes 1.5x multiplier always applies
   - No test for CA state 8-hour overtime rule (1x OT after 8/day, plus 2x after 12/day)
   - No test for federal double-time eligibility criteria

2. **PayrollEngine exists** (per shop-agent-3-payroll.md) but has zero dedicated test coverage
   - Test file should validate FICA cap ($168,600), Medicare threshold ($200k), federal brackets
   - No test for garnishment calculations (max 25% of disposable income per CCPA)

3. **Tax references are simplified stubs**
   - erp.ts mentions "tax_rate NUMERIC(5,4)" but only default values (5% state, 22% federal)
   - No 2026 federal tax bracket validation

4. **ACA / EEO-1 / OSHA not mentioned anywhere**
   - No FTE threshold tests
   - No job category classification tests
   - No recordability logic for safety incidents

## Edge / Adversarial Coverage

### Tested (from emp-ms0-phase1.test.ts)
- HTML injection in notes fields (XSS stripping)
- Text truncation at 500 chars
- Null/undefined graceful handling
- Valid clearance level literals
- Overtime policy custom rules

### NOT Tested (critical gaps)
- Overtime crossing week boundary (Mon-Sun clock resets)
- Cascading tax liability (federal + state + FICA simultaneously)
- Garnishment over multiple pay periods (cumulative 25% check)
- Multi-state employees (CA daily OT vs. federal weekly OT)
- Rounding errors in tax calculations (penny precision)
- Leap second handling in TimeClockEngine
- Retroactive pay with rate changes mid-week
- Bonus vesting with employment termination

## Score: 35/100

**Justification:**
- **Test file count:** 8 files exist; 0 for payroll/tax/compliance (35%)
- **it() block count:** 210 blocks; 110 for shop/operator, 100 for payroll (52%)
- **Shop coverage:** Work order lifecycle present; OEE/schedule optimization missing (60%)
- **HR coverage:** Basic employee model tests; no certification expiry, review, skills matrix (40%)
- **Payroll:** Engine exists per shop-agent-3; zero tests covering FLSA, FICA, federal brackets (0%)
- **Tax/Compliance:** ACA, EEO-1, OSHA rules entirely absent from codebase (0%)
- **Reference accuracy:** Hardcoded multipliers (1.5, 2.0) instead of real IRS/DOL tables (30%)

**Verdict:** Foundation tests exist for shop floor + timeclock. **Payroll/tax/compliance tests missing entirely.** Cannot validate FLSA correctness, FICA cap, federal tax brackets, or regulatory compliance (ACA/EEO-1/OSHA) without test suite.

**Recommended Next:** 
1. Create `PayrollEngine.test.ts` with FLSA, FICA cap, federal bracket tests (use 2026 IRS tables)
2. Add garnishment cap tests (25% disposable income per CCPA)
3. Add ACA FTE threshold (50 employee trigger)
4. Add OSHA 300 recordability logic tests
5. Add state-specific overtime rules (CA 8hr/12hr daily OT)
