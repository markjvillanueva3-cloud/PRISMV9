/**
 * TurningWearPredictionEngine — Per-operation Usui wear, chip form prediction, batch life.
 *
 * Combines three capabilities (U-LPR14, U-LPR15, U-LPR16):
 * 1. Per-operation wear accumulation using Usui dW/dt = A·σn·Vs·exp(-B/θ)
 * 2. Chip form prediction → wear mode mapping
 * 3. Multi-part batch life predictor with Vc optimization
 *
 * References:
 * - Usui, Shirakashi & Kitagawa (1978), "Analytical Prediction of Cutting Tool Wear"
 * - Loewen & Shaw (1954), "On the Analysis of Cutting Tool Temperatures", Trans ASME
 * - Altintas, "Manufacturing Automation", §2.3 (Kienzle), §4.5 (wear)
 * - Sandvik "Metalcutting Technical Guide" — chip form classification
 * - ISO 3685:1993 — Tool-life testing with single-point turning tools
 *
 * @module engines/TurningWearPredictionEngine
 * @milestone LATHE-PRO-MS1 U-LPR14, U-LPR15, U-LPR16
 */

import {
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  CANONICAL_KIENZLE,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";
import { turningInsertLifeEngine } from "./TurningInsertLifeEngine.js";
import { ThermalWearCouplingEngine } from "./ThermalWearCouplingEngine.js";

const thermalWear = new ThermalWearCouplingEngine();

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TurningOperation {
  id: string;
  type: "od_rough" | "od_finish" | "face_rough" | "face_finish" | "bore_rough" | "bore_finish" | "groove" | "thread" | "cutoff" | "drill";
  /** Which insert station (turret position) performs this op */
  insert_station: number;
  /** Diameter being machined [mm] */
  diameter_mm: number;
  /** Cut length [mm] */
  cut_length_mm: number;
  /** Depth of cut [mm] */
  ap_mm: number;
  /** Feed per rev [mm/rev] */
  f_mm_rev: number;
  /** Cutting speed [m/min] */
  Vc_m_min: number;
  /** Number of passes */
  passes: number;
  /** Is this an interrupted cut? */
  interrupted?: boolean;
}

export interface PerOpWearInput {
  iso_group: ISOGroup;
  material_name?: string;
  hardness_HB?: number;
  coating?: string;
  nose_radius_mm?: number;
  operations: TurningOperation[];
}

export interface PerOpWearResult {
  operation_id: string;
  insert_station: number;
  /** Cutting time [min] */
  cutting_time_min: number;
  /** Cut length [mm] */
  total_cut_length_mm: number;
  /** Usui wear rate [µm/min] */
  wear_rate_um_min: number;
  /** Wear accumulated [µm VB] */
  wear_um: number;
  /** Cutting force [N] */
  Fc_N: number;
  /** Estimated temperature [°C] */
  temperature_C: number;
  /** Chip form prediction */
  chip_form: ChipFormResult;
}

export interface OperationWearResult {
  operations: PerOpWearResult[];
  /** Per-station cumulative wear [µm] */
  station_wear: Record<number, { total_wear_um: number; total_time_min: number; ops: string[] }>;
  /** Stations exceeding VB_max */
  stations_at_risk: number[];
  source: string;
}

// ── Chip Form Types ────────────────────────────────────────────────────────

export type ChipType = "continuous" | "segmented" | "discontinuous" | "lamellar" | "built_up_edge";

export interface ChipFormResult {
  chip_type: ChipType;
  /** Primary wear mode caused by this chip type */
  primary_wear_mode: "flank" | "crater" | "notch" | "edge_chipping" | "thermal_cracking";
  /** Secondary wear mode */
  secondary_wear_mode: string;
  /** Chip control difficulty 0-1 */
  chip_control_difficulty: number;
  /** Recommended chipbreaker class */
  chipbreaker_class: "F" | "M" | "R";
  rationale: string;
}

// ── Batch Life Types ───────────────────────────────────────────────────────

export interface BatchLifeInput {
  iso_group: ISOGroup;
  material_name?: string;
  coating?: string;
  nose_radius_mm?: number;
  operations: TurningOperation[];
  batch_quantity: number;
  /** Insert cost per edge [USD] */
  insert_cost_per_edge?: number;
  /** Target parts per edge (for optimization) */
  target_parts_per_edge?: number;
}

export interface BatchLifeResult {
  parts_per_edge: number;
  insert_changes_per_batch: number;
  /** Per-station change schedule */
  change_schedule: Array<{
    station: number;
    parts_per_edge: number;
    changes_needed: number;
    change_at_parts: number[];
  }>;
  /** Cost analysis */
  cost: {
    total_insert_cost: number;
    cost_per_part_tooling: number;
    edges_consumed: number;
  };
  /** Vc adjustment suggestion to hit target parts per edge */
  optimization?: {
    current_parts_per_edge: number;
    target_parts_per_edge: number;
    suggested_vc_adjustment_pct: number;
    suggested_vc_m_min: number;
    projected_parts_per_edge: number;
  };
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VB_MAX_UM = 300;

/** Usui coefficients per ISO group — Ref: Altintas Table 4.2, calibrated to Sandvik data */
const USUI_COEFFICIENTS: Record<ISOGroup, { A: number; B: number }> = {
  P: { A: 1.0e-5,  B: 5000 },   // Steel: moderate wear
  M: { A: 1.5e-5,  B: 4500 },   // Stainless: higher wear (work hardening)
  K: { A: 0.8e-5,  B: 5500 },   // Cast iron: abrasive but cooler
  N: { A: 0.3e-5,  B: 6000 },   // Aluminum: low wear (soft, high thermal)
  S: { A: 3.0e-5,  B: 3500 },   // Superalloys: extreme wear
  H: { A: 2.0e-5,  B: 4000 },   // Hardened: high wear, high forces
};

/** Chip form classification by ISO group — Ref: Sandvik "Metalcutting Technical Guide" Ch.4 */
const CHIP_FORM_MAP: Record<ISOGroup, { type: ChipType; primary: string; secondary: string; difficulty: number }> = {
  P: { type: "continuous",     primary: "crater",          secondary: "flank (abrasion + diffusion)", difficulty: 0.5 },
  M: { type: "continuous",     primary: "notch",           secondary: "crater (BUE-assisted)",        difficulty: 0.7 },
  K: { type: "discontinuous",  primary: "flank",           secondary: "edge_chipping (abrasion)",     difficulty: 0.2 },
  N: { type: "built_up_edge",  primary: "flank",           secondary: "BUE breakaway",                difficulty: 0.6 },
  S: { type: "segmented",      primary: "notch",           secondary: "thermal_cracking (cyclic)",    difficulty: 0.9 },
  H: { type: "segmented",      primary: "flank",           secondary: "edge_chipping",                difficulty: 0.4 },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class TurningWearPredictionEngine {

  // ── U-LPR14: Per-Operation Wear Accumulation ─────────────────────────────

  /**
   * Compute Usui-model wear for each operation in sequence.
   * Accumulates per insert station so roughing and finishing inserts track separately.
   *
   * Usui canonical: dVB/dt = A · σ_n · V_s · exp(-B / T_K)
   *
   * @param input - Operations with cutting parameters
   * @returns Per-operation and per-station wear accumulation
   *
   * Ref: Usui et al. (1978), ISO 3685:1993
   */
  accumulatePerOperation(input: PerOpWearInput): OperationWearResult {
    const iso = input.iso_group;
    const usui = USUI_COEFFICIENTS[iso] ?? USUI_COEFFICIENTS.P;
    const kienzle = CANONICAL_KIENZLE[iso] ?? CANONICAL_KIENZLE.P;
    const matDb = this.resolveMaterial(iso);

    const stationWear: Record<number, { total_wear_um: number; total_time_min: number; ops: string[] }> = {};
    const opResults: PerOpWearResult[] = [];

    for (const op of input.operations) {
      // ── Cutting force (Kienzle) ──
      // Fc = kc1.1 × ap × f^(1-mc)
      const Fc = kienzleForce(kienzle.kc1_1, kienzle.mc, op.ap_mm, op.f_mm_rev);

      // ── Temperature estimate (Loewen-Shaw simplified) ──
      // T_interface ≈ T_ambient + K × (σ_y × Vc × f / k_thermal)^0.5
      // Simplified: T = 293 + C_mat × Vc^0.4 × f^0.2
      // Calibrated so steel at 200 m/min, f=0.3 gives ~650°C (923 K)
      // Ref: Loewen & Shaw (1954), Trans ASME
      const T_ambient = 293; // K (20°C)
      const k_th = matDb?.k_thermal ?? 50;
      // Higher kc = harder material = hotter; lower k_thermal = hotter
      const T_coeff = 120 * Math.sqrt(kienzle.kc1_1 / Math.max(k_th, 1));
      const T_interface = T_ambient + T_coeff * Math.pow(op.Vc_m_min / 100, 0.4) *
        Math.pow(op.f_mm_rev / 0.1, 0.2);

      // ── Contact stress estimate ──
      // σ_n ≈ Fc / (ap × contact_length), contact_length ≈ 2×f
      const contactLength = Math.max(2 * op.f_mm_rev, 0.1);
      const contactArea = op.ap_mm * contactLength;
      const sigma_n = contactArea > 0 ? Fc / contactArea : 500; // MPa

      // ── Sliding velocity ──
      // Vs = Vc / chip_compression_ratio (≈1.5-3 depending on material)
      const chipRatio = iso === "N" ? 1.2 : iso === "S" ? 2.5 : 1.8;
      const Vs = op.Vc_m_min / chipRatio;

      // ── Usui wear rate [mm/min] ──
      const wearRate_mm_min = thermalWear.wearRate(usui.A, usui.B, Vs, sigma_n, T_interface);
      // For materials where Usui underestimates (e.g., aluminum — adhesion/BUE not thermal),
      // apply a minimum wear rate derived from Taylor life: VB_max / T_taylor
      const taylorBaseline = CANONICAL_TAYLOR[iso] ?? CANONICAL_TAYLOR.P;
      const tLife = taylorLife(taylorBaseline.C, taylorBaseline.n, op.Vc_m_min);
      const minWearRate_mm_min = tLife > 0 ? 0.3 / tLife : 0.001; // VB_max=0.3mm / life
      const wearRate_um_min = Math.max(wearRate_mm_min * 1000, minWearRate_mm_min * 1000);

      // ── Cutting time ──
      const rpm = op.diameter_mm > 0
        ? (op.Vc_m_min * 1000) / (Math.PI * op.diameter_mm)
        : 1000;
      const feedRate_mm_min = op.f_mm_rev * rpm;
      const totalCutLength = op.cut_length_mm * op.passes;
      const cuttingTime = feedRate_mm_min > 0 ? totalCutLength / feedRate_mm_min : 0;

      // ── Wear for this operation ──
      const wearUm = wearRate_um_min * cuttingTime;

      // ── Chip form ──
      const chipForm = this.predictChipForm(iso, op.Vc_m_min, op.f_mm_rev, op.ap_mm);

      // ── Accumulate per station ──
      if (!stationWear[op.insert_station]) {
        stationWear[op.insert_station] = { total_wear_um: 0, total_time_min: 0, ops: [] };
      }
      stationWear[op.insert_station].total_wear_um += wearUm;
      stationWear[op.insert_station].total_time_min += cuttingTime;
      stationWear[op.insert_station].ops.push(op.id);

      opResults.push({
        operation_id: op.id,
        insert_station: op.insert_station,
        cutting_time_min: round3(cuttingTime),
        total_cut_length_mm: round1(totalCutLength),
        wear_rate_um_min: round3(wearRate_um_min),
        wear_um: round2(wearUm),
        Fc_N: round1(Fc),
        temperature_C: round1(T_interface - 273.15),
        chip_form: chipForm,
      });
    }

    // Round station totals
    for (const key of Object.keys(stationWear)) {
      const s = stationWear[Number(key)];
      s.total_wear_um = round2(s.total_wear_um);
      s.total_time_min = round3(s.total_time_min);
    }

    const stationsAtRisk = Object.entries(stationWear)
      .filter(([_, v]) => v.total_wear_um > VB_MAX_UM * 0.75)
      .map(([k]) => Number(k));

    return {
      operations: opResults,
      station_wear: stationWear,
      stations_at_risk: stationsAtRisk,
      source: "TurningWearPredictionEngine.accumulatePerOperation (Usui + Kienzle + Loewen-Shaw)",
    };
  }

  // ── U-LPR15: Chip Form Prediction ───────────────────────────────────────

  /**
   * Predict chip form based on material, speed, feed, depth.
   * Maps chip type to dominant wear mechanism.
   *
   * Ref: Sandvik "Metalcutting Technical Guide" Ch.4
   */
  predictChipForm(
    iso: ISOGroup,
    Vc_m_min: number,
    f_mm_rev: number,
    ap_mm: number,
  ): ChipFormResult {
    const base = CHIP_FORM_MAP[iso] ?? CHIP_FORM_MAP.P;

    // Speed affects chip form: very low Vc → BUE, very high Vc → more segmentation
    let chipType = base.type;
    const matDb = this.resolveMaterial(iso);
    const vcBase = matDb?.vc_base_roughing ?? 200;
    const vcRatio = Vc_m_min / vcBase;

    if (vcRatio < 0.4 && (iso === "P" || iso === "M" || iso === "N")) {
      chipType = "built_up_edge";
    } else if (vcRatio > 1.5 && (iso === "P" || iso === "M")) {
      chipType = "segmented"; // thermal softening at very high speed
    }

    // Feed affects chip form: high feed → thicker chips → easier to break
    const chipControlDifficulty = base.difficulty * (f_mm_rev < 0.15 ? 1.3 : f_mm_rev > 0.4 ? 0.7 : 1.0);

    // Map chip type → wear mode
    const wearModeMap: Record<ChipType, { primary: string; secondary: string }> = {
      continuous:     { primary: "crater",          secondary: "flank (abrasion + diffusion)" },
      segmented:      { primary: "notch",           secondary: "thermal_cracking (cyclic loading)" },
      discontinuous:  { primary: "flank",           secondary: "edge_chipping (abrasion)" },
      lamellar:       { primary: "crater",          secondary: "notch (cyclic thermal)" },
      built_up_edge:  { primary: "flank",           secondary: "BUE breakaway (surface damage)" },
    };

    const wm = wearModeMap[chipType] ?? wearModeMap.continuous;

    // Chipbreaker class recommendation
    let chipbreakerClass: "F" | "M" | "R" = "M";
    if (f_mm_rev < 0.15 && ap_mm < 1.5) chipbreakerClass = "F";
    else if (f_mm_rev > 0.35 || ap_mm > 4.0) chipbreakerClass = "R";

    return {
      chip_type: chipType,
      primary_wear_mode: wm.primary as any,
      secondary_wear_mode: wm.secondary,
      chip_control_difficulty: round2(Math.min(1, chipControlDifficulty)),
      chipbreaker_class: chipbreakerClass,
      rationale: `${chipType} chips for ISO ${iso} at ${Vc_m_min} m/min. ${wm.primary} wear dominant. ${wm.secondary}.`,
    };
  }

  // ── U-LPR16: Batch Life Predictor ───────────────────────────────────────

  /**
   * Predict insert changes and costs for a production batch.
   * Optionally suggests Vc adjustment to hit target parts per edge.
   *
   * @param input - Operations, batch size, cost data
   * @returns Batch life plan with change schedule and cost analysis
   *
   * Ref: Sandvik "Tool economy" application guide
   */
  predictBatchLife(input: BatchLifeInput): BatchLifeResult {
    // Run per-op accumulation for one part
    const onePartWear = this.accumulatePerOperation({
      iso_group: input.iso_group,
      material_name: input.material_name,
      coating: input.coating,
      nose_radius_mm: input.nose_radius_mm,
      operations: input.operations,
    });

    // Per-station parts per edge
    const schedule: BatchLifeResult["change_schedule"] = [];
    let totalEdges = 0;
    let minPartsPerEdge = Infinity;

    for (const [stationStr, data] of Object.entries(onePartWear.station_wear)) {
      const station = Number(stationStr);
      const wearPerPart = data.total_wear_um;
      const partsPerEdge = wearPerPart > 0 ? Math.floor(VB_MAX_UM / wearPerPart) : 999;
      const changesNeeded = partsPerEdge > 0 ? Math.ceil(input.batch_quantity / partsPerEdge) - 1 : 0;

      // Compute change-at-part numbers
      const changeAtParts: number[] = [];
      for (let i = 1; i <= changesNeeded; i++) {
        changeAtParts.push(i * partsPerEdge);
      }

      schedule.push({
        station,
        parts_per_edge: partsPerEdge,
        changes_needed: Math.max(0, changesNeeded),
        change_at_parts: changeAtParts,
      });

      totalEdges += Math.max(1, changesNeeded + 1);
      if (partsPerEdge < minPartsPerEdge) minPartsPerEdge = partsPerEdge;
    }

    if (minPartsPerEdge === Infinity) minPartsPerEdge = input.batch_quantity;

    // Cost analysis
    const insertCostPerEdge = input.insert_cost_per_edge ?? 8.0; // default $8 per edge
    const totalInsertCost = round2(totalEdges * insertCostPerEdge);
    const costPerPart = input.batch_quantity > 0 ? round3(totalInsertCost / input.batch_quantity) : 0;

    // Vc optimization to hit target parts per edge
    let optimization: BatchLifeResult["optimization"];
    if (input.target_parts_per_edge && input.target_parts_per_edge !== minPartsPerEdge) {
      optimization = this.suggestVcAdjustment(
        input, minPartsPerEdge, input.target_parts_per_edge,
      );
    }

    return {
      parts_per_edge: minPartsPerEdge,
      insert_changes_per_batch: schedule.reduce((s, sc) => s + sc.changes_needed, 0),
      change_schedule: schedule,
      cost: {
        total_insert_cost: totalInsertCost,
        cost_per_part_tooling: costPerPart,
        edges_consumed: totalEdges,
      },
      optimization,
      source: "TurningWearPredictionEngine.predictBatchLife",
    };
  }

  /** Suggest Vc change to hit target parts per edge */
  private suggestVcAdjustment(
    input: BatchLifeInput,
    currentPPE: number,
    targetPPE: number,
  ): BatchLifeResult["optimization"] {
    // Taylor: T ∝ Vc^(-1/n), so parts_per_edge ∝ T ∝ Vc^(-1/n)
    // To get targetPPE from currentPPE: Vc_new/Vc_old = (currentPPE/targetPPE)^n
    const taylor = CANONICAL_TAYLOR[input.iso_group] ?? CANONICAL_TAYLOR.P;
    const n = taylor.n;

    if (currentPPE <= 0 || targetPPE <= 0) return undefined;

    const vcRatio = Math.pow(currentPPE / targetPPE, n);
    const baseVc = input.operations[0]?.Vc_m_min ?? 200;
    const suggestedVc = round1(baseVc * vcRatio);
    const adjustPct = round1((vcRatio - 1) * 100);

    // Verify with a rough recalculation
    const projectedPPE = Math.round(currentPPE / Math.pow(vcRatio, 1 / n));

    return {
      current_parts_per_edge: currentPPE,
      target_parts_per_edge: targetPPE,
      suggested_vc_adjustment_pct: adjustPct,
      suggested_vc_m_min: suggestedVc,
      projected_parts_per_edge: targetPPE, // By construction
    };
  }

  private resolveMaterial(iso: ISOGroup) {
    const map: Record<string, string> = {
      P: "steel", M: "stainless_304", K: "cast_iron",
      N: "aluminum_6061", S: "titanium_gr5", H: "tool_steel",
    };
    return CANONICAL_MATERIAL_DB[map[iso] ?? "steel"];
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const turningWearPredictionEngine = new TurningWearPredictionEngine();
export { TurningWearPredictionEngine };
