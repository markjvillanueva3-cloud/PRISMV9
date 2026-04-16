/**
 * HoningEngine — Precision Bore Honing Calculations
 *
 * Calculates honing parameters for cylinder bore finishing:
 * - Stone selection and pressure
 * - Stroke rate, rotation speed, crosshatch angle
 * - Stock removal rate and cycle time
 * - Surface finish prediction (Ra, Rk, Rpk, Rvk)
 * - Plateau honing parameters
 *
 * Reference: Sunnen Honing Technical Guide,
 *            Nagel Honing Handbook,
 *            ISO 13565 (surface texture — plateau honing)
 *
 * Actions: hone_params, hone_surface, hone_cycle, hone_stone_select
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type StoneType =
  | "vitrified_cbn"
  | "vitrified_diamond"
  | "resin_diamond"
  | "metal_bond_diamond"
  | "silicon_carbide"
  | "aluminum_oxide";

export type HoningStage = "rough" | "semi_finish" | "finish" | "plateau";

export interface HoningInput {
  bore_diameter_mm: number;
  bore_length_mm: number;
  stock_removal_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  material_hardness_hrc?: number;
  target_ra_um?: number;
  target_roundness_um?: number;
  crosshatch_angle_deg?: number;
  stage?: HoningStage;
  stone_type?: StoneType;
  coolant?: "honing_oil" | "water_based" | "synthetic";
}

export interface HoningResult {
  rotation_speed: AtomicValue;
  stroke_rate: AtomicValue;
  stone_pressure: AtomicValue;
  crosshatch_angle: AtomicValue;
  stock_removal_rate: AtomicValue;
  cycle_time: AtomicValue;
  predicted_ra: AtomicValue;
  predicted_roundness: AtomicValue;
  stone_type: StoneType;
  stone_grit: number;
  stage: HoningStage;
  overrun_mm: AtomicValue;
  warnings: string[];
}

export interface PlateauHoningResult {
  stages: Array<{
    stage: HoningStage;
    stone_grit: number;
    stone_type: StoneType;
    cycle_time_sec: number;
    target_parameter: string;
  }>;
  final_rk: AtomicValue;
  final_rpk: AtomicValue;
  final_rvk: AtomicValue;
  total_cycle_time: AtomicValue;
}

// ── Reference Data ────────────────────────────────────────────────

/** Stone grit by stage */
const STONE_GRITS: Record<HoningStage, number> = {
  rough: 150,
  semi_finish: 280,
  finish: 500,
  plateau: 800,
};

/** Stone pressure (bar) by stage */
const STONE_PRESSURES: Record<HoningStage, number> = {
  rough: 8,
  semi_finish: 5,
  finish: 3,
  plateau: 2,
};

/** Surface speed (m/min) by material group */
const HONING_SPEEDS: Record<string, number> = {
  P: 50, M: 40, K: 60, N: 80, S: 30, H: 35,
};

/** Stock removal rate (μm/min) by stage and material */
const REMOVAL_RATES: Record<string, Record<string, number>> = {
  rough: { P: 15, M: 10, K: 20, N: 25, S: 6, H: 5 },
  semi_finish: { P: 5, M: 3, K: 8, N: 10, S: 2, H: 2 },
  finish: { P: 1.5, M: 1, K: 2, N: 3, S: 0.5, H: 0.5 },
  plateau: { P: 0.5, M: 0.3, K: 0.8, N: 1, S: 0.2, H: 0.2 },
};

/** Achievable Ra (μm) by stage */
const STAGE_RA: Record<HoningStage, number> = {
  rough: 1.6,
  semi_finish: 0.8,
  finish: 0.2,
  plateau: 0.1,
};

// ── Engine ─────────────────────────────────────────────────────────

