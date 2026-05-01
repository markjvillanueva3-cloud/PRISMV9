/**
 * MagneticBearingEngine — Active magnetic bearing (AMB) analysis
 *
 * Models: Electromagnetic force, stiffness, PID control bandwidth,
 *         power loss, rotor dynamics, backup bearing sizing
 * References: Schweitzer & Maslen, ISO 14839, API 617
 */

export type AMBType = "active_radial" | "active_axial" | "passive_radial" | "hybrid" | "superconducting";
export type RotorMaterial = "steel_4340" | "steel_4140" | "titanium" | "inconel" | "aluminum";

export interface MagneticBearingInput {
  type?: AMBType;
  rotor_material?: RotorMaterial;
  rotor_mass_kg: number;
  rotor_diameter_mm: number;
  max_speed_rpm: number;
  static_load_N?: number;          // default = rotor weight
  air_gap_mm?: number;             // default 0.5
  coil_turns?: number;             // default 200
  max_current_A?: number;          // default 10
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface MagneticBearingResult {
  max_force_N: AtomicValue;
  stiffness_N_mm: AtomicValue;
  power_loss_W: AtomicValue;
  critical_speed_rpm: AtomicValue;
  control_bandwidth_Hz: AtomicValue;
  backup_bearing_load_kN: AtomicValue;
  rotor_surface_speed_m_s: AtomicValue;
  force_margin: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const ROTOR_MAT: Record<RotorMaterial, [number, number, number]> = {
  // [density_kg/m3, yield_MPa, modulus_GPa]
  steel_4340:  [7850, 860, 200],
  steel_4140:  [7850, 655, 200],
  titanium:    [4430, 880, 114],
  inconel:     [8440, 550, 205],
  aluminum:    [2700, 480, 70],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class MagneticBearingEngine {
  calculate(input: MagneticBearingInput): MagneticBearingResult {
    const {
      type = "active_radial",
      rotor_material = "steel_4340",
      rotor_mass_kg: m,
      rotor_diameter_mm: D,
      max_speed_rpm: N,
      air_gap_mm: g = 0.5,
      coil_turns: turns = 200,
      max_current_A: Imax = 10,
    } = input;

    const staticLoad = input.static_load_N ?? m * 9.81;
    const recs: string[] = [];
    const [rho, sigmaY, E] = ROTOR_MAT[rotor_material];

    const mu0 = 4 * Math.PI * 1e-7;
    const gapM = g / 1000;
    const R = D / 2000;

    // Pole face area (typical 4-pole, each ~30° arc)
    const poleArc = Math.PI / 6; // 30°
    const poleLength = D / 1000 * 0.4; // axial length ~40% of diameter
    const Apole = poleArc * R * poleLength;
    const numPoles = type === "active_axial" ? 2 : 4;

    // Electromagnetic force: F = μ₀ × N² × I² × A / (4 × g²) per pole pair
    const forcePole = mu0 * turns * turns * Imax * Imax * Apole / (4 * gapM * gapM);
    const maxForce = forcePole * (numPoles / 2); // pole pairs

    // Passive/superconducting multipliers
    const typeMult = type === "superconducting" ? 2.5 : type === "passive_radial" ? 0.3 : 1.0;
    const totalForce = maxForce * typeMult;

    // Stiffness: dF/dx ≈ 2F/g (linearized)
    const stiffness = 2 * totalForce / gapM / 1000; // N/mm

    // Power loss: copper loss + eddy current
    const resistance = 0.02 * turns; // rough: 20mΩ per turn
    const biasCurrent = Imax * 0.3; // bias ~30% of max
    const copperLoss = numPoles * biasCurrent * biasCurrent * resistance;
    const eddyLoss = 0.01 * copperLoss * N / 10000; // scales with speed
    const totalLoss = copperLoss + eddyLoss;

    // Critical speed (rigid rotor on magnetic springs)
    const kTotal = stiffness * 1000 * 2; // 2 bearings, N/m
    const criticalFreq = Math.sqrt(kTotal / m) / (2 * Math.PI); // Hz
    const criticalRPM = criticalFreq * 60;

    // Control bandwidth (rule: >10× highest disturbance frequency)
    const bandwidth = criticalFreq * 3; // Hz, typical AMB control

    // Rotor surface speed
    const surfSpeed = Math.PI * D / 1000 * N / 60;

    // Backup bearing: rated for 2× static + 1× dynamic (drop event)
    const dropForce = m * 9.81 * 5; // 5g decel
    const backupLoad = (staticLoad * 2 + dropForce) / 1000; // kN

    // Force margin
    const margin = totalForce / (staticLoad + 0.001);

    const isSafe = margin > 2 && surfSpeed < 250 && g > 0.2;

    if (margin < 3) recs.push(`Force margin ${margin.toFixed(1)}× — increase coil current or pole area`);
    if (surfSpeed > 200) recs.push(`Surface speed ${surfSpeed.toFixed(0)}m/s — rotor containment needed`);
    if (N > criticalRPM * 0.8 && N < criticalRPM * 1.2) recs.push(`Operating near critical speed ${criticalRPM.toFixed(0)}rpm — add notch filter`);
    if (g < 0.3) recs.push(`Small air gap ${g}mm — tight tolerances, thermal growth risk`);
    if (type === "passive_radial") recs.push(`Passive radial — Earnshaw's theorem requires active axial control`);
    if (recs.length === 0) recs.push(`AMB nominal — F=${totalForce.toFixed(0)}N, k=${stiffness.toFixed(0)}N/mm, Nc=${criticalRPM.toFixed(0)}rpm`);

    return {
      max_force_N: mkAv(Math.round(totalForce * 10) / 10, "N", totalForce * 0.15, "maxwell_stress"),
      stiffness_N_mm: mkAv(Math.round(stiffness * 10) / 10, "N/mm", stiffness * 0.20, "dF_dx"),
      power_loss_W: mkAv(Math.round(totalLoss * 10) / 10, "W", totalLoss * 0.25, "copper_eddy"),
      critical_speed_rpm: mkAv(Math.round(criticalRPM), "rpm", criticalRPM * 0.10, "sqrt_k_m"),
      control_bandwidth_Hz: mkAv(Math.round(bandwidth), "Hz", bandwidth * 0.15, "3x_critical"),
      backup_bearing_load_kN: mkAv(Math.round(backupLoad * 100) / 100, "kN", backupLoad * 0.20, "drop_event"),
      rotor_surface_speed_m_s: mkAv(Math.round(surfSpeed * 10) / 10, "m/s", surfSpeed * 0.01, "piDN"),
      force_margin: mkAv(Math.round(margin * 100) / 100, "ratio", margin * 0.15, "Fmax_Fstatic"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const magneticBearingEngine = new MagneticBearingEngine();
