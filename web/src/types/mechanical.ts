export interface MechanicalInput {
  action: string;
  // Common fields used across categories
  material?: string;
  force_N?: number;
  torque_Nm?: number;
  speed_rpm?: number;
  power_kw?: number;
  diameter_mm?: number;
  length_mm?: number;
  width_mm?: number;
  thickness_mm?: number;
  safety_factor?: number;
  // Gear-specific
  module_mm?: number;
  teeth?: number;
  pressure_angle_deg?: number;
  helix_angle_deg?: number;
  // Bearing-specific
  load_N?: number;
  life_hours?: number;
  // Spring-specific
  wire_diameter_mm?: number;
  coil_diameter_mm?: number;
  active_coils?: number;
  spring_rate_N_mm?: number;
  // Shaft-specific
  shaft_diameter_mm?: number;
  key_width_mm?: number;
  // Fastener-specific
  bolt_size?: string;
  bolt_grade?: string;
  clamp_length_mm?: number;
  preload_N?: number;
  [key: string]: unknown;
}

export interface MechanicalResult {
  value: unknown;
  confidence?: number;
  source?: string;
  formulas_used?: string[];
  warnings?: string[];
  unit?: string;
}

export interface MechanicalCategory {
  path: string;
  actions: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
