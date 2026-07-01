-- Migration 003: Quote Revisions + Status History
-- Session 6-3 U-IQUOTE2
--
-- Adds: quote_revisions (snapshot of each revision), quote_status_history
-- (audit trail of status changes), quote_share_tokens (customer portal access)

BEGIN;

-- ── Quote Revisions ──────────────────────────────────────────
-- Each revision is a frozen snapshot of the quote at a point in time.
-- The active revision is the one with the highest revision_number for a given quote_id.

CREATE TABLE IF NOT EXISTS quote_revisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL DEFAULT 1,
    -- Snapshot of pricing at this revision
    unit_price_usd  NUMERIC(12,4) NOT NULL CHECK (unit_price_usd >= 0),
    total_price_usd NUMERIC(14,4) NOT NULL CHECK (total_price_usd >= 0),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    -- CI95 confidence bounds
    ci95_low_usd    NUMERIC(12,4),
    ci95_high_usd   NUMERIC(12,4),
    confidence_pct  NUMERIC(5,2) CHECK (confidence_pct BETWEEN 0 AND 100),
    -- Cost breakdown snapshot (JSONB for flexibility)
    cost_breakdown  JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Qty breaks and lead time options
    quantity_breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
    lead_time_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- DFM snapshot
    dfm_score       INTEGER CHECK (dfm_score BETWEEN 0 AND 100),
    dfm_issues      JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Change tracking
    change_summary  TEXT,
    revised_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (quote_id, revision_number)
);

CREATE INDEX idx_quote_revisions_quote ON quote_revisions(quote_id);
CREATE INDEX idx_quote_revisions_created ON quote_revisions(created_at DESC);


-- ── Quote Status History ─────────────────────────────────────
-- Audit trail: every status change is logged with who/when/why.
-- Valid statuses: draft, sent, viewed, accepted, rejected, expired, revised

CREATE TABLE IF NOT EXISTS quote_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status   TEXT NOT NULL CHECK (to_status IN (
        'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'
    )),
    changed_by  UUID REFERENCES users(id),
    reason      TEXT,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_status_history_quote ON quote_status_history(quote_id);
CREATE INDEX idx_quote_status_history_created ON quote_status_history(created_at DESC);


-- ── Quote Share Tokens ───────────────────────────────────────
-- Opaque tokens for customer portal read-only access to a quote.
-- Tokens expire and can be revoked.

CREATE TABLE IF NOT EXISTS quote_share_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  UUID REFERENCES users(id),
    accessed_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_share_tokens_token ON quote_share_tokens(token) WHERE NOT revoked;
CREATE INDEX idx_quote_share_tokens_quote ON quote_share_tokens(quote_id);


-- ── Add status column to quotes if not exists ────────────────
-- (quotes table already exists from schema.sql; add status tracking)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'current_revision'
    ) THEN
        ALTER TABLE quotes ADD COLUMN current_revision INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at, checksum)
VALUES ('003', 'quote-revisions', now(), md5('003-quote-revisions'));

COMMIT;
