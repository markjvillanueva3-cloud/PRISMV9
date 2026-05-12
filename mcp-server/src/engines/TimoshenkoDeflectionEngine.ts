/**
 * TimoshenkoDeflectionEngine — Timoshenko Beam Theory for Tool/Boring Bar Deflection
 *
 * Implements Timoshenko beam theory which includes shear deformation effects.
 * Critical for stubby beams (boring bars, short end mills) where L/D < 10.
 *
 * Key difference from Euler-Bernoulli:
 * - Euler-Bernoulli: delta_bending = F * L^3 / (3 * E * I)  (neglects shear)
 * - Timoshenko: delta_total = delta_bending + delta_shear
 *   where delta_shear = F * L / (kappa * G * A)
 *
 * Selection criteria:
 * - L/D < 4:  Euler-Bernoulli sufficient (shear < 1% of total)
 * - 4 <= L/D < 10: Either acceptable, Timoshenko more accurate (shear 1-10%)
 * - L/D >= 10: Timoshenko required (shear > 10% of total)
 *
 * Multi-section support:
 * - Stepped shafts (shank vs flute diameter)
 * - Tapered tools
 * - Composite beams (carbide + steel sections with different E/G values)
 *
 * Reference:
 *   - Timoshenko, S.P. (1921) "On the correction for shear of the differential
 *     equation for transverse vibrations of prismatic bars", Phil. Mag. 41(245)
 *   - Cowper, G.R. (1966) "The shear coefficient in Timoshenko's beam theory",
 *     ASME J. Applied Mechanics 33(2)
 *   - Altintas, Y. (2012) "Manufacturing Automation" 2nd ed., Ch. 2
 *   - Schmitz & Smith (2009) "Machining Dynamics", Ch. 3
 *
 * Actions: timoshenko_deflection_calc (calcDispatcher)
 *
 * @milestone PP-DEEP-COGNITION
 * @priority P1-HIGH
 */

import { CANONICAL_TOOL_MODULUS, type ToolMaterial } from "../physics/constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Timoshenko beam input parameters */
export interface TimoshenkoParams {
  /** Applied force [N] */
  force: number;
  /** Beam length / overhang [mm] */
  length: number;
  /** Beam diameter [mm] (for circular cross-section) */
  diameter: number;
  /** Elastic modulus E [N/mm² = MPa] (default: carbide = 600000) */
  elasticModulus?: number;
  /** Shear modulus G [N/mm²] (default: derived from E and nu) */
  shearModulus?: number;
  /** Poisson's ratio (default: 0.3 for steel/carbide) */
  poissonRatio?: number;
  /** Shear correction factor kappa (default: auto for circular section) */
  shearCorrectionFactor?: number;
  /** Tool/bar material for property lookup */
  material?: ToolMaterial | "steel" | "heavy_metal" | "dampened";
}

/** Single section of a multi-section beam */
export interface BeamSection {
  /** Section name for identification */
  name: string;
  /** Section length [mm] */
  length: number;
  /** Section diameter [mm] (or outer diameter for hollow) */
  diameter: number;
  /** Inner diameter [mm] (0 for solid, >0 for hollow) */
  innerDiameter?: number;
  /** Elastic modulus E [N/mm²] */
  elasticModulus?: number;
  /** Shear modulus G [N/mm²] */
  shearModulus?: number;
  /** Poisson's ratio */
  poissonRatio?: number;
  /** Material type */
  material?: ToolMaterial | "steel" | "heavy_metal" | "dampened";
  /** Is this the cutting section (for recommendations) */
  isCuttingSection?: boolean;
}

/** Multi-section beam input */
export interface MultiSectionParams {
  /** Beam sections from fixed end to free end */
  sections: BeamSection[];
  /** Applied force at tip [N] */
  force: number;
  /** Force position: "tip" (default), "center" (of last section), or position in mm from tip */
  forcePosition?: "tip" | "center" | number;
}

