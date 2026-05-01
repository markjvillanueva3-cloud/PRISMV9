/**
 * TankDesignEngine — Pressure vessel / storage tank wall thickness
 *
 * Models: ASME VIII Div.1 thin-wall (t=PR/(SE-0.6P)), hydrostatic head,
 *         wind/seismic loads, nozzle reinforcement
 * References: ASME BPVC VIII-1, API 650 (atmospheric), API 620
 * Safety: Corrosion allowance, MAWP, hydrotest pressure
 */

export type TankType = "pressure_vessel" | "atmospheric" | "cryogenic" | "underground";
export type TankShape = "cylindrical_vertical" | "cylindrical_horizontal" | "spherical";
export type TankMaterial = "sa516_70" | "sa240_304" | "sa240_316" | "sa285_c" | "aluminum_5083";

export interface TankDesignInput {
  diameter_mm: number;
  length_or_height_mm: number;
  design_pressure_bar?: number;         // default 0 (atmospheric)
  design_temp_C?: number;
  tank_type?: TankType;
  shape?: TankShape;
  material?: TankMaterial;
  corrosion_allowance_mm?: number;
  fluid_density_kg_m3?: number;
  joint_efficiency?: number;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TankDesignResult {
  shell_thickness_mm: AtomicValue;
  head_thickness_mm: AtomicValue;
  mawp_bar: AtomicValue;
  hydrotest_pressure_bar: AtomicValue;
  volume_m3: AtomicValue;
  weight_kg: AtomicValue;
  hydrostatic_head_bar: AtomicValue;
  total_design_pressure_bar: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const TANK_MAT: Record<TankMaterial, { S_MPa: number; density: number }> = {
  sa516_70: { S_MPa: 138, density: 7850 },
  sa240_304: { S_MPa: 138, density: 8000 },
  sa240_316: { S_MPa: 138, density: 8000 },
  sa285_c:  { S_MPa: 108, density: 7850 },
  aluminum_5083: { S_MPa: 80, density: 2660 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TankDesignEngine {
  calculate(input: TankDesignInput): TankDesignResult {
    const {
      diameter_mm: D,
      length_or_height_mm: L,
      design_pressure_bar: Pdesign = 0,
      design_temp_C = 20,
      tank_type = "atmospheric",
      shape = "cylindrical_vertical",
      material = "sa516_70",
      corrosion_allowance_mm: CA = 3,
      fluid_density_kg_m3: rhoFluid = 1000,
      joint_efficiency: E = 0.85,
    } = input;

    const recs: string[] = [];
    const mp = TANK_MAT[material];
    const R = D / 2; // mm
    const S = mp.S_MPa;

    // Hydrostatic head pressure
    const hydroHead = rhoFluid * 9.81 * (L / 1000) / 1e5; // bar

    // Total design pressure
    const P_total = Math.max(Pdesign + (shape === "cylindrical_vertical" ? hydroHead : 0), 0.5);
    const P = P_total * 0.1; // MPa

    // Shell thickness: ASME VIII-1: t = PR/(SE - 0.6P) + CA
    const tShell = (P * R) / (S * E - 0.6 * P) + CA;

    // Head thickness (2:1 semi-ellipsoidal): t = PD/(2SE - 0.2P) + CA
    const tHead = (P * D) / (2 * S * E - 0.2 * P) + CA;

    // Round up to standard plate thicknesses (mm)
    const stdPlates = [4,5,6,8,10,12,14,16,18,20,22,25,28,30,32,35,38,40,45,50];
    const tShellStd = stdPlates.find(p => p >= tShell) ?? Math.ceil(tShell);
    const tHeadStd = stdPlates.find(p => p >= tHead) ?? Math.ceil(tHead);

    // MAWP (back-calculate from actual thickness)
    const tNet = tShellStd - CA;
    const MAWP = (S * E * tNet) / (R + 0.6 * tNet) / 0.1; // bar

    // Hydrotest: 1.3 × MAWP (ASME) or 1.5× for new
    const hydrotest = MAWP * 1.3;

    // Volume
    let volume: number;
    if (shape === "spherical") {
      volume = (4 / 3) * Math.PI * Math.pow(D / 2000, 3);
    } else {
      volume = Math.PI * Math.pow(D / 2000, 2) * (L / 1000);
    }

    // Weight (approximate shell + 2 heads)
    const shellArea = Math.PI * D * L / 1e6; // m²
    const headArea = 2 * Math.PI * (D / 2) * (D / 2) / 1e6; // m² (approx)
    const weight = (shellArea * tShellStd + headArea * tHeadStd) * mp.density / 1000;

    const isSafe = MAWP >= P_total && tShellStd >= 4;

    if (design_temp_C > 400) recs.push(`Design temp ${design_temp_C}°C — verify allowable stress derating`);
    if (tShellStd > 50) recs.push(`Thick shell ${tShellStd}mm — consider higher-strength material`);
    if (CA > 6) recs.push(`Large corrosion allowance ${CA}mm — consider corrosion-resistant lining`);
    if (tank_type === "atmospheric" && Pdesign > 1) recs.push(`Atmospheric tank at ${Pdesign}bar — use API 620 or ASME VIII`);
    if (recs.length === 0) recs.push(`Tank design nominal — ${tShellStd}mm shell, MAWP ${MAWP.toFixed(1)}bar, ${weight.toFixed(0)}kg`);

    return {
      shell_thickness_mm: mkAv(tShellStd, "mm", 0, "asme_viii_1"),
      head_thickness_mm: mkAv(tHeadStd, "mm", 0, "asme_viii_1"),
      mawp_bar: mkAv(Math.round(MAWP * 10) / 10, "bar", MAWP * 0.05, "back_calculated"),
      hydrotest_pressure_bar: mkAv(Math.round(hydrotest * 10) / 10, "bar", hydrotest * 0.05, "asme_factor"),
      volume_m3: mkAv(Math.round(volume * 100) / 100, "m³", volume * 0.02, "geometry"),
      weight_kg: mkAv(Math.round(weight), "kg", weight * 0.10, "shell_weight"),
      hydrostatic_head_bar: mkAv(Math.round(hydroHead * 100) / 100, "bar", hydroHead * 0.03, "fluid_statics"),
      total_design_pressure_bar: mkAv(Math.round(P_total * 100) / 100, "bar", P_total * 0.05, "sum_pressures"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const tankDesignEngine = new TankDesignEngine();
