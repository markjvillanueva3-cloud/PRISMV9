export interface GrindingParams {
  workpiece_material: string;
  wheel_type?: string;
  wheel_diameter_mm?: number;
  wheel_width_mm?: number;
  wheel_speed_m_s?: number;
  depth_of_cut_mm: number;
  feed_rate_mm_min?: number;
  table_speed_m_min?: number;
  workpiece_diameter_mm?: number;
  coolant_type?: string;
  operation?: "surface" | "cylindrical" | "centerless" | "internal";
  [key: string]: unknown;
}

export interface GrindingResult {
  surface_finish_Ra: number;
  specific_energy_J_mm3: number;
  power_kW: number;
  temperature_C: number;
  wheel_wear_ratio: number;
  mrr_mm3_min: number;
  force_normal_N: number;
  force_tangential_N: number;
  burn_risk: string;
  recommendations: string[];
}

export interface WheelSelectParams {
  workpiece_material: string;
  operation: string;
  target_finish_Ra?: number;
  hardness_HRC?: number;
  removal_rate_priority?: boolean;
}

export interface WheelSelectResult {
  abrasive_type: string;
  grain_size: string;
  grade: string;
  structure: string;
  bond_type: string;
  wheel_specification: string;
  speed_range_m_s: [number, number];
  notes: string[];
}

export interface DressingParams {
  wheel_type: string;
  wheel_diameter_mm: number;
  wheel_width_mm?: number;
  dresser_type?: string;
  dressing_depth_mm?: number;
  dressing_lead_mm_rev?: number;
  wheel_condition?: string;
}

export interface DressingResult {
  dressing_depth_mm: number;
  dressing_lead_mm_rev: number;
  overlap_ratio: number;
  dresser_traverse_speed_mm_min: number;
  wheel_speed_rpm: number;
  estimated_passes: number;
  post_dress_finish_Ra: number;
  recommendations: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
