/**
 * ShockAbsorberEngine — Hydraulic shock absorber design
 *
 * Models: Damping force (F=c×v), valve characteristics,
 *         rebound/compression ratio, thermal dissipation
 * References: Dixon shock absorber design, SAE J2561
 */

export type DamperType = "twin_tube" | "mono_tube" | "position_sensitive" | "external_reservoir";

export interface ShockAbsorberInput {
  piston_diameter_mm: number;
  rod_diameter_mm: number;
  stroke_mm: number;
  max_velocity_m_s?: number;          // default 0.5
  damper_type?: DamperType;           // default twin_tube
  compression_ratio?: number;         // C/R ratio, default 0.3
  sprung_mass_kg?: number;            // default 400 (quarter car)
  spring_rate_N_mm?: number;          // default 30
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ShockAbsorberResult {
  compression_damping_Ns_m: AtomicValue;
  rebound_damping_Ns_m: AtomicValue;
  max_damping_force_N: AtomicValue;
  critical_damping_Ns_m: AtomicValue;
  damping_ratio: AtomicValue;
  natural_frequency_Hz: AtomicValue;
  heat_dissipation_W: AtomicValue;
  oil_volume_cc: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ShockAbsorberEngine {
  calculate(input: ShockAbsorberInput): ShockAbsorberResult {
    const {
      piston_diameter_mm: Dp,
      rod_diameter_mm: Dr,
      stroke_mm: S,
      max_velocity_m_s: Vmax = 0.5,
      damper_type = "twin_tube",
      compression_ratio: CR = 0.3,
      sprung_mass_kg: ms = 400,
      spring_rate_N_mm: ks = 30,
    } = input;

    const recs: string[] = [];

    // Piston areas
    const Ap = Math.PI / 4 * Math.pow(Dp / 1000, 2); // m²
    const Ar = Math.PI / 4 * Math.pow(Dr / 1000, 2); // m²
    const Aeff = Ap - Ar; // effective area difference

    // Natural frequency and critical damping
    const kSI = ks * 1000; // N/m
    const wn = Math.sqrt(kSI / ms); // rad/s
    const fn = wn / (2 * Math.PI); // Hz
    const Cc = 2 * ms * wn; // critical damping (Ns/m)

    // Target damping ratio (0.2-0.4 typical)
    const zetaTarget = damper_type === "mono_tube" ? 0.30 : 0.25;
    const reboundDamping = Cc * zetaTarget * 2; // rebound dominates
    const compressionDamping = reboundDamping * CR;

    // Max force
    const maxForce = reboundDamping * Vmax;

    // Heat dissipation (at max velocity, sinusoidal approximation)
    const heatDiss = 0.5 * reboundDamping * Vmax * Vmax * (1 + CR) / 2;

    // Oil volume
    const oilVol = Ap * S / 1000 * 1e6 * 1.5; // cc (1.5× piston displacement)
    const oilVolAdj = damper_type === "mono_tube" ? oilVol * 0.8 : oilVol;

    const isSafe = fn > 0.5 && fn < 3.0 && zetaTarget > 0.15 && zetaTarget < 0.5;

    if (fn < 0.8) recs.push(`Low natural freq ${fn.toFixed(2)}Hz — soft ride, poor control`);
    if (fn > 2.0) recs.push(`High natural freq ${fn.toFixed(2)}Hz — harsh ride`);
    if (maxForce > 5000) recs.push(`High max force ${maxForce.toFixed(0)}N — check mount strength`);
    if (heatDiss > 500) recs.push(`High heat dissipation ${heatDiss.toFixed(0)}W — thermal fade risk`);
    if (Dr / Dp < 0.3) recs.push(`Thin rod ratio ${(Dr / Dp).toFixed(2)} — buckling risk`);
    if (recs.length === 0) recs.push(`Damper nominal — ζ=${zetaTarget}, fn=${fn.toFixed(2)}Hz, Fmax=${maxForce.toFixed(0)}N`);

    return {
      compression_damping_Ns_m: mkAv(Math.round(compressionDamping), "Ns/m", compressionDamping * 0.10, "target_ratio"),
      rebound_damping_Ns_m: mkAv(Math.round(reboundDamping), "Ns/m", reboundDamping * 0.10, "critical_fraction"),
      max_damping_force_N: mkAv(Math.round(maxForce), "N", maxForce * 0.10, "c_times_v"),
      critical_damping_Ns_m: mkAv(Math.round(Cc), "Ns/m", Cc * 0.05, "2mwn"),
      damping_ratio: mkAv(zetaTarget, "ratio", 0.02, "design_target"),
      natural_frequency_Hz: mkAv(Math.round(fn * 100) / 100, "Hz", fn * 0.05, "sqrt_k_m"),
      heat_dissipation_W: mkAv(Math.round(heatDiss), "W", heatDiss * 0.15, "power_avg"),
      oil_volume_cc: mkAv(Math.round(oilVolAdj), "cc", oilVolAdj * 0.10, "displacement"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const shockAbsorberEngine = new ShockAbsorberEngine();
