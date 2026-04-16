/**
 * DrumBrakeEngine — Drum brake design & thermal analysis
 *
 * Models: Braking torque (T=μ×F×r×2sinα), shoe factor,
 *         thermal capacity, fade temperature
 * References: SAE J866, Limpert brake design
 */

export type ShoeType = "leading" | "trailing" | "duo_servo" | "leading_trailing";

export interface DrumBrakeInput {
  drum_diameter_mm: number;
  drum_width_mm: number;
  shoe_type?: ShoeType;
  actuation_force_N: number;
  friction_coefficient?: number;    // default 0.35
  vehicle_mass_kg?: number;         // default 1500
  initial_speed_km_h?: number;      // default 60
  shoe_arc_deg?: number;            // default 120
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface DrumBrakeResult {
  braking_torque_Nm: AtomicValue;
  shoe_factor: AtomicValue;
  lining_pressure_MPa: AtomicValue;
  heat_generated_kJ: AtomicValue;
  drum_temp_rise_C: AtomicValue;
  deceleration_m_s2: AtomicValue;
  stopping_distance_m: AtomicValue;
  thermal_capacity_kJ_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Shoe factors for different configurations
const SHOE_FACTORS: Record<ShoeType, [number, number]> = {
  leading: [1.8, 0.6],              // [leading, trailing]
  trailing: [0.6, 0.6],
  leading_trailing: [1.8, 0.6],
  duo_servo: [2.5, 2.0],
};

export class DrumBrakeEngine {
  calculate(input: DrumBrakeInput): DrumBrakeResult {
    const {
      drum_diameter_mm: D,
      drum_width_mm: W,
      shoe_type = "leading_trailing",
      actuation_force_N: Fa,
      friction_coefficient: mu = 0.35,
      vehicle_mass_kg: m = 1500,
      initial_speed_km_h: v0 = 60,
      shoe_arc_deg: arc = 120,
    } = input;

    const recs: string[] = [];
    const r = D / 2000; // drum radius in m
    const arcRad = arc * Math.PI / 180;

    // Shoe factor calculation
    const [sfLead, sfTrail] = SHOE_FACTORS[shoe_type];
    const totalShoe = sfLead + sfTrail;

    // Braking torque per drum
    const torque = mu * Fa * r * totalShoe;

    // Lining contact area
    const liningArea = r * 1000 * arcRad * W / 1e6; // m² (one shoe)
    const totalArea = liningArea * 2; // both shoes
    const liningPressure = Fa * totalShoe / (totalArea * 1e6); // MPa

    // Kinetic energy to absorb (per brake, assuming 4-wheel vehicle, 2 drums rear = 30%)
    const v0ms = v0 / 3.6;
    const KE = 0.5 * m * v0ms * v0ms * 0.30 / 2; // per drum (30% rear, 2 drums)

    // Drum thermal mass (cast iron: ρ=7200, Cp=460)
    const drumVol = Math.PI * D / 1000 * W / 1000 * 0.008; // approximate wall volume
    const drumMass = drumVol * 7200;
    const thermalCap = drumMass * 460 / 1000; // kJ/°C
    const tempRise = KE / 1000 / thermalCap;

    // Deceleration
    const totalBrakeForce = torque / r * 4 / totalShoe; // approximate 4-wheel contribution
    const decel = totalBrakeForce / m;
    const stoppingDist = v0ms * v0ms / (2 * Math.max(decel, 0.1));

    const isSafe = liningPressure < 2.0 && tempRise < 200 && decel > 3;

    if (liningPressure > 1.5) recs.push(`High lining pressure ${liningPressure.toFixed(2)}MPa — wear concern`);
    if (tempRise > 150) recs.push(`High temp rise ${tempRise.toFixed(0)}°C — fade risk`);
    if (decel < 5) recs.push(`Low deceleration ${decel.toFixed(1)}m/s² — increase drum size or actuation`);
    if (mu > 0.45) recs.push(`High friction coefficient ${mu} — verify thermal stability`);
    if (recs.length === 0) recs.push(`Drum brake nominal — T=${torque.toFixed(0)}Nm, SF=${totalShoe.toFixed(1)}, ΔT=${tempRise.toFixed(0)}°C`);

    return {
      braking_torque_Nm: mkAv(Math.round(torque), "Nm", torque * 0.08, "shoe_factor"),
      shoe_factor: mkAv(Math.round(totalShoe * 100) / 100, "ratio", totalShoe * 0.05, "geometry"),
      lining_pressure_MPa: mkAv(Math.round(liningPressure * 100) / 100, "MPa", liningPressure * 0.10, "area_force"),
      heat_generated_kJ: mkAv(Math.round(KE / 1000 * 10) / 10, "kJ", KE / 1000 * 0.05, "kinetic_energy"),
      drum_temp_rise_C: mkAv(Math.round(tempRise), "°C", tempRise * 0.15, "thermal_mass"),
      deceleration_m_s2: mkAv(Math.round(decel * 10) / 10, "m/s²", decel * 0.10, "newton"),
      stopping_distance_m: mkAv(Math.round(stoppingDist * 10) / 10, "m", stoppingDist * 0.10, "kinematics"),
      thermal_capacity_kJ_C: mkAv(Math.round(thermalCap * 100) / 100, "kJ/°C", thermalCap * 0.08, "cast_iron"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const drumBrakeEngine = new DrumBrakeEngine();
