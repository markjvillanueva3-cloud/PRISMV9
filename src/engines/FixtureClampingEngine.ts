/**
 * FixtureClampingEngine — Fixture clamping force analysis.
 *
 * Computes required clamping force to resist cutting forces considering:
 * - Kienzle cutting forces (Fc, Ff, Fr)
 * - Friction coefficient at clamp-workpiece interface
 * - Safety factor for dynamic loading
 * - Multiple clamp positions and force directions
 * - Part lifting/sliding/rotation checks
 * - Deformation risk from over-clamping thin walls
 *
 * Ref: ASME Y14.5-2018, Hoffman (Jigs & Fixtures Design).
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface ClampPosition {
  x_mm: number;
  y_mm: number;
  direction: "down" | "side_x" | "side_y";
  max_force_n?: number;
}

export interface FixtureInput {
  cutting_forces: {
    tangential_n: number;      // Fc — main cutting force
    feed_n: number;            // Ff — feed force (typically 0.3-0.5 × Fc)
    radial_n: number;          // Fr — radial/passive force (typically 0.2-0.4 × Fc)
    torque_nm?: number;        // spindle torque for rotating operations
  };
  workpiece: {
    material: "steel" | "aluminum" | "cast_iron" | "titanium" | "plastic";
    mass_kg: number;
    width_mm: number;
    length_mm: number;
    height_mm: number;
    min_wall_thickness_mm?: number;
  };
  fixture: {
    type: "vise" | "clamps" | "chuck" | "vacuum" | "magnetic" | "custom";
    friction_coefficient?: number;
    clamp_positions?: ClampPosition[];
    jaw_width_mm?: number;      // for vise
    chuck_diameter_mm?: number; // for chuck
  };
  safety_factor?: number;       // default 2.0
  operation: "milling" | "turning" | "drilling" | "grinding";
}

export interface ClampForceResult {
  required_clamping_force_n: number;
  per_clamp_force_n: number;
  num_clamps: number;
  safety_factor_applied: number;
  friction_coefficient: number;
  checks: {
    sliding: { safe: boolean; margin_pct: number };
    lifting: { safe: boolean; margin_pct: number };
    rotation: { safe: boolean; margin_pct: number };
  };
  deformation_risk: {
    risk_level: "none" | "low" | "medium" | "high";
    contact_pressure_mpa: number;
    yield_limit_mpa: number;
    thin_wall_deflection_mm?: number;
  };
  recommendations: string[];
}

const FRICTION: Record<string, number> = {
  steel: 0.15, aluminum: 0.12, cast_iron: 0.18, titanium: 0.14, plastic: 0.10,
};

const YIELD: Record<string, number> = {
  steel: 350, aluminum: 200, cast_iron: 250, titanium: 800, plastic: 40,
};

const E_MOD: Record<string, number> = {
  steel: 210000, aluminum: 70000, cast_iron: 120000, titanium: 114000, plastic: 3000,
};

export class FixtureClampingEngine {
  compute(input: FixtureInput): AtomicValue<ClampForceResult> {
    const { cutting_forces: cf, workpiece: wp, fixture: fix, operation } = input;
    const sf = input.safety_factor ?? 2.0;
    const mu = fix.friction_coefficient ?? FRICTION[wp.material] ?? 0.15;

    // Resultant horizontal force (tends to slide workpiece)
    const Fh = Math.sqrt(cf.tangential_n ** 2 + cf.feed_n ** 2);
    // Vertical force (tends to lift workpiece)
    const Fv = cf.radial_n;
    // Gravity
    const Fg = wp.mass_kg * 9.81;

    // Number of clamps
    const numClamps = fix.clamp_positions?.length ||
      (fix.type === "vise" ? 2 : fix.type === "chuck" ? 3 : fix.type === "vacuum" ? 1 : 4);

    // --- Sliding check ---
    // Clamping force needed: F_clamp × μ × n_clamps ≥ F_horizontal × SF
    const slidingForce = (Fh * sf) / (mu * numClamps);

    // --- Lifting check ---
    // F_clamp × n_clamps + F_gravity ≥ F_vertical × SF
    const liftingForce = Math.max(0, (Fv * sf - Fg) / numClamps);

    // --- Rotation check (moment about fixture edge) ---
    const armLength = wp.length_mm / 2; // cutting force arm
    const clampArm = wp.width_mm / 3; // clamp arm (1/3 from edge)
    const momentForce = (cf.tangential_n * armLength * sf) / (numClamps * clampArm);

    // Required force is the maximum of all three
    const requiredTotal = Math.max(slidingForce, liftingForce, momentForce) * numClamps;
    const perClamp = requiredTotal / numClamps;

    // Safety margins
    const slidingMargin = ((mu * perClamp * numClamps) / (Fh * sf) - 1) * 100;
    const liftingMargin = ((perClamp * numClamps + Fg) / (Fv * sf) - 1) * 100;
    const rotationMargin = ((perClamp * numClamps * clampArm) / (cf.tangential_n * armLength * sf) - 1) * 100;

    // Deformation check
    const jawWidth = fix.jaw_width_mm ?? 20;
    const contactArea = jawWidth * Math.min(wp.height_mm, 30); // mm²
    const contactPressure = perClamp / contactArea; // MPa
    const yieldLimit = YIELD[wp.material] ?? 350;

    let riskLevel: "none" | "low" | "medium" | "high" = "none";
    if (contactPressure > yieldLimit * 0.8) riskLevel = "high";
    else if (contactPressure > yieldLimit * 0.5) riskLevel = "medium";
    else if (contactPressure > yieldLimit * 0.3) riskLevel = "low";

    // Thin wall deflection
    let thinWallDeflection: number | undefined;
    if (wp.min_wall_thickness_mm && wp.min_wall_thickness_mm < 5) {
      const E = E_MOD[wp.material] ?? 210000;
      const t = wp.min_wall_thickness_mm;
      const h = wp.height_mm;
      // Simplified plate bending: δ = F × h³ / (3 × E × (w × t³ / 12))
      const I = jawWidth * t * t * t / 12;
      thinWallDeflection = (perClamp * h * h * h) / (3 * E * I);
      if (thinWallDeflection > 0.05) riskLevel = "high";
      else if (thinWallDeflection > 0.02) riskLevel = riskLevel === "none" ? "medium" : riskLevel;
    }

    const recs: string[] = [];
    if (riskLevel === "high") {
      recs.push(`High deformation risk — contact pressure ${contactPressure.toFixed(0)} MPa vs yield ${yieldLimit} MPa. Use soft jaws or more clamps.`);
    }
    if (thinWallDeflection && thinWallDeflection > 0.02) {
      recs.push(`Thin wall deflection ${(thinWallDeflection * 1000).toFixed(0)}μm — consider vacuum/wax fixturing or support backing.`);
    }
    if (fix.type === "vacuum" && cf.tangential_n > 500) {
      recs.push("Vacuum fixture may be insufficient for forces >500N — consider mechanical clamping assist.");
    }
    if (mu < 0.12) {
      recs.push("Low friction coefficient — use serrated jaws or abrasive pads to increase grip.");
    }
    if (perClamp > 10000) {
      recs.push(`Per-clamp force ${perClamp.toFixed(0)}N — verify clamp/bolt capacity. M8 bolt limit ≈ 10kN.`);
    }
    if (numClamps < 3 && operation === "milling") {
      recs.push("Consider adding a third clamp for milling stability.");
    }

    return {
      value: {
        required_clamping_force_n: Math.round(requiredTotal),
        per_clamp_force_n: Math.round(perClamp),
        num_clamps: numClamps,
        safety_factor_applied: sf,
        friction_coefficient: mu,
        checks: {
          sliding: { safe: slidingMargin >= 0, margin_pct: Math.round(Math.max(0, slidingMargin)) },
          lifting: { safe: liftingMargin >= 0, margin_pct: Math.round(Math.max(0, liftingMargin)) },
          rotation: { safe: rotationMargin >= 0, margin_pct: Math.round(Math.max(0, rotationMargin)) },
        },
        deformation_risk: {
          risk_level: riskLevel,
          contact_pressure_mpa: Math.round(contactPressure * 10) / 10,
          yield_limit_mpa: yieldLimit,
          thin_wall_deflection_mm: thinWallDeflection ? Math.round(thinWallDeflection * 10000) / 10000 : undefined,
        },
        recommendations: recs,
      },
      unit: "N",
      formula: "F_clamp = max(F_slide, F_lift, F_moment) × SF / (μ × n)",
      confidence: 0.82,
    };
  }
}

export const fixtureClampingEngine = new FixtureClampingEngine();
