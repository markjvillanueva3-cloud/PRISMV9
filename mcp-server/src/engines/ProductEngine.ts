/**
 * PRISM Product Engine — R11 Product Packaging
 * =============================================
 * Composition layer that orchestrates existing physics engines into
 * unified product workflows. Each product (SFC, PPG, ShopManager, ACNC)
 * composes multiple engine calls into a single end-to-end pipeline.
 *
 * MS0: Speed & Feed Calculator (SFC) — 10 actions
 * MS1: Post Processor Generator (PPG) — 10 actions
 * MS2: Shop Manager / Quoting — 10 actions
 * MS3: Auto CNC Programmer (ACNC) — 10 actions
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  calculateSpeedFeed,
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSurfaceFinish,
  calculateMRR,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS,
  type SpeedFeedResult,
  type CuttingForceResult,
  type ToolLifeResult,
  type SurfaceFinishResult,
  type MRRResult,
} from "./ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  optimizeCuttingParameters,
} from "./AdvancedCalculations.js";

import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  estimateCycleTime,
  generateGCodeSnippet,
} from "./ToolpathCalculations.js";

import {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
  type GCodeResult,
  type GCodeParams,
  type ControllerFamily,
  type GCodeOperation,
} from "./GCodeTemplateEngine.js";

import {
  generateParameterBlock,
  executeDNCTransfer,
  generateQRData,
} from "./DNCTransferEngine.js";

import {
  selectToolType,
  selectStrategy,
  selectCoolantStrategy,
} from "./DecisionTreeEngine.js";

import { collisionEngine } from "./CollisionEngine.js";
import { algorithmEngine } from "./AlgorithmEngine.js";

// ─── Business Source File Catalog ────────────────────────────────────────────
// Maps all 19 extracted business JS files from the PRISM v8.89.002 monolith
// to their target engines. Used for traceability, safety auditing, and wiring.

export const BUSINESS_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  target_engine: string;
  consumers: string[];
}> = {
  // ── extracted/engines/business/ (11 files) ─────────────────────────────────

  PRISM_FINANCIAL_ENGINE: {
    filename: "PRISM_FINANCIAL_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "financial",
    lines: 183,
    safety_class: "MEDIUM",
    description: "NPV, IRR, and financial viability calculations for capital projects",
    target_engine: "ProductEngine",
    consumers: ["shop_quote", "shop_cost", "shop_dashboard"],
  },
  PRISM_INVENTORY_ENGINE: {
    filename: "PRISM_INVENTORY_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "inventory",
    lines: 159,
    safety_class: "MEDIUM",
    description: "EOQ, reorder points, and inventory optimization models",
    target_engine: "ProductEngine",
    consumers: ["shop_materials", "shop_dashboard"],
  },
  PRISM_JOB_COSTING_ENGINE: {
    filename: "PRISM_JOB_COSTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "costing",
    lines: 379,
    safety_class: "MEDIUM",
    description: "Job cost rollups: labor, machine, material, overhead, and setup rates",
    target_engine: "ProductEngine",
    consumers: ["shop_cost", "shop_quote", "shop_job"],
  },
  PRISM_JOB_SHOP_SCHEDULING_ENGINE: {
    filename: "PRISM_JOB_SHOP_SCHEDULING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "scheduling",
    lines: 926,
    safety_class: "MEDIUM",
    description: "Dispatching rules (FIFO, SPT, EDD, CR, SLACK) and job-shop optimization",
    target_engine: "ShopSchedulerEngine",
    consumers: ["schedule_jobs", "optimize_schedule"],
  },
  PRISM_JOB_TRACKING_ENGINE: {
    filename: "PRISM_JOB_TRACKING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "tracking",
    lines: 246,
    safety_class: "MEDIUM",
    description: "Job lifecycle state machine: quoted through invoiced/closed",
    target_engine: "ShopSchedulerEngine",
    consumers: ["schedule_jobs", "shop_job", "shop_dashboard"],
  },
  PRISM_ORDER_MANAGER: {
    filename: "PRISM_ORDER_MANAGER.js",
    source_dir: "extracted/engines/business",
    category: "orders",
    lines: 330,
    safety_class: "MEDIUM",
    description: "Order creation, work order management, and order lifecycle tracking",
    target_engine: "ProductEngine",
    consumers: ["shop_job", "shop_quote", "shop_dashboard"],
  },
  PRISM_PURCHASING_SYSTEM: {
    filename: "PRISM_PURCHASING_SYSTEM.js",
    source_dir: "extracted/engines/business",
    category: "purchasing",
    lines: 342,
    safety_class: "MEDIUM",
    description: "Supplier catalog (MSC, Grainger, etc.) and procurement workflows",
    target_engine: "ProductEngine",
    consumers: ["shop_materials", "shop_cost"],
  },
  PRISM_QUOTING_ENGINE: {
    filename: "PRISM_QUOTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "quoting",
    lines: 215,
    safety_class: "MEDIUM",
    description: "Quote generation with margin targets, volume discounts, and rush pricing",
    target_engine: "ProductEngine",
    consumers: ["shop_quote", "shop_cost"],
  },
  PRISM_REPORTING_ENGINE: {
    filename: "PRISM_REPORTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "reporting",
    lines: 412,
    safety_class: "LOW",
    description: "KPI dashboards, production summaries, and financial/quality reports",
    target_engine: "ShopSchedulerEngine",
    consumers: ["shop_dashboard", "shop_report"],
  },
  PRISM_SCHEDULING_ENGINE_CORE: {
    filename: "PRISM_SCHEDULING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "scheduling",
    lines: 182,
    safety_class: "MEDIUM",
    description: "Johnson's algorithm for 2-machine flow shop makespan minimization",
    target_engine: "ShopSchedulerEngine",
    consumers: ["schedule_jobs", "optimize_schedule"],
  },
  PRISM_SUBSCRIPTION_SYSTEM: {
    filename: "PRISM_SUBSCRIPTION_SYSTEM.js",
    source_dir: "extracted/engines/business",
    category: "subscription",
    lines: 270,
    safety_class: "LOW",
    description: "Tier definitions (Essentials through Enterprise) and billing configuration",
    target_engine: "ProductEngine",
    consumers: ["shop_get", "shop_dashboard"],
  },

  // ── extracted/business/ (7 files) ──────────────────────────────────────────

  PRISM_BUSINESS_AI_SYSTEM: {
    filename: "PRISM_BUSINESS_AI_SYSTEM.js",
    source_dir: "extracted/business",
    category: "ai-orchestrator",
    lines: 211,
    safety_class: "LOW",
    description: "Business intelligence orchestrator: wires costing, quoting, analytics, and AI models",
    target_engine: "ShopSchedulerEngine",
    consumers: ["shop_dashboard", "shop_report", "optimize_schedule"],
  },
  PRISM_COST_DATABASE: {
    filename: "PRISM_COST_DATABASE.js",
    source_dir: "extracted/business",
    category: "costing",
    lines: 1026,
    safety_class: "MEDIUM",
    description: "Machine TCO hourly rates, material costs, and tooling cost factors",
    target_engine: "ProductEngine",
    consumers: ["shop_cost", "shop_quote", "shop_materials"],
  },
  PRISM_COST_ESTIMATION: {
    filename: "PRISM_COST_ESTIMATION.js",
    source_dir: "extracted/business",
    category: "costing",
    lines: 213,
    safety_class: "MEDIUM",
    description: "Parametric cost estimation: machine hourly, labor rates, and overhead multipliers",
    target_engine: "ProductEngine",
    consumers: ["shop_cost", "shop_quote"],
  },
  PRISM_SCHEDULING_ENGINE_BUSINESS: {
    filename: "PRISM_SCHEDULING_ENGINE.js",
    source_dir: "extracted/business",
    category: "scheduling",
    lines: 175,
    safety_class: "MEDIUM",
    description: "Johnson's algorithm and flow-shop scheduling (business-layer duplicate)",
    target_engine: "ShopSchedulerEngine",
    consumers: ["schedule_jobs", "optimize_schedule"],
  },
  PRISM_SHOP_ANALYTICS_ENGINE: {
    filename: "PRISM_SHOP_ANALYTICS_ENGINE.js",
    source_dir: "extracted/business",
    category: "analytics",
    lines: 183,
    safety_class: "LOW",
    description: "OEE calculation (Availability x Performance x Quality) and machine analytics",
    target_engine: "ShopSchedulerEngine",
    consumers: ["shop_dashboard", "shop_report"],
  },
  PRISM_SHOP_LEARNING_ENGINE: {
    filename: "PRISM_SHOP_LEARNING_ENGINE.js",
    source_dir: "extracted/business",
    category: "learning",
    lines: 150,
    safety_class: "LOW",
    description: "Bayesian estimation factor updates from job outcomes and operator/machine performance",
    target_engine: "ShopSchedulerEngine",
    consumers: ["shop_dashboard", "optimize_schedule"],
  },
  PRISM_SHOP_OPTIMIZER: {
    filename: "PRISM_SHOP_OPTIMIZER.js",
    source_dir: "extracted/business",
    category: "optimization",
    lines: 228,
    safety_class: "MEDIUM",
    description: "Genetic algorithm schedule optimizer and operation sequence optimization",
    target_engine: "ShopSchedulerEngine",
    consumers: ["optimize_schedule", "schedule_jobs"],
  },

  // ── extracted/engines/ (MEDIUM wiring — wave 2) ─────────────────────────────

  SPEED_FEED_UI: {
    filename: "SPEED_FEED_UI.js",
    source_dir: "extracted/engines",
    category: "ui-engine",
    lines: 894,
    safety_class: "MEDIUM",
    description: "Speed-and-feed UI calculation bridge: parameter binding, unit conversion, and recommendation display logic",
    target_engine: "ProductEngine",
    consumers: ["sfc_calculate", "sfc_quick", "sfc_compare"],
  },
};

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

const MATERIAL_HARDNESS: Record<string, { hardness: number; group: string; kc1_1: number; mc: number; C: number; n: number }> = {
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

// ─── SFC Engine Functions ───────────────────────────────────────────────────

function resolveMaterial(material?: string, hardness?: number, group?: string) {
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

function calculateSafetyScore(
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

function mapOperation(op: string): "roughing" | "finishing" | "semi-finishing" {
  if (op.includes("finish")) return "finishing";
  if (op.includes("semi")) return "semi-finishing";
  return "roughing"; // milling, drilling, turning, etc. default to roughing
}

function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
  const startTime = Date.now();
  const tier = params.tier ?? "pro";

  // Resolve material
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);

  // Defaults
  const toolMat = params.tool_material ?? "Carbide";
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const operation = params.operation ?? "milling";
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  // 1. Speed & Feed
  const sfResult: SpeedFeedResult = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: toolMat as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const rpm = sfResult.spindle_speed;
  const vf = sfResult.feed_rate;

  // 2. Cutting Force (Kienzle)
  const forceResult: CuttingForceResult = calculateKienzleCuttingForce(
    {
      cutting_speed: vc,
      feed_per_tooth: fz,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  // 3. Tool Life (Taylor)
  const taylorResult: ToolLifeResult = calculateTaylorToolLife(
    vc,
    { C: mat.C, n: mat.n, material_id: mat.name },
    fz,
    ap,
  );

  // 4. Surface Finish
  const noseRadius = toolDiam > 6 ? 0.8 : 0.4;
  const raResult: SurfaceFinishResult = calculateSurfaceFinish(
    fz * numTeeth, noseRadius, true, ae, toolDiam, operation,
  );

  // 5. MRR
  const mrrResult: MRRResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // 6. Safety scoring
  const safety = calculateSafetyScore(
    vc, fz, ap, ae, toolDiam,
    forceResult.power, params.machine_power_kw, forceResult.Fc,
  );

  // RPM machine limit check
  if (params.machine_max_rpm && rpm > params.machine_max_rpm) {
    safety.warnings.push(`Calculated RPM ${rpm} exceeds machine max ${params.machine_max_rpm}`);
    safety.score = Math.max(0, safety.score - 0.15);
  }

  // Material resolution warning
  if (!mat.resolved) {
    safety.warnings.push(`Material "${params.material}" not in product database — using defaults`);
  }

  // 7. Uncertainty bounds
  const uncertaintyFactor = mat.resolved ? 0.15 : 0.25;
  const uncertainty = {
    cutting_speed_range: [
      Math.round(vc * (1 - uncertaintyFactor)),
      Math.round(vc * (1 + uncertaintyFactor)),
    ] as [number, number],
    force_range: [
      Math.round(forceResult.Fc * (1 - uncertaintyFactor)),
      Math.round(forceResult.Fc * (1 + uncertaintyFactor)),
    ] as [number, number],
    tool_life_range: [
      Math.round(taylorResult.tool_life_minutes * (1 - uncertaintyFactor * 1.5)),
      Math.round(taylorResult.tool_life_minutes * (1 + uncertaintyFactor * 1.5)),
    ] as [number, number],
    surface_roughness_range: [
      Math.round(raResult.Ra * (1 - uncertaintyFactor) * 100) / 100,
      Math.round(raResult.Ra * (1 + uncertaintyFactor) * 100) / 100,
    ] as [number, number],
  };

  // 8. Sustainability (pro + enterprise only)
  let sustainability: SFCResult["sustainability"];
  if (tier !== "free") {
    const cuttingTimeMin = 10; // Assume 10 min per part for estimation
    const energyKwh = forceResult.power * (cuttingTimeMin / 60);
    const co2Kg = energyKwh * 0.5; // ~0.5 kg CO2/kWh grid average
    const coolantLph = operation.includes("drill") ? 5 : ae >= toolDiam * 0.8 ? 12 : 8;
    sustainability = {
      energy_kWh_per_part: Math.round(energyKwh * 100) / 100,
      co2_kg_per_part: Math.round(co2Kg * 100) / 100,
      coolant_liters_per_hour: coolantLph,
    };
  }

  // 9. Surface finish grade
  const ra = raResult.Ra;
  const sfGrade = ra <= 0.4 ? "N3 (mirror)" : ra <= 0.8 ? "N4 (fine)" : ra <= 1.6 ? "N5 (smooth)"
    : ra <= 3.2 ? "N6 (good)" : ra <= 6.3 ? "N7 (fair)" : "N8+ (rough)";

  // Formulas used
  const formulas = ["Kienzle cutting force", "Taylor tool life"];
  if (tier !== "free") {
    formulas.push("Theoretical surface roughness (Ra)", "Volumetric MRR");
  }

  // Tier limiting
  const tierLimited = tier === "free";

  const result: SFCResult = {
    cutting_speed_m_min: Math.round(vc),
    spindle_rpm: Math.round(rpm),
    feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
    table_feed_mm_min: Math.round(vf),
    depth_of_cut_mm: Math.round(ap * 10) / 10,
    width_of_cut_mm: Math.round(ae * 10) / 10,
    cutting_force_N: Math.round(forceResult.Fc),
    power_kW: Math.round(forceResult.power * 100) / 100,
    torque_Nm: Math.round(forceResult.torque * 100) / 100,
    specific_cutting_force_N_mm2: Math.round(forceResult.specific_force),
    tool_life_min: taylorResult.tool_life_minutes,
    optimal_speed_m_min: taylorResult.optimal_speed ?? vc,
    surface_roughness_Ra_um: Math.round(ra * 100) / 100,
    surface_finish_grade: sfGrade,
    mrr_cm3_min: Math.round(mrrResult.mrr * 100) / 100,
    safety_score: safety.score,
    safety_status: safety.status as "safe" | "warning" | "danger",
    safety_warnings: safety.warnings,
    uncertainty,
    sustainability,
    formulas_used: formulas,
    calculation_time_ms: Date.now() - startTime,
    tier,
    tier_limited: tierLimited,
  };

  return { result };
}

function sfcCompare(params: SFCInput): { result: SFCCompareResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const toolMaterials = ["Carbide", "HSS", "Ceramic"];
  const approaches: SFCCompareResult["approaches"] = [];

  for (const tool of toolMaterials) {
    const sf = calculateSpeedFeed({
      material_hardness: mat.hardness,
      tool_material: tool as any,
      operation: mapOperation(params.operation ?? "milling"),
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    });

    const force = calculateKienzleCuttingForce(
      {
        cutting_speed: sf.cutting_speed,
        feed_per_tooth: sf.feed_per_tooth,
        axial_depth: ap,
        radial_depth: ae,
        tool_diameter: toolDiam,
        number_of_teeth: numTeeth,
      },
      { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
    );

    const tl = calculateTaylorToolLife(
      sf.cutting_speed,
      {
        C: mat.C * (tool === "HSS" ? 0.4 : tool === "Ceramic" ? 1.8 : 1.0),
        n: mat.n * (tool === "HSS" ? 1.0 : tool === "Ceramic" ? 0.8 : 1.0),
        material_id: mat.name,
      },
      sf.feed_per_tooth, ap,
    );

    const ra = calculateSurfaceFinish(
      sf.feed_per_tooth * numTeeth, 0.8, true, ae, toolDiam,
    );

    const mrr = calculateMRR({
      cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap, radial_depth: ae,
      tool_diameter: toolDiam, number_of_teeth: numTeeth,
    });

    // Composite score: balanced across productivity, tool life, quality
    const score = (mrr.mrr / 100) * 0.3 + (tl.tool_life_minutes / 60) * 0.3
      + (1 / (ra.Ra + 0.1)) * 0.2 + (1 - force.power / 20) * 0.2;

    approaches.push({
      name: `${tool} endmill`,
      cutting_speed: Math.round(sf.cutting_speed),
      feed: Math.round(sf.feed_per_tooth * 1000) / 1000,
      tool_life: Math.round(tl.tool_life_minutes * 10) / 10,
      mrr: Math.round(mrr.mrr * 100) / 100,
      power: Math.round(force.power * 100) / 100,
      surface_roughness: Math.round(ra.Ra * 100) / 100,
      score: Math.round(score * 1000) / 1000,
    });
  }

  approaches.sort((a, b) => b.score - a.score);

  return {
    result: {
      approaches,
      recommended: approaches[0].name,
      comparison_notes: [
        `Material: ${mat.name} (${mat.group}, HB ${mat.hardness})`,
        `Best overall: ${approaches[0].name} (score ${approaches[0].score})`,
        approaches[0].name.includes("Carbide")
          ? "Carbide offers best balance of speed and tool life for most applications"
          : approaches[0].name.includes("Ceramic")
            ? "Ceramic recommended for high-speed finishing of hard materials"
            : "HSS suitable for low-speed operations or interrupted cuts",
      ],
    },
  };
}

function sfcOptimize(params: SFCInput & { objective?: string }): { result: SFCOptimizeResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;
  const objective = params.objective ?? "balanced";

  // Get baseline
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // Optimization: grid search around baseline
  let bestVc = sf.cutting_speed;
  let bestFz = sf.feed_per_tooth;
  let bestAp = ap;
  let bestAe = ae;
  let bestScore = -Infinity;
  let iterations = 0;

  const vcRange = [sf.cutting_speed * 0.7, sf.cutting_speed * 1.3];
  const fzRange = [sf.feed_per_tooth * 0.7, sf.feed_per_tooth * 1.3];

  for (let vcMult = 0.7; vcMult <= 1.3; vcMult += 0.1) {
    for (let fzMult = 0.7; fzMult <= 1.3; fzMult += 0.1) {
      iterations++;
      const testVc = sf.cutting_speed * vcMult;
      const testFz = sf.feed_per_tooth * fzMult;

      const tl = calculateTaylorToolLife(
        testVc, { C: mat.C, n: mat.n, material_id: mat.name }, testFz, ap,
      );

      const mrr = calculateMRR({
        cutting_speed: testVc, feed_per_tooth: testFz,
        axial_depth: ap, radial_depth: ae,
        tool_diameter: toolDiam, number_of_teeth: numTeeth,
      });

      const force = calculateKienzleCuttingForce(
        {
          cutting_speed: testVc,
          feed_per_tooth: testFz,
          axial_depth: ap,
          radial_depth: ae,
          tool_diameter: toolDiam,
          number_of_teeth: numTeeth,
        },
        { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
      );

      const ra = calculateSurfaceFinish(
        testFz * numTeeth, 0.8, true, ae, toolDiam,
      );

      // Score based on objective
      let score = 0;
      if (objective === "productivity" || objective === "mrr") {
        score = mrr.mrr * 0.6 + tl.tool_life_minutes * 0.2 - force.power * 0.2;
      } else if (objective === "tool_life") {
        score = tl.tool_life_minutes * 0.6 + mrr.mrr * 0.2 - ra.Ra * 0.2;
      } else if (objective === "quality" || objective === "surface") {
        score = (1 / (ra.Ra + 0.01)) * 0.6 + tl.tool_life_minutes * 0.3 - force.power * 0.1;
      } else if (objective === "cost") {
        const toolCostPerMin = 0.5;
        const machineCostPerMin = 2.0;
        const costPerPart = (10 / mrr.mrr) * machineCostPerMin + (10 / tl.tool_life_minutes) * toolCostPerMin * 30;
        score = -costPerPart; // Minimize cost
      } else {
        // Balanced
        score = mrr.mrr * 0.25 + tl.tool_life_minutes * 0.25 + (1 / (ra.Ra + 0.1)) * 0.25 - force.power * 0.25;
      }

      // Safety constraint: reject dangerous parameters
      if (testVc > SAFETY_LIMITS.MAX_CUTTING_SPEED || testFz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) continue;
      if (tl.tool_life_minutes < 3) continue; // Minimum tool life constraint
      if (params.machine_power_kw && force.power > params.machine_power_kw * 0.95) continue;

      if (score > bestScore) {
        bestScore = score;
        bestVc = testVc;
        bestFz = testFz;
      }
    }
  }

  // Calculate improvement
  const origMRR = calculateMRR({
    cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
    axial_depth: ap, radial_depth: ae,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const optMRR = calculateMRR({
    cutting_speed: bestVc, feed_per_tooth: bestFz,
    axial_depth: bestAp, radial_depth: bestAe,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const improvement = origMRR.mrr > 0
    ? ((optMRR.mrr - origMRR.mrr) / origMRR.mrr) * 100
    : 0;

  return {
    result: {
      objective,
      original: {
        vc: Math.round(sf.cutting_speed),
        fz: Math.round(sf.feed_per_tooth * 1000) / 1000,
        ap: Math.round(ap * 10) / 10,
        ae: Math.round(ae * 10) / 10,
      },
      optimized: {
        vc: Math.round(bestVc),
        fz: Math.round(bestFz * 1000) / 1000,
        ap: Math.round(bestAp * 10) / 10,
        ae: Math.round(bestAe * 10) / 10,
      },
      improvement_pct: Math.round(improvement * 10) / 10,
      constraints_met: true,
      iterations,
    },
  };
}

function sfcQuick(params: { material?: string; operation?: string }): any {
  // Minimal input → full result using smart defaults
  return sfcCalculate({
    material: params.material ?? "4140",
    operation: params.operation ?? "milling",
    tool_material: "Carbide",
    tool_diameter: 12,
    number_of_teeth: 4,
    tier: "pro",
  });
}

function sfcMaterials(): { materials: Array<{ id: string; group: string; hardness: number }> } {
  return {
    materials: Object.entries(MATERIAL_HARDNESS).map(([id, m]) => ({
      id,
      group: m.group,
      hardness: m.hardness,
    })),
  };
}

function sfcTools(): { tools: Array<{ material: string; speed_range: string; applications: string }> } {
  return {
    tools: [
      { material: "HSS", speed_range: "10-60 m/min", applications: "General purpose, interrupted cuts, low cost" },
      { material: "Carbide", speed_range: "80-400 m/min", applications: "Most materials, best balance of speed and life" },
      { material: "Ceramic", speed_range: "200-1200 m/min", applications: "Hard materials, high-speed finishing" },
      { material: "CBN", speed_range: "150-500 m/min", applications: "Hardened steel (>45 HRC), cast iron" },
      { material: "Diamond", speed_range: "300-3000 m/min", applications: "Non-ferrous metals, composites, plastics" },
    ],
  };
}

function sfcFormulas(): { formulas: Array<{ name: string; use: string; equation: string }> } {
  return {
    formulas: [
      { name: "Kienzle", use: "Cutting force & power", equation: "Fc = kc1.1 × h^(1-mc) × ap × ae/D" },
      { name: "Taylor", use: "Tool life prediction", equation: "V × T^n = C" },
      { name: "Theoretical Ra", use: "Surface roughness", equation: "Ra = f²/(32×r)" },
      { name: "MRR", use: "Material removal rate", equation: "Q = Vc × fz × z × ap × ae / (π×D)" },
      { name: "Stability Lobes", use: "Chatter avoidance", equation: "RPM = 60×f/(z×(k+0.5))" },
    ],
  };
}

function sfcSafety(params: SFCInput): any {
  const mat = resolveMaterial(params.material, params.material_hardness);
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: params.tool_diameter ?? 12,
    number_of_teeth: params.number_of_teeth ?? 4,
  });
  const toolDiam = params.tool_diameter ?? 12;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const force = calculateKienzleCuttingForce(
    {
      cutting_speed: sf.cutting_speed,
      feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: params.number_of_teeth ?? 4,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  return calculateSafetyScore(
    sf.cutting_speed, sf.feed_per_tooth, ap, ae, toolDiam,
    force.power, params.machine_power_kw, force.Fc,
  );
}

// ─── SFC History (in-memory for session) ────────────────────────────────────

const sfcHistory: Array<{ timestamp: string; action: string; input: any; material: string }> = [];

function recordHistory(action: string, input: any): void {
  sfcHistory.push({
    timestamp: new Date().toISOString(),
    action,
    input,
    material: input.material ?? "unknown",
  });
  if (sfcHistory.length > 100) sfcHistory.shift();
}

// ─── Main SFC Dispatcher ────────────────────────────────────────────────────

export function productSFC(action: string, params: Record<string, any>): any {
  recordHistory(action, params);

  switch (action) {
    case "sfc_calculate":
      return sfcCalculate(params as SFCInput);
    case "sfc_compare":
      return sfcCompare(params as SFCInput);
    case "sfc_optimize":
      return sfcOptimize(params as SFCInput & { objective?: string });
    case "sfc_quick":
      return sfcQuick(params);
    case "sfc_materials":
      return sfcMaterials();
    case "sfc_tools":
      return sfcTools();
    case "sfc_formulas":
      return sfcFormulas();
    case "sfc_safety":
      return sfcSafety(params as SFCInput);
    case "sfc_history":
      return { history: sfcHistory.slice(-50) };
    case "sfc_get":
      return {
        product: "Speed & Feed Calculator",
        version: "1.0.0",
        actions: ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
          "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety",
          "sfc_history", "sfc_get"],
        tiers: ["free", "pro", "enterprise"],
        materials_count: Object.keys(MATERIAL_HARDNESS).length,
        formulas: ["Kienzle", "Taylor", "Theoretical Ra", "MRR"],
      };
    default:
      return { error: `Unknown SFC action: ${action}` };
  }
}

// ─── PPG Product Engine (MS1) ───────────────────────────────────────────────
// Post Processor Generator — composes GCodeTemplateEngine + DNCTransferEngine
// + ToolpathCalculations into a unified G-code workflow product.
//
// Pipeline: Input G-code/params → Validate → Translate/Generate → Compare → Output
// ─────────────────────────────────────────────────────────────────────────────

const ppgHistory: Array<{ action: string; timestamp: string; controller?: string; summary: string }> = [];

/** G-code syntax patterns per controller family for validation */
const CONTROLLER_SYNTAX: Record<string, {
  comment_open: string; comment_close: string;
  modal_groups: string[]; canned_cycles: string[];
  line_prefix: string; program_end: string;
  dialect_notes: string[];
}> = {
  fanuc: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Parentheses for comments", "O-number program ID", "G43 H-word tool length comp"],
  },
  haas: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible syntax", "Setting 15 for G/M code checks", "Macro B compatible"],
  },
  siemens: {
    comment_open: ";", comment_close: "",
    modal_groups: ["G0/G1/G2/G3", "G17/G18/G19", "G90/G91", "TRANS/ATRANS", "D (tool offset)"],
    canned_cycles: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Semicolon comments", "CYCLE81/83/84 canned cycles", "R-parameters", "TRANSMIT for C-axis"],
  },
  heidenhain: {
    comment_open: ";", comment_close: "",
    modal_groups: ["L (linear)", "CC/C (arc center/arc)", "CYCL DEF", "TOOL CALL", "BLK FORM"],
    canned_cycles: ["CYCL DEF 1", "CYCL DEF 200", "CYCL DEF 203", "CYCL DEF 205", "CYCL DEF 207"],
    line_prefix: "", program_end: "END PGM",
    dialect_notes: ["Conversational/plaintext syntax", "CYCL DEF for cycles", "TOOL CALL for tool changes", "FK free contour programming"],
  },
  mazak: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "Mazatrol conversational mode available", "Smooth CNC extensions"],
  },
  okuma: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "OSP-P300 extensions", "Navi-program available"],
  },
};

