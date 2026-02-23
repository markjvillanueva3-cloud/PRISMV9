/**
 * PRISM Product Engine — Shared Constants & Utilities
 * ====================================================
 * Shared constants, types, and utility functions used across all Product
 * sub-engines (SFC, PPG, Shop, ACNC).
 *
 * Design: Extracted from the monolithic ProductEngine.ts to eliminate
 * circular dependencies while keeping a single source of truth for
 * material data and common helpers.
 */

import {
  SAFETY_LIMITS,
} from "./ManufacturingCalculations.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductTier = "free" | "pro" | "enterprise";
export type SFCAction =
  | "sfc_calculate"
  | "sfc_compare"
  | "sfc_optimize"
  | "sfc_quick"
  | "sfc_materials"
  | "sfc_tools"
  | "sfc_formulas"
  | "sfc_safety"
  | "sfc_history"
  | "sfc_get";

export type PPGAction =
  | "ppg_validate"
  | "ppg_translate"
  | "ppg_templates"
  | "ppg_generate"
  | "ppg_controllers"
  | "ppg_compare"
  | "ppg_syntax"
  | "ppg_batch"
  | "ppg_history"
  | "ppg_get";

export type ShopAction =
  | "shop_quote"
  | "shop_cost"
  | "shop_job"
  | "shop_schedule"
  | "shop_dashboard"
  | "shop_report"
  | "shop_compare"
  | "shop_materials"
  | "shop_history"
  | "shop_get";

export type ACNCAction =
  | "acnc_program"
  | "acnc_feature"
  | "acnc_simulate"
  | "acnc_output"
  | "acnc_tools"
  | "acnc_strategy"
  | "acnc_validate"
  | "acnc_batch"
  | "acnc_history"
  | "acnc_get";

export type ProductAction = SFCAction | PPGAction | ShopAction | ACNCAction;

export interface SFCInput {
  material?: string;
  material_hardness?: number;
  material_group?: string;
  tool_material?: string;
  tool_diameter?: number;
  number_of_teeth?: number;
  operation?: string;
  depth_of_cut?: number;
  width_of_cut?: number;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  tier?: ProductTier;
}

export interface SFCResult {
  // Core parameters
  cutting_speed_m_min: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  table_feed_mm_min: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;

  // Cutting force (Kienzle)
  cutting_force_N: number;
  power_kW: number;
  torque_Nm: number;
  specific_cutting_force_N_mm2: number;

  // Tool life (Taylor)
  tool_life_min: number;
  optimal_speed_m_min: number;

  // Surface finish
  surface_roughness_Ra_um: number;
  surface_finish_grade: string;

  // Material removal rate
  mrr_cm3_min: number;

  // Safety
  safety_score: number;
  safety_status: "safe" | "warning" | "danger";
  safety_warnings: string[];

  // Uncertainty bounds
  uncertainty: {
    cutting_speed_range: [number, number];
    force_range: [number, number];
    tool_life_range: [number, number];
    surface_roughness_range: [number, number];
  };

  // Sustainability (pro+enterprise only)
  sustainability?: {
    energy_kWh_per_part: number;
    co2_kg_per_part: number;
    coolant_liters_per_hour: number;
  };

  // Model info
  formulas_used: string[];
  calculation_time_ms: number;
  tier: ProductTier;
  tier_limited: boolean;
}

export interface SFCCompareResult {
  approaches: Array<{
    name: string;
    cutting_speed: number;
    feed: number;
    tool_life: number;
    mrr: number;
    power: number;
    surface_roughness: number;
    score: number;
  }>;
  recommended: string;
  comparison_notes: string[];
}

export interface SFCOptimizeResult {
  objective: string;
  original: { vc: number; fz: number; ap: number; ae: number };
  optimized: { vc: number; fz: number; ap: number; ae: number };
  improvement_pct: number;
  constraints_met: boolean;
  iterations: number;
}

// ─── Material Hardness Lookup ───────────────────────────────────────────────

