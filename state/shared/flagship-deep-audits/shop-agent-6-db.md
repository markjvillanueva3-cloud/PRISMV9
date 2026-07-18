# Shop+HR+Payroll Audit — Agent 6: Database Schema

## Tables by Domain

### SHOP (Incomplete)
- **Exist**: work_orders, wo_routing_steps, prism_plans, prism_plan_steps, job_time_entries, time_entries, quality_records, quality_measurements
- **Missing**: operator_clockins, machine_states, downtime_log, schedule_blocks, kanban_columns

### HR (Partially Stubbed)
- **Exist**: employees (with certifications TEXT[])
- **Missing**: certifications (dedicated table), certification_expiries, training_records, performance_reviews, applicants, hiring_pipeline

### PAYROLL (Configured but Not Created)
- **Stubbed in BusinessStore.ts**: payroll_periods, payroll_deductions, payroll_ytd
- **Not Created**: timesheets (use time_entries instead), payroll_runs, paystubs, tax_withholdings, benefits_enrollments, direct_deposits, w2_forms, garnishments

## shop_id FK Coverage

**Status**: ❌ MISSING ENTIRELY
- No multi-tenant shop_id column on ANY table
- All tables assume single-shop operation (default or jm-die profile)
- **Data Leakage Risk**: HIGH — shared database with no tenant isolation
- Violates Quote audit finding requiring shop_id FK on all multi-tenant tables

## PII Encryption Status

**Status**: ❌ NO ENCRYPTION-AT-REST
- SSN: Not modeled (employees.phone only)
- Bank Accounts: Not modeled (direct_deposits missing)
- emergency_contact in employees: JSONB, plaintext only
- Passwords: password_hash in users (salted hash, acceptable)
- **Conclusion**: PII exposure if database is compromised; no encryption hooks

## FKs / Indexes

**Coverage**: PARTIAL
- time_entries.employee_id → employees(id): Missing FK constraint (VARCHAR mismatch)
- job_time_entries.employee_id → employees(id): Missing FK constraint
- Indexes exist on employee_id+date, status, department
- **Gaps**: No FK from timesheets to payroll_runs (table missing), no beneficiary tracking

## Audit Trail Tables

- **timecard_audit_log**: ✓ Immutable (triggers prevent UPDATE), append-only
- **audit_log**: ✓ Comprehensive (auth, data, config, safety)
- **Missing**: wage_history, certification_change_log, benefits_change_log (compliance gaps)

## Structural Issues

1. **Type Mismatches**: employee_id as VARCHAR in time_entries; employees.id as UUID
2. **Stale Config**: payroll_periods/payroll_deductions defined in code, never created in DB
3. **Denormalization**: certifications stored as TEXT[] in employees, not linked table
4. **No Validation**: hourly_rate, overtime_rate columns lack constraints (negative rates possible)

## Score: 32/100

- **Schema Completeness**: 20% (8/25 required tables exist)
- **Security (shop_id, encryption)**: 0% (none implemented)
- **Audit Trails**: 40% (2/5 implemented)
- **Foreign Keys**: 25% (missing on payroll, HR, time tracking)
- **Data Types**: 35% (type mismatches, no constraints)

## Recommendations

1. **URGENT**: Add shop_id FK to all tables (multi-tenant safety)
2. Create payroll tables (payroll_runs, paystubs, garnishments, w2_forms)
3. Create HR tables (certifications, training_records, hiring_pipeline)
4. Encrypt PII at rest (emergency_contact, SSN if added, bank accounts)
5. Fix employee_id type mismatch (UUID consistency across time_entries)
6. Add wage_history + benefits_change_log for regulatory compliance
7. Implement CHECK constraints on rates (>= 0)