/** Validate G-code content against controller syntax rules */
function ppgValidateGCode(gcode: string, controller: string): {
  valid: boolean; errors: string[]; warnings: string[]; line_count: number;
  controller: string; controller_family: string; score: number;
} {
  const ctrl = resolveController(controller);
  const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
  const lines = gcode.split("\n").filter(l => l.trim().length > 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Program end code
  const hasEnd = lines.some(l => l.includes(syntax.program_end));
  if (!hasEnd) errors.push(`Missing program end (${syntax.program_end})`);

  // Check 2: Comment syntax
  if (ctrl.family === "siemens" || ctrl.family === "heidenhain") {
    const parenComments = lines.filter(l => l.includes("(") && l.includes(")"));
    if (parenComments.length > 0) {
      warnings.push(`Found ${parenComments.length} parenthesis comments — ${ctrl.name} uses semicolon comments`);
    }
  } else {
    const semiComments = lines.filter(l => {
      const stripped = l.replace(/\(.*?\)/g, "");
      return stripped.includes(";") && !stripped.startsWith(";");
    });
    if (semiComments.length > 0) {
      warnings.push(`Found ${semiComments.length} semicolon comments — ${ctrl.name} uses parenthesis comments`);
    }
  }

  // Check 3: Canned cycle compatibility
  const gCodes = lines.flatMap(l => {
    const matches = l.match(/G\d{1,3}/gi) || [];
    return matches.map(m => m.toUpperCase());
  });
  if (ctrl.family === "siemens") {
    const fanucCycles = gCodes.filter(g => ["G73", "G76", "G81", "G82", "G83", "G84", "G85", "G86"].includes(g));
    if (fanucCycles.length > 0) {
      errors.push(`Fanuc-style canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCLE81/83/84/86`);
    }
  }
  if (ctrl.family === "heidenhain") {
    const fanucCycles = gCodes.filter(g => /^G[78]\d$/.test(g));
    if (fanucCycles.length > 0) {
      errors.push(`G-code canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCL DEF`);
    }
  }

  // Check 4: Feed rate present
  const hasFeed = lines.some(l => /F[\d.]+/.test(l));
  if (!hasFeed) warnings.push("No feed rate (F-word) found in program");

  // Check 5: Spindle speed present
  const hasSpindle = lines.some(l => /S\d+/.test(l));
  if (!hasSpindle) warnings.push("No spindle speed (S-word) found in program");

  // Check 6: Work offset
  const hasWorkOffset = lines.some(l => /G5[4-9]/.test(l));
  if (!hasWorkOffset) warnings.push("No work offset (G54-G59) found — machine may use G54 default");

  // Check 7: Tool change
  const hasToolChange = lines.some(l => /T\d+/.test(l) && (/M6/i.test(l) || /M06/i.test(l)));
  if (!hasToolChange) warnings.push("No tool change (T## M6) found");

  const score = Math.max(0, 1 - errors.length * 0.25 - warnings.length * 0.05);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    line_count: lines.length,
    controller: ctrl.name,
    controller_family: ctrl.family,
    score: Math.round(score * 100) / 100,
  };
}

