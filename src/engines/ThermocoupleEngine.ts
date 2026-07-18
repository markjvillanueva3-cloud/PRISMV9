/**
 * ThermocoupleEngine — Thermocouple selection & signal analysis
 *
 * Models: Seebeck coefficient, voltage-temperature conversion,
 *         cold junction compensation, accuracy class
 * References: IEC 60584, NIST ITS-90 thermocouple tables
 */

export type TCType = "K" | "J" | "T" | "E" | "N" | "S" | "R" | "B";

export interface ThermocoupleInput {
  tc_type?: TCType;
  measured_voltage_mV?: number;
  measured_temperature_C?: number;
  cold_junction_temp_C?: number;       // default 25
  accuracy_class?: 1 | 2;             // IEC class, default 2
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThermocoupleResult {
  temperature_C: AtomicValue;
  voltage_mV: AtomicValue;
  seebeck_coefficient_uV_C: AtomicValue;
  tolerance_C: AtomicValue;
  min_range_C: AtomicValue;
  max_range_C: AtomicValue;
  cold_junction_correction_mV: AtomicValue;
  response_time_class: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// TC properties: [seebeck_uV/°C, min_C, max_C, class1_tol_C, class2_tol_C]
const TC_DATA: Record<TCType, [number, number, number, number, number]> = {
  K: [41, -200, 1372, 1.5, 2.5],
  J: [52, -40, 760, 1.5, 2.5],
  T: [43, -200, 400, 0.5, 1.0],
  E: [62, -40, 1000, 1.5, 2.5],
  N: [27, -200, 1300, 1.5, 2.5],
  S: [6, 0, 1768, 1.0, 1.5],
  R: [6, 0, 1768, 1.0, 1.5],
  B: [1, 250, 1820, 1.5, 4.0],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThermocoupleEngine {
  calculate(input: ThermocoupleInput): ThermocoupleResult {
    const {
      tc_type = "K",
      cold_junction_temp_C: Tcj = 25,
      accuracy_class = 2,
    } = input;

    const recs: string[] = [];
    const [seebeck, minRange, maxRange, tol1, tol2] = TC_DATA[tc_type];
    const tolerance = accuracy_class === 1 ? tol1 : tol2;

    let temperature: number;
    let voltage: number;

    if (input.measured_voltage_mV !== undefined) {
      // Voltage → Temperature (linearized)
      const cjVoltage = seebeck * Tcj / 1000; // mV
      const totalVoltage = input.measured_voltage_mV + cjVoltage;
      temperature = totalVoltage * 1000 / seebeck;
      voltage = input.measured_voltage_mV;
    } else {
      // Temperature → Voltage
      temperature = input.measured_temperature_C ?? 200;
      voltage = seebeck * (temperature - Tcj) / 1000; // mV
    }

    const cjCorrection = seebeck * Tcj / 1000;

    // Tolerance at measured temperature (IEC 60584)
    const tolAtTemp = Math.max(tolerance, Math.abs(temperature) * (accuracy_class === 1 ? 0.004 : 0.0075));

    // Response time classification
    const responseClass = tc_type === "K" || tc_type === "J" ? 2 : tc_type === "S" || tc_type === "R" || tc_type === "B" ? 4 : 3;

    const inRange = temperature >= minRange && temperature <= maxRange;
    const isSafe = inRange;

    if (!inRange) recs.push(`Temperature ${temperature.toFixed(0)}°C outside range [${minRange}, ${maxRange}]°C for Type ${tc_type}`);
    if (tc_type === "K" && temperature > 500 && temperature < 900) recs.push(`Type K 500-900°C — green rot risk in reducing atmosphere`);
    if (tc_type === "J" && temperature > 500) recs.push(`Type J > 500°C — iron oxidation accelerates`);
    if (tc_type === "T" && temperature > 300) recs.push(`Type T approaching limit — consider Type K or N`);
    if (seebeck < 10) recs.push(`Low Seebeck coefficient (${seebeck}µV/°C) — use high-quality amplifier`);
    if (recs.length === 0) recs.push(`Type ${tc_type} nominal — T=${temperature.toFixed(1)}°C, V=${voltage.toFixed(3)}mV, ±${tolAtTemp.toFixed(1)}°C`);

    return {
      temperature_C: mkAv(Math.round(temperature * 10) / 10, "°C", tolAtTemp, "seebeck"),
      voltage_mV: mkAv(Math.round(voltage * 1000) / 1000, "mV", Math.abs(voltage) * 0.01, "seebeck"),
      seebeck_coefficient_uV_C: mkAv(seebeck, "µV/°C", seebeck * 0.02, "iec_60584"),
      tolerance_C: mkAv(Math.round(tolAtTemp * 10) / 10, "°C", 0, `class_${accuracy_class}`),
      min_range_C: mkAv(minRange, "°C", 0, "iec_60584"),
      max_range_C: mkAv(maxRange, "°C", 0, "iec_60584"),
      cold_junction_correction_mV: mkAv(Math.round(cjCorrection * 1000) / 1000, "mV", cjCorrection * 0.02, "cjc"),
      response_time_class: mkAv(responseClass, "class", 0, "wire_gauge"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thermocoupleEngine = new ThermocoupleEngine();
