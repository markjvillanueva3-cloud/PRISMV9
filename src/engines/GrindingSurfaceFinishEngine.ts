/**
 * GrindingSurfaceFinishEngine — Surface roughness prediction for grinding operations
 *
 * Models: Kinematic roughness (Rth), spark-out correction, dressing influence,
 *         coolant factor, material-dependent elastic recovery
 * References: Malkin & Guo (2008), Shaw (2005), Rowe (2014), DIN 4768
 * Extends: Complements GrindingForceEngine (force/power) with surface quality prediction
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

export type GrindingMode =
  | "surface"
  | "cylindrical_external"
  | "cylindrical_internal"
  | "creep_feed"
  | "centerless";

/** Coolant Type type definition.
 */
export type CoolantType = "flood" | "mist" | "dry" | "cryogenic";
/** Dressing Condition type definition.
 */
export type DressingCondition = "sharp" | "medium" | "dull";
/** Wheel Bond Type type definition.
 */
export type WheelBondType = "vitrified" | "resinoid" | "metal" | "electroplated";

/** Grinding Surface Finish Input configuration/data structure.
 */
export interface GrindingSurfaceFinishInput {
  wheel_diameter_mm: number;
  wheel_speed_m_s: number;             // typically 25–45 m/s
  work_speed_m_min: number;            // table or peripheral speed
  depth_of_cut_mm: number;             // ae (infeed per pass)
  width_of_cut_mm: number;             // grinding width b
  grinding_mode: GrindingMode;
  workpiece_diameter_mm?: number;      // required for cylindrical modes
  grain_size_mesh?: number;            // e.g. 46, 60, 80, 120 (ANSI mesh)
  grain_density_per_mm2?: number;      // C (active grains), default by grain size
  dressing_condition?: DressingCondition; // default "medium"
  dressing_overlap_ratio?: number;     // Ud, typically 2–8, default 4
  spark_out_passes?: number;           // 0 = no spark-out, default 2
  coolant_type?: CoolantType;          // default "flood"
  wheel_bond?: WheelBondType;          // default "vitrified"
  workpiece_hardness_hrc?: number;     // for material factor estimation
  target_Ra_um?: number;               // desired Ra for pass/fail check
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Grinding Surface Finish Result configuration/data structure.
 */
export interface GrindingSurfaceFinishResult {
  predicted_Ra_um: AtomicValue;
  predicted_Rz_um: AtomicValue;
  kinematic_roughness_um: AtomicValue;
  spark_out_factor: number;
  dressing_factor: number;
  coolant_factor: number;
  material_factor: number;
  meets_target: boolean | null;        // null if no target specified
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Grain density C (grains/mm²) by mesh size — Malkin & Guo Table 5.2 */
const GRAIN_DENSITY_BY_MESH: Record<number, number> = {
  36: 1.5, 46: 2.5, 60: 4.0, 80: 6.0,
  100: 8.5, 120: 12.0, 150: 16.0, 180: 22.0,
  220: 30.0, 320: 50.0, 400: 70.0, 600: 100.0,
};

/** Mean grain radius (µm) by mesh size — derived from grit diameter */
const GRAIN_RADIUS_BY_MESH: Record<number, number> = {
  36: 40, 46: 30, 60: 22, 80: 16,
  100: 12, 120: 10, 150: 8, 180: 6,
  220: 5, 320: 3, 400: 2.5, 600: 1.5,
};

/** Spark-out reduction factor per pass — exponential decay */
const SPARK_OUT_DECAY = 0.55; // each pass reduces roughness by ~45%

/** Dressing overlap ratio (Ud) influence — higher Ud = smoother, slower */
const DRESSING_CONDITION_MULTIPLIER: Record<DressingCondition, number> = {
  sharp: 1.15,  // freshly dressed, slightly rougher (more aggressive)
  medium: 1.0,  // nominal
  dull: 0.88,   // worn wheel, lower roughness but risk of burn
};

/** Coolant influence on effective roughness */
const COOLANT_FACTOR: Record<CoolantType, number> = {
  flood: 0.90,     // best — flushes chips, prevents re-cutting
  cryogenic: 0.92, // good — but can cause thermal shock micro-cracks
  mist: 1.05,      // adequate but less chip clearance
  dry: 1.20,       // worst — chip re-cutting, loading
};

/** Material elastic recovery factor — softer materials spring back more */
function materialFactor(hrc?: number): number {
  if (hrc === undefined) return 1.0;
  if (hrc < 20) return 1.15;   // soft steel — high elastic recovery
  if (hrc < 35) return 1.05;
  if (hrc < 50) return 1.0;    // medium hardness — nominal
  if (hrc < 60) return 0.95;   // hard — less recovery, cleaner cut
  return 0.90;                  // very hard — best finish potential
}

/** Ra to Rz conversion — DIN 4768 empirical ratio */
const RA_TO_RZ_RATIO = 5.0; // Rz ≈ 5 × Ra for ground surfaces (range: 4–6)

/** Safety: burn risk threshold — dull wheel + dry = burn likely */
const BURN_RISK_THRESHOLD_UM = 0.1; // predicted Ra below this with dull wheel = suspect

// ─── Engine ────────────────────────────────────────────────────────

/** Grinding Surface Finish Engine engine/manager.
 */
export class GrindingSurfaceFinishEngine {
  /**
   * Predict surface roughness (Ra, Rz) for a grinding operation.
   *
   * Core model: kinematic roughness Rth from wheel geometry,
   * modified by dressing, spark-out, coolant, and material factors.
   *
   * Rth = (vw / (vs × C × r × ds))^0.5 × ae^0.25
   * Ra  = Rth × K_dress × K_sparkout × K_coolant × K_material
   */
  calculate(input: GrindingSurfaceFinishInput): GrindingSurfaceFinishResult {
    const recommendations: string[] = [];
    let isSafe = true;

    // ── Resolve grain parameters ──
    const meshSize = input.grain_size_mesh ?? 60;
    const closestMesh = this.closestMeshSize(meshSize);
    const C = input.grain_density_per_mm2 ?? GRAIN_DENSITY_BY_MESH[closestMesh] ?? 4.0;
    const rGrain_um = GRAIN_RADIUS_BY_MESH[closestMesh] ?? 15;
    const rGrain_mm = rGrain_um / 1000;

    // ── Convert speeds ──
    const vs_mm_s = input.wheel_speed_m_s * 1000;    // m/s → mm/s
    const vw_mm_s = input.work_speed_m_min * 1000 / 60; // m/min → mm/s
    const ae = input.depth_of_cut_mm;
    const ds = input.wheel_diameter_mm;

    // ── Speed ratio check ──
    const speedRatio = vs_mm_s / Math.max(vw_mm_s, 0.001);
    /** If.
     * @param speedRatio - speed ratio
     * @returns void
     */
    if (speedRatio < 40) {
      recommendations.push(`Speed ratio (vs/vw) = ${speedRatio.toFixed(0)} is low — recommend ≥60 for good finish`);
    }
    /** If.
     * @param speedRatio - speed ratio
     * @returns void
     */
    if (speedRatio > 200) {
      recommendations.push(`Speed ratio (vs/vw) = ${speedRatio.toFixed(0)} is very high — risk of wheel loading`);
    }

    // ── Kinematic roughness (Rth) — Malkin & Guo Eq. 5.18 ──
    // Rth models the theoretical peak-to-valley roughness from grain spacing
    const denominator = vs_mm_s * C * rGrain_mm * Math.sqrt(ds);
    const Rth_mm = denominator > 0
      ? Math.sqrt(vw_mm_s / denominator) * Math.pow(ae, 0.25)
      : 0.005; // fallback 5 µm
    const Rth_um = Rth_mm * 1000;

    // ── Contact arc geometry ──
    let effectiveDiameter = ds;
    /** If.
     * @param input.grinding_mode - input.grinding_mode
     * @returns void
     */
    if (input.grinding_mode === "cylindrical_external" && input.workpiece_diameter_mm) {
      effectiveDiameter = (ds * input.workpiece_diameter_mm) / (ds + input.workpiece_diameter_mm);
    } else if (input.grinding_mode === "cylindrical_internal" && input.workpiece_diameter_mm) {
      effectiveDiameter = (ds * input.workpiece_diameter_mm) / (input.workpiece_diameter_mm - ds);
    }
    // Mode correction factor — creep feed produces different surface than conventional
    const modeFactor = input.grinding_mode === "creep_feed" ? 0.80 : 1.0;

    // ── Correction factors ──
    const dressCond = input.dressing_condition ?? "medium";
    const K_dress = DRESSING_CONDITION_MULTIPLIER[dressCond];

    // Dressing overlap ratio influence — Ud > 4 reduces roughness
    const Ud = input.dressing_overlap_ratio ?? 4;
    const K_ud = Math.pow(4 / Math.max(Ud, 1), 0.3); // higher Ud → lower factor

    // Spark-out passes
    const sparkOutPasses = input.spark_out_passes ?? 2;
    const K_sparkout = Math.pow(SPARK_OUT_DECAY, sparkOutPasses);

    const coolantType = input.coolant_type ?? "flood";
    const K_coolant = COOLANT_FACTOR[coolantType];

    const K_material = materialFactor(input.workpiece_hardness_hrc);

    // ── Predicted Ra ──
    const Ra_um = Rth_um * K_dress * K_ud * K_sparkout * K_coolant * K_material * modeFactor;
    const Rz_um = Ra_um * RA_TO_RZ_RATIO;

    // ── Uncertainty estimation ──
    // Base uncertainty ~20% for kinematic model; improves with more data
    let uncertaintyPct = 0.20;
    if (input.grain_density_per_mm2 !== undefined) uncertaintyPct -= 0.03; // known C
    if (input.dressing_overlap_ratio !== undefined) uncertaintyPct -= 0.02; // known Ud
    if (input.workpiece_hardness_hrc !== undefined) uncertaintyPct -= 0.02; // known material
    const Ra_uncertainty = Ra_um * uncertaintyPct;
    const Rz_uncertainty = Rz_um * uncertaintyPct;
    const Rth_uncertainty = Rth_um * 0.15;

    // ── Safety checks ──
    /** If.
     * @param dressCond - dress cond
     * @returns void
     */
    if (dressCond === "dull" && coolantType === "dry") {
      recommendations.push("CRITICAL: Dull wheel + dry grinding — high burn risk. Dress wheel and add coolant.");
      isSafe = false;
    }
    /** If.
     * @param dressCond - dress cond
     * @returns void
     */
    if (dressCond === "dull" && Ra_um < BURN_RISK_THRESHOLD_UM * 10) {
      recommendations.push("WARNING: Very low predicted Ra with dull wheel — possible thermal damage masking actual roughness.");
    }
    /** If.
     * @param ae - ae
     * @returns void
     */
    if (ae > 0.05 && meshSize >= 120) {
      recommendations.push(`Fine wheel (${meshSize} mesh) with ${ae} mm DOC — risk of wheel loading. Reduce DOC to ≤0.02 mm.`);
    }
    /** If.
     * @param coolantType - coolant type
     * @returns void
     */
    if (coolantType === "dry" && ae > 0.03) {
      recommendations.push("Dry grinding with DOC > 0.03 mm — thermal damage risk. Add flood coolant or reduce DOC.");
    }

    // ── Improvement recommendations ──
    /** If.
     * @param sparkOutPasses - spark out passes
     * @returns void
     */
    if (sparkOutPasses === 0) {
      recommendations.push("Add 2–4 spark-out passes to improve finish by ~75%.");
    }
    /** If.
     * @param Ud - ud
     * @returns void
     */
    if (Ud < 3) {
      recommendations.push(`Dressing overlap Ud = ${Ud} is low — increase to 4–6 for better finish.`);
    }

    // ── Target comparison ──
    let meetsTarget: boolean | null = null;
    /** If.
     * @param input.target_Ra_um - input.target_ ra_um
     * @returns void
     */
    if (input.target_Ra_um !== undefined) {
      meetsTarget = Ra_um <= input.target_Ra_um;
      /** If.
       * @param !meetsTarget - !meets target
       * @returns void
       */
      if (!meetsTarget) {
        const deficit = ((Ra_um - input.target_Ra_um) / input.target_Ra_um * 100).toFixed(0);
        recommendations.push(
          `Predicted Ra ${Ra_um.toFixed(3)} µm exceeds target ${input.target_Ra_um} µm by ${deficit}%. ` +
          `Options: finer wheel, more spark-out passes, increase Ud, reduce work speed.`
        );
      }
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["grinding", "finishing"],
      operation_type: "grinding",
      hardness_hrc: input.workpiece_hardness_hrc,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      predicted_Ra_um: {
        value: Math.round(Ra_um * 1000) / 1000,
        unit: "µm",
        uncertainty: Math.round(Ra_uncertainty * 1000) / 1000,
        source: "Malkin kinematic roughness model with dressing/spark-out/coolant correction",
      },
      predicted_Rz_um: {
        value: Math.round(Rz_um * 1000) / 1000,
        unit: "µm",
        uncertainty: Math.round(Rz_uncertainty * 1000) / 1000,
        source: "Ra × 5.0 (DIN 4768 ground surface ratio)",
      },
      kinematic_roughness_um: {
        value: Math.round(Rth_um * 1000) / 1000,
        unit: "µm",
        uncertainty: Math.round(Rth_uncertainty * 1000) / 1000,
        source: "Malkin & Guo Eq. 5.18 — kinematic peak-to-valley",
      },
      spark_out_factor: Math.round(K_sparkout * 1000) / 1000,
      dressing_factor: Math.round((K_dress * K_ud) * 1000) / 1000,
      coolant_factor: K_coolant,
      material_factor: K_material,
      meets_target: meetsTarget,
      is_safe: isSafe,
      recommendations,
    };
  }

