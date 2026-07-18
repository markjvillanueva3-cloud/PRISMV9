/**
 * FixtureAwareStrategyEngine — CAMX-MS12/U07
 *
 * Adjusts strategy selection based on workholding type. The fixture affects
 * allowable cutting forces, which constrains strategy choice.
 *
 * Fixture types and their physical constraints:
 *   vise              — Good rigidity; jaw grip limits max lateral force (20-40 kN). Allow aggressive roughing.
 *   vacuum            — Low holding force (~1 kN/100 cm²). ae < 15%D required. No plunge milling. Prefer climb.
 *   magnetic          — Similar to vacuum constraints. No ferrous chip contamination strategies. Low radial force.
 *   soft_jaws         — Good conforming grip; moderate engagement. Watch jaw deflection on thin parts.
 *   fixture_plate     — High rigidity (bolted). Allow aggressive strategies. Check bolt pattern vs toolpath.
 *   tombstone         — Good rigidity per face. Reduce ap 15% on non-top faces (gravity). Tool access limited.
 *   pallet            — Similar to fixture_plate. Consider pallet change time in optimization.
 *   chuck_3jaw        — Turning. Grip force from jaw pressure. Check runout impact on finish.
 *   chuck_4jaw        — Turning. Independent jaw adjustment; good for asymmetric parts.
 *   chuck_6jaw        — Turning. Best for thin-wall; distributes clamping load.
 *   collet            — Turning. Best concentricity. Limited diameter range. High grip for size.
 *
 * Methods:
 *   adjustStrategy(strategy, fixture_type, fixture_params)  → AdjustedStrategy
 *   validateForFixture(strategy, fixture_type)              → { valid, issues[], derating_factors }
 *   recommendFixture(feature, strategies[])                 → FixtureRecommendation[]
 *
 * @shortcode E1101
 * @module engines/FixtureAwareStrategyEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type FixtureType =
  | "vise"
  | "vacuum"
  | "magnetic"
  | "soft_jaws"
  | "fixture_plate"
  | "tombstone"
  | "pallet"
  | "chuck_3jaw"
  | "chuck_4jaw"
  | "chuck_6jaw"
  | "collet";

export type MachiningStrategy =
  | "aggressive_roughing"
  | "adaptive_roughing"
  | "conventional_roughing"
  | "plunge_milling"
  | "trochoidal"
  | "hsm_finishing"
  | "climb_milling"
  | "conventional_milling"
  | "contour_finishing"
  | "pencil_finishing"
  | "scallop_finishing"
  | "turning_roughing"
  | "turning_finishing"
  | "boring"
  | "thread_turning"
  | string; // allow custom strategy names

/** Input to adjustStrategy */
export interface AdjustStrategyInput {
  /** Base strategy to adjust */
  strategy: MachiningStrategy;
  /** Workholding type */
  fixture_type: FixtureType;
  /** Optional fixture-specific parameters */
  fixture_params?: {
    /** Vise: jaw grip force in Newtons (default 25000) */
    jaw_grip_force_n?: number;
    /** Vacuum: total contact area in cm² (default 200) */
    vacuum_contact_area_cm2?: number;
    /** Vacuum: seal efficiency 0-1 (default 0.85) */
    vacuum_seal_efficiency?: number;
    /** Magnetic: flux density in Tesla (default 0.8) */
    magnetic_flux_density_t?: number;
    /** Tombstone: is the part on a non-top face? (default false) */
    tombstone_non_top_face?: boolean;
    /** Chuck: static grip force in Newtons (default 15000) */
    chuck_grip_force_n?: number;
    /** Chuck: spindle RPM for centrifugal grip loss check */
    chuck_spindle_rpm?: number;
    /** Collet: collet grip force in Newtons (default 8000) */
    collet_grip_force_n?: number;
    /** Part: minimum wall thickness mm (for deflection checks) */
    min_wall_thickness_mm?: number;
    /** Cutting: estimated peak tangential force in Newtons */
    estimated_cutting_force_n?: number;
    /** Tool diameter in mm (for ae% calculation) */
    tool_diameter_mm?: number;
    /** Current radial engagement ae in mm */
    ae_mm?: number;
    /** Current axial depth of cut ap in mm */
    ap_mm?: number;
  };
}

/** Adjusted strategy output */
export interface AdjustedStrategy {
  /** Original strategy name */
  original_strategy: MachiningStrategy;
  /** Adjusted or replacement strategy */
  adjusted_strategy: MachiningStrategy;
  /** Was the strategy changed? */
  strategy_changed: boolean;
  /** Maximum allowable radial engagement as fraction of diameter (0-1) */
  max_ae_fraction: number;
  /** Maximum allowable axial depth of cut in mm (null = no constraint from fixture) */
  max_ap_mm: number | null;
  /** Force derating factor (0-1); multiply target cutting force by this */
  force_derating_factor: number;
  /** Preferred milling direction */
  preferred_direction: "climb" | "conventional" | "either";
  /** Actions blocked by this fixture */
  blocked_strategies: MachiningStrategy[];
  /** Recommended safety factor for clamping calculations */
  safety_factor: number;
  /** Fixture maximum holding force (N) */
  fixture_holding_force_n: number;
  /** Human-readable adjustment notes */
  notes: string[];
  /** Warnings that operator must acknowledge */
  warnings: string[];
}

