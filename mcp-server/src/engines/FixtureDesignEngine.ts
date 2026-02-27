/**
 * FixtureDesignEngine — Manufacturing Intelligence Layer (SAFETY CRITICAL)
 *
 * Recommends workholding solutions and validates clamping adequacy.
 * SAFETY: Insufficient clamping force causes part ejection → operator injury.
 * All clamping calculations include 2.5× safety factor per ISO 10218.
 *
 * Actions: fixture_recommend, fixture_validate, clamp_force_calculate, fixture_deflection
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PartGeometry {
  shape: "prismatic" | "cylindrical" | "irregular";
  length_mm: number;
  width_mm: number;
  height_mm: number;
  weight_kg: number;
  material_iso_group: string;
}

export interface CuttingLoads {
  max_force_N: number;               // peak tangential cutting force
  max_torque_Nm?: number;
  force_direction: "x" | "y" | "z" | "radial" | "tangential";
  spindle_rpm?: number;
}

export type FixtureType =
  | "vise" | "3_jaw_chuck" | "4_jaw_chuck" | "collet"
  | "vacuum" | "magnetic" | "fixture_plate" | "soft_jaws"
  | "hydraulic_clamp" | "tombstone";

export interface FixtureRecommendation {
  fixture_type: FixtureType;
  description: string;
  score: number;
  required_clamp_force_N: number;
  achievable_clamp_force_N: number;
  safety_factor: number;
  clamp_points: number;
  rationale: string[];
  warnings: string[];
  setup_time_min: number;
}

export interface ClampForceResult {
  /** Required total clamping force in Newtons (includes safety factor) */
  required_force_N: number;
  /** Safety factor applied (default 2.5) */
  safety_factor: number;
  /** Friction coefficient used */
  friction_coefficient: number;
  /** Raw force needed without safety factor */
  minimum_force_N: number;
  /** Per-clamp force if using N clamps */
  per_clamp_force_N: number;
  /** Number of clamps recommended */
  recommended_clamps: number;
  /** SAFETY: pass or fail */
  safe: boolean;
  /** Explanation */
  notes: string[];
}

export interface DeflectionResult {
  /** Maximum deflection under cutting load */
  max_deflection_mm: number;
  /** Acceptable limit based on tolerance */
  deflection_limit_mm: number;
  /** Whether within tolerance */
  acceptable: boolean;
  /** Clamping stiffness N/mm */
  clamp_stiffness_N_per_mm: number;
  notes: string[];
}

export interface FixtureValidationResult {
  valid: boolean;
  fixture_type: FixtureType;
  clamp_force_ok: boolean;
  deflection_ok: boolean;
  access_ok: boolean;
  issues: string[];
  safety_factor: number;
}

// ============================================================================
// FRICTION COEFFICIENTS (from WorkholdingDB)
// ============================================================================

const FRICTION_COEFFICIENTS: Record<string, Record<string, number>> = {
  steel_smooth: { vise: 0.15, chuck: 0.12, fixture_plate: 0.18, soft_jaws: 0.25 },
  steel_serrated: { vise: 0.30, chuck: 0.25, fixture_plate: 0.35, soft_jaws: 0.40 },
  aluminum_smooth: { vise: 0.12, chuck: 0.10, fixture_plate: 0.15, soft_jaws: 0.22 },
  aluminum_serrated: { vise: 0.25, chuck: 0.20, fixture_plate: 0.30, soft_jaws: 0.35 },
  cast_iron: { vise: 0.18, chuck: 0.15, fixture_plate: 0.20, soft_jaws: 0.28 },
  titanium: { vise: 0.14, chuck: 0.12, fixture_plate: 0.17, soft_jaws: 0.24 },
};

/** SAFETY CONSTANT: minimum safety factor for clamping force */
const MIN_SAFETY_FACTOR = 2.5;

/** Typical achievable clamp forces per fixture type (N) */
const FIXTURE_CLAMP_CAPACITY: Record<FixtureType, number> = {
  vise: 45000,
  "3_jaw_chuck": 35000,
  "4_jaw_chuck": 40000,
  collet: 20000,
  vacuum: 8000,
  magnetic: 12000,
  fixture_plate: 60000,
  soft_jaws: 50000,
  hydraulic_clamp: 80000,
  tombstone: 100000,
};

// ============================================================================
// CLAMPING FORCE CALCULATION
// ============================================================================