/** Deflection model comparison result */
export interface DeflectionComparison {
  /** Euler-Bernoulli deflection (bending only) [mm] */
  eulerBernoulli_mm: number;
  /** Euler-Bernoulli deflection [um] */
  eulerBernoulli_um: number;
  /** Timoshenko total deflection [mm] */
  timoshenko_mm: number;
  /** Timoshenko total deflection [um] */
  timoshenko_um: number;
  /** Bending component [mm] */
  bendingDeflection_mm: number;
  /** Shear component [mm] */
  shearDeflection_mm: number;
  /** Shear contribution percentage */
  shearContributionPct: number;
  /** Difference between models [%] */
  modelDifferencePct: number;
  /** Which model is recommended based on L/D */
  recommendedModel: "euler_bernoulli" | "timoshenko";
  /** Reason for recommendation */
  recommendationReason: string;
}

/** Timoshenko deflection result */
export interface TimoshenkoDeflectionResult {
  /** Total deflection at tip [um] */
  totalDeflection_um: AtomicValue;
  /** Total deflection [mm] */
  totalDeflection_mm: AtomicValue;
  /** Bending deflection component [um] */
  bendingDeflection_um: AtomicValue;
  /** Shear deflection component [um] */
  shearDeflection_um: AtomicValue;
  /** Shear contribution to total [%] */
  shearContributionPct: AtomicValue;
  /** L/D ratio */
  ldRatio: AtomicValue;
  /** Stiffness [N/mm] */
  stiffness_N_mm: AtomicValue;
  /** Shear correction factor used */
  shearCorrectionFactor: AtomicValue;
  /** Model comparison with Euler-Bernoulli */
  comparison: DeflectionComparison;
  /** Whether shear effects are significant (>5%) */
  shearSignificant: boolean;
  /** Recommended deflection model */
  recommendedModel: "euler_bernoulli" | "timoshenko";
  /** Recommendations */
  recommendations: string[];
  /** Warnings */
  warnings: string[];
}

