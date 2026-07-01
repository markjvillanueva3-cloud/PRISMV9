/**
 * PartOffForceEngine — Parting/Cutoff Force Calculator
 *
 * Calculates cutting forces, power, and stress for parting (cutoff)
 * operations on lathes. Parting is one of the most demanding turning
 * operations due to poor chip evacuation and high blade stress.
 *
 * References:
 *   Kienzle force model adapted for parting geometry
 *   Sandvik Coromant "Parting and Grooving" handbook
 *   Machinery's Handbook, 31st Ed., Turning chapter
 *
 * Actions: part_off_force
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PartOffInput {
  bar_diameter_mm: number;         // OD of workpiece (or tube OD)
  bore_diameter_mm: number;        // ID if tube (0 for solid bar)
  blade_width_mm: number;          // insert/blade width (typically 2-6mm)
  feed_per_rev_mm: number;         // fn — typically 0.05-0.15 for parting
  cutting_speed_m_min: number;     // Vc at the OD
  material: string;
  material_hardness_HRC: number;
}

/** Part Off Result configuration/data structure.
 */
export interface PartOffResult {
  tangential_force_N: number;      // Fc — main cutting force
  feed_force_N: number;            // Ff — radial (into workpiece)
  radial_force_N: number;          // Fp — axial along blade
  total_force_N: number;           // resultant
  cutting_power_kW: number;
  max_blade_stress_MPa: number;
  blade_deflection_um: number;
  estimated_time_s: number;
  min_bar_remnant_mm: number;      // minimum stub left after cutoff
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Specific cutting force kc1.1 (N/mm²) for parting at h=1mm chip thickness.
 * Parting uses higher kc than regular turning due to restricted chip flow.
 * Values are ~15% higher than standard turning kc1.1.
 * Source: Sandvik parting application data + Kienzle tables
 */
const KC_PARTING: Record<string, { kc11: number; mc: number }> = {
  steel:       { kc11: 2200, mc: 0.26 },
  stainless:   { kc11: 2100, mc: 0.25 },
  aluminum:    { kc11: 700,  mc: 0.23 },
  cast_iron:   { kc11: 1100, mc: 0.28 },
  titanium:    { kc11: 2800, mc: 0.28 },
  inconel:     { kc11: 2800, mc: 0.28 },
  copper:      { kc11: 700,  mc: 0.23 },
  brass:       { kc11: 700,  mc: 0.23 },
  carbon_steel:{ kc11: 1800, mc: 0.25 },
  alloy_steel: { kc11: 2400, mc: 0.26 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Part Off Force Engine engine/manager.
 */
export class PartOffForceEngine {
  calculate(input: PartOffInput): PartOffResult {
    const { bar_diameter_mm: OD, bore_diameter_mm: ID, blade_width_mm: w, feed_per_rev_mm: fn } = input;

    if (OD <= 0) throw new Error("Bar diameter must be positive");
    if (ID < 0 || ID >= OD) throw new Error("Bore diameter must be 0 (solid) or less than OD");
    if (w <= 0) throw new Error("Blade width must be positive");
    if (fn <= 0) throw new Error("Feed per rev must be positive");

    const matKey = this._materialKey(input.material);
    const kcData = KC_PARTING[matKey] ?? KC_PARTING.steel;

    // Kienzle: kc = kc1.1 × h^(-mc), where h = fn for parting
    const kc = kcData.kc11 * Math.pow(fn, -kcData.mc);

    // Hardness correction: +1.5% per HRC above 30
    const hardnessCorr = input.material_hardness_HRC > 30
      ? 1 + (input.material_hardness_HRC - 30) * 0.015
      : 1.0;

    // Chip cross section: ap (depth of cut) = blade_width, h = feed
    // For parting, the "depth of cut" is the blade width
    const chipArea = w * fn; // mm²

    // Tangential force (main cutting force)
    const Fc = kc * chipArea * hardnessCorr;

    // Feed force (radial, into workpiece) ≈ 40-60% of Fc for parting
    const Ff = Fc * 0.50;

    // Radial force (axial, along blade) ≈ 20-30% of Fc
    const Fp = Fc * 0.25;

    // Resultant force
    const Ftotal = Math.sqrt(Fc ** 2 + Ff ** 2 + Fp ** 2);

    // Cutting power
    const Vc = input.cutting_speed_m_min;
    const power_kW = (Fc * Vc) / (60 * 1000);

    // Blade stress: simplified beam model
    // Blade overhang ≈ bar_radius for worst case (cutting at center)
    const overhang = (OD - ID) / 2; // radial cutting distance
    // Blade cross section: width × typical blade thickness (assume 3mm thick for standard inserts)
    const bladeThickness = Math.max(2, w * 0.8); // mm
    const momentOfInertia = (bladeThickness * w ** 3) / 12;
    const bendingMoment = Fc * overhang / 2; // N·mm
    const stress = (bendingMoment * (w / 2)) / momentOfInertia; // MPa

    // Blade deflection (cantilever beam approximation)
    const E_blade = 600000; // MPa (carbide insert, approximate)
    const deflection_mm = (Fc * overhang ** 3) / (3 * E_blade * momentOfInertia);
    const deflection_um = deflection_mm * 1000;

    // Cycle time: time to cut from OD to ID (or center)
    const rpm = (Vc * 1000) / (Math.PI * OD);
    const cutDistance = (OD - ID) / 2; // radial distance to cut
    const feedRate = fn * rpm; // mm/min
    const timeS = (cutDistance / feedRate) * 60;

    // Minimum bar remnant (stub): at least 1mm or blade_width
    const minRemnant = Math.max(1.0, w * 0.5);

    // Recommendations
    const recs: string[] = [];
    /** If.
     * @param fn - callback function
     * @returns void
     */
    if (fn > 0.15) {
      recs.push("Feed > 0.15mm/rev — high for parting; risk of insert chipping. Reduce to 0.08-0.12.");
    }
    /** If.
     * @param OD - o d
     * @returns void
     */
    if (OD > 60 && w < 3) {
      recs.push("Large bar (>60mm) with narrow blade (<3mm) — risk of blade breakage. Use wider insert.");
    }
    /** If.
     * @param stress - stress
     * @returns void
     */
    if (stress > 800) {
      recs.push(`High blade stress (${Math.round(stress)} MPa) — reduce feed or use wider/thicker blade`);
    }
    /** If.
     * @param deflection_um - deflection_um
     * @returns void
     */
    if (deflection_um > 50) {
      recs.push(`Blade deflection ${Math.round(deflection_um)}µm — may affect surface finish and dimensional accuracy`);
    }
    /** If.
     * @param Vc - vc
     * @returns void
     */
    if (Vc > 150 && matKey === "steel") {
      recs.push("Cutting speed > 150 m/min for steel parting — risk of built-up edge and poor chip control");
    }
    /** If.
     * @param matKey - mat key
     * @returns void
     */
    if (matKey === "stainless" || matKey === "titanium" || matKey === "inconel") {
      recs.push(`${matKey}: use positive rake insert with chipbreaker; flood coolant essential for chip evacuation`);
    }
    if (ID > 0 && (OD - ID) / 2 < w * 2) {
      recs.push("Thin wall parting — reduce feed 30-40% to prevent wall deformation");
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Parting parameters within normal range — proceed");
    }

    return {
      tangential_force_N: Math.round(Fc),
      feed_force_N: Math.round(Ff),
      radial_force_N: Math.round(Fp),
      total_force_N: Math.round(Ftotal),
      cutting_power_kW: Math.round(power_kW * 100) / 100,
      max_blade_stress_MPa: Math.round(stress),
      blade_deflection_um: Math.round(deflection_um * 10) / 10,
      estimated_time_s: Math.round(timeS * 10) / 10,
      min_bar_remnant_mm: minRemnant,
      recommendations: recs,
    };
  }

  private _materialKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("stainless")) return "stainless";
    if (m.includes("aluminum") || m.includes("aluminium")) return "aluminum";
    if (m.includes("cast") && m.includes("iron")) return "cast_iron";
    if (m.includes("titanium")) return "titanium";
    if (m.includes("inconel") || m.includes("718")) return "inconel";
    if (m.includes("copper")) return "copper";
    if (m.includes("brass")) return "brass";
    if (m.includes("alloy")) return "alloy_steel";
    if (m.includes("carbon") && m.includes("steel")) return "carbon_steel";
    return "steel";
  }
}

/** Part Off Force Engine constant.
 */
export const partOffForceEngine = new PartOffForceEngine();
