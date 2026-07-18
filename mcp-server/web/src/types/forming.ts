export interface SheetMetalParams {
  material: string;
  thickness_mm: number;
  bend_radius_mm?: number;
  bend_angle_deg?: number;
  bend_length_mm?: number;
  die_opening_mm?: number;
  tensile_strength_MPa?: number;
  yield_strength_MPa?: number;
  k_factor?: number;
  operation?: "bending" | "deep_drawing" | "blanking" | "stamping";
}

export interface SheetMetalResult {
  bend_allowance_mm: number;
  bend_deduction_mm: number;
  springback_angle_deg: number;
  bending_force_kN: number;
  // Optional: the /forming/sheet-metal adapter (press_brake_calculate) does not produce these
  // two -- PressBrakeEngine has no min-bend-radius output and blank size needs per-flange
  // geometry not in SheetMetalParams. Omitted (undefined) rather than fabricated; the type
  // matches that runtime contract. (slot:bravo U-FE-SPECIALTY-FORMING-CONTRACT 2026-06-19)
  minimum_bend_radius_mm?: number;
  blank_size_mm?: number;
  tonnage_required: number;
  recommendations: string[];
}

export interface CastingParams {
  material: string;
  casting_type?: string;
  part_weight_kg?: number;
  wall_thickness_mm?: number;
  max_section_mm?: number;
  pour_temperature_C?: number;
  mold_material?: string;
  complexity_factor?: number;
}

export interface CastingResult {
  solidification_time_s: number;
  shrinkage_pct: number;
  defect_risk: Record<string, string>;
  pouring_rate_kg_s: number;
  riser_volume_cm3: number;
  cooling_rate_C_s: number;
  mold_fill_time_s: number;
  recommendations: string[];
}

export interface MoldingParams {
  material: string;
  part_volume_cm3?: number;
  wall_thickness_mm?: number;
  melt_temperature_C?: number;
  mold_temperature_C?: number;
  injection_pressure_MPa?: number;
  clamping_force_kN?: number;
  cycle_time_s?: number;
  num_cavities?: number;
}

export interface MoldingResult {
  fill_time_s: number;
  packing_pressure_MPa: number;
  cooling_time_s: number;
  cycle_time_s: number;
  clamping_force_kN: number;
  shrinkage_pct: number;
  warp_risk: string;
  sink_mark_risk: string;
  recommendations: string[];
}

export interface ApiError {
  message: string;
  code?: string;
}
