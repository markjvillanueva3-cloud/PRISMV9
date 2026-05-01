-- Migration 011: Employee model enhancements for EMP-MS0
-- Adds clearance_level, auth_user_id, overtime_policy, shift_differential

ALTER TABLE employees ADD COLUMN IF NOT EXISTS clearance_level TEXT DEFAULT 'shop_floor'
  CHECK (clearance_level IN ('shop_floor', 'lead', 'hr_manager', 'admin'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS overtime_policy JSONB DEFAULT '{"rule":"weekly","daily_threshold_hrs":8,"weekly_threshold_hrs":40,"ot_multiplier":1.5,"dt_multiplier":2.0}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_differential JSONB;

CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_clearance ON employees(clearance_level);