export class HoningEngine {
  /**
   * Calculate honing parameters for a single stage.
   */
  calculate(input: HoningInput): HoningResult {
    const warnings: string[] = [];
    const d = input.bore_diameter_mm;
    const len = input.bore_length_mm;
    const iso = input.material_iso_group ?? "P";
    const stage = input.stage ?? "finish";
    const stockTotal = input.stock_removal_mm ?? this._defaultStock(stage);

    // Stone selection
    const stoneType = input.stone_type ?? this._selectStone(iso, stage);
    const grit = STONE_GRITS[stage];

    // Rotation speed (RPM) from surface speed
    const vc = HONING_SPEEDS[iso] ?? 50;
    const rpm = (vc * 1000) / (Math.PI * d);

    // Stroke rate — related to crosshatch angle
    const crosshatch = input.crosshatch_angle_deg ?? this._defaultCrosshatch(stage);
    // stroke_speed = Vc × tan(crosshatch/2)
    const strokeSpeed = vc * Math.tan((crosshatch / 2) * Math.PI / 180);
    // strokes per minute = stroke_speed / (2 × stroke_length)
    const overrun = d * 0.3; // stone overrun at each end
    const strokeLength = len + 2 * overrun;
    const strokesPerMin = (strokeSpeed * 1000) / (2 * strokeLength);

    // Stone pressure
    let pressure = STONE_PRESSURES[stage];
    if (input.material_hardness_hrc && input.material_hardness_hrc > 50) {
      pressure *= 0.7;
      warnings.push("Reduced stone pressure for hard material");
    }

    // Stock removal rate
    const baseRate = REMOVAL_RATES[stage]?.[iso] ?? 5;
    const removalRate = baseRate * (pressure / STONE_PRESSURES[stage]);

    // Cycle time (stock in μm on diameter = stock_mm × 1000)
    const stockUm = stockTotal * 1000;
    const cycleTimeSec = (stockUm / removalRate) * 60;
    const cycleTimeMin = cycleTimeSec / 60;

    // Surface finish prediction
    let ra = STAGE_RA[stage];
    if (input.coolant === "synthetic") ra *= 0.9;
    if (stoneType.includes("cbn") || stoneType.includes("diamond")) {
      ra *= 0.85;
    }

    // Roundness prediction
    const roundness = stage === "finish" ? 1 :
      stage === "plateau" ? 0.5 :
      stage === "semi_finish" ? 3 : 5;

    // Bore ratio warning
    if (len / d > 6) {
      warnings.push(
        `L/D ratio ${(len / d).toFixed(1)} — ` +
        "consider multiple stone expansion zones"
      );
    }
    if (d < 4) {
      warnings.push("Small bore — consider single-stone mandrel");
    }

    return {
      rotation_speed: av(Math.round(rpm), "rev/min", 0.1,
        "Vc × 1000 / (π × D)"),
      stroke_rate: av(round1(strokesPerMin), "str/min", 0.15,
        "Vc × tan(α/2) × 1000 / (2 × L)"),
      stone_pressure: av(round1(pressure), "bar", 0.1,
        "Sunnen honing pressure guidelines"),
      crosshatch_angle: av(crosshatch, "deg", 0,
        this._crosshatchSource(stage)),
      stock_removal_rate: av(round2(removalRate), "μm/min", 0.2,
        "Empirical removal rate model"),
      cycle_time: av(round2(cycleTimeMin), "min", 0.2,
        "stock / removal_rate"),
      predicted_ra: av(round2(ra), "μm", 0.2,
        "Stage-based Ra prediction"),
      predicted_roundness: av(round1(roundness), "μm", 0.25,
        "Stage-based roundness prediction"),
      stone_type: stoneType,
      stone_grit: grit,
      stage,
      overrun_mm: av(round1(overrun), "mm", 0.1,
        "0.3 × bore_diameter"),
      warnings,
    };
  }