  // ─── Grinding Burn Temperature Threshold Model ───────────────────────
  // Reference: Malkin & Guo (2008) "Grinding Technology", Ch. 6
  //            Jaeger (1942) "Moving sources of heat"

  private static readonly BURN_THERMAL_DATA: Record<string, {k: number; rho: number; Cp: number; Ac1: number; temper_start: number}> = {
    'steel_4140':  { k: 42, rho: 7850, Cp: 475, Ac1: 727, temper_start: 500 },
    'steel_4340':  { k: 38, rho: 7850, Cp: 475, Ac1: 723, temper_start: 480 },
    'steel_52100': { k: 46, rho: 7810, Cp: 475, Ac1: 740, temper_start: 450 },
    'steel_m2_hss':{ k: 26, rho: 8160, Cp: 420, Ac1: 830, temper_start: 550 },
    'cast_iron':   { k: 50, rho: 7200, Cp: 500, Ac1: 750, temper_start: 500 },
    'inconel_718': { k: 11, rho: 8190, Cp: 435, Ac1: 950, temper_start: 700 },
  };

  private static readonly BURN_SPECIFIC_ENERGY: Record<string, number> = {
    'steel_4140': 40, 'steel_4340': 45, 'steel_52100': 50,
    'steel_m2_hss': 55, 'cast_iron': 30, 'inconel_718': 60, // J/mm³
  };

