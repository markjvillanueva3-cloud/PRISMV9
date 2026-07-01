---
name: "approvals"
description: "Approval workflow manager"
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "approvals"
      - "approve"
      - "review queue"
  mode: "suggest"
  priority: 40
  timeout_ms: 2000
  token_budget: 400
---

# /approvals — Approval Workflow Management

Query and manage approval workflows for PRISM entities (quotes, POs, invoices, payroll, NCRs, jobs, change orders, credit memos).

## Usage

```
/approvals                    — Show pending approvals summary
/approvals pending [role]     — List pending approvals, optionally filtered by role
/approvals status <id>        — Get status of a specific approval instance
/approvals stats              — Show approval system statistics
/approvals history <type> <id> — Show approval history for an entity
```

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 (queries approval workflows, formats results)
- **Advisor**: none for `pending`/`status`/`stats`/`history` (read-only queries)
- Read-only approval queries don't need advisor guidance.

## Implementation

Use the `prism_business` MCP tool with these actions:

- `approval_workflow_list` — List configured workflows
- `approval_workflow_status` — Get instance status (pass `instance_id`)
- `approval_workflow_pending` — List pending approvals (pass optional `entity_type`, `role`)
- `approval_workflow_submit` — Submit entity for approval (pass `entity_type`, `entity_id`, `submitted_by`, optional `entity_amount`)
- `approval_workflow_decide` — Record decision (pass `instance_id`, `decision`, `decided_by`, optional `reason`, `decider_roles`)
- `approval_workflow_configure` — Create/update workflow definition

## Default behavior (no args)

1. Call `approval_workflow_pending` with no filters
2. Call `approval_workflow_list` to show configured workflows
3. Present a compact summary:
   - Count of pending/overdue approvals
   - Active workflows by entity type
   - Any overdue items flagged

## Safety

- Approval bypass is blocked by `pre-approval-bypass-guard` hook
- Auto-approve thresholds are configured per workflow step
- All decisions are audit-logged via AuditEngine
- Timeline entries auto-created via EventBus for full traceability
