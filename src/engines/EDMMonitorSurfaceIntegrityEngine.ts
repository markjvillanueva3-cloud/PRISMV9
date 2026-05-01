/**
 * EDMMonitorSurfaceIntegrityEngine
 *
 * WEDM-P2P-MS13 + MS14 combined engine.
 * MS13: Real-time process monitoring (gap voltage, speed, discharge, adaptive control, thermal drift)
 * MS14: Surface integrity assessment — SAFETY CRITICAL (recast, HAZ, microcracks, residual stress,
 *        fatigue life, spec compliance for aerospace/medical/automotive)
 *
 * Physics references:
 *   - Recast layer: d_recast = 2·√(α·t_on)  [Carslaw & Jaeger heat conduction]
 *   - HAZ: material-dependent multiplier × recast depth (Ti=2, Ni=4, steel=3)
 *   - Residual stress: tensile, material-scaled 200–800 MPa thermal contraction model
 *   - Fatigue reduction: min(70%, d_rc×1.2 + σ_r×0.02)
 *   - Thermal drift: 12 µm/m/°C linear coefficient for machine iron/steel castings
 *   - Skim pass attenuation: factor 0.7 per pass (geometric series)
 *   - AMS 2628 (aerospace), ASTM F86 (medical), OEM spec (automotive)
 *
 * Actions: monitor_process | assess_surface_integrity | check_spec_compliance |
 *          predict_recast | calculate_fatigue_impact | full_assessment
 *
 * SAFETY CRITICAL (MS14): results carry safety_critical flag. Callers MUST
 * surface non-compliant results to the operator before releasing parts.
 */

// ============================================================================
// MS13 TYPES — Process Monitoring
// ============================================================================

/** Live gap-condition statistics from the EDM control */
export interface GapStats {
  /** Percentage of pulses classified as normal discharge (target ~70) */
  normal_pct: number;
  /** Percentage of pulses classified as open circuit (target ~20) */
  open_pct: number;
  /** Percentage of pulses classified as short circuit (target ~10) */
  short_pct: number;
}

/** Inputs to the process monitoring subsystem (MS13) */
export interface ProcessMonitorInput {
  /** Real-time gap pulse statistics */
  gap_stats?: GapStats;
  /** Measured cutting speed [mm/min] */
  actual_speed_mm_min?: number;
  /** CAM-predicted cutting speed [mm/min] */
  predicted_speed_mm_min?: number;
  /** Discharge pattern classification from EDM controller */
  discharge_pattern?: "normal" | "arcing" | "secondary" | "wire_erosion";
  /** Wire break probability [0–1] estimated by the control */
  wire_break_risk?: number;
  /** Ambient shop temperature [°C] at job start */
  ambient_temp_C?: number;
  /** Dielectric fluid temperature [°C] */
  dielectric_temp_C?: number;
  /** Elapsed cutting time [hours] for thermal drift accumulation */
  cutting_duration_hours?: number;
}

/** Recommended adaptive-control action */
export type AdaptiveAction =
  | "none"
  | "retract"
  | "advance"
  | "reduce_energy"
  | "increase_tension"
  | "increase_t_off"
  | "reduce_speed"
  | "emergency_stop";

/** Result from a single gap-voltage monitoring cycle */
export interface GapVoltageResult {
  normal_pct: number;
  open_pct: number;
  short_pct: number;
  gap_condition: "optimal" | "too_many_shorts" | "too_many_opens" | "unstable";
  action: "none" | "retract" | "advance";
  reason: string;
}

/** Result from cutting-speed tracking */
export interface SpeedTrackerResult {
  actual_mm_min: number;
  predicted_mm_min: number;
  ratio_pct: number;
  status: "on_target" | "slow" | "fast";
  interpretation: string;
  action: "none" | "investigate" | "note_softer_material";
}

/** Result from abnormal-discharge detection */
export interface AbnormalDischargeResult {
  pattern: string;
  severity: "none" | "low" | "medium" | "high" | "critical";
  description: string;
  action: AdaptiveAction;
}

/** PID-style adaptive parameter adjustment recommendation */
export interface AdaptiveAdjustResult {
  trigger: string;
  energy_change_pct: number;      // negative = reduce
  t_off_change_pct: number;       // positive = increase
  tension_change_pct: number;     // positive = increase
  wire_speed_change_pct: number;  // positive = increase
  recommended_action: AdaptiveAction;
  reasoning: string;
}

/** Thermal drift compensation result */
export interface ThermalDriftResult {
  ambient_temp_C: number;
  dielectric_temp_C: number;
  temp_delta_C: number;
  machine_expansion_um_per_m: number;
  total_drift_um: number;         // for a 500 mm machine span
  compensation_required: boolean;
  compensation_um: number;
  recommendation: string;
}

/** Aggregated process monitoring result (MS13) */
export interface ProcessMonitorResult {
  gap_voltage?: GapVoltageResult;
  speed_tracker?: SpeedTrackerResult;
  abnormal_discharge?: AbnormalDischargeResult;
  adaptive_adjustment?: AdaptiveAdjustResult;
  thermal_drift?: ThermalDriftResult;
  overall_status: "stable" | "warning" | "intervene" | "emergency_stop";
  priority_action: AdaptiveAction;
  alerts: string[];
}

// ============================================================================
// MS14 TYPES — Surface Integrity (SAFETY CRITICAL)
// ============================================================================

/** Inputs to the surface integrity assessment subsystem (MS14) */
export interface SurfaceIntegrityInput {
  /** Workpiece material name (e.g. "D2", "Ti-6Al-4V", "Inconel 718", "Al 6061") */
  material: string;
  /** Carbon content [weight %] — drives microcrack risk */
  carbon_content_pct?: number;
  /** Initial hardness [HRC] — affects temper softening calculation */
  hardness_hrc?: number;
  /** Thermal diffusivity α [mm²/s] — drives recast layer depth */
  thermal_diffusivity_mm2_s?: number;
  /** Pulse-on time t_on [µs] */
  pulse_on_us: number;
  /** Single-pulse energy [mJ] */
  pulse_energy_mj: number;
  /** Number of skim passes already applied (0 = rough cut only) */
  num_skim_passes: number;
  /** Flushing mode — submerged reduces recast by ~25% */
  flushing_mode: "submerged" | "spray" | "combined";
  /** Application class — drives spec selection */
  application: "aerospace" | "medical" | "automotive" | "tooling" | "general";
  /** Nominal machine span [mm] for thermal drift (default 500) */
  machine_span_mm?: number;
}

