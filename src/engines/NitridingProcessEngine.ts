/**
 * NitridingProcessEngine — Nitriding/nitrocarburizing process analysis
 *
 * Models: Fick's law nitrogen diffusion, compound layer growth,
 *         hardness profile, Kp parabolic rate law, distortion prediction
 * References: ASM Handbook Vol 4, Somers & Mittemeijer, AMS 2759/10
 */

export type NitridingMethod = "gas" | "plasma_ion" | "salt_bath" | "ferritic_nitrocarburizing";
export type NitridingSteelType = "4140" | "4340" | "H13" | "nitralloy_135M" | "stainless_17_4" | "38CrMoAl";

export interface NitridingProcessInput {
  method?: NitridingMethod;
  steel?: NitridingSteelType;
  target_case_depth_mm: number;
  nitriding_temp_C?: number;         // default 520
  process_time_h?: number;           // default auto from case depth
  dissociation_pct?: number;         // default 25 (NH3 dissociation %)
  compound_layer_wanted?: boolean;   // default true (white layer)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface NitridingProcessResult {
  total_time_h: AtomicValue;
  surface_hardness_HV: AtomicValue;
  compound_layer_um: AtomicValue;
  diffusion_zone_mm: AtomicValue;
  nitrogen_surface_pct: AtomicValue;
  distortion_um: AtomicValue;
  hardness_at_depth: AtomicValue;
  energy_kWh_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Steel: [max_surface_HV, nitrogen_affinity_factor, Al/Cr content factor]
const NITRIDING_STEEL: Record<NitridingSteelType, [number, number, number]> = {
  "4140":            [550,  0.8, 1.0],
  "4340":            [550,  0.8, 1.0],
  "H13":             [1100, 1.2, 1.5],
  "nitralloy_135M":  [1100, 1.5, 2.0],
  "stainless_17_4":  [900,  0.6, 0.8],
  "38CrMoAl":        [1050, 1.4, 1.8],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class NitridingProcessEngine {
  calculate(input: NitridingProcessInput): NitridingProcessResult {
    const {
      method = "gas",
      steel = "4140",
      target_case_depth_mm: dTarget,
      nitriding_temp_C: T = 520,
      dissociation_pct: dissoc = 25,
      compound_layer_wanted = true,
    } = input;

    const recs: string[] = [];
    const [maxHV, nAffinity, crAlFactor] = NITRIDING_STEEL[steel];

    // Nitrogen effective diffusion coefficient (Arrhenius, with trapping by nitride precipitates)
    const D0 = 6.6e-9; // m²/s (effective, ~100× lower than pure Fe due to CrN/AlN trapping)
    const Q = 77000;    // J/mol
    const R = 8.314;
    const TK = T + 273.15;
    const Dn = D0 * Math.exp(-Q / (R * TK));

    // Method modifier
    const methodMod = method === "plasma_ion" ? 0.7 :
      method === "salt_bath" ? 0.8 : method === "ferritic_nitrocarburizing" ? 0.9 : 1.0;

    // Parabolic rate law: d² = Kp × t
    // Kp = 4 × D × f(dissociation, affinity)
    const Kp = 4 * Dn * nAffinity * (dissoc / 25);
    const dMeters = dTarget / 1000;
    const tCalc = dMeters * dMeters / (Kp + 1e-20) * methodMod;
    const tHours = input.process_time_h ?? tCalc / 3600;

    // Actual case depth achieved
    const actualTime = tHours * 3600;
    const actualDepth = Math.sqrt(Kp * actualTime / methodMod) * 1000; // mm

    // Compound layer (white layer) thickness
    const compoundRate = compound_layer_wanted ? 0.3 : 0.05; // μm/√h
    const compoundLayer = compoundRate * Math.sqrt(tHours) * crAlFactor *
      (method === "plasma_ion" && !compound_layer_wanted ? 0.1 : 1.0);

    // Surface hardness (ramps quickly in first few hours, saturates)
    const tempFactor = 1 - (T - 500) / 200 * 0.1; // slight decrease at higher temp
    const saturation = 1 - Math.exp(-tHours / 5); // rapid ramp, saturates ~15h
    const surfaceHV = maxHV * tempFactor * Math.max(saturation, 0.2);

    // Hardness at 50% case depth
    const hardnessAtDepth = surfaceHV * 0.6 + 200;

    // Surface nitrogen content
    const surfaceN = 0.3 + nAffinity * 0.2 * Math.min(tHours / 20, 1);

    // Distortion (very low for nitriding due to low temperature)
    const distortion = (T - 480) * 0.5 + dTarget * 2 +
      (method === "gas" ? 3 : method === "plasma_ion" ? 1 : 5); // μm

    // Energy consumption
    const energy = method === "plasma_ion" ? 3 :
      method === "gas" ? 5 : method === "salt_bath" ? 8 : 4; // kWh/kg typical

    const isSafe = T < 590 && surfaceHV > 400 && distortion < 50;

    if (T > 570) recs.push(`High temp ${T}°C — diffusion zone softening, reduce for harder case`);
    if (T < 490) recs.push(`Low temp ${T}°C — very slow diffusion, increase to 500-540°C`);
    if (tHours > 80) recs.push(`Very long cycle ${tHours.toFixed(0)}h — consider plasma for speed`);
    if (!compound_layer_wanted && method === "gas") recs.push(`White layer removal needed for gas nitriding — use 2-stage Floe process`);
    if (compoundLayer > 25) recs.push(`Thick compound layer ${compoundLayer.toFixed(0)}μm — may spall under load`);
    if (recs.length === 0) recs.push(`Nitriding nominal — ${tHours.toFixed(1)}h, ${surfaceHV.toFixed(0)}HV, case=${actualDepth.toFixed(2)}mm`);

    return {
      total_time_h: mkAv(Math.round(tHours * 10) / 10, "h", tHours * 0.10, "parabolic_Kp"),
      surface_hardness_HV: mkAv(Math.round(surfaceHV), "HV", surfaceHV * 0.10, "steel_nitride"),
      compound_layer_um: mkAv(Math.round(compoundLayer * 10) / 10, "μm", compoundLayer * 0.25, "growth_law"),
      diffusion_zone_mm: mkAv(Math.round(actualDepth * 100) / 100, "mm", actualDepth * 0.10, "fick_parabolic"),
      nitrogen_surface_pct: mkAv(Math.round(surfaceN * 1000) / 1000, "%", surfaceN * 0.15, "dissociation"),
      distortion_um: mkAv(Math.round(distortion * 10) / 10, "μm", distortion * 0.30, "low_temp"),
      hardness_at_depth: mkAv(Math.round(hardnessAtDepth), "HV", hardnessAtDepth * 0.15, "profile"),
      energy_kWh_kg: mkAv(energy, "kWh/kg", energy * 0.20, "method_typical"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const nitridingProcessEngine = new NitridingProcessEngine();
