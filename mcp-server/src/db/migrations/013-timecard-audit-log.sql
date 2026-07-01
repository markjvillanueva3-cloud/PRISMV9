-- BIZ-MS2 U-BIZ17: Immutable timecard audit log (SOX/ISO compliance)

CREATE TABLE IF NOT EXISTS timecard_audit_log (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL,
  actor_id VARCHAR(50) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'edit', 'approve', 'reject', 'lock', 'close_forgotten')),
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timecard_audit_entry_id ON timecard_audit_log (entry_id);
CREATE INDEX IF NOT EXISTS idx_timecard_audit_actor_id ON timecard_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_timecard_audit_created_at ON timecard_audit_log (created_at);

-- Prevent any UPDATE on audit records (immutability enforcement)
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records are immutable — updates are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_audit_update ON timecard_audit_log;
CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON timecard_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_update();
