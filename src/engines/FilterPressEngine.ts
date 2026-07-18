/**
 * FilterPressEngine — Filter press sizing and cycle time
 *
 * Models: Darcy filtration (V²=2KΔPt/μ), cake formation rate,
 *         plate count, wash ratio, dewatering cycle
 * References: Ruth filtration equation, Perry's Chemical Engineers
 * Safety: Plate pressure rating, feed pump capacity
 */

export type FilterType = "plate_frame" | "membrane" | "belt" | "rotary_drum";

export interface FilterPressInput {
  slurry_flow_m3_h: number;
  solids_concentration_pct?: number;    // default 10%
  cake_moisture_target_pct?: number;    // default 30%
  filter_type?: FilterType;
  operating_pressure_bar?: number;       // default 7
  plate_size_mm?: number;                // default auto
  filtrate_viscosity_cP?: number;        // default 1
  specific_resistance_m_kg?: number;     // default 1e11
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FilterPressResult {
  total_filter_area_m2: AtomicValue;
  number_of_plates: AtomicValue;
  plate_size_mm: AtomicValue;
  cycle_time_min: AtomicValue;
  cake_thickness_mm: AtomicValue;
  filtrate_rate_m3_h: AtomicValue;
  feed_pump_kW: AtomicValue;
  cake_production_kg_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FilterPressEngine {
  calculate(input: FilterPressInput): FilterPressResult {
    const {
      slurry_flow_m3_h: Qs,
      solids_concentration_pct: Cs = 10,
      cake_moisture_target_pct: Cm = 30,
      filter_type = "plate_frame",
      operating_pressure_bar: P = 7,
      filtrate_viscosity_cP: mu = 1,
      specific_resistance_m_kg: alpha = 1e11,
    } = input;

    const recs: string[] = [];
    const P_Pa = P * 1e5;
    const mu_Pa_s = mu * 1e-3;

    // Solids mass flow
    const rhoSlurry = 1000 + Cs * 15; // approximate
    const solidsMass = Qs * rhoSlurry * (Cs / 100); // kg/h
    const cakeDry = solidsMass; // dry solids
    const cakeWet = cakeDry / (1 - Cm / 100); // wet cake

    // Ruth filtration: V/A = √(2×P×t / (μ×α×c))
    // c = solids concentration in feed (kg/m³)
    const c = Cs / 100 * rhoSlurry;

    // Target cycle: filtration + wash + discharge
    const filtrationTime_s = 1800; // 30 min default
    const VA = Math.sqrt(2 * P_Pa * filtrationTime_s / (mu_Pa_s * alpha * c)); // m³/m²

    // Required area
    const Qfiltrate = Qs * (1 - Cs / 100); // m³/h filtrate
    const totalArea = Qfiltrate / (VA * 3600 / filtrationTime_s);

    // Plate sizing
    const stdPlates = [400, 500, 630, 800, 1000, 1200, 1500, 2000];
    let plateSize = input.plate_size_mm;
    if (!plateSize) {
      plateSize = stdPlates.find(s => s * s * 2e-6 * 30 >= totalArea) ?? stdPlates[stdPlates.length - 1];
    }

    const plateArea = (plateSize / 1000) * (plateSize / 1000) * 2; // both sides, m²
    const numPlates = Math.ceil(totalArea / plateArea);

    // Cake thickness per plate (half gap)
    const cakeThick = solidsMass / (numPlates * plateArea * 1400) * (filtrationTime_s / 3600) * 1000; // mm

    // Cycle time: filtration + wash (15%) + discharge (10min)
    const washTime = filtrationTime_s * 0.15;
    const dischargeTime = 600; // 10 min
    const totalCycle = (filtrationTime_s + washTime + dischargeTime) / 60;

    // Feed pump power
    const pumpPower = P_Pa * Qs / 3600 / 0.70 / 1000; // kW

    const isSafe = P <= 16 && numPlates <= 200;

    if (P > 12) recs.push(`High pressure ${P}bar — verify plate and gasket rating`);
    if (numPlates > 100) recs.push(`${numPlates} plates — consider larger plate size or membrane squeeze`);
    if (cakeThick < 15) recs.push(`Thin cake ${cakeThick.toFixed(0)}mm — short cycle, poor dewatering`);
    if (cakeThick > 40) recs.push(`Thick cake ${cakeThick.toFixed(0)}mm — extend cycle or add plates`);
    if (filter_type === "membrane") recs.push(`Membrane squeeze recommended for <${Cm}% moisture target`);
    if (recs.length === 0) recs.push(`Filter press nominal — ${numPlates}×${plateSize}mm plates, ${totalCycle.toFixed(0)}min cycle`);

    return {
      total_filter_area_m2: mkAv(Math.round(totalArea * 10) / 10, "m²", totalArea * 0.12, "ruth_filtration"),
      number_of_plates: mkAv(numPlates, "plates", 0, "area_division"),
      plate_size_mm: mkAv(plateSize, "mm", 0, "standard_size"),
      cycle_time_min: mkAv(Math.round(totalCycle), "min", totalCycle * 0.15, "process_steps"),
      cake_thickness_mm: mkAv(Math.round(cakeThick * 10) / 10, "mm", cakeThick * 0.20, "mass_balance"),
      filtrate_rate_m3_h: mkAv(Math.round(Qfiltrate * 10) / 10, "m³/h", Qfiltrate * 0.05, "flow_balance"),
      feed_pump_kW: mkAv(Math.round(pumpPower * 10) / 10, "kW", pumpPower * 0.10, "hydraulic_power"),
      cake_production_kg_h: mkAv(Math.round(cakeWet), "kg/h", cakeWet * 0.10, "mass_balance"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const filterPressEngine = new FilterPressEngine();
