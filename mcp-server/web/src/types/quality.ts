export interface SpcRequest {
  measurements: number[];
  nominal: number;
  usl: number;
  lsl: number;
}

export interface SpcResult {
  xbar: number;
  range: number;
  std_dev: number;
  cp: number;
  cpk: number;
  in_control: boolean;
  out_of_control_points: number[];
  control_limits: {
    ucl: number;
    lcl: number;
    center: number;
  };
}

export interface CpkRequest {
  measurements: number[];
  usl: number;
  lsl: number;
}

export interface CpkResult {
  cp: number;
  cpk: number;
  cpu: number;
  cpl: number;
  mean: number;
  std_dev: number;
  ppm_defective: number;
  sigma_level: number;
}

export interface MeasurementRequest {
  feature: string;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  measured_values: number[];
}

export interface MeasurementResult {
  mean: number;
  range: number;
  std_dev: number;
  min: number;
  max: number;
  within_tolerance: boolean;
  deviations: number[];
}

export interface ToleranceStackRequest {
  dimensions: Array<{
    nominal: number;
    tolerance_plus: number;
    tolerance_minus: number;
  }>;
  method: "worst_case" | "rss" | "monte_carlo";
}

export interface ToleranceStackResult {
  nominal_total: number;
  tolerance_plus: number;
  tolerance_minus: number;
  method: string;
  details?: unknown;
}

export interface ApiError {
  message: string;
  code?: string;
}
