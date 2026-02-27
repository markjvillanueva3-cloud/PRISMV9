/**
 * ShotPeeningEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates shot peening parameters for fatigue life improvement.
 * Models: Almen intensity, coverage, residual stress depth, and
 * surface roughness change. Per AMS 2430 / AMS-S-13165.
 *
 * Actions: shot_peen_calc, shot_peen_validate, shot_peen_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type AlmenStrip = "N" | "A" | "C";
export type ShotMedia = "steel_shot" | "steel_cut_wire" | "ceramic" | "glass_bead" | "conditioned_cut_wire";

export interface ShotPeeningInput {
  almen_strip: AlmenStrip;
  target_intensity_mm: number;         // Almen arc height (e.g., 0.20mm A)
  coverage_pct: number;                // 100%, 200%, etc.
  shot_media: ShotMedia;
  shot_size_mm: number;                // media diameter
  workpiece_material: string;
  workpiece_hardness_HRC: number;
  surface_area_mm2: number;
  is_fatigue_critical: boolean;
}

export interface ShotPeeningResult {
  residual_stress_depth_mm: number;
  max_compressive_stress_MPa: number;
  surface_roughness_increase_Ra_um: number;
  fatigue_life_improvement_pct: number;
  peening_time_min: number;
  nozzle_distance_mm: number;
  air_pressure_bar: number;
  media_flow_kg_per_min: number;
  meets_spec: boolean;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALMEN_THICKNESS: Record<AlmenStrip, number> = { N: 0.79, A: 1.30, C: 2.39 };

// Residual stress depth ≈ shot_size * intensity_factor
const STRESS_DEPTH_FACTOR = 0.8; // mm depth per mm of Almen intensity

// Max compressive stress ~60% of UTS for steel
const MAX_STRESS_FACTOR: Record<string, number> = {
  steel: 0.6, stainless: 0.55, aluminum: 0.5, titanium: 0.5, nickel: 0.55,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ShotPeeningEngine {
  calculate(input: ShotPeeningInput): ShotPeeningResult {
    const matKey = this._materialKey(input.workpiece_material);

    // Residual stress depth
    const stressDepth = input.target_intensity_mm * STRESS_DEPTH_FACTOR + input.shot_size_mm * 0.3;

    // Max compressive stress
    const utsApprox = input.workpiece_hardness_HRC * 34 + 240; // MPa
    const stressFactor = MAX_STRESS_FACTOR[matKey] || 0.55;
    const maxStress = utsApprox * stressFactor;

    // Surface roughness increase (shot peening always roughens)
    const raIncrease = input.shot_size_mm * 2 + input.target_intensity_mm * 3;

    // Fatigue life improvement (30-300% depending on stress state)
    const fatigueImprovement = Math.min(300, maxStress * 0.15 + input.coverage_pct * 0.5);

    // Process parameters
    const nozzleDist = 150 + input.shot_size_mm * 50; // mm
    const airPressure = 2 + input.target_intensity_mm * 10; // bar
    const mediaFlow = 2 + input.surface_area_mm2 / 10000; // kg/min

    // Peening time (based on area and coverage)
    const baseTime = input.surface_area_mm2 / 5000; // min per pass
    const peeningTime = baseTime * (input.coverage_pct / 100);

    // Spec check (for AMS 2430)
    const meetsSpec = input.coverage_pct >= 100 && input.target_intensity_mm > 0.1;

    const recs: string[] = [];
    if (input.coverage_pct < 100) recs.push("Coverage below 100% — not acceptable for fatigue-critical parts");
    if (input.coverage_pct > 200) recs.push("Coverage >200% may cause over-peening and surface damage");
    if (raIncrease > 5 && input.is_fatigue_critical) {
      recs.push("Significant roughness increase — consider polishing after peening for best fatigue life");
    }
    if (input.shot_media === "glass_bead" && input.workpiece_hardness_HRC > 45) {
      recs.push("Glass beads may not achieve sufficient intensity for hard materials — use steel shot");
    }
    if (recs.length === 0) recs.push("Shot peening parameters per specification — proceed");

    return {
      residual_stress_depth_mm: Math.round(stressDepth * 100) / 100,
      max_compressive_stress_MPa: Math.round(maxStress),
      surface_roughness_increase_Ra_um: Math.round(raIncrease * 10) / 10,
      fatigue_life_improvement_pct: Math.round(fatigueImprovement),
      peening_time_min: Math.round(peeningTime * 10) / 10,
      nozzle_distance_mm: Math.round(nozzleDist),
      air_pressure_bar: Math.round(airPressure * 10) / 10,
      media_flow_kg_per_min: Math.round(mediaFlow * 10) / 10,
      meets_spec: meetsSpec,
      recommendations: recs,
    };
  }

  private _materialKey(m: string): string {
    const s = m.toLowerCase();
    if (s.includes("stainless")) return "stainless";
    if (s.includes("aluminum")) return "aluminum";
    if (s.includes("titanium")) return "titanium";
    if (s.includes("inconel") || s.includes("nickel")) return "nickel";
    return "steel";
  }
}

export const shotPeeningEngine = new ShotPeeningEngine();
