/**
 * FlywheelEngine — Flywheel energy storage and sizing
 *
 * Models: Kinetic energy (E=½Iω²), coefficient of fluctuation,
 *         stress at rim (σ=ρω²r²), material limits
 * References: Shigley Ch.16, Norton Machine Design
 * Safety: Burst speed, hoop stress, critical speed
 */

export type FlywheelShape = "solid_disk" | "rimmed" | "spoked";

export interface FlywheelInput {
  energy_storage_kJ: number;
  speed_rpm: number;
  fluctuation_coefficient?: number;     // default 0.02
  material_density_kg_m3?: number;      // default 7200 (cast iron)
  tensile_strength_MPa?: number;        // default 250
  shape?: FlywheelShape;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FlywheelResult {
  outer_diameter_mm: AtomicValue;
  mass_kg: AtomicValue;
  moment_of_inertia_kg_m2: AtomicValue;
  rim_stress_MPa: AtomicValue;
  tip_speed_m_s: AtomicValue;
  burst_speed_rpm: AtomicValue;
  thickness_mm: AtomicValue;
  speed_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FlywheelEngine {
  calculate(input: FlywheelInput): FlywheelResult {
    const {
      energy_storage_kJ: E_kJ,
      speed_rpm: N,
      fluctuation_coefficient: Cf = 0.02,
      material_density_kg_m3: rho = 7200,
      tensile_strength_MPa: Sut = 250,
      shape = "rimmed",
    } = input;

    const recs: string[] = [];
    const omega = 2 * Math.PI * N / 60;
    const E = E_kJ * 1000; // J

    // Energy = ½ × I × ω² × Cf (energy change over one cycle)
    // Total stored E = ½ × I × ω²
    const I = 2 * E / (omega * omega); // kg·m²

    // For rimmed flywheel: I ≈ m × R²
    // For solid disk: I = ½ × m × R²
    const Ifactor = shape === "solid_disk" ? 0.5 : shape === "rimmed" ? 0.9 : 0.7;

    // Size: choose R, then compute mass
    // Rim stress σ = ρ × ω² × R² → R_max = √(σ_allow / (ρ × ω²))
    const SF = 4; // safety factor for burst
    const sigmaAllow = Sut / SF;
    const Rmax = Math.sqrt(sigmaAllow * 1e6 / (rho * omega * omega));
    const R = Math.min(Rmax * 0.8, Math.pow(I / (Ifactor * rho * Math.PI * 0.05), 0.25)); // constrain by I and stress
    const R_final = Math.max(R, 0.05); // minimum 50mm

    const mass = I / (Ifactor * R_final * R_final);
    const D = 2 * R_final * 1000; // mm

    // Thickness for disk/rim
    const rimWidth = D * 0.15; // mm
    const thickness = mass / (rho * Math.PI * R_final * 2 * (rimWidth / 1000)) * 1000;

    // Rim stress
    const rimStress = rho * omega * omega * R_final * R_final / 1e6; // MPa

    // Tip speed
    const tipSpeed = omega * R_final;

    // Burst speed
    const burstSpeed = N * Math.sqrt(Sut / rimStress);

    const isSafe = rimStress < sigmaAllow && tipSpeed < 200;

    if (rimStress > sigmaAllow * 0.8) recs.push(`High rim stress ${rimStress.toFixed(0)}MPa — increase diameter or use stronger material`);
    if (tipSpeed > 150) recs.push(`High tip speed ${tipSpeed.toFixed(0)}m/s — containment required`);
    if (N > burstSpeed * 0.7) recs.push(`Speed ${N}rpm near burst ${burstSpeed.toFixed(0)}rpm — insufficient margin`);
    if (mass > 5000) recs.push(`Heavy flywheel ${mass.toFixed(0)}kg — verify bearing and foundation`);
    if (recs.length === 0) recs.push(`Flywheel nominal — D=${D.toFixed(0)}mm, ${mass.toFixed(0)}kg, ${E_kJ}kJ at ${N}rpm`);

    return {
      outer_diameter_mm: mkAv(Math.round(D), "mm", D * 0.05, "stress_energy"),
      mass_kg: mkAv(Math.round(mass * 10) / 10, "kg", mass * 0.08, "inertia_radius"),
      moment_of_inertia_kg_m2: mkAv(Math.round(I * 100) / 100, "kg·m²", I * 0.05, "energy_speed"),
      rim_stress_MPa: mkAv(Math.round(rimStress * 10) / 10, "MPa", rimStress * 0.08, "hoop_stress"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.05, "geometry"),
      burst_speed_rpm: mkAv(Math.round(burstSpeed), "rpm", burstSpeed * 0.10, "stress_limit"),
      thickness_mm: mkAv(Math.round(thickness), "mm", thickness * 0.10, "mass_geometry"),
      speed_ratio: mkAv(Math.round(N / burstSpeed * 100) / 100, "ratio", 0.02, "safety_margin"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const flywheelEngine = new FlywheelEngine();
