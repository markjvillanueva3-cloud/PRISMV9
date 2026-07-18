/**
 * EDMWireSlugCornerTaperEngine — WEDM-P2P-MS11+MS12
 *
 * Consolidates Wire & Slug Management (MS11 U01-U06) with
 * Corner Accuracy & Taper geometry (MS12 U01-U06).
 *
 * MS11: Wire threading sequences, break recovery, slug management,
 *       tab cutting, wire guide tracking, auto-threading checks.
 * MS12: Wire lag compensation, corner over-travel, dwell time,
 *       taper UV solving, accuracy prediction, variable taper profiles.
 *
 * Physics:
 *   Wire lag:    δ = F × L² / (8T)
 *   Over-travel: OT = δ × sin(θ/2) / sin(θ)
 *   Dwell:       t = k × δ / v_recovery
 *   Taper UV:    U = tan(α) × H/2
 *   Taper error: ε = (wire_dia/2) × H / guide_distance
 *   Slug weight: W = A × t × ρ
 *
 * Actions: plan_wire_management, plan_slug_management,
 *          calculate_corner_compensation, solve_taper,
 *          predict_taper_accuracy, full_plan
 */

// ============================================================================
// TYPES — MS11 Wire & Slug Management
// ============================================================================

export type ThreadingMethod = "jet" | "mechanical" | "manual";
export type SlugManagementMethod = "free_drop" | "controlled_drop" | "glue_tab" | "magnet" | "vacuum";
export type GuideType = "diamond" | "sapphire" | "carbide";

export interface ThreadingStep {
  action: string;
  profile?: string;
  start_hole?: string;
  method: ThreadingMethod;
  controller_code?: string;
}

export interface ThreadingSequence {
  steps: ThreadingStep[];
  estimated_time_min: number;
}

export interface BreakRecoveryPlan {
  retract_distance_mm: number;
  overlap_mm: number;
  rethread_method: ThreadingMethod;
  resume_offset_mm: number;
  break_history: BreakRecord[];
  estimated_recovery_min: number;
}

export interface BreakRecord {
  location: { x: number; y: number };
  profile: string;
  cut_pass: number;
  probable_cause: string;
}

export interface SlugPlan {
  profile: string;
  weight_kg: number;
  management: SlugManagementMethod;
  can_fall_free: boolean;
  intervention_needed: boolean;
  notes: string;
}

export interface TabDefinition {
  profile: string;
  tab_index: number;
  position: { x: number; y: number };
  width_mm: number;
  use_finish_params: boolean;
}

export interface TabCutSequence {
  tabs: TabDefinition[];
  cutting_order: number[];
  estimated_time_min: number;
}

export interface GuideStatus {
  upper_guide_type: GuideType;
  lower_guide_type: GuideType;
  upper_hours_used: number;
  lower_hours_used: number;
  replacement_interval_hours: number;
  upper_remaining_pct: number;
  lower_remaining_pct: number;
  needs_replacement: boolean;
}

export interface AutoThreadAssessment {
  can_auto_thread: boolean;
  start_hole_diameter_mm: number;
  minimum_required_mm: number;
  dielectric_level_ok: boolean;
  wire_tip_ok: boolean;
  blockers: string[];
}

export interface WireManagementPlan {
  threading: ThreadingSequence;
  break_recovery: BreakRecoveryPlan;
  slug_management: SlugPlan[];
  tab_cutting: TabCutSequence;
  guide_status: GuideStatus;
  auto_thread: AutoThreadAssessment;
}

// ============================================================================
// TYPES — MS12 Corner Accuracy & Taper
// ============================================================================

export interface CornerCompensation {
  corner_index: number;
  angle_deg: number;
  wire_lag_mm: number;
  over_travel_mm: number;
  dwell_time_sec: number;
  total_time_added_sec: number;
  accuracy_achievable_mm: number;
}

export interface TaperSegment {
  start_point: { x: number; y: number };
  end_point: { x: number; y: number };
  taper_angle_deg: number;
  u_offset_mm: number;
  v_offset_mm: number;
}

export interface TaperSolution {
  segments: TaperSegment[];
  max_uv_travel_required_mm: number;
  achievable_accuracy_mm: number;
  guide_distance_mm: number;
}

