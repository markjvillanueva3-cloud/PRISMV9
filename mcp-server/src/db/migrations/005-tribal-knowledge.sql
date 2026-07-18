-- Migration 005: placeholder for numbering gap
BEGIN;
INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES ('005', 'placeholder', now(), md5('005')) ON CONFLICT DO NOTHING;
COMMIT;
