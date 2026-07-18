# WEDM Deep Audit — Agent 9: Cost + ERP Integration

**Status:** PRODUCTION READY (Isolated) — NOT READY FOR PRODUCTION DEPLOYMENT
**Integration Score:** 30% (Phase 1 complete; Phase 2 unstarted)

---

## Cost Computation Status: PRODUCTION READY (Isolated)

**8 Primary Engines (2,349 LOC total):**
- `WEDMJobCostEngine.ts` (291 LOC) — batch + per-piece costs; hardcoded rates (machine: $85/hr, operator: $35/hr, overhead: 15%)
- `EDMCostDocumentationEngine.ts` (364 LOC) — cost estimate with process comparison; accepts optional `machine_rate` parameter but defaults to hardcoded constants
- `WEDMCreditCostEngine.ts` (96 LOC) — credit-based billing quantization
- `WEDMWireBreakRiskCostEngine.ts` (496 LOC) — physics-based break risk modeling with Rajurkar & Wang citations
- `WEDMQuoteBridgeEngine.ts` (366 LOC) — cost → quote line items bridge; implements Wright's Law learning curve (50–100 unit reduction: ~12% cost decrease) + RSS uncertainty propagation
- `WEDMInvoiceLineEngine.ts` (411 LOC) — completed job → invoice draft with variance metrics; overage gate (>15% variance triggers approval)
- `WEDMJobCreatorEngine.ts` (265 LOC) — program → JobTrackingPacket with 11-stage WEDM department flow (intake → CAD review → CAM → setup → rough cut → skim passes → QC → ship)
- `WEDMOverageApprovalEngine.ts` (140 LOC) — auto-approve/pending gate for cost overages; expires after 7 days if no decision

**All 8 engines tested in isolation; integration gaps prevent production deployment.**

---

## Quote-to-Job-to-Invoice Loop: 30% COMPLETE

| Stage | Engine/Route | Status | Persistence | GL Integration | Approval Gate |
|-------|--------------|--------|-------------|----------------|---------------|
| 1. Cost Estimate | EDMCostDocumentationEngine | ✓ Wired | Ephemeral (returned to client) | N/A | N/A |
| 2. Quantity Breaks | WEDMQuoteBridgeEngine.getQuantityBreaks | ✓ Wired | Ephemeral | N/A | N/A |
| 3. Quote Creation | wedm-erp.ts POST /quote/create | ⚠ Partial (in-memory Map) | wedmQuotes Map (volatile) | ✗ Missing | ✗ Missing |
| 4. Quote Approval | ApprovalWorkflowEngine | ✓ Exists | approval_workflows table | ✓ Exists | ✗ Not Wired |
| 5. Job Creation | WEDMJobCreatorEngine + wedm-erp.ts POST /job/create | ✓ Wired | jobPackets Map (volatile) | N/A | N/A |
| 6. Job Tracking | TrackingEngine | ✓ Exists | jobs/work_orders tables | ? Unknown | N/A |
| 7. Invoice Draft | WEDMInvoiceLineEngine + wedm-erp.ts POST /job/:id/complete | ⚠ Partial (in-memory Map) | invoiceDrafts Map (volatile) | ✗ Missing | ✗ Blocking |
| 8. Overage Approval | WEDMOverageApprovalEngine | ✓ Wired | overageRequests Map (volatile) | N/A | ✓ Blocks Stripe |
| 9. Stripe Payment | Stripe API | ✓ Wired | stripe_charges table | ✗ Missing | ✓ Checks invoiceAllowed() |
| 10. GL Posting | businessDispatcher.gl_record_invoice | ✓ Exists | gl_journal_entries table | ✗ Not Called | N/A |
| 11. Invoice Finalization | wedm-erp.ts POST /invoice/:id/finalize | ⚠ Partial (missing GL call) | invoiceDrafts Map | ✗ Missing | N/A |

### Critical Blockers
- All 4 persistent entities (quotes, jobs, invoices, overage_approvals) stored **in-memory only** — server restart loses all data
- Quote approval workflow **NOT WIRED** — quotes bypass `ApprovalWorkflowEngine.workflow_submit` entirely
- GL posting **NOT CALLED** — invoices never recorded in GL; accounting break in the loop
- No **shop_id/tenant_id** parameter passed to cost engines — multi-tenant rate lookup impossible

