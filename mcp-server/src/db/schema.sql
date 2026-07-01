-- PRISM Database Schema — PostgreSQL
-- DQ-MS0: Production persistence layer
-- Run: psql -d prism -f schema.sql

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================================
-- USERS & AUTH
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'engineer', 'operator', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================================
-- MATERIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  iso_group VARCHAR(2) NOT NULL CHECK (iso_group IN ('P', 'M', 'K', 'N', 'S', 'H')),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  density_kg_m3 NUMERIC(10,2),
  hardness_hrc NUMERIC(5,1),
  tensile_strength_mpa NUMERIC(10,2),
  thermal_conductivity NUMERIC(10,3),
  machinability_factor NUMERIC(5,3) DEFAULT 1.0,
  specific_cutting_force_n_mm2 NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_iso ON materials(iso_group);
CREATE INDEX idx_materials_name_trgm ON materials USING gin(name gin_trgm_ops);

-- ============================================================================
-- MACHINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('mill', 'lathe', 'mill_turn', 'grinder', 'edm', 'swiss', 'router')),
  controller VARCHAR(100),
  max_rpm INTEGER,
  max_power_kw NUMERIC(8,2),
  max_torque_nm NUMERIC(8,2),
  spindle_taper VARCHAR(20),
  x_travel_mm NUMERIC(10,2),
  y_travel_mm NUMERIC(10,2),
  z_travel_mm NUMERIC(10,2),
  tool_capacity INTEGER,
  pallet_count INTEGER DEFAULT 1,
  hourly_rate_usd NUMERIC(8,2),
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_machines_type ON machines(type);
CREATE INDEX idx_machines_brand ON machines(brand);

-- ============================================================================
-- JOBS & QUOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_exempt BOOLEAN DEFAULT false,
  payment_terms INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  total_price_usd NUMERIC(12,2),
  material_cost_usd NUMERIC(10,2),
  labor_cost_usd NUMERIC(10,2),
  overhead_cost_usd NUMERIC(10,2),
  margin_pct NUMERIC(5,2),
  lead_time_days INTEGER,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  part_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  material_id UUID REFERENCES materials(id),
  machine_id UUID REFERENCES machines(id),
  cycle_time_min NUMERIC(8,2),
  setup_time_min NUMERIC(8,2),
  unit_price_usd NUMERIC(10,2),
  notes TEXT,
  seq_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number VARCHAR(50) UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'on_hold', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  due_date DATE,
  machine_id UUID REFERENCES machines(id),
  material_id UUID REFERENCES materials(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  completed_qty INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_due_date ON jobs(due_date);
CREATE INDEX idx_jobs_machine ON jobs(machine_id);

-- ============================================================================
-- TOOLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id VARCHAR(100) UNIQUE,
  manufacturer VARCHAR(100) NOT NULL,
  series VARCHAR(100),
  designation VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  subtype VARCHAR(50),
  material VARCHAR(50),
  coating VARCHAR(50),
  cutting_diameter_mm NUMERIC(8,3) NOT NULL,
  shank_diameter_mm NUMERIC(8,3),
  flute_length_mm NUMERIC(8,2),
  overall_length_mm NUMERIC(8,2),
  flute_count INTEGER,
  max_rpm INTEGER,
  current_life_pct NUMERIC(5,1) DEFAULT 100.0,
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tools_manufacturer ON tools(manufacturer);
CREATE INDEX idx_tools_type ON tools(type);
CREATE INDEX idx_tools_diameter ON tools(cutting_diameter_mm);

-- ============================================================================
-- AUDIT LOG (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  method VARCHAR(10),
  path VARCHAR(500),
  ip_address INET,
  user_agent TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- SAFETY SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS safety_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  machine_id UUID REFERENCES machines(id),
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 1),
  factors JSONB NOT NULL DEFAULT '{}',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_by VARCHAR(100) DEFAULT 'system'
);

CREATE INDEX idx_safety_job ON safety_scores(job_id);
CREATE INDEX idx_safety_machine ON safety_scores(machine_id);

-- ============================================================================
-- SCHEMA MIGRATIONS TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64)
);

INSERT INTO schema_migrations (version, name) VALUES ('001', 'initial_schema')
ON CONFLICT (version) DO NOTHING;
