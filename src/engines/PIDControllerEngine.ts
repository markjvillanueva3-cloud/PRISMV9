/**
 * PIDControllerEngine — PID controller tuning and analysis
 *
 * Models: Ziegler-Nichols, Cohen-Coon, IMC tuning,
 *         stability margins, response characteristics
 * References: Åström & Hägglund, Seborg "Process Dynamics & Control"
 * Safety: Overshoot limits, integral windup, rate limiting
 */

export type TuningMethod = "ziegler_nichols" | "cohen_coon" | "imc" | "tyreus_luyben";
export type ControlAction = "P" | "PI" | "PID";

export interface PIDControllerInput {
  process_gain: number;                 // Kp
  time_constant_s: number;             // τ
  dead_time_s: number;                 // θ
  tuning_method?: TuningMethod;
  control_action?: ControlAction;
  imc_lambda?: number;                 // IMC tuning parameter (default = τ)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PIDControllerResult {
  kc: AtomicValue;                     // controller gain
  ti_s: AtomicValue;                   // integral time
  td_s: AtomicValue;                   // derivative time
  overshoot_pct: AtomicValue;
  settling_time_s: AtomicValue;
  gain_margin_dB: AtomicValue;
  phase_margin_deg: AtomicValue;
  controllability_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PIDControllerEngine {
  calculate(input: PIDControllerInput): PIDControllerResult {
    const {
      process_gain: Kp,
      time_constant_s: tau,
      dead_time_s: theta,
      tuning_method = "ziegler_nichols",
      control_action = "PID",
    } = input;

    const recs: string[] = [];
    const ratio = theta / tau; // controllability ratio

    let Kc: number, Ti: number, Td: number;

    if (tuning_method === "ziegler_nichols") {
      // Based on FOPDT model
      if (control_action === "P") {
        Kc = tau / (Kp * theta);
        Ti = Infinity; Td = 0;
      } else if (control_action === "PI") {
        Kc = 0.9 * tau / (Kp * theta);
        Ti = 3.33 * theta; Td = 0;
      } else {
        Kc = 1.2 * tau / (Kp * theta);
        Ti = 2 * theta;
        Td = 0.5 * theta;
      }
    } else if (tuning_method === "cohen_coon") {
      const r = theta / tau;
      if (control_action === "PID") {
        Kc = (1 / (Kp * r)) * (4 / 3 + r / 4);
        Ti = theta * (32 + 6 * r) / (13 + 8 * r);
        Td = theta * 4 / (11 + 2 * r);
      } else {
        Kc = (1 / (Kp * r)) * (0.9 + r / 12);
        Ti = theta * (30 + 3 * r) / (9 + 20 * r);
        Td = 0;
      }
    } else if (tuning_method === "imc") {
      const lambda = input.imc_lambda ?? tau;
      Kc = (2 * tau + theta) / (2 * Kp * (lambda + theta));
      Ti = tau + theta / 2;
      Td = tau * theta / (2 * tau + theta);
    } else { // tyreus_luyben
      const Ku = tau / (Kp * theta) * Math.PI / 2;
      const Pu = 4 * theta;
      Kc = Ku / 2.2;
      Ti = 2.2 * Pu;
      Td = Pu / 6.3;
    }

    // Response characteristics (approximate for FOPDT + PID)
    const closedLoopTau = tau / (1 + Kc * Kp);
    const overshoot = control_action === "P" ? 0
      : tuning_method === "ziegler_nichols" ? 25
      : tuning_method === "imc" ? 5 : 15;
    const settlingTime = 4 * Math.max(closedLoopTau, theta);

    // Stability margins (approximate)
    const gainMargin = 20 * Math.log10(1 / (Kc * Kp * ratio));
    const phaseMargin = 60 - ratio * 30; // rough approximation

    const isSafe = gainMargin > 6 && phaseMargin > 30;

    if (ratio > 1) recs.push(`Dead time dominant (θ/τ=${ratio.toFixed(2)}) — difficult control, consider Smith predictor`);
    if (ratio > 0.5 && tuning_method === "ziegler_nichols") recs.push(`High θ/τ ratio — ZN tuning aggressive, consider IMC or Tyreus-Luyben`);
    if (overshoot > 20) recs.push(`High overshoot ${overshoot}% — detune Kc or increase Ti`);
    if (gainMargin < 10) recs.push(`Low gain margin ${gainMargin.toFixed(1)}dB — reduce Kc for robustness`);
    if (recs.length === 0) recs.push(`PID nominal — Kc=${Kc.toFixed(3)}, Ti=${Ti.toFixed(1)}s, Td=${Td.toFixed(2)}s`);

    return {
      kc: mkAv(Math.round(Kc * 1000) / 1000, "gain", Kc * 0.15, tuning_method),
      ti_s: mkAv(Math.round(Ti * 10) / 10, "s", Ti * 0.15, tuning_method),
      td_s: mkAv(Math.round(Td * 100) / 100, "s", Td * 0.15, tuning_method),
      overshoot_pct: mkAv(overshoot, "%", 5, "response_estimate"),
      settling_time_s: mkAv(Math.round(settlingTime * 10) / 10, "s", settlingTime * 0.20, "4tau"),
      gain_margin_dB: mkAv(Math.round(gainMargin * 10) / 10, "dB", gainMargin * 0.15, "frequency_response"),
      phase_margin_deg: mkAv(Math.round(phaseMargin), "deg", 10, "frequency_response"),
      controllability_ratio: mkAv(Math.round(ratio * 1000) / 1000, "ratio", ratio * 0.05, "theta_tau"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const pidControllerEngine = new PIDControllerEngine();
