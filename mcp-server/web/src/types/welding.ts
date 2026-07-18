export interface WeldingParams {
  process: string;
  material: string;
  thickness_mm: number;
  joint_type?: string;
  filler_material?: string;
  shielding_gas?: string;
  voltage_V?: number;
  current_A?: number;
  travel_speed_mm_min?: number;
  wire_feed_speed_m_min?: number;
  preheat_temp_C?: number;
  interpass_temp_C?: number;
  position?: string;
  [key: string]: unknown;
}

export interface WeldingResult {
  heat_input_kJ_mm: number;
  weld_strength_MPa: number;
  distortion_mm: number;
  haz_width_mm: number;
  // Optional: omitted by the /welding/calculate adapter when the engine's t8/5 cooling time is 0
  // (divide-by-zero guard) -- the type matches that runtime contract. (slot:bravo 2026-06-19)
  cooling_rate_C_s?: number;
  deposition_rate_kg_h: number;
  preheat_required: boolean;
  preheat_temp_C: number;
  carbon_equivalent: number;
  recommendations: string[];
}

export interface JointDesignParams {
  joint_type: string;
  material: string;
  thickness_mm: number;
  load_type?: string;
  load_N?: number;
  weld_length_mm?: number;
  safety_factor?: number;
  code?: string;
}

export interface JointDesignResult {
  weld_size_mm: number;
  throat_thickness_mm: number;
  // Optional: the /welding/joint-design adapter (weld_strength_calculate sizing search) does not
  // produce joint-prep geometry or an effective-length reduction -- those three are omitted, not
  // fabricated; the type matches that runtime contract. (slot:bravo 2026-06-19)
  effective_length_mm?: number;
  allowable_stress_MPa: number;
  actual_stress_MPa: number;
  utilization_pct: number;
  groove_angle_deg?: number;
  root_gap_mm?: number;
  recommendations: string[];
}

export interface InspectionParams {
  process: string;
  material: string;
  thickness_mm: number;
  joint_type?: string;
  code?: string;
  quality_level?: string;
  inspection_method?: string;
}

export interface InspectionResult {
  required_methods: string[];
  acceptance_criteria: Record<string, string>;
  ndt_coverage_pct: number;
  defect_types: string[];
  qualification_required: string;
  documentation: string[];
  recommendations: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
