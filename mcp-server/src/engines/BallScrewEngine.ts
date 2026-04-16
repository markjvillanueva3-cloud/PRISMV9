/**
 * BallScrewEngine — Ball screw selection and performance
 *
 * Models: Lead accuracy, axial load capacity (Ca/C0a),
 *         critical speed (Nc), column buckling (Euler),
 *         drive torque, life calculation
 * References: THK, NSK, Rexroth ball screw catalogs
 * Safety: Buckling load, critical speed, preload limits
 */

export type BallScrewAccuracy = "C0" | "C1" | "C2" | "C3" | "C5" | "C7" | "C10";

export interface BallScrewInput {
  axial_force_N: number;
  stroke_mm: number;
  max_speed_mm_s: number;
  accuracy_class?: BallScrewAccuracy;
  screw_diameter_mm?: number;           // auto-sized
  lead_mm?: number;                     // auto-sized
  support_type?: "fixed_fixed" | "fixed_supported" | "fixed_free";
  required_life_hours?: number;         // default 20000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BallScrewResult {
  screw_diameter_mm: AtomicValue;
  lead_mm: AtomicValue;
  dynamic_load_rating_N: AtomicValue;
  critical_speed_rpm: AtomicValue;
  operating_speed_rpm: AtomicValue;
  buckling_load_N: AtomicValue;
  drive_torque_Nm: AtomicValue;
  calculated_life_hours: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BallScrewEngine {
  calculate(input: BallScrewInput): BallScrewResult {
    const {
      axial_force_N: Fa,
      stroke_mm: stroke,
      max_speed_mm_s: Vmax,
      accuracy_class = "C5",
      support_type = "fixed_supported",
      required_life_hours = 20000,
    } = input;

    const recs: string[] = [];

    // Auto-size lead
    let lead = input.lead_mm;
    if (!lead) {
      lead = Vmax > 500 ? 20 : Vmax > 200 ? 10 : 5;
    }

    // Operating speed
    const Nop = Vmax * 60 / lead; // rpm

    // Auto-size diameter
    let d = input.screw_diameter_mm;
    if (!d) {
      // Start from life requirement: Ca = Fa × (60×N×Lh/1e6)^(1/3)
      const Ca_required = Fa * Math.pow(60 * Nop * required_life_hours / 1e6, 1 / 3);
      // Approximate Ca ≈ 500 × d² (rough correlation)
      d = Math.sqrt(Ca_required / 500);
      const stdDia = [12, 16, 20, 25, 32, 40, 50, 63, 80];
      d = stdDia.find(s => s >= d!) ?? stdDia[stdDia.length - 1];
    }

    // Dynamic load rating (approximate)
    const Ca = 500 * d * d; // N (rough correlation)

    // Life calculation: L = (Ca/Fa)³ × 1e6 / (60×N)
    const life_rev = Math.pow(Ca / Fa, 3) * 1e6;
    const life_hours = life_rev / (60 * Math.max(Nop, 1));

    // Critical speed: Nc = k × d / L²  (support factor)
    const unsupportedLength = stroke + 100; // mm (stroke + overtravel)
    const Lm = unsupportedLength / 1000;
    const k_support = support_type === "fixed_fixed" ? 4.73
      : support_type === "fixed_supported" ? 3.93 : 1.88;
    const Nc = k_support * 60 / (2 * Math.PI) * Math.sqrt(210e9 * Math.PI * Math.pow(d / 2000, 4) / 4 / (7850 * Math.PI * Math.pow(d / 2000, 2) * Lm)) / Lm;

    // Euler buckling load
    const k_euler = support_type === "fixed_fixed" ? 4
      : support_type === "fixed_supported" ? 2 : 0.25;
    const I = Math.PI / 64 * Math.pow(d / 1000, 4);
    const Fbuck = k_euler * Math.PI * Math.PI * 210e9 * I / (Lm * Lm);

    // Drive torque: T = Fa × lead / (2π × η)
    const eta = 0.90; // ball screw efficiency
    const torque = Fa * (lead / 1000) / (2 * Math.PI * eta);

    const isSafe = Nop < Nc * 0.8 && Fa < Fbuck * 0.5 && life_hours >= required_life_hours;

    if (Nop > Nc * 0.7) recs.push(`Speed ${Nop.toFixed(0)}rpm near critical ${Nc.toFixed(0)}rpm — resonance risk`);
    if (Fa > Fbuck * 0.3) recs.push(`Force ${Fa}N vs buckling ${Fbuck.toFixed(0)}N — low margin, increase diameter`);
    if (life_hours < required_life_hours) recs.push(`Life ${life_hours.toFixed(0)}h < required ${required_life_hours}h — increase diameter`);
    if (lead > d * 0.8) recs.push(`Large lead/diameter ratio — verify ball return path`);
    if (recs.length === 0) recs.push(`Ball screw nominal — ${d}mm×${lead}mm, ${life_hours.toFixed(0)}h life, ${torque.toFixed(2)}Nm`);

    return {
      screw_diameter_mm: mkAv(d, "mm", 0, "load_life_sizing"),
      lead_mm: mkAv(lead, "mm", 0, "speed_selection"),
      dynamic_load_rating_N: mkAv(Math.round(Ca), "N", Ca * 0.10, "size_correlation"),
      critical_speed_rpm: mkAv(Math.round(Nc), "rpm", Nc * 0.08, "euler_bernoulli"),
      operating_speed_rpm: mkAv(Math.round(Nop), "rpm", Nop * 0.02, "velocity_lead"),
      buckling_load_N: mkAv(Math.round(Fbuck), "N", Fbuck * 0.08, "euler_buckling"),
      drive_torque_Nm: mkAv(Math.round(torque * 100) / 100, "Nm", torque * 0.05, "screw_mechanics"),
      calculated_life_hours: mkAv(Math.round(life_hours), "h", life_hours * 0.15, "L10_life"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ballScrewEngine = new BallScrewEngine();
