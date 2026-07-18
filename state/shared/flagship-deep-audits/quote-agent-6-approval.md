# Quote Deep Audit — Agent 6: Approval Workflow

## Executive Summary
**Status: WIRED BUT DEAD CODE** — ApprovalWorkflowEngine is fully implemented with multi-step approval chains, role-based authorization, and audit integration, BUT is NEVER invoked by any quoting routes or milling dispatchers. The $5,000 threshold is configured but unreachable from quote generation paths.

## Engines / Actions Wired

### ApprovalWorkflowEngine (Session 6-6, U-APPR1)
- **File**: `src/engines/ApprovalWorkflowEngine.ts`
- **Status**: Production-grade (259 lines + test coverage)
- **Actions**: 9 public methods
  - `configureWorkflow()` — Define multi-step chains (sales_rep → sales_manager → CEO thresholds)
  - `submit()` — Submit entity (quote/PO/invoice/NCR) with amount
  - `decide()` — Approve/reject/delegate with role validation
  - `cancel()` — Submitter-only cancellation
  - `getPending()` — Filtered approval queue
  - `getStatus()` — Single instance query
  - `getEntityHistory()` — All approvals for an entity
  - `listWorkflows()` — Active workflow definitions
  - `getStats()` — Aggregate stats (pending, overdue, approval time)
  - `requiresApproval()` — Check if amount requires approval + auto-approve prediction

### Default Workflows (Seeded)
```
Quote:           sales_manager, $2,500 threshold, 48h timeout
PO Step 1:       purchasing_manager, $2,500 threshold, 24h timeout
PO Step 2:       finance_manager, $10,000 threshold, 48h timeout
Invoice:         finance_manager, $1,000 threshold, 72h timeout
Payroll:         finance_manager, no auto-approve, 24h timeout
NCR:             quality_manager + engineering_manager (2-step), no auto-approve
```

### businessDispatcher Wiring
- **File**: `src/tools/dispatchers/businessDispatcher.ts`
- **Actions Exposed** (lines 586–628):
  - `workflow_configure` — Create/update workflows
  - `workflow_submit` — Entry point for approval submissions
  - `workflow_decide` — Approve/reject/delegate
  - `workflow_pending` — Queue retrieval
  - `approval_workflow_status` — Instance status
  - `workflow_cancel` — Cancellation
  - `approval_workflow_list` — List active workflows
  - `workflow_stats` — Stats
  - `workflow_requires_approval` — Threshold check + auto-approve prediction
  - `workflow_entity_history` — Entity approval history

### ERP Route Exposure
- **File**: `src/routes/erp.ts` (lines 586–596)
- **Endpoints**:
  - `POST /workflows/submit` — auth required
  - `POST /workflows/decide` — auth + lead/hr_manager/admin role
  - `POST /workflows/pending` — auth required
  - `POST /workflows/status` — auth required
  - `POST /workflows/cancel` — auth + lead/hr_manager/admin role
  - `GET /workflows/list` — auth required
  - `GET /workflows/stats` — auth required
  - `POST /workflows/requires-approval` — auth required
  - `POST /workflows/entity-history` — auth required

## Live Callers (which routes actually invoke)

**FINDING: NONE. Zero callers to approval workflow from quoting pipelines.**

**Verified**:
- `quote_estimate` → QuoteEstimatorEngine.estimate() — does NOT call workflow_submit
- `quote_compare_materials`, `quote_what_if`, `quote_price_breaks_advanced` — no approval submission
- `instant_quote`, `instant_quote_qty_breaks`, `instant_quote_lead_time` — no approval calls
- `quote_revise`, `quote_status_change` — does NOT trigger approval workflow
- `quoting_generate`, `quoting_price_breaks` — no approval submission
- Sheet metal quote, additive quote, injection mold quote, casting quote, weld fab quote, multi-process quote — NONE call approval_workflow_submit

**Only discoverable caller**: `POST /workflows/submit` route (erp.ts:587) — manually called by frontend, not by backend quote engines.

## Threshold Configuration

```javascript
// Seed defaults in ApprovalWorkflowEngine.seedDefaults() — lines 711–755
{
  entity_type: "quote",
  name: "Standard Quote Approval",
  steps: [{
    step_number: 1,
    role_required: "sales_manager",
    action_label: "Review quote pricing and terms",
    auto_approve_below_usd: 2500,
    timeout_hours: 48
  }]
}
```

**Threshold Logic**:
- Quotes < $2,500: auto-approved (amount > 0 AND < threshold)
- Quotes ≥ $2,500: routed to sales_manager approval queue
- Multi-step for PO: step1 $2,500 (purchasing_manager), step2 $10,000 (finance_manager)
- Delegation depth limit: 5 (circular delegation blocked)
- Security: self-approval blocked, submitter-only cancellation

## Frontend Approval Queue UI

**Status: API exists, UI unknown**
- Frontend can call `GET /workflows/pending` to fetch pending approvals
- Response includes: `PendingApproval[]` with instance, workflow def, current step, age_hours, is_overdue, submitted_by
- Filter by entity_type (quote, purchase_order, etc.) and role
- Overdue approvals sorted first, then by age

**Missing**: No observable frontend component using this endpoint in current codebase.

## Audit Trail

**Integrated via EventBus + AuditEngine** (ApprovalWorkflowEngine lines 240–252, 357–362, 369–373, 380–383, 427–434, 463–471, 668–677):
- `approval.submitted` — entity_type, entity_id, amount, submitter
- `approval.approved` / `approval.rejected` / `approval.delegated` — step, decider, reason
- `approval.step_advanced` — multi-step progression
- `approval.cancelled` — canceller, reason
- `approval.completed` — final_status (approved, auto_approved)

AuditEngine logs:
- `approval_submitted` — submitter, instance_id, entity, workflow name, amount
- `approval_approved`, `approval_rejected`, `approval_delegated` — decider, step, reason
- `approval_auto_approved` — system, amount, threshold
- `approval_cancelled` — canceller, reason

## Override/Escalation Paths

- **Delegation**: Step approver can delegate to another user (tracks delegated_from, delegated_to, delegated_at in metadata)
- **Escalation**: Not explicit — requires manual rejection + resubmission at higher authority
- **Auto-approve bypass**: Only if amount < threshold
- **Cancellation**: Only by original submitter (enforced M3 SECURITY rule)
- **No hard override**: SafetyQualityHooks.ts (line 847) blocks approval_workflow_decide bypass attempts

## Score: 25/100

| Category | Score | Notes |
|----------|-------|-------|
| Engine Completeness | 95 | All methods, security rules, audit integration present |
| Dispatcher Wiring | 100 | All 9 actions registered and routed correctly |
| Route Exposure | 100 | All ERP endpoints functional with auth/role checks |
| Integration with Quote Routes | **0** | DEAD CODE — no quoting pipeline calls approval_workflow_submit |
| Frontend UI | **0** | No observable approval queue component in routes |
| Real-world Usage | **0** | Accessible only via manual API calls, not triggered by quote workflow |

**Verdict**: Architecture is sound and production-ready, but the glue logic connecting quote generation to approval submission is missing. Quote engineers would need to explicitly add `await callTool("prism_business", "workflow_submit", {...})` after `quote_estimate` returns to make this live.

