-- BIZ-MS3 U-BIZ19: Kaizen suggestions from improvement_notes

CREATE TABLE IF NOT EXISTS kaizen_suggestions (
  id SERIAL PRIMARY KEY,
  job_time_entry_id INTEGER,
  submitted_by VARCHAR(100) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  improvement_note TEXT NOT NULL,
  job_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'implemented', 'deferred')),
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 10),
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 5),
  estimated_savings NUMERIC(10,2),
  scored_by VARCHAR(100),
  scored_at TIMESTAMPTZ,
  before_condition TEXT,
  after_condition TEXT,
  status_notes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kaizen_status ON kaizen_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_kaizen_submitted_by ON kaizen_suggestions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_kaizen_submitted_at ON kaizen_suggestions(submitted_at);
