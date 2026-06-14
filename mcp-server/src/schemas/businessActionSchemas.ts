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

const commission_report = z.object({
  deals: z.array(z.object({
    salesperson: z.string(),
    revenue: z.number(),
    cost: z.number().optional(),
    margin: z.number().optional(),
    deal_id: optStr,
    closed_date: optStr,
  })).optional(),
  tiers: z.array(z.object({ min_margin_pct: z.number(), rate_pct: z.number() })).optional(),
  period: optStr,
}).passthrough();

const daily_flash_generate = z.object({
  date: optStr,
  requestedBy: optStr,
}).passthrough();

const daily_flash_email = z.object({
  date: optStr,
  requestedBy: optStr,
  recipients: z.array(z.string()).optional(),
}).passthrough();

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
// INSTANT QUOTE PIPELINE (3)
// ============================================================================

const instant_quote = z.object({
  part_name: str.describe("Part name or identifier"),
  material: str.describe("Material key (e.g. aluminum_6061, steel_4140)"),
  quantity: z.number().int().positive().describe("Order quantity"),
  bounding_box_mm: z.object({
    x: posNum.describe("X dimension in mm"),
    y: posNum.describe("Y dimension in mm"),
    z: posNum.describe("Z dimension in mm"),
  }).optional().describe("Part bounding box"),
  part_volume_cm3: optPosNum.describe("Finished part volume in cm³"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  machine_type: optStr.describe("Machine type override"),
  features: z.array(z.object({
    type: str.describe("Feature type (hole, pocket, slot, thread, etc.)"),
    count: z.number().int().positive().describe("Feature count"),
    tolerance_mm: optPosNum.describe("Tightest tolerance in mm"),
    surface_finish_ra: optPosNum.describe("Surface finish Ra in µm"),
    depth_ratio: optPosNum.describe("Depth-to-width ratio"),
    is_blind: optBool.describe("Is blind feature"),
    requires_5axis: optBool.describe("Requires 5-axis access"),
    wall_thickness_mm: optPosNum.describe("Adjacent wall thickness"),
    corner_radius_mm: optPosNum.describe("Internal corner radius"),
  })).optional().describe("Part features for DFM and complexity inference"),
  secondary_ops: z.array(z.object({
    type: str.describe("Secondary op type"),
    vendor_quote: optPosNum,
    notes: optStr,
  })).optional().describe("Secondary operations"),
  inspection_level: z.enum(["minimal", "standard", "detailed", "full_cmm"]).optional(),
  first_article_required: optBool,
  certifications: z.array(z.string()).optional(),
  rush: optBool,
  rush_tier: z.enum(["standard", "3day", "next_day"]).optional(),
  customer_tier: z.enum(["A", "B", "C", "new"]).optional(),
  repeat_order: optBool,
  target_margin_pct: optPosNum,
}).passthrough();

const instant_quote_qty_breaks = z.object({
  unit_price_at_qty: posNum.describe("Current unit price"),
  quantity: z.number().int().positive().describe("Current quantity"),
  machine_type: optStr.describe("Machine type for learning curve"),
  complexity: z.enum(["simple", "medium", "complex", "very_complex"]).optional(),
  setup_cost: optNum.describe("Fixed setup cost"),
  programming_cost: optNum.describe("Fixed programming cost"),
}).passthrough();

const instant_quote_lead_time = z.object({
  base_lead_days: z.number().int().positive().describe("Base lead time in business days"),
  unit_price: posNum.describe("Unit price for tier pricing"),
  quantity: z.number().int().positive().describe("Order quantity"),
}).passthrough();

// ============================================================================
// QUOTE REVISIONS (6)
// ============================================================================

const quote_revise = z.object({
  quote_id: str.describe("Quote ID to revise"),
  unit_price_usd: z.number().min(0).describe("Unit price in USD"),
  total_price_usd: z.number().min(0).describe("Total price in USD"),
  quantity: z.number().int().positive().describe("Quantity"),
  ci95_low_usd: optNum.describe("CI95 lower bound"),
  ci95_high_usd: optNum.describe("CI95 upper bound"),
  confidence_pct: optNum.describe("Confidence percentage 0-100"),
  cost_breakdown: z.record(z.string(), z.unknown()).optional(),
  change_summary: optStr.describe("Description of what changed"),
  revised_by: optStr.describe("User ID who revised"),
}).passthrough();

const quote_get_history = z.object({
  quote_id: str.describe("Quote ID"),
}).passthrough();

const quote_compare_revisions = z.object({
  quote_id: str.describe("Quote ID"),
  revision_a: z.number().int().positive().describe("First revision number"),
  revision_b: z.number().int().positive().describe("Second revision number"),
}).passthrough();

const quote_status_change = z.object({
  quote_id: str.describe("Quote ID"),
  to_status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "revised"]).describe("Target status"),
  changed_by: optStr.describe("User ID"),
  reason: optStr.describe("Reason for status change"),
}).passthrough();

const quote_generate_share_token = z.object({
  quote_id: str.describe("Quote ID"),
  expires_in_days: z.number().int().positive().optional().describe("Token expiry in days (default 30)"),
  created_by: optStr.describe("User ID"),
}).passthrough();

const quote_get_by_token = z.object({
  token: str.describe("Share token string"),
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
// SHOP CONFIGURATION (5) — Session 5-2
// ============================================================================

const shop_config_get = z.object({
  profile_id: optStr,
}).passthrough();

const shop_config_update = z.object({
  profile_id: optStr,
  name: optStr,
  overhead_pct: z.number().optional(),
  material_markup_pct: z.number().optional(),
  tooling_cost_per_op: z.number().optional(),
  material_cost_per_part_default: z.number().optional(),
  rates: z.object({
    labor_per_hr: z.number().optional(),
    overhead_per_hr: z.number().optional(),
    admin_per_hr: z.number().optional(),
    setup_per_hr: z.number().optional(),
    programming_per_hr: z.number().optional(),
    inspection_per_hr: z.number().optional(),
  }).optional(),
  machines: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    hourly_rate: z.number(),
    efficiency_factor: z.number(),
    capabilities: z.array(z.string()),
    hours_per_shift: z.number(),
    shifts_per_day: z.number(),
    days_per_week: z.number(),
  })).optional(),
}).passthrough();

const shop_config_machines = z.object({
  profile_id: optStr,
  machine_id: optStr,
  add: z.object({
    id: z.string(), name: z.string(), type: z.string(),
    hourly_rate: z.number(), efficiency_factor: z.number(),
    capabilities: z.array(z.string()),
    hours_per_shift: z.number(), shifts_per_day: z.number(), days_per_week: z.number(),
  }).optional(),
  update: z.record(z.string(), z.unknown()).optional(),
  remove: optStr,
}).passthrough();

const shop_config_rates = z.object({
  profile_id: optStr,
  update: z.object({
    labor_per_hr: z.number().optional(),
    overhead_per_hr: z.number().optional(),
    admin_per_hr: z.number().optional(),
    setup_per_hr: z.number().optional(),
    programming_per_hr: z.number().optional(),
    inspection_per_hr: z.number().optional(),
  }).optional(),
}).passthrough();

