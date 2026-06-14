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

export interface DataResponse<T = Record<string, unknown>> {
  ok: boolean;
  data: T;
  error?: string;
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

export type ClearanceLevel = 'shop_floor' | 'lead' | 'hr_manager' | 'admin';

export type PauseReasonCategory =
  | 'machine_down' | 'material_shortage' | 'setup_changeover' | 'tool_change'
  | 'break' | 'preventive_maintenance' | 'waiting_inspection' | 'idle'
  | 'shift_end' | 'other';

export type ProcessType =
  | 'setup' | 'production_run' | 'first_article' | 'rework' | 'inspection'
  | 'deburring' | 'secondary_ops' | 'programming' | 'material_handling';

export interface OvertimePolicy {
  rule: 'daily' | 'weekly';
  daily_threshold_hrs: number;
  weekly_threshold_hrs: number;
  ot_multiplier: number;
  dt_multiplier: number;
}

export interface ShiftDifferential {
  second_shift_premium: number;
  third_shift_premium: number;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  clearance_level: ClearanceLevel;
  auth_user_id: string | null;
  labor_rates: { regular: number; overtime: number; double_time: number };
  overtime_policy: OvertimePolicy;
  shift_differential: ShiftDifferential | null;
  skills: string[];
  certifications: { name: string; expires?: string; status?: string }[];
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

export interface PausePeriod {
  start: string;
  end?: string;
  reason: string;
  reason_category?: PauseReasonCategory;
}

export interface JobTimeEntry {
  id: string;
  employee_id: string;
  job_id: string;
  operation?: string;
  process_type?: ProcessType;
  machine_id?: string;
  start_time: string;
  end_time?: string;
  status: 'running' | 'paused' | 'completed';
  elapsed_hours?: number;
  labor_cost?: number;
  good_parts?: number;
  scrap_count?: number;
  scrap_reason?: string;
  improvement_note?: string;
  pause_periods?: PausePeriod[];
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
  jobs: {
    job_id: string;
    hours: number;
    cost: number;
    operations?: string[];
    operation_details?: {
      operation: string;
      process_type?: ProcessType;
      machine_id?: string;
      hours: number;
      cost: number;
      good_parts?: number;
      scrap_count?: number;
    }[];
  }[];
  status: 'draft' | 'submitted' | 'approved' | 'locked';
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
  ytd?: { gross_pay: number; federal_tax: number; net_pay: number };
  shift_differential_amount?: number;
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
  /**
   * Margin-floor safety gate, surfaced verbatim from QuoteEstimatorEngine via
   * quote_estimate (round-trip proven in QuoteEstimatorEngine.marginFloor.test.ts).
   * Optional because legacy/quick estimate paths may omit it.
   */
  pricing?: {
    margin_pct?: number;
    /** True when post-discount margin fell below the config-sourced floor -- review before sending. */
    below_margin_floor?: boolean;
    /** The margin floor % this quote was checked against. */
    margin_floor_pct?: number;
  };
}

export interface InstantQuoteQuantityBreak {
  quantity: number;
  unit_price: number;
  total_price?: number;
  savings_pct?: number;
  lead_time_days?: number;
}

export interface InstantQuoteLeadTimeOption {
  tier?: 'standard' | 'expedited' | 'rush' | string;
  mode?: string;
  days: number;
  multiplier?: number;
  unit_price?: number;
  total_price?: number;
}

export interface InstantQuoteDfmIssue {
  severity: 'critical' | 'warning' | 'info' | string;
  category?: string;
  message: string;
  recommendation: string;
  cost_impact_usd?: number;
  physics_basis?: string;
}

export type InstantQuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised';

export interface InstantQuoteRevisionEntry {
  id: string;
  quote_id: string;
  revision_number: number;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  ci95_low_usd?: number;
  ci95_high_usd?: number;
  confidence_pct?: number;
  cost_breakdown: Record<string, unknown>;
  quantity_breaks: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues: Array<{ severity: string; message: string }>;
  change_summary?: string;
  revised_by?: string;
  created_at: string;
}

export interface InstantQuoteStatusHistoryEntry {
  id: string;
  quote_id: string;
  from_status: InstantQuoteStatus;
  to_status: InstantQuoteStatus;
  changed_by?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface InstantQuoteHistory {
  quote_id: string;
  current_status: InstantQuoteStatus;
  current_revision: number;
  revisions: InstantQuoteRevisionEntry[];
  status_history: InstantQuoteStatusHistoryEntry[];
}

export interface InstantQuoteShareToken {
  quote_id: string;
  token: string;
  expires_in_days: number | null;
}

export interface InstantQuoteResult {
  quote_id: string;
  part_name?: string;
  quantity: number;
  date?: string;
  valid_until?: string;
  unit_price: number;
  total_price: number;
  ci95_low?: number;
  ci95_high?: number;
  confidence: number;
  quantity_breaks?: InstantQuoteQuantityBreak[];
  lead_time_options?: InstantQuoteLeadTimeOption[];
  dfm?: {
    score: number;
    manufacturability?: string;
    issues?: InstantQuoteDfmIssue[];
  };
  cost_breakdown?: Record<string, unknown>;
  similar_parts?: Array<{
    id: string;
    similarity_score: number;
    historical_price?: number;
    price_delta_pct?: number;
  }>;
  recommended_process?: string;
  recommended_machine?: string;
  cycle_time_min?: number;
  cycle_time_source?: string;
  confidence_factors?: string[];
  warnings?: string[];
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

export interface DfmWarning {
  severity: 'info' | 'warning' | 'critical' | string;
  message: string;
  recommendation: string;
}

export interface DfmResult {
  warnings: DfmWarning[];
  score: number;
  pass: boolean;
}

export interface DfmAnalyzeResult extends DfmResult {}

export interface DfmToleranceCheckResult {
  stack_method: string;
  stack_result_mm: number;
  pass: boolean;
}

export interface DfmCostImpactItem {
  driver: string;
  amount_usd: number;
}

export interface DfmCostImpactResult {
  impacts: DfmCostImpactItem[];
  total_cost_impact_usd: number;
}

export interface DfmRule {
  id: string;
  severity: 'info' | 'warning' | 'critical' | string;
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

// === Machine Live Types ===

export interface MachineLiveEntry {
  machine_id: string;
  name: string;
  status: 'idle' | 'running' | 'alarm' | 'offline' | string;
  protocol?: string;
  controller?: string;
  model?: string;
  connected_at?: string;
}

export interface MachineLiveStatus {
  machine_id: string;
  state: string;
  spindle_rpm: number;
  feed_rate_mm_min: number;
  spindle_load_pct: number;
  temperature_C?: number;
  vibration_mm_s?: number;
  program?: string;
  active_tool?: string;
  uptime_min?: number;
  alerts?: Array<{ id: string; severity: string; message: string }>;
}

export interface AdaptiveStatus {
  machine_id?: string;
  active: boolean;
  mode?: string;
  chipload_target_mm?: number;
  override_pct?: number;
  last_adjustment?: string;
}

export interface MaintenanceStatus {
  machine_id: string;
  health: string;
  next_scheduled?: string;
  predictions?: Array<{
    category: string;
    risk_pct: number;
    estimated_remaining_hours: number;
  }>;
  alerts?: Array<{ severity: string; message: string }>;
}

export interface DigitalTwinState {
  machine_id?: string;
  state: string;
  spindle_rpm: number;
  feed_rate: number;
  spindle_load: number;
  temperature?: number;
  vibration?: number;
  health_score: number;
}

export interface AlertAcknowledgeResult {
  alert_id?: string;
  machine_id?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface MachineConnectResult {
  machine_id: string;
  connected: boolean;
  protocol?: string;
  latency_ms?: number;
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
