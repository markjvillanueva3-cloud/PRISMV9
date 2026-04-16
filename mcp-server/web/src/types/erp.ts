// ============================================================================
// ERP (Enterprise Resource Planning) Types
// Matches backend IntelligenceEngine, QuoteEngine, SchedulingEngine types
// ============================================================================

// ---------------------------------------------------------------------------
// POST /erp/quote/generate — Generate manufacturing quote
// ---------------------------------------------------------------------------

export interface ErpQuoteGenerateRequest {
  material: string;
  feature: string;
  dimensions?: Record<string, number>;
  quantity?: number;
  tolerance?: string;
  surface_finish?: string;
}

export interface ErpQuoteLineItem {
  operation: string;
  machine: string;
  cycle_time_min: number;
  setup_time_min: number;
  cost: number;
}

export interface ErpQuoteGenerateResult {
  quote_id: string;
  total_cost: number;
  unit_cost: number;
  quantity: number;
  lead_time_days: number;
  line_items: ErpQuoteLineItem[];
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  margin_pct: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// POST /erp/quote/breakdown — Detailed cost breakdown
// ---------------------------------------------------------------------------

export interface ErpQuoteBreakdownRequest {
  material: string;
  feature: string;
  dimensions?: Record<string, number>;
  quantity?: number;
}

export interface ErpCostCategory {
  category: string;
  amount: number;
  pct: number;
  details: string[];
}

export interface ErpQuoteBreakdownResult {
  categories: ErpCostCategory[];
  total: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// POST /erp/quote/compare — Compare quotes across strategies
// ---------------------------------------------------------------------------

export interface ErpQuoteCompareRequest {
  material: string;
  feature: string;
  dimensions?: Record<string, number>;
  strategies?: string[];
}

export interface ErpQuoteCompareEntry {
  strategy: string;
  total_cost: number;
  cycle_time_min: number;
  lead_time_days: number;
  quality_score: number;
}

export interface ErpQuoteCompareResult {
  comparisons: ErpQuoteCompareEntry[];
  recommended: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// POST /erp/job/plan — Plan manufacturing job
// ---------------------------------------------------------------------------

export interface ErpJobPlanRequest {
  material: string;
  feature: string;
  dimensions?: Record<string, number>;
  quantity?: number;
  deadline?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface ErpJobOperation {
  sequence: number;
  operation: string;
  machine: string;
  tool: string;
  cycle_time_min: number;
  setup_time_min: number;
  params?: Record<string, number | string>;
}

export interface ErpJobPlanResult {
  job_id: string;
  material: { id: string; name: string; iso_group: string };
  operations: ErpJobOperation[];
  total_time_min: number;
  estimated_cost: number;
  confidence: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// POST /erp/job/schedule — Schedule job on machines
// ---------------------------------------------------------------------------

export interface ErpJobScheduleRequest {
  job_id?: string;
  operations?: ErpJobOperation[];
  deadline?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  machines?: string[];
}

export interface ErpScheduleSlot {
  operation: string;
  machine: string;
  start: string;
  end: string;
  duration_min: number;
}

export interface ErpJobScheduleResult {
  schedule: ErpScheduleSlot[];
  makespan_min: number;
  utilization_pct: number;
  conflicts: string[];
}

// ---------------------------------------------------------------------------
// POST /erp/job/track — Track job progress
// ---------------------------------------------------------------------------

export interface ErpJobTrackRequest {
  job_id?: string;
  status_filter?: "queued" | "in_progress" | "complete" | "on_hold";
}

export type ErpJobStatus = "queued" | "in_progress" | "complete" | "on_hold";

export interface ErpJobInfo {
  job_id: string;
  part_name: string;
  status: ErpJobStatus;
  progress_pct: number;
  current_operation: string;
  machine: string;
  eta: string;
  oee: number;
}

export interface ErpJobTrackResult {
  jobs: ErpJobInfo[];
  total: number;
  active: number;
}

// ---------------------------------------------------------------------------
// POST /erp/analytics/capacity — Capacity utilization
// ---------------------------------------------------------------------------

export interface ErpCapacityRequest {
  time_range?: "day" | "week" | "month";
  machines?: string[];
}

export interface ErpMachineCapacity {
  machine: string;
  utilization_pct: number;
  available_hours: number;
  scheduled_hours: number;
  idle_hours: number;
}

export interface ErpCapacityResult {
  machines: ErpMachineCapacity[];
  overall_utilization_pct: number;
  total_available_hours: number;
}

// ---------------------------------------------------------------------------
// POST /erp/analytics/bottleneck — Bottleneck identification
// ---------------------------------------------------------------------------

export interface ErpBottleneckRequest {
  time_range?: "day" | "week" | "month";
}

export interface ErpBottleneck {
  machine: string;
  severity: "low" | "medium" | "high" | "critical";
  utilization_pct: number;
  queue_depth: number;
  avg_wait_min: number;
  recommendation: string;
}

export interface ErpBottleneckResult {
  bottlenecks: ErpBottleneck[];
  critical_count: number;
}

// ---------------------------------------------------------------------------
// POST /erp/analytics/oee — Overall Equipment Effectiveness
// ---------------------------------------------------------------------------

export interface ErpOeeRequest {
  machine?: string;
  time_range?: "shift" | "day" | "week" | "month";
}

export interface ErpOeeMetric {
  machine: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  downtime_min: number;
  reject_count: number;
}

export interface ErpOeeResult {
  metrics: ErpOeeMetric[];
  plant_oee: number;
}

// ---------------------------------------------------------------------------
// POST /erp/analytics/predictive — Predictive maintenance
// ---------------------------------------------------------------------------

export interface ErpPredictiveRequest {
  machines?: string[];
}

export interface ErpMaintenanceAlert {
  machine: string;
  component: string;
  risk_level: "low" | "medium" | "high" | "critical";
  predicted_failure_date: string;
  recommended_action: string;
  estimated_downtime_hours: number;
}

export interface ErpPredictiveResult {
  alerts: ErpMaintenanceAlert[];
  machines_at_risk: number;
  next_maintenance_due: string;
}

// ---------------------------------------------------------------------------
// API response wrapper
// ---------------------------------------------------------------------------

export interface ErpApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}
