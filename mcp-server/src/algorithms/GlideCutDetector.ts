/**
 * GlideCutDetector — Wire-EDM #5.6
 * Detects no-load / glide-cut state (wire crossing air gap, low spark current)
 * so the controller can boost power for next material engagement instead of
 * fly-cutting into the next workpiece edge. Inputs: instantaneous spark current
 * + servo gap voltage + dV/dt; outputs: glide_detected boolean + power-adjustment recommendation.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface GlideCutInput {
  spark_current_A: number;
  gap_voltage_V: number;
  /** Voltage rise rate V/sec (positive = increasing gap, indicates wire approaching new edge). */
  dV_dt_V_per_sec: number;
  /** Operator-configured baseline current for "cutting" state. Default 5A. */
  baseline_cut_current_A?: number;
}

export interface GlideCutResult {
  glide_detected: boolean;
  confidence: AtomicValue;
  recommended_power_boost_pct: AtomicValue;
  notes: string[];
  source: string;
}

const BASELINE_CUT_A = 5;
const GLIDE_CURRENT_FRACTION = 0.30;     // current below 30% of baseline = glide candidate
const GLIDE_VOLTAGE_RISE_THRESHOLD = 0.40; // dV/dt threshold normalized to gap_voltage
const POWER_BOOST_MAX_PCT = 50;
const CURRENT_MAX_A = 60;
const VOLTAGE_MAX_V = 200;

function emit(reason: string): GlideCutResult {
  return {
    glide_detected: false,
    confidence: { value: 0, unit: "probability", uncertainty: 0, source: "invalid-input", confidence: 0 },
    recommended_power_boost_pct: { value: 0, unit: "%", uncertainty: 0, source: "invalid-input", confidence: 0 },
    notes: [reason], source: "GlideCutDetector v1.0.0",
  };
}

export function detect(input: GlideCutInput): GlideCutResult {
  if (!input) return emit("missing input");
  if (!Number.isFinite(input.spark_current_A)) return emit("spark_current_A not finite");
  if (!Number.isFinite(input.gap_voltage_V)) return emit("gap_voltage_V not finite");
  if (!Number.isFinite(input.dV_dt_V_per_sec)) return emit("dV_dt_V_per_sec not finite");
  if (input.spark_current_A < 0 || input.spark_current_A > CURRENT_MAX_A) return emit(`spark_current_A ${input.spark_current_A} outside [0, ${CURRENT_MAX_A}]`);
  if (input.gap_voltage_V < 0 || input.gap_voltage_V > VOLTAGE_MAX_V) return emit(`gap_voltage_V ${input.gap_voltage_V} outside [0, ${VOLTAGE_MAX_V}]`);

  const baseline = Number.isFinite(input.baseline_cut_current_A) ? Math.max(0.1, input.baseline_cut_current_A!) : BASELINE_CUT_A;
  const currentRatio = input.spark_current_A / baseline;
  const voltageRiseRatio = input.gap_voltage_V > 0 ? input.dV_dt_V_per_sec / input.gap_voltage_V : 0;
  const currentSignal = currentRatio < GLIDE_CURRENT_FRACTION ? (1 - currentRatio / GLIDE_CURRENT_FRACTION) : 0;
  const voltageSignal = voltageRiseRatio > GLIDE_VOLTAGE_RISE_THRESHOLD ? Math.min(1, voltageRiseRatio / 2) : 0;

  // Fused confidence — both signals weight 0.5
  const conf = 0.5 * currentSignal + 0.5 * voltageSignal;
  const glide = conf > 0.5;
  const boost = glide ? Math.round(POWER_BOOST_MAX_PCT * conf) : 0;
  const notes: string[] = [];
  if (glide) notes.push(`glide detected: current ratio ${currentRatio.toFixed(2)} < ${GLIDE_CURRENT_FRACTION}, voltage rise ratio ${voltageRiseRatio.toFixed(2)} > ${GLIDE_VOLTAGE_RISE_THRESHOLD}`);
  else if (currentSignal > 0) notes.push("partial-glide candidate (current dropped but voltage stable) — monitor next 100ms");
  else if (voltageSignal > 0) notes.push("partial-glide candidate (voltage rising but current still cutting) — possible thin-wall section");
  else notes.push("steady-cut state");

  return {
    glide_detected: glide,
    confidence: { value: conf, unit: "probability", uncertainty: 0.10, source: "fused current+voltage signals", confidence: conf },
    recommended_power_boost_pct: { value: boost, unit: "%", uncertainty: 5, source: glide ? "power-boost rule" : "no-boost", confidence: glide ? conf : 1 },
    notes, source: "GlideCutDetector v1.0.0",
  };
}

export const GlideCutDetector = { version: "1.0.0" as const, detect };
