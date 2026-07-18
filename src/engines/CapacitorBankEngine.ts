/**
 * CapacitorBankEngine — Power factor correction capacitor bank sizing
 *
 * Models: Reactive power compensation, kVAR sizing,
 *         harmonic resonance check, step controller sizing
 * References: IEEE 1036, IEC 60831, NFPA 70
 */

export type CapacitorType = "fixed" | "switched" | "automatic";
export type ConnectionType = "delta" | "wye";

export interface CapacitorBankInput {
  real_power_kW: number;
  current_pf: number;                // 0-1, e.g. 0.75
  target_pf?: number;                // default 0.95
  voltage_V: number;                 // system voltage (line-line)
  frequency_Hz?: number;             // default 60
  harmonic_order?: number;           // dominant harmonic, default 5
  transformer_impedance_pct?: number; // Zsc %, default 5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CapacitorBankResult {
  required_kVAR: AtomicValue;
  capacitance_uF: AtomicValue;
  current_A: AtomicValue;
  apparent_power_before_kVA: AtomicValue;
  apparent_power_after_kVA: AtomicValue;
  demand_reduction_pct: AtomicValue;
  resonance_order: AtomicValue;
  energy_savings_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CapacitorBankEngine {
  calculate(input: CapacitorBankInput): CapacitorBankResult {
    const {
      real_power_kW: P,
      current_pf: pf1,
      target_pf: pf2 = 0.95,
      voltage_V: V,
      frequency_Hz: f = 60,
      harmonic_order: h_dom = 5,
      transformer_impedance_pct: Zsc = 5,
    } = input;

    const recs: string[] = [];

    // Required kVAR: Q = P × (tan(θ1) - tan(θ2))
    const theta1 = Math.acos(Math.min(pf1, 0.999));
    const theta2 = Math.acos(Math.min(pf2, 0.999));
    const Qc = P * (Math.tan(theta1) - Math.tan(theta2));

    // Capacitance (3-phase delta)
    const Xc = V * V / (Qc * 1000 + 1); // ohms
    const C_uF = 1e6 / (2 * Math.PI * f * Xc);

    // Current draw
    const Ic = Qc * 1000 / (Math.sqrt(3) * V);

    // Apparent power before/after
    const S1 = P / pf1;
    const S2 = P / pf2;

    // Demand reduction
    const demandReduction = (1 - S2 / S1) * 100;

    // Resonance check: h_r = sqrt(Ssc/Qc) where Ssc = S_transformer
    // Approximate: h_r = sqrt(100/Zsc × S_base/Qc)
    const Ssc = S1 * 100 / Zsc; // short circuit MVA (approximate)
    const h_res = Math.sqrt(Ssc / Math.max(Qc, 0.001));

    // Energy savings (reduced I²R losses)
    const savingsPct = (1 - Math.pow(pf1 / pf2, 2)) * 100 * 0.03; // ~3% of losses proportional

    const isSafe = Qc > 0 && Math.abs(h_res - h_dom) > 0.5;

    if (Math.abs(h_res - h_dom) < 1) recs.push(`Resonance risk: h_r=${h_res.toFixed(1)} near ${h_dom}th harmonic — use detuned reactor`);
    if (pf1 > pf2) recs.push(`Current PF ${pf1} already exceeds target ${pf2}`);
    if (Qc > P * 0.8) recs.push(`Large correction ${Qc.toFixed(0)}kVAR — use automatic stepped bank`);
    if (pf2 > 0.98) recs.push(`Target PF ${pf2} very high — risk of leading PF at light load`);
    if (recs.length === 0) recs.push(`PFC nominal — ${Qc.toFixed(0)}kVAR, PF ${pf1}→${pf2}, demand -${demandReduction.toFixed(0)}%`);

    return {
      required_kVAR: mkAv(Math.round(Qc * 10) / 10, "kVAR", Qc * 0.05, "tan_diff"),
      capacitance_uF: mkAv(Math.round(C_uF * 10) / 10, "µF", C_uF * 0.05, "Xc_calc"),
      current_A: mkAv(Math.round(Ic * 10) / 10, "A", Ic * 0.05, "QcV"),
      apparent_power_before_kVA: mkAv(Math.round(S1 * 10) / 10, "kVA", S1 * 0.03, "P_pf"),
      apparent_power_after_kVA: mkAv(Math.round(S2 * 10) / 10, "kVA", S2 * 0.03, "P_pf"),
      demand_reduction_pct: mkAv(Math.round(demandReduction * 10) / 10, "%", demandReduction * 0.10, "S_ratio"),
      resonance_order: mkAv(Math.round(h_res * 10) / 10, "order", h_res * 0.10, "Ssc_Qc"),
      energy_savings_pct: mkAv(Math.round(savingsPct * 100) / 100, "%", savingsPct * 0.20, "I2R"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const capacitorBankEngine = new CapacitorBankEngine();
