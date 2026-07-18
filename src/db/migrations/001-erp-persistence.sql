-- Migration 001: ERP Persistence Layer
-- PRISM Phase 5 Session 5-1: Persistence Layer Migration
-- Adds tables for all business engine state that currently lives in JavaScript Maps

-- Ensure uuid-ossp extension exists (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- WORK ORDERS (ERP-imported work orders, separate from jobs table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number VARCHAR(50) UNIQUE NOT NULL,
  part_number VARCHAR(100) NOT NULL,
  revision VARCHAR(20) NOT NULL DEFAULT 'A',
  material VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  due_date DATE,
  customer VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'planned', 'in_progress', 'complete', 'cancelled')),
  erp_source VARCHAR(50) DEFAULT 'manual',
  erp_external_id VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_wo_number ON work_orders(wo_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_part_number ON work_orders(part_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer);

-- ============================================================================
-- WORK ORDER ROUTING STEPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS wo_routing_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  operation VARCHAR(100) NOT NULL,
  work_center VARCHAR(100) NOT NULL,
  estimated_time_min NUMERIC(10,2),
  actual_time_min NUMERIC(10,2),
  setup_time_min NUMERIC(10,2),
  tool_list TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_order_id, step)
);

-- ============================================================================
-- PRISM PLANS (PRISM-generated manufacturing plans from work orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prism_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number VARCHAR(50) NOT NULL REFERENCES work_orders(wo_number) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  material VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  total_cycle_time_min NUMERIC(10,2) NOT NULL,
  total_setup_time_min NUMERIC(10,2) NOT NULL,
  estimated_cost JSONB NOT NULL DEFAULT '{}',
  recommendations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prism_plans_wo ON prism_plans(wo_number);

-- ============================================================================
-- PRISM PLAN ROUTING STEPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS prism_plan_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES prism_plans(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  operation VARCHAR(100) NOT NULL,
  work_center VARCHAR(100) NOT NULL,
  prism_cycle_time_min NUMERIC(10,2) NOT NULL,
  prism_setup_time_min NUMERIC(10,2) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  tool_recommendation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, step)
);

-- ============================================================================
-- COST FEEDBACK (actual vs estimated cost tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cost_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number VARCHAR(50) NOT NULL REFERENCES work_orders(wo_number),
  actual_cost JSONB NOT NULL,
  estimated_cost JSONB NOT NULL,
  variance JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_cost_feedback_wo ON cost_feedback(wo_number);
CREATE INDEX IF NOT EXISTS idx_cost_feedback_date ON cost_feedback(recorded_at);

-- ============================================================================
-- QUALITY RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS quality_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number VARCHAR(50) NOT NULL REFERENCES work_orders(wo_number),
  record_type VARCHAR(30) NOT NULL DEFAULT 'inspection'
    CHECK (record_type IN ('inspection', 'fai', 'ncr', 'capa', 'material_cert', 'calibration')),
  inspector VARCHAR(100),
  result VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'pass', 'fail', 'conditional')),
  details JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_records_wo ON quality_records(wo_number);
CREATE INDEX IF NOT EXISTS idx_quality_records_type ON quality_records(record_type);

-- ============================================================================
-- QUALITY MEASUREMENTS (individual dimension/feature measurements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quality_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quality_record_id UUID NOT NULL REFERENCES quality_records(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  nominal NUMERIC(12,4) NOT NULL,
  tolerance_plus NUMERIC(12,4) NOT NULL,
  tolerance_minus NUMERIC(12,4) NOT NULL,
  actual NUMERIC(12,4) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT 'mm',
  in_tolerance BOOLEAN NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_measurements_record ON quality_measurements(quality_record_id);

-- ============================================================================
-- EMPLOYEES (business-layer employee records, supplements auth users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(100),
  role VARCHAR(100) NOT NULL DEFAULT 'operator',
  shift VARCHAR(20) DEFAULT 'day',
  hire_date DATE,
  hourly_rate NUMERIC(8,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  skills TEXT[],
  certifications TEXT[],
  emergency_contact JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- ============================================================================
-- TIME ENTRIES (shift-level clock in/out)
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(200) NOT NULL,
  shift_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'left_early', 'no_show')),
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(shift_date);

-- ============================================================================
-- JOB TIME ENTRIES (job-level time tracking per operation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(200) NOT NULL,
  operation VARCHAR(100),
  machine_id VARCHAR(100),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  elapsed_min NUMERIC(10,2),
  quantity_completed INTEGER DEFAULT 0,
  scrap_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_time_entries_job ON job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_employee ON job_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job_employee ON job_time_entries(job_id, employee_id);

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(100),
  customer_name VARCHAR(200),
  job_id VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'void', 'write_off')),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  payment_terms VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

-- ============================================================================
-- INVOICE LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  seq_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  vendor_id VARCHAR(100),
  vendor_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'ordered', 'partial', 'received', 'cancelled')),
  order_date DATE,
  expected_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  shipping NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  payment_terms VARCHAR(50),
  ship_to TEXT,
  notes TEXT,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ============================================================================