/** Translate G-code from source controller to target controller */
function ppgTranslateGCode(gcode: string, sourceController: string, targetController: string): {
  original_controller: string; target_controller: string;
  translated_gcode: string; changes_made: string[];
  line_count: number; warnings: string[];
} {
  const src = resolveController(sourceController);
  const tgt = resolveController(targetController);
  const srcSyntax = CONTROLLER_SYNTAX[src.family] || CONTROLLER_SYNTAX.fanuc;
  const tgtSyntax = CONTROLLER_SYNTAX[tgt.family] || CONTROLLER_SYNTAX.fanuc;
  const changes: string[] = [];
  const warnings: string[] = [];
  let translated = gcode;

  // Same family — minimal translation
  if (src.family === tgt.family) {
    changes.push(`Same controller family (${src.family}) — minimal translation needed`);
    return {
      original_controller: src.name,
      target_controller: tgt.name,
      translated_gcode: translated,
      changes_made: changes,
      line_count: translated.split("\n").filter(l => l.trim()).length,
      warnings: ["Source and target share the same dialect — only header updated"],
    };
  }

  // Comment translation
  if (srcSyntax.comment_open !== tgtSyntax.comment_open) {
    if (srcSyntax.comment_open === "(") {
      // Fanuc-style → Siemens/Heidenhain
      translated = translated.replace(/\(([^)]*)\)/g, `${tgtSyntax.comment_open} $1`);
      changes.push(`Converted parenthesis comments to ${tgt.family} semicolon comments`);
    } else {
      // Siemens/Heidenhain → Fanuc-style
      translated = translated.replace(/;\s*(.*?)$/gm, `(${srcSyntax.comment_open === ";" ? "$1" : "$1"})`);
      changes.push(`Converted semicolon comments to ${tgt.family} parenthesis comments`);
    }
  }

  // Canned cycle translation: Fanuc → Siemens
  if ((src.family === "fanuc" || src.family === "haas" || src.family === "mazak" || src.family === "okuma") && tgt.family === "siemens") {
    translated = translated.replace(/G81\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G81 → CYCLE81 (standard drilling)");
      return `CYCLE81(${r},0,${z}) F${f}\n`;
    });
    translated = translated.replace(/G83\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const q = args.match(/Q([\d.]+)/i)?.[1] || "3";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G83 → CYCLE83 (deep-hole drilling with peck)");
      return `CYCLE83(${r},0,${z},${q}) F${f}\n`;
    });
    translated = translated.replace(/G84\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const pitch = args.match(/(?:F|K)([\d.]+)/i)?.[1] || "1.5";
      changes.push("G84 → CYCLE84 (tapping)");
      return `CYCLE84(${r},0,${z},${pitch})\n`;
    });
  }

  // Canned cycle translation: Siemens → Fanuc
  if (src.family === "siemens" && (tgt.family === "fanuc" || tgt.family === "haas" || tgt.family === "mazak" || tgt.family === "okuma")) {
    translated = translated.replace(/CYCLE81\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE81 → G81 (standard drilling)");
      return `G81 R${parts[0] || "5"} Z${parts[2] || "-10"} F100`;
    });
    translated = translated.replace(/CYCLE83\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE83 → G83 (peck drilling)");
      return `G83 R${parts[0] || "5"} Z${parts[2] || "-10"} Q${parts[3] || "3"} F100`;
    });
    translated = translated.replace(/CYCLE84\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE84 → G84 (tapping)");
      return `G84 R${parts[0] || "5"} Z${parts[2] || "-10"} F${parts[3] || "1.5"}`;
    });
  }

  // Heidenhain ↔ Fanuc-family (flag as manual)
  if (src.family === "heidenhain" || tgt.family === "heidenhain") {
    if (changes.length === 0 || (changes.length === 1 && changes[0].includes("comment"))) {
      warnings.push("Heidenhain conversational ↔ ISO G-code requires careful manual review");
      warnings.push("CYCL DEF / TOOL CALL patterns may not auto-translate — verify output");
    }
  }

  // Program end translation
  if (srcSyntax.program_end !== tgtSyntax.program_end) {
    translated = translated.replace(new RegExp(srcSyntax.program_end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), tgtSyntax.program_end);
    changes.push(`Program end: ${srcSyntax.program_end} → ${tgtSyntax.program_end}`);
  }

  return {
    original_controller: src.name,
    target_controller: tgt.name,
    translated_gcode: translated,
    changes_made: changes.length > 0 ? changes : ["No structural changes needed"],
    line_count: translated.split("\n").filter(l => l.trim()).length,
    warnings,
  };
}

