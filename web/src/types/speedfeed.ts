export interface OrchestratorInput {
  material?: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  hardness_hrc?: number;
  machine_name?: string;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machinePackage?: {
    [key: string]: unknown;
    confidence?: { [key: string]: number | undefined; overall?: number };
    spindle?: {
      max_rpm?: number;
      power_kw?: number;
      power_continuous_kw?: number;
      power?: number;
      max_torque_nm?: number;
      taper?: string;
    };
    provenance?: Record<string, unknown>;
  };
  machine_rigidity?: "low" | "medium" | "high";
  machine_type?: string;
  spindle_taper?: string;
  tool_diameter_mm?: number;
  flutes?: number;
  tool_material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  tool_coating?: string;
  corner_radius_mm?: number;
  tool_stickout_mm?: number;
  holder_type?: "shrink_fit" | "hydraulic" | "ER_collet" | "Weldon" | "milling_chuck";
  operation?: "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "plunge" | "slot";
  cam_system?: string;
  cam_strategy?: string;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  workholding_type?: "vise" | "fixture" | "vacuum" | "magnetic" | "collet" | "chuck";
  coolant_type?: "flood" | "mist" | "MQL" | "dry" | "cryogenic" | "through_tool";
  coolant_pressure_bar?: number;
  wall_thickness_mm?: number;
  overhang_ratio?: number;
  feature_tolerance_mm?: number;
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced" | "cost";
  output_detail?: "minimal" | "standard" | "full";
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
