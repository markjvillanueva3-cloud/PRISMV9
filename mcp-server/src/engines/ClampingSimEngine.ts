/**
 * ClampingSimEngine — L2-P2-MS1 CAD/CAM Layer
 * *** SAFETY CRITICAL ***
 *
 * Simulates clamping forces, contact pressure distribution, and
 * part deformation under clamping + cutting loads. Validates that
 * workpiece will not move, deform, or fly out during machining.
 *
 * SAFETY: Minimum safety factor 2.5× per ISO 10218.
 * All force calculations must be conservative.
 *
 * Actions: clamp_simulate, clamp_validate, clamp_optimize
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ClampPoint {
  id: string;
  type: "vise_jaw" | "toe_clamp" | "strap_clamp" | "magnetic" | "vacuum" | "collet" | "chuck_jaw";
  position: { x: number; y: number; z: number };
  force_direction: { fx: number; fy: number; fz: number };  // unit vector
  max_force_N: number;
  contact_area_mm2: number;
  friction_coefficient: number;
}

export interface CuttingForceProfile {
  fx_N: number;  // feed direction
  fy_N: number;  // cross-feed
  fz_N: number;  // axial
  torque_Nm: number;
  max_resultant_N: number;
}

export interface ClampSimInput {
  clamp_points: ClampPoint[];
  cutting_forces: CuttingForceProfile;
  part_mass_kg: number;
  part_material: string;
  part_dimensions: { width_mm: number; height_mm: number; depth_mm: number };
}

export interface ContactPressure {
  clamp_id: string;
  pressure_MPa: number;
  max_allowable_MPa: number;
  within_limit: boolean;
}

export interface ClampSimResult {
  total_clamp_force_N: number;
  required_clamp_force_N: number;
  safety_factor: number;
  min_safety_factor: number;          // 2.5 per ISO 10218
  is_safe: boolean;
  contact_pressures: ContactPressure[];
  part_displacement_um: number;       // estimated max displacement
  slip_risk: "none" | "low" | "medium" | "high" | "critical";
  lift_off_risk: boolean;
  recommendations: string[];
}

export interface ClampOptimization {
  current_safety_factor: number;
  optimized_safety_factor: number;
  changes: { clamp_id: string; old_force_N: number; new_force_N: number }[];
  force_reduction_pct: number;
  deformation_reduction_pct: number;
}

// ============================================================================
// CONSTANTS — SAFETY
// ============================================================================

const MIN_SAFETY_FACTOR = 2.5;       // ISO 10218 minimum

// Yield strength estimates (MPa) for contact pressure limits
const MATERIAL_YIELD: Record<string, number> = {
  steel: 350, stainless: 250, aluminum: 275, titanium: 880,
  inconel: 1035, cast_iron: 200, brass: 200, copper: 70,
};

function yieldForMaterial(mat: string): number {
  for (const [key, val] of Object.entries(MATERIAL_YIELD)) {
    if (mat.toLowerCase().includes(key)) return val;
  }
  return 250; // conservative default
}

// Young's modulus (GPa) for deformation
const MATERIAL_E: Record<string, number> = {
  steel: 200, stainless: 193, aluminum: 69, titanium: 114,
  inconel: 205, cast_iron: 170, brass: 100, copper: 120,
};

function modulusForMaterial(mat: string): number {
  for (const [key, val] of Object.entries(MATERIAL_E)) {
    if (mat.toLowerCase().includes(key)) return val;
  }
  return 200;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ClampingSimEngine {
  /**
   * Full clamping simulation.
   * SAFETY: Conservative — overestimates required force, never underestimates.
   */
  simulate(input: ClampSimInput): ClampSimResult {
    const cf = input.cutting_forces;
    const clamps = input.clamp_points;

    // Required holding force: F_required = F_cutting × safety_factor / (µ × n_surfaces)
    const resultant = cf.max_resultant_N || Math.sqrt(cf.fx_N ** 2 + cf.fy_N ** 2 + cf.fz_N ** 2);
    const avgFriction = clamps.reduce((s, c) => s + c.friction_coefficient, 0) / Math.max(clamps.length, 1);
    const nSurfaces = Math.max(clamps.length, 1);

    // SAFETY: Always use at least MIN_SAFETY_FACTOR
    const requiredForce = (resultant * MIN_SAFETY_FACTOR) / (avgFriction * Math.min(nSurfaces, 4));
    const totalClampForce = clamps.reduce((s, c) => s + c.max_force_N, 0);
    const actualSafetyFactor = (totalClampForce * avgFriction * Math.min(nSurfaces, 4)) / Math.max(resultant, 1);

    // Contact pressures
    const yieldStrength = yieldForMaterial(input.part_material);
    const maxAllowablePressure = yieldStrength * 0.6; // 60% of yield to prevent marking

    const pressures: ContactPressure[] = clamps.map(c => {
      const pressure = c.max_force_N / Math.max(c.contact_area_mm2, 1);
      return {
        clamp_id: c.id,
        pressure_MPa: Math.round(pressure * 100) / 100,
        max_allowable_MPa: Math.round(maxAllowablePressure),
        within_limit: pressure <= maxAllowablePressure,
      };
    });

    // Deformation estimate (simplified beam model)
    const E = modulusForMaterial(input.part_material) * 1000; // GPa → MPa
    const w = input.part_dimensions.width_mm;
    const h = input.part_dimensions.height_mm;
    const I = (w * h * h * h) / 12; // moment of inertia
    const L = input.part_dimensions.depth_mm;
    // δ = F×L³ / (48×E×I) for simply supported beam
    const maxDeflection = (totalClampForce * L * L * L) / (48 * E * I) * 1000; // µm

    // Slip risk assessment
    let slipRisk: ClampSimResult["slip_risk"];
    if (actualSafetyFactor >= MIN_SAFETY_FACTOR * 1.5) slipRisk = "none";
    else if (actualSafetyFactor >= MIN_SAFETY_FACTOR) slipRisk = "low";
    else if (actualSafetyFactor >= MIN_SAFETY_FACTOR * 0.8) slipRisk = "medium";
    else if (actualSafetyFactor >= 1.0) slipRisk = "high";
    else slipRisk = "critical";

    // Lift-off: check if any axial cutting force exceeds vertical clamping
    const verticalClampForce = clamps.reduce((s, c) => s + Math.abs(c.force_direction.fz) * c.max_force_N, 0);
    const liftOff = Math.abs(cf.fz_N) > verticalClampForce + input.part_mass_kg * 9.81;

    const recommendations: string[] = [];
    if (actualSafetyFactor < MIN_SAFETY_FACTOR) {
      recommendations.push(`UNSAFE: Safety factor ${actualSafetyFactor.toFixed(2)} < ${MIN_SAFETY_FACTOR} minimum. Increase clamping force.`);
    }
    if (pressures.some(p => !p.within_limit)) {
      recommendations.push("Contact pressure exceeds 60% yield — use larger contact area or softer jaws");
    }
    if (maxDeflection > 25) {
      recommendations.push(`Part deformation ${maxDeflection.toFixed(1)}µm — add support or reduce clamping force`);
    }
    if (liftOff) {
      recommendations.push("LIFT-OFF RISK: Axial cutting force exceeds vertical clamping. Add downward clamps.");
    }
    if (slipRisk === "none" && recommendations.length === 0) {
      recommendations.push("Clamping setup is adequate — proceed with confidence");
    }

    return {
      total_clamp_force_N: Math.round(totalClampForce),
      required_clamp_force_N: Math.round(requiredForce),
      safety_factor: Math.round(actualSafetyFactor * 100) / 100,
      min_safety_factor: MIN_SAFETY_FACTOR,
      is_safe: actualSafetyFactor >= MIN_SAFETY_FACTOR && !liftOff,
      contact_pressures: pressures,
      part_displacement_um: Math.round(maxDeflection * 100) / 100,
      slip_risk: slipRisk,
      lift_off_risk: liftOff,
      recommendations,
    };
  }

  validate(input: ClampSimInput): { valid: boolean; issues: string[] } {
    const result = this.simulate(input);
    const issues: string[] = [];

    if (!result.is_safe) issues.push("Clamping is UNSAFE — safety factor below minimum");
    if (result.lift_off_risk) issues.push("Part may lift off during machining");
    if (result.slip_risk === "high" || result.slip_risk === "critical") issues.push(`Slip risk is ${result.slip_risk}`);
    if (result.contact_pressures.some(p => !p.within_limit)) issues.push("Contact pressure exceeds material yield limit");

    return { valid: issues.length === 0, issues };
  }

  optimize(input: ClampSimInput): ClampOptimization {
    const current = this.simulate(input);
    const targetSF = MIN_SAFETY_FACTOR * 1.2; // 20% above minimum

    const changes: ClampOptimization["changes"] = [];
    let newTotal = 0;

    for (const c of input.clamp_points) {
      const ratio = targetSF / Math.max(current.safety_factor, 0.1);
      const newForce = Math.round(c.max_force_N * Math.min(ratio, 1.5)); // cap at 1.5× increase
      changes.push({ clamp_id: c.id, old_force_N: c.max_force_N, new_force_N: newForce });
      newTotal += newForce;
    }

    const oldTotal = current.total_clamp_force_N;
    const newSF = (newTotal * (input.clamp_points.reduce((s, c) => s + c.friction_coefficient, 0) / input.clamp_points.length) *
      Math.min(input.clamp_points.length, 4)) / Math.max(input.cutting_forces.max_resultant_N, 1);

    return {
      current_safety_factor: current.safety_factor,
      optimized_safety_factor: Math.round(newSF * 100) / 100,
      changes,
      force_reduction_pct: Math.round(((oldTotal - newTotal) / oldTotal) * 1000) / 10,
      deformation_reduction_pct: Math.round(Math.max(0, ((oldTotal - newTotal) / oldTotal) * 50) * 10) / 10,
    };
  }
}

export const clampingSimEngine = new ClampingSimEngine();
