-- golf-ledger-v1.sql — schema for LedgerStoreEngine (U-CLEANUP-B10)
--
-- Tables that the golf-slot watchdog + peer chats both read/write:
--   bug_attribution       — per-bug audit trail (which chat, which commit, which files).
--   peer_audit_ticks      — every golf watchdog poll cycle (start/end, commits-seen, findings).
--   chat_bus_signals      — structured cross-chat signals (replaces chunks of AGENT_CHAT.md).
--   golf_envelope_mutations — queued envelope edits golf wants applied via R3-UU3 drainer.
--   ledger_meta           — schema_version + free-form key/value (mirrors coordination.meta).
--
-- All tables carry an INTEGER PK + INTEGER ts (epoch-ms) for fast range queries.
-- Lives in the SAME coordination.db as CoordinationStoreEngine — single WAL file, single
-- busy_timeout regime. Tables are prefixed only within this file; no cross-table FKs
-- to coordination.* so dropping the ledger leaves coord intact.
--
-- DDL is idempotent via CREATE TABLE IF NOT EXISTS. Future ALTERs gated on
-- ledger_meta.schema_version (the value seeded below is the ledger version,
-- DISTINCT from CoordinationStoreEngine's schema_version key in coordination.meta).

CREATE TABLE IF NOT EXISTS bug_attribution (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id          TEXT    NOT NULL,
  originating_chat TEXT   NOT NULL,
  commit_sha      TEXT    NOT NULL,
  file_paths_json TEXT    NOT NULL DEFAULT '[]',
  severity        TEXT    NOT NULL DEFAULT 'P3',
  summary         TEXT    NOT NULL DEFAULT '',
  detected_at     INTEGER NOT NULL,
  resolved_at     INTEGER,
  resolved_by     TEXT,
  resolution_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_bug_id    ON bug_attribution(bug_id);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_chat      ON bug_attribution(originating_chat);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_commit    ON bug_attribution(commit_sha);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_detected  ON bug_attribution(detected_at);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_severity  ON bug_attribution(severity);

CREATE TABLE IF NOT EXISTS peer_audit_ticks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tick_id         TEXT    NOT NULL UNIQUE,
  started_at      INTEGER NOT NULL,
  finished_at     INTEGER,
  commits_seen    INTEGER NOT NULL DEFAULT 0,
  findings_count  INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'running',  -- running | complete | failed | aborted
  error_text      TEXT,
  meta_json       TEXT    NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_peer_audit_started ON peer_audit_ticks(started_at);
CREATE INDEX IF NOT EXISTS idx_peer_audit_status  ON peer_audit_ticks(status);

CREATE TABLE IF NOT EXISTS chat_bus_signals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  signal_id       TEXT    NOT NULL UNIQUE,
  from_chat       TEXT    NOT NULL,
  to_chat         TEXT    NOT NULL DEFAULT '*',          -- '*' = broadcast
  signal_type     TEXT    NOT NULL,                       -- claim_request | release | budget_alert | golf_finding | ...
  payload_json    TEXT    NOT NULL DEFAULT '{}',
  emitted_at      INTEGER NOT NULL,
  consumed_at     INTEGER,                                -- NULL while in queue
  consumed_by     TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_bus_to_chat   ON chat_bus_signals(to_chat);
CREATE INDEX IF NOT EXISTS idx_chat_bus_emitted   ON chat_bus_signals(emitted_at);
CREATE INDEX IF NOT EXISTS idx_chat_bus_type      ON chat_bus_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_chat_bus_consumed  ON chat_bus_signals(consumed_at);

CREATE TABLE IF NOT EXISTS golf_envelope_mutations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation_id     TEXT    NOT NULL UNIQUE,
  target_path     TEXT    NOT NULL,                      -- relative to repo root
  json_patch      TEXT    NOT NULL DEFAULT '[]',          -- RFC 6902 JSON Patch array
  rationale       TEXT    NOT NULL DEFAULT '',
  queued_at       INTEGER NOT NULL,
  applied_at      INTEGER,
  applier_chat    TEXT,
  apply_error     TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'      -- pending | applied | rejected | superseded
);
CREATE INDEX IF NOT EXISTS idx_env_mut_status   ON golf_envelope_mutations(status);
CREATE INDEX IF NOT EXISTS idx_env_mut_queued   ON golf_envelope_mutations(queued_at);
CREATE INDEX IF NOT EXISTS idx_env_mut_target   ON golf_envelope_mutations(target_path);

CREATE TABLE IF NOT EXISTS ledger_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- ledger_schema_version is set by LedgerStoreEngine.migrate() AFTER successful
-- application of this DDL, NOT here. Seeding it here would make the first
-- migrate(1) call report alreadyAtVersion=true on a genuinely-fresh DB, which
-- breaks the contract "migrate applies DDL if not at version". The only
-- bootstrap-time seed is the init timestamp, used for ops auditing only.
INSERT OR IGNORE INTO ledger_meta(key, value) VALUES('ledger_initialized_at', CAST(strftime('%s', 'now') AS TEXT));
