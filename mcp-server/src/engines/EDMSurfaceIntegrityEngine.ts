/**
 * EDMSurfaceIntegrityEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Assesses surface integrity after EDM operations. EDM creates
 * recast layers, heat-affected zones, microcracks, and residual
 * stresses that degrade fatigue life of safety-critical components.
 *
 * Models: recast depth, microcrack density, residual stress profile,
 * and post-process requirements per aerospace standards (AMS 2628).
 *
 * Actions: edm_surface_assess, edm_surface_validate, edm_surface_remediate
 */

// ============================================================================
// TYPES
// ============================================================================

export type EDMType = "wire" | "sinker" | "hole_drill" | "micro";

export interface EDMSurfaceInput {
  edm_type: EDMType;
  discharge_energy_mJ: number;
  num_skim_passes: number;
  workpiece_material: string;
  workpiece_hardness_HRC: number;
  is_fatigue_critical: boolean;
  application: "aerospace" | "medical" | "automotive" | "tooling" | "general";
  spec_standard?: string;              // e.g., "AMS 2628"
}

export interface EDMSurfaceResult {
  recast_layer_depth_um: number;
  heat_affected_zone_depth_um: number;
  microcrack_density: "none" | "isolated" | "moderate" | "extensive";
  residual_stress_type: "compressive" | "tensile";
  residual_stress_MPa: number;
  fatigue_life_reduction_pct: number;
  surface_roughness_Ra_um: number;
  meets_specification: boolean;
  spec_max_recast_um: number;
  post_process_required: string[];
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Spec limits by application
const SPEC_LIMITS: Record<string, { max_recast_um: number; max_haz_um: number; requires_removal: boolean }> = {
  aerospace: { max_recast_um: 0, max_haz_um: 25, requires_removal: true },
  medical: { max_recast_um: 5, max_haz_um: 50, requires_removal: true },
  automotive: { max_recast_um: 15, max_haz_um: 100, requires_removal: false },
  tooling: { max_recast_um: 25, max_haz_um: 200, requires_removal: false },
  general: { max_recast_um: 50, max_haz_um: 500, requires_removal: false },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMSurfaceIntegrityEngine {
  assess(input: EDMSurfaceInput): EDMSurfaceResult {
    // Base recast depth from discharge energy
    const energyFactor = Math.sqrt(input.discharge_energy_mJ);
    let baseRecast = energyFactor * 3; // µm

    // EDM type factor
    const typeFactor: Record<EDMType, number> = { sinker: 1.0, wire: 0.6, hole_drill: 1.2, micro: 0.2 };
    baseRecast *= typeFactor[input.edm_type];

    // Skim pass reduction (each skim removes ~40% of recast)
    const skimReduction = Math.pow(0.6, input.num_skim_passes);
    const finalRecast = baseRecast * skimReduction;

    // HAZ is 3-5x recast depth
    const haz = finalRecast * 4;

    // Microcrack density
    const crackDensity: EDMSurfaceResult["microcrack_density"] =
      finalRecast > 20 ? "extensive"
      : finalRecast > 10 ? "moderate"
      : finalRecast > 3 ? "isolated"
      : "none";

    // Residual stress (EDM creates tensile stress in recast layer)
    const residualStress = Math.min(800, 200 + input.discharge_energy_mJ * 10);

    // Surface roughness
    const Ra = 0.5 + energyFactor * 0.8 * skimReduction;

    // Fatigue life reduction
    const fatigueReduction = Math.min(70, finalRecast * 1.2 + residualStress * 0.02);

    // Specification check
    const spec = SPEC_LIMITS[input.application] || SPEC_LIMITS.general;
    const meetsSpec = finalRecast <= spec.max_recast_um && haz <= spec.max_haz_um;

    // Post-process requirements
    const postProcess: string[] = [];
    if (spec.requires_removal || (input.is_fatigue_critical && finalRecast > 3)) {
      postProcess.push("Remove recast layer: chemical etch (HF/HNO3) or light grinding");
    }
    if (residualStress > 400 && input.is_fatigue_critical) {
      postProcess.push("Stress relief: shot peening (Almen A 0.010-0.014) or low-stress grinding");
    }
    if (input.application === "aerospace") {
      postProcess.push("Inspect per AMS 2628: etch inspect for recast, fluor penetrant for cracks");
    }
    if (postProcess.length === 0) {
      postProcess.push("No mandatory post-processing — standard QC inspection sufficient");
    }

    // Recommendations
    const recs: string[] = [];
    if (!meetsSpec) {
      recs.push(`SAFETY: Recast ${finalRecast.toFixed(1)}µm exceeds ${input.application} limit ${spec.max_recast_um}µm`);
      if (input.num_skim_passes < 4) {
        recs.push(`Add ${4 - input.num_skim_passes} more skim passes to reduce recast layer`);
      }
    }
    if (input.is_fatigue_critical && crackDensity !== "none") {
      recs.push("Microcracks detected in fatigue-critical zone — mandatory recast removal");
    }
    if (meetsSpec && recs.length === 0) {
      recs.push("EDM surface integrity within specification — proceed with post-processing if required");
    }

    return {
      recast_layer_depth_um: Math.round(finalRecast * 10) / 10,
      heat_affected_zone_depth_um: Math.round(haz * 10) / 10,
      microcrack_density: crackDensity,
      residual_stress_type: "tensile",
      residual_stress_MPa: Math.round(residualStress),
      fatigue_life_reduction_pct: Math.round(fatigueReduction * 10) / 10,
      surface_roughness_Ra_um: Math.round(Ra * 10) / 10,
      meets_specification: meetsSpec,
      spec_max_recast_um: spec.max_recast_um,
      post_process_required: postProcess,
      recommendations: recs,
    };
  }

  validate(input: EDMSurfaceInput): { safe: boolean; message: string } {
    const result = this.assess(input);
    return {
      safe: result.meets_specification,
      message: result.meets_specification
        ? `EDM surface meets ${input.application} spec (recast ${result.recast_layer_depth_um}µm ≤ ${result.spec_max_recast_um}µm)`
        : `FAIL: Recast ${result.recast_layer_depth_um}µm exceeds ${result.spec_max_recast_um}µm — ${result.recommendations[0]}`,
    };
  }
}

export const edmSurfaceIntegrityEngine = new EDMSurfaceIntegrityEngine();
