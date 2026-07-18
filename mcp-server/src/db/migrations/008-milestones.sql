-- 008-milestones.sql — Order milestone tracking + quality documents + portal tokens
-- Session 6-9: Customer Portal + Milestone Tracking

-- ─── Order Milestones ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        TEXT NOT NULL,
  quote_id      TEXT,
  customer_id   TEXT,
  milestone_key TEXT NOT NULL,           -- e.g., 'quote_sent', 'material_received'
  milestone_idx SMALLINT NOT NULL,       -- 0-13 for display ordering
  label         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_milestones_job ON order_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON order_milestones(status);

-- ─── Quality Documents ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        TEXT NOT NULL,
  doc_type      TEXT NOT NULL
                CHECK (doc_type IN ('fai_as9102', 'material_cert', 'coc', 'inspection_report', 'ndt_report')),
  file_id       UUID REFERENCES files(id),
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ,
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_docs_job ON quality_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_docs_type ON quality_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_quality_docs_status ON quality_documents(status);

-- ─── Portal Access Tokens ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT UNIQUE NOT NULL,
  token_type    TEXT NOT NULL CHECK (token_type IN ('quote', 'order')),
  entity_id     TEXT NOT NULL,            -- quote_id or job_id
  customer_id   TEXT,
  scope         TEXT[] NOT NULL DEFAULT ARRAY['view'],  -- view, respond, documents, messages
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT false,
  last_accessed TIMESTAMPTZ,
  access_count  INTEGER NOT NULL DEFAULT 0,
  rate_limit    INTEGER NOT NULL DEFAULT 10,  -- requests per minute
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_entity ON portal_tokens(entity_id);

-- ─── Portal Messages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('quote', 'order')),
  entity_id     TEXT NOT NULL,
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('customer', 'shop')),
  sender_name   TEXT NOT NULL,
  message       TEXT NOT NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_entity ON portal_messages(entity_type, entity_id);