/** Input to validateForFixture */
export interface ValidateForFixtureInput {
  strategy: MachiningStrategy;
  fixture_type: FixtureType;
  /** Optional context for more precise validation */
  ae_mm?: number;
  tool_diameter_mm?: number;
  ap_mm?: number;
  estimated_cutting_force_n?: number;
  fixture_params?: AdjustStrategyInput["fixture_params"];
}

/** Validation result */
export interface FixtureValidationResult {
  valid: boolean;
  strategy: MachiningStrategy;
  fixture_type: FixtureType;
  issues: Array<{
    severity: "CRITICAL" | "WARNING" | "INFO";
    code: string;
    message: string;
    remedy?: string;
  }>;
  derating_factors: {
    force: number;        // multiply planned cutting force by this
    ae: number;           // multiply planned ae by this (max fraction adjustment)
    ap: number;           // multiply planned ap by this
    feed: number;         // multiply planned feed by this
  };
  overall_derating: number; // geometric mean of all derating factors
}

/** Feature description for fixture recommendation */
export interface FeatureForFixture {
  /** Feature type: pocket, profile, face, bore, turn_od, turn_id, etc. */
  type: string;
  /** Part material ISO group */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Part shape */
  part_shape?: "prismatic" | "cylindrical" | "irregular";
  /** Minimum wall thickness mm */
  min_wall_thickness_mm?: number;
  /** Part mass kg */
  mass_kg?: number;
  /** Is finishing required (tight tolerances / surface finish) */
  requires_finishing?: boolean;
  /** Production volume: single, small_batch, high_volume */
  production_volume?: "single" | "small_batch" | "high_volume";
  /** Number of setups planned */
  setup_count?: number;
  /** Part is ferrous (affects magnetic fixture viability) */
  ferrous?: boolean;
}

/** Ranked fixture recommendation */
export interface FixtureRecommendation {
  fixture_type: FixtureType;
  score: number;          // 0-100
  rank: number;
  rationale: string[];
  constraints: string[];
  setup_time_relative: "low" | "medium" | "high";
  suitable_strategies: MachiningStrategy[];
  incompatible_strategies: MachiningStrategy[];
}

// ============================================================================
// FIXTURE CONSTRAINT DATABASE
// ============================================================================

interface FixtureProfile {
  /** Display name */
  name: string;
  /** Approximate max holding force in Newtons */
  max_holding_force_n: number;
  /** Max radial engagement as fraction of tool diameter (0-1) */
  max_ae_fraction: number;
  /** Force derating factor vs unconstrained (0-1) */
  force_derating: number;
  /** Preferred milling direction */
  preferred_direction: "climb" | "conventional" | "either";
  /** Strategies that are absolutely forbidden */
  blocked_strategies: MachiningStrategy[];
  /** Strategies that are discouraged (use with care) */
  discouraged_strategies: MachiningStrategy[];
  /** Strategies that work well with this fixture */
  preferred_strategies: MachiningStrategy[];
  /** Safety factor for clamping force calculations (per ISO/ASME guidelines) */
  safety_factor: number;
  /** Relative setup time */
  setup_time: "low" | "medium" | "high";
  /** Special notes */
  notes: string[];
}

