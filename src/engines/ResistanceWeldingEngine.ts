/**
 * ResistanceWeldingEngine — Resistance spot/seam/projection welding analysis
 *
 * Models: Joule heating (I²Rt), nugget growth, lobe diagram,
 *         electrode force, expulsion limits, weld current range
 * References: RWMA, AWS C1.1, ISO 14373, Zhang & Senkara
 */

export type RWType = "spot" | "seam" | "projection" | "flash_butt" | "upset";
export type RWMaterial = "mild_steel" | "galvanized" | "stainless" | "aluminum" | "copper" | "nickel";

export interface ResistanceWeldingInput {
  type?: RWType;
  material?: RWMaterial;
  sheet_thickness_mm: number;
  number_of_sheets?: number;         // default 2
  electrode_diameter_mm?: number;    // default auto
  weld_current_kA?: number;          // default auto
  weld_time_ms?: number;             // default auto
  electrode_force_kN?: number;       // default auto
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ResistanceWeldingResult {
  nugget_diameter_mm: AtomicValue;
  weld_current_kA: AtomicValue;
  weld_time_ms: AtomicValue;
  electrode_force_kN: AtomicValue;
  heat_input_J: AtomicValue;
  shear_strength_kN: AtomicValue;
  weld_current_range_kA: AtomicValue;
  HAZ_width_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [resistivity_μΩ_cm, thermal_cond_W/mK, Tmelt_C, yield_MPa, UTS_MPa]
const RW_MAT: Record<RWMaterial, [number, number, number, number, number]> = {
  mild_steel:  [12,  50,  1500, 250, 400],
  galvanized:  [14,  50,  1500, 250, 400],
  stainless:   [72,  15,  1450, 300, 550],
  aluminum:    [2.8, 200, 660,  100, 200],
  copper:      [1.7, 390, 1085, 70,  220],
  nickel:      [7.0, 90,  1450, 200, 500],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ResistanceWeldingEngine {
  calculate(input: ResistanceWeldingInput): ResistanceWeldingResult {
    const {
      type = "spot",
      material = "mild_steel",
      sheet_thickness_mm: t,
      number_of_sheets: nSheets = 2,
    } = input;

    const recs: string[] = [];
    const [rhoElec, kMat, Tmelt, sigmaY, UTS] = RW_MAT[material];

    // Electrode diameter (rule of thumb: 5√t mm)
    const electrodeDiam = input.electrode_diameter_mm ?? Math.max(4, Math.round(5 * Math.sqrt(t) * 10) / 10);

    // Nugget diameter target (typically 4√t to 5√t)
    const nuggetTarget = 4.5 * Math.sqrt(t);

    // Contact area
    const contactArea = Math.PI * Math.pow(electrodeDiam / 2, 2); // mm²

    // Electrode force (rule: ~1 kN per mm electrode diameter for steel)
    const forceFactor = material === "aluminum" ? 1.5 : material === "copper" ? 2.0 :
      material === "stainless" ? 1.2 : 1.0;
    const force = input.electrode_force_kN ?? electrodeDiam * 0.8 * forceFactor;

    // Contact resistance (proportional to resistivity, inversely to force)
    const contactR = rhoElec * 1e-6 * t / 1000 / (contactArea * 1e-6) * (nSheets - 1); // Ω

    // Weld current (auto: based on nugget formation requirement)
    const currentFactor = material === "aluminum" ? 3.0 : material === "copper" ? 4.0 : 1.0;
    const weldCurrent = input.weld_current_kA ?? Math.round(nuggetTarget * 1.5 * currentFactor * 10) / 10;

    // Weld time (auto: scales with thickness)
    const timeFactor = material === "aluminum" ? 0.5 : material === "copper" ? 0.3 : 1.0;
    const weldTime = input.weld_time_ms ?? Math.round(t * 100 * timeFactor);

    // Heat input: Q = I²Rt
    const heatInput = Math.pow(weldCurrent * 1000, 2) * contactR * weldTime / 1000; // J

    // Nugget diameter (function of heat input and contact area)
    const nuggetDiam = Math.min(electrodeDiam, nuggetTarget * Math.pow(heatInput / (contactArea * t * rhoElec * 0.1 + 0.001), 0.15));

    // Shear strength
    const nuggetArea = Math.PI * Math.pow(nuggetDiam / 2, 2); // mm²
    const shearStrength = nuggetArea * UTS * 0.6 / 1000; // kN

    // Weld current range (before expulsion)
    const currentRange = weldCurrent * 0.3; // ±15% typical lobe width

    // HAZ
    const HAZ = Math.sqrt(kMat * weldTime / 1000 / (rhoElec * 1e-6 * 500 + 0.001)) * 0.05;

    const isSafe = nuggetDiam >= 3.5 * Math.sqrt(t) && weldCurrent < 50 && heatInput > 0;

    if (nuggetDiam < 3.5 * Math.sqrt(t)) recs.push(`Undersized nugget ${nuggetDiam.toFixed(1)}mm < ${(3.5 * Math.sqrt(t)).toFixed(1)}mm — increase current or time`);
    if (material === "galvanized") recs.push(`Galvanized — zinc coating increases electrode wear, use CuCrZr tips`);
    if (material === "aluminum" && type === "spot") recs.push(`Aluminum spot — oxide layer requires high current, short time`);
    if (t > 3 && type === "spot") recs.push(`Thick sheet ${t}mm — consider projection welding for better heat balance`);
    if (nSheets > 3) recs.push(`${nSheets}-sheet stack — current shunting, verify nugget at each interface`);
    if (recs.length === 0) recs.push(`RSW nominal — nugget ${nuggetDiam.toFixed(1)}mm, ${weldCurrent}kA, ${weldTime}ms, ${shearStrength.toFixed(1)}kN`);

    return {
      nugget_diameter_mm: mkAv(Math.round(nuggetDiam * 10) / 10, "mm", nuggetDiam * 0.10, "heat_area"),
      weld_current_kA: mkAv(weldCurrent, "kA", weldCurrent * 0.05, "nugget_target"),
      weld_time_ms: mkAv(weldTime, "ms", weldTime * 0.10, "thickness"),
      electrode_force_kN: mkAv(Math.round(force * 100) / 100, "kN", force * 0.10, "diam_material"),
      heat_input_J: mkAv(Math.round(heatInput * 10) / 10, "J", heatInput * 0.15, "I²Rt"),
      shear_strength_kN: mkAv(Math.round(shearStrength * 100) / 100, "kN", shearStrength * 0.15, "nugget_UTS"),
      weld_current_range_kA: mkAv(Math.round(currentRange * 100) / 100, "kA", currentRange * 0.20, "lobe"),
      HAZ_width_mm: mkAv(Math.round(HAZ * 100) / 100, "mm", HAZ * 0.25, "thermal_diffusion"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const resistanceWeldingEngine = new ResistanceWeldingEngine();
