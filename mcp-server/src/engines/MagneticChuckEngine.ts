/**
 * MagneticChuckEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates magnetic chuck holding force for surface grinding,
 * milling, and EDM. Models electropermanent and permanent magnet
 * chucks. Accounts for part geometry, material permeability,
 * air gap, and cutting forces.
 *
 * *** SAFETY CRITICAL *** — insufficient holding force causes
 * workpiece ejection at grinding wheel speed.
 *
 * Actions: magnetic_chuck_force, magnetic_chuck_validate, magnetic_chuck_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type ChuckType = "permanent" | "electropermanent" | "electromagnetic";

export interface MagneticChuckInput {
  chuck_type: ChuckType;
  chuck_pull_force_N_per_cm2: number;  // rated pull force
  workpiece_length_mm: number;
  workpiece_width_mm: number;
  workpiece_thickness_mm: number;
  workpiece_material: string;
  workpiece_weight_N: number;
  contact_area_pct: number;            // % of bottom face contacting chuck (100% for flat)
  cutting_force_tangential_N: number;
  cutting_force_normal_N: number;
  operation: "surface_grinding" | "milling" | "edm_sinker" | "inspection";
  surface_roughness_Ra_um: number;     // of contact face
}

export interface MagneticChuckResult {
  holding_force_N: number;
  required_force_N: number;
  safety_factor: number;
  is_safe: boolean;
  effective_contact_area_cm2: number;
  permeability_factor: number;
  air_gap_derating: number;
  max_allowable_cutting_force_N: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Relative permeability factor (magnetic steels ≈ 1.0, non-magnetic ≈ 0)
const PERMEABILITY: Record<string, number> = {
  carbon_steel: 1.0,
  alloy_steel: 0.95,
  cast_iron: 0.85,
  "400_stainless": 0.70,    // ferritic/martensitic
  "300_stainless": 0.05,    // austenitic — essentially non-magnetic
  aluminum: 0.0,
  titanium: 0.0,
  brass: 0.0,
  nickel_alloy: 0.10,
};

// Required safety factors by operation
const REQUIRED_SF: Record<MagneticChuckInput["operation"], number> = {
  surface_grinding: 3.0,     // high — wheel speed ejection risk
  milling: 2.5,
  edm_sinker: 1.5,           // low forces
  inspection: 1.2,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MagneticChuckEngine {
  calculate(input: MagneticChuckInput): MagneticChuckResult {
    // Material permeability
    const permKey = this._materialKey(input.workpiece_material);
    const permFactor = PERMEABILITY[permKey] ?? 0.5;

    // Effective contact area
    const totalArea = (input.workpiece_length_mm * input.workpiece_width_mm) / 100; // cm²
    const effectiveArea = totalArea * (input.contact_area_pct / 100);

    // Air gap derating (surface roughness creates air gap)
    const airGapDerating = input.surface_roughness_Ra_um < 1.6 ? 1.0
      : input.surface_roughness_Ra_um < 3.2 ? 0.85
      : input.surface_roughness_Ra_um < 6.3 ? 0.65
      : 0.45;

    // Thickness derating (thin parts don't carry full flux)
    const thicknessDerating = input.workpiece_thickness_mm >= 10 ? 1.0
      : input.workpiece_thickness_mm >= 5 ? 0.80
      : input.workpiece_thickness_mm >= 3 ? 0.60
      : 0.40;

    // Holding force
    const holdingForce = input.chuck_pull_force_N_per_cm2 * effectiveArea *
      permFactor * airGapDerating * thicknessDerating;

    // Required force (cutting force + weight component)
    const requiredSF = REQUIRED_SF[input.operation];
    const totalCuttingForce = Math.sqrt(
      input.cutting_force_tangential_N ** 2 + input.cutting_force_normal_N ** 2
    );
    const requiredForce = (totalCuttingForce + input.workpiece_weight_N * 0.2) * requiredSF;

    const sf = holdingForce / Math.max(requiredForce / requiredSF, 1);
    const isSafe = sf >= requiredSF;

    // Max allowable cutting force at minimum safe SF
    const maxCuttingForce = (holdingForce / requiredSF) - input.workpiece_weight_N * 0.2;

    const recs: string[] = [];
    if (permFactor < 0.1) {
      recs.push(`${input.workpiece_material} is non-magnetic — magnetic chuck CANNOT hold this material`);
    }
    if (!isSafe) {
      recs.push(`Safety factor ${sf.toFixed(1)} below required ${requiredSF} — UNSAFE, use mechanical clamping`);
    }
    if (airGapDerating < 0.7) {
      recs.push(`Surface roughness Ra ${input.surface_roughness_Ra_um}µm reduces holding by ${((1 - airGapDerating) * 100).toFixed(0)}% — grind contact face`);
    }
    if (thicknessDerating < 0.7) {
      recs.push(`Thin part (${input.workpiece_thickness_mm}mm) reduces holding by ${((1 - thicknessDerating) * 100).toFixed(0)}% — consider pole extension`);
    }
    if (input.contact_area_pct < 50) {
      recs.push("Low contact area — use filler blocks or magnetic parallels to maximize contact");
    }
    if (recs.length === 0) recs.push("Magnetic holding force adequate — proceed");

    return {
      holding_force_N: Math.round(holdingForce),
      required_force_N: Math.round(requiredForce),
      safety_factor: Math.round(sf * 100) / 100,
      is_safe: isSafe,
      effective_contact_area_cm2: Math.round(effectiveArea * 100) / 100,
      permeability_factor: permFactor,
      air_gap_derating: airGapDerating,
      max_allowable_cutting_force_N: Math.round(Math.max(0, maxCuttingForce)),
      recommendations: recs,
    };
  }

  private _materialKey(m: string): string {
    const s = m.toLowerCase();
    if (s.includes("304") || s.includes("316") || s.includes("austenitic") || s.includes("300")) return "300_stainless";
    if (s.includes("410") || s.includes("430") || s.includes("ferritic") || s.includes("400")) return "400_stainless";
    if (s.includes("aluminum") || s.includes("aluminium")) return "aluminum";
    if (s.includes("titanium")) return "titanium";
    if (s.includes("brass") || s.includes("bronze") || s.includes("copper")) return "brass";
    if (s.includes("inconel") || s.includes("nickel")) return "nickel_alloy";
    if (s.includes("cast iron") || s.includes("cast_iron")) return "cast_iron";
    if (s.includes("alloy")) return "alloy_steel";
    return "carbon_steel";
  }
}

export const magneticChuckEngine = new MagneticChuckEngine();
