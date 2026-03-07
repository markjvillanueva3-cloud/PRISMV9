/**
 * PRISM Dashboard API Types
 * Maps to bridge endpoint response format:
 *   { result: {...}, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

export interface PrismResponse<T = Record<string, unknown>> {
  result: T;
  safety: {
    score: number;
    warnings: string[];
  };
  meta: {
    formula_used: string;
    uncertainty: number;
    correlation_id?: string;
  };
}

export interface SpeedFeedResult {
  speed_rpm: number;
  feed_mmrev: number;
  doc_mm: number;
  material: string;
  tool: string;
  Vc_mmin: number;
  Fc_N: number;
  Pc_kW: number;
  tool_life_min: number;
  safety_score: number;
}

export interface MaterialResult {
  id: string;
  name: string;
  iso_group: string;
  hardness_hrc?: number;
  tensile_mpa?: number;
  density_kgm3?: number;
  machinability_index?: number;
}

export interface ToolResult {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  diameter_mm?: number;
  coating?: string;
  flutes?: number;
}

export interface AlarmDecodeResult {
  code: string;
  controller: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  causes: string[];
  remediation: string[];
}

export interface JobPlanResult {
  operations: {
    sequence: number;
    type: string;
    tool: string;
    speed_rpm: number;
    feed_mmrev: number;
    doc_mm: number;
    time_min: number;
  }[];
  total_time_min: number;
  safety_score: number;
  gcode_preview?: string;
}

/** Status indicator levels (color-blind accessible: use shape + color) */
export type SafetyLevel = 'pass' | 'warn' | 'fail' | 'info';

export function safetyLevel(score: number): SafetyLevel {
  if (score >= 0.85) return 'pass';
  if (score >= 0.70) return 'warn';
  return 'fail';
}

/** Shape indicators for color-blind accessibility */
export const SAFETY_SHAPES: Record<SafetyLevel, string> = {
  pass: '\u25CF',  // filled circle
  warn: '\u25B2',  // triangle
  fail: '\u25A0',  // filled square
  info: '\u25C6',  // diamond
};

// === ERP Types ===

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  labor_rates: { regular: number; overtime: number; double_time: number };
  skills: string[];
  certifications: { name: string; expires?: string }[];
  hire_date: string;
  email?: string;
  phone?: string;
}

export interface ShiftEntry {
  id: string;
  employee_id: string;
  shift_start: string;
  shift_end?: string;
  breaks: { start: string; end?: string; type: string }[];
  status: 'clocked_in' | 'on_break' | 'clocked_out';
  total_hours?: number;
  overtime_hours?: number;
}

export interface JobTimeEntry {
  id: string;
  employee_id: string;
  job_id: string;
  operation?: string;
  start_time: string;
  end_time?: string;
  status: 'running' | 'paused' | 'completed';
  elapsed_hours?: number;
  labor_cost?: number;
}

export interface TimecardSummary {
  employee_id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  total_hours: number;
  jobs: { job_id: string; hours: number; cost: number }[];
  status: 'draft' | 'submitted' | 'approved';
}

export interface PayStub {
  employee_id: string;
  employee_name: string;
  period: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: { type: string; amount: number }[];
  net_pay: number;
}

export interface Invoice {
  id: string;
  job_id: string;
  customer_name: string;
  date: string;
  due_date: string;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  payments: { date: string; amount: number; method: string }[];
  balance_due: number;
}

export interface ToolUsageRecord {
  id: string;
  tool_id: string;
  tool_name: string;
  job_id: string;
  operation: string;
  usage_minutes: number;
  wear_percent: number;
  cost: number;
}

export interface ActualVsEstimate {
  job_id: string;
  category: string;
  estimated: number;
  actual: number;
  variance: number;
  variance_percent: number;
}

export interface JobProfitability {
  job_id: string;
  customer: string;
  revenue: number;
  total_cost: number;
  profit: number;
  margin_percent: number;
  cost_breakdown: { category: string; amount: number }[];
}

// === Purchase Order Types ===

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_received' | 'received' | 'closed';
  line_items: { description: string; quantity: number; unit_price: number; total: number; received_qty: number }[];
  subtotal: number;
  tax: number;
  total: number;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  approved_by?: string;
}

