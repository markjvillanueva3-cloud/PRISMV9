/**
 * Business Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all prism_business actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/businessActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const str = z.string().min(1);
const optBool = z.boolean().optional();

// ============================================================================
// FINANCIAL (4)
// ============================================================================

const financial_npv = z.object({
  cash_flows: z.array(z.number()).optional(),
  cashFlows: z.array(z.number()).optional(),
  discount_rate: z.number().optional(),
  discountRate: z.number().optional(),
}).passthrough();

const financial_irr = z.object({
  cash_flows: z.array(z.number()).optional(),
  cashFlows: z.array(z.number()).optional(),
  guess: z.number().optional(),
}).passthrough();

const financial_breakeven = z.object({
  fixed_costs: z.number().optional(),
  fixedCosts: z.number().optional(),
  price_per_unit: z.number().optional(),
  pricePerUnit: z.number().optional(),
  variable_cost_per_unit: z.number().optional(),
  variableCostPerUnit: z.number().optional(),
}).passthrough();

const financial_machine_investment = z.object({
  machine_cost: optNum,
  annual_revenue: optNum,
  annual_costs: optNum,
  useful_life_years: optNum,
  salvage_value: optNum,
}).passthrough();

// ============================================================================
// INVENTORY (4)
// ============================================================================

const inventory_eoq = z.object({
  annual_demand: optNum,
  order_cost: optNum,
  holding_cost: optNum,
}).passthrough();

const inventory_safety_stock = z.object({
  avg_demand: optNum,
  demand_std_dev: optNum,
  avg_lead_time: optNum,
  lead_time_std_dev: optNum,
  service_level: optNum,
}).passthrough();

const inventory_abc = z.object({
  items: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const inventory_tool_optimize = z.object({
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

// ============================================================================
// JOB LIFECYCLE (4)
// ============================================================================

const job_create = z.object({
  customer: optStr,
  part_number: optStr,
  quantity: optNum,
  due_date: optStr,
  material: optStr,
  notes: optStr,
}).passthrough();

const job_update_status = z.object({
  job_id: optStr,
  jobId: optStr,
  status: optStr,
  new_status: optStr,
  user: optStr,
  notes: optStr,
}).passthrough();

const job_summary = z.object({
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const job_dashboard = z.object({}).passthrough();

// ============================================================================
// PURCHASING (4)
// ============================================================================

const purchasing_search = z.object({
  query: z.string().optional(),
}).passthrough();

const purchasing_recommend = z.object({
  need: optStr,
  query: optStr,
  priority: optStr,
}).passthrough();

const purchasing_manufacturers = z.object({
  category: optStr,
}).passthrough();

const purchasing_summary = z.object({}).passthrough();

// ============================================================================
// COSTING (3)
// ============================================================================

const costing_job_cost = z.object({
  material_cost: optNum,
  machine_time_min: optNum,
  machine_rate_hr: optNum,
  setup_time_min: optNum,
  quantity: optNum,
}).passthrough();

const costing_material = z.object({
  material: optStr,
  weight_kg: optNum,
  cost_per_kg: optNum,
}).passthrough();

const costing_machining = z.object({
  cycle_time_min: optNum,
  machine_rate_hr: optNum,
  setup_time_min: optNum,
}).passthrough();

// ============================================================================
// QUOTING (2)
// ============================================================================

const quoting_generate = z.object({
  rush: optBool,
  repeat_order: optBool,
  repeatOrder: optBool,
  target_margin: optNum,
  targetMargin: optNum,
  customer: optStr,
  notes: optStr,
}).passthrough();

const quoting_price_breaks = z.object({
  quantities: z.array(z.number()).optional(),
}).passthrough();

// ============================================================================
// SCHEDULING (4)
// ============================================================================

const scheduling_single_machine = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
  rule: z.string().optional(),
}).passthrough();

const scheduling_johnsons = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const scheduling_job_shop = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
  machines: z.array(z.record(z.string(), z.unknown())).optional(),
  rule: z.string().optional(),
}).passthrough();

const scheduling_cpm = z.object({
  activities: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

// ============================================================================
// REPORTING (6)
// ============================================================================

const reporting_dashboard = z.object({
  production: z.array(z.record(z.string(), z.unknown())).optional(),
  quality: z.array(z.record(z.string(), z.unknown())).optional(),
  period: optStr,
}).passthrough();

const reporting_pareto = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const reporting_production = z.object({
  records: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const reporting_quality = z.object({
  records: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const reporting_financial = z.object({
  records: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const reporting_trend = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  window_size: z.number().int().min(1).optional(),
  windowSize: z.number().int().min(1).optional(),
}).passthrough();

// ============================================================================
// EMPLOYEE (5)
// ============================================================================

const employee_create = z.object({
  name: optStr,
  department: optStr,
  role: optStr,
  hourly_rate: optNum,
}).passthrough();

const employee_search = z.object({
  query: optStr,
  department: optStr,
  skill: optStr,
}).passthrough();

const employee_add_skill = z.object({
  employee_id: optStr,
  employeeId: optStr,
  skill: z.record(z.string(), z.unknown()).optional(),
  skill_name: optStr,
  level: z.number().int().min(1).max(5).optional(),
}).passthrough();

const employee_utilization = z.object({
  employee_id: optStr,
  employeeId: optStr,
  period: optStr,
  scheduled_hours: optNum,
  scheduledHours: optNum,
  time_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  timeEntries: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const employee_dept_summary = z.object({}).passthrough();

// ============================================================================
// TIMECLOCK (7)
// ============================================================================

const clock_in = z.object({
  employee_id: optStr,
  employeeId: optStr,
  timestamp: optStr,
}).passthrough();

const clock_out = z.object({
  employee_id: optStr,
  employeeId: optStr,
  timestamp: optStr,
}).passthrough();

const job_time_start = z.object({
  employee_id: optStr,
  employeeId: optStr,
  job_id: optStr,
  jobId: optStr,
  operation: optStr,
  machine_id: optStr,
  machineId: optStr,
  timestamp: optStr,
}).passthrough();

const job_time_stop = z.object({
  employee_id: optStr,
  employeeId: optStr,
  job_id: optStr,
  jobId: optStr,
  timestamp: optStr,
  notes: optStr,
}).passthrough();

const timecard_summary = z.object({
  employee_id: optStr,
  employeeId: optStr,
  period: optStr,
  start_date: optStr,
  startDate: optStr,
  end_date: optStr,
  endDate: optStr,
}).passthrough();

const attendance_report = z.object({
  start_date: optStr,
  startDate: optStr,
  end_date: optStr,
  endDate: optStr,
  department: optStr,
}).passthrough();

const who_clocked_in = z.object({}).passthrough();

// ============================================================================
// PAYROLL (3)
// ============================================================================

const payroll_create_period = z.object({
  start_date: optStr,
  startDate: optStr,
  end_date: optStr,
  endDate: optStr,
  pay_date: optStr,
  payDate: optStr,
  type: z.string().optional(),
}).passthrough();

const payroll_run = z.object({
  period_id: optStr,
  periodId: optStr,
}).passthrough();

const payroll_pay_stub = z.object({
  employee_id: optStr,
  employeeId: optStr,
  period_id: optStr,
  periodId: optStr,
}).passthrough();

// ============================================================================
// INVOICING (5)
// ============================================================================

const invoice_create = z.object({
  customer_id: optStr,
  customer_name: optStr,
  line_items: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const invoice_from_job = z.object({
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const invoice_payment = z.object({
  invoice_id: optStr,
  invoiceId: optStr,
  amount: z.number().optional(),
  method: optStr,
  reference: optStr,
  date: optStr,
  notes: optStr,
}).passthrough();

const invoice_list = z.object({
  status: optStr,
  customer_name: optStr,
  customerName: optStr,
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const invoice_aging = z.object({}).passthrough();

// ============================================================================
// TOOL USAGE (6)
// ============================================================================

const tool_inventory_add = z.object({
  tool_type: optStr,
  manufacturer: optStr,
  part_number: optStr,
  description: optStr,
  cost_per_edge: optNum,
  edges_per_insert: optNum,
}).passthrough();

const tool_start_usage = z.object({
  tool_id: optStr,
  toolId: optStr,
  job_id: optStr,
  jobId: optStr,
  operation: optStr,
  machine_id: optStr,
  machineId: optStr,
  employee_id: optStr,
  employeeId: optStr,
  timestamp: optStr,
}).passthrough();

const tool_end_usage = z.object({
  usage_id: optStr,
  usageId: optStr,
  cutting_minutes: optNum,
  cuttingMinutes: optNum,
  parts_cut: optNum,
  partsCut: optNum,
  wear_pct: optNum,
  wearPct: optNum,
  status: optStr,
  timestamp: optStr,
  notes: optStr,
}).passthrough();

const tool_regrind = z.object({
  tool_id: optStr,
  toolId: optStr,
  restored_life_pct: optNum,
  restoredLifePct: optNum,
}).passthrough();

const tool_job_cost = z.object({
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const tool_reorder_alerts = z.object({}).passthrough();

// ============================================================================
// ACTUAL COST (3 + 3 enhancements)
// ============================================================================

const actual_cost_calculate = z.object({
  job_id: optStr,
  material_cost: optNum,
  labor_cost: optNum,
  overhead_cost: optNum,
}).passthrough();

const actual_cost_variance = z.object({
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const actual_cost_profitability = z.object({
  job_id: optStr,
  jobId: optStr,
}).passthrough();

const actual_cost_forecast = z.object({
  job_id: z.string().optional(),
  pct_complete: z.number().optional(),
}).passthrough();

const actual_cost_margin_alerts = z.object({
  threshold_pct: z.number().optional(),
}).passthrough();

const actual_cost_trend = z.object({
  job_ids: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// QUOTE ESTIMATOR (4)
// ============================================================================

const quote_estimate = z.object({
  material: optStr,
  quantity: optNum,
  complexity: optStr,
}).passthrough();

const quote_compare_materials = z.object({
  materials: z.array(z.string()).optional(),
}).passthrough();

const quote_what_if = z.object({
  scenarios: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const quote_price_breaks_advanced = z.object({
  quantity: optNum,
  material: optStr,
}).passthrough();

// ============================================================================
// SECONDARY OPS (5)
// ============================================================================

const sec_ops_list = z.object({
  category: optStr,
}).passthrough();

const sec_ops_quote = z.object({
  operation_id: optStr,
  operationId: optStr,
  quantity: z.number().int().optional(),
  material: optStr,
  requires_masking: optBool,
  requiresMasking: optBool,
  masking_areas: optNum,
  maskingAreas: optNum,
  rush: optBool,
  vendor_quote_override: optNum,
  vendorQuoteOverride: optNum,
}).passthrough();

const sec_ops_batch_quote = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const sec_ops_find_vendors = z.object({
  operation_id: optStr,
  operationId: optStr,
}).passthrough();

const sec_ops_recommend = z.object({
  material: z.string().optional(),
  application: z.string().optional(),
}).passthrough();

// ============================================================================
// QUOTE ANALYTICS (6)
// ============================================================================

const analytics_record = z.object({
  quote_id: optStr,
  customer: optStr,
  total_price: optNum,
}).passthrough();

const analytics_update_outcome = z.object({
  quote_id: optStr,
  quoteId: optStr,
  status: optStr,
  loss_reason: optStr,
  lossReason: optStr,
  loss_notes: optStr,
  lossNotes: optStr,
  competing_price: optNum,
  competingPrice: optNum,
}).passthrough();

const analytics_record_actuals = z.object({
  quote_id: optStr,
  quoteId: optStr,
  cost_breakdown: z.record(z.string(), z.unknown()).optional(),
  costBreakdown: z.record(z.string(), z.unknown()).optional(),
  cycle_time_min: optNum,
  cycleTimeMin: optNum,
  lead_days: optNum,
  leadDays: optNum,
}).passthrough();

const analytics_accuracy = z.object({}).passthrough();

const analytics_conversion = z.object({}).passthrough();

const analytics_calibration = z.object({}).passthrough();

// ============================================================================
// ORDER MANAGER (8)
// ============================================================================

const order_create = z.object({
  customer: optStr,
  part_number: optStr,
  quantity: optNum,
}).passthrough();

const order_update_status = z.object({
  order_id: optStr,
  orderId: optStr,
  status: optStr,
  notes: optStr,
}).passthrough();

const order_list = z.object({
  status: optStr,
}).passthrough();

const order_work_order_create = z.object({
  order_id: optStr,
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const order_log_time = z.object({
  wo_id: optStr,
  woId: optStr,
  minutes: z.number().optional(),
}).passthrough();

const order_log_production = z.object({
  wo_id: optStr,
  woId: optStr,
  quantity: z.number().optional(),
  scrap: z.number().optional(),
}).passthrough();

const order_machine_queue = z.object({
  machine: z.string().optional(),
}).passthrough();

const order_metrics = z.object({}).passthrough();

// ============================================================================
// PURCHASE ORDERS (7)
// ============================================================================

const po_create = z.object({
  supplier_id: z.string().optional(),
  supplier_name: z.string().optional(),
  line_items: z.array(z.record(z.string(), z.unknown())).optional(),
  payment_terms: optStr,
  notes: optStr,
  linked_jobs: z.array(z.string()).optional(),
}).passthrough();

const po_approve = z.object({
  po_id: z.string().optional(),
  approved_by: z.string().optional(),
}).passthrough();

const po_receive = z.object({
  po_id: z.string().optional(),
  received_by: z.string().optional(),
  line_items: z.array(z.record(z.string(), z.unknown())).optional(),
  packing_slip: optStr,
}).passthrough();

const po_three_way_match = z.object({
  po_id: z.string().optional(),
  invoice_total: z.number().optional(),
  invoice_line_prices: z.array(z.number()).optional(),
}).passthrough();

const po_list = z.object({
  status: optStr,
  supplier: optStr,
}).passthrough();

const po_ap_aging = z.object({}).passthrough();

const po_spend_by_category = z.object({}).passthrough();

// ============================================================================
// GENERAL LEDGER (9)
// ============================================================================

const gl_chart_of_accounts = z.object({}).passthrough();

const gl_journal_entry = z.object({
  date: optStr,
  description: z.string().optional(),
  source: z.string().optional(),
  reference_id: optStr,
  lines: z.array(z.record(z.string(), z.unknown())).optional(),
  auto_post: optBool,
}).passthrough();

const gl_record_invoice = z.object({
  invoice_id: z.string().optional(),
  amount: z.number().optional(),
  tax: z.number().optional(),
  date: optStr,
}).passthrough();

const gl_record_payment = z.object({
  invoice_id: z.string().optional(),
  amount: z.number().optional(),
  date: optStr,
}).passthrough();

const gl_record_purchase = z.object({
  po_id: z.string().optional(),
  amount: z.number().optional(),
  tax: z.number().optional(),
  category: z.string().optional(),
  date: optStr,
}).passthrough();

const gl_record_payroll = z.object({
  period: z.string().optional(),
  gross: z.number().optional(),
  taxes: z.number().optional(),
  net: z.number().optional(),
  date: optStr,
}).passthrough();

const gl_trial_balance = z.object({
  as_of: optStr,
}).passthrough();

const gl_income_statement = z.object({
  period_start: z.string().optional(),
  period_end: z.string().optional(),
}).passthrough();

const gl_balance_sheet = z.object({
  as_of: optStr,
}).passthrough();

// ============================================================================
// CAPACITY PLANNING (7)
// ============================================================================

const capacity_machines = z.object({}).passthrough();

const capacity_schedule_job = z.object({
  job_id: z.string().optional(),
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  due_date: z.string().optional(),
  priority: z.number().optional(),
}).passthrough();

const capacity_machine_load = z.object({
  machine_id: z.string().optional(),
  period_weeks: z.number().optional(),
}).passthrough();

const capacity_all_loads = z.object({
  period_weeks: z.number().optional(),
}).passthrough();

const capacity_bottlenecks = z.object({
  period_weeks: z.number().optional(),
}).passthrough();

const capacity_what_if = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  desired_start: optStr,
  desired_end: optStr,
}).passthrough();

const capacity_summary = z.object({}).passthrough();

// ============================================================================
// QUALITY MANAGEMENT (12)
// ============================================================================

const quality_spc_chart = z.object({
  characteristic: z.string().optional(),
  part_number: z.string().optional(),
  operation: z.string().optional(),
  nominal: z.number().optional(),
  usl: z.number().optional(),
  lsl: z.number().optional(),
  data: z.array(z.number()).optional(),
  subgroup_size: z.number().int().optional(),
}).passthrough();

const quality_calibration_add = z.object({
  equipment_id: z.string().optional(),
  equipment_name: z.string().optional(),
  type: z.string().optional(),
  serial_number: z.string().optional(),
  last_calibration: z.string().optional(),
  next_calibration: z.string().optional(),
  calibrated_by: z.string().optional(),
  certificate_number: optStr,
  accuracy: z.string().optional(),
}).passthrough();

const quality_calibration_dashboard = z.object({}).passthrough();

const quality_material_cert = z.object({
  heat_lot: z.string().optional(),
  material: z.string().optional(),
  supplier: z.string().optional(),
  po_number: optStr,
  cert_date: z.string().optional(),
  properties: z.array(z.record(z.string(), z.unknown())).optional(),
  linked_jobs: z.array(z.string()).optional(),
  document_ref: optStr,
}).passthrough();

const quality_trace_heat_lot = z.object({
  heat_lot: z.string().optional(),
}).passthrough();

const quality_trace_job = z.object({
  job_id: z.string().optional(),
}).passthrough();

const quality_ncr_create = z.object({
  job_id: z.string().optional(),
  part_number: z.string().optional(),
  created_by: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(["minor", "major", "critical"]).optional(),
  category: z.enum(["dimensional", "surface", "material", "process", "documentation"]).optional(),
  disposition: z.enum(["pending", "use_as_is", "rework", "scrap", "return_to_vendor"]).optional(),
  root_cause: optStr,
  corrective_action: optStr,
  cost_impact: z.number().optional(),
  quantity_affected: z.number().int().optional(),
}).passthrough();

const quality_ncr_update = z.object({
  ncr_id: z.string().optional(),
  disposition: optStr,
  root_cause: optStr,
  corrective_action: optStr,
  status: optStr,
}).passthrough();

const quality_ncr_dashboard = z.object({}).passthrough();

const quality_fai_create = z.object({
  job_id: z.string().optional(),
  part_number: z.string().optional(),
  revision: z.string().optional(),
  inspection_date: z.string().optional(),
  inspector: z.string().optional(),
  characteristics: z.array(z.record(z.string(), z.unknown())).optional(),
  notes: optStr,
}).passthrough();

const quality_fai_list = z.object({
  job_id: optStr,
}).passthrough();

const quality_kpis = z.object({}).passthrough();

// ============================================================================
// MACHINE RATE DATABASE (4)
// ============================================================================

const machine_rate_lookup = z.object({
  machine_id: optStr,
  machine_type: optStr,
}).passthrough();

const machine_rate_list = z.object({
  family: optStr,
}).passthrough();

const machine_rate_compare = z.object({
  machine_ids: z.array(z.string()).optional(),
}).passthrough();

const machine_rate_effective = z.object({
  machine_id: optStr,
  oee_level: optStr,
}).passthrough();

// ============================================================================
// BLUEPRINT -> QUOTE BRIDGE (2)
// ============================================================================

const blueprint_to_quote = z.object({
  analysis: z.record(z.string(), z.unknown()).optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const blueprint_resolve_material = z.object({
  material: z.string().optional(),
}).passthrough();

// ============================================================================
// SHEET METAL QUOTING (1)
// ============================================================================

const sheet_metal_quote = z.object({
  material: optStr,
  thickness_mm: optNum,
  length_mm: optNum,
  width_mm: optNum,
  quantity: optNum,
}).passthrough();

// ============================================================================
// ADDITIVE MANUFACTURING QUOTING (3)
// ============================================================================

const additive_quote = z.object({
  technology: optStr,
  material: optStr,
  volume_cm3: optNum,
  quantity: optNum,
}).passthrough();

const additive_list_materials = z.object({
  technology: optStr,
}).passthrough();

const additive_compare_technologies = z.object({
  options: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// INJECTION MOLD QUOTING (3)
// ============================================================================

const injection_mold_quote = z.object({
  material: optStr,
  part_volume_cm3: optNum,
  quantity: optNum,
  num_cavities: optNum,
}).passthrough();

const injection_mold_materials = z.object({}).passthrough();

const injection_mold_dfm = z.object({
  wall_thickness_mm: optNum,
  draft_angle_deg: optNum,
  undercuts: optBool,
}).passthrough();

// ============================================================================
// STOCK SIZE OPTIMIZER (3)
// ============================================================================

const stock_size_optimize = z.object({
  material: optStr,
  finished_od_mm: optNum,
  finished_length_mm: optNum,
}).passthrough();

const stock_size_catalog = z.object({
  material: z.string().optional(),
}).passthrough();

const stock_size_nesting = z.object({
  parts: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

// ============================================================================
// MARKET MATERIAL PRICING (4)
// ============================================================================

const material_price_lookup = z.object({
  material: optStr,
  form: optStr,
  region: optStr,
}).passthrough();

const material_price_adjust = z.object({
  index: z.string().optional(),
  multiplier: z.number().optional(),
  as_of: optStr,
  trend: z.string().optional(),
}).passthrough();

const material_price_compare = z.object({
  materials: z.array(z.string()).optional(),
  form: optStr,
  region: optStr,
}).passthrough();

const material_surcharge = z.object({
  material: optStr,
  weight_kg: optNum,
}).passthrough();

// ============================================================================
// HR & COMPLIANCE (16)
// ============================================================================

const hr_benefits_list = z.object({}).passthrough();

const hr_enroll = z.object({
  employee_id: z.string().optional(),
  plan_ids: z.array(z.string()).optional(),
}).passthrough();

const hr_enrollment = z.object({
  employee_id: z.string().optional(),
}).passthrough();

const hr_pto_init = z.object({
  employee_id: z.string().optional(),
  years_of_service: z.number().optional(),
}).passthrough();

const hr_pto_request = z.object({
  employee_id: z.string().optional(),
  type: z.enum(["vacation", "sick", "personal", "bereavement"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  hours: z.number().optional(),
  notes: optStr,
}).passthrough();

const hr_pto_approve = z.object({
  request_id: z.string().optional(),
  approved_by: z.string().optional(),
}).passthrough();

const hr_pto_balance = z.object({
  employee_id: z.string().optional(),
}).passthrough();

const hr_training_add = z.object({
  employee_id: z.string().optional(),
  course_name: z.string().optional(),
  category: z.string().optional(),
  completed_date: z.string().optional(),
  expiration_date: optStr,
  instructor: optStr,
  score: optNum,
  certificate_id: optStr,
}).passthrough();

const hr_training_history = z.object({
  employee_id: z.string().optional(),
}).passthrough();

const hr_training_expiring = z.object({
  within_days: z.number().int().optional(),
}).passthrough();

const hr_review_create = z.object({
  employee_id: z.string().optional(),
  reviewer_id: z.string().optional(),
  review_date: z.string().optional(),
  period: z.string().optional(),
  overall_rating: z.number().min(1).max(5).optional(),
  categories: z.array(z.record(z.string(), z.unknown())).optional(),
  goals: z.array(z.string()).optional(),
  compensation_change: z.record(z.string(), z.unknown()).optional(),
  notes: optStr,
}).passthrough();

const hr_reviews = z.object({
  employee_id: z.string().optional(),
}).passthrough();

const hr_compensation_history = z.object({
  employee_id: z.string().optional(),
}).passthrough();

const hr_compliance_alerts = z.object({}).passthrough();

const hr_dashboard = z.object({}).passthrough();

// ============================================================================
// CUSTOMER MANAGEMENT (14)
// ============================================================================

const customer_create = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.record(z.string(), z.string()).optional(),
  credit_limit: z.number().optional(),
  payment_terms: z.string().optional(),
  pricing_tier: z.string().optional(),
  discount_pct: z.number().min(0).max(100).optional(),
  tax_exempt: optBool,
  tax_id: optStr,
  tags: z.array(z.string()).optional(),
  notes: optStr,
  status: optStr,
}).passthrough();

const customer_get = z.object({
  customer_id: optStr,
  id: optStr,
}).passthrough();

const customer_update = z.object({
  customer_id: optStr,
  id: optStr,
  updates: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const customer_search = z.object({
  query: optStr,
  q: optStr,
}).passthrough();

const customer_list = z.object({
  status: optStr,
  tier: optStr,
  pricing_tier: optStr,
}).passthrough();

const customer_credit_check = z.object({
  customer_id: z.string().optional(),
  order_amount: z.number().optional(),
}).passthrough();

const customer_log_comm = z.object({
  customer_id: z.string().optional(),
  date: optStr,
  type: z.string().optional(),
  subject: z.string().optional(),
  details: z.string().optional(),
  logged_by: z.string().optional(),
  follow_up_date: optStr,
  follow_up_done: optBool,
}).passthrough();

const customer_comm_history = z.object({
  customer_id: z.string().optional(),
  limit: z.number().int().optional(),
}).passthrough();

const customer_follow_ups = z.object({}).passthrough();

const customer_create_opportunity = z.object({
  customer_id: z.string().optional(),
  description: z.string().optional(),
  estimated_value: z.number().optional(),
  stage: z.string().optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  close_date: optStr,
  quote_id: optStr,
}).passthrough();

const customer_update_opportunity = z.object({
  opportunity_id: optStr,
  id: optStr,
  stage: optStr,
  probability_pct: z.number().min(0).max(100).optional(),
  close_date: optStr,
  lost_reason: optStr,
}).passthrough();

const customer_pipeline = z.object({}).passthrough();

const customer_analytics = z.object({
  customer_id: z.string().optional(),
}).passthrough();

const customer_top = z.object({
  limit: z.number().int().optional(),
}).passthrough();

// ============================================================================
// INTEGRATION / EXPORT (6)
// ============================================================================

const integration_export_qb = z.object({
  transactions: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const integration_export_csv = z.object({
  transactions: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const integration_export_payroll_tax = z.object({
  period: z.string().optional(),
  employees: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const integration_reconcile_bank = z.object({
  statement_date: z.string().optional(),
  bank_balance: z.number().optional(),
  book_balance: z.number().optional(),
  deposits_in_transit: z.array(z.number()).optional(),
  outstanding_checks: z.array(z.number()).optional(),
  bank_charges: optNum,
  interest_earned: optNum,
}).passthrough();

const integration_export_ar_aging = z.object({
  invoices: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const integration_formats = z.object({}).passthrough();

// ============================================================================
// BATCH OPTIMIZATION (4)
// ============================================================================

const batch_group = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const batch_sequence = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const batch_setup_matrix = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const batch_capacity = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())).optional(),
  available_hours_per_day: z.number().optional(),
  horizon_days: z.number().int().optional(),
}).passthrough();

// ============================================================================
// LEARNING PATH (4)
// ============================================================================

const learning_assess = z.object({
  operator_id: z.string().optional(),
  current_skills: z.record(z.string(), z.number()).optional(),
  target_role: z.string().optional(),
}).passthrough();

const learning_plan = z.object({
  operator_id: z.string().optional(),
  current_skills: z.record(z.string(), z.number()).optional(),
  target_role: z.string().optional(),
}).passthrough();

const learning_progress = z.object({
  operator_id: z.string().optional(),
  current_skills: z.record(z.string(), z.number()).optional(),
  target_role: z.string().optional(),
  completed_module_ids: z.array(z.string()).optional(),
}).passthrough();

const learning_recommend = z.object({
  current_skills: z.record(z.string(), z.number()).optional(),
}).passthrough();

// ============================================================================
// CASTING QUOTING (4)
// ============================================================================

const casting_quote = z.object({
  process: z.string().optional(),
  material: z.string().optional(),
  part_volume_cm3: z.number().optional(),
  bounding_box_cm3: optNum,
  quantity: z.number().int().optional(),
  annual_volume: optNum,
  num_cores: optNum,
  num_slides: optNum,
  surface_finish: optStr,
  secondary_machining: optBool,
  xray_inspection: optBool,
  heat_treat: optBool,
  tight_tolerance: optBool,
  markup_pct: optNum,
}).passthrough();

const casting_materials = z.object({}).passthrough();

const casting_compare_processes = z.object({
  material: z.string().optional(),
  part_volume_cm3: z.number().optional(),
  quantity: z.number().int().optional(),
}).passthrough();

const casting_dfm = z.object({
  process: z.string().optional(),
  material: z.string().optional(),
  wall_thickness_mm: z.number().optional(),
  draft_angle_deg: optNum,
  undercuts: optBool,
  max_section_mm: optNum,
  cores: optNum,
}).passthrough();

// ============================================================================
// WELD/FABRICATION QUOTING (3)
// ============================================================================

const weld_fab_quote = z.object({
  joints: z.array(z.record(z.string(), z.unknown())).optional(),
  process: optStr,
  material: z.string().optional(),
  filler_density_kg_m3: optNum,
  nde_method: optStr,
  nde_coverage_pct: optNum,
  stress_relief: optBool,
  hot_dip_galvanize: optBool,
  blast_and_paint: optBool,
  quantity: optNum,
  fit_up_hours: optNum,
  markup_pct: optNum,
}).passthrough();

const weld_fab_joint_cost = z.object({
  type: z.string().optional(),
  length_mm: z.number().optional(),
  thickness_mm: z.number().optional(),
  process: optStr,
  position: optStr,
}).passthrough();

const weld_fab_consumables = z.object({
  joints: z.array(z.record(z.string(), z.unknown())).optional(),
  process: optStr,
}).passthrough();

// ============================================================================
// MULTI-PROCESS QUOTING (2)
// ============================================================================

const multi_process_quote = z.object({
  project_name: optStr,
  part_name: optStr,
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  quantity: z.number().int().optional(),
  markup_pct: optNum,
  rush: optBool,
  shipping_cost: optNum,
  packaging_cost_per_unit: optNum,
  engineering_hours: optNum,
  engineering_rate_hr: optNum,
}).passthrough();

const multi_process_estimate = z.object({
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  quantity: z.number().int().optional(),
  markup_pct: optNum,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_BUSINESS_SCHEMAS: ActionSchemaMap = {
  // Financial
  financial_npv,
  financial_irr,
  financial_breakeven,
  financial_machine_investment,
  // Inventory
  inventory_eoq,
  inventory_safety_stock,
  inventory_abc,
  inventory_tool_optimize,
  // Job Lifecycle
  job_create,
  job_update_status,
  job_summary,
  job_dashboard,
  // Purchasing
  purchasing_search,
  purchasing_recommend,
  purchasing_manufacturers,
  purchasing_summary,
  // Costing
  costing_job_cost,
  costing_material,
  costing_machining,
  // Quoting
  quoting_generate,
  quoting_price_breaks,
  // Scheduling
  scheduling_single_machine,
  scheduling_johnsons,
  scheduling_job_shop,
  scheduling_cpm,
  // Reporting
  reporting_dashboard,
  reporting_pareto,
  reporting_production,
  reporting_quality,
  reporting_financial,
  reporting_trend,
  // Employee
  employee_create,
  employee_search,
  employee_add_skill,
  employee_utilization,
  employee_dept_summary,
  // TimeClock
  clock_in,
  clock_out,
  job_time_start,
  job_time_stop,
  timecard_summary,
  attendance_report,
  who_clocked_in,
  // Payroll
  payroll_create_period,
  payroll_run,
  payroll_pay_stub,
  // Invoicing
  invoice_create,
  invoice_from_job,
  invoice_payment,
  invoice_list,
  invoice_aging,
  // Tool Usage
  tool_inventory_add,
  tool_start_usage,
  tool_end_usage,
  tool_regrind,
  tool_job_cost,
  tool_reorder_alerts,
  // Actual Cost
  actual_cost_calculate,
  actual_cost_variance,
  actual_cost_profitability,
  actual_cost_forecast,
  actual_cost_margin_alerts,
  actual_cost_trend,
  // Quote Estimator
  quote_estimate,
  quote_compare_materials,
  quote_what_if,
  quote_price_breaks_advanced,
  // Secondary Ops
  sec_ops_list,
  sec_ops_quote,
  sec_ops_batch_quote,
  sec_ops_find_vendors,
  sec_ops_recommend,
  // Quote Analytics
  analytics_record,
  analytics_update_outcome,
  analytics_record_actuals,
  analytics_accuracy,
  analytics_conversion,
  analytics_calibration,
  // Order Manager
  order_create,
  order_update_status,
  order_list,
  order_work_order_create,
  order_log_time,
  order_log_production,
  order_machine_queue,
  order_metrics,
  // Purchase Orders
  po_create,
  po_approve,
  po_receive,
  po_three_way_match,
  po_list,
  po_ap_aging,
  po_spend_by_category,
  // General Ledger
  gl_chart_of_accounts,
  gl_journal_entry,
  gl_record_invoice,
  gl_record_payment,
  gl_record_purchase,
  gl_record_payroll,
  gl_trial_balance,
  gl_income_statement,
  gl_balance_sheet,
  // Capacity Planning
  capacity_machines,
  capacity_schedule_job,
  capacity_machine_load,
  capacity_all_loads,
  capacity_bottlenecks,
  capacity_what_if,
  capacity_summary,
  // Quality Management
  quality_spc_chart,
  quality_calibration_add,
  quality_calibration_dashboard,
  quality_material_cert,
  quality_trace_heat_lot,
  quality_trace_job,
  quality_ncr_create,
  quality_ncr_update,
  quality_ncr_dashboard,
  quality_fai_create,
  quality_fai_list,
  quality_kpis,
  // Machine Rate Database
  machine_rate_lookup,
  machine_rate_list,
  machine_rate_compare,
  machine_rate_effective,
  // Blueprint -> Quote Bridge
  blueprint_to_quote,
  blueprint_resolve_material,
  // Sheet Metal Quoting
  sheet_metal_quote,
  // Additive Manufacturing Quoting
  additive_quote,
  additive_list_materials,
  additive_compare_technologies,
  // Injection Mold Quoting
  injection_mold_quote,
  injection_mold_materials,
  injection_mold_dfm,
  // Stock Size Optimizer
  stock_size_optimize,
  stock_size_catalog,
  stock_size_nesting,
  // Market Material Pricing
  material_price_lookup,
  material_price_adjust,
  material_price_compare,
  material_surcharge,
  // HR & Compliance
  hr_benefits_list,
  hr_enroll,
  hr_enrollment,
  hr_pto_init,
  hr_pto_request,
  hr_pto_approve,
  hr_pto_balance,
  hr_training_add,
  hr_training_history,
  hr_training_expiring,
  hr_review_create,
  hr_reviews,
  hr_compensation_history,
  hr_compliance_alerts,
  hr_dashboard,
  // Customer Management
  customer_create,
  customer_get,
  customer_update,
  customer_search,
  customer_list,
  customer_credit_check,
  customer_log_comm,
  customer_comm_history,
  customer_follow_ups,
  customer_create_opportunity,
  customer_update_opportunity,
  customer_pipeline,
  customer_analytics,
  customer_top,
  // Integration / Export
  integration_export_qb,
  integration_export_csv,
  integration_export_payroll_tax,
  integration_reconcile_bank,
  integration_export_ar_aging,
  integration_formats,
  // Batch Optimization
  batch_group,
  batch_sequence,
  batch_setup_matrix,
  batch_capacity,
  // Learning Path
  learning_assess,
  learning_plan,
  learning_progress,
  learning_recommend,
  // Casting Quoting
  casting_quote,
  casting_materials,
  casting_compare_processes,
  casting_dfm,
  // Weld/Fabrication Quoting
  weld_fab_quote,
  weld_fab_joint_cost,
  weld_fab_consumables,
  // Multi-Process Quoting
  multi_process_quote,
  multi_process_estimate,
};
