-- Migration 012: Job time tracking enhancements for EMP-MS0
-- Adds process_type, pause_periods, production tracking, handoff_notes

ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS process_type TEXT DEFAULT 'production_run';
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS pause_periods JSONB DEFAULT '[]';
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS good_parts INTEGER;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS scrap_count INTEGER;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS scrap_reason TEXT;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS improvement_note TEXT;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS takt_time_sec REAL;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS quality_project_id TEXT;

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS handoff_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_job_time_employee_date ON job_time_entries(employee_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, shift_date DESC);