---

## Rate Sourcing: 0% ERP INTEGRATION

**Hardcoded Constants (`src/physics/wedm-constants.ts`):**
```
WEDM_DEFAULT_RATES = {
  machine_rate_usd_hr: 85,
  operator_rate_usd_hr: 35,
  overhead_pct: 0.15,
  margin_pct: 0.25
}
```

**ERP Integration Status:**
- Machine rate lookup action EXISTS: `businessDispatcher.machine_rate_lookup(shop_id, machine_id)`
- Table EXISTS: `machine_rates(shop_id, machine_id, rate_usd_hr, effective_date, expires_at)`
- **NEVER CALLED** from any WEDM route
- `EDMCostDocumentationEngine` accepts optional `machine_rate_per_hr` parameter (line 199) but defaults to hardcoded constant
- All `wedm-erp.ts` routes use `WEDM_DEFAULT_RATES.machine_rate_usd_hr` fallback without attempting ERP lookup

---

## Approval Workflow Integration: 0% WIRED

**Available Infrastructure:**
- `ApprovalWorkflowEngine` (140 LOC, fully implemented)
- `approval_workflows` table (migration 004)
- Supports workflow types: quote, PO, invoice, payroll, NCR, job, change_order, credit_memo
- Methods: `workflow_submit`, `workflow_decide`, `workflow_pending`, `workflow_cancel`

**WEDM Integration Gaps:**
1. **Quote Approval (POST /quote/create):** Should call `approval_workflow_submit({ entity_type: "quote", entity_id, quote_number, total_usd, created_by, approver_ids, ...})` — **NOT CALLED**
2. **Overage Approval (Overage Threshold Check):** WEDMOverageApprovalEngine creates OverageApprovalRecord with `status: "pending"` — should cascade to `approval_workflows` table — **NOT PERSISTED**
3. **Invoice Approval (POST /job/:id/complete):** If invoice total > shop_config.invoice_approval_threshold (e.g., $5,000), should require approval before Stripe posting — **MISSING ENTIRELY**

**Current Overage Gate (In-Memory):**
```typescript
status = variance_pct >= 15% ? "pending" : "auto_approved"
invoiceAllowed(record) = record.status === "auto_approved" || record.status === "approved"
```
**Problem:** Gate exists but `decision_at` not set; no audit trail if server restarts.

---

## Database Persistence: 4 ENTITIES, 0% PERSISTED

**In-Memory Stores (`wedm-erp.ts` lines 113–148):**
```typescript
const overageRequests = new Map<string, OverageApprovalRecord>();
const invoiceDrafts = new Map<string, InvoiceDraft>();
const jobPackets = new Map<string, TrackedJobPacket>();
const wedmQuotes = new Map<string, PersistedWEDMQuote>();
```

**Target Tables (Do NOT Exist Yet):**
- `wedm_quotes(id, shop_id, program_id, total_usd, per_unit_usd, created_at, ...)`
- `wedm_jobs(id, shop_id, quote_id, status, created_at, completed_at, ...)`
- `wedm_invoices(id, shop_id, job_id, line_items_json, total_usd, variance_pct, ...)`
- `wedm_overage_approvals(id, invoice_id, variance_pct, status, expires_at, decided_at, ...)`

**Code Comment (`wedm-erp.ts` line 110):**
> "In-memory stores (replaces DB for this milestone — swap for Postgres in M1)"

---

## GL Integration: 0% WIRED

**Available Action:** `businessDispatcher.gl_record_invoice(invoice_id, line_items[], shop_id, ...)`
- Posts to `gl_journal_entries` table; creates debit (A/R) and credit (Service Revenue) entries

**WEDM Integration Gap:** Never called from `wedm-erp.ts`. Correct insertion point: POST /job/:id/complete route, AFTER Stripe charge succeeds.

**Current Flow (Incomplete):**
```
quote_created → job_created → invoice_drafted → Stripe.charge() → [GL MISSING] → invoice_finalized
```

**Fixed Flow:**
```
quote_created → job_created → invoice_drafted → Stripe.charge() → gl_record_invoice() → invoice_finalized
```

---

