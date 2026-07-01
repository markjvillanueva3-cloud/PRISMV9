/**
 * EDMBiMaterialCompensationEngine — Steel + Brazed Carbide Insert Wire EDM
 *
 * Handles the core challenge of wire EDM through bi-material workpieces:
 * a steel body with brazed tungsten carbide inserts. The wire crosses
 * steel → braze joint → carbide → braze joint → steel transitions,
 * each requiring different spark parameters to prevent wire breakage.
 *
 * Physics basis:
 * - Material removal rate scales with thermal diffusivity and melting point:
 *     MRR ∝ α / (T_m × ρ × c_p)   where α = k/(ρ·c_p)
 * - Wire break probability at material transitions modeled as:
 *     P(break) = 1 - exp(-λ · ΔE/E_base · H/H_ref)
 *   where ΔE = energy mismatch between adjacent zones
 * - Transition ramp length derived from servo response time:
 *     L_ramp = v_feed × t_servo   (typically 0.3-1.0mm at 3-8mm/min feed)
 *
 * Sources:
 *   - Rajurkar et al., "Wire Electrical Discharge Machining of Hard-to-Machine Materials"
 *   - Ho & Newman, "State of the art in wire EDM" (Int. J. Mach. Tools Manuf.)
 *   - DiBitonto et al., "Theoretical Models of the EDM Process"
 *
 * @module EDMBiMaterialCompensationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Material zone within a bi-material profile. */
export interface MaterialZone {
  /** Zone identifier. */
  zone_id: string;
  /** Material name (resolved against cutting param DB). */
  material: string;
  /** Zone type for special handling. */
  zone_type: "primary_steel" | "carbide_insert" | "braze_joint" | "secondary_steel";
  /** Start position along profile in mm (0 = profile start). */
  start_mm: number;
  /** End position along profile in mm. */
  end_mm: number;
  /** Hardness in HRC (affects spark parameters). */
  hardness_hrc?: number;
  /** Whether this zone is on a taper/multi-axis segment. */
  taper_angle_deg?: number;
}

/** Per-zone optimized cutting parameters. */
export interface ZoneParams {
  zone_id: string;
  material: string;
  zone_type: MaterialZone["zone_type"];
  start_mm: number;
  end_mm: number;
  length_mm: number;
  /** Pulse on-time in µs. */
  t_on_us: number;
  /** Pulse off-time in µs. */
  t_off_us: number;
  /** Peak current in A. */
  peak_current_A: number;
  /** Servo voltage in V. */
  servo_voltage_V: number;
  /** Open gap voltage in V. */
  open_voltage_V: number;
  /** Wire speed in m/min. */
  wire_speed_m_min: number;
  /** Wire tension in N. */
  wire_tension_N: number;
  /** Predicted feed rate in mm/min. */
  feed_rate_mm_min: number;
  /** Predicted MRR in mm²/min. */
  mrr_mm2_min: number;
  /** Predicted Ra in µm. */
  predicted_ra_um: number;
  /** Wire break risk 0-1. */
  wire_break_risk: number;
  /** Flushing pressure in bar. */
  flushing_pressure_bar: number;
  /** Zone-specific notes. */
  notes: string[];
}

/** Transition ramp between adjacent material zones. */
export interface TransitionRamp {
  /** From zone → to zone. */
  from_zone_id: string;
  to_zone_id: string;
  /** Position along profile where ramp starts (mm). */
  ramp_start_mm: number;
  /** Position where ramp ends (mm). */
  ramp_end_mm: number;
  /** Ramp length in mm. */
  ramp_length_mm: number;
  /** Number of interpolation steps within the ramp. */
  steps: number;
  /** Wire break risk at this transition (0-1). */
  transition_break_risk: number;
  /** Whether to insert a dwell at the transition. */
  dwell_at_boundary: boolean;
  /** Dwell time in seconds (0 if no dwell). */
  dwell_s: number;
  /** Feed rate reduction factor during transition (0-1, 1 = no reduction). */
  feed_reduction_factor: number;
  /** Recommended servo voltage during transition. */
  transition_servo_V: number;
  /** Notes about this transition. */
  notes: string[];
}

/** Per-zone UV compensation for multi-axis taper cuts through bi-material profiles. */
export interface ZoneUVCompensation {
  zone_id: string;
  material: string;
  zone_type: MaterialZone["zone_type"];
  start_mm: number;
  end_mm: number;
  /** Spark gap for this material at the given pass energy (mm). */
  spark_gap_mm: number;
  /** Total kerf width: wire_dia + 2 × spark_gap (mm). */
  kerf_width_mm: number;
  /** UV offset adjustment relative to baseline kerf (mm). */
  uv_offset_delta_mm: number;
  /** Adjusted U offset for this zone segment (mm). */
  u_compensation_mm: number;
  /** Adjusted V offset for this zone segment (mm). */
  v_compensation_mm: number;
}

/** UV transition at material boundary — where offset changes during taper. */
export interface UVTransition {
  from_zone_id: string;
  to_zone_id: string;
  position_mm: number;
  /** Kerf width change at boundary (mm). */
  kerf_delta_mm: number;
  /** UV offset change magnitude (mm). */
  uv_step_mm: number;
  /** Ramp length over which to interpolate UV change (mm). */
  ramp_length_mm: number;
  /** Steps for smooth G-code interpolation. */
  interpolation_steps: number;
  /** Risk: sudden UV step can cause witness marks on part surface. */
  witness_mark_risk: "low" | "moderate" | "high";
  notes: string[];
}

