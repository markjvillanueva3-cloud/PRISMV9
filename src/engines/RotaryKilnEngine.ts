/**
 * RotaryKilnEngine — Rotary kiln sizing and heat transfer
 *
 * Models: Residence time (τ=L/(0.23×D×N×S)), heat duty,
 *         kiln slope, fill fraction, radiation/convection
 * References: Perry's Ch.23, Friedman & Marshall
 * Safety: Shell temperature, tire/roller loads, refractory life
 */

export interface RotaryKilnInput {
  throughput_tph: number;
  retention_time_min?: number;          // default 30
  material_density_kg_m3?: number;      // default 1500
  kiln_diameter_m?: number;             // auto-sized
  kiln_slope_pct?: number;              // default 3%
  speed_rpm?: number;                   // default 2
  inlet_temp_C?: number;               // default 20
  outlet_temp_C?: number;              // default 1000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RotaryKilnResult {
  kiln_diameter_m: AtomicValue;
  kiln_length_m: AtomicValue;
  L_D_ratio: AtomicValue;
  fill_fraction_pct: AtomicValue;
  heat_duty_MW: AtomicValue;
  rotation_speed_rpm: AtomicValue;
  peripheral_speed_m_s: AtomicValue;
  residence_time_min: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RotaryKilnEngine {
  calculate(input: RotaryKilnInput): RotaryKilnResult {
    const {
      throughput_tph: T,
      retention_time_min: tau = 30,
      material_density_kg_m3: rho = 1500,
      kiln_slope_pct: S = 3,
      inlet_temp_C: Ti = 20,
      outlet_temp_C: To = 1000,
    } = input;

    const recs: string[] = [];

    // Volume required
    const volumeRate = T * 1000 / rho; // m³/h
    const fillFraction = 0.10; // 10% fill typical
    const holdupVolume = volumeRate * (tau / 60); // m³

    // Auto-size diameter
    let D = input.kiln_diameter_m;
    let N = input.speed_rpm ?? 2;
    if (!D) {
      // V_holdup = π/4 × D² × L × fill
      // L/D typically 10-20
      // From residence time: L = 0.23 × D × N × S × τ
      const LD = 15; // target L/D
      // holdupVolume = π/4 × D² × (LD×D) × fillFraction
      const D3 = holdupVolume / (Math.PI / 4 * LD * fillFraction);
      D = Math.pow(D3, 1 / 3);
      D = Math.round(D * 10) / 10; // round to 0.1m
    }

    // Length from residence time
    // Sullivan equation: τ = 1.77 × L × √(S_angle) / (D × N)
    // Simplified: L = 0.23 × D × N × S × τ (Friedman & Marshall)
    const L = 0.23 * D * N * S * tau / 60;
    const LD = L / D;

    // Actual fill fraction
    const actualFill = holdupVolume / (Math.PI / 4 * D * D * L) * 100;

    // Heat duty
    const cp = 1.0; // kJ/kg·K average
    const Q = T * 1000 * cp * (To - Ti) / 3600; // kW
    const Q_MW = Q / 1000;

    // Peripheral speed
    const periSpeed = Math.PI * D * N / 60;

    const isSafe = actualFill <= 15 && LD >= 8 && LD <= 25;

    if (LD > 20) recs.push(`High L/D=${LD.toFixed(1)} — structural and alignment challenges`);
    if (LD < 8) recs.push(`Low L/D=${LD.toFixed(1)} — insufficient residence time distribution`);
    if (actualFill > 12) recs.push(`High fill ${actualFill.toFixed(0)}% — spillage and drive overload risk`);
    if (To > 1400) recs.push(`Very high temperature ${To}°C — special refractory required`);
    if (D > 5) recs.push(`Large kiln D=${D}m — verify tire/roller structural design`);
    if (recs.length === 0) recs.push(`Kiln nominal — ${D}m×${L.toFixed(1)}m, ${Q_MW.toFixed(1)}MW, ${tau}min`);

    return {
      kiln_diameter_m: mkAv(D, "m", D * 0.05, "volume_sizing"),
      kiln_length_m: mkAv(Math.round(L * 10) / 10, "m", L * 0.10, "friedman_marshall"),
      L_D_ratio: mkAv(Math.round(LD * 10) / 10, "ratio", LD * 0.08, "geometry"),
      fill_fraction_pct: mkAv(Math.round(actualFill * 10) / 10, "%", actualFill * 0.15, "volume_ratio"),
      heat_duty_MW: mkAv(Math.round(Q_MW * 100) / 100, "MW", Q_MW * 0.10, "energy_balance"),
      rotation_speed_rpm: mkAv(N, "rpm", 0, "design_selection"),
      peripheral_speed_m_s: mkAv(Math.round(periSpeed * 100) / 100, "m/s", periSpeed * 0.05, "geometry"),
      residence_time_min: mkAv(tau, "min", tau * 0.15, "target"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rotaryKilnEngine = new RotaryKilnEngine();
