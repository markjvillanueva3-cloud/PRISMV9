/**
 * UltrasonicWeldingEngine — Ultrasonic welding/bonding analysis
 *
 * Models: Power requirement from amplitude/frequency/impedance,
 *         weld energy, joint strength, horn design
 * References: Branson Ultrasonics, AWS G1.6
 */

export type USWMaterial = "ABS" | "PP" | "PE" | "nylon" | "PC" | "PMMA" | "PVC" | "metal_foil";
export type JointDesign = "butt" | "shear" | "energy_director" | "step" | "tongue_groove";

export interface UltrasonicWeldingInput {
  material?: USWMaterial;
  material_thickness_mm: number;
  weld_area_mm2: number;
  frequency_kHz?: number;            // default 20
  amplitude_um?: number;             // default 30
  weld_time_s?: number;              // default 0.5
  pressure_MPa?: number;             // default 1
  joint_design?: JointDesign;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface UltrasonicWeldingResult {
  weld_energy_J: AtomicValue;
  power_W: AtomicValue;
  horn_velocity_m_s: AtomicValue;
  interface_temperature_C: AtomicValue;
  weld_strength_MPa: AtomicValue;
  energy_density_J_mm2: AtomicValue;
  near_field_ratio: AtomicValue;
  cycle_time_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [melt_temp_C, specific_heat_J_gK, density_g_cm3, weld_strength_factor, impedance_factor]
const MATERIAL_DATA: Record<USWMaterial, [number, number, number, number, number]> = {
  ABS:        [220, 1.4, 1.05, 0.85, 1.0],
  PP:         [165, 1.9, 0.91, 0.70, 0.6],
  PE:         [130, 2.3, 0.95, 0.60, 0.5],
  nylon:      [260, 1.7, 1.14, 0.90, 1.2],
  PC:         [260, 1.2, 1.20, 0.80, 1.1],
  PMMA:       [160, 1.5, 1.18, 0.75, 0.9],
  PVC:        [180, 0.9, 1.40, 0.65, 0.8],
  metal_foil: [660, 0.9, 2.70, 0.95, 3.0], // aluminum
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class UltrasonicWeldingEngine {
  calculate(input: UltrasonicWeldingInput): UltrasonicWeldingResult {
    const {
      material = "ABS",
      material_thickness_mm: t,
      weld_area_mm2: A,
      frequency_kHz: f = 20,
      amplitude_um: amp = 30,
      weld_time_s: wt = 0.5,
      pressure_MPa: P = 1,
      joint_design = "energy_director",
    } = input;

    const recs: string[] = [];
    const [Tm, cp, rho, strengthFactor, impedanceFactor] = MATERIAL_DATA[material];

    // Horn velocity
    const hornVelocity = 2 * Math.PI * f * 1000 * (amp / 1e6); // m/s

    // Power: P = F × v × impedance_factor
    const force = P * A; // N (MPa × mm² = N)
    const power = force * hornVelocity * impedanceFactor;

    // Weld energy
    const energy = power * wt;

    // Energy density
    const energyDensity = energy / A;

    // Interface temperature estimate
    const weldVolume = A * 0.2; // mm³ (thin melt layer ~0.2mm)
    const mass = weldVolume * rho / 1000; // grams
    const tempRise = energy / (mass * cp + 0.001);
    const interfaceTemp = Math.min(Tm * 1.5, 25 + tempRise);

    // Weld strength
    const jointFactor = joint_design === "energy_director" ? 1.0 :
      joint_design === "shear" ? 0.9 : joint_design === "step" ? 0.85 :
      joint_design === "tongue_groove" ? 0.95 : 0.7;
    const weldStrength = Tm / 10 * strengthFactor * jointFactor; // simplified MPa estimate

    // Near/far field ratio (thickness / wavelength)
    const wavelength = 5000 / (f + 1) * impedanceFactor; // mm (approximate)
    const nfRatio = t / wavelength;

    // Total cycle time (weld + hold + cool)
    const cycleTime = wt + 0.3 + t * 0.1;

    const isSafe = interfaceTemp > Tm * 0.8 && interfaceTemp < Tm * 1.5 && power < 5000;

    if (interfaceTemp < Tm * 0.8) recs.push(`Interface temp ${interfaceTemp.toFixed(0)}°C < melt ${Tm}°C — increase amplitude or time`);
    if (nfRatio > 1) recs.push(`Far-field welding (t/${wavelength.toFixed(0)}mm) — use higher frequency or energy director`);
    if (material === "PE" || material === "PP") recs.push(`Semi-crystalline ${material} — requires higher amplitude, use shear joint`);
    if (f === 20 && t < 1) recs.push(`Thin material ${t}mm — consider 40kHz for better control`);
    if (power > 3000) recs.push(`High power ${power.toFixed(0)}W — check horn cooling`);
    if (recs.length === 0) recs.push(`USW nominal — ${power.toFixed(0)}W, ${energy.toFixed(1)}J, T_if=${interfaceTemp.toFixed(0)}°C`);

    return {
      weld_energy_J: mkAv(Math.round(energy * 100) / 100, "J", energy * 0.10, "Pt"),
      power_W: mkAv(Math.round(power), "W", power * 0.10, "Fv"),
      horn_velocity_m_s: mkAv(Math.round(hornVelocity * 1000) / 1000, "m/s", hornVelocity * 0.05, "2pif_amp"),
      interface_temperature_C: mkAv(Math.round(interfaceTemp), "°C", interfaceTemp * 0.15, "energy_mass"),
      weld_strength_MPa: mkAv(Math.round(weldStrength * 10) / 10, "MPa", weldStrength * 0.20, "empirical"),
      energy_density_J_mm2: mkAv(Math.round(energyDensity * 1000) / 1000, "J/mm²", energyDensity * 0.15, "E_A"),
      near_field_ratio: mkAv(Math.round(nfRatio * 100) / 100, "ratio", nfRatio * 0.15, "t_lambda"),
      cycle_time_s: mkAv(Math.round(cycleTime * 100) / 100, "s", cycleTime * 0.10, "weld_hold_cool"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ultrasonicWeldingEngine = new UltrasonicWeldingEngine();
