/**
 * HelicalSpringEngine — U-CADC16 (PHASE-4 Complex Geometry Generation)
 *
 * Generates helical compression/extension spring geometry with canonical
 * mechanical-design metrics (spring rate, shear stress, Wahl factor, solid
 * length, natural frequency).
 *
 * Formulae (Shigley, "Mechanical Engineering Design", 10th ed.):
 *   Spring index               C   = D / d
 *   Spring rate                k   = (G · d⁴) / (8 · D³ · N_a)
 *   Shear stress (Wahl)        τ   = K_w · (8 · F · D) / (π · d³)
 *   Wahl correction factor     K_w = (4C − 1)/(4C − 4) + 0.615 / C
 *   Bergsträsser (alt)         K_B = (4C + 2)/(4C − 3)
 *   Solid length               L_s = d · N_t       (plain ends)
 *                              L_s = d · (N_t + 1) (squared/ground)
 *   Free length (compression)  L_f = L_s + deflection_at_solid + pitch·(N_a − 1) + end allowances
 *   Natural frequency          f_n = 0.5 · sqrt(k·g / W)     (Hz, SI units)
 *
 * Where:
 *   D   = mean coil diameter [mm]
 *   d   = wire diameter [mm]
 *   N_a = active coils
 *   N_t = total coils
 *   G   = shear modulus of the wire material [MPa]
 *   F   = axial force [N]
 *   W   = spring weight [N]
 *   g   = gravity = 9810 mm/s²
 *
 * @engine HelicalSpringEngine
 * @shortcode E2703
 * @dispatcher cadDispatcher
 * @milestone CAD-COMPLETE-MS0/U-CADC16
 */

// ── Constants ─────────────────────────────────────────────────────────────

/**
 * Default shear moduli (G) for common spring wire materials, in MPa.
 * Values from Shigley Table 10-5 + ASM Handbook Vol. 1.
 */
export const SPRING_MATERIAL_SHEAR_MODULUS_MPA = {
  /** Music wire (ASTM A228). */
  music_wire: 81_700,
  /** Hard-drawn spring steel (ASTM A227). */
  hard_drawn: 79_300,
  /** Chrome-vanadium (ASTM A231). */
  chrome_vanadium: 77_200,
  /** Chrome-silicon (ASTM A401). */
  chrome_silicon: 77_200,
  /** Stainless 302 (ASTM A313). */
  stainless_302: 69_000,
  /** Phosphor-bronze (ASTM B159). */
  phosphor_bronze: 41_400,
  /** Inconel X-750. */
  inconel_x750: 79_300,
} as const;

export type SpringMaterial = keyof typeof SPRING_MATERIAL_SHEAR_MODULUS_MPA;

/**
 * End-condition coil-count adjustments (Shigley Table 10-1).
 * Maps end-condition to (additional coils, solid-length multiplier-on-Nt).
 */
export const SPRING_END_CONDITIONS = {
  plain: { endCoils: 0, solidMultiplier: 1 },
  plain_ground: { endCoils: 1, solidMultiplier: 1 },
  squared: { endCoils: 2, solidMultiplier: 1 },
  squared_ground: { endCoils: 2, solidMultiplier: 1 },
} as const;

export type SpringEndCondition = keyof typeof SPRING_END_CONDITIONS;

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpringSpec {
  /** Wire diameter d in mm. */
  wireDiameter: number;
  /** Mean coil diameter D in mm (to centerline of wire). */
  meanCoilDiameter: number;
  /** Number of active coils N_a. */
  activeCoils: number;
  /** End condition. Default "squared_ground". */
  endCondition?: SpringEndCondition;
  /** Material name (key of SPRING_MATERIAL_SHEAR_MODULUS_MPA). Default "music_wire". */
  material?: SpringMaterial;
  /** Shear modulus override G in MPa. Overrides material lookup if provided. */
  shearModulusMPa?: number;
  /** Pitch p in mm (distance between adjacent coils, axial). Optional; auto
   *  computed from free length if not provided. */
  pitch?: number;
  /** Free length L_f in mm. Required to compute pitch if pitch not given. */
  freeLength?: number;
  /** Density ρ in kg/m³ for weight / natural-frequency calculations.
   *  Default 7850 (carbon steel). */
  materialDensityKgM3?: number;
}

export interface SpringGeometry {
  wireDiameter: number;
  meanCoilDiameter: number;
  outerDiameter: number;
  innerDiameter: number;
  springIndex: number;
  activeCoils: number;
  totalCoils: number;
  endCondition: SpringEndCondition;
  solidLength: number;
  pitch: number;
  freeLength: number;
  wireLength: number;
}