const FIXTURE_PROFILES: Record<FixtureType, FixtureProfile> = {
  vise: {
    name: "Machine Vise",
    max_holding_force_n: 30000,       // 20-40 kN typical; use 30 kN as default
    max_ae_fraction: 1.0,             // no inherent ae limit from vise
    force_derating: 1.0,              // full cutting force allowed
    preferred_direction: "either",
    blocked_strategies: [],
    discouraged_strategies: [],
    preferred_strategies: ["aggressive_roughing", "adaptive_roughing", "trochoidal"],
    safety_factor: 2.0,
    setup_time: "low",
    notes: [
      "Jaw grip limits max lateral force — ensure F_lateral < F_grip / SF",
      "Jaw height should be 60-70% of part height for stability",
      "Soft jaw inserts recommended for thin-wall or irregular parts",
    ],
  },

  vacuum: {
    name: "Vacuum Fixture",
    max_holding_force_n: 2000,        // ~1 kN per 100 cm²; default 200 cm² = 2 kN
    max_ae_fraction: 0.15,            // MUST stay < 15%D
    force_derating: 0.3,              // very conservative
    preferred_direction: "climb",     // climb pushes part down onto fixture
    blocked_strategies: ["plunge_milling", "aggressive_roughing"],
    discouraged_strategies: ["conventional_roughing", "conventional_milling"],
    preferred_strategies: ["trochoidal", "hsm_finishing", "climb_milling", "contour_finishing"],
    safety_factor: 3.0,               // higher SF due to low grip
    setup_time: "medium",
    notes: [
      "Holding force ~1 kN per 100 cm² contact area × seal efficiency",
      "ae MUST be < 15% of tool diameter to limit lateral forces",
      "Climb milling preferred — pushes workpiece onto chuck face, not away",
      "Seal condition and surface flatness critical — rough surfaces reduce holding 30-50%",
      "Coolant pressure must be < vacuum level to avoid breaking suction",
      "No plunge milling — axial impact force exceeds holding capacity",
    ],
  },

  magnetic: {
    name: "Magnetic Chuck",
    max_holding_force_n: 1500,        // similar to vacuum, flux-dependent
    max_ae_fraction: 0.20,            // slightly more than vacuum (normal force from magnet)
    force_derating: 0.35,
    preferred_direction: "climb",
    blocked_strategies: ["plunge_milling", "aggressive_roughing"],
    discouraged_strategies: ["conventional_roughing"],
    preferred_strategies: ["trochoidal", "hsm_finishing", "contour_finishing", "scallop_finishing"],
    safety_factor: 3.0,
    setup_time: "low",
    notes: [
      "Only works with ferrous (magnetic) workpiece materials",
      "Avoid strategies generating ferrous chip contamination (can short-circuit field)",
      "Demagnetize workpiece after machining if residual magnetism is a concern",
      "Holding force: F = B² × A / (2 × μ₀); typical 0.8T → ~250 kN/m² per m²",
      "Lateral force limit is friction only — μ ≈ 0.1-0.15 on magnetic chuck surface",
    ],
  },

  soft_jaws: {
    name: "Soft Jaws",
    max_holding_force_n: 20000,       // moderate — jaws conform but can deflect
    max_ae_fraction: 0.60,            // moderate engagement OK
    force_derating: 0.75,
    preferred_direction: "either",
    blocked_strategies: ["aggressive_roughing"],
    discouraged_strategies: [],
    preferred_strategies: ["adaptive_roughing", "conventional_roughing", "contour_finishing"],
    safety_factor: 2.0,
    setup_time: "medium",             // requires jaw boring step
    notes: [
      "Jaw deflection risk on thin-wall parts — add backing support if wall < 5mm",
      "Bore jaws at the exact clamping diameter for maximum contact area",
      "Good for irregular or delicate parts that standard hard jaws would damage",
      "Grip force limited by jaw material yield strength (typically aluminum)",
    ],
  },

  fixture_plate: {
    name: "Fixture Plate (Bolted)",
    max_holding_force_n: 80000,       // very high — bolt pattern determines limit
    max_ae_fraction: 1.0,
    force_derating: 1.0,
    preferred_direction: "either",
    blocked_strategies: [],
    discouraged_strategies: [],
    preferred_strategies: ["aggressive_roughing", "adaptive_roughing", "trochoidal", "plunge_milling"],
    safety_factor: 2.0,
    setup_time: "high",               // requires custom plate + bolt pattern design
    notes: [
      "Check bolt pattern does not interfere with toolpath — program bolt avoidance zones",
      "Use precision dowels for repeatability on multi-setup jobs",
      "Higher bolt torque → higher clamp force; document torque specs",
      "Verify access for all tools around bolt heads",
    ],
  },

  tombstone: {
    name: "Tombstone (4-face)",
    max_holding_force_n: 50000,       // rigidity per face similar to fixture plate
    max_ae_fraction: 0.85,
    force_derating: 0.85,             // 15% derating for non-top faces (gravity)
    preferred_direction: "either",
    blocked_strategies: [],
    discouraged_strategies: ["aggressive_roughing"],  // access often limited
    preferred_strategies: ["adaptive_roughing", "trochoidal", "contour_finishing"],
    safety_factor: 2.0,
    setup_time: "high",
    notes: [
      "Reduce ap by 15% on non-top faces — gravity adds to effective cutting forces",
      "Tool access limited by adjacent faces; check clearance during simulation",
      "Load balancing across faces affects pallet dynamics — keep mass symmetric",
      "Excellent for high-volume prismatic parts needing multiple setups",
    ],
  },

  pallet: {
    name: "Pallet System (Horizontal)",
    max_holding_force_n: 70000,
    max_ae_fraction: 1.0,
    force_derating: 1.0,
    preferred_direction: "either",
    blocked_strategies: [],
    discouraged_strategies: [],
    preferred_strategies: ["adaptive_roughing", "trochoidal", "aggressive_roughing"],
    safety_factor: 2.0,
    setup_time: "low",                // fast change once set up
    notes: [
      "Pallet change time ~30-120 s — factor into cycle time optimization",
      "Repeatability ±2-5 μm on precision pallets (Erowa, System 3R, etc.)",
      "Similar constraints to fixture plate — bolt pattern interference check applies",
      "Preset offline to maximize machine utilization",
    ],
  },

  chuck_3jaw: {
    name: "3-Jaw Chuck (Turning)",
    max_holding_force_n: 15000,       // static grip; falls with RPM
    max_ae_fraction: 1.0,             // turning, not milling
    force_derating: 0.85,             // centrifugal grip loss at operating RPM
    preferred_direction: "either",    // n/a for turning
    blocked_strategies: ["aggressive_roughing", "trochoidal", "plunge_milling"],  // milling strategies
    discouraged_strategies: ["adaptive_roughing"],
    preferred_strategies: ["turning_roughing", "turning_finishing", "boring", "thread_turning"],
    safety_factor: 2.5,               // SAFETY CRITICAL — workpiece ejection risk
    setup_time: "low",
    notes: [
      "Static grip 15-30 kN; effective grip = F_static - m_jaw × ω² × r (centrifugal loss)",
      "Check runout impact on surface finish — TIR affects effective diameter",
      "Reduce spindle RPM if grip ratio drops below 1.5 (grip / cutting force)",
      "Scroll chuck self-centers; independent adjustment for precision requires 4-jaw",
    ],
  },

  chuck_4jaw: {
    name: "4-Jaw Independent Chuck (Turning)",
    max_holding_force_n: 20000,
    max_ae_fraction: 1.0,
    force_derating: 0.85,
    preferred_direction: "either",
    blocked_strategies: ["aggressive_roughing", "trochoidal", "plunge_milling"],
    discouraged_strategies: [],
    preferred_strategies: ["turning_roughing", "turning_finishing", "boring", "thread_turning"],
    safety_factor: 2.5,
    setup_time: "medium",             // manual jaw dialing required
    notes: [
      "Independent jaw adjustment: dial indicator setup adds 5-15 min but enables ±5 μm TIR",
      "Better for asymmetric, out-of-round, or off-center turning",
      "Higher grip capacity than 3-jaw due to 4 contact points",
      "Centrifugal grip loss still applies — check at max operating RPM",
    ],
  },

  chuck_6jaw: {
    name: "6-Jaw Chuck (Turning)",
    max_holding_force_n: 18000,
    max_ae_fraction: 1.0,
    force_derating: 0.90,             // better load distribution → less derating
    preferred_direction: "either",
    blocked_strategies: ["aggressive_roughing", "trochoidal", "plunge_milling"],
    discouraged_strategies: [],
    preferred_strategies: ["turning_finishing", "turning_roughing", "boring", "thread_turning"],
    safety_factor: 2.5,
    setup_time: "low",
    notes: [
      "6 jaws distribute clamping load — ideal for thin-wall tubing / rings",
      "Reduced chuck deflection → better roundness on thin-wall parts",
      "Lower per-jaw force reduces workpiece marking",
      "Grip loss at RPM still applies; 6-jaw jaws are lighter → less centrifugal loss",
    ],
  },

  collet: {
    name: "Collet (Turning/Milling)",
    max_holding_force_n: 12000,       // high grip for diameter range
    max_ae_fraction: 1.0,
    force_derating: 0.95,             // minimal derating — excellent rigidity
    preferred_direction: "either",
    blocked_strategies: [],
    discouraged_strategies: ["aggressive_roughing"],  // limited by collet bore size
    preferred_strategies: ["turning_finishing", "hsm_finishing", "contour_finishing", "thread_turning"],
    safety_factor: 2.0,
    setup_time: "low",
    notes: [
      "Best concentricity of all chucks — TIR typically < 5 μm",
      "Limited diameter range (each collet covers ~0.5 mm range) — match carefully",
      "High grip force for the contact area → use for small diameter precision work",
      "Spring collets wear — inspect seating surface regularly",
    ],
  },
};

