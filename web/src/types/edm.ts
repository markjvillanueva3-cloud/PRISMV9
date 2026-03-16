export interface WireEdmParams {
  material: string;
  thickness_mm: number;
  wire_diameter_mm?: number;
  wire_type?: string;
  discharge_energy_mJ?: number;
  pulse_on_us?: number;
  pulse_off_us?: number;
  wire_tension_N?: number;
  flushing_pressure_bar?: number;
  taper_angle_deg?: number;
  num_cuts?: number;
}

export interface WireEdmResult {
  cutting_speed_mm_min: number;
  surface_finish_Ra: number;
  wire_consumption_m_min: number;
  kerf_width_mm: number;
  power_consumption_kW: number;
  mrr_mm3_min: number;
  estimated_time_min: number;
  recommendations: string[];
}

export interface SinkerEdmParams {
  material: string;
  electrode_material?: string;
  depth_mm: number;
  area_mm2: number;
  discharge_energy_mJ?: number;
  pulse_on_us?: number;
  pulse_off_us?: number;
  polarity?: "positive" | "negative";
  dielectric?: string;
  orbit_mode?: boolean;
}

export interface SinkerEdmResult {
  mrr_mm3_min: number;
  electrode_wear_ratio: number;
  surface_finish_Ra: number;
  overcut_mm: number;
  power_consumption_kW: number;
  estimated_time_min: number;
  recast_layer_um: number;
  recommendations: string[];
}

export interface LaserParams {
  material: string;
  thickness_mm: number;
  laser_type?: string;
  power_W: number;
  wavelength_nm?: number;
  pulse_duration_ns?: number;
  repetition_rate_kHz?: number;
  spot_diameter_um?: number;
  assist_gas?: string;
  gas_pressure_bar?: number;
}

export interface LaserResult {
  cutting_speed_mm_min: number;
  kerf_width_mm: number;
  haz_depth_um: number;
  surface_roughness_Ra: number;
  power_density_W_cm2: number;
  gas_consumption_l_min: number;
  edge_quality: string;
  recommendations: string[];
}

export interface EdmParametersParams {
  process: "wire" | "sinker" | "laser";
  material: string;
  target_finish_Ra?: number;
}

export interface EdmParametersResult {
  suggested_params: Record<string, number | string>;
  notes: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
