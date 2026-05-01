-- Migration 007: Role-Based Desks, Saved Views, Pins, Recents, Global Search
-- Session 6-8 U-DESK1 + U-DESK2

BEGIN;

-- ─── Saved Views ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_views (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(100) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    entity_type   VARCHAR(50)  NOT NULL,
    filters       JSONB        NOT NULL DEFAULT '{}',
    columns       TEXT[],
    sort_by       VARCHAR(100),
    sort_dir      VARCHAR(4)   DEFAULT 'asc' CHECK (sort_dir IN ('asc', 'desc')),
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_views_user ON saved_views (user_id);
CREATE INDEX idx_saved_views_user_type ON saved_views (user_id, entity_type);

-- ─── User Pins ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_pins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(50)  NOT NULL,
    entity_id     VARCHAR(100) NOT NULL,
    title         VARCHAR(500) NOT NULL,
    pinned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_user_pins_user ON user_pins (user_id);

-- ─── User Recents ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_recents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(50)  NOT NULL,
    entity_id     VARCHAR(100) NOT NULL,
    title         VARCHAR(500) NOT NULL,
    accessed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_recents_user ON user_recents (user_id, accessed_at DESC);

-- Trim recents to 100 per user via trigger
CREATE OR REPLACE FUNCTION trim_user_recents() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_recents
    WHERE id IN (
        SELECT id FROM user_recents
        WHERE user_id = NEW.user_id
        ORDER BY accessed_at DESC
        OFFSET 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trim_user_recents
    AFTER INSERT ON user_recents
    FOR EACH ROW EXECUTE FUNCTION trim_user_recents();

-- ─── Global Search Index (pg_trgm) ─────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS search_index (
    entity_type    VARCHAR(50)  NOT NULL,
    entity_id      VARCHAR(100) NOT NULL,
    title          VARCHAR(500) NOT NULL,
    subtitle       VARCHAR(500),
    searchable_text TEXT        NOT NULL,
    metadata       JSONB,
    indexed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX idx_search_trgm_title ON search_index USING gin (title gin_trgm_ops);
CREATE INDEX idx_search_trgm_text ON search_index USING gin (searchable_text gin_trgm_ops);
CREATE INDEX idx_search_type ON search_index (entity_type);

-- ─── Track migration ────────────────────────────────────────────────────────

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (7, '007-desks', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