## Integration Completeness Score

| Component | Score | Status |
|-----------|-------|--------|
| Cost Computation | 100% | ✓ All 8 engines fully wired and tested |
| Quote Estimation | 100% | ✓ EDMCostDocumentationEngine + WEDMQuoteBridgeEngine |
| Quote Storage | 20% | ⚠ In-memory only (volatile) |
| Quote Approval | 0% | ✗ ApprovalWorkflowEngine exists but not called |
| Job Creation | 100% | ✓ WEDMJobCreatorEngine fully wired |
| Job Tracking | 50% | ⚠ Partial (depends on TrackingEngine status) |
| Invoice Generation | 80% | ⚠ Generated but not persisted to DB |
| Overage Approval | 60% | ⚠ Gate works in-memory, no audit trail |
| Stripe Integration | 100% | ✓ Charges posted; blocks on overage gate |
| GL Posting | 0% | ✗ Action exists, never called |
| Multi-Tenant Rates | 0% | ✗ Hardcoded, no ERP lookup |
| **Overall** | **30%** | ⚠ **Phase 1 complete; Phase 2 unstarted** |

---

## Phase 2 Punch List (18-Hour Effort)

### Phase 2A: Database Persistence (6 hours)
1. Create migration: `wedm_quotes` table
2. Create migration: `wedm_jobs` table
3. Create migration: `wedm_invoices` table
4. Create migration: `wedm_overage_approvals` table
5. Replace `Map.set()` calls in `wedm-erp.ts` routes with INSERT/UPDATE queries
6. Test: Quote survives server restart; invoice persists after Stripe charge

### Phase 2B: Approval Workflow Integration (4 hours)
1. Wire `approval_workflow_submit()` call in POST /quote/create route (if quote.total > threshold)
2. Update `WEDMOverageApprovalEngine.createRequest()` to write to `approval_workflows.approval_decisions` table
3. Add POST /approval/:approval_id/decide endpoint (updates overage_approvals.status and cascade to invoice)
4. Test: Quote pending approval blocks invoice; approval unblocks Stripe charge

### Phase 2C: ERP Rate Lookup (4 hours)
1. Add `shop_id` parameter to all WEDM cost routes (POST /quote/*, POST /job/create, POST /job/:id/complete)
2. Implement lazy-load machine_rate: `businessDispatcher.machine_rate_lookup(shop_id, machine_id)` with 30-min cache
3. Fallback to `WEDM_DEFAULT_RATES` if ERP unavailable
4. Test: Rate lookup succeeds; fallback works; cache expires after 30 min

### Phase 2D: GL Integration + Testing (4 hours)
1. Add `businessDispatcher.gl_record_invoice()` call in POST /job/:id/complete route (after Stripe charge succeeds)
2. Pass `invoice_id`, `line_items` (wire, machine_time, consumables, post_process, overhead), `shop_id`, `posting_date`
3. End-to-end test: Quote → Job → Invoice → Stripe → GL (debit A/R, credit Service Revenue)
4. Overage gate test: Variance > 15% → pending approval → approved → Stripe unblocked
5. Rate fallback test: ERP unavailable → hardcoded defaults

---

## Critical Blockers

1. **Data Loss Risk:** All quotes, jobs, invoices lost on server restart (currently in-memory)
2. **Accounting Break:** GL never posted; Month-end close incomplete (invoices issued but revenue not recognized)
3. **Approval Bypass:** Quotes bypass approval gate; high-value quotes ($10k+) unchecked
4. **Multi-Tenant Blocker:** No `shop_id` passed to cost engines; shared rates across all customers (security/audit risk)
5. **Audit Trail Missing:** Overage approvals have no timestamp, decision reason, or audit log

---

## Recommendations (Priority Order)

1. **IMMEDIATE (Next 48 Hours):** Implement Phase 2A (database persistence) — prevents data loss on deployment
2. **HIGH (Next Sprint):** Implement Phase 2B (approval workflow) — required for quote compliance audit
3. **MEDIUM (Week 2):** Implement Phase 2C (ERP rate lookup) + Phase 2D (GL integration) — completes accounting close loop
4. **TESTING:** Run end-to-end integration test before production deployment (quote → invoice → GL → balance sheet reconciliation)
