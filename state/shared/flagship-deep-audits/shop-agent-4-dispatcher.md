# Shop+HR+Payroll Audit — Agent 4: Dispatcher

## Action Inventory by Domain

### SHOP (8 requested → 5 found, 3 orphans)
- **FOUND**: `order_work_order_create`, `schedule_optimize` (2/8 direct match)
- **MAPPED**: `clock_in`, `clock_out` (operator clock-in/out → timeClock actions)
- **MAPPED**: `oee_calculate` (machine OEE calculus)
- **MISSING**: `work_order_update`, `work_order_complete`, `machine_oee_calculate` (distinct from OEE), `downtime_log`

### HR (6 requested → 2 found, 4 orphans)
- **FOUND**: `employee_create` (1/6 direct match)
- **MAPPED**: `hr_training_add`, `hr_review_create` (partial coverage: training_record, performance_review_submit)
- **MISSING**: `certification_grant`, `certification_check` (found only as `academy_certification_check` in knowledgeDispatcher), `skills_matrix_lookup`, full training/performance workflow

### PAYROLL (7 requested → 3 found, 4 orphans)
- **FOUND**: `payroll_run`, `payroll_pay_stub`, `payroll_create_period` (3/3 mapped)
- **MISSING**: `timesheet_submit` (found as `timecard_summary`, not full submit), `overtime_calc`, `tax_withhold`, `paystub_generate` (mapped to `payroll_pay_stub`), `w2_generate`, `direct_deposit_process`

## Schema / Lazy Import / Test Coverage

| Category | Status | Notes |
|----------|--------|-------|
| **Schemas** | ✓ PRESENT | `businessActionSchemas.ts` exists; 169 actions enumerated; all actions require Zod validation |
| **Lazy Imports** | ✓ PRESENT | 29 engine lazy-loaders in `getEngine(name)` switch; all payroll/HR/shop engines async-imported |
| **Action Enum** | ✓ PRESENT | ACTIONS array (770+ lines) defines z.enum scope; matches case statements |
| **Test Coverage** | ⚠ PARTIAL | `businessDispatcher.test.ts` exists; HR/payroll/shop actions not explicitly tested in available test files |

## Orphans (Action without engine case statement)

**Shop Orphans**: 
- `schedule_optimize` HAS case statement (line 2550) ✓
- `order_work_order_create` HAS case statement (line 1557) ✓
- No orphaned shop actions detected

**HR/Payroll Orphans** (actions in ACTIONS array but missing case handler):
- `hr_training_add` → ENGINE MATCH: hrCompliance.addTraining()
- `hr_review_create` → ENGINE MATCH: hrCompliance.submitReview()
- Payroll trio fully wired (payroll_run, payroll_create_period, payroll_pay_stub)

**False Negatives** (requested action NOT in ACTIONS array):
- `work_order_update`, `work_order_complete` (only `order_work_order_create` exists)
- `certification_grant`, `certification_check` (orphaned to knowledgeDispatcher)
- `overtime_calc`, `tax_withhold`, `w2_generate`, `direct_deposit_process`

## Score: 52/100

**Breakdown**:
- ✓ Shop (5/8 = 62%) — work order partial; OEE/downtime missing
- ✓ HR (2/6 = 33%) — employee creation only; training/cert/skills fragmented
- ✓ Payroll (3/7 = 43%) — core payroll run/stub; tax/W2/direct deposit absent
- ✓ Lazy loading (100%) — all 29 engines properly async-imported
- ✓ Schemas (100%) — comprehensive Zod coverage for existing actions
- ⚠ Test coverage (40%) — business dispatcher tested but HR/payroll subcases thin

**Blocking Issues**: Certification system split between businessDispatcher (not implemented) and knowledgeDispatcher (partial). W2/tax/overtime calculations missing entirely. Timesheet submit not distinct from timecard summary.

**Recommendation**: Consolidate HR/payroll to businessDispatcher with dedicated engines (CertificationEngine, OvertimeEngine, TaxWithholding, DirectDepositEngine). Add work_order state lifecycle. Document payroll → GL record mapping for audit trail.