export interface TaperAccuracyResult {
  taper_angle_deg: number;
  workpiece_height_mm: number;
  wire_diameter_mm: number;
  guide_distance_mm: number;
  geometric_error_mm: number;
  thermal_error_mm: number;
  total_predicted_error_mm: number;
  within_tolerance: boolean;
  tolerance_mm: number;
  recommendations: string[];
}

export interface VariableTaperProfile {
  segments: TaperSegment[];
  uv_transitions: Array<{
    from_segment: number;
    to_segment: number;
    transition_length_mm: number;
    smooth: boolean;
  }>;
  max_angle_change_deg: number;
  feasible: boolean;
  warnings: string[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface WireManagementInput {
  profiles: ProfileDefinition[];
  wire_type: string;
  wire_diameter_mm: number;
  workpiece_thickness_mm: number;
  workpiece_material: string;
  material_density_kg_m3: number;
  machine_has_auto_thread: boolean;
  start_holes: StartHole[];
  guide_upper_hours: number;
  guide_lower_hours: number;
  guide_type?: GuideType;
  guide_replacement_interval_hours?: number;
  dielectric_level_ok?: boolean;
  wire_tip_ok?: boolean;
  existing_breaks?: BreakRecord[];
}

export interface ProfileDefinition {
  name: string;
  area_mm2: number;
  perimeter_mm: number;
  start_hole?: string;
  tabs?: Array<{ position: { x: number; y: number }; width_mm: number }>;
  corners?: CornerDefinition[];
}

export interface StartHole {
  id: string;
  diameter_mm: number;
  position: { x: number; y: number };
}

export interface CornerDefinition {
  index: number;
  angle_deg: number;
  position: { x: number; y: number };
}

export interface SlugManagementInput {
  profiles: Array<{
    name: string;
    area_mm2: number;
  }>;
  workpiece_thickness_mm: number;
  material_density_kg_m3: number;
  clearance_below_mm?: number;
}

export interface CornerCompensationInput {
  corners: CornerDefinition[];
  wire_diameter_mm: number;
  wire_tension_N: number;
  guide_distance_mm: number;
  discharge_force_N?: number;
  workpiece_height_mm: number;
  wire_type?: string;
  feed_rate_mm_min?: number;
}

export interface TaperInput {
  segments: Array<{
    start_point: { x: number; y: number };
    end_point: { x: number; y: number };
    taper_angle_deg: number;
  }>;
  workpiece_height_mm: number;
  guide_distance_mm: number;
  wire_diameter_mm: number;
}

export interface TaperAccuracyInput {
  taper_angle_deg: number;
  workpiece_height_mm: number;
  wire_diameter_mm: number;
  guide_distance_mm: number;
  tolerance_mm: number;
}

export interface FullPlanInput {
  wire_management: WireManagementInput;
  corner_compensation?: CornerCompensationInput;
  taper?: TaperInput;
}

// ============================================================================
// MATERIAL DENSITY LOOKUP
// ============================================================================

const MATERIAL_DENSITIES: Record<string, number> = {
  steel: 7850,
  stainless_steel: 7980,
  aluminum: 2700,
  copper: 8960,
  brass: 8530,
  titanium: 4510,
  tungsten_carbide: 15630,
  inconel: 8440,
  tool_steel: 7800,
  carbide: 14500,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMWireSlugCornerTaperEngine {

  // --------------------------------------------------------------------------
  // MS11-U01: Wire Threading Sequencer
  // --------------------------------------------------------------------------

  private buildThreadingSequence(input: WireManagementInput): ThreadingSequence {
    const steps: ThreadingStep[] = [];
    let totalTime = 0;

    for (const profile of input.profiles) {
      const hole = input.start_holes.find(h => h.id === profile.start_hole);
      const holeDia = hole ? hole.diameter_mm : 0;
      const canAutoThread = input.machine_has_auto_thread && holeDia >= 1.0;

      let method: ThreadingMethod;
      if (canAutoThread) {
        method = "jet";
      } else if (holeDia >= 0.5) {
        method = "mechanical";
      } else {
        method = "manual";
      }

      // Initial threading into start hole
      steps.push({
        action: `Thread wire into start hole for profile ${profile.name}`,
        profile: profile.name,
        start_hole: profile.start_hole,
        method,
        controller_code: method === "jet" ? "M50" : method === "mechanical" ? "M51" : undefined,
      });

      // Time per threading: jet ~0.5min, mechanical ~1min, manual ~3min
      const threadTime = method === "jet" ? 0.5 : method === "mechanical" ? 1.0 : 3.0;
      totalTime += threadTime;

      // If profile has tabs, we need re-threads after initial cut to cut tabs
      if (profile.tabs && profile.tabs.length > 0) {
        steps.push({
          action: `Re-thread for tab cutting on profile ${profile.name} (${profile.tabs.length} tabs)`,
          profile: profile.name,
          method,
          controller_code: method === "jet" ? "M50" : undefined,
        });
        totalTime += threadTime * profile.tabs.length * 0.5;
      }
    }

    return { steps, estimated_time_min: Math.round(totalTime * 10) / 10 };
  }

  // --------------------------------------------------------------------------
  // MS11-U02: Wire Break Recovery Planner
  // --------------------------------------------------------------------------

  private buildBreakRecoveryPlan(input: WireManagementInput): BreakRecoveryPlan {
    const overlapMm = 3.0; // Standard 2-5mm overlap, use 3mm default
    const retractMm = 10.0;

    // Determine threading method for recovery
    const canAutoThread = input.machine_has_auto_thread;
    const rethreadMethod: ThreadingMethod = canAutoThread ? "jet" : "mechanical";

    // Recovery time: retract + re-thread + back-up + resume
    const recoveryMin = rethreadMethod === "jet" ? 1.5 : rethreadMethod === "mechanical" ? 2.5 : 5.0;

    // Analyze existing break history to find patterns
    const breaks = input.existing_breaks || [];
    const analyzedBreaks: BreakRecord[] = breaks.map(b => ({
      ...b,
      probable_cause: b.probable_cause || this.diagnoseProbableCause(b, input),
    }));

    return {
      retract_distance_mm: retractMm,
      overlap_mm: overlapMm,
      rethread_method: rethreadMethod,
      resume_offset_mm: -overlapMm, // back up by overlap distance
      break_history: analyzedBreaks,
      estimated_recovery_min: Math.round(recoveryMin * 10) / 10,
    };
  }

  private diagnoseProbableCause(brk: BreakRecord, input: WireManagementInput): string {
    // Heuristic break cause diagnosis
    if (brk.cut_pass === 1) {
      return "Rough cut — likely high energy or contaminated flush";
    }
    if (input.workpiece_thickness_mm > 100) {
      return "Thick workpiece — flush pressure may be insufficient at depth";
    }
    if (input.wire_diameter_mm < 0.15) {
      return "Thin wire — tension may be too high for wire diameter";
    }
    return "Undetermined — check flush, tension, and power settings";
  }

  // --------------------------------------------------------------------------
  // MS11-U03: Slug Management Engine
  // --------------------------------------------------------------------------

  planSlugManagement(input: SlugManagementInput): SlugPlan[] {
    const plans: SlugPlan[] = [];
    const clearance = input.clearance_below_mm ?? 50;

    for (const profile of input.profiles) {
      // Slug weight = area × thickness × density
      // area in mm² → m², thickness in mm → m, density in kg/m³
      const areaM2 = profile.area_mm2 * 1e-6;
      const thicknessM = input.workpiece_thickness_mm * 1e-3;
      const weightKg = areaM2 * thicknessM * input.material_density_kg_m3;

      let management: SlugManagementMethod;
      let canFallFree: boolean;
      let interventionNeeded: boolean;
      let notes: string;

      if (weightKg < 0.1) {
        // Light slug — free drop
        management = "free_drop";
        canFallFree = clearance > input.workpiece_thickness_mm;
        interventionNeeded = !canFallFree;
        notes = canFallFree
          ? `Light slug (${(weightKg * 1000).toFixed(1)}g) — free drop OK`
          : `Light slug but insufficient clearance below (${clearance}mm). Reposition or add clearance.`;
      } else if (weightKg < 0.5) {
        // Medium slug — controlled drop
        management = "controlled_drop";
        canFallFree = false;
        interventionNeeded = true;
        notes = `Medium slug (${(weightKg * 1000).toFixed(1)}g) — use controlled drop. ` +
          `Reduce feed at final 2mm to allow controlled separation.`;
      } else if (weightKg < 2.0) {
        // Heavy slug — glue tab or magnet hold
        const isMagnetic = input.material_density_kg_m3 > 7000; // rough: steel-like
        management = isMagnetic ? "magnet" : "glue_tab";
        canFallFree = false;
        interventionNeeded = true;
        notes = isMagnetic
          ? `Heavy slug (${(weightKg * 1000).toFixed(0)}g) — magnetic hold recommended. ` +
            `Place magnet on slug before final separation cut.`
          : `Heavy slug (${(weightKg * 1000).toFixed(0)}g) — non-magnetic material. ` +
            `Use glue tabs or vacuum extraction.`;
      } else {
        // Very heavy slug — vacuum or crane
        management = "vacuum";
        canFallFree = false;
        interventionNeeded = true;
        notes = `Very heavy slug (${weightKg.toFixed(2)}kg) — vacuum extraction or crane assist required. ` +
          `DO NOT allow uncontrolled drop; risk of wire break and machine damage.`;
      }

      plans.push({
        profile: profile.name,
        weight_kg: Math.round(weightKg * 10000) / 10000,
        management,
        can_fall_free: canFallFree,
        intervention_needed: interventionNeeded,
        notes,
      });
    }

    return plans;
  }

  // --------------------------------------------------------------------------
  // MS11-U04: Tab Cutting Sequencer
  // --------------------------------------------------------------------------

  private buildTabCutSequence(input: WireManagementInput): TabCutSequence {
    const allTabs: TabDefinition[] = [];
    let tabGlobalIndex = 0;

    for (const profile of input.profiles) {
      if (!profile.tabs || profile.tabs.length === 0) continue;

      for (let i = 0; i < profile.tabs.length; i++) {
        allTabs.push({
          profile: profile.name,
          tab_index: tabGlobalIndex,
          position: profile.tabs[i].position,
          width_mm: profile.tabs[i].width_mm,
          use_finish_params: true, // tabs always cut with finish params
        });
        tabGlobalIndex++;
      }
    }

    // Cutting order: all tabs on one profile before moving to next
    // Within a profile, cut in index order (could optimize for shortest path)
    const cuttingOrder = allTabs.map((_, i) => i);

    // Time estimate: each tab ~ 0.5-2min depending on width
    const timePerTab = allTabs.reduce((sum, tab) => {
      const tabCutTime = (tab.width_mm / 2.0) * 0.5; // rough: 0.25 min per mm width
      return sum + Math.max(0.5, tabCutTime);
    }, 0);

    // Add re-threading time per profile
    const profilesWithTabs = new Set(allTabs.map(t => t.profile));
    const rethreadTime = profilesWithTabs.size * 1.0; // 1 min per profile re-thread

    return {
      tabs: allTabs,
      cutting_order: cuttingOrder,
      estimated_time_min: Math.round((timePerTab + rethreadTime) * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // MS11-U05: Wire Guide Management
  // --------------------------------------------------------------------------

  private assessGuideStatus(input: WireManagementInput): GuideStatus {
    const guideType = input.guide_type || "diamond";
    const replacementInterval = input.guide_replacement_interval_hours
      ?? (guideType === "diamond" ? 200 : guideType === "sapphire" ? 150 : 100);

    const upperRemaining = Math.max(0, 100 * (1 - input.guide_upper_hours / replacementInterval));
    const lowerRemaining = Math.max(0, 100 * (1 - input.guide_lower_hours / replacementInterval));
    const needsReplacement = upperRemaining < 10 || lowerRemaining < 10;

    return {
      upper_guide_type: guideType,
      lower_guide_type: guideType,
      upper_hours_used: input.guide_upper_hours,
      lower_hours_used: input.guide_lower_hours,
      replacement_interval_hours: replacementInterval,
      upper_remaining_pct: Math.round(upperRemaining * 10) / 10,
      lower_remaining_pct: Math.round(lowerRemaining * 10) / 10,
      needs_replacement: needsReplacement,
    };
  }

  // --------------------------------------------------------------------------
  // MS11-U06: Auto-Threading Capability Check
  // --------------------------------------------------------------------------

  private assessAutoThreading(input: WireManagementInput): AutoThreadAssessment {
    const blockers: string[] = [];
    const minRequired = 1.0; // mm

    // Find smallest start hole
    const smallestHole = input.start_holes.length > 0
      ? Math.min(...input.start_holes.map(h => h.diameter_mm))
      : 0;

    if (!input.machine_has_auto_thread) {
      blockers.push("Machine does not have auto-threading capability");
    }
    if (smallestHole < minRequired && input.start_holes.length > 0) {
      blockers.push(`Start hole ${smallestHole.toFixed(2)}mm < minimum ${minRequired}mm for auto-thread`);
    }
    if (input.start_holes.length === 0) {
      blockers.push("No start holes defined");
    }

    const dielectricOk = input.dielectric_level_ok !== false;
    if (!dielectricOk) {
      blockers.push("Dielectric level is not at correct height for auto-threading");
    }

    const wireTipOk = input.wire_tip_ok !== false;
    if (!wireTipOk) {
      blockers.push("Wire tip condition is poor — trim or replace before auto-threading");
    }

    return {
      can_auto_thread: blockers.length === 0,
      start_hole_diameter_mm: smallestHole,
      minimum_required_mm: minRequired,
      dielectric_level_ok: dielectricOk,
      wire_tip_ok: wireTipOk,
      blockers,
    };
  }

  // --------------------------------------------------------------------------
  // MS12-U01: Wire Lag Compensator
  // --------------------------------------------------------------------------

  private calculateWireLag(
    dischargeForceN: number,
    guideDistanceMm: number,
    wireTensionN: number,
  ): number {
    // Wire deflection under point-load discharge force at mid-span (catenary model):
    //   δ = F × L / (4T)   [mm]
    // where F = discharge force [N], L = guide distance [mm], T = wire tension [N]
    // Dimensional check: N × mm / N = mm ✓
    // Ref: Dauw & Snoeys, CIRP Annals 1986; Kinoshita et al., CIRP Annals 1982
    // Previous formula F×L²/(8T) was dimensionally incorrect (N×mm²/N = mm²)
    if (!wireTensionN || wireTensionN <= 0) return 0; // Guard against division by zero
    return (dischargeForceN * guideDistanceMm) / (4 * wireTensionN);
  }

  // --------------------------------------------------------------------------
  // MS12-U02: Corner Over-Travel Calculator
  // --------------------------------------------------------------------------

  private calculateOverTravel(lagMm: number, angleDeg: number): number {
    // OT = lag × sin(θ/2) / sin(θ)
    const angleRad = (angleDeg * Math.PI) / 180;
    const halfAngleRad = angleRad / 2;

    const sinTheta = Math.sin(angleRad);
    if (Math.abs(sinTheta) < 1e-10) {
      // Straight line (180°), no over-travel needed
      return 0;
    }

    return lagMm * Math.sin(halfAngleRad) / sinTheta;
  }

  // --------------------------------------------------------------------------
  // MS12-U03: Corner Dwell Time Calculator
  // --------------------------------------------------------------------------

  private calculateDwellTime(
    lagMm: number,
    wireTensionN: number,
    workpieceHeightMm: number,
    _wireType?: string,
  ): number {
    // dwell = k × δ / v_wire_recovery
    // v_wire_recovery ~ tension / (height * damping_factor)
    // k ~ 2-3 safety factor
    const k = 2.5;
    const dampingFactor = 0.05; // empirical
    const vRecovery = wireTensionN / (workpieceHeightMm * dampingFactor);

    let dwell = k * lagMm / vRecovery;

    // Clamp to practical range 0.05-2.0 sec
    dwell = Math.max(0.05, Math.min(2.0, dwell));

    return Math.round(dwell * 1000) / 1000;
  }

  // --------------------------------------------------------------------------
  // MS12-U01+U02+U03 combined: Corner Compensation
  // --------------------------------------------------------------------------

  calculateCornerCompensation(input: CornerCompensationInput): CornerCompensation[] {
    const dischargeForce = input.discharge_force_N ?? 0.5; // default 0.5N
    const feedRate = input.feed_rate_mm_min ?? 5.0;

    const lag = this.calculateWireLag(dischargeForce, input.guide_distance_mm, input.wire_tension_N);

    return input.corners.map(corner => {
      const overTravel = this.calculateOverTravel(lag, corner.angle_deg);
      const dwell = this.calculateDwellTime(
        lag,
        input.wire_tension_N,
        input.workpiece_height_mm,
        input.wire_type,
      );

      // Time added: over-travel distance / feed rate (min→sec) + dwell
      const overTravelTimeSec = (overTravel / feedRate) * 60;
      const totalTimeAdded = overTravelTimeSec + dwell;

      // Achievable accuracy with compensation applied
      // Residual error ~ 10% of uncompensated lag
      const residualError = lag * 0.1;
      // Wire diameter contribution
      const wireDiaContribution = input.wire_diameter_mm * 0.02;
      const achievableAccuracy = Math.sqrt(residualError * residualError + wireDiaContribution * wireDiaContribution);

      return {
        corner_index: corner.index,
        angle_deg: corner.angle_deg,
        wire_lag_mm: Math.round(lag * 10000) / 10000,
        over_travel_mm: Math.round(overTravel * 10000) / 10000,
        dwell_time_sec: dwell,
        total_time_added_sec: Math.round(totalTimeAdded * 1000) / 1000,
        accuracy_achievable_mm: Math.round(achievableAccuracy * 10000) / 10000,
      };
    });
  }

  // --------------------------------------------------------------------------
  // MS12-U04: Taper Geometry Solver
  // --------------------------------------------------------------------------

  solveTaper(input: TaperInput): TaperSolution {
    const halfHeight = input.workpiece_height_mm / 2;
    let maxUV = 0;

    const segments: TaperSegment[] = input.segments.map(seg => {
      const angleRad = (seg.taper_angle_deg * Math.PI) / 180;
      const uvOffset = Math.tan(angleRad) * halfHeight;

      // Direction vector of the segment for U/V decomposition
      const dx = seg.end_point.x - seg.start_point.x;
      const dy = seg.end_point.y - seg.start_point.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      // U offset is perpendicular to the XY path direction
      // For a segment along X, U is in X, V is in Y (simplified)
      let uOffset: number;
      let vOffset: number;

      if (len > 1e-10) {
        // Normal direction for UV offset
        const nx = -dy / len;
        const ny = dx / len;
        uOffset = uvOffset * nx;
        vOffset = uvOffset * ny;
      } else {
        uOffset = uvOffset;
        vOffset = 0;
      }

      const totalUV = Math.sqrt(uOffset * uOffset + vOffset * vOffset);
      if (totalUV > maxUV) maxUV = totalUV;

      return {
        start_point: seg.start_point,
        end_point: seg.end_point,
        taper_angle_deg: seg.taper_angle_deg,
        u_offset_mm: Math.round(uOffset * 10000) / 10000,
        v_offset_mm: Math.round(vOffset * 10000) / 10000,
      };
    });

    // Achievable accuracy: geometric error
    const maxAngle = Math.max(...input.segments.map(s => s.taper_angle_deg));
    const guideDist = input.guide_distance_mm || 60; // Default 60mm guide distance if not provided
    const geoError = (input.wire_diameter_mm / 2) * input.workpiece_height_mm / guideDist;

    return {
      segments,
      max_uv_travel_required_mm: Math.round(maxUV * 10000) / 10000,
      achievable_accuracy_mm: Math.round(geoError * 10000) / 10000,
      guide_distance_mm: input.guide_distance_mm,
    };
  }

  // --------------------------------------------------------------------------
  // MS12-U05: Taper Accuracy Predictor
  // --------------------------------------------------------------------------

  predictTaperAccuracy(input: TaperAccuracyInput): TaperAccuracyResult {
    // Geometric error: ε = (wire_dia/2) × H / guide_distance
    const guideDist = input.guide_distance_mm || 60; // Default 60mm guide distance if not provided
    const geoError = (input.wire_diameter_mm / 2) * input.workpiece_height_mm / guideDist;

    // Thermal error: grows with taper angle and height
    // Empirical: ~0.001mm per degree per 10mm height
    const thermalError = 0.001 * input.taper_angle_deg * (input.workpiece_height_mm / 10);

    const totalError = Math.sqrt(geoError * geoError + thermalError * thermalError);
    const withinTolerance = totalError <= input.tolerance_mm;

    const recs: string[] = [];

    if (!withinTolerance) {
      const ratio = totalError / input.tolerance_mm;
      recs.push(`Predicted error ${totalError.toFixed(4)}mm exceeds tolerance ${input.tolerance_mm}mm by ${((ratio - 1) * 100).toFixed(1)}%`);

      if (geoError > thermalError) {
        recs.push("Geometric error dominates — reduce workpiece height, use thinner wire, or use machine with wider guide spacing");
      } else {
        recs.push("Thermal error dominates — reduce energy settings, improve flushing, allow thermal stabilization");
      }

      if (input.taper_angle_deg > 15) {
        recs.push("Steep taper angle — consider multi-pass strategy with decreasing energy per pass");
      }
    } else {
      recs.push(`Taper accuracy achievable: predicted ${totalError.toFixed(4)}mm within tolerance ${input.tolerance_mm}mm`);
    }

    if (input.taper_angle_deg > 30) {
      recs.push("WARNING: Taper >30° — verify machine UV travel range and guide clearance");
    }

    if (input.workpiece_height_mm > 100) {
      recs.push("Tall workpiece — wire deflection under gravity may add systematic error; consider vertical compensation");
    }

    return {
      taper_angle_deg: input.taper_angle_deg,
      workpiece_height_mm: input.workpiece_height_mm,
      wire_diameter_mm: input.wire_diameter_mm,
      guide_distance_mm: input.guide_distance_mm,
      geometric_error_mm: Math.round(geoError * 100000) / 100000,
      thermal_error_mm: Math.round(thermalError * 100000) / 100000,
      total_predicted_error_mm: Math.round(totalError * 100000) / 100000,
      within_tolerance: withinTolerance,
      tolerance_mm: input.tolerance_mm,
      recommendations: recs,
    };
  }

  // --------------------------------------------------------------------------
  // MS12-U06: Variable Taper Profile Generator
  // --------------------------------------------------------------------------

  generateVariableTaperProfile(input: TaperInput): VariableTaperProfile {
    const taperSolution = this.solveTaper(input);
    const warnings: string[] = [];

    // Calculate transitions between consecutive segments
    const transitions: VariableTaperProfile["uv_transitions"] = [];
    let maxAngleChange = 0;

    for (let i = 0; i < taperSolution.segments.length - 1; i++) {
      const curr = taperSolution.segments[i];
      const next = taperSolution.segments[i + 1];
      const angleChange = Math.abs(next.taper_angle_deg - curr.taper_angle_deg);

      if (angleChange > maxAngleChange) maxAngleChange = angleChange;

      // Transition length: proportional to angle change
      // Minimum 0.5mm, ~0.2mm per degree of change
      const transitionLength = Math.max(0.5, angleChange * 0.2);
      const smooth = angleChange < 10; // smooth if angle change < 10°

      transitions.push({
        from_segment: i,
        to_segment: i + 1,
        transition_length_mm: Math.round(transitionLength * 100) / 100,
        smooth,
      });

      if (!smooth) {
        warnings.push(
          `Transition ${i}→${i + 1}: angle change ${angleChange.toFixed(1)}° is abrupt — ` +
          `may cause surface mark. Consider breaking into sub-segments.`,
        );
      }
    }

    // Check feasibility
    const maxAngleInProfile = Math.max(...input.segments.map(s => s.taper_angle_deg));
    const maxUVTravel = taperSolution.max_uv_travel_required_mm;
    let feasible = true;

    if (maxAngleInProfile > 45) {
      warnings.push(`Maximum taper angle ${maxAngleInProfile.toFixed(1)}° exceeds typical machine limit of 45°`);
      feasible = false;
    }

    // Typical max UV travel ~80mm for most machines
    if (maxUVTravel > 80) {
      warnings.push(`Required UV travel ${maxUVTravel.toFixed(2)}mm exceeds typical machine limit of 80mm`);
      feasible = false;
    }

    if (maxAngleChange > 20) {
      warnings.push(
        `Maximum angle change between segments is ${maxAngleChange.toFixed(1)}° — ` +
        `surface quality may degrade at transitions`,
      );
    }

    return {
      segments: taperSolution.segments,
      uv_transitions: transitions,
      max_angle_change_deg: Math.round(maxAngleChange * 100) / 100,
      feasible,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: plan_wire_management (MS11 full plan)
  // --------------------------------------------------------------------------

  planWireManagement(input: WireManagementInput): WireManagementPlan {
    const threading = this.buildThreadingSequence(input);
    const breakRecovery = this.buildBreakRecoveryPlan(input);

    const slugInput: SlugManagementInput = {
      profiles: input.profiles.map(p => ({ name: p.name, area_mm2: p.area_mm2 })),
      workpiece_thickness_mm: input.workpiece_thickness_mm,
      material_density_kg_m3: input.material_density_kg_m3,
    };
    const slugPlans = this.planSlugManagement(slugInput);

    const tabCutting = this.buildTabCutSequence(input);
    const guideStatus = this.assessGuideStatus(input);
    const autoThread = this.assessAutoThreading(input);

    return {
      threading,
      break_recovery: breakRecovery,
      slug_management: slugPlans,
      tab_cutting: tabCutting,
      guide_status: guideStatus,
      auto_thread: autoThread,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: full_plan (MS11 + MS12 combined)
  // --------------------------------------------------------------------------

  fullPlan(input: FullPlanInput): {
    wire_management: WireManagementPlan;
    corner_compensation: CornerCompensation[] | null;
    taper_solution: TaperSolution | null;
    variable_taper: VariableTaperProfile | null;
    summary: string[];
  } {
    const wireMgmt = this.planWireManagement(input.wire_management);

    let cornerComp: CornerCompensation[] | null = null;
    if (input.corner_compensation) {
      cornerComp = this.calculateCornerCompensation(input.corner_compensation);
    }

    let taperSol: TaperSolution | null = null;
    let varTaper: VariableTaperProfile | null = null;
    if (input.taper) {
      taperSol = this.solveTaper(input.taper);
      // Generate variable taper if more than 1 segment with differing angles
      const angles = input.taper.segments.map(s => s.taper_angle_deg);
      const hasVariableTaper = new Set(angles).size > 1;
      if (hasVariableTaper) {
        varTaper = this.generateVariableTaperProfile(input.taper);
      }
    }

    // Build summary
    const summary: string[] = [];
    summary.push(`Wire management: ${wireMgmt.threading.steps.length} threading steps, ${wireMgmt.threading.estimated_time_min} min threading time`);
    summary.push(`Slug management: ${wireMgmt.slug_management.length} profiles — ` +
      `${wireMgmt.slug_management.filter(s => s.intervention_needed).length} require intervention`);

    if (wireMgmt.guide_status.needs_replacement) {
      summary.push("WARNING: Wire guides approaching replacement interval");
    }

    if (!wireMgmt.auto_thread.can_auto_thread) {
      summary.push(`Auto-threading blocked: ${wireMgmt.auto_thread.blockers.join("; ")}`);
    }

    if (wireMgmt.tab_cutting.tabs.length > 0) {
      summary.push(`Tab cutting: ${wireMgmt.tab_cutting.tabs.length} tabs, ${wireMgmt.tab_cutting.estimated_time_min} min`);
    }

    if (cornerComp) {
      const totalDwell = cornerComp.reduce((s, c) => s + c.dwell_time_sec, 0);
      const maxLag = Math.max(...cornerComp.map(c => c.wire_lag_mm));
      summary.push(`Corner compensation: ${cornerComp.length} corners, max lag ${maxLag.toFixed(4)}mm, total dwell ${totalDwell.toFixed(2)}s`);
    }

    if (taperSol) {
      summary.push(`Taper: ${taperSol.segments.length} segments, max UV ${taperSol.max_uv_travel_required_mm}mm, accuracy ${taperSol.achievable_accuracy_mm}mm`);
    }

    if (varTaper && !varTaper.feasible) {
      summary.push("WARNING: Variable taper profile has feasibility issues — see warnings");
    }

    return {
      wire_management: wireMgmt,
      corner_compensation: cornerComp,
      taper_solution: taperSol,
      variable_taper: varTaper,
      summary,
    };
  }

  // --------------------------------------------------------------------------
  // UTILITY: Material density lookup
  // --------------------------------------------------------------------------

  static lookupDensity(material: string): number {
    const key = material.toLowerCase().replace(/[\s-]/g, "_");
    return MATERIAL_DENSITIES[key] ?? 7850; // default to steel
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const edmWireSlugCornerTaperEngine = new EDMWireSlugCornerTaperEngine();
