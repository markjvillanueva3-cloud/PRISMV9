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
