-- Migration 004: Approval Workflows + Record Timelines + Comments
-- Session 6-6 (U-APPR1, U-APPR2)
--
-- Adds: approval_workflows (configurable per entity type), approval_instances
-- (individual approval requests), approval_decisions (per-step decisions),
-- record_timeline (immutable event log per entity), comments (threaded,
-- with file attachments), audit_log (persistent audit replacing in-memory 50K cap)

BEGIN;

-- ── Approval Workflow Definitions ───────────────────────────────
-- Each entity type (quote, po, invoice, payroll, ncr) gets a configurable
-- multi-step approval chain. Steps run in sequence; each requires a role.

CREATE TABLE IF NOT EXISTS approval_workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL CHECK (entity_type IN (
        'quote', 'purchase_order', 'invoice', 'payroll', 'ncr',
        'job', 'change_order', 'credit_memo'
    )),
    name            TEXT NOT NULL,
    description     TEXT,
    steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- steps schema: [{step_number, role_required, action_label, auto_approve_below_usd, timeout_hours}]
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (entity_type, name)
);

CREATE INDEX idx_approval_workflows_type ON approval_workflows(entity_type) WHERE is_active;


-- ── Approval Instances ──────────────────────────────────────────
-- One instance per entity submission. Tracks current step and overall status.

CREATE TABLE IF NOT EXISTS approval_instances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES approval_workflows(id),
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_review', 'approved', 'rejected', 'cancelled', 'auto_approved'
    )),
    current_step    INTEGER NOT NULL DEFAULT 1,
    total_steps     INTEGER NOT NULL,
    submitted_by    UUID REFERENCES users(id),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    entity_amount   NUMERIC(14,4),  -- for auto-approve threshold checks
    metadata        JSONB DEFAULT '{}'::jsonb,

    UNIQUE (entity_type, entity_id, workflow_id)
);

CREATE INDEX idx_approval_instances_entity ON approval_instances(entity_type, entity_id);
CREATE INDEX idx_approval_instances_status ON approval_instances(status) WHERE status IN ('pending', 'in_review');
CREATE INDEX idx_approval_instances_submitted ON approval_instances(submitted_at DESC);


-- ── Approval Decisions ──────────────────────────────────────────
-- One row per step decision (approve/reject/delegate/auto).

CREATE TABLE IF NOT EXISTS approval_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
    step_number     INTEGER NOT NULL,
    decision        TEXT NOT NULL CHECK (decision IN (
        'approved', 'rejected', 'delegated', 'auto_approved', 'timed_out'
    )),
    decided_by      UUID REFERENCES users(id),
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason          TEXT,
    delegated_to    UUID REFERENCES users(id),

    UNIQUE (instance_id, step_number)
);

CREATE INDEX idx_approval_decisions_instance ON approval_decisions(instance_id);


-- ── Record Timeline ─────────────────────────────────────────────
-- Immutable event log for any entity. Auto-populated from EventBus events.

CREATE TABLE IF NOT EXISTS record_timeline (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    event_type      TEXT NOT NULL CHECK (event_type IN (
        'created', 'updated', 'status_changed', 'approval_submitted',
        'approval_decided', 'approval_completed', 'file_attached',
        'comment_added', 'assigned', 'linked', 'unlinked',
        'emailed', 'printed', 'exported', 'archived', 'custom'
    )),
    actor           TEXT,
    summary         TEXT NOT NULL,
    details         JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_record_timeline_entity ON record_timeline(entity_type, entity_id);
CREATE INDEX idx_record_timeline_created ON record_timeline(created_at DESC);
CREATE INDEX idx_record_timeline_type ON record_timeline(event_type);


-- ── Comments ────────────────────────────────────────────────────
-- Threaded comments on any entity, with optional file attachments.

CREATE TABLE IF NOT EXISTS comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    parent_id       UUID REFERENCES comments(id),  -- NULL = top-level
    author_id       UUID REFERENCES users(id),
    author_name     TEXT NOT NULL,
    body            TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]'::jsonb,
    -- attachments: [{file_id, filename, mime_type, size_bytes, url}]
    is_internal     BOOLEAN NOT NULL DEFAULT FALSE,  -- internal vs customer-visible
    edited_at       TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_created ON comments(created_at DESC);


-- ── Persistent Audit Log ────────────────────────────────────────
-- Replaces AuditEngine in-memory 50K limit with durable storage.

CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    category        TEXT NOT NULL CHECK (category IN (
        'auth', 'data', 'config', 'safety', 'machine',
        'quality', 'export', 'admin', 'system', 'workflow'
    )),
    severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    action          TEXT NOT NULL,
    actor           TEXT NOT NULL,
    tenant_id       TEXT,
    resource_type   TEXT,
    resource_id     TEXT,
    details         JSONB DEFAULT '{}'::jsonb,
    ip_address      INET,
    previous_value  JSONB,
    new_value       JSONB,
    sequence        BIGSERIAL NOT NULL
);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_category ON audit_log(category, timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor, timestamp DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id) WHERE resource_type IS NOT NULL;
CREATE INDEX idx_audit_log_severity ON audit_log(severity) WHERE severity != 'info';


-- ── Insert Default Workflows ────────────────────────────────────

INSERT INTO approval_workflows (entity_type, name, steps) VALUES
('quote', 'Standard Quote Approval', '[
    {"step_number": 1, "role_required": "sales_manager", "action_label": "Review quote pricing and terms", "auto_approve_below_usd": 500, "timeout_hours": 48}
]'::jsonb),
('purchase_order', 'Standard PO Approval', '[
    {"step_number": 1, "role_required": "purchasing_manager", "action_label": "Approve purchase order", "auto_approve_below_usd": 1000, "timeout_hours": 24},
    {"step_number": 2, "role_required": "finance_manager", "action_label": "Finance review for POs over $5000", "auto_approve_below_usd": 5000, "timeout_hours": 48}
]'::jsonb),
('invoice', 'Standard Invoice Approval', '[
    {"step_number": 1, "role_required": "finance_manager", "action_label": "Approve invoice for payment", "auto_approve_below_usd": 250, "timeout_hours": 72}
]'::jsonb),
('payroll', 'Payroll Run Approval', '[
    {"step_number": 1, "role_required": "finance_manager", "action_label": "Review and approve payroll run", "timeout_hours": 24}
]'::jsonb),
('ncr', 'NCR Disposition Approval', '[
    {"step_number": 1, "role_required": "quality_manager", "action_label": "Review nonconformance and disposition", "timeout_hours": 24},
    {"step_number": 2, "role_required": "engineering_manager", "action_label": "Engineering concurrence on disposition", "timeout_hours": 48}
]'::jsonb)
ON CONFLICT (entity_type, name) DO NOTHING;


-- Record migration
INSERT INTO schema_migrations (version, name, applied_at, checksum)
VALUES ('004', 'approval-workflows', now(), md5('004-approval-workflows'));

COMMIT;