  /**
   * Calculate multi-stage plateau honing (ISO 13565).
   * Used for cylinder bores — creates load-bearing plateau
   * with oil-retaining valleys.
   */
  plateauHoning(input: {
    bore_diameter_mm: number;
    bore_length_mm: number;
    material_iso_group?: string;
    target_rk?: number;
    target_rpk?: number;
    target_rvk?: number;
  }): PlateauHoningResult {
    const iso = (input.material_iso_group ?? "P") as HoningInput["material_iso_group"];
    const stages: PlateauHoningResult["stages"] = [];

    // Stage 1: Rough honing — remove stock, create base geometry
    const rough = this.calculate({
      bore_diameter_mm: input.bore_diameter_mm,
      bore_length_mm: input.bore_length_mm,
      material_iso_group: iso,
      stage: "rough",
      stock_removal_mm: 0.05,
    });
    stages.push({
      stage: "rough",
      stone_grit: 150,
      stone_type: rough.stone_type,
      cycle_time_sec: rough.cycle_time.value * 60,
      target_parameter: "Geometry correction",
    });

    // Stage 2: Semi-finish — create crosshatch valleys (Rvk)
    const semi = this.calculate({
      bore_diameter_mm: input.bore_diameter_mm,
      bore_length_mm: input.bore_length_mm,
      material_iso_group: iso,
      stage: "semi_finish",
      stock_removal_mm: 0.01,
      crosshatch_angle_deg: 45,
    });
    stages.push({
      stage: "semi_finish",
      stone_grit: 280,
      stone_type: semi.stone_type,
      cycle_time_sec: semi.cycle_time.value * 60,
      target_parameter: `Rvk ≤ ${input.target_rvk ?? 2.0} μm`,
    });

    // Stage 3: Plateau — create bearing surface (Rk, Rpk)
    const plateau = this.calculate({
      bore_diameter_mm: input.bore_diameter_mm,
      bore_length_mm: input.bore_length_mm,
      material_iso_group: iso,
      stage: "plateau",
      stock_removal_mm: 0.003,
      crosshatch_angle_deg: 135,
    });
    stages.push({
      stage: "plateau",
      stone_grit: 800,
      stone_type: plateau.stone_type,
      cycle_time_sec: plateau.cycle_time.value * 60,
      target_parameter:
        `Rk ≤ ${input.target_rk ?? 0.8}, ` +
        `Rpk ≤ ${input.target_rpk ?? 0.3} μm`,
    });

    const totalTime = stages.reduce((s, st) => s + st.cycle_time_sec, 0);

    return {
      stages,
      final_rk: av(input.target_rk ?? 0.8, "μm", 0.15,
        "ISO 13565 plateau parameter"),
      final_rpk: av(input.target_rpk ?? 0.3, "μm", 0.2,
        "ISO 13565 plateau parameter"),
      final_rvk: av(input.target_rvk ?? 2.0, "μm", 0.15,
        "ISO 13565 plateau parameter"),
      total_cycle_time: av(round1(totalTime / 60), "min", 0.2,
        "Sum of all stages"),
    };
  }

  // ── Private ────────────────────────────────────────────────────

  private _selectStone(iso: string, stage: HoningStage): StoneType {
    if (iso === "K") return "silicon_carbide"; // cast iron
    if (iso === "N") return "silicon_carbide"; // aluminum
    if (stage === "rough") return "vitrified_cbn";
    if (stage === "plateau") return "resin_diamond";
    return "vitrified_cbn";
  }

  private _defaultStock(stage: HoningStage): number {
    return {
      rough: 0.05,
      semi_finish: 0.015,
      finish: 0.005,
      plateau: 0.003,
    }[stage];
  }

  private _defaultCrosshatch(stage: HoningStage): number {
    // Standard crosshatch angles
    return {
      rough: 60,
      semi_finish: 45,
      finish: 30,
      plateau: 135, // plateau uses reverse crosshatch
    }[stage];
  }

  private _crosshatchSource(stage: HoningStage): string {
    return stage === "plateau"
      ? "ISO 13565 plateau honing (reverse crosshatch)"
      : "Sunnen crosshatch angle guidelines";
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const honingEngine = new HoningEngine();