  private static readonly BURN_COOLANT_FACTOR: Record<string, number> = {
    flood: 0.6, mql: 0.8, dry: 1.0, cryogenic: 0.45,
  };

  /**
   * Assess grinding burn risk using contact zone temperature estimation.
   * Grinding burn occurs when contact temperature exceeds critical metallurgical thresholds:
   * - Tempering burn: 500-700°C → softening, tensile residual stress
   * - Rehardening burn: >723°C (Ac1 for steel) → untempered martensite, brittle
   *
   * Temperature model (Jaeger moving heat source):
   *   T_contact = T_ambient + (q_w × l_c) / (k × sqrt(π × Pe))
   *   where: q_w = specific grinding energy × material removal rate per unit width
   *          l_c = geometric contact length = sqrt(a × D_s)
   *          Pe = Peclet number = V_w × l_c / (4 × α)
   *          α = thermal diffusivity = k/(ρ×Cp)
   *
   * Reference: Malkin & Guo (2008) "Grinding Technology", Ch. 6
   *            Jaeger (1942) "Moving sources of heat"
   */
  assessBurnRisk(input: {
    material: string;
    wheel_speed_mps: number;
    work_speed_mm_per_min: number;
    depth_of_cut_mm: number;
    wheel_diameter_mm: number;
    specific_energy_J_per_mm3?: number;
    coolant: 'flood' | 'mql' | 'dry' | 'cryogenic';
  }): {
    contact_temp_C: number;
    burn_risk: 'none' | 'low' | 'tempering' | 'rehardening' | 'severe';
    threshold_tempering_C: number;
    threshold_rehardening_C: number;
    margin_C: number;
    specific_energy_used: number;
    contact_length_mm: number;
    peclet_number: number;
    recommendations: string[];
    barkhausen_noise_expected: 'pass' | 'marginal' | 'fail';
  } {
    const mat = GrindingSurfaceFinishEngine.BURN_THERMAL_DATA[input.material];
    if (!mat) {
      throw new Error(`Unknown material '${input.material}'. Supported: ${Object.keys(GrindingSurfaceFinishEngine.BURN_THERMAL_DATA).join(', ')}`);
    }

    const u = input.specific_energy_J_per_mm3
      ?? GrindingSurfaceFinishEngine.BURN_SPECIFIC_ENERGY[input.material]
      ?? 45;
    const coolantFactor = GrindingSurfaceFinishEngine.BURN_COOLANT_FACTOR[input.coolant] ?? 1.0;

    const a = input.depth_of_cut_mm;          // mm
    const Ds = input.wheel_diameter_mm;        // mm
    const Vw = input.work_speed_mm_per_min / 1000 / 60; // mm/min → m/s
    const Vs = input.wheel_speed_mps;          // m/s

    // Geometric contact length: l_c = sqrt(a × D_s) [mm]
    const l_c = Math.sqrt(a * Ds);

    // Thermal diffusivity: α = k / (ρ × Cp) [m²/s → mm²/s conversion: k in W/mK, ρ in kg/m³, Cp in J/kgK]
    // α [m²/s] = k / (ρ × Cp), convert to mm²/s: multiply by 1e6
    const alpha_mm2_s = (mat.k / (mat.rho * mat.Cp)) * 1e6;

    // Peclet number: Pe = V_w × l_c / (4 × α)
    // V_w in m/s → mm/s: multiply by 1000
    const Vw_mm_s = input.work_speed_mm_per_min / 60;
    const Pe = (Vw_mm_s * l_c) / (4 * alpha_mm2_s);

    // Specific material removal rate per unit width: Q'w = a × Vw [mm²/s]
    const Qw_prime = a * Vw_mm_s; // mm²/s

    // Heat flux to workpiece: q_w = u × Q'w × coolant_factor [W/mm]
    // u in J/mm³, Q'w in mm²/s → q_w in W/mm
    const q_w = u * Qw_prime * coolantFactor;

    // Jaeger moving heat source: T_contact = T_ambient + (q_w × l_c) / (k_mm × sqrt(π × Pe))
    // k in W/(m·K) → W/(mm·K): divide by 1000
    const k_mm = mat.k / 1000;
    const T_ambient = 25;
    const T_contact = T_ambient + (q_w * l_c) / (k_mm * Math.sqrt(Math.PI * Math.max(Pe, 0.001)));

    // Burn risk classification
    const tempering_threshold = mat.temper_start;
    const rehardening_threshold = mat.Ac1;
    const severe_threshold = rehardening_threshold + 100;

    let burn_risk: 'none' | 'low' | 'tempering' | 'rehardening' | 'severe';
    if (T_contact >= severe_threshold) {
      burn_risk = 'severe';
    } else if (T_contact >= rehardening_threshold) {
      burn_risk = 'rehardening';
    } else if (T_contact >= tempering_threshold) {
      burn_risk = 'tempering';
    } else if (T_contact >= tempering_threshold * 0.85) {
      burn_risk = 'low';
    } else {
      burn_risk = 'none';
    }

    // Margin below nearest dangerous threshold
    const margin = tempering_threshold - T_contact;

    // Barkhausen noise prediction
    let barkhausen: 'pass' | 'marginal' | 'fail';
    if (T_contact >= rehardening_threshold) {
      barkhausen = 'fail';
    } else if (T_contact >= tempering_threshold * 0.9) {
      barkhausen = 'marginal';
    } else {
      barkhausen = 'pass';
    }

    // Recommendations
    const recommendations: string[] = [];
    if (burn_risk === 'severe' || burn_risk === 'rehardening') {
      recommendations.push('CRITICAL: Reduce depth of cut immediately — rehardening burn causes brittle untempered martensite');
      recommendations.push(`Reduce a_e from ${a.toFixed(3)}mm to <${(a * tempering_threshold / T_contact).toFixed(3)}mm`);
      if (input.coolant !== 'flood' && input.coolant !== 'cryogenic') {
        recommendations.push('Switch to flood coolant or cryogenic cooling');
      }
      recommendations.push('Increase work speed to reduce contact time');
      recommendations.push('Consider continuous-dress creep-feed (CDCF) for thermal management');
    } else if (burn_risk === 'tempering') {
      recommendations.push('WARNING: Tempering burn zone — softening and tensile residual stress likely');
      recommendations.push(`Reduce depth of cut by ${Math.round((1 - tempering_threshold / T_contact) * 100)}%`);
      if (input.coolant === 'dry' || input.coolant === 'mql') {
        recommendations.push('Switch to flood coolant for better heat extraction');
      }
      recommendations.push('Dress wheel more frequently to maintain sharpness (reduces specific energy)');
    } else if (burn_risk === 'low') {
      recommendations.push('Near tempering threshold — monitor Barkhausen noise or etch inspection');
      recommendations.push('Maintain wheel sharpness with regular dressing');
    } else {
      recommendations.push('Operating within safe thermal limits');
    }

    if (input.material === 'inconel_718') {
      recommendations.push('Inconel: Use ceramic or CBN wheels; high specific energy demands aggressive cooling');
    }

    return {
      contact_temp_C: Math.round(T_contact * 10) / 10,
      burn_risk,
      threshold_tempering_C: tempering_threshold,
      threshold_rehardening_C: rehardening_threshold,
      margin_C: Math.round(margin * 10) / 10,
      specific_energy_used: u,
      contact_length_mm: Math.round(l_c * 1000) / 1000,
      peclet_number: Math.round(Pe * 1000) / 1000,
      recommendations,
      barkhausen_noise_expected: barkhausen,
    };
  }

  /** Find closest standard mesh size */
  private closestMeshSize(mesh: number): number {
    const sizes = Object.keys(GRAIN_DENSITY_BY_MESH).map(Number);
    return sizes.reduce((prev, curr) =>
      Math.abs(curr - mesh) < Math.abs(prev - mesh) ? curr : prev
    );
  }
}

/** Grinding Surface Finish Engine constant.
 */
export const grindingSurfaceFinishEngine = new GrindingSurfaceFinishEngine();
