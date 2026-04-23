/**
 * AnodizingProcessEngine — Aluminum anodizing process analysis
 *
 * Models: Faraday's law oxide growth, sulfuric/hard/chromic types,
 *         dye absorption, seal quality, dimensional change
 * References: MIL-A-8625, AMS 2469, ASTM B580
 */

export type AnodizeType = "type_II_sulfuric" | "type_III_hard" | "type_I_chromic" | "phosphoric" | "boric_sulfuric";

export interface AnodizingProcessInput {
  anodize_type?: AnodizeType;
  target_thickness_um: number;        // oxide layer thickness
  surface_area_dm2: number;
  current_density_A_dm2?: number;     // default varies by type
  temperature_C?: number;             // bath temp, default varies
  alloy?: string;                     // default "6061"
  dye_required?: boolean;             // default false
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AnodizingProcessResult {
  process_time_min: AtomicValue;
  voltage_V: AtomicValue;
  power_consumption_Wh: AtomicValue;
  dimensional_growth_um: AtomicValue;
  hardness_HV: AtomicValue;
  weight_gain_g_m2: AtomicValue;
  corrosion_hours_salt_spray: AtomicValue;
  dye_absorption_rating: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Type data: [current_A_dm2, voltage_V, bath_temp_C, hardness_HV, growth_ratio, salt_spray_hrs_per_um]
const ANODIZE_DATA: Record<AnodizeType, [number, number, number, number, number, number]> = {
  type_II_sulfuric:  [1.5, 18, 21, 300, 0.67, 20],
  type_III_hard:     [3.0, 50, 0,  500, 0.50, 40],
  type_I_chromic:    [0.5, 40, 38, 200, 0.67, 15],
  phosphoric:        [1.0, 15, 25, 150, 0.70, 5],
  boric_sulfuric:    [1.2, 20, 26, 280, 0.65, 18],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AnodizingProcessEngine {
  calculate(input: AnodizingProcessInput): AnodizingProcessResult {
    const {
      anodize_type = "type_II_sulfuric",
      target_thickness_um: t,
      surface_area_dm2: A,
      alloy = "6061",
      dye_required = false,
    } = input;

    const recs: string[] = [];
    const [J_def, V_def, bathTemp_def, hardness, growthRatio, sprayPerUm] = ANODIZE_DATA[anodize_type];
    const J = input.current_density_A_dm2 ?? J_def;
    const bathTemp = input.temperature_C ?? bathTemp_def;

    // Process time (Faraday's law for Al2O3)
    // Rate ≈ 0.3 µm/min per A/dm² for sulfuric
    const growthRate = J * 0.3 * (anodize_type === "type_III_hard" ? 0.5 : 1.0);
    const processTime = t / Math.max(growthRate, 0.01);

    // Voltage estimate
    const voltage = V_def * (1 + 0.01 * (t - 20));

    // Power consumption
    const power = voltage * J * A * processTime / 60; // Wh

    // Dimensional growth (oxide grows ~67% outward, 33% inward for Type II)
    const dimGrowth = t * growthRatio;

    // Weight gain
    const weightGain = t * 2.7 * 0.01 * 10; // g/m² (Al2O3 density × thickness)

    // Corrosion resistance
    const saltSprayHours = t * sprayPerUm;

    // Dye absorption (Type III hard anodize has poor dye uptake)
    let dyeRating: number;
    if (!dye_required) dyeRating = 0;
    else if (anodize_type === "type_III_hard") dyeRating = 2;
    else if (anodize_type === "type_II_sulfuric") dyeRating = 9;
    else dyeRating = 5;

    const isSafe = t > 0 && processTime < 180;

    if (anodize_type === "type_III_hard" && dye_required) recs.push(`Hard anodize has poor dye absorption — use Type II for color`);
    if (alloy.includes("2024") || alloy.includes("7075")) recs.push(`High-Cu/Zn alloy ${alloy} — adjust bath chemistry, expect lower quality`);
    if (t > 50 && anodize_type === "type_II_sulfuric") recs.push(`${t}µm exceeds Type II typical max 25µm — use Type III`);
    if (t < 5) recs.push(`Very thin ${t}µm — difficult to control uniformly`);
    if (bathTemp > bathTemp_def + 5) recs.push(`Bath temp ${bathTemp}°C high — softer oxide, more dissolution`);
    if (recs.length === 0) recs.push(`Anodize nominal — ${t}µm ${anodize_type}, ${processTime.toFixed(0)}min, ${saltSprayHours}h salt spray`);

    return {
      process_time_min: mkAv(Math.round(processTime * 10) / 10, "min", processTime * 0.10, "faraday"),
      voltage_V: mkAv(Math.round(voltage), "V", voltage * 0.10, "type_thickness"),
      power_consumption_Wh: mkAv(Math.round(power * 10) / 10, "Wh", power * 0.15, "VIA_t"),
      dimensional_growth_um: mkAv(Math.round(dimGrowth * 10) / 10, "µm", dimGrowth * 0.10, "growth_ratio"),
      hardness_HV: mkAv(hardness, "HV", hardness * 0.10, "type"),
      weight_gain_g_m2: mkAv(Math.round(weightGain * 10) / 10, "g/m²", weightGain * 0.10, "density"),
      corrosion_hours_salt_spray: mkAv(saltSprayHours, "hours", saltSprayHours * 0.15, "ASTM_B117"),
      dye_absorption_rating: mkAv(dyeRating, "rating", dyeRating > 0 ? 1 : 0, "pore_structure"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const anodizingProcessEngine = new AnodizingProcessEngine();
