/**
 * RecastLayerEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Detects and quantifies recast layer formation from EDM and laser processes.
 * Recast layer is re-solidified material with microcracks, tensile residual stress,
 * and altered metallurgy. Degrades fatigue life 30-70% if not removed.
 *
 * Model: Energy density + pulse characteristics + flushing effectiveness
 * Risk increases with: discharge energy, pulse duration, poor flushing, high carbon content
 *
 * Actions: recast_predict, recast_validate, recast_mitigate
 */

// ============================================================================
// TYPES
// ============================================================================

export type RecastProcess = "wire_edm" | "sinker_edm" | "laser_cut" | "laser_drill" | "micro_edm";

export interface RecastLayerInput {
  process: RecastProcess;
  discharge_energy_mJ: number;       // per pulse energy
  pulse_on_us: number;               // pulse on-time in microseconds
  pulse_off_us: number;              // pulse off-time
  peak_current_A: number;
  voltage_V: number;
  workpiece_material: string;        // e.g., "Inconel 718", "Ti-6Al-4V"
  workpiece_carbon_pct: number;      // carbon content %
  flushing: "submerged" | "jet" | "suction" | "none";
  num_skim_passes: number;           // finish/skim cuts after roughing
}

export type RecastRisk = "none" | "low" | "moderate" | "high" | "critical";

