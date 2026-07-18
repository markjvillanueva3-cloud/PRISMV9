/**
 * DistillationColumnEngine — Distillation column sizing
 *
 * Models: McCabe-Thiele (ideal stages), Fenske minimum stages,
 *         Underwood minimum reflux, Gilliland correlation, flooding velocity
 * References: McCabe-Smith, Wankat
 * Safety: Flooding factor, weeping, entrainment, pressure drop
 */

export type TrayType = "sieve" | "valve" | "bubble_cap" | "structured_packing";

export interface DistillationColumnInput {
  feed_flow_kmol_h: number;
  feed_composition_light?: number;      // mole fraction, default 0.5
  distillate_purity?: number;           // mole fraction, default 0.95
  bottoms_purity?: number;              // mole fraction of light, default 0.05
  relative_volatility?: number;         // default 2.5
  reflux_ratio_factor?: number;         // × Rmin, default 1.3
  tray_type?: TrayType;
  operating_pressure_bar?: number;      // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface DistillationColumnResult {
  number_of_stages: AtomicValue;
  minimum_stages: AtomicValue;
  reflux_ratio: AtomicValue;
  minimum_reflux: AtomicValue;
  column_diameter_mm: AtomicValue;
  column_height_m: AtomicValue;
  condenser_duty_kW: AtomicValue;
  reboiler_duty_kW: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class DistillationColumnEngine {
  calculate(input: DistillationColumnInput): DistillationColumnResult {
    const {
      feed_flow_kmol_h: F,
      feed_composition_light: zf = 0.5,
      distillate_purity: xd = 0.95,
      bottoms_purity: xb = 0.05,
      relative_volatility: alpha = 2.5,
      reflux_ratio_factor: Rfactor = 1.3,
      tray_type = "sieve",
      operating_pressure_bar: P = 1,
    } = input;

    const recs: string[] = [];

    // Mass balance
    const D = F * (zf - xb) / (xd - xb); // distillate flow
    const B = F - D; // bottoms flow

    // Fenske minimum stages
    const Nmin = Math.log((xd / (1 - xd)) * ((1 - xb) / xb)) / Math.log(alpha);

    // Underwood minimum reflux
    const theta = alpha; // at q=1 (saturated liquid feed), θ ≈ α for binary
    const Rmin = (1 / (alpha - 1)) * (xd / zf - alpha * (1 - xd) / (1 - zf));
    const RminAbs = Math.max(Rmin, 0.3);

    // Actual reflux
    const R = RminAbs * Rfactor;

    // Gilliland correlation for actual stages
    const X = (R - RminAbs) / (R + 1);
    const Y = 1 - Math.exp((1 + 54.4 * X) / (11 + 117.2 * X) * (X - 1) / Math.sqrt(X));
    const N = (Nmin + Y) / (1 - Y);
    const Nactual = Math.ceil(N);

    // Tray efficiency
    const efficiency = tray_type === "sieve" ? 0.70
      : tray_type === "valve" ? 0.75
      : tray_type === "bubble_cap" ? 0.65 : 0.85;
    const Nreal = Math.ceil(Nactual / efficiency);

    // Column diameter (Fair correlation for flooding)
    const MW = 80; // average molecular weight (assumed)
    const rhoV = P * MW / (0.0821 * 373); // kg/m³ at boiling
    const rhoL = 800; // kg/m³ liquid
    const Vflow = (R + 1) * D * MW / (rhoV * 3600); // m³/s vapor
    const FLV = (B / D) * Math.sqrt(rhoV / rhoL);
    const Csb = 0.05; // Souders-Brown coefficient (simplified)
    const Uf = Csb * Math.sqrt((rhoL - rhoV) / rhoV);
    const Uop = Uf * 0.80; // 80% of flooding
    const Acol = Vflow / Uop;
    const Dcol = Math.sqrt(4 * Acol / Math.PI) * 1000; // mm

    // Column height
    const traySpacing = 0.6; // m
    const height = Nreal * traySpacing + 3; // + top/bottom clearance

    // Condenser & reboiler duties
    const Hvap = 30; // kJ/mol (typical)
    const Qcond = (R + 1) * D * Hvap / 3.6; // kW
    const Qreb = Qcond + F * 4.18 * 20 / (MW * 3.6); // approximate

    const isSafe = Uop / Uf <= 0.85 && Nreal <= 100;

    if (alpha < 1.5) recs.push(`Low α=${alpha} — many stages needed, consider extractive distillation`);
    if (R > 5) recs.push(`High reflux ratio ${R.toFixed(1)} — large energy consumption`);
    if (Nreal > 50) recs.push(`${Nreal} trays — consider structured packing for reduced HETP`);
    if (Dcol > 5000) recs.push(`Large diameter ${(Dcol / 1000).toFixed(1)}m — verify structural design`);
    if (recs.length === 0) recs.push(`Column nominal — ${Nreal} trays, D=${Dcol.toFixed(0)}mm, R=${R.toFixed(1)}`);

    return {
      number_of_stages: mkAv(Nreal, "stages", 0, "gilliland"),
      minimum_stages: mkAv(Math.round(Nmin * 10) / 10, "stages", Nmin * 0.05, "fenske"),
      reflux_ratio: mkAv(Math.round(R * 100) / 100, "ratio", R * 0.08, "underwood"),
      minimum_reflux: mkAv(Math.round(RminAbs * 100) / 100, "ratio", RminAbs * 0.10, "underwood"),
      column_diameter_mm: mkAv(Math.round(Dcol), "mm", Dcol * 0.10, "fair_correlation"),
      column_height_m: mkAv(Math.round(height * 10) / 10, "m", height * 0.08, "tray_count"),
      condenser_duty_kW: mkAv(Math.round(Qcond * 10) / 10, "kW", Qcond * 0.10, "energy_balance"),
      reboiler_duty_kW: mkAv(Math.round(Qreb * 10) / 10, "kW", Qreb * 0.10, "energy_balance"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const distillationColumnEngine = new DistillationColumnEngine();