/** Recast layer sub-result */
export interface RecastLayerResult {
  /** Recast depth after rough cut [µm] */
  depth_um: number;
  /** Recast depth after N skim passes [µm] */
  after_skims_um: number;
  /** Probability of surface cracks in recast layer [%] */
  crack_probability_pct: number;
}

/** HAZ sub-result */
export interface HAZResult {
  /** Heat-affected zone depth [µm] */
  depth_um: number;
  /** Estimated hardness loss at surface [HRC] */
  hardness_loss_hrc: number;
}

/** Microcrack density classification */
export type MicrocrackDensity = "none" | "isolated" | "moderate" | "extensive";

/** Microcrack sub-result */
export interface MicrocrackResult {
  density: MicrocrackDensity;
  /** Representative microcrack depth [µm] */
  depth_um: number;
  /** Contributing factors */
  factors: string[];
}

/** Residual stress sub-result (always tensile for WEDM) */
export interface ResidualStressResult {
  type: "tensile";
  /** Estimated surface residual stress magnitude [MPa] */
  magnitude_MPa: number;
  /** Depth at which stress returns to bulk [µm] */
  affected_depth_um: number;
}

/** Fatigue life impact sub-result */
export interface FatigueResult {
  /** Fatigue life reduction vs. conventionally machined surface [%] */
  life_reduction_pct: number;
  /** Fatigue reduction after shot peening [%] */
  with_shot_peen_pct: number;
  /** Other recommended remediation options */
  remediation: string[];
}

/** Applicable spec limit set */
export interface SpecLimits {
  spec: string;
  max_recast_um: number;
  max_haz_um: number;
  max_stress_MPa: number;
}

/** Spec compliance sub-result */
export interface SpecComplianceResult {
  spec: string;
  recast_pass: boolean;
  haz_pass: boolean;
  stress_pass: boolean;
  overall_pass: boolean;
  required_post_process: string[];
}

/** Complete surface integrity assessment result (MS14) */
export interface SurfaceIntegrityResult {
  recast: RecastLayerResult;
  haz: HAZResult;
  microcracks: MicrocrackResult;
  residual_stress: ResidualStressResult;
  fatigue: FatigueResult;
  spec_compliance: SpecComplianceResult;
  recommendations: string[];
  /** True when application is aerospace or medical — callers MUST halt release on failure */
  safety_critical: boolean;
}

// ============================================================================
// SPEC DATABASE
// ============================================================================

/** Spec limits by application class */
const SPEC_DATABASE: Record<string, SpecLimits> = {
  aerospace: {
    spec: "AMS 2628",
    max_recast_um: 0,      // zero recast — must be fully removed by skimming/polishing
    max_haz_um: 25,
    max_stress_MPa: 400,
  },
  medical: {
    spec: "ASTM F86 / ISO 10993",
    max_recast_um: 5,
    max_haz_um: 50,
    max_stress_MPa: 500,
  },
  automotive: {
    spec: "OEM internal / AIAG",
    max_recast_um: 25,
    max_haz_um: 75,
    max_stress_MPa: 700,
  },
  tooling: {
    spec: "Shop standard",
    max_recast_um: 15,
    max_haz_um: 60,
    max_stress_MPa: 800,
  },
  general: {
    spec: "None / customer drawing",
    max_recast_um: 50,
    max_haz_um: 150,
    max_stress_MPa: 1000,
  },
};

// ============================================================================
// MATERIAL DATABASE (thermal diffusivity defaults)
// ============================================================================

const MATERIAL_ALPHA: Record<string, number> = {
  // α [mm²/s]
  "D2":            4.1,   // high-carbon tool steel — low α → deep recast
  "H13":           5.6,
  "M2":            4.8,
  "P20":           6.2,
  "4140":         11.0,   // α = k/(ρ·cp) ≈ 42.6/(7850×0.473e-3) = 11.5; MatWeb: 11.2 mm²/s
  "4340":         11.0,   // similar alloy steel; MatWeb: 10.9 mm²/s
  "Ti-6Al-4V":     2.9,   // low α — significant recast risk
  "Inconel 718":   3.3,
  "Inconel 625":   3.2,
  "Al 6061":      65.0,   // high α → shallow recast, near-zero crack risk
  "Al 7075":      70.0,
  "Cu":          116.0,
  "WC":           25.0,   // cemented carbide WC-10%Co: α ≈ 24–30 mm²/s (CRC Handbook)
  "default":       6.0,
};