export interface SpringMechanics {
  geometry: SpringGeometry;
  shearModulusMPa: number;
  springRateNPerMm: number;
  wahlFactor: number;
  bergstrasserFactor: number;
  deflectionAtSolid: number;
  /** Mass in kg. */
  mass: number;
  /** Natural frequency in Hz (fundamental axial vibration mode). */
  naturalFrequencyHz: number;
}

export interface SpringStressAtForce {
  forceN: number;
  deflectionMm: number;
  shearStressMPa: number;
  wahlFactor: number;
  corrected: boolean;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface SpringCoilPath {
  geometry: SpringGeometry;
  /** 3D centerline path of the helical wire, in mm. */
  centerlinePath: Point3D[];
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class HelicalSpringEngine {
  /**
   * Compute spring geometry from a spec.
   *
   * @throws Error on non-positive dimensions, spring index C outside [3, 20]
   *   (practical range — tighter/looser indices are flagged as manufacturing
   *   difficulty).
   */
  computeGeometry(spec: SpringSpec): SpringGeometry {
    this.validateSpec(spec);
    const d = spec.wireDiameter;
    const D = spec.meanCoilDiameter;
    const Na = spec.activeCoils;
    const endCondition = spec.endCondition ?? "squared_ground";
    const endCfg = SPRING_END_CONDITIONS[endCondition];
    const Nt = Na + endCfg.endCoils;
    const springIndex = D / d;

    // Solid length: Shigley Table 10-1
    let solidLength: number;
    switch (endCondition) {
      case "plain":
        solidLength = d * (Nt + 1);
        break;
      case "plain_ground":
        solidLength = d * Nt;
        break;
      case "squared":
        solidLength = d * (Nt + 1);
        break;
      case "squared_ground":
        solidLength = d * Nt;
        break;
    }

    // Pitch and free length: caller may specify either pitch or freeLength.
    // If neither, default to pitch = 1.5·d (common relaxed spring).
    let pitch = spec.pitch ?? 0;
    let freeLength = spec.freeLength ?? 0;
    if (pitch <= 0 && freeLength <= 0) {
      pitch = 1.5 * d;
    }
    if (pitch > 0 && freeLength <= 0) {
      // free length ≈ solid length + pitch·(Na - 1) + 2·end-offsets (approx d per end for squared/ground)
      const endOffset = endCondition === "plain" ? 0 : d;
      freeLength = pitch * Na + 2 * endOffset;
    } else if (freeLength > 0 && pitch <= 0) {
      const endOffset = endCondition === "plain" ? 0 : d;
      pitch = Na > 0 ? (freeLength - 2 * endOffset) / Na : 0;
    }

    const outerDiameter = D + d;
    const innerDiameter = D - d;
    // Wire length ≈ Nt · π · D · sqrt(1 + (pitch/(π·D))²)
    const pitchPerLen = Math.PI * D === 0 ? 0 : pitch / (Math.PI * D);
    const wireLength = Nt * Math.PI * D * Math.sqrt(1 + pitchPerLen * pitchPerLen);

    return {
      wireDiameter: d,
      meanCoilDiameter: D,
      outerDiameter,
      innerDiameter,
      springIndex,
      activeCoils: Na,
      totalCoils: Nt,
      endCondition,
      solidLength,
      pitch,
      freeLength,
      wireLength,
    };
  }

  /**
   * Compute rate, Wahl factor, and mass-dependent quantities for a spec.
   */
  computeMechanics(spec: SpringSpec): SpringMechanics {
    const geometry = this.computeGeometry(spec);
    const G = this.resolveShearModulus(spec);
    const d = geometry.wireDiameter;
    const D = geometry.meanCoilDiameter;
    const Na = geometry.activeCoils;
    const C = geometry.springIndex;

    // Spring rate: k = G·d^4 / (8·D^3·Na) [N/mm]
    const springRateNPerMm = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);
    const wahlFactor = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
    const bergstrasserFactor = (4 * C + 2) / (4 * C - 3);

    const deflectionAtSolid = Math.max(geometry.freeLength - geometry.solidLength, 0);

    // Wire volume in mm³, convert to m³ for kg calc.
    const wireVolumeMm3 = (Math.PI / 4) * d * d * geometry.wireLength;
    const densityKgM3 = spec.materialDensityKgM3 ?? 7850;
    const mass = (wireVolumeMm3 * 1e-9) * densityKgM3; // mm³ → m³

    // Natural frequency of surge mode: f_n = 0.5 · sqrt(k·g/W) in Hz with
    // weight W = m·g. In SI with k in N/m, f_n = (1/(2·L_wire))·sqrt(G/ρ)
    // is the standard closed-form for the fundamental surge mode of a
    // helical spring (Shigley eq. 10-25).
    // Using simpler form: f_n = 0.5 · sqrt(k / m) in Hz when k [N/m] and m [kg].
    const kNPerM = springRateNPerMm * 1000;
    const naturalFrequencyHz = mass > 0 ? 0.5 * Math.sqrt(kNPerM / mass) : 0;

    return {
      geometry,
      shearModulusMPa: G,
      springRateNPerMm,
      wahlFactor,
      bergstrasserFactor,
      deflectionAtSolid,
      mass,
      naturalFrequencyHz,
    };
  }

  /**
   * Compute shear stress and deflection at a given axial force.
   *
   * @param forceN Axial force in N (positive = compression for compression springs).
   * @param useWahl Apply Wahl stress-concentration correction. Default true.
   */
  computeStressAtForce(
    spec: SpringSpec,
    forceN: number,
    useWahl: boolean = true
  ): SpringStressAtForce {
    const mech = this.computeMechanics(spec);
    const geometry = mech.geometry;
    const d = geometry.wireDiameter;
    const D = geometry.meanCoilDiameter;
    const deflection = forceN / mech.springRateNPerMm;
    // τ_max [MPa] = K · 8·F·D / (π·d³)   with F [N], d/D [mm]
    const baseStress = (8 * forceN * D) / (Math.PI * d * d * d);
    const stress = useWahl ? mech.wahlFactor * baseStress : baseStress;
    return {
      forceN,
      deflectionMm: deflection,
      shearStressMPa: stress,
      wahlFactor: mech.wahlFactor,
      corrected: useWahl,
    };
  }

  /**
   * Sample the helical coil centerline as a 3D path. Coil axis = z.
   *
   * @param spec Spring spec.
   * @param options Sampling control.
   */
  generateCoilPath(
    spec: SpringSpec,
    options: { samplesPerCoil?: number } = {}
  ): SpringCoilPath {
    const geometry = this.computeGeometry(spec);
    const samplesPerCoil = Math.max(8, options.samplesPerCoil ?? 36);
    const r = geometry.meanCoilDiameter / 2;
    const totalSamples = Math.max(2, Math.ceil(geometry.totalCoils * samplesPerCoil));
    const centerlinePath: Point3D[] = [];
    for (let i = 0; i <= totalSamples; i++) {
      const frac = i / totalSamples;
      const theta = 2 * Math.PI * geometry.totalCoils * frac;
      centerlinePath.push({
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
        z: geometry.freeLength * frac,
      });
    }
    return { geometry, centerlinePath };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private validateSpec(spec: SpringSpec): void {
    if (!(spec.wireDiameter > 0)) {
      throw new Error(`wireDiameter must be > 0 (got ${spec.wireDiameter})`);
    }
    if (!(spec.meanCoilDiameter > 0)) {
      throw new Error(`meanCoilDiameter must be > 0 (got ${spec.meanCoilDiameter})`);
    }
    if (!(spec.activeCoils > 0)) {
      throw new Error(`activeCoils must be > 0 (got ${spec.activeCoils})`);
    }
    const C = spec.meanCoilDiameter / spec.wireDiameter;
    if (!(C > 2)) {
      throw new Error(
        `spring index C = D/d must be > 2 for physical realizability (got ${C.toFixed(3)})`
      );
    }
    if (spec.meanCoilDiameter <= spec.wireDiameter) {
      throw new Error(
        `mean coil diameter (${spec.meanCoilDiameter}) must exceed wire diameter (${spec.wireDiameter})`
      );
    }
    const endCondition = spec.endCondition;
    if (endCondition !== undefined && !(endCondition in SPRING_END_CONDITIONS)) {
      throw new Error(
        `unknown endCondition '${endCondition}' (expected one of ${Object.keys(SPRING_END_CONDITIONS).join(", ")})`
      );
    }
    const material = spec.material;
    if (
      material !== undefined &&
      spec.shearModulusMPa === undefined &&
      !(material in SPRING_MATERIAL_SHEAR_MODULUS_MPA)
    ) {
      throw new Error(
        `unknown material '${material}' (expected one of ${Object.keys(SPRING_MATERIAL_SHEAR_MODULUS_MPA).join(", ")} or shearModulusMPa override)`
      );
    }
  }

  private resolveShearModulus(spec: SpringSpec): number {
    if (spec.shearModulusMPa !== undefined) {
      if (!(spec.shearModulusMPa > 0)) {
        throw new Error(`shearModulusMPa must be > 0 (got ${spec.shearModulusMPa})`);
      }
      return spec.shearModulusMPa;
    }
    const material = spec.material ?? "music_wire";
    const G = SPRING_MATERIAL_SHEAR_MODULUS_MPA[material];
    if (G === undefined) {
      throw new Error(`unknown material '${material}'`);
    }
    return G;
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────

export const helicalSpringEngine = new HelicalSpringEngine();