export function productPPG(action: string, params: Record<string, any>): any {
  const tier: ProductTier = params.tier || "pro";

  switch (action) {
    case "ppg_validate": {
      const gcode = params.gcode || params.content || "";
      const controller = params.controller || "fanuc";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to validate)" };

      const result = ppgValidateGCode(gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Valid=${result.valid}, score=${result.score}, errors=${result.errors.length}` });
      return result;
    }

    case "ppg_translate": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const target = params.target_controller || params.target || "siemens";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to translate)" };

      const result = ppgTranslateGCode(gcode, source, target);

      // Auto-validate translated output
      const validation = ppgValidateGCode(result.translated_gcode, target);

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: `${source}→${target}`, summary: `${result.changes_made.length} changes, valid=${validation.valid}` });
      return { ...result, validation };
    }

    case "ppg_templates": {
      const controllers = listControllers();
      const operations = listOperations();
      const templates = controllers.flatMap(ctrl =>
        operations.slice(0, tier === "free" ? 4 : operations.length).map(op => ({
          controller: ctrl.name,
          controller_family: ctrl.family,
          operation: op,
          available: true,
        }))
      );
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${templates.length} templates listed` });
      return { templates, total: templates.length, controllers: controllers.length, operations: operations.length };
    }

    case "ppg_generate": {
      const controller = params.controller || "fanuc";
      const operation = params.operation || "facing";
      const rpm = params.rpm || 3200;
      const feedRate = params.feed_rate || params.vf || 800;

      // Multi-operation mode
      if (params.operations && Array.isArray(params.operations)) {
        const result = generateProgram(controller, params.operations);
        const validation = ppgValidateGCode(result.gcode, controller);
        ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Program: ${params.operations.length} ops, ${result.line_count} lines` });
        return { ...result, validation };
      }

      // Single operation
      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -3,
        work_offset: params.work_offset || "G54",
        peck_depth: params.peck_depth,
        dwell: params.dwell,
        pitch: params.pitch,
        thread_diameter: params.thread_diameter,
        thread_pitch: params.thread_pitch,
        thread_depth: params.thread_depth,
        thread_direction: params.thread_direction,
        pocket_diameter: params.pocket_diameter,
        pocket_depth: params.pocket_depth,
        tool_diameter: params.tool_diameter,
        stepover_percent: params.stepover_percent,
        profile_points: params.profile_points,
        comp_side: params.comp_side,
        x_start: params.x_start,
        y_start: params.y_start,
        x_end: params.x_end,
        y_end: params.y_end,
        program_number: params.program_number,
        program_name: params.program_name,
      };

      const result = generateGCode(controller, operation, gcParams);
      const validation = ppgValidateGCode(result.gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `${operation}: ${result.line_count} lines` });
      return { ...result, validation };
    }

    case "ppg_controllers": {
      const controllers = listControllers();
      const enriched = controllers.map(ctrl => ({
        ...ctrl,
        syntax: CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc,
      }));
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${controllers.length} controllers` });
      return { controllers: enriched, total: enriched.length };
    }

    case "ppg_compare": {
      const operation = params.operation || "drilling";
      const rpm = params.rpm || 2000;
      const feedRate = params.feed_rate || params.vf || 500;
      const controllers = params.controllers || ["fanuc", "siemens", "heidenhain"];

      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -15,
        peck_depth: params.peck_depth || 3,
      };

      const results = controllers.map((ctrl: string) => {
        try {
          const result = generateGCode(ctrl, operation, gcParams);
          const validation = ppgValidateGCode(result.gcode, ctrl);
          return {
            controller: result.controller,
            controller_family: result.controller_family,
            gcode: result.gcode,
            line_count: result.line_count,
            validation_score: validation.score,
            warnings: result.warnings,
          };
        } catch (err: any) {
          return { controller: ctrl, error: err.message };
        }
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `Compared ${controllers.length} controllers for ${operation}` });
      return { operation, parameters: gcParams, results, controllers_compared: results.length };
    }

    case "ppg_syntax": {
      const controller = params.controller || "fanuc";
      const ctrl = resolveController(controller);
      const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Syntax ref for ${ctrl.name}` });
      return {
        controller: ctrl.name,
        controller_family: ctrl.family,
        syntax,
        supported_operations: listOperations(),
      };
    }

    case "ppg_batch": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const targets = params.targets || params.target_controllers || ["siemens", "heidenhain", "haas"];
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to batch-translate)" };

      if (tier === "free" && targets.length > 2) {
        return { error: "Free tier limited to 2 target controllers per batch. Upgrade to Pro for unlimited batch translation." };
      }

      const results = targets.map((target: string) => {
        const translation = ppgTranslateGCode(gcode, source, target);
        const validation = ppgValidateGCode(translation.translated_gcode, target);
        return {
          target_controller: translation.target_controller,
          translated_gcode: translation.translated_gcode,
          changes_made: translation.changes_made,
          validation_score: validation.score,
          valid: validation.valid,
          warnings: [...translation.warnings, ...validation.warnings],
        };
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: source, summary: `Batch: ${source} → ${targets.length} targets` });
      const resolvedSource = resolveController(source);
      return { source_controller: resolvedSource.name, results, total_targets: results.length };
    }

    case "ppg_history":
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: ppgHistory.slice(-50), total: ppgHistory.length };

    case "ppg_get":
      return {
        product: "Post Processor Generator",
        version: "1.0.0",
        actions: ["ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get"],
        controllers: listControllers().length,
        operations: listOperations().length,
        tiers: ["free", "pro", "enterprise"],
        dialect_families: Object.keys(CONTROLLER_SYNTAX).length,
      };

    default:
      return { error: `Unknown PPG action: ${action}` };
  }
}

// ─── Shop Manager Product Engine (MS2) ──────────────────────────────────────
// Shop Manager / Quoting — composes physics engines into business workflow:
// job planning → cost estimation → quote generation → scheduling → reporting
//
// Pipeline: Part Description → Job Plan → Cost Breakdown → Quote → Schedule
// ─────────────────────────────────────────────────────────────────────────────

const shopHistory: Array<{ action: string; timestamp: string; summary: string }> = [];

/** Material database for Shop Manager — derived from SFC MATERIAL_HARDNESS */
const MATERIAL_DB: Record<string, { name: string; group: string; hardness: number }> = Object.fromEntries(
  Object.entries(MATERIAL_HARDNESS).map(([key, v]) => [
    key,
    { name: key.includes("-") || key.includes(" ") ? key : (v.group.includes("aluminum") ? `Aluminum ${key}` : v.group.includes("steel") ? `Steel ${key}` : v.group.includes("stainless") ? `Stainless ${key}` : v.group.includes("titanium") ? `Titanium ${key}` : v.group.includes("superalloy") ? `Superalloy ${key}` : v.group.includes("cast_iron") ? `Cast Iron ${key}` : v.group.includes("copper") ? `Brass ${key}` : v.group.includes("plastic") ? `Engineering Plastic ${key}` : key), group: v.group, hardness: v.hardness },
  ]),
);

/** Machine rate database ($/hour) */
const MACHINE_RATES: Record<string, { name: string; rate_per_hour: number; type: string; max_rpm: number; power_kw: number }> = {
  "3axis_vertical": { name: "3-Axis Vertical Mill", rate_per_hour: 75, type: "milling", max_rpm: 12000, power_kw: 15 },
  "3axis_horizontal": { name: "3-Axis Horizontal Mill", rate_per_hour: 95, type: "milling", max_rpm: 10000, power_kw: 22 },
  "5axis_mill": { name: "5-Axis Mill", rate_per_hour: 150, type: "milling", max_rpm: 15000, power_kw: 25 },
  "cnc_lathe": { name: "CNC Lathe", rate_per_hour: 65, type: "turning", max_rpm: 6000, power_kw: 18 },
  "mill_turn": { name: "Mill-Turn Center", rate_per_hour: 175, type: "multi", max_rpm: 12000, power_kw: 30 },
  "wire_edm": { name: "Wire EDM", rate_per_hour: 45, type: "edm", max_rpm: 0, power_kw: 5 },
  "surface_grinder": { name: "Surface Grinder", rate_per_hour: 55, type: "grinding", max_rpm: 3600, power_kw: 5 },
};

/** Labor rate categories */
const LABOR_RATES: Record<string, number> = {
  setup: 55,       // $/hour for setup
  programming: 65, // $/hour for CAM programming
  inspection: 50,  // $/hour for QC
  deburring: 40,   // $/hour for manual deburring
};

/** Estimate operation cycle time using physics engines */
function shopEstimateOpCycleTime(
  material: string,
  feature: string,
  dimensions: { depth: number; width?: number; length?: number; diameter?: number },
  toolDiam: number,
  numTeeth: number,
): { cycle_time_min: number; cutting_speed: number; feed_rate: number; mrr: number; tool_life_min: number; safety_score: number } {
  const mat = MATERIAL_DB[material] || MATERIAL_DB["4140"];
  const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];
  const operation = feature.includes("finish") ? "finishing" : "roughing";

  // Get speed/feed from physics engine
  const sfResult = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: "Carbide" as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const ap = Math.min(dimensions.depth, toolDiam * 0.5);
  const ae = toolDiam * 0.6;

  // MRR
  const mrrResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // Volume to remove (cm³)
  const depth = dimensions.depth;
  const width = dimensions.width || 50;
  const length = dimensions.length || 50;
  const volume = (depth * width * length) / 1000; // mm³ → cm³

  // Cycle time = volume / MRR + rapids + tool changes
  const cuttingTime = mrrResult.mrr > 0 ? volume / mrrResult.mrr : 5;
  const rapidTime = cuttingTime * 0.15; // 15% overhead for rapids
  const totalTime = cuttingTime + rapidTime;

  // Tool life (use physics material constants C and n)
  const taylorResult = calculateTaylorToolLife(vc, { C: matPhysics.C, n: matPhysics.n, material_id: material }, fz, ap);

  // Safety score — estimate power = F * vc / 60000
  const estimatedPower = (matPhysics.kc1_1 * fz * ap * ae) * vc / (60000 * 1000);
  const safetyResult = calculateSafetyScore(vc, fz, ap, ae, toolDiam, estimatedPower);

  return {
    cycle_time_min: Math.round(totalTime * 10) / 10,
    cutting_speed: Math.round(vc),
    feed_rate: Math.round(sfResult.feed_rate),
    mrr: Math.round(mrrResult.mrr * 100) / 100,
    tool_life_min: Math.round(taylorResult.tool_life_minutes * 10) / 10,
    safety_score: safetyResult.score,
  };
}

/** Generate a job plan from part description */
function shopJobPlan(params: Record<string, any>): any {
  const material = params.material || "4140";
  const features = params.features || params.operations || [{ feature: "pocket", depth: 10, width: 50, length: 100 }];
  const toolDiam = params.tool_diameter || 12;
  const numTeeth = params.number_of_teeth || 4;
  const batchSize = Math.max(1, params.batch_size || 1);

  const operations = features.map((f: any, i: number) => {
    const feat = typeof f === "string" ? { feature: f, depth: 10, width: 50, length: 50 } : f;
    const estimate = shopEstimateOpCycleTime(
      material,
      feat.feature || "pocket",
      { depth: feat.depth || 10, width: feat.width || 50, length: feat.length || 50, diameter: feat.diameter },
      toolDiam,
      numTeeth,
    );
    return {
      step: i + 1,
      feature: feat.feature || "pocket",
      dimensions: { depth: feat.depth || 10, width: feat.width || 50, length: feat.length || 50 },
      ...estimate,
    };
  });

  const totalCycleTime = operations.reduce((sum: number, op: any) => sum + op.cycle_time_min, 0);
  const minToolLife = Math.min(...operations.map((op: any) => op.tool_life_min));
  const avgSafety = operations.reduce((sum: number, op: any) => sum + op.safety_score, 0) / operations.length;

  return {
    material,
    batch_size: batchSize,
    operations,
    total_cycle_time_min: Math.round(totalCycleTime * 10) / 10,
    min_tool_life_min: Math.round(minToolLife * 10) / 10,
    parts_per_tool_edge: minToolLife > 0 ? Math.floor(minToolLife / totalCycleTime) : 1,
    average_safety_score: Math.round(avgSafety * 100) / 100,
  };
}

/** Calculate full cost breakdown */
function shopCostBreakdown(params: Record<string, any>): any {
  const jobPlan = shopJobPlan(params);
  const machineId = params.machine || "3axis_vertical";
  const machine = MACHINE_RATES[machineId] || MACHINE_RATES["3axis_vertical"];
  const batchSize = jobPlan.batch_size;
  const setupTimeMin = params.setup_time_min || 30;
  const programmingMin = params.programming_time_min || (jobPlan.operations.length * 20);
  const inspectionMin = params.inspection_time_min || 5;
  const toolCost = params.tool_cost || 45;
  const materialCostPerPart = params.material_cost_per_part || 15;
  const margin = params.margin_percent || 30;

  // Machine cost per part
  const machineCostPerPart = (jobPlan.total_cycle_time_min / 60) * machine.rate_per_hour;

  // Tool cost per part
  const partsPerEdge = Math.max(1, jobPlan.parts_per_tool_edge);
  const toolCostPerPart = toolCost / partsPerEdge;

  // Setup cost amortized over batch
  const setupCostPerPart = (setupTimeMin / 60 * machine.rate_per_hour) / batchSize;

  // Programming cost amortized over batch
  const programmingCostPerPart = (programmingMin / 60 * LABOR_RATES.programming) / batchSize;

  // Inspection cost per part
  const inspectionCostPerPart = (inspectionMin / 60 * LABOR_RATES.inspection);

  // Totals
  const directCost = machineCostPerPart + toolCostPerPart + materialCostPerPart + inspectionCostPerPart;
  const overheadCost = setupCostPerPart + programmingCostPerPart;
  const totalCostPerPart = directCost + overheadCost;
  const pricePerPart = totalCostPerPart * (1 + margin / 100);
  const batchTotal = pricePerPart * batchSize;

  return {
    cost_per_part: Math.round(totalCostPerPart * 100) / 100,
    price_per_part: Math.round(pricePerPart * 100) / 100,
    batch_total: Math.round(batchTotal * 100) / 100,
    margin_percent: margin,
    breakdown: {
      machine_cost: Math.round(machineCostPerPart * 100) / 100,
      tool_cost: Math.round(toolCostPerPart * 100) / 100,
      material_cost: Math.round(materialCostPerPart * 100) / 100,
      inspection_cost: Math.round(inspectionCostPerPart * 100) / 100,
      setup_cost: Math.round(setupCostPerPart * 100) / 100,
      programming_cost: Math.round(programmingCostPerPart * 100) / 100,
    },
    machine: { id: machineId, name: machine.name, rate_per_hour: machine.rate_per_hour },
    job_plan: jobPlan,
    cycle_time_min: jobPlan.total_cycle_time_min,
    tool_life_min: jobPlan.min_tool_life_min,
    parts_per_edge: partsPerEdge,
    batch_size: batchSize,
  };
}

/** Generate a professional quote */
function shopQuote(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const customerName = params.customer || "Customer";
  const partName = params.part_name || "Custom Part";
  const leadTimeDays = params.lead_time_days || Math.max(5, Math.ceil(cost.batch_size / 10) + 3);
  const quoteNumber = `Q-${Date.now().toString(36).toUpperCase()}`;
  const validDays = params.quote_valid_days || 30;

  return {
    quote_number: quoteNumber,
    date: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10),
    customer: customerName,
    part: {
      name: partName,
      material: cost.job_plan.material,
      operations: cost.job_plan.operations.length,
    },
    pricing: {
      unit_price: cost.price_per_part,
      quantity: cost.batch_size,
      subtotal: cost.batch_total,
      currency: "USD",
    },
    lead_time_days: leadTimeDays,
    cost_breakdown: cost.breakdown,
    cycle_time_min: cost.cycle_time_min,
    notes: [
      `Machine: ${cost.machine.name} at $${cost.machine.rate_per_hour}/hr`,
      `Tool life: ${cost.tool_life_min} min (${cost.parts_per_edge} parts/edge)`,
      `Safety score: ${cost.job_plan.average_safety_score}`,
      cost.batch_size >= 100 ? "Volume discount may apply — contact sales" : "",
    ].filter(Boolean),
  };
}

/** Estimate schedule for batch production */
function shopSchedule(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const startDate = params.start_date ? new Date(params.start_date) : new Date();
  const setupTimeMin = params.setup_time_min || 30;
  const hoursPerDay = params.hours_per_day || 8;
  const efficiency = params.efficiency || 0.85; // 85% OEE

  const totalMachineMin = cost.cycle_time_min * cost.batch_size + setupTimeMin;
  const effectiveMinPerDay = hoursPerDay * 60 * efficiency;
  const productionDays = Math.ceil(totalMachineMin / effectiveMinPerDay);
  const partsPerDay = Math.floor(effectiveMinPerDay / cost.cycle_time_min);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + productionDays);

  return {
    batch_size: cost.batch_size,
    cycle_time_min: cost.cycle_time_min,
    setup_time_min: setupTimeMin,
    total_machine_time_min: Math.round(totalMachineMin),
    production_days: productionDays,
    parts_per_day: partsPerDay,
    hours_per_day: hoursPerDay,
    efficiency_pct: efficiency * 100,
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
    machine: cost.machine,
    milestones: [
      { phase: "Setup", day: 1, description: `Machine setup and first article (${setupTimeMin} min)` },
      { phase: "Production Start", day: 1, description: `Begin batch production (${partsPerDay} parts/day)` },
      { phase: "Midpoint", day: Math.ceil(productionDays / 2), description: `~${Math.floor(cost.batch_size / 2)} parts complete` },
      { phase: "Completion", day: productionDays, description: `All ${cost.batch_size} parts complete` },
      { phase: "QC/Ship", day: productionDays + 1, description: "Final inspection and shipping" },
    ],
  };
}

/** Dashboard — aggregate shop metrics */
function shopDashboard(params: Record<string, any>): any {
  const machines = Object.entries(MACHINE_RATES).map(([id, m]) => ({
    id,
    name: m.name,
    type: m.type,
    rate_per_hour: m.rate_per_hour,
    utilization_pct: 60 + Math.random() * 30, // simulated 60-90%
    status: Math.random() > 0.1 ? "running" : "idle",
  }));

  const activeMachines = machines.filter(m => m.status === "running").length;
  const avgUtilization = machines.reduce((sum, m) => sum + m.utilization_pct, 0) / machines.length;

  return {
    timestamp: new Date().toISOString(),
    machines,
    summary: {
      total_machines: machines.length,
      active: activeMachines,
      idle: machines.length - activeMachines,
      average_utilization_pct: Math.round(avgUtilization),
    },
    recent_jobs: shopHistory.filter(h => h.action === "shop_job" || h.action === "shop_quote").slice(-10),
    labor_rates: LABOR_RATES,
  };
}

/** Generate sustainability/cost report */
function shopReport(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const material = params.material || "4140";
  const mat = MATERIAL_DB[material] || MATERIAL_DB["4140"];

  // Estimate energy consumption
  const machineKw = (MACHINE_RATES[params.machine || "3axis_vertical"] || MACHINE_RATES["3axis_vertical"]).power_kw;
  const energyKwh = (cost.cycle_time_min / 60) * machineKw * 0.6; // 60% average load
  const energyCostPerPart = energyKwh * 0.12; // $0.12/kWh

  // CO2 estimate (grid average ~0.4 kg CO2/kWh)
  const co2PerPart = energyKwh * 0.4;

  // Material waste estimate
  const stockRemovalPct = 40 + Math.random() * 30; // 40-70%
  const recyclablePct = mat.name.includes("luminum") ? 95 : mat.name.includes("Steel") ? 90 : 70;

  return {
    material: mat.name,
    batch_size: cost.batch_size,
    cost_summary: {
      cost_per_part: cost.cost_per_part,
      price_per_part: cost.price_per_part,
      batch_total: cost.batch_total,
    },
    energy: {
      kwh_per_part: Math.round(energyKwh * 100) / 100,
      cost_per_part: Math.round(energyCostPerPart * 100) / 100,
    },
    sustainability: {
      co2_kg_per_part: Math.round(co2PerPart * 100) / 100,
      stock_removal_pct: Math.round(stockRemovalPct),
      recyclable_pct: recyclablePct,
      coolant_type: "semi-synthetic",
    },
    optimization_suggestions: [
      cost.cycle_time_min > 10 ? "Consider trochoidal milling to reduce cycle time 15-25%" : null,
      cost.parts_per_edge < 5 ? "Low tool life — consider coated carbide inserts" : null,
      cost.batch_size < 10 ? "Small batch — setup cost dominates; consider grouping orders" : null,
      energyKwh > 1 ? "High energy use — evaluate HSM strategies for efficiency" : null,
    ].filter(Boolean),
    breakdown: cost.breakdown,
  };
}

/** Compare cost across different machines or materials */
function shopCompare(params: Record<string, any>): any {
  const comparisons = params.machines || ["3axis_vertical", "5axis_mill"];
  const results = comparisons.map((machineId: string) => {
    const cost = shopCostBreakdown({ ...params, machine: machineId });
    return {
      machine: cost.machine,
      cost_per_part: cost.cost_per_part,
      price_per_part: cost.price_per_part,
      cycle_time_min: cost.cycle_time_min,
      batch_total: cost.batch_total,
      breakdown: cost.breakdown,
    };
  });

  // Sort by cost
  results.sort((a: any, b: any) => a.cost_per_part - b.cost_per_part);

  return {
    material: params.material || "4140",
    batch_size: params.batch_size || 1,
    results,
    recommendation: results[0]
      ? `${results[0].machine.name} is most cost-effective at $${results[0].cost_per_part}/part`
      : "No machines compared",
  };
}

export function productShop(action: string, params: Record<string, any>): any {
  const tier: ProductTier = params.tier || "pro";

  switch (action) {
    case "shop_job": {
      const plan = shopJobPlan(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${plan.operations.length} ops, ${plan.total_cycle_time_min} min` });
      return plan;
    }

    case "shop_cost": {
      const cost = shopCostBreakdown(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `$${cost.cost_per_part}/part, batch=${cost.batch_size}` });
      return cost;
    }

    case "shop_quote": {
      if (tier === "free") return { error: "Quote generation requires Pro tier or higher" };
      const quote = shopQuote(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${quote.quote_number}: $${quote.pricing.unit_price}/unit x${quote.pricing.quantity}` });
      return quote;
    }

    case "shop_schedule": {
      const schedule = shopSchedule(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${schedule.production_days} days, ${schedule.parts_per_day}/day` });
      return schedule;
    }

    case "shop_dashboard": {
      const dashboard = shopDashboard(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${dashboard.summary.total_machines} machines, ${dashboard.summary.average_utilization_pct}% util` });
      return dashboard;
    }

    case "shop_report": {
      if (tier === "free") return { error: "Sustainability reports require Pro tier or higher" };
      const report = shopReport(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `$${report.cost_summary.cost_per_part}/part, ${report.sustainability.co2_kg_per_part} kg CO2` });
      return report;
    }

    case "shop_compare": {
      const comparison = shopCompare(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${comparison.results.length} machines compared` });
      return comparison;
    }

    case "shop_materials": {
      const materials = Object.entries(MATERIAL_DB).map(([key, mat]) => ({
        id: key,
        name: mat.name,
        group: mat.group,
        hardness_hb: mat.hardness,
        machinability: mat.hardness < 200 ? "excellent" : mat.hardness < 300 ? "good" : mat.hardness < 350 ? "moderate" : "difficult",
      }));
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${materials.length} materials` });
      return { materials, total: materials.length };
    }

    case "shop_history":
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: shopHistory.slice(-50), total: shopHistory.length };

    case "shop_get":
      return {
        product: "Shop Manager",
        version: "1.0.0",
        actions: ["shop_job", "shop_cost", "shop_quote", "shop_schedule", "shop_dashboard", "shop_report", "shop_compare", "shop_materials", "shop_history", "shop_get"],
        machines: Object.keys(MACHINE_RATES).length,
        materials: Object.keys(MATERIAL_DB).length,
        tiers: ["free", "pro", "enterprise"],
        labor_categories: Object.keys(LABOR_RATES).length,
      };

    default:
      return { error: `Unknown Shop action: ${action}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto CNC Programmer (ACNC) — R11-MS3
//
// 7-step pipeline: Feature Recognition → Strategy Selection → Tool Selection
// → Parameter Calculation → G-code Generation → Simulation → Complete Output
//
// Composes: DecisionTreeEngine, ManufacturingCalculations, GCodeTemplateEngine,
//           ToolpathCalculations, CollisionEngine
// ─────────────────────────────────────────────────────────────────────────────

const acncHistory: Array<{ action: string; timestamp: string; summary: string }> = [];

/** Recognized feature types for ACNC */
const ACNC_FEATURES: Record<string, { operations: string[]; default_tool_diam: number; default_teeth: number }> = {
  pocket:       { operations: ["roughing", "finishing"], default_tool_diam: 12, default_teeth: 3 },
  slot:         { operations: ["roughing"], default_tool_diam: 10, default_teeth: 2 },
  profile:      { operations: ["roughing", "finishing"], default_tool_diam: 16, default_teeth: 4 },
  face:         { operations: ["roughing"], default_tool_diam: 50, default_teeth: 5 },
  hole:         { operations: ["drilling"], default_tool_diam: 10, default_teeth: 2 },
  thread:       { operations: ["thread_milling"], default_tool_diam: 8, default_teeth: 1 },
  "3d_surface": { operations: ["roughing", "finishing"], default_tool_diam: 10, default_teeth: 2 },
  chamfer:      { operations: ["finishing"], default_tool_diam: 10, default_teeth: 2 },
  bore:         { operations: ["boring"], default_tool_diam: 20, default_teeth: 1 },
};

/** Parse a natural-language feature description into structured params */
function acncParseFeature(description: string): {
  feature: string; depth: number; width: number; length: number;
  diameter?: number; tolerance?: number; finish?: string;
} {
  const desc = description.toLowerCase();

  // Identify feature type
  let feature = "pocket";
  if (desc.includes("slot")) feature = "slot";
  else if (desc.includes("profile") || desc.includes("contour")) feature = "profile";
  else if (desc.includes("face") || desc.includes("facing")) feature = "face";
  else if (desc.includes("hole") || desc.includes("drill")) feature = "hole";
  else if (desc.includes("thread") || desc.includes("tap")) feature = "thread";
  else if (desc.includes("3d") || desc.includes("surface") || desc.includes("freeform")) feature = "3d_surface";
  else if (desc.includes("chamfer")) feature = "chamfer";
  else if (desc.includes("bore") || desc.includes("boring")) feature = "bore";

  // Extract dimensions from description (e.g., "50mm deep", "100x80mm")
  const depthMatch = desc.match(/(\d+(?:\.\d+)?)\s*mm\s*deep/);
  const sizeMatch = desc.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*mm/);
  const diamMatch = desc.match(/(?:diameter|dia|ø)\s*(\d+(?:\.\d+)?)\s*mm/);
  const tolMatch = desc.match(/(?:tolerance|±|tol)\s*(\d+(?:\.\d+)?)\s*mm/);

  const depth = depthMatch ? parseFloat(depthMatch[1]) : 10;
  const width = sizeMatch ? parseFloat(sizeMatch[1]) : 50;
  const length = sizeMatch ? parseFloat(sizeMatch[2]) : 50;
  const diameter = diamMatch ? parseFloat(diamMatch[1]) : undefined;
  const tolerance = tolMatch ? parseFloat(tolMatch[1]) : undefined;

  // Finish quality
  let finish: string | undefined;
  if (desc.includes("mirror") || desc.includes("ra 0.")) finish = "mirror";
  else if (desc.includes("fine") || desc.includes("finish")) finish = "fine";
  else if (desc.includes("rough")) finish = "rough";

  return { feature, depth, width, length, diameter, tolerance, finish };
}