/** Return thermal diffusivity for material, case-insensitive partial match */
function lookupAlpha(material: string): number {
  const key = Object.keys(MATERIAL_ALPHA).find(
    k => k !== "default" && material.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MATERIAL_ALPHA[key] : MATERIAL_ALPHA["default"];
}

/** Return carbon content default for common materials */
function lookupCarbonPct(material: string): number {
  const m = material.toLowerCase();
  if (m.includes("d2"))   return 2.1;
  if (m.includes("m2"))   return 0.85;
  if (m.includes("h13"))  return 0.4;
  if (m.includes("p20"))  return 0.35;
  if (m.includes("4340")) return 0.4;
  if (m.includes("4140")) return 0.4;
  if (m.includes("ti"))   return 0.0;
  if (m.includes("al"))   return 0.0;
  if (m.includes("inconel")) return 0.05;
  if (m.includes("wc"))   return 0.0;  // carbide — carbon in matrix, not dissolved
  return 0.3;  // generic medium carbon steel
}

// ============================================================================
// MATERIAL-DEPENDENT HAZ MULTIPLIERS (WEDM-HARDEN U-WH05)
// ============================================================================
// HAZ depth = recast_depth × multiplier.  Physics rationale:
//   Ti alloys:   low k → concentrated heat → thin but intense HAZ (×2)
//   Ni alloys:   very low k → deep concentrated HAZ (×4)
//   Aluminum:    high k → heat diffuses quickly → moderate shallow HAZ (×3)
//   Steels:      moderate k → standard HAZ (×3)
//   WC/carbide:  high k → narrow HAZ (×2.5)
// Source: Lee & Tai, J. Mat. Proc. Tech. 2003; Aspinwall et al., Int. J. Mach. Tools 2008

const MATERIAL_HAZ_MULTIPLIER: Record<string, number> = {
  "D2":          3.0,
  "H13":         3.0,
  "M2":          3.0,
  "P20":         3.0,
  "4140":        3.0,
  "4340":        3.0,
  "Ti-6Al-4V":   2.0,  // low k concentrates heat → thin intense HAZ
  "Inconel 718": 4.0,  // very low k → deep HAZ penetration
  "Inconel 625": 4.0,
  "Al 6061":     3.0,  // high k → wide but shallow
  "Al 7075":     3.0,
  "Cu":          2.5,  // very high k → narrow HAZ
  "WC":          2.5,  // cemented carbide — high k from Co binder
  "default":     3.0,
};

/** Return material-dependent HAZ multiplier */
function lookupHAZMultiplier(material: string): number {
  const key = Object.keys(MATERIAL_HAZ_MULTIPLIER).find(
    k => k !== "default" && material.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MATERIAL_HAZ_MULTIPLIER[key] : MATERIAL_HAZ_MULTIPLIER["default"];
}

// ============================================================================
// MATERIAL-DEPENDENT RECAST k-FACTOR (WEDM-HARDEN U-WH05)
// ============================================================================
// Adjusts recast layer depth by material response to thermal pulse:
//   Ti:  k=0.80 (retains heat → deeper recast per unit α)
//   Al:  k=0.65 (rapid quench → thinner recast)
//   Steel: k=0.70 (moderate)
//   Ni:  k=0.85 (sluggish heat flow → deep recast)
//   WC:  k=0.60 (high melting point → less recast per unit energy)
// Source: Materials Science agent scrutiny + Dauw & Albert, CIRP Annals 1992

const MATERIAL_K_RECAST: Record<string, number> = {
  "D2":          0.70,
  "H13":         0.70,
  "M2":          0.70,
  "P20":         0.70,
  "4140":        0.70,
  "4340":        0.70,
  "Ti-6Al-4V":   0.80,  // retains heat → deeper recast
  "Inconel 718": 0.85,  // sluggish heat flow → deep recast
  "Inconel 625": 0.85,
  "Al 6061":     0.65,  // rapid quench → thinner recast
  "Al 7075":     0.65,
  "Cu":          0.55,  // very high k → shallow recast
  "WC":          0.60,  // high melting point → less recast
  "default":     0.70,
};

/** Return material-dependent recast k-factor */
function lookupKRecast(material: string): number {
  const key = Object.keys(MATERIAL_K_RECAST).find(
    k => k !== "default" && material.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MATERIAL_K_RECAST[key] : MATERIAL_K_RECAST["default"];
}

// ============================================================================
// MATERIAL-DEPENDENT RESIDUAL STRESS FACTOR (WEDM-HARDEN U-WH05)
// ============================================================================
// Scales residual stress magnitude by material thermal expansion & yield strength:
//   Ti:  0.75 (low CTE → less thermal contraction stress)
//   Ni:  1.20 (high yield + moderate CTE → retains thermal stress)
//   Al:  0.60 (high CTE but low yield → stress relieved by plastic flow)
//   Steel: 1.00 (baseline)
//   WC:  0.50 (extremely high yield, low CTE → minimal residual)

const MATERIAL_STRESS_FACTOR: Record<string, number> = {
  "D2":          1.10,  // high C martensite → retains stress
  "H13":         1.00,
  "M2":          1.05,
  "P20":         0.95,
  "4140":        1.00,
  "4340":        1.00,
  "Ti-6Al-4V":   0.75,
  "Inconel 718": 1.20,
  "Inconel 625": 1.15,
  "Al 6061":     0.60,
  "Al 7075":     0.65,
  "Cu":          0.50,
  "WC":          0.50,
  "default":     1.00,
};

/** Return material-dependent residual stress scaling factor */
function lookupStressFactor(material: string): number {
  const key = Object.keys(MATERIAL_STRESS_FACTOR).find(
    k => k !== "default" && material.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MATERIAL_STRESS_FACTOR[key] : MATERIAL_STRESS_FACTOR["default"];
}

// ============================================================================
// MS13 CALCULATION HELPERS
// ============================================================================

/** GapVoltageMonitor — normal:open:short ratio analysis */
function gapVoltageMonitor(stats: GapStats): GapVoltageResult {
  // Targets: normal ~70%, open ~20%, short ~10%
  const { normal_pct, open_pct, short_pct } = stats;

  let gap_condition: GapVoltageResult["gap_condition"] = "optimal";
  let action: GapVoltageResult["action"] = "none";
  let reason = "Gap condition within target ratios (70:20:10)";

  // Too many shorts — debris accumulation or wire too close → retract
  if (short_pct > 20) {
    gap_condition = "too_many_shorts";
    action = "retract";
    reason = `Shorts at ${short_pct.toFixed(1)}% (limit 20%) — debris bridging gap; retract to flush`;
  // Too many opens — gap too wide or servo lagging → advance
  } else if (open_pct > 40) {
    gap_condition = "too_many_opens";
    action = "advance";
    reason = `Opens at ${open_pct.toFixed(1)}% (limit 40%) — gap too wide; advance feed`;
  // Unstable: normals below minimum viable threshold
  } else if (normal_pct < 40) {
    gap_condition = "unstable";
    action = "retract";
    reason = `Normal discharges only ${normal_pct.toFixed(1)}% — process unstable; retract and check parameters`;
  }

  return { normal_pct, open_pct, short_pct, gap_condition, action, reason };
}

/** CuttingSpeedTracker — actual vs predicted */
function cuttingSpeedTracker(actual: number, predicted: number): SpeedTrackerResult {
  const ratio_pct = (actual / predicted) * 100;

  let status: SpeedTrackerResult["status"] = "on_target";
  let interpretation = "Cutting speed within expected range (80–120%)";
  let action: SpeedTrackerResult["action"] = "none";

  if (ratio_pct < 80) {
    status = "slow";
    interpretation =
      `Speed ${ratio_pct.toFixed(0)}% of predicted — possible causes: ` +
      "harder material than modeled, worn wire, contaminated dielectric, incorrect gap setting";
    action = "investigate";
  } else if (ratio_pct > 120) {
    status = "fast";
    interpretation =
      `Speed ${ratio_pct.toFixed(0)}% of predicted — material softer than modeled; ` +
      "verify material cert, check for substitution";
    action = "note_softer_material";
  }

  return {
    actual_mm_min: actual,
    predicted_mm_min: predicted,
    ratio_pct: Math.round(ratio_pct * 10) / 10,
    status,
    interpretation,
    action,
  };
}

/** AbnormalDischargeDetector — pattern classification */
function abnormalDischargeDetector(
  pattern: NonNullable<ProcessMonitorInput["discharge_pattern"]>
): AbnormalDischargeResult {
  switch (pattern) {
    case "normal":
      return {
        pattern,
        severity: "none",
        description: "Normal stochastic discharge — no action required",
        action: "none",
      };

    case "arcing":
      // Sustained discharge at one location → wire erosion → break risk
      return {
        pattern,
        severity: "critical",
        description:
          "ARCING detected: sustained discharge at fixed location. " +
          "Thermal overload — wire erosion accelerating; wire break imminent if uncorrected.",
        action: "reduce_energy",
      };

    case "secondary":
      // Debris re-melting — creates secondary recast, degrades surface integrity
      return {
        pattern,
        severity: "medium",
        description:
          "Secondary discharge (debris re-melt): gap contaminated with re-melted particles. " +
          "Increases recast layer thickness; improve flushing pressure.",
        action: "increase_t_off",
      };

    case "wire_erosion":
      // Wire diameter thinning — kerf width varies, accuracy degrades
      return {
        pattern,
        severity: "high",
        description:
          "Wire erosion pattern: wire diameter thinning detected via back-tension drop. " +
          "Kerf width will widen; dimensional accuracy at risk.",
        action: "increase_tension",
      };
  }
}

/** AdaptiveParameterAdjuster — PID-style response to wire break risk */
function adaptiveParameterAdjuster(wire_break_risk: number): AdaptiveAdjustResult {
  // Risk thresholds: <0.2 = normal, 0.2–0.5 = elevated, 0.5–0.8 = high, >0.8 = critical
  if (wire_break_risk < 0.2) {
    return {
      trigger: "break_risk_low",
      energy_change_pct: 0,
      t_off_change_pct: 0,
      tension_change_pct: 0,
      wire_speed_change_pct: 0,
      recommended_action: "none",
      reasoning: `Wire break risk ${(wire_break_risk * 100).toFixed(0)}% — within safe operating zone`,
    };
  }

  if (wire_break_risk < 0.5) {
    return {
      trigger: "break_risk_elevated",
      energy_change_pct: -10,
      t_off_change_pct: +15,
      tension_change_pct: +5,
      wire_speed_change_pct: +10,
      recommended_action: "reduce_energy",
      reasoning:
        `Wire break risk ${(wire_break_risk * 100).toFixed(0)}% — elevated. ` +
        "Reduce peak energy 10%, increase t_off 15%, increase tension 5%, speed wire feed +10%.",
    };
  }

  if (wire_break_risk < 0.8) {
    return {
      trigger: "break_risk_high",
      energy_change_pct: -20,
      t_off_change_pct: +25,
      tension_change_pct: +10,
      wire_speed_change_pct: +20,
      recommended_action: "reduce_speed",
      reasoning:
        `Wire break risk ${(wire_break_risk * 100).toFixed(0)}% — HIGH. ` +
        "Reduce energy 20%, increase t_off 25%, tension +10%, wire speed +20%. " +
        "Consider reducing cutting speed by 15%.",
    };
  }

  // risk >= 0.8 — emergency
  return {
    trigger: "break_risk_critical",
    energy_change_pct: -40,
    t_off_change_pct: +50,
    tension_change_pct: +15,
    wire_speed_change_pct: +30,
    recommended_action: "emergency_stop",
    reasoning:
      `Wire break risk ${(wire_break_risk * 100).toFixed(0)}% — CRITICAL. ` +
      "Emergency parameter reduction: energy -40%, t_off +50%. " +
      "Consider pausing cut and re-threading wire before continuing.",
  };
}

/**
 * ThermalDriftCompensator
 * Machine castings expand ~12 µm/m/°C. For a 500 mm span:
 *   drift_µm = 12 × (machine_span_m) × ΔT
 * where ΔT = dielectric_temp - ambient (dielectric heats the machine).
 * Extended cuts accumulate drift; model as steady-state after ~2 h warmup.
 */
function thermalDriftCompensator(
  ambient_C: number,
  dielectric_C: number,
  duration_h: number,
  machine_span_mm: number = 500
): ThermalDriftResult {
  const EXPANSION_COEFF = 12; // µm/m/°C for gray cast iron / welded steel
  const span_m = machine_span_mm / 1000;

  // Effective delta: dielectric heats the workzone; ambient controls machine body
  const temp_delta = Math.max(0, dielectric_C - ambient_C);

  // Thermal lag: machine reaches steady-state after ~2 h; before that, ~linear ramp
  const warmup_factor = Math.min(1.0, duration_h / 2.0);

  const drift_um = EXPANSION_COEFF * span_m * temp_delta * warmup_factor;

  // Compensation is needed if drift > 2 µm (below typical EDM positional tolerance)
  const compensation_required = drift_um > 2.0;

  let recommendation: string;
  if (!compensation_required) {
    recommendation = `Thermal drift ${drift_um.toFixed(1)} µm — within tolerance; no compensation needed`;
  } else if (drift_um < 10) {
    recommendation =
      `Thermal drift ${drift_um.toFixed(1)} µm — apply origin shift compensation in CNC. ` +
      "Allow machine 30 min soak before critical features.";
  } else {
    recommendation =
      `THERMAL DRIFT ${drift_um.toFixed(1)} µm — significant. ` +
      "Apply CNC thermal compensation, verify datum reference frequently, " +
      "consider active temperature control for dielectric to ±0.5°C.";
  }

  return {
    ambient_temp_C: ambient_C,
    dielectric_temp_C: dielectric_C,
    temp_delta_C: temp_delta,
    machine_expansion_um_per_m: EXPANSION_COEFF,
    total_drift_um: Math.round(drift_um * 10) / 10,
    compensation_required,
    compensation_um: Math.round(drift_um * 10) / 10,
    recommendation,
  };
}

// ============================================================================
// MS14 CALCULATION HELPERS
// ============================================================================

/**
 * RecastLayerPredictor
 * d_recast = 2 · √(α · t_on)   [Carslaw & Jaeger, Heat Conduction in Solids]
 * After N skim passes: d_n = d_0 · 0.7^N
 * Submerged flushing reduces initial recast by ~25% (improved debris extraction)
 * combined flushing: 12.5% reduction
 *
 * crack_probability_pct: driven by carbon content and energy
 *   Base risk from C%: Al/Ti ≈ 0%, low C ≈ 10%, medium C ≈ 30%, D2 (2.1%C) ≈ 80%
 *   Energy scaling: linear from 0.1 mJ (baseline) to 5 mJ (×2 crack risk cap at 100%)
 */
function recastLayerPredictor(
  alpha_mm2_s: number,
  t_on_us: number,
  pulse_energy_mj: number,
  num_skims: number,
  flushing_mode: SurfaceIntegrityInput["flushing_mode"],
  carbon_pct: number,
  material: string = ""
): RecastLayerResult {
  // Convert t_on from µs to seconds
  const t_on_s = t_on_us * 1e-6;

  // Material-dependent recast k-factor (U-WH05: material response to thermal pulse)
  const k_recast = lookupKRecast(material);

  // Recast depth after rough pass [µm] — formula gives metres → convert to µm
  // d = k · 2 · √(α · t_on)  where k is material-dependent [Dauw & Albert, CIRP 1992]
  const d_rough_m = k_recast * 2 * Math.sqrt(alpha_mm2_s * 1e-6 * t_on_s); // metres
  let d_rough_um = d_rough_m * 1e6;

  // Flushing mode correction
  if (flushing_mode === "submerged") {
    d_rough_um *= 0.75; // 25% reduction
  } else if (flushing_mode === "combined") {
    d_rough_um *= 0.875; // 12.5% reduction
  }

  // Skim pass attenuation: d_n = d_0 · 0.7^N
  const d_after_skims_um = d_rough_um * Math.pow(0.7, num_skims);

  // Crack probability
  // Carbon content contribution
  let crack_base_pct: number;
  if (carbon_pct <= 0.05) {
    crack_base_pct = 1;  // Al, Ti, Inconel — near zero
  } else if (carbon_pct < 0.3) {
    crack_base_pct = 10;
  } else if (carbon_pct < 0.8) {
    crack_base_pct = 30;
  } else if (carbon_pct < 1.5) {
    crack_base_pct = 55;
  } else {
    crack_base_pct = 80;  // D2, high C tool steels
  }

  // Energy scaling: reference 0.5 mJ → 1×; linear up to 5 mJ → 2×
  const energy_scale = Math.min(2.0, Math.max(0.5, pulse_energy_mj / 0.5));
  const crack_probability_pct = Math.min(100, crack_base_pct * energy_scale);

  return {
    depth_um: Math.round(d_rough_um * 10) / 10,
    after_skims_um: Math.round(d_after_skims_um * 10) / 10,
    crack_probability_pct: Math.round(crack_probability_pct),
  };
}

/**
 * HAZDepthCalculator
 * HAZ ≈ 3 × recast layer depth.
 * Temper softening: applies to hardened steels (HRC > 40).
 *   For every µm of HAZ, softening ~ 0.08 HRC (empirical from tool steel tempering curves).
 *   Cap at 10 HRC (max documented in literature for WEDM of hardened D2/H13).
 */
function hazDepthCalculator(
  recast_depth_um: number,
  hardness_hrc: number,
  material: string = ""
): HAZResult {
  // Material-dependent HAZ multiplier (U-WH05: replaces flat ×3)
  const haz_mult = lookupHAZMultiplier(material);
  const depth_um = recast_depth_um * haz_mult;

  let hardness_loss_hrc = 0;
  if (hardness_hrc > 40) {
    // Temper softening model: 5–10 HRC loss, proportional to HAZ depth
    // At 30 µm HAZ → ~5 HRC; at 60 µm → ~10 HRC
    hardness_loss_hrc = Math.min(10, Math.max(0, depth_um * (10 / 60)));
    hardness_loss_hrc = Math.round(hardness_loss_hrc * 10) / 10;
  }

  return {
    depth_um: Math.round(depth_um * 10) / 10,
    hardness_loss_hrc,
  };
}

/**
 * MicrocrackPredictor
 * Density classification from crack_probability_pct (recast layer model output):
 *   0–15%  → none
 *   15–40% → isolated
 *   40–70% → moderate
 *   70–100%→ extensive
 * Crack depth ≈ 0.4–0.8× recast depth (they initiate in and propagate from the recast layer)
 */
function microcrackPredictor(
  crack_probability_pct: number,
  recast_depth_um: number,
  carbon_pct: number,
  pulse_energy_mj: number
): MicrocrackResult {
  let density: MicrocrackDensity;
  if (crack_probability_pct < 15) {
    density = "none";
  } else if (crack_probability_pct < 40) {
    density = "isolated";
  } else if (crack_probability_pct < 70) {
    density = "moderate";
  } else {
    density = "extensive";
  }

  // Crack depth: 0.4× recast for low C, up to 0.8× for high C high-energy
  const depth_factor = 0.4 + (carbon_pct / 2.1) * 0.4 + (Math.min(pulse_energy_mj, 5) / 5) * 0.1;
  const depth_um = Math.round(recast_depth_um * Math.min(0.9, depth_factor) * 10) / 10;

  const factors: string[] = [];
  if (carbon_pct >= 1.5) factors.push("Very high carbon (≥1.5%) — brittle martensite in recast → high crack density");
  else if (carbon_pct >= 0.8) factors.push("High carbon (0.8–1.5%) — elevated crack risk in recast layer");
  if (pulse_energy_mj > 3) factors.push(`High pulse energy (${pulse_energy_mj} mJ) — deep thermal gradient → crack initiation`);
  if (density === "none") factors.push("Low carbon / low energy — minimal crack risk");
  if (factors.length === 0) factors.push("Moderate crack risk — monitor with SEM inspection after skimming");

  return { density, depth_um, factors };
}

/**
 * ResidualStressEstimator
 * WEDM always produces tensile residual stress at the surface
 * (rapid solidification of recast layer in tension after thermal contraction).
 *
 * Empirical model:
 *   σ_r = 200 + (pulse_energy_mj / 5) × 600   [MPa]   capped at 800 MPa
 *   Affected depth ≈ 1.5× HAZ depth
 *
 * Reference: König et al., CIRP Annals 1991; Rebelo et al., IJMTM 1998
 */
function residualStressEstimator(
  pulse_energy_mj: number,
  haz_depth_um: number,
  material: string = ""
): ResidualStressResult {
  // Material-dependent stress factor (U-WH05: thermal expansion × yield interaction)
  const stress_factor = lookupStressFactor(material);

  // Linear model: 200 MPa baseline, +600 MPa over 0–5 mJ range, scaled by material
  const magnitude_MPa = Math.round(
    Math.min(800, (200 + (Math.min(pulse_energy_mj, 5) / 5) * 600) * stress_factor)
  );

  // Affected depth: approx 1.5× HAZ, minimum 5 µm
  const affected_depth_um = Math.max(5, Math.round(haz_depth_um * 1.5));

  return {
    type: "tensile",
    magnitude_MPa,
    affected_depth_um,
  };
}

/**
 * FatigueLifeImpactCalculator
 * Fatigue life reduction = min(70%, d_rc × 1.2 + σ_r × 0.02)
 * where d_rc = after-skim recast depth [µm], σ_r = residual stress [MPa]
 *
 * Shot peening: converts tensile to compressive residual stress in surface layer,
 * restoring 50–80% of the fatigue life (use 65% mean restoration).
 * Remaining reduction after peening = life_reduction × (1 - 0.65)
 */
function fatigueLifeImpactCalculator(
  recast_after_skims_um: number,
  residual_stress_MPa: number
): FatigueResult {
  const raw_reduction = recast_after_skims_um * 1.2 + residual_stress_MPa * 0.02;
  const life_reduction_pct = Math.round(Math.min(70, raw_reduction) * 10) / 10;

  // After shot peening: 65% restoration → remaining deficit = reduction × 0.35
  const with_shot_peen_pct = Math.round(life_reduction_pct * 0.35 * 10) / 10;

  const remediation: string[] = [];
  if (life_reduction_pct > 10) {
    remediation.push("Shot peening (Almen intensity A: 0.008–0.015A) — restores 50–80% fatigue life");
  }
  if (life_reduction_pct > 30) {
    remediation.push("Electropolishing — remove recast layer and reduce tensile stress gradient");
    remediation.push("Polish/lap to Ra < 0.4 µm after skimming — reduce stress concentration sites");
  }
  if (life_reduction_pct > 50) {
    remediation.push("Consider low-stress grinding as alternative finishing process");
    remediation.push("Stress relief anneal (if material permits) before final EDM skim passes");
  }
  if (remediation.length === 0) {
    remediation.push("Fatigue life reduction within acceptable range — no special remediation required");
  }

  return { life_reduction_pct, with_shot_peen_pct, remediation };
}

/**
 * SpecComplianceChecker
 * Compares calculated surface integrity values against the applicable spec limits.
 * For aerospace (AMS 2628): zero-recast requirement means any recast > 0 fails
 * unless confirmed removed by skim + polish sequence.
 */
function specComplianceChecker(
  application: SurfaceIntegrityInput["application"],
  recast_um: number,
  haz_um: number,
  stress_MPa: number,
  num_skims: number
): SpecComplianceResult {
  const limits = SPEC_DATABASE[application];

  // AMS 2628 "0 µm" effectively means ≤1.3 µm (SEM measurement limit) — after full skim sequence
  const effective_recast_limit = limits.max_recast_um === 0
    ? (num_skims >= 3 ? 1.3 : 0)
    : limits.max_recast_um;

  const recast_pass = recast_um <= effective_recast_limit;
  const haz_pass = haz_um <= limits.max_haz_um;
  const stress_pass = stress_MPa <= limits.max_stress_MPa;
  const overall_pass = recast_pass && haz_pass && stress_pass;

  const required_post_process: string[] = [];

  if (!recast_pass) {
    if (application === "aerospace") {
      required_post_process.push(
        `AMS 2628: Minimum 3 skim passes required, then electropolish or hand-lap to verified 0 µm recast (SEM confirmation at 200× minimum)`
      );
    } else if (application === "medical") {
      required_post_process.push(
        "Additional skim pass + electropolish to reduce recast below 5 µm; document with cross-section metallography"
      );
    } else {
      required_post_process.push(
        `Additional skim pass(es) to reduce recast below ${limits.max_recast_um} µm`
      );
    }
  }

  if (!haz_pass) {
    required_post_process.push(
      `HAZ ${haz_um.toFixed(1)} µm exceeds ${limits.max_haz_um} µm limit — ` +
      "reduce pulse energy, add skim passes, or use stress-relief anneal"
    );
  }

  if (!stress_pass) {
    required_post_process.push(
      `Residual stress ${stress_MPa} MPa exceeds ${limits.max_stress_MPa} MPa limit — ` +
      "shot peen or electropolish to redistribute stress"
    );
  }

  if (overall_pass && required_post_process.length === 0) {
    required_post_process.push("No post-processing required — all parameters within spec");
  }

  return {
    spec: limits.spec,
    recast_pass,
    haz_pass,
    stress_pass,
    overall_pass,
    required_post_process,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** EDM Monitor and Surface Integrity Engine — MS13 + MS14 combined */
export class EDMMonitorSurfaceIntegrityEngine {

  // --------------------------------------------------------------------------
  // Action: monitor_process (MS13)
  // --------------------------------------------------------------------------

  /**
   * Runs all MS13 process monitoring sub-models against the provided input.
   * Only sub-models for which input data is present are executed.
   * Returns overall status and priority action for adaptive control.
   */
  monitorProcess(input: ProcessMonitorInput): ProcessMonitorResult {
    const alerts: string[] = [];
    let result: ProcessMonitorResult = {
      overall_status: "stable",
      priority_action: "none",
      alerts,
    };

    // --- Gap Voltage Monitor ---
    if (input.gap_stats) {
      const gv = gapVoltageMonitor(input.gap_stats);
      result.gap_voltage = gv;
      if (gv.action !== "none") {
        alerts.push(`GAP: ${gv.reason}`);
      }
    }

    // --- Cutting Speed Tracker ---
    if (
      input.actual_speed_mm_min !== undefined &&
      input.predicted_speed_mm_min !== undefined &&
      input.predicted_speed_mm_min > 0
    ) {
      const st = cuttingSpeedTracker(input.actual_speed_mm_min, input.predicted_speed_mm_min);
      result.speed_tracker = st;
      if (st.status !== "on_target") {
        alerts.push(`SPEED: ${st.interpretation}`);
      }
    }

    // --- Abnormal Discharge Detector ---
    if (input.discharge_pattern) {
      const ad = abnormalDischargeDetector(input.discharge_pattern);
      result.abnormal_discharge = ad;
      if (ad.severity !== "none") {
        alerts.push(`DISCHARGE [${ad.severity.toUpperCase()}]: ${ad.description}`);
      }
    }

    // --- Adaptive Parameter Adjuster ---
    if (input.wire_break_risk !== undefined) {
      const aa = adaptiveParameterAdjuster(input.wire_break_risk);
      result.adaptive_adjustment = aa;
      if (aa.recommended_action !== "none") {
        alerts.push(`ADAPTIVE: ${aa.reasoning}`);
      }
    }

    // --- Thermal Drift Compensator ---
    if (
      input.ambient_temp_C !== undefined &&
      input.dielectric_temp_C !== undefined &&
      input.cutting_duration_hours !== undefined
    ) {
      const td = thermalDriftCompensator(
        input.ambient_temp_C,
        input.dielectric_temp_C,
        input.cutting_duration_hours
      );
      result.thermal_drift = td;
      if (td.compensation_required) {
        alerts.push(`THERMAL: ${td.recommendation}`);
      }
    }

    // --- Overall status aggregation ---
    // Priority: emergency_stop > retract/reduce_energy (intervene) > advance/others (warning)
    const allActions: AdaptiveAction[] = [
      result.gap_voltage?.action ?? "none",
      result.abnormal_discharge?.action ?? "none",
      result.adaptive_adjustment?.recommended_action ?? "none",
    ];

    if (allActions.includes("emergency_stop")) {
      result.overall_status = "emergency_stop";
      result.priority_action = "emergency_stop";
    } else if (
      allActions.includes("retract") ||
      allActions.includes("reduce_energy") ||
      allActions.includes("reduce_speed")
    ) {
      result.overall_status = "intervene";
      result.priority_action =
        allActions.includes("retract") ? "retract" :
        allActions.includes("reduce_energy") ? "reduce_energy" : "reduce_speed";
    } else if (
      allActions.includes("advance") ||
      allActions.includes("increase_tension") ||
      allActions.includes("increase_t_off") ||
      (result.thermal_drift?.compensation_required ?? false) ||
      (result.speed_tracker && result.speed_tracker.status !== "on_target")
    ) {
      result.overall_status = "warning";
      result.priority_action =
        allActions.includes("advance") ? "advance" :
        allActions.includes("increase_tension") ? "increase_tension" : "increase_t_off";
    } else {
      result.overall_status = "stable";
      result.priority_action = "none";
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Action: predict_recast (MS14 unit 1 standalone)
  // --------------------------------------------------------------------------

  /**
   * Standalone recast layer prediction.
   * Returns recast depth (rough + after skims) and crack probability.
   */
  predictRecast(input: SurfaceIntegrityInput): RecastLayerResult {
    const alpha = input.thermal_diffusivity_mm2_s ?? lookupAlpha(input.material);
    const carbon = input.carbon_content_pct ?? lookupCarbonPct(input.material);
    return recastLayerPredictor(
      alpha,
      input.pulse_on_us,
      input.pulse_energy_mj,
      input.num_skim_passes,
      input.flushing_mode,
      carbon,
      input.material
    );
  }

  // --------------------------------------------------------------------------
  // Action: calculate_fatigue_impact (MS14 unit 5 standalone)
  // --------------------------------------------------------------------------

  /**
   * Standalone fatigue life impact calculator.
   * Requires recast_after_skims_um and residual_stress_MPa to be passed directly.
   */
  calculateFatigueImpact(
    recast_after_skims_um: number,
    residual_stress_MPa: number
  ): FatigueResult {
    return fatigueLifeImpactCalculator(recast_after_skims_um, residual_stress_MPa);
  }

  // --------------------------------------------------------------------------
  // Action: check_spec_compliance (MS14 unit 6 standalone)
  // --------------------------------------------------------------------------

  /**
   * Standalone spec compliance check.
   * Pass the already-calculated recast, HAZ, and stress values.
   */
  checkSpecCompliance(
    input: { application: string; recast_um?: number; haz_um?: number; stress_MPa?: number; num_skims?: number }
  ): SpecComplianceResult {
    const { application = "general", recast_um = 0, haz_um = 0, stress_MPa = 0, num_skims = 0 } = input;
    return specComplianceChecker(
      application as SurfaceIntegrityInput["application"],
      recast_um, haz_um, stress_MPa, num_skims
    );
  }

  // --------------------------------------------------------------------------
  // Action: assess_surface_integrity (MS14 full)
  // --------------------------------------------------------------------------

  /**
   * Full MS14 surface integrity assessment — SAFETY CRITICAL.
   * Executes all six MS14 sub-models in sequence and returns the
   * complete SurfaceIntegrityResult.
   *
   * SAFETY NOTE: When safety_critical is true, the caller MUST display
   * spec_compliance.overall_pass to the operator before releasing the part.
   * Non-compliant aerospace/medical parts must NOT proceed to assembly.
   */
  assessSurfaceIntegrity(input: SurfaceIntegrityInput): SurfaceIntegrityResult {
    const alpha = input.thermal_diffusivity_mm2_s ?? lookupAlpha(input.material);
    const carbon = input.carbon_content_pct ?? lookupCarbonPct(input.material);
    const hardness = input.hardness_hrc ?? 30; // default: annealed medium steel

    // Unit 1: Recast (material-dependent k-factor — U-WH05)
    const recast = recastLayerPredictor(
      alpha,
      input.pulse_on_us,
      input.pulse_energy_mj,
      input.num_skim_passes,
      input.flushing_mode,
      carbon,
      input.material
    );

    // Unit 2: HAZ (material-dependent multiplier — U-WH05)
    const haz = hazDepthCalculator(recast.depth_um, hardness, input.material);

    // Unit 3: Microcracks
    const microcracks = microcrackPredictor(
      recast.crack_probability_pct,
      recast.depth_um,
      carbon,
      input.pulse_energy_mj
    );

    // Unit 4: Residual stress (material-dependent factor — U-WH05)
    const residual_stress = residualStressEstimator(input.pulse_energy_mj, haz.depth_um, input.material);

    // Unit 5: Fatigue life impact (uses after-skim recast depth)
    const fatigue = fatigueLifeImpactCalculator(
      recast.after_skims_um,
      residual_stress.magnitude_MPa
    );

    // Unit 6: Spec compliance
    const spec_compliance = specComplianceChecker(
      input.application,
      recast.after_skims_um,  // use post-skim value for compliance (that's what the part will have)
      haz.depth_um,
      residual_stress.magnitude_MPa,
      input.num_skim_passes
    );

    // --- Recommendations ---
    const recommendations: string[] = [];
    const isSafetyCritical = input.application === "aerospace" || input.application === "medical";

    // Recast recommendations
    if (recast.after_skims_um > 5) {
      const skims_needed = Math.ceil(
        Math.log(5 / recast.depth_um) / Math.log(0.7)
      );
      recommendations.push(
        `Recast ${recast.after_skims_um.toFixed(1)} µm — add ${Math.max(1, skims_needed - input.num_skim_passes)} skim pass(es) ` +
        `(each reduces ~30%); target <5 µm`
      );
    }

    // Microcrack recommendations
    if (microcracks.density === "extensive" || microcracks.density === "moderate") {
      recommendations.push(
        `${microcracks.density.charAt(0).toUpperCase() + microcracks.density.slice(1)} microcracking — ` +
        "reduce pulse energy, increase skim passes; SEM inspection required before use"
      );
    }

    // HAZ / hardness recommendations
    if (haz.hardness_loss_hrc > 3) {
      recommendations.push(
        `Temper softening: ${haz.hardness_loss_hrc.toFixed(1)} HRC loss at surface — ` +
        "verify hardness after EDM; consider re-heat treat if functional surface"
      );
    }

    // Residual stress
    if (residual_stress.magnitude_MPa > 500) {
      recommendations.push(
        `High tensile residual stress (${residual_stress.magnitude_MPa} MPa) — ` +
        "shot peen (A0.010) or electropolish to induce compressive layer"
      );
    }

    // Fatigue
    if (fatigue.life_reduction_pct > 20) {
      recommendations.push(
        `Fatigue life reduced ${fatigue.life_reduction_pct.toFixed(0)}% — ` +
        `shot peening reduces this to ${fatigue.with_shot_peen_pct.toFixed(0)}%`
      );
    }

    // Spec compliance
    if (!spec_compliance.overall_pass) {
      recommendations.push(
        `SPEC FAIL (${spec_compliance.spec}): ${spec_compliance.required_post_process.join("; ")}`
      );
    }

    // Flushing recommendation
    if (input.flushing_mode !== "submerged" && recast.depth_um > 15) {
      recommendations.push(
        "Switch to submerged flushing — reduces recast layer depth by ~25%"
      );
    }

    // Safety critical banner
    if (isSafetyCritical && !spec_compliance.overall_pass) {
      recommendations.unshift(
        `SAFETY CRITICAL HOLD: ${input.application.toUpperCase()} application — ` +
        "part must NOT be released to assembly until spec compliance is achieved. " +
        "Document non-conformance per quality system."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Surface integrity within acceptable bounds — proceed with standard inspection"
      );
    }

    return {
      recast,
      haz,
      microcracks,
      residual_stress,
      fatigue,
      spec_compliance,
      recommendations,
      safety_critical: isSafetyCritical,
    };
  }

  // --------------------------------------------------------------------------
  // Action: full_assessment (MS13 + MS14 combined)
  // --------------------------------------------------------------------------

  /**
   * Combined MS13 process monitoring + MS14 surface integrity assessment.
   * Returns both results together for integrated reporting.
   */
  fullAssessment(
    processInput: ProcessMonitorInput,
    integrityInput: SurfaceIntegrityInput
  ): {
    process_monitor: ProcessMonitorResult;
    surface_integrity: SurfaceIntegrityResult;
    combined_alerts: string[];
    action_required: boolean;
  } {
    const process_monitor = this.monitorProcess(processInput);
    const surface_integrity = this.assessSurfaceIntegrity(integrityInput);

    const combined_alerts: string[] = [
      ...process_monitor.alerts,
      ...(surface_integrity.safety_critical && !surface_integrity.spec_compliance.overall_pass
        ? [`SAFETY HOLD: ${integrityInput.application.toUpperCase()} part fails ${surface_integrity.spec_compliance.spec}`]
        : []),
      ...surface_integrity.recommendations.filter(r => r.startsWith("SAFETY") || r.startsWith("SPEC FAIL")),
    ];

    const action_required =
      process_monitor.overall_status === "intervene" ||
      process_monitor.overall_status === "emergency_stop" ||
      !surface_integrity.spec_compliance.overall_pass ||
      (surface_integrity.safety_critical && surface_integrity.fatigue.life_reduction_pct > 30);

    return {
      process_monitor,
      surface_integrity,
      combined_alerts,
      action_required,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance for dispatcher consumption */
export const edmMonitorSurfaceIntegrityEngine = new EDMMonitorSurfaceIntegrityEngine();