function getFriction(isoGroup: string, fixtureType: string, serrated: boolean): number {
  let matKey: string;
  if (isoGroup === "N") matKey = "aluminum";
  else if (isoGroup === "K") matKey = "cast_iron";
  else if (isoGroup === "S") matKey = "titanium";
  else matKey = "steel";

  matKey += serrated ? "_serrated" : "_smooth";
  const group = FRICTION_COEFFICIENTS[matKey] || FRICTION_COEFFICIENTS["steel_smooth"];

  const simpleType = fixtureType.includes("chuck") ? "chuck"
    : fixtureType.includes("vise") ? "vise"
    : fixtureType.includes("soft") ? "soft_jaws"
    : "fixture_plate";

  return group[simpleType] || 0.15;
}

/**
 * SAFETY CRITICAL: Calculate required clamping force.
 *
 * F_clamp = (F_cutting × SafetyFactor) / (μ × n_surfaces)
 * where n_surfaces = number of clamping contact surfaces (typically 2 for a vise)
 */
function calculateClampForce(
  cuttingForce_N: number,
  friction: number,
  numContactSurfaces: number,
  safetyFactor: number
): number {
  if (friction <= 0) friction = 0.15; // SAFETY: never divide by zero
  if (numContactSurfaces < 1) numContactSurfaces = 1;
  return (cuttingForce_N * safetyFactor) / (friction * numContactSurfaces);
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FixtureDesignEngine {
  /**
   * Recommend workholding for a given part and cutting scenario.
   * Returns sorted list by score, with SAFETY warnings.
   */
  recommend(part: PartGeometry, loads: CuttingLoads): FixtureRecommendation[] {
    const candidates: FixtureRecommendation[] = [];
    const fixtureTypes: FixtureType[] = part.shape === "cylindrical"
      ? ["3_jaw_chuck", "4_jaw_chuck", "collet", "soft_jaws"]
      : ["vise", "fixture_plate", "soft_jaws", "hydraulic_clamp", "vacuum", "tombstone"];

    for (const ft of fixtureTypes) {
      const mu = getFriction(part.material_iso_group, ft, ft !== "vacuum" && ft !== "magnetic");
      const nSurfaces = ft === "vise" ? 2 : ft.includes("chuck") ? 3 : ft === "vacuum" ? 1 : 2;
      const reqForce = calculateClampForce(loads.max_force_N, mu, nSurfaces, MIN_SAFETY_FACTOR);
      const achievable = FIXTURE_CLAMP_CAPACITY[ft];
      const sf = achievable / Math.max(reqForce / MIN_SAFETY_FACTOR, 1);

      let score = 50;
      const rationale: string[] = [];
      const warnings: string[] = [];

      // Force adequacy — SAFETY CRITICAL
      if (achievable >= reqForce) {
        score += 20;
        rationale.push(`Clamp force ${Math.round(achievable)}N ≥ required ${Math.round(reqForce)}N`);
      } else {
        score -= 30;
        warnings.push(`SAFETY: Clamp force ${Math.round(achievable)}N < required ${Math.round(reqForce)}N — INSUFFICIENT`);
      }

      // Part shape suitability
      if (part.shape === "cylindrical" && ft.includes("chuck")) { score += 10; rationale.push("Chuck suits cylindrical parts"); }
      if (part.shape === "prismatic" && ft === "vise") { score += 10; rationale.push("Vise suits prismatic parts"); }

      // Weight check for vacuum/magnetic
      if ((ft === "vacuum" || ft === "magnetic") && part.weight_kg > 10) {
        score -= 15; warnings.push("Part too heavy for vacuum/magnetic holding");
      }

      // Production setup time
      const setupTimes: Record<string, number> = {
        vise: 5, "3_jaw_chuck": 3, "4_jaw_chuck": 10, collet: 2, vacuum: 3,
        magnetic: 2, fixture_plate: 20, soft_jaws: 15, hydraulic_clamp: 10, tombstone: 25,
      };

      const nClamps = ft === "fixture_plate" ? Math.max(4, Math.ceil(reqForce / 15000)) : ft === "tombstone" ? 6 : 2;

      candidates.push({
        fixture_type: ft, description: `${ft.replace(/_/g, " ")} workholding`,
        score: Math.max(0, Math.min(100, score)),
        required_clamp_force_N: Math.round(reqForce),
        achievable_clamp_force_N: achievable,
        safety_factor: Math.round(sf * 100) / 100,
        clamp_points: nClamps, rationale, warnings,
        setup_time_min: setupTimes[ft] || 10,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * SAFETY CRITICAL: Calculate exact clamping force required.
   */
  clampForce(
    cuttingForce_N: number,
    isoGroup: string,
    fixtureType: FixtureType,
    serrated: boolean = true,
    numClamps: number = 2
  ): ClampForceResult {
    const mu = getFriction(isoGroup, fixtureType, serrated);
    const nSurfaces = fixtureType === "vise" ? 2 : fixtureType.includes("chuck") ? 3 : 2;
    const minForce = cuttingForce_N / (mu * nSurfaces);
    const reqForce = minForce * MIN_SAFETY_FACTOR;
    const achievable = FIXTURE_CLAMP_CAPACITY[fixtureType];
    const perClamp = reqForce / Math.max(numClamps, 1);
    const notes: string[] = [];

    if (reqForce > achievable) {
      notes.push(`SAFETY WARNING: Required ${Math.round(reqForce)}N exceeds ${fixtureType} capacity ${achievable}N`);
    }
    if (mu < 0.15) notes.push("Low friction — consider serrated jaws");
    if (perClamp > 20000) notes.push("High per-clamp force — verify clamp bolt torque");

    return {
      required_force_N: Math.round(reqForce),
      safety_factor: MIN_SAFETY_FACTOR,
      friction_coefficient: mu,
      minimum_force_N: Math.round(minForce),
      per_clamp_force_N: Math.round(perClamp),
      recommended_clamps: Math.max(numClamps, Math.ceil(reqForce / 15000)),
      safe: reqForce <= achievable,
      notes,
    };
  }

  /**
   * Calculate part deflection under clamping + cutting loads.
   */
  deflection(part: PartGeometry, loads: CuttingLoads, fixtureType: FixtureType, tolerance_mm: number): DeflectionResult {
    // Simplified beam deflection model
    const L = Math.max(part.length_mm, part.width_mm);
    const h = Math.min(part.height_mm, part.width_mm, part.length_mm);
    const b = part.shape === "cylindrical" ? Math.PI * (h / 2) : Math.min(part.width_mm, part.length_mm);

    // E values by ISO group
    const E_MAP: Record<string, number> = { P: 200000, M: 193000, K: 170000, N: 70000, S: 114000, H: 210000 };
    const E = E_MAP[part.material_iso_group] || 200000;

    const I = (b * Math.pow(h, 3)) / 12;
    // Simply supported beam with point load at center: δ = F·L³/(48·E·I)
    const deflection = (loads.max_force_N * Math.pow(L, 3)) / (48 * E * Math.max(I, 0.001));
    const limit = tolerance_mm * 0.3; // deflection should be ≤30% of tolerance

    // Clamp stiffness estimate
    const stiffness = loads.max_force_N / Math.max(deflection, 0.0001);

    const notes: string[] = [];
    if (deflection > limit) notes.push(`Deflection ${deflection.toFixed(4)}mm exceeds 30% of tolerance (${limit.toFixed(4)}mm)`);
    if (L / h > 10) notes.push("Thin-wall part — consider additional support");

    return {
      max_deflection_mm: Math.round(deflection * 10000) / 10000,
      deflection_limit_mm: Math.round(limit * 10000) / 10000,
      acceptable: deflection <= limit,
      clamp_stiffness_N_per_mm: Math.round(stiffness),
      notes,
    };
  }

  /**
   * SAFETY CRITICAL: Validate complete fixture setup.
   */
  validate(
    part: PartGeometry, loads: CuttingLoads,
    fixtureType: FixtureType, tolerance_mm: number
  ): FixtureValidationResult {
    const mu = getFriction(part.material_iso_group, fixtureType, true);
    const nSurfaces = fixtureType === "vise" ? 2 : fixtureType.includes("chuck") ? 3 : 2;
    const reqForce = calculateClampForce(loads.max_force_N, mu, nSurfaces, MIN_SAFETY_FACTOR);
    const achievable = FIXTURE_CLAMP_CAPACITY[fixtureType];
    const clampOk = achievable >= reqForce;

    const defl = this.deflection(part, loads, fixtureType, tolerance_mm);
    const deflOk = defl.acceptable;

    // Access check: can tools reach features with this fixture?
    const accessOk = fixtureType !== "tombstone" || part.height_mm < 300;

    const issues: string[] = [];
    if (!clampOk) issues.push(`SAFETY: Clamping force insufficient (need ${Math.round(reqForce)}N, have ${achievable}N)`);
    if (!deflOk) issues.push(`Deflection ${defl.max_deflection_mm}mm exceeds limit ${defl.deflection_limit_mm}mm`);
    if (!accessOk) issues.push("Tool access limited by fixture geometry");

    const sf = achievable / Math.max(reqForce / MIN_SAFETY_FACTOR, 1);

    return {
      valid: clampOk && deflOk && accessOk,
      fixture_type: fixtureType,
      clamp_force_ok: clampOk,
      deflection_ok: deflOk,
      access_ok: accessOk,
      issues,
      safety_factor: Math.round(sf * 100) / 100,
    };
  }
}

export const fixtureDesignEngine = new FixtureDesignEngine();
