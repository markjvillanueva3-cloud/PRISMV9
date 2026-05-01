export interface TelemetryDashboard {
  total_requests: number;
  avg_latency_ms: number;
  error_rate_pct: number;
  uptime_hours: number;
  top_actions: Array<{ action: string; count: number; avg_ms: number }>;
  hourly_traffic: Array<{ hour: string; requests: number }>;
}

export interface TelemetryAnomaly {
  id: string;
  metric: string;
  expected: number;
  actual: number;
  severity: "low" | "medium" | "high";
  timestamp: string;
}

export interface TelemetryOptimization {
  action: string;
  current_latency_ms: number;
  suggested_optimization: string;
  estimated_improvement_pct: number;
}

export interface ApiError { message: string; code?: string; }
