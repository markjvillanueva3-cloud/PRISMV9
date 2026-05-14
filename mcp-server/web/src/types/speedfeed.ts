export interface OrchestratorInput {
  material?: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  hardness_hrc?: number;
  sigma_y_MPa?: number;
  machine_name?: string;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machine_rigidity?: "low" | "medium" | "high";
  machine_guideway?: "box" | "linear" | "hydrostatic";
  machine_type?: "vertical_mill" | "horizontal_mill" | "lathe" | "5axis" | "router" | "swiss";
  spindle_taper?: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-E40";
  spindle_bearing_preload?: "light" | "medium" | "heavy";
  machine_age_years?: number;
  machine_axis_accel_m_s2?: number;
  machine_axis_jerk_m_s3?: number;
  tool_diameter_mm?: number;
  flutes?: number;
  tool_material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  tool_coating?: string;
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  tool_stickout_mm?: number;
  edge_radius_mm?: number;
  tool_grade?: string;
  insert_grade?: string;
  tool_series?: string;
  holder_type?: "shrink_fit" | "hydraulic" | "ER_collet" | "Weldon" | "milling_chuck";
  holder_gauge_length_mm?: number;
  holder_tir_mm?: number;
  holder_balanced_g?: number;
  operation?: "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "plunge" | "slot";
  cam_system?: string;
  cam_strategy?: string;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  radial_depth_pct?: number;
  workholding_type?: "vise" | "fixture" | "vacuum" | "magnetic" | "collet" | "chuck" | "tombstone";
  workholding_stiffness?: "low" | "medium" | "high";
  clamping_force_kN?: number;
  workpiece_length_mm?: number;
  workpiece_width_mm?: number;
  workpiece_height_mm?: number;
  workpiece_diameter_mm?: number;
  coolant_type?: "flood" | "mist" | "MQL" | "dry" | "cryogenic" | "through_tool";
  coolant_pressure_bar?: number;
  coolant_concentration_pct?: number;
  wall_thickness_mm?: number;
  overhang_ratio?: number;
  feature_tolerance_mm?: number;
  system_stiffness_n_m?: number;
  natural_frequency_hz?: number;
  damping_ratio?: number;
  tool_cost_usd?: number;
  machine_cost_per_min?: number;
  tool_change_time_min?: number;
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced" | "cost";
  output_detail?: "minimal" | "standard" | "full";
  calibration_overrides?: {
    kc1_1_factor?: number;
    taylor_c_factor?: number;
    taylor_n_factor?: number;
    vc_factor?: number;
    ra_factor?: number;
    power_factor?: number;
    source?: string;
    confidence?: number;
  };
}

export interface OrchestratorResult {
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  feed_rate_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  torque_Nm: number;
  tangential_force_N: number;
  tool_life_min: number;
  surface_finish_Ra_um: number;
  deflection_um: number;
  overall_confidence: number;
  uncertainty: {
    force_ci95: [number, number];
    life_ci95: [number, number];
    ra_ci95: [number, number];
    ra_cpk: number | null;
    weibull: { beta: number; eta_min: number; p_survive_30min: number } | null;
    p_chatter: number;
    sobol_dominant: string;
    sobol_contributions: { kc_pct: number; life_pct: number; ra_pct: number };
    dominant_uncertainty_source: string;
    suggested_measurement: string;
  };
  stability_assessment: {
    zone: "stable" | "marginal" | "unstable";
    p_chatter: number;
    suggested_rpm_pocket?: number;
    lobe_index?: number;
    message: string;
  };
  limiting_factors: Array<{
    parameter: string;
    constraint: string;
    utilization_pct: number;
    severity: "info" | "warning" | "critical";
  }>;
  safety_checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    value?: number;
    limit?: number;
  }>;
  playbook_warnings: string[];
  recommendations: string[];
  alternatives: Array<{
    label: string;
    cutting_speed_mpm: number;
    spindle_rpm: number;
    feed_rate_mmmin: number;
    mrr_cm3min: number;
    tool_life_min: number;
    note: string;
  }>;
  formulas_used: string[];
}

export interface ParetoSolution {
  label: string;
  vc_mpm: number;
  fz_mm: number;
  ap_mm: number;
  mrr_cm3min: number;
  tool_life_min: number;
  ra_um: number;
  confidence: number;
}

export interface OptimizeResult {
  method: string;
  particles: number;
  iterations: number;
  archive_size: number;
  pareto_front: ParetoSolution[];
  best_mrr: string;
  best_tool_life: string;
  best_finish: string;
  recommended: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
