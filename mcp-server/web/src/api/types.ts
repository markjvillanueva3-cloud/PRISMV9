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
