/**
 * RTDEngine — Resistance Temperature Detector analysis
 *
 * Models: Callendar-Van Dusen equation, self-heating,
 *         wire resistance compensation, accuracy class
 * References: IEC 60751, ASTM E1137
 */

export type RTDElement = "Pt100" | "Pt1000" | "Ni100" | "Cu10";
export type WireConfig = "2wire" | "3wire" | "4wire";

export interface RTDInput {
  element?: RTDElement;
  measured_resistance_ohm?: number;
  measured_temperature_C?: number;
  wire_config?: WireConfig;
  wire_resistance_ohm?: number;        // per lead, default 0.5
  excitation_current_mA?: number;      // default 1
  accuracy_class?: string;             // "A", "B", "AA", default "B"
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RTDResult {
  temperature_C: AtomicValue;
  resistance_ohm: AtomicValue;
  sensitivity_ohm_C: AtomicValue;
  tolerance_C: AtomicValue;
  self_heating_C: AtomicValue;
  wire_error_C: AtomicValue;
  min_range_C: AtomicValue;
  max_range_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// RTD properties: [R0, alpha, min_C, max_C, sensitivity_ohm/C]
const RTD_DATA: Record<RTDElement, [number, number, number, number, number]> = {
  Pt100:  [100,  0.00385, -200, 850, 0.385],
  Pt1000: [1000, 0.00385, -200, 850, 3.85],
  Ni100:  [100,  0.00672, -60, 180, 0.672],
  Cu10:   [10,   0.00427, -50, 150, 0.0427],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RTDEngine {
  calculate(input: RTDInput): RTDResult {
    const {
      element = "Pt100",
      wire_config = "3wire",
      wire_resistance_ohm: Rw = 0.5,
      excitation_current_mA: Iex = 1,
      accuracy_class = "B",
    } = input;

    const recs: string[] = [];
    const [R0, alpha, minRange, maxRange, sensitivity] = RTD_DATA[element];

    // Callendar-Van Dusen constants (Pt)
    const A = 3.9083e-3;
    const B = -5.775e-7;

    let temperature: number;
    let resistance: number;

    if (input.measured_resistance_ohm !== undefined) {
      resistance = input.measured_resistance_ohm;
      // Solve R = R0(1 + At + Bt²) for t > 0
      const Rn = resistance / R0;
      if (Rn >= 1) {
        temperature = (-A + Math.sqrt(A * A - 4 * B * (1 - Rn))) / (2 * B);
      } else {
        // Linear approximation below 0°C
        temperature = (Rn - 1) / alpha;
      }
    } else {
      temperature = input.measured_temperature_C ?? 100;
      if (temperature >= 0) {
        resistance = R0 * (1 + A * temperature + B * temperature * temperature);
      } else {
        resistance = R0 * (1 + alpha * temperature);
      }
    }

    // Wire resistance error
    let wireError = 0;
    if (wire_config === "2wire") wireError = 2 * Rw / sensitivity;
    else if (wire_config === "3wire") wireError = 0.1 * Rw / sensitivity; // mostly compensated

    // Self-heating
    const Iamps = Iex / 1000;
    const powerDiss = Iamps * Iamps * resistance; // W
    const selfHeat = powerDiss / 0.01; // °C (assuming 10mW/°C dissipation in air)

    // Tolerance (IEC 60751)
    let tolerance: number;
    const absT = Math.abs(temperature);
    if (accuracy_class === "AA") tolerance = 0.1 + 0.0017 * absT;
    else if (accuracy_class === "A") tolerance = 0.15 + 0.002 * absT;
    else tolerance = 0.3 + 0.005 * absT; // Class B

    const inRange = temperature >= minRange && temperature <= maxRange;
    const isSafe = inRange && selfHeat < 0.5;

    if (!inRange) recs.push(`Temperature ${temperature.toFixed(0)}°C outside range [${minRange}, ${maxRange}]°C`);
    if (wire_config === "2wire" && wireError > 0.5) recs.push(`2-wire error ${wireError.toFixed(2)}°C — use 3 or 4-wire`);
    if (selfHeat > 0.1) recs.push(`Self-heating ${selfHeat.toFixed(2)}°C — reduce excitation current`);
    if (element === "Ni100" && temperature > 150) recs.push(`Nickel RTD nonlinear above 150°C — use Pt`);
    if (recs.length === 0) recs.push(`${element} nominal — T=${temperature.toFixed(1)}°C, R=${resistance.toFixed(2)}Ω, ±${tolerance.toFixed(2)}°C`);

    return {
      temperature_C: mkAv(Math.round(temperature * 10) / 10, "°C", tolerance, "callendar_van_dusen"),
      resistance_ohm: mkAv(Math.round(resistance * 100) / 100, "Ω", resistance * 0.001, "cvd"),
      sensitivity_ohm_C: mkAv(sensitivity, "Ω/°C", sensitivity * 0.01, "alpha"),
      tolerance_C: mkAv(Math.round(tolerance * 100) / 100, "°C", 0, `class_${accuracy_class}`),
      self_heating_C: mkAv(Math.round(selfHeat * 1000) / 1000, "°C", selfHeat * 0.20, "power_diss"),
      wire_error_C: mkAv(Math.round(wireError * 100) / 100, "°C", wireError * 0.10, wire_config),
      min_range_C: mkAv(minRange, "°C", 0, "iec_60751"),
      max_range_C: mkAv(maxRange, "°C", 0, "iec_60751"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rtdEngine = new RTDEngine();
