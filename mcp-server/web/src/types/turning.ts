export interface TurningParams {
  material: string;
  diameter_mm: number;
  length_mm?: number;
  depth_of_cut_mm: number;
  feed_mm_rev?: number;
  insert_type?: string;
  insert_grade?: string;
  nose_radius_mm?: number;
  cutting_speed_m_min?: number;
  coolant?: boolean;
  operation?: string;
  [key: string]: unknown;
}

export interface TurningResult {
  cutting_speed_m_min: number;
  spindle_rpm: number;
  feed_rate_mm_min: number;
  power_kW: number;
  surface_finish_Ra: number;
  tool_life_min: number;
  mrr_cm3_min: number;
  cutting_force_N: number;
  torque_Nm: number;
  recommendations: string[];
}

export interface ThreadingParams {
  material: string;
  diameter_mm: number;
  pitch_mm: number;
  thread_type?: string;
  thread_class?: string;
  internal?: boolean;
  length_mm?: number;
  num_passes?: number;
  infeed_method?: string;
}

export interface ThreadingResult {
  cutting_speed_m_min: number;
  spindle_rpm: number;
  num_passes: number;
  depth_per_pass_mm: number[];
  total_depth_mm: number;
  infeed_angle_deg: number;
  tool_life_threads: number;
  recommendations: string[];
}

export interface GroovingParams {
  material: string;
  diameter_mm: number;
  groove_width_mm: number;
  groove_depth_mm: number;
  feed_mm_rev?: number;
  insert_width_mm?: number;
  operation?: "external" | "internal" | "face";
}

export interface GroovingResult {
  cutting_speed_m_min: number;
  spindle_rpm: number;
  feed_rate_mm_min: number;
  plunge_feed_mm_rev: number;
  radial_force_N: number;
  power_kW: number;
  estimated_time_min: number;
  recommendations: string[];
}

export interface BoringParams {
  material: string;
  bore_diameter_mm: number;
  bore_depth_mm: number;
  depth_of_cut_mm: number;
  feed_mm_rev?: number;
  bar_diameter_mm?: number;
  overhang_ratio?: number;
  finish_required_Ra?: number;
}

export interface BoringResult {
  cutting_speed_m_min: number;
  spindle_rpm: number;
  feed_rate_mm_min: number;
  deflection_um: number;
  surface_finish_Ra: number;
  power_kW: number;
  max_depth_of_cut_mm: number;
  recommendations: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
