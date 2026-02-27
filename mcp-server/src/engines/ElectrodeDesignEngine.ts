/**
 * ElectrodeDesignEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Designs EDM electrodes: material selection, overcut compensation,
 * electrode count planning, and wear strategy optimization.
 *
 * Covers: graphite vs copper electrodes, roughing/finishing electrode
 * pairs, orbital/planetary strategies, and multi-cavity optimization.
 *
 * Actions: electrode_design, electrode_wear, electrode_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type ElectrodeMaterial = "graphite_fine" | "graphite_std" | "copper" | "copper_tungsten" | "tellurium_copper";

export interface ElectrodeDesignInput {
  cavity_depth_mm: number;
  cavity_width_mm: number;
  cavity_length_mm: number;
  workpiece_material: string;
  workpiece_hardness_HRC: number;
  surface_finish_target_Ra_um: number;
  tolerance_mm: number;
  num_cavities: number;
  electrode_material: ElectrodeMaterial;
}

export interface ElectrodeDesignResult {
  num_electrodes_needed: number;       // rough + semi + finish
  overcut_per_side_mm: number;
  electrode_undersized_mm: number;     // make electrode this much smaller
  wear_ratio_pct: number;             // electrode wear / workpiece removal
  estimated_burn_time_min: number;
  electrode_stages: { stage: string; gap_mm: number; electrode_count: number }[];
  material_recommendation: string;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Wear ratio by electrode/workpiece combination
const WEAR_RATIO: Record<ElectrodeMaterial, Record<string, number>> = {
  graphite_fine: { steel: 15, stainless: 18, carbide: 25, aluminum: 8 },
  graphite_std: { steel: 25, stainless: 30, carbide: 40, aluminum: 12 },
  copper: { steel: 35, stainless: 40, carbide: 50, aluminum: 5 },
  copper_tungsten: { steel: 8, stainless: 12, carbide: 15, aluminum: 10 },
  tellurium_copper: { steel: 30, stainless: 35, carbide: 45, aluminum: 4 },
};

// Overcut (spark gap) by finish level
const GAP_BY_STAGE: Record<string, number> = {
  rough: 0.15,
  semi: 0.08,
  finish: 0.03,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ElectrodeDesignEngine {
  design(input: ElectrodeDesignInput): ElectrodeDesignResult {
    const matKey = this._workpieceKey(input.workpiece_material);
    const wearRatio = WEAR_RATIO[input.electrode_material]?.[matKey] || 25;

    // Determine stages needed based on surface finish target
    const stages: ElectrodeDesignResult["electrode_stages"] = [];
    let totalElectrodes = 0;

    if (input.surface_finish_target_Ra_um > 6.3) {
      // Rough only
      stages.push({ stage: "rough", gap_mm: GAP_BY_STAGE.rough, electrode_count: 1 });
      totalElectrodes = 1;
    } else if (input.surface_finish_target_Ra_um > 1.6) {
      // Rough + finish
      stages.push({ stage: "rough", gap_mm: GAP_BY_STAGE.rough, electrode_count: 1 });
      stages.push({ stage: "finish", gap_mm: GAP_BY_STAGE.finish, electrode_count: 1 });
      totalElectrodes = 2;
    } else {
      // Rough + semi + finish
      stages.push({ stage: "rough", gap_mm: GAP_BY_STAGE.rough, electrode_count: 1 });
      stages.push({ stage: "semi", gap_mm: GAP_BY_STAGE.semi, electrode_count: 1 });
      stages.push({ stage: "finish", gap_mm: GAP_BY_STAGE.finish, electrode_count: 1 });
      totalElectrodes = 3;
    }

    // Multiply by cavities
    totalElectrodes *= input.num_cavities;

    // Overcut (final stage gap)
    const finalGap = stages[stages.length - 1].gap_mm;

    // Electrode undersize: gap per side
    const undersize = finalGap;

    // Burn time estimate: volume / MRR
    const volume = input.cavity_depth_mm * input.cavity_width_mm * input.cavity_length_mm;
    // Rough MRR: ~100 mm³/min for graphite in steel, scales with gap
    const baseMRR = input.electrode_material.includes("graphite") ? 100 : 60;
    const roughTime = volume / baseMRR;
    const finishFactor = stages.length > 1 ? 1.5 : 1.0; // finishing is slower
    const totalTime = roughTime * finishFactor * input.num_cavities;

    // Material recommendation
    const matRec = input.workpiece_hardness_HRC > 55
      ? "Graphite (fine grain) recommended for hard materials — lower wear, faster cutting"
      : input.surface_finish_target_Ra_um < 0.8
        ? "Copper recommended for mirror finish — better surface finish than graphite"
        : "Graphite standard recommended — good balance of speed and finish";

    // Recommendations
    const recs: string[] = [];
    if (input.cavity_depth_mm > input.cavity_width_mm * 3) {
      recs.push("Deep narrow cavity — use orbital motion and through-electrode flushing");
    }
    if (wearRatio > 30) {
      recs.push(`High electrode wear (${wearRatio}%) — consider copper-tungsten for reduced wear`);
    }
    if (input.tolerance_mm < 0.02) {
      recs.push("Tight tolerance (<0.02mm) — use separate finish electrode with orbital compensation");
    }
    if (input.num_cavities > 4) {
      recs.push("Multiple cavities — consider gang electrode or pallet system for automation");
    }
    if (recs.length === 0) {
      recs.push("Electrode design within standard parameters — proceed");
    }

    return {
      num_electrodes_needed: totalElectrodes,
      overcut_per_side_mm: finalGap,
      electrode_undersized_mm: Math.round(undersize * 1000) / 1000,
      wear_ratio_pct: wearRatio,
      estimated_burn_time_min: Math.round(totalTime * 10) / 10,
      electrode_stages: stages,
      material_recommendation: matRec,
      recommendations: recs,
    };
  }

  private _workpieceKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("stainless")) return "stainless";
    if (m.includes("carbide") || m.includes("tungsten")) return "carbide";
    if (m.includes("aluminum")) return "aluminum";
    return "steel";
  }
}

export const electrodeDesignEngine = new ElectrodeDesignEngine();