/** Complete multi-axis UV compensation result for bi-material taper cuts. */
export interface BiMaterialUVResult {
  /** Taper angle applied (deg). */
  taper_angle_deg: number;
  /** Workpiece height (mm). */
  workpiece_height_mm: number;
  /** Wire diameter used (mm). */
  wire_diameter_mm: number;
  /** Reference kerf width (from dominant material). */
  reference_kerf_mm: number;
  /** Per-zone UV compensations. */
  zone_compensations: ZoneUVCompensation[];
  /** UV transitions at material boundaries. */
  uv_transitions: UVTransition[];
  /** Maximum kerf width variation across profile (mm). */
  max_kerf_variation_mm: number;
  /** Maximum UV travel required (mm). */
  max_uv_travel_mm: number;
  /** Whether the taper angle is achievable through all materials. */
  taper_feasible: boolean;
  warnings: string[];
  recommendations: string[];
}

/** Complete bi-material profile optimization result. */
export interface BiMaterialResult {
  /** Profile summary. */
  profile: {
    total_length_mm: number;
    zone_count: number;
    transition_count: number;
    materials: string[];
    has_carbide: boolean;
    has_braze: boolean;
  };
  /** Per-zone cutting parameters. */
  zones: ZoneParams[];
  /** Transition ramps between zones. */
  transitions: TransitionRamp[];
  /** Overall wire break risk (worst-case across all zones + transitions). */
  overall_wire_break_risk: number;
  /** Estimated total cutting time in minutes. */
  estimated_time_min: number;
  /** Estimated wire consumption in meters. */
  estimated_wire_m: number;
  /** Per-zone time breakdown. */
  time_breakdown: Array<{ zone_id: string; time_min: number; pct: number }>;
  /** Safety and process warnings. */
  warnings: string[];
  /** Operator recommendations. */
  recommendations: string[];
}

// ============================================================================
// MATERIAL EDM PROPERTIES (subset for parameter calculation)
// ============================================================================

interface MatProps {
  melting_point_C: number;
  thermal_conductivity_W_mK: number;
  resistivity_uOhm_cm: number;
  density_g_cm3: number;
  machinability_index: number;
  t_on_factor: number;
  t_off_factor: number;
  current_factor: number;
}

/**
 * EDM-specific properties per material grade.
 * Values sourced from ASM Handbook Vol. 16 (Machining), Rajurkar (1993),
 * and manufacturer tech tables (Makino, Sodick, Mitsubishi).
 */
const MAT_PROPS: Record<string, MatProps> = {
  // ── Tool Steels ──────────────────────────────────────────────────────
  h13:    { melting_point_C: 1427, thermal_conductivity_W_mK: 24.3, resistivity_uOhm_cm: 52,  density_g_cm3: 7.80, machinability_index: 0.95, t_on_factor: 1.00, t_off_factor: 1.05, current_factor: 1.00 },
  "4140": { melting_point_C: 1416, thermal_conductivity_W_mK: 42.6, resistivity_uOhm_cm: 22,  density_g_cm3: 7.85, machinability_index: 1.05, t_on_factor: 0.95, t_off_factor: 0.95, current_factor: 1.00 },
  a2:     { melting_point_C: 1420, thermal_conductivity_W_mK: 25.0, resistivity_uOhm_cm: 55,  density_g_cm3: 7.86, machinability_index: 0.95, t_on_factor: 1.00, t_off_factor: 1.05, current_factor: 1.00 },
  d2:     { melting_point_C: 1421, thermal_conductivity_W_mK: 20.0, resistivity_uOhm_cm: 65,  density_g_cm3: 7.70, machinability_index: 0.90, t_on_factor: 1.00, t_off_factor: 1.10, current_factor: 1.00 },
  s7:     { melting_point_C: 1420, thermal_conductivity_W_mK: 33.0, resistivity_uOhm_cm: 50,  density_g_cm3: 7.83, machinability_index: 1.00, t_on_factor: 1.00, t_off_factor: 1.00, current_factor: 1.00 },
  o2:     { melting_point_C: 1420, thermal_conductivity_W_mK: 36.0, resistivity_uOhm_cm: 45,  density_g_cm3: 7.86, machinability_index: 0.95, t_on_factor: 1.00, t_off_factor: 1.00, current_factor: 1.00 },
  // ── Bearing & Low-Carbon ─────────────────────────────────────────────
  "52100": { melting_point_C: 1424, thermal_conductivity_W_mK: 46.6, resistivity_uOhm_cm: 19, density_g_cm3: 7.83, machinability_index: 0.85, t_on_factor: 1.00, t_off_factor: 1.10, current_factor: 1.00 },
  "1018":  { melting_point_C: 1510, thermal_conductivity_W_mK: 51.9, resistivity_uOhm_cm: 16, density_g_cm3: 7.87, machinability_index: 1.15, t_on_factor: 0.90, t_off_factor: 0.90, current_factor: 0.95 },
  "1020":  { melting_point_C: 1515, thermal_conductivity_W_mK: 51.9, resistivity_uOhm_cm: 16, density_g_cm3: 7.87, machinability_index: 1.15, t_on_factor: 0.90, t_off_factor: 0.90, current_factor: 0.95 },
  // ── HSS ──────────────────────────────────────────────────────────────
  m2:  { melting_point_C: 1430, thermal_conductivity_W_mK: 21.0, resistivity_uOhm_cm: 60, density_g_cm3: 8.16, machinability_index: 0.90, t_on_factor: 1.05, t_off_factor: 1.15, current_factor: 1.00 },
  m4:  { melting_point_C: 1430, thermal_conductivity_W_mK: 19.0, resistivity_uOhm_cm: 62, density_g_cm3: 8.02, machinability_index: 0.80, t_on_factor: 1.10, t_off_factor: 1.20, current_factor: 1.05 },
  m42: { melting_point_C: 1430, thermal_conductivity_W_mK: 20.0, resistivity_uOhm_cm: 58, density_g_cm3: 8.15, machinability_index: 0.75, t_on_factor: 1.10, t_off_factor: 1.20, current_factor: 1.05 },
  // ── Carbide & Braze ──────────────────────────────────────────────────
  carbide: { melting_point_C: 2870, thermal_conductivity_W_mK: 110, resistivity_uOhm_cm: 20, density_g_cm3: 15.6, machinability_index: 0.40, t_on_factor: 1.30, t_off_factor: 1.50, current_factor: 1.20 },
  braze:   { melting_point_C: 780,  thermal_conductivity_W_mK: 250, resistivity_uOhm_cm: 3.8, density_g_cm3: 9.1,  machinability_index: 2.50, t_on_factor: 0.50, t_off_factor: 0.60, current_factor: 0.60 },
  // ── Fallback ─────────────────────────────────────────────────────────
  steel:   { melting_point_C: 1510, thermal_conductivity_W_mK: 50.0, resistivity_uOhm_cm: 15, density_g_cm3: 7.85, machinability_index: 1.00, t_on_factor: 1.00, t_off_factor: 1.00, current_factor: 1.00 },
};