export interface APAging {
  current: number;
  days_30: number;
  days_60: number;
  days_90_plus: number;
  total: number;
  items: { po_id: string; supplier: string; amount: number; days: number; bucket: string }[];
}

// === General Ledger Types ===

export interface GLAccount {
  number: string;
  name: string;
  type: string;
  balance: number;
}

export interface TrialBalance {
  accounts: { number: string; name: string; debit: number; credit: number }[];
  total_debits: number;
  total_credits: number;
  balanced: boolean;
}

export interface IncomeStatement {
  period_start: string;
  period_end: string;
  revenue: { account: string; amount: number }[];
  expenses: { account: string; amount: number }[];
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}

export interface BalanceSheet {
  as_of: string;
  assets: { account: string; balance: number }[];
  liabilities: { account: string; balance: number }[];
  equity: { account: string; balance: number }[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

// === Capacity Planning Types ===

export interface MachineInfo {
  id: string;
  name: string;
  type: string;
  capacity_hours_per_week: number;
  hourly_rate: number;
}

export interface MachineLoad {
  machine_id: string;
  machine_name: string;
  total_hours: number;
  capacity_hours: number;
  utilization_pct: number;
  jobs: { job_id: string; hours: number; due_date: string }[];
}

export interface Bottleneck {
  machine_id: string;
  machine_name: string;
  utilization_pct: number;
  overload_hours: number;
  recommendations: string[];
}

// === Quality Management Types ===

export interface SPCChart {
  characteristic: string;
  part_number: string;
  x_bar: number;
  ucl: number;
  lcl: number;
  cp: number;
  cpk: number;
  ppk: number;
  in_control: boolean;
  violations: string[];
  data_points: number[];
}

export interface CalibrationRecord {
  equipment_id: string;
  equipment_name: string;
  type: string;
  last_calibration: string;
  next_calibration: string;
  status: 'current' | 'due_soon' | 'overdue';
}

export interface NCR {
  id: string;
  job_id: string;
  part_number: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  disposition: string;
  status: string;
  cost_impact: number;
  created_at: string;
}

export interface QualityKPI {
  first_pass_yield: number;
  scrap_rate: number;
  ncr_count: number;
  calibration_compliance: number;
  fai_count: number;
}

// === HR / Compliance Types ===

export interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  provider: string;
  employer_contribution: number;
  employee_contribution: number;
}

export interface PTOBalance {
  employee_id: string;
  balances: { type: string; accrued: number; used: number; available: number }[];
  total_available: number;
}

export interface TrainingRecord {
  id: string;
  employee_id: string;
  course_name: string;
  category: string;
  completed_date: string;
  expiration_date?: string;
  status: string;
}

export interface ComplianceAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  employee_id?: string;
  regulation: string;
}

export interface HRDashboard {
  total_enrolled: number;
  total_employer_benefit_cost: number;
  avg_pto_balance: number;
  training_compliance_pct: number;
  pending_reviews: number;
  compliance_alerts: number;
}

// === Customer / CRM Types ===

export interface Customer {
  id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  pricing_tier: string;
  status: string;
  tags: string[];
}

export interface SalesPipeline {
  stages: { stage: string; count: number; value: number; weighted_value: number }[];
  total_pipeline: number;
  weighted_pipeline: number;
  win_rate: number;
  avg_deal_size: number;
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_jobs: number;
  avg_job_value: number;
  on_time_delivery_pct: number;
  avg_margin_pct: number;
  quote_win_rate: number;
}

// === Integration / Export Types ===

export interface ExportResult {
  format: string;
  filename: string;
  content: string;
  record_count: number;
  total_amount: number;
}

export interface BankReconciliation {
  statement_date: string;
  bank_balance: number;
  book_balance: number;
  adjusted_bank: number;
  adjusted_book: number;
  reconciled: boolean;
  difference: number;
}

export interface ExportFormat {
  format: string;
  description: string;
  use_case: string;
}

// === Inventory Types ===

export interface EOQResult {
  eoq: number;
  annual_order_cost: number;
  annual_holding_cost: number;
  total_cost: number;
  orders_per_year: number;
}

export interface ABCClassification {
  items: { id: string; name: string; class: 'A' | 'B' | 'C'; annual_value: number; cumulative_pct: number }[];
  summary: { class: string; count: number; value_pct: number }[];
}

