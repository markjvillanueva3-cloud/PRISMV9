-- BIZ-MS3 U-BIZ22: Root Cause Analysis table

CREATE TABLE IF NOT EXISTS root_cause_analyses (
  id SERIAL PRIMARY KEY,
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('scrap', 'machine_down', 'quality_defect', 'safety', 'delivery_miss')),
  problem TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  department VARCHAR(100),
  machine_id VARCHAR(50),
  job_number VARCHAR(50),
  five_whys JSONB DEFAULT '[]',
  root_cause TEXT,
  corrective_actions JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'action_required', 'closed', 'verified')),
  assigned_to VARCHAR(100),
  due_date DATE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rca_status ON root_cause_analyses(status);
CREATE INDEX IF NOT EXISTS idx_rca_department ON root_cause_analyses(department);
CREATE INDEX IF NOT EXISTS idx_rca_created_at ON root_cause_analyses(created_at);