// ============================================================================
// BASELINE CUTTING PARAMETERS (reference: 25mm D2 hardened, 0.25mm brass wire)
// ============================================================================

const BASELINE = {
  t_on_us: 4.0,        // µs — rough pass baseline
  t_off_us: 16.0,      // µs — rough pass baseline
  peak_current_A: 12.0, // A
  open_voltage_V: 80,   // V
  servo_voltage_V: 50,  // V
  wire_speed_m_min: 8,  // m/min
  wire_tension_N: 12,   // N (0.25mm brass)
  feed_rate_mm_min: 5,  // mm/min (25mm D2 rough)
  mrr_mm2_min: 30,      // mm²/min (25mm D2 rough)
  flushing_bar: 4,      // bar
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMBiMaterialCompensationEngine {

  /**
   * Optimize cutting parameters for a bi-material profile with material zone annotations.
   * Core action — computes per-zone parameters and transition ramps.
   *
   * @param input.zones - Material zones along the profile
   * @param input.thickness_mm - Workpiece thickness
   * @param input.wire_diameter_mm - Wire diameter (default 0.25)
   * @param input.wire_type - Wire type (default "brass")
   * @param input.pass_type - Pass type: rough, semi_finish, finish, super_finish
   * @param input.pass_number - Pass number (1-based)
   * @returns BiMaterialResult with per-zone params and transition ramps
   */
  optimize(input: {
    zones: MaterialZone[];
    thickness_mm: number;
    wire_diameter_mm?: number;
    wire_type?: string;
    pass_type?: "rough" | "semi_finish" | "finish" | "super_finish";
    pass_number?: number;
  }): BiMaterialResult {
    const thickness = input.thickness_mm;
    const wireDia = input.wire_diameter_mm ?? 0.25;
    const passType = input.pass_type ?? "rough";
    const passNum = input.pass_number ?? 1;
    const zones = [...input.zones].sort((a, b) => a.start_mm - b.start_mm);

    if (zones.length === 0) {
      return this.emptyResult("No material zones defined");
    }

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Pass-type multipliers (skim passes reduce energy)
    const passFactor = passType === "rough" ? 1.0
      : passType === "semi_finish" ? 0.6
      : passType === "finish" ? 0.35
      : 0.20;

    // Wire diameter factor (smaller wire = less energy capacity)
    const wireFactor = wireDia / 0.25;

    // ── Per-zone parameter computation ─────────────────────────────────
    const zoneParams: ZoneParams[] = zones.map(z => {
      const mat = this.resolveMat(z.material, z.zone_type);
      const hardnessFactor = z.hardness_hrc
        ? 1 + (z.hardness_hrc - 40) * 0.005 // 5% per 10 HRC above 40
        : 1.0;

      // Pulse timing scaled by material factors
      const t_on = Math.round(BASELINE.t_on_us * mat.t_on_factor * passFactor * wireFactor * 10) / 10;
      const t_off = Math.round(BASELINE.t_off_us * mat.t_off_factor * (1 / passFactor) * 10) / 10;

      // Current scaled by material and hardness
      const current = Math.round(BASELINE.peak_current_A * mat.current_factor * passFactor * wireFactor * hardnessFactor * 10) / 10;

      // Servo voltage — higher for difficult materials (higher resistivity)
      const servoV = Math.round(BASELINE.servo_voltage_V * (1 + (mat.resistivity_uOhm_cm - 20) * 0.003));

      // Wire speed — increase for carbide (more debris), decrease for braze (soft)
      const wireSpeed = Math.round(BASELINE.wire_speed_m_min * (z.zone_type === "carbide_insert" ? 1.3 : z.zone_type === "braze_joint" ? 0.7 : 1.0) * 10) / 10;

      // Wire tension — lower for carbide (reduce break risk), higher for soft steel
      const wireTension = Math.round(BASELINE.wire_tension_N * (z.zone_type === "carbide_insert" ? 0.8 : z.zone_type === "braze_joint" ? 0.9 : 1.0) * (wireDia / 0.25) * 10) / 10;

      // Feed rate from MRR model
      // MRR ≈ baseline × machinability × thickness_factor × pass_factor
      const thickFactor = Math.sqrt(25 / Math.max(1, thickness)); // slower for thicker parts
      const mrrFactor = mat.machinability_index * thickFactor * passFactor;
      const mrr = Math.round(BASELINE.mrr_mm2_min * mrrFactor * 10) / 10;
      const feedRate = Math.round((mrr / Math.max(1, thickness)) * 100) / 100;

      // Ra prediction: Ra ≈ k × E^0.4 where E = V × I × t_on
      const energy_mj = BASELINE.open_voltage_V * current * t_on * 1e-6 * 1000; // mJ
      const ra = Math.round(0.35 * Math.pow(Math.max(0.01, energy_mj), 0.4) * 100) / 100;

      // Wire break risk — higher at carbide and transitions
      const baseBreakRisk = 0.02; // 2% baseline per zone
      const materialBreakFactor = z.zone_type === "carbide_insert" ? 3.0
        : z.zone_type === "braze_joint" ? 2.0
        : 1.0;
      const thicknessBreakFactor = 1 + Math.max(0, thickness - 50) * 0.005;
      const breakRisk = Math.min(0.95, baseBreakRisk * materialBreakFactor * thicknessBreakFactor * hardnessFactor);

      // Flushing — carbide needs more pressure for debris evacuation
      const flushPressure = Math.round(BASELINE.flushing_bar * (z.zone_type === "carbide_insert" ? 1.4 : z.zone_type === "braze_joint" ? 0.8 : 1.0) * 10) / 10;

      // Zone-specific notes
      const notes: string[] = [];
      if (z.zone_type === "carbide_insert") {
        notes.push("WC-Co: Longer t_on + higher t_off for high-melting-point material");
        notes.push("Reduced wire tension to prevent break at hard carbide surface");
        notes.push("Increased flushing pressure for dense carbide debris evacuation");
        if (z.hardness_hrc && z.hardness_hrc > 65) {
          notes.push("Extreme hardness — consider molybdenum wire for break resistance");
        }
      }
      if (z.zone_type === "braze_joint") {
        notes.push("Silver braze: low melting point (780°C) — reduce energy to prevent braze melt-back");
        notes.push("Reduced wire speed — braze is soft, less debris");
        notes.push("CRITICAL: Do not overheat braze zone — can weaken insert bond");
      }
      if (z.zone_type === "primary_steel" && z.hardness_hrc && z.hardness_hrc > 55) {
        notes.push(`Hardened to ${z.hardness_hrc} HRC — increased current factor applied`);
      }

      return {
        zone_id: z.zone_id,
        material: z.material,
        zone_type: z.zone_type,
        start_mm: z.start_mm,
        end_mm: z.end_mm,
        length_mm: Math.round((z.end_mm - z.start_mm) * 100) / 100,
        t_on_us: t_on,
        t_off_us: t_off,
        peak_current_A: current,
        servo_voltage_V: servoV,
        open_voltage_V: BASELINE.open_voltage_V,
        wire_speed_m_min: wireSpeed,
        wire_tension_N: wireTension,
        feed_rate_mm_min: feedRate,
        mrr_mm2_min: mrr,
        predicted_ra_um: ra,
        wire_break_risk: Math.round(breakRisk * 1000) / 1000,
        flushing_pressure_bar: flushPressure,
        notes,
      };
    });

    // ── Transition ramp computation ────────────────────────────────────
    const transitions: TransitionRamp[] = [];
    for (let i = 0; i < zoneParams.length - 1; i++) {
      const from = zoneParams[i];
      const to = zoneParams[i + 1];

      // Energy mismatch between zones drives transition risk
      const fromEnergy = from.open_voltage_V * from.peak_current_A * from.t_on_us;
      const toEnergy = to.open_voltage_V * to.peak_current_A * to.t_on_us;
      const energyRatio = Math.max(fromEnergy, toEnergy) / Math.min(fromEnergy, toEnergy);

      // Transition involves carbide boundary?
      const isCarbideBoundary = from.zone_type === "carbide_insert" || to.zone_type === "carbide_insert";
      const isBrazeBoundary = from.zone_type === "braze_joint" || to.zone_type === "braze_joint";

      // Ramp length: proportional to energy mismatch and feed rate
      // Servo response at ~3-8mm/min feed ≈ 0.3-1.0mm
      const avgFeed = (from.feed_rate_mm_min + to.feed_rate_mm_min) / 2;
      const servoResponseTime_s = 0.15; // typical servo lag
      const baseRampLen = avgFeed / 60 * servoResponseTime_s * 1000; // mm
      const rampLen = Math.round(Math.max(0.2, baseRampLen * energyRatio * (isCarbideBoundary ? 2.0 : 1.0)) * 100) / 100;

      // Break risk at transition
      const transitionBreakRisk = Math.min(0.95,
        1 - Math.exp(-0.5 * (energyRatio - 1) * (isCarbideBoundary ? 2.5 : 1.0) * (thickness / 25)),
      );

      // Dwell at carbide boundaries to let servo stabilize
      const needsDwell = isCarbideBoundary || (energyRatio > 1.5);
      const dwellTime = needsDwell ? Math.round((isCarbideBoundary ? 0.5 : 0.2) * 10) / 10 : 0;

      // Feed reduction at transition
      const feedReduction = isCarbideBoundary ? 0.5 : isBrazeBoundary ? 0.7 : 0.8;

      // Transition servo voltage (average with bias toward harder material)
      const transServo = Math.round((from.servo_voltage_V * 0.4 + to.servo_voltage_V * 0.6));

      const notes: string[] = [];
      if (isCarbideBoundary) {
        notes.push("Steel↔Carbide boundary: maximum wire break risk zone");
        notes.push(`Energy ratio ${energyRatio.toFixed(2)}:1 — ramp parameters over ${rampLen}mm`);
        notes.push("Dwell at boundary allows servo to stabilize before entering new material");
      }
      if (isBrazeBoundary) {
        notes.push("Braze zone boundary: reduce energy to prevent braze melt-back");
        notes.push("Silver braze melts at 780°C vs steel at 1420°C — significant thermal mismatch");
      }
      if (transitionBreakRisk > 0.15) {
        warnings.push(`High wire break risk (${(transitionBreakRisk * 100).toFixed(1)}%) at ${from.zone_id}→${to.zone_id} transition`);
      }

      transitions.push({
        from_zone_id: from.zone_id,
        to_zone_id: to.zone_id,
        ramp_start_mm: Math.round((from.end_mm - rampLen / 2) * 100) / 100,
        ramp_end_mm: Math.round((to.start_mm + rampLen / 2) * 100) / 100,
        ramp_length_mm: rampLen,
        steps: Math.max(2, Math.round(rampLen / 0.05)), // ~50µm per interpolation step
        transition_break_risk: Math.round(transitionBreakRisk * 1000) / 1000,
        dwell_at_boundary: needsDwell,
        dwell_s: dwellTime,
        feed_reduction_factor: feedReduction,
        transition_servo_V: transServo,
        notes,
      });
    }

    // ── Aggregate results ──────────────────────────────────────────────
    const hasCarbide = zones.some(z => z.zone_type === "carbide_insert");
    const hasBraze = zones.some(z => z.zone_type === "braze_joint");
    const materials = [...new Set(zones.map(z => z.material))];

    // Time estimation per zone
    const timeBreakdown = zoneParams.map(zp => {
      const len = zp.length_mm;
      const time = len / Math.max(0.01, zp.feed_rate_mm_min);
      return { zone_id: zp.zone_id, time_min: Math.round(time * 100) / 100, pct: 0 };
    });
    // Add transition dwell times
    const transitionTime = transitions.reduce((s, t) => s + t.dwell_s / 60 + t.ramp_length_mm / (BASELINE.feed_rate_mm_min * t.feed_reduction_factor), 0);
    const totalZoneTime = timeBreakdown.reduce((s, t) => s + t.time_min, 0);
    const totalTime = Math.round((totalZoneTime + transitionTime) * 100) / 100;

    // Percentage breakdown
    for (const tb of timeBreakdown) {
      tb.pct = totalTime > 0 ? Math.round(tb.time_min / totalTime * 1000) / 10 : 0;
    }

    // Wire consumption
    const wireConsumption = zoneParams.reduce((total, zp) => {
      const zoneTime = zp.length_mm / Math.max(0.01, zp.feed_rate_mm_min);
      return total + zoneTime * zp.wire_speed_m_min;
    }, 0);
    const totalWire = Math.round((wireConsumption + transitionTime * BASELINE.wire_speed_m_min * 0.5) * 10) / 10;

    // Overall break risk (worst of all zones + transitions)
    const worstZoneRisk = Math.max(...zoneParams.map(z => z.wire_break_risk), 0);
    const worstTransRisk = transitions.length > 0 ? Math.max(...transitions.map(t => t.transition_break_risk)) : 0;
    const overallBreakRisk = Math.round(Math.max(worstZoneRisk, worstTransRisk) * 1000) / 1000;

    // Recommendations
    if (hasCarbide) {
      recommendations.push("Use coated brass wire for carbide — zinc coating improves break resistance at hard surfaces");
      recommendations.push("Run test cut on scrap material with same braze/carbide geometry before production");
      if (thickness > 40) {
        recommendations.push("Submerged flushing mandatory for carbide cuts >40mm — debris evacuation critical");
      }
    }
    if (hasBraze) {
      recommendations.push("Monitor braze integrity post-EDM — inspect for melt-back or delamination at insert boundary");
      recommendations.push("Consider skim pass with reduced energy specifically through braze zones");
    }
    if (overallBreakRisk > 0.10) {
      recommendations.push("Wire break risk elevated — keep wire break recovery (auto-rethread) enabled");
      recommendations.push("Pre-thread spare spool for production runs to minimize downtime");
    }
    if (passType === "rough" && hasCarbide) {
      recommendations.push("First rough pass through carbide: reduce power 20% from calculated until stable arc confirmed");
    }

    // Taper warnings
    const taperZones = zones.filter(z => z.taper_angle_deg && z.taper_angle_deg > 0);
    if (taperZones.length > 0 && hasCarbide) {
      warnings.push("Multi-axis taper through carbide: UV axis compensation must account for different kerf widths in steel vs carbide");
      recommendations.push("Verify UV travel limits can accommodate taper angle through full material stack");
    }

    const totalLength = zones.length > 0
      ? Math.round((zones[zones.length - 1].end_mm - zones[0].start_mm) * 100) / 100
      : 0;

    return {
      profile: {
        total_length_mm: totalLength,
        zone_count: zones.length,
        transition_count: transitions.length,
        materials,
        has_carbide: hasCarbide,
        has_braze: hasBraze,
      },
      zones: zoneParams,
      transitions,
      overall_wire_break_risk: overallBreakRisk,
      estimated_time_min: totalTime,
      estimated_wire_m: totalWire,
      time_breakdown: timeBreakdown,
      warnings,
      recommendations,
    };
  }

  /**
   * Analyze wire break risk for a material transition without full optimization.
   * Quick check for feasibility assessment.
   */
  analyzeTransitionRisk(input: {
    from_material: string;
    to_material: string;
    thickness_mm: number;
    wire_type?: string;
    wire_diameter_mm?: number;
  }): {
    from_material: string;
    to_material: string;
    energy_ratio: number;
    break_probability: number;
    risk_level: "low" | "moderate" | "high" | "critical";
    recommended_wire: string;
    recommended_feed_reduction_pct: number;
    recommended_dwell_s: number;
    notes: string[];
  } {
    const fromMat = this.resolveMat(input.from_material, "primary_steel");
    const toMat = this.resolveMat(input.to_material, "carbide_insert");

    const fromEnergy = BASELINE.open_voltage_V * BASELINE.peak_current_A * fromMat.current_factor * BASELINE.t_on_us * fromMat.t_on_factor;
    const toEnergy = BASELINE.open_voltage_V * BASELINE.peak_current_A * toMat.current_factor * BASELINE.t_on_us * toMat.t_on_factor;
    const energyRatio = Math.max(fromEnergy, toEnergy) / Math.min(fromEnergy, toEnergy);

    // Break probability model: P = 1 - exp(-λ × ΔE/E × H/H_ref)
    const lambda = 0.5; // empirical rate parameter
    const thicknessFactor = input.thickness_mm / 25; // normalized to 25mm reference
    const breakProb = Math.round((1 - Math.exp(-lambda * (energyRatio - 1) * thicknessFactor)) * 1000) / 1000;

    const riskLevel: "low" | "moderate" | "high" | "critical" =
      breakProb < 0.05 ? "low"
      : breakProb < 0.15 ? "moderate"
      : breakProb < 0.30 ? "high"
      : "critical";

    const notes: string[] = [];
    let recommendedWire = input.wire_type ?? "brass";

    if (riskLevel === "high" || riskLevel === "critical") {
      recommendedWire = "coated_brass";
      notes.push("Switch to coated brass wire — zinc coating provides thermal buffer at transition");
    }
    if (toMat === MAT_PROPS.carbide) {
      notes.push("Carbide has 2× melting point of steel — dramatic energy mismatch at boundary");
      notes.push("Carbide debris is heavier — ensure flushing is adequate at transition");
    }
    if (fromMat === MAT_PROPS.braze || toMat === MAT_PROPS.braze) {
      notes.push("Braze alloy melts at 780°C — energy must drop sharply entering braze zone");
      notes.push("Risk of braze melt-back weakening insert bond if energy too high");
    }

    return {
      from_material: input.from_material,
      to_material: input.to_material,
      energy_ratio: Math.round(energyRatio * 100) / 100,
      break_probability: breakProb,
      risk_level: riskLevel,
      recommended_wire: recommendedWire,
      recommended_feed_reduction_pct: riskLevel === "critical" ? 60 : riskLevel === "high" ? 40 : riskLevel === "moderate" ? 25 : 10,
      recommended_dwell_s: riskLevel === "critical" ? 1.0 : riskLevel === "high" ? 0.5 : 0,
      notes,
    };
  }

  /**
   * Generate a recommended zone layout for a typical steel+carbide insert profile.
   * Infers braze zones between steel and carbide sections.
   */
  inferZones(input: {
    steel_material: string;
    steel_hardness_hrc?: number;
    insert_positions: Array<{
      start_mm: number;
      end_mm: number;
      carbide_grade?: string;
    }>;
    total_profile_length_mm: number;
  }): { zones: MaterialZone[] } {
    const zones: MaterialZone[] = [];
    const inserts = [...input.insert_positions].sort((a, b) => a.start_mm - b.start_mm);
    const brazeWidth = 0.5; // typical silver braze joint width in mm
    let zoneIdx = 1;
    let cursor = 0;

    for (const ins of inserts) {
      // Steel zone before insert
      if (ins.start_mm - brazeWidth > cursor) {
        zones.push({
          zone_id: `Z${zoneIdx++}`,
          material: input.steel_material,
          zone_type: "primary_steel",
          start_mm: cursor,
          end_mm: ins.start_mm - brazeWidth,
          hardness_hrc: input.steel_hardness_hrc,
        });
      }
      // Entry braze zone
      zones.push({
        zone_id: `Z${zoneIdx++}`,
        material: "silver_braze",
        zone_type: "braze_joint",
        start_mm: ins.start_mm - brazeWidth,
        end_mm: ins.start_mm,
      });
      // Carbide insert
      zones.push({
        zone_id: `Z${zoneIdx++}`,
        material: ins.carbide_grade ?? "carbide",
        zone_type: "carbide_insert",
        start_mm: ins.start_mm,
        end_mm: ins.end_mm,
      });
      // Exit braze zone
      zones.push({
        zone_id: `Z${zoneIdx++}`,
        material: "silver_braze",
        zone_type: "braze_joint",
        start_mm: ins.end_mm,
        end_mm: ins.end_mm + brazeWidth,
      });
      cursor = ins.end_mm + brazeWidth;
    }

    // Final steel zone
    if (cursor < input.total_profile_length_mm) {
      zones.push({
        zone_id: `Z${zoneIdx++}`,
        material: input.steel_material,
        zone_type: "primary_steel",
        start_mm: cursor,
        end_mm: input.total_profile_length_mm,
        hardness_hrc: input.steel_hardness_hrc,
      });
    }

    return { zones };
  }

  // ============================================================================
  // MULTI-AXIS UV COMPENSATION
  // ============================================================================

  /**
   * Compute per-zone UV axis compensation for taper cuts through bi-material profiles.
   *
   * Physics basis: kerf width = wire_dia + 2 × spark_gap
   *   Spark gap ≈ base_gap × (E_zone / E_ref)^0.3 × (1/machinability)^0.2
   *   where E = voltage × current × t_on per zone
   *
   * When taper-cutting through steel→carbide→steel, the wider kerf in carbide
   * means the UV offset must increase to maintain the correct taper geometry.
   * Without compensation, the taper angle will be shallower in carbide zones.
   *
   * UV offset formula: UV = tan(α) × H/2 ± kerf_delta/2
   *   where kerf_delta = kerf_zone - kerf_reference
   *
   * Sources:
   *   - Kinoshita et al., "Study on EDM Gap with Workpiece Material" (CIRP Annals)
   *   - Puri & Bhattacharyya, "Modelling & Analysis of WEDM" (Int. J. Mach. Tools Manuf.)
   *
   * @param input.zones - Material zones (from optimize or inferZones)
   * @param input.taper_angle_deg - Taper angle in degrees
   * @param input.workpiece_height_mm - Part thickness (Z-height for UV calc)
   * @param input.wire_diameter_mm - Wire diameter (default 0.25mm)
   * @param input.pass_type - Pass type affects spark gap
   * @param input.guide_distance_mm - Upper-to-lower guide distance (default 60mm)
   */
  computeUVCompensation(input: {
    zones: MaterialZone[];
    taper_angle_deg: number;
    workpiece_height_mm: number;
    wire_diameter_mm?: number;
    pass_type?: "rough" | "semi_finish" | "finish" | "super_finish";
    guide_distance_mm?: number;
  }): BiMaterialUVResult {
    const taperDeg = input.taper_angle_deg;
    const height = input.workpiece_height_mm;
    const wireDia = input.wire_diameter_mm ?? 0.25;
    const passType = input.pass_type ?? "rough";
    const guideDist = input.guide_distance_mm ?? 60;
    const zones = [...input.zones].sort((a, b) => a.start_mm - b.start_mm);

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (zones.length === 0) {
      return {
        taper_angle_deg: taperDeg,
        workpiece_height_mm: height,
        wire_diameter_mm: wireDia,
        reference_kerf_mm: wireDia + 2 * 0.025,
        zone_compensations: [],
        uv_transitions: [],
        max_kerf_variation_mm: 0,
        max_uv_travel_mm: 0,
        taper_feasible: true,
        warnings: ["No zones provided"],
        recommendations: [],
      };
    }

    const taperRad = (taperDeg * Math.PI) / 180;
    const halfHeight = height / 2;
    const baseUVOffset = Math.tan(taperRad) * halfHeight;

    // Pass-type energy factor (affects spark gap)
    const passFactor = passType === "rough" ? 1.0
      : passType === "semi_finish" ? 0.6
      : passType === "finish" ? 0.35
      : 0.20;

    // Base spark gap: ~0.025mm for 0.25mm brass wire, rough pass, D2
    const baseSparkGap = 0.025 * (wireDia / 0.25);

    // Compute per-zone kerf widths
    const zoneKerfs = zones.map(z => {
      const mat = this.resolveMat(z.material, z.zone_type);
      // Spark gap scales with energy and inversely with machinability
      // Higher energy (carbide) → wider gap; higher machinability → narrower gap
      const energyFactor = Math.pow(mat.t_on_factor * mat.current_factor * passFactor, 0.3);
      const machFactor = Math.pow(1 / Math.max(0.1, mat.machinability_index), 0.2);
      const sparkGap = Math.round(baseSparkGap * energyFactor * machFactor * 10000) / 10000;
      const kerf = Math.round((wireDia + 2 * sparkGap) * 10000) / 10000;
      return { zone: z, mat, sparkGap, kerf };
    });

    // Reference kerf: from the dominant steel zone (longest steel section)
    const steelZones = zoneKerfs.filter(zk => zk.zone.zone_type === "primary_steel" || zk.zone.zone_type === "secondary_steel");
    const referenceKerf = steelZones.length > 0
      ? steelZones.reduce((best, zk) => (zk.zone.end_mm - zk.zone.start_mm) > (best.zone.end_mm - best.zone.start_mm) ? zk : best).kerf
      : zoneKerfs[0].kerf;

    // Compute UV compensations per zone
    const zoneCompensations: ZoneUVCompensation[] = zoneKerfs.map(zk => {
      const kerfDelta = zk.kerf - referenceKerf;
      // UV offset delta: half the kerf difference (applied to each side of the wire)
      const uvDelta = Math.round((kerfDelta / 2) * 10000) / 10000;

      // U and V components based on taper geometry
      // For simplicity, assume taper is along the profile direction:
      // U compensation = (baseUVOffset + uvDelta) projected onto the taper plane
      const uComp = Math.round((baseUVOffset + uvDelta) * 10000) / 10000;
      const vComp = 0; // V is zero for straight taper profiles (non-twisted)

      return {
        zone_id: zk.zone.zone_id,
        material: zk.zone.material,
        zone_type: zk.zone.zone_type,
        start_mm: zk.zone.start_mm,
        end_mm: zk.zone.end_mm,
        spark_gap_mm: zk.sparkGap,
        kerf_width_mm: zk.kerf,
        uv_offset_delta_mm: uvDelta,
        u_compensation_mm: uComp,
        v_compensation_mm: vComp,
      };
    });

    // Compute UV transitions at material boundaries
    const uvTransitions: UVTransition[] = [];
    for (let i = 0; i < zoneCompensations.length - 1; i++) {
      const from = zoneCompensations[i];
      const to = zoneCompensations[i + 1];

      const kerfDelta = Math.abs(to.kerf_width_mm - from.kerf_width_mm);
      const uvStep = Math.abs(to.uv_offset_delta_mm - from.uv_offset_delta_mm);

      // Ramp length: interpolate UV change over enough distance to avoid witness marks
      // Rule of thumb: ramp over at least 10× the UV step size, minimum 0.2mm
      const rampLen = Math.round(Math.max(0.2, uvStep * 10, kerfDelta * 15) * 1000) / 1000;

      // Interpolation steps for G-code: ~0.02mm per step for smooth surface
      const interpSteps = Math.max(2, Math.round(rampLen / 0.02));

      // Witness mark risk based on UV step magnitude
      const witnessRisk: "low" | "moderate" | "high" =
        uvStep < 0.002 ? "low"
        : uvStep < 0.005 ? "moderate"
        : "high";

      const notes: string[] = [];
      if (witnessRisk === "high") {
        notes.push(`Large UV step (${(uvStep * 1000).toFixed(1)}µm) — visible witness mark likely at boundary`);
        notes.push("Consider additional skim pass focused on transition zone to blend surface");
        warnings.push(`UV witness mark risk at ${from.zone_id}→${to.zone_id}: ${(uvStep * 1000).toFixed(1)}µm step`);
      }
      if (from.zone_type === "braze_joint" || to.zone_type === "braze_joint") {
        notes.push("Braze zone: kerf narrows due to low energy — UV compensation decreases");
      }
      if (from.zone_type === "carbide_insert" || to.zone_type === "carbide_insert") {
        notes.push("Carbide zone: kerf widens due to higher energy — UV compensation increases");
      }

      uvTransitions.push({
        from_zone_id: from.zone_id,
        to_zone_id: to.zone_id,
        position_mm: from.end_mm,
        kerf_delta_mm: Math.round(kerfDelta * 10000) / 10000,
        uv_step_mm: Math.round(uvStep * 10000) / 10000,
        ramp_length_mm: rampLen,
        interpolation_steps: interpSteps,
        witness_mark_risk: witnessRisk,
        notes,
      });
    }

    // Aggregates
    const allKerfs = zoneCompensations.map(zc => zc.kerf_width_mm);
    const maxKerfVariation = Math.round((Math.max(...allKerfs) - Math.min(...allKerfs)) * 10000) / 10000;

    const maxUV = Math.max(...zoneCompensations.map(zc =>
      Math.sqrt(zc.u_compensation_mm * zc.u_compensation_mm + zc.v_compensation_mm * zc.v_compensation_mm)
    ));

    // Feasibility: taper achievable if max UV travel within machine limits
    // Typical wire EDM UV travel: ±30mm or more
    // Also check geometric accuracy: ε = (wire_dia/2) × H / guide_dist
    const geoError = (wireDia / 2) * height / guideDist;
    const taperFeasible = maxUV < 30 && taperDeg < 45;

    if (taperDeg > 25) {
      warnings.push(`Steep taper (${taperDeg}°) through bi-material: UV travel ${maxUV.toFixed(3)}mm — verify machine limits`);
    }
    if (maxKerfVariation > 0.01) {
      warnings.push(`Kerf width varies ${(maxKerfVariation * 1000).toFixed(1)}µm across materials — UV compensation critical for taper accuracy`);
      recommendations.push("Program per-zone UV offsets in G-code (G41/G42 with dynamic offset tables)");
    }
    if (geoError > 0.01) {
      recommendations.push(`Geometric taper error: ${(geoError * 1000).toFixed(1)}µm — consider reducing workpiece height or increasing guide distance`);
    }
    recommendations.push("Verify UV compensation with test cut on scrap with same material stack before production");
    if (zoneCompensations.some(zc => zc.zone_type === "carbide_insert")) {
      recommendations.push("Carbide kerf is wider — taper will be slightly steeper in carbide unless UV is compensated");
    }

    return {
      taper_angle_deg: taperDeg,
      workpiece_height_mm: height,
      wire_diameter_mm: wireDia,
      reference_kerf_mm: referenceKerf,
      zone_compensations: zoneCompensations,
      uv_transitions: uvTransitions,
      max_kerf_variation_mm: maxKerfVariation,
      max_uv_travel_mm: Math.round(maxUV * 10000) / 10000,
      taper_feasible: taperFeasible,
      warnings,
      recommendations,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private resolveMat(name: string, zoneType: MaterialZone["zone_type"]): MatProps {
    const key = name.toLowerCase().replace(/[\s\-\/]/g, "_");

    // Direct match
    if (MAT_PROPS[key]) return MAT_PROPS[key];

    // Zone-type fallback
    if (zoneType === "carbide_insert") return MAT_PROPS.carbide;
    if (zoneType === "braze_joint") return MAT_PROPS.braze;

    // Partial match
    for (const [k, v] of Object.entries(MAT_PROPS)) {
      if (key.includes(k) || k.includes(key)) return v;
    }

    return MAT_PROPS.steel;
  }

  private emptyResult(reason: string): BiMaterialResult {
    return {
      profile: { total_length_mm: 0, zone_count: 0, transition_count: 0, materials: [], has_carbide: false, has_braze: false },
      zones: [],
      transitions: [],
      overall_wire_break_risk: 0,
      estimated_time_min: 0,
      estimated_wire_m: 0,
      time_breakdown: [],
      warnings: [reason],
      recommendations: [],
    };
  }
}

/** Singleton instance. */
export const edmBiMaterialCompensationEngine = new EDMBiMaterialCompensationEngine();