// === Scheduling Types ===

export interface ScheduleResult {
  schedule: { job_id: string; machine: string; start: number; end: number }[];
  makespan: number;
  utilization: number;
}

// === Job Lifecycle Types ===

export interface Job {
  id: string;
  customer: string;
  part_number: string;
  description: string;
  status: 'quoted' | 'planned' | 'in_progress' | 'complete' | 'shipped' | 'invoiced';
  quantity: number;
  due_date: string;
  priority: 'low' | 'normal' | 'high' | 'rush';
  material: string;
  estimated_hours: number;
  actual_hours: number;
  created_at: string;
}

export interface JobDashboard {
  total_active: number;
  on_schedule: number;
  at_risk: number;
  overdue: number;
  revenue_pipeline: number;
  jobs: Job[];
}

// === Order Manager Types ===

export interface WorkOrder {
  id: string;
  job_id: string;
  status: 'pending' | 'in_progress' | 'complete';
  operations: { op: string; machine: string; est_hours: number; actual_hours: number }[];
  created_at: string;
}

export interface OrderMetrics {
  total_orders: number;
  on_time_pct: number;
  avg_lead_days: number;
  queue_depth: number;
  active_work_orders: number;
}

// === Purchasing Types ===

export interface SupplierResult {
  id: string;
  name: string;
  materials: string[];
  rating: number;
  lead_time_days: number;
  min_order: number;
  location: string;
}

export interface PurchasingRecommendation {
  supplier_id: string;
  supplier_name: string;
  material: string;
  unit_price: number;
  lead_time_days: number;
  score: number;
  reason: string;
}

// === Machine Rate Types ===

export interface MachineRate {
  machine_id: string;
  machine_name: string;
  type: string;
  hourly_rate: number;
  setup_rate: number;
  overhead_rate: number;
  effective_rate: number;
}

// === Batch Optimization Types ===

export interface BatchGroup {
  group_id: string;
  jobs: string[];
  material: string;
  setup_savings_min: number;
  total_time_min: number;
}

export interface BatchSequence {
  sequence: { job_id: string; setup_min: number; run_min: number }[];
  total_setup_min: number;
  savings_vs_naive_pct: number;
}

// === Financial Analysis Types ===

export interface FinancialNPV {
  npv: number;
  irr: number;
  payback_years: number;
  cash_flows: { year: number; net: number; cumulative: number }[];
}

export interface BreakevenResult {
  breakeven_units: number;
  breakeven_revenue: number;
  margin_of_safety_pct: number;
  contribution_margin: number;
}

// === Actual Cost Types ===

export interface ActualCostResult {
  job_id: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  estimated_cost: number;
  variance_pct: number;
}

export interface CostForecast {
  period: string;
  projected_cost: number;
  projected_revenue: number;
  projected_margin_pct: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MarginAlert {
  job_id: string;
  customer: string;
  current_margin_pct: number;
  threshold_pct: number;
  alert_type: 'below_target' | 'negative' | 'trending_down';
  recommendation: string;
}

// === Tool Usage Types ===

export interface ToolInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_per_unit: number;
  regrind_count: number;
  max_regrinds: number;
  status: 'available' | 'in_use' | 'regrind' | 'scrapped';
}

export interface ReorderAlert {
  tool_id: string;
  tool_name: string;
  current_qty: number;
  min_stock: number;
  reorder_qty: number;
  estimated_cost: number;
  urgency: 'low' | 'medium' | 'high';
}

// === Reporting Types ===

export interface ParetoResult {
  items: { category: string; count: number; cost: number; cumulative_pct: number }[];
  total_cost: number;
  top_20_pct_value: number;
}

export interface ProductionReport {
  period: string;
  jobs_completed: number;
  parts_produced: number;
  scrap_count: number;
  utilization_pct: number;
  on_time_delivery_pct: number;
  revenue: number;
}

// === Quality Extended Types ===

export interface MaterialCert {
  heat_lot: string;
  material: string;
  supplier: string;
  certifications: string[];
  properties: Record<string, number>;
  verified: boolean;
}

export interface FAI {
  id: string;
  part_number: string;
  job_id: string;
  characteristics: { name: string; nominal: number; actual: number; tolerance: number; pass: boolean }[];
  overall_pass: boolean;
  inspector: string;
  date: string;
}