-- PO LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS po_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_description VARCHAR(500) NOT NULL,
  part_number VARCHAR(100),
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  received_qty NUMERIC(10,2) DEFAULT 0,
  seq_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_line_items_po ON po_line_items(po_id);

-- ============================================================================
-- PO RECEIVINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS po_receivings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES po_line_items(id),
  received_qty NUMERIC(10,2) NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by VARCHAR(100),
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'wrong_item', 'short')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_receivings_po ON po_receivings(po_id);

-- ============================================================================
-- GL ACCOUNTS (Chart of Accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(20) NOT NULL
    CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  parent_code VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gl_accounts_type ON gl_accounts(account_type);

-- ============================================================================
-- GL JOURNAL ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description VARCHAR(500) NOT NULL,
  reference VARCHAR(200),
  source VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(20) NOT NULL DEFAULT 'posted'
    CHECK (status IN ('draft', 'posted', 'reversed')),
  total_debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- P0-9: enforce double-entry balance on posted entries
  CONSTRAINT chk_gl_balanced CHECK (status = 'draft' OR total_debit = total_credit),
  posted_by VARCHAR(100),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gl_entries_date ON gl_journal_entries(entry_date);

-- ============================================================================
-- GL JOURNAL LINES (individual debit/credit lines within an entry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES gl_journal_entries(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL REFERENCES gl_accounts(code),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  memo VARCHAR(500),
  seq_order INTEGER NOT NULL DEFAULT 0
);

-- H1: missing FK indexes for common joins
CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_account ON gl_journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_entry ON gl_journal_lines(entry_id);

-- ============================================================================
-- CUSTOMER COMMUNICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id VARCHAR(100) NOT NULL,
  comm_type VARCHAR(20) NOT NULL DEFAULT 'note'
    CHECK (comm_type IN ('note', 'email', 'phone', 'meeting', 'quote_follow_up')),
  subject VARCHAR(500),
  body TEXT,
  direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  logged_by VARCHAR(100),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_comms_customer ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_comms_date ON customer_communications(logged_at);

-- ============================================================================
-- TOOL INVENTORY (shop-level tool crib state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tool_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER DEFAULT 2,
  reorder_quantity INTEGER DEFAULT 5,
  unit_cost NUMERIC(10,2),
  location VARCHAR(100),
  last_used_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_inventory_category ON tool_inventory(category);

-- ============================================================================
-- CUSTOMERS (CRM — customer master records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  company VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  pricing_tier VARCHAR(30) DEFAULT 'standard'
    CHECK (pricing_tier IN ('standard', 'preferred', 'contract', 'distributor')),
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_hold', 'prospect')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- ============================================================================
-- SALES OPPORTUNITIES (CRM — sales pipeline tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  probability_pct INTEGER DEFAULT 50 CHECK (probability_pct BETWEEN 0 AND 100),
  stage VARCHAR(30) NOT NULL DEFAULT 'prospect'
    CHECK (stage IN ('prospect', 'rfq_received', 'quoted', 'negotiation', 'won', 'lost')),
  source VARCHAR(100),
  close_date DATE,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON sales_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON sales_opportunities(stage);

-- ============================================================================
-- SHOP PROFILES (Session 5-2 — shop-specific rates, machines, config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_profiles (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  name VARCHAR(200) NOT NULL DEFAULT 'Default Shop Profile',
  rates JSONB NOT NULL DEFAULT '{}',
  machines JSONB NOT NULL DEFAULT '[]',
  overhead_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (overhead_pct >= 0 AND overhead_pct <= 300),
  material_markup_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (material_markup_pct >= 0 AND material_markup_pct <= 200),
  tooling_cost_per_op NUMERIC(10,2) NOT NULL DEFAULT 15.00 CHECK (tooling_cost_per_op >= 0),
  material_cost_per_part_default NUMERIC(10,2) NOT NULL DEFAULT 25.00 CHECK (material_cost_per_part_default >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================
-- ============================================================================
-- UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION prism_update_modified_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- H21: idempotent trigger creation (DROP IF EXISTS before CREATE)
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'work_orders', 'prism_plans', 'employees', 'time_entries',
    'job_time_entries', 'invoices', 'purchase_orders', 'gl_accounts', 'tool_inventory', 'customers', 'shop_profiles'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION prism_update_modified_column()',
      t, t
    );
  END LOOP;
END $$;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('010', 'erp_persistence_layer', NOW())
ON CONFLICT (version) DO NOTHING;
