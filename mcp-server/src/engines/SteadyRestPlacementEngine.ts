/**
 * SteadyRestPlacementEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Optimizes steady rest placement for long slender workpieces.
 * Prevents excessive deflection and vibration during turning.
 *
 * Models: beam deflection analysis, optimal placement positions,
 * contact force calculation, and multi-support scenarios.
 *
 * Actions: steady_rest_place, steady_rest_deflection, steady_rest_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type SteadyRestType = "fixed" | "traveling" | "follow" | "hydraulic";

export interface SteadyRestInput {
  workpiece_length_mm: number;
  workpiece_diameter_mm: number;
  workpiece_mass_kg: number;
  material_E_GPa: number;
  chuck_to_tailstock_mm: number;
  cutting_force_radial_N: number;
  cutting_position_mm: number;         // from chuck face
  spindle_rpm: number;
  length_to_diameter_ratio: number;    // L/D
  max_deflection_um: number;           // tolerance-driven limit
  steady_rest_type: SteadyRestType;
}

export interface SteadyRestResult {
  num_supports_needed: number;
  support_positions_mm: number[];      // from chuck face
  deflection_without_um: number;
  deflection_with_um: number;
  contact_force_per_jaw_N: number;
  surface_speed_at_contact_m_per_min: number;
  support_diameter_mm: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SteadyRestPlacementEngine {
  place(input: SteadyRestInput): SteadyRestResult {
    const L = input.chuck_to_tailstock_mm / 1000; // meters
    const d = input.workpiece_diameter_mm / 1000;
    const E = input.material_E_GPa * 1e9;
    const I = (Math.PI * d ** 4) / 64;
    const F = input.cutting_force_radial_N;
    const a = input.cutting_position_mm / 1000; // force position from chuck

    // Deflection without support (simply supported beam with point load)
    // delta = F * a * (L-a)^2 * (2*L*a - a^2 - (L-a)^2) ... simplified:
    // delta_max ≈ F * L^3 / (48 * E * I) for mid-span load
    const deflWithout = L > 0 && I > 0
      ? (F * a * (L - a) ** 2) / (3 * E * I * L) * ((2 * L * a - a * a) / (L * L))
      : 0;
    const deflWithoutUm = Math.abs(deflWithout) * 1e6;

    // Number of supports needed based on L/D ratio
    // Rule of thumb: L/D > 6 → 1 support, L/D > 12 → 2, L/D > 20 → 3
    const LD = input.length_to_diameter_ratio;
    const numSupports = LD > 20 ? 3 : LD > 12 ? 2 : LD > 6 ? 1 : 0;

    // Optimal placement: divide span equally
    const positions: number[] = [];
    if (numSupports > 0) {
      const spacing = input.chuck_to_tailstock_mm / (numSupports + 1);
      for (let i = 1; i <= numSupports; i++) {
        positions.push(Math.round(spacing * i));
      }
    }

    // Deflection with supports (each support divides the span)
    const maxSpan = numSupports > 0
      ? input.chuck_to_tailstock_mm / (numSupports + 1) / 1000
      : L;
    const deflWith = maxSpan > 0 && I > 0
      ? (F * maxSpan ** 3) / (48 * E * I)
      : deflWithout;
    const deflWithUm = Math.abs(deflWith) * 1e6;

    // Contact force per jaw (3-jaw steady rest, distributed radially)
    // Each jaw supports F/3 of the reaction + workpiece weight at that point
    const weightPerSupport = (input.workpiece_mass_kg * 9.81) / (numSupports + 2); // +2 for chuck and tailstock
    const contactForce = (F / 3 + weightPerSupport) / 3; // per jaw of 3-jaw steady rest

    // Surface speed at contact point
    const surfaceSpeed = Math.PI * input.workpiece_diameter_mm * input.spindle_rpm / 1000;

    // Recommendations
    const recs: string[] = [];
    if (numSupports === 0 && deflWithoutUm > input.max_deflection_um) {
      recs.push(`L/D=${LD.toFixed(1)} with ${deflWithoutUm.toFixed(0)}µm deflection exceeds limit — add steady rest`);
    }
    if (numSupports > 0 && deflWithUm > input.max_deflection_um) {
      recs.push(`Even with ${numSupports} support(s), deflection ${deflWithUm.toFixed(0)}µm exceeds ${input.max_deflection_um}µm — add more supports or reduce force`);
    }
    if (input.steady_rest_type === "fixed" && surfaceSpeed > 100) {
      recs.push("High surface speed at fixed steady rest — use roller-type jaws with lubrication");
    }
    if (input.steady_rest_type === "traveling") {
      recs.push("Traveling steady rest follows tool — optimal for full-length turning");
    }
    if (contactForce > 500) {
      recs.push("High contact force — risk of marking workpiece; use soft jaws or reduce cutting force");
    }
    if (recs.length === 0 && numSupports > 0) {
      recs.push(`${numSupports} steady rest(s) placed — deflection reduced from ${deflWithoutUm.toFixed(0)}µm to ${deflWithUm.toFixed(0)}µm`);
    }
    if (recs.length === 0) {
      recs.push("No steady rest needed — workpiece stiffness adequate");
    }

    return {
      num_supports_needed: numSupports,
      support_positions_mm: positions,
      deflection_without_um: Math.round(deflWithoutUm * 10) / 10,
      deflection_with_um: Math.round(deflWithUm * 10) / 10,
      contact_force_per_jaw_N: Math.round(contactForce * 10) / 10,
      surface_speed_at_contact_m_per_min: Math.round(surfaceSpeed * 10) / 10,
      support_diameter_mm: input.workpiece_diameter_mm,
      recommendations: recs,
    };
  }
}

export const steadyRestPlacementEngine = new SteadyRestPlacementEngine();
