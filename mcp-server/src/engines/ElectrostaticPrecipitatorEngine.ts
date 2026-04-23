/**
 * ElectrostaticPrecipitatorEngine — ESP particulate collection analysis
 *
 * Models: Deutsch-Anderson collection efficiency, migration velocity,
 *         specific collecting area, power consumption, rapping cycle
 * References: White "Industrial Electrostatic Precipitation", EPA AP-42, ISO 12141
 */

export type ESPType = "dry_plate" | "wet" | "tubular" | "two_stage";
export type DustType = "fly_ash" | "cement_kiln" | "metallurgical" | "chemical" | "wood" | "general";

export interface ElectrostaticPrecipitatorInput {
  type?: ESPType;
  dust?: DustType;
  gas_flow_m3_s?: number;            // default 50
  inlet_loading_g_m3?: number;       // default 10
  target_efficiency_pct?: number;    // default 99
  number_of_fields?: number;         // default 3
  plate_height_m?: number;           // default 10
  plate_spacing_mm?: number;         // default 300
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ElectrostaticPrecipitatorResult {
  collection_efficiency_pct: AtomicValue;
  specific_collecting_area_m2_m3s: AtomicValue;
  migration_velocity_cm_s: AtomicValue;
  plate_area_m2: AtomicValue;
  outlet_loading_mg_m3: AtomicValue;
  power_kW: AtomicValue;
  voltage_kV: AtomicValue;
  pressure_drop_Pa: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Dust: [resistivity_Ω_cm_log10, migration_velocity_cm/s, particle_size_um, density_kg/m3]
const DUST_DATA: Record<DustType, [number, number, number, number]> = {
  fly_ash:       [10, 8,   15,  2200],
  cement_kiln:   [11, 6,   20,  2500],
  metallurgical: [8,  12,  10,  3500],
  chemical:      [9,  10,  5,   1800],
  wood:          [12, 5,   30,  500],
  general:       [10, 8,   15,  2000],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ElectrostaticPrecipitatorEngine {
  calculate(input: ElectrostaticPrecipitatorInput): ElectrostaticPrecipitatorResult {
    const {
      type = "dry_plate",
      dust = "fly_ash",
      gas_flow_m3_s: Q = 50,
      inlet_loading_g_m3: Ci = 10,
      target_efficiency_pct: etaTarget = 99,
      number_of_fields: nFields = 3,
      plate_height_m: Hp = 10,
      plate_spacing_mm: spacing = 300,
    } = input;

    const recs: string[] = [];
    const [resistLog, wBase, dPart, rhoD] = DUST_DATA[dust];

    // Migration velocity (Deutsch-Anderson parameter)
    const typeMod = type === "wet" ? 1.3 : type === "tubular" ? 1.1 :
      type === "two_stage" ? 0.9 : 1.0;
    const w = wBase * typeMod / 100; // m/s

    // Required SCA from Deutsch equation: η = 1 - exp(-w × SCA)
    // SCA = -ln(1 - η) / w
    const etaFrac = etaTarget / 100;
    const requiredSCA = -Math.log(1 - Math.min(etaFrac, 0.9999)) / w;

    // Total plate area
    const totalPlateArea = requiredSCA * Q; // m²

    // Plate area per field
    const areaPerField = totalPlateArea / nFields;

    // Actual efficiency
    const actualSCA = totalPlateArea / Q;
    const efficiency = (1 - Math.exp(-w * actualSCA)) * 100;

    // Outlet loading
    const outletLoading = Ci * (1 - efficiency / 100) * 1000; // mg/m³

    // Voltage (depends on spacing and resistivity)
    const voltage = spacing / 300 * 40 + (12 - resistLog) * 5; // kV typical

    // Power consumption
    const currentDensity = 0.1; // mA/m² typical
    const totalCurrent = currentDensity * totalPlateArea / 1000; // A
    const power = voltage * totalCurrent; // kW

    // Pressure drop (ESP has very low ΔP)
    const pressureDrop = 100 + Q / 10 * 5; // Pa (very low)

    const isSafe = efficiency > 90 && voltage < 80 && outletLoading < 100;

    if (resistLog > 11) recs.push(`High resistivity (10^${resistLog} Ω·cm) — back-corona risk, condition with SO₃/moisture`);
    if (resistLog < 8) recs.push(`Low resistivity — re-entrainment risk, increase rapping frequency`);
    if (efficiency < etaTarget) recs.push(`Efficiency ${efficiency.toFixed(1)}% < target ${etaTarget}% — add fields or increase SCA`);
    if (type === "dry_plate" && dust === "wood") recs.push(`Wood dust in dry ESP — fire/explosion risk, consider wet ESP`);
    if (nFields < 2) recs.push(`Single field — poor performance, minimum 2 fields recommended`);
    if (recs.length === 0) recs.push(`ESP nominal — η=${efficiency.toFixed(1)}%, SCA=${actualSCA.toFixed(0)}, ${outletLoading.toFixed(0)}mg/m³ outlet`);

    return {
      collection_efficiency_pct: mkAv(Math.round(efficiency * 100) / 100, "%", efficiency * 0.02, "Deutsch_Anderson"),
      specific_collecting_area_m2_m3s: mkAv(Math.round(actualSCA * 10) / 10, "m²/(m³/s)", actualSCA * 0.10, "A_Q"),
      migration_velocity_cm_s: mkAv(Math.round(w * 10000) / 100, "cm/s", w * 100 * 0.15, "dust_type"),
      plate_area_m2: mkAv(Math.round(totalPlateArea), "m²", totalPlateArea * 0.05, "SCA_Q"),
      outlet_loading_mg_m3: mkAv(Math.round(outletLoading * 10) / 10, "mg/m³", outletLoading * 0.20, "Ci_eta"),
      power_kW: mkAv(Math.round(power * 10) / 10, "kW", power * 0.15, "VI"),
      voltage_kV: mkAv(Math.round(voltage * 10) / 10, "kV", voltage * 0.10, "spacing_resistivity"),
      pressure_drop_Pa: mkAv(Math.round(pressureDrop), "Pa", pressureDrop * 0.15, "Q_geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const electrostaticPrecipitatorEngine = new ElectrostaticPrecipitatorEngine();