/** Multi-section result */
export interface MultiSectionDeflectionResult {
  /** Total deflection at tip [um] */
  totalDeflection_um: AtomicValue;
  /** Per-section contributions */
  sectionContributions: Array<{
    name: string;
    length_mm: number;
    diameter_mm: number;
    bendingDeflection_mm: number;
    shearDeflection_mm: number;
    totalDeflection_mm: number;
    contributionPct: number;
  }>;
  /** Overall shear contribution [%] */
  overallShearContributionPct: number;
  /** Dominant section (highest contribution) */
  dominantSection: string;
  /** Recommendations */
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & MATERIAL PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Elastic modulus by material [MPa = N/mm²]
 * Sources: ASM Handbook, Sandvik/Kennametal catalogs
 */
const ELASTIC_MODULUS: Record<string, number> = {
  carbide: CANONICAL_TOOL_MODULUS.carbide,     // 600,000 MPa
  hss: CANONICAL_TOOL_MODULUS.hss,             // 210,000 MPa
  ceramic: CANONICAL_TOOL_MODULUS.ceramic,     // 380,000 MPa
  cermet: CANONICAL_TOOL_MODULUS.cermet,       // 400,000 MPa
  cbn: CANONICAL_TOOL_MODULUS.cbn,             // 680,000 MPa
  pcd: CANONICAL_TOOL_MODULUS.pcd,             // 850,000 MPa
  steel: 210000,                               // Structural steel
  heavy_metal: 345000,                         // Tungsten heavy alloy (boring bars)
  dampened: 210000,                            // Dampened bar (steel body)
};

/**
 * Poisson's ratio by material (dimensionless)
 * Sources: ASM Handbook Vol. 1 & 2, manufacturer data
 */
const POISSON_RATIO: Record<string, number> = {
  carbide: 0.22,    // WC-Co: 0.20-0.24
  hss: 0.30,        // M2/M42 HSS
  ceramic: 0.22,    // Al2O3/Si3N4
  cermet: 0.23,     // TiCN-based
  cbn: 0.20,        // Cubic boron nitride
  pcd: 0.10,        // Polycrystalline diamond
  steel: 0.30,      // Structural steel
  heavy_metal: 0.28, // Tungsten alloy
  dampened: 0.30,   // Steel body
};

/**
 * Shear correction factor (kappa) for Timoshenko beam theory.
 *
 * For circular cross-section:
 *   kappa = 6(1 + nu) / (7 + 6*nu)  [Cowper, 1966]
 *
 * For other cross-sections:
 *   Rectangle: kappa = 5/6 = 0.833
 *   Thin-walled tube: kappa = 0.5
 *   I-beam (web): kappa = A_web / A_total
 *
 * Reference: Cowper (1966) ASME J. Applied Mechanics 33(2):335-340
 */
function shearCorrectionFactorCircular(nu: number): number {
  return (6 * (1 + nu)) / (7 + 6 * nu);
}

/**
 * Calculate shear modulus G from elastic modulus E and Poisson's ratio nu.
 * G = E / (2 * (1 + nu))  [Isotropic linear elasticity]
 */
function shearModulusFromE(E: number, nu: number): number {
  return E / (2 * (1 + nu));
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class TimoshenkoDeflectionEngine {
  /**
   * Calculate Timoshenko beam deflection for a single uniform beam.
   *
   * Total deflection = bending + shear
   * delta_total = (F * L^3) / (3 * E * I) + (F * L) / (kappa * G * A)
   *
   * @param params - Beam parameters
   * @returns Complete deflection analysis with comparison to Euler-Bernoulli
   */
  calculate(params: TimoshenkoParams): TimoshenkoDeflectionResult {
    const {
      force: F,
      length: L,
      diameter: d,
    } = params;

    // Validate inputs
    if (F < 0) {
      return this.errorResult("Force cannot be negative");
    }
    if (L <= 0 || d <= 0) {
      return this.errorResult("Length and diameter must be positive");
    }

    // Resolve material properties
    const mat = params.material ?? "carbide";
    const E = params.elasticModulus ?? ELASTIC_MODULUS[mat] ?? ELASTIC_MODULUS.carbide;
    const nu = params.poissonRatio ?? POISSON_RATIO[mat] ?? 0.30;
    const G = params.shearModulus ?? shearModulusFromE(E, nu);
    const kappa = params.shearCorrectionFactor ?? shearCorrectionFactorCircular(nu);

    // Geometry: circular cross-section
    const A = (Math.PI * d * d) / 4;           // Cross-sectional area [mm²]
    const I = (Math.PI * Math.pow(d, 4)) / 64; // Second moment of area [mm⁴]
    const LD = L / d;                          // Length-to-diameter ratio

    // ── Euler-Bernoulli (bending only) ──
    // delta_bending = F * L^3 / (3 * E * I)
    const delta_bending = (F * Math.pow(L, 3)) / (3 * E * I);

    // ── Timoshenko shear contribution ──
    // delta_shear = F * L / (kappa * G * A)
    const delta_shear = (F * L) / (kappa * G * A);

    // ── Total Timoshenko deflection ──
    const delta_total = delta_bending + delta_shear;

    // Convert to microns
    const delta_bending_um = delta_bending * 1000;
    const delta_shear_um = delta_shear * 1000;
    const delta_total_um = delta_total * 1000;
    const delta_EB_um = delta_bending_um; // Euler-Bernoulli = bending only

    // Calculate shear contribution percentage
    const shearPct = delta_total > 0 ? (delta_shear / delta_total) * 100 : 0;

    // Model difference
    const modelDiffPct = delta_bending > 0
      ? ((delta_total - delta_bending) / delta_bending) * 100
      : 0;

    // Stiffness
    const stiffness = delta_total > 0 ? F / delta_total : Infinity; // N/mm

    // Determine recommended model
    let recommendedModel: "euler_bernoulli" | "timoshenko";
    let recommendationReason: string;

    if (LD < 4) {
      recommendedModel = "euler_bernoulli";
      recommendationReason = `L/D=${LD.toFixed(1)} < 4: Shear effects negligible (${shearPct.toFixed(1)}%), Euler-Bernoulli sufficient`;
    } else if (LD < 10) {
      recommendedModel = shearPct > 5 ? "timoshenko" : "euler_bernoulli";
      recommendationReason = `L/D=${LD.toFixed(1)} in 4-10 range: Shear contribution ${shearPct.toFixed(1)}%, ${shearPct > 5 ? "Timoshenko recommended" : "Euler-Bernoulli acceptable"}`;
    } else {
      recommendedModel = "timoshenko";
      recommendationReason = `L/D=${LD.toFixed(1)} >= 10: Shear effects significant (${shearPct.toFixed(1)}%), Timoshenko required`;
    }

    // Build comparison
    const comparison: DeflectionComparison = {
      eulerBernoulli_mm: r4(delta_bending),
      eulerBernoulli_um: r1(delta_EB_um),
      timoshenko_mm: r4(delta_total),
      timoshenko_um: r1(delta_total_um),
      bendingDeflection_mm: r4(delta_bending),
      shearDeflection_mm: r4(delta_shear),
      shearContributionPct: r2(shearPct),
      modelDifferencePct: r2(modelDiffPct),
      recommendedModel,
      recommendationReason,
    };

    // Recommendations
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (delta_total_um > 100) {
      recommendations.push(
        `High deflection ${r1(delta_total_um)}um — consider reducing overhang or increasing diameter`
      );
    }

    if (LD > 6 && mat === "steel") {
      recommendations.push(
        "Steel bar at L/D > 6 — upgrade to carbide or dampened bar for 2-3x higher stiffness"
      );
    }

    if (LD > 10 && mat !== "dampened") {
      recommendations.push(
        "L/D > 10 — consider dampened boring bar to reduce chatter risk"
      );
    }

    if (shearPct > 15) {
      warnings.push(
        `Shear deformation is ${r1(shearPct)}% of total — ensure Timoshenko model is used for accuracy`
      );
    }

    if (recommendations.length === 0 && warnings.length === 0) {
      recommendations.push(
        `Deflection ${r1(delta_total_um)}um at ${r1(LD)} L/D — within acceptable range`
      );
    }

    return {
      totalDeflection_um: av(r1(delta_total_um), "um", delta_total_um * 0.05, "timoshenko_beam_theory"),
      totalDeflection_mm: av(r4(delta_total), "mm", delta_total * 0.05, "timoshenko_beam_theory"),
      bendingDeflection_um: av(r1(delta_bending_um), "um", delta_bending_um * 0.03, "euler_bernoulli_bending"),
      shearDeflection_um: av(r1(delta_shear_um), "um", delta_shear_um * 0.10, "timoshenko_shear"),
      shearContributionPct: av(r2(shearPct), "%", shearPct * 0.05, "shear/total"),
      ldRatio: av(r1(LD), "ratio", 0, `${L}mm / ${d}mm`),
      stiffness_N_mm: av(r1(stiffness), "N/mm", stiffness * 0.05, "F/delta_total"),
      shearCorrectionFactor: av(r4(kappa), "dimensionless", 0, "Cowper_circular_section"),
      comparison,
      shearSignificant: shearPct > 5,
      recommendedModel,
      recommendations,
      warnings,
    };
  }

  /**
   * Calculate deflection for multi-section beam (stepped shaft, composite).
   *
   * Uses cascaded beam model: each section contributes deflection at tip,
   * accounting for both bending and shear in each section.
   *
   * @param params - Multi-section beam parameters
   * @returns Per-section contributions and total deflection
   */
  calculateMultiSection(params: MultiSectionParams): MultiSectionDeflectionResult {
    const { sections, force: F, forcePosition = "tip" } = params;

    if (sections.length === 0) {
      return {
        totalDeflection_um: av(0, "um", 0, "no_sections"),
        sectionContributions: [],
        overallShearContributionPct: 0,
        dominantSection: "none",
        recommendations: ["No beam sections provided"],
      };
    }

    // Calculate total length
    const totalLength = sections.reduce((sum, s) => sum + s.length, 0);

    // Cascaded beam deflection
    // For each section, we calculate:
    // 1. Deflection within the section
    // 2. Slope at section end (contributes to downstream deflection)
    // 3. Shear deflection within section

    let cumulativeAngle = 0;
    let totalBending = 0;
    let totalShear = 0;
    const contributions: Array<{
      name: string;
      length_mm: number;
      diameter_mm: number;
      bendingDeflection_mm: number;
      shearDeflection_mm: number;
      totalDeflection_mm: number;
      contributionPct: number;
    }> = [];

    // Calculate remaining length from each section to force application point
    let remainingLength = totalLength;
    if (forcePosition === "center" && sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      remainingLength = totalLength - lastSection.length / 2;
    } else if (typeof forcePosition === "number") {
      remainingLength = totalLength - forcePosition;
    }

    for (const section of sections) {
      const L = section.length;
      const d = section.diameter;
      const di = section.innerDiameter ?? 0;

      // Material properties
      const mat = section.material ?? "carbide";
      const E = section.elasticModulus ?? ELASTIC_MODULUS[mat] ?? ELASTIC_MODULUS.carbide;
      const nu = section.poissonRatio ?? POISSON_RATIO[mat] ?? 0.30;
      const G = section.shearModulus ?? shearModulusFromE(E, nu);
      const kappa = shearCorrectionFactorCircular(nu);

      // Cross-section (solid or hollow)
      const A = di > 0
        ? (Math.PI / 4) * (d * d - di * di)
        : (Math.PI / 4) * d * d;
      const I = di > 0
        ? (Math.PI / 64) * (Math.pow(d, 4) - Math.pow(di, 4))
        : (Math.PI / 64) * Math.pow(d, 4);

      // Bending deflection at section end due to force
      const sectionBending = (F * Math.pow(L, 3)) / (3 * E * I);

      // Angle at section end
      const sectionAngle = (F * Math.pow(L, 2)) / (2 * E * I);

      // Shear deflection in this section
      const sectionShear = (F * L) / (kappa * G * A);

      // Contribution to tip deflection: section deflection + angle contribution
      const tipContribution = sectionBending + cumulativeAngle * L;

      totalBending += tipContribution;
      totalShear += sectionShear;
      cumulativeAngle += sectionAngle;

      contributions.push({
        name: section.name,
        length_mm: L,
        diameter_mm: d,
        bendingDeflection_mm: r4(tipContribution),
        shearDeflection_mm: r4(sectionShear),
        totalDeflection_mm: r4(tipContribution + sectionShear),
        contributionPct: 0, // Filled after total is known
      });

      remainingLength -= L;
    }

    const totalDeflection = totalBending + totalShear;
    const totalDeflection_um = totalDeflection * 1000;
    const overallShearPct = totalDeflection > 0
      ? (totalShear / totalDeflection) * 100
      : 0;

    // Fill contribution percentages
    for (const c of contributions) {
      c.contributionPct = totalDeflection > 0
        ? r1((c.totalDeflection_mm / totalDeflection) * 100)
        : 0;
    }

    // Find dominant section
    const dominant = contributions.reduce((a, b) =>
      a.contributionPct > b.contributionPct ? a : b
    );

    // Recommendations
    const recommendations: string[] = [];

    if (dominant.contributionPct > 50) {
      recommendations.push(
        `${dominant.name} contributes ${dominant.contributionPct}% of deflection — focus stiffening efforts here`
      );
    }

    const smallestDiameterSection = sections.reduce((a, b) =>
      a.diameter < b.diameter ? a : b
    );
    if (smallestDiameterSection.diameter < sections[0].diameter * 0.5) {
      recommendations.push(
        `Large diameter step at ${smallestDiameterSection.name} (${smallestDiameterSection.diameter}mm) — consider reducing step ratio for better stiffness`
      );
    }

    if (overallShearPct > 10) {
      recommendations.push(
        `Overall shear contribution ${r1(overallShearPct)}% — Timoshenko model essential for accuracy`
      );
    }

    if (totalDeflection_um > 50) {
      recommendations.push(
        `Total deflection ${r1(totalDeflection_um)}um may affect surface finish — verify tolerance requirements`
      );
    }

    return {
      totalDeflection_um: av(r1(totalDeflection_um), "um", totalDeflection_um * 0.08, "cascaded_timoshenko"),
      sectionContributions: contributions,
      overallShearContributionPct: r2(overallShearPct),
      dominantSection: dominant.name,
      recommendations,
    };
  }

  /**
   * Compare Euler-Bernoulli and Timoshenko for a given configuration.
   * Useful for determining when shear effects matter.
   *
   * @param params - Beam parameters
   * @returns Side-by-side comparison with recommendations
   */
  compareModels(params: TimoshenkoParams): DeflectionComparison {
    const result = this.calculate(params);
    return result.comparison;
  }

  /**
   * Calculate maximum L/D ratio for a given deflection limit.
   *
   * @param params - Beam parameters (without length, which is calculated)
   * @param maxDeflection_um - Maximum allowable deflection [um]
   * @returns Maximum allowable L/D ratio using both models
   */
  calculateMaxLD(
    params: Omit<TimoshenkoParams, "length">,
    maxDeflection_um: number
  ): { eulerBernoulliLD: number; timoshenkoLD: number; difference_pct: number } {
    const { force: F, diameter: d } = params;
    const mat = params.material ?? "carbide";
    const E = params.elasticModulus ?? ELASTIC_MODULUS[mat] ?? ELASTIC_MODULUS.carbide;
    const nu = params.poissonRatio ?? POISSON_RATIO[mat] ?? 0.30;
    const G = params.shearModulus ?? shearModulusFromE(E, nu);
    const kappa = params.shearCorrectionFactor ?? shearCorrectionFactorCircular(nu);

    const A = (Math.PI * d * d) / 4;
    const I = (Math.PI * Math.pow(d, 4)) / 64;
    const delta_max = maxDeflection_um / 1000; // Convert to mm

    // Euler-Bernoulli: delta = F * L^3 / (3EI)
    // L = (3EI * delta / F)^(1/3)
    const L_EB = Math.pow((3 * E * I * delta_max) / F, 1 / 3);
    const LD_EB = L_EB / d;

    // Timoshenko: delta = F*L^3/(3EI) + F*L/(kappa*G*A)
    // This is cubic + linear in L, solve numerically
    // For simplicity, use iterative approach
    let L_Tim = L_EB;
    for (let i = 0; i < 20; i++) {
      const delta_bend = (F * Math.pow(L_Tim, 3)) / (3 * E * I);
      const delta_shear = (F * L_Tim) / (kappa * G * A);
      const delta_total = delta_bend + delta_shear;
      const error = delta_total - delta_max;
      if (Math.abs(error) < 1e-9) break;
      // Newton-Raphson step
      const dDelta_dL = (3 * F * L_Tim * L_Tim) / (3 * E * I) + F / (kappa * G * A);
      L_Tim -= error / dDelta_dL;
      if (L_Tim < 0) L_Tim = L_EB * 0.5;
    }
    const LD_Tim = L_Tim / d;

    const diff_pct = LD_EB > 0 ? ((LD_EB - LD_Tim) / LD_EB) * 100 : 0;

    return {
      eulerBernoulliLD: r2(LD_EB),
      timoshenkoLD: r2(LD_Tim),
      difference_pct: r2(diff_pct),
    };
  }

  /**
   * Get material properties for a given material type.
   *
   * @param material - Material type
   * @returns E, G, nu, kappa for the material
   */
  getMaterialProperties(material: string): {
    E_MPa: number;
    G_MPa: number;
    nu: number;
    kappa_circular: number;
  } {
    const E = ELASTIC_MODULUS[material] ?? ELASTIC_MODULUS.carbide;
    const nu = POISSON_RATIO[material] ?? 0.30;
    const G = shearModulusFromE(E, nu);
    const kappa = shearCorrectionFactorCircular(nu);

    return {
      E_MPa: E,
      G_MPa: r0(G),
      nu,
      kappa_circular: r4(kappa),
    };
  }

  /**
   * Generate error result for invalid inputs.
   */
  private errorResult(message: string): TimoshenkoDeflectionResult {
    const zeroAV = av(0, "um", 0, "error");
    return {
      totalDeflection_um: { ...zeroAV, warning: message },
      totalDeflection_mm: av(0, "mm", 0, "error"),
      bendingDeflection_um: zeroAV,
      shearDeflection_um: zeroAV,
      shearContributionPct: av(0, "%", 0, "error"),
      ldRatio: av(0, "ratio", 0, "error"),
      stiffness_N_mm: av(0, "N/mm", 0, "error"),
      shearCorrectionFactor: av(0, "", 0, "error"),
      comparison: {
        eulerBernoulli_mm: 0,
        eulerBernoulli_um: 0,
        timoshenko_mm: 0,
        timoshenko_um: 0,
        bendingDeflection_mm: 0,
        shearDeflection_mm: 0,
        shearContributionPct: 0,
        modelDifferencePct: 0,
        recommendedModel: "euler_bernoulli",
        recommendationReason: message,
      },
      shearSignificant: false,
      recommendedModel: "euler_bernoulli",
      recommendations: [],
      warnings: [message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function av(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number {
  return Math.round(n);
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const timoshenkoDeflectionEngine = new TimoshenkoDeflectionEngine();
