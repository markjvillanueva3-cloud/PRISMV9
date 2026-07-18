-- BIZ-MS3 U-BIZ23: A3 Problem Solving Reports

CREATE TABLE IF NOT EXISTS a3_reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  root_cause_analysis_id INTEGER REFERENCES root_cause_analyses(id),
  source_job_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'closed')),
  sections JSONB NOT NULL DEFAULT '{}',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_a3_rca ON a3_reports(root_cause_analysis_id);
CREATE INDEX IF NOT EXISTS idx_a3_status ON a3_reports(status);
