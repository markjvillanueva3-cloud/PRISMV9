export interface ForensicResult {
  analysis_type: "tool_autopsy" | "chip_analysis" | "surface_defect" | "crash";
  findings: Array<{ category: string; description: string; severity: string; evidence: string }>;
  root_cause: string;
  recommendations: string[];
  confidence: number;
}

export interface InverseSolution {
  target_parameter: string;
  target_value: number;
  solved_inputs: Record<string, number>;
  method: string;
  residual: number;
  iterations: number;
}

export interface GenerativePlan {
  features: Array<{ id: string; type: string; operations: string[] }>;
  operation_sequence: Array<{ op: string; tool: string; strategy: string; estimated_time_min: number }>;
  total_time_min: number;
  tool_count: number;
}

export interface SustainabilityReport {
  energy_kwh: number;
  carbon_kg: number;
  coolant_liters: number;
  waste_kg: number;
  eco_score: number;
  recommendations: string[];
}

export interface ApiError { message: string; code?: string; }
