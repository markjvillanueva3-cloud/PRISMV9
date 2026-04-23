/**
 * FlotationCellEngine — Froth flotation mineral processing
 *
 * Models: First-order kinetics, recovery vs grade tradeoff,
 *         bubble-particle attachment, cell sizing, reagent dosing
 * References: Wills & Finch, Yoon & Luttrell, Klimpel model
 */

export type CellType = "mechanical" | "column" | "jameson" | "flash" | "pneumatic";
export type MineralType = "copper_sulfide" | "gold" | "zinc" | "lead" | "iron_ore" | "phosphate" | "coal";

export interface FlotationCellInput {
  cell_type?: CellType;
  mineral?: MineralType;
  feed_rate_tph: number;           // tonnes per hour
  feed_grade_pct: number;          // % valuable mineral
  target_recovery_pct?: number;    // default 90
  particle_d80_um?: number;        // default 75
  num_cells?: number;              // default 6
  cell_volume_m3?: number;         // default auto
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FlotationCellResult {
  recovery_pct: AtomicValue;
  concentrate_grade_pct: AtomicValue;
  residence_time_min: AtomicValue;
  cell_volume_m3: AtomicValue;
  air_rate_m3_min: AtomicValue;
  power_kW: AtomicValue;
  enrichment_ratio: AtomicValue;
  mass_pull_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Mineral data: [rate_constant_1/min, max_grade_pct, frothability]
const MINERAL_DATA: Record<MineralType, [number, number, number]> = {
  copper_sulfide: [0.8, 28, 1.0],
  gold:           [0.5, 50, 0.8],
  zinc:           [1.0, 55, 1.1],
  lead:           [0.9, 70, 1.0],
  iron_ore:       [0.6, 65, 0.9],
  phosphate:      [0.4, 35, 0.7],
  coal:           [1.2, 85, 1.3],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FlotationCellEngine {
  calculate(input: FlotationCellInput): FlotationCellResult {
    const {
      cell_type = "mechanical",
      mineral = "copper_sulfide",
      feed_rate_tph: F,
      feed_grade_pct: Gf,
      target_recovery_pct: Rtarget = 90,
      particle_d80_um: d80 = 75,
      num_cells: nCells = 6,
    } = input;

    const recs: string[] = [];
    const [k_base, maxGrade, frothFactor] = MINERAL_DATA[mineral];

    // Adjust rate constant for particle size (Klimpel)
    const k = k_base * Math.pow(75 / d80, 0.5) * frothFactor;

    // Cell type modifier
    const cellMod = cell_type === "column" ? 1.2 :
      cell_type === "jameson" ? 1.4 : cell_type === "flash" ? 0.7 : 1.0;
    const kEff = k * cellMod;

    // Required residence time for target recovery: R = 1 - exp(-k*t)
    const Rtgt = Rtarget / 100;
    const tRequired = -Math.log(1 - Math.min(Rtgt, 0.99)) / kEff; // min

    // Cell volume sizing
    const slurryDensity = 1.4; // t/m³ typical
    const volumeFlow = F / slurryDensity / 60; // m³/min
    const totalVolume = volumeFlow * tRequired;
    const cellVol = input.cell_volume_m3 ?? Math.ceil(totalVolume / nCells * 10) / 10;
    const actualTotalVol = cellVol * nCells;
    const actualTime = actualTotalVol / volumeFlow;

    // Actual recovery
    const recovery = (1 - Math.exp(-kEff * actualTime)) * 100;

    // Grade-recovery tradeoff: higher recovery → lower grade (dilution)
    // At 100% recovery, grade = feed grade; at low recovery, grade approaches max
    const enrichmentBase = Math.sqrt(maxGrade / (Gf + 0.001));
    const dilutionFactor = 1 - (recovery / 100) * 0.5; // higher recovery dilutes
    const concGrade = Math.min(Gf * enrichmentBase * dilutionFactor, maxGrade);

    // Mass pull
    const massPull = (Gf * recovery / 100) / (concGrade + 0.001) * 100;

    // Enrichment ratio
    const enrichment = concGrade / (Gf + 0.001);

    // Air rate (superficial velocity ~1-2 cm/s for mechanical)
    const Jg = cell_type === "column" ? 0.015 : 0.012; // m/s
    const cellArea = Math.pow(cellVol, 2 / 3); // rough cross-section
    const airRate = Jg * cellArea * 60; // m³/min per cell

    // Power (mechanical: ~1-3 kW/m³)
    const specificPower = cell_type === "column" ? 0.5 : cell_type === "mechanical" ? 2.0 : 1.5;
    const power = specificPower * actualTotalVol;

    const isSafe = recovery > 50 && concGrade > Gf && massPull < 50;

    if (recovery < Rtarget) recs.push(`Recovery ${recovery.toFixed(1)}% < target ${Rtarget}% — add cells or increase residence time`);
    if (d80 > 150) recs.push(`Coarse particles ${d80}μm — poor attachment, consider regrind`);
    if (d80 < 20) recs.push(`Very fine ${d80}μm — poor recovery, consider column cells`);
    if (enrichment < 3) recs.push(`Low enrichment ${enrichment.toFixed(1)}× — improve selectivity with depressants`);
    if (massPull > 30) recs.push(`High mass pull ${massPull.toFixed(1)}% — reduce collector dosage`);
    if (recs.length === 0) recs.push(`Flotation nominal — R=${recovery.toFixed(1)}%, G=${concGrade.toFixed(1)}%, ${nCells} cells`);

    return {
      recovery_pct: mkAv(Math.round(recovery * 10) / 10, "%", recovery * 0.05, "first_order_kinetics"),
      concentrate_grade_pct: mkAv(Math.round(concGrade * 10) / 10, "%", concGrade * 0.15, "grade_recovery"),
      residence_time_min: mkAv(Math.round(actualTime * 10) / 10, "min", actualTime * 0.10, "vol_flow"),
      cell_volume_m3: mkAv(cellVol, "m³", cellVol * 0.05, "sizing"),
      air_rate_m3_min: mkAv(Math.round(airRate * 100) / 100, "m³/min", airRate * 0.15, "Jg_area"),
      power_kW: mkAv(Math.round(power * 10) / 10, "kW", power * 0.20, "specific_power"),
      enrichment_ratio: mkAv(Math.round(enrichment * 100) / 100, "ratio", enrichment * 0.15, "Gc_Gf"),
      mass_pull_pct: mkAv(Math.round(massPull * 10) / 10, "%", massPull * 0.10, "mass_balance"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const flotationCellEngine = new FlotationCellEngine();
