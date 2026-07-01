/**
 * SinteringProcessEngine — Powder metallurgy sintering analysis
 *
 * Models: Diffusion-based densification (Coble model),
 *         shrinkage prediction, atmosphere selection, cycle time
 * References: German 1996, Kang 2005, MPIF
 */

export type SinterAtmosphere = "hydrogen" | "nitrogen" | "vacuum" | "endothermic" | "argon" | "dissociated_ammonia";
export type SinterMaterial = "iron" | "copper" | "stainless" | "tungsten_carbide" | "alumina" | "zirconia";

export interface SinteringProcessInput {
  material?: SinterMaterial;
  atmosphere?: SinterAtmosphere;
  green_density_pct: number;          // % of theoretical
  target_density_pct?: number;        // default 95
  sintering_temperature_C: number;
  holding_time_min?: number;          // default 30
  heating_rate_C_min?: number;        // default 10
  part_thickness_mm?: number;         // default 10
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SinteringProcessResult {
  final_density_pct: AtomicValue;
  linear_shrinkage_pct: AtomicValue;
  total_cycle_time_min: AtomicValue;
  densification_rate: AtomicValue;
  homologous_temperature: AtomicValue;
  grain_growth_factor: AtomicValue;
  energy_kWh_per_kg: AtomicValue;
  dimensional_tolerance_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [melting_point_C, activation_energy_kJ/mol, density_g/cm3, optimal_Th_range]
const SINTER_DATA: Record<SinterMaterial, [number, number, number, number]> = {
  iron:             [1538, 280, 7.87, 0.70],
  copper:           [1085, 200, 8.96, 0.75],
  stainless:        [1400, 300, 7.98, 0.72],
  tungsten_carbide: [2870, 400, 15.6, 0.55],
  alumina:          [2072, 500, 3.95, 0.65],
  zirconia:         [2715, 480, 6.05, 0.60],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SinteringProcessEngine {
  calculate(input: SinteringProcessInput): SinteringProcessResult {
    const {
      material = "iron",
      atmosphere = "hydrogen",
      green_density_pct: D0,
      target_density_pct: Dt = 95,
      sintering_temperature_C: Ts,
      holding_time_min: th = 30,
      heating_rate_C_min: hr = 10,
      part_thickness_mm: thick = 10,
    } = input;

    const recs: string[] = [];
    const [Tm, Qa, rho, optTh] = SINTER_DATA[material];

    // Homologous temperature
    const Th = (Ts + 273.15) / (Tm + 273.15);

    // Densification rate (Coble diffusion model simplified)
    const R = 8.314;
    const Ts_K = Ts + 273.15;
    const D_coeff = Math.exp(-Qa * 1000 / (R * Ts_K)); // diffusion coefficient proxy
    const densRate = D_coeff * 1e12 * th / 60; // densification increment

    // Final density estimate
    const Dfinal = Math.min(99.5, D0 + (100 - D0) * (1 - Math.exp(-densRate * 100)));

    // Linear shrinkage: ΔL/L = 1 - (D0/Df)^(1/3)
    const shrinkage = (1 - Math.pow(D0 / Dfinal, 1 / 3)) * 100;

    // Cycle time: heat-up + hold + cool-down
    const heatUpTime = Ts / hr;
    const coolDownTime = Ts / (hr * 0.5); // slower cooling
    const totalCycle = heatUpTime + th + coolDownTime;

    // Grain growth factor
    const grainGrowth = 1 + 0.5 * Math.pow(Th, 3) * th / 30;

    // Energy estimate
    const energyPerKg = Ts * 0.001 * thick * 0.02 * totalCycle / 60; // kWh/kg rough

    // Dimensional tolerance
    const dimTolerance = shrinkage * 0.05 + 0.1; // % variation

    const isSafe = Th > 0.4 && Th < 0.95 && Dfinal > D0;

    if (Th < 0.5) recs.push(`Low homologous temp ${Th.toFixed(2)} — minimal sintering, increase temperature`);
    if (Th > 0.85) recs.push(`Very high Th ${Th.toFixed(2)} — grain coarsening, distortion risk`);
    if (Dfinal < Dt) recs.push(`Predicted density ${Dfinal.toFixed(1)}% < target ${Dt}% — increase T or time`);
    if (atmosphere === "hydrogen" && material === "alumina") recs.push(`Hydrogen not suitable for alumina — use air or vacuum`);
    if (grainGrowth > 3) recs.push(`Excessive grain growth factor ${grainGrowth.toFixed(1)} — reduce hold time`);
    if (recs.length === 0) recs.push(`Sintering nominal — Th=${Th.toFixed(2)}, D=${Dfinal.toFixed(1)}%, shrink=${shrinkage.toFixed(1)}%`);

    return {
      final_density_pct: mkAv(Math.round(Dfinal * 10) / 10, "%", Dfinal * 0.03, "coble"),
      linear_shrinkage_pct: mkAv(Math.round(shrinkage * 100) / 100, "%", shrinkage * 0.10, "D0_Df"),
      total_cycle_time_min: mkAv(Math.round(totalCycle), "min", totalCycle * 0.10, "heat_hold_cool"),
      densification_rate: mkAv(Math.round(densRate * 10000) / 10000, "1/s", densRate * 0.30, "arrhenius"),
      homologous_temperature: mkAv(Math.round(Th * 1000) / 1000, "ratio", Th * 0.02, "T_Tm"),
      grain_growth_factor: mkAv(Math.round(grainGrowth * 100) / 100, "ratio", grainGrowth * 0.20, "Th_time"),
      energy_kWh_per_kg: mkAv(Math.round(energyPerKg * 100) / 100, "kWh/kg", energyPerKg * 0.25, "estimate"),
      dimensional_tolerance_pct: mkAv(Math.round(dimTolerance * 100) / 100, "%", dimTolerance * 0.20, "shrinkage_var"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const sinteringProcessEngine = new SinteringProcessEngine();
