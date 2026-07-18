# ERP Audit — Agent 7: Multi-Tenant / SaaS Readiness

## shop_id FK Coverage Matrix (table-by-table)

| Table | shop_id FK? | Status |
|-------|-----------|--------|
| customers | ❌ NO | High-risk: cross-tenant visibility |
| invoices | ❌ NO | High-risk: linked to customers w/o FK |
| purchase_orders | ❌ NO | High-risk: vendor data exposure |
| gl_journal_entries | ❌ NO | CRITICAL: shared GL across tenants |
| gl_accounts | ❌ NO | CRITICAL: single chart of accounts |
| work_orders | ❌ NO | Medium: only metadata exposed |
| employees | ❌ NO | CRITICAL: PII exposure risk |
| inventory | ❌ NO | Medium: material costs shared |
| quotes | ❌ NO | High-risk: quote comparison leak |

**Finding**: 0/9 tables have shop_id foreign keys. **No multi-tenant data isolation at DB layer.**

## Route shop_id Threading

**Auth Layer**: `verifyToken` (auth.ts) extracts userId/roles/permissions but **NOT tenant_id from JWT**.

**ERP Routes** (routes/erp.ts): All routes use `verifyToken` only:
- `/quote/generate` → calls quoting_generate (no tenantId param)
- `/job/plan` → job_plan dispatcher (no tenantId)
- `/gl-accounts` → gl_chart_of_accounts (shared, not scoped)
- `/gl-journal` → gl_journal_entry (no tenant scope)

**Finding**: Routes do not extract or inject shop_id/tenant_id. Queries execute against shared data.

## Per-tenant Config

**ShopConfigurationEngine** (src/engines/ShopConfigurationEngine.ts):
- ✅ Shop rates, machines, capabilities
- ❌ **NOT wired to ERP routes** — used only in manufacturing dispatchers
- Single instance: `shopConfigurationEngine` (hardcoded profile)

**GeneralLedgerEngine** (src/engines/GeneralLedgerEngine.ts):
- ❌ Single hardcoded CHART_OF_ACCOUNTS (no tenant customization)
- ❌ No fiscal year/currency per-tenant
- ❌ Persists to `state/shared/general-ledger-state.json` (monolithic)

**Finding**: Chart of accounts, rates, fiscal periods are NOT customizable per-tenant.

## Onboarding/Offboarding

**OnboardingEngine** (src/engines/OnboardingEngine.ts):
- ✅ Exists: interaction tracking, disclosure levels
- ❌ **User onboarding only** — NOT tenant onboarding
- ❌ No tenant provisioning workflow
- ❌ No tenant suspension/deletion

**MultiTenantEngine** (src/engines/MultiTenantEngine.ts):
- ✅ Tenant lifecycle: create/suspend/delete (2-phase)
- ✅ Anonymization + SLB (Shared Learning Bus)
- ❌ **NEVER INVOKED from ERP layer**
- ❌ Operates on `state/tenants/` only, not BusinessStore tables

**Offboarding**: No GDPR right-to-erasure. No data export. Deletion log exists but not tied to table cleanup.

**Finding**: Tenant lifecycle decoupled from ERP data.

## Cross-tenant Query Isolation

**Threat**: Shop A operator can view/modify Shop B's:
- Chart of accounts (shared GL_ACCOUNTS table)
- Customer list (no WHERE shop_id clause)
- Job costs (no tenant filter)
- Invoices (customer_id only, no shop_id)

**TenantIsolationEngine** (src/engines/TenantIsolationEngine.ts):
- ✅ 50+ SQL injection vectors blocked
- ✅ JWT claim freezing (tenant_id immutable)
- ❌ **Never enforces WHERE shop_id = $1 on queries**
- ❌ Parameterization enforced but no tenant context injection

**Finding**: Security engine lacks tenant scoping. Isolation is authentication-only (broken).

## PII / Sensitive Data Isolation

**Employees**: Full name, email, phone, SSN(?) — no shop_id FK.
- ❌ Shop A employee list visible to Shop B
- ❌ Payroll (salary, deductions) shared across tenants

**Vendors/Customers**: Contact info, pricing tier — no shop_id FK.
- ❌ A's supplier list visible to B
- ❌ Pricing tier (secret) in plain sight

**PIIComplianceEngine**: Exists but only detects PII fields, doesn't enforce isolation.

**Finding**: Critical PII exposure. No multi-tenant masking.

## Stripe Billing (0% Connected)

**Status**: No Stripe engine, payment processor, or billing module found.
- ❌ No payment_methods table
- ❌ No subscriptions table
- ❌ No usage metering
- ❌ No per-tenant billing cycles

**Finding**: SaaS billing layer missing. Cannot charge per-tenant.

---

## Score: 12/100

### Breakdown:
- **shop_id FK coverage**: 0% (0/9 tables) = 0 pts
- **Route threading**: 0% (no JWT tenant_id extraction) = 0 pts
- **Per-tenant config**: 20% (ShopConfigurationEngine exists, not wired) = 5 pts
- **Query isolation**: 15% (TenantIsolationEngine present, not enforced) = 8 pts
- **Onboarding**: 5% (OnboardingEngine not for tenants) = 1 pt
- **Offboarding**: 0% (no GDPR/export) = 0 pts
- **PII isolation**: 10% (PIIComplianceEngine present, not integrated) = 2 pts
- **Billing**: 0% (Stripe 0% connected) = 0 pts
- **Attack vectors**: 90% (TenantIsolationEngine blocks 50+ SQL/IDOR) = 8 pts

### Critical Gaps:
1. **MANDATORY**: Add shop_id FK + NOT NULL to all 9 tables
2. **MANDATORY**: Extract tenant_id from JWT in auth middleware
3. **MANDATORY**: Inject WHERE shop_id = $tenantId in all ERP queries
4. **HIGH**: Wire ShopConfigurationEngine to ERP routes
5. **HIGH**: Per-tenant chart of accounts (add shop_id to gl_accounts)
6. **MEDIUM**: Implement Stripe integration (subscriptions, usage metering)
7. **MEDIUM**: Tenant onboarding wizard (provision shops + GL charts)
8. **MEDIUM**: Data export + GDPR erasure for offboarding

### Recommended Priority:
1. Schema migration: Add shop_id FK to all tables
2. Auth middleware: Extract & freeze shop_id in request context
3. Query layer: Inject tenant context (TenantIsolationEngine.freezeContext → all Store.findAll calls)
4. ERP routes: Accept shop_id from JWT, pass to dispatchers
5. GL hardening: Per-tenant chart of accounts
6. Billing: Stripe webhooks + usage metering