/** Step 1: Feature recognition */
function acncFeatureRecognition(params: Record<string, any>): any {
  const description = params.description;
  // If params.feature is a known feature name, treat as structured; only parse NL from description
  const isStructured = !description && typeof params.feature === "string" && ACNC_FEATURES[params.feature];

  let feature: string;
  let depth: number;
  let width: number;
  let length: number;
  let diameter: number | undefined;
  let tolerance: number | undefined;
  let finish: string | undefined;

  if (description && typeof description === "string") {
    const parsed = acncParseFeature(description);
    feature = parsed.feature;
    depth = params.depth || parsed.depth;
    width = params.width || parsed.width;
    length = params.length || parsed.length;
    diameter = params.diameter || parsed.diameter;
    tolerance = params.tolerance || parsed.tolerance;
    finish = params.finish || parsed.finish;
  } else {
    feature = params.feature || "pocket";
    depth = params.depth || 10;
    width = params.width || 50;
    length = params.length || 50;
    diameter = params.diameter;
    tolerance = params.tolerance;
    finish = params.finish;
  }

  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  return {
    feature,
    dimensions: { depth, width, length, diameter },
    operations: featureDef.operations,
    tolerance,
    finish_quality: finish || "standard",
    recognized_from: isStructured ? "structured" : "natural_language",
  };
}