// === Safety Stock Types ===

export interface SafetyStockResult {
  safety_stock: number;
  reorder_point: number;
  service_level_pct: number;
  avg_demand: number;
  demand_std_dev: number;
}

// === Quoting Types ===

export interface QuoteResult {
  quote_id: string;
  material_cost: number;
  labor_cost: number;
  overhead: number;
  markup: number;
  total: number;
  unit_price: number;
  lead_time_days: number;
  price_breaks?: { quantity: number; unit_price: number; total: number }[];
}

export interface QuoteEstimate {
  material_cost: number;
  machining_cost: number;
  setup_cost: number;
  tooling_cost: number;
  overhead: number;
  margin: number;
  total: number;
  unit_price: number;
  cycle_time_min: number;
  confidence: number;
  price_breaks?: { quantity: number; unit_price: number; savings_pct: number }[];
}

export interface MaterialComparison {
  material: string;
  unit_price: number;
  total: number;
  cycle_time_min: number;
  tool_life_factor: number;
}

export interface SecondaryOp {
  id: string;
  name: string;
  category: string;
  description: string;
  typical_cost_range: { min: number; max: number };
  lead_time_days: number;
}

export interface SecOpsQuote {
  operation: string;
  quantity: number;
  unit_cost: number;
  total: number;
  lead_time_days: number;
  vendor?: string;
}

export interface QuoteAccuracy {
  total_quotes: number;
  avg_variance_pct: number;
  over_estimated_pct: number;
  under_estimated_pct: number;
  categories: { category: string; avg_variance: number; count: number }[];
}

export interface QuoteConversion {
  total_quotes: number;
  won: number;
  lost: number;
  pending: number;
  win_rate: number;
  avg_won_value: number;
  avg_lost_value: number;
}

export interface CalibrationSuggestion {
  category: string;
  adjustment_pct: number;
  reason: string;
  confidence: number;
}

// === Blueprint to Quote Types ===

export interface BlueprintQuoteResult {
  material: string;
  operations: { type: string; time_min: number; cost: number }[];
  total_cost: number;
  unit_price: number;
  lead_time_days: number;
}

// === Sheet Metal Quote Types ===

export interface SheetMetalQuoteResult {
  material_cost: number;
  cutting_cost: number;
  bending_cost: number;
  finishing_cost: number;
  total: number;
  unit_price: number;
  lead_time_days: number;
}

// === Additive Quote Types ===

export interface AdditiveQuoteResult {
  technology: string;
  material: string;
  build_time_hours: number;
  material_cost: number;
  machine_cost: number;
  post_processing_cost: number;
  total: number;
  unit_price: number;
}

export interface AdditiveMaterial {
  id: string;
  name: string;
  technology: string;
  price_per_kg: number;
  properties: Record<string, number>;
}

// === Injection Mold Quote Types ===

export interface InjectionMoldQuoteResult {
  mold_cost: number;
  per_part_cost: number;
  cycle_time_s: number;
  total_cost: number;
  unit_price: number;
  amortized_mold_cost: number;
  material_cost_per_part: number;
}

export interface InjectionMoldMaterial {
  key: string;
  name: string;
  price_per_kg: number;
  shrinkage_pct: number;
  max_wall_mm: number;
  min_wall_mm: number;
}

export interface DfmResult {
  warnings: { severity: string; message: string; recommendation: string }[];
  score: number;
  pass: boolean;
}

// === Stock Size Optimizer Types ===

export interface StockOptimizeResult {
  recommended: { form: string; size: string; material: string; waste_pct: number; cost: number }[];
  best: { form: string; size: string; waste_pct: number; cost: number };
}

export interface StockCatalog {
  round_bars: number[];
  flat_bars: number[][];
  plate_thicknesses: number[];
  cost_per_kg: number;
  density_kg_m3: number;
}

// === Market Material Pricing Types ===

export interface PriceLookupResult {
  material: string;
  form: string;
  base_price_kg: number;
  adjusted_price_kg: number;
  region: string;
  surcharges: { type: string; amount: number }[];
  total_per_kg: number;
}

export interface PriceComparison {
  material: string;
  total_per_kg: number;
  rank: number;
}
