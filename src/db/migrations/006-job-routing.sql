BEGIN;

-- Migration 006: Job Routing Steps + Dual Time Tracking
-- Session 6-7: Job Traveler system

CREATE TABLE IF NOT EXISTS job_routing_steps (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL,
  step_number   INTEGER NOT NULL,
  operation     TEXT NOT NULL,          -- "Op 10 Saw", "Op 20 Mill", "Op 30 Inspect"
  machine_id    TEXT,
  workcenter    TEXT,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending, setup, running, complete, skipped
  setup_time_min REAL DEFAULT 0,
  cycle_time_min REAL DEFAULT 0,
  est_setup_min  REAL DEFAULT 0,
  est_cycle_min  REAL DEFAULT 0,
  operator_id   TEXT,
  started_at    TEXT,
  completed_at  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, step_number)
);

CREATE TABLE IF NOT EXISTS routing_time_entries (
  id            TEXT PRIMARY KEY,
  routing_step_id TEXT NOT NULL REFERENCES job_routing_steps(id),
  job_id        TEXT NOT NULL,
  entry_type    TEXT NOT NULL,           -- 'setup' or 'cycle'
  operator_id   TEXT,
  start_time    TEXT NOT NULL,
  end_time      TEXT,
  duration_min  REAL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machine_queue (
  id              TEXT PRIMARY KEY,
  machine_id      TEXT NOT NULL,
  job_id          TEXT NOT NULL,
  routing_step_id TEXT REFERENCES job_routing_steps(id),
  priority        INTEGER NOT NULL DEFAULT 100,
  status          TEXT NOT NULL DEFAULT 'queued',  -- queued, active, complete, cancelled
  estimated_start TEXT,
  estimated_complete TEXT,
  actual_start    TEXT,
  actual_complete TEXT,
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  queued_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_routing_steps_job ON job_routing_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_routing_time_step ON routing_time_entries(routing_step_id);
CREATE INDEX IF NOT EXISTS idx_routing_time_job ON routing_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_machine_queue_machine ON machine_queue(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_machine_queue_job ON machine_queue(job_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at, checksum)
VALUES ('006', 'job-routing', now(), md5('006-job-routing'))
ON CONFLICT DO NOTHING;

COMMIT;