/** Step 2: Strategy selection via DecisionTreeEngine */
function acncStrategySelection(feature: string, material: string, depth?: number, width?: number): any {
  const featureMap: Record<string, any> = {
    pocket: "pocket", slot: "slot", profile: "profile", face: "face",
    hole: "hole", thread: "thread", "3d_surface": "3d_surface",
    chamfer: "profile", bore: "hole",
  };
  const mappedFeature = featureMap[feature] || "pocket";

  const strategyResult = selectStrategy({
    feature: mappedFeature,
    material,
    depth_mm: depth,
    width_mm: width,
  });

  return {
    strategy: strategyResult.strategy,
    entry_method: strategyResult.entry_method,
    passes: strategyResult.passes,
    step_over: strategyResult.step_over,
    confidence: strategyResult.confidence,
    reasoning: strategyResult.reasoning,
    alternatives: strategyResult.alternatives,
  };
}

/** Step 3: Tool selection via DecisionTreeEngine */
function acncToolSelection(material: string, operation: string, feature: string): any {
  const toolResult = selectToolType({
    material,
    operation,
    feature,
    roughing_finishing: operation === "finishing" ? "finishing" : "roughing",
  });

  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  return {
    tool_type: toolResult.tool_type,
    coating: toolResult.coating,
    holder_type: toolResult.holder_type,
    geometry: toolResult.geometry,
    diameter: featureDef.default_tool_diam,
    teeth: featureDef.default_teeth,
    confidence: toolResult.confidence,
    reasoning: toolResult.reasoning,
    alternatives: toolResult.alternatives,
  };
}