export interface RecastLayerResult {
  risk_level: RecastRisk;
  estimated_depth_um: number;        // recast layer depth in microns
  heat_affected_zone_um: number;     // HAZ depth
  microcrack_probability_pct: number;
  fatigue_life_reduction_pct: number;
  contributing_factors: { factor: string; contribution_pct: number; description: string }[];
  recommendations: string[];
  safe_for_fatigue_critical: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Process base recast multipliers (relative energy coupling efficiency)
const PROCESS_FACTOR: Record<RecastProcess, number> = {
  sinker_edm: 1.0,
  wire_edm: 0.7,
  laser_cut: 1.2,
  laser_drill: 1.5,
  micro_edm: 0.3,
};

// Flushing effectiveness at removing recast debris and cooling
const FLUSHING_FACTOR: Record<string, number> = {
  submerged: 0.75,    // best for EDM
  jet: 0.60,
  suction: 0.45,
  none: 0.0,
};

// Carbon content increases crack susceptibility
const CARBON_CRACK_FACTOR = (c: number): number =>
  c < 0.2 ? 1.0 : 1.0 + (c - 0.2) * 3.0;  // >0.6%C → 2.2x

// Skim passes reduce recast layer depth
const SKIM_REDUCTION = (passes: number): number =>
  Math.max(0.05, 1.0 - passes * 0.30);  // each skim removes ~30%, min 5%

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RecastLayerEngine {
  predict(input: RecastLayerInput): RecastLayerResult {
    const pf = PROCESS_FACTOR[input.process];
    const ff = FLUSHING_FACTOR[input.flushing] || 0;
    const ccf = CARBON_CRACK_FACTOR(input.workpiece_carbon_pct);
    const skimRed = SKIM_REDUCTION(input.num_skim_passes);

    // Energy density per pulse (mJ/µs → power proxy)
    const energyDensity = input.pulse_on_us > 0
      ? input.discharge_energy_mJ / input.pulse_on_us
      : input.discharge_energy_mJ;

    // Base recast depth model: empirical relationship
    // Roughing EDM at 10mJ/µs, sinker → ~25µm recast layer
    const baseDepth_um = energyDensity * 2.5 * pf;

    // Apply flushing reduction (good flushing reduces recast 20-40%)
    const flushedDepth = baseDepth_um * (1 - ff * 0.4);

    // Apply skim pass reduction
    const finalDepth = flushedDepth * skimRed;

    // HAZ is typically 2-4x recast layer depth
    const hazDepth = finalDepth * 3.0;

    // Microcrack probability: energy + carbon + no flushing
    const crackBase = Math.min(95, energyDensity * 5 * ccf * (1 - ff * 0.5));
    const crackProb = Math.max(0, crackBase * skimRed);

    // Fatigue life reduction correlates with recast depth and cracks
    const fatigueReduction = Math.min(70, finalDepth * 0.8 + crackProb * 0.3);

    // Risk classification
    const risk: RecastRisk =
      finalDepth >= 30 || crackProb >= 70 ? "critical"
      : finalDepth >= 15 || crackProb >= 40 ? "high"
      : finalDepth >= 8 || crackProb >= 20 ? "moderate"
      : finalDepth >= 2 ? "low"
      : "none";

    // Contributing factors
    const factors: RecastLayerResult["contributing_factors"] = [];
    const totalW = energyDensity + pf + (1 - ff) + ccf;
    factors.push({ factor: "discharge_energy", contribution_pct: Math.round(energyDensity / totalW * 100), description: `${energyDensity.toFixed(1)} mJ/µs energy density` });
    factors.push({ factor: "process_type", contribution_pct: Math.round(pf / totalW * 100), description: `${input.process} (factor ${pf})` });
    factors.push({ factor: "flushing", contribution_pct: Math.round((1 - ff) / totalW * 100), description: `${input.flushing} (${(ff * 100).toFixed(0)}% effective)` });
    factors.push({ factor: "carbon_content", contribution_pct: Math.round(ccf / totalW * 100), description: `${input.workpiece_carbon_pct}% C (crack factor ${ccf.toFixed(1)})` });

    // Recommendations
    const recs: string[] = [];
    if (risk === "critical" || risk === "high") {
      recs.push("SAFETY: Recast layer exceeds acceptable limits for fatigue-critical parts");
      if (input.num_skim_passes < 3) recs.push(`Add ${3 - input.num_skim_passes} more skim passes to reduce recast depth`);
      if (input.flushing === "none") recs.push("Add submerged or jet flushing immediately");
      if (energyDensity > 5) recs.push("Reduce discharge energy — lower pulse energy and/or increase pulse on-time");
      recs.push("Consider post-process: chemical etch or light grinding to remove recast layer");
    } else if (risk === "moderate") {
      recs.push("Inspect with SEM/metallographic section to confirm recast layer depth");
      if (input.num_skim_passes < 2) recs.push("Add skim pass to further reduce recast layer");
    } else {
      recs.push("Recast layer within acceptable limits — proceed with standard QC");
    }

    return {
      risk_level: risk,
      estimated_depth_um: Math.round(finalDepth * 10) / 10,
      heat_affected_zone_um: Math.round(hazDepth * 10) / 10,
      microcrack_probability_pct: Math.round(crackProb * 10) / 10,
      fatigue_life_reduction_pct: Math.round(fatigueReduction * 10) / 10,
      contributing_factors: factors,
      recommendations: recs,
      safe_for_fatigue_critical: risk === "none" || risk === "low",
    };
  }

  validate(input: RecastLayerInput): { safe: boolean; risk: RecastRisk; message: string } {
    const result = this.predict(input);
    return {
      safe: result.safe_for_fatigue_critical,
      risk: result.risk_level,
      message: result.safe_for_fatigue_critical
        ? "Recast layer acceptable"
        : `WARNING: ${result.risk_level} recast risk — ${result.estimated_depth_um}µm depth, ${result.microcrack_probability_pct}% crack probability`,
    };
  }

  mitigate(input: RecastLayerInput): { original_risk: RecastRisk; mitigated_risk: RecastRisk; changes: string[] } {
    const original = this.predict(input);
    const changes: string[] = [];
    const mitigated = { ...input };

    if (input.num_skim_passes < 3) { mitigated.num_skim_passes = 3; changes.push("Increase to 3 skim passes"); }
    if (input.flushing !== "submerged") { mitigated.flushing = "submerged"; changes.push("Switch to submerged flushing"); }
    if (input.discharge_energy_mJ > 5) { mitigated.discharge_energy_mJ = Math.round(input.discharge_energy_mJ * 0.5); changes.push(`Reduce discharge energy to ${mitigated.discharge_energy_mJ} mJ`); }

    const after = this.predict(mitigated);
    return { original_risk: original.risk_level, mitigated_risk: after.risk_level, changes };
  }
}

export const recastLayerEngine = new RecastLayerEngine();
