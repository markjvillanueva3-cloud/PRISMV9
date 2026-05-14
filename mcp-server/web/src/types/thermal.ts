export interface HeatExchangerResult {
  type: "shell_tube" | "plate" | "finned_tube" | "double_pipe";
  duty_kw: number;
  lmtd_K: number;
  ua_W_K: number;
  area_m2: number;
  effectiveness: number;
  ntu: number;
  pressure_drop_hot_kPa: number;
  pressure_drop_cold_kPa: number;
  warnings?: string[];
}

export interface PumpResult {
  pump_type: "centrifugal" | "positive_displacement" | "axial";
  flow_rate_m3_h: number;
  head_m: number;
  power_kw: number;
  efficiency_pct: number;
  npsh_available_m: number;
  npsh_required_m: number;
  specific_speed: number;
  operating_point: { flow: number; head: number };
}

export interface PipeResult {
  reynolds_number: number;
  friction_factor: number;
  pressure_drop_kPa: number;
  velocity_m_s: number;
  flow_regime: "laminar" | "transitional" | "turbulent";
  head_loss_m: number;
  pipe_schedule?: string;
  warnings?: string[];
}

export interface HydraulicResult {
  cylinder_type: "single_acting" | "double_acting";
  bore_mm: number;
  rod_diameter_mm: number;
  stroke_mm: number;
  force_extend_N: number;
  force_retract_N: number;
  flow_rate_lpm: number;
  pressure_bar: number;
  velocity_mm_s: number;
}

export interface CompressorResult {
  compressor_type: "reciprocating" | "screw" | "centrifugal" | "scroll";
  flow_rate_m3_min: number;
  pressure_ratio: number;
  discharge_pressure_bar: number;
  power_kw: number;
  isentropic_efficiency_pct: number;
  discharge_temperature_K: number;
  stages: number;
}

export interface CoolingResult {
  cooling_method: "forced_air" | "liquid" | "spray" | "cryogenic";
  heat_removal_rate_W: number;
  coolant_flow_rate_lpm: number;
  temperature_drop_K: number;
  convection_coefficient_W_m2K: number;
  thermal_resistance_K_W: number;
  effectiveness: number;
  recommendations?: string[];
}

export interface ThermalInput {
  action: string;
  [key: string]: unknown;
}

export interface ApiError {
  message: string;
  code?: string;
}
