-- Migration 013: Align employee/timeclock persistence with live engine contracts
-- Adds business-key columns for shift/job punch upserts and preserves richer engine fields.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS double_time_rate NUMERIC(10,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_assignment JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS skill_details JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certification_details JSONB DEFAULT '[]';

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS shift_entry_id TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS total_hours NUMERIC(6,2);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(6,2);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS double_time_hours NUMERIC(6,2);

ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS job_time_entry_id TEXT;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS shift_entry_id TEXT;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS total_minutes NUMERIC(10,2);
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS productive_minutes NUMERIC(10,2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_shift_entry_id ON time_entries(shift_entry_id) WHERE shift_entry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_time_entries_business_id ON job_time_entries(job_time_entry_id) WHERE job_time_entry_id IS NOT NULL;