// ============================================================================
// COMPUTED HOLDING FORCE HELPERS
// ============================================================================

function computeVacuumForce(
  area_cm2: number,
  seal_efficiency: number,
  vacuum_kpa = 95,
): number {
  // F = ΔP × A × η; A in m², ΔP in Pa
  const area_m2 = area_cm2 * 1e-4;
  return vacuum_kpa * 1000 * area_m2 * seal_efficiency;
}

function computeMagneticForce(flux_t: number, area_m2: number): number {
  // F = B² × A / (2μ₀)
  const mu0 = 4 * Math.PI * 1e-7;
  return (flux_t * flux_t * area_m2) / (2 * mu0);
}

function chuckGripLossAtRpm(
  static_grip_n: number,
  jaw_mass_kg: number,
  grip_radius_mm: number,
  rpm: number,
): number {
  const omega = (2 * Math.PI * rpm) / 60;
  const r = grip_radius_mm / 1000;
  const centrifugal = jaw_mass_kg * omega * omega * r;
  return Math.max(0, static_grip_n - centrifugal);
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class FixtureAwareStrategyEngine {

  /**
   * Adjust a machining strategy to comply with fixture constraints.
   *
   * Returns modified strategy parameters (ae limit, ap limit, direction preference)
   * and replaces the strategy if the original is blocked.
   */
  adjustStrategy(input: AdjustStrategyInput): AdjustedStrategy {
    const { strategy, fixture_type, fixture_params: fp = {} } = input;
    const profile = FIXTURE_PROFILES[fixture_type];

    if (!profile) {
      throw new Error(`Unknown fixture type: ${fixture_type}`);
    }

    log.info(`[FixtureAwareStrategy] Adjusting '${strategy}' for fixture '${fixture_type}'`);

    const notes: string[] = [...profile.notes];
    const warnings: string[] = [];

    // --- Compute actual holding force based on params ---
    let holdingForce = profile.max_holding_force_n;

    if (fixture_type === "vacuum") {
      const area = fp.vacuum_contact_area_cm2 ?? 200;
      const eta = fp.vacuum_seal_efficiency ?? 0.85;
      holdingForce = computeVacuumForce(area, eta);
      notes.push(`Computed vacuum holding force: ${holdingForce.toFixed(0)} N (${area} cm² × η=${eta})`);
    } else if (fixture_type === "magnetic") {
      // Approximate contact area from default (0.01 m² = 100 cm²)
      const area_m2 = 0.01;
      const B = fp.magnetic_flux_density_t ?? 0.8;
      holdingForce = Math.min(computeMagneticForce(B, area_m2), profile.max_holding_force_n);
      notes.push(`Computed magnetic holding force: ${holdingForce.toFixed(0)} N (B=${B} T)`);
    } else if (fixture_type === "vise") {
      holdingForce = fp.jaw_grip_force_n ?? profile.max_holding_force_n;
    } else if (fixture_type === "chuck_3jaw" || fixture_type === "chuck_4jaw" || fixture_type === "chuck_6jaw") {
      const staticGrip = fp.chuck_grip_force_n ?? profile.max_holding_force_n;
      if (fp.chuck_spindle_rpm && fp.chuck_spindle_rpm > 500) {
        // Estimate jaw mass and radius for centrifugal loss
        const jawMass = fixture_type === "chuck_6jaw" ? 0.15 : 0.25;  // kg, lighter for 6-jaw
        const gripRadius = 60; // mm, typical
        holdingForce = chuckGripLossAtRpm(staticGrip, jawMass, gripRadius, fp.chuck_spindle_rpm);
        if (holdingForce < staticGrip * 0.7) {
          warnings.push(
            `At ${fp.chuck_spindle_rpm} RPM centrifugal loss is significant — effective grip ` +
            `${holdingForce.toFixed(0)} N (${((1 - holdingForce / staticGrip) * 100).toFixed(0)}% loss). ` +
            `Reduce RPM or use speed-compensated chuck.`
          );
        }
      } else {
        holdingForce = fp.chuck_grip_force_n ?? profile.max_holding_force_n;
      }
    } else if (fixture_type === "collet") {
      holdingForce = fp.collet_grip_force_n ?? profile.max_holding_force_n;
    }

    // --- Tombstone: non-top face derating ---
    let apMultiplier = 1.0;
    if (fixture_type === "tombstone" && fp.tombstone_non_top_face) {
      apMultiplier = 0.85;
      notes.push("Non-top tombstone face: ap reduced 15% to compensate for gravity adding to cutting forces.");
    }

    // --- Determine max ap ---
    let maxApMm: number | null = fp.ap_mm != null ? fp.ap_mm * apMultiplier : null;
    // For vacuum/magnetic: limit ap to avoid vibration-induced release
    if (fixture_type === "vacuum" || fixture_type === "magnetic") {
      const toolD = fp.tool_diameter_mm ?? 10;
      // Limit ap to 1.5× tool diameter for low-force fixtures
      const vacApLimit = toolD * 1.5;
      maxApMm = maxApMm != null ? Math.min(maxApMm, vacApLimit) : vacApLimit;
      notes.push(`ap limited to ≤ ${vacApLimit.toFixed(1)} mm (1.5×D) for low-force fixture.`);
    }

    // --- Validate and possibly swap strategy ---
    const isBlocked = profile.blocked_strategies.includes(strategy as MachiningStrategy);
    let adjustedStrategy: MachiningStrategy = strategy;
    let strategyChanged = false;

    if (isBlocked) {
      strategyChanged = true;
      // Pick the best alternative from profile.preferred_strategies that isn't also blocked
      const fallback = profile.preferred_strategies.find(
        s => !profile.blocked_strategies.includes(s)
      ) ?? "contour_finishing";
      adjustedStrategy = fallback;
      warnings.push(
        `Strategy '${strategy}' is BLOCKED for ${profile.name}. ` +
        `Automatically substituted with '${adjustedStrategy}'.`
      );
    }

    // Vacuum: force climb milling direction
    const preferredDir = profile.preferred_direction;

    // Thin wall deflection warning for soft jaws / tombstone
    if (fp.min_wall_thickness_mm != null && fp.min_wall_thickness_mm < 5) {
      if (fixture_type === "soft_jaws" || fixture_type === "tombstone") {
        warnings.push(
          `Thin wall ${fp.min_wall_thickness_mm} mm detected — ` +
          `jaw deflection risk. Add backing support or reduce engagement.`
        );
      }
    }

    // Verify estimated cutting force vs holding force
    if (fp.estimated_cutting_force_n != null) {
      const maxAllowed = holdingForce / profile.safety_factor;
      if (fp.estimated_cutting_force_n > maxAllowed) {
        warnings.push(
          `Estimated cutting force ${fp.estimated_cutting_force_n} N exceeds safe limit ` +
          `(${maxAllowed.toFixed(0)} N = holding force ${holdingForce.toFixed(0)} N / SF ${profile.safety_factor}). ` +
          `Reduce feed, ae, or ap.`
        );
      }
    }

    return {
      original_strategy: strategy,
      adjusted_strategy: adjustedStrategy,
      strategy_changed: strategyChanged,
      max_ae_fraction: profile.max_ae_fraction,
      max_ap_mm: maxApMm,
      force_derating_factor: profile.force_derating,
      preferred_direction: preferredDir,
      blocked_strategies: profile.blocked_strategies,
      safety_factor: profile.safety_factor,
      fixture_holding_force_n: Math.round(holdingForce),
      notes,
      warnings,
    };
  }

  /**
   * Validate whether a strategy is compatible with a given fixture type.
   *
   * Returns a detailed issues list with severity ratings and derating factors
   * that scale down cutting parameters to safe levels.
   */
  validateForFixture(input: ValidateForFixtureInput): FixtureValidationResult {
    const {
      strategy, fixture_type,
      ae_mm, tool_diameter_mm, ap_mm,
      estimated_cutting_force_n,
      fixture_params: fp = {},
    } = input;
    const profile = FIXTURE_PROFILES[fixture_type];

    if (!profile) {
      throw new Error(`Unknown fixture type: ${fixture_type}`);
    }

    log.info(`[FixtureAwareStrategy] Validating '${strategy}' against '${fixture_type}'`);

    const issues: FixtureValidationResult["issues"] = [];
    let forceDerate = profile.force_derating;
    let aeDerate = 1.0;
    let apDerate = 1.0;
    let feedDerate = 1.0;

    // --- CRITICAL: Blocked strategy ---
    if (profile.blocked_strategies.includes(strategy as MachiningStrategy)) {
      issues.push({
        severity: "CRITICAL",
        code: "STRATEGY_BLOCKED",
        message: `Strategy '${strategy}' is incompatible with ${profile.name}.`,
        remedy: `Use one of: ${profile.preferred_strategies.join(", ")}.`,
      });
    }

    // --- CRITICAL: Vacuum / magnetic — ae limit ---
    if ((fixture_type === "vacuum" || fixture_type === "magnetic") && ae_mm != null && tool_diameter_mm != null) {
      const aeFraction = ae_mm / tool_diameter_mm;
      const maxFrac = profile.max_ae_fraction;
      if (aeFraction > maxFrac) {
        const required = ae_mm / tool_diameter_mm;
        aeDerate = maxFrac / required;
        issues.push({
          severity: "CRITICAL",
          code: "AE_EXCEEDS_FIXTURE_LIMIT",
          message: `ae = ${ae_mm} mm (${(aeFraction * 100).toFixed(0)}%D) exceeds ${profile.name} limit of ${(maxFrac * 100).toFixed(0)}%D.`,
          remedy: `Reduce ae to ≤ ${(tool_diameter_mm * maxFrac).toFixed(1)} mm.`,
        });
      }
    }

    // --- CRITICAL: Chuck — milling strategy selected for turning fixture ---
    if (
      (fixture_type === "chuck_3jaw" || fixture_type === "chuck_4jaw" ||
       fixture_type === "chuck_6jaw" || fixture_type === "collet") &&
      !["turning_roughing", "turning_finishing", "boring", "thread_turning"].includes(strategy)
    ) {
      issues.push({
        severity: "CRITICAL",
        code: "WRONG_OPERATION_TYPE",
        message: `Strategy '${strategy}' is a milling strategy; fixture '${fixture_type}' is for turning.`,
        remedy: "Switch to a turning strategy or change fixture type.",
      });
    }

    // --- WARNING: Discouraged strategy ---
    if (profile.discouraged_strategies.includes(strategy as MachiningStrategy)) {
      issues.push({
        severity: "WARNING",
        code: "STRATEGY_DISCOURAGED",
        message: `Strategy '${strategy}' is discouraged for ${profile.name} — higher risk of part movement.`,
        remedy: `Prefer: ${profile.preferred_strategies.join(", ")}.`,
      });
      forceDerate *= 0.85;
      feedDerate *= 0.90;
    }

    // --- WARNING: Cutting force vs holding capacity ---
    if (estimated_cutting_force_n != null) {
      let holdingForce = profile.max_holding_force_n;
      if (fixture_type === "vacuum") {
        const area = fp.vacuum_contact_area_cm2 ?? 200;
        const eta = fp.vacuum_seal_efficiency ?? 0.85;
        holdingForce = computeVacuumForce(area, eta);
      } else if (fixture_type === "magnetic") {
        holdingForce = computeMagneticForce(fp.magnetic_flux_density_t ?? 0.8, 0.01);
      }
      const maxSafe = holdingForce / profile.safety_factor;
      if (estimated_cutting_force_n > maxSafe) {
        const ratio = maxSafe / estimated_cutting_force_n;
        forceDerate = Math.min(forceDerate, ratio);
        feedDerate = Math.min(feedDerate, Math.sqrt(ratio)); // feed ~ sqrt of force ratio
        issues.push({
          severity: estimated_cutting_force_n > maxSafe * 1.5 ? "CRITICAL" : "WARNING",
          code: "FORCE_EXCEEDS_SAFE_LIMIT",
          message: `Estimated cutting force ${estimated_cutting_force_n} N > safe limit ${maxSafe.toFixed(0)} N (holding force / SF ${profile.safety_factor}).`,
          remedy: `Derate feed/ae by factor ${ratio.toFixed(2)} — target cutting force ≤ ${maxSafe.toFixed(0)} N.`,
        });
      }
    }

    // --- WARNING: Tombstone non-top face ---
    if (fixture_type === "tombstone" && fp.tombstone_non_top_face) {
      apDerate = Math.min(apDerate, 0.85);
      issues.push({
        severity: "WARNING",
        code: "TOMBSTONE_GRAVITY_DERATING",
        message: "Non-top tombstone face: gravity adds to cutting forces in Z direction.",
        remedy: "Reduce ap by 15%.",
      });
    }

    // --- WARNING: Thin wall + soft jaws ---
    if (
      fixture_type === "soft_jaws" &&
      fp.min_wall_thickness_mm != null &&
      fp.min_wall_thickness_mm < 5
    ) {
      issues.push({
        severity: "WARNING",
        code: "THIN_WALL_JAW_DEFLECTION",
        message: `Wall thickness ${fp.min_wall_thickness_mm} mm risks jaw deflection. Clamping force can distort thin sections.`,
        remedy: "Use a backing plug or reduce clamping torque to minimum required.",
      });
    }

    // --- INFO: Magnetic — ferrous chip contamination note ---
    if (fixture_type === "magnetic") {
      issues.push({
        severity: "INFO",
        code: "MAGNETIC_CHIP_CONTAMINATION",
        message: "Ferrous chips collect on magnetic chuck surface — clear chips frequently to prevent re-cutting and chuck field distortion.",
        remedy: "Use flood coolant to flush chips; verify chip conveyors are active.",
      });
    }

    // --- INFO: Fixture plate — bolt interference ---
    if (fixture_type === "fixture_plate" || fixture_type === "pallet") {
      issues.push({
        severity: "INFO",
        code: "BOLT_PATTERN_INTERFERENCE",
        message: "Verify toolpath does not intersect bolt heads, clamp bodies, or dowel pins.",
        remedy: "Define fixture avoidance zones in CAM and simulate.",
      });
    }

    // --- INFO: Vacuum — preferred milling direction ---
    if (fixture_type === "vacuum" && !["climb_milling", "trochoidal", "hsm_finishing", "contour_finishing", "scallop_finishing"].includes(strategy)) {
      issues.push({
        severity: "INFO",
        code: "VACUUM_DIRECTION_PREFERENCE",
        message: "Climb milling preferred for vacuum fixtures — radial force pushes part onto fixture rather than away.",
        remedy: "Set CAM to climb milling mode.",
      });
    }

    const valid = !issues.some(i => i.severity === "CRITICAL");

    // Overall derating = geometric mean
    const overallDerating = Math.pow(forceDerate * aeDerate * apDerate * feedDerate, 0.25);

    return {
      valid,
      strategy,
      fixture_type,
      issues,
      derating_factors: {
        force: Math.round(forceDerate * 100) / 100,
        ae: Math.round(aeDerate * 100) / 100,
        ap: Math.round(apDerate * 100) / 100,
        feed: Math.round(feedDerate * 100) / 100,
      },
      overall_derating: Math.round(overallDerating * 100) / 100,
    };
  }

  /**
   * Recommend the best fixture type(s) for a feature + strategy set.
   *
   * Scores each fixture against the feature requirements and strategy list,
   * returning a ranked list from best to worst.
   */
  recommendFixture(
    feature: FeatureForFixture,
    strategies: MachiningStrategy[],
  ): FixtureRecommendation[] {
    log.info(`[FixtureAwareStrategy] Recommending fixture for feature '${feature.type}' with ${strategies.length} strategies`);

    const results: FixtureRecommendation[] = [];

    for (const [fixtureKey, profile] of Object.entries(FIXTURE_PROFILES) as [FixtureType, FixtureProfile][]) {
      let score = 50; // base score
      const rationale: string[] = [];
      const constraints: string[] = [];

      // --- Filter: turning fixtures only for cylindrical / turning strategies ---
      const isTurningFixture = ["chuck_3jaw", "chuck_4jaw", "chuck_6jaw", "collet"].includes(fixtureKey);
      const isTurningFeature = feature.part_shape === "cylindrical" ||
        strategies.some(s => ["turning_roughing", "turning_finishing", "boring", "thread_turning"].includes(s));

      if (isTurningFixture && !isTurningFeature) {
        score -= 40;
        constraints.push("Turning fixture incompatible with milling feature.");
      }
      if (!isTurningFixture && isTurningFeature && feature.part_shape === "cylindrical") {
        score -= 30;
        constraints.push("Milling fixture not appropriate for turning operation.");
      }

      // --- Magnetic: requires ferrous material ---
      if (fixtureKey === "magnetic") {
        if (feature.ferrous === false) {
          score -= 60;
          constraints.push("Magnetic chuck requires ferrous workpiece — incompatible.");
        } else if (feature.ferrous === true) {
          score += 10;
          rationale.push("Ferrous material — magnetic chuck is viable.");
        }
        if (feature.material_iso_group === "N" || feature.material_iso_group === "S") {
          score -= 50; // non-ferrous or superalloys often non-magnetic
          constraints.push("ISO N/S materials (aluminum/superalloys) are typically non-magnetic.");
        }
      }

      // --- Vacuum: sensitive to material / surface finish ---
      if (fixtureKey === "vacuum") {
        if (feature.min_wall_thickness_mm != null && feature.min_wall_thickness_mm > 0.5) {
          score += 8;
          rationale.push("Vacuum suitable for flat, thin parts where conventional clamping would distort.");
        }
        if (feature.requires_finishing) {
          score += 5; // low clamping force doesn't distort finished dimensions
          rationale.push("Vacuum low clamping force preserves tight tolerances.");
        }
        // Not good for heavy material removal
        if (strategies.includes("aggressive_roughing")) {
          score -= 25;
          constraints.push("Vacuum cannot support aggressive roughing forces.");
        }
      }

      // --- Strategy compatibility scoring ---
      let compatibleCount = 0;
      let incompatibleCount = 0;
      const compatibleStrategies: MachiningStrategy[] = [];
      const incompatibleStrategies: MachiningStrategy[] = [];

      for (const s of strategies) {
        if (profile.blocked_strategies.includes(s as MachiningStrategy)) {
          incompatibleCount++;
          incompatibleStrategies.push(s);
        } else if (profile.preferred_strategies.includes(s as MachiningStrategy)) {
          compatibleCount += 2;
          compatibleStrategies.push(s);
        } else if (profile.discouraged_strategies.includes(s as MachiningStrategy)) {
          compatibleCount += 0.5;
          incompatibleCount++;
        } else {
          compatibleCount++;
          compatibleStrategies.push(s);
        }
      }

      if (strategies.length > 0) {
        const compatRatio = compatibleCount / (strategies.length * 2); // normalize against max
        score += Math.round(compatRatio * 30);
      }

      if (incompatibleCount > 0) {
        score -= incompatibleCount * 15;
        constraints.push(`${incompatibleCount} of ${strategies.length} strategies incompatible/blocked.`);
      }

      // --- Production volume: tombstone/pallet suit high volume ---
      if (feature.production_volume === "high_volume") {
        if (fixtureKey === "tombstone" || fixtureKey === "pallet") {
          score += 15;
          rationale.push("Tombstone/pallet excels for high-volume production with fast changeover.");
        }
        if (fixtureKey === "fixture_plate") {
          score += 8;
          rationale.push("Fixture plate good for repeated setups in production.");
        }
      }
      if (feature.production_volume === "single") {
        if (fixtureKey === "vise") {
          score += 10;
          rationale.push("Vise is fastest setup for one-off parts.");
        }
        if (fixtureKey === "tombstone" || fixtureKey === "pallet") {
          score -= 10;
          constraints.push("Tombstone/pallet setup time not justified for single part.");
        }
      }

      // --- Multi-setup: prefer rigid fixtures ---
      if (feature.setup_count != null && feature.setup_count > 2) {
        if (fixtureKey === "tombstone" || fixtureKey === "pallet" || fixtureKey === "fixture_plate") {
          score += 10;
          rationale.push("High rigidity fixture maintains accuracy across multiple setups.");
        }
      }

      // --- Finishing requirement: prefer low-distortion fixtures ---
      if (feature.requires_finishing) {
        if (fixtureKey === "soft_jaws" || fixtureKey === "collet" || fixtureKey === "chuck_6jaw") {
          score += 8;
          rationale.push("Conforming grip / 6-jaw / collet minimizes workpiece distortion during finish passes.");
        }
      }

      // --- Thin wall: prefer distributed clamping ---
      if (feature.min_wall_thickness_mm != null && feature.min_wall_thickness_mm < 3) {
        if (fixtureKey === "vacuum") {
          score += 10;
          rationale.push("Vacuum fixture distributes load without point clamping — ideal for thin walls.");
        }
        if (fixtureKey === "chuck_6jaw") {
          score += 8;
          rationale.push("6-jaw distributes clamping; preferred for thin-wall cylinders.");
        }
        if (fixtureKey === "vise") {
          score -= 5;
          constraints.push("Vise jaw point loading may distort very thin walls.");
        }
      }

      results.push({
        fixture_type: fixtureKey,
        score: Math.max(0, Math.min(100, score)),
        rank: 0, // assigned after sort
        rationale,
        constraints,
        setup_time_relative: profile.setup_time,
        suitable_strategies: compatibleStrategies,
        incompatible_strategies: incompatibleStrategies,
      });
    }

    // Sort by score descending, assign rank
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => { r.rank = i + 1; });

    return results;
  }
}

// Singleton export
export const fixtureAwareStrategyEngine = new FixtureAwareStrategyEngine();