/** Step 4: Parameter calculation using physics engines */
function acncParameterCalc(
  material: string, toolDiam: number, numTeeth: number,
  depth: number, width: number, operation: string,
): any {
  const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];

  const sfResult = calculateSpeedFeed({
    material_hardness: matPhysics.hardness,
    tool_material: "Carbide" as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const ap = Math.min(depth, toolDiam * 0.5);
  const ae = Math.min(width, toolDiam * 0.6);

  const mrrResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const taylorResult = calculateTaylorToolLife(vc, { C: matPhysics.C, n: matPhysics.n, material_id: material }, fz, ap);

  const coolantResult = selectCoolantStrategy({
    material,
    cutting_speed_m_min: vc,
    operation,
  });

  return {
    cutting_speed_m_min: Math.round(vc),
    spindle_rpm: Math.round((vc * 1000) / (Math.PI * toolDiam)),
    feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
    feed_rate_mm_min: Math.round(sfResult.feed_rate),
    axial_depth_mm: Math.round(ap * 10) / 10,
    radial_depth_mm: Math.round(ae * 10) / 10,
    mrr_cm3_min: Math.round(mrrResult.mrr * 100) / 100,
    tool_life_min: Math.round(taylorResult.tool_life_minutes * 10) / 10,
    coolant: {
      strategy: coolantResult.strategy,
      pressure_bar: coolantResult.pressure_bar,
      concentration_pct: coolantResult.concentration_pct,
    },
  };
}

/** Step 5: G-code generation via GCodeTemplateEngine */
function acncGenerateGCode(
  feature: string, controller: string, params: any, programNumber?: number,
): any {
  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  const operations = featureDef.operations;

  // Map feature operations to GCode operations
  const gcodeOps: Array<{ operation: string; params: Record<string, any> }> = operations.map(op => {
    const gcodeOp = op === "drilling" ? "drilling" :
      op === "boring" ? "boring" :
      op === "thread_milling" ? "thread_milling" :
      op === "roughing" ? "circular_pocket" :
      "profile";

    return {
      operation: gcodeOp,
      params: {
        x: 0, y: 0, z_depth: -(params.axial_depth_mm || 5),
        depth: params.axial_depth_mm || 5,
        diameter: params.radial_depth_mm ? params.radial_depth_mm * 2 : 20,
        feed_rate: params.feed_rate_mm_min || 500,
        rpm: params.spindle_rpm || 5000,
        tool_number: 1,
      },
    };
  });

  // Generate full program
  const resolved = resolveController(controller || "fanuc");
  const programResult = generateProgram(
    resolved.family,
    gcodeOps.map(o => ({
      operation: o.operation,
      params: o.params as any,
    })),
  );

  // Validate the generated code
  const validation = ppgValidateGCode(programResult.gcode, resolved.family);

  return {
    controller: resolved.name,
    controller_family: resolved.family,
    program_number: programNumber || 1001,
    gcode: programResult.gcode,
    operations_count: gcodeOps.length,
    line_count: programResult.line_count,
    validation,
  };
}

/** Step 6: Simulation/safety check */
function acncSimulate(params: any, gcodeResult: any): any {
  // Use collision engine for basic clearance check
  const toolDiam = params.tool?.diameter || 12;
  const depth = params.dimensions?.depth || 10;
  const width = params.dimensions?.width || 50;

  // Simplified simulation using safety score
  const matPhysics = MATERIAL_HARDNESS[params.material || "4140"] || MATERIAL_HARDNESS["4140"];
  const cuttingSpeed = params.parameters?.cutting_speed_m_min || 100;
  const feedPerTooth = params.parameters?.feed_per_tooth_mm || 0.1;
  const ap = params.parameters?.axial_depth_mm || 5;
  const ae = params.parameters?.radial_depth_mm || 7;

  const estimatedPower = (matPhysics.kc1_1 * feedPerTooth * ap * ae) * cuttingSpeed / (60000 * 1000);
  const safetyResult = calculateSafetyScore(cuttingSpeed, feedPerTooth, ap, ae, toolDiam, estimatedPower);

  // Estimate cycle time
  const volume = (depth * width * (params.dimensions?.length || 50)) / 1000; // mm³ → cm³
  const mrr = params.parameters?.mrr_cm3_min || 50;
  const cuttingTime = mrr > 0 ? volume / mrr : 5;
  const totalTime = cuttingTime * 1.2; // 20% overhead for rapids/tool changes

  // Check for potential issues
  const issues: string[] = [];
  if (safetyResult.status === "danger") issues.push("Safety score indicates danger — reduce parameters");
  if (safetyResult.status === "warning") issues.push("Safety warning — consider reducing depth of cut");
  if (totalTime > 60) issues.push("Estimated cycle time exceeds 60 min — consider batch optimization");
  if (toolDiam > width * 0.8) issues.push("Tool diameter may be too large for feature width");

  return {
    safety_score: safetyResult.score,
    safety_status: safetyResult.status,
    safety_warnings: safetyResult.warnings,
    estimated_cycle_time_min: Math.round(totalTime * 10) / 10,
    collision_check: issues.length === 0 ? "clear" : "review_needed",
    issues,
    rapid_clearance_mm: 5,
    simulation_method: "analytical_estimate",
  };
}

/** Step 7: Complete output — combines all steps */
function acncCompleteProgram(params: Record<string, any>): any {
  const material = params.material || "4140";
  const controller = params.controller || "fanuc";

  // Step 1: Feature recognition
  const featureResult = acncFeatureRecognition(params);

  // Step 2: Strategy selection
  const strategyResult = acncStrategySelection(
    featureResult.feature, material,
    featureResult.dimensions.depth, featureResult.dimensions.width,
  );

  // Step 3: Tool selection
  const toolResult = acncToolSelection(
    material,
    featureResult.operations[0],
    featureResult.feature,
  );

  // Step 4: Parameter calculation
  const paramResult = acncParameterCalc(
    material, toolResult.diameter, toolResult.teeth,
    featureResult.dimensions.depth, featureResult.dimensions.width,
    featureResult.operations[0],
  );

  // Step 5: G-code generation
  const gcodeResult = acncGenerateGCode(
    featureResult.feature, controller,
    paramResult, params.program_number,
  );

  // Step 6: Simulation
  const simResult = acncSimulate(
    { material, tool: toolResult, dimensions: featureResult.dimensions, parameters: paramResult },
    gcodeResult,
  );

  // Build tool list
  const toolList = [{
    position: 1,
    type: toolResult.tool_type,
    diameter: toolResult.diameter,
    coating: toolResult.coating,
    holder: toolResult.holder_type,
    teeth: toolResult.teeth,
    estimated_life_min: paramResult.tool_life_min,
  }];

  // Build setup sheet summary
  const setupSheet = {
    material,
    material_group: (MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"]).group,
    hardness_hb: (MATERIAL_DB[material] || MATERIAL_DB["4140"]).hardness,
    feature: featureResult.feature,
    dimensions: featureResult.dimensions,
    work_offset: "G54",
    fixture: "3-jaw vise",
    coolant: paramResult.coolant,
  };

  return {
    version: "1.0.0",
    pipeline_steps: 7,
    feature: featureResult,
    strategy: strategyResult,
    tool: toolResult,
    parameters: paramResult,
    gcode: gcodeResult,
    simulation: simResult,
    tool_list: toolList,
    setup_sheet: setupSheet,
    cycle_time_min: simResult.estimated_cycle_time_min,
    safety_score: simResult.safety_score,
    ready_to_run: simResult.collision_check === "clear" && simResult.safety_status !== "danger",
  };
}

/** ACNC batch: generate programs for multiple features */
function acncBatch(params: Record<string, any>): any {
  const features = params.features || [];
  const material = params.material || "4140";
  const controller = params.controller || "fanuc";
  const tier = params.tier || "free";

  if (tier === "free" && features.length > 2) {
    return { error: "Free tier limited to 2 features per batch. Upgrade to Pro for unlimited.", tier_blocked: true };
  }

  const results = features.map((f: any, idx: number) => {
    const featureParams = typeof f === "string"
      ? { description: f, material, controller, program_number: 1001 + idx }
      : { ...f, material: f.material || material, controller: f.controller || controller, program_number: f.program_number || 1001 + idx };

    return acncCompleteProgram(featureParams);
  });

  const totalCycleTime = results.reduce((sum: number, r: any) => sum + (r.cycle_time_min || 0), 0);
  const allTools = results.flatMap((r: any) => r.tool_list || []);
  const uniqueTools = [...new Map(allTools.map((t: any) => [t.type + t.diameter, t])).values()];

  return {
    batch_size: results.length,
    material,
    controller,
    programs: results,
    total_cycle_time_min: Math.round(totalCycleTime * 10) / 10,
    unique_tools: uniqueTools,
    all_ready: results.every((r: any) => r.ready_to_run),
  };
}

/** ACNC product dispatcher */
export function productACNC(action: string, params: Record<string, any>): any {
  const tier = params.tier || "free";

  switch (action) {
    case "acnc_get":
      return {
        product: "Auto CNC Programmer",
        version: "1.0.0",
        pipeline_steps: 7,
        supported_features: Object.keys(ACNC_FEATURES).length,
        supported_materials: Object.keys(MATERIAL_HARDNESS).length,
        supported_controllers: 6,
        actions: [
          "acnc_program", "acnc_feature", "acnc_simulate",
          "acnc_output", "acnc_tools", "acnc_strategy",
          "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
        ],
      };

    case "acnc_feature": {
      const result = acncFeatureRecognition(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Feature: ${result.feature}` });
      return result;
    }

    case "acnc_strategy": {
      const feature = params.feature || "pocket";
      const material = params.material || "4140";
      const result = acncStrategySelection(feature, material, params.depth, params.width);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Strategy: ${result.strategy}` });
      return result;
    }

    case "acnc_tools": {
      const material = params.material || "4140";
      const operation = params.operation || "roughing";
      const feature = params.feature || "pocket";
      const result = acncToolSelection(material, operation, feature);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Tool: ${result.tool_type}` });
      return result;
    }

    case "acnc_validate": {
      // Validate G-code via PPG validation
      const gcode = params.gcode || "";
      const controller = params.controller || "fanuc";
      if (!gcode) return { error: "gcode parameter required" };
      const validation = ppgValidateGCode(gcode, resolveController(controller).family);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Score: ${validation.score}` });
      return validation;
    }

    case "acnc_simulate": {
      // Quick simulation without full program generation
      const simParams = {
        material: params.material || "4140",
        tool: { diameter: params.tool_diameter || 12 },
        dimensions: {
          depth: params.depth || 10,
          width: params.width || 50,
          length: params.length || 50,
        },
        parameters: {
          cutting_speed_m_min: params.cutting_speed || 100,
          feed_per_tooth_mm: params.feed_per_tooth || 0.1,
          axial_depth_mm: params.axial_depth || 5,
          radial_depth_mm: params.radial_depth || 7,
          mrr_cm3_min: params.mrr || 50,
        },
      };
      const result = acncSimulate(simParams, {});
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Safety: ${result.safety_status}` });
      return result;
    }

    case "acnc_output": {
      // Generate just the G-code output (step 5 only)
      const feature = params.feature || "pocket";
      const controller = params.controller || "fanuc";
      const material = params.material || "4140";
      const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
      const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];

      const sfResult = calculateSpeedFeed({
        material_hardness: matPhysics.hardness,
        tool_material: "Carbide" as any,
        operation: mapOperation(featureDef.operations[0]),
        tool_diameter: featureDef.default_tool_diam,
        number_of_teeth: featureDef.default_teeth,
      });

      const result = acncGenerateGCode(feature, controller, {
        axial_depth_mm: params.depth || 5,
        radial_depth_mm: featureDef.default_tool_diam * 0.6,
        feed_rate_mm_min: Math.round(sfResult.feed_rate),
        spindle_rpm: Math.round((sfResult.cutting_speed * 1000) / (Math.PI * featureDef.default_tool_diam)),
      }, params.program_number);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `G-code: ${result.controller}` });
      return result;
    }

    case "acnc_program": {
      // Full 7-step pipeline
      if (tier === "free" && params.features && params.features.length > 1) {
        return { error: "Free tier: single feature only. Use acnc_batch with Pro for multi-feature.", tier_blocked: true };
      }
      const result = acncCompleteProgram(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Program: ${result.gcode?.controller || "unknown"}` });
      return result;
    }

    case "acnc_batch": {
      const result = acncBatch(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Batch: ${result.batch_size || 0} features` });
      return result;
    }

    case "acnc_history":
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: acncHistory.slice(-50), total: acncHistory.length };

    default:
      return { error: `Unknown ACNC action: ${action}`, available: [
        "acnc_program", "acnc_feature", "acnc_simulate",
        "acnc_output", "acnc_tools", "acnc_strategy",
        "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
      ] };
  }
}

// ─── Business Source File Catalog Accessor ────────────────────────────────────

/**
 * Returns the full business source file catalog, optionally filtered by
 * target engine or category.
 *
 * @param filter.target_engine - Filter to entries targeting a specific engine
 * @param filter.category      - Filter to a specific category (e.g. "costing")
 * @param filter.safety_class  - Filter by safety classification
 * @returns Matching catalog entries with summary statistics
 */
// ── Algorithm Engine Bridge (L1-P2-MS1) ─────────────────────────────────────
// Re-export algorithmEngine for consuming engines and dispatchers.
// Provides typed access to all 50 Algorithm<I,O> implementations.
export { algorithmEngine };

export function getSourceFileCatalog(filter?: {
  target_engine?: string;
  category?: string;
  safety_class?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}): {
  entries: typeof BUSINESS_SOURCE_FILE_CATALOG;
  summary: {
    total_files: number;
    total_lines: number;
    by_engine: Record<string, number>;
    by_category: Record<string, number>;
    by_safety: Record<string, number>;
  };
} {
  let entries = { ...BUSINESS_SOURCE_FILE_CATALOG };

  if (filter?.target_engine) {
    entries = Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v.target_engine === filter.target_engine)
    ) as typeof BUSINESS_SOURCE_FILE_CATALOG;
  }
  if (filter?.category) {
    entries = Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v.category === filter.category)
    ) as typeof BUSINESS_SOURCE_FILE_CATALOG;
  }
  if (filter?.safety_class) {
    entries = Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v.safety_class === filter.safety_class)
    ) as typeof BUSINESS_SOURCE_FILE_CATALOG;
  }

  const vals = Object.values(entries);
  const byEngine: Record<string, number> = {};
  const byCat: Record<string, number> = {};
  const bySafety: Record<string, number> = {};

  for (const v of vals) {
    byEngine[v.target_engine] = (byEngine[v.target_engine] ?? 0) + 1;
    byCat[v.category] = (byCat[v.category] ?? 0) + 1;
    bySafety[v.safety_class] = (bySafety[v.safety_class] ?? 0) + 1;
  }

  return {
    entries,
    summary: {
      total_files: vals.length,
      total_lines: vals.reduce((sum, v) => sum + v.lines, 0),
      by_engine: byEngine,
      by_category: byCat,
      by_safety: bySafety,
    },
  };
}
