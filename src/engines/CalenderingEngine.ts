/**
 * CalenderingEngine — Calendering/rolling of polymer/rubber sheets
 *
 * Models: Nip force, sheet thickness from roll gap/speed ratio,
 *         bank size, temperature distribution, output rate
 * References: Tadmor & Gogos, Agassant, McKelvey
 */

export type CalenderConfig = "two_roll" | "three_roll" | "four_roll_L" | "four_roll_Z" | "four_roll_S";
export type CalenderMaterial = "PVC" | "rubber" | "PE" | "PP" | "PETG" | "silicone";

export interface CalenderingInput {
  config?: CalenderConfig;
  material?: CalenderMaterial;
  roll_diameter_mm: number;
  roll_width_mm: number;
  target_thickness_mm: number;
  roll_speed_m_min?: number;          // default 20
  roll_temperature_C?: number;        // default 170
  nip_gap_mm?: number;               // default = target_thickness
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CalenderingResult {
  output_rate_kg_h: AtomicValue;
  nip_force_kN_m: AtomicValue;
  roll_separating_force_kN: AtomicValue;
  sheet_width_mm: AtomicValue;
  residence_time_s: AtomicValue;
  draw_ratio: AtomicValue;
  bank_volume_cm3: AtomicValue;
  power_kW: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [density_g/cm3, viscosity_Pa_s_at_ref, melt_temp_C, specific_heat_J_gK]
const CAL_MATERIAL: Record<CalenderMaterial, [number, number, number, number]> = {
  PVC:      [1.35, 5000, 160, 1.0],
  rubber:   [1.15, 8000, 120, 1.5],
  PE:       [0.93, 3000, 130, 2.3],
  PP:       [0.91, 2500, 170, 1.9],
  PETG:     [1.27, 4000, 200, 1.2],
  silicone: [1.10, 10000, 180, 1.5],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CalenderingEngine {
  calculate(input: CalenderingInput): CalenderingResult {
    const {
      config = "four_roll_L",
      material = "PVC",
      roll_diameter_mm: D,
      roll_width_mm: W,
      target_thickness_mm: h,
      roll_speed_m_min: V = 20,
      roll_temperature_C: T = 170,
    } = input;

    const recs: string[] = [];
    const gap = input.nip_gap_mm ?? h;
    const [rho, eta0, Tmelt, cp] = CAL_MATERIAL[material];

    // Number of nips
    const numNips = config === "two_roll" ? 1 : config === "three_roll" ? 2 : 3;

    // Output rate
    const V_ms = V / 60;
    const outputRate = rho * h / 1000 * W / 1000 * V_ms * 3600; // kg/h

    // Nip force (simplified Gaskell equation)
    const R = D / 2000; // m
    const H0 = gap / 1000; // m
    const nipForce = eta0 * V_ms * Math.sqrt(R / H0) * (W / 1000) / 1000; // kN/m

    // Total separating force
    const sepForce = nipForce * (W / 1000);

    // Bank volume estimate
    const bankHeight = Math.sqrt(2 * R * H0) * 1000; // mm
    const bankVol = Math.PI / 4 * bankHeight * bankHeight * (W / 1000) / 10; // cm³

    // Residence time in nip
    const contactLength = Math.sqrt(R * H0) * 1000; // mm
    const residenceTime = contactLength / 1000 / V_ms;

    // Draw ratio (between successive nips)
    const drawRatio = 1 + (numNips - 1) * 0.02;

    // Power
    const power = nipForce * V_ms * numNips; // kW

    const isSafe = T > Tmelt * 0.7 && nipForce < 500 && h > 0.05;

    if (T < Tmelt) recs.push(`Roll temp ${T}°C < melt ${Tmelt}°C — increase temperature`);
    if (h < 0.1) recs.push(`Very thin sheet ${h}mm — web break risk, reduce speed`);
    if (nipForce > 200) recs.push(`High nip force ${nipForce.toFixed(0)}kN/m — roll deflection concern`);
    if (V > 50) recs.push(`High speed ${V}m/min — air entrapment risk`);
    if (recs.length === 0) recs.push(`Calender nominal — ${outputRate.toFixed(0)}kg/h, ${h}mm, F=${nipForce.toFixed(0)}kN/m`);

    return {
      output_rate_kg_h: mkAv(Math.round(outputRate * 10) / 10, "kg/h", outputRate * 0.05, "rhoVWh"),
      nip_force_kN_m: mkAv(Math.round(nipForce * 10) / 10, "kN/m", nipForce * 0.15, "gaskell"),
      roll_separating_force_kN: mkAv(Math.round(sepForce * 10) / 10, "kN", sepForce * 0.15, "force_width"),
      sheet_width_mm: mkAv(W, "mm", W * 0.01, "roll_width"),
      residence_time_s: mkAv(Math.round(residenceTime * 1000) / 1000, "s", residenceTime * 0.10, "contact_V"),
      draw_ratio: mkAv(Math.round(drawRatio * 1000) / 1000, "ratio", drawRatio * 0.05, "speed_diff"),
      bank_volume_cm3: mkAv(Math.round(bankVol * 10) / 10, "cm³", bankVol * 0.25, "geometry"),
      power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.15, "FV_nips"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const calenderingEngine = new CalenderingEngine();
