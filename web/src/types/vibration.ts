export interface StabilityLobeResult {
  lobes: { speed_rpm: number; depth_limit_mm: number }[];
  critical_speed_rpm: number;
  max_stable_depth_mm: number;
  chatter_frequency_hz: number;
  recommended_speeds: number[];
  warnings?: string[];
}

export interface ModalAnalysisResult {
  natural_frequencies_hz: number[];
  mode_shapes: { mode: number; frequency_hz: number; damping_ratio: number; description: string }[];
  dominant_mode: number;
  frf_magnitude: { frequency_hz: number; magnitude: number; phase_deg: number }[];
}

export interface ChatterDetectionResult {
  is_chatter: boolean;
  severity: "none" | "mild" | "moderate" | "severe";
  chatter_frequency_hz?: number;
  amplitude_mm?: number;
  confidence: number;
  mitigation_suggestions?: string[];
  spectrum: { frequency_hz: number; power: number }[];
}

export interface ProcessDampingResult {
  damping_coefficient: number;
  stability_gain_pct: number;
  effective_depth_increase_mm: number;
  optimal_speed_rpm: number;
  ploughing_force_N: number;
  relief_angle_effect: number;
  recommendations?: string[];
}

export interface VibrationInput {
  action: string;
  speed_rpm?: number;
  depth_mm?: number;
  flutes?: number;
  tool_diameter_mm?: number;
  natural_freq_hz?: number;
  damping_ratio?: number;
  stiffness_N_m?: number;
  material?: string;
  radial_depth_mm?: number;
  [key: string]: unknown;
}

export interface ApiError {
  message: string;
  code?: string;
}
