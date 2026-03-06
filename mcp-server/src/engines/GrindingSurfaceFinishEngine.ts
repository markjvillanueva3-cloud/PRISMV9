/**
 * GrindingSurfaceFinishEngine — Surface roughness prediction for grinding operations
 *
 * Models: Kinematic roughness (Rth), spark-out correction, dressing influence,
 *         coolant factor, material-dependent elastic recovery
 * References: Malkin & Guo (2008), Shaw (2005), Rowe (2014), DIN 4768
 * Extends: Complements GrindingForceEngine (force/power) with surface quality prediction
 */

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
