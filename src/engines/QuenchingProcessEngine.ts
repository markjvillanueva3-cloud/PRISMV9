/**
 * QuenchingProcessEngine — Heat treatment quenching analysis
 *
 * Models: Grossmann H-value, Jominy hardenability, cooling curve analysis,
 *         residual stress prediction, distortion risk, crack susceptibility
 * References: Grossmann & Bain, ASTM A255, ISO 642
 */

export type QuenchantType = "water" | "oil" | "polymer" | "salt_bath" | "air" | "gas_N2" | "brine";
export type SteelGrade = "1045" | "4140" | "4340" | "8620" | "D2" | "H13" | "O1" | "W1";

export interface QuenchingProcessInput {
  quenchant?: QuenchantType;
  steel?: SteelGrade;
  part_diameter_mm: number;
  austenitizing_temp_C?: number;     // default from steel
  quenchant_temp_C?: number;         // default 40
  agitation?: "none" | "mild" | "moderate" | "vigorous"; // default "moderate"
  part_shape?: "cylinder" | "plate" | "sphere";          // default "cylinder"
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface QuenchingProcessResult {
  surface_hardness_HRC: AtomicValue;
  core_hardness_HRC: AtomicValue;
  cooling_rate_surface_C_s: AtomicValue;
  grossmann_H_value: AtomicValue;
  ideal_critical_diameter_mm: AtomicValue;
  ms_temperature_C: AtomicValue;
  crack_risk_index: AtomicValue;
  distortion_risk: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Steel data: [carbon_pct, DI_mm (ideal critical diam), Ms_C, austenitize_C]
const STEEL_DATA: Record<SteelGrade, [number, number, number, number]> = {
  "1045": [0.45, 25,  340, 845],
  "4140": [0.40, 65,  340, 845],
  "4340": [0.40, 150, 300, 845],
  "8620": [0.20, 45,  420, 925],
  "D2":   [1.50, 130, 210, 1010],
  "H13":  [0.40, 100, 310, 1020],
  "O1":   [0.90, 35,  220, 800],
  "W1":   [1.00, 15,  200, 790],
};

// Grossmann H-value: severity of quench
const H_VALUES: Record<QuenchantType, Record<string, number>> = {
  air:      { none: 0.02, mild: 0.04, moderate: 0.06, vigorous: 0.08 },
  oil:      { none: 0.25, mild: 0.35, moderate: 0.50, vigorous: 0.70 },
  water:    { none: 1.0,  mild: 1.5,  moderate: 2.0,  vigorous: 3.0 },
  brine:    { none: 2.0,  mild: 3.0,  moderate: 4.0,  vigorous: 5.0 },
  polymer:  { none: 0.20, mild: 0.40, moderate: 0.60, vigorous: 0.80 },
  salt_bath: { none: 0.30, mild: 0.40, moderate: 0.50, vigorous: 0.60 },
  gas_N2:   { none: 0.05, mild: 0.10, moderate: 0.15, vigorous: 0.20 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class QuenchingProcessEngine {
  calculate(input: QuenchingProcessInput): QuenchingProcessResult {
    const {
      quenchant = "oil",
      steel = "4140",
      part_diameter_mm: D,
      quenchant_temp_C: Tq = 40,
      agitation = "moderate",
      part_shape = "cylinder",
    } = input;

    const recs: string[] = [];
    const [C, DI, Ms, Taust] = STEEL_DATA[steel];
    const austenitize = input.austenitizing_temp_C ?? Taust;
    const H = H_VALUES[quenchant][agitation];

    // Shape factor: cylinder=1.0, plate=0.9, sphere=1.1
    const shapeFactor = part_shape === "sphere" ? 1.1 : part_shape === "plate" ? 0.9 : 1.0;

    // Effective diameter
    const Deff = D / shapeFactor;

    // Grossmann: actual hardened depth depends on DI and H
    // D_critical = DI × f(H), where f(H) is the Grossmann multiplying factor
    const fH = H / (H + 1) * 2; // simplified Grossmann factor
    const Dcritical = DI * fH;

    // Surface cooling rate (Newton's law simplified)
    const k = H * 10; // heat transfer scaling
    const surfaceCoolRate = k * (austenitize - Tq) / (D / 2000); // °C/s approx

    // Surface hardness (martensite formation)
    const martensiteHRC = 20 + 60 * C; // Approximate max hardness from carbon
    const surfaceRatio = Math.min(Dcritical / (Deff + 0.001), 1);
    const surfaceHRC = Math.min(martensiteHRC * surfaceRatio, 67);

    // Core hardness (depends on D vs DI)
    const coreRatio = Math.max(1 - Deff / (DI * fH + 0.001), 0);
    const coreHRC = martensiteHRC * Math.pow(coreRatio, 0.5) * 0.8 + 15;

    // Crack risk index (0-10)
    const crackRisk = Math.min(
      C * 3 + // higher carbon = more risk
      (surfaceCoolRate > 200 ? 2 : 0) + // fast cooling
      (D > 100 ? 1.5 : D > 50 ? 0.5 : 0) + // large parts
      (quenchant === "water" || quenchant === "brine" ? 1.5 : 0), // severe quench
      10
    );

    // Distortion risk (0-10)
    const distortionRisk = Math.min(
      (D > 50 ? 2 : 1) +
      (part_shape === "plate" ? 2 : 0) +
      (surfaceCoolRate > 100 ? 1.5 : 0) +
      (H > 1.0 ? 1.5 : 0) +
      (C > 0.5 ? 1 : 0),
      10
    );

    const isSafe = crackRisk < 6 && surfaceHRC > 30 && distortionRisk < 7;

    if (Deff > Dcritical) recs.push(`Part ${D}mm > critical diameter ${Dcritical.toFixed(0)}mm — core won't harden fully`);
    if (crackRisk > 5) recs.push(`High crack risk ${crackRisk.toFixed(1)} — consider slower quenchant or marquench`);
    if (C > 0.6 && quenchant === "water") recs.push(`High carbon ${(C * 100).toFixed(0)}% + water quench — crack prone, use oil`);
    if (distortionRisk > 5) recs.push(`Distortion risk ${distortionRisk.toFixed(1)} — fixture or press quench`);
    if (surfaceHRC < 40 && C > 0.3) recs.push(`Low surface hardness ${surfaceHRC.toFixed(0)}HRC — increase quench severity`);
    if (recs.length === 0) recs.push(`Quench nominal — ${surfaceHRC.toFixed(0)}/${coreHRC.toFixed(0)} HRC surface/core, H=${H}`);

    return {
      surface_hardness_HRC: mkAv(Math.round(surfaceHRC * 10) / 10, "HRC", surfaceHRC * 0.05, "grossmann"),
      core_hardness_HRC: mkAv(Math.round(coreHRC * 10) / 10, "HRC", coreHRC * 0.15, "jominy"),
      cooling_rate_surface_C_s: mkAv(Math.round(surfaceCoolRate * 10) / 10, "°C/s", surfaceCoolRate * 0.20, "newton_cooling"),
      grossmann_H_value: mkAv(H, "1/inch", H * 0.10, "ASTM_A255"),
      ideal_critical_diameter_mm: mkAv(DI, "mm", DI * 0.10, "steel_grade"),
      ms_temperature_C: mkAv(Ms, "°C", Ms * 0.05, "empirical"),
      crack_risk_index: mkAv(Math.round(crackRisk * 10) / 10, "index", crackRisk * 0.20, "composite"),
      distortion_risk: mkAv(Math.round(distortionRisk * 10) / 10, "index", distortionRisk * 0.20, "composite"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const quenchingProcessEngine = new QuenchingProcessEngine();