const shop_config_reset = z.object({
  profile_id: optStr,
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
// EQUIPMENT ASSETS (6) — BIZ-MS5 U-BIZ37
// depreciation (straight-line + MACRS 5yr/7yr), registry, transfers, calibration
// ============================================================================

const asset_compute_depreciation = z.object({
  purchase_cost: z.number().positive(),
  salvage_value: z.number().min(0),
  useful_life_years: z.number().positive(),
  method: z.enum(["straight_line", "macrs_5yr", "macrs_7yr"]),
  months_elapsed: z.number().min(0),
}).passthrough();

const asset_register = z.object({
  asset_tag: z.string(),
  name: z.string(),
  category: z.enum(["machine", "fixture", "gage", "tooling", "other"]),
  manufacturer: z.string(),
  model_number: z.string(),
  serial_number: z.string(),
  location: z.string(),
  purchase_date: z.string(),
  purchase_cost: z.number().positive(),
  salvage_value: z.number().min(0),
  useful_life_years: z.number().positive(),
  depreciation_method: z.enum(["straight_line", "macrs_5yr", "macrs_7yr"]),
  status: z.enum(["active", "disposed", "transferred"]),
  calibration_required: z.boolean(),
  last_calibration_date: z.string().optional(),
  next_calibration_date: z.string().optional(),
  calibration_interval_days: z.number().optional(),
  notes: z.string().optional(),
}).passthrough();

const asset_depreciation_schedule = z.object({
  asset_id: z.string(),
}).passthrough();

const asset_list = z.object({
  category: z.enum(["machine", "fixture", "gage", "tooling", "other"]).optional(),
  location: z.string().optional(),
  calibration_required: z.boolean().optional(),
  status: z.enum(["active", "disposed", "transferred"]).optional(),
}).passthrough();

const asset_transfer = z.object({
  asset_id: z.string(),
  to_location: z.string(),
  transferred_by: z.string(),
  reason: z.string(),
}).passthrough();

const asset_calibration_due = z.object({
  days_ahead: z.number().min(0).optional(),
}).passthrough();

// ============================================================================
// PREVENTIVE MAINTENANCE (9) — OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM
// ============================================================================

const pmPartSchema = z.object({
  part_name: z.string().describe("Part name"),
  part_number: z.string().describe("Manufacturer part number"),
  quantity: z.number().int().nonnegative().describe("Quantity required"),
  unit_cost: z.number().nonnegative().describe("Unit cost in USD"),
});

const pm_schedule_create = z.object({
  machine_id: z.string().describe("Machine identifier"),
  machine_name: z.string().describe("Human-readable machine name"),
  task_name: z.string().describe("PM task title (e.g. 'Oil change')"),
  trigger_type: z.enum(["calendar", "hours"]).describe("Schedule trigger"),
  interval_days: z.number().int().positive().optional()
    .describe("Calendar interval (required when trigger_type='calendar')"),
  interval_hours: z.number().positive().optional()
    .describe("Hours interval (required when trigger_type='hours')"),
  last_completed_at: z.string().optional().describe("ISO timestamp of last completion"),
  last_completed_hours: z.number().nonnegative().optional()
    .describe("Machine hours at last completion"),
  parts_list: z.array(pmPartSchema).optional().describe("Parts required for this task"),
  estimated_duration_min: z.number().nonnegative().describe("Estimated duration in minutes"),
  instructions: z.string().describe("Task instructions"),
}).passthrough();

const pm_schedule_list = z.object({
  machine_id: z.string().optional().describe("Filter by machine id"),
  overdue_only: z.boolean().optional().describe("Only return overdue schedules"),
}).passthrough();

const pm_schedule_is_due = z.object({
  schedule_id: z.string().describe("Schedule id to check"),
  current_hours: z.number().nonnegative().optional()
    .describe("Current machine hours (needed for hours-trigger schedules)"),
}).passthrough();

const pm_work_order_generate = z.object({
  schedule_id: z.string().describe("Parent PM schedule id"),
  scheduled_date: z.string().describe("ISO date when the WO should run"),
}).passthrough();

const pm_work_order_complete = z.object({
  work_order_id: z.string().describe("Work order id"),
  labor_hours: z.number().nonnegative().describe("Actual labor hours spent"),
  notes: z.string().optional().describe("Completion notes"),
  parts_used: z.array(pmPartSchema).optional().describe("Actual parts consumed (overrides parts_list)"),
}).passthrough();

const pm_overdue_alerts = z.object({
  current_machine_hours: z.record(z.string(), z.number().nonnegative()).optional()
    .describe("Machine id → current hours map (for hours-based schedules)"),
}).passthrough();

const pm_downtime_record = z.object({
  machine_id: z.string().describe("Machine identifier"),
  type: z.enum(["scheduled", "unscheduled"]).describe("Downtime type"),
  started_at: z.string().describe("ISO timestamp of downtime start"),
  ended_at: z.string().optional().describe("ISO timestamp of downtime end (open if undefined)"),
  duration_min: z.number().nonnegative().optional().describe("Computed automatically from started_at+ended_at if absent"),
  work_order_id: z.string().optional().describe("Associated work order (if any)"),
  cause: z.string().optional().describe("Free-text cause"),
}).passthrough();

const pm_work_order_list = z.object({
  status: z.enum(["open", "in_progress", "complete", "cancelled"]).optional()
    .describe("Filter by WO status"),
  machine_id: z.string().optional().describe("Filter by machine"),
  assigned_to: z.string().optional().describe("Filter by assignee"),
}).passthrough();

const pm_work_order_assign = z.object({
  work_order_id: z.string().describe("Work order id"),
  assigned_to: z.string().describe("Operator/technician id"),
}).passthrough();

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

const customer_revenue_concentration = z.object({}).passthrough();

const customer_growth_trends = z.object({
  window_days: z.number().int().positive().optional(),
}).passthrough();

const customer_normalize = z.object({
  apply: z.boolean().optional(),
}).passthrough();

const customer_portfolio_sources = z.object({}).passthrough();

const customer_portfolio_list = z.object({}).passthrough();

// customer_name feeds path.join(archiveRoot, name) inside the engine — reject
// path separators and parent-dir traversal so a query cannot escape the archive.
const safeCustomerName = z.string().min(1).max(120)
  .regex(/^[A-Za-z0-9 ._&'()-]+$/, "letters, digits, spaces and ._&'()- only")
  .refine((s) => !s.includes(".."), "parent-directory traversal is not allowed");

const customer_portfolio_mine = z.object({
  customer_name: safeCustomerName,
}).passthrough();

const customer_portfolio_harvest = z.object({
  // Capped: each customer mines up to MAX_PROGRAMS_PER_CUSTOMER .MIN files
  // synchronously — an uncapped harvest is a multi-second blocking call.
  max_customers: z.number().int().positive().max(200).optional(),
}).passthrough();

const customer_portfolio_audit = z.object({}).passthrough();

const customer_portfolio_profile = z.object({
  name_query: safeCustomerName,
}).passthrough();

// ── ERP Quality (ERP-sync layer, distinct from prism_business `quality_ncr_*`) ──

const inspectionTypeEnum = z.enum(["first_article", "in_process", "final", "receiving"]);
const ncrDispositionEnum = z.enum(["scrap", "rework", "use_as_is", "return_to_vendor", "pending"]);

const erp_quality_record_inspection = z.object({
  inspection: z.object({
    workOrderNumber: z.string().min(1),
    operationNumber: z.number().int().nonnegative(),
    partNumber: z.string().min(1),
    inspectorId: z.string().min(1),
    inspectionType: inspectionTypeEnum,
    result: z.enum(["pass", "fail", "conditional"]),
    characteristics: z.array(z.unknown()),
    serialNumber: z.string().optional(),
    notes: z.string().optional(),
  }).passthrough(),
}).passthrough();

const erp_quality_create_ncr = z.object({
  ncr: z.object({
    workOrderNumber: z.string().min(1),
    partNumber: z.string().min(1),
    quantity: z.number().int().nonnegative(),
    defectType: z.string().min(1),
    defectDescription: z.string().min(1),
    disposition: ncrDispositionEnum,
    createdBy: z.string().min(1),
    rootCause: z.string().optional(),
    correctiveAction: z.string().optional(),
  }).passthrough(),
}).passthrough();

const erp_quality_close_ncr = z.object({
  ncr_id: z.string().min(1),
  disposition: ncrDispositionEnum,
  closed_by: z.string().min(1),
  corrective_action: z.string().optional(),
}).passthrough();

const erp_quality_metrics = z.object({
  work_order_number: z.string().min(1),
}).passthrough();

const erp_quality_sync = z.object({
  work_order_number: z.string().min(1),
}).passthrough();

const erp_quality_inspections_by_type = z.object({
  work_order_number: z.string().min(1),
  inspection_type: inspectionTypeEnum,
}).passthrough();

const erp_quality_open_ncrs = z.object({
  work_order_number: z.string().min(1).optional(),
}).passthrough();

const erp_quality_inspection_trend = z.object({
  days: z.number().int().positive().max(365).optional(),
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
// PROGRAMMER PRODUCTIVITY (5)
// ============================================================================

const productivity_log = z.object({
  userId: str,
  eventType: z.enum([
    "sf_calc", "program_check", "crash_prevented",
    "tip_viewed", "course_completed", "tool_selected",
    "safety_check", "tolerance_check",
    "cycle_time_improved", "material_used",
    "operation_used",
  ]),
  details: z.record(z.string(), z.any()).optional(),
}).passthrough();

const productivity_summary = z.object({
  userId: str,
  period: z.enum(["week", "month", "year"]).optional(),
}).passthrough();

const productivity_achievements = z.object({
  userId: str,
}).passthrough();

const productivity_digest = z.object({
  userId: str,
}).passthrough();

const productivity_compare = z.object({
  userId: str,
}).passthrough();

// ============================================================================
// APPROVAL WORKFLOWS (Session 6-6)
// ============================================================================

const entityTypeEnum = z.enum([
  "quote", "purchase_order", "invoice", "payroll", "ncr",
  "job", "change_order", "credit_memo",
]).describe("Entity type for approval workflow");

const workflow_configure = z.object({
  entity_type: entityTypeEnum,
  name: z.string().describe("Workflow name"),
  description: z.string().optional().describe("Workflow description"),
  steps: z.array(z.object({
    step_number: z.number().int().positive().describe("Sequential step number"),
    role_required: z.string().describe("Role required to approve this step"),
    action_label: z.string().describe("Human-readable action description"),
    auto_approve_below_usd: z.number().nonnegative().optional().describe("Auto-approve threshold in USD"),
    timeout_hours: z.number().positive().optional().describe("Hours before step is overdue"),
  })).min(1).describe("Approval steps in order"),
  created_by: z.string().optional().describe("Actor creating the workflow"),
}).passthrough();

const workflow_submit = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().describe("Entity ID to submit for approval"),
  submitted_by: z.string().describe("Actor submitting the approval"),
  entity_amount: z.number().nonnegative().optional().describe("Dollar amount for auto-approve threshold"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata"),
  workflow_name: z.string().optional().describe("Specific workflow name to use"),
}).passthrough();

const workflow_decide = z.object({
  instance_id: z.string().describe("Approval instance ID"),
  decision: z.enum(["approved", "rejected", "delegated"]).describe("Decision"),
  decided_by: z.string().describe("Actor making the decision"),
  reason: z.string().optional().describe("Reason for decision"),
  delegated_to: z.string().optional().describe("Delegate target (required if delegated)"),
  decider_roles: z.array(z.string()).optional().describe("Roles held by decider — validated against step role_required"),
}).passthrough();

const workflow_pending = z.object({
  entity_type: entityTypeEnum.optional(),
  role: z.string().optional().describe("Filter by role required"),
}).passthrough();

const approval_workflow_status = z.object({
  instance_id: z.string().describe("Approval instance ID"),
}).passthrough();

const workflow_cancel = z.object({
  instance_id: z.string().describe("Approval instance ID to cancel"),
  cancelled_by: z.string().describe("Actor cancelling"),
  reason: z.string().optional().describe("Cancellation reason"),
}).passthrough();

const approval_workflow_list = z.object({
  entity_type: entityTypeEnum.optional(),
}).passthrough();

const workflow_stats = z.object({}).passthrough();

const workflow_requires_approval = z.object({
  entity_type: entityTypeEnum,
  amount: z.number().nonnegative().optional().describe("Dollar amount to check"),
}).passthrough();

const workflow_entity_history = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().describe("Entity ID"),
}).passthrough();

// ============================================================================
// RECORD TIMELINE & COMMENTS (Session 6-6)
// ============================================================================

const timelineEventTypeEnum = z.enum([
  "created", "updated", "status_changed", "approval_submitted",
  "approval_decided", "approval_completed", "file_attached",
  "comment_added", "assigned", "linked", "unlinked",
  "emailed", "printed", "exported", "archived", "custom",
]).describe("Timeline event type");

const timeline_get = z.object({
  entity_type: z.string().describe("Entity type"),
  entity_id: z.string().describe("Entity ID"),
  event_types: z.array(timelineEventTypeEnum).optional().describe("Filter by event types"),
  since: z.string().optional().describe("ISO timestamp — only events after this time"),
  limit: z.number().int().positive().optional().describe("Max entries to return"),
}).passthrough();

const timeline_add = z.object({
  entity_type: z.string().describe("Entity type"),
  entity_id: z.string().describe("Entity ID"),
  event_type: timelineEventTypeEnum,
  actor: z.string().optional().describe("Who performed the action"),
  summary: z.string().describe("Human-readable summary of what happened"),
  details: z.record(z.string(), z.unknown()).optional().describe("Structured event details"),
}).passthrough();

const comment_create = z.object({
  entity_type: z.string().describe("Entity type"),
  entity_id: z.string().describe("Entity ID"),
  author_name: z.string().describe("Comment author display name"),
  author_id: z.string().optional().describe("Author user ID"),
  body: z.string().min(1).describe("Comment body text"),
  parent_id: z.string().optional().describe("Parent comment ID for threading"),
  attachments: z.array(z.object({
    file_id: z.string(), filename: z.string(), mime_type: z.string(), size_bytes: z.number(),
    url: z.string().optional(),
  })).optional().describe("File attachments"),
  is_internal: z.boolean().optional().describe("Internal-only comment (not visible to customers)"),
}).passthrough();

const comment_list = z.object({
  entity_type: z.string().describe("Entity type"),
  entity_id: z.string().describe("Entity ID"),
  include_internal: z.boolean().optional().describe("Include internal comments"),
}).passthrough();

const comment_edit = z.object({
  comment_id: z.string().describe("Comment ID to edit"),
  body: z.string().min(1).describe("New comment body"),
  editor_name: z.string().describe("Who is editing"),
}).passthrough();

const comment_delete = z.object({
  comment_id: z.string().describe("Comment ID to soft-delete"),
  deleted_by: z.string().describe("Who is deleting"),
}).passthrough();

// ============================================================================
// JOB TRAVELER (Session 6-7)
// ============================================================================

const stepStatusEnum = z.enum(["pending", "setup", "running", "complete", "skipped", "hold"]).describe("Routing step status");

const traveler_create = z.object({
  job_id: z.string().describe("Unique job identifier"),
  steps: z.array(z.object({
    step_number: z.number().int().positive().describe("Operation number (10, 20, 30...)"),
    operation: z.string().describe("Operation name (e.g., 'Rough Mill', 'Heat Treat')"),
    machine_id: z.string().optional().describe("Target machine ID"),
    work_center: z.string().optional().describe("Work center group"),
    est_setup_min: z.number().nonnegative().optional().describe("Estimated setup time in minutes"),
    est_cycle_min: z.number().nonnegative().optional().describe("Estimated per-part cycle time in minutes"),
    quantity: z.number().int().positive().optional().describe("Number of parts to run"),
    is_outside_service: z.boolean().optional().describe("True if vendor/outside operation"),
    vendor_name: z.string().optional().describe("Outside service vendor name"),
    is_inspection: z.boolean().optional().describe("True if inspection/gate step"),
    notes: z.string().optional().describe("Operation notes"),
  })).min(1).describe("Routing steps in order"),
  created_by: z.string().optional().describe("Creator"),
}).passthrough();

const traveler_start_setup = z.object({
  job_id: z.string().describe("Job ID"),
  step_number: z.number().int().positive().describe("Step to start setup on"),
  operator_id: z.string().describe("Operator performing setup"),
}).passthrough();

const traveler_start_cycle = z.object({
  job_id: z.string().describe("Job ID"),
  step_number: z.number().int().positive().describe("Step to start cycle on"),
  operator_id: z.string().describe("Operator running cycle"),
}).passthrough();

const traveler_complete_step = z.object({
  job_id: z.string().describe("Job ID"),
  step_number: z.number().int().positive().describe("Step to complete"),
  operator_id: z.string().describe("Operator completing step"),
  skip: z.boolean().optional().describe("Skip this step instead of completing"),
  parts_complete: z.number().int().nonnegative().optional().describe("Number of good parts completed"),
  parts_scrapped: z.number().int().nonnegative().optional().describe("Number of parts scrapped"),
  notes: z.string().optional().describe("Completion notes"),
}).passthrough();

const traveler_get_active = z.object({}).passthrough();

const traveler_get = z.object({
  job_id: z.string().describe("Job ID to retrieve"),
}).passthrough();

const traveler_scan = z.object({
  code: z.string().describe("Barcode/QR scan code (format: JOB-{id}-STEP-{num})"),
  operator_id: z.string().optional().describe("Operator scanning"),
  action: z.enum(["auto", "start_setup", "start_cycle", "complete"]).optional().describe("Force specific action instead of auto-detect"),
}).passthrough();

// ============================================================================
// MACHINE DISPATCH (Session 6-7)
// ============================================================================

const dispatch_queue_job = z.object({
  machine_id: z.string().describe("Target machine ID"),
  job_id: z.string().describe("Job ID to queue"),
  step_number: z.number().int().positive().optional().describe("Specific routing step"),
  priority: z.number().int().optional().describe("Priority (lower = higher priority)"),
  est_setup_min: z.number().nonnegative().optional().describe("Estimated setup minutes"),
  est_cycle_min: z.number().nonnegative().optional().describe("Estimated cycle minutes"),
  due_date: z.string().optional().describe("Job due date (ISO)"),
  is_rush: z.boolean().optional().describe("Rush/hot job flag"),
  setup_group: z.string().optional().describe("Tooling group for setup reduction"),
  queued_by: z.string().optional().describe("Who queued the job"),
}).passthrough();

const dispatch_get_queue = z.object({
  machine_id: z.string().describe("Machine ID to get queue for"),
}).passthrough();

const dispatch_reorder = z.object({
  machine_id: z.string().describe("Machine ID"),
  order: z.array(z.string()).describe("Entry IDs in new priority order"),
  reordered_by: z.string().optional().describe("Who reordered"),
}).passthrough();

const dispatch_get_all_queues = z.object({}).passthrough();

const dispatch_what_if = z.object({
  machine_id: z.string().describe("Machine ID for simulation"),
  insert_job_id: z.string().optional().describe("Job to simulate inserting"),
  insert_position: z.number().int().nonnegative().optional().describe("Position to insert at"),
  est_setup_min: z.number().nonnegative().optional().describe("Setup time for simulated job"),
  est_cycle_min: z.number().nonnegative().optional().describe("Cycle time for simulated job"),
}).passthrough();

const dispatch_remove = z.object({
  entry_id: z.string().describe("Queue entry ID to remove"),
  removed_by: z.string().optional().describe("Who removed the entry"),
}).passthrough();

// ============================================================================
// MILESTONE TRACKING (Session 6-9)
// ============================================================================

const milestoneKeyEnum = z.enum([
  "quote_sent", "quote_accepted", "order_confirmed", "design_review",
  "material_ordered", "material_received", "programming", "setup",
  "first_article", "production", "quality_inspection", "finishing",
  "packing_shipping", "delivered",
]);

const milestone_create_timeline = z.object({
  job_id: str.describe("Job ID to create milestone timeline for"),
  quote_id: optStr.describe("Associated quote ID"),
  customer_id: optStr.describe("Customer ID"),
  start_at_milestone: milestoneKeyEnum.optional().describe("Milestone to start at (default: quote_sent)"),
}).passthrough();

const milestone_get_timeline = z.object({
  job_id: str.describe("Job ID"),
}).passthrough();

const milestone_advance = z.object({
  job_id: str.describe("Job ID"),
  milestone_key: milestoneKeyEnum.optional().describe("Specific milestone to advance (default: current active)"),
  notes: optStr.describe("Advance notes"),
  advanced_by: optStr.describe("Who advanced the milestone"),
}).passthrough();

const milestone_skip = z.object({
  job_id: str.describe("Job ID"),
  milestone_key: milestoneKeyEnum.describe("Milestone to skip"),
  reason: optStr.describe("Reason for skipping"),
}).passthrough();

const milestone_on_job_status = z.object({
  job_id: str.describe("Job ID"),
  new_status: str.describe("New job lifecycle status"),
}).passthrough();

const milestone_events = z.object({
  job_id: optStr.describe("Filter events by job ID"),
  limit: z.number().int().positive().optional().describe("Max events to return"),
}).passthrough();

const milestone_list_jobs = z.object({}).passthrough();

const milestone_delete = z.object({
  job_id: str.describe("Job ID to delete timeline for"),
}).passthrough();

// ============================================================================
// CUSTOMER PORTAL (Session 6-9)
// ============================================================================

const portalTokenTypeEnum = z.enum(["quote", "order"]);
const portalScopeEnum = z.enum(["view", "respond", "documents", "messages"]);
const qualityDocTypeEnum = z.enum(["fai_as9102", "material_cert", "coc", "inspection_report", "ndt_report"]);
const qualityDocStatusEnum = z.enum(["draft", "pending_review", "approved", "rejected"]);

const portal_create_token = z.object({
  token_type: portalTokenTypeEnum.describe("Token type: quote or order"),
  entity_id: str.describe("Quote ID or Job ID"),
  customer_id: optStr.describe("Customer ID"),
  scope: z.array(portalScopeEnum).optional().describe("Token scopes (default: [view])"),
  expires_in_days: z.number().int().min(1).max(365).optional().describe("Expiry in days (default: 30)"),
  rate_limit: z.number().int().min(1).max(100).optional().describe("Requests per minute (default: 10)"),
  created_by: optStr.describe("Who created the token"),
}).passthrough();

const portal_revoke_token = z.object({
  token: str.describe("Portal token string to revoke"),
}).passthrough();

const portal_list_tokens = z.object({
  entity_id: str.describe("Entity ID to list tokens for"),
}).passthrough();

const portal_validate_token = z.object({
  token: str.describe("Portal token string to validate"),
  required_scope: portalScopeEnum.optional().describe("Required scope for this request"),
}).passthrough();

const portal_quote_view = z.object({
  quote_id: str.describe("Quote ID"),
  revision: z.record(z.string(), z.any()).optional().describe("Quote revision data"),
  status: optStr.describe("Quote status"),
}).passthrough();

const portal_quote_respond = z.object({
  quote_id: str.describe("Quote ID"),
  response: z.enum(["accept", "reject", "request_changes"]).describe("Customer response"),
  customer_name: str.describe("Customer name"),
  message: optStr.describe("Optional message"),
  requested_changes: z.array(z.string()).optional().describe("List of requested changes"),
}).passthrough();

const portal_order_status = z.object({
  job_id: str.describe("Job ID"),
  job: z.record(z.string(), z.any()).optional().describe("Job data"),
  timeline: z.record(z.string(), z.any()).optional().describe("Timeline data"),
}).passthrough();

const portal_add_quality_doc = z.object({
  job_id: str.describe("Job ID"),
  doc_type: qualityDocTypeEnum.describe("Document type"),
  file_id: optStr.describe("File storage ID"),
  title: str.describe("Document title"),
  status: qualityDocStatusEnum.optional().describe("Initial status (default: draft)"),
  notes: optStr.describe("Notes"),
}).passthrough();

const portal_update_quality_doc = z.object({
  doc_id: str.describe("Document ID"),
  job_id: str.describe("Job ID"),
  status: qualityDocStatusEnum.optional().describe("New status"),
  reviewed_by: optStr.describe("Reviewer name"),
  notes: optStr.describe("Review notes"),
}).passthrough();

const portal_list_quality_docs = z.object({
  job_id: str.describe("Job ID"),
  portal_mode: optBool.describe("If true, only show approved docs"),
}).passthrough();

const portal_get_quality_doc = z.object({
  job_id: str.describe("Job ID"),
  doc_id: str.describe("Document ID"),
}).passthrough();

const portal_send_message = z.object({
  entity_type: portalTokenTypeEnum.describe("Entity type: quote or order"),
  entity_id: str.describe("Entity ID"),
  sender_type: z.enum(["customer", "shop"]).describe("Who is sending"),
  sender_name: str.describe("Sender name"),
  message: z.string().min(1).max(5000).describe("Message text (max 5000 chars)"),
}).passthrough();

const portal_list_messages = z.object({
  entity_type: portalTokenTypeEnum.describe("Entity type"),
  entity_id: str.describe("Entity ID"),
  limit: z.number().int().positive().optional().describe("Max messages (default: 50)"),
}).passthrough();

const portal_mark_read = z.object({
  entity_type: portalTokenTypeEnum.describe("Entity type"),
  entity_id: str.describe("Entity ID"),
  sender_type: z.enum(["customer", "shop"]).describe("Mark messages from this sender as read"),
}).passthrough();

// ============================================================================
// QUOTE-TO-SHIP PIPELINE (Session 5-9)
// ============================================================================

const quote_to_ship_run = z.object({
  material_spec: z.string().describe("Material specification (e.g. '6061-T6', 'Ti-6Al-4V')"),
  quantity: z.number().int().positive().describe("Number of parts requested"),
  drawing_pdf: z.string().optional().describe("Path to drawing PDF for OCR intake"),
  drawing_text: z.string().optional().describe("Pre-extracted OCR/plain text for blueprint analysis"),
  step_file: z.string().optional().describe("Path to STEP/IGES file for geometric intake"),
  feature_candidates: z.array(z.object({
    type: z.string().describe("Feature type (pocket, hole, slot, chamfer, etc.)"),
    dimensions: z.record(z.string(), z.number()).optional().describe("Dimension key-value pairs in mm"),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  })).optional().describe("Pre-identified feature candidates"),
  customer_id: z.string().optional().describe("Customer identifier for tracking"),
  machine_ids: z.array(z.string()).optional().describe("Machine IDs available for this job"),
  priority: z.enum(["standard", "rush", "hot"]).optional().describe("Job priority level"),
  controller: z.string().optional().describe("Controller type for post processing"),
  pre_approved: z.boolean().optional().describe("Skip approval gate if true"),
  tolerances: z.array(z.object({
    feature: z.string(),
    value_mm: z.number(),
  })).optional().describe("Tolerance requirements per feature"),
  surface_finish_ra_um: z.number().optional().describe("Surface finish requirement (Ra, micrometers)"),
}).passthrough();

const quote_to_ship_validate = z.object({
  material_spec: z.string().describe("Material specification to validate"),
  quantity: z.number().int().positive().optional().describe("Quantity to validate"),
  drawing_pdf: z.string().optional().describe("Path to drawing PDF"),
  step_file: z.string().optional().describe("Path to STEP/IGES file"),
}).passthrough();

const quote_to_ship_status = z.object({}).passthrough();

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
  commission_report,
  daily_flash_generate,
  daily_flash_email,
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
  // Instant Quote Pipeline
  instant_quote,
  instant_quote_qty_breaks,
  instant_quote_lead_time,
  // Quote Revisions
  quote_revise,
  quote_get_history,
  quote_compare_revisions,
  quote_status_change,
  quote_generate_share_token,
  quote_get_by_token,
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
  // Shop Configuration
  shop_config_get,
  shop_config_update,
  shop_config_machines,
  shop_config_rates,
  shop_config_reset,
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
  // Equipment Assets (BIZ-MS5 U-BIZ37)
  asset_compute_depreciation,
  asset_register,
  asset_depreciation_schedule,
  asset_list,
  asset_transfer,
  asset_calibration_due,
  // Preventive Maintenance (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM)
  pm_schedule_create,
  pm_schedule_list,
  pm_schedule_is_due,
  pm_work_order_generate,
  pm_work_order_complete,
  pm_overdue_alerts,
  pm_downtime_record,
  pm_work_order_list,
  pm_work_order_assign,
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
  customer_revenue_concentration,
  customer_growth_trends,
  customer_normalize,
  customer_portfolio_sources,
  customer_portfolio_list,
  customer_portfolio_mine,
  customer_portfolio_harvest,
  customer_portfolio_audit,
  customer_portfolio_profile,
  erp_quality_record_inspection,
  erp_quality_create_ncr,
  erp_quality_close_ncr,
  erp_quality_metrics,
  erp_quality_sync,
  erp_quality_inspections_by_type,
  erp_quality_open_ncrs,
  erp_quality_inspection_trend,
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
  // Programmer Productivity
  productivity_log,
  productivity_summary,
  productivity_achievements,
  productivity_digest,
  productivity_compare,
  // Approval Workflows (Session 6-6)
  workflow_configure,
  workflow_submit,
  workflow_decide,
  workflow_pending,
  approval_workflow_status,
  workflow_cancel,
  approval_workflow_list,
  workflow_stats,
  workflow_requires_approval,
  workflow_entity_history,
  // Record Timeline & Comments (Session 6-6)
  timeline_get,
  timeline_add,
  comment_create,
  comment_list,
  comment_edit,
  comment_delete,
  // Job Traveler (Session 6-7)
  traveler_create,
  traveler_start_setup,
  traveler_start_cycle,
  traveler_complete_step,
  traveler_get_active,
  traveler_get,
  traveler_scan,
  // Machine Dispatch (Session 6-7)
  dispatch_queue_job,
  dispatch_get_queue,
  dispatch_reorder,
  dispatch_get_all_queues,
  dispatch_what_if,
  dispatch_remove,
  // Milestone Tracking (Session 6-9)
  milestone_create_timeline,
  milestone_get_timeline,
  milestone_advance,
  milestone_skip,
  milestone_on_job_status,
  milestone_events,
  milestone_list_jobs,
  milestone_delete,
  // Customer Portal (Session 6-9)
  portal_create_token,
  portal_revoke_token,
  portal_list_tokens,
  portal_validate_token,
  portal_quote_view,
  portal_quote_respond,
  portal_order_status,
  portal_add_quality_doc,
  portal_update_quality_doc,
  portal_list_quality_docs,
  portal_get_quality_doc,
  portal_send_message,
  portal_list_messages,
  portal_mark_read,
  // Quote-to-Ship Pipeline (Session 5-9)
  quote_to_ship_run,
  quote_to_ship_validate,
  quote_to_ship_status,
  // Job Profitability Waterfall
  profitability_analyze: z.object({
    revenue: posNum.describe("Total job revenue"),
    material_cost: posNum.describe("Raw material cost"),
    tool_cost: posNum.describe("Tooling cost"),
    labor_hours: posNum.describe("Labor hours"),
    labor_rate_per_hour: posNum.describe("Labor rate $/hr"),
    machine_hours: posNum.describe("Machine hours"),
    machine_rate_per_hour: posNum.describe("Machine rate $/hr"),
    setup_time_hours: z.number().nonnegative().describe("Setup time in hours"),
    scrap_count: z.number().nonnegative().describe("Number of scrapped parts"),
    scrap_cost_per_unit: z.number().nonnegative().describe("Cost per scrapped unit"),
    rework_count: optNum.describe("Number of reworked parts"),
    rework_cost_per_unit: optNum.describe("Cost per reworked unit"),
    overhead_pct: optNum.describe("Overhead percentage"),
    secondary_ops_cost: optNum.describe("Secondary operations cost"),
  }).passthrough(),
  profitability_compare: z.object({
    jobs: z.array(z.object({
      name: str.describe("Job name"),
      revenue: posNum,
      material_cost: posNum,
      tool_cost: posNum,
      labor_hours: posNum,
      labor_rate_per_hour: posNum,
      machine_hours: posNum,
      machine_rate_per_hour: posNum,
      setup_time_hours: z.number().nonnegative(),
      scrap_count: z.number().nonnegative(),
      scrap_cost_per_unit: z.number().nonnegative(),
    }).passthrough()).describe("Array of jobs to compare"),
  }).passthrough(),
  profitability_sensitivity: z.object({
    baseline: z.object({
      revenue: posNum,
      material_cost: posNum,
      tool_cost: posNum,
      labor_hours: posNum,
      labor_rate_per_hour: posNum,
      machine_hours: posNum,
      machine_rate_per_hour: posNum,
      setup_time_hours: z.number().nonnegative(),
      scrap_count: z.number().nonnegative(),
      scrap_cost_per_unit: z.number().nonnegative(),
    }).passthrough().describe("Baseline job input"),
    scenarios: z.array(z.object({
      name: str.describe("Scenario name"),
      changes: z.record(z.string(), z.any()).describe("Parameter overrides"),
    })).describe("What-if scenarios"),
  }).passthrough(),
  // Quote Generation (QuoteEngine)
  quote_generate: z.object({
    customer_name: str.describe("Customer name"),
    part_name: str.describe("Part name"),
    quantity: z.number().int().positive().describe("Order quantity"),
    cost_per_part: posNum.describe("Cost per part"),
    setup_cost: z.number().nonnegative().describe("Setup cost"),
    material_cost_per_part: posNum.describe("Material cost per part"),
    cycle_time_min: posNum.describe("Cycle time in minutes"),
    num_setups: z.number().int().positive().describe("Number of setups"),
    complexity: z.enum(["simple", "moderate", "complex", "extreme"]).describe("Part complexity"),
    urgency: z.enum(["standard", "rush", "emergency"]).describe("Order urgency"),
    repeat_order: optBool.describe("Whether this is a repeat order"),
  }).passthrough(),
  quote_quantity_breaks: z.object({
    customer_name: str.describe("Customer name"),
    part_name: str.describe("Part name"),
    quantity: z.number().int().positive().describe("Base quantity"),
    cost_per_part: posNum.describe("Cost per part"),
    setup_cost: z.number().nonnegative().describe("Setup cost"),
    material_cost_per_part: posNum.describe("Material cost per part"),
    cycle_time_min: posNum.describe("Cycle time in minutes"),
    num_setups: z.number().int().positive().describe("Number of setups"),
    complexity: z.enum(["simple", "moderate", "complex", "extreme"]).describe("Part complexity"),
    urgency: z.enum(["standard", "rush", "emergency"]).describe("Order urgency"),
    quantities: z.array(z.number().int().positive()).optional().describe("Quantities to compute breaks for"),
  }).passthrough(),
  quote_margin_analysis: z.object({
    customer_name: str.describe("Customer name"),
    part_name: str.describe("Part name"),
    quantity: z.number().int().positive().describe("Order quantity"),
    cost_per_part: posNum.describe("Cost per part"),
    setup_cost: z.number().nonnegative().describe("Setup cost"),
    material_cost_per_part: posNum.describe("Material cost per part"),
    cycle_time_min: posNum.describe("Cycle time in minutes"),
    num_setups: z.number().int().positive().describe("Number of setups"),
    complexity: z.enum(["simple", "moderate", "complex", "extreme"]).describe("Part complexity"),
    urgency: z.enum(["standard", "rush", "emergency"]).describe("Order urgency"),
  }).passthrough(),
  // �                                ──
  tool_inv_check_availability: z.object({
    operations: z.array(z.object({
      type: z.string().describe("Operation type (face_mill, pocket, drill, turn, thread, etc.)"),
      material: z.string().describe("ISO group or material name"),
      diameter: z.number().optional().describe("Required tool diameter in mm"),
      depth: z.number().optional().describe("Depth of cut in mm"),
    })).describe("Operations to check tool availability for"),
    on_hand_tools: z.array(z.object({
      id: z.string(),
      diameter: z.number(),
      type: z.string(),
      flutes: z.number().optional(),
      coating: z.string().optional(),
      condition: z.enum(["new", "good", "worn", "needs_regrind", "retired"]).optional(),
      total_cutting_minutes: z.number().optional(),
      tool_material: z.string().optional(),
      flute_length_mm: z.number().optional(),
      overall_length_mm: z.number().optional(),
    })).optional().describe("On-hand tool inventory"),
  }).passthrough(),
  tool_inv_suggest_substitutes: z.object({
    required_diameter: z.number().positive().describe("Required tool diameter in mm"),
    required_type: z.string().describe("Required tool type (endmill, drill, tap, etc.)"),
    material: z.string().describe("Workpiece material (ISO group or name)"),
    on_hand_tools: z.array(z.any()).optional().describe("On-hand tool inventory"),
    max_results: z.number().int().positive().optional().describe("Max substitutes to return (default 5)"),
  }).passthrough(),
  tool_inv_reorder_list: z.object({
    on_hand_tools: z.array(z.any()).optional().describe("On-hand tool inventory"),
    min_stock_level: z.number().int().positive().optional().describe("Minimum stock level per tool type (default 1)"),
    upcoming_jobs: z.array(z.object({
      job_name: z.string().optional(),
      operations: z.array(z.object({
        type: z.string(),
        diameter: z.number().optional(),
        material: z.string(),
      })),
    })).optional().describe("Upcoming jobs to check tool needs"),
  }).passthrough(),
  tool_inv_optimize_crib: z.object({
    usage_history: z.array(z.object({
      tool_id: z.string().describe("Tool ID"),
      jobs_completed: z.number().int().nonnegative().describe("Number of jobs completed"),
      last_used: z.string().describe("ISO date of last usage"),
    })).describe("Historical tool usage records"),
    on_hand_tools: z.array(z.any()).optional().describe("On-hand tool inventory"),
    max_tools: z.number().int().positive().optional().describe("Max tool crib capacity"),
    idle_days_threshold: z.number().int().positive().optional().describe("Days idle before flagging for retirement (default 90)"),
  }).passthrough(),

  // ==========================================================================
  // BRIDGE-WIRING — previously-unwired Business engines (U-BRIDGE-WIRE-BUSINESS)
  // ==========================================================================

  // EngineeringChangeOrderEngine — ECO/ECN change-package validation
  eco_validate: z.object({
    record: z.object({
      id: str.describe("ECO identifier"),
      title: str.describe("Change title"),
      change_class: z.enum(["I", "II"]).describe("EIA-649 change class (I=major, II=minor)"),
      regulated_industry: z.boolean().describe("Aerospace / regulated-medical change?"),
      reason: str.describe("Reason for change"),
      impact: z.array(z.object({
        artifact_type: z.enum(["drawing", "bom", "spec", "process_sheet", "test_procedure", "firmware"]).describe("Artifact type"),
        artifact_id: str.describe("Artifact identifier"),
        current_rev: z.string().describe("Current revision"),
        new_rev: z.string().describe("New revision"),
      })).describe("Affected artifacts"),
      approvals: z.array(z.object({
        role: z.enum(["engineering", "quality", "manufacturing", "supply_chain", "regulatory", "program_management"]).describe("Approver role"),
        approver: str.describe("Approver name"),
        approved_date: optStr.describe("Approval date ISO"),
        esig_part11_compliant: optBool.describe("Part 11 e-signature compliant?"),
      })).describe("Approval signatures"),
      in_stock: z.array(z.object({
        part_number: str.describe("Part number"),
        quantity: z.number().describe("In-stock quantity"),
        disposition: z.enum(["use_as_is", "rework", "scrap", "return_to_supplier", "not_applicable"]).describe("Disposition decision"),
        rationale: optStr.describe("Disposition rationale"),
      })).describe("In-stock material disposition"),
      effectivity_date: str.describe("Effectivity ISO-8601 date"),
      serial_cut_in: optStr.describe("Serial / lot cut-in"),
      config_record_closed: z.boolean().describe("Configuration record closed?"),
    }).describe("ECO change package"),
    now: optStr.describe("Date for effectivity validation; defaults to now"),
    class_i_approvers: z.array(z.enum(["engineering", "quality", "manufacturing", "supply_chain", "regulatory", "program_management"])).optional().describe("Required Class I approvers"),
    class_ii_approvers: z.array(z.enum(["engineering", "quality", "manufacturing", "supply_chain", "regulatory", "program_management"])).optional().describe("Required Class II approvers"),
  }),

  // QdrantCapacityPlannerEngine — pre-flight disk/RAM estimate for a vector ingestion
  qdrant_capacity_plan: z.object({
    collection: z.object({
      existingPoints: z.number().int().nonnegative().describe("Points already in the collection"),
      addingPoints: z.number().int().nonnegative().describe("Points this ingestion will add"),
      vectorDim: z.number().int().positive().describe("Vector dimensionality"),
      precision: z.enum(["float32", "float16", "int8"]).describe("Component precision"),
      payloadAvgBytes: z.number().nonnegative().describe("Average per-point payload bytes"),
      hnswM: z.number().int().min(4).max(64).optional().describe("HNSW M parameter (default 16)"),
    }).describe("Collection ingestion plan"),
    host: z.object({
      diskFreeMB: z.number().nonnegative().describe("Free disk MB"),
      ramFreeMB: z.number().nonnegative().describe("Free RAM MB"),
    }).describe("Host availability"),
  }),

  qdrant_capacity_max_fraction: z.object({
    collection: z.object({
      existingPoints: z.number().int().nonnegative().describe("Points already in the collection"),
      addingPoints: z.number().int().nonnegative().describe("Points this ingestion will add"),
      vectorDim: z.number().int().positive().describe("Vector dimensionality"),
      precision: z.enum(["float32", "float16", "int8"]).describe("Component precision"),
      payloadAvgBytes: z.number().nonnegative().describe("Average per-point payload bytes"),
      hnswM: z.number().int().min(4).max(64).optional().describe("HNSW M parameter (default 16)"),
    }).describe("Collection ingestion plan"),
    host: z.object({
      diskFreeMB: z.number().nonnegative().describe("Free disk MB"),
      ramFreeMB: z.number().nonnegative().describe("Free RAM MB"),
    }).describe("Host availability"),
  }),

  // ERPToolInventoryEngine — ERP tool-crib inventory search
  erp_tool_search: z.object({
    query: str.describe("Search term (tool id / description / part number)"),
    category: z.enum(["end_mill", "drill", "insert", "tap", "reamer", "boring_bar", "holder", "other"]).optional().describe("Optional category filter"),
  }),

  // QuoteToOrderBridgeEngine — bridge a fresh quote estimate into an ERP order
  quote_to_order: z.object({
    input: z.object({
      quantity: z.number().positive().describe("Order quantity"),
      material: str.describe("Workpiece material key (e.g. aluminum_6061)"),
      complexity: z.enum(["simple", "medium", "complex", "very_complex"]).describe("Part complexity"),
      part_name: str.optional().describe("Part name"),
      part_number: str.optional().describe("Part number"),
      machine_type: str.optional().describe("Machine type — assigned to all work orders"),
      rush: z.boolean().optional().describe("Rush quote — drives priority + rush lead time"),
      operations: z.array(z.object({
        name: str.describe("Operation label"),
        type: str.describe("Operation type"),
        cycle_time_min: z.number().nonnegative().optional().describe("Per-part cycle time, minutes"),
        setup_time_min: z.number().nonnegative().optional().describe("One-time setup time, minutes"),
      })).optional().describe("Operations to fan out into work orders"),
    }).passthrough().describe("Quote estimate input (forwarded to QuoteEstimatorEngine)"),
    customer: str.describe("Customer name — required; a quote estimate carries none"),
    part_number: str.optional().describe("Override order part number"),
    priority: z.number().int().min(1).max(5).optional().describe("Override priority (1=highest)"),
    due_date: str.optional().describe("Override due date (ISO YYYY-MM-DD)"),
    notes: str.optional().describe("Extra notes appended after the quote trace note"),
    create_work_orders: z.boolean().optional().describe("Create per-operation work orders (default true)"),
    confirm: z.boolean().optional().describe("Transition the new order draft→confirmed (default false)"),
  }),

  // WorkOrderScheduleBridgeEngine — schedule every open OrderManager work-order
  schedule_open_work_orders: z.object({
    machines: z.array(z.object({
      machine_id: str.describe("Machine identifier"),
      machine_name: str.describe("Display name"),
      type: str.describe("Machine type — must match work-order .machine for assignment"),
      available_hours_per_day: z.number().positive().describe("Daily working hours"),
      current_load_hours: z.number().nonnegative().describe("Already-committed hours"),
      efficiency: z.number().positive().max(1).describe("0-1, machine efficiency factor"),
    })).min(1).describe("Machine fleet available to the schedule (required, non-empty)"),
    strategy: z.enum(["EDD", "SPT", "priority", "balanced"]).optional().describe("Schedule strategy (default 'balanced')"),
    filterMachine: str.optional().describe("Restrict to WOs assigned to a single machine"),
    defaultSetupMin: z.number().nonnegative().optional().describe("Fallback setup time per WO (default 0)"),
    workOrders: z.array(z.object({}).passthrough()).optional().describe("Override the OrderManager open set (dry-run mode)"),
  }),

  // WorkOrderScheduleBridgeEngine — capacity what-if for a single work-order
  what_if_work_order: z.object({
    work_order_id: str.describe("WO id (e.g. WO-0001)"),
    desired_start: str.optional().describe("Desired start (ISO YYYY-MM-DD); defaults to today"),
  }),

  // QuoteToOrderBridgeEngine — bridge an already-computed quote result into an ERP order
  order_from_quote: z.object({
    quote: z.object({
      quote_id: str.describe("Quote identifier"),
      part_name: str.describe("Part name"),
      quantity: z.number().positive().describe("Quote quantity"),
      pricing: z.object({
        unit_price: z.number().describe("Quoted unit price"),
        total_price: z.number().describe("Quoted total price"),
        adjustments: z.object({
          rush_premium_pct: z.number().nullable().describe("Rush premium % — non-null implies a rush quote"),
        }).passthrough(),
      }).passthrough(),
      lead_time: z.object({
        total_standard_days: z.number().nonnegative().describe("Standard lead time, days"),
        total_rush_days: z.number().nonnegative().describe("Rush lead time, days"),
      }).passthrough(),
      confidence_score: z.number().describe("Quote confidence score (10-100)"),
    }).passthrough().describe("A QuoteEstimatorEngine.estimate() result"),
    customer: str.describe("Customer name — required"),
    material: str.optional().describe("Workpiece material (the quote result carries none)"),
    machine: str.optional().describe("Default machine for work orders"),
    operations: z.array(z.object({
      name: str.describe("Operation label"),
      machine: str.optional().describe("Per-operation machine override"),
      cycle_time_min: z.number().nonnegative().optional().describe("Per-part cycle time, minutes"),
      setup_time_min: z.number().nonnegative().optional().describe("One-time setup time, minutes"),
    })).optional().describe("Operations to fan out into work orders"),
    part_number: str.optional().describe("Override order part number"),
    priority: z.number().int().min(1).max(5).optional().describe("Override priority (1=highest)"),
    due_date: str.optional().describe("Override due date (ISO YYYY-MM-DD)"),
    notes: str.optional().describe("Extra notes appended after the quote trace note"),
    create_work_orders: z.boolean().optional().describe("Create per-operation work orders (default true)"),
    confirm: z.boolean().optional().describe("Transition the new order draft→confirmed (default false)"),
  }),

  // ──────────────────────────────────────────────────────────────────────
  // WIRE-BUSINESS-DIRECT-MS0/U-VICTOR-BUSINESS-DIRECT (slot:victor, 2026-05-26)
  // 3 schemas for previously-unwired business sub-engines. Passthrough at the
  // dispatcher edge — each engine validates its own input via a stricter
  // engine-internal Zod schema. Future units can tighten per-action.
  // ──────────────────────────────────────────────────────────────────────
  scenario_batch_run: z.object({}).passthrough()
    .describe("ScenarioBatchRunnerEngine.run — execute a batch of scenarios (BatchRunOptions). Returns a BatchRunReport (per-scenario verdicts + aggregate metrics). Engine validates input via its own internal schema."),
  rfq_orchestrator_list_records: z.object({
    customer_id: optStr.describe("Optional customer-id filter"),
    status: optStr.describe("Optional status filter (draft/submitted/won/lost/expired)"),
  }).passthrough()
    .describe("RFQToOrderOrchestratorEngine.listRecords — list RFQ→Order pipeline records, optionally filtered by customer_id + status. Read-only operator-facing query."),
  monolith_roughing_machine_get: z.object({
    id: optStr.describe("Machine config id to fetch (preferred)"),
    machine_id: optStr.describe("Alias for id"),
  }).passthrough()
    .describe("MonolithRoughingMachineConfigsEngine.getConfig — fetch one roughing-machine config by id, or call listIds() when no id is supplied (read-only discovery)."),
};
