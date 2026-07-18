export interface CostEstimateRequest {
  material: string;
  operation: string;
  quantity: number;
  setup_time_min?: number;
  cycle_time_min?: number;
  tool_cost?: number;
  machine_rate_per_hour?: number;
}

// A dynamic category->$ map. The /cost/estimate route's adaptCostEstimate (routes/cost.ts) emits only the
// components process_cost actually computes (machine/tooling/setup), NOT a fixed material/labor/overhead set.
// Kept as a Record so this type can't silently re-diverge from api/cost.ts's CostEstimate (the one the page
// actually imports). See [[reference_charlie_costpage_shape_2026_06_24]]. No consumer reads a literal key.
export type CostBreakdown = Record<string, number>;

export interface CostEstimate {
  total_cost: number;
  per_part_cost: number;
  breakdown: CostBreakdown;
}

export interface QuoteRequest {
  job_name: string;
  material: string;
  operations: Array<{
    operation: string;
    cycle_time_min: number;
    setup_time_min: number;
  }>;
  quantity: number;
  margin_percent?: number;
}

export interface QuoteResult {
  quote_id: string;
  total_price: number;
  per_part_price: number;
  breakdown: CostBreakdown;
  margin: number;
  lead_time_days?: number;
}

export interface CostCompareRequest {
  scenarios: Array<{
    name: string;
    material: string;
    operation: string;
    quantity: number;
    machine_rate_per_hour?: number;
  }>;
}

export interface CostCompareResult {
  scenarios: Array<{
    name: string;
    total_cost: number;
    per_part_cost: number;
    breakdown: CostBreakdown;
  }>;
  cheapest: string;
  savings_vs_most_expensive: number;
}

export interface CostHistoryEntry {
  job_id: string;
  date: string;
  total_cost: number;
  per_part_cost: number;
  quantity: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
