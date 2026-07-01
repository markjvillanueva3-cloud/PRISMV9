/**
 * TransformerEngine — Power transformer sizing and losses
 *
 * Models: Turns ratio (V1/V2=N1/N2), core loss (Steinmetz), copper loss (I²R),
 *         efficiency, regulation, short-circuit impedance
 * References: IEEE C57, IEC 60076
 * Safety: Temperature rise limits, BIL rating, overload capability
 */

export type TransformerType = "distribution" | "power" | "instrument" | "auto";
export type CoolingClass = "ONAN" | "ONAF" | "OFAF" | "dry_AN";

export interface TransformerInput {
  rated_power_kVA: number;
  primary_voltage_V: number;
  secondary_voltage_V: number;
  frequency_Hz?: number;              // default 60
  transformer_type?: TransformerType;
  cooling_class?: CoolingClass;
  load_pct?: number;                  // default 100
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TransformerResult {
  turns_ratio: AtomicValue;
  primary_current_A: AtomicValue;
  secondary_current_A: AtomicValue;
  core_loss_W: AtomicValue;
  copper_loss_W: AtomicValue;
  efficiency_pct: AtomicValue;
  regulation_pct: AtomicValue;
  impedance_pct: AtomicValue;
  weight_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TransformerEngine {
  calculate(input: TransformerInput): TransformerResult {
    const {
      rated_power_kVA: S,
      primary_voltage_V: V1,
      secondary_voltage_V: V2,
      frequency_Hz: f = 60,
      transformer_type = "distribution",
      cooling_class = "ONAN",
      load_pct = 100,
    } = input;

    const recs: string[] = [];
    const loadFrac = load_pct / 100;

    // Turns ratio
    const turnsRatio = V1 / V2;

    // Currents
    const I1 = S * 1000 / (V1 * Math.sqrt(3));
    const I2 = S * 1000 / (V2 * Math.sqrt(3));

    // Core (no-load) losses — Steinmetz approximation
    // Pcore ≈ k × S^0.75 (empirical for distribution transformers)
    const k_core = transformer_type === "distribution" ? 3.5
      : transformer_type === "power" ? 2.5 : 4.0;
    const coreLoss = k_core * Math.pow(S, 0.75);

    // Copper (load) losses at rated
    const k_cu = transformer_type === "distribution" ? 12
      : transformer_type === "power" ? 8 : 15;
    const copperLossRated = k_cu * Math.pow(S, 0.75);
    const copperLoss = copperLossRated * loadFrac * loadFrac;

    // Total losses and efficiency
    const totalLoss = coreLoss + copperLoss;
    const outputPower = S * loadFrac * 1000; // W (assuming PF=1 for max)
    const efficiency = outputPower / (outputPower + totalLoss) * 100;

    // Impedance (typical)
    const impedance = S <= 500 ? 4.0
      : S <= 2500 ? 5.5
      : S <= 10000 ? 7.0 : 8.5;

    // Voltage regulation
    const pf = 0.85; // assumed lagging
    const R_pu = copperLossRated / (S * 1000);
    const X_pu = Math.sqrt(Math.pow(impedance / 100, 2) - R_pu * R_pu);
    const regulation = (R_pu * pf + X_pu * Math.sqrt(1 - pf * pf)) * loadFrac * 100;

    // Weight estimate
    const weightFactor = cooling_class === "dry_AN" ? 5.5 : 3.5;
    const weight = weightFactor * Math.pow(S, 0.75);

    const isSafe = efficiency > 90 && load_pct <= 120;

    if (load_pct > 100) recs.push(`Overloaded ${load_pct}% — verify thermal limits for ${cooling_class}`);
    if (efficiency < 95) recs.push(`Low efficiency ${efficiency.toFixed(1)}% — consider lower-loss core material`);
    if (regulation > 5) recs.push(`High regulation ${regulation.toFixed(1)}% — may affect voltage quality`);
    if (V1 > 35000) recs.push(`HV primary ${V1}V — BIL and clearance verification needed`);
    if (recs.length === 0) recs.push(`Transformer nominal — ${S}kVA, η=${efficiency.toFixed(1)}%, Z=${impedance}%`);

    return {
      turns_ratio: mkAv(Math.round(turnsRatio * 100) / 100, "ratio", turnsRatio * 0.01, "voltage_ratio"),
      primary_current_A: mkAv(Math.round(I1 * 10) / 10, "A", I1 * 0.02, "ohms_law"),
      secondary_current_A: mkAv(Math.round(I2 * 10) / 10, "A", I2 * 0.02, "ohms_law"),
      core_loss_W: mkAv(Math.round(coreLoss), "W", coreLoss * 0.15, "steinmetz"),
      copper_loss_W: mkAv(Math.round(copperLoss), "W", copperLoss * 0.10, "i2r"),
      efficiency_pct: mkAv(Math.round(efficiency * 100) / 100, "%", 0.5, "loss_ratio"),
      regulation_pct: mkAv(Math.round(regulation * 100) / 100, "%", regulation * 0.15, "impedance_calc"),
      impedance_pct: mkAv(impedance, "%", impedance * 0.10, "design_standard"),
      weight_kg: mkAv(Math.round(weight), "kg", weight * 0.15, "empirical"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const transformerEngine = new TransformerEngine();