export const MATERIAL_HARDNESS: Record<string, { hardness: number; group: string; kc1_1: number; mc: number; C: number; n: number }> = {
  "1045": { hardness: 200, group: "steel_medium_carbon", kc1_1: 1800, mc: 0.25, C: 250, n: 0.25 },
  "4140": { hardness: 280, group: "steel_alloy", kc1_1: 2000, mc: 0.25, C: 220, n: 0.22 },
  "4340": { hardness: 300, group: "steel_alloy", kc1_1: 2100, mc: 0.25, C: 200, n: 0.20 },
  "316": { hardness: 180, group: "stainless_austenitic", kc1_1: 2100, mc: 0.21, C: 180, n: 0.20 },
  "316L": { hardness: 170, group: "stainless_austenitic", kc1_1: 2050, mc: 0.21, C: 180, n: 0.20 },
  "304": { hardness: 170, group: "stainless_austenitic", kc1_1: 2000, mc: 0.21, C: 190, n: 0.20 },
  "6061": { hardness: 95, group: "aluminum_wrought", kc1_1: 700, mc: 0.30, C: 800, n: 0.30 },
  "6061-T6": { hardness: 95, group: "aluminum_wrought", kc1_1: 700, mc: 0.30, C: 800, n: 0.30 },
  "7075": { hardness: 150, group: "aluminum_wrought", kc1_1: 750, mc: 0.28, C: 700, n: 0.28 },
  "7075-T6": { hardness: 150, group: "aluminum_wrought", kc1_1: 750, mc: 0.28, C: 700, n: 0.28 },
  "A356": { hardness: 80, group: "aluminum_cast", kc1_1: 600, mc: 0.28, C: 900, n: 0.32 },
  "Ti-6Al-4V": { hardness: 334, group: "titanium", kc1_1: 1650, mc: 0.23, C: 80, n: 0.18 },
  "Inconel 718": { hardness: 380, group: "superalloy", kc1_1: 2800, mc: 0.22, C: 50, n: 0.15 },
  "GG25": { hardness: 190, group: "cast_iron_gray", kc1_1: 1100, mc: 0.28, C: 300, n: 0.25 },
  "GGG50": { hardness: 220, group: "cast_iron_ductile", kc1_1: 1300, mc: 0.26, C: 280, n: 0.24 },
  "C360": { hardness: 80, group: "copper_brass", kc1_1: 550, mc: 0.32, C: 600, n: 0.30 },
  "PEEK": { hardness: 100, group: "plastic_engineering", kc1_1: 250, mc: 0.35, C: 1000, n: 0.35 },
};

// ─── Shared Utility Functions ───────────────────────────────────────────────

export function resolveMaterial(material?: string, hardness?: number, group?: string) {
  const key = material?.replace(/\s+/g, "") ?? "";
  const lookup = MATERIAL_HARDNESS[key] ?? MATERIAL_HARDNESS[material ?? ""] ?? null;

  if (lookup) {
    return {
      hardness: hardness ?? lookup.hardness,
      group: group ?? lookup.group,
      kc1_1: lookup.kc1_1,
      mc: lookup.mc,
      C: lookup.C,
      n: lookup.n,
      name: material ?? key,
      resolved: true,
    };
  }

  // Fallback: use provided hardness or default medium carbon steel
  return {
    hardness: hardness ?? 200,
    group: group ?? "steel_medium_carbon",
    kc1_1: 1800,
    mc: 0.25,
    C: 250,
    n: 0.25,
    name: material ?? "unknown",
    resolved: false,
  };
}

export function calculateSafetyScore(
  vc: number,
  fz: number,
  ap: number,
  ae: number,
  toolDiam: number,
  power: number,
  machinePower?: number,
  force?: number,
): { score: number; status: "safe" | "warning" | "danger"; warnings: string[] } {
  const warnings: string[] = [];
  let score = 1.0;

  // Speed range check
  if (vc < SAFETY_LIMITS.MIN_CUTTING_SPEED) {
    score -= 0.3;
    warnings.push(`Cutting speed ${vc.toFixed(0)} m/min below minimum`);
  }
  if (vc > SAFETY_LIMITS.MAX_CUTTING_SPEED) {
    score -= 0.4;
    warnings.push(`Cutting speed ${vc.toFixed(0)} m/min exceeds maximum safe limit`);
  }

  // Feed range check
  if (fz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) {
    score -= 0.3;
    warnings.push(`Feed per tooth ${fz.toFixed(3)} mm exceeds safe limit`);
  }

  // Depth of cut check
  if (ap > toolDiam * 2) {
    score -= 0.2;
    warnings.push(`Depth of cut ${ap.toFixed(1)} mm > 2× tool diameter — high deflection risk`);
  }
  if (ap > SAFETY_LIMITS.MAX_DEPTH_OF_CUT) {
    score -= 0.3;
    warnings.push(`Depth of cut exceeds maximum limit`);
  }

  // Width (radial) check
  if (ae > toolDiam) {
    score -= 0.15;
    warnings.push(`Width of cut ${ae.toFixed(1)} mm > tool diameter — full slot`);
  }

  // Power check
  if (machinePower && power > machinePower * 0.95) {
    score -= 0.3;
    warnings.push(`Required power ${power.toFixed(1)} kW at ${((power / machinePower) * 100).toFixed(0)}% of machine capacity`);
  } else if (machinePower && power > machinePower * 0.80) {
    score -= 0.1;
    warnings.push(`Power usage at ${((power / machinePower) * 100).toFixed(0)}% of machine capacity — consider reducing`);
  }

  // Force check
  if (force && force > 10000) {
    score -= 0.1;
    warnings.push(`High cutting force: ${force.toFixed(0)} N`);
  }

  score = Math.max(0, Math.min(1, score));
  const status = score >= 0.7 ? "safe" : score >= 0.4 ? "warning" : "danger";
  return { score: Math.round(score * 100) / 100, status, warnings };
}

export function mapOperation(op: string): "roughing" | "finishing" | "semi-finishing" {
  if (op.includes("finish")) return "finishing";
  if (op.includes("semi")) return "semi-finishing";
  return "roughing"; // milling, drilling, turning, etc. default to roughing
}
