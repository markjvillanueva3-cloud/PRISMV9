/**
 * CoriolisFlowMeterEngine — Coriolis mass flow meter sizing
 *
 * Models: Phase shift (Δt=K×ṁ), natural frequency density,
 *         zero stability, turndown, pressure drop
 * References: Micro Motion, Endress+Hauser, ISO 10790
 */

export type TubeConfig = "single_straight" | "single_curved" | "dual_curved" | "dual_straight";

export interface CoriolisFlowMeterInput {
  flow_rate_kg_h: number;
  fluid_density_kg_m3?: number;       // default 1000
  fluid_viscosity_cP?: number;        // default 1
  pipe_diameter_mm: number;
  operating_pressure_bar?: number;    // default 5
  operating_temp_C?: number;          // default 25
  tube_config?: TubeConfig;           // default dual_curved
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CoriolisFlowMeterResult {
  meter_size_mm: AtomicValue;
  mass_flow_accuracy_pct: AtomicValue;
  density_accuracy_kg_m3: AtomicValue;
  pressure_drop_bar: AtomicValue;
  zero_stability_kg_h: AtomicValue;
  turndown_ratio: AtomicValue;
  natural_frequency_Hz: AtomicValue;
  flow_velocity_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Meter sizes: [nominal_mm, max_flow_kg_h, zero_stability_kg_h, nat_freq_Hz]
const METER_CATALOG: [number, number, number, number][] = [
  [6,    180,    0.015,  800],
  [15,   1800,   0.05,   650],
  [25,   7200,   0.10,   500],
  [40,   18000,  0.25,   400],
  [50,   36000,  0.50,   350],
  [80,   72000,  1.0,    300],
  [100,  140000, 2.0,    250],
  [150,  350000, 5.0,    200],
  [200,  700000, 10.0,   170],
  [250,  1200000,20.0,   150],
];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CoriolisFlowMeterEngine {
  calculate(input: CoriolisFlowMeterInput): CoriolisFlowMeterResult {
    const {
      flow_rate_kg_h: mDot,
      fluid_density_kg_m3: rho = 1000,
      fluid_viscosity_cP: mu_cP = 1,
      pipe_diameter_mm: pipeD,
      operating_pressure_bar: Pop = 5,
      tube_config = "dual_curved",
    } = input;

    const recs: string[] = [];

    // Select meter size
    let selected = METER_CATALOG[METER_CATALOG.length - 1];
    for (const meter of METER_CATALOG) {
      if (meter[1] >= mDot) {
        selected = meter;
        break;
      }
    }

    const [meterSize, maxFlow, zeroStab, natFreq] = selected;

    // Accuracy
    const baseAccuracy = tube_config === "dual_curved" ? 0.10 : tube_config === "dual_straight" ? 0.15 : 0.20;
    const flowPct = mDot / maxFlow;
    const accuracy = flowPct > 0.05 ? baseAccuracy : baseAccuracy + zeroStab / mDot * 100;

    // Density accuracy
    const densityAcc = tube_config.startsWith("dual") ? 0.5 : 2.0;

    // Pressure drop (proportional to flow² and inversely to tube area²)
    const tubeArea = Math.PI / 4 * Math.pow(meterSize / 1000, 2);
    const velocity = (mDot / 3600 / rho) / tubeArea;
    const Kfactor = tube_config === "dual_curved" ? 3.5 : tube_config === "single_curved" ? 2.5 : 1.5;
    const dP = Kfactor * 0.5 * rho * velocity * velocity / 1e5; // bar

    // Turndown ratio
    const turndown = maxFlow / (zeroStab * 100); // practical turndown

    // Adjust natural frequency for density
    const adjFreq = natFreq * Math.sqrt(1000 / rho);

    const isSafe = flowPct <= 1.0 && flowPct >= 0.01 && dP < Pop * 0.10;

    if (flowPct > 0.80) recs.push(`Flow at ${(flowPct * 100).toFixed(0)}% capacity — consider next size up`);
    if (flowPct < 0.05) recs.push(`Flow at ${(flowPct * 100).toFixed(1)}% — zero stability dominates accuracy`);
    if (dP > 1.0) recs.push(`High pressure drop ${dP.toFixed(2)}bar — consider larger meter`);
    if (meterSize > pipeD * 1.5) recs.push(`Meter ${meterSize}mm > pipe ${pipeD}mm — check reducers`);
    if (meterSize < pipeD * 0.5) recs.push(`Meter ${meterSize}mm < pipe ${pipeD}mm — oversized pipe?`);
    if (recs.length === 0) recs.push(`Coriolis meter nominal — ${meterSize}mm, accuracy ±${accuracy.toFixed(2)}%, ΔP=${dP.toFixed(3)}bar`);

    return {
      meter_size_mm: mkAv(meterSize, "mm", 0, "catalog_selection"),
      mass_flow_accuracy_pct: mkAv(Math.round(accuracy * 1000) / 1000, "%", accuracy * 0.1, "zero_stability"),
      density_accuracy_kg_m3: mkAv(densityAcc, "kg/m³", densityAcc * 0.2, "tube_config"),
      pressure_drop_bar: mkAv(Math.round(dP * 1000) / 1000, "bar", dP * 0.15, "bernoulli"),
      zero_stability_kg_h: mkAv(zeroStab, "kg/h", zeroStab * 0.1, "catalog"),
      turndown_ratio: mkAv(Math.round(turndown), "ratio", turndown * 0.1, "catalog"),
      natural_frequency_Hz: mkAv(Math.round(adjFreq), "Hz", adjFreq * 0.05, "density_adjusted"),
      flow_velocity_m_s: mkAv(Math.round(velocity * 100) / 100, "m/s", velocity * 0.05, "continuity"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const coriolisFlowMeterEngine = new CoriolisFlowMeterEngine();
