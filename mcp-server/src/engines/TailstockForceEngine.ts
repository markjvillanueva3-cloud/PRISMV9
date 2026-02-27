/**
 * TailstockForceEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Calculates required tailstock force for between-centers turning.
 * Insufficient tailstock force causes workpiece ejection.
 * Excessive force causes center hole damage and thermal seizure.
 *
 * Models: axial cutting force, workpiece weight sag, center contact
 * pressure, thermal expansion, and live vs dead center dynamics.
 *
 * Actions: tailstock_calc, tailstock_validate, tailstock_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type CenterType = "live" | "dead" | "half_center" | "pipe_center";

export interface TailstockInput {
  center_type: CenterType;
  center_point_angle_deg: number;     // typically 60°
  workpiece_mass_kg: number;
  workpiece_length_mm: number;
  workpiece_diameter_mm: number;
  chuck_to_tailstock_mm: number;
  spindle_rpm: number;
  cutting_force_axial_N: number;
  cutting_force_radial_N: number;
  cutting_position_from_chuck_mm: number; // where tool contacts
  center_hole_diameter_mm: number;
  material_thermal_expansion?: number;  // µm/m/°C (default steel: 12)
}

export interface TailstockResult {
  required_force_N: number;
  recommended_force_N: number;
  center_contact_pressure_MPa: number;
  workpiece_sag_um: number;            // max deflection without tailstock
  deflection_with_support_um: number;
  thermal_growth_um: number;
  max_force_before_damage_N: number;
  is_safe: boolean;
  live_center_recommended: boolean;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Center point contact area approximation
const CENTER_CONTACT_AREA_MM2 = (holeDia: number, angleDeg: number): number => {
  const r = holeDia / 2;
  const halfAngle = angleDeg / 2 * Math.PI / 180;
  return Math.PI * r * r / Math.sin(halfAngle) * 0.3; // effective contact band
};

// Max contact pressure before center hole yields (for steel)
const MAX_CENTER_PRESSURE_MPA = 800; // hardened center in medium carbon steel

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TailstockForceEngine {
  calculate(input: TailstockInput): TailstockResult {
    const L = input.chuck_to_tailstock_mm / 1000; // meters
    const d = input.workpiece_diameter_mm / 1000;
    const m = input.workpiece_mass_kg;
    const g = 9.81;

    // Workpiece sag without tailstock support (simply supported beam)
    // delta_max = 5 * w * L^4 / (384 * E * I)
    const E = 210e9; // steel
    const I = (Math.PI * d ** 4) / 64;
    const w = m * g / L; // distributed weight per meter
    const sag = L > 0 && I > 0 ? (5 * w * L ** 4) / (384 * E * I) : 0;
    const sagUm = sag * 1e6;

    // Axial force component: cutting force pushes workpiece away from tailstock
    const axialForce = input.cutting_force_axial_N;

    // Weight support: tailstock must support portion of workpiece weight
    const weightAtTailstock = m * g * (1 - input.cutting_position_from_chuck_mm / input.chuck_to_tailstock_mm);

    // Radial force creates moment: requires additional axial preload
    const momentForce = input.cutting_force_radial_N * 0.3; // approximate axial component

    // Total required force
    const requiredForce = axialForce + weightAtTailstock + momentForce;

    // Safety factor 2.0 for tailstock
    const recommendedForce = requiredForce * 2.0;

    // Center contact pressure
    const contactArea = CENTER_CONTACT_AREA_MM2(input.center_hole_diameter_mm, input.center_point_angle_deg);
    const contactPressure = contactArea > 0 ? recommendedForce / contactArea : 0;

    // Max force before center hole damage
    const maxForce = contactArea * MAX_CENTER_PRESSURE_MPA;

    // Thermal growth: workpiece expands during cutting
    const thermalCoeff = input.material_thermal_expansion || 12; // µm/m/°C
    const tempRise = input.center_type === "dead" ? 30 : 10; // dead center generates more heat
    const thermalGrowth = thermalCoeff * (input.chuck_to_tailstock_mm / 1000) * tempRise;

    // Deflection with tailstock support (much less than sag)
    const deflWithSupport = sagUm * 0.1; // tailstock reduces sag ~90%

    // Safety assessment
    const isSafe = recommendedForce <= maxForce && contactPressure < MAX_CENTER_PRESSURE_MPA;

    // Live center recommendation
    const liveCenterRec = input.spindle_rpm > 1500 || input.center_type === "dead" && input.spindle_rpm > 800;

    // Recommendations
    const recs: string[] = [];
    if (!isSafe) {
      recs.push(`SAFETY: Required force ${recommendedForce.toFixed(0)}N exceeds center hole capacity ${maxForce.toFixed(0)}N`);
      recs.push("Increase center hole diameter or reduce cutting forces");
    }
    if (input.center_type === "dead" && input.spindle_rpm > 800) {
      recs.push("Dead center at high RPM — risk of thermal seizure; switch to live center");
    }
    if (thermalGrowth > 50) {
      recs.push(`Thermal growth ${thermalGrowth.toFixed(0)}µm — use spring-loaded tailstock or re-clamp during cuts`);
    }
    if (sagUm > 100) {
      recs.push(`Workpiece sag ${sagUm.toFixed(0)}µm without support — steady rest recommended at midpoint`);
    }
    if (contactPressure > MAX_CENTER_PRESSURE_MPA * 0.8) {
      recs.push("Center hole near pressure limit — reduce tailstock force or enlarge center hole");
    }
    if (recs.length === 0) {
      recs.push("Tailstock force adequate — safe to proceed");
    }

    return {
      required_force_N: Math.round(requiredForce),
      recommended_force_N: Math.round(recommendedForce),
      center_contact_pressure_MPa: Math.round(contactPressure * 10) / 10,
      workpiece_sag_um: Math.round(sagUm * 10) / 10,
      deflection_with_support_um: Math.round(deflWithSupport * 10) / 10,
      thermal_growth_um: Math.round(thermalGrowth * 10) / 10,
      max_force_before_damage_N: Math.round(maxForce),
      is_safe: isSafe,
      live_center_recommended: liveCenterRec,
      recommendations: recs,
    };
  }

  validate(input: TailstockInput): { safe: boolean; message: string } {
    const result = this.calculate(input);
    return {
      safe: result.is_safe,
      message: result.is_safe
        ? `Tailstock force ${result.recommended_force_N}N is adequate`
        : `UNSAFE: ${result.recommendations[0]}`,
    };
  }
}

export const tailstockForceEngine = new TailstockForceEngine();
